/**
 * views/hq-verkauf.js - HQ Verkauf, Handlungsbedarf, Performance Cockpit
 * @module views/hq-verkauf
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _showView(v) { if (window.showView) window.showView(v); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// === HQ VERKAUF ===
export async function renderHqVerkauf() {
    var sb = window.sb || window.supabase;
    if(!sb) return;

    // Load standorte
    var standorte = [];
    try {
        var r = await _sb().from('standorte').select('id, name, slug').order('name');
        if(r.data) standorte = r.data;
    } catch(e) {}

    // Load verkauf_tracking this week
    var now = new Date();
    var dayOfWeek = now.getDay() || 7;
    var monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek + 1); monday.setHours(0,0,0,0);
    var mondayStr = monday.toISOString().split('T')[0];
    var sundayStr = new Date(monday.getTime() + 6*86400000).toISOString().split('T')[0];

    var trackByStd = {};
    try {
        var tr = await _sb().from('verkauf_tracking').select('standort_id, geplant, spontan, ergo, verkauft, umsatz').gte('datum', mondayStr).lte('datum', sundayStr);
        if(tr.data) tr.data.forEach(function(d) {
            var sid = d.standort_id;
            if(!trackByStd[sid]) trackByStd[sid] = {beratungen:0,verkauft:0,umsatz:0};
            trackByStd[sid].beratungen += (d.geplant||0) + (d.spontan||0) + (d.ergo||0);
            trackByStd[sid].verkauft += (d.verkauft||0);
            trackByStd[sid].umsatz += parseFloat(d.umsatz||0);
        });
    } catch(e) {}

    // Load leads count per standort
    var leadsByStd = {};
    try {
        var lr = await _sb().from('leads').select('standort_id, id').in('status', ['neu','kontaktiert','angebot','schwebend']);
        if(lr.data) lr.data.forEach(function(d) {
            leadsByStd[d.standort_id] = (leadsByStd[d.standort_id]||0) + 1;
        });
    } catch(e) {}

    // KPI totals
    var totBer = 0, totVK = 0, totUms = 0, totLeads = 0;
    Object.values(trackByStd).forEach(function(v) { totBer += v.beratungen; totVK += v.verkauft; totUms += v.umsatz; });
    Object.values(leadsByStd).forEach(function(v) { totLeads += v; });
    var quote = totBer > 0 ? Math.round(totVK/totBer*100) : 0;

    var el = function(id,txt) { var e = document.getElementById(id); if(e) e.textContent = txt; };
    el('hqVkBeratKW', totBer || '—');
    el('hqVkSalesKW', totVK || '—');
    el('hqVkUmsatzKW', totUms > 0 ? Math.round(totUms).toLocaleString('de-DE') + ' €' : '—');
    el('hqVkQuote', quote > 0 ? quote + '%' : '—');
    el('hqVkLeads', totLeads || '—');

    // Standort table
    var tbody = document.getElementById('hqVkTableBody');
    if(tbody) {
        var html = '';
        var rows = standorte.map(function(s) {
            var t = trackByStd[s.id] || {beratungen:0,verkauft:0,umsatz:0};
            var leads = leadsByStd[s.id] || 0;
            var q = t.beratungen > 0 ? Math.round(t.verkauft/t.beratungen*100) : 0;
            var avg = t.verkauft > 0 ? Math.round(t.umsatz/t.verkauft) : 0;
            return {name:s.name.replace('vit:bikes ',''), b:t.beratungen, v:t.verkauft, q:q, u:t.umsatz, avg:avg, leads:leads};
        }).sort(function(a,b) { return b.u - a.u; });

        rows.forEach(function(r) {
            html += '<tr class="border-b border-gray-100 hover:bg-gray-50">';
            html += '<td class="py-2.5 px-3 text-sm font-semibold">' + r.name + '</td>';
            html += '<td class="text-right py-2.5 px-3 text-sm">' + (r.b || '—') + '</td>';
            html += '<td class="text-right py-2.5 px-3 text-sm font-bold text-green-600">' + (r.v || '—') + '</td>';
            html += '<td class="text-right py-2.5 px-3 text-sm ' + (r.q >= 40 ? 'text-green-600' : r.q > 0 ? 'text-orange-500' : '') + '">' + (r.q > 0 ? r.q + '%' : '—') + '</td>';
            html += '<td class="text-right py-2.5 px-3 text-sm">' + (r.u > 0 ? Math.round(r.u).toLocaleString('de-DE') + ' €' : '—') + '</td>';
            html += '<td class="text-right py-2.5 px-3 text-sm">' + (r.avg > 0 ? r.avg.toLocaleString('de-DE') + ' €' : '—') + '</td>';
            html += '<td class="text-right py-2.5 px-3 text-sm text-purple-600">' + (r.leads || '—') + '</td>';
            html += '</tr>';
        });
        tbody.innerHTML = html || '<tr><td colspan="7" class="text-center py-6 text-gray-400">Noch keine Daten diese Woche</td></tr>';
    }

    // Alerts
    var alerts = document.getElementById('hqVkAlerts');
    if(alerts) {
        var ah = '';
        standorte.forEach(function(s) {
            var t = trackByStd[s.id] || {beratungen:0,verkauft:0,umsatz:0};
            var nm = s.name.replace('vit:bikes ','');
            if(t.beratungen === 0 && t.verkauft === 0) {
                ah += '<div class="p-3 bg-red-50 rounded-lg"><span class="text-sm font-semibold text-red-700">🔴 '+nm+' – Keine Einträge diese Woche</span></div>';
            } else if(t.beratungen > 0 && t.verkauft === 0) {
                ah += '<div class="p-3 bg-yellow-50 rounded-lg"><span class="text-sm font-semibold text-yellow-700">⚠️ '+nm+' – '+t.beratungen+' Beratungen, 0 Verkäufe</span></div>';
            }
        });
        alerts.innerHTML = ah || '<p class="text-sm text-green-600">✅ Alle Standorte verkaufen aktiv</p>';
    }

    // Load automations
    loadHqAutomations();
}

async function loadHqAutomations() {
    var sb = window.sb || window.supabase;
    if(!sb) return;
    var container = document.getElementById('hqAutoRulesList');
    if(!container) return;

    var stageLabels = {'*':'Beliebig','lead':'Eingang','angebot':'Angebot','schwebend':'Schwebend','verkauft':'Verkauft','gold':'Schrank d. Hoffnung','lost':'Verloren'};
    var DB_TO_STAGE = {anfrage:'lead',angebot:'angebot',schwebend:'schwebend',verkauft:'verkauft',gold:'gold',verloren:'lost'};

    try {
        var r = await _sb().from('lead_automations').select('*').order('created_at');
        if(!r.data || !r.data.length) { container.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Noch keine Automationen angelegt.</p>'; return; }

        var html = '';
        r.data.forEach(function(rule) {
            var from = stageLabels[DB_TO_STAGE[rule.from_stage] || rule.from_stage] || rule.from_stage || 'Beliebig';
            var to = stageLabels[DB_TO_STAGE[rule.to_stage] || rule.to_stage] || rule.to_stage;
            var action = rule.action === 'todo' ? '✅ Todo' : '📁 Aktivität';
            var enabled = rule.enabled !== false;
            html += '<div class="flex items-center justify-between p-3 rounded-xl border ' + (enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60') + '">';
            html += '<div class="flex items-center gap-2 flex-wrap">';
            html += '<span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold">' + from + '</span>';
            html += '<span class="text-gray-400">→</span>';
            html += '<span class="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-bold">' + to + '</span>';
            html += '<span class="text-gray-400 text-xs">dann</span>';
            html += '<span class="px-2 py-0.5 bg-gray-100 rounded text-xs font-semibold">' + action + '</span>';
            if(rule.action_text) html += '<span class="text-xs text-gray-500">"' + rule.action_text + '"</span>';
            if(rule.days_offset) html += '<span class="text-xs text-gray-400">(in ' + rule.days_offset + 'd)</span>';
            html += '</div>';
            html += '<div class="flex items-center gap-2">';
            html += '<button onclick="toggleHqAuto(\'' + rule.id + '\',' + !enabled + ')" class="text-xs px-2 py-1 rounded ' + (enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500') + '">' + (enabled ? 'Aktiv' : 'Aus') + '</button>';
            html += '<button onclick="deleteHqAuto(\'' + rule.id + '\')" class="text-red-400 hover:text-red-600 text-sm">✕</button>';
            html += '</div></div>';
        });
        container.innerHTML = html;
    } catch(e) { container.innerHTML = '<p class="text-sm text-red-400">Fehler: ' + _escH(e.message) + '</p>'; }
}

window.showHqVkTab = function(tab) {
    document.querySelectorAll('.hqvk-content').forEach(function(el) { el.style.display = 'none'; });
    document.querySelectorAll('.hqvk-tab').forEach(function(btn) {
        btn.className = 'hqvk-tab whitespace-nowrap py-3 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700';
    });
    var tabEl = document.getElementById('hqVkTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if(tabEl) tabEl.style.display = 'block';
    var btn = document.querySelector('.hqvk-tab[data-tab="' + tab + '"]');
    if(btn) btn.className = 'hqvk-tab whitespace-nowrap py-3 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
    if(tab === 'automationen') loadHqAutomations();
};

window.showAddAutomationForm = function() {
    document.getElementById('hqAutoAddForm').style.display = 'block';
};

window.saveHqAutomation = async function() {
    var sb = window.sb || window.supabase;
    if(!sb) return;
    var STAGE_TO_DB = {lead:'anfrage',angebot:'angebot',schwebend:'schwebend',verkauft:'verkauft',gold:'gold',lost:'verloren'};
    var from = document.getElementById('hqAutoFrom').value;
    var to = document.getElementById('hqAutoTo').value;
    var action = document.getElementById('hqAutoAction').value;
    var days = parseInt(document.getElementById('hqAutoDays').value) || 0;
    var text = document.getElementById('hqAutoText').value;
    if(!text) { _showToast('Bitte Text eingeben', 'error'); return; }

    var resp = await _sb().from('lead_automations').insert({
        from_stage: from === '*' ? '*' : (STAGE_TO_DB[from] || from),
        to_stage: STAGE_TO_DB[to] || to,
        action: action,
        action_text: text,
        days_offset: days,
        action_type: action === 'todo' ? 'todo' : 'note',
        enabled: true,
        is_global: true
    });
    if(resp.error) { _showToast('Fehler: ' + resp.error.message, 'error'); return; }
    document.getElementById('hqAutoAddForm').style.display = 'none';
    document.getElementById('hqAutoText').value = '';
    loadHqAutomations();
};

window.toggleHqAuto = async function(id, enabled) {
    var sb = window.sb || window.supabase;
    if(!sb) return;
    await _sb().from('lead_automations').update({enabled: enabled}).eq('id', id);
    loadHqAutomations();
};

window.deleteHqAuto = async function(id) {
    if(!confirm('Automation wirklich löschen?')) return;
    var sb = window.sb || window.supabase;
    if(!sb) return;
    await _sb().from('lead_automations').delete().eq('id', id);
    loadHqAutomations();
};

// === HQ HANDLUNGSBEDARF (konsolidiert) ===
export function renderHqAktionen() {
    var aktionen = [];
    hqStandorte.forEach(function(s) {
        if(s.leadPerf===0) aktionen.push({prio:1,bereich:'Standort',standort:s.name,text:'Standort inaktiv – Nachfolger/Reaktivierung noetig',color:'bg-gray-800 text-white'});
        if(s.strategieStatus==='missing' && s.umsatzIst>0) aktionen.push({prio:1,bereich:'Strategie',standort:s.name,text:'Marketing- & Einkaufsstrategie fehlt – Termin vereinbaren',color:'bg-red-600 text-white'});
        if(s.vororderStatus==='open' && s.umsatzIst>0) aktionen.push({prio:2,bereich:'Einkauf',standort:s.name,text:'Keine Vororder 2026 platziert – dringend Gespraech fuehren',color:'bg-red-500 text-white'});
        if(s.rohertrag>0 && s.rohertrag<32) aktionen.push({prio:2,bereich:'Controlling',standort:s.name,text:'Rohertrag kritisch ('+s.rohertrag+'%) – Massnahmenplan erstellen',color:'bg-red-500 text-white'});
        if(s.rabattQuote>10) aktionen.push({prio:2,bereich:'Verkauf',standort:s.name,text:'Rabattquote '+s.rabattQuote+'% – Schulung Dreingaben vs. Rabatte',color:'bg-red-400 text-white'});
        if(s.leadPerf>0 && s.leadPerf<50) aktionen.push({prio:3,bereich:'Marketing',standort:s.name,text:'Lead-Performance '+s.leadPerf+'% – Budget/Strategie pruefen',color:'bg-orange-500 text-white'});
        if(s.offeneTickets>=4) aktionen.push({prio:3,bereich:'Support',standort:s.name,text:s.offeneTickets+' offene Tickets – Abarbeitung priorisieren',color:'bg-yellow-500 text-gray-800'});
        if(s.bwaAuffaellig && s.rohertrag>=32) aktionen.push({prio:4,bereich:'Controlling',standort:s.name,text:s.bwaAuffaellig,color:'bg-yellow-400 text-gray-800'});
        if(s.strategieStatus==='pending') aktionen.push({prio:4,bereich:'Strategie',standort:s.name,text:'Strategie-Vereinbarung noch ausstehend – nachfassen',color:'bg-yellow-300 text-gray-800'});
    });
    aktionen.sort(function(a,b){return a.prio-b.prio;});

    var kpi = document.getElementById('hqAktKpis');
    if(kpi) {
        var p1 = aktionen.filter(function(a){return a.prio<=2;}).length;
        var p2 = aktionen.filter(function(a){return a.prio===3;}).length;
        var p3 = aktionen.filter(function(a){return a.prio>=4;}).length;
        kpi.innerHTML = '<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Aktionen gesamt</p><p class="text-2xl font-bold text-gray-800">'+aktionen.length+'</p></div>'
            +'<div class="vit-card p-5 border-l-4 border-red-500"><p class="text-xs text-gray-400 uppercase">🔴 Kritisch</p><p class="text-2xl font-bold text-red-600">'+p1+'</p></div>'
            +'<div class="vit-card p-5 border-l-4 border-orange-500"><p class="text-xs text-gray-400 uppercase">🟠 Wichtig</p><p class="text-2xl font-bold text-orange-600">'+p2+'</p></div>'
            +'<div class="vit-card p-5 border-l-4 border-yellow-400"><p class="text-xs text-gray-400 uppercase">🟡 Beobachten</p><p class="text-2xl font-bold text-yellow-600">'+p3+'</p></div>';
    }

    var list = document.getElementById('hqAktionenList');
    if(list) {
        var lh = '';
        aktionen.forEach(function(a) {
            lh += '<div class="vit-card p-4 flex items-center space-x-4 hover:shadow-md transition">';
            lh += '<span class="'+a.color+' text-[10px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap">'+a.bereich+'</span>';
            lh += '<div class="flex-1"><p class="text-sm font-semibold text-gray-800">'+a.standort+'</p><p class="text-xs text-gray-500">'+a.text+'</p></div>';
            lh += '<span class="text-xs text-gray-400 whitespace-nowrap">Prio '+(a.prio<=2?'🔴':a.prio===3?'🟠':'🟡')+'</span>';
            lh += '</div>';
        });
        list.innerHTML = lh || '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-2">✅</p><p>Kein Handlungsbedarf – alles laeuft!</p></div>';
    }
}

// === PERFORMANCE COCKPIT ===
var cockpitMonth = null;

export function generateDemoBwaData() {
    var currentYear = new Date().getFullYear();
    var currentMonth = new Date().getMonth() + 1;
    var bwas = [];
    var vjBwas = [];
    var baseUmsatz = [68000, 72000, 85000, 91000, 98000, 105000, 95000, 88000, 92000, 99000, 78000, 110000];
    for (var m = 1; m <= Math.min(currentMonth, 12); m++) {
        var u = baseUmsatz[m-1] + Math.round((Math.random()-0.5)*8000);
        var we = Math.round(u * 0.58);
        var roh = u - we;
        var pk = Math.round(u * 0.18);
        var sk = Math.round(u * 0.12);
        var gk = pk + sk;
        var erg = roh - gk;
        bwas.push({
            id: 'demo-bwa-' + m,
            standort_id: 'demo',
            monat: m, jahr: currentYear,
            umsatzerloese: u,
            wareneinsatz: we,
            rohertrag: roh,
            personalkosten: pk,
            raumkosten: Math.round(u * 0.04),
            werbekosten: Math.round(u * 0.02),
            kfzkosten: Math.round(u * 0.015),
            abschreibungen: 1200,
            sonstige_kosten: Math.round(u * 0.03),
            gesamtkosten: gk,
            betriebsergebnis: erg,
            ergebnis_vor_steuern: erg - 400,
            rohertrag_prozent: Math.round(roh / u * 1000) / 10,
            personalkosten_prozent: Math.round(pk / u * 1000) / 10,
            created_at: new Date().toISOString()
        });
        // Vorjahr etwas niedriger
        var vu = Math.round(u * 0.92);
        var vwe = Math.round(vu * 0.6);
        var vroh = vu - vwe;
        var vpk = Math.round(vu * 0.19);
        var vsk = Math.round(vu * 0.13);
        var vgk = vpk + vsk;
        var verg = vroh - vgk;
        vjBwas.push({
            id: 'demo-vj-bwa-' + m,
            standort_id: 'demo',
            monat: m, jahr: currentYear - 1,
            umsatzerloese: vu,
            wareneinsatz: vwe,
            rohertrag: vroh,
            personalkosten: vpk,
            gesamtkosten: vgk,
            betriebsergebnis: verg,
            ergebnis_vor_steuern: verg - 350,
            rohertrag_prozent: Math.round(vroh / vu * 1000) / 10,
            personalkosten_prozent: Math.round(vpk / vu * 1000) / 10,
            created_at: new Date().toISOString()
        });
    }
    return { bwas: bwas, vjBwas: vjBwas };
}

export async function renderPerformanceCockpit() {
    var el = document.getElementById('cockpitContent');
    if(!el) return;
    el.innerHTML = '<p class="text-sm text-gray-400 text-center py-8 animate-pulse">Lade Cockpit-Daten...</p>';

    var useDemo = (typeof isDemoMode !== 'undefined' && isDemoMode) || window.isDemoMode || (_sbProfile() && (_sbProfile().status === 'demo' || _sbProfile().status === 'demo_active'));
    var stdId = _sbProfile() ? _sbProfile().standort_id : null;
    // [prod] log removed
    var stdName = useDemo ? 'Muster-Filiale' : (_sbProfile() ? (_sbProfile().standort_name || _sbProfile().name || 'Mein Standort') : 'Mein Standort');
    var currentYear = new Date().getFullYear();
    var pn = function(v) { return parseFloat(v) || 0; };
    var mLabels = {1:'Jan',2:'Feb',3:'Mär',4:'Apr',5:'Mai',6:'Jun',7:'Jul',8:'Aug',9:'Sep',10:'Okt',11:'Nov',12:'Dez'};

    try {
        var bwas, vjBwas;
        if (useDemo) {
            var demoData = generateDemoBwaData();
            bwas = demoData.bwas;
            vjBwas = demoData.vjBwas;
        } else {
            // Load BWAs for current + previous year
            var bwaResp = await _sb().from('bwa_daten').select('*').eq('standort_id', stdId).eq('jahr', currentYear).order('monat');
            bwas = (bwaResp.data || []);
            var vjResp = await _sb().from('bwa_daten').select('*').eq('standort_id', stdId).eq('jahr', currentYear - 1).order('monat');
            vjBwas = (vjResp.data || []);
        }

        if(bwas.length === 0) {
            el.innerHTML = '<div class="text-center py-12"><p class="text-4xl mb-3">📊</p><p class="text-gray-500">Noch keine BWA-Daten für ' + currentYear + ' vorhanden.</p><p class="text-sm text-gray-400 mt-2">Lade eine BWA hoch, um das Performance Cockpit zu aktivieren.</p><button onclick="showControllingTab(\'bwa\')" class="mt-4 px-4 py-2 bg-vit-orange text-white rounded-lg text-sm hover:opacity-90">BWA hochladen →</button></div>';
            return;
        }

        // Find latest month or selected month
        var latestMonth = cockpitMonth || Math.max.apply(null, bwas.map(function(b) { return b.monat; }));
        var bwa = bwas.find(function(b) { return b.monat === latestMonth; });
        var vjBwa = vjBwas.find(function(b) { return b.monat === latestMonth; });

        if(!bwa) { el.innerHTML = '<p class="text-sm text-gray-400 text-center py-8">Keine Daten für gewählten Monat.</p>'; return; }

        // Correct values from detail positions if available (skip in demo)
        if (!useDemo) {
        var detCockpit = await _sb().from('bwa_detail_positionen').select('zeile,wert').eq('bwa_id', bwa.id).eq('ist_summenzeile', true).in('zeile', [1000,1040,1260,1300,1355]);
        if(detCockpit.data && detCockpit.data.length > 0) {
            var dm = {}; detCockpit.data.forEach(function(d){ dm[d.zeile] = pn(d.wert); });
            if(dm[1000]) bwa.umsatzerloese = dm[1000];
            if(dm[1040]) bwa.rohertrag = dm[1040];
            if(dm[1260]) bwa.gesamtkosten = dm[1260];
            if(dm[1355]) bwa.ergebnis_vor_steuern = dm[1355];
            else if(dm[1300]) bwa.ergebnis_vor_steuern = dm[1300];
        }
        }

        // Extract values
        var umsatz = pn(bwa.umsatzerloese);
        var rohertrag = pn(bwa.rohertrag);
        var marge = umsatz ? (rohertrag / umsatz * 100) : 0;
        var gesamtkosten = pn(bwa.gesamtkosten);
        var betriebsergebnis = pn(bwa.betriebsergebnis || bwa.ergebnis_vor_steuern);
        var ergebnis = pn(bwa.ergebnis_vor_steuern);
        var personal = pn(bwa.personalkosten);
        var raum = pn(bwa.raumkosten);
        var werbe = pn(bwa.werbekosten);
        var sonstige = pn(bwa.sonstige_kosten) + pn(bwa.abschreibungen) + pn(bwa.kosten_warenabgabe);
        var ebitMarge = umsatz ? (ergebnis / umsatz * 100) : null;
        var kostenquote = umsatz ? (Math.abs(gesamtkosten) / umsatz * 100) : null;

        // Plan values
        var planUmsatz = pn(bwa.plan_umsatz);
        var planRohertrag = pn(bwa.plan_rohertrag);
        var planErgebnis = pn(bwa.plan_ergebnis);

        // YTD
        var ytdUmsatz = 0, ytdVjUmsatz = 0;
        bwas.forEach(function(b) { ytdUmsatz += pn(b.umsatzerloese); });
        vjBwas.forEach(function(b) { if(b.monat <= latestMonth) ytdVjUmsatz += pn(b.umsatzerloese); });
        var ytdUmsatzVjPct = ytdVjUmsatz ? (ytdUmsatz / ytdVjUmsatz * 100) : null;

        var vjEbitMarge = (vjBwa && pn(vjBwa.umsatzerloese)) ? (pn(vjBwa.ergebnis_vor_steuern) / pn(vjBwa.umsatzerloese) * 100) : null;
        var ebitMargeDelta = (ebitMarge !== null && vjEbitMarge !== null) ? (ebitMarge - vjEbitMarge) : null;

        // Marketing
        var mktUmsatzPct = (umsatz && werbe) ? (Math.abs(werbe) / umsatz * 100) : null;

        // Build HTML
        var h = '';

        // Header
        h += '<div class="flex items-center justify-between mb-6">';
        h += '<div class="flex items-center space-x-3"><h2 class="text-lg font-bold text-vit-orange">Performance Cockpit</h2>';
        h += '<span class="text-sm text-gray-500">' + stdName + ' | ' + currentYear + '</span></div>';
        h += '<select id="cockpitMonthSel" onchange="cockpitMonth=parseInt(this.value);renderPerformanceCockpit()" class="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">';
        for(var mm = 1; mm <= 12; mm++) {
            var hasBwa = bwas.some(function(b){ return b.monat===mm; });
            h += '<option value="'+mm+'"'+(mm===latestMonth?' selected':'')+(hasBwa?'':' disabled')+'>'+mLabels[mm]+(hasBwa?'':' (leer)')+'</option>';
        }
        h += '</select></div>';

        // KPI Cards
        var vjUmsatz = vjBwa ? pn(vjBwa.umsatzerloese) : null;
        var vjMarge = vjBwa && pn(vjBwa.umsatzerloese) ? (pn(vjBwa.rohertrag) / pn(vjBwa.umsatzerloese) * 100) : null;
        var umsatzDelta = vjUmsatz ? ((umsatz - vjUmsatz) / vjUmsatz * 100) : null;

        function kpiCard(label, value, suffix, delta, deltaLabel, color) {
            var c = color || 'text-gray-800';
            var dStr = '';
            if(delta !== null && delta !== undefined) {
                var dColor = delta >= 0 ? 'text-green-600' : 'text-red-500';
                dStr = '<p class="text-xs mt-1 '+dColor+'">'+(delta>=0?'▲':'▼')+' '+Math.abs(delta).toFixed(1)+(deltaLabel||'')+'</p>';
            }
            return '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-500 mb-1">'+label+'</p><p class="text-xl font-bold '+c+'">'+value+(suffix||'')+'</p>'+dStr+'</div>';
        }

        h += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">';
        h += kpiCard('Umsatz', umsatz.toLocaleString('de-DE'), ' €', umsatzDelta, '% vs VJ');
        h += kpiCard('Rohertrag', rohertrag.toLocaleString('de-DE'), ' €', null, null);
        h += kpiCard('Marge', marge.toFixed(1), '%', vjMarge !== null ? (marge - vjMarge) : null, ' Pp vs VJ', marge >= 35 ? 'text-green-600' : 'text-orange-500');
        h += kpiCard('Gesamtkosten', Math.abs(gesamtkosten).toLocaleString('de-DE'), ' €', null, null);
        h += kpiCard('Ergebnis', ergebnis.toLocaleString('de-DE'), ' €', null, null, ergebnis >= 0 ? 'text-green-600' : 'text-red-600');
        h += kpiCard('EBIT-Marge', ebitMarge !== null ? ebitMarge.toFixed(1) : '—', '%', ebitMargeDelta, ' Pp vs VJ', ebitMarge >= 0 ? 'text-green-600' : 'text-red-500');
        h += kpiCard('Kostenquote', kostenquote !== null ? kostenquote.toFixed(1) : '—', '%', null, null, kostenquote <= 100 ? 'text-blue-600' : 'text-red-500');
        h += kpiCard('YTD Umsatz', ytdUmsatz.toLocaleString('de-DE'), ' €', ytdUmsatzVjPct ? (ytdUmsatzVjPct - 100) : null, '% vs VJ');
        h += '</div>';

        // Plan vs Ist bars
        if(planUmsatz || planRohertrag || planErgebnis) {
            h += '<div class="vit-card p-5 mb-6"><h3 class="font-bold text-gray-800 mb-4">Plan vs. Ist</h3>';
            h += '<div class="space-y-4">';
            function planBar(label, ist, plan) {
                if(!plan) return '';
                var pct = Math.min(Math.round(ist / plan * 100), 150);
                var color = pct >= 100 ? 'bg-green-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-red-400';
                return '<div><div class="flex justify-between text-sm mb-1"><span class="text-gray-600">'+label+'</span><span class="font-semibold">'+pct+'%</span></div><div class="w-full bg-gray-100 rounded-full h-3"><div class="'+color+' h-3 rounded-full transition-all" style="width:'+Math.min(pct,100)+'%"></div></div><div class="flex justify-between text-xs text-gray-400 mt-1"><span>Ist: '+ist.toLocaleString('de-DE')+' €</span><span>Plan: '+plan.toLocaleString('de-DE')+' €</span></div></div>';
            }
            h += planBar('Umsatz', umsatz, planUmsatz);
            h += planBar('Rohertrag', rohertrag, planRohertrag);
            h += planBar('Ergebnis', ergebnis, planErgebnis);
            h += '</div></div>';
        }

        // Kostenstruktur
        h += '<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">';
        h += '<div class="vit-card p-5"><h3 class="font-bold text-gray-800 mb-4">Kostenstruktur</h3>';
        var totalK = Math.abs(personal) + Math.abs(raum) + Math.abs(werbe) + Math.abs(sonstige);
        function kostenBar(label, val, color) {
            var pct = totalK ? (Math.abs(val) / totalK * 100) : 0;
            return '<div class="flex items-center gap-3 mb-3"><span class="text-xs text-gray-500 w-24">'+label+'</span><div class="flex-1 bg-gray-100 rounded-full h-2.5"><div class="'+color+' h-2.5 rounded-full" style="width:'+pct+'%"></div></div><span class="text-xs font-semibold text-gray-600 w-20 text-right">'+Math.abs(val).toLocaleString('de-DE')+' €</span></div>';
        }
        h += kostenBar('Personal', personal, 'bg-blue-500');
        h += kostenBar('Raum', raum, 'bg-purple-500');
        h += kostenBar('Werbung', werbe, 'bg-orange-500');
        h += kostenBar('Sonstige', sonstige, 'bg-gray-400');
        h += '</div>';

        // Monatsvergleich Trend
        h += '<div class="vit-card p-5"><h3 class="font-bold text-gray-800 mb-4">Umsatz-Trend ' + currentYear + '</h3>';
        if(bwas.length >= 2) {
            var maxU = Math.max.apply(null, bwas.map(function(b){ return pn(b.umsatzerloese); }));
            h += '<div class="flex items-end gap-2 h-32">';
            bwas.forEach(function(b) {
                var pct = maxU ? (pn(b.umsatzerloese) / maxU * 100) : 0;
                var isSelected = b.monat === latestMonth;
                h += '<div class="flex-1 flex flex-col items-center">';
                h += '<span class="text-[9px] text-gray-500 mb-1">'+pn(b.umsatzerloese).toLocaleString('de-DE')+'</span>';
                h += '<div class="w-full '+(isSelected?'bg-vit-orange':'bg-gray-300')+' rounded-t" style="height:'+Math.max(pct,5)+'%"></div>';
                h += '<span class="text-[10px] text-gray-400 mt-1">'+mLabels[b.monat]+'</span></div>';
            });
            h += '</div>';
        } else {
            h += '<p class="text-sm text-gray-400 text-center py-4">Mindestens 2 Monate für Trend nötig.</p>';
        }
        h += '</div></div>';

        // Marketing KPI + Benchmark (coming soon)
        h += '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">';
        h += '<div class="vit-card p-5"><h3 class="font-bold text-gray-800 mb-3">Marketing-Kennzahlen</h3>';
        h += '<div class="space-y-3">';
        h += '<div class="flex justify-between text-sm"><span class="text-gray-500">Werbekosten</span><span class="font-semibold">'+Math.abs(werbe).toLocaleString('de-DE')+' €</span></div>';
        h += '<div class="flex justify-between text-sm"><span class="text-gray-500">% vom Umsatz</span><span class="font-semibold '+(mktUmsatzPct && mktUmsatzPct <= 5 ? 'text-green-600' : 'text-orange-500')+'">'+(mktUmsatzPct ? mktUmsatzPct.toFixed(1) : '—')+'%</span></div>';
        h += '</div></div>';
        h += '<div class="vit-card p-5 opacity-50"><h3 class="font-bold text-gray-800 mb-3">🔒 Netzwerk-Benchmark</h3>';
        h += '<p class="text-sm text-gray-400 py-4 text-center">Verfügbar sobald Netzwerk-Daten aggregiert werden.</p></div>';
        h += '</div>';

        el.innerHTML = h;
    } catch(err) {
        console.error('[COCKPIT]', err);
        el.innerHTML = '<div class="text-center py-8"><p class="text-red-400 text-sm">Fehler beim Laden: ' + _escH(err.message) + '</p><button onclick="renderPerformanceCockpit()" class="mt-2 text-sm text-vit-orange underline">Erneut versuchen</button></div>';
    }
}

// Hook HQ views into showView (deferred until available)
function _hookShowView() {
    if (typeof showView === 'undefined' || !window.showView) return;
    var origShowView2 = window.showView;
    window.showView = function(v) {
    // Rechteprüfung
    if(typeof hasAccess === 'function' && !hasAccess(v)) {
        console.warn('[hq-verkauf] Kein Zugriff auf', v, 'mit Rolle', window.currentRole);
        if(window.currentRole === 'hq') { v = 'hqCockpit'; } else { v = 'home'; }
    }
    // Redirect 'home' to HQ Cockpit when in HQ mode
    if(v==='home' && currentRole==='hq') { v='hqCockpit'; }
    if(v==='home' && SESSION.account_level==='extern') { v='externHome'; }
    if(v==='hqIdeen') { v='entwicklung'; _showView('entwicklung'); return; }
    origShowView2(v);
    if(v==='externHome') renderExternHome();
    if(v==='onboarding') renderOnboardingView();
    if(v==='hqOnboarding') renderHqOnboarding();
    if(v==='hqCockpit') renderHqCockpit();
    if(v==='hqStandorte') renderHqStandorte();
    if(v==='hqFinanzen') renderHqFinanzen();
    if(v==='hqMarketing') { renderHqMarketing(); showHqMktTab('uebersicht'); }
    if(v==='allgemein') { loadAllgemeinData().then(function(){ showAllgemeinTab('uebersicht'); }); }
    if(v==='home') { loadDashboardWidgets(); loadAllgemeinData(); }
    if(v==='einkauf') { showEinkaufTab('sortiment'); }
    if(v==='hqAllgemein') { renderHqAllgemein(hqStandorte, [], [], []); }
    if(v==='hqEinkauf') { showHqEkTab('dash'); }
    if(v==='hqVerkauf') renderHqVerkauf();
    if(v==='hqAktionen') renderHqAktionen();
    if(v==='hqKomm'){_showView('hqKommando');showKommandoTab('kommunikation');return;}
    if(v==='hqKampagnen'){_showView('hqKommando');showKommandoTab('kampagnen');return;}
    if(v==='hqDokumente'){_showView('hqKommando');showKommandoTab('dokumente');return;}
    if(v==='hqKalender'){_showView('hqKommando');showKommandoTab('kalender');return;}
    if(v==='hqAufgaben'){_showView('hqKommando');showKommandoTab('aufgaben');return;}
    if(v==='hqAuswertung') renderHqAuswertung();
    if(v==='hqWissen') renderHqWissen();
    if(v==='hqSupport') renderHqSupport();
    if(v==='hqShop') renderHqShop();
    if(v==='hqBilling') { initBillingModule(); showBillingTab('overview'); }
    if(v==='hqBillingDetail') { /* opened via showBillingInvoice() */ }
    if(v==='standortBilling') { initStandortBilling(); showStBillingTab('invoices'); }
    if(v==='hqEinstellungen') renderHqEinstellungen();
    if(v==='mitarbeiter') renderPartnerMitarbeiter();
    if(v==='hqKommando') renderKommandozentrale();
    if(v==='kalender') loadKalTermine();
    if(v==='todo') loadTodos();
    if(v==='notifications') renderNotifications('all');
    // Auto-Loading for Standort-Views
    if(v==='controlling') { showControllingTab('cockpit'); renderPerformanceCockpit(); loadBwaList(); }
    if(v==='verkauf') { showVerkaufTab('pipeline'); }
    if(v==='kommunikation') { showKommTab('chat'); }
    if(v==='aktenschrank') { loadAktenFiles(); }
    if(v==='devStatus') { _showView('entwicklung'); setTimeout(function(){showEntwicklungTab('module')},50); return; }
};
}
// Try immediately, retry after modules-ready event
_hookShowView();
if (!window._showViewHooked) {
    window.addEventListener('vit:modules-ready', function() { _hookShowView(); });
}

// Strangler Fig
const _exports = {renderHqVerkauf,renderHqAktionen,generateDemoBwaData,renderPerformanceCockpit};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });

// === Window Export: loadHqVerkaufData (alias für renderHqVerkauf) ===
window.loadHqVerkaufData = renderHqVerkauf;
