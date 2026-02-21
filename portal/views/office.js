/**
 * views/office.js - vit:space Office v2
 * Check-in, Desk Booking, Wochenplanung, Parkplätze, Gäste, Gamification, Analytics
 * @module views/office
 */

// ─── Portal Helpers ────────────────────────────────────────
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _showView(v)    { if (window.showView) window.showView(v); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// ─── Module State ──────────────────────────────────────────
var INIT = false;
var TAB = 'home';      // home | plan | woche | gaeste | engagement | analytics | admin
var D = [];            // Desks
var CI = [];           // Current check-ins (v_office_status)
var CH = [];           // Charging stations
var BK = [];           // Bookings
var HQ_USERS = [];     // All HQ users
var ROOMS = [];        // Rooms with floor plans
var GUESTS = [];       // Today's guests
var ENGAGEMENT = [];   // Leaderboard
var MY_ENGAGE = null;  // My engagement data
var WEEKLY = null;     // My weekly plan (this week)
var HOME_OFFSET = 0;
var WEEK_OFFSET = 0;
var LADEN_DAY = new Date();
var LADEN_MONTH = new Date();
var PLAN_ROOM = null;  // Selected room for floor plan
var ADMIN_TAB = 'desks'; // Admin sub-tab

// ─── Role Detection ────────────────────────────────────────
function isHQ() {
    var p = _sbProfile();
    return p && p.is_hq;
}
function isAdmin() {
    var p = _sbProfile();
    return p && p.is_hq && (p.position === 'Admin' || p.position === 'HQ Admin' || p.role === 'admin');
}
function isGF() {
    var p = _sbProfile();
    return p && p.is_hq && (p.position === 'GF' || p.position === 'Geschäftsführer' || p.position === 'Geschäftsführung');
}
export function me() { return _sbUser() ? _sbUser().id : null; }

// ─── Init & Load ───────────────────────────────────────────
export async function init() {
    if (!_sb() || !_sbUser()) return;
    if (INIT) { render(); return; }
    INIT = true;
    await load();
    render();
    setupRT();
    updateBadge();
}

export async function load() {
    try {
        var today = todayStr();
        var weekStart = getMonday(new Date());
        var r = await Promise.all([
            _sb().from('office_desks').select('*').eq('active', true).order('nr'),
            _sb().from('v_office_status').select('*'),
            _sb().from('office_charging').select('*'),
            _sb().from('v_office_bookings').select('*').gte('booking_date', new Date(Date.now()-7*86400000).toISOString().split('T')[0]).order('booking_date'),
            _sb().from('users').select('id,name,vorname,nachname,avatar_url,position,is_hq').eq('is_hq', true),
            _sb().from('office_rooms').select('*').eq('active', true).order('sortierung'),
            _sb().from('v_office_guests_today').select('*'),
            _sb().from('v_office_leaderboard').select('*'),
            _sb().from('office_engagement').select('*').eq('user_id', me()).eq('month', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
            _sb().from('office_weekly_plans').select('*').eq('user_id', me()).eq('week_start', weekStart)
        ]);
        D = r[0].data || [];
        CI = r[1].data || [];
        CH = r[2].data || [];
        BK = r[3].data || [];
        HQ_USERS = r[4].data || [];
        ROOMS = r[5].data || [];
        GUESTS = r[6].data || [];
        ENGAGEMENT = r[7].data || [];
        MY_ENGAGE = (r[8].data && r[8].data[0]) || null;
        WEEKLY = (r[9].data && r[9].data[0]) || null;
        // Set default room for floor plan
        if (!PLAN_ROOM && ROOMS.length > 0) PLAN_ROOM = ROOMS[0].id;
    } catch (e) {
        console.error('[Office] Load error:', e);
    }
}

// ─── Date Helpers ──────────────────────────────────────────
export function todayStr() { return new Date().toISOString().split('T')[0]; }
export function isToday(ds) { return ds === todayStr(); }
export function getMonday(d) {
    var dd = new Date(d); dd.setHours(0,0,0,0);
    var dow = dd.getDay(); dd.setDate(dd.getDate() - (dow === 0 ? 6 : dow - 1));
    return dd.toISOString().split('T')[0];
}
export function workdays(offset, count) {
    var r = [], d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + offset * 7);
    var dow = d.getDay(); d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    for (var i = 0; i < 7 && r.length < count; i++) {
        var nd = new Date(d); nd.setDate(d.getDate() + i);
        if (nd.getDay() !== 0 && nd.getDay() !== 6) r.push(nd);
    }
    return r;
}
export function fmtD(ds) { var d = new Date(ds+'T00:00:00'); return ['So','Mo','Di','Mi','Do','Fr','Sa'][d.getDay()] + ', ' + d.getDate() + '.' + (d.getMonth()+1) + '.'; }
export function fmtDL(ds) { var d = new Date(ds+'T00:00:00'); var days = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']; return days[d.getDay()] + ', ' + d.getDate() + '.' + (d.getMonth()+1) + '.' + d.getFullYear(); }
export function dayKey(d) { return ['so','mo','di','mi','do','fr','sa'][d.getDay()]; }

// ─── Data Helpers ──────────────────────────────────────────
export function myCI() { var u = me(); for (var i = 0; i < CI.length; i++) if (CI[i].user_id === u) return CI[i]; return null; }
export function deskCI(nr) { for (var i = 0; i < CI.length; i++) if (CI[i].desk_nr === nr) return CI[i]; return null; }
export function myBK(ds) { var u = me(); for (var i = 0; i < BK.length; i++) if (BK[i].user_id === u && BK[i].booking_date === ds) return BK[i]; return null; }
export function deskBK(nr, ds) { for (var i = 0; i < BK.length; i++) if (BK[i].desk_nr === nr && BK[i].booking_date === ds) return BK[i]; return null; }
export function dayBK(ds) { return BK.filter(function(b) { return b.booking_date === ds; }); }
export function userName() { if (_sbProfile()) return _sbProfile().vorname || _sbProfile().name || ''; return ''; }

// ─── Avatar & Initials ────────────────────────────────────
export function av(u, s) {
    s = s || 32;
    if (u.avatar_url) return u.avatar_url;
    var n = u.name || ((u.vorname || '') + ' ' + (u.nachname || '')).trim() || '?';
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(n) + '&background=EF7D00&color=fff&size=' + (s * 2);
}
export function ini(u) { return ((u.vorname || u.name || '').charAt(0) + (u.nachname || '').charAt(0)).toUpperCase(); }

// ─── Desk Type Config ──────────────────────────────────────
var DESK_TYPES = {
    standard:  { label: 'Standard',    icon: '💻', color: '#6b7280' },
    stehplatz: { label: 'Stehplatz',   icon: '🧍', color: '#8b5cf6' },
    monitor:   { label: 'Monitor',     icon: '🖥️', color: '#3b82f6' },
    focus:     { label: 'Focus',       icon: '🎯', color: '#ef4444' },
    parkplatz: { label: 'Parkplatz',   icon: '🅿️', color: '#6b7280' },
    'e-lade':  { label: 'E-Lade',      icon: '⚡', color: '#22c55e' }
};

// ─── Status Colors ─────────────────────────────────────────
var STATUS = {
    office: { label: 'Im Büro', icon: '🏢', bg: '#FFF4E6', fg: '#EF7D00', dot: '#22c55e' },
    remote: { label: 'Remote',  icon: '🏠', bg: '#eff6ff', fg: '#3b82f6', dot: '#3b82f6' },
    absent: { label: 'Abwesend',icon: '🏖️', bg: '#f5f5f5', fg: '#9ca3af', dot: '#9ca3af' }
};

// ─── Badge Config ──────────────────────────────────────────
var BADGES = {
    fruehaufsteher: { label: 'Frühaufsteher', icon: '🌅', desc: 'Vor 8:00 eingecheckt', threshold: '10x vor 08:00' },
    streak_master:  { label: 'Streak-Master',  icon: '🔥', desc: '5 Tage am Stück', threshold: '5-Tage-Streak' },
    team_magnet:    { label: 'Team-Magnet',    icon: '🧲', desc: 'Tag mit 8+ Kollegen', threshold: '5x 8+ im Büro' },
    gastgeber:      { label: 'Gastgeber',      icon: '🤝', desc: '3 Gäste eingeladen', threshold: '3 Gäste gehostet' },
    entdecker:      { label: 'Entdecker',      icon: '🗺️', desc: '10 verschiedene Plätze', threshold: '10 unique Desks' },
    '100h_club':    { label: '100-Stunden-Club',icon: '💯', desc: '100h im Monat', threshold: '100h Office/Monat' }
};

// ═══════════════════════════════════════════════════════════
// RENDER — Main dispatch
// ═══════════════════════════════════════════════════════════
export function render() {
    var c = document.getElementById('officeContent');
    if (!c) return;

    // Build complete view: Hero + Tabs + Content
    var html = '';
    html += renderHeroHTML();
    html += renderTabsHTML();
    html += '<div id="officeTabContent" class="mt-4">';
    html += renderTabContentHTML();
    html += '</div>';

    c.innerHTML = html;

    // Post-render: floor plan dots
    if (TAB === 'home' || TAB === 'plan') {
        setTimeout(officeRenderDots, 100);
    }
    updateBadge();
}

// ═══════════════════════════════════════════════════════════
// HERO — Check-in CTA + Status Summary
// ═══════════════════════════════════════════════════════════
function renderHeroHTML() {
    var ci = myCI();
    var offU = CI.filter(function(c) { return c.status === 'office'; }).length;
    var remU = CI.filter(function(c) { return c.status === 'remote'; }).length;
    var totalDesks = D.filter(function(d) { return d.desk_type !== 'parkplatz' && d.desk_type !== 'e-lade'; }).length;
    var free = Math.max(0, totalDesks - offU);

    var h = '<div class="vit-card p-5 mb-4">';
    h += '<div class="flex items-center justify-between flex-wrap gap-4">';

    // Left: Greeting + Status
    h += '<div>';
    h += '<h1 class="text-xl font-bold" style="color:var(--c-text)">Hallo ' + _escH(userName()) + ' 👋</h1>';
    if (ci) {
        var s = STATUS[ci.status] || STATUS.office;
        h += '<p class="text-sm mt-1" style="color:var(--c-sub)">' + s.icon + ' ' + s.label;
        if (ci.desk_nr) h += ' · Platz #' + ci.desk_nr;
        h += ' · seit ' + (ci.since || '') + '</p>';
    } else {
        h += '<p class="text-sm mt-1" style="color:var(--c-sub)">Wo arbeitest du heute?</p>';
    }
    h += '</div>';

    // Right: Status badges + CTA
    h += '<div class="flex items-center gap-3">';

    // Mini stats
    h += '<div class="hidden sm:flex gap-2 text-xs">';
    h += '<span class="px-2.5 py-1 rounded-full font-bold" style="background:#f0fdf4;color:#22c55e">' + offU + ' Büro</span>';
    h += '<span class="px-2.5 py-1 rounded-full font-bold" style="background:#eff6ff;color:#3b82f6">' + remU + ' Remote</span>';
    h += '<span class="px-2.5 py-1 rounded-full font-bold" style="background:#fafafa;color:#999">' + free + ' Frei</span>';
    h += '</div>';

    // CTA Button
    if (ci) {
        h += '<button onclick="officeDoCheckout()" class="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90" style="background:linear-gradient(135deg,#ef4444,#dc2626)">';
        h += '🚪 Auschecken</button>';
    } else {
        h += '<div class="flex gap-2">';
        h += '<button onclick="officeQuickCheckin(\'office\')" class="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90" style="background:linear-gradient(135deg,#EF7D00,#e06500)">';
        h += '🏢 Im Büro</button>';
        h += '<button onclick="officeQuickCheckin(\'remote\')" class="px-4 py-2.5 rounded-xl text-sm font-bold transition hover:opacity-90" style="background:#eff6ff;color:#3b82f6;border:1px solid #bfdbfe">';
        h += '🏠 Remote</button>';
        h += '</div>';
    }

    h += '</div></div>';

    // Guest info bar (if guests today)
    if (GUESTS.length > 0) {
        h += '<div class="mt-3 pt-3" style="border-top:1px solid var(--c-border)">';
        h += '<div class="flex items-center gap-2 text-xs" style="color:var(--c-muted)">';
        h += '<span class="px-2 py-0.5 rounded-full font-bold" style="background:#fef3c7;color:#d97706">' + GUESTS.length + ' Gäste heute</span>';
        GUESTS.slice(0, 3).forEach(function(g) {
            h += '<span>' + _escH(g.guest_name) + (g.company ? ' (' + _escH(g.company) + ')' : '') + '</span>';
        });
        if (GUESTS.length > 3) h += '<span>+' + (GUESTS.length - 3) + ' weitere</span>';
        h += '</div></div>';
    }

    h += '</div>';
    return h;
}

// ═══════════════════════════════════════════════════════════
// TABS — Role-based navigation
// ═══════════════════════════════════════════════════════════
function renderTabsHTML() {
    var tabs = [];

    if (isGF()) {
        // GF: Executive view only — NO gamification
        tabs = [
            { id: 'home', label: 'Übersicht', icon: '📊' },
            { id: 'woche', label: 'Team', icon: '👥' },
            { id: 'analytics', label: 'Analytics', icon: '📈' }
        ];
    } else if (isAdmin()) {
        // Admin: Full access
        tabs = [
            { id: 'home', label: 'Home', icon: '🏠' },
            { id: 'plan', label: 'Grundriss', icon: '🗺️' },
            { id: 'woche', label: 'Woche', icon: '📅' },
            { id: 'gaeste', label: 'Gäste', icon: '🤝' },
            { id: 'engagement', label: 'Engagement', icon: '🏆' },
            { id: 'analytics', label: 'Analytics', icon: '📈' },
            { id: 'admin', label: 'Admin', icon: '⚙️' }
        ];
    } else {
        // User: Max 4 items
        tabs = [
            { id: 'home', label: 'Home', icon: '🏠' },
            { id: 'woche', label: 'Woche', icon: '📅' },
            { id: 'gaeste', label: 'Gäste', icon: '🤝' },
            { id: 'engagement', label: 'Engagement', icon: '🏆' }
        ];
    }

    var h = '<div class="flex gap-1 overflow-x-auto pb-1" style="scrollbar-width:none">';
    tabs.forEach(function(t) {
        var active = t.id === TAB;
        h += '<button onclick="officeSetTab(\'' + t.id + '\')" class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition" style="';
        if (active) {
            h += 'background:#EF7D00;color:#fff';
        } else {
            h += 'background:var(--c-bg);color:var(--c-muted);border:1px solid var(--c-border)';
        }
        h += '">' + t.icon + ' ' + t.label + '</button>';
    });
    h += '</div>';
    return h;
}

function renderTabContentHTML() {
    switch (TAB) {
        case 'home': return renderHomeHTML();
        case 'plan': return renderPlanHTML();
        case 'woche': return renderWocheHTML();
        case 'gaeste': return renderGaesteHTML();
        case 'engagement': return renderEngagementHTML();
        case 'analytics': return renderAnalyticsHTML();
        case 'admin': return renderAdminHTML();
        default: return renderHomeHTML();
    }
}

// ═══════════════════════════════════════════════════════════
// TAB: HOME — Quick Overview + Floor Plan + Who's In
// ═══════════════════════════════════════════════════════════
function renderHomeHTML() {
    var h = '';

    // ── Floor Plan (full width) ──
    h += renderFloorPlanHTML();

    // ── Who's in today ──
    var offU = CI.filter(function(c) { return c.status === 'office'; });
    var remU = CI.filter(function(c) { return c.status === 'remote'; });

    if (offU.length > 0 || remU.length > 0) {
        h += '<div class="vit-card p-4 mt-4">';
        h += '<div class="flex items-center justify-between mb-3">';
        h += '<span class="text-sm font-bold" style="color:var(--c-text)">Heute im Büro</span>';
        h += '<span class="text-xs" style="color:var(--c-muted)">' + fmtDL(todayStr()) + '</span>';
        h += '</div>';

        // Office users
        if (offU.length > 0) {
            h += '<div class="flex flex-wrap gap-2 mb-3">';
            offU.forEach(function(c) {
                var isMe = c.user_id === me();
                h += '<div class="flex items-center gap-2 px-3 py-2 rounded-xl" style="background:' + (isMe ? '#FFF4E6' : 'var(--c-bg3)') + '">';
                h += '<div style="position:relative"><img src="' + av(c, 28) + '" width="28" height="28" style="border-radius:50%;object-fit:cover">';
                h += '<span style="position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;background:#22c55e;border:2px solid ' + (isMe ? '#FFF4E6' : 'var(--c-bg3)') + '"></span></div>';
                h += '<div><div class="text-xs font-semibold" style="color:var(--c-text)">' + _escH(c.vorname || c.name || '') + (isMe ? ' (Du)' : '') + '</div>';
                h += '<div class="text-[10px]" style="color:var(--c-muted)">#' + c.desk_nr + ' · seit ' + (c.since || '') + '</div></div>';
                h += '</div>';
            });
            h += '</div>';
        }

        // Remote users
        if (remU.length > 0) {
            h += '<div class="text-[10px] font-bold mb-2 mt-2" style="color:var(--c-muted)">🏠 Remote (' + remU.length + ')</div>';
            h += '<div class="flex flex-wrap gap-1.5">';
            remU.forEach(function(c) {
                h += '<div class="flex items-center gap-1.5 px-2 py-1 rounded-lg" style="background:#eff6ff">';
                h += '<div style="position:relative"><img src="' + av(c, 20) + '" width="20" height="20" style="border-radius:50%">';
                h += '<span style="position:absolute;bottom:-1px;right:-1px;width:8px;height:8px;border-radius:50%;background:#3b82f6;border:2px solid #eff6ff"></span></div>';
                h += '<span class="text-[11px] font-semibold" style="color:#3b82f6">' + _escH(c.vorname || c.name || '') + '</span></div>';
            });
            h += '</div>';
        }
        h += '</div>';
    }

    // ── Parking Status ──
    var parkDesks = D.filter(function(d) { return d.desk_type === 'parkplatz' || d.desk_type === 'e-lade'; });
    if (parkDesks.length > 0) {
        h += '<div class="vit-card p-4 mt-4">';
        h += '<div class="text-sm font-bold mb-3" style="color:var(--c-text)">🅿️ Parkplätze</div>';
        h += '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">';
        parkDesks.forEach(function(p) {
            var booked = deskCI(p.nr);
            var isELade = p.desk_type === 'e-lade';
            var kw = (p.metadata && p.metadata.charging) || '';
            h += '<div class="rounded-xl p-3 text-center" style="background:' + (booked ? '#fef2f2' : '#f0fdf4') + ';border:1px solid ' + (booked ? '#fecaca' : '#bbf7d0') + '">';
            h += '<div class="text-lg font-bold">' + (isELade ? '⚡' : '🅿️') + '</div>';
            h += '<div class="text-xs font-bold mt-1" style="color:var(--c-text)">' + _escH(p.label || 'P' + p.nr) + '</div>';
            if (isELade && kw) h += '<div class="text-[9px]" style="color:#22c55e">' + kw + '</div>';
            h += '<div class="text-[10px] mt-1 font-semibold" style="color:' + (booked ? '#ef4444' : '#22c55e') + '">' + (booked ? '● Belegt' : '✓ Frei') + '</div>';
            if (!booked) {
                h += '<button onclick="officeCheckinDesk(' + p.nr + ')" class="mt-1 text-[10px] font-bold px-2 py-0.5 rounded" style="background:#EF7D00;color:#fff">Buchen</button>';
            }
            h += '</div>';
        });
        h += '</div></div>';
    }

    return h;
}

// ═══════════════════════════════════════════════════════════
// FLOOR PLAN — Full width with room selector
// ═══════════════════════════════════════════════════════════
function renderFloorPlanHTML() {
    var h = '<div class="vit-card p-3">';

    // Room selector (if multiple rooms)
    if (ROOMS.length > 1) {
        h += '<div class="flex gap-2 mb-3 overflow-x-auto" style="scrollbar-width:none">';
        ROOMS.forEach(function(r) {
            var active = r.id === PLAN_ROOM;
            h += '<button onclick="officeSelectRoom(\'' + r.id + '\')" class="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition" style="';
            if (active) h += 'background:#EF7D00;color:#fff';
            else h += 'background:var(--c-bg3);color:var(--c-muted)';
            h += '">' + _escH(r.name) + '</button>';
        });
        h += '</div>';
    }

    // Legend
    h += '<div class="flex items-center justify-between mb-2">';
    h += '<span class="text-xs font-bold" style="color:var(--c-muted)">';
    var room = ROOMS.find(function(r) { return r.id === PLAN_ROOM; });
    h += room ? _escH(room.floor_label || room.name) : 'Grundriss';
    h += '</span>';
    h += '<div class="flex gap-3 text-[10px]" style="color:var(--c-dim)">';
    h += '<span>🟢 Frei</span><span>🟠 Belegt</span><span>🔵 Du</span>';
    h += '</div></div>';

    // Floor plan container
    var bgUrl = room && room.grundriss_url ? room.grundriss_url : 'grundriss_og.png';
    var opacity = room && room.image_opacity ? room.image_opacity : 0.3;
    h += '<div id="officePlanContainer" style="position:relative;width:100%;min-width:600px;overflow-x:auto">';
    h += '<img id="officePlanBg" src="' + bgUrl + '" style="width:100%;display:block;opacity:' + opacity + ';border-radius:8px" onload="officeRenderDots()">';
    h += '<div id="officePlanDots" style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none"></div>';
    h += '</div>';
    h += '</div>';
    return h;
}

// ═══════════════════════════════════════════════════════════
// FLOOR PLAN DOTS — Rendered as overlay
// ═══════════════════════════════════════════════════════════
window.officeRenderDots = function() {
    var container = document.getElementById('officePlanContainer');
    var dotsEl = document.getElementById('officePlanDots');
    if (!container || !dotsEl) return;

    var ci = myCI();
    var roomDesks = PLAN_ROOM ? D.filter(function(d) { return d.room_id === PLAN_ROOM; }) : D;
    var html = '';

    roomDesks.forEach(function(d) {
        if (!d.pct_x || !d.pct_y) return;
        if (d.desk_type === 'parkplatz' || d.desk_type === 'e-lade') return; // Park shown separately

        var c = deskCI(d.nr);
        var free = !c;
        var isMe = c && c.user_id === me();
        var dt = DESK_TYPES[d.desk_type] || DESK_TYPES.standard;
        var size = 30;

        var style = 'position:absolute;left:' + d.pct_x + '%;top:' + d.pct_y + '%;transform:translate(-50%,-50%);width:' + size + 'px;height:' + size + 'px;border-radius:50%;pointer-events:auto;cursor:' + (free && !ci ? 'pointer' : 'default') + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;transition:all 0.2s;';

        if (free) {
            style += 'background:rgba(34,197,94,0.15);border:2px solid #22c55e;color:#22c55e;';
            html += '<div style="' + style + '" ' + (ci ? '' : 'onclick="officeCheckinDesk(' + d.nr + ')"') + ' title="Platz #' + d.nr + ' · ' + _escH(d.room || '') + ' · ' + dt.label + ' · Frei">';
            html += dt.icon;
            html += '</div>';
        } else {
            var col = isMe ? '#3b82f6' : '#EF7D00';
            style += 'background:' + col + ';border:2px solid ' + col + ';';
            if (isMe) style += 'box-shadow:0 0 0 4px rgba(59,130,246,0.25);';
            html += '<div style="' + style + '" title="' + _escH(c.name || '') + ' · ' + _escH(d.room || '') + '">';
            html += '<img src="' + av(c, size - 4) + '" width="' + (size - 4) + '" height="' + (size - 4) + '" style="border-radius:50%;object-fit:cover">';
            html += '</div>';
            // Name label
            html += '<div style="position:absolute;left:' + d.pct_x + '%;top:calc(' + d.pct_y + '% + ' + (size/2 + 3) + 'px);transform:translateX(-50%);font-size:8px;font-weight:700;color:' + (isMe ? '#3b82f6' : '#666') + ';white-space:nowrap;pointer-events:none">' + ini(c) + '</div>';
        }
    });

    dotsEl.innerHTML = html;
};

// ═══════════════════════════════════════════════════════════
// TAB: PLAN — Dedicated Floor Plan View (full page)
// ═══════════════════════════════════════════════════════════
function renderPlanHTML() {
    return renderFloorPlanHTML();
}

// ═══════════════════════════════════════════════════════════
// TAB: WOCHE — Weekly Planning with Team Overview
// ═══════════════════════════════════════════════════════════
function renderWocheHTML() {
    var days = workdays(WEEK_OFFSET, 5);
    var weekStart = days[0], weekEnd = days[days.length - 1];

    var h = '';

    // Week navigation
    h += '<div class="flex items-center gap-3 mb-4">';
    h += '<span class="text-sm font-bold" style="color:var(--c-text)">Wochenübersicht</span>';
    h += '<button onclick="officeWeekNav(-1)" class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:var(--c-bg3);color:var(--c-muted)">‹</button>';
    h += '<span class="text-xs font-semibold" style="color:var(--c-muted)">' + weekStart.getDate() + '.' + (weekStart.getMonth()+1) + '. – ' + weekEnd.getDate() + '.' + (weekEnd.getMonth()+1) + '.' + weekEnd.getFullYear() + '</span>';
    h += '<button onclick="officeWeekNav(1)" class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:var(--c-bg3);color:var(--c-muted)">›</button>';
    if (WEEK_OFFSET !== 0) h += '<button onclick="officeWeekNav(0)" class="text-xs font-bold px-3 py-1 rounded-lg text-vit-orange" style="border:1px solid #EF7D00">Heute</button>';
    h += '</div>';

    // My quick plan row
    h += '<div class="vit-card p-4 mb-4">';
    h += '<div class="text-xs font-bold mb-3" style="color:var(--c-muted)">📅 Meine Woche</div>';
    h += '<div class="grid gap-2" style="grid-template-columns:repeat(5,1fr)">';
    days.forEach(function(day) {
        var ds = day.toISOString().split('T')[0];
        var today = isToday(ds);
        var past = new Date(ds + 'T23:59:59') < new Date();
        var ci = today ? myCI() : null;
        var bk = myBK(ds);

        h += '<div class="rounded-xl p-3 text-center" style="background:var(--c-bg);border:' + (today ? '2px solid #EF7D00' : '1px solid var(--c-border)') + (past && !today ? ';opacity:0.5' : '') + '">';
        if (today) h += '<div class="w-6 h-1 rounded-full bg-vit-orange mx-auto mb-1"></div>';
        h += '<div class="text-[10px] font-bold mb-2" style="color:' + (today ? '#EF7D00' : 'var(--c-muted)') + '">' + (today ? 'Heute' : fmtD(ds)) + '</div>';

        if (ci) {
            var s = STATUS[ci.status] || STATUS.office;
            h += '<div class="rounded-lg py-1.5 text-[11px] font-bold" style="background:' + s.bg + ';color:' + s.fg + '">' + s.icon + (ci.desk_nr ? ' #' + ci.desk_nr : '') + '</div>';
            h += '<div class="text-[8px] mt-0.5" style="color:#22c55e">● Live</div>';
        } else if (bk) {
            var s = STATUS[bk.status] || STATUS.office;
            h += '<div class="rounded-lg py-1.5 text-[11px] font-bold" style="background:' + s.bg + ';color:' + s.fg + '">' + s.icon + (bk.desk_nr ? ' #' + bk.desk_nr : '') + '</div>';
            if (!past) h += '<div class="text-[8px] mt-0.5 cursor-pointer" style="color:var(--c-muted)" onclick="officeDeleteBooking(\'' + bk.id + '\')">✕ stornieren</div>';
        } else if (!past) {
            h += '<div class="rounded-lg py-1.5 text-[11px] cursor-pointer hover:shadow transition" style="background:var(--c-bg3);color:var(--c-sub);border:1px dashed var(--c-border)" onclick="officeShowBookingModal(\'' + ds + '\')">Planen</div>';
        } else {
            h += '<div class="rounded-lg py-1.5 text-[11px]" style="color:var(--c-dim)">–</div>';
        }

        // Colleague count
        var dayC = dayBK(ds).filter(function(b) { return b.user_id !== me() && b.status === 'office'; }).length;
        if (dayC > 0) h += '<div class="text-[9px] mt-1" style="color:var(--c-muted)">' + dayC + ' 👥</div>';

        h += '</div>';
    });
    h += '</div></div>';

    // Team overview table
    var users = HQ_USERS.slice().sort(function(a, b) {
        if (a.id === me()) return -1;
        if (b.id === me()) return 1;
        return (a.name || '').localeCompare(b.name || '');
    });

    h += '<div class="vit-card p-0 overflow-x-auto">';
    h += '<table style="width:100%;border-collapse:collapse;min-width:700px">';
    h += '<thead><tr><th class="text-left p-3 text-xs font-bold" style="color:var(--c-muted);width:200px;border-bottom:2px solid var(--c-border)">Team</th>';
    days.forEach(function(day) {
        var ds = day.toISOString().split('T')[0];
        var today = isToday(ds);
        h += '<th class="p-3 text-center text-xs font-bold" style="color:' + (today ? '#EF7D00' : 'var(--c-muted)') + ';border-bottom:2px solid ' + (today ? '#EF7D00' : 'var(--c-border)') + '">';
        h += (today ? 'Heute' : ['So','Mo','Di','Mi','Do','Fr','Sa'][day.getDay()]) + ', ' + day.getDate() + '.' + (day.getMonth()+1) + '.';
        h += '</th>';
    });
    h += '</tr></thead><tbody>';

    users.forEach(function(user) {
        var isMe = user.id === me();
        h += '<tr style="border-bottom:1px solid var(--c-border);' + (isMe ? 'background:#FFF9F0' : '') + '"><td class="p-3">';
        h += '<div class="flex items-center gap-2">';
        h += '<div style="position:relative"><img src="' + av(user, 28) + '" width="28" height="28" style="border-radius:50%;object-fit:cover">';
        // Status dot
        var liveCI = null;
        for (var j = 0; j < CI.length; j++) if (CI[j].user_id === user.id) { liveCI = CI[j]; break; }
        if (liveCI) {
            var dotColor = STATUS[liveCI.status] ? STATUS[liveCI.status].dot : '#9ca3af';
            h += '<span style="position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-radius:50%;background:' + dotColor + ';border:2px solid ' + (isMe ? '#FFF9F0' : 'var(--c-bg)') + '"></span>';
        }
        h += '</div>';
        h += '<div><div class="text-sm font-semibold" style="color:var(--c-text)">' + _escH(user.vorname || user.name || '') + (isMe ? ' (Du)' : '') + '</div>';
        h += '<div class="text-[10px]" style="color:var(--c-muted)">' + _escH(user.position || '') + '</div></div>';
        h += '</div></td>';

        days.forEach(function(day) {
            var ds = day.toISOString().split('T')[0];
            var today = isToday(ds);
            var bk = null;
            for (var i = 0; i < BK.length; i++) if (BK[i].user_id === user.id && BK[i].booking_date === ds) { bk = BK[i]; break; }
            var liveToday = null;
            if (today) { for (var j = 0; j < CI.length; j++) if (CI[j].user_id === user.id) { liveToday = CI[j]; break; } }

            h += '<td class="p-2 text-center" style="' + (today ? 'background:rgba(239,125,0,0.03)' : '') + '">';
            if (liveToday && today) {
                var s = STATUS[liveToday.status] || STATUS.office;
                h += '<div class="inline-block rounded-lg px-2 py-1 text-[11px] font-bold" style="background:' + s.bg + ';color:' + s.fg + '">' + s.icon + (liveToday.desk_nr ? ' #' + liveToday.desk_nr : '') + '</div>';
                h += '<div class="text-[8px] mt-0.5" style="color:#22c55e">● Live</div>';
            } else if (bk) {
                var s = STATUS[bk.status] || STATUS.office;
                h += '<div class="inline-block rounded-lg px-2 py-1 text-[11px] font-bold" style="background:' + s.bg + ';color:' + s.fg + '">' + s.icon + (bk.desk_nr ? ' #' + bk.desk_nr : '') + '</div>';
            } else if (isMe && !new Date(ds + 'T23:59:59') < new Date()) {
                h += '<div class="inline-block rounded-lg px-2 py-1 text-[11px] cursor-pointer hover:shadow transition" style="background:var(--c-bg3);color:var(--c-sub);border:1px dashed var(--c-border)" onclick="officeShowBookingModal(\'' + ds + '\')">?</div>';
            } else {
                h += '<span class="text-xs" style="color:var(--c-dim)">–</span>';
            }
            h += '</td>';
        });
        h += '</tr>';
    });

    // Summary row
    h += '<tr style="background:var(--c-bg3)"><td class="p-3 text-xs font-bold" style="color:var(--c-muted)">Gesamt</td>';
    days.forEach(function(day) {
        var ds = day.toISOString().split('T')[0];
        var oc = 0, rc = 0;
        BK.forEach(function(b) { if (b.booking_date === ds) { if (b.status === 'office') oc++; else rc++; } });
        h += '<td class="p-2 text-center"><span class="text-[10px] font-bold text-vit-orange">' + oc + ' 🏢</span> <span class="text-[10px] font-bold" style="color:#3b82f6">' + rc + ' 🏠</span></td>';
    });
    h += '</tr></tbody></table></div>';

    return h;
}

// ═══════════════════════════════════════════════════════════
// TAB: GÄSTE — Guest Management
// ═══════════════════════════════════════════════════════════
function renderGaesteHTML() {
    var h = '';

    // Add guest button
    h += '<div class="flex items-center justify-between mb-4">';
    h += '<span class="text-sm font-bold" style="color:var(--c-text)">🤝 Gäste verwalten</span>';
    h += '<button onclick="officeShowGuestModal()" class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-vit-orange hover:opacity-90 transition">+ Gast einladen</button>';
    h += '</div>';

    // Today's guests
    if (GUESTS.length > 0) {
        h += '<div class="vit-card p-4 mb-4">';
        h += '<div class="text-xs font-bold mb-3" style="color:var(--c-muted)">📅 Heute erwartet</div>';
        GUESTS.forEach(function(g) {
            h += '<div class="flex items-center justify-between py-3" style="border-bottom:1px solid var(--c-border)">';
            h += '<div class="flex items-center gap-3">';
            h += '<div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style="background:#fef3c7;color:#d97706">' + (g.guest_name || '?').charAt(0).toUpperCase() + '</div>';
            h += '<div>';
            h += '<div class="text-sm font-semibold" style="color:var(--c-text)">' + _escH(g.guest_name) + '</div>';
            if (g.company) h += '<div class="text-[10px]" style="color:var(--c-muted)">' + _escH(g.company) + '</div>';
            h += '<div class="text-[10px]" style="color:var(--c-muted)">Host: ' + _escH(g.host_vorname || g.host_name || '') + (g.visit_time ? ' · ' + g.visit_time : '') + (g.room ? ' · ' + _escH(g.room) : '') + '</div>';
            h += '</div></div>';

            // Status badge
            var statusCfg = {
                erwartet: { bg: '#fef3c7', fg: '#d97706', label: '⏳ Erwartet' },
                eingecheckt: { bg: '#f0fdf4', fg: '#22c55e', label: '✓ Da' },
                ausgecheckt: { bg: '#f5f5f5', fg: '#6b7280', label: '✓ Weg' },
                abgesagt: { bg: '#fef2f2', fg: '#ef4444', label: '✕ Abgesagt' }
            };
            var sc = statusCfg[g.status] || statusCfg.erwartet;
            h += '<div class="flex items-center gap-2">';
            if (g.needs_parking) h += '<span class="text-[10px] px-2 py-0.5 rounded-full font-bold" style="background:#eff6ff;color:#3b82f6">🅿️</span>';
            h += '<span class="text-[10px] px-2 py-0.5 rounded-full font-bold" style="background:' + sc.bg + ';color:' + sc.fg + '">' + sc.label + '</span>';
            if (g.status === 'erwartet' && g.host_user_id === me()) {
                h += '<button onclick="officeGuestCheckin(\'' + g.id + '\')" class="text-[10px] font-bold px-2 py-0.5 rounded bg-vit-orange text-white">Check-in</button>';
            }
            h += '</div></div>';
        });
        h += '</div>';
    } else {
        h += '<div class="vit-card p-8 text-center mb-4">';
        h += '<div class="text-3xl mb-2">🤝</div>';
        h += '<div class="text-sm" style="color:var(--c-muted)">Keine Gäste für heute</div>';
        h += '</div>';
    }

    return h;
}

// ═══════════════════════════════════════════════════════════
// TAB: ENGAGEMENT — Gamification (NOT visible to GF!)
// ═══════════════════════════════════════════════════════════
function renderEngagementHTML() {
    if (isGF()) return '<div class="vit-card p-8 text-center"><div class="text-sm" style="color:var(--c-muted)">Kein Zugriff</div></div>';

    var h = '';

    // ── Leaderboard ──
    h += '<div class="vit-card p-4 mb-4">';
    h += '<div class="text-sm font-bold mb-4" style="color:var(--c-text)">🏆 Leaderboard · ' + new Date().toLocaleString('de-DE', { month: 'long', year: 'numeric' }) + '</div>';

    if (ENGAGEMENT.length >= 3) {
        // Top 3 Podium
        h += '<div class="flex items-end justify-center gap-4 mb-4" style="height:160px">';
        var podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd
        var podiumHeight = [100, 140, 80];
        var podiumColor = ['#C0C0C0', '#FFD700', '#CD7F32'];
        var podiumLabel = ['🥈', '🥇', '🥉'];
        podiumOrder.forEach(function(idx, pos) {
            if (!ENGAGEMENT[idx]) return;
            var e = ENGAGEMENT[idx];
            h += '<div class="flex flex-col items-center" style="width:80px">';
            h += '<img src="' + av(e, 36) + '" width="36" height="36" style="border-radius:50%;object-fit:cover;border:3px solid ' + podiumColor[pos] + '">';
            h += '<div class="text-[10px] font-bold mt-1" style="color:var(--c-text)">' + _escH(e.vorname || e.name || '') + '</div>';
            h += '<div class="text-[9px]" style="color:var(--c-muted)">' + (e.office_days || 0) + ' Tage</div>';
            h += '<div class="w-full rounded-t-lg flex items-center justify-center text-lg" style="height:' + podiumHeight[pos] + 'px;background:' + podiumColor[pos] + '20;border:2px solid ' + podiumColor[pos] + '">' + podiumLabel[pos] + '</div>';
            h += '</div>';
        });
        h += '</div>';
    }

    // Full ranking
    if (ENGAGEMENT.length > 0) {
        ENGAGEMENT.forEach(function(e, idx) {
            var isMe = e.user_id === me();
            h += '<div class="flex items-center gap-3 py-2' + (idx > 0 ? '' : '') + '" style="border-bottom:1px solid var(--c-border);' + (isMe ? 'background:#FFF9F0;margin:0 -16px;padding-left:16px;padding-right:16px;border-radius:8px' : '') + '">';
            h += '<div class="text-sm font-bold w-6 text-center" style="color:' + (idx < 3 ? '#EF7D00' : 'var(--c-muted)') + '">' + (e.rank || idx + 1) + '</div>';
            h += '<img src="' + av(e, 28) + '" width="28" height="28" style="border-radius:50%;object-fit:cover">';
            h += '<div class="flex-1"><div class="text-xs font-semibold" style="color:var(--c-text)">' + _escH(e.vorname || e.name || '') + (isMe ? ' (Du)' : '') + '</div>';
            h += '<div class="text-[10px]" style="color:var(--c-muted)">' + (e.office_days || 0) + ' Tage · ' + Math.round(e.office_hours || 0) + 'h · 🔥' + (e.current_streak || 0) + '</div></div>';

            // Badges
            var badges = e.badges || [];
            if (badges.length > 0) {
                h += '<div class="flex gap-1">';
                badges.forEach(function(b) {
                    var badge = BADGES[b];
                    if (badge) h += '<span title="' + badge.label + '" class="text-sm">' + badge.icon + '</span>';
                });
                h += '</div>';
            }
            h += '</div>';
        });
    } else {
        h += '<div class="text-center py-4 text-sm" style="color:var(--c-muted)">Noch keine Daten für diesen Monat</div>';
    }
    h += '</div>';

    // ── My Stats ──
    h += '<div class="vit-card p-4">';
    h += '<div class="text-sm font-bold mb-3" style="color:var(--c-text)">📊 Meine Statistiken</div>';

    if (MY_ENGAGE) {
        h += '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">';
        h += '<div class="text-center p-3 rounded-xl" style="background:var(--c-bg3)"><div class="text-2xl font-bold" style="color:#EF7D00">' + (MY_ENGAGE.office_days || 0) + '</div><div class="text-[10px]" style="color:var(--c-muted)">Office Tage</div></div>';
        h += '<div class="text-center p-3 rounded-xl" style="background:var(--c-bg3)"><div class="text-2xl font-bold" style="color:#3b82f6">' + Math.round(MY_ENGAGE.office_hours || 0) + 'h</div><div class="text-[10px]" style="color:var(--c-muted)">Office Stunden</div></div>';
        h += '<div class="text-center p-3 rounded-xl" style="background:var(--c-bg3)"><div class="text-2xl font-bold" style="color:#ef4444">🔥 ' + (MY_ENGAGE.current_streak || 0) + '</div><div class="text-[10px]" style="color:var(--c-muted)">Aktueller Streak</div></div>';
        h += '<div class="text-center p-3 rounded-xl" style="background:var(--c-bg3)"><div class="text-2xl font-bold" style="color:#22c55e">' + (MY_ENGAGE.guests_hosted || 0) + '</div><div class="text-[10px]" style="color:var(--c-muted)">Gäste gehostet</div></div>';
        h += '</div>';

        // Badges
        h += '<div class="mt-4"><div class="text-xs font-bold mb-2" style="color:var(--c-muted)">🏅 Badges</div>';
        h += '<div class="grid grid-cols-3 sm:grid-cols-6 gap-2">';
        var myBadges = MY_ENGAGE.badges || [];
        Object.keys(BADGES).forEach(function(key) {
            var b = BADGES[key];
            var earned = myBadges.indexOf(key) !== -1;
            h += '<div class="text-center p-2 rounded-xl" style="background:' + (earned ? '#FFF4E6' : 'var(--c-bg3)') + ';opacity:' + (earned ? '1' : '0.4') + '">';
            h += '<div class="text-xl">' + b.icon + '</div>';
            h += '<div class="text-[9px] font-bold mt-1" style="color:' + (earned ? '#EF7D00' : 'var(--c-muted)') + '">' + b.label + '</div>';
            h += '<div class="text-[8px]" style="color:var(--c-dim)">' + b.threshold + '</div>';
            h += '</div>';
        });
        h += '</div></div>';
    } else {
        h += '<div class="text-center py-4 text-sm" style="color:var(--c-muted)">Checke dich ein, um Statistiken zu sammeln!</div>';
    }
    h += '</div>';

    return h;
}

// ═══════════════════════════════════════════════════════════
// TAB: ANALYTICS — KPIs, Charts, Executive Dashboard
// ═══════════════════════════════════════════════════════════
function renderAnalyticsHTML() {
    var totalDesks = D.filter(function(d) { return d.desk_type !== 'parkplatz' && d.desk_type !== 'e-lade'; }).length;
    var offU = CI.filter(function(c) { return c.status === 'office'; }).length;
    var remU = CI.filter(function(c) { return c.status === 'remote'; }).length;
    var totalU = HQ_USERS.length || 1;
    var pct = totalDesks > 0 ? Math.round(offU / totalDesks * 100) : 0;
    var parkDesks = D.filter(function(d) { return d.desk_type === 'parkplatz' || d.desk_type === 'e-lade'; });
    var parkUsed = parkDesks.filter(function(d) { return !!deskCI(d.nr); }).length;

    var h = '';

    // KPI Cards
    h += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">';
    h += kpiCard('ANWESEND', offU, '#EF7D00', pct + '% Auslastung');
    h += kpiCard('REMOTE', remU, '#3b82f6', 'von ' + totalU + ' Mitarbeitern');
    h += kpiCard('PLÄTZE FREI', Math.max(0, totalDesks - offU), '#22c55e', totalDesks + ' gesamt');
    h += kpiCard('PARKPLÄTZE', parkDesks.length - parkUsed + '/' + parkDesks.length, '#8b5cf6', parkUsed + ' belegt');
    h += '</div>';

    // Charts
    h += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">';

    // Occupancy bars
    h += '<div class="vit-card p-4">';
    h += '<div class="text-sm font-bold mb-4" style="color:var(--c-text)">Büro-Buchungen nächste 7 Tage</div>';
    var days7 = []; var dd = new Date(); dd.setHours(0,0,0,0);
    for (var i = 0; i < 7; i++) { days7.push(new Date(dd)); dd.setDate(dd.getDate() + 1); }
    days7.forEach(function(day) {
        var ds = day.toISOString().split('T')[0];
        var booked = BK.filter(function(b) { return b.booking_date === ds && b.status === 'office'; }).length;
        var barPct = totalDesks > 0 ? Math.round(booked / totalDesks * 100) : 0;
        var isT = ds === todayStr();
        h += '<div class="flex items-center gap-2 mb-2">';
        h += '<div class="text-[10px] font-bold w-14" style="color:' + (isT ? '#EF7D00' : 'var(--c-muted)') + '">' + (isT ? 'Heute' : ['So','Mo','Di','Mi','Do','Fr','Sa'][day.getDay()] + ' ' + day.getDate() + '.') + '</div>';
        h += '<div class="flex-1 h-5 rounded-full" style="background:var(--c-bg3)">';
        if (barPct > 0) h += '<div class="h-5 rounded-full flex items-center justify-end pr-2" style="width:' + Math.max(barPct, 8) + '%;background:#EF7D00"><span class="text-[9px] font-bold text-white">' + booked + '</span></div>';
        else h += '<div class="h-5 flex items-center pl-2"><span class="text-[9px]" style="color:var(--c-dim)">0</span></div>';
        h += '</div>';
        h += '<div class="text-[9px] w-8 text-right" style="color:var(--c-dim)">' + barPct + '%</div>';
        h += '</div>';
    });
    h += '</div>';

    // Room breakdown
    h += '<div class="vit-card p-4">';
    h += '<div class="text-sm font-bold mb-4" style="color:var(--c-text)">Belegung nach Raum</div>';
    var rooms = {};
    D.forEach(function(d) {
        if (d.desk_type === 'parkplatz' || d.desk_type === 'e-lade') return;
        var rn = d.room || 'Unbekannt';
        if (!rooms[rn]) rooms[rn] = { total: 0, used: 0 };
        rooms[rn].total++;
        if (deskCI(d.nr)) rooms[rn].used++;
    });
    Object.keys(rooms).forEach(function(name) {
        var r = rooms[name];
        var rPct = r.total > 0 ? Math.round(r.used / r.total * 100) : 0;
        h += '<div class="flex items-center gap-2 mb-2">';
        h += '<div class="text-[10px] font-bold w-24 truncate" style="color:var(--c-muted)">' + _escH(name) + '</div>';
        h += '<div class="flex-1 h-4 rounded-full" style="background:var(--c-bg3)">';
        if (rPct > 0) h += '<div class="h-4 rounded-full" style="width:' + Math.max(rPct, 5) + '%;background:#EF7D00"></div>';
        h += '</div>';
        h += '<div class="text-[9px] w-16 text-right" style="color:var(--c-dim)">' + r.used + '/' + r.total + ' (' + rPct + '%)</div>';
        h += '</div>';
    });
    h += '</div></div>';

    // Guests summary (if GF or admin)
    if (isGF() || isAdmin()) {
        h += '<div class="vit-card p-4">';
        h += '<div class="text-sm font-bold mb-3" style="color:var(--c-text)">📊 Executive Summary</div>';
        h += '<div class="grid grid-cols-3 gap-4 text-center">';
        h += '<div><div class="text-2xl font-bold" style="color:#EF7D00">' + totalU + '</div><div class="text-[10px]" style="color:var(--c-muted)">Mitarbeiter gesamt</div></div>';
        h += '<div><div class="text-2xl font-bold" style="color:#22c55e">' + pct + '%</div><div class="text-[10px]" style="color:var(--c-muted)">Ø Auslastung heute</div></div>';
        h += '<div><div class="text-2xl font-bold" style="color:#3b82f6">' + GUESTS.length + '</div><div class="text-[10px]" style="color:var(--c-muted)">Gäste heute</div></div>';
        h += '</div></div>';
    }

    return h;
}

function kpiCard(label, value, color, sub) {
    return '<div class="vit-card p-4"><div class="text-[10px] font-bold" style="color:var(--c-muted)">' + label + '</div><div class="text-2xl font-extrabold mt-1" style="color:' + color + '">' + value + '</div><div class="text-[10px] mt-1" style="color:var(--c-dim)">' + sub + '</div></div>';
}

// ═══════════════════════════════════════════════════════════
// TAB: ADMIN — Config (desks, rooms, parking)
// ═══════════════════════════════════════════════════════════
function renderAdminHTML() {
    if (!isAdmin()) return '<div class="vit-card p-8 text-center"><div class="text-sm" style="color:var(--c-muted)">Kein Zugriff</div></div>';

    var h = '';
    h += '<div class="flex gap-2 mb-4">';
    ['desks', 'rooms', 'parking'].forEach(function(t) {
        var labels = { desks: '💻 Arbeitsplätze', rooms: '🗺️ Räume', parking: '🅿️ Parkplätze' };
        var active = ADMIN_TAB === t;
        h += '<button onclick="officeSetAdminTab(\'' + t + '\')" class="px-3 py-1.5 rounded-lg text-xs font-semibold" style="' + (active ? 'background:#EF7D00;color:#fff' : 'background:var(--c-bg3);color:var(--c-muted)') + '">' + labels[t] + '</button>';
    });
    h += '</div>';

    if (ADMIN_TAB === 'desks') {
        h += '<div class="vit-card p-4">';
        h += '<div class="flex items-center justify-between mb-3">';
        h += '<span class="text-sm font-bold" style="color:var(--c-text)">Arbeitsplätze (' + D.length + ')</span>';
        h += '</div>';
        h += '<div class="overflow-x-auto"><table style="width:100%;border-collapse:collapse;font-size:12px">';
        h += '<thead><tr style="border-bottom:2px solid var(--c-border)">';
        h += '<th class="p-2 text-left" style="color:var(--c-muted)">#</th>';
        h += '<th class="p-2 text-left" style="color:var(--c-muted)">Label</th>';
        h += '<th class="p-2 text-left" style="color:var(--c-muted)">Raum</th>';
        h += '<th class="p-2 text-left" style="color:var(--c-muted)">Typ</th>';
        h += '<th class="p-2 text-left" style="color:var(--c-muted)">Zone</th>';
        h += '<th class="p-2 text-center" style="color:var(--c-muted)">📍</th>';
        h += '<th class="p-2 text-center" style="color:var(--c-muted)">Buchbar</th>';
        h += '</tr></thead><tbody>';
        D.forEach(function(d) {
            var dt = DESK_TYPES[d.desk_type] || DESK_TYPES.standard;
            h += '<tr style="border-bottom:1px solid var(--c-border)">';
            h += '<td class="p-2 font-bold">' + d.nr + '</td>';
            h += '<td class="p-2">' + _escH(d.label || '-') + '</td>';
            h += '<td class="p-2">' + _escH(d.room || '-') + '</td>';
            h += '<td class="p-2"><span class="px-2 py-0.5 rounded text-[10px] font-bold" style="background:' + dt.color + '20;color:' + dt.color + '">' + dt.icon + ' ' + dt.label + '</span></td>';
            h += '<td class="p-2">' + _escH(d.zone || '-') + '</td>';
            h += '<td class="p-2 text-center">' + (d.pct_x && d.pct_y ? '✅' : '❌') + '</td>';
            h += '<td class="p-2 text-center">' + (d.is_bookable ? '✅' : '❌') + '</td>';
            h += '</tr>';
        });
        h += '</tbody></table></div></div>';
    }

    if (ADMIN_TAB === 'rooms') {
        h += '<div class="vit-card p-4">';
        h += '<div class="text-sm font-bold mb-3" style="color:var(--c-text)">Räume (' + ROOMS.length + ')</div>';
        ROOMS.forEach(function(r) {
            var deskCount = D.filter(function(d) { return d.room_id === r.id; }).length;
            h += '<div class="flex items-center justify-between py-2" style="border-bottom:1px solid var(--c-border)">';
            h += '<div><div class="text-sm font-semibold" style="color:var(--c-text)">' + _escH(r.name) + '</div>';
            h += '<div class="text-[10px]" style="color:var(--c-muted)">' + deskCount + ' Plätze' + (r.floor_label ? ' · ' + _escH(r.floor_label) : '') + '</div></div>';
            h += '<div class="flex items-center gap-2">';
            if (r.grundriss_url) h += '<span class="text-[10px] px-2 py-0.5 rounded-full" style="background:#f0fdf4;color:#22c55e">🖼️ Grundriss</span>';
            h += '</div></div>';
        });
        h += '</div>';
    }

    if (ADMIN_TAB === 'parking') {
        var parkDesks = D.filter(function(d) { return d.desk_type === 'parkplatz' || d.desk_type === 'e-lade'; });
        h += '<div class="vit-card p-4">';
        h += '<div class="text-sm font-bold mb-3" style="color:var(--c-text)">Parkplätze (' + parkDesks.length + ')</div>';
        if (parkDesks.length > 0) {
            parkDesks.forEach(function(p) {
                var dt = DESK_TYPES[p.desk_type] || DESK_TYPES.parkplatz;
                var booked = deskCI(p.nr);
                h += '<div class="flex items-center justify-between py-2" style="border-bottom:1px solid var(--c-border)">';
                h += '<div class="flex items-center gap-3">';
                h += '<span class="text-lg">' + dt.icon + '</span>';
                h += '<div><div class="text-sm font-semibold" style="color:var(--c-text)">' + _escH(p.label || 'P' + p.nr) + '</div>';
                h += '<div class="text-[10px]" style="color:var(--c-muted)">Typ: ' + dt.label;
                if (p.metadata && p.metadata.charging) h += ' · ' + p.metadata.charging;
                h += '</div></div></div>';
                h += '<span class="text-xs font-bold" style="color:' + (booked ? '#ef4444' : '#22c55e') + '">' + (booked ? '● Belegt' : '✓ Frei') + '</span>';
                h += '</div>';
            });
        } else {
            h += '<div class="text-center py-4 text-sm" style="color:var(--c-muted)">Keine Parkplätze konfiguriert. Erstelle Desks mit Typ "parkplatz" oder "e-lade".</div>';
        }
        h += '</div>';
    }

    return h;
}

// ═══════════════════════════════════════════════════════════
// ACTIONS — Check-in, Check-out, Booking, Guests
// ═══════════════════════════════════════════════════════════

// Quick check-in (from hero button)
window.officeQuickCheckin = async function(status) {
    if (status === 'remote') {
        try {
            var r = await _sb().rpc('office_checkin', { p_status: 'remote' });
            if (r.error) throw r.error;
            if (r.data && r.data.error) { _showToast(r.data.error, 'error'); return; }
            _showToast('🏠 Remote eingecheckt', 'success');
            await load(); render();
        } catch (e) { _showToast('Fehler: ' + e.message, 'error'); }
    } else {
        // Office: show floor plan in a quick picker
        officeShowBookingModal(todayStr(), true);
    }
};

// Check-in at specific desk
window.officeCheckinDesk = async function(nr) {
    try {
        var r = await _sb().rpc('office_checkin', { p_status: 'office', p_desk_nr: nr });
        if (r.error) throw r.error;
        if (r.data && r.data.error) { _showToast(r.data.error, 'error'); return; }
        _showToast('🏢 Eingecheckt an Platz #' + nr, 'success');
        officeCloseModal();
        await load(); render();
    } catch (e) { _showToast('Fehler: ' + e.message, 'error'); }
};

// Check-out
window.officeDoCheckout = async function() {
    try {
        var ci = myCI();
        if (!ci) return;
        var r = await _sb().from('office_checkins').update({ checked_out_at: new Date().toISOString() }).eq('user_id', me()).is('checked_out_at', null);
        if (r.error) throw r.error;
        _showToast('🚪 Ausgecheckt', 'success');
        await load(); render();
    } catch (e) { _showToast('Fehler: ' + e.message, 'error'); }
};

// Booking modal
window.officeShowBookingModal = function(ds, isCheckin) {
    var freeD = D.filter(function(d) {
        return !deskBK(d.nr, ds) && !deskCI(d.nr) && d.desk_type !== 'parkplatz' && d.desk_type !== 'e-lade' && d.is_bookable !== false;
    });
    var bookedNrs = {};
    BK.filter(function(b) { return b.booking_date === ds; }).forEach(function(b) { if (b.desk_nr) bookedNrs[b.desk_nr] = b; });
    CI.forEach(function(c) { if (c.desk_nr) bookedNrs[c.desk_nr] = c; });

    var action = isCheckin ? 'officeCheckinDesk' : 'officeBookDay';

    var h = '<div style="background:rgba(0,0,0,0.5);position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999" onclick="officeCloseModal()">';
    h += '<div class="vit-card p-5" style="width:750px;max-width:95vw;max-height:90vh;overflow-y:auto" onclick="event.stopPropagation()">';
    h += '<div class="flex justify-between items-center mb-3">';
    h += '<h3 class="text-base font-bold" style="color:var(--c-text)">' + (isCheckin ? '📍 Einchecken' : '📅 ' + fmtDL(ds)) + '</h3>';
    h += '<button onclick="officeCloseModal()" class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:var(--c-bg3);color:var(--c-muted)">✕</button>';
    h += '</div>';

    // Remote option
    if (!isCheckin) {
        h += '<button onclick="officeBookDay(\'' + ds + '\',\'remote\',null)" class="w-full p-3 rounded-xl text-left text-sm font-semibold mb-3 hover:shadow transition" style="background:#eff6ff;color:#3b82f6;border:1px solid #bfdbfe">🏠 Remote arbeiten</button>';
    }

    // Floor plan
    h += '<div class="text-xs font-bold mb-2" style="color:var(--c-muted)">🏢 Platz wählen (' + freeD.length + ' frei)</div>';
    var bgUrl = ROOMS.length > 0 && ROOMS[0].grundriss_url ? ROOMS[0].grundriss_url : 'grundriss_og.png';
    h += '<div style="position:relative;border-radius:8px;overflow:hidden;border:1px solid var(--c-border)">';
    h += '<img src="' + bgUrl + '" style="width:100%;display:block;opacity:0.85">';
    D.forEach(function(d) {
        if (!d.pct_x || !d.pct_y) return;
        if (d.desk_type === 'parkplatz' || d.desk_type === 'e-lade') return;
        var isBooked = !!bookedNrs[d.nr];
        var isFree = !isBooked;
        var bg = isBooked ? '#ef4444' : '#22c55e';
        var cursor = isFree ? 'pointer' : 'not-allowed';
        var opacity = isFree ? '1' : '0.5';
        var dt = DESK_TYPES[d.desk_type] || DESK_TYPES.standard;
        var click = isFree ? 'onclick="' + action + '(' + (isCheckin ? '' : '\'' + ds + '\',\'office\',') + d.nr + ')"' : '';
        var title = isFree ? '#' + d.nr + ' ' + dt.label + ' buchen' : '#' + d.nr + ' belegt';
        h += '<div ' + click + ' style="position:absolute;left:' + d.pct_x + '%;top:' + d.pct_y + '%;transform:translate(-50%,-50%);width:24px;height:24px;border-radius:50%;background:' + bg + ';border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#fff;cursor:' + cursor + ';opacity:' + opacity + ';z-index:5" title="' + title + '">' + d.nr + '</div>';
    });
    h += '</div>';

    // Legend
    h += '<div class="flex items-center gap-4 mt-2 text-[10px]" style="color:var(--c-muted)">';
    h += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#22c55e;vertical-align:middle"></span> Frei</span>';
    h += '<span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;vertical-align:middle"></span> Belegt</span>';
    h += '</div>';

    h += '</div></div>';

    var modal = document.getElementById('officeBookingModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'officeBookingModal';
        document.body.appendChild(modal);
    }
    modal.innerHTML = h;
    modal.style.display = 'block';
};

window.officeCloseModal = function() {
    var m = document.getElementById('officeBookingModal');
    if (m) m.style.display = 'none';
};

window.officeBookDay = async function(ds, status, nr) {
    officeCloseModal();
    try {
        var r = await _sb().from('office_bookings').upsert(
            { user_id: me(), booking_date: ds, status: status, desk_nr: nr },
            { onConflict: 'user_id,booking_date' }
        );
        if (r.error) throw r.error;
        _showToast((status === 'remote' ? '🏠 Remote' : '🏢 Platz #' + (nr || '?')) + ' gebucht für ' + fmtD(ds), 'success');
        await load(); render();
    } catch (e) { _showToast('Fehler: ' + e.message, 'error'); }
};

window.officeDeleteBooking = async function(id) {
    try {
        var r = await _sb().from('office_bookings').delete().eq('id', id);
        if (r.error) throw r.error;
        _showToast('Buchung storniert', 'success');
        await load(); render();
    } catch (e) { _showToast('Fehler: ' + e.message, 'error'); }
};

// Guest modal
window.officeShowGuestModal = function() {
    var h = '<div style="background:rgba(0,0,0,0.5);position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999" onclick="officeCloseModal()">';
    h += '<div class="vit-card p-5" style="width:500px;max-width:95vw" onclick="event.stopPropagation()">';
    h += '<div class="flex justify-between items-center mb-4">';
    h += '<h3 class="text-base font-bold" style="color:var(--c-text)">🤝 Gast einladen</h3>';
    h += '<button onclick="officeCloseModal()" class="w-7 h-7 rounded-lg flex items-center justify-center" style="background:var(--c-bg3);color:var(--c-muted)">✕</button>';
    h += '</div>';

    h += '<div class="space-y-3">';
    h += inputField('guestName', 'Name *', 'Max Mustermann');
    h += inputField('guestCompany', 'Firma', 'Muster GmbH');
    h += inputField('guestEmail', 'E-Mail', 'max@muster.de');
    h += '<div class="grid grid-cols-2 gap-3">';
    h += inputField('guestDate', 'Datum *', '', 'date');
    h += inputField('guestTime', 'Uhrzeit', '', 'time');
    h += '</div>';
    h += inputField('guestRoom', 'Raum / Meetingraum', 'Konferenz 1');
    h += '<label class="flex items-center gap-2 text-sm" style="color:var(--c-text)"><input type="checkbox" id="guestParking"> Parkplatz benötigt</label>';
    h += '</div>';

    h += '<button onclick="officeCreateGuest()" class="w-full mt-4 py-2.5 rounded-xl text-sm font-bold text-white bg-vit-orange hover:opacity-90 transition">Gast einladen</button>';
    h += '</div></div>';

    var modal = document.getElementById('officeBookingModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'officeBookingModal';
        document.body.appendChild(modal);
    }
    modal.innerHTML = h;
    modal.style.display = 'block';

    // Set default date to today
    setTimeout(function() {
        var dateEl = document.getElementById('guestDate');
        if (dateEl) dateEl.value = todayStr();
    }, 50);
};

function inputField(id, label, placeholder, type) {
    type = type || 'text';
    return '<div><label class="text-[10px] font-bold" style="color:var(--c-muted)">' + label + '</label>' +
           '<input type="' + type + '" id="' + id + '" placeholder="' + placeholder + '" class="w-full px-3 py-2 rounded-lg text-sm mt-0.5" style="background:var(--c-bg3);border:1px solid var(--c-border);color:var(--c-text)"></div>';
}

window.officeCreateGuest = async function() {
    var name = (document.getElementById('guestName') || {}).value || '';
    var company = (document.getElementById('guestCompany') || {}).value || '';
    var email = (document.getElementById('guestEmail') || {}).value || '';
    var date = (document.getElementById('guestDate') || {}).value || '';
    var time = (document.getElementById('guestTime') || {}).value || null;
    var room = (document.getElementById('guestRoom') || {}).value || '';
    var parking = (document.getElementById('guestParking') || {}).checked || false;

    if (!name || !date) { _showToast('Name und Datum sind Pflichtfelder', 'error'); return; }

    try {
        var r = await _sb().from('office_guests').insert({
            host_user_id: me(),
            name: name,
            company: company || null,
            email: email || null,
            visit_date: date,
            visit_time: time,
            room: room || null,
            needs_parking: parking
        });
        if (r.error) throw r.error;
        _showToast('🤝 Gast ' + name + ' eingeladen', 'success');
        officeCloseModal();
        await load(); render();
    } catch (e) { _showToast('Fehler: ' + e.message, 'error'); }
};

window.officeGuestCheckin = async function(guestId) {
    try {
        var r = await _sb().from('office_guests').update({
            status: 'eingecheckt',
            checked_in_at: new Date().toISOString()
        }).eq('id', guestId);
        if (r.error) throw r.error;
        _showToast('✓ Gast eingecheckt', 'success');
        await load(); render();
    } catch (e) { _showToast('Fehler: ' + e.message, 'error'); }
};

// ═══════════════════════════════════════════════════════════
// NAVIGATION — Tab switching, room selection, week nav
// ═══════════════════════════════════════════════════════════
window.officeSetTab = function(tab) { TAB = tab; render(); };
window.officeSelectRoom = function(roomId) { PLAN_ROOM = roomId; render(); };
window.officeWeekNav = function(dir) { if (dir === 0) WEEK_OFFSET = 0; else WEEK_OFFSET += dir; render(); };
window.officeHomeNav = function(dir) { if (dir === 0) HOME_OFFSET = 0; else HOME_OFFSET += dir; render(); };
window.officeSetAdminTab = function(tab) { ADMIN_TAB = tab; render(); };

// ═══════════════════════════════════════════════════════════
// BADGE + REALTIME
// ═══════════════════════════════════════════════════════════
export function updateBadge() {
    var b = document.getElementById('officeOnlineBadge');
    if (b) { var c = CI.length; b.textContent = c; b.style.display = c > 0 ? 'inline' : 'none'; }
}

export function setupRT() {
    _sb().channel('office-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'office_checkins' }, async function() { await load(); render(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'office_bookings' }, async function() { await load(); render(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'office_guests' }, async function() { await load(); render(); })
        .subscribe();
}

// ═══════════════════════════════════════════════════════════
// QR Check-in
// ═══════════════════════════════════════════════════════════
export function checkQR() {
    var p = new URLSearchParams(window.location.search);
    var t = p.get('office_desk_token');
    if (t) {
        window.history.replaceState({}, '', window.location.pathname);
        var w = setInterval(function() {
            if (_sb() && _sbUser()) { clearInterval(w); handleQR(t); }
        }, 500);
    }
}

export async function handleQR(token) {
    try {
        var r = await _sb().rpc('office_checkin', { p_status: 'office', p_qr_token: token });
        if (r.error) throw r.error;
        if (r.data && r.data.error) { _showToast(r.data.error, 'error'); return; }
        _showToast('QR Check-in: Platz #' + (r.data.desk_nr || '?'), 'success');
        if (typeof showView === 'function') _showView('hqOffice');
        await load(); render();
    } catch (e) { _showToast('QR Fehler: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// STARTUP + Strangler Fig
// ═══════════════════════════════════════════════════════════
var _sv = window.showView;
if (typeof _sv === 'function') {
    window.showView = function(v) { _sv(v); if (v === 'hqOffice') init(); };
}
var _w = setInterval(function() {
    if (_sb() && _sbUser()) { clearInterval(_w); load().then(function() { updateBadge(); }); }
}, 1000);
checkQR();

// Strangler Fig exports
const _exports = {
    init, load, me, myCI, deskCI, myBK, deskBK, dayBK,
    av, ini, fmtD, fmtDL, todayStr, isToday, workdays, userName,
    render, updateBadge, setupRT, checkQR, handleQR
};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[office.js] vit:space v2 loaded - ' + Object.keys(_exports).length + ' exports registered');
