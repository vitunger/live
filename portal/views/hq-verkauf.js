/**
 * views/hq-verkauf.js - HQ Verkauf, Handlungsbedarf, Modulübersicht, Portal-Nutzung, Performance, Mobile Sidebar
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
        var r = await sb.from('standorte').select('id, name, slug').order('name');
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
        var tr = await sb.from('verkauf_tracking').select('standort_id, geplant, spontan, ergo, verkauft, umsatz').gte('datum', mondayStr).lte('datum', sundayStr);
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
        var lr = await sb.from('leads').select('standort_id, id').in('status', ['lead','angebot','schwebend']);
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
        var r = await sb.from('lead_automations').select('*').order('created_at');
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
    } catch(e) { container.innerHTML = '<p class="text-sm text-red-400">Fehler: ' + e.message + '</p>'; }
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
    if(!text) { alert('Bitte Text eingeben'); return; }
    
    var resp = await sb.from('lead_automations').insert({
        from_stage: from === '*' ? '*' : (STAGE_TO_DB[from] || from),
        to_stage: STAGE_TO_DB[to] || to,
        action: action,
        action_text: text,
        days_offset: days,
        action_type: action === 'todo' ? 'todo' : 'note',
        enabled: true,
        is_global: true
    });
    if(resp.error) { alert('Fehler: ' + resp.error.message); return; }
    document.getElementById('hqAutoAddForm').style.display = 'none';
    document.getElementById('hqAutoText').value = '';
    loadHqAutomations();
};

window.toggleHqAuto = async function(id, enabled) {
    var sb = window.sb || window.supabase;
    if(!sb) return;
    await sb.from('lead_automations').update({enabled: enabled}).eq('id', id);
    loadHqAutomations();
};

window.deleteHqAuto = async function(id) {
    if(!confirm('Automation wirklich löschen?')) return;
    var sb = window.sb || window.supabase;
    if(!sb) return;
    await sb.from('lead_automations').delete().eq('id', id);
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



// ======================================================
// === MODULÜBERSICHT / DEV-STATUS ===
// ======================================================
var currentModulFilter = 'alle';

// Aufwand: S = <1 Tag, M = 1-3 Tage, L = 3-7 Tage, XL = >1 Woche
var MODUL_DATEN = {
    standort: [
        {name:'Startseite / Dashboard', view:'homeView', status:'live', typ:'standort', version:'1.4.0', details:'Personalisiert, 14 Widgets (12 Live aus DB, 2 Demo). Pipeline, Verkauf, Termine, Aufgaben, Team, Controlling, Support, Nachrichten, Monatsfokus, Jahresziele, Journal, Maßnahmen alle live.', kiPrio:35, aufwand:'S', kiTodo:'Restliche Demo-Widgets (Top-Verkäufer, Neue Inhalte) an DB anbinden.'},
        {name:'Verkauf / CRM', view:'verkaufView', status:'teilweise', typ:'standort', version:'2.1.0', details:'React Pipeline (Kanban, Drag&Drop, Gamification), Scan-Upload mit KI-Analyse via Edge Function, KI-Verkaufstrainer, Wochenansicht, Auswertung', kiPrio:2, aufwand:'L', kiTodo:'✅ API-Key gesichert (Edge Function). Noch offen: Angebotserstellung PDF, Lead-Import, Follow-up-Erinnerungen, Supabase-Anbindung Pipeline-Deals.'},
        {name:'Kalender', view:'kalenderView', status:'live', typ:'standort', version:'2.0.0', details:'Monats/Wochen/Tagesansicht, Wiederkehrende Termine, Teilnehmer, Serien, CRUD komplett, 8 Typen, Mini-Kalender, HQ-Kalender', kiPrio:20, aufwand:'XL', kiTodo:'MS365-Sync, Drag&Drop, Notifications nice-to-have.'},
        {name:'Aufgaben / Todos', view:'todoView', status:'live', typ:'standort', version:'2.0.0', details:'Todoist-Redesign: Sektionen, Subtasks mit Fortschritt, Board/Kanban Drag&Drop, Detail-Panel, Labels, Kommentare, Quick-Add, Suche – alles DB+Realtime', kiPrio:30, aufwand:'M', kiTodo:'Label-Management UI, Zuweisung an Mitarbeiter.'},
        {name:'Kommunikation', view:'kommunikationView', status:'live', typ:'standort', version:'3.0.0', details:'Teams-Hybrid: 2-Spalten Chat mit Konversations-Sidebar (Kanäle, Nachrichten, Ankündigungen), Thread-Replies, fixierte Eingabe. Forum (CRUD+Kommentare), Brett (CRUD+Nachr. an Autor), Mini-Kalender – alles DB+Realtime', kiPrio:28, aufwand:'M', kiTodo:'Push-Notifications. Emoji-Reactions. Nachricht bearbeiten/löschen.'},
        {name:'Zahlen (BWA)', view:'controllingView', status:'live', typ:'standort', version:'2.4.0', details:'Performance-Cockpit, BWA-Parser (13+ Formate), KI-Fallback für unbekannte Formate, PDF-Support, Multi-Upload Batch, Detail-Positionen, KPIs, Trend-Sparklines, Plan/Ist, Jahresplan-Upload', kiPrio:3, aufwand:'M', kiTodo:'Benchmarks gegen Netzwerk-Durchschnitt, Liquiditätsplanung.'},
        {name:'Marketing', view:'marketingView', status:'teilweise', typ:'standort', version:'1.0.0', details:'6 Tabs: Performance (Cross-Channel KPIs), Budget (491k€ Jahresbudget, Spending-Chart), Leads (Forecast, Live-Leads), Social (Local Hero), Strategie, Wissen', kiPrio:8, aufwand:'L', kiTodo:'DB-Tabellen für Kampagnen/Budget anlegen, Social-Media Kalender, Content-Bibliothek. Aktuell Demo-Daten aber vollständige UI.'},
        {name:'Einkauf', view:'einkaufView', status:'teilweise', typ:'standort', version:'1.0.0', details:'5 Tabs: Sortiment (Hauptmarken-Cards, Bestandsmarken, Teilelieferanten), Lieferanten (65 Einträge mit Status/Konditionen/IHT/B2B), Zentralreg. (Cronbank/IHT/HIW-System), Strategie (Fortschritt, ToDos), Wissen (5 Sub-Sections: IHT, Parts-Matrix, DB1, Kernsortiment, Vororder)', kiPrio:12, aufwand:'M', kiTodo:'Lieferanten-DB anlegen (aktuell JS-Array), Konditionen editierbar machen, Bestellvorschläge.'},
        {name:'Dashboards', view:'dashboardsView', status:'demo', typ:'standort', version:'0.1.0', details:'Tabs vorhanden, Inhalte statisch', kiPrio:10, aufwand:'L', kiTodo:'Echte Charts aus BWA-Daten, Verkaufsdaten, Pipeline-Conversion.'},
        {name:'Allgemein', view:'allgemeinView', status:'teilweise', typ:'standort', version:'1.1.0', details:'6 Tabs: Übersicht (Monatsfokus, Meeting, Ziele, Maßnahmen), Jahresziele (Hart/SMART/Soft mit CRUD + Modal), Monatsplan (12 Monate, Massnahmen, Zielverknüpfung), Partner-Journal (Gesprächsprotokoll + Modal), Strategie, Wissen. 3 neue DB-Tabellen mit RLS.', kiPrio:9, aufwand:'M', kiTodo:'Supabase-Anbindung der 3 Tabellen (partner_jahresziele, partner_monatsplan, partner_journal). UI komplett fertig.'},
        {name:'Wissen', view:'wissenView', status:'teilweise', typ:'standort', version:'0.5.0', details:'Struktur mit Bereichen (Verkauf, Marketing, Einkauf, Controlling, Allgemein), Suche, Wissen-Tabs in jedem Modul', kiPrio:15, aufwand:'L', kiTodo:'CMS-Backend: Artikel erstellen, Kategorien. Basis für Wissen-Tabs in anderen Modulen.'},
        {name:'Support', view:'supportView', status:'teilweise', typ:'standort', version:'1.1.0', details:'Tickets mit DB, Kontakte-Seite', kiPrio:22, aufwand:'M', kiTodo:'Ticket-Prioritäten, SLA-Timer, E-Mail-Benachrichtigung.'},
        {name:'Ideenboard', view:'ideenboardView', status:'live', typ:'standort', version:'1.0.0', details:'Einreichen, Voting, Status – alles DB', kiPrio:34, aufwand:'S', kiTodo:'Kommentar-Funktion. Grundfunktion top.'},
        {name:'Feedback-Widget + Ideenboard-Tab', view:'hqIdeenView', status:'live', typ:'alle', version:'1.1.0', details:'Top-Center-Button „Portal verbessern", Kategorien (Bug/Wunsch/UX/Performance/Idee), Sprachaufnahme, Bildschirmaufnahme, Screenshot, Supabase Storage + portal_feedback Tabelle, als Tab im Ideenboard integriert mit Filter/Status/Detail, Pulse-Animation, kontextuelles Prompt bei Modulwechsel', kiPrio:2, aufwand:'M', kiTodo:'Audio-Transkription via Whisper, Asana-Integration.'},
        {name:'Shop', view:'shopView', status:'beta', typ:'standort', version:'1.0.0', details:'Produkte bestellen, automatische Rechnungserstellung, LexOffice-Sync', kiPrio:18, aufwand:'L', kiTodo:'Bestellstatus-Tracking, HQ-Bestätigungsworkflow.'},
        {name:'Aktenschrank', view:'aktenschrankView', status:'live', typ:'standort', version:'1.0.0', details:'Upload, Download, Kategorien – alles DB', kiPrio:31, aufwand:'S', kiTodo:'Ordner-System, Dateigröße-Limits. Funktioniert.'},
        {name:'Onboarding', view:'onboardingView', status:'teilweise', typ:'standort', version:'0.5.0', details:'Asana-Demo-Integration, Checklisten', kiPrio:7, aufwand:'L', kiTodo:'Echte Asana-API Anbindung oder eigene Checklisten-DB. Wichtig für neue Partner.'},
        {name:'Mitarbeiter', view:'mitarbeiterView', status:'live', typ:'standort', version:'1.5.0', details:'Anlegen, Rollen, Approval, Passwort-Reset, Deaktivierung', kiPrio:29, aufwand:'S', kiTodo:'Aktivitäts-Log. Funktioniert sehr gut.'}
    ],
    hq: [
        {name:'Netzwerk-Cockpit', view:'hqCockpitView', status:'teilweise', typ:'hq', version:'1.0.0', details:'KPIs, Schnellzugriffe, Standort-Vergleich, teilweise mit echten Daten', kiPrio:4, aufwand:'M', kiTodo:'Echte KPIs aus allen Standort-Daten aggregieren. Zentrales HQ-Dashboard.'},
        {name:'Kommandozentrale', view:'hqKommandoView', status:'teilweise', typ:'hq', version:'1.2.0', details:'7 Tabs (Standorte, Mitarbeiter, Kampagnen, Kommunikation, Aufgaben, Kalender, Dokumente), teilweise mit DB', kiPrio:5, aufwand:'XL', kiTodo:'Alle Tabs mit echten Daten versorgen. Mitarbeiter-Tab funktioniert bereits.'},
        {name:'Handlungsbedarf', view:'hqAktionenView', status:'teilweise', typ:'hq', version:'0.5.0', details:'Auto-Erkennung aus Standort-KPIs, priorisierte Aktionsliste', kiPrio:1, aufwand:'L', kiTodo:'Echte Regeln: Fehlende BWAs, negatives Ergebnis, offene Tickets. Höchste Prio für HQ-Alltag.'},
        {name:'HQ Standorte', view:'hqStandorteView', status:'live', typ:'hq', version:'1.0.0', details:'Alle Standorte mit Filter und Status', kiPrio:25, aufwand:'M', kiTodo:'Standort-Detail-Seite mit allen KPIs.'},
        {name:'HQ Finanzen', view:'hqFinanzenView', status:'live', typ:'hq', version:'1.3.0', details:'BWA-Status aller Standorte, Netzwerk-Finanzen, Periodenvergleich', kiPrio:6, aufwand:'M', kiTodo:'Netzwerk-P&L, Standort-Vergleich, Excel/PDF-Export.'},
        {name:'HQ Marketing', view:'hqMarketingView', status:'teilweise', typ:'hq', version:'1.0.0', details:'5 Tabs: Übersicht, Budgetsteuerung (15 Standorte × 8 Spalten), Leadreport (Ranking mit Balken), Jahresgespräche (Status-Tracking), Handlungsbedarf (Ampel-Alerts)', kiPrio:16, aufwand:'M', kiTodo:'DB-Anbindung für Budget und Lead-Daten. UI komplett fertig.'},
        {name:'HQ Einkauf', view:'hqEinkaufView', status:'teilweise', typ:'hq', version:'1.0.0', details:'3 Tabs: Übersicht (Dashboard mit 5-Standort-Vergleich, Alarme, Rohertrag-Bars), Lieferanten (editierbar mit Modal), Strategien (Fortschritt pro Standort mit Ampel)', kiPrio:19, aufwand:'M', kiTodo:'Lieferanten-DB, Konditionen editierbar per Supabase.'},
        {name:'HQ Verkauf', view:'hqVerkaufView', status:'demo', typ:'hq', version:'0.1.0', details:'Ranking mit Demo-Daten, KPIs', kiPrio:11, aufwand:'M', kiTodo:'Echtes Netzwerk-Ranking aus verkauf_tracking + leads.'},
        {name:'HQ Allgemein', view:'hqAllgemeinView', status:'teilweise', typ:'hq', version:'1.0.0', details:'Netzwerk-Stimmung (4 Kategorien), HQ-Aufgaben aus Partner-Journals, Standort-Tabelle (Stimmung, Monatsfokus, Ziele, Maßnahmen, Gespräche)', kiPrio:9, aufwand:'M', kiTodo:'Supabase-Anbindung an partner_journal, partner_jahresziele, partner_monatsplan Tabellen.'},
        {name:'HQ Auswertung / Nutzung', view:'hqAuswertungView', status:'live', typ:'hq', version:'1.1.0', details:'Portal-Nutzung mit echten DB-Daten: Logins, BWA-Status, Modul-Nutzung, Aufgaben, Score pro Standort. Supabase RPC get_portal_usage_stats()', kiPrio:14, aufwand:'S', kiTodo:'Weitere BI-Auswertungen: Netzwerk-Trends, Saisonvergleiche, Forecasting.'},
        {name:'HQ Wissen', view:'hqWissenView', status:'teilweise', typ:'hq', version:'0.5.0', details:'Artikel-Übersicht mit Kategorien', kiPrio:13, aufwand:'L', kiTodo:'CMS: Artikel erstellen/bearbeiten/publizieren, Pflichtlektüre.'},
        {name:'HQ Support', view:'hqSupportView', status:'live', typ:'hq', version:'1.0.0', details:'Netzwerk-Tickets, Status ändern, Prioritäten', kiPrio:24, aufwand:'M', kiTodo:'Ticket-Zuweisung, SLA-Tracking, Auto-Eskalation.'},
        {name:'HQ Ideen', view:'hqIdeenView', status:'live', typ:'hq', version:'1.0.0', details:'Ideen verwalten, Status ändern, Filter', kiPrio:32, aufwand:'S', kiTodo:'Idee-zu-Projekt Konversion. Grundfunktion top.'},
        {name:'HQ Shop', view:'hqShopView', status:'beta', typ:'hq', version:'1.0.0', details:'Produkte verwalten, Bestellungen einsehen und bestätigen', kiPrio:21, aufwand:'L', kiTodo:'Lagerverwaltung, Versandintegration.'},
        {name:'HQ Abrechnung', view:'hqBillingView', status:'beta', typ:'hq', version:'1.0.0', details:'Monats-Drafts, Quartals-Settlement, Strategien, Produkte, Tools – Full Stack mit Supabase Edge Function', kiPrio:2, aufwand:'XL', kiTodo:'Stripe/LexOffice-Integration, PDF-Export, automatischer SEPA-Einzug.'},
        {name:'Standort Buchhaltung', view:'standortBillingView', status:'beta', typ:'standort', version:'1.0.0', details:'Rechnungsübersicht, Jahresstrategie einreichen, Kostenaufschlüsselung mit Formeln', kiPrio:3, aufwand:'L', kiTodo:'PDF-Download, Zahlungsstatus-Tracking.'},
        {name:'WaWi Belege (Tab in Buchhaltung)', view:'standortBillingView', status:'beta', typ:'standort', version:'1.1.0', details:'PDF-Upload & Parser für Angebote/Aufträge/Rechnungen, Belegübersicht mit Filtern, Umsatz-Dashboard, Leasing-Auswertung, Beleg-Detailansicht. Jetzt als Tab im Buchhaltungs-Modul. Pipeline: Browser-seitiges PDF-Parsing via pdf.js', kiPrio:2, aufwand:'M', kiTodo:'Email-Ingestion (IMAP), Multi-Page PDF Tests, WooCommerce Stock-Sync.'},
        {name:'HQ Einstellungen', view:'hqEinstellungenView', status:'live', typ:'hq', version:'1.2.0', details:'Module aktivieren/deaktivieren, Rollen-Matrix, User-Freigabe – alles DB', kiPrio:36, aufwand:'S', kiTodo:'Branding-Einstellungen. Core funktioniert bereits.'}
    ],
    widgets: [
        {name:'Widget: Umsatz & Ergebnis', status:'live', typ:'widget', details:'Integriert in Controlling-Widget: Umsatz + Ergebnis aus letzter BWA', kiPrio:37, aufwand:'S', kiTodo:'Plan-Vergleich wenn Plan-Daten vorhanden.'},
        {name:'Widget: Pipeline', status:'live', typ:'widget', details:'Live aus leads-Tabelle: Offene Leads, Angebote, Pipeline-Wert', kiPrio:38, aufwand:'S', kiTodo:'Click-Through zu Lead. Funktioniert.'},
        {name:'Widget: Termine heute', status:'live', typ:'widget', details:'Live aus termine-Tabelle, farbige Tagesansicht', kiPrio:39, aufwand:'S', kiTodo:'Termin-Direkterstellung. Funktioniert.'},
        {name:'Widget: Offene Aufgaben', status:'live', typ:'widget', details:'Live aus todos-Tabelle, Quick-Toggle zum Abhaken direkt im Widget', kiPrio:40, aufwand:'S', kiTodo:'Direkt-Erstellung im Widget. Funktioniert.'},
        {name:'Widget: Marketing Performance', status:'demo', typ:'widget', details:'4 KPIs (Kosten MTD, Leads, Store Visits, Budget). Demo-Daten bis Marketing-DB fertig.', kiPrio:23, aufwand:'M', kiTodo:'An echte Marketing-DB anbinden.'},
        {name:'Widget: Controlling', status:'live', typ:'widget', details:'Live aus bwa_daten: Umsatz, Rohertrag-%, Ergebnis der letzten BWA', kiPrio:41, aufwand:'S', kiTodo:'Trend-Pfeil vs. Vormonat. Funktioniert.'},
        {name:'Widget: Support Tickets', status:'live', typ:'widget', details:'Live aus support_tickets: Offene Tickets mit Alter in Tagen, Farbcodierung', kiPrio:42, aufwand:'S', kiTodo:'Farbe bei >7 Tage. Funktioniert.'},
        {name:'Widget: Nachrichten HQ', status:'live', typ:'widget', details:'Live aus ankuendigungen: Neueste Nachrichten mit relativer Zeitanzeige, Kategorie-Farben', kiPrio:43, aufwand:'S', kiTodo:'Funktioniert. Keine Änderung nötig.'},
        {name:'Widget: Team-Übersicht', status:'live', typ:'widget', details:'Live aus users-Tabelle: Aktive Mitarbeiter mit Rollen-Icons', kiPrio:44, aufwand:'S', kiTodo:'Funktioniert.'},
        {name:'Widget: Wissen', status:'demo', typ:'widget', details:'Kuratierte Wissens-Artikel. Demo-Daten bis CMS-Backend fertig.', kiPrio:45, aufwand:'S', kiTodo:'An Wissens-CMS anbinden.'},
        {name:'Widget: Verkaufserfolg KW', status:'live', typ:'widget', details:'Live aus verkauf_tracking: Verkaufsquote, Beratungen, aktuelle KW', kiPrio:17, aufwand:'M', kiTodo:'Echte Wochen-Daten aus verkauf_tracking.'},
        {name:'Widget: Monatsfokus', status:'live', typ:'widget', details:'Live aus partner_monatsplan: Aktueller Fokus und Beschreibung', kiPrio:46, aufwand:'S', kiTodo:'Funktioniert.'},
        {name:'Widget: Jahresziele', status:'live', typ:'widget', details:'Live aus partner_jahresziele: Top-2 Ziele mit Fortschrittsbalken', kiPrio:47, aufwand:'S', kiTodo:'Funktioniert.'},
        {name:'Widget: Letztes Journal', status:'live', typ:'widget', details:'Live aus partner_journal: Letztes Gespräch mit Stimmung', kiPrio:48, aufwand:'S', kiTodo:'Funktioniert.'},
        {name:'Widget: Offene Maßnahmen', status:'live', typ:'widget', details:'Live aus partner_journal: Offene Massnahmen aus Gesprächen', kiPrio:49, aufwand:'S', kiTodo:'Funktioniert.'}
    ]
};

// HQ-Prio: eigene Reihenfolge, gespeichert
var hqPrioOrder = null;
export function loadHqPrio() { try { var s = localStorage.getItem('vitbikes_hq_prio'); if(s) hqPrioOrder = JSON.parse(s); } catch(e) {} }
export function saveHqPrio() { try { localStorage.setItem('vitbikes_hq_prio', JSON.stringify(hqPrioOrder)); } catch(e) {} }
export function resetHqPrio() { hqPrioOrder = null; try { localStorage.removeItem('vitbikes_hq_prio'); } catch(e) {} renderModulStatus(); }
export function getAllModulesFlat() { return MODUL_DATEN.standort.concat(MODUL_DATEN.hq).concat(MODUL_DATEN.widgets); }

export function getAufwandBadge(a) {
    var map = {'S':{bg:'bg-green-100 text-green-700',label:'S (<1 Tag)'},'M':{bg:'bg-blue-100 text-blue-700',label:'M (1-3 Tage)'},'L':{bg:'bg-orange-100 text-orange-700',label:'L (3-7 Tage)'},'XL':{bg:'bg-red-100 text-red-700',label:'XL (>1 Woche)'}};
    var m = map[a] || map['M'];
    return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold '+m.bg+'">'+m.label+'</span>';
}
export function getTypBadge(t) {
    var map = {'standort':{bg:'bg-indigo-100 text-indigo-700',label:'🏪 Standort'},'hq':{bg:'bg-purple-100 text-purple-700',label:'🏢 HQ'},'widget':{bg:'bg-cyan-100 text-cyan-700',label:'📊 Widget'}};
    var m = map[t] || map['standort'];
    return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold '+m.bg+'">'+m.label+'</span>';
}
export function getStatusBadge(s) {
    var map = {'live':{bg:'bg-green-100 text-green-800',icon:'🟢',label:'Live'},'teilweise':{bg:'bg-yellow-100 text-yellow-800',icon:'🟡',label:'Teilweise'},'demo':{bg:'bg-orange-100 text-orange-800',icon:'🟠',label:'Demo/UI'},'stub':{bg:'bg-red-100 text-red-800',icon:'🔴',label:'Stub'}};
    var m = map[s] || map['stub'];
    return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold '+m.bg+'">'+m.icon+' '+m.label+'</span>';
}

export function filterModulStatus(f) {
    currentModulFilter = f;
    document.querySelectorAll('.ms-filter').forEach(function(b) {
        b.className = 'ms-filter text-xs px-3 py-1.5 rounded-full font-semibold ' + (b.getAttribute('data-f') === f ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600');
    });
    renderModulStatus();
}

var _dragIdx = null;
export function onPrioDragStart(e) { _dragIdx = parseInt(e.target.closest('tr').getAttribute('data-idx')); e.dataTransfer.effectAllowed = 'move'; }
export function onPrioDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; var tr = e.target.closest('tr'); if(tr) tr.style.borderTop = '2px solid #EF7D00'; }
export function onPrioDragLeave(e) { var tr = e.target.closest('tr'); if(tr) tr.style.borderTop = ''; }
export function onPrioDrop(e) {
    e.preventDefault();
    var targetIdx = parseInt(e.target.closest('tr').getAttribute('data-idx'));
    e.target.closest('tr').style.borderTop = '';
    if(_dragIdx === null || _dragIdx === targetIdx) return;
    var item = hqPrioOrder.splice(_dragIdx, 1)[0];
    hqPrioOrder.splice(targetIdx, 0, item);
    saveHqPrio();
    renderModulStatus();
    _dragIdx = null;
}
export function moveHqPrio(idx, dir) {
    if(!hqPrioOrder) return;
    var newIdx = idx + dir;
    if(newIdx < 0 || newIdx >= hqPrioOrder.length) return;
    var tmp = hqPrioOrder[idx];
    hqPrioOrder[idx] = hqPrioOrder[newIdx];
    hqPrioOrder[newIdx] = tmp;
    saveHqPrio();
    renderModulStatus();
}

export function renderModulStatus() {
    var el = document.getElementById('entwModulContent') || document.getElementById('modulStatusContent');
    if(!el) return;
    var h = '';
    var allModules = getAllModulesFlat();
    var counts = {live:0, teilweise:0, demo:0, stub:0};
    allModules.forEach(function(m) { counts[m.status] = (counts[m.status]||0)+1; });
    var sumEl = document.getElementById('modulStatusSummary');
    if(sumEl) {
        sumEl.innerHTML = '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">🟢 '+counts.live+' Live</span>'
            +'<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-semibold">🟡 '+counts.teilweise+' Teilweise</span>'
            +'<span class="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-semibold">🟠 '+counts.demo+' Demo</span>'
            +'<span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-semibold">🔴 '+counts.stub+' Stub</span>';
    }

    // KI PRIO VIEW
    if(currentModulFilter === 'kiPrio') {
        var sorted = allModules.slice().sort(function(a,b){ return (a.kiPrio||99) - (b.kiPrio||99); });
        h += '<div class="vit-card p-6 mb-6">';
        h += '<div class="flex items-center justify-between mb-4">';
        h += '<div><h2 class="text-lg font-bold text-gray-800">🤖 KI-Empfehlung: Umsetzungs-Reihenfolge</h2>';
        h += '<p class="text-xs text-gray-500 mt-1">Sortiert nach Business-Impact × Machbarkeit. Niedrigere Nummer = höhere Priorität.</p></div></div>';
        h += '<div class="overflow-x-auto"><table class="w-full text-sm">';
        h += '<thead><tr class="border-b border-gray-200"><th class="text-left py-2 px-3 text-xs font-bold text-gray-500 w-10">#</th><th class="text-left py-2 px-3 text-xs font-bold text-gray-500">Modul</th><th class="text-left py-2 px-3 text-xs font-bold text-gray-500">Status</th><th class="text-left py-2 px-3 text-xs font-bold text-gray-500">Typ</th><th class="text-left py-2 px-3 text-xs font-bold text-gray-500">Aufwand</th><th class="text-left py-2 px-3 text-xs font-bold text-gray-500">Nächster Schritt</th></tr></thead><tbody>';
        sorted.forEach(function(m, i) {
            var bg = i < 3 ? 'bg-green-50' : i < 10 ? 'bg-yellow-50' : '';
            h += '<tr class="border-b border-gray-100 hover:bg-gray-50 '+bg+'">';
            h += '<td class="py-3 px-3 font-bold '+(i<3?'text-green-600':i<10?'text-yellow-600':'text-gray-400')+'">'+(i+1)+'</td>';
            h += '<td class="py-3 px-3"><div class="font-semibold text-gray-800">'+m.name+'</div><div class="text-[10px] text-gray-400 mt-0.5">'+m.details+'</div></td>';
            h += '<td class="py-3 px-3">'+getStatusBadge(m.status)+'</td>';
            h += '<td class="py-3 px-3">'+getTypBadge(m.typ)+'</td>';
            h += '<td class="py-3 px-3">'+getAufwandBadge(m.aufwand)+'</td>';
            h += '<td class="py-3 px-3 text-xs text-gray-600 max-w-xs">'+(m.kiTodo||'')+'</td>';
            h += '</tr>';
        });
        h += '</tbody></table></div></div>';
        el.innerHTML = h;
        return;
    }

    // HQ PRIO VIEW
    if(currentModulFilter === 'hqPrio') {
        loadHqPrio();
        if(!hqPrioOrder) {
            hqPrioOrder = allModules.slice().sort(function(a,b){ return (a.kiPrio||99)-(b.kiPrio||99); }).map(function(m){ return {name:m.name, typ:m.typ}; });
        }
        var prioModules = [];
        hqPrioOrder.forEach(function(p) {
            var found = allModules.find(function(m){ return m.name===p.name && m.typ===p.typ; });
            if(found) prioModules.push(found);
        });
        h += '<div class="vit-card p-6 mb-6">';
        h += '<div class="flex items-center justify-between mb-4">';
        h += '<div><h2 class="text-lg font-bold text-gray-800">🏢 HQ-Priorität: Eigene Reihenfolge</h2>';
        h += '<p class="text-xs text-gray-500 mt-1">Per Drag & Drop oder Pfeiltasten sortieren. Wird automatisch gespeichert.</p></div>';
        h += '<button onclick="resetHqPrio()" class="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold">↩️ Auf KI-Empfehlung zurücksetzen</button></div>';
        h += '<div class="overflow-x-auto"><table class="w-full text-sm">';
        h += '<thead><tr class="border-b border-gray-200"><th class="w-10"></th><th class="text-left py-2 px-3 text-xs font-bold text-gray-500 w-10">#</th><th class="text-left py-2 px-3 text-xs font-bold text-gray-500">Modul</th><th class="text-left py-2 px-3 text-xs font-bold text-gray-500">Status</th><th class="text-left py-2 px-3 text-xs font-bold text-gray-500">Aufwand</th><th class="text-left py-2 px-3 text-xs font-bold text-gray-500">Nächster Schritt</th><th class="w-20"></th></tr></thead><tbody>';
        prioModules.forEach(function(m, i) {
            h += '<tr class="border-b border-gray-100 hover:bg-gray-50 cursor-grab" draggable="true" data-idx="'+i+'" ondragstart="onPrioDragStart(event)" ondragover="onPrioDragOver(event)" ondragleave="onPrioDragLeave(event)" ondrop="onPrioDrop(event)">';
            h += '<td class="py-2 px-2 text-gray-300 cursor-grab">⠿</td>';
            h += '<td class="py-3 px-3 font-bold text-gray-400">'+(i+1)+'</td>';
            h += '<td class="py-3 px-3"><div class="font-semibold text-gray-800">'+m.name+'</div><div class="text-[10px] text-gray-400">'+getTypBadge(m.typ)+'</div></td>';
            h += '<td class="py-3 px-3">'+getStatusBadge(m.status)+'</td>';
            h += '<td class="py-3 px-3">'+getAufwandBadge(m.aufwand)+'</td>';
            h += '<td class="py-3 px-3 text-xs text-gray-600 max-w-xs">'+(m.kiTodo||'')+'</td>';
            h += '<td class="py-2 px-2"><button onclick="moveHqPrio('+i+',-1)" class="text-gray-400 hover:text-gray-700 text-sm">▲</button><button onclick="moveHqPrio('+i+',1)" class="text-gray-400 hover:text-gray-700 text-sm ml-1">▼</button></td>';
            h += '</tr>';
        });
        h += '</tbody></table></div></div>';
        el.innerHTML = h;
        return;
    }

    // NORMAL FILTER (alle / standort / hq / widgets)
    var modules = currentModulFilter === 'alle' ? allModules : (MODUL_DATEN[currentModulFilter] || allModules.filter(function(m){ return m.typ === currentModulFilter; }));
    h += '<div class="overflow-x-auto"><table class="w-full text-sm">';
    h += '<thead><tr class="border-b border-gray-200"><th class="text-left py-2 px-3 text-xs font-bold text-gray-500">Modul</th><th class="text-left py-2 px-3 text-xs font-bold text-gray-500">Version</th><th class="text-left py-2 px-3 text-xs font-bold text-gray-500">Status</th><th class="text-left py-2 px-3 text-xs font-bold text-gray-500">Typ</th><th class="text-left py-2 px-3 text-xs font-bold text-gray-500">Details</th></tr></thead><tbody>';
    modules.forEach(function(m) {
        h += '<tr class="border-b border-gray-100 hover:bg-gray-50">';
        h += '<td class="py-3 px-3 font-semibold text-gray-800">'+m.name+'</td>';
        h += '<td class="py-3 px-3"><span class="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">'+(m.version||'–')+'</span></td>';
        h += '<td class="py-3 px-3">'+getStatusBadge(m.status)+'</td>';
        h += '<td class="py-3 px-3">'+getTypBadge(m.typ)+'</td>';
        h += '<td class="py-3 px-3 text-xs text-gray-500">'+m.details+'</td>';
        h += '</tr>';
    });
    h += '</tbody></table></div>';
    el.innerHTML = h;
}

// Alias for auto-loading
export function renderDevStatus() {
    renderModulStatus();
    // Hide Portal-Nutzung tab for non-HQ users
    var nutzTab = document.getElementById('devStatusNutzungTab');
    if(nutzTab) nutzTab.style.display = ((currentRoles||[]).indexOf('hq') !== -1) ? '' : 'none';
}

export function showDevTab(tab) {
    document.querySelectorAll('.dev-tab-content').forEach(function(el) { el.style.display = 'none'; });
    document.querySelectorAll('.dev-tab').forEach(function(b) {
        b.className = 'dev-tab whitespace-nowrap py-3 px-1 border-b-2 border-transparent text-sm text-gray-500';
    });
    var tabEl = document.getElementById('devTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (tabEl) tabEl.style.display = 'block';
    var btn = document.querySelector('.dev-tab[data-dtab="' + tab + '"]');
    if (btn) btn.className = 'dev-tab whitespace-nowrap py-3 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
    if (tab === 'modules') renderModulStatus();
    if (tab === 'releases') renderReleaseUpdates();
    if (tab === 'nutzung') renderDevNutzung();
}

var RELEASE_UPDATES = [
    {
        version: '2.9.0',
        date: '2026-02-17',
        title: 'Buchhaltung & i18n-Finalisierung',
        type: 'major',
        changes: [
            {cat:'feature', text:'Buchhaltungs-Modul: Komplett-Frontend für HQ + Standort mit Monats-Drafts, Quartals-Settlement, Strategieverwaltung, Produktkatalog und Tool-Zuweisung'},
            {cat:'feature', text:'Standort Zahlungsstatus-Tab: Summary-Cards (Bezahlt/Offen/Gesamt) + Zahlungsverlauf-Timeline mit Status-Icons und Datumsanzeige'},
            {cat:'feature', text:'PDF-Rechnungsdownload: Browser-basierte PDF-Generierung mit vit:bikes Branding, Positionen, Formeln und Bankdaten'},
            {cat:'feature', text:'Kostenaufschlüsselung: Transparente monatliche Berechnung mit Formeln (Umsatzbeteiligung, Grundgebühr, Marketing, Tools)'},
            {cat:'backend', text:'Billing Edge Function: 11 Actions (generate-monthly-drafts, quarterly-settlement, finalize, mark-paid, line-item CRUD, strategy approve/lock, billing-overview)'},
            {cat:'backend', text:'7 neue DB-Tabellen: billing_products, billing_annual_strategy, billing_tool_packages, billing_user_tool_assignments, billing_accounts, billing_invoices, billing_invoice_line_items + billing_audit_log + billing_credits'},
            {cat:'improve', text:'i18n komplett: 414 Keys × 3 Sprachen (DE/EN/NL) synchron – Niederländisch von 58 auf 414 Keys aufgefüllt'},
            {cat:'improve', text:'93 hardcodierte deutsche Strings durch t()-Aufrufe ersetzt (Alerts, Confirms, Buttons, Trainer, Billing)'},
            {cat:'improve', text:'Umbenennung „Abrechnung" → „Buchhaltung" im gesamten Portal'},
        ]
    },
    {
        version: '2.8.0',
        date: '2026-02-17',
        title: 'Push-Notifications & Service Worker',
        type: 'major',
        changes: [
            {cat:'feature', text:'Web Push Notifications: Vollständiges System mit VAPID-Verschlüsselung, Service Worker Registration und Browser-Permission-Handling'},
            {cat:'feature', text:'Push-Preferences: 6 individuelle Toggles (BWA-Erinnerungen, Nachrichten, Aufgaben, Ankündigungen, Verkauf, Trainer) im Profil'},
            {cat:'backend', text:'Edge Function push-notify: Abonnement-Verwaltung, Benachrichtigungsversand mit web-push Lib, automatische Cleanup fehlgeschlagener Subscriptions'},
            {cat:'backend', text:'DB-Schema: push_subscriptions + push_preferences Tabellen mit RLS-Policies'},
            {cat:'fix', text:'Desktop Chrome Push: Encryption-Troubleshooting, VAPID-Key Base64-Konvertierung, Service Worker Scope-Fix'},
        ]
    },
    {
        version: '2.7.0',
        date: '2026-02-16',
        title: 'BWA KI-Analyse & Controlling Deep-Dive',
        type: 'major',
        changes: [
            {cat:'feature', text:'KI-gestützte BWA-Analyse: Claude API (Sonnet) analysiert hochgeladene BWA-Daten und gibt Handlungsempfehlungen in 4 Kategorien (Umsatz, Kosten, Personal, Liquidität)'},
            {cat:'feature', text:'BWA Edge Function: 13 verschiedene Dateiformat-Parser (DATEV Standard, DATEV Kompakt, Agenda, Addison, Lexware, CSV, Excel u.a.)'},
            {cat:'improve', text:'DATEV Vorzeichen-Inversion: Automatische Korrektur der DATEV-typischen negativen Umsatzwerte'},
            {cat:'improve', text:'BWA-Trend-Ansicht: Monatsvergleich mit Sparklines und Farbcodierung für Abweichungen'},
        ]
    },
    {
        version: '2.6.0',
        date: '2026-02-15',
        title: 'Verkaufs-Pipeline React Rewrite',
        type: 'major',
        changes: [
            {cat:'feature', text:'React Kanban-Pipeline: 6-stufiges Board (Lead → Angebot → Schwebend → Verkauft → Fakturiert) mit Drag & Drop'},
            {cat:'feature', text:'Gamification: Punkte-System, Streak-Tracking, Level-Badges und Netzwerk-Ranking für Verkäufer'},
            {cat:'feature', text:'KI-Verkaufstrainer: Gesprächssimulation mit Claude API, personalisierte Tipps basierend auf Pipeline-Daten'},
            {cat:'improve', text:'Deal-Kalkulator: Automatische Berechnung von Rahmenwert, Zubehör, Gesamtwert mit Marge'},
        ]
    },
    {
        version: '2.5.0',
        date: '2026-02-14',
        title: 'Kommunikationsmodul & Forum',
        type: 'major',
        changes: [
            {cat:'feature', text:'Echtzeit-Chat: 1:1 und Gruppen-Nachrichten mit Supabase Realtime, Lesebestätigungen und Datei-Anhänge'},
            {cat:'feature', text:'Ankündigungen: HQ kann Netzwerk-weite Mitteilungen mit Prioritäts-Markierung und Lesebestätigung versenden'},
            {cat:'feature', text:'Schwarzes Brett: Community-Posts mit Upvoting, Kategorien und Anhängen'},
            {cat:'feature', text:'Ideenboard: Standorte können Verbesserungsvorschläge einreichen, abstimmen und kommentieren'},
        ]
    },
    {
        version: '2.4.0',
        date: '2026-02-12',
        title: 'Health Score & Trainer-System',
        type: 'major',
        changes: [
            {cat:'feature', text:'Health Score Dashboard: Aggregierter KPI pro Standort aus 5 Kategorien (Verkauf, BWA, Marketing, Werkstatt, Portal-Nutzung)'},
            {cat:'feature', text:'8 interaktive Micro-Trainer: Nachfass-Systematik, BWA lesen, Content erstellen, Durchlaufzeit, Lead-Qualifizierung, Rohertrag steigern, Liquiditätsplanung, GMB optimieren'},
            {cat:'feature', text:'Smart Interceptor: Erkennt Support-Anfragen und bietet kontextbezogene Sofortlösungen vor Ticket-Erstellung'},
            {cat:'feature', text:'HQ Netzwerk-Cockpit: Ampel-Übersicht aller Standorte mit Score, Trend und Handlungsbedarf'},
        ]
    },
    {
        version: '2.3.0',
        date: '2026-02-10',
        title: 'Onboarding & Wissensportal',
        type: 'feature',
        changes: [
            {cat:'feature', text:'Onboarding-Checkliste: Geführter Prozess für neue Standorte mit Pflicht-/Optional-Aufgaben und Fortschrittsanzeige'},
            {cat:'feature', text:'Wissensportal: Kursbasiertes Lernmodul mit Kapiteln, eingebetteten Videos und Quiz-Fragen'},
            {cat:'feature', text:'Dokumentenarchiv (Aktenschrank): Kategorisierte Ablage mit Upload, Suche und Vorschau'},
        ]
    },
    {
        version: '2.2.0',
        date: '2026-02-08',
        title: 'Local Hero Social Media',
        type: 'feature',
        changes: [
            {cat:'feature', text:'Local Hero Content-Plattform: Themen-Aufträge mit Briefings, Hooks, Beispielvideos und Upload-Workflow'},
            {cat:'feature', text:'Content-Ranking: Netzwerk-weites Leaderboard mit Badges (Erster Upload bis 50 Videos)'},
            {cat:'feature', text:'Kanal-Übersicht: Instagram, TikTok, YouTube, Facebook mit Follower-Zahlen und Engagement-Tracking'},
        ]
    },
    {
        version: '2.1.0',
        date: '2026-02-05',
        title: 'Aufgaben & Kalender',
        type: 'feature',
        changes: [
            {cat:'feature', text:'Todo-System: Aufgaben mit Priorität, Kategorie, Fälligkeitsdatum – automatische + manuelle Tasks'},
            {cat:'feature', text:'Kalender: Termin-Verwaltung mit Tages/Wochen/Monatsansicht, Serienterminen und Farb-Kategorien'},
            {cat:'feature', text:'BWA-Erinnerungssystem: 4-stufige Eskalation (Info → Warnung → Dringend → Überfällig) mit automatischer HQ-Benachrichtigung'},
        ]
    },
    {
        version: '2.0.0',
        date: '2026-02-01',
        title: 'Portal-Launch mit Supabase Backend',
        type: 'major',
        changes: [
            {cat:'backend', text:'Migration von statischem Prototype zu Supabase-Backend mit Auth, RLS-Policies und Realtime'},
            {cat:'feature', text:'Multi-Tenant Architektur: Rollen-basierte Sichtbarkeit (HQ sieht alles, Standorte nur eigene Daten)'},
            {cat:'feature', text:'Login-System: E-Mail/Passwort mit Passwort-Reset, Session-Management und automatischer Standort-Zuweisung'},
            {cat:'feature', text:'Dashboard: Personalisierte Startseite mit KPIs (Beratungen, Angebote, Tickets) und Schnellzugriff'},
            {cat:'feature', text:'Ticket-System: Kategorie-basierter Support mit Status-Workflow, Kommentaren und Prioritäten'},
        ]
    },
    {
        version: '1.0.0',
        date: '2026-01-15',
        title: 'Erster Prototype',
        type: 'initial',
        changes: [
            {cat:'feature', text:'Single-Page HTML-Portal mit Demo-Daten für alle Kernmodule'},
            {cat:'feature', text:'3-Sprachen-System (DE/EN/NL) mit data-i18n Attributen und switchLang()'},
            {cat:'feature', text:'Responsive Design mit Tailwind CSS, vit:bikes Corporate Design (Orange #EF7D00)'},
            {cat:'feature', text:'Modul-Status-Tracker mit Live/Teilweise/Demo/Stub-Klassifizierung und KI-Priorität'},
        ]
    }
];

export function renderReleaseUpdates() {
    var el = document.getElementById('releaseUpdatesContent');
    if (!el) return;

    var catColors = {
        feature: {bg:'bg-green-100', text:'text-green-800', label:'Feature'},
        improve: {bg:'bg-blue-100', text:'text-blue-800', label:'Verbesserung'},
        fix: {bg:'bg-yellow-100', text:'text-yellow-800', label:'Fix'},
        backend: {bg:'bg-purple-100', text:'text-purple-800', label:'Backend'},
    };
    var typeIcons = {major:'🚀', feature:'✨', fix:'🔧', initial:'🎉'};

    var h = '';
    
    // Summary
    h += '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">';
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-vit-orange">' + RELEASE_UPDATES.length + '</p><p class="text-xs text-gray-400">Releases</p></div>';
    var totalChanges = RELEASE_UPDATES.reduce(function(s,r){ return s + r.changes.length; }, 0);
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-green-600">' + totalChanges + '</p><p class="text-xs text-gray-400">Änderungen</p></div>';
    var features = RELEASE_UPDATES.reduce(function(s,r){ return s + r.changes.filter(function(c){return c.cat==='feature'}).length; }, 0);
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-blue-600">' + features + '</p><p class="text-xs text-gray-400">Features</p></div>';
    var latestDate = RELEASE_UPDATES[0] ? RELEASE_UPDATES[0].date : '—';
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-gray-700">' + latestDate + '</p><p class="text-xs text-gray-400">Letztes Update</p></div>';
    h += '</div>';

    // Timeline
    h += '<div class="relative">';
    h += '<div class="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>';

    RELEASE_UPDATES.forEach(function(rel, idx) {
        var isLatest = idx === 0;
        h += '<div class="relative pl-14 pb-8">';
        
        // Timeline dot
        h += '<div class="absolute left-4 w-5 h-5 rounded-full border-2 ' + (isLatest ? 'bg-vit-orange border-vit-orange' : 'bg-white border-gray-300') + ' flex items-center justify-center" style="top:4px">';
        if (isLatest) h += '<div class="w-2 h-2 bg-white rounded-full"></div>';
        h += '</div>';

        // Release card
        h += '<div class="vit-card p-5 ' + (isLatest ? 'ring-2 ring-vit-orange/30' : '') + '">';
        
        // Header
        h += '<div class="flex items-center justify-between mb-3">';
        h += '<div class="flex items-center gap-2">';
        h += '<span class="text-lg">' + (typeIcons[rel.type] || '📦') + '</span>';
        h += '<span class="font-mono text-xs font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">v' + rel.version + '</span>';
        if (isLatest) h += '<span class="text-[10px] font-bold bg-vit-orange text-white px-2 py-0.5 rounded-full uppercase">Aktuell</span>';
        h += '</div>';
        h += '<span class="text-xs text-gray-400">' + new Date(rel.date).toLocaleDateString('de-DE', {day:'numeric', month:'long', year:'numeric'}) + '</span>';
        h += '</div>';

        h += '<h3 class="font-bold text-gray-800 mb-3">' + rel.title + '</h3>';

        // Changes
        h += '<div class="space-y-2">';
        rel.changes.forEach(function(c) {
            var cc = catColors[c.cat] || catColors.feature;
            h += '<div class="flex items-start gap-2">';
            h += '<span class="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ' + cc.bg + ' ' + cc.text + '">' + cc.label + '</span>';
            h += '<span class="text-sm text-gray-600">' + c.text + '</span>';
            h += '</div>';
        });
        h += '</div>';

        h += '</div></div>';
    });

    h += '</div>';
    el.innerHTML = h;
}

// === PORTAL-NUTZUNG TAB (integrated from standalone module) ===
export function renderDevNutzung() {
    var el = document.getElementById('devNutzungContent');
    if (!el) return;
    var standorte = [
        {name:'Berlin-Brandenburg', score:91, users:5, active:5, logins:142, features:7, bwa:'Jan 2026', bwaAge:12, termine:28, todos:45, leads:18, chat:67, tickets:2, forum:8},
        {name:'Hamburg', score:87, users:4, active:4, logins:118, features:7, bwa:'Jan 2026', bwaAge:15, termine:22, todos:38, leads:15, chat:52, tickets:1, forum:5},
        {name:'München BAL', score:82, users:3, active:3, logins:95, features:6, bwa:'Jan 2026', bwaAge:18, termine:18, todos:32, leads:12, chat:41, tickets:3, forum:4},
        {name:'Grafrath', score:74, users:4, active:3, logins:78, features:6, bwa:'Jan 2026', bwaAge:22, termine:15, todos:28, leads:8, chat:34, tickets:2, forum:3},
        {name:'Lohmar', score:72, users:3, active:3, logins:69, features:5, bwa:'Dez 2025', bwaAge:48, termine:12, todos:22, leads:7, chat:28, tickets:1, forum:2},
        {name:'Rottweil', score:68, users:3, active:2, logins:54, features:5, bwa:'Jan 2026', bwaAge:20, termine:10, todos:18, leads:6, chat:22, tickets:4, forum:1},
        {name:'Münster', score:65, users:2, active:2, logins:48, features:5, bwa:'Dez 2025', bwaAge:52, termine:8, todos:15, leads:5, chat:18, tickets:1, forum:0},
        {name:'Witten', score:58, users:3, active:2, logins:38, features:4, bwa:'Nov 2025', bwaAge:78, termine:6, todos:12, leads:4, chat:14, tickets:2, forum:0},
        {name:'Reutlingen', score:45, users:2, active:1, logins:22, features:3, bwa:'Okt 2025', bwaAge:112, termine:3, todos:8, leads:2, chat:6, tickets:1, forum:0},
        {name:'Holzkirchen', score:32, users:2, active:1, logins:12, features:2, bwa:null, bwaAge:null, termine:1, todos:4, leads:1, chat:3, tickets:0, forum:0}
    ];
    var avgScore = Math.round(standorte.reduce(function(s,x){return s+x.score},0)/standorte.length);
    var totalUsers = standorte.reduce(function(s,x){return s+x.users},0);
    var activeUsers = standorte.reduce(function(s,x){return s+x.active},0);
    var totalLogins = standorte.reduce(function(s,x){return s+x.logins},0);
    var avgFeatures = (standorte.reduce(function(s,x){return s+x.features},0)/standorte.length).toFixed(1);
    var h = '';
    h += '<div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">';
    h += '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400">\u00d8 Nutzungs-Score</p><p class="text-2xl font-bold '+(avgScore>=70?'text-green-600':avgScore>=50?'text-yellow-600':'text-red-500')+'">'+avgScore+'</p><p class="text-[10px] text-gray-400">von 100</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400">Aktive Standorte</p><p class="text-2xl font-bold text-vit-orange">'+standorte.length+'</p><p class="text-[10px] text-gray-400">im Netzwerk</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400">Nutzer aktiv</p><p class="text-2xl font-bold text-blue-600">'+activeUsers+' / '+totalUsers+'</p><p class="text-[10px] text-gray-400">'+Math.round(activeUsers/totalUsers*100)+'% aktiv</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400">Logins (30 Tage)</p><p class="text-2xl font-bold text-green-600">'+totalLogins+'</p><p class="text-[10px] text-gray-400">\u00d8 '+Math.round(totalLogins/standorte.length)+' pro Standort</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400">\u00d8 Features</p><p class="text-2xl font-bold text-purple-600">'+avgFeatures+' / 7</p><p class="text-[10px] text-gray-400">Module genutzt</p></div>';
    h += '</div>';
    h += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">';
    h += '<div class="vit-card p-5"><h3 class="text-sm font-bold text-gray-800 mb-3">\ud83c\udfc6 Aktivste Standorte</h3><div class="space-y-2">';
    standorte.slice(0,5).forEach(function(s,i){ var medals=['\ud83e\udd47','\ud83e\udd48','\ud83e\udd49','4.','5.']; h+='<div class="flex items-center justify-between p-2 rounded-lg '+(i<3?'bg-green-50':'bg-gray-50')+'"><div class="flex items-center gap-2"><span class="text-sm">'+medals[i]+'</span><span class="text-sm font-semibold">vit:bikes '+s.name+'</span></div><div class="flex items-center gap-3"><div class="w-20 bg-gray-200 rounded-full h-2"><div class="bg-green-500 h-2 rounded-full" style="width:'+s.score+'%"></div></div><span class="text-sm font-bold text-green-600 w-8 text-right">'+s.score+'</span></div></div>'; });
    h += '</div></div>';
    h += '<div class="vit-card p-5"><h3 class="text-sm font-bold text-gray-800 mb-3">\u26a0\ufe0f Handlungsbedarf</h3><div class="space-y-2">';
    standorte.slice(-3).reverse().forEach(function(s){ var issues=[]; if(s.bwaAge===null) issues.push('\u274c Keine BWA'); else if(s.bwaAge>60) issues.push('\u23f0 BWA '+s.bwaAge+' Tage alt'); if(s.active/s.users<0.6) issues.push('\ud83d\udc64 Nur '+s.active+'/'+s.users+' Nutzer aktiv'); if(s.features<4) issues.push('\ud83d\udcc9 Nur '+s.features+'/7 Module'); h+='<div class="p-3 bg-red-50 rounded-lg border-l-4 border-red-300"><div class="flex items-center justify-between mb-1"><span class="font-semibold text-sm">vit:bikes '+s.name+'</span><span class="text-sm font-bold text-red-500">Score: '+s.score+'</span></div><p class="text-xs text-gray-600">'+issues.join(' \u00b7 ')+'</p></div>'; });
    h += '</div></div></div>';
    h += '<div class="vit-card p-5 mb-6"><h3 class="text-sm font-bold text-gray-800 mb-4">\ud83d\udccb Modul-Nutzung im Netzwerk</h3>';
    var modules=[{name:'Kalender',icon:'\ud83d\udcc5',key:'termine',pct:80},{name:'Aufgaben',icon:'\u2705',key:'todos',pct:90},{name:'Pipeline/CRM',icon:'\ud83d\udcb0',key:'leads',pct:70},{name:'BWA/Controlling',icon:'\ud83d\udcca',key:'bwa',pct:80},{name:'Chat',icon:'\ud83d\udcac',key:'chat',pct:80},{name:'Support',icon:'\ud83c\udf9f\ufe0f',key:'tickets',pct:70},{name:'Forum',icon:'\ud83d\udcdd',key:'forum',pct:40}];
    h += '<div class="space-y-3">'; modules.forEach(function(m){ var color=m.pct>=80?'bg-green-500':m.pct>=60?'bg-yellow-500':'bg-red-400'; h+='<div class="flex items-center gap-3"><span class="w-6 text-center">'+m.icon+'</span><span class="w-28 text-sm font-semibold">'+m.name+'</span><div class="flex-1 bg-gray-200 rounded-full h-3"><div class="'+color+' h-3 rounded-full" style="width:'+m.pct+'%"></div></div><span class="text-xs font-bold w-10 text-right">'+m.pct+'%</span></div>'; }); h+='</div></div>';
    h += '<div class="vit-card overflow-hidden"><div class="p-4 bg-gray-50 border-b"><h3 class="text-sm font-bold text-gray-800">\ud83d\udcc8 Alle Standorte \u2013 Detail-\u00dcbersicht</h3></div>';
    h += '<div class="overflow-x-auto"><table class="w-full text-xs"><thead class="bg-gray-50 text-gray-500 uppercase"><tr><th class="text-left p-3">Standort</th><th class="text-center p-2">Score</th><th class="text-center p-2">Nutzer</th><th class="text-center p-2">Logins</th><th class="text-center p-2">Features</th><th class="text-center p-2">BWA</th><th class="text-center p-2">Termine</th><th class="text-center p-2">Aufgaben</th><th class="text-center p-2">Leads</th><th class="text-center p-2">Chat</th><th class="text-center p-2">Tickets</th><th class="text-center p-2">Forum</th></tr></thead><tbody>';
    standorte.forEach(function(s){ var sc=s.score>=75?'bg-green-100 text-green-700':s.score>=50?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'; var bc=s.bwaAge===null?'text-red-500':s.bwaAge>60?'text-red-500':s.bwaAge>30?'text-yellow-600':'text-green-600'; h+='<tr class="border-t hover:bg-gray-50"><td class="p-3 font-semibold text-sm">vit:bikes '+s.name+'</td><td class="p-2 text-center"><span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold '+sc+'">'+s.score+'</span></td><td class="p-2 text-center">'+s.active+'<span class="text-gray-400">/'+s.users+'</span></td><td class="p-2 text-center font-mono">'+s.logins+'</td><td class="p-2 text-center">'+s.features+'<span class="text-gray-400">/7</span></td><td class="p-2 text-center '+bc+'">'+(s.bwa||'\u2014')+'</td><td class="p-2 text-center">'+s.termine+'</td><td class="p-2 text-center">'+s.todos+'</td><td class="p-2 text-center">'+s.leads+'</td><td class="p-2 text-center">'+s.chat+'</td><td class="p-2 text-center">'+s.tickets+'</td><td class="p-2 text-center">'+s.forum+'</td></tr>'; });
    h += '</tbody></table></div></div>';
    el.innerHTML = h;
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
        el.innerHTML = '<div class="text-center py-8"><p class="text-red-400 text-sm">Fehler beim Laden: ' + err.message + '</p><button onclick="renderPerformanceCockpit()" class="mt-2 text-sm text-vit-orange underline">Erneut versuchen</button></div>';
    }
}

// Hook HQ views into showView (deferred until available)
function _hookShowView() {
    if (typeof showView === 'undefined' || !window.showView) return;
    var origShowView2 = window.showView;
    window.showView = function(v) {
    // Rechteprüfung
    if(!hasAccess(v)) {
        alert('Kein Zugriff auf diesen Bereich mit deiner aktuellen Rolle.');
        return;
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
const _exports = {renderHqVerkauf,renderHqAktionen,loadHqPrio,getAllModulesFlat,getAufwandBadge,getTypBadge,getStatusBadge,filterModulStatus,onPrioDragStart,onPrioDragOver,onPrioDragLeave,onPrioDrop,moveHqPrio,renderDevStatus,renderDevNutzung,generateDemoBwaData};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
// [prod] log removed

// === Window Export: loadHqVerkaufData (alias für renderHqVerkauf) ===
window.loadHqVerkaufData = renderHqVerkauf;
window.renderHqAktionen = renderHqAktionen;
window.renderHqVerkauf = renderHqVerkauf;
