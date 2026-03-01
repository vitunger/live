/**
 * app.js - vit:bikes Partner Portal Module Loader
 * 
 * Master orchestrator that loads all ES modules via dynamic import().
 * Uses Strangler Fig pattern: each module registers its exports on window.*
 * so existing onclick="" handlers continue to work.
 *
 * Usage in index.html:
 *   <script type="module" src="/portal/app.js"></script>
 *
 * @module app
 */

const MODULE_BASE = '/portal';
const CACHE_BUST = "?v=1772385557";

// ── Core modules (load order matters) ──
const CORE_MODULES = [
    'core/globals.js',
    'core/supabase-init.js',
    'core/router.js',
];

// ── View modules (load in parallel after core) ──
const VIEW_MODULES = [
    // Basis
    'views/home.js',
    'views/todo.js',
    'views/kalender.js',
    'views/kommunikation.js',
    'views/notifications.js',
    
    // Business
    'views/verkauf.js',
    'views/einkauf.js',
    'views/controlling.js',
    'views/support.js',
    'views/allgemein.js',
    'views/plan-ist.js',
    'views/wissen.js',
    'views/aktenschrank.js',
    
    // HQ
    'views/hq-cockpit.js',
    'views/hq-verkauf.js',
    'views/hq-finanzen.js',
    'views/hq-kommando.js',
    'views/hq-billing.js',
    'views/hq-feedback.js',
    
    // Systems
    'views/auth-system.js',
    'views/user-management.js',
    'views/feature-flags-full.js',
    'views/cockpit-engine.js',
    'views/email-billing.js',
    'views/standort-billing.js',
    'views/trainer-system.js',
    
    // Specialized
    'views/dev-pipeline.js',
    'views/strategie.js',
    'views/profile-theme.js',
    'views/perf-cockpit.js',
    'views/onboarding-demo.js',
    'views/office.js',
    'views/wawi-integration.js',
    'views/schnittstellen.js',
    'views/video-pipeline.js',
    'views/feedback-widget.js',
    'views/misc-views.js',
    
    // Central render router - MUST be last (listens for vit:view-changed events)
    'views/view-router.js',
    
    // React (JSX - loaded separately)
    // 'views/react-components.js',  // Requires Babel/JSX transform
];

// ── Module Loader ──
async function loadModules() {
    const t0 = performance.now();
    let loaded = 0;
    let failed = 0;

    // Phase 1: Core (sequential - order matters)
    for (const mod of CORE_MODULES) {
        try {
            await import(`${MODULE_BASE}/${mod}${CACHE_BUST}`);
            loaded++;
        } catch (e) {
            console.error(`[app.js] ❌ Core module failed: ${mod}`, e.message);
            failed++;
        }
    }
    // [prod] log removed

    // Phase 2: Views (parallel - independent modules)
    const results = await Promise.allSettled(
        VIEW_MODULES.map(mod => 
            import(`${MODULE_BASE}/${mod}${CACHE_BUST}`)
                .then(() => { loaded++; })
                .catch(e => {
                    console.error(`[app.js] ❌ ${mod}:`, e.message);
                    failed++;
                })
        )
    );

    const dt = (performance.now() - t0).toFixed(0);
    // [prod] log removed
    
    // Signal that all modules are ready
    window.dispatchEvent(new CustomEvent('vit:modules-ready', { 
        detail: { loaded, failed, time: dt } 
    }));
}

// ── Boot ──
loadModules();
/* pro deploy 1772294969 */
