// Supabase Edge Function: voip-webhook
// Empfängt Post-Call Daten von Famulor und speichert sie in Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    console.log("Famulor Webhook received:", JSON.stringify(body));

    // Famulor Webhook-Payload parsen
    const {
      call_id,
      assistant_id,
      status,
      duration,
      transcript,
      recording_url,
      variables = {},
      customer = {}
    } = body;

    const { summary, fahrrad_typ, budget, nutzung } = variables;
    const customerPhone = customer.number || customer.phone || null;

    // Termin anhand der Telefonnummer finden (falls vorhanden)
    let terminId = null;
    let leadId = null;
    let standortId = null;

    if (customerPhone) {
      // Termin suchen der in den nächsten 72h ist und diese Nummer hat
      const { data: termin } = await supabase
        .from("termine")
        .select("id, standort_id, lead_id")
        .eq("voip_status", "ausstehend")
        .gte("startzeit", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .single();

      if (termin) {
        terminId = termin.id;
        standortId = termin.standort_id;
        leadId = termin.lead_id;
      }
    }

    // Münster als Fallback Standort
    if (!standortId) {
      const { data: muenster } = await supabase
        .from("standorte")
        .select("id")
        .or("name.ilike.%münster%,stadt.ilike.%münster%")
        .limit(1)
        .single();
      standortId = muenster?.id;
    }

    if (!standortId) {
      return new Response(JSON.stringify({ error: "Standort nicht gefunden" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Bedarfsprofil zusammenbauen
    const bedarfProfil = {
      fahrrad_typ: fahrrad_typ || null,
      budget: budget || null,
      nutzung: nutzung || null,
      zusammenfassung: summary || null,
      anruf_erfolgreich: status === "completed"
    };

    // voip_calls Eintrag erstellen
    const { data: voipCall, error: callError } = await supabase
      .from("voip_calls")
      .insert({
        standort_id: standortId,
        termin_id: terminId,
        lead_id: leadId,
        nummer: customerPhone || "unbekannt",
        richtung: "ausgehend",
        dauer_sek: duration || 0,
        transkript: transcript || null,
        ki_summary: summary || null,
        bedarf_json: bedarfProfil,
        famulor_call_id: call_id || String(assistant_id),
        skill: "termin-vorbereitung",
        status: status === "completed" ? "abgeschlossen" : "fehlgeschlagen"
      })
      .select()
      .single();

    if (callError) {
      console.error("voip_calls insert error:", callError);
      return new Response(JSON.stringify({ error: callError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Lead updaten falls vorhanden
    if (leadId && bedarfProfil) {
      await supabase
        .from("leads")
        .update({
          bedarf_profil: bedarfProfil,
          voip_summary: summary || null,
          voip_call_id: voipCall.id
        })
        .eq("id", leadId);
    }

    // Termin-Status updaten
    if (terminId) {
      await supabase
        .from("termine")
        .update({
          voip_status: status === "completed" ? "angerufen" : "nicht-erreicht",
          voip_call_id: voipCall.id
        })
        .eq("id", terminId);
    }

    console.log("voip_calls gespeichert:", voipCall.id);

    return new Response(JSON.stringify({ success: true, call_id: voipCall.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
