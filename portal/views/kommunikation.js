/**
 * views/kommunikation.js - Kommunikation v4.0 (Quiply-Ersatz)
 *
 * Channels, DMs, Gruppen, News, Pinnwand, Team-Verzeichnis
 * Realtime-Chat, Emoji-Reaktionen, Datei-Anhaenge, Sprachnachrichten
 *
 * @module views/kommunikation
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _sbStandort()   { return window.sbStandort; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

var KOMM = {
    view: 'channel',       // 'channel','dm','group','news','pinnwand','team'
    activeId: null,
    activeName: '',
    kanaele: [],
    dmList: [],
    gruppen: [],
    messages: [],
    allUsers: [],
    newsItems: [],
    _userCache: null, // for @mention autocomplete
    pinnwandPosts: [],
    cannedReactions: ['👍','❤️','🔥','😂','🎉'],
    realtimeSub: null,
    loaded: false,
    sidebarOpen: true,
    recording: false,
    recSeconds: 0,
    recInterval: null,
    mediaRecorder: null,
    audioChunks: [],
    sidebarSections: { standort: true, hq: false, netzwerk: true, dms: true, gruppen: false },
    threadId: null,       // Wenn gesetzt: Thread-Panel ist offen
    threadParent: null,   // Die Parent-Nachricht des Threads
    threadMessages: []    // Antworten im Thread
};

var KOMM_EMOJIS = ['👍','❤️','🔥','😂','🎉','✅','👀','🙏'];

// ========== Hilfsfunktionen ==========
function kommUserName(u) {
    if (!u) return 'Unbekannt';
    return ((u.vorname || '') + ' ' + (u.nachname || '')).trim() || u.name || 'Unbekannt';
}

function kommInitials(name) {
    return (name || 'XX').split(' ').map(function(w) { return w[0] || ''; }).join('').toUpperCase().substring(0, 2);
}

function kommAvatarColor(initials) {
    if (initials === 'HQ') return '#EF7D00';
    var hash = 0;
    for (var i = 0; i < initials.length; i++) hash = initials.charCodeAt(i) * 2345 + hash * 31;
    var colors = ['#6366f1','#ec4899','#14b8a6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#84cc16'];
    return colors[Math.abs(hash) % colors.length];
}

function kommTimeAgo(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var now = Date.now();
    var diff = (now - d.getTime()) / 1000;
    if (diff < 60) return 'gerade';
    if (diff < 3600) return Math.floor(diff / 60) + ' Min.';
    if (diff < 86400) return d.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'});
    if (diff < 172800) return 'gestern';
    return d.toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit'});
}

function kommTimeShort(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'});
}

function kommIsHQ() {
    var p = _sbProfile();
    return p && (p.is_hq || p.rolle === 'hq' || p.rolle === 'hq_zahlen');
}

function kommIsGF() {
    var p = _sbProfile();
    return kommIsHQ() || (p && p.rolle === 'inhaber');
}

// ========== Daten laden ==========
async function kommLoadData() {
    var uid = _sbUser() ? _sbUser().id : null;
    var standortId = _sbProfile() ? _sbProfile().standort_id : null;

    try {
        var [chResp, usersResp, extraResp, mitgliedResp] = await Promise.all([
            _sb().from('chat_kanaele').select('*').order('name'),
            _sb().from('users').select('id, name, vorname, nachname, position, standort_id, is_hq, status, standorte:standort_id(name)').eq('status', 'aktiv'),
            _sb().from('kanal_extra_zugang').select('kanal_id').eq('user_id', uid || ''),
            _sb().from('kanal_mitglieder').select('kanal_id, zuletzt_gelesen').eq('user_id', uid || '')
        ]);

        var allKanaele = chResp.data || [];
        KOMM.allUsers = usersResp.data || [];
        KOMM._extraZugang = (extraResp.data || []).map(function(e) { return e.kanal_id; });

        // Ungelesen-Map bauen: kanal_id → zuletzt_gelesen
        KOMM._gelesenMap = {};
        (mitgliedResp.data || []).forEach(function(m) {
            KOMM._gelesenMap[m.kanal_id] = m.zuletzt_gelesen;
        });

        // Sichtbarkeitsfilter anwenden
        var sichtbar = allKanaele.filter(function(k) { return kommKanalSichtbar(k); });

        // Kanaele aufteilen
        KOMM.kanaele = sichtbar.filter(function(k) { return k.typ === 'channel' || !k.typ; });
        KOMM.gruppen = sichtbar.filter(function(k) { return k.typ === 'group'; });

        // DMs laden
        var dmResp = await _sb().from('chat_kanaele').select('*, kanal_mitglieder!inner(user_id, ausgeblendet)')
            .eq('typ', 'dm');
        var dmKanaele = (dmResp.data || []).filter(function(k) {
            return k.kanal_mitglieder && k.kanal_mitglieder.some(function(m) { return m.user_id === uid; });
        });
        KOMM.dmList = dmKanaele;

        KOMM.loaded = true;
    } catch(err) {
        console.error('[kommunikation] loadData:', err);
    }
}

/**
 * Prüft ob der aktuelle User einen Channel sehen darf.
 * Logik:
 * 1. sichtbar_fuer_rollen ist NULL oder leer → alle sehen den Channel
 * 2. sichtbar_fuer_rollen hat Werte → nur diese Rollen sehen ihn
 * 3. kanal_extra_zugang → einzelne User sehen den Channel zusätzlich
 */
function kommKanalSichtbar(kanal) {
    // Kein Rollen-Filter → alle sehen ihn
    if (!kanal.sichtbar_fuer_rollen || kanal.sichtbar_fuer_rollen.length === 0) return true;

    // Prüfe ob User eine der erlaubten Rollen hat
    var p = _sbProfile();
    if (p) {
        var userRolle = p.rolle || '';
        var isHQ = p.is_hq || userRolle === 'hq' || userRolle === 'hq_zahlen';

        // HQ-Rollen prüfen (hq, hq_gf, hq_sales, etc.)
        if (isHQ && kanal.sichtbar_fuer_rollen.indexOf('hq') >= 0) return true;

        // Spezifische Rolle prüfen
        if (kanal.sichtbar_fuer_rollen.indexOf(userRolle) >= 0) return true;

        // "inhaber" Rolle prüfen
        if (userRolle === 'inhaber' && kanal.sichtbar_fuer_rollen.indexOf('inhaber') >= 0) return true;
    }

    // Prüfe Extra-Zugang
    if (KOMM._extraZugang && KOMM._extraZugang.indexOf(kanal.id) >= 0) return true;

    return false;
}

// ========== HAUPT-RENDER ==========
export async function showKommTab(tab) {
    // Compat: alte Tab-Namen mappen
    if (tab === 'chat') tab = 'channel';
    if (tab === 'community') tab = 'pinnwand';
    renderKomm();
}

export async function renderKomm() {
    var container = document.getElementById('kommunikationView');
    if (!container) return;

    if (!KOMM.loaded) {
        container.innerHTML = '<div class="flex items-center justify-center h-96"><div class="animate-spin w-6 h-6 border-2 border-vit-orange border-t-transparent rounded-full mr-3"></div><span class="text-gray-500">Kommunikation wird geladen...</span></div>';
        await kommLoadData();
        // Default: ersten Channel oeffnen
        var netzwerk = KOMM.kanaele.filter(function(k) { return k.ist_netzwerk; });
        if (netzwerk.length > 0 && !KOMM.activeId) {
            KOMM.activeId = netzwerk[0].id;
            KOMM.activeName = netzwerk[0].name;
            KOMM.view = 'channel';
        }
    }

    var standortName = _sbStandort() ? _sbStandort().name : 'Mein Standort';

    var h = '<div class="flex h-[calc(100vh-140px)] min-h-[500px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">';

    // ── SIDEBAR ──
    h += '<div id="kommSidebar" class="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col ' + (KOMM.sidebarOpen ? '' : 'hidden md:flex') + '">';

    // Sidebar Header
    h += '<div class="p-3 border-b border-gray-100 flex items-center gap-2.5">';
    h += '<div class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style="background:#EF7D00">💬</div>';
    h += '<div class="flex-1 min-w-0"><div class="text-sm font-bold text-gray-800">Kommunikation</div>';
    h += '<div class="text-[10px] text-gray-400">vit:bikes Netzwerk</div></div>';
    h += '<button onclick="kommShowNotifSettings()" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer bg-transparent border-none text-base" title="Einstellungen">⚙️</button>';
    h += '</div>';

    // ── Scrollable sidebar content ──
    h += '<div class="flex-1 overflow-y-auto pb-4">';

    // Top Nav Items
    h += kommSidebarItem('news', '📢', 'News & Ankuendigungen', 0);
    h += kommSidebarItem('team', '👥', 'Team', 0);

    h += '<div class="h-px bg-gray-100 mx-3 my-1"></div>';

    // Channel-Aufspaltung
    var myStandortId = _sbProfile() ? _sbProfile().standort_id : null;
    var isHQ = kommIsHQ();

    // Standort-Channels: nur eigener Standort (Partner) oder alle (HQ)
    var standortKanaele = KOMM.kanaele.filter(function(k) {
        if (k.ist_netzwerk || k.ist_hq_channel) return false;
        if (!k.standort_id) return false;
        if (isHQ) return true; // HQ sieht alle Standort-Channels
        return k.standort_id === myStandortId; // Partner nur eigenen
    });

    // HQ-Channels: HQ sieht alle, Partner nur eigenen
    var hqKanaele = KOMM.kanaele.filter(function(k) { return k.ist_hq_channel; });
    var visibleHqKanaele = isHQ ? hqKanaele : hqKanaele.filter(function(k) { return k.standort_id === myStandortId; });

    // Netzwerk-Channels: alle sehen alle
    var netzwerkKanaele = KOMM.kanaele.filter(function(k) { return k.ist_netzwerk; });

    h += kommSidebarSection('🏪 ' + _escH(standortName), 'standort', standortKanaele);
    // GF/Inhaber kann Standort-Channels/Gruppen erstellen
    if (kommIsGF() && KOMM.sidebarSections.standort) {
        h += '<div onclick="kommNewStandortChannelDialog()" class="mx-2 px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-2 text-gray-400 text-xs hover:text-vit-orange hover:bg-gray-50">';
        h += '<span>＋</span> Channel / Gruppe erstellen</div>';
    }

    // HQ ↔ Standort Channels
    if (visibleHqKanaele.length > 0) {
        h += kommSidebarSection('🏢 Headquarter', 'hq', visibleHqKanaele);
    }

    h += kommSidebarSection('🌐 Netzwerk', 'netzwerk', netzwerkKanaele);

    h += '<div class="h-px bg-gray-100 mx-3 my-1"></div>';

    // DMs
    h += kommSidebarDMs();

    // Gruppen
    h += kommSidebarGruppen();

    h += '</div>'; // end scrollable sidebar content
    h += '</div>'; // end sidebar

    // ── CONTENT ──
    h += '<div class="flex-1 flex flex-col min-w-0">';
    h += kommRenderHeader();
    h += '<div class="flex-1 overflow-y-auto" id="kommContent">';
    h += '</div>'; // content placeholder - filled after mount
    h += kommRenderInputBar();
    h += '</div>'; // end content

    h += '</div>'; // end flex

    container.innerHTML = h;

    // Chatbot ausblenden im Kommunikationsmodul (überlappt Input-Bar)
    var chatbot = document.getElementById('supChatWidget');
    if (chatbot) chatbot.style.display = 'none';

    // Content async laden
    await kommLoadContent();
}

// ========== Sidebar Helpers ==========
function kommSidebarItem(view, icon, label, badge) {
    var active = KOMM.view === view;
    return '<div onclick="kommGoView(\'' + view + '\',\'' + view + '\',\'' + _escH(label) + '\')" class="mx-2 my-0.5 px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 ' + (active ? 'bg-orange-50 border-l-[3px] border-l-[#EF7D00]' : 'hover:bg-gray-50 border-l-[3px] border-transparent') + '">'
        + '<span class="text-base">' + icon + '</span>'
        + '<span class="flex-1 text-[13px] font-semibold ' + (active ? 'text-[#EF7D00]' : 'text-gray-700') + '">' + label + '</span>'
        + (badge > 0 ? '<span class="bg-[#EF7D00] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">' + badge + '</span>' : '')
        + '</div>';
}

function kommSidebarSection(title, key, channels) {
    var open = KOMM.sidebarSections[key];
    // Trenne Parent-Channels (kein parent_id) und Sub-Channels
    var parents = channels.filter(function(ch) { return !ch.parent_id; });
    var subMap = {}; // parent_id → [sub-channels]
    channels.forEach(function(ch) {
        if (ch.parent_id) {
            if (!subMap[ch.parent_id]) subMap[ch.parent_id] = [];
            subMap[ch.parent_id].push(ch);
        }
    });

    var allVisible = parents.concat(channels.filter(function(ch) { return ch.parent_id; }));
    var unreadCount = allVisible.filter(function(ch) { return kommIsUnread(ch); }).length;

    var h = '<div class="mb-1">';
    h += '<div onclick="kommToggleSection(\'' + key + '\')" class="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer flex justify-between items-center select-none hover:text-gray-600">';
    h += '<span>' + title + '</span>';
    h += '<span class="flex items-center gap-1.5">';
    if (unreadCount > 0) h += '<span class="w-5 h-5 rounded-full bg-[#EF7D00] text-white text-[9px] font-bold flex items-center justify-center">' + unreadCount + '</span>';
    h += '<span class="text-[9px] transition-transform ' + (open ? '' : '-rotate-90') + '">▼</span></span>';
    h += '</div>';
    if (open) {
        parents.forEach(function(ch) {
            var subs = subMap[ch.id] || [];
            var hasSubs = subs.length > 0;
            var active = (KOMM.view === 'channel' || KOMM.view === 'group') && KOMM.activeId === ch.id;
            var unread = kommIsUnread(ch);
            var subOpen = KOMM.sidebarSections['sub_' + ch.id] !== false; // Default offen

            // Parent-Channel
            h += '<div class="group mx-2 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-2 ' + (active ? 'bg-orange-50 border-l-[3px] border-l-[#EF7D00]' : 'border-l-[3px] border-transparent hover:bg-gray-50') + '">';
            if (hasSubs) {
                h += '<span onclick="event.stopPropagation();kommToggleSection(\'sub_' + ch.id + '\')" class="text-[9px] text-gray-400 cursor-pointer w-3 flex-shrink-0 ' + (subOpen ? '' : '-rotate-90') + ' transition-transform">▼</span>';
            }
            h += '<span onclick="kommGoView(\'channel\',\'' + ch.id + '\',\'' + _escH(ch.name) + '\')" class="text-sm">' + (ch.icon || '💬') + '</span>';
            h += '<span onclick="kommGoView(\'channel\',\'' + ch.id + '\',\'' + _escH(ch.name) + '\')" class="flex-1 text-[12.5px] ' + (active ? 'font-bold text-[#EF7D00]' : (unread ? 'font-bold text-gray-800' : 'text-gray-600')) + ' truncate">' + _escH(ch.name) + '</span>';
            if (unread) h += '<span class="w-2.5 h-2.5 rounded-full bg-[#EF7D00] flex-shrink-0"></span>';
            // + Button für HQ um Sub-Channel zu erstellen
            if (kommIsHQ() && ch.ist_netzwerk) {
                h += '<span onclick="event.stopPropagation();kommNewSubChannel(\'' + ch.id + '\',\'' + _escH(ch.name).replace(/'/g, "\\'") + '\')" class="text-gray-300 hover:text-[#EF7D00] text-xs cursor-pointer opacity-0 group-hover:opacity-100" title="Unterchannel erstellen">＋</span>';
            }
            h += '</div>';

            // Sub-Channels (eingerückt)
            if (hasSubs && subOpen) {
                subs.forEach(function(sub) {
                    var subActive = (KOMM.view === 'channel') && KOMM.activeId === sub.id;
                    var subUnread = kommIsUnread(sub);
                    h += '<div onclick="kommGoView(\'channel\',\'' + sub.id + '\',\'' + _escH(sub.name) + '\')" class="mx-2 ml-8 px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-2 ' + (subActive ? 'bg-orange-50 border-l-[3px] border-l-[#EF7D00]' : 'border-l-[3px] border-transparent hover:bg-gray-50') + '">';
                    h += '<span class="text-xs text-gray-400">└</span>';
                    h += '<span class="text-xs">' + (sub.icon || '💬') + '</span>';
                    h += '<span class="flex-1 text-[11.5px] ' + (subActive ? 'font-bold text-[#EF7D00]' : (subUnread ? 'font-bold text-gray-700' : 'text-gray-500')) + ' truncate">' + _escH(sub.name) + '</span>';
                    if (subUnread) h += '<span class="w-2 h-2 rounded-full bg-[#EF7D00] flex-shrink-0"></span>';
                    h += '</div>';
                });
            }
        });
    }
    h += '</div>';
    return h;
}

function kommIsUnread(ch) {
    if (!ch.letzte_nachricht_at) return false;
    var gelesen = KOMM._gelesenMap ? KOMM._gelesenMap[ch.id] : null;
    if (!gelesen) return true; // Nie gelesen + hat Nachrichten = unread
    return new Date(ch.letzte_nachricht_at) > new Date(gelesen);
}

function kommSidebarDMs() {
    var open = KOMM.sidebarSections.dms;
    var uid = _sbUser() ? _sbUser().id : null;
    var h = '<div class="mb-1">';
    h += '<div onclick="kommToggleSection(\'dms\')" class="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer flex justify-between select-none hover:text-gray-600">';
    h += '💬 Direktnachrichten <span class="text-[9px] transition-transform ' + (open ? '' : '-rotate-90') + '">▼</span></div>';
    if (open) {
        // Ausgeblendete DMs filtern
        var visibleDMs = KOMM.dmList.filter(function(dm) {
            if (!dm.kanal_mitglieder) return true;
            var myMembership = dm.kanal_mitglieder.find(function(m) { return m.user_id === uid; });
            return !myMembership || !myMembership.ausgeblendet;
        });

        visibleDMs.forEach(function(dm) {
            var active = KOMM.view === 'dm' && KOMM.activeId === dm.id;
            // DM-Partner ermitteln
            var partnerId = (dm.kanal_mitglieder || []).map(function(m) { return m.user_id; }).find(function(id) { return id !== uid; });
            var partner = KOMM.allUsers.find(function(u) { return u.id === partnerId; });
            var name = partner ? kommUserName(partner) : dm.name || 'Chat';
            var initials = kommInitials(name);
            h += '<div onclick="kommGoView(\'dm\',\'' + dm.id + '\',\'' + _escH(name) + '\')" oncontextmenu="event.preventDefault();kommShowDmMenu(event,\'' + dm.id + '\',\'' + _escH(name).replace(/'/g, "\\'") + '\')" class="mx-2 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-2 ' + (active ? 'bg-orange-50 border-l-[3px] border-l-[#EF7D00]' : 'border-l-[3px] border-transparent hover:bg-gray-50') + '">';
            h += '<div class="relative flex-shrink-0"><div class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style="background:' + kommAvatarColor(initials) + '">' + initials + '</div></div>';
            h += '<div class="flex-1 min-w-0">';
            h += '<div class="text-[12.5px] ' + (active ? 'font-bold text-[#EF7D00]' : 'text-gray-600') + ' truncate">' + _escH(name) + '</div>';
            if (dm.letzte_nachricht_vorschau) h += '<div class="text-[11px] text-gray-400 truncate">' + _escH(dm.letzte_nachricht_vorschau) + '</div>';
            h += '</div>';
            if (dm.letzte_nachricht_at) h += '<span class="text-[10px] text-gray-400 flex-shrink-0">' + kommTimeAgo(dm.letzte_nachricht_at) + '</span>';
            h += '</div>';
        });
        h += '<div onclick="kommNewDM()" class="mx-2 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-2 text-gray-400 text-xs hover:bg-gray-50">＋ Neuer Chat</div>';
    }
    h += '</div>';
    return h;
}

function kommSidebarGruppen() {
    var open = KOMM.sidebarSections.gruppen;
    var h = '<div class="mb-1">';
    h += '<div onclick="kommToggleSection(\'gruppen\')" class="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer flex justify-between select-none hover:text-gray-600">';
    h += '👥 Gruppen <span class="text-[9px] transition-transform ' + (open ? '' : '-rotate-90') + '">▼</span></div>';
    if (open) {
        KOMM.gruppen.forEach(function(g) {
            var active = KOMM.view === 'group' && KOMM.activeId === g.id;
            h += '<div onclick="kommGoView(\'group\',\'' + g.id + '\',\'' + _escH(g.name) + '\')" class="mx-2 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-2 ' + (active ? 'bg-orange-50' : 'hover:bg-gray-50') + '">';
            h += '<span class="text-sm">' + (g.icon || '👥') + '</span>';
            h += '<span class="flex-1 text-[12.5px] text-gray-600 truncate">' + _escH(g.name) + '</span></div>';
        });
        h += '<div onclick="kommNewGroup()" class="mx-2 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-2 text-gray-400 text-xs hover:bg-gray-50">＋ Neue Gruppe</div>';
    }
    h += '</div>';
    return h;
}

// ========== Header ==========
function kommRenderHeader() {
    var h = '<div class="px-5 py-3 border-b border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">';
    // Mobile toggle
    h += '<button onclick="kommToggleSidebar()" class="md:hidden text-gray-400 hover:text-gray-600">☰</button>';

    if (KOMM.view === 'news') {
        h += '<span class="text-xl">📢</span><div class="flex-1"><div class="text-[15px] font-bold">News & Ankuendigungen</div><div class="text-[11px] text-gray-400">Wichtige Infos aus der Zentrale</div></div>';
        if (kommIsHQ()) h += '<button onclick="kommNewNews()" class="px-3.5 py-1.5 rounded-lg bg-[#EF7D00] text-white text-xs font-bold hover:opacity-90">+ Ankuendigung</button>';
    } else if (KOMM.view === 'team') {
        h += '<span class="text-xl">👥</span><div class="flex-1"><div class="text-[15px] font-bold">Team-Verzeichnis</div><div class="text-[11px] text-gray-400">' + KOMM.allUsers.length + ' Mitarbeiter</div></div>';
    } else if (KOMM.view === 'dm') {
        var initials = kommInitials(KOMM.activeName);
        h += '<div class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style="background:' + kommAvatarColor(initials) + '">' + initials + '</div>';
        h += '<div class="flex-1"><div class="text-[15px] font-bold">' + _escH(KOMM.activeName) + '</div><div class="text-[11px] text-gray-400">Direktnachricht</div></div>';
    } else {
        // Channel / Group
        h += '<span class="text-lg">#</span>';
        h += '<div class="flex-1"><div class="text-[15px] font-bold">' + _escH(KOMM.activeName || 'Channel') + '</div><div class="text-[11px] text-gray-400">Channel</div></div>';
    }
    h += '</div>';
    return h;
}

// ========== Input Bar ==========
function kommRenderInputBar() {
    if (KOMM.view !== 'channel' && KOMM.view !== 'dm' && KOMM.view !== 'group') return '';
    var isDm = KOMM.view === 'dm' || KOMM.view === 'group';

    var h = '<div class="px-4 py-3 border-t border-gray-200 bg-white flex items-end gap-2 flex-shrink-0">';

    // Attach Button
    h += '<button onclick="kommAttachFile()" class="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-base cursor-pointer flex-shrink-0 hover:bg-gray-50">📎</button>';

    // Recording state
    h += '<div id="kommRecBar" class="hidden flex-1 flex items-center gap-2 bg-red-50 rounded-xl px-3 py-2">';
    h += '<div class="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>';
    h += '<span id="kommRecTime" class="text-sm font-semibold text-red-500">0:00</span>';
    h += '<button onclick="kommStopRecording()" class="ml-auto px-3 py-1 rounded-lg bg-red-500 text-white text-[11px] font-bold">⏹ Senden</button>';
    h += '</div>';

    // Text input with @mention support
    h += '<div class="flex-1 relative">';
    h += '<textarea id="kommMsgInput" class="w-full px-3 py-2 rounded-xl border border-gray-200 text-[13px] resize-none outline-none focus:border-[#EF7D00]" rows="1" placeholder="Nachricht schreiben... @Name für Erwähnung" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();kommSendMessage()}" oninput="kommCheckMention(this)"></textarea>';
    h += '<div id="kommMentionDropdown" class="hidden absolute bottom-full left-0 w-64 max-h-48 overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200 mb-1 z-50"></div>';
    h += '</div>';

    // Voice button (DMs + Groups only)
    if (isDm) {
        h += '<button onclick="kommStartRecording()" id="kommVoiceBtn" class="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-base cursor-pointer flex-shrink-0 hover:bg-gray-50">🎤</button>';
    }

    // Send button
    h += '<button onclick="kommSendMessage()" class="w-9 h-9 rounded-lg bg-gray-200 text-white flex items-center justify-center text-base flex-shrink-0" id="kommSendBtn">↑</button>';

    h += '</div>';
    return h;
}

// ========== Content laden ==========
async function kommLoadContent() {
    var el = document.getElementById('kommContent');
    if (!el) return;

    if (KOMM.view === 'channel' || KOMM.view === 'dm' || KOMM.view === 'group') {
        await kommLoadChat(el);
    } else if (KOMM.view === 'news') {
        await kommLoadNews(el);
    } else if (KOMM.view === 'team') {
        kommLoadTeam(el);
    }
}

// ========== CHAT VIEW ==========
async function kommLoadChat(el) {
    if (!KOMM.activeId || KOMM.activeId === 'channel') {
        el.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-sm"><div class="text-center"><div class="text-4xl mb-3">💬</div><p class="font-semibold">Waehle einen Channel</p></div></div>';
        return;
    }

    el.innerHTML = '<div class="flex items-center justify-center py-8"><div class="animate-spin w-5 h-5 border-2 border-vit-orange border-t-transparent rounded-full"></div></div>';

    try {
        var resp = await _sb().from('chat_nachrichten')
            .select('*, users:user_id(id, name, vorname, nachname, is_hq, position)')
            .eq('kanal_id', KOMM.activeId)
            .order('created_at', {ascending: true})
            .limit(100);

        KOMM.messages = resp.data || [];

        // Reaktionen laden
        var msgIds = KOMM.messages.map(function(m) { return m.id; });
        var reactions = {};
        if (msgIds.length > 0) {
            var rxResp = await _sb().from('komm_reactions')
                .select('*')
                .eq('parent_type', 'chat')
                .in('parent_id', msgIds);
            (rxResp.data || []).forEach(function(r) {
                if (!reactions[r.parent_id]) reactions[r.parent_id] = [];
                reactions[r.parent_id].push(r);
            });
        }

        var uid = _sbUser() ? _sbUser().id : null;
        var isDm = KOMM.view === 'dm';
        var h = '<div class="px-5 py-4">';

        // KI-Zusammenfassung Button (nur Channels)
        if (KOMM.view === 'channel' && KOMM.messages.length > 5) {
            h += '<div class="flex justify-center mb-3">';
            h += '<button onclick="kommSummarize()" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-white cursor-pointer" style="background:linear-gradient(135deg,#8b5cf6,#6366f1)">🧠 Was hab ich verpasst?</button>';
            h += '</div>';
        }

        // Datum-Trenner
        h += '<div class="text-center py-2 text-[11px] text-gray-400">— Heute —</div>';

        KOMM.messages.forEach(function(m) {
            // Thread-Antworten nicht im Haupt-Chat zeigen
            if (m.reply_to) return;

            var isOwn = m.user_id === uid;
            var userName = m.users ? kommUserName(m.users) : 'Unbekannt';
            var isHq = m.users && (m.users.is_hq || m.users.rolle === 'hq');
            var initials = kommInitials(userName);
            var msgReactions = reactions[m.id] || [];

            h += '<div class="flex gap-2.5 py-1.5 group">';
            h += '<div class="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold" style="background:' + kommAvatarColor(initials) + '">' + initials + '</div>';
            h += '<div class="flex-1 min-w-0">';
            h += '<div class="flex items-baseline gap-2 mb-0.5">';
            h += '<span class="text-[13px] font-bold ' + (isHq ? 'text-[#EF7D00]' : 'text-gray-800') + '">' + _escH(userName) + '</span>';
            if (isHq) h += '<span class="text-[9px] font-bold bg-orange-50 text-[#EF7D00] px-1.5 py-0.5 rounded">HQ</span>';
            h += '<span class="text-[11px] text-gray-400">' + kommTimeShort(m.created_at) + '</span>';
            // Gelesen-Status in DMs
            if (isDm && isOwn) {
                var read = m.gelesen_von && m.gelesen_von.length > 0;
                h += '<span class="text-[11px] ml-auto ' + (read ? 'text-blue-500' : 'text-gray-300') + '">' + (read ? '✓✓' : '✓') + '</span>';
            }
            h += '</div>';
            h += '<p class="text-[13.5px] text-gray-800 leading-relaxed whitespace-pre-wrap">' + _escH(m.nachricht || '') + '</p>';

            // Reaktionen
            if (msgReactions.length > 0 || true) {
                h += '<div class="flex gap-1 mt-1 flex-wrap items-center">';
                // Gruppiere Reaktionen nach Emoji
                var emojiCounts = {};
                msgReactions.forEach(function(r) {
                    if (!emojiCounts[r.emoji]) emojiCounts[r.emoji] = { count: 0, myReaction: false };
                    emojiCounts[r.emoji].count++;
                    if (r.user_id === uid) emojiCounts[r.emoji].myReaction = true;
                });
                Object.keys(emojiCounts).forEach(function(emoji) {
                    var ec = emojiCounts[emoji];
                    h += '<button onclick="kommToggleReaction(\'' + m.id + '\',\'' + emoji + '\')" class="px-2 py-0.5 rounded-full text-[12px] font-semibold cursor-pointer ' + (ec.myReaction ? 'border-[1.5px] border-[#EF7D00] bg-orange-50 text-[#EF7D00]' : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50') + '">' + emoji + ' ' + ec.count + '</button>';
                });
                // Add reaction button
                h += '<button onclick="kommShowEmojiPicker(\'' + m.id + '\')" class="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-[12px] text-gray-400 cursor-pointer hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">+</button>';

                // Thread-Bereich (MS Teams Style)
                if (KOMM.view === 'channel' || KOMM.view === 'group') {
                    var rc = m.reply_count || 0;
                    var threadOpen = KOMM.threadId === m.id;
                    var threadReplies = threadOpen ? (KOMM.threadMessages || []) : [];
                    var lastReply = rc > 0 && !threadOpen ? KOMM.messages.find(function(r) { return r.reply_to === m.id; }) : null;

                    if (rc > 0) {
                        // Kompakte Thread-Vorschau (wie Teams: letzte Antwort + Count)
                        h += '<div class="mt-1">';
                        h += '<div onclick="' + (threadOpen ? 'kommCloseThread()' : 'kommOpenThread(\'' + m.id + '\')') + '" class="inline-flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 transition-colors">';
                        h += '<span class="text-[11px] text-blue-600 font-medium">' + rc + ' Antwort' + (rc > 1 ? 'en' : '') + '</span>';
                        h += '<span class="text-[10px] text-gray-400">' + (threadOpen ? '▾ Einklappen' : '▸ Anzeigen') + '</span>';
                        h += '</div>';

                        // Aufgeklappte Thread-Antworten
                        if (threadOpen) {
                            h += '<div class="mt-1.5 ml-1 border-l-2 border-gray-200">';
                            threadReplies.forEach(function(tr) {
                                var trName = tr.users ? kommUserName(tr.users) : 'Unbekannt';
                                var trInit = kommInitials(trName);
                                var trHq = tr.users && tr.users.is_hq;
                                h += '<div class="flex gap-2 py-1 px-3">';
                                h += '<div class="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-white text-[8px] font-bold mt-0.5" style="background:' + kommAvatarColor(trInit) + '">' + trInit + '</div>';
                                h += '<div class="flex-1 min-w-0">';
                                h += '<span class="text-[11px] font-semibold ' + (trHq ? 'text-[#EF7D00]' : 'text-gray-700') + '">' + _escH(trName) + '</span>';
                                h += ' <span class="text-[10px] text-gray-400">' + kommTimeShort(tr.created_at) + '</span>';
                                h += '<div class="text-[12px] text-gray-700 leading-snug whitespace-pre-wrap">' + _escH(tr.nachricht || '') + '</div>';
                                h += '</div></div>';
                            });
                            // Reply-Input (wie Teams: flach, in der Linie)
                            h += '<div class="flex items-center gap-2 px-3 py-1.5">';
                            h += '<div class="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-white text-[8px] font-bold bg-gray-300">' + kommInitials((_sbUser() || {}).email || 'Du') + '</div>';
                            h += '<input id="kommThreadInput" class="flex-1 px-2.5 py-1 rounded border border-gray-200 text-[12px] outline-none focus:border-[#EF7D00] bg-white" placeholder="Antwort schreiben..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();kommSendThreadReply()}">';
                            h += '</div>';
                            h += '</div>';
                        }
                        h += '</div>';
                    }

                    // Hover-Button "Antworten" (nur wenn noch keine Antworten)
                    if (rc === 0) {
                        h += '<button onclick="kommOpenThread(\'' + m.id + '\')" class="mt-0.5 text-[11px] text-gray-400 hover:text-blue-600 cursor-pointer bg-transparent border-none opacity-0 group-hover:opacity-100 transition-opacity">↩ Antworten</button>';
                    }
                }

                h += '</div>';
            }

            h += '</div></div>';
        });

        h += '</div>';
        el.innerHTML = h;
        el.scrollTop = el.scrollHeight;

        // Realtime subscription
        kommSubscribeRealtime();

        // Gelesen markieren
        kommMarkAsRead();

    } catch(err) {
        console.error('[kommunikation] loadChat:', err);
        el.innerHTML = '<div class="text-center py-8 text-red-500 text-sm">Fehler beim Laden der Nachrichten</div>';
    }
}

// ========== NEWS VIEW ==========
async function kommLoadNews(el) {
    try {
        var resp = await _sb().from('ankuendigungen')
            .select('*, users:erstellt_von(name, vorname, nachname, is_hq)')
            .order('pinned', {ascending: false})
            .order('created_at', {ascending: false})
            .limit(30);

        KOMM.newsItems = resp.data || [];

        // Gelesen-Status laden
        var uid = _sbUser() ? _sbUser().id : null;
        var newsIds = KOMM.newsItems.map(function(n) { return n.id; });
        var gelesenSet = {};
        if (newsIds.length > 0 && uid) {
            var gResp = await _sb().from('ankuendigungen_gelesen').select('ankuendigung_id').eq('user_id', uid).in('ankuendigung_id', newsIds);
            (gResp.data || []).forEach(function(g) { gelesenSet[g.ankuendigung_id] = true; });
        }

        var h = '<div class="max-w-[700px] mx-auto py-4 px-4 space-y-3">';

        // Pflicht-Lesebestaetigungen Banner
        var pflichtItems = KOMM.newsItems.filter(function(n) { return n.ist_pflicht; });
        if (pflichtItems.length > 0 && kommIsHQ()) {
            pflichtItems.forEach(function(pf) {
                h += '<div class="bg-yellow-50 border border-yellow-300 rounded-xl p-3 flex items-center justify-between">';
                h += '<div class="flex items-center gap-2"><span>📊</span><div>';
                h += '<div class="text-xs font-bold text-yellow-800">Pflicht: "' + _escH(pf.titel) + '"</div>';
                h += '<div class="text-[11px] text-yellow-700">Lesebestaetigungen ausstehend</div>';
                h += '</div></div>';
                h += '<button onclick="kommShowPflichtDetails(\'' + pf.id + '\')" class="px-2.5 py-1 rounded-md bg-white border border-yellow-400 text-[11px] font-semibold text-yellow-800 cursor-pointer hover:bg-yellow-50">Details →</button>';
                h += '</div>';
            });
        }

        // News-Karten
        KOMM.newsItems.forEach(function(n) {
            var d = new Date(n.created_at);
            var authorName = n.users ? kommUserName(n.users) : 'HQ';
            var isHq = n.users && n.users.is_hq;
            var gelesen = gelesenSet[n.id];
            var catBg = n.wichtig ? 'bg-red-50 text-red-600' : n.kategorie === 'update' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600';
            var catLabel = n.wichtig ? '⚠️ Wichtig' : n.kategorie === 'update' ? '🔄 Update' : '📰 News';

            h += '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">';
            if (n.pinned) h += '<div class="bg-[#EF7D00] px-3.5 py-1 text-[10px] font-bold text-white">📌 ANGEPINNT</div>';
            h += '<div class="p-4">';

            // Author + Meta
            h += '<div class="flex items-center gap-2 mb-2.5">';
            var aInit = kommInitials(authorName);
            h += '<div class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style="background:' + kommAvatarColor(aInit) + '">' + aInit + '</div>';
            h += '<span class="text-xs font-semibold">' + _escH(authorName) + '</span>';
            h += '<span class="text-[11px] text-gray-400">' + kommTimeAgo(n.created_at) + '</span>';
            h += '<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto ' + catBg + '">' + catLabel + '</span>';
            h += '</div>';

            h += '<h3 class="text-[15px] font-bold mb-1.5">' + _escH(n.titel) + '</h3>';
            h += '<p class="text-[13px] text-gray-600 leading-relaxed">' + _escH(n.inhalt || '') + '</p>';

            // Anhang
            if (n.hat_attachment) {
                h += '<div class="mt-2.5 inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px]">📎 <span class="font-semibold">Anhang</span></div>';
            }

            // Footer
            h += '<div class="flex gap-4 mt-3 pt-2.5 border-t border-gray-100">';
            h += '<button onclick="kommLikeNews(\'' + n.id + '\')" class="text-xs text-gray-500 bg-transparent border-none cursor-pointer hover:text-[#EF7D00]">❤️ ' + (n.likes_count || 0) + '</button>';
            h += '<button class="text-xs text-gray-500 bg-transparent border-none cursor-pointer">💬 ' + (n.kommentar_count || 0) + '</button>';
            if (gelesen) h += '<span class="ml-auto text-[11px] text-green-500">✓ Gelesen</span>';
            else h += '<button onclick="kommMarkNewsRead(\'' + n.id + '\')" class="ml-auto text-[11px] text-gray-400 cursor-pointer hover:text-green-500">Als gelesen markieren</button>';
            h += '</div>';

            h += '</div></div>';
        });

        if (KOMM.newsItems.length === 0) {
            h += '<div class="text-center py-12"><div class="text-4xl mb-3">📢</div><p class="text-gray-500 font-semibold">Noch keine Ankuendigungen</p></div>';
        }

        h += '</div>';
        el.innerHTML = h;

        // Auto-Lesebestaetigungen
        KOMM.newsItems.forEach(function(n) {
            if (!gelesenSet[n.id] && uid) {
                _sb().from('ankuendigungen_gelesen').insert({ ankuendigung_id: n.id, user_id: uid, gelesen_am: new Date().toISOString() }).then(function(){});
            }
        });

    } catch(err) {
        console.error('[kommunikation] loadNews:', err);
        el.innerHTML = '<div class="text-center py-8 text-red-500 text-sm">Fehler beim Laden der News</div>';
    }
}

// ========== PINNWAND VIEW ==========
async function kommLoadPinnwand(el) {
    try {
        var resp = await _sb().from('pinnwand_posts')
            .select('*, users:user_id(name, vorname, nachname, is_hq, standort_id, standorte:standort_id(name))')
            .order('created_at', {ascending: false})
            .limit(30);
        KOMM.pinnwandPosts = resp.data || [];

        var h = '<div class="max-w-[600px] mx-auto py-4 px-4">';

        // Post-Eingabe
        h += '<div class="bg-white rounded-xl border border-gray-200 p-3.5 mb-3.5">';
        h += '<div class="flex gap-2.5">';
        var myName = _sbProfile() ? kommUserName(_sbProfile()) : 'Du';
        var myInit = kommInitials(myName);
        h += '<div class="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold" style="background:' + kommAvatarColor(myInit) + '">' + myInit + '</div>';
        h += '<textarea id="kommPinnwandInput" placeholder="Was gibts Neues? Fotos, Erfolge, Fragen..." rows="2" class="flex-1 border border-gray-200 rounded-lg px-2.5 py-2 text-[13px] resize-none outline-none focus:border-[#EF7D00]"></textarea>';
        h += '</div>';
        h += '<div class="flex justify-between mt-2 pl-10">';
        h += '<div class="flex gap-2">';
        h += '<button onclick="kommPinnwandAttach(\'bild\')" class="text-xs text-gray-500 bg-transparent border-none cursor-pointer">📷 Foto</button>';
        h += '<button onclick="kommPinnwandAttach(\'datei\')" class="text-xs text-gray-500 bg-transparent border-none cursor-pointer">📎 Datei</button>';
        h += '</div>';
        h += '<button onclick="kommPostPinnwand()" class="px-4 py-1.5 rounded-lg bg-[#EF7D00] text-white text-xs font-bold border-none cursor-pointer hover:opacity-90">Posten</button>';
        h += '</div></div>';

        // Posts
        KOMM.pinnwandPosts.forEach(function(p) {
            var authorName = p.users ? kommUserName(p.users) : 'Unbekannt';
            var standortName = p.users && p.users.standorte ? p.users.standorte.name : '';
            var aInit = kommInitials(authorName);

            h += '<div class="bg-white rounded-xl border border-gray-200 mb-3 p-3.5">';
            h += '<div class="flex items-center gap-2 mb-2">';
            h += '<div class="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold" style="background:' + kommAvatarColor(aInit) + '">' + aInit + '</div>';
            h += '<span class="text-[13px] font-bold">' + _escH(authorName) + '</span>';
            h += '<span class="text-[11px] text-gray-400">· ' + _escH(standortName) + ' · ' + kommTimeAgo(p.created_at) + '</span>';
            // Loeschen fuer HQ + eigene
            var uid = _sbUser() ? _sbUser().id : null;
            if (kommIsHQ() || p.user_id === uid) {
                h += '<button onclick="kommDeletePinnwand(\'' + p.id + '\')" class="ml-auto text-xs text-gray-300 hover:text-red-500 cursor-pointer">🗑</button>';
            }
            h += '</div>';
            h += '<p class="text-[13.5px] leading-relaxed whitespace-pre-wrap">' + _escH(p.text) + '</p>';
            if (p.hat_bild && p.bild_url) {
                h += '<div class="mt-2.5 rounded-lg overflow-hidden"><img src="' + _escH(p.bild_url) + '" class="max-w-full max-h-60 object-cover rounded-lg" alt="Bild"></div>';
            } else if (p.hat_bild) {
                h += '<div class="mt-2.5 bg-gray-100 rounded-lg h-36 flex items-center justify-center text-gray-400 text-xs">📷 Bild-Vorschau</div>';
            }
            h += '<div class="flex gap-4 mt-2.5 pt-2 border-t border-gray-100">';
            h += '<button onclick="kommLikePinnwand(\'' + p.id + '\')" class="text-xs ' + (p.likes_count > 0 ? 'text-[#EF7D00] font-semibold' : 'text-gray-500') + ' bg-transparent border-none cursor-pointer">❤️ ' + (p.likes_count || 'Gefaellt mir') + '</button>';
            h += '<button onclick="kommShowPinnwandComments(\'' + p.id + '\')" class="text-xs text-gray-500 bg-transparent border-none cursor-pointer">💬 ' + (p.kommentar_count || 0) + '</button>';
            h += '</div></div>';
        });

        if (KOMM.pinnwandPosts.length === 0) {
            h += '<div class="text-center py-12"><div class="text-4xl mb-3">📌</div><p class="text-gray-500 font-semibold">Noch keine Posts</p></div>';
        }

        h += '</div>';
        el.innerHTML = h;

    } catch(err) {
        console.error('[kommunikation] loadPinnwand:', err);
        el.innerHTML = '<div class="text-center py-8 text-red-500 text-sm">Fehler beim Laden der Pinnwand</div>';
    }
}

// ========== TEAM VIEW ==========
function kommLoadTeam(el) {
    // Gruppiere nach Standort
    var standorte = {};
    KOMM.allUsers.forEach(function(u) {
        var sName;
        if (u.is_hq) {
            sName = 'vit:bikes Zentrale (HQ)';
        } else if (u.standorte && u.standorte.name) {
            sName = u.standorte.name;
        } else {
            sName = 'Ohne Standort';
        }
        if (!standorte[sName]) standorte[sName] = [];
        standorte[sName].push(u);
    });

    var h = '<div class="max-w-[700px] mx-auto py-4 px-4">';

    // Sortiere: eigener Standort zuerst, dann HQ, dann Rest
    var myStandortName = _sbStandort() ? _sbStandort().name : '';
    var sortedKeys = Object.keys(standorte).sort(function(a, b) {
        if (a === myStandortName) return -1;
        if (b === myStandortName) return 1;
        if (a.indexOf('HQ') >= 0) return -1;
        if (b.indexOf('HQ') >= 0) return 1;
        return a.localeCompare(b);
    });

    sortedKeys.forEach(function(sName) {
        var users = standorte[sName];
        h += '<div class="mb-5">';
        h += '<div class="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">' + _escH(sName) + ' (' + users.length + ')</div>';
        users.forEach(function(u) {
            var name = kommUserName(u);
            var init = kommInitials(name);
            var rolle = u.position || (u.is_hq ? 'HQ' : '');
            h += '<div class="bg-white rounded-xl border border-gray-200 px-3.5 py-2.5 flex items-center gap-3 cursor-pointer mb-1 hover:shadow-sm">';
            h += '<div class="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style="background:' + kommAvatarColor(init) + '">' + init + '</div>';
            h += '<div class="flex-1"><div class="text-[13px] font-bold">' + _escH(name) + '</div>';
            h += '<div class="text-[11px] text-gray-500">' + _escH(rolle) + '</div></div>';
            h += '<button onclick="kommStartDMWith(\'' + u.id + '\',\'' + _escH(name).replace(/'/g,"\\'") + '\')" class="px-2.5 py-1 rounded-md bg-orange-50 border border-[#EF7D0040] text-[11px] font-semibold text-[#EF7D00] cursor-pointer hover:bg-orange-100">💬 Chat</button>';
            h += '</div>';
        });
        h += '</div>';
    });

    if (KOMM.allUsers.length === 0) {
        h += '<div class="text-center py-12 text-gray-400"><div class="text-3xl mb-2">👥</div><p class="text-sm">Keine Mitarbeiter gefunden</p></div>';
    }

    h += '</div>';
    el.innerHTML = h;
}

// ========== ADMIN VIEW ==========
function kommLoadAdmin(el) {
    var netzwerk = KOMM.kanaele.filter(function(k) { return k.ist_netzwerk; });
    var standort = KOMM.kanaele.filter(function(k) { return !k.ist_netzwerk; });

    var h = '<div class="max-w-[900px] mx-auto py-4 px-4 flex gap-6">';

    // Settings Sidebar
    h += '<div class="w-44 flex-shrink-0">';
    ['Allgemein','Benutzer','Standorte','Rollen','Kommunikation','Schnittstellen','Billing'].forEach(function(t) {
        var active = t === 'Kommunikation';
        h += '<div class="px-3.5 py-2 text-[13px] cursor-pointer rounded-lg mb-0.5 ' + (active ? 'font-bold text-[#EF7D00] bg-orange-50' : 'text-gray-500 hover:bg-gray-50') + '">' + t + '</div>';
    });
    h += '</div>';

    // Content
    h += '<div class="flex-1">';
    h += '<h3 class="text-base font-bold mb-1">Kommunikation verwalten</h3>';
    h += '<p class="text-xs text-gray-400 mb-5">Channels, Gruppen und Berechtigungen</p>';

    // Netzwerk Channels
    h += '<div class="mb-6">';
    h += '<div class="flex justify-between mb-2.5"><h4 class="text-[13px] font-bold">🌐 Netzwerk-Channels</h4>';
    if (kommIsHQ()) h += '<button onclick="kommNewChannel(true)" class="px-3 py-1 rounded-md bg-[#EF7D00] text-white text-[11px] font-bold cursor-pointer border-none hover:opacity-90">＋ Channel</button>';
    h += '</div>';
    h += '<div class="border border-gray-200 rounded-xl overflow-hidden"><table class="w-full border-collapse text-xs">';
    h += '<thead><tr class="bg-gray-50"><th class="text-left p-2.5 text-gray-500">Channel</th><th class="text-left p-2.5 text-gray-500">Sichtbar</th><th></th></tr></thead><tbody>';
    netzwerk.forEach(function(c) {
        h += '<tr class="border-t border-gray-100"><td class="p-2.5 font-semibold">' + (c.icon || '💬') + ' ' + _escH(c.name) + '</td>';
        h += '<td class="p-2.5"><span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">Alle</span></td>';
        h += '<td class="p-2.5 text-right">';
        if (kommIsHQ()) {
            h += '<button onclick="kommEditChannel(\'' + c.id + '\')" class="text-[11px] text-gray-400 bg-transparent border-none cursor-pointer">✏️</button> ';
            h += '<button onclick="kommDeleteChannel(\'' + c.id + '\')" class="text-[11px] text-red-400 bg-transparent border-none cursor-pointer">🗑</button>';
        }
        h += '</td></tr>';
    });
    h += '</tbody></table></div></div>';

    // Berechtigungen
    h += '<div class="bg-gray-50 rounded-xl p-4">';
    h += '<h4 class="text-[13px] font-bold mb-2.5">🔐 Berechtigungen</h4>';
    var perms = [
        ['Netzwerk-Channel erstellen', '🏢 HQ'],
        ['Standort-Channel/Gruppe', '👔 GF'],
        ['DM senden', '👤 Alle'],
        ['Gruppe erstellen', '👤 Alle'],
        ['Ankuendigung erstellen', '🏢 HQ'],
        ['Pflicht-Lesebestaetigung', '🏢 HQ'],
        ['Pinnwand-Post loeschen', '🏢 HQ, 👔 GF']
    ];
    perms.forEach(function(p) {
        h += '<div class="flex justify-between px-2.5 py-1.5 rounded-md bg-white border border-gray-100 mb-1 text-xs">';
        h += '<span>' + p[0] + '</span><span class="text-gray-500">' + p[1] + '</span></div>';
    });
    h += '</div>';

    h += '</div></div>';
    el.innerHTML = h;
}

// ========== Realtime ==========
function kommSubscribeRealtime() {
    if (KOMM.realtimeSub) {
        _sb().removeChannel(KOMM.realtimeSub);
        KOMM.realtimeSub = null;
    }
    if (!KOMM.activeId) return;

    KOMM.realtimeSub = _sb()
        .channel('komm-chat-' + KOMM.activeId)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_nachrichten',
            filter: 'kanal_id=eq.' + KOMM.activeId
        }, function(payload) {
            kommOnNewMessage(payload.new);
        })
        .subscribe();
}

async function kommOnNewMessage(msg) {
    // Lade User-Daten fuer die neue Nachricht
    var uid = _sbUser() ? _sbUser().id : null;
    if (msg.user_id === uid) return; // Eigene Nachricht schon angezeigt

    try {
        var uResp = await _sb().from('users').select('id, name, vorname, nachname, is_hq, position').eq('id', msg.user_id).single();
        msg.users = uResp.data;
    } catch(e) {}

    KOMM.messages.push(msg);
    var el = document.getElementById('kommContent');
    if (el) {
        await kommLoadChat(el);
    }
}

// ========== Navigation ==========
export function kommGoView(view, id, name) {
    KOMM.view = view;
    KOMM.activeId = id;
    KOMM.activeName = name;

    // Channel als gelesen markieren
    if ((view === 'channel' || view === 'dm' || view === 'group') && id) {
        var uid = _sbUser() ? _sbUser().id : null;
        if (uid) {
            var now = new Date().toISOString();
            // Lokalen Cache sofort updaten
            if (KOMM._gelesenMap) KOMM._gelesenMap[id] = now;
            _sb().from('kanal_mitglieder')
                .update({ zuletzt_gelesen: now })
                .eq('kanal_id', id)
                .eq('user_id', uid)
                .then(function() {});
        }
    }

    renderKomm();
}

export function kommToggleSection(key) {
    KOMM.sidebarSections[key] = !KOMM.sidebarSections[key];
    renderKomm();
}

export function kommToggleSidebar() {
    KOMM.sidebarOpen = !KOMM.sidebarOpen;
    var sidebar = document.getElementById('kommSidebar');
    if (sidebar) sidebar.classList.toggle('hidden');
}

// ========== Nachrichten senden ==========
export async function kommSendMessage() {
    var input = document.getElementById('kommMsgInput');
    if (!input || !input.value.trim()) return;

    var text = input.value.trim();
    input.value = '';

    // @Mentions extrahieren: @Name → UUID lookup
    var mentionIds = [];
    var mentionRegex = /@([A-Za-zÄÖÜäöüß\s]+?)(?=\s|$|[,.])/g;
    var match;
    while ((match = mentionRegex.exec(text)) !== null) {
        var mName = match[1].trim().toLowerCase();
        if (KOMM._userCache) {
            var found = KOMM._userCache.find(function(u) {
                var fullName = ((u.vorname || '') + ' ' + (u.nachname || '')).trim().toLowerCase();
                var displayName = (u.name || '').toLowerCase();
                return fullName === mName || displayName === mName || 
                       (u.nachname || '').toLowerCase() === mName ||
                       (u.vorname || '').toLowerCase() === mName;
            });
            if (found) mentionIds.push(found.id);
        }
    }

    try {
        var user = _sbUser();
        var insertData = {
            kanal_id: KOMM.activeId,
            user_id: user ? user.id : null,
            nachricht: text
        };
        if (mentionIds.length > 0) insertData.mentions = mentionIds;

        var resp = await _sb().from('chat_nachrichten').insert(insertData)
            .select('*, users:user_id(id, name, vorname, nachname, is_hq, position)').single();

        if (resp.error) throw resp.error;

        // Sofort anzeigen
        KOMM.messages.push(resp.data);
        var el = document.getElementById('kommContent');
        if (el) await kommLoadChat(el);

        // Letzte Nachricht auf Kanal aktualisieren
        _sb().from('chat_kanaele').update({
            letzte_nachricht_at: new Date().toISOString(),
            letzte_nachricht_vorschau: text.substring(0, 80)
        }).eq('id', KOMM.activeId).then(function(){});

    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

// ========== Emoji-Reaktionen ==========
export async function kommToggleReaction(msgId, emoji) {
    var uid = _sbUser() ? _sbUser().id : null;
    if (!uid) return;
    try {
        // Pruefen ob schon reagiert
        var check = await _sb().from('komm_reactions')
            .select('id')
            .eq('parent_type', 'chat')
            .eq('parent_id', msgId)
            .eq('user_id', uid)
            .eq('emoji', emoji);
        if (check.data && check.data.length > 0) {
            await _sb().from('komm_reactions').delete().eq('id', check.data[0].id);
        } else {
            await _sb().from('komm_reactions').insert({
                parent_type: 'chat',
                parent_id: msgId,
                emoji: emoji,
                user_id: uid
            });
        }
        var el = document.getElementById('kommContent');
        if (el) await kommLoadChat(el);
    } catch(err) {
        console.error('[kommunikation] toggleReaction:', err);
    }
}

export function kommShowEmojiPicker(msgId) {
    // Einfaches Emoji-Picker Popup
    var existing = document.getElementById('kommEmojiPicker');
    if (existing) existing.remove();

    var el = document.createElement('div');
    el.id = 'kommEmojiPicker';
    el.className = 'fixed z-50 bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex gap-1';
    el.style.top = (event.clientY - 50) + 'px';
    el.style.left = event.clientX + 'px';
    KOMM_EMOJIS.forEach(function(e) {
        el.innerHTML += '<button onclick="kommToggleReaction(\'' + msgId + '\',\'' + e + '\');document.getElementById(\'kommEmojiPicker\').remove()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg cursor-pointer border-none bg-transparent">' + e + '</button>';
    });
    document.body.appendChild(el);
    setTimeout(function() {
        document.addEventListener('click', function handler() {
            var picker = document.getElementById('kommEmojiPicker');
            if (picker) picker.remove();
            document.removeEventListener('click', handler);
        });
    }, 100);
}

// ========== Gelesen ==========
async function kommMarkAsRead() {
    var uid = _sbUser() ? _sbUser().id : null;
    if (!uid || !KOMM.activeId) return;
    // Fuer DMs: gelesen_von aktualisieren
    if (KOMM.view === 'dm') {
        var unread = KOMM.messages.filter(function(m) {
            return m.user_id !== uid && (!m.gelesen_von || m.gelesen_von.indexOf(uid) === -1);
        });
        for (var i = 0; i < unread.length; i++) {
            var m = unread[i];
            var gv = (m.gelesen_von || []).concat([uid]);
            _sb().from('chat_nachrichten').update({ gelesen_von: gv }).eq('id', m.id).then(function(){});
        }
    }
}

// ========== Datei-Upload ==========
export function kommAttachFile() {
    var input = document.createElement('input');
    input.type = 'file';
    input.onchange = async function() {
        if (!input.files || !input.files[0]) return;
        var file = input.files[0];
        try {
            var path = 'chat/' + KOMM.activeId + '/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            var upResp = await _sb().storage.from('komm-attachments').upload(path, file);
            if (upResp.error) throw upResp.error;
            // URL holen
            var urlResp = _sb().storage.from('komm-attachments').getPublicUrl(path);
            var url = urlResp.data ? urlResp.data.publicUrl : path;
            // Nachricht mit Anhang senden
            var user = _sbUser();
            await _sb().from('chat_nachrichten').insert({
                kanal_id: KOMM.activeId,
                user_id: user ? user.id : null,
                nachricht: '📎 ' + file.name,
                hat_attachment: true
            });
            // Attachment-Datensatz
            await _sb().from('komm_attachments').insert({
                parent_type: 'chat',
                parent_id: KOMM.activeId,
                datei_name: file.name,
                datei_url: url,
                datei_groesse: file.size,
                datei_typ: file.type,
                uploaded_by: user ? user.id : null
            });
            _showToast('Datei gesendet', 'success');
            var el = document.getElementById('kommContent');
            if (el) await kommLoadChat(el);
        } catch(err) {
            _showToast('Upload fehlgeschlagen: ' + (err.message || err), 'error');
        }
    };
    input.click();
}

// ========== Sprachnachrichten ==========
export async function kommStartRecording() {
    try {
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        KOMM.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        KOMM.audioChunks = [];
        KOMM.mediaRecorder.ondataavailable = function(e) { KOMM.audioChunks.push(e.data); };
        KOMM.mediaRecorder.onstop = function() {
            stream.getTracks().forEach(function(t) { t.stop(); });
            kommSendVoice();
        };
        KOMM.mediaRecorder.start();
        KOMM.recording = true;
        KOMM.recSeconds = 0;
        KOMM.recInterval = setInterval(function() {
            KOMM.recSeconds++;
            var el = document.getElementById('kommRecTime');
            if (el) el.textContent = Math.floor(KOMM.recSeconds / 60) + ':' + (KOMM.recSeconds % 60).toString().padStart(2, '0');
            if (KOMM.recSeconds >= 300) kommStopRecording(); // 5 min limit
        }, 1000);
        // UI
        var recBar = document.getElementById('kommRecBar');
        var msgInput = document.getElementById('kommMsgInput');
        var voiceBtn = document.getElementById('kommVoiceBtn');
        if (recBar) recBar.classList.remove('hidden');
        if (msgInput) msgInput.classList.add('hidden');
        if (voiceBtn) voiceBtn.classList.add('hidden');
    } catch(err) {
        _showToast('Mikrofon-Zugriff verweigert', 'error');
    }
}

export function kommStopRecording() {
    if (KOMM.mediaRecorder && KOMM.mediaRecorder.state !== 'inactive') {
        KOMM.mediaRecorder.stop();
    }
    KOMM.recording = false;
    clearInterval(KOMM.recInterval);
    // UI zuruecksetzen
    var recBar = document.getElementById('kommRecBar');
    var msgInput = document.getElementById('kommMsgInput');
    var voiceBtn = document.getElementById('kommVoiceBtn');
    if (recBar) recBar.classList.add('hidden');
    if (msgInput) msgInput.classList.remove('hidden');
    if (voiceBtn) voiceBtn.classList.remove('hidden');
}

async function kommSendVoice() {
    if (KOMM.audioChunks.length === 0) return;
    try {
        var blob = new Blob(KOMM.audioChunks, { type: 'audio/webm' });
        var filename = 'voice_' + Date.now() + '.webm';
        var path = 'voice/' + KOMM.activeId + '/' + filename;
        var upResp = await _sb().storage.from('komm-attachments').upload(path, blob);
        if (upResp.error) throw upResp.error;
        var urlResp = _sb().storage.from('komm-attachments').getPublicUrl(path);
        var url = urlResp.data ? urlResp.data.publicUrl : path;

        var user = _sbUser();
        await _sb().from('chat_nachrichten').insert({
            kanal_id: KOMM.activeId,
            user_id: user ? user.id : null,
            nachricht: '🎤 Sprachnachricht (' + KOMM.recSeconds + 's)',
            hat_attachment: true
        });
        _showToast('Sprachnachricht gesendet', 'success');
        var el = document.getElementById('kommContent');
        if (el) await kommLoadChat(el);
    } catch(err) {
        _showToast('Upload fehlgeschlagen: ' + (err.message || err), 'error');
    }
}

// ========== News Actions ==========
export async function kommNewNews() {
    if (document.getElementById('kommNewsOverlay')) return;
    var el = document.createElement('div');
    el.id = 'kommNewsOverlay';
    el.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8';
    el.onclick = function(e) { if (e.target === el) el.remove(); };

    var html = '<div class="bg-white rounded-xl w-full max-w-lg mx-4 shadow-2xl" onclick="event.stopPropagation()">';
    html += '<div class="p-5 border-b border-gray-100 flex items-center justify-between">';
    html += '<h3 class="text-lg font-bold text-gray-800">Neue Ankuendigung</h3>';
    html += '<button onclick="document.getElementById(\'kommNewsOverlay\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>';
    html += '<div class="p-5">';
    html += '<div class="mb-3"><label class="block text-xs font-semibold text-gray-600 mb-1">Titel *</label>';
    html += '<input type="text" id="kommNewsTitel" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></div>';
    html += '<div class="mb-3"><label class="block text-xs font-semibold text-gray-600 mb-1">Inhalt *</label>';
    html += '<textarea id="kommNewsInhalt" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"></textarea></div>';
    html += '<div class="grid grid-cols-2 gap-3 mb-3">';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Kategorie</label>';
    html += '<select id="kommNewsKat" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">';
    html += '<option value="news">📰 News</option><option value="update">🔄 Update</option></select></div>';
    html += '<div class="flex flex-col gap-2 pt-5">';
    html += '<label class="flex items-center gap-2 text-xs"><input type="checkbox" id="kommNewsWichtig"> ⚠️ Wichtig</label>';
    html += '<label class="flex items-center gap-2 text-xs"><input type="checkbox" id="kommNewsPflicht"> 📊 Pflicht-Lesebestaetigung</label>';
    html += '<label class="flex items-center gap-2 text-xs"><input type="checkbox" id="kommNewsPinned"> 📌 Anpinnen</label>';
    html += '</div></div>';
    html += '<div class="flex justify-end gap-2">';
    html += '<button onclick="document.getElementById(\'kommNewsOverlay\').remove()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Abbrechen</button>';
    html += '<button onclick="kommSubmitNews()" class="px-4 py-2 bg-[#EF7D00] text-white rounded-lg text-sm font-semibold hover:opacity-90">Veroeffentlichen</button>';
    html += '</div></div></div>';
    el.innerHTML = html;
    document.body.appendChild(el);
}

export async function kommSubmitNews() {
    var titel = (document.getElementById('kommNewsTitel') || {}).value || '';
    var inhalt = (document.getElementById('kommNewsInhalt') || {}).value || '';
    var kategorie = (document.getElementById('kommNewsKat') || {}).value || 'news';
    var wichtig = (document.getElementById('kommNewsWichtig') || {}).checked || false;
    var pflicht = (document.getElementById('kommNewsPflicht') || {}).checked || false;
    var pinned = (document.getElementById('kommNewsPinned') || {}).checked || false;

    if (!titel.trim() || !inhalt.trim()) { _showToast('Titel und Inhalt sind Pflichtfelder', 'error'); return; }

    try {
        var user = _sbUser();
        await _sb().from('ankuendigungen').insert({
            erstellt_von: user ? user.id : null,
            titel: titel.trim(),
            inhalt: inhalt.trim(),
            kategorie: kategorie,
            wichtig: wichtig,
            ist_pflicht: pflicht,
            pinned: pinned
        });
        var overlay = document.getElementById('kommNewsOverlay');
        if (overlay) overlay.remove();
        _showToast('Ankuendigung veroeffentlicht', 'success');
        KOMM.view = 'news';
        var el = document.getElementById('kommContent');
        if (el) await kommLoadNews(el);
    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

export async function kommMarkNewsRead(newsId) {
    var uid = _sbUser() ? _sbUser().id : null;
    if (!uid) return;
    try {
        await _sb().from('ankuendigungen_gelesen').insert({ ankuendigung_id: newsId, user_id: uid, gelesen_am: new Date().toISOString() });
        var el = document.getElementById('kommContent');
        if (el) await kommLoadNews(el);
    } catch(err) {}
}

export async function kommLikeNews(newsId) {
    try {
        var uid = _sbUser() ? _sbUser().id : null;
        // Toggle reaction
        var check = await _sb().from('komm_reactions').select('id').eq('parent_type', 'ankuendigung').eq('parent_id', newsId).eq('user_id', uid);
        if (check.data && check.data.length > 0) {
            await _sb().from('komm_reactions').delete().eq('id', check.data[0].id);
            await _sb().from('ankuendigungen').update({ likes_count: Math.max(0, (KOMM.newsItems.find(function(n){return n.id===newsId;}) || {}).likes_count - 1 || 0) }).eq('id', newsId);
        } else {
            await _sb().from('komm_reactions').insert({ parent_type: 'ankuendigung', parent_id: newsId, emoji: '❤️', user_id: uid });
            await _sb().from('ankuendigungen').update({ likes_count: ((KOMM.newsItems.find(function(n){return n.id===newsId;}) || {}).likes_count || 0) + 1 }).eq('id', newsId);
        }
        var el = document.getElementById('kommContent');
        if (el) await kommLoadNews(el);
    } catch(err) {}
}

export async function kommShowPflichtDetails(newsId) {
    try {
        var resp = await _sb().from('ankuendigungen_gelesen').select('*, users:user_id(name, vorname, nachname)').eq('ankuendigung_id', newsId);
        var gelesen = resp.data || [];
        var total = KOMM.allUsers.length;
        var gelesenIds = gelesen.map(function(g) { return g.user_id; });
        var ungelesen = KOMM.allUsers.filter(function(u) { return gelesenIds.indexOf(u.id) === -1; });

        var el = document.createElement('div');
        el.id = 'kommPflichtOverlay';
        el.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        el.onclick = function(e) { if (e.target === el) el.remove(); };
        var html = '<div class="bg-white rounded-xl w-full max-w-md mx-4 p-5 shadow-2xl max-h-[80vh] overflow-y-auto" onclick="event.stopPropagation()">';
        html += '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-gray-800">📊 Lesebestaetigung</h3>';
        html += '<button onclick="document.getElementById(\'kommPflichtOverlay\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>';
        html += '<div class="p-3 bg-green-50 rounded-lg mb-3"><p class="text-sm font-semibold text-green-700">✅ Gelesen (' + gelesen.length + '/' + total + ')</p>';
        gelesen.forEach(function(g) {
            var name = g.users ? kommUserName(g.users) : 'Unbekannt';
            html += '<p class="text-xs text-green-600">' + _escH(name) + ' · ' + kommTimeAgo(g.gelesen_am) + '</p>';
        });
        html += '</div>';
        html += '<div class="p-3 bg-red-50 rounded-lg"><p class="text-sm font-semibold text-red-700">⏳ Ausstehend (' + ungelesen.length + ')</p>';
        ungelesen.forEach(function(u) {
            html += '<p class="text-xs text-red-600">' + _escH(kommUserName(u)) + '</p>';
        });
        html += '</div></div>';
        el.innerHTML = html;
        document.body.appendChild(el);
    } catch(err) {}
}

// ========== Pinnwand Actions ==========
export async function kommPostPinnwand() {
    var input = document.getElementById('kommPinnwandInput');
    if (!input || !input.value.trim()) { _showToast('Bitte Text eingeben', 'error'); return; }
    try {
        var user = _sbUser();
        var profile = _sbProfile();
        await _sb().from('pinnwand_posts').insert({
            standort_id: profile ? profile.standort_id : null,
            user_id: user ? user.id : null,
            text: input.value.trim(),
            ist_netzwerk: true
        });
        input.value = '';
        _showToast('Post veroeffentlicht', 'success');
        var el = document.getElementById('kommContent');
        if (el) await kommLoadPinnwand(el);
    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

export async function kommLikePinnwand(postId) {
    try {
        var uid = _sbUser() ? _sbUser().id : null;
        var check = await _sb().from('komm_reactions').select('id').eq('parent_type', 'pinnwand').eq('parent_id', postId).eq('user_id', uid);
        if (check.data && check.data.length > 0) {
            await _sb().from('komm_reactions').delete().eq('id', check.data[0].id);
            var post = KOMM.pinnwandPosts.find(function(p){return p.id===postId;});
            await _sb().from('pinnwand_posts').update({ likes_count: Math.max(0, (post ? post.likes_count : 1) - 1) }).eq('id', postId);
        } else {
            await _sb().from('komm_reactions').insert({ parent_type: 'pinnwand', parent_id: postId, emoji: '❤️', user_id: uid });
            var post2 = KOMM.pinnwandPosts.find(function(p){return p.id===postId;});
            await _sb().from('pinnwand_posts').update({ likes_count: ((post2 ? post2.likes_count : 0) || 0) + 1 }).eq('id', postId);
        }
        var el = document.getElementById('kommContent');
        if (el) await kommLoadPinnwand(el);
    } catch(err) {}
}

export async function kommDeletePinnwand(postId) {
    if (!confirm('Post wirklich loeschen?')) return;
    try {
        await _sb().from('pinnwand_posts').delete().eq('id', postId);
        _showToast('Post geloescht', 'success');
        var el = document.getElementById('kommContent');
        if (el) await kommLoadPinnwand(el);
    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

export function kommShowPinnwandComments(postId) {
    _showToast('Kommentare werden spaeter implementiert', 'info');
}

export function kommPinnwandAttach(type) {
    _showToast('Anhang-Upload wird spaeter implementiert', 'info');
}

// ========== DM/Group/Channel erstellen ==========
export async function kommNewDM() {
    if (document.getElementById('kommNewDMOverlay')) return;

    // Sicherstellen dass User geladen sind
    if (!KOMM.allUsers || KOMM.allUsers.length === 0) {
        try {
            var resp = await _sb().from('users').select('id, name, vorname, nachname, position, standort_id, is_hq, status, standorte:standort_id(name)').eq('status', 'aktiv');
            KOMM.allUsers = (!resp.error && resp.data) ? resp.data : [];
        } catch(e) { KOMM.allUsers = []; }
    }

    // DM-Berechtigung: HQ sieht nur HQ, Partner sieht nur Partner
    var currentIsHQ = kommIsHQ();
    var filteredUsers = KOMM.allUsers.filter(function(u) {
        return currentIsHQ ? u.is_hq : !u.is_hq;
    });

    var el = document.createElement('div');
    el.id = 'kommNewDMOverlay';
    el.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8';
    el.onclick = function(e) { if (e.target === el) el.remove(); };

    var html = '<div class="bg-white rounded-xl w-full max-w-sm mx-4 shadow-2xl" onclick="event.stopPropagation()">';
    html += '<div class="p-4 border-b border-gray-100 flex items-center justify-between">';
    html += '<h3 class="text-base font-bold">Neuer Chat</h3>';
    html += '<button onclick="document.getElementById(\'kommNewDMOverlay\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>';
    html += '<div class="p-4 max-h-80 overflow-y-auto">';
    filteredUsers.forEach(function(u) {
        var uid = _sbUser() ? _sbUser().id : null;
        if (u.id === uid) return;
        var name = kommUserName(u);
        var init = kommInitials(name);
        html += '<div onclick="kommStartDMWith(\'' + u.id + '\',\'' + _escH(name) + '\')" class="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50">';
        html += '<div class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style="background:' + kommAvatarColor(init) + '">' + init + '</div>';
        html += '<div><div class="text-[13px] font-semibold">' + _escH(name) + '</div><div class="text-[11px] text-gray-400">' + _escH(u.rolle || '') + '</div></div></div>';
    });
    html += '</div></div>';
    el.innerHTML = html;
    document.body.appendChild(el);
}

export async function kommStartDMWith(userId, userName) {
    // Overlay schliessen
    var overlay = document.getElementById('kommNewDMOverlay');
    if (overlay) overlay.remove();

    var uid = _sbUser() ? _sbUser().id : null;
    if (!uid) return;

    // Robuster Check: DB-seitig nach bestehendem DM suchen
    try {
        var checkResp = await _sb().from('kanal_mitglieder')
            .select('kanal_id')
            .eq('user_id', uid);
        var myKanalIds = (checkResp.data || []).map(function(m) { return m.kanal_id; });

        if (myKanalIds.length > 0) {
            var partnerResp = await _sb().from('kanal_mitglieder')
                .select('kanal_id, chat_kanaele!inner(typ)')
                .eq('user_id', userId)
                .in('kanal_id', myKanalIds);

            var existingDm = (partnerResp.data || []).find(function(m) {
                return m.chat_kanaele && m.chat_kanaele.typ === 'dm';
            });

            if (existingDm) {
                // Chat wieder einblenden falls ausgeblendet
                await _sb().from('kanal_mitglieder')
                    .update({ ausgeblendet: false })
                    .eq('kanal_id', existingDm.kanal_id)
                    .eq('user_id', uid);
                KOMM.loaded = false;
                await kommLoadData();
                kommGoView('dm', existingDm.kanal_id, userName);
                return;
            }
        }
    } catch(e) { console.warn('DM check failed:', e); }

    // Neuen DM-Kanal erstellen
    try {
        var chResp = await _sb().from('chat_kanaele').insert({
            name: 'DM',
            typ: 'dm',
            ist_privat: true,
            erstellt_von: uid
        }).select().single();
        if (chResp.error) throw chResp.error;

        // Mitglieder hinzufuegen
        await _sb().from('kanal_mitglieder').insert([
            { kanal_id: chResp.data.id, user_id: uid, rolle: 'mitglied' },
            { kanal_id: chResp.data.id, user_id: userId, rolle: 'mitglied' }
        ]);

        KOMM.loaded = false;
        await kommLoadData();
        kommGoView('dm', chResp.data.id, userName);

    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

export function kommNewGroup() {
    _showToast('Gruppen-Erstellung wird spaeter implementiert', 'info');
}

export function kommNewChannel(isNetzwerk) {
    _showToast('Channel-Erstellung wird spaeter implementiert', 'info');
}

export function kommEditChannel(id) {
    _showToast('Channel-Bearbeitung wird spaeter implementiert', 'info');
}

export function kommDeleteChannel(id) {
    _showToast('Channel-Loeschung wird spaeter implementiert', 'info');
}

// ========== KI-Zusammenfassung ==========
export async function kommSummarize() {
    _showToast('KI-Zusammenfassung wird spaeter implementiert', 'info');
}

// ========== Legacy Compat ==========
export function loadKommSidebar() { renderKomm(); }
export function openKommConv(type, id, name) { kommGoView(type, id, name); }
export function filterKommSidebar(q) { /* TODO: sidebar filter */ }
export function kommStartNewChat() { kommNewDM(); }
export function kommInputKeydown(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); kommSendMessage(); } }
export function kommAutoResize(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
export function filterCommunity() {}
export function showForumDetail() {}
export function submitForumPost() {}
export function submitForumComment() {}
export function showBrettDetail() {}
export function submitBrettPost() {}

// ========== GF: Standort-Channel/Gruppe erstellen ==========
window.kommNewStandortChannelDialog = function() {
    var standortId = _sbProfile() ? _sbProfile().standort_id : null;
    var standortName = _sbStandort() ? _sbStandort().name : 'Mein Standort';
    if (!standortId) { _showToast('Kein Standort zugewiesen', 'error'); return; }

    var html = '<div id="kommChModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick="if(event.target===this)this.remove()">';
    html += '<div class="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" onclick="event.stopPropagation()">';
    html += '<h3 class="text-base font-bold mb-4">🏪 Neuer Channel für ' + _escH(standortName) + '</h3>';
    html += '<div class="space-y-3">';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Typ</label>';
    html += '<select id="kommChTyp" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">';
    html += '<option value="channel">📢 Channel (alle am Standort)</option>';
    html += '<option value="group">👥 Gruppe (ausgewählte Mitglieder)</option>';
    html += '</select></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Name *</label>';
    html += '<input id="kommChName" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-vit-orange outline-none" placeholder="z.B. Werkstatt ' + _escH(standortName) + '"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Icon (Emoji)</label>';
    html += '<input id="kommChIcon" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" value="💬" maxlength="4"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Beschreibung</label>';
    html += '<textarea id="kommChDesc" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none outline-none" placeholder="Wofür ist dieser Channel?"></textarea></div>';
    html += '</div>';
    html += '<div class="flex justify-end gap-2 mt-5">';
    html += '<button onclick="document.getElementById(\'kommChModal\').remove()" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Abbrechen</button>';
    html += '<button onclick="kommSaveStandortChannel()" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-bold hover:opacity-90">Erstellen</button>';
    html += '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('kommChName').focus();
};

window.kommSaveStandortChannel = async function() {
    var name = (document.getElementById('kommChName').value || '').trim();
    var icon = (document.getElementById('kommChIcon').value || '💬').trim();
    var desc = (document.getElementById('kommChDesc').value || '').trim();
    var typ = (document.getElementById('kommChTyp').value || 'channel');
    if (!name) { _showToast('Bitte Namen eingeben', 'error'); return; }

    var standortId = _sbProfile() ? _sbProfile().standort_id : null;
    try {
        var resp = await _sb().from('chat_kanaele').insert({
            name: name, icon: icon, beschreibung: desc, typ: typ,
            standort_id: standortId, ist_netzwerk: false, ist_privat: typ === 'group',
            erstellt_von: _sbUser() ? _sbUser().id : null
        }).select().single();
        if (resp.error) throw resp.error;
        var modal = document.getElementById('kommChModal');
        if (modal) modal.remove();
        _showToast('✅ ' + (typ === 'group' ? 'Gruppe' : 'Channel') + ' "' + name + '" erstellt');
        // Reload sidebar
        await kommLoadData();
        renderKomm();
    } catch (e) {
        console.error('Create channel error:', e);
        _showToast('❌ Fehler: ' + (e.message || 'Unbekannt'), 'error');
    }
};

// ========== Sub-Channel erstellen ==========
window.kommNewSubChannel = function(parentId, parentName) {
    var html = '<div id="kommChannelModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick="if(event.target===this)this.remove()">';
    html += '<div class="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl" onclick="event.stopPropagation()">';
    html += '<h3 class="text-base font-bold mb-1">Unterchannel erstellen</h3>';
    html += '<p class="text-xs text-gray-400 mb-4">Unter: ' + _escH(parentName) + '</p>';
    html += '<div class="space-y-3">';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Name *</label><input id="kommSubChName" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-vit-orange focus:border-transparent outline-none" placeholder="z.B. E-Bikes Reparatur"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Icon</label><input id="kommSubChIcon" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" value="💬" maxlength="4"></div>';
    html += '</div>';
    html += '<div class="flex justify-end gap-2 mt-5">';
    html += '<button onclick="document.getElementById(\'kommChannelModal\').remove()" class="px-4 py-2 text-sm text-gray-500">Abbrechen</button>';
    html += '<button onclick="kommSaveSubChannel(\'' + parentId + '\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-bold hover:opacity-90">Erstellen</button>';
    html += '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('kommSubChName').focus();
};

window.kommSaveSubChannel = async function(parentId) {
    var name = (document.getElementById('kommSubChName').value || '').trim();
    var icon = (document.getElementById('kommSubChIcon').value || '💬').trim();
    if (!name) { _showToast('Bitte Name eingeben', 'error'); return; }

    // Parent-Channel laden um Netzwerk/Standort-Info zu erben
    var parent = KOMM.kanaele.find(function(k) { return k.id === parentId; });

    try {
        var resp = await _sb().from('chat_kanaele').insert({
            name: name,
            icon: icon,
            typ: 'channel',
            parent_id: parentId,
            ist_netzwerk: parent ? parent.ist_netzwerk : false,
            standort_id: parent ? parent.standort_id : null,
            sichtbar_fuer_rollen: parent ? parent.sichtbar_fuer_rollen : null,
            erstellt_von: _sbUser() ? _sbUser().id : null
        }).select().single();
        if (resp.error) throw resp.error;

        var modal = document.getElementById('kommChannelModal');
        if (modal) modal.remove();
        _showToast('✅ Unterchannel "' + name + '" erstellt');

        // Auto-Join: Mitglieder vom Parent-Channel übernehmen
        var membersResp = await _sb().from('kanal_mitglieder').select('user_id').eq('kanal_id', parentId);
        if (membersResp.data && membersResp.data.length > 0) {
            var newMembers = membersResp.data.map(function(m) {
                return { kanal_id: resp.data.id, user_id: m.user_id, rolle: 'mitglied' };
            });
            await _sb().from('kanal_mitglieder').insert(newMembers).select();
        }

        KOMM.loaded = false;
        await kommLoadData();
        renderKomm();
    } catch(e) {
        console.error('Sub-channel create error:', e);
        _showToast('❌ Fehler: ' + (e.message || ''), 'error');
    }
};

// ========== DM ausblenden ==========
window.kommShowDmMenu = function(event, dmId, dmName) {
    // Altes Menü entfernen
    var old = document.getElementById('kommDmMenu');
    if (old) old.remove();

    var menu = document.createElement('div');
    menu.id = 'kommDmMenu';
    menu.className = 'fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]';
    menu.style.left = event.clientX + 'px';
    menu.style.top = event.clientY + 'px';

    menu.innerHTML = '<div onclick="kommHideDm(\'' + dmId + '\')" class="px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer flex items-center gap-2">👁‍🗨 Chat ausblenden</div>';

    document.body.appendChild(menu);

    // Klick außerhalb schließt Menü
    setTimeout(function() {
        document.addEventListener('click', function closeMenu() {
            var m = document.getElementById('kommDmMenu');
            if (m) m.remove();
            document.removeEventListener('click', closeMenu);
        });
    }, 50);
};

window.kommHideDm = async function(dmId) {
    var uid = _sbUser() ? _sbUser().id : null;
    if (!uid) return;

    var menu = document.getElementById('kommDmMenu');
    if (menu) menu.remove();

    try {
        await _sb().from('kanal_mitglieder')
            .update({ ausgeblendet: true })
            .eq('kanal_id', dmId)
            .eq('user_id', uid);
        _showToast('Chat ausgeblendet');
        KOMM.loaded = false;
        await kommLoadData();
        if (KOMM.activeId === dmId) {
            KOMM.view = 'channel';
            KOMM.activeId = KOMM.kanaele.length > 0 ? KOMM.kanaele[0].id : null;
            KOMM.activeName = KOMM.kanaele.length > 0 ? KOMM.kanaele[0].name : '';
        }
        renderKomm();
    } catch(e) {
        _showToast('Fehler', 'error');
    }
};

// ========== Thread-System ==========
window.kommOpenThread = async function(msgId) {
    KOMM.threadId = msgId;
    KOMM.threadParent = KOMM.messages.find(function(m) { return m.id === msgId; });

    // Thread-Antworten laden
    try {
        var resp = await _sb().from('chat_nachrichten')
            .select('*, users:user_id(id, name, vorname, nachname, is_hq)')
            .eq('reply_to', msgId)
            .order('created_at', { ascending: true });
        KOMM.threadMessages = resp.data || [];
    } catch(e) { KOMM.threadMessages = []; }

    // Chat neu rendern (Thread wird inline angezeigt)
    var el = document.getElementById('kommContent');
    if (el) await kommLoadChat(el);
};

window.kommCloseThread = function() {
    KOMM.threadId = null;
    KOMM.threadParent = null;
    KOMM.threadMessages = [];
    var el = document.getElementById('kommContent');
    if (el) kommLoadChat(el);
};

async function kommLoadThreadMessages() {
    if (!KOMM.threadId) return;
    var el = document.getElementById('kommThreadContent');
    if (!el) return;

    try {
        var resp = await _sb().from('chat_nachrichten')
            .select('*, users:user_id(id, name, vorname, nachname, is_hq)')
            .eq('reply_to', KOMM.threadId)
            .order('created_at', { ascending: true });
        KOMM.threadMessages = resp.data || [];
    } catch(e) { KOMM.threadMessages = []; }

    var h = '';

    // Parent-Nachricht oben anzeigen
    if (KOMM.threadParent) {
        var p = KOMM.threadParent;
        var pName = p.users ? kommUserName(p.users) : 'Unbekannt';
        var pInit = kommInitials(pName);
        h += '<div class="flex gap-2 pb-3 mb-3 border-b border-gray-100">';
        h += '<div class="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold" style="background:' + kommAvatarColor(pInit) + '">' + pInit + '</div>';
        h += '<div class="flex-1 min-w-0"><div class="text-[12px] font-bold text-gray-800">' + _escH(pName) + ' <span class="font-normal text-gray-400">' + kommTimeShort(p.created_at) + '</span></div>';
        h += '<p class="text-[12px] text-gray-600 mt-0.5 leading-relaxed">' + _escH(p.nachricht || '') + '</p></div></div>';

        if (KOMM.threadMessages.length > 0) {
            h += '<div class="text-[10px] text-gray-400 font-semibold mb-2">' + KOMM.threadMessages.length + ' Antwort' + (KOMM.threadMessages.length > 1 ? 'en' : '') + '</div>';
        }
    }

    // Thread-Antworten
    KOMM.threadMessages.forEach(function(m) {
        var userName = m.users ? kommUserName(m.users) : 'Unbekannt';
        var init = kommInitials(userName);
        var isHq = m.users && m.users.is_hq;
        h += '<div class="flex gap-2 py-1.5">';
        h += '<div class="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold" style="background:' + kommAvatarColor(init) + '">' + init + '</div>';
        h += '<div class="flex-1 min-w-0">';
        h += '<div class="text-[11px]"><span class="font-bold ' + (isHq ? 'text-[#EF7D00]' : 'text-gray-700') + '">' + _escH(userName) + '</span> <span class="text-gray-400">' + kommTimeShort(m.created_at) + '</span></div>';
        h += '<p class="text-[12px] text-gray-700 mt-0.5 leading-relaxed whitespace-pre-wrap">' + _escH(m.nachricht || '') + '</p>';
        h += '</div></div>';
    });

    if (KOMM.threadMessages.length === 0 && KOMM.threadParent) {
        h += '<div class="text-center py-4 text-xs text-gray-400">Noch keine Antworten. Sei der Erste!</div>';
    }

    el.innerHTML = h;
    el.scrollTop = el.scrollHeight;
}

window.kommSendThreadReply = async function() {
    var input = document.getElementById('kommThreadInput');
    if (!input || !input.value.trim() || !KOMM.threadId) return;

    var text = input.value.trim();
    input.value = '';

    try {
        var user = _sbUser();
        var resp = await _sb().from('chat_nachrichten').insert({
            kanal_id: KOMM.activeId,
            user_id: user ? user.id : null,
            nachricht: text,
            reply_to: KOMM.threadId
        }).select('*, users:user_id(id, name, vorname, nachname, is_hq)').single();

        if (resp.error) throw resp.error;

        KOMM.threadMessages.push(resp.data);

        // Update reply_count auf der Parent-Nachricht im lokalen State
        var parent = KOMM.messages.find(function(m) { return m.id === KOMM.threadId; });
        if (parent) parent.reply_count = (parent.reply_count || 0) + 1;

        // Chat inline neu rendern
        var el = document.getElementById('kommContent');
        if (el) await kommLoadChat(el);
    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
};

// ========== Benachrichtigungs-Einstellungen ==========
window.kommShowNotifSettings = async function() {
    if (document.getElementById('kommNotifModal')) return;

    var uid = _sbUser() ? _sbUser().id : null;
    if (!uid) return;

    // Aktuelle Einstellungen laden
    var resp = await _sb().from('komm_benachrichtigungen').select('*').eq('user_id', uid).single();
    var s = resp.data || {};

    var categories = [
        { key: 'dm', label: '💬 Direktnachrichten', desc: 'Wenn jemand dir eine DM schreibt' },
        { key: 'mention', label: '🔔 @Erwähnungen', desc: 'Wenn dich jemand in einem Channel erwähnt' },
        { key: 'ankuendigung', label: '📢 Ankündigungen', desc: 'Neue News & Pflicht-Bestätigungen' },
        { key: 'channel', label: '# Channel-Nachrichten', desc: 'Jede neue Nachricht in Channels' }
    ];

    var h = '<div id="kommNotifModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick="if(event.target===this)this.remove()">';
    h += '<div class="bg-white rounded-xl w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto" onclick="event.stopPropagation()">';
    h += '<div class="p-5 border-b border-gray-100 flex items-center justify-between">';
    h += '<div><h3 class="text-base font-bold">🔔 Benachrichtigungen</h3><p class="text-xs text-gray-400">Wähle wie du informiert werden möchtest</p></div>';
    h += '<button onclick="document.getElementById(\'kommNotifModal\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>';

    h += '<div class="p-5 space-y-5">';

    categories.forEach(function(cat) {
        h += '<div class="bg-gray-50 rounded-xl p-4">';
        h += '<div class="mb-3"><div class="text-sm font-bold text-gray-800">' + cat.label + '</div>';
        h += '<div class="text-[11px] text-gray-400">' + cat.desc + '</div></div>';
        h += '<div class="space-y-2">';

        var channels = [
            { suffix: '_glocke', label: '🔔 Cockpit-Glocke', icon: '🔔' },
            { suffix: '_push', label: '📱 Push-Benachrichtigung', icon: '📱' },
            { suffix: '_email', label: '📧 E-Mail', icon: '📧' }
        ];

        channels.forEach(function(ch) {
            var field = cat.key + ch.suffix;
            var checked = s[field] !== false && s[field] !== undefined ? s[field] : false;
            h += '<label class="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-100 cursor-pointer hover:border-orange-200">';
            h += '<span class="text-xs font-medium text-gray-700">' + ch.label + '</span>';
            h += '<div class="relative">';
            h += '<input type="checkbox" class="kommNotifCheck sr-only" data-field="' + field + '"' + (checked ? ' checked' : '') + '>';
            h += '<div class="w-9 h-5 rounded-full transition-colors ' + (checked ? 'bg-[#EF7D00]' : 'bg-gray-200') + '" onclick="kommToggleNotifSwitch(this)">';
            h += '<div class="w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-transform ' + (checked ? 'translate-x-4' : 'translate-x-0.5') + '"></div>';
            h += '</div></div></label>';
        });

        h += '</div></div>';
    });

    h += '</div>';
    h += '<div class="p-4 border-t border-gray-100 flex justify-end">';
    h += '<button onclick="kommSaveNotifSettings()" class="px-5 py-2 bg-vit-orange text-white rounded-lg text-sm font-bold hover:opacity-90">Speichern</button>';
    h += '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', h);
};

window.kommToggleNotifSwitch = function(toggle) {
    var label = toggle.closest('label');
    var checkbox = label.querySelector('.kommNotifCheck');
    checkbox.checked = !checkbox.checked;
    var dot = toggle.querySelector('div');
    if (checkbox.checked) {
        toggle.className = 'w-9 h-5 rounded-full transition-colors bg-[#EF7D00]';
        dot.className = 'w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-transform translate-x-4';
    } else {
        toggle.className = 'w-9 h-5 rounded-full transition-colors bg-gray-200';
        dot.className = 'w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-transform translate-x-0.5';
    }
};

window.kommSaveNotifSettings = async function() {
    var uid = _sbUser() ? _sbUser().id : null;
    if (!uid) return;

    var data = { user_id: uid, updated_at: new Date().toISOString() };
    document.querySelectorAll('.kommNotifCheck').forEach(function(cb) {
        data[cb.dataset.field] = cb.checked;
    });

    try {
        var resp = await _sb().from('komm_benachrichtigungen').upsert(data);
        if (resp.error) throw resp.error;
        _showToast('✅ Benachrichtigungen gespeichert');
        var modal = document.getElementById('kommNotifModal');
        if (modal) modal.remove();
    } catch(e) {
        _showToast('❌ Fehler: ' + (e.message || ''), 'error');
    }
};

// ========== @Mention Autocomplete ==========
async function kommLoadUserCache() {
    if (KOMM._userCache) return;
    // Zuerst versuchen allUsers zu nutzen
    if (KOMM.allUsers && KOMM.allUsers.length > 0) {
        KOMM._userCache = KOMM.allUsers;
        return;
    }
    try {
        var resp = await _sb().from('users').select('id, name, vorname, nachname, position, is_hq').eq('status', 'aktiv');
        KOMM._userCache = (!resp.error && resp.data) ? resp.data : [];
    } catch(e) { KOMM._userCache = []; }
}

window.kommCheckMention = function(textarea) {
    var val = textarea.value;
    var pos = textarea.selectionStart;
    var dd = document.getElementById('kommMentionDropdown');
    if (!dd) return;

    // Find @ before cursor
    var before = val.substring(0, pos);
    var atMatch = before.match(/@([A-Za-zÄÖÜäöüß]*)$/);

    if (!atMatch) { dd.classList.add('hidden'); return; }

    var query = atMatch[1].toLowerCase();

    // Load cache if needed
    if (!KOMM._userCache) {
        kommLoadUserCache().then(function() { kommCheckMention(textarea); });
        return;
    }

    // Filter users
    var matches = KOMM._userCache.filter(function(u) {
        if (!query) return true; // show all on bare @
        var full = ((u.vorname || '') + ' ' + (u.nachname || '') + ' ' + (u.name || '')).toLowerCase();
        return full.indexOf(query) >= 0;
    }).slice(0, 8);

    if (matches.length === 0) { dd.classList.add('hidden'); return; }

    var h = '';
    matches.forEach(function(u) {
        var displayName = u.vorname && u.nachname ? u.vorname + ' ' + u.nachname : (u.name || 'Unbekannt');
        var initials = ((u.vorname || 'X')[0] + (u.nachname || 'X')[0]).toUpperCase();
        var roleBadge = u.is_hq ? '<span class="text-[9px] bg-orange-50 text-[#EF7D00] px-1 rounded">HQ</span>' : '';
        h += '<div onclick="kommInsertMention(\'' + u.id + '\',\'' + _escH(displayName).replace(/'/g, "\\'") + '\')" class="px-3 py-2 flex items-center gap-2 hover:bg-orange-50 cursor-pointer text-xs">';
        h += '<div class="w-6 h-6 rounded-md bg-gray-300 flex items-center justify-center text-white text-[10px] font-bold">' + initials + '</div>';
        h += '<span class="font-semibold text-gray-800">' + _escH(displayName) + '</span>';
        h += '<span class="text-gray-400 text-[10px]">' + _escH(u.rolle || '') + '</span>';
        h += roleBadge;
        h += '</div>';
    });
    dd.innerHTML = h;
    dd.classList.remove('hidden');
};

window.kommInsertMention = function(userId, displayName) {
    var textarea = document.getElementById('kommMsgInput');
    if (!textarea) return;

    var val = textarea.value;
    var pos = textarea.selectionStart;
    var before = val.substring(0, pos);
    var after = val.substring(pos);

    // Replace @partial with @FullName
    var newBefore = before.replace(/@[A-Za-zÄÖÜäöüß]*$/, '@' + displayName + ' ');
    textarea.value = newBefore + after;
    textarea.selectionStart = textarea.selectionEnd = newBefore.length;
    textarea.focus();

    var dd = document.getElementById('kommMentionDropdown');
    if (dd) dd.classList.add('hidden');
};

// ========== Strangler Fig: window.* registration ==========
const _exports = {
    renderKomm, showKommTab, loadKommSidebar, openKommConv, kommSendMessage,
    filterKommSidebar, kommGoView, kommToggleSection, kommToggleSidebar,
    kommToggleReaction, kommShowEmojiPicker, kommAttachFile,
    kommStartRecording, kommStopRecording,
    kommNewNews, kommSubmitNews, kommMarkNewsRead, kommLikeNews, kommShowPflichtDetails,
    kommPostPinnwand, kommLikePinnwand, kommDeletePinnwand, kommShowPinnwandComments, kommPinnwandAttach,
    kommNewDM, kommStartDMWith, kommNewGroup, kommNewChannel, kommEditChannel, kommDeleteChannel,
    kommSummarize, kommStartNewChat, kommInputKeydown, kommAutoResize, kommCheckMention, kommInsertMention,
    filterCommunity, showForumDetail, submitForumPost, submitForumComment, showBrettDetail, submitBrettPost
};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
