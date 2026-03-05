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

    // Monatsdaten ermitteln (auto-select letzter Monat mit Daten)
    await window.mktInitMonthSelect();

    // Tabs rendern
    var tabHtml = PARTNER_TABS.map(function(t) {
        return '<button onclick="showMarketingTab(\'' + t.id + '\')" class="mkt-tab-btn whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ' +
            (t.id === 'uebersicht' ? 'border-vit-orange text-vit-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300') +
            '" data-mkt="' + t.id + '">' + t.icon + ' ' + t.label + '</button>';
    }).join('');

    var monthSelector = typeof window.mktRenderMonthSelector === 'function' ? window.mktRenderMonthSelector() : '';

    container.innerHTML =
        '<div class="flex items-center justify-between mb-2 flex-wrap gap-2">' +
            '<div></div>' +
            '<div class="flex items-center gap-2"><span class="text-xs text-gray-400">Zeitraum:</span>' + monthSelector + '</div>' +
        '</div>' +
        '<div class="mb-6 border-b border-gray-200"><nav class="-mb-px flex space-x-6 overflow-x-auto">' + tabHtml + '</nav></div>' +
        '<div id="mktTabContent"></div>';

    // Daten laden
    await Promise.all([
        window.mktLoadVereinbarung(),
        window.mktLoadAdsData(_sbProfile().standort_id),
        window.mktLoadLeadTracking(_sbProfile().standort_id)
    ]);

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
    var totalSpend = 0, totalImpr = 0, totalClicks = 0, totalLeads = 0;
    ads.forEach(function(a) {
        totalSpend += Number(a.cost || 0);
        totalImpr += Number(a.impressions || 0);
        totalClicks += Number(a.clicks || 0);
        totalLeads += Number(a.conversions || 0);
    });

    // Hero Signal
    var hasData = ads.length > 0;
    var heroHtml = '';
    if (hasData) {
        var score = totalLeads > 0 ? Math.min(100, Math.round((totalClicks / Math.max(totalImpr, 1)) * 1000 + totalLeads * 2)) : 0;
        var scoreColor = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
        heroHtml = '<div class="vit-card p-6 mb-6 bg-gradient-to-r from-white to-orange-50 border-l-4 border-vit-orange">' +
            '<div class="flex items-start gap-5">' +
            '<div class="w-14 h-14 rounded-full ' + scoreColor + ' flex items-center justify-center text-white text-xl font-bold flex-shrink-0">' + score + '</div>' +
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

    // Charts
    var chartHtml = '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Ausgaben & Leads \u2013 letzte 6 Monate</div>' +
        '<div style="height:250px"><canvas id="mktChartPovSpend"></canvas></div></div>' +
        '<div class="vit-card p-5"><div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Kanal-Verteilung</div>' +
        '<div style="height:250px"><canvas id="mktChartPovChannel"></canvas></div></div></div>';

    // Kampagnen-Tabelle
    var campHtml = '';
    if (ads.length > 0) {
        var rows = ads.map(function(a) {
            return '<tr class="hover:bg-gray-50"><td class="px-4 py-3 text-sm font-semibold text-gray-800">' + _escH(a.campaign_name || '\u2013') + '</td>' +
                '<td class="px-4 py-3 text-sm text-gray-600">' + _escH(a.platform || '\u2013') + '</td>' +
                '<td class="px-4 py-3 text-sm">' + _fmtEur(a.cost || 0) + '</td>' +
                '<td class="px-4 py-3 text-sm">' + _fmtN(a.clicks || 0) + '</td>' +
                '<td class="px-4 py-3 text-sm">' + (a.conversions || 0) + '</td></tr>';
        }).join('');
        campHtml = '<div class="vit-card overflow-hidden"><div class="px-5 py-4 border-b border-gray-200"><h3 class="text-sm font-semibold text-gray-800">Aktive Kampagnen</h3></div>' +
            '<table class="w-full text-sm"><thead><tr class="bg-gray-50"><th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Kampagne</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Kanal</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Ausgaben</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Klicks</th>' +
            '<th class="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Leads</th></tr></thead>' +
            '<tbody class="divide-y divide-gray-100">' + rows + '</tbody></table></div>';
    }

    el.innerHTML = heroHtml + vbHtml + kpiHtml + chartHtml + campHtml;

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
        var p = (a.platform || '').toLowerCase();
        if (p.indexOf('meta') >= 0 || p.indexOf('facebook') >= 0 || p.indexOf('instagram') >= 0) metaSpend += Number(a.cost || 0);
        else googleSpend += Number(a.cost || 0);
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
        var p = (a.platform || '').toLowerCase();
        return p.indexOf('meta') >= 0 || p.indexOf('facebook') >= 0 || p.indexOf('instagram') >= 0;
    });

    var totalSpend = 0, totalImpr = 0, totalClicks = 0, totalLeads = 0;
    ads.forEach(function(a) {
        totalSpend += Number(a.cost || 0);
        totalImpr += Number(a.impressions || 0);
        totalClicks += Number(a.clicks || 0);
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

    // Kampagnen-Tabelle
    html += renderAdsTable(ads, 'Meta-Kampagnen im Detail');
    el.innerHTML = html;
}

// ══════════════════════════════════
// TAB: Google Ads
// ══════════════════════════════════
function renderGoogleAds(el) {
    var ads = (window.mktState.adsData || []).filter(function(a) {
        var p = (a.platform || '').toLowerCase();
        return p.indexOf('google') >= 0;
    });

    var totalSpend = 0, totalImpr = 0, totalClicks = 0, totalLeads = 0;
    ads.forEach(function(a) {
        totalSpend += Number(a.cost || 0);
        totalImpr += Number(a.impressions || 0);
        totalClicks += Number(a.clicks || 0);
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

    html += renderAdsTable(ads, 'Google-Kampagnen im Detail');
    el.innerHTML = html;
}

// ══════════════════════════════════
// TAB: Brand-Reichweite
// ══════════════════════════════════
function renderReichweite(el) {
    var html = '<h2 class="text-xl font-bold text-gray-800 mb-1">Deine Brand-Reichweite</h2>' +
        '<p class="text-sm text-gray-500 mb-6">So sichtbar bist du online \u2013 auch ohne bezahlte Werbung</p>';

    // Hinweis: GA4 + Social Media Daten kommen über loadSocialData()
    html += '<div class="vit-card p-5 mb-6 bg-orange-50 border border-orange-200">' +
        '<p class="text-sm text-gray-600"><strong>\ud83d\udcf8 Social Media & Website-Analytics:</strong> ' +
        'Diese Daten werden \u00fcber die Schnittstellen-Integration geladen. Stelle sicher, dass deine Kan\u00e4le in den Einstellungen verbunden sind.</p></div>';

    // Social Media Cards Container (wird von loadSocialData() befüllt)
    html += '<div id="mktSocialCardsContainer" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"></div>';

    el.innerHTML = html;

    // Social Data laden wenn verfügbar
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

function renderAdsTable(ads, title) {
    if (!ads || ads.length === 0) return '';
    var rows = ads.map(function(a) {
        var ctr = a.impressions > 0 ? ((a.clicks / a.impressions) * 100).toFixed(2) + '%' : '\u2013';
        return '<tr class="hover:bg-gray-50">' +
            '<td class="px-4 py-3 text-sm font-semibold text-gray-800">' + _escH(a.campaign_name || '\u2013') + '</td>' +
            '<td class="px-4 py-3 text-sm">' + _fmtEur(a.cost || 0) + '</td>' +
            '<td class="px-4 py-3 text-sm">' + _fmtN(a.impressions || 0) + '</td>' +
            '<td class="px-4 py-3 text-sm">' + _fmtN(a.clicks || 0) + '</td>' +
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
window.renderPartnerMarketing = renderPartnerMarketing;
window.renderPartnerMktTabContent = renderPartnerMktTabContent;
window.mktDownloadPDF = mktDownloadPDF;

})();
