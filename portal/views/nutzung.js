/**
 * views/nutzung.js - Cockpit Betriebskosten Dashboard (HQ-only)
 * Liest aus cockpit_costs_cache (taeglich per Cron gesynct) → sofortiges Laden.
 * cockpit_savings.typ: 'einsparung' | 'laufende_kosten'
 * cockpit_savings.nutzer_typ: 'hq' | 'partner' | 'beide'
 * @module views/nutzung
 */
function _sb() { return window.sb; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _escH(s) { var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

var usagePeriod = 'current';

window.renderApiNutzung = async function renderApiNutzung(containerId) {
    var container = document.getElementById(containerId || 'entwKiKostenContent');
    if (!container) return;
    container.innerHTML = '<div class="flex items-center justify-center py-8"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div><span class="ml-3 text-gray-500 text-sm">Lade...</span></div>';

    try {
        var results = await Promise.allSettled([
            _sb().from('cockpit_costs_cache').select('*').order('monat', { ascending: false }),
            _sb().from('cockpit_savings').select('*').order('kosten_pro_monat', { ascending: false }),
            _sb().from('users').select('id', { count: 'exact', head: true }),
            _sb().from('api_usage_log').select('*').order('created_at', { ascending: false }).limit(30)
        ]);

        var cache = (results[0].status === 'fulfilled' && results[0].value.data) ? results[0].value.data : [];
        var allSavings = (results[1].status === 'fulfilled' && results[1].value.data) ? results[1].value.data : [];
        var userCount = (results[2].status === 'fulfilled') ? (results[2].value.count || 1) : 1;
        var logData = (results[3].status === 'fulfilled' && results[3].value.data) ? results[3].value.data : [];

        // Split: echte Einsparungen vs. laufende Cockpit-Kosten aus DB
        var savings = allSavings.filter(function(s){ return !s.typ || s.typ === 'einsparung'; });
        var dbCosts = allSavings.filter(function(s){ return s.typ === 'laufende_kosten'; });

        renderDashboard(container, cache, savings, dbCosts, userCount, logData);
    } catch (e) {
        container.innerHTML = '<div class="vit-card p-6 text-center"><p class="text-red-500 font-semibold">Fehler: ' + (e.message || e) + '</p></div>';
    }
};

function getMonthStr(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function monthLabel(m) { var p = m.split('-'); var names = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']; return names[parseInt(p[1])-1] + ' ' + p[0]; }

function renderDashboard(container, cache, savings, dbCosts, userCount, logData) {
    var html = '';
    var now = new Date();
    var currentMonth = getMonthStr(now);
    var lastMonth = getMonthStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    var monthlyData = {};
    cache.forEach(function(row) {
        if (!monthlyData[row.monat]) monthlyData[row.monat] = { providers: {}, total: 0 };
        monthlyData[row.monat].providers[row.provider] = { total: parseFloat(row.total_usd || 0), breakdown: row.breakdown || {} };
        monthlyData[row.monat].total += parseFloat(row.total_usd || 0);
    });

    var allMonths = Object.keys(monthlyData).sort().reverse();

    // Einsparungen aufteilen: HQ-only, Partner-only, Beide
    var hqSavings = savings.filter(function(s){ return !s.nutzer_typ || s.nutzer_typ === 'hq' || s.nutzer_typ === 'beide'; });
    var partnerSavings = savings.filter(function(s){ return s.nutzer_typ === 'partner' || s.nutzer_typ === 'beide'; });
    var hqSavingsTotal = hqSavings.reduce(function(a,s){return a+parseFloat(s.kosten_pro_monat||0);},0);
    var partnerSavingsTotal = partnerSavings.reduce(function(a,s){return a+parseFloat(s.kosten_pro_monat||0);},0);
    // Gesamt: unique tools (nicht doppelt zählen bei 'beide')
    var uniqueSavingsTotal = savings.reduce(function(a,s){return a+parseFloat(s.kosten_pro_monat||0);},0);

    // DB-Kosten (z.B. AssemblyAI)
    var dbCostsTotal = dbCosts.reduce(function(a,s){return a+parseFloat(s.kosten_pro_monat||0);},0);

    var displayData, periodLabel, perPeriod;
    if (usagePeriod === 'current') {
        displayData = monthlyData[currentMonth] || { providers: {}, total: 0 };
        periodLabel = monthLabel(currentMonth);
        perPeriod = '/Monat';
    } else if (usagePeriod === 'last') {
        displayData = monthlyData[lastMonth] || { providers: {}, total: 0 };
        periodLabel = monthLabel(lastMonth);
        perPeriod = '/Monat';
    } else if (usagePeriod === 'average') {
        displayData = { providers: {}, total: 0 };
        var cnt = Math.min(allMonths.length, 3);
        if (cnt > 0) {
            allMonths.slice(0, cnt).forEach(function(m) {
                var md = monthlyData[m];
                displayData.total += md.total / cnt;
                Object.keys(md.providers).forEach(function(p) {
                    if (!displayData.providers[p]) displayData.providers[p] = { total: 0, breakdown: {} };
                    displayData.providers[p].total += md.providers[p].total / cnt;
                });
            });
        }
        periodLabel = '\u00D8 pro Monat (' + cnt + ' Mon.)';
        perPeriod = '/Monat';
    } else {
        displayData = { providers: {}, total: 0 };
        allMonths.forEach(function(m) {
            var md = monthlyData[m];
            displayData.total += md.total;
            Object.keys(md.providers).forEach(function(p) {
                if (!displayData.providers[p]) displayData.providers[p] = { total: 0, breakdown: {} };
                displayData.providers[p].total += md.providers[p].total;
            });
        });
        periodLabel = 'Gesamt (' + allMonths.length + ' Monate)';
        perPeriod = ' gesamt';
    }

    var costUsd = displayData.total;
    var costEur = costUsd * 0.92;
    // Gesamtlaufende Kosten inkl. DB-Einträge (wie AssemblyAI)
    var totalRunning = costEur + dbCostsTotal;
    var isMonthly = usagePeriod !== 'total';
    var factor = isMonthly ? 1 : allMonths.length;
    var displayHqSavings = hqSavingsTotal * factor;
    var displayPartnerSavings = partnerSavingsTotal * factor;
    var displayTotalSavings = uniqueSavingsTotal * factor;
    var bilanz = displayTotalSavings - totalRunning * factor;

    // Header
    html += '<div class="flex items-center justify-between mb-5 flex-wrap gap-3">';
    html += '<div><h2 class="text-lg font-bold text-gray-800">Cockpit Betriebskosten</h2>';
    html += '<p class="text-xs text-gray-500">' + periodLabel + '</p></div>';
    html += '<div class="flex items-center gap-2">';
    [{ key:'current', label:'Akt. Monat' }, { key:'last', label:'Letzter Monat' }, { key:'average', label:'\u00D8/Monat' }, { key:'total', label:'Gesamt' }].forEach(function(p) {
        var active = usagePeriod === p.key ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
        html += '<button onclick="setUsagePeriod(\'' + p.key + '\')" class="px-3 py-1.5 rounded-lg text-xs font-semibold ' + active + '">' + p.label + '</button>';
    });
    html += '<button onclick="triggerCostsSync()" class="text-xs text-gray-400 hover:text-vit-orange ml-1" title="Kosten jetzt aktualisieren">&#x21bb;</button>';
    html += '</div></div>';

    // BILANZ
    var bilanzBg = bilanz >= 0 ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50';
    var bilanzTxt = bilanz >= 0 ? 'text-green-700' : 'text-red-700';
    html += '<div class="vit-card p-5 mb-5 border-l-4 ' + bilanzBg + '">';
    html += '<div class="grid grid-cols-3 gap-6 items-center">';
    html += '<div class="text-center"><p class="text-[10px] text-gray-500 uppercase font-semibold mb-1">Laufende Kosten</p><p class="text-2xl font-bold text-red-500">\u20AC' + (totalRunning * factor).toFixed(0) + '</p><p class="text-[10px] text-gray-400">' + perPeriod + '</p></div>';
    html += '<div class="text-center"><p class="text-3xl font-bold text-gray-300">vs.</p></div>';
    html += '<div class="text-center"><p class="text-[10px] text-gray-500 uppercase font-semibold mb-1">Eingesparte Kosten</p><p class="text-2xl font-bold text-green-600">\u20AC' + displayTotalSavings.toFixed(0) + '</p><p class="text-[10px] text-gray-400">' + perPeriod + '</p></div>';
    html += '</div>';
    html += '<div class="border-t mt-4 pt-3 text-center ' + bilanzTxt + '">';
    html += '<p class="text-sm font-bold">' + (bilanz >= 0 ? '\u2705' : '\u26A0\uFE0F') + ' Bilanz: \u20AC' + (bilanz >= 0 ? '+' : '') + bilanz.toFixed(0) + perPeriod + '</p>';
    html += '<p class="text-[10px]">' + (bilanz >= 0 ? 'Das Cockpit spart mehr als es kostet!' : 'Einsparungen decken die Kosten noch nicht.') + '</p>';
    html += '</div></div>';

    // KPIs: Cockpit-Kosten | HQ-Ersparnis | Partner-Ersparnis | Jährlich
    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">';
    html += kpi('Cockpit-Kosten', '\u20AC' + (totalRunning * factor).toFixed(0), perPeriod, 'text-red-500');
    html += kpi('HQ spart', '\u20AC' + displayHqSavings.toFixed(0), hqSavings.length + ' Tools', 'text-blue-600');
    html += kpi('Partner sparen', '\u20AC' + displayPartnerSavings.toFixed(0), partnerSavings.length + ' Tools', 'text-purple-600');
    var yearBilanz = bilanz * (isMonthly ? 12 : 12 / Math.max(allMonths.length, 1));
    html += kpi('Jährlich', '\u20AC' + (yearBilanz >= 0 ? '+' : '') + yearBilanz.toFixed(0), yearBilanz >= 0 ? 'Ersparnis' : 'Mehrkosten', yearBilanz >= 0 ? 'text-green-600' : 'text-red-500');
    html += '</div>';

    // Two columns: Costs | Savings
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">';

    // ── Linke Karte: Laufende Kosten (API-Sync + DB-Einträge) ──
    html += '<div class="vit-card p-5"><h3 class="text-sm font-bold text-gray-800 mb-3">\uD83D\uDCB0 Laufende Kosten</h3>';
    var provOrder = ['vercel','supabase','anthropic','resend'];
    var icons = { vercel:'\u25B2', supabase:'\u26A1', anthropic:'\uD83E\uDD16', resend:'\u2709' };
    var barColors = { vercel:'bg-gray-800', supabase:'bg-green-500', anthropic:'bg-orange-400', resend:'bg-blue-400' };

    // Alle Werte für max-Berechnung inkl. DB-Kosten
    var allCostValues = provOrder.map(function(p){ return displayData.providers[p] ? displayData.providers[p].total * 0.92 : 0; })
        .concat(dbCosts.map(function(s){ return parseFloat(s.kosten_pro_monat||0); }));
    var maxAllCosts = Math.max.apply(null, allCostValues.concat([1]));

    // API-Provider
    provOrder.forEach(function(p) {
        var d = displayData.providers[p] || { total: 0 };
        var eur = d.total * 0.92;
        var pct = maxAllCosts > 0 ? (eur / maxAllCosts * 100) : 0;
        var label = p.charAt(0).toUpperCase() + p.slice(1);
        html += '<div class="mb-3"><div class="flex justify-between items-center mb-1">';
        html += '<span class="text-sm font-semibold text-gray-700">' + (icons[p]||'') + ' ' + label + '</span>';
        html += '<span class="text-sm font-bold text-gray-800">$' + d.total.toFixed(2) + '</span></div>';
        html += '<div class="w-full bg-gray-100 rounded-full h-2.5"><div class="' + (barColors[p]||'bg-gray-400') + ' h-2.5 rounded-full" style="width:' + Math.max(pct,1) + '%"></div></div></div>';
    });

    // Trennlinie vor DB-Kosten (wenn vorhanden)
    if (dbCosts.length > 0) {
        html += '<div class="border-t border-dashed border-gray-200 my-3"></div>';
        html += '<p class="text-[10px] text-gray-400 uppercase font-semibold mb-2">Weitere API-Kosten</p>';
        dbCosts.forEach(function(s) {
            var c = parseFloat(s.kosten_pro_monat||0);
            var pct = maxAllCosts > 0 ? (c / maxAllCosts * 100) : 0;
            html += '<div class="mb-3"><div class="flex justify-between items-center mb-1">';
            html += '<div>';
            html += '<span class="text-sm font-semibold text-gray-700">\uD83C\uDFA4 ' + _escH(s.name) + '</span>';
            if (s.notizen) html += '<br><span class="text-[10px] text-gray-400">' + _escH(s.notizen) + '</span>';
            html += '</div>';
            html += '<div class="flex items-center gap-2">';
            html += '<span class="text-sm font-bold text-gray-800">\u20AC' + c.toFixed(2) + '</span>';
            html += '<button onclick="deleteSaving(\'' + s.id + '\')" title="Entfernen" class="w-5 h-5 flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-red-500 transition text-xs">\u2715</button>';
            html += '</div></div>';
            html += '<div class="w-full bg-gray-100 rounded-full h-2.5"><div class="bg-purple-400 h-2.5 rounded-full" style="width:' + Math.max(pct,1) + '%"></div></div></div>';
        });
    }

    html += '<div class="border-t pt-3 mt-2">';
    html += '<div class="flex justify-between mb-1"><span class="text-xs text-gray-500">API-Kosten (USD)</span><span class="text-xs font-semibold text-gray-700">$' + costUsd.toFixed(2) + ' (\u20AC' + costEur.toFixed(0) + ')</span></div>';
    if (dbCostsTotal > 0) {
        html += '<div class="flex justify-between mb-1"><span class="text-xs text-gray-500">Weitere APIs</span><span class="text-xs font-semibold text-gray-700">\u20AC' + dbCostsTotal.toFixed(2) + '</span></div>';
    }
    html += '<div class="flex justify-between mt-2 pt-2 border-t"><span class="text-sm font-bold">Gesamt</span><span class="text-sm font-bold text-vit-orange">\u20AC' + totalRunning.toFixed(0) + '/Mo</span></div>';
    html += '</div>';

    var lastSync = cache.length > 0 ? cache[0].updated_at : null;
    if (lastSync) {
        var syncDt = new Date(lastSync);
        html += '<p class="text-[9px] text-gray-300 mt-2">Zuletzt aktualisiert: ' + syncDt.toLocaleDateString('de-DE') + ' ' + syncDt.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}) + '</p>';
    }
    html += '</div>';

    // ── Rechte Karte: Eingesparte Software-Kosten ──
    html += '<div class="vit-card p-5">';
    html += '<div class="flex items-center justify-between mb-4">';
    html += '<h3 class="text-sm font-bold text-gray-800">\u2705 Eingesparte Software-Kosten</h3>';
    html += '<button onclick="openSavingModal()" class="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition">+ Tool eintragen</button>';
    html += '</div>';

    if (savings.length === 0) {
        html += '<p class="text-sm text-gray-400 text-center py-6">Noch keine Tools eingetragen</p>';
    } else {
        // ── HQ spart ──
        var hqOnly = savings.filter(function(s){ return s.nutzer_typ === 'hq'; });
        var beideSavings = savings.filter(function(s){ return s.nutzer_typ === 'beide'; });
        var partnerOnly = savings.filter(function(s){ return s.nutzer_typ === 'partner'; });

        if (hqOnly.length > 0 || beideSavings.length > 0) {
            var hqGroup = hqOnly.concat(beideSavings);
            var hqGroupTotal = hqGroup.reduce(function(a,s){return a+parseFloat(s.kosten_pro_monat||0);},0);
            var maxHQ = Math.max.apply(null, hqGroup.map(function(s){return parseFloat(s.kosten_pro_monat||0);}).concat([1]));
            html += '<div class="mb-4">';
            html += '<div class="flex items-center gap-2 mb-2">';
            html += '<span class="text-[10px] text-blue-600 uppercase font-bold bg-blue-50 px-2 py-0.5 rounded-full">\uD83C\uDFE2 HQ spart</span>';
            html += '<span class="text-[10px] text-gray-400 ml-auto font-semibold text-blue-600">\u20AC' + hqGroupTotal.toFixed(0) + '/Mo</span>';
            html += '</div>';
            hqGroup.forEach(function(s) { html += renderSavingRow(s, maxHQ, 'blue'); });
            html += '</div>';
        }

        // ── Partner sparen ──
        if (partnerOnly.length > 0 || beideSavings.length > 0) {
            var partnerGroup = partnerOnly.concat(beideSavings);
            var partnerGroupTotal = partnerGroup.reduce(function(a,s){return a+parseFloat(s.kosten_pro_monat||0);},0);
            var maxPG = Math.max.apply(null, partnerGroup.map(function(s){return parseFloat(s.kosten_pro_monat||0);}).concat([1]));
            html += '<div class="mb-3">';
            html += '<div class="flex items-center gap-2 mb-2">';
            html += '<span class="text-[10px] text-purple-600 uppercase font-bold bg-purple-50 px-2 py-0.5 rounded-full">\uD83C\uDFEA Partner sparen</span>';
            html += '<span class="text-[10px] text-gray-400 ml-auto font-semibold text-purple-600">\u20AC' + partnerGroupTotal.toFixed(0) + '/Mo</span>';
            html += '</div>';
            partnerGroup.forEach(function(s) { html += renderSavingRow(s, maxPG, 'purple'); });
            html += '</div>';
        }

        html += '<div class="border-t pt-3 mt-2 flex justify-between"><span class="text-sm font-bold">Gesamt</span>';
        html += '<span class="text-sm font-bold text-green-600">\u20AC' + uniqueSavingsTotal.toFixed(0) + '/Mo (\u20AC' + (uniqueSavingsTotal*12).toFixed(0) + '/Jahr)</span></div>';
    }
    html += '</div>';

    html += '</div>';

    // Log
    html += renderLogSection(logData);
    container.innerHTML = html;
}

function renderSavingRow(s, maxVal, color) {
    color = color || 'green';
    var colorMap = {
        green: { bar: 'bg-green-400', text: 'text-green-600' },
        blue:  { bar: 'bg-blue-400',  text: 'text-blue-600' },
        purple:{ bar: 'bg-purple-400',text: 'text-purple-600' }
    };
    var cols = colorMap[color] || colorMap.green;
    var c = parseFloat(s.kosten_pro_monat || 0);
    var pct = maxVal > 0 ? (c / maxVal * 100) : 0;
    var beideBadge = s.nutzer_typ === 'beide' ? '<span class="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full ml-1">HQ+Partner</span>' : '';
    var html = '<div class="mb-3"><div class="flex justify-between items-start mb-1">';
    html += '<div class="flex-1 min-w-0"><span class="text-sm font-semibold text-gray-700">' + _escH(s.name) + '</span>' + beideBadge;
    if (s.anzahl_nutzer && s.anzahl_nutzer > 1) {
        html += ' <span class="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full ml-1">' + s.anzahl_nutzer + ' Nutzer</span>';
        html += '<br><span class="text-[10px] text-gray-400">' + s.anzahl_nutzer + ' Nutzer \u00D7 \u20AC' + parseFloat(s.kosten_pro_nutzer||0).toFixed(0) + '/Mo</span>';
    }
    if (s.notizen) html += '<br><span class="text-[10px] text-gray-400">' + _escH(s.notizen) + '</span>';
    html += '</div><div class="flex items-center gap-2 ml-2 shrink-0"><span class="text-sm font-bold ' + cols.text + '">\u20AC' + c.toFixed(0) + '/Mo</span>';
    html += '<button onclick="deleteSaving(\'' + s.id + '\')" title="Tool entfernen" class="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-red-500 transition text-xs font-bold">\u2715</button></div></div>';
    html += '<div class="w-full bg-gray-100 rounded-full h-1.5"><div class="' + cols.bar + ' h-1.5 rounded-full" style="width:' + Math.max(pct,2) + '%"></div></div></div>';
    return html;
}

function renderLogSection(logData) {
    var html = '<div class="vit-card p-5"><h3 class="text-sm font-bold text-gray-800 mb-3">\uD83D\uDCDD KI-API Calls <span class="text-xs text-gray-400 font-normal">(max. 30)</span></h3>';
    html += '<div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="bg-gray-50">';
    html += '<th class="py-1.5 px-2 text-left text-gray-500">Zeit</th><th class="py-1.5 px-2 text-left text-gray-500">Provider</th><th class="py-1.5 px-2 text-left text-gray-500">Function</th><th class="py-1.5 px-2 text-right text-gray-500">Tokens</th><th class="py-1.5 px-2 text-right text-gray-500">Kosten</th>';
    html += '</tr></thead><tbody>';
    if (!logData.length) html += '<tr><td colspan="5" class="py-4 text-center text-gray-400">Noch keine KI-API-Aufrufe</td></tr>';
    logData.forEach(function(l) {
        var dt = new Date(l.created_at);
        var ts = dt.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})+' '+dt.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
        var badge = l.provider==='openai'?'<span class="bg-green-100 text-green-700 px-1 py-0.5 rounded text-[10px] font-bold">OpenAI</span>':'<span class="bg-orange-100 text-orange-700 px-1 py-0.5 rounded text-[10px] font-bold">Anthropic</span>';
        var tok = ((l.input_tokens||0)+(l.output_tokens||0));
        html += '<tr class="border-b border-gray-50"><td class="py-1.5 px-2 text-gray-600">'+ts+'</td><td class="py-1.5 px-2">'+badge+'</td>';
        html += '<td class="py-1.5 px-2"><code class="bg-gray-100 px-1 rounded text-[10px]">'+(l.edge_function||'-')+'</code></td>';
        html += '<td class="py-1.5 px-2 text-right">'+(tok>=1000?(tok/1000).toFixed(1)+'k':tok)+'</td>';
        html += '<td class="py-1.5 px-2 text-right font-semibold">$'+(l.estimated_cost_usd||0).toFixed(4)+'</td></tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
}

// ── Modal ──
window.openSavingModal = function() {
    var existing = document.getElementById('savingModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'savingModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="closeSavingModal()"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div class="flex items-center justify-between mb-5">
                <h2 class="text-base font-bold text-gray-800">Tool eintragen</h2>
                <button onclick="closeSavingModal()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <div class="space-y-4">
                <!-- Tool-Name -->
                <div>
                    <label class="text-xs font-semibold text-gray-500 uppercase mb-1 block">Tool-Name *</label>
                    <input id="sm_name" type="text" placeholder="z.B. Slack, HubSpot, Deskly..."
                        class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-vit-orange">
                </div>

                <!-- Art des Eintrags -->
                <div>
                    <label class="text-xs font-semibold text-gray-500 uppercase mb-1 block">Art des Eintrags</label>
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="setSavingArt('einsparung')" id="sm_art_einsparung"
                            class="sm-art-btn px-3 py-2 rounded-xl border-2 border-orange-400 bg-orange-50 text-xs font-semibold text-vit-orange text-center">
                            ✅ Einsparung<br><span class="font-normal text-gray-400">wird ersetzt</span>
                        </button>
                        <button onclick="setSavingArt('laufende_kosten')" id="sm_art_laufende_kosten"
                            class="sm-art-btn px-3 py-2 rounded-xl border-2 border-gray-200 text-xs font-semibold text-gray-600 hover:border-vit-orange transition text-center">
                            💸 Laufende Kosten<br><span class="font-normal text-gray-400">neu hinzu</span>
                        </button>
                    </div>
                    <input type="hidden" id="sm_typ" value="einsparung">
                </div>

                <!-- Wer spart / nutzt (nur bei Einsparung) -->
                <div id="sm_nutzer_section">
                    <label class="text-xs font-semibold text-gray-500 uppercase mb-1 block">Wer spart?</label>
                    <div class="grid grid-cols-3 gap-2">
                        <button onclick="setSavingTyp('hq')" id="sm_typ_hq"
                            class="sm-typ-btn px-3 py-2 rounded-xl border-2 border-gray-200 text-xs font-semibold text-gray-600 hover:border-vit-orange transition text-center">
                            🏢<br>Nur HQ
                        </button>
                        <button onclick="setSavingTyp('partner')" id="sm_typ_partner"
                            class="sm-typ-btn px-3 py-2 rounded-xl border-2 border-gray-200 text-xs font-semibold text-gray-600 hover:border-vit-orange transition text-center">
                            🏪<br>Partner
                        </button>
                        <button onclick="setSavingTyp('beide')" id="sm_typ_beide"
                            class="sm-typ-btn px-3 py-2 rounded-xl border-2 border-orange-400 bg-orange-50 text-xs font-semibold text-vit-orange text-center">
                            🌐<br>Beide
                        </button>
                    </div>
                    <input type="hidden" id="sm_nutzer_typ" value="beide">
                </div>

                <!-- Betrag + Rhythmus -->
                <div>
                    <label class="text-xs font-semibold text-gray-500 uppercase mb-1 block">Kosten</label>
                    <div class="flex gap-2">
                        <div class="relative flex-1">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                            <input id="sm_betrag" type="number" min="0" step="0.01" placeholder="0,00"
                                oninput="updateSavingCalc()"
                                class="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-vit-orange">
                        </div>
                        <select id="sm_rhythmus" onchange="updateSavingCalc()"
                            class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-vit-orange bg-white">
                            <option value="monatlich">/ Monat</option>
                            <option value="jaehrlich">/ Jahr</option>
                        </select>
                    </div>
                    <div id="sm_calc" class="mt-2 text-xs text-gray-400 text-right hidden">
                        = <span id="sm_calc_val" class="font-semibold text-green-600"></span> / Monat
                    </div>
                </div>

                <!-- Nutzer-Anzahl -->
                <div>
                    <label class="text-xs font-semibold text-gray-500 uppercase mb-1 block">Anzahl Nutzer <span class="font-normal text-gray-400">(optional)</span></label>
                    <div class="flex gap-2 items-center">
                        <input id="sm_nutzer_anzahl" type="number" min="1" step="1" placeholder="z.B. 5"
                            oninput="updateSavingCalc()"
                            class="w-28 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-vit-orange">
                        <span class="text-xs text-gray-400">Nutzer × Betrag = Gesamtkosten</span>
                    </div>
                </div>

                <!-- Notiz -->
                <div>
                    <label class="text-xs font-semibold text-gray-500 uppercase mb-1 block">Notiz <span class="font-normal text-gray-400">(optional)</span></label>
                    <input id="sm_notiz" type="text" placeholder="z.B. ersetzt durch vit:space Office-Modul"
                        class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-vit-orange">
                </div>
            </div>

            <div class="flex gap-3 mt-6">
                <button onclick="closeSavingModal()" class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Abbrechen</button>
                <button onclick="saveSavingModal()" class="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition">✓ Speichern</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

window.closeSavingModal = function() {
    var m = document.getElementById('savingModal');
    if (m) m.remove();
};

window.setSavingArt = function(art) {
    document.getElementById('sm_typ').value = art;
    var nutzerSection = document.getElementById('sm_nutzer_section');
    ['einsparung','laufende_kosten'].forEach(function(a) {
        var btn = document.getElementById('sm_art_' + a);
        if (!btn) return;
        if (a === art) {
            btn.className = 'sm-art-btn px-3 py-2 rounded-xl border-2 border-orange-400 bg-orange-50 text-xs font-semibold text-vit-orange text-center';
        } else {
            btn.className = 'sm-art-btn px-3 py-2 rounded-xl border-2 border-gray-200 text-xs font-semibold text-gray-600 hover:border-vit-orange transition text-center';
        }
    });
    // Wer-spart-Sektion nur bei Einsparungen zeigen
    if (nutzerSection) nutzerSection.style.display = art === 'einsparung' ? '' : 'none';
};

window.setSavingTyp = function(typ) {
    document.getElementById('sm_nutzer_typ').value = typ;
    ['hq','partner','beide'].forEach(function(t) {
        var btn = document.getElementById('sm_typ_' + t);
        if (!btn) return;
        if (t === typ) {
            btn.className = 'sm-typ-btn px-3 py-2 rounded-xl border-2 border-orange-400 bg-orange-50 text-xs font-semibold text-vit-orange text-center';
        } else {
            btn.className = 'sm-typ-btn px-3 py-2 rounded-xl border-2 border-gray-200 text-xs font-semibold text-gray-600 hover:border-vit-orange transition text-center';
        }
    });
};

window.updateSavingCalc = function() {
    var betrag = parseFloat(document.getElementById('sm_betrag').value) || 0;
    var rhythmus = document.getElementById('sm_rhythmus').value;
    var nutzer = parseInt(document.getElementById('sm_nutzer_anzahl').value) || 1;
    var calcEl = document.getElementById('sm_calc');
    var calcVal = document.getElementById('sm_calc_val');
    var monthly = rhythmus === 'jaehrlich' ? betrag / 12 : betrag;
    var total = monthly * nutzer;
    if (betrag > 0 && (rhythmus === 'jaehrlich' || nutzer > 1)) {
        var parts = [];
        if (rhythmus === 'jaehrlich') parts.push('\u20AC' + (betrag/12).toFixed(2) + '/Mo');
        if (nutzer > 1) parts.push('\u00D7 ' + nutzer + ' Nutzer');
        parts.push('= \u20AC' + total.toFixed(2) + '/Mo gesamt');
        calcVal.textContent = parts.join('  ');
        calcEl.classList.remove('hidden');
    } else {
        calcEl.classList.add('hidden');
    }
};

window.saveSavingModal = async function() {
    var name = document.getElementById('sm_name').value.trim();
    var betrag = parseFloat(document.getElementById('sm_betrag').value) || 0;
    var rhythmus = document.getElementById('sm_rhythmus').value;
    var typ = document.getElementById('sm_typ').value;
    var nutzer_typ = document.getElementById('sm_nutzer_typ').value;
    var notiz = document.getElementById('sm_notiz').value.trim();

    if (!name) { _showToast('Tool-Name eingeben', 'error'); return; }
    if (!betrag) { _showToast('Betrag eingeben', 'error'); return; }

    var nutzer_anzahl = parseInt(document.getElementById('sm_nutzer_anzahl').value) || 1;
    var kosten_pro_monat = (rhythmus === 'jaehrlich' ? betrag / 12 : betrag) * nutzer_anzahl;

    var payload = {
        name: name,
        kosten_pro_monat: parseFloat(kosten_pro_monat.toFixed(2)),
        notizen: notiz || null,
        kategorie: 'software',
        nutzer_typ: typ === 'laufende_kosten' ? 'hq' : nutzer_typ,
        abrechnungsrhythmus: rhythmus,
        original_betrag: betrag,
        anzahl_nutzer: nutzer_anzahl,
        typ: typ
    };

    var r = await _sb().from('cockpit_savings').insert(payload);
    if (r.error) {
        if (r.error.code === '42703') {
            // Fallback ohne neue Spalten
            var fallback = { name: payload.name, kosten_pro_monat: payload.kosten_pro_monat, notizen: payload.notizen, kategorie: payload.kategorie };
            r = await _sb().from('cockpit_savings').insert(fallback);
        }
        if (r.error) { _showToast('Fehler: ' + r.error.message, 'error'); return; }
    }

    _showToast(name + ' hinzugefügt!', 'success');
    closeSavingModal();
    window.renderApiNutzung();
};

// CRUD
window.deleteSaving = async function(id) {
    if(!confirm('Eintrag löschen?'))return;
    await _sb().from('cockpit_savings').delete().eq('id',id);
    _showToast('Entfernt','success');
    window.renderApiNutzung();
};
window.triggerCostsSync = async function() {
    _showToast('Aktualisiere Kosten...','info');
    var r = await _sb().functions.invoke('costs-sync',{body:{}});
    if(r.data && r.data.success) { _showToast('Kosten aktualisiert!','success'); window.renderApiNutzung(); }
    else _showToast('Fehler beim Sync','error');
};

function kpi(l,v,s,c){return '<div class="vit-card p-4"><p class="text-[10px] text-gray-400 uppercase font-semibold">'+l+'</p><p class="text-xl font-bold '+(c||'text-gray-800')+'">'+v+'</p><p class="text-[10px] text-gray-500 mt-0.5">'+s+'</p></div>';}

window.setUsagePeriod = function(p){usagePeriod=p;window.renderApiNutzung();};
