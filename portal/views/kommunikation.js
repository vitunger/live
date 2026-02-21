/**
 * views/kommunikation.js - Partner-Portal Kommunikation
 *
 * Handles: Chat (channels, inbox), Announcements, Community/Forum,
 *          Realtime subscriptions, Message sending, Badge updates
 *
 * Globals via safe helpers: sb, sbUser, sbProfile, escH, t, triggerPush, showToast
 *
 * @module views/kommunikation
 */

// -- safe access to globals --
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// === KOMMUNIKATION v3.0: Teams-Hybrid Layout ===
var kommState = {
    activeConv: null,       // {type:'channel'|'inbox'|'announce', id:..., name:...}
    convList: [],           // all conversations for sidebar
    unreadInbox: 0,
    unreadAnnounce: 0,
    replyTo: null,          // {id, author, preview} for thread reply
    allUsers: [],           // cached users for recipient selection
    kanaele: [],
    realtimeSub: null,
    currentForumPost: null
};

// =============================================
//  SIDEBAR: Load & render conversation list
// =============================================
export async function loadKommSidebar() {
    var container = document.getElementById('kommConvList');
    if(!container) return;
    var uid = _sbUser() ? _sbUser().id : null;
    var standortId = _sbProfile() ? _sbProfile().standort_id : null;

    try {
        // 1. Load channels
        var chResp = await _sb().from('chat_kanaele').select('*').order('created_at');
        if(!chResp.error) kommState.kanaele = chResp.data || [];

        // 2. Load inbox conversations (grouped by partner)
        var inboxResp = await _sb().from('nachrichten').select('*, absender:von_user_id(name), empfaenger:an_user_id(name)')
            .or('von_user_id.eq.' + uid + ',an_user_id.eq.' + uid + (standortId ? ',an_standort_id.eq.' + standortId : ''))
            .order('created_at', {ascending: false});
        var inboxMsgs = !inboxResp.error ? (inboxResp.data || []) : [];

        // Group inbox by conversation partner
        var inboxConvs = {};
        inboxMsgs.forEach(function(m) {
            var isSender = m.von_user_id === uid;
            var partnerId = isSender ? m.an_user_id : m.von_user_id;
            var partnerName = isSender ? (m.empfaenger ? m.empfaenger.name : 'Unbekannt') : (m.absender ? m.absender.name : 'Unbekannt');
            if(!partnerId) { partnerId = 'standort'; partnerName = 'Standort-Nachrichten'; }
            if(!inboxConvs[partnerId]) {
                inboxConvs[partnerId] = { partnerId: partnerId, partnerName: partnerName, lastMsg: m, unread: 0, messages: [] };
            }
            inboxConvs[partnerId].messages.push(m);
            if(!isSender && !m.gelesen) inboxConvs[partnerId].unread++;
        });

        // 3. Count unread
        kommState.unreadInbox = 0;
        Object.values(inboxConvs).forEach(function(c) { kommState.unreadInbox += c.unread; });

        // 4. Announcements unread count
        var ankResp = await _sb().from('ankuendigungen').select('id');
        var ankAll = !ankResp.error ? (ankResp.data || []) : [];
        var gelesenResp = await _sb().from('ankuendigungen_gelesen').select('ankuendigung_id').eq('user_id', uid || '');
        var gelesenIds = !gelesenResp.error ? (gelesenResp.data || []).map(function(g){return g.ankuendigung_id;}) : [];
        kommState.unreadAnnounce = ankAll.filter(function(a) { return gelesenIds.indexOf(a.id) === -1; }).length;

        // Build sidebar HTML
        var html = '';

        // --- Split channels into Netzwerk vs Standort ---
        var netzwerkKanaele = kommState.kanaele.filter(function(k) { return !k.standort_id; });
        var standortKanaele = kommState.kanaele.filter(function(k) { return !!k.standort_id; });

        // Netzwerk-Kanäle (global, blau)
        html += '<div class="px-3 pt-3 pb-1 flex items-center justify-between"><span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">🌐 Netzwerk</span></div>';
        if(netzwerkKanaele.length === 0) {
            html += '<div class="mx-2 px-3 py-1.5 text-[11px] text-gray-400">Keine Netzwerk-Kanäle</div>';
        }
        netzwerkKanaele.forEach(function(k) {
            var isActive = kommState.activeConv && kommState.activeConv.type === 'channel' && kommState.activeConv.id === k.id;
            html += '<div class="komm-conv-item mx-2 px-3 py-2.5 rounded-lg cursor-pointer flex items-center space-x-3 ' + (isActive ? 'bg-blue-50 border-l-3 border-blue-500' : 'hover:bg-gray-100') + '" onclick="openKommConv(\'channel\',\'' + k.id + '\',\'' + _escH(k.name).replace(/'/g,"\\'") + '\')">';
            html += '<div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">#</div>';
            html += '<div class="flex-1 min-w-0"><p class="text-sm font-semibold text-gray-800 truncate">' + _escH(k.name) + '</p>';
            html += '<p class="text-[11px] text-blue-500 truncate">Netzwerk-Kanal</p></div>';
            html += '</div>';
        });

        // Standort-Kanäle (lokal, orange)
        var standortName = _sbProfile() && _sbProfile().standort_id ? (typeof standorte !== 'undefined' && Array.isArray(standorte) ? (standorte.find(function(s){return s.id===_sbProfile().standort_id})||{}).name : '') : '';
        html += '<div class="px-3 pt-4 pb-1 flex items-center justify-between"><span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">🏪 ' + (standortName ? _escH(standortName) : 'Mein Standort') + '</span>';
        html += '<button onclick="kommCreateKanal()" class="text-gray-400 hover:text-vit-orange" title="Neuen Kanal erstellen"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg></button>';
        html += '</div>';
        if(standortKanaele.length === 0) {
            html += '<div class="mx-2 px-3 py-1.5 text-[11px] text-gray-400">Keine Standort-Kanäle</div>';
        }
        standortKanaele.forEach(function(k) {
            var isActive = kommState.activeConv && kommState.activeConv.type === 'channel' && kommState.activeConv.id === k.id;
            html += '<div class="komm-conv-item mx-2 px-3 py-2.5 rounded-lg cursor-pointer flex items-center space-x-3 ' + (isActive ? 'bg-vit-orange/10 border-l-3 border-vit-orange' : 'hover:bg-gray-100') + '" onclick="openKommConv(\'channel\',\'' + k.id + '\',\'' + _escH(k.name).replace(/'/g,"\\'") + '\')">';
            html += '<div class="w-8 h-8 bg-vit-orange rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0">#</div>';
            html += '<div class="flex-1 min-w-0"><p class="text-sm font-semibold text-gray-800 truncate">' + _escH(k.name) + '</p>';
            html += '<p class="text-[11px] text-vit-orange truncate">Standort-Kanal</p></div>';
            html += '</div>';
        });

        // --- Announcements ---
        html += '<div class="px-3 pt-4 pb-1 flex items-center justify-between"><span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ankündigungen</span>';
        if(kommState.unreadAnnounce > 0) html += '<span class="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">' + kommState.unreadAnnounce + '</span>';
        html += '</div>';
        var isAnnActive = kommState.activeConv && kommState.activeConv.type === 'announce';
        html += '<div class="komm-conv-item mx-2 px-3 py-2.5 rounded-lg cursor-pointer flex items-center space-x-3 ' + (isAnnActive ? 'bg-vit-orange/10' : 'hover:bg-gray-100') + '" onclick="openKommConv(\'announce\',\'all\',\'Ankündigungen\')">';
        html += '<div class="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-white text-sm">📢</div>';
        html += '<div class="flex-1 min-w-0"><p class="text-sm font-semibold text-gray-800">Alle Ankündigungen</p>';
        html += '<p class="text-[11px] text-gray-400">Von der Zentrale</p></div>';
        if(kommState.unreadAnnounce > 0) html += '<span class="w-2.5 h-2.5 bg-red-500 rounded-full flex-shrink-0"></span>';
        html += '</div>';

        // --- Inbox Conversations ---
        html += '<div class="px-3 pt-4 pb-1 flex items-center justify-between"><span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nachrichten</span>';
        if(kommState.unreadInbox > 0) html += '<span class="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">' + kommState.unreadInbox + '</span>';
        html += '</div>';

        var sortedConvs = Object.values(inboxConvs).sort(function(a,b) { return new Date(b.lastMsg.created_at) - new Date(a.lastMsg.created_at); });
        if(sortedConvs.length === 0) {
            html += '<div class="mx-2 px-3 py-2 text-xs text-gray-400 text-center">Keine Nachrichten</div>';
        }
        sortedConvs.forEach(function(conv) {
            var isActive = kommState.activeConv && kommState.activeConv.type === 'inbox' && kommState.activeConv.id === conv.partnerId;
            var initials = conv.partnerName.split(' ').map(function(n){return n[0];}).join('').substring(0,2);
            var colors = ['bg-emerald-500','bg-blue-500','bg-purple-500','bg-pink-500','bg-cyan-500','bg-red-500'];
            var ci = conv.partnerName.split('').reduce(function(a,c){return a+c.charCodeAt(0);},0) % colors.length;
            var lastDate = new Date(conv.lastMsg.created_at);
            var timeStr = isToday(lastDate) ? lastDate.getHours()+':'+String(lastDate.getMinutes()).padStart(2,'0') : lastDate.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
            var preview = conv.lastMsg.betreff || conv.lastMsg.inhalt || '';
            if(preview.length > 40) preview = preview.substring(0,40) + '…';

            html += '<div class="komm-conv-item mx-2 px-3 py-2.5 rounded-lg cursor-pointer flex items-center space-x-3 ' + (isActive ? 'bg-vit-orange/10' : 'hover:bg-gray-100') + '" onclick="openKommConv(\'inbox\',\'' + conv.partnerId + '\',\'' + _escH(conv.partnerName).replace(/'/g,"\\'") + '\')">';
            html += '<div class="w-8 h-8 ' + colors[ci] + ' rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">' + initials + '</div>';
            html += '<div class="flex-1 min-w-0"><div class="flex items-center justify-between"><p class="text-sm font-semibold text-gray-800 truncate">' + _escH(conv.partnerName) + '</p><span class="text-[10px] text-gray-400 flex-shrink-0 ml-1">' + timeStr + '</span></div>';
            html += '<p class="text-[11px] text-gray-500 truncate ' + (conv.unread > 0 ? 'font-semibold text-gray-700' : '') + '">' + _escH(preview) + '</p></div>';
            if(conv.unread > 0) html += '<span class="bg-vit-orange text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">' + conv.unread + '</span>';
            html += '</div>';
        });

        container.innerHTML = html;
        updateKommBadges();

    } catch(err) {
        console.error('Sidebar laden:', err);
        container.innerHTML = '<div class="p-4 text-xs text-red-400">Fehler: ' + err.message + '</div>';
    }
}

function isToday(d) { var t = new Date(); return d.getDate()===t.getDate() && d.getMonth()===t.getMonth() && d.getFullYear()===t.getFullYear(); }

export function filterKommSidebar(q) {
    q = q.toLowerCase();
    document.querySelectorAll('.komm-conv-item').forEach(function(el) {
        el.style.display = (!q || el.textContent.toLowerCase().indexOf(q) !== -1) ? '' : 'none';
    });
}

// =============================================
//  OPEN CONVERSATION (right pane)
// =============================================
export async function openKommConv(type, id, name) {
    kommState.activeConv = { type: type, id: id, name: name };
    kommState.replyTo = null;
    document.getElementById('kommReplyBar').classList.add('hidden');
    document.getElementById('kommChatInput').style.display = '';

    // Update header
    var avatar = document.getElementById('kommChatAvatar');
    var title = document.getElementById('kommChatTitle');
    var subtitle = document.getElementById('kommChatSubtitle');
    var actions = document.getElementById('kommChatHeaderActions');
    title.textContent = name;
    actions.innerHTML = '';

    if(type === 'channel') {
        var kanal = kommState.kanaele.find(function(k){return k.id===id;});
        var isNetzwerk = kanal && !kanal.standort_id;
        avatar.className = 'w-9 h-9 ' + (isNetzwerk ? 'bg-blue-500' : 'bg-vit-orange') + ' rounded-lg flex items-center justify-center text-white font-bold text-sm';
        avatar.textContent = '#';
        var kanalLabel = isNetzwerk ? '🌐 Netzwerk-Kanal' : '🏪 Standort-Kanal';
        subtitle.textContent = (kanal && kanal.beschreibung ? kanal.beschreibung + ' · ' : '') + kanalLabel;
        await loadChannelMessages(id);
        subscribeToChannel(id);
    } else if(type === 'inbox') {
        var initials = name.split(' ').map(function(n){return n[0];}).join('').substring(0,2);
        var colors = ['bg-emerald-500','bg-blue-500','bg-purple-500','bg-pink-500','bg-cyan-500','bg-red-500'];
        var ci = name.split('').reduce(function(a,c){return a+c.charCodeAt(0);},0) % colors.length;
        avatar.className = 'w-9 h-9 ' + colors[ci] + ' rounded-full flex items-center justify-center text-white font-bold text-sm';
        avatar.textContent = initials;
        subtitle.textContent = 'Direktnachricht';
        await loadInboxConversation(id);
    } else if(type === 'announce') {
        avatar.className = 'w-9 h-9 bg-yellow-500 rounded-lg flex items-center justify-center text-white text-sm';
        avatar.textContent = '📢';
        subtitle.textContent = 'Ankündigungen von der Zentrale';
        document.getElementById('kommChatInput').style.display = _sbProfile() && _sbProfile().is_hq ? '' : 'none';
        await loadAnnouncements();
    }

    // Re-highlight sidebar
    loadKommSidebar();
}

// =============================================
//  CHANNEL MESSAGES
// =============================================
export async function loadChannelMessages(kanalId) {
    var container = document.getElementById('kommChatMessages');
    container.innerHTML = '<div class="flex justify-center py-8"><span class="text-gray-400 text-sm">Nachrichten laden...</span></div>';

    try {
        var resp = await _sb().from('chat_nachrichten').select('*, users(name)')
            .eq('kanal_id', kanalId).order('created_at', {ascending:true});
        if(resp.error) throw resp.error;

        var messages = resp.data || [];
        container.innerHTML = renderChatBubbles(messages, 'channel');
        container.scrollTop = container.scrollHeight;
    } catch(err) {
        container.innerHTML = '<div class="text-center py-8 text-red-400 text-sm">Fehler: ' + err.message + '</div>';
    }
}

export function subscribeToChannel(kanalId) {
    if(kommState.realtimeSub) { _sb().removeChannel(kommState.realtimeSub); kommState.realtimeSub = null; }
    kommState.realtimeSub = _sb().channel('komm-chat-' + kanalId)
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'chat_nachrichten',
            filter: 'kanal_id=eq.' + kanalId
        }, async function(payload) {
            var msg = payload.new;
            if(msg.user_id === (_sbUser() ? _sbUser().id : null)) return;
            var userResp = await _sb().from('users').select('name').eq('id', msg.user_id).single();
            msg.users = userResp.data || { name: 'Unbekannt' };
            var container = document.getElementById('kommChatMessages');
            if(!container) return;
            var bubble = renderSingleBubble(msg, 'channel');
            container.insertAdjacentHTML('beforeend', bubble);
            container.scrollTop = container.scrollHeight;
        }).subscribe();
}

// =============================================
//  INBOX CONVERSATION (1:1 messages)
// =============================================
export async function loadInboxConversation(partnerId) {
    var container = document.getElementById('kommChatMessages');
    container.innerHTML = '<div class="flex justify-center py-8"><span class="text-gray-400 text-sm">Nachrichten laden...</span></div>';
    var uid = _sbUser() ? _sbUser().id : null;

    try {
        var resp = await _sb().from('nachrichten').select('*, absender:von_user_id(name), empfaenger:an_user_id(name)')
            .or('and(von_user_id.eq.' + uid + ',an_user_id.eq.' + partnerId + '),and(von_user_id.eq.' + partnerId + ',an_user_id.eq.' + uid + ')')
            .order('created_at', {ascending:true});
        if(resp.error) throw resp.error;

        var msgs = resp.data || [];

        // Mark unread as read
        var unreadIds = msgs.filter(function(m){ return m.an_user_id === uid && !m.gelesen; }).map(function(m){return m.id;});
        if(unreadIds.length > 0) {
            for(var i=0;i<unreadIds.length;i++) {
                await _sb().from('nachrichten').update({gelesen:true}).eq('id', unreadIds[i]);
            }
            kommState.unreadInbox = Math.max(0, kommState.unreadInbox - unreadIds.length);
            updateKommBadges();
        }

        container.innerHTML = renderInboxBubbles(msgs);
        container.scrollTop = container.scrollHeight;
    } catch(err) {
        container.innerHTML = '<div class="text-center py-8 text-red-400 text-sm">Fehler: ' + err.message + '</div>';
    }
}

export function renderInboxBubbles(msgs) {
    if(msgs.length === 0) return '<div class="flex items-center justify-center h-full text-gray-400 text-sm">Noch keine Nachrichten in dieser Konversation</div>';
    var uid = _sbUser() ? _sbUser().id : null;
    var html = '';
    var lastDateStr = '';

    msgs.forEach(function(m) {
        var d = new Date(m.created_at);
        var dateStr = d.toLocaleDateString('de-DE', {weekday:'short', day:'numeric', month:'long'});
        if(dateStr !== lastDateStr) {
            html += '<div class="flex justify-center my-4"><span class="text-[11px] bg-gray-100 text-gray-500 px-3 py-1 rounded-full">' + dateStr + '</span></div>';
            lastDateStr = dateStr;
        }

        var isMe = m.von_user_id === uid;
        var authorName = isMe ? 'Du' : (m.absender ? m.absender.name : 'Unbekannt');
        var time = d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');

        html += '<div class="flex ' + (isMe ? 'justify-end' : 'justify-start') + ' mb-2 group">';
        html += '<div class="max-w-[70%] ' + (isMe ? 'bg-vit-orange/10 border border-vit-orange/20' : 'bg-gray-100') + ' rounded-2xl ' + (isMe ? 'rounded-tr-sm' : 'rounded-tl-sm') + ' px-4 py-2.5">';
        if(m.betreff) html += '<p class="text-[11px] font-bold text-gray-500 mb-1">' + _escH(m.betreff) + '</p>';
        html += '<p class="text-sm text-gray-800">' + _escH(m.inhalt) + '</p>';
        html += '<div class="flex items-center justify-between mt-1.5">';
        html += '<span class="text-[10px] text-gray-400">' + time + '</span>';
        if(!isMe) html += '<button onclick="setReply(\'' + m.id + '\',\'' + _escH(authorName).replace(/'/g,"\\'") + '\',\'' + _escH(m.inhalt).substring(0,50).replace(/'/g,"\\'") + '\')" class="text-[10px] text-vit-orange font-semibold opacity-0 group-hover:opacity-100 ml-3 hover:underline">↩ Antworten</button>';
        html += '</div></div></div>';
    });
    return html;
}

// =============================================
//  ANNOUNCEMENTS in chat view
// =============================================
export async function loadAnnouncements() {
    var container = document.getElementById('kommChatMessages');
    container.innerHTML = '<div class="flex justify-center py-8"><span class="text-gray-400 text-sm">Ankündigungen laden...</span></div>';

    try {
        var resp = await _sb().from('ankuendigungen').select('*, users(name)').order('created_at', {ascending:false});
        if(resp.error) throw resp.error;
        var anns = resp.data || [];

        var gelesenResp = await _sb().from('ankuendigungen_gelesen').select('ankuendigung_id').eq('user_id', _sbUser() ? _sbUser().id : '');
        var gelesenIds = !gelesenResp.error ? (gelesenResp.data||[]).map(function(g){return g.ankuendigung_id;}) : [];

        var icons = {news:'📢',event:'📅',schulung:'🎓',marketing:'📣',sortiment:'🚲',preise:'💰',it:'💻'};
        var html = '';
        anns.forEach(function(a) {
            var d = new Date(a.created_at);
            var dateStr = d.toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'long',year:'numeric'});
            var time = d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');
            var gelesen = gelesenIds.indexOf(a.id) !== -1;
            var authorName = a.users ? a.users.name : 'Zentrale';

            html += '<div class="mb-4 group ' + (gelesen ? 'opacity-60' : '') + '">';
            html += '<div class="flex justify-center mb-2"><span class="text-[11px] bg-gray-100 text-gray-500 px-3 py-1 rounded-full">' + dateStr + ' · ' + time + '</span></div>';
            html += '<div class="bg-gradient-to-r ' + (a.wichtig ? 'from-red-50 to-orange-50 border border-red-200' : 'from-blue-50 to-indigo-50 border border-blue-200') + ' rounded-2xl px-5 py-4">';
            html += '<div class="flex items-start space-x-3">';
            html += '<div class="text-2xl flex-shrink-0">' + (icons[a.kategorie] || '📢') + '</div>';
            html += '<div class="flex-1">';
            html += '<div class="flex items-center space-x-2 mb-1">';
            if(a.wichtig) html += '<span class="text-[10px] font-bold bg-red-100 text-red-600 rounded px-1.5 py-0.5">Wichtig</span>';
            if(!gelesen) html += '<span class="text-[10px] font-bold bg-blue-100 text-blue-600 rounded px-1.5 py-0.5">Neu</span>';
            html += '<span class="text-[11px] text-gray-400">' + _escH(authorName) + '</span>';
            html += '</div>';
            html += '<h3 class="font-bold text-gray-800 text-sm mb-1">' + _escH(a.titel) + '</h3>';
            html += '<p class="text-sm text-gray-600">' + _escH(a.inhalt) + '</p>';
            if(!gelesen) html += '<button onclick="markAnkGelesen(\'' + a.id + '\',this)" class="mt-2 text-xs text-green-600 font-semibold hover:underline">✓ Als gelesen markieren</button>';
            html += '</div></div></div></div>';
        });

        if(anns.length === 0) html = '<div class="flex items-center justify-center h-full text-gray-400 text-sm">Keine Ankündigungen</div>';
        container.innerHTML = html;
    } catch(err) {
        container.innerHTML = '<div class="text-center py-8 text-red-400 text-sm">Fehler: ' + err.message + '</div>';
    }
}

export async function markAnkGelesen(id, btn) {
    if(!sbUser) return;
    try {
        await _sb().from('ankuendigungen_gelesen').upsert({ankuendigung_id: id, user_id: _sbUser().id});
        var card = btn.closest('.mb-4.group');
        if(card) card.classList.add('opacity-60');
        btn.remove();
        kommState.unreadAnnounce = Math.max(0, kommState.unreadAnnounce - 1);
        updateKommBadges();
    } catch(err) { console.error('Gelesen markieren:', err); }
}

// =============================================
//  RENDER CHAT BUBBLES (Channel)
// =============================================
export function renderChatBubbles(messages, type) {
    if(messages.length === 0) return '<div class="flex items-center justify-center h-full text-gray-400 text-sm"><div class="text-center"><div class="text-3xl mb-2">👋</div><p>Noch keine Nachrichten. Schreib die erste!</p></div></div>';
    var uid = _sbUser() ? _sbUser().id : null;
    var html = '';
    var lastDateStr = '';
    var lastAuthor = '';

    messages.forEach(function(m) {
        var d = new Date(m.created_at);
        var dateStr = d.toLocaleDateString('de-DE', {weekday:'short', day:'numeric', month:'long'});
        if(dateStr !== lastDateStr) {
            html += '<div class="flex justify-center my-4"><span class="text-[11px] bg-gray-100 text-gray-500 px-3 py-1 rounded-full">' + dateStr + '</span></div>';
            lastDateStr = dateStr;
            lastAuthor = '';
        }
        html += renderSingleBubble(m, type, lastAuthor === m.user_id);
        lastAuthor = m.user_id;
    });
    return html;
}

export function renderSingleBubble(m, type, isConsecutive) {
    var uid = _sbUser() ? _sbUser().id : null;
    var isMe = (type === 'channel') ? m.user_id === uid : m.von_user_id === uid;
    var authorName = m.users ? m.users.name : (m.absender ? m.absender.name : 'Unbekannt');
    var initials = authorName.split(' ').map(function(n){return n[0];}).join('').substring(0,2);
    var colors = ['bg-blue-500','bg-green-600','bg-purple-500','bg-cyan-600','bg-pink-500','bg-red-500','bg-teal-500'];
    var ci = authorName.split('').reduce(function(a,c){return a+c.charCodeAt(0);},0) % colors.length;
    var d = new Date(m.created_at);
    var time = d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');
    var text = type === 'channel' ? m.nachricht : m.inhalt;

    var html = '<div class="flex items-start space-x-2.5 group ' + (isConsecutive ? 'mt-0.5' : 'mt-3') + '">';
    if(!isConsecutive) {
        html += '<div class="w-8 h-8 ' + (isMe ? 'bg-vit-orange' : colors[ci]) + ' rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">' + initials + '</div>';
    } else {
        html += '<div class="w-8 flex-shrink-0 flex items-center justify-center"><span class="text-[9px] text-gray-300 opacity-0 group-hover:opacity-100">' + time + '</span></div>';
    }
    html += '<div class="flex-1 min-w-0">';
    if(!isConsecutive) {
        html += '<div class="flex items-baseline space-x-2 mb-0.5"><span class="text-sm font-semibold ' + (isMe ? 'text-vit-orange' : 'text-gray-800') + '">' + _escH(authorName) + '</span><span class="text-[10px] text-gray-400">' + time + '</span></div>';
    }
    html += '<div class="text-sm text-gray-700 hover:bg-gray-50 rounded px-1 -mx-1 py-0.5 relative group">' + _escH(text).replace(/\n/g, '<br>');
    // Reply button (thread)
    html += '<button onclick="setReply(\'' + m.id + '\',\'' + _escH(authorName).replace(/'/g,"\\'") + '\',\'' + _escH(text).substring(0,50).replace(/'/g,"\\'").replace(/\n/g,' ') + '\')" class="absolute right-1 top-0 text-[10px] text-gray-400 hover:text-vit-orange opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-sm border">↩</button>';
    html += '</div></div></div>';
    return html;
}

// =============================================
//  REPLY / THREAD
// =============================================
export function setReply(msgId, author, preview) {
    kommState.replyTo = { id: msgId, author: author, preview: preview };
    document.getElementById('kommReplyBar').classList.remove('hidden');
    document.getElementById('kommReplyTo').textContent = author;
    document.getElementById('kommReplyPreview').textContent = preview;
    document.getElementById('kommMsgInput').focus();
}

export function cancelReply() {
    kommState.replyTo = null;
    document.getElementById('kommReplyBar').classList.add('hidden');
}

// =============================================
//  SEND MESSAGE (unified)
// =============================================
export async function kommSendMessage() {
    var input = document.getElementById('kommMsgInput');
    var text = input.value.trim();
    if(!text || !sbUser || !kommState.activeConv) return;

    input.value = '';
    input.style.height = 'auto';
    input.disabled = true;
    var replyCtx = kommState.replyTo ? (' [↩ ' + kommState.replyTo.author + ': ' + kommState.replyTo.preview + ']') : '';
    cancelReply();

    try {
        var conv = kommState.activeConv;
        if(conv.type === 'channel') {
            var resp = await _sb().from('chat_nachrichten').insert({
                kanal_id: conv.id, user_id: _sbUser().id, nachricht: replyCtx ? text + '\n' + replyCtx : text
            });
            if(resp.error) throw resp.error;
            // Push: notify channel members
            (async function() { try { var { data: members } = await _sb().from('kanal_mitglieder').select('user_id').eq('kanal_id', conv.id); if (members) { var sn = _sbProfile() ? _sbProfile().name : 'Jemand'; var ids = members.map(function(m){return m.user_id;}).filter(function(id){return id !== _sbUser().id;}); _triggerPush(ids, '💬 ' + sn, text.substring(0,100), '/?view=kommunikation', 'push_neue_nachricht'); } } catch(e){} })();
            // Optimistic append
            var container = document.getElementById('kommChatMessages');
            var emptyMsg = container.querySelector('.text-center');
            if(emptyMsg && container.children.length === 1) container.innerHTML = '';
            container.insertAdjacentHTML('beforeend', renderSingleBubble({
                user_id: _sbUser().id, users: {name: _sbProfile() ? _sbProfile().name : 'Ich'},
                nachricht: replyCtx ? text + '\n' + replyCtx : text, created_at: new Date().toISOString()
            }, 'channel', false));
            container.scrollTop = container.scrollHeight;

        } else if(conv.type === 'inbox') {
            var resp = await _sb().from('nachrichten').insert({
                von_user_id: _sbUser().id, an_user_id: conv.id,
                betreff: '', inhalt: replyCtx ? text + '\n' + replyCtx : text,
                kategorie: 'direkt'
            });
            if(resp.error) throw resp.error;
            _triggerPush([conv.id], '✉️ ' + (_sbProfile() ? _sbProfile().name : 'Nachricht'), text.substring(0,100), '/?view=kommunikation', 'push_neue_nachricht');
            await loadInboxConversation(conv.id);

        } else if(conv.type === 'announce') {
            // Only HQ can post announcements via chat
            if(_sbProfile() && _sbProfile().is_hq) {
                var resp = await _sb().from('ankuendigungen').insert({
                    erstellt_von: _sbUser().id, titel: text.split('\n')[0].substring(0,80),
                    inhalt: text, kategorie: 'news', wichtig: false
                });
                if(resp.error) throw resp.error;
                (async function() { try { var { data: au } = await _sb().from('user_profiles').select('user_id'); if(au) { var ids = au.map(function(u){return u.user_id;}).filter(function(id){return id!==_sbUser().id;}); _triggerPush(ids, '📢 Ankündigung', text.split('\n')[0].substring(0,60), '/?view=kommunikation', 'push_ankuendigung'); } } catch(e){} })();
                await loadAnnouncements();
            }
        }
    } catch(err) {
        alert('Senden fehlgeschlagen: ' + err.message);
        input.value = text;
    } finally {
        input.disabled = false;
        input.focus();
    }
}

export function kommInputKeydown(e) {
    if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); kommSendMessage(); }
}

export function kommAutoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// =============================================
//  NEW CHAT (compose to new recipient)
// =============================================
export async function kommStartNewChat() {
    if(kommState.allUsers.length === 0) {
        var resp = await _sb().from('users').select('id, name, is_hq, standorte(name)').eq('status','aktiv').order('name');
        if(!resp.error) kommState.allUsers = (resp.data||[]).filter(function(u){return u.id !== (_sbUser() ?_sbUser().id:null);});
    }

    var container = document.getElementById('kommChatMessages');
    document.getElementById('kommChatInput').style.display = '';
    document.getElementById('kommChatTitle').textContent = 'Neue Nachricht';
    document.getElementById('kommChatSubtitle').textContent = 'Empfänger wählen';
    document.getElementById('kommChatAvatar').className = 'w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-sm';
    document.getElementById('kommChatAvatar').textContent = '+';

    var html = '<div class="p-4"><div class="mb-4">';
    html += '<select id="kommNewChatRecipient" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-vit-orange" onchange="kommSelectNewRecipient(this.value)">';
    html += '<option value="">– Empfänger wählen –</option>';
    kommState.allUsers.forEach(function(u) {
        var label = u.name + (u.standorte ? ' (' + u.standorte.name + ')' : (u.is_hq ? ' (HQ)' : ''));
        html += '<option value="' + u.id + '" data-name="' + _escH(label) + '">' + _escH(label) + '</option>';
    });
    html += '</select></div>';
    html += '<div class="text-center text-gray-400 text-sm mt-8"><div class="text-3xl mb-2">✉️</div><p>Wähle einen Empfänger, um die Konversation zu starten</p></div></div>';

    container.innerHTML = html;
    kommState.activeConv = null;
}

export function kommSelectNewRecipient(userId) {
    if(!userId) return;
    var sel = document.getElementById('kommNewChatRecipient');
    var opt = sel.options[sel.selectedIndex];
    var name = opt.getAttribute('data-name') || opt.textContent;
    openKommConv('inbox', userId, name);
}

// =============================================
//  BADGES
// =============================================
// =============================================
//  CREATE KANAL
// =============================================
export async function kommCreateKanal() {
    var name = prompt('Name des neuen Kanals:');
    if(!name || !name.trim()) return;
    var beschreibung = prompt('Kurze Beschreibung (optional):') || '';
    try {
        var isHQ = _sbProfile() && _sbProfile().is_hq;
        var resp = await _sb().from('chat_kanaele').insert({
            name: name.trim(),
            beschreibung: beschreibung.trim() || null,
            standort_id: isHQ ? null : (_sbProfile() ? _sbProfile().standort_id : null),
            erstellt_von: _sbUser().id,
            ist_privat: false
        });
        if(resp.error) throw resp.error;
        await loadKommSidebar();
    } catch(err) { alert('Fehler: ' + err.message); }
}

export function updateKommBadges() {
    var total = kommState.unreadInbox + kommState.unreadAnnounce;
    // Sidebar badge
    var sidebarBtn = document.querySelector('[data-module="kommunikation"]');
    if(sidebarBtn) {
        var sBadge = sidebarBtn.querySelector('.komm-sidebar-badge');
        if(total > 0) {
            if(!sBadge) {
                sidebarBtn.insertAdjacentHTML('beforeend', '<span class="komm-sidebar-badge ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center">' + total + '</span>');
            } else {
                sBadge.textContent = total;
            }
        } else if(sBadge) { sBadge.remove(); }
    }
    // Chat tab badge
    var chatBtn = document.querySelector('.komm-tab-btn[data-tab="chat"]');
    if(chatBtn) {
        var cBadge = chatBtn.querySelector('.komm-chat-badge');
        if(total > 0) {
            if(!cBadge) {
                chatBtn.insertAdjacentHTML('beforeend', ' <span class="komm-chat-badge bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 ml-1">' + total + '</span>');
            } else {
                cBadge.textContent = total;
            }
        } else if(cBadge) { cBadge.remove(); }
    }
}

// =============================================
//  COMMUNITY (merged Forum + Brett)
// =============================================
var communityMarktplatzCats = ['suche','biete','tipp'];

export async function renderCommunityPosts(cat) {
    var container = document.getElementById('forumPosts');
    if(!container) return;
    container.innerHTML = '<div class="text-center py-4"><span class="text-gray-400 text-sm">Beiträge werden geladen...</span></div>';

    try {
        // Load forum posts
        var fQuery = _sb().from('forum_beitraege').select('*, users(name)').order('gepinnt',{ascending:false}).order('created_at',{ascending:false});
        if(cat && cat !== 'all' && communityMarktplatzCats.indexOf(cat) === -1) fQuery = fQuery.eq('kategorie', cat);
        if(cat && communityMarktplatzCats.indexOf(cat) !== -1) fQuery = fQuery.eq('kategorie', 'NONE_MATCH');
        var fResp = await fQuery;
        var forumPosts = (!fResp.error ? fResp.data : []) || [];

        // Load brett entries
        var bQuery = _sb().from('brett_eintraege').select('*, users(name)').eq('aktiv', true).order('created_at',{ascending:false});
        if(cat && cat !== 'all' && communityMarktplatzCats.indexOf(cat) !== -1) bQuery = bQuery.eq('kategorie', cat);
        if(cat && cat !== 'all' && communityMarktplatzCats.indexOf(cat) === -1) bQuery = bQuery.eq('kategorie', 'NONE_MATCH');
        var bResp = await bQuery;
        var brettPosts = (!bResp.error ? bResp.data : []) || [];

        // Merge into unified list
        var allPosts = [];
        forumPosts.forEach(function(p) {
            allPosts.push({ source:'forum', id:p.id, titel:p.titel, inhalt:p.inhalt, kategorie:p.kategorie, user_id:p.user_id, users:p.users, created_at:p.created_at, gepinnt:p.gepinnt });
        });
        brettPosts.forEach(function(p) {
            allPosts.push({ source:'brett', id:p.id, titel:p.titel, inhalt:p.beschreibung, kategorie:p.kategorie, user_id:p.user_id, users:p.users, created_at:p.created_at, gepinnt:false });
        });

        // Sort: pinned first, then by date
        allPosts.sort(function(a,b) {
            if(a.gepinnt && !b.gepinnt) return -1;
            if(!a.gepinnt && b.gepinnt) return 1;
            return new Date(b.created_at) - new Date(a.created_at);
        });

        // Load comment counts for forum posts
        var commentCounts = {};
        for(var i=0;i<forumPosts.length;i++) {
            var cr = await _sb().from('forum_kommentare').select('id',{count:'exact',head:true}).eq('beitrag_id', forumPosts[i].id);
            commentCounts[forumPosts[i].id] = cr.count || 0;
        }

        var catColors = {
            allgemein:'bg-gray-100 text-gray-700', verkauf:'bg-purple-100 text-purple-700', werkstatt:'bg-cyan-100 text-cyan-700',
            einkauf:'bg-yellow-100 text-yellow-700', zentrale:'bg-orange-100 text-orange-700', news:'bg-vit-orange text-white',
            suche:'bg-red-100 text-red-700', biete:'bg-green-100 text-green-700', tipp:'bg-blue-100 text-blue-700', frage:'bg-indigo-100 text-indigo-700'
        };
        var catLabels = {
            allgemein:'💬 Allgemein', verkauf:'🛒 Verkauf', werkstatt:'🔧 Werkstatt', einkauf:'📦 Einkauf',
            zentrale:'Zentrale', news:'News', suche:'🔍 Gesucht', biete:'🏷️ Biete', tipp:'💡 Tipp', frage:'❓ Frage'
        };

        var html = '';
        if(allPosts.length===0) html = '<div class="text-center py-8"><span class="text-gray-400 text-sm">Keine Beiträge. Starte die Diskussion!</span></div>';

        allPosts.forEach(function(p) {
            var authorName = p.users ? p.users.name : 'Unbekannt';
            var initials = authorName.split(' ').map(function(n){return n[0];}).join('').substring(0,2);
            var colors = ['bg-blue-500','bg-green-600','bg-purple-500','bg-cyan-600','bg-pink-500','bg-red-500'];
            var colorIdx = authorName.split('').reduce(function(a,c){return a+c.charCodeAt(0);},0) % colors.length;
            var d = new Date(p.created_at);
            var dateStr = d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) + ' · ' + d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');
            var isOwn = p.user_id === (_sbUser() ? _sbUser().id : null);
            var isHQ = _sbProfile() && _sbProfile().is_hq;
            var isMarkt = communityMarktplatzCats.indexOf(p.kategorie) !== -1;
            var replyCount = commentCounts[p.id] || 0;

            html += '<div class="vit-card p-5 hover:shadow-md transition cursor-pointer ' + (p.gepinnt ? 'border-l-4 border-vit-orange' : '') + (isMarkt ? ' border-l-4 border-green-400' : '') + '" ' + (p.source==='forum' ? 'onclick="openForumDetail(\'' + p.id + '\')"' : '') + '>';
            html += '<div class="flex items-start space-x-4">';
            html += '<div class="w-10 h-10 ' + (p.gepinnt ? 'bg-vit-orange' : colors[colorIdx]) + ' rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">' + initials + '</div>';
            html += '<div class="flex-1 min-w-0">';
            html += '<div class="flex items-center space-x-2 mb-1 flex-wrap">';
            if(p.gepinnt) html += '<span class="text-xs font-bold bg-yellow-100 text-yellow-700 rounded px-1.5 py-0.5">📌 Angepinnt</span>';
            if(isMarkt) html += '<span class="text-[10px] font-bold bg-green-50 text-green-600 rounded px-1.5 py-0.5 border border-green-200">Marktplatz</span>';
            html += '<span class="text-xs font-semibold rounded px-2 py-0.5 ' + (catColors[p.kategorie]||catColors.allgemein) + '">' + (catLabels[p.kategorie]||p.kategorie) + '</span>';
            if(isOwn || isHQ) {
                if(p.source==='forum') html += '<button onclick="event.stopPropagation();deleteForumPost(\'' + p.id + '\')" class="text-xs text-gray-300 hover:text-red-500 ml-auto" title="Löschen">🗑️</button>';
                if(p.source==='brett') html += '<button onclick="event.stopPropagation();deactivateBrettPost(\'' + p.id + '\')" class="text-xs text-gray-300 hover:text-red-500 ml-auto" title="Entfernen">✕</button>';
            }
            html += '</div>';
            html += '<h3 class="font-bold text-gray-800 mb-1 ' + (p.source==='forum'?'hover:text-vit-orange':'') + '">' + _escH(p.titel) + '</h3>';
            if(p.inhalt) html += '<p class="text-sm text-gray-600 mb-2 line-clamp-2">' + _escH(p.inhalt) + '</p>';
            html += '<div class="flex items-center space-x-4 text-xs text-gray-400">';
            html += '<span class="font-semibold text-gray-600">' + _escH(authorName) + '</span>';
            html += '<span>' + dateStr + '</span>';
            if(p.source==='forum') html += '<span>💬 ' + replyCount + '</span>';
            if(isMarkt && !isOwn) html += '<button onclick="event.stopPropagation();openKommConv(\'inbox\',\'' + p.user_id + '\',\'' + _escH(authorName).replace(/'/g,"\\'") + '\');showKommTab(\'chat\')" class="text-vit-orange font-semibold hover:underline">✉ Nachricht</button>';
            html += '</div></div></div></div>';
        });

        container.innerHTML = html;
    } catch(err) {
        container.innerHTML = '<div class="text-center py-4 text-red-400 text-sm">Fehler: ' + err.message + '</div>';
    }
}

export async function createCommunityPost() {
    var titel = (document.getElementById('forumNewTitle')||{}).value;
    var body = (document.getElementById('forumNewBody')||{}).value;
    var kat = (document.getElementById('forumNewCat')||{}).value || 'allgemein';
    if(!titel||!titel.trim()) { alert(_t('alert_enter_subject')); return; }

    var isMarkt = communityMarktplatzCats.indexOf(kat) !== -1;
    try {
        if(isMarkt) {
            var resp = await _sb().from('brett_eintraege').insert({
                user_id: _sbUser().id, standort_id: _sbProfile() ? _sbProfile().standort_id : null,
                titel: titel.trim(), beschreibung: body ? body.trim() : null, kategorie: kat
            });
            if(resp.error) throw resp.error;
        } else {
            if(!body||!body.trim()) { alert(_t('alert_enter_message')); return; }
            var resp = await _sb().from('forum_beitraege').insert({
                user_id: _sbUser().id, standort_id: _sbProfile() ? _sbProfile().standort_id : null,
                titel: titel.trim(), inhalt: body.trim(), kategorie: kat
            });
            if(resp.error) throw resp.error;
        }
        document.getElementById('forumNewTitle').value = '';
        document.getElementById('forumNewBody').value = '';
        document.getElementById('forumNewPost').classList.add('hidden');
        triggerPushStandort('💬 Neuer Beitrag', (_sbProfile() ?_sbProfile().name:'Jemand') + ': ' + titel.trim().substring(0,60), '/?view=forum', 'push_neue_nachricht');
        renderCommunityPosts('all');
    } catch(err) { alert('Fehler: ' + err.message); }
}

export async function deactivateBrettPost(id) {
    if(!confirm(_t('confirm_delete_entry'))) return;
    try { await _sb().from('brett_eintraege').update({aktiv:false}).eq('id',id); renderCommunityPosts('all'); } catch(err) { alert('Fehler: '+err.message); }
}

export async function deleteForumPost(id) {
    if(!confirm(_t('confirm_delete_post'))) return;
    try {
        await _sb().from('forum_kommentare').delete().eq('beitrag_id', id);
        await _sb().from('forum_beitraege').delete().eq('id', id);
        renderCommunityPosts('all');
    } catch(err) { alert('Fehler: ' + err.message); }
}

export function filterCommunity(cat) {
    document.querySelectorAll('.comm-cat-btn').forEach(function(b){ b.className='comm-cat-btn px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200'; });
    var btn = document.querySelector('.comm-cat-btn[data-cat="'+cat+'"]');
    if(btn) btn.className='comm-cat-btn px-3 py-1.5 rounded-full text-xs font-semibold bg-vit-orange text-white';
    renderCommunityPosts(cat);
}

export async function openForumDetail(postId) {
    kommState.currentForumPost = postId;
    document.getElementById('forumListView').classList.add('hidden');
    document.getElementById('forumDetailView').classList.remove('hidden');
    var contentEl = document.getElementById('forumDetailContent');
    var commentsEl = document.getElementById('forumComments');
    try {
        var resp = await _sb().from('forum_beitraege').select('*, users(name)').eq('id', postId).single();
        if(resp.error) throw resp.error;
        var p = resp.data;
        var authorName = p.users ? p.users.name : 'Unbekannt';
        var d = new Date(p.created_at);
        var dateStr = d.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) + ' um ' + d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');
        var html = '<div class="flex items-center space-x-2 mb-3">';
        if(p.gepinnt) html += '<span class="text-xs font-bold bg-yellow-100 text-yellow-700 rounded px-2 py-0.5">📌 Angepinnt</span>';
        html += '<span class="text-xs text-gray-400">' + dateStr + '</span></div>';
        html += '<h2 class="text-xl font-bold text-gray-800 mb-3">' + _escH(p.titel) + '</h2>';
        html += '<div class="flex items-center space-x-2 mb-4"><span class="text-sm font-semibold text-gray-700">' + _escH(authorName) + '</span></div>';
        html += '<div class="text-sm text-gray-700 whitespace-pre-wrap">' + _escH(p.inhalt) + '</div>';
        contentEl.innerHTML = html;

        var commResp = await _sb().from('forum_kommentare').select('*, users(name)').eq('beitrag_id', postId).order('created_at',{ascending:true});
        var comments = !commResp.error ? (commResp.data||[]) : [];
        var cHtml = '';
        if(comments.length===0) cHtml = '<div class="text-sm text-gray-400 py-2">Noch keine Kommentare. Sei der Erste!</div>';
        comments.forEach(function(c) {
            var cName = c.users ? c.users.name : 'Unbekannt';
            var cInit = cName.split(' ').map(function(n){return n[0];}).join('').substring(0,2);
            var colors = ['bg-blue-500','bg-green-600','bg-purple-500','bg-cyan-600','bg-pink-500','bg-red-500'];
            var cci = cName.split('').reduce(function(a,ch){return a+ch.charCodeAt(0);},0) % colors.length;
            var cd = new Date(c.created_at);
            cHtml += '<div class="flex items-start space-x-3 py-2 border-b border-gray-100">';
            cHtml += '<div class="w-8 h-8 ' + colors[cci] + ' rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">' + cInit + '</div>';
            cHtml += '<div class="flex-1"><div class="flex items-baseline space-x-2"><span class="font-semibold text-gray-800 text-sm">' + _escH(cName) + '</span><span class="text-xs text-gray-400">' + cd.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}) + ' ' + cd.getHours()+':'+String(cd.getMinutes()).padStart(2,'0') + '</span></div>';
            cHtml += '<p class="text-sm text-gray-700 mt-0.5">' + _escH(c.inhalt) + '</p></div></div>';
        });
        commentsEl.innerHTML = cHtml;
    } catch(err) { contentEl.innerHTML = '<div class="text-red-400">Fehler: ' + err.message + '</div>'; }
}

export async function postForumComment() {
    var input = document.getElementById('forumCommentInput');
    var text = input ? input.value.trim() : '';
    if(!text||!kommState.currentForumPost) { alert(_t('alert_enter_comment')); return; }
    try {
        var resp = await _sb().from('forum_kommentare').insert({ beitrag_id: kommState.currentForumPost, user_id: _sbUser().id, inhalt: text });
        if(resp.error) throw resp.error;
        input.value = '';
        openForumDetail(kommState.currentForumPost);
    } catch(err) { alert('Fehler: ' + err.message); }
}

export function closeForumDetail() {
    document.getElementById('forumDetailView').classList.add('hidden');
    document.getElementById('forumListView').classList.remove('hidden');
    kommState.currentForumPost = null;
}

export function showKommTab(tabName) {
    document.querySelectorAll('.komm-tab-content').forEach(function(t){t.style.display='none';});
    document.querySelectorAll('.komm-tab-btn').forEach(function(b){
        b.className = b.className.replace(/bg-white text-gray-800 shadow-sm/g, 'text-gray-500 hover:text-gray-700').replace(/ shadow-sm/g, '');
    });
    var tabMap = {chat:'Chat',community:'Community'};
    var el = document.getElementById('kommTab' + (tabMap[tabName]||''));
    if(el) el.style.display = 'block';
    var btn = document.querySelector('.komm-tab-btn[data-tab="'+tabName+'"]');
    if(btn) btn.className = 'komm-tab-btn px-4 py-2 rounded-md text-sm font-semibold bg-white text-gray-800 shadow-sm';

    if(tabName==='chat') loadKommSidebar();
    if(tabName==='community') { closeForumDetail(); renderCommunityPosts('all'); }
}

// Init on first load

// Strangler Fig: window.* registration
const _exports = {
    loadKommSidebar, filterKommSidebar, openKommConv,
    loadChannelMessages, subscribeToChannel, loadInboxConversation,
    renderInboxBubbles, loadAnnouncements, markAnkGelesen,
    renderChatBubbles, renderSingleBubble,
    setReply, cancelReply, kommSendMessage,
    kommInputKeydown, kommAutoResize,
    kommStartNewChat, kommSelectNewRecipient, kommCreateKanal,
    updateKommBadges,
    renderCommunityPosts, createCommunityPost, deactivateBrettPost,
    deleteForumPost, filterCommunity, openForumDetail,
    postForumComment, closeForumDetail, showKommTab,
};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[kommunikation.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
