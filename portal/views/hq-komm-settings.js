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
    netz.forEach(function(c) {
        h += '<tr class="border-b border-gray-100 hover:bg-gray-50">';
        h += '<td class="p-3 font-semibold text-gray-800">' + (c.icon || '💬') + ' ' + _escH(c.name) + '</td>';
        h += '<td class="p-3 text-xs text-gray-500">' + _escH(c.beschreibung || '—') + '</td>';
        h += '<td class="p-3"><span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-semibold">' + (c.sichtbar_fuer_rollen ? c.sichtbar_fuer_rollen.join(', ') : 'Alle') + '</span></td>';
        h += '<td class="p-3 text-right">';
        h += '<button onclick="kommEditChannelDialog(\'' + c.id + '\')" class="text-xs text-gray-400 hover:text-vit-orange bg-transparent border-none cursor-pointer mr-2" title="Bearbeiten">✏️</button>';
        h += '<button onclick="kommDeleteChannelConfirm(\'' + c.id + '\',\'' + _escH(c.name).replace(/'/g, "\\'") + '\')" class="text-xs text-gray-400 hover:text-red-500 bg-transparent border-none cursor-pointer" title="Löschen">🗑</button>';
        h += '</td></tr>';
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
    var html = '<div id="kommChannelModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick="if(event.target===this)this.remove()">';
    html += '<div class="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" onclick="event.stopPropagation()">';
    html += '<h3 class="text-base font-bold mb-4">' + (isNetzwerk ? '🌐 Neuer Netzwerk-Channel' : '🏪 Neuer Standort-Channel') + '</h3>';
    html += '<div class="space-y-3">';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Name *</label><input id="kommChName" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-vit-orange focus:border-transparent outline-none" placeholder="z.B. Marketing Netzwerk"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Icon (Emoji)</label><input id="kommChIcon" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" value="💬" maxlength="4"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Beschreibung</label><textarea id="kommChDesc" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none outline-none" placeholder="Wofür ist dieser Channel?"></textarea></div>';
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

    try {
        var data = {
            name: name,
            icon: icon,
            beschreibung: desc,
            ist_netzwerk: isNetzwerk,
            typ: 'channel',
            ist_privat: false,
            erstellt_von: _sbUser() ? _sbUser().id : null
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
window.kommEditChannelDialog = function(channelId) {
    var ch = _kommChannels.find(function(c) { return c.id === channelId; });
    if (!ch) return;

    var html = '<div id="kommChannelModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick="if(event.target===this)this.remove()">';
    html += '<div class="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" onclick="event.stopPropagation()">';
    html += '<h3 class="text-base font-bold mb-4">✏️ Channel bearbeiten</h3>';
    html += '<div class="space-y-3">';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Name *</label><input id="kommChName" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-vit-orange focus:border-transparent outline-none" value="' + _escH(ch.name) + '"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Icon (Emoji)</label><input id="kommChIcon" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none" value="' + _escH(ch.icon || '💬') + '" maxlength="4"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Beschreibung</label><textarea id="kommChDesc" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none outline-none">' + _escH(ch.beschreibung || '') + '</textarea></div>';
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

    try {
        var resp = await _sb().from('chat_kanaele').update({ name: name, icon: icon, beschreibung: desc }).eq('id', channelId);
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

// Window exports
window.renderKommSettings = renderKommSettings;

const _exports = { renderKommSettings };
Object.entries(_exports).forEach(function(e) { window[e[0]] = e[1]; });
