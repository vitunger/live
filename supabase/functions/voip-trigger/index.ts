// Supabase Edge Function: voip-trigger
// Wird aufgerufen wenn ein neuer Termin in eTermin eingeht
// Löst automatisch einen Famulor-Anruf aus

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const FAMULOR_API_KEY = Deno.env.get("FAMULOR_API_KEY")!;
const FAMULOR_AGENT_ID = "11870";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const { termin_id, telefon, name, standort_id } = body;

    if (!telefon) {
      return new Response(JSON.stringify({ error: "Keine Telefonnummer" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Anrufzeit prüfen (Mo-Fr 10-12 und 16-18, Sa 10-12)
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0=So, 6=Sa
    
    const isWeekday = day >= 1 && day <= 5;
    const isSaturday = day === 6;
    const isGoodTime = 
      (isWeekday && ((hour >= 10 && hour < 12) || (hour >= 16 && hour < 18))) ||
      (isSaturday && hour >= 10 && hour < 12);

    if (!isGoodTime) {
      console.log("Außerhalb der Anrufzeiten — wird nicht ausgelöst");
      return new Response(JSON.stringify({ 
        skipped: true, 
        reason: "Außerhalb der Anrufzeiten" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Famulor Outbound Call auslösen
    const famulOrResponse = await fetch("https://api.famulor.de/api/v1/calls/outbound", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FAMULOR_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        assistant_id: FAMULOR_AGENT_ID,
        customer: {
          number: telefon,
          name: name || "Kunde"
        },
        variables: {
          termin_id: termin_id || "",
          standort: "Münster",
          kunde_name: name || "Kunde"
        }
      })
    });

    const famulOrData = await famulOrResponse.json();
    console.log("Famulor Response:", JSON.stringify(famulOrData));

    if (!famulOrResponse.ok) {
      throw new Error(`Famulor API Fehler: ${JSON.stringify(famulOrData)}`);
    }

    // voip_calls Eintrag als "geplant" anlegen
    if (termin_id && standort_id) {
      await supabase.from("voip_calls").insert({
        standort_id,
        termin_id,
        nummer: telefon,
        richtung: "ausgehend",
        famulor_call_id: famulOrData.call_id || famulOrData.id,
        skill: "termin-vorbereitung",
        status: "geplant"
      });

      // Termin-Status updaten
      await supabase
        .from("termine")
        .update({ voip_status: "angerufen" })
        .eq("id", termin_id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      famulor_call_id: famulOrData.call_id || famulOrData.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("voip-trigger error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
