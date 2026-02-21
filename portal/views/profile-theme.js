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
</script>


<!-- ═══ NUTZERPROFIL SLIDE-OVER PANEL ═══ -->
<div id="profilePanel" style="display:none;position:fixed;inset:0;z-index:9999;">
<!-- Backdrop -->
<div onclick="closeProfilePanel()" style="position:absolute;inset:0;background:rgba(0,0,0,0.4);transition:opacity 0.3s;" id="profileBackdrop"></div>
<!-- Panel -->
<div id="profileSlider" style="position:absolute;top:0;right:0;bottom:0;width:380px;max-width:100vw;background:var(--c-bg);box-shadow:-8px 0 30px rgba(0,0,0,0.15);transform:translateX(100%);transition:transform 0.35s cubic-bezier(0.16,1,0.3,1);overflow-y:auto;">

<!-- Header -->
<div style="padding:24px 24px 0;padding-top:max(24px, env(safe-area-inset-top, 24px));position:relative;">
    <button onclick="closeProfilePanel()" style="position:absolute;top:max(16px, env(safe-area-inset-top, 16px));right:16px;background:none;border:none;font-size:24px;cursor:pointer;color:var(--c-muted);padding:8px;z-index:10;">✕</button>
    <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--c-muted);font-weight:600;margin-bottom:16px;">Mein Profil</p>

    <!-- Avatar + Name -->
    <div style="text-align:center;margin-bottom:24px;">
        <div style="position:relative;display:inline-block;">
            <img id="profileAvatarImg" src="https://ui-avatars.com/api/?name=Demo+User&background=EF7D00&color=fff" style="width:80px;height:80px;border-radius:50%;border:3px solid #EF7D00;">
            <label for="profilePhotoUpload" style="position:absolute;bottom:0;right:0;width:26px;height:26px;border-radius:50%;background:#EF7D00;display:flex;align-items:center;justify-content:center;cursor:pointer;border:2px solid white;font-size:12px;" title="Foto ändern">📷</label>
            <input type="file" id="profilePhotoUpload" accept="image/*" style="display:none;" onchange="handleProfilePhoto(this)">
        </div>
        <h2 id="profileNameDisplay" style="font-size:20px;font-weight:800;margin-top:10px;color:var(--c-text);">Demo User</h2>
        <p id="profileRoleDisplay" style="font-size:12px;color:var(--c-muted);">Inhaber</p>
        <p id="profileStandortDisplay" style="font-size:11px;color:var(--c-muted);margin-top:2px;">📍 Grafrath</p>
    </div>
</div>

<!-- Persönliche Daten -->
<div style="padding:0 24px 24px;">
    <div style="background:var(--c-bg2);border-radius:12px;padding:16px;margin-bottom:16px;">
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--c-muted);font-weight:600;margin-bottom:12px;">Persönliche Daten</p>

        <div style="margin-bottom:12px;">
            <label style="font-size:11px;color:var(--c-sub);font-weight:600;display:block;margin-bottom:3px;">Vorname</label>
            <input id="profileVorname" type="text" value="Max" style="width:100%;padding:8px 12px;border:1px solid var(--c-border);border-radius:8px;font-size:13px;font-family:Outfit,sans-serif;outline:none;" onfocus="this.style.borderColor='#EF7D00'" onblur="this.style.borderColor='var(--c-border)'">
        </div>

        <div style="margin-bottom:12px;">
            <label style="font-size:11px;color:var(--c-sub);font-weight:600;display:block;margin-bottom:3px;">Nachname</label>
            <input id="profileNachname" type="text" value="Bauer" style="width:100%;padding:8px 12px;border:1px solid var(--c-border);border-radius:8px;font-size:13px;font-family:Outfit,sans-serif;outline:none;" onfocus="this.style.borderColor='#EF7D00'" onblur="this.style.borderColor='var(--c-border)'">
        </div>

        <div style="margin-bottom:12px;">
            <label style="font-size:11px;color:var(--c-sub);font-weight:600;display:block;margin-bottom:3px;">E-Mail</label>
            <input id="profileEmail" type="email"  disabled style="width:100%;padding:8px 12px;border:1px solid var(--c-border);border-radius:8px;font-size:13px;background:var(--c-bg3);color:var(--c-sub);font-family:Outfit,sans-serif;">
            <p style="font-size:9px;color:var(--c-muted);margin-top:2px;">Wird vom HQ verwaltet</p>
        </div>

        <div style="margin-bottom:12px;">
            <label style="font-size:11px;color:var(--c-sub);font-weight:600;display:block;margin-bottom:3px;">Telefon</label>
            <input id="profileTelefon" type="tel" value="" placeholder="+49 ..." style="width:100%;padding:8px 12px;border:1px solid var(--c-border);border-radius:8px;font-size:13px;font-family:Outfit,sans-serif;outline:none;" onfocus="this.style.borderColor='#EF7D00'" onblur="this.style.borderColor='var(--c-border)'">
        </div>

        <div style="margin-bottom:0;">
            <label style="font-size:11px;color:var(--c-sub);font-weight:600;display:block;margin-bottom:3px;">Position / Rolle</label>
            <input id="profilePosition" type="text" value="" placeholder="z.B. Geschäftsführer, Werkstattleiter..." style="width:100%;padding:8px 12px;border:1px solid var(--c-border);border-radius:8px;font-size:13px;font-family:Outfit,sans-serif;outline:none;" onfocus="this.style.borderColor='#EF7D00'" onblur="this.style.borderColor='var(--c-border)'">
        </div>
    </div>

    <!-- Erscheinungsbild -->
    <div style="background:var(--c-bg2);border-radius:12px;padding:16px;margin-bottom:16px;" class="bg-gray-50">
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--c-muted);font-weight:600;margin-bottom:12px;">Erscheinungsbild</p>
        <div style="display:flex;gap:8px;">
            <button onclick="setTheme('light')" id="profileThemeLight" style="flex:1;padding:12px;border-radius:10px;border:2px solid #EF7D00;background:var(--c-bg2);cursor:pointer;text-align:center;">
                <span style="font-size:20px;">☀️</span>
                <p style="font-size:11px;font-weight:600;color:var(--c-text);margin-top:4px;">Light</p>
            </button>
            <button onclick="setTheme('dark')" id="profileThemeDark" style="flex:1;padding:12px;border-radius:10px;border:2px solid transparent;background:var(--c-border);cursor:pointer;text-align:center;">
                <span style="font-size:20px;">🌙</span>
                <p style="font-size:11px;font-weight:600;color:var(--c-muted);margin-top:4px;">Dark</p>
            </button>
        </div>
    </div>

    <!-- Speichern -->
    <button onclick="saveProfile()" style="width:100%;padding:12px;background:#EF7D00;color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;margin-bottom:12px;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
        Änderungen speichern
    </button>

    <!-- Passwort / Abmelden -->
    <div style="display:flex;gap:8px;">
        <button onclick="changePassword()" style="flex:1;padding:8px;background:none;border:1px solid var(--c-border);border-radius:8px;font-size:11px;color:var(--c-sub);cursor:pointer;font-family:Outfit,sans-serif;">🔒 Passwort ändern</button>
        <button onclick="handleLogout()" style="flex:1;padding:8px;background:none;border:1px solid #fecaca;border-radius:8px;font-size:11px;color:#dc2626;cursor:pointer;font-family:Outfit,sans-serif;">🚪 Abmelden</button>
    </div>

    <!-- Meta -->
    <!-- E-Mail-Einstellungen -->
    <div style="background:var(--c-bg2);border-radius:12px;padding:16px;margin-bottom:16px;">
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--c-muted);font-weight:600;margin-bottom:12px;">E-Mail-Benachrichtigungen</p>
        <label style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;cursor:pointer;font-size:12px;color:var(--c-sub);">
            <span>📊 BWA-Erinnerungen</span>
            <input type="checkbox" checked id="prefBwa" style="accent-color:#EF7D00;width:16px;height:16px;">
        </label>
        <label style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;cursor:pointer;font-size:12px;color:var(--c-sub);">
            <span>📈 Lead-Benachrichtigungen</span>
            <input type="checkbox" checked id="prefLeads" style="accent-color:#EF7D00;width:16px;height:16px;">
        </label>
        <label style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;cursor:pointer;font-size:12px;color:var(--c-sub);">
            <span>🎓 Trainer-Erinnerungen</span>
            <input type="checkbox" checked id="prefTrainer" style="accent-color:#EF7D00;width:16px;height:16px;">
        </label>
        <label style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;cursor:pointer;font-size:12px;color:var(--c-sub);">
            <span>📞 Gruppencall-Erinnerungen</span>
            <input type="checkbox" checked id="prefCalls" style="accent-color:#EF7D00;width:16px;height:16px;">
        </label>
        <div style="border-top:1px solid var(--c-border);margin-top:8px;padding-top:8px;">
            <div id="pushSettingsSection">
                <div id="pushActivateArea">
                    <button id="pushToggleBtn" onclick="setupPushNotifications()" style="width:100%;padding:10px;background:#EF7D00;color:white;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                        🔔 Push-Benachrichtigungen aktivieren
                    </button>
                    <p style="font-size:9px;color:var(--c-muted);margin-top:4px;text-align:center">Erhalte Benachrichtigungen direkt auf dein Gerät</p>
                </div>
                <div id="pushActiveArea" style="display:none;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                        <span style="font-size:11px;font-weight:700;color:#059669;">✅ Push aktiv</span>
                        <button onclick="unsubscribePush()" style="font-size:10px;color:#ef4444;background:none;border:none;cursor:pointer;text-decoration:underline;">Deaktivieren</button>
                    </div>
                    <p style="font-size:10px;font-weight:600;color:var(--c-sub);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">Push-Benachrichtigungen</p>
                    <label class="notif-toggle-wrap" style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;cursor:pointer;font-size:12px;color:var(--c-sub);">
                        <span>💬 Neue Nachrichten</span>
                        <input type="checkbox" checked class="notif-toggle" data-pref="push_neue_nachricht" style="accent-color:#EF7D00;width:16px;height:16px;">
                    </label>
                    <label class="notif-toggle-wrap" style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;cursor:pointer;font-size:12px;color:var(--c-sub);">
                        <span>📋 Aufgabe zugewiesen</span>
                        <input type="checkbox" checked class="notif-toggle" data-pref="push_aufgabe_zugewiesen" style="accent-color:#EF7D00;width:16px;height:16px;">
                    </label>
                    <label class="notif-toggle-wrap" style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;cursor:pointer;font-size:12px;color:var(--c-sub);">
                        <span>📅 Termin-Erinnerungen</span>
                        <input type="checkbox" checked class="notif-toggle" data-pref="push_termin_erinnerung" style="accent-color:#EF7D00;width:16px;height:16px;">
                    </label>
                    <label class="notif-toggle-wrap" style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;cursor:pointer;font-size:12px;color:var(--c-sub);">
                        <span>🎯 Lead-Aktivitäten</span>
                        <input type="checkbox" checked class="notif-toggle" data-pref="push_lead_aktivitaet" style="accent-color:#EF7D00;width:16px;height:16px;">
                    </label>
                    <label class="notif-toggle-wrap" style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;cursor:pointer;font-size:12px;color:var(--c-sub);">
                        <span>📢 Ankündigungen</span>
                        <input type="checkbox" checked class="notif-toggle" data-pref="push_ankuendigung" style="accent-color:#EF7D00;width:16px;height:16px;">
                    </label>
                    <label class="notif-toggle-wrap" style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;cursor:pointer;font-size:12px;color:var(--c-sub);">
                        <span>🆘 Support-Updates</span>
                        <input type="checkbox" checked class="notif-toggle" data-pref="push_support_update" style="accent-color:#EF7D00;width:16px;height:16px;">
                    </label>
                    <button onclick="saveNotificationPrefs()" style="width:100%;margin-top:8px;padding:7px;background:var(--c-bg3);border:1px solid #d1d5db;border-radius:6px;font-size:11px;font-weight:600;color:var(--c-text2);cursor:pointer;">💾 Push-Einstellungen speichern</button>
                </div>
            </div>
        </div>
    </div>

    <div style="margin-top:16px;padding:12px;background:var(--c-bg2);border-radius:8px;text-align:center;">
        <p style="font-size:9px;color:var(--c-muted);">vit:bikes cockpit v7.0 · Mitglied seit Jan 2025</p>
    </div>
</div>
</div>
</div>

<!-- Profile Panel JS -->
<script>
export function openProfilePanel() {
var panel = document.getElementById('profilePanel');
var slider = document.getElementById('profileSlider');
panel.style.display = 'block';
// Force dark mode background
if(document.body.classList.contains('dark')) {
slider.style.background = '#1A1A1F';
}
// Populate from sbProfile if available
if(typeof sbProfile !== 'undefined' && sbProfile) {
var nameParts = (_sbProfile().name || 'Demo User').split(' ');
document.getElementById('profileVorname').value = nameParts[0] || '';
document.getElementById('profileNachname').value = nameParts.slice(1).join(' ') || '';
document.getElementById('profileEmail').value = _sbProfile().email || '';
document.getElementById('profileTelefon').value = _sbProfile().telefon || '';
document.getElementById('profilePosition').value = _sbProfile().position || '';
document.getElementById('profileNameDisplay').textContent = _sbProfile().name || 'Demo User';
document.getElementById('profileRoleDisplay').textContent = (typeof currentRole !== 'undefined' ? currentRole : 'Inhaber');
var stdName = (typeof sbStandort !== 'undefined' && sbStandort) ? sbStandort.name : '';
document.getElementById('profileStandortDisplay').textContent = stdName ? '📍 ' + stdName : '';
// Avatar
var avatarUrl = _sbProfile().avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(_sbProfile().name||'User') + '&background=EF7D00&color=fff';
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

export function closeProfilePanel() {
var slider = document.getElementById('profileSlider');
slider.style.transform = 'translateX(100%)';
setTimeout(function(){
document.getElementById('profilePanel').style.display = 'none';
}, 350);
}

export function updateProfileThemeButtons() {
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

export function applyDarkModeInlineStyles(isDark) {
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

export async function saveProfile() {
var vorname = document.getElementById('profileVorname').value.trim();
var nachname = document.getElementById('profileNachname').value.trim();
var fullName = (vorname + ' ' + nachname).trim();
var telefon = document.getElementById('profileTelefon').value.trim();
var position = document.getElementById('profilePosition').value.trim();

if(typeof sb !== 'undefined' && typeof sbProfile !== 'undefined' && sbProfile) {
try {
    var upd = { name: fullName, vorname: vorname, nachname: nachname, telefon: telefon, position: position };
    var resp = await _sb().from('users').update(upd).eq('id', _sbProfile().id);
    if(resp.error) throw resp.error;
    // Update local state
    _sbProfile().name = fullName;
    _sbProfile().telefon = telefon;
    _sbProfile().position = position;
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

export function handleProfilePhoto(input) {
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

export function changePassword() {
var newPw = prompt('Neues Passwort eingeben (min. 8 Zeichen):');
if(!newPw || newPw.length < 8) { if(newPw !== null) alert('Passwort muss mindestens 8 Zeichen haben.'); return; }
if(typeof sb !== 'undefined') {
_sb().auth.updateUser({ password: newPw }).then(function(res){
    if(res.error) alert('Fehler: ' + res.error.message);
    else alert(_t('alert_pw_changed'));
});
} else {
alert(_t('alert_pw_changed'));
}
}
</script>


<!-- ═══ BWA MOTIVATION + ESKALATION SYSTEM ═══ -->


// Strangler Fig
const _exports = {toggleTheme,setTheme,openProfilePanel,closeProfilePanel,updateProfileThemeButtons,applyDarkModeInlineStyles,saveProfile,handleProfilePhoto,changePassword};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[profile-theme.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
