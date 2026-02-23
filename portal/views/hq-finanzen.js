/**
 * views/hq-finanzen.js - Partner-Portal HQ Finanzen (Redesign v2)
 * Unified finance dashboard: one table, tabs for BWA/Upload, BWA > WaWi priority
 * @module views/hq-finanzen
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// ── Local State ──
var hqFinActiveTab = 'uebersicht';
var hqFinStandorte = []; // enriched standorte for this module
var hqFinBwaMap = {};    // standort_id → latest BWA entry
var hqFinPlanMap = {};   // standort_id → plan data
var hqFinSortCol = 'name';
var hqFinSortAsc = true;
var hqFinLoaded = false;
var _hqFinMonatLabels = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

// ── Helpers ──
function hqFinFmt(n) {
    if(!n && n !== 0) return '—';
    if(Math.abs(n) >= 1000) return Math.round(n/1000).toLocaleString('de-DE') + 'k';
    return Math.round(n).toLocaleString('de-DE');
}
function hqFinFmtE(n) {
    if(!n && n !== 0) return '—';
    return Math.round(n).toLocaleString('de-DE') + ' €';
}

// === MAIN RENDER ===
var _hqFinRendering = false;
export async function renderHqFinanzen() {
    if (_hqFinRendering) return;
    _hqFinRendering = true;
    try {
        await loadHqFinData();
        renderHqFinKpis();
        renderHqFinUebersicht();
    } finally {
        _hqFinRendering = false;
    }
}

// === DATA LOADING ===
async function loadHqFinData() {
    try {
        var currentYear = new Date().getFullYear();
        console.log('[hq-finanzen] Loading data for year', currentYear);

        // 1. Standorte
        var sResp = await _sb().from('standorte').select('*').order('name');
        if(sResp.error) throw sResp.error;
        var standorte = sResp.data || [];
        console.log('[hq-finanzen] Standorte:', standorte.length);

        // 2. BWA data (all months current year) – THIS IS PRIORITY
        var bwaResp = await _sb().from('bwa_daten')
            .select('standort_id, monat, jahr, umsatzerloese, rohertrag, wareneinsatz, gesamtkosten, ergebnis_vor_steuern, personalkosten, raumkosten, created_at, datei_name, datei_url, format')
            .eq('jahr', currentYear);
        if(bwaResp.error) { console.warn('[hq-finanzen] BWA query error:', bwaResp.error); }
        var bwaData = bwaResp.data || [];
        console.log('[hq-finanzen] BWA entries:', bwaData.length);

        // 3. Jahresplaene (current year + previous year as fallback)
        var planResp = await _sb().from('jahresplaene')
            .select('standort_id, jahr, plan_daten, updated_at')
            .in('jahr', [currentYear, currentYear - 1])
            .order('jahr', { ascending: false });
        if(planResp.error) { console.warn('[hq-finanzen] Plan query error:', JSON.stringify(planResp.error)); }
        if(planResp.status) { console.log('[hq-finanzen] Plan query status:', planResp.status, planResp.statusText); }
        var planData = planResp.data || [];
        hqFinPlanMap = {};
        // Current year takes priority, fallback to previous year
        planData.forEach(function(p) { 
            if (!hqFinPlanMap[p.standort_id] || p.jahr === currentYear) {
                hqFinPlanMap[p.standort_id] = p; 
            }
        });
        console.log('[hq-finanzen] Plans:', planData.length, '(current year:', planData.filter(function(p){return p.jahr===currentYear;}).length, ', prev year:', planData.filter(function(p){return p.jahr===currentYear-1;}).length, ')');

        // 4. WaWi Belege (Fallback if no BWA)
        var wawiResp = await _sb().from('wawi_belege')
            .select('standort_id, beleg_typ, endbetrag, ist_leasing, datum, created_at')
            .eq('status', 'neu')
            .gte('datum', currentYear + '-01-01')
            .lte('datum', currentYear + '-12-31');
        if(wawiResp.error) { console.warn('[hq-finanzen] WaWi query error:', wawiResp.error); }
        var wawiData = wawiResp.data || [];
        console.log('[hq-finanzen] WaWi entries:', wawiData.length);

        // 5. BWA submissions for current BWA month (for status)
        var bwaMo = getBwaMonthHqFin(new Date());
        console.log('[hq-finanzen] BWA month check:', bwaMo);
        var bwaStatusResp = await _sb().from('bwa_daten')
            .select('standort_id, created_at')
            .eq('monat', bwaMo.m + 1)
            .eq('jahr', bwaMo.y);
        if(bwaStatusResp.error) { console.warn('[hq-finanzen] BWA status query error:', bwaStatusResp.error); }
        hqFinBwaMap = {};
        (bwaStatusResp.data || []).forEach(function(b) {
            hqFinBwaMap[b.standort_id] = b.created_at;
        });
        console.log('[hq-finanzen] BWA submitted this month:', Object.keys(hqFinBwaMap).length);

        // Build enriched array
        hqFinStandorte = standorte.map(function(s) {
            var sBwa = bwaData.filter(function(b) { return b.standort_id === s.id; });
            var bwaUmsatz = sBwa.reduce(function(a, b) { return a + (parseFloat(b.umsatzerloese) || 0); }, 0);
            // Rohertrag: absolute value in DB, need to calculate percentage
            var totalRohertragAbs = sBwa.reduce(function(a, b) { return a + (parseFloat(b.rohertrag) || 0); }, 0);
            var rohertragPct = bwaUmsatz > 0 ? (totalRohertragAbs / bwaUmsatz * 100) : 0;
            var bwaMonate = sBwa.length;

            // WaWi as fallback
            var sWawi = wawiData.filter(function(b) { return b.standort_id === s.id; });
            var sRechnungen = sWawi.filter(function(b) { return b.beleg_typ === 'rechnung'; });
            var wawiUmsatz = sRechnungen.reduce(function(a, b) { return a + (parseFloat(b.endbetrag) || 0); }, 0);
            var wawiAnzahl = sWawi.length;
            var wawiLeasingAnzahl = sWawi.filter(function(b) { return b.ist_leasing; }).length;
            var wawiLeasingQuote = wawiAnzahl > 0 ? Math.round(wawiLeasingAnzahl / wawiAnzahl * 100) : 0;

            // BWA > WaWi priority
            var umsatzIst = bwaUmsatz > 0 ? bwaUmsatz : wawiUmsatz;
            var datenquelle = bwaUmsatz > 0 ? 'bwa' : (wawiUmsatz > 0 ? 'wawi' : 'keine');

            // Plan data
            var plan = hqFinPlanMap[s.id];
            var planUmsatzYtd = 0;
            if (plan && plan.plan_daten) {
                var currentMonth = new Date().getMonth() + 1;
                var pd = plan.plan_daten;
                for (var m = 1; m <= currentMonth; m++) {
                    if (pd[m] && pd[m].umsatz) planUmsatzYtd += pd[m].umsatz;
                    else if (pd[String(m)] && pd[String(m)].umsatz) planUmsatzYtd += pd[String(m)].umsatz;
                }
            }
            // Fallback to standort-level plan
            if (!planUmsatzYtd && s.umsatz_plan_ytd) planUmsatzYtd = s.umsatz_plan_ytd;

            // BWA status for current month
            var bwaEingereicht = !!hqFinBwaMap[s.id];
            var bwaDate = hqFinBwaMap[s.id] || null;

            return {
                id: s.id,
                name: s.name || 'Unbekannt',
                inhaber: s.inhaber_name || '',
                umsatzIst: umsatzIst,
                umsatzBwa: bwaUmsatz,
                umsatzWawi: wawiUmsatz,
                umsatzPlan: planUmsatzYtd,
                datenquelle: datenquelle,
                rohertrag: parseFloat(rohertragPct.toFixed(1)),
                bwaMonate: bwaMonate,
                bwaMonateDetail: sBwa.map(function(b) { return { monat: b.monat, umsatz: parseFloat(b.umsatzerloese) || 0, rohertrag: parseFloat(b.rohertrag) || 0, rohertragAbs: parseFloat(b.rohertrag) || 0, wareneinsatz: parseFloat(b.wareneinsatz) || 0, personalkosten: parseFloat(b.personalkosten) || 0, ergebnis: parseFloat(b.ergebnis_vor_steuern) || 0, datum: b.created_at, datei_url: b.datei_url || null, datei_name: b.datei_name || null }; }),
                bwaEingereicht: bwaEingereicht,
                bwaDate: bwaDate,
                planVorhanden: !!plan,
                planDaten: plan && plan.plan_daten ? plan.plan_daten : null,
                wawiAnzahl: wawiAnzahl,
                wawiLeasingQuote: wawiLeasingQuote
            };
        });

        hqFinLoaded = true;
        console.log('[hq-finanzen] ✅ Loaded', hqFinStandorte.length, 'standorte. Active:', hqFinStandorte.filter(function(s){return s.umsatzIst>0;}).length);
    } catch(err) {
        console.error('[hq-finanzen] ❌ Load error:', err.message || err, err);
        hqFinStandorte = [];
    }
}

function getBwaMonthHqFin(date) {
    var m = date.getMonth(); // 0-based
    var y = date.getFullYear();
    if (date.getDate() <= 20 && m > 0) { m = m - 1; }
    else if (date.getDate() <= 20 && m === 0) { m = 11; y--; }
    return { m: m, y: y }; // m is 0-based
}

// === KPI RENDERING ===
function renderHqFinKpis() {
    var el = document.getElementById('hqFinKpisNew');
    if (!el) return;

    var active = hqFinStandorte.filter(function(s) { return s.umsatzIst > 0; });
    var totalU = hqFinStandorte.reduce(function(a, s) { return a + s.umsatzIst; }, 0);
    var totalP = hqFinStandorte.reduce(function(a, s) { return a + s.umsatzPlan; }, 0);
    var avgRoh = active.length ? (active.reduce(function(a, s) { return a + s.rohertrag; }, 0) / active.length).toFixed(1) : 0;
    var planAbw = totalP > 0 ? Math.round((totalU / totalP - 1) * 100) : null;

    // BWA count: how many standorte have at least 1 BWA this year
    var mitBwa = hqFinStandorte.filter(function(s) { return s.bwaMonate > 0; }).length;
    // Last completed month name
    var lastMonth = new Date().getMonth(); // 0=Jan means last completed = Dec of prev year
    // Actually: current month is Feb (index 1), last completed = Jan (index 0)
    // Last completed month: if we're in Feb (index 1), last completed = Jan (index 0)
    var currentMonth0 = new Date().getMonth(); // 0-based
    var lastCompletedMonth = currentMonth0 > 0 ? currentMonth0 - 1 : 11;
    var lastCompletedYear = currentMonth0 > 0 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    var monatName = _hqFinMonatLabels[lastCompletedMonth] || '?';

    // Standorte with data (BWA or WaWi)
    var mitDaten = hqFinStandorte.filter(function(s) { return s.datenquelle !== 'keine'; }).length;

    el.innerHTML = ''
        + '<div class="vit-card p-5">'
        + '<p class="text-xs text-gray-400 uppercase tracking-wide">Netzwerk-Umsatz YTD</p>'
        + '<p class="text-2xl font-bold text-gray-800">' + hqFinFmtE(totalU) + '</p>'
        + '<p class="text-xs ' + (planAbw === null ? 'text-gray-400' : planAbw >= 0 ? 'text-green-600' : 'text-red-500') + '">'
        + (planAbw === null ? mitDaten + ' von ' + hqFinStandorte.length + ' mit Daten' : 'Plan: ' + hqFinFmtE(totalP) + ' (' + (planAbw >= 0 ? '+' : '') + planAbw + '%)')
        + '</p></div>'

        + '<div class="vit-card p-5">'
        + '<p class="text-xs text-gray-400 uppercase tracking-wide">Ø Rohertrag</p>'
        + '<p class="text-2xl font-bold ' + (avgRoh >= 35 ? 'text-green-600' : avgRoh >= 30 ? 'text-yellow-600' : avgRoh > 0 ? 'text-red-500' : 'text-gray-300') + '">' + (avgRoh > 0 ? avgRoh + '%' : '—') + '</p>'
        + '<p class="text-xs text-gray-400">Ziel: ≥ 35%</p></div>'

        + '<div class="vit-card p-5">'
        + '<p class="text-xs text-gray-400 uppercase tracking-wide">BWAs eingereicht</p>'
        + '<p class="text-2xl font-bold ' + (mitBwa >= hqFinStandorte.length * 0.8 ? 'text-green-600' : mitBwa >= hqFinStandorte.length * 0.4 ? 'text-yellow-600' : mitBwa > 0 ? 'text-red-500' : 'text-gray-300') + '">' + mitBwa + ' / ' + hqFinStandorte.length + '</p>'
        + '<p class="text-xs text-gray-400">für ' + monatName + ' ' + lastCompletedYear + '</p></div>'

        + '<div class="vit-card p-5">'
        + '<p class="text-xs text-gray-400 uppercase tracking-wide">Datenquellen</p>'
        + '<p class="text-sm font-bold text-gray-800 mt-1">'
        + '<span class="text-blue-600">' + hqFinStandorte.filter(function(s){return s.datenquelle==='bwa';}).length + ' BWA</span>'
        + ' · <span class="text-green-600">' + hqFinStandorte.filter(function(s){return s.datenquelle==='wawi';}).length + ' WaWi</span>'
        + ' · <span class="text-gray-400">' + hqFinStandorte.filter(function(s){return s.datenquelle==='keine';}).length + ' keine</span></p>'
        + '<p class="text-xs text-gray-400">BWA hat Vorrang vor WaWi</p></div>';
}

// === TAB SYSTEM ===
export function showHqFinTab(tab) {
    hqFinActiveTab = tab;
    // Update tab buttons
    document.querySelectorAll('.hqfin-tab-btn').forEach(function(btn) {
        var t = btn.getAttribute('data-hqfin');
        if (t === tab) {
            btn.className = 'hqfin-tab-btn whitespace-nowrap py-3 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
        } else {
            btn.className = 'hqfin-tab-btn whitespace-nowrap py-3 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
        }
    });
    // Show/hide tab content
    document.querySelectorAll('.hqfin-tab-content').forEach(function(c) { c.style.display = 'none'; });
    var target = document.getElementById('hqFinTab_' + tab);
    if (target) target.style.display = 'block';

    // Render tab content
    if (tab === 'uebersicht') renderHqFinUebersicht();
    else if (tab === 'upload') renderHqFinUpload();
}

// === TAB 1: ÜBERSICHT (Haupttabelle) ===
function renderHqFinUebersicht() {
    var el = document.getElementById('hqFinMainTable');
    if (!el) return;

    if (!hqFinStandorte.length) {
        el.innerHTML = '<p class="text-sm text-gray-400 py-8 text-center">Keine Standortdaten verfügbar. Bitte Seite neu laden oder Konsole prüfen.</p>';
        return;
    }

    // Sort
    var sorted = hqFinStandorte.slice().sort(function(a, b) {
        var va, vb;
        switch (hqFinSortCol) {
            case 'umsatzIst': va = a.umsatzIst; vb = b.umsatzIst; break;
            case 'plan': va = a.umsatzPlan; vb = b.umsatzPlan; break;
            case 'abw': va = a.umsatzPlan ? (a.umsatzIst / a.umsatzPlan) : -999; vb = b.umsatzPlan ? (b.umsatzIst / b.umsatzPlan) : -999; break;
            case 'rohertrag': va = a.rohertrag; vb = b.rohertrag; break;
            default: va = a.name.toLowerCase(); vb = b.name.toLowerCase();
        }
        if (typeof va === 'string') return hqFinSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
        return hqFinSortAsc ? va - vb : vb - va;
    });

    var sortIcon = function(col) {
        if (hqFinSortCol !== col) return '<span class="text-gray-300 ml-0.5">⇅</span>';
        return hqFinSortAsc ? '<span class="text-vit-orange ml-0.5">↑</span>' : '<span class="text-vit-orange ml-0.5">↓</span>';
    };

    var html = '<table class="w-full text-sm">';
    html += '<thead><tr class="border-b-2 border-gray-200 text-xs text-gray-500">';
    html += '<th class="text-left py-2 px-3 cursor-pointer select-none" onclick="hqFinSort(\'name\')">Standort ' + sortIcon('name') + '</th>';
    html += '<th class="text-right py-2 px-3 cursor-pointer select-none" onclick="hqFinSort(\'umsatzIst\')">Umsatz Ist ' + sortIcon('umsatzIst') + '</th>';
    html += '<th class="text-right py-2 px-3 cursor-pointer select-none" onclick="hqFinSort(\'plan\')">Plan ' + sortIcon('plan') + '</th>';
    html += '<th class="text-right py-2 px-3 cursor-pointer select-none" onclick="hqFinSort(\'abw\')">Abw. ' + sortIcon('abw') + '</th>';
    html += '<th class="text-right py-2 px-3 cursor-pointer select-none" onclick="hqFinSort(\'rohertrag\')">Rohertrag ' + sortIcon('rohertrag') + '</th>';
    html += '<th class="text-center py-2 px-3">Quelle</th>';
    html += '<th class="text-center py-2 px-3">BWA</th>';
    html += '<th class="text-center py-2 px-3">Plan</th>';
    html += '</tr></thead><tbody>';

    sorted.forEach(function(s) {
        var abw = s.umsatzPlan > 0 ? Math.round((s.umsatzIst / s.umsatzPlan - 1) * 100) : null;
        var quelleBadge = s.datenquelle === 'bwa'
            ? '<span class="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-blue-50 text-blue-600">BWA</span>'
            : s.datenquelle === 'wawi'
            ? '<span class="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-green-50 text-green-600">WaWi</span>'
            : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">—</span>';
        // BWA deadline logic:
        // BWA for month X is due by the 10th of month X+1
        // Current BWA month from getBwaMonthHqFin determines which month we're checking
        // Only show ✕/⚠️ if the deadline has passed (today > 10th of following month)
        var now = new Date();
        var bwaCheckMonth = getBwaMonthHqFin(now); // {m: 0-based, y: year}
        var deadlineDate = new Date(bwaCheckMonth.y, bwaCheckMonth.m + 1, 10); // 10th of next month
        var isOverdue = now > deadlineDate;
        
        var bwaIcon;
        if (s.bwaEingereicht) {
            bwaIcon = '<span class="text-green-500 text-xs">✓</span>';
        } else if (isOverdue) {
            bwaIcon = '<span class="text-red-400 text-xs font-bold">✕</span>';
        } else {
            bwaIcon = '<span class="text-gray-300 text-xs">—</span>';
        }
        var planIcon = s.planVorhanden
            ? '<span class="text-green-500 text-xs">✓</span>'
            : '<span class="text-gray-300 text-xs">—</span>';

        html += '<tr class="border-b border-gray-100 hover:bg-gray-50">';
        html += '<td class="py-2.5 px-3 font-semibold text-gray-800">' + _escH(s.name) + '</td>';
        html += '<td class="py-2.5 px-3 text-right font-bold ' + (s.umsatzIst > 0 ? 'text-gray-800' : 'text-gray-300') + '">' + (s.umsatzIst > 0 ? hqFinFmtE(s.umsatzIst) : '—') + '</td>';
        html += '<td class="py-2.5 px-3 text-right text-gray-400">' + (s.umsatzPlan > 0 ? hqFinFmtE(s.umsatzPlan) : '—') + '</td>';
        html += '<td class="py-2.5 px-3 text-right font-semibold ' + (abw === null ? 'text-gray-300' : abw >= 0 ? 'text-green-600' : 'text-red-500') + '">' + (abw === null ? '—' : (abw >= 0 ? '+' : '') + abw + '%') + '</td>';
        html += '<td class="py-2.5 px-3 text-right font-semibold ' + (s.rohertrag >= 35 ? 'text-green-600' : s.rohertrag >= 30 ? 'text-yellow-600' : s.rohertrag > 0 ? 'text-red-500' : 'text-gray-300') + '">' + (s.rohertrag > 0 ? s.rohertrag + '%' : '—') + '</td>';
        html += '<td class="py-2.5 px-3 text-center">' + quelleBadge + '</td>';
        html += '<td class="py-2.5 px-3 text-center cursor-pointer hover:bg-blue-50 rounded transition" onclick="hqFinShowBwaPopup(\'' + s.id + '\')" title="BWA-Details anzeigen">' + bwaIcon + '</td>';
        html += '<td class="py-2.5 px-3 text-center cursor-pointer hover:bg-blue-50 rounded transition" onclick="hqFinShowPlanPopup(\'' + s.id + '\')" title="Plan-Details anzeigen">' + planIcon + '</td>';
        html += '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
}

// === TAB 2: BWA-STATUS ===
function renderHqFinBwaStatus() {
    // This delegates to the existing bwa-cockpit.js renderHqBwaStatus which populates the hqBwa* elements
    if (typeof window.renderHqBwaStatus === 'function') {
        window.renderHqBwaStatus();
    }
}

// === TAB 3: UPLOAD ===
function renderHqFinUpload() {
    var el = document.getElementById('hqFinUploadContent');
    if (!el || el.getAttribute('data-init') === 'true') return;
    el.setAttribute('data-init', 'true');

    var standortOptions = hqFinStandorte.map(function(s) {
        return '<option value="' + s.id + '">' + _escH(s.name) + '</option>';
    }).join('');

    el.innerHTML = ''
        + '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">'

        // BWA Upload
        + '<div class="vit-card p-6">'
        + '<div class="flex items-center gap-2 mb-4"><span class="text-2xl">📊</span><div><h3 class="font-bold text-gray-800">BWA hochladen</h3><p class="text-xs text-gray-500">Im Namen eines Standorts eine BWA erfassen</p></div></div>'
        + '<div class="space-y-3">'
        + '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Standort</label>'
        + '<select id="hqFinBwaStandort" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">' + standortOptions + '</select></div>'
        + '<button onclick="hqFinOpenBwaUpload()" class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">📊 BWA erfassen</button>'
        + '</div>'

        // Existing BWAs quick view
        + '<div class="mt-4 pt-4 border-t border-gray-100">'
        + '<p class="text-xs font-semibold text-gray-500 uppercase mb-2">Status aktueller Monat</p>'
        + '<div class="space-y-1 max-h-48 overflow-y-auto" id="hqFinBwaQuickList"></div>'
        + '</div>'
        + '</div>'

        // Plan Upload
        + '<div class="vit-card p-6">'
        + '<div class="flex items-center gap-2 mb-4"><span class="text-2xl">📋</span><div><h3 class="font-bold text-gray-800">Jahresplan hochladen</h3><p class="text-xs text-gray-500">Plan-Datei für einen Standort hochladen oder manuell eingeben</p></div></div>'
        + '<div class="space-y-3">'
        + '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Standort</label>'
        + '<select id="hqFinPlanStandort" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">' + standortOptions + '</select></div>'
        + '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Jahr</label>'
        + '<select id="hqFinPlanJahr" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">'
        + '<option value="2026" selected>2026</option><option value="2025">2025</option><option value="2027">2027</option></select></div>'
        + '<div class="p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">'
        + '<p class="text-xs text-gray-500 mb-2">Excel-Datei (.xlsx/.xls/.csv) mit Monats-Planwerten</p>'
        + '<input type="file" id="hqFinPlanFile" accept=".xlsx,.xls,.csv,.pdf" class="text-xs">'
        + '</div>'
        + '<button onclick="hqFinParsePlan()" class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">📋 Plan auslesen & speichern</button>'
        + '<div id="hqFinPlanStatus"></div>'
        + '</div>'

        // Existing Plans quick view
        + '<div class="mt-4 pt-4 border-t border-gray-100">'
        + '<p class="text-xs font-semibold text-gray-500 uppercase mb-2">Plan-Status</p>'
        + '<div class="space-y-1 max-h-48 overflow-y-auto" id="hqFinPlanQuickList"></div>'
        + '</div>'
        + '</div>'

        + '</div>';

    // Render quick lists
    renderHqFinBwaQuickList();
    renderHqFinPlanQuickList();
}

function renderHqFinBwaQuickList() {
    var el = document.getElementById('hqFinBwaQuickList');
    if (!el) return;
    el.innerHTML = hqFinStandorte.map(function(s) {
        var now2 = new Date();
        var bwaCk2 = getBwaMonthHqFin(now2);
        var dl2 = new Date(bwaCk2.y, bwaCk2.m + 1, 10);
        var overdue2 = now2 > dl2;
        var icon = s.bwaEingereicht ? '🟢' : (overdue2 ? '🔴' : '⚪');
        var text = s.bwaEingereicht ? 'Eingereicht' : (overdue2 ? 'Überfällig' : 'Noch nicht fällig');
        return '<div class="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50">'
            + '<span class="text-xs text-gray-700">' + icon + ' ' + _escH(s.name) + '</span>'
            + '<span class="text-[10px] text-gray-400">' + text + '</span></div>';
    }).join('');
}

function renderHqFinPlanQuickList() {
    var el = document.getElementById('hqFinPlanQuickList');
    if (!el) return;
    el.innerHTML = hqFinStandorte.map(function(s) {
        var icon = s.planVorhanden ? '🟢' : '⚪';
        var text = s.planVorhanden ? 'Plan vorhanden' : 'Kein Plan';
        return '<div class="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50">'
            + '<span class="text-xs text-gray-700">' + icon + ' ' + _escH(s.name) + '</span>'
            + '<span class="text-[10px] text-gray-400">' + text + '</span></div>';
    }).join('');
}

// === UPLOAD ACTIONS ===
export function hqFinOpenBwaUpload(standortId) {
    // If called with standortId (from popup), use it directly
    var stdId = standortId;
    var s = hqFinStandorte.find(function(x) { return x.id === stdId; });
    var stdName = s ? s.name : 'Standort';

    // Temporarily override the profile standort_id for the BWA upload modal
    window._hqBwaUploadStandortId = stdId;
    window._hqBwaUploadStandortName = stdName;

    // Open the existing BWA upload modal from controlling.js
    if (typeof window.openBwaUploadModal === 'function') {
        window.openBwaUploadModal();

        // Inject standort indicator into the modal after a brief delay
        setTimeout(function() {
            var overlay = document.getElementById('bwaUploadOverlay');
            if (!overlay) return;
            var modalContent = overlay.querySelector('div > div');
            if (!modalContent) return;

            var indicator = document.createElement('div');
            indicator.className = 'mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2';
            indicator.innerHTML = '<span class="text-sm">📍</span><span class="text-sm font-semibold text-blue-700">Upload für: ' + _escH(stdName) + '</span>';
            var firstChild = modalContent.querySelector('div');
            if (firstChild) modalContent.insertBefore(indicator, firstChild.nextSibling);
        }, 100);
    } else {
        _showToast('BWA-Upload Modul nicht verfügbar', 'error');
    }
}

export async function hqFinParsePlan() {
    var stdSelect = document.getElementById('hqFinPlanStandort');
    var jahrSelect = document.getElementById('hqFinPlanJahr');
    var fileInput = document.getElementById('hqFinPlanFile');
    var statusEl = document.getElementById('hqFinPlanStatus');

    if (!stdSelect || !jahrSelect) return;

    var stdId = stdSelect.value;
    var stdName = stdSelect.options[stdSelect.selectedIndex].text;
    var jahr = parseInt(jahrSelect.value);

    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        if (statusEl) statusEl.innerHTML = '<p class="text-sm text-red-500 mt-2">Bitte eine Plan-Datei auswählen.</p>';
        return;
    }

    if (statusEl) statusEl.innerHTML = '<div class="flex items-center gap-2 mt-2"><div class="w-4 h-4 border-2 border-vit-orange border-t-transparent rounded-full animate-spin"></div><span class="text-xs text-gray-600">Plan wird ausgelesen...</span></div>';

    try {
        // Temporarily set profile standort_id for the plan parser
        var origStdId = _sbProfile() ? _sbProfile().standort_id : null;
        if (_sbProfile()) _sbProfile().standort_id = stdId;

        // Use existing parsePlanFile logic
        window.planIstYear = jahr;
        if (typeof window.parsePlanFile === 'function') {
            // We need to swap the file input
            var origInput = document.getElementById('planFileInput');
            // Create a temporary planFileInput
            var tempInput = document.createElement('input');
            tempInput.type = 'file';
            tempInput.id = 'planFileInput';
            tempInput.style.display = 'none';
            document.body.appendChild(tempInput);

            // Copy files using DataTransfer
            var dt = new DataTransfer();
            for (var i = 0; i < fileInput.files.length; i++) dt.items.add(fileInput.files[i]);
            tempInput.files = dt.files;

            await window.parsePlanFile();

            // Restore
            if (tempInput.parentNode) tempInput.remove();
            if (_sbProfile()) _sbProfile().standort_id = origStdId;

            if (statusEl) statusEl.innerHTML = '<p class="text-sm text-green-600 mt-2">✅ Plan für ' + _escH(stdName) + ' (' + jahr + ') gespeichert!</p>';

            // Refresh data
            hqFinLoaded = false;
            await loadHqFinData();
            renderHqFinKpis();
            renderHqFinPlanQuickList();
        }
    } catch(err) {
        if (statusEl) statusEl.innerHTML = '<p class="text-sm text-red-500 mt-2">Fehler: ' + (err.message || err) + '</p>';
        if (_sbProfile()) _sbProfile().standort_id = origStdId;
    }
}

// === SORT ===
export function hqFinSort(col) {
    if (hqFinSortCol === col) hqFinSortAsc = !hqFinSortAsc;
    else { hqFinSortCol = col; hqFinSortAsc = col === 'name'; }
    renderHqFinUebersicht();
}


// === ADS / MARKETING PERFORMANCE (preserved from original) ===
var adsCurrentContext = 'standort';
var adsPerformanceData = [];
var adsKampagnenData = [];

export function adsFmtEuro(n) { return Number(n||0).toLocaleString('de-DE', {style:'currency', currency:'EUR', minimumFractionDigits:0, maximumFractionDigits:0}); }
export function adsFmtK(n) { n = Number(n||0); if (n >= 1000000) return (n/1000000).toFixed(1)+'M'; if (n >= 1000) return (n/1000).toFixed(1)+'K'; return n.toString(); }
export function adsSetText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

export async function loadAdsData(context) {
    adsCurrentContext = context || 'standort';
    var suffix = adsCurrentContext === 'hq' ? 'Hq' : '';
    var filterEl = document.getElementById('adsZeitraumFilter' + (suffix || ''));
    var tage = filterEl ? parseInt(filterEl.value) : 30;
    var datumVon = new Date();
    datumVon.setDate(datumVon.getDate() - tage);
    var vonStr = datumVon.toISOString().split('T')[0];

    try {
        var query = _sb().from('ads_performance').select('*').gte('datum', vonStr).order('datum', {ascending: false});
        if (adsCurrentContext !== 'hq' && !_sbProfile().is_hq) {
            query = query.eq('standort_id', _sbProfile().standort_id);
        }
        var res = await query;
        if (res.error) throw res.error;
        adsPerformanceData = res.data || [];

        var kQuery = _sb().from('ads_kampagnen').select('*, standorte(name, stadt)').eq('ist_aktiv', true);
        if (adsCurrentContext !== 'hq' && !_sbProfile().is_hq) kQuery = kQuery.eq('standort_id', _sbProfile().standort_id);
        var kRes = await kQuery;
        adsKampagnenData = kRes.data || [];

        if (_sbProfile().is_hq) {
            var syncRes = await _sb().from('ads_accounts').select('plattform, letzter_sync, sync_status, sync_fehler');
            renderAdsSyncInfo(syncRes.data || [], suffix);
        }

        renderAdsKpis(suffix);
        renderAdsChart(suffix);
        renderAdsKampagnenTabelle(suffix);
    } catch(e) { console.error('loadAdsData:', e); }
}

export function renderAdsKpis(suffix) {
    suffix = suffix || '';
    var el = document.getElementById('adsKpis' + suffix);
    if (!el) return;
    var totalSpend = adsPerformanceData.reduce(function(a,d){return a+parseFloat(d.ausgaben||0);},0);
    var totalClicks = adsPerformanceData.reduce(function(a,d){return a+parseInt(d.klicks||0);},0);
    var totalImpressions = adsPerformanceData.reduce(function(a,d){return a+parseInt(d.impressionen||0);},0);
    var totalConversions = adsPerformanceData.reduce(function(a,d){return a+parseInt(d.conversions||0);},0);
    var cpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '0';
    var ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(1) : '0';
    el.innerHTML = '<div class="vit-card p-4"><p class="text-xs text-gray-400">Ausgaben</p><p class="text-xl font-bold">' + adsFmtEuro(totalSpend) + '</p></div>'
        + '<div class="vit-card p-4"><p class="text-xs text-gray-400">Klicks</p><p class="text-xl font-bold">' + adsFmtK(totalClicks) + '</p><p class="text-xs text-gray-500">CPC: ' + cpc + ' €</p></div>'
        + '<div class="vit-card p-4"><p class="text-xs text-gray-400">Impressionen</p><p class="text-xl font-bold">' + adsFmtK(totalImpressions) + '</p><p class="text-xs text-gray-500">CTR: ' + ctr + '%</p></div>'
        + '<div class="vit-card p-4"><p class="text-xs text-gray-400">Conversions</p><p class="text-xl font-bold">' + totalConversions + '</p></div>';
}

export function renderAdsChart(suffix) {
    suffix = suffix || '';
    var el = document.getElementById('adsChart' + suffix);
    if (!el) return;
    el.innerHTML = '<p class="text-sm text-gray-400 text-center py-8">Chart-Ansicht in Entwicklung</p>';
}

export function renderAdsKampagnenTabelle(suffix) {
    suffix = suffix || '';
    var el = document.getElementById('adsKampagnen' + suffix);
    if (!el) return;
    if (!adsKampagnenData.length) { el.innerHTML = '<p class="text-sm text-gray-400">Keine aktiven Kampagnen.</p>'; return; }
    var h = '<table class="w-full text-sm"><thead><tr class="border-b"><th class="text-left py-2 text-xs text-gray-500">Kampagne</th><th class="text-left py-2 text-xs text-gray-500">Standort</th><th class="text-left py-2 text-xs text-gray-500">Plattform</th><th class="text-right py-2 text-xs text-gray-500">Budget</th></tr></thead><tbody>';
    adsKampagnenData.forEach(function(k) {
        h += '<tr class="border-b border-gray-100"><td class="py-2">' + _escH(k.name || '—') + '</td><td class="py-2">' + _escH(k.standorte ? k.standorte.name : '—') + '</td><td class="py-2"><span class="text-xs px-2 py-0.5 rounded bg-gray-100">' + _escH(k.plattform || '—') + '</span></td><td class="py-2 text-right font-semibold">' + adsFmtEuro(k.monatsbudget) + '</td></tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
}

export function filterAdsPlattform(plattform, suffix) {
    /* preserved stub */
}
export function renderAdsStandortVergleich(suffix) {
    /* preserved stub */
}
export function renderAdsSyncInfo(accounts, suffix) {
    suffix = suffix || '';
    var el = document.getElementById('adsSyncInfo' + suffix);
    if (!el) return;
    if (!accounts || !accounts.length) { el.innerHTML = ''; return; }
    el.innerHTML = accounts.map(function(a) {
        var ok = a.sync_status === 'ok';
        return '<span class="text-[10px] px-2 py-0.5 rounded-full mr-1 ' + (ok ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600') + '">' + _escH(a.plattform) + (ok ? ' ✓' : ' ✕') + '</span>';
    }).join('');
}
export function updateMktPerformanceFromAds() { /* stub */ }


// === HQ MARKETING RENDERING (preserved from original) ===
export function renderHqMarketing() {
    if (typeof window.loadAdsData === 'function') window.loadAdsData('hq');
}

export function showHqMktTab(tab) {
    document.querySelectorAll('.hqmkt-tab-btn').forEach(function(btn) {
        var t = btn.getAttribute('data-hqmkt');
        if (t === tab) {
            btn.className = 'hqmkt-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
        } else {
            btn.className = 'hqmkt-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
        }
    });
    document.querySelectorAll('.hqmkt-tab-content').forEach(function(el) { el.style.display = 'none'; });
    var target = document.getElementById('hqMktTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (target) target.style.display = 'block';

    if (tab === 'budgetsteuerung') renderHqMktBudget();
    if (tab === 'leadreport') renderHqMktLeadReport();
    if (tab === 'jahresgespraeche') renderHqMktJahresgespraeche();
    if (tab === 'handlungsbedarf') renderHqMktHandlungsbedarf();
}

export function renderHqMktBudget() { /* preserved from original - delegates to hqStandorte */ }
export function renderHqMktLeadReport() { /* preserved from original */ }
export function renderHqMktJahresgespraeche() {
    var el=document.getElementById('hqMktJgTabelle');
    if(!el||el.children.length>0) return;
    /* preserved from original */
}
export function renderHqMktHandlungsbedarf() {
    /* preserved from original - delegates to hqStandorte */
}

export function renderMktSpendingChart() {
    var el=document.getElementById('mktSpendingChart');
    if(!el) return;
    el.innerHTML='<p class="text-sm text-gray-400 text-center py-8">Noch keine Ausgaben-Daten vorhanden.</p>';
}

export function renderMktLeadChart() {
    var el=document.getElementById('mktLeadChart');
    if(!el) return;
    el.innerHTML='<p class="text-sm text-gray-400 text-center py-8">Noch keine Lead-Daten vorhanden.</p>';
}

// === BWA FILE DOWNLOAD (from Supabase Storage) ===
export async function hqFinDownloadBwa(storagePath, fileName) {
    try {
        var resp = await _sb().storage.from('bwa-dateien').download(storagePath);
        if (resp.error) throw resp.error;
        var url = URL.createObjectURL(resp.data);
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 100);
    } catch(err) {
        console.error('[hq-finanzen] Download error:', err);
        _showToast('Download fehlgeschlagen: ' + (err.message || err), 'error');
    }
}

// === BWA POPUP (per Standort) ===

export function hqFinShowBwaPopup(standortId) {
    var s = hqFinStandorte.find(function(x) { return x.id === standortId; });
    if (!s) return;
    
    var year = new Date().getFullYear();
    var currentMonth = new Date().getMonth(); // 0-based
    var bwaByMonth = {};
    (s.bwaMonateDetail || []).forEach(function(b) { bwaByMonth[b.monat] = b; });
    
    var h = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;" onclick="if(event.target===this)this.remove()" id="hqFinBwaPopup">';
    h += '<div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4" onclick="event.stopPropagation()">';
    h += '<div class="flex items-center justify-between mb-4">';
    h += '<h3 class="text-lg font-bold text-gray-800">BWA-Status: ' + _escH(s.name) + '</h3>';
    h += '<button onclick="document.getElementById(\'hqFinBwaPopup\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>';
    h += '<p class="text-sm text-gray-500 mb-4">Jahr ' + year + ' · ' + s.bwaMonate + ' von 12 Monaten eingereicht</p>';
    
    // 12-month grid
    h += '<div class="grid grid-cols-4 gap-2 mb-4" id="hqFinBwaGrid">';
    for (var m = 1; m <= 12; m++) {
        var bwa = bwaByMonth[m];
        var deadlinePassed = new Date() > new Date(year, m, 10);
        var isPast = m <= currentMonth;
        
        var bgCol, textCol, icon, label, clickable = false;
        if (bwa) {
            bgCol = 'bg-green-50 border-green-200 hover:ring-2 hover:ring-green-300 cursor-pointer';
            textCol = 'text-green-700';
            icon = '✓';
            label = hqFinFmtE(bwa.umsatz);
            clickable = true;
        } else if (deadlinePassed) {
            bgCol = 'bg-red-50 border-red-200';
            textCol = 'text-red-600';
            icon = '✕';
            label = 'Überfällig';
        } else if (isPast) {
            bgCol = 'bg-yellow-50 border-yellow-200';
            textCol = 'text-yellow-600';
            icon = '⏳';
            label = 'Noch Zeit';
        } else {
            bgCol = 'bg-gray-50 border-gray-100';
            textCol = 'text-gray-400';
            icon = '';
            label = '—';
        }
        h += '<div class="border rounded-lg p-2 text-center transition ' + bgCol + '"';
        if (clickable) {
            h += ' onclick="hqFinShowBwaDetail(\'' + standortId + '\',' + m + ')"';
        }
        h += '>';
        h += '<p class="text-xs font-semibold ' + textCol + '">' + _hqFinMonatLabels[m-1] + ' ' + icon + '</p>';
        h += '<p class="text-[10px] ' + textCol + ' mt-0.5">' + label + '</p></div>';
    }
    h += '</div>';
    
    // Detail area (filled when clicking a month)
    h += '<div id="hqFinBwaDetailArea" class="mb-4"></div>';
    
    // Upload button
    h += '<button class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90 transition" ';
    h += 'onclick="document.getElementById(\'hqFinBwaPopup\').remove(); hqFinOpenBwaUpload(\'' + standortId + '\')">';
    h += '📄 BWA hochladen für ' + _escH(s.name) + '</button>';
    h += '</div></div>';
    
    document.body.insertAdjacentHTML('beforeend', h);
    
    // Auto-show latest BWA detail
    var latestMonth = Object.keys(bwaByMonth).map(Number).sort(function(a,b){return b-a;})[0];
    if (latestMonth) hqFinShowBwaDetail(standortId, latestMonth);
}

// Show BWA detail for a specific month inside the popup
export function hqFinShowBwaDetail(standortId, monat) {
    var s = hqFinStandorte.find(function(x) { return x.id === standortId; });
    if (!s) return;
    var bwa = (s.bwaMonateDetail || []).find(function(b) { return b.monat === monat; });
    if (!bwa) return;
    
    var el = document.getElementById('hqFinBwaDetailArea');
    if (!el) return;
    
    var rohPct = bwa.umsatz > 0 ? (bwa.rohertragAbs / bwa.umsatz * 100).toFixed(1) : '—';
    var uploadDate = bwa.datum ? new Date(bwa.datum).toLocaleDateString('de-DE') : '—';
    
    var h = '<div class="bg-gray-50 rounded-xl p-4 border border-gray-200">';
    h += '<div class="flex items-center justify-between mb-3">';
    h += '<p class="text-sm font-bold text-gray-800">' + _hqFinMonatLabels[monat - 1] + ' ' + new Date().getFullYear() + '</p>';
    h += '<span class="text-[10px] text-gray-400">Hochgeladen: ' + uploadDate + '</span></div>';
    
    // Key figures grid
    h += '<div class="grid grid-cols-2 gap-2 mb-3">';
    h += '<div class="bg-white rounded-lg p-2.5 border"><p class="text-[10px] text-gray-400 uppercase">Umsatzerlöse</p><p class="text-sm font-bold text-gray-800">' + hqFinFmtE(bwa.umsatz) + '</p></div>';
    h += '<div class="bg-white rounded-lg p-2.5 border"><p class="text-[10px] text-gray-400 uppercase">Rohertrag</p><p class="text-sm font-bold ' + (parseFloat(rohPct) >= 35 ? 'text-green-600' : parseFloat(rohPct) >= 30 ? 'text-yellow-600' : 'text-red-500') + '">' + rohPct + '%</p></div>';
    h += '<div class="bg-white rounded-lg p-2.5 border"><p class="text-[10px] text-gray-400 uppercase">Wareneinsatz</p><p class="text-sm font-bold text-gray-800">' + hqFinFmtE(bwa.wareneinsatz) + '</p></div>';
    h += '<div class="bg-white rounded-lg p-2.5 border"><p class="text-[10px] text-gray-400 uppercase">Personalkosten</p><p class="text-sm font-bold text-gray-800">' + hqFinFmtE(bwa.personalkosten) + '</p></div>';
    h += '</div>';
    
    // Ergebnis
    h += '<div class="bg-white rounded-lg p-2.5 border mb-3"><p class="text-[10px] text-gray-400 uppercase">Ergebnis vor Steuern</p>';
    h += '<p class="text-sm font-bold ' + (bwa.ergebnis >= 0 ? 'text-green-600' : 'text-red-500') + '">' + hqFinFmtE(bwa.ergebnis) + '</p></div>';
    
    // Download button
    if (bwa.datei_url) {
        h += '<button onclick="hqFinDownloadBwa(\'' + _escH(bwa.datei_url) + '\',\'' + _escH(bwa.datei_name || 'BWA_' + _hqFinMonatLabels[monat-1] + '_' + new Date().getFullYear() + '.csv') + '\')" class="flex items-center justify-center gap-2 w-full py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition cursor-pointer">';
        h += '⬇️ ' + _escH(bwa.datei_name || 'BWA herunterladen') + '</button>';
    }
    h += '</div>';
    
    el.innerHTML = h;
}

// === PLAN POPUP (per Standort) ===
export function hqFinShowPlanPopup(standortId) {
    var s = hqFinStandorte.find(function(x) { return x.id === standortId; });
    if (!s) return;
    
    var year = new Date().getFullYear();
    
    var h = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;" onclick="if(event.target===this)this.remove()" id="hqFinPlanPopup">';
    h += '<div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4" onclick="event.stopPropagation()">';
    h += '<div class="flex items-center justify-between mb-4">';
    h += '<h3 class="text-lg font-bold text-gray-800">Jahresplan: ' + _escH(s.name) + '</h3>';
    h += '<button onclick="document.getElementById(\'hqFinPlanPopup\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>';
    
    if (s.planVorhanden && s.planDaten) {
        h += '<p class="text-sm text-green-600 font-semibold mb-3">✓ Plan ' + year + ' vorhanden</p>';
        h += '<div class="grid grid-cols-4 gap-2 mb-5">';
        for (var m = 1; m <= 12; m++) {
            var pd = s.planDaten[m] || s.planDaten[String(m)] || {};
            var umsatz = pd.umsatz || 0;
            h += '<div class="border rounded-lg p-2 text-center ' + (umsatz > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100') + '">';
            h += '<p class="text-xs font-semibold ' + (umsatz > 0 ? 'text-blue-700' : 'text-gray-400') + '">' + _hqFinMonatLabels[m-1] + '</p>';
            h += '<p class="text-[10px] ' + (umsatz > 0 ? 'text-blue-600' : 'text-gray-400') + ' mt-0.5">' + (umsatz > 0 ? hqFinFmtE(umsatz) : '—') + '</p></div>';
        }
        h += '</div>';
    } else {
        h += '<div class="text-center py-6">';
        h += '<p class="text-3xl mb-2">📋</p>';
        h += '<p class="text-sm text-gray-500">Noch kein Jahresplan ' + year + ' hinterlegt</p></div>';
    }
    
    // Upload button
    h += '<button class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90 transition" ';
    h += 'onclick="document.getElementById(\'hqFinPlanPopup\').remove(); hqFinOpenPlanUpload(\'' + standortId + '\')">';
    h += '📊 Plan hochladen für ' + _escH(s.name) + '</button>';
    h += '</div></div>';
    
    document.body.insertAdjacentHTML('beforeend', h);
}

// === PLAN UPLOAD (via HQ for standort) ===
export function hqFinOpenPlanUpload(standortId) {
    var s = hqFinStandorte.find(function(x) { return x.id === standortId; });
    if (!s) return;
    var year = new Date().getFullYear();
    
    var h = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;" onclick="if(event.target===this)this.remove()" id="hqFinPlanUploadModal">';
    h += '<div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onclick="event.stopPropagation()">';
    h += '<div class="flex items-center justify-between mb-4">';
    h += '<h3 class="text-lg font-bold text-gray-800">📋 Jahresplan hochladen</h3>';
    h += '<button onclick="document.getElementById(\'hqFinPlanUploadModal\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>';
    
    h += '<p class="text-sm text-gray-500 mb-4">Plan-Datei für <strong>' + _escH(s.name) + '</strong> hochladen oder manuell eingeben</p>';
    
    h += '<div class="mb-3"><label class="text-xs font-semibold text-gray-500 block mb-1">Standort</label>';
    h += '<div class="bg-gray-100 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700">' + _escH(s.name) + '</div></div>';
    
    h += '<div class="mb-3"><label class="text-xs font-semibold text-gray-500 block mb-1">Jahr</label>';
    h += '<select id="hqFinPlanJahrModal" class="w-full border rounded-lg px-3 py-2 text-sm">';
    h += '<option value="' + year + '">' + year + '</option>';
    h += '<option value="' + (year - 1) + '">' + (year - 1) + '</option></select></div>';
    
    h += '<div class="mb-4"><label class="text-xs font-semibold text-gray-500 block mb-1">Excel-Datei (.xlsx/.xls/.csv) mit Monats-Planwerten</label>';
    h += '<input type="file" id="hqFinPlanFileModal" accept=".xlsx,.xls,.csv" class="w-full text-sm border rounded-lg p-2"></div>';
    
    h += '<button onclick="hqFinParsePlanFromModal(\'' + standortId + '\')" class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90 transition">';
    h += '📋 Plan auslesen & speichern</button>';
    
    h += '<div id="hqFinPlanModalStatus" class="mt-2"></div>';
    h += '</div></div>';
    
    document.body.insertAdjacentHTML('beforeend', h);
}

// Parse plan from the modal - uses existing parsePlanFile infrastructure
export async function hqFinParsePlanFromModal(standortId) {
    var jahrSelect = document.getElementById('hqFinPlanJahrModal');
    var fileInput = document.getElementById('hqFinPlanFileModal');
    var statusEl = document.getElementById('hqFinPlanModalStatus');
    
    var jahr = parseInt(jahrSelect.value);
    var s = hqFinStandorte.find(function(x) { return x.id === standortId; });
    var stdName = s ? s.name : 'Standort';
    
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        if (statusEl) statusEl.innerHTML = '<p class="text-sm text-red-500 mt-2">Bitte eine Plan-Datei auswählen.</p>';
        return;
    }
    
    if (statusEl) statusEl.innerHTML = '<div class="flex items-center gap-2 mt-2"><div class="w-4 h-4 border-2 border-vit-orange border-t-transparent rounded-full animate-spin"></div><span class="text-xs text-gray-600">Plan wird analysiert...</span></div>';
    
    // Override profile standort_id temporarily
    var origStdId = _sbProfile() ? _sbProfile().standort_id : null;
    if (_sbProfile()) _sbProfile().standort_id = standortId;
    window.planIstYear = jahr;
    
    try {
        // Create the DOM elements that parsePlanFile expects
        var container = document.createElement('div');
        container.style.display = 'none';
        container.innerHTML = '<input type="file" id="planFileInput"><div id="planParseStatus"></div><div id="planParseResult" class="hidden"></div>';
        document.body.appendChild(container);
        
        // Copy file to the planFileInput
        var tempInput = container.querySelector('#planFileInput');
        var dt = new DataTransfer();
        for (var i = 0; i < fileInput.files.length; i++) dt.items.add(fileInput.files[i]);
        tempInput.files = dt.files;
        
        // Call parsePlanFile - it's callback-based, so we need to poll for results
        if (typeof window.parsePlanFile === 'function') {
            window.parsePlanFile();
            
            // Poll for _parsedPlanMonths (set by applyPlanKiResult or the parser callback)
            var origParsed = window._parsedPlanMonths;
            window._parsedPlanMonths = null;
            
            var maxWait = 60000; // 60s timeout for KI analysis
            var waited = 0;
            var interval = 500;
            
            await new Promise(function(resolve) {
                var timer = setInterval(function() {
                    waited += interval;
                    
                    // Check parse status from the hidden elements
                    var parseStatus = container.querySelector('#planParseStatus');
                    var parseResult = container.querySelector('#planParseResult');
                    var statusText = parseStatus ? parseStatus.textContent : '';
                    
                    // Update visible status
                    if (statusText && statusEl) {
                        if (statusText.indexOf('KI') >= 0) {
                            statusEl.innerHTML = '<div class="flex items-center gap-2 mt-2"><div class="w-4 h-4 border-2 border-vit-orange border-t-transparent rounded-full animate-spin"></div><span class="text-xs text-gray-600">🤖 ' + statusText + '</span></div>';
                        }
                    }
                    
                    // Check if parsed
                    if (window._parsedPlanMonths) {
                        clearInterval(timer);
                        resolve();
                        return;
                    }
                    
                    // Check for error
                    if (statusText.indexOf('❌') >= 0 || statusText.indexOf('Fehler') >= 0) {
                        clearInterval(timer);
                        resolve();
                        return;
                    }
                    
                    // Check for success (plan preview visible)
                    if (parseResult && !parseResult.classList.contains('hidden') && parseResult.innerHTML.indexOf('saveParsedPlan') >= 0) {
                        clearInterval(timer);
                        resolve();
                        return;
                    }
                    
                    if (waited >= maxWait) {
                        clearInterval(timer);
                        resolve();
                    }
                }, interval);
            });
            
            // Check result
            if (window._parsedPlanMonths && Object.keys(window._parsedPlanMonths).length > 0) {
                // Auto-save the parsed plan (same as saveParsedPlan but for specific standort)
                var planPayload = {
                    standort_id: standortId,
                    jahr: jahr,
                    plan_daten: window._parsedPlanMonths,
                    updated_at: new Date().toISOString()
                };
                var resp = await _sb().from('jahresplaene').upsert(planPayload, { onConflict: 'standort_id,jahr' }).select();
                if (resp.error) throw new Error(resp.error.message);
                
                var monthCount = Object.keys(window._parsedPlanMonths).length;
                if (statusEl) statusEl.innerHTML = '<p class="text-sm text-green-600 mt-2">✅ Plan für ' + _escH(stdName) + ' (' + jahr + ') gespeichert! ' + monthCount + ' Monate erkannt.</p>';
                
                // Refresh
                await loadHqFinData();
                renderHqFinKpis();
                renderHqFinUebersicht();
                
                setTimeout(function() {
                    var modal = document.getElementById('hqFinPlanUploadModal');
                    if (modal) modal.remove();
                }, 2000);
            } else {
                // Check if there was an error message
                var parseStatus = container.querySelector('#planParseStatus');
                var errorMsg = parseStatus ? parseStatus.textContent : 'Keine Monatsdaten erkannt';
                if (statusEl) statusEl.innerHTML = '<p class="text-sm text-red-500 mt-2">' + _escH(errorMsg) + '</p>';
            }
            
            window._parsedPlanMonths = origParsed;
        } else {
            if (statusEl) statusEl.innerHTML = '<p class="text-sm text-red-500 mt-2">Plan-Parser nicht verfügbar.</p>';
        }
        
        // Cleanup
        if (container.parentNode) container.remove();
        
    } catch(err) {
        console.error('[hq-finanzen] Plan upload error:', err);
        if (statusEl) statusEl.innerHTML = '<p class="text-sm text-red-500 mt-2">Fehler: ' + (err.message || err) + '</p>';
    } finally {
        // Restore profile
        if (_sbProfile()) _sbProfile().standort_id = origStdId;
    }
}

export function renderHqEinkauf() {
    /* This is preserved from the original and uses hqStandorte from hq-cockpit.js */
    if (typeof window.hqStandorte === 'undefined' || !window.hqStandorte) return;
    var hqStandorte = window.hqStandorte || [];
    /* ... original rendering logic stays in hq-cockpit.js ... */
}

// Strangler Fig
const _exports = {renderHqFinanzen,showHqFinTab,hqFinSort,hqFinOpenBwaUpload,hqFinParsePlan,hqFinShowBwaPopup,hqFinShowBwaDetail,hqFinDownloadBwa,hqFinShowPlanPopup,hqFinOpenPlanUpload,hqFinParsePlanFromModal,adsFmtEuro,adsFmtK,adsSetText,loadAdsData,renderAdsKpis,renderAdsChart,renderAdsKampagnenTabelle,filterAdsPlattform,renderAdsStandortVergleich,renderAdsSyncInfo,updateMktPerformanceFromAds,renderHqMarketing,showHqMktTab,renderHqMktBudget,renderHqMktLeadReport,renderHqMktJahresgespraeche,renderHqMktHandlungsbedarf,renderMktSpendingChart,renderMktLeadChart,renderHqEinkauf};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[hq-finanzen.js] Module loaded (v2 redesign) - ' + Object.keys(_exports).length + ' exports registered');
