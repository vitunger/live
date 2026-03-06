/**
 * views/nutzung.js - API-Nutzung & Kosten Dashboard (HQ-only)
 *
 * Zeigt Kosten pro Edge Function, pro Modul, pro Standort.
 * Datenquelle: api_usage_log Tabelle (befuellt von Edge Functions nach jedem API-Call)
 *
 * @module views/nutzung
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// === Kosten-Konstanten (USD pro 1M Tokens) ===
var COST_RATES = {
    'anthropic': {
        'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
        'claude-haiku-3-20240307':  { input: 0.25, output: 1.25 },
        'default':                  { input: 3.0, output: 15.0 }
    },
    'openai': {
        'gpt-4o':      { input: 2.5, output: 10.0 },
        'gpt-4o-mini': { input: 0.15, output: 0.6 },
        'gpt-4-turbo': { input: 10.0, output: 30.0 },
        'default':     { input: 2.5, output: 10.0 }
    }
};

function estimateCost(provider, model, inputTokens, outputTokens) {
    var rates = COST_RATES[provider] || COST_RATES['anthropic'];
    var modelRates = rates[model] || rates['default'];
    return ((inputTokens / 1000000) * modelRates.input) + ((outputTokens / 1000000) * modelRates.output);
}

// === State ===
var usageLogs = [];
var usagePeriod = 'month'; // 'today', 'week', 'month', 'year'

// === MAIN RENDER ===
window.renderApiNutzung = async function renderApiNutzung(containerId) {
    var container = document.getElementById(containerId || 'entwKiKostenContent');
    if (!container) return;

    container.innerHTML = '<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div><span class="ml-3 text-gray-500">Lade API-Nutzungsdaten...</span></div>';

    try {
        // Zeitraum berechnen
        var now = new Date();
        var from = new Date();
        if (usagePeriod === 'today') {
            from.setHours(0, 0, 0, 0);
        } else if (usagePeriod === 'week') {
            from.setDate(from.getDate() - 7);
        } else if (usagePeriod === 'month') {
            from.setMonth(from.getMonth() - 1);
        } else {
            from.setFullYear(from.getFullYear() - 1);
        }

        var resp = await _sb()
            .from('api_usage_log')
            .select('*')
            .gte('created_at', from.toISOString())
            .order('created_at', { ascending: false });

        if (resp.error) throw resp.error;
        usageLogs = resp.data || [];

        renderDashboard(container);
    } catch (e) {
        container.innerHTML = '<div class="vit-card p-6 text-center"><p class="text-red-500 font-semibold mb-2">Fehler beim Laden der API-Daten</p><p class="text-sm text-gray-500">' + (e.message || e) + '</p><p class="text-xs text-gray-400 mt-4">Tabelle <code>api_usage_log</code> muss in Supabase existieren.</p></div>';
    }
};

function renderDashboard(container) {
    // Aggregationen
    var totalCost = 0;
    var totalCalls = usageLogs.length;
    var totalInputTokens = 0;
    var totalOutputTokens = 0;
    var costByFunction = {};
    var costByProvider = {};
    var costByDay = {};
    var costByStandort = {};
    var successCount = 0;

    usageLogs.forEach(function(log) {
        var cost = log.estimated_cost_usd || estimateCost(log.provider || 'anthropic', log.model || '', log.input_tokens || 0, log.output_tokens || 0);
        totalCost += cost;
        totalInputTokens += (log.input_tokens || 0);
        totalOutputTokens += (log.output_tokens || 0);
        if (log.success !== false) successCount++;

        // By function
        var fn = log.edge_function || 'unbekannt';
        if (!costByFunction[fn]) costByFunction[fn] = { cost: 0, calls: 0, tokens: 0 };
        costByFunction[fn].cost += cost;
        costByFunction[fn].calls++;
        costByFunction[fn].tokens += (log.input_tokens || 0) + (log.output_tokens || 0);

        // By provider
        var prov = log.provider || 'anthropic';
        if (!costByProvider[prov]) costByProvider[prov] = { cost: 0, calls: 0 };
        costByProvider[prov].cost += cost;
        costByProvider[prov].calls++;

        // By day
        var day = (log.created_at || '').substring(0, 10);
        if (!costByDay[day]) costByDay[day] = { cost: 0, calls: 0 };
        costByDay[day].cost += cost;
        costByDay[day].calls++;

        // By standort
        var sid = log.standort_id || 'HQ';
        if (!costByStandort[sid]) costByStandort[sid] = { cost: 0, calls: 0, name: log.standort_name || sid };
        costByStandort[sid].cost += cost;
        costByStandort[sid].calls++;
    });

    var avgCost = totalCalls > 0 ? (totalCost / totalCalls) : 0;
    var successRate = totalCalls > 0 ? ((successCount / totalCalls) * 100) : 100;

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
    html += '<button onclick="renderApiNutzung()" class="text-xs text-gray-500 hover:text-vit-orange">&#x21bb; Aktualisieren</button>';
    html += '</div>';

    // KPI Cards
    html += '<div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">';
    html += kpiCard('Gesamtkosten', '$' + totalCost.toFixed(2), 'USD im Zeitraum', 'text-vit-orange');
    html += kpiCard('API-Calls', totalCalls.toString(), 'Aufrufe', 'text-blue-600');
    html += kpiCard('\u00D8 pro Call', '$' + avgCost.toFixed(4), 'Durchschnitt', 'text-purple-600');
    html += kpiCard('Tokens gesamt', formatTokens(totalInputTokens + totalOutputTokens), 'In: ' + formatTokens(totalInputTokens) + ' / Out: ' + formatTokens(totalOutputTokens), 'text-green-600');
    html += kpiCard('Erfolgsrate', successRate.toFixed(1) + '%', successCount + ' von ' + totalCalls, successRate >= 95 ? 'text-green-600' : 'text-red-600');
    html += '</div>';

    // Charts row
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">';

    // Provider breakdown
    html += '<div class="vit-card p-5">';
    html += '<h2 class="text-sm font-bold text-gray-800 mb-4">&#x1F4CA; Kosten nach Provider</h2>';
    var provKeys = Object.keys(costByProvider).sort(function(a, b) { return costByProvider[b].cost - costByProvider[a].cost; });
    if (provKeys.length === 0) {
        html += '<p class="text-sm text-gray-400 text-center py-4">Noch keine Daten vorhanden</p>';
    } else {
        var provMaxCost = Math.max.apply(null, provKeys.map(function(k) { return costByProvider[k].cost; }));
        provKeys.forEach(function(prov) {
            var d = costByProvider[prov];
            var pct = provMaxCost > 0 ? (d.cost / provMaxCost * 100) : 0;
            var provLabel = prov === 'anthropic' ? '&#x1F7E0; Anthropic (Claude)' : prov === 'openai' ? '&#x1F7E2; OpenAI (GPT)' : prov;
            html += '<div class="mb-3">';
            html += '<div class="flex justify-between items-center mb-1">';
            html += '<span class="text-sm font-semibold text-gray-700">' + provLabel + '</span>';
            html += '<span class="text-sm font-bold text-gray-800">$' + d.cost.toFixed(2) + ' <span class="text-xs text-gray-400">(' + d.calls + ' Calls)</span></span>';
            html += '</div>';
            html += '<div class="w-full bg-gray-100 rounded-full h-2.5">';
            html += '<div class="h-2.5 rounded-full ' + (prov === 'anthropic' ? 'bg-orange-400' : 'bg-green-400') + '" style="width:' + pct + '%"></div>';
            html += '</div></div>';
        });
    }
    html += '</div>';

    // Cost by function
    html += '<div class="vit-card p-5">';
    html += '<h2 class="text-sm font-bold text-gray-800 mb-4">&#x2699;&#xFE0F; Kosten nach Edge Function</h2>';
    var fnKeys = Object.keys(costByFunction).sort(function(a, b) { return costByFunction[b].cost - costByFunction[a].cost; });
    if (fnKeys.length === 0) {
        html += '<p class="text-sm text-gray-400 text-center py-4">Noch keine Daten vorhanden</p>';
    } else {
        var fnMaxCost = Math.max.apply(null, fnKeys.map(function(k) { return costByFunction[k].cost; }));
        fnKeys.forEach(function(fn) {
            var d = costByFunction[fn];
            var pct = fnMaxCost > 0 ? (d.cost / fnMaxCost * 100) : 0;
            html += '<div class="mb-3">';
            html += '<div class="flex justify-between items-center mb-1">';
            html += '<span class="text-sm font-medium text-gray-700"><code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs">' + fn + '</code></span>';
            html += '<span class="text-sm font-bold text-gray-800">$' + d.cost.toFixed(2) + ' <span class="text-xs text-gray-400">(' + d.calls + ' Calls, ' + formatTokens(d.tokens) + ')</span></span>';
            html += '</div>';
            html += '<div class="w-full bg-gray-100 rounded-full h-2.5">';
            html += '<div class="bg-blue-400 h-2.5 rounded-full" style="width:' + pct + '%"></div>';
            html += '</div></div>';
        });
    }
    html += '</div>';

    html += '</div>';

    // Daily cost chart (simple bar chart)
    html += '<div class="vit-card p-5 mb-6">';
    html += '<h2 class="text-sm font-bold text-gray-800 mb-4">&#x1F4C8; Tagesverlauf</h2>';
    var dayKeys = Object.keys(costByDay).sort();
    if (dayKeys.length === 0) {
        html += '<p class="text-sm text-gray-400 text-center py-4">Noch keine Daten vorhanden</p>';
    } else {
        var dayMaxCost = Math.max.apply(null, dayKeys.map(function(k) { return costByDay[k].cost; }));
        html += '<div class="flex items-end space-x-1" style="height: 120px; overflow-x: auto;">';
        dayKeys.forEach(function(day) {
            var d = costByDay[day];
            var h = dayMaxCost > 0 ? (d.cost / dayMaxCost * 100) : 0;
            var label = day.substring(5); // MM-DD
            html += '<div class="flex flex-col items-center flex-1 min-w-[28px]">';
            html += '<div class="text-[9px] text-gray-500 mb-1">$' + d.cost.toFixed(2) + '</div>';
            html += '<div class="w-full bg-vit-orange rounded-t" style="height:' + Math.max(h, 2) + '%;"></div>';
            html += '<div class="text-[8px] text-gray-400 mt-1 whitespace-nowrap">' + label + '</div>';
            html += '</div>';
        });
        html += '</div>';
    }
    html += '</div>';

    // Detail table
    html += '<div class="vit-card p-5">';
    html += '<h2 class="text-sm font-bold text-gray-800 mb-4">&#x1F4DD; Letzte API-Aufrufe <span class="text-xs text-gray-400 font-normal">(max. 50)</span></h2>';
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

    var displayLogs = usageLogs.slice(0, 50);
    if (displayLogs.length === 0) {
        html += '<tr><td colspan="8" class="py-6 text-center text-gray-400">Noch keine API-Aufrufe protokolliert</td></tr>';
    }
    displayLogs.forEach(function(log) {
        var cost = log.estimated_cost_usd || estimateCost(log.provider || 'anthropic', log.model || '', log.input_tokens || 0, log.output_tokens || 0);
        var dt = new Date(log.created_at);
        var timeStr = dt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + ' ' + dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        var provBadge = log.provider === 'openai' ? '<span class="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold">OpenAI</span>' : '<span class="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Anthropic</span>';
        var statusIcon = log.success !== false ? '<span class="text-green-500">&#x2705;</span>' : '<span class="text-red-500">&#x274C;</span>';

        html += '<tr class="border-b border-gray-50 hover:bg-gray-50">';
        html += '<td class="py-2 px-2 text-gray-600">' + timeStr + '</td>';
        html += '<td class="py-2 px-2">' + provBadge + '</td>';
        html += '<td class="py-2 px-2"><code class="bg-gray-100 px-1 rounded">' + (log.edge_function || '-') + '</code></td>';
        html += '<td class="py-2 px-2 text-gray-600">' + (log.modul || '-') + '</td>';
        html += '<td class="py-2 px-2 text-right text-gray-600">' + formatTokens(log.input_tokens || 0) + '</td>';
        html += '<td class="py-2 px-2 text-right text-gray-600">' + formatTokens(log.output_tokens || 0) + '</td>';
        html += '<td class="py-2 px-2 text-right font-semibold text-gray-800">$' + cost.toFixed(4) + '</td>';
        html += '<td class="py-2 px-2 text-center">' + statusIcon + '</td>';
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    html += '</div>';

    container.innerHTML = html;
}

function kpiCard(label, value, sub, colorClass) {
    return '<div class="vit-card p-4">'
        + '<p class="text-[10px] text-gray-400 uppercase font-semibold">' + label + '</p>'
        + '<p class="text-xl font-bold ' + (colorClass || 'text-gray-800') + '">' + value + '</p>'
        + '<p class="text-[10px] text-gray-500 mt-0.5">' + sub + '</p>'
        + '</div>';
}

function formatTokens(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
}

window.setUsagePeriod = function setUsagePeriod(period) {
    usagePeriod = period;
    window.renderApiNutzung();
};

// Export for Strangler Fig
window.renderApiNutzung = window.renderApiNutzung;
window.setUsagePeriod = window.setUsagePeriod;
