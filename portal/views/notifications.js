/**
 * views/notifications.js - Real DB-backed notification system
 *
 * DB Table: notifications (id, user_id, standort_id, type, icon, title, description, read, action_view, action_params, created_at)
 *
 * @module views/notifications
 */

// -- safe access to globals --
function _sb()        { return window._supabase || window.sb; }
function _sbUser()    { return window.sbUser; }
function _sbProfile() { return window.sbProfile; }
function _t(k)        { return typeof window.t === 'function' ? window.t(k) : k; }
function _showView(v) { if (window.showView) window.showView(v); }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// === NOTIFICATION STATE ===
var notifData = [];
var notifCurrentFilter = 'all';
var notifRealtimeChannel = null;

// === LOAD NOTIFICATIONS FROM DB ===
export async function loadNotifications() {
    try {
        var sb = _sb(); if (!sb || !_sbUser()) return;
        var { data, error } = await sb.from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;

        notifData = (data || []).filter(function(n) {
            if (n.expires_at && new Date(n.expires_at) < new Date()) return false;
            return true;
        });

        updateNotifBadge();
        var el = document.getElementById('notifList');
        if (el && el.offsetParent !== null) renderNotifications(notifCurrentFilter);
    } catch(err) {
        console.warn('Notification load error:', err);
    }
}

// === BADGE UPDATE ===
function updateNotifBadge() {
    var unread = notifData.filter(function(n) { return !n.read; }).length;
    var span = document.getElementById('notifBellBadge');
    if (span) {
        span.textContent = unread > 9 ? '9+' : unread;
        span.style.display = unread > 0 ? '' : 'none';
        span.classList.toggle('animate-pulse', unread > 0);
    }
}

// === REALTIME SUBSCRIPTION ===
export function subscribeNotifRealtime() {
    try {
        var sb = _sb(); if (!sb || !_sbUser()) return;
        if (notifRealtimeChannel) sb.removeChannel(notifRealtimeChannel);
        notifRealtimeChannel = sb.channel('notifications-changes')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications'
            }, function(payload) {
                var n = payload.new;
                var profile = _sbProfile();
                var userId = _sbUser() ? _sbUser().id : null;
                if (n.user_id === userId || (n.standort_id && profile && n.standort_id === profile.standort_id) || (profile && profile.is_hq)) {
                    notifData.unshift(n);
                    updateNotifBadge();
                    var el = document.getElementById('notifList');
                    if (el && el.offsetParent !== null) renderNotifications(notifCurrentFilter);
                }
            })
            .subscribe();
    } catch(err) { console.warn('Notif realtime:', err); }
}

// === FILTER ===
export function filterNotif(f) {
    notifCurrentFilter = f;
    document.querySelectorAll('.notif-filter').forEach(function(b) {
        b.className = 'notif-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';
    });
    var btn = document.querySelector('.notif-filter[data-nf="' + f + '"]');
    if (btn) btn.className = 'notif-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderNotifications(f);
}

// === RENDER ===
export function renderNotifications(filter) {
    filter = filter || notifCurrentFilter || 'all';
    var list = notifData.filter(function(n) {
        if (filter === 'unread') return !n.read;
        if (filter === 'system') return n.type === 'system';
        if (filter === 'hq') return n.type === 'hq';
        return true;
    });
    var el = document.getElementById('notifList');
    if (!el) return;
    var h = '';
    if (list.length === 0) {
        var emptyMsg = filter === 'unread' ? 'Keine ungelesenen Benachrichtigungen' : 'Keine Benachrichtigungen';
        h = '<div class="text-center py-12 text-gray-400">'
          + '<p class="text-4xl mb-2">\ud83d\udd14</p>'
          + '<p class="text-sm">' + emptyMsg + '</p>'
          + '</div>';
    } else {
        list.forEach(function(n) {
            var timeAgo = formatTimeAgo(n.created_at);
            var typeMap = { hq: 'bg-vit-orange text-white', shop: 'bg-blue-100 text-blue-700', billing: 'bg-green-100 text-green-700', support: 'bg-red-100 text-red-700' };
            var typeClass = typeMap[n.type] || 'bg-gray-100 text-gray-500';
            h += '<div class="vit-card p-4 flex items-start space-x-3 cursor-pointer hover:shadow-md transition ' + (n.read ? 'opacity-60' : '') + '" onclick="handleNotifClick(\'' + n.id + '\')">';
            h += '<span class="text-2xl flex-shrink-0">' + (n.icon || '\ud83d\udd14') + '</span>';
            h += '<div class="flex-1 min-w-0">';
            h += '<div class="flex items-center space-x-2"><p class="font-semibold text-gray-800 text-sm truncate">' + (n.title || '') + '</p>';
            if (!n.read) h += '<span class="notif-dot w-2 h-2 bg-vit-orange rounded-full flex-shrink-0"></span>';
            h += '</div>';
            if (n.description) h += '<p class="text-xs text-gray-500 mt-0.5">' + n.description + '</p>';
            h += '<p class="text-[10px] text-gray-400 mt-1">' + timeAgo + '</p>';
            h += '</div>';
            h += '<span class="text-xs px-2 py-0.5 rounded-full ' + typeClass + '">' + (n.type || 'system').toUpperCase() + '</span>';
            h += '</div>';
        });
    }
    el.innerHTML = h;
}

// === TIME AGO ===
function formatTimeAgo(isoStr) {
    if (!isoStr) return '';
    var diff = Date.now() - new Date(isoStr).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Gerade eben';
    if (mins < 60) return 'vor ' + mins + ' Min.';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return 'vor ' + hours + ' Std.';
    var days = Math.floor(hours / 24);
    if (days === 1) return 'Gestern';
    if (days < 7) return 'vor ' + days + ' Tagen';
    return new Date(isoStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// === CLICK HANDLER ===
export async function handleNotifClick(notifId) {
    var n = notifData.find(function(x) { return x.id === notifId; });
    if (!n) return;
    if (!n.read) {
        n.read = true;
        updateNotifBadge();
        renderNotifications(notifCurrentFilter);
        try { await _sb().from('notifications').update({ read: true }).eq('id', notifId); } catch(err) { console.warn('Mark read:', err); }
    }
    if (n.action_view) _showView(n.action_view);
}

// === MARK ALL READ ===
export async function markAllNotifsRead() {
    var unreadIds = notifData.filter(function(n) { return !n.read; }).map(function(n) { return n.id; });
    if (unreadIds.length === 0) return;
    notifData.forEach(function(n) { n.read = true; });
    updateNotifBadge();
    renderNotifications(notifCurrentFilter);
    try { await _sb().from('notifications').update({ read: true }).in('id', unreadIds); } catch(err) { console.warn('Mark all read:', err); }
}

// === INIT ===
export async function initNotifications() {
    await loadNotifications();
    subscribeNotifRealtime();
}

// ==========================================
// PUSH NOTIFICATIONS
// ==========================================

export async function triggerPush(userIds, title, body, url, prefKey) {
    if (!userIds || userIds.length === 0) return;
    try {
        var sb = _sb();
        var { data: subs, error } = await sb.from('push_subscriptions').select('subscription').in('user_id', userIds);
        if (error || !subs || subs.length === 0) return;
        var subscriptions = subs.map(function(s) { return s.subscription; });
        await fetch(window.SUPABASE_URL + '/functions/v1/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await sb.auth.getSession()).data.session.access_token, 'apikey': window.SUPABASE_ANON_KEY },
            body: JSON.stringify({ subscriptions: subscriptions, title: title, body: body, url: url || '/portal', prefKey: prefKey || null })
        });
    } catch (err) { console.warn('triggerPush error:', err); }
}

export async function triggerPushStandort(title, body, url, prefKey) {
    try {
        var sb = _sb();
        var profile = _sbProfile();
        if (!profile || !profile.standort_id) return;
        var { data: users } = await sb.from('users').select('id').eq('standort_id', profile.standort_id).eq('status', 'aktiv');
        if (users && users.length > 0) await triggerPush(users.map(function(u) { return u.id; }), title, body, url, prefKey);
    } catch(err) { console.warn('triggerPushStandort:', err); }
}

export async function triggerPushHQ(title, body, url, prefKey) {
    try {
        var sb = _sb();
        var { data: users } = await sb.from('users').select('id').eq('is_hq', true).eq('status', 'aktiv');
        if (users && users.length > 0) await triggerPush(users.map(function(u) { return u.id; }), title, body, url, prefKey);
    } catch(err) { console.warn('triggerPushHQ:', err); }
}

export function showInstallBanner() {
    var el = document.getElementById('pwaInstallBanner');
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (el) el.style.display = '';
}

export function installPWA() {
    if (window._deferredInstallPrompt) {
        window._deferredInstallPrompt.prompt();
        window._deferredInstallPrompt.userChoice.then(function(result) {
            if (result.outcome === 'accepted') {
                _showToast('App wurde installiert!', 'success');
                var el = document.getElementById('pwaInstallBanner');
                if (el) el.style.display = 'none';
            }
            window._deferredInstallPrompt = null;
        });
    }
}

export function dismissInstall() {
    var el = document.getElementById('pwaInstallBanner');
    if (el) el.style.display = 'none';
}

export async function setupPushNotifications() {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            _showToast('Push wird von diesem Browser nicht unterstuetzt.', 'error');
            return;
        }
        var permission = await Notification.requestPermission();
        if (permission !== 'granted') { _showToast('Berechtigung nicht erteilt.', 'info'); return; }
        var registration = await navigator.serviceWorker.ready;
        var vapidPublicKey = 'BJ6NR_3YEPqpZR5MSmMBG9W6F51n0UAFGxQCAVXTxjqmSnePSs_N6D45PsmXKFClVHuWGssfDdGHb_pG4aYnkV8';
        var applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        var subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey });
        var sb = _sb();
        if (!sb || !_sbUser()) return;
        var deviceName = navigator.userAgent.indexOf('Mobile') > -1 ? 'Mobile' : 'Desktop';
        await sb.from('push_subscriptions').upsert({
            user_id: _sbUser().id, subscription: subscription.toJSON(),
            device_name: deviceName, is_active: true, updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,device_name' });
        updatePushUI(true, deviceName);
        _showToast('Push-Benachrichtigungen aktiviert!', 'success');
    } catch (err) { console.error('Push setup error:', err); _showToast('Fehler: ' + err.message, 'error'); }
}

function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = atob(base64);
    return Uint8Array.from(Array.prototype.map.call(rawData, function(c) { return c.charCodeAt(0); }));
}

export function showLocalNotification(title, body, url) {
    if (Notification.permission === 'granted') {
        var n = new Notification(title, { body: body, icon: '/icon-192x192.png', badge: '/icon-192x192.png' });
        if (url) n.onclick = function() { window.focus(); window.location.hash = url; };
    }
}

export function updatePushUI(active, deviceName) {
    var statusEl = document.getElementById('pushStatus');
    if (statusEl) statusEl.innerHTML = active
        ? '<span class="text-green-600 text-sm font-semibold">\u2705 Aktiv (' + (deviceName || 'Geraet') + ')</span>'
        : '<span class="text-gray-400 text-sm">Nicht aktiviert</span>';
}

export async function checkPushStatus() {
    try {
        if (!('serviceWorker' in navigator)) return;
        var reg = await navigator.serviceWorker.ready;
        var sub = await reg.pushManager.getSubscription();
        if (sub) updatePushUI(true, navigator.userAgent.indexOf('Mobile') > -1 ? 'Mobile' : 'Desktop');
    } catch(err) { console.warn('checkPushStatus:', err); }
}

export async function loadNotificationPrefs() {}
export async function saveNotificationPrefs() {}

export async function unsubscribePush() {
    try {
        var reg = await navigator.serviceWorker.ready;
        var sub = await reg.pushManager.getSubscription();
        if (sub) {
            await sub.unsubscribe();
            var sb = _sb();
            if (sb && _sbUser()) await sb.from('push_subscriptions').delete().eq('user_id', _sbUser().id);
            updatePushUI(false);
            _showToast('Push deaktiviert.', 'success');
        }
    } catch(err) { console.warn('Unsubscribe:', err); }
}

// === STRANGLER FIG EXPORTS ===
// === CREATE RELEASE NOTIFICATION FOR ALL ACTIVE USERS ===
export async function createReleaseNotification(titel, version) {
    try {
        var sb = _sb(); if (!sb || !_sbUser()) return;
        var { data: users, error } = await sb.from('users').select('id').eq('status', 'aktiv');
        if (error || !users || users.length === 0) return;
        var notifTitle = version ? version + ': ' + titel : titel;
        var rows = users.map(function(u) {
            return {
                user_id: u.id,
                type: 'hq',
                icon: '📣',
                title: notifTitle,
                description: 'Ein neues Release wurde veröffentlicht.',
                read: false,
                action_view: 'entwicklung'
            };
        });
        await sb.from('notifications').insert(rows);
    } catch(err) { console.warn('createReleaseNotification:', err); }
}

const _exports = {
    renderNotifications, filterNotif, loadNotifications, initNotifications,
    handleNotifClick, markAllNotifsRead, subscribeNotifRealtime,
    triggerPush, triggerPushStandort, triggerPushHQ,
    installPWA, dismissInstall, showLocalNotification,
    updatePushUI, checkPushStatus, loadNotificationPrefs,
    saveNotificationPrefs, unsubscribePush, setupPushNotifications,
    createReleaseNotification
};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
