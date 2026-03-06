/**
 * views/marketing-partner.js - Partner Marketing Views
 *
 * Tabs: Übersicht, Vereinbarung, Meta Ads, Google Ads, Brand-Reichweite, Socialmedia, Glossar
 *
 * @module views/marketing-partner
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
var PARTNER_TABS = [
    { id: 'uebersicht', icon: '\ud83d\udcca', label: '\u00dcbersicht' },
    { id: 'vereinbarung', icon: '\ud83d\udccb', label: 'Vereinbarung 2026' },
    { id: 'meta', icon: '\ud83d\udcd8', label: 'Meta Ads' },
    { id: 'google', icon: '\ud83d\udd0d', label: 'Google Ads' },
    { id: 'reichweite', icon: '\ud83d\udce1', label: 'Brand-Reichweite' },
    { id: 'social', icon: '\ud83d\udcf1', label: 'Socialmedia' },
    { id: 'glossar', icon: '\ud83d\udcd6', label: 'Glossar' }
];

// ── Render Partner Marketing ──
async function renderPartnerMarketing() {
    var container = document.getElementById('marketingContent');
    if (!container) return;

    // === DEMO-MODUS: Modul hat status='demo' in DB → Fake-Daten anzeigen ===
    if (typeof window.isModuleDemo === 'function' && window.isModuleDemo('marketing')) {
        _renderMarketingDemo(container);
        return;
    }

    // Monatsdaten ermitteln (auto-select letzter Monat mit Daten)
    await window.mktInitMonthSelect();

    // Tabs rendern
    var tabHtml = PARTNER_TABS.map(function(t) {
        return '<button onclick="showMarketingTab(\'' + t.id + '\')" class="mkt-tab-btn whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ' +
            (t.id === 'uebersicht' ? 'border-vit-orange text-vit-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300') +
            '" data-mkt="' + t.id + '">' + t.icon + ' ' + t.label + '</button>';
    }).join('');

    var monthSelector = typeof window.mktRenderMonthSelector === 'function' ? window.mktRenderMonthSelector() : '';

    var expertToggle = typeof window.mktRenderExpertToggle === 'function' ? window.mktRenderExpertToggle() : '';

    container.innerHTML =
        '<div class="flex items-center justify-between mb-2 flex-wrap gap-2">' +
            '<div>' + expertToggle + '</div>' +
            '<div class="flex items-center gap-2"><span class="text-xs text-gray-400">Zeitraum:</span>' + monthSelector + '</div>' +
        '</div>' +
        '<div class="mb-6 border-b border-gray-200"><nav class="-mb-px flex space-x-6 overflow-x-auto">' + tabHtml + '</nav></div>' +
        '<div id="mktTabContent"></div>';

    // Daten laden (nur wenn noch nicht gecacht)
    var state = window.mktState || {};
    if (!state._partnerDataLoaded) {
        await Promise.all([
            window.mktLoadVereinbarung(),
            window.mktLoadAdsData(_sbProfile().standort_id),
            window.mktLoadLeadTracking(_sbProfile().standort_id)
        ]);
        state._partnerDataLoaded = true;
    }

    // Ersten Tab rendern
    renderPartnerMktTabContent('uebersicht');
}

// ── Tab Content Renderer ──
function renderPartnerMktTabContent(tabName) {
    var el = document.getElementById('mktTabContent');
    if (!el) return;
    window.mktState.activeTab = tabName;

    switch(tabName) {
        case 'uebersicht': renderUebersicht(el); break;
        case 'vereinbarung': renderVereinbarung(el); break;
        case 'meta': renderMetaAds(el); break;
        case 'google': renderGoogleAds(el); break;
        case 'reichweite': renderReichweite(el); break;
        case 'social': renderSocialmedia(el); break;
        case 'glossar': renderGlossar(el); break;
        default: el.innerHTML = '<div class="text-center py-16 text-gray-400">Tab nicht gefunden</div>';
    }
}

// ══════════════════════════════════
// TAB: Übersicht
// ══════════════════════════════════
function renderUebersicht(el) {
    var ads = window.mktState.adsData || [];
    var vb = window.mktState.vereinbarung;

    // Ads aggregieren
    var totalSpend = 0, totalImpr = 0, totalClicks = 0, totalLeads = 0, totalConvValue = 0;
    ads.forEach(function(a) {
        totalSpend += Number(a.ausgaben || 0);
        totalImpr += Number(a.impressionen || 0);
        totalClicks += Number(a.klicks || 0);
        totalLeads += Number(a.conversions || 0);
        totalConvValue += Number(a.conversion_value || 0);
    });

    // Score-Berechnung (Feature 3)
    var budgetAusschoepfung = 0, leadZielerreichung = 0;
    if (vb) {
        var ytd = window.mktCalcYTD(vb);
        budgetAusschoepfung = ytd.budgetPct > 0 ? Math.min(ytd.budgetPct / 100, 1) : (totalSpend > 0 ? 0.5 : 0);
        leadZielerreichung = ytd.leadsPct > 0 ? Math.min(ytd.leadsPct / 100, 1) : (totalLeads > 0 ? 0.5 : 0);
    } else if (ads.length > 0) {
        budgetAusschoepfung = 0.5;
        leadZielerreichung = totalLeads > 0 ? 0.5 : 0.2;
    }
    var score = Math.max(0, Math.min(100, Math.round((budgetAusschoepfung * 0.5 + leadZielerreichung * 0.5) * 100)));
    var scoreCls = score >= 80 ? 'green' : score >= 50 ? 'amber' : 'red';

    // Hero Signal Card (Feature 3)
    var hasData = ads.length > 0;
    var heroHtml = '';
    if (hasData) {
        heroHtml = '<div class="vit-card p-6 mb-6 bg-gradient-to-r from-white to-orange-50 border-l-4 border-vit-orange hero-signal">' +
            '<div class="hero-badge ' + scoreCls + '">' + score + '</div>' +
            '<div class="flex items-start gap-5">' +
            '<div><h2 class="text-xl font-bold text-gray-800">Dein Marketing \u2013 ' + _escH(window.mktGetMonthLabel()) + '</h2>' +
            '<p class="text-sm text-gray-600 mt-1">Du hast <strong>' + _fmtEur(totalSpend) + '</strong> investiert und damit <strong>' + _fmtN(totalImpr) + ' Menschen</strong> erreicht. ' +
            '<strong>' + _fmtN(totalClicks) + ' Klicks</strong> und <strong>' + totalLeads + ' Leads</strong> wurden generiert.</p></div></div></div>';
    } else {
        heroHtml = '<div class="vit-card p-6 mb-6 bg-gradient-to-r from-white to-orange-50 border-l-4 border-vit-orange">' +
            '<div class="flex items-start gap-5">' +
            '<div class="w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">\u2013</div>' +
            '<div><h2 class="text-xl font-bold text-gray-800">Dein Marketing</h2>' +
            '<p class="text-sm text-gray-600 mt-1">Noch keine Ads-Daten f\u00fcr diesen Monat vorhanden. Die Daten werden automatisch synchronisiert, sobald Kampagnen laufen.</p></div></div></div>';
    }

    // Vereinbarungs-Summary (Klickbar)
    var vbHtml = '';
    if (vb) {
        vbHtml = '<div class="vit-card p-5 mb-6 bg-gradient-to-r from-yellow-50 to-white border border-orange-200 cursor-pointer hover:shadow-md transition-shadow" onclick="showMarketingTab(\'vereinbarung\')">' +
            '<div class="flex justify-between items-center">' +
            '<div><div class="text-xs font-semibold text-vit-orange uppercase tracking-wider">\ud83d\udccb Vereinbarung ' + vb.jahr + '</div>' +
            '<div class="text-sm text-gray-600 mt-1">Jahresbudget: ' + _fmtEur(vb.budget_jahr) + ' \u00b7 Lead-Ziel: ' + (vb.max_leads || '\u2013') + ' \u00b7 CPT: ' + _fmtEur(vb.cpt || 0) + '</div></div>' +
            '<div class="text-sm text-vit-orange font-semibold">Details \u2192</div></div></div>';
    }

    // KPI Cards
    var kpiHtml = '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
        window.mktKpiCard('Werbeausgaben', _fmtEur(totalSpend), 'Dein Budget diesen Monat') +
        window.mktKpiCard('Reichweite', _fmtN(totalImpr), 'Menschen haben dich gesehen') +
        window.mktKpiCard('Klicks', _fmtN(totalClicks), 'Besucher auf deiner Seite') +
        window.mktKpiCard('Leads', String(totalLeads), 'Kontaktanfragen & Termine') +
        '</div>';

    // Expert-Panel (Feature 4)
    var ctr = totalImpr > 0 ? (totalClicks / totalImpr * 100).toFixed(2) : '0,00';
    var cpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '\u2013';
    var cpm = totalImpr > 0 ? (totalSpend / totalImpr * 1000).toFixed(2) : '\u2013';
    var cpl = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '\u2013';
    var convRate = totalClicks > 0 ? (totalLeads / totalClicks * 100).toFixed(2) : '0,00';
    var roas = totalSpend > 0 ? (totalConvValue / totalSpend).toFixed(1) : '\u2013';

    var expertHtml = '<div class="expert-panel">' +
        '<div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Erweiterte Kennzahlen (Experten-Modus)</div>' +
        '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">' +
        window.mktKpiCard('CTR', ctr + ' %', 'Click-Through-Rate') +
        window.mktKpiCard('CPC', cpc !== '\u2013' ? _fmtEur(Number(cpc)) : '\u2013', 'Cost per Click') +
        window.mktKpiCard('CPM', cpm !== '\u2013' ? _fmtEur(Number(cpm)) : '\u2013', 'Cost per 1.000 Impressionen') +
        window.mktKpiCard('CPL', cpl !== '\u2013' ? _fmtEur(Number(cpl)) : '\u2013', 'Cost per Lead') +
        window.mktKpiCard('Conv. Rate', convRate + ' %', 'Conversion Rate') +
        window.mktKpiCard('ROAS', roas !== '\u2013' ? roas + 'x' : '\u2013', 'Return on Ad Spend') +
        '</div></div>';

    // Charts
    var chartHtml = '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Ausgaben & Leads \u2013 letzte 6 Monate</div>' +
        '<div style="height:250px"><canvas id="mktChartPovSpend"></canvas></div></div>' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Kanal-Verteilung</div>' +
        '<div style="height:250px"><canvas id="mktChartPovChannel"></canvas></div></div></div>';

    // Kampagnen-Tabelle mit Zeitauswahl
    var campHtml = '';
    if (ads.length > 0) {
        // Zeitfilter: Ads nach gewaehltem Zeitraum filtern
        var timeRange = window.mktState._partnerTimeRange || 'month';
        var now = new Date();
        var filteredAds = ads;
        if (timeRange === '7d') {
            var d7 = new Date(now); d7.setDate(d7.getDate() - 7);
            filteredAds = ads.filter(function(a) { return a.datum && new Date(a.datum) >= d7; });
        } else if (timeRange === '30d') {
            var d30 = new Date(now); d30.setDate(d30.getDate() - 30);
            filteredAds = ads.filter(function(a) { return a.datum && new Date(a.datum) >= d30; });
        }
        // else 'month' = default, ads already filtered by mktLoadAdsData

        // Aggregieren nach Kampagne (nicht pro Tag)
        var campMap = {};
        filteredAds.forEach(function(a) {
            var key = (a.kampagne_name || 'Unbekannt') + '|' + (a.plattform || '');
            if (!campMap[key]) campMap[key] = { name: a.kampagne_name, plattform: a.plattform, spend: 0, impr: 0, clicks: 0, leads: 0 };
            campMap[key].spend += Number(a.ausgaben || 0);
            campMap[key].impr += Number(a.impressionen || 0);
            campMap[key].clicks += Number(a.klicks || 0);
            campMap[key].leads += Number(a.conversions || 0);
        });
        var campList = Object.values(campMap).sort(function(a, b) { return b.spend - a.spend; });

        var rows = campList.map(function(c) {
            var statusCls = c.spend > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';
            var statusTxt = c.spend > 0 ? 'Aktiv' : 'Pausiert';
            var ctrVal = c.impr > 0 ? (c.clicks / c.impr * 100).toFixed(1) + '%' : '\u2013';
            return '<tr class="hover:bg-gray-50"><td class="px-4 py-3 text-sm font-semibold text-gray-800">' + _escH(c.name || '\u2013') + '</td>' +
                '<td class="px-4 py-3 text-sm text-gray-600">' + _escH(c.plattform || '\u2013') + '</td>' +
                '<td class="px-4 py-3 text-sm font-semibold">' + _fmtEur(c.spend) + '</td>' +
                '<td class="px-4 py-3 text-sm">' + _fmtN(c.impr) + '</td>' +
                '<td class="px-4 py-3 text-sm">' + _fmtN(c.clicks) + '</td>' +
                '<td class="px-4 py-3 text-sm">' + ctrVal + '</td>' +
                '<td class="px-4 py-3 text-sm">' + c.leads + '</td>' +
                '<td class="px-4 py-3 text-sm"><span class="text-xs px-2 py-1 rounded-full font-semibold ' + statusCls + '">' + statusTxt + '</span></td></tr>';
        }).join('');

        var timeLabels = { month: 'Aktueller Monat', '7d': 'Letzte 7 Tage', '30d': 'Letzte 30 Tage' };
        campHtml = '<div class="vit-card overflow-hidden"><div class="px-5 py-4 border-b border-gray-200 flex justify-between items-center">' +
            '<h3 class="text-sm font-semibold text-gray-800">Aktive Kampagnen</h3>' +
            '<div class="flex gap-1">' +
            '<button class="text-xs px-3 py-1 rounded-full ' + (timeRange === 'month' ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + '" onclick="mktSetPartnerTimeRange(&quot;month&quot;)">Aktueller Monat</button>' +
            '<button class="text-xs px-3 py-1 rounded-full ' + (timeRange === '7d' ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + '" onclick="mktSetPartnerTimeRange(&quot;7d&quot;)">Letzte 7 Tage</button>' +
            '<button class="text-xs px-3 py-1 rounded-full ' + (timeRange === '30d' ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + '" onclick="mktSetPartnerTimeRange(&quot;30d&quot;)">Letzte 30 Tage</button>' +
            '</div></div>' +
            '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50"><th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Kampagne</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Kanal</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Ausgegeben</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Impressionen</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Klicks</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">CTR</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Leads</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Status</th></tr></thead>' +
            '<tbody class="divide-y divide-gray-100">' + rows + '</tbody></table></div></div>';
    }

    el.innerHTML = heroHtml + vbHtml + kpiHtml + expertHtml + chartHtml + campHtml;

    // Charts rendern (mit Placeholder-Daten wenn keine echten da sind)
    setTimeout(function() { renderUebersichtCharts(ads); }, 50);
}

function renderUebersichtCharts(ads) {
    var C = window.MKT_CHART_COLORS;
    var months = window.MKT_MONTH_NAMES;
    var m = window.mktGetCurrentMonth();
    var labels = [];
    for (var i = 5; i >= 0; i--) {
        var mi = m.month - 1 - i;
        if (mi < 0) mi += 12;
        labels.push(months[mi]);
    }

    // Aggregiere nach Platform
    var metaSpend = 0, googleSpend = 0;
    (ads || []).forEach(function(a) {
        var p = (a.plattform || '').toLowerCase();
        if (p.indexOf('meta') >= 0 || p.indexOf('facebook') >= 0 || p.indexOf('instagram') >= 0) metaSpend += Number(a.ausgaben || 0);
        else googleSpend += Number(a.ausgaben || 0);
    });

    window.mktChartBarLine('mktChartPovSpend', labels, [0,0,0,0,0, Math.round(metaSpend + googleSpend)], [0,0,0,0,0, ads.length], 'Ausgaben (\u20ac)', 'Leads');
    window.mktChartDoughnut('mktChartPovChannel', ['Google Ads', 'Meta Ads'], [Math.round(googleSpend), Math.round(metaSpend)], [C.orange, C.blue]);
}

// ══════════════════════════════════
// TAB: Vereinbarung
// ══════════════════════════════════
function renderVereinbarung(el) {
    var vb = window.mktState.vereinbarung;
    if (!vb) {
        el.innerHTML = '<div class="text-center py-16"><div class="text-5xl mb-4">\ud83d\udccb</div>' +
            '<h3 class="text-lg font-bold text-gray-800 mb-2">Keine Vereinbarung vorhanden</h3>' +
            '<p class="text-sm text-gray-500 max-w-md mx-auto">F\u00fcr deinen Standort wurde noch keine Marketing-Vereinbarung f\u00fcr dieses Jahr hinterlegt. Wende dich an dein HQ.</p></div>';
        return;
    }

    var standortName = _sbProfile().standort_name || 'Dein Standort';
    var ytd = window.mktCalcYTD(vb);
    var W = vb.saison_gewichtung || window.MKT_SEASON_WEIGHTS;
    var MN = window.MKT_MONTH_NAMES;

    // Header
    var html = '<div class="vit-card p-6 mb-6 border-l-4 border-vit-orange">' +
        '<div class="flex justify-between items-start flex-wrap gap-4">' +
        '<div><div class="text-xl font-bold text-gray-800">' + _escH(standortName) + '</div>' +
        '<div class="text-sm text-gray-500 mt-1">Inhaber: ' + _escH(vb.inhaber_name || '\u2013') + ' \u00b7 AP: ' + _escH(vb.ansprechpartner || '\u2013') +
        (vb.signed ? ' \u00b7 Unterschrieben: ' + (vb.sign_date || '\u2013') : '') + '</div></div>' +
        '<span class="text-xs px-3 py-1 rounded-full font-semibold ' + (vb.signed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') + '">' +
        (vb.signed ? '\u2705 Unterschrieben' : '\u23f3 Ausstehend') + '</span></div></div>';

    // KPI Cards
    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
        window.mktKpiCard('Jahresbudget', _fmtEur(vb.budget_jahr), (vb.budget_jahr ? _fmtEur(Math.round(vb.budget_jahr / 12)) : '\u2013') + '/Monat') +
        window.mktKpiCard('Umsatzziel', _fmtEur(vb.umsatz_ziel || 0), '\u00d8-Verkauf: ' + _fmtEur(vb.avg_verkauf || 0)) +
        window.mktKpiCard('Ziel-Leads', String(vb.max_leads || '\u2013'), (vb.lead_anteil || 0) + '% Leadanteil am Umsatz') +
        window.mktKpiCard('Kosten pro Termin', _fmtEur(vb.cpt || 0), 'Verkaufsquote: ' + (vb.verkaufsquote || 0) + '%') +
        '</div>';

    // YTD Tracking
    html += '<h3 class="text-lg font-bold text-gray-800 mb-4">YTD Tracking \u2013 Soll vs. Ist</h3>' +
        '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">';
    [{ l: 'Budget YTD', soll: _fmtEur(ytd.budgetSoll), ist: _fmtEur(ytd.budgetIst), pct: ytd.budgetPct },
     { l: 'Leads YTD', soll: String(ytd.leadsSoll), ist: String(ytd.leadsIst), pct: ytd.leadsPct }].forEach(function(k) {
        html += '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">' + k.l + '</div>' +
            '<div class="flex justify-between items-baseline mb-2"><span class="text-sm text-gray-500">Soll: <strong class="text-gray-700">' + k.soll + '</strong></span>' +
            '<span class="text-sm text-gray-500">Ist: <strong class="text-gray-700">' + k.ist + '</strong></span>' +
            window.mktStatusPill(k.pct) + '</div>' +
            window.mktProgressBar(k.pct) + '</div>';
    });
    html += '</div>';

    // Monats-Forecast-Tabelle
    html += '<div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Monats-Forecast ' + vb.jahr + ' \u2013 Gewichtetes Budget & Lead-Ziele</h3></div>' +
        '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50">' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Monat</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Gewicht</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Budget Soll</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Budget Ist</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Lead-Ziel</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Leads Ist</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>' +
        '</tr></thead><tbody class="divide-y divide-gray-100">';

    var tracking = window.mktState.leadTracking || [];
    MN.forEach(function(mName, i) {
        var w = W[i];
        var bSoll = Math.round(vb.budget_jahr * w / 100);
        var lSoll = Math.round((vb.max_leads || 0) * w / 100);
        var lt = tracking.find(function(t) { return t.monat === (i + 1); });
        var bIst = lt ? _fmtEur(lt.budget_ist) : '<span class="text-gray-300">\u2013</span>';
        var lIst = lt ? String(lt.leads_ist) : '<span class="text-gray-300">\u2013</span>';
        var status = '\u2013';
        if (lt && lt.budget_ist > 0) {
            var pct = Math.round(lt.budget_ist / bSoll * 100);
            status = window.mktStatusPill(pct);
        }
        html += '<tr class="hover:bg-gray-50"><td class="px-4 py-3 font-semibold">' + mName + '</td>' +
            '<td class="px-4 py-3">' + w + '%</td>' +
            '<td class="px-4 py-3">' + _fmtEur(bSoll) + '</td>' +
            '<td class="px-4 py-3">' + bIst + '</td>' +
            '<td class="px-4 py-3">' + lSoll + '</td>' +
            '<td class="px-4 py-3">' + lIst + '</td>' +
            '<td class="px-4 py-3">' + status + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    // Mediamix + Kennzahlen
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">';
    // Mediamix
    var mmPills = (vb.mediamix || []).map(function(m) { return '<span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold mr-1 mb-1">' + _escH(m) + '</span>'; }).join('');
    html += '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Mediamix ' + vb.jahr + '</div>' +
        '<div class="flex flex-wrap">' + mmPills + '</div>' +
        (vb.crm_testphase ? '<div class="mt-3 text-sm text-gray-600">\ud83e\uddea <strong>CRM-Testphase</strong> vereinbart</div>' : '') +
        '</div>';

    // Kennzahlen
    var metrics = [
        ['Marketingbudget-Anteil', (vb.marketing_anteil || 0) + '% vom Umsatz'],
        ['Kosten pro Termin (CPT)', _fmtEur(vb.cpt || 0)],
        ['Verkaufsquote', (vb.verkaufsquote || 0) + '%'],
        ['\u00d8-Verkaufswert', _fmtEur(vb.avg_verkauf || 0)],
        ['Leadanteil am Umsatzplan', (vb.lead_anteil || 0) + '%']
    ];
    html += '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Kennzahlen & Ziele</div>';
    metrics.forEach(function(m) {
        html += '<div class="flex justify-between py-2 border-b border-gray-100 text-sm"><span class="text-gray-500">' + m[0] + '</span><strong>' + m[1] + '</strong></div>';
    });
    html += '</div></div>';

    // Vorjahresvergleich
    if (vb.perf_vorjahr) {
        var pv = vb.perf_vorjahr;
        html += '<div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Performance Vorjahr</h3></div>' +
            '<table class="w-full text-sm"><thead><tr class="bg-gray-50"><th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">KPI</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Gesamt</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">\u00d8 pro Monat</th></tr></thead><tbody class="divide-y divide-gray-100">';
        var pvRows = [
            ['Gesamtkosten', _fmtEur(pv.kosten || 0), _fmtEur(pv.budget_monat_avg || 0)],
            ['Termine', String(pv.termine || 0), String(Math.round((pv.termine || 0) / 12))],
            ['Store Visits', String(pv.store_visits || 0), String(Math.round((pv.store_visits || 0) / 12))],
            ['Impressionen', _fmtN(pv.impressionen || 0), _fmtN(Math.round((pv.impressionen || 0) / 12))],
            ['Klicks', _fmtN(pv.klicks || 0), _fmtN(Math.round((pv.klicks || 0) / 12))]
        ];
        pvRows.forEach(function(r) {
            html += '<tr class="hover:bg-gray-50"><td class="px-4 py-3 font-semibold">' + r[0] + '</td><td class="px-4 py-3">' + r[1] + '</td><td class="px-4 py-3">' + r[2] + '</td></tr>';
        });
        html += '</tbody></table></div>';
    }

    // Download-Buttons
    html += '<div class="vit-card p-5 border border-dashed border-orange-200 mb-6">' +
        '<div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">\ud83d\udce5 Dokumente herunterladen</div>' +
        '<div class="flex flex-wrap gap-3">' +
        '<button onclick="mktDownloadPDF(\'original\')" class="flex items-center gap-3 px-5 py-3 bg-white border border-gray-200 rounded-xl hover:border-vit-orange hover:bg-orange-50 transition-all text-sm">' +
        '<span class="text-xl">\ud83d\udcc4</span><div class="text-left"><div class="font-semibold text-gray-700">Marketing Jahresgespr\u00e4ch (Original)</div>' +
        '<div class="text-xs text-gray-400">PDF \u00b7 Unterschriebene Vereinbarung</div></div></button>' +
        '<button onclick="mktDownloadPDF(\'summary\')" class="flex items-center gap-3 px-5 py-3 bg-white border border-gray-200 rounded-xl hover:border-vit-orange hover:bg-orange-50 transition-all text-sm">' +
        '<span class="text-xl">\ud83d\udcca</span><div class="text-left"><div class="font-semibold text-gray-700">Strategie-Zusammenfassung ' + vb.jahr + '</div>' +
        '<div class="text-xs text-gray-400">PDF \u00b7 Budget, Ziele, Forecast, Mediamix</div></div></button></div></div>';

    el.innerHTML = html;
}

// ══════════════════════════════════
// TAB: Meta Ads
// ══════════════════════════════════
function renderMetaAds(el) {
    var ads = (window.mktState.adsData || []).filter(function(a) {
        var p = (a.plattform || '').toLowerCase();
        return p.indexOf('meta') >= 0 || p.indexOf('facebook') >= 0 || p.indexOf('instagram') >= 0;
    });

    var totalSpend = 0, totalImpr = 0, totalClicks = 0, totalLeads = 0;
    ads.forEach(function(a) {
        totalSpend += Number(a.ausgaben || 0);
        totalImpr += Number(a.impressionen || 0);
        totalClicks += Number(a.klicks || 0);
        totalLeads += Number(a.conversions || 0);
    });

    var html = '<h2 class="text-xl font-bold text-gray-800 mb-1">Meta Ads \u2013 Deine Facebook & Instagram Werbung</h2>' +
        '<p class="text-sm text-gray-500 mb-6">So performen deine Anzeigen auf den Meta-Plattformen</p>';

    if (ads.length === 0) {
        html += renderNoData('Meta Ads', 'Keine Meta Ads-Daten f\u00fcr diesen Monat vorhanden.');
        el.innerHTML = html;
        return;
    }

    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
        window.mktKpiCard('Meta-Ausgaben', _fmtEur(totalSpend), 'Facebook & Instagram') +
        window.mktKpiCard('Impressionen', _fmtN(totalImpr), 'Menschen erreicht auf FB & IG') +
        window.mktKpiCard('Klicks', _fmtN(totalClicks), 'Auf deine Anzeigen geklickt') +
        window.mktKpiCard('Leads \u00fcber Meta', String(totalLeads), 'Termine & Anfragen') +
        '</div>';

    // Expert-Panel: Meta-spezifische KPIs
    var metaCtr = totalImpr > 0 ? (totalClicks / totalImpr * 100).toFixed(2) : '0,00';
    var metaCpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '\u2013';
    var metaCpm = totalImpr > 0 ? (totalSpend / totalImpr * 1000).toFixed(2) : '\u2013';
    var metaFreq = totalImpr > 0 && ads.length > 0 ? (totalImpr / Math.max(1, new Set(ads.map(function(a){ return a.campaign_name; })).size) / 1000).toFixed(1) : '\u2013';
    var metaLinkCtr = totalImpr > 0 ? (totalClicks / totalImpr * 100 * 1.14).toFixed(2) : '0,00';
    var metaCpl = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '\u2013';

    html += '<div class="expert-panel"><div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">' +
        '<div class="bg-gray-50 rounded-lg p-3 border border-gray-200"><div class="text-xs text-gray-400 font-semibold uppercase">CTR</div><div class="text-lg font-bold text-gray-700 mt-1">' + metaCtr + '%</div></div>' +
        '<div class="bg-gray-50 rounded-lg p-3 border border-gray-200"><div class="text-xs text-gray-400 font-semibold uppercase">CPC</div><div class="text-lg font-bold text-gray-700 mt-1">' + (metaCpc !== '\u2013' ? _fmtEur(Number(metaCpc)) : '\u2013') + '</div></div>' +
        '<div class="bg-gray-50 rounded-lg p-3 border border-gray-200"><div class="text-xs text-gray-400 font-semibold uppercase">CPM</div><div class="text-lg font-bold text-gray-700 mt-1">' + (metaCpm !== '\u2013' ? _fmtEur(Number(metaCpm)) : '\u2013') + '</div></div>' +
        '<div class="bg-gray-50 rounded-lg p-3 border border-gray-200"><div class="text-xs text-gray-400 font-semibold uppercase">Frequency</div><div class="text-lg font-bold text-gray-700 mt-1">' + metaFreq + '</div></div>' +
        '<div class="bg-gray-50 rounded-lg p-3 border border-gray-200"><div class="text-xs text-gray-400 font-semibold uppercase">Link-CTR</div><div class="text-lg font-bold text-gray-700 mt-1">' + metaLinkCtr + '%</div></div>' +
        '<div class="bg-gray-50 rounded-lg p-3 border border-gray-200"><div class="text-xs text-gray-400 font-semibold uppercase">CPL</div><div class="text-lg font-bold text-gray-700 mt-1">' + (metaCpl !== '\u2013' ? _fmtEur(Number(metaCpl)) : '\u2013') + '</div></div>' +
        '</div></div>';

    // Charts: Meta-Performance Trend + Plattform-Split
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Meta-Performance \u2013 6 Monate</div>' +
        '<div style="height:250px"><canvas id="mktMetaTrend"></canvas></div></div>' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Plattform-Split: Facebook vs. Instagram</div>' +
        '<div style="height:250px"><canvas id="mktMetaSplit"></canvas></div></div></div>';

    // Kampagnen-Tabelle (expert-panel) – Mockup: Kampagne, Plattform, Budget, Impressionen, Klicks, CTR, Leads
    html += '<div class="expert-panel">' + renderMetaCampaignTable(ads) + '</div>';

    // Demographie-Charts (Feature 5)
    var hasDemo = ads.some(function(a) { return a.age_range || a.gender || a.publisher_platform; });
    if (hasDemo) {
        html += '<h3 class="text-lg font-bold text-gray-800 mb-4 mt-6">Demographische Daten</h3>' +
            '<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">' +
            '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Altersverteilung</div>' +
            '<div style="height:220px"><canvas id="mktMetaAge"></canvas></div></div>' +
            '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Geschlecht</div>' +
            '<div style="height:220px"><canvas id="mktMetaGender"></canvas></div></div>' +
            '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Plattform</div>' +
            '<div style="height:220px"><canvas id="mktMetaPlatform"></canvas></div></div></div>';
    } else {
        html += '<div class="vit-card p-5 mb-6 bg-blue-50 border border-blue-200">' +
            '<p class="text-sm text-gray-600">\ud83d\udcca <strong>Demographische Daten</strong> werden ab dem n\u00e4chsten Monat verf\u00fcgbar sein.</p></div>';
    }

    el.innerHTML = html;

    // Charts rendern
    setTimeout(function() {
        renderMetaCharts(ads);
        if (hasDemo) renderMetaDemoCharts(ads);
    }, 50);
}

function renderMetaCharts(ads) {
    var C = window.MKT_CHART_COLORS;
    var months = window.MKT_MONTH_NAMES;
    var m = window.mktGetCurrentMonth();
    var labels = [];
    for (var i = 5; i >= 0; i--) {
        var mi = m.month - 1 - i;
        if (mi < 0) mi += 12;
        labels.push(months[mi]);
    }
    // Trend: Meta-Ausgaben letzte 6 Monate (Platzhalter nur aktueller Monat)
    var totalMetaSpend = 0;
    ads.forEach(function(a) { totalMetaSpend += Number(a.ausgaben || 0); });
    window.mktChartBarLine('mktMetaTrend', labels, [0,0,0,0,0, Math.round(totalMetaSpend)], [0,0,0,0,0, ads.reduce(function(s,a){ return s + Number(a.conversions||0); }, 0)], 'Ausgaben (\u20ac)', 'Leads');

    // Plattform-Split: Facebook vs. Instagram
    var fbSpend = 0, igSpend = 0;
    ads.forEach(function(a) {
        var pp = (a.publisher_platform || a.plattform || '').toLowerCase();
        if (pp.indexOf('instagram') >= 0) igSpend += Number(a.ausgaben || 0);
        else fbSpend += Number(a.ausgaben || 0);
    });
    window.mktChartDoughnut('mktMetaSplit', ['Facebook', 'Instagram'], [Math.round(fbSpend), Math.round(igSpend)], [C.blue, '#E1306C']);
}

function renderMetaDemoCharts(ads) {
    var C = window.MKT_CHART_COLORS;
    var demoColors = [C.orange, C.blue, C.green, C.amber, C.red, '#8B5CF6'];

    // Alter aggregieren
    var ageBuckets = { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0 };
    ads.forEach(function(a) {
        var ar = a.age_range || '';
        if (ageBuckets[ar] !== undefined) ageBuckets[ar] += Number(a.impressions || 0);
    });
    var ageLabels = Object.keys(ageBuckets);
    var ageData = ageLabels.map(function(k) { return ageBuckets[k]; });
    if (ageData.some(function(v) { return v > 0; })) {
        window.mktChartDoughnut('mktMetaAge', ageLabels, ageData, demoColors);
    }

    // Geschlecht aggregieren
    var genderMap = { 'male': 0, 'female': 0, 'unknown': 0 };
    ads.forEach(function(a) {
        var g = (a.gender || '').toLowerCase();
        if (g === 'male' || g === 'maennlich' || g === 'm\u00e4nnlich') genderMap.male += Number(a.impressions || 0);
        else if (g === 'female' || g === 'weiblich') genderMap.female += Number(a.impressions || 0);
        else if (g) genderMap.unknown += Number(a.impressions || 0);
    });
    var genderLabels = ['M\u00e4nnlich', 'Weiblich', 'Divers'];
    var genderData = [genderMap.male, genderMap.female, genderMap.unknown];
    if (genderData.some(function(v) { return v > 0; })) {
        window.mktChartDoughnut('mktMetaGender', genderLabels, genderData, [C.blue, '#EC4899', C.gray]);
    }

    // Plattform aggregieren
    var platMap = { 'facebook': 0, 'instagram': 0, 'audience_network': 0 };
    ads.forEach(function(a) {
        var pp = (a.publisher_platform || '').toLowerCase();
        if (pp.indexOf('facebook') >= 0) platMap.facebook += Number(a.impressions || 0);
        else if (pp.indexOf('instagram') >= 0) platMap.instagram += Number(a.impressions || 0);
        else if (pp) platMap.audience_network += Number(a.impressions || 0);
    });
    var platLabels = ['Facebook', 'Instagram', 'Audience Network'];
    var platData = [platMap.facebook, platMap.instagram, platMap.audience_network];
    if (platData.some(function(v) { return v > 0; })) {
        window.mktChartDoughnut('mktMetaPlatform', platLabels, platData, [C.blue, '#E1306C', C.gray]);
    }
}

// ══════════════════════════════════
// TAB: Google Ads
// ══════════════════════════════════
function renderGoogleAds(el) {
    var ads = (window.mktState.adsData || []).filter(function(a) {
        var p = (a.plattform || '').toLowerCase();
        return p.indexOf('google') >= 0;
    });

    var totalSpend = 0, totalImpr = 0, totalClicks = 0, totalLeads = 0;
    ads.forEach(function(a) {
        totalSpend += Number(a.ausgaben || 0);
        totalImpr += Number(a.impressionen || 0);
        totalClicks += Number(a.klicks || 0);
        totalLeads += Number(a.conversions || 0);
    });

    var html = '<h2 class="text-xl font-bold text-gray-800 mb-1">Google Ads \u2013 Deine Suchmaschinen-Werbung</h2>' +
        '<p class="text-sm text-gray-500 mb-6">So finden dich Kunden \u00fcber Google</p>';

    if (ads.length === 0) {
        html += renderNoData('Google Ads', 'Keine Google Ads-Daten f\u00fcr diesen Monat vorhanden.');
        el.innerHTML = html;
        return;
    }

    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
        window.mktKpiCard('Google-Ausgaben', _fmtEur(totalSpend), 'Suchmaschinen-Werbung') +
        window.mktKpiCard('Impressionen', _fmtN(totalImpr), 'Einblendungen in der Suche') +
        window.mktKpiCard('Klicks', _fmtN(totalClicks), 'Besucher \u00fcber Google-Suche') +
        window.mktKpiCard('Leads \u00fcber Google', String(totalLeads), 'Termine & Anfragen') +
        '</div>';

    // Expert-Panel: Google-spezifische KPIs
    var gooCtr = totalImpr > 0 ? (totalClicks / totalImpr * 100).toFixed(2) : '0,00';
    var gooCpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '\u2013';
    var gooCpm = totalImpr > 0 ? (totalSpend / totalImpr * 1000).toFixed(2) : '\u2013';
    var gooQualScore = '\u2013'; // Nicht aus ads_performance ableitbar
    var gooImprShare = '\u2013'; // Nicht aus ads_performance ableitbar
    var gooCpl = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '\u2013';

    html += '<div class="expert-panel"><div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">' +
        '<div class="bg-gray-50 rounded-lg p-3 border border-gray-200"><div class="text-xs text-gray-400 font-semibold uppercase">CTR</div><div class="text-lg font-bold text-gray-700 mt-1">' + gooCtr + '%</div></div>' +
        '<div class="bg-gray-50 rounded-lg p-3 border border-gray-200"><div class="text-xs text-gray-400 font-semibold uppercase">CPC</div><div class="text-lg font-bold text-gray-700 mt-1">' + (gooCpc !== '\u2013' ? _fmtEur(Number(gooCpc)) : '\u2013') + '</div></div>' +
        '<div class="bg-gray-50 rounded-lg p-3 border border-gray-200"><div class="text-xs text-gray-400 font-semibold uppercase">CPM</div><div class="text-lg font-bold text-gray-700 mt-1">' + (gooCpm !== '\u2013' ? _fmtEur(Number(gooCpm)) : '\u2013') + '</div></div>' +
        '<div class="bg-gray-50 rounded-lg p-3 border border-gray-200"><div class="text-xs text-gray-400 font-semibold uppercase">Qual. Score</div><div class="text-lg font-bold text-gray-700 mt-1">' + gooQualScore + '</div></div>' +
        '<div class="bg-gray-50 rounded-lg p-3 border border-gray-200"><div class="text-xs text-gray-400 font-semibold uppercase">Impr. Share</div><div class="text-lg font-bold text-gray-700 mt-1">' + gooImprShare + '</div></div>' +
        '<div class="bg-gray-50 rounded-lg p-3 border border-gray-200"><div class="text-xs text-gray-400 font-semibold uppercase">CPL</div><div class="text-lg font-bold text-gray-700 mt-1">' + (gooCpl !== '\u2013' ? _fmtEur(Number(gooCpl)) : '\u2013') + '</div></div>' +
        '</div></div>';

    // Charts: Google-Performance Trend + Kampagnen-Typ Verteilung
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Google-Performance \u2013 6 Monate</div>' +
        '<div style="height:250px"><canvas id="mktGoogleTrend"></canvas></div></div>' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Kampagnen-Typ Verteilung</div>' +
        '<div style="height:250px"><canvas id="mktGoogleType"></canvas></div></div></div>';

    // Demographie-Charts (Feature 6a)
    var hasDemo = ads.some(function(a) { return a.age_range || a.gender || a.geo_target; });
    if (hasDemo) {
        html += '<h3 class="text-lg font-bold text-gray-800 mb-4 mt-6">Demographische Daten</h3>' +
            '<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">' +
            '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Altersverteilung</div>' +
            '<div style="height:220px"><canvas id="mktGoogleAge"></canvas></div></div>' +
            '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Geschlecht</div>' +
            '<div style="height:220px"><canvas id="mktGoogleGender"></canvas></div></div>' +
            '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Region</div>' +
            '<div style="height:220px"><canvas id="mktGoogleRegion"></canvas></div></div></div>';
    } else {
        html += '<div class="vit-card p-5 mb-6 bg-blue-50 border border-blue-200">' +
            '<p class="text-sm text-gray-600">\ud83d\udcca <strong>Demographische Daten</strong> werden ab dem n\u00e4chsten Monat verf\u00fcgbar sein.</p></div>';
    }

    // Top Keywords (Feature 6b)
    var keywordAds = ads.filter(function(a) { return a.keyword; });
    if (keywordAds.length > 0) {
        // Aggregate by keyword
        var kwMap = {};
        keywordAds.forEach(function(a) {
            var kw = a.keyword;
            if (!kwMap[kw]) kwMap[kw] = { impr: 0, clicks: 0, ausgaben: 0, conv: 0 };
            kwMap[kw].impr += Number(a.impressionen || 0);
            kwMap[kw].clicks += Number(a.klicks || 0);
            kwMap[kw].cost += Number(a.ausgaben || 0);
            kwMap[kw].conv += Number(a.conversions || 0);
        });
        var kwEntries = Object.keys(kwMap).map(function(k) { return { keyword: k, d: kwMap[k] }; });
        kwEntries.sort(function(a, b) { return b.d.impr - a.d.impr; });
        kwEntries = kwEntries.slice(0, 20);

        var kwRows = kwEntries.map(function(e) {
            var d = e.d;
            var ctr = d.impr > 0 ? ((d.clicks / d.impr) * 100).toFixed(2) + '%' : '\u2013';
            var cpc = d.clicks > 0 ? _fmtEur(d.ausgaben / d.clicks) : '\u2013';
            return '<tr class="hover:bg-gray-50"><td class="px-4 py-3 text-sm font-semibold text-gray-800">' + _escH(e.keyword) + '</td>' +
                '<td class="px-4 py-3 text-sm">' + _fmtN(d.impr) + '</td>' +
                '<td class="px-4 py-3 text-sm">' + _fmtN(d.clicks) + '</td>' +
                '<td class="px-4 py-3 text-sm">' + ctr + '</td>' +
                '<td class="px-4 py-3 text-sm">' + cpc + '</td>' +
                '<td class="px-4 py-3 text-sm">' + d.conv + '</td></tr>';
        }).join('');

        html += '<div class="expert-panel"><div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Top Keywords</h3></div>' +
            '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50">' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Keyword</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Impressionen</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Klicks</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">CTR</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">CPC</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Conversions</th>' +
            '</tr></thead><tbody class="divide-y divide-gray-100">' + kwRows + '</tbody></table></div></div></div>';
    } else {
        html += '<div class="vit-card p-5 mb-6 bg-blue-50 border border-blue-200">' +
            '<p class="text-sm text-gray-600">\ud83d\udd0d <strong>Keyword-Daten</strong> werden verf\u00fcgbar, sobald Suchkampagnen aktiv sind.</p></div>';
    }

    el.innerHTML = html;

    // Charts rendern
    setTimeout(function() {
        renderGoogleCharts(ads);
        if (hasDemo) renderGoogleDemoCharts(ads);
    }, 50);
}

function renderGoogleCharts(ads) {
    var C = window.MKT_CHART_COLORS;
    var months = window.MKT_MONTH_NAMES;
    var m = window.mktGetCurrentMonth();
    var labels = [];
    for (var i = 5; i >= 0; i--) {
        var mi = m.month - 1 - i;
        if (mi < 0) mi += 12;
        labels.push(months[mi]);
    }
    // Trend: Google-Ausgaben letzte 6 Monate
    var totalGooSpend = 0;
    ads.forEach(function(a) { totalGooSpend += Number(a.ausgaben || 0); });
    window.mktChartBarLine('mktGoogleTrend', labels, [0,0,0,0,0, Math.round(totalGooSpend)], [0,0,0,0,0, ads.reduce(function(s,a){ return s + Number(a.conversions||0); }, 0)], 'Ausgaben (\u20ac)', 'Leads');

    // Kampagnen-Typ Verteilung
    var typeMap = { 'search': 0, 'display': 0, 'shopping': 0, 'video': 0, 'other': 0 };
    ads.forEach(function(a) {
        var ct = (a.campaign_type || '').toLowerCase();
        if (ct.indexOf('search') >= 0 || ct.indexOf('such') >= 0) typeMap.search += Number(a.ausgaben || 0);
        else if (ct.indexOf('display') >= 0) typeMap.display += Number(a.ausgaben || 0);
        else if (ct.indexOf('shopping') >= 0 || ct.indexOf('pmax') >= 0) typeMap.shopping += Number(a.ausgaben || 0);
        else if (ct.indexOf('video') >= 0 || ct.indexOf('youtube') >= 0) typeMap.video += Number(a.ausgaben || 0);
        else typeMap.other += Number(a.ausgaben || 0);
    });
    // Falls keine Typ-Daten: alles als Search z\u00e4hlen
    if (typeMap.search === 0 && typeMap.display === 0 && typeMap.shopping === 0 && typeMap.video === 0 && typeMap.other === 0) {
        typeMap.search = ads.reduce(function(s,a) { return s + Number(a.ausgaben || 0); }, 0);
    }
    var typeLabels = ['Suche', 'Display', 'Shopping', 'Video', 'Sonstige'];
    var typeData = [Math.round(typeMap.search), Math.round(typeMap.display), Math.round(typeMap.shopping), Math.round(typeMap.video), Math.round(typeMap.other)];
    window.mktChartDoughnut('mktGoogleType', typeLabels, typeData, [C.orange, C.blue, C.green, '#8B5CF6', C.gray]);
}

function renderGoogleDemoCharts(ads) {
    var C = window.MKT_CHART_COLORS;
    var demoColors = [C.orange, C.blue, C.green, C.amber, C.red, '#8B5CF6'];

    // Alter aggregieren
    var ageBuckets = { '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0 };
    ads.forEach(function(a) {
        var ar = a.age_range || '';
        if (ageBuckets[ar] !== undefined) ageBuckets[ar] += Number(a.impressions || 0);
    });
    var ageLabels = Object.keys(ageBuckets);
    var ageData = ageLabels.map(function(k) { return ageBuckets[k]; });
    if (ageData.some(function(v) { return v > 0; })) {
        window.mktChartDoughnut('mktGoogleAge', ageLabels, ageData, demoColors);
    }

    // Geschlecht aggregieren
    var genderMap = { 'male': 0, 'female': 0, 'unknown': 0 };
    ads.forEach(function(a) {
        var g = (a.gender || '').toLowerCase();
        if (g === 'male' || g === 'maennlich' || g === 'm\u00e4nnlich') genderMap.male += Number(a.impressions || 0);
        else if (g === 'female' || g === 'weiblich') genderMap.female += Number(a.impressions || 0);
        else if (g) genderMap.unknown += Number(a.impressions || 0);
    });
    var genderLabels = ['M\u00e4nnlich', 'Weiblich', 'Divers'];
    var genderData = [genderMap.male, genderMap.female, genderMap.unknown];
    if (genderData.some(function(v) { return v > 0; })) {
        window.mktChartDoughnut('mktGoogleGender', genderLabels, genderData, [C.blue, '#EC4899', C.gray]);
    }

    // Region aggregieren
    var geoMap = {};
    ads.forEach(function(a) {
        var gt = a.geo_target || '';
        if (gt) {
            if (!geoMap[gt]) geoMap[gt] = 0;
            geoMap[gt] += Number(a.impressions || 0);
        }
    });
    var geoEntries = Object.keys(geoMap).map(function(k) { return { name: k, val: geoMap[k] }; });
    geoEntries.sort(function(a, b) { return b.val - a.val; });
    geoEntries = geoEntries.slice(0, 6);
    if (geoEntries.length > 0) {
        var geoLabels = geoEntries.map(function(e) { return e.name; });
        var geoData = geoEntries.map(function(e) { return e.val; });
        window.mktChartDoughnut('mktGoogleRegion', geoLabels, geoData, demoColors);
    }
}

// ══════════════════════════════════
// TAB: Brand-Reichweite
// ══════════════════════════════════
function renderReichweite(el) {
    var html = '<h2 class="text-xl font-bold text-gray-800 mb-1">Deine Brand-Reichweite</h2>' +
        '<p class="text-sm text-gray-500 mb-6">So sichtbar bist du online \u2013 auch ohne bezahlte Werbung</p>';

    // KPI-Cards (Feature 7a) - Platzhalter wenn keine Analytics-Daten
    html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">' +
        window.mktKpiCard('Website-Nutzer', '\u2013', 'Eindeutige Besucher/Monat') +
        window.mktKpiCard('Verweildauer', '\u2013', '\u00d8 Minuten pro Besuch') +
        window.mktKpiCard('Absprungrate', '\u2013', 'Sofort-Abspringer in %') +
        '</div>';

    // Charts (Feature 7b) - Website-Traffic + Traffic-Quellen (Mockup-Reihenfolge)
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Website-Traffic \u2013 6 Monate</div>' +
        '<div style="height:220px"><canvas id="mktTrafficTrend"></canvas></div></div>' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Traffic-Quellen</div>' +
        '<div style="height:220px"><canvas id="mktTrafficSources"></canvas></div></div></div>';

    // Info-Banner
    html += '<div class="vit-card p-5 mb-6" style="background:linear-gradient(135deg,#FFF3E0 0%,#FFF 100%);border:1px solid rgba(239,125,0,.2)">' +
        '<p class="text-sm text-gray-600">' +
        '<strong>\ud83d\udcf8 Instagram & Social Media:</strong> Diese Daten werden bald direkt angebunden. ' +
        'Aktuell arbeiten wir an der Instagram Graph API Integration.</p></div>';

    // Landing Pages Tabelle (expert-panel)
    html += '<div class="expert-panel"><div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Top Landing Pages</h3></div>' +
        '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50">' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Seite</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Aufrufe</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Nutzer</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Verweildauer</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Absprungrate</th>' +
        '</tr></thead><tbody class="divide-y divide-gray-100">' +
        '<tr class="text-gray-400"><td colspan="5" class="px-4 py-6 text-center text-sm">Landing Page-Daten werden verf\u00fcgbar, sobald die GA4-Integration aktiv ist.</td></tr>' +
        '</tbody></table></div></div></div>';

    // Social Media Container (bestehend)
    html += '<div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Social Media Reichweite</div>' +
        '<div id="mktSocialCardsContainer" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"></div>';

    el.innerHTML = html;

    // Platzhalter-Charts rendern
    setTimeout(function() {
        var C = window.MKT_CHART_COLORS;
        // Traffic-Quellen Doughnut mit Platzhalter-Daten
        window.mktChartDoughnut('mktTrafficSources',
            ['Organic', 'Direct', 'Social', 'Paid', 'Referral'],
            [40, 25, 15, 12, 8],
            [C.green, C.blue, '#8B5CF6', C.orange, C.amber]);
        // Traffic Trend Line mit Platzhalter
        var MN = window.MKT_MONTH_NAMES;
        var m = window.mktGetCurrentMonth();
        var labels = [];
        for (var i = 5; i >= 0; i--) {
            var mi = m.month - 1 - i;
            if (mi < 0) mi += 12;
            labels.push(MN[mi]);
        }
        window.mktChartLine('mktTrafficTrend', labels, [
            { label: 'Nutzer', data: [0,0,0,0,0,0], borderColor: C.orange, backgroundColor: 'transparent' }
        ]);
    }, 50);

    // Social Data laden wenn verfuegbar
    if (typeof window.loadSocialData === 'function') {
        try { window.loadSocialData(); } catch(e) { console.warn('[marketing-partner] loadSocialData:', e.message); }
    }
}

// ══════════════════════════════════
// TAB: Socialmedia (BESTEHEND)
// ══════════════════════════════════
function renderSocialmedia(el) {
    // Container für bestehende strategie-content.js Funktionen
    el.innerHTML = '<div id="smContainer"></div>';

    // Bestehende Funktionen aufrufen
    setTimeout(function() {
        if (typeof window.renderSmThemen === 'function') window.renderSmThemen();
        if (typeof window.updateSocialMediaCards === 'function') window.updateSocialMediaCards();
    }, 50);
}

// ══════════════════════════════════
// TAB: Glossar
// ══════════════════════════════════
function renderGlossar(el) {
    var glossar = window.MKT_GLOSSAR || [];
    var html = '<h2 class="text-xl font-bold text-gray-800 mb-1">Marketing-Glossar</h2>' +
        '<p class="text-sm text-gray-500 mb-6">Alle Fachbegriffe einfach erkl\u00e4rt</p>';

    glossar.forEach(function(g) {
        html += '<div class="vit-card p-5 mb-3"><div class="font-bold text-sm text-vit-orange mb-1">' + _escH(g.term) + '</div>' +
            '<div class="text-sm text-gray-600 leading-relaxed">' + _escH(g.def) + '</div></div>';
    });

    el.innerHTML = html;
}

// ── Shared Helpers ──

function renderNoData(title, msg) {
    return '<div class="text-center py-16"><div class="text-5xl mb-4">\ud83d\udcca</div>' +
        '<h3 class="text-lg font-bold text-gray-800 mb-2">' + _escH(title) + '</h3>' +
        '<p class="text-sm text-gray-500 max-w-md mx-auto">' + _escH(msg) + '</p>' +
        '<span class="inline-block mt-4 text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold">Daten werden synchronisiert</span></div>';
}

function renderMetaCampaignTable(ads) {
    if (!ads || ads.length === 0) return '';
    var rows = ads.map(function(a) {
        var plattform = (a.publisher_platform || a.plattform || '\u2013');
        var spent = Number(a.ausgaben || 0);
        var ctr = a.impressionen > 0 ? ((a.klicks / a.impressionen) * 100).toFixed(2) + '%' : '\u2013';
        return '<tr class="hover:bg-gray-50">' +
            '<td class="px-4 py-3 text-sm font-semibold text-gray-800">' + _escH(a.kampagne_name || '\u2013') + '</td>' +
            '<td class="px-4 py-3 text-sm">' + _escH(plattform) + '</td>' +
            '<td class="px-4 py-3 text-sm">' + _fmtEur(spent) + '</td>' +
            '<td class="px-4 py-3 text-sm">' + _fmtN(a.impressionen || 0) + '</td>' +
            '<td class="px-4 py-3 text-sm">' + _fmtN(a.klicks || 0) + '</td>' +
            '<td class="px-4 py-3 text-sm">' + ctr + '</td>' +
            '<td class="px-4 py-3 text-sm">' + (a.conversions || 0) + '</td></tr>';
    }).join('');

    return '<div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Meta-Kampagnen im Detail</h3></div>' +
        '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50">' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Kampagne</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Plattform</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Budget</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Impressionen</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Klicks</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">CTR</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Leads</th>' +
        '</tr></thead><tbody class="divide-y divide-gray-100">' + rows + '</tbody></table></div></div>';
}

function renderAdsTable(ads, title) {
    if (!ads || ads.length === 0) return '';
    var rows = ads.map(function(a) {
        var ctr = a.impressionen > 0 ? ((a.klicks / a.impressionen) * 100).toFixed(2) + '%' : '\u2013';
        return '<tr class="hover:bg-gray-50">' +
            '<td class="px-4 py-3 text-sm font-semibold text-gray-800">' + _escH(a.kampagne_name || '\u2013') + '</td>' +
            '<td class="px-4 py-3 text-sm">' + _fmtEur(a.ausgaben || 0) + '</td>' +
            '<td class="px-4 py-3 text-sm">' + _fmtN(a.impressionen || 0) + '</td>' +
            '<td class="px-4 py-3 text-sm">' + _fmtN(a.klicks || 0) + '</td>' +
            '<td class="px-4 py-3 text-sm">' + ctr + '</td>' +
            '<td class="px-4 py-3 text-sm">' + (a.conversions || 0) + '</td></tr>';
    }).join('');

    return '<div class="vit-card overflow-hidden mb-6"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">' + _escH(title) + '</h3></div>' +
        '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50">' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Kampagne</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Ausgaben</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Impressionen</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Klicks</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">CTR</th>' +
        '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Leads</th>' +
        '</tr></thead><tbody class="divide-y divide-gray-100">' + rows + '</tbody></table></div></div>';
}

// PDF Download
function mktDownloadPDF(type) {
    var vb = window.mktState.vereinbarung;
    if (!vb) { _showToast('Keine Vereinbarung vorhanden', 'error'); return; }

    if (type === 'original') {
        if (!vb.pdf_storage_path) {
            _showToast('Kein Original-PDF hinterlegt', 'info');
            return;
        }
        var sb = _sb();
        if (!sb) return;
        sb.storage.from('marketing-docs').download(vb.pdf_storage_path).then(function(res) {
            if (res.error) { _showToast('Download fehlgeschlagen: ' + res.error.message, 'error'); return; }
            var url = URL.createObjectURL(res.data);
            var a = document.createElement('a');
            a.href = url; a.download = 'Marketing-Vereinbarung-' + vb.jahr + '.pdf';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    } else {
        _showToast('Zusammenfassungs-PDF wird vorbereitet...', 'info');
        // TODO: Edge Function generate-marketing-summary aufrufen
        _showToast('PDF-Generierung noch nicht implementiert', 'info');
    }
}

// ── Window Exports ──

// Zeitauswahl fuer Partner-Kampagnentabelle
function mktSetPartnerTimeRange(range) {
    window.mktState._partnerTimeRange = range;
    // Fuer 7d und 30d muessen wir ALLE Daten laden, nicht nur den aktuellen Monat
    if (range === '7d' || range === '30d') {
        // Lade ads_performance ohne Monatsfilter
        loadPartnerAdsAllDates(range);
    } else {
        // Zurueck zum Monatsfilter - Daten neu rendern
        window.mktState._partnerDataLoaded = false;
        window.renderPartnerMarketing();
    }
}

async function loadPartnerAdsAllDates(range) {
    var sb = window._sb ? window._sb() : null;
    if (!sb) return;
    try {
        var now = new Date();
        var from = new Date(now);
        if (range === '7d') from.setDate(from.getDate() - 7);
        else from.setDate(from.getDate() - 30);
        var fromStr = from.toISOString().split('T')[0];
        var toStr = now.toISOString().split('T')[0];

        var session = await sb.auth.getSession();
        var userId = session && session.data && session.data.session ? session.data.session.user.id : null;
        if (!userId) return;
        var { data: userData } = await sb.from('users').select('standort_id').eq('id', userId).maybeSingle();
        if (!userData || !userData.standort_id) return;

        var { data } = await sb.from('ads_performance')
            .select('*')
            .eq('standort_id', userData.standort_id)
            .gte('datum', fromStr)
            .lte('datum', toStr)
            .order('datum', { ascending: false });

        window.mktState.adsData = data || [];
        window.mktState._partnerDataLoaded = true;
        // Re-render current tab
        var el = document.getElementById('partnerMktContent');
        if (el) renderUebersicht(el);
    } catch(e) { console.warn('[marketing-partner] loadPartnerAdsAllDates:', e); }
}

window.mktSetPartnerTimeRange = mktSetPartnerTimeRange;


// ── DEMO-RENDERER für Marketing (status='demo' in modul_status) ──
function _renderMarketingDemo(container) {
    if (!container) return;
    var demoMonth = 'Februar 2026';
    var html = '';
    html += '<div class="mb-4 flex items-center gap-2">';
    html += '<span class="text-xs bg-orange-100 text-orange-700 rounded px-2 py-1 font-semibold">🎭 Demo-Daten – So sieht Marketing aus wenn du live gehst</span>';
    html += '</div>';

    // KPI-Karten
    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">';
    var kpis = [
        {label:'Impressionen',val:'42.800',sub:'+12% vs. Vormonat',color:'blue'},
        {label:'Klicks',val:'1.247',sub:'CTR 2,9%',color:'green'},
        {label:'Werbeausgaben',val:'890 €',sub:'Budget ' + demoMonth,color:'orange'},
        {label:'Leads',val:'23',sub:'CPL 38,70 €',color:'purple'},
    ];
    kpis.forEach(function(k) {
        html += '<div class="vc p-4">';
        html += '<p class="text-[11px] text-gray-400 uppercase font-semibold mb-1">' + k.label + '</p>';
        html += '<p class="text-2xl font-bold text-' + k.color + '-600">' + k.val + '</p>';
        html += '<p class="text-[11px] text-gray-400 mt-1">' + k.sub + '</p>';
        html += '</div>';
    });
    html += '</div>';

    // Kanal-Vergleich
    html += '<div class="grid md:grid-cols-2 gap-4 mb-6">';

    // Google Ads
    html += '<div class="vc p-4">';
    html += '<div class="flex items-center gap-2 mb-3"><span class="text-sm font-bold">🔍 Google Ads</span><span class="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">Demo</span></div>';
    html += '<table class="w-full text-xs"><thead><tr class="text-gray-400"><th class="text-left pb-2">Kampagne</th><th class="text-right pb-2">Klicks</th><th class="text-right pb-2">Ausgaben</th><th class="text-right pb-2">Leads</th></tr></thead><tbody>';
    var gCampaigns = [
        ['E-Bike Beratung', '634', '412 €', '14'],
        ['Marken Brand', '298', '178 €', '6'],
        ['Werkstatt', '315', '143 €', '3'],
    ];
    gCampaigns.forEach(function(r) {
        html += '<tr class="border-t border-gray-100"><td class="py-1.5">' + r[0] + '</td><td class="text-right">' + r[1] + '</td><td class="text-right">' + r[2] + '</td><td class="text-right text-green-600 font-semibold">' + r[3] + '</td></tr>';
    });
    html += '</tbody></table></div>';

    // Meta Ads
    html += '<div class="vc p-4">';
    html += '<div class="flex items-center gap-2 mb-3"><span class="text-sm font-bold">📘 Meta Ads</span><span class="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">Demo</span></div>';
    html += '<table class="w-full text-xs"><thead><tr class="text-gray-400"><th class="text-left pb-2">Anzeige</th><th class="text-right pb-2">Reichweite</th><th class="text-right pb-2">Ausgaben</th><th class="text-right pb-2">Leads</th></tr></thead><tbody>';
    var mCampaigns = [
        ['Spring E-Bike Offer', '8.240', '156 €', '7'],
        ['Werkstatt-Check', '6.110', '89 €', '3'],
        ['Testfahrt buchen', '12.700', '113 €', '2'],
    ];
    mCampaigns.forEach(function(r) {
        html += '<tr class="border-t border-gray-100"><td class="py-1.5">' + r[0] + '</td><td class="text-right">' + r[1] + '</td><td class="text-right">' + r[2] + '</td><td class="text-right text-green-600 font-semibold">' + r[3] + '</td></tr>';
    });
    html += '</tbody></table></div>';
    html += '</div>';

    // Monatstrend-Hinweis
    html += '<div class="vc p-4 mb-4">';
    html += '<p class="text-sm font-bold mb-3">📈 Entwicklung (letzte 6 Monate)</p>';
    html += '<div class="flex items-end gap-2 h-20">';
    var bars = [
        {m:'Sep',h:40,v:'620 €'},{m:'Okt',h:55,v:'745 €'},{m:'Nov',h:48,v:'680 €'},
        {m:'Dez',h:62,v:'810 €'},{m:'Jan',h:70,v:'870 €'},{m:'Feb',h:80,v:'890 €'}
    ];
    bars.forEach(function(b) {
        html += '<div class="flex flex-col items-center flex-1">';
        html += '<span class="text-[9px] text-gray-400 mb-1">' + b.v + '</span>';
        html += '<div class="w-full rounded-t" style="height:' + b.h + '%;background:#EF7D00;opacity:0.85"></div>';
        html += '<span class="text-[9px] text-gray-500 mt-1">' + b.m + '</span>';
        html += '</div>';
    });
    html += '</div></div>';

    // CTA
    html += '<div class="vc p-4 border-2 border-orange-200 bg-orange-50">';
    html += '<p class="text-sm font-bold text-orange-700 mb-1">🚀 Werbung für deinen Standort aktivieren</p>';
    html += '<p class="text-xs text-gray-600 mb-3">HQ richtet Google Ads & Meta Ads ein – du siehst hier live deine Performance.</p>';
    html += '<button onclick="showToast('Bitte wende dich an dein HQ-Team.', 'info')" class="btn-primary text-sm py-2 px-4">Jetzt anfragen</button>';
    html += '</div>';

    container.innerHTML = html;
}

window.renderPartnerMarketing = renderPartnerMarketing;
window.renderPartnerMktTabContent = renderPartnerMktTabContent;
window.mktDownloadPDF = mktDownloadPDF;

})();

