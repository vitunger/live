/**
 * core/supabase-init.js - Supabase Client Init
 * @module core/supabase-init
 */

// ============================================
// SUPABASE CLIENT
// ============================================
var SUPABASE_URL = 'https://lwwagbkxeofahhwebkab.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3d2FnYmt4ZW9mYWhod2Via2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTM3NDAsImV4cCI6MjA4NjU4OTc0MH0.YBKO7grysp8RHzGWA6xSGpTVi0wG2PmeEWJHI25f7ks';
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

// Listen for auth state changes (logging only)
// NOTE: Session persistence is handled automatically by Supabase via storage option.
// Previously, manual re-write here caused SIGNED_IN infinite loop.
sb.auth.onAuthStateChange(function(event, session) {
    // [prod] log removed
    if(event === 'PASSWORD_RECOVERY') {
        // [prod] log removed
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
});

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

// Expose for cross-module access (ES module scope isolation)
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
