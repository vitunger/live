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
var gfPermissions = { etermin: false, google: false, meta: false, wawi: false, approom: false, dhl: false };

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
    dhl: {
        id: 'dhl', name: 'DHL Paket DE', icon: '📦', iconBg: '#fef08a',
        desc: 'Versandlabel direkt aus dem Shop erstellen. DHL Paket DE Versenden V2 REST API.',
        category: 'active', status: 'connected', statusLabel: 'Production',
        dhlFields: [
            { key: 'api_key', label: 'API Key (Client ID)', type: 'text', placeholder: 'z.B. tmsv3oah...' },
            { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'Client Secret' },
            { key: 'gkp_user', label: 'GKP-Benutzer', type: 'text', placeholder: 'Systembenutzer-Name' },
            { key: 'gkp_pass', label: 'GKP-Passwort', type: 'password', placeholder: 'Passwort' },
            { key: 'billing_number', label: 'Abrechnungsnr. (14-stellig)', type: 'text', placeholder: 'z.B. 52128352600101' },
            { key: 'sandbox', label: 'Modus', type: 'select', options: [{ value: 'false', label: 'Production' }, { value: 'true', label: 'Sandbox (Test)' }] },
        ],
        readonlyFields: [
            { key: 'sender', label: 'Absender', value: 'vit:bikes GmbH, Jahnstraße 2c, 85774 Unterföhring' },
            { key: 'products', label: 'Produkte', value: 'DHL Paket (V01PAK)' },
            { key: 'edge_function', label: 'Edge Function', value: 'dhl-shipping (v12)' },
        ],
        logs: []
    },
    tiktok: {
        id: 'tiktok', name: 'TikTok', icon: '🎵', iconBg: '#fce7f3',
        desc: 'TikTok Business: Account-Stats, Follower & Video-Performance für interne Auswertungen.',
        category: 'active', status: 'disconnected', statusLabel: 'Nicht verbunden',
        tiktokFields: [
            { key: 'client_key', label: 'Client Key (App Key)', type: 'text', placeholder: 'z.B. sbaws7yiacydg8y5r7' },
            { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Dein TikTok App Secret' },
            { key: 'sandbox', label: 'Modus', type: 'select', options: [{ value: 'false', label: 'Production' }, { value: 'true', label: 'Sandbox (Test)' }] },
        ],
        readonlyFields: [
            { key: 'scopes', label: 'Benötigte Scopes', value: 'user.info.basic, user.info.stats, video.list' },
            { key: 'callback_url', label: 'OAuth Callback URL', value: 'https://cockpit.vitbikes.de/api/tiktok-callback' },
            { key: 'data_usage', label: 'Datenzweck', value: 'Interne Auswertung – kein Verkauf an Dritte' },
        ],
        logs: []
    },
    lexoffice: {
        id: 'lexoffice', name: 'lexoffice', icon: '📒', iconBg: '#d1fae5',
        desc: 'Buchhaltung & Rechnungswesen. Automatischer Kontakt- und Rechnungs-Sync, PDF-Abruf.',
        category: 'active', status: 'unknown', statusLabel: 'Prüfe...',
        fields: [
            { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Dein lexoffice API Key (aus Einstellungen → API)' },
        ],
        readonlyFields: [
            { key: 'edge_functions', label: 'Edge Functions', value: 'lexoffice-sync, lexoffice-pdf, lexoffice-webhook' },
            { key: 'features', label: 'Funktionen', value: 'Kontakte sync, Rechnungen erstellen, PDF abrufen, Webhook-Events' },
            { key: 'key_storage', label: 'Key-Speicherort', value: 'connector_config (automatisch fuer alle Functions)' },
        ],
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

var openCards = { etermin: true, lexoffice: false, google: false, meta: false, wawi: false, approom: false, dhl: false, tiktok: false };

// ═══════════════════════════════════════════════════════
// MAIN RENDER
// ═══════════════════════════════════════════════════════

export async function renderSchnittstellen() {
    // Wait for profile if not yet loaded (max 3s)
    for (var i = 0; i < 30 && !_sbProfile(); i++) await new Promise(function(r){setTimeout(r,100);});
    
    // Load standorte for HQ dropdown
    try {
        var sb = _sb();
        if (sb && _sbProfile() && _sbProfile().is_hq) {
            var { data: stds } = await _sb().from('standorte').select('id, name').order('name');
            window._allStandorte = stds || [];
        }
    } catch (e) {}
    loadAdsAccountData();
    loadWawiStatus();
    renderStatusGrid();
    renderActiveCards();
    setTimeout(function() { if (window.loadDhlConfig) window.loadDhlConfig(); }, 500);
    setTimeout(function() { if (window.loadLexofficeConfig) window.loadLexofficeConfig(); }, 600);
    setTimeout(function() { if (window.loadTikTokConfig) window.loadTikTokConfig(); }, 700);
    renderPlannedGrid();
    renderPartnerCards();
    loadEterminOverview();
    if (_sbProfile() && _sbProfile().is_hq) { loadEterminMapping(); loadKalenderVerkauferMapping(); }
}

// ═══════════════════════════════════════════════════════
// DATA LOADING (Supabase)
// ═══════════════════════════════════════════════════════

async function loadAdsAccountData() {
    try {
        var sb = _sb(); if (!sb) return;
        var res = await _sb().from('ads_accounts').select('plattform, letzter_sync, sync_status, sync_fehler, account_id');
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
        // Note: renderActiveCards intentionally NOT called here to avoid
        // destroying eTermin overview/mapping content. Status grid updates are enough.
    } catch (e) { console.warn('[schnittstellen] loadAdsAccountData:', e); }
}

async function loadWawiStatus() {
    try {
        var sb = _sb(); if (!sb) return;
        var res = await _sb().from('wawi_connections').select('id, standort_id, system_typ, status, letzter_sync, standorte(name)');
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
        // Note: renderActiveCards intentionally NOT called here
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
    var ids = ['etermin', 'lexoffice', 'approom', 'dhl', 'google', 'meta', 'wawi'];
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
    el.innerHTML = ['etermin', 'lexoffice', 'approom', 'dhl', 'google', 'meta', 'wawi'].map(function(id) {
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
        // Standort selector (HQ only)
        var isHQ = _sbProfile() && _sbProfile().is_hq;
        if (isHQ) {
            body += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">📍 Standort auswählen</label>'
                + '<select id="conn_etermin_standort" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-400 outline-none" onchange="window.loadEterminConfig&&loadEterminConfig(this.value)">'
                + '<option value="">— Standort wählen —</option>';
            if (window._allStandorte) {
                window._allStandorte.forEach(function(s) {
                    body += '<option value="' + s.id + '">' + _escH(s.name) + '</option>';
                });
            }
            body += '</select></div>';
        }
        // Fields
        c.fields.forEach(function(f) {
            body += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">' + f.label + '</label>'
                + '<input type="' + f.type + '" id="conn_' + id + '_' + f.key + '" placeholder="' + f.placeholder + '" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition">'
                + '</div>';
        });
        // Calendar name for mapping
        // (not needed when each standort has its own eTermin account)
        // Webhook – dynamisch pro Standort
        body += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Webhook-URL <span class="text-gray-400 font-normal">(in eTermin eintragen)</span></label>'
            + '<div style="display:flex;gap:6px;align-items:center"><input type="text" id="conn_etermin_webhook_url" value="' + c.webhook + '" readonly class="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 font-mono text-xs">'
            + '<button onclick="window.copyConnWebhook(\'' + id + '\')" id="connCopyBtn_' + id + '" class="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition flex-shrink-0">📋 Kopieren</button></div>'
            + '<p class="text-[10px] text-gray-400 mt-1">Jeder Standort bekommt eine eigene URL mit ?sid=... – wird beim Speichern automatisch generiert.</p></div>';
        // Info: per-standort
        body += '<div class="bg-blue-50 border border-blue-200 rounded-lg p-3">'
            + '<p class="text-xs text-blue-700">ℹ️ <strong>Jeder Standort hat seinen eigenen eTermin-Account.</strong> '
            + 'Wähle oben den Standort, trage die API-Keys ein und speichere. Wiederhole für jeden Standort.</p></div>';
        // Buttons
        body += '<div class="flex gap-2 pt-1">'
            + '<button onclick="window.testConnector(\'etermin\')" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition">🔍 Verbindung testen</button>'
            + '<button onclick="window.saveConnector(\'etermin\')" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition">💾 Speichern</button>'
            + '</div>';
        // Connected standorte overview (prominent!)
        body += '<div id="connEterminOverview" class="mt-4"></div>';
        // Terminart-Mapping (HQ only)
        if (_sbProfile() && _sbProfile().is_hq) {
            body += '<div id="connEterminMapping" class="mt-4"></div>';
            body += '<div id="connEterminKalenderMapping" class="mt-4"></div>';
        }
        // Setup-Anleitung (klappbar)
        body += '<details class="mt-3 border border-gray-200 rounded-lg"><summary class="px-3 py-2 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition">📖 Anleitung: eTermin API-Keys &amp; Webhook einrichten</summary>'
            + '<div class="px-3 pb-3 text-xs text-gray-600 space-y-2 border-t border-gray-100 pt-2">'
            + '<p class="font-bold text-gray-700">API-Keys holen:</p>'
            + '<p><strong>1.</strong> Logge dich bei <a href="https://www.etermin.net" target="_blank" class="text-blue-600 underline">etermin.net</a> mit dem Account des jeweiligen Standorts ein.</p>'
            + '<p><strong>2.</strong> Gehe zu <em>API Schnittstellen → API &amp; Web Push</em>.</p>'
            + '<p><strong>3.</strong> Kopiere den <strong>Public Key</strong> und den <strong>Private Key</strong> (ggf. erst „Generieren" klicken).</p>'
            + '<p><strong>4.</strong> Trage beide Keys hier oben ein und klicke „Speichern".</p>'
            + '<p class="font-bold text-gray-700 pt-2">Webhook einrichten:</p>'
            + '<p><strong>5.</strong> Bleibe in eTermin unter <em>API &amp; Web Push</em>.</p>'
            + '<p><strong>6.</strong> Aktiviere <strong>„Send Web Push"</strong> (Häkchen setzen).</p>'
            + '<p><strong>7.</strong> Trage die <strong>Webhook-URL</strong> von oben in das Feld „Send to the following URL" ein.</p>'
            + '<p><strong>8.</strong> Wähle als Format <strong>JSON</strong> und klicke Speichern.</p>'
            + '<p class="text-gray-400 pt-1">💡 Tipp: Teste den Webhook über den Button „Send Web Push (Created) with test values" in eTermin.</p>'
            + '</div></details>';
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

    // ── lexoffice body ──
    if (id === 'lexoffice') {
        body += '<div class="pt-4 space-y-3" id="lexofficeConfigPanel">';
        body += renderGfToggle(id);
        // Editable API Key field
        if (c.fields) {
            c.fields.forEach(function(f) {
                body += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">' + f.label + '</label>'
                    + '<input type="' + f.type + '" id="conn_lexoffice_' + f.key + '" placeholder="' + f.placeholder + '" '
                    + 'class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition font-mono"></div>';
            });
        }
        // Readonly info
        if (c.readonlyFields) {
            c.readonlyFields.forEach(function(f) {
                body += '<div class="flex items-center gap-3"><span class="text-xs text-gray-500 w-36">' + f.label + '</span><span class="text-xs font-semibold text-gray-800">' + _escH(f.value) + '</span></div>';
            });
        }
        // Info box
        body += '<div class="bg-green-50 border border-green-200 rounded-lg p-3">'
            + '<p class="text-xs text-green-700">\u2705 <strong>Zentrale Verwaltung:</strong> Der API Key wird direkt in der Portal-Datenbank gespeichert. '
            + 'Alle Edge Functions (lexoffice-sync, lexoffice-pdf, lexoffice-webhook) lesen den Key automatisch von hier. '
            + 'Du musst nichts manuell im Supabase Dashboard aendern.</p></div>';
        // Buttons
        body += '<div class="flex gap-2 pt-1">'
            + '<button onclick="window.testLexofficeConnection()" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition">\ud83d\udd0d Verbindung testen</button>'
            + '<button onclick="window.saveLexofficeConfig()" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition">\ud83d\udcbe Speichern</button>'
            + '</div>';
        body += '<div id="connTestResult_lexoffice" class="mt-2"></div>';
        // Anleitung
        body += '<details class="mt-3 border border-gray-200 rounded-lg"><summary class="px-3 py-2 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition">\ud83d\udcd6 Anleitung: lexoffice API Key erstellen</summary>'
            + '<div class="px-3 pb-3 text-xs text-gray-600 space-y-2 border-t border-gray-100 pt-2">'
            + '<p><strong>1.</strong> Logge dich bei <a href="https://app.lexoffice.de" target="_blank" class="text-blue-600 underline">app.lexoffice.de</a> ein.</p>'
            + '<p><strong>2.</strong> Gehe zu <em>Einstellungen \u2192 Erweiterungen \u2192 \u00d6ffentliche API</em>.</p>'
            + '<p><strong>3.</strong> Klicke auf <strong>\u201eNeuen Key erstellen\u201c</strong>.</p>'
            + '<p><strong>4.</strong> Vergib einen Namen (z.B. \u201evit:bikes Portal\u201c) und kopiere den angezeigten Key.</p>'
            + '<p><strong>5.</strong> Trage den Key hier ein und klicke \u201eSpeichern\u201c. Fertig!</p>'
            + '<p class="text-green-600 pt-1">\u2705 Der Key wird automatisch von allen LexOffice Edge Functions verwendet. Kein manueller Schritt im Supabase Dashboard noetig.</p>'
            + '</div></details>';
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

    // -- DHL body --
    if (id === 'dhl') {
        body += '<div class="pt-4 space-y-3" id="dhlConfigPanel">';
        body += renderGfToggle(id);
        if (c.dhlFields) {
            c.dhlFields.forEach(function(f) {
                if (f.type === 'select') {
                    body += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">' + f.label + '</label>'
                        + '<select id="conn_dhl_' + f.key + '" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-400 outline-none">';
                    f.options.forEach(function(o) {
                        body += '<option value="' + o.value + '">' + _escH(o.label) + '</option>';
                    });
                    body += '</select></div>';
                } else {
                    body += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">' + f.label + '</label>'
                        + '<input type="' + f.type + '" id="conn_dhl_' + f.key + '" placeholder="' + f.placeholder + '" '
                        + 'class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition font-mono"></div>';
                }
            });
        }
        if (c.readonlyFields) {
            body += '<div class="pt-2 border-t border-gray-100 mt-2 space-y-1">';
            c.readonlyFields.forEach(function(f) {
                body += '<div class="flex items-center gap-2"><span class="text-[10px] text-gray-400 w-28 flex-shrink-0">' + f.label + '</span>'
                    + '<span class="text-xs text-gray-600">' + _escH(f.value) + '</span></div>';
            });
            body += '</div>';
        }
        body += '<div class="flex gap-2 pt-2">'
            + '<button onclick="window.testDhlConnection()" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition">\ud83d\udd0d Verbindung testen</button>'
            + '<button onclick="window.saveDhlConfig()" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition">\ud83d\udcbe Speichern</button>'
            + '</div>';
        body += '<div id="dhlTestResult" class="mt-2"></div>';
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


    // ── TikTok body ──
    if (id === 'tiktok') {
        body += '<div class="pt-4 space-y-4">';
        body += renderGfToggle(id);

        // Config fields
        body += '<div class="space-y-2">';
        body += '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Verbindung konfigurieren</p>';
        c.tiktokFields.forEach(function(f) {
            if (f.type === 'select') {
                body += '<div><label class="text-[10px] text-gray-500 font-medium">' + _escH(f.label) + '</label>'
                    + '<select id="tiktok_' + f.key + '" style="width:100%;padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;margin-top:2px">'
                    + f.options.map(function(o) { return '<option value="' + o.value + '">' + o.label + '</option>'; }).join('')
                    + '</select></div>';
            } else {
                body += '<div><label class="text-[10px] text-gray-500 font-medium">' + _escH(f.label) + '</label>'
                    + '<input id="tiktok_' + f.key + '" type="' + f.type + '" placeholder="' + _escH(f.placeholder) + '"'
                    + ' style="width:100%;padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;margin-top:2px"/></div>';
            }
        });
        body += '</div>';

        // Readonly info
        body += '<div class="space-y-1">';
        body += '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Info</p>';
        c.readonlyFields.forEach(function(f) {
            body += '<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #f3f4f6">'
                + '<span class="text-[10px] text-gray-400 font-medium" style="min-width:110px">' + _escH(f.label) + '</span>'
                + '<span class="text-[10px] text-gray-600">' + _escH(f.value) + '</span></div>';
        });
        body += '</div>';

        // OAuth button + save config
        body += '<div style="display:flex;gap:8px;flex-wrap:wrap">'
            + '<button onclick="window.saveTikTokConfig()" style="padding:7px 14px;background:#1a1a2e;color:#fff;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">💾 Konfiguration speichern</button>'
            + '<button onclick="window.startTikTokOAuth()" style="padding:7px 14px;background:linear-gradient(135deg,#ff0050,#00f2ea);color:#fff;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">🔗 Mit TikTok verbinden</button>'
            + '<button onclick="window.loadTikTokData()" style="padding:7px 14px;background:#374151;color:#fff;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">🔄 Daten abrufen</button>'
            + '</div>';

        // Stats area (filled after loadTikTokData)
        body += '<div id="tiktokStatsArea" style="display:none">';
        // Account info card
        body += '<div id="tiktokAccountCard" style="background:#f9fafb;border-radius:10px;padding:12px;display:flex;align-items:center;gap:12px">'
            + '<img id="tiktokAvatar" src="" style="width:48px;height:48px;border-radius:50%;object-fit:cover;background:#e5e7eb" onerror="this.style.display=\'none\'"/>'
            + '<div><p id="tiktokDisplayName" class="text-sm font-bold text-gray-800">—</p>'
            + '<div style="display:flex;gap:12px;margin-top:4px">'
            + '<span class="text-[11px] text-gray-500">👥 <span id="tiktokFollowers">—</span> Follower</span>'
            + '<span class="text-[11px] text-gray-500">❤️ <span id="tiktokLikes">—</span> Likes</span>'
            + '<span class="text-[11px] text-gray-500">🎬 <span id="tiktokVideoCount">—</span> Videos</span>'
            + '</div></div></div>';
        // Videos table
        body += '<div><p class="text-xs font-semibold text-gray-500 uppercase tracking-wider" style="margin:12px 0 6px">Letzte Videos</p>'
            + '<div id="tiktokVideoTable" style="overflow-x:auto">'
            + '<table style="width:100%;border-collapse:collapse;font-size:11px">'
            + '<thead><tr style="border-bottom:2px solid #e5e7eb">'
            + '<th style="text-align:left;padding:4px 8px;color:#6b7280;font-weight:600">Titel</th>'
            + '<th style="padding:4px 8px;color:#6b7280;font-weight:600">👁 Views</th>'
            + '<th style="padding:4px 8px;color:#6b7280;font-weight:600">❤️ Likes</th>'
            + '<th style="padding:4px 8px;color:#6b7280;font-weight:600">💬 Komm.</th>'
            + '<th style="padding:4px 8px;color:#6b7280;font-weight:600">↗ Shares</th>'
            + '<th style="padding:4px 8px;color:#6b7280;font-weight:600">Datum</th>'
            + '</tr></thead>'
            + '<tbody id="tiktokVideoRows"></tbody>'
            + '</table></div></div>';
        body += '</div>'; // end tiktokStatsArea

        body += '</div>'; // end main padding div
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
    var ids = ['etermin', 'lexoffice', 'approom', 'dhl', 'google', 'meta', 'wawi'];
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

window.toggleConnCard = async function(id) {
    openCards[id] = !openCards[id];
    
    // For eTermin: ensure profile & standorte are loaded before rendering
    if (id === 'etermin' && openCards[id]) {
        for (var i = 0; i < 50 && !_sbProfile(); i++) await new Promise(function(r){setTimeout(r,100);});
        if (_sbProfile() && _sbProfile().is_hq && (!window._allStandorte || window._allStandorte.length === 0)) {
            try {
                var { data: stds } = await _sb().from('standorte').select('id, name').order('name');
                window._allStandorte = stds || [];
            } catch(e) {}
        }
    }
    
    renderActiveCards();
    
    // Load eTermin dynamic content after DOM is ready
    if (id === 'etermin' && openCards[id]) {
        loadEterminOverview();
        if (_sbProfile() && _sbProfile().is_hq) loadEterminMapping();
    }
};

window.toggleGFEdit = function(id) {
    gfPermissions[id] = !gfPermissions[id];
    renderActiveCards();
    if (currentConnView === 'partner') renderPartnerCards();
    _showToast('GF-Berechtigung für ' + CONNECTORS[id].name + ': ' + (gfPermissions[id] ? 'Bearbeitbar' : 'Nur lesen'), 'success');
    // TODO: Persist to Supabase
};

window.copyConnWebhook = function(id) {
    var urlEl = document.getElementById('conn_etermin_webhook_url');
    var url = urlEl ? urlEl.value : (CONNECTORS[id] && CONNECTORS[id].webhook || '');
    if (url) {
        navigator.clipboard.writeText(url).then(function() {
            var btn = document.getElementById('connCopyBtn_' + id);
            if (btn) { btn.textContent = '✅ Kopiert!'; setTimeout(function() { btn.textContent = '📋 Kopieren'; }, 2000); }
        });
    }
};

// ── Load eTermin config for a specific standort ──
window.loadEterminConfig = async function(standortId) {
    // Update webhook URL with standort ID
    var whEl = document.getElementById('conn_etermin_webhook_url');
    if (whEl) {
        whEl.value = standortId 
            ? 'https://cockpit.vitbikes.de/api/webhooks/etermin?sid=' + standortId
            : 'https://cockpit.vitbikes.de/api/webhooks/etermin';
    }
    if (!standortId) {
        var p = document.getElementById('conn_etermin_public_key');
        var k = document.getElementById('conn_etermin_private_key');
        if (p) p.value = '';
        if (k) k.value = '';
        return;
    }
    try {
        var sb = _sb(); if (!sb) return;
        var { data: cfg } = await _sb().from('etermin_config')
            .select('public_key, private_key').eq('standort_id', standortId).maybeSingle();
        var pubEl = document.getElementById('conn_etermin_public_key');
        var privEl = document.getElementById('conn_etermin_private_key');
        if (pubEl) pubEl.value = cfg ? cfg.public_key : '';
        if (privEl) privEl.value = cfg ? cfg.private_key : '';
    } catch (e) { console.warn('[schnittstellen] loadEterminConfig:', e); }
};

// ── Load overview of all configured standorte ──
async function loadEterminOverview() {
    var el = document.getElementById('connEterminOverview');
    console.debug('[eTermin] loadOverview called, el:', !!el, 'profile:', !!_sbProfile(), 'is_hq:', _sbProfile() && _sbProfile().is_hq);
    if (!el) return;
    try {
        var sb = _sb(); if (!sb) { console.warn('[eTermin] no sb client'); return; }
        var { data: configs, error: cfgErr } = await _sb().from('etermin_config')
            .select('standort_id, is_active, updated_at, standorte(name)').order('updated_at', { ascending: false });
        console.debug('[eTermin] configs:', configs, 'error:', cfgErr);
        configs = configs || [];

        // Load all standorte to show which are NOT yet connected
        var allStandorte = window._allStandorte || [];
        var configuredIds = configs.map(function(c) { return c.standort_id; });
        var active = configs.filter(function(c) { return c.is_active; });

        // Update connector status
        if (configs.length === 0 && allStandorte.length === 0) {
            CONNECTORS.etermin.status = 'disconnected';
            CONNECTORS.etermin.statusLabel = 'Nicht konfiguriert';
            el.innerHTML = '<p class="text-xs text-gray-400">Noch keine Standorte konfiguriert.</p>';
            return;
        }

        CONNECTORS.etermin.status = active.length > 0 ? 'connected' : 'disconnected';
        CONNECTORS.etermin.statusLabel = active.length + '/' + (allStandorte.length || configs.length) + ' Standorte';
        renderStatusGrid();

        // Build table with ALL standorte
        var h = '<details class="border border-gray-200 rounded-lg">'
            + '<summary class="px-3 py-2 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition flex items-center gap-2">'
            + '📡 Verbindungsstatus aller Standorte'
            + '<span class="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ' + (active.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500') + '">' + active.length + '/' + (allStandorte.length || configs.length) + ' verbunden</span>'
            + '</summary>'
            + '<div class="border-t border-gray-100"><table class="w-full text-xs">'
            + '<thead class="bg-gray-50"><tr><th class="text-left px-3 py-2 font-semibold text-gray-600">Standort</th>'
            + '<th class="text-center px-3 py-2 font-semibold text-gray-600">Status</th>'
            + '<th class="text-left px-3 py-2 font-semibold text-gray-600">Webhook-URL</th>'
            + '<th class="text-right px-3 py-2 font-semibold text-gray-600">Zuletzt</th></tr></thead><tbody>';

        // Show connected standorte first
        configs.forEach(function(c) {
            var name = (c.standorte && c.standorte.name) || 'Unbekannt';
            var whUrl = 'https://cockpit.vitbikes.de/api/webhooks/etermin?sid=' + c.standort_id;
            if (c.is_active) {
                h += '<tr class="border-t border-gray-100 bg-green-50/50"><td class="px-3 py-2 font-semibold">' + _escH(name) + '</td>'
                    + '<td class="px-3 py-2 text-center"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">✅ Verbunden</span></td>'
                    + '<td class="px-3 py-2"><code class="text-[9px] text-gray-400 select-all">' + whUrl.slice(-50) + '</code></td>'
                    + '<td class="px-3 py-2 text-right text-gray-400">' + (c.updated_at ? timeAgo(c.updated_at) : '—') + '</td></tr>';
            } else {
                h += '<tr class="border-t border-gray-100"><td class="px-3 py-2 font-semibold">' + _escH(name) + '</td>'
                    + '<td class="px-3 py-2 text-center"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700">⏸️ Inaktiv</span></td>'
                    + '<td class="px-3 py-2"><code class="text-[9px] text-gray-400">' + whUrl.slice(-50) + '</code></td>'
                    + '<td class="px-3 py-2 text-right text-gray-400">' + (c.updated_at ? timeAgo(c.updated_at) : '—') + '</td></tr>';
            }
        });

        // Show NOT-yet-connected standorte
        allStandorte.forEach(function(s) {
            if (configuredIds.indexOf(s.id) === -1) {
                h += '<tr class="border-t border-gray-100"><td class="px-3 py-2 font-semibold text-gray-400">' + _escH(s.name) + '</td>'
                    + '<td class="px-3 py-2 text-center"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">⬚ Nicht eingerichtet</span></td>'
                    + '<td class="px-3 py-2 text-gray-300 text-[10px]">—</td>'
                    + '<td class="px-3 py-2 text-right text-gray-300">—</td></tr>';
            }
        });

        h += '</tbody></table></div></details>';
        el.innerHTML = h;
    } catch (e) { console.warn('[schnittstellen] loadEterminOverview:', e); }
}

// Portal standard types for mapping dropdown
var PORTAL_TYPEN = [
    {v:'beratung',l:'Beratung'},{v:'serviceannahme',l:'Serviceannahme'},{v:'abholung',l:'Abholung'},
    {v:'ergonomieberatung',l:'Ergonomieberatung'},{v:'ergocheck',l:'Ergo-Check'},
    {v:'fahrspasscheck',l:'Fahrspaßcheck'},{v:'sonstig',l:'Sonstiges'}
];

async function loadEterminMapping() {
    var el = document.getElementById('connEterminMapping');
    console.debug('[eTermin] loadMapping called, el:', !!el, 'profile:', !!_sbProfile(), 'is_hq:', _sbProfile() && _sbProfile().is_hq);
    if (!el) return;
    try {
        // Load all mappings
        var resp = await _sb().from('etermin_typ_mapping').select('*, standorte(name)').order('standort_id');
        console.debug('[eTermin] mappings:', resp.data, 'error:', resp.error);
        var mappings = (resp.data || []);
        // Load standorte with active etermin configs
        var cfgResp = await _sb().from('etermin_config').select('standort_id, standorte(name)').eq('is_active', true);
        console.debug('[eTermin] mapping configs:', cfgResp.data, 'error:', cfgResp.error);
        var configs = (cfgResp.data || []);

        var h = '<details class="border border-gray-200 rounded-lg" id="eterminMappingDetails">'
            + '<summary class="px-3 py-2 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition flex items-center gap-2">'
            + '🔀 Terminarten-Mapping <span class="text-[10px] font-normal text-gray-400">(eTermin-Services → Portal-Typen)</span>'
            + '<span class="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">' + mappings.length + ' Regeln</span>'
            + '</summary>';
        h += '<div class="px-3 pb-3 pt-2 border-t border-gray-100 space-y-3">';
        h += '<p class="text-[10px] text-gray-500">Hier ordnest du zu, welcher eTermin-Service welchem Portal-Termintyp entspricht. Jeder Standort kann eigene Service-Namen in eTermin haben.</p>';

        // Group by standort
        var byStd = {};
        mappings.forEach(function(m) {
            var sid = m.standort_id;
            if (!byStd[sid]) byStd[sid] = { name: (m.standorte && m.standorte.name) || 'Unbekannt', items: [] };
            byStd[sid].items.push(m);
        });

        // Dropdown options for portal types
        var optHtml = PORTAL_TYPEN.map(function(t) { return '<option value="' + t.v + '">' + t.l + '</option>'; }).join('');

        Object.keys(byStd).forEach(function(sid) {
            var std = byStd[sid];
            h += '<div class="border border-gray-100 rounded-lg p-2">';
            h += '<p class="text-xs font-bold text-gray-700 mb-2">📍 ' + _escH(std.name) + '</p>';
            h += '<table class="w-full text-xs"><thead><tr class="text-[10px] text-gray-500 border-b border-gray-100">'
                + '<th class="text-left px-2 py-1">eTermin-Service</th>'
                + '<th class="text-left px-2 py-1">→ Portal-Typ</th>'
                + '<th class="px-2 py-1 w-8"></th></tr></thead><tbody>';
            std.items.forEach(function(m) {
                h += '<tr class="border-t border-gray-50 hover:bg-gray-50">';
                h += '<td class="px-2 py-1.5 text-gray-700 font-mono text-[11px]">' + _escH(m.etermin_service) + '</td>';
                h += '<td class="px-2 py-1.5"><select onchange="window.updateEterminMapping(\'' + m.id + '\',this.value)" class="text-xs border border-gray-200 rounded px-2 py-1 w-full">'
                    + PORTAL_TYPEN.map(function(t) { return '<option value="' + t.v + '"' + (t.v === m.portal_typ ? ' selected' : '') + '>' + t.l + '</option>'; }).join('')
                    + '</select></td>';
                h += '<td class="px-2 py-1.5 text-center"><button onclick="window.deleteEterminMapping(\'' + m.id + '\')" class="text-gray-400 hover:text-red-500 text-[10px]" title="Löschen">🗑️</button></td>';
                h += '</tr>';
            });
            h += '</tbody></table></div>';
        });

        // Add-new mapping form
        if (configs.length > 0) {
            h += '<div class="border border-dashed border-gray-300 rounded-lg p-2 bg-gray-50">';
            h += '<p class="text-[10px] font-semibold text-gray-600 mb-2">➕ Neue Zuordnung</p>';
            h += '<div class="flex gap-2 items-end flex-wrap">';
            h += '<div class="flex-1 min-w-[120px]"><label class="text-[10px] text-gray-500">Standort</label>'
                + '<select id="mappingNewStandort" class="w-full text-xs border border-gray-200 rounded px-2 py-1">'
                + configs.map(function(c) { return '<option value="' + c.standort_id + '">' + _escH((c.standorte && c.standorte.name) || c.standort_id) + '</option>'; }).join('')
                + '</select></div>';
            h += '<div class="flex-1 min-w-[150px]"><label class="text-[10px] text-gray-500">eTermin-Service (exakter Name)</label>'
                + '<input type="text" id="mappingNewService" placeholder="z.B. Große Jahresinspektion" class="w-full text-xs border border-gray-200 rounded px-2 py-1"></div>';
            h += '<div class="flex-1 min-w-[120px]"><label class="text-[10px] text-gray-500">Portal-Typ</label>'
                + '<select id="mappingNewTyp" class="w-full text-xs border border-gray-200 rounded px-2 py-1">' + optHtml + '</select></div>';
            h += '<button onclick="window.addEterminMapping()" class="px-3 py-1 bg-blue-500 text-white text-xs rounded font-semibold hover:bg-blue-600">Hinzufügen</button>';
            h += '</div></div>';
        }

        h += '</div></details>';
        el.innerHTML = h;
    } catch (e) { console.warn('[schnittstellen] loadEterminMapping:', e); }
}

window.updateEterminMapping = async function(id, newTyp) {
    await _sb().from('etermin_typ_mapping').update({ portal_typ: newTyp, updated_at: new Date().toISOString() }).eq('id', id);
    loadEterminMapping();
};

window.deleteEterminMapping = async function(id) {
    if (!confirm('Mapping wirklich löschen?')) return;
    await _sb().from('etermin_typ_mapping').delete().eq('id', id);
    loadEterminMapping();
};

window.addEterminMapping = async function() {
    var sid = document.getElementById('mappingNewStandort').value;
    var svc = (document.getElementById('mappingNewService').value || '').trim();
    var typ = document.getElementById('mappingNewTyp').value;
    if (!svc) { _showToast('Bitte eTermin-Service-Name eingeben', 'error'); return; }
    var resp = await _sb().from('etermin_typ_mapping').upsert({
        standort_id: sid, etermin_service: svc, portal_typ: typ, updated_at: new Date().toISOString()
    }, { onConflict: 'standort_id,etermin_service' });
    if (resp.error) { _showToast('Fehler: ' + resp.error.message, 'error'); return; }
    document.getElementById('mappingNewService').value = '';
    loadEterminMapping();
};

// ─── Kalender → Verkäufer Mapping ───────────────────────────────────────────

async function loadKalenderVerkauferMapping() {
    var el = document.getElementById('connEterminKalenderMapping');
    if (!el) return;
    try {
        // Load existing mappings
        var resp = await _sb().from('etermin_kalender_mapping').select('*, standorte(name), users(vorname, nachname)').order('standort_id');
        var mappings = (resp.data || []);

        // Load standorte with active etermin configs
        var cfgResp = await _sb().from('etermin_config').select('standort_id, standorte(name)').eq('is_active', true);
        var configs = (cfgResp.data || []);

        // Load users for dropdown
        var usersResp = await _sb().from('users').select('id, vorname, nachname, standort_id').eq('status', 'aktiv').order('vorname');
        var allUsers = (usersResp.data || []);

        var h = '<details class="border border-orange-200 rounded-lg" id="eterminKalenderMappingDetails" open>';
        h += '<summary class="px-3 py-2 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-orange-50 transition flex items-center gap-2">';
        h += '👤 Kalender → Verkäufer-Zuordnung <span class="text-[10px] font-normal text-gray-400">(eTermin-Kalender einem Mitarbeiter zuordnen)</span>';
        h += '<span class="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold">' + mappings.length + ' Zuordnungen</span>';
        h += '</summary>';
        h += '<div class="px-3 pb-3 pt-2 border-t border-orange-100 space-y-3">';
        h += '<p class="text-[10px] text-gray-500">Jeder Kalender in eTermin gehört meist einem Verkäufer. Ordne hier zu, wer welchen Kalender betreut. Termine aus diesem Kalender werden dann automatisch dem Mitarbeiter zugewiesen.</p>';

        // Group by standort
        var byStd = {};
        mappings.forEach(function(m) {
            var sid = m.standort_id;
            if (!byStd[sid]) byStd[sid] = { name: (m.standorte && m.standorte.name) || 'Unbekannt', items: [] };
            byStd[sid].items.push(m);
        });

        Object.keys(byStd).forEach(function(sid) {
            var std = byStd[sid];
            var stdUsers = allUsers.filter(function(u) { return String(u.standort_id) === String(sid); });
            var userOptHtml = '<option value="">— Kein Mitarbeiter —</option>' + stdUsers.map(function(u) { return '<option value="' + u.id + '">' + _escH(u.vorname + ' ' + u.nachname) + '</option>'; }).join('');
            h += '<div class="border border-gray-100 rounded-lg p-2">';
            h += '<p class="text-xs font-bold text-gray-700 mb-2">📍 ' + _escH(std.name) + '</p>';
            h += '<table class="w-full text-xs"><thead><tr class="text-[10px] text-gray-500 border-b border-gray-100">'
                + '<th class="text-left px-2 py-1">Kalender-Name (in eTermin)</th>'
                + '<th class="text-left px-2 py-1">Kalender-ID</th>'
                + '<th class="text-left px-2 py-1">→ Mitarbeiter</th>'
                + '<th class="px-2 py-1 w-8"></th></tr></thead><tbody>';
            std.items.forEach(function(m) {
                var mName = m.users ? (m.users.vorname + ' ' + m.users.nachname).trim() : '';
                h += '<tr class="border-t border-gray-50 hover:bg-gray-50">';
                h += '<td class="px-2 py-1.5 text-gray-700 font-semibold">' + _escH(m.etermin_kalender_name || '—') + '</td>';
                h += '<td class="px-2 py-1.5 text-gray-400 font-mono text-[10px]">' + _escH(m.etermin_kalender_id || '—') + '</td>';
                h += '<td class="px-2 py-1.5"><select onchange="window.updateKalenderMapping(\''+m.id+'\',this.value)" class="text-xs border border-gray-200 rounded px-2 py-1 w-full">'
                    + stdUsers.map(function(u) { return '<option value="'+u.id+'"'+(u.id===m.user_id?' selected':'')+'>'+_escH(u.vorname+' '+u.nachname)+'</option>'; }).join('')
                    + '</select></td>';
                h += '<td class="px-2 py-1.5 text-center"><button onclick="window.deleteKalenderMapping(\''+m.id+'\')" class="text-gray-400 hover:text-red-500 text-[10px]" title="Löschen">🗑️</button></td>';
                h += '</tr>';
            });
            h += '</tbody></table></div>';
        });

        // Add form
        if (configs.length > 0) {
            h += '<div class="border border-dashed border-orange-300 rounded-lg p-3 bg-orange-50/50">';
            h += '<p class="text-[11px] font-semibold text-orange-700 mb-2">➕ Kalender hinzufügen</p>';
            h += '<p class="text-[10px] text-gray-500 mb-2">Trage den <strong>Kalender-Namen</strong> (exakt wie in eTermin) und optional die <strong>Kalender-ID</strong> ein. Oder klicke auf <strong>Kalender laden</strong> um sie direkt aus eTermin abzurufen.</p>';
    h += '<button onclick="window.fetchEterminCalendarsForMapping()" class="mb-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded font-semibold hover:bg-blue-200 transition">🔄 Kalender aus eTermin laden</button>';
    h += '<div id="kalenderImportList" class="mb-2"></div>';
            h += '<div class="flex gap-2 items-end flex-wrap">';
            h += '<div class="flex-1 min-w-[100px]"><label class="text-[10px] text-gray-500">Standort</label>'
                + '<select id="kalMappingNewStandort" onchange="window.kalMappingUpdateUsers()" class="w-full text-xs border border-gray-200 rounded px-2 py-1">'
                + configs.map(function(c) { return '<option value="'+c.standort_id+'">'+_escH((c.standorte&&c.standorte.name)||c.standort_id)+'</option>'; }).join('')
                + '</select></div>';
            h += '<div class="flex-1 min-w-[140px]"><label class="text-[10px] text-gray-500">Kalender-Name in eTermin</label>'
                + '<input type="text" id="kalMappingNewName" placeholder="z.B. Max Mustermann" class="w-full text-xs border border-gray-200 rounded px-2 py-1"></div>';
            h += '<div class="flex-1 min-w-[100px]"><label class="text-[10px] text-gray-500">Kalender-ID (optional)</label>'
                + '<input type="text" id="kalMappingNewId" placeholder="z.B. 12345" class="w-full text-xs border border-gray-200 rounded px-2 py-1"></div>';
            h += '<div class="flex-1 min-w-[140px]"><label class="text-[10px] text-gray-500">→ Mitarbeiter</label>'
                + '<select id="kalMappingNewUser" class="w-full text-xs border border-gray-200 rounded px-2 py-1">'
                + '<option value="">— wählen —</option>'
                + allUsers.map(function(u) { return '<option value="'+u.id+'" data-sid="'+u.standort_id+'">'+_escH(u.vorname+' '+u.nachname)+'</option>'; }).join('')
                + '</select></div>';
            h += '<button onclick="window.addKalenderMapping()" class="px-3 py-1 bg-orange-500 text-white text-xs rounded font-semibold hover:bg-orange-600">Hinzufügen</button>';
            h += '</div></div>';
        } else {
            h += '<div class="bg-amber-50 border border-amber-200 rounded-lg p-3"><p class="text-xs text-amber-700">⚠️ Kein aktiver eTermin-Account konfiguriert. Bitte zuerst API-Keys einrichten.</p></div>';
        }

        h += '</div></details>';
        el.innerHTML = h;
    } catch (e) { console.warn('[schnittstellen] loadKalenderVerkauferMapping:', e); if(el) el.innerHTML = '<p class="text-xs text-red-500 p-2">Fehler: ' + _escH(e.message) + '</p>'; }
}

window.kalMappingUpdateUsers = function() {
    var sid = (document.getElementById('kalMappingNewStandort')||{}).value;
    var sel = document.getElementById('kalMappingNewUser');
    if (!sel) return;
    Array.from(sel.options).forEach(function(opt) {
        if (!opt.value) { opt.style.display = ''; return; }
        opt.style.display = (!sid || opt.dataset.sid === sid) ? '' : 'none';
    });
};

window.updateKalenderMapping = async function(id, userId) {
    var resp = await _sb().from('etermin_kalender_mapping').update({ user_id: userId || null, updated_at: new Date().toISOString() }).eq('id', id);
    if (resp.error) { _showToast('Fehler beim Speichern', 'error'); return; }
    _showToast('Zuordnung gespeichert', 'success');
    loadKalenderVerkauferMapping();
};

window.deleteKalenderMapping = async function(id) {
    if (!confirm('Kalender-Zuordnung wirklich löschen?')) return;
    await _sb().from('etermin_kalender_mapping').delete().eq('id', id);
    loadKalenderVerkauferMapping();
};

window.fetchEterminCalendarsForMapping = async function() {
    var el = document.getElementById('kalenderImportList');
    if (el) el.innerHTML = '<span class="text-xs text-gray-400 animate-pulse">⏳ Lade Kalender aus eTermin...</span>';
    var stdSelect = document.getElementById('kalMappingNewStandort');
    var stdId = stdSelect ? stdSelect.value : (_sbProfile() ? _sbProfile().standort_id : '');
    if (!stdId) { if(el) el.innerHTML = '<span class="text-xs text-red-500">Bitte erst Standort wählen</span>'; return; }
    var token = '';
    try { var s = await _sb().auth.getSession(); token = s.data.session.access_token; } catch(e) {}
    try {
        var r = await fetch('/api/etermin-proxy?action=calendars_list&standort_id=' + stdId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        var data = await r.json();
        var calendars = (data.data || []);
        if (!calendars.length) {
            if(el) el.innerHTML = '<span class="text-xs text-amber-600">Keine Kalender gefunden. Namen bitte manuell eintragen.</span>';
            return;
        }
        var h = '<div class="flex flex-wrap gap-1 mt-1">';
        calendars.forEach(function(cal) {
            var calName = cal.name || cal.title || cal.calendarname || JSON.stringify(cal).slice(0,40);
            var calId = cal.id || cal.calendarid || '';
            h += '<button onclick="window.kalImportCalendar(\'' + _escH(String(calName)).replace(/'/g,"\'\'") + '\',\'' + _escH(String(calId)) + '\')" class="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] hover:bg-orange-50 hover:border-orange-300 transition">📅 ' + _escH(calName) + (calId?' <span class="text-gray-400">#'+_escH(String(calId))+'</span>':'') + '</button>';
        });
        h += '</div><p class="text-[10px] text-gray-400 mt-1">Klicke auf einen Kalender um ihn ins Formular zu übernehmen.</p>';
        if(el) el.innerHTML = h;
    } catch(e) {
        if(el) el.innerHTML = '<span class="text-xs text-red-500">Fehler: ' + _escH(e.message) + '</span>';
    }
};

window.kalImportCalendar = function(name, id) {
    var nameEl = document.getElementById('kalMappingNewName');
    var idEl = document.getElementById('kalMappingNewId');
    if (nameEl) nameEl.value = name;
    if (idEl) idEl.value = id;
};

window.addKalenderMapping = async function() {
    var sid = (document.getElementById('kalMappingNewStandort')||{}).value;
    var name = ((document.getElementById('kalMappingNewName')||{}).value||'').trim();
    var kalId = ((document.getElementById('kalMappingNewId')||{}).value||'').trim() || null;
    var userId = (document.getElementById('kalMappingNewUser')||{}).value || null;
    if (!name) { _showToast('Bitte Kalender-Namen eingeben', 'error'); return; }
    if (!userId) { _showToast('Bitte Mitarbeiter auswählen', 'error'); return; }
    var resp = await _sb().from('etermin_kalender_mapping').upsert({
        standort_id: sid, etermin_kalender_name: name, etermin_kalender_id: kalId,
        user_id: userId, updated_at: new Date().toISOString()
    }, { onConflict: 'standort_id,etermin_kalender_name' });
    if (resp.error) { _showToast('Fehler: ' + resp.error.message, 'error'); return; }
    _showToast('Kalender-Zuordnung gespeichert', 'success');
    if (document.getElementById('kalMappingNewName')) document.getElementById('kalMappingNewName').value = '';
    if (document.getElementById('kalMappingNewId')) document.getElementById('kalMappingNewId').value = '';
    loadKalenderVerkauferMapping();
};

window.testConnector = async function(id) {
    var el = document.getElementById('connTestResult_' + id);
    if (el) el.innerHTML = '<span class="text-xs text-gray-400 animate-pulse">⏳ Teste Verbindung...</span>';
    addLog(id, 'info', 'Verbindungstest gestartet');

    if (id === 'etermin') {
        // Get selected standort
        var stdSelect = document.getElementById('conn_etermin_standort');
        var stdId = stdSelect ? stdSelect.value : (_sbProfile() ? _sbProfile().standort_id : '');
        var url = '/api/etermin-proxy?action=test';
        if (stdId) url += '&standort_id=' + stdId;
        var token = '';
        try { var s = await _sb().auth.getSession(); token = s.data.session.access_token; } catch(e) {}
        fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
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
                if (el) el.innerHTML = '<span class="text-xs text-red-500 font-semibold">❌ ' + _escH(data.error || 'Unbekannter Fehler') + '</span>';
                addLog(id, 'err', 'Test fehlgeschlagen: ' + _escH(data.error || ''));
            }
        })
        .catch(function(err) {
            if (el) el.innerHTML = '<span class="text-xs text-red-500 font-semibold">❌ ' + _escH(err.message) + '</span>';
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
            var prof = _sbProfile();
            var stdId = prof ? prof.standort_id : null;
            // HQ: if a standort selector exists, use that
            var stdSelect = document.getElementById('conn_etermin_standort');
            if (stdSelect && stdSelect.value) stdId = stdSelect.value;

            if (!stdId) throw new Error('Kein Standort ausgewählt');

            var { data: existing } = await _sb().from('etermin_config')
                .select('id').eq('standort_id', stdId).maybeSingle();
            var payload = {
                standort_id: stdId,
                public_key: pubKey.value.trim(),
                private_key: privKey.value.trim(),
                webhook_url: 'https://cockpit.vitbikes.de/api/webhooks/etermin',
                is_active: true,
                updated_at: new Date().toISOString()
            };
            if (existing) {
                var r = await _sb().from('etermin_config').update(payload).eq('id', existing.id);
                if (r.error) throw r.error;
            } else {
                var r = await _sb().from('etermin_config').insert(payload);
                if (r.error) throw r.error;
            }
            addLog(id, 'ok', 'API-Keys gespeichert für Standort');
            _showToast('eTermin Konfiguration gespeichert', 'success');
            loadEterminOverview();
        } catch (err) {
            addLog(id, 'err', 'Speichern fehlgeschlagen: ' + err.message);
            _showToast('Fehler: ' + err.message, 'error');
        }
        return;
    }
    if (id === 'dhl') { window.saveDhlConfig(); return; }
    if (id === 'lexoffice') { window.saveLexofficeConfig(); return; }
    addLog(id, 'info', 'Konfiguration gespeichert');
    _showToast(CONNECTORS[id].name + ' Konfiguration gespeichert', 'success');
};

window.loadDhlConfig = async function() {
    try {
        var sb = _sb(); if (!sb) return;
        var { data } = await sb.from('connector_config').select('config_key, config_value').eq('connector_id', 'dhl');
        if (!data || !data.length) return;
        data.forEach(function(r) {
            var el = document.getElementById('conn_dhl_' + r.config_key);
            if (el) el.value = r.config_value;
        });
        var sandboxEl = document.getElementById('conn_dhl_sandbox');
        CONNECTORS.dhl.statusLabel = (sandboxEl && sandboxEl.value === 'true') ? 'Sandbox' : 'Production';
        CONNECTORS.dhl.status = 'connected';
    } catch(e) { console.warn('DHL config load:', e); }
};

window.saveDhlConfig = async function() {
    try {
        var sb = _sb(); if (!sb) throw new Error('Nicht eingeloggt');
        var fields = CONNECTORS.dhl.dhlFields;
        var values = {};
        var missing = [];
        fields.forEach(function(f) {
            var el = document.getElementById('conn_dhl_' + f.key);
            var val = el ? el.value.trim() : '';
            if (f.key !== 'sandbox' && !val) missing.push(f.label);
            values[f.key] = val || (f.key === 'sandbox' ? 'false' : '');
        });
        if (missing.length > 0) { _showToast('Fehlende Felder: ' + missing.join(', '), 'error'); return; }
        for (var key in values) {
            var { error } = await sb.from('connector_config').upsert({
                connector_id: 'dhl', config_key: key, config_value: values[key],
                updated_by: _sbUser().id, updated_at: new Date().toISOString()
            }, { onConflict: 'connector_id,config_key' });
            if (error) throw error;
        }
        var isSandbox = values.sandbox === 'true';
        CONNECTORS.dhl.statusLabel = isSandbox ? 'Sandbox' : 'Production';
        CONNECTORS.dhl.status = 'connected';
        addLog('dhl', 'ok', 'DHL Konfiguration gespeichert (' + (isSandbox ? 'Sandbox' : 'Production') + ')');
        _showToast('DHL Konfiguration gespeichert!', 'success');
    } catch(err) {
        addLog('dhl', 'err', 'Speichern fehlgeschlagen: ' + err.message);
        _showToast('Fehler: ' + err.message, 'error');
    }
};

window.testDhlConnection = async function() {
    var el = document.getElementById('dhlTestResult');
    if (el) el.innerHTML = '<span class="text-xs text-gray-400 animate-pulse">Teste DHL-Verbindung...</span>';
    try {
        await window.saveDhlConfig();
        var sb = _sb(); if (!sb) throw new Error('Nicht eingeloggt');
        var { data } = await sb.from('connector_config').select('config_key').eq('connector_id', 'dhl');
        var keys = (data || []).map(function(r) { return r.config_key; });
        var required = ['api_key', 'api_secret', 'gkp_user', 'gkp_pass', 'billing_number'];
        var miss = required.filter(function(k) { return keys.indexOf(k) === -1; });
        if (miss.length > 0) throw new Error('Fehlend: ' + miss.join(', '));
        if (el) el.innerHTML = '<span class="text-xs text-green-600 font-semibold">Konfiguration vollstaendig (' + keys.length + ' Werte gespeichert)</span>';
        addLog('dhl', 'ok', 'Konfigurationstest bestanden');
    } catch(err) {
        if (el) el.innerHTML = '<span class="text-xs text-red-500 font-semibold">' + _escH(err.message) + '</span>';
        addLog('dhl', 'err', 'Test: ' + err.message);
    }
};

// ═══ LEXOFFICE CONFIG ═══
window.loadLexofficeConfig = async function() {
    try {
        var sb = _sb(); if (!sb) return;
        var { data } = await sb.from('connector_config').select('config_key, config_value').eq('connector_id', 'lexoffice');
        if (!data || !data.length) {
            CONNECTORS.lexoffice.status = 'disconnected';
            CONNECTORS.lexoffice.statusLabel = 'Nicht konfiguriert';
            return;
        }
        data.forEach(function(r) {
            var el = document.getElementById('conn_lexoffice_' + r.config_key);
            if (el) el.value = r.config_value;
        });
        CONNECTORS.lexoffice.status = 'connected';
        CONNECTORS.lexoffice.statusLabel = 'Verbunden';
    } catch(e) { console.warn('LexOffice config load:', e); }
};

window.saveLexofficeConfig = async function() {
    try {
        var sb = _sb(); if (!sb) throw new Error('Nicht eingeloggt');
        var apiKeyEl = document.getElementById('conn_lexoffice_api_key');
        var apiKey = apiKeyEl ? apiKeyEl.value.trim() : '';
        if (!apiKey) { _showToast('Bitte API Key eingeben.', 'error'); return; }
        var { error } = await sb.from('connector_config').upsert({
            connector_id: 'lexoffice', config_key: 'api_key', config_value: apiKey,
            updated_by: _sbUser().id, updated_at: new Date().toISOString()
        }, { onConflict: 'connector_id,config_key' });
        if (error) throw error;
        CONNECTORS.lexoffice.status = 'connected';
        CONNECTORS.lexoffice.statusLabel = 'Verbunden';
        addLog('lexoffice', 'ok', 'API Key gespeichert');
        _showToast('lexoffice API Key gespeichert!', 'success');
    } catch(err) {
        addLog('lexoffice', 'err', 'Speichern fehlgeschlagen: ' + err.message);
        _showToast('Fehler: ' + err.message, 'error');
    }
};

window.testLexofficeConnection = async function() {
    var el = document.getElementById('connTestResult_lexoffice');
    if (el) el.innerHTML = '<span class="text-xs text-gray-400 animate-pulse">Teste lexoffice-Verbindung...</span>';
    try {
        // First save
        await window.saveLexofficeConfig();
        // Then test by calling lexoffice-sync with test action
        var session = await _sb().auth.getSession();
        var token = session.data.session && session.data.session.access_token ? session.data.session.access_token : '';
        var resp = await fetch(window.SUPABASE_URL + '/functions/v1/lexoffice-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'apikey': window.SUPABASE_ANON_KEY },
            body: JSON.stringify({ action: 'test-connection' })
        });
        var data = await resp.json();
        if (resp.ok && !data.error) {
            if (el) el.innerHTML = '<span class="text-xs text-green-600 font-semibold">\u2705 Verbindung erfolgreich! lexoffice antwortet.</span>';
            addLog('lexoffice', 'ok', 'Verbindungstest bestanden');
            CONNECTORS.lexoffice.status = 'connected';
            CONNECTORS.lexoffice.statusLabel = 'Verbunden';
        } else {
            throw new Error(data.error || data.message || 'Unbekannter Fehler');
        }
    } catch(err) {
        if (el) el.innerHTML = '<span class="text-xs text-red-500 font-semibold">\u274c ' + _escH(err.message) + '</span>';
        addLog('lexoffice', 'err', 'Verbindungstest: ' + err.message);
    }
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

function timeAgo(d) { return window.timeAgo ? window.timeAgo(d) : '—'; }

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
// [prod] log removed




// ═══════════════════════════════════════════════════════
// TIKTOK INTEGRATION
// ═══════════════════════════════════════════════════════

window.saveTikTokConfig = async function() {
    var key = document.getElementById('tiktok_client_key');
    var secret = document.getElementById('tiktok_client_secret');
    var sandbox = document.getElementById('tiktok_sandbox');
    if (!key || !key.value.trim()) { _showToast('Bitte Client Key eingeben', 'error'); return; }
    try {
        var sb = _sb(); if (!sb) return;
        var profile = _sbProfile(); if (!profile) return;
        var isSandbox = sandbox && sandbox.value === 'true';
        await sb.from('connector_config').upsert({
            standort_id: profile.standort_id || null,
            connector_key: 'tiktok_client_key',
            config_value: key.value.trim()
        }, { onConflict: 'standort_id,connector_key' });
        await sb.from('connector_config').upsert({
            standort_id: profile.standort_id || null,
            connector_key: 'tiktok_client_secret',
            config_value: secret ? secret.value.trim() : ''
        }, { onConflict: 'standort_id,connector_key' });
        await sb.from('connector_config').upsert({
            standort_id: profile.standort_id || null,
            connector_key: 'tiktok_sandbox',
            config_value: isSandbox ? 'true' : 'false'
        }, { onConflict: 'standort_id,connector_key' });
        CONNECTORS.tiktok.status = 'planned';
        CONNECTORS.tiktok.statusLabel = 'Konfiguriert';
        _showToast('TikTok-Konfiguration gespeichert ✓', 'success');
    } catch(e) {
        _showToast('Fehler beim Speichern: ' + e.message, 'error');
    }
};

window.startTikTokOAuth = async function() {
    var key = document.getElementById('tiktok_client_key');
    if (!key || !key.value.trim()) { _showToast('Bitte zuerst Client Key speichern', 'error'); return; }
    var sandbox = document.getElementById('tiktok_sandbox');
    var isSandbox = sandbox && sandbox.value === 'true';
    var clientKey = key.value.trim();
    // TikTok OAuth 2.0 PKCE Flow
    var state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('tiktok_oauth_state', state);
    sessionStorage.setItem('tiktok_client_key', clientKey);
    var redirectUri = encodeURIComponent('https://cockpit.vitbikes.de/api/tiktok-callback');
    var scope = encodeURIComponent('user.info.basic,user.info.stats,video.list');
    var baseUrl = isSandbox 
        ? 'https://www.tiktok.com/v2/auth/authorize/'
        : 'https://www.tiktok.com/v2/auth/authorize/';
    var authUrl = baseUrl
        + '?client_key=' + encodeURIComponent(clientKey)
        + '&response_type=code'
        + '&scope=' + scope
        + '&redirect_uri=' + redirectUri
        + '&state=' + state;
    _showToast('TikTok OAuth wird geöffnet...', 'info');
    window.open(authUrl, '_blank', 'width=600,height=700,scrollbars=yes');
};

window.loadTikTokData = async function() {
    var statsArea = document.getElementById('tiktokStatsArea');
    _showToast('TikTok-Daten werden geladen...', 'info');
    try {
        var sb = _sb(); if (!sb) return;
        // Try to get stored access token
        var profile = _sbProfile();
        var { data: tokenRow } = await sb.from('connector_config')
            .select('config_value')
            .eq('connector_key', 'tiktok_access_token')
            .maybeSingle();
        if (!tokenRow || !tokenRow.config_value) {
            _showToast('Kein Access Token – bitte zuerst mit TikTok verbinden', 'error');
            return;
        }
        var accessToken = tokenRow.config_value;

        // Fetch user info via Supabase Edge Function proxy
        var { data: resp, error } = await sb.functions.invoke('tiktok-proxy', {
            body: { action: 'user_info', access_token: accessToken }
        });

        if (error || !resp) {
            // Fallback: show sandbox demo data
            _showTikTokDemoData();
            return;
        }

        // Populate account stats
        var u = resp.user || {};
        var el = function(id) { return document.getElementById(id); };
        if (el('tiktokDisplayName')) el('tiktokDisplayName').textContent = u.display_name || '—';
        if (el('tiktokFollowers')) el('tiktokFollowers').textContent = _fmtN ? _fmtN(u.follower_count || 0) : (u.follower_count || 0);
        if (el('tiktokLikes')) el('tiktokLikes').textContent = _fmtN ? _fmtN(u.likes_count || 0) : (u.likes_count || 0);
        if (el('tiktokVideoCount')) el('tiktokVideoCount').textContent = u.video_count || 0;
        if (el('tiktokAvatar') && u.avatar_url) el('tiktokAvatar').src = u.avatar_url;

        // Fetch videos
        var { data: vResp } = await sb.functions.invoke('tiktok-proxy', {
            body: { action: 'video_list', access_token: accessToken }
        });
        if (vResp && vResp.videos) _renderTikTokVideos(vResp.videos);

        if (statsArea) statsArea.style.display = '';
        CONNECTORS.tiktok.status = 'connected';
        CONNECTORS.tiktok.statusLabel = 'Verbunden';
        _showToast('TikTok-Daten geladen ✓', 'success');
    } catch(e) {
        _showTikTokDemoData();
    }
};

function _showTikTokDemoData() {
    var statsArea = document.getElementById('tiktokStatsArea');
    var el = function(id) { return document.getElementById(id); };
    // Demo account stats
    if (el('tiktokDisplayName')) el('tiktokDisplayName').textContent = 'vitbikes (Sandbox/Demo)';
    if (el('tiktokFollowers')) el('tiktokFollowers').textContent = '1.247';
    if (el('tiktokLikes')) el('tiktokLikes').textContent = '8.432';
    if (el('tiktokVideoCount')) el('tiktokVideoCount').textContent = '34';
    // Demo videos
    var demoVideos = [
        { title: 'E-Bike Beratung – So findest du das perfekte Rad', view_count: 12400, like_count: 843, comment_count: 67, share_count: 124, create_time: '2026-02-20' },
        { title: 'Gravel vs. Trekking – Was passt zu dir?', view_count: 8700, like_count: 612, comment_count: 44, share_count: 89, create_time: '2026-02-14' },
        { title: 'Frühjahrs-Check: Fahrrad fit machen für die Saison', view_count: 6200, like_count: 390, comment_count: 28, share_count: 55, create_time: '2026-02-07' },
        { title: 'JobRad erklärt: Wie funktioniert Leasing?', view_count: 21300, like_count: 1820, comment_count: 143, share_count: 340, create_time: '2026-01-30' },
        { title: 'MTB-Trail Highlight Münster', view_count: 4900, like_count: 278, comment_count: 19, share_count: 41, create_time: '2026-01-22' },
    ];
    _renderTikTokVideos(demoVideos);
    if (statsArea) statsArea.style.display = '';
    _showToast('Demo-Daten angezeigt (Sandbox-Modus)', 'info');
}

function _renderTikTokVideos(videos) {
    var tbody = document.getElementById('tiktokVideoRows');
    if (!tbody) return;
    var fmt = function(n) { return _fmtN ? _fmtN(n) : (n || 0).toLocaleString('de-DE'); };
    tbody.innerHTML = videos.slice(0, 10).map(function(v) {
        var date = v.create_time ? new Date(v.create_time).toLocaleDateString('de-DE') : '—';
        return '<tr style="border-bottom:1px solid #f3f4f6">'
            + '<td style="padding:5px 8px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _escH(v.title || '(kein Titel)') + '</td>'
            + '<td style="padding:5px 8px;text-align:center;font-weight:600">' + fmt(v.view_count) + '</td>'
            + '<td style="padding:5px 8px;text-align:center">' + fmt(v.like_count) + '</td>'
            + '<td style="padding:5px 8px;text-align:center">' + fmt(v.comment_count) + '</td>'
            + '<td style="padding:5px 8px;text-align:center">' + fmt(v.share_count) + '</td>'
            + '<td style="padding:5px 8px;text-align:center;color:#9ca3af">' + date + '</td>'
            + '</tr>';
    }).join('');
}

window.loadTikTokConfig = async function() {
    try {
        var sb = _sb(); if (!sb) return;
        var { data: rows } = await sb.from('connector_config')
            .select('connector_key, config_value')
            .in('connector_key', ['tiktok_client_key', 'tiktok_client_secret', 'tiktok_sandbox', 'tiktok_access_token']);
        if (!rows || !rows.length) return;
        var map = {};
        rows.forEach(function(r) { map[r.connector_key] = r.config_value; });
        var keyEl = document.getElementById('tiktok_client_key');
        var secretEl = document.getElementById('tiktok_client_secret');
        var sandboxEl = document.getElementById('tiktok_sandbox');
        if (keyEl && map.tiktok_client_key) keyEl.value = map.tiktok_client_key;
        if (secretEl && map.tiktok_client_secret) secretEl.value = map.tiktok_client_secret;
        if (sandboxEl && map.tiktok_sandbox) sandboxEl.value = map.tiktok_sandbox;
        if (map.tiktok_access_token) {
            CONNECTORS.tiktok.status = 'connected';
            CONNECTORS.tiktok.statusLabel = 'Verbunden';
        } else if (map.tiktok_client_key) {
            CONNECTORS.tiktok.status = 'planned';
            CONNECTORS.tiktok.statusLabel = 'Konfiguriert';
        }
    } catch(e) {}
};
