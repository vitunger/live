import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const userSb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userSb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
    const { data: profile } = await sb.from('users').select('is_hq').eq('id', user.id).single();
    if (!profile?.is_hq) return new Response(JSON.stringify({ error: 'HQ only' }), { status: 403, headers: CORS });

    const body = await req.json();
    const action = body.action;

    if (action === 'analyze') {
      const errorId = body.error_id;
      const { data: err } = await sb.from('error_log').select('*').eq('id', errorId).single();
      if (!err) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: CORS });

      let sourceCode = '';
      const ghToken = Deno.env.get('GITHUB_TOKEN') || '';
      if (err.source_file && ghToken) {
        let repoPath = err.source_file.replace(/^\/portal\//, 'portal/').replace(/\?v=.*$/, '');
        try {
          const ghResp = await fetch(
            `https://api.github.com/repos/vitunger/live/contents/${repoPath}`,
            { headers: { Authorization: `token ${ghToken}`, Accept: 'application/vnd.github.v3+json' } }
          );
          if (ghResp.ok) {
            const ghData = await ghResp.json();
            const decoded = new TextDecoder().decode(Uint8Array.from(atob(ghData.content.replace(/\n/g, '')), c => c.charCodeAt(0)));
            const lines = decoded.split('\n');
            const lineNum = (err.line_number || 1) - 1;
            const start = Math.max(0, lineNum - 40);
            const end = Math.min(lines.length, lineNum + 40);
            sourceCode = lines.slice(start, end).map((l: string, i: number) =>
              `${start + i + 1}${start + i === lineNum ? ' <--ERROR' : '         '}: ${l}`
            ).join('\n');
          }
        } catch (_) {}
      }

      const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Du analysierst einen JavaScript-Fehler im vit:bikes Partner Portal und schlägst einen konkreten Code-Fix vor.

FEHLER:
- Meldung: ${err.message}
- Datei: ${err.source_file || 'unbekannt'}
- Zeile: ${err.line_number || '?'}
- Haeufigkeit: ${err.count}x
- Stack: ${(err.stack || '').substring(0, 500)}

${sourceCode ? `QUELLCODE (+-40 Zeilen um Fehlerzeile):\n\`\`\`javascript\n${sourceCode}\n\`\`\`` : ''}

Antworte NUR als JSON ohne Markdown-Wrapper:
{
  "root_cause": "Kurze Erklaerung warum der Fehler auftritt (1-2 Saetze)",
  "fix_vorschlag": "Was genau geaendert werden muss (1-2 Saetze)",
  "fix_datei": "portal/views/dateiname.js oder null wenn unklar",
  "fix_alt": "Der exakte String der ersetzt werden soll (oder null wenn kein einfacher str_replace moeglich)",
  "fix_neu": "Der Ersatz-String (oder null)",
  "confidence": 85
}`
          }]
        })
      });
      const claudeData = await claudeResp.json();
      let ki: any = {};
      try { ki = JSON.parse((claudeData.content?.[0]?.text || '{}').replace(/```json|```/g, '').trim()); } catch (_) {}

      await sb.from('error_log').update({
        ki_analysiert: true,
        ki_root_cause: ki.root_cause,
        ki_fix_vorschlag: ki.fix_vorschlag,
        ki_fix_datei: ki.fix_datei,
        ki_fix_alt: ki.fix_alt,
        ki_fix_neu: ki.fix_neu,
        ki_confidence: ki.confidence || 0,
        fix_status: ki.fix_alt ? 'offen' : 'manuell',
      }).eq('id', errorId);

      return new Response(JSON.stringify({ ok: true, analysis: ki }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (action === 'deploy') {
      const errorId = body.error_id;
      const { data: err } = await sb.from('error_log').select('*').eq('id', errorId).single();
      if (!err?.ki_fix_datei || !err?.ki_fix_alt || !err?.ki_fix_neu)
        return new Response(JSON.stringify({ error: 'Kein deployable Fix vorhanden' }), { status: 400, headers: CORS });

      const ghToken = Deno.env.get('GITHUB_TOKEN')!;
      const ghResp = await fetch(`https://api.github.com/repos/vitunger/live/contents/${err.ki_fix_datei}`,
        { headers: { Authorization: `token ${ghToken}`, Accept: 'application/vnd.github.v3+json' } });
      if (!ghResp.ok) return new Response(JSON.stringify({ error: 'GitHub fetch failed' }), { status: 500, headers: CORS });
      const ghData = await ghResp.json();
      const currentContent = new TextDecoder().decode(Uint8Array.from(atob(ghData.content.replace(/\n/g, '')), c => c.charCodeAt(0)));

      if (!currentContent.includes(err.ki_fix_alt))
        return new Response(JSON.stringify({ error: 'Fix-Pattern nicht mehr im Code (bereits gepatcht?)' }), { status: 409, headers: CORS });

      const newContent = currentContent.replace(err.ki_fix_alt, err.ki_fix_neu);
      const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(newContent)));
      const pushResp = await fetch(`https://api.github.com/repos/vitunger/live/contents/${err.ki_fix_datei}`, {
        method: 'PUT',
        headers: { Authorization: `token ${ghToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `fix(auto): ${err.message.substring(0, 80)} [self-heal]`,
          content: encoded,
          sha: ghData.sha
        })
      });
      if (!pushResp.ok) return new Response(JSON.stringify({ error: 'GitHub push failed' }), { status: 500, headers: CORS });
      const pushData = await pushResp.json();

      await sb.from('error_log').update({
        fix_status: 'deployed',
        fix_deployed_at: new Date().toISOString(),
        fix_deployed_by: user.id,
        fix_commit_sha: pushData.commit?.sha,
      }).eq('id', errorId);

      return new Response(JSON.stringify({ ok: true, commit: pushData.commit?.sha }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: CORS });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
});
