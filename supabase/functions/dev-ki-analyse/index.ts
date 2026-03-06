/**
 * Supabase Edge Function: dev-ki-analyse
 * Modes: 'prioritize' | 'release_notes'
 *
 * Release Notes Mode:
 *   - Bekommt: submissions, git_commits, claude_md
 *   - Gibt zurück: { release_notes, titel }
 *
 * Prioritize Mode:
 *   - Bekommt: (laden aus DB)
 *   - Gibt zurück: { success, zusammenfassung, empfehlung[], quick_wins[] }
 *
 * API Usage Logging: Jeder Claude-API-Call wird in api_usage_log protokolliert.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')  ?? '';
const SUPABASE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    const inputCostPer1M = 3.0;  // Sonnet: $3/1M input
    const outputCostPer1M = 15.0; // Sonnet: $15/1M output
    const estimated_cost_usd = (params.input_tokens / 1_000_000) * inputCostPer1M
                             + (params.output_tokens / 1_000_000) * outputCostPer1M;

    await admin.from('api_usage_log').insert({
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
    console.error('api_usage_log insert failed:', e);
  }
}

// ─── RELEASE NOTES PROMPT ──────────────────────────────────────────────────

function buildReleasePrompt(context: string, count: number): string {
  return `Du bist der technische Autor für das vit:bikes Partner Portal (cockpit.vitbikes.de) – eine All-in-one Franchise-Management-Software für Fahrradhändler.

Schreibe eine professionelle, motivierende Release-Note für die Franchise-Partner (Fahrradhändler, keine Entwickler).

TONALITÄT:
- Direkt, positiv, auf Augenhöhe
- Du-Form
- Kein Tech-Jargon – übersetze technische Begriffe in Nutzer-Sprache
- Zeige den NUTZEN, nicht die Technik
- Kurze Sätze, keine Marketingfloskeln

FORMAT (Markdown, exakt so):
## Was ist neu?
[2-3 Sätze übergreifende Zusammenfassung was sich verändert hat]

### ✨ Neue Features
- **[Feature-Name]:** [Was es macht, warum es nützlich ist – 1-2 Sätze]
(nur echte neue Features, keine Bugfixes hier)

### 🛠 Verbesserungen & Fixes
- **[Bereich]:** [Was wurde verbessert/behoben – 1-2 Sätze]
(Bug-Fixes, Performance-Verbesserungen, UI-Tweaks)

### 💡 Tipp der Woche
[Ein konkreter Tipp wie Partner das neue Feature optimal nutzen – praxisnah]

WICHTIG:
- Nur Änderungen aufnehmen die für Partner sichtbar/relevant sind
- Interne Refactorings, Cache-Busts, CLAUDE.md Updates NICHT erwähnen
- Wenn eine Änderung unklar ist, lieber weglassen
- Maximal 5 Punkte pro Sektion
- Gib auch einen prägnanten Titel vor (Format: "Release [Datum]: [Thema]")

KONTEXT DER ÄNDERUNGEN (${count} Quellen):
${context}

Antworte NUR mit dem Markdown-Text + einer ersten Zeile "TITEL: [dein Titel]". Kein weiterer Kommentar.`;
}

// ─── PRIORITIZE PROMPT ─────────────────────────────────────────────────────

function buildPrioritizePrompt(submissions: unknown[]): string {
  const list = submissions.map((s: any, i: number) => {
    const ki = s.dev_ki_analysen?.[0] ?? {};
    return `${i+1}. [${s.id}] "${s.titel || s.beschreibung?.slice(0,60) || 'Ohne Titel'}"
   Typ: ${s.ki_typ || '?'} | Status: ${s.status || '?'} | Aufwand: ${ki.aufwand_schaetzung || '?'}
   Vision-Fit: ${ki.vision_fit_score || '?'}/100 | Machbarkeit: ${ki.machbarkeit || '?'}
   Beschreibung: ${(s.beschreibung || '').slice(0, 150)}`;
  }).join('\n\n');

  return `Du priorisierst Features/Bugs für das vit:bikes Partner Portal (Franchise-Software für Fahrradhändler).

Kriterien (gewichtet):
1. Nutzer-Impact (40%) – wie viele Partner profitieren davon?
2. Vision-Fit (25%) – passt es zur "Allzweckwaffe"-Vision?
3. Aufwand-Nutzen (20%) – S/M = bevorzugt
4. Dringlichkeit (15%) – Bugs vor Features

Submissions:
${list}

Antworte NUR als JSON (kein Markdown):
{
  "zusammenfassung": "2-3 Sätze Empfehlung was als nächstes angegangen werden soll",
  "empfehlung": [
    {
      "rang": 1,
      "submission_id": "uuid",
      "titel": "...",
      "empfohlene_aktion": "sofort_starten|einplanen|spaeter|pruefen",
      "geschaetzter_impact": "hoch|mittel|niedrig",
      "priority_score": 0-100,
      "begruendung": "1 Satz Begründung"
    }
  ],
  "quick_wins": [
    { "submission_id": "uuid", "titel": "...", "grund": "Warum Quick Win" }
  ]
}`;
}

// ─── MAIN HANDLER ──────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const body = await req.json();
    const { mode, context, count, git_commits, submissions, claude_md } = body;

    // ── Release Notes Mode ──────────────────────────────────────────────
    if (mode === 'release_notes') {
      // Build context from all sources
      let fullContext = context || '';

      // If frontend sent structured data, assemble it here too
      if (!fullContext && (git_commits || submissions || claude_md)) {
        const parts: string[] = [];
        if (git_commits) parts.push('GIT COMMITS:\n' + git_commits);
        if (submissions) parts.push('SUBMISSIONS:\n' + submissions);
        if (claude_md)   parts.push('CLAUDE.MD ÄNDERUNGEN:\n' + claude_md);
        fullContext = parts.join('\n\n---\n\n');
      }

      if (!fullContext.trim()) {
        return json({ error: 'Kein Kontext übergeben' }, 400);
      }

      const prompt = buildReleasePrompt(fullContext, count ?? 0);
      const t0 = Date.now();

      const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const duration_ms = Date.now() - t0;

      if (!claudeResp.ok) {
        const err = await claudeResp.text();
        await logApiUsage(admin, {
          edge_function: 'dev-ki-analyse', modul: 'release_notes', provider: 'anthropic',
          model: 'claude-sonnet-4-20250514', input_tokens: 0, output_tokens: 0,
          duration_ms, success: false, error_message: err.slice(0, 500),
        });
        throw new Error('Claude API Fehler: ' + err);
      }

      const claudeData: any = await claudeResp.json();
      const rawText: string = claudeData.content?.[0]?.text ?? '';

      // Log usage
      await logApiUsage(admin, {
        edge_function: 'dev-ki-analyse', modul: 'release_notes', provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        input_tokens: claudeData.usage?.input_tokens || 0,
        output_tokens: claudeData.usage?.output_tokens || 0,
        duration_ms, success: true,
      });

      // Extract titel from first line
      let titel = '';
      let release_notes = rawText;
      const titelMatch = rawText.match(/^TITEL:\s*(.+)/m);
      if (titelMatch) {
        titel = titelMatch[1].trim();
        release_notes = rawText.replace(/^TITEL:\s*.+\n?/m, '').trim();
      }

      return json({ release_notes, titel, success: true });
    }

    // ── Prioritize Mode ─────────────────────────────────────────────────
    if (mode === 'prioritize') {
      const { data: subs, error } = await admin
        .from('dev_submissions')
        .select('id, titel, beschreibung, status, ki_typ, modul_key, dev_ki_analysen(aufwand_schaetzung, machbarkeit, vision_fit_score)')
        .not('status', 'in', '(abgelehnt,geparkt,ausgerollt)')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      if (!subs || subs.length === 0) {
        return json({ success: false, error: 'Keine offenen Submissions gefunden' });
      }

      const prompt = buildPrioritizePrompt(subs);
      const t0 = Date.now();

      const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const duration_ms = Date.now() - t0;

      if (!claudeResp.ok) {
        await logApiUsage(admin, {
          edge_function: 'dev-ki-analyse', modul: 'prioritize', provider: 'anthropic',
          model: 'claude-sonnet-4-20250514', input_tokens: 0, output_tokens: 0,
          duration_ms, success: false, error_message: 'Claude API Fehler',
        });
        throw new Error('Claude API Fehler');
      }

      const claudeData: any = await claudeResp.json();
      const raw: string = claudeData.content?.[0]?.text ?? '';

      // Log usage
      await logApiUsage(admin, {
        edge_function: 'dev-ki-analyse', modul: 'prioritize', provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        input_tokens: claudeData.usage?.input_tokens || 0,
        output_tokens: claudeData.usage?.output_tokens || 0,
        duration_ms, success: true,
      });

      // Strip markdown fences
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      return json({ success: true, ...parsed });
    }

    return json({ error: 'Unbekannter mode: ' + mode }, 400);

  } catch (err: any) {
    console.error('dev-ki-analyse error:', err);
    return json({ error: err.message || 'Unbekannter Fehler' }, 500);
  }
}
