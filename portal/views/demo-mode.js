// vit:bikes Cockpit - Demo Mode System
// GF/Standort-Perspektive mit realistischen Fake-Daten
// Standort: vit:bikes Grafrath | Inhaber: Sandra Engelmann

// Global: prevent ReferenceError before demo mode is activated
if (typeof DEMO_ACTIVE === 'undefined') var DEMO_ACTIVE = false;

// Safe Helpers
function _sb()       { return window.sb; }
function _sbUser()   { return window.sbUser; }
function _sbProfile(){ return window.sbProfile; }
function _escH(s)    { return window.escH ? window.escH(s) : String(s); }
function _showToast(m,t){ if(window.showToast) window.showToast(m,t||'info'); }

// ─── Demo Fake Data (Standort: Grafrath, Februar 2026) ─────────────────────

var DEMO_STANDORT = {
    id: 'dd000000-0000-0000-0000-000000000099',
    name: 'vit:bikes Grafrath',
    slug: 'grafrath',
    city: 'Grafrath',
    region: 'Süd-Bayern'
};

var DEMO_LEADS = [
    { id:'dl-1', name:'Thomas Bauer', modell:'Trek Domane SL 6', wert:3499, status:'beratung', created_at:'2026-02-24', telefon:'0151-234567', notiz:'Interessiert an Finanzierung' },
    { id:'dl-2', name:'Katrin Sommer', modell:'Cube Stereo Hybrid 140', wert:5299, status:'angebot', created_at:'2026-02-22', telefon:'0162-987654', notiz:'Angebot per Mail verschickt' },
    { id:'dl-3', name:'Michael Hofer', modell:'Riese & Müller Multicharger', wert:7890, status:'angebot', created_at:'2026-02-20', telefon:'0170-112233', notiz:'Test-Ride am Sa. vereinbart' },
    { id:'dl-4', name:'Anni Kramer', modell:'Specialized Turbo Como 4.0', wert:4199, status:'kaufbereit', created_at:'2026-02-18', telefon:'0176-445566', notiz:'Kauf wahrscheinlich diese Woche' },
    { id:'dl-5', name:'Peter Stein', modell:'Cannondale Topstone Carbon', wert:3999, status:'gewonnen', created_at:'2026-02-15', telefon:'0179-778899', notiz:'Abgeholt am 20.02.' },
    { id:'dl-6', name:'Lisa Gruber', modell:'Giant Trance X E+ Pro 29', wert:6299, status:'gewonnen', created_at:'2026-02-10', telefon:'0155-334455', notiz:'Zubehör-Paket dazu' },
    { id:'dl-7', name:'Marco Felber', modell:'Trek Marlin 7', wert:1299, status:'verloren', created_at:'2026-02-08', telefon:'0160-223344', notiz:'Online günstiger gefunden' },
    { id:'dl-8', name:'Sabine König', modell:'Gazelle Ultimate C380 HMB', wert:3599, status:'beratung', created_at:'2026-02-26', telefon:'0152-667788', notiz:'Erstgespräch heute' }
];

var DEMO_TODOS = [
    { id:'dt-1', title:'BWA Februar 2026 hochladen', status:'offen', prio:'hoch', due_date:'2026-03-08', kategorie:'finanzen' },
    { id:'dt-2', title:'Vororder-Bestätigung an HQ schicken', status:'offen', prio:'hoch', due_date:'2026-03-05', kategorie:'einkauf' },
    { id:'dt-3', title:'Quartals-Review Termin buchen', status:'offen', prio:'mittel', due_date:'2026-03-15', kategorie:'planung' },
    { id:'dt-4', title:'Social Media Post: Frühjahrs-Aktion', status:'in_bearbeitung', prio:'mittel', due_date:'2026-03-03', kategorie:'marketing' },
    { id:'dt-5', title:'Werkstatt-Kapazität April planen', status:'offen', prio:'mittel', due_date:'2026-03-20', kategorie:'werkstatt' },
    { id:'dt-6', title:'Mitarbeiter-Gespräch Dirk G.', status:'erledigt', prio:'hoch', due_date:'2026-02-28', kategorie:'personal' },
    { id:'dt-7', title:'Schaufenster-Deko Frühjahr', status:'erledigt', prio:'niedrig', due_date:'2026-02-25', kategorie:'marketing' },
    { id:'dt-8', title:'Reifenservice-Kampagne vorbereiten', status:'in_bearbeitung', prio:'mittel', due_date:'2026-03-10', kategorie:'marketing' }
];

var DEMO_TERMINE = [
    { id:'kt-1', titel:'Probe-Ride: Michael Hofer', datum:'2026-03-01', uhrzeit:'10:00', typ:'etermin', dauer:60 },
    { id:'kt-2', titel:'Beratung E-Bike Pendler', datum:'2026-03-01', uhrzeit:'14:30', typ:'etermin', dauer:45 },
    { id:'kt-3', titel:'Werkstatt: Inspektion Kramer', datum:'2026-03-03', uhrzeit:'09:00', typ:'werkstatt', dauer:90 },
    { id:'kt-4', titel:'Jahres-Gespräch mit Lieferant', datum:'2026-03-04', uhrzeit:'11:00', typ:'intern', dauer:60 },
    { id:'kt-5', titel:'Team-Meeting März', datum:'2026-03-05', uhrzeit:'08:30', typ:'intern', dauer:45 },
    { id:'kt-6', titel:'Beratung Familienräder', datum:'2026-03-06', uhrzeit:'16:00', typ:'etermin', dauer:60 },
    { id:'kt-7', titel:'Frühjahrs-Aktion Aufbau', datum:'2026-03-07', uhrzeit:'08:00', typ:'intern', dauer:120 },
    { id:'kt-8', titel:'Probe-Ride: Familie Sommer', datum:'2026-03-08', uhrzeit:'10:30', typ:'etermin', dauer:90 }
];

var DEMO_TICKETS = [
    { id:'st-1', betreff:'Cockpit Login-Problem bei Mitarbeiterin', status:'offen', prio:'hoch', erstellt:'2026-02-27', letzte_antwort:'Wird geprüft – HQ meldet sich morgen' },
    { id:'st-2', betreff:'Frage zu BWA-Benchmark: Rohertrag', status:'in_bearbeitung', prio:'mittel', erstellt:'2026-02-20', letzte_antwort:'Benchmark gilt für Q1-Durchschnitt Süd' },
    { id:'st-3', betreff:'Vororder-Bestätigung kommt nicht an', status:'geloest', prio:'hoch', erstellt:'2026-02-10', letzte_antwort:'E-Mail-Adresse im System korrigiert' }
];

var DEMO_BWA = {
    jan: { monat:1, jahr:2026, umsatzerloese:168420, wareneinsatz:-101052, rohertrag:67368, personalkosten:-21200, raumkosten:-4800, werbekosten:-2800, abschreibungen:-1900, sonstige_kosten:-3400, gesamtkosten:-34100, betriebsergebnis:33268, zinsaufwand:-680, ergebnis_vor_steuern:32588 },
    feb: { monat:2, jahr:2026, umsatzerloese:142500, wareneinsatz:-85500, rohertrag:57000, personalkosten:-21200, raumkosten:-4800, werbekosten:-3200, abschreibungen:-1900, sonstige_kosten:-2850, gesamtkosten:-33950, betriebsergebnis:23050, zinsaufwand:-680, ergebnis_vor_steuern:22370 },
    plan: { umsatzerloese:200000, rohertrag:76000, betriebsergebnis:32000, ergebnis_vor_steuern:30000 }
};

var DEMO_MITARBEITER = [
    { name:'Sandra Engelmann', rolle:'Geschäftsführerin', status:'aktiv', seit:'2018' },
    { name:'Dirk Gromann', rolle:'Verkauf & Beratung', status:'aktiv', seit:'2020' },
    { name:'Lisa Maier', rolle:'Werkstatt', status:'aktiv', seit:'2021' },
    { name:'Jonas Weber', rolle:'Werkstatt', status:'aktiv', seit:'2023' }
];

// ─── Main Entry: Demo-Login ────────────────────────────────────────────────

async function switchDemoAccount(level, stage) {
    var ls = document.getElementById('loginScreen');
    var ma = document.getElementById('mainApp');
    if(ls) ls.style.display = 'none';
    if(ma) ma.style.display = 'block';

    DEMO_ACTIVE = true;

    // ── Expose DEMO_DATA globally for module-level checks ──
    window.DEMO_DATA = {
        todos: [
            { id:'dt-1', title:'BWA Februar 2026 hochladen', erledigt:false, prio_sort:1, prio:'hoch', faellig_am:'2026-03-08', kategorie:'finanzen', parent_id:null, section_id:'demo-s1', notiz:'', standort_id:'dd000000-0000-0000-0000-000000000099' },
            { id:'dt-2', title:'Vororder-Bestätigung an HQ schicken', erledigt:false, prio_sort:1, prio:'hoch', faellig_am:'2026-03-05', kategorie:'einkauf', parent_id:null, section_id:'demo-s1', notiz:'', standort_id:'dd000000-0000-0000-0000-000000000099' },
            { id:'dt-3', title:'Quartals-Review Termin buchen', erledigt:false, prio_sort:2, prio:'mittel', faellig_am:'2026-03-15', kategorie:'planung', parent_id:null, section_id:'demo-s1', notiz:'', standort_id:'dd000000-0000-0000-0000-000000000099' },
            { id:'dt-4', title:'Social Media Post: Frühjahrs-Aktion', erledigt:false, prio_sort:2, prio:'mittel', faellig_am:'2026-03-03', kategorie:'marketing', parent_id:null, section_id:'demo-s2', notiz:'', standort_id:'dd000000-0000-0000-0000-000000000099' },
            { id:'dt-5', title:'Werkstatt-Kapazität April planen', erledigt:false, prio_sort:2, prio:'mittel', faellig_am:'2026-03-20', kategorie:'werkstatt', parent_id:null, section_id:'demo-s2', notiz:'', standort_id:'dd000000-0000-0000-0000-000000000099' },
            { id:'dt-6', title:'Reifenservice-Kampagne vorbereiten', erledigt:false, prio_sort:3, prio:'mittel', faellig_am:'2026-03-10', kategorie:'marketing', parent_id:null, section_id:'demo-s2', notiz:'', standort_id:'dd000000-0000-0000-0000-000000000099' },
            { id:'dt-7', title:'Mitarbeiter-Gespräch Dirk G.', erledigt:true, prio_sort:1, prio:'hoch', faellig_am:'2026-02-28', kategorie:'personal', parent_id:null, section_id:'demo-s1', notiz:'', standort_id:'dd000000-0000-0000-0000-000000000099' },
            { id:'dt-8', title:'Schaufenster-Deko Frühjahr', erledigt:true, prio_sort:3, prio:'niedrig', faellig_am:'2026-02-25', kategorie:'marketing', parent_id:null, section_id:'demo-s1', notiz:'', standort_id:'dd000000-0000-0000-0000-000000000099' }
        ],
        termine: [
            { id:'kt-1', titel:'Probe-Ride: Michael Hofer', datum:'2026-03-01', uhrzeit:'10:00', typ:'etermin', dauer:60 },
            { id:'kt-2', titel:'Beratung E-Bike Pendler', datum:'2026-03-01', uhrzeit:'14:30', typ:'etermin', dauer:45 },
            { id:'kt-3', titel:'Werkstatt: Inspektion Kramer', datum:'2026-03-03', uhrzeit:'09:00', typ:'werkstatt', dauer:90 },
            { id:'kt-4', titel:'Jahres-Gespräch mit Lieferant', datum:'2026-03-04', uhrzeit:'11:00', typ:'intern', dauer:60 },
            { id:'kt-5', titel:'Team-Meeting März', datum:'2026-03-05', uhrzeit:'08:30', typ:'intern', dauer:45 },
            { id:'kt-6', titel:'Beratung Familienräder', datum:'2026-03-06', uhrzeit:'16:00', typ:'etermin', dauer:60 },
            { id:'kt-7', titel:'Frühjahrs-Aktion Aufbau', datum:'2026-03-07', uhrzeit:'08:00', typ:'intern', dauer:120 },
            { id:'kt-8', titel:'Probe-Ride: Familie Sommer', datum:'2026-03-08', uhrzeit:'10:30', typ:'etermin', dauer:90 }
        ],
        tickets: [
            { id:'st-1', betreff:'Cockpit Login-Problem bei Mitarbeiterin', status:'offen', prio:'hoch', erstellt:'27.02.2026', letzte_antwort:'Wird geprüft – HQ meldet sich morgen' },
            { id:'st-2', betreff:'Frage zu BWA-Benchmark: Rohertrag', status:'in_bearbeitung', prio:'mittel', erstellt:'20.02.2026', letzte_antwort:'Benchmark gilt für Q1-Durchschnitt Süd' },
            { id:'st-3', betreff:'Vororder-Bestätigung kommt nicht an', status:'geloest', prio:'hoch', erstellt:'10.02.2026', letzte_antwort:'E-Mail-Adresse im System korrigiert ✓' }
        ],
        bwa: [
            { monat:2, jahr:2026, umsatz_fmt:'142.500 €', ergebnis_fmt:'+22.370 €',
              umsatzerloese:142500, wareneinsatz:-85500, rohertrag:57000,
              personalkosten:-21200, raumkosten:-4800, werbekosten:-3200,
              abschreibungen:-1900, sonstige_kosten:-2850, gesamtkosten:-33950,
              betriebsergebnis:23050, zinsaufwand:-680, ergebnis_vor_steuern:22370,
              plan_umsatz:200000, plan_rohertrag:76000, plan_ergebnis:30000 },
            { monat:1, jahr:2026, umsatz_fmt:'168.420 €', ergebnis_fmt:'+32.588 €',
              umsatzerloese:168420, wareneinsatz:-101052, rohertrag:67368,
              personalkosten:-21200, raumkosten:-4800, werbekosten:-2800,
              abschreibungen:-1900, sonstige_kosten:-3400, gesamtkosten:-34100,
              betriebsergebnis:33268, zinsaufwand:-680, ergebnis_vor_steuern:32588,
              plan_umsatz:200000, plan_rohertrag:76000, plan_ergebnis:30000 }
        ],
        mitarbeiter: [
            { id:'dm-1', name:'Sandra Engelmann' },
            { id:'dm-2', name:'Dirk Gromann' },
            { id:'dm-3', name:'Lisa Maier' },
            { id:'dm-4', name:'Jonas Weber' }
        ]
    };
    SESSION.account_level = level;
    SESSION.stage = stage || 'partner';
    SESSION.stage_status = 'active';
    SESSION.account_id = 'demo-standort';
    SESSION.account_name = 'vit:bikes Grafrath (Demo)';

    window.sbUser = { id: 'dd000000-0000-0000-0000-000000000002', email: 'demo@vitbikes-grafrath.de' };
    window.sbProfile = {
        id: 'dd000000-0000-0000-0000-000000000002',
        name: 'Sandra Engelmann',
        vorname: 'Sandra',
        nachname: 'Engelmann',
        email: 'demo@vitbikes-grafrath.de',
        is_hq: false,
        status: 'demo',
        standort_id: DEMO_STANDORT.id,
        standort_name: DEMO_STANDORT.name
    };
    window.sbStandort = { id: DEMO_STANDORT.id, name: DEMO_STANDORT.name, slug: DEMO_STANDORT.slug, is_premium: true };

    currentRole = 'inhaber';
    currentRoles = ['inhaber'];
    currentLocation = 'grafrath';
    isPremium = true;

    injectDemoBanner(level, stage);
    installDemoOverrides();

    updateUIForRole();
    try { await loadModulStatus(); } catch(e) { try { applyModulStatus(); } catch(e2) {} }

    // Update nav user info
    var nameEl = document.querySelector('[data-user-name]');
    if(nameEl) nameEl.textContent = 'Sandra Engelmann';
    var avatarEl = document.querySelector('.topnav-desktop img.rounded-full');
    if(avatarEl) avatarEl.src = 'https://ui-avatars.com/api/?name=Sandra+Engelmann&background=EF7D00&color=fff';

    showView('home');

    // Fill home widgets after modules loaded – home.js registers window.fillDemoWidgets
    setTimeout(function() {
        if (window.fillDemoWidgets) window.fillDemoWidgets(level, stage);
    }, 400);
}

// ─── Demo Banner ──────────────────────────────────────────────────────────

function injectDemoBanner(level, stage) {
    var existing = document.getElementById('demoBannerTop');
    if(existing) existing.remove();
    var banner = document.createElement('div');
    banner.id = 'demoBannerTop';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,#EF7D00,#F59E0B);color:white;text-align:center;padding:6px 16px;font-size:12px;font-weight:700;letter-spacing:0.5px;display:flex;align-items:center;justify-content:center;gap:12px;';
    banner.innerHTML = '🎭 DEMO-MODUS: Standort · Partner'
        + ' <span style="font-weight:400;opacity:0.85">– vit:bikes Grafrath · Alle Daten sind fiktiv</span>'
        + ' <button onclick="exitDemoMode()" style="margin-left:12px;background:rgba(255,255,255,0.25);border:none;color:white;padding:2px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:600">✕ Demo beenden</button>';
    document.body.prepend(banner);
    var app = document.getElementById('mainApp');
    if(app) app.style.marginTop = '34px';
}

function exitDemoMode() {
    DEMO_ACTIVE = false;
    uninstallDemoOverrides();
    var banner = document.getElementById('demoBannerTop');
    if(banner) banner.remove();
    var app = document.getElementById('mainApp');
    if(app) { app.style.marginTop = '0'; app.style.display = 'none'; }
    var ls = document.getElementById('loginScreen');
    if(ls) ls.style.display = 'flex';
}

// ─── Module Overrides ─────────────────────────────────────────────────────
// Intercept DB-loading functions and replace with fake data when DEMO_ACTIVE

var _origOverrides = {};

function installDemoOverrides() {
    // ── Todos ──
    _origOverrides.loadTodos = window.loadTodos;
    window.loadTodos = function() {
        if(!DEMO_ACTIVE) { return _origOverrides.loadTodos && _origOverrides.loadTodos(); }
        return demoFillTodos();
    };

    // ── Kalender ──
    _origOverrides.renderKalender = window.renderKalender;
    window.renderKalender = function() {
        if(!DEMO_ACTIVE) { return _origOverrides.renderKalender && _origOverrides.renderKalender(); }
        return demoFillKalender();
    };

    // ── Support ──
    _origOverrides.renderTickets = window.renderTickets;
    window.renderTickets = function(filter) {
        if(!DEMO_ACTIVE) { return _origOverrides.renderTickets && _origOverrides.renderTickets(filter); }
        return demoFillSupport();
    };

    // ── Controlling / BWA ──
    _origOverrides.renderBwaList = window.renderBwaList;
    window.renderBwaList = function() {
        if(!DEMO_ACTIVE) { return _origOverrides.renderBwaList && _origOverrides.renderBwaList(); }
        return demoFillControlling();
    };

    // ── Verkauf / Pipeline ──
    _origOverrides.loadWeekFromDb = window.loadWeekFromDb;
    window.loadWeekFromDb = function() {
        if(!DEMO_ACTIVE) { return _origOverrides.loadWeekFromDb && _origOverrides.loadWeekFromDb(); }
        return demoFillVerkaufWeek();
    };

    // ── Allgemein ──
    _origOverrides.loadAllgemeinData = window.loadAllgemeinData;
    window.loadAllgemeinData = function() {
        if(!DEMO_ACTIVE) { return _origOverrides.loadAllgemeinData && _origOverrides.loadAllgemeinData(); }
        return demoFillAllgemein();
    };

    // ── Billing ──
    _origOverrides.loadStandortInvoices = window.loadStandortInvoices;
    _origOverrides.loadStandortPayments = window.loadStandortPayments;
    _origOverrides.loadStandortStrategy = window.loadStandortStrategy;
    _origOverrides.loadStandortCosts = window.loadStandortCosts;
    window.loadStandortInvoices = function() { if(DEMO_ACTIVE) { fillDemoBilling(); return; } if(_origOverrides.loadStandortInvoices) return _origOverrides.loadStandortInvoices(); };
    window.loadStandortPayments = function() { if(DEMO_ACTIVE) { fillDemoBilling(); return; } if(_origOverrides.loadStandortPayments) return _origOverrides.loadStandortPayments(); };
    window.loadStandortStrategy = function() { if(DEMO_ACTIVE) { fillDemoBilling(); return; } if(_origOverrides.loadStandortStrategy) return _origOverrides.loadStandortStrategy(); };
    window.loadStandortCosts = function() { if(DEMO_ACTIVE) { fillDemoBilling(); return; } if(_origOverrides.loadStandortCosts) return _origOverrides.loadStandortCosts(); };
}

function uninstallDemoOverrides() {
    for(var k in _origOverrides) {
        if(_origOverrides[k]) window[k] = _origOverrides[k];
    }
    _origOverrides = {};
}


// ─── HOME DASHBOARD WIDGETS: filled by home.js fillDemoWidgets ───────────

// ─── Module Fill Functions ─────────────────────────────────────────────────

function demoFillTodos() {
    var el = document.getElementById('todosView');
    if(!el) return;
    var offen = DEMO_TODOS.filter(function(t){ return t.status !== 'erledigt'; });
    var erledigt = DEMO_TODOS.filter(function(t){ return t.status === 'erledigt'; });

    var h = '<div class="p-4 max-w-2xl mx-auto">'
        + '<div class="flex items-center justify-between mb-4">'
        + '<h2 class="text-lg font-bold text-gray-800">Aufgaben</h2>'
        + '<span class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">' + offen.length + ' offen</span></div>'
        + '<div class="space-y-2 mb-6">';

    offen.forEach(function(t) {
        var prioColor = t.prio === 'hoch' ? 'red' : t.prio === 'mittel' ? 'amber' : 'gray';
        h += '<div class="vit-card p-3 flex items-center gap-3">'
            + '<div class="w-5 h-5 rounded border-2 border-gray-300 shrink-0"></div>'
            + '<div class="flex-1 min-w-0">'
            + '<div class="text-sm font-medium text-gray-800">' + t.title + '</div>'
            + '<div class="text-xs text-gray-400">Fällig: ' + fmtDate(t.due_date) + '</div></div>'
            + '<span class="text-xs px-2 py-0.5 rounded-full bg-' + prioColor + '-100 text-' + prioColor + '-700 font-semibold shrink-0">' + t.prio + '</span>'
            + '</div>';
    });

    h += '</div><div class="text-xs text-gray-400 uppercase font-semibold mb-2">Erledigt</div><div class="space-y-2">';
    erledigt.forEach(function(t) {
        h += '<div class="vit-card p-3 flex items-center gap-3 opacity-60">'
            + '<div class="w-5 h-5 rounded border-2 border-green-400 bg-green-400 shrink-0 flex items-center justify-center">'
            + '<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg></div>'
            + '<div class="text-sm text-gray-500 line-through">' + t.title + '</div>'
            + '</div>';
    });

    h += '</div></div>';

    // Try to find the list container inside the view
    var list = el.querySelector('#todosList') || el.querySelector('.todos-list') || el.querySelector('[id*="todo"]');
    if(list) { list.innerHTML = h; } else { el.innerHTML = h; }
}

function demoFillKalender() {
    // Inject upcoming termine into calendar display
    var el = document.getElementById('kalenderView');
    if(!el) return;
    var listEl = el.querySelector('#kalTerminListe') || el.querySelector('.kal-list');
    if(!listEl) return;
    var h = '<div class="p-4"><h3 class="font-semibold text-gray-700 mb-3">Kommende Termine</h3><div class="space-y-2">';
    DEMO_TERMINE.forEach(function(t) {
        var typColor = t.typ === 'etermin' ? 'green' : t.typ === 'werkstatt' ? 'blue' : 'gray';
        h += '<div class="vit-card p-3 flex items-center gap-3">'
            + '<div class="text-center w-12 shrink-0"><div class="text-xs text-gray-400">' + fmtDayMonth(t.datum) + '</div>'
            + '<div class="text-sm font-bold text-gray-800">' + t.uhrzeit + '</div></div>'
            + '<div class="flex-1 min-w-0"><div class="font-medium text-sm">' + t.titel + '</div>'
            + '<span class="text-xs px-2 py-0.5 rounded-full bg-' + typColor + '-100 text-' + typColor + '-700">' + t.typ + '</span></div>'
            + '<div class="text-xs text-gray-400 shrink-0">' + t.dauer + ' Min</div></div>';
    });
    h += '</div></div>';
    listEl.innerHTML = h;
}

function demoFillSupport() {
    var el = document.getElementById('ticketList') || document.getElementById('supportView');
    if(!el) return;
    var h = '<div class="space-y-3">';
    DEMO_TICKETS.forEach(function(t) {
        var statusColor = t.status === 'offen' ? 'red' : t.status === 'in_bearbeitung' ? 'amber' : 'green';
        var statusLabel = t.status === 'offen' ? 'Offen' : t.status === 'in_bearbeitung' ? 'In Bearbeitung' : 'Gelöst';
        h += '<div class="vit-card p-4">'
            + '<div class="flex items-start justify-between mb-2">'
            + '<span class="font-semibold text-gray-800 text-sm">' + t.betreff + '</span>'
            + '<span class="text-xs px-2 py-0.5 rounded-full bg-' + statusColor + '-100 text-' + statusColor + '-700 font-semibold ml-2 shrink-0">' + statusLabel + '</span></div>'
            + '<div class="text-xs text-gray-400 mb-2">' + fmtDate(t.erstellt) + ' · Priorität: ' + t.prio + '</div>'
            + '<div class="text-sm text-gray-600 bg-gray-50 rounded p-2">' + t.letzte_antwort + '</div></div>';
    });
    h += '</div>';
    el.innerHTML = h;
}

function demoFillControlling() {
    var bwaList = document.getElementById('bwaFileList');
    if(bwaList) {
        bwaList.innerHTML = ''
            + demoBwaListItem('Februar 2026', DEMO_BWA.feb.umsatzerloese, true)
            + demoBwaListItem('Januar 2026', DEMO_BWA.jan.umsatzerloese, false);
    }
    // Auto-show Feb detail
    setTimeout(function() { demoShowBwaDetail('feb'); }, 200);
}

function demoShowBwaDetail(idx) {
    var body = document.getElementById('bwaDetailBody');
    if(!body) return;
    var bwaArr = window.DEMO_DATA ? window.DEMO_DATA.bwa : null;
    if(!bwaArr || !bwaArr[idx]) return;
    var bwa = bwaArr[idx];
    var plan = { umsatzerloese: bwa.plan_umsatz, rohertrag: bwa.plan_rohertrag, betriebsergebnis: 0, ergebnis_vor_steuern: bwa.plan_ergebnis };
    var rows = [
        { label:'Umsatzerlöse', ist:bwa.umsatzerloese, plan:plan.umsatzerloese, bold:true, big:true, highlight:'bg-orange-50' },
        { label:'Wareneinsatz', ist:bwa.wareneinsatz },
        { label:'Rohertrag', ist:bwa.rohertrag, plan:plan.rohertrag, bold:true },
        { sep:true },
        { label:'Personalkosten', ist:bwa.personalkosten },
        { label:'Raumkosten', ist:bwa.raumkosten },
        { label:'Werbekosten', ist:bwa.werbekosten },
        { label:'Abschreibungen', ist:bwa.abschreibungen },
        { label:'Sonstige Kosten', ist:bwa.sonstige_kosten },
        { label:'Gesamtkosten', ist:bwa.gesamtkosten, bold:true },
        { sep:true },
        { label:'Betriebsergebnis', ist:bwa.betriebsergebnis, plan:plan.betriebsergebnis, bold:true, highlight:'bg-blue-50' },
        { label:'Zinsaufwand', ist:bwa.zinsaufwand },
        { label:'Ergebnis vor Steuern', ist:bwa.ergebnis_vor_steuern, plan:plan.ergebnis_vor_steuern, bold:true, big:true, highlight:'bg-green-50' }
    ];
    var h = '';
    rows.forEach(function(r) {
        if(r.sep) { h += '<tr><td colspan="5" class="py-1 border-t border-gray-200"></td></tr>'; return; }
        var abw = (r.plan && r.ist) ? r.ist - r.plan : null;
        var abwCls = abw === null ? '' : abw > 0 ? 'text-green-600' : 'text-red-600';
        var cls = (r.highlight || '') + (r.bold ? '' : '');
        h += '<tr class="' + cls + '">';
        h += '<td class="py-2 px-3 ' + (r.bold ? 'font-bold' : '') + ' ' + (r.big ? 'text-base' : 'text-sm') + '">' + r.label + '</td>';
        h += '<td class="text-right py-2 px-3 font-mono ' + (r.bold ? 'font-bold' : '') + ' ' + eurCls(r.ist) + '">' + eur(r.ist) + '</td>';
        h += '<td class="text-right py-2 px-3 font-mono text-gray-400">' + (r.plan ? eur(r.plan) : '—') + '</td>';
        h += '<td class="text-right py-2 px-3 font-mono ' + abwCls + '">' + (abw !== null ? (abw > 0 ? '+' : '') + eur(abw) : '—') + '</td>';
        h += '<td class="text-right py-2 px-3 text-gray-300">—</td>';
        h += '</tr>';
    });
    body.innerHTML = h;
}

function demoFillVerkaufWeek() {
    var el = document.getElementById('verkaufWeekView') || document.getElementById('wochenzielContent');
    if(!el) return;
    el.innerHTML = '<div class="p-4">'
        + '<div class="grid grid-cols-2 gap-4 mb-6">'
        + demoStatCard('Beratungen KW9', '11', 'Gespräche', 'text-blue-600')
        + demoStatCard('Verkauft KW9', '4', 'Fahrräder', 'text-green-600')
        + '</div>'
        + '<div class="vit-card p-4">'
        + '<h3 class="font-semibold text-gray-700 mb-3">Aktuelle Woche – Übersicht</h3>'
        + '<div class="space-y-2">'
        + demoVerkaufRow('Mo 02.03', 3, 2)
        + demoVerkaufRow('Di 03.03', 2, 1)
        + demoVerkaufRow('Mi 04.03', 4, 0)
        + demoVerkaufRow('Do 05.03', 1, 1)
        + demoVerkaufRow('Fr 06.03', 1, 0)
        + '</div></div></div>';
}

function demoFillAllgemein() {
    var el = document.getElementById('allgemeinView');
    if(!el) return;
    var jzContent = el.querySelector('#homeJahreszieleContent') || el.querySelector('[id*="jahresziel"]');
    if(jzContent) demoFillJahresziele(jzContent);
}

function demoFillJahresziele(el) {
    if(!el) return;
    var ziele = [
        { titel:'Jahresumsatz', ziel:'2.400.000 €', ist:'309.000 €', pct:13, farbe:'orange' },
        { titel:'Neue Stammkunden', ziel:'80 Kunden', ist:'12 Kunden', pct:15, farbe:'blue' },
        { titel:'Workshop-Umsatz', ziel:'48.000 €', ist:'5.800 €', pct:12, farbe:'green' },
        { titel:'Mitarbeiterzufriedenheit', ziel:'≥ 4,5 / 5', ist:'4,3 / 5', pct:86, farbe:'purple' }
    ];
    el.innerHTML = '<div class="space-y-3">'
        + ziele.map(function(z) {
            return '<div class="vit-card p-4"><div class="flex justify-between items-center mb-1">'
                + '<span class="font-semibold text-gray-800 text-sm">' + z.titel + '</span>'
                + '<span class="text-xs text-gray-500">' + z.ist + ' / ' + z.ziel + '</span></div>'
                + '<div class="w-full bg-gray-100 rounded-full h-2"><div class="h-2 rounded-full bg-' + z.farbe + '-400" style="width:' + z.pct + '%"></div></div>'
                + '<div class="text-xs text-gray-400 mt-0.5">' + z.pct + '%</div></div>';
        }).join('')
        + '</div>';
}

// ─── Billing Demo (unverändert + erweitert) ───────────────────────────────

function fillDemoBilling() {
    var inv = document.getElementById('stBillingInvoicesList');
    if(inv) inv.innerHTML = ''
        + '<div class="vit-card p-4 cursor-pointer hover:shadow-md transition-shadow" onclick="showDemoInvoiceDetail(1)">'
        + '<div class="flex items-center justify-between mb-2"><div class="flex items-center space-x-2">'
        + '<span class="font-mono text-xs text-gray-400">VB-2026-001</span>'
        + '<span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Bezahlt</span>'
        + '</div><span class="font-bold text-lg">2.618,00 €</span></div>'
        + '<p class="text-sm text-gray-600">Zeitraum: 2026-01-01 bis 2026-01-31</p></div>'
        + '<div class="vit-card p-4 cursor-pointer hover:shadow-md transition-shadow" onclick="showDemoInvoiceDetail(2)">'
        + '<div class="flex items-center justify-between mb-2"><div class="flex items-center space-x-2">'
        + '<span class="font-mono text-xs text-gray-400">VB-2026-002</span>'
        + '<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Finalisiert</span>'
        + '</div><span class="font-bold text-lg">2.754,20 €</span></div>'
        + '<p class="text-sm text-gray-600">Zeitraum: 2026-02-01 bis 2026-02-28</p></div>';

    var pay = document.getElementById('stBillingPaymentsContent');
    if(pay) pay.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">'
        + '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400 uppercase font-semibold">Bezahlt</p><p class="text-2xl font-bold text-green-600">28.734,00 €</p><p class="text-xs text-gray-400">11 Rechnungen</p></div>'
        + '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400 uppercase font-semibold">Offen</p><p class="text-2xl font-bold text-amber-500">2.754,20 €</p><p class="text-xs text-gray-400">1 Rechnung</p></div>'
        + '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400 uppercase font-semibold">Gesamt 2026</p><p class="text-2xl font-bold text-gray-800">5.372,20 €</p><p class="text-xs text-gray-400">2 Rechnungen</p></div>'
        + '</div>';

    var str = document.getElementById('stBillingStrategyContent');
    if(str) str.innerHTML = '<div class="vit-card p-6">'
        + '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-lg">Jahresstrategie 2026</h3><span class="text-sm font-semibold">🔒 Gesperrt (verbindlich)</span></div>'
        + '<div class="grid grid-cols-2 gap-4">'
        + '<div class="p-4 bg-orange-50 rounded-lg"><p class="text-xs text-gray-400">Plan-Umsatz</p><p class="text-xl font-bold text-vit-orange">2.400.000 €</p><p class="text-xs text-gray-500">200.000 € / Monat</p></div>'
        + '<div class="p-4 bg-blue-50 rounded-lg"><p class="text-xs text-gray-400">Marketing-Budget</p><p class="text-xl font-bold text-blue-600">24.000 €</p><p class="text-xs text-gray-500">2.000 € / Monat</p></div>'
        + '</div></div>';

    var costs = document.getElementById('stBillingCostsContent');
    if(costs) costs.innerHTML = '<div class="vit-card p-6">'
        + '<h3 class="font-bold text-lg mb-4">Monatliche Kostenaufschlüsselung</h3>'
        + '<table class="w-full text-sm"><tbody>'
        + '<tr class="border-b"><td class="py-2">Grundgebühr</td><td class="py-2 text-right font-mono">800,00 €</td></tr>'
        + '<tr class="border-b"><td class="py-2">Umsatzbeteiligung (80% × 2% × 200.000 €)</td><td class="py-2 text-right font-mono">3.200,00 €</td></tr>'
        + '<tr class="border-b"><td class="py-2">Online-Werbebudget <span class="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">Durchlaufposten</span></td><td class="py-2 text-right font-mono">2.000,00 €</td></tr>'
        + '<tr class="border-b"><td class="py-2">Toolkosten (3 Nutzer)</td><td class="py-2 text-right font-mono">147,00 €</td></tr>'
        + '<tr class="font-bold text-lg"><td class="pt-3">Netto gesamt</td><td class="pt-3 text-right font-mono text-vit-orange">6.147,00 €</td></tr>'
        + '</tbody></table></div>';
}

function showDemoInvoiceDetail(nr) {
    var el = document.getElementById('stBillingInvoicesList');
    if(!el) return;
    var invoices = {
        1: {num:'VB-2026-001',status:'Bezahlt',period:'01.01.2026 – 31.01.2026',netto:'2.200,00',mwst:'418,00',total:'2.618,00',
            lines:[{desc:'Grundgebühr Januar 2026',amount:'800,00'},{desc:'Umsatzbeteiligung (80% × 2% × 168.420 €)',amount:'2.694,72'},{desc:'Marketing-Umlage',amount:'2.000,00'},{desc:'Abzgl. Quartalsverrechnung Q4/2025',amount:'-3.294,72'}]},
        2: {num:'VB-2026-002',status:'Finalisiert',period:'01.02.2026 – 28.02.2026',netto:'2.314,45',mwst:'439,75',total:'2.754,20',
            lines:[{desc:'Grundgebühr Februar 2026',amount:'800,00'},{desc:'Umsatzbeteiligung Vorauszahlung',amount:'3.200,00'},{desc:'Marketing-Umlage',amount:'2.000,00'},{desc:'Portal-Tools (3 Nutzer)',amount:'147,00'},{desc:'Abzgl. Frühbucher-Rabatt',amount:'-832,55'}]}
    };
    var inv = invoices[nr]; if(!inv) return;
    var h = '<button onclick="fillDemoBilling()" class="text-xs text-vit-orange hover:underline mb-4 inline-block">← Zurück zur Übersicht</button>';
    h += '<div class="vit-card p-6 mb-4"><div class="flex items-center justify-between mb-4">';
    h += '<div><h3 class="font-bold text-lg">'+inv.num+'</h3><p class="text-xs text-gray-400">'+inv.period+'</p></div>';
    h += '<div class="text-right"><span class="text-xs px-2 py-0.5 rounded-full '+(inv.status==='Bezahlt'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700')+' font-semibold">'+inv.status+'</span>';
    h += '<p class="text-2xl font-bold text-vit-orange mt-2">'+inv.total+' €</p></div></div>';
    h += '<table class="w-full text-sm mb-4"><thead class="text-xs text-gray-500 uppercase border-b"><tr><th class="text-left py-2">Position</th><th class="text-right py-2">Betrag</th></tr></thead><tbody>';
    inv.lines.forEach(function(li){
        h += '<tr class="border-b border-gray-100"><td class="py-2">'+li.desc+'</td><td class="py-2 text-right font-semibold">'+li.amount+' €</td></tr>';
    });
    h += '<tr class="border-t-2"><td class="py-2 font-semibold">Netto</td><td class="py-2 text-right font-semibold">'+inv.netto+' €</td></tr>';
    h += '<tr><td class="py-1 text-gray-500 text-xs">MwSt (19%)</td><td class="py-1 text-right text-xs text-gray-500">'+inv.mwst+' €</td></tr>';
    h += '<tr class="border-t-2"><td class="py-2 font-bold text-lg">Gesamt</td><td class="py-2 text-right font-bold text-lg text-vit-orange">'+inv.total+' €</td></tr>';
    h += '</tbody></table></div>';
    el.innerHTML = h;
}

// ─── HQ Billing Overrides (bleiben erhalten) ──────────────────────────────

var _origLoadBillingOverview = window.loadBillingOverview;
var _origLoadAllInvoices = window.loadAllInvoices;

window.loadBillingOverview = function() {
    if(!DEMO_ACTIVE) { if(_origLoadBillingOverview) return _origLoadBillingOverview(); return; }
    setTimeout(fillDemoHQBillingOverview, 150);
};
window.loadAllInvoices = function() { if(!DEMO_ACTIVE) { if(_origLoadAllInvoices) return _origLoadAllInvoices(); return; } fillDemoHQInvoices(); };

function fillDemoHQBillingOverview() {
    var kpis = document.getElementById('billingKpis');
    if(kpis) kpis.innerHTML = ''
        + '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400">Drafts</p><p class="text-2xl font-bold text-blue-600">8</p></div>'
        + '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400">Finalisiert</p><p class="text-2xl font-bold text-amber-500">5</p></div>'
        + '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400">Bezahlt</p><p class="text-2xl font-bold text-green-600">10</p></div>'
        + '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-400">Gesamtvolumen</p><p class="text-2xl font-bold text-vit-orange">56.830 €</p></div>';
    var tbl = document.getElementById('billingOverviewTable');
    if(!tbl) return;
    var rows = [
        {name:'Grafrath',strat:'✅ 2.4M',sepa:'✅',total:'2.754,20',status:'finalized'},
        {name:'Berlin-Brandenburg',strat:'✅ 3.8M',sepa:'✅',total:'4.289,00',status:'paid'},
        {name:'Witten',strat:'✅ 1.8M',sepa:'❌',total:'1.987,60',status:'draft'},
        {name:'Rottweil',strat:'✅ 2.0M',sepa:'✅',total:'2.156,40',status:'paid'},
        {name:'Hamburg',strat:'✅ 3.2M',sepa:'✅',total:'3.845,20',status:'paid'},
        {name:'München BAL',strat:'✅ 2.8M',sepa:'✅',total:'3.124,80',status:'finalized'},
        {name:'Holzkirchen',strat:'⏳ Ausstehend',sepa:'✅',total:'—',status:'draft'},
        {name:'Lohmar',strat:'✅ 2.1M',sepa:'✅',total:'2.398,00',status:'paid'}
    ];
    var sL = {draft:'📝 Draft',finalized:'📬 Finalisiert',paid:'✅ Bezahlt'};
    var sC = {draft:'bg-blue-100 text-blue-700',finalized:'bg-amber-100 text-amber-700',paid:'bg-green-100 text-green-700'};
    tbl.innerHTML = rows.map(function(r){
        return '<tr class="border-t hover:bg-gray-50">'
            + '<td class="p-3 font-semibold">vit:bikes '+r.name+'</td>'
            + '<td class="p-3 text-center text-xs">'+r.strat+'</td>'
            + '<td class="p-3 text-center">'+r.sepa+'</td>'
            + '<td class="p-3 text-right font-mono font-semibold">'+r.total+' €</td>'
            + '<td class="p-3 text-center"><span class="text-xs px-2 py-0.5 rounded-full '+sC[r.status]+' font-semibold">'+sL[r.status]+'</span></td>'
            + '<td class="p-3 text-center"><button class="text-xs text-vit-orange hover:underline">Details →</button></td>'
            + '</tr>';
    }).join('');
}

function fillDemoHQInvoices() {
    var el = document.getElementById('billingInvoicesList'); if(!el) return;
    var invoices = [
        {num:'VB-2026-023',standort:'Berlin-Brandenburg',period:'Feb 2026',total:'4.289,00',sc:'green',sl:'Bezahlt'},
        {num:'VB-2026-022',standort:'Hamburg',period:'Feb 2026',total:'3.845,20',sc:'green',sl:'Bezahlt'},
        {num:'VB-2026-021',standort:'Grafrath',period:'Feb 2026',total:'2.754,20',sc:'amber',sl:'Finalisiert'},
        {num:'VB-2026-020',standort:'München BAL',period:'Feb 2026',total:'3.124,80',sc:'amber',sl:'Finalisiert'},
        {num:'VB-2026-019',standort:'Münster',period:'Feb 2026',total:'2.812,50',sc:'amber',sl:'Finalisiert'}
    ];
    el.innerHTML = '<div class="space-y-2">'+invoices.map(function(inv){
        return '<div class="vit-card p-4 hover:shadow-md cursor-pointer">'
            + '<div class="flex items-center justify-between mb-1"><div class="flex items-center space-x-3"><span class="font-mono text-xs text-gray-400">'+inv.num+'</span>'
            + '<span class="text-xs px-2 py-0.5 rounded-full bg-'+inv.sc+'-100 text-'+inv.sc+'-700 font-semibold">'+inv.sl+'</span></div>'
            + '<span class="font-bold text-lg">'+inv.total+' €</span></div>'
            + '<p class="text-sm text-gray-500">'+inv.standort+' · '+inv.period+'</p></div>';
    }).join('')+'</div>';
}


// ─── Utility Helpers ──────────────────────────────────────────────────────

function eur(v) {
    if(v === null || v === undefined) return '—';
    var n = Math.abs(Math.round(v));
    var s = n.toLocaleString('de-DE') + ' €';
    return v < 0 ? '−' + s : s;
}

function eurCls(v) {
    if(!v) return '';
    return v >= 0 ? 'text-green-700' : 'text-red-600';
}

function fmtDate(d) {
    if(!d) return '';
    var parts = d.split('-');
    return parts[2] + '.' + parts[1] + '.' + parts[0];
}

function fmtDayMonth(d) {
    if(!d) return '';
    var parts = d.split('-');
    return parts[2] + '.' + parts[1] + '.';
}

function getKWStr(d) {
    var onejan = new Date(d.getFullYear(), 0, 1);
    var kw = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return 'KW ' + kw;
}

function demoLeadRow(label, count) {
    return '<div class="flex justify-between text-xs py-0.5">'
        + '<span class="text-gray-600">' + label + '</span>'
        + '<span class="font-semibold">' + count + '</span></div>';
}

function demoStatCard(label, value, sub, cls) {
    return '<div class="vit-card p-3 text-center">'
        + '<div class="text-xs text-gray-400 mb-1">' + label + '</div>'
        + '<div class="text-xl font-bold ' + cls + '">' + value + '</div>'
        + '<div class="text-xs text-gray-400">' + sub + '</div></div>';
}

function demoVerkaufRow(tag, beratungen, verkauft) {
    return '<div class="flex items-center gap-3 text-sm py-1.5 border-b border-gray-50">'
        + '<span class="w-20 text-gray-500 shrink-0">' + tag + '</span>'
        + '<span class="text-blue-600 font-medium">' + beratungen + ' Berat.</span>'
        + '<span class="text-green-600 font-medium ml-auto">' + verkauft + ' Verk.</span></div>';
}

function demoBwaListItem(label, umsatz, active) {
    return '<div class="p-3 rounded-lg cursor-pointer ' + (active ? 'bg-orange-50 border border-vit-orange' : 'hover:bg-gray-50') + '" onclick="demoShowBwaDetail(\'' + (label.includes('Feb') ? 'feb' : 'jan') + '\')">'
        + '<div class="font-semibold text-sm">' + label + '</div>'
        + '<div class="text-xs text-gray-500">' + eur(umsatz) + ' Umsatz</div></div>';
}

// ─── fillDemoHQ (legacy – not used for standort demo) ────────────────────
function fillDemoHQ() {}

// ─── Exports ─────────────────────────────────────────────────────────────
export { switchDemoAccount, injectDemoBanner, exitDemoMode, fillDemoBilling, showDemoInvoiceDetail };
window.switchDemoAccount = switchDemoAccount;
window.injectDemoBanner = injectDemoBanner;
window.exitDemoMode = exitDemoMode;
window.fillDemoBilling = fillDemoBilling;
window.showDemoInvoiceDetail = showDemoInvoiceDetail;
window.demoShowBwaDetail = demoShowBwaDetail;
