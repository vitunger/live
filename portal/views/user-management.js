/**
 * views/user-management.js - Orchestrator: Shared state, helpers, rolePermissions
 * @module views/user-management
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _sbStandort()   { return window.sbStandort; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// Standort-Rechte: Welche Rollen dürfen welche Module sehen
var rolePermissions = window.rolePermissions || {
    'home':           ['alle'],
    'kalender':       ['alle'],
    'todo':           ['alle'],
    'kommunikation':  ['alle'],
    'dashboards':     ['inhaber'],
    'allgemein':      ['inhaber','buchhaltung'],
    'verkauf':        ['inhaber','verkauf','buchhaltung'],
    'einkauf':        ['inhaber','werkstatt','buchhaltung'],
    'marketing':      ['inhaber','verkauf'],
    'controlling':    ['inhaber','buchhaltung'],
    'wissen':         ['alle'],
    'support':        ['alle'],
    'aktenschrank':   ['inhaber','buchhaltung'],
    'ideenboard':     ['alle'],
    'shop':           ['inhaber'],
    'onboarding':     ['inhaber'],
    'mitarbeiter':    ['inhaber']
};
window.rolePermissions = rolePermissions;

// Tab/Widget-Konfiguration pro Modul
var MODULE_TABS = {
    verkauf: [{key:'pipeline',label:'Pipeline'},{key:'woche',label:'Wochenansicht'},{key:'auswertung',label:'Auswertung'},{key:'training',label:'KI-Trainer'},{key:'vkWissen',label:'Wissen'}],
    marketing: [{key:'cockpit',label:'Cockpit'},{key:'budget',label:'Budget'},{key:'kampagnen',label:'Kampagnen'},{key:'reichweite',label:'Reichweite'},{key:'social',label:'Social Media'},{key:'mktStrategie',label:'Strategie'},{key:'mktWissen',label:'Wissen'}],
    einkauf: [{key:'sortiment',label:'Sortiment'},{key:'lieferanten',label:'Lieferanten'},{key:'zentralreg',label:'Zentralreg.'},{key:'ekStrategie',label:'Strategie'},{key:'ekWissen',label:'Wissen'}],
    controlling: [{key:'cockpit',label:'Cockpit'},{key:'bwa',label:'BWA-Analyse'},{key:'benchmark',label:'Benchmark'},{key:'planist',label:'Plan/Ist'},{key:'liquiditaet',label:'Liquidität'},{key:'ctrlWissen',label:'Wissen'}],
    allgemein: [{key:'uebersicht',label:'Übersicht'},{key:'jahresziele',label:'Jahresziele'},{key:'monatsplan',label:'Monatsplan'},{key:'journal',label:'Journal'},{key:'strategie',label:'Strategie'},{key:'wissen',label:'Wissen'}],
    support: [{key:'tickets',label:'Tickets'},{key:'kontakte',label:'Kontakte'}],
    kommunikation: [{key:'chat',label:'Chat'},{key:'community',label:'Community'},{key:'ankuendigungen',label:'Ankündigungen'},{key:'notifications',label:'Benachrichtigungen'}],
    mitarbeiter: [{key:'team',label:'Team-Übersicht'},{key:'rollen',label:'Rollen'},{key:'einladungen',label:'Einladungen'}],
    entwicklung: [{key:'ideen',label:'Ideen'},{key:'module',label:'Module'},{key:'releases',label:'Releases'},{key:'steuerung',label:'Steuerung'},{key:'featureflags',label:'Feature Flags'},{key:'system',label:'System'},{key:'nutzung',label:'Nutzung'}],
    wissen: [{key:'artikel',label:'Artikel'},{key:'downloads',label:'Downloads'},{key:'schulungen',label:'Schulungen'}],
    buchhaltung: [{key:'rechnungen',label:'Rechnungen'},{key:'zahlungen',label:'Zahlungen'},{key:'mahnwesen',label:'Mahnwesen'}],
    abrechnung: [{key:'monatsabrechnung',label:'Monatsabrechnung'},{key:'settlement',label:'Settlement'},{key:'strategien',label:'Strategien'},{key:'produkte',label:'Produkte'},{key:'tools',label:'Tools'}],
    office: [{key:'team',label:'Team'},{key:'plan',label:'Grundriss'}]
};
var MODULE_WIDGETS = {
    startseite: [{key:'daily_focus',label:'Heute steuern'},{key:'health_score',label:'Health Score'},{key:'sales_momentum',label:'Sales Momentum'},{key:'bwa_deadline',label:'BWA-Deadline'},{key:'bwa_netzwerk',label:'BWA Netzwerk-Status'},{key:'kpi_feedback',label:'Monats-Feedback'},{key:'pipeline',label:'Pipeline'},{key:'success',label:'Verkaufserfolg'},{key:'termine',label:'Termine'},{key:'aufgaben',label:'Aufgaben'},{key:'marketing',label:'Marketing'},{key:'team',label:'Team'},{key:'controlling',label:'Controlling'},{key:'support',label:'Support'},{key:'wissen',label:'Wissen'},{key:'nachrichten',label:'Nachrichten'}]
};

// Helper badges used by multiple sub-modules
function statusBadge(s) {
    if(s==='aktiv') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">\u{1F7E2} Aktiv</span>';
    if(s==='demo') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 animate-pulse">\u{1F534} Demo</span>';
    if(s==='onboarding') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">\u{1F535} Onboarding</span>';
    if(s==='pending') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700">\u23F3 Wartet</span>';
    if(s==='gesperrt') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">\u{1F6AB} Gesperrt</span>';
    if(s==='offboarding') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">\u{1F534} Offboarding</span>';
    return s;
}
function rolleBadge(r) {
    var colors = {'inhaber':'bg-vit-orange text-white','verkauf':'bg-blue-100 text-blue-700','werkstatt':'bg-gray-200 text-gray-700','buchhaltung':'bg-purple-100 text-purple-700','hq':'bg-red-100 text-red-700','hq_gf':'bg-yellow-100 text-yellow-800','hq_sales':'bg-blue-100 text-blue-700','hq_marketing':'bg-pink-100 text-pink-700','hq_einkauf':'bg-cyan-100 text-cyan-700','hq_support':'bg-purple-100 text-purple-700','hq_akademie':'bg-emerald-100 text-emerald-700','hq_hr':'bg-rose-100 text-rose-700','hq_it':'bg-slate-200 text-slate-700','hq_zahlen':'bg-teal-100 text-teal-700','owner':'bg-amber-100 text-amber-800'};
    var labels = {'inhaber':'Gesch\u00e4ftsleitung','verkauf':'Verkauf','werkstatt':'Werkstatt','buchhaltung':'Buchhaltung','hq':'HQ','hq_gf':'Gesch\u00e4ftsf\u00fchrung','hq_sales':'Sales','hq_marketing':'Marketing','hq_einkauf':'Einkauf','hq_support':'Support','hq_akademie':'Akademie','hq_hr':'HR','hq_it':'IT / Systemadmin','hq_zahlen':'Zahlen','owner':'Owner'};
    return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold '+(colors[r]||'bg-gray-100 text-gray-600')+'">'+(labels[r]||r)+'</span>';
}
function rollenBadges(rollen) {
    return rollen.map(function(r){ return rolleBadge(r); }).join(' ');
}

// Expose shared state for sub-modules
window._umState = { rolePermissions: rolePermissions, MODULE_TABS: MODULE_TABS, MODULE_WIDGETS: MODULE_WIDGETS };

// Strangler Fig
const _exports = { statusBadge, rolleBadge, rollenBadges };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
