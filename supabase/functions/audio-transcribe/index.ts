/**
 * Supabase Edge Function: audio-transcribe
 * Transkribiert Audio-Dateien via AssemblyAI (Speaker Diarization).
 * Ruft anschliessend spiritus-analyze auf fuer 8-Felder-Protokoll.
 *
 * Erwartet: { filePath, standortId?, standortName?, callDate, callType,
 *             durationMin?, gespraechsKontext?, lieferantName?,
 *             akquiseKontaktName?, akquiseKontaktFirma?, akquiseKontaktOrt?, thema? }
 *
 * filePath = Pfad in Supabase Storage Bucket 'documents' (z.B. spiritus/123_audio.mp3)
 *
 * API Usage Logging: Jeder AssemblyAI-Call wird in api_usage_log protokolliert.
 *
 * Deploy: supabase functions deploy audio-transcribe
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ASSEMBLYAI_KEY = Deno.env.get('ASSEMBLYAI_API_KEY') ?? '';

const ALLOWED_ORIGINS = ['https://cockpit.vitbikes.de', 'http://localhost:3000'];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

async function verifyJwt(req: Request): Promise<{ user_id: string } | null> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;
  return { user_id: user.id };
}

let _cors: Record<string, string> = {};

async function logApiUsage(sb: any, params: {
  edge_function: string; modul: string; provider: string; model: string;
  input_tokens: number; output_tokens: number; duration_ms: number;
  success: boolean; standort_id?: string; error_message?: string;
}) {
  try {
    await sb.from('api_usage_log').insert({
      edge_function: params.edge_function,
      modul: params.modul,
      provider: params.provider,
      model: params.model,
      input_tokens: params.input_tokens,
      output_tokens: params.output_tokens,
      estimated_cost_usd: 0, // AssemblyAI rechnet nach Minuten, nicht Tokens
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
    return json({ error: 'Nicht authentifiziert' }, 401);
  }

  if (!ASSEMBLYAI_KEY) {
    return json({ error: 'ASSEMBLYAI_API_KEY nicht konfiguriert' }, 500);
  }

  try {
    const body = await req.json();
    const {
      filePath, standortId, standortName, callDate, callType, durationMin,
      gespraechsKontext, lieferantName, akquiseKontaktName, akquiseKontaktFirma,
      akquiseKontaktOrt, thema,
    } = body;

    if (!filePath) {
      return json({ error: 'filePath ist Pflicht' }, 400);
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const t0 = Date.now();

    // 1. Audio aus Storage holen
    const { data: fileData, error: dlError } = await sb.storage
      .from('documents')
      .download(filePath);

    if (dlError || !fileData) {
      return json({ error: 'Audio-Datei nicht gefunden: ' + (dlError?.message || 'unbekannt') }, 404);
    }

    const audioBytes = await fileData.arrayBuffer();

    // 2. Audio an AssemblyAI hochladen
    const uploadResp = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: { Authorization: ASSEMBLYAI_KEY },
      body: new Uint8Array(audioBytes),
    });

    if (!uploadResp.ok) {
      const err = await uploadResp.text();
      await logApiUsage(sb, {
        edge_function: 'audio-transcribe', modul: 'spiritus', provider: 'assemblyai',
        model: 'best', input_tokens: 0, output_tokens: 0,
        duration_ms: Date.now() - t0, success: false, standort_id: standortId,
        error_message: 'Upload fehlgeschlagen: ' + err.slice(0, 500),
      });
      throw new Error('AssemblyAI Upload fehlgeschlagen: ' + err);
    }

    const { upload_url } = await uploadResp.json();

    // 3. Transkription mit Speaker Diarization starten
    const transcriptResp = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        Authorization: ASSEMBLYAI_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: 'de',
        speaker_labels: true,
      }),
    });

    if (!transcriptResp.ok) {
      const err = await transcriptResp.text();
      throw new Error('AssemblyAI Transkription starten fehlgeschlagen: ' + err);
    }

    const { id: transcriptId } = await transcriptResp.json();

    // 4. Polling bis fertig (max 10 Minuten)
    const maxWait = 600_000;
    const pollInterval = 4_000;
    let elapsed = 0;
    let result: any = null;

    while (elapsed < maxWait) {
      await new Promise(r => setTimeout(r, pollInterval));
      elapsed += pollInterval;

      const pollResp = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { Authorization: ASSEMBLYAI_KEY },
      });
      result = await pollResp.json();

      if (result.status === 'completed') break;
      if (result.status === 'error') {
        throw new Error('AssemblyAI Fehler: ' + (result.error || 'unbekannt'));
      }
    }

    if (!result || result.status !== 'completed') {
      throw new Error('AssemblyAI Timeout nach ' + Math.round(elapsed / 1000) + 's');
    }

    const duration_ms = Date.now() - t0;

    // 5. Transkript mit Sprecher-Labels formatieren
    let transcript = '';
    if (result.utterances && result.utterances.length > 0) {
      transcript = result.utterances.map((u: any) =>
        `Sprecher ${u.speaker}: ${u.text}`
      ).join('\n');
    } else {
      transcript = result.text || '';
    }

    // Log erfolgreiche Transkription
    const audioDurationMin = result.audio_duration ? Math.round(result.audio_duration / 60) : (durationMin || 0);
    const estimatedCost = (result.audio_duration || 0) / 60 * 0.015; // $0.015/Min
    await logApiUsage(sb, {
      edge_function: 'audio-transcribe', modul: 'spiritus', provider: 'assemblyai',
      model: 'best', input_tokens: Math.round(result.audio_duration || 0),
      output_tokens: (transcript.length || 0),
      duration_ms, success: true, standort_id: standortId,
    });

    // 6. spiritus-analyze aufrufen (Chain)
    const analyzeResp = await fetch(`${SUPABASE_URL}/functions/v1/spiritus-analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${req.headers.get('authorization')?.replace('Bearer ', '') || ''}`,
      },
      body: JSON.stringify({
        transcript,
        standortId,
        standortName,
        callDate,
        callType,
        durationMin: audioDurationMin || durationMin,
        gespraechsKontext: gespraechsKontext || 'partner',
        lieferantName,
        akquiseKontaktName,
        akquiseKontaktFirma,
        akquiseKontaktOrt,
        thema,
      }),
    });

    const analyzeResult = await analyzeResp.json();

    if (!analyzeResp.ok) {
      return json({
        error: 'Transkription OK, aber Analyse fehlgeschlagen: ' + (analyzeResult.error || 'unbekannt'),
        transcript, // Transkript trotzdem zurueckgeben
        audioDurationMin,
      }, 500);
    }

    return json({
      success: true,
      transcript,
      audioDurationMin,
      speakerCount: result.utterances ? new Set(result.utterances.map((u: any) => u.speaker)).size : 0,
      ...analyzeResult,
    });

  } catch (e: any) {
    console.error('audio-transcribe:', e);
    return json({ error: e.message }, 500);
  }
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ..._cors, 'Content-Type': 'application/json' },
  });
}
