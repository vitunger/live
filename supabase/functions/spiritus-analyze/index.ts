/**
 * Supabase Edge Function: spiritus-analyze
 * Analysiert Call-Transkripte mit Claude, extrahiert Probleme/Maßnahmen/Sentiment,
 * speichert alles in spiritus_transcripts + spiritus_extractions.
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

const SYSTEM_PROMPT = `Du analysierst Gesprächsprotokolle/-transkripte von Gesprächen zwischen dem Franchise-HQ vit:bikes und Franchise-Standorten (Fahrradläden).

Extrahiere aus dem Transkript exakt diese Kategorien:

1. PROBLEME: Herausforderungen, Hürden, Beschwerden oder Schwierigkeiten des Standorts
2. MASSNAHMEN: Konkrete Empfehlungen, Maßnahmen oder Lösungsansätze die besprochen wurden  
3. SENTIMENT: Gesamtstimmung des Standorts im Call (positiv/neutral/angespannt) + Begründung

Für jede Erkenntnis bewerte confidence 0.0–1.0:
- ≥ 0.85 = eindeutig und explizit genannt
- 0.60–0.84 = sinngemäß oder implizit
- < 0.60 = Interpretation

Antworte NUR als gültiges JSON, ohne Markdown-Backticks:
{
  "probleme": [
    {"content": "Beschreibung des Problems", "confidence": 0.9, "keywords": ["keyword1", "keyword2"]}
  ],
  "massnahmen": [
    {"content": "Beschreibung der Maßnahme", "confidence": 0.85, "keywords": ["keyword1"]}
  ],
  "sentiment": {
    "level": "positiv|neutral|angespannt",
    "confidence": 0.9,
    "begruendung": "Kurze Begründung"
  },
  "summary": "1-2 Sätze Zusammenfassung des Calls",
  "call_themen": ["Thema1", "Thema2"]
}`;

const CONFIDENCE_AUTO_APPROVE = 0.85;

// ─── API USAGE LOGGING ────────────────────────────────────────────────────

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
    const { transcript, standortId, standortName, callDate, callType, durationMin } = body;

    if (!transcript || transcript.length < 20) {
      return json({ error: 'Transkript zu kurz oder leer' }, 400);
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
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
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Analysiere dieses Transkript:\n\n${transcript.slice(0, 8000)}` }]
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
    } catch (e) {
      throw new Error('KI-Antwort konnte nicht geparst werden: ' + rawText.slice(0, 200));
    }

    // Save transcript
    const { data: transcript_row, error: tErr } = await sb
      .from('spiritus_transcripts')
      .insert({
        standort_id:    standortId,
        standort_name:  standortName,
        call_date:      callDate,
        call_type:      callType || 'Sonstiges',
        duration_min:   durationMin || null,
        transcript_text: transcript.slice(0, 50000),
        summary:        extracted.summary || '',
        sentiment_level: extracted.sentiment?.level || 'neutral',
        call_themen:    extracted.call_themen || [],
        status:         'review'  // always start as review
      })
      .select('id')
      .single();

    if (tErr) throw new Error('DB-Fehler (transcript): ' + tErr.message);
    const transcriptId = transcript_row.id;

    // Save extractions
    const extractions: any[] = [];

    // Problems
    (extracted.probleme || []).forEach((p: any) => {
      extractions.push({
        transcript_id: transcriptId,
        standort_id:   standortId,
        kategorie:     'problem',
        content:       p.content,
        confidence:    p.confidence || 0.7,
        keywords:      p.keywords || [],
        approved:      (p.confidence || 0) >= CONFIDENCE_AUTO_APPROVE
      });
    });

    // Maßnahmen
    (extracted.massnahmen || []).forEach((m: any) => {
      extractions.push({
        transcript_id: transcriptId,
        standort_id:   standortId,
        kategorie:     'massnahme',
        content:       m.content,
        confidence:    m.confidence || 0.7,
        keywords:      m.keywords || [],
        approved:      (m.confidence || 0) >= CONFIDENCE_AUTO_APPROVE
      });
    });

    // Sentiment
    if (extracted.sentiment) {
      extractions.push({
        transcript_id: transcriptId,
        standort_id:   standortId,
        kategorie:     'sentiment',
        content:       extracted.sentiment.begruendung || '',
        confidence:    extracted.sentiment.confidence || 0.8,
        approved:      true
      });
    }

    if (extractions.length) {
      await sb.from('spiritus_extractions').insert(extractions);
    }

    // Check if all high-confidence → auto-approve transcript
    const allAutoApproved = extractions.every(e => e.approved);
    if (allAutoApproved) {
      await sb.from('spiritus_transcripts').update({ status: 'verarbeitet' }).eq('id', transcriptId);
    }

    return json({ success: true, transcriptId, extractionCount: extractions.length, autoApproved: allAutoApproved });

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
