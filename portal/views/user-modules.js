/**
 * views/user-modules.js - HQ-Einstellungen, Modul-Status, Rechte-Matrix, Demo-Modus
 * @module views/user-modules
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

// Persistent expanded state
var expandedModules = {};
// Module config cache: {modul_key: {status: 'aktiv'|'beta'|'demo'|'bald'|'inaktiv', tabs: {...}, widgets: {...}}}
var sbModulConfig = {};
window.sbModulConfig = sbModulConfig;
var _hqToggling = false;

export function showSettingsTab(tab) {
    document.querySelectorAll('.settings-tab').forEach(function(b){
        b.className = 'settings-tab px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700';
    });
    var btn = document.querySelector('.settings-tab[data-tab="'+tab+'"]');
    if(btn) btn.className = 'settings-tab px-4 py-2.5 text-sm font-semibold border-b-2 border-vit-orange text-vit-orange';
    document.querySelectorAll('.settings-tab-content').forEach(function(c){ c.style.display = 'none'; });
    var content = document.getElementById('settingsTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if(content) content.style.display = '';
    // Load tab-specific data
    if(tab === 'demo') renderDemoModulList();
    if(tab === 'hqmodule') renderHqModulStatusList();
    if(tab === 'office') { setTimeout(function(){ if(typeof window.officeRenderAdminDots === 'function') window.officeRenderAdminDots(); }, 150); }
    if(tab === 'schnittstellen') { setTimeout(function(){ if(typeof window.renderSchnittstellen === 'function') window.renderSchnittstellen(); }, 100); }
}

export async function renderModulStatusList() {
    var container = document.getElementById('modulStatusList');
    if(!container) return;
    var MODULE_TABS = window._umState ? window._umState.MODULE_TABS : {};
    var MODULE_WIDGETS = window._umState ? window._umState.MODULE_WIDGETS : {};
    try {
        var resp = await _sb().from('modul_status').select('*').order('reihenfolge');
        if(resp.error) throw resp.error;
        var modules = (resp.data || []).filter(function(m) { return m.ebene === 'partner' || m.ebene === 'beide'; });
        var html = '';
        var katLabels = {basis:'Basis',dashboards:'Dashboards',fachbereiche:'Fachbereiche',tools:'Tools'};
        var lastKat = '';
        var counts = {aktiv:0, beta:0, demo:0, bald:0, inaktiv:0};

        modules.forEach(function(m) {
            counts[m.status] = (counts[m.status]||0) + 1;
            var cfg = m.config || {};
            cfg.status = m.status;
            sbModulConfig[m.modul_key] = cfg;

            if(m.kategorie !== lastKat) {
                lastKat = m.kategorie;
                html += '<div class="px-5 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">' + (katLabels[m.kategorie]||m.kategorie) + '</div>';
            }
            html += _renderModulRow(m, m.status, 'partner');
        });
        container.innerHTML = html;

        var el1 = document.getElementById('countAktiv'); if(el1) el1.textContent = counts.aktiv||0;
        var el1a = document.getElementById('countBeta'); if(el1a) el1a.textContent = counts.beta||0;
        var el1b = document.getElementById('countDemo'); if(el1b) el1b.textContent = counts.demo||0;
        var el2 = document.getElementById('countWip'); if(el2) el2.textContent = counts.bald||0;
        var el3 = document.getElementById('countDeaktiviert'); if(el3) el3.textContent = counts.inaktiv||0;
    } catch(err) { console.error('ModulStatusList:', err); container.innerHTML = '<div class="p-4 text-center text-red-400">Fehler beim Laden</div>'; }
}

export async function renderHqModulStatusList() {
    var container = document.getElementById('hqModulStatusList');
    if(!container) return;
    var MODULE_TABS = window._umState ? window._umState.MODULE_TABS : {};
    var MODULE_WIDGETS = window._umState ? window._umState.MODULE_WIDGETS : {};
    try {
        var resp = await _sb().from('modul_status').select('*').order('reihenfolge');
        if(resp.error) throw resp.error;
        var modules = (resp.data || []).filter(function(m) { return m.ebene === 'hq' || m.ebene === 'beide'; });
        var html = '';
        var katLabels = {basis:'Basis (Shared)',hq:'HQ-Intern',hq_steuerung:'HQ-Steuerung',hq_netzwerk:'HQ-Netzwerk',hq_admin:'HQ-Admin',dashboards:'Dashboards',fachbereiche:'Fachbereiche',tools:'Tools'};
        var lastKat = '';
        var counts = {aktiv:0, beta:0, demo:0, bald:0, inaktiv:0};

        modules.forEach(function(m) {
            var hqSt = m.hq_status || 'aktiv';
            counts[hqSt] = (counts[hqSt]||0) + 1;
            var cfg = m.hq_config || {};
            cfg.status = hqSt;
            sbHqModulConfig[m.modul_key] = cfg;
            // Also store partner-side status for shared modules (ebene=beide)
            if(m.ebene === 'beide' && !sbModulConfig[m.modul_key]) {
                var pcfg = m.config || {};
                pcfg.status = m.status;
                sbModulConfig[m.modul_key] = pcfg;
            }

            if(m.kategorie !== lastKat) {
                lastKat = m.kategorie;
                html += '<div class="px-5 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">' + (katLabels[m.kategorie]||m.kategorie) + '</div>';
            }
            html += _renderModulRow(m, hqSt, 'hq');
        });
        container.innerHTML = html;

        var el1 = document.getElementById('countHqAktiv'); if(el1) el1.textContent = counts.aktiv||0;
        var el1a = document.getElementById('countHqBeta'); if(el1a) el1a.textContent = counts.beta||0;
        var el1b = document.getElementById('countHqDemo'); if(el1b) el1b.textContent = counts.demo||0;
        var el2 = document.getElementById('countHqWip'); if(el2) el2.textContent = counts.bald||0;
        var el3 = document.getElementById('countHqDeaktiviert'); if(el3) el3.textContent = counts.inaktiv||0;
    } catch(err) { console.error('HqModulStatusList:', err); container.innerHTML = '<div class="p-4 text-center text-red-400">Fehler beim Laden</div>'; }
}

// Shared renderer for both Partner and HQ module lists
export function _renderModulRow(m, currentStatus, ebene) {
    var MODULE_TABS = window._umState ? window._umState.MODULE_TABS : {};
    var MODULE_WIDGETS = window._umState ? window._umState.MODULE_WIDGETS : {};
    var icons = {startseite:'🏠',kalender:'📅',aufgaben:'📋',kommunikation:'💬',dashboards:'📊',allgemein:'🏢',verkauf:'📈',einkauf:'🛒',marketing:'📣',controlling:'📊',wissen:'📚',support:'🎫',ideenboard:'💡',shop:'🛍️',onboarding:'🎯',mitarbeiter:'👥',aktenschrank:'📁',entwicklung:'</>',spiritus:'📝',abrechnung:'💰',office:'🏢',standortBilling:'💳',hqCockpit:'🌐',hqKommandozentrale:'⚙️',hqHandlungsbedarf:'🚨',hqStandorte:'🏪',hqFinanzen:'💶',hqMarketing:'📣',hqEinkauf:'🛒',hqSupport:'🎫',hqAkademie:'📚',hqEinstellungen:'⚙️',hqEntwicklung:'</>',hqBuchungen:'📅'};
    var isHq = ebene === 'hq';
    var expandKey = (isHq ? 'hq_' : '') + m.modul_key;
    var cfg = isHq ? (m.hq_config || {}) : (m.config || {});
    var hasTabs = MODULE_TABS[m.modul_key] && MODULE_TABS[m.modul_key].length > 0;
    var hasWidgets = MODULE_WIDGETS[m.modul_key] && MODULE_WIDGETS[m.modul_key].length > 0;
    var hasChildren = hasTabs || hasWidgets;
    var isExpanded = expandedModules[expandKey] || false;
    var setFn = isHq ? 'setHqModulStatus' : 'setModulStatus';
    var setTabFn = isHq ? 'setHqTabStatus' : 'setTabStatus';
    var setWidgetFn = isHq ? 'setHqWidgetStatus' : 'setWidgetStatus';

    var html = '<div class="px-5 py-3 hover:bg-gray-50 transition">';
    html += '<div class="flex items-center justify-between">';
    html += '<div class="flex items-center space-x-3">';
    if(hasChildren) {
        html += '<button onclick="toggleModuleExpand(\'' + expandKey + '\',\'' + ebene + '\')" class="text-gray-400 hover:text-gray-700 text-sm" style="width:20px">' + (isExpanded?'▼':'▶') + '</button>';
    } else {
        html += '<span style="width:20px"></span>';
    }
    html += '<span class="text-xl">' + (icons[m.modul_key]||'📦') + '</span>';
    html += '<div><span class="font-semibold text-gray-800 text-sm">' + m.modul_name + '</span>';
    html += '<span class="text-xs text-gray-400 ml-2">' + m.modul_key + '</span>';
    if(m.ebene === 'beide') html += '<span class="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded ml-2">Beide</span>';
    if(hasTabs) html += '<span class="text-[10px] text-gray-400 ml-1">(' + MODULE_TABS[m.modul_key].length + ' Tabs)</span>';
    if(hasWidgets) html += '<span class="text-[10px] text-gray-400 ml-1">(' + MODULE_WIDGETS[m.modul_key].length + ' Widgets)</span>';
    html += '</div></div>';

    // Status toggle buttons
    html += '<div class="flex items-center space-x-1 bg-gray-100 rounded-lg p-0.5">';
    var btnBase = 'px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition cursor-pointer';
    html += '<button onclick="' + setFn + '(\'' + m.id + '\',\'aktiv\')" class="' + btnBase + ' ' + (currentStatus==='aktiv' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200') + '">✓ Aktiv</button>';
    html += '<button onclick="' + setFn + '(\'' + m.id + '\',\'beta\')" class="' + btnBase + ' ' + (currentStatus==='beta' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200') + '">🧪 Beta</button>';
    html += '<button onclick="' + setFn + '(\'' + m.id + '\',\'demo\')" class="' + btnBase + ' ' + (currentStatus==='demo' ? 'bg-orange-400 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200') + '">👁 Demo</button>';
    html += '<button onclick="' + setFn + '(\'' + m.id + '\',\'bald\')" class="' + btnBase + ' ' + (currentStatus==='bald' ? 'bg-gray-400 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200') + '">⏳ Bald</button>';
    html += '<button onclick="' + setFn + '(\'' + m.id + '\',\'inaktiv\')" class="' + btnBase + ' ' + (currentStatus==='inaktiv' ? 'bg-gray-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200') + '">✕ Aus</button>';
    html += '</div>';
    html += '</div>';

    // Expandable children
    if(hasChildren && isExpanded) {
        html += '<div class="ml-12 mt-3 mb-1 space-y-2">';
        if(hasTabs) {
            html += '<div class="text-[10px] font-bold text-gray-400 uppercase mb-1">Tabs</div>';
            MODULE_TABS[m.modul_key].forEach(function(tab) {
                var tabStatus = (cfg.tabs && cfg.tabs[tab.key]) || 'aktiv';
                html += '<div class="flex items-center justify-between py-1">';
                html += '<span class="text-xs text-gray-700">↳ ' + tab.label + '</span>';
                html += '<div class="flex items-center space-x-0.5 bg-gray-100 rounded p-0.5">';
                var tbtn = 'px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer';
                html += '<button onclick="' + setTabFn + '(\'' + m.modul_key + '\',\'' + tab.key + '\',\'aktiv\')" class="' + tbtn + ' ' + (tabStatus==='aktiv'?'bg-green-500 text-white':'text-gray-400 hover:bg-gray-200') + '">✓</button>';
                html += '<button onclick="' + setTabFn + '(\'' + m.modul_key + '\',\'' + tab.key + '\',\'beta\')" class="' + tbtn + ' ' + (tabStatus==='beta'?'bg-purple-500 text-white':'text-gray-400 hover:bg-gray-200') + '">🧪</button>';
                html += '<button onclick="' + setTabFn + '(\'' + m.modul_key + '\',\'' + tab.key + '\',\'demo\')" class="' + tbtn + ' ' + (tabStatus==='demo'?'bg-orange-400 text-white':'text-gray-400 hover:bg-gray-200') + '">👁</button>';
                html += '<button onclick="' + setTabFn + '(\'' + m.modul_key + '\',\'' + tab.key + '\',\'deaktiviert\')" class="' + tbtn + ' ' + (tabStatus==='inaktiv'?'bg-gray-500 text-white':'text-gray-400 hover:bg-gray-200') + '">✕</button>';
                html += '</div></div>';
            });
        }
        if(hasWidgets) {
            html += '<div class="text-[10px] font-bold text-gray-400 uppercase mb-1 mt-2">Widgets</div>';
            MODULE_WIDGETS[m.modul_key].forEach(function(w) {
                var wStatus = (cfg.widgets && cfg.widgets[w.key]) || 'aktiv';
                html += '<div class="flex items-center justify-between py-1">';
                html += '<span class="text-xs text-gray-700">↳ ' + w.label + '</span>';
                html += '<div class="flex items-center space-x-0.5 bg-gray-100 rounded p-0.5">';
                var wbtn = 'px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer';
                html += '<button onclick="' + setWidgetFn + '(\'' + m.modul_key + '\',\'' + w.key + '\',\'aktiv\')" class="' + wbtn + ' ' + (wStatus==='aktiv'?'bg-green-500 text-white':'text-gray-400 hover:bg-gray-200') + '">✓</button>';
                html += '<button onclick="' + setWidgetFn + '(\'' + m.modul_key + '\',\'' + w.key + '\',\'beta\')" class="' + wbtn + ' ' + (wStatus==='beta'?'bg-purple-500 text-white':'text-gray-400 hover:bg-gray-200') + '">🧪</button>';
                html += '<button onclick="' + setWidgetFn + '(\'' + m.modul_key + '\',\'' + w.key + '\',\'demo\')" class="' + wbtn + ' ' + (wStatus==='demo'?'bg-orange-400 text-white':'text-gray-400 hover:bg-gray-200') + '">👁</button>';
                html += '<button onclick="' + setWidgetFn + '(\'' + m.modul_key + '\',\'' + w.key + '\',\'deaktiviert\')" class="' + wbtn + ' ' + (wStatus==='inaktiv'?'bg-gray-500 text-white':'text-gray-400 hover:bg-gray-200') + '">✕</button>';
                html += '</div></div>';
            });
        }
        html += '</div>';
    }
    html += '</div>';
    return html;
}

export function toggleModuleExpand(key, ebene) {
    expandedModules[key] = !expandedModules[key];
    if(ebene === 'hq') renderHqModulStatusList();
    else renderModulStatusList();
}

// ═══ OFFICE-RÄUME ADMIN ═══
// Fully delegated to office-admin.js module — no duplicate code here
export async function renderOfficeRoomsAdmin() {
    // Delegated to office-admin.js module
    if(typeof window.officeRenderAdminDots === 'function') {
        await window.officeRenderAdminDots();
    }
}

// ═══ DEMO-MODUS KONFIGURATION ═══
export async function renderDemoModulList() {
    var container = document.getElementById('demoModulStatusList');
    if(!container) return;
    var MODULE_TABS = window._umState ? window._umState.MODULE_TABS : {};
    var MODULE_WIDGETS = window._umState ? window._umState.MODULE_WIDGETS : {};
    try {
        var resp = await _sb().from('modul_status').select('id, modul_key, modul_name, kategorie, demo_status, config').order('reihenfolge');
        if(resp.error) throw resp.error;
        var modules = resp.data || [];
        var icons = {startseite:'🏠',kalender:'📅',aufgaben:'📋',kommunikation:'💬',dashboards:'📊',allgemein:'🏢',verkauf:'📈',einkauf:'🛒',marketing:'📣',controlling:'📊',wissen:'📚',support:'🎫',ideenboard:'💡',shop:'🛍️',onboarding:'🎯',mitarbeiter:'👥',aktenschrank:'📁',entwicklung:'&lt;/&gt;',spiritus:'📝'};
        var katLabels = {basis:'Basis',dashboards:'Dashboards',fachbereiche:'Fachbereiche',tools:'Tools',hq:'HQ'};
        var lastKat = '';
        var html = '';
        modules.forEach(function(m) {
            if(m.kategorie !== lastKat) {
                lastKat = m.kategorie;
                html += '<div class="px-5 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">' + (katLabels[m.kategorie]||m.kategorie) + '</div>';
            }
            var ds = m.demo_status || 'demo';
            var hasTabs = MODULE_TABS[m.modul_key] && MODULE_TABS[m.modul_key].length > 0;
            var hasWidgets = MODULE_WIDGETS[m.modul_key] && MODULE_WIDGETS[m.modul_key].length > 0;
            var hasChildren = hasTabs || hasWidgets;
            var isExp = expandedModules['demo_'+m.modul_key] || false;

            html += '<div class="px-5 py-3 hover:bg-gray-50 transition">';
            html += '<div class="flex items-center justify-between">';
            html += '<div class="flex items-center space-x-3">';
            if(hasChildren) {
                html += '<button data-action="toggle-demo" data-key="' + m.modul_key + '" class="text-gray-400 hover:text-gray-700 text-sm" style="width:20px">' + (isExp?'▼':'▶') + '</button>';
            } else {
                html += '<span style="width:20px"></span>';
            }
            html += '<span class="text-xl">' + (icons[m.modul_key]||'📦') + '</span>';
            html += '<span class="font-semibold text-sm text-gray-800">' + m.modul_name + '</span>';
            if(hasTabs) html += '<span class="text-[10px] text-gray-400 ml-1">(' + MODULE_TABS[m.modul_key].length + ' Tabs)</span>';
            if(hasWidgets) html += '<span class="text-[10px] text-gray-400 ml-1">(' + MODULE_WIDGETS[m.modul_key].length + ' Widgets)</span>';
            html += '</div>';
            // Only Demo / Aus toggle
            html += '<div class="flex items-center space-x-1 bg-gray-100 rounded-lg p-0.5">';
            html += '<button data-action="set-demo" data-id="' + m.id + '" data-mk="' + m.modul_key + '" data-st="demo" class="px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition cursor-pointer ' + (ds!=='inaktiv'?'bg-orange-400 text-white shadow-sm':'text-gray-500 hover:bg-gray-200') + '">👁 Demo</button>';
            html += '<button data-action="set-demo" data-id="' + m.id + '" data-mk="' + m.modul_key + '" data-st="deaktiviert" class="px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition cursor-pointer ' + (ds==='inaktiv'?'bg-gray-500 text-white shadow-sm':'text-gray-500 hover:bg-gray-200') + '">✕ Aus</button>';
            html += '</div></div>';

            // Expandable tabs/widgets
            if(hasChildren && isExp) {
                var cfg = m.config || {};
                html += '<div class="ml-12 mt-3 mb-1 space-y-2">';
                if(hasTabs) {
                    html += '<div class="text-[10px] font-bold text-gray-400 uppercase mb-1">Tabs</div>';
                    MODULE_TABS[m.modul_key].forEach(function(tab) {
                        var ts = (cfg.demo_tabs && cfg.demo_tabs[tab.key]) || 'demo';
                        html += '<div class="flex items-center justify-between py-1">';
                        html += '<span class="text-xs text-gray-700">↳ ' + tab.label + '</span>';
                        html += '<div class="flex items-center space-x-0.5 bg-gray-100 rounded p-0.5">';
                        html += '<button data-action="set-demo-tab" data-mk="' + m.modul_key + '" data-tk="' + tab.key + '" data-st="demo" class="px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ' + (ts!=='inaktiv'?'bg-orange-400 text-white':'text-gray-400 hover:bg-gray-200') + '">👁</button>';
                        html += '<button data-action="set-demo-tab" data-mk="' + m.modul_key + '" data-tk="' + tab.key + '" data-st="deaktiviert" class="px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ' + (ts==='inaktiv'?'bg-gray-500 text-white':'text-gray-400 hover:bg-gray-200') + '">✕</button>';
                        html += '</div></div>';
                    });
                }
                if(hasWidgets) {
                    html += '<div class="text-[10px] font-bold text-gray-400 uppercase mb-1 mt-2">Widgets</div>';
                    MODULE_WIDGETS[m.modul_key].forEach(function(w) {
                        var ws = (cfg.demo_widgets && cfg.demo_widgets[w.key]) || 'demo';
                        html += '<div class="flex items-center justify-between py-1">';
                        html += '<span class="text-xs text-gray-700">↳ ' + w.label + '</span>';
                        html += '<div class="flex items-center space-x-0.5 bg-gray-100 rounded p-0.5">';
                        html += '<button data-action="set-demo-widget" data-mk="' + m.modul_key + '" data-wk="' + w.key + '" data-st="demo" class="px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ' + (ws!=='inaktiv'?'bg-orange-400 text-white':'text-gray-400 hover:bg-gray-200') + '">👁</button>';
                        html += '<button data-action="set-demo-widget" data-mk="' + m.modul_key + '" data-wk="' + w.key + '" data-st="deaktiviert" class="px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ' + (ws==='inaktiv'?'bg-gray-500 text-white':'text-gray-400 hover:bg-gray-200') + '">✕</button>';
                        html += '</div></div>';
                    });
                }
                html += '</div>';
            }
            html += '</div>';
        });
        container.innerHTML = html;

        // Event delegation for all buttons
        container.onclick = function(e) {
            var btn = e.target.closest('[data-action]');
            if(!btn) return;
            var action = btn.getAttribute('data-action');
            if(action === 'set-demo') {
                setDemoModulStatus(btn.getAttribute('data-id'), btn.getAttribute('data-mk'), btn.getAttribute('data-st'));
            } else if(action === 'toggle-demo') {
                var k = 'demo_' + btn.getAttribute('data-key');
                expandedModules[k] = !expandedModules[k];
                renderDemoModulList();
            } else if(action === 'set-demo-tab') {
                setDemoTabStatus(btn.getAttribute('data-mk'), btn.getAttribute('data-tk'), btn.getAttribute('data-st'));
            } else if(action === 'set-demo-widget') {
                setDemoWidgetStatus(btn.getAttribute('data-mk'), btn.getAttribute('data-wk'), btn.getAttribute('data-st'));
            }
        };
    } catch(err) { console.error('DemoModulList:', err); container.innerHTML = '<div class="p-4 text-center text-red-400">Fehler beim Laden</div>'; }
}

export async function setDemoModulStatus(id, modulKey, newStatus) {
    try {
        var resp = await _sb().from('modul_status').update({demo_status: newStatus}).eq('id', id);
        if(resp.error) throw resp.error;
        _showToast(modulKey + ' → ' + (newStatus==='inaktiv'?'Aus':'Demo'), 'success');
        renderDemoModulList();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

export async function setDemoTabStatus(modulKey, tabKey, newStatus) {
    try {
        var cfg = sbModulConfig[modulKey] || {};
        if(!cfg.demo_tabs) cfg.demo_tabs = {};
        cfg.demo_tabs[tabKey] = newStatus;
        var resp = await _sb().from('modul_status').update({config: cfg}).eq('modul_key', modulKey);
        if(resp.error) throw resp.error;
        sbModulConfig[modulKey] = cfg;
        renderDemoModulList();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

export async function setDemoWidgetStatus(modulKey, widgetKey, newStatus) {
    try {
        var cfg = sbModulConfig[modulKey] || {};
        if(!cfg.demo_widgets) cfg.demo_widgets = {};
        cfg.demo_widgets[widgetKey] = newStatus;
        var resp = await _sb().from('modul_status').update({config: cfg}).eq('modul_key', modulKey);
        if(resp.error) throw resp.error;
        sbModulConfig[modulKey] = cfg;
        renderDemoModulList();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

export async function setAllDemoStatus(newStatus) {
    try {
        var resp = await _sb().from('modul_status').update({demo_status: newStatus}).neq('modul_key', 'dummy');
        if(resp.error) throw resp.error;
        _showToast('Alle Module → ' + (newStatus==='inaktiv'?'Aus':'Demo'), 'success');
        renderDemoModulList();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

export async function setTabStatus(modulKey, tabKey, newStatus) {
    try {
        var cfg = sbModulConfig[modulKey] || {};
        if(!cfg.tabs) cfg.tabs = {};
        cfg.tabs[tabKey] = newStatus;
        var resp = await _sb().from('modul_status').update({config: cfg}).eq('modul_key', modulKey);
        if(resp.error) throw resp.error;
        sbModulConfig[modulKey] = cfg;
        renderModulStatusList();
        applyModulStatus();
    } catch(err) { console.error('setTabStatus:', err); }
}

export async function setWidgetStatus(modulKey, widgetKey, newStatus) {
    try {
        var cfg = sbModulConfig[modulKey] || {};
        if(!cfg.widgets) cfg.widgets = {};
        cfg.widgets[widgetKey] = newStatus;
        var resp = await _sb().from('modul_status').update({config: cfg}).eq('modul_key', modulKey);
        if(resp.error) throw resp.error;
        sbModulConfig[modulKey] = cfg;
        renderModulStatusList();
        applyModulStatus();
    } catch(err) { console.error('setWidgetStatus:', err); }
}

export async function setModulStatus(id, newStatus) {
    try {
        var resp = await _sb().from('modul_status').update({status: newStatus, updated_by: _sbUser() ? _sbUser().id : null}).eq('id', id);
        if(resp.error) throw resp.error;
        await loadModulStatus();
        renderModulStatusList();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

export async function setHqModulStatus(id, newStatus) {
    try {
        var resp = await _sb().from('modul_status').update({hq_status: newStatus, updated_by: _sbUser() ? _sbUser().id : null}).eq('id', id);
        if(resp.error) throw resp.error;
        await loadModulStatus();
        renderHqModulStatusList();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

export async function setHqTabStatus(modulKey, tabKey, newStatus) {
    try {
        var cfg = sbHqModulConfig[modulKey] || {};
        if(!cfg.tabs) cfg.tabs = {};
        cfg.tabs[tabKey] = newStatus;
        var resp = await _sb().from('modul_status').update({hq_config: cfg}).eq('modul_key', modulKey);
        if(resp.error) throw resp.error;
        sbHqModulConfig[modulKey] = cfg;
        renderHqModulStatusList();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

export async function setHqWidgetStatus(modulKey, widgetKey, newStatus) {
    try {
        var cfg = sbHqModulConfig[modulKey] || {};
        if(!cfg.widgets) cfg.widgets = {};
        cfg.widgets[widgetKey] = newStatus;
        var resp = await _sb().from('modul_status').update({hq_config: cfg}).eq('modul_key', modulKey);
        if(resp.error) throw resp.error;
        sbHqModulConfig[modulKey] = cfg;
        renderHqModulStatusList();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

export function renderHqEinstellungen() {
    var rolePermissions = window._umState ? window._umState.rolePermissions : (window.rolePermissions || {});
    // Modul-Status Tab rendern
    renderModulStatusList();

    // Load HQ permissions from DB (async, re-renders when done)
    if(!window._hqRechteMatrix) {
        loadHqRechteMatrix().then(function(){ renderHqEinstellungen(); });
        return;
    }

    // Rechte-Matrix rendern
    var modules = [
        {key:'home',label:'Startseite',icon:'🏠',core:true},
        {key:'kalender',label:'Kalender',icon:'📅',core:true},
        {key:'todo',label:'Aufgaben',icon:'📋',core:true},
        {key:'kommunikation',label:'Kommunikation',icon:'💬',core:true},
        {key:'dashboards',label:'Dashboards',icon:'📊',core:false},
        {key:'allgemein',label:'Allgemein',icon:'🏢',core:false},
        {key:'verkauf',label:'Verkauf',icon:'📈',core:false},
        {key:'einkauf',label:'Einkauf',icon:'🛒',core:false},
        {key:'marketing',label:'Marketing',icon:'📣',core:false},
        {key:'controlling',label:'Controlling',icon:'📊',core:false},
        {key:'wissen',label:'Wissen',icon:'📚',core:false},
        {key:'support',label:'Support',icon:'🎫',core:false},
        {key:'aktenschrank',label:'Aktenschrank',icon:'📁',core:false},
        {key:'entwicklung',label:'Entwicklung',icon:'💻',core:false},
        {key:'shop',label:'Shop',icon:'🛍️',core:false},
        {key:'onboarding',label:'Onboarding',icon:'🎯',core:false}
    ];
    var rollen = ['inhaber','verkauf','werkstatt','buchhaltung'];

    var body = document.getElementById('rechteMatrixBody');
    if(!body) return;
    var h = '';
    modules.forEach(function(mod){
        var perms = rolePermissions[mod.key] || ['alle'];
        var isCore = mod.core;
        h += '<tr class="border-t border-gray-100 '+(isCore?'bg-green-50':'hover:bg-gray-50')+'">';
        h += '<td class="px-4 py-2.5 font-semibold text-gray-700 text-xs">'+mod.icon+' '+mod.label;
        if(isCore) h += ' <span class="text-[9px] text-green-600 font-normal">(Basis)</span>';
        h += '</td>';
        rollen.forEach(function(r){
            var isAllowed = perms.indexOf('alle')>=0 || perms.indexOf(r)>=0;
            if(isCore) {
                h += '<td class="px-4 py-2.5 text-center"><span class="text-green-500 text-lg cursor-not-allowed" title="Basis-Modul – immer aktiv">✅</span></td>';
            } else {
                h += '<td class="px-4 py-2.5 text-center"><button onclick="togglePermission(\''+mod.key+'\',\''+r+'\')" class="text-lg transition hover:scale-125" title="Klicken zum Umschalten">'+(isAllowed?'✅':'❌')+'</button></td>';
            }
        });
        h += '</tr>';
    });
    body.innerHTML = h;

    // ═══ HQ RECHTE-MATRIX ═══
    var hqBody = document.getElementById('hqRechteMatrixBody');
    if(hqBody) renderHqRechteMatrixBody(hqBody);

    // Update MA count
    var kzMitarbeiter = window._umKzMitarbeiter || [];
    var cnt = document.getElementById('settingsMaCount');
    if(cnt) cnt.textContent = kzMitarbeiter.length;
}

export function togglePermission(modKey, rolle) {
    var rolePermissions = window._umState ? window._umState.rolePermissions : (window.rolePermissions || {});
    var perms = rolePermissions[modKey];
    if(!perms) { rolePermissions[modKey] = [rolle]; renderHqEinstellungen(); return; }

    // If currently 'alle', convert to explicit list minus this role
    if(perms.indexOf('alle')>=0) {
        rolePermissions[modKey] = ['inhaber','verkauf','werkstatt','buchhaltung'].filter(function(r){return r!==rolle;});
        renderHqEinstellungen();
        return;
    }

    var idx = perms.indexOf(rolle);
    if(idx>=0) {
        perms.splice(idx,1);
        if(perms.length===0) perms.push('inhaber'); // mindestens Inhaber
    } else {
        perms.push(rolle);
    }
    // If all 4 roles selected, simplify to 'alle'
    if(perms.length===4) rolePermissions[modKey] = ['alle'];
    renderHqEinstellungen();
    // Also update sidebar immediately if user is logged in
    try { updateUIForRole(); } catch(e){}
}

// ═══ HQ RECHTE-MATRIX: Render, Load & Toggle ═══
export function renderHqRechteMatrixBody(hqBody) {
    var hqModules = [
        {key:'hqCockpit',label:'Netzwerk-Cockpit',icon:'🌐',core:true},
        {key:'hqKalender',label:'Kalender',icon:'📅',core:true},
        {key:'hqAufgaben',label:'Aufgaben',icon:'📋',core:true},
        {key:'hqKommunikation',label:'Kommunikation',icon:'💬',core:true},
        {key:'hqOffice',label:'Office',icon:'🏢',core:true},
        {key:'hqStandorte',label:'Standorte',icon:'🏪',core:false},
        {key:'hqFinanzen',label:'Finanzen',icon:'💰',core:false},
        {key:'hqMarketing',label:'Marketing',icon:'📣',core:false},
        {key:'hqKampagnen',label:'Kampagnen',icon:'🎯',core:false},
        {key:'hqHandlungsbedarf',label:'Handlungsbedarf',icon:'🚨',core:false},
        {key:'hqKommandozentrale',label:'Kommandozentrale',icon:'⚙️',core:false},
        {key:'hqDokumente',label:'Dokumente',icon:'📄',core:false},
        {key:'hqPersonal',label:'Personal',icon:'👥',core:false},
        {key:'hqBilling',label:'Abrechnung',icon:'💳',core:false},
        {key:'hqAnalytics',label:'Portal-Analytics',icon:'📈',core:false},
        {key:'hqEinstellungen',label:'Einstellungen',icon:'⚙️',core:false},
        {key:'hqFeatureFlags',label:'Feature Flags',icon:'🚩',core:false},
        {key:'hqEntwicklung',label:'Entwicklung',icon:'💻',core:false}
    ];
    // Aktions-Berechtigungen (unterhalb der Module)
    var hqActions = [
        {key:'action_impersonate',label:'Anmelden als User',icon:'🔑',core:false},
        {key:'action_delete_user',label:'User löschen',icon:'🗑️',core:false},
        {key:'action_edit_user',label:'User bearbeiten',icon:'✏️',core:false},
        {key:'action_create_user',label:'User anlegen',icon:'➕',core:false},
        {key:'action_approve_user',label:'User freigeben',icon:'✅',core:false},
        {key:'action_create_standort',label:'Standort anlegen',icon:'🏪',core:false}
    ];
    var hqRollen = ['hq_gf','hq_sales','hq_marketing','hq_einkauf','hq_support','hq_akademie','hq_hr','hq_it'];
    var hqH = '';
    // Module
    hqModules.forEach(function(mod){
        var isCore = mod.core;
        hqH += '<tr class="border-t border-gray-100 '+(isCore?'bg-green-50':'hover:bg-gray-50')+'">';
        hqH += '<td class="px-4 py-2.5 font-semibold text-gray-700 text-xs">'+mod.icon+' '+mod.label;
        if(isCore) hqH += ' <span class="text-[9px] text-green-600 font-normal">(Basis)</span>';
        hqH += '</td>';
        hqRollen.forEach(function(r){
            var isGf = (r==='hq_gf');
            if(isCore || isGf) {
                hqH += '<td class="px-4 py-2.5 text-center"><span class="text-green-500 text-lg cursor-not-allowed" title="'+(isGf?'Vollzugriff (GF)':'Basis-Modul')+'">✅</span></td>';
            } else {
                var isAllowed = window._hqRechteMatrix && window._hqRechteMatrix[mod.key] && window._hqRechteMatrix[mod.key][r];
                hqH += '<td class="px-4 py-2.5 text-center"><button onclick="toggleHqPermission(\''+mod.key+'\',\''+r+'\')" class="text-lg transition hover:scale-125" title="Klicken zum Umschalten">'+(isAllowed?'✅':'❌')+'</button></td>';
            }
        });
        hqH += '</tr>';
    });
    // Separator
    hqH += '<tr class="bg-gray-100"><td colspan="9" class="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">⚡ Aktionen</td></tr>';
    // Aktions-Berechtigungen
    hqActions.forEach(function(act){
        hqH += '<tr class="border-t border-gray-100 hover:bg-orange-50/50">';
        hqH += '<td class="px-4 py-2.5 font-semibold text-gray-700 text-xs">'+act.icon+' '+act.label+'</td>';
        hqRollen.forEach(function(r){
            var isGf = (r==='hq_gf');
            if(isGf) {
                hqH += '<td class="px-4 py-2.5 text-center"><span class="text-green-500 text-lg cursor-not-allowed" title="Vollzugriff (GF)">✅</span></td>';
            } else {
                var isAllowed = window._hqRechteMatrix && window._hqRechteMatrix[act.key] && window._hqRechteMatrix[act.key][r];
                hqH += '<td class="px-4 py-2.5 text-center"><button onclick="toggleHqPermission(\''+act.key+'\',\''+r+'\')" class="text-lg transition hover:scale-125" title="Klicken zum Umschalten">'+(isAllowed?'✅':'❌')+'</button></td>';
            }
        });
        hqH += '</tr>';
    });
    hqBody.innerHTML = hqH;
}

export async function loadHqRechteMatrix() {
    try {
        var resp = await _sb().from('modul_berechtigungen').select('modul, hat_zugriff, rolle_id, rollen(name)').eq('hat_zugriff', true);
        if(resp.error) { console.error('[HQ Matrix] Load error:', resp.error); }
        window._hqRechteMatrix = {};
        (resp.data || []).forEach(function(p){
            var roleName = p.rollen ? p.rollen.name : null;
            if(!roleName || !roleName.startsWith('hq_')) return;
            if(!window._hqRechteMatrix[p.modul]) window._hqRechteMatrix[p.modul] = {};
            window._hqRechteMatrix[p.modul][roleName] = true;
        });
    } catch(e) { console.warn('loadHqRechteMatrix error:', e); window._hqRechteMatrix = {}; }
}

export async function toggleHqPermission(modKey, rolle) {
    if(_hqToggling) return;
    _hqToggling = true;
    try {
        var rolleResp = await _sb().from('rollen').select('id').eq('name', rolle).single();
        if(!rolleResp.data) { _showToast('Rolle nicht gefunden: ' + rolle, 'error'); _hqToggling=false; return; }
        if(rolleResp.error) { _showToast('DB-Fehler: ' + rolleResp.error.message, 'error'); _hqToggling=false; return; }
        var rolleId = rolleResp.data.id;
        var isCurrentlyAllowed = window._hqRechteMatrix && window._hqRechteMatrix[modKey] && window._hqRechteMatrix[modKey][rolle];
        if(isCurrentlyAllowed) {
            var delResp = await _sb().from('modul_berechtigungen').delete().eq('modul', modKey).eq('rolle_id', rolleId);
            if(delResp.error) { _showToast('Löschen fehlgeschlagen: ' + delResp.error.message, 'error'); _hqToggling=false; return; }
            if(window._hqRechteMatrix[modKey]) delete window._hqRechteMatrix[modKey][rolle];
            _showToast('❌ ' + modKey + ' → ' + rolle + ' entfernt', 'warning');
        } else {
            var insResp = await _sb().from('modul_berechtigungen').upsert({modul: modKey, rolle_id: rolleId, hat_zugriff: true}, {onConflict: 'modul,rolle_id'});
            if(insResp.error) { _showToast('Speichern fehlgeschlagen: ' + insResp.error.message, 'error'); _hqToggling=false; return; }
            if(!window._hqRechteMatrix[modKey]) window._hqRechteMatrix[modKey] = {};
            window._hqRechteMatrix[modKey][rolle] = true;
            _showToast('✅ ' + modKey + ' → ' + rolle + ' aktiviert', 'success');
        }
        // Re-render the matrix only (not full settings)
        var hqBody = document.getElementById('hqRechteMatrixBody');
        if(hqBody) renderHqRechteMatrixBody(hqBody);
    } catch(e) { console.error('[HQ Toggle Error]', e); _showToast('Fehler: ' + e.message, 'error'); }
    _hqToggling = false;
}

// Strangler Fig
const _exports = { showSettingsTab, renderModulStatusList, renderHqModulStatusList, _renderModulRow, toggleModuleExpand, renderOfficeRoomsAdmin, renderDemoModulList, setDemoModulStatus, setDemoTabStatus, setDemoWidgetStatus, setAllDemoStatus, setTabStatus, setWidgetStatus, setModulStatus, setHqModulStatus, setHqTabStatus, setHqWidgetStatus, renderHqEinstellungen, togglePermission, renderHqRechteMatrixBody, loadHqRechteMatrix, toggleHqPermission };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });

