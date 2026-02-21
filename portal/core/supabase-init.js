/**
 * core/supabase-init.js - Supabase Client Init
 * @module core/supabase-init
 */

// ============================================
// SUPABASE CLIENT
// ============================================
var SUPABASE_URL = 'https://lwwagbkxeofahhwebkab.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3d2FnYmt4ZW9mYWhod2Via2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTM3NDAsImV4cCI6MjA4NjU4OTc0MH0.YBKO7grysp8RHzGWA6xSGpTVi0wG2PmeEWJHI25f7ks';
// Robust session storage: localStorage + IndexedDB backup (iOS Safari fix)
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
            } catch(e) { resolve(null); }
        });
        return this._dbPromise;
    },
    setItem: function(key, val) {
        try { localStorage.setItem(key, val); } catch(e) {}
        this._getDB().then(function(db) {
            if(!db) return;
            try { var tx = db.transaction('session','readwrite'); tx.objectStore('session').put(val, key); } catch(e) {}
        });
    },
    getItem: function(key) {
        var lsVal = null;
        try { lsVal = localStorage.getItem(key); } catch(e) {}
        if(lsVal) return lsVal;
        // Fallback: try IndexedDB (sync wrapper - returns promise-like for supabase)
        return new Promise(function(resolve) {
            idbSessionStore._getDB().then(function(db) {
                if(!db) { resolve(null); return; }
                try {
                    var tx = db.transaction('session','readonly');
                    var req = tx.objectStore('session').get(key);
                    req.onsuccess = function() {
                        var val = req.result || null;
                        if(val) { try { localStorage.setItem(key, val); } catch(e) {} }
                        resolve(val);
                    };
                    req.onerror = function() { resolve(null); };
                } catch(e) { resolve(null); }
            });
        });
    },
    removeItem: function(key) {
        try { localStorage.removeItem(key); } catch(e) {}
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

// Keep session alive: listen for auth state changes and re-persist
sb.auth.onAuthStateChange(function(event, session) {
    console.log('[Auth] State:', event);
    if(session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        try { idbSessionStore.setItem('sb-lwwagbkxeofahhwebkab-auth-token', JSON.stringify(session)); } catch(e) {}
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


console.log("[supabase-init.js] Client ready");
