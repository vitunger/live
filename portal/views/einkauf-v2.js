// ============================================================
// einkauf-v2.js – Einkauf-Modul (DB-gestützt)
// HQ: Vollständiges Lieferanten-Cockpit + Verhandlungsstatus
// Partner: Kernsortiment & Zusatz mit fixierten Konditionen
// ============================================================

const EINKAUF_V2_VERSION = 3;

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

function statusBadge(status, map) {
  const cfg = map[status] || { farbe: 'gray', icon: '⚪', kurz: status };
  const farbMap = {
    green:  'bg-green-900/40 text-green-300 border-green-700',
    blue:   'bg-blue-900/40 text-blue-300 border-blue-700',
    orange: 'bg-orange-900/40 text-orange-300 border-orange-700',
    gray:   'bg-gray-800 text-gray-400 border-gray-600',
    red:    'bg-red-900/40 text-red-300 border-red-700',
  };
  const cls = farbMap[cfg.farbe] || farbMap.gray;
  const label = cfg.kurz || status;
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${cls}">${cfg.icon} ${window.escH ? window.escH(label) : label}</span>`;
}

async function renderEinkaufV2() {
  const isHQ = window.sbProfile?.is_hq === true;
  const container = document.getElementById('view-einkauf');
  if (!container) return;

  container.innerHTML = `
    <div class="p-6 max-w-7xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-white">Einkauf</h1>
          <p class="text-gray-400 text-sm mt-1">${isHQ ? 'HQ-Cockpit – alle Lieferanten & Verhandlungsstatus' : 'Eure Lieferanten mit vit:bikes Konditionen'}</p>
        </div>
        ${isHQ ? `
        <button onclick="window.einkaufV2OpenEdit(null)" 
          class="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Lieferant hinzufügen
        </button>` : ''}
      </div>

      <!-- Filter-Leiste -->
      <div class="flex flex-wrap gap-3 mb-6">
        <div class="relative flex-1 min-w-48">
          <input id="einkauf-search" type="text" placeholder="Lieferant suchen…"
            class="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 pl-9 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            oninput="window.einkaufV2Filter()">
          <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/></svg>
        </div>
        <select id="einkauf-filter-art" onchange="window.einkaufV2Filter()"
          class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
          <option value="">Alle Kategorien</option>
          <option value="bike">🚲 Bikes</option>
          <option value="parts">🔧 Parts</option>
          <option value="Dienstleister">🤝 Dienstleister</option>
        </select>
        ${isHQ ? `
        <select id="einkauf-filter-status" onchange="window.einkaufV2Filter()"
          class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
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
          class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
          <option value="">Alle</option>
          <option value="kern">⭐ Kernsortiment</option>
          <option value="zusatz">➕ Zusatz</option>
          <option value="sonstige">○ Sonstige</option>
        </select>` : ''}
      </div>

      <!-- Stats (nur HQ) -->
      ${isHQ ? `<div id="einkauf-stats" class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"></div>` : ''}

      <!-- Tabelle -->
      <div class="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div id="einkauf-table-wrap" class="overflow-x-auto">
          <div class="flex items-center justify-center py-16">
            <div class="text-center">
              <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p class="text-gray-400 text-sm">Lieferanten werden geladen…</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit-Modal (nur HQ) -->
    ${isHQ ? `
    <div id="einkauf-modal" class="fixed inset-0 bg-black/60 z-50 hidden flex items-center justify-center p-4">
      <div class="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 id="einkauf-modal-title" class="text-lg font-semibold text-white">Lieferant bearbeiten</h2>
          <button onclick="window.einkaufV2CloseModal()" class="text-gray-400 hover:text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div id="einkauf-modal-body" class="p-6"></div>
      </div>
    </div>` : ''}
  `;

  await einkaufV2Load(isHQ);
}

let _einkaufAllData = [];

async function einkaufV2Load(isHQ) {
  const sb = window.sb || window._sb?.();
  if (!sb) return;

  let query = sb.from('lieferanten').select('*').order('art').order('lieferant');

  if (!isHQ) {
    // Partner sehen nur fixierte Kern/Zusatz-Lieferanten
    query = query
      .eq('status_konditionen', 'Zentrale Konditionen sind vertraglich fixiert')
      .or('kernsortiment.eq.true,zusatz.eq.true');
  }

  const { data, error } = await query;

  if (error) {
    document.getElementById('einkauf-table-wrap').innerHTML = `
      <div class="p-8 text-center text-red-400">Fehler beim Laden: ${error.message}</div>`;
    return;
  }

  _einkaufAllData = data || [];

  if (isHQ) einkaufV2RenderStats(_einkaufAllData);
  einkaufV2RenderTable(_einkaufAllData, isHQ);
}

function einkaufV2RenderStats(data) {
  const statsEl = document.getElementById('einkauf-stats');
  if (!statsEl) return;

  const fixiert = data.filter(d => d.status_konditionen === 'Zentrale Konditionen sind vertraglich fixiert').length;
  const verhandlung = data.filter(d => ['In Verhandlung', 'Kontakt aufgenommen', 'Vertrag in Finalisierung'].includes(d.status_konditionen)).length;
  const kern = data.filter(d => d.kernsortiment).length;
  const gescheitert = data.filter(d => ['Verhandlung gescheitert', 'Lieferant läuft aus'].includes(d.status_konditionen)).length;

  statsEl.innerHTML = `
    ${statCard('✅', 'Fixiert', fixiert, 'text-green-400')}
    ${statCard('🟡', 'In Verhandlung', verhandlung, 'text-orange-400')}
    ${statCard('⭐', 'Kernsortiment', kern, 'text-blue-400')}
    ${statCard('❌', 'Gescheitert / ausgelaufen', gescheitert, 'text-red-400')}
  `;
}

function statCard(icon, label, val, cls) {
  return `
    <div class="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-lg">${icon}</span>
        <span class="text-gray-400 text-xs">${label}</span>
      </div>
      <div class="text-2xl font-bold ${cls}">${val}</div>
    </div>`;
}

function einkaufV2RenderTable(data, isHQ) {
  const wrap = document.getElementById('einkauf-table-wrap');
  if (!wrap) return;

  if (!data.length) {
    wrap.innerHTML = `<div class="p-12 text-center text-gray-400">Keine Lieferanten gefunden.</div>`;
    return;
  }

  const esc = window.escH || (s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));

  // Gruppierung nach Art
  const gruppen = { bike: [], parts: [], Dienstleister: [] };
  data.forEach(l => { if (gruppen[l.art]) gruppen[l.art].push(l); });

  const artLabels = { bike: '🚲 Bikes', parts: '🔧 Parts & Zubehör', Dienstleister: '🤝 Dienstleister' };

  let html = '';

  for (const [art, liste] of Object.entries(gruppen)) {
    if (!liste.length) continue;

    html += `
      <div class="px-4 py-2 bg-gray-900/50 border-b border-gray-700">
        <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">${artLabels[art]} (${liste.length})</span>
      </div>`;

    if (isHQ) {
      // HQ: vollständige Tabelle
      html += `<table class="w-full text-sm">
        <thead>
          <tr class="text-xs text-gray-500 border-b border-gray-700">
            <th class="text-left px-4 py-2 font-medium">Lieferant</th>
            <th class="text-left px-4 py-2 font-medium">Typ</th>
            <th class="text-left px-4 py-2 font-medium">Status Konditionen</th>
            <th class="text-left px-4 py-2 font-medium">IHT</th>
            <th class="text-left px-4 py-2 font-medium">Konditionen</th>
            <th class="text-left px-4 py-2 font-medium">Kontakt</th>
            <th class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>`;

      liste.forEach(l => {
        const kernBadge = l.kernsortiment
          ? `<span class="text-xs bg-orange-900/40 text-orange-300 border border-orange-700 px-1.5 py-0.5 rounded">⭐ Kern</span>`
          : l.zusatz
            ? `<span class="text-xs bg-gray-700 text-gray-400 border border-gray-600 px-1.5 py-0.5 rounded">➕ Zusatz</span>`
            : '';

        const kontakt = l.email_innendienst
          ? `<a href="mailto:${esc(l.email_innendienst)}" class="text-orange-400 hover:text-orange-300 text-xs">${esc(l.email_innendienst)}</a>`
          : `<span class="text-gray-600 text-xs">–</span>`;

        html += `<tr class="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer" onclick="window.einkaufV2OpenEdit('${l.id}')">
          <td class="px-4 py-3">
            <div class="font-medium text-white">${esc(l.lieferant)}</div>
            <div class="mt-0.5">${kernBadge}</div>
          </td>
          <td class="px-4 py-3 text-gray-400 text-xs">${esc(l.art)}</td>
          <td class="px-4 py-3">${statusBadge(l.status_konditionen, STATUS_CONFIG)}</td>
          <td class="px-4 py-3">${l.status_iht ? statusBadge(l.status_iht, IHT_CONFIG) : '–'}</td>
          <td class="px-4 py-3 text-gray-300 text-xs">${esc(l.konditionen_detail || '–')}</td>
          <td class="px-4 py-3">${kontakt}</td>
          <td class="px-4 py-3">
            <button onclick="event.stopPropagation(); window.einkaufV2OpenEdit('${l.id}')"
              class="text-gray-500 hover:text-orange-400 transition-colors p-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
          </td>
        </tr>`;
      });

      html += `</tbody></table>`;

    } else {
      // Partner: Karten-Layout, nur relevante Infos
      html += `<div class="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">`;

      liste.forEach(l => {
        const b2bBtn = l.b2b_shop
          ? `<span class="text-xs text-blue-400">🔗 ${esc(l.b2b_shop)}</span>`
          : '';

        const emailBtn = l.email_innendienst
          ? `<a href="mailto:${esc(l.email_innendienst)}" onclick="event.stopPropagation()"
               class="text-xs text-orange-400 hover:text-orange-300 truncate block">✉ ${esc(l.email_innendienst)}</a>`
          : '';

        const telefonBtn = l.telefon_innendienst
          ? `<a href="tel:${esc(l.telefon_innendienst)}" onclick="event.stopPropagation()"
               class="text-xs text-gray-400 hover:text-white block">📞 ${esc(l.telefon_innendienst)}</a>`
          : '';

        html += `
          <div class="bg-gray-700/40 border border-gray-600 rounded-xl p-4 hover:border-orange-500/50 transition-colors">
            <div class="flex items-start justify-between gap-2 mb-3">
              <div>
                <div class="font-semibold text-white">${esc(l.lieferant)}</div>
                ${l.kernsortiment ? `<span class="text-xs text-orange-400">⭐ Kernsortiment</span>` : `<span class="text-xs text-gray-500">➕ Zusatzsortiment</span>`}
              </div>
              <span class="text-xs bg-green-900/40 text-green-300 border border-green-700 px-2 py-0.5 rounded whitespace-nowrap">✅ Fixiert</span>
            </div>
            ${l.konditionen_detail ? `<div class="text-xs text-gray-400 mb-2">📋 ${esc(l.konditionen_detail)}</div>` : ''}
            <div class="space-y-1 border-t border-gray-600/50 pt-2 mt-2">
              ${emailBtn}
              ${telefonBtn}
              ${b2bBtn}
            </div>
          </div>`;
      });

      html += `</div>`;
    }
  }

  wrap.innerHTML = html;
}

window.einkaufV2Filter = function() {
  const search = (document.getElementById('einkauf-search')?.value || '').toLowerCase();
  const art = document.getElementById('einkauf-filter-art')?.value || '';
  const status = document.getElementById('einkauf-filter-status')?.value || '';
  const kern = document.getElementById('einkauf-filter-kernsortiment')?.value || '';
  const isHQ = window.sbProfile?.is_hq === true;

  let filtered = _einkaufAllData.filter(l => {
    if (search && !l.lieferant.toLowerCase().includes(search)) return false;
    if (art && l.art !== art) return false;
    if (status && l.status_konditionen !== status) return false;
    if (kern === 'kern' && !l.kernsortiment) return false;
    if (kern === 'zusatz' && !l.zusatz) return false;
    if (kern === 'sonstige' && (l.kernsortiment || l.zusatz)) return false;
    return true;
  });

  if (isHQ) einkaufV2RenderStats(filtered);
  einkaufV2RenderTable(filtered, isHQ);
};

// ---- HQ Edit Modal ----
window.einkaufV2OpenEdit = async function(id) {
  if (!window.sbProfile?.is_hq) return;
  const modal = document.getElementById('einkauf-modal');
  const title = document.getElementById('einkauf-modal-title');
  const body = document.getElementById('einkauf-modal-body');
  if (!modal || !body) return;

  modal.classList.remove('hidden');

  let lieferant = null;
  if (id) {
    lieferant = _einkaufAllData.find(l => l.id === id) || null;
    title.textContent = lieferant ? `Bearbeiten: ${lieferant.lieferant}` : 'Lieferant';
  } else {
    title.textContent = 'Neuer Lieferant';
  }

  const esc = window.escH || (s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const val = (f) => lieferant ? (lieferant[f] ?? '') : '';
  const chk = (f) => lieferant?.[f] ? 'checked' : '';

  const statusOpts = Object.keys(STATUS_CONFIG).map(s =>
    `<option value="${esc(s)}" ${val('status_konditionen') === s ? 'selected' : ''}>${s}</option>`
  ).join('');

  const ihtOpts = Object.keys(IHT_CONFIG).map(s =>
    `<option value="${esc(s)}" ${val('status_iht') === s ? 'selected' : ''}>${s}</option>`
  ).join('');

  body.innerHTML = `
    <form id="einkauf-form" class="space-y-4" onsubmit="event.preventDefault(); window.einkaufV2Save('${id || ''}')">
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="text-xs text-gray-400 block mb-1">Lieferant *</label>
          <input name="lieferant" required value="${esc(val('lieferant'))}"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">Kategorie *</label>
          <select name="art" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
            <option value="bike" ${val('art') === 'bike' ? 'selected' : ''}>🚲 Bike</option>
            <option value="parts" ${val('art') === 'parts' ? 'selected' : ''}>🔧 Parts</option>
            <option value="Dienstleister" ${val('art') === 'Dienstleister' ? 'selected' : ''}>🤝 Dienstleister</option>
          </select>
        </div>
        <div class="flex items-end gap-4 pb-1">
          <label class="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" name="kernsortiment" ${chk('kernsortiment')} class="w-4 h-4 accent-orange-500">
            Kernsortiment
          </label>
          <label class="flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" name="zusatz" ${chk('zusatz')} class="w-4 h-4 accent-orange-500">
            Zusatz
          </label>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-xs text-gray-400 block mb-1">Status Konditionen</label>
          <select name="status_konditionen" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
            ${statusOpts}
          </select>
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">Status IHT</label>
          <select name="status_iht" class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
            ${ihtOpts}
          </select>
        </div>
      </div>

      <div>
        <label class="text-xs text-gray-400 block mb-1">Konditionen-Bezeichnung</label>
        <input name="konditionen_detail" value="${esc(val('konditionen_detail'))}"
          class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
          placeholder="z.B. Konditionen Simplon">
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="text-xs text-gray-400 block mb-1">E-Mail Innendienst</label>
          <input name="email_innendienst" type="email" value="${esc(val('email_innendienst'))}"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">Telefon Innendienst</label>
          <input name="telefon_innendienst" value="${esc(val('telefon_innendienst'))}"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">B2B-Shop Name</label>
          <input name="b2b_shop" value="${esc(val('b2b_shop'))}"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
        </div>
        <div>
          <label class="text-xs text-gray-400 block mb-1">E-Mail Registrierung</label>
          <input name="email_registrierung" type="email" value="${esc(val('email_registrierung'))}"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500">
        </div>
      </div>

      <div>
        <label class="text-xs text-gray-400 block mb-1">Notizen (intern)</label>
        <textarea name="notizen" rows="2"
          class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 resize-none"
          placeholder="Interne Notizen zu diesem Lieferanten…">${esc(val('notizen'))}</textarea>
      </div>

      <div class="flex items-center gap-3 pt-2 border-t border-gray-700">
        <button type="submit"
          class="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
          Speichern
        </button>
        <button type="button" onclick="window.einkaufV2CloseModal()"
          class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
          Abbrechen
        </button>
        ${id ? `<button type="button" onclick="window.einkaufV2Delete('${id}')"
          class="px-3 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-300 rounded-lg text-sm transition-colors border border-red-700">
          Löschen
        </button>` : ''}
      </div>
    </form>`;
};

window.einkaufV2CloseModal = function() {
  const modal = document.getElementById('einkauf-modal');
  if (modal) modal.classList.add('hidden');
};

window.einkaufV2Save = async function(id) {
  const sb = window.sb || window._sb?.();
  if (!sb) return;

  const form = document.getElementById('einkauf-form');
  if (!form) return;

  const fd = new FormData(form);
  const payload = {
    lieferant: fd.get('lieferant'),
    art: fd.get('art'),
    kernsortiment: fd.get('kernsortiment') === 'on',
    zusatz: fd.get('zusatz') === 'on',
    status_konditionen: fd.get('status_konditionen'),
    status_iht: fd.get('status_iht'),
    konditionen_detail: fd.get('konditionen_detail') || null,
    email_innendienst: fd.get('email_innendienst') || null,
    telefon_innendienst: fd.get('telefon_innendienst') || null,
    b2b_shop: fd.get('b2b_shop') || null,
    email_registrierung: fd.get('email_registrierung') || null,
    notizen: fd.get('notizen') || null,
  };

  let error;
  if (id) {
    ({ error } = await sb.from('lieferanten').update(payload).eq('id', id));
  } else {
    ({ error } = await sb.from('lieferanten').insert(payload));
  }

  if (error) {
    if (window.showToast) window.showToast('Fehler beim Speichern: ' + error.message, 'error');
    return;
  }

  if (window.showToast) window.showToast('Lieferant gespeichert ✓', 'success');
  window.einkaufV2CloseModal();
  await einkaufV2Load(true);
};

window.einkaufV2Delete = async function(id) {
  if (!confirm('Lieferant wirklich löschen?')) return;
  const sb = window.sb || window._sb?.();
  if (!sb) return;

  const { error } = await sb.from('lieferanten').delete().eq('id', id);
  if (error) {
    if (window.showToast) window.showToast('Fehler: ' + error.message, 'error');
    return;
  }
  if (window.showToast) window.showToast('Lieferant gelöscht', 'success');
  window.einkaufV2CloseModal();
  await einkaufV2Load(true);
};

// Modal per Klick außen schließen
document.addEventListener('click', function(e) {
  const modal = document.getElementById('einkauf-modal');
  if (modal && e.target === modal) window.einkaufV2CloseModal();
});

window.renderEinkaufV2 = renderEinkaufV2;
