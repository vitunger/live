/**
 * Supabase Edge Function: spiritus-analyze
 * Analysiert Call-Transkripte mit Claude, extrahiert Probleme/Maßnahmen/Sentiment,
 * speichert alles in spiritus_transcripts + spiritus_extractions.
 * 
 * Deploy: supabase functions deploy spiritus-analyze
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')  ?? '';
const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

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

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }

  try {
    const body = await req.json();
    const { transcript, standortId, standortName, callDate, callType, durationMin } = body;

    if (!transcript || transcript.length < 20) {
      return json({ error: 'Transkript zu kurz oder leer' }, 400);
    }

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

    if (!claudeResp.ok) {
      const err = await claudeResp.text();
      throw new Error('Claude API Fehler: ' + err);
    }

    const claudeData = await claudeResp.json();
    const rawText = claudeData.content?.[0]?.text || '';

    // Parse JSON from Claude
    let extracted: any = {};
    try {
      const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(clean);
    } catch (e) {
      throw new Error('KI-Antwort konnte nicht geparst werden: ' + rawText.slice(0, 200));
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
