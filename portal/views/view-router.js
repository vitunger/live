/**
 * views/view-router.js - Central View Render Router
 * 
 * Listens for 'vit:view-changed' events fired by showView() in strategie.js
 * and triggers the appropriate render functions for each view.
 *
 * This replaces the fragile showView wrapper chain pattern where multiple 
 * modules tried to wrap showView via local variables that never reached 
 * window.showView (because strategie.js overwrites it when registering exports).
 *
 * Architecture:
 *   strategie.js showView() → fires 'vit:view-changed' event
 *   view-router.js          → listens, calls window.renderHqCockpit() etc.
 *   hq-cockpit.js           → registers window.renderHqCockpit via exports
 *
 * To add a new view trigger: add an entry to VIEW_RENDER_MAP below.
 * No more wrapper chains needed.
 *
 * @module views/view-router
 */

// ── Render Map ──
// Maps view names to their render functions and init calls.
// Each entry: viewName → { fn: 'functionName', args?: [...], chain?: [{fn, args}] }
// 'fn' is looked up on window.* at call time (lazy binding).
const VIEW_RENDER_MAP = {
    // === HQ Views ===
    'hqCockpit':     { fn: 'renderHqCockpit' },
    'hqStandorte':   { fn: 'renderHqStandorte' },
    'hqFinanzen':    { fn: 'renderHqFinanzen' },
    'hqMarketing':   { fn: 'renderHqMarketing', chain: [{ fn: 'showHqMktTab', args: ['uebersicht'] }] },
    'hqVerkauf':     { fn: 'renderHqVerkauf' },
    'hqAuswertung':  { fn: 'renderHqAuswertung' },
    'hqWissen':      { fn: 'renderHqWissen' },
    'hqSupport':     { fn: 'renderHqSupport' },
    'hqShop':        { fn: 'renderHqShop' },
    'hqAktionen':    { fn: 'renderHqAktionen' },
    'hqEinkauf':     { fn: 'showHqEkTab', args: ['dash'] },
    'hqAllgemein':   { fn: 'renderHqAllgemein', args: [] },  // args filled dynamically
    'hqKommando':    { fn: 'renderKommandozentrale' },
    'hqEinstellungen': { fn: 'renderHqEinstellungen' },
    'hqBilling':     { fn: 'initBillingModule', chain: [{ fn: 'initBillingMonthSelect' }, { fn: 'loadBillingOverview' }, { fn: 'showBillingTab', args: ['overview'] }] },
    
    // === Standort Views ===
    'allgemein':     { fn: 'loadAllgemeinData', async: true, chain: [{ fn: 'showAllgemeinTab', args: ['uebersicht'] }] },
    'home':          { fn: 'loadDashboardWidgets', chain: [{ fn: 'loadAllgemeinData' }] },
    'einkauf':       { fn: 'showEinkaufTab', args: ['sortiment'] },
    'controlling':   { fn: 'showControllingTab', args: ['cockpit'], chain: [{ fn: 'renderPerformanceCockpit' }, { fn: 'loadBwaList' }] },
    'verkauf':       { fn: 'showVerkaufTab', args: ['pipeline'] },
    'kommunikation': { fn: 'showKommTab', args: ['chat'] },
    'aktenschrank':  { fn: 'loadAktenschrank' },
    'kalender':      { fn: 'loadKalTermine' },
    'todo':          { fn: 'loadTodos' },
    'notifications': { fn: 'renderNotifications', args: ['all'] },
    'mitarbeiter':   { fn: 'renderPartnerMitarbeiter' },
    'standortBilling': { fn: 'initStandortBilling', chain: [{ fn: 'loadStandortInvoices' }, { fn: 'showStBillingTab', args: ['invoices'] }] },
    
    // === Special Views ===
    'externHome':    { fn: 'renderExternHome' },
    'onboarding':    { fn: 'renderOnboardingView' },
    'hqOnboarding':  { fn: 'renderHqOnboarding' },
    
    // === React/Office Views ===
    'hqOffice':      { fn: '_mountVitSpaceOffice', delay: 150 },
    
    // From allgemein.js wrapper
    'support':       { fn: 'renderTickets', args: ['all'], chain: [{ fn: 'renderKontakte' }] },
    'entwicklung':   { fn: 'renderEntwicklung' },
    'wissen':        { fn: 'renderWissenGlobal' },
    'shop':          { fn: 'renderShop', before: function() { window.shopAllProducts = []; window.shopVariants = {}; } },
};

// ── Redirect Map ──
// Views that should redirect to another view (with optional tab activation)
const VIEW_REDIRECTS = {
    'hqKomm':       { target: 'hqKommando', tab: { fn: 'showKommandoTab', args: ['kommunikation'] } },
    'hqKampagnen':  { target: 'hqKommando', tab: { fn: 'showKommandoTab', args: ['kampagnen'] } },
    'hqDokumente':  { target: 'hqKommando', tab: { fn: 'showKommandoTab', args: ['dokumente'] } },
    'hqKalender':   { target: 'hqKommando', tab: { fn: 'showKommandoTab', args: ['kalender'] } },
    'hqAufgaben':   { target: 'hqKommando', tab: { fn: 'showKommandoTab', args: ['aufgaben'] } },
    'devStatus':    { target: 'entwicklung', tab: { fn: 'showEntwicklungTab', args: ['module'] } },
};

// ── Core Logic ──

function callWindowFn(name, args) {
    if (typeof window[name] === 'function') {
        return window[name].apply(null, args || []);
    }
    return null;
}

function handleViewChanged(event) {
    var viewName = event.detail && event.detail.view;
    if (!viewName) return;
    
    // Check render map
    var config = VIEW_RENDER_MAP[viewName];
    if (config) {
        try {
            // Pre-render setup (e.g. resetting arrays)
            if (config.before && typeof config.before === 'function') {
                config.before();
            }
            
            if (config.delay) {
                setTimeout(function() { callWindowFn(config.fn, config.args); }, config.delay);
            } else if (config.async) {
                var result = callWindowFn(config.fn, config.args);
                if (result && typeof result.then === 'function' && config.chain) {
                    result.then(function() {
                        config.chain.forEach(function(c) { callWindowFn(c.fn, c.args); });
                    });
                    return; // chain handled by promise
                }
            } else {
                callWindowFn(config.fn, config.args);
            }
            
            // Execute chain (non-async)
            if (config.chain && !config.async) {
                config.chain.forEach(function(c) { callWindowFn(c.fn, c.args); });
            }
        } catch (err) {
            console.warn('[view-router]', viewName, err.message);
        }
    }
}

// ── Redirect Interceptor ──
// Wraps showView to handle redirects before the base function runs
function installRedirectInterceptor() {
    var _baseShowView = window.showView;
    if (!_baseShowView || _baseShowView._hasRedirects) return;
    
    window.showView = function(v) {
        // Access check (skip if auth not yet loaded or during view restoration)
        if (typeof window.hasAccess === 'function' && window.currentRole && !window._vitRestoringView && !window.hasAccess(v)) {
            alert('Kein Zugriff auf diesen Bereich mit deiner aktuellen Rolle.');
            return;
        }
        
        // Persist current view for reload restoration (skip during switchViewMode)
        if(!window._vitRestoringView) { try { localStorage.setItem('vit_lastView', v); } catch(e) {} }
        
        // Role-based redirects
        if (v === 'home' && window.currentRole === 'hq') v = 'hqCockpit';
        if (v === 'home' && window.SESSION && window.SESSION.account_level === 'extern') v = 'externHome';
        
        // View redirects (hqKomm → hqKommando etc.)
        var redirect = VIEW_REDIRECTS[v];
        if (redirect) {
            _baseShowView(redirect.target);
            if (redirect.tab) {
                setTimeout(function() { callWindowFn(redirect.tab.fn, redirect.tab.args); }, 50);
            }
            return;
        }
        
        _baseShowView(v);
    };
    window.showView._hasRedirects = true;
}

// ── Supplementary Render Hooks (from Unified View Dispatcher) ──
// These are additional renders that run with a slight delay after the primary render
window.addEventListener('vit:view-changed', function(event) {
    var v = event.detail && event.detail.view;
    if (!v) return;
    setTimeout(function() {
        try {
            if ((v === 'home' || v === 'startseite') && window.renderDailyFocus) { window.renderDailyFocus(); }
            if (v === 'verkauf' && window.renderSalesMomentum) window.renderSalesMomentum();
            if (v === 'controlling' && window.updateBwaDeadlineWidget) window.updateBwaDeadlineWidget();
            // hqFinanzen BWA status is now rendered via tab system in showHqFinTab
            if (v === 'hqCockpit') { /* trainer/health hooks removed */ }
            // Re-apply tab-level visibility after any view renders
            if (window.applyModulStatus) window.applyModulStatus();
        } catch(e) { console.warn('[view-router] supplementary render:', e.message); }
    }, 150);
});

// ── Setup ──

// Listen for view changes
window.addEventListener('vit:view-changed', handleViewChanged);

// Install redirect interceptor after all modules are ready
window.addEventListener('vit:modules-ready', function() {
    installRedirectInterceptor();
    
    // If a view is already shown (initial load), trigger its render
    var cockpitEl = document.getElementById('hqCockpitView');
    if (cockpitEl && cockpitEl.style.display === 'block' && window.renderHqCockpit) {
        console.log('[view-router] Late init: triggering hqCockpit render');
        window.renderHqCockpit();
    }
    
    console.log('[view-router] ✅ Redirect interceptor installed');
});

// Also handle mobile sidebar close
window.addEventListener('vit:view-changed', function() {
    if (typeof window.closeMobileSidebar === 'function') {
        window.closeMobileSidebar();
    }
});

// ── Exports ──
const _exports = { VIEW_RENDER_MAP, VIEW_REDIRECTS };
Object.entries(_exports).forEach(([k, v]) => { window[k] = v; });
console.log('[view-router.js] Module loaded - central render router active');
