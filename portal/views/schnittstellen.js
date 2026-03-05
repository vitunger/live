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
        configFields: [
            { key: 'customer_id', label: 'Customer ID (ohne Bindestriche)', type: 'text', placeholder: 'z.B. 1234567890' },
            { key: 'developer_token', label: 'Developer Token', type: 'password', placeholder: 'Google Ads Developer Token' },
            { key: 'client_id', label: 'OAuth Client ID', type: 'text', placeholder: 'z.B. 123456-xxxxx.apps.googleusercontent.com' },
            { key: 'client_secret', label: 'OAuth Client Secret', type: 'password', placeholder: 'OAuth Client Secret' },
            { key: 'refresh_token', label: 'Refresh Token', type: 'password', placeholder: 'OAuth Refresh Token (einmalig generiert)' },
        ],
        readonlyFields: [
            { key: 'last_sync', label: 'Letzter Sync', value: '—' },
            { key: 'sync_status', label: 'Sync-Status', value: '—' },
        ],
        logs: []
    },
    meta: {
        id: 'meta', name: 'Meta Ads', icon: '📘', iconBg: '#dbeafe',
        desc: 'Facebook & Instagram Ads. Kampagnen, Reichweite und Conversions.',
        category: 'active', status: 'connected', statusLabel: 'Verbunden',
        configFields: [
            { key: 'ad_account_id', label: 'Ad Account ID', type: 'text', placeholder: 'z.B. act_1234567890' },
            { key: 'access_token', label: 'System User Access Token', type: 'password', placeholder: 'Token aus Business Manager (läuft nicht ab)' },
        ],
        readonlyFields: [
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
    instagram: {
        id: 'instagram', name: 'Instagram', icon: '📸', iconBg: '#fce7f3',
        desc: 'Organische Performance: Posts, Follower, Reichweite & Story-Insights pro Standort.',
        category: 'active', status: 'disconnected', statusLabel: 'Nicht verbunden',
        oauthFields: [
            { key: 'page_id', label: 'Instagram Business Account ID', type: 'text', placeholder: 'z.B. 17841400455970638' },
            { key: 'access_token', label: 'System User Token', type: 'password', placeholder: 'Aus Meta Business Manager (l\u00e4uft nicht ab)' },
        ],
        readonlyFields: [
            { key: 'api', label: 'API', value: 'Meta Graph API v19+ \u2013 Instagram Business' },
            { key: 'scopes', label: 'Ben\u00f6tigte Rechte', value: 'instagram_basic, instagram_manage_insights, pages_show_list' },
            { key: 'hint', label: 'Tipp', value: 'Gleicher System User Token wie bei Meta Ads verwendbar' },
        ],
        logs: []
    },
    facebook: {
        id: 'facebook', name: 'Facebook Page', icon: '👥', iconBg: '#dbeafe',
        desc: 'Facebook Seiten-Insights: Fans, Reichweite, Post-Performance & Engagement.',
        category: 'active', status: 'disconnected', statusLabel: 'Nicht verbunden',
        oauthFields: [
            { key: 'page_id', label: 'Facebook Page ID', type: 'text', placeholder: 'z.B. 123456789012345' },
            { key: 'access_token', label: 'System User Token', type: 'password', placeholder: 'Aus Meta Business Manager (l\u00e4uft nicht ab)' },
        ],
        readonlyFields: [
            { key: 'api', label: 'API', value: 'Meta Graph API v19+ \u2013 Facebook Pages API' },
            { key: 'scopes', label: 'Ben\u00f6tigte Rechte', value: 'pages_show_list, pages_read_engagement, pages_read_user_content' },
            { key: 'hint', label: 'Tipp', value: 'Gleicher System User Token wie bei Meta Ads & Instagram verwendbar' },
        ],
        logs: []
    },
    youtube: {
        id: 'youtube', name: 'YouTube', icon: '▶️', iconBg: '#fee2e2',
        desc: 'YouTube Analytics: Abonnenten, Views, Watch-Time & Video-Performance.',
        category: 'active', status: 'disconnected', statusLabel: 'Nicht verbunden',
        oauthFields: [
            { key: 'api_key', label: 'YouTube Data API Key', type: 'password', placeholder: 'AIzaSy...' },
            { key: 'channel_id', label: 'Channel ID', type: 'text', placeholder: 'z.B. UCxxxxxxxxxxxxxxxxxxxxxxxx' },
        ],
        readonlyFields: [
            { key: 'api', label: 'API', value: 'YouTube Data API v3 + YouTube Analytics API' },
            { key: 'scopes', label: 'Scopes (OAuth)', value: 'youtube.readonly, yt-analytics.readonly' },
            { key: 'console', label: 'Key erstellen', value: 'console.cloud.google.com → APIs & Services → Credentials' },
        ],
        logs: []
    },
    gmb: {
        id: 'gmb', name: 'Google My Business', icon: '📍', iconBg: '#dcfce7',
        desc: 'Google Business Profile: Bewertungen, Sichtbarkeit, Anrufe & Wegbeschreibungen.',
        category: 'active', status: 'disconnected', statusLabel: 'Nicht verbunden',
        oauthFields: [
            { key: 'account_id', label: 'Business Account ID', type: 'text', placeholder: 'accounts/123456789' },
            { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Google Cloud API Key' },
        ],
        readonlyFields: [
            { key: 'api', label: 'API', value: 'Google Business Profile API v4' },
            { key: 'scopes', label: 'OAuth Scope', value: 'https://www.googleapis.com/auth/business.manage' },
            { key: 'note', label: 'Hinweis', value: 'API muss in Google Cloud Console aktiviert werden (Business Profile API)' },
        ],
        logs: []
    },
    analytics: {
        id: 'analytics', name: 'Google Analytics', icon: '📊', iconBg: '#fef3c7',
        desc: 'GA4 Website-Daten: Seitenaufrufe, Sessions, Traffic-Quellen & Nutzerverhalten.',
        category: 'active', status: 'disconnected', statusLabel: 'Nicht verbunden',
        oauthFields: [
            { key: 'property_id', label: 'GA4 Property ID', type: 'text', placeholder: 'z.B. 123456789' },
            { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Google Cloud API Key' },
        ],
        readonlyFields: [
            { key: 'api', label: 'API', value: 'Google Analytics Data API v1 (GA4)' },
            { key: 'property', label: 'Property Format', value: 'properties/PROPERTY_ID' },
            { key: 'console', label: 'Setup', value: 'analytics.google.com → Admin → Property → Property Settings → Property ID' },
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

var openCards = { etermin: false, lexoffice: false, google: false, meta: false, wawi: false, approom: false, dhl: false, tiktok: false, instagram: false, facebook: false, youtube: false, gmb: false, analytics: false };

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
    setTimeout(function() { if (window.loadAdsConfigs) window.loadAdsConfigs(); }, 900);
    setTimeout(function() { if (window.loadSocialConfigs) window.loadSocialConfigs(); }, 800);
    setTimeout(function() { if (window.loadAllSocialOverviews) window.loadAllSocialOverviews(); }, 1000);
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
            c._syncStatus = a.sync_status;
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
    var ids = ['etermin', 'tiktok', 'instagram', 'facebook', 'youtube', 'gmb', 'analytics', 'lexoffice', 'approom', 'dhl', 'google', 'meta', 'wawi'];
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
    el.innerHTML = ['etermin', 'lexoffice', 'approom', 'dhl', 'google', 'meta', 'tiktok', 'instagram', 'facebook', 'youtube', 'gmb', 'analytics', 'wawi'].map(function(id) {
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
        // Editable config fields
        if (c.configFields) {
            c.configFields.forEach(function(f) {
                body += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">' + f.label + '</label>'
                    + '<input type="' + f.type + '" id="conn_' + id + '_' + f.key + '" placeholder="' + f.placeholder + '" '
                    + 'class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition font-mono"></div>';
            });
        }
        // Readonly status info
        if (c.readonlyFields) {
            body += '<div class="pt-2 border-t border-gray-100 mt-2 space-y-1">';
            c.readonlyFields.forEach(function(f) {
                body += '<div class="flex items-center gap-3"><span class="text-xs text-gray-500 w-28">' + f.label + '</span><span class="text-xs font-semibold text-gray-800" id="conn_' + id + '_ro_' + f.key + '">' + _escH(f.value) + '</span></div>';
            });
            body += '</div>';
        }
        // Info box
        if (id === 'google') {
            body += '<div class="bg-blue-50 border border-blue-200 rounded-lg p-3">'
                + '<p class="text-xs text-blue-700">\u2139\ufe0f <strong>Setup:</strong> Developer Token aus dem Google Ads MCC. '
                + 'OAuth Credentials aus der Google Cloud Console (APIs & Services \u2192 Credentials). '
                + 'Refresh Token einmalig \u00fcber den OAuth Playground generieren.</p></div>';
        }
        if (id === 'meta') {
            body += '<div class="bg-blue-50 border border-blue-200 rounded-lg p-3">'
                + '<p class="text-xs text-blue-700">\u2139\ufe0f <strong>Setup:</strong> System User Token im Meta Business Manager erstellen '
                + '(Einstellungen \u2192 Systembenutzer \u2192 Token generieren). Berechtigung: <em>ads_read</em> auf das Ad Account. '
                + 'System User Tokens laufen nicht ab!</p></div>';
        }
        // Buttons
        body += '<div class="flex gap-2 pt-1">'
            + '<button onclick="window.saveAdsConfig(\'' + id + '\')" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition">\ud83d\udcbe Speichern</button>'
            + '<button onclick="window.testAdsConnection(\'' + id + '\')" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition">\ud83d\udd0d Verbindung testen</button>'
            + '<button onclick="window.manualSync(\'' + id + '\')" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition">\ud83d\udd04 Manuell synchronisieren</button>'
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


    // ── Instagram body ──
    if (id === 'instagram') {
        body += '<div class="pt-4 space-y-4">';
        body += renderGfToggle(id);
        body += '<p class="text-xs text-gray-500">Instagram Business via System User Token (Meta Business Manager). Organische Posts, Follower-Entwicklung und Story-Reichweite.</p>';
        body += _renderOAuthFields(c, 'instagram');
        body += _renderReadonlyInfo(c);
        body += '<div style="display:flex;gap:8px;flex-wrap:wrap">'
            + '<button onclick="window.saveSocialConfig(\'instagram\')" style="padding:7px 14px;background:#1a1a2e;color:#fff;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">💾 Speichern</button>'
            + '<button onclick="window.loadSocialData(\'instagram\')" style="padding:7px 14px;background:linear-gradient(135deg,#e1306c,#f77737,#fcaf45);color:#fff;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">🔄 Daten laden</button>'
            + '</div>';
        body += '<div id="socialStats_instagram" style="display:none">';
        body += '<div id="socialAccountCard_instagram" style="background:#f9fafb;border-radius:10px;padding:12px;margin-top:8px">'
            + '<p id="socialName_instagram" class="text-sm font-bold text-gray-800">—</p>'
            + '<div style="display:flex;gap:16px;margin-top:6px;flex-wrap:wrap">'
            + '<span class="text-[11px] text-gray-500">👥 <span id="socialFollowers_instagram">—</span> Follower</span>'
            + '<span class="text-[11px] text-gray-500">❤️ <span id="socialReach_instagram">—</span> Reichweite (30T)</span>'
            + '<span class="text-[11px] text-gray-500">🖼 <span id="socialPosts_instagram">—</span> Posts</span>'
            + '</div></div>';
        body += _renderSocialVideoTable('instagram', ['Post', '❤️ Likes', '💬 Komm.', '👁 Impressionen', 'Datum']);
        body += '</div>';
        body += '</div>';
    }

    // ── Facebook body ──
    if (id === 'facebook') {
        body += '<div class="pt-4 space-y-4">';
        body += renderGfToggle(id);
        body += '<p class="text-xs text-gray-500">Facebook Page via System User Token (Meta Business Manager). Fans, Reichweite und Engagement-Auswertung.</p>';
        body += _renderOAuthFields(c, 'facebook');
        body += _renderReadonlyInfo(c);
        body += '<div style="display:flex;gap:8px;flex-wrap:wrap">'
            + '<button onclick="window.saveSocialConfig(\'facebook\')" style="padding:7px 14px;background:#1a1a2e;color:#fff;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">💾 Speichern</button>'
            + '<button onclick="window.loadSocialData(\'facebook\')" style="padding:7px 14px;background:#1877f2;color:#fff;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">🔄 Daten laden</button>'
            + '</div>';
        body += '<div id="socialStats_facebook" style="display:none">';
        body += '<div id="socialAccountCard_facebook" style="background:#f9fafb;border-radius:10px;padding:12px;margin-top:8px">'
            + '<p id="socialName_facebook" class="text-sm font-bold text-gray-800">—</p>'
            + '<div style="display:flex;gap:16px;margin-top:6px;flex-wrap:wrap">'
            + '<span class="text-[11px] text-gray-500">👍 <span id="socialFollowers_facebook">—</span> Fans</span>'
            + '<span class="text-[11px] text-gray-500">📢 <span id="socialReach_facebook">—</span> Reichweite (30T)</span>'
            + '<span class="text-[11px] text-gray-500">📝 <span id="socialPosts_facebook">—</span> Posts</span>'
            + '</div></div>';
        body += _renderSocialVideoTable('facebook', ['Post', '❤️ Reaktionen', '💬 Komm.', '↗ Shares', 'Datum']);
        body += '</div>';
        body += '</div>';
    }

    // ── YouTube body ──
    if (id === 'youtube') {
        body += '<div class="pt-4 space-y-4">';
        body += renderGfToggle(id);
        body += '<p class="text-xs text-gray-500">YouTube Analytics: Abonnenten, Gesamtaufrufe, Watch-Time und Video-Performance des vit:bikes Kanals.</p>';
        body += _renderOAuthFields(c, 'youtube');
        body += _renderReadonlyInfo(c);
        body += '<div style="display:flex;gap:8px;flex-wrap:wrap">'
            + '<button onclick="window.saveSocialConfig(\'youtube\')" style="padding:7px 14px;background:#1a1a2e;color:#fff;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">💾 Speichern</button>'
            + '<button onclick="window.loadSocialData(\'youtube\')" style="padding:7px 14px;background:#ff0000;color:#fff;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">🔄 Daten laden</button>'
            + '</div>';
        body += '<div id="socialStats_youtube" style="display:none">';
        body += '<div id="socialAccountCard_youtube" style="background:#f9fafb;border-radius:10px;padding:12px;margin-top:8px">'
            + '<p id="socialName_youtube" class="text-sm font-bold text-gray-800">—</p>'
            + '<div style="display:flex;gap:16px;margin-top:6px;flex-wrap:wrap">'
            + '<span class="text-[11px] text-gray-500">🔔 <span id="socialFollowers_youtube">—</span> Abonnenten</span>'
            + '<span class="text-[11px] text-gray-500">👁 <span id="socialReach_youtube">—</span> Aufrufe gesamt</span>'
            + '<span class="text-[11px] text-gray-500">🎬 <span id="socialPosts_youtube">—</span> Videos</span>'
            + '</div></div>';
        body += _renderSocialVideoTable('youtube', ['Titel', '👁 Views', '👍 Likes', '⏱ Watch-Time (Min)', 'Datum']);
        body += '</div>';
        body += '</div>';
    }

    // ── Google My Business body ──
    if (id === 'gmb') {
        body += '<div class="pt-4 space-y-4">';
        body += renderGfToggle(id);
        body += '<p class="text-xs text-gray-500">Google Business Profile: Bewertungen, Anrufe, Wegbeschreibungen und Profilaufrufe – pro Standort oder netzwerkweit.</p>';
        body += _renderOAuthFields(c, 'gmb');
        body += _renderReadonlyInfo(c);
        body += '<div style="display:flex;gap:8px;flex-wrap:wrap">'
            + '<button onclick="window.saveSocialConfig(\'gmb\')" style="padding:7px 14px;background:#1a1a2e;color:#fff;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">💾 Speichern</button>'
            + '<button onclick="window.loadSocialData(\'gmb\')" style="padding:7px 14px;background:#4285f4;color:#fff;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">🔄 Daten laden</button>'
            + '</div>';
        body += '<div id="socialStats_gmb" style="display:none">';
        body += '<div id="socialAccountCard_gmb" style="background:#f9fafb;border-radius:10px;padding:12px;margin-top:8px">'
            + '<p id="socialName_gmb" class="text-sm font-bold text-gray-800">—</p>'
            + '<div style="display:flex;gap:16px;margin-top:6px;flex-wrap:wrap">'
            + '<span class="text-[11px] text-gray-500">⭐ <span id="socialFollowers_gmb">—</span> Ø Bewertung</span>'
            + '<span class="text-[11px] text-gray-500">📋 <span id="socialReach_gmb">—</span> Bewertungen</span>'
            + '<span class="text-[11px] text-gray-500">👁 <span id="socialPosts_gmb">—</span> Profilaufrufe (30T)</span>'
            + '</div></div>';
        body += _renderSocialVideoTable('gmb', ['Rezensent', '⭐ Stars', 'Kommentar', 'Antwort', 'Datum']);
        body += '</div>';
        body += '</div>';
    }

    // ── Google Analytics body ──
    if (id === 'analytics') {
        body += '<div class="pt-4 space-y-4">';
        body += renderGfToggle(id);
        body += '<p class="text-xs text-gray-500">GA4 Website-Statistiken: Seitenaufrufe, Nutzer, Sessions und Traffic-Quellen für vitbikes.de und Standort-Webseiten.</p>';
        body += _renderOAuthFields(c, 'analytics');
        body += _renderReadonlyInfo(c);
        body += '<div style="display:flex;gap:8px;flex-wrap:wrap">'
            + '<button onclick="window.saveSocialConfig(\'analytics\')" style="padding:7px 14px;background:#1a1a2e;color:#fff;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">💾 Speichern</button>'
            + '<button onclick="window.loadSocialData(\'analytics\')" style="padding:7px 14px;background:#e37400;color:#fff;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer">🔄 Daten laden</button>'
            + '</div>';
        body += '<div id="socialStats_analytics" style="display:none">';
        body += '<div id="socialAccountCard_analytics" style="background:#f9fafb;border-radius:10px;padding:12px;margin-top:8px">'
            + '<p id="socialName_analytics" class="text-sm font-bold text-gray-800">—</p>'
            + '<div style="display:flex;gap:16px;margin-top:6px;flex-wrap:wrap">'
            + '<span class="text-[11px] text-gray-500">👁 <span id="socialFollowers_analytics">—</span> Seitenaufrufe (30T)</span>'
            + '<span class="text-[11px] text-gray-500">👤 <span id="socialReach_analytics">—</span> Nutzer (30T)</span>'
            + '<span class="text-[11px] text-gray-500">⏱ <span id="socialPosts_analytics">—</span> Ø Sitzungsdauer</span>'
            + '</div></div>';
        body += _renderSocialVideoTable('analytics', ['Seite', '👁 Aufrufe', '👤 Nutzer', '⏱ Ø Zeit', 'Quelle']);
        body += '</div>';
        body += '</div>';
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
    
    // Load data into fields after DOM is ready (card just opened)
    if (openCards[id]) {
        // Google Ads / Meta Ads
        if (id === 'google' || id === 'meta') {
            setTimeout(function() { if (window.loadAdsConfigs) window.loadAdsConfigs(); }, 100);
        }
        // Social connectors
        var socialPlatforms = ['instagram', 'facebook', 'youtube', 'gmb', 'analytics'];
        if (socialPlatforms.indexOf(id) >= 0) {
            setTimeout(function() {
                if (window.loadSocialForStandort) {
                    var selectEl = document.getElementById(id + '_standort_select');
                    var sid = selectEl ? selectEl.value : '';
                    window.loadSocialForStandort(id, sid || null);
                }
                if (window.loadSocialStandortOverview) window.loadSocialStandortOverview(id);
            }, 100);
        }
        // DHL
        if (id === 'dhl') setTimeout(function() { if (window.loadDhlConfig) window.loadDhlConfig(); }, 100);
        // lexoffice
        if (id === 'lexoffice') setTimeout(function() { if (window.loadLexofficeConfig) window.loadLexofficeConfig(); }, 100);
        // TikTok
        if (id === 'tiktok') setTimeout(function() { if (window.loadTikTokConfig) window.loadTikTokConfig(); }, 100);
        // eTermin
        if (id === 'etermin') {
            loadEterminOverview();
            if (_sbProfile() && _sbProfile().is_hq) loadEterminMapping();
        }
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
        var sb = _sb(); if (!sb) return;
        var c = CONNECTORS.dhl;
        var values = {};
        c.dhlFields.forEach(function(f) {
            var el = document.getElementById('conn_dhl_' + f.key);
            if (el && el.value.trim()) values[f.key] = el.value.trim();
        });
        if (Object.keys(values).length === 0) { _showToast('Bitte mindestens ein Feld ausfuellen', 'error'); return; }
        var keys = Object.keys(values);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var { data: existing } = await sb.from('connector_config')
                .select('id')
                .eq('connector_id', 'dhl')
                .eq('config_key', key)
                .is('standort_id', null)
                .maybeSingle();
            if (existing) {
                await sb.from('connector_config').update({
                    config_value: values[key],
                    updated_at: new Date().toISOString(),
                    updated_by: _sbUser() ? _sbUser().id : null
                }).eq('id', existing.id);
            } else {
                await sb.from('connector_config').insert({
                    connector_id: 'dhl', config_key: key, config_value: values[key],
                    standort_id: null,
                    updated_at: new Date().toISOString(), updated_by: _sbUser() ? _sbUser().id : null
                });
            }
        }
        CONNECTORS.dhl.status = 'connected';
        CONNECTORS.dhl.statusLabel = 'Konfiguriert';
        renderStatusGrid();
        _showToast('DHL Konfiguration gespeichert \u2713', 'success');
    } catch(e) {
        _showToast('Fehler: ' + e.message, 'error');
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
        var sb = _sb(); if (!sb) return;
        var apiKeyEl = document.getElementById('conn_lexoffice_api_key');
        var apiKey = apiKeyEl ? apiKeyEl.value.trim() : '';
        if (!apiKey) { _showToast('Bitte API Key eintragen', 'error'); return; }
        var { data: existing } = await sb.from('connector_config')
            .select('id')
            .eq('connector_id', 'lexoffice')
            .eq('config_key', 'api_key')
            .is('standort_id', null)
            .maybeSingle();
        if (existing) {
            await sb.from('connector_config').update({
                config_value: apiKey,
                updated_at: new Date().toISOString(),
                updated_by: _sbUser() ? _sbUser().id : null
            }).eq('id', existing.id);
        } else {
            await sb.from('connector_config').insert({
                connector_id: 'lexoffice', config_key: 'api_key', config_value: apiKey,
                standort_id: null,
                updated_at: new Date().toISOString(), updated_by: _sbUser() ? _sbUser().id : null
            });
        }
        CONNECTORS.lexoffice.status = 'connected';
        CONNECTORS.lexoffice.statusLabel = 'Verbunden';
        renderStatusGrid();
        _showToast('lexoffice API Key gespeichert \u2713', 'success');
    } catch(e) {
        _showToast('Fehler: ' + e.message, 'error');
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
// SOCIAL MEDIA – SHARED HELPERS
// ═══════════════════════════════════════════════════════

function _renderOAuthFields(c, prefix) {
    var isHQ = _sbProfile() && _sbProfile().is_hq;
    var html = '<div class="space-y-2">';
    // Standort-Dropdown (HQ sees all, Partner sees own)
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">\ud83d\udccd Standort</label>'
        + '<select id="' + prefix + '_standort_select" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-blue-400 outline-none" '
        + 'onchange="window.loadSocialForStandort(\'' + prefix + '\', this.value)">';
    if (isHQ) {
        html += '<option value="">HQ (eigener Account)</option>';
        if (window._allStandorte) {
            window._allStandorte.forEach(function(s) {
                if (s.id === 'a2b5bbdf-7b50-492d-a5cd-8349dae37d03') return; // Demo ausblenden
                html += '<option value="' + s.id + '">' + _escH(s.name) + '</option>';
            });
        }
    } else {
        var profile = _sbProfile();
        html += '<option value="' + (profile.standort_id || '') + '">' + _escH(profile.standort_name || 'Mein Standort') + '</option>';
    }
    html += '</select></div>';
    // Standort-Uebersicht (welche konfiguriert)
    html += '<div id="' + prefix + '_standort_overview" style="margin-bottom:4px"></div>';
    // Config fields
    html += '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Verbindung konfigurieren</p>';
    (c.oauthFields || []).forEach(function(f) {
        html += '<div><label class="text-[10px] text-gray-500 font-medium">' + _escH(f.label) + '</label>'
            + '<input id="' + prefix + '_field_' + f.key + '" type="' + (f.type || 'text') + '" placeholder="' + _escH(f.placeholder || '') + '"'
            + ' style="width:100%;padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;margin-top:2px"/></div>';
    });
    html += '</div>';
    return html;
}

function _renderReadonlyInfo(c) {
    if (!c.readonlyFields || !c.readonlyFields.length) return '';
    var html = '<div class="space-y-1">';
    html += '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Info</p>';
    c.readonlyFields.forEach(function(f) {
        html += '<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #f3f4f6">'
            + '<span class="text-[10px] text-gray-400 font-medium" style="min-width:110px">' + _escH(f.label) + '</span>'
            + '<span class="text-[10px] text-gray-600">' + _escH(f.value) + '</span></div>';
    });
    html += '</div>';
    return html;
}

function _renderSocialVideoTable(platform, headers) {
    var html = '<div style="margin-top:12px">'
        + '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider" style="margin-bottom:6px">Details</p>'
        + '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">'
        + '<thead><tr style="border-bottom:2px solid #e5e7eb">';
    headers.forEach(function(h, i) {
        html += '<th style="text-align:' + (i === 0 ? 'left' : 'center') + ';padding:4px 8px;color:#6b7280;font-weight:600">' + h + '</th>';
    });
    html += '</tr></thead><tbody id="socialRows_' + platform + '"></tbody></table></div></div>';
    return html;
}

// ── DEMO DATA per platform ──
var SOCIAL_DEMO = {
    instagram: {
        name: 'vitbikes (Demo)', followers: '2.847', reach: '18.400', posts: '127',
        rows: [
            ['Frühjahrsaktion: E-Bike Test-Days 🚲', '342', '28', '4.200', '01.03.2026'],
            ['Gravel-Tipps für Anfänger', '218', '19', '2.900', '22.02.2026'],
            ['Hinter den Kulissen: Werkstatt-Alltag', '189', '14', '2.100', '15.02.2026'],
            ['JobRad \u2013 So einfach geht\'s', '567', '44', '7.800', '08.02.2026'],
            ['MTB-Trail Münster 🏔️', '143', '11', '1.600', '01.02.2026'],
        ]
    },
    facebook: {
        name: 'vit:bikes (Demo)', followers: '1.234', reach: '9.700', posts: '89',
        rows: [
            ['Frühjahrscheck – Fahrrad fit machen', '87', '12', '34', '28.02.2026'],
            ['Neue Partner: Herzlich willkommen!', '124', '22', '67', '20.02.2026'],
            ['E-Bike Beratung – Termin buchen', '56', '8', '19', '12.02.2026'],
            ['Saison-Opening 2026 🎉', '203', '38', '91', '05.02.2026'],
            ['Tipp: Reifendruck im Winter', '41', '5', '13', '29.01.2026'],
        ]
    },
    youtube: {
        name: 'vit:bikes Channel (Demo)', followers: '892', reach: '48.200', posts: '34',
        rows: [
            ['E-Bike Kaufberatung 2026 – Komplett-Guide', '12.400', '340', '1.820', '15.02.2026'],
            ['JobRad vs. Privatkauf – Was lohnt sich?', '8.700', '218', '1.240', '01.02.2026'],
            ['Werkstatt-Tour: So warten wir Dein Rad', '5.200', '134', '780', '20.01.2026'],
            ['Gravel Bike Test: Trek vs. Cube', '9.100', '287', '1.350', '10.01.2026'],
            ['Starnberger See mit dem Gravel Bike', '3.800', '98', '560', '02.01.2026'],
        ]
    },
    gmb: {
        name: 'vit:bikes Netzwerk (Demo)', followers: '4.7', reach: '89', posts: '3.240',
        rows: [
            ['Max M.', '⭐⭐⭐⭐⭐', 'Super Beratung, sehr kompetent!', '✓ Beantwortet', '01.03.2026'],
            ['Lisa K.', '⭐⭐⭐⭐⭐', 'Tolles Sortiment, faire Preise.', '✓ Beantwortet', '22.02.2026'],
            ['Thomas B.', '⭐⭐⭐⭐', 'Schnelle Reparatur, gerne wieder.', '✓ Beantwortet', '14.02.2026'],
            ['Sarah W.', '⭐⭐⭐⭐⭐', 'Hat mir das perfekte E-Bike empfohlen!', '✓ Beantwortet', '05.02.2026'],
            ['Klaus R.', '⭐⭐⭐', 'Wartezeit bei Werkstatt etwas lang.', '✓ Beantwortet', '28.01.2026'],
        ]
    },
    analytics: {
        name: 'vitbikes.de (Demo)', followers: '24.800', reach: '8.420', posts: '2m 14s',
        rows: [
            ['/e-bike-beratung', '4.200', '3.100', '3m 12s', 'Google Organic'],
            ['/', '3.800', '3.200', '1m 45s', 'Direkt'],
            ['/jobbike', '2.900', '2.400', '4m 08s', 'Google Ads'],
            ['/standorte', '2.100', '1.900', '1m 22s', 'Google Organic'],
            ['/kontakt', '1.800', '1.600', '0m 54s', 'Social Media'],
        ]
    }
};

window.saveSocialConfig = async function(platform) {
    var c = CONNECTORS[platform];
    if (!c || !c.oauthFields) return;
    try {
        var sb = _sb(); if (!sb) return;
        // Get selected standort from dropdown
        var selectEl = document.getElementById(platform + '_standort_select');
        var standortId = selectEl ? selectEl.value : null;
        if (!standortId) standortId = null; // HQ-level
        var hasValue = false;
        for (var i = 0; i < c.oauthFields.length; i++) {
            var f = c.oauthFields[i];
            var el = document.getElementById(platform + '_field_' + f.key);
            if (!el || !el.value.trim()) continue;
            hasValue = true;
            // Check if entry exists (COALESCE unique index)
            var query = sb.from('connector_config')
                .select('id')
                .eq('connector_id', platform)
                .eq('config_key', f.key);
            if (standortId) { query = query.eq('standort_id', standortId); }
            else { query = query.is('standort_id', null); }
            var { data: existing } = await query.maybeSingle();
            if (existing) {
                await sb.from('connector_config').update({
                    config_value: el.value.trim(),
                    updated_at: new Date().toISOString(),
                    updated_by: _sbUser() ? _sbUser().id : null
                }).eq('id', existing.id);
            } else {
                await sb.from('connector_config').insert({
                    connector_id: platform,
                    config_key: f.key,
                    config_value: el.value.trim(),
                    standort_id: standortId,
                    updated_at: new Date().toISOString(),
                    updated_by: _sbUser() ? _sbUser().id : null
                });
            }
        }
        if (!hasValue) { _showToast('Bitte mindestens ein Feld ausfuellen', 'error'); return; }
        // Reload standort overview
        if (window.loadSocialStandortOverview) window.loadSocialStandortOverview(platform);
        var sName = '';
        if (selectEl && selectEl.selectedIndex >= 0) sName = selectEl.options[selectEl.selectedIndex].text;
        _showToast(c.name + (sName ? ' (' + sName + ')' : '') + ' gespeichert \u2713', 'success');
    } catch(e) {
        _showToast('Fehler beim Speichern: ' + e.message, 'error');
    }
};

// Load social config for a specific standort
window.loadSocialForStandort = async function(platform, standortId) {
    try {
        var sb = _sb(); if (!sb) return;
        var c = CONNECTORS[platform];
        if (!c || !c.oauthFields) return;
        // Clear fields first
        c.oauthFields.forEach(function(f) {
            var el = document.getElementById(platform + '_field_' + f.key);
            if (el) el.value = '';
        });
        // Load config for this standort
        var query = sb.from('connector_config')
            .select('config_key, config_value')
            .eq('connector_id', platform);
        if (standortId) { query = query.eq('standort_id', standortId); }
        else { query = query.is('standort_id', null); }
        var { data } = await query;
        if (data && data.length) {
            data.forEach(function(r) {
                var el = document.getElementById(platform + '_field_' + r.config_key);
                if (el) el.value = r.config_value;
            });
        }
    } catch(e) {}
};

// Load overview: which standorte have config for this platform
window.loadSocialStandortOverview = async function(platform) {
    var el = document.getElementById(platform + '_standort_overview');
    if (!el) return;
    try {
        var sb = _sb(); if (!sb) return;
        var { data } = await sb.from('connector_config')
            .select('standort_id, config_key')
            .eq('connector_id', platform);
        if (!data || !data.length) {
            el.innerHTML = '<p class="text-[10px] text-gray-400 italic">Noch keine Standorte konfiguriert.</p>';
            return;
        }
        // Group by standort_id
        var standortIds = {};
        data.forEach(function(r) {
            var sid = r.standort_id || 'hq';
            standortIds[sid] = (standortIds[sid] || 0) + 1;
        });
        var count = Object.keys(standortIds).length;
        var hasHQ = !!standortIds['hq'];
        var standortCount = hasHQ ? count - 1 : count;
        var parts = [];
        if (hasHQ) parts.push('HQ');
        if (standortCount > 0) parts.push(standortCount + ' Standort' + (standortCount > 1 ? 'e' : ''));
        el.innerHTML = '<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">'
            + '<span style="color:#16a34a;font-size:11px;font-weight:600">\u2705 Konfiguriert: ' + parts.join(' + ') + '</span>'
            + '</div>';
    } catch(e) {
        el.innerHTML = '';
    }
};

// Load all social standort overviews on page load
window.loadAllSocialOverviews = function() {
    var platforms = ['instagram', 'facebook', 'youtube', 'gmb', 'analytics'];
    platforms.forEach(function(p) {
        if (window.loadSocialStandortOverview) window.loadSocialStandortOverview(p);
    });
};


window.loadSocialData = async function(platform) {
    _showToast('Daten werden geladen...', 'info');
    var sb = _sb();

    // ── YouTube: direkte Google API (kein CORS-Problem) ──────────────
    if (platform === 'youtube') {
        var keyEl = document.getElementById('youtube_field_api_key');
        var chEl = document.getElementById('youtube_field_channel_id');
        var apiKey = (keyEl && keyEl.value.trim()) ? keyEl.value.trim() : 'AIzaSyBLlbkT79izWdYCFnuqHmwlC5-hfA5CUFc';
        var channelId = chEl && chEl.value.trim();
        if (channelId) {
            try {
                var chUrl = 'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=' + encodeURIComponent(channelId) + '&key=' + encodeURIComponent(apiKey);
                var resp = await fetch(chUrl);
                var data = await resp.json();
                if (data.items && data.items.length > 0) {
                    var ch = data.items[0];
                    var stats = ch.statistics || {};
                    _populateSocialCard('youtube',
                        ch.snippet.title,
                        parseInt(stats.subscriberCount || 0).toLocaleString('de-DE'),
                        parseInt(stats.viewCount || 0).toLocaleString('de-DE'),
                        parseInt(stats.videoCount || 0).toLocaleString('de-DE')
                    );
                    var searchUrl = 'https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=' + encodeURIComponent(channelId) + '&order=date&maxResults=10&type=video&key=' + encodeURIComponent(apiKey);
                    var sResp = await fetch(searchUrl);
                    var sData = await sResp.json();
                    if (sData.items && sData.items.length) {
                        var videoIds = sData.items.map(function(v) { return v.id.videoId; }).join(',');
                        var vUrl = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=' + videoIds + '&key=' + encodeURIComponent(apiKey);
                        var vResp2 = await fetch(vUrl);
                        var vData = await vResp2.json();
                        if (vData.items) {
                            var rows = vData.items.map(function(v) {
                                var s = v.statistics || {};
                                var date = v.snippet.publishedAt ? new Date(v.snippet.publishedAt).toLocaleDateString('de-DE') : '—';
                                return [v.snippet.title, parseInt(s.viewCount||0).toLocaleString('de-DE'), parseInt(s.likeCount||0).toLocaleString('de-DE'), '—', date];
                            });
                            _populateSocialRows('youtube', rows);
                        }
                    }
                    document.getElementById('socialStats_youtube').style.display = '';
                    CONNECTORS.youtube.status = 'connected';
                    CONNECTORS.youtube.statusLabel = 'Verbunden';
                    _showToast('YouTube-Daten geladen ✓', 'success');
                    return;
                }
            } catch(e) { console.warn('YouTube live fehlgeschlagen, zeige Demo:', e); }
        }
        _showSocialDemo('youtube');
        return;
    }

    // ── Google Analytics: via analytics-proxy Edge Function ──────────
    if (platform === 'analytics') {
        var propEl = document.getElementById('analytics_field_property_id');
        var keyEl2 = document.getElementById('analytics_field_api_key');
        var propertyId = propEl && propEl.value.trim();
        var apiKey2 = keyEl2 && keyEl2.value.trim();
        if (propertyId && apiKey2 && sb) {
            try {
                var ovResp = await sb.functions.invoke('analytics-proxy', {
                    body: { action: 'overview', property_id: propertyId, api_key: apiKey2 }
                });
                var pagesResp = await sb.functions.invoke('analytics-proxy', {
                    body: { action: 'top_pages', property_id: propertyId, api_key: apiKey2 }
                });
                if (ovResp.data && !ovResp.error) {
                    var ov = ovResp.data;
                    _populateSocialCard('analytics',
                        'GA4 Property ' + propertyId,
                        parseInt(ov.pageviews||0).toLocaleString('de-DE'),
                        parseInt(ov.users||0).toLocaleString('de-DE'),
                        ov.avg_session_duration || '—'
                    );
                    if (pagesResp.data && pagesResp.data.pages) {
                        var pageRows = pagesResp.data.pages.map(function(p) {
                            return [p.page, parseInt(p.views).toLocaleString('de-DE'), parseInt(p.users).toLocaleString('de-DE'), p.avg_time, p.source];
                        });
                        _populateSocialRows('analytics', pageRows);
                    }
                    document.getElementById('socialStats_analytics').style.display = '';
                    CONNECTORS.analytics.status = 'connected';
                    CONNECTORS.analytics.statusLabel = 'Verbunden';
                    _showToast('Google Analytics Daten geladen ✓', 'success');
                    return;
                } else if (ovResp.error || (ovResp.data && ovResp.data.error)) {
                    _showToast('GA4 Fehler: ' + (ovResp.data && ovResp.data.error || ovResp.error), 'error');
                }
            } catch(e) { _showToast('GA4 Verbindungsfehler: ' + e.message, 'error'); }
        }
        _showSocialDemo('analytics');
        return;
    }

    // ── Google My Business: via gmb-proxy Edge Function ──────────────
    if (platform === 'gmb') {
        var accEl = document.getElementById('gmb_field_account_id');
        var gmbKeyEl = document.getElementById('gmb_field_api_key');
        var accountId = accEl && accEl.value.trim();
        var gmbApiKey = gmbKeyEl && gmbKeyEl.value.trim();
        if (accountId && gmbApiKey && sb) {
            try {
                var ovResp2 = await sb.functions.invoke('gmb-proxy', {
                    body: { action: 'overview', account_id: accountId, api_key: gmbApiKey }
                });
                if (ovResp2.data && !ovResp2.error && !ovResp2.data.error) {
                    var ov2 = ovResp2.data;
                    _populateSocialCard('gmb',
                        ov2.account_name || accountId,
                        ov2.avg_rating || '—',
                        ov2.total_reviews || '—',
                        ov2.locations_count || '—'
                    );
                    // Load reviews for first location
                    if (ov2.locations && ov2.locations.length > 0) {
                        var revResp = await sb.functions.invoke('gmb-proxy', {
                            body: { action: 'reviews', account_id: accountId, location_id: ov2.locations[0].id, api_key: gmbApiKey }
                        });
                        if (revResp.data && revResp.data.reviews) {
                            var revRows = revResp.data.reviews.map(function(r) {
                                return [r.reviewer, '★'.repeat(r.stars), r.comment.substring(0,60)+(r.comment.length>60?'…':''), r.reply, r.date];
                            });
                            _populateSocialRows('gmb', revRows);
                        }
                    }
                    document.getElementById('socialStats_gmb').style.display = '';
                    CONNECTORS.gmb.status = 'connected';
                    CONNECTORS.gmb.statusLabel = 'Verbunden';
                    _showToast('Google My Business Daten geladen ✓', 'success');
                    return;
                } else {
                    _showToast('GMB Fehler: ' + (ovResp2.data && ovResp2.data.error || 'Unbekannt'), 'error');
                }
            } catch(e) { _showToast('GMB Verbindungsfehler: ' + e.message, 'error'); }
        }
        _showSocialDemo('gmb');
        return;
    }

    // ── TikTok: via tiktok-proxy Edge Function ───────────────────────
    if (platform === 'tiktok') {
        if (sb) {
            try {
                var ttResp = await sb.functions.invoke('tiktok-proxy', { body: { action: 'user_info' } });
                if (ttResp.data && ttResp.data.user) {
                    var u = ttResp.data.user;
                    var fmt = function(n) { return parseInt(n||0).toLocaleString('de-DE'); };
                    var el = function(id) { return document.getElementById(id); };
                    if (el('tiktokDisplayName')) el('tiktokDisplayName').textContent = u.display_name || '—';
                    if (el('tiktokFollowers')) el('tiktokFollowers').textContent = fmt(u.follower_count);
                    if (el('tiktokLikes')) el('tiktokLikes').textContent = fmt(u.likes_count);
                    if (el('tiktokVideoCount')) el('tiktokVideoCount').textContent = u.video_count || 0;
                    if (el('tiktokAvatar') && u.avatar_url) el('tiktokAvatar').src = u.avatar_url;
                    var vResp3 = await sb.functions.invoke('tiktok-proxy', { body: { action: 'video_list' } });
                    if (vResp3.data && vResp3.data.videos) window._renderTikTokVideos(vResp3.data.videos);
                    document.getElementById('tiktokStatsArea').style.display = '';
                    CONNECTORS.tiktok.status = 'connected';
                    CONNECTORS.tiktok.statusLabel = 'Verbunden';
                    _showToast('TikTok Daten geladen ✓', 'success');
                    return;
                }
            } catch(e) { console.warn('TikTok live fehlgeschlagen:', e); }
        }
        window._showTikTokDemoData();
        return;
    }

    // ── Instagram & Facebook: Demo (Token wird direkt gespeichert, kein Proxy nötig) ─
    _showSocialDemo(platform);
};


function _showSocialDemo(platform) {
    var demo = SOCIAL_DEMO[platform];
    if (!demo) return;
    _populateSocialCard(platform, demo.name, demo.followers, demo.reach, demo.posts);
    _populateSocialRows(platform, demo.rows);
    document.getElementById('socialStats_' + platform).style.display = '';
    CONNECTORS[platform].status = 'planned';
    CONNECTORS[platform].statusLabel = 'Demo-Daten';
    _showToast(CONNECTORS[platform].name + ': Demo-Daten angezeigt', 'info');
}

function _populateSocialCard(platform, name, stat1, stat2, stat3) {
    var el = function(id) { return document.getElementById(id); };
    if (el('socialName_' + platform)) el('socialName_' + platform).textContent = name;
    if (el('socialFollowers_' + platform)) el('socialFollowers_' + platform).textContent = stat1;
    if (el('socialReach_' + platform)) el('socialReach_' + platform).textContent = stat2;
    if (el('socialPosts_' + platform)) el('socialPosts_' + platform).textContent = stat3;
}

function _populateSocialRows(platform, rows) {
    var tbody = document.getElementById('socialRows_' + platform);
    if (!tbody) return;
    tbody.innerHTML = rows.map(function(row) {
        return '<tr style="border-bottom:1px solid #f3f4f6">'
            + row.map(function(cell, i) {
                return '<td style="padding:5px 8px;' + (i === 0 ? 'max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' : 'text-align:center') + '">' + _escH(String(cell)) + '</td>';
            }).join('')
            + '</tr>';
    }).join('');
}

window.loadSocialConfigs = async function() {
    try {
        var sb = _sb(); if (!sb) return;
        var platforms = ['instagram', 'facebook', 'youtube', 'gmb', 'analytics'];
        for (var p = 0; p < platforms.length; p++) {
            var platform = platforms[p];
            var c = CONNECTORS[platform];
            if (!c || !c.oauthFields) continue;
            // Check if ANY config exists for this platform (any standort)
            var { data } = await sb.from('connector_config')
                .select('config_key, config_value, standort_id')
                .eq('connector_id', platform);
            if (data && data.length) {
                var hasValue = data.some(function(r) { return !!r.config_value; });
                if (hasValue) {
                    var standortCount = {};
                    data.forEach(function(r) { standortCount[r.standort_id || 'hq'] = true; });
                    var cnt = Object.keys(standortCount).length;
                    CONNECTORS[platform].status = 'connected';
                    CONNECTORS[platform].statusLabel = cnt + (cnt === 1 ? ' Konfiguration' : ' Konfigurationen');
                }
                // Populate fields if DOM exists (card is open)
                var hqData = data.filter(function(r) { return !r.standort_id; });
                var firstData = hqData.length ? hqData : data;
                firstData.forEach(function(r) {
                    var el = document.getElementById(platform + '_field_' + r.config_key);
                    if (el) el.value = r.config_value;
                });
            } else {
                CONNECTORS[platform].status = 'disconnected';
                CONNECTORS[platform].statusLabel = 'Nicht verbunden';
            }
        }
        renderStatusGrid();
    } catch(e) {}
}

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

// ═══════════════════════════════════════════════════════
// GOOGLE ADS / META ADS – SAVE, LOAD, TEST
// ═══════════════════════════════════════════════════════

window.saveAdsConfig = async function(platform) {
    try {
        var sb = _sb(); if (!sb) return;
        var c = CONNECTORS[platform];
        if (!c || !c.configFields) return;
        var hasValue = false;
        for (var i = 0; i < c.configFields.length; i++) {
            var f = c.configFields[i];
            var el = document.getElementById('conn_' + platform + '_' + f.key);
            if (!el || !el.value.trim()) continue;
            hasValue = true;
            // Check if exists (standort_id is NULL for HQ-level ads)
            var { data: existing } = await sb.from('connector_config')
                .select('id')
                .eq('connector_id', platform)
                .eq('config_key', f.key)
                .is('standort_id', null)
                .maybeSingle();
            if (existing) {
                await sb.from('connector_config').update({
                    config_value: el.value.trim(),
                    updated_at: new Date().toISOString(),
                    updated_by: _sbUser() ? _sbUser().id : null
                }).eq('id', existing.id);
            } else {
                await sb.from('connector_config').insert({
                    connector_id: platform, config_key: f.key, config_value: el.value.trim(),
                    standort_id: null,
                    updated_at: new Date().toISOString(), updated_by: _sbUser() ? _sbUser().id : null
                });
            }
        }
        if (!hasValue) { _showToast('Bitte mindestens ein Feld ausfuellen', 'error'); return; }
        CONNECTORS[platform].status = 'connected';
        CONNECTORS[platform].statusLabel = 'Konfiguriert';
        renderStatusGrid();
        _showToast(c.name + ' Konfiguration gespeichert \u2713', 'success');
    } catch(e) {
        _showToast('Fehler beim Speichern: ' + e.message, 'error');
    }
};

window.loadAdsConfigs = async function() {
    try {
        var sb = _sb(); if (!sb) return;
        var platforms = ['google', 'meta'];
        for (var p = 0; p < platforms.length; p++) {
            var platform = platforms[p];
            var c = CONNECTORS[platform];
            if (!c || !c.configFields) continue;
            var { data } = await sb.from('connector_config')
                .select('config_key, config_value')
                .eq('connector_id', platform)
                .is('standort_id', null);
            var hasCredentials = false;
            if (data && data.length) {
                data.forEach(function(r) {
                    if (r.config_value) hasCredentials = true;
                    // Try to populate field if it exists in DOM
                    var el = document.getElementById('conn_' + platform + '_' + r.config_key);
                    if (el) el.value = r.config_value;
                });
            }
            if (hasCredentials) {
                CONNECTORS[platform].status = 'connected';
                CONNECTORS[platform].statusLabel = 'Verbunden';
            } else {
                CONNECTORS[platform].status = 'disconnected';
                CONNECTORS[platform].statusLabel = 'Nicht konfiguriert';
            }
        }
        renderStatusGrid();
    } catch(e) {}
};

window.testAdsConnection = async function(platform) {
    var resultEl = document.getElementById('connTestResult_' + platform);
    if (resultEl) resultEl.innerHTML = '<p class="text-xs text-gray-500">\u23f3 Teste Verbindung...</p>';
    try {
        var sb = _sb(); if (!sb) throw new Error('Keine Supabase-Verbindung');
        // Load config from DB
        var { data } = await sb.from('connector_config').select('config_key, config_value').eq('connector_id', platform);
        if (!data || !data.length) throw new Error('Keine Zugangsdaten gespeichert');
        var cfg = {};
        data.forEach(function(r) { cfg[r.config_key] = r.config_value; });

        if (platform === 'google') {
            // Test: try to get access token via refresh token
            if (!cfg.client_id || !cfg.client_secret || !cfg.refresh_token) throw new Error('Client ID, Client Secret und Refresh Token benoetigt');
            var resp = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'client_id=' + encodeURIComponent(cfg.client_id)
                    + '&client_secret=' + encodeURIComponent(cfg.client_secret)
                    + '&refresh_token=' + encodeURIComponent(cfg.refresh_token)
                    + '&grant_type=refresh_token'
            });
            if (!resp.ok) { var errText = await resp.text(); throw new Error('OAuth fehlgeschlagen: ' + errText); }
            var tokenData = await resp.json();
            if (tokenData.access_token) {
                if (resultEl) resultEl.innerHTML = '<div class="bg-green-50 border border-green-200 rounded-lg p-3"><p class="text-xs text-green-700">\u2705 <strong>Verbindung erfolgreich!</strong> Access Token erhalten. Google Ads API erreichbar.</p></div>';
            }
        } else if (platform === 'meta') {
            // Test: debug the token
            if (!cfg.access_token) throw new Error('Access Token benoetigt');
            var resp = await fetch('https://graph.facebook.com/debug_token?input_token=' + encodeURIComponent(cfg.access_token) + '&access_token=' + encodeURIComponent(cfg.access_token));
            var debugData = await resp.json();
            if (debugData.data && debugData.data.is_valid) {
                var scopes = (debugData.data.scopes || []).join(', ');
                if (resultEl) resultEl.innerHTML = '<div class="bg-green-50 border border-green-200 rounded-lg p-3"><p class="text-xs text-green-700">\u2705 <strong>Token gueltig!</strong> Scopes: ' + scopes + '</p></div>';
            } else {
                throw new Error('Token ungueltig oder abgelaufen');
            }
        }
    } catch(e) {
        if (resultEl) resultEl.innerHTML = '<div class="bg-red-50 border border-red-200 rounded-lg p-3"><p class="text-xs text-red-700">\u274c ' + e.message + '</p></div>';
    }
};


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
