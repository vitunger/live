/**
 * views/dev-pipeline.js - Dev Pipeline Orchestrator
 * Shared state + entry points. Sub-modules: dev-recording, dev-tabs, dev-kanban,
 * dev-roadmap, dev-ideas, dev-detail, dev-vision, dev-notifications, dev-utils,
 * dev-workflow, dev-release, dev-ki, dev-mockup.
 * @module views/dev-pipeline
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// === SHARED STATE ===
var devSubmissions = [];
var devFilterMirZugewiesen = false;
var devKPIActiveFilter = '';
var devCurrentTab = 'meine';
var devInputType = 'text';
var devSelectedFiles = [];

var devStatusLabels = {
    neu:'Neu eingereicht', ki_pruefung:'⏳ Wird geprüft...', ki_rueckfragen:'❓ Rückfragen',
    konzept_erstellt:'📋 Konzept fertig', konzept_wird_erstellt:'⏳ Konzept wird erstellt...', im_ideenboard:'🎯 Im Ideenboard', hq_rueckfragen:'❓ Rückfragen',
    freigegeben:'✅ Freigegeben', in_planung:'📅 In Planung', in_entwicklung:'🔨 In Entwicklung',
    beta_test:'🧪 Beta-Test', im_review:'🔍 Im Review', release_geplant:'🚀 Release geplant', ausgerollt:'✅ Ausgerollt',
    abgelehnt:'❌ Abgelehnt', geparkt:'⏸ Geparkt', geschlossen:'🔒 Geschlossen'
};
var devStatusColors = {
    neu:'bg-blue-100 text-blue-700', ki_pruefung:'bg-purple-100 text-purple-700 animate-pulse',
    ki_rueckfragen:'bg-yellow-100 text-yellow-700', konzept_erstellt:'bg-indigo-100 text-indigo-700', konzept_wird_erstellt:'bg-purple-100 text-purple-700',
    im_ideenboard:'bg-orange-100 text-orange-700', hq_rueckfragen:'bg-yellow-100 text-yellow-700',
    freigegeben:'bg-green-100 text-green-700', in_planung:'bg-teal-100 text-teal-700',
    in_entwicklung:'bg-blue-100 text-blue-700', beta_test:'bg-pink-100 text-pink-700',
    im_review:'bg-purple-100 text-purple-700',
    release_geplant:'bg-orange-100 text-orange-700', ausgerollt:'bg-green-100 text-green-700',
    abgelehnt:'bg-red-100 text-red-700', geparkt:'bg-gray-100 text-gray-600',
    geschlossen:'bg-slate-100 text-slate-600'
};
var devKatIcons = {bug:'🐛',verbesserung:'🔧',feature:'🚀',prozess:'📋',sonstiges:'💬'};

// === EXPOSE SHARED STATE ===
window._devState = {
    get submissions() { return devSubmissions; },
    set submissions(v) { devSubmissions = v; },
    get currentTab() { return devCurrentTab; },
    set currentTab(v) { devCurrentTab = v; },
    get kpiActiveFilter() { return devKPIActiveFilter; },
    set kpiActiveFilter(v) { devKPIActiveFilter = v; },
    get filterMirZugewiesen() { return devFilterMirZugewiesen; },
    set filterMirZugewiesen(v) { devFilterMirZugewiesen = v; },
    get inputType() { return devInputType; },
    set inputType(v) { devInputType = v; },
    get selectedFiles() { return devSelectedFiles; },
    set selectedFiles(v) { devSelectedFiles = v; },
    statusLabels: devStatusLabels,
    statusColors: devStatusColors,
    katIcons: devKatIcons
};

// ============================================
// ENTWICKLUNG V2 — Unified View Logic
// ============================================
var entwCurrentTab = 'ideen';

export async function renderEntwicklung() {
    var _savedTab; try { _savedTab = localStorage.getItem('vit:lastEntwTab'); } catch(e) {}
    if(_savedTab && ['ideen','module','releases','steuerung','flags','nutzung','system','vision'].indexOf(_savedTab) !== -1) {
        entwCurrentTab = _savedTab;
    }
    var isHQ = (currentRoles||[]).indexOf('hq') !== -1;
    var isOwner = (currentRoles||[]).indexOf('owner') !== -1;

    document.querySelectorAll('.entw-hq-tab, .entw-hq-sep').forEach(function(el) {
        el.style.display = isHQ ? '' : 'none';
    });
    var tabNav = document.getElementById('entwicklungTabs');
    var existingVisionBtn = document.getElementById('entwVisionTabBtn');
    if(isOwner && tabNav && !existingVisionBtn) {
        var vBtn = document.createElement('button');
        vBtn.id = 'entwVisionTabBtn';
        vBtn.className = 'entw-tab-btn entw-hq-tab px-4 py-2 rounded-md text-sm font-semibold text-gray-500 whitespace-nowrap';
        vBtn.setAttribute('data-etab', 'vision');
        vBtn.textContent = '🔭 Vision';
        vBtn.onclick = function(){ showEntwicklungTab('vision'); };
        tabNav.appendChild(vBtn);
        var vContainer = document.createElement('div');
        vContainer.id = 'entwTabVision';
        vContainer.className = 'entw-tab-content';
        vContainer.style.display = 'none';
        var parentContainer = document.querySelector('#entwicklungView');
        if(parentContainer) parentContainer.appendChild(vContainer);
    }
    if(existingVisionBtn) existingVisionBtn.style.display = isOwner ? '' : 'none';
    showEntwicklungTab(entwCurrentTab);
}

export function showEntwicklungTab(tab) {
    try { localStorage.setItem('vit_lastEntwicklungTab', tab); } catch(e) {}
    entwCurrentTab = tab;
    try { localStorage.setItem('vit:lastEntwTab', tab); } catch(e) {}
    document.querySelectorAll('.entw-tab-btn').forEach(function(b) {
        var isActive = b.getAttribute('data-etab') === tab;
        b.className = 'entw-tab-btn px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap ' +
            (isActive ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500') +
            (b.classList.contains('entw-hq-tab') ? ' entw-hq-tab' : '');
    });
    document.querySelectorAll('.entw-tab-content').forEach(function(c) { c.style.display = 'none'; });
    var targetId = 'entwTab' + tab.charAt(0).toUpperCase() + tab.slice(1);
    var target = document.getElementById(targetId);
    if(target) target.style.display = '';
    renderEntwTabContent(tab);
}

export async function renderEntwTabContent(tab) {
    if(tab === 'ideen') {
        await loadDevSubmissions();
        if(typeof window.renderEntwIdeen === 'function') window.renderEntwIdeen();
    } else if(tab === 'module') {
        if(typeof window.renderModulStatus === 'function') window.renderModulStatus(); else console.warn('[dev-pipeline] renderModulStatus not found');
    } else if(tab === 'releases') {
        if(typeof window.renderEntwReleases === 'function') window.renderEntwReleases();
    } else if(tab === 'steuerung') {
        if(typeof window.renderEntwSteuerung === 'function') window.renderEntwSteuerung();
    } else if(tab === 'flags') {
        if(typeof window.renderEntwFlags === 'function') window.renderEntwFlags();
    } else if(tab === 'nutzung') {
        if(typeof window.renderEntwNutzung === 'function') window.renderEntwNutzung();
    } else if(tab === 'system') {
        if(typeof window.renderEntwSystem === 'function') window.renderEntwSystem();
    } else if(tab === 'vision') {
        if(typeof window.renderDevVision === 'function') window.renderDevVision();
    }
}

export async function loadDevSubmissions(force) {
    try {
        var query = _sb().from('dev_submissions').select('*, users!dev_submissions_user_id_public_fkey(name), dev_ki_analysen(zusammenfassung, vision_fit_score, machbarkeit, aufwand_schaetzung, bug_schwere, deadline_vorschlag, deadline_begruendung), dev_votes(user_id), dev_kommentare(id, typ, inhalt, created_at, users!dev_kommentare_user_id_public_fkey(name))').order('created_at', {ascending: false});
        var resp = await query;
        if(resp.error) throw resp.error;
        devSubmissions = resp.data || [];
        var _isHQUser = (currentRoles||[]).indexOf('hq') !== -1;
        if(!_isHQUser) {
            var _uid = _sbUser() ? _sbUser().id : null;
            devSubmissions = devSubmissions.filter(function(s) {
                return s.partner_sichtbar !== false || s.user_id === _uid;
            });
        }
    } catch(err) {
        console.error('DevSubmissions load:', err);
        devSubmissions = [];
    }
    var bar = document.getElementById('entwStatsBar');
    if(bar) {
        var eingang = devSubmissions.filter(function(s){ return ['neu','ki_pruefung'].indexOf(s.status) !== -1; }).length;
        var warten = devSubmissions.filter(function(s){ return ['ki_rueckfragen','hq_rueckfragen'].indexOf(s.status) !== -1; }).length;
        var aktiv = devSubmissions.filter(function(s){ return ['in_entwicklung','beta_test','im_review'].indexOf(s.status) !== -1; }).length;
        var done = devSubmissions.filter(function(s){ return s.status === 'ausgerollt'; }).length;
        var bugs = devSubmissions.filter(function(s){ return s.ki_typ === 'bug' && ['abgelehnt','ausgerollt','geparkt'].indexOf(s.status) === -1; }).length;
        var week = devSubmissions.filter(function(s){ return (Date.now() - new Date(s.created_at).getTime()) < 7*86400000; }).length;
        var total = devSubmissions.length;
        var _af = devKPIActiveFilter || '';
        var kh = '<div class="grid grid-cols-3 md:grid-cols-7 gap-2 mb-4">';
        kh += '<div class="vit-card p-2 text-center cursor-pointer hover:shadow-md transition'+(_af==='eingang'?' ring-2 ring-orange-400':eingang>3?' ring-2 ring-red-300':'')+'" onclick="devKPIFilter(\'eingang\')">';
        kh += '<p class="text-lg font-bold '+(eingang>3?'text-red-600':'text-gray-800')+'">'+eingang+'</p>';
        kh += '<p class="text-[9px] text-gray-500">\u{1F4E5} Eingang</p></div>';
        kh += '<div class="vit-card p-2 text-center cursor-pointer hover:shadow-md transition'+(_af==='warten'?' ring-2 ring-orange-400':warten>0?' ring-2 ring-yellow-300':'')+'" onclick="devKPIFilter(\'warten\')">';
        kh += '<p class="text-lg font-bold '+(warten>0?'text-yellow-600':'text-gray-800')+'">'+warten+'</p>';
        kh += '<p class="text-[9px] text-gray-500">\u23F3 Warten</p></div>';
        kh += '<div class="vit-card p-2 text-center cursor-pointer hover:shadow-md transition'+(_af==='aktiv'?' ring-2 ring-orange-400':'')+'" onclick="devKPIFilter(\'aktiv\')">';
        kh += '<p class="text-lg font-bold text-blue-600">'+aktiv+'</p>';
        kh += '<p class="text-[9px] text-gray-500">\u{1F528} In Arbeit</p></div>';
        kh += '<div class="vit-card p-2 text-center cursor-pointer hover:shadow-md transition'+(_af==='done'?' ring-2 ring-orange-400':'')+'" onclick="devKPIFilter(\'done\')">';
        kh += '<p class="text-lg font-bold text-green-600">'+done+'</p>';
        kh += '<p class="text-[9px] text-gray-500">\u2705 Umgesetzt</p></div>';
        kh += '<div class="vit-card p-2 text-center cursor-pointer hover:shadow-md transition'+(_af==='bugs'?' ring-2 ring-orange-400':bugs>0?' ring-2 ring-red-300':'')+'" onclick="devKPIFilter(\'bugs\')">';
        kh += '<p class="text-lg font-bold '+(bugs>0?'text-red-600 animate-pulse':'text-gray-800')+'">'+bugs+'</p>';
        kh += '<p class="text-[9px] text-gray-500">\u{1F534} Bugs</p></div>';
        kh += '<div class="vit-card p-2 text-center cursor-pointer hover:shadow-md transition'+(_af==='woche'?' ring-2 ring-orange-400':'')+'" onclick="devKPIFilter(\'woche\')">';
        kh += '<p class="text-lg font-bold text-purple-600">'+week+'</p>';
        kh += '<p class="text-[9px] text-gray-500">\u{1F4C8} Woche</p></div>';
        kh += '<div class="vit-card p-2 text-center cursor-pointer hover:shadow-md transition'+(_af==='gesamt'?' ring-2 ring-orange-400':'')+'" onclick="devKPIFilter(\'gesamt\')">';
        kh += '<p class="text-lg font-bold text-gray-600">'+total+'</p>';
        kh += '<p class="text-[9px] text-gray-500">\u{1F4E5} Gesamt</p></div>';
        bar.innerHTML = kh;
    }
}

// Helper: refresh all active Entwicklung views after status change
export function refreshEntwicklungViews() {
    if(typeof window.renderDevPipeline === 'function') window.renderDevPipeline();
    if(typeof window.renderEntwSteuerung === 'function') window.renderEntwSteuerung();
    if(typeof window.renderEntwIdeen === 'function') window.renderEntwIdeen();
}

const _exports = {
    renderEntwicklung, showEntwicklungTab, renderEntwTabContent,
    loadDevSubmissions, refreshEntwicklungViews
};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });

window.renderEntwicklung = renderEntwicklung;
