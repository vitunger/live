/**
 * views/strategie.js - Orchestrator: Kommandozentrale, showView, HQ Drill-Down, File Upload
 * Sub-modules: strategie-i18n, strategie-shop, strategie-content, strategie-onboarding
 * @module views/strategie
 */
var PORTAL_VERSION = window.PORTAL_VERSION || '7.2';

function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

export function renderKommandozentrale() {
    renderKzStandorte();
    renderKzMitarbeiter();
}

// ========== HQ DRILL-DOWN: Switch to Partner view for a specific location ==========
export function hqDrillDown(locationKey) {
    // Switch to partner mode for that location
    var sel = document.getElementById('viewModeSwitch');
    if(sel) {
        // Find matching option
        var opts = sel.options;
        for(var i=0; i<opts.length; i++) {
            if(opts[i].value.indexOf(locationKey) > -1) {
                sel.value = opts[i].value;
                switchViewMode(opts[i].value);
                return;
            }
        }
    }
    // Fallback
    switchViewMode('partner_grafrath');
}

export function handleFileUpload(input) {
    if(input.files && input.files[0]) {
        var name = input.files[0].name;
        var size = (input.files[0].size/1024).toFixed(1);
        var parent = input.closest('[onclick]') || input.parentElement;
        if(parent) {
            var origHTML = parent.innerHTML;
            parent.innerHTML = '<div class="py-4"><p class="text-green-600 font-semibold text-sm">✅ '+_escH(name)+'</p><p class="text-xs text-gray-400">'+size+' KB hochgeladen</p></div>';
        }
    }
}

export function showView(viewName) {
    // Check module status - block 'in_bearbeitung' (bald) and 'deaktiviert' modules
    var moduleStatusMap = {verkauf:'verkauf',controlling:'controlling',marketing:'marketing',werkstatt:'werkstatt',personal:'personal',office:'office',kalender:'kalender',nachrichten:'nachrichten',wissen:'wissen',support:'support',einkauf:'einkauf',dashboards:'dashboards',allgemein:'allgemein',shop:'shop',aktenschrank:'aktenschrank',mitarbeiter:'mitarbeiter',todo:'todo'};
    var moduleKey = moduleStatusMap[viewName];
    var _modulStatus = window.sbModulStatus || {};
    if(moduleKey) {
        var mStatus = _modulStatus[moduleKey];
        // Only block if status is explicitly set to blocked values
        // Don't block when status map is empty (not loaded yet)
        var statusLoaded = Object.keys(_modulStatus).length > 0;
        if(statusLoaded && (!mStatus || mStatus === 'in_bearbeitung' || mStatus === 'deaktiviert')) {
            if(typeof window._showToast === 'function') window._showToast('Dieses Modul ist noch nicht verf\u00fcgbar (' + (mStatus === 'in_bearbeitung' ? 'Kommt bald' : mStatus === 'deaktiviert' ? 'Deaktiviert' : 'Nicht konfiguriert') + ')', 'info');
            else _showToast('Dieses Modul ist noch nicht verfügbar','warning');
            return;
        }
        // Beta check: only HQ or assigned beta users may access
        if(statusLoaded && mStatus === 'beta') {
            var isHqUser = (window.sbProfile && window.sbProfile.is_hq) || (window.currentRoles && window.currentRoles.indexOf('hq') !== -1);
            if(!isHqUser && !window._isBetaUser) {
                if(typeof window._showToast === 'function') window._showToast('Dieses Modul ist in der Beta-Phase. Zugang nur f\u00fcr freigeschaltete Tester.', 'info');
                return;
            }
        }
    }

    // Verstecke ALLE Views automatisch (per Klasse statt hardcoded Liste)
    var allViews = document.querySelectorAll('.view');
    for(var i = 0; i < allViews.length; i++) {
        allViews[i].style.display = 'none';
    }

    // Zeige gewählte View
    var viewId = viewName + 'View';
    var viewEl = document.getElementById(viewId);
    if(viewEl) {
        viewEl.style.display = 'block';
        if(viewName === 'dashboards') initDashboardTabs();
        if(viewName === 'aktenschrank') { if(window.loadAktenschrank) window.loadAktenschrank(); else setTimeout(function(){ if(window.loadAktenschrank) window.loadAktenschrank(); }, 500); }
        if(viewName === 'hqFeatureFlags') { showView('entwicklung'); setTimeout(function(){showEntwicklungTab('flags')},50); return; }
        if(viewName === 'hqBackups') { showView('entwicklung'); setTimeout(function(){showEntwicklungTab('system')},50); return; }

        // Version badge anzeigen
        showModuleVersionBadge(viewName + 'View');
        // Apply runtime translation if non-DE
        if(typeof window.t === 'function' && document.documentElement.lang !== 'de') setTimeout(function(){ if(typeof window.translateDOM === 'function') window.translateDOM(document.documentElement.lang); }, 100);
        // Apply dark mode to dynamically loaded content
        if(document.body.classList.contains('dark')) {
            setTimeout(function(){ applyDarkModeInlineStyles(true); }, 150);
            setTimeout(function(){ applyDarkModeInlineStyles(true); }, 600);
        }

        // Merke aktuelle View für Reload-Persistence
        try { localStorage.setItem('vit:lastView', viewName); } catch(e) {}

        // Fire event so modules can react to view changes
        // This replaces fragile showView wrapper chains
        window.dispatchEvent(new CustomEvent('vit:view-changed', {
            detail: { view: viewName, element: viewEl }
        }));
    } else {
        console.error('FAILED: View not found:', viewId);
    }
}

export function showModuleVersionBadge(viewId) {
    var old = document.getElementById('moduleVersionBadge');
    if(old) old.remove();
    var badge = document.createElement('div');
    badge.id = 'moduleVersionBadge';
    badge.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:50;background:rgba(255,255,255,0.9);border:1px solid var(--c-border);border-radius:6px;padding:2px 8px;font-size:10px;color:var(--c-muted);font-family:monospace;pointer-events:none;backdrop-filter:blur(4px);';
    badge.textContent = 'v' + PORTAL_VERSION;
    document.body.appendChild(badge);
}

// Strangler Fig
const _exports = { renderKommandozentrale, hqDrillDown, handleFileUpload, showView, showModuleVersionBadge };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
window.PORTAL_VERSION = PORTAL_VERSION;
