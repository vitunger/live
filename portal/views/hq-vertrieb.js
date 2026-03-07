/**
 * views/hq-vertrieb.js - HQ Vertrieb (Franchise-Akquise)
 * Pipeline von Lead bis Vertragsabschluss.
 *
 * Tabs: Dashboard | Inbox | Pipeline
 * Tabellen: crm_kontakte, crm_aktivitaeten, crm_vereinbarungen, crm_meetings, potential_check_leads
 *
 * @module views/hq-vertrieb
 */

// ── Safe Helpers ──
function _sb()           { return window.sb; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }

// ── State ──
var vtTab = 'dashboard';
var vtKontakte = [];
var vtInbox = [];
var vtLoaded = false;
var vtDetail = null; // aktuell geoeffneter Kontakt
var vtDetailTab = 'uebersicht';

// ── Phasen-Config ──
var VT_PHASEN = [
  { key: 'lead',           label: 'Lead',            color: 'bg-gray-100 text-gray-700' },
  { key: 'erstgespraech',  label: 'Erstgespr\u00e4ch', color: 'bg-blue-100 text-blue-700' },
  { key: 'kennenlernen',   label: 'Kennenlernen',    color: 'bg-indigo-100 text-indigo-700' },
  { key: 'qualifizierung', label: 'Qualifizierung',  color: 'bg-purple-100 text-purple-700' },
  { key: 'training',       label: 'Training',        color: 'bg-amber-100 text-amber-700' },
];

var VT_QUELLEN_ICONS = {
  potentialanalyse: '\ud83d\udcca', empfehlung: '\ud83e\udd1d', messe: '\ud83c\udfaa',
  website: '\ud83c\udf10', kaltakquise: '\ud83d\udcde', datenbank: '\ud83d\uddc4\ufe0f'
};

// ══════════════════════════════════════════
// MAIN RENDER
// ══════════════════════════════════════════

export async function renderHqVertrieb() {
  var el = document.getElementById('hqVertriebView');
  if (!el) return;

  if (!vtLoaded) {
    el.innerHTML = '<div class="p-6 text-gray-400">L\u00e4dt...</div>';
    await vtLoadData();
  }

  vtRenderShell(el);
  vtShowTab(vtTab);
}

async function vtLoadData() {
  try {
    var [kResp, iResp] = await Promise.all([
      _sb().from('crm_kontakte').select('*').order('aktualisiert_am', { ascending: false }),
      _sb().from('potential_check_leads').select('*').is('status', null).order('created_at', { ascending: false })
    ]);
    vtKontakte = (kResp.data || []);
    vtInbox = (iResp.data || []);
    vtLoaded = true;
  } catch (err) {
    console.error('[hq-vertrieb] loadData', err);
    _showToast('Fehler beim Laden der Vertriebsdaten', 'error');
  }
}

// ── Shell ──
function vtRenderShell(el) {
  var tabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'inbox',     label: 'Inbox (' + vtInbox.length + ')' },
    { key: 'pipeline',  label: 'Pipeline' }
  ];

  var html = '<div class="p-4 md:p-6">';
  html += '<h1 class="text-xl font-bold text-gray-800 mb-4">Vertrieb \u2013 Franchise-Akquise</h1>';

  // Tab-Nav
  html += '<div class="border-b border-gray-200 mb-6"><nav class="flex space-x-6">';
  tabs.forEach(function(t) {
    var active = t.key === vtTab;
    html += '<button onclick="vtShowTab(\'' + t.key + '\')" class="whitespace-nowrap py-3 px-1 border-b-2 text-sm font-semibold ' +
      (active ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300') +
      '">' + t.label + '</button>';
  });
  html += '</nav></div>';

  // Tab-Content Container
  html += '<div id="vtTabDashboard" class="vt-tab" style="display:none"></div>';
  html += '<div id="vtTabInbox" class="vt-tab" style="display:none"></div>';
  html += '<div id="vtTabPipeline" class="vt-tab" style="display:none"></div>';
  html += '<div id="vtDetail" style="display:none"></div>';
  html += '</div>';
  el.innerHTML = html;
}

// ── Tab Switch ──
function vtShowTab(tab) {
  vtTab = tab;
  vtDetail = null;
  document.querySelectorAll('.vt-tab').forEach(function(c) { c.style.display = 'none'; });
  var detailEl = document.getElementById('vtDetail');
  if (detailEl) detailEl.style.display = 'none';

  var target = document.getElementById('vtTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (target) {
    target.style.display = 'block';
    if (tab === 'dashboard') vtRenderDashboard(target);
    else if (tab === 'inbox') vtRenderInbox(target);
    else if (tab === 'pipeline') vtRenderPipeline(target);
  }

  // Update Tab-Buttons
  var view = document.getElementById('hqVertriebView');
  if (view) {
    view.querySelectorAll('nav button').forEach(function(b) {
      var isActive = b.textContent.toLowerCase().indexOf(tab) !== -1 ||
        (tab === 'dashboard' && b.textContent === 'Dashboard') ||
        (tab === 'inbox' && b.textContent.indexOf('Inbox') !== -1) ||
        (tab === 'pipeline' && b.textContent === 'Pipeline');
      b.className = 'whitespace-nowrap py-3 px-1 border-b-2 text-sm font-semibold ' +
        (isActive ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300');
    });
  }
}

// ══════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════

function vtRenderDashboard(el) {
  var aktiv = vtKontakte.filter(function(k) { return k.typ === 'interessent' && k.pipeline_phase !== 'gewonnen' && k.pipeline_phase !== 'verloren'; });
  var gewonnen = vtKontakte.filter(function(k) { return k.pipeline_phase === 'gewonnen'; });
  var verloren = vtKontakte.filter(function(k) { return k.pipeline_phase === 'verloren'; });
  var total = aktiv.length + gewonnen.length + verloren.length;
  var convRate = total > 0 ? Math.round(gewonnen.length / total * 100) : 0;

  var html = '';

  // KPIs
  html += '<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">';
  html += vtKpiCard('Inbox', vtInbox.length, 'text-blue-600', 'bg-blue-50');
  html += vtKpiCard('Pipeline aktiv', aktiv.length, 'text-orange-600', 'bg-orange-50');
  html += vtKpiCard('Gewonnen', gewonnen.length, 'text-green-600', 'bg-green-50');
  html += vtKpiCard('Verloren', verloren.length, 'text-red-600', 'bg-red-50');
  html += vtKpiCard('Conversion', convRate + '%', 'text-purple-600', 'bg-purple-50');
  html += '</div>';

  // Deals pro Phase
  html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">';
  html += '<h3 class="text-sm font-semibold text-gray-700 mb-3">Deals pro Phase</h3>';
  html += '<div class="grid grid-cols-5 gap-2">';
  VT_PHASEN.forEach(function(p) {
    var count = aktiv.filter(function(k) { return k.pipeline_phase === p.key; }).length;
    html += '<div class="text-center p-3 rounded-lg ' + p.color + '">';
    html += '<div class="text-2xl font-bold">' + count + '</div>';
    html += '<div class="text-xs mt-1">' + p.label + '</div>';
    html += '</div>';
  });
  html += '</div></div>';

  // Lead-Quellen
  html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">';
  html += '<h3 class="text-sm font-semibold text-gray-700 mb-3">Lead-Quellen</h3>';
  var quellen = {};
  vtKontakte.forEach(function(k) {
    var q = k.pipeline_quelle || 'unbekannt';
    quellen[q] = (quellen[q] || 0) + 1;
  });
  html += '<div class="flex flex-wrap gap-3">';
  Object.keys(quellen).sort(function(a,b) { return quellen[b] - quellen[a]; }).forEach(function(q) {
    var icon = VT_QUELLEN_ICONS[q] || '\u2753';
    html += '<span class="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700">';
    html += icon + ' ' + _escH(q) + ' <span class="ml-1 font-semibold">' + quellen[q] + '</span></span>';
  });
  html += '</div></div>';

  el.innerHTML = html;
}

function vtKpiCard(label, value, textColor, bgColor) {
  return '<div class="' + bgColor + ' rounded-xl p-4 text-center">' +
    '<div class="text-2xl font-bold ' + textColor + '">' + value + '</div>' +
    '<div class="text-xs text-gray-500 mt-1">' + _escH(label) + '</div></div>';
}

// ══════════════════════════════════════════
// INBOX (potential_check_leads)
// ══════════════════════════════════════════

function vtRenderInbox(el) {
  if (vtInbox.length === 0) {
    el.innerHTML = '<div class="text-center py-12 text-gray-400">' +
      '<p class="text-lg mb-2">Keine neuen Leads</p>' +
      '<p class="text-sm">Neue Leads erscheinen hier automatisch aus dem Potentialanalyse-Tool.</p></div>';
    return;
  }

  var html = '<div class="space-y-3">';
  vtInbox.forEach(function(lead) {
    var scores = [
      { l: 'Kennzahlen', v: lead.score_kennzahlen },
      { l: 'Verkauf',     v: lead.score_verkauf },
      { l: 'Werkstatt',   v: lead.score_werkstatt },
      { l: 'Marketing',   v: lead.score_marketing },
      { l: 'Mitarbeiter', v: lead.score_mitarbeiter },
      { l: 'Einkauf',     v: lead.score_einkauf }
    ];

    html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">';
    html += '<div class="flex items-start justify-between">';
    html += '<div class="flex-1">';
    html += '<div class="flex items-center gap-3 mb-2">';
    html += '<h3 class="font-semibold text-gray-800">' + _escH(lead.name || 'Unbekannt') + '</h3>';
    html += '<span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Score: ' + (lead.score_gesamt || 0) + '</span>';
    if (lead.utm_source) html += '<span class="text-xs text-gray-400">' + _escH(lead.utm_source) + '</span>';
    html += '</div>';
    html += '<div class="text-sm text-gray-500 mb-3">';
    html += _escH(lead.stadt || '') + ' &middot; ' + _escH(lead.umsatz_label || '') + ' &middot; Marge: ' + _escH(lead.marge_label || '');
    html += '</div>';

    // Score-Balken
    html += '<div class="grid grid-cols-6 gap-2">';
    scores.forEach(function(s) {
      var pct = Math.min(100, Math.max(0, (s.v || 0)));
      var barColor = pct >= 70 ? 'bg-green-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400';
      html += '<div class="text-center">';
      html += '<div class="text-[10px] text-gray-400 mb-1">' + s.l + '</div>';
      html += '<div class="h-1.5 bg-gray-100 rounded-full"><div class="h-full rounded-full ' + barColor + '" style="width:' + pct + '%"></div></div>';
      html += '<div class="text-xs font-semibold mt-0.5">' + (s.v || 0) + '</div>';
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';

    // Aktionen
    html += '<div class="flex flex-col gap-2 ml-4">';
    html += '<button onclick="vtInboxToPipeline(\'' + lead.id + '\')" class="px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600">\u2192 Pipeline</button>';
    html += '<button onclick="vtInboxDismiss(\'' + lead.id + '\')" class="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Verwerfen</button>';
    html += '</div>';
    html += '</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// Inbox → Pipeline uebernehmen
async function vtInboxToPipeline(leadId) {
  var lead = vtInbox.find(function(l) { return l.id === leadId; });
  if (!lead) return;

  try {
    // crm_kontakte-Eintrag erstellen
    var resp = await _sb().from('crm_kontakte').insert({
      firmenname: lead.name || 'Unbekannt',
      stadt: lead.stadt,
      email: lead.email,
      telefon: lead.telefon,
      pipeline_phase: 'lead',
      pipeline_quelle: 'potentialanalyse',
      pipeline_score: lead.score_gesamt || 0,
      potential_check_id: lead.id,
      erstellt_von: _sbProfile().id
    }).select().single();

    if (resp.error) throw resp.error;

    // Lead-Status aktualisieren
    await _sb().from('potential_check_leads').update({ status: 'uebernommen' }).eq('id', leadId);

    vtInbox = vtInbox.filter(function(l) { return l.id !== leadId; });
    vtKontakte.unshift(resp.data);
    _showToast('Lead in Pipeline \u00fcbernommen', 'success');
    vtRenderInbox(document.getElementById('vtTabInbox'));
  } catch (err) {
    console.error('[hq-vertrieb] inboxToPipeline', err);
    _showToast('Fehler: ' + err.message, 'error');
  }
}

async function vtInboxDismiss(leadId) {
  try {
    await _sb().from('potential_check_leads').update({ status: 'verworfen' }).eq('id', leadId);
    vtInbox = vtInbox.filter(function(l) { return l.id !== leadId; });
    _showToast('Lead verworfen', 'info');
    vtRenderInbox(document.getElementById('vtTabInbox'));
  } catch (err) {
    _showToast('Fehler: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════
// PIPELINE (Kanban)
// ══════════════════════════════════════════

function vtRenderPipeline(el) {
  var aktiv = vtKontakte.filter(function(k) {
    return k.typ === 'interessent' && k.pipeline_phase !== 'gewonnen' && k.pipeline_phase !== 'verloren';
  });

  var html = '<div class="flex gap-3 overflow-x-auto pb-4" style="min-height:400px">';

  VT_PHASEN.forEach(function(phase) {
    var deals = aktiv.filter(function(k) { return k.pipeline_phase === phase.key; });

    html += '<div class="flex-shrink-0 w-64 bg-gray-50 rounded-xl p-3">';
    html += '<div class="flex items-center justify-between mb-3">';
    html += '<h3 class="text-sm font-semibold text-gray-700">' + phase.label + '</h3>';
    html += '<span class="text-xs px-2 py-0.5 rounded-full ' + phase.color + '">' + deals.length + '</span>';
    html += '</div>';

    html += '<div class="space-y-2">';
    if (deals.length === 0) {
      html += '<div class="text-xs text-gray-400 text-center py-4">Keine Deals</div>';
    }
    deals.forEach(function(d) {
      var quelleIcon = VT_QUELLEN_ICONS[d.pipeline_quelle] || '';
      html += '<div onclick="vtOpenDetail(\'' + d.id + '\')" class="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition">';
      html += '<div class="font-semibold text-sm text-gray-800 mb-1">' + _escH(d.firmenname) + '</div>';
      html += '<div class="text-xs text-gray-500">';
      if (d.stadt) html += _escH(d.stadt);
      if (d.inhaber) html += ' &middot; ' + _escH(d.inhaber);
      html += '</div>';
      html += '<div class="flex items-center justify-between mt-2">';
      if (d.pipeline_score) html += '<span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Score: ' + d.pipeline_score + '</span>';
      else html += '<span></span>';
      if (d.naechste_aktion_datum) {
        var isOverdue = new Date(d.naechste_aktion_datum) < new Date();
        html += '<span class="text-xs ' + (isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400') + '">' + d.naechste_aktion_datum + '</span>';
      }
      if (quelleIcon) html += '<span class="text-sm">' + quelleIcon + '</span>';
      html += '</div></div>';
    });
    html += '</div></div>';
  });

  // Gewonnen / Verloren Spalten (kompakt)
  var gewonnen = vtKontakte.filter(function(k) { return k.pipeline_phase === 'gewonnen'; });
  var verloren = vtKontakte.filter(function(k) { return k.pipeline_phase === 'verloren'; });

  html += '<div class="flex-shrink-0 w-48 bg-green-50 rounded-xl p-3">';
  html += '<h3 class="text-sm font-semibold text-green-700 mb-3">Gewonnen (' + gewonnen.length + ')</h3>';
  html += '<div class="space-y-1">';
  gewonnen.slice(0, 10).forEach(function(d) {
    html += '<div onclick="vtOpenDetail(\'' + d.id + '\')" class="text-xs text-green-800 bg-white rounded px-2 py-1.5 cursor-pointer hover:bg-green-100">' + _escH(d.firmenname) + '</div>';
  });
  if (gewonnen.length > 10) html += '<div class="text-xs text-green-500 mt-1">+' + (gewonnen.length - 10) + ' weitere</div>';
  html += '</div></div>';

  html += '<div class="flex-shrink-0 w-48 bg-red-50 rounded-xl p-3">';
  html += '<h3 class="text-sm font-semibold text-red-700 mb-3">Verloren (' + verloren.length + ')</h3>';
  html += '<div class="space-y-1">';
  verloren.slice(0, 5).forEach(function(d) {
    html += '<div class="text-xs text-red-800 bg-white rounded px-2 py-1.5">' + _escH(d.firmenname) + '</div>';
  });
  if (verloren.length > 5) html += '<div class="text-xs text-red-500 mt-1">+' + (verloren.length - 5) + ' weitere</div>';
  html += '</div></div>';

  html += '</div>';
  el.innerHTML = html;
}

// ══════════════════════════════════════════
// DETAIL-ANSICHT
// ══════════════════════════════════════════

async function vtOpenDetail(kontaktId) {
  var k = vtKontakte.find(function(c) { return c.id === kontaktId; });
  if (!k) return;
  vtDetail = k;
  vtDetailTab = 'uebersicht';

  // Parallele Daten laden
  var [aktResp, meetResp, todoResp, pclResp] = await Promise.all([
    _sb().from('crm_aktivitaeten').select('*').eq('kontakt_id', k.id).order('datum', { ascending: false }).limit(50),
    _sb().from('crm_meetings').select('*').eq('kontakt_id', k.id).order('datum', { ascending: false }),
    _sb().from('crm_vereinbarungen').select('*').eq('kontakt_id', k.id).order('erstellt_am', { ascending: false }),
    k.potential_check_id ? _sb().from('potential_check_leads').select('*').eq('id', k.potential_check_id).single() : Promise.resolve({ data: null })
  ]);

  vtDetail._aktivitaeten = aktResp.data || [];
  vtDetail._meetings = meetResp.data || [];
  vtDetail._todos = todoResp.data || [];
  vtDetail._pcl = pclResp.data;

  // Tabs + Detail verstecken, Detail anzeigen
  document.querySelectorAll('.vt-tab').forEach(function(c) { c.style.display = 'none'; });
  var detailEl = document.getElementById('vtDetail');
  if (detailEl) {
    detailEl.style.display = 'block';
    vtRenderDetail(detailEl);
  }
}

function vtRenderDetail(el) {
  var k = vtDetail;
  if (!k) return;

  var phase = VT_PHASEN.find(function(p) { return p.key === k.pipeline_phase; });
  var phaseLabel = phase ? phase.label : k.pipeline_phase;
  var phaseColor = phase ? phase.color : 'bg-gray-100 text-gray-600';
  if (k.pipeline_phase === 'gewonnen') { phaseLabel = 'Gewonnen'; phaseColor = 'bg-green-100 text-green-700'; }
  if (k.pipeline_phase === 'verloren') { phaseLabel = 'Verloren'; phaseColor = 'bg-red-100 text-red-700'; }

  var html = '';

  // Zur\u00fcck-Button
  html += '<button onclick="vtShowTab(\'' + vtTab + '\')" class="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1">';
  html += '\u2190 Zur\u00fcck</button>';

  // Header
  html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">';
  html += '<div class="flex items-center justify-between">';
  html += '<div>';
  html += '<h2 class="text-lg font-bold text-gray-800">' + _escH(k.firmenname) + '</h2>';
  html += '<div class="text-sm text-gray-500 mt-1">';
  if (k.inhaber) html += _escH(k.inhaber) + ' &middot; ';
  if (k.stadt) html += _escH(k.stadt) + ' &middot; ';
  if (k.pipeline_quelle) html += (VT_QUELLEN_ICONS[k.pipeline_quelle] || '') + ' ' + _escH(k.pipeline_quelle);
  html += '</div></div>';
  html += '<div class="flex items-center gap-3">';
  if (k.pipeline_score) html += '<span class="text-sm px-2 py-1 rounded bg-gray-100">Score: ' + k.pipeline_score + '</span>';
  html += '<span class="text-sm px-3 py-1 rounded-full font-semibold ' + phaseColor + '">' + phaseLabel + '</span>';
  html += '</div></div>';

  // Phase aendern Dropdown
  if (k.typ === 'interessent' && k.pipeline_phase !== 'gewonnen' && k.pipeline_phase !== 'verloren') {
    html += '<div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">';
    html += '<span class="text-xs text-gray-400">Phase \u00e4ndern:</span>';
    html += '<select id="vtPhaseSelect" onchange="vtChangePhase(this.value)" class="text-xs border border-gray-200 rounded px-2 py-1">';
    VT_PHASEN.forEach(function(p) {
      html += '<option value="' + p.key + '"' + (p.key === k.pipeline_phase ? ' selected' : '') + '>' + p.label + '</option>';
    });
    html += '<option value="gewonnen">\u2705 Gewonnen</option>';
    html += '<option value="verloren">\u274c Verloren</option>';
    html += '</select>';
    html += '</div>';
  }

  // Gewonnen → Partner anlegen
  if (k.pipeline_phase === 'gewonnen' && !k.standort_id) {
    html += '<div class="mt-3 pt-3 border-t border-gray-100">';
    html += '<button onclick="vtCreatePartner(\'' + k.id + '\')" class="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600">';
    html += '\u2192 Partner anlegen & Onboarding starten</button></div>';
  }
  html += '</div>';

  // N\u00e4chste Aktion
  if (k.naechste_aktion) {
    var isOverdue = k.naechste_aktion_datum && new Date(k.naechste_aktion_datum) < new Date();
    html += '<div class="rounded-xl p-3 mb-4 ' + (isOverdue ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200') + '">';
    html += '<div class="text-xs font-semibold ' + (isOverdue ? 'text-red-600' : 'text-yellow-700') + ' mb-1">N\u00e4chste Aktion' +
      (k.naechste_aktion_datum ? ' (' + k.naechste_aktion_datum + ')' : '') + '</div>';
    html += '<div class="text-sm text-gray-700">' + _escH(k.naechste_aktion) + '</div>';
    html += '</div>';
  }

  // Detail-Tabs
  var dTabs = [
    { key: 'uebersicht',   label: '\u00dcbersicht' },
    { key: 'aktivitaeten', label: 'Aktivit\u00e4ten (' + (k._aktivitaeten || []).length + ')' },
    { key: 'meetings',     label: 'Meetings (' + (k._meetings || []).length + ')' },
    { key: 'todos',        label: 'To-dos (' + ((k._todos || []).filter(function(t) { return t.status !== 'erledigt' && t.status !== 'storniert'; }).length) + ')' }
  ];

  html += '<div class="border-b border-gray-200 mb-4"><nav class="flex space-x-4">';
  dTabs.forEach(function(t) {
    var active = t.key === vtDetailTab;
    html += '<button onclick="vtShowDetailTab(\'' + t.key + '\')" class="whitespace-nowrap py-2 px-1 border-b-2 text-xs font-semibold ' +
      (active ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700') + '">' + t.label + '</button>';
  });
  html += '</nav></div>';

  html += '<div id="vtDetailContent"></div>';
  el.innerHTML = html;
  vtRenderDetailContent();
}

function vtRenderDetailContent() {
  var el = document.getElementById('vtDetailContent');
  if (!el || !vtDetail) return;

  if (vtDetailTab === 'uebersicht') vtRenderDetailUebersicht(el);
  else if (vtDetailTab === 'aktivitaeten') vtRenderDetailAktivitaeten(el);
  else if (vtDetailTab === 'meetings') vtRenderDetailMeetings(el);
  else if (vtDetailTab === 'todos') vtRenderDetailTodos(el);
}

function vtShowDetailTab(tab) {
  vtDetailTab = tab;
  // Update tab buttons
  var detailEl = document.getElementById('vtDetail');
  if (detailEl) {
    detailEl.querySelectorAll('nav button').forEach(function(b) {
      var isActive = b.textContent.toLowerCase().indexOf(tab.substring(0, 4)) !== -1;
      if (tab === 'uebersicht') isActive = b.textContent.indexOf('bersicht') !== -1;
      b.className = 'whitespace-nowrap py-2 px-1 border-b-2 text-xs font-semibold ' +
        (isActive ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700');
    });
  }
  vtRenderDetailContent();
}

// Detail: \u00dcbersicht
function vtRenderDetailUebersicht(el) {
  var k = vtDetail;
  var html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';

  // Kontaktdaten
  html += '<div class="bg-white rounded-xl border border-gray-100 p-4">';
  html += '<h4 class="text-sm font-semibold text-gray-700 mb-3">Kontaktdaten</h4>';
  html += vtInfoRow('Firma', k.firmenname);
  html += vtInfoRow('Inhaber', k.inhaber);
  html += vtInfoRow('Adresse', [k.strasse, k.plz, k.stadt, k.bundesland].filter(Boolean).join(', '));
  html += vtInfoRow('Telefon', k.telefon);
  html += vtInfoRow('E-Mail', k.email);
  html += vtInfoRow('Website', k.website);
  html += vtInfoRow('Quelle', k.pipeline_quelle);
  html += vtInfoRow('Letzter Kontakt', k.letzter_kontakt ? new Date(k.letzter_kontakt).toLocaleDateString('de-DE') : '-');
  html += '</div>';

  // Potentialanalyse Scores
  if (k._pcl) {
    html += '<div class="bg-white rounded-xl border border-gray-100 p-4">';
    html += '<h4 class="text-sm font-semibold text-gray-700 mb-3">Potentialanalyse</h4>';
    var scores = [
      { l: 'Kennzahlen', v: k._pcl.score_kennzahlen },
      { l: 'Verkauf', v: k._pcl.score_verkauf },
      { l: 'Werkstatt', v: k._pcl.score_werkstatt },
      { l: 'Marketing', v: k._pcl.score_marketing },
      { l: 'Mitarbeiter', v: k._pcl.score_mitarbeiter },
      { l: 'Einkauf', v: k._pcl.score_einkauf }
    ];
    scores.forEach(function(s) {
      var pct = Math.min(100, Math.max(0, (s.v || 0)));
      var barColor = pct >= 70 ? 'bg-green-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400';
      html += '<div class="flex items-center gap-3 mb-2">';
      html += '<span class="text-xs text-gray-500 w-20">' + s.l + '</span>';
      html += '<div class="flex-1 h-2 bg-gray-100 rounded-full"><div class="h-full rounded-full ' + barColor + '" style="width:' + pct + '%"></div></div>';
      html += '<span class="text-xs font-semibold w-8 text-right">' + (s.v || 0) + '</span>';
      html += '</div>';
    });
    html += '<div class="mt-3 pt-2 border-t border-gray-100 text-sm font-semibold text-gray-700">Gesamt: ' + (k._pcl.score_gesamt || 0) + '</div>';
    html += '</div>';
  }

  html += '</div>';

  // Notizen
  html += '<div class="bg-white rounded-xl border border-gray-100 p-4 mt-4">';
  html += '<h4 class="text-sm font-semibold text-gray-700 mb-2">Interne Notizen</h4>';
  html += '<textarea id="vtNotizen" class="w-full border border-gray-200 rounded-lg p-2 text-sm" rows="3" placeholder="Notizen...">' + _escH(k.interne_notizen || '') + '</textarea>';
  html += '<button onclick="vtSaveNotizen()" class="mt-2 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg">Speichern</button>';
  html += '</div>';

  el.innerHTML = html;
}

function vtInfoRow(label, value) {
  return '<div class="flex justify-between py-1.5 border-b border-gray-50 last:border-0">' +
    '<span class="text-xs text-gray-400">' + label + '</span>' +
    '<span class="text-sm text-gray-700">' + _escH(value || '-') + '</span></div>';
}

// Detail: Aktivit\u00e4ten
function vtRenderDetailAktivitaeten(el) {
  var items = vtDetail._aktivitaeten || [];

  var html = '<button onclick="vtAddAktivitaet()" class="mb-4 px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600">+ Aktivit\u00e4t hinzuf\u00fcgen</button>';
  html += '<div id="vtAktForm" style="display:none" class="bg-gray-50 rounded-xl p-4 mb-4"></div>';

  if (items.length === 0) {
    html += '<div class="text-center py-8 text-gray-400 text-sm">Noch keine Aktivit\u00e4ten dokumentiert.</div>';
    el.innerHTML = html;
    return;
  }

  html += '<div class="space-y-3">';
  items.forEach(function(a) {
    var typColors = {
      anruf: 'bg-blue-100 text-blue-700', email: 'bg-cyan-100 text-cyan-700',
      vor_ort: 'bg-green-100 text-green-700', angebot_gesendet: 'bg-purple-100 text-purple-700',
      lead_eingang: 'bg-orange-100 text-orange-700', phase_geaendert: 'bg-yellow-100 text-yellow-700',
      notiz: 'bg-gray-100 text-gray-700', sonstiges: 'bg-gray-100 text-gray-600'
    };
    var color = typColors[a.typ] || 'bg-gray-100 text-gray-600';
    html += '<div class="flex gap-3">';
    html += '<div class="text-xs text-gray-400 w-20 flex-shrink-0 pt-1">' + new Date(a.datum).toLocaleDateString('de-DE') + '</div>';
    html += '<div class="flex-1 bg-white rounded-lg border border-gray-100 p-3">';
    html += '<div class="flex items-center gap-2 mb-1">';
    html += '<span class="text-xs px-2 py-0.5 rounded-full ' + color + '">' + _escH(a.typ) + '</span>';
    if (a.teilnehmer && a.teilnehmer.length) html += '<span class="text-xs text-gray-400">' + a.teilnehmer.join(', ') + '</span>';
    html += '</div>';
    html += '<div class="text-sm text-gray-700">' + _escH(a.zusammenfassung) + '</div>';
    html += '</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// Detail: Meetings
function vtRenderDetailMeetings(el) {
  var items = vtDetail._meetings || [];
  var html = '';
  if (items.length === 0) {
    html = '<div class="text-center py-8 text-gray-400 text-sm">Noch keine Meetings geplant.</div>';
    el.innerHTML = html;
    return;
  }

  html += '<div class="space-y-2">';
  items.forEach(function(m) {
    html += '<div class="bg-white rounded-lg border border-gray-100 p-3 flex justify-between items-start">';
    html += '<div>';
    html += '<div class="font-semibold text-sm">' + _escH(m.thema) + '</div>';
    html += '<div class="text-xs text-gray-500 mt-1">' + _escH(m.typ) + (m.ort ? ' \u2022 ' + _escH(m.ort) : '') + '</div>';
    html += '</div>';
    html += '<div class="text-xs text-gray-400">' + new Date(m.datum).toLocaleDateString('de-DE') + '</div>';
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// Detail: To-dos
function vtRenderDetailTodos(el) {
  var items = (vtDetail._todos || []).filter(function(t) { return t.status !== 'storniert'; });
  var html = '';
  if (items.length === 0) {
    html = '<div class="text-center py-8 text-gray-400 text-sm">Keine offenen Vereinbarungen.</div>';
    el.innerHTML = html;
    return;
  }

  html += '<div class="space-y-2">';
  items.forEach(function(t) {
    var isDone = t.status === 'erledigt';
    var prioColors = { hoch: 'text-red-500', mittel: 'text-yellow-500', niedrig: 'text-gray-400' };
    html += '<div class="bg-white rounded-lg border border-gray-100 p-3 flex items-start gap-3 ' + (isDone ? 'opacity-50' : '') + '">';
    html += '<input type="checkbox" ' + (isDone ? 'checked' : '') + ' onchange="vtToggleTodo(\'' + t.id + '\')" class="mt-1">';
    html += '<div class="flex-1">';
    html += '<div class="text-sm ' + (isDone ? 'line-through text-gray-400' : 'text-gray-700') + '">' + _escH(t.beschreibung) + '</div>';
    html += '<div class="text-xs text-gray-400 mt-1">';
    if (t.faellig_am) html += 'F\u00e4llig: ' + t.faellig_am + ' \u2022 ';
    html += '<span class="' + (prioColors[t.prioritaet] || '') + '">' + (t.prioritaet || 'mittel') + '</span>';
    html += '</div></div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// ══════════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════════

async function vtChangePhase(newPhase) {
  if (!vtDetail) return;
  try {
    var update = { pipeline_phase: newPhase };
    if (newPhase === 'verloren') {
      var grund = prompt('Grund f\u00fcr Verlust:');
      if (grund) update.pipeline_verloren_grund = grund;
    }
    var resp = await _sb().from('crm_kontakte').update(update).eq('id', vtDetail.id).select().single();
    if (resp.error) throw resp.error;

    // Lokalen State aktualisieren
    var idx = vtKontakte.findIndex(function(k) { return k.id === vtDetail.id; });
    if (idx !== -1) vtKontakte[idx] = Object.assign(vtKontakte[idx], resp.data);
    vtDetail = vtKontakte[idx] || vtDetail;
    vtDetail._aktivitaeten = vtDetail._aktivitaeten || [];
    vtDetail._meetings = vtDetail._meetings || [];
    vtDetail._todos = vtDetail._todos || [];
    vtDetail._pcl = vtDetail._pcl || null;

    _showToast('Phase ge\u00e4ndert: ' + newPhase, 'success');
    vtRenderDetail(document.getElementById('vtDetail'));
  } catch (err) {
    _showToast('Fehler: ' + err.message, 'error');
  }
}

async function vtSaveNotizen() {
  if (!vtDetail) return;
  var el = document.getElementById('vtNotizen');
  if (!el) return;
  try {
    await _sb().from('crm_kontakte').update({ interne_notizen: el.value }).eq('id', vtDetail.id);
    vtDetail.interne_notizen = el.value;
    _showToast('Notizen gespeichert', 'success');
  } catch (err) {
    _showToast('Fehler: ' + err.message, 'error');
  }
}

function vtAddAktivitaet() {
  var form = document.getElementById('vtAktForm');
  if (!form) return;
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
  if (form.style.display === 'block') {
    form.innerHTML = '<div class="space-y-3">' +
      '<select id="vtAktTyp" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">' +
      '<option value="anruf">Anruf</option><option value="email">E-Mail</option>' +
      '<option value="vor_ort">Vor Ort</option><option value="angebot_gesendet">Angebot gesendet</option>' +
      '<option value="notiz">Notiz</option><option value="sonstiges">Sonstiges</option></select>' +
      '<textarea id="vtAktText" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows="2" placeholder="Zusammenfassung..."></textarea>' +
      '<div class="flex gap-2">' +
      '<button onclick="vtSaveAktivitaet()" class="px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600">Speichern</button>' +
      '<button onclick="document.getElementById(\'vtAktForm\').style.display=\'none\'" class="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg">Abbrechen</button>' +
      '</div></div>';
  }
}

async function vtSaveAktivitaet() {
  if (!vtDetail) return;
  var typ = document.getElementById('vtAktTyp');
  var text = document.getElementById('vtAktText');
  if (!typ || !text || !text.value.trim()) { _showToast('Zusammenfassung eingeben', 'error'); return; }

  try {
    var resp = await _sb().from('crm_aktivitaeten').insert({
      kontakt_id: vtDetail.id,
      typ: typ.value,
      zusammenfassung: text.value.trim(),
      erstellt_von: _sbProfile().id
    }).select().single();
    if (resp.error) throw resp.error;

    vtDetail._aktivitaeten.unshift(resp.data);
    document.getElementById('vtAktForm').style.display = 'none';
    _showToast('Aktivit\u00e4t gespeichert', 'success');
    vtRenderDetailAktivitaeten(document.getElementById('vtDetailContent'));
  } catch (err) {
    _showToast('Fehler: ' + err.message, 'error');
  }
}

async function vtToggleTodo(todoId) {
  var todo = (vtDetail._todos || []).find(function(t) { return t.id === todoId; });
  if (!todo) return;
  var newStatus = todo.status === 'erledigt' ? 'offen' : 'erledigt';
  try {
    await _sb().from('crm_vereinbarungen').update({
      status: newStatus,
      erledigt_am: newStatus === 'erledigt' ? new Date().toISOString() : null
    }).eq('id', todoId);
    todo.status = newStatus;
    vtRenderDetailTodos(document.getElementById('vtDetailContent'));
  } catch (err) {
    _showToast('Fehler: ' + err.message, 'error');
  }
}

async function vtCreatePartner(kontaktId) {
  if (!confirm('Partner-Standort anlegen und Onboarding starten?')) return;
  var k = vtKontakte.find(function(c) { return c.id === kontaktId; });
  if (!k) return;

  try {
    // Standort anlegen
    var sResp = await _sb().from('standorte').insert({
      name: k.firmenname,
      inhaber_name: k.inhaber,
      telefon: k.telefon,
      status: 'aktiv',
      is_demo: false,
      partner_status: 'gruen'
    }).select().single();
    if (sResp.error) throw sResp.error;

    // crm_kontakte aktualisieren
    await _sb().from('crm_kontakte').update({
      typ: 'partner',
      standort_id: sResp.data.id
    }).eq('id', kontaktId);

    k.typ = 'partner';
    k.standort_id = sResp.data.id;
    _showToast('Partner angelegt! Standort: ' + sResp.data.name, 'success');
    vtRenderDetail(document.getElementById('vtDetail'));
  } catch (err) {
    _showToast('Fehler: ' + err.message, 'error');
  }
}

// ── Window Exports ──
var _vtExports = {
  renderHqVertrieb: renderHqVertrieb,
  vtShowTab: vtShowTab,
  vtShowDetailTab: vtShowDetailTab,
  vtOpenDetail: vtOpenDetail,
  vtChangePhase: vtChangePhase,
  vtSaveNotizen: vtSaveNotizen,
  vtAddAktivitaet: vtAddAktivitaet,
  vtSaveAktivitaet: vtSaveAktivitaet,
  vtToggleTodo: vtToggleTodo,
  vtInboxToPipeline: vtInboxToPipeline,
  vtInboxDismiss: vtInboxDismiss,
  vtCreatePartner: vtCreatePartner
};
Object.entries(_vtExports).forEach(function(e) { window[e[0]] = e[1]; });
