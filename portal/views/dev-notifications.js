/**
 * views/dev-notifications.js - In-app notification bell + panel
 * @module views/dev-notifications
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }
function _sbUrl() { return window.SUPABASE_URL; }

// Shared state access
function _devSubs() { return window._devState ? window._devState.submissions : []; }
function _devStatusLabels() { return window._devState ? window._devState.statusLabels : {}; }
function _devStatusColors() { return window._devState ? window._devState.statusColors : {}; }
function _devKatIcons() { return window._devState ? window._devState.katIcons : {}; }

// === LOCAL NOTIFICATION STATE ===
var devNotifications = [];
var devNotifOpen = false;

export async function loadDevNotifications() {
    try {
        var resp = await _sb().from('dev_notifications')
            .select('*, dev_submissions(titel)')
            .eq('user_id', _sbUser().id)
            .order('created_at', {ascending: false})
            .limit(20);
        devNotifications = resp.data || [];
        updateDevNotifBadge();
    } catch(err) { console.warn('Notif load:', err); }
}

function updateDevNotifBadge() {
    var unread = devNotifications.filter(function(n){ return !n.gelesen; }).length;
    var badge = document.getElementById('devNotifBadge');
    if(badge) {
        badge.textContent = unread > 9 ? '9+' : unread;
        badge.style.display = unread > 0 ? '' : 'none';
    }
}

export function toggleDevNotifications() {
    devNotifOpen = !devNotifOpen;
    var panel = document.getElementById('devNotifPanel');
    if(!panel) {
        // Create panel dynamically
        panel = document.createElement('div');
        panel.id = 'devNotifPanel';
        panel.className = 'fixed top-14 right-4 w-80 max-h-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-[55] overflow-hidden';
        panel.style.display = 'none';
        document.body.appendChild(panel);
        // Close on click outside
        document.addEventListener('click', function(e) {
            if(devNotifOpen && !panel.contains(e.target) && e.target.id !== 'devNotifBtn' && !e.target.closest('#devNotifBtn')) {
                devNotifOpen = false;
                panel.style.display = 'none';
            }
        });
    }
    if(devNotifOpen) {
        renderDevNotifPanel();
        panel.style.display = '';
    } else {
        panel.style.display = 'none';
    }
}

function renderDevNotifPanel() {
    var panel = document.getElementById('devNotifPanel');
    if(!panel) return;
    var unread = devNotifications.filter(function(n){ return !n.gelesen; }).length;
    var h = '<div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">';
    h += '<h3 class="text-sm font-bold text-gray-800">🔔 Benachrichtigungen</h3>';
    if(unread > 0) h += '<button onclick="markAllDevNotifsRead()" class="text-xs text-vit-orange hover:underline">Alle gelesen</button>';
    h += '</div>';
    if(devNotifications.length === 0) {
        h += '<div class="text-center py-8 text-gray-400"><p class="text-2xl mb-1">🔔</p><p class="text-xs">Keine Benachrichtigungen</p></div>';
    } else {
        h += '<div class="max-h-72 overflow-y-auto">';
        devNotifications.forEach(function(n) {
            var dt = new Date(n.created_at);
            var ago = _timeAgo(dt);
            h += '<div onclick="openDevNotif(\''+n.id+'\',\''+n.submission_id+'\')" class="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 '+(n.gelesen?'opacity-60':'')+'">';
            h += '<div class="flex items-start gap-2">';
            if(!n.gelesen) h += '<span class="w-2 h-2 rounded-full bg-vit-orange flex-shrink-0 mt-1.5"></span>';
            else h += '<span class="w-2 h-2 flex-shrink-0"></span>';
            h += '<div class="flex-1 min-w-0">';
            h += '<p class="text-sm font-semibold text-gray-800 truncate">'+n.titel+'</p>';
            if(n.inhalt) h += '<p class="text-xs text-gray-500 truncate">'+n.inhalt+'</p>';
            h += '<p class="text-[10px] text-gray-400 mt-0.5">'+ago+'</p>';
            h += '</div></div></div>';
        });
        h += '</div>';
    }
    panel.innerHTML = h;
}

export async function openDevNotif(notifId, subId) {
    // Mark as read
    await _sb().from('dev_notifications').update({gelesen: true}).eq('id', notifId);
    devNotifications.forEach(function(n){ if(n.id === notifId) n.gelesen = true; });
    updateDevNotifBadge();
    toggleDevNotifications(); // close panel
    if(subId) openDevDetail(subId);
}

export async function markAllDevNotifsRead() {
    var unreadIds = devNotifications.filter(function(n){ return !n.gelesen; }).map(function(n){ return n.id; });
    if(unreadIds.length === 0) return;
    await _sb().from('dev_notifications').update({gelesen: true}).in('id', unreadIds);
    devNotifications.forEach(function(n){ n.gelesen = true; });
    updateDevNotifBadge();
    renderDevNotifPanel();
}

function _timeAgo(date) {
    var s = Math.floor((Date.now() - date.getTime()) / 1000);
    if(s < 60) return 'gerade eben';
    if(s < 3600) return Math.floor(s/60) + ' Min.';
    if(s < 86400) return Math.floor(s/3600) + ' Std.';
    if(s < 604800) return Math.floor(s/86400) + ' Tage';
    return date.toLocaleDateString('de-DE');
}

const _exports = { loadDevNotifications, toggleDevNotifications, openDevNotif, markAllDevNotifsRead };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
