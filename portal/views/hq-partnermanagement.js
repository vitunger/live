/**
 * views/hq-partnermanagement.js - HQ Partnermanagement
 * Zentrales Dossier pro Partner. Ersetzt hqStandorte.
 *
 * Sektionen: Beziehung | Planung | Operativ | Betreuung
 * Tabellen: standorte, v_partner_health, crm_watchpoints, partner_journal,
 *   partner_jahresziele, partner_monatsplan, jahresplaene, plan_umsaetze,
 *   plan_personal, plan_bwa_daten, einkauf_strategien, marketing_vereinbarungen,
 *   support_tickets, standort_services, standort_plz_gebiete,
 *   onboarding_fortschritt, onboarding_schritte
 *
 * @module views/hq-partnermanagement
 */

// ── Safe Helpers ──
function _sb()           { return window.sb; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }

// ── State ──
var pmPartners = [];
var pmLoaded = false;
var pmSearch = '';
var pmDetail = null;      // aktuell geoeffneter Partner
var pmDetailSection = 'beziehung';
var pmDetailTab = '';

// ══════════════════════════════════════════
// MAIN RENDER
// ══════════════════════════════════════════

export async function renderHqPartnermanagement() {
  var el = document.getElementById('hqPartnermanagementView');
  if (!el) return;

  if (!pmLoaded) {
    el.innerHTML = '<div class="p-6 text-gray-400">L\u00e4dt...</div>';
    await pmLoadPartners();
  }

  if (pmDetail) {
    pmRenderDetail(el);
  } else {
    pmRenderUebersicht(el);
  }
}

async function pmLoadPartners() {
  try {
    var resp = await _sb().from('v_partner_health').select('*');
    pmPartners = resp.data || [];
    pmLoaded = true;
  } catch (err) {
    console.error('[hq-pm] loadPartners', err);
    _showToast('Fehler beim Laden der Partnerdaten', 'error');
  }
}

// ══════════════════════════════════════════
// UEBERSICHT
// ══════════════════════════════════════════

function pmRenderUebersicht(el) {
  var html = '<div class="p-4 md:p-6">';
  html += '<h1 class="text-xl font-bold text-gray-800 mb-4">Partnermanagement</h1>';

  // KPIs
  var total = pmPartners.length;
  var rot = pmPartners.filter(function(p) { return p.partner_status === 'rot'; }).length;
  var gelb = pmPartners.filter(function(p) { return p.partner_status === 'gelb'; }).length;
  var offeneTickets = pmPartners.reduce(function(s, p) { return s + (p.offene_tickets || 0); }, 0);
  var kritWp = pmPartners.reduce(function(s, p) { return s + (p.kritische_watchpoints || 0); }, 0);

  html += '<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">';
  html += pmKpiCard('Partner', total, 'text-gray-700', 'bg-gray-50');
  html += pmKpiCard('Kritisch', rot, 'text-red-600', 'bg-red-50');
  html += pmKpiCard('Beobachten', gelb, 'text-yellow-600', 'bg-yellow-50');
  html += pmKpiCard('Offene Tickets', offeneTickets, 'text-blue-600', 'bg-blue-50');
  html += pmKpiCard('Krit. Watchpoints', kritWp, 'text-orange-600', 'bg-orange-50');
  html += '</div>';

  // Suche
  html += '<div class="mb-4">';
  html += '<input type="text" id="pmSearchInput" value="' + _escH(pmSearch) + '" oninput="pmFilterList(this.value)" placeholder="Partner suchen..." class="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64">';
  html += '</div>';

  // Partnerliste
  var filtered = pmPartners.filter(function(p) {
    if (!pmSearch) return true;
    var q = pmSearch.toLowerCase();
    return (p.name || '').toLowerCase().indexOf(q) !== -1 ||
      (p.inhaber_name || '').toLowerCase().indexOf(q) !== -1 ||
      (p.region || '').toLowerCase().indexOf(q) !== -1;
  });

  html += '<div class="space-y-2">';
  if (filtered.length === 0) {
    html += '<div class="text-center py-8 text-gray-400">Keine Partner gefunden.</div>';
  }
  filtered.forEach(function(p) {
    var ampel = { rot: '\ud83d\udd34', gelb: '\ud83d\udfe1', gruen: '\ud83d\udfe2' };
    var ampelIcon = ampel[p.partner_status] || ampel.gruen;
    var stimmungIcons = { gut: '\ud83d\ude0a', neutral: '\ud83d\ude10', schlecht: '\ud83d\ude1f' };
    var stimmungIcon = stimmungIcons[p.letzte_stimmung] || '';

    html += '<div onclick="pmOpenDetail(\'' + p.id + '\')" class="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition">';
    html += '<div class="flex items-center gap-3">';
    html += '<span class="text-lg">' + ampelIcon + '</span>';
    html += '<div>';
    html += '<div class="font-semibold text-gray-800">' + _escH(p.name) + '</div>';
    html += '<div class="text-xs text-gray-500">';
    if (p.inhaber_name) html += _escH(p.inhaber_name) + ' &middot; ';
    if (p.region) html += _escH(p.region);
    if (p.is_premium) html += ' &middot; <span class="text-orange-500 font-semibold">Premium</span>';
    html += '</div></div></div>';

    // Indikatoren
    html += '<div class="flex items-center gap-3">';
    if (p.offene_tickets > 0) html += '<span class="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">' + p.offene_tickets + ' Tickets</span>';
    if (p.kritische_watchpoints > 0) html += '<span class="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">' + p.kritische_watchpoints + ' Watchpoints</span>';
    if (p.gefaehrdete_ziele > 0) html += '<span class="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">' + p.gefaehrdete_ziele + ' gef. Ziele</span>';
    if (stimmungIcon) html += '<span class="text-lg" title="Letzte Stimmung">' + stimmungIcon + '</span>';
    html += '</div></div>';
  });
  html += '</div></div>';

  el.innerHTML = html;
}

function pmKpiCard(label, value, textColor, bgColor) {
  return '<div class="' + bgColor + ' rounded-xl p-4 text-center">' +
    '<div class="text-2xl font-bold ' + textColor + '">' + value + '</div>' +
    '<div class="text-xs text-gray-500 mt-1">' + _escH(label) + '</div></div>';
}

function pmFilterList(q) {
  pmSearch = q;
  var el = document.getElementById('hqPartnermanagementView');
  if (el && !pmDetail) pmRenderUebersicht(el);
}

// ══════════════════════════════════════════
// DETAIL-ANSICHT
// ══════════════════════════════════════════

async function pmOpenDetail(standortId) {
  pmDetail = { id: standortId, _data: {} };
  pmDetailSection = 'beziehung';
  pmDetailTab = 'protokolle';

  var el = document.getElementById('hqPartnermanagementView');
  if (el) el.innerHTML = '<div class="p-6 text-gray-400">L\u00e4dt Partner-Details...</div>';

  // Stammdaten laden
  try {
    var resp = await _sb().from('standorte').select('*').eq('id', standortId).single();
    if (resp.error) throw resp.error;
    pmDetail._standort = resp.data;
  } catch (err) {
    _showToast('Fehler beim Laden', 'error');
    pmDetail = null;
    return;
  }

  if (el) pmRenderDetail(el);
}

function pmRenderDetail(el) {
  var s = pmDetail._standort;
  if (!s) return;

  var html = '<div class="p-4 md:p-6">';

  // Zurueck
  html += '<button onclick="pmBackToList()" class="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1">\u2190 Alle Partner</button>';

  // Header
  var ampel = { rot: '\ud83d\udd34', gelb: '\ud83d\udfe1', gruen: '\ud83d\udfe2' };
  html += '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">';
  html += '<div class="flex items-center justify-between">';
  html += '<div class="flex items-center gap-3">';
  html += '<span class="text-2xl">' + (ampel[s.partner_status] || ampel.gruen) + '</span>';
  html += '<div>';
  html += '<h2 class="text-lg font-bold text-gray-800">' + _escH(s.name) + '</h2>';
  html += '<div class="text-sm text-gray-500">' + _escH(s.inhaber_name || '') + (s.region ? ' &middot; ' + _escH(s.region) : '') + '</div>';
  html += '</div></div>';

  // Ampel aendern
  html += '<div class="flex items-center gap-2">';
  html += '<select id="pmAmpelSelect" onchange="pmChangeAmpel(this.value)" class="text-xs border border-gray-200 rounded px-2 py-1">';
  ['gruen', 'gelb', 'rot'].forEach(function(val) {
    var labels = { gruen: '\ud83d\udfe2 Gr\u00fcn', gelb: '\ud83d\udfe1 Gelb', rot: '\ud83d\udd34 Rot' };
    html += '<option value="' + val + '"' + (s.partner_status === val ? ' selected' : '') + '>' + labels[val] + '</option>';
  });
  html += '</select>';
  html += '</div></div></div>';

  // Sektions-Navigation
  var sections = [
    { key: 'beziehung', label: '\ud83d\udcac Beziehung', tabs: ['protokolle', 'meetings', 'watchpoints'] },
    { key: 'planung',   label: '\ud83c\udfaf Planung',   tabs: ['jahresziele', 'monatsplan', 'businessplan', 'einkaufsstrategie'] },
    { key: 'operativ',  label: '\u2699\ufe0f Operativ',  tabs: ['stammdaten', 'services', 'plz', 'marketing'] },
    { key: 'betreuung', label: '\ud83d\uded1 Betreuung', tabs: ['tickets', 'onboarding'] }
  ];

  html += '<div class="flex gap-2 mb-4 overflow-x-auto">';
  sections.forEach(function(sec) {
    var active = pmDetailSection === sec.key;
    html += '<button onclick="pmShowSection(\'' + sec.key + '\')" class="whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold ' +
      (active ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + '">' + sec.label + '</button>';
  });
  html += '</div>';

  // Tab-Navigation innerhalb Sektion
  var curSection = sections.find(function(sec) { return sec.key === pmDetailSection; });
  if (curSection) {
    if (!pmDetailTab || curSection.tabs.indexOf(pmDetailTab) === -1) pmDetailTab = curSection.tabs[0];

    html += '<div class="border-b border-gray-200 mb-4"><nav class="flex space-x-4">';
    curSection.tabs.forEach(function(tab) {
      var active = pmDetailTab === tab;
      var label = pmTabLabel(tab);
      html += '<button onclick="pmShowTab(\'' + tab + '\')" class="whitespace-nowrap py-2 px-1 border-b-2 text-xs font-semibold ' +
        (active ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700') + '">' + label + '</button>';
    });
    html += '</nav></div>';
  }

  html += '<div id="pmTabContent"></div>';
  html += '</div>';
  el.innerHTML = html;

  // Tab-Inhalt laden
  pmLoadTabContent();
}

function pmTabLabel(tab) {
  var labels = {
    protokolle: 'Protokolle', meetings: 'Meetings', watchpoints: 'Watchpoints',
    jahresziele: 'Jahresziele', monatsplan: 'Monatsplan', businessplan: 'Businessplan', einkaufsstrategie: 'Einkaufsstrategie',
    stammdaten: 'Stammdaten', services: 'Services', plz: 'PLZ-Gebiete', marketing: 'Marketing-Vereinb.',
    tickets: 'Tickets', onboarding: 'Onboarding'
  };
  return labels[tab] || tab;
}

function pmShowSection(section) {
  pmDetailSection = section;
  pmDetailTab = '';
  var el = document.getElementById('hqPartnermanagementView');
  if (el) pmRenderDetail(el);
}

function pmShowTab(tab) {
  pmDetailTab = tab;
  // Update tab buttons
  var el = document.getElementById('hqPartnermanagementView');
  if (el) {
    el.querySelectorAll('nav button').forEach(function(b) {
      var isActive = b.textContent === pmTabLabel(tab);
      b.className = 'whitespace-nowrap py-2 px-1 border-b-2 text-xs font-semibold ' +
        (isActive ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700');
    });
  }
  pmLoadTabContent();
}

// ══════════════════════════════════════════
// TAB CONTENT LOADER
// ══════════════════════════════════════════

async function pmLoadTabContent() {
  var el = document.getElementById('pmTabContent');
  if (!el) return;
  el.innerHTML = '<div class="text-gray-400 text-sm py-4">L\u00e4dt...</div>';

  var sid = pmDetail.id;

  try {
    if (pmDetailTab === 'stammdaten') pmRenderStammdaten(el);
    else if (pmDetailTab === 'protokolle') await pmRenderProtokolle(el, sid);
    else if (pmDetailTab === 'watchpoints') await pmRenderWatchpoints(el, sid);
    else if (pmDetailTab === 'tickets') await pmRenderTickets(el, sid);
    else if (pmDetailTab === 'services') await pmRenderServices(el, sid);
    else if (pmDetailTab === 'plz') await pmRenderPlz(el, sid);
    else if (pmDetailTab === 'jahresziele') await pmRenderJahresziele(el, sid);
    else if (pmDetailTab === 'monatsplan') await pmRenderMonatsplan(el, sid);
    else if (pmDetailTab === 'businessplan') await pmRenderBusinessplan(el, sid);
    else if (pmDetailTab === 'einkaufsstrategie') await pmRenderEinkaufsstrategie(el, sid);
    else if (pmDetailTab === 'marketing') await pmRenderMarketing(el, sid);
    else if (pmDetailTab === 'meetings') await pmRenderMeetings(el, sid);
    else if (pmDetailTab === 'onboarding') await pmRenderOnboarding(el, sid);
    else el.innerHTML = '<div class="text-gray-400 text-sm py-4">Tab "' + pmDetailTab + '" wird noch entwickelt.</div>';
  } catch (err) {
    console.error('[hq-pm] tab ' + pmDetailTab, err);
    el.innerHTML = '<div class="text-red-500 text-sm py-4">Fehler: ' + _escH(err.message) + '</div>';
  }
}

// ── Stammdaten ──
function pmRenderStammdaten(el) {
  var s = pmDetail._standort;
  var html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';

  html += '<div class="bg-white rounded-xl border border-gray-100 p-4">';
  html += '<h4 class="text-sm font-semibold text-gray-700 mb-3">Basisdaten</h4>';
  html += pmInfoRow('Name', s.name);
  html += pmInfoRow('Firma', s.firma_name);
  html += pmInfoRow('Inhaber', s.inhaber_name);
  html += pmInfoRow('Region', s.region);
  html += pmInfoRow('Status', s.status);
  html += pmInfoRow('Premium', s.is_premium ? 'Ja' : 'Nein');
  html += pmInfoRow('Billing', s.billing_status);
  html += '</div>';

  html += '<div class="bg-white rounded-xl border border-gray-100 p-4">';
  html += '<h4 class="text-sm font-semibold text-gray-700 mb-3">Kontakt & Betrieb</h4>';
  html += pmInfoRow('Adresse', s.adresse);
  html += pmInfoRow('Telefon', s.telefon);
  html += pmInfoRow('Warenwirtschaft', s.warenwirtschaft);
  html += pmInfoRow('Umsatzplan YTD', s.umsatz_plan_ytd ? _fmtN(s.umsatz_plan_ytd) + ' \u20ac' : '-');
  html += pmInfoRow('Marketing-Budget', s.marketing_budget ? _fmtN(s.marketing_budget) + ' \u20ac' : '-');
  html += pmInfoRow('Vororder-Status', s.vororder_status);
  html += pmInfoRow('Rabattquote', s.rabatt_quote ? s.rabatt_quote + '%' : '-');
  html += pmInfoRow('Strategie-Status', s.strategie_status);
  html += '</div>';

  html += '</div>';
  el.innerHTML = html;
}

function pmInfoRow(label, value) {
  return '<div class="flex justify-between py-1.5 border-b border-gray-50 last:border-0">' +
    '<span class="text-xs text-gray-400">' + label + '</span>' +
    '<span class="text-sm text-gray-700">' + _escH(String(value || '-')) + '</span></div>';
}

// ── Protokolle ──
async function pmRenderProtokolle(el, sid) {
  var resp = await _sb().from('partner_journal').select('*').eq('standort_id', sid).order('datum', { ascending: false });
  var items = resp.data || [];

  var html = '';
  if (items.length === 0) {
    html = '<div class="text-center py-12 text-gray-400">' +
      '<p class="text-lg mb-2">Noch keine Protokolle</p>' +
      '<p class="text-sm">Erstes Gespr\u00e4ch dokumentieren \u2192</p></div>';
    el.innerHTML = html;
    return;
  }

  html += '<div class="space-y-3">';
  items.forEach(function(p) {
    var stimmungColors = { gut: 'bg-green-100 text-green-700', neutral: 'bg-gray-100 text-gray-700', schlecht: 'bg-red-100 text-red-700' };
    var stColor = stimmungColors[p.stimmung] || 'bg-gray-100 text-gray-600';
    html += '<div class="bg-white rounded-xl border border-gray-100 p-4">';
    html += '<div class="flex items-center justify-between mb-2">';
    html += '<div class="text-sm font-semibold text-gray-700">' + (p.datum ? new Date(p.datum).toLocaleDateString('de-DE') : '-') + '</div>';
    html += '<span class="text-xs px-2 py-0.5 rounded-full ' + stColor + '">' + _escH(p.stimmung || '-') + '</span>';
    html += '</div>';
    if (p.aktuelle_lage) html += '<div class="text-sm text-gray-600 mb-2">' + _escH(p.aktuelle_lage) + '</div>';
    if (p.themen && p.themen.length) {
      html += '<div class="flex flex-wrap gap-1 mb-2">';
      p.themen.forEach(function(t) { html += '<span class="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">' + _escH(t) + '</span>'; });
      html += '</div>';
    }
    if (p.massnahmen && p.massnahmen.length) {
      html += '<div class="mt-2">';
      p.massnahmen.forEach(function(m) {
        var done = m.erledigt || m.done;
        html += '<div class="flex items-center gap-2 text-sm ' + (done ? 'text-gray-400 line-through' : 'text-gray-700') + '">';
        html += (done ? '\u2705' : '\u2b1c') + ' ' + _escH(typeof m === 'string' ? m : m.text || m.beschreibung || '') + '</div>';
      });
      html += '</div>';
    }
    if (p.naechster_termin) html += '<div class="text-xs text-gray-400 mt-2">N\u00e4chster Termin: ' + new Date(p.naechster_termin).toLocaleDateString('de-DE') + '</div>';
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// ── Watchpoints ──
async function pmRenderWatchpoints(el, sid) {
  var resp = await _sb().from('crm_watchpoints').select('*').eq('standort_id', sid).order('erstellt_am', { ascending: false });
  var items = resp.data || [];

  var html = '<button onclick="pmAddWatchpoint()" class="mb-4 px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600">+ Watchpoint</button>';
  html += '<div id="pmWpForm" style="display:none" class="bg-gray-50 rounded-xl p-4 mb-4"></div>';

  if (items.length === 0) {
    html += '<div class="text-center py-8 text-gray-400 text-sm">Keine Watchpoints. Alles l\u00e4uft!</div>';
    el.innerHTML = html;
    return;
  }

  html += '<div class="space-y-2">';
  items.forEach(function(w) {
    var prioColors = { hoch: 'border-l-4 border-l-red-400', mittel: 'border-l-4 border-l-yellow-400', niedrig: 'border-l-4 border-l-gray-300' };
    var border = prioColors[w.prioritaet] || '';
    html += '<div class="bg-white rounded-lg border border-gray-100 p-3 ' + border + ' ' + (!w.aktiv ? 'opacity-50' : '') + '">';
    html += '<div class="flex items-center justify-between">';
    html += '<div class="font-semibold text-sm text-gray-800">' + _escH(w.thema) + '</div>';
    html += '<div class="flex items-center gap-2">';
    if (w.aktiv) html += '<button onclick="pmResolveWatchpoint(\'' + w.id + '\')" class="text-xs text-green-600 hover:underline">L\u00f6sen</button>';
    else html += '<span class="text-xs text-gray-400">Gel\u00f6st ' + (w.geloest_am ? new Date(w.geloest_am).toLocaleDateString('de-DE') : '') + '</span>';
    html += '</div></div>';
    if (w.notiz) html += '<div class="text-xs text-gray-500 mt-1">' + _escH(w.notiz) + '</div>';
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

function pmAddWatchpoint() {
  var form = document.getElementById('pmWpForm');
  if (!form) return;
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
  if (form.style.display === 'block') {
    form.innerHTML = '<div class="space-y-3">' +
      '<input type="text" id="pmWpThema" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Thema...">' +
      '<select id="pmWpPrio" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">' +
      '<option value="mittel">Mittel</option><option value="hoch">Hoch</option><option value="niedrig">Niedrig</option></select>' +
      '<textarea id="pmWpNotiz" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows="2" placeholder="Notiz..."></textarea>' +
      '<div class="flex gap-2">' +
      '<button onclick="pmSaveWatchpoint()" class="px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600">Speichern</button>' +
      '<button onclick="document.getElementById(\'pmWpForm\').style.display=\'none\'" class="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg">Abbrechen</button>' +
      '</div></div>';
  }
}

async function pmSaveWatchpoint() {
  var thema = document.getElementById('pmWpThema');
  if (!thema || !thema.value.trim()) { _showToast('Thema eingeben', 'error'); return; }
  var prio = document.getElementById('pmWpPrio');
  var notiz = document.getElementById('pmWpNotiz');
  try {
    await _sb().from('crm_watchpoints').insert({
      standort_id: pmDetail.id,
      thema: thema.value.trim(),
      prioritaet: prio ? prio.value : 'mittel',
      notiz: notiz ? notiz.value : null,
      erstellt_von: _sbProfile().id
    });
    _showToast('Watchpoint erstellt', 'success');
    await pmRenderWatchpoints(document.getElementById('pmTabContent'), pmDetail.id);
  } catch (err) {
    _showToast('Fehler: ' + err.message, 'error');
  }
}

async function pmResolveWatchpoint(wpId) {
  try {
    await _sb().from('crm_watchpoints').update({ aktiv: false, geloest_am: new Date().toISOString() }).eq('id', wpId);
    _showToast('Watchpoint gel\u00f6st', 'success');
    await pmRenderWatchpoints(document.getElementById('pmTabContent'), pmDetail.id);
  } catch (err) {
    _showToast('Fehler: ' + err.message, 'error');
  }
}

// ── Tickets ──
async function pmRenderTickets(el, sid) {
  var resp = await _sb().from('support_tickets').select('id, ticket_nr, betreff, kategorie, status, prioritaet, richtung, erstellt_von, created_at, geloest_at')
    .eq('standort_id', sid).order('created_at', { ascending: false }).limit(50);
  var items = resp.data || [];

  var html = '<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-700">Verkn\u00fcpft mit bestehendem Ticketsystem. Tickets hier nur lesen.</div>';

  if (items.length === 0) {
    html += '<div class="text-center py-8 text-gray-400 text-sm">Keine Tickets f\u00fcr diesen Standort.</div>';
    el.innerHTML = html;
    return;
  }

  html += '<table class="w-full text-sm"><thead><tr class="text-xs text-gray-400 border-b">';
  html += '<th class="text-left py-2">Nr</th><th class="text-left py-2">Betreff</th><th class="text-left py-2">Kategorie</th><th class="text-left py-2">Status</th><th class="text-left py-2">Datum</th>';
  html += '</tr></thead><tbody>';

  items.forEach(function(t) {
    var statusColors = { offen: 'bg-yellow-100 text-yellow-700', in_bearbeitung: 'bg-blue-100 text-blue-700', geloest: 'bg-green-100 text-green-700', geschlossen: 'bg-gray-100 text-gray-500' };
    var sc = statusColors[t.status] || 'bg-gray-100 text-gray-600';
    html += '<tr class="border-b border-gray-50 hover:bg-gray-50">';
    html += '<td class="py-2 text-xs text-gray-400">' + _escH(t.ticket_nr || '-') + '</td>';
    html += '<td class="py-2">' + _escH(t.betreff || '-') + '</td>';
    html += '<td class="py-2 text-xs">' + _escH(t.kategorie || '-') + '</td>';
    html += '<td class="py-2"><span class="text-xs px-2 py-0.5 rounded-full ' + sc + '">' + _escH(t.status) + '</span></td>';
    html += '<td class="py-2 text-xs text-gray-400">' + (t.created_at ? new Date(t.created_at).toLocaleDateString('de-DE') : '-') + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table>';
  el.innerHTML = html;
}

// ── Services ──
async function pmRenderServices(el, sid) {
  var resp = await _sb().from('standort_services').select('*').eq('standort_id', sid).order('product_key');
  var items = resp.data || [];

  if (items.length === 0) {
    el.innerHTML = '<div class="text-center py-8 text-gray-400 text-sm">Keine Services konfiguriert.</div>';
    return;
  }

  var html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
  items.forEach(function(svc) {
    html += '<div class="bg-white rounded-lg border border-gray-100 p-3">';
    html += '<div class="flex items-center justify-between">';
    html += '<span class="font-semibold text-sm">' + _escH(svc.product_key) + '</span>';
    html += '<span class="text-xs px-2 py-0.5 rounded-full ' + (svc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500') + '">' + (svc.is_active ? 'Aktiv' : 'Inaktiv') + '</span>';
    html += '</div>';
    html += '<div class="text-xs text-gray-500 mt-1">';
    if (svc.quantity) html += 'Menge: ' + svc.quantity + ' &middot; ';
    if (svc.custom_price) html += _fmtN(svc.custom_price) + ' \u20ac &middot; ';
    if (svc.activated_at) html += 'Seit: ' + new Date(svc.activated_at).toLocaleDateString('de-DE');
    html += '</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// ── PLZ-Gebiete ──
async function pmRenderPlz(el, sid) {
  var resp = await _sb().from('standort_plz_gebiete').select('plz, ort, bundesland', { count: 'exact' }).eq('standort_id', sid).order('plz').limit(100);
  var items = resp.data || [];
  var total = resp.count || items.length;

  var html = '<div class="text-sm text-gray-600 mb-3">' + total + ' PLZ-Gebiete zugewiesen</div>';
  html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-2">';
  items.forEach(function(p) {
    html += '<div class="bg-white rounded border border-gray-100 px-3 py-2 text-sm">';
    html += '<span class="font-semibold">' + _escH(p.plz) + '</span> <span class="text-gray-500">' + _escH(p.ort || '') + '</span>';
    html += '</div>';
  });
  if (total > 100) html += '<div class="col-span-full text-xs text-gray-400 text-center">+' + (total - 100) + ' weitere</div>';
  html += '</div>';
  el.innerHTML = html;
}

// ── Jahresziele ──
async function pmRenderJahresziele(el, sid) {
  var resp = await _sb().from('partner_jahresziele').select('*').eq('standort_id', sid).order('jahr', { ascending: false });
  var items = resp.data || [];

  if (items.length === 0) {
    el.innerHTML = '<div class="text-center py-8 text-gray-400"><p class="text-lg mb-2">Keine Jahresziele</p><p class="text-sm">Ziele f\u00fcr diesen Partner definieren \u2192</p></div>';
    return;
  }

  var html = '<div class="space-y-3">';
  items.forEach(function(z) {
    var pct = z.zielwert > 0 ? Math.round((z.aktueller_wert || 0) / z.zielwert * 100) : 0;
    var barColor = z.status === 'gefaehrdet' ? 'bg-red-400' : pct >= 75 ? 'bg-green-400' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400';
    var statusBadge = { erreicht: 'bg-green-100 text-green-700', auf_kurs: 'bg-blue-100 text-blue-700', gefaehrdet: 'bg-red-100 text-red-700' };

    html += '<div class="bg-white rounded-lg border border-gray-100 p-3">';
    html += '<div class="flex items-center justify-between mb-2">';
    html += '<div class="font-semibold text-sm">' + _escH(z.titel || z.typ) + ' <span class="text-xs text-gray-400">(' + z.jahr + ')</span></div>';
    if (z.status) html += '<span class="text-xs px-2 py-0.5 rounded-full ' + (statusBadge[z.status] || 'bg-gray-100 text-gray-600') + '">' + _escH(z.status) + '</span>';
    html += '</div>';
    html += '<div class="flex items-center gap-3">';
    html += '<div class="flex-1 h-2 bg-gray-100 rounded-full"><div class="h-full rounded-full ' + barColor + '" style="width:' + Math.min(100, pct) + '%"></div></div>';
    html += '<span class="text-xs font-semibold w-16 text-right">' + _fmtN(z.aktueller_wert || 0) + '/' + _fmtN(z.zielwert || 0) + ' ' + _escH(z.einheit || '') + '</span>';
    html += '</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// ── Monatsplan ──
async function pmRenderMonatsplan(el, sid) {
  var resp = await _sb().from('partner_monatsplan').select('*').eq('standort_id', sid).order('jahr', { ascending: false }).order('monat', { ascending: false });
  var items = resp.data || [];

  if (items.length === 0) {
    el.innerHTML = '<div class="text-center py-8 text-gray-400"><p class="text-lg mb-2">Kein Monatsplan</p><p class="text-sm">Monatsfokus definieren \u2192</p></div>';
    return;
  }

  var monatsNamen = ['', 'Januar', 'Februar', 'M\u00e4rz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var html = '<div class="space-y-3">';
  items.forEach(function(m) {
    html += '<div class="bg-white rounded-lg border border-gray-100 p-4">';
    html += '<div class="font-semibold text-sm text-gray-800 mb-1">' + (monatsNamen[m.monat] || m.monat) + ' ' + m.jahr + '</div>';
    if (m.fokus_thema) html += '<div class="text-sm text-orange-600 mb-2">' + _escH(m.fokus_thema) + '</div>';
    if (m.beschreibung) html += '<div class="text-sm text-gray-600 mb-2">' + _escH(m.beschreibung) + '</div>';
    if (m.reflexion) html += '<div class="text-xs text-gray-400 italic mt-2">Reflexion: ' + _escH(m.reflexion) + '</div>';
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// ── Businessplan ──
async function pmRenderBusinessplan(el, sid) {
  var resp = await _sb().from('jahresplaene').select('*').eq('standort_id', sid).order('jahr', { ascending: false }).limit(3);
  var items = resp.data || [];

  if (items.length === 0) {
    el.innerHTML = '<div class="text-center py-8 text-gray-400"><p class="text-lg mb-2">Kein Businessplan</p><p class="text-sm">Jahresplan erstellen \u2192</p></div>';
    return;
  }

  var html = '<div class="space-y-4">';
  items.forEach(function(plan) {
    html += '<div class="bg-white rounded-xl border border-gray-100 p-4">';
    html += '<h4 class="font-semibold text-gray-800 mb-2">Jahresplan ' + plan.jahr + '</h4>';
    html += '<div class="text-sm text-gray-600">';
    html += pmInfoRow('Status', plan.status);
    html += pmInfoRow('Erstellt', plan.created_at ? new Date(plan.created_at).toLocaleDateString('de-DE') : '-');
    html += '</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// ── Einkaufsstrategie ──
async function pmRenderEinkaufsstrategie(el, sid) {
  var resp = await _sb().from('einkauf_strategien').select('*').eq('standort_id', sid).limit(1);
  var item = resp.data && resp.data[0];

  if (!item) {
    el.innerHTML = '<div class="text-center py-8 text-gray-400"><p class="text-lg mb-2">Keine Einkaufsstrategie</p><p class="text-sm">Strategie definieren \u2192</p></div>';
    return;
  }

  var s = pmDetail._standort;
  var html = '<div class="bg-white rounded-xl border border-gray-100 p-4 space-y-3">';
  html += '<div><h4 class="text-xs font-semibold text-gray-400 mb-1">Status Quo</h4><div class="text-sm text-gray-700">' + _escH(item.status_quo || '-') + '</div></div>';
  html += '<div><h4 class="text-xs font-semibold text-gray-400 mb-1">Ziele 2026</h4><div class="text-sm text-gray-700">' + _escH(item.ziele_2026 || '-') + '</div></div>';
  html += '<div><h4 class="text-xs font-semibold text-gray-400 mb-1">Modus Operandi</h4><div class="text-sm text-gray-700">' + _escH(item.modus_operandi || '-') + '</div></div>';
  if (s) {
    html += '<div class="pt-3 border-t border-gray-100 grid grid-cols-2 gap-4">';
    html += pmInfoRow('Rabattquote', s.rabatt_quote ? s.rabatt_quote + '%' : '-');
    html += pmInfoRow('Vororder-Status', s.vororder_status || '-');
    html += '</div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

// ── Marketing-Vereinbarungen ──
async function pmRenderMarketing(el, sid) {
  var resp = await _sb().from('marketing_vereinbarungen').select('*').eq('standort_id', sid).order('jahr', { ascending: false });
  var items = resp.data || [];

  if (items.length === 0) {
    el.innerHTML = '<div class="text-center py-8 text-gray-400 text-sm">Keine Marketing-Vereinbarungen.</div>';
    return;
  }

  var html = '<div class="space-y-3">';
  items.forEach(function(m) {
    html += '<div class="bg-white rounded-xl border border-gray-100 p-4">';
    html += '<h4 class="font-semibold text-sm mb-2">Vereinbarung ' + m.jahr + ' ' + (m.signed ? '\u2705' : '\u274c Nicht unterzeichnet') + '</h4>';
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">';
    html += '<div><div class="text-xs text-gray-400">Budget/Jahr</div><div class="font-semibold">' + _fmtN(m.budget_jahr || 0) + ' \u20ac</div></div>';
    html += '<div><div class="text-xs text-gray-400">Umsatzziel</div><div class="font-semibold">' + _fmtN(m.umsatz_ziel || 0) + ' \u20ac</div></div>';
    html += '<div><div class="text-xs text-gray-400">Anz. Verk\u00e4ufe</div><div class="font-semibold">' + _fmtN(m.avg_verkauf || 0) + '</div></div>';
    html += '<div><div class="text-xs text-gray-400">Mediamix</div><div class="text-sm">' + (m.mediamix || []).join(', ') + '</div></div>';
    html += '</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// ── Meetings ──
async function pmRenderMeetings(el, sid) {
  var resp = await _sb().from('termine').select('*').eq('standort_id', sid).order('datum', { ascending: false }).limit(20);
  var items = resp.data || [];

  if (items.length === 0) {
    el.innerHTML = '<div class="text-center py-8 text-gray-400 text-sm">Keine Termine f\u00fcr diesen Partner.</div>';
    return;
  }

  var html = '<div class="space-y-2">';
  items.forEach(function(t) {
    html += '<div class="bg-white rounded-lg border border-gray-100 p-3 flex justify-between items-center">';
    html += '<div>';
    html += '<div class="font-semibold text-sm">' + _escH(t.titel || t.typ || '-') + '</div>';
    if (t.notizen) html += '<div class="text-xs text-gray-500 mt-0.5">' + _escH(t.notizen).substring(0, 80) + '</div>';
    html += '</div>';
    html += '<div class="text-xs text-gray-400">' + (t.datum ? new Date(t.datum).toLocaleDateString('de-DE') : '-') + '</div>';
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// ── Onboarding ──
async function pmRenderOnboarding(el, sid) {
  var [fortResp, schrResp] = await Promise.all([
    _sb().from('onboarding_fortschritt').select('*').eq('standort_id', sid),
    _sb().from('onboarding_schritte').select('*').order('reihenfolge')
  ]);
  var fortschritt = fortResp.data || [];
  var schritte = schrResp.data || [];

  if (schritte.length === 0) {
    el.innerHTML = '<div class="text-center py-8 text-gray-400 text-sm">Kein Onboarding-Programm konfiguriert.</div>';
    return;
  }

  var done = fortschritt.filter(function(f) { return f.abgeschlossen; }).length;
  var pct = schritte.length > 0 ? Math.round(done / schritte.length * 100) : 0;

  var html = '<div class="bg-white rounded-xl border border-gray-100 p-4 mb-4">';
  html += '<div class="flex items-center justify-between mb-2">';
  html += '<span class="text-sm font-semibold text-gray-700">Onboarding-Fortschritt</span>';
  html += '<span class="text-sm font-bold">' + pct + '%</span>';
  html += '</div>';
  html += '<div class="h-3 bg-gray-100 rounded-full"><div class="h-full rounded-full bg-orange-400" style="width:' + pct + '%"></div></div>';
  html += '</div>';

  html += '<div class="space-y-2">';
  schritte.forEach(function(s) {
    var f = fortschritt.find(function(fp) { return fp.schritt_id === s.id; });
    var isDone = f && f.abgeschlossen;
    html += '<div class="flex items-center gap-3 p-2 rounded-lg ' + (isDone ? 'bg-green-50' : 'bg-white border border-gray-100') + '">';
    html += '<span class="text-lg">' + (isDone ? '\u2705' : '\u2b1c') + '</span>';
    html += '<div>';
    html += '<div class="text-sm ' + (isDone ? 'text-green-700' : 'text-gray-700') + '">' + _escH(s.titel || s.name || '-') + '</div>';
    if (s.beschreibung) html += '<div class="text-xs text-gray-400">' + _escH(s.beschreibung) + '</div>';
    html += '</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// ══════════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════════

async function pmChangeAmpel(val) {
  if (!pmDetail) return;
  try {
    await _sb().from('standorte').update({ partner_status: val }).eq('id', pmDetail.id);
    pmDetail._standort.partner_status = val;
    // Auch in der Liste aktualisieren
    var p = pmPartners.find(function(pp) { return pp.id === pmDetail.id; });
    if (p) p.partner_status = val;
    _showToast('Ampel ge\u00e4ndert', 'success');
  } catch (err) {
    _showToast('Fehler: ' + err.message, 'error');
  }
}

function pmBackToList() {
  pmDetail = null;
  var el = document.getElementById('hqPartnermanagementView');
  if (el) pmRenderUebersicht(el);
}

// ── Window Exports ──
var _pmExports = {
  renderHqPartnermanagement: renderHqPartnermanagement,
  pmShowSection: pmShowSection,
  pmShowTab: pmShowTab,
  pmOpenDetail: pmOpenDetail,
  pmBackToList: pmBackToList,
  pmFilterList: pmFilterList,
  pmChangeAmpel: pmChangeAmpel,
  pmAddWatchpoint: pmAddWatchpoint,
  pmSaveWatchpoint: pmSaveWatchpoint,
  pmResolveWatchpoint: pmResolveWatchpoint
};
Object.entries(_pmExports).forEach(function(e) { window[e[0]] = e[1]; });
