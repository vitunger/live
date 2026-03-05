/**
 * views/marketing.js - Marketing Module Router + Shared Logic
 *
 * Router prüft Rolle (Partner vs HQ) und delegiert an:
 * - marketing-partner.js (Partner-Views)
 * - marketing-hq.js (HQ-Views)
 *
 * Shared: Supabase-Queries, Chart-Helpers, Formatierung, Monats-Logik
 *
 * @module views/marketing
 */
(function() {
'use strict';

// ── Safe Helpers ──
function _sb() { return window.sb; }
function _sbProfile() { return window.sbProfile; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _escH(s) { return typeof window.escH === 'function' ? window.escH(s) : String(s||''); }
function _fmtN(n) { return typeof window.fmtN === 'function' ? window.fmtN(n) : Number(n||0).toLocaleString('de-DE'); }
function _fmtEur(n) { return typeof window.fmtEur === 'function' ? window.fmtEur(n) : _fmtN(n) + ' \u20ac'; }

// ── Constants ──
var SEASON_WEIGHTS = [4,8,10,11,12,11,11,10,9,6,5,3]; // Jan-Dez
var MONTH_NAMES = ['Jan','Feb','M\u00e4r','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
var MONTH_NAMES_FULL = ['Januar','Februar','M\u00e4rz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
var CHART_COLORS = {
    orange: '#EF7D00',
    orangeLight: 'rgba(239,125,0,.2)',
    green: '#22C55E',
    blue: '#3B82F6',
    red: '#EF4444',
    amber: '#F59E0B',
    gray: '#9CA3AF',
    grayLight: '#D1D5DB'
};

// ── State ──
var mktState = {
    selectedMonth: null, // {year, month} - null = aktueller Monat
    vereinbarung: null,  // Partner: eigene Vereinbarung
    vereinbarungen: [],  // HQ: alle Vereinbarungen
    adsData: [],         // ads_performance Daten
    leadTracking: [],    // marketing_lead_tracking Daten
    charts: {},          // Chart.js instances
    activeTab: null      // aktueller Tab-Name
};

// ── Monat-Logik ──
function getCurrentMonth() {
    if (mktState.selectedMonth) return mktState.selectedMonth;
    var now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function setSelectedMonth(year, month) {
    mktState.selectedMonth = { year: year, month: month };
    // Dropdown synchronisieren
    var sel = document.getElementById('mktMonthSelect');
    if (sel) sel.value = year + '-' + String(month).padStart(2, '0');
    // Re-render aktiven Tab + Daten neu laden
    reloadAndRender();
}

async function reloadAndRender() {
    var isHq = _sbProfile() && _sbProfile().is_hq;
    var standortId = isHq ? null : (_sbProfile() && _sbProfile().standort_id);
    await Promise.all([
        loadAdsData(standortId),
        loadLeadTracking(standortId)
    ]);
    if (mktState.activeTab) {
        if (isHq && typeof window.renderHqMktTabContent === 'function') {
            window.renderHqMktTabContent(mktState.activeTab);
        } else if (!isHq && typeof window.renderPartnerMktTabContent === 'function') {
            window.renderPartnerMktTabContent(mktState.activeTab);
        }
    }
}

function getMonthLabel(m) {
    if (!m) m = getCurrentMonth();
    return MONTH_NAMES_FULL[m.month - 1] + ' ' + m.year;
}

// Monats-Dropdown: verfügbare Monate aus ads_performance ermitteln
async function initMonthSelect() {
    var sb = _sb();
    if (!sb) return;
    try {
        var { data } = await sb.from('ads_performance').select('datum').order('datum', { ascending: false });
        if (!data || !data.length) return;

        // Distinct year-month Paare extrahieren
        var seen = {};
        var months = [];
        data.forEach(function(r) {
            if (!r.datum) return;
            var d = new Date(r.datum);
            var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            if (!seen[key]) {
                seen[key] = true;
                months.push({ year: d.getFullYear(), month: d.getMonth() + 1, key: key });
            }
        });

        mktState.availableMonths = months;

        // Auto-Select: letzter Monat mit Daten (falls kein Monat gewählt)
        if (!mktState.selectedMonth && months.length) {
            mktState.selectedMonth = { year: months[0].year, month: months[0].month };
        }
    } catch(e) { console.warn('[marketing] initMonthSelect:', e.message); }
}

function renderMonthSelector() {
    var months = mktState.availableMonths || [];
    var current = getCurrentMonth();
    var currentKey = current.year + '-' + String(current.month).padStart(2, '0');

    // Aktuellen Monat als Option einfügen falls nicht in Daten
    var hasCurrentKey = months.some(function(m) { return m.key === currentKey; });
    var allMonths = hasCurrentKey ? months : [{ year: current.year, month: current.month, key: currentKey }].concat(months);

    var options = allMonths.map(function(m) {
        var selected = m.key === currentKey ? ' selected' : '';
        return '<option value="' + m.key + '"' + selected + '>' + MONTH_NAMES_FULL[m.month - 1] + ' ' + m.year + '</option>';
    }).join('');

    return '<select id="mktMonthSelect" onchange="mktOnMonthChange(this.value)" ' +
        'class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold bg-white">' +
        options + '</select>';
}

function onMonthChange(val) {
    var parts = val.split('-');
    var year = parseInt(parts[0]);
    var month = parseInt(parts[1]);
    mktState.selectedMonth = { year: year, month: month };
    reloadAndRender();
}

// ── Supabase Queries ──

// Vereinbarung für aktuellen Partner laden
async function loadVereinbarung() {
    var sb = _sb();
    var p = _sbProfile();
    if (!sb || !p || !p.standort_id) return null;
    try {
        var { data, error } = await sb
            .from('marketing_vereinbarungen')
            .select('*')
            .eq('standort_id', p.standort_id)
            .eq('jahr', new Date().getFullYear())
            .maybeSingle();
        if (error) { console.warn('[marketing] loadVereinbarung:', error.message); return null; }
        mktState.vereinbarung = data;
        return data;
    } catch(e) { console.warn('[marketing] loadVereinbarung:', e.message); return null; }
}

// Alle Vereinbarungen für HQ laden
async function loadAlleVereinbarungen() {
    var sb = _sb();
    if (!sb) return [];
    try {
        var { data, error } = await sb
            .from('marketing_vereinbarungen')
            .select('*, standorte!inner(name, plz, is_demo)')
            .eq('standorte.is_demo', false)
            .order('budget_jahr', { ascending: false });
        if (error) { console.warn('[marketing] loadAlleVereinbarungen:', error.message); return []; }
        mktState.vereinbarungen = data || [];
        return data || [];
    } catch(e) { console.warn('[marketing] loadAlleVereinbarungen:', e.message); return []; }
}

// Ads Performance Daten laden (aus ads_performance Tabelle)
async function loadAdsData(standortId) {
    var sb = _sb();
    if (!sb) return [];
    try {
        var m = getCurrentMonth();
        var startStr = m.year + '-' + String(m.month).padStart(2, '0') + '-01';
        var endDate = new Date(m.year, m.month, 0); // last day of month
        var endStr = m.year + '-' + String(m.month).padStart(2, '0') + '-' + String(endDate.getDate()).padStart(2, '0');
        var query = sb
            .from('ads_performance')
            .select('*')
            .gte('datum', startStr)
            .lte('datum', endStr);
        if (standortId) query = query.eq('standort_id', standortId);
        var { data, error } = await query;
        if (error) { console.warn('[marketing] loadAdsData:', error.message); return []; }
        mktState.adsData = data || [];
        return data || [];
    } catch(e) { console.warn('[marketing] loadAdsData:', e.message); return []; }
}

// Lead Tracking Daten laden
async function loadLeadTracking(standortId) {
    var sb = _sb();
    if (!sb) return [];
    try {
        var query = sb
            .from('marketing_lead_tracking')
            .select('*')
            .eq('jahr', new Date().getFullYear())
            .order('monat');
        if (standortId) query = query.eq('standort_id', standortId);
        var { data, error } = await query;
        if (error) { console.warn('[marketing] loadLeadTracking:', error.message); return []; }
        mktState.leadTracking = data || [];
        return data || [];
    } catch(e) { console.warn('[marketing] loadLeadTracking:', e.message); return []; }
}

// ── Chart Helpers ──

function destroyChart(id) {
    if (mktState.charts[id]) {
        mktState.charts[id].destroy();
        delete mktState.charts[id];
    }
}

function makeChart(canvasId, cfg) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;
    destroyChart(canvasId);
    var chart = new Chart(canvas.getContext('2d'), cfg);
    mktState.charts[canvasId] = chart;
    return chart;
}

function chartBarLine(canvasId, labels, barData, lineData, barLabel, lineLabel) {
    return makeChart(canvasId, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { type: 'bar', label: barLabel, data: barData, backgroundColor: CHART_COLORS.orangeLight, borderColor: CHART_COLORS.orange, borderWidth: 1.5, borderRadius: 6, order: 2 },
                { type: 'line', label: lineLabel, data: lineData, borderColor: CHART_COLORS.green, backgroundColor: 'transparent', borderWidth: 2, pointRadius: 4, pointBackgroundColor: CHART_COLORS.green, tension: .3, order: 1 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, usePointStyle: true, padding: 16 } } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' } } } }
    });
}

function chartDoughnut(canvasId, labels, data, colors) {
    return makeChart(canvasId, {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, usePointStyle: true, padding: 16 } } } }
    });
}

function chartLine(canvasId, labels, datasets) {
    return makeChart(canvasId, {
        type: 'line',
        data: { labels: labels, datasets: datasets.map(function(ds) { return Object.assign({}, ds, { tension: .35, pointRadius: 4, borderWidth: 2, fill: ds.fill || false }); }) },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, usePointStyle: true, padding: 16 } } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' } } } }
    });
}

// ── Formatting Helpers ──

function statusPill(pct) {
    var cls = pct >= 90 ? 'bg-green-100 text-green-700' : pct >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
    var txt = pct >= 90 ? 'On Track' : pct >= 70 ? 'Knapp' : 'Unter Ziel';
    return '<span class="text-xs px-2 py-1 rounded-full font-semibold ' + cls + '">' + pct + '% \u2013 ' + txt + '</span>';
}

function progressBar(pct, height) {
    var h = height || 6;
    var col = pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-red-500';
    var w = Math.min(pct, 100);
    return '<div class="bg-gray-200 rounded-full overflow-hidden" style="height:' + h + 'px"><div class="rounded-full ' + col + '" style="height:100%;width:' + w + '%;transition:width .5s ease"></div></div>';
}

function kpiCard(label, value, sub, change) {
    var changeHtml = '';
    if (change) {
        var up = change > 0;
        changeHtml = '<div class="text-xs font-semibold mt-1 ' + (up ? 'text-green-600' : 'text-red-600') + '">' + (up ? '\u2191' : '\u2193') + ' ' + Math.abs(change) + '% vs. Vormonat</div>';
    }
    return '<div class="vit-card p-5"><div class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">' + _escH(label) + '</div>' +
        '<div class="text-2xl font-bold text-gray-800">' + _escH(value) + '</div>' +
        '<div class="text-xs text-gray-500 mt-1">' + _escH(sub) + '</div>' +
        changeHtml + '</div>';
}

// ── YTD-Berechnung ──

function calcYTD(vb) {
    if (!vb) return { budgetSoll: 0, budgetIst: 0, leadsSoll: 0, leadsIst: 0, budgetPct: 0, leadsPct: 0 };
    var m = getCurrentMonth();
    var totalWeight = 0;
    for (var i = 0; i < m.month; i++) totalWeight += (vb.saison_gewichtung || SEASON_WEIGHTS)[i];
    var budgetSoll = Math.round(vb.budget_jahr * totalWeight / 100);
    var leadsSoll = Math.round((vb.max_leads || 0) * totalWeight / 100);

    // Ist-Werte aus lead_tracking summieren
    var budgetIst = 0, leadsIst = 0;
    (mktState.leadTracking || []).forEach(function(lt) {
        if (lt.standort_id === vb.standort_id && lt.jahr === vb.jahr && lt.monat <= m.month) {
            budgetIst += Number(lt.budget_ist || 0);
            leadsIst += Number(lt.leads_ist || 0);
        }
    });

    return {
        budgetSoll: budgetSoll,
        budgetIst: budgetIst,
        leadsSoll: leadsSoll,
        leadsIst: leadsIst,
        budgetPct: budgetSoll > 0 ? Math.round(budgetIst / budgetSoll * 100) : 0,
        leadsPct: leadsSoll > 0 ? Math.round(leadsIst / leadsSoll * 100) : 0
    };
}

// ── Tab-Switching ──

function showMarketingTab(tabName) {
    mktState.activeTab = tabName;
    var isHq = _sbProfile() && _sbProfile().is_hq;

    // Tab-Buttons highlighten
    var btnClass = isHq ? '.hqmkt-tab-btn' : '.mkt-tab-btn';
    var dataAttr = isHq ? 'data-hqmkt' : 'data-mkt';
    document.querySelectorAll(btnClass).forEach(function(btn) {
        var isActive = btn.getAttribute(dataAttr) === tabName;
        btn.className = btnClass.slice(1) + ' whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ' +
            (isActive ? 'border-vit-orange text-vit-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300');
    });

    // Tab-Content rendern
    if (isHq && typeof window.renderHqMktTabContent === 'function') {
        window.renderHqMktTabContent(tabName);
    } else if (!isHq && typeof window.renderPartnerMktTabContent === 'function') {
        window.renderPartnerMktTabContent(tabName);
    }
}

// ── Render Entry Points ──

async function renderMarketing() {
    var p = _sbProfile();
    if (!p) return;
    if (p.is_hq) {
        if (typeof window.renderHqMarketing === 'function') window.renderHqMarketing();
    } else {
        if (typeof window.renderPartnerMarketing === 'function') window.renderPartnerMarketing();
    }
}

// Glossar-Daten (statisch, aus Mockup)
var GLOSSAR = [
    { term: 'Impressionen', def: 'So oft wurde deine Anzeige auf einem Bildschirm angezeigt. Eine Person kann deine Anzeige mehrfach sehen.' },
    { term: 'Reichweite', def: 'Wie viele einzelne Personen deine Anzeige mindestens einmal gesehen haben. Jede Person wird nur einmal gez\u00e4hlt.' },
    { term: 'Klicks', def: 'Wie oft jemand auf deine Anzeige geklickt hat \u2013 z.B. um auf deine Website zu kommen.' },
    { term: 'CTR (Click-Through-Rate)', def: 'Der Prozentsatz der Leute, die deine Anzeige gesehen und darauf geklickt haben. Formel: Klicks \u00f7 Impressionen \u00d7 100.' },
    { term: 'CPC (Cost per Click)', def: 'Was dich ein einzelner Klick auf deine Anzeige kostet. Formel: Ausgaben \u00f7 Klicks.' },
    { term: 'CPM (Cost per Mille)', def: 'Was es kostet, deine Anzeige 1.000 Mal anzuzeigen. Typischer Vergleichswert f\u00fcr die Effizienz.' },
    { term: 'CPL (Cost per Lead)', def: 'Was dich ein Lead (Kontaktanfrage oder Termin) kostet. Formel: Ausgaben \u00f7 Leads.' },
    { term: 'Leads', def: 'Potenzielle Kunden, die durch deine Werbung Kontakt aufgenommen haben \u2013 z.B. Terminbuchung, Kontaktformular oder Anruf.' },
    { term: 'Store Visits (25%)', def: 'Google sch\u00e4tzt, wie viele Leute nach dem Klick auf die Anzeige deinen Laden besucht haben. Wir gewichten diese mit 25%, weil es eine Sch\u00e4tzung ist.' },
    { term: 'Conversion Rate', def: 'Der Prozentsatz der Website-Besucher, die eine gew\u00fcnschte Aktion ausf\u00fchren (z.B. Termin buchen). Formel: Conversions \u00f7 Klicks \u00d7 100.' },
    { term: 'ROAS (Return on Ad Spend)', def: 'Wie viel Umsatz du f\u00fcr jeden investierten Werbe-Euro zur\u00fcckbekommst. ROAS 4x = 4 \u20ac Umsatz pro 1 \u20ac Werbeausgaben.' },
    { term: 'Quality Score', def: 'Google bewertet deine Anzeigen von 1\u201310 nach Relevanz. H\u00f6herer Score = niedrigere Klickpreise und bessere Platzierung.' },
    { term: 'Absprungrate', def: 'Wie viel Prozent der Besucher deine Website sofort wieder verlassen, ohne sich umzuschauen. Niedrig = gut.' },
    { term: 'Frequency', def: 'Wie oft eine Person deine Anzeige im Durchschnitt gesehen hat. Zu hohe Frequency (>5) kann nerven.' }
];

// ── Window Exports ──
window.mktState = mktState;
window.MKT_SEASON_WEIGHTS = SEASON_WEIGHTS;
window.MKT_MONTH_NAMES = MONTH_NAMES;
window.MKT_MONTH_NAMES_FULL = MONTH_NAMES_FULL;
window.MKT_CHART_COLORS = CHART_COLORS;
window.MKT_GLOSSAR = GLOSSAR;
window.mktGetCurrentMonth = getCurrentMonth;
window.mktSetSelectedMonth = setSelectedMonth;
window.mktGetMonthLabel = getMonthLabel;
window.mktInitMonthSelect = initMonthSelect;
window.mktRenderMonthSelector = renderMonthSelector;
window.mktOnMonthChange = onMonthChange;
window.mktLoadVereinbarung = loadVereinbarung;
window.mktLoadAlleVereinbarungen = loadAlleVereinbarungen;
window.mktLoadAdsData = loadAdsData;
window.mktLoadLeadTracking = loadLeadTracking;
window.mktDestroyChart = destroyChart;
window.mktMakeChart = makeChart;
window.mktChartBarLine = chartBarLine;
window.mktChartDoughnut = chartDoughnut;
window.mktChartLine = chartLine;
window.mktStatusPill = statusPill;
window.mktProgressBar = progressBar;
window.mktKpiCard = kpiCard;
window.mktCalcYTD = calcYTD;
window.showMarketingTab = showMarketingTab;
window.renderMarketing = renderMarketing;
window.mktEscH = _escH;
window.mktFmtN = _fmtN;
window.mktFmtEur = _fmtEur;

})();
