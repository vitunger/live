/**
 * views/hq-cockpit.js - HQ Cockpit, Standortdaten, Finanzen, Ads, Marketing
 * @module views/hq-cockpit
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// === HQ STANDORT-DATEN (Netzwerk-weite Kennzahlen) ===
var hqStandorte = [];

export async function loadHqStandorte() {
    try {
        // Load standorte with their BWA and ticket data
        var sResp = await _sb().from('standorte').select('*').order('name');
        if(sResp.error) throw sResp.error;
        var standorte = sResp.data || [];

        // Load BWA data for current year
        var currentYear = new Date().getFullYear();
        var bwaResp = await _sb().from('bwa_daten').select('standort_id, monat, umsatzerloese, rohertrag, wareneinsatz, gesamtkosten, ergebnis_vor_steuern').eq('jahr', currentYear);
        var bwaData = bwaResp.data || [];

        // Load open tickets
        var ticketResp = await _sb().from('support_tickets').select('standort_id').neq('status','geloest');
        var tickets = ticketResp.data || [];

        // Load leads
        var leadResp = await _sb().from('leads').select('standort_id, status, wert');
        var leads = leadResp.data || [];

        // Load verkauf tracking
        var vtResp = await _sb().from('verkauf_tracking').select('standort_id, beratungen, verkauft, umsatz');
        var vtData = vtResp.data || [];

        // Load WaWi Belege (Rechnungen aktuelles Jahr) – neue Datenquelle
        var wawiResp = await _sb().from('wawi_belege')
            .select('standort_id, beleg_typ, endbetrag, ist_leasing, datum, created_at')
            .eq('status', 'neu')
            .gte('datum', currentYear + '-01-01')
            .lte('datum', currentYear + '-12-31');
        var wawiData = wawiResp.data || [];

        // Build hqStandorte array matching old structure
        hqStandorte = standorte.map(function(s) {
            var sBwa = bwaData.filter(function(b) { return b.standort_id === s.id; });
            var totalUmsatz = sBwa.reduce(function(a, b) { return a + (parseFloat(b.umsatzerloese) || 0); }, 0);
            // Rohertrag: absolute value in DB → calculate percentage
            var totalRohertragAbs = sBwa.reduce(function(a, b) { return a + (parseFloat(b.rohertrag) || 0); }, 0);
            var avgRohertrag = totalUmsatz > 0 ? (totalRohertragAbs / totalUmsatz * 100) : 0;
            var sTickets = tickets.filter(function(t) { return t.standort_id === s.id; }).length;
            var sLeads = leads.filter(function(l) { return l.standort_id === s.id; });
            var sVt = vtData.filter(function(v) { return v.standort_id === s.id; });
            var totalBeratungen = sVt.reduce(function(a, v) { return a + (v.beratungen || 0); }, 0);
            var totalVerkauft = sVt.reduce(function(a, v) { return a + (v.verkauft || 0); }, 0);

            // WaWi Belege Auswertung
            var sWawi = wawiData.filter(function(b) { return b.standort_id === s.id; });
            var sRechnungen = sWawi.filter(function(b) { return b.beleg_typ === 'rechnung'; });
            var wawiUmsatz = sRechnungen.reduce(function(a, b) { return a + (parseFloat(b.endbetrag) || 0); }, 0);
            var wawiAnzahl = sWawi.length;
            var wawiLeasingAnzahl = sWawi.filter(function(b) { return b.ist_leasing; }).length;
            var wawiLeasingQuote = wawiAnzahl > 0 ? Math.round(wawiLeasingAnzahl / wawiAnzahl * 100) : 0;
            var wawiLetzer = sWawi.length > 0 ? sWawi.sort(function(a,b){return b.created_at>a.created_at?1:-1;})[0].created_at : null;
            var wawiTageOhne = wawiLetzer ? Math.floor((Date.now() - new Date(wawiLetzer).getTime()) / 86400000) : 999;

            // umsatzIst: BWA hat Priorität, WaWi als Fallback wenn BWA fehlt
            var umsatzIstFinal = totalUmsatz > 0 ? totalUmsatz : wawiUmsatz;
            var leadPerf = s.umsatz_plan_ytd ? Math.round(umsatzIstFinal / s.umsatz_plan_ytd * 100) : 0;

            var auffaellig = null;
            if(avgRohertrag > 0 && avgRohertrag < 34) auffaellig = 'Rohertrag unter 34%';
            if(leadPerf < 50 && leadPerf > 0) auffaellig = (auffaellig ? auffaellig + ', ' : '') + 'Umsatz ' + leadPerf + '% unter Plan';
            if(wawiTageOhne > 14 && wawiAnzahl === 0) auffaellig = (auffaellig ? auffaellig + ', ' : '') + 'Keine WaWi-Belege';

            return {
                id: s.id,
                name: s.name || 'Unbekannt',
                inhaber: s.inhaber_name || '(unbekannt)',
                umsatzPlan: s.umsatz_plan_ytd || 0,
                umsatzIst: umsatzIstFinal,
                umsatzBwa: totalUmsatz,
                umsatzWawi: wawiUmsatz,
                umsatzQuelle: totalUmsatz > 0 ? 'bwa' : (wawiUmsatz > 0 ? 'wawi' : 'keine'),
                rohertrag: parseFloat(avgRohertrag.toFixed(1)),
                leadPerf: leadPerf,
                leads: sLeads.length,
                cpt: sLeads.length > 0 ? Math.round(umsatzIstFinal / sLeads.length) : 0,
                budget: s.marketing_budget || 0,
                vororderStatus: s.vororder_status || 'open',
                vororderBikes: s.vororder_bikes || 0,
                rabattQuote: s.rabatt_quote || 0,
                verkauftKW: totalVerkauft,
                beratungenKW: totalBeratungen,
                offeneTickets: sTickets,
                strategieStatus: s.strategie_status || 'pending',
                bwaAuffaellig: auffaellig,
                region: s.region || '',
                wawiAnzahl: wawiAnzahl,
                wawiUmsatz: wawiUmsatz,
                wawiLeasingQuote: wawiLeasingQuote,
                wawiLeasingAnzahl: wawiLeasingAnzahl,
                wawiTageOhne: wawiTageOhne
            };
        });
    } catch(err) {
        console.warn('HQ Standorte load error:', err);
        // Fallback: empty
        hqStandorte = [];
    }
}

export function perfColor(p) { return p>=100?'text-green-600':p>=75?'text-green-500':p>=50?'text-yellow-600':'text-red-600'; }
export function perfBg(p) { return p>=100?'bg-green-100 text-green-700':p>=75?'bg-green-50 text-green-600':p>=50?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'; }
export function perfDot(p) { return p>=100?'#FBBF24':p>=75?'#22C55E':p>=50?'#F97316':'#EF4444'; }
export function fmt(n) { return n>=1000 ? Math.round(n/1000)+'k' : n.toLocaleString('de-DE'); }
export function stratBadge(s) { var m={done:'✅ Vereinbart',pending:'⏳ Ausstehend',missing:'❌ Fehlt',partial:'🔶 Teilweise'}; var c={done:'bg-green-100 text-green-700',pending:'bg-yellow-100 text-yellow-700',missing:'bg-red-100 text-red-700',partial:'bg-orange-100 text-orange-700'}; return '<span class="text-[10px] px-2 py-0.5 rounded-full font-bold '+(c[s]||c.missing)+'">'+(m[s]||'?')+'</span>'; }

// === HQ COCKPIT ===
export async function renderHqCockpit() {
    if(hqStandorte.length === 0) await loadHqStandorte();
    var active = hqStandorte.filter(function(s){return s.umsatzIst>0;});
    var totalUmsatz = hqStandorte.reduce(function(a,s){return a+s.umsatzIst;},0);
    var totalPlan = hqStandorte.reduce(function(a,s){return a+s.umsatzPlan;},0);
    var avgRohertrag = active.length ? (active.reduce(function(a,s){return a+s.rohertrag;},0)/active.length).toFixed(1) : 0;
    var totalLeads = hqStandorte.reduce(function(a,s){return a+s.leads;},0);
    var kritisch = hqStandorte.filter(function(s){return s.leadPerf<50;}).length;
    var tickets = hqStandorte.reduce(function(a,s){return a+s.offeneTickets;},0);

    // KPIs
    var el = document.getElementById('hqKpiCards');
    if(el) el.innerHTML = '<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Netzwerk-Umsatz YTD</p><p class="text-2xl font-bold text-gray-800">'+fmt(totalUmsatz)+' €</p><p class="text-xs '+(totalUmsatz>=totalPlan?'text-green-600':'text-red-500')+'">Plan: '+fmt(totalPlan)+' €</p></div>'
        +'<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Ø Rohertrag</p><p class="text-2xl font-bold text-gray-800">'+avgRohertrag+'%</p><p class="text-xs text-gray-500">Ziel: ≥ 38%</p></div>'
        +'<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Leads gesamt</p><p class="text-2xl font-bold text-gray-800">'+totalLeads+'</p><p class="text-xs text-gray-500">'+active.length+' aktive Standorte</p></div>'
        +'<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Standorte kritisch</p><p class="text-2xl font-bold '+(kritisch>3?'text-red-600':'text-yellow-600')+'">'+kritisch+' / '+hqStandorte.length+'</p><p class="text-xs text-gray-500">Lead-Performance &lt; 50%</p></div>'
        +'<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Offene Tickets</p><p class="text-2xl font-bold '+(tickets>10?'text-red-600':'text-gray-800')+'">'+tickets+'</p><p class="text-xs text-gray-500">Netzwerk-weit</p></div>';

    // Alert box
    var alerts = hqStandorte.filter(function(s){return s.bwaAuffaellig;});
    var ab = document.getElementById('hqAlertBox');
    if(ab) {
        var ah = '<div class="flex items-center space-x-2 mb-2"><span class="text-lg">🚨</span><span class="font-bold text-red-700">'+alerts.length+' Standorte mit Handlungsbedarf</span></div>';
        ah += '<div class="flex flex-wrap gap-2">';
        alerts.forEach(function(s){ ah += '<span class="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg"><strong>'+s.name+':</strong> '+s.bwaAuffaellig+'</span>'; });
        ah += '</div>';
        ab.innerHTML = ah;
    }

    // Top 5
    var sorted = hqStandorte.slice().sort(function(a,b){return b.leadPerf-a.leadPerf;});
    var t5 = document.getElementById('hqTop5');
    if(t5) {
        var th = '';
        sorted.slice(0,5).forEach(function(s,i){
            th += '<div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"><span class="text-lg font-bold text-gray-300 w-6">'+(i+1)+'</span><div class="flex-1"><p class="text-sm font-semibold">'+s.name+'</p><p class="text-xs text-gray-400">'+s.inhaber+'</p></div><div class="text-right"><p class="font-bold '+perfColor(s.leadPerf)+'">'+s.leadPerf+'%</p><p class="text-xs text-gray-400">'+fmt(s.umsatzIst)+' € Umsatz</p></div></div>';
        });
        t5.innerHTML = th;
    }

    // Bottom 5
    var b5 = document.getElementById('hqBottom5');
    if(b5) {
        var bh = '';
        sorted.slice(-5).reverse().forEach(function(s){
            bh += '<div class="flex items-center space-x-3 p-3 bg-red-50 rounded-lg"><span class="text-lg">⚠️</span><div class="flex-1"><p class="text-sm font-semibold text-red-700">'+s.name+'</p><p class="text-xs text-red-500">'+(s.bwaAuffaellig||'Lead-Performance kritisch')+'</p></div><div class="text-right"><p class="font-bold text-red-600">'+s.leadPerf+'%</p><button class="text-[10px] px-2 py-1 bg-red-600 text-white rounded mt-1" onclick="alert(\'Standort '+s.name+' wird geoeffnet\')">Details →</button></div></div>';
        });
        b5.innerHTML = bh;
    }

    // Grid
    var grid = document.getElementById('hqStandortGrid');
    if(grid) {
        var gh = '';
        sorted.forEach(function(s){
            gh += '<div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:shadow-md transition" onclick="alert(\'Standort '+s.name+' oeffnen\')">'
                +'<div class="flex items-center justify-center space-x-1 mb-1"><span style="width:10px;height:10px;border-radius:50%;background:'+perfDot(s.leadPerf)+';display:inline-block;"></span><span class="text-xs font-semibold text-gray-700 truncate">'+s.name+'</span></div>'
                +'<span class="text-sm font-bold text-gray-800">'+s.leadPerf+'%</span>'
                +'</div>';
        });
        grid.innerHTML = gh;
    }

    // === HOME WIDGETS (rechte Spalte) ===
    // Aktive Kampagnen kompakt
    var hkEl = document.getElementById('hqHomeKampagnen');
    if(hkEl && typeof hqKampagnen !== 'undefined') {
        var hkh = '';
        hqKampagnen.filter(function(k){return k.status==='aktiv';}).forEach(function(k){
            var pct = k.standorte ? Math.round(k.umgesetzt/k.standorte*100) : 0;
            hkh += '<div class="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">';
            hkh += '<div class="flex-1 min-w-0"><p class="text-xs font-semibold text-gray-800 truncate">'+k.name+'</p>';
            hkh += '<div class="w-full bg-gray-200 rounded-full h-1.5 mt-1"><div class="h-1.5 rounded-full '+(pct>=80?'bg-green-500':pct>=50?'bg-yellow-500':'bg-red-400')+'" style="width:'+pct+'%"></div></div></div>';
            hkh += '<span class="text-xs font-bold '+(pct>=80?'text-green-600':'text-orange-500')+'">'+pct+'%</span>';
            hkh += '</div>';
        });
        if(!hkh) hkh = '<p class="text-xs text-gray-400">Keine aktiven Kampagnen</p>';
        hkEl.innerHTML = hkh;
    }

    // Offene Aufgaben kompakt
    var haEl = document.getElementById('hqHomeAufgaben');
    if(haEl && typeof hqTasks !== 'undefined') {
        var hah = '';
        var prioIcons = {hoch:'🔴',mittel:'🟡',niedrig:'🟢'};
        hqTasks.filter(function(t){return t.status!=='done';}).sort(function(a,b){var po={hoch:0,mittel:1,niedrig:2};return (po[a.prio]||1)-(po[b.prio]||1);}).slice(0,5).forEach(function(t){
            var pct = Math.round(t.done/t.total*100);
            hah += '<div class="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">';
            hah += '<span class="text-xs">'+(prioIcons[t.prio]||'')+'</span>';
            hah += '<div class="flex-1 min-w-0"><p class="text-[11px] font-semibold text-gray-800 truncate">'+t.title+'</p>';
            hah += '<p class="text-[9px] text-gray-400">Frist: '+t.deadline+' · '+pct+'% erledigt</p></div>';
            hah += '</div>';
        });
        if(!hah) hah = '<p class="text-xs text-gray-400 text-center">Alles erledigt! ✅</p>';
        haEl.innerHTML = hah;
    }

    // Naechste Termine kompakt
    var htEl = document.getElementById('hqHomeTermine');
    if(htEl && typeof hqKalTermine !== 'undefined') {
        var hth = '';
        var typeIcons = {schulung:'🎓',event:'🎪',deadline:'⏰',meeting:'🤝'};
        hqKalTermine.filter(function(t){return t.date>='2026-02-14';}).sort(function(a,b){return a.date>b.date?1:-1;}).slice(0,5).forEach(function(t){
            hth += '<div class="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">';
            hth += '<span class="text-sm">'+(typeIcons[t.type]||'📅')+'</span>';
            hth += '<div class="flex-1 min-w-0"><p class="text-[11px] font-semibold text-gray-800 truncate">'+t.title+'</p>';
            hth += '<p class="text-[9px] text-gray-400">'+t.date+' · '+t.time+' Uhr'+(t.pflicht?' · <span class="text-red-500">PFLICHT</span>':'')+'</p></div>';
            hth += '</div>';
        });
        if(!hth) hth = '<p class="text-xs text-gray-400 text-center">Keine Termine</p>';
        htEl.innerHTML = hth;
    }

    // Letzte Ankuendigungen kompakt
    var aaEl = document.getElementById('hqHomeAnnounce');
    if(aaEl && typeof hqAnnouncements !== 'undefined') {
        var aah = '';
        hqAnnouncements.slice(0,3).forEach(function(a){
            var readPct = Math.round(a.read/a.total*100);
            aah += '<div class="p-2 bg-gray-50 rounded-lg">';
            aah += '<p class="text-[11px] font-semibold text-gray-800 truncate">'+a.title+'</p>';
            aah += '<div class="flex items-center justify-between mt-1"><p class="text-[9px] text-gray-400">'+a.date+' · '+a.author+'</p>';
            aah += '<span class="text-[9px] font-bold '+(readPct>=90?'text-green-600':'text-orange-500')+'">'+a.read+'/'+a.total+' gelesen</span></div>';
            aah += '</div>';
        });
        aaEl.innerHTML = aah;
    }
}

// === HQ STANDORTE (Detailliste) ===
export async function renderHqStandorte() {
    if(hqStandorte.length === 0) await loadHqStandorte();
    var search = (document.getElementById('hqStandortSearch')||{}).value||'';
    var filter = (document.getElementById('hqStandortFilter')||{}).value||'all';
    var list = hqStandorte.filter(function(s){
        if(search && s.name.toLowerCase().indexOf(search.toLowerCase())===-1) return false;
        if(filter==='kritisch' && s.leadPerf>=50) return false;
        if(filter==='achtung' && (s.leadPerf<50||s.leadPerf>=75)) return false;
        if(filter==='gut' && (s.leadPerf<75||s.leadPerf>=100)) return false;
        if(filter==='top' && s.leadPerf<100) return false;
        return true;
    });
    list.sort(function(a,b){return b.leadPerf-a.leadPerf;});
    var el = document.getElementById('hqStandorteList');
    if(!el) return;
    var h = '';
    list.forEach(function(s) {
        h += '<div class="vit-card p-5 hover:shadow-md transition">';
        h += '<div class="flex items-center justify-between mb-3">';
        h += '<div><h3 class="font-bold text-gray-800">'+s.name+'</h3><p class="text-xs text-gray-400">'+s.inhaber+' · Region: '+s.region+'</p></div>';
        h += '<div class="flex items-center space-x-3">';
        h += stratBadge(s.strategieStatus);
        h += '<span class="'+perfBg(s.leadPerf)+' text-xs px-3 py-1 rounded-full font-bold">'+s.leadPerf+'% Lead-Perf.</span>';
        h += '</div></div>';
        h += '<div class="grid grid-cols-3 md:grid-cols-6 gap-3">';
        h += '<div class="text-center p-2 bg-gray-50 rounded"><p class="text-xs text-gray-400">Umsatz</p><p class="text-sm font-bold">'+fmt(s.umsatzIst)+' €</p><p class="text-[10px] '+(s.umsatzIst>=s.umsatzPlan?'text-green-500':'text-red-500')+'">Plan: '+fmt(s.umsatzPlan)+'</p></div>';
        h += '<div class="text-center p-2 bg-gray-50 rounded"><p class="text-xs text-gray-400">Rohertrag</p><p class="text-sm font-bold '+(s.rohertrag>=38?'text-green-600':'text-red-500')+'">'+s.rohertrag+'%</p></div>';
        h += '<div class="text-center p-2 bg-gray-50 rounded"><p class="text-xs text-gray-400">Leads</p><p class="text-sm font-bold">'+s.leads+'</p><p class="text-[10px] text-gray-400">CPT: '+s.cpt+' €</p></div>';
        h += '<div class="text-center p-2 bg-gray-50 rounded"><p class="text-xs text-gray-400">Rabattquote</p><p class="text-sm font-bold '+(s.rabattQuote<=5?'text-green-600':s.rabattQuote<=8?'text-yellow-600':'text-red-500')+'">'+s.rabattQuote+'%</p></div>';
        h += '<div class="text-center p-2 bg-gray-50 rounded"><p class="text-xs text-gray-400">Vororder</p><p class="text-sm font-bold">'+(s.vororderBikes||'—')+' Bikes</p></div>';
        h += '<div class="text-center p-2 bg-gray-50 rounded"><p class="text-xs text-gray-400">Tickets</p><p class="text-sm font-bold '+(s.offeneTickets>2?'text-red-500':'text-gray-700')+'">'+s.offeneTickets+'</p></div>';
        h += '</div>';
        if(s.bwaAuffaellig) h += '<div class="mt-3 p-2 bg-red-50 rounded text-xs text-red-600">⚠️ '+s.bwaAuffaellig+'</div>';
        h += '<div class="mt-3 pt-3 border-t border-gray-100 flex justify-end"><button onclick="hqDrillDown(\''+s.name.toLowerCase().replace(/[^a-z]/g,'').substring(0,8)+'\')" class="text-xs text-vit-orange hover:text-orange-600 font-semibold flex items-center space-x-1"><span>Standort oeffnen</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button></div>';
        h += '</div>';
    });
    if(!list.length) h = '<div class="text-center py-12 text-gray-400">Keine Standorte gefunden</div>';
    el.innerHTML = h;
}

// === HQ FINANZEN ===
// Moved to hq-finanzen.js (v2 redesign)
// renderHqFinanzen and renderHqWawiUmsatz are now solely in hq-finanzen.js

// === ADS / MARKETING PERFORMANCE ===
var adsCurrentContext = 'standort'; // 'standort' oder 'hq'

export function adsFmtEuro(n) { return Number(n||0).toLocaleString('de-DE', {style:'currency', currency:'EUR', minimumFractionDigits:0, maximumFractionDigits:0}); }
export function adsFmtK(n) { n = Number(n||0); if (n >= 1000000) return (n/1000000).toFixed(1)+'M'; if (n >= 1000) return (n/1000).toFixed(1)+'K'; return n.toString(); }
export function adsSetText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

export async function loadAdsData(context) {
    adsCurrentContext = context || 'standort';
    var suffix = adsCurrentContext === 'hq' ? 'Hq' : '';
    var filterEl = document.getElementById('adsZeitraumFilter' + (suffix || ''));
    var tage = filterEl ? parseInt(filterEl.value) : 30;
    var datumVon = new Date();
    datumVon.setDate(datumVon.getDate() - tage);
    var vonStr = datumVon.toISOString().split('T')[0];

    try {
        var query = _sb().from('ads_performance').select('*').gte('datum', vonStr).order('datum', {ascending: false});
        if (adsCurrentContext !== 'hq' && !_sbProfile().is_hq) {
            query = query.eq('standort_id', _sbProfile().standort_id);
        }
        var res = await query;
        if (res.error) throw res.error;
        adsPerformanceData = res.data || [];

        var kQuery = _sb().from('ads_kampagnen').select('*, standorte(name, stadt)').eq('ist_aktiv', true);
        if (adsCurrentContext !== 'hq' && !_sbProfile().is_hq) kQuery = kQuery.eq('standort_id', _sbProfile().standort_id);
        var kRes = await kQuery;
        adsKampagnenData = kRes.data || [];

        if (_sbProfile().is_hq) {
            var syncRes = await _sb().from('ads_accounts').select('plattform, letzter_sync, sync_status, sync_fehler');
            renderAdsSyncInfo(syncRes.data || [], suffix);
        }

        renderAdsKpis(suffix);
        renderAdsChart(suffix);
        renderAdsKampagnenTabelle(suffix);
        if (adsCurrentContext === 'hq' || _sbProfile().is_hq) renderAdsStandortVergleich(suffix);

        // Auch Performance-Tab KPIs updaten mit echten Daten
        updateMktPerformanceFromAds();

    } catch (e) {
        console.error('loadAdsData:', e);
    }
}

export function renderAdsKpis(suffix) {
    var s = suffix || '';
    var d = adsPerformanceData;
    var totalAusgaben=0, totalImpressions=0, totalKlicks=0, totalConv=0, totalConvWert=0;
    var googleAusgaben=0, googleKlicks=0, googleConv=0, googleKamp=new Set();
    var metaAusgaben=0, metaReichweite=0, metaConv=0, metaKamp=new Set();

    d.forEach(function(r) {
        totalAusgaben += Number(r.ausgaben||0); totalImpressions += Number(r.impressionen||0);
        totalKlicks += Number(r.klicks||0); totalConv += Number(r.conversions||0); totalConvWert += Number(r.conversion_wert||0);
        if (r.plattform==='google') { googleAusgaben+=Number(r.ausgaben||0); googleKlicks+=Number(r.klicks||0); googleConv+=Number(r.conversions||0); googleKamp.add(r.kampagne_id); }
        else { metaAusgaben+=Number(r.ausgaben||0); metaReichweite+=Number(r.reichweite||0); metaConv+=Number(r.conversions||0); metaKamp.add(r.kampagne_id); }
    });
    var ctr = totalImpressions > 0 ? (totalKlicks / totalImpressions * 100).toFixed(2) : '0';
    var cpc = totalKlicks > 0 ? (totalAusgaben / totalKlicks).toFixed(2) : '0';

    adsSetText('adsKpiAusgaben'+s, adsFmtEuro(totalAusgaben));
    adsSetText('adsKpiImpressions'+s, adsFmtK(totalImpressions));
    adsSetText('adsKpiKlicks'+s, adsFmtK(totalKlicks));
    adsSetText('adsKpiCtr'+s, ctr+'%');
    adsSetText('adsKpiCpc'+s, adsFmtEuro(Number(cpc)));
    adsSetText('adsKpiConversions'+s, Math.round(totalConv).toString());
    adsSetText('adsGoogleAusgaben'+s, adsFmtEuro(googleAusgaben));
    adsSetText('adsGoogleKlicks'+s, adsFmtK(googleKlicks));
    adsSetText('adsGoogleConv'+s, Math.round(googleConv).toString());
    adsSetText('adsGoogleKampagnenCount'+s, googleKamp.size+' Kampagnen');
    adsSetText('adsMetaAusgaben'+s, adsFmtEuro(metaAusgaben));
    adsSetText('adsMetaReichweite'+s, adsFmtK(metaReichweite));
    adsSetText('adsMetaConv'+s, Math.round(metaConv).toString());
    adsSetText('adsMetaKampagnenCount'+s, metaKamp.size+' Kampagnen');
}

export function renderAdsChart(suffix) {
    var s = suffix || '';
    var c = document.getElementById('adsChartContainer'+s);
    if (!c) return;
    var tageMap = {};
    adsPerformanceData.forEach(function(r) {
        if (!tageMap[r.datum]) tageMap[r.datum] = {ausgaben:0, klicks:0};
        tageMap[r.datum].ausgaben += Number(r.ausgaben||0);
        tageMap[r.datum].klicks += Number(r.klicks||0);
    });
    var tage = Object.keys(tageMap).sort();
    if (!tage.length) { c.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">Keine Daten im gewählten Zeitraum</p>'; return; }
    var maxAusgaben = Math.max.apply(null, tage.map(function(t){return tageMap[t].ausgaben;}))||1;
    var maxKlicks = Math.max.apply(null, tage.map(function(t){return tageMap[t].klicks;}))||1;
    var sichtbar = tage.slice(-14);
    c.innerHTML = '<div class="flex items-end space-x-1" style="height:120px">'
        + sichtbar.map(function(tag) {
            var d = tageMap[tag];
            var hA = Math.max(4, Math.round(d.ausgaben / maxAusgaben * 100));
            var hK = Math.max(4, Math.round(d.klicks / maxKlicks * 100));
            var tl = new Date(tag+'T00:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
            return '<div class="flex-1 flex flex-col items-center justify-end" title="'+tl+': '+adsFmtEuro(d.ausgaben)+' / '+d.klicks+' Klicks">'
                +'<div class="w-full flex space-x-0.5 justify-center items-end">'
                +'<div class="bg-vit-orange rounded-t" style="width:45%;height:'+hA+'px;opacity:0.8"></div>'
                +'<div class="bg-blue-400 rounded-t" style="width:45%;height:'+hK+'px;opacity:0.7"></div>'
                +'</div><p class="text-[9px] text-gray-400 mt-1 leading-none">'+tl+'</p></div>';
        }).join('') + '</div>'
        +'<div class="flex items-center justify-center space-x-4 mt-3">'
        +'<span class="flex items-center space-x-1 text-xs text-gray-500"><span class="w-3 h-3 rounded bg-vit-orange opacity-80"></span><span>Ausgaben</span></span>'
        +'<span class="flex items-center space-x-1 text-xs text-gray-500"><span class="w-3 h-3 rounded bg-blue-400 opacity-70"></span><span>Klicks</span></span></div>';
}

export function renderAdsKampagnenTabelle(suffix) {
    var s = suffix || '';
    var tbody = document.getElementById('adsKampagnenTabelle'+s);
    if (!tbody) return;
    var kampMap = {};
    adsPerformanceData.forEach(function(r) {
        if (adsPlattformFilter !== 'alle' && r.plattform !== adsPlattformFilter) return;
        var key = r.plattform+'_'+r.kampagne_id;
        if (!kampMap[key]) kampMap[key] = {plattform:r.plattform, name:r.kampagne_name, ausgaben:0, impressionen:0, klicks:0, conversions:0, conversion_wert:0};
        kampMap[key].ausgaben += Number(r.ausgaben||0); kampMap[key].impressionen += Number(r.impressionen||0);
        kampMap[key].klicks += Number(r.klicks||0); kampMap[key].conversions += Number(r.conversions||0); kampMap[key].conversion_wert += Number(r.conversion_wert||0);
    });
    var kampagnen = Object.values(kampMap).sort(function(a,b){return b.ausgaben-a.ausgaben;});
    if (!kampagnen.length) { tbody.innerHTML = '<tr><td colspan="9" class="p-4 text-center text-gray-400">Keine Kampagnen</td></tr>'; return; }
    tbody.innerHTML = kampagnen.map(function(k) {
        var ctr = k.impressionen>0 ? (k.klicks/k.impressionen*100).toFixed(2) : '0.00';
        var cpc = k.klicks>0 ? (k.ausgaben/k.klicks).toFixed(2) : '—';
        var roas = k.ausgaben>0 ? (k.conversion_wert/k.ausgaben).toFixed(1) : '—';
        var pb = k.plattform==='google' ? '<span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Google</span>' : '<span class="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Meta</span>';
        var rc = roas!=='—'&&Number(roas)>=3 ? 'text-green-600 font-bold' : roas!=='—'&&Number(roas)>=1 ? 'text-yellow-600' : 'text-red-500';
        return '<tr class="border-b hover:bg-gray-50"><td class="p-3 font-semibold text-gray-800 max-w-[200px] truncate" title="'+_escH(k.name)+'">'+_escH(k.name)+'</td><td class="p-3 text-center">'+pb+'</td><td class="p-3 text-right font-semibold">'+adsFmtEuro(k.ausgaben)+'</td><td class="p-3 text-right">'+adsFmtK(k.impressionen)+'</td><td class="p-3 text-right">'+adsFmtK(k.klicks)+'</td><td class="p-3 text-right">'+ctr+'%</td><td class="p-3 text-right">'+adsFmtEuro(Number(cpc||0))+'</td><td class="p-3 text-right font-semibold text-green-600">'+Math.round(k.conversions)+'</td><td class="p-3 text-right '+rc+'">'+(roas!=='—'?roas+'x':'—')+'</td></tr>';
    }).join('');
}

export function filterAdsPlattform(filter) {
    adsPlattformFilter = filter;
    document.querySelectorAll('.ads-plattform-filter').forEach(function(btn) {
        btn.className = btn.getAttribute('data-filter')===filter
            ? 'ads-plattform-filter text-xs px-3 py-1 rounded-full bg-vit-orange text-white font-semibold'
            : 'ads-plattform-filter text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-semibold';
    });
    renderAdsKampagnenTabelle(adsCurrentContext==='hq'?'Hq':'');
}

export function renderAdsStandortVergleich(suffix) {
    var s = suffix || '';
    var tbody = document.getElementById('adsStandortTabelle'+s);
    if (!tbody) return;
    var standortMap = {}; var totalAusgaben = 0;
    adsPerformanceData.forEach(function(r) {
        var sid = r.standort_id || 'ohne';
        if (!standortMap[sid]) standortMap[sid] = {name:'Ohne Zuordnung', ausgaben:0, klicks:0, conversions:0, conversion_wert:0};
        standortMap[sid].ausgaben += Number(r.ausgaben||0); standortMap[sid].klicks += Number(r.klicks||0);
        standortMap[sid].conversions += Number(r.conversions||0); standortMap[sid].conversion_wert += Number(r.conversion_wert||0);
        totalAusgaben += Number(r.ausgaben||0);
    });
    // Namen aus Kampagnen-Mapping
    adsKampagnenData.forEach(function(k) {
        if (k.standort_id && standortMap[k.standort_id] && k.standorte) {
            standortMap[k.standort_id].name = k.standorte.name + (k.standorte.stadt ? ' ('+k.standorte.stadt+')' : '');
        }
    });
    // Fallback: Namen aus Kampagnen-Namen parsen
    adsPerformanceData.forEach(function(r) {
        var sid = r.standort_id || 'ohne';
        if (standortMap[sid] && standortMap[sid].name === 'Ohne Zuordnung' && r.kampagne_name) {
            var m = r.kampagne_name.match(/\[vit:bikes\s+([^\]]+)\]/);
            if (m) standortMap[sid].name = 'vit:bikes ' + m[1];
        }
    });
    var standorte = Object.values(standortMap).sort(function(a,b){return b.ausgaben-a.ausgaben;});
    if (!standorte.length) { tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-400">Keine Daten</td></tr>'; return; }
    tbody.innerHTML = standorte.map(function(st) {
        var cpc = st.klicks>0 ? (st.ausgaben/st.klicks).toFixed(2) : '—';
        var roas = st.ausgaben>0 ? (st.conversion_wert/st.ausgaben).toFixed(1) : '—';
        var anteil = totalAusgaben>0 ? Math.round(st.ausgaben/totalAusgaben*100) : 0;
        return '<tr class="border-b hover:bg-gray-50"><td class="p-3 font-semibold text-gray-800">'+_escH(st.name)+'</td><td class="p-3 text-right">'+adsFmtEuro(st.ausgaben)+'</td><td class="p-3 text-right">'+adsFmtK(st.klicks)+'</td><td class="p-3 text-right font-semibold text-green-600">'+Math.round(st.conversions)+'</td><td class="p-3 text-right">'+adsFmtEuro(Number(cpc||0))+'</td><td class="p-3 text-right">'+(roas!=='—'?roas+'x':'—')+'</td><td class="p-3"><div class="w-full bg-gray-200 rounded-full h-2"><div class="bg-vit-orange h-2 rounded-full" style="width:'+anteil+'%"></div></div><span class="text-xs text-gray-500">'+anteil+'%</span></td></tr>';
    }).join('');
}

export function renderAdsSyncInfo(accounts, suffix) {
    var s = suffix || '';
    var el = document.getElementById('adsSyncStatus'+s);
    if (!el || !accounts.length) return;
    el.innerHTML = accounts.map(function(a) {
        var icon = a.sync_status==='success'?'🟢':a.sync_status==='error'?'🔴':'🟡';
        var zeit = a.letzter_sync ? new Date(a.letzter_sync).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : 'nie';
        return icon+' '+a.plattform+': '+zeit;
    }).join(' &nbsp;|&nbsp; ');
}

// Update die bestehenden Performance-Tab KPIs mit echten Ads-Daten
export function updateMktPerformanceFromAds() {
    if (!adsPerformanceData.length) return;
    var totalAusgaben=0, totalImpressions=0, totalKlicks=0, totalConv=0;
    var metaAusgaben=0, metaImpressions=0, metaKlicks=0;
    var googleAusgaben=0, googleImpressions=0, googleKlicks=0;

    adsPerformanceData.forEach(function(r) {
        totalAusgaben+=Number(r.ausgaben||0); totalImpressions+=Number(r.impressionen||0);
        totalKlicks+=Number(r.klicks||0); totalConv+=Number(r.conversions||0);
        if(r.plattform==='meta') { metaAusgaben+=Number(r.ausgaben||0); metaImpressions+=Number(r.impressionen||0); metaKlicks+=Number(r.klicks||0); }
        else { googleAusgaben+=Number(r.ausgaben||0); googleImpressions+=Number(r.impressionen||0); googleKlicks+=Number(r.klicks||0); }
    });

    // Cross-Channel KPIs updaten
    var kpiEl = document.getElementById('mktCrossKpis');
    if (kpiEl) {
        kpiEl.innerHTML = ''
            +'<div class="p-4 bg-gray-50 rounded-lg text-center"><p class="text-xs text-gray-500">Kosten Gesamt</p><p class="text-xl font-bold text-gray-800">'+adsFmtEuro(totalAusgaben)+'</p><p class="text-xs text-green-600">Live-Daten</p></div>'
            +'<div class="p-4 bg-gray-50 rounded-lg text-center"><p class="text-xs text-gray-500">Impressionen Gesamt</p><p class="text-xl font-bold text-gray-800">'+adsFmtK(totalImpressions)+'</p><p class="text-xs text-green-600">Live-Daten</p></div>'
            +'<div class="p-4 bg-gray-50 rounded-lg text-center"><p class="text-xs text-gray-500">Klicks Gesamt</p><p class="text-xl font-bold text-gray-800">'+adsFmtK(totalKlicks)+'</p><p class="text-xs text-green-600">Live-Daten</p></div>'
            +'<div class="p-4 bg-gray-50 rounded-lg text-center"><p class="text-xs text-gray-500">Conversions</p><p class="text-xl font-bold text-vit-orange">'+Math.round(totalConv)+'</p><p class="text-xs text-gray-400">Alle Plattformen</p></div>'
            +'<div class="p-4 bg-gray-50 rounded-lg text-center"><p class="text-xs text-gray-500">CPC</p><p class="text-xl font-bold text-gray-800">'+(totalKlicks>0?adsFmtEuro(totalAusgaben/totalKlicks):'—')+'</p><p class="text-xs text-gray-400">⌀ Kosten/Klick</p></div>'
            +'<div class="p-4 bg-gray-50 rounded-lg text-center"><p class="text-xs text-gray-500">CTR</p><p class="text-xl font-bold text-blue-600">'+(totalImpressions>0?(totalKlicks/totalImpressions*100).toFixed(2):'0')+'%</p><p class="text-xs text-gray-400">Click-Through</p></div>';
    }

    // Meta Kampagnen-Tabelle im Performance-Tab updaten
    var metaTb = document.getElementById('mktMetaKampagnen');
    if (metaTb) {
        var metaKampMap = {};
        adsPerformanceData.filter(function(r){return r.plattform==='meta';}).forEach(function(r) {
            var key = r.kampagne_id;
            if (!metaKampMap[key]) metaKampMap[key] = {name:r.kampagne_name, ausgaben:0, impressionen:0, klicks:0};
            metaKampMap[key].ausgaben+=Number(r.ausgaben||0); metaKampMap[key].impressionen+=Number(r.impressionen||0); metaKampMap[key].klicks+=Number(r.klicks||0);
        });
        var metaKamps = Object.values(metaKampMap).sort(function(a,b){return b.ausgaben-a.ausgaben;});
        var html = metaKamps.map(function(k,i) {
            return '<tr class="border-b"><td class="py-1.5 px-2">'+(i+1)+'.</td><td class="py-1.5 px-2 truncate max-w-[180px]" title="'+_escH(k.name)+'">'+_escH(k.name)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtEuro(k.ausgaben)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(k.impressionen)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(k.klicks)+'</td></tr>';
        }).join('');
        html += '<tr class="bg-blue-50 font-semibold"><td class="py-1.5 px-2" colspan="2">Gesamt</td><td class="py-1.5 px-2 text-right">'+adsFmtEuro(metaAusgaben)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(metaImpressions)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(metaKlicks)+'</td></tr>';
        metaTb.innerHTML = html;
    }

    // Google Kampagnen-Tabelle im Performance-Tab updaten
    var googleTb = document.getElementById('mktGoogleKampagnen');
    if (googleTb) {
        var googleKampMap = {};
        adsPerformanceData.filter(function(r){return r.plattform==='google';}).forEach(function(r) {
            var key = r.kampagne_id;
            if (!googleKampMap[key]) googleKampMap[key] = {name:r.kampagne_name, ausgaben:0, impressionen:0, klicks:0};
            googleKampMap[key].ausgaben+=Number(r.ausgaben||0); googleKampMap[key].impressionen+=Number(r.impressionen||0); googleKampMap[key].klicks+=Number(r.klicks||0);
        });
        var googleKamps = Object.values(googleKampMap).sort(function(a,b){return b.ausgaben-a.ausgaben;});
        if (googleKamps.length) {
            var ghtml = googleKamps.map(function(k,i) {
                return '<tr class="border-b"><td class="py-1.5 px-2">'+(i+1)+'.</td><td class="py-1.5 px-2 truncate max-w-[180px]" title="'+_escH(k.name)+'">'+_escH(k.name)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtEuro(k.ausgaben)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(k.impressionen)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(k.klicks)+'</td></tr>';
            }).join('');
            ghtml += '<tr class="bg-green-50 font-semibold"><td class="py-1.5 px-2" colspan="2">Gesamt</td><td class="py-1.5 px-2 text-right">'+adsFmtEuro(googleAusgaben)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(googleImpressions)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(googleKlicks)+'</td></tr>';
            googleTb.innerHTML = ghtml;
        }
    }
}


// === HQ MARKETING ===
export function renderHqMarketing() {
    var active = hqStandorte.filter(function(s){return s.leads>0;});
    var totalLeads = hqStandorte.reduce(function(a,s){return a+s.leads;},0);
    var totalBudget = hqStandorte.reduce(function(a,s){return a+s.budget;},0);
    var avgCpt = active.length?Math.round(active.reduce(function(a,s){return a+s.cpt;},0)/active.length):0;
    var avgPerf = active.length?Math.round(active.reduce(function(a,s){return a+s.leadPerf;},0)/active.length):0;
    var stratDone = hqStandorte.filter(function(s){return s.strategieStatus==='done';}).length;

    var kpi = document.getElementById('hqMktKpis');
    if(kpi) kpi.innerHTML = '<div class="vit-card p-4"><p class="text-xs text-gray-400">Leads gesamt</p><p class="text-xl font-bold">'+totalLeads+'</p></div>'
        +'<div class="vit-card p-4"><p class="text-xs text-gray-400">Budget/Monat</p><p class="text-xl font-bold">'+fmt(totalBudget)+' €</p></div>'
        +'<div class="vit-card p-4"><p class="text-xs text-gray-400">Ø CPT</p><p class="text-xl font-bold">'+avgCpt+' €</p><p class="text-[10px] text-gray-400">Ziel: &lt;163 €</p></div>'
        +'<div class="vit-card p-4"><p class="text-xs text-gray-400">Ø Lead-Perf.</p><p class="text-xl font-bold '+perfColor(avgPerf)+'">'+avgPerf+'%</p></div>'
        +'<div class="vit-card p-4"><p class="text-xs text-gray-400">Strategie vereinbart</p><p class="text-xl font-bold">'+stratDone+' / '+hqStandorte.length+'</p></div>';

    // Lead Performance
    var lp = document.getElementById('hqMktLeads');
    if(lp) {
        var lph = '';
        hqStandorte.slice().sort(function(a,b){return b.leadPerf-a.leadPerf;}).forEach(function(s){
            var w = Math.min(100, s.leadPerf);
            lph += '<div class="flex items-center space-x-2"><span class="text-xs w-28 truncate">'+s.name+'</span><div class="flex-1 bg-gray-100 rounded-full h-3"><div class="h-3 rounded-full" style="width:'+w+'%;background:'+perfDot(s.leadPerf)+'"></div></div><span class="text-xs font-bold w-10 text-right">'+s.leadPerf+'%</span></div>';
        });
        lp.innerHTML = lph;
    }

    // Strategie Status
    var ms = document.getElementById('hqMktStrategie');
    if(ms) {
        var msh = '';
        hqStandorte.forEach(function(s){
            msh += '<div class="flex items-center justify-between py-1"><span class="text-xs">'+s.name+'</span>'+stratBadge(s.strategieStatus)+'</div>';
        });
        ms.innerHTML = msh;
    }

    // Alerts
    var ma = document.getElementById('hqMktAlerts');
    if(ma) {
        var mah = '';
        hqStandorte.filter(function(s){return s.leadPerf<50;}).sort(function(a,b){return a.leadPerf-b.leadPerf;}).forEach(function(s){
            mah += '<div class="p-3 bg-red-50 rounded-lg"><div class="flex justify-between"><span class="text-sm font-semibold text-red-700">'+s.name+' – '+s.leadPerf+'% Lead-Performance</span><span class="text-xs text-gray-400">CPT: '+s.cpt+' €</span></div><p class="text-xs text-red-500 mt-1">Budget: '+s.budget+' €/Monat · '+s.leads+' Leads · '+(s.strategieStatus==='missing'?'❌ Keine Strategie vereinbart':'Strategie: '+s.strategieStatus)+'</p></div>';
        });
        hqStandorte.filter(function(s){return s.strategieStatus==='missing';}).forEach(function(s){
            if(s.leadPerf>=50) mah += '<div class="p-3 bg-yellow-50 rounded-lg"><span class="text-sm font-semibold text-yellow-700">'+s.name+' – Marketing-Strategie fehlt</span></div>';
        });
        ma.innerHTML = mah || '<p class="text-sm text-green-600">✅ Alle Standorte im gruenen Bereich</p>';
    }
}

// === HQ MARKETING TABS ===
export function showHqMktTab(tabName) {
    document.querySelectorAll('.hqmkt-tab-content').forEach(function(t){t.style.display='none';});
    document.querySelectorAll('.hqmkt-tab-btn').forEach(function(b){b.className='hqmkt-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';});
    var el=document.getElementById('hqMktTab'+tabName.charAt(0).toUpperCase()+tabName.slice(1));
    if(el) el.style.display='block';
    var btn=document.querySelector('.hqmkt-tab-btn[data-hqmkt="'+tabName+'"]');
    if(btn) btn.className='hqmkt-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
    if(tabName==='budgetsteuerung') {} // placeholder - no render needed
    if(tabName==='leadreport') {} // placeholder
    if(tabName==='jahresgespraeche') {} // placeholder
    if(tabName==='handlungsbedarf') {} // placeholder
    if(tabName==='videoFreigabe' && window.vpRenderHqReview) vpRenderHqReview();
}

export function renderHqMktBudget() {
    var tb=document.getElementById('hqMktBudgetTable');
    if(!tb||tb.children.length>0) return;
    // Budget-Daten aus hqStandorte (live aus DB)
    var data = hqStandorte.filter(function(s){ return s.budget > 0; }).sort(function(a,b){ return b.budget - a.budget; });
    if(!data.length) { tb.innerHTML='<tr><td colspan="8" class="py-6 text-center text-gray-400 text-sm">Noch keine Budget-Daten vorhanden. Marketing-Budgets werden über Standort-Einstellungen gepflegt.</td></tr>'; return; }
    var h='';
    data.forEach(function(s,i){
        h+='<tr class="border-b'+(i%2?' bg-gray-50':'')+'"><td class="py-1.5 px-2 font-semibold">'+s.name+'</td><td class="py-1.5 px-2 text-center"><span class="px-1.5 py-0.5 rounded-full text-[10px] bg-green-100 text-green-700">Aktiv</span></td><td class="py-1.5 px-2 text-right font-semibold text-yellow-600">'+fmt(s.budget)+' €/Mo</td><td class="py-1.5 px-2 text-right text-gray-400">—</td><td class="py-1.5 px-2 text-right text-gray-400">—</td><td class="py-1.5 px-2 text-right text-gray-400">—</td><td class="py-1.5 px-2 text-right text-gray-400">—</td><td class="py-1.5 px-2 text-right text-gray-400">—</td></tr>';
    });
    tb.innerHTML=h;
}

export function renderHqMktLeadReport() {
    var el=document.getElementById('hqMktLeadRanking');
    if(!el||el.children.length>0) return;
    var sorted=hqStandorte.slice().sort(function(a,b){return b.leads-a.leads;});
    var h='';
    sorted.forEach(function(s,i){
        var perf=s.leadPerf; var pCol=perf>=80?'bg-green-500':perf>=50?'bg-yellow-500':'bg-red-500';
        h+='<div class="flex items-center space-x-3 py-2 border-b border-gray-50"><span class="text-xs font-bold text-gray-400 w-6">#'+(i+1)+'</span><span class="text-xs w-32 truncate font-semibold">'+s.name+'</span><div class="flex-1 bg-gray-100 rounded-full h-3"><div class="h-3 rounded-full '+pCol+'" style="width:'+Math.min(100,perf)+'%"></div></div><span class="text-xs font-bold w-10 text-right">'+s.leads+'</span><span class="text-xs w-16 text-right '+perfColor(perf)+'">'+perf+'%</span><span class="text-xs w-16 text-right text-gray-400">CPT '+s.cpt+'€</span></div>';
    });
    el.innerHTML=h;
}

export function renderHqMktJahresgespraeche() {
    var el=document.getElementById('hqMktJgTable');
    if(!el||el.children.length>0) return;
    // Live aus hqStandorte - Strategie-Status kommt aus DB
    var data = hqStandorte.slice().sort(function(a,b){
        var o={done:0,partial:1,pending:2,missing:3};
        return (o[a.strategieStatus]||3) - (o[b.strategieStatus]||3);
    });
    if(!data.length) { el.innerHTML='<tr><td colspan="7" class="py-6 text-center text-gray-400 text-sm">Noch keine Standortdaten vorhanden.</td></tr>'; return; }
    var h='';
    var sc={done:'bg-green-100 text-green-700',partial:'bg-yellow-100 text-yellow-700',pending:'bg-gray-100 text-gray-500',missing:'bg-red-100 text-red-700'};
    var sl={done:'✅ Vereinbart',partial:'🔶 In Abstimmung',pending:'⏳ Ausstehend',missing:'❌ Ausstehend'};
    data.forEach(function(s,i){
        h+='<tr class="border-b'+(i%2?' bg-gray-50':'')+'"><td class="py-1.5 px-2 font-semibold">'+s.name+'</td><td class="py-1.5 px-2 text-sm text-gray-500">'+s.inhaber+'</td><td class="py-1.5 px-2 text-sm text-gray-400">—</td><td class="py-1.5 px-2 text-right font-semibold">'+(s.budget?fmt(s.budget)+' €':'—')+'</td><td class="py-1.5 px-2 text-gray-400">—</td><td class="py-1.5 px-2 text-center">—</td><td class="py-1.5 px-2 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-semibold '+(sc[s.strategieStatus]||sc.missing)+'">'+(sl[s.strategieStatus]||'⏳ Ausstehend')+'</span></td></tr>';
    });
    el.innerHTML=h;
}

export function renderHqMktHandlungsbedarf() {
    var el=document.getElementById('hqMktAlertsFull');
    if(!el||el.children.length>0) return;
    var alerts=[];
    hqStandorte.forEach(function(s){
        if(s.leadPerf<30) alerts.push({prio:'kritisch',icon:'🔴',title:s.name+' – Nur '+s.leadPerf+'% Lead-Performance',desc:'Budget: '+s.budget+' €/Mo · '+s.leads+' Leads · CPT: '+s.cpt+' € · Dringend Gespraech fuehren',color:'bg-red-50 border-red-200'});
        else if(s.leadPerf<50) alerts.push({prio:'warnung',icon:'🟡',title:s.name+' – '+s.leadPerf+'% Lead-Performance',desc:'Unter Ziel. Budget-Optimierung pruefen. CPT: '+s.cpt+' €',color:'bg-yellow-50 border-yellow-200'});
        if(s.strategieStatus==='missing') alerts.push({prio:'kritisch',icon:'📋',title:s.name+' – Keine Marketing-Strategie vereinbart',desc:'Jahresgespraech muss noch terminiert werden',color:'bg-red-50 border-red-200'});
    });
    alerts.sort(function(a,b){var p={kritisch:0,warnung:1,info:2};return (p[a.prio]||9)-(p[b.prio]||9);});
    alerts.forEach(function(a){
        h+='<div class="p-4 rounded-lg border '+a.color+'"><div class="flex items-start space-x-3"><span class="text-lg">'+a.icon+'</span><div><p class="text-sm font-semibold text-gray-800">'+a.title+'</p><p class="text-xs text-gray-500 mt-1">'+a.desc+'</p></div></div></div>';
    });
    el.innerHTML=h||'<p class="text-sm text-green-600">✅ Keine offenen Punkte</p>';
    var krit=alerts.filter(function(a){return a.prio==='kritisch';}).length;
    var warn=alerts.filter(function(a){return a.prio==='warnung';}).length;
    var info=alerts.filter(function(a){return a.prio==='info';}).length;
    var ok=hqStandorte.length-krit-warn;
    var setVal=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
    setVal('hqMktAlertKrit',krit); setVal('hqMktAlertWarn',warn); setVal('hqMktAlertInfo',info); setVal('hqMktAlertOk',Math.max(0,ok));
}

export function renderMktSpendingChart() {
    var el=document.getElementById('mktSpendingChart');
    if(!el) return;
    el.innerHTML='<p class="text-sm text-gray-400 text-center py-8">Noch keine Ausgaben-Daten vorhanden.</p>';
}

export function renderMktLeadChart() {
    var el=document.getElementById('mktLeadChart');
    if(!el) return;
    el.innerHTML='<p class="text-sm text-gray-400 text-center py-8">Noch keine Lead-Daten vorhanden.</p>';
}
export function renderHqEinkauf() {
    var totalVO = hqStandorte.reduce(function(a,s){return a+s.vororderBikes;},0);
    var voDone = hqStandorte.filter(function(s){return s.vororderStatus==='done';}).length;
    var voOpen = hqStandorte.filter(function(s){return s.vororderStatus==='open';}).length;
    var avgRab = (hqStandorte.filter(function(s){return s.rabattQuote>0;}).reduce(function(a,s){return a+s.rabattQuote;},0)/hqStandorte.filter(function(s){return s.rabattQuote>0;}).length).toFixed(1);

    var kpi = document.getElementById('hqEkKpis');
    if(kpi) kpi.innerHTML = '<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Vororder Bikes gesamt</p><p class="text-2xl font-bold">'+totalVO+'</p></div>'
        +'<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Vororder abgeschlossen</p><p class="text-2xl font-bold text-green-600">'+voDone+' / '+hqStandorte.length+'</p></div>'
        +'<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Vororder offen</p><p class="text-2xl font-bold '+(voOpen>3?'text-red-600':'text-yellow-600')+'">'+voOpen+'</p></div>'
        +'<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Ø Rabattquote</p><p class="text-2xl font-bold '+(avgRab<=5?'text-green-600':'text-red-500')+'">'+avgRab+'%</p><p class="text-xs text-gray-500">Ziel: unter 5%</p></div>';

    // Vororder
    var vo = document.getElementById('hqEkVororder');
    if(vo) {
        var voh = '';
        hqStandorte.forEach(function(s){
            var vc = {done:'bg-green-100 text-green-700',partial:'bg-yellow-100 text-yellow-700',open:'bg-red-100 text-red-700'};
            var vl = {done:'✅ Abgeschlossen',partial:'🔶 Teilweise',open:'❌ Offen'};
            voh += '<div class="flex items-center justify-between py-1.5 border-b border-gray-50"><span class="text-xs w-28 truncate font-semibold">'+s.name+'</span><span class="text-xs">'+(s.vororderBikes||'—')+' Bikes</span><span class="text-[10px] px-2 py-0.5 rounded-full '+(vc[s.vororderStatus]||vc.open)+'">'+(vl[s.vororderStatus]||'?')+'</span></div>';
        });
        vo.innerHTML = voh;
    }

    // Rohertrag
    var rr = document.getElementById('hqEkRohertrag');
    if(rr) {
        var rrh = '';
        hqStandorte.filter(function(s){return s.rohertrag>0;}).sort(function(a,b){return b.rohertrag-a.rohertrag;}).forEach(function(s){
            rrh += '<div class="flex items-center space-x-2"><span class="text-xs w-28 truncate">'+s.name+'</span><div class="flex-1 bg-gray-100 rounded-full h-3"><div class="h-3 rounded-full '+(s.rohertrag>=38?'bg-green-500':s.rohertrag>=34?'bg-yellow-500':'bg-red-500')+'" style="width:'+Math.max(5,s.rohertrag*2)+'%"></div></div><span class="text-xs font-bold w-12 text-right">'+s.rohertrag+'%</span></div>';
        });
        rr.innerHTML = rrh;
    }

    // Alerts
    var al = document.getElementById('hqEkAlerts');
    if(al) {
        var alh = '';
        hqStandorte.filter(function(s){return s.vororderStatus==='open';}).forEach(function(s){
            alh += '<div class="p-3 bg-red-50 rounded-lg mb-2"><span class="text-sm font-semibold text-red-700">❌ '+s.name+' – Keine Vororder platziert</span><p class="text-xs text-red-500">Dringend Gespraech mit Inhaber fuehren</p></div>';
        });
        hqStandorte.filter(function(s){return s.rabattQuote>8;}).forEach(function(s){
            alh += '<div class="p-3 bg-yellow-50 rounded-lg mb-2"><span class="text-sm font-semibold text-yellow-700">⚠️ '+s.name+' – Rabattquote '+s.rabattQuote+'%</span><p class="text-xs text-yellow-600">Ziel unter 5%. Schulung Dreingaben vs. Rabatte empfohlen.</p></div>';
        });
        al.innerHTML = alh || '<p class="text-sm text-green-600">✅ Alle Standorte im gruenen Bereich</p>';
    }
}



// Strangler Fig
const _exports = {loadHqStandorte,perfColor,perfBg,perfDot,fmt,stratBadge,renderHqCockpit,renderHqStandorte,adsFmtEuro,adsFmtK,adsSetText,loadAdsData,renderAdsKpis,renderAdsChart,renderAdsKampagnenTabelle,filterAdsPlattform,renderAdsStandortVergleich,renderAdsSyncInfo,updateMktPerformanceFromAds,renderHqMarketing,showHqMktTab,renderHqMktBudget,renderHqMktLeadReport,renderHqMktJahresgespraeche,renderHqMktHandlungsbedarf,renderMktSpendingChart,renderMktLeadChart,renderHqEinkauf};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
// [prod] log removed


// === Window Exports (onclick handlers) ===
window.renderHqCockpit = renderHqCockpit;
window.renderHqStandorte = renderHqStandorte;
window.showHqMktTab = showHqMktTab;
