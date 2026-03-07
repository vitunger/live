/**
 * dev-selfheal.js – Self-Healing Cockpit
 * KI analysiert JS-Fehler und deployed Fixes automatisch (mit HQ-Bestätigung)
 */

const SELFHEAL_VERSION = 1;
const SURL = window.SUPABASE_URL || 'https://lwwagbkxeofahhwebkab.supabase.co';

// ── Global Error Capture ──
(function installErrorCapture() {
  if (window._selfhealInstalled) return;
  window._selfhealInstalled = true;

  async function logError(message, source, lineno, colno, stack) {
    try {
      const sb = _sb();
      const user = _sbUser();
      const profile = _sbProfile();
      if (!sb || !message) return;

      // Deduplicate: upsert by message + source_file
      const cleanMsg = (message || '').substring(0, 500);
      const cleanSrc = (source || '').replace(/\?v=[\d]+/, '').substring(0, 200);

      // Try upsert (increment count)
      const { data: existing } = await sb.from('error_log')
        .select('id, count')
        .eq('message', cleanMsg)
        .eq('source_file', cleanSrc)
        .maybeSingle();

      if (existing) {
        await sb.from('error_log').update({
          count: (existing.count || 1) + 1,
          last_seen_at: new Date().toISOString()
        }).eq('id', existing.id);
      } else {
        await sb.from('error_log').insert({
          message: cleanMsg,
          source_file: cleanSrc,
          line_number: lineno || null,
          col_number: colno || null,
          stack: (stack || '').substring(0, 2000),
          url: window.location.pathname,
          user_agent: navigator.userAgent.substring(0, 200),
          user_id: user ? user.id : null,
          standort_id: profile ? profile.standort_id : null,
          module: cleanSrc.split('/').pop()?.replace('.js','') || null,
        });
      }
    } catch (_) { /* silent – don't error while logging errors */ }
  }

  // Catch unhandled JS errors
  window.addEventListener('error', (e) => {
    logError(e.message, e.filename, e.lineno, e.colno, e.error?.stack || '');
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason?.message || String(e.reason) || 'Unhandled Promise rejection';
    logError(msg, '', 0, 0, e.reason?.stack || '');
  });

  // Optionally wrap console.error to also capture those
  const _origError = console.error.bind(console);
  console.error = function(...args) {
    _origError(...args);
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a).substring(0,200) : String(a)).join(' ').substring(0,500);
    logError('[console.error] ' + msg, '', 0, 0, '');
  };
})();

// ── Render Self-Heal View ──
async function renderSelfHeal() {
  const el = document.getElementById('view-selfheal');
  if (!el) return;
  if (!window.sbProfile?.is_hq) {
    el.innerHTML = '<div class="p-8 text-center text-gray-400">Nur für HQ-Nutzer.</div>';
    return;
  }

  el.innerHTML = `
    <div class="p-4 md:p-6">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-xl">🔧</div>
        <div>
          <h1 class="text-lg font-bold text-gray-100">Self-Healing Cockpit</h1>
          <p class="text-xs text-gray-400">KI analysiert JS-Fehler und schlägt Fixes vor – du bestätigst den Deploy.</p>
        </div>
        <button onclick="shLoadErrors()" class="ml-auto px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-xs rounded-lg text-gray-200 transition">↻ Laden</button>
      </div>

      <!-- Filter bar -->
      <div class="flex gap-2 mb-4 flex-wrap">
        <button onclick="shFilter('all')" id="shBtn-all" class="px-3 py-1 text-xs rounded-full bg-orange-500 text-white">Alle</button>
        <button onclick="shFilter('offen')" id="shBtn-offen" class="px-3 py-1 text-xs rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600">Offen</button>
        <button onclick="shFilter('deployed')" id="shBtn-deployed" class="px-3 py-1 text-xs rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600">Deployed ✅</button>
        <button onclick="shFilter('manuell')" id="shBtn-manuell" class="px-3 py-1 text-xs rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600">Manuell 🔨</button>
      </div>

      <div id="shErrorList" class="space-y-3">
        <div class="text-center text-gray-500 py-12">
          <div class="text-3xl mb-2">🔍</div>
          <p class="text-sm">Klick auf "Laden" um Fehler zu laden.</p>
        </div>
      </div>
    </div>
  `;

  window.shLoadErrors();
}

window._shErrors = [];
window._shFilter = 'all';

window.shFilter = function(f) {
  window._shFilter = f;
  ['all','offen','deployed','manuell'].forEach(k => {
    const btn = document.getElementById('shBtn-' + k);
    if (btn) btn.className = k === f
      ? 'px-3 py-1 text-xs rounded-full bg-orange-500 text-white'
      : 'px-3 py-1 text-xs rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600';
  });
  window.shRenderList();
};

window.shLoadErrors = async function() {
  const listEl = document.getElementById('shErrorList');
  if (!listEl) return;
  listEl.innerHTML = '<div class="text-center text-gray-400 py-8">⏳ Lade Fehler...</div>';

  try {
    const { data, error } = await _sb().from('error_log')
      .select('*')
      .order('count', { ascending: false })
      .order('last_seen_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    window._shErrors = data || [];
    window.shRenderList();
  } catch (e) {
    if (listEl) listEl.innerHTML = `<div class="text-red-400 text-sm p-4">Fehler beim Laden: ${_escH(e.message)}</div>`;
  }
};

window.shRenderList = function() {
  const listEl = document.getElementById('shErrorList');
  if (!listEl) return;

  let errors = window._shErrors;
  if (window._shFilter !== 'all') {
    errors = errors.filter(e => e.fix_status === window._shFilter);
  }

  if (!errors.length) {
    listEl.innerHTML = '<div class="text-center text-gray-500 py-12 text-sm">Keine Fehler gefunden 🎉</div>';
    return;
  }

  listEl.innerHTML = errors.map(e => {
    const statusBadge = {
      'offen': '<span class="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Offen</span>',
      'deployed': '<span class="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">✅ Deployed</span>',
      'manuell': '<span class="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">🔨 Manuell</span>',
      'rejected': '<span class="px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-400">Abgelehnt</span>',
    }[e.fix_status] || '<span class="px-2 py-0.5 rounded-full text-xs bg-gray-600 text-gray-300">—</span>';

    const confColor = e.ki_confidence >= 80 ? 'text-green-400' : e.ki_confidence >= 50 ? 'text-yellow-400' : 'text-red-400';
    const hasDeployableFix = e.ki_fix_alt && e.ki_fix_neu && e.fix_status !== 'deployed';

    return `
      <div class="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600 transition" id="shCard-${e.id}">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 font-mono">${_escH(e.count)}×</span>
              ${statusBadge}
              ${e.ki_analysiert && e.ki_confidence ? `<span class="text-xs ${confColor}">${e.ki_confidence}% Konfidenz</span>` : ''}
              <span class="text-xs text-gray-500">${e.module || '?'} · ${e.line_number ? 'L'+e.line_number : ''}</span>
            </div>
            <p class="text-sm text-gray-200 font-mono break-all">${_escH((e.message||'').substring(0,120))}</p>
            ${e.source_file ? `<p class="text-xs text-gray-500 mt-0.5 truncate">${_escH(e.source_file)}</p>` : ''}
          </div>
        </div>

        ${e.ki_root_cause ? `
          <div class="mt-3 pt-3 border-t border-gray-700/50">
            <p class="text-xs text-gray-400 mb-1">🔍 <strong class="text-gray-300">Root Cause:</strong> ${_escH(e.ki_root_cause)}</p>
            ${e.ki_fix_vorschlag ? `<p class="text-xs text-gray-400">💡 <strong class="text-gray-300">Fix:</strong> ${_escH(e.ki_fix_vorschlag)}</p>` : ''}
            ${e.ki_fix_alt ? `
              <details class="mt-2">
                <summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-300">Code-Diff anzeigen</summary>
                <div class="mt-2 space-y-1">
                  <div class="bg-red-900/20 border border-red-800/30 rounded p-2">
                    <p class="text-xs text-red-400 font-mono mb-1">− Alt (${_escH(e.ki_fix_datei||'')})</p>
                    <pre class="text-xs text-red-300 whitespace-pre-wrap break-all">${_escH((e.ki_fix_alt||'').substring(0,400))}</pre>
                  </div>
                  <div class="bg-green-900/20 border border-green-800/30 rounded p-2">
                    <p class="text-xs text-green-400 font-mono mb-1">+ Neu</p>
                    <pre class="text-xs text-green-300 whitespace-pre-wrap break-all">${_escH((e.ki_fix_neu||'').substring(0,400))}</pre>
                  </div>
                </div>
              </details>
            ` : ''}
            ${e.fix_commit_sha ? `<p class="text-xs text-gray-500 mt-1">Commit: <code>${e.fix_commit_sha.substring(0,8)}</code></p>` : ''}
          </div>
        ` : ''}

        <!-- Actions -->
        <div class="flex gap-2 mt-3 flex-wrap">
          ${!e.ki_analysiert ? `
            <button onclick="shAnalyze('${e.id}')" class="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs rounded-lg transition font-medium">
              🤖 KI analysieren
            </button>
          ` : `
            <button onclick="shAnalyze('${e.id}')" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition">
              ↻ Neu analysieren
            </button>
          `}
          ${hasDeployableFix ? `
            <button onclick="shDeploy('${e.id}')" class="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs rounded-lg transition font-medium">
              🚀 Fix deployen
            </button>
          ` : ''}
          ${e.fix_status !== 'rejected' && e.fix_status !== 'deployed' ? `
            <button onclick="shReject('${e.id}')" class="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-gray-500 text-xs rounded-lg transition">
              ✕ Ignorieren
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
};

window.shAnalyze = async function(id) {
  const card = document.getElementById('shCard-' + id);
  if (card) {
    const btn = card.querySelector('button');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Analysiere...'; }
  }
  try {
    const session = await _sb().auth.getSession();
    const token = session?.data?.session?.access_token;
    const resp = await fetch(SURL + '/functions/v1/analyze-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'apikey': window.SUPABASE_ANON_KEY },
      body: JSON.stringify({ action: 'analyze', error_id: id })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Analyse fehlgeschlagen');
    _showToast('KI-Analyse abgeschlossen (' + (data.analysis?.confidence || '?') + '% Konfidenz)', 'success');
    await window.shLoadErrors();
  } catch (e) {
    _showToast('Analyse fehlgeschlagen: ' + e.message, 'error');
    if (card) { const btn = card.querySelector('button'); if (btn) { btn.disabled = false; btn.textContent = '🤖 KI analysieren'; } }
  }
};

window.shDeploy = async function(id) {
  const err = window._shErrors.find(e => e.id === id);
  if (!err) return;
  const confirmed = confirm(
    'Fix deployen?\n\nDatei: ' + (err.ki_fix_datei || '?') + '\n\n' +
    'Vercel baut danach automatisch neu. Bist du sicher?'
  );
  if (!confirmed) return;

  try {
    const card = document.getElementById('shCard-' + id);
    if (card) card.style.opacity = '0.5';
    const session = await _sb().auth.getSession();
    const token = session?.data?.session?.access_token;
    const resp = await fetch(SURL + '/functions/v1/analyze-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'apikey': window.SUPABASE_ANON_KEY },
      body: JSON.stringify({ action: 'deploy', error_id: id })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Deploy fehlgeschlagen');
    _showToast('Fix deployed! Commit: ' + (data.commit || '').substring(0,8) + ' – Vercel baut neu.', 'success');
    await window.shLoadErrors();
  } catch (e) {
    _showToast('Deploy fehlgeschlagen: ' + e.message, 'error');
    const card = document.getElementById('shCard-' + id);
    if (card) card.style.opacity = '1';
  }
};

window.shReject = async function(id) {
  await _sb().from('error_log').update({ fix_status: 'rejected' }).eq('id', id);
  window._shErrors = window._shErrors.map(e => e.id === id ? {...e, fix_status: 'rejected'} : e);
  window.shRenderList();
};

window.renderSelfHeal = renderSelfHeal;
