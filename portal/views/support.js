/**
 * views/support.js - Partner-Portal Support Ticketsystem v3
 *
 * Partner: 3 Tabs (Meine Tickets, Zoho-History, Kontakte)
 * HQ:      4 Tabs (Offen, Alle Tickets, Zoho-Archiv, Statistiken)
 * Ticket-Detail, KI-Triage, CSAT, Zoho-Detail, HQ Ticket-Management
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
    triageTimeout: null,
    activeTab: '',
    // Zoho-History (Partner)
    zohoHistory: [],
    zohoSearch: '',
    zohoLoaded: false,
    // HQ state
    hqTickets: [],
    hqSearch: '',
    hqFilterStatus: '',
    hqLoaded: false,
    hqUsers: [],
    // Zoho-Archiv (HQ)
    zohoArchiv: [],
    zohoArchivLoaded: false,
    // Statistiken
    statsData: null,
    // Realtime
    realtimeSub: null,
    activeTicketId: null,
    // HQ Rollen des eingeloggten Users
    hqUserRollen: []
};

var STATUS_LABELS = {offen:'Offen',in_bearbeitung:'In Bearbeitung',wartend_auf_partner:'Wartend',geloest:'Geloest',geschlossen:'Geschlossen'};
var STATUS_COLORS = {offen:'bg-yellow-100 text-yellow-700',in_bearbeitung:'bg-blue-100 text-blue-700',wartend_auf_partner:'bg-purple-100 text-purple-700',geloest:'bg-green-100 text-green-700',geschlossen:'bg-gray-100 text-gray-600'};
var PRIO_LABELS = {niedrig:'Niedrig',mittel:'Mittel',kritisch:'Kritisch'};
var PRIO_COLORS = {niedrig:'bg-gray-100 text-gray-600',mittel:'bg-yellow-100 text-yellow-700',kritisch:'bg-red-100 text-red-700'};
var KAT_ICONS = {IT:'', Abrechnung:'', Marketing:'', Allgemein:'', Sonstiges:''};
var ALLE_KATEGORIEN = ['it','sales','marketing','einkauf','support','akademie','hr','gf','allgemein'];
var KATEGORIE_LABELS = {
    'it': 'IT & Systeme', 'sales': 'Vertrieb', 'marketing': 'Marketing',
    'einkauf': 'Einkauf', 'support': 'Support', 'akademie': 'Akademie',
    'hr': 'Personal (HR)', 'gf': 'Geschäftsführung', 'allgemein': 'Allgemein'
};

// ========== SLA Berechnung ==========
function slaInfo(ticket) {
    if (ticket.status === 'geloest' || ticket.status === 'geschlossen') return { pct: 0, color: '', icon: '' };
    var created = new Date(ticket.created_at).getTime();
    var now = Date.now();
    var elapsed = (now - created) / 3600000;
    var sla = ticket.sla_stunden || 48;
    var pct = Math.round((elapsed / sla) * 100);
    var color = pct < 50 ? 'text-green-500' : pct < 80 ? 'text-yellow-500' : 'text-red-500';
    var icon = pct < 50 ? 'green' : pct < 80 ? 'yellow' : 'red';
    return { pct: pct, color: color, icon: icon };
}

function slaIcon(info) {
    if (!info.icon) return '';
    if (info.icon === 'green') return '<span class="inline-block w-2 h-2 rounded-full bg-green-500" title="SLA: ' + info.pct + '%"></span>';
    if (info.icon === 'yellow') return '<span class="inline-block w-2 h-2 rounded-full bg-yellow-500" title="SLA: ' + info.pct + '%"></span>';
    return '<span class="inline-block w-2 h-2 rounded-full bg-red-500" title="SLA: ' + info.pct + '%"></span>';
}

// ========== Kategorie-Rollen pruefen ==========
async function loadKategorieRollen() {
    try {
        var resp = await _sb().from('support_kategorie_rollen').select('*');
        _supState.kategorieRollen = resp.data || [];
    } catch(e) { _supState.kategorieRollen = []; }

    var profile = _sbProfile();
    if (profile && profile.is_hq) {
        _supState.erlaubteKategorien = ALLE_KATEGORIEN;
        return;
    }
    var userRollen = [];
    try {
        var uid = _sbUser() ? _sbUser().id : null;
        if (uid) {
            var rResp = await _sb().from('user_rollen').select('rollen(name)').eq('user_id', uid);
            userRollen = (rResp.data || []).map(function(r) { return r.rollen ? r.rollen.name : ''; }).filter(Boolean);
        }
    } catch(e) {}

    _supState.erlaubteKategorien = ALLE_KATEGORIEN.filter(function(kat) {
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
    return _supState.erlaubteKategorien.indexOf(kat) !== -1;
}

// ========== Tickets laden (Partner) ==========
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
        _supState.tickets = (resp.data || []).filter(function(t) {
            return _supState.erlaubteKategorien.indexOf(t.kategorie) !== -1;
        });
        _supState.loaded = true;
    } catch(err) {
        console.error('[support] loadTickets:', err);
        _supState.tickets = [];
    }
}

// ========== Zoho-History laden (Partner) ==========
async function loadZohoHistory() {
    if (_supState.zohoLoaded) return;
    try {
        var uid = _sbUser() ? _sbUser().id : null;
        if (!uid) { _supState.zohoHistory = []; _supState.zohoLoaded = true; return; }
        var resp = await _sb().from('support_tickets_import')
            .select('*')
            .eq('portal_user_id', uid)
            .order('zoho_erstellt_am', {ascending: false})
            .limit(200);
        _supState.zohoHistory = resp.data || [];
        _supState.zohoLoaded = true;
    } catch(e) {
        console.error('[support] loadZohoHistory:', e);
        _supState.zohoHistory = [];
        _supState.zohoLoaded = true;
    }
}

// ========== HQ Tickets laden ==========
async function loadHqTickets() {
    if (_supState.hqLoaded) return;
    try {
        var profile = window.sbProfile || {};
        var userRollenResp = await _sb().from('user_rollen').select('rolle_id, rollen:rolle_id(name)').eq('user_id', profile.id || '');
        var hqRollen = (userRollenResp.data || []).map(function(r) { return r.rollen ? r.rollen.name : ''; }).filter(Boolean);
        _supState.hqUserRollen = hqRollen;

        // GF / Owner / legacy hq sehen alles
        var isAdmin = hqRollen.indexOf('hq_gf') !== -1 || hqRollen.indexOf('hq') !== -1 || hqRollen.indexOf('owner') !== -1;

        var query = _sb().from('support_tickets')
            .select('*, users:erstellt_von(name, vorname, nachname), assignee:assignee_id(name, vorname, nachname), standorte:standort_id(name)')
            .eq('zoho_fallback', false)
            .order('created_at', {ascending: false})
            .limit(500);

        // Abteilungs-Filter: nur eigene Abteilung(en) wenn nicht Admin
        if (!isAdmin && hqRollen.length > 0) {
            var abteilungen = hqRollen.map(function(r) { return r.replace('hq_', ''); });
            query = query.in('abteilung', abteilungen);
        }

        var [tResp, uResp] = await Promise.all([
            query,
            _sb().from('users').select('id, email, name, vorname, nachname').eq('is_hq', true).eq('status', 'aktiv')
        ]);
        _supState.hqTickets = tResp.data || [];
        _supState.hqUsers = uResp.data || [];
        _supState.hqLoaded = true;
    } catch(e) {
        console.error('[support] loadHqTickets:', e);
        _supState.hqTickets = [];
        _supState.hqLoaded = true;
    }
}

// ========== Zoho-Archiv laden (HQ) ==========
async function loadZohoArchiv() {
    if (_supState.zohoArchivLoaded) return;
    try {
        var resp = await _sb().from('support_tickets_import')
            .select('*')
            .order('zoho_erstellt_am', {ascending: false})
            .limit(300);
        _supState.zohoArchiv = resp.data || [];
        _supState.zohoArchivLoaded = true;
    } catch(e) {
        console.error('[support] loadZohoArchiv:', e);
        _supState.zohoArchiv = [];
        _supState.zohoArchivLoaded = true;
    }
}

// ========== RENDER: Haupt-Ansicht ==========
export async function renderTickets() {
    var container = document.getElementById('supportView');
    if (!container) return;

    var profile = _sbProfile();
    var isHq = profile && profile.is_hq;

    // Default tab
    if (!_supState.activeTab) {
        _supState.activeTab = isHq ? 'hq_offen' : 'tickets';
    }

    // Initial load
    if (!_supState.loaded) {
        container.innerHTML = '<div class="flex items-center justify-center py-12"><div class="animate-spin w-6 h-6 border-2 border-vit-orange border-t-transparent rounded-full mr-3"></div><span class="text-gray-500">Tickets werden geladen...</span></div>';
        var loads = [loadKategorieRollen(), loadTickets()];
        if (isHq) loads.push(loadHqTickets());
        await Promise.all(loads);
    }

    var h = '';

    // Header
    h += '<div class="flex items-center justify-between mb-4">';
    h += '<h1 class="h1-headline text-gray-800">SUPPORT</h1>';
    if (!isHq) {
        h += '<button onclick="openNewTicketModal()" class="px-4 py-2.5 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-2">';
        h += '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>';
        h += '+ Neues Ticket</button>';
    }
    h += '</div>';

    // Tab-Leiste
    h += '<div class="flex border-b border-gray-200 mb-6 gap-1">';
    if (isHq) {
        var offeneCount = _supState.hqTickets.filter(function(t) { return t.status === 'offen' || t.status === 'in_bearbeitung'; }).length;
        h += _tabBtn('hq_offen', 'Offen' + (offeneCount > 0 ? ' (' + offeneCount + ')' : ''));
        h += _tabBtn('hq_alle', 'Alle Tickets');
        h += _tabBtn('hq_zoho', 'Zoho-Archiv');
        h += _tabBtn('hq_stats', 'Statistiken');
    } else {
        h += _tabBtn('tickets', 'Meine Tickets');
        h += _tabBtn('zoho_history', 'Zoho-History');
        h += _tabBtn('kontakte', 'Kontakte');
    }
    h += '</div>';

    // Tab-Inhalt
    var tab = _supState.activeTab;
    if (isHq) {
        if (tab === 'hq_offen') h += await renderHqOffenTab();
        else if (tab === 'hq_alle') h += await renderHqAlleTab();
        else if (tab === 'hq_zoho') h += await renderHqZohoArchivTab();
        else if (tab === 'hq_stats') h += await renderHqStatsTab();
    } else {
        if (tab === 'tickets') h += renderPartnerTicketsTab();
        else if (tab === 'zoho_history') h += await renderZohoHistoryTab();
        else if (tab === 'kontakte') h += await renderKontakteTab();
    }

    container.innerHTML = h;
}

function _tabBtn(tabKey, label) {
    var active = _supState.activeTab === tabKey;
    return '<button onclick="supSwitchTab(\'' + tabKey + '\')" class="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition '
        + (active ? 'border-vit-orange text-vit-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
        + '">' + label + '</button>';
}

export function supSwitchTab(tab) {
    _supState.activeTab = tab;
    renderTickets();
}

// ======================================================================
// PARTNER TABS
// ======================================================================

// -- Tab: Meine Tickets --
function renderPartnerTicketsTab() {
    var tickets = getFilteredTickets();
    var allTickets = _supState.tickets;
    var h = '';

    // Stats
    var offene = allTickets.filter(function(t) { return t.status === 'offen' || t.status === 'in_bearbeitung'; }).length;
    var wartende = allTickets.filter(function(t) { return t.status === 'wartend_auf_partner'; }).length;
    var geloeste = allTickets.filter(function(t) { return t.status === 'geloest' || t.status === 'geschlossen'; }).length;

    h += '<div class="grid grid-cols-3 gap-3 mb-6">';
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-yellow-600">' + offene + '</p><p class="text-xs text-gray-500">Offen</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-purple-600">' + wartende + '</p><p class="text-xs text-gray-500">Wartend</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-green-600">' + geloeste + '</p><p class="text-xs text-gray-500">Geloest</p></div>';
    h += '</div>';

    // Filter
    h += '<div class="flex flex-wrap items-center gap-3 mb-4">';
    h += '<select id="supFilterKat" onchange="supFilterChanged()" class="text-sm border border-gray-300 rounded-lg px-3 py-2">';
    h += '<option value="">Alle Kategorien</option>';
    _supState.erlaubteKategorien.forEach(function(k) {
        h += '<option value="' + k + '"' + (_supState.filterKat === k ? ' selected' : '') + '>' + (KATEGORIE_LABELS[k] || k) + '</option>';
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
            h += '<span class="text-xs rounded px-1.5 py-0.5 bg-gray-100 text-gray-600">' + _escH(KATEGORIE_LABELS[t.kategorie] || t.kategorie || '') + '</span>';
            h += slaIcon(sla);
            h += '</div>';
            h += '<p class="font-semibold text-gray-800 text-sm truncate">' + _escH(t.betreff) + '</p>';
            h += '<p class="text-xs text-gray-400 mt-1">' + d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}) + (userName ? ' - ' + _escH(userName) : '') + '</p>';
            h += '</div>';
            h += '<span class="text-gray-300 text-lg ml-3 flex-shrink-0">&rsaquo;</span>';
            h += '</div></div>';
        });
        h += '</div>';
    }
    return h;
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

// -- Tab: Zoho-History (Partner) --
async function renderZohoHistoryTab() {
    if (!_supState.zohoLoaded) {
        await loadZohoHistory();
    }

    var items = _supState.zohoHistory;
    var search = _supState.zohoSearch.toLowerCase();
    if (search) {
        items = items.filter(function(z) {
            return (z.betreff || '').toLowerCase().indexOf(search) !== -1
                || (z.zoho_nr || '').toLowerCase().indexOf(search) !== -1
                || (z.beschreibung || '').toLowerCase().indexOf(search) !== -1;
        });
    }

    var h = '';
    h += '<div class="flex items-center gap-3 mb-4">';
    h += '<input type="text" id="supZohoSearch" oninput="supHistorySearch()" class="text-sm border border-gray-300 rounded-lg px-3 py-2 w-64" placeholder="Zoho-Tickets durchsuchen..." value="' + _escH(_supState.zohoSearch) + '">';
    h += '<span class="text-xs text-gray-400">' + items.length + ' Ticket' + (items.length !== 1 ? 's' : '') + '</span>';
    h += '</div>';

    if (items.length === 0) {
        h += '<div class="text-center py-12">';
        h += '<p class="text-gray-500 font-semibold">Keine Zoho-Tickets gefunden</p>';
        h += '<p class="text-sm text-gray-400 mt-1">Historische Tickets aus dem alten Zoho-System werden hier angezeigt.</p>';
        h += '</div>';
    } else {
        h += '<div class="space-y-2">';
        items.forEach(function(z) {
            var d = z.zoho_erstellt_am ? new Date(z.zoho_erstellt_am) : null;
            var statusClass = z.ist_offen ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600';
            var statusLabel = z.ist_offen ? 'Offen' : (z.status || 'Geschlossen');
            h += '<div class="vit-card p-4 hover:shadow-md transition cursor-pointer" onclick="supOpenZohoDetail(\'' + z.id + '\')">';
            h += '<div class="flex items-center justify-between">';
            h += '<div class="flex-1 min-w-0">';
            h += '<div class="flex items-center gap-2 mb-1 flex-wrap">';
            if (z.zoho_nr) h += '<span class="text-xs font-mono text-gray-400">' + _escH(z.zoho_nr) + '</span>';
            h += '<span class="text-xs font-semibold rounded px-2 py-0.5 ' + statusClass + '">' + _escH(statusLabel) + '</span>';
            if (z.prioritaet) h += '<span class="text-xs rounded px-1.5 py-0.5 bg-gray-100 text-gray-600">' + _escH(z.prioritaet) + '</span>';
            h += '</div>';
            h += '<p class="font-semibold text-gray-800 text-sm truncate">' + _escH(z.betreff) + '</p>';
            if (d) h += '<p class="text-xs text-gray-400 mt-1">' + d.toLocaleDateString('de-DE') + '</p>';
            h += '</div>';
            h += '<span class="text-gray-300 text-lg ml-3 flex-shrink-0">&rsaquo;</span>';
            h += '</div></div>';
        });
        h += '</div>';
    }
    return h;
}

export function supHistorySearch() {
    var el = document.getElementById('supZohoSearch');
    _supState.zohoSearch = el ? el.value : '';
    renderTickets();
}

export function supOpenZohoDetail(zohoId) {
    var item = _supState.zohoHistory.concat(_supState.zohoArchiv).find(function(z) { return z.id === zohoId; });
    if (!item) return;

    var el = document.createElement('div');
    el.id = 'supZohoDetailOverlay';
    el.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8';
    el.onclick = function(e) { if (e.target === el) el.remove(); };

    var d = item.zoho_erstellt_am ? new Date(item.zoho_erstellt_am) : null;
    var dc = item.zoho_geschlossen_am ? new Date(item.zoho_geschlossen_am) : null;

    var html = '<div class="bg-white rounded-xl w-full max-w-2xl mx-4 shadow-2xl" onclick="event.stopPropagation()">';
    html += '<div class="p-5 border-b border-gray-100 flex items-center justify-between">';
    html += '<div>';
    html += '<div class="flex items-center gap-2 mb-1">';
    if (item.zoho_nr) html += '<span class="text-xs font-mono text-gray-400">' + _escH(item.zoho_nr) + '</span>';
    html += '<span class="text-xs font-semibold rounded px-2 py-0.5 ' + (item.ist_offen ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600') + '">' + _escH(item.ist_offen ? 'Offen' : (item.status || 'Geschlossen')) + '</span>';
    if (item.prioritaet) html += '<span class="text-xs rounded px-1.5 py-0.5 bg-gray-100 text-gray-600">' + _escH(item.prioritaet) + '</span>';
    if (item.kanal) html += '<span class="text-xs rounded px-1.5 py-0.5 bg-blue-50 text-blue-600">' + _escH(item.kanal) + '</span>';
    html += '</div>';
    html += '<h3 class="font-bold text-gray-800 text-lg">' + _escH(item.betreff) + '</h3>';
    html += '<p class="text-xs text-gray-400 mt-1">';
    if (d) html += 'Erstellt: ' + d.toLocaleDateString('de-DE');
    if (dc) html += ' - Geschlossen: ' + dc.toLocaleDateString('de-DE');
    if (item.kontakt_email) html += ' - ' + _escH(item.kontakt_email);
    html += '</p>';
    html += '</div>';
    html += '<button onclick="document.getElementById(\'supZohoDetailOverlay\').remove()" class="text-gray-400 hover:text-gray-600 text-xl ml-4">&#10005;</button>';
    html += '</div>';

    // Body
    html += '<div class="p-5">';
    if (item.beschreibung) {
        html += '<div class="mb-4">';
        html += '<p class="text-xs font-semibold text-gray-500 mb-1">Beschreibung</p>';
        html += '<div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">' + _escH(item.beschreibung) + '</div>';
        html += '</div>';
    }
    if (item.resolution) {
        html += '<div class="mb-4">';
        html += '<p class="text-xs font-semibold text-green-600 mb-1">Loesung</p>';
        html += '<div class="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 whitespace-pre-wrap">' + _escH(item.resolution) + '</div>';
        html += '</div>';
    }
    if (item.tags) {
        html += '<div class="flex flex-wrap gap-1">';
        item.tags.split(',').forEach(function(tag) {
            tag = tag.trim();
            if (tag) html += '<span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">' + _escH(tag) + '</span>';
        });
        html += '</div>';
    }
    html += '</div>';

    html += '<div class="p-5 border-t border-gray-100 flex justify-end">';
    html += '<button onclick="document.getElementById(\'supZohoDetailOverlay\').remove()" class="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Schliessen</button>';
    html += '</div>';
    html += '</div>';

    el.innerHTML = html;
    document.body.appendChild(el);
}

// -- Tab: Kontakte (HQ-Team) --
var HQ_ROLLE_CONFIG = {
    'hq_gf':       { label: 'Geschäftsführung', color: 'bg-purple-600', order: 1 },
    'hq_einkauf':  { label: 'Einkauf',           color: 'bg-blue-500',   order: 2 },
    'hq_marketing':{ label: 'Marketing',          color: 'bg-orange-500', order: 3 },
    'hq_it':       { label: 'IT & Systeme',       color: 'bg-gray-600',   order: 4 },
    'hq_akademie': { label: 'Akademie',           color: 'bg-green-600',  order: 5 },
    'hq_support':  { label: 'Support',            color: 'bg-teal-500',   order: 6 },
    'hq_sales':    { label: 'Vertrieb',           color: 'bg-indigo-500', order: 7 },
    'hq_hr':       { label: 'HR',                 color: 'bg-pink-500',   order: 8 }
};

async function renderKontakteTab() {
    var users = [], rollenDef = [], userRollen = [];
    try {
        var [uResp, rResp, urResp] = await Promise.all([
            _sb().from('users').select('id,vorname,nachname').eq('is_hq', true).eq('status', 'aktiv').order('vorname'),
            _sb().from('rollen').select('id,name').eq('ebene', 'hq'),
            _sb().from('user_rollen').select('user_id,rolle_id')
        ]);
        users = uResp.data || [];
        rollenDef = rResp.data || [];
        userRollen = urResp.data || [];
    } catch(e) { /* ignore */ }

    if (!users.length) return '<div class="text-center py-12 text-gray-400">Team-Daten nicht verfügbar</div>';

    // rolle_id → rolle_name Map
    var rolleIdToName = {};
    rollenDef.forEach(function(r) { rolleIdToName[r.id] = r.name; });

    // user_id → primäre HQ-Abteilungsrolle (höchste Prio = niedrigste order)
    var userAbt = {};
    userRollen.forEach(function(ur) {
        var rName = rolleIdToName[ur.rolle_id];
        var cfg = HQ_ROLLE_CONFIG[rName];
        if (!cfg) return;
        var prev = userAbt[ur.user_id];
        if (!prev || cfg.order < prev.order) {
            userAbt[ur.user_id] = { label: cfg.label, color: cfg.color, order: cfg.order };
        }
    });

    // Gruppieren
    var byAbt = {};
    users.forEach(function(u) {
        var abt = userAbt[u.id] || { label: 'HQ', color: 'bg-gray-400', order: 99 };
        if (!byAbt[abt.label]) byAbt[abt.label] = { color: abt.color, order: abt.order, members: [] };
        byAbt[abt.label].members.push(u);
    });

    var sortedAbt = Object.keys(byAbt).sort(function(a,b){ return byAbt[a].order - byAbt[b].order; });

    var h = '<div class="space-y-6">';
    sortedAbt.forEach(function(abtName) {
        var grp = byAbt[abtName];
        h += '<div>';
        h += '<div class="flex items-center gap-2 mb-3">';
        h += '<div class="w-2 h-5 rounded-sm ' + grp.color + '"></div>';
        h += '<h3 class="text-sm font-bold text-gray-700 uppercase tracking-wider">' + abtName + '</h3>';
        h += '</div>';
        h += '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">';
        grp.members.forEach(function(u) {
            var name = ((u.vorname || '') + ' ' + (u.nachname || '')).trim();
            var initials = name.split(' ').filter(Boolean).map(function(w){ return w[0].toUpperCase(); }).slice(0,2).join('');
            h += '<div class="vit-card p-3 flex items-center gap-3">';
            h += '<div class="w-9 h-9 ' + grp.color + ' rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">' + initials + '</div>';
            h += '<div class="min-w-0"><p class="font-semibold text-gray-800 text-sm truncate">' + _escH(name) + '</p>';
            h += '<p class="text-xs text-gray-400">' + abtName + '</p></div>';
            h += '</div>';
        });
        h += '</div></div>';
    });
    h += '</div>';
    return h;
}

export function renderKontakte() {
    var grid = document.getElementById('kontakteGrid');
    if (!grid || grid.dataset.rendered) return;
    grid.dataset.rendered = 'true';
    renderKontakteTab().then(function(html) { grid.innerHTML = html; });
}

// ======================================================================
// HQ TABS
// ======================================================================

// -- Tab: Offen (HQ) --
async function renderHqOffenTab() {
    if (!_supState.hqLoaded) await loadHqTickets();
    var tickets = _supState.hqTickets.filter(function(t) {
        return t.status === 'offen' || t.status === 'in_bearbeitung' || t.status === 'wartend_auf_partner';
    });
    if (_supState.hqSearch) {
        var q = _supState.hqSearch.toLowerCase();
        tickets = tickets.filter(function(t) {
            return (t.betreff || '').toLowerCase().indexOf(q) !== -1
                || (t.ticket_nr || '').toLowerCase().indexOf(q) !== -1;
        });
    }
    return _renderHqTicketList(tickets, true);
}

// -- Tab: Alle Tickets (HQ) --
async function renderHqAlleTab() {
    if (!_supState.hqLoaded) await loadHqTickets();
    var tickets = _supState.hqTickets;
    if (_supState.hqSearch) {
        var q = _supState.hqSearch.toLowerCase();
        tickets = tickets.filter(function(t) {
            return (t.betreff || '').toLowerCase().indexOf(q) !== -1
                || (t.ticket_nr || '').toLowerCase().indexOf(q) !== -1;
        });
    }
    if (_supState.hqFilterStatus) {
        tickets = tickets.filter(function(t) { return t.status === _supState.hqFilterStatus; });
    }
    return _renderHqTicketList(tickets, false);
}

function _renderHqTicketList(tickets, showSlaOnly) {
    var h = '';

    // Suchleiste + Filter
    h += '<div class="flex flex-wrap items-center gap-3 mb-4">';
    h += '<input type="text" id="supHqSearchInput" oninput="supHqSearch()" class="text-sm border border-gray-300 rounded-lg px-3 py-2 w-52" placeholder="Suche..." value="' + _escH(_supState.hqSearch) + '">';
    if (!showSlaOnly) {
        h += '<select id="supHqFilterStatus" onchange="supHqFilterStatusChanged()" class="text-sm border border-gray-300 rounded-lg px-3 py-2">';
        h += '<option value="">Alle Status</option>';
        Object.keys(STATUS_LABELS).forEach(function(s) {
            h += '<option value="' + s + '"' + (_supState.hqFilterStatus === s ? ' selected' : '') + '>' + STATUS_LABELS[s] + '</option>';
        });
        h += '</select>';
    }
    h += '<button onclick="supHqReload()" class="text-xs px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Aktualisieren</button>';
    h += '<span class="text-xs text-gray-400">' + tickets.length + ' Tickets</span>';
    h += '</div>';

    if (tickets.length === 0) {
        h += '<div class="text-center py-12"><p class="text-gray-500 font-semibold">Keine Tickets gefunden</p></div>';
        return h;
    }

    // Tabelle
    h += '<div class="overflow-x-auto"><table class="w-full text-sm">';
    h += '<thead><tr class="text-left text-xs text-gray-500 border-b border-gray-200">';
    h += '<th class="pb-2 pr-2">SLA</th>';
    h += '<th class="pb-2 pr-2">Ticket</th>';
    h += '<th class="pb-2 pr-2">Betreff</th>';
    h += '<th class="pb-2 pr-2">Standort</th>';
    h += '<th class="pb-2 pr-2">Status</th>';
    h += '<th class="pb-2 pr-2">Prio</th>';
    h += '<th class="pb-2 pr-2">Assignee</th>';
    h += '<th class="pb-2">Erstellt</th>';
    h += '</tr></thead><tbody>';
    tickets.forEach(function(t) {
        var sla = slaInfo(t);
        var d = new Date(t.created_at);
        var standortName = t.standorte ? t.standorte.name : '-';
        var assigneeName = t.assignee ? ((t.assignee.vorname || '') + ' ' + (t.assignee.nachname || '')).trim() || t.assignee.name : '';
        h += '<tr class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="supHqOpenTicket(\'' + t.id + '\')">';
        h += '<td class="py-2.5 pr-2">' + slaIcon(sla) + '</td>';
        h += '<td class="py-2.5 pr-2 font-mono text-xs text-gray-400">' + _escH(t.ticket_nr || '') + '</td>';
        h += '<td class="py-2.5 pr-2 font-semibold text-gray-800 max-w-[200px] truncate">' + _escH(t.betreff) + '</td>';
        h += '<td class="py-2.5 pr-2 text-xs text-gray-600">' + _escH(standortName) + '</td>';
        h += '<td class="py-2.5 pr-2"><span class="text-xs font-semibold rounded px-2 py-0.5 ' + (STATUS_COLORS[t.status] || '') + '">' + (STATUS_LABELS[t.status] || t.status) + '</span></td>';
        h += '<td class="py-2.5 pr-2"><span class="text-xs font-semibold rounded px-2 py-0.5 ' + (PRIO_COLORS[t.prioritaet] || '') + '">' + (PRIO_LABELS[t.prioritaet] || t.prioritaet) + '</span></td>';
        h += '<td class="py-2.5 pr-2 text-xs text-gray-600">' + (assigneeName ? _escH(assigneeName) : '<span class="text-red-400">-</span>') + '</td>';
        h += '<td class="py-2.5 text-xs text-gray-400 whitespace-nowrap">' + d.toLocaleDateString('de-DE') + '</td>';
        h += '</tr>';
    });
    h += '</tbody></table></div>';
    return h;
}

export function supHqSearchFn() {
    var el = document.getElementById('supHqSearchInput');
    _supState.hqSearch = el ? el.value : '';
    renderTickets();
}

export function supHqFilterStatusChanged() {
    var el = document.getElementById('supHqFilterStatus');
    _supState.hqFilterStatus = el ? el.value : '';
    renderTickets();
}

export async function supHqReload() {
    _supState.hqLoaded = false;
    _supState.zohoArchivLoaded = false;
    _supState.loaded = false;
    _supState.zohoLoaded = false;
    await Promise.all([loadKategorieRollen(), loadTickets()]);
    renderTickets();
}

// -- Tab: Zoho-Archiv (HQ) --
async function renderHqZohoArchivTab() {
    if (!_supState.zohoArchivLoaded) await loadZohoArchiv();

    var items = _supState.zohoArchiv;
    if (_supState.hqSearch) {
        var q = _supState.hqSearch.toLowerCase();
        items = items.filter(function(z) {
            return (z.betreff || '').toLowerCase().indexOf(q) !== -1
                || (z.zoho_nr || '').toLowerCase().indexOf(q) !== -1
                || (z.kontakt_email || '').toLowerCase().indexOf(q) !== -1;
        });
    }

    var h = '';
    h += '<div class="flex items-center gap-3 mb-4">';
    h += '<input type="text" id="supHqZohoSearch" oninput="supHqZohoSearchFn()" class="text-sm border border-gray-300 rounded-lg px-3 py-2 w-64" placeholder="Zoho-Archiv durchsuchen..." value="' + _escH(_supState.hqSearch) + '">';
    h += '<span class="text-xs text-gray-400">' + items.length + ' Eintraege</span>';
    h += '</div>';

    if (items.length === 0) {
        h += '<div class="text-center py-12"><p class="text-gray-500 font-semibold">Keine Zoho-Eintraege gefunden</p></div>';
        return h;
    }

    h += '<div class="overflow-x-auto"><table class="w-full text-sm">';
    h += '<thead><tr class="text-left text-xs text-gray-500 border-b border-gray-200">';
    h += '<th class="pb-2 pr-2">Nr</th>';
    h += '<th class="pb-2 pr-2">Betreff</th>';
    h += '<th class="pb-2 pr-2">Kontakt</th>';
    h += '<th class="pb-2 pr-2">Status</th>';
    h += '<th class="pb-2 pr-2">Prio</th>';
    h += '<th class="pb-2">Erstellt</th>';
    h += '</tr></thead><tbody>';
    items.forEach(function(z) {
        var d = z.zoho_erstellt_am ? new Date(z.zoho_erstellt_am) : null;
        var statusClass = z.ist_offen ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600';
        h += '<tr class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="supOpenZohoDetail(\'' + z.id + '\')">';
        h += '<td class="py-2 pr-2 font-mono text-xs text-gray-400">' + _escH(z.zoho_nr || '-') + '</td>';
        h += '<td class="py-2 pr-2 font-semibold text-gray-800 max-w-[250px] truncate">' + _escH(z.betreff) + '</td>';
        h += '<td class="py-2 pr-2 text-xs text-gray-500">' + _escH(z.kontakt_email || '-') + '</td>';
        h += '<td class="py-2 pr-2"><span class="text-xs font-semibold rounded px-2 py-0.5 ' + statusClass + '">' + _escH(z.ist_offen ? 'Offen' : (z.status || 'Geschlossen')) + '</span></td>';
        h += '<td class="py-2 pr-2 text-xs text-gray-500">' + _escH(z.prioritaet || '-') + '</td>';
        h += '<td class="py-2 text-xs text-gray-400">' + (d ? d.toLocaleDateString('de-DE') : '-') + '</td>';
        h += '</tr>';
    });
    h += '</tbody></table></div>';
    return h;
}

export function supHqZohoSearchFn() {
    var el = document.getElementById('supHqZohoSearch');
    _supState.hqSearch = el ? el.value : '';
    renderTickets();
}

// -- Tab: Statistiken (HQ) --
async function renderHqStatsTab() {
    if (!_supState.hqLoaded) await loadHqTickets();
    var all = _supState.hqTickets;
    var h = '';

    // Status-Verteilung
    var statusCounts = {};
    Object.keys(STATUS_LABELS).forEach(function(s) { statusCounts[s] = 0; });
    all.forEach(function(t) { if (statusCounts[t.status] !== undefined) statusCounts[t.status]++; });
    var maxStatus = Math.max.apply(null, Object.values(statusCounts).concat([1]));

    h += '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">';

    // Status-Chart
    h += '<div class="vit-card p-5">';
    h += '<h3 class="text-sm font-bold text-gray-600 uppercase mb-4">Status-Verteilung</h3>';
    Object.keys(STATUS_LABELS).forEach(function(s) {
        var cnt = statusCounts[s];
        var pct = Math.round((cnt / maxStatus) * 100);
        var barColor = s === 'offen' ? 'bg-yellow-400' : s === 'in_bearbeitung' ? 'bg-blue-400' : s === 'wartend_auf_partner' ? 'bg-purple-400' : s === 'geloest' ? 'bg-green-400' : 'bg-gray-400';
        h += '<div class="mb-3">';
        h += '<div class="flex items-center justify-between text-xs mb-1">';
        h += '<span class="text-gray-600">' + STATUS_LABELS[s] + '</span>';
        h += '<span class="font-bold text-gray-800">' + cnt + '</span>';
        h += '</div>';
        h += '<div class="w-full bg-gray-100 rounded-full h-3">';
        h += '<div class="' + barColor + ' rounded-full h-3 transition-all" style="width:' + pct + '%"></div>';
        h += '</div></div>';
    });
    h += '</div>';

    // Prioritaet-Chart
    var prioCounts = {niedrig: 0, mittel: 0, kritisch: 0};
    all.forEach(function(t) { if (prioCounts[t.prioritaet] !== undefined) prioCounts[t.prioritaet]++; });
    var maxPrio = Math.max.apply(null, Object.values(prioCounts).concat([1]));

    h += '<div class="vit-card p-5">';
    h += '<h3 class="text-sm font-bold text-gray-600 uppercase mb-4">Prioritaet-Verteilung</h3>';
    ['niedrig', 'mittel', 'kritisch'].forEach(function(p) {
        var cnt = prioCounts[p];
        var pct = Math.round((cnt / maxPrio) * 100);
        var barColor = p === 'niedrig' ? 'bg-gray-400' : p === 'mittel' ? 'bg-yellow-400' : 'bg-red-400';
        h += '<div class="mb-3">';
        h += '<div class="flex items-center justify-between text-xs mb-1">';
        h += '<span class="text-gray-600">' + PRIO_LABELS[p] + '</span>';
        h += '<span class="font-bold text-gray-800">' + cnt + '</span>';
        h += '</div>';
        h += '<div class="w-full bg-gray-100 rounded-full h-3">';
        h += '<div class="' + barColor + ' rounded-full h-3 transition-all" style="width:' + pct + '%"></div>';
        h += '</div></div>';
    });
    h += '</div>';
    h += '</div>'; // end grid

    // KPI-Kacheln
    var antwortZeiten = all.filter(function(t) { return t.erste_antwort_at; }).map(function(t) {
        return (new Date(t.erste_antwort_at).getTime() - new Date(t.created_at).getTime()) / 3600000;
    });
    var avgAntwort = antwortZeiten.length > 0 ? (antwortZeiten.reduce(function(a,b){return a+b;},0) / antwortZeiten.length).toFixed(1) : '-';

    var slaRelevant = all.filter(function(t) { return t.status === 'geloest' || t.status === 'geschlossen'; });
    var slaOk = slaRelevant.filter(function(t) {
        if (!t.erste_antwort_at) return false;
        var hrs = (new Date(t.erste_antwort_at).getTime() - new Date(t.created_at).getTime()) / 3600000;
        return hrs <= (t.sla_stunden || 48);
    }).length;
    var slaQuote = slaRelevant.length > 0 ? Math.round((slaOk / slaRelevant.length) * 100) : '-';

    var csatTickets = all.filter(function(t) { return t.csat_bewertung; });
    var avgCsat = csatTickets.length > 0 ? (csatTickets.reduce(function(a,t){return a+t.csat_bewertung;},0) / csatTickets.length).toFixed(1) : '-';

    h += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">';
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-blue-600">' + avgAntwort + (avgAntwort !== '-' ? 'h' : '') + '</p><p class="text-xs text-gray-500">Oe Erstantwort</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold ' + (slaQuote !== '-' && slaQuote < 80 ? 'text-red-600' : 'text-green-600') + '">' + slaQuote + (slaQuote !== '-' ? '%' : '') + '</p><p class="text-xs text-gray-500">SLA-Quote</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-yellow-500">' + avgCsat + (avgCsat !== '-' ? ' *' : '') + '</p><p class="text-xs text-gray-500">Oe CSAT</p></div>';
    h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-gray-800">' + all.length + '</p><p class="text-xs text-gray-500">Tickets gesamt</p></div>';
    h += '</div>';

    return h;
}

// ======================================================================
// TICKET DETAIL (Partner)
// ======================================================================
export async function openTicketDetail(ticketId) {
    try {
        var tResp = await _sb().from('support_tickets').select('*, users:erstellt_von(name, vorname, nachname), assignee:assignee_id(name, vorname, nachname)').eq('id', ticketId).single();
        if (tResp.error) throw tResp.error;
        var t = tResp.data;

        var kResp = await _sb().from('support_ticket_kommentare').select('*, users:autor_id(name, vorname, nachname, is_hq)').eq('ticket_id', ticketId).eq('is_internal', false).order('created_at', {ascending: true});
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
        html += '<span class="text-xs rounded px-1.5 py-0.5 bg-gray-100 text-gray-600">' + _escH(t.kategorie || '') + '</span>';
        html += slaIcon(sla);
        html += '</div>';
        html += '<button onclick="closeTicketDetail()" class="text-gray-400 hover:text-gray-600 text-xl ml-2">&#10005;</button>';
        html += '</div>';
        html += '<h3 class="font-bold text-gray-800 text-lg">' + _escH(t.betreff) + '</h3>';
        html += '<p class="text-xs text-gray-400 mt-1">Von ' + _escH(erstellerName) + ' - ' + d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}) + '</p>';
        html += '</div>';

        // Body
        html += '<div class="flex-1 overflow-y-auto p-5">';

        // Beschreibung
        html += '<div class="bg-gray-50 rounded-lg p-4 mb-4">';
        html += '<p class="text-sm text-gray-700 whitespace-pre-wrap">' + _escH(t.beschreibung || '') + '</p>';
        html += '</div>';

        // Anhaenge
        if (anhaenge.length > 0) {
            html += '<div class="mb-4"><p class="text-xs font-semibold text-gray-500 mb-1">Anhaenge</p>';
            anhaenge.forEach(function(a) {
                html += '<a href="#" onclick="supDownloadAnhang(\'' + _escH(a.storage_path) + '\', \'' + _escH(a.dateiname) + '\'); return false;" class="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mr-3">' + _escH(a.dateiname) + '</a>';
            });
            html += '</div>';
        }

        // CSAT-Widget
        if (t.status === 'geloest' && !t.csat_bewertung) {
            html += '<div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">';
            html += '<p class="text-sm font-semibold text-green-800 mb-2">Wie zufrieden bist du mit der Loesung?</p>';
            html += '<div class="flex items-center gap-1 mb-2" id="supCsatStars">';
            for (var s = 1; s <= 5; s++) {
                html += '<button onclick="supSetCsat(' + s + ', \'' + ticketId + '\')" class="text-2xl text-gray-300 hover:text-yellow-400 transition sup-csat-star" data-star="' + s + '">&#9733;</button>';
            }
            html += '</div>';
            html += '<textarea id="supCsatKommentar" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs resize-none" placeholder="Optionaler Kommentar..."></textarea>';
            html += '<button onclick="supSubmitCsat(\'' + ticketId + '\')" id="supCsatBtn" class="mt-2 px-4 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600">Bewertung senden</button>';
            html += '</div>';
        }

        // Kommentar-Thread
        html += '<div id="supVerlaufContainer">';
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
            html += '<span class="text-xs text-gray-400">' + kd.toLocaleDateString('de-DE') + ' ' + kd.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}) + '</span>';
            html += '</div>';
            var inhalt = _escH(k.inhalt).replace(/@(\w+)/g, '<strong class="text-blue-600">@$1</strong>');
            html += '<p class="text-sm text-gray-700 whitespace-pre-wrap">' + inhalt + '</p>';
            html += '</div></div>';
        });
        html += '</div>';

        // Antwort-Box
        html += '<div class="mt-4 border-t border-gray-100 pt-4">';
        html += '<textarea id="supKommentarInput" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:border-vit-orange focus:outline-none" placeholder="Antwort schreiben..."></textarea>';
        html += '<div class="flex items-center justify-between mt-2">';
        html += '<input type="file" id="supKommentarFile" class="text-xs text-gray-500">';
        html += '<button onclick="supSendKommentar(\'' + ticketId + '\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">Senden</button>';
        html += '</div></div>';

        html += '</div>';
        html += '</div>';

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

// ======================================================================
// HQ TICKET DETAIL
// ======================================================================
export async function supHqOpenTicket(ticketId) {
    try {
        var [tResp, kResp, aResp, logResp] = await Promise.all([
            _sb().from('support_tickets').select('*, users:erstellt_von(name, vorname, nachname), assignee:assignee_id(name, vorname, nachname), standorte:standort_id(name)').eq('id', ticketId).single(),
            _sb().from('support_ticket_kommentare').select('*, users:autor_id(name, vorname, nachname, is_hq)').eq('ticket_id', ticketId).order('created_at', {ascending: true}),
            _sb().from('support_ticket_anhaenge').select('*').eq('ticket_id', ticketId),
            _sb().from('support_ticket_log').select('*, users:user_id(name, vorname, nachname)').eq('ticket_id', ticketId).order('created_at', {ascending: false}).limit(20)
        ]);
        if (tResp.error) throw tResp.error;
        var t = tResp.data;
        var kommentare = kResp.data || [];
        var anhaenge = aResp.data || [];
        var logs = logResp.data || [];

        var sla = slaInfo(t);
        var d = new Date(t.created_at);
        var erstellerName = t.users ? ((t.users.vorname || '') + ' ' + (t.users.nachname || '')).trim() || t.users.name || '' : 'Unbekannt';
        var standortName = t.standorte ? t.standorte.name : '-';

        var el = document.createElement('div');
        el.id = 'supHqDetailOverlay';
        el.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-4';
        el.onclick = function(e) { if (e.target === el) { var ov = document.getElementById('supHqDetailOverlay'); if (ov) ov.remove(); if (_supState.realtimeSub) { try { _sb().removeChannel(_supState.realtimeSub); } catch(ex) {} _supState.realtimeSub = null; } } };

        var html = '<div class="bg-white rounded-xl w-full max-w-3xl mx-4 shadow-2xl flex flex-col max-h-[92vh]" onclick="event.stopPropagation()">';

        // Header
        html += '<div class="p-5 border-b border-gray-100 flex-shrink-0">';
        html += '<div class="flex items-center justify-between mb-2">';
        html += '<div class="flex items-center gap-2 flex-wrap">';
        html += '<span class="text-xs font-mono text-gray-400">' + _escH(t.ticket_nr || '') + '</span>';
        html += '<span class="text-xs font-semibold rounded px-2 py-0.5 ' + (STATUS_COLORS[t.status] || '') + '">' + (STATUS_LABELS[t.status] || t.status) + '</span>';
        html += '<span class="text-xs font-semibold rounded px-2 py-0.5 ' + (PRIO_COLORS[t.prioritaet] || '') + '">' + (PRIO_LABELS[t.prioritaet] || t.prioritaet) + '</span>';
        html += '<span class="text-xs rounded px-1.5 py-0.5 bg-gray-100 text-gray-600">' + _escH(t.kategorie || '') + '</span>';
        html += slaIcon(sla);
        html += '</div>';
        html += '<button onclick="document.getElementById(\'supHqDetailOverlay\').remove()" class="text-gray-400 hover:text-gray-600 text-xl ml-2">&#10005;</button>';
        html += '</div>';
        html += '<h3 class="font-bold text-gray-800 text-lg">' + _escH(t.betreff) + '</h3>';
        html += '<p class="text-xs text-gray-400 mt-1">Von ' + _escH(erstellerName) + ' - ' + _escH(standortName) + ' - ' + d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}) + '</p>';
        html += '</div>';

        // Steuerungsleiste
        html += '<div class="p-4 border-b border-gray-100 flex-shrink-0 flex flex-wrap items-center gap-3 bg-gray-50">';

        // Status
        html += '<div class="flex items-center gap-1">';
        html += '<label class="text-xs text-gray-500">Status:</label>';
        html += '<select id="supHqDetailStatus" onchange="supHqSaveStatus(\'' + ticketId + '\')" class="text-xs border border-gray-300 rounded px-2 py-1">';
        Object.keys(STATUS_LABELS).forEach(function(s) {
            html += '<option value="' + s + '"' + (t.status === s ? ' selected' : '') + '>' + STATUS_LABELS[s] + '</option>';
        });
        html += '</select>';
        html += '</div>';

        // Prioritaet
        html += '<div class="flex items-center gap-1">';
        html += '<label class="text-xs text-gray-500">Prio:</label>';
        html += '<select id="supHqDetailPrio" onchange="supHqSavePrio(\'' + ticketId + '\')" class="text-xs border border-gray-300 rounded px-2 py-1">';
        ['niedrig','mittel','kritisch'].forEach(function(p) {
            html += '<option value="' + p + '"' + (t.prioritaet === p ? ' selected' : '') + '>' + PRIO_LABELS[p] + '</option>';
        });
        html += '</select>';
        html += '</div>';

        // Assignee
        html += '<div class="flex items-center gap-1">';
        html += '<label class="text-xs text-gray-500">Assignee:</label>';
        html += '<select id="supHqDetailAssignee" onchange="supHqSaveAssignee(\'' + ticketId + '\')" class="text-xs border border-gray-300 rounded px-2 py-1">';
        html += '<option value="">Nicht zugewiesen</option>';
        _supState.hqUsers.forEach(function(u) {
            var name = ((u.vorname || '') + ' ' + (u.nachname || '')).trim() || u.name || u.id.slice(0,8);
            html += '<option value="' + u.id + '"' + (t.assignee_id === u.id ? ' selected' : '') + '>' + _escH(name) + '</option>';
        });
        html += '</select>';
        html += '</div>';

        // Abteilung
        html += '<div class="flex items-center gap-1">';
        html += '<label class="text-xs text-gray-500">Abt.:</label>';
        html += '<select id="supHqDetailAbteilung" onchange="supHqSaveAbteilung(\'' + ticketId + '\')" class="text-xs border border-gray-300 rounded px-2 py-1">';
        html += '<option value="gf"' + (t.abteilung === "gf" ? ' selected' : '') + '>Geschäftsführung</option>';html += '<option value="sales"' + (t.abteilung === "sales" ? ' selected' : '') + '>Sales</option>';html += '<option value="marketing"' + (t.abteilung === "marketing" ? ' selected' : '') + '>Marketing</option>';html += '<option value="einkauf"' + (t.abteilung === "einkauf" ? ' selected' : '') + '>Einkauf</option>';html += '<option value="support"' + (t.abteilung === "support" ? ' selected' : '') + '>Support</option>';html += '<option value="akademie"' + (t.abteilung === "akademie" ? ' selected' : '') + '>Akademie</option>';html += '<option value="hr"' + (t.abteilung === "hr" ? ' selected' : '') + '>HR</option>';html += '<option value="it"' + (t.abteilung === "it" ? ' selected' : '') + '>IT</option>';
        html += '</select>';
        html += '</div>';

        // Absender ändern
        html += '<div class="flex items-center gap-1">';
        html += '<label class="text-xs text-gray-500">Absender:</label>';
        html += '<select id="supHqDetailAbsender" class="text-xs border border-gray-300 rounded px-2 py-1 max-w-[180px]">';
        html += '<option value="">Unbekannt</option>';
        _supState.hqUsers.forEach(function(u) {
            var name = ((u.vorname || '') + ' ' + (u.nachname || '')).trim() || u.name || '';
            var isCurrent = t.erstellt_von === u.id;
            html += '<option value="' + u.id + '"' + (isCurrent ? ' selected' : '') + '>' + _escH(name) + '</option>';
        });
        html += '</select>';
        html += '<button onclick="supHqSaveAbsender(\'' + ticketId + '\')" class="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600">OK</button>';
        html += '</div>';

        // KI-Antwort
        html += '<button onclick="supHqKiAntwort(\'' + ticketId + '\')" class="text-xs px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 ml-auto">KI-Antwort</button>';
        html += '</div>';

        // Body
        html += '<div class="flex-1 overflow-y-auto p-5">';

        // Beschreibung
        html += '<div class="bg-gray-50 rounded-lg p-4 mb-4">';
        html += '<p class="text-sm text-gray-700 whitespace-pre-wrap">' + _escH(t.beschreibung || '') + '</p>';
        html += '</div>';

        // Anhaenge
        if (anhaenge.length > 0) {
            html += '<div class="mb-4"><p class="text-xs font-semibold text-gray-500 mb-1">Anhaenge</p>';
            anhaenge.forEach(function(a) {
                html += '<a href="#" onclick="supDownloadAnhang(\'' + _escH(a.storage_path) + '\', \'' + _escH(a.dateiname) + '\'); return false;" class="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mr-3">' + _escH(a.dateiname) + '</a>';
            });
            html += '</div>';
        }

        // CSAT (HQ sieht Bewertung)
        if (t.csat_bewertung) {
            html += '<div class="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg">';
            html += '<p class="text-xs font-semibold text-green-700">Partner-Bewertung: ';
            for (var cs = 1; cs <= 5; cs++) html += '<span class="' + (cs <= t.csat_bewertung ? 'text-yellow-400' : 'text-gray-300') + '">&#9733;</span>';
            html += ' (' + t.csat_bewertung + '/5)</p>';
            if (t.csat_kommentar) html += '<p class="text-xs text-green-600 mt-1">"' + _escH(t.csat_kommentar) + '"</p>';
            html += '</div>';
        }

        // Kommentar-Thread (inkl. interne Notizen + threaded replies)
        _supState.activeTicketId = ticketId;

        // Top-Level Kommentare (kein parent)
        var topLevel = kommentare.filter(function(k) { return !k.parent_id; });
        var replies = {};
        kommentare.forEach(function(k) {
            if (k.parent_id) {
                if (!replies[k.parent_id]) replies[k.parent_id] = [];
                replies[k.parent_id].push(k);
            }
        });

        html += '<div id="supHqVerlaufContainer">';
        html += '<h4 class="text-xs font-bold text-gray-500 uppercase mb-3">Verlauf (' + kommentare.length + ')</h4>';
        if (topLevel.length === 0) {
            html += '<p class="text-sm text-gray-400 mb-4">Noch keine Kommentare.</p>';
        }

        function renderKommentarBlock(k, isReply) {
            var kd = new Date(k.created_at);
            var isHq = k.users && k.users.is_hq;
            var kName = k.users ? ((k.users.vorname || '') + ' ' + (k.users.nachname || '')).trim() || k.users.name || 'Unbekannt' : 'Unbekannt';
            var initials = kName.split(' ').map(function(w) { return w[0] || ''; }).join('').toUpperCase().substring(0, 2);
            var bgAvatar = k.is_internal ? 'bg-gray-500' : isHq ? 'bg-blue-500' : 'bg-orange-500';
            var bgCard = k.is_internal ? 'bg-yellow-50 border border-yellow-200' : isHq ? 'bg-blue-50 border border-blue-100' : 'bg-white border border-gray-100';
            var out = '<div class="' + (isReply ? 'ml-11 mt-2' : 'mb-3') + ' flex gap-3">';
            out += '<div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ' + bgAvatar + '">' + initials + '</div>';
            out += '<div class="flex-1 p-3 rounded-lg ' + bgCard + '">';
            out += '<div class="flex items-center justify-between mb-1">';
            out += '<span class="text-xs font-bold text-gray-700">' + _escH(kName);
            if (isHq) out += ' <span class="text-blue-500">HQ</span>';
            if (k.is_internal) out += ' <span class="text-yellow-600 text-xs bg-yellow-100 px-1 rounded">INTERN</span>';
            out += '</span>';
            out += '<span class="text-xs text-gray-400">' + kd.toLocaleDateString('de-DE') + ' ' + kd.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}) + '</span>';
            out += '</div>';
            var inhalt = _escH(k.inhalt).replace(/@(\w+)/g, '<strong class="text-blue-600">@$1</strong>');
            out += '<p class="text-sm text-gray-700 whitespace-pre-wrap">' + inhalt + '</p>';
            // Reply-Button nur für HQ-Agents
            var safeKName = kName.replace(/'/g, '').replace(/"/g, ''); out += '<button onclick="supHqStartReply(\'' + k.id + '\',\'' + safeKName + '\')" class="mt-1 text-xs text-gray-400 hover:text-blue-500 transition-colors">↩ Antworten</button>';
            out += '</div></div>';
            return out;
        }

        topLevel.forEach(function(k) {
            html += renderKommentarBlock(k, false);
            // Replies dieses Kommentars
            var kReplies = replies[k.id] || [];
            kReplies.forEach(function(r) {
                html += renderKommentarBlock(r, true);
            });
        });
        html += '</div>';

        // Reply-Preview-Box (erscheint wenn Reply aktiv)
        html += '<div id="supHqReplyPreview" class="hidden mx-4 mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-center justify-between">';
        html += '<span id="supHqReplyLabel"></span>';
        html += '<button onclick="supHqCancelReply()" class="ml-2 text-blue-400 hover:text-blue-600 font-bold">✕</button>';
        html += '</div>';

        // Antwort-Box mit Intern-Checkbox + @Mention + Reply
        html += '<div class="mt-4 border-t border-gray-100 pt-4">';
        html += '<div id="supHqKiAntwortBox"></div>';
        html += '<input type="hidden" id="supHqParentId" value="">';
        html += '<div class="relative">';
        html += '<textarea id="supHqKommentarInput" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:border-vit-orange focus:outline-none" placeholder="Antwort schreiben... @Name für Erwähnung" oninput="supHqMentionInput(this)"></textarea>';
        html += '<div id="supHqMentionDropdown" class="hidden absolute z-50 bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto w-64"></div>';
        html += '</div>';
        html += '<div class="flex items-center justify-between mt-2">';
        html += '<div class="flex items-center gap-3">';
        html += '<input type="file" id="supHqKommentarFile" class="text-xs text-gray-500">';
        html += '<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">';
        html += '<input type="checkbox" id="supHqInternalCheck"> Interne Notiz</label>';
        html += '</div>';
        html += '<button onclick="supHqSendKommentar(\'' + ticketId + '\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">Senden</button>';
        html += '</div></div>';

        // Audit-Log
        if (logs.length > 0) {
            html += '<div class="mt-6 border-t border-gray-100 pt-4">';
            html += '<h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Audit-Log</h4>';
            logs.forEach(function(l) {
                var ld = new Date(l.created_at);
                var lName = l.users ? ((l.users.vorname || '') + ' ' + (l.users.nachname || '')).trim() || l.users.name || '' : 'System';
                html += '<div class="text-xs text-gray-400 mb-1">';
                html += ld.toLocaleDateString('de-DE') + ' ' + ld.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'});
                html += ' - ' + _escH(lName) + ' - ' + _escH(l.aktion);
                if (l.alt_wert || l.neu_wert) html += ': ' + _escH(l.alt_wert || '') + ' -> ' + _escH(l.neu_wert || '');
                html += '</div>';
            });
            html += '</div>';
        }

        html += '</div>';
        html += '</div>';

        el.innerHTML = html;
        document.body.appendChild(el);

        // Realtime-Subscription starten
        _supStartRealtime(ticketId);

    } catch(err) {
        console.error('[support] supHqOpenTicket:', err);
        _showToast('Fehler beim Laden des Tickets', 'error');
    }
}

// ========== HQ: Status/Prio/Assignee aendern ==========
export async function supHqSaveStatus(ticketId) {
    var val = (document.getElementById('supHqDetailStatus') || {}).value;
    if (!val) return;
    try {
        var user = _sbUser();
        var ticket = _supState.hqTickets.find(function(t) { return t.id === ticketId; });
        var altStatus = ticket ? ticket.status : '';
        var update = { status: val };
        if (val === 'geloest') update.geloest_at = new Date().toISOString();
        if (val === 'in_bearbeitung' && ticket && !ticket.erste_antwort_at) update.erste_antwort_at = new Date().toISOString();

        await _sb().from('support_tickets').update(update).eq('id', ticketId);
        await _sb().from('support_ticket_log').insert({ ticket_id: ticketId, user_id: user ? user.id : null, aktion: 'status_geaendert', alt_wert: altStatus, neu_wert: val });

        if (val === 'geloest') {
            try {
                var sess = await _sb().auth.getSession();
                var token = sess.data && sess.data.session ? sess.data.session.access_token : '';
                fetch(window.SUPABASE_URL + '/functions/v1/support-notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ event: 'status_geaendert', ticket_id: ticketId })
                }).catch(function(){});
            } catch(e) {}
        }

        _showToast('Status geaendert: ' + STATUS_LABELS[val], 'success');
        // Hintergrund-Update (Modal bleibt offen)
        _supState.hqLoaded = false;
        loadHqTickets().then(function() { renderTickets(); });
    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

export async function supHqSavePrio(ticketId) {
    var val = (document.getElementById('supHqDetailPrio') || {}).value;
    if (!val) return;
    try {
        var user = _sbUser();
        var ticket = _supState.hqTickets.find(function(t) { return t.id === ticketId; });
        await _sb().from('support_tickets').update({ prioritaet: val }).eq('id', ticketId);
        await _sb().from('support_ticket_log').insert({ ticket_id: ticketId, user_id: user ? user.id : null, aktion: 'prioritaet_geaendert', alt_wert: ticket ? ticket.prioritaet : '', neu_wert: val });
        _showToast('Prioritaet: ' + PRIO_LABELS[val], 'success');
        // Hintergrund-Update (Modal bleibt offen)
        _supState.hqLoaded = false;
        loadHqTickets().then(function() { renderTickets(); });
    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

export async function supHqSaveAssignee(ticketId) {
    var val = (document.getElementById('supHqDetailAssignee') || {}).value || null;
    try {
        var user = _sbUser();
        await _sb().from('support_tickets').update({ assignee_id: val }).eq('id', ticketId);
        var assigneeName = val ? (_supState.hqUsers.find(function(u) { return u.id === val; }) || {}).vorname || 'HQ-User' : 'niemand';
        await _sb().from('support_ticket_log').insert({ ticket_id: ticketId, user_id: user ? user.id : null, aktion: 'assignee_geaendert', neu_wert: assigneeName });
        _showToast('Zugewiesen an: ' + assigneeName, 'success');
        // Hintergrund-Update (Modal bleibt offen)
        _supState.hqLoaded = false;
        loadHqTickets().then(function() { renderTickets(); });
    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

// ========== HQ: Abteilung ändern ==========
export async function supHqSaveAbteilung(ticketId) {
    var val = (document.getElementById('supHqDetailAbteilung') || {}).value;
    if (!val) return;
    try {
        var user = _sbUser();
        var ticket = _supState.hqTickets.find(function(t) { return t.id === ticketId; });
        await _sb().from('support_tickets').update({ abteilung: val }).eq('id', ticketId);
        await _sb().from('support_ticket_log').insert({ ticket_id: ticketId, user_id: user ? user.id : null, aktion: 'abteilung_geaendert', alt_wert: ticket ? ticket.abteilung : '', neu_wert: val });
        _showToast('Abteilung: ' + val, 'success');
        // Hintergrund-Update (Modal bleibt offen)
        _supState.hqLoaded = false;
        loadHqTickets().then(function() { renderTickets(); });
    } catch(err) { _showToast('Fehler: ' + (err.message || err), 'error'); }
}

// ========== HQ: Absender ändern ==========
export async function supHqSaveAbsender(ticketId) {
    var val = (document.getElementById('supHqDetailAbsender') || {}).value || null;
    if (!val) return;
    try {
        var user = _sbUser();
        await _sb().from('support_tickets').update({ erstellt_von: val, zoho_fallback: false }).eq('id', ticketId);
        var u = _supState.hqUsers.find(function(u) { return u.id === val; });
        var name = u ? ((u.vorname||'') + ' ' + (u.nachname||'')).trim() : val;
        await _sb().from('support_ticket_log').insert({ ticket_id: ticketId, user_id: user ? user.id : null, aktion: 'absender_geaendert', neu_wert: name });
        _showToast('Absender: ' + name, 'success');
        // Hintergrund-Update (Modal bleibt offen)
        _supState.hqLoaded = false;
        loadHqTickets().then(function() { renderTickets(); });
    } catch(err) { _showToast('Fehler: ' + (err.message || err), 'error'); }
}

// ========== HQ: KI-Antwortvorschlag ==========
export async function supHqKiAntwort(ticketId) {
    try {
        _showToast('KI generiert Antwort...', 'info');
        var sess = await _sb().auth.getSession();
        var token = sess.data && sess.data.session ? sess.data.session.access_token : '';
        var resp = await fetch(window.SUPABASE_URL + '/functions/v1/support-ki-antwort', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ ticket_id: ticketId })
        });
        if (!resp.ok) throw new Error('KI-Antwort Fehler');
        var data = await resp.json();
        if (data.antwort) {
            var textarea = document.getElementById('supHqKommentarInput');
            if (textarea) textarea.value = data.antwort;
            _showToast('KI-Antwort eingefuegt - bitte pruefen und anpassen', 'success');
        }
    } catch(err) {
        _showToast('KI-Antwort fehlgeschlagen: ' + (err.message || err), 'error');
    }
}

export function supHqKiInAntwort() {
    var textarea = document.getElementById('supHqKommentarInput');
    var box = document.getElementById('supHqKiAntwortBox');
    if (box && box.textContent && textarea) {
        textarea.value = box.textContent;
    }
}

// ========== HQ: Reply starten ==========
export function supHqStartReply(parentId, parentAutor) {
    var parentInput = document.getElementById('supHqParentId');
    if (parentInput) parentInput.value = parentId;
    var preview = document.getElementById('supHqReplyPreview');
    var label = document.getElementById('supHqReplyLabel');
    if (preview && label) {
        label.textContent = '↩ Antwort auf ' + parentAutor;
        preview.classList.remove('hidden');
    }
    var ta = document.getElementById('supHqKommentarInput');
    if (ta) { ta.focus(); ta.placeholder = 'Antwort auf ' + parentAutor + '...'; }
}

export function supHqCancelReply() {
    var parentInput = document.getElementById('supHqParentId');
    if (parentInput) parentInput.value = '';
    var preview = document.getElementById('supHqReplyPreview');
    if (preview) preview.classList.add('hidden');
    var ta = document.getElementById('supHqKommentarInput');
    if (ta) ta.placeholder = 'Antwort schreiben... @Name für Erwähnung';
}

// ========== @Mention Autocomplete ==========
var _supHqAllUsers = null;
export async function supHqMentionInput(textarea) {
    var val = textarea.value;
    var lastAt = val.lastIndexOf('@');
    var dropdown = document.getElementById('supHqMentionDropdown');
    if (!dropdown) return;
    if (lastAt === -1 || (val.length - lastAt) > 20) {
        dropdown.classList.add('hidden');
        return;
    }
    var query = val.substring(lastAt + 1).toLowerCase();
    if (!_supHqAllUsers) {
        var resp = await _sb().from('users').select('id,vorname,nachname,is_hq').eq('status','aktiv').not('vorname','is',null);
        _supHqAllUsers = resp.data || [];
    }
    var matches = _supHqAllUsers.filter(function(u) {
        var full = ((u.vorname||'') + ' ' + (u.nachname||'')).toLowerCase();
        return full.indexOf(query) !== -1 && query.length > 0;
    }).slice(0, 8);
    if (matches.length === 0) { dropdown.classList.add('hidden'); return; }
    dropdown.innerHTML = matches.map(function(u) {
        var name = ((u.vorname||'') + ' ' + (u.nachname||'')).trim();
        var tag = name.replace(/\s+/g, '');
        var mentionBtn = '<div class="px-3 py-2 hover:bg-orange-50 cursor-pointer text-sm flex items-center gap-2" onclick="supHqInsertMention(\"' + tag + '\",\"' + u.id + '\")">'
            + '<span class="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">' + (u.vorname||'?')[0] + '</span>'
            + name + (u.is_hq ? ' <span class="text-xs text-blue-400">HQ</span>' : '') + '</div>';
        return mentionBtn;
    }).join('');
    dropdown.classList.remove('hidden');
}

export function supHqInsertMention(tag, userId) {
    var ta = document.getElementById('supHqKommentarInput');
    if (!ta) return;
    var val = ta.value;
    var lastAt = val.lastIndexOf('@');
    ta.value = val.substring(0, lastAt) + '@' + tag + ' ';
    var dd = document.getElementById('supHqMentionDropdown');
    if (dd) dd.classList.add('hidden');
    ta.focus();
    // Mention-UUID merken für DB
    if (!ta._mentions) ta._mentions = [];
    ta._mentions.push(userId);
}

// ========== Realtime: Verlauf live aktualisieren ==========
function _supStartRealtime(ticketId) {
    if (_supState.realtimeSub) {
        try { _sb().removeChannel(_supState.realtimeSub); } catch(e) {}
        _supState.realtimeSub = null;
    }
    var channel = _sb().channel('support-kommentare-' + ticketId)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'support_ticket_kommentare',
            filter: 'ticket_id=eq.' + ticketId
        }, function(payload) {
            // Neuen Kommentar live nachladen und Verlauf aktualisieren
            _supReloadVerlauf(ticketId);
        })
        .subscribe();
    _supState.realtimeSub = channel;
}

async function _supReloadVerlauf(ticketId) {
    try {
        var isHqUser = window.sbProfile && window.sbProfile.is_hq;
        var q = _sb().from('support_ticket_kommentare')
            .select('*, users:autor_id(name, vorname, nachname, is_hq)')
            .eq('ticket_id', ticketId)
            .order('created_at', {ascending: true});
        if (!isHqUser) q = q.eq('is_internal', false);
        var resp = await q;
        var kommentare = resp.data || [];

        // DOM direkt aktualisieren ohne Modal-Reload
        var container = document.getElementById('supHqVerlaufContainer');
        if (!container) return;

        var topLevel = kommentare.filter(function(k) { return !k.parent_id; });
        var replies = {};
        kommentare.forEach(function(k) {
            if (k.parent_id) {
                if (!replies[k.parent_id]) replies[k.parent_id] = [];
                replies[k.parent_id].push(k);
            }
        });

        var html = '<h4 class="text-xs font-bold text-gray-500 uppercase mb-3">Verlauf (' + kommentare.length + ')</h4>';
        if (topLevel.length === 0) html += '<p class="text-sm text-gray-400 mb-4">Noch keine Kommentare.</p>';

        topLevel.forEach(function(k) {
            html += _supRenderKommentarHtml(k, false);
            var kReplies = replies[k.id] || [];
            kReplies.forEach(function(r) { html += _supRenderKommentarHtml(r, true); });
        });
        container.innerHTML = html;
    } catch(e) { console.warn('[sup realtime reload]', e); }
}

function _supRenderKommentarHtml(k, isReply) {
    var kd = new Date(k.created_at);
    var isHq = k.users && k.users.is_hq;
    var kName = k.users ? ((k.users.vorname || '') + ' ' + (k.users.nachname || '')).trim() || k.users.name || 'Unbekannt' : 'Unbekannt';
    var initials = kName.split(' ').map(function(w) { return w[0] || ''; }).join('').toUpperCase().substring(0, 2);
    var bgAvatar = k.is_internal ? 'bg-gray-500' : isHq ? 'bg-blue-500' : 'bg-orange-500';
    var bgCard = k.is_internal ? 'bg-yellow-50 border border-yellow-200' : isHq ? 'bg-blue-50 border border-blue-100' : 'bg-white border border-gray-100';
    var out = '<div class="' + (isReply ? 'ml-11 mt-2' : 'mb-3') + ' flex gap-3">';
    out += '<div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ' + bgAvatar + '">' + initials + '</div>';
    out += '<div class="flex-1 p-3 rounded-lg ' + bgCard + '">';
    out += '<div class="flex items-center justify-between mb-1">';
    out += '<span class="text-xs font-bold text-gray-700">' + _escH(kName);
    if (isHq) out += ' <span class="text-blue-500">HQ</span>';
    if (k.is_internal) out += ' <span class="text-yellow-600 text-xs bg-yellow-100 px-1 rounded">INTERN</span>';
    out += '</span>';
    out += '<span class="text-xs text-gray-400">' + kd.toLocaleDateString('de-DE') + ' ' + kd.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}) + '</span>';
    out += '</div>';
    var inhalt = _escH(k.inhalt).replace(/@(\w+)/g, '<strong class="text-blue-600">@$1</strong>');
    out += '<p class="text-sm text-gray-700 whitespace-pre-wrap">' + inhalt + '</p>';
    var safeKName2 = kName.replace(/'/g, '').replace(/"/g, ''); out += '<button onclick="supHqStartReply(\'' + k.id + '\',\'' + safeKName2 + '\')" class="mt-1 text-xs text-gray-400 hover:text-blue-500 transition-colors">↩ Antworten</button>';
    out += '</div></div>';
    return out;
}

// ========== HQ: Kommentar senden ==========
export async function supHqSendKommentar(ticketId) {
    var input = document.getElementById('supHqKommentarInput');
    if (!input || !input.value.trim()) { _showToast('Bitte Text eingeben', 'error'); return; }
    var isInternal = (document.getElementById('supHqInternalCheck') || {}).checked || false;
    var parentId = (document.getElementById('supHqParentId') || {}).value || null;
    var mentions = (input._mentions || []);

    try {
        var user = _sbUser();
        var insertData = {
            ticket_id: ticketId,
            autor_id: user ? user.id : null,
            inhalt: input.value.trim(),
            is_internal: isInternal,
            mentions: mentions
        };
        if (parentId) insertData.parent_id = parentId;
        var komResp = await _sb().from('support_ticket_kommentare').insert(insertData).select().single();
        if (komResp.error) throw komResp.error;

        // Datei-Upload
        var fileInput = document.getElementById('supHqKommentarFile');
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

        // Erste-Antwort + Auto-Status tracken
        var ticket = _supState.hqTickets.find(function(t) { return t.id === ticketId; });
        if (ticket && !isInternal) {
            var updates = {};
            if (!ticket.erste_antwort_at) updates.erste_antwort_at = new Date().toISOString();
            if (ticket.status === 'offen') updates.status = 'in_bearbeitung';
            if (Object.keys(updates).length > 0) {
                await _sb().from('support_tickets').update(updates).eq('id', ticketId);
            }
        }

        // Notification
        if (!isInternal) {
            try {
                var sess = await _sb().auth.getSession();
                var token = sess.data && sess.data.session ? sess.data.session.access_token : '';
                fetch(window.SUPABASE_URL + '/functions/v1/support-notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ event: 'neue_antwort_von_hq', ticket_id: ticketId, kommentar_id: komResp.data.id })
                }).catch(function(){});
            } catch(e) {}
        }

        // Input + Reply zurücksetzen
        input.value = '';
        if (input._mentions) input._mentions = [];
        supHqCancelReply();

        // Reload
        var ov = document.getElementById('supHqDetailOverlay');
        if (ov) ov.remove();
        _supState.hqLoaded = false;
        await loadHqTickets();
        await supHqOpenTicket(ticketId);

    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

// ======================================================================
// NEUES TICKET MODAL (Partner)
// ======================================================================
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
    html += '<button onclick="closeNewTicketModal()" class="text-gray-400 hover:text-gray-600 text-xl">&#10005;</button>';
    html += '</div>';
    html += '<div class="p-5">';

    // Betreff
    html += '<div class="mb-4">';
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">Betreff *</label>';
    html += '<input type="text" id="supNewBetreff" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-vit-orange focus:outline-none" placeholder="Kurz beschreiben, worum es geht..." oninput="supTriageDebounce()">';
    html += '<div id="supTriageResult" class="hidden mt-2"></div>';
    html += '<div id="supWissenResult" class="hidden mt-2"></div>';
    html += '</div>';

    // Kategorie + Prio
    html += '<div class="grid grid-cols-2 gap-3 mb-4">';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Kategorie *</label>';
    html += '<select id="supNewKat" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">';
    erstellKats.forEach(function(k) {
        html += '<option value="' + k + '">' + (KATEGORIE_LABELS[k] || k) + '</option>';
    });
    html += '</select></div>';
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

// KI-Triage
export function supTriageDebounce() {
    clearTimeout(_supState.triageTimeout);
    _supState.triageTimeout = setTimeout(supTriage, 500);
}

async function supTriage() {
    var betreff = (document.getElementById('supNewBetreff') || {}).value || '';
    if (betreff.length < 5) return;

    var resultEl = document.getElementById('supTriageResult');
    var wissenEl = document.getElementById('supWissenResult');

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
            if (data.kategorie && resultEl) {
                resultEl.classList.remove('hidden');
                resultEl.innerHTML = '<div class="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">'
                    + '<span class="text-xs text-blue-700">KI-Vorschlag: <strong>' + _escH(data.kategorie) + '</strong> - <strong>' + _escH(data.prioritaet) + '</strong></span>'
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
        woerter.forEach(function(w) {
            query = query.or('titel.ilike.%' + w + '%,inhalt.ilike.%' + w + '%');
        });
        var aResp = await query;
        if (aResp.data && aResp.data.length > 0 && wissenEl) {
            wissenEl.classList.remove('hidden');
            var wh = '<div class="p-2 bg-green-50 rounded-lg border border-green-100">';
            wh += '<p class="text-xs font-semibold text-green-800 mb-1">Koennte das helfen?</p>';
            aResp.data.forEach(function(a) {
                wh += '<div class="text-xs text-green-700 mb-1 cursor-pointer hover:underline" onclick="supShowArtikel(\'' + a.id + '\')">';
                wh += _escH(a.titel) + '</div>';
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
        var el = document.createElement('div');
        el.id = 'supArtikelOverlay';
        el.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] overflow-y-auto py-8';
        el.onclick = function(e) { if (e.target === el) el.remove(); };
        el.innerHTML = '<div class="bg-white rounded-xl w-full max-w-md mx-4 p-5 shadow-2xl" onclick="event.stopPropagation()">'
            + '<div class="flex items-center justify-between mb-3"><h3 class="font-bold text-gray-800">' + _escH(a.titel) + '</h3>'
            + '<button onclick="document.getElementById(\'supArtikelOverlay\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">&#10005;</button></div>'
            + '<div class="text-sm text-gray-700 whitespace-pre-wrap">' + _escH(a.inhalt) + '</div>'
            + '<div class="mt-4 flex justify-end"><button onclick="document.getElementById(\'supArtikelOverlay\').remove()" class="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Schliessen</button></div>'
            + '</div>';
        document.body.appendChild(el);
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

        // Datei-Upload
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

        // Notification
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

        _supState.loaded = false;
        await loadTickets();
        renderTickets();

    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Ticket erstellen'; }
    }
}

// ========== Kommentar senden (Partner) ==========
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

// ========== Legacy Compat ==========
export function showSupportTab(tab) { renderTickets(); }
export function filterTickets(f) { renderTickets(); }
export function submitTicketForm() { openNewTicketModal(); }
export function sendTicket() { openNewTicketModal(); }
export function changeTicketStatus() {}
export function addTicketComment() {}

// ========== Strangler Fig: window.* registration ==========
var _exports = {
    renderTickets: renderTickets,
    openTicketDetail: openTicketDetail,
    closeTicketDetail: closeTicketDetail,
    openNewTicketModal: openNewTicketModal,
    closeNewTicketModal: closeNewTicketModal,
    submitNewTicket: submitNewTicket,
    supFilterChanged: supFilterChanged,
    supTriageDebounce: supTriageDebounce,
    supApplyTriage: supApplyTriage,
    supShowArtikel: supShowArtikel,
    supSendKommentar: supSendKommentar,
    supDownloadAnhang: supDownloadAnhang,
    supSetCsat: supSetCsat,
    supSubmitCsat: supSubmitCsat,
    renderKontakte: renderKontakte,
    showSupportTab: showSupportTab,
    filterTickets: filterTickets,
    submitTicketForm: submitTicketForm,
    sendTicket: sendTicket,
    changeTicketStatus: changeTicketStatus,
    addTicketComment: addTicketComment,
    // v3 new
    supSwitchTab: supSwitchTab,
    supHistorySearch: supHistorySearch,
    supOpenZohoDetail: supOpenZohoDetail,
    supHqSearch: supHqSearchFn,
    supHqReload: supHqReload,
    supHqOpenTicket: supHqOpenTicket,
    supHqSaveStatus: supHqSaveStatus,
    supHqSavePrio: supHqSavePrio,
    supHqSaveAssignee: supHqSaveAssignee,
    supHqKiAntwort: supHqKiAntwort,
    supHqKiInAntwort: supHqKiInAntwort,
    supHqSendKommentar: supHqSendKommentar,
    supHqSaveAbteilung: supHqSaveAbteilung,
    supHqSaveAbsender: supHqSaveAbsender,
    supHqStartReply: supHqStartReply,
    supHqCancelReply: supHqCancelReply,
    supHqMentionInput: supHqMentionInput,
    supHqInsertMention: supHqInsertMention,
    supHqFilterStatusChanged: supHqFilterStatusChanged,
    supHqZohoSearchFn: supHqZohoSearchFn
};
Object.keys(_exports).forEach(function(k) { window[k] = _exports[k]; });
