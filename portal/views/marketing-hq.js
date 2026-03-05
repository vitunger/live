/**
 * views/marketing-hq.js - HQ Marketing Views
 *
 * Tabs: Netzwerk-Übersicht, Vereinbarungen, Meta Ads Gesamt, Google Ads Gesamt,
 *       Lead Reporting, Budget Plan, Video-Freigabe
 *
 * @module views/marketing-hq
 */
(function() {
'use strict';

// ── Safe Helpers ──
function _sb() { return window.sb; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _escH(s) { return typeof window.escH === 'function' ? window.escH(s) : String(s||''); }
function _fmtN(n) { return typeof window.fmtN === 'function' ? window.fmtN(n) : Number(n||0).toLocaleString('de-DE'); }
function _fmtEur(n) { return typeof window.fmtEur === 'function' ? window.fmtEur(n) : _fmtN(n) + ' \u20ac'; }

// ── Constants ──
var HQ_TABS = [
    { id: 'uebersicht', icon: '\ud83c\udf10', label: 'Netzwerk-\u00dcbersicht' },
    { id: 'vereinbarungen', icon: '\ud83d\udccb', label: 'Vereinbarungen' },
    { id: 'metaGesamt', icon: '\ud83d\udcd8', label: 'Meta Ads Gesamt' },
    { id: 'googleGesamt', icon: '\ud83d\udd0d', label: 'Google Ads Gesamt' },
    { id: 'leadReporting', icon: '\ud83c\udfaf', label: 'Lead Reporting' },
    { id: 'budgetPlan', icon: '\ud83d\udcb0', label: 'Budget Plan' },
    { id: 'videoFreigabe', icon: '\ud83c\udfa5', label: 'Video-Freigabe' }
];

// ── Render HQ Marketing ──
async function renderHqMarketing() {
    var container = document.getElementById('hqMarketingContent');
    if (!container) return;

    // Monatsdaten ermitteln (auto-select letzter Monat mit Daten)
    await window.mktInitMonthSelect();

    // Tabs rendern
    var tabHtml = HQ_TABS.map(function(t) {
        return '<button onclick="showHqMktTab(\'' + t.id + '\')" class="hqmkt-tab-btn whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ' +
            (t.id === 'uebersicht' ? 'border-vit-orange text-vit-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300') +
            '" data-hqmkt="' + t.id + '">' + t.icon + ' ' + t.label + '</button>';
    }).join('');

    var monthSelector = typeof window.mktRenderMonthSelector === 'function' ? window.mktRenderMonthSelector() : '';

    container.innerHTML =
        '<div class="flex items-center justify-between mb-2 flex-wrap gap-2">' +
            '<div></div>' +
            '<div class="flex items-center gap-2"><span class="text-xs text-gray-400">Zeitraum:</span>' + monthSelector + '</div>' +
        '</div>' +
        '<div class="mb-6 border-b border-gray-200"><nav class="-mb-px flex space-x-6 overflow-x-auto">' + tabHtml + '</nav></div>' +
        '<div id="hqMktTabContent"></div>';

    // Daten laden
    await Promise.all([
        window.mktLoadAlleVereinbarungen(),
        window.mktLoadAdsData(null),
        window.mktLoadLeadTracking(null)
    ]);

    // Ersten Tab rendern
    renderHqMktTabContent('uebersicht');
}

function showHqMktTab(tabName) {
    window.showMarketingTab(tabName);
}

// ── Tab Content Renderer ──
function renderHqMktTabContent(tabName) {
    var el = document.getElementById('hqMktTabContent');
    if (!el) return;
    window.mktState.activeTab = tabName;

    switch(tabName) {
        case 'uebersicht': renderHqUebersicht(el); break;
        case 'vereinbarungen': renderHqVereinbarungen(el); break;
        case 'metaGesamt': renderHqMetaAds(el); break;
        case 'googleGesamt': renderHqGoogleAds(el); break;
        case 'leadReporting': renderHqLeadReporting(el); break;
        case 'budgetPlan': renderHqBudgetPlan(el); break;
        case 'videoFreigabe': renderHqVideoFreigabe(el); break;
        default: el.innerHTML = '<div class="text-center py-16 text-gray-400">Tab nicht gefunden</div>';
    }
}

// ══════════════════════════════════
// TAB: Netzwerk-Übersicht
// ══════════════════════════════════
function renderHqUebersicht(el) {
    var ads = window.mktState.adsData || [];
    var vbs = window.mktState.vereinbarungen || [];

    // Ads aggregieren
    var totalSpend = 0, totalImpr = 0, totalClicks = 0, totalLeads = 0;
    ads.forEach(function(a) {
        totalSpend += Number(a.ausgaben || 0);
        totalImpr += Number(a.impressionen || 0);
        totalClicks += Number(a.klicks || 0);
        totalLeads += Number(a.conversions || 0);
    });

    var activeStandorte = new Set();
    ads.forEach(function(a) { if (a.standort_id) activeStandorte.add(a.standort_id); });

    // KPIs
    var html = '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
        window.mktKpiCard('Netzwerk-Ausgaben', _fmtEur(totalSpend), activeStandorte.size + ' aktive Standorte') +
        window.mktKpiCard('Gesamtreichweite', _fmtN(totalImpr), 'Impressionen netzwerkweit') +
        window.mktKpiCard('Gesamt-Klicks', _fmtN(totalClicks), '\u00d8 ' + _fmtN(activeStandorte.size > 0 ? Math.round(totalClicks / activeStandorte.size) : 0) + ' pro Standort') +
        window.mktKpiCard('Gesamt-Leads', String(totalLeads), 'Termine & Anfragen') +
        '</div>';

    // Vereinbarungs-Summary (Klickbar)
    if (vbs.length > 0) {
        var signed = vbs.filter(function(v) { return v.signed; }).length;
        var totalBudget = vbs.reduce(function(s, v) { return s + Number(v.budget_jahr || 0); }, 0);
        html += '<div class="vit-card p-5 mb-6 border-l-4 border-vit-orange cursor-pointer hover:shadow-md transition-shadow" onclick="showHqMktTab(\'vereinbarungen\')">' +
            '<div class="flex justify-between items-center">' +
            '<div><div class="text-xs font-semibold text-vit-orange uppercase tracking-wider">\ud83d\udccb Vereinbarungen ' + new Date().getFullYear() + '</div>' +
            '<div class="text-sm text-gray-600 mt-1">' + signed + '/' + vbs.length + ' unterschrieben \u00b7 Netzwerk-Budget: ' + _fmtEur(totalBudget) + '</div></div>' +
            '<div class="text-sm text-vit-orange font-semibold">Alle anzeigen \u2192</div></div></div>';
    }

    // Standort-Performance Grid
    if (ads.length > 0) {
        html += '<div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Standort-Performance</div>';
        // Gruppiere Ads nach standort_id
        var byStandort = {};
        ads.forEach(function(a) {
            var sid = a.standort_id || 'unknown';
            if (!byStandort[sid]) byStandort[sid] = { ausgaben: 0, klicks: 0, impressionen: 0, leads: 0, name: a.standort_name || sid };
            byStandort[sid].ausgaben += Number(a.ausgaben || 0);
            byStandort[sid].klicks += Number(a.klicks || 0);
            byStandort[sid].impressionen += Number(a.impressionen || 0);
            byStandort[sid].leads += Number(a.conversions || 0);
        });

        html += '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">';
        Object.keys(byStandort).forEach(function(sid) {
            var s = byStandort[sid];
            var ctr = s.impressionen > 0 ? ((s.klicks / s.impressionen) * 100).toFixed(1) : '0';
            var cpc = s.klicks > 0 ? (s.ausgaben / s.klicks).toFixed(2) : '\u2013';
            html += '<div class="vit-card p-4 border-t-3 border-gray-300 hover:shadow-md transition-shadow">' +
                '<div class="font-semibold text-sm text-gray-800 mb-2">' + _escH(s.name) + '</div>' +
                '<div class="grid grid-cols-3 gap-2 text-center">' +
                '<div class="bg-gray-50 rounded-lg p-2"><div class="text-xs text-gray-400">Ausgaben</div><div class="text-sm font-bold text-gray-800">' + _fmtEur(s.ausgaben) + '</div></div>' +
                '<div class="bg-gray-50 rounded-lg p-2"><div class="text-xs text-gray-400">Klicks</div><div class="text-sm font-bold text-gray-800">' + _fmtN(s.klicks) + '</div></div>' +
                '<div class="bg-gray-50 rounded-lg p-2"><div class="text-xs text-gray-400">Leads</div><div class="text-sm font-bold text-gray-800">' + s.leads + '</div></div>' +
                '</div><div class="flex gap-4 mt-2 text-xs text-gray-400">' +
                '<span>CTR: ' + ctr + '%</span><span>CPC: ' + cpc + ' \u20ac</span></div></div>';
        });
        html += '</div>';
    } else {
        html += renderHqNoData('Netzwerk-Daten', 'Noch keine Ads-Performance-Daten vorhanden. Die Daten werden automatisch synchronisiert.');
    }

    // Charts
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Netzwerk-Trend</div>' +
        '<div style="height:250px"><canvas id="hqMktChartTrend"></canvas></div></div>' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Kanal-Vergleich Netzwerk</div>' +
        '<div style="height:250px"><canvas id="hqMktChartChannel"></canvas></div></div></div>';

    el.innerHTML = html;

    // Charts
    setTimeout(function() {
        var C = window.MKT_CHART_COLORS;
        var metaSpend = 0, googleSpend = 0;
        ads.forEach(function(a) {
            var p = (a.plattform || '').toLowerCase();
            if (p.indexOf('meta') >= 0 || p.indexOf('facebook') >= 0) metaSpend += Number(a.ausgaben || 0);
            else googleSpend += Number(a.ausgaben || 0);
        });
        window.mktChartDoughnut('hqMktChartChannel', ['Google Ads', 'Meta Ads'], [Math.round(googleSpend), Math.round(metaSpend)], [C.orange, C.blue]);
    }, 50);
}

// ══════════════════════════════════
// TAB: Vereinbarungen
// ══════════════════════════════════
function renderHqVereinbarungen(el) {
    var vbs = window.mktState.vereinbarungen || [];

    var html = '<h2 class="text-xl font-bold text-gray-800 mb-1">Vereinbarungen ' + new Date().getFullYear() + ' \u2013 Netzwerk</h2>' +
        '<p class="text-sm text-gray-500 mb-6">Alle Marketing-Jahresgespr\u00e4che und deren Status</p>';

    if (vbs.length === 0) {
        html += renderHqNoData('Vereinbarungen', 'Noch keine Marketing-Vereinbarungen hinterlegt.');
        el.innerHTML = html;
        return;
    }

    var totalBudget = 0, totalLeads = 0, totalUmsatz = 0, signedCount = 0;
    vbs.forEach(function(v) {
        totalBudget += Number(v.budget_jahr || 0);
        totalLeads += Number(v.max_leads || 0);
        totalUmsatz += Number(v.umsatz_ziel || 0);
        if (v.signed) signedCount++;
    });
    var unsignedCount = vbs.length - signedCount;

    // KPIs
    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
        window.mktKpiCard('Netzwerk-Jahresbudget', _fmtEur(totalBudget), vbs.length + ' Standorte') +
        window.mktKpiCard('Gesamt Lead-Ziel', _fmtN(totalLeads), '\u00d8 ' + Math.round(totalLeads / 12) + ' pro Monat') +
        window.mktKpiCard('Netzwerk-Umsatzziel', _fmtEur(totalUmsatz), '\u00d8 ' + _fmtEur(Math.round(totalUmsatz / vbs.length)) + ' pro Standort') +
        window.mktKpiCard('\u00d8 Marketinganteil', (vbs.reduce(function(s,v) { return s + Number(v.marketing_anteil || 0); }, 0) / vbs.length).toFixed(1) + '%', 'Vom Gesamtumsatz') +
        '</div>';

    // Status Cards
    var crmCount = vbs.filter(function(v) { return v.crm_testphase; }).length;
    html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">' +
        '<div class="vit-card p-5 border-l-3 border-green-500"><div class="text-xs font-semibold text-gray-400 uppercase">Unterschrieben</div>' +
        '<div class="text-2xl font-bold text-green-600">' + signedCount + '</div><div class="text-xs text-gray-500">von ' + vbs.length + ' Standorten</div></div>' +
        '<div class="vit-card p-5 border-l-3 border-red-500"><div class="text-xs font-semibold text-gray-400 uppercase">Ausstehend</div>' +
        '<div class="text-2xl font-bold text-red-600">' + unsignedCount + '</div><div class="text-xs text-gray-500">' +
        _escH(vbs.filter(function(v) { return !v.signed; }).map(function(v) { return v.standorte ? v.standorte.name : '\u2013'; }).join(', ')) + '</div></div>' +
        '<div class="vit-card p-5 border-l-3 border-vit-orange"><div class="text-xs font-semibold text-gray-400 uppercase">CRM-Testphase</div>' +
        '<div class="text-2xl font-bold text-vit-orange">' + crmCount + '</div><div class="text-xs text-gray-500">' +
        _escH(vbs.filter(function(v) { return v.crm_testphase; }).map(function(v) { return v.standorte ? v.standorte.name : '\u2013'; }).join(', ')) + '</div></div></div>';

    // Tabelle
    html += '<div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Alle Vereinbarungen im \u00dcberblick</h3></div>' +
        '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50">' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Standort</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Inhaber</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Budget/Jahr</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Budget/Monat</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Ziel-Leads</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">CPT</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Downloads</th>' +
        '</tr></thead><tbody class="divide-y divide-gray-100">';

    vbs.forEach(function(v) {
        var sName = v.standorte ? v.standorte.name : '\u2013';
        var sCls = v.signed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
        var sTxt = v.signed ? '\u2705 ' + (v.sign_date || '\u2013') : '\u23f3 Offen';
        var hasOriginal = !!v.pdf_storage_path;
        var dlBtns = '<div class="flex gap-1">' +
            (hasOriginal ? '<span title="Original-PDF" class="cursor-pointer text-base" onclick="mktHqDownloadPDF(\'original\',\'' + v.id + '\')">\ud83d\udcc4</span>' : '<span class="text-base opacity-25" title="Kein Original">\ud83d\udcc4</span>') +
            '<span title="Zusammenfassung" class="cursor-pointer text-base" onclick="mktHqDownloadPDF(\'summary\',\'' + v.id + '\')">\ud83d\udcca</span></div>';

        html += '<tr class="hover:bg-gray-50">' +
            '<td class="px-4 py-3 font-semibold">' + _escH(sName) + '</td>' +
            '<td class="px-4 py-3">' + _escH(v.inhaber_name || '\u2013') + '</td>' +
            '<td class="px-4 py-3">' + _fmtEur(v.budget_jahr) + '</td>' +
            '<td class="px-4 py-3">' + _fmtEur(Math.round(v.budget_jahr / 12)) + '</td>' +
            '<td class="px-4 py-3">' + (v.max_leads || '\u2013') + '</td>' +
            '<td class="px-4 py-3">' + _fmtEur(v.cpt || 0) + '</td>' +
            '<td class="px-4 py-3"><span class="text-xs px-2 py-1 rounded-full font-semibold ' + sCls + '">' + sTxt + '</span></td>' +
            '<td class="px-4 py-3">' + dlBtns + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    el.innerHTML = html;
}

// ══════════════════════════════════
// TAB: Meta Ads Gesamt
// ══════════════════════════════════
function renderHqMetaAds(el) {
    renderHqAdsTab(el, 'meta', 'Meta Ads \u2013 Netzwerk gesamt', 'Facebook & Instagram Performance aller Standorte');
}

// ══════════════════════════════════
// TAB: Google Ads Gesamt
// ══════════════════════════════════
function renderHqGoogleAds(el) {
    renderHqAdsTab(el, 'google', 'Google Ads \u2013 Netzwerk gesamt', 'Suchmaschinen-Performance aller Standorte');
}

function renderHqAdsTab(el, platform, title, subtitle) {
    var ads = (window.mktState.adsData || []).filter(function(a) {
        var p = (a.plattform || '').toLowerCase();
        if (platform === 'meta') return p.indexOf('meta') >= 0 || p.indexOf('facebook') >= 0 || p.indexOf('instagram') >= 0;
        return p.indexOf('google') >= 0;
    });

    var totalSpend = 0, totalImpr = 0, totalClicks = 0, totalLeads = 0;
    ads.forEach(function(a) {
        totalSpend += Number(a.ausgaben || 0);
        totalImpr += Number(a.impressionen || 0);
        totalClicks += Number(a.klicks || 0);
        totalLeads += Number(a.conversions || 0);
    });
    var avgCpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '\u2013';
    var avgCpl = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : '\u2013';

    var html = '<div class="flex justify-between items-center flex-wrap gap-3 mb-6">' +
        '<div><h2 class="text-xl font-bold text-gray-800 mb-1">' + _escH(title) + '</h2>' +
        '<p class="text-sm text-gray-500">' + _escH(subtitle) + '</p></div>' +
        '<input type="text" placeholder="\ud83d\udd0d Kampagne oder Standort filtern..." id="hqMktFilter' + platform + '" oninput="mktHqFilterTable(this.value,\'' + platform + '\')" ' +
        'class="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64"></div>';

    if (ads.length === 0) {
        html += renderHqNoData(title, 'Keine ' + (platform === 'meta' ? 'Meta' : 'Google') + ' Ads-Daten vorhanden.');
        el.innerHTML = html;
        return;
    }

    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
        window.mktKpiCard((platform === 'meta' ? 'Meta' : 'Google') + '-Ausgaben Gesamt', _fmtEur(totalSpend), (platform === 'meta' ? 'Facebook & Instagram' : 'Suchmaschinen-Werbung')) +
        window.mktKpiCard('Impressionen', _fmtN(totalImpr), 'Netzwerkweit') +
        window.mktKpiCard('Klicks', _fmtN(totalClicks), '\u00d8 CPC: ' + avgCpc + ' \u20ac') +
        window.mktKpiCard('Leads', String(totalLeads), '\u00d8 CPL: ' + avgCpl + ' \u20ac') +
        '</div>';

    // Pro Standort Tabelle
    var byStandort = {};
    ads.forEach(function(a) {
        var sid = a.standort_id || 'unknown';
        if (!byStandort[sid]) byStandort[sid] = { name: a.standort_name || '\u2013', ausgaben: 0, impressionen: 0, klicks: 0, leads: 0 };
        byStandort[sid].ausgaben += Number(a.ausgaben || 0);
        byStandort[sid].impressionen += Number(a.impressionen || 0);
        byStandort[sid].klicks += Number(a.klicks || 0);
        byStandort[sid].leads += Number(a.conversions || 0);
    });

    var rows = Object.keys(byStandort).map(function(sid) {
        var s = byStandort[sid];
        var ctr = s.impressionen > 0 ? ((s.klicks / s.impressionen) * 100).toFixed(2) + '%' : '\u2013';
        var cpl = s.leads > 0 ? _fmtEur(Math.round(s.ausgaben / s.leads)) : '\u2013';
        return '<tr class="hover:bg-gray-50 mkt-filter-row" data-filter="' + _escH(s.name.toLowerCase()) + '">' +
            '<td class="px-4 py-3 font-semibold">' + _escH(s.name) + '</td>' +
            '<td class="px-4 py-3">' + _fmtEur(s.ausgaben) + '</td>' +
            '<td class="px-4 py-3">' + _fmtN(s.impressionen) + '</td>' +
            '<td class="px-4 py-3">' + _fmtN(s.klicks) + '</td>' +
            '<td class="px-4 py-3">' + ctr + '</td>' +
            '<td class="px-4 py-3">' + s.leads + '</td>' +
            '<td class="px-4 py-3">' + cpl + '</td></tr>';
    }).join('');

    html += '<div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">' +
        (platform === 'meta' ? 'Meta' : 'Google') + ' Performance pro Standort</h3></div>' +
        '<div class="overflow-x-auto"><table class="w-full text-sm" id="hqMktTable' + platform + '"><thead><tr class="bg-gray-50">' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Standort</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Ausgaben</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Impressionen</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Klicks</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">CTR</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Leads</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">CPL</th>' +
        '</tr></thead><tbody class="divide-y divide-gray-100">' + rows + '</tbody></table></div></div>';

    el.innerHTML = html;
}

// ══════════════════════════════════
// TAB: Lead Reporting
// ══════════════════════════════════
function renderHqLeadReporting(el) {
    var tracking = window.mktState.leadTracking || [];
    var vbs = window.mktState.vereinbarungen || [];

    var totalZiel = vbs.reduce(function(s,v) { return s + Number(v.max_leads || 0); }, 0);
    var zielMonat = Math.round(totalZiel / 12);

    // YTD aggregieren
    var ytdLeads = 0, ytdTermine = 0, ytdSV = 0;
    tracking.forEach(function(t) {
        ytdLeads += Number(t.leads_ist || 0);
        ytdTermine += Number(t.termine_ist || 0);
        ytdSV += Number(t.store_visits_ist || 0);
    });

    var m = window.mktGetCurrentMonth();
    var ytdSoll = Math.round(totalZiel * m.month / 12);
    var ytdPct = ytdSoll > 0 ? Math.round(ytdLeads / ytdSoll * 100) : 0;

    var html = '<h2 class="text-xl font-bold text-gray-800 mb-1">Lead Reporting \u2013 Netzwerk</h2>' +
        '<p class="text-sm text-gray-500 mb-6">Jahresziel-Tracking und Lead-Qualit\u00e4t</p>';

    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
        window.mktKpiCard('Jahresziel Leads', _fmtN(totalZiel), zielMonat + ' pro Monat Ziel') +
        window.mktKpiCard('YTD Leads', _fmtN(ytdLeads), 'Soll YTD: ' + _fmtN(ytdSoll)) +
        window.mktKpiCard('Terminbuchungen', _fmtN(ytdTermine), ytdLeads > 0 ? (Math.round(ytdTermine / ytdLeads * 100) + '% Terminquote') : '\u2013') +
        window.mktKpiCard('Store Visits', _fmtN(ytdSV), 'Gewichtet mit Faktor 0,25') +
        '</div>';

    // Charts
    html += '<div class="vit-card p-5 mb-6"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Monatliche Lead-Entwicklung vs. Ziel</div>' +
        '<div style="height:250px"><canvas id="hqMktLeadChart"></canvas></div></div>';

    // Ampel-Tabelle
    if (vbs.length > 0) {
        html += '<div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Ampel-Tabelle \u2013 Zielerreichung pro Standort</h3></div>' +
            '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50">' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Standort</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Jahresziel</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">YTD Ist</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Erreichung</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>' +
            '</tr></thead><tbody class="divide-y divide-gray-100">';

        vbs.forEach(function(v) {
            var sName = v.standorte ? v.standorte.name : '\u2013';
            var jz = v.max_leads || 0;
            var ytdSollV = Math.round(jz * m.month / 12);
            // Ist aus tracking summieren
            var ytdIstV = tracking.filter(function(t) { return t.standort_id === v.standort_id; })
                .reduce(function(s, t) { return s + Number(t.leads_ist || 0); }, 0);
            var pct = ytdSollV > 0 ? Math.round(ytdIstV / ytdSollV * 100) : 0;

            html += '<tr class="hover:bg-gray-50"><td class="px-4 py-3 font-semibold">' + _escH(sName) + '</td>' +
                '<td class="px-4 py-3">' + jz + '</td>' +
                '<td class="px-4 py-3">' + ytdIstV + '</td>' +
                '<td class="px-4 py-3">' + window.mktProgressBar(pct, 6) + ' <span class="text-xs text-gray-500 ml-1">' + pct + '%</span></td>' +
                '<td class="px-4 py-3">' + window.mktStatusPill(pct) + '</td></tr>';
        });
        html += '</tbody></table></div></div>';
    }

    el.innerHTML = html;

    // Lead Chart
    setTimeout(function() {
        var MN = window.MKT_MONTH_NAMES;
        var C = window.MKT_CHART_COLORS;
        var zielData = MN.map(function() { return zielMonat; });
        var istData = MN.map(function(_, i) {
            return tracking.filter(function(t) { return t.monat === (i + 1); })
                .reduce(function(s, t) { return s + Number(t.leads_ist || 0); }, 0);
        });
        window.mktMakeChart('hqMktLeadChart', {
            type: 'bar',
            data: {
                labels: MN,
                datasets: [
                    { label: 'Ziel', data: zielData, backgroundColor: 'rgba(209,213,219,.4)', borderRadius: 6, order: 2 },
                    { label: 'Ist', data: istData, backgroundColor: C.orange, borderRadius: 6, order: 1 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, usePointStyle: true, padding: 16 } } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' } } } }
        });
    }, 50);
}

// ══════════════════════════════════
// TAB: Budget Plan
// ══════════════════════════════════
function renderHqBudgetPlan(el) {
    var vbs = window.mktState.vereinbarungen || [];
    var ads = window.mktState.adsData || [];

    var totalBudget = vbs.reduce(function(s,v) { return s + Number(v.budget_jahr || 0); }, 0);
    var totalSpend = ads.reduce(function(s,a) { return s + Number(a.ausgaben || 0); }, 0);
    var avgMonthly = totalBudget > 0 ? Math.round(totalBudget / 12) : 0;

    // Google vs Meta Split aus ads berechnen
    var googleSpend = 0, metaSpend = 0;
    ads.forEach(function(a) {
        var p = (a.plattform || '').toLowerCase();
        if (p.indexOf('meta') >= 0 || p.indexOf('facebook') >= 0) metaSpend += Number(a.ausgaben || 0);
        else googleSpend += Number(a.ausgaben || 0);
    });
    var splitPct = totalSpend > 0 ? Math.round(googleSpend / totalSpend * 100) : 80;

    var html = '<h2 class="text-xl font-bold text-gray-800 mb-1">Budget Plan ' + new Date().getFullYear() + '</h2>' +
        '<p class="text-sm text-gray-500 mb-6">Budget\u00fcbersicht und Channel-Split aller Standorte</p>';

    // Dark Section - Budget Summary
    html += '<div class="bg-gray-900 rounded-xl p-7 mb-6"><div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Budget Summary</div>' +
        '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">';
    [{ l: 'Jahresbudget', v: _fmtEur(totalBudget), s: vbs.length + ' aktive Standorte', c: 'text-vit-orange' },
     { l: 'YTD Ausgaben', v: _fmtEur(totalSpend), s: (totalBudget > 0 ? Math.round(totalSpend / totalBudget * 100) : 0) + '% des Jahresbudgets' },
     { l: '\u00d8 Monatlich', v: _fmtEur(avgMonthly), s: '\u00d8 ' + _fmtEur(vbs.length > 0 ? Math.round(avgMonthly / vbs.length) : 0) + ' pro Standort' },
     { l: 'Channel Split', v: splitPct + '/' + (100 - splitPct), s: 'Google / Meta' }
    ].forEach(function(k) {
        html += '<div class="bg-gray-800 rounded-xl p-5"><div class="text-xs text-gray-500">' + k.l + '</div>' +
            '<div class="text-xl font-bold mt-1 ' + (k.c || 'text-white') + '">' + k.v + '</div>' +
            '<div class="text-xs text-gray-500 mt-1">' + k.s + '</div></div>';
    });
    html += '</div></div>';

    // Budget pro Standort Tabelle
    if (vbs.length > 0) {
        html += '<div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Budget pro Standort</h3></div>' +
            '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50">' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Standort</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Monatsbudget</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Jahresbudget</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Mediamix</th>' +
            '</tr></thead><tbody class="divide-y divide-gray-100">';

        vbs.forEach(function(v) {
            var sName = v.standorte ? v.standorte.name : '\u2013';
            var sCls = v.signed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
            var sTxt = v.signed ? 'Aktiv' : 'Offen';
            var mm = (v.mediamix || []).join(', ');
            html += '<tr class="hover:bg-gray-50"><td class="px-4 py-3 font-semibold">' + _escH(sName) + '</td>' +
                '<td class="px-4 py-3"><span class="text-xs px-2 py-1 rounded-full font-semibold ' + sCls + '">' + sTxt + '</span></td>' +
                '<td class="px-4 py-3">' + _fmtEur(Math.round(v.budget_jahr / 12)) + '</td>' +
                '<td class="px-4 py-3">' + _fmtEur(v.budget_jahr) + '</td>' +
                '<td class="px-4 py-3 text-xs text-gray-500">' + _escH(mm) + '</td></tr>';
        });
        html += '</tbody></table></div></div>';
    }

    el.innerHTML = html;
}

// ══════════════════════════════════
// TAB: Video-Freigabe (BESTEHEND)
// ══════════════════════════════════
function renderHqVideoFreigabe(el) {
    el.innerHTML = '<div id="hqVpReviewContent"></div>';

    setTimeout(function() {
        if (typeof window.vpInit === 'function') window.vpInit();
        if (typeof window.vpRenderHqReview === 'function') window.vpRenderHqReview();
    }, 50);
}

// ── Shared Helpers ──

function renderHqNoData(title, msg) {
    return '<div class="text-center py-16"><div class="text-5xl mb-4">\ud83d\udcca</div>' +
        '<h3 class="text-lg font-bold text-gray-800 mb-2">' + _escH(title) + '</h3>' +
        '<p class="text-sm text-gray-500 max-w-md mx-auto">' + _escH(msg) + '</p>' +
        '<span class="inline-block mt-4 text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold">Daten werden vorbereitet</span></div>';
}

// Filter für HQ Ads Tabellen
function mktHqFilterTable(query, platform) {
    var table = document.getElementById('hqMktTable' + platform);
    if (!table) return;
    var rows = table.querySelectorAll('.mkt-filter-row');
    var q = (query || '').toLowerCase();
    rows.forEach(function(row) {
        var filter = row.getAttribute('data-filter') || '';
        row.style.display = (!q || filter.indexOf(q) >= 0) ? '' : 'none';
    });
}

// HQ Download
function mktHqDownloadPDF(type, vereinbarungId) {
    var vbs = window.mktState.vereinbarungen || [];
    var vb = vbs.find(function(v) { return v.id === vereinbarungId; });
    if (!vb) { _showToast('Vereinbarung nicht gefunden', 'error'); return; }

    if (type === 'original') {
        if (!vb.pdf_storage_path) { _showToast('Kein Original-PDF hinterlegt', 'info'); return; }
        var sb = _sb();
        if (!sb) return;
        sb.storage.from('marketing-docs').download(vb.pdf_storage_path).then(function(res) {
            if (res.error) { _showToast('Download fehlgeschlagen: ' + res.error.message, 'error'); return; }
            var sName = vb.standorte ? vb.standorte.name : 'Standort';
            var url = URL.createObjectURL(res.data);
            var a = document.createElement('a');
            a.href = url; a.download = 'Marketing-Vereinbarung-' + _escH(sName) + '-' + vb.jahr + '.pdf';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    } else {
        _showToast('PDF-Generierung noch nicht implementiert', 'info');
    }
}

// ── Window Exports ──
window.renderHqMarketing = renderHqMarketing;
window.renderHqMktTabContent = renderHqMktTabContent;
window.showHqMktTab = showHqMktTab;
window.mktHqFilterTable = mktHqFilterTable;
window.mktHqDownloadPDF = mktHqDownloadPDF;

})();
