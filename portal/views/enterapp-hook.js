// vit:bikes - App Entry Hook
// Migrated from inline/enterapp-hook.js

// Safe Helpers
function _sb()       { return window.sb; }
function _sbUser()   { return window.sbUser; }
function _sbProfile(){ return window.sbProfile; }
function _escH(s)    { return window.escH ? window.escH(s) : String(s); }
function _showToast(m,t){ if(window.showToast) window.showToast(m,t||'info'); }


// showView render triggers now handled by view-router.js module

// Auto-init for initial page load (homeView is display:block by default)
// Wait for enterApp() to finish, then render everything
var _baseEnterApp = window.enterApp;
if(_baseEnterApp) {
    window.enterApp = function() {
        _baseEnterApp();
        setTimeout(function(){
            if(typeof renderDailyFocus === 'function') renderDailyFocus();
            if(typeof renderHealthScore === 'function') renderHealthScore();
            if(typeof renderSalesMomentum === 'function') renderSalesMomentum();
            if(typeof updateBwaDeadlineWidget === 'function') updateBwaDeadlineWidget();
            if(typeof renderHqBwaStatus === 'function') renderHqBwaStatus();
            if(typeof renderHqHealth === 'function') renderHqHealth();
            // Trainer card after 4s (only for Standort users, not HQ)
            if(typeof showTrainerCard === 'function' && typeof activeTrainers !== 'undefined' && activeTrainers.length > 0 && currentRole !== 'hq') {
                setTimeout(function(){ showTrainerCard(activeTrainers[0]); }, 4000);
            }
        }, 500);
    };
}

// Fallback: also init after 1s in case enterApp is not called (direct page load)
setTimeout(function(){
    if(typeof renderDailyFocus === 'function') renderDailyFocus();
    if(typeof renderHealthScore === 'function') renderHealthScore();
}, 1000);

