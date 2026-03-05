// ============================================================
// einkauf-v2.js – Einkauf-Modul (DB-gestützt) v5
// Tabs: Lieferanten | Strategien
// HQ: alles lesen + bearbeiten
// Partner: eigene Strategie lesen, Kernsortiment-Lieferanten lesen
// ============================================================

const EINKAUF_V2_VERSION = 5;

const STATUS_CONFIG = {
  'Zentrale Konditionen sind vertraglich fixiert': { farbe: 'green',  icon: '✅', kurz: 'Fixiert' },
  'Vertrag in Finalisierung':                      { farbe: 'blue',   icon: '🔵', kurz: 'Finalisierung' },
  'In Verhandlung':                                { farbe: 'orange', icon: '🟡', kurz: 'Verhandlung' },
  'Kontakt aufgenommen':                           { farbe: 'orange', icon: '🟡', kurz: 'Kontakt' },
  'Kontaktaufnahme ausstehend':                    { farbe: 'gray',   icon: '⚪', kurz: 'Ausstehend' },
  'Volumen nicht ausreichend für zentrale Verhandlung': { farbe: 'gray', icon: '⚪', kurz: 'Volumen' },
  'Verhandlung gescheitert':                       { farbe: 'red',    icon: '❌', kurz: 'Gescheitert' },
  'Lieferant läuft aus':                           { farbe: 'red',    icon: '🔴', kurz: 'Läuft aus' },
};

const IHT_CONFIG = {
  'wird über IHT reguliert':    { farbe: 'green',  icon: '✅' },
  'im Onboarding':              { farbe: 'blue',   icon: '🔵' },
  'in Verhandlung':             { farbe: 'orange', icon: '🟡' },
  'IHT aktuell nicht geplant':  { farbe: 'gray',   icon: '⚪' },
  'IHT abgelehnt':              { farbe: 'red',    icon: '❌' },
  'Kontaktaufnahme ausstehend': { farbe: 'gray',   icon: '⚪' },
};

const _esc = s => String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function statusBadge(status, map) {
  const cfg = map[status] || { farbe: 'gray', icon: '⚪', kurz: status };
  const farbMap = {
    green:  'bg-green-100 text-green-700 border-green-300',
    blue:   'bg-blue-100 text-blue-700 border-blue-300',
    orange: 'bg-orange-100 text-orange-700 border-orange-300',
    gray:   'bg-gray-100 text-gray-500 border-gray-300',
    red:    'bg-red-100 text-red-600 border-red-300',
  };
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${farbMap[cfg.farbe]||farbMap.gray}">${cfg.icon} ${_esc(cfg.kurz||status)}</span>`;
}

const INP = 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500';
const SEL = 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500';
const LBL = 'text-xs text-gray-500 block mb-1 font-medium';

// ── Haupt-Render ─────────────────────────────────────────────
async function renderEinkaufV2(startTab) {
  const isHQ = window.sbProfile?.is_hq === true;
  const hqView = document.getElementById('hqEinkaufView');
  const isHQView = hqView && hqView.style.display !== 'none';
  const container = isHQView
    ? document.getElementById('view-einkauf-hq')
    : document.getElementById('view-einkauf-partner');
  if (!container) { console.warn('[einkauf-v2] Kein Container, isHQView=', isHQView); return; }

  const activeTab = startTab || 'lieferanten';

  const tabBtn = (id, label, icon) => {
    const active = activeTab === id;
    return `<button onclick="window.einkaufV2ShowTab('${id}')"
      class="ek2-tab whitespace-nowrap py-3 px-4 border-b-2 font-semibold text-sm transition-colors ${active ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-gray-700'}"
      data-tab="${id}">${icon} ${label}</button>`;
  };

  container.innerHTML = `
    <div class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="h1-headline text-gray-800 mb-1">Einkauf</h1>
          <p class="text-gray-500 text-sm">${isHQ ? 'HQ-Cockpit – Lieferanten & Standort-Strategien' : 'Eure Lieferanten & Einkaufsstrategie'}</p>
        </div>
        <div id="ek2-header-actions"></div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200 mb-6">
        <nav class="-mb-px flex space-x-1">
          ${tabBtn('lieferanten', 'Lieferanten', '📋')}
          ${tabBtn('strategien', 'Strategien', '🎯')}
          ${tabBtn('performance', 'Performance-Abfrage', '📊')}
        </nav>
      </div>

      <!-- Tab-Inhalte -->
      <div id="ek2-tab-lieferanten" class="ek2-tab-content" ${activeTab !== 'lieferanten' ? 'style="display:none"' : ''}></div>
      <div id="ek2-tab-strategien" class="ek2-tab-content" ${activeTab !== 'strategien' ? 'style="display:none"' : ''}></div>
      <div id="ek2-tab-performance" class="ek2-tab-content" ${activeTab !== 'performance' ? 'style="display:none"' : ''}></div>
    </div>

    <!-- Lieferant Edit Modal -->
    ${isHQ ? `
    <div id="einkauf-modal" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
      <div class="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="einkauf-modal-title" class="text-lg font-semibold text-gray-800">Lieferant</h2>
          <button onclick="window.einkaufV2CloseModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div id="einkauf-modal-body" class="p-6"></div>
      </div>
    </div>

    <!-- Strategie Edit Modal -->
    <div id="strategie-modal" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center p-4">
      <div class="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="strategie-modal-title" class="text-lg font-semibold text-gray-800">Einkaufsstrategie</h2>
          <button onclick="window.strategieCloseModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div id="strategie-modal-body" class="p-6"></div>
      </div>
    </div>` : ''}
  `;

  // Initialen Tab rendern
  window.einkaufV2ShowTab(activeTab, isHQ);
}

// ── Tab-Switching ─────────────────────────────────────────────
window.einkaufV2ShowTab = function(tab, isHQOverride) {
  const isHQ = isHQOverride !== undefined ? isHQOverride : (window.sbProfile?.is_hq === true);

  // Tab-Buttons aktualisieren
  document.querySelectorAll('.ek2-tab').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.className = btn.className.replace(/border-orange-500 text-orange-500|border-transparent text-gray-500/g, '');
    btn.classList.add(...(active
      ? ['border-orange-500', 'text-orange-500']
      : ['border-transparent', 'text-gray-500']));
  });

  // Tab-Inhalte ein-/ausblenden
  document.querySelectorAll('.ek2-tab-content').forEach(el => el.style.display = 'none');
  const activeEl = document.getElementById(`ek2-tab-${tab}`);
  if (activeEl) activeEl.style.display = '';

  // Header-Actions updaten
  const actions = document.getElementById('ek2-header-actions');
  if (actions) {
    if (tab === 'lieferanten' && isHQ) {
      actions.innerHTML = `<button onclick="window.einkaufV2OpenEdit(null)"
        class="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Lieferant hinzufügen</button>`;
    } else {
      actions.innerHTML = '';
    }
  }

  // Inhalt laden (nur wenn leer)
  if (tab === 'lieferanten' && activeEl && !activeEl.dataset.loaded) {
    renderLieferantenTab(activeEl, isHQ);
    activeEl.dataset.loaded = '1';
  }
  if (tab === 'strategien' && activeEl && !activeEl.dataset.loaded) {
    renderStrategienTab(activeEl, isHQ);
    activeEl.dataset.loaded = '1';
  }
  if (tab === 'performance' && activeEl) {
    // Always re-render (live data)
    activeEl.innerHTML = '<div class="flex items-center justify-center py-16"><div class="text-center"><div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div><p class="text-gray-400 text-sm">Performance-Daten werden geladen\u2026</p></div></div>';
    if (isHQ) {
      window.renderHQPerf && window.renderHQPerf().then(function(html) {
        activeEl.innerHTML = html;
        // Rücklauf für alle Abfragen nachladen
        activeEl.querySelectorAll('[id^="hqPerfRuecklauf_"]').forEach(function(el) {
          window.loadHQPerfRuecklauf && window.loadHQPerfRuecklauf(el.id.replace('hqPerfRuecklauf_', ''));
        });
      }).catch(function(err) {
        activeEl.innerHTML = '<div class="vc p-8 text-center"><p class="text-red-400 text-sm">Fehler beim Laden: ' + (err.message || err) + '</p></div>';
        console.error('renderHQPerf error:', err);
      });
    } else {
      window.renderPerfPartner && window.renderPerfPartner().then(function(html) {
        activeEl.innerHTML = html;
      }).catch(function(err) {
        activeEl.innerHTML = '<div class="vc p-8 text-center"><p class="text-red-400 text-sm">Fehler beim Laden: ' + (err.message || err) + '</p></div>';
        console.error('renderPerfPartner error:', err);
      });
    }
  }
};

// ══════════════════════════════════════════════════════════════
// TAB 1: LIEFERANTEN
// ══════════════════════════════════════════════════════════════
function renderLieferantenTab(container, isHQ) {
  container.innerHTML = `
    <!-- Filter -->
    <div class="flex flex-wrap gap-3 mb-6">
      <div class="relative flex-1 min-w-48">
        <input id="einkauf-search" type="text" placeholder="Lieferant suchen…"
          class="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 pl-9 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-500"
          oninput="window.einkaufV2Filter()">
        <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
      </div>
      <select id="einkauf-filter-art" onchange="window.einkaufV2Filter()"
        class="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500">
        <option value="">Alle Kategorien</option>
        <option value="bike">🚲 Bikes</option>
        <option value="parts">🔧 Parts</option>
        <option value="Dienstleister">🤝 Dienstleister</option>
      </select>
      ${isHQ ? `
      <select id="einkauf-filter-status" onchange="window.einkaufV2Filter()"
        class="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500">
        <option value="">Alle Status</option>
        <option value="Zentrale Konditionen sind vertraglich fixiert">✅ Fixiert</option>
        <option value="Vertrag in Finalisierung">🔵 Finalisierung</option>
        <option value="In Verhandlung">🟡 In Verhandlung</option>
        <option value="Kontakt aufgenommen">🟡 Kontakt aufgenommen</option>
        <option value="Kontaktaufnahme ausstehend">⚪ Ausstehend</option>
        <option value="Verhandlung gescheitert">❌ Gescheitert</option>
        <option value="Lieferant läuft aus">🔴 Läuft aus</option>
      </select>
      <select id="einkauf-filter-kernsortiment" onchange="window.einkaufV2Filter()"
        class="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500">
        <option value="">Alle</option>
        <option value="kern">⭐ Kernsortiment</option>
        <option value="zusatz">➕ Zusatz</option>
        <option value="sonstige">○ Sonstige</option>
      </select>` : ''}
    </div>

    <!-- Stats (nur HQ) -->
    ${isHQ ? `<div id="einkauf-stats" class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"></div>` : ''}

    <!-- Tabelle -->
    <div class="vit-card rounded-xl overflow-hidden">
      <div id="einkauf-table-wrap" class="overflow-x-auto">
        <div class="flex items-center justify-center py-16">
          <div class="text-center">
            <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-gray-400 text-sm">Lieferanten werden geladen…</p>
          </div>
        </div>
      </div>
    </div>`;

  einkaufV2Load(isHQ);
}

let _einkaufAllData = [];

async function einkaufV2Load(isHQ) {
  const sb = window.sb;
  if (!sb) { setTimeout(() => einkaufV2Load(isHQ), 500); return; }

  let query = sb.from('lieferanten').select('*').order('art').order('lieferant');
  if (!isHQ) {
    query = query
      .eq('status_konditionen', 'Zentrale Konditionen sind vertraglich fixiert')
      .or('kernsortiment.eq.true,zusatz.eq.true');
  }

  const { data, error } = await query;
  if (error) {
    const wrap = document.getElementById('einkauf-table-wrap');
    if (wrap) wrap.innerHTML = `<div class="p-8 text-center text-red-500">Fehler: ${_esc(error.message)}</div>`;
    return;
  }

  _einkaufAllData = data || [];
  if (isHQ) einkaufV2RenderStats(_einkaufAllData);
  einkaufV2RenderTable(_einkaufAllData, isHQ);
}

function einkaufV2RenderStats(data) {
  const el = document.getElementById('einkauf-stats');
  if (!el) return;
  const fixiert    = data.filter(d => d.status_konditionen === 'Zentrale Konditionen sind vertraglich fixiert').length;
  const verhandlung= data.filter(d => ['In Verhandlung','Kontakt aufgenommen','Vertrag in Finalisierung'].includes(d.status_konditionen)).length;
  const kern       = data.filter(d => d.kernsortiment).length;
  const gescheitert= data.filter(d => ['Verhandlung gescheitert','Lieferant läuft aus'].includes(d.status_konditionen)).length;
  el.innerHTML = [
    ['✅','Fixiert',fixiert,'text-green-600'],
    ['🟡','In Verhandlung',verhandlung,'text-orange-500'],
    ['⭐','Kernsortiment',kern,'text-blue-600'],
    ['❌','Gescheitert / ausgelaufen',gescheitert,'text-red-500'],
  ].map(([icon,label,val,cls]) => `
    <div class="vit-card p-4 rounded-xl">
      <div class="flex items-center gap-2 mb-1"><span class="text-lg">${icon}</span><span class="text-gray-500 text-xs">${label}</span></div>
      <div class="text-2xl font-bold ${cls}">${val}</div>
    </div>`).join('');
}

function einkaufV2RenderTable(data, isHQ) {
  const wrap = document.getElementById('einkauf-table-wrap');
  if (!wrap) return;
  if (!data.length) { wrap.innerHTML = `<div class="p-12 text-center text-gray-400">Keine Lieferanten gefunden.</div>`; return; }

  const gruppen = { bike: [], parts: [], Dienstleister: [] };
  data.forEach(l => { if (gruppen[l.art]) gruppen[l.art].push(l); });
  const artLabels = { bike: '🚲 Bikes', parts: '🔧 Parts & Zubehör', Dienstleister: '🤝 Dienstleister' };
  let html = '';

  for (const [art, liste] of Object.entries(gruppen)) {
    if (!liste.length) continue;
    html += `<div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
      <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">${artLabels[art]} (${liste.length})</span>
    </div>`;

    if (isHQ) {
      html += `<table class="w-full text-sm"><thead>
        <tr class="text-xs text-gray-500 border-b border-gray-200 bg-white">
          <th class="text-left px-4 py-2 font-medium">Lieferant</th>
          <th class="text-left px-4 py-2 font-medium">Typ</th>
          <th class="text-left px-4 py-2 font-medium">Status Konditionen</th>
          <th class="text-left px-4 py-2 font-medium">IHT</th>
          <th class="text-left px-4 py-2 font-medium">Konditionen</th>
          <th class="text-left px-4 py-2 font-medium">Kontakt</th>
          <th class="px-4 py-2"></th>
        </tr></thead><tbody>`;

      liste.forEach(l => {
        const kernBadge = l.kernsortiment
          ? `<span class="text-xs bg-orange-100 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded">⭐ Kern</span>`
          : l.zusatz ? `<span class="text-xs bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded">➕ Zusatz</span>` : '';
        const kontakt = l.email_innendienst
          ? `<a href="mailto:${_esc(l.email_innendienst)}" class="text-orange-500 hover:text-orange-600 text-xs">${_esc(l.email_innendienst)}</a>`
          : `<span class="text-gray-300 text-xs">–</span>`;
        html += `<tr class="border-b border-gray-100 hover:bg-orange-50/30 cursor-pointer transition-colors" onclick="window.einkaufV2OpenEdit('${l.id}')">
          <td class="px-4 py-3"><div class="font-medium text-gray-800">${_esc(l.lieferant)}</div><div class="mt-0.5">${kernBadge}</div></td>
          <td class="px-4 py-3 text-gray-400 text-xs">${_esc(l.art)}</td>
          <td class="px-4 py-3">${statusBadge(l.status_konditionen, STATUS_CONFIG)}</td>
          <td class="px-4 py-3">${l.status_iht ? statusBadge(l.status_iht, IHT_CONFIG) : '<span class="text-gray-300 text-xs">–</span>'}</td>
          <td class="px-4 py-3 text-gray-500 text-xs">${_esc(l.konditionen_detail||'–')}</td>
          <td class="px-4 py-3">${kontakt}</td>
          <td class="px-4 py-3"><button onclick="event.stopPropagation();window.einkaufV2OpenEdit('${l.id}')" class="text-gray-300 hover:text-orange-500 transition-colors p-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button></td>
        </tr>`;
      });
      html += `</tbody></table>`;
    } else {
      html += `<div class="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">`;
      liste.forEach(l => {
        html += `<div class="vit-card border rounded-xl p-4 hover:border-orange-300 transition-colors">
          <div class="flex items-start justify-between gap-2 mb-3">
            <div>
              <div class="font-semibold text-gray-800">${_esc(l.lieferant)}</div>
              ${l.kernsortiment ? `<span class="text-xs text-orange-500">⭐ Kernsortiment</span>` : `<span class="text-xs text-gray-400">➕ Zusatzsortiment</span>`}
            </div>
            <span class="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded whitespace-nowrap">✅ Fixiert</span>
          </div>
          ${l.konditionen_detail ? `<div class="text-xs text-gray-500 mb-2">📋 ${_esc(l.konditionen_detail)}</div>` : ''}
          <div class="space-y-1 border-t border-gray-100 pt-2 mt-2">
            ${l.email_innendienst ? `<a href="mailto:${_esc(l.email_innendienst)}" onclick="event.stopPropagation()" class="text-xs text-orange-500 hover:text-orange-600 truncate block">✉ ${_esc(l.email_innendienst)}</a>` : ''}
            ${l.telefon_innendienst ? `<a href="tel:${_esc(l.telefon_innendienst)}" onclick="event.stopPropagation()" class="text-xs text-gray-500 block">📞 ${_esc(l.telefon_innendienst)}</a>` : ''}
            ${l.b2b_shop ? `<span class="text-xs text-blue-500">🔗 ${_esc(l.b2b_shop)}</span>` : ''}
          </div>
        </div>`;
      });
      html += `</div>`;
    }
  }
  wrap.innerHTML = html;
}

window.einkaufV2Filter = function() {
  const search = (document.getElementById('einkauf-search')?.value||'').toLowerCase();
  const art    = document.getElementById('einkauf-filter-art')?.value||'';
  const status = document.getElementById('einkauf-filter-status')?.value||'';
  const kern   = document.getElementById('einkauf-filter-kernsortiment')?.value||'';
  const isHQ   = window.sbProfile?.is_hq === true;

  const filtered = _einkaufAllData.filter(l => {
    if (search && !l.lieferant.toLowerCase().includes(search)) return false;
    if (art && l.art !== art) return false;
    if (status && l.status_konditionen !== status) return false;
    if (kern === 'kern' && !l.kernsortiment) return false;
    if (kern === 'zusatz' && !l.zusatz) return false;
    if (kern === 'sonstige' && (l.kernsortiment||l.zusatz)) return false;
    return true;
  });
  if (isHQ) einkaufV2RenderStats(filtered);
  einkaufV2RenderTable(filtered, isHQ);
};

// ══════════════════════════════════════════════════════════════
// TAB 2: STRATEGIEN
// ══════════════════════════════════════════════════════════════
let _strategienData = [];
let _standorteData  = [];

async function renderStrategienTab(container, isHQ) {
  container.innerHTML = `
    <div class="flex items-center justify-center py-16">
      <div class="text-center">
        <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-gray-400 text-sm">Strategien werden geladen…</p>
      </div>
    </div>`;

  const sb = window.sb;
  if (!sb) { setTimeout(() => renderStrategienTab(container, isHQ), 500); return; }

  // Standorte + Strategien parallel laden
  const standorteQ = sb.from('standorte').select('id,name,status').eq('is_demo', false).order('name');
  const strategienQ = sb.from('einkauf_strategien').select('*');

  const [{ data: standorte, error: e1 }, { data: strategien, error: e2 }] = await Promise.all([standorteQ, strategienQ]);

  if (e1 || e2) {
    container.innerHTML = `<div class="p-8 text-center text-red-500">Fehler beim Laden: ${_esc((e1||e2).message)}</div>`;
    return;
  }

  _standorteData  = (standorte||[]).filter(s => s.status === 'aktiv' || s.status === 'onboarding');
  _strategienData = strategien || [];

  if (isHQ) {
    renderStrategienHQ(container);
  } else {
    renderStrategienPartner(container);
  }
}

function strategieForStandort(standortId) {
  return _strategienData.find(s => s.standort_id === standortId) || null;
}

// ── HQ: alle Standorte, filterbar, editierbar ────────────────
function renderStrategienHQ(container) {
  const aktiv    = _standorteData.filter(s => s.status === 'aktiv');
  const onboard  = _standorteData.filter(s => s.status === 'onboarding');
  const mitStrategie = _strategienData.length;

  container.innerHTML = `
    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="vit-card p-4 rounded-xl">
        <div class="text-gray-500 text-xs mb-1">📍 Aktive Standorte</div>
        <div class="text-2xl font-bold text-gray-800">${aktiv.length}</div>
      </div>
      <div class="vit-card p-4 rounded-xl">
        <div class="text-gray-500 text-xs mb-1">🎯 Mit Strategie</div>
        <div class="text-2xl font-bold text-orange-500">${mitStrategie}</div>
      </div>
      <div class="vit-card p-4 rounded-xl">
        <div class="text-gray-500 text-xs mb-1">⚠️ Ohne Strategie</div>
        <div class="text-2xl font-bold text-gray-400">${_standorteData.length - mitStrategie}</div>
      </div>
    </div>

    <!-- Standort-Karten -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4" id="strategie-cards">
      ${_standorteData.map(s => strategieKarte(s, strategieForStandort(s.id), true)).join('')}
    </div>`;
}

// ── Partner: nur eigene Strategie ────────────────────────────
function renderStrategienPartner(container) {
  const standortId = window.sbProfile?.standort_id;
  const standort   = _standorteData.find(s => s.id === standortId);
  const strategie  = strategieForStandort(standortId);

  if (!standort) {
    container.innerHTML = `<div class="p-12 text-center text-gray-400">Kein Standort zugewiesen.</div>`;
    return;
  }

  if (!strategie) {
    container.innerHTML = `
      <div class="vit-card rounded-xl p-8 text-center">
        <div class="text-4xl mb-3">🎯</div>
        <h3 class="font-semibold text-gray-700 mb-2">Noch keine Einkaufsstrategie hinterlegt</h3>
        <p class="text-gray-400 text-sm">Euer HQ arbeitet daran. Sobald die Strategie freigegeben ist, erscheint sie hier.</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="max-w-3xl">${strategieKarte(standort, strategie, false)}</div>`;
}

// ── Strategie-Karte (shared HQ + Partner) ────────────────────
function strategieKarte(standort, strategie, isHQ) {
  const hatStrategie = !!strategie;
  const statusBadgeHtml = hatStrategie
    ? `<span class="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded">✅ Hinterlegt</span>`
    : `<span class="text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded">○ Ausstehend</span>`;

  const abschnitt = (icon, titel, inhalt) => inhalt ? `
    <div class="mb-4">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-sm">${icon}</span>
        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">${titel}</span>
      </div>
      <div class="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">${_esc(inhalt)}</div>
    </div>` : '';

  return `
    <div class="vit-card rounded-xl overflow-hidden border border-gray-200">
      <!-- Kopfzeile -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <div class="font-semibold text-gray-800">${_esc(standort.name.replace('vit:bikes ', ''))}</div>
          <div class="text-xs text-gray-400 mt-0.5">${standort.status === 'aktiv' ? '🟢 Aktiv' : '🔵 Onboarding'}</div>
        </div>
        <div class="flex items-center gap-2">
          ${statusBadgeHtml}
          ${isHQ ? `<button onclick="window.strategieOpenEdit('${standort.id}', '${_esc(standort.name)}')"
            class="flex items-center gap-1 px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            ${hatStrategie ? 'Bearbeiten' : 'Anlegen'}
          </button>` : ''}
        </div>
      </div>

      <!-- Inhalt -->
      <div class="p-5">
        ${hatStrategie ? `
          ${abschnitt('📊', 'Status Quo', strategie.status_quo)}
          ${abschnitt('🎯', 'Ziele 2026', strategie.ziele_2026)}
          ${abschnitt('⚙️', 'Modus Operandi', strategie.modus_operandi)}
          ${strategie.updated_at ? `<div class="text-xs text-gray-400 mt-2">Zuletzt aktualisiert: ${new Date(strategie.updated_at).toLocaleDateString('de-DE')}</div>` : ''}
        ` : `
          <div class="text-center py-6 text-gray-400">
            <div class="text-3xl mb-2">📝</div>
            <p class="text-sm">Noch keine Strategie hinterlegt</p>
          </div>
        `}
      </div>
    </div>`;
}

// ── Strategie Edit Modal ──────────────────────────────────────
window.strategieOpenEdit = function(standortId, standortName) {
  const modal = document.getElementById('strategie-modal');
  const title = document.getElementById('strategie-modal-title');
  const body  = document.getElementById('strategie-modal-body');
  if (!modal || !body) return;

  const existing = strategieForStandort(standortId);
  title.textContent = `Einkaufsstrategie: ${standortName.replace('vit:bikes ', '')}`;
  modal.classList.remove('hidden');

  const val = f => existing ? (_esc(existing[f]||'')) : '';

  body.innerHTML = `
    <form id="strategie-form" class="space-y-5" onsubmit="event.preventDefault(); window.strategieSave('${standortId}')">
      <div>
        <label class="${LBL}">📊 Status Quo – aktuelle Situation, Lieferanten, Volumen, Marge</label>
        <textarea name="status_quo" rows="5"
          class="${INP} resize-y font-mono text-xs"
          placeholder="Beschreibe die aktuelle Einkaufssituation: Welche Lieferanten werden genutzt? Welche Mengen/Volumen? Aktuelle Marge? Besonderheiten?">${val('status_quo')}</textarea>
      </div>
      <div>
        <label class="${LBL}">🎯 Ziele 2026 – was soll erreicht werden?</label>
        <textarea name="ziele_2026" rows="5"
          class="${INP} resize-y font-mono text-xs"
          placeholder="Konkrete Ziele für 2026: Welche neuen Lieferanten? Welche Marge-Verbesserung? Welche Sortimentsbereinigung? Volumen-Ziele?">${val('ziele_2026')}</textarea>
      </div>
      <div>
        <label class="${LBL}">⚙️ Modus Operandi – Vorgehensweise & Prioritäten</label>
        <textarea name="modus_operandi" rows="5"
          class="${INP} resize-y font-mono text-xs"
          placeholder="Wie wird vorgegangen? Welche Lieferanten werden priorisiert? Welche Verhandlungsstrategie? Zeitplan?">${val('modus_operandi')}</textarea>
      </div>
      <div class="flex items-center gap-3 pt-2 border-t border-gray-200">
        <button type="submit"
          class="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
          Strategie speichern
        </button>
        <button type="button" onclick="window.strategieCloseModal()"
          class="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition-colors">
          Abbrechen
        </button>
      </div>
    </form>`;
};

window.strategieCloseModal = function() {
  const modal = document.getElementById('strategie-modal');
  if (modal) modal.classList.add('hidden');
};

window.strategieSave = async function(standortId) {
  const sb = window.sb;
  if (!sb) return;
  const form = document.getElementById('strategie-form');
  if (!form) return;

  const fd = new FormData(form);
  const payload = {
    standort_id:    standortId,
    status_quo:     fd.get('status_quo') || null,
    ziele_2026:     fd.get('ziele_2026') || null,
    modus_operandi: fd.get('modus_operandi') || null,
    updated_at:     new Date().toISOString(),
  };

  const existing = strategieForStandort(standortId);
  let error;
  if (existing) {
    ({ error } = await sb.from('einkauf_strategien').update(payload).eq('id', existing.id));
  } else {
    ({ error } = await sb.from('einkauf_strategien').insert(payload));
  }

  if (error) { if (window.showToast) window.showToast('Fehler: ' + error.message, 'error'); return; }
  if (window.showToast) window.showToast('Strategie gespeichert ✓', 'success');
  window.strategieCloseModal();

  // Daten neu laden und Tab refreshen
  const { data } = await sb.from('einkauf_strategien').select('*');
  _strategienData = data || [];
  const tab = document.getElementById('ek2-tab-strategien');
  if (tab) {
    delete tab.dataset.loaded;
    renderStrategienHQ(tab);
    tab.dataset.loaded = '1';
  }
};

// Modal per Klick außen schließen
document.addEventListener('click', function(e) {
  if (e.target === document.getElementById('einkauf-modal')) window.einkaufV2CloseModal();
  if (e.target === document.getElementById('strategie-modal')) window.strategieCloseModal();
});

// ── Lieferant Edit Modal ──────────────────────────────────────
window.einkaufV2OpenEdit = async function(id) {
  if (!window.sbProfile?.is_hq) return;
  const modal = document.getElementById('einkauf-modal');
  const title = document.getElementById('einkauf-modal-title');
  const body  = document.getElementById('einkauf-modal-body');
  if (!modal || !body) return;

  modal.classList.remove('hidden');
  const l = id ? (_einkaufAllData.find(x => x.id === id)||null) : null;
  title.textContent = l ? `Bearbeiten: ${l.lieferant}` : 'Neuer Lieferant';

  const val = f => l ? (l[f]??'') : '';
  const chk = f => l?.[f] ? 'checked' : '';
  const statusOpts = Object.keys(STATUS_CONFIG).map(s =>
    `<option value="${_esc(s)}" ${val('status_konditionen')===s?'selected':''}>${s}</option>`).join('');
  const ihtOpts = Object.keys(IHT_CONFIG).map(s =>
    `<option value="${_esc(s)}" ${val('status_iht')===s?'selected':''}>${s}</option>`).join('');

  body.innerHTML = `
    <form id="einkauf-form" class="space-y-4" onsubmit="event.preventDefault();window.einkaufV2Save('${id||''}')">
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="${LBL}">Lieferant *</label>
          <input name="lieferant" required value="${_esc(val('lieferant'))}" class="${INP}">
        </div>
        <div>
          <label class="${LBL}">Kategorie *</label>
          <select name="art" class="${SEL}">
            <option value="bike" ${val('art')==='bike'?'selected':''}>🚲 Bike</option>
            <option value="parts" ${val('art')==='parts'?'selected':''}>🔧 Parts</option>
            <option value="Dienstleister" ${val('art')==='Dienstleister'?'selected':''}>🤝 Dienstleister</option>
          </select>
        </div>
        <div class="flex items-end gap-4 pb-1">
          <label class="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" name="kernsortiment" ${chk('kernsortiment')} class="w-4 h-4 accent-orange-500"> Kernsortiment
          </label>
          <label class="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" name="zusatz" ${chk('zusatz')} class="w-4 h-4 accent-orange-500"> Zusatz
          </label>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="${LBL}">Status Konditionen</label><select name="status_konditionen" class="${SEL}">${statusOpts}</select></div>
        <div><label class="${LBL}">Status IHT</label><select name="status_iht" class="${SEL}">${ihtOpts}</select></div>
      </div>
      <div><label class="${LBL}">Konditionen-Bezeichnung</label>
        <input name="konditionen_detail" value="${_esc(val('konditionen_detail'))}" class="${INP}" placeholder="z.B. Konditionen Simplon"></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="${LBL}">E-Mail Innendienst</label><input name="email_innendienst" type="email" value="${_esc(val('email_innendienst'))}" class="${INP}"></div>
        <div><label class="${LBL}">Telefon Innendienst</label><input name="telefon_innendienst" value="${_esc(val('telefon_innendienst'))}" class="${INP}"></div>
        <div><label class="${LBL}">B2B-Shop Name</label><input name="b2b_shop" value="${_esc(val('b2b_shop'))}" class="${INP}"></div>
        <div><label class="${LBL}">E-Mail Registrierung</label><input name="email_registrierung" type="email" value="${_esc(val('email_registrierung'))}" class="${INP}"></div>
      </div>
      <div><label class="${LBL}">Notizen (intern)</label>
        <textarea name="notizen" rows="2" class="${INP} resize-none" placeholder="Interne Notizen…">${_esc(val('notizen'))}</textarea></div>
      <div class="flex items-center gap-3 pt-2 border-t border-gray-200">
        <button type="submit" class="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">Speichern</button>
        <button type="button" onclick="window.einkaufV2CloseModal()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition-colors">Abbrechen</button>
        ${id ? `<button type="button" onclick="window.einkaufV2Delete('${id}')" class="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm border border-red-200 transition-colors">Löschen</button>` : ''}
      </div>
    </form>`;
};

window.einkaufV2CloseModal = function() {
  const modal = document.getElementById('einkauf-modal');
  if (modal) modal.classList.add('hidden');
};

window.einkaufV2Save = async function(id) {
  const sb = window.sb;
  if (!sb) return;
  const form = document.getElementById('einkauf-form');
  if (!form) return;
  const fd = new FormData(form);
  const payload = {
    lieferant: fd.get('lieferant'), art: fd.get('art'),
    kernsortiment: fd.get('kernsortiment')==='on', zusatz: fd.get('zusatz')==='on',
    status_konditionen: fd.get('status_konditionen'), status_iht: fd.get('status_iht'),
    konditionen_detail: fd.get('konditionen_detail')||null, email_innendienst: fd.get('email_innendienst')||null,
    telefon_innendienst: fd.get('telefon_innendienst')||null, b2b_shop: fd.get('b2b_shop')||null,
    email_registrierung: fd.get('email_registrierung')||null, notizen: fd.get('notizen')||null,
  };
  let error;
  if (id) { ({ error } = await sb.from('lieferanten').update(payload).eq('id', id)); }
  else    { ({ error } = await sb.from('lieferanten').insert(payload)); }
  if (error) { if (window.showToast) window.showToast('Fehler: '+error.message,'error'); return; }
  window.logAudit && window.logAudit(id ? 'lieferant_bearbeitet' : 'lieferant_erstellt', 'einkauf', { name: payload.name || payload.firma_name || '' });
  if (window.showToast) window.showToast('Lieferant gespeichert ✓','success');
  window.einkaufV2CloseModal();
  await einkaufV2Load(true);
};

window.einkaufV2Delete = async function(id) {
  if (!confirm('Lieferant wirklich löschen?')) return;
  const sb = window.sb;
  if (!sb) return;
  const { error } = await sb.from('lieferanten').delete().eq('id', id);
  if (error) { if (window.showToast) window.showToast('Fehler: '+error.message,'error'); return; }
  window.logAudit && window.logAudit('lieferant_geloescht', 'einkauf', { id: id });
  if (window.showToast) window.showToast('Lieferant gelöscht','success');
  window.einkaufV2CloseModal();
  await einkaufV2Load(true);
};

window.renderEinkaufV2 = renderEinkaufV2;
// Alias für Abwärtskompatibilität (hq-verkauf.js ruft showHqEkTab)
window.showHqEkTab = function(tab) { window.einkaufV2ShowTab && window.einkaufV2ShowTab(tab); };
window.showEinkaufTab = window.showHqEkTab;
