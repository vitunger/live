/**
 * Supabase Edge Function: summarize-channel
 * Fasst die letzten Chat-Nachrichten eines Kanals via Claude zusammen.
 *
 * POST Body: { kanal_id: string }
 * Returns:   { zusammenfassung: string }
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const ALLOWED_ORIGINS = [
  "https://cockpit.vitbikes.de",
  "http://localhost:3000",
  "http://localhost:5173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function verifyJwt(req: Request): Promise<{ user_id: string } | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;
  return { user_id: user.id };
}

let _cors: Record<string, string> = {};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ..._cors, "Content-Type": "application/json" },
  });
}

// -- API USAGE LOGGING -------------------------------------------------------

async function logApiUsage(admin: any, params: {
  edge_function: string;
  modul: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  duration_ms: number;
  success: boolean;
  user_id?: string;
  error_message?: string;
}) {
  try {
    const inputCostPer1M = 3.0;
    const outputCostPer1M = 15.0;
    const estimated_cost_usd =
      (params.input_tokens / 1_000_000) * inputCostPer1M +
      (params.output_tokens / 1_000_000) * outputCostPer1M;

    await admin.from("api_usage_log").insert({
      edge_function: params.edge_function,
      modul: params.modul,
      provider: params.provider,
      model: params.model,
      input_tokens: params.input_tokens,
      output_tokens: params.output_tokens,
      estimated_cost_usd,
      duration_ms: params.duration_ms,
      success: params.success,
      user_id: params.user_id || null,
      error_message: params.error_message || null,
    });
  } catch (e) {
    console.error("api_usage_log insert failed:", e);
  }
}

// -- SYSTEM PROMPT ------------------------------------------------------------

const SYSTEM_PROMPT = `Du bist ein Assistent im vit:bikes Partner-Cockpit.
Deine Aufgabe: Fasse die Chat-Nachrichten eines Kanals kurz und praegnant zusammen.

REGELN:
1. Antworte IMMER auf Deutsch
2. Maximal 5 Stichpunkte (Bullet Points mit "-")
3. Nenne die wichtigsten Themen, Entscheidungen und offene Fragen
4. Nenne beteiligte Personen nur wenn relevant
5. Halte jeden Punkt auf maximal 1-2 Saetze
6. Gib NUR die Stichpunkte zurueck, keine Einleitung oder Abschluss`;

// -- MAIN HANDLER -------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = getCorsHeaders(req);
  _cors = cors;
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await verifyJwt(req);
  if (!auth) return json({ error: "Nicht authentifiziert" }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await req.json();
    const { kanal_id } = body;

    if (!kanal_id || typeof kanal_id !== "string") {
      return json({ error: "kanal_id ist erforderlich" }, 400);
    }

    // Kanal-Info laden
    const { data: kanal, error: kanalErr } = await admin
      .from("chat_kanaele")
      .select("id, name, typ")
      .eq("id", kanal_id)
      .single();

    if (kanalErr || !kanal) {
      return json({ error: "Kanal nicht gefunden" }, 404);
    }

    // Letzte 50 Nachrichten mit Absender-Namen laden
    const { data: nachrichten, error: msgErr } = await admin
      .from("chat_nachrichten")
      .select("inhalt, created_at, sender_id, users!sender_id(name)")
      .eq("kanal_id", kanal_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (msgErr) {
      console.error("Nachrichten laden fehlgeschlagen:", msgErr);
      return json({ error: "Nachrichten konnten nicht geladen werden" }, 500);
    }

    if (!nachrichten || nachrichten.length === 0) {
      return json({ zusammenfassung: "Keine Nachrichten in diesem Kanal vorhanden." });
    }

    // Nachrichten chronologisch sortieren und formatieren
    const sorted = [...nachrichten].reverse();
    const chatText = sorted.map((msg: any) => {
      const name = msg.users?.name || "Unbekannt";
      const date = new Date(msg.created_at).toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `[${date}] ${name}: ${msg.inhalt}`;
    }).join("\n");

    const userMessage = `Kanal: "${kanal.name}" (${kanal.typ})\n\n${chatText}`;

    const t0 = Date.now();

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    const duration_ms = Date.now() - t0;

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      console.error("Claude API error:", errText);
      await logApiUsage(admin, {
        edge_function: "summarize-channel",
        modul: "kommunikation",
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        input_tokens: 0,
        output_tokens: 0,
        duration_ms,
        success: false,
        user_id: auth.user_id,
        error_message: errText.slice(0, 500),
      });
      return json({ error: "KI-Zusammenfassung fehlgeschlagen" }, 502);
    }

    const claudeData: any = await claudeResp.json();
    const zusammenfassung: string = claudeData.content?.[0]?.text ?? "";

    await logApiUsage(admin, {
      edge_function: "summarize-channel",
      modul: "kommunikation",
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      input_tokens: claudeData.usage?.input_tokens || 0,
      output_tokens: claudeData.usage?.output_tokens || 0,
      duration_ms,
      success: true,
      user_id: auth.user_id,
    });

    return json({ zusammenfassung });
  } catch (err: any) {
    console.error("summarize-channel error:", err);
    return json({ error: err.message || "Unbekannter Fehler" }, 500);
  }
});
