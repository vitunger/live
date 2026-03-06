/**
 * views/nutzung.js - Cockpit Betriebskosten Dashboard (HQ-only)
 *
 * Zeigt alle Kosten des Cockpit-Betriebs:
 *   - Vercel (Hosting, Builds)
 *   - Supabase (DB, Auth, Edge Functions)
 *   - Anthropic (KI-API)
 *   - Resend (E-Mail)
 *
 * Datenquellen:
 *   1. Edge Function cockpit-costs → Vercel Billing API + Anthropic Admin API + Fixkosten
 *   2. api_usage_log Tabelle → granulares Edge Function Call-Logging
 *
 * @module views/nutzung
 */
function _sb()           { return window.sb; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

var usagePeriod = 'month';

// === MAIN RENDER ===
window.renderApiNutzung = async function renderApiNutzung(containerId) {
    var container = document.getElementById(containerId || 'entwKiKostenContent');
    if (!container) return;

    container.innerHTML = '<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div><span class="ml-3 text-gray-500">Lade Betriebskosten...</span></div>';

    try {
        var now = new Date();
        var from = new Date();
        if (usagePeriod === 'month') { from.setMonth(from.getMonth() - 1); }
        else if (usagePeriod === 'quarter') { from.setMonth(from.getMonth() - 3); }
        else if (usagePeriod === 'year') { from.setFullYear(from.getFullYear() - 1); }
        else { from.setMonth(from.getMonth() - 1); }

        var costsData = null;
        var logData = [];

        var results = await Promise.allSettled([
            _sb().functions.invoke('cockpit-costs', { body: { from: from.toISOString(), to: now.toISOString() } }),
            _sb().from('api_usage_log').select('*').gte('created_at', from.toISOString()).order('created_at', { ascending: false }).limit(50)
        ]);

        if (results[0].status === 'fulfilled' && results[0].value.data && results[0].value.data.success) {
            costsData = results[0].value.data;
        }
        if (results[1].status === 'fulfilled' && results[1].value.data) {
            logData = results[1].value.data;
        }

        renderDashboard(container, costsData, logData);
    } catch (e) {
        container.innerHTML = '<div class="vit-card p-6 text-center"><p class="text-red-500 font-semibold mb-2">Fehler beim Laden</p><p class="text-sm text-gray-500">' + (e.message || e) + '</p></div>';
    }
};

function renderDashboard(container, costsData, logData) {
    var html = '';

    // Header
    html += '<div class="flex items-center justify-between mb-6 flex-wrap gap-3">';
    html += '<div>';
    html += '<h2 class="text-lg font-bold text-gray-800">Cockpit Betriebskosten</h2>';
    html += '<p class="text-xs text-gray-500">Alle laufenden Kosten fuer den Betrieb des vit:bikes Cockpits</p>';
    html += '</div>';
    html += '<div class="flex items-center gap-3">';
    ['month', 'quarter', 'year'].forEach(function(p) {
        var labels = { month: '1 Monat', quarter: '3 Monate', year: '1 Jahr' };
        var active = usagePeriod === p ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
        html += '<button onclick="setUsagePeriod(\'' + p + '\')" class="px-3 py-1.5 rounded-lg text-xs font-semibold ' + active + '">' + labels[p] + '</button>';
    });
    html += '<button onclick="renderApiNutzung()" class="text-xs text-gray-500 hover:text-vit-orange ml-2">&#x21bb;</button>';
    html += '</div></div>';

    if (!costsData) {
        html += '<div class="vit-card p-6 text-center text-gray-400">Kostendaten konnten nicht geladen werden.</div>';
        container.innerHTML = html;
        return;
    }

    var total = costsData.total_usd || 0;
    var perUser = costsData.per_user_usd || 0;
    var userCount = costsData.user_count || 1;
    var months = costsData.months || 1;
    var providers = costsData.providers || [];
    var monthlyTotal = months > 0 ? total / months : total;
    var monthlyPerUser = months > 0 ? perUser / months : perUser;

    // KPI Cards
    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
    html += kpiCard('Gesamtkosten', '$' + total.toFixed(2), months > 1 ? months + ' Monate' : 'letzter Monat', 'text-vit-orange');
    html += kpiCard('Pro Monat', '$' + monthlyTotal.toFixed(2), '\u00D8 monatlich', 'text-blue-600');
    html += kpiCard('Pro Nutzer/Monat', '$' + monthlyPerUser.toFixed(2), userCount + ' registrierte Nutzer', 'text-purple-600');
    var vercelProv = providers.find(function(p) { return p.name === 'Vercel'; });
    var buildCost = vercelProv ? (vercelProv.breakdown['Build Minutes'] || 0) : 0;
    html += kpiCard('Build Minutes', '$' + buildCost.toFixed(2), 'groesster Kostentreiber', buildCost > 50 ? 'text-red-500' : 'text-green-600');
    html += '</div>';

    // Provider cards
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">';

    // Left: Provider overview
    html += '<div class="vit-card p-5">';
    html += '<h3 class="text-sm font-bold text-gray-800 mb-4">\uD83D\uDCB0 Kosten nach Provider</h3>';
    var maxCost = Math.max.apply(null, providers.map(function(p) { return p.total; }).concat([1]));
    providers.forEach(function(p) {
        var pct = maxCost > 0 ? (p.total / maxCost * 100) : 0;
        var colors = { Vercel: 'bg-gray-800', Supabase: 'bg-green-500', Anthropic: 'bg-orange-400', Resend: 'bg-blue-400' };
        html += '<div class="mb-4">';
        html += '<div class="flex justify-between items-center mb-1">';
        html += '<span class="text-sm font-semibold text-gray-700">' + p.icon + ' ' + p.name;
        if (p.type === 'fixed') html += ' <span class="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Fix</span>';
        html += '</span>';
        html += '<span class="text-sm font-bold text-gray-800">$' + p.total.toFixed(2) + '</span>';
        html += '</div>';
        html += '<div class="w-full bg-gray-100 rounded-full h-3">';
        html += '<div class="' + (colors[p.name] || 'bg-gray-400') + ' h-3 rounded-full transition-all" style="width:' + Math.max(pct, 1) + '%"></div>';
        html += '</div></div>';
    });
    // Total line
    html += '<div class="border-t border-gray-200 pt-3 mt-2 flex justify-between">';
    html += '<span class="text-sm font-bold text-gray-800">Gesamt</span>';
    html += '<span class="text-sm font-bold text-vit-orange">$' + total.toFixed(2) + '</span>';
    html += '</div>';
    html += '</div>';

    // Right: Detailed breakdown of biggest provider
    html += '<div class="vit-card p-5">';
    html += '<h3 class="text-sm font-bold text-gray-800 mb-4">\u25B2 Vercel Details</h3>';
    if (vercelProv) {
        var items = Object.entries(vercelProv.breakdown).filter(function(e) { return e[1] > 0; }).sort(function(a, b) { return b[1] - a[1]; });
        if (items.length === 0) {
            html += '<p class="text-sm text-gray-400 text-center py-4">Keine Vercel-Kosten im Zeitraum</p>';
        } else {
            html += '<div class="space-y-2">';
            items.forEach(function(item) {
                html += '<div class="flex justify-between items-center">';
                html += '<span class="text-xs text-gray-600">' + item[0] + '</span>';
                html += '<span class="text-xs font-bold text-gray-800">$' + item[1].toFixed(4) + '</span>';
                html += '</div>';
            });
            html += '</div>';
        }
    }
    html += '<div class="mt-4 p-3 bg-yellow-50 rounded-lg">';
    html += '<p class="text-[10px] text-yellow-700"><strong>Tipp:</strong> Build Minutes sind der groesste Kostentreiber. Jeder GitHub-Commit triggert einen Vercel-Build. Weniger Einzel-Commits = weniger Kosten.</p>';
    html += '</div>';
    html += '</div>';

    html += '</div>';

    // Pro-User breakdown
    html += '<div class="vit-card p-5 mb-6">';
    html += '<h3 class="text-sm font-bold text-gray-800 mb-3">\uD83D\uDC64 Kosten pro Nutzer</h3>';
    html += '<div class="grid grid-cols-3 gap-4 text-center">';
    html += '<div><p class="text-2xl font-bold text-gray-800">' + userCount + '</p><p class="text-[10px] text-gray-500">Registrierte Nutzer</p></div>';
    html += '<div><p class="text-2xl font-bold text-purple-600">$' + monthlyPerUser.toFixed(2) + '</p><p class="text-[10px] text-gray-500">Pro Nutzer / Monat</p></div>';
    html += '<div><p class="text-2xl font-bold text-green-600">\u20AC' + (monthlyPerUser * 0.92).toFixed(2) + '</p><p class="text-[10px] text-gray-500">ca. in EUR</p></div>';
    html += '</div>';
    html += '<p class="text-[10px] text-gray-400 mt-3 text-center">Bei 50 Standorten mit je 3 Nutzern (150 User) w\u00e4ren es ca. $' + (monthlyTotal / 150).toFixed(2) + ' pro Nutzer/Monat.</p>';
    html += '</div>';

    // Edge Function Logs
    html += renderLogSection(logData);

    container.innerHTML = html;
}

function renderLogSection(logData) {
    var html = '<div class="vit-card p-5">';
    html += '<h3 class="text-sm font-bold text-gray-800 mb-4">\uD83D\uDCDD KI-API Calls <span class="text-xs text-gray-400 font-normal">(Edge Function Logging, max. 50)</span></h3>';
    html += '<div class="overflow-x-auto"><table class="w-full text-xs">';
    html += '<thead><tr class="bg-gray-50">';
    html += '<th class="py-2 px-2 text-left text-gray-500">Zeitpunkt</th>';
    html += '<th class="py-2 px-2 text-left text-gray-500">Provider</th>';
    html += '<th class="py-2 px-2 text-left text-gray-500">Function</th>';
    html += '<th class="py-2 px-2 text-left text-gray-500">Modul</th>';
    html += '<th class="py-2 px-2 text-right text-gray-500">Input</th>';
    html += '<th class="py-2 px-2 text-right text-gray-500">Output</th>';
    html += '<th class="py-2 px-2 text-right text-gray-500">Kosten</th>';
    html += '<th class="py-2 px-2 text-center text-gray-500">Status</th>';
    html += '</tr></thead><tbody>';
    if (logData.length === 0) {
        html += '<tr><td colspan="8" class="py-6 text-center text-gray-400">Noch keine KI-API-Aufrufe protokolliert</td></tr>';
    }
    logData.forEach(function(log) {
        var cost = log.estimated_cost_usd || 0;
        var dt = new Date(log.created_at);
        var timeStr = dt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        var provBadge = log.provider === 'openai'
            ? '<span class="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold">OpenAI</span>'
            : '<span class="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Anthropic</span>';
        var statusIcon = log.success !== false ? '<span class="text-green-500">&#x2705;</span>' : '<span class="text-red-500">&#x274C;</span>';
        html += '<tr class="border-b border-gray-50 hover:bg-gray-50">';
        html += '<td class="py-2 px-2 text-gray-600">' + timeStr + '</td>';
        html += '<td class="py-2 px-2">' + provBadge + '</td>';
        html += '<td class="py-2 px-2"><code class="bg-gray-100 px-1 rounded">' + (log.edge_function || '-') + '</code></td>';
        html += '<td class="py-2 px-2 text-gray-600">' + (log.modul || '-') + '</td>';
        html += '<td class="py-2 px-2 text-right text-gray-600">' + fmtTokens(log.input_tokens || 0) + '</td>';
        html += '<td class="py-2 px-2 text-right text-gray-600">' + fmtTokens(log.output_tokens || 0) + '</td>';
        html += '<td class="py-2 px-2 text-right font-semibold text-gray-800">$' + cost.toFixed(4) + '</td>';
        html += '<td class="py-2 px-2 text-center">' + statusIcon + '</td>';
        html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
}

function kpiCard(label, value, sub, colorClass) {
    return '<div class="vit-card p-4">'
        + '<p class="text-[10px] text-gray-400 uppercase font-semibold">' + label + '</p>'
        + '<p class="text-xl font-bold ' + (colorClass || 'text-gray-800') + '">' + value + '</p>'
        + '<p class="text-[10px] text-gray-500 mt-0.5">' + sub + '</p>'
        + '</div>';
}

function fmtTokens(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
}

window.setUsagePeriod = function setUsagePeriod(period) {
    usagePeriod = period;
    window.renderApiNutzung();
};

window.renderApiNutzung = window.renderApiNutzung;
window.setUsagePeriod = window.setUsagePeriod;
