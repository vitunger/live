/**
 * views/nutzung.js - Cockpit Betriebskosten Dashboard (HQ-only)
 * Zeitraeume: Aktueller Monat, Letzter Monat, Pro Monat, Gesamt
 * Gegenuberstellung: Kosten vs. Einsparungen
 * @module views/nutzung
 */
function _sb() { return window.sb; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _escH(s) { var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

var usagePeriod = 'current';

window.renderApiNutzung = async function renderApiNutzung(containerId) {
    var container = document.getElementById(containerId || 'entwKiKostenContent');
    if (!container) return;
    container.innerHTML = '<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div><span class="ml-3 text-gray-500">Lade Betriebskosten...</span></div>';

    try {
        var range = getDateRange(usagePeriod);

        var results = await Promise.allSettled([
            _sb().functions.invoke('cockpit-costs', { body: { from: range.from.toISOString(), to: range.to.toISOString() } }),
            _sb().from('cockpit_savings').select('*').order('kosten_pro_monat', { ascending: false }),
            _sb().from('api_usage_log').select('*').gte('created_at', range.from.toISOString()).order('created_at', { ascending: false }).limit(50)
        ]);

        var costsData = (results[0].status === 'fulfilled' && results[0].value.data && results[0].value.data.success) ? results[0].value.data : null;
        var savings = (results[1].status === 'fulfilled' && results[1].value.data) ? results[1].value.data : [];
        var logData = (results[2].status === 'fulfilled' && results[2].value.data) ? results[2].value.data : [];

        renderDashboard(container, costsData, savings, logData);
    } catch (e) {
        container.innerHTML = '<div class="vit-card p-6 text-center"><p class="text-red-500 font-semibold mb-2">Fehler</p><p class="text-sm text-gray-500">' + (e.message || e) + '</p></div>';
    }
};

function getDateRange(period) {
    var now = new Date();
    var from, to, label, months;
    if (period === 'current') {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = now;
        label = getMonthName(now.getMonth()) + ' ' + now.getFullYear();
        months = 1;
    } else if (period === 'last') {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        label = getMonthName(from.getMonth()) + ' ' + from.getFullYear();
        months = 1;
    } else if (period === 'average') {
        from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        to = now;
        label = '\u00D8 pro Monat (letzte 3 Mon.)';
        months = 3;
    } else {
        from = new Date(2025, 0, 1);
        to = now;
        var diffMs = to.getTime() - from.getTime();
        months = Math.max(1, Math.round(diffMs / (30.44 * 86400000)));
        label = 'Seit Jan. 2025 (' + months + ' Mon.)';
    }
    return { from: from, to: to, label: label, months: months, period: period };
}

function getMonthName(m) {
    return ['Januar','Februar','M\u00e4rz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'][m];
}

function renderDashboard(container, costsData, savings, logData) {
    var html = '';
    var range = getDateRange(usagePeriod);
    var months = range.months;
    var isAverage = usagePeriod === 'average';

    var totalCost = costsData ? costsData.total_usd : 0;
    var monthlyCost = isAverage ? totalCost / months : totalCost;
    var userCount = costsData ? costsData.user_count : 1;
    var providers = costsData ? costsData.providers : [];

    var totalSavingsMonthly = 0;
    savings.forEach(function(s) { totalSavingsMonthly += parseFloat(s.kosten_pro_monat || 0); });
    var savingsForPeriod = isAverage ? totalSavingsMonthly : totalSavingsMonthly * months;
    var displaySavings = isAverage ? totalSavingsMonthly : savingsForPeriod;
    var displayCost = isAverage ? monthlyCost : totalCost;

    // EUR approx conversion
    var costEur = displayCost * 0.92;
    var bilanz = displaySavings - costEur;

    // Header + Period selector
    html += '<div class="flex items-center justify-between mb-6 flex-wrap gap-3">';
    html += '<div><h2 class="text-lg font-bold text-gray-800">Cockpit Betriebskosten</h2>';
    html += '<p class="text-xs text-gray-500">' + range.label + '</p></div>';
    html += '<div class="flex items-center gap-2">';
    var periods = [
        { key: 'current', label: 'Akt. Monat' },
        { key: 'last', label: 'Letzter Monat' },
        { key: 'average', label: '\u00D8 pro Monat' },
        { key: 'total', label: 'Gesamt' }
    ];
    periods.forEach(function(p) {
        var active = usagePeriod === p.key ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
        html += '<button onclick="setUsagePeriod(\'' + p.key + '\')" class="px-3 py-1.5 rounded-lg text-xs font-semibold ' + active + '">' + p.label + '</button>';
    });
    html += '<button onclick="renderApiNutzung()" class="text-xs text-gray-500 hover:text-vit-orange ml-1">&#x21bb;</button>';
    html += '</div></div>';

    // === BILANZ: Kosten vs. Einsparungen ===
    var bilanzColor = bilanz >= 0 ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50';
    var bilanzText = bilanz >= 0 ? 'text-green-700' : 'text-red-700';
    var bilanzIcon = bilanz >= 0 ? '\u2705' : '\u26A0\uFE0F';
    var perPeriod = isAverage ? '/Monat' : (usagePeriod === 'total' ? ' gesamt' : '/Monat');

    html += '<div class="vit-card p-5 mb-6 border-l-4 ' + bilanzColor + '">';
    html += '<div class="grid grid-cols-3 gap-6 items-center">';

    // Kosten
    html += '<div class="text-center">';
    html += '<p class="text-[10px] text-gray-500 uppercase font-semibold mb-1">Laufende Kosten</p>';
    html += '<p class="text-2xl font-bold text-red-500">\u20AC' + costEur.toFixed(0) + '</p>';
    html += '<p class="text-[10px] text-gray-400">' + perPeriod + '</p>';
    html += '</div>';

    // VS
    html += '<div class="text-center">';
    html += '<p class="text-3xl font-bold text-gray-300">vs.</p>';
    html += '</div>';

    // Einsparungen
    html += '<div class="text-center">';
    html += '<p class="text-[10px] text-gray-500 uppercase font-semibold mb-1">Eingesparte Kosten</p>';
    html += '<p class="text-2xl font-bold text-green-600">\u20AC' + displaySavings.toFixed(0) + '</p>';
    html += '<p class="text-[10px] text-gray-400">' + perPeriod + '</p>';
    html += '</div>';

    html += '</div>';

    // Bilanz line
    html += '<div class="border-t mt-4 pt-3 text-center ' + bilanzText + '">';
    html += '<p class="text-sm font-bold">' + bilanzIcon + ' Bilanz: \u20AC' + (bilanz >= 0 ? '+' : '') + bilanz.toFixed(0) + perPeriod + '</p>';
    html += '<p class="text-[10px] ' + (bilanz >= 0 ? 'text-green-600' : 'text-red-600') + '">';
    html += bilanz >= 0 ? 'Das Cockpit spart mehr als es kostet!' : 'Die Einsparungen decken die Kosten noch nicht vollstaendig.';
    html += '</p></div>';
    html += '</div>';

    // KPI Cards
    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
    html += kpiCard('Cockpit-Kosten', '\u20AC' + costEur.toFixed(0), perPeriod, 'text-red-500');
    html += kpiCard('Einsparungen', '\u20AC' + displaySavings.toFixed(0), savings.length + ' Tools ersetzt', 'text-green-600');
    html += kpiCard('Pro Nutzer', '\u20AC' + (costEur / userCount).toFixed(2), userCount + ' Nutzer' + perPeriod, 'text-purple-600');
    html += kpiCard('Jaehrlich', '\u20AC' + ((displaySavings - costEur) * (isAverage || usagePeriod === 'current' || usagePeriod === 'last' ? 12 : 1)).toFixed(0), bilanz >= 0 ? 'Ersparnis/Jahr' : 'Mehrkosten/Jahr', bilanz >= 0 ? 'text-green-600' : 'text-red-500');
    html += '</div>';

    // Two columns
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">';

    // LEFT: Provider costs
    html += '<div class="vit-card p-5">';
    html += '<h3 class="text-sm font-bold text-gray-800 mb-4">\uD83D\uDCB0 Laufende Kosten' + (isAverage ? ' (\u00D8/Monat)' : '') + '</h3>';
    if (providers.length > 0) {
        var displayProviders = providers.map(function(p) {
            return { name: p.name, icon: p.icon, total: isAverage ? p.total / months : p.total, type: p.type, breakdown: p.breakdown };
        });
        var maxCost = Math.max.apply(null, displayProviders.map(function(p) { return p.total; }).concat([1]));
        var colors = { Vercel: 'bg-gray-800', Supabase: 'bg-green-500', Anthropic: 'bg-orange-400', Resend: 'bg-blue-400' };
        displayProviders.forEach(function(p) {
            var pct = maxCost > 0 ? (p.total / maxCost * 100) : 0;
            html += '<div class="mb-3"><div class="flex justify-between items-center mb-1">';
            html += '<span class="text-sm font-semibold text-gray-700">' + p.icon + ' ' + p.name;
            if (p.type === 'fixed') html += ' <span class="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Fix</span>';
            html += '</span><span class="text-sm font-bold text-gray-800">$' + p.total.toFixed(2) + '</span></div>';
            html += '<div class="w-full bg-gray-100 rounded-full h-2.5"><div class="' + (colors[p.name] || 'bg-gray-400') + ' h-2.5 rounded-full" style="width:' + Math.max(pct, 1) + '%"></div></div></div>';
        });
        var dispTotal = isAverage ? totalCost / months : totalCost;
        html += '<div class="border-t border-gray-200 pt-3 mt-2 flex justify-between">';
        html += '<span class="text-sm font-bold text-gray-800">Gesamt</span>';
        html += '<span class="text-sm font-bold text-vit-orange">$' + dispTotal.toFixed(2) + ' <span class="text-xs text-gray-400">(\u20AC' + (dispTotal * 0.92).toFixed(0) + ')</span></span></div>';
    } else {
        html += '<p class="text-sm text-gray-400 text-center py-4">Kostendaten konnten nicht geladen werden</p>';
    }
    html += '</div>';

    // RIGHT: Savings
    html += '<div class="vit-card p-5">';
    html += '<h3 class="text-sm font-bold text-gray-800 mb-3">\u2705 Eingesparte Software-Kosten</h3>';
    if (savings.length > 0) {
        var maxSaving = Math.max.apply(null, savings.map(function(s) { return parseFloat(s.kosten_pro_monat); }).concat([1]));
        savings.forEach(function(s) {
            var cost = parseFloat(s.kosten_pro_monat || 0);
            var pct = maxSaving > 0 ? (cost / maxSaving * 100) : 0;
            html += '<div class="mb-3"><div class="flex justify-between items-center mb-1">';
            html += '<div><span class="text-sm font-semibold text-gray-700">' + _escH(s.name) + '</span>';
            if (s.notizen) html += ' <span class="text-[10px] text-gray-400">' + _escH(s.notizen) + '</span>';
            html += '</div>';
            html += '<div class="flex items-center gap-2"><span class="text-sm font-bold text-green-600">\u20AC' + cost.toFixed(0) + '/Mo</span>';
            html += '<button onclick="deleteSaving(\'' + s.id + '\')" class="text-gray-300 hover:text-red-500 text-xs" title="Entfernen">\u2715</button></div>';
            html += '</div>';
            html += '<div class="w-full bg-gray-100 rounded-full h-2"><div class="bg-green-400 h-2 rounded-full" style="width:' + Math.max(pct, 1) + '%"></div></div></div>';
        });
        html += '<div class="border-t border-gray-200 pt-3 mt-2 flex justify-between">';
        html += '<span class="text-sm font-bold text-gray-800">Gesamt</span>';
        html += '<span class="text-sm font-bold text-green-600">\u20AC' + totalSavingsMonthly.toFixed(0) + '/Monat (\u20AC' + (totalSavingsMonthly * 12).toFixed(0) + '/Jahr)</span></div>';
    } else {
        html += '<p class="text-sm text-gray-400 text-center py-4">Noch keine Eintraege</p>';
    }

    // Add form
    html += '<div class="border-t border-gray-200 mt-4 pt-4">';
    html += '<p class="text-[10px] text-gray-500 mb-2 font-semibold uppercase">Tool hinzufuegen</p>';
    html += '<div class="flex gap-2">';
    html += '<input id="savingName" type="text" placeholder="Tool-Name" class="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2">';
    html += '<input id="savingCost" type="number" placeholder="\u20AC/Mo" class="w-20 text-sm border border-gray-200 rounded-lg px-3 py-2">';
    html += '<button onclick="addSaving()" class="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600">+</button>';
    html += '</div>';
    html += '<input id="savingNotes" type="text" placeholder="Notiz (z.B. ersetzt durch Modul XY)" class="w-full mt-2 text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-500">';
    html += '</div>';
    html += '</div>';

    html += '</div>';

    // Vercel details + Pro-User
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">';

    var vercelProv = providers.find(function(p) { return p.name === 'Vercel'; });
    html += '<div class="vit-card p-5">';
    html += '<h3 class="text-sm font-bold text-gray-800 mb-3">\u25B2 Vercel Details</h3>';
    if (vercelProv) {
        var items = Object.entries(vercelProv.breakdown).filter(function(e) { return e[1] > 0; }).sort(function(a, b) { return b[1] - a[1]; });
        if (items.length === 0) {
            html += '<p class="text-sm text-gray-400 text-center py-4">Keine Vercel-Kosten im Zeitraum</p>';
        } else {
            items.forEach(function(item) {
                var val = isAverage ? item[1] / months : item[1];
                html += '<div class="flex justify-between items-center py-1 border-b border-gray-50">';
                html += '<span class="text-xs text-gray-600">' + item[0] + '</span>';
                html += '<span class="text-xs font-bold text-gray-800">$' + val.toFixed(2) + '</span></div>';
            });
        }
    }
    html += '<div class="mt-3 p-3 bg-yellow-50 rounded-lg">';
    html += '<p class="text-[10px] text-yellow-700"><strong>Tipp:</strong> Build Minutes sind der groesste Kostentreiber. Jeder GitHub-Commit = 1 Build. Aenderungen buendeln spart Geld.</p></div>';
    html += '</div>';

    html += '<div class="vit-card p-5">';
    html += '<h3 class="text-sm font-bold text-gray-800 mb-3">\uD83D\uDC64 Kosten pro Nutzer</h3>';
    var mCost = isAverage ? totalCost / months : totalCost;
    var mCostEur = mCost * 0.92;
    html += '<div class="grid grid-cols-3 gap-4 text-center mb-4">';
    html += '<div><p class="text-2xl font-bold text-gray-800">' + userCount + '</p><p class="text-[10px] text-gray-500">Nutzer</p></div>';
    html += '<div><p class="text-2xl font-bold text-purple-600">\u20AC' + (mCostEur / userCount).toFixed(2) + '</p><p class="text-[10px] text-gray-500">pro Nutzer' + perPeriod + '</p></div>';
    html += '<div><p class="text-2xl font-bold text-green-600">\u20AC' + (mCostEur / 150).toFixed(2) + '</p><p class="text-[10px] text-gray-500">bei 150 Nutzern</p></div>';
    html += '</div>';
    html += '<div class="bg-gray-50 rounded-lg p-3">';
    html += '<p class="text-[10px] text-gray-600">Die Fixkosten (Supabase $25, Vercel Pro $20) bleiben gleich. Nur Build Minutes und API-Calls skalieren mit der Nutzung. Bei 150 Nutzern sinken die Kosten pro Nutzer drastisch.</p>';
    html += '</div></div>';

    html += '</div>';

    // KI-API Logs
    html += renderLogSection(logData);

    container.innerHTML = html;
}

function renderLogSection(logData) {
    var html = '<div class="vit-card p-5">';
    html += '<h3 class="text-sm font-bold text-gray-800 mb-4">\uD83D\uDCDD KI-API Calls <span class="text-xs text-gray-400 font-normal">(max. 50)</span></h3>';
    html += '<div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="bg-gray-50">';
    html += '<th class="py-2 px-2 text-left text-gray-500">Zeitpunkt</th>';
    html += '<th class="py-2 px-2 text-left text-gray-500">Provider</th>';
    html += '<th class="py-2 px-2 text-left text-gray-500">Function</th>';
    html += '<th class="py-2 px-2 text-left text-gray-500">Modul</th>';
    html += '<th class="py-2 px-2 text-right text-gray-500">Input</th>';
    html += '<th class="py-2 px-2 text-right text-gray-500">Output</th>';
    html += '<th class="py-2 px-2 text-right text-gray-500">Kosten</th>';
    html += '<th class="py-2 px-2 text-center text-gray-500">Status</th>';
    html += '</tr></thead><tbody>';
    if (!logData.length) {
        html += '<tr><td colspan="8" class="py-6 text-center text-gray-400">Noch keine KI-API-Aufrufe protokolliert</td></tr>';
    }
    logData.forEach(function(log) {
        var cost = log.estimated_cost_usd || 0;
        var dt = new Date(log.created_at);
        var ts = dt.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})+' '+dt.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
        var badge = log.provider==='openai'?'<span class="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold">OpenAI</span>':'<span class="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Anthropic</span>';
        html += '<tr class="border-b border-gray-50 hover:bg-gray-50">';
        html += '<td class="py-2 px-2 text-gray-600">'+ts+'</td><td class="py-2 px-2">'+badge+'</td>';
        html += '<td class="py-2 px-2"><code class="bg-gray-100 px-1 rounded">'+(log.edge_function||'-')+'</code></td>';
        html += '<td class="py-2 px-2 text-gray-600">'+(log.modul||'-')+'</td>';
        html += '<td class="py-2 px-2 text-right text-gray-600">'+fmtT(log.input_tokens||0)+'</td>';
        html += '<td class="py-2 px-2 text-right text-gray-600">'+fmtT(log.output_tokens||0)+'</td>';
        html += '<td class="py-2 px-2 text-right font-semibold text-gray-800">$'+cost.toFixed(4)+'</td>';
        html += '<td class="py-2 px-2 text-center">'+(log.success!==false?'&#x2705;':'&#x274C;')+'</td></tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
}

// === Savings CRUD ===
window.addSaving = async function() {
    var name = document.getElementById('savingName');
    var cost = document.getElementById('savingCost');
    var notes = document.getElementById('savingNotes');
    if (!name || !name.value.trim()) { _showToast('Bitte Tool-Name eingeben','error'); return; }
    if (!cost || !parseFloat(cost.value)) { _showToast('Bitte Kosten eingeben','error'); return; }
    var resp = await _sb().from('cockpit_savings').insert({ name: name.value.trim(), kosten_pro_monat: parseFloat(cost.value), notizen: notes?notes.value.trim():'' });
    if (resp.error) { _showToast('Fehler: '+resp.error.message,'error'); return; }
    _showToast(name.value.trim()+' hinzugefuegt!','success');
    window.renderApiNutzung();
};

window.deleteSaving = async function(id) {
    if (!confirm('Eintrag wirklich loeschen?')) return;
    var resp = await _sb().from('cockpit_savings').delete().eq('id', id);
    if (resp.error) { _showToast('Fehler: '+resp.error.message,'error'); return; }
    _showToast('Entfernt','success');
    window.renderApiNutzung();
};

// === Helpers ===
function kpiCard(l,v,s,c) { return '<div class="vit-card p-4"><p class="text-[10px] text-gray-400 uppercase font-semibold">'+l+'</p><p class="text-xl font-bold '+(c||'text-gray-800')+'">'+v+'</p><p class="text-[10px] text-gray-500 mt-0.5">'+s+'</p></div>'; }
function fmtT(n) { if(n>=1e6) return (n/1e6).toFixed(1)+'M'; if(n>=1e3) return (n/1e3).toFixed(1)+'k'; return n.toString(); }

window.setUsagePeriod = function(p) { usagePeriod = p; window.renderApiNutzung(); };
window.renderApiNutzung = window.renderApiNutzung;
window.setUsagePeriod = window.setUsagePeriod;
window.addSaving = window.addSaving;
window.deleteSaving = window.deleteSaving;
