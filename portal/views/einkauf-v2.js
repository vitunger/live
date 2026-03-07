/**
 * views/einkauf-v2.js - Einkauf-Modul v2
 * HQ: Lieferanten-Verwaltung, DB1-Kalkulator, Verhandlungs-Protokolle
 * Partner: Sortiment-Uebersicht, Konditionen, IHT-Wissen
 * @module views/einkauf-v2
 */
var EINKAUF_V2_VERSION = 6;

function _sb()         { return window.sb; }
function _sbProfile()  { return window.sbProfile; }
function _escH(s)      { return typeof window.escH === 'function' ? window.escH(s) : String(s||'').replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function _showToast(m,t){ if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtEur(n)    { return typeof window.fmtEur === 'function' ? window.fmtEur(n) : (n != null ? n.toLocaleString('de-DE',{style:'currency',currency:'EUR'}) : '\u2013'); }

// === STATE ===
var EK = {
  view: 'hq',
  hqTab: 'netzwerk',
  pTab: 'sortiment',
  cat: 'all',
  q: '',
  lieferanten: [],
  protokolle: [],
  panelLief: null,
  panelTab: 'stamm',
  curBasis: 'uvp',
  loading: false
};

// === DB1 Calculation ===
function ekCalcDB1(kond) {
  if (!kond || !kond.kond_basis) return null;
  var uvp = 3000, mwst = 1.19;
  var ek;
  if (kond.kond_basis === 'faktor') {
    ek = uvp / kond.kond_faktor;
  } else if (kond.kond_basis === 'uvp') {
    ek = uvp * (1 - kond.kond_rabatt / 100);
  } else if (kond.kond_basis === 'katalog') {
    var kat = uvp / (1 + (kond.kond_kat_aufschlag || 20) / 100);
    ek = kat * (1 - kond.kond_rabatt / 100);
  }
  if (!ek || ek <= 0) return null;
  var uvpN = uvp / mwst, ekN = ek / mwst;
  var roh = uvpN - ekN;
  var db1 = (roh / uvpN) * 100;
  var ekSko = ekN * (1 - (kond.kond_skonto || 0) / 100);
  var wkzE = uvpN * ((kond.kond_wkz || 0) / 100);
  var db1full = ((uvpN - ekSko + wkzE) / uvpN) * 100;
  return {
    db1: db1.toFixed(1),
    db1sko: db1full.toFixed(1),
    ekN: ekN.toFixed(0),
    roh: roh.toFixed(0)
  };
}

// === Helpers ===
function ekArtLabel(art) {
  if (art === 'bike' || art === 'Bikes') return '\ud83d\udeb2 Bike';
  if (art === 'parts' || art === 'Parts') return '\ud83d\udd27 Parts';
  return '\ud83d\udcb3 DL';
}
function ekArtKey(art) {
  if (art === 'bike' || art === 'Bikes') return 'bike';
  if (art === 'parts' || art === 'Parts') return 'parts';
  return 'dl';
}
function ekStatBadge(stat) {
  var s = (stat || '').toLowerCase();
  if (s.indexOf('fixiert') >= 0 || s.indexOf('vertraglich') >= 0)
    return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 border border-green-300">\u2705 Fixiert</span>';
  if (s.indexOf('verhandlung') >= 0 || s.indexOf('finalisierung') >= 0)
    return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">\ud83d\udfe1 Verhandlung</span>';
  if (s.indexOf('kontakt') >= 0)
    return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">Kontakt</span>';
  if (s.indexOf('gescheitert') >= 0 || s.indexOf('insolvenz') >= 0 || s.indexOf('auslauf') >= 0)
    return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-300">\u274c Gescheitert</span>';
  return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">Ausstehend</span>';
}
function ekDB1Badge(lief) {
  var r = ekCalcDB1(lief);
  if (!r) return '<span class="text-gray-400">\u2013</span>';
  var col = +r.db1 >= 35 ? 'text-green-700' : +r.db1 >= 28 ? 'text-orange-500' : 'text-red-700';
  var skoHtml = +r.db1sko > +r.db1
    ? '<br><small class="text-gray-400">+Sk. ' + r.db1sko + '%</small>' : '';
  return '<span class="font-bold ' + col + ' text-sm">' + r.db1 + '%</span>' + skoHtml;
}
function ekIhtBadge(iht) {
  if (!iht) return '<span class="text-gray-400">\u2013</span>';
  var s = iht.toLowerCase();
  if (s.indexOf('aktiv') >= 0 || s.indexOf('reguliert') >= 0)
    return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-300">\u2705 Aktiv</span>';
  if (s.indexOf('onboard') >= 0 || s.indexOf('verhandlung') >= 0)
    return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">\ud83d\udfe1 ' + _escH(iht) + '</span>';
  if (s.indexOf('abgelehnt') >= 0)
    return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-300">\u274c Abgelehnt</span>';
  return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">' + _escH(iht) + '</span>';
}
function ekFmtDate(d) {
  if (!d) return '\u2013';
  try { return new Date(d).toLocaleDateString('de-DE'); } catch(e) { return String(d); }
}

// === Data Loading ===
async function ekLoad() {
  EK.loading = true;
  try {
    var sb = _sb();
    if (!sb) return;
    var liefRes = await sb.from('lieferanten').select('*').order('lieferant');
    if (!liefRes.error) EK.lieferanten = liefRes.data || [];
    var protoRes = await sb.from('lieferanten_protokolle').select('*, lieferanten(lieferant)').order('datum', { ascending: false });
    if (!protoRes.error) EK.protokolle = protoRes.data || [];
    else EK.protokolle = [];
  } catch(e) {
    console.warn('[einkauf-v2] Load error:', e);
  }
  EK.loading = false;
}

// === Main Entry ===
async function renderEinkaufV2() {
  var isHQ = _sbProfile() && _sbProfile().is_hq === true;
  EK.view = isHQ ? 'hq' : 'partner';

  // Find container
  var hqView = document.getElementById('hqEinkaufView');
  var isHQView = hqView && hqView.style.display !== 'none';
  var container = isHQView
    ? (document.getElementById('view-einkauf-hq') || hqView)
    : document.getElementById('view-einkauf-partner');
  if (!container) { container = document.getElementById('einkaufView'); }
  if (!container) return;

  // Render shell
  container.innerHTML = ekRenderShell(isHQ);

  // Load data
  await ekLoad();

  // Render active tab
  if (isHQ) {
    ekHqTabActive('netzwerk');
  } else {
    ekPartnerTabActive('sortiment');
  }
}

function ekRenderShell(isHQ) {
  var h = '';
  // Topbar
  h += '<div class="flex items-center justify-between mb-0 px-4 pt-5 pb-0">';
  h += '<h1 class="text-xl font-bold text-gray-800">Einkauf</h1>';
  h += '<div class="flex items-center gap-3">';
  h += '<span id="ek-view-label" class="text-xs font-semibold px-3 py-1 rounded-full ' + (isHQ ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600') + '">' + (isHQ ? '\ud83c\udfe2 HQ-Ansicht' : '\ud83c\udfe0 Partner-Ansicht') + '</span>';
  if (_sbProfile() && _sbProfile().is_hq) {
    h += '<div class="flex border border-gray-200 rounded-lg overflow-hidden">';
    h += '<button class="px-3 py-1.5 text-xs font-semibold ' + (isHQ ? 'bg-orange-500 text-white' : 'text-gray-400 bg-white') + '" id="ek-btn-hq" onclick="ekSwitchView(\'hq\')">HQ</button>';
    h += '<button class="px-3 py-1.5 text-xs font-semibold ' + (!isHQ ? 'bg-orange-500 text-white' : 'text-gray-400 bg-white') + '" id="ek-btn-partner" onclick="ekSwitchView(\'partner\')">Partner</button>';
    h += '</div>';
  }
  h += '</div></div>';

  // HQ View
  h += '<div id="ek-v-hq" class="px-4 py-4" ' + (isHQ ? '' : 'style="display:none"') + '>';
  h += '<div class="flex border-b border-gray-200 mb-5 gap-1">';
  h += '<button class="ek-hq-tab px-4 py-2.5 text-sm font-semibold text-gray-400 border-b-2 border-transparent -mb-px" data-tab="netzwerk" onclick="ekHqTab(\'netzwerk\',this)">\ud83c\udf10 Netzwerk</button>';
  h += '<button class="ek-hq-tab px-4 py-2.5 text-sm font-semibold text-gray-400 border-b-2 border-transparent -mb-px" data-tab="lieferanten" onclick="ekHqTab(\'lieferanten\',this)">\ud83e\udd1d Lieferanten <span id="ek-lief-count" class="ml-1 bg-orange-100 text-orange-600 text-xs font-bold px-1.5 py-0.5 rounded-full"></span></button>';
  h += '<button class="ek-hq-tab px-4 py-2.5 text-sm font-semibold text-gray-400 border-b-2 border-transparent -mb-px" data-tab="protokolle" onclick="ekHqTab(\'protokolle\',this)">\ud83d\udccb Verhandlungen</button>';
  h += '</div>';
  h += '<div id="ek-t-netzwerk" class="ek-hq-panel"></div>';
  h += '<div id="ek-t-lieferanten" class="ek-hq-panel" style="display:none"></div>';
  h += '<div id="ek-t-protokolle" class="ek-hq-panel" style="display:none"></div>';
  h += '</div>';

  // Partner View
  h += '<div id="ek-v-partner" class="px-4 py-4" ' + (!isHQ ? '' : 'style="display:none"') + '>';
  h += '<div class="flex border-b border-gray-200 mb-5 gap-1">';
  h += '<button class="ek-p-tab px-4 py-2.5 text-sm font-semibold text-gray-400 border-b-2 border-transparent -mb-px" data-tab="sortiment" onclick="ekPartnerTab(\'sortiment\',this)">\ud83c\udfe0 Mein Sortiment</button>';
  h += '<button class="ek-p-tab px-4 py-2.5 text-sm font-semibold text-gray-400 border-b-2 border-transparent -mb-px" data-tab="pkond" onclick="ekPartnerTab(\'pkond\',this)">\ud83d\udccb Lieferanten & Konditionen</button>';
  h += '<button class="ek-p-tab px-4 py-2.5 text-sm font-semibold text-gray-400 border-b-2 border-transparent -mb-px" data-tab="wissen" onclick="ekPartnerTab(\'wissen\',this)">\ud83d\udcda Wissen</button>';
  h += '</div>';
  h += '<div id="ek-t-sortiment" class="ek-p-panel"></div>';
  h += '<div id="ek-t-pkond" class="ek-p-panel" style="display:none"></div>';
  h += '<div id="ek-t-wissen" class="ek-p-panel" style="display:none"></div>';
  h += '</div>';

  // Panel overlay
  h += '<div id="ek-overlay" class="fixed inset-0 bg-black/30 z-50" style="display:none" onclick="if(event.target===this)ekClosePanel()">';
  h += '<div id="ek-panel" class="fixed right-0 top-0 bottom-0 w-full max-w-[660px] bg-white shadow-2xl flex flex-col overflow-hidden">';
  h += '<div id="ek-panel-head" class="p-5 border-b flex items-start justify-between flex-shrink-0"></div>';
  h += '<div id="ek-panel-tabs" class="flex border-b px-5 flex-shrink-0"></div>';
  h += '<div id="ek-panel-body" class="flex-1 overflow-y-auto"></div>';
  h += '<div id="ek-panel-foot" class="p-4 border-t bg-gray-50 flex gap-3 flex-shrink-0"></div>';
  h += '</div></div>';

  return h;
}

// === View Switching ===
function ekSwitchView(v) {
  EK.view = v;
  var hq = document.getElementById('ek-v-hq');
  var pa = document.getElementById('ek-v-partner');
  if (hq) hq.style.display = v === 'hq' ? '' : 'none';
  if (pa) pa.style.display = v === 'partner' ? '' : 'none';
  var bHq = document.getElementById('ek-btn-hq');
  var bPa = document.getElementById('ek-btn-partner');
  if (bHq) { bHq.className = 'px-3 py-1.5 text-xs font-semibold ' + (v === 'hq' ? 'bg-orange-500 text-white' : 'text-gray-400 bg-white'); }
  if (bPa) { bPa.className = 'px-3 py-1.5 text-xs font-semibold ' + (v === 'partner' ? 'bg-orange-500 text-white' : 'text-gray-400 bg-white'); }
  var lbl = document.getElementById('ek-view-label');
  if (lbl) {
    lbl.textContent = v === 'hq' ? '\ud83c\udfe2 HQ-Ansicht' : '\ud83c\udfe0 Partner-Ansicht';
    lbl.className = 'text-xs font-semibold px-3 py-1 rounded-full ' + (v === 'hq' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600');
  }
  if (v === 'hq') ekHqTabActive(EK.hqTab);
  else ekPartnerTabActive(EK.pTab);
}

// === HQ Tabs ===
function ekHqTab(tab, btn) {
  EK.hqTab = tab;
  ekHqTabActive(tab);
}
function ekHqTabActive(tab) {
  EK.hqTab = tab;
  document.querySelectorAll('.ek-hq-tab').forEach(function(b) {
    var isActive = b.getAttribute('data-tab') === tab;
    b.className = 'ek-hq-tab px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ' + (isActive ? 'text-orange-500 border-orange-500' : 'text-gray-400 border-transparent');
  });
  document.querySelectorAll('.ek-hq-panel').forEach(function(p) { p.style.display = 'none'; });
  var el = document.getElementById('ek-t-' + tab);
  if (el) el.style.display = '';
  if (tab === 'netzwerk') ekRenderNetzwerk();
  if (tab === 'lieferanten') ekRenderLieferanten();
  if (tab === 'protokolle') ekRenderProtokolle();
}

// === Partner Tabs ===
function ekPartnerTab(tab, btn) {
  EK.pTab = tab;
  ekPartnerTabActive(tab);
}
function ekPartnerTabActive(tab) {
  EK.pTab = tab;
  document.querySelectorAll('.ek-p-tab').forEach(function(b) {
    var isActive = b.getAttribute('data-tab') === tab;
    b.className = 'ek-p-tab px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ' + (isActive ? 'text-orange-500 border-orange-500' : 'text-gray-400 border-transparent');
  });
  document.querySelectorAll('.ek-p-panel').forEach(function(p) { p.style.display = 'none'; });
  var el = document.getElementById('ek-t-' + tab);
  if (el) el.style.display = '';
  if (tab === 'sortiment') ekRenderSortiment();
  if (tab === 'pkond') ekRenderPKond();
  if (tab === 'wissen') ekRenderWissen();
}

// ================================================================
// HQ: NETZWERK TAB
// ================================================================
function ekRenderNetzwerk() {
  var el = document.getElementById('ek-t-netzwerk');
  if (!el) return;
  var lief = EK.lieferanten;
  var totalVol = lief.reduce(function(a, l) { return a + (parseFloat(l.netzwerk_umsatz) || 0); }, 0);
  var fixiert = lief.filter(function(l) { var s = (l.status_konditionen || '').toLowerCase(); return s.indexOf('fixiert') >= 0 || s.indexOf('vertraglich') >= 0; });
  var verhandlung = lief.filter(function(l) { return (l.status_konditionen || '').toLowerCase().indexOf('verhandlung') >= 0; });
  var db1Arr = [];
  lief.forEach(function(l) { var r = ekCalcDB1(l); if (r) db1Arr.push(+r.db1); });
  var avgDB1 = db1Arr.length > 0 ? (db1Arr.reduce(function(a, b) { return a + b; }, 0) / db1Arr.length).toFixed(1) : '\u2013';

  var h = '';
  // KPIs
  h += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">';
  h += '<div class="bg-white rounded-xl border border-gray-200 p-4 border-l-3 border-l-orange-500"><p class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Netzwerk-Einkaufsvolumen</p><p class="text-2xl font-bold mt-1">' + (totalVol > 0 ? (totalVol / 1000000).toFixed(1) + ' Mio \u20ac' : '\u2013') + '</p></div>';
  h += '<div class="bg-white rounded-xl border border-gray-200 p-4"><p class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Fixierte Lieferanten</p><p class="text-2xl font-bold mt-1">' + fixiert.length + '</p><p class="text-[11px] text-gray-400">von ' + lief.length + ' Lieferanten</p></div>';
  h += '<div class="bg-white rounded-xl border border-gray-200 p-4"><p class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">\u00d8 Richt-DB1</p><p class="text-2xl font-bold mt-1 text-green-700">' + avgDB1 + (avgDB1 !== '\u2013' ? '%' : '') + '</p></div>';
  h += '<div class="bg-white rounded-xl border border-gray-200 p-4"><p class="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Verhandlungen offen</p><p class="text-2xl font-bold mt-1 text-yellow-600">' + verhandlung.length + '</p></div>';
  h += '</div>';

  // Top 5 by volume
  var top5 = lief.slice().sort(function(a, b) { return (parseFloat(b.netzwerk_umsatz) || 0) - (parseFloat(a.netzwerk_umsatz) || 0); }).slice(0, 5);
  var maxVol = top5.length > 0 ? (parseFloat(top5[0].netzwerk_umsatz) || 1) : 1;

  h += '<div class="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">';
  h += '<div class="p-4 border-b border-gray-200 flex items-center justify-between"><span class="font-bold text-sm">Top-Lieferanten nach Netzwerkvolumen</span><span class="text-xs text-gray-400">inkl. Richt-DB1</span></div>';
  h += '<table class="w-full text-sm"><thead><tr class="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wide">';
  h += '<th class="text-left p-3 w-8">#</th><th class="text-left p-3">Lieferant</th><th class="p-3">Kat.</th><th class="p-3">Netzwerk-Umsatz</th><th class="p-3">Richt-DB1</th><th class="p-3">Standorte</th><th class="p-3">Status</th><th class="p-3 w-8"></th>';
  h += '</tr></thead><tbody>';
  top5.forEach(function(l, i) {
    var vol = parseFloat(l.netzwerk_umsatz) || 0;
    var pct = maxVol > 0 ? Math.round(vol / maxVol * 100) : 0;
    h += '<tr class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="ekOpenPanel(\'' + l.id + '\')">';
    h += '<td class="p-3 text-gray-400 font-bold">' + (i + 1) + '</td>';
    h += '<td class="p-3"><strong>' + _escH(l.lieferant) + '</strong><br><small class="text-gray-400">' + _escH(l.konditionen_detail || '') + '</small></td>';
    h += '<td class="p-3"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600">' + ekArtLabel(l.art) + '</span></td>';
    h += '<td class="p-3"><strong>' + (vol > 0 ? (vol / 1000).toFixed(0) + '.000 \u20ac' : '\u2013') + '</strong>';
    h += '<div class="flex items-center gap-2 mt-1"><div class="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden"><div class="h-1 bg-orange-500 rounded-full" style="width:' + pct + '%"></div></div><span class="text-[11px] text-gray-400">' + pct + '%</span></div></td>';
    h += '<td class="p-3">' + ekDB1Badge(l) + '</td>';
    h += '<td class="p-3 text-center">' + (l.netzwerk_standorte || '\u2013') + '</td>';
    h += '<td class="p-3">' + ekStatBadge(l.status_konditionen) + '</td>';
    h += '<td class="p-3"><button class="text-gray-400 hover:text-orange-500" onclick="ekOpenPanel(\'' + l.id + '\');event.stopPropagation()">\u2192</button></td>';
    h += '</tr>';
  });
  h += '</tbody></table></div>';

  // Handlungsbedarf
  var urgent = lief.filter(function(l) {
    var s = (l.status_konditionen || '').toLowerCase();
    return (s.indexOf('verhandlung') >= 0 || s.indexOf('finalisierung') >= 0) && !l.kond_basis;
  }).sort(function(a, b) { return (parseFloat(b.netzwerk_umsatz) || 0) - (parseFloat(a.netzwerk_umsatz) || 0); });
  if (urgent.length > 0) {
    h += '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">';
    h += '<div class="p-4 border-b border-gray-200"><span class="font-bold text-sm">\u26a1 Handlungsbedarf</span></div>';
    h += '<div class="p-3 flex flex-col gap-2">';
    urgent.forEach(function(l) {
      h += '<div class="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border-l-3 border-l-orange-500">';
      h += '<span class="text-lg">\ud83d\udfe0</span>';
      h += '<div class="flex-1"><div class="font-semibold text-sm">' + _escH(l.lieferant) + ' \u2013 Konditionen fehlen</div><div class="text-[11px] text-gray-400">Richt-DB1 nicht berechenbar \u00b7 Volumen: ' + (l.netzwerk_umsatz ? (parseFloat(l.netzwerk_umsatz) / 1000).toFixed(0) + '.000 \u20ac' : '\u2013') + '</div></div>';
      h += '<button class="px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg" onclick="ekOpenPanel(\'' + l.id + '\')">Bearbeiten</button>';
      h += '</div>';
    });
    h += '</div></div>';
  }

  el.innerHTML = h;
  var cnt = document.getElementById('ek-lief-count');
  if (cnt) cnt.textContent = lief.length;
}

// ================================================================
// HQ: LIEFERANTEN TAB
// ================================================================
function ekRenderLieferanten() {
  var el = document.getElementById('ek-t-lieferanten');
  if (!el) return;
  var h = '';

  // Filter bar
  h += '<div class="flex gap-2 items-center mb-4 flex-wrap">';
  h += '<input class="px-3 py-2 border border-gray-200 rounded-lg text-sm w-52 outline-none focus:border-orange-500" placeholder="Lieferant suchen\u2026" oninput="EK.q=this.value;ekRenderLieferantenTable()" id="ek-search">';
  var cats = [['all','Alle'],['bike','\ud83d\udeb2 Bikes'],['parts','\ud83d\udd27 Parts'],['dl','\ud83d\udcb3 DL'],['kern','\u2b50 Kernsortiment']];
  cats.forEach(function(c) {
    var isActive = EK.cat === c[0];
    h += '<button class="px-3 py-1.5 rounded-full border text-xs font-semibold ' + (isActive ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-400') + '" onclick="EK.cat=\'' + c[0] + '\';ekRenderLieferanten()">' + c[1] + '</button>';
  });
  h += '</div>';

  // Table container
  h += '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden"><table class="w-full text-sm"><thead><tr class="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wide">';
  h += '<th class="text-left p-3">Lieferant</th><th class="p-3">Kat.</th><th class="p-3">Richt-DB1</th><th class="text-left p-3">Konditionen</th><th class="p-3">IHT</th><th class="p-3">Status</th><th class="p-3">Protokolle</th><th class="p-3 w-8"></th>';
  h += '</tr></thead><tbody id="ek-ltbody"></tbody></table></div>';

  el.innerHTML = h;
  ekRenderLieferantenTable();
}

function ekRenderLieferantenTable() {
  var tb = document.getElementById('ek-ltbody');
  if (!tb) return;
  var q = (EK.q || '').toLowerCase();
  var cat = EK.cat;
  var rows = EK.lieferanten.filter(function(l) {
    var cOk = cat === 'all' || (cat === 'kern' ? l.kernsortiment : ekArtKey(l.art) === cat);
    var qOk = !q || (l.lieferant || '').toLowerCase().indexOf(q) >= 0;
    return cOk && qOk;
  });
  var h = '';
  rows.forEach(function(l) {
    var protos = EK.protokolle.filter(function(p) { return p.lieferant_id === l.id; });
    h += '<tr class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="ekOpenPanel(\'' + l.id + '\')">';
    h += '<td class="p-3"><strong>' + _escH(l.lieferant) + '</strong>' + (l.kernsortiment ? '<br><span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-600">\u2b50 Kern</span>' : '') + '</td>';
    h += '<td class="p-3"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600">' + ekArtLabel(l.art) + '</span></td>';
    h += '<td class="p-3 text-center">' + ekDB1Badge(l) + '</td>';
    h += '<td class="p-3"><code class="bg-gray-100 px-2 py-0.5 rounded text-[11px]">' + _escH(l.konditionen_detail || '\u2013') + '</code></td>';
    h += '<td class="p-3">' + ekIhtBadge(l.status_iht) + '</td>';
    h += '<td class="p-3">' + ekStatBadge(l.status_konditionen) + '</td>';
    h += '<td class="p-3 text-center">' + (protos.length > 0 ? '<span class="bg-orange-100 text-orange-600 text-[11px] font-bold px-2 py-0.5 rounded-full">' + protos.length + '</span>' : '<span class="text-gray-400">\u2013</span>') + '</td>';
    h += '<td class="p-3"><button class="text-gray-400 hover:text-orange-500" onclick="ekOpenPanel(\'' + l.id + '\');event.stopPropagation()">\u2192</button></td>';
    h += '</tr>';
  });
  if (rows.length === 0) {
    h += '<tr><td colspan="8" class="p-8 text-center text-gray-400">Keine Lieferanten gefunden</td></tr>';
  }
  tb.innerHTML = h;
}

// ================================================================
// HQ: PROTOKOLLE TAB
// ================================================================
function ekRenderProtokolle() {
  var el = document.getElementById('ek-t-protokolle');
  if (!el) return;
  var h = '';
  h += '<div class="flex justify-end mb-4"><button class="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg" onclick="ekOpenPanel(null)">+ Neues Protokoll</button></div>';
  h += '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">';
  h += '<div class="p-4 border-b border-gray-200"><span class="font-bold text-sm">Alle Verhandlungsprotokolle</span></div>';
  if (EK.protokolle.length === 0) {
    h += '<div class="p-8 text-center text-gray-400">Noch keine Protokolle</div>';
  } else {
    EK.protokolle.forEach(function(p) {
      var liefName = (p.lieferanten && p.lieferanten.lieferant) || '\u2013';
      var kondChanged = p.kond_nachher && p.kond_nachher !== '\u2013' && p.kond_nachher !== p.kond_vorher;
      h += '<div class="flex gap-3 p-4 border-b border-gray-100">';
      h += '<div class="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-2"></div>';
      h += '<div class="flex-1">';
      h += '<div class="flex gap-2 items-center mb-1">';
      h += '<span class="text-[11px] font-semibold text-gray-400">' + ekFmtDate(p.datum) + '</span>';
      h += '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">' + _escH(p.kontakt_art || '') + '</span>';
      h += '<strong class="text-sm">' + _escH(liefName) + '</strong>';
      if (kondChanged) h += '<span class="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Kond. geaendert</span>';
      h += '</div>';
      if (p.teilnehmer) h += '<div class="text-xs text-gray-400 mb-1">Teilnehmer: ' + _escH(p.teilnehmer) + '</div>';
      if (p.ergebnis) h += '<div class="text-xs mb-1">' + _escH(p.ergebnis) + '</div>';
      if (p.vollprotokoll) h += '<div class="text-xs text-gray-600 line-clamp-2">' + _escH(p.vollprotokoll) + '</div>';
      if (kondChanged) h += '<div class="mt-1 p-2 bg-green-50 rounded text-[11px] text-green-700">Kond.: <strong>' + _escH(p.kond_vorher || '\u2013') + '</strong> \u2192 <strong>' + _escH(p.kond_nachher) + '</strong></div>';
      h += '</div></div>';
    });
  }
  h += '</div>';
  el.innerHTML = h;
}

// ================================================================
// PARTNER: SORTIMENT TAB
// ================================================================
function ekRenderSortiment() {
  var el = document.getElementById('ek-t-sortiment');
  if (!el) return;
  var lief = EK.lieferanten;
  var kern = lief.filter(function(l) { return l.kernsortiment; });
  var zusatz = lief.filter(function(l) { return l.zusatz && !l.kernsortiment; });
  var db1s = [];
  kern.forEach(function(l) { var r = ekCalcDB1(l); if (r) db1s.push(+r.db1); });
  var avgDB1 = db1s.length > 0 ? (db1s.reduce(function(a, b) { return a + b; }, 0) / db1s.length).toFixed(1) : '\u2013';
  var ihtCount = lief.filter(function(l) { return l.status_iht && l.status_iht.toLowerCase().indexOf('aktiv') >= 0; }).length;

  var h = '';
  // KPIs
  h += '<div class="grid grid-cols-3 gap-3 mb-5">';
  h += '<div class="bg-white rounded-xl border border-gray-200 p-4 border-l-3 border-l-orange-500"><p class="text-[11px] font-semibold text-gray-400 uppercase">Aktive Lieferanten</p><p class="text-2xl font-bold mt-1">' + (kern.length + zusatz.length) + '</p><p class="text-[11px] text-gray-400">' + kern.length + ' Kern + ' + zusatz.length + ' Zusatz</p></div>';
  h += '<div class="bg-white rounded-xl border border-gray-200 p-4"><p class="text-[11px] font-semibold text-gray-400 uppercase">\u00d8 Richt-DB1 Kernmarken</p><p class="text-2xl font-bold mt-1 text-green-700">' + avgDB1 + (avgDB1 !== '\u2013' ? '%' : '') + '</p><p class="text-[11px] text-gray-400">Netzwerk verhandelt</p></div>';
  h += '<div class="bg-white rounded-xl border border-gray-200 p-4"><p class="text-[11px] font-semibold text-gray-400 uppercase">IHT-Abwicklung</p><p class="text-2xl font-bold mt-1">' + ihtCount + '</p><p class="text-[11px] text-gray-400">Lieferanten ueber IHT</p></div>';
  h += '</div>';

  // Cards grid
  h += '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">';
  var allCards = kern.concat(zusatz);
  allCards.forEach(function(l) {
    var isKern = l.kernsortiment;
    var r = ekCalcDB1(l);
    var statFixed = (l.status_konditionen || '').toLowerCase().indexOf('fixiert') >= 0 || (l.status_konditionen || '').toLowerCase().indexOf('vertraglich') >= 0;
    var borderCls = isKern ? 'border-2 border-orange-500 bg-orange-50' : 'border border-gray-200 bg-white';
    h += '<div class="rounded-xl ' + borderCls + ' p-4 cursor-pointer hover:shadow-md transition-shadow" onclick="ekOpenPanel(\'' + l.id + '\')">';
    h += '<div class="flex justify-between mb-2"><span class="text-xl">' + (ekArtKey(l.art) === 'bike' ? '\ud83d\udeb2' : ekArtKey(l.art) === 'parts' ? '\ud83d\udd27' : '\ud83d\udcb3') + '</span>';
    h += '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ' + (isKern ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600') + '">' + (isKern ? '\u2b50 Kern' : 'Zusatz') + '</span></div>';
    h += '<div class="font-bold text-sm">' + _escH(l.lieferant) + '</div>';
    h += '<div class="text-[11px] text-gray-400 mt-1">' + _escH(l.konditionen_detail || '') + (l.status_iht && l.status_iht.toLowerCase().indexOf('aktiv') >= 0 ? ' \u00b7 IHT aktiv' : '') + '</div>';
    h += '<div class="mt-2 pt-2 border-t ' + (isKern ? 'border-orange-200' : 'border-gray-200') + ' flex justify-between items-center">';
    h += '<span class="text-xs font-semibold ' + (statFixed ? 'text-green-700' : 'text-yellow-600') + '">' + (statFixed ? 'Kond. fixiert \u2705' : 'Konditionen offen') + '</span>';
    h += '<span class="text-sm font-bold ' + (r ? (+r.db1 >= 35 ? 'text-green-700' : +r.db1 >= 28 ? 'text-orange-500' : 'text-red-700') : 'text-gray-400') + '">' + (r ? r.db1 + '%' : '\u2013') + '</span>';
    h += '</div></div>';
  });
  // Add card
  h += '<div class="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 flex items-center justify-center flex-col gap-2 cursor-pointer min-h-[120px] hover:border-orange-400 transition-colors">';
  h += '<span class="text-2xl opacity-30">\u2795</span><span class="text-xs text-gray-400 font-semibold">Lieferant anfragen</span></div>';
  h += '</div>';
  el.innerHTML = h;
}

// ================================================================
// PARTNER: KONDITIONEN TAB
// ================================================================
function ekRenderPKond() {
  var el = document.getElementById('ek-t-pkond');
  if (!el) return;
  var lief = EK.lieferanten.filter(function(l) { return l.kernsortiment || l.zusatz; });
  var h = '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden"><table class="w-full text-sm">';
  h += '<thead><tr class="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wide">';
  h += '<th class="text-left p-3">Lieferant</th><th class="p-3">Richt-DB1</th><th class="text-left p-3">Konditionen (HQ)</th><th class="p-3">IHT</th><th class="p-3">B2B</th><th class="p-3">Kontakt</th>';
  h += '</tr></thead><tbody>';
  lief.forEach(function(l) {
    var r = ekCalcDB1(l);
    h += '<tr class="border-t border-gray-100">';
    h += '<td class="p-3"><strong>' + _escH(l.lieferant) + '</strong>' + (l.kernsortiment ? '<br><span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">\u2b50 Kern</span>' : '') + '</td>';
    h += '<td class="p-3 text-center">' + (r ? '<span class="text-base font-bold ' + (+r.db1 >= 35 ? 'text-green-700' : +r.db1 >= 28 ? 'text-orange-500' : 'text-red-700') + '">' + r.db1 + '%</span>' + (+r.db1sko > +r.db1 ? '<br><small class="text-gray-400">+Sk. \u2192 ' + r.db1sko + '%</small>' : '') : '<span class="text-gray-400">\u2013</span>') + '</td>';
    h += '<td class="p-3"><code class="bg-gray-100 px-2 py-0.5 rounded text-[11px]">' + _escH(l.konditionen_detail || '\u2013') + '</code></td>';
    h += '<td class="p-3">' + ekIhtBadge(l.status_iht) + '</td>';
    h += '<td class="p-3">' + (l.b2b_shop ? '<a href="' + _escH(l.b2b_shop) + '" target="_blank" class="text-orange-500 font-semibold text-xs">B2B \u2192</a>' : '\u2013') + '</td>';
    h += '<td class="p-3 text-xs">' + _escH(l.email_innendienst || '\u2013') + '</td>';
    h += '</tr>';
  });
  h += '</tbody></table></div>';
  el.innerHTML = h;
}

// ================================================================
// PARTNER: WISSEN TAB
// ================================================================
function ekRenderWissen() {
  var el = document.getElementById('ek-t-wissen');
  if (!el) return;
  var h = '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">';

  // IHT
  h += '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">';
  h += '<div class="p-4 border-b border-gray-200"><span class="font-bold text-sm">\ud83c\udfe6 IHT \u2013 Wie funktioniert\'s?</span></div>';
  h += '<div class="p-4 text-sm text-gray-600 leading-relaxed">';
  h += 'Die IHT uebernimmt den gesamten Zahlungsverkehr mit Lieferanten. Ihr bestellt direkt \u2014 IHT zahlt in Skontofrist.';
  h += '<div class="mt-3 flex flex-col gap-2">';
  var steps = ['Bestellung direkt beim Lieferanten', 'Rechnung \u2192 Kopie an IHT', 'IHT zahlt in Skontofrist', 'Waehlen: Sofort+Skonto oder Kontokorrent'];
  steps.forEach(function(s, i) {
    h += '<div class="flex gap-2 items-center"><span class="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">' + (i + 1) + '</span><span>' + s + '</span></div>';
  });
  h += '</div></div></div>';

  // DB1
  h += '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">';
  h += '<div class="p-4 border-b border-gray-200"><span class="font-bold text-sm">\ud83d\udcca DB1 \u2013 Was bedeutet das?</span></div>';
  h += '<div class="p-4">';
  h += '<p class="text-sm text-gray-600 mb-3">Der DB1 ist der echte Ertragswert nach MwSt-Bereinigung.</p>';
  h += '<div class="grid grid-cols-2 gap-3">';
  h += '<div class="bg-gray-100 rounded-lg p-3"><div class="text-[11px] text-gray-400 font-semibold">Faktor 1,85 \u2192 UVP 3.000\u20ac</div><div class="text-sm mt-1">EK = 3.000 \u00f7 1,85 = 1.622\u20ac</div><div class="text-sm font-bold text-green-700 mt-1">Rohertrag = 703\u20ac</div></div>';
  h += '<div class="bg-orange-500 rounded-lg p-3 text-white"><div class="text-[11px] opacity-80 font-semibold">DB1 netto</div><div class="text-sm mt-1">703 \u00f7 2.521 netto</div><div class="text-xl font-bold mt-1">= 27,9%</div></div>';
  h += '</div>';
  h += '<div class="mt-3 p-2 bg-green-50 rounded-lg text-xs text-green-700 font-semibold">\ud83d\udca1 +3% DB1 auf 1 Mio \u20ac Umsatz = +29.400\u20ac Mehrertrag</div>';
  h += '</div></div>';

  h += '</div>';
  el.innerHTML = h;
}

// ================================================================
// PANEL (Slide-over)
// ================================================================
function ekOpenPanel(lieferantId) {
  var l = null;
  if (lieferantId) {
    l = EK.lieferanten.find(function(x) { return x.id === lieferantId; });
  }
  EK.panelLief = l;
  EK.panelTab = 'stamm';

  var ov = document.getElementById('ek-overlay');
  var ph = document.getElementById('ek-panel-head');
  var pt = document.getElementById('ek-panel-tabs');
  var pf = document.getElementById('ek-panel-foot');
  if (!ov || !ph) return;

  if (!l) {
    // New proto or new lieferant
    ph.innerHTML = '<div><div class="text-lg font-bold">+ Neues Protokoll</div></div><button class="text-gray-400 hover:text-gray-600" onclick="ekClosePanel()">\u2715</button>';
    pt.innerHTML = '';
    pf.innerHTML = '<button class="px-4 py-2 bg-white border border-gray-200 text-sm font-semibold rounded-lg" onclick="ekClosePanel()">Abbrechen</button>';
    ekRenderPanelNewProto(null);
  } else {
    var protos = EK.protokolle.filter(function(p) { return p.lieferant_id === l.id; });
    ph.innerHTML = '<div><div class="text-lg font-bold mb-1">' + _escH(l.lieferant) + '</div>'
      + '<div class="flex gap-2"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600">' + ekArtLabel(l.art) + '</span>'
      + ekStatBadge(l.status_konditionen)
      + (l.kernsortiment ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-600">\u2b50 Kern</span>' : '')
      + '</div></div><button class="text-gray-400 hover:text-gray-600" onclick="ekClosePanel()">\u2715</button>';

    pt.innerHTML = '<button class="ek-ptab px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px text-orange-500 border-orange-500" data-tab="stamm" onclick="ekPanelTab(\'stamm\',this)">Stammdaten</button>'
      + '<button class="ek-ptab px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px text-gray-400 border-transparent" data-tab="kond" onclick="ekPanelTab(\'kond\',this)">\ud83d\udcca Konditionen & DB1</button>'
      + '<button class="ek-ptab px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px text-gray-400 border-transparent" data-tab="protos" onclick="ekPanelTab(\'protos\',this)">Protokolle' + (protos.length ? ' <span class="bg-orange-100 text-orange-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">' + protos.length + '</span>' : '') + '</button>'
      + '<button class="ek-ptab px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px text-gray-400 border-transparent" data-tab="new-proto" onclick="ekPanelTab(\'new-proto\',this)">+ Protokoll</button>';

    pf.innerHTML = '<button class="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg" onclick="ekPanelTab(\'new-proto\')">+ Protokoll anlegen</button>';

    ekRenderPanelStamm();
  }

  ov.style.display = '';
}

function ekClosePanel() {
  var ov = document.getElementById('ek-overlay');
  if (ov) ov.style.display = 'none';
}

function ekPanelTab(tab, btn) {
  EK.panelTab = tab;
  document.querySelectorAll('.ek-ptab').forEach(function(b) {
    var isActive = b.getAttribute('data-tab') === tab;
    b.className = 'ek-ptab px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ' + (isActive ? 'text-orange-500 border-orange-500' : 'text-gray-400 border-transparent');
  });
  if (tab === 'stamm') ekRenderPanelStamm();
  if (tab === 'kond') ekRenderPanelKond();
  if (tab === 'protos') ekRenderPanelProtos();
  if (tab === 'new-proto') ekRenderPanelNewProto(EK.panelLief ? EK.panelLief.id : null);
}

function ekRenderPanelStamm() {
  var body = document.getElementById('ek-panel-body');
  if (!body || !EK.panelLief) return;
  var l = EK.panelLief;
  var h = '<div class="p-1 bg-gray-50 border-b border-gray-200"><p class="px-5 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Kontakt & Stammdaten</p></div>';
  h += '<div class="p-5 grid grid-cols-2 gap-4">';
  h += '<div><p class="text-xs text-gray-400 font-semibold mb-1">E-Mail</p><p class="text-sm">' + _escH(l.email_innendienst || '\u2013') + '</p></div>';
  h += '<div><p class="text-xs text-gray-400 font-semibold mb-1">Telefon</p><p class="text-sm">' + _escH(l.telefon_innendienst || '\u2013') + '</p></div>';
  h += '<div><p class="text-xs text-gray-400 font-semibold mb-1">B2B-Portal</p>' + (l.b2b_shop ? '<a href="' + _escH(l.b2b_shop) + '" target="_blank" class="text-orange-500 font-semibold text-sm">' + _escH(l.b2b_shop) + ' \u2192</a>' : '<p class="text-sm text-gray-400">\u2013</p>') + '</div>';
  h += '<div><p class="text-xs text-gray-400 font-semibold mb-1">IHT-Status</p>' + ekIhtBadge(l.status_iht) + '</div>';
  if (l.email_registrierung) h += '<div><p class="text-xs text-gray-400 font-semibold mb-1">Registrierungs-E-Mail</p><p class="text-sm">' + _escH(l.email_registrierung) + '</p></div>';
  if (l.notizen) h += '<div class="col-span-2"><p class="text-xs text-gray-400 font-semibold mb-1">Notizen</p><p class="text-sm text-gray-600">' + _escH(l.notizen) + '</p></div>';
  h += '</div>';
  body.innerHTML = h;
}

function ekRenderPanelKond() {
  var body = document.getElementById('ek-panel-body');
  if (!body || !EK.panelLief) return;
  var l = EK.panelLief;
  var r = ekCalcDB1(l);
  var db1Col = r ? (+r.db1 >= 35 ? '#22c55e' : +r.db1 >= 28 ? '#f97316' : '#dc2626') : '#9ca3af';
  EK.curBasis = l.kond_basis || 'uvp';

  var h = '';
  // DB1 Header bar
  h += '<div class="p-4 flex items-center gap-5" style="background:linear-gradient(135deg,#1C1C1E,#2C2C2E)">';
  h += '<div class="flex-1"><p class="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Richt-DB1 (netto, bei UVP 3.000\u20ac)</p>';
  h += '<div class="flex items-baseline gap-3"><span id="ek-db1-pct" class="text-3xl font-bold font-mono" style="color:' + db1Col + '">' + (r ? r.db1 + '%' : '\u2013') + '</span><span class="text-gray-500 text-xs">Rohertragsmarge netto</span></div></div>';
  h += '<div class="flex gap-4">';
  h += '<div class="text-center"><p class="text-[10px] text-gray-500 font-semibold">EK netto</p><p id="ek-db1-ek" class="text-base font-bold text-white font-mono">' + (r ? r.ekN + '\u20ac' : '\u2013') + '</p></div>';
  h += '<div class="text-center"><p class="text-[10px] text-gray-500 font-semibold">Rohertrag \u20ac</p><p id="ek-db1-roh" class="text-base font-bold font-mono" style="color:' + db1Col + '">' + (r ? r.roh + '\u20ac' : '\u2013') + '</p></div>';
  h += '<div class="text-center"><p class="text-[10px] text-gray-500 font-semibold">Inkl. Sk.+WKZ</p><p id="ek-db1-sko" class="text-base font-bold text-green-400 font-mono">' + (r && +r.db1sko > +r.db1 ? r.db1sko + '%' : '\u2013') + '</p></div>';
  h += '</div></div>';

  // Form
  h += '<div class="p-1 bg-gray-50 border-b border-gray-200"><p class="px-5 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Konditions-Logik (strukturiert)</p></div>';
  h += '<div class="p-5 flex flex-col gap-4">';

  // Basis buttons
  h += '<div><p class="text-xs text-gray-400 font-semibold mb-2">Rabattbasis \u2013 wie wird der EK berechnet?</p>';
  h += '<div class="flex gap-2">';
  var bases = [['uvp','% auf UVP','z.B. 40% auf 3.999\u20ac'],['faktor','Kalkulationsfaktor','z.B. UVP \u00f7 1,85'],['katalog','% auf Katalogpreis','Katalog \u2260 UVP']];
  bases.forEach(function(b) {
    var isActive = EK.curBasis === b[0];
    h += '<button class="ek-basis-btn flex-1 p-3 rounded-lg border-2 text-left text-xs font-bold transition-all ' + (isActive ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 bg-white text-gray-500') + '" data-v="' + b[0] + '" onclick="ekSetBasis(\'' + b[0] + '\')">' + b[1] + '<br><small class="font-normal opacity-70">' + b[2] + '</small></button>';
  });
  h += '</div></div>';

  // Input fields
  h += '<div class="grid grid-cols-3 gap-3">';
  h += '<div id="ek-f-rabatt" ' + (EK.curBasis === 'faktor' ? 'style="display:none"' : '') + '><label class="text-xs text-gray-400 font-semibold block mb-1">Rabatt auf Basis (%)</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500" id="ek-i-rabatt" type="number" step="0.5" min="0" max="80" placeholder="z.B. 40" value="' + (l.kond_rabatt || '') + '" oninput="ekLiveCalc()"></div>';
  h += '<div id="ek-f-faktor" ' + (EK.curBasis !== 'faktor' ? 'style="display:none"' : '') + '><label class="text-xs text-gray-400 font-semibold block mb-1">Kalkulationsfaktor</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500" id="ek-i-faktor" type="number" step="0.05" min="1" max="4" placeholder="1.85" value="' + (l.kond_faktor || '') + '" oninput="ekLiveCalc()"></div>';
  h += '<div id="ek-f-katauf" ' + (EK.curBasis !== 'katalog' ? 'style="display:none"' : '') + '><label class="text-xs text-gray-400 font-semibold block mb-1">Aufschlag Kat.\u2192UVP (%)</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500" id="ek-i-katauf" type="number" step="1" min="0" max="100" placeholder="20" value="' + (l.kond_kat_aufschlag || 20) + '" oninput="ekLiveCalc()"></div>';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Skonto (%)</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500" id="ek-i-sko" type="number" step="0.5" min="0" max="10" value="' + (l.kond_skonto || 0) + '" oninput="ekLiveCalc()"></div>';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Skonto-Frist (Tage)</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500" id="ek-i-skoT" type="number" step="1" value="' + (l.kond_skonto_tage || 0) + '"></div>';
  h += '</div>';

  h += '<div class="grid grid-cols-3 gap-3">';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">WKZ / Werbezuschuss (%)</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500" id="ek-i-wkz" type="number" step="0.5" min="0" max="10" value="' + (l.kond_wkz || 0) + '" oninput="ekLiveCalc()"></div>';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Zahlungsziel (Tage)</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500" id="ek-i-ziel" type="number" step="10" value="' + (l.kond_zahlungsziel || 30) + '"></div>';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Remissionsrecht (%)</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500" id="ek-i-remiss" type="number" step="5" value="' + (l.kond_remission || 0) + '"></div>';
  h += '</div>';

  // Formel box
  h += '<div id="ek-formel-box" class="bg-gray-100 rounded-xl p-4 border border-gray-200"><pre id="ek-formel-text" class="text-[11px] font-mono leading-relaxed whitespace-pre-wrap">' + (r ? ekBuildFormel(l, r) : 'Felder ausfuellen um Rechenweg zu sehen.') + '</pre><p class="text-[10px] text-gray-400 mt-2 border-t border-gray-200 pt-2">\u26a0\ufe0f Schaetzwert \u2013 basiert auf UVP 3.000\u20ac als Verkaufspreis. Tatsaechlicher DB1 vom erzielten VK abhaengig.</p></div>';

  // Freitext
  h += '<div class="border-t border-gray-200 pt-4"><label class="text-xs text-gray-400 font-semibold block mb-1">Freitext-Kondition (fuer Lieferantenverzeichnis)</label>';
  h += '<input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500" id="ek-i-freitext" value="' + _escH(l.konditionen_detail || '') + '">';
  h += '<p class="text-[11px] text-gray-400 mt-1">Wird dem Partner im Konditionen-Tab angezeigt</p></div>';

  h += '<div class="grid grid-cols-2 gap-3">';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Gueltig ab</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500" id="ek-i-gueltig" type="date" value="' + (l.kond_gueltig_ab || '') + '"></div>';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Notiz</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500" id="ek-i-notiz" value="' + _escH(l.kond_notiz || '') + '"></div>';
  h += '</div>';

  h += '<button class="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg self-start" onclick="ekSaveKond(\'' + l.id + '\')">\ud83d\udcbe Konditionen speichern</button>';
  h += '</div>';

  body.innerHTML = h;
}

function ekBuildFormel(kond, r) {
  var uvp = 3000, mwst = 1.19;
  var uvpN = (uvp / mwst).toFixed(2);
  var lines = [];
  if (kond.kond_basis === 'faktor') lines.push('UVP ' + uvp + '\u20ac \u00f7 ' + kond.kond_faktor + ' = EK ' + (uvp / kond.kond_faktor).toFixed(2) + '\u20ac brutto');
  else if (kond.kond_basis === 'uvp') lines.push('UVP ' + uvp + '\u20ac \u00d7 (1 - ' + kond.kond_rabatt + '%) = EK ' + (uvp * (1 - kond.kond_rabatt / 100)).toFixed(2) + '\u20ac brutto');
  else if (kond.kond_basis === 'katalog') {
    var kat = (uvp / (1 + (kond.kond_kat_aufschlag || 20) / 100)).toFixed(2);
    lines.push('UVP ' + uvp + '\u20ac \u00f7 (1+' + (kond.kond_kat_aufschlag || 20) + '%) = Katalog ' + kat + '\u20ac \u2192 EK ' + (kat * (1 - kond.kond_rabatt / 100)).toFixed(2) + '\u20ac');
  }
  lines.push('EK netto: ' + r.ekN + '\u20ac  |  UVP netto: ' + uvpN + '\u20ac');
  lines.push('Rohertrag: ' + uvpN + ' - ' + r.ekN + ' = ' + r.roh + '\u20ac');
  lines.push('DB1 = ' + r.roh + ' \u00f7 ' + uvpN + ' = ' + r.db1 + '%');
  if (+r.db1sko > +r.db1) lines.push('Inkl. Sk.+WKZ \u2192 DB1 = ' + r.db1sko + '%');
  return lines.join('\n');
}

function ekRenderPanelProtos() {
  var body = document.getElementById('ek-panel-body');
  if (!body || !EK.panelLief) return;
  var protos = EK.protokolle.filter(function(p) { return p.lieferant_id === EK.panelLief.id; });
  if (protos.length === 0) {
    body.innerHTML = '<div class="p-10 text-center text-gray-400"><div class="text-3xl mb-3">\ud83d\udccb</div><div class="font-semibold">Noch keine Protokolle</div></div>';
    return;
  }
  var h = '';
  protos.forEach(function(p) {
    var kondChanged = p.kond_nachher && p.kond_nachher !== '\u2013' && p.kond_nachher !== p.kond_vorher;
    h += '<div class="flex gap-3 p-4 border-b border-gray-100">';
    h += '<div class="flex flex-col items-center gap-1"><div class="w-2 h-2 rounded-full bg-orange-500"></div><div class="w-px flex-1 bg-gray-200"></div></div>';
    h += '<div class="flex-1 pb-2">';
    h += '<div class="flex gap-2 items-center mb-1"><span class="text-[11px] font-semibold text-gray-400">' + ekFmtDate(p.datum) + '</span>';
    h += '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">' + _escH(p.kontakt_art || '') + '</span>';
    if (kondChanged) h += '<span class="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">\u2705 Kond. geaendert</span>';
    h += '</div>';
    if (p.teilnehmer) h += '<div class="text-xs text-gray-400 mb-1">Teilnehmer: ' + _escH(p.teilnehmer) + '</div>';
    if (p.vollprotokoll) h += '<div class="text-xs text-gray-600">' + _escH(p.vollprotokoll) + '</div>';
    if (p.status_vorher !== p.status_nachher && p.status_nachher) h += '<div class="mt-1 p-2 bg-gray-50 rounded text-[11px]">Status: <strong>' + _escH(p.status_vorher || '\u2013') + '</strong> \u2192 <strong class="text-orange-500">' + _escH(p.status_nachher) + '</strong></div>';
    if (kondChanged) h += '<div class="mt-1 p-2 bg-green-50 rounded text-[11px] text-green-700">Kond.: <strong>' + _escH(p.kond_vorher || '\u2013') + '</strong> \u2192 <strong>' + _escH(p.kond_nachher) + '</strong></div>';
    h += '</div></div>';
  });
  body.innerHTML = h;
}

function ekRenderPanelNewProto(lieferantId) {
  var body = document.getElementById('ek-panel-body');
  if (!body) return;
  var l = EK.panelLief;
  var today = new Date().toISOString().split('T')[0];
  var h = '<div class="p-1 bg-gray-50 border-b border-gray-200"><p class="px-5 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Neues Verhandlungsprotokoll' + (l ? ' \u2013 ' + _escH(l.lieferant) : '') + '</p></div>';
  h += '<div class="p-5 flex flex-col gap-4">';

  if (!lieferantId) {
    h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Lieferant</label><select class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" id="ek-p-lief">';
    EK.lieferanten.forEach(function(x) { h += '<option value="' + x.id + '">' + _escH(x.lieferant) + '</option>'; });
    h += '</select></div>';
  }

  h += '<div class="grid grid-cols-2 gap-3">';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Datum</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" id="ek-p-datum" type="date" value="' + today + '"></div>';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Art des Kontakts</label><select class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" id="ek-p-art"><option>Telefonat</option><option>Video-Call</option><option>Meeting (vor Ort)</option><option>E-Mail</option><option>Messe-Gespraech</option></select></div>';
  h += '</div>';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Teilnehmer</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" id="ek-p-tn" placeholder="z.B. Markus Unger, Max Mustermann (Lieferant)"></div>';
  h += '<div class="grid grid-cols-2 gap-3">';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Status vorher</label><select class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" id="ek-p-stv"><option>Kontakt aufgenommen</option><option selected>In Verhandlung</option><option>In Finalisierung</option><option>Zentral fixiert</option></select></div>';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Status nachher</label><select class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" id="ek-p-stn"><option>Kontakt aufgenommen</option><option>In Verhandlung</option><option selected>In Finalisierung</option><option>Zentral fixiert</option><option>Gescheitert</option></select></div>';
  h += '</div>';
  h += '<div class="grid grid-cols-2 gap-3">';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Konditionen vorher</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" id="ek-p-kv" placeholder="\u2013" value="\u2013"></div>';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Konditionen nachher</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" id="ek-p-kn" placeholder="z.B. 15% + 2% Sk."></div>';
  h += '</div>';
  h += '<div class="grid grid-cols-2 gap-3">';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Wichtigstes Ergebnis</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" id="ek-p-erg" placeholder="z.B. Angebot bis 31.03. erwartet"></div>';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Naechster Schritt / Datum</label><input class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" id="ek-p-next" placeholder="z.B. Follow-up 15.03."></div>';
  h += '</div>';
  h += '<div><label class="text-xs text-gray-400 font-semibold block mb-1">Vollprotokoll / Freitext</label><textarea class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-[120px] resize-y" id="ek-p-text" placeholder="Details des Gespraechs, Argumente, Reaktionen, offene Punkte\u2026"></textarea></div>';
  h += '<button class="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg self-start" onclick="ekSaveProtokoll(\'' + (lieferantId || '') + '\')">Protokoll speichern</button>';
  h += '</div>';
  body.innerHTML = h;
}

// === Live DB1 Calculator ===
function ekLiveCalc() {
  var basis = EK.curBasis;
  var uvp = 3000, mwst = 1.19;
  var skonto = parseFloat(document.getElementById('ek-i-sko') ? document.getElementById('ek-i-sko').value : 0) || 0;
  var wkz = parseFloat(document.getElementById('ek-i-wkz') ? document.getElementById('ek-i-wkz').value : 0) || 0;
  var ek = null, line1 = '';

  if (basis === 'uvp') {
    var r = parseFloat(document.getElementById('ek-i-rabatt') ? document.getElementById('ek-i-rabatt').value : '');
    if (!r) { ekDB1Empty('Rabatt eingeben'); return; }
    ek = uvp * (1 - r / 100);
    line1 = 'UVP ' + uvp + '\u20ac \u00d7 (1-' + r + '%) = EK ' + ek.toFixed(2) + '\u20ac';
  } else if (basis === 'faktor') {
    var f = parseFloat(document.getElementById('ek-i-faktor') ? document.getElementById('ek-i-faktor').value : '');
    if (!f) { ekDB1Empty('Faktor eingeben'); return; }
    ek = uvp / f;
    line1 = 'UVP ' + uvp + '\u20ac \u00f7 ' + f + ' = EK ' + ek.toFixed(2) + '\u20ac';
  } else if (basis === 'katalog') {
    var r2 = parseFloat(document.getElementById('ek-i-rabatt') ? document.getElementById('ek-i-rabatt').value : '');
    var a = parseFloat(document.getElementById('ek-i-katauf') ? document.getElementById('ek-i-katauf').value : '') || 20;
    if (!r2) { ekDB1Empty('Rabatt eingeben'); return; }
    var kat = uvp / (1 + a / 100);
    ek = kat * (1 - r2 / 100);
    line1 = 'UVP ' + uvp + '\u20ac \u00f7 (1+' + a + '%) = Kat. ' + kat.toFixed(2) + '\u20ac \u2192 EK ' + ek.toFixed(2) + '\u20ac';
  }

  var uvpN = uvp / mwst, ekN = ek / mwst;
  var roh = uvpN - ekN, db1 = roh / uvpN * 100;
  var ekSko = ekN * (1 - skonto / 100);
  var wkzE = uvpN * (wkz / 100);
  var db1full = ((uvpN - ekSko + wkzE) / uvpN) * 100;
  var col = db1 >= 35 ? '#22c55e' : db1 >= 28 ? '#f97316' : '#dc2626';

  var p = document.getElementById('ek-db1-pct');
  if (p) { p.textContent = db1.toFixed(1) + '%'; p.style.color = col; }
  var e = document.getElementById('ek-db1-ek');
  if (e) e.textContent = ekN.toFixed(0) + '\u20ac';
  var rr = document.getElementById('ek-db1-roh');
  if (rr) { rr.textContent = roh.toFixed(0) + '\u20ac'; rr.style.color = col; }
  var sk = document.getElementById('ek-db1-sko');
  if (sk) sk.textContent = (skonto > 0 || wkz > 0) ? db1full.toFixed(1) + '%' : '\u2013';
  var ft = document.getElementById('ek-formel-text');
  if (ft) {
    var lines = [line1, 'EK netto: ' + ekN.toFixed(2) + '\u20ac  |  UVP netto: ' + uvpN.toFixed(2) + '\u20ac', 'Rohertrag: ' + uvpN.toFixed(2) + ' - ' + ekN.toFixed(2) + ' = ' + roh.toFixed(2) + '\u20ac', 'DB1 = ' + roh.toFixed(2) + ' \u00f7 ' + uvpN.toFixed(2) + ' = ' + db1.toFixed(1) + '%'];
    if (skonto > 0 || wkz > 0) lines.push('Inkl. ' + skonto + '% Sk. + ' + wkz + '% WKZ \u2192 DB1 = ' + db1full.toFixed(1) + '%');
    ft.textContent = lines.join('\n');
  }
}

function ekDB1Empty(hint) {
  var ids = ['ek-db1-pct', 'ek-db1-ek', 'ek-db1-roh', 'ek-db1-sko'];
  ids.forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = '\u2013'; });
  var ft = document.getElementById('ek-formel-text');
  if (ft) ft.textContent = hint;
}

function ekSetBasis(val) {
  EK.curBasis = val;
  document.querySelectorAll('.ek-basis-btn').forEach(function(b) {
    var isActive = b.getAttribute('data-v') === val;
    b.className = 'ek-basis-btn flex-1 p-3 rounded-lg border-2 text-left text-xs font-bold transition-all ' + (isActive ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 bg-white text-gray-500');
  });
  var fd = document.getElementById('ek-f-rabatt');
  var ff = document.getElementById('ek-f-faktor');
  var fk = document.getElementById('ek-f-katauf');
  if (fd) fd.style.display = val === 'faktor' ? 'none' : '';
  if (ff) ff.style.display = val === 'faktor' ? '' : 'none';
  if (fk) fk.style.display = val === 'katalog' ? '' : 'none';
  ekLiveCalc();
}

// === Save Konditionen ===
async function ekSaveKond(lieferantId) {
  var basis = EK.curBasis;
  var updates = {
    kond_basis: basis,
    kond_rabatt: basis !== 'faktor' ? parseFloat(document.getElementById('ek-i-rabatt') ? document.getElementById('ek-i-rabatt').value : '') || null : null,
    kond_faktor: basis === 'faktor' ? parseFloat(document.getElementById('ek-i-faktor') ? document.getElementById('ek-i-faktor').value : '') || null : null,
    kond_kat_aufschlag: basis === 'katalog' ? parseFloat(document.getElementById('ek-i-katauf') ? document.getElementById('ek-i-katauf').value : '') || 20 : null,
    kond_skonto: parseFloat(document.getElementById('ek-i-sko') ? document.getElementById('ek-i-sko').value : '') || 0,
    kond_skonto_tage: parseInt(document.getElementById('ek-i-skoT') ? document.getElementById('ek-i-skoT').value : '') || 0,
    kond_wkz: parseFloat(document.getElementById('ek-i-wkz') ? document.getElementById('ek-i-wkz').value : '') || 0,
    kond_zahlungsziel: parseInt(document.getElementById('ek-i-ziel') ? document.getElementById('ek-i-ziel').value : '') || 30,
    kond_remission: parseFloat(document.getElementById('ek-i-remiss') ? document.getElementById('ek-i-remiss').value : '') || 0,
    konditionen_detail: document.getElementById('ek-i-freitext') ? document.getElementById('ek-i-freitext').value : null,
    kond_gueltig_ab: document.getElementById('ek-i-gueltig') ? document.getElementById('ek-i-gueltig').value || null : null,
    kond_notiz: document.getElementById('ek-i-notiz') ? document.getElementById('ek-i-notiz').value || null : null
  };
  var res = await _sb().from('lieferanten').update(updates).eq('id', lieferantId);
  if (res.error) { _showToast('Fehler: ' + res.error.message, 'error'); return; }
  _showToast('Konditionen gespeichert', 'success');
  var idx = EK.lieferanten.findIndex(function(l) { return l.id === lieferantId; });
  if (idx >= 0) {
    Object.keys(updates).forEach(function(k) { EK.lieferanten[idx][k] = updates[k]; });
  }
}

// === Save Protokoll ===
async function ekSaveProtokoll(lieferantId) {
  var lid = lieferantId || (document.getElementById('ek-p-lief') ? document.getElementById('ek-p-lief').value : null);
  if (!lid) { _showToast('Kein Lieferant gewaehlt', 'error'); return; }
  var row = {
    lieferant_id: lid,
    datum: document.getElementById('ek-p-datum') ? document.getElementById('ek-p-datum').value : null,
    kontakt_art: document.getElementById('ek-p-art') ? document.getElementById('ek-p-art').value : 'Telefonat',
    teilnehmer: document.getElementById('ek-p-tn') ? document.getElementById('ek-p-tn').value : null,
    status_vorher: document.getElementById('ek-p-stv') ? document.getElementById('ek-p-stv').value : null,
    status_nachher: document.getElementById('ek-p-stn') ? document.getElementById('ek-p-stn').value : null,
    kond_vorher: document.getElementById('ek-p-kv') ? document.getElementById('ek-p-kv').value : null,
    kond_nachher: document.getElementById('ek-p-kn') ? document.getElementById('ek-p-kn').value : null,
    ergebnis: document.getElementById('ek-p-erg') ? document.getElementById('ek-p-erg').value : null,
    naechster_schritt: document.getElementById('ek-p-next') ? document.getElementById('ek-p-next').value : null,
    vollprotokoll: document.getElementById('ek-p-text') ? document.getElementById('ek-p-text').value : null,
    erstellt_von: window.sbUser ? window.sbUser.id : null
  };
  var res = await _sb().from('lieferanten_protokolle').insert(row);
  if (res.error) { _showToast('Fehler: ' + res.error.message, 'error'); return; }
  _showToast('Protokoll gespeichert', 'success');
  await ekLoad();
  if (lid) ekOpenPanel(lid);
}

// === Window Exports ===
window.renderEinkaufV2 = renderEinkaufV2;
window.ekSwitchView    = ekSwitchView;
window.ekHqTab         = ekHqTab;
window.ekPartnerTab    = ekPartnerTab;
window.ekOpenPanel     = ekOpenPanel;
window.ekClosePanel    = ekClosePanel;
window.ekPanelTab      = ekPanelTab;
window.ekSetBasis      = ekSetBasis;
window.ekLiveCalc      = ekLiveCalc;
window.ekSaveKond      = ekSaveKond;
window.ekSaveProtokoll = ekSaveProtokoll;
// Alias for backward compat
window.showHqEkTab = function(tab) { if (window.renderEinkaufV2) window.renderEinkaufV2(); };
window.showEinkaufTab = window.showHqEkTab;
window.einkaufV2ShowTab = window.showHqEkTab;
