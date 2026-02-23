/**
 * views/verkauf.js - Partner-Portal Verkauf Module
 *
 * Handles: Week view (Verkäufer-Performance), Pipeline, Leads, Jahrestabelle
 *
 * @module views/verkauf
 */
function _sb()        { return window.sb; }
function _sbProfile() { return window.sbProfile; }
function _escH(s)     { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)        { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t){ if (typeof window.showToast === 'function') window.showToast(m,t); }

// === VERKAUF MODULE ===
var verkaufData = {
    sellers: [
        {
            name: 'Sandra', plan_soll: 10, gesamt_ist: 2, verkauft: 1, umsatz_kw: 7091, umsatz_jahr: 16192, vk_jahr: 6,
            daily: [
                {day:'Mo',plan:0,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0},
                {day:'Di',plan:2,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0},
                {day:'Mi',plan:2,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:1,umsatz:5024},
                {day:'Do',plan:2,gesamt:1,geplant:0,spontan:0,online:1,ergo:0,verkauft:1,uebergabe:0,umsatz:2067},
                {day:'Fr',plan:2,gesamt:1,geplant:0,spontan:1,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0},
                {day:'Sa',plan:2,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0}
            ]
        },
        {
            name: 'Thomas', plan_soll: 0, gesamt_ist: 0, verkauft: 0, umsatz_kw: 0, umsatz_jahr: 17419, vk_jahr: 4,
            daily: [
                {day:'Mo',plan:0,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0},
                {day:'Di',plan:0,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0},
                {day:'Mi',plan:0,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0},
                {day:'Do',plan:0,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0},
                {day:'Fr',plan:0,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0},
                {day:'Sa',plan:0,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0}
            ]
        },
        {
            name: 'Dirk', plan_soll: 15, gesamt_ist: 2, verkauft: 0, umsatz_kw: 8569, umsatz_jahr: 36629, vk_jahr: 6,
            daily: [
                {day:'Mo',plan:0,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0},
                {day:'Di',plan:3,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:253},
                {day:'Mi',plan:3,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:4801},
                {day:'Do',plan:3,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:1,umsatz:59},
                {day:'Fr',plan:3,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:1,umsatz:3456},
                {day:'Sa',plan:3,gesamt:2,geplant:0,spontan:2,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0}
            ]
        },
        {
            name: 'Max', plan_soll: 0, gesamt_ist: 0, verkauft: 0, umsatz_kw: 1396, umsatz_jahr: 3813, vk_jahr: 0,
            daily: [
                {day:'Mo',plan:0,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0},
                {day:'Di',plan:0,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0},
                {day:'Mi',plan:0,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:737},
                {day:'Do',plan:0,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0},
                {day:'Fr',plan:0,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0},
                {day:'Sa',plan:0,gesamt:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:659}
            ]
        }
    ],
    jahres: [
        {monat:'Januar',plan:57025,ist:57025,termine_soll:24,termine_ist:12,verkauft:11,quote:92,avg:5184},
        {monat:'Februar',plan:77734,ist:17057,termine_soll:32,termine_ist:8,verkauft:5,quote:63,avg:3411},
        {monat:'Maerz',plan:150406,ist:0,termine_soll:62,termine_ist:0,verkauft:0,quote:0,avg:0},
        {monat:'April',plan:121269,ist:0,termine_soll:50,termine_ist:0,verkauft:0,quote:0,avg:0},
        {monat:'Mai',plan:163470,ist:0,termine_soll:68,termine_ist:0,verkauft:0,quote:0,avg:0},
        {monat:'Juni',plan:157808,ist:0,termine_soll:65,termine_ist:0,verkauft:0,quote:0,avg:0},
        {monat:'Juli',plan:138764,ist:0,termine_soll:57,termine_ist:0,verkauft:0,quote:0,avg:0},
        {monat:'August',plan:76258,ist:0,termine_soll:32,termine_ist:0,verkauft:0,quote:0,avg:0},
        {monat:'September',plan:86544,ist:0,termine_soll:36,termine_ist:0,verkauft:0,quote:0,avg:0},
        {monat:'Oktober',plan:73018,ist:0,termine_soll:30,termine_ist:0,verkauft:0,quote:0,avg:0},
        {monat:'November',plan:40796,ist:0,termine_soll:17,termine_ist:0,verkauft:0,quote:0,avg:0},
        {monat:'Dezember',plan:24597,ist:0,termine_soll:10,termine_ist:0,verkauft:0,quote:0,avg:0}
    ],
    pipeline: [
        {id:1,name:'Fam. Mueller',type:'E-Bike Trekking',seller:'Sandra',value:4500,stage:'termin',date:'17.02.'},
        {id:2,name:'Hr. Schneider',type:'E-Bike MTB',seller:'Dirk',value:5200,stage:'beratung',date:'15.02.'},
        {id:3,name:'Fr. Weber',type:'E-Bike City',seller:'Sandra',value:3200,stage:'angebot',date:'14.02.'},
        {id:4,name:'Hr. Becker',type:'Rennrad',seller:'Thomas',value:2800,stage:'angebot',date:'13.02.'},
        {id:5,name:'Fam. Schmidt',type:'E-Bike Cargo',seller:'Dirk',value:6500,stage:'lead',date:'16.02.'},
        {id:6,name:'Fr. Klein',type:'E-Bike Trekking',seller:'Sandra',value:3800,stage:'termin',date:'18.02.'},
        {id:7,name:'Hr. Wagner',type:'MTB',seller:'Thomas',value:1900,stage:'lead',date:'16.02.'},
        {id:8,name:'Fr. Hoffmann',type:'E-Bike City',seller:'Dirk',value:3400,stage:'beratung',date:'14.02.'},
        {id:9,name:'Hr. Braun',type:'E-Bike Trekking',seller:'Sandra',value:4200,stage:'verkauft',date:'12.02.'},
        {id:10,name:'Fr. Richter',type:'E-Bike MTB',seller:'Dirk',value:5800,stage:'verkauft',date:'11.02.'},
        {id:11,name:'Hr. Wolf',type:'E-Bike City',seller:'Thomas',value:2900,stage:'verkauft',date:'10.02.'},
        {id:12,name:'Fam. Koch',type:'E-Bike Trekking',seller:'Dirk',value:4100,stage:'uebergabe',date:'08.02.'},
        {id:13,name:'Hr. Neumann',type:'Rennrad',seller:'Thomas',value:3200,stage:'verloren',date:'09.02.'},
        {id:14,name:'Fr. Schwarz',type:'E-Bike City',seller:'Sandra',value:2700,stage:'verloren',date:'07.02.'}
    ]
};

var pipelineStages = [
    {id:'lead',label:'Lead',color:'bg-gray-100 border-gray-300'},
    {id:'termin',label:'Termin gebucht',color:'bg-blue-50 border-blue-300'},
    {id:'beratung',label:'In Beratung',color:'bg-yellow-50 border-yellow-300'},
    {id:'angebot',label:'Angebot',color:'bg-purple-50 border-purple-300'},
    {id:'verkauft',label:'Verkauft',color:'bg-green-50 border-green-300'},
    {id:'uebergabe',label:'Uebergabe',color:'bg-emerald-50 border-emerald-300'},
    {id:'verloren',label:'Nicht gekauft',color:'bg-red-50 border-red-300'}
];

export function renderWeekView() {
    var filter = document.getElementById('weekSellerFilter').value;
    var sellers = filter === 'all' ? verkaufData.sellers : verkaufData.sellers.filter(function(s){return s.name === filter;});
    
    // Calculate KPIs
    var totalPlan = 0, totalGesamt = 0, totalVerkauft = 0, totalUmsatz = 0;
    sellers.forEach(function(s) {
        totalPlan += s.plan_soll;
        s.daily.forEach(function(d) {
            totalGesamt += d.gesamt;
            totalVerkauft += d.verkauft;
            totalUmsatz += d.umsatz;
        });
    });
    document.getElementById('wkPlan').textContent = totalPlan;
    document.getElementById('wkGesamt').textContent = totalGesamt;
    document.getElementById('wkVerkauft').textContent = totalVerkauft;
    document.getElementById('wkUmsatz').textContent = totalUmsatz.toLocaleString('de-DE') + ' \u20AC';
    var quoteVal = totalGesamt > 0 ? Math.round((totalVerkauft/totalGesamt)*100) : 0;
    var quoteEl = document.getElementById('wkQuote');
    quoteEl.textContent = quoteVal + '%';
    quoteEl.className = 'text-2xl font-bold ' + (quoteVal >= 70 ? 'text-green-600' : quoteVal >= 40 ? 'text-orange-600' : 'text-red-600');

    // Render seller tables
    var container = document.getElementById('weekSellerTables');
    var html = '';
    sellers.forEach(function(s) {
        var sUmsatz = 0, sGesamt = 0, sVerkauft = 0;
        s.daily.forEach(function(d) { sUmsatz += d.umsatz; sGesamt += d.gesamt; sVerkauft += d.verkauft; });
        var sQuote = sGesamt > 0 ? Math.round((sVerkauft/sGesamt)*100) : 0;

        html += '<div class="vit-card overflow-hidden">';
        html += '<div class="flex items-center justify-between p-4 bg-gray-50 border-b">';
        html += '<div class="flex items-center space-x-3"><div class="w-8 h-8 bg-vit-orange rounded-full flex items-center justify-center text-white font-bold text-sm">' + s.name.charAt(0) + '</div>';
        html += '<div><p class="font-semibold text-gray-800">' + s.name + '</p><p class="text-xs text-gray-500">Plan: ' + s.plan_soll + ' Termine</p></div></div>';
        html += '<div class="flex space-x-4 text-center">';
        html += '<div><p class="text-xs text-gray-500">Beratungen</p><p class="font-bold text-blue-600">' + sGesamt + '</p></div>';
        html += '<div><p class="text-xs text-gray-500">Verkauft</p><p class="font-bold text-green-600">' + sVerkauft + '</p></div>';
        html += '<div><p class="text-xs text-gray-500">Umsatz</p><p class="font-bold text-vit-orange">' + sUmsatz.toLocaleString('de-DE') + ' \u20AC</p></div>';
        html += '<div><p class="text-xs text-gray-500">Quote</p><p class="font-bold ' + (sQuote >= 70 ? 'text-green-600' : sQuote >= 40 ? 'text-orange-600' : 'text-red-600') + '">' + sQuote + '%</p></div>';
        html += '</div></div>';

        // Daily table
        html += '<div class="overflow-x-auto"><table class="w-full text-sm">';
        html += '<thead><tr class="bg-gray-50 text-xs"><th class="py-2 px-3 text-left text-gray-500">Tag</th><th class="py-2 px-3 text-center text-gray-500">Plan</th><th class="py-2 px-3 text-center text-blue-600">Geplant</th><th class="py-2 px-3 text-center text-purple-600">Spontan</th><th class="py-2 px-3 text-center text-cyan-600">Online</th><th class="py-2 px-3 text-center text-pink-600">Ergo</th><th class="py-2 px-3 text-center font-bold text-gray-700">Gesamt</th><th class="py-2 px-3 text-center text-green-600">Verkauft</th><th class="py-2 px-3 text-center text-gray-500">Uebergabe</th><th class="py-2 px-3 text-right text-vit-orange">Umsatz</th></tr></thead>';
        html += '<tbody>';
        s.daily.forEach(function(d) {
            var total = d.geplant + d.spontan + d.online + d.ergo;
            var hasData = d.plan > 0 || total > 0 || d.umsatz > 0;
            html += '<tr class="border-b ' + (hasData ? '' : 'text-gray-300') + '">';
            html += '<td class="py-2 px-3 font-semibold">' + d.day + '</td>';
            html += '<td class="py-2 px-3 text-center">' + (d.plan || '-') + '</td>';
            html += '<td class="py-2 px-3 text-center text-blue-600">' + (d.geplant || '-') + '</td>';
            html += '<td class="py-2 px-3 text-center text-purple-600">' + (d.spontan || '-') + '</td>';
            html += '<td class="py-2 px-3 text-center text-cyan-600">' + (d.online || '-') + '</td>';
            html += '<td class="py-2 px-3 text-center text-pink-600">' + (d.ergo || '-') + '</td>';
            html += '<td class="py-2 px-3 text-center font-bold">' + (total || '-') + '</td>';
            html += '<td class="py-2 px-3 text-center text-green-600 font-bold">' + (d.verkauft || '-') + '</td>';
            html += '<td class="py-2 px-3 text-center">' + (d.uebergabe || '-') + '</td>';
            html += '<td class="py-2 px-3 text-right font-semibold ' + (d.umsatz > 0 ? 'text-vit-orange' : '') + '">' + (d.umsatz > 0 ? d.umsatz.toLocaleString('de-DE') + ' \u20AC' : '-') + '</td>';
            html += '</tr>';
        });
        html += '</tbody></table></div></div>';
    });
    container.innerHTML = html;
}

export function renderPipeline() {
    var filterEl = document.getElementById('pipelineFilter');
    if(!filterEl) return; // React pipeline active, skip legacy render
    var filter = filterEl.value;
    var leads = filter === 'all' ? verkaufData.pipeline : verkaufData.pipeline.filter(function(l){return l.seller === filter;});
    var board = document.getElementById('kanbanBoard');
    var html = '';

    pipelineStages.forEach(function(stage) {
        var stageLeads = leads.filter(function(l){return l.stage === stage.id;});
        var stageValue = 0;
        stageLeads.forEach(function(l){stageValue += l.value;});

        html += '<div class="min-w-[220px] flex-shrink-0">';
        html += '<div class="mb-3 flex items-center justify-between">';
        html += '<h3 class="font-semibold text-gray-700 text-sm">' + stage.label + '</h3>';
        html += '<span class="text-xs font-bold bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">' + stageLeads.length + '</span>';
        html += '</div>';
        html += '<div class="space-y-2 min-h-[100px] p-2 rounded-lg border-2 border-dashed ' + stage.color + '">';

        stageLeads.forEach(function(lead) {
            html += '<div class="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition">';
            html += '<div class="flex items-center justify-between mb-1"><p class="font-semibold text-gray-800 text-sm">' + lead.name + '</p></div>';
            html += '<p class="text-xs text-gray-500">' + lead.type + '</p>';
            html += '<div class="flex items-center justify-between mt-2">';
            html += '<span class="text-xs text-gray-400">' + lead.seller + ' · ' + lead.date + '</span>';
            html += '<span class="text-sm font-bold text-vit-orange">' + lead.value.toLocaleString('de-DE') + ' \u20AC</span>';
            html += '</div>';
            // Stage move buttons
            var stageIdx = -1;
            for(var si=0;si<pipelineStages.length;si++){if(pipelineStages[si].id===lead.stage)stageIdx=si;}
            html += '<div class="flex space-x-1 mt-2">';
            if(stageIdx > 0) html += '<button onclick="moveLead('+lead.id+',\'' + pipelineStages[stageIdx-1].id + '\')" class="flex-1 text-xs py-1 bg-gray-100 rounded hover:bg-gray-200">&#9664;</button>';
            if(stageIdx < pipelineStages.length-1) html += '<button onclick="moveLead('+lead.id+',\'' + pipelineStages[stageIdx+1].id + '\')" class="flex-1 text-xs py-1 bg-gray-100 rounded hover:bg-gray-200">&#9654;</button>';
            html += '</div>';
            html += '</div>';
        });

        if(stageLeads.length > 0) {
            html += '<div class="text-center text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">' + stageValue.toLocaleString('de-DE') + ' \u20AC</div>';
        }
        html += '</div></div>';
    });
    board.innerHTML = html;
}

export function moveLead(id, newStage) {
    for(var i=0; i<verkaufData.pipeline.length; i++) {
        if(verkaufData.pipeline[i].id === id) {
            verkaufData.pipeline[i].stage = newStage;
            break;
        }
    }
    renderPipeline();
}

export function showNewLeadModal() {
    document.getElementById('newLeadModal').classList.remove('hidden');
}

export async function addNewLead() {
    var nameVal = document.getElementById('leadName').value || 'Neuer Kunde';
    var type = document.getElementById('leadType').value;
    var value = parseInt(document.getElementById('leadValue').value) || 3000;
    var notes = document.getElementById('leadNotes') ? document.getElementById('leadNotes').value : '';

    if(!sbUser) { alert('Nicht eingeloggt.'); return; }

    var nameParts = nameVal.trim().split(' ');
    var vorname = nameParts[0] || nameVal;
    var nachname = nameParts.slice(1).join(' ') || '';

    try {
        var resp = await _sb().from('leads').insert({
            standort_id: _sbProfile().standort_id,
            erstellt_von: sbUser.id,
            vorname: vorname,
            nachname: nachname,
            interesse: type,
            geschaetzter_wert: value,
            notizen: notes,
            status: 'neu',
            quelle: 'walk_in',
            prioritaet: 'mittel'
        });
        if(resp.error) throw resp.error;
        triggerPushStandort('🎯 Neuer Lead', vorname + ' ' + nachname + ' – ' + (type||'Interesse'), '/?view=verkauf', 'push_lead_aktivitaet');

        document.getElementById('newLeadModal').classList.add('hidden');
        document.getElementById('leadName').value = '';
        document.getElementById('leadValue').value = '';
        if(document.getElementById('leadNotes')) document.getElementById('leadNotes').value = '';
        await loadPipelineFromSupabase();
    } catch(err) {
        alert('Fehler: ' + err.message);
    }
}

export async function renderJahresTabelle() {
    var tbody = document.getElementById('jahresTabelle');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-400">Lade Daten...</td></tr>';
    
    var sb = window.sb || window.supabase;
    var profile = window.sbProfile;
    if(!sb || !profile) { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-400">Keine Verbindung</td></tr>'; return; }
    
    var stdId = profile.standort_id;
    var yr = new Date().getFullYear();
    var curMonth = new Date().getMonth(); // 0-indexed
    var monatsNamen = ['Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    
    // Load verkauf_tracking for this year + standort
    var trackingData = {};
    try {
        var q = sb.from('verkauf_tracking').select('datum, geplant, spontan, ergo, verkauft, umsatz')
            .gte('datum', yr + '-01-01').lte('datum', yr + '-12-31');
        if(stdId && !profile.is_hq) q = q.eq('standort_id', stdId);
        var resp = await q;
        if(resp.data) {
            resp.data.forEach(function(r) {
                var m = new Date(r.datum).getMonth();
                if(!trackingData[m]) trackingData[m] = {beratungen:0, verkauft:0, umsatz:0};
                trackingData[m].beratungen += (r.geplant||0) + (r.spontan||0) + (r.ergo||0);
                trackingData[m].verkauft += (r.verkauft||0);
                trackingData[m].umsatz += parseFloat(r.umsatz||0);
            });
        }
    } catch(e) { console.warn('[Auswertung] Tracking error:', e); }
    
    // Load jahresplan for plan data
    var planData = {};
    try {
        if(stdId) {
            var jpResp = await sb.from('jahresplaene').select('plan_daten').eq('standort_id', stdId).eq('jahr', yr).single();
            if(jpResp.data && jpResp.data.plan_daten) {
                for(var i = 1; i <= 12; i++) {
                    var mp = jpResp.data.plan_daten[String(i)] || jpResp.data.plan_daten[i] || {};
                    planData[i-1] = { umsatz: mp.umsatz || 0 };
                }
            }
        }
    } catch(e) { console.warn('[Auswertung] Jahresplan error:', e); }
    
    // Render table
    var html = '';
    var totals = {beratungen:0, verkauft:0, umsatz:0, plan:0};
    
    for(var i = 0; i < 12; i++) {
        var td = trackingData[i] || {beratungen:0, verkauft:0, umsatz:0};
        var plan = planData[i] ? planData[i].umsatz : 0;
        var isCurrent = (i === curMonth);
        var isFuture = i > curMonth && td.beratungen === 0 && td.verkauft === 0;
        var quote = td.beratungen > 0 ? Math.round((td.verkauft / td.beratungen) * 100) : 0;
        var avg = td.verkauft > 0 ? Math.round(td.umsatz / td.verkauft) : 0;
        
        totals.beratungen += td.beratungen;
        totals.verkauft += td.verkauft;
        totals.umsatz += td.umsatz;
        totals.plan += plan;
        
        html += '<tr class="border-b ' + (isCurrent ? 'bg-blue-50 border-l-4 border-blue-400' : '') + ' ' + (isFuture ? 'text-gray-400' : '') + '">';
        html += '<td class="py-2.5 px-3 font-semibold">' + monatsNamen[i] + '</td>';
        html += '<td class="text-right py-2.5 px-3">' + (td.beratungen > 0 ? td.beratungen : '\u2014') + '</td>';
        html += '<td class="text-right py-2.5 px-3 font-bold text-green-600">' + (td.verkauft > 0 ? td.verkauft : '\u2014') + '</td>';
        html += '<td class="text-right py-2.5 px-3 ' + (quote >= 70 ? 'text-green-600' : quote > 0 ? 'text-orange-600' : '') + '">' + (quote > 0 ? quote + '%' : '\u2014') + '</td>';
        html += '<td class="text-right py-2.5 px-3">' + (td.umsatz > 0 ? Math.round(td.umsatz).toLocaleString('de-DE') + ' \u20AC' : '\u2014') + '</td>';
        html += '<td class="text-right py-2.5 px-3">' + (avg > 0 ? avg.toLocaleString('de-DE') + ' \u20AC' : '\u2014') + '</td>';
        html += '</tr>';
    }
    
    // Totals row
    var totalQuote = totals.beratungen > 0 ? Math.round((totals.verkauft / totals.beratungen) * 100) : 0;
    var totalAvg = totals.verkauft > 0 ? Math.round(totals.umsatz / totals.verkauft) : 0;
    html += '<tr class="bg-gray-100 border-t-2"><td class="py-3 px-3 font-bold">GESAMT</td>';
    html += '<td class="text-right py-3 px-3 font-bold">' + (totals.beratungen > 0 ? totals.beratungen : '\u2014') + '</td>';
    html += '<td class="text-right py-3 px-3 font-bold text-green-600">' + (totals.verkauft > 0 ? totals.verkauft : '\u2014') + '</td>';
    html += '<td class="text-right py-3 px-3 font-bold">' + (totalQuote > 0 ? totalQuote + '%' : '\u2014') + '</td>';
    html += '<td class="text-right py-3 px-3 font-bold">' + (totals.umsatz > 0 ? Math.round(totals.umsatz).toLocaleString('de-DE') + ' \u20AC' : '\u2014') + '</td>';
    html += '<td class="text-right py-3 px-3 font-bold">' + (totalAvg > 0 ? totalAvg.toLocaleString('de-DE') + ' \u20AC' : '\u2014') + '</td>';
    html += '</tr>';
    
    tbody.innerHTML = html;
    
    // Update KPI cards
    var elPlan = document.getElementById('ausJahresPlan');
    var elYTD = document.getElementById('ausUmsatzYTD');
    var elVK = document.getElementById('ausVerkauft');
    var elQuote = document.getElementById('ausQuote');
    var elAvg = document.getElementById('ausAvgPreis');
    if(elPlan) elPlan.textContent = totals.plan > 0 ? totals.plan.toLocaleString('de-DE') + ' \u20AC' : '\u2014';
    if(elYTD) elYTD.textContent = totals.umsatz > 0 ? Math.round(totals.umsatz).toLocaleString('de-DE') + ' \u20AC' : '0 \u20AC';
    if(elVK) elVK.textContent = totals.verkauft;
    if(elQuote) elQuote.textContent = totalQuote > 0 ? totalQuote + '%' : '0%';
    if(elAvg) elAvg.textContent = totalAvg > 0 ? totalAvg.toLocaleString('de-DE') + ' \u20AC' : '0 \u20AC';
    
    // Simple chart
    renderAuswertungChart(trackingData, planData);
}

function renderAuswertungChart(trackingData, planData) {
    var container = document.getElementById('ausChartContainer');
    if(!container) return;
    var maxVal = 1;
    for(var i = 0; i < 12; i++) {
        var td = trackingData[i] || {};
        var pd = planData[i] || {};
        if((td.umsatz||0) > maxVal) maxVal = td.umsatz;
        if((pd.umsatz||0) > maxVal) maxVal = pd.umsatz;
    }
    var months = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    var w = container.clientWidth || 800;
    var h = 180;
    var barW = Math.floor((w - 40) / 12) - 4;
    
    var svg = '<svg viewBox="0 0 '+w+' '+(h+30)+'" style="width:100%;height:100%">';
    // Grid lines
    for(var g = 0; g <= 4; g++) {
        var gy = h - (g/4)*h;
        svg += '<line x1="40" y1="'+gy+'" x2="'+w+'" y2="'+gy+'" stroke="#f0f0f0" stroke-width="1"/>';
        svg += '<text x="36" y="'+(gy+4)+'" text-anchor="end" fill="#9ca3af" font-size="10">' + Math.round(maxVal*g/4/1000) + '</text>';
    }
    // Bars
    for(var i = 0; i < 12; i++) {
        var td = trackingData[i] || {};
        var x = 44 + i * (barW + 4);
        var val = td.umsatz || 0;
        var barH = maxVal > 0 ? (val / maxVal) * h : 0;
        svg += '<rect x="'+x+'" y="'+(h-barH)+'" width="'+barW+'" height="'+barH+'" rx="3" fill="'+(val > 0 ? '#EF7D00' : '#f0f0f0')+'"/>';
        svg += '<text x="'+(x+barW/2)+'" y="'+(h+18)+'" text-anchor="middle" fill="#9ca3af" font-size="10">'+months[i]+'</text>';
    }
    svg += '</svg>';
    container.innerHTML = svg;
}

export function showVerkaufTab(tabName) {
    document.querySelectorAll('.vk-tab-content').forEach(function(t){t.style.display='none';});
    document.querySelectorAll('.vk-tab-btn').forEach(function(b){
        b.className='vk-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
    });
    var tabId='vkTab'+tabName.charAt(0).toUpperCase()+tabName.slice(1);
    var el=document.getElementById(tabId);
    if(el) el.style.display='block';
    var btn=document.querySelector('.vk-tab-btn[data-tab="'+tabName+'"]');
    if(btn) btn.className='vk-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
    if(tabName==='woche') loadWeekFromDb();
    if(tabName==='pipeline') mountReactPipeline();
    if(tabName==='auswertung') renderJahresTabelle();
}

export function changeWeek(dir) {
    if(!currentWeekStart) { currentWeekStart = getMonday(new Date()); }
    var d = new Date(currentWeekStart);
    d.setDate(d.getDate() + dir * 7);
    currentWeekStart = d;
    loadWeekFromDb();
}
export function getMonday(d) { var day = d.getDay(); var diff = d.getDate() - day + (day === 0 ? -6 : 1); var m = new Date(d); m.setDate(diff); m.setHours(0,0,0,0); return m; }
export function getKW(d) { var t = new Date(d.getFullYear(), 0, 1); var dn = ((d - t) / 86400000); return Math.ceil((dn + t.getDay() + 1) / 7); }
var currentWeekStart = null;
var weekDbData = null;

export async function loadWeekFromDb() {
    if(!currentWeekStart) currentWeekStart = getMonday(new Date());
    var mon = currentWeekStart;
    var sun = new Date(mon); sun.setDate(mon.getDate() + 5); // Mo-Sa
    var monStr = mon.toISOString().slice(0,10);
    var sunStr = sun.toISOString().slice(0,10);
    // Update header
    var kw = getKW(mon);
    var fmt = function(d) { return d.getDate().toString().padStart(2,'0') + '.' + (d.getMonth()+1).toString().padStart(2,'0') + '.'; };
    var titleEl = document.getElementById('weekTitle');
    if(titleEl) titleEl.textContent = 'KW ' + kw + ' \u00B7 ' + fmt(mon) + ' - ' + fmt(sun) + sun.getFullYear();

    try {
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var query = _sb().from('verkauf_tracking').select('*').gte('datum', monStr).lte('datum', sunStr).order('datum');
        if(stdId && !_sbProfile().is_hq) query = query.eq('standort_id', stdId);
        var resp = await query;
        if(resp.error) throw resp.error;
        weekDbData = resp.data || [];
    } catch(e) { weekDbData = []; console.warn('Week load error:', e); }
    renderWeekViewFromDb();
}

export function renderWeekViewFromDb() {
    var data = weekDbData || [];
    var dayNames = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    var weekDays = ['Mo','Di','Mi','Do','Fr','Sa'];
    // Group by seller
    var sellerMap = {};
    data.forEach(function(entry) {
        var name = entry.verkaeufer_name;
        if(!sellerMap[name]) sellerMap[name] = { name: name, plan_soll: 0, days: {} };
        weekDays.forEach(function(d) { if(!sellerMap[name].days[d]) sellerMap[name].days[d] = {day:d,plan:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0}; });
        var d = new Date(entry.datum);
        var dayName = dayNames[d.getDay()];
        if(sellerMap[name].days[dayName]) {
            var dd = sellerMap[name].days[dayName];
            dd.plan += (entry.plan_termine || 0);
            dd.geplant += (entry.geplant || 0);
            dd.spontan += (entry.spontan || 0);
            dd.online += (entry.online || 0);
            dd.ergo += (entry.ergo || 0);
            dd.verkauft += (entry.verkauft || 0);
            dd.uebergabe += (entry.uebergabe || 0);
            dd.umsatz += parseFloat(entry.umsatz) || 0;
        }
        sellerMap[name].plan_soll += (entry.plan_termine || 0);
    });
    var sellers = Object.values(sellerMap);
    // Update filter dropdown dynamically
    var filterEl = document.getElementById('weekSellerFilter');
    if(filterEl) {
        var curVal = filterEl.value;
        var opts = '<option value="all">Alle Verkaeufer</option>';
        sellers.forEach(function(s) { opts += '<option value="'+s.name+'"'+(s.name===curVal?' selected':'')+'>'+s.name+'</option>'; });
        filterEl.innerHTML = opts;
    }
    var filter = filterEl ? filterEl.value : 'all';
    var filtered = filter === 'all' ? sellers : sellers.filter(function(s){return s.name === filter;});

    // KPIs
    var totalPlan=0, totalGesamt=0, totalVerkauft=0, totalUmsatz=0;
    filtered.forEach(function(s) {
        totalPlan += s.plan_soll;
        weekDays.forEach(function(dn) {
            var dd = s.days[dn];
            if(dd) { totalGesamt += dd.geplant+dd.spontan+dd.online+dd.ergo; totalVerkauft += dd.verkauft; totalUmsatz += dd.umsatz; }
        });
    });
    var el;
    el = document.getElementById('wkPlan'); if(el) el.textContent = totalPlan;
    el = document.getElementById('wkGesamt'); if(el) el.textContent = totalGesamt;
    el = document.getElementById('wkVerkauft'); if(el) el.textContent = totalVerkauft;
    el = document.getElementById('wkUmsatz'); if(el) el.textContent = totalUmsatz.toLocaleString('de-DE') + ' \u20AC';
    var quoteVal = totalGesamt > 0 ? Math.round((totalVerkauft/totalGesamt)*100) : 0;
    el = document.getElementById('wkQuote');
    if(el) { el.textContent = quoteVal + '%'; el.className = 'text-2xl font-bold ' + (quoteVal >= 70 ? 'text-green-600' : quoteVal >= 40 ? 'text-orange-600' : 'text-red-600'); }

    // Seller tables
    var container = document.getElementById('weekSellerTables');
    if(!container) return;
    if(filtered.length === 0) { container.innerHTML = '<div class="vit-card p-8 text-center text-gray-400"><p class="text-lg mb-2">'+_t('sales_no_data')+'</p><p class="text-sm">'+_t('sales_add_entry')+'</p></div>'; return; }
    var html = '';
    filtered.forEach(function(s) {
        var sUmsatz=0, sGesamt=0, sVerkauft=0;
        weekDays.forEach(function(dn) { var dd=s.days[dn]; if(dd) { sUmsatz+=dd.umsatz; sGesamt+=dd.geplant+dd.spontan+dd.online+dd.ergo; sVerkauft+=dd.verkauft; } });
        var sQuote = sGesamt > 0 ? Math.round((sVerkauft/sGesamt)*100) : 0;
        html += '<div class="vit-card overflow-hidden">';
        html += '<div class="flex items-center justify-between p-4 bg-gray-50 border-b">';
        html += '<div class="flex items-center space-x-3"><div class="w-8 h-8 bg-vit-orange rounded-full flex items-center justify-center text-white font-bold text-sm">'+s.name.charAt(0)+'</div>';
        html += '<div><p class="font-semibold text-gray-800">'+s.name+'</p><p class="text-xs text-gray-500">Plan: '+s.plan_soll+' Termine</p></div></div>';
        html += '<div class="flex space-x-4 text-center">';
        html += '<div><p class="text-xs text-gray-500">Beratungen</p><p class="font-bold text-blue-600">'+sGesamt+'</p></div>';
        html += '<div><p class="text-xs text-gray-500">Verkauft</p><p class="font-bold text-green-600">'+sVerkauft+'</p></div>';
        html += '<div><p class="text-xs text-gray-500">Umsatz</p><p class="font-bold text-vit-orange">'+sUmsatz.toLocaleString('de-DE')+' \u20AC</p></div>';
        html += '<div><p class="text-xs text-gray-500">Quote</p><p class="font-bold '+(sQuote>=70?'text-green-600':sQuote>=40?'text-orange-600':'text-red-600')+'">'+sQuote+'%</p></div>';
        html += '</div></div>';
        html += '<div class="overflow-x-auto"><table class="w-full text-sm">';
        html += '<thead><tr class="bg-gray-50 text-xs"><th class="py-2 px-3 text-left text-gray-500">Tag</th><th class="py-2 px-3 text-center text-gray-500">Plan</th><th class="py-2 px-3 text-center text-blue-600">Geplant</th><th class="py-2 px-3 text-center text-purple-600">Spontan</th><th class="py-2 px-3 text-center text-cyan-600">Online</th><th class="py-2 px-3 text-center text-pink-600">Ergo</th><th class="py-2 px-3 text-center font-bold text-gray-700">Gesamt</th><th class="py-2 px-3 text-center text-green-600">Verkauft</th><th class="py-2 px-3 text-center text-gray-500">Uebergabe</th><th class="py-2 px-3 text-right text-vit-orange">Umsatz</th></tr></thead>';
        html += '<tbody>';
        weekDays.forEach(function(dn) {
            var dd = s.days[dn] || {plan:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0};
            var total = dd.geplant+dd.spontan+dd.online+dd.ergo;
            var hasData = dd.plan>0 || total>0 || dd.umsatz>0;
            html += '<tr class="border-b '+(hasData?'':'text-gray-300')+'">';
            html += '<td class="py-2 px-3 font-semibold">'+dn+'</td>';
            html += '<td class="py-2 px-3 text-center">'+(dd.plan||'-')+'</td>';
            html += '<td class="py-2 px-3 text-center text-blue-600">'+(dd.geplant||'-')+'</td>';
            html += '<td class="py-2 px-3 text-center text-purple-600">'+(dd.spontan||'-')+'</td>';
            html += '<td class="py-2 px-3 text-center text-cyan-600">'+(dd.online||'-')+'</td>';
            html += '<td class="py-2 px-3 text-center text-pink-600">'+(dd.ergo||'-')+'</td>';
            html += '<td class="py-2 px-3 text-center font-bold">'+(total||'-')+'</td>';
            html += '<td class="py-2 px-3 text-center text-green-600 font-bold">'+(dd.verkauft||'-')+'</td>';
            html += '<td class="py-2 px-3 text-center">'+(dd.uebergabe||'-')+'</td>';
            html += '<td class="py-2 px-3 text-right font-semibold '+(dd.umsatz>0?'text-vit-orange':'')+'">'+(dd.umsatz>0?dd.umsatz.toLocaleString('de-DE')+' \u20AC':'-')+'</td>';
            html += '</tr>';
        });
        html += '</tbody></table></div></div>';
    });
    container.innerHTML = html;
}



// Strangler Fig
window.verkaufData = verkaufData;
const _exports = {renderWeekView,renderPipeline,moveLead,showNewLeadModal,addNewLead,renderJahresTabelle,showVerkaufTab,changeWeek,getMonday,getKW,loadWeekFromDb,renderWeekViewFromDb};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[verkauf.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
