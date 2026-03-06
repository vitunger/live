/**
 * Supabase Edge Function: support-ki-triage
 * Klassifiziert Support-Tickets via Claude API.
 *
 * POST Body: { betreff: string, beschreibung?: string }
 * Returns:   { kategorie, prioritaet, konfidenz, begruendung }
 *
 * API Usage Logging: Jeder Claude-API-Call wird in api_usage_log protokolliert.
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

// ─── API USAGE LOGGING ────────────────────────────────────────────────────

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
  standort_id?: string;
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
      standort_id: params.standort_id || null,
      error_message: params.error_message || null,
    });
  } catch (e) {
    console.error("api_usage_log insert failed:", e);
  }
}

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────

const TRIAGE_SYSTEM_PROMPT = `Klassifiziere ein Support-Ticket fuer ein Fahrrad-Franchise-Netzwerk. Antworte NUR als JSON: {"kategorie": "IT|Abrechnung|Marketing|Allgemein|Sonstiges", "prioritaet": "niedrig|mittel|kritisch", "konfidenz": 0.0-1.0, "begruendung": "..."}`;

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────

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
    const { betreff, beschreibung } = body;

    if (!betreff || typeof betreff !== "string" || !betreff.trim()) {
      return json({ error: "betreff ist erforderlich" }, 400);
    }

    const userPrompt = `Betreff: ${betreff}\nBeschreibung: ${beschreibung || "Keine Beschreibung"}`;
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
        system: TRIAGE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const duration_ms = Date.now() - t0;

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      console.error("Claude API error:", errText);
      await logApiUsage(admin, {
        edge_function: "support-ki-triage",
        modul: "support",
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        input_tokens: 0,
        output_tokens: 0,
        duration_ms,
        success: false,
        user_id: auth.user_id,
        error_message: errText.slice(0, 500),
      });
      return json({ error: "Claude API Fehler" }, 502);
    }

    const claudeData: any = await claudeResp.json();
    const rawText: string = claudeData.content?.[0]?.text ?? "";

    await logApiUsage(admin, {
      edge_function: "support-ki-triage",
      modul: "support",
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      input_tokens: claudeData.usage?.input_tokens || 0,
      output_tokens: claudeData.usage?.output_tokens || 0,
      duration_ms,
      success: true,
      user_id: auth.user_id,
    });

    // Parse JSON from Claude response (strip markdown fences if present)
    const clean = rawText.replace(/```json|```/g, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      console.error("JSON parse error from Claude:", rawText);
      return json({
        kategorie: "Sonstiges",
        prioritaet: "mittel",
        konfidenz: 0.0,
        begruendung: "KI-Klassifizierung fehlgeschlagen – manuelle Einordnung noetig",
      });
    }

    return json({
      kategorie: parsed.kategorie || "Sonstiges",
      prioritaet: parsed.prioritaet || "mittel",
      konfidenz: typeof parsed.konfidenz === "number" ? parsed.konfidenz : 0.5,
      begruendung: parsed.begruendung || "",
    });
  } catch (err: any) {
    console.error("support-ki-triage error:", err);
    return json({ error: err.message || "Unbekannter Fehler" }, 500);
  }
});
