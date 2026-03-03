/**
 * views/office.js — Office Module Orchestrator (HQ only)
 * Complete rewrite 2026-02-21, split 2026-03-02
 * Uses global: sb, sbUser, sbProfile, escH, showNotification
 * @module views/office
 */
(function() {
    'use strict';

    // ─── State ───
    function _sb() { return window.sb; }
    var _weekOffset = 0;
    var _rooms = null;
    var _desks = null;
    var _myCheckin = null;
    var _todayCheckins = [];
    var _todayBookings = [];
    var _hqUsers = [];
    var _selectedDeskNr = null;

    // ─── Reset (called on user switch / loginAs) ───
    window._offResetState = function() {
        _weekOffset = 0;
        _rooms = null;
        _desks = null;
        _myCheckin = null;
        _todayCheckins = [];
        _todayBookings = [];
        _hqUsers = [];
        _selectedDeskNr = null;
    };

    // ─── Helpers ───
    function esc(s) { return typeof escH === 'function' ? escH(s) : (s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function todayISO() { return fmtISO(new Date()); }
    function fmtISO(d) { return d.getFullYear()+'-'+Z(d.getMonth()+1)+'-'+Z(d.getDate()); }
    function Z(n) { return n<10?'0'+n:''+n; }
    function fmtDE(d) { return d.getDate()+'.'+(d.getMonth()+1)+'.'; }
    function getKW(d) {
        var t=new Date(d.getTime()); t.setHours(0,0,0,0);
        t.setDate(t.getDate()+3-(t.getDay()+6)%7);
        var w1=new Date(t.getFullYear(),0,4);
        return 1+Math.round(((t-w1)/864e5-3+(w1.getDay()+6)%7)/7);
    }
    function getMonday(off) {
        var n=new Date(),m=new Date(n);
        m.setDate(n.getDate()+(off*7)); m.setHours(0,0,0,0); return m;
    }
    function initials(u) { return ((u.vorname||'?')[0]+(u.nachname||'?')[0]).toUpperCase(); }
    function fullName(u) { return (u.vorname||'')+' '+(u.nachname||''); }
    function shortName(u) { return (u.vorname||'')+' '+((u.nachname||'')[0]||'')+'.'; }
    function minutesSince(ts) { return Math.round((Date.now()-new Date(ts).getTime())/60000); }
    function hhmm(ts) { return new Date(ts).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}); }
    function notify(msg,type) { if(typeof showNotification==='function') showNotification(msg,type||'success'); }

    // ─── Data Loading ───
    async function loadDesks() {
        if(_desks) return _desks;
        var r=await _sb().from('office_desks').select('*').eq('active',true).order('nr');
        _desks=r.data||[]; return _desks;
    }
    async function loadRooms() {
        if(_rooms) return _rooms;
        var r=await _sb().from('office_rooms').select('*').eq('active',true).order('sortierung');
        _rooms=(r.data||[]).filter(function(rm){return rm.name!=='unbekannt';}); return _rooms;
    }
    async function loadHQUsers() {
        if(_hqUsers.length) return _hqUsers;
        var r=await _sb().from('users').select('id,name,vorname,nachname,avatar_url').eq('is_hq',true).eq('status','aktiv').order('nachname');
        _hqUsers=r.data||[]; return _hqUsers;
    }
    async function loadTodayCheckins() {
        var r=await _sb().from('office_checkins').select('id,user_id,desk_nr,status,checked_in_at,source')
            .gte('checked_in_at',todayISO()+'T00:00:00').is('checked_out_at',null);
        _todayCheckins=r.data||[];
        _myCheckin=_todayCheckins.find(function(c){return c.user_id===sbUser.id;})||null;
    }
    async function loadTodayBookings() {
        var r=await _sb().from('office_bookings').select('id,user_id,desk_nr,status,note').eq('booking_date',todayISO());
        _todayBookings=r.data||[];
    }

    // ─── Expose shared state via window._offState ───
    window._offState = {
        get rooms() { return _rooms; }, set rooms(v) { _rooms = v; },
        get desks() { return _desks; }, set desks(v) { _desks = v; },
        get hqUsers() { return _hqUsers; }, set hqUsers(v) { _hqUsers = v; },
        get myCheckin() { return _myCheckin; }, set myCheckin(v) { _myCheckin = v; },
        get todayCheckins() { return _todayCheckins; }, set todayCheckins(v) { _todayCheckins = v; },
        get todayBookings() { return _todayBookings; }, set todayBookings(v) { _todayBookings = v; },
        get weekOffset() { return _weekOffset; }, set weekOffset(v) { _weekOffset = v; },
        get selectedDeskNr() { return _selectedDeskNr; }, set selectedDeskNr(v) { _selectedDeskNr = v; },
        // Shared helper functions
        esc: esc, todayISO: todayISO, fmtISO: fmtISO, Z: Z, fmtDE: fmtDE, getKW: getKW, getMonday: getMonday,
        initials: initials, fullName: fullName, shortName: shortName, minutesSince: minutesSince, hhmm: hhmm, notify: notify,
        loadDesks: loadDesks, loadRooms: loadRooms, loadHQUsers: loadHQUsers,
        loadTodayCheckins: loadTodayCheckins, loadTodayBookings: loadTodayBookings
    };

    // ─── Tab Navigation ───
    window.showOfficeTab = function(tab) {
        document.querySelectorAll('.office-tab-content').forEach(function(c){ c.style.display='none'; });
        document.querySelectorAll('.office-tab-btn').forEach(function(b){
            b.className='office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition';
        });
        var el=document.getElementById('officeTab_'+tab); if(el) el.style.display='block';
        var btn=document.querySelector('.office-tab-btn[data-tab="'+tab+'"]');
        if(btn) btn.className='office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold bg-white text-gray-800 shadow-sm border-b-2 border-vit-orange transition';
        var fns={
            dashboard: window._offRenderDashboard,
            buchen: window._offRenderBuchen,
            meinebuchungen: window._offRenderMeineBuchungen,
            werImOffice: window._offRenderWerImOffice,
            gaeste: window._offRenderGaeste,
            statistik: window._offRenderStatistik
        };
        if(fns[tab]) fns[tab]();
    };

    // ─── Mount ───
    window._mountVitSpaceOffice = function() {
        var container=document.getElementById('officeReactRoot')||document.getElementById('hqOfficeView');
        if(!container||container.dataset.officeInited) return;
        container.dataset.officeInited='1';
        container.innerHTML =
            '<div class="flex items-center justify-between mb-4">'+
                '<h1 class="text-xl font-bold text-gray-800">'+
                    '<svg class="w-6 h-6 inline-block mr-2 -mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>'+
                    'Office'+
                '</h1>'+
                '<div id="officeHeaderAction"></div>'+
            '</div>'+
            '<div class="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6 overflow-x-auto">'+
                '<button onclick="showOfficeTab(\'dashboard\')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold bg-white text-gray-800 shadow-sm border-b-2 border-vit-orange transition" data-tab="dashboard">Dashboard</button>'+
                '<button onclick="showOfficeTab(\'buchen\')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition" data-tab="buchen">\ud83d\udcc5 Buchen</button>'+
                '<button onclick="showOfficeTab(\'meinebuchungen\')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition" data-tab="meinebuchungen">\ud83d\udccb Meine Buchungen</button>'+
                '<button onclick="showOfficeTab(\'werImOffice\')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition" data-tab="werImOffice">\ud83d\udc65 Wer ist im Office?</button>'+
                '<button onclick="showOfficeTab(\'gaeste\')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition" data-tab="gaeste">G\u00e4ste</button>'+
                '<button onclick="showOfficeTab(\'statistik\')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition" data-tab="statistik">Statistik</button>'+
            '</div>'+
            '<div id="officeTab_dashboard" class="office-tab-content"></div>'+
            '<div id="officeTab_buchen" class="office-tab-content" style="display:none"></div>'+
            '<div id="officeTab_meinebuchungen" class="office-tab-content" style="display:none"></div>'+
            '<div id="officeTab_werImOffice" class="office-tab-content" style="display:none"></div>'+
            '<div id="officeTab_gaeste" class="office-tab-content" style="display:none"></div>'+
            '<div id="officeTab_statistik" class="office-tab-content" style="display:none"></div>';
        window._offRenderDashboard();
    };

})();
