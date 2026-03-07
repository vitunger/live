/**
 * core/globals.js - Global Helpers (showToast, escH, fmtN, fmtEur, fmtDate, timeAgo, theme)
 * @module core/globals
 */

// === GLOBAL TOAST NOTIFICATION ===
window.showToast = function(message, type) {
type = type || 'info';
var colors = {success:'#16a34a',error:'#ef4444',warning:'#f59e0b',info:'#3b82f6'};
var icons = {success:'[OK]',error:'[ERR]',warning:'[WARN]',info:'[INFO]'};
var bg = colors[type] || colors.info;
var icon = icons[type] || '';
var t = document.createElement('div');
t.style.cssText = 'position:fixed;top:16px;right:16px;z-index:99999;padding:12px 20px;border-radius:10px;background:'+bg+';color:white;font-size:13px;font-weight:600;font-family:Outfit,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.2);opacity:0;transition:opacity 0.3s;max-width:400px;';
t.textContent = icon + ' ' + message;
document.body.appendChild(t);
requestAnimationFrame(function(){t.style.opacity='1';});
setTimeout(function(){t.style.opacity='0';setTimeout(function(){t.remove();},300);},3500);
};


export function escH(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
export function fmtN(n) { return (!n && n !== 0) ? '0' : Number(n).toLocaleString('de-DE'); }

window.escH = escH;
window.fmtN = fmtN;

// === SHARED FORMATTING UTILS ===
export function fmtEur(n) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0); }
export function fmtDate(d) { if (!d) return '-'; try { return new Date(d).toLocaleDateString('de-DE'); } catch(e) { return '-'; } }
export function timeAgo(d) {
    if (!d) return '-';
    var dt = (d instanceof Date) ? d : new Date(d);
    var s = Math.floor((Date.now() - dt.getTime()) / 1000);
    if (s < 60) return 'gerade eben';
    if (s < 3600) return 'vor ' + Math.floor(s/60) + ' Min.';
    if (s < 86400) return 'vor ' + Math.floor(s/3600) + ' Std.';
    return 'vor ' + Math.floor(s/86400) + ' Tagen';
}

window.fmtEur = fmtEur;
window.fmtDate = fmtDate;
window.timeAgo = timeAgo;
// [prod] log removed

// === SCOPED QUERY HELPER ===
// Defense-in-depth: auto-applies .eq('standort_id', ...) for non-HQ users.
// Use instead of _sb().from(table).select(...) for any standort-scoped table.
// During impersonation auth.uid() is still HQ -> RLS alone is NOT enough.
//
// Usage:  const q = _scopedQuery('leads').select('*').order('created_at', {ascending:false});
//         const q = _scopedQuery('todos', { forceStandort: someId }).select('*');
//         const q = _scopedQuery('leads', { skipScope: true }).select('*'); // explicit opt-out (HQ dashboards)
//
export function scopedQuery(table, opts) {
    var sb = window.sb;
    if (!sb) { console.error('[scopedQuery] Supabase client not ready'); return null; }
    var q = sb.from(table);
    var skip = opts && opts.skipScope;
    var forceId = opts && opts.forceStandort;
    if (skip) return q;
    if (forceId) return q.eq('standort_id', forceId);
    var prof = window.sbProfile;
    if (prof && !prof.is_hq && prof.standort_id) {
        q = q.eq('standort_id', prof.standort_id);
    }
    return q;
}
window._scopedQuery = scopedQuery;

// === AUDIT LOG HELPER ===
// Schreibt eine Nutzer-Aktion in die audit_log Tabelle.
// Feuert-und-vergisst: Fehler werden nur gewarnt, nie geworfen.
// Verwendung: window.logAudit('bwa_upload', 'controlling', { datei: 'bwa_jan.pdf' })
window.logAudit = async function(aktion, modul, details) {
    try {
        var sb = window.sb;
        var user = window.sbUser;
        var prof = window.sbProfile;
        if (!sb || !user) return; // Nicht eingeloggt -> skip
        // Anreichern mit Browser-Kontext
        var enriched = Object.assign({
            _ua: (navigator.userAgent || '').substring(0, 80),
            _url: (window.location.pathname + window.location.search).substring(0, 120)
        }, details || {});
        await sb.from('audit_log').insert({
            user_id:     user.id,
            standort_id: prof ? prof.standort_id : null,
            aktion:      aktion,
            modul:       modul || null,
            details:     enriched,
            ip_hint:     (document.cookie.match(/cf_ip=([^;]+)/) || [])[1] || null
        });
    } catch(e) {
        // Nie werfen - Audit darf nie eine Nutzer-Aktion blockieren
        console.warn('[logAudit] Fehler:', e && e.message);
    }
};

// Globaler Fehler-Handler - loggt JS-Fehler ins Audit-Log (gedrosselt, max 1/5s)
(function() {
    var _lastErrTs = 0;
    var _errCount = 0;
    var _THROTTLE_MS = 3000; // max 1 Eintrag pro 3s pro Typ
    var _lastWarnTs = 0;

    function _fmtArgs(args) {
        return Array.from(args).map(function(a) {
            if (a instanceof Error) return a.message + (a.stack ? '\n' + a.stack.split('\n')[1] : '');
            if (typeof a === 'object') { try { return JSON.stringify(a).substring(0, 150); } catch(e) { return String(a); } }
            return String(a);
        }).join(' ').substring(0, 300);
    }

    // window.onerror + unhandledrejection (echte JS-Laufzeitfehler)
    window.addEventListener('error', function(e) {
        var now = Date.now();
        if (now - _lastErrTs < _THROTTLE_MS) return;
        _lastErrTs = now;
        window.logAudit && window.logAudit('js_fehler', 'system', {
            meldung: (e.message || '').substring(0, 200),
            datei: (e.filename || '').replace(window.location.origin, '').substring(0, 100) + ':' + (e.lineno || ''),
        });
    });
    window.addEventListener('unhandledrejection', function(e) {
        var now = Date.now();
        if (now - _lastErrTs < _THROTTLE_MS) return;
        _lastErrTs = now;
        var reason = e.reason;
        window.logAudit && window.logAudit('js_fehler', 'system', {
            meldung: 'Unhandled Promise rejection',
            detail: reason && reason.message ? reason.message.substring(0, 200) : String(reason).substring(0, 200)
        });
    });

    // console.error patchen - faengt alle expliziten Fehleraufrufe
    var _origError = console.error.bind(console);
    console.error = function() {
        _origError.apply(console, arguments); // Original weiterhin ausgeben
        var now = Date.now();
        if (now - _lastErrTs < _THROTTLE_MS) return;
        _lastErrTs = now;
        _errCount++;
        window.logAudit && window.logAudit('console_error', 'system', {
            meldung: _fmtArgs(arguments),
            nr: _errCount
        });
    };

    // console.warn patchen - faengt Warnungen (Supabase-Fehler, RLS etc.)
    var _origWarn = console.warn.bind(console);
    console.warn = function() {
        _origWarn.apply(console, arguments); // Original weiterhin ausgeben
        var now = Date.now();
        if (now - _lastWarnTs < _THROTTLE_MS) return;
        // Harmlose Warns filtern
        var msg = _fmtArgs(arguments);
        if (msg.indexOf('[logAudit]') !== -1) return; // Endlosschleife verhindern
        if (msg.indexOf('ResizeObserver') !== -1) return; // Browser-Rauschen
        if (msg.indexOf('non-passive') !== -1) return;
        _lastWarnTs = now;
        window.logAudit && window.logAudit('console_warn', 'system', {
            meldung: msg
        });
    };
})();
