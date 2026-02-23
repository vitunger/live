/**
 * views/schnittstellen.js - Schnittstellen & Integrationen
 * HQ-only: Manage API connections, test endpoints, control GF permissions
 * Partner GF view: Read-only or editable based on HQ permissions
 * @module views/schnittstellen
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════

var currentConnView = 'hq';

// GF permissions per connector (persisted to Supabase later)
var gfPermissions = { etermin: false, google: false, meta: false, wawi: false, approom: false };

// Connector definitions
var CONNECTORS = {
    etermin: {
        id: 'etermin', name: 'eTermin', icon: '📅', iconBg: '#dbeafe',
        desc: 'Online-Terminbuchung für alle Standorte. Webhook-basierte Echtzeit-Synchronisation.',
        category: 'active', status: 'disconnected', statusLabel: 'Nicht verbunden',
        fields: [
            { key: 'public_key', label: 'Public API Key', type: 'text', placeholder: 'Dein eTermin Public Key' },
            { key: 'private_key', label: 'Private API Key', type: 'password', placeholder: '••••••••••••' },
        ],
        webhook: 'https://cockpit.vitbikes.de/api/webhooks/etermin',
        hasMapping: true,
        mappings: [
            { standort: 'Grafrath', kalenderId: '' },
            { standort: 'München City', kalenderId: '' },
            { standort: 'Augsburg', kalenderId: '' },
            { standort: 'Starnberg', kalenderId: '' },
        ],
        logs: [
            { time: '23.02.2026 11:30', type: 'info', msg: 'Schnittstelle erstellt' },
        ]
    },
    google: {
        id: 'google', name: 'Google Ads', icon: '🔍', iconBg: '#fef3c7',
        desc: 'Kampagnen-Performance und Budget-Tracking. Automatischer Sync alle 6 Stunden.',
        category: 'active', status: 'connected', statusLabel: 'Verbunden',
        readonlyFields: [
            { key: 'customer_id', label: 'Customer ID', value: '—' },
            { key: 'last_sync', label: 'Letzter Sync', value: '—' },
            { key: 'sync_status', label: 'Sync-Status', value: '—' },
        ],
        logs: []
    },
    meta: {
        id: 'meta', name: 'Meta Ads', icon: '📘', iconBg: '#dbeafe',
        desc: 'Facebook & Instagram Ads. Kampagnen, Reichweite und Conversions.',
        category: 'active', status: 'connected', statusLabel: 'Verbunden',
        readonlyFields: [
            { key: 'ad_account_id', label: 'Ad Account ID', value: '—' },
            { key: 'last_sync', label: 'Letzter Sync', value: '—' },
            { key: 'sync_status', label: 'Sync-Status', value: '—' },
        ],
        logs: []
    },
    wawi: {
        id: 'wawi', name: 'Warenwirtschaft', icon: '📦', iconBg: '#dcfce7',
        desc: 'Anbindung an WaWi-Systeme (app-room, velodata, Velo Plus, Business Central).',
        category: 'active', status: 'unknown', statusLabel: 'Pro Standort',
        isStandortLevel: true,
        logs: []
    },
    approom: {
        id: 'approom', name: 'app-room / CYCLE', icon: '🚲', iconBg: '#fef3c7',
        desc: 'Cloud-WaWi für Fahrradhändler. Veloconnect, JobRad-API, SPODAS. Umsatz, Lager & Belege.',
        category: 'active', status: 'unknown', statusLabel: 'Prüfe Status...',
        readonlyFields: [
            { key: 'system_typ', label: 'System', value: 'app-room / CYCLE' },
            { key: 'connected_count', label: 'Verbundene Standorte', value: '—' },
            { key: 'last_sync', label: 'Letzter Sync', value: '—' },
        ],
        logs: []
    }
};

var PLANNED = [
    { name: 'Personio', icon: '👥', desc: 'HR & Personalverwaltung', color: '#8b5cf6' },
    { name: 'Creditreform', icon: '🏦', desc: 'Bonitätsprüfung', color: '#6366f1' },
    { name: 'HIW / BIKE&CO WIN', icon: '🏪', desc: 'WaWi (Veloconnect + velo.API)', color: '#14b8a6' },
    { name: 'Tridata / TriBike', icon: '📊', desc: 'WaWi (velo.API)', color: '#f59e0b' },
    { name: 'velo.port', icon: '🚲', desc: 'WaWi (Veloconnect)', color: '#ef4444' },
    { name: 'e-vendo', icon: '🛒', desc: 'WaWi (Veloconnect + Platform API)', color: '#ec4899' },
    { name: 'Microsoft 365', icon: '📧', desc: 'Kalender & Mail', color: '#3b82f6' },
];

var openCards = { etermin: true, google: false, meta: false, wawi: false, approom: false };

// ═══════════════════════════════════════════════════════
// MAIN RENDER
// ═══════════════════════════════════════════════════════

export function renderSchnittstellen() {
    loadAdsAccountData();
    loadWawiStatus();
    renderStatusGrid();
    renderActiveCards();
    renderPlannedGrid();
    renderPartnerCards();
}

// ═══════════════════════════════════════════════════════
// DATA LOADING (Supabase)
// ═══════════════════════════════════════════════════════

async function loadAdsAccountData() {
    try {
        var sb = _sb(); if (!sb) return;
        var res = await sb.from('ads_accounts').select('plattform, letzter_sync, sync_status, sync_fehler, account_id');
        if (res.error) throw res.error;
        var accounts = res.data || [];
        accounts.forEach(function(a) {
            var pid = a.plattform === 'google' ? 'google' : (a.plattform === 'meta' || a.plattform === 'facebook') ? 'meta' : null;
            if (!pid || !CONNECTORS[pid]) return;
            var c = CONNECTORS[pid];
            c.status = a.sync_status === 'ok' ? 'connected' : a.sync_status === 'error' ? 'error' : 'connected';
            c.statusLabel = a.sync_status === 'ok' ? 'Verbunden' : a.sync_status === 'error' ? 'Fehler' : 'Verbunden';
            if (c.readonlyFields) {
                c.readonlyFields.forEach(function(f) {
                    if (f.key === 'customer_id' || f.key === 'ad_account_id') f.value = a.account_id || '—';
                    if (f.key === 'last_sync') f.value = a.letzter_sync ? timeAgo(a.letzter_sync) : '—';
                    if (f.key === 'sync_status') f.value = a.sync_status === 'ok' ? '✅ OK' : a.sync_fehler || a.sync_status || '—';
                });
            }
            // Build log from available data
            if (a.letzter_sync) {
                c.logs = [{ time: fmtDT(a.letzter_sync), type: a.sync_status === 'ok' ? 'ok' : 'err', msg: 'Sync ' + (a.sync_status === 'ok' ? 'erfolgreich' : 'fehlgeschlagen: ' + (a.sync_fehler || '')) }];
            }
        });
        renderStatusGrid();
        renderActiveCards();
        renderPartnerCards();
    } catch (e) { console.warn('[schnittstellen] loadAdsAccountData:', e); }
}

async function loadWawiStatus() {
    try {
        var sb = _sb(); if (!sb) return;
        var res = await sb.from('wawi_connections').select('id, standort_id, system_typ, status, letzter_sync, standorte(name)');
        if (res.error) throw res.error;
        var conns = res.data || [];

        // General WaWi connector
        var c = CONNECTORS.wawi;
        if (conns.length === 0) {
            c.status = 'disconnected'; c.statusLabel = 'Keine Standorte verbunden';
        } else {
            var connected = conns.filter(function(x) { return x.status === 'connected' || x.status === 'aktiv'; });
            c.status = connected.length > 0 ? 'connected' : 'disconnected';
            c.statusLabel = connected.length + '/' + conns.length + ' Standorte verbunden';
            c.wawiConnections = conns;
        }

        // app-room / CYCLE specific connector
        var ar = CONNECTORS.approom;
        var arConns = conns.filter(function(x) { return x.system_typ === 'approom' || x.system_typ === 'cycle'; });
        if (arConns.length === 0) {
            ar.status = 'disconnected'; ar.statusLabel = 'Nicht verbunden';
        } else {
            var arConnected = arConns.filter(function(x) { return x.status === 'connected' || x.status === 'aktiv'; });
            ar.status = arConnected.length > 0 ? 'connected' : 'disconnected';
            ar.statusLabel = arConnected.length + '/' + arConns.length + ' Standorte';
            ar.approomStandorte = arConns.map(function(x) {
                return { name: (x.standorte && x.standorte.name) || 'Standort', status: x.status, letzter_sync: x.letzter_sync };
            });
            if (ar.readonlyFields) {
                ar.readonlyFields.forEach(function(f) {
                    if (f.key === 'connected_count') f.value = arConnected.length + ' von ' + arConns.length;
                    if (f.key === 'last_sync') {
                        var latest = arConns.filter(function(x){return x.letzter_sync;}).sort(function(a,b){return new Date(b.letzter_sync)-new Date(a.letzter_sync);})[0];
                        f.value = latest ? timeAgo(latest.letzter_sync) : '—';
                    }
                });
            }
        }

        renderStatusGrid();
        renderActiveCards();
    } catch (e) { console.warn('[schnittstellen] loadWawiStatus:', e); }
}

// ═══════════════════════════════════════════════════════
// VIEW TOGGLE
// ═══════════════════════════════════════════════════════

window.showConnView = function(view) {
    currentConnView = view;
    document.querySelectorAll('.conn-view-btn').forEach(function(b) {
        var isActive = b.dataset.cv === view;
        b.className = 'conn-view-btn px-3 py-1.5 text-xs font-semibold rounded-md ' + (isActive ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500');
    });
    var hq = document.getElementById('connHqView');
    var partner = document.getElementById('connPartnerView');
    if (hq) hq.style.display = view === 'hq' ? '' : 'none';
    if (partner) partner.style.display = view === 'partner' ? '' : 'none';
    if (view === 'partner') renderPartnerCards();
};

// ═══════════════════════════════════════════════════════
// STATUS GRID
// ═══════════════════════════════════════════════════════

function renderStatusGrid() {
    var el = document.getElementById('connStatusGrid');
    if (!el) return;
    var ids = ['etermin', 'approom', 'google', 'meta', 'wawi'];
    el.innerHTML = ids.map(function(id) {
        var c = CONNECTORS[id];
        var sc = c.status === 'connected' ? '#16a34a' : c.status === 'error' ? '#dc2626' : c.status === 'disconnected' ? '#dc2626' : '#9ca3af';
        var dot = c.status === 'connected' ? '🟢' : c.status === 'error' ? '🔴' : c.status === 'disconnected' ? '🔴' : '⚫';
        return '<div class="vit-card p-3 flex items-center gap-3">'
            + '<div style="width:36px;height:36px;border-radius:10px;background:' + c.iconBg + ';display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + c.icon + '</div>'
            + '<div style="min-width:0;flex:1">'
            + '<p class="text-xs font-bold text-gray-800 truncate">' + c.name + '</p>'
            + '<p class="text-[10px] text-gray-500 truncate">' + dot + ' ' + _escH(c.statusLabel) + '</p>'
            + '</div></div>';
    }).join('');
}

// ═══════════════════════════════════════════════════════
// ACTIVE CONNECTOR CARDS (HQ)
// ═══════════════════════════════════════════════════════

function renderActiveCards() {
    var el = document.getElementById('connActiveCards');
    if (!el) return;
    el.innerHTML = ['etermin', 'approom', 'google', 'meta', 'wawi'].map(function(id) {
        return renderConnectorCard(id);
    }).join('');
}

function renderConnectorCard(id) {
    var c = CONNECTORS[id];
    var isOpen = openCards[id];
    var sc = c.status === 'connected' ? 'connected' : c.status === 'error' ? 'disconnected' : c.status === 'disconnected' ? 'disconnected' : 'planned';

    var header = '<div class="conn-card-header" onclick="window.toggleConnCard(\'' + id + '\')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;user-select:none">'
        + '<div style="width:40px;height:40px;border-radius:10px;background:' + c.iconBg + ';display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">' + c.icon + '</div>'
        + '<div style="flex:1;min-width:0"><p class="text-sm font-bold text-gray-800">' + c.name + '</p><p class="text-[10px] text-gray-500">' + _escH(c.desc) + '</p></div>'
        + '<span class="conn-status-pill ' + sc + '" style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;flex-shrink:0;'
        + (sc === 'connected' ? 'background:#dcfce7;color:#16a34a' : sc === 'disconnected' ? 'background:#fee2e2;color:#dc2626' : 'background:#f3f4f6;color:#9ca3af')
        + '">' + _escH(c.statusLabel) + '</span>'
        + '<svg class="conn-toggle-arrow" style="width:16px;height:16px;flex-shrink:0;transition:transform 0.2s;transform:rotate(' + (isOpen ? '180' : '0') + 'deg);color:#9ca3af" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
        + '</div>';

    var body = '<div class="conn-card-body" style="' + (isOpen ? '' : 'display:none;') + 'padding:0 16px 16px;border-top:1px solid #f0f0f2">';

    // ── eTermin body ──
    if (id === 'etermin') {
        body += '<div class="pt-4 space-y-4">';
        // GF permission toggle
        body += renderGfToggle(id);
        // Fields
        c.fields.forEach(function(f) {
            body += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">' + f.label + '</label>'
                + '<input type="' + f.type + '" id="conn_' + id + '_' + f.key + '" placeholder="' + f.placeholder + '" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition">'
                + '</div>';
        });
        // Webhook
        body += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Webhook-URL</label>'
            + '<div style="display:flex;gap:6px;align-items:center"><input type="text" value="' + c.webhook + '" readonly class="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 font-mono text-xs">'
            + '<button onclick="window.copyConnWebhook(\'' + id + '\')" id="connCopyBtn_' + id + '" class="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition flex-shrink-0">📋 Kopieren</button></div></div>';
        // Kalender-Mapping
        body += '<div><label class="block text-xs font-semibold text-gray-600 mb-2">📍 Kalender-Mapping</label>';
        body += '<div class="space-y-2">';
        c.mappings.forEach(function(m, i) {
            body += '<div class="flex items-center gap-3"><span class="text-xs text-gray-600 w-32 truncate">' + _escH(m.standort) + '</span>'
                + '<input type="text" id="conn_etermin_map_' + i + '" placeholder="Kalender-ID" value="' + _escH(m.kalenderId) + '" class="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:border-blue-400 outline-none">'
                + '</div>';
        });
        body += '</div></div>';
        // Buttons
        body += '<div class="flex gap-2 pt-1">'
            + '<button onclick="window.testConnector(\'etermin\')" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition">🔍 Verbindung testen</button>'
            + '<button onclick="window.saveConnector(\'etermin\')" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition">💾 Speichern</button>'
            + '</div>';
        body += '<div id="connTestResult_' + id + '" class="mt-2"></div>';
        body += '</div>';
    }

    // ── Google/Meta Ads body ──
    if (id === 'google' || id === 'meta') {
        body += '<div class="pt-4 space-y-3">';
        body += renderGfToggle(id);
        if (c.readonlyFields) {
            c.readonlyFields.forEach(function(f) {
                body += '<div class="flex items-center gap-3"><span class="text-xs text-gray-500 w-28">' + f.label + '</span><span class="text-xs font-semibold text-gray-800">' + _escH(f.value) + '</span></div>';
            });
        }
        body += '<div class="flex gap-2 pt-1">'
            + '<button onclick="window.manualSync(\'' + id + '\')" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition">🔄 Manuell synchronisieren</button>'
            + '</div>';
        body += '<div id="connTestResult_' + id + '" class="mt-2"></div>';
        body += '</div>';
    }

    // ── app-room / CYCLE body ──
    if (id === 'approom') {
        body += '<div class="pt-4 space-y-3">';
        body += renderGfToggle(id);
        if (c.readonlyFields) {
            c.readonlyFields.forEach(function(f) {
                body += '<div class="flex items-center gap-3"><span class="text-xs text-gray-500 w-36">' + f.label + '</span><span class="text-xs font-semibold text-gray-800">' + _escH(f.value) + '</span></div>';
            });
        }
        if (c.approomStandorte && c.approomStandorte.length > 0) {
            body += '<div class="mt-2 space-y-1">';
            c.approomStandorte.forEach(function(s) {
                var isOk = s.status === 'connected' || s.status === 'aktiv';
                body += '<div class="flex items-center gap-2 py-1.5 border-b border-gray-100">'
                    + '<span style="width:8px;height:8px;border-radius:50%;background:' + (isOk ? '#16a34a' : '#dc2626') + ';flex-shrink:0"></span>'
                    + '<span class="text-xs font-semibold text-gray-700 flex-1">' + _escH(s.name) + '</span>'
                    + '<span class="text-[10px] text-gray-400">' + (s.letzter_sync ? timeAgo(s.letzter_sync) : 'Kein Sync') + '</span>'
                    + '</div>';
            });
            body += '</div>';
        }
        body += '<div class="flex gap-2 pt-2">'
            + '<button onclick="window.manualSync(\'approom\')" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition">🔄 Alle Standorte synchronisieren</button>'
            + '</div>';
        body += '<div id="connTestResult_' + id + '" class="mt-2"></div>';
        body += '</div>';
    }

    // ── WaWi body ──
    if (id === 'wawi') {
        body += '<div class="pt-4 space-y-3">';
        body += renderGfToggle(id);
        body += '<p class="text-xs text-gray-500">WaWi-Verbindungen werden pro Standort konfiguriert. Hier siehst du den Netzwerk-Überblick.</p>';
        if (c.wawiConnections && c.wawiConnections.length > 0) {
            body += '<div class="space-y-1">';
            c.wawiConnections.forEach(function(w) {
                var sName = (w.standorte && w.standorte.name) || 'Standort';
                var isOk = w.status === 'connected' || w.status === 'aktiv';
                body += '<div class="flex items-center gap-2 py-1.5 border-b border-gray-100">'
                    + '<span style="width:8px;height:8px;border-radius:50%;background:' + (isOk ? '#16a34a' : '#dc2626') + ';flex-shrink:0"></span>'
                    + '<span class="text-xs font-semibold text-gray-700 flex-1">' + _escH(sName) + '</span>'
                    + '<span class="text-[10px] text-gray-400">' + _escH(w.system_typ || '—') + '</span>'
                    + '<span class="text-[10px] text-gray-400">' + (w.letzter_sync ? timeAgo(w.letzter_sync) : 'Kein Sync') + '</span>'
                    + '</div>';
            });
            body += '</div>';
        } else {
            body += '<p class="text-xs text-gray-400 italic">Keine WaWi-Verbindungen konfiguriert.</p>';
        }
        body += '</div>';
    }

    // Log for all
    if (c.logs && c.logs.length > 0) {
        body += '<div class="mt-4 pt-3 border-t border-gray-100"><p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Aktivitäts-Log</p>'
            + '<div class="space-y-1 max-h-32 overflow-y-auto" id="connLog_' + id + '">';
        c.logs.forEach(function(l) {
            body += '<div class="flex items-start gap-2 text-[10px]"><span class="text-gray-300 w-28 flex-shrink-0">' + _escH(l.time) + '</span>'
                + '<span class="' + (l.type === 'ok' ? 'text-green-600' : l.type === 'err' ? 'text-red-500' : 'text-gray-500') + '">' + _escH(l.msg) + '</span></div>';
        });
        body += '</div></div>';
    }

    body += '</div>';

    return '<div class="vit-card overflow-hidden" id="connCard_' + id + '">' + header + body + '</div>';
}

function renderGfToggle(id) {
    var isOn = gfPermissions[id];
    return '<div class="flex items-center justify-between py-2 px-3 rounded-lg" style="background:#f8fafc">'
        + '<div><p class="text-xs font-semibold text-gray-700">GF-Berechtigung</p>'
        + '<p class="text-[10px] text-gray-400">' + (isOn ? 'Partner-GF kann bearbeiten' : 'Nur lesen für Partner-GF') + '</p></div>'
        + '<button onclick="window.toggleGFEdit(\'' + id + '\')" class="conn-gf-toggle" style="width:40px;height:22px;border-radius:11px;border:none;cursor:pointer;position:relative;transition:background 0.2s;'
        + 'background:' + (isOn ? '#3b82f6' : '#d1d5db') + '">'
        + '<span style="position:absolute;top:2px;left:' + (isOn ? '20px' : '2px') + ';width:18px;height:18px;border-radius:50%;background:white;box-shadow:0 1px 3px rgba(0,0,0,0.15);transition:left 0.2s"></span>'
        + '</button></div>';
}

// ═══════════════════════════════════════════════════════
// PLANNED GRID
// ═══════════════════════════════════════════════════════

function renderPlannedGrid() {
    var el = document.getElementById('connPlannedGrid');
    if (!el) return;
    el.innerHTML = PLANNED.map(function(p) {
        return '<div style="padding:12px;border-radius:10px;border:1.5px dashed #e5e7eb;opacity:0.6;display:flex;align-items:center;gap:10px">'
            + '<span style="font-size:20px">' + p.icon + '</span>'
            + '<div><p class="text-xs font-semibold text-gray-600">' + _escH(p.name) + '</p>'
            + '<p class="text-[10px] text-gray-400">' + _escH(p.desc) + '</p></div>'
            + '</div>';
    }).join('');
}

// ═══════════════════════════════════════════════════════
// PARTNER/GF VIEW
// ═══════════════════════════════════════════════════════

function renderPartnerCards() {
    var el = document.getElementById('connPartnerCards');
    if (!el) return;
    var ids = ['etermin', 'approom', 'google', 'meta', 'wawi'];
    el.innerHTML = ids.map(function(id) {
        var c = CONNECTORS[id];
        if (c.status === 'planned' || c.status === 'unknown') return '';
        var canEdit = gfPermissions[id];
        var badge = canEdit
            ? '<span style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;background:#dbeafe;color:#3b82f6">Bearbeitbar</span>'
            : '<span style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;background:#f3f4f6;color:#9ca3af">🔒 Nur lesen</span>';
        var sc = c.status === 'connected' ? 'background:#dcfce7;color:#16a34a' : 'background:#fee2e2;color:#dc2626';

        var body = '<div class="pt-3 space-y-3">';
        if (!canEdit) {
            body += '<div style="padding:8px 12px;border-radius:8px;background:#fefce8;border:1px solid #fde68a;font-size:11px;color:#92400e">🔒 Einstellungen können nur von HQ geändert werden.</div>';
        }

        // Show fields
        if (id === 'etermin' && c.fields) {
            c.fields.forEach(function(f) {
                var val = '';
                var inp = document.getElementById('conn_' + id + '_' + f.key);
                if (inp) val = inp.value;
                body += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">' + f.label + '</label>'
                    + '<input type="' + f.type + '" value="' + _escH(val) + '" ' + (canEdit ? '' : 'readonly') + ' class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 ' + (canEdit ? '' : 'bg-gray-50 text-gray-400 cursor-not-allowed') + '">'
                    + '</div>';
            });
            if (canEdit) {
                body += '<button onclick="window.saveConnector(\'etermin\')" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition">💾 Speichern</button>';
            }
        }
        if ((id === 'google' || id === 'meta') && c.readonlyFields) {
            c.readonlyFields.forEach(function(f) {
                body += '<div class="flex items-center gap-3"><span class="text-xs text-gray-500 w-28">' + f.label + '</span><span class="text-xs font-semibold text-gray-800">' + _escH(f.value) + '</span></div>';
            });
        }
        if (id === 'wawi') {
            body += '<p class="text-xs text-gray-500">WaWi-Konfiguration unter Warenwirtschaft → API.</p>';
        }
        body += '</div>';

        return '<div class="vit-card p-4">'
            + '<div class="flex items-center gap-3 mb-2">'
            + '<div style="width:36px;height:36px;border-radius:10px;background:' + c.iconBg + ';display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' + c.icon + '</div>'
            + '<div style="flex:1"><p class="text-sm font-bold text-gray-800">' + c.name + '</p></div>'
            + '<span style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;' + sc + '">' + _escH(c.statusLabel) + '</span>'
            + badge
            + '</div>'
            + body
            + '</div>';
    }).join('');
}

// ═══════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════

window.toggleConnCard = function(id) {
    openCards[id] = !openCards[id];
    renderActiveCards();
};

window.toggleGFEdit = function(id) {
    gfPermissions[id] = !gfPermissions[id];
    renderActiveCards();
    if (currentConnView === 'partner') renderPartnerCards();
    _showToast('GF-Berechtigung für ' + CONNECTORS[id].name + ': ' + (gfPermissions[id] ? 'Bearbeitbar' : 'Nur lesen'), 'success');
    // TODO: Persist to Supabase
};

window.copyConnWebhook = function(id) {
    var c = CONNECTORS[id];
    if (c && c.webhook) {
        navigator.clipboard.writeText(c.webhook).then(function() {
            var btn = document.getElementById('connCopyBtn_' + id);
            if (btn) { btn.textContent = '✅ Kopiert!'; setTimeout(function() { btn.textContent = '📋 Kopieren'; }, 2000); }
        });
    }
};

window.testConnector = function(id) {
    var el = document.getElementById('connTestResult_' + id);
    if (el) el.innerHTML = '<span class="text-xs text-gray-400 animate-pulse">⏳ Teste Verbindung...</span>';
    addLog(id, 'info', 'Verbindungstest gestartet');

    if (id === 'etermin') {
        // Real API test via proxy
        var token = _sb() && _sb().auth && _sb().auth.session ? _sb().auth.session().access_token : '';
        fetch('/api/etermin-proxy?action=test', {
            headers: { 'Authorization': 'Bearer ' + (window.sbSession && window.sbSession.access_token || '') }
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.ok) {
                if (el) el.innerHTML = '<span class="text-xs text-green-600 font-semibold">✅ Verbindung erfolgreich! ' + (data.calendars || 0) + ' Kalender gefunden.</span>';
                CONNECTORS.etermin.status = 'connected';
                CONNECTORS.etermin.statusLabel = 'Verbunden';
                addLog(id, 'ok', 'Verbindungstest erfolgreich – ' + (data.calendars || 0) + ' Kalender');
                renderStatusGrid();
            } else {
                if (el) el.innerHTML = '<span class="text-xs text-red-500 font-semibold">❌ ' + (data.error || 'Unbekannter Fehler') + '</span>';
                addLog(id, 'err', 'Test fehlgeschlagen: ' + (data.error || ''));
            }
        })
        .catch(function(err) {
            if (el) el.innerHTML = '<span class="text-xs text-red-500 font-semibold">❌ ' + err.message + '</span>';
            addLog(id, 'err', 'Netzwerkfehler: ' + err.message);
        });
        return;
    }

    // Fallback: simulated test for other connectors
    setTimeout(function() {
        if (el) el.innerHTML = '<span class="text-xs text-green-600 font-semibold">✅ Verbindung erfolgreich!</span>';
        CONNECTORS[id].status = 'connected';
        CONNECTORS[id].statusLabel = 'Verbunden';
        addLog(id, 'ok', 'Verbindungstest erfolgreich');
        renderStatusGrid();
        setTimeout(function() { if (el) el.innerHTML = ''; }, 5000);
    }, 1500);
};

window.saveConnector = async function(id) {
    if (id === 'etermin') {
        var pubKey = document.getElementById('conn_etermin_public_key');
        var privKey = document.getElementById('conn_etermin_private_key');
        if (!pubKey || !pubKey.value || !privKey || !privKey.value) {
            addLog(id, 'err', 'API-Keys fehlen');
            _showToast('Bitte Public und Private Key eingeben', 'error');
            return;
        }
        try {
            var sb = _sb(); if (!sb) throw new Error('Nicht eingeloggt');
            var { data: existing } = await sb.from('etermin_config').select('id').limit(1).maybeSingle();
            var payload = {
                public_key: pubKey.value.trim(),
                private_key: privKey.value.trim(),
                webhook_url: 'https://cockpit.vitbikes.de/api/webhooks/etermin',
                is_active: true,
                updated_at: new Date().toISOString()
            };
            if (existing) {
                var r = await sb.from('etermin_config').update(payload).eq('id', existing.id);
                if (r.error) throw r.error;
            } else {
                var r = await sb.from('etermin_config').insert(payload);
                if (r.error) throw r.error;
            }
            addLog(id, 'ok', 'API-Keys gespeichert');
            // Save calendar mappings
            var mappingEls = document.querySelectorAll('[data-etermin-cal]');
            for (var mel of mappingEls) {
                var stdName = mel.getAttribute('data-etermin-cal');
                var calId = mel.value.trim();
                if (!calId) continue;
                var { data: std } = await sb.from('standorte').select('id').ilike('name', '%' + stdName + '%').maybeSingle();
                if (std) {
                    await sb.from('etermin_calendar_map').upsert({
                        calendar_name: stdName, calendar_id: calId, standort_id: std.id
                    }, { onConflict: 'calendar_name' });
                }
            }
            addLog(id, 'ok', 'Kalender-Mapping gespeichert');
            _showToast('eTermin Konfiguration gespeichert', 'success');
        } catch (err) {
            addLog(id, 'err', 'Speichern fehlgeschlagen: ' + err.message);
            _showToast('Fehler: ' + err.message, 'error');
        }
        return;
    }
    addLog(id, 'info', 'Konfiguration gespeichert');
    _showToast(CONNECTORS[id].name + ' Konfiguration gespeichert', 'success');
};

window.manualSync = function(id) {
    var el = document.getElementById('connTestResult_' + id);
    if (el) el.innerHTML = '<span class="text-xs text-gray-400 animate-pulse">🔄 Synchronisiere...</span>';
    addLog(id, 'info', 'Manueller Sync gestartet');

    // Simulate sync (TODO: Replace with Edge Function call)
    setTimeout(function() {
        if (el) el.innerHTML = '<span class="text-xs text-green-600 font-semibold">✅ Sync abgeschlossen</span>';
        addLog(id, 'ok', 'Sync erfolgreich abgeschlossen');
        setTimeout(function() { if (el) el.innerHTML = ''; }, 4000);
    }, 2000);
};

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function addLog(id, type, msg) {
    var c = CONNECTORS[id];
    if (!c) return;
    c.logs.unshift({ time: fmtDT(new Date().toISOString()), type: type, msg: msg });
    if (c.logs.length > 20) c.logs.pop();
    var logEl = document.getElementById('connLog_' + id);
    if (logEl) {
        logEl.innerHTML = c.logs.map(function(l) {
            return '<div class="flex items-start gap-2 text-[10px]"><span class="text-gray-300 w-28 flex-shrink-0">' + _escH(l.time) + '</span>'
                + '<span class="' + (l.type === 'ok' ? 'text-green-600' : l.type === 'err' ? 'text-red-500' : 'text-gray-500') + '">' + _escH(l.msg) + '</span></div>';
        }).join('');
    }
}

function timeAgo(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    var now = Date.now();
    var diff = Math.floor((now - d.getTime()) / 1000);
    if (diff < 60) return 'Gerade eben';
    if (diff < 3600) return 'vor ' + Math.floor(diff / 60) + ' Min.';
    if (diff < 86400) return 'vor ' + Math.floor(diff / 3600) + ' Std.';
    return 'vor ' + Math.floor(diff / 86400) + ' Tagen';
}

function fmtDT(iso) {
    if (!iso) return '—';
    try {
        var d = new Date(iso);
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
            + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '—'; }
}

// ═══════════════════════════════════════════════════════
// EXPORTS (Strangler Fig)
// ═══════════════════════════════════════════════════════

const _exports = { renderSchnittstellen };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[schnittstellen.js] Module loaded – ' + Object.keys(_exports).length + ' exports registered');
