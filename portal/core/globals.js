/**
 * core/globals.js - Global Helpers (showToast, escH, fmtN, theme)
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
// [prod] log removed
