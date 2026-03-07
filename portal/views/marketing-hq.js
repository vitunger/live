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

    // Standorte + Monatsdaten laden
    if (typeof window.mktLoadStandorte === 'function') await window.mktLoadStandorte();
    await window.mktInitMonthSelect();

    // Tabs rendern
    var tabHtml = HQ_TABS.map(function(t) {
        return '<button onclick="showHqMktTab(\'' + t.id + '\')" class="hqmkt-tab-btn whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ' +
            (t.id === 'uebersicht' ? 'border-vit-orange text-vit-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300') +
            '" data-hqmkt="' + t.id + '">' + t.icon + ' ' + t.label + '</button>';
    }).join('');

    var monthSelector = typeof window.mktRenderMonthSelector === 'function' ? window.mktRenderMonthSelector() : '';

    // HQ sieht immer die volle Experten-Ansicht — Toggle nur für Partner sinnvoll
    var expertToggle = '';

    var standortFilter = typeof window.mktRenderStandortFilter === 'function' ? window.mktRenderStandortFilter() : '';
    var yearSelector = typeof window.mktRenderYearSelector === 'function' ? window.mktRenderYearSelector() : '';

    container.innerHTML =
        '<div class="flex items-center justify-between mb-2 flex-wrap gap-2">' +
            (expertToggle ? '<div class="flex items-center gap-3">' + expertToggle + '</div>' : '') +
            '<div class="flex items-center gap-2 flex-wrap">' +
                '<span class="text-xs text-gray-400">Standort:</span>' + standortFilter +
                '<span class="text-xs text-gray-400 ml-2">Zeitraum:</span>' + monthSelector +
                '<span class="text-xs text-gray-400 ml-2">Jahr:</span>' + yearSelector +
            '</div>' +
        '</div>' +
        '<div class="mb-6 border-b border-gray-200"><nav class="-mb-px flex space-x-6 overflow-x-auto">' + tabHtml + '</nav></div>' +
        '<div id="hqMktTabContent"></div>';

    // Daten laden (nur wenn noch nicht gecacht)
    var state = window.mktState || {};
    var currentMonth = window.mktGetCurrentMonth ? window.mktGetCurrentMonth() : {};
    if (!state._hqDataLoaded || state._lastMonth !== currentMonth.month) {
        await Promise.all([
            window.mktLoadAlleVereinbarungen(),
            window.mktLoadAdsData(null),
            window.mktLoadLeadTracking(null)
        ]);
        state._hqDataLoaded = true;
        state._lastMonth = currentMonth.month;
    }

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
    var tracking = window.mktState.leadTracking || [];
    var m = window.mktGetCurrentMonth();

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

    // Alert-Banner (Feature 8)
    var html = '';
    var problemStandorte = [];
    vbs.forEach(function(v) {
        var ytd = window.mktCalcYTD(v);
        if (ytd.budgetPct < 50 || ytd.leadsPct < 70) {
            var sName = v.standorte ? v.standorte.name : '\u2013';
            var problems = [];
            if (ytd.budgetPct < 50) problems.push('Budget ' + ytd.budgetPct + '%');
            if (ytd.leadsPct < 70) problems.push('Leads ' + ytd.leadsPct + '%');
            problemStandorte.push(sName + ' (' + problems.join(', ') + ')');
        }
    });
    if (problemStandorte.length > 0) {
        html += '<div class="alert-banner">' +
            '<div class="alert-icon">\u26a0\ufe0f</div>' +
            '<div><div class="alert-title">' + problemStandorte.length + ' Standort' + (problemStandorte.length !== 1 ? 'e' : '') + ' ben\u00f6tigen Aufmerksamkeit</div>' +
            '<div class="alert-list">' + problemStandorte.map(function(s) { return '<strong>' + _escH(s) + '</strong>'; }).join(' \u00b7 ') + '</div></div></div>';
    }

    // KPIs
    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
        window.mktKpiCard('Netzwerk-Ausgaben', _fmtEur(totalSpend), activeStandorte.size + ' aktive Standorte') +
        window.mktKpiCard('Gesamtreichweite', _fmtN(totalImpr), 'Impressionen netzwerkweit') +
        window.mktKpiCard('Gesamt-Klicks', _fmtN(totalClicks), '\u00d8 ' + _fmtN(activeStandorte.size > 0 ? Math.round(totalClicks / activeStandorte.size) : 0) + ' pro Standort') +
        window.mktKpiCard('Gesamt-Leads', String(totalLeads), 'Termine & Anfragen') +
        '</div>';

    // GA4 Website-Analytics Sektion (Mockup-Reihenfolge: nach KPIs, vor VB-Summary)
    html += '<div class="vit-card p-5 mb-6"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Website Analytics \u2013 vitbikes.de (GA4)</div>' +
        '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">' +
        '<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-400">Nutzer gesamt</div><div class="text-lg font-bold text-gray-700">\u2013</div></div>' +
        '<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-400">Seitenansichten</div><div class="text-lg font-bold text-gray-700">\u2013</div></div>' +
        '<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-400">Absprungrate</div><div class="text-lg font-bold text-gray-700">\u2013</div></div>' +
        '<div class="bg-gray-50 rounded-lg p-3"><div class="text-xs text-gray-400">E-Termin Buchungen</div><div class="text-lg font-bold text-gray-700">\u2013</div></div>' +
        '</div>' +
        '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">' +
        '<div><div class="text-xs font-semibold text-gray-500 mb-2">Traffic-Quellen</div><div style="height:160px"><canvas id="hqMktGA4Traffic"></canvas></div></div>' +
        '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50">' +
        '<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Channel</th>' +
        '<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Neue Nutzer</th>' +
        '<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Gesamt</th>' +
        '<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Sitzungsdauer</th>' +
        '</tr></thead><tbody class="divide-y divide-gray-100 text-gray-400">' +
        '<tr><td colspan="4" class="px-3 py-4 text-center text-sm">GA4-Daten werden verf\u00fcgbar, sobald die Integration aktiv ist.</td></tr>' +
        '</tbody></table></div></div></div>';

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

    // Extended Standort-Kacheln (Feature 10)
    if (ads.length > 0) {
        html += '<div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Standort-Performance</div>';
        var byStandort = {};
        ads.forEach(function(a) {
            var sid = a.standort_id || 'unknown';
            if (!byStandort[sid]) byStandort[sid] = { id: sid, spend: 0, clicks: 0, impr: 0, leads: 0, name: a.standort_name || sid };
            byStandort[sid].spend += Number(a.ausgaben || 0);
            byStandort[sid].clicks += Number(a.klicks || 0);
            byStandort[sid].impr += Number(a.impressionen || 0);
            byStandort[sid].leads += Number(a.conversions || 0);
        });

        // Berechne Scores und sortiere (schlechtester zuerst)
        var standortEntries = Object.keys(byStandort).map(function(sid) {
            var s = byStandort[sid];
            var vb = vbs.find(function(v) { return v.standort_id === sid; });
            var budgetPct = 0, leadsPct = 0;
            if (vb) {
                var ytd = window.mktCalcYTD(vb);
                budgetPct = ytd.budgetPct;
                leadsPct = ytd.leadsPct;
            }
            s.score = Math.max(0, Math.min(100, Math.round((Math.min(budgetPct / 100, 1) * 0.5 + Math.min(leadsPct / 100, 1) * 0.5) * 100)));
            s.budgetPct = budgetPct;
            s.leadsPct = leadsPct;
            s.ctr = s.impr > 0 ? ((s.clicks / s.impr) * 100).toFixed(1) : '0';
            s.cpc = s.clicks > 0 ? (s.spend / s.clicks).toFixed(2) : '\u2013';
            return s;
        });
        standortEntries.sort(function(a, b) { return a.score - b.score; });

        html += '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">';
        standortEntries.forEach(function(s) {
            var scoreCls = s.score >= 80 ? 'st-green' : s.score >= 50 ? 'st-amber' : 'st-red';
            var badgeCls = s.score >= 80 ? 'bg-green-500' : s.score >= 50 ? 'bg-yellow-500' : 'bg-red-500';
            var problemText = '';
            if (s.score < 50) {
                var issues = [];
                if (s.budgetPct < 50) issues.push('Budget unter 50%');
                if (s.leadsPct < 70) issues.push('Leads unter Ziel');
                if (s.leads === 0) issues.push('Keine Leads diesen Monat');
                problemText = '<div class="standort-problem">\u26a0 ' + issues.join(' \u00b7 ') + '</div>';
            } else if (s.score >= 80) {
                problemText = '<div class="standort-ok">\u2705 Alle Ziele auf Kurs</div>';
            }

            html += '<div class="standort-card ' + scoreCls + '">' +
                '<div class="flex justify-between items-start">' +
                '<div class="font-semibold text-sm text-gray-800">' + _escH(s.name) + '</div>' +
                '<div class="w-8 h-8 rounded-full ' + badgeCls + ' flex items-center justify-center text-white text-xs font-bold flex-shrink-0">' + s.score + '</div>' +
                '</div>' +
                '<div class="mt-2 mb-1"><div class="flex justify-between text-xs text-gray-500 mb-1"><span>Budget</span><span>' + s.budgetPct + '%</span></div>' +
                window.mktProgressBar(s.budgetPct, 4) + '</div>' +
                '<div class="mb-2"><div class="flex justify-between text-xs text-gray-500 mb-1"><span>Leads</span><span>' + s.leadsPct + '%</span></div>' +
                window.mktProgressBar(s.leadsPct, 4) + '</div>' +
                '<div class="flex gap-3 mt-2 flex-wrap">' +
                '<div class="standort-mini"><span>Klicks</span><span class="sm-val">' + _fmtN(s.clicks) + '</span></div>' +
                '<div class="standort-mini"><span>CTR</span><span class="sm-val">' + s.ctr + '%</span></div>' +
                '<div class="standort-mini"><span>CPC</span><span class="sm-val">' + s.cpc + ' \u20ac</span></div>' +
                '</div>' +
                problemText + '</div>';
        });
        html += '</div>';
    } else {
        html += renderHqNoData('Netzwerk-Daten', 'Noch keine Ads-Performance-Daten vorhanden. Die Daten werden automatisch synchronisiert.');
    }

    // Charts (expert-panel - nur im Experten-Modus sichtbar)
    html += '<div class="expert-panel"><div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Netzwerk-Trend \u2013 6 Monate</div>' +
        '<div style="height:250px"><canvas id="hqMktChartTrend"></canvas></div></div>' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Kanal-Vergleich Netzwerk</div>' +
        '<div style="height:250px"><canvas id="hqMktChartChannel"></canvas></div></div></div></div>';

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

    // Abweichungs-Alert (Feature 11)
    var abweichungen = [];
    vbs.forEach(function(v) {
        var ytd = window.mktCalcYTD(v);
        var budgetAbw = ytd.budgetSoll > 0 ? Math.abs(ytd.budgetIst - ytd.budgetSoll) / ytd.budgetSoll * 100 : 0;
        var leadsAbw = ytd.leadsSoll > 0 ? Math.abs(ytd.leadsIst - ytd.leadsSoll) / ytd.leadsSoll * 100 : 0;
        if (budgetAbw > 20 || leadsAbw > 20) {
            var sName = v.standorte ? v.standorte.name : '\u2013';
            var details = [];
            if (budgetAbw > 20) details.push('Budget ' + Math.round(budgetAbw) + '% Abw.');
            if (leadsAbw > 20) details.push('Leads ' + Math.round(leadsAbw) + '% Abw.');
            abweichungen.push(sName + ' (' + details.join(', ') + ')');
        }
    });
    if (abweichungen.length > 0) {
        html += '<div class="alert-banner amber">' +
            '<div class="alert-icon">\ud83d\udea8</div>' +
            '<div><div class="alert-title">' + abweichungen.length + ' Vereinbarung' + (abweichungen.length !== 1 ? 'en' : '') + ' mit >20% Abweichung</div>' +
            '<div class="alert-list">' + abweichungen.map(function(s) { return '<strong>' + _escH(s) + '</strong>'; }).join(' \u00b7 ') + '</div></div></div>';
    }

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

    // Saisonkurve-Chart (Feature 12) – Mockup: VOR der Tabelle
    html += '<div class="vit-card p-5 mb-6"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Netzwerk Forecast ' + new Date().getFullYear() + ' \u2013 Saisonkurve Budget & Leads</div>' +
        '<div style="height:280px"><canvas id="mktSaisonkurve"></canvas></div></div>';

    // Tabelle
    html += '<div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Alle Vereinbarungen im \u00dcberblick</h3></div>' +
        '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50">' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Standort</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Inhaber</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Budget/Jahr</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Budget/Monat</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Ziel-Leads</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">CPT</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Umsatzziel</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">MK-Anteil</th>' +
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
            '<td class="px-4 py-3">' + _fmtEur(v.umsatz_ziel || 0) + '</td>' +
            '<td class="px-4 py-3">' + (v.marketing_anteil || 0) + '%</td>' +
            '<td class="px-4 py-3"><span class="text-xs px-2 py-1 rounded-full font-semibold ' + sCls + '">' + sTxt + '</span></td>' +
            '<td class="px-4 py-3">' + dlBtns + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    // YTD Abweichungsanalyse Tabelle
    var m = window.mktGetCurrentMonth();
    var tracking = window.mktState.leadTracking || [];
    html += '<div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">YTD Abweichungsanalyse</h3></div>' +
        '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50">' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Standort</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Budget Soll</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Budget Ist</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Abw.</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Leads Soll</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Leads Ist</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Abw.</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Handlung</th>' +
        '</tr></thead><tbody class="divide-y divide-gray-100">';

    vbs.forEach(function(v) {
        var sName = v.standorte ? v.standorte.name : '\u2013';
        var ytd = window.mktCalcYTD(v);
        var budgetAbw = ytd.budgetSoll > 0 ? Math.round((ytd.budgetIst - ytd.budgetSoll) / ytd.budgetSoll * 100) : 0;
        var leadsAbw = ytd.leadsSoll > 0 ? Math.round((ytd.leadsIst - ytd.leadsSoll) / ytd.leadsSoll * 100) : 0;
        var budgetAbwCls = budgetAbw < -20 ? 'text-red-600 font-semibold' : budgetAbw > 20 ? 'text-yellow-600 font-semibold' : 'text-green-600';
        var leadsAbwCls = leadsAbw < -20 ? 'text-red-600 font-semibold' : leadsAbw > 20 ? 'text-yellow-600 font-semibold' : 'text-green-600';
        var handlung = '';
        if (budgetAbw < -20 || leadsAbw < -20) handlung = '<span class="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">Pr\u00fcfen</span>';
        else if (budgetAbw > 20 || leadsAbw > 20) handlung = '<span class="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold">Beobachten</span>';
        else handlung = '<span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">OK</span>';

        html += '<tr class="hover:bg-gray-50"><td class="px-4 py-3 font-semibold">' + _escH(sName) + '</td>' +
            '<td class="px-4 py-3">' + _fmtEur(ytd.budgetSoll) + '</td>' +
            '<td class="px-4 py-3">' + _fmtEur(ytd.budgetIst) + '</td>' +
            '<td class="px-4 py-3 ' + budgetAbwCls + '">' + (budgetAbw > 0 ? '+' : '') + budgetAbw + '%</td>' +
            '<td class="px-4 py-3">' + ytd.leadsSoll + '</td>' +
            '<td class="px-4 py-3">' + ytd.leadsIst + '</td>' +
            '<td class="px-4 py-3 ' + leadsAbwCls + '">' + (leadsAbw > 0 ? '+' : '') + leadsAbw + '%</td>' +
            '<td class="px-4 py-3">' + handlung + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    el.innerHTML = html;

    // Saisonkurve-Chart rendern
    setTimeout(function() {
        var MN = window.MKT_MONTH_NAMES;
        var W = window.MKT_SEASON_WEIGHTS;
        var budgetBars = MN.map(function(_, i) {
            return Math.round(totalBudget * W[i] / 100);
        });
        var leadLine = MN.map(function(_, i) {
            return Math.round(totalLeads * W[i] / 100);
        });
        window.mktChartBarLine('mktSaisonkurve', MN, budgetBars, leadLine, 'Budget Soll (\u20ac)', 'Lead-Ziel');
    }, 50);
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

    // Charts (Mockup: Spending Trend + Split/Typ)
    var chartId1 = 'hqMkt' + (platform === 'meta' ? 'Meta' : 'Google') + 'Trend';
    var chartId2 = 'hqMkt' + (platform === 'meta' ? 'Meta' : 'Google') + 'Split';
    var chartTitle1 = platform === 'meta' ? 'Meta Spending Trend \u2013 6 Monate' : 'Google Spending Trend \u2013 6 Monate';
    var chartTitle2 = platform === 'meta' ? 'Facebook vs. Instagram \u2013 Netzwerk' : 'Kampagnentyp-Verteilung Netzwerk';
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">' + chartTitle1 + '</div>' +
        '<div style="height:250px"><canvas id="' + chartId1 + '"></canvas></div></div>' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">' + chartTitle2 + '</div>' +
        '<div style="height:250px"><canvas id="' + chartId2 + '"></canvas></div></div></div>';

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

    // Charts rendern
    setTimeout(function() {
        var C = window.MKT_CHART_COLORS;
        var months = window.MKT_MONTH_NAMES;
        var m = window.mktGetCurrentMonth();
        var labels = [];
        for (var i = 5; i >= 0; i--) {
            var mi = m.month - 1 - i;
            if (mi < 0) mi += 12;
            labels.push(months[mi]);
        }
        // Trend: Spending letzte 6 Monate (nur aktueller Monat mit Daten)
        window.mktChartBarLine(chartId1, labels, [0,0,0,0,0, Math.round(totalSpend)], [0,0,0,0,0, totalLeads], 'Ausgaben (\u20ac)', 'Leads');
        // Split
        if (platform === 'meta') {
            var fbS = 0, igS = 0;
            ads.forEach(function(a) {
                var pp = (a.publisher_platform || a.plattform || '').toLowerCase();
                if (pp.indexOf('instagram') >= 0) igS += Number(a.ausgaben || 0);
                else fbS += Number(a.ausgaben || 0);
            });
            window.mktChartDoughnut(chartId2, ['Facebook', 'Instagram'], [Math.round(fbS), Math.round(igS)], [C.blue, '#E1306C']);
        } else {
            var typeMap = { search: 0, display: 0, shopping: 0, video: 0, other: 0 };
            ads.forEach(function(a) {
                var ct = (a.campaign_type || '').toLowerCase();
                if (ct.indexOf('search') >= 0) typeMap.search += Number(a.ausgaben || 0);
                else if (ct.indexOf('display') >= 0) typeMap.display += Number(a.ausgaben || 0);
                else if (ct.indexOf('shopping') >= 0 || ct.indexOf('pmax') >= 0) typeMap.shopping += Number(a.ausgaben || 0);
                else if (ct.indexOf('video') >= 0) typeMap.video += Number(a.ausgaben || 0);
                else typeMap.other += Number(a.ausgaben || 0);
            });
            if (typeMap.search === 0 && typeMap.display === 0 && typeMap.shopping === 0 && typeMap.video === 0 && typeMap.other === 0) {
                typeMap.search = totalSpend;
            }
            window.mktChartDoughnut(chartId2, ['Suche', 'Display', 'Shopping', 'Video', 'Sonstige'],
                [Math.round(typeMap.search), Math.round(typeMap.display), Math.round(typeMap.shopping), Math.round(typeMap.video), Math.round(typeMap.other)],
                [C.orange, C.blue, C.green, '#8B5CF6', C.gray]);
        }
    }, 50);
}

// ══════════════════════════════════
// TAB: Lead Reporting
// ══════════════════════════════════
function renderHqLeadReporting(el) {
    var tracking = window.mktState.leadTracking || [];
    var vbs = window.mktState.vereinbarungen || [];
    var selectedStandort = window.mktState.selectedStandort;

    // Filter by selected standort if set
    if (selectedStandort) {
        tracking = tracking.filter(function(t) { return t.standort_id === selectedStandort; });
        vbs = vbs.filter(function(v) { return v.standort_id === selectedStandort; });
    }

    var totalZiel = vbs.reduce(function(s,v) { return s + Number(v.max_leads || 0); }, 0);
    var zielMonat = Math.round(totalZiel / 12);

    // YTD aggregieren basierend auf Lead-Typ-Filter
    var leadType = window.mktState._leadType || 'kombi';
    var ytdLeads = 0, ytdTermine = 0, ytdSV = 0;
    tracking.forEach(function(t) {
        ytdTermine += Number(t.termine_ist || 0);
        ytdSV += Number(t.store_visits_ist || 0);
        if (leadType === 'kombi') {
            ytdLeads += Number(t.leads_ist || 0);
        } else if (leadType === 'regulaer') {
            ytdLeads += Number(t.leads_ist || 0) - Number(t.store_visits_ist || 0);
        } else if (leadType === 'store_visits') {
            ytdLeads += Math.round(Number(t.store_visits_ist || 0) * 0.25);
        } else if (leadType === 'anzeige_sv') {
            ytdLeads += Number(t.store_visits_ist || 0);
        }
    });

    var m = window.mktGetCurrentMonth();
    var ytdSoll = Math.round(totalZiel * m.month / 12);
    var ytdPct = ytdSoll > 0 ? Math.round(ytdLeads / ytdSoll * 100) : 0;

    // Live-Daten Banner
    var html = typeof window.mktRenderLiveBanner === 'function' ? window.mktRenderLiveBanner(leadType) : '';

    // Titel + Lead-Typen-Toggle
    html += '<div class="flex justify-between items-start flex-wrap gap-3 mb-6">' +
        '<div><h2 class="text-xl font-bold text-gray-800 mb-1">Lead Reporting \u2013 Netzwerk</h2>' +
        '<p class="text-sm text-gray-500">Jahresziel-Tracking und Lead-Qualit\u00e4t</p></div>' +
        '<div class="flex flex-wrap gap-2">' +
        '<button class="mkt-lead-pill' + (leadType === 'kombi' ? ' active' : '') + '" onclick="mktSetLeadType(this,\'kombi\')">Kombi</button>' +
        '<button class="mkt-lead-pill' + (leadType === 'regulaer' ? ' active' : '') + '" onclick="mktSetLeadType(this,\'regulaer\')">Leads Regul\u00e4r</button>' +
        '<button class="mkt-lead-pill' + (leadType === 'store_visits' ? ' active' : '') + '" onclick="mktSetLeadType(this,\'store_visits\')">Store-Visits 25%</button>' +
        '<button class="mkt-lead-pill' + (leadType === 'anzeige_sv' ? ' active' : '') + '" onclick="mktSetLeadType(this,\'anzeige_sv\')">Anzeige-Store-Visits</button>' +
        '</div></div>';

    // KPI Cards
    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
        window.mktKpiCard('Jahresziel Leads', _fmtN(totalZiel), zielMonat + ' pro Monat Ziel') +
        window.mktKpiCard('Ziel YTD (' + m.month + ' Mon.)', _fmtN(ytdSoll), 'Soll bis heute') +
        window.mktKpiCard('Ist YTD', _fmtN(ytdLeads), 'Erreicht bis heute') +
        window.mktKpiCard('Performance', ytdPct + '%', 'Zielerreichung') +
        '</div>';

    // Standort-Performance Pills (kompakt)
    if (vbs.length > 0 && !selectedStandort) {
        html += '<div class="vit-card p-5 mb-6"><div class="flex justify-between items-center mb-3">' +
            '<div class="text-xs font-semibold text-gray-400 uppercase tracking-wider">\ud83d\udccd Standort-Performance YTD</div>' +
            '<div class="flex items-center gap-2 text-[10px] text-gray-400">' +
            '<span>\ud83d\udd34 &lt;50%</span><span>\ud83d\udfe0 50-75%</span><span>\ud83d\udfe2 75-100%</span><span>\ud83d\udfe2 \u2265100%</span></div></div>' +
            '<div class="flex flex-wrap gap-2" id="hqMktStandortPills">';
        var pillData = vbs.map(function(v) {
            var ytd = window.mktCalcYTD(v);
            var pct = leadType === 'kombi' ? ytd.leadsPct : ytd.budgetPct;
            var sName = v.standorte ? v.standorte.name : '\u2013';
            return { name: sName, pct: pct };
        });
        pillData.sort(function(a, b) { return a.pct - b.pct; });
        pillData.forEach(function(p) {
            var dotCls = p.pct >= 100 ? 'bg-green-400' : p.pct >= 75 ? 'bg-green-500' : p.pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
            html += '<div class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">' +
                '<span class="w-2 h-2 rounded-full ' + dotCls + '"></span>' +
                '<span class="text-gray-700">' + _escH(p.name) + '</span>' +
                '<span class="font-bold ' + (p.pct >= 75 ? 'text-green-600' : p.pct >= 50 ? 'text-yellow-600' : 'text-red-600') + '">' + p.pct + '%</span></div>';
        });
        html += '</div></div>';
    }

    // Monatliche Uebersicht (Bar Chart Soll vs Ist)
    html += '<div class="vit-card p-5 mb-6"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">\ud83d\udcca Monatliche \u00dcbersicht</div>' +
        '<div style="height:250px"><canvas id="hqMktLeadChart"></canvas></div></div>';

    // Zielerreichung pro Standort & Monat (Multi-Line Chart) - NEUES FEATURE
    if (vbs.length > 1 && !selectedStandort) {
        html += '<div class="vit-card p-5 mb-6"><div class="flex justify-between items-center mb-4">' +
            '<div><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider">\ud83d\udcc8 Zielerreichung pro Standort & Monat</div>' +
            '<div class="text-xs text-gray-400 mt-1">Prozentuale Zielerreichung (Ist / Soll \u00d7 100) je Standort</div></div></div>' +
            '<div style="height:300px"><canvas id="hqMktZielerreichungChart"></canvas></div></div>';
    }

    // Detailansicht Monatstabelle - NEUES FEATURE
    html += '<div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">\ud83d\udccb Detailansicht</h3></div>' +
        '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50">' +
        '<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Monat</th>' +
        '<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Soll</th>' +
        '<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase text-orange-500">Termine</th>' +
        '<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase text-green-500">\u20ac/Termin</th>' +
        '<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase text-purple-500">SV (\u00d70.25)</th>' +
        '<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase text-yellow-500">SV (Roh)</th>' +
        '<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase font-bold">Gesamt</th>' +
        '<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Differenz</th>' +
        '<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Performance</th>' +
        '<th class="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>' +
        '</tr></thead><tbody class="divide-y divide-gray-100">';

    var MN = window.MKT_MONTH_NAMES;
    var W = window.MKT_SEASON_WEIGHTS;
    var ads = window.mktState.adsData || [];
    MN.forEach(function(mName, i) {
        var monat = i + 1;
        var soll = Math.round(totalZiel * W[i] / 100);
        var mTracking = tracking.filter(function(t) { return t.monat === monat; });
        var termine = mTracking.reduce(function(s,t) { return s + Number(t.termine_ist || 0); }, 0);
        var svRoh = mTracking.reduce(function(s,t) { return s + Number(t.store_visits_ist || 0); }, 0);
        var sv25 = Math.round(svRoh * 0.25 * 10) / 10;
        var leadsReg = mTracking.reduce(function(s,t) { return s + Number(t.leads_ist || 0); }, 0);
        var gesamt = leadsReg + sv25;
        // Ads ausgaben fuer diesen Monat
        var mAds = ads.filter(function(a) { if (!a.datum) return false; var d = new Date(a.datum); return d.getMonth() === i; });
        var mSpend = mAds.reduce(function(s,a) { return s + Number(a.ausgaben || 0); }, 0);
        var euroTermin = termine > 0 ? Math.round(mSpend / termine) : 0;
        var diff = Math.round((gesamt - soll) * 10) / 10;
        var perf = soll > 0 ? Math.round(gesamt / soll * 100) : 0;
        var isActive = monat === m.month;
        var isFuture = monat > m.month;
        var statusIcon = isFuture ? '\u23f0' : perf >= 100 ? '\u2705' : perf < 50 ? '\u274c' : '\u26a0\ufe0f';
        var diffCls = diff >= 0 ? 'text-green-600' : 'text-red-600';
        var perfCls = perf >= 100 ? 'text-green-600' : perf >= 50 ? 'text-yellow-600' : 'text-red-600';
        var rowBg = isActive ? ' bg-orange-50' : '';
        html += '<tr class="hover:bg-gray-50' + rowBg + '">' +
            '<td class="px-3 py-2.5 font-semibold">' + mName + '</td>' +
            '<td class="px-3 py-2.5">' + _fmtN(soll) + '</td>' +
            '<td class="px-3 py-2.5 text-orange-500 font-semibold">' + (isFuture ? '\u2013' : termine) + '</td>' +
            '<td class="px-3 py-2.5 text-green-600">' + (isFuture || !euroTermin ? '\u2013' : _fmtEur(euroTermin)) + '</td>' +
            '<td class="px-3 py-2.5 text-purple-600">' + (isFuture ? '\u2013' : sv25) + '</td>' +
            '<td class="px-3 py-2.5 text-yellow-600">' + (isFuture ? '\u2013' : svRoh) + '</td>' +
            '<td class="px-3 py-2.5 font-bold">' + (isFuture ? '\u2013' : _fmtN(gesamt)) + '</td>' +
            '<td class="px-3 py-2.5 ' + (isFuture ? '' : diffCls) + ' font-semibold">' + (isFuture ? '\u2013' : (diff > 0 ? '+' : '') + diff) + '</td>' +
            '<td class="px-3 py-2.5 ' + (isFuture ? '' : perfCls) + ' font-semibold">' + (isFuture ? '\u2013' : perf + '%') + '</td>' +
            '<td class="px-3 py-2.5 text-center">' + statusIcon + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    // Ampel-Tabelle
    if (vbs.length > 0) {
        html += '<div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Ampel-Tabelle \u2013 Zielerreichung pro Standort</h3></div>' +
            '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50">' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Standort</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Jahresziel</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">YTD-Ziel</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">YTD Ist</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Erreichung</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>' +
            '</tr></thead><tbody class="divide-y divide-gray-100">';

        vbs.forEach(function(v) {
            var sName = v.standorte ? v.standorte.name : '\u2013';
            var jz = v.max_leads || 0;
            var ytdSollV = Math.round(jz * m.month / 12);
            var ytdIstV = tracking.filter(function(t) { return t.standort_id === v.standort_id; })
                .reduce(function(s, t) { return s + Number(t.leads_ist || 0); }, 0);
            var pct = ytdSollV > 0 ? Math.round(ytdIstV / ytdSollV * 100) : 0;

            html += '<tr class="hover:bg-gray-50"><td class="px-4 py-3 font-semibold">' + _escH(sName) + '</td>' +
                '<td class="px-4 py-3">' + jz + '</td>' +
                '<td class="px-4 py-3">' + ytdSollV + '</td>' +
                '<td class="px-4 py-3">' + ytdIstV + '</td>' +
                '<td class="px-4 py-3">' + window.mktProgressBar(pct, 6) + ' <span class="text-xs text-gray-500 ml-1">' + pct + '%</span></td>' +
                '<td class="px-4 py-3">' + window.mktStatusPill(pct) + '</td></tr>';
        });
        html += '</tbody></table></div></div>';
    }

    // Live-Leads mit Filter (PAKET 1: UPGRADE)
    html += '<div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200 flex justify-between items-center flex-wrap gap-2">' +
        '<div class="flex items-center gap-2"><h3 class="text-sm font-semibold text-gray-800">\ud83d\udccb Live-Leads</h3>' +
        '<span id="hqMktLeadCount" class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"></span></div>' +
        '<div class="flex items-center gap-2"><button onclick="mktSortLeads()" class="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">\u2195 Neueste zuerst</button>' +
        '<button onclick="loadLiveLeads()" class="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">\u21bb Aktualisieren</button></div></div>' +
        '<div class="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-2">' +
        '<select id="hqLeadStandortFilter" onchange="loadLiveLeads()" class="text-xs px-2 py-1 border border-gray-200 rounded bg-white">' +
        '<option value="">\ud83d\udccd Alle Standorte</option></select>' +
        '<select id="hqLeadMonatFilter" onchange="loadLiveLeads()" class="text-xs px-2 py-1 border border-gray-200 rounded bg-white">' +
        '<option value="">\ud83d\udcc5 Alle Monate</option>';
    var MNF = window.MKT_MONTH_NAMES_FULL;
    for (var mi = 0; mi < 12; mi++) {
        html += '<option value="' + (mi + 1) + '">' + MNF[mi] + '</option>';
    }
    html += '</select>' +
        '<input type="text" id="hqLeadSearch" oninput="loadLiveLeads()" placeholder="\ud83d\udd0d Suche nach Name, E-Mail, PLZ..." class="text-xs px-3 py-1 border border-gray-200 rounded bg-white flex-1 min-w-[200px]">' +
        '</div>' +
        '<div id="hqMktLiveLeads"><div class="p-5 text-sm text-gray-400 text-center">Lade aktuelle Leads...</div></div></div>';

    el.innerHTML = html;

    // Standort-Filter Optionen befuellen
    var standortSelect = document.getElementById('hqLeadStandortFilter');
    if (standortSelect && window.mktState.standorte) {
        window.mktState.standorte.forEach(function(s) {
            var opt = document.createElement('option');
            opt.value = s.id; opt.textContent = s.name;
            standortSelect.appendChild(opt);
        });
    }

    // Live-Leads laden
    loadLiveLeads();

    // Charts rendern
    setTimeout(function() {
        renderLeadCharts(tracking, vbs, totalZiel, zielMonat, m, leadType);
    }, 50);
}

function renderLeadCharts(tracking, vbs, totalZiel, zielMonat, m, leadType) {
    var MN = window.MKT_MONTH_NAMES;
    var C = window.MKT_CHART_COLORS;
    var W = window.MKT_SEASON_WEIGHTS;

    // Monatliche Uebersicht (Soll vs Ist)
    var sollData = MN.map(function(_, i) { return Math.round(totalZiel * W[i] / 100); });
    var istData = MN.map(function(_, i) {
        var mT = tracking.filter(function(t) { return t.monat === (i + 1); });
        if (leadType === 'kombi') return mT.reduce(function(s,t) { return s + Number(t.leads_ist || 0); }, 0);
        if (leadType === 'regulaer') return mT.reduce(function(s,t) { return s + Number(t.leads_ist || 0) - Number(t.store_visits_ist || 0); }, 0);
        if (leadType === 'store_visits') return mT.reduce(function(s,t) { return s + Math.round(Number(t.store_visits_ist || 0) * 0.25); }, 0);
        return mT.reduce(function(s,t) { return s + Number(t.store_visits_ist || 0); }, 0);
    });
    window.mktMakeChart('hqMktLeadChart', {
        type: 'bar',
        data: { labels: MN, datasets: [
            { label: 'Soll', data: sollData, backgroundColor: 'rgba(209,213,219,.4)', borderRadius: 6, order: 2 },
            { label: 'Ist', data: istData, backgroundColor: C.orange, borderRadius: 6, order: 1 }
        ] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, usePointStyle: true, padding: 16 } }, annotation: { annotations: { currentMonth: { type: 'line', xMin: m.month - 1, xMax: m.month - 1, borderColor: '#EF4444', borderWidth: 1, borderDash: [4, 4] } } } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' } } } }
    });

    // Zielerreichung Multi-Line Chart (NEUES FEATURE)
    var canvas = document.getElementById('hqMktZielerreichungChart');
    if (canvas && vbs.length > 1) {
        var colors = [C.orange, C.blue, C.green, '#8B5CF6', '#EC4899', '#EAB308', '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#F43F5E', '#0EA5E9', '#A855F7', '#D946EF', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#22C55E'];
        var datasets = vbs.slice(0, 22).map(function(v, vi) {
            var sName = v.standorte ? v.standorte.name : 'Standort ' + vi;
            var data = MN.map(function(_, i) {
                var monat = i + 1;
                if (monat > m.month) return null;
                var soll = Math.round((v.max_leads || 0) * W[i] / 100);
                var ist = tracking.filter(function(t) { return t.standort_id === v.standort_id && t.monat === monat; })
                    .reduce(function(s,t) { return s + Number(t.leads_ist || 0); }, 0);
                return soll > 0 ? Math.round(ist / soll * 100) : 0;
            });
            return { label: sName, data: data, borderColor: colors[vi % colors.length], backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 2, tension: 0.3 };
        });
        // 100% reference line
        datasets.push({ label: '100% Ziel', data: MN.map(function() { return 100; }), borderColor: '#EF4444', borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, fill: false });

        window.mktMakeChart('hqMktZielerreichungChart', {
            type: 'line',
            data: { labels: MN, datasets: datasets },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, usePointStyle: true, padding: 8, boxWidth: 8 } } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' }, ticks: { callback: function(v) { return v + '%'; } } } } }
        });
    }
}

function mktSortLeads() {
    window.mktState._leadSortAsc = !window.mktState._leadSortAsc;
    loadLiveLeads();
}

// Lead-Typen-Toggle (Feature 13)
function mktSetLeadType(btnEl, type) {
    // Update pill active states
    var pills = btnEl.parentElement.querySelectorAll('.mkt-lead-pill');
    pills.forEach(function(p) { p.classList.remove('active'); });
    btnEl.classList.add('active');

    // Speichern und Tab neu rendern mit Filter
    window.mktState._leadType = type;
    renderHqMktTabContent('leadReporting');
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

    // Dark Section - Budget Summary (Feature 15: Dark-Theme)
    html += '<div class="dark-section"><div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Budget Summary</div>' +
        '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">';
    [{ l: 'Jahresbudget', v: _fmtEur(totalBudget), s: vbs.length + ' aktive Standorte', c: 'text-vit-orange' },
     { l: 'YTD Ausgaben', v: _fmtEur(totalSpend), s: (totalBudget > 0 ? Math.round(totalSpend / totalBudget * 100) : 0) + '% des Jahresbudgets' },
     { l: '\u00d8 Monatlich', v: _fmtEur(avgMonthly), s: '\u00d8 ' + _fmtEur(vbs.length > 0 ? Math.round(avgMonthly / vbs.length) : 0) + ' pro Standort' },
     { l: 'Channel Split', v: splitPct + '/' + (100 - splitPct), s: 'Google / Meta' }
    ].forEach(function(k) {
        html += '<div class="dark-card"><div class="text-xs text-gray-400">' + k.l + '</div>' +
            '<div class="text-xl font-bold mt-1 ' + (k.c || 'text-white') + '">' + k.v + '</div>' +
            '<div class="text-xs text-gray-500 mt-1">' + k.s + '</div></div>';
    });
    html += '</div></div>';

    // Channel Budget Overview Cards (NEUES FEATURE)
    var mMonth = window.mktGetCurrentMonth();
    var daysInMonth = new Date(mMonth.year, mMonth.month, 0).getDate();
    var daysPassed = Math.min(new Date().getDate(), daysInMonth);
    var googleMonthBudget = Math.round(totalBudget / 12 * (splitPct / 100));
    var metaMonthBudget = Math.round(totalBudget / 12 * ((100 - splitPct) / 100));
    var googleHochr = daysPassed > 0 ? Math.round(googleSpend / daysPassed * daysInMonth) : 0;
    var metaHochr = daysPassed > 0 ? Math.round(metaSpend / daysPassed * daysInMonth) : 0;
    var googlePct = googleMonthBudget > 0 ? Math.round(googleSpend / googleMonthBudget * 100) : 0;
    var metaPct = metaMonthBudget > 0 ? Math.round(metaSpend / metaMonthBudget * 100) : 0;

    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">';
    // Google Card
    html += '<div class="vit-card p-5 border-l-4 border-yellow-500"><div class="flex justify-between items-start mb-3">' +
        '<div class="text-sm font-bold text-gray-800">\ud83d\udfe0 Google Ads (' + splitPct + '% Split)</div></div>' +
        '<div class="text-xs text-gray-500 mb-1">Budget ' + window.MKT_MONTH_NAMES_FULL[mMonth.month - 1] + ':</div>' +
        '<div class="text-xl font-bold text-yellow-600 mb-2">' + _fmtEur(googleMonthBudget) + '</div>' +
        '<div class="text-xs text-gray-500">Ausgegeben: <strong>' + _fmtEur(Math.round(googleSpend)) + '</strong></div>' +
        '<div class="text-xs text-gray-500">\u2192 Hochrechnung: <strong>~' + _fmtEur(googleHochr) + '</strong></div>' +
        '<div class="mt-3">' + window.mktProgressBar(googlePct, 6) + '</div>' +
        '<div class="text-[10px] text-gray-400 mt-1">' + googlePct + '% verbraucht (' + daysPassed + '/' + daysInMonth + ' Tage)</div></div>';
    // Meta Card
    html += '<div class="vit-card p-5 border-l-4 border-blue-500"><div class="flex justify-between items-start mb-3">' +
        '<div class="text-sm font-bold text-gray-800">\ud83d\udfe6 Meta Ads (' + (100 - splitPct) + '% Split)</div></div>' +
        '<div class="text-xs text-gray-500 mb-1">Budget ' + window.MKT_MONTH_NAMES_FULL[mMonth.month - 1] + ':</div>' +
        '<div class="text-xl font-bold text-blue-600 mb-2">' + _fmtEur(metaMonthBudget) + '</div>' +
        '<div class="text-xs text-gray-500">Ausgegeben: <strong>' + _fmtEur(Math.round(metaSpend)) + '</strong></div>' +
        '<div class="text-xs text-gray-500">\u2192 Hochrechnung: <strong>~' + _fmtEur(metaHochr) + '</strong></div>' +
        '<div class="mt-3">' + window.mktProgressBar(metaPct, 6) + '</div>' +
        '<div class="text-[10px] text-gray-400 mt-1">' + metaPct + '% verbraucht (' + daysPassed + '/' + daysInMonth + ' Tage)</div></div>';
    html += '</div>';

    // Budget pro Standort Tabelle (Mockup-Spalten: Standort, Status, Monatsbudget, Ausgegeben%, Hochrechnung, Google, Meta)
    if (vbs.length > 0) {
        html += '<div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Budget pro Standort</h3></div>' +
            '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50">' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Standort</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Monatsbudget</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Ausgegeben %</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Hochrechnung</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Google</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Meta</th>' +
            '</tr></thead><tbody class="divide-y divide-gray-100">';

        vbs.forEach(function(v) {
            var sName = v.standorte ? v.standorte.name : '\u2013';
            var monatsBudget = Math.round(v.budget_jahr / 12);
            // Standort-spezifische Ausgaben aus ads
            var sAds = ads.filter(function(a) { return a.standort_id === v.standort_id; });
            var sSpend = sAds.reduce(function(s,a) { return s + Number(a.ausgaben || 0); }, 0);
            var spentPct = monatsBudget > 0 ? Math.round(sSpend / monatsBudget * 100) : 0;
            var hochrechnung = monatsBudget > 0 ? Math.round(sSpend * 30 / Math.max(1, new Date().getDate())) : 0;
            var sGoogle = sAds.filter(function(a) { return (a.plattform||'').toLowerCase().indexOf('google') >= 0; }).reduce(function(s,a) { return s + Number(a.ausgaben || 0); }, 0);
            var sMeta = sAds.filter(function(a) { var p=(a.plattform||'').toLowerCase(); return p.indexOf('meta')>=0||p.indexOf('facebook')>=0||p.indexOf('instagram')>=0; }).reduce(function(s,a) { return s + Number(a.ausgaben || 0); }, 0);
            var statusCls = spentPct < 50 ? 'bg-red-100 text-red-700' : spentPct > 110 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
            var statusTxt = spentPct < 50 ? 'Unter' : spentPct > 110 ? '\u00dcber' : 'OK';
            html += '<tr class="hover:bg-gray-50"><td class="px-4 py-3 font-semibold">' + _escH(sName) + '</td>' +
                '<td class="px-4 py-3"><span class="text-xs px-2 py-1 rounded-full font-semibold ' + statusCls + '">' + statusTxt + '</span></td>' +
                '<td class="px-4 py-3">' + _fmtEur(monatsBudget) + '</td>' +
                '<td class="px-4 py-3">' + spentPct + '%</td>' +
                '<td class="px-4 py-3">' + _fmtEur(hochrechnung) + '</td>' +
                '<td class="px-4 py-3">' + _fmtEur(Math.round(sGoogle)) + '</td>' +
                '<td class="px-4 py-3">' + _fmtEur(Math.round(sMeta)) + '</td></tr>';
        });
        html += '</tbody></table></div></div>';
    }

    // Spending Trend + Channel-Split (2 normale Charts)
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Spending Trend \u2013 Tagesausgaben</div>' +
        '<div style="height:250px"><canvas id="mktSpendTrendDaily"></canvas></div></div>' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Channel-Split pro Monat</div>' +
        '<div style="height:250px"><canvas id="mktChannelSplit"></canvas></div></div></div>';

    // Spending Trend Dual in dark-section mit KPI-Cards (Mockup-Struktur)
    html += '<div class="dark-section"><div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">\ud83d\udcc8 Spending Trend \u2013 Google vs. Meta (t\u00e4glich)</div>' +
        '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">' +
        '<div class="dark-card"><div class="text-xs text-gray-400">Google Ads</div>' +
        '<div class="text-xl font-bold mt-1" style="color:#EAB308">' + _fmtEur(Math.round(googleSpend)) + '</div>' +
        '<div class="text-xs text-gray-500 mt-1">' + splitPct + '% Split \u00b7 YTD</div></div>' +
        '<div class="dark-card"><div class="text-xs text-gray-400">Meta Ads</div>' +
        '<div class="text-xl font-bold mt-1" style="color:#3B82F6">' + _fmtEur(Math.round(metaSpend)) + '</div>' +
        '<div class="text-xs text-gray-500 mt-1">' + (100 - splitPct) + '% Split \u00b7 YTD</div></div></div>' +
        '<div style="height:200px"><canvas id="mktSpendTrendDual"></canvas></div></div>';

    // Budget Edit Button
    html += '<div class="flex justify-end mb-4"><button onclick="mktOpenBudgetEditModal()" class="text-sm px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 transition font-semibold">\u270f\ufe0f Budgets bearbeiten</button></div>';

    // Budget Edit Modal (hidden)
    html += '<div id="mktBudgetEditModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="if(event.target===this)this.classList.add(&quot;hidden&quot;)">' +
        '<div class="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">' +
        '<div class="flex justify-between items-center mb-4"><h3 class="text-lg font-bold text-gray-800">Jahresbudgets bearbeiten</h3>' +
        '<button onclick="document.getElementById(&quot;mktBudgetEditModal&quot;).classList.add(&quot;hidden&quot;)" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>' +
        '<select id="mktBudgetEditStandort" onchange="mktLoadBudgetForStandort(this.value)" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4">' +
        '<option value="">Standort ausw\u00e4hlen...</option></select>' +
        '<div id="mktBudgetEditFields"></div>' +
        '<button onclick="mktSaveBudgetEdit()" class="w-full mt-4 px-4 py-3 bg-vit-orange text-white rounded-lg font-semibold hover:bg-orange-600 transition">\ud83d\udcbe \u00c4nderungen speichern</button>' +
        '</div></div>';

    // E-Mail-Benachrichtigungen (Mockup: Email-Adressen anzeigen)
    html += '<div class="vit-card p-5 mb-6 border-l-4 border-vit-orange">' +
        '<div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">\u2709\ufe0f Email-Benachrichtigungen</div>' +
        '<p class="text-sm text-gray-500 mb-3">Diese Personen werden per E-Mail benachrichtigt, wenn ein Standort das Budget \u00fcberschritten oder unterschritten hat:</p>' +
        '<div class="flex flex-wrap gap-2">' +
        '<span class="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-semibold">HQ-Admin E-Mail</span>' +
        '<span class="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-semibold">Marketing E-Mail</span>' +
        '</div></div>';

    el.innerHTML = html;

    // Charts rendern
    setTimeout(function() {
        renderSpendingTrendDual(ads);
        renderBudgetDailyCharts(ads);
    }, 50);
}

function renderBudgetDailyCharts(ads) {
    var C = window.MKT_CHART_COLORS;
    // Daily Spending Trend (alle Plattformen zusammen)
    var labels = [];
    var dailyTotal = {};
    var today = new Date();
    for (var i = 27; i >= 0; i--) {
        var d = new Date(today);
        d.setDate(d.getDate() - i);
        var key = d.toISOString().slice(0, 10);
        labels.push(d.getDate() + '.' + (d.getMonth() + 1) + '.');
        dailyTotal[key] = 0;
    }
    ads.forEach(function(a) {
        if (!a.datum) return;
        var key = a.datum.slice(0, 10);
        if (dailyTotal[key] !== undefined) dailyTotal[key] += Number(a.ausgaben || 0);
    });
    var totalData = Object.keys(dailyTotal).sort().map(function(k) { return Math.round(dailyTotal[k] * 100) / 100; });
    window.mktChartLine('mktSpendTrendDaily', labels, [
        { label: 'Tagesausgaben', data: totalData, borderColor: C.orange, backgroundColor: 'rgba(249,115,22,.1)', fill: true }
    ]);

    // Channel-Split Doughnut
    var gSpend = 0, mSpend = 0;
    ads.forEach(function(a) {
        var p = (a.plattform || '').toLowerCase();
        if (p.indexOf('meta') >= 0 || p.indexOf('facebook') >= 0 || p.indexOf('instagram') >= 0) mSpend += Number(a.ausgaben || 0);
        else gSpend += Number(a.ausgaben || 0);
    });
    window.mktChartDoughnut('mktChannelSplit', ['Google Ads', 'Meta Ads'], [Math.round(gSpend), Math.round(mSpend)], ['#EAB308', '#3B82F6']);
}

function renderSpendingTrendDual(ads) {
    // Letzte 28 Tage Labels generieren
    var labels = [];
    var googleByDay = {};
    var metaByDay = {};
    var today = new Date();
    for (var i = 27; i >= 0; i--) {
        var d = new Date(today);
        d.setDate(d.getDate() - i);
        var key = d.toISOString().slice(0, 10);
        labels.push(d.getDate() + '.' + (d.getMonth() + 1) + '.');
        googleByDay[key] = 0;
        metaByDay[key] = 0;
    }

    // Ads nach Tag und Plattform aggregieren
    ads.forEach(function(a) {
        if (!a.datum) return;
        var key = a.datum.slice(0, 10);
        var p = (a.plattform || '').toLowerCase();
        if (p.indexOf('meta') >= 0 || p.indexOf('facebook') >= 0 || p.indexOf('instagram') >= 0) {
            if (metaByDay[key] !== undefined) metaByDay[key] += Number(a.ausgaben || 0);
        } else {
            if (googleByDay[key] !== undefined) googleByDay[key] += Number(a.ausgaben || 0);
        }
    });

    var googleData = Object.keys(googleByDay).sort().map(function(k) { return Math.round(googleByDay[k] * 100) / 100; });
    var metaData = Object.keys(metaByDay).sort().map(function(k) { return Math.round(metaByDay[k] * 100) / 100; });

    window.mktChartLine('mktSpendTrendDual', labels, [
        { label: 'Google Ads', data: googleData, borderColor: '#EAB308', backgroundColor: 'rgba(234,179,8,.1)', fill: true },
        { label: 'Meta Ads', data: metaData, borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,.1)', fill: true }
    ]);
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


// ── Budget Edit Modal Functions ──

function mktOpenBudgetEditModal() {
    var modal = document.getElementById('mktBudgetEditModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    var sel = document.getElementById('mktBudgetEditStandort');
    if (sel) {
        sel.innerHTML = '<option value="">Standort ausw\u00e4hlen...</option>';
        (window.mktState.vereinbarungen || []).forEach(function(v) {
            var name = v.standorte ? v.standorte.name : '\u2013';
            sel.innerHTML += '<option value="' + v.standort_id + '">' + _escH(name) + '</option>';
        });
    }
    document.getElementById('mktBudgetEditFields').innerHTML = '<p class="text-sm text-gray-400 text-center py-8">Bitte Standort ausw\u00e4hlen</p>';
}

function mktLoadBudgetForStandort(standortId) {
    var fields = document.getElementById('mktBudgetEditFields');
    if (!fields || !standortId) { if (fields) fields.innerHTML = '<p class="text-sm text-gray-400 text-center py-8">Bitte Standort ausw\u00e4hlen</p>'; return; }
    var vb = (window.mktState.vereinbarungen || []).find(function(v) { return v.standort_id === standortId; });
    if (!vb) { fields.innerHTML = '<p class="text-sm text-gray-400 text-center">Keine Vereinbarung gefunden</p>'; return; }
    var W = vb.saison_gewichtung || window.MKT_SEASON_WEIGHTS;
    var MNF = window.MKT_MONTH_NAMES_FULL;
    var html = '<div class="flex justify-between items-center mb-3"><span class="text-sm text-gray-500">Jahresbudget:</span><span class="text-lg font-bold text-vit-orange">' + window.mktFmtEur(vb.budget_jahr) + '</span></div>';
    html += '<div class="grid grid-cols-2 gap-3">';
    MNF.forEach(function(name, i) {
        var mBudget = Math.round(vb.budget_jahr * W[i] / 100);
        html += '<div><label class="text-xs text-gray-500">' + name + '</label>' +
            '<input type="number" id="mktBudgetM' + (i+1) + '" value="' + mBudget + '" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mt-1" /></div>';
    });
    html += '</div>';
    fields.innerHTML = html;
}

async function mktSaveBudgetEdit() {
    var standortId = document.getElementById('mktBudgetEditStandort').value;
    if (!standortId) { if (typeof window.showToast === 'function') window.showToast('Bitte Standort ausw\u00e4hlen', 'error'); return; }
    var vb = (window.mktState.vereinbarungen || []).find(function(v) { return v.standort_id === standortId; });
    if (!vb) return;
    // Neue Gewichtung berechnen
    var newWeights = [];
    var totalBudget = 0;
    for (var i = 1; i <= 12; i++) {
        var el = document.getElementById('mktBudgetM' + i);
        totalBudget += Number(el ? el.value : 0);
    }
    for (var i = 1; i <= 12; i++) {
        var el = document.getElementById('mktBudgetM' + i);
        var val = Number(el ? el.value : 0);
        newWeights.push(totalBudget > 0 ? Math.round(val / totalBudget * 100) : Math.round(100/12));
    }
    try {
        var sb = _sb();
        var { error } = await sb.from('marketing_vereinbarungen').update({
            saison_gewichtung: newWeights,
            budget_jahr: totalBudget
        }).eq('standort_id', standortId).eq('jahr', window.mktState.selectedYear || new Date().getFullYear());
        if (error) throw error;
        if (typeof window.showToast === 'function') window.showToast('Budget gespeichert!', 'success');
        document.getElementById('mktBudgetEditModal').classList.add('hidden');
        window.mktState._hqDataLoaded = false;
        renderHqMktTabContent('budgetPlan');
    } catch(e) {
        if (typeof window.showToast === 'function') window.showToast('Fehler: ' + e.message, 'error');
    }
}

// ── Window Exports ──
window.renderHqMarketing = renderHqMarketing;
window.renderHqMktTabContent = renderHqMktTabContent;
window.showHqMktTab = showHqMktTab;
window.mktHqFilterTable = mktHqFilterTable;
window.mktHqDownloadPDF = mktHqDownloadPDF;
window.mktSetLeadType = mktSetLeadType;
window.mktSortLeads = mktSortLeads;
window.mktOpenBudgetEditModal = mktOpenBudgetEditModal;
window.mktLoadBudgetForStandort = mktLoadBudgetForStandort;
window.mktSaveBudgetEdit = mktSaveBudgetEdit;
window.loadLiveLeads = loadLiveLeads;


})();
