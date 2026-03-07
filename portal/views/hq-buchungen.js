/**
 * views/hq-buchungen.js - Buchungssystem + MS365 Integration
 * HQ: Verfuegbarkeit, Termintypen, Buchungslinks, Anfragen verwalten
 * Partner: Termin buchen, eigene Termine einsehen
 * @module views/hq-buchungen
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s || ''); }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }

var MODUL_DATEN = { name: 'hq-buchungen', version: '1.0.0' };
var _buchungenCache = { typen: [], verfuegbarkeit: [], buchungen: [], links: [] };
var _currentBuchungTab = 'anfragen';
var _buchungSlots = [];
var _buchungStep = 1;
var _buchungSelection = { termintyp: null, hqUser: null, datum: null, slot: null, thema: '' };

// =============================================
// HELPER
// =============================================

function _sbUrl() { return typeof window.sbUrl === 'function' ? window.sbUrl() : (window.SUPABASE_URL || ''); }

function _fmtDatum(d) {
    if (!d) return '-';
    var dt = new Date(d);
    return dt.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function _fmtZeit(d) {
    if (!d) return '-';
    var dt = new Date(d);
    return dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
}

function _statusBadge(status) {
    var m = {
        ausstehend:    ['Ausstehend',    'bg-yellow-100 text-yellow-700'],
        bestaetigt:    ['Bestaetigt',    'bg-green-100 text-green-700'],
        abgelehnt:     ['Abgelehnt',     'bg-red-100 text-red-700'],
        abgesagt:      ['Abgesagt',      'bg-gray-100 text-gray-500'],
        abgeschlossen: ['Abgeschlossen', 'bg-blue-100 text-blue-700']
    };
    var v = m[status] || [status, 'bg-gray-100 text-gray-600'];
    return '<span class="px-2 py-0.5 rounded-full text-xs font-semibold ' + v[1] + '">' + v[0] + '</span>';
}

async function _edgeFn(name, body) {
    try {
        var session = await _sb().auth.getSession();
        var token = session && session.data && session.data.session ? session.data.session.access_token : null;
        var res = await fetch(_sbUrl() + '/functions/v1/' + name, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + (token || ''),
                'apikey': window.SUPABASE_ANON_KEY || ''
            },
            body: JSON.stringify(body)
        });
        return await res.json();
    } catch (e) {
        console.error('[Buchungen] Edge Function ' + name + ':', e);
        return { error: e.message };
    }
}

// =============================================
// HQ: HAUPTANSICHT
// =============================================

export async function renderHqBuchungen() {
    var container = document.getElementById('hqBuchungenView');
    if (!container) return;
    var profile = _sbProfile();
    if (!profile || !profile.is_hq) {
        renderPartnerBuchungen();
        return;
    }

    // MS365-Status laden
    var ms365Connected = !!(profile.ms365_access_token && profile.ms365_email);
    var ms365StatusHtml = ms365Connected
        ? '<span class="inline-flex items-center gap-1 text-xs text-green-600 font-semibold"><span class="w-2 h-2 rounded-full bg-green-500 inline-block"></span> ' + _escH(profile.ms365_email) + '</span>'
        : '<span class="text-xs text-gray-400">Nicht verbunden</span>';

    // Buchungsanfragen zaehlen
    var { count } = await _sb().from('hq_buchungen').select('id', { count: 'exact', head: true }).eq('status', 'ausstehend');
    var badgeHtml = (count && count > 0) ? ' <span class="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">' + count + '</span>' : '';

    container.innerHTML = '<div class="max-w-6xl mx-auto">'
        + '<div class="flex flex-wrap items-center justify-between mb-4 gap-3">'
        + '  <div>'
        + '    <h1 class="h1-headline text-gray-800 mb-1">Buchungssystem</h1>'
        + '    <p class="text-sm text-gray-500">Sprechstunden, Termine und MS365-Integration</p>'
        + '  </div>'
        + '  <div class="flex items-center gap-3">'
        + '    ' + ms365StatusHtml
        + '    <button onclick="hqMs365Connect()" class="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">'
        + (ms365Connected ? 'Neu verbinden' : 'MS365 verbinden')
        + '    </button>'
        + '  </div>'
        + '</div>'
        // Tabs
        + '<div class="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto" id="buchungenTabs">'
        + _buchungTab('anfragen', 'Buchungsanfragen' + badgeHtml)
        + _buchungTab('termine', 'Meine Termine')
        + _buchungTab('verfuegbarkeit', 'Verfuegbarkeit')
        + _buchungTab('typen', 'Termintypen')
        + _buchungTab('links', 'Buchungslinks')
        + '</div>'
        + '<div id="buchungenContent"></div>'
        + '</div>';

    showBuchungTab(_currentBuchungTab);
}

function _buchungTab(key, label) {
    var active = key === _currentBuchungTab;
    return '<button onclick="showBuchungTab(\'' + key + '\')" class="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition '
        + (active ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700')
        + '">' + label + '</button>';
}

export function showBuchungTab(tab) {
    _currentBuchungTab = tab;
    // Tab-Buttons aktualisieren
    var tabs = document.querySelectorAll('#buchungenTabs button');
    for (var i = 0; i < tabs.length; i++) {
        var btn = tabs[i];
        var isActive = btn.getAttribute('onclick').indexOf("'" + tab + "'") !== -1;
        btn.className = 'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition '
            + (isActive ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700');
    }
    // Inhalt laden
    if (tab === 'anfragen') _loadBuchungsAnfragen();
    else if (tab === 'termine') _loadMeineTermine();
    else if (tab === 'verfuegbarkeit') _loadVerfuegbarkeit();
    else if (tab === 'typen') _loadTermintypen();
    else if (tab === 'links') _loadBuchungslinks();
}

// =============================================
// HQ TAB: BUCHUNGSANFRAGEN
// =============================================

async function _loadBuchungsAnfragen() {
    var c = document.getElementById('buchungenContent');
    if (!c) return;
    c.innerHTML = '<p class="text-gray-400 text-sm">Lade Buchungsanfragen...</p>';

    var { data, error } = await _sb().from('hq_buchungen')
        .select('*, termintyp:hq_termintypen(name, dauer_min, farbe), partner_user:users!hq_buchungen_partner_user_id_fkey(vorname, nachname, email), standort:standorte(name, stadt)')
        .order('start_at', { ascending: true });

    if (error) { c.innerHTML = '<p class="text-red-500 text-sm">Fehler: ' + _escH(error.message) + '</p>'; return; }

    if (!data || data.length === 0) {
        c.innerHTML = '<div class="vit-card p-8 text-center text-gray-400"><p class="text-lg mb-2">Keine Buchungen vorhanden</p><p class="text-sm">Sobald Partner Termine buchen, erscheinen sie hier.</p></div>';
        return;
    }

    // Gruppierung: ausstehend zuerst
    var ausstehend = data.filter(function(b) { return b.status === 'ausstehend'; });
    var rest = data.filter(function(b) { return b.status !== 'ausstehend'; });

    var html = '';
    if (ausstehend.length > 0) {
        html += '<h3 class="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Ausstehend (' + ausstehend.length + ')</h3>';
        html += '<div class="space-y-3 mb-6">';
        for (var i = 0; i < ausstehend.length; i++) html += _renderBuchungCard(ausstehend[i], true);
        html += '</div>';
    }
    if (rest.length > 0) {
        html += '<h3 class="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Alle Buchungen (' + rest.length + ')</h3>';
        html += '<div class="space-y-3">';
        for (var j = 0; j < rest.length; j++) html += _renderBuchungCard(rest[j], false);
        html += '</div>';
    }

    c.innerHTML = html;
}

function _renderBuchungCard(b, showActions) {
    var farbe = (b.termintyp && b.termintyp.farbe) ? b.termintyp.farbe : '#EF7D00';
    var partnerName = b.partner_user ? (_escH(b.partner_user.vorname || '') + ' ' + _escH(b.partner_user.nachname || '')).trim() : '-';
    var standortName = b.standort ? _escH(b.standort.name) : '-';

    var html = '<div class="vit-card p-4 border-l-4" style="border-left-color:' + farbe + '">'
        + '<div class="flex flex-wrap items-start justify-between gap-3">'
        + '  <div class="flex-1 min-w-0">'
        + '    <div class="flex items-center gap-2 mb-1">'
        + '      <span class="font-semibold text-gray-800">' + _escH(b.termintyp ? b.termintyp.name : '-') + '</span>'
        + '      ' + _statusBadge(b.status)
        + '      <span class="text-xs text-gray-400">' + _escH(b.buchungs_nr || '') + '</span>'
        + '    </div>'
        + '    <div class="text-sm text-gray-600 space-y-0.5">'
        + '      <div><span class="font-medium">Datum:</span> ' + _fmtDatum(b.start_at) + ' ' + _fmtZeit(b.start_at) + ' - ' + _fmtZeit(b.end_at) + '</div>'
        + '      <div><span class="font-medium">Standort:</span> ' + standortName + '</div>'
        + '      <div><span class="font-medium">Partner:</span> ' + partnerName + '</div>'
        + (b.thema ? '      <div><span class="font-medium">Thema:</span> ' + _escH(b.thema) + '</div>' : '')
        + '    </div>';

    // Links
    if (b.ms365_teams_link || b.ms365_sharepoint_folder) {
        html += '<div class="flex gap-2 mt-2">';
        if (b.ms365_teams_link) {
            html += '<a href="' + _escH(b.ms365_teams_link) + '" target="_blank" class="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">'
                + '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>'
                + 'Teams Meeting</a>';
        }
        if (b.ms365_sharepoint_folder) {
            html += '<a href="' + _escH(b.ms365_sharepoint_folder) + '" target="_blank" class="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline">'
                + '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>'
                + 'SharePoint</a>';
        }
        html += '</div>';
    }

    html += '  </div>';

    // Aktionsbuttons
    if (showActions) {
        html += '  <div class="flex gap-2 flex-shrink-0">'
            + '    <button onclick="hqBuchungBestaetigen(\'' + b.id + '\')" class="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">Bestaetigen</button>'
            + '    <button onclick="hqBuchungAblehnenDialog(\'' + b.id + '\')" class="px-3 py-1.5 bg-red-100 text-red-700 text-xs rounded-lg hover:bg-red-200">Ablehnen</button>'
            + '  </div>';
    }

    html += '</div></div>';
    return html;
}

// =============================================
// HQ TAB: MEINE TERMINE
// =============================================

async function _loadMeineTermine() {
    var c = document.getElementById('buchungenContent');
    if (!c) return;
    c.innerHTML = '<p class="text-gray-400 text-sm">Lade Termine...</p>';

    var userId = _sbProfile().id;
    var { data } = await _sb().from('hq_buchungen')
        .select('*, termintyp:hq_termintypen(name, dauer_min, farbe), partner_user:users!hq_buchungen_partner_user_id_fkey(vorname, nachname, email), standort:standorte(name, stadt)')
        .eq('hq_user_id', userId)
        .in('status', ['bestaetigt', 'ausstehend'])
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true });

    if (!data || data.length === 0) {
        c.innerHTML = '<div class="vit-card p-8 text-center text-gray-400"><p>Keine anstehenden Termine.</p></div>';
        return;
    }

    var html = '<div class="space-y-3">';
    for (var i = 0; i < data.length; i++) html += _renderBuchungCard(data[i], false);
    html += '</div>';
    c.innerHTML = html;
}

// =============================================
// HQ TAB: VERFUEGBARKEIT
// =============================================

async function _loadVerfuegbarkeit() {
    var c = document.getElementById('buchungenContent');
    if (!c) return;
    c.innerHTML = '<p class="text-gray-400 text-sm">Lade Verfuegbarkeit...</p>';

    var userId = _sbProfile().id;
    var { data } = await _sb().from('hq_verfuegbarkeit').select('*').eq('user_id', userId).order('wochentag');

    var tage = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

    var html = '<div class="vit-card p-6">'
        + '<div class="flex items-center justify-between mb-4">'
        + '  <h3 class="font-semibold text-gray-800">Wochenmuster</h3>'
        + '  <button onclick="hqVerfuegbarkeitHinzu()" class="px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600">+ Zeitfenster</button>'
        + '</div>';

    if (!data || data.length === 0) {
        html += '<p class="text-gray-400 text-sm">Noch keine Verfuegbarkeit eingetragen. Klicke auf "+ Zeitfenster" um deine Sprechstunden zu definieren.</p>';
    } else {
        html += '<div class="space-y-2">';
        for (var i = 0; i < data.length; i++) {
            var v = data[i];
            html += '<div class="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">'
                + '<div class="flex items-center gap-3">'
                + '  <span class="font-medium text-sm text-gray-700 w-24">' + tage[v.wochentag] + '</span>'
                + '  <span class="text-sm text-gray-600">' + v.start_zeit.substring(0, 5) + ' - ' + v.end_zeit.substring(0, 5) + ' Uhr</span>'
                + '</div>'
                + '<button onclick="hqVerfuegbarkeitLoeschen(\'' + v.id + '\')" class="text-red-400 hover:text-red-600 text-xs">Entfernen</button>'
                + '</div>';
        }
        html += '</div>';
    }

    html += '</div>';

    // Sperrzeiten
    var { data: sperren } = await _sb().from('hq_sperrzeiten').select('*').eq('user_id', userId).gte('bis', new Date().toISOString()).order('von');

    html += '<div class="vit-card p-6 mt-4">'
        + '<div class="flex items-center justify-between mb-4">'
        + '  <h3 class="font-semibold text-gray-800">Sperrzeiten</h3>'
        + '  <button onclick="hqSperrzeitHinzu()" class="px-3 py-1.5 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-700">+ Sperrzeit</button>'
        + '</div>';

    if (!sperren || sperren.length === 0) {
        html += '<p class="text-gray-400 text-sm">Keine Sperrzeiten eingetragen.</p>';
    } else {
        html += '<div class="space-y-2">';
        for (var j = 0; j < sperren.length; j++) {
            var s = sperren[j];
            html += '<div class="flex items-center justify-between bg-red-50 rounded-lg px-4 py-2.5">'
                + '<div>'
                + '  <span class="text-sm font-medium text-gray-700">' + _fmtDatum(s.von) + ' - ' + _fmtDatum(s.bis) + '</span>'
                + (s.grund ? '  <span class="text-xs text-gray-500 ml-2">(' + _escH(s.grund) + ')</span>' : '')
                + '</div>'
                + '<button onclick="hqSperrzeitLoeschen(\'' + s.id + '\')" class="text-red-400 hover:text-red-600 text-xs">Entfernen</button>'
                + '</div>';
        }
        html += '</div>';
    }
    html += '</div>';

    c.innerHTML = html;
}

// =============================================
// HQ TAB: TERMINTYPEN
// =============================================

async function _loadTermintypen() {
    var c = document.getElementById('buchungenContent');
    if (!c) return;
    c.innerHTML = '<p class="text-gray-400 text-sm">Lade Termintypen...</p>';

    var { data } = await _sb().from('hq_termintypen').select('*').order('name');

    var html = '<div class="flex items-center justify-between mb-4">'
        + '<h3 class="font-semibold text-gray-800">Konfigurierte Termintypen</h3>'
        + '<button onclick="hqTermintypHinzu()" class="px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600">+ Neuer Typ</button>'
        + '</div>';

    if (!data || data.length === 0) {
        html += '<p class="text-gray-400 text-sm">Keine Termintypen vorhanden.</p>';
    } else {
        html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
        for (var i = 0; i < data.length; i++) {
            var t = data[i];
            html += '<div class="vit-card p-4 border-l-4" style="border-left-color:' + _escH(t.farbe || '#EF7D00') + '">'
                + '<div class="flex items-start justify-between">'
                + '  <div>'
                + '    <h4 class="font-semibold text-gray-800">' + _escH(t.name) + '</h4>'
                + '    <p class="text-xs text-gray-500 mt-1">' + _escH(t.beschreibung || '') + '</p>'
                + '  </div>'
                + '  <span class="text-xs px-2 py-0.5 rounded-full ' + (t.aktiv ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500') + '">'
                + (t.aktiv ? 'Aktiv' : 'Inaktiv') + '</span>'
                + '</div>'
                + '<div class="mt-3 flex gap-3 text-xs text-gray-500">'
                + '  <span>' + t.dauer_min + ' Min.</span>'
                + '  <span>' + t.puffer_min + ' Min. Puffer</span>'
                + '  <span>' + t.vorlaufzeit_h + 'h Vorlauf</span>'
                + (t.teams_meeting ? '  <span class="text-blue-500">Teams</span>' : '')
                + '</div>'
                + '<div class="mt-3 flex gap-2">'
                + '  <button onclick="hqTermintypBearbeiten(\'' + t.id + '\')" class="text-xs text-gray-500 hover:text-gray-700">Bearbeiten</button>'
                + '  <button onclick="hqTermintypToggle(\'' + t.id + '\',' + !t.aktiv + ')" class="text-xs text-gray-500 hover:text-gray-700">' + (t.aktiv ? 'Deaktivieren' : 'Aktivieren') + '</button>'
                + '</div>'
                + '</div>';
        }
        html += '</div>';
    }

    c.innerHTML = html;
}

// =============================================
// HQ TAB: BUCHUNGSLINKS
// =============================================

async function _loadBuchungslinks() {
    var c = document.getElementById('buchungenContent');
    if (!c) return;
    c.innerHTML = '<p class="text-gray-400 text-sm">Lade Buchungslinks...</p>';

    var userId = _sbProfile().id;
    var { data } = await _sb().from('hq_buchungslinks').select('*, termintyp:hq_termintypen(name)').eq('user_id', userId).order('erstellt_at', { ascending: false });

    var html = '<div class="flex items-center justify-between mb-4">'
        + '<h3 class="font-semibold text-gray-800">Persoenliche Buchungslinks</h3>'
        + '<button onclick="hqBuchungsLinkErstellen()" class="px-3 py-1.5 bg-orange-500 text-white text-xs rounded-lg hover:bg-orange-600">+ Neuer Link</button>'
        + '</div>';

    if (!data || data.length === 0) {
        html += '<div class="vit-card p-8 text-center text-gray-400"><p>Noch keine Buchungslinks erstellt.</p><p class="text-xs mt-1">Erstelle einen Link, den du per E-Mail oder Chat an Partner senden kannst.</p></div>';
    } else {
        html += '<div class="space-y-3">';
        for (var i = 0; i < data.length; i++) {
            var l = data[i];
            var linkUrl = 'https://cockpit.vitbikes.de/portal?buchung=' + _escH(l.slug);
            html += '<div class="vit-card p-4">'
                + '<div class="flex flex-wrap items-center justify-between gap-3">'
                + '  <div class="min-w-0">'
                + '    <div class="font-semibold text-gray-800">' + _escH(l.titel || l.termintyp.name) + '</div>'
                + '    <div class="text-xs text-gray-500 mt-0.5">' + _escH(l.beschreibung || '') + '</div>'
                + '    <div class="flex items-center gap-2 mt-2">'
                + '      <input type="text" value="' + linkUrl + '" readonly class="text-xs bg-gray-50 border rounded px-2 py-1 w-80 max-w-full" id="link_' + l.id + '">'
                + '      <button onclick="hqCopyLink(\'' + l.id + '\')" class="text-xs text-orange-600 hover:underline">Kopieren</button>'
                + '    </div>'
                + '  </div>'
                + '  <div class="text-right">'
                + '    <div class="text-sm font-bold text-gray-700">' + (l.buchungen_count || 0) + ' Buchungen</div>'
                + '    <span class="text-xs px-2 py-0.5 rounded-full ' + (l.aktiv ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500') + '">' + (l.aktiv ? 'Aktiv' : 'Inaktiv') + '</span>'
                + '  </div>'
                + '</div>'
                + '</div>';
        }
        html += '</div>';
    }

    c.innerHTML = html;
}

// =============================================
// HQ AKTIONEN
// =============================================

export function hqMs365Connect() {
    var profile = _sbProfile();
    if (!profile) { _showToast('Bitte zuerst einloggen.', 'error'); return; }

    var clientId = window.MS365_CLIENT_ID || '';
    var tenantId = window.MS365_TENANT_ID || '';
    var redirectUri = 'https://cockpit.vitbikes.de/api/ms365-callback';
    var scope = 'Calendars.ReadWrite Mail.Send offline_access User.Read Sites.ReadWrite.All OnlineMeetings.ReadWrite';

    var url = 'https://login.microsoftonline.com/' + tenantId + '/oauth2/v2.0/authorize'
        + '?client_id=' + encodeURIComponent(clientId)
        + '&response_type=code'
        + '&redirect_uri=' + encodeURIComponent(redirectUri)
        + '&scope=' + encodeURIComponent(scope)
        + '&state=' + encodeURIComponent(profile.id)
        + '&response_mode=query';

    window.location.href = url;
}

export async function hqBuchungBestaetigen(id) {
    var { error } = await _sb().from('hq_buchungen').update({ status: 'bestaetigt', aktualisiert_at: new Date().toISOString() }).eq('id', id);
    if (error) { _showToast('Fehler: ' + error.message, 'error'); return; }
    _showToast('Buchung bestaetigt!', 'success');
    // Notify
    _edgeFn('buchung-notify', { buchung_id: id, event: 'bestaetigt' });
    _loadBuchungsAnfragen();
}

export function hqBuchungAblehnenDialog(id) {
    var grund = prompt('Grund fuer die Ablehnung (optional):');
    if (grund === null) return; // cancelled
    hqBuchungAblehnen(id, grund);
}

export async function hqBuchungAblehnen(id, grund) {
    var { error } = await _sb().from('hq_buchungen').update({
        status: 'abgelehnt',
        absage_grund: grund || null,
        aktualisiert_at: new Date().toISOString()
    }).eq('id', id);
    if (error) { _showToast('Fehler: ' + error.message, 'error'); return; }
    _showToast('Buchung abgelehnt.', 'info');
    _edgeFn('buchung-notify', { buchung_id: id, event: 'abgesagt' });
    _loadBuchungsAnfragen();
}

export function hqVerfuegbarkeitHinzu() {
    var tage = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    var html = '<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" id="verfModal">'
        + '<div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">'
        + '<h3 class="font-semibold text-gray-800 mb-4">Zeitfenster hinzufuegen</h3>'
        + '<div class="space-y-3">'
        + '  <div><label class="text-xs font-medium text-gray-600">Wochentag</label>'
        + '    <select id="verfTag" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm">'
        + tage.map(function(t, i) { return '<option value="' + i + '">' + t + '</option>'; }).join('')
        + '    </select></div>'
        + '  <div class="grid grid-cols-2 gap-3">'
        + '    <div><label class="text-xs font-medium text-gray-600">Von</label>'
        + '      <input type="time" id="verfVon" value="09:00" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>'
        + '    <div><label class="text-xs font-medium text-gray-600">Bis</label>'
        + '      <input type="time" id="verfBis" value="17:00" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>'
        + '  </div>'
        + '</div>'
        + '<div class="flex gap-3 mt-6">'
        + '  <button onclick="document.getElementById(\'verfModal\').remove()" class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Abbrechen</button>'
        + '  <button onclick="hqVerfuegbarkeitSpeichern()" class="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">Speichern</button>'
        + '</div>'
        + '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

export async function hqVerfuegbarkeitSpeichern() {
    var tag = parseInt(document.getElementById('verfTag').value);
    var von = document.getElementById('verfVon').value;
    var bis = document.getElementById('verfBis').value;
    if (!von || !bis || von >= bis) { _showToast('Ungueltige Zeiten', 'error'); return; }

    var { error } = await _sb().from('hq_verfuegbarkeit').insert({
        user_id: _sbProfile().id,
        wochentag: tag,
        start_zeit: von,
        end_zeit: bis
    });
    if (error) { _showToast('Fehler: ' + error.message, 'error'); return; }

    var modal = document.getElementById('verfModal');
    if (modal) modal.remove();
    _showToast('Zeitfenster gespeichert!', 'success');
    _loadVerfuegbarkeit();
}

export async function hqVerfuegbarkeitLoeschen(id) {
    if (!confirm('Zeitfenster wirklich entfernen?')) return;
    await _sb().from('hq_verfuegbarkeit').delete().eq('id', id);
    _showToast('Entfernt.', 'info');
    _loadVerfuegbarkeit();
}

export function hqSperrzeitHinzu() {
    var html = '<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" id="sperrModal">'
        + '<div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">'
        + '<h3 class="font-semibold text-gray-800 mb-4">Sperrzeit hinzufuegen</h3>'
        + '<div class="space-y-3">'
        + '  <div class="grid grid-cols-2 gap-3">'
        + '    <div><label class="text-xs font-medium text-gray-600">Von</label>'
        + '      <input type="date" id="sperrVon" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>'
        + '    <div><label class="text-xs font-medium text-gray-600">Bis</label>'
        + '      <input type="date" id="sperrBis" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>'
        + '  </div>'
        + '  <div><label class="text-xs font-medium text-gray-600">Grund (optional)</label>'
        + '    <input type="text" id="sperrGrund" placeholder="z.B. Urlaub" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>'
        + '</div>'
        + '<div class="flex gap-3 mt-6">'
        + '  <button onclick="document.getElementById(\'sperrModal\').remove()" class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Abbrechen</button>'
        + '  <button onclick="hqSperrzeitSpeichern()" class="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-800">Speichern</button>'
        + '</div>'
        + '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

export async function hqSperrzeitSpeichern() {
    var von = document.getElementById('sperrVon').value;
    var bis = document.getElementById('sperrBis').value;
    var grund = document.getElementById('sperrGrund').value;
    if (!von || !bis || von > bis) { _showToast('Ungueltige Daten', 'error'); return; }

    var { error } = await _sb().from('hq_sperrzeiten').insert({
        user_id: _sbProfile().id,
        von: von + 'T00:00:00+01:00',
        bis: bis + 'T23:59:59+01:00',
        grund: grund || null
    });
    if (error) { _showToast('Fehler: ' + error.message, 'error'); return; }

    var modal = document.getElementById('sperrModal');
    if (modal) modal.remove();
    _showToast('Sperrzeit eingetragen!', 'success');
    _loadVerfuegbarkeit();
}

export async function hqSperrzeitLoeschen(id) {
    if (!confirm('Sperrzeit wirklich entfernen?')) return;
    await _sb().from('hq_sperrzeiten').delete().eq('id', id);
    _showToast('Entfernt.', 'info');
    _loadVerfuegbarkeit();
}

export function hqTermintypHinzu() {
    _showTermintypModal(null);
}

export async function hqTermintypBearbeiten(id) {
    var { data } = await _sb().from('hq_termintypen').select('*').eq('id', id).single();
    if (data) _showTermintypModal(data);
}

function _showTermintypModal(existing) {
    var isEdit = !!existing;
    var html = '<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" id="typModal">'
        + '<div class="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">'
        + '<h3 class="font-semibold text-gray-800 mb-4">' + (isEdit ? 'Termintyp bearbeiten' : 'Neuer Termintyp') + '</h3>'
        + '<div class="space-y-3">'
        + '  <div><label class="text-xs font-medium text-gray-600">Name</label>'
        + '    <input type="text" id="typName" value="' + _escH(existing ? existing.name : '') + '" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="z.B. Strategie-Gespraech"></div>'
        + '  <div><label class="text-xs font-medium text-gray-600">Beschreibung</label>'
        + '    <input type="text" id="typBeschr" value="' + _escH(existing ? existing.beschreibung || '' : '') + '" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>'
        + '  <div class="grid grid-cols-3 gap-3">'
        + '    <div><label class="text-xs font-medium text-gray-600">Dauer (Min)</label>'
        + '      <input type="number" id="typDauer" value="' + (existing ? existing.dauer_min : 30) + '" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>'
        + '    <div><label class="text-xs font-medium text-gray-600">Puffer (Min)</label>'
        + '      <input type="number" id="typPuffer" value="' + (existing ? existing.puffer_min : 10) + '" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>'
        + '    <div><label class="text-xs font-medium text-gray-600">Vorlauf (Std)</label>'
        + '      <input type="number" id="typVorlauf" value="' + (existing ? existing.vorlaufzeit_h : 24) + '" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>'
        + '  </div>'
        + '  <div class="grid grid-cols-2 gap-3">'
        + '    <div><label class="text-xs font-medium text-gray-600">Farbe</label>'
        + '      <input type="color" id="typFarbe" value="' + (existing ? existing.farbe || '#EF7D00' : '#EF7D00') + '" class="w-full mt-1 h-10 border rounded-lg"></div>'
        + '    <div class="flex items-end pb-1"><label class="flex items-center gap-2 text-sm text-gray-700">'
        + '      <input type="checkbox" id="typTeams" ' + (existing ? (existing.teams_meeting ? 'checked' : '') : 'checked') + '> Teams Meeting</label></div>'
        + '  </div>'
        + '</div>'
        + '<div class="flex gap-3 mt-6">'
        + '  <button onclick="document.getElementById(\'typModal\').remove()" class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Abbrechen</button>'
        + '  <button onclick="hqTermintypSpeichern(' + (isEdit ? "'" + existing.id + "'" : 'null') + ')" class="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">Speichern</button>'
        + '</div>'
        + '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

export async function hqTermintypSpeichern(id) {
    var payload = {
        name: document.getElementById('typName').value.trim(),
        beschreibung: document.getElementById('typBeschr').value.trim() || null,
        dauer_min: parseInt(document.getElementById('typDauer').value) || 30,
        puffer_min: parseInt(document.getElementById('typPuffer').value) || 10,
        vorlaufzeit_h: parseInt(document.getElementById('typVorlauf').value) || 24,
        farbe: document.getElementById('typFarbe').value,
        teams_meeting: document.getElementById('typTeams').checked
    };
    if (!payload.name) { _showToast('Name erforderlich', 'error'); return; }

    var error;
    if (id) {
        var res = await _sb().from('hq_termintypen').update(payload).eq('id', id);
        error = res.error;
    } else {
        payload.erstellt_von = _sbProfile().id;
        var res2 = await _sb().from('hq_termintypen').insert(payload);
        error = res2.error;
    }
    if (error) { _showToast('Fehler: ' + error.message, 'error'); return; }

    var modal = document.getElementById('typModal');
    if (modal) modal.remove();
    _showToast('Termintyp gespeichert!', 'success');
    _loadTermintypen();
}

export async function hqTermintypToggle(id, aktiv) {
    await _sb().from('hq_termintypen').update({ aktiv: aktiv }).eq('id', id);
    _showToast(aktiv ? 'Aktiviert' : 'Deaktiviert', 'info');
    _loadTermintypen();
}

export function hqBuchungsLinkErstellen() {
    // Termintypen laden fuer Dropdown
    _sb().from('hq_termintypen').select('id, name').eq('aktiv', true).order('name').then(function(res) {
        var typen = res.data || [];
        var optionsHtml = typen.map(function(t) { return '<option value="' + t.id + '">' + _escH(t.name) + '</option>'; }).join('');

        var html = '<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" id="linkModal">'
            + '<div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">'
            + '<h3 class="font-semibold text-gray-800 mb-4">Buchungslink erstellen</h3>'
            + '<div class="space-y-3">'
            + '  <div><label class="text-xs font-medium text-gray-600">Termintyp</label>'
            + '    <select id="linkTyp" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm">' + optionsHtml + '</select></div>'
            + '  <div><label class="text-xs font-medium text-gray-600">Titel (optional)</label>'
            + '    <input type="text" id="linkTitel" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="z.B. Meine Finanz-Sprechstunde"></div>'
            + '  <div><label class="text-xs font-medium text-gray-600">Beschreibung (optional)</label>'
            + '    <input type="text" id="linkBeschr" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Kurze Info fuer Partner"></div>'
            + '</div>'
            + '<div class="flex gap-3 mt-6">'
            + '  <button onclick="document.getElementById(\'linkModal\').remove()" class="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Abbrechen</button>'
            + '  <button onclick="hqBuchungsLinkSpeichern()" class="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">Erstellen</button>'
            + '</div>'
            + '</div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
    });
}

export async function hqBuchungsLinkSpeichern() {
    var slug = 'bk-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
    var { error } = await _sb().from('hq_buchungslinks').insert({
        user_id: _sbProfile().id,
        termintyp_id: document.getElementById('linkTyp').value,
        slug: slug,
        titel: document.getElementById('linkTitel').value.trim() || null,
        beschreibung: document.getElementById('linkBeschr').value.trim() || null
    });
    if (error) { _showToast('Fehler: ' + error.message, 'error'); return; }

    var modal = document.getElementById('linkModal');
    if (modal) modal.remove();
    _showToast('Buchungslink erstellt!', 'success');
    _loadBuchungslinks();
}

export function hqCopyLink(id) {
    var input = document.getElementById('link_' + id);
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(function() {
        _showToast('Link kopiert!', 'success');
    }).catch(function() {
        input.select();
        document.execCommand('copy');
        _showToast('Link kopiert!', 'success');
    });
}

// =============================================
// PARTNER: HAUPTANSICHT
// =============================================

export async function renderPartnerBuchungen() {
    var container = document.getElementById('hqBuchungenView');
    if (!container) return;

    container.innerHTML = '<div class="max-w-4xl mx-auto">'
        + '<div class="mb-6">'
        + '  <h1 class="h1-headline text-gray-800 mb-1">Termine</h1>'
        + '  <p class="text-sm text-gray-500">Sprechstunden mit dem HQ buchen und verwalten</p>'
        + '</div>'
        + '<div class="flex gap-1 border-b border-gray-200 mb-6" id="partnerBuchTabs">'
        + '  <button onclick="showPartnerBuchTab(\'buchen\')" class="px-4 py-2.5 text-sm font-medium border-b-2 border-orange-500 text-orange-600">Termin buchen</button>'
        + '  <button onclick="showPartnerBuchTab(\'meine\')" class="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700">Meine Termine</button>'
        + '</div>'
        + '<div id="partnerBuchContent"></div>'
        + '</div>';

    showPartnerBuchTab('buchen');
}

export function showPartnerBuchTab(tab) {
    var tabs = document.querySelectorAll('#partnerBuchTabs button');
    for (var i = 0; i < tabs.length; i++) {
        var isActive = tabs[i].getAttribute('onclick').indexOf("'" + tab + "'") !== -1;
        tabs[i].className = 'px-4 py-2.5 text-sm font-medium border-b-2 transition '
            + (isActive ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700');
    }
    if (tab === 'buchen') _renderBuchungFlow();
    else if (tab === 'meine') _loadPartnerTermine();
}

// =============================================
// PARTNER: BUCHUNGS-FLOW (4 SCHRITTE)
// =============================================

async function _renderBuchungFlow() {
    var c = document.getElementById('partnerBuchContent');
    if (!c) return;
    _buchungStep = 1;
    _buchungSelection = { termintyp: null, hqUser: null, datum: null, slot: null, thema: '' };

    // Schritt 1: Termintypen laden
    var { data: typen } = await _sb().from('hq_termintypen').select('*').eq('aktiv', true).order('name');

    var html = '<div id="buchungFlowSteps">'
        + '<div class="flex items-center gap-2 mb-6">'
        + '  <span class="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">1</span>'
        + '  <span class="text-sm font-medium text-gray-700">Termintyp waehlen</span>'
        + '  <span class="text-gray-300 mx-1">&rarr;</span>'
        + '  <span class="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold">2</span>'
        + '  <span class="text-sm text-gray-400">Person</span>'
        + '  <span class="text-gray-300 mx-1">&rarr;</span>'
        + '  <span class="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold">3</span>'
        + '  <span class="text-sm text-gray-400">Datum & Zeit</span>'
        + '  <span class="text-gray-300 mx-1">&rarr;</span>'
        + '  <span class="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-bold">4</span>'
        + '  <span class="text-sm text-gray-400">Abschicken</span>'
        + '</div>'
        + '<div id="buchungFlowContent"></div>'
        + '</div>';

    c.innerHTML = html;

    // Termintyp-Cards
    if (!typen || typen.length === 0) {
        document.getElementById('buchungFlowContent').innerHTML = '<p class="text-gray-400">Aktuell keine Termintypen verfuegbar.</p>';
        return;
    }

    var cardsHtml = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
    for (var i = 0; i < typen.length; i++) {
        var t = typen[i];
        cardsHtml += '<button onclick="partnerSelectTermintyp(\'' + t.id + '\')" class="vit-card p-5 text-left hover:shadow-md transition border-l-4" style="border-left-color:' + _escH(t.farbe || '#EF7D00') + '">'
            + '<h4 class="font-semibold text-gray-800">' + _escH(t.name) + '</h4>'
            + '<p class="text-xs text-gray-500 mt-1">' + _escH(t.beschreibung || '') + '</p>'
            + '<div class="flex gap-3 mt-3 text-xs text-gray-400">'
            + '  <span>' + t.dauer_min + ' Min.</span>'
            + (t.teams_meeting ? '  <span class="text-blue-500">Teams Meeting</span>' : '')
            + '</div>'
            + '</button>';
    }
    cardsHtml += '</div>';
    document.getElementById('buchungFlowContent').innerHTML = cardsHtml;
}

export async function partnerSelectTermintyp(typId) {
    var { data: typ } = await _sb().from('hq_termintypen').select('*').eq('id', typId).single();
    if (!typ) return;
    _buchungSelection.termintyp = typ;
    _buchungStep = 2;

    // Schritt 2: HQ-User waehlen (die Verfuegbarkeit eingetragen haben)
    var { data: verfuegbar } = await _sb().from('hq_verfuegbarkeit').select('user_id').order('user_id');
    var userIds = [];
    for (var i = 0; i < (verfuegbar || []).length; i++) {
        if (userIds.indexOf(verfuegbar[i].user_id) === -1) userIds.push(verfuegbar[i].user_id);
    }

    if (userIds.length === 0) {
        document.getElementById('buchungFlowContent').innerHTML = '<p class="text-gray-400">Aktuell ist kein HQ-Mitarbeiter verfuegbar.</p>'
            + '<button onclick="showPartnerBuchTab(\'buchen\')" class="mt-4 text-sm text-orange-600 hover:underline">&larr; Zurueck</button>';
        return;
    }

    var { data: users } = await _sb().from('users').select('id, vorname, nachname, email, ms365_email').in('id', userIds);

    var html = '<button onclick="showPartnerBuchTab(\'buchen\')" class="text-sm text-orange-600 hover:underline mb-4 inline-block">&larr; Zurueck</button>'
        + '<h3 class="font-semibold text-gray-800 mb-3">Mit wem moechtest du sprechen?</h3>'
        + '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';

    for (var j = 0; j < (users || []).length; j++) {
        var u = users[j];
        var name = (_escH(u.vorname || '') + ' ' + _escH(u.nachname || '')).trim() || _escH(u.email);
        html += '<button onclick="partnerSelectHqUser(\'' + u.id + '\')" class="vit-card p-4 text-left hover:shadow-md transition">'
            + '<div class="font-semibold text-gray-800">' + name + '</div>'
            + '<div class="text-xs text-gray-500 mt-0.5">' + _escH(u.email || '') + '</div>'
            + (u.ms365_email ? '<div class="text-xs text-green-500 mt-0.5">Outlook verbunden</div>' : '')
            + '</button>';
    }
    html += '</div>';
    document.getElementById('buchungFlowContent').innerHTML = html;
}

export async function partnerSelectHqUser(userId) {
    _buchungSelection.hqUser = userId;
    _buchungStep = 3;

    // Schritt 3: Datum waehlen und Slots laden
    var today = new Date();
    var defaultDate = new Date(today);
    defaultDate.setDate(defaultDate.getDate() + 1);
    var dateStr = defaultDate.toISOString().split('T')[0];

    var html = '<button onclick="partnerSelectTermintyp(\'' + _buchungSelection.termintyp.id + '\')" class="text-sm text-orange-600 hover:underline mb-4 inline-block">&larr; Zurueck</button>'
        + '<h3 class="font-semibold text-gray-800 mb-3">Datum und Uhrzeit waehlen</h3>'
        + '<div class="mb-4">'
        + '  <label class="text-xs font-medium text-gray-600">Datum</label>'
        + '  <input type="date" id="buchungDatum" value="' + dateStr + '" min="' + today.toISOString().split('T')[0] + '" '
        + '    onchange="partnerLadeSlots()" class="mt-1 px-3 py-2 border rounded-lg text-sm">'
        + '</div>'
        + '<div id="buchungSlotsContainer"><p class="text-gray-400 text-sm">Lade freie Slots...</p></div>';

    document.getElementById('buchungFlowContent').innerHTML = html;
    partnerLadeSlots();
}

export async function partnerLadeSlots() {
    var slotsContainer = document.getElementById('buchungSlotsContainer');
    if (!slotsContainer) return;
    slotsContainer.innerHTML = '<p class="text-gray-400 text-sm">Lade freie Slots...</p>';

    var datum = document.getElementById('buchungDatum').value;
    if (!datum) return;

    // 7 Tage ab gewaehltem Datum laden
    var vonDate = new Date(datum);
    var bisDate = new Date(vonDate);
    bisDate.setDate(bisDate.getDate() + 6);

    var result = await _edgeFn('buchung-slots', {
        hq_user_id: _buchungSelection.hqUser,
        termintyp_id: _buchungSelection.termintyp.id,
        von_datum: vonDate.toISOString().split('T')[0],
        bis_datum: bisDate.toISOString().split('T')[0]
    });

    if (result.error) {
        slotsContainer.innerHTML = '<p class="text-red-500 text-sm">Fehler: ' + _escH(result.error) + '</p>';
        return;
    }

    _buchungSlots = result.slots || [];

    if (_buchungSlots.length === 0) {
        slotsContainer.innerHTML = '<div class="vit-card p-6 text-center text-gray-400">'
            + '<p>Keine freien Slots in diesem Zeitraum.</p>'
            + '<p class="text-xs mt-1">Versuche ein anderes Datum oder einen anderen HQ-Mitarbeiter.</p>'
            + '</div>';
        return;
    }

    // Slots gruppiert nach Tag anzeigen
    var byDay = {};
    for (var i = 0; i < _buchungSlots.length; i++) {
        var s = _buchungSlots[i];
        var dayKey = new Date(s.start).toISOString().split('T')[0];
        if (!byDay[dayKey]) byDay[dayKey] = [];
        byDay[dayKey].push(s);
    }

    var html = '';
    if (result.slots && result.slots[0] && result.slots[0].outlook_sync) {
        html += '<div class="flex items-center gap-1 text-xs text-green-600 mb-3">'
            + '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
            + 'Live-Sync mit Outlook Kalender aktiv'
            + '</div>';
    }

    var days = Object.keys(byDay).sort();
    for (var d = 0; d < days.length; d++) {
        var daySlots = byDay[days[d]];
        var dayLabel = new Date(days[d]).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
        html += '<div class="mb-4">'
            + '<h4 class="text-sm font-medium text-gray-700 mb-2">' + dayLabel + '</h4>'
            + '<div class="flex flex-wrap gap-2">';
        for (var k = 0; k < daySlots.length; k++) {
            var slot = daySlots[k];
            var zeit = new Date(slot.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
            html += '<button onclick="partnerSelectSlot(\'' + slot.start + '\',\'' + slot.end + '\')" '
                + 'class="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-orange-400 hover:bg-orange-50 transition">'
                + zeit + '</button>';
        }
        html += '</div></div>';
    }

    slotsContainer.innerHTML = html;
}

export function partnerSelectSlot(start, end) {
    _buchungSelection.slot = { start: start, end: end };
    _buchungStep = 4;

    // Schritt 4: Thema + Abschicken
    var slotLabel = _fmtDatum(start) + ' ' + _fmtZeit(start) + ' - ' + _fmtZeit(end);

    var html = '<button onclick="partnerSelectHqUser(\'' + _buchungSelection.hqUser + '\')" class="text-sm text-orange-600 hover:underline mb-4 inline-block">&larr; Zurueck</button>'
        + '<div class="vit-card p-6">'
        + '<h3 class="font-semibold text-gray-800 mb-4">Buchung abschliessen</h3>'
        + '<div class="space-y-3 mb-6">'
        + '  <div class="flex justify-between text-sm"><span class="text-gray-500">Termintyp:</span><span class="font-medium">' + _escH(_buchungSelection.termintyp.name) + '</span></div>'
        + '  <div class="flex justify-between text-sm"><span class="text-gray-500">Datum/Zeit:</span><span class="font-medium">' + slotLabel + '</span></div>'
        + '  <div class="flex justify-between text-sm"><span class="text-gray-500">Dauer:</span><span class="font-medium">' + _buchungSelection.termintyp.dauer_min + ' Minuten</span></div>'
        + (_buchungSelection.termintyp.teams_meeting ? '  <div class="flex justify-between text-sm"><span class="text-gray-500">Meeting:</span><span class="font-medium text-blue-600">Teams Link wird erstellt</span></div>' : '')
        + '</div>'
        + '<div class="mb-6">'
        + '  <label class="text-xs font-medium text-gray-600">Thema / Notizen (optional)</label>'
        + '  <textarea id="buchungThema" rows="3" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Worum soll es gehen?"></textarea>'
        + '</div>'
        + '<button onclick="partnerBuchen()" id="buchungSubmitBtn" class="w-full px-4 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition">Termin anfragen</button>'
        + '</div>';

    document.getElementById('buchungFlowContent').innerHTML = html;
}

export async function partnerBuchen() {
    var btn = document.getElementById('buchungSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Wird gesendet...'; }

    var thema = document.getElementById('buchungThema') ? document.getElementById('buchungThema').value.trim() : '';
    var profile = _sbProfile();

    var result = await _edgeFn('buchung-erstellen', {
        hq_user_id: _buchungSelection.hqUser,
        termintyp_id: _buchungSelection.termintyp.id,
        standort_id: profile.standort_id || null,
        partner_user_id: profile.id,
        start_at: _buchungSelection.slot.start,
        thema: thema
    });

    if (result.error) {
        _showToast('Fehler: ' + result.error, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Termin anfragen'; }
        return;
    }

    // Erfolg
    var buchung = result.buchung;
    var successHtml = '<div class="vit-card p-8 text-center">'
        + '<div class="text-4xl mb-3">&#10003;</div>'
        + '<h3 class="text-xl font-bold text-gray-800 mb-2">Buchungsanfrage gesendet!</h3>'
        + '<p class="text-sm text-gray-500 mb-4">Deine Anfrage wurde an das HQ geschickt. Du erhaeltst eine Bestaetigung per E-Mail.</p>'
        + '<div class="text-sm text-gray-600 space-y-1">'
        + '  <div><span class="font-medium">Buchungsnr.:</span> ' + _escH(buchung.buchungs_nr || '') + '</div>'
        + '  <div><span class="font-medium">Termin:</span> ' + _fmtDatum(buchung.start_at) + ' ' + _fmtZeit(buchung.start_at) + '</div>'
        + (buchung.ms365_teams_link ? '  <div><a href="' + _escH(buchung.ms365_teams_link) + '" target="_blank" class="text-blue-600 hover:underline">Teams Meeting Link</a></div>' : '')
        + '</div>'
        + '<button onclick="showPartnerBuchTab(\'meine\')" class="mt-6 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Meine Termine anzeigen</button>'
        + '</div>';

    document.getElementById('buchungFlowContent').innerHTML = successHtml;
    _showToast('Buchungsanfrage gesendet!', 'success');
}

// =============================================
// PARTNER: MEINE TERMINE
// =============================================

async function _loadPartnerTermine() {
    var c = document.getElementById('partnerBuchContent');
    if (!c) return;
    c.innerHTML = '<p class="text-gray-400 text-sm">Lade deine Termine...</p>';

    var profile = _sbProfile();
    var { data } = await _sb().from('hq_buchungen')
        .select('*, termintyp:hq_termintypen(name, dauer_min, farbe), hq_user:users!hq_buchungen_hq_user_id_fkey(vorname, nachname, email)')
        .or('partner_user_id.eq.' + profile.id + ',standort_id.eq.' + (profile.standort_id || '00000000-0000-0000-0000-000000000000'))
        .order('start_at', { ascending: false })
        .limit(50);

    if (!data || data.length === 0) {
        c.innerHTML = '<div class="vit-card p-8 text-center text-gray-400"><p>Noch keine Termine.</p><button onclick="showPartnerBuchTab(\'buchen\')" class="mt-3 text-sm text-orange-600 hover:underline">Jetzt Termin buchen</button></div>';
        return;
    }

    var html = '<div class="space-y-3">';
    for (var i = 0; i < data.length; i++) {
        var b = data[i];
        var hqName = b.hq_user ? (_escH(b.hq_user.vorname || '') + ' ' + _escH(b.hq_user.nachname || '')).trim() : '-';
        html += '<div class="vit-card p-4 border-l-4" style="border-left-color:' + _escH(b.termintyp ? b.termintyp.farbe : '#EF7D00') + '">'
            + '<div class="flex items-start justify-between">'
            + '  <div>'
            + '    <div class="flex items-center gap-2 mb-1">'
            + '      <span class="font-semibold text-gray-800">' + _escH(b.termintyp ? b.termintyp.name : '-') + '</span>'
            + '      ' + _statusBadge(b.status)
            + '    </div>'
            + '    <div class="text-sm text-gray-600 space-y-0.5">'
            + '      <div>' + _fmtDatum(b.start_at) + ' ' + _fmtZeit(b.start_at) + ' - ' + _fmtZeit(b.end_at) + '</div>'
            + '      <div>Ansprechpartner: ' + hqName + '</div>'
            + (b.thema ? '      <div>Thema: ' + _escH(b.thema) + '</div>' : '')
            + '    </div>'
            + (b.ms365_teams_link ? '    <a href="' + _escH(b.ms365_teams_link) + '" target="_blank" class="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">Teams Meeting beitreten</a>' : '')
            + '  </div>'
            + '  <span class="text-xs text-gray-400">' + _escH(b.buchungs_nr || '') + '</span>'
            + '</div>'
            + '</div>';
    }
    html += '</div>';
    c.innerHTML = html;
}

// =============================================
// MS365 CALLBACK HANDLING
// =============================================

function _checkMs365Callback() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('ms365_success') === '1') {
        _showToast('Microsoft 365 erfolgreich verbunden!', 'success');
        // URL sauber machen
        var url = new URL(window.location.href);
        url.searchParams.delete('ms365_success');
        url.searchParams.delete('view');
        window.history.replaceState({}, '', url.pathname);
    }
    if (params.get('ms365_error')) {
        _showToast('MS365-Verbindung fehlgeschlagen: ' + params.get('ms365_error'), 'error');
        var url2 = new URL(window.location.href);
        url2.searchParams.delete('ms365_error');
        window.history.replaceState({}, '', url2.pathname);
    }
}

// Check on load
try { _checkMs365Callback(); } catch(e) {}

// =============================================
// EXPORTS
// =============================================

var _exports = {
    renderHqBuchungen: renderHqBuchungen,
    renderPartnerBuchungen: renderPartnerBuchungen,
    showBuchungTab: showBuchungTab,
    showPartnerBuchTab: showPartnerBuchTab,
    hqMs365Connect: hqMs365Connect,
    hqBuchungBestaetigen: hqBuchungBestaetigen,
    hqBuchungAblehnenDialog: hqBuchungAblehnenDialog,
    hqBuchungAblehnen: hqBuchungAblehnen,
    hqVerfuegbarkeitHinzu: hqVerfuegbarkeitHinzu,
    hqVerfuegbarkeitSpeichern: hqVerfuegbarkeitSpeichern,
    hqVerfuegbarkeitLoeschen: hqVerfuegbarkeitLoeschen,
    hqSperrzeitHinzu: hqSperrzeitHinzu,
    hqSperrzeitSpeichern: hqSperrzeitSpeichern,
    hqSperrzeitLoeschen: hqSperrzeitLoeschen,
    hqTermintypHinzu: hqTermintypHinzu,
    hqTermintypBearbeiten: hqTermintypBearbeiten,
    hqTermintypSpeichern: hqTermintypSpeichern,
    hqTermintypToggle: hqTermintypToggle,
    hqBuchungsLinkErstellen: hqBuchungsLinkErstellen,
    hqBuchungsLinkSpeichern: hqBuchungsLinkSpeichern,
    hqCopyLink: hqCopyLink,
    partnerSelectTermintyp: partnerSelectTermintyp,
    partnerSelectHqUser: partnerSelectHqUser,
    partnerSelectSlot: partnerSelectSlot,
    partnerLadeSlots: partnerLadeSlots,
    partnerBuchen: partnerBuchen
};

Object.entries(_exports).forEach(function(pair) { window[pair[0]] = pair[1]; });
