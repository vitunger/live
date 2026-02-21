/**
 * views/notifications.js - Partner-Portal Benachrichtigungen & Push
 *
 * Handles: In-view notification list (demo), Push notification setup,
 *          triggerPush helpers, PWA install banner, notification preferences
 *
 * @module views/notifications
 */

// -- safe access to globals --
function _sb()        { return window._supabase || window.sb; }
function _sbProfile() { return window.sbProfile; }
function _t(k)        { return typeof window.t === 'function' ? window.t(k) : k; }
function _showView(v) { if (window.showView) window._showView(v); }

// === NOTIFICATIONS DATA & LOGIC ===
var notifications = [
    {id:1,type:'hq',icon:'📢',title:'Neue Kampagne: Fruehjahrs-Aktion 2026',desc:'Das HQ hat eine neue Kampagne gestartet. Materialien stehen bereit.',time:'vor 15 Min.',read:false,action:'_showView(\'marketing\')'},
    {id:2,type:'system',icon:'⚠️',title:'Ticket #1042 eskaliert',desc:'Kunde Huber wartet seit 5 Tagen auf Rueckmeldung.',time:'vor 1 Std.',read:false,action:'_showView(\'support\')'},
    {id:3,type:'hq',icon:'🎬',title:'Neues Content-Thema verfuegbar',desc:'Thema C035: "Helmberatung" wurde im Local Hero Katalog ergaenzt.',time:'vor 3 Std.',read:false,action:'_showView(\'marketing\');showMarketingTab(\'social\')'},
    {id:4,type:'system',icon:'📊',title:'BWA Januar 2026 verfuegbar',desc:'Die BWA fuer Januar wurde hochgeladen und kann eingesehen werden.',time:'Gestern',read:true,action:'_showView(\'controlling\')'},
    {id:5,type:'hq',icon:'📋',title:'Neue Einkaufsrichtlinie',desc:'Aktualisierte Margen-Empfehlung fuer Q1 2026 verfuegbar.',time:'Gestern',read:true,action:'_showView(\'einkauf\')'},
    {id:6,type:'system',icon:'✅',title:'Onboarding: 70% abgeschlossen',desc:'Du hast 7 von 10 Onboarding-Schritten erledigt.',time:'vor 2 Tagen',read:true,action:'_showView(\'onboarding\')'},
    {id:7,type:'hq',icon:'🏆',title:'Verkaufs-Ranking: Platz 3!',desc:'Euer Standort ist im Netzwerk-Ranking auf Platz 3 geklettert.',time:'vor 3 Tagen',read:true,action:'_showView(\'verkauf\')'},
    {id:8,type:'system',icon:'🔔',title:'Termin morgen: Probefahrt Hr. Mueller',desc:'Morgen um 10:00 Uhr – Probefahrt E-MTB geplant.',time:'vor 3 Tagen',read:true,action:'_showView(\'kalender\')'}
];

export function filterNotif(f) {
    document.querySelectorAll('.notif-filter').forEach(function(b){b.className='notif-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn=document.querySelector('.notif-filter[data-nf="'+f+'"]');
    if(btn)btn.className='notif-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderNotifications(f);
}
export function renderNotifications(filter) {
    filter=filter||'all';
    var list=notifications.filter(function(n){
        if(filter==='unread') return !n.read;
        if(filter==='system') return n.type==='system';
        if(filter==='hq') return n.type==='hq';
        return true;
    });
    var el=document.getElementById('notifList'); if(!el)return;
    var h='';
    list.forEach(function(n){
        h+='<div class="vit-card p-4 flex items-start space-x-3 cursor-pointer hover:shadow-md transition '+(n.read?'opacity-70':'')+'" onclick="'+n.action+'">';
        h+='<span class="text-2xl flex-shrink-0">'+n.icon+'</span>';
        h+='<div class="flex-1 min-w-0">';
        h+='<div class="flex items-center space-x-2"><p class="font-semibold text-gray-800 text-sm truncate">'+n.title+'</p>';
        if(!n.read) h+='<span class="notif-dot w-2 h-2 bg-vit-orange rounded-full flex-shrink-0"></span>';
        h+='</div>';
        h+='<p class="text-xs text-gray-500 mt-0.5">'+n.desc+'</p>';
        h+='<p class="text-[10px] text-gray-400 mt-1">'+n.time+'</p>';
        h+='</div>';
        h+='<span class="text-xs px-2 py-0.5 rounded-full '+(n.type==='hq'?'bg-vit-orange text-white':'bg-gray-100 text-gray-500')+'">'+n.type.toUpperCase()+'</span>';
        h+='</div>';
    });
    if(!list.length) h='<div class="text-center py-8 text-gray-400"><p class="text-3xl mb-2">🔔</p><p class="text-sm">Keine Benachrichtigungen</p></div>';
    el.innerHTML=h;
}

export async function triggerPush(userIds, title, body, url, prefKey) {
if (!userIds || userIds.length === 0) return;
try {
    var sb = window._supabase;
    if (!sb) return;
    if (prefKey) {
        var { data: prefs } = await _sb().from('notification_preferences').select('user_id, ' + prefKey).in('user_id', userIds);
        if (prefs) userIds = prefs.filter(function(p) { return p[prefKey] !== false; }).map(function(p) { return p.user_id; });
        if (userIds.length === 0) return;
    }
    var { data: session } = await sb.auth.getSession();
    var token = session?.session?.access_token;
    if (!token) return;
    await fetch('https://lwwagbkxeofahhwebkab.supabase.co/functions/v1/send-push', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: userIds, title: title, body: body, url: url || '/', icon: '/icon-192.png' })
    });
} catch(e) { console.log('[Push] trigger error:', e.message); }
}

export async function triggerPushStandort(title, body, url, prefKey) {
try {
    var sb = window._supabase;
    var me = (await sb.auth.getUser()).data.user?.id;
    var sid = _sbProfile() ? _sbProfile().standort_id : null;
    if (!sid || !me) return;
    var { data: users } = await _sb().from('user_profiles').select('user_id').eq('standort_id', sid);
    if (!users) return;
    var ids = users.map(function(u) { return u.user_id; }).filter(function(id) { return id !== me; });
    await triggerPush(ids, title, body, url, prefKey);
} catch(e) { console.log('[Push] standort trigger:', e.message); }
}

export async function triggerPushHQ(title, body, url, prefKey) {
try {
    var sb = window._supabase;
    var me = (await sb.auth.getUser()).data.user?.id;
    var { data: hqUsers } = await _sb().from('user_profiles').select('user_id').eq('is_hq', true);
    if (!hqUsers) return;
    var ids = hqUsers.map(function(u) { return u.user_id; }).filter(function(id) { return id !== me; });
    await triggerPush(ids, title, body, url, prefKey);
} catch(e) { console.log('[Push] HQ trigger:', e.message); }
}

export function showInstallBanner() {
// Don't show if already installed or dismissed
if (window.matchMedia('(display-mode: standalone)').matches) return;
try { if (localStorage.getItem('vit-pwa-dismissed')) return; } catch(e){}

var banner = document.createElement('div');
banner.id = 'pwaInstallBanner';
banner.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:10001;width:calc(100% - 32px);max-width:420px;';
banner.innerHTML = '<div style="background:var(--c-bg);border-radius:14px;padding:16px;box-shadow:0 8px 32px rgba(0,0,0,0.25);border:1px solid var(--c-border);display:flex;align-items:center;gap:12px">' +
    '<div style="width:44px;height:44px;border-radius:10px;background:#EF7D00;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-size:20px;color:white;font-weight:900">v</span></div>' +
    '<div style="flex:1"><p style="font-size:13px;font-weight:700;color:var(--c-text);margin:0">vit:bikes als App installieren</p><p style="font-size:11px;color:var(--c-sub);margin:2px 0 0">Schnellzugriff auf Pipeline, Kalender & mehr</p></div>' +
    '<button onclick="installPWA()" style="background:#EF7D00;color:white;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">Installieren</button>' +
    '<button onclick="dismissInstall()" style="background:none;border:none;color:var(--c-muted);font-size:16px;cursor:pointer;padding:4px">✕</button>' +
    '</div>';
document.body.appendChild(banner);
}

export function installPWA() {
if (!deferredPrompt) return;
deferredPrompt.prompt();
deferredPrompt.userChoice.then(function(result) {
    if (result.outcome === 'accepted') {
        console.log('[PWA] App installed');
    }
    deferredPrompt = null;
    var b = document.getElementById('pwaInstallBanner');
    if (b) b.remove();
});
};

export function dismissInstall() {
var b = document.getElementById('pwaInstallBanner');
if (b) b.remove();
try { localStorage.setItem('vit-pwa-dismissed', '1'); } catch(e){}
};

// ── Push Notifications Setup ──

export async function setupPushNotifications() {
if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    alert(_t('alert_push_unsupported'));
    return;
}

var permission = await Notification.requestPermission();
if (permission !== 'granted') {
    alert(_t('alert_push_denied'));
    return;
}

try {
    var reg = await navigator.serviceWorker.ready;
    var VAPID_PUBLIC_KEY = 'BFjv8qdfhEPXyWvz8Ite8laCH0XMaLtzTXvRBRq7XIa4FELmOz2RA3fUh7me1LIAh0JsKQVd-Pl8Dlxg_8mFc3c';
    
    // Convert VAPID key to Uint8Array
    var padding = '='.repeat((4 - VAPID_PUBLIC_KEY.length % 4) % 4);
    var base64 = (VAPID_PUBLIC_KEY + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);

    var subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray
    });

    var sub = subscription.toJSON();
    var sba = _sb();
    var user = (await sba.auth.getUser()).data.user;
    if (!user) { alert('Nicht eingeloggt'); return; }

    var deviceName = navigator.userAgent.indexOf('Mobile') > -1 ? 'Mobilgerät' : 'Desktop';
    deviceName += ' – ' + (navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge)[\/\s](\d+)/)||[])[0] || 'Browser';

    var { error } = await sba.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth_key: sub.keys.auth,
        device_name: deviceName
    }, { onConflict: 'endpoint' });

    if (error) throw error;

    console.log('[Push] Subscription saved successfully');
    updatePushUI(true, deviceName);
    showLocalNotification('🔔 Push aktiviert!', 'Du erhältst jetzt Benachrichtigungen für Nachrichten, Leads, Aufgaben & mehr.');
} catch(err) {
    console.error('[Push] Setup error:', err);
    alert('Push-Aktivierung fehlgeschlagen: ' + err.message);
}
};

export function showLocalNotification(title, body, url) {
if (!('serviceWorker' in navigator)) return;

navigator.serviceWorker.ready.then(function(reg) {
    reg.showNotification(title, {
        body: body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [100, 50, 100],
        data: { url: url || '/' },
        tag: 'local-' + Date.now()
    });
});
};

export function updatePushUI(active, deviceName) {
var activateArea = document.getElementById('pushActivateArea');
var activeArea = document.getElementById('pushActiveArea');
if (activateArea) activateArea.style.display = active ? 'none' : 'block';
if (activeArea) activeArea.style.display = active ? 'block' : 'none';
}

export async function checkPushStatus() {
try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription();
    updatePushUI(!!sub, sub ? 'Aktives Gerät' : null);
    if (sub) loadNotificationPrefs();
} catch(e) { console.log('[Push] Status check:', e.message); }
}

export async function loadNotificationPrefs() {
try {
    var sba = _sb();
    var userId = (await sba.auth.getUser()).data.user?.id;
    if (!userId) return;
    var { data } = await sba.from('notification_preferences').select('*').eq('user_id', userId).single();
    if (!data) return;
    document.querySelectorAll('.notif-toggle').forEach(function(cb) {
        var key = cb.dataset.pref;
        if (key && data[key] !== undefined) cb.checked = data[key];
    });
} catch(e) { console.log('[Prefs] load:', e.message); }
}

export async function saveNotificationPrefs() {
try {
    var sba = _sb();
    var userId = (await sba.auth.getUser()).data.user?.id;
    if (!userId) { alert('Nicht eingeloggt'); return; }
    var prefs = { user_id: userId, updated_at: new Date().toISOString() };
    document.querySelectorAll('.notif-toggle').forEach(function(cb) {
        var key = cb.dataset.pref;
        if (key) prefs[key] = cb.checked;
    });
    var { error } = await sba.from('notification_preferences').upsert(prefs, { onConflict: 'user_id' });
    if (error) throw error;
    alert('✅ Push-Einstellungen gespeichert!');
} catch(e) { alert('Fehler: ' + e.message); }
}

export async function unsubscribePush() {
try {
    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription();
    if (sub) {
        var endpoint = sub.endpoint;
        await sub.unsubscribe();
        var sba = _sb();
        await sba.from('push_subscriptions').delete().eq('endpoint', endpoint);
        console.log('[Push] Unsubscribed');
    }
    updatePushUI(false);
} catch(e) { console.error('[Push] Unsubscribe error:', e); }
}



// Strangler Fig: window.* registration
const _exports = {renderNotifications,triggerPushStandort,triggerPushHQ,installPWA,dismissInstall,showLocalNotification,updatePushUI,checkPushStatus,loadNotificationPrefs,saveNotificationPrefs,unsubscribePush};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[notifications.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
