/**
 * Supabase Edge Function: spiritus-analyze
 * Analysiert Call-Transkripte mit Claude, erstellt 8-Feld-Protokoll,
 * speichert in spiritus_transcripts + spiritus_extractions.
 *
 * Unterstuetzt 3 Gespraechskontexte: partner, lieferant, akquise.
 * Laedt KI-Feedback aus spiritus_ki_feedback als Lernhinweise.
 *
 * API Usage Logging: Jeder Claude-API-Call wird in api_usage_log protokolliert.
 *
 * Deploy: supabase functions deploy spiritus-analyze
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')  ?? '';
const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const ALLOWED_ORIGINS = ["https://cockpit.vitbikes.de", "http://localhost:3000"];

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

// --- Kontext-spezifische Prompt-Zusaetze ---

const KONTEXT_PARTNER = `Dies ist ein Gespraech mit einem bestehenden Franchise-Partner (Fahrrad-Fachhandel).
"extern" wird dem Partner gezeigt - professionell, sachlich, keine internen Bewertungen.
"intern" ist nur fuer HQ - ehrliche Einschaetzung: Umsetzungskraft, Risiken, Potenzial.
"einschaetzung": "stabil" wenn Partner auf Kurs, "entwicklungsfaehig" bei Potenzial mit Luecken, "kritisch" bei akuten Problemen.`;

const KONTEXT_LIEFERANT = `Dies ist ein Gespraech mit einem Lieferanten/Hersteller (z.B. Shimano, Bosch, Cube).
Fokus: Konditionen, Lieferzeiten, Produktverfuegbarkeit, Verhandlungsposition.
"extern" ist hier auch intern - wird NICHT an den Lieferanten gesendet.
"einschaetzung": "stabil" bei guter Partnerschaft, "entwicklungsfaehig" bei Optimierungspotenzial, "kritisch" bei Lieferproblemen/schlechten Konditionen.
"massnahmen.seite": Nutze "hq" oder "lieferant".`;

const KONTEXT_AKQUISE = `Dies ist ein Gespraech mit einem potentiellen neuen Franchise-Standort.
Fokus: Interesse des Kandidaten, Standort-Potenzial, naechste Schritte, Zeitrahmen.
"extern" ist hier auch intern - wird NICHT an den Kandidaten gesendet.
"einschaetzung": "stabil" wenn Kandidat vielversprechend, "entwicklungsfaehig" wenn noch Fragen offen, "kritisch" wenn Bedenken bestehen.
"beobachtung": Potenzial-Einschaetzung, Empfehlung (ja/nein/abwarten), Risiken.
"ziel_messgroesse": z.B. "Entscheidung bis DD.MM.YYYY" oder "LOI bis Ende Monat".`;

function getKontextZusatz(kontext: string): string {
  switch (kontext) {
    case 'lieferant': return KONTEXT_LIEFERANT;
    case 'akquise':   return KONTEXT_AKQUISE;
    default:          return KONTEXT_PARTNER;
  }
}

function buildSystemPrompt(kontext: string): string {
  const kontextLabel = kontext === 'lieferant' ? 'Lieferantengespraech'
    : kontext === 'akquise' ? 'Akquisegespraech'
    : 'Partnergespraech';

  return `Du bist der KI-Protokollassistent des vit:bikes Partnernetzwerks.
Du erhaeltst das Transkript eines Gespraechs. Der Gespraechskontext ist: ${kontextLabel}

${getKontextZusatz(kontext)}

Befolge die Logik: Status \u2192 Fokus \u2192 Massnahme \u2192 Kontrolle

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt:

{
  "extern": {
    "anlass": "Warum fand das Gespraech statt? 1-2 Saetze.",
    "aktuelle_situation": ["Fakten zum aktuellen Status. Max 3 Stichpunkte. Fakten vor Meinungen."],
    "fokus_thema": ["Welches Thema soll geloest werden? Max 1-2 Punkte."],
    "massnahmen": [
      {"massnahme": "Konkrete Aktion", "verantwortlich": "Name/Rolle", "deadline": "YYYY-MM-DD oder null", "seite": "hq|partner|lieferant"}
    ],
    "ziel_messgroesse": "Woran erkennen wir Fortschritt? Konkrete Zahl/KPI.",
    "review_termin": "Wann pruefen wir das Ergebnis?"
  },
  "intern": {
    "einschaetzung": "stabil|entwicklungsfaehig|kritisch",
    "beobachtung": "2-3 Saetze. Ehrliche interne Einschaetzung."
  },
  "kategorien": ["verkauf_conversion", "marketing_sichtbarkeit"],
  "summary": "1-2 Saetze Zusammenfassung",
  "sentiment": {"level": "positiv|neutral|angespannt", "confidence": 0.9, "begruendung": "Kurze Begruendung"},
  "tags": ["marketing", "zahlen"]
}

REGELN:
- "extern" wird dem Partner gezeigt (bei Kontext "partner") - professionell, sachlich.
- "intern" ist NUR fuer HQ - ehrlich, direkt, Risiken benennen.
- Massnahmen: IMMER mit Verantwortlich und Deadline. Ohne Massnahme ist das Gespraech nicht abgeschlossen.
- Fokus-Thema: Maximal 1-2. Verhindert "wir reden ueber alles und loesen nichts."
- Aktuelle Situation: Fakten VOR Meinungen. Zahlen wenn moeglich.
- Ziel/Messgroesse: Konkrete Zahlen. "Conversion von 28% auf 35%" statt "Conversion verbessern".
- Review: Konkretes Datum oder "im naechsten Partnergespraech".
- Kategorien: Waehle 1-3 aus: marketing_sichtbarkeit, verkauf_conversion, werkstatt_service, mitarbeiter, einkauf_sortiment, finanzen_controlling, digitalisierung
- Antworte NUR mit dem JSON, kein Markdown, keine Erklaerung.`;
}

const CONFIDENCE_AUTO_APPROVE = 0.85;

// --- API USAGE LOGGING ---

async function logApiUsage(sb: any, params: {
  edge_function: string;
  modul: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  duration_ms: number;
  success: boolean;
  standort_id?: string;
  error_message?: string;
}) {
  try {
    const inputCostPer1M = 3.0;
    const outputCostPer1M = 15.0;
    const estimated_cost_usd = (params.input_tokens / 1_000_000) * inputCostPer1M
                             + (params.output_tokens / 1_000_000) * outputCostPer1M;

    await sb.from('api_usage_log').insert({
      edge_function: params.edge_function,
      modul: params.modul,
      provider: params.provider,
      model: params.model,
      input_tokens: params.input_tokens,
      output_tokens: params.output_tokens,
      estimated_cost_usd,
      duration_ms: params.duration_ms,
      success: params.success,
      standort_id: params.standort_id || null,
      error_message: params.error_message || null,
    });
  } catch (e) {
    console.error('api_usage_log insert failed:', e);
  }
}

// --- Lernhinweise aus KI-Feedback laden ---

async function loadFeedbackHints(sb: any, kontext: string): Promise<string> {
  try {
    const { data, error } = await sb
      .from('spiritus_ki_feedback')
      .select('feld, ki_original, user_final, created_at')
      .eq('gespraechs_kontext', kontext)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) return '';

    const hints = data.map((f: any, i: number) => {
      const orig = typeof f.ki_original === 'string' ? f.ki_original : JSON.stringify(f.ki_original);
      const final_ = typeof f.user_final === 'string' ? f.user_final : JSON.stringify(f.user_final);
      return `${i + 1}. Feld "${f.feld}": KI schrieb ${orig}, User korrigierte zu ${final_}`;
    }).join('\n');
    return `\n\nLERNHINWEISE (aus frueherem Feedback zu ${kontext}-Gespraechen - beruecksichtige diese bei deiner Analyse):\n${hints}`;
  } catch (e) {
    console.error('Feedback-Hints laden fehlgeschlagen:', e);
    return '';
  }
}

export default async function handler(req: Request): Promise<Response> {
  const cors = getCorsHeaders(req);
  _cors = cors;
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  const auth = await verifyJwt(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: "Nicht authentifiziert" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      transcript,
      standortId,
      standortName,
      callDate,
      callType,
      durationMin,
      // Neue Felder
      gespraechsKontext: rawKontext,
      lieferantName,
      akquiseKontaktName,
      akquiseKontaktFirma,
      akquiseKontaktOrt,
      thema,
    } = body;

    // Kontext validieren, Default: partner
    const validKontexte = ['partner', 'lieferant', 'akquise'];
    const gespraechsKontext = validKontexte.includes(rawKontext) ? rawKontext : 'partner';

    if (!transcript || transcript.length < 20) {
      return json({ error: 'Transkript zu kurz oder leer' }, 400);
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Lernhinweise aus KI-Feedback laden
    const feedbackHints = await loadFeedbackHints(sb, gespraechsKontext);

    // Kontext-Info fuer den User-Prompt zusammenbauen
    let kontextInfo = '';
    if (gespraechsKontext === 'lieferant' && lieferantName) {
      kontextInfo = `\nLieferant: ${lieferantName}`;
    } else if (gespraechsKontext === 'akquise') {
      const parts: string[] = [];
      if (akquiseKontaktName) parts.push(`Kontakt: ${akquiseKontaktName}`);
      if (akquiseKontaktFirma) parts.push(`Firma: ${akquiseKontaktFirma}`);
      if (akquiseKontaktOrt) parts.push(`Ort: ${akquiseKontaktOrt}`);
      if (parts.length) kontextInfo = '\n' + parts.join(', ');
    }
    if (thema) {
      kontextInfo += `\nThema: ${thema}`;
    }

    const userPrompt = `Analysiere dieses Transkript:${kontextInfo}\n\n${transcript.slice(0, 8000)}${feedbackHints}`;

    const systemPrompt = buildSystemPrompt(gespraechsKontext);
    const t0 = Date.now();

    // Claude analyze
    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const duration_ms = Date.now() - t0;

    if (!claudeResp.ok) {
      const err = await claudeResp.text();
      await logApiUsage(sb, {
        edge_function: 'spiritus-analyze', modul: 'spiritus', provider: 'anthropic',
        model: 'claude-sonnet-4-20250514', input_tokens: 0, output_tokens: 0,
        duration_ms, success: false, standort_id: standortId,
        error_message: err.slice(0, 500),
      });
      throw new Error('Claude API Fehler: ' + err);
    }

    const claudeData = await claudeResp.json();
    const rawText = claudeData.content?.[0]?.text || '';

    // Log successful usage
    await logApiUsage(sb, {
      edge_function: 'spiritus-analyze', modul: 'spiritus', provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      input_tokens: claudeData.usage?.input_tokens || 0,
      output_tokens: claudeData.usage?.output_tokens || 0,
      duration_ms, success: true, standort_id: standortId,
    });

    // Parse JSON from Claude
    let extracted: any = {};
    try {
      const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(clean);
    } catch (_e) {
      throw new Error('KI-Antwort konnte nicht geparst werden: ' + rawText.slice(0, 200));
    }

    // Protokoll-Felder sicher extrahieren
    const ext = extracted.extern || {};
    const intern = extracted.intern || {};

    const protokollAnlass = ext.anlass || '';
    const protokollSituation = ext.aktuelle_situation || [];
    const protokollFokus = ext.fokus_thema || [];
    const protokollMassnahmen = ext.massnahmen || [];
    const protokollZiel = ext.ziel_messgroesse || '';
    const protokollReview = ext.review_termin || '';
    const protokollEinschaetzung = intern.einschaetzung || 'stabil';
    const protokollBeobachtung = intern.beobachtung || '';
    const kategorien = extracted.kategorien || [];

    // Save transcript mit neuem Protokoll-Format + Kontext-Feldern
    const { data: transcript_row, error: tErr } = await sb
      .from('spiritus_transcripts')
      .insert({
        standort_id:              standortId,
        standort_name:            standortName,
        call_date:                callDate,
        call_type:                callType || 'beratung',
        duration_min:             durationMin || null,
        transcript_text:          transcript.slice(0, 50000),
        summary:                  extracted.summary || '',
        sentiment_level:          extracted.sentiment?.level || 'neutral',
        status:                   'review',
        // 8-Feld-Protokoll
        protokoll_anlass:         protokollAnlass,
        protokoll_situation:      protokollSituation,
        protokoll_fokus:          protokollFokus,
        protokoll_massnahmen:     protokollMassnahmen,
        protokoll_ziel:           protokollZiel,
        protokoll_review:         protokollReview,
        protokoll_einschaetzung:  protokollEinschaetzung,
        protokoll_beobachtung:    protokollBeobachtung,
        // Kategorien
        kategorien:               kategorien,
        // Kontext-Felder
        gespraechs_kontext:       gespraechsKontext,
        lieferant_name:           lieferantName || null,
        akquise_kontakt_name:     akquiseKontaktName || null,
        akquise_kontakt_firma:    akquiseKontaktFirma || null,
        akquise_kontakt_ort:      akquiseKontaktOrt || null,
        thema:                    thema || null,
      })
      .select('id')
      .single();

    if (tErr) throw new Error('DB-Fehler (transcript): ' + tErr.message);
    const transcriptId = transcript_row.id;

    // --- Backward compatibility: spiritus_extractions ---
    const extractions: any[] = [];

    // Problems aus aktuelle_situation extrahieren
    (protokollSituation || []).forEach((s: string) => {
      extractions.push({
        transcript_id: transcriptId,
        kategorie:     'problem',
        content:       s,
        confidence:    0.85,
        approved:      true,
      });
    });

    // Massnahmen aus protokoll_massnahmen extrahieren
    (protokollMassnahmen || []).forEach((m: any) => {
      const content = typeof m === 'string' ? m : (m.massnahme || JSON.stringify(m));
      extractions.push({
        transcript_id: transcriptId,
        kategorie:     'massnahme',
        content:       content,
        confidence:    0.85,
        approved:      true,
      });
    });

    // Sentiment
    if (extracted.sentiment) {
      extractions.push({
        transcript_id: transcriptId,
        kategorie:     'sentiment',
        content:       extracted.sentiment.begruendung || '',
        confidence:    extracted.sentiment.confidence || 0.8,
        approved:      true,
      });
    }

    if (extractions.length) {
      await sb.from('spiritus_extractions').insert(extractions);
    }

    // Check if all high-confidence -> auto-approve transcript
    const allAutoApproved = extractions.every(e => e.approved);
    if (allAutoApproved) {
      await sb.from('spiritus_transcripts').update({ status: 'verarbeitet' }).eq('id', transcriptId);
    }

    return json({
      success: true,
      transcriptId,
      extractionCount: extractions.length,
      autoApproved: allAutoApproved,
      protokoll: {
        extern: ext,
        intern: intern,
        kategorien: kategorien,
        sentiment: extracted.sentiment || null,
        summary: extracted.summary || '',
        tags: extracted.tags || [],
      },
    });

  } catch (e: any) {
    console.error('spiritus-analyze:', e);
    return json({ error: e.message }, 500);
  }
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ..._cors, 'Content-Type': 'application/json' },
  });
}
