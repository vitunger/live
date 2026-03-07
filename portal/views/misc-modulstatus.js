/**
 * views/misc-modulstatus.js - Modulübersicht, DevStatus, HQ-Prio, Drag&Drop, Release-Updates
 * Sub-Modul von misc-views.js (Orchestrator)
 * @module views/misc-modulstatus
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }

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
        {name:'HQ Buchungssystem', view:'hqBuchungenView', status:'beta', typ:'hq', version:'1.0.0', details:'Termin-Buchungsverwaltung für alle Standorte: Buchungsübersicht, Kalenderansicht, Ressourcenverwaltung', kiPrio:23, aufwand:'M', kiTodo:'Buchungsstatistiken, Auslastungsberichte, Standort-übergreifende Kalenderansicht.'},
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
    // Hide HQ-only buttons for non-HQ users
    var _isHQ = (window.currentRoles||[]).indexOf('hq') !== -1;
    document.querySelectorAll('.ms-filter').forEach(function(b) {
        var fVal = b.getAttribute('data-f');
        if(fVal === 'hq' || fVal === 'kiPrio' || fVal === 'hqPrio') {
            b.style.display = _isHQ ? '' : 'none';
        }
    });
    var h = '';
    var allModules = getAllModulesFlat();
    var _countModules = _isHQ ? allModules : allModules.filter(function(m){ return m.typ !== 'hq'; });
    var counts = {live:0, teilweise:0, demo:0, stub:0};
    _countModules.forEach(function(m) { counts[m.status] = (counts[m.status]||0)+1; });
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
    var _isHQu = (window.currentRoles||[]).indexOf('hq') !== -1;
    var _visibleModules = _isHQu ? allModules : allModules.filter(function(m){ return m.typ !== 'hq'; });
    var modules = currentModulFilter === 'alle' ? _visibleModules : (currentModulFilter === 'hq' && !_isHQu ? [] : (MODUL_DATEN[currentModulFilter] || _visibleModules.filter(function(m){ return m.typ === currentModulFilter; })));
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
    if(nutzTab) nutzTab.style.display = ((window.currentRoles||[]).indexOf('hq') !== -1) ? '' : 'none';
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
    if (tab === 'nutzung' && typeof window.renderDevNutzung === 'function') window.renderDevNutzung();
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

// Strangler Fig
const _exports = {loadHqPrio,saveHqPrio,resetHqPrio,getAllModulesFlat,getAufwandBadge,getTypBadge,getStatusBadge,filterModulStatus,onPrioDragStart,onPrioDragOver,onPrioDragLeave,onPrioDrop,moveHqPrio,renderModulStatus,renderDevStatus,showDevTab,renderReleaseUpdates};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });

// === Window Exports (onclick handlers) ===
window.filterModulStatus = filterModulStatus;
window.showDevTab = showDevTab;

