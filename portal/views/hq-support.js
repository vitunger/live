/**
 * views/hq-support.js - HQ Support-Uebersicht & Ticket-Management
 *
 * KPI-Dashboard, Ticket-Verwaltung, Assignee, interne Kommentare, @Mentions,
 * Canned Responses, Wissensartikel-Review
 *
 * @module views/hq-support
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

var _hqSup = {
    tickets: [],
    hqUsers: [],
    cannedResponses: [],
    wissenArtikel: [],
    filterKat: '',
    filterStatus: '',
    filterAssignee: '',
    filterSearch: '',
    sortBy: 'created_at',
    sortDir: 'desc',
    loaded: false,
    currentTab: 'tickets'
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
    var elapsed = (now - created) / 3600000;
    var sla = ticket.sla_stunden || 48;
    var pct = Math.round((elapsed / sla) * 100);
    var color = pct < 50 ? 'text-green-500' : pct < 80 ? 'text-yellow-500' : 'text-red-500';
    var icon = pct < 50 ? '🟢' : pct < 80 ? '🟡' : '🔴';
    return { pct: pct, color: color, icon: icon };
}

// ========== Daten laden ==========
async function loadHqData() {
    try {
        // HQ-Rollen des eingeloggten Users laden für Abteilungs-Filter
        var profile = window.sbProfile || {};
        var rollenResp = await _sb().from('user_rollen').select('rolle_id, rollen:rolle_id(name)').eq('user_id', profile.id || '');
        var hqRollen = (rollenResp.data || []).map(function(r) { return r.rollen ? r.rollen.name : ''; }).filter(Boolean);
        _hqSup.hqUserRollen = hqRollen;
        var isAdmin = hqRollen.indexOf('hq_gf') !== -1 || hqRollen.indexOf('hq') !== -1 || hqRollen.indexOf('owner') !== -1;

        var ticketQuery = _sb().from('support_tickets')
            .select('*, users:erstellt_von(name, vorname, nachname, standort_id), assignee:assignee_id(name, vorname, nachname), standorte:standort_id(name)')
            .eq('zoho_fallback', false)
            .order('created_at', {ascending: false});

        // Abteilungs-Filter: nur eigene Abteilung(en) wenn nicht Admin
        if (!isAdmin && hqRollen.length > 0) {
            var abteilungen = hqRollen.filter(function(r) { return r.startsWith('hq_'); }).map(function(r) { return r.replace('hq_', ''); });
            if (abteilungen.length > 0) ticketQuery = ticketQuery.in('abteilung', abteilungen);
        }

        var [tResp, uResp, cResp, wResp] = await Promise.all([
            ticketQuery,
            _sb().from('users').select('id, email, name, vorname, nachname, is_hq').eq('status', 'aktiv').order('nachname'),
            _sb().from('support_canned_responses').select('*'),
            _sb().from('support_wissensartikel').select('*').order('created_at', {ascending: false})
        ]);
        _hqSup.tickets = tResp.data || [];
        _hqSup.hqUsers = uResp.data || [];
        _hqSup.cannedResponses = cResp.data || [];
        _hqSup.wissenArtikel = wResp.data || [];
        _hqSup.loaded = true;
    } catch(err) {
        console.error('[hq-support] loadHqData:', err);
    }
}

function getFilteredTickets() {
    return _hqSup.tickets.filter(function(t) {
        if (_hqSup.filterKat && t.kategorie !== _hqSup.filterKat) return false;
        if (_hqSup.filterStatus && t.status !== _hqSup.filterStatus) return false;
        if (_hqSup.filterAssignee) {
            if (_hqSup.filterAssignee === 'unassigned' && t.assignee_id) return false;
            if (_hqSup.filterAssignee !== 'unassigned' && t.assignee_id !== _hqSup.filterAssignee) return false;
        }
        if (_hqSup.filterSearch) {
            var q = _hqSup.filterSearch.toLowerCase();
            var match = (t.betreff || '').toLowerCase().indexOf(q) !== -1
                || (t.ticket_nr || '').toLowerCase().indexOf(q) !== -1
                || (t.beschreibung || '').toLowerCase().indexOf(q) !== -1;
            if (!match) return false;
        }
        return true;
    });
}

// ========== KPI-Berechnung ==========
function calcKpis() {
    var all = _hqSup.tickets;
    var offene = all.filter(function(t) { return t.status === 'offen'; }).length;
    var inBearbeitung = all.filter(function(t) { return t.status === 'in_bearbeitung'; }).length;
    var wartend = all.filter(function(t) { return t.status === 'wartend_auf_partner'; }).length;

    // Diesen Monat geloest
    var now = new Date();
    var monatsStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var geloestMonat = all.filter(function(t) {
        return (t.status === 'geloest' || t.status === 'geschlossen') && new Date(t.geloest_at || t.updated_at) >= monatsStart;
    }).length;

    // Durchschnittliche Erstantwortzeit
    var antwortZeiten = all.filter(function(t) { return t.erste_antwort_at; }).map(function(t) {
        return (new Date(t.erste_antwort_at).getTime() - new Date(t.created_at).getTime()) / 3600000;
    });
    var avgAntwort = antwortZeiten.length > 0 ? (antwortZeiten.reduce(function(a,b){return a+b;},0) / antwortZeiten.length).toFixed(1) : '-';

    // SLA-Quote
    var slaRelevant = all.filter(function(t) { return t.status === 'geloest' || t.status === 'geschlossen'; });
    var slaOk = slaRelevant.filter(function(t) {
        if (!t.erste_antwort_at) return false;
        var h = (new Date(t.erste_antwort_at).getTime() - new Date(t.created_at).getTime()) / 3600000;
        return h <= (t.sla_stunden || 48);
    }).length;
    var slaQuote = slaRelevant.length > 0 ? Math.round((slaOk / slaRelevant.length) * 100) : '-';

    // CSAT
    var csatTickets = all.filter(function(t) { return t.csat_bewertung; });
    var avgCsat = csatTickets.length > 0 ? (csatTickets.reduce(function(a,t){return a+t.csat_bewertung;},0) / csatTickets.length).toFixed(1) : '-';

    // Unassigned
    var unassigned = all.filter(function(t) { return !t.assignee_id && (t.status === 'offen' || t.status === 'in_bearbeitung'); }).length;

    // Kritisch offen
    var kritisch = all.filter(function(t) { return t.prioritaet === 'kritisch' && t.status !== 'geloest' && t.status !== 'geschlossen'; }).length;

    return { offene: offene, inBearbeitung: inBearbeitung, wartend: wartend, geloestMonat: geloestMonat, avgAntwort: avgAntwort, slaQuote: slaQuote, avgCsat: avgCsat, unassigned: unassigned, kritisch: kritisch };
}

// ========== RENDER: Haupt-Ansicht ==========
export async function renderHqSupport() {
    var container = document.getElementById('hqSupportView');
    if (!container) return;

    if (!_hqSup.loaded) {
        container.innerHTML = '<div class="flex items-center justify-center py-12"><div class="animate-spin w-6 h-6 border-2 border-vit-orange border-t-transparent rounded-full mr-3"></div><span class="text-gray-500">Support-Dashboard wird geladen...</span></div>';
        await loadHqData();
    }

    var kpi = calcKpis();
    var h = '';

    // Header
    h += '<div class="flex items-center justify-between mb-6">';
    h += '<div><h1 class="h1-headline text-gray-800">SUPPORT – HQ</h1>';
    h += '<p class="text-sm text-gray-500">Alle Tickets, SLA, Zuweisungen & Wissensartikel</p></div>';
    h += '<div class="flex gap-2">';
    h += '<button onclick="hqSupShowTab(\'wissen\')" class="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 ' + (_hqSup.currentTab === 'wissen' ? 'bg-gray-100 font-semibold' : '') + '">📚 Wissensartikel</button>';
    h += '<button onclick="hqSupShowTab(\'tickets\')" class="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 ' + (_hqSup.currentTab === 'tickets' ? 'bg-gray-100 font-semibold' : '') + '">🎫 Tickets</button>';
    h += '<button onclick="hqSupCreateTicket()" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">+ Ticket erstellen</button>';
    h += '</div></div>';

    // KPI Kacheln
    h += '<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">';
    h += kpiCard(kpi.offene, 'Offen', 'text-yellow-600');
    h += kpiCard(kpi.inBearbeitung, 'In Bearbeitung', 'text-blue-600');
    h += kpiCard(kpi.wartend, 'Wartend', 'text-purple-600');
    h += kpiCard(kpi.geloestMonat, 'Geloest (Monat)', 'text-green-600');
    h += kpiCard(kpi.avgAntwort + (kpi.avgAntwort !== '-' ? 'h' : ''), 'Ø Erstantwort', 'text-blue-500');
    h += kpiCard(kpi.slaQuote + (kpi.slaQuote !== '-' ? '%' : ''), 'SLA-Quote', kpi.slaQuote !== '-' && kpi.slaQuote < 80 ? 'text-red-600' : 'text-green-600');
    h += kpiCard(kpi.avgCsat + (kpi.avgCsat !== '-' ? ' ★' : ''), 'Ø CSAT', 'text-yellow-500');
    h += kpiCard(kpi.unassigned, 'Nicht zugewiesen', kpi.unassigned > 0 ? 'text-red-600' : 'text-gray-500');
    h += '</div>';

    // Kritisch-Banner
    if (kpi.kritisch > 0) {
        h += '<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">';
        h += '<span class="text-lg">🔴</span>';
        h += '<span class="text-sm font-semibold text-red-700">' + kpi.kritisch + ' kritische Ticket' + (kpi.kritisch !== 1 ? 's' : '') + ' erfordern sofortige Aufmerksamkeit!</span>';
        h += '</div>';
    }

    if (_hqSup.currentTab === 'wissen') {
        h += renderWissenTab();
    } else {
        h += renderTicketsTab();
    }

    container.innerHTML = h;
}

function kpiCard(val, label, colorClass) {
    return '<div class="vit-card p-3 text-center"><p class="text-xl font-bold ' + colorClass + '">' + val + '</p><p class="text-[10px] text-gray-500 mt-0.5">' + label + '</p></div>';
}

// ========== Tab: Tickets ==========
function renderTicketsTab() {
    var tickets = getFilteredTickets();
    var h = '';

    // Filter-Zeile
    h += '<div class="flex flex-wrap items-center gap-3 mb-4">';
    h += '<input type="text" id="hqSupSearch" oninput="hqSupFilterChanged()" class="text-sm border border-gray-300 rounded-lg px-3 py-2 w-48" placeholder="Suche..." value="' + _escH(_hqSup.filterSearch) + '">';
    h += '<select id="hqSupFilterKat" onchange="hqSupFilterChanged()" class="text-sm border border-gray-300 rounded-lg px-3 py-2">';
    h += '<option value="">Alle Kategorien</option>';
    ALLE_KATEGORIEN.forEach(function(k) {
        h += '<option value="' + k + '"' + (_hqSup.filterKat === k ? ' selected' : '') + '>' + (KAT_ICONS[k]||'') + ' ' + k + '</option>';
    });
    h += '</select>';
    h += '<select id="hqSupFilterStatus" onchange="hqSupFilterChanged()" class="text-sm border border-gray-300 rounded-lg px-3 py-2">';
    h += '<option value="">Alle Status</option>';
    Object.keys(STATUS_LABELS).forEach(function(s) {
        h += '<option value="' + s + '"' + (_hqSup.filterStatus === s ? ' selected' : '') + '>' + STATUS_LABELS[s] + '</option>';
    });
    h += '</select>';
    h += '<select id="hqSupFilterAssignee" onchange="hqSupFilterChanged()" class="text-sm border border-gray-300 rounded-lg px-3 py-2">';
    h += '<option value="">Alle Zuweisungen</option>';
    h += '<option value="unassigned"' + (_hqSup.filterAssignee === 'unassigned' ? ' selected' : '') + '>Nicht zugewiesen</option>';
    _hqSup.hqUsers.forEach(function(u) {
        var name = ((u.vorname || '') + ' ' + (u.nachname || '')).trim() || u.name || u.id.slice(0,8);
        h += '<option value="' + u.id + '"' + (_hqSup.filterAssignee === u.id ? ' selected' : '') + '>' + _escH(name) + '</option>';
    });
    h += '</select>';
    h += '<span class="text-xs text-gray-400">' + tickets.length + ' von ' + _hqSup.tickets.length + ' Tickets</span>';
    h += '</div>';

    // Ticket-Tabelle
    if (tickets.length === 0) {
        h += '<div class="text-center py-12"><div class="text-5xl mb-3">🎫</div>';
        h += '<p class="text-gray-500 font-semibold">Keine Tickets gefunden</p></div>';
    } else {
        h += '<div class="overflow-x-auto"><table class="w-full text-sm">';
        h += '<thead><tr class="text-left text-xs text-gray-500 border-b border-gray-200">';
        h += '<th class="pb-2 pr-2">SLA</th>';
        h += '<th class="pb-2 pr-2">Ticket</th>';
        h += '<th class="pb-2 pr-2">Betreff</th>';
        h += '<th class="pb-2 pr-2">Standort</th>';
        h += '<th class="pb-2 pr-2">Kategorie</th>';
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
            h += '<tr class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="hqSupOpenDetail(\'' + t.id + '\')">';
            h += '<td class="py-2.5 pr-2">' + (sla.icon || '-') + '</td>';
            h += '<td class="py-2.5 pr-2 font-mono text-xs text-gray-400">' + _escH(t.ticket_nr || '') + '</td>';
            h += '<td class="py-2.5 pr-2 font-semibold text-gray-800 max-w-[200px] truncate">' + _escH(t.betreff) + '</td>';
            h += '<td class="py-2.5 pr-2 text-xs text-gray-600">' + _escH(standortName) + '</td>';
            h += '<td class="py-2.5 pr-2"><span class="text-xs rounded px-1.5 py-0.5 bg-gray-100 text-gray-600">' + (KAT_ICONS[t.kategorie] || '') + ' ' + _escH(t.kategorie || '') + '</span></td>';
            h += '<td class="py-2.5 pr-2"><span class="text-xs font-semibold rounded px-2 py-0.5 ' + (STATUS_COLORS[t.status] || '') + '">' + (STATUS_LABELS[t.status] || t.status) + '</span></td>';
            h += '<td class="py-2.5 pr-2"><span class="text-xs font-semibold rounded px-2 py-0.5 ' + (PRIO_COLORS[t.prioritaet] || '') + '">' + (PRIO_LABELS[t.prioritaet] || t.prioritaet) + '</span></td>';
            h += '<td class="py-2.5 pr-2 text-xs text-gray-600">' + (assigneeName ? _escH(assigneeName) : '<span class="text-red-400">—</span>') + '</td>';
            h += '<td class="py-2.5 text-xs text-gray-400 whitespace-nowrap">' + d.toLocaleDateString('de-DE') + '</td>';
            h += '</tr>';
        });
        h += '</tbody></table></div>';
    }
    return h;
}

// ========== Tab: Wissensartikel ==========
function renderWissenTab() {
    var h = '';
    h += '<div class="flex items-center justify-between mb-4">';
    h += '<h2 class="text-sm font-bold text-gray-600 uppercase">Wissensartikel (' + _hqSup.wissenArtikel.length + ')</h2>';
    h += '<button onclick="hqSupNewArtikel()" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-xs font-semibold hover:opacity-90">+ Neuer Artikel</button>';
    h += '</div>';

    var statusFilter = {entwurf: [], review: [], publiziert: [], archiviert: []};
    _hqSup.wissenArtikel.forEach(function(a) { if (statusFilter[a.status]) statusFilter[a.status].push(a); });

    // Review-Queue zuerst
    if (statusFilter.review.length > 0) {
        h += '<div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">';
        h += '<p class="text-xs font-semibold text-yellow-700 mb-2">⏳ Warten auf Review (' + statusFilter.review.length + ')</p>';
        statusFilter.review.forEach(function(a) {
            h += '<div class="flex items-center justify-between py-1">';
            h += '<span class="text-sm text-gray-700">' + _escH(a.titel) + (a.ki_generiert ? ' <span class="text-[10px] bg-blue-100 text-blue-600 rounded px-1">KI</span>' : '') + '</span>';
            h += '<div class="flex gap-1">';
            h += '<button onclick="hqSupArtikelStatus(\'' + a.id + '\',\'publiziert\')" class="text-[10px] px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600">Freigeben</button>';
            h += '<button onclick="hqSupArtikelStatus(\'' + a.id + '\',\'archiviert\')" class="text-[10px] px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Archivieren</button>';
            h += '</div></div>';
        });
        h += '</div>';
    }

    // Alle Artikel als Tabelle
    h += '<div class="overflow-x-auto"><table class="w-full text-sm">';
    h += '<thead><tr class="text-left text-xs text-gray-500 border-b border-gray-200">';
    h += '<th class="pb-2 pr-2">Titel</th><th class="pb-2 pr-2">Kategorie</th><th class="pb-2 pr-2">Status</th><th class="pb-2 pr-2">Views</th><th class="pb-2 pr-2">Hilfreich</th><th class="pb-2">Erstellt</th>';
    h += '</tr></thead><tbody>';
    _hqSup.wissenArtikel.forEach(function(a) {
        var d = new Date(a.created_at);
        var stCol = a.status === 'publiziert' ? 'bg-green-100 text-green-700' : a.status === 'review' ? 'bg-yellow-100 text-yellow-700' : a.status === 'entwurf' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-600';
        h += '<tr class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="hqSupEditArtikel(\'' + a.id + '\')">';
        h += '<td class="py-2 pr-2 font-semibold text-gray-800">' + _escH(a.titel) + (a.ki_generiert ? ' <span class="text-[10px] bg-blue-100 text-blue-600 rounded px-1">KI</span>' : '') + '</td>';
        h += '<td class="py-2 pr-2 text-xs text-gray-500">' + _escH(a.kategorie || '-') + '</td>';
        h += '<td class="py-2 pr-2"><span class="text-xs rounded px-2 py-0.5 ' + stCol + '">' + _escH(a.status) + '</span></td>';
        h += '<td class="py-2 pr-2 text-xs text-gray-500">' + (a.views || 0) + '</td>';
        h += '<td class="py-2 pr-2 text-xs text-gray-500">👍 ' + (a.hilfreich || 0) + ' / 👎 ' + (a.nicht_hilfreich || 0) + '</td>';
        h += '<td class="py-2 text-xs text-gray-400">' + d.toLocaleDateString('de-DE') + '</td>';
        h += '</tr>';
    });
    h += '</tbody></table></div>';
    return h;
}

// ========== Tab-Switch ==========
export function hqSupShowTab(tab) {
    _hqSup.currentTab = tab;
    renderHqSupport();
}

// ========== Filter ==========
export function hqSupFilterChanged() {
    _hqSup.filterSearch = (document.getElementById('hqSupSearch') || {}).value || '';
    _hqSup.filterKat = (document.getElementById('hqSupFilterKat') || {}).value || '';
    _hqSup.filterStatus = (document.getElementById('hqSupFilterStatus') || {}).value || '';
    _hqSup.filterAssignee = (document.getElementById('hqSupFilterAssignee') || {}).value || '';
    renderHqSupport();
}

// ========== Ticket-Detail (HQ) ==========
export async function hqSupOpenDetail(ticketId) {
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
        el.id = 'hqSupDetailOverlay';
        el.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-4';
        el.onclick = function(e) { if (e.target === el) hqSupCloseDetail(); };

        var html = '<div class="bg-white rounded-xl w-full max-w-3xl mx-4 shadow-2xl flex flex-col max-h-[92vh]" onclick="event.stopPropagation()">';

        // ── Header ──
        html += '<div class="p-5 border-b border-gray-100 flex-shrink-0">';
        html += '<div class="flex items-center justify-between mb-2">';
        html += '<div class="flex items-center gap-2 flex-wrap">';
        html += '<span class="text-xs font-mono text-gray-400">' + _escH(t.ticket_nr || '') + '</span>';
        html += '<span class="text-xs font-semibold rounded px-2 py-0.5 ' + (STATUS_COLORS[t.status] || '') + '">' + (STATUS_LABELS[t.status] || t.status) + '</span>';
        html += '<span class="text-xs font-semibold rounded px-2 py-0.5 ' + (PRIO_COLORS[t.prioritaet] || '') + '">' + (PRIO_LABELS[t.prioritaet] || t.prioritaet) + '</span>';
        html += '<span class="text-xs rounded px-1.5 py-0.5 bg-gray-100 text-gray-600">' + (KAT_ICONS[t.kategorie] || '') + ' ' + _escH(t.kategorie || '') + '</span>';
        if (sla.icon) html += '<span class="text-xs" title="SLA: ' + sla.pct + '%">' + sla.icon + ' ' + sla.pct + '%</span>';
        html += '</div>';
        html += '<button onclick="hqSupCloseDetail()" class="text-gray-400 hover:text-gray-600 text-xl ml-2">✕</button>';
        html += '</div>';
        html += '<h3 class="font-bold text-gray-800 text-lg">' + _escH(t.betreff) + '</h3>';
        html += '<p class="text-xs text-gray-400 mt-1">Von ' + _escH(erstellerName) + ' · ' + _escH(standortName) + ' · ' + d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}) + '</p>';
        html += '</div>';

        // ── Steuerungsleiste ──
        html += '<div class="p-4 border-b border-gray-100 flex-shrink-0 flex flex-wrap items-center gap-3 bg-gray-50">';

        // Status-Aenderung
        html += '<div class="flex items-center gap-1">';
        html += '<label class="text-xs text-gray-500">Status:</label>';
        html += '<select id="hqSupDetailStatus" class="text-xs border border-gray-300 rounded px-2 py-1">';
        Object.keys(STATUS_LABELS).forEach(function(s) {
            html += '<option value="' + s + '"' + (t.status === s ? ' selected' : '') + '>' + STATUS_LABELS[s] + '</option>';
        });
        html += '</select>';
        html += '<button onclick="hqSupUpdateStatus(\'' + ticketId + '\')" class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Setzen</button>';
        html += '</div>';

        // Assignee
        html += '<div class="flex items-center gap-1">';
        html += '<label class="text-xs text-gray-500">Assignee:</label>';
        html += '<select id="hqSupDetailAssignee" class="text-xs border border-gray-300 rounded px-2 py-1">';
        html += '<option value="">Nicht zugewiesen</option>';
        _hqSup.hqUsers.forEach(function(u) {
            var name = ((u.vorname || '') + ' ' + (u.nachname || '')).trim() || u.name || u.id.slice(0,8);
            html += '<option value="' + u.id + '"' + (t.assignee_id === u.id ? ' selected' : '') + '>' + _escH(name) + '</option>';
        });
        html += '</select>';
        html += '<button onclick="hqSupUpdateAssignee(\'' + ticketId + '\')" class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Zuweisen</button>';
        html += '</div>';

        // Prioritaet
        html += '<div class="flex items-center gap-1">';
        html += '<label class="text-xs text-gray-500">Prio:</label>';
        html += '<select id="hqSupDetailPrio" class="text-xs border border-gray-300 rounded px-2 py-1">';
        ['niedrig','mittel','kritisch'].forEach(function(p) {
            html += '<option value="' + p + '"' + (t.prioritaet === p ? ' selected' : '') + '>' + PRIO_LABELS[p] + '</option>';
        });
        html += '</select>';
        html += '<button onclick="hqSupUpdatePrio(\'' + ticketId + '\')" class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Setzen</button>';
        html += '</div>';

        // Abteilung
        html += '<div class="flex items-center gap-1">';
        html += '<label class="text-xs text-gray-500">Abt.:</label>';
        html += '<select id="hqSupDetailAbteilung" class="text-xs border border-gray-300 rounded px-2 py-1">';
        html += '<option value="gf"' + (t.abteilung === "gf" ? ' selected' : '') + '>Geschäftsführung</option>';html += '<option value="sales"' + (t.abteilung === "sales" ? ' selected' : '') + '>Sales</option>';html += '<option value="marketing"' + (t.abteilung === "marketing" ? ' selected' : '') + '>Marketing</option>';html += '<option value="einkauf"' + (t.abteilung === "einkauf" ? ' selected' : '') + '>Einkauf</option>';html += '<option value="support"' + (t.abteilung === "support" ? ' selected' : '') + '>Support</option>';html += '<option value="akademie"' + (t.abteilung === "akademie" ? ' selected' : '') + '>Akademie</option>';html += '<option value="hr"' + (t.abteilung === "hr" ? ' selected' : '') + '>HR</option>';html += '<option value="it"' + (t.abteilung === "it" ? ' selected' : '') + '>IT</option>';
        html += '</select>';
        html += '<button onclick="hqSupUpdateAbteilung(\'' + ticketId + '\')" class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Setzen</button>';
        html += '</div>';

        // Absender (Suchfeld mit Autocomplete)
        var absenderUser = _hqSup.hqUsers.find(function(u) { return u.id === t.erstellt_von; });
        var absenderName = absenderUser ? ((absenderUser.vorname||'') + ' ' + (absenderUser.nachname||'')).trim() : (t.absender_email || '');
        html += '<div class="flex items-center gap-1 relative">';
        html += '<label class="text-xs text-gray-500">Absender:</label>';
        html += '<div class="relative">';
        html += '<input id="hqSupAbsenderSearch" type="text" value="' + _escH(absenderName) + '" placeholder="Name suchen..." autocomplete="off" oninput="hqSupAbsenderFilter()" class="text-xs border border-gray-300 rounded px-2 py-1 w-40">';
        html += '<input type="hidden" id="hqSupAbsenderVal" value="' + _escH(t.erstellt_von || '') + '">';
        html += '<div id="hqSupAbsenderDrop" class="hidden absolute top-6 left-0 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-48 overflow-y-auto w-52">';
        _hqSup.hqUsers.forEach(function(u) {
            var name = ((u.vorname||'') + ' ' + (u.nachname||'')).trim() || u.email || '';
            var badge = u.is_hq ? ' <span class=\"text-[9px] text-orange-500\">(HQ)</span>' : '';
            html += '<div onclick="hqSupAbsenderPick(\'' + u.id + '\',\'' + name.replace(/'/g,'\'') + '\')" class="px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer">' + _escH(name) + badge + '</div>';
        });
        html += '</div></div>';
        html += '<button onclick="hqSupUpdateAbsender(\'' + ticketId + '\')" class="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600">OK</button>';
        html += '</div>';

        // KI-Antwort
        html += '<button onclick="hqSupKiAntwort(\'' + ticketId + '\')" class="text-xs px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 ml-auto">🤖 KI-Antwort</button>';
        html += '</div>';

        // ── Body (scrollbar) ──
        html += '<div class="flex-1 overflow-y-auto p-5">';

        // Beschreibung
        html += '<div class="bg-gray-50 rounded-lg p-4 mb-4">';
        html += '<p class="text-sm text-gray-700 whitespace-pre-wrap">' + _escH(t.beschreibung || '') + '</p>';
        html += '</div>';

        // Anhaenge
        if (anhaenge.length > 0) {
            html += '<div class="mb-4"><p class="text-xs font-semibold text-gray-500 mb-1">Anhaenge</p>';
            anhaenge.forEach(function(a) {
                html += '<a href="#" onclick="hqSupDownload(\'' + _escH(a.storage_path) + '\', \'' + _escH(a.dateiname) + '\'); return false;" class="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mr-3">📎 ' + _escH(a.dateiname) + '</a>';
            });
            html += '</div>';
        }

        // CSAT (wenn vorhanden)
        if (t.csat_bewertung) {
            html += '<div class="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg">';
            html += '<p class="text-xs font-semibold text-green-700">Partner-Bewertung: ';
            for (var s = 1; s <= 5; s++) html += '<span class="' + (s <= t.csat_bewertung ? 'text-yellow-400' : 'text-gray-300') + '">★</span>';
            html += ' (' + t.csat_bewertung + '/5)</p>';
            if (t.csat_kommentar) html += '<p class="text-xs text-green-600 mt-1">"' + _escH(t.csat_kommentar) + '"</p>';
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
            html += '<div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ' + (k.is_internal ? 'bg-gray-500' : isHq ? 'bg-blue-500' : 'bg-orange-500') + '">' + initials + '</div>';
            html += '<div class="flex-1 p-3 rounded-lg ' + (k.is_internal ? 'bg-yellow-50 border border-yellow-200' : isHq ? 'bg-blue-50 border border-blue-100' : 'bg-white border border-gray-100') + '">';
            html += '<div class="flex items-center justify-between mb-1">';
            html += '<span class="text-xs font-bold text-gray-700">' + _escH(kName) + (isHq ? ' <span class="text-blue-500">HQ</span>' : '') + (k.is_internal ? ' <span class="text-yellow-600 text-[10px]">INTERN</span>' : '') + '</span>';
            html += '<span class="text-[10px] text-gray-400">' + kd.toLocaleDateString('de-DE') + ' ' + kd.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'}) + '</span>';
            html += '</div>';
            // Render @mentions in bold
            var inhalt = _escH(k.inhalt).replace(/@(\w+)/g, '<strong class="text-blue-600">@$1</strong>');
            html += '<p class="text-sm text-gray-700 whitespace-pre-wrap">' + inhalt + '</p>';
            html += '</div></div>';
        });

        // Antwort-Box
        html += '<div class="mt-4 border-t border-gray-100 pt-4">';
        // Canned Responses Dropdown
        if (_hqSup.cannedResponses.length > 0) {
            html += '<div class="mb-2 flex items-center gap-2">';
            html += '<select id="hqSupCanned" class="text-xs border border-gray-300 rounded px-2 py-1 flex-1">';
            html += '<option value="">Textbaustein einfuegen...</option>';
            _hqSup.cannedResponses.forEach(function(c) {
                html += '<option value="' + _escH(c.inhalt) + '">' + _escH(c.titel) + (c.kategorie ? ' (' + c.kategorie + ')' : '') + '</option>';
            });
            html += '</select>';
            html += '<button onclick="hqSupInsertCanned()" class="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Einfuegen</button>';
            html += '</div>';
        }
        html += '<textarea id="hqSupKommentarInput" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:border-vit-orange focus:outline-none" placeholder="Antwort schreiben... @Name fuer Erwaehnung"></textarea>';
        html += '<div class="flex items-center justify-between mt-2">';
        html += '<div class="flex items-center gap-3">';
        html += '<input type="file" id="hqSupKommentarFile" class="text-xs text-gray-500">';
        html += '<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">';
        html += '<input type="checkbox" id="hqSupInternalCheck"> Interne Notiz</label>';
        html += '</div>';
        html += '<button onclick="hqSupSendKommentar(\'' + ticketId + '\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">Senden</button>';
        html += '</div></div>';

        // Audit-Log
        if (logs.length > 0) {
            html += '<div class="mt-6 border-t border-gray-100 pt-4">';
            html += '<h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Audit-Log</h4>';
            logs.forEach(function(l) {
                var ld = new Date(l.created_at);
                var lName = l.users ? ((l.users.vorname || '') + ' ' + (l.users.nachname || '')).trim() || l.users.name || '' : 'System';
                html += '<div class="text-[10px] text-gray-400 mb-1">';
                html += ld.toLocaleDateString('de-DE') + ' ' + ld.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'});
                html += ' · ' + _escH(lName) + ' · ' + _escH(l.aktion);
                if (l.alt_wert || l.neu_wert) html += ': ' + _escH(l.alt_wert || '') + ' → ' + _escH(l.neu_wert || '');
                html += '</div>';
            });
            html += '</div>';
        }

        html += '</div>'; // body
        html += '</div>'; // modal

        el.innerHTML = html;
        document.body.appendChild(el);

        // KI-Antwort automatisch vorausfüllen (im Hintergrund)
        setTimeout(async function() {
            try {
                var sess = await _sb().auth.getSession();
                var token = sess.data && sess.data.session ? sess.data.session.access_token : '';
                var resp = await fetch(window.SUPABASE_URL + '/functions/v1/support-ki-antwort', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ ticket_id: ticketId })
                });
                if (resp.ok) {
                    var data = await resp.json();
                    if (data.antwort) {
                        var textarea = document.getElementById('hqSupKommentarInput');
                        if (textarea && !textarea.value) {
                            textarea.value = data.antwort;
                            textarea.style.borderColor = '#a855f7';
                            setTimeout(function() { textarea.style.borderColor = ''; }, 2000);
                        }
                    }
                }
            } catch(e) { /* silent fail */ }
        }, 100);

    } catch(err) {
        console.error('[hq-support] openDetail:', err);
        _showToast('Fehler beim Laden des Tickets', 'error');
    }
}

export function hqSupCloseDetail() {
    var el = document.getElementById('hqSupDetailOverlay');
    if (el) el.remove();
}

// ========== Status/Assignee/Prio Update ==========
export async function hqSupUpdateStatus(ticketId) {
    var val = (document.getElementById('hqSupDetailStatus') || {}).value;
    if (!val) return;
    try {
        var user = _sbUser();
        var ticket = _hqSup.tickets.find(function(t) { return t.id === ticketId; });
        var altStatus = ticket ? ticket.status : '';
        var update = { status: val };
        if (val === 'geloest') update.geloest_at = new Date().toISOString();
        if (val === 'in_bearbeitung' && !ticket.erste_antwort_at) update.erste_antwort_at = new Date().toISOString();

        await _sb().from('support_tickets').update(update).eq('id', ticketId);
        await _sb().from('support_ticket_log').insert({ ticket_id: ticketId, user_id: user ? user.id : null, aktion: 'status_geaendert', alt_wert: altStatus, neu_wert: val });

        // Notification bei geloest
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
        hqSupCloseDetail();
        _hqSup.loaded = false;
        await loadHqData();
        renderHqSupport();
    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

export async function hqSupUpdateAssignee(ticketId) {
    var val = (document.getElementById('hqSupDetailAssignee') || {}).value || null;
    try {
        var user = _sbUser();
        await _sb().from('support_tickets').update({ assignee_id: val }).eq('id', ticketId);
        var assigneeName = val ? (_hqSup.hqUsers.find(function(u) { return u.id === val; }) || {}).vorname || 'HQ-User' : 'niemand';
        await _sb().from('support_ticket_log').insert({ ticket_id: ticketId, user_id: user ? user.id : null, aktion: 'assignee_geaendert', neu_wert: assigneeName });
        _showToast('Zugewiesen an: ' + assigneeName, 'success');
        hqSupCloseDetail();
        _hqSup.loaded = false;
        await loadHqData();
        renderHqSupport();
    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

export async function hqSupUpdatePrio(ticketId) {
    var val = (document.getElementById('hqSupDetailPrio') || {}).value;
    if (!val) return;
    try {
        var user = _sbUser();
        var ticket = _hqSup.tickets.find(function(t) { return t.id === ticketId; });
        await _sb().from('support_tickets').update({ prioritaet: val }).eq('id', ticketId);
        await _sb().from('support_ticket_log').insert({ ticket_id: ticketId, user_id: user ? user.id : null, aktion: 'prioritaet_geaendert', alt_wert: ticket ? ticket.prioritaet : '', neu_wert: val });
        _showToast('Prioritaet: ' + PRIO_LABELS[val], 'success');
        hqSupCloseDetail();
        _hqSup.loaded = false;
        await loadHqData();
        renderHqSupport();
    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

// ========== Kommentar senden (HQ) ==========
export async function hqSupSendKommentar(ticketId) {
    var input = document.getElementById('hqSupKommentarInput');
    if (!input || !input.value.trim()) { _showToast('Bitte Text eingeben', 'error'); return; }

    var isInternal = (document.getElementById('hqSupInternalCheck') || {}).checked || false;

    try {
        var user = _sbUser();

        // @Mentions extrahieren
        var mentionNames = [];
        var mentionRegex = /@(\w+)/g;
        var match;
        while ((match = mentionRegex.exec(input.value)) !== null) {
            mentionNames.push(match[1]);
        }

        // Mention-IDs finden
        var mentionIds = [];
        if (mentionNames.length > 0) {
            _hqSup.hqUsers.forEach(function(u) {
                var name = ((u.vorname || '') + ' ' + (u.nachname || '')).trim() || u.name || '';
                mentionNames.forEach(function(mn) {
                    if (name.toLowerCase().indexOf(mn.toLowerCase()) !== -1) {
                        mentionIds.push(u.id);
                    }
                });
            });
        }

        var komResp = await _sb().from('support_ticket_kommentare').insert({
            ticket_id: ticketId,
            autor_id: user ? user.id : null,
            inhalt: input.value.trim(),
            is_internal: isInternal,
            mentions: mentionIds
        }).select().single();
        if (komResp.error) throw komResp.error;

        // Datei-Upload
        var fileInput = document.getElementById('hqSupKommentarFile');
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

        // Erste-Antwort tracken
        var ticket = _hqSup.tickets.find(function(t) { return t.id === ticketId; });
        if (ticket && !ticket.erste_antwort_at && !isInternal) {
            await _sb().from('support_tickets').update({ erste_antwort_at: new Date().toISOString() }).eq('id', ticketId);
        }

        // Status auf in_bearbeitung setzen wenn noch offen
        if (ticket && ticket.status === 'offen' && !isInternal) {
            await _sb().from('support_tickets').update({ status: 'in_bearbeitung' }).eq('id', ticketId);
        }

        // Notifications
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

        // @Mention Notification
        if (mentionIds.length > 0) {
            try {
                var sess2 = await _sb().auth.getSession();
                var token2 = sess2.data && sess2.data.session ? sess2.data.session.access_token : '';
                fetch(window.SUPABASE_URL + '/functions/v1/support-notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token2 },
                    body: JSON.stringify({ event: 'mention', ticket_id: ticketId, kommentar_id: komResp.data.id, mentions: mentionIds })
                }).catch(function(){});
            } catch(e) {}
        }

        // Reload Detail
        hqSupCloseDetail();
        _hqSup.loaded = false;
        await loadHqData();
        await hqSupOpenDetail(ticketId);

    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

// ========== Canned Response einfuegen ==========
export function hqSupInsertCanned() {
    var select = document.getElementById('hqSupCanned');
    var textarea = document.getElementById('hqSupKommentarInput');
    if (select && textarea && select.value) {
        textarea.value = (textarea.value ? textarea.value + '\n\n' : '') + select.value;
        select.value = '';
    }
}

// ========== Absender Autocomplete ==========
export function hqSupAbsenderFilter() {
    var q = (document.getElementById('hqSupAbsenderSearch') || {}).value || '';
    var drop = document.getElementById('hqSupAbsenderDrop');
    if (!drop) return;
    if (q.length < 1) { drop.classList.add('hidden'); return; }
    q = q.toLowerCase();
    var items = drop.querySelectorAll('div');
    var any = false;
    items.forEach(function(el) {
        var match = el.textContent.toLowerCase().includes(q);
        el.style.display = match ? '' : 'none';
        if (match) any = true;
    });
    drop.classList.toggle('hidden', !any);
}

export function hqSupAbsenderPick(userId, name) {
    var inp = document.getElementById('hqSupAbsenderSearch');
    var val = document.getElementById('hqSupAbsenderVal');
    var drop = document.getElementById('hqSupAbsenderDrop');
    if (inp) inp.value = name;
    if (val) val.value = userId;
    if (drop) drop.classList.add('hidden');
}

// ========== Abteilung ändern ==========
export async function hqSupUpdateAbteilung(ticketId) {
    var val = (document.getElementById('hqSupDetailAbteilung') || {}).value;
    if (!val) return;
    try {
        var user = _sbUser();
        var ticket = _hqSup.tickets.find(function(t) { return t.id === ticketId; });
        await _sb().from('support_tickets').update({ abteilung: val }).eq('id', ticketId);
        await _sb().from('support_ticket_log').insert({ ticket_id: ticketId, user_id: user ? user.id : null, aktion: 'abteilung_geaendert', alt_wert: ticket ? ticket.abteilung : '', neu_wert: val });
        _showToast('Abteilung: ' + val, 'success');
        var ov = document.getElementById('hqSupDetailOverlay');
        if (ov) ov.remove();
        _hqSup.loaded = false;
        await loadHqData();
        renderHqSupport();
    } catch(err) { _showToast('Fehler: ' + (err.message || err), 'error'); }
}

// ========== Absender ändern ==========
export async function hqSupUpdateAbsender(ticketId) {
    var val = (document.getElementById('hqSupAbsenderVal') || {}).value || null;
    if (!val) return;
    try {
        var user = _sbUser();
        await _sb().from('support_tickets').update({ erstellt_von: val, zoho_fallback: false }).eq('id', ticketId);
        var u = _hqSup.hqUsers.find(function(u) { return u.id === val; });
        var name = u ? ((u.vorname||'') + ' ' + (u.nachname||'')).trim() : val;
        await _sb().from('support_ticket_log').insert({ ticket_id: ticketId, user_id: user ? user.id : null, aktion: 'absender_geaendert', neu_wert: name });
        _showToast('Absender: ' + name, 'success');
        var ov = document.getElementById('hqSupDetailOverlay');
        if (ov) ov.remove();
        _hqSup.loaded = false;
        await loadHqData();
        renderHqSupport();
    } catch(err) { _showToast('Fehler: ' + (err.message || err), 'error'); }
}

// ========== KI-Antwort ==========
export async function hqSupKiAntwort(ticketId) {
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
            var textarea = document.getElementById('hqSupKommentarInput');
            if (textarea) textarea.value = data.antwort;
            _showToast('KI-Antwort eingefuegt – bitte pruefen und anpassen', 'success');
        }
    } catch(err) {
        _showToast('KI-Antwort fehlgeschlagen: ' + (err.message || err), 'error');
    }
}

// ========== Anhang herunterladen ==========
export async function hqSupDownload(storagePath, dateiname) {
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

// ========== Ticket erstellen (HQ) ==========
export function hqSupCreateTicket() {
    if (document.getElementById('hqSupNewTicketOverlay')) return;
    var el = document.createElement('div');
    el.id = 'hqSupNewTicketOverlay';
    el.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8';
    el.onclick = function(e) { if (e.target === el) el.remove(); };

    var html = '<div class="bg-white rounded-xl w-full max-w-lg mx-4 shadow-2xl" onclick="event.stopPropagation()">';
    html += '<div class="p-5 border-b border-gray-100 flex items-center justify-between">';
    html += '<h3 class="text-lg font-bold text-gray-800">Neues HQ-Ticket</h3>';
    html += '<button onclick="document.getElementById(\'hqSupNewTicketOverlay\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>';
    html += '</div><div class="p-5">';

    html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-1">Betreff *</label>';
    html += '<input type="text" id="hqSupNewBetreff" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></div>';

    html += '<div class="grid grid-cols-2 gap-3 mb-4">';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Richtung</label>';
    html += '<select id="hqSupNewRichtung" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">';
    html += '<option value="hq_zu_partner">HQ → Partner</option>';
    html += '<option value="hq_intern">HQ Intern</option></select></div>';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Kategorie</label>';
    html += '<select id="hqSupNewKat" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">';
    ALLE_KATEGORIEN.forEach(function(k) { html += '<option value="' + k + '">' + (KAT_ICONS[k]||'') + ' ' + k + '</option>'; });
    html += '</select></div></div>';

    html += '<div class="grid grid-cols-2 gap-3 mb-4">';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Prioritaet</label>';
    html += '<select id="hqSupNewPrio" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">';
    html += '<option value="niedrig">Niedrig</option><option value="mittel" selected>Mittel</option><option value="kritisch">Kritisch</option></select></div>';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Assignee</label>';
    html += '<select id="hqSupNewAssignee" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">';
    html += '<option value="">Nicht zugewiesen</option>';
    _hqSup.hqUsers.forEach(function(u) {
        var name = ((u.vorname || '') + ' ' + (u.nachname || '')).trim() || u.name || '';
        html += '<option value="' + u.id + '">' + _escH(name) + '</option>';
    });
    html += '</select></div></div>';

    html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-1">Beschreibung *</label>';
    html += '<textarea id="hqSupNewBeschr" rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"></textarea></div>';

    html += '<div class="flex justify-end gap-2">';
    html += '<button onclick="document.getElementById(\'hqSupNewTicketOverlay\').remove()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Abbrechen</button>';
    html += '<button onclick="hqSupSubmitNewTicket()" id="hqSupSubmitBtn" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">Ticket erstellen</button>';
    html += '</div></div></div>';

    el.innerHTML = html;
    document.body.appendChild(el);
}

export async function hqSupSubmitNewTicket() {
    var betreff = (document.getElementById('hqSupNewBetreff') || {}).value || '';
    var beschreibung = (document.getElementById('hqSupNewBeschr') || {}).value || '';
    var kategorie = (document.getElementById('hqSupNewKat') || {}).value || 'Allgemein';
    var prioritaet = (document.getElementById('hqSupNewPrio') || {}).value || 'mittel';
    var richtung = (document.getElementById('hqSupNewRichtung') || {}).value || 'hq_intern';
    var assignee = (document.getElementById('hqSupNewAssignee') || {}).value || null;

    if (!betreff.trim() || !beschreibung.trim()) { _showToast('Betreff und Beschreibung sind Pflichtfelder', 'error'); return; }

    var btn = document.getElementById('hqSupSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Wird erstellt...'; }

    try {
        var user = _sbUser();
        var resp = await _sb().from('support_tickets').insert({
            erstellt_von: user ? user.id : null,
            betreff: betreff.trim(),
            beschreibung: beschreibung.trim(),
            kategorie: kategorie,
            prioritaet: prioritaet,
            richtung: richtung,
            assignee_id: assignee,
            status: 'offen'
        }).select().single();

        if (resp.error) throw resp.error;

        await _sb().from('support_ticket_log').insert({
            ticket_id: resp.data.id,
            user_id: user ? user.id : null,
            aktion: 'erstellt',
            neu_wert: 'offen (HQ)'
        });

        var overlay = document.getElementById('hqSupNewTicketOverlay');
        if (overlay) overlay.remove();
        _showToast('Ticket ' + (resp.data.ticket_nr || '') + ' erstellt', 'success');
        _hqSup.loaded = false;
        await loadHqData();
        renderHqSupport();

    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Ticket erstellen'; }
    }
}

// ========== Wissensartikel ==========
export async function hqSupArtikelStatus(artikelId, status) {
    try {
        var user = _sbUser();
        var update = { status: status };
        if (status === 'publiziert') update.freigegeben_von = user ? user.id : null;
        await _sb().from('support_wissensartikel').update(update).eq('id', artikelId);
        _showToast('Artikel ' + status, 'success');
        _hqSup.loaded = false;
        await loadHqData();
        renderHqSupport();
    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

export function hqSupNewArtikel() {
    if (document.getElementById('hqSupArtikelOverlay')) return;
    var el = document.createElement('div');
    el.id = 'hqSupArtikelOverlay';
    el.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8';
    el.onclick = function(e) { if (e.target === el) el.remove(); };

    var html = '<div class="bg-white rounded-xl w-full max-w-lg mx-4 shadow-2xl" onclick="event.stopPropagation()">';
    html += '<div class="p-5 border-b border-gray-100 flex items-center justify-between">';
    html += '<h3 class="text-lg font-bold text-gray-800">Neuer Wissensartikel</h3>';
    html += '<button onclick="document.getElementById(\'hqSupArtikelOverlay\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>';
    html += '</div><div class="p-5">';
    html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-1">Titel *</label>';
    html += '<input type="text" id="hqSupArtikelTitel" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></div>';
    html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-1">Kategorie</label>';
    html += '<select id="hqSupArtikelKat" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">';
    ALLE_KATEGORIEN.forEach(function(k) { html += '<option value="' + k + '">' + k + '</option>'; });
    html += '</select></div>';
    html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-1">Inhalt *</label>';
    html += '<textarea id="hqSupArtikelInhalt" rows="8" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"></textarea></div>';
    html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-1">Status</label>';
    html += '<select id="hqSupArtikelStatus" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">';
    html += '<option value="entwurf">Entwurf</option><option value="review">Review</option><option value="publiziert">Publiziert</option></select></div>';
    html += '<div class="flex justify-end gap-2">';
    html += '<button onclick="document.getElementById(\'hqSupArtikelOverlay\').remove()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Abbrechen</button>';
    html += '<button onclick="hqSupSaveArtikel()" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">Speichern</button>';
    html += '</div></div></div>';
    el.innerHTML = html;
    document.body.appendChild(el);
}

export async function hqSupSaveArtikel() {
    var titel = (document.getElementById('hqSupArtikelTitel') || {}).value || '';
    var inhalt = (document.getElementById('hqSupArtikelInhalt') || {}).value || '';
    var kategorie = (document.getElementById('hqSupArtikelKat') || {}).value || 'Allgemein';
    var status = (document.getElementById('hqSupArtikelStatus') || {}).value || 'entwurf';
    if (!titel.trim() || !inhalt.trim()) { _showToast('Titel und Inhalt sind Pflichtfelder', 'error'); return; }
    try {
        var user = _sbUser();
        await _sb().from('support_wissensartikel').insert({
            titel: titel.trim(),
            inhalt: inhalt.trim(),
            kategorie: kategorie,
            status: status,
            ki_generiert: false,
            erstellt_von: user ? user.id : null,
            freigegeben_von: status === 'publiziert' ? (user ? user.id : null) : null
        });
        var overlay = document.getElementById('hqSupArtikelOverlay');
        if (overlay) overlay.remove();
        _showToast('Wissensartikel erstellt', 'success');
        _hqSup.loaded = false;
        await loadHqData();
        renderHqSupport();
    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

export async function hqSupEditArtikel(artikelId) {
    var artikel = _hqSup.wissenArtikel.find(function(a) { return a.id === artikelId; });
    if (!artikel) return;

    if (document.getElementById('hqSupArtikelOverlay')) document.getElementById('hqSupArtikelOverlay').remove();
    var el = document.createElement('div');
    el.id = 'hqSupArtikelOverlay';
    el.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto py-8';
    el.onclick = function(e) { if (e.target === el) el.remove(); };

    var html = '<div class="bg-white rounded-xl w-full max-w-lg mx-4 shadow-2xl" onclick="event.stopPropagation()">';
    html += '<div class="p-5 border-b border-gray-100 flex items-center justify-between">';
    html += '<h3 class="text-lg font-bold text-gray-800">Artikel bearbeiten</h3>';
    html += '<button onclick="document.getElementById(\'hqSupArtikelOverlay\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>';
    html += '</div><div class="p-5">';
    html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-1">Titel</label>';
    html += '<input type="text" id="hqSupArtikelTitel" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value="' + _escH(artikel.titel) + '"></div>';
    html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-1">Kategorie</label>';
    html += '<select id="hqSupArtikelKat" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">';
    ALLE_KATEGORIEN.forEach(function(k) { html += '<option value="' + k + '"' + (artikel.kategorie === k ? ' selected' : '') + '>' + k + '</option>'; });
    html += '</select></div>';
    html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-1">Inhalt</label>';
    html += '<textarea id="hqSupArtikelInhalt" rows="8" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y">' + _escH(artikel.inhalt) + '</textarea></div>';
    html += '<div class="mb-4"><label class="block text-xs font-semibold text-gray-600 mb-1">Status</label>';
    html += '<select id="hqSupArtikelStatus" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">';
    ['entwurf','review','publiziert','archiviert'].forEach(function(s) { html += '<option value="' + s + '"' + (artikel.status === s ? ' selected' : '') + '>' + s + '</option>'; });
    html += '</select></div>';
    html += '<div class="flex justify-end gap-2">';
    html += '<button onclick="document.getElementById(\'hqSupArtikelOverlay\').remove()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Abbrechen</button>';
    html += '<button onclick="hqSupUpdateArtikel(\'' + artikelId + '\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">Speichern</button>';
    html += '</div></div></div>';
    el.innerHTML = html;
    document.body.appendChild(el);
}

export async function hqSupUpdateArtikel(artikelId) {
    var titel = (document.getElementById('hqSupArtikelTitel') || {}).value || '';
    var inhalt = (document.getElementById('hqSupArtikelInhalt') || {}).value || '';
    var kategorie = (document.getElementById('hqSupArtikelKat') || {}).value || 'Allgemein';
    var status = (document.getElementById('hqSupArtikelStatus') || {}).value || 'entwurf';
    if (!titel.trim() || !inhalt.trim()) { _showToast('Titel und Inhalt sind Pflichtfelder', 'error'); return; }
    try {
        var user = _sbUser();
        var update = { titel: titel.trim(), inhalt: inhalt.trim(), kategorie: kategorie, status: status };
        if (status === 'publiziert') update.freigegeben_von = user ? user.id : null;
        await _sb().from('support_wissensartikel').update(update).eq('id', artikelId);
        var overlay = document.getElementById('hqSupArtikelOverlay');
        if (overlay) overlay.remove();
        _showToast('Artikel aktualisiert', 'success');
        _hqSup.loaded = false;
        await loadHqData();
        renderHqSupport();
    } catch(err) {
        _showToast('Fehler: ' + (err.message || err), 'error');
    }
}

// ========== Strangler Fig: window.* registration ==========
const _exports = {
    renderHqSupport, hqSupShowTab, hqSupFilterChanged, hqSupOpenDetail, hqSupCloseDetail,
    hqSupUpdateStatus, hqSupUpdateAssignee, hqSupUpdatePrio, hqSupSendKommentar,
    hqSupInsertCanned, hqSupKiAntwort, hqSupDownload,
    hqSupAbsenderFilter, hqSupAbsenderPick,
    hqSupUpdateAbteilung, hqSupUpdateAbsender,
    hqSupCreateTicket, hqSupSubmitNewTicket,
    hqSupArtikelStatus, hqSupNewArtikel, hqSupSaveArtikel, hqSupEditArtikel, hqSupUpdateArtikel
};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
