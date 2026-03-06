/**
 * core/supabase-init.js - Supabase Client Init
 * @module core/supabase-init
 */

// ============================================
// SUPABASE CLIENT
// ============================================
var SUPABASE_URL = window.VIT_CONFIG.SUPABASE_URL;
var SUPABASE_ANON_KEY = window.VIT_CONFIG.SUPABASE_ANON_KEY;
// Robust session storage: localStorage + IndexedDB + Cookie backup (iOS Safari fix)
var idbSessionStore = {
    _dbPromise: null,
    _getDB: function() {
        if(this._dbPromise) return this._dbPromise;
        this._dbPromise = new Promise(function(resolve, reject) {
            try {
                var req = indexedDB.open('vb_auth', 1);
                req.onupgradeneeded = function(e) { e.target.result.createObjectStore('session'); };
                req.onsuccess = function(e) { resolve(e.target.result); };
                req.onerror = function() { resolve(null); };
                // Timeout: IndexedDB can hang on iOS
                setTimeout(function() { resolve(null); }, 2000);
            } catch(e) { resolve(null); }
        });
        return this._dbPromise;
    },
    // Cookie helpers (365 days, SameSite=Lax, Secure)
    _setCookie: function(key, val) {
        try {
            var k = encodeURIComponent(key);
            // Only store refresh_token and access_token cookies (small enough)
            if(val && val.length > 4000) return; // skip huge values for cookie
            document.cookie = k + '=' + encodeURIComponent(val) + ';path=/;max-age=31536000;SameSite=Lax;Secure';
        } catch(e) {}
    },
    _getCookie: function(key) {
        try {
            var k = encodeURIComponent(key) + '=';
            var cookies = document.cookie.split(';');
            for(var i = 0; i < cookies.length; i++) {
                var c = cookies[i].trim();
                if(c.indexOf(k) === 0) return decodeURIComponent(c.substring(k.length));
            }
        } catch(e) {}
        return null;
    },
    _removeCookie: function(key) {
        try { document.cookie = encodeURIComponent(key) + '=;path=/;max-age=0;SameSite=Lax;Secure'; } catch(e) {}
    },
    setItem: function(key, val) {
        try { localStorage.setItem(key, val); } catch(e) {}
        this._setCookie(key, val);
        this._getDB().then(function(db) {
            if(!db) return;
            try { var tx = db.transaction('session','readwrite'); tx.objectStore('session').put(val, key); } catch(e) {}
        });
    },
    getItem: function(key) {
        // 1. Try localStorage (fastest, synchronous)
        var lsVal = null;
        try { lsVal = localStorage.getItem(key); } catch(e) {}
        if(lsVal) return lsVal;
        // 2. Try cookie (synchronous, survives iOS ITP)
        var cookieVal = this._getCookie(key);
        if(cookieVal) {
            // Re-hydrate localStorage from cookie
            try { localStorage.setItem(key, cookieVal); } catch(e) {}
            return cookieVal;
        }
        // 3. Fallback: IndexedDB (async – Supabase v2 supports Promise return)
        return new Promise(function(resolve) {
            idbSessionStore._getDB().then(function(db) {
                if(!db) { resolve(null); return; }
                try {
                    var tx = db.transaction('session','readonly');
                    var req = tx.objectStore('session').get(key);
                    req.onsuccess = function() {
                        var val = req.result || null;
                        if(val) {
                            try { localStorage.setItem(key, val); } catch(e) {}
                            idbSessionStore._setCookie(key, val);
                        }
                        resolve(val);
                    };
                    req.onerror = function() { resolve(null); };
                } catch(e) { resolve(null); }
            });
        });
    },
    removeItem: function(key) {
        try { localStorage.removeItem(key); } catch(e) {}
        this._removeCookie(key);
        this._getDB().then(function(db) {
            if(!db) return;
            try { var tx = db.transaction('session','readwrite'); tx.objectStore('session').delete(key); } catch(e) {}
        });
    }
};

var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: idbSessionStore
    }
});
window.sb = sb;

// Listen for auth state changes
// NOTE: Session persistence is handled automatically by Supabase via storage option.
// Previously, manual re-write here caused SIGNED_IN infinite loop.
var _sessionExpiredShown = false;
sb.auth.onAuthStateChange(function(event, session) {
    if(event === 'PASSWORD_RECOVERY') {
        // Wait for modules to be ready, then show modal
        function _showPwModal() {
            if(typeof window.showChangePasswordModal === 'function') {
                if(session && session.user) { window.sbUser = session.user; }
                window.showChangePasswordModal();
            } else {
                setTimeout(_showPwModal, 300);
            }
        }
        _showPwModal();
    }
    // Token refresh failed or user signed out unexpectedly → redirect to login
    if(event === 'SIGNED_OUT' && window.sbUser && !window.DEMO_ACTIVE && !window._impActive) {
        if(!_sessionExpiredShown) {
            _sessionExpiredShown = true;
            window.sbUser = null; window.sbProfile = null;
            if(typeof window.showToast === 'function') window.showToast('Sitzung abgelaufen – bitte erneut anmelden.', 'warning');
            setTimeout(function() {
                var login = document.getElementById('loginScreen');
                var main = document.getElementById('mainApp');
                if(login) login.style.display = 'flex';
                if(main) main.style.display = 'none';
                _sessionExpiredShown = false;
            }, 500);
        }
    }
});

// ═══ GLOBAL SESSION ERROR HANDLER ═══
// Views call this in catch blocks to detect auth errors and trigger re-login.
// Returns true if the error was a session error (caller should abort).
window.handleSupabaseError = function(error, context) {
    if(!error) return false;
    var msg = (error.message || error.msg || String(error)).toLowerCase();
    var code = error.code || '';
    var status = error.status || 0;
    var isAuthError = (
        msg.indexOf('jwt expired') !== -1 ||
        msg.indexOf('jwt') !== -1 && msg.indexOf('invalid') !== -1 ||
        msg.indexOf('session_not_found') !== -1 ||
        msg.indexOf('auth session missing') !== -1 ||
        msg.indexOf('not authenticated') !== -1 ||
        msg.indexOf('refresh_token') !== -1 && msg.indexOf('not found') !== -1 ||
        code === 'PGRST301' ||
        status === 401 || status === 403
    );
    if(isAuthError && !window.DEMO_ACTIVE && !window._impActive) {
        console.warn('[Session]', context || 'Supabase', '– Auth-Fehler:', msg);
        // Try to refresh the session first
        sb.auth.getSession().then(function(resp) {
            if(!resp.data.session) {
                // Session is truly gone – force logout
                if(typeof window.handleLogout === 'function') {
                    window.handleLogout();
                    if(typeof window.showToast === 'function') window.showToast('Sitzung abgelaufen – bitte erneut anmelden.', 'warning');
                }
            }
        }).catch(function() {
            if(typeof window.handleLogout === 'function') window.handleLogout();
        });
        return true;
    }
    return false;
};

// Auto-login: wait for all modules to be ready, then check session
window.addEventListener('vit:modules-ready', function() {
    if(typeof window.checkSession === 'function') {
        // [prod] log removed
        window.checkSession();
    }
});

var sbUser = null; // Supabase auth user
var sbProfile = null; // users table row
var sbRollen = []; // role names array
var sbStandort = null; // standorte row
var sbModulStatus = {}; // {modul_key: 'aktiv'|'demo'|'in_bearbeitung'|'deaktiviert'}
var sbHqModulStatus = {}; // {modul_key: 'aktiv'|'demo'|'in_bearbeitung'|'deaktiviert'} - HQ-Ebene
var sbHqModulConfig = {}; // HQ-spezifische Tab/Widget-Konfiguration
var sbModulEbene = {}; // {modul_key: 'partner'|'hq'|'beide'}
var sbFeatureFlags = {}; // {flag_key: {enabled, rollout_percent, target_roles, target_standorte, target_users, scope, metadata, expires_at}}

// ============================================
// FEATURE FLAGS CLIENT
// ============================================


// [prod] log removed

// Expose bereits in config.js gesetzt (window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
