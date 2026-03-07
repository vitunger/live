/**
 * views/misc-views.js - Orchestrator: PortalNutzung, Mobile Sidebar, ViewSwitcher, Social Media, React Mount
 * Sub-Module: misc-modulstatus.js, misc-training.js
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

// Collapsed sidebar: clicking any sidebar-item also expands the sidebar
// Navigation still happens (no preventDefault), sidebar just opens alongside
(function() {
    var sb = document.getElementById('sidebarNav');
    if(!sb) return;
    sb.addEventListener('click', function(e) {
        if(!sb.classList.contains('collapsed')) return;
        var item = e.target.closest('.sidebar-item');
        if(item && window.innerWidth > 768) {
            sb.classList.remove('collapsed');
            try { localStorage.setItem('vit-sidebar-collapsed', '0'); } catch(ex){}
            // Don't block the click — let the onclick navigate normally
        }
    });
})();
export function closeMobileSidebar() {
    var sidebar = document.getElementById('sidebarNav');
    var overlay = document.getElementById('sidebarOverlay');
    if(sidebar) sidebar.classList.remove('mobile-open');
    if(overlay) overlay.classList.remove('active');
}
// NOTE: Mobile sidebar auto-close on navigation is now handled by
// view-router.js via 'vit:view-changed' event listener.

// === VIEW MODE SWITCHER (Partner vs HQ) ===
export function switchViewMode(mode) {
    var isHQ = mode === 'hq';
    var currentRoles = window.currentRoles || ['inhaber'];

    if(isHQ) {
        window.currentRole = 'hq';
        // Keep original roles but add hq
        if(currentRoles.indexOf('hq') < 0) currentRoles.push('hq');
    } else {
        // Remove hq from roles, restore original
        currentRoles = currentRoles.filter(function(r){ return r !== 'hq'; });
        if(currentRoles.length === 0) currentRoles = ['inhaber'];
        window.currentRole = currentRoles[0];
    }
    window.currentRoles = currentRoles;

    try { updateUIForRole(); } catch(e) { console.warn(e); }
    try { applyModulStatus(); } catch(e) { console.warn(e); }

    // Restore last view from localStorage (if available), otherwise default
    var lastView = null;
    try { lastView = localStorage.getItem('vit_lastView'); } catch(e) {}
    if(lastView && document.getElementById(lastView + 'View')) {
        _showView(lastView);
    } else if(isHQ) {
        _showView('hqCockpit');
    } else {
        _showView('home');
    }
}

// Init: show partner mode by default (only if enterApp hasn't already handled it)
window.addEventListener('vit:modules-ready', function() {
    // Skip if enterApp has already set the role (authenticated user)
    if(window.currentRole && window.currentRole !== 'inhaber') return;
    if(window.sbUser) return; // User is logged in, enterApp handles view
    if (typeof window.switchViewMode === 'function') switchViewMode('partner_grafrath');
});

// === SOCIAL MEDIA LOCAL HERO ===
// Themen werden jetzt aus DB geladen (video-pipeline.js → vpLoadThemen)
// Hardcoded Array nur noch als Fallback, falls DB nicht erreichbar
if(!window.smThemen || !window.smThemen.length) {
    window.smThemen = []; // Wird von vpLoadThemen() aus DB befüllt
};


window.smRankingData = [
    {name:'Pfaffenhofen',count:7},{name:'Witten',count:6},{name:'Berlin',count:6},
    {name:'Weilheim',count:4},{name:'Grafrath',count:4},{name:'Wachtendonk',count:3},
    {name:'Teisendorf',count:1},{name:'Warendorf',count:1},{name:'Muenster',count:1},{name:'Lohmar',count:1},
    {name:'Karlsdorf',count:0},{name:'Garching',count:0},{name:'Reutlingen',count:0},
    {name:'Holzkirchen',count:0},{name:'Hann. Muenden',count:0},{name:'Zell',count:0},
    {name:'Wesel',count:0},{name:'Rottweil',count:0},{name:'Hamburg',count:0},
    {name:'M-Thalkirchen',count:0},{name:'Muenchen BAL',count:0}
];


// === REACT PIPELINE MOUNT FUNCTION ===
var _pipelineReactRoot = null;
export function mountReactPipeline() {
    var root = document.getElementById('react-pipeline-root');
    if(!root) { console.warn('[Pipeline] No root element'); return; }
    if(typeof window.__PIPELINE_APP !== 'function') {
        setTimeout(mountReactPipeline, 300);
        return;
    }
    try {
        if(!_pipelineReactRoot) {
            _pipelineReactRoot = ReactDOM.createRoot(root);
        }
        _pipelineReactRoot.render(React.createElement(window.__PIPELINE_APP));
    } catch(err) {
        console.error('[Pipeline] ❌ Error:', err);
        // If createRoot fails (already has root), try unmount first
        try {
            _pipelineReactRoot = ReactDOM.createRoot(root);
            _pipelineReactRoot.render(React.createElement(window.__PIPELINE_APP));
        } catch(e2) {
            console.error('[Pipeline] ❌ Retry also failed:', e2);
        }
    }
}

// Strangler Fig
const _exports = {renderDevNutzung,toggleMobileSidebar,toggleSidebarCollapse,closeMobileSidebar,switchViewMode,mountReactPipeline};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });

// === Window Exports (onclick handlers) ===
window.toggleMobileSidebar = toggleMobileSidebar;
window.toggleSidebarCollapse = toggleSidebarCollapse;
