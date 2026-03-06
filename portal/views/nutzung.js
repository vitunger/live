/**
 * views/nutzung.js - KI-Kosten Dashboard (HQ-only)
 *
 * Datenquellen:
 *   1. Anthropic Admin API (via Edge Function anthropic-usage) - echte historische Nutzung
 *   2. api_usage_log Tabelle (Edge Function Logging) - granulares Call-Level Tracking
 *
 * @module views/nutzung
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// === State ===
var usagePeriod = 'month';
var adminApiAvailable = null;

// === MAIN RENDER ===
window.renderApiNutzung = async function renderApiNutzung(containerId) {
    var container = document.getElementById(containerId || 'entwKiKostenContent');
    if (!container) return;

    container.innerHTML = '<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div><span class="ml-3 text-gray-500">Lade KI-Nutzungsdaten...</span></div>';

    try {
        var now = new Date();
        var from = new Date();
        if (usagePeriod === 'today') { from.setHours(0, 0, 0, 0); }
        else if (usagePeriod === 'week') { from.setDate(from.getDate() - 7); }
        else if (usagePeriod === 'month') { from.setMonth(from.getMonth() - 1); }
        else { from.setFullYear(from.getFullYear() - 1); }

        var adminData = null;
        var logData = [];

        var results = await Promise.allSettled([
            loadAdminApiData(from, now),
            loadUsageLogs(from)
        ]);

        if (results[0].status === 'fulfilled') { adminData = results[0].value; adminApiAvailable = true; }
        else { adminApiAvailable = false; }

        if (results[1].status === 'fulfilled') { logData = results[1].value; }

        renderDashboard(container, adminData, logData);
    } catch (e) {
        container.innerHTML = '<div class="vit-card p-6 text-center"><p class="text-red-500 font-semibold mb-2">Fehler beim Laden</p><p class="text-sm text-gray-500">' + (e.message || e) + '</p></div>';
    }
};

async function loadAdminApiData(from, to) {
    var resp = await _sb().functions.invoke('anthropic-usage', {
        body: {
            mode: 'combined',
            starting_at: from.toISOString(),
            ending_at: to.toISOString(),
            bucket_width: '1d',
            group_by: ['model']
        }
    });
    if (resp.error) throw resp.error;
    if (resp.data && resp.data.error) throw new Error(resp.data.error);
    return resp.data;
}

async function loadUsageLogs(from) {
    var resp = await _sb()
        .from('api_usage_log')
        .select('*')
        .gte('created_at', from.toISOString())
        .order('created_at', { ascending: false });
    if (resp.error) throw resp.error;
    return resp.data || [];
}

function renderDashboard(container, adminData, logData) {
    var html = '';

    // Period selector
    html += '<div class="flex items-center justify-between mb-6 flex-wrap gap-3">';
    html += '<div class="flex space-x-2">';
    ['today', 'week', 'month', 'year'].forEach(function(p) {
        var labels = { today: 'Heute', week: '7 Tage', month: '30 Tage', year: '1 Jahr' };
        var active = usagePeriod === p ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
        html += '<button onclick="setUsagePeriod(\'' + p + '\')" class="px-3 py-1.5 rounded-lg text-xs font-semibold ' + active + '">' + labels[p] + '</button>';
    });
    html += '</div>';
    html += '<div class="flex items-center gap-3">';
    if (adminApiAvailable === true) {
        html += '<span class="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Anthropic API verbunden</span>';
    } else if (adminApiAvailable === false) {
        html += '<span class="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">Admin Key fehlt</span>';
    }
    html += '<button onclick="renderApiNutzung()" class="text-xs text-gray-500 hover:text-vit-orange">&#x21bb; Aktualisieren</button>';
    html += '</div></div>';

    if (adminData && adminData.success) {
        html += renderAdminSection(adminData);
    } else {
        html += renderNoAdminSection();
    }

    html += renderLogSection(logData);
    container.innerHTML = html;
}

function renderAdminSection(adminData) {
    var html = '';
    var usage = adminData.usage || {};
    var cost = adminData.cost || {};
    var buckets = usage.data || [];
    var costData = cost.data || [];

    var totalInputTokens = 0;
    var totalOutputTokens = 0;
    var totalRequests = 0;
    var modelBreakdown = {};
    var dailyCosts = {};

    buckets.forEach(function(b) {
        totalInputTokens += (b.input_tokens || 0);
        totalOutputTokens += (b.output_tokens || 0);
        totalRequests += (b.request_count || 0);

        var model = b.model || 'unbekannt';
        if (!modelBreakdown[model]) modelBreakdown[model] = { input: 0, output: 0, requests: 0 };
        modelBreakdown[model].input += (b.input_tokens || 0);
        modelBreakdown[model].output += (b.output_tokens || 0);
        modelBreakdown[model].requests += (b.request_count || 0);

        var day = (b.bucket_start || '').substring(0, 10);
        if (day) {
            if (!dailyCosts[day]) dailyCosts[day] = { tokens: 0, requests: 0 };
            dailyCosts[day].tokens += (b.input_tokens || 0) + (b.output_tokens || 0);
            dailyCosts[day].requests += (b.request_count || 0);
        }
    });

    var totalCostUsd = 0;
    costData.forEach(function(c) {
        totalCostUsd += parseFloat(c.cost_cents || 0) / 100;
    });
    if (totalCostUsd === 0 && totalInputTokens > 0) {
        totalCostUsd = (totalInputTokens / 1000000) * 3.0 + (totalOutputTokens / 1000000) * 15.0;
    }

    var avgPerCall = totalRequests > 0 ? totalCostUsd / totalRequests : 0;

    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
    html += kpiCard('Gesamtkosten', '$' + totalCostUsd.toFixed(2), 'Anthropic API', 'text-vit-orange');
    html += kpiCard('API-Requests', fmtNum(totalRequests), 'im Zeitraum', 'text-blue-600');
    html += kpiCard('Tokens gesamt', fmtTokens(totalInputTokens + totalOutputTokens), 'In: ' + fmtTokens(totalInputTokens) + ' / Out: ' + fmtTokens(totalOutputTokens), 'text-purple-600');
    html += kpiCard('\u00D8 pro Request', '$' + avgPerCall.toFixed(4), 'Durchschnitt', 'text-green-600');
    html += '</div>';

    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">';

    // Model breakdown
    html += '<div class="vit-card p-5">';
    html += '<h2 class="text-sm font-bold text-gray-800 mb-4">\uD83E\uDD16 Kosten nach Modell</h2>';
    var modelKeys = Object.keys(modelBreakdown).sort(function(a, b) { return (modelBreakdown[b].input + modelBreakdown[b].output) - (modelBreakdown[a].input + modelBreakdown[a].output); });
    if (modelKeys.length === 0) {
        html += '<p class="text-sm text-gray-400 text-center py-4">Keine Daten</p>';
    } else {
        var maxTokens = Math.max.apply(null, modelKeys.map(function(k) { return modelBreakdown[k].input + modelBreakdown[k].output; }));
        modelKeys.forEach(function(model) {
            var d = modelBreakdown[model];
            var modelCost = (d.input / 1000000) * 3.0 + (d.output / 1000000) * 15.0;
            var pct = maxTokens > 0 ? ((d.input + d.output) / maxTokens * 100) : 0;
            var shortName = model.replace('claude-', '').replace(/-20\d{6}/g, '');
            html += '<div class="mb-3"><div class="flex justify-between items-center mb-1">';
            html += '<span class="text-sm font-medium text-gray-700">' + shortName + '</span>';
            html += '<span class="text-sm font-bold text-gray-800">$' + modelCost.toFixed(2) + ' <span class="text-xs text-gray-400">(' + fmtNum(d.requests) + ' Req)</span></span>';
            html += '</div><div class="w-full bg-gray-100 rounded-full h-2.5">';
            html += '<div class="bg-orange-400 h-2.5 rounded-full" style="width:' + pct + '%"></div>';
            html += '</div></div>';
        });
    }
    html += '</div>';

    // Daily chart
    html += '<div class="vit-card p-5">';
    html += '<h2 class="text-sm font-bold text-gray-800 mb-4">\uD83D\uDCC8 Tagesverlauf (Requests)</h2>';
    var dayKeys = Object.keys(dailyCosts).sort();
    if (dayKeys.length === 0) {
        html += '<p class="text-sm text-gray-400 text-center py-4">Keine Daten</p>';
    } else {
        var dayMax = Math.max.apply(null, dayKeys.map(function(k) { return dailyCosts[k].requests; }));
        html += '<div class="flex items-end space-x-1" style="height: 120px; overflow-x: auto;">';
        dayKeys.forEach(function(day) {
            var d = dailyCosts[day];
            var h = dayMax > 0 ? (d.requests / dayMax * 100) : 0;
            html += '<div class="flex flex-col items-center flex-1 min-w-[28px]">';
            html += '<div class="text-[9px] text-gray-500 mb-1">' + d.requests + '</div>';
            html += '<div class="w-full bg-vit-orange rounded-t" style="height:' + Math.max(h, 2) + '%;"></div>';
            html += '<div class="text-[8px] text-gray-400 mt-1 whitespace-nowrap">' + day.substring(5) + '</div>';
            html += '</div>';
        });
        html += '</div>';
    }
    html += '</div></div>';
    return html;
}

function renderNoAdminSection() {
    var html = '<div class="vit-card p-6 mb-6 border-l-4 border-yellow-400">';
    html += '<h2 class="text-sm font-bold text-gray-800 mb-2">\u26A1 Anthropic Admin API nicht verbunden</h2>';
    html += '<p class="text-sm text-gray-600 mb-3">Um Live-Nutzungsdaten direkt von Anthropic zu laden:</p>';
    html += '<ol class="text-sm text-gray-600 space-y-1 ml-4 list-decimal">';
    html += '<li>Gehe zu <a href="https://console.anthropic.com" target="_blank" class="text-vit-orange underline">console.anthropic.com</a> \u2192 API Keys \u2192 Admin Keys</li>';
    html += '<li>Erstelle einen Admin API Key</li>';
    html += '<li>Hinterlege ihn als Supabase Secret: <code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs">ANTHROPIC_ADMIN_KEY</code></li>';
    html += '</ol>';
    html += '<p class="text-xs text-gray-400 mt-3">Bis dahin zeigt das Dashboard nur Daten aus dem Edge Function Logging.</p>';
    html += '</div>';
    return html;
}

function renderLogSection(logData) {
    var html = '<div class="vit-card p-5 mt-6">';
    html += '<h2 class="text-sm font-bold text-gray-800 mb-4">\uD83D\uDCDD Edge Function Calls <span class="text-xs text-gray-400 font-normal">(internes Logging, max. 50)</span></h2>';
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
    var logs = logData.slice(0, 50);
    if (logs.length === 0) {
        html += '<tr><td colspan="8" class="py-6 text-center text-gray-400">Noch keine API-Aufrufe protokolliert</td></tr>';
    }
    logs.forEach(function(log) {
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

function fmtNum(n) {
    return (n || 0).toLocaleString('de-DE');
}

window.setUsagePeriod = function setUsagePeriod(period) {
    usagePeriod = period;
    window.renderApiNutzung();
};

window.renderApiNutzung = window.renderApiNutzung;
window.setUsagePeriod = window.setUsagePeriod;
