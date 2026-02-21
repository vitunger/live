/**
 * views/misc-views.js - Modulübersicht, PortalNutzung, Mobile, Social Media, Verkaufstraining, React Mount
 * @module views/misc-views
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




// === MOBILE SIDEBAR ===
export function toggleMobileSidebar() {
    var sidebar = document.getElementById('sidebarNav');
    var overlay = document.getElementById('sidebarOverlay');
    if(sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
    } else {
        sidebar.classList.add('mobile-open');
        overlay.classList.add('active');
    }
}
// Desktop sidebar collapse
export function toggleSidebarCollapse() {
    if(window.innerWidth <= 768) return; // No collapse on mobile
    var sidebar = document.getElementById('sidebarNav');
    var isCollapsed = sidebar.classList.toggle('collapsed');
    try { localStorage.setItem('vit-sidebar-collapsed', isCollapsed ? '1' : '0'); } catch(e){}
}
// Restore sidebar state on load (desktop only)
(function(){
    try {
        if(window.innerWidth > 768 && localStorage.getItem('vit-sidebar-collapsed') === '1') {
            var sb = document.getElementById('sidebarNav');
            if(sb) sb.classList.add('collapsed');
        }
    } catch(e){}
})();
// On resize: remove collapsed on mobile, restore on desktop
window.addEventListener('resize', function() {
    var sb = document.getElementById('sidebarNav');
    if(!sb) return;
    if(window.innerWidth <= 768) {
        sb.classList.remove('collapsed');
    } else {
        try { if(localStorage.getItem('vit-sidebar-collapsed') === '1') sb.classList.add('collapsed'); } catch(e){}
    }
});
export function closeMobileSidebar() {
    var sidebar = document.getElementById('sidebarNav');
    var overlay = document.getElementById('sidebarOverlay');
    if(sidebar) sidebar.classList.remove('mobile-open');
    if(overlay) overlay.classList.remove('active');
}
// Auto-close sidebar on navigation (mobile)
var origShowViewMobile = showView;
showView = function(v) {
    closeMobileSidebar();
    origShowViewMobile(v);
};

// === VIEW MODE SWITCHER (Partner vs HQ) ===
export function switchViewMode(mode) {
    var isHQ = mode === 'hq';

    if(isHQ) {
        currentRole = 'hq';
        // Keep original roles but add hq
        if(currentRoles.indexOf('hq') < 0) currentRoles.push('hq');
    } else {
        // Remove hq from roles, restore original
        currentRoles = currentRoles.filter(function(r){ return r !== 'hq'; });
        if(currentRoles.length === 0) currentRoles = ['inhaber'];
        currentRole = currentRoles[0];
    }

    try { updateUIForRole(); } catch(e) { console.warn(e); }
    try { applyModulStatus(); } catch(e) { console.warn(e); }

    if(isHQ) {
        _showView('hqCockpit');
    } else {
        _showView('home');
    }
}

// Init: show partner mode by default
switchViewMode('partner_grafrath');

// === SOCIAL MEDIA LOCAL HERO ===
var smThemen = [
    {id:'c001',thema:'Eure Kundenstories',kat:'Story',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Was hat euch am meisten ueberrascht nach dem Kauf?"','„Unser Kunde faehrt jetzt jeden Tag mit dem Rad zur Arbeit – und hat uns das geschrieben:"'],
        hauptteil:'Kunden vor oder im Laden nach ihrer Erfahrung fragen. Was hat sich veraendert, seit sie das Rad haben? Wie fuehlt sich der Alltag an? Einfach authentisch erzaehlen lassen.',
        cta:'Komm vorbei und werde Teil der vit:bikes Community. Wir freuen uns auf deine Geschichte!',
        hqTipp:'Kurzes, ehrliches Statement vom Kunden ist Gold wert. Handy aufs Stativ, Kunde davor – 30 Sekunden reichen.'
    },
    {id:'c002',thema:'Vario-Sattelstuetze: Lifehack fuer die Ampel',kat:'Technik',schwierig:'leicht',done:false,
        beispiel:'https://www.instagram.com/reel/example_c002/',
        hook:['„Du stehst an der Ampel und kommst kaum vom Sattel?"','„Dieser eine Hebel veraendert alles beim Stadtradeln."'],
        hauptteil:'Zeige die Vario-Sattelstuetze in Aktion: Hebel druecken, Sattel runter, bequem stehen. Erklaere kurz: Nicht nur fuers Gelaende, auch in der Stadt mega praktisch. Verschiedene Modelle erwaehnen.',
        cta:'Vario-Sattelstuetze nachruestbar – komm vorbei, wir zeigen dir welche an dein Rad passt.',
        hqTipp:'Am besten direkt vor dem Laden an der Strasse drehen. Reale Ampel-Situation wirkt authentisch.'
    },
    {id:'c003',thema:'Erzaehl was Schoenes! Positive Kundenerfahrung',kat:'Story',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Was war euer schoenster Moment mit einem Kunden?"','„Manchmal passieren im Laden Dinge, die kann man nicht planen."'],
        hauptteil:'Erzaehle eine persoenliche, positive Erfahrung mit einem Kunden. Was hat dich beruehrt, ueberrascht, gluecklich gemacht? Authentisch und emotional.',
        cta:'Bei uns geht es nicht nur ums Rad – sondern um euch. Kommt vorbei!',
        hqTipp:'Kamera auf Stativ, direkt in die Kamera sprechen. Persoenlich und ehrlich – das kommt am besten an.'
    },
    {id:'c008',thema:'Warum das Systemgewicht beim Radfahren zaehlt',kat:'Beratung',schwierig:'mittel',done:false,
        beispiel:null,
        hook:['„Alle reden ueber Radgewicht – aber was wirklich zaehlt, ist das Systemgewicht."','„15 kg Rad oder 18 kg? Warum der Unterschied kleiner ist als du denkst."'],
        hauptteil:'Erklaere Systemgewicht = Fahrer + Gepaeck + Rad. Zeige: 3 kg Unterschied am Rad machen bei 100 kg Systemgewicht nur 3% aus. Viel wichtiger: Ergonomie, Komfort, Antrieb. Beim E-Bike relativiert der Motor das Gewicht zusaetzlich.',
        cta:'Wir beraten dich ganzheitlich – nicht nur nach Gewicht. Komm zur Probefahrt!',
        hqTipp:'Mit einer Waage im Laden visualisieren. Rad draufstellen, dann Rucksack dazu – der Aha-Effekt kommt von selbst.'
    },
    {id:'c015',thema:'Unsere Bedarfsanalyse',kat:'Beratung',schwierig:'leicht',done:true,
        beispiel:null,
        hook:['„Bevor wir dir ein Rad zeigen, stellen wir erstmal Fragen."','„Die wichtigste Phase beim Radkauf? Bevor du ueberhaupt aufsteigst."'],
        hauptteil:'Zeige den Beratungsbogen, erklaere die Fragen: Wie oft faehrst du? Welche Strecken? Welcher Untergrund? Koerpergroesse? Beschwerden? Zeige wie du mit dem Kunden zusammen die Beduerfnisse herausarbeitest.',
        cta:'Individuelle Beratung statt Massenware. Vereinbare deinen Beratungstermin!',
        hqTipp:'Beratungssituation nachstellen mit Kollege als Kunde. Natuerlich und locker.'
    },
    {id:'c018',thema:'Aufgeschobener Service wird teuer',kat:'Werkstatt',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Diesen Fehler machen 80% aller Radfahrer."','„Kleine Wartung jetzt oder grosse Reparatur spaeter – du hast die Wahl."'],
        hauptteil:'Zeige Beispiele: Verschlissene Kette zerstoert Ritzel (30€ vs. 150€). Abgefahrene Bremsbelaege beschaedigen Scheibe. Platter Reifen durch kaputten Mantel. Immer die guenstige Wartung vs. die teure Folge-Reparatur gegenueberstellen.',
        cta:'Mach einen Termin zur Inspektion – bevor es teuer wird. Link in Bio!',
        hqTipp:'Verschleissteile nebeneinander legen: alt vs. neu. Der visuelle Vergleich wirkt sofort.'
    },
    {id:'c019',thema:'Wie eine Vermessung bei uns ablaeuft',kat:'Beratung',schwierig:'mittel',done:true,
        beispiel:null,
        hook:['„In 15 Minuten weisst du mehr ueber deinen Koerper als in 15 Jahren Radfahren."','„Radfahren tut weh? Dann stimmt die Vermessung nicht."'],
        hauptteil:'Zeige den Ablauf Schritt fuer Schritt: Beinlaenge messen, Sitzknochenvermessung, Oberkoerper-Flexibilitaet, Ergebnis erklaeren, Rad einstellen. Zeige die Messgeraete und was sie aussagen.',
        cta:'Deine persoenliche Vermessung wartet. Buch deinen Termin – kostenlos beim Neukauf!',
        hqTipp:'Am besten eine echte Vermessung mitfilmen (mit Einverstaendnis des Kunden natuerlich).'
    },
    {id:'c021',thema:'Entspannt bergauf fahren',kat:'Tipps',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Bergauf fahren und dabei laecheln? Geht!"','„Die meisten schalten zu spaet – deswegen wird es anstrengend."'],
        hauptteil:'Tipps: Frueh genug runterschalten, gleichmaessige Trittfrequenz 70-80, Oberkoerper locker, Gewicht nach vorne. Beim E-Bike: Richtige Unterstuetzungsstufe waehlen, nicht im hoechsten Modus dauerhaft fahren.',
        cta:'Komm zur Probefahrt und erlebe wie entspannt E-Biken bergauf sein kann!',
        hqTipp:'Am besten draussen an einem kleinen Huegel drehen. Vorher-Nachher mit richtigem vs. falschem Gang.'
    },
    {id:'C024',thema:'Vorstellung vit:Fahrspassgarantie',kat:'USP',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Wann faehrt man gerne Fahrrad?"','„Wenn alles passt."'],
        hauptteil:'Beim Neuradkauf gibt es unsere Fahrspassgarantie kostenlos dazu: 3D-Vermessung, Rad perfekt eingestellt, 4 Wochen Rueckgaberecht. Werkstatt max. 48 Stunden – sonst Leihrad. Kleine Nachjustierungen 3 Monate gratis. Zubehoer montieren wir auch spaeter kostenlos.',
        cta:'Am Ende gehts nur darum: Dass Radfahren Spass macht. Komm vorbei!',
        hqTipp:'Elementarer USP! Jeder Standort sollte das drehen. Einfach die 5 Punkte durchgehen, laechelnd.'
    },
    {id:'c022',thema:'Akku im Winter richtig nutzen',kat:'Technik',schwierig:'mittel',done:true,
        beispiel:null,
        hook:['„Dein E-Bike-Akku leidet im Winter – wenn du diesen Fehler machst."','„Weniger Reichweite bei Kaelte? So holst du das Maximum raus."'],
        hauptteil:'Akku bei Zimmertemperatur lagern und erst kurz vor Fahrt einsetzen. Nicht unter 0°C laden. Eco-Modus nutzt bei Kaelte mehr als Turbo. Akku nie komplett leer fahren im Winter. Kontakte sauber halten.',
        cta:'Fragen zum Akku? Komm vorbei oder ruf an – wir helfen gerne!',
        hqTipp:'Kann man gut im Laden drehen mit Akku in der Hand. Thermometer daneben stellen als Effekt.'
    },
    {id:'c025',thema:'Sicher anfahren im Winter',kat:'Tipps',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Der gefaehrlichste Moment im Winter? Die ersten 3 Meter."','„So faehrst du sicher los wenn es glatt ist."'],
        hauptteil:'Niedrige Unterstuetzungsstufe beim Anfahren. Sanft in die Pedale, nicht ruckartig. Sattel etwas tiefer fuer bessere Standsicherheit. Reifendruck leicht reduzieren fuer mehr Grip. Immer beide Bremsen gleichmaessig.',
        cta:'Komm zum Winter-Check – wir pruefen Bremsen, Reifen und Licht!',
        hqTipp:'Draussen bei echtem Winterwetter drehen – Authentizitaet schlaegt Studioluft.'
    },
    {id:'c027',thema:'Einfach Bremsbelaege selber tauschen',kat:'Werkstatt',schwierig:'mittel',done:false,
        beispiel:'https://www.instagram.com/reel/DTKkhQjjVoT/',
        hook:['„Bremsbelaege wechseln ist kein Hexenwerk – wenn man einen wichtigen Schritt kennt."','„Viele scheitern beim Bremsbelagwechsel an einem Detail: den Bremskolben."'],
        hauptteil:'Bremsbelaege sind Verschleissteile. Abgefahren = schlechtere Bremsleistung. Neue sind dicker, Kolben stehen weiter draussen → muessen zurueckgedrueckt werden. Ablauf: Rad sicher abstellen, Vorderrad ausbauen, alte Belaege raus, Kolben vorsichtig zurueckdruecken (Kunststoff-Montierhebel), neue Belaege rein, Sicherung montieren, Vorderrad einsetzen, Bremse mehrfach ziehen.',
        cta:'Bei Unsicherheit lieber kurz stoppen und bei uns vorbeikommen. Bremsen sind sicherheitsrelevant!',
        hqTipp:'Super einfaches und erfolgreiches Video mit viel Mehrwert. Das kann jeder aus der Werkstatt nachmachen! 💪'
    },
    {id:'c028',thema:'Schwalbe Click Valve Ventil',kat:'Technik',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Reifen aufpumpen nervt? Dieses Ventil aendert alles."','„Klick – und die Pumpe sitzt perfekt. Kein Fummelei mehr."'],
        hauptteil:'Zeige das Click-Valve in Aktion: Aufstecken, Klick, pumpen, fertig. Vergleiche mit herkoemmlichem Ventil (Fummelei, Luft entweicht). Erwaehne: Kompatibel mit allen Schwalbe-Schlaeuchen, einfach nachzuruesten.',
        cta:'Click Valve nachruessten? Haben wir da – komm vorbei oder bestell im Shop!',
        hqTipp:'Kurzes Vergleichsvideo: Alt vs. Neu. Der Unterschied verkauft sich von selbst.'
    },
    {id:'c033',thema:'Warum die richtige Rahmengroesse entscheidend ist',kat:'Beratung',schwierig:'mittel',done:false,
        beispiel:null,
        hook:['„Das falsche Rad in der richtigen Groesse ist besser als das richtige Rad in der falschen."','„Knieschmerzen, Rueckenschmerzen, Nackenschmerzen – eine Ursache."'],
        hauptteil:'Zeige zwei gleiche Raeder in verschiedenen Groessen. Erklaere was passiert bei zu gross (Ueberstreckung, Nacken) und zu klein (Knie, Ruecken). Zeige wie ihr die richtige Groesse ermittelt (nicht nur nach Koerpergroesse!).',
        cta:'Sichere Groessenberatung bei uns – kostenlos und unverbindlich.',
        hqTipp:'Am besten mit zwei Raedern nebeneinander und einer Person die beide testet.'
    },
    {id:'c038',thema:'Das ist mein Lieblingsprodukt',kat:'Story',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Wenn ich nur ein Produkt aus dem Laden mitnehmen duerfte..."','„Jeder im Team hat einen Favoriten – das ist meiner:"'],
        hauptteil:'Zeig dein persoenliches Lieblingsprodukt (muss kein Rad sein – kann Helm, Schloss, Licht, Tasche sein). Erklaere WARUM es dein Favorit ist. Was macht es besonders? Persoenliche Geschichte dazu.',
        cta:'Was ist dein Must-Have? Komm vorbei und lass dich inspirieren!',
        hqTipp:'Super einfach zu drehen, sehr persoenlich. Ideal fuer Mitarbeiter die zum ersten Mal vor der Kamera stehen.'
    },
    {id:'c060',thema:'So vielseitig ist das vit:bikes Sortiment',kat:'USP',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Von Stadtrad bis Mountainbike – alles unter einem Dach."','„Wir haben nicht nur E-Bikes. Lass mich dir zeigen was noch geht."'],
        hauptteil:'Schneller Walk-Through durch den Laden. Zeige verschiedene Kategorien: City, Trekking, E-MTB, Cargo, Kinder. Betone die Markenvielfalt und dass fuer jeden was dabei ist.',
        cta:'Egal was du suchst – bei uns findest du es. Oder wir bestellen es fuer dich!',
        hqTipp:'Dynamisch durch den Laden laufen, Kamera auf Gimbal oder einfach in der Hand. Schnelle Schnitte machen wir.'
    },
    {id:'c061',thema:'Knacken am Tretlager – was steckt dahinter?',kat:'Werkstatt',schwierig:'mittel',done:false,
        beispiel:null,
        hook:['„Dein Rad knackt beim Treten? Das kann 5 verschiedene Ursachen haben."','„Knackgeraeuesche sind nervig – aber meistens einfach zu beheben."'],
        hauptteil:'Haeufigste Ursachen: Lose Pedalgewinde, Tretlager nachziehen, Sattelklemme, Kettenblattschrauben, Schnellspanner. Zeige wie man systematisch die Ursache eingrenz. Einfache Loesungen vs. wann zum Profi.',
        cta:'Knacken nervt – wir finden die Ursache. Termin vereinbaren!',
        hqTipp:'In der Werkstatt drehen, dabei die verschiedenen Stellen am Rad zeigen und abklopfen.'
    },
    {id:'c063',thema:'Software-Update – wie fuehlt sich das an?',kat:'Technik',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Dein E-Bike bekommt Updates wie dein Handy."','„Nach dem Update fuehlt sich mein Rad an wie neu – kein Witz."'],
        hauptteil:'Zeige den Update-Prozess: Rad anschliessen, Software pruefen, Update starten. Erklaere was sich aendert: Neue Fahrmodi, bessere Motorsteuerung, Fehlerbehebung. Vergleiche vorher/nachher wenn moeglich.',
        cta:'Kostenloses Software-Update bei uns – einfach Termin machen!',
        hqTipp:'Am besten den Bildschirm zeigen waehrend das Update laeuft. Vorher/Nachher Fahreindruck waere top.'
    },
    {id:'c064',thema:'Der Aha-Moment bei der Probefahrt',kat:'Beratung',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Dieser eine Moment auf der Probefahrt – danach will jeder ein E-Bike."','„Ich sehe es jedes Mal: Dieses Grinsen nach den ersten 50 Metern."'],
        hauptteil:'Beschreibe den typischen Ablauf: Kunde steigt auf, erste Pedalumdrehung, Motor schiebt an, das Laecheln kommt. Erklaere warum die Probefahrt so wichtig ist – Zahlen und Daten ersetzen nicht das Gefuehl.',
        cta:'Erleb es selbst – kostenlose Probefahrt jederzeit bei uns!',
        hqTipp:'Ideal: Filmst den Kunden (mit Erlaubnis!) beim ersten Moment auf dem E-Bike. Das Laecheln sagt alles.'
    },
    {id:'c065',thema:'Bremsen-Check in der Werkstatt',kat:'Werkstatt',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Wann hast du zuletzt deine Bremsen checken lassen?"','„2 Minuten Check – koennen Leben retten."'],
        hauptteil:'Zeige den schnellen Bremsen-Check: Belagstaerke pruefen, Scheibe auf Verschleiss kontrollieren, Bremsflüssigkeit checken, Zugseil spannen. Was sind Warnzeichen? Quietschen, langer Bremsweg, Hebel geht bis zum Lenker.',
        cta:'Bremsen-Check bei uns – schnell, gruendlich, fuer deine Sicherheit.',
        hqTipp:'Werkstatt-Setting, Nahaufnahme der Bremsbelaege. Vergleich: Neu vs. Verschlissen.'
    },
    {id:'c068',thema:'Warum wir Kunden auch mal vom Kauf abraten',kat:'USP',schwierig:'mittel',done:false,
        beispiel:null,
        hook:['„Ja, manchmal sagen wir: Kauf das Rad nicht."','„Ein guter Berater verkaeuft dir nicht das teuerste – sondern das richtige."'],
        hauptteil:'Erklaere wann ihr abratet: Rad passt nicht zur Nutzung, Kunde braucht eigentlich eine andere Kategorie, Budget stimmt nicht (lieber gut gebraucht als schlecht neu). Das schafft Vertrauen und kommt langfristig zurueck.',
        cta:'Ehrliche Beratung statt Verkaufsdruck. Das ist vit:bikes.',
        hqTipp:'Sehr starkes Thema fuer Vertrauensaufbau. Persoenlich in die Kamera, ruhig und ehrlich.'
    },
    {id:'c069',thema:'Akku richtig laden: die 5 groessten Fehler',kat:'Technik',schwierig:'mittel',done:false,
        beispiel:null,
        hook:['„Du laedt deinen E-Bike-Akku falsch – und merkst es nicht."','„5 Fehler die deinen Akku schneller altern lassen."'],
        hauptteil:'Fehler: 1) Immer auf 100% laden (besser 80%). 2) Komplett leer fahren. 3) Bei Hitze/Kaelte laden. 4) Billig-Ladegeraet nutzen. 5) Akku monatelang voll/leer lagern. Zu jedem Fehler die Loesung.',
        cta:'Fragen zum Akku? Wir beraten dich gerne – auch nach dem Kauf!',
        hqTipp:'5 Punkte = 5 kurze Cuts. Kann man gut nummeriert darstellen (Finger zeigen oder Zahlen einblenden).'
    },
    {id:'c073',thema:'So laeuft ein professioneller Werkstatt-Check ab',kat:'Werkstatt',schwierig:'leicht',done:true,
        beispiel:null,
        hook:['„30 Punkte in 45 Minuten – so gruendlich ist unser Check."','„Dein Rad bekommt bei uns die volle Behandlung."'],
        hauptteil:'Zeige die einzelnen Pruefpunkte: Bremsen, Schaltung, Reifendruck, Speichenspannung, Tretlager, Steuersatz, Beleuchtung, Akku-Check (E-Bike). Erklaere was geprueft wird und warum.',
        cta:'Dein Rad verdient den besten Service. Termin zur Inspektion jetzt buchen!',
        hqTipp:'Top-Content! Einmal die Werkstatt-Arbeit filmen, verschiedene Stationen zeigen.'
    },
    {id:'c074',thema:'Danke zu 10.000 Follower',kat:'Story',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„10.000! Danke an jeden einzelnen von euch."','„Was als kleiner Kanal angefangen hat..."'],
        hauptteil:'Persoenliches Danke-Video. Rueckblick: Wie alles angefangen hat, Lieblingsmomente, Community-Highlights. Was kommt als naechstes?',
        cta:'Feiert mit uns – kommt im Laden vorbei, es gibt eine kleine Ueberraschung!',
        hqTipp:'Meilenstein-Videos performen super. Team zusammen vor die Kamera, Konfetti optional 🎉'
    },
    {id:'c080',thema:'Leasing vs. Kauf – was ist besser?',kat:'Beratung',schwierig:'mittel',done:false,
        beispiel:null,
        hook:['„JobRad, Bikeleasing, oder doch bar zahlen?"','„So viel sparst du wirklich beim Leasing – Klartext."'],
        hauptteil:'Vergleiche: Steuerersparnis beim Leasing (bis 40%), dafuer gebunden. Barkauf: Sofort deins, verhandelbar. Finanzierung: Flexibel, aber Zinsen. Fuer wen lohnt sich was? Rechenbeispiel mit konkreten Zahlen.',
        cta:'Wir rechnen es mit dir durch – kostenlos und unverbindlich. Komm vorbei!',
        hqTipp:'Mit Taschenrechner oder Whiteboard. Zahlen sichtbar machen ueberzeugt.'
    },
    {id:'c081',thema:'Rueckenschmerzen auf dem E-Bike',kat:'Ergonomie',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Rueckenschmerzen nach jeder Fahrt? Das muss nicht sein."','„3 Einstellungen die deinen Ruecken sofort entlasten."'],
        hauptteil:'Haeufigste Ursachen: Sattel zu niedrig/hoch, Lenker zu weit weg, falsche Rahmengroesse. Schnelle Fixes: Sattelhoehe anpassen, Vorbau kuerzer/hoeher, ergonomische Griffe. Wann professionelle Vermessung noetig.',
        cta:'Schmerzfrei Radfahren ist moeglich. Komm zur Ergonomie-Beratung!',
        hqTipp:'Person zeigt falsche vs. richtige Sitzposition. Der Unterschied ist sofort sichtbar.'
    },
    {id:'c085',thema:'Probefahren reicht nicht',kat:'USP',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Du warst Probefahren und denkst: Passt? Vielleicht nicht."','„Warum 10 Minuten Probefahrt nicht reichen fuer die richtige Entscheidung."'],
        hauptteil:'Probefahrt gibt ersten Eindruck, aber: Sitzposition zeigt Probleme erst nach 30+ Minuten. Deshalb machen wir vorab Vermessung. Rueckgaberecht nach 4 Wochen als Sicherheitsnetz. Erst im Alltag zeigt sich ob das Rad passt.',
        cta:'Bei uns hast du 4 Wochen zum Testen. Fahrspassgarantie inklusive!',
        hqTipp:'Starkes USP-Video. Kurz und knackig die Fahrspassgarantie erwaehnen.'
    },
    {id:'c088',thema:'Erklaere die MyO-Konfiguration von Orbea',kat:'Technik',schwierig:'schwer',done:false,
        beispiel:null,
        hook:['„Dein Rad, deine Farbe, deine Ausstattung – so geht Individualisierung."','„Orbea MyO: Wie du dein Traumrad selbst zusammenstellst."'],
        hauptteil:'Zeige den MyO-Konfigurator am Bildschirm oder Tablet. Schritt fuer Schritt: Modell waehlen, Farbe anpassen, Komponenten auswaehlen. Lieferzeit erwaehnen. Vorteil: Einzigartiges Rad, kein Aufpreis fuer Farbwahl.',
        cta:'Lust auf dein individuelles Orbea? Wir konfigurieren es gemeinsam mit dir!',
        hqTipp:'Bildschirmaufnahme vom Konfigurator + Reaktion des Beraters. Oder Kunde konfiguriert live.'
    },
    {id:'c089',thema:'Die Raduebergabe bei vit:bikes',kat:'USP',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Die Uebergabe ist der schoenste Moment – fuer uns und fuer euch."','„Dein neues Rad wartet. So uebergeben wir es dir."'],
        hauptteil:'Zeige den Ablauf: Rad nochmal komplett gecheckt, alles eingestellt, Funktionen erklaert (E-Bike: Display, Modi, Akku). Erste gemeinsame Runde. Fotos fuer Social Media (mit Erlaubnis). Serviceplan erklaeren.',
        cta:'Bald ist dein Rad dran. Wir freuen uns darauf!',
        hqTipp:'Die strahlenden Gesichter bei der Uebergabe sind unbezahlbar. Authentische Freude filmen.'
    },
    {id:'c091',thema:'Sitzknochenvermessung',kat:'Ergonomie',schwierig:'mittel',done:false,
        beispiel:null,
        hook:['„Dein Po schmerzt beim Radfahren? Dein Sattel ist nicht schuld – du sitzt falsch."','„Die wichtigste Zahl beim Sattelkauf: Dein Sitzknochenabstand."'],
        hauptteil:'Erklaere: Jeder hat andere Sitzknochen. Breite messen (Gel-Pad oder Wellpappe). Richtige Sattelbreite ableiten. Zeige verschiedene Saettel fuer verschiedene Breiten. Sitzposition sportlich vs. aufrecht macht auch einen Unterschied.',
        cta:'Kostenlose Sitzknochenvermessung bei uns – in 5 Minuten zum perfekten Sattel!',
        hqTipp:'Vermessungs-Prozess filmen. Der Moment wenn der Kunde die Zahl erfaehrt ist immer spannend.'
    },
    {id:'c095',thema:'Kette reinigen – auch im Winter',kat:'Werkstatt',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Im Winter rostet deine Kette 3x so schnell."','„5 Minuten Pflege sparen dir 80 Euro Kettenwechsel."'],
        hauptteil:'Zeige: Kette mit Kettenreiniger reinigen, trocknen lassen, frisches Kettenoel auftragen. Im Winter oefter noetig wegen Salz und Naesse. Warnung: Zu viel Oel zieht Schmutz an!',
        cta:'Kettenreiniger und -oel bei uns im Shop. Oder wir machen das fuer dich!',
        hqTipp:'Nahaufnahme der Kette: Schmutzig → Sauber. Vorher/Nachher ist super Content.'
    },
    {id:'c096',thema:'Riese & Mueller Vorstellung',kat:'Technik',schwierig:'mittel',done:false,
        beispiel:null,
        hook:['„Made in Germany, und das merkt man."','„Warum Riese & Mueller Premium ist – und es sich lohnt."'],
        hauptteil:'Markenvorstellung: Darmstadt, Handmontage, Qualitaet. Zeige 2-3 Modelle im Laden. Was macht R&M besonders? DualBattery, Vollfederung, Cargo-Loesungen. Fuer wen ideal?',
        cta:'Riese & Mueller Probefahrt bei uns – erlebe den Unterschied!',
        hqTipp:'Wenn R&M im Laden steht, direkt dort filmen. Qualitaet zeigen, Details hervorheben.'
    },
    {id:'c099',thema:'Was ist das Smartphone Grip?',kat:'Technik',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Dein Handy am Lenker – aber sicher."','„Navigation, Musik, Fitness – alles auf dem Rad. So befestigst du es richtig."'],
        hauptteil:'Zeige verschiedene Smartphone-Halterungen: Quad Lock, SP Connect, universelle Loesungen. Vor- und Nachteile. Wichtig: Vibrationen koennen Kamera beschaedigen! Anti-Vibrations-Modul erwaehnen.',
        cta:'Smartphone-Halterung nachruestbar – wir beraten dich welche passt!',
        hqTipp:'Zeige die Montage und das Einrasten des Handys. Der Klick-Moment ist befriedigend.'
    },
    {id:'c101',thema:'Helmberatung',kat:'Beratung',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Der beste Helm ist der, den du auch wirklich aufsetzt."','„95% tragen ihren Helm falsch. Gehoerst du dazu?"'],
        hauptteil:'Richtigen Sitz zeigen: 2 Finger ueber Augenbrauen, Riemen bilden V unter den Ohren, ein Finger zwischen Kinn und Riemen. Verschiedene Typen: City, MTB, Speed-Pedelec. MIPS erklaeren. Wann Helm tauschen (nach Sturz, nach 5 Jahren).',
        cta:'Helmberatung bei uns – finde den perfekten Helm fuer dich.',
        hqTipp:'Helm falsch aufsetzen, dann richtig. Der Unterschied ist deutlich und lehrreich.'
    },
    {id:'c103',thema:'Was faehrt vit:bikes? Team stellt ihre Raeder vor',kat:'Story',schwierig:'leicht',done:false,
        beispiel:null,
        hook:['„Was fahren eigentlich die, die den ganzen Tag Raeder verkaufen?"','„Unser Team zeigt: Das sind unsere persoenlichen Raeder."'],
        hauptteil:'Jedes Teammitglied stellt kurz sein eigenes Rad vor: Was ist es, warum genau das, was ist das Besondere daran? Persoenlich und authentisch.',
        cta:'Welches Rad passt zu dir? Wir helfen dir – aus eigener Erfahrung!',
        hqTipp:'Jeder Mitarbeiter 15-20 Sekunden mit seinem Rad. Zusammenschneiden wir. Super Team-Content!'
    }
];

var smRankingData = [
    {name:'Pfaffenhofen',count:7},{name:'Witten',count:6},{name:'Berlin',count:6},
    {name:'Weilheim',count:4},{name:'Grafrath',count:4},{name:'Wachtendonk',count:3},
    {name:'Teisendorf',count:1},{name:'Warendorf',count:1},{name:'Muenster',count:1},{name:'Lohmar',count:1},
    {name:'Karlsdorf',count:0},{name:'Garching',count:0},{name:'Reutlingen',count:0},
    {name:'Holzkirchen',count:0},{name:'Hann. Muenden',count:0},{name:'Zell',count:0},
    {name:'Wesel',count:0},{name:'Rottweil',count:0},{name:'Hamburg',count:0},
    {name:'M-Thalkirchen',count:0},{name:'Muenchen BAL',count:0}
];


// === VERKAUFSTRAINING KI ENGINE (Local Simulation) ===
// ============================================================

var TRAIN_SCENARIOS = [
    {
        id:'ebike_beratung', title:'E-Bike Erstberatung', icon:'🚲', difficulty:'Einsteiger', diffColor:'#059669',
        desc:'Kunde interessiert sich für ein E-Bike, ist unsicher und braucht Beratung.',
        opener:'Hallo! Ich schau mich mal ein bisschen um... Ich überlege mir eventuell ein E-Bike anzuschaffen, aber ich bin mir noch nicht so sicher.',
        criteria:['Bedarfsermittlung','Produktwissen','Einwandbehandlung','Abschlusstechnik','Kundenfreundlichkeit'],
        customer:'Thomas Müller, 52 Jahre, Pendler (12km), Budget 3-4k',
        responses:[
            {phase:'start', triggers:['willkommen','hallo','guten tag','herzlich','grüß','schön dass','freut mich','kann ich','darf ich','helfen','beratung','was suchen'],
             replies:['Danke! Ja, ich pendel jeden Tag 12 Kilometer zur Arbeit und dachte, vielleicht wäre ein E-Bike eine Alternative zum Auto.','Danke, ja genau. Ich fahre täglich zur Arbeit, so 12 Kilometer einfach. Da kam mir die Idee mit dem E-Bike.'],
             score:{kundenfreundlichkeit:15}},
            {phase:'bedarf', triggers:['wie weit','strecke','kilometer','wohin','wofür','nutzen','fahren','pendel','alltag','einsatz','gelände','stadt','weg','route'],
             replies:['Also hauptsächlich für den Arbeitsweg. 12 Kilometer einfach, größtenteils Radweg, ein paar Steigungen sind dabei. Und am Wochenende vielleicht mal eine Tour mit meiner Frau.','Der Arbeitsweg ist 12km, relativ flach mit zwei kleinen Hügeln. Gibt es da einen großen Unterschied bei den Motoren?'],
             score:{bedarfsermittlung:20}},
            {phase:'budget', triggers:['budget','preis','kosten','ausgeben','vorstellung','preislich','investieren','preisklasse','euro','geld','wert'],
             replies:['So zwischen 3.000 und 4.000 Euro hatte ich mir gedacht. Ist das realistisch für ein gutes E-Bike?','Hmm, ich hatte so an 3.000 bis 4.000 gedacht. Kriegt man da was Vernünftiges?'],
             score:{bedarfsermittlung:15}},
            {phase:'produkt', triggers:['motor','bosch','shimano','akku','reichweite','watt','nm','drehmoment','antrieb','mittelmotor','hinterrad','schaltung','gang','bremse','federung','rahmen','gewicht','kilo'],
             replies:['Bosch kenne ich vom Hören. Wie weit kommt man denn mit einer Akkuladung? Meine Strecke ist ja 24km hin und zurück.','Das klingt schon gut. Und wie ist das mit der Reichweite? Ich will nicht auf halber Strecke stehen bleiben!'],
             score:{produktwissen:20}},
            {phase:'einwand_akku', triggers:['reichweite','laden','akku','batterie','strom','ladezeit','km','kilometer','weit','laden'],
             replies:['80 bis 120 Kilometer? Das reicht ja locker für die ganze Woche! Muss man den Akku komplett leerfahren oder kann man auch zwischendurch laden?','Ok, das beruhigt mich. Wie lange hält so ein Akku eigentlich, bevor man ihn tauschen muss?'],
             score:{einwandbehandlung:15}},
            {phase:'einwand_diebstahl', triggers:['diebstahl','sicher','schloss','versicherung','stehlen','abschließen','geklaut','angst','keller','garage','dieb'],
             replies:['Ja, das ist bei mir ein großes Thema. Bei der Arbeit steht das Rad draußen. Was empfehlen Sie da?','Guter Punkt! Auf der Arbeit gibt es nur einen normalen Fahrradständer draußen. Gibt es gute Schlösser oder eine Versicherung?'],
             score:{einwandbehandlung:20}},
            {phase:'probefahrt', triggers:['probefahrt','testen','ausprobieren','mal drauf','fahren','sitzen','test','probe','aufsteigen','mal setzen'],
             replies:['Ja, sehr gerne! Das würde mir die Entscheidung bestimmt leichter machen.','Probefahrt wäre super! Dann merke ich ja, ob mir das Fahrgefühl taugt.'],
             score:{abschlusstechnik:20}},
            {phase:'vergleich', triggers:['unterschied','vergleich','besser','oder','modell','empfehl','welches','tipp','vorschlag','favorit','top','best'],
             replies:['Und was würden Sie mir konkret empfehlen? Also welches Modell für meinen Einsatz?','Haben Sie einen persönlichen Favoriten für Pendler in meiner Preisklasse?'],
             score:{produktwissen:15}},
            {phase:'abschluss', triggers:['bestellen','kaufen','nehmen','haben','reservieren','lieferzeit','verfügbar','mitnehmen','wann','finanzierung','leasing','jobrad'],
             replies:['Das klingt wirklich gut. Wie sieht es mit der Verfügbarkeit aus? Und bieten Sie auch Finanzierung an?','Ich bin ziemlich überzeugt. Gibt es die Möglichkeit, das über JobRad zu machen? Mein Arbeitgeber bietet das an.'],
             score:{abschlusstechnik:25}},
            {phase:'positiv', triggers:['gut','super','toll','klasse','prima','perfekt','genau','richtig','stimmt','interessant','klingt gut','spannend'],
             replies:['Ja, das klingt wirklich überzeugend. Haben Sie noch weitere Tipps für E-Bike-Einsteiger?','Super, danke für die Info! Was sollte ich noch wissen, bevor ich mich entscheide?'],
             score:{kundenfreundlichkeit:10}},
            {phase:'negativ', triggers:['teuer','viel geld','überlegen','nochmal drüber','frau fragen','weiß nicht','unsicher','schwierig','hmm','naja'],
             replies:['Hmm, das ist schon eine Menge Geld. Lohnt sich das wirklich gegenüber dem Auto?','Ich muss da nochmal drüber nachdenken. Kann ich ein Angebot mitnehmen?'],
             score:{}},
            {phase:'default', triggers:[],
             replies:['Können Sie mir dazu noch etwas mehr erzählen?','Das ist interessant. Was genau meinen Sie damit?','Verstehe. Und was empfehlen Sie da konkret?'],
             score:{}}
        ]
    },
    {
        id:'premium_upgrade', title:'Premium-Upgrade', icon:'💎', difficulty:'Fortgeschritten', diffColor:'#D97706',
        desc:'Stammkundin will ihr 3 Jahre altes E-Bike ersetzen. Chance für ein Upgrade!',
        opener:'Hi! Ich war vor drei Jahren schon mal bei euch und hab mein Trekking-Bike hier gekauft. Jetzt brauch ich was Neues, der Akku macht langsam schlapp.',
        criteria:['Kundenhistorie nutzen','Upselling-Technik','Mehrwert-Argumentation','Vergleichskompetenz','Kundenbindung'],
        customer:'Sabine Koch, 44 Jahre, erfahrene Fahrerin (5000km/Jahr)',
        responses:[
            {phase:'start', triggers:['willkommen','schön','wieder','erinnere','damals','freut','toll dass','zurück'],
             replies:['Ja, damals war ich super zufrieden mit der Beratung! Das Bike hat mir drei Jahre gute Dienste geleistet. Aber jetzt merke ich den Akku doch deutlich.'],
             score:{kundenhistorie:20}},
            {phase:'bedarf', triggers:['was fahren','strecke','nutzen','wofür','wie viel','kilometer','akku problem','defekt'],
             replies:['Ich fahre so 5.000 Kilometer im Jahr, hauptsächlich Touren und den Arbeitsweg. Beim alten Bike schafft der Akku nur noch 60km statt der ursprünglichen 100.'],
             score:{kundenhistorie:15}},
            {phase:'upgrade', triggers:['neu','technologie','besser','weiterentwickl','fortschritt','generation','upgrade','verbessert','modern'],
             replies:['Oh wirklich? Was hat sich denn in den drei Jahren so getan? Mein altes hat noch den Bosch Performance Line.'],
             score:{upselling:20}},
            {phase:'premium', triggers:['premium','hochwertig','top','spitzen','leicht','carbon','vollausstattung','extra','beste'],
             replies:['Das klingt schon verlockend, aber brauche ich wirklich die Premium-Variante? Was ist der konkrete Vorteil gegenüber der Mittelklasse?'],
             score:{mehrwert:20,upselling:15}},
            {phase:'vergleich', triggers:['unterschied','vergleich','versus','statt','gegenüber','besser als','dein altes','modell'],
             replies:['Ok, also mehr Reichweite und leichter. Wie viel mehr kostet die Premium-Variante gegenüber dem vergleichbaren Mittelklasse-Modell?'],
             score:{vergleichskompetenz:20}},
            {phase:'preis', triggers:['preis','kosten','euro','budget','invest','teuer','wert','lohnt','amortis'],
             replies:['Hmm, 4.500 Euro ist schon ein Sprung nach oben. Kann man das irgendwie finanzieren? Und was würde ich für mein altes Bike noch bekommen?'],
             score:{upselling:10}},
            {phase:'inzahlung', triggers:['altes bike','inzahlung','tausch','eintausch','ankauf','gebraucht','zurücknehmen','alt gegen neu'],
             replies:['Inzahlung? Das wäre natürlich super! Dann relativiert sich der Preis ja. Was wäre mein altes Bike noch wert?'],
             score:{kundenbindung:20}},
            {phase:'abschluss', triggers:['bestellen','kaufen','nehmen','probefahrt','test','probieren','entschieden','will','hätte gern'],
             replies:['Ich bin ehrlich gesagt ziemlich überzeugt. Kann ich eine Probefahrt machen, um den Unterschied selbst zu spüren?'],
             score:{upselling:15,kundenbindung:15}},
            {phase:'default', triggers:[],
             replies:['Können Sie mir das etwas genauer erklären?','Interessant. Wie schlägt sich das im Vergleich zu meinem aktuellen Bike?','Und was sagen Ihre anderen Kunden dazu?'],
             score:{}}
        ]
    },
    {
        id:'reklamation', title:'Schwieriger Kunde', icon:'😤', difficulty:'Experte', diffColor:'#DC2626',
        desc:'Unzufriedener Kunde mit Reklamation. E-Bike hat nach 4 Monaten einen Defekt.',
        opener:'So, ich bin jetzt zum zweiten Mal hier wegen dem Problem. Mein E-Bike ist vier Monate alt und der Motor spinnt schon wieder. Beim Anruf letzte Woche hat mir niemand geholfen!',
        criteria:['Empathie zeigen','Deeskalation','Lösungsorientierung','Verbindlichkeit','Kundenzufriedenheit'],
        customer:'Frank Weber, 38 Jahre, verärgert, E-Bike 4 Monate alt (3800€)',
        responses:[
            {phase:'empathie', triggers:['versteh','tut mir','entschuldig','nachvollzieh','ärger','verständ','sorry','schlimm','unangenehm','bedauer'],
             replies:['Na immerhin nimmt mich hier mal jemand ernst. Aber ich bin trotzdem sauer. Das Bike hat fast 4.000 Euro gekostet!','Ok... Danke. Aber was passiert jetzt konkret? Ich brauche das Bike für den Arbeitsweg.'],
             score:{empathie:25,deeskalation:15}},
            {phase:'problem', triggers:['was genau','problem','sympto','beschreib','erzähl','wann','wie äußert','geräusch','motor','defekt','fehler','passiert'],
             replies:['Der Motor macht ein komisches Klacken und schaltet sich manchmal einfach ab. Mitten auf der Straße! Das ist doch gefährlich!','Beim Anfahren klackt es laut und ab 20 km/h schaltet die Unterstützung manchmal einfach aus. Das passiert seit zwei Wochen.'],
             score:{loesungsorientierung:15}},
            {phase:'loesung', triggers:['werkstatt','reparatur','lösung','beheben','sofort','schnell','termin','prüfen','diagnose','tauschen','ersatz','garantie','gewährleist'],
             replies:['Garantie ist klar, aber wie lange dauert die Reparatur? Ich kann nicht wochenlang ohne Bike sein!','Ok, und wenn es länger dauert? Bekomme ich dann ein Leihrad? Ich bin auf das Bike angewiesen.'],
             score:{loesungsorientierung:20,verbindlichkeit:15}},
            {phase:'leihrad', triggers:['leihrad','leih','ersatzrad','übergangs','zwischenzei','überbrück','alternative','solange'],
             replies:['Ein Leihrad? Das wäre natürlich super. Dann kann ich damit leben. Wann könnte ich das abholen?','Ok, das ist fair. Wann steht das Leihrad bereit und wie lange wird die Reparatur dauern?'],
             score:{kundenzufriedenheit:20,verbindlichkeit:15}},
            {phase:'termin', triggers:['morgen','übermorgen','diese woche','termin','wann','zeitplan','abhol','bringen','vorbeikommen','montag','dienstag'],
             replies:['Morgen wäre gut. Kann ich das Bike morgen früh vorbeibringen und direkt das Leihrad mitnehmen?','Diese Woche noch? Ok, das geht in Ordnung. Dann komme ich morgen.'],
             score:{verbindlichkeit:20}},
            {phase:'eskalation', triggers:['anwalt','bewertung','google','facebook','melden','verbraucherschutz','schlecht','unverschämt','frechheit','skandal'],
             replies:['Hören Sie, ich will mich nicht streiten. Ich will nur, dass mein Bike funktioniert. Können wir das jetzt klären?','Ich will keine schlechte Bewertung schreiben müssen. Geben Sie mir einfach eine vernünftige Lösung.'],
             score:{}},
            {phase:'zufrieden', triggers:['danke','ok','gut','fair','einverstanden','passt','akzeptier','annehm','klingt gut'],
             replies:['Gut, danke. Dann machen wir das so. Entschuldigung, dass ich vorhin etwas laut war. Aber Sie verstehen das sicher.','Ok, das klingt fair. Schreiben Sie mir das bitte noch als Bestätigung auf? Dann sind wir uns einig.'],
             score:{kundenzufriedenheit:20,deeskalation:10}},
            {phase:'default', triggers:[],
             replies:['Ja und? Was machen wir jetzt?','Das hilft mir jetzt nicht weiter. Was ist der konkrete nächste Schritt?','Können wir bitte zum Punkt kommen?'],
             score:{}}
        ]
    },
    {
        id:'family', title:'Familienberatung', icon:'👨‍👩‍👧', difficulty:'Einsteiger', diffColor:'#059669',
        desc:'Familie möchte Fahrräder für alle. Verschiedene Wünsche und Bedürfnisse.',
        opener:'Guten Tag! Wir sind die Familie Berger. Wir wollen uns alle mit neuen Fahrrädern ausstatten - meine Frau, meine Tochter und ich. Wo fangen wir am besten an?',
        criteria:['Mehrpersonen-Beratung','Budgetberatung','Angst nehmen','Paketangebot','Familienfreundlichkeit'],
        customer:'Martin Berger (41), Frau Lisa (39, unsicher), Tochter Emma (12)',
        responses:[
            {phase:'start', triggers:['willkommen','hallo','schön','toll','familie','super','klasse','gemeinsam','zusammen'],
             replies:['Danke! Ja, wir wollen das jetzt endlich mal anpacken. Emma hat schon ganz hibbelig gefragt, ob sie sich ein Bike aussuchen darf.'],
             score:{familienfreundlichkeit:15}},
            {phase:'bedarf', triggers:['wofür','nutzen','fahren','wohin','strecke','gelände','touren','alltag','schule','arbeit'],
             replies:['Also ich will damit zur Arbeit fahren, so 8 Kilometer. Lisa will hauptsächlich Einkäufe machen und vielleicht Wochenendtouren. Und Emma fährt damit zur Schule und zu Freunden.'],
             score:{mehrpersonen:20}},
            {phase:'lisa', triggers:['frau','lisa','partnerin','unsicher','angst','sicher','komfort','bequem','einstieg','tief','aufrecht'],
             replies:['Ja, Lisa ist da etwas nervös... Sie ist seit 10 Jahren nicht mehr gefahren. Lisa sagt gerade, sie hätte gerne einen tiefen Einstieg und aufrechtes Sitzen. Und bitte nicht so schnell!'],
             score:{angst:20,mehrpersonen:10}},
            {phase:'emma', triggers:['tochter','emma','kind','mädchen','jugend','cool','farbe','schule','12','größe'],
             replies:['Emma ist 12 und ungefähr 1,52 Meter groß. Sie hätte das Rad gerne in Türkis oder Mint. Und es MUSS cool aussehen, sagt sie. Ihre Freundinnen haben auch neue Räder.'],
             score:{familienfreundlichkeit:15}},
            {phase:'budget', triggers:['budget','preis','kosten','gesamt','zusammen','paket','rabatt','sparen','angebot','alles zusammen'],
             replies:['Insgesamt hatten wir so an 4.000 bis maximal 6.000 Euro gedacht für alle drei. Geht das? Gibt es einen Familienrabatt?'],
             score:{budgetberatung:20}},
            {phase:'paket', triggers:['paket','bundle','zusammen','komplett','set','alles','drei räder','familien'],
             replies:['Ein Familienpaket? Das klingt gut! Was würde denn da alles reingehören? Helme und Schlösser auch?'],
             score:{paketangebot:25}},
            {phase:'zubehoer', triggers:['helm','schloss','licht','korb','tasche','zubehör','satteltasche','gepäck','klingel','ständer'],
             replies:['Stimmt, Helme brauchen wir auch alle drei neue. Und Lisa hätte gerne einen Korb vorne. Können Sie da was zusammenstellen?'],
             score:{paketangebot:15}},
            {phase:'probefahrt', triggers:['probefahrt','test','ausprobieren','sitzen','fahren','mal drauf','probieren'],
             replies:['Oh ja! Können wir alle drei eine Probefahrt machen? Lisa will unbedingt vorher testen, ob sie sich sicher fühlt.'],
             score:{angst:15,familienfreundlichkeit:10}},
            {phase:'abschluss', triggers:['bestellen','kaufen','nehmen','entschieden','kauf','paket','machen wir','lieferung','wann','abholen'],
             replies:['Das klingt nach einem super Plan! Können Sie uns das Angebot aufschreiben? Dann besprechen wir es kurz und entscheiden uns.'],
             score:{paketangebot:10,budgetberatung:10}},
            {phase:'default', triggers:[],
             replies:['Das müsste ich kurz mit meiner Frau besprechen... Lisa, was meinst du?','Interessant! Emma, hast du das gehört? Wie findest du das?','Können Sie uns noch mehr dazu erzählen?'],
             score:{}}
        ]
    }
];

var tState = { active:false, scenario:null, messages:[], timer:0, timerInterval:null, recognition:null, isListening:false, isSpeaking:false, usedPhases:[], scores:{} };

export function initTrainingModule() {
    var grid = document.getElementById('trainingScenarios');
    if(!grid) return;
    var h = '';
    TRAIN_SCENARIOS.forEach(function(sc) {
        h += '<div class="vit-card t-scenario-card p-5" onclick="startTraining(\''+sc.id+'\')">';
        h += '<div class="flex items-start gap-3">';
        h += '<span class="text-3xl">'+sc.icon+'</span>';
        h += '<div class="flex-1">';
        h += '<div class="flex items-center gap-2 mb-1"><span class="font-bold text-gray-800">'+sc.title+'</span>';
        h += '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full" style="background:'+sc.diffColor+'15;color:'+sc.diffColor+'">'+sc.difficulty+'</span></div>';
        h += '<p class="text-xs text-gray-500 leading-relaxed">'+sc.desc+'</p>';
        h += '<p class="text-[10px] text-gray-400 mt-1 italic">Kunde: '+sc.customer+'</p>';
        h += '</div>';
        h += '<span class="t-card-arrow text-lg" style="color:#EF7D00">→</span>';
        h += '</div></div>';
    });
    grid.innerHTML = h;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) { var w=document.getElementById('trainingSpeechWarn'); if(w) w.classList.remove('hidden'); }
}

export function getSimulatedResponse(scenario, userMsg) {
    var msg = userMsg.toLowerCase();
    var responses = scenario.responses;
    var bestMatch = null;
    var bestScore = 0;

    for(var i=0; i<responses.length; i++) {
        var r = responses[i];
        if(r.phase === 'default') continue;
        var matchCount = 0;
        for(var t=0; t<r.triggers.length; t++) {
            if(msg.includes(r.triggers[t])) matchCount++;
        }
        // Bonus for unused phases
        if(matchCount > 0 && tState.usedPhases.indexOf(r.phase) === -1) matchCount += 0.5;
        if(matchCount > bestScore) { bestScore = matchCount; bestMatch = r; }
    }

    if(!bestMatch || bestScore === 0) {
        bestMatch = responses[responses.length-1]; // default
    }

    // Track used phases and scores
    if(bestMatch.phase !== 'default') tState.usedPhases.push(bestMatch.phase);
    if(bestMatch.score) {
        for(var k in bestMatch.score) {
            tState.scores[k] = (tState.scores[k]||0) + bestMatch.score[k];
        }
    }

    // Pick a random reply from the options
    var replies = bestMatch.replies;
    return replies[Math.floor(Math.random()*replies.length)];
}

export function generateEvaluation(scenario) {
    var totalMsgs = tState.messages.filter(function(m){return m.role==='seller';}).length;
    var scores = tState.scores;
    var criteria = scenario.criteria;
    var evalResult = {gesamtScore:0, kriterien:[], staerken:[], verbesserungen:[], zusammenfassung:''};

    var total = 0;
    criteria.forEach(function(c) {
        var key = c.toLowerCase().replace(/[äöü ]/g, function(ch){return{ä:'ae',ö:'oe',ü:'ue',' ':''}[ch]||ch;}).replace(/[-\/]/g,'');
        // Check multiple possible key matches
        var score = 0;
        for(var k in scores) {
            if(key.includes(k) || k.includes(key.substring(0,6))) score += scores[k];
        }
        score = Math.min(100, Math.max(15, score + (totalMsgs > 3 ? 20 : 0)));
        // Add some variance
        score = Math.min(100, score + Math.floor(Math.random()*15));

        var kommentar = score >= 80 ? 'Sehr gut umgesetzt!' : score >= 60 ? 'Solide Leistung, noch Potenzial.' : score >= 40 ? 'Hier gibt es noch Verbesserungsmöglichkeiten.' : 'Dieser Bereich wurde kaum abgedeckt.';
        evalResult.kriterien.push({name:c, score:score, kommentar:kommentar});
        total += score;
    });

    evalResult.gesamtScore = Math.round(total / criteria.length);

    // Staerken (high scores)
    var sorted = evalResult.kriterien.slice().sort(function(a,b){return b.score-a.score;});
    sorted.slice(0,2).forEach(function(k) {
        if(k.score >= 50) evalResult.staerken.push(k.name + ' (' + k.score + '/100)');
    });
    if(evalResult.staerken.length===0) evalResult.staerken.push('Gespräch wurde geführt');
    if(totalMsgs >= 5) evalResult.staerken.push('Ausreichend Gesprächstiefe');

    // Verbesserungen (low scores)
    sorted.slice(-2).forEach(function(k) {
        if(k.score < 70) evalResult.verbesserungen.push(k.name + ' stärker fokussieren');
    });
    if(tState.usedPhases.length < 4) evalResult.verbesserungen.push('Mehr verschiedene Gesprächsaspekte abdecken');
    if(totalMsgs < 4) evalResult.verbesserungen.push('Längere Gespräche führen für bessere Ergebnisse');

    var gs = evalResult.gesamtScore;
    evalResult.zusammenfassung = gs >= 80
        ? 'Hervorragende Beratung! Du hast den Kunden gut abgeholt, auf seine Bedürfnisse eingegangen und ein überzeugendes Gespräch geführt.'
        : gs >= 60
        ? 'Solide Beratung mit guten Ansätzen. Einige Bereiche können noch vertieft werden, um den Kunden noch besser zu überzeugen.'
        : gs >= 40
        ? 'Das Gespräch hatte Potenzial, aber wichtige Beratungsaspekte wurden nicht ausreichend abgedeckt. Übe gezielt die schwächeren Bereiche.'
        : 'Hier ist noch viel Luft nach oben. Versuche, aktiver auf den Kunden einzugehen und alle Beratungsschritte abzudecken.';

    return evalResult;
}

export function startTraining(scenarioId) {
    var sc = TRAIN_SCENARIOS.find(function(s){ return s.id === scenarioId; });
    if(!sc) return;
    tState = {active:true, scenario:sc, messages:[], timer:0, timerInterval:null, recognition:null, isListening:false, isSpeaking:false, usedPhases:[], scores:{}};
    document.getElementById('trainingMenu').style.display = 'none';
    document.getElementById('trainingEval').style.display = 'none';
    document.getElementById('trainingSession').style.display = '';
    document.getElementById('tSessionIcon').textContent = sc.icon;
    document.getElementById('tSessionTitle').textContent = sc.title;
    document.getElementById('tSessionDiff').textContent = sc.difficulty;
    document.getElementById('tSessionHint').textContent = sc.desc;
    document.getElementById('tChatMessages').innerHTML = '';
    document.getElementById('tEndBtn').disabled = true;
    document.getElementById('tEndBtn').textContent = 'Beenden & Bewerten';
    clearInterval(tState.timerInterval);
    tState.timerInterval = setInterval(function() {
        tState.timer++;
        var el = document.getElementById('tSessionTimer');
        if(el) el.textContent = Math.floor(tState.timer/60)+':'+String(tState.timer%60).padStart(2,'0');
    }, 1000);
    tState.messages.push({role:'customer',text:sc.opener});
    renderTrainingMessages();
    speakTraining(sc.opener);
}

export function renderTrainingMessages() {
    var el = document.getElementById('tChatMessages');
    if(!el) return;
    var h = '';
    tState.messages.forEach(function(m) {
        if(m.role === 'customer') {
            h += '<div class="t-msg-customer"><p class="t-msg-label" style="color:var(--c-sub)">'+tState.scenario.icon+' Kunde</p><p class="t-msg-text">'+m.text+'</p></div>';
        } else {
            h += '<div class="t-msg-seller"><p class="t-msg-label" style="color:#EF7D00">🧑‍💼 Du (Verkäufer)</p><p class="t-msg-text">'+m.text+'</p></div>';
        }
    });
    el.innerHTML = h;
    el.scrollTop = el.scrollHeight;
    if(tState.messages.length >= 4) document.getElementById('tEndBtn').disabled = false;
}

export function speakTraining(text) {
    if(!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'de-DE';
    utt.rate = 1.0;
    var voices = window.speechSynthesis.getVoices();
    var deVoice = voices.find(function(v){ return v.lang.startsWith('de'); });
    if(deVoice) utt.voice = deVoice;
    tState.isSpeaking = true;
    showTrainingWave(true, false);
    utt.onend = function() { tState.isSpeaking = false; hideTrainingWave(); };
    utt.onerror = function() { tState.isSpeaking = false; hideTrainingWave(); };
    window.speechSynthesis.speak(utt);
}

export function showTrainingWave(speaking, listening) {
    var el = document.getElementById('tWaveform');
    var label = document.getElementById('tWaveLabel');
    if(!el) return;
    el.classList.remove('hidden');
    if(listening) {
        el.style.background = 'rgba(239,125,0,0.05)';
        if(label) { label.textContent = '🎤 Hört zu...'; label.style.color = '#EF7D00'; }
    } else {
        el.style.background = 'rgba(59,130,246,0.05)';
        if(label) { label.textContent = '🔊 Kunde spricht...'; label.style.color = '#3b82f6'; }
    }
    var bars = document.getElementById('tWaveBars');
    if(bars) {
        var bh = '';
        for(var i=0;i<24;i++) bh += '<div style="width:3px;border-radius:2px;background:'+(listening?'#EF7D00':'#3b82f6')+';height:4px;transition:height 0.12s" class="t-wave-bar"></div>';
        bars.innerHTML = bh;
        animateTrainingWave();
    }
}

var tWaveAnimId = null;
export function animateTrainingWave() {
    clearInterval(tWaveAnimId);
    tWaveAnimId = setInterval(function() {
        document.querySelectorAll('.t-wave-bar').forEach(function(b) {
            b.style.height = (tState.isListening || tState.isSpeaking) ? (Math.random()*24+4)+'px' : '4px';
        });
    }, 100);
}
export function hideTrainingWave() {
    var el = document.getElementById('tWaveform');
    if(el) el.classList.add('hidden');
    clearInterval(tWaveAnimId);
}

export function toggleTrainingMic() {
    if(tState.isListening) return;
    if(tState.isSpeaking) { window.speechSynthesis.cancel(); tState.isSpeaking = false; hideTrainingWave(); }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) { _showToast('Spracherkennung nicht verfügbar','warning'); return; }
    var recognition = new SR();
    recognition.lang = 'de-DE';
    recognition.interimResults = true;
    recognition.continuous = true;
    tState.recognition = recognition;
    tState.isListening = true;
    var finalT = '';
    recognition.onresult = function(e) {
        var interim = '';
        for(var i=e.resultIndex;i<e.results.length;i++) {
            if(e.results[i].isFinal) finalT += e.results[i][0].transcript + ' ';
            else interim += e.results[i][0].transcript;
        }
        var full = (finalT + interim).trim();
        var el = document.getElementById('tTranscript');
        if(el && full) { el.classList.remove('hidden'); el.textContent = '"' + full + '"'; }
    };
    recognition.onerror = function() { tState.isListening = false; resetTrainingInput(); hideTrainingWave(); };
    recognition.onend = function() { tState.isListening = false; };
    recognition.start();
    showTrainingWave(false, true);
    document.getElementById('tMicBtn').classList.add('hidden');
    document.getElementById('tSendMicBtn').classList.remove('hidden');
    document.getElementById('tInputHint').textContent = 'Sprich jetzt... Drücke ✓ zum Senden';
}

export function sendTrainingVoice() {
    if(tState.recognition) { tState.recognition.stop(); tState.recognition = null; }
    tState.isListening = false;
    hideTrainingWave();
    var el = document.getElementById('tTranscript');
    var text = el ? el.textContent.replace(/^"|"$/g,'').trim() : '';
    if(el) el.classList.add('hidden');
    resetTrainingInput();
    if(!text) return;
    processTrainingMessage(text);
}

export function sendTrainingText() {
    var inp = document.getElementById('tTextInput');
    var text = inp ? inp.value.trim() : '';
    if(!text) return;
    inp.value = '';
    var btn = document.getElementById('tSendTextBtn');
    if(btn) btn.classList.add('hidden');
    processTrainingMessage(text);
}

document.addEventListener('input', function(e) {
    if(e.target && e.target.id === 'tTextInput') {
        var btn = document.getElementById('tSendTextBtn');
        if(btn) btn.classList.toggle('hidden', !e.target.value.trim());
    }
});

export function resetTrainingInput() {
    var mic = document.getElementById('tMicBtn');
    var send = document.getElementById('tSendMicBtn');
    if(mic) mic.classList.remove('hidden');
    if(send) send.classList.add('hidden');
    var hint = document.getElementById('tInputHint');
    if(hint) hint.textContent = 'Drücke 🎤 oder tippe deine Antwort';
}

export function processTrainingMessage(text) {
    tState.messages.push({role:'seller', text:text});
    renderTrainingMessages();

    // Show thinking briefly
    var thinking = document.getElementById('tThinking');
    if(thinking) thinking.classList.remove('hidden');

    // Simulate small delay for realism
    setTimeout(function() {
        if(thinking) thinking.classList.add('hidden');
        var reply = getSimulatedResponse(tState.scenario, text);
        tState.messages.push({role:'customer', text:reply});
        renderTrainingMessages();
        speakTraining(reply);
    }, 800 + Math.random()*700);
}

export function endTrainingSession() {
    if(tState.recognition) { tState.recognition.stop(); tState.recognition = null; }
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    clearInterval(tState.timerInterval);
    tState.isListening = false;
    tState.isSpeaking = false;
    tState.active = false;
    hideTrainingWave();

    var ev = generateEvaluation(tState.scenario);
    showTrainingEvaluation(ev);
}

export function showTrainingEvaluation(ev) {
    document.getElementById('trainingSession').style.display = 'none';
    document.getElementById('trainingEval').style.display = '';
    document.getElementById('tEvalTitle').textContent = tState.scenario.title;
    document.getElementById('tEvalMeta').textContent = tState.messages.length + ' Nachrichten • ' + Math.floor(tState.timer/60)+':'+String(tState.timer%60).padStart(2,'0');
    var score = ev.gesamtScore || 0;
    var svg = document.getElementById('tScoreRing');
    var r=42, circ=2*Math.PI*r, offset=circ-(score/100)*circ;
    var col = score>=80?'#059669':score>=60?'#D97706':'#DC2626';
    svg.innerHTML = '<circle cx="50" cy="50" r="'+r+'" fill="none" stroke="#e5e7eb" stroke-width="5"/><circle cx="50" cy="50" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="5" stroke-dasharray="'+circ+'" stroke-dashoffset="'+offset+'" stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:center;transition:stroke-dashoffset 1s"/><text x="50" y="50" text-anchor="middle" dominant-baseline="central" style="font-size:24px;font-weight:800;fill:'+col+'">'+score+'</text>';
    document.getElementById('tScoreLabel').textContent = score>=80?'Hervorragend! 🌟':score>=60?'Gut gemacht! 👍':'Ausbaufähig 💪';
    document.getElementById('tScoreSummary').textContent = ev.zusammenfassung || '';
    var rings = document.getElementById('tCriteriaRings');
    var details = document.getElementById('tCriteriaDetails');
    var rh='', dh='';
    (ev.kriterien||[]).forEach(function(k) {
        var kc = k.score>=80?'#059669':k.score>=60?'#D97706':'#DC2626';
        var kr=20, kcirc=2*Math.PI*kr, koff=kcirc-(k.score/100)*kcirc;
        rh += '<div class="text-center"><svg width="48" height="48"><circle cx="24" cy="24" r="'+kr+'" fill="none" stroke="#e5e7eb" stroke-width="3"/><circle cx="24" cy="24" r="'+kr+'" fill="none" stroke="'+kc+'" stroke-width="3" stroke-dasharray="'+kcirc+'" stroke-dashoffset="'+koff+'" stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:center;transition:stroke-dashoffset 1s"/><text x="24" y="24" text-anchor="middle" dominant-baseline="central" style="font-size:11px;font-weight:700;fill:'+kc+'">'+k.score+'</text></svg><p class="text-[9px] text-gray-500 font-semibold mt-1" style="max-width:70px">'+k.name+'</p></div>';
        dh += '<div class="p-3 rounded-lg" style="background:var(--c-bg2)"><div class="flex justify-between mb-1"><span class="text-xs font-semibold text-gray-800">'+k.name+'</span><span class="text-xs font-bold" style="color:'+kc+'">'+k.score+'/100</span></div><p class="text-[11px] text-gray-500">'+k.kommentar+'</p></div>';
    });
    if(rings) rings.innerHTML = rh;
    if(details) details.innerHTML = dh;
    var sh='', ih='';
    (ev.staerken||[]).forEach(function(s){ sh += '<p class="text-xs text-gray-600">• '+s+'</p>'; });
    (ev.verbesserungen||[]).forEach(function(v){ ih += '<p class="text-xs text-gray-600">• '+v+'</p>'; });
    document.getElementById('tStrengths').innerHTML = sh || '<p class="text-xs text-gray-400">—</p>';
    document.getElementById('tImprovements').innerHTML = ih || '<p class="text-xs text-gray-400">—</p>';
}

export function restartTrainingScenario() { if(tState.scenario) startTraining(tState.scenario.id); }
export function backToTrainingMenu() {
    document.getElementById('trainingSession').style.display = 'none';
    document.getElementById('trainingEval').style.display = 'none';
    document.getElementById('trainingMenu').style.display = '';
    document.getElementById('tEndBtn').textContent = 'Beenden & Bewerten';
    initTrainingModule();
}

// === REACT PIPELINE MOUNT FUNCTION ===
var pipelineMounted = false;
export function mountReactPipeline() {
    var root = document.getElementById('react-pipeline-root');
    if(!root) return;
    if(pipelineMounted) return; // Already mounted
    // Wait for Babel to compile
    if(typeof window.__PIPELINE_APP === 'function') {
        ReactDOM.createRoot(root).render(React.createElement(window.__PIPELINE_APP));
        pipelineMounted = true;
    } else {
        // Retry after Babel has compiled
        setTimeout(mountReactPipeline, 200);
    }
}

// Strangler Fig
const _exports = {loadHqPrio,saveHqPrio,resetHqPrio,getAllModulesFlat,getAufwandBadge,getTypBadge,getStatusBadge,filterModulStatus,onPrioDragStart,onPrioDragOver,onPrioDragLeave,onPrioDrop,moveHqPrio,renderModulStatus,renderDevStatus,showDevTab,renderReleaseUpdates,renderDevNutzung,toggleMobileSidebar,toggleSidebarCollapse,closeMobileSidebar,switchViewMode,initTrainingModule,getSimulatedResponse,generateEvaluation,startTraining,renderTrainingMessages,speakTraining,showTrainingWave,animateTrainingWave,hideTrainingWave,toggleTrainingMic,sendTrainingVoice,sendTrainingText,resetTrainingInput,processTrainingMessage,endTrainingSession,showTrainingEvaluation,restartTrainingScenario,backToTrainingMenu,mountReactPipeline};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[misc-views.js] Module loaded – ' + Object.keys(_exports).length + ' exports registered');
