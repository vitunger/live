/**
 * views/nutzung.js - Cockpit Betriebskosten Dashboard (HQ-only)
 * Liest aus cockpit_costs_cache (taeglich per Cron gesynct) → sofortiges Laden.
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
        var savings = (results[1].status === 'fulfilled' && results[1].value.data) ? results[1].value.data : [];
        var userCount = (results[2].status === 'fulfilled') ? (results[2].value.count || 1) : 1;
        var logData = (results[3].status === 'fulfilled' && results[3].value.data) ? results[3].value.data : [];

        renderDashboard(container, cache, savings, userCount, logData);
    } catch (e) {
        container.innerHTML = '<div class="vit-card p-6 text-center"><p class="text-red-500 font-semibold">Fehler: ' + (e.message || e) + '</p></div>';
    }
};

function getMonthStr(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function monthLabel(m) { var p = m.split('-'); var names = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']; return names[parseInt(p[1])-1] + ' ' + p[0]; }

function renderDashboard(container, cache, savings, userCount, logData) {
    var html = '';
    var now = new Date();
    var currentMonth = getMonthStr(now);
    var lastMonth = getMonthStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    // Build monthly totals from cache
    var monthlyData = {};
    cache.forEach(function(row) {
        if (!monthlyData[row.monat]) monthlyData[row.monat] = { providers: {}, total: 0 };
        monthlyData[row.monat].providers[row.provider] = { total: parseFloat(row.total_usd || 0), breakdown: row.breakdown || {} };
        monthlyData[row.monat].total += parseFloat(row.total_usd || 0);
    });

    var allMonths = Object.keys(monthlyData).sort().reverse();
    var totalSavingsMonthly = 0;
    savings.forEach(function(s) { totalSavingsMonthly += parseFloat(s.kosten_pro_monat || 0); });

    // Determine display data based on period
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
    var displaySavings = totalSavingsMonthly * (usagePeriod === 'total' ? allMonths.length : 1);
    var bilanz = displaySavings - costEur;
    var isMonthly = usagePeriod !== 'total';

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

    // === BILANZ ===
    var bilanzBg = bilanz >= 0 ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50';
    var bilanzTxt = bilanz >= 0 ? 'text-green-700' : 'text-red-700';
    html += '<div class="vit-card p-5 mb-5 border-l-4 ' + bilanzBg + '">';
    html += '<div class="grid grid-cols-3 gap-6 items-center">';
    html += '<div class="text-center"><p class="text-[10px] text-gray-500 uppercase font-semibold mb-1">Laufende Kosten</p><p class="text-2xl font-bold text-red-500">\u20AC' + costEur.toFixed(0) + '</p><p class="text-[10px] text-gray-400">' + perPeriod + '</p></div>';
    html += '<div class="text-center"><p class="text-3xl font-bold text-gray-300">vs.</p></div>';
    html += '<div class="text-center"><p class="text-[10px] text-gray-500 uppercase font-semibold mb-1">Eingesparte Kosten</p><p class="text-2xl font-bold text-green-600">\u20AC' + displaySavings.toFixed(0) + '</p><p class="text-[10px] text-gray-400">' + perPeriod + '</p></div>';
    html += '</div>';
    html += '<div class="border-t mt-4 pt-3 text-center ' + bilanzTxt + '">';
    html += '<p class="text-sm font-bold">' + (bilanz >= 0 ? '\u2705' : '\u26A0\uFE0F') + ' Bilanz: \u20AC' + (bilanz >= 0 ? '+' : '') + bilanz.toFixed(0) + perPeriod + '</p>';
    html += '<p class="text-[10px]">' + (bilanz >= 0 ? 'Das Cockpit spart mehr als es kostet!' : 'Einsparungen decken die Kosten noch nicht.') + '</p>';
    html += '</div></div>';

    // KPIs
    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">';
    html += kpi('Cockpit-Kosten', '\u20AC' + costEur.toFixed(0), perPeriod, 'text-red-500');
    html += kpi('Einsparungen', '\u20AC' + displaySavings.toFixed(0), savings.length + ' Tools', 'text-green-600');
    html += kpi('Pro Nutzer', '\u20AC' + (isMonthly ? costEur / userCount : costEur / userCount / Math.max(allMonths.length,1)).toFixed(2), userCount + ' Nutzer' + (isMonthly ? '/Mo' : '/Mo \u00D8'), 'text-purple-600');
    var yearBilanz = bilanz * (isMonthly ? 12 : 12 / Math.max(allMonths.length, 1));
    html += kpi('Jaehrlich', '\u20AC' + (yearBilanz >= 0 ? '+' : '') + yearBilanz.toFixed(0), yearBilanz >= 0 ? 'Ersparnis' : 'Mehrkosten', yearBilanz >= 0 ? 'text-green-600' : 'text-red-500');
    html += '</div>';

    // Two columns: Costs | Savings
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">';

    // Costs
    html += '<div class="vit-card p-5"><h3 class="text-sm font-bold text-gray-800 mb-3">\uD83D\uDCB0 Laufende Kosten</h3>';
    var provOrder = ['vercel','supabase','anthropic','resend'];
    var icons = { vercel:'\u25B2', supabase:'\u26A1', anthropic:'\uD83E\uDD16', resend:'\u2709' };
    var barColors = { vercel:'bg-gray-800', supabase:'bg-green-500', anthropic:'bg-orange-400', resend:'bg-blue-400' };
    var maxP = 1;
    provOrder.forEach(function(p) { var d = displayData.providers[p]; if (d && d.total > maxP) maxP = d.total; });
    provOrder.forEach(function(p) {
        var d = displayData.providers[p] || { total: 0 };
        var pct = maxP > 0 ? (d.total / maxP * 100) : 0;
        var label = p.charAt(0).toUpperCase() + p.slice(1);
        html += '<div class="mb-3"><div class="flex justify-between items-center mb-1">';
        html += '<span class="text-sm font-semibold text-gray-700">' + (icons[p]||'') + ' ' + label + '</span>';
        html += '<span class="text-sm font-bold text-gray-800">$' + d.total.toFixed(2) + '</span></div>';
        html += '<div class="w-full bg-gray-100 rounded-full h-2.5"><div class="' + (barColors[p]||'bg-gray-400') + ' h-2.5 rounded-full" style="width:' + Math.max(pct,1) + '%"></div></div></div>';
    });
    html += '<div class="border-t pt-3 mt-2 flex justify-between"><span class="text-sm font-bold">Gesamt</span>';
    html += '<span class="text-sm font-bold text-vit-orange">$' + costUsd.toFixed(2) + ' <span class="text-xs text-gray-400">(\u20AC' + costEur.toFixed(0) + ')</span></span></div>';

    // Cache info
    var lastSync = cache.length > 0 ? cache[0].updated_at : null;
    if (lastSync) {
        var syncDt = new Date(lastSync);
        html += '<p class="text-[9px] text-gray-300 mt-2">Zuletzt aktualisiert: ' + syncDt.toLocaleDateString('de-DE') + ' ' + syncDt.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}) + '</p>';
    }
    html += '</div>';

    // Savings
    html += '<div class="vit-card p-5"><h3 class="text-sm font-bold text-gray-800 mb-3">\u2705 Eingesparte Software-Kosten</h3>';
    if (savings.length > 0) {
        var maxS = Math.max.apply(null, savings.map(function(s){return parseFloat(s.kosten_pro_monat)}).concat([1]));
        savings.forEach(function(s) {
            var c = parseFloat(s.kosten_pro_monat || 0);
            html += '<div class="mb-3"><div class="flex justify-between items-center mb-1">';
            html += '<div><span class="text-sm font-semibold text-gray-700">' + _escH(s.name) + '</span>';
            if (s.notizen) html += ' <span class="text-[10px] text-gray-400">' + _escH(s.notizen) + '</span>';
            html += '</div><div class="flex items-center gap-2"><span class="text-sm font-bold text-green-600">\u20AC' + c.toFixed(0) + '/Mo</span>';
            html += '<button onclick="deleteSaving(\'' + s.id + '\')" class="text-gray-300 hover:text-red-500 text-xs">\u2715</button></div></div>';
            html += '<div class="w-full bg-gray-100 rounded-full h-2"><div class="bg-green-400 h-2 rounded-full" style="width:' + (c/maxS*100) + '%"></div></div></div>';
        });
        html += '<div class="border-t pt-3 mt-2 flex justify-between"><span class="text-sm font-bold">Gesamt</span>';
        html += '<span class="text-sm font-bold text-green-600">\u20AC' + totalSavingsMonthly.toFixed(0) + '/Mo (\u20AC' + (totalSavingsMonthly*12).toFixed(0) + '/Jahr)</span></div>';
    } else {
        html += '<p class="text-sm text-gray-400 text-center py-4">Noch keine Eintraege</p>';
    }
    html += '<div class="border-t mt-4 pt-3"><p class="text-[10px] text-gray-500 mb-2 font-semibold uppercase">Tool hinzufuegen</p>';
    html += '<div class="flex gap-2"><input id="savingName" type="text" placeholder="Tool-Name" class="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5">';
    html += '<input id="savingCost" type="number" placeholder="\u20AC/Mo" class="w-20 text-sm border border-gray-200 rounded-lg px-3 py-1.5">';
    html += '<button onclick="addSaving()" class="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600">+</button></div>';
    html += '<input id="savingNotes" type="text" placeholder="Notiz (z.B. ersetzt durch Modul XY)" class="w-full mt-2 text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500">';
    html += '</div></div>';

    html += '</div>';

    // Log section
    html += renderLogSection(logData);
    container.innerHTML = html;
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

// CRUD
window.addSaving = async function() {
    var n=document.getElementById('savingName'),c=document.getElementById('savingCost'),t=document.getElementById('savingNotes');
    if(!n||!n.value.trim()){_showToast('Name eingeben','error');return;}
    if(!c||!parseFloat(c.value)){_showToast('Kosten eingeben','error');return;}
    var r=await _sb().from('cockpit_savings').insert({name:n.value.trim(),kosten_pro_monat:parseFloat(c.value),notizen:t?t.value.trim():''});
    if(r.error){_showToast('Fehler: '+r.error.message,'error');return;}
    _showToast(n.value.trim()+' hinzugefuegt!','success');
    window.renderApiNutzung();
};
window.deleteSaving = async function(id) {
    if(!confirm('Eintrag loeschen?'))return;
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
