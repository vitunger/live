/**
 * Supabase Edge Function: support-chatbot
 * Floating Chat-Widget Backend – beantwortet Partner-Fragen via Claude
 * mit Kontext aus Wissensartikeln und Canned Responses.
 *
 * POST Body: { message: string, history?: {role:string,content:string}[] }
 * Returns:   { antwort: string, artikel_ids?: string[], ticket_empfohlen?: boolean }
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
// ─── PII STRIPPING (DSGVO Art. 5(1)(c) Datenminimierung) ──────────────────
// Entfernt/ersetzt personenbezogene Daten vor dem API-Call an Anthropic.
// Mapping wird zurueckgegeben, damit Ergebnisse ggf. re-mapped werden koennen.
interface PiiMapping { [placeholder: string]: string; }

function stripPii(text: string): { cleaned: string; mapping: PiiMapping } {
  const mapping: PiiMapping = {};
  let counter = { person: 0, email: 0, phone: 0, iban: 0, tax: 0, address: 0 };

  let cleaned = text;

  // E-Mail-Adressen
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, (match) => {
    counter.email++;
    const ph = `[EMAIL_${counter.email}]`;
    mapping[ph] = match;
    return ph;
  });

  // IBAN (DE + international)
  cleaned = cleaned.replace(/[A-Z]{2}\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{0,2}/g, (match) => {
    counter.iban++;
    const ph = `[IBAN_${counter.iban}]`;
    mapping[ph] = match;
    return ph;
  });

  // Steuernummern (DE Format: XX/XXX/XXXXX oder XXX/XXX/XXXXX)
  cleaned = cleaned.replace(/\d{2,3}\/\d{3}\/\d{4,5}/g, (match) => {
    counter.tax++;
    const ph = `[STEUERNR_${counter.tax}]`;
    mapping[ph] = match;
    return ph;
  });

  // USt-IdNr (DE + EU)
  cleaned = cleaned.replace(/[A-Z]{2}\d{9,12}/g, (match) => {
    counter.tax++;
    const ph = `[USTID_${counter.tax}]`;
    mapping[ph] = match;
    return ph;
  });

  // Telefonnummern (DE Formate)
  cleaned = cleaned.replace(/(?:\+49|0049|0)[\s\-]?\(?\d{2,5}\)?[\s\-]?\d{3,}[\s\-]?\d{0,}/g, (match) => {
    if (match.replace(/\D/g, "").length >= 7) {
      counter.phone++;
      const ph = `[TELEFON_${counter.phone}]`;
      mapping[ph] = match;
      return ph;
    }
    return match;
  });

  // PLZ + Ort (5-stellige PLZ gefolgt von Wort)
  cleaned = cleaned.replace(/(\d{5})\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)/g, (match) => {
    counter.address++;
    const ph = `[ORT_${counter.address}]`;
    mapping[ph] = match;
    return ph;
  });

  // Straßen mit Hausnummer (z.B. "Musterstr. 12a" oder "Am Markt 5")
  cleaned = cleaned.replace(/([A-ZÄÖÜ][a-zäöüß]+(?:str\.|straße|weg|platz|gasse|allee|ring|damm))\s+\d+[a-z]?/gi, (match) => {
    counter.address++;
    const ph = `[STRASSE_${counter.address}]`;
    mapping[ph] = match;
    return ph;
  });

  return { cleaned, mapping };
}

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

// ── API USAGE LOGGING ────────────────────────────────────────────────────

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

// ── SYSTEM PROMPT ────────────────────────────────────────────────────────

const CHATBOT_SYSTEM_PROMPT = `Du bist der vit:bikes Support-Assistent im Partner-Cockpit (cockpit.vitbikes.de).
Du hilfst Partnern (Fahrradhaendlern im Franchise-Netzwerk) bei Fragen zu:
- IT & Systeme (Cockpit, Kassensystem, B2B-Portal)
- Abrechnung & BWA (Controlling, Rechnungen, DATEV)
- Marketing & Ads (Google Ads, Meta, Kampagnen)
- Einkauf & Sortiment (Vororder, Lieferanten)
- Allgemeine Fragen zum Netzwerk

REGELN:
1. Antworte IMMER auf Deutsch, duze den Partner
2. Halte Antworten kurz und praezise (max 3-4 Saetze)
3. Wenn du dir nicht sicher bist, empfiehl ein Support-Ticket zu erstellen
4. Nutze die bereitgestellten Wissensartikel als Kontext
5. Antworte NUR als JSON: {"antwort": "...", "ticket_empfohlen": true/false}
6. Setze ticket_empfohlen auf true, wenn das Problem komplex ist oder du keine Loesung hast`;

// ── MAIN HANDLER ─────────────────────────────────────────────────────────

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
    const { message, history } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return json({ error: "message ist erforderlich" }, 400);
    }

    // Wissensartikel als Kontext laden
    const woerter = message.split(/\s+/).filter((w: string) => w.length > 2).slice(0, 5);
    let artikelKontext = "";
    if (woerter.length > 0) {
      let query = admin
        .from("support_wissensartikel")
        .select("titel, inhalt")
        .eq("status", "publiziert")
        .limit(3);
      for (const w of woerter) {
        query = query.or(`titel.ilike.%${w}%,inhalt.ilike.%${w}%`);
      }
      const { data: artikel } = await query;
      if (artikel && artikel.length > 0) {
        artikelKontext = "\n\nRELEVANTE WISSENSARTIKEL:\n" +
          artikel.map((a: any) => `--- ${a.titel} ---\n${a.inhalt}`).join("\n\n");
      }
    }

    // Canned Responses als Kontext
    const { data: canned } = await admin
      .from("support_canned_responses")
      .select("titel, inhalt")
      .limit(5);
    let cannedKontext = "";
    if (canned && canned.length > 0) {
      cannedKontext = "\n\nHAEUFIGE ANTWORTEN (Textbausteine):\n" +
        canned.map((c: any) => `- ${c.titel}: ${c.inhalt}`).join("\n");
    }

    // Chat-Nachrichten aufbauen
    const messages: any[] = [];
    if (history && Array.isArray(history)) {
      // Max letzte 6 Nachrichten
      const recent = history.slice(-6);
      for (const msg of recent) {
        messages.push({ role: msg.role === "user" ? "user" : "assistant", content: stripPii(msg.content || "").cleaned });
      }
    }
    messages.push({
      role: "user",
      content: stripPii(message + artikelKontext + cannedKontext).cleaned,
    });

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
        system: CHATBOT_SYSTEM_PROMPT,
        messages,
      }),
    });

    const duration_ms = Date.now() - t0;

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      console.error("Claude API error:", errText);
      await logApiUsage(admin, {
        edge_function: "support-chatbot",
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
      return json({ antwort: "Entschuldigung, ich kann gerade nicht antworten. Bitte erstelle ein Support-Ticket.", ticket_empfohlen: true });
    }

    const claudeData: any = await claudeResp.json();
    const rawText: string = claudeData.content?.[0]?.text ?? "";

    await logApiUsage(admin, {
      edge_function: "support-chatbot",
      modul: "support",
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      input_tokens: claudeData.usage?.input_tokens || 0,
      output_tokens: claudeData.usage?.output_tokens || 0,
      duration_ms,
      success: true,
      user_id: auth.user_id,
    });

    // Parse JSON
    const clean = rawText.replace(/```json|```/g, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(clean);
    } catch {
      // Fallback: raw text als Antwort
      return json({ antwort: rawText, ticket_empfohlen: false });
    }

    return json({
      antwort: parsed.antwort || rawText,
      ticket_empfohlen: parsed.ticket_empfohlen || false,
    });
  } catch (err: any) {
    console.error("support-chatbot error:", err);
    return json({ error: err.message || "Unbekannter Fehler" }, 500);
  }
});
