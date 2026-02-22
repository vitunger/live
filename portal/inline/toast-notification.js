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
function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
}
function setTheme(theme) {
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
