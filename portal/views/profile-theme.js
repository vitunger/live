/**
 * views/profile-theme.js - Profile Panel, Theme Toggle, Dark Mode
 * @module views/profile-theme
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

export function toggleTheme() {
var current = document.documentElement.getAttribute('data-theme') || 'light';
var next = current === 'dark' ? 'light' : 'dark';
setTheme(next);
}
export function setTheme(theme) {
document.documentElement.setAttribute('data-theme', theme);
if(theme === 'dark') {
document.body.classList.add('dark');
} else {
document.body.classList.remove('dark');
}
try { localStorage.setItem('vit-theme', theme); } catch(e){}
var track = document.getElementById('themeToggleTrack');
if(track) {
if(theme === 'dark') track.classList.add('active');
else track.classList.remove('active');
}
// Update profile panel bg
var ps = document.getElementById('profileSlider');
if(ps) ps.style.background = theme === 'dark' ? 'var(--dm-surface)' : '#fff';
}
// Init on load - respect saved preference
(function(){
var saved = 'light';
try { saved = localStorage.getItem('vit-theme') || 'light'; } catch(e){}
setTheme(saved);
})();

// Strangler Fig
const _exports = {toggleTheme,setTheme};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[profile-theme.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
