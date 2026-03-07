/**
 * Supabase Edge Function: support-ki-antwort
 * Generiert KI-Antwortvorschlaege fuer Support-Tickets via Claude API.
 *
 * POST Body: { ticket_id: string }
 * Returns:   { vorschlag: string }
 *
 * Laedt Ticket-Kontext, bisherige Kommentare und akzeptierte KI-Feedbacks
 * als Few-Shot-Beispiele fuer bessere Antwortqualitaet.
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

const ANTWORT_SYSTEM_PROMPT = `Du bist Support-Assistent fuer vit:bikes Franchise. Professionell, freundlich, Du-Form, max 120 Woerter. Beantworte das Ticket basierend auf dem Kontext.

Regeln:
- Antworte direkt und hilfreich
- Verwende Du-Form (nicht Sie)
- Keine Floskeln wie "Vielen Dank fuer deine Nachricht"
- Wenn du dir unsicher bist, sage das ehrlich
- Beziehe dich auf den bisherigen Verlauf falls vorhanden
- Gib konkrete naechste Schritte an`;

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
    const { ticket_id } = body;

    if (!ticket_id || typeof ticket_id !== "string") {
      return json({ error: "ticket_id ist erforderlich" }, 400);
    }

    // ── Ticket laden (mit Standort-Name via Join) ──
    const { data: ticket, error: ticketErr } = await admin
      .from("support_tickets")
      .select("*, standort:standorte(name)")
      .eq("id", ticket_id)
      .single();

    if (ticketErr || !ticket) {
      console.error("Ticket nicht gefunden:", ticketErr);
      return json({ error: "Ticket nicht gefunden" }, 404);
    }

    // ── Oeffentliche Kommentare laden ──
    const { data: kommentare } = await admin
      .from("support_ticket_kommentare")
      .select("inhalt, autor_name, erstellt_am, ist_hq_antwort")
      .eq("ticket_id", ticket_id)
      .eq("is_internal", false)
      .order("erstellt_am", { ascending: true });

    // ── Akzeptierte KI-Feedbacks als Few-Shot-Beispiele ──
    const { data: feedbacks } = await admin
      .from("support_ki_feedback")
      .select("frage_kontext, ki_antwort")
      .eq("akzeptiert", true)
      .eq("kategorie", ticket.kategorie || "Allgemein")
      .order("created_at", { ascending: false })
      .limit(15);

    // ── Prompt zusammenbauen ──
    let fewShotBlock = "";
    if (feedbacks && feedbacks.length > 0) {
      const examples = feedbacks
        .map(
          (f: any, i: number) =>
            `Beispiel ${i + 1}:\nFrage: ${(f.frage_kontext || "").slice(0, 200)}\nAntwort: ${(f.ki_antwort || "").slice(0, 300)}`
        )
        .join("\n\n");
      fewShotBlock = `\n\nHier sind erfolgreiche fruehere Antworten als Orientierung:\n${examples}`;
    }

    let verlauf = "";
    if (kommentare && kommentare.length > 0) {
      verlauf = "\n\nBisheriger Verlauf:\n" +
        kommentare
          .map(
            (k: any) =>
              `[${k.ist_hq_antwort ? "HQ" : "Partner"}] ${k.autor_name || "Unbekannt"}: ${(k.inhalt || "").slice(0, 500)}`
          )
          .join("\n");
    }

    const standortName = ticket.standort?.name || "Unbekannt";
    // PII-Stripping vor API-Call
    const _rawPrompt = `Ticket #${ticket.ticket_nr || ticket.id}
Standort: ${standortName}
Kategorie: ${ticket.kategorie || "Allgemein"}
Prioritaet: ${ticket.prioritaet || "mittel"}
Betreff: ${ticket.betreff}
Beschreibung: ${ticket.beschreibung || "Keine Beschreibung"}${verlauf}${fewShotBlock}

Erstelle einen professionellen Antwortvorschlag:`;
    const { cleaned: userPrompt } = stripPii(_rawPrompt);

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
        max_tokens: 600,
        system: ANTWORT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const duration_ms = Date.now() - t0;

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      console.error("Claude API error:", errText);
      await logApiUsage(admin, {
        edge_function: "support-ki-antwort",
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
    const vorschlag: string = claudeData.content?.[0]?.text ?? "";

    await logApiUsage(admin, {
      edge_function: "support-ki-antwort",
      modul: "support",
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      input_tokens: claudeData.usage?.input_tokens || 0,
      output_tokens: claudeData.usage?.output_tokens || 0,
      duration_ms,
      success: true,
      user_id: auth.user_id,
      standort_id: ticket.standort_id || null,
    });

    return json({ vorschlag: vorschlag.trim() });
  } catch (err: any) {
    console.error("support-ki-antwort error:", err);
    return json({ error: err.message || "Unbekannter Fehler" }, 500);
  }
});
