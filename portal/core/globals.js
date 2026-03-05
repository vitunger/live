/**
 * core/globals.js - Global Helpers (showToast, escH, fmtN, fmtEur, fmtDate, timeAgo, theme)
 * @module core/globals
 */

// ═══ GLOBAL TOAST NOTIFICATION ═══
window.showToast = function(message, type) {
type = type || 'info';
var colors = {success:'#16a34a',error:'#ef4444',warning:'#f59e0b',info:'#3b82f6'};
var icons = {success:'✅',error:'❌',warning:'⚠️',info:'ℹ️'};
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

// ═══ SHARED FORMATTING UTILS ═══
export function fmtEur(n) { return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0); }
export function fmtDate(d) { if (!d) return '–'; try { return new Date(d).toLocaleDateString('de-DE'); } catch(e) { return '–'; } }
export function timeAgo(d) {
    if (!d) return '—';
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

// ═══ SCOPED QUERY HELPER ═══
// Defense-in-depth: auto-applies .eq('standort_id', ...) for non-HQ users.
// Use instead of _sb().from(table).select(...) for any standort-scoped table.
// During impersonation auth.uid() is still HQ → RLS alone is NOT enough.
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

// ═══ AUDIT LOG HELPER ═══
// Schreibt eine Nutzer-Aktion in die audit_log Tabelle.
// Feuert-und-vergisst: Fehler werden nur gewarnt, nie geworfen.
// Verwendung: window.logAudit('bwa_upload', 'controlling', { datei: 'bwa_jan.pdf' })
window.logAudit = async function(aktion, modul, details) {
    try {
        var sb = window.sb;
        var user = window.sbUser;
        var prof = window.sbProfile;
        if (!sb || !user) return; // Nicht eingeloggt → skip
        await sb.from('audit_log').insert({
            user_id:     user.id,
            standort_id: prof ? prof.standort_id : null,
            aktion:      aktion,
            modul:       modul || null,
            details:     details || {}
        });
    } catch(e) {
        // Nie werfen – Audit darf nie eine Nutzer-Aktion blockieren
        console.warn('[logAudit] Fehler:', e && e.message);
    }
};

