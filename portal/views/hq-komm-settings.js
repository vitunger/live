/**
 * views/hq-komm-settings.js
 * Kommunikations-Verwaltung im HQ-Einstellungen Tab
 * Channel CRUD, Berechtigungen
 */
function _sb() { return window.sb; }
function _sbUser() { return window.sbUser; }
function _sbProfile() { return window.sbProfile; }
function _escH(s) { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _showToast(m, t) { if (typeof window.showToast === 'function') window.showToast(m, t); }

var _kommChannels = [];

export async function renderKommSettings() {
    var container = document.getElementById('kommSettingsContainer');
    if (!container) return;
    container.innerHTML = '<div class="p-8 text-center text-gray-400"><div class="animate-pulse">Lade Channels...</div></div>';

    try {
        var resp = await _sb().from('chat_kanaele').select('*').order('ist_netzwerk', { ascending: false }).order('name');
        _kommChannels = (!resp.error && resp.data) ? resp.data : [];
    } catch (e) { console.error('Komm settings load:', e); }

    var netz = _kommChannels.filter(function(c) { return c.ist_netzwerk; });
    var standort = _kommChannels.filter(function(c) { return !c.ist_netzwerk && c.typ === 'channel'; });
    var gruppen = _kommChannels.filter(function(c) { return c.typ === 'group'; });

    var h = '';
    h += '<div class="flex items-center gap-3 mb-5"><span class="text-2xl">💬</span><div><h3 class="font-bold text-gray-800">Kommunikation verwalten</h3><p class="text-xs text-gray-500">Channels, Gruppen und Berechtigungen für das Netzwerk</p></div></div>';

    // === Netzwerk-Channels ===
    h += '<div class="mb-8">';
    h += '<div class="flex items-center justify-between mb-3"><h4 class="text-sm font-bold text-gray-700">🌐 Netzwerk-Channels</h4>';
    h += '<button onclick="kommNewChannelDialog(true)" class="px-3 py-1.5 rounded-lg bg-vit-orange text-white text-xs font-bold hover:opacity-90">＋ Neuer Channel</button></div>';
    h += '<div class="vit-card overflow-hidden"><table class="w-full text-sm"><thead><tr class="bg-gray-50 border-b border-gray-200">';
    h += '<th class="text-left p-3 text-xs font-semibold text-gray-500">Channel</th>';
    h += '<th class="text-left p-3 text-xs font-semibold text-gray-500">Beschreibung</th>';
    h += '<th class="text-left p-3 text-xs font-semibold text-gray-500">Sichtbar</th>';
    h += '<th class="p-3"></th></tr></thead><tbody>';

    // Parent-Channels zuerst, dann Sub-Channels darunter
    var netzParents = netz.filter(function(c) { return !c.parent_id; });
    var netzSubs = {};
    netz.forEach(function(c) { if (c.parent_id) { if (!netzSubs[c.parent_id]) netzSubs[c.parent_id] = []; netzSubs[c.parent_id].push(c); } });

    netzParents.forEach(function(c) {
        var subs = netzSubs[c.id] || [];
        h += '<tr class="border-b border-gray-100 hover:bg-gray-50">';
        h += '<td class="p-3 font-semibold text-gray-800">' + (c.icon || '💬') + ' ' + _escH(c.name) + (subs.length > 0 ? ' <span class="text-[10px] text-gray-400 font-normal">(' + subs.length + ' Sub)</span>' : '') + '</td>';
        h += '<td class="p-3 text-xs text-gray-500">' + _escH(c.beschreibung || '—') + '</td>';
        h += '<td class="p-3"><span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ' + (c.sichtbar_fuer_rollen && c.sichtbar_fuer_rollen.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600') + '">' + (c.sichtbar_fuer_rollen && c.sichtbar_fuer_rollen.length > 0 ? c.sichtbar_fuer_rollen.join(', ') : 'Alle') + '</span></td>';
        h += '<td class="p-3 text-right">';
        h += '<button onclick="kommEditChannelDialog(\'' + c.id + '\')" class="text-xs text-gray-400 hover:text-vit-orange bg-transparent border-none cursor-pointer mr-2" title="Bearbeiten">✏️</button>';
        h += '<button onclick="kommDeleteChannelConfirm(\'' + c.id + '\',\'' + _escH(c.name).replace(/'/g, "\\'") + '\')" class="text-xs text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer" title="Löschen">🗑</button>';
        h += '</td></tr>';
        // Sub-Channels eingerückt
        subs.forEach(function(s) {
            h += '<tr class="border-b border-gray-50 hover:bg-gray-50 bg-gray-50/50">';
            h += '<td class="p-3 pl-8 text-gray-600"><span class="text-gray-300 mr-1">└</span> ' + (s.icon || '💬') + ' ' + _escH(s.name) + '</td>';
            h += '<td class="p-3 text-xs text-gray-400">' + _escH(s.beschreibung || '—') + '</td>';
            h += '<td class="p-3"><span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-500">erbt</span></td>';
            h += '<td class="p-3 text-right">';
            h += '<button onclick="kommEditChannelDialog(\'' + s.id + '\')" class="text-xs text-gray-400 hover:text-vit-orange bg-transparent border-none cursor-pointer mr-2">✏️</button>';
            h += '<button onclick="kommDeleteChannelConfirm(\'' + s.id + '\',\'' + _escH(s.name).replace(/'/g, "\\'") + '\')" class="text-xs text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer">🗑</button>';
            h += '</td></tr>';
        });
    });
    if (netz.length === 0) h += '<tr><td colspan="4" class="p-4 text-center text-gray-400 text-xs">Keine Netzwerk-Channels</td></tr>';
    h += '</tbody></table></div></div>';

    // === Standort-Channels ===
    h += '<div class="mb-8">';
    h += '<div class="flex items-center justify-between mb-3"><h4 class="text-sm font-bold text-gray-700">🏪 Standort-Channels</h4>';
    h += '<span class="text-xs text-gray-400">Erstellt von GF der jeweiligen Standorte</span></div>';
    h += '<div class="vit-card overflow-hidden"><table class="w-full text-sm"><thead><tr class="bg-gray-50 border-b border-gray-200">';
    h += '<th class="text-left p-3 text-xs font-semibold text-gray-500">Channel</th>';
    h += '<th class="text-left p-3 text-xs font-semibold text-gray-500">Standort</th>';
    h += '<th class="p-3"></th></tr></thead><tbody>';
    standort.forEach(function(c) {
        h += '<tr class="border-b border-gray-100 hover:bg-gray-50">';
        h += '<td class="p-3 font-semibold text-gray-800">' + (c.icon || '🏪') + ' ' + _escH(c.name) + '</td>';
        h += '<td class="p-3 text-xs text-gray-500">' + (c.standort_id || '—') + '</td>';
        h += '<td class="p-3 text-right">';
        h += '<button onclick="kommDeleteChannelConfirm(\'' + c.id + '\',\'' + _escH(c.name).replace(/'/g, "\\'") + '\')" class="text-xs text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer">🗑</button>';
        h += '</td></tr>';
    });
    if (standort.length === 0) h += '<tr><td colspan="3" class="p-4 text-center text-gray-400 text-xs">Keine Standort-Channels — GFs können diese in ihrem Standort erstellen</td></tr>';
    h += '</tbody></table></div></div>';

    // === Gruppen ===
    h += '<div class="mb-8">';
    h += '<div class="flex items-center justify-between mb-3"><h4 class="text-sm font-bold text-gray-700">👥 Gruppen</h4></div>';
    h += '<div class="vit-card overflow-hidden"><table class="w-full text-sm"><thead><tr class="bg-gray-50 border-b border-gray-200">';
    h += '<th class="text-left p-3 text-xs font-semibold text-gray-500">Gruppe</th>';
    h += '<th class="text-left p-3 text-xs font-semibold text-gray-500">Mitglieder</th>';
    h += '<th class="p-3"></th></tr></thead><tbody>';
    gruppen.forEach(function(c) {
        h += '<tr class="border-b border-gray-100 hover:bg-gray-50">';
        h += '<td class="p-3 font-semibold text-gray-800">' + (c.icon || '👥') + ' ' + _escH(c.name) + '</td>';
        h += '<td class="p-3 text-xs text-gray-500">—</td>';
        h += '<td class="p-3 text-right">';
        h += '<button onclick="kommDeleteChannelConfirm(\'' + c.id + '\',\'' + _escH(c.name).replace(/'/g, "\\'") + '\')" class="text-xs text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer">🗑</button>';
        h += '</td></tr>';
    });
    if (gruppen.length === 0) h += '<tr><td colspan="3" class="p-4 text-center text-gray-400 text-xs">Keine Gruppen vorhanden</td></tr>';
    h += '</tbody></table></div></div>';

    // === Berechtigungen ===
    h += '<div class="vit-card p-5">';
    h += '<h4 class="text-sm font-bold text-gray-700 mb-3">🔐 Berechtigungen</h4>';
    h += '<div class="space-y-1.5">';
    var perms = [
        ['Netzwerk-Channel erstellen', '🏢 HQ'],
        ['Standort-Channel / Gruppe erstellen', '👔 GF / Inhaber'],
        ['Direktnachricht senden', '👤 Alle Mitarbeiter'],
        ['Gruppe erstellen (allgemein)', '👤 Alle Mitarbeiter'],
        ['Ankündigung erstellen', '🏢 HQ'],
        ['Pflicht-Lesebestätigung setzen', '🏢 HQ'],
        ['Pinnwand-Post löschen / moderieren', '🏢 HQ, 👔 GF (eigener Standort)']
    ];
    perms.forEach(function(p) {
        h += '<div class="flex justify-between items-center px-3 py-2 rounded-lg bg-gray-50 text-xs">';
        h += '<span class="text-gray-700">' + p[0] + '</span>';
        h += '<span class="text-gray-500 font-medium">' + p[1] + '</span></div>';
    });
    h += '</div></div>';

    container.innerHTML = h;
}

// === Channel erstellen Dialog ===
window.kommNewChannelDialog = function(isNetzwerk) {
    // Lade Parent-Channel-Optionen (nur Netzwerk-Channels ohne parent_id)
    var parentOptions = _kommChannels.filter(function(c) { return c.ist_netzwerk && !c.parent_id && !c.ist_hq_channel; });

    var html = '<div id="kommChannelModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick="if(event.target===this)this.remove()">';
    html += '<div class="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto" onclick="event.stopPropagation()">';
    html += '<h3 class="text-base font-bold mb-4">' + (isNetzwerk ? '🌐 Neuer Netzwerk-Channel' : '🏪 Neuer Standort-Channel') + '</h3>';
    html += '<div class="space-y-3">';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Name *</label><input id="kommChName" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-vit-orange focus:border-transparent outline-none" placeholder="z.B. Marketing Netzwerk"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Icon (Emoji)</label><input id="kommChIcon" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" value="💬" maxlength="4"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Beschreibung</label><textarea id="kommChDesc" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none outline-none" placeholder="Wofür ist dieser Channel?"></textarea></div>';

    // Parent-Channel Auswahl (Sub-Channel)
    if (isNetzwerk && parentOptions.length > 0) {
        html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Übergeordneter Channel (optional)</label>';
        html += '<select id="kommChParent" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none">';
        html += '<option value="">— Eigenständiger Channel —</option>';
        parentOptions.forEach(function(p) {
            html += '<option value="' + p.id + '">' + (p.icon || '💬') + ' ' + _escH(p.name) + '</option>';
        });
        html += '</select>';
        html += '<p class="text-[10px] text-gray-400 mt-1">Wähle einen Channel um diesen als Unterchannel zu erstellen</p></div>';
    }

    html += _kommRollenCheckboxes([]);
    html += '</div>';
    html += '<div class="flex justify-end gap-2 mt-5">';
    html += '<button onclick="document.getElementById(\'kommChannelModal\').remove()" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Abbrechen</button>';
    html += '<button onclick="kommSaveNewChannel(' + isNetzwerk + ')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-bold hover:opacity-90">Erstellen</button>';
    html += '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('kommChName').focus();
};

window.kommSaveNewChannel = async function(isNetzwerk) {
    var name = (document.getElementById('kommChName').value || '').trim();
    var icon = (document.getElementById('kommChIcon').value || '💬').trim();
    var desc = (document.getElementById('kommChDesc').value || '').trim();
    if (!name) { _showToast('Bitte Channel-Name eingeben', 'error'); return; }

    var rollen = _getSelectedRollen();
    var parentEl = document.getElementById('kommChParent');
    var parentId = parentEl ? parentEl.value || null : null;

    try {
        var data = {
            name: name,
            icon: icon,
            beschreibung: desc,
            ist_netzwerk: isNetzwerk,
            typ: 'channel',
            ist_privat: false,
            erstellt_von: _sbUser() ? _sbUser().id : null,
            sichtbar_fuer_rollen: rollen.length > 0 ? rollen : null,
            parent_id: parentId
        };
        var resp = await _sb().from('chat_kanaele').insert(data).select().single();
        if (resp.error) throw resp.error;
        var modal = document.getElementById('kommChannelModal');
        if (modal) modal.remove();
        _showToast('✅ Channel "' + name + '" erstellt');
        renderKommSettings();
    } catch (e) {
        console.error('Channel create error:', e);
        _showToast('❌ Fehler: ' + (e.message || 'Unbekannt'), 'error');
    }
};

// === Channel bearbeiten Dialog ===
window.kommEditChannelDialog = async function(channelId) {
    var ch = _kommChannels.find(function(c) { return c.id === channelId; });
    if (!ch) return;

    // Lade Extra-Zugang User
    var extraResp = await _sb().from('kanal_extra_zugang').select('user_id, users:user_id(name, vorname, nachname)').eq('kanal_id', channelId);
    var extraUsers = (!extraResp.error && extraResp.data) ? extraResp.data : [];

    var html = '<div id="kommChannelModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick="if(event.target===this)this.remove()">';
    html += '<div class="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto" onclick="event.stopPropagation()">';
    html += '<h3 class="text-base font-bold mb-4">✏️ Channel bearbeiten</h3>';
    html += '<div class="space-y-3">';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Name *</label><input id="kommChName" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-vit-orange focus:border-transparent outline-none" value="' + _escH(ch.name) + '"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Icon (Emoji)</label><input id="kommChIcon" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" value="' + _escH(ch.icon || '💬') + '" maxlength="4"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Beschreibung</label><textarea id="kommChDesc" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none outline-none">' + _escH(ch.beschreibung || '') + '</textarea></div>';

    // Rollen-Checkboxen
    html += _kommRollenCheckboxes(ch.sichtbar_fuer_rollen || []);

    // Extra-Zugang: Einzelne User
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">➕ Zusätzlicher Zugang (einzelne User)</label>';
    html += '<div id="kommExtraUsers" class="space-y-1 mb-2">';
    extraUsers.forEach(function(eu) {
        var u = eu.users || {};
        var uName = u.vorname && u.nachname ? u.vorname + ' ' + u.nachname : (u.name || 'Unbekannt');
        html += '<div class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-xs">';
        html += '<span class="font-medium">' + _escH(uName) + '</span>';
        html += '<button onclick="kommRemoveExtraUser(\'' + channelId + '\',\'' + eu.user_id + '\',this)" class="text-red-400 hover:text-red-600 text-xs cursor-pointer bg-transparent border-none">✕</button>';
        html += '</div>';
    });
    html += '</div>';
    html += '<div class="flex gap-2"><input id="kommExtraUserSearch" class="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none" placeholder="Name eingeben..."><button onclick="kommAddExtraUserSearch(\'' + channelId + '\')" class="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-200 cursor-pointer border-none">Hinzufügen</button></div>';
    html += '</div>';

    html += '</div>';
    html += '<div class="flex justify-end gap-2 mt-5">';
    html += '<button onclick="document.getElementById(\'kommChannelModal\').remove()" class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Abbrechen</button>';
    html += '<button onclick="kommSaveEditChannel(\'' + channelId + '\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-bold hover:opacity-90">Speichern</button>';
    html += '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
};

window.kommSaveEditChannel = async function(channelId) {
    var name = (document.getElementById('kommChName').value || '').trim();
    var icon = (document.getElementById('kommChIcon').value || '💬').trim();
    var desc = (document.getElementById('kommChDesc').value || '').trim();
    if (!name) { _showToast('Bitte Channel-Name eingeben', 'error'); return; }

    var rollen = _getSelectedRollen();

    try {
        var resp = await _sb().from('chat_kanaele').update({
            name: name,
            icon: icon,
            beschreibung: desc,
            sichtbar_fuer_rollen: rollen.length > 0 ? rollen : null
        }).eq('id', channelId);
        if (resp.error) throw resp.error;
        var modal = document.getElementById('kommChannelModal');
        if (modal) modal.remove();
        _showToast('✅ Channel aktualisiert');
        renderKommSettings();
    } catch (e) {
        console.error('Channel edit error:', e);
        _showToast('❌ Fehler: ' + (e.message || 'Unbekannt'), 'error');
    }
};

// === Channel löschen ===
window.kommDeleteChannelConfirm = function(channelId, channelName) {
    if (!confirm('Channel "' + channelName + '" wirklich löschen?\n\nAlle Nachrichten in diesem Channel gehen verloren!')) return;
    kommDeleteChannel(channelId);
};

async function kommDeleteChannel(channelId) {
    try {
        // Erst Nachrichten löschen
        await _sb().from('chat_nachrichten').delete().eq('kanal_id', channelId);
        // Dann Mitglieder
        await _sb().from('kanal_mitglieder').delete().eq('kanal_id', channelId);
        // Dann Channel
        var resp = await _sb().from('chat_kanaele').delete().eq('id', channelId);
        if (resp.error) throw resp.error;
        _showToast('✅ Channel gelöscht');
        renderKommSettings();
    } catch (e) {
        console.error('Channel delete error:', e);
        _showToast('❌ Fehler beim Löschen', 'error');
    }
}

// Rollen-Checkboxen Helper
function _kommRollenCheckboxes(selected) {
    var rollen = [
        { key: 'inhaber', label: '👔 GF / Inhaber', ebene: 'partner' },
        { key: 'verkauf', label: '🛒 Verkauf', ebene: 'partner' },
        { key: 'werkstatt', label: '🔧 Werkstatt', ebene: 'partner' },
        { key: 'buchhaltung', label: '📊 Buchhaltung', ebene: 'partner' },
        { key: 'hq', label: '🏢 HQ (alle HQ-Rollen)', ebene: 'hq' }
    ];
    var h = '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Sichtbar für Rollen</label>';
    h += '<p class="text-[10px] text-gray-400 mb-2">Leer = alle sehen den Channel. Ausgewählt = nur diese Rollen.</p>';
    h += '<div class="space-y-1">';
    rollen.forEach(function(r) {
        var checked = selected && selected.indexOf(r.key) >= 0;
        h += '<label class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs ' + (checked ? 'bg-orange-50 border border-orange-200' : 'border border-gray-100 hover:bg-gray-50') + '">';
        h += '<input type="checkbox" class="kommRolleCheck accent-[#EF7D00]" value="' + r.key + '"' + (checked ? ' checked' : '') + '>';
        h += '<span class="font-medium">' + r.label + '</span></label>';
    });
    h += '</div></div>';
    return h;
}

function _getSelectedRollen() {
    var checks = document.querySelectorAll('.kommRolleCheck:checked');
    var rollen = [];
    checks.forEach(function(c) { rollen.push(c.value); });
    return rollen;
}

// Extra-Zugang: User hinzufügen
window.kommAddExtraUserSearch = async function(channelId) {
    var input = document.getElementById('kommExtraUserSearch');
    if (!input || !input.value.trim()) { _showToast('Name eingeben', 'error'); return; }

    var query = input.value.trim().toLowerCase();
    var resp = await _sb().from('users').select('id, name, vorname, nachname').eq('status', 'aktiv');
    var users = (resp.data || []).filter(function(u) {
        var full = ((u.vorname || '') + ' ' + (u.nachname || '') + ' ' + (u.name || '')).toLowerCase();
        return full.indexOf(query) >= 0;
    });

    if (users.length === 0) { _showToast('Kein User gefunden', 'error'); return; }

    var user = users[0]; // Ersten Match nehmen
    try {
        await _sb().from('kanal_extra_zugang').upsert({
            kanal_id: channelId,
            user_id: user.id,
            erstellt_von: _sbUser() ? _sbUser().id : null
        }, { onConflict: 'kanal_id,user_id' });

        var uName = user.vorname && user.nachname ? user.vorname + ' ' + user.nachname : (user.name || 'User');
        var container = document.getElementById('kommExtraUsers');
        if (container) {
            var div = document.createElement('div');
            div.className = 'flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-xs';
            div.innerHTML = '<span class="font-medium">' + _escH(uName) + '</span><button onclick="kommRemoveExtraUser(\'' + channelId + '\',\'' + user.id + '\',this)" class="text-red-400 hover:text-red-600 text-xs cursor-pointer bg-transparent border-none">✕</button>';
            container.appendChild(div);
        }
        input.value = '';
        _showToast('✅ ' + uName + ' hinzugefügt');
    } catch(e) {
        _showToast('❌ Fehler', 'error');
    }
};

// Extra-Zugang: User entfernen
window.kommRemoveExtraUser = async function(channelId, userId, btn) {
    try {
        await _sb().from('kanal_extra_zugang').delete().eq('kanal_id', channelId).eq('user_id', userId);
        if (btn && btn.parentElement) btn.parentElement.remove();
        _showToast('✅ Zugang entfernt');
    } catch(e) {
        _showToast('❌ Fehler', 'error');
    }
};

// Window exports
window.renderKommSettings = renderKommSettings;

const _exports = { renderKommSettings };
Object.entries(_exports).forEach(function(e) { window[e[0]] = e[1]; });
