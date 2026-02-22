// vit:bikes — Profile Panel + Settings
// Extracted from index.html lines 8134-8408
function openProfilePanel() {
    var panel = document.getElementById('profilePanel');
    var slider = document.getElementById('profileSlider');
    panel.style.display = 'block';
    // Force dark mode background
    if(document.body.classList.contains('dark')) {
        slider.style.background = '#1A1A1F';
    }
    // Populate from sbProfile if available
    if(typeof sbProfile !== 'undefined' && sbProfile) {
        var nameParts = (sbProfile.name || 'Demo User').split(' ');
        document.getElementById('profileVorname').value = nameParts[0] || '';
        document.getElementById('profileNachname').value = nameParts.slice(1).join(' ') || '';
        document.getElementById('profileEmail').value = sbProfile.email || '';
        document.getElementById('profileTelefon').value = sbProfile.telefon || '';
        document.getElementById('profilePosition').value = sbProfile.position || '';
        document.getElementById('profileNameDisplay').textContent = sbProfile.name || 'Demo User';
        document.getElementById('profileRoleDisplay').textContent = (typeof currentRole !== 'undefined' ? currentRole : 'Inhaber');
        var stdName = (typeof sbStandort !== 'undefined' && sbStandort) ? sbStandort.name : '';
        document.getElementById('profileStandortDisplay').textContent = stdName ? '📍 ' + stdName : '';
        // Avatar
        var avatarUrl = sbProfile.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(sbProfile.name||'User') + '&background=EF7D00&color=fff';
        document.getElementById('profileAvatarImg').src = avatarUrl;
    }
    // Theme buttons
    updateProfileThemeButtons();
    // Animate in
    requestAnimationFrame(function(){
        slider.style.transform = 'translateX(0)';
    });
    // Check push status & load prefs
    setTimeout(function() { checkPushStatus(); loadNotificationPrefs(); }, 200);
}

function closeProfilePanel() {
    var slider = document.getElementById('profileSlider');
    slider.style.transform = 'translateX(100%)';
    setTimeout(function(){
        document.getElementById('profilePanel').style.display = 'none';
    }, 350);
}

function updateProfileThemeButtons() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var lightBtn = document.getElementById('profileThemeLight');
    var darkBtn = document.getElementById('profileThemeDark');
    if(lightBtn) lightBtn.style.borderColor = current === 'light' ? '#EF7D00' : 'transparent';
    if(darkBtn) darkBtn.style.borderColor = current === 'dark' ? '#EF7D00' : 'transparent';
}

// Override setTheme to also update profile buttons
var _origSetTheme = typeof setTheme === 'function' ? setTheme : null;
setTheme = function(theme) {
    if(_origSetTheme) _origSetTheme(theme);
    else {
        document.documentElement.setAttribute('data-theme', theme);
        if(theme === 'dark') document.body.classList.add('dark');
        else document.body.classList.remove('dark');
        try { localStorage.setItem('vit-theme', theme); } catch(e){}
    }
    updateProfileThemeButtons();
    // Update profile panel background
    var ps = document.getElementById('profileSlider');
    if(ps) ps.style.background = theme === 'dark' ? '#1A1A1F' : '#fff';
    // Update CSS variables for theme
    var r = document.documentElement;
    if(theme === 'dark') {
        r.style.setProperty('--c-bg','#1A1A1F');
        r.style.setProperty('--c-bg2','#222228');
        r.style.setProperty('--c-bg3','#2A2A30');
        r.style.setProperty('--c-text','#EAEAEC');
        r.style.setProperty('--c-text2','#C8C8CE');
        r.style.setProperty('--c-sub','#87878F');
        r.style.setProperty('--c-muted','#55555C');
        r.style.setProperty('--c-border','#2A2A30');
        r.style.setProperty('--c-border2','#2A2A30');
        r.style.setProperty('--c-ring','#2A2A30');
        r.style.setProperty('--c-orange-tint','rgba(239,125,0,0.1)');
        r.style.setProperty('--c-yellow-tint','rgba(250,204,21,0.08)');
        r.style.setProperty('--c-blue-tint','rgba(59,130,246,0.08)');
    } else {
        r.style.setProperty('--c-bg','#FFFFFF');
        r.style.setProperty('--c-bg2','#f9fafb');
        r.style.setProperty('--c-bg3','#f3f4f6');
        r.style.setProperty('--c-text','#111827');
        r.style.setProperty('--c-text2','#374151');
        r.style.setProperty('--c-sub','#6b7280');
        r.style.setProperty('--c-muted','#9ca3af');
        r.style.setProperty('--c-border','#e5e7eb');
        r.style.setProperty('--c-border2','#f3f4f6');
        r.style.setProperty('--c-ring','#f3f4f6');
        r.style.setProperty('--c-orange-tint','#fff7ed');
        r.style.setProperty('--c-yellow-tint','#fffbeb');
        r.style.setProperty('--c-blue-tint','#eff6ff');
    }
    // Walk DOM and fix inline styles for dark mode
    applyDarkModeInlineStyles(theme === 'dark');
};

function applyDarkModeInlineStyles(isDark) {
    if(!isDark) {
        // Restore originals
        document.querySelectorAll('[data-dm-orig]').forEach(function(el){
            el.setAttribute('style', el.getAttribute('data-dm-orig'));
            el.removeAttribute('data-dm-orig');
        });
        return;
    }
    
    // Direct style property manipulation - much more reliable than regex
    var bgMap = {
        'rgb(255, 255, 255)':'#1A1A1F','rgb(249, 250, 251)':'#222228',
        'rgb(243, 244, 246)':'#2A2A30','rgb(250, 250, 250)':'#222228',
        'rgb(229, 231, 235)':'#2A2A30','rgb(209, 213, 219)':'#3A3A42',
        'rgb(240, 253, 244)':'rgba(34,197,94,0.1)','rgb(254, 242, 242)':'rgba(248,113,113,0.1)',
        'rgb(239, 246, 255)':'rgba(59,130,246,0.1)','rgb(255, 247, 237)':'rgba(239,125,0,0.1)',
        'rgb(254, 252, 232)':'rgba(250,204,21,0.08)','rgb(250, 245, 255)':'rgba(139,92,246,0.1)',
        'rgb(236, 253, 245)':'rgba(34,197,94,0.1)','rgb(254, 243, 199)':'rgba(245,158,11,0.1)',
        'rgb(255, 251, 235)':'rgba(250,204,21,0.08)',
    };
    var colorMap = {
        'rgb(17, 24, 39)':'#EAEAEC','rgb(31, 41, 55)':'#EAEAEC',
        'rgb(55, 65, 81)':'#C8C8CE','rgb(75, 85, 99)':'#87878F',
        'rgb(107, 114, 128)':'#87878F','rgb(156, 163, 175)':'#55555C',
        'rgb(51, 51, 51)':'#EAEAEC','rgb(0, 0, 0)':'#EAEAEC',
    };
    var borderColorMap = {
        'rgb(229, 231, 235)':'#2A2A30','rgb(243, 244, 246)':'#2A2A30',
        'rgb(209, 213, 219)':'#2A2A30','rgb(238, 238, 238)':'#2A2A30',
        'rgb(221, 221, 221)':'#2A2A30',
    };
    
    document.querySelectorAll('[style]').forEach(function(el) {
        if(el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
        var origStyle = el.getAttribute('style');
        if(!origStyle || el.hasAttribute('data-dm-skip')) return;
        
        // Store original before any changes
        if(!el.hasAttribute('data-dm-orig')) el.setAttribute('data-dm-orig', origStyle);
        
        var cs = el.style;
        var changed = false;
        
        // Background
        var bg = cs.backgroundColor || cs.background;
        if(bg) {
            // Handle solid colors
            Object.keys(bgMap).forEach(function(from) {
                if(bg.indexOf(from) !== -1) {
                    if(cs.backgroundColor) cs.backgroundColor = bgMap[from];
                    else cs.background = cs.background.replace(from, bgMap[from]);
                    changed = true;
                }
            });
            // Handle rgba with low alpha (tinted backgrounds)
            if(bg.indexOf('rgba(22, 163, 74') !== -1 && bg.indexOf('0.06') !== -1) { cs.background = bg.replace('0.06','0.12'); changed = true; }
            if(bg.indexOf('rgba(202, 138, 4') !== -1 && bg.indexOf('0.06') !== -1) { cs.background = bg.replace('0.06','0.12'); changed = true; }
            if(bg.indexOf('rgba(220, 38, 38') !== -1 && bg.indexOf('0.06') !== -1) { cs.background = bg.replace('0.06','0.12'); changed = true; }
            if(bg.indexOf('rgba(239, 125, 0') !== -1 && bg.indexOf('0.08') !== -1) { cs.background = bg.replace('0.08','0.15'); changed = true; }
        }
        
        // Text color (only if not an icon/badge with intentional color)
        var col = cs.color;
        if(col && colorMap[col]) {
            // Don't override status colors (green/red/blue/orange/purple)
            if(col.indexOf('34, 197') === -1 && col.indexOf('248, 113') === -1 && 
               col.indexOf('59, 130') === -1 && col.indexOf('239, 125') === -1 &&
               col.indexOf('139, 92') === -1 && col.indexOf('22, 163') === -1 &&
               col.indexOf('220, 38') === -1 && col.indexOf('202, 138') === -1 &&
               col.indexOf('37, 99') === -1 && col.indexOf('147, 51') === -1) {
                cs.color = colorMap[col];
                changed = true;
            }
        }
        
        // Border color
        var bc = cs.borderColor || cs.borderBottom || cs.borderTop;
        if(cs.borderColor && borderColorMap[cs.borderColor]) { cs.borderColor = borderColorMap[cs.borderColor]; changed = true; }
        // Handle border shorthand  
        ['borderBottom','borderTop','borderLeft','borderRight','border'].forEach(function(prop) {
            var val = cs[prop];
            if(val) {
                Object.keys(borderColorMap).forEach(function(from) {
                    if(val.indexOf(from) !== -1) { cs[prop] = val.replace(from, borderColorMap[from]); changed = true; }
                });
            }
        });
    });
}

// MutationObserver: auto-apply dark mode to dynamically inserted content
(function() {
    var dmTimer = null;
    var observer = new MutationObserver(function(mutations) {
        if(!document.body.classList.contains('dark')) return;
        // Debounce - don't fire too often
        if(dmTimer) clearTimeout(dmTimer);
        dmTimer = setTimeout(function() {
            applyDarkModeInlineStyles(true);
        }, 100);
    });
    // Start observing once DOM is ready
    if(document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }
})();

async function saveProfile() {
    var vorname = document.getElementById('profileVorname').value.trim();
    var nachname = document.getElementById('profileNachname').value.trim();
    var fullName = (vorname + ' ' + nachname).trim();
    var telefon = document.getElementById('profileTelefon').value.trim();
    var position = document.getElementById('profilePosition').value.trim();

    if(typeof sb !== 'undefined' && typeof sbProfile !== 'undefined' && sbProfile) {
        try {
            var upd = { name: fullName, vorname: vorname, nachname: nachname, telefon: telefon, position: position };
            var resp = await sb.from('users').update(upd).eq('id', sbProfile.id);
            if(resp.error) throw resp.error;
            // Update local state
            sbProfile.name = fullName;
            sbProfile.telefon = telefon;
            sbProfile.position = position;
            // Update UI
            document.querySelectorAll('[data-user-name]').forEach(function(el){ el.textContent = fullName; });
            document.getElementById('profileNameDisplay').textContent = fullName;
            var avatarUrl = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(fullName) + '&background=EF7D00&color=fff';
            document.getElementById('profileAvatarImg').src = avatarUrl;
            var topAvatar = document.getElementById('userAvatarImg');
            if(topAvatar) topAvatar.src = avatarUrl;
            var mobileAvatar = document.getElementById('userAvatarImgMobile');
            if(mobileAvatar) mobileAvatar.src = avatarUrl;
            alert('✅ Profil gespeichert!');
        } catch(e) {
            console.error('Profile save error:', e);
            alert('Fehler beim Speichern: ' + (e.message||e));
        }
    } else {
        alert('✅ Profil gespeichert! (Demo-Modus)');
    }
}

function handleProfilePhoto(input) {
    if(input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profileAvatarImg').src = e.target.result;
            var topAvatar = document.getElementById('userAvatarImg');
            if(topAvatar) topAvatar.src = e.target.result;
            var mobileAvatar = document.getElementById('userAvatarImgMobile');
            if(mobileAvatar) mobileAvatar.src = e.target.result;
            // TODO: Upload to Supabase Storage
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function changePassword() {
    var newPw = prompt('Neues Passwort eingeben (min. 8 Zeichen):');
    if(!newPw || newPw.length < 8) { if(newPw !== null) alert('Passwort muss mindestens 8 Zeichen haben.'); return; }
    if(typeof sb !== 'undefined') {
        sb.auth.updateUser({ password: newPw }).then(function(res){
            if(res.error) alert('Fehler: ' + res.error.message);
            else alert(t('alert_pw_changed'));
        });
    } else {
        alert(t('alert_pw_changed'));
    }
}
