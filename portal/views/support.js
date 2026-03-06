/**
 * views/support.js - Partner-Portal Support Ticketsystem v2
 *
 * Vollstaendiges Ticketsystem mit KI-Triage, SLA-Ampeln, CSAT, Wissensartikeln
 *
 * @module views/support
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

var _supState = {
    tickets: [],
    kategorieRollen: [],
    erlaubteKategorien: [],
    filterKat: '',
    filterStatus: '',
    loaded: false,
    triageTimeout: null
};

var STATUS_LABELS = {offen:'Offen',in_bearbeitung:'In Bearbeitung',wartend_auf_partner:'Wartend',geloest:'Geloest',geschlossen:'Geschlossen'};
var STATUS_COLORS = {offen:'bg-yellow-100 text-yellow-700',in_bearbeitung:'bg-blue-100 text-blue-700',wartend_auf_partner:'bg-purple-100 text-purple-700',geloest:'bg-green-100 text-green-700',geschlossen:'bg-gray-100 text-gray-600'};
var PRIO_LABELS = {niedrig:'Niedrig',mittel:'Mittel',kritisch:'Kritisch'};
var PRIO_COLORS = {niedrig:'bg-gray-100 text-gray-600',mittel:'bg-yellow-100 text-yellow-700',kritisch:'bg-red-100 text-red-700'};
var KAT_ICONS = {IT:'🖥️',Abrechnung:'💰',Marketing:'📢',Allgemein:'📋',Sonstiges:'📎'};
var ALLE_KATEGORIEN = ['IT','Abrechnung','Marketing','Allgemein','Sonstiges'];

// ========== SLA Berechnung ==========
function slaInfo(ticket) {
    if (ticket.status === 'geloest' || ticket.status === 'geschlossen') return { pct: 0, color: '', icon: '' };
    var created = new Date(ticket.created_at).getTime();
    var now = Date.now();
    var elapsed = (now - created) / 3600000; // Stunden
    var sla = ticket.sla_stunden || 48;
    var pct = Math.round((elapsed / sla) * 100);
    var color = pct < 50 ? 'text-green-500' : pct < 80 ? 'text-yellow-500' : 'text-red-500';
    var icon = pct < 50 ? '🟢' : pct < 80 ? '🟡' : '🔴';
    return { pct: pct, color: color, icon: icon };
}

// ========== Kategorie-Rollen pruefen ==========
async function loadKategorieRollen() {
    try {
        var resp = await _sb().from('support_kategorie_rollen').select('*');
        _supState.kategorieRollen = resp.data || [];
    } catch(e) { _supState.kategorieRollen = []; }

    // Eigene Rollen ermitteln
    var profile = _sbProfile();
    if (profile && profile.is_hq) {
        _supState.erlaubteKategorien = ALLE_KATEGORIEN;
        return;
    }
    // Partner-Rollen aus user_rollen
    var userRollen = [];
    try {
        var uid = _sbUser() ? _sbUser().id : null;
        if (uid) {
            var rResp = await _sb().from('user_rollen').select('rollen(name)').eq('user_id', uid);
            userRollen = (rResp.data || []).map(function(r) { return r.rollen ? r.rollen.name : ''; }).filter(Boolean);
        }
    } catch(e) {}

    _supState.erlaubteKategorien = ALLE_KATEGORIEN.filter(function(kat) {
        // Wenn keine Rollen-Config fuer diese Kat, dann erlaubt
        var rules = _supState.kategorieRollen.filter(function(kr) { return kr.kategorie === kat; });
        if (rules.length === 0) return true;
        return userRollen.some(function(rolle) {
            var rule = rules.find(function(r) { return r.rolle === rolle; });
            return rule ? rule.darf_lesen : true;
        });
    });
}

function darfErstellen(kat) {
    var profile = _sbProfile();
    if (profile && profile.is_hq) return true;
    var rules = _supState.kategorieRollen.filter(function(kr) { return kr.kategorie === kat; });
    if (rules.length === 0) return true;
    // Vereinfacht: Wenn Kategorie in erlaubteKategorien, dann auch erstellen
    return _supState.erlaubteKategorien.indexOf(kat) !== -1;
}

// ========== Tickets laden ==========
async function loadTickets() {
    try {
        var s = _sb();
        var profile = _sbProfile();
        var query = s.from('support_tickets')
            .select('*, users:erstellt_von(name, vorname, nachname), assignee:assignee_id(name, vorname, nachname)')
            .order('created_at', {ascending: false});

        if (profile && !profile.is_hq && profile.standort_id) {
            query = query.eq('standort_id', profile.standort_id);
        }

        var resp = await query;
        if (resp.error) throw resp.error;
        // Filter nach erlaubten Kategorien
        _supState.tickets = (resp.data || []).filter(function(t) {
            return _supState.erlaubteKategorien.indexOf(t.kategorie) !== -1;
        });
        _supState.loaded = true;
    } catch(err) {
        console.error('[support] loadTickets:', err);
        _supState.tickets = [];
    }
}

// ========== RENDER: Haupt-Ansicht ==========
export async function renderTickets() {
    var container = document.getElementById('supportView');
    if (!container) return;

    // Lade Daten parallel
    if (!_supState.loaded) {
        container.innerHTML = '<div class="flex items-center justify-center py-12"><div class="animate-spin w-6 h-6 border-2 border-vit-orange border-t-transparent rounded-full mr-3"></div><span class="text-gray-500">Tickets werden geladen...</span></div>';
        await Promise.all([loadKategorieRollen(), loadTickets()]);
    }

    var tickets = getFilteredTickets();
    var allTickets = _supState.tickets;

    // Stats berechnen
    var offene = allTickets.filter(function(t) { return t.status === 'offen' || t.status === 'in_bearbeitung'; }).length;
    var wartende = allTickets.filter(function(t) { return t.status === 'wartend_auf_partner'; }).length;
    var geloeste = allTickets.filter(function(t) { return t.status === 'geloest' || t.status === 'geschlossen'; }).length;

    // Erstantwortzeit
    var antwortZeiten = allTickets.filter(function(t) { return t.erste_antwort_at; }).map(function(t) {
        return (new Date(t.erste_antwort_at).getTime() - new Date(t.created_at).getTime()) / 3600000;
    });
    var avgAntwort = antwortZeiten.length > 0 ? Math.round(antwortZeiten.reduce(function(a,b){return a+b;},0) / antwortZeiten.length) : '-';

    // SLA-Quote
    var slaRelevant = allTickets.filter(function(t) { return t.status === 'geloest' || t.status === 'geschlossen'; });
    var slaOk = slaRelevant.filter(function(t) {
        if (!t.erste_antwort_at) return false;
        var h = (new Date(t.erste_antwort_at).getTime() - new Date(t.created_at).getTime()) / 3600000;
        return h <= (t.sla_stunden || 48);
    }).length;
    var slaQuote = slaRelevant.length > 0 ? Math.round((slaOk / slaRelevant.length) * 100) : '-';

    var h = '';

    // Header
    h += '<div class="flex items-center justify-between mb-6">';
    h += '<h1 class="h1-headline text-gray-800">SUPPORT</h1>';
    h += '<button onclick="openNewTicketModal()" class="px-4 py-2.5 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-2">';
    h += '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>';
    h += '+ Neues Ticket</button>';
    h += '</div>';

    // Stats-Kacheln
    h += '<div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">';
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-yellow-600">' + offene + '</p><p class="text-xs text-gray-500">Offen</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-purple-600">' + wartende + '</p><p class="text-xs text-gray-500">Wartend</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-green-600">' + geloeste + '</p><p class="text-xs text-gray-500">Geloest</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-blue-600">' + avgAntwort + (avgAntwort !== '-' ? 'h' : '') + '</p><p class="text-xs text-gray-500">Ø Erstantwort</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold ' + (slaQuote !== '-' && slaQuote < 80 ? 'text-red-600' : 'text-green-600') + '">' + slaQuote + (slaQuote !== '-' ? '%' : '') + '</p><p class="text-xs text-gray-500">SLA-Quote</p></div>';
    h += '</div>';

    // Filter-Zeile
    h += '<div class="flex flex-wrap items-center gap-3 mb-4">';
    h += '<select id="supFilterKat" onchange="supFilterChanged()" class="text-sm border border-gray-300 rounded-lg px-3 py-2">';
    h += '<option value="">Alle Kategorien</option>';
    _supState.erlaubteKategorien.forEach(function(k) {
        h += '<option value="' + k + '"' + (_supState.filterKat === k ? ' selected' : '') + '>' + (KAT_ICONS[k]||'') + ' ' + k + '</option>';
    });
    h += '</select>';
    h += '<select id="supFilterStatus" onchange="supFilterChanged()" class="text-sm border border-gray-300 rounded-lg px-3 py-2">';
    h += '<option value="">Alle Status</option>';
    h += '<option value="offen"' + (_supState.filterStatus === 'offen' ? ' selected' : '') + '>Offen</option>';
    h += '<option value="in_bearbeitung"' + (_supState.filterStatus === 'in_bearbeitung' ? ' selected' : '') + '>In Bearbeitung</option>';
    h += '<option value="wartend_auf_partner"' + (_supState.filterStatus === 'wartend_auf_partner' ? ' selected' : '') + '>Wartend</option>';
    h += '<option value="geloest"' + (_supState.filterStatus === 'geloest' ? ' selected' : '') + '>Geloest</option>';
    h += '</select>';
    h += '<span class="text-xs text-gray-400">' + tickets.length + ' Ticket' + (tickets.length !== 1 ? 's' : '') + '</span>';
    h += '</div>';

    // Ticket-Liste
    if (tickets.length === 0) {
        h += '<div class="text-center py-12">';
        h += '<div class="text-5xl mb-3">🎫</div>';
        h += '<p class="text-gray-500 font-semibold">Keine Tickets gefunden</p>';
        h += '<p class="text-sm text-gray-400 mt-1">Erstelle ein neues Ticket ueber den Button oben.</p>';
        h += '</div>';
    } else {
        h += '<div class="space-y-2">';
        tickets.forEach(function(t) {
            var sla = slaInfo(t);
            var d = new Date(t.created_at);
            var userName = t.users ? ((t.users.vorname || '') + ' ' + (t.users.nachname || '')).trim() || t.users.name || '' : '';
            h += '<div class="vit-card p-4 hover:shadow-md transition cursor-pointer" onclick="openTicketDetail(\'' + t.id + '\')">';
            h += '<div class="flex items-center justify-between">';
            h += '<div class="flex-1 min-w-0">';
            h += '<div class="flex items-center gap-2 mb-1 flex-wrap">';
            h += '<span class="text-xs font-mono text-gray-400">' + _escH(t.ticket_nr || '') + '</span>';
            h += '<span class="text-xs font-semibold rounded px-2 py-0.5 ' + (STATUS_COLORS[t.status] || '') + '">' + (STATUS_LABELS[t.status] || t.status) + '</span>';
            h += '<span class="text-xs font-semibold rounded px-2 py-0.5 ' + (PRIO_COLORS[t.prioritaet] || '') + '">' + (PRIO_LABELS[t.prioritaet] || t.prioritaet) + '</span>';
            h += '<span class="text-xs rounded px-1.5 py-0.5 bg-gray-100 text-gray-600">' + (KAT_ICONS[t.kategorie] || '') + ' ' + _escH(t.kategorie || '') + '</span>';
            if (sla.icon) h += '<span class="text-xs" title="SLA: ' + sla.pct + '%">' + sla.icon + '</span>';
            h += '</div>';
            h += '<p class="font-semibold text-gray-800 text-sm truncate">' + _escH(t.betreff) + '</p>';
            h += '<p class="text-xs text-gray-400 mt-1">' + d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}) + (userName ? ' · ' + _escH(userName) : '') + '</p>';
            h += '</div>';
            h += '<span class="text-gray-300 text-lg ml-3 flex-shrink-0">›</span>';
            h += '</div></div>';
        });
        h += '</div>';
    }

    // Kontakte-Bereich
    h += '<div class="mt-8 border-t border-gray-200 pt-6">';
    h += '<h2 class="text-sm font-bold text-gray-600 uppercase mb-4">Kontakte Zentrale</h2>';
    h += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" id="kontakteGrid"></div>';
    h += '</div>';

    container.innerHTML = h;
    renderKontakte();
}

function getFilteredTickets() {
    return _supState.tickets.filter(function(t) {
        if (_supState.filterKat && t.kategorie !== _supState.filterKat) return false;
        if (_supState.filterStatus && t.status !== _supState.filterStatus) return false;
        return true;
    });
}

export function supFilterChanged() {
    var katEl = document.getElementById('supFilterKat');
    var statusEl = document.getElementById('supFilterStatus');
    _supState.filterKat = katEl ? katEl.value : '';
    _supState.filterStatus = statusEl ? statusEl.value : '';
    renderTickets();
}

// ========== Neues-Ticket-Modal ==========
export function openNewTicketModal() {
    if (document.getElementById('supNewTicketOverlay')) return;
    var el = document.createElement('div');
    el.id = 'supNewTicketOverlay';
    el.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8';
    el.onclick = function(e) { if (e.target === el) closeNewTicketModal(); };

    var erstellKats = _supState.erlaubteKategorien.filter(function(k) { return darfErstellen(k); });

    var html = '<div class="bg-white rounded-xl w-full max-w-lg mx-4 shadow-2xl" onclick="event.stopPropagation()">';
    html += '<div class="p-5 border-b border-gray-100 flex items-center justify-between">';
    html += '<h3 class="text-lg font-bold text-gray-800">Neues Support-Ticket</h3>';
    html += '<button onclick="closeNewTicketModal()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>';
    html += '</div>';
    html += '<div class="p-5">';

    // Betreff
    html += '<div class="mb-4">';
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">Betreff *</label>';
    html += '<input type="text" id="supNewBetreff" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-vit-orange focus:outline-none" placeholder="Kurz beschreiben, worum es geht..." oninput="supTriageDebounce()">';
    html += '<div id="supTriageResult" class="hidden mt-2"></div>';
    html += '<div id="supWissenResult" class="hidden mt-2"></div>';
    html += '</div>';

    // Kategorie
    html += '<div class="grid grid-cols-2 gap-3 mb-4">';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Kategorie *</label>';
    html += '<select id="supNewKat" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">';
    erstellKats.forEach(function(k) {
        html += '<option value="' + k + '">' + (KAT_ICONS[k]||'') + ' ' + k + '</option>';
    });
    html += '</select></div>';

    // Prioritaet
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Prioritaet</label>';
    html += '<select id="supNewPrio" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">';
    html += '<option value="niedrig">Niedrig</option>';
    html += '<option value="mittel" selected>Mittel</option>';
    html += '<option value="kritisch">Kritisch</option>';
    html += '</select></div></div>';

    // Beschreibung
    html += '<div class="mb-4">';
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">Beschreibung *</label>';
    html += '<textarea id="supNewBeschr" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y focus:border-vit-orange focus:outline-none" placeholder="Beschreibe dein Problem moeglichst genau..."></textarea>';
    html += '</div>';

    // Datei-Upload
    html += '<div class="mb-4">';
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">Anhang (optional)</label>';
    html += '<input type="file" id="supNewFile" class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100">';
    html += '</div>';

    // Buttons
    html += '<div class="flex justify-end gap-2">';
    html += '<button onclick="closeNewTicketModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Abbrechen</button>';
    html += '<button onclick="submitNewTicket()" id="supSubmitBtn" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">Ticket erstellen</button>';
    html += '</div>';

    html += '</div></div>';
    el.innerHTML = html;
    document.body.appendChild(el);
}

export function closeNewTicketModal() {
    var el = document.getElementById('supNewTicketOverlay');
    if (el) el.remove();
}

// KI-Triage (Debounced)
export function supTriageDebounce() {
    clearTimeout(_supState.triageTimeout);
    _supState.triageTimeout = setTimeout(supTriage, 500);
}

async function supTriage() {
    var betreff = (document.getElementById('supNewBetreff') || {}).value || '';
    if (betreff.length < 5) return;

    var resultEl = document.getElementById('supTriageResult');
    var wissenEl = document.getElementById('supWissenResult');

    // KI-Triage
    try {
        var sess = await _sb().auth.getSession();
        var token = sess.data && sess.data.session ? sess.data.session.access_token : '';
        var resp = await fetch(window.SUPABASE_URL + '/functions/v1/support-ki-triage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ betreff: betreff })
        });
        if (resp.ok) {
            var data = await resp.json();
            if (data.kategorie) {
                resultEl.classList.remove('hidden');
                resultEl.innerHTML = '<div class="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">'
                    + '<span class="text-xs">🤖</span>'
                    + '<span class="text-xs text-blue-700">KI-Vorschlag: <strong>' + _escH(data.kategorie) + '</strong> · <strong>' + _escH(data.prioritaet) + '</strong></span>'
                    + '<button onclick="supApplyTriage(\'' + _escH(data.kategorie) + '\',\'' + _escH(data.prioritaet) + '\')" class="text-xs text-blue-600 underline ml-auto">Uebernehmen</button>'
                    + '</div>';
            }
        }
    } catch(e) { /* KI optional */ }

    // Wissensartikel-Suche
    try {
        var woerter = betreff.split(/\s+/).filter(function(w) { return w.length > 2; }).slice(0, 3);
        if (woerter.length === 0) return;
        var query = _sb().from('support_wissensartikel').select('id, titel, inhalt').eq('status', 'publiziert').limit(3);
        // Einfache Textsuche via ilike
        woerter.forEach(function(w) {
            query = query.or('titel.ilike.%' + w + '%,inhalt.ilike.%' + w + '%');
        });
        var aResp = await query;
        if (aResp.data && aResp.data.length > 0) {
            wissenEl.classList.remove('hidden');
            var wh = '<div class="p-2 bg-green-50 rounded-lg border border-green-100">';
            wh += '<p class="text-xs font-semibold text-green-800 mb-1">💡 Koennte das helfen?</p>';
            aResp.data.forEach(function(a) {
                wh += '<div class="text-xs text-green-700 mb-1 cursor-pointer hover:underline" onclick="supShowArtikel(\'' + a.id + '\')">';
                wh += '📄 ' + _escH(a.titel) + '</div>';
            });
            wh += '</div>';
            wissenEl.innerHTML = wh;
        }
    } catch(e) { /* optional */ }
}

export function supApplyTriage(kat, prio) {
    var katEl = document.getElementById('supNewKat');
    var prioEl = document.getElementById('supNewPrio');
    if (katEl) katEl.value = kat;
    if (prioEl) prioEl.value = prio;
    _showToast('KI-Vorschlag uebernommen', 'success');
}

export async function supShowArtikel(artikelId) {
    try {
        var resp = await _sb().from('support_wissensartikel').select('*').eq('id', artikelId).single();
        if (resp.error || !resp.data) return;
        var a = resp.data;
        // Einfaches Alert-Modal
        var el = document.createElement('div');
        el.id = 'supArtikelOverlay';
        el.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] overflow-y-auto py-8';
        el.onclick = function(e) { if (e.target === el) el.remove(); };
        el.innerHTML = '<div class="bg-white rounded-xl w-full max-w-md mx-4 p-5 shadow-2xl" onclick="event.stopPropagation()">'
            + '<div class="flex items-center justify-between mb-3"><h3 class="font-bold text-gray-800">📄 ' + _escH(a.titel) + '</h3>'
            + '<button onclick="document.getElementById(\'supArtikelOverlay\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>'
            + '<div class="text-sm text-gray-700 whitespace-pre-wrap">' + _escH(a.inhalt) + '</div>'
            + '<div class="mt-4 flex justify-end"><button onclick="document.getElementById(\'supArtikelOverlay\').remove()" class="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Schliessen</button></div>'
            + '</div>';
        document.body.appendChild(el);
        // Inkrement views
        _sb().from('support_wissensartikel').update({ views: (a.views || 0) + 1 }).eq('id', artikelId).then(function(){});
    } catch(e) {}
}

// ========== Ticket erstellen ==========
export async function submitNewTicket() {
    var betreff = (document.getElementById('supNewBetreff') || {}).value || '';
    var beschreibung = (document.getElementById('supNewBeschr') || {}).value || '';
    var kategorie = (document.getElementById('supNewKat') || {}).value || 'Allgemein';
    var prioritaet = (document.getElementById('supNewPrio') || {}).value || 'mittel';

    if (!betreff.trim()) { _showToast('Bitte Betreff eingeben', 'error'); return; }
    if (!beschreibung.trim()) { _showToast('Bitte Beschreibung eingeben', 'error'); return; }

    var btn = document.getElementById('supSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Wird erstellt...'; }

    try {
        var profile = _sbProfile();
        var user = _sbUser();

        // Ticket erstellen
        var resp = await _sb().from('support_tickets').insert({
            standort_id: profile ? profile.standort_id : null,
            erstellt_von: user ? user.id : null,
            betreff: betreff.trim(),
            beschreibung: beschreibung.trim(),
            kategorie: kategorie,
            prioritaet: prioritaet,
            richtung: 'partner_zu_hq',
            status: 'offen'
        }).select().single();

        if (resp.error) throw resp.error;
        var ticket = resp.data;

        // Datei-Upload (optional)
        var fileInput = document.getElementById('supNewFile');
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            var file = fileInput.files[0];
            var path = 'tickets/' + ticket.id + '/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            var upResp = await _sb().storage.from('support-attachments').upload(path, file);
            if (!upResp.error) {
                await _sb().from('support_ticket_anhaenge').insert({
                    ticket_id: ticket.id,
                    dateiname: file.name,
                    storage_path: path,
                    dateityp: file.type,
                    dateigroesse: file.size
                });
            }
        }

        // Audit-Log
        await _sb().from('support_ticket_log').insert({
            ticket_id: ticket.id,
            user_id: user ? user.id : null,
            aktion: 'erstellt',
            neu_wert: 'offen'
        });

        // Notification (fire-and-forget)
        try {
            var sess = await _sb().auth.getSession();
            var token = sess.data && sess.data.session ? sess.data.session.access_token : '';
            fetch(window.SUPABASE_URL + '/functions/v1/support-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ event: 'neues_ticket', ticket_id: ticket.id })
            }).catch(function(){});
        } catch(e) {}

        window.logAudit && window.logAudit('ticket_erstellt', 'support', { ticket_nr: ticket.ticket_nr, kategorie: kategorie });

        closeNewTicketModal();
        _showToast('Ticket ' + (ticket.ticket_nr || '') + ' wurde erstellt. Wir melden uns innerhalb von 48h.', 'success');

        // Refresh
        _supState.loaded = false;
        await loadTickets();
        renderTickets();

    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Ticket erstellen'; }
    }
}

// ========== Ticket-Detail-Modal ==========
export async function openTicketDetail(ticketId) {
    try {
        var tResp = await _sb().from('support_tickets').select('*, users:erstellt_von(name, vorname, nachname), assignee:assignee_id(name, vorname, nachname)').eq('id', ticketId).single();
        if (tResp.error) throw tResp.error;
        var t = tResp.data;

        var kResp = await _sb().from('support_ticket_kommentare').select('*, users:autor_id(name, vorname, nachname, is_hq)').eq('ticket_id', ticketId).order('created_at', {ascending: true});
        var kommentare = kResp.data || [];

        var aResp = await _sb().from('support_ticket_anhaenge').select('*').eq('ticket_id', ticketId);
        var anhaenge = aResp.data || [];

        var sla = slaInfo(t);
        var d = new Date(t.created_at);
        var erstellerName = t.users ? ((t.users.vorname || '') + ' ' + (t.users.nachname || '')).trim() || t.users.name || '' : 'Unbekannt';

        var el = document.createElement('div');
        el.id = 'supDetailOverlay';
        el.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-4';
        el.onclick = function(e) { if (e.target === el) closeTicketDetail(); };

        var html = '<div class="bg-white rounded-xl w-full max-w-2xl mx-4 shadow-2xl flex flex-col max-h-[90vh]" onclick="event.stopPropagation()">';

        // Header
        html += '<div class="p-5 border-b border-gray-100 flex-shrink-0">';
        html += '<div class="flex items-center justify-between mb-2">';
        html += '<div class="flex items-center gap-2 flex-wrap">';
        html += '<span class="text-xs font-mono text-gray-400">' + _escH(t.ticket_nr || '') + '</span>';
        html += '<span class="text-xs font-semibold rounded px-2 py-0.5 ' + (STATUS_COLORS[t.status] || '') + '">' + (STATUS_LABELS[t.status] || t.status) + '</span>';
        html += '<span class="text-xs font-semibold rounded px-2 py-0.5 ' + (PRIO_COLORS[t.prioritaet] || '') + '">' + (PRIO_LABELS[t.prioritaet] || t.prioritaet) + '</span>';
        html += '<span class="text-xs rounded px-1.5 py-0.5 bg-gray-100 text-gray-600">' + (KAT_ICONS[t.kategorie] || '') + ' ' + _escH(t.kategorie || '') + '</span>';
        if (sla.icon) html += '<span class="text-xs" title="SLA: ' + sla.pct + '%">' + sla.icon + ' ' + sla.pct + '%</span>';
        html += '</div>';
        html += '<button onclick="closeTicketDetail()" class="text-gray-400 hover:text-gray-600 text-xl ml-2">✕</button>';
        html += '</div>';
        html += '<h3 class="font-bold text-gray-800 text-lg">' + _escH(t.betreff) + '</h3>';
        html += '<p class="text-xs text-gray-400 mt-1">Von ' + _escH(erstellerName) + ' · ' + d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}) + '</p>';
        html += '</div>';

        // Body (scrollbar)
        html += '<div class="flex-1 overflow-y-auto p-5">';

        // Beschreibung
        html += '<div class="bg-gray-50 rounded-lg p-4 mb-4">';
        html += '<p class="text-sm text-gray-700 whitespace-pre-wrap">' + _escH(t.beschreibung || '') + '</p>';
        html += '</div>';

        // Anhaenge
        if (anhaenge.length > 0) {
            html += '<div class="mb-4">';
            html += '<p class="text-xs font-semibold text-gray-500 mb-1">Anhaenge</p>';
            anhaenge.forEach(function(a) {
                html += '<a href="#" onclick="supDownloadAnhang(\'' + _escH(a.storage_path) + '\', \'' + _escH(a.dateiname) + '\'); return false;" class="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mr-3">📎 ' + _escH(a.dateiname) + '</a>';
            });
            html += '</div>';
        }

        // CSAT-Widget (wenn geloest und noch nicht bewertet)
        if (t.status === 'geloest' && !t.csat_bewertung) {
            html += '<div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">';
            html += '<p class="text-sm font-semibold text-green-800 mb-2">Wie zufrieden bist du mit der Loesung?</p>';
            html += '<div class="flex items-center gap-1 mb-2" id="supCsatStars">';
            for (var s = 1; s <= 5; s++) {
                html += '<button onclick="supSetCsat(' + s + ', \'' + ticketId + '\')" class="text-2xl text-gray-300 hover:text-yellow-400 transition sup-csat-star" data-star="' + s + '">★</button>';
            }
            html += '</div>';
            html += '<textarea id="supCsatKommentar" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs resize-none" placeholder="Optionaler Kommentar..."></textarea>';
            html += '<button onclick="supSubmitCsat(\'' + ticketId + '\')" id="supCsatBtn" class="mt-2 px-4 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600">Bewertung senden</button>';
            html += '</div>';
        }

        // Kommentar-Thread
        html += '<h4 class="text-xs font-bold text-gray-500 uppercase mb-3">Verlauf (' + kommentare.length + ')</h4>';
        if (kommentare.length === 0) {
            html += '<p class="text-sm text-gray-400 mb-4">Noch keine Kommentare.</p>';
        }
        kommentare.forEach(function(k) {
            var kd = new Date(k.created_at);
            var isHq = k.users && k.users.is_hq;
            var kName = k.users ? ((k.users.vorname || '') + ' ' + (k.users.nachname || '')).trim() || k.users.name || 'Unbekannt' : 'Unbekannt';
            var initials = kName.split(' ').map(function(w) { return w[0] || ''; }).join('').toUpperCase().substring(0, 2);
            html += '<div class="mb-3 flex gap-3">';
            html += '<div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ' + (isHq ? 'bg-blue-500' : 'bg-orange-500') + '">' + initials + '</div>';
            html += '<div class="flex-1 p-3 rounded-lg ' + (isHq ? 'bg-blue-50 border border-blue-100' : 'bg-white border border-gray-100') + '">';
            html += '<div class="flex items-center justify-between mb-1">';
            html += '<span class="text-xs font-bold text-gray-700">' + _escH(kName) + (isHq ? ' <span class="text-blue-500">HQ</span>' : '') + '</span>';
            html += '<span class="text-[10px] text-gray-400">' + kd.toLocaleDateString('de-DE') + ' ' + kd.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}) + '</span>';
            html += '</div>';
            html += '<p class="text-sm text-gray-700 whitespace-pre-wrap">' + _escH(k.inhalt) + '</p>';
            html += '</div></div>';
        });

        // Antwort-Box
        html += '<div class="mt-4 border-t border-gray-100 pt-4">';
        html += '<textarea id="supKommentarInput" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:border-vit-orange focus:outline-none" placeholder="Antwort schreiben..."></textarea>';
        html += '<div class="flex items-center justify-between mt-2">';
        html += '<input type="file" id="supKommentarFile" class="text-xs text-gray-500">';
        html += '<button onclick="supSendKommentar(\'' + ticketId + '\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">Senden</button>';
        html += '</div></div>';

        html += '</div>'; // end body
        html += '</div>'; // end modal

        el.innerHTML = html;
        document.body.appendChild(el);

    } catch(err) {
        console.error('[support] openTicketDetail:', err);
        _showToast('Fehler beim Laden des Tickets', 'error');
    }
}

export function closeTicketDetail() {
    var el = document.getElementById('supDetailOverlay');
    if (el) el.remove();
}

// ========== Kommentar senden ==========
export async function supSendKommentar(ticketId) {
    var input = document.getElementById('supKommentarInput');
    if (!input || !input.value.trim()) { _showToast('Bitte Text eingeben', 'error'); return; }

    try {
        var user = _sbUser();
        var komResp = await _sb().from('support_ticket_kommentare').insert({
            ticket_id: ticketId,
            autor_id: user ? user.id : null,
            inhalt: input.value.trim(),
            is_internal: false
        }).select().single();
        if (komResp.error) throw komResp.error;

        // Datei-Upload
        var fileInput = document.getElementById('supKommentarFile');
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            var file = fileInput.files[0];
            var path = 'tickets/' + ticketId + '/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            var upResp = await _sb().storage.from('support-attachments').upload(path, file);
            if (!upResp.error) {
                await _sb().from('support_ticket_anhaenge').insert({
                    ticket_id: ticketId,
                    kommentar_id: komResp.data.id,
                    dateiname: file.name,
                    storage_path: path,
                    dateityp: file.type,
                    dateigroesse: file.size
                });
            }
        }

        // Wenn geschlossenes Ticket: Status zurueck auf offen
        var ticket = _supState.tickets.find(function(t) { return t.id === ticketId; });
        if (ticket && (ticket.status === 'geschlossen' || ticket.status === 'geloest')) {
            await _sb().from('support_tickets').update({
                status: 'offen',
                wiedereroeffnet_at: new Date().toISOString()
            }).eq('id', ticketId);
            await _sb().from('support_ticket_log').insert({
                ticket_id: ticketId,
                user_id: user ? user.id : null,
                aktion: 'status_geaendert',
                alt_wert: ticket.status,
                neu_wert: 'offen'
            });
        }

        // Notification
        try {
            var sess = await _sb().auth.getSession();
            var token = sess.data && sess.data.session ? sess.data.session.access_token : '';
            fetch(window.SUPABASE_URL + '/functions/v1/support-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ event: 'neue_antwort_von_partner', ticket_id: ticketId, kommentar_id: komResp.data.id })
            }).catch(function(){});
        } catch(e) {}

        // Reload Detail
        closeTicketDetail();
        await openTicketDetail(ticketId);
        _supState.loaded = false;

    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

// ========== Anhang herunterladen ==========
export async function supDownloadAnhang(storagePath, dateiname) {
    try {
        var resp = await _sb().storage.from('support-attachments').createSignedUrl(storagePath, 3600);
        if (resp.data && resp.data.signedUrl) {
            var a = document.createElement('a');
            a.href = resp.data.signedUrl;
            a.download = dateiname;
            a.target = '_blank';
            a.click();
        } else {
            _showToast('Download nicht verfuegbar', 'error');
        }
    } catch(e) {
        _showToast('Fehler beim Download', 'error');
    }
}

// ========== CSAT ==========
var _csatWert = 0;
export function supSetCsat(wert, ticketId) {
    _csatWert = wert;
    document.querySelectorAll('.sup-csat-star').forEach(function(star) {
        var sv = parseInt(star.dataset.star);
        star.className = 'text-2xl transition sup-csat-star ' + (sv <= wert ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-400');
    });
}

export async function supSubmitCsat(ticketId) {
    if (_csatWert === 0) { _showToast('Bitte eine Bewertung waehlen', 'error'); return; }
    try {
        var kommentar = (document.getElementById('supCsatKommentar') || {}).value || null;
        await _sb().from('support_tickets').update({
            csat_bewertung: _csatWert,
            csat_kommentar: kommentar
        }).eq('id', ticketId);
        _showToast('Danke fuer dein Feedback!', 'success');
        closeTicketDetail();
        _supState.loaded = false;
        await loadTickets();
        renderTickets();
    } catch(e) {
        _showToast('Fehler: ' + (e.message || e), 'error');
    }
}

// ========== Kontakte (aus alter Version behalten) ==========
var zentraleKontakte = [
    {name:'Sascha Matthies',rolle:'Geschaeftsfuehrung',bereich:'GF',tel:'+49 170 1234567',email:'sascha@vitbikes.de',verfuegbar:true,zeiten:'Mo-Fr 9-18 Uhr',schwerpunkt:'Strategie, Partnerschaften, Finanzen'},
    {name:'Florian Meier',rolle:'Einkauf & Sortiment',bereich:'Einkauf',tel:'+49 170 2345678',email:'florian@vitbikes.de',verfuegbar:true,zeiten:'Mo-Fr 8-17 Uhr',schwerpunkt:'Vororder, Konditionen, Lieferanten, Sortiment'},
    {name:'Michael Stenzel',rolle:'Marketing & Performance',bereich:'Marketing',tel:'+49 170 3456789',email:'michael@vitbikes.de',verfuegbar:true,zeiten:'Mo-Fr 9-18 Uhr',schwerpunkt:'Ads, Content, Events, Jahresgespraeche'},
    {name:'Tim Schaefer',rolle:'IT & Systeme',bereich:'IT',tel:'+49 170 4567890',email:'tim@vitbikes.de',verfuegbar:false,zeiten:'Mo-Fr 8-16 Uhr',schwerpunkt:'Kassensystem, B2B-Portale, Etermin, Netzwerk'},
    {name:'Laura Hofmann',rolle:'Buchhaltung & Controlling',bereich:'Buchhaltung',tel:'+49 170 5678901',email:'laura@vitbikes.de',verfuegbar:true,zeiten:'Mo-Do 8-16, Fr 8-14 Uhr',schwerpunkt:'BWA, Monatsabschluss, Rechnungen, DATEV'},
    {name:'Jonas Becker',rolle:'Werkstatt-Support & Schulung',bereich:'Werkstatt',tel:'+49 170 6789012',email:'jonas@vitbikes.de',verfuegbar:true,zeiten:'Mo-Fr 7-16 Uhr',schwerpunkt:'Shimano, Bosch, Diagnose, Technik-Schulungen'}
];

export function renderKontakte() {
    var grid = document.getElementById('kontakteGrid');
    if (!grid || grid.dataset.rendered) return;
    grid.dataset.rendered = 'true';
    var bereichColors = {'GF':'bg-purple-500','Einkauf':'bg-blue-500','Marketing':'bg-orange-500','IT':'bg-gray-600','Buchhaltung':'bg-green-600','Werkstatt':'bg-red-500'};
    var h = '';
    zentraleKontakte.forEach(function(k) {
        var col = bereichColors[k.bereich] || 'bg-gray-500';
        var initials = k.name.split(' ').map(function(w) { return w[0]; }).join('');
        h += '<div class="vit-card p-4">';
        h += '<div class="flex items-center space-x-3 mb-3">';
        h += '<div class="w-10 h-10 ' + col + ' rounded-full flex items-center justify-center text-white font-bold text-sm">' + initials + '</div>';
        h += '<div><p class="font-semibold text-gray-800 text-sm">' + k.name + '</p>';
        h += '<p class="text-xs text-gray-500">' + k.rolle + '</p></div></div>';
        h += '<div class="space-y-1 text-xs text-gray-600">';
        h += '<p>📞 <a href="tel:' + k.tel + '" class="hover:text-vit-orange">' + k.tel + '</a></p>';
        h += '<p>✉️ <a href="mailto:' + k.email + '" class="hover:text-vit-orange">' + k.email + '</a></p>';
        h += '<p>🕐 ' + k.zeiten + '</p>';
        h += '</div></div>';
    });
    grid.innerHTML = h;
}

// ========== Legacy Compat ==========
export function showSupportTab(tab) { renderTickets(); }
export function filterTickets(f) { renderTickets(); }
export function submitTicketForm() { openNewTicketModal(); }
export function sendTicket() { openNewTicketModal(); }
export function changeTicketStatus() {}
export function addTicketComment() {}

// ========== Strangler Fig: window.* registration ==========
const _exports = {
    renderTickets, openTicketDetail, closeTicketDetail, openNewTicketModal, closeNewTicketModal,
    submitNewTicket, supFilterChanged, supTriageDebounce, supApplyTriage, supShowArtikel,
    supSendKommentar, supDownloadAnhang, supSetCsat, supSubmitCsat,
    renderKontakte, showSupportTab, filterTickets, submitTicketForm, sendTicket,
    changeTicketStatus, addTicketComment
};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
