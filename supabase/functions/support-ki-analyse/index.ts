/**
 * Supabase Edge Function: support-ki-analyse
 * Analysiert geloeste Support-Tickets der letzten 30 Tage und generiert
 * Wissensartikel-Entwuerfe fuer haeufige Themen.
 *
 * Auth: Cron-Key Header ODER JWT (dual-mode)
 *   - x-support-cron-key: matches SUPPORT_CRON_KEY env var
 *   - Authorization: Bearer <jwt>
 *
 * POST Body: (none required)
 * Returns:   { entwuerfe_erstellt: number }
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
const SUPPORT_CRON_KEY = Deno.env.get("SUPPORT_CRON_KEY") ?? "";

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-support-cron-key",
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

function verifyCronKey(req: Request): boolean {
  const cronKey = req.headers.get("x-support-cron-key") || "";
  return !!SUPPORT_CRON_KEY && cronKey === SUPPORT_CRON_KEY;
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

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────

const ANALYSE_SYSTEM_PROMPT = `Du analysierst geloeste Support-Tickets eines Fahrrad-Franchise-Netzwerks (vit:bikes).

Deine Aufgabe:
1. Identifiziere 2-3 haeufige Themen/Problemfelder aus den geloesten Tickets
2. Erstelle fuer jedes Thema einen Wissensartikel-Entwurf

Fuer jeden Artikel:
- titel: Praegnanter Titel (max 80 Zeichen)
- kategorie: IT|Abrechnung|Marketing|Allgemein|Sonstiges
- inhalt: Hilfe-Artikel in Markdown (200-400 Woerter), Du-Form, praxisnah, mit konkreten Schritten
- tags: 2-4 relevante Tags als Array

Antworte NUR als JSON Array:
[
  {
    "titel": "...",
    "kategorie": "...",
    "inhalt": "...",
    "tags": ["tag1", "tag2"]
  }
]

WICHTIG:
- Keine Duplikate zu bestehenden Artikeln erstellen
- Nur Themen aufgreifen die mindestens 2x vorkamen
- Praxisnahe Loesungen, keine theoretischen Abhandlungen`;

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = getCorsHeaders(req);
  _cors = cors;
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Dual auth: cron key OR JWT
  const isCron = verifyCronKey(req);
  const auth = isCron ? { user_id: "cron" } : await verifyJwt(req);
  if (!auth) return json({ error: "Nicht authentifiziert" }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // ── Geloeste Tickets der letzten 30 Tage laden ──
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: tickets, error: ticketsErr } = await admin
      .from("support_tickets")
      .select("id, ticket_nr, betreff, beschreibung, kategorie, prioritaet, geloest_am")
      .eq("status", "geloest")
      .gte("geloest_am", thirtyDaysAgo.toISOString())
      .order("geloest_am", { ascending: false })
      .limit(100);

    if (ticketsErr) {
      console.error("Tickets laden fehlgeschlagen:", ticketsErr);
      return json({ error: "Tickets konnten nicht geladen werden" }, 500);
    }

    if (!tickets || tickets.length < 3) {
      return json({ entwuerfe_erstellt: 0, hinweis: "Zu wenig geloeste Tickets (min. 3)" });
    }

    // ── Kommentare fuer diese Tickets laden ──
    const ticketIds = tickets.map((t: any) => t.id);
    const { data: kommentare } = await admin
      .from("support_ticket_kommentare")
      .select("ticket_id, inhalt, ist_hq_antwort")
      .in("ticket_id", ticketIds)
      .eq("is_internal", false)
      .order("erstellt_am", { ascending: true });

    // Kommentare den Tickets zuordnen
    const kommentarMap = new Map<string, any[]>();
    for (const k of kommentare || []) {
      const list = kommentarMap.get(k.ticket_id) || [];
      list.push(k);
      kommentarMap.set(k.ticket_id, list);
    }

    // ── Bestehende Wissensartikel laden (Duplikat-Vermeidung) ──
    const { data: existingArticles } = await admin
      .from("support_wissensartikel")
      .select("titel, kategorie")
      .limit(200);

    const existingTitles = (existingArticles || [])
      .map((a: any) => (a.titel || "").toLowerCase())
      .join(" | ");

    // ── Ticket-Kontext fuer Claude aufbereiten ──
    const ticketSummaries = tickets.map((t: any) => {
      const koms = kommentarMap.get(t.id) || [];
      const verlauf = koms
        .map((k: any) => `  [${k.ist_hq_antwort ? "HQ" : "Partner"}]: ${(k.inhalt || "").slice(0, 200)}`)
        .join("\n");
      return `Ticket #${t.ticket_nr}: ${t.betreff} [${t.kategorie || "?"}]
Beschreibung: ${(t.beschreibung || "").slice(0, 300)}
${verlauf ? "Verlauf:\n" + verlauf : "(keine Kommentare)"}`;
    }).join("\n---\n");

    const _rawPrompt = `Hier sind ${tickets.length} geloeste Support-Tickets der letzten 30 Tage:

${ticketSummaries}

Bereits existierende Artikel-Titel (KEINE Duplikate erstellen):
${existingTitles || "(noch keine Artikel vorhanden)"}

Erstelle 2-3 Wissensartikel-Entwuerfe zu den haeufigsten Themen:`;
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
        max_tokens: 4000,
        system: ANALYSE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const duration_ms = Date.now() - t0;

    if (!claudeResp.ok) {
      const errText = await claudeResp.text();
      console.error("Claude API error:", errText);
      await logApiUsage(admin, {
        edge_function: "support-ki-analyse",
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
      edge_function: "support-ki-analyse",
      modul: "support",
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      input_tokens: claudeData.usage?.input_tokens || 0,
      output_tokens: claudeData.usage?.output_tokens || 0,
      duration_ms,
      success: true,
      user_id: auth.user_id,
    });

    // ── JSON parsen ──
    const clean = rawText.replace(/```json|```/g, "").trim();
    let articles: any[];
    try {
      articles = JSON.parse(clean);
    } catch (parseErr) {
      console.error("JSON parse error from Claude:", rawText);
      return json({ entwuerfe_erstellt: 0, error: "KI-Antwort konnte nicht geparst werden" }, 500);
    }

    if (!Array.isArray(articles) || articles.length === 0) {
      return json({ entwuerfe_erstellt: 0, hinweis: "Keine Artikel-Vorschlaege generiert" });
    }

    // ── Artikel in DB einfuegen ──
    let inserted = 0;
    for (const article of articles) {
      const { error: insertErr } = await admin
        .from("support_wissensartikel")
        .insert({
          titel: (article.titel || "Ohne Titel").slice(0, 200),
          kategorie: article.kategorie || "Allgemein",
          inhalt: article.inhalt || "",
          tags: article.tags || [],
          status: "entwurf",
          ki_generiert: true,
        });

      if (insertErr) {
        console.error("Artikel insert fehlgeschlagen:", insertErr);
      } else {
        inserted++;
      }
    }

    return json({ entwuerfe_erstellt: inserted });
  } catch (err: any) {
    console.error("support-ki-analyse error:", err);
    return json({ error: err.message || "Unbekannter Fehler" }, 500);
  }
});
