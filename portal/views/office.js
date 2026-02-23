// ============================================================
// vit:bikes Partner Portal — Office Module (HQ only)
// Complete rewrite 2026-02-21
// Uses global: sb, sbUser, sbProfile, escH, showNotification
// ============================================================

(function() {
    'use strict';

    // ─── State ───
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
        var r=await sb.from('office_desks').select('*').eq('active',true).order('nr');
        _desks=r.data||[]; return _desks;
    }
    async function loadRooms() {
        if(_rooms) return _rooms;
        var r=await sb.from('office_rooms').select('*').eq('active',true).order('sortierung');
        _rooms=(r.data||[]).filter(function(rm){return rm.name!=='unbekannt';}); return _rooms;
    }
    async function loadHQUsers() {
        if(_hqUsers.length) return _hqUsers;
        var r=await sb.from('users').select('id,name,vorname,nachname,avatar_url').eq('is_hq',true).eq('status','aktiv').order('nachname');
        _hqUsers=r.data||[]; return _hqUsers;
    }
    async function loadTodayCheckins() {
        var r=await sb.from('office_checkins').select('id,user_id,desk_nr,status,checked_in_at,source')
            .gte('checked_in_at',todayISO()+'T00:00:00').is('checked_out_at',null);
        _todayCheckins=r.data||[];
        _myCheckin=_todayCheckins.find(function(c){return c.user_id===sbUser.id;})||null;
    }
    async function loadTodayBookings() {
        var r=await sb.from('office_bookings').select('id,user_id,desk_nr,status,note').eq('booking_date',todayISO());
        _todayBookings=r.data||[];
    }

    // ─── Tab Navigation ───
    window.showOfficeTab = function(tab) {
        ['dashboard','wochenplan','grundriss','gaeste','statistik'].forEach(function(t){
            var c=document.getElementById('officeTab_'+t); if(c) c.style.display='none';
        });
        document.querySelectorAll('.office-tab-btn').forEach(function(b){
            b.className='office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition';
        });
        var el=document.getElementById('officeTab_'+tab); if(el) el.style.display='block';
        var btn=document.querySelector('.office-tab-btn[data-tab="'+tab+'"]');
        if(btn) btn.className='office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold bg-white text-gray-800 shadow-sm border-b-2 border-vit-orange transition';
        var fns={dashboard:renderDashboard,wochenplan:renderWochenplan,grundriss:renderGrundriss,gaeste:renderGaeste,statistik:renderStatistik};
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
                '<button onclick="showOfficeTab(\'wochenplan\')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition" data-tab="wochenplan">Wochenplan</button>'+
                '<button onclick="showOfficeTab(\'grundriss\')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition" data-tab="grundriss">Grundriss</button>'+
                '<button onclick="showOfficeTab(\'gaeste\')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition" data-tab="gaeste">G\u00e4ste</button>'+
                '<button onclick="showOfficeTab(\'statistik\')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition" data-tab="statistik">Statistik</button>'+
            '</div>'+
            '<div id="officeTab_dashboard" class="office-tab-content"></div>'+
            '<div id="officeTab_wochenplan" class="office-tab-content" style="display:none"></div>'+
            '<div id="officeTab_grundriss" class="office-tab-content" style="display:none"></div>'+
            '<div id="officeTab_gaeste" class="office-tab-content" style="display:none"></div>'+
            '<div id="officeTab_statistik" class="office-tab-content" style="display:none"></div>';
        renderDashboard();
    };

    // ═══════════════════════════════════════════════════════
    // TAB 1: DASHBOARD
    // ═══════════════════════════════════════════════════════
    async function renderDashboard() {
        var el=document.getElementById('officeTab_dashboard');
        if(!el) return;
        el.innerHTML='<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
        try {
            await Promise.all([loadDesks(),loadRooms(),loadHQUsers(),loadTodayCheckins(),loadTodayBookings()]);
            var userMap={}; _hqUsers.forEach(function(u){userMap[u.id]=u;});
            var bookable=_desks.filter(function(d){return d.is_bookable!==false && d.desk_type==='standard';});
            var occ=_todayCheckins.length, total=bookable.length;
            var pct=total>0?Math.round(occ/total*100):0;
            var myBooking=_todayBookings.find(function(b){return b.user_id===sbUser.id && b.status==='office';});
            var now=new Date(), dateLabel=now.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
            var html='';

            // ── Check-in Status Card ──
            if(_myCheckin) {
                var desk=_desks.find(function(d){return d.nr===_myCheckin.desk_nr;});
                var mins=minutesSince(_myCheckin.checked_in_at),h=Math.floor(mins/60),m=mins%60;
                html+=
                    '<div class="vit-card p-6 mb-6 border-l-4 border-green-500">'+
                        '<div class="flex items-center justify-between flex-wrap gap-4">'+
                            '<div>'+
                                '<p class="text-xs text-gray-400 uppercase font-semibold">'+esc(dateLabel)+'</p>'+
                                '<p class="text-2xl font-bold text-green-600 mt-1">\u2705 Im B\u00fcro</p>'+
                                '<p class="text-sm text-gray-600 mt-1">Platz '+(_myCheckin.desk_nr||'?')+(desk?' \u00b7 '+esc(desk.room):'')+(desk&&desk.has_monitor?' \u00b7 \ud83d\udda5\ufe0f Monitor':'')+'</p>'+
                                '<p class="text-xs text-gray-400 mt-1">Seit '+hhmm(_myCheckin.checked_in_at)+' ('+(h>0?h+'h ':'')+m+' Min.)</p>'+
                            '</div>'+
                            '<button onclick="window._offCheckOut()" class="px-5 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 shadow-lg transition">Auschecken</button>'+
                        '</div>'+
                    '</div>';
            } else {
                html+=
                    '<div class="vit-card p-6 mb-6 border-l-4 border-gray-300">'+
                        '<div class="flex items-center justify-between flex-wrap gap-4">'+
                            '<div>'+
                                '<p class="text-xs text-gray-400 uppercase font-semibold">'+esc(dateLabel)+'</p>'+
                                '<p class="text-2xl font-bold text-gray-400 mt-1">Nicht eingecheckt</p>'+
                                (myBooking?'<p class="text-sm text-blue-600 mt-1">\ud83d\udcc5 Gebucht: Platz '+myBooking.desk_nr+' ('+myBooking.status+')</p>':'<p class="text-sm text-gray-500 mt-1">Kein Platz gebucht</p>')+
                            '</div>'+
                            '<div class="text-center">'+
                                '<button onclick="window._offCheckIn()" class="px-6 py-3 bg-green-500 text-white rounded-xl font-bold text-lg hover:bg-green-600 shadow-lg transition">\ud83c\udfe2 Einchecken</button>'+
                                (myBooking?'<p class="text-[10px] text-gray-400 mt-1">Platz '+myBooking.desk_nr+'</p>':'')+
                            '</div>'+
                        '</div>'+
                    '</div>';
            }

            // ── Header check-in button ──
            var hdr=document.getElementById('officeHeaderAction');
            if(hdr) {
                if(_myCheckin) {
                    var m2=minutesSince(_myCheckin.checked_in_at),h2=Math.floor(m2/60),mm2=m2%60;
                    hdr.innerHTML='<button onclick="window._offCheckOut()" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600">Auschecken <span class="text-xs opacity-75">'+(h2>0?h2+'h ':'')+mm2+'m</span></button>';
                } else {
                    hdr.innerHTML='<button onclick="window._offCheckIn()" class="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600">\u2705 Einchecken</button>';
                }
            }

            // ── KPIs ──
            var remoteCount=_todayBookings.filter(function(b){return b.status==='remote';}).length;
            var absentCount=_todayBookings.filter(function(b){return b.status==='absent';}).length;
            var bookedCount=_todayBookings.filter(function(b){return b.status==='office';}).length;
            html+='<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">'+
                '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-green-600">'+occ+'</div><div class="text-xs text-gray-500">Im B\u00fcro</div></div>'+
                '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-blue-600">'+remoteCount+'</div><div class="text-xs text-gray-500">Remote</div></div>'+
                '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-gray-400">'+absentCount+'</div><div class="text-xs text-gray-500">Abwesend</div></div>'+
                '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-gray-700">'+total+'</div><div class="text-xs text-gray-500">Pl\u00e4tze</div></div>'+
                '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold '+(pct>80?'text-red-600':'text-vit-orange')+'">'+pct+'%</div><div class="text-xs text-gray-500">Auslastung</div></div>'+
            '</div>';

            // ── Team lists ──
            var checkedInIds={}; _todayCheckins.forEach(function(c){checkedInIds[c.user_id]=true;});
            var teamHtml='';
            if(!_todayCheckins.length) {
                teamHtml='<p class="text-gray-400 text-sm py-4">Noch niemand eingecheckt</p>';
            } else {
                _todayCheckins.forEach(function(c){
                    var u=userMap[c.user_id]||{vorname:'?',nachname:'?'};
                    var desk=_desks.find(function(d){return d.nr===c.desk_nr;});
                    var isMe=c.user_id===sbUser.id;
                    teamHtml+='<div class="flex items-center justify-between py-2 '+(isMe?'bg-green-50 -mx-2 px-2 rounded-lg':'')+'">'+
                        '<div class="flex items-center space-x-3">'+
                            '<div class="w-8 h-8 rounded-full bg-vit-orange text-white flex items-center justify-center text-xs font-bold">'+initials(u)+'</div>'+
                            '<div><span class="text-sm font-semibold">'+esc(shortName(u))+(isMe?' <span class="text-green-600 text-xs">(Du)</span>':'')+'</span>'+
                            '<br><span class="text-xs text-gray-400">P'+c.desk_nr+(desk?' \u00b7 '+esc(desk.room):'')+'</span></div>'+
                        '</div>'+
                        '<span class="text-xs text-gray-400">'+hhmm(c.checked_in_at)+'</span>'+
                    '</div>';
                });
            }
            var remoteUsers=_hqUsers.filter(function(u){return !checkedInIds[u.id];});
            var remoteList=[], absentList=[], unknownList=[];
            remoteUsers.forEach(function(u){
                var bk=_todayBookings.find(function(b){return b.user_id===u.id;});
                if(bk && bk.status==='absent') absentList.push(u);
                else if(bk && bk.status==='remote') remoteList.push(u);
                else unknownList.push(u);
            });
            // Unknown users (no booking, no checkin) are not shown as remote
            // Only explicitly booked remote users appear in remote list

            function renderUserList(users, emptyMsg, dotClass) {
                if(!users.length) return '<p class="text-gray-400 text-sm py-4">'+emptyMsg+'</p>';
                var h='';
                users.forEach(function(u){
                    var bk=_todayBookings.find(function(b){return b.user_id===u.id;});
                    h+='<div class="flex items-center justify-between py-1.5">'+
                        '<div class="flex items-center space-x-2">'+
                            '<span class="w-2 h-2 rounded-full '+(dotClass||'bg-gray-300')+'"></span>'+
                            '<span class="text-sm">'+esc(shortName(u))+'</span>'+
                        '</div>'+
                    '</div>';
                });
                return h;
            }

            html+='<div class="grid md:grid-cols-3 gap-6 mb-6">'+
                '<div class="vit-card p-5"><h3 class="font-bold text-gray-800 mb-3">\ud83d\udfe2 Im B\u00fcro <span class="text-sm font-normal text-gray-400">('+_todayCheckins.length+')</span></h3>'+teamHtml+'</div>'+
                '<div class="vit-card p-5"><h3 class="font-bold text-gray-800 mb-3">\ud83c\udfe0 Remote <span class="text-sm font-normal text-gray-400">('+remoteList.length+')</span></h3>'+renderUserList(remoteList,'Niemand remote','bg-blue-400')+'</div>'+
                '<div class="vit-card p-5"><h3 class="font-bold text-gray-800 mb-3">\u2796 Abwesend <span class="text-sm font-normal text-gray-400">('+absentList.length+')</span></h3>'+renderUserList(absentList,'Niemand abwesend','bg-gray-300')+'</div>'+
            '</div>';

            // ── Mini Map ──
            html+='<div class="vit-card p-5">'+
                '<div class="flex items-center justify-between mb-3">'+
                    '<h3 class="font-bold text-gray-800">\ud83d\uddfa\ufe0f Belegung</h3>'+
                    '<button onclick="showOfficeTab(\'grundriss\')" class="text-xs text-vit-orange hover:underline">Vollansicht \u2192</button>'+
                '</div>'+
                '<div class="bg-gray-50 rounded-xl p-2" style="max-height:280px;overflow:hidden">'+buildMiniMap()+'</div>'+
            '</div>';

            el.innerHTML=html;
        } catch(err) {
            console.error('[Office] Dashboard error:',err);
            el.innerHTML='<div class="vit-card p-6 text-center text-red-500">Fehler: '+esc(err.message)+'</div>';
        }
    }

    function buildMiniMap() {
        if(!_desks||!_desks.length) return '<p class="text-gray-400 text-sm text-center py-4">Keine Tische</p>';
        var svg='<svg viewBox="0 0 100 60" style="width:100%;height:auto" class="rounded-lg">';
        svg+='<rect x="0" y="0" width="100" height="60" fill="#f9fafb" rx="3"/>';
        var bounds={};
        _desks.forEach(function(d){
            var r=d.room||'?';
            if(!bounds[r]) bounds[r]={minX:100,minY:100,maxX:0,maxY:0};
            var px=parseFloat(d.pct_x)||50,py=parseFloat(d.pct_y)||50;
            if(px<bounds[r].minX) bounds[r].minX=px; if(py<bounds[r].minY) bounds[r].minY=py;
            if(px>bounds[r].maxX) bounds[r].maxX=px; if(py>bounds[r].maxY) bounds[r].maxY=py;
        });
        var clr={GF:'#FEF3C7','Coworking 1':'#DBEAFE',Mitte:'#D1FAE5',Expansion:'#EDE9FE','Rechts-Oben':'#FCE7F3',Finanzen:'#FEE2E2',IT:'#E0E7FF',HR:'#CCFBF1'};
        Object.keys(bounds).forEach(function(r){
            var b=bounds[r],c=clr[r]||'#F3F4F6';
            svg+='<rect x="'+(b.minX-3)+'" y="'+(b.minY-4)+'" width="'+(b.maxX-b.minX+6)+'" height="'+(b.maxY-b.minY+8)+'" fill="'+c+'" rx="1.5" opacity="0.5"/>';
            svg+='<text x="'+(b.minX-2)+'" y="'+(b.minY-1)+'" font-size="2.2" fill="#6B7280" font-weight="600">'+esc(r)+'</text>';
        });
        _desks.forEach(function(d){
            var px=parseFloat(d.pct_x)||50,py=parseFloat(d.pct_y)||50;
            var ci=_todayCheckins.find(function(c){return c.desk_nr===d.nr;});
            var bk=_todayBookings.find(function(b){return b.desk_nr===d.nr&&b.status==='office';});
            var col=ci?'#EF4444':bk?'#3B82F6':'#22C55E';
            var isMe=ci&&ci.user_id===sbUser.id;
            svg+='<circle cx="'+px+'" cy="'+py+'" r="'+(isMe?2.2:1.6)+'" fill="'+col+'" opacity="0.85" stroke="white" stroke-width="0.3"/>';
            if(isMe) svg+='<circle cx="'+px+'" cy="'+py+'" r="3" fill="none" stroke="#EF7D00" stroke-width="0.4" stroke-dasharray="1,0.5"/>';
        });
        svg+='</svg>';
        return svg;
    }

    // ─── CHECK-IN / CHECK-OUT ───
    window._offCheckIn = async function(deskNr) {
        try {
            if(_myCheckin) {
                notify('\u2705 Du bist bereits eingecheckt','info');
                return;
            }
            if(!deskNr) {
                var myBk=_todayBookings.find(function(b){return b.user_id===sbUser.id&&b.status==='office';});
                if(myBk&&myBk.desk_nr) deskNr=myBk.desk_nr;
                else {
                    var occ=_todayCheckins.map(function(c){return c.desk_nr;});
                    var free=(_desks||[]).find(function(d){return d.is_bookable!==false&&occ.indexOf(d.nr)===-1;});
                    if(free) deskNr=free.nr;
                }
            }
            var r=await sb.from('office_checkins').insert({
                user_id:sbUser.id, desk_nr:deskNr||null, status:'office',
                checked_in_at:new Date().toISOString(), source:'manual'
            }).select().single();
            if(r.error) {
                if(r.error.code === '23505') {
                    // Duplicate: stale checkin exists, close old ones and retry
                    console.log('[Office] Stale checkin detected, closing old ones...');
                    await sb.from('office_checkins').update({checked_out_at: new Date().toISOString()})
                        .eq('user_id', sbUser.id).is('checked_out_at', null);
                    // Retry insert
                    var r2=await sb.from('office_checkins').insert({
                        user_id:sbUser.id, desk_nr:deskNr||null, status:'office',
                        checked_in_at:new Date().toISOString(), source:'manual'
                    }).select().single();
                    if(r2.error) throw r2.error;
                    notify('\u2705 Eingecheckt'+(deskNr?' auf Platz '+deskNr:''),'success');
                    await loadTodayCheckins(); renderDashboard();
                    return;
                }
                throw r.error;
            }
            notify('\u2705 Eingecheckt'+(deskNr?' auf Platz '+deskNr:''),'success');
            await loadTodayCheckins(); renderDashboard();
        } catch(err) {
            console.error('[Office] Check-in error:',err);
            notify('Fehler: '+err.message,'error');
        }
    };

    window._offCheckOut = async function() {
        if(!_myCheckin) return;
        try {
            var r=await sb.from('office_checkins').update({checked_out_at:new Date().toISOString()}).eq('id',_myCheckin.id);
            if(r.error) throw r.error;
            notify('\ud83d\udc4b Ausgecheckt!','success');
            _myCheckin=null; await loadTodayCheckins(); renderDashboard();
        } catch(err) {
            console.error('[Office] Check-out error:',err);
            notify('Fehler: '+err.message,'error');
        }
    };

    // ═══════════════════════════════════════════════════════
    // TAB 2: WOCHENPLAN (editable for current user)
    // ═══════════════════════════════════════════════════════
    async function renderWochenplan() {
        var el=document.getElementById('officeTab_wochenplan');
        if(!el) return;
        el.innerHTML='<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
        try {
            var monday=getMonday(_weekOffset);
            var days=[]; for(var i=0;i<5;i++){var d=new Date(monday);d.setDate(monday.getDate()+i);days.push(d);}
            var kw=getKW(monday), monISO=fmtISO(monday), friISO=fmtISO(days[4]);
            await loadHQUsers();
            await Promise.all([loadDesks(), loadRooms()]);
            var bkRes=await sb.from('office_bookings').select('*').gte('booking_date',monISO).lte('booking_date',friISO);
            var bookings=bkRes.data||[];
            var bMap={}; bookings.forEach(function(b){bMap[b.user_id+'_'+b.booking_date]=b;});
            var dayLabels=['Mo','Di','Mi','Do','Fr'];

            // Day summaries
            var daySums=[]; days.forEach(function(d){
                var ds=fmtISO(d), ob=0,rb=0,ab=0;
                bookings.forEach(function(b){if(b.booking_date===ds){if(b.status==='office')ob++;else if(b.status==='remote')rb++;else if(b.status==='absent')ab++;}});
                daySums.push({office:ob,remote:rb,absent:ab});
            });

            var html='<div class="flex items-center justify-between mb-4">'+
                '<button onclick="window._offWeekNav(-1)" class="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold">\u2190</button>'+
                '<span class="font-bold text-gray-700">KW '+kw+' \u00b7 '+fmtDE(monday)+'\u2013'+fmtDE(days[4])+'</span>'+
                '<button onclick="window._offWeekNav(1)" class="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold">\u2192</button>'+
            '</div>';

            // Table
            html+='<div class="vit-card overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b">';
            html+='<th class="text-left p-3 font-semibold text-gray-600 min-w-[140px]">Mitarbeiter</th>';
            days.forEach(function(d,i){
                var isT=fmtISO(d)===todayISO();
                html+='<th class="text-center p-3 font-semibold '+(isT?'text-vit-orange bg-orange-50':'text-gray-600')+'">'+dayLabels[i]+'<br><span class="text-xs font-normal">'+fmtDE(d)+'</span></th>';
            });
            html+='</tr></thead><tbody>';

            // Sort: current user first
            var sorted=_hqUsers.slice().sort(function(a,b){
                if(a.id===sbUser.id) return -1; if(b.id===sbUser.id) return 1;
                return (a.nachname||'').localeCompare(b.nachname||'');
            });

            sorted.forEach(function(u){
                var isMe=u.id===sbUser.id;
                html+='<tr class="border-b hover:bg-gray-50'+(isMe?' bg-orange-50/30':'')+'">';
                html+='<td class="p-3 font-medium text-sm'+(isMe?' text-vit-orange':'')+'">'+esc(shortName(u))+(isMe?' \u2b50':'')+'</td>';
                days.forEach(function(d){
                    var ds=fmtISO(d), key=u.id+'_'+ds, b=bMap[key], st=b?b.status:'';
                    var isT=ds===todayISO();
                    if(isMe) {
                        // Find which desks are booked by others on this day
                        var dayBookedDesks=[];
                        bookings.forEach(function(bk){if(bk.booking_date===ds && bk.status==='office' && bk.desk_nr && bk.user_id!==sbUser.id) dayBookedDesks.push(bk.desk_nr);});
                        var myDesk=b?b.desk_nr:null;
                        
                        html+='<td class="text-center p-2'+(isT?' bg-orange-50':'')+'">'+
                            '<select onchange="window._offSetDay(\''+ds+'\',this.value)" class="text-xs border border-gray-200 rounded-lg px-1 py-1.5 bg-white text-center font-semibold cursor-pointer w-full focus:ring-2 focus:ring-vit-orange">'+
                                '<option value=""'+(!st?' selected':'')+'>\u2014</option>'+
                                '<option value="office"'+(st==='office'?' selected':'')+'>\ud83c\udfe2 B\u00fcro</option>'+
                                '<option value="remote"'+(st==='remote'?' selected':'')+'>\ud83c\udfe0 Remote</option>'+
                                '<option value="absent"'+(st==='absent'?' selected':'')+'>\u2796 Abwesend</option>'+
                            '</select>';
                        if(st==='office' && _desks && _desks.length) {
                            html+='<select onchange="window._offSetDesk(\''+ds+'\',this.value)" class="text-[10px] border border-gray-100 rounded px-0.5 py-0.5 mt-1 w-full text-center text-gray-500 cursor-pointer">';
                            html+='<option value=""'+(myDesk?'':' selected')+'>Platz w\u00e4hlen\u2026</option>';
                            (_rooms||[]).forEach(function(room){
                                var rd=(_desks||[]).filter(function(dd){return (dd.room_id===room.id||dd.room===room.name) && dd.is_bookable!==false && dd.desk_type!=='parkplatz' && dd.desk_type!=='e-lade';});
                                if(!rd.length) return;
                                html+='<optgroup label="'+esc(room.name)+'">';
                                rd.forEach(function(dd){
                                    var taken=dayBookedDesks.indexOf(dd.nr)>=0;
                                    html+='<option value="'+dd.nr+'"'+(myDesk===dd.nr?' selected':'')+(taken?' disabled':'')+'>P'+dd.nr+(dd.label?' \u2013 '+esc(dd.label):'')+(taken?' (belegt)':'')+'</option>';
                                });
                                html+='</optgroup>';
                            });
                            html+='</select>';
                        } else if(st==='office' && myDesk) {
                            html+='<div class="text-[10px] text-gray-400 mt-0.5">P'+myDesk+'</div>';
                        }
                        html+='</td>';
                    } else {
                        var badge='<span class="text-gray-300">\u2014</span>';
                        if(st==='office') badge='<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">B\u00fcro</span>';
                        else if(st==='remote') badge='<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Remote</span>';
                        else if(st==='absent') badge='<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Abwesend</span>';
                        html+='<td class="text-center p-3'+(isT?' bg-orange-50':'')+'">'+badge+'</td>';
                    }
                });
                html+='</tr>';
            });

            // ── Parking row for current user ──
            var parkingDesks=(_desks||[]).filter(function(d){return d.desk_type==='parkplatz'||d.desk_type==='e-lade';});
            if(parkingDesks.length) {
                html+='<tr class="border-b bg-blue-50/30">';
                html+='<td class="p-3 font-medium text-sm text-gray-500">\ud83c\udd7f\ufe0f Parkplatz</td>';
                days.forEach(function(d){
                    var ds=fmtISO(d), key=sbUser.id+'_'+ds, b=bMap[key];
                    var myParking=b?b.parking_nr:null;
                    var isT=ds===todayISO();
                    // Find which parking spots are taken by others
                    var dayBookedParking=[];
                    bookings.forEach(function(bk){if(bk.booking_date===ds && bk.parking_nr && bk.user_id!==sbUser.id) dayBookedParking.push(bk.parking_nr);});

                    html+='<td class="text-center p-2'+(isT?' bg-orange-50':'')+'">';
                    if(b && b.status) {
                        html+='<select onchange="window._offSetParking(\''+ds+'\',this.value)" class="text-[10px] border border-gray-100 rounded px-0.5 py-0.5 w-full text-center text-gray-500 cursor-pointer">';
                        html+='<option value="">kein Parkplatz</option>';
                        var eLade=parkingDesks.filter(function(p){return p.desk_type==='e-lade';}); 
                        var pool=parkingDesks.filter(function(p){return p.desk_type==='parkplatz';});
                        if(eLade.length) {
                            html+='<optgroup label="\u26a1 E-Ladeplatz">';
                            eLade.forEach(function(p){
                                var taken=dayBookedParking.indexOf(p.nr)>=0;
                                html+='<option value="'+p.nr+'"'+(myParking===p.nr?' selected':'')+(taken?' disabled':'')+'>P'+p.nr+(p.label?' \u2013 '+esc(p.label):'')+(taken?' (belegt)':'')+'</option>';
                            });
                            html+='</optgroup>';
                        }
                        if(pool.length) {
                            html+='<optgroup label="\ud83c\udd7f\ufe0f Pool">';
                            pool.forEach(function(p){
                                var taken=dayBookedParking.indexOf(p.nr)>=0;
                                html+='<option value="'+p.nr+'"'+(myParking===p.nr?' selected':'')+(taken?' disabled':'')+'>P'+p.nr+(p.label?' \u2013 '+esc(p.label):'')+(taken?' (belegt)':'')+'</option>';
                            });
                            html+='</optgroup>';
                        }
                        html+='</select>';
                    } else {
                        html+='<span class="text-gray-300 text-xs">\u2014</span>';
                    }
                    html+='</td>';
                });
                html+='</tr>';
            }

            html+='</tbody></table></div>';

            // Day summaries bar
            html+='<div class="grid grid-cols-5 gap-2 mt-4">';
            days.forEach(function(d,i){
                var s=daySums[i], isT=fmtISO(d)===todayISO();
                html+='<div class="text-center text-xs p-2 rounded-lg '+(isT?'bg-orange-50 border border-orange-200':'bg-gray-50')+'">'+
                    '<div class="font-semibold text-gray-600">'+dayLabels[i]+'</div>'+
                    '<div class="mt-1"><span class="text-green-600 font-bold">'+s.office+'</span> \ud83c\udfe2 '+
                    '<span class="text-blue-500">'+s.remote+'</span> \ud83c\udfe0 '+
                    '<span class="text-gray-400">'+s.absent+'</span></div>'+
                '</div>';
            });
            html+='</div>';

            el.innerHTML=html;
        } catch(err) {
            console.error('[Office] Wochenplan error:',err);
            el.innerHTML='<div class="vit-card p-6 text-center text-red-500">Fehler: '+esc(err.message)+'</div>';
        }
    }

    window._offWeekNav = function(dir) { _weekOffset+=dir; renderWochenplan(); };

    // Set day plan for current user (upsert booking)
    window._offSetDay = async function(dateStr, status) {
        try {
            if(!status) {
                // Delete booking
                await sb.from('office_bookings').delete().eq('user_id',sbUser.id).eq('booking_date',dateStr);
            } else {
                // Upsert: unique on (user_id, booking_date)
                var r=await sb.from('office_bookings').upsert({
                    user_id:sbUser.id, booking_date:dateStr, status:status,
                    desk_nr:null, updated_at:new Date().toISOString()
                },{onConflict:'user_id,booking_date'});
                if(r.error) throw r.error;
            }
            // Re-render to show/hide desk picker
            renderWochenplan();
        } catch(err) {
            console.error('[Office] SetDay error:',err);
            if(typeof showToast==='function') showToast('Fehler: '+err.message,'error');
        }
    };

    // Set desk for a specific day
    window._offSetDesk = async function(dateStr, deskNr) {
        try {
            var nr=deskNr?parseInt(deskNr):null;
            var r=await sb.from('office_bookings').update({desk_nr:nr,updated_at:new Date().toISOString()}).eq('user_id',sbUser.id).eq('booking_date',dateStr);
            if(r.error) throw r.error;
            var sel=event&&event.target;
            if(sel){sel.style.boxShadow='0 0 0 2px #22c55e';setTimeout(function(){sel.style.boxShadow='';},600);}
            if(nr && typeof showToast==='function') showToast('\u2705 P'+nr+' gebucht f\u00fcr '+dateStr,'success');
        } catch(err) {
            console.error('[Office] SetDesk error:',err);
            if(typeof showToast==='function') showToast('Fehler: '+err.message,'error');
        }
    };

    // Set parking for a specific day
    window._offSetParking = async function(dateStr, parkNr) {
        try {
            var nr=parkNr?parseInt(parkNr):null;
            var r=await sb.from('office_bookings').update({parking_nr:nr,updated_at:new Date().toISOString()}).eq('user_id',sbUser.id).eq('booking_date',dateStr);
            if(r.error) throw r.error;
            var sel=event&&event.target;
            if(sel){sel.style.boxShadow='0 0 0 2px #22c55e';setTimeout(function(){sel.style.boxShadow='';},600);}
            if(nr && typeof showToast==='function') showToast('\ud83c\udd7f\ufe0f P'+nr+' Parkplatz gebucht','success');
        } catch(err) {
            console.error('[Office] SetParking error:',err);
            if(typeof showToast==='function') showToast('Fehler: '+err.message,'error');
        }
    };

    // ═══════════════════════════════════════════════════════
    // TAB 3: GRUNDRISS with Seat Picker
    // ═══════════════════════════════════════════════════════
    async function renderGrundriss() {
        var el=document.getElementById('officeTab_grundriss');
        if(!el) return;
        el.innerHTML='<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
        try {
            await Promise.all([loadRooms(),loadDesks(),loadTodayCheckins(),loadTodayBookings(),loadHQUsers()]);
            if(!_rooms||!_rooms.length) {
                el.innerHTML='<div class="vit-card p-8 text-center text-gray-400">Keine R\u00e4ume konfiguriert</div>';
                return;
            }
            var opts=_rooms.map(function(r,i){
                return '<option value="'+r.id+'"'+(i===0?' selected':'')+'>'+esc(r.name)+(r.floor_label?' ('+esc(r.floor_label)+')':'')+'</option>';
            }).join('');
            el.innerHTML=
                '<div class="flex items-center justify-between mb-4 flex-wrap gap-2">'+
                    '<select id="officeRoomSelect" onchange="window._offLoadRoom()" class="border rounded-lg px-3 py-2 text-sm font-semibold">'+opts+'</select>'+
                    '<div class="flex items-center gap-4 text-xs text-gray-500">'+
                        '<span><span class="inline-block w-3 h-3 rounded-full bg-green-500"></span> Frei</span>'+
                        '<span><span class="inline-block w-3 h-3 rounded-full bg-red-500"></span> Belegt</span>'+
                        '<span><span class="inline-block w-3 h-3 rounded-full bg-blue-500"></span> Gebucht</span>'+
                        '<span><span class="inline-block w-3 h-3 rounded-full bg-orange-500 border-2 border-orange-300"></span> Du</span>'+
                    '</div>'+
                '</div>'+
                '<div id="officeFloorplanArea" class="vit-card p-4 min-h-[400px]"></div>'+
                '<div id="officeDeskDetail" style="display:none" class="vit-card p-5 mt-4"></div>';
            window._offLoadRoom();
        } catch(err) {
            console.error('[Office] Grundriss error:',err);
            el.innerHTML='<div class="vit-card p-6 text-center text-red-500">Fehler: '+esc(err.message)+'</div>';
        }
    }

    window._offLoadRoom = async function() {
        var area=document.getElementById('officeFloorplanArea');
        if(!area) return;
        area.innerHTML='<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';

        var roomId=document.getElementById('officeRoomSelect').value;
        var room=_rooms.find(function(r){return String(r.id)===String(roomId);});
        if(!room){area.innerHTML='<p class="text-gray-400">Raum nicht gefunden</p>';return;}

        var roomDesks=_desks.filter(function(d){return d.room_id===roomId || d.room===room.name;});
        var viewBox=room.svg_viewbox||'0 0 100 70';
        var imgOp=room.image_opacity||0.3;
        var bgImg=room.grundriss_url?'<image href="'+room.grundriss_url+'" x="0" y="0" width="100%" height="100%" opacity="'+imgOp+'"/>':'';

        var userMap={}; _hqUsers.forEach(function(u){userMap[u.id]=u;});
        var checkinByDesk={}; _todayCheckins.forEach(function(c){if(c.desk_nr) checkinByDesk[c.desk_nr]=c;});
        var bookingByDesk={}; _todayBookings.forEach(function(b){if(b.desk_nr&&b.status==='office') bookingByDesk[b.desk_nr]=b;});

        var desksSvg=roomDesks.map(function(d){
            var cx=parseFloat(d.pct_x)||50, cy=parseFloat(d.pct_y)||50;
            var ci=checkinByDesk[d.nr], bk=bookingByDesk[d.nr];
            var isMe=(ci&&ci.user_id===sbUser.id)||(bk&&bk.user_id===sbUser.id);
            var col=ci?'#EF4444':bk?'#3B82F6':'#22C55E';
            if(isMe) col='#F97316';
            var r=isMe?3:2;
            var tooltip='Platz '+d.nr;
            if(ci){var u=userMap[ci.user_id]; tooltip+=' \u2022 '+(u?shortName(u):'belegt');}
            else if(bk){var u2=userMap[bk.user_id]; tooltip+=' \u2022 gebucht'+(u2?' ('+shortName(u2)+')':'');}
            else tooltip+=' \u2022 frei';
            var s='<g style="cursor:pointer" onclick="window._offSelectDesk('+d.nr+')">';
            s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+col+'" stroke="white" stroke-width="0.4" opacity="0.9"><title>'+esc(tooltip)+'</title></circle>';
            if(isMe) s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(r+1.2)+'" fill="none" stroke="#EF7D00" stroke-width="0.5" stroke-dasharray="1,0.5"/>';
            s+='<text x="'+cx+'" y="'+(cy+4)+'" text-anchor="middle" font-size="2" fill="#4B5563" font-weight="600">'+d.nr+'</text>';
            s+='</g>';
            return s;
        }).join('');

        area.innerHTML=
            '<svg viewBox="'+viewBox+'" class="w-full border rounded-lg bg-gray-50" style="max-height:500px">'+
                bgImg+desksSvg+
            '</svg>'+
            '<p class="text-xs text-gray-400 mt-2 text-center">'+roomDesks.length+' Pl\u00e4tze \u00b7 Klick auf einen Platz f\u00fcr Details</p>';
    };

    // ─── Desk Detail + Booking ───
    window._offSelectDesk = function(nr) {
        _selectedDeskNr=nr;
        var det=document.getElementById('officeDeskDetail');
        if(!det) return;
        var desk=_desks.find(function(d){return d.nr===nr;});
        if(!desk){det.style.display='none';return;}

        var ci=_todayCheckins.find(function(c){return c.desk_nr===nr;});
        var bk=_todayBookings.find(function(b){return b.desk_nr===nr&&b.status==='office';});
        var userMap={}; _hqUsers.forEach(function(u){userMap[u.id]=u;});

        var statusHtml='';
        if(ci) {
            var u=userMap[ci.user_id]||{vorname:'?',nachname:'?'};
            statusHtml='<div class="flex items-center space-x-2"><span class="w-3 h-3 rounded-full bg-red-500"></span><span class="font-semibold text-red-600">Belegt</span><span class="text-sm text-gray-500">von '+esc(fullName(u))+' seit '+hhmm(ci.checked_in_at)+'</span></div>';
        } else if(bk) {
            var u2=userMap[bk.user_id]||{vorname:'?',nachname:'?'};
            statusHtml='<div class="flex items-center space-x-2"><span class="w-3 h-3 rounded-full bg-blue-500"></span><span class="font-semibold text-blue-600">Gebucht</span><span class="text-sm text-gray-500">von '+esc(fullName(u2))+'</span></div>';
        } else {
            statusHtml='<div class="flex items-center space-x-2"><span class="w-3 h-3 rounded-full bg-green-500"></span><span class="font-semibold text-green-600">Frei</span></div>';
        }

        var features='';
        if(desk.has_monitor) features+='<span class="px-2 py-1 bg-gray-100 rounded text-xs">\ud83d\udda5\ufe0f Monitor</span>';
        if(desk.has_docking) features+='<span class="px-2 py-1 bg-gray-100 rounded text-xs">\ud83d\udd0c Docking</span>';
        if(desk.zone) features+='<span class="px-2 py-1 bg-gray-100 rounded text-xs">\ud83d\udccd '+esc(desk.zone)+'</span>';

        var actions='';
        var isFree=!ci&&!bk;
        var isMyBooking=bk&&bk.user_id===sbUser.id;
        if(isFree) {
            actions='<div class="flex gap-2 mt-4">'+
                '<button onclick="window._offBookDesk('+nr+')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">\ud83d\udcc5 Heute buchen</button>'+
                '<button onclick="window._offCheckIn('+nr+')" class="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:opacity-90">\u2705 Hier einchecken</button>'+
            '</div>';
        } else if(isMyBooking) {
            actions='<div class="flex gap-2 mt-4">'+
                '<button onclick="window._offCheckIn('+nr+')" class="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:opacity-90">\u2705 Einchecken</button>'+
                '<button onclick="window._offCancelBooking(\''+bk.id+'\')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300">Stornieren</button>'+
            '</div>';
        }

        det.style.display='block';
        det.innerHTML=
            '<div class="flex items-start justify-between">'+
                '<div>'+
                    '<h3 class="text-lg font-bold text-gray-800">Platz '+nr+'</h3>'+
                    '<p class="text-sm text-gray-500">'+esc(desk.room)+(desk.label?' \u00b7 '+esc(desk.label):'')+'</p>'+
                '</div>'+
                '<button onclick="document.getElementById(\'officeDeskDetail\').style.display=\'none\'" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button>'+
            '</div>'+
            '<div class="mt-3">'+statusHtml+'</div>'+
            (features?'<div class="flex flex-wrap gap-2 mt-3">'+features+'</div>':'')+
            actions;

        det.scrollIntoView({behavior:'smooth',block:'nearest'});
    };

    window._offBookDesk = async function(nr) {
        try {
            var r=await sb.from('office_bookings').upsert({
                user_id:sbUser.id, booking_date:todayISO(), status:'office',
                desk_nr:nr, updated_at:new Date().toISOString()
            },{onConflict:'user_id,booking_date'});
            if(r.error) throw r.error;
            notify('\ud83d\udcc5 Platz '+nr+' gebucht!','success');
            await loadTodayBookings(); window._offLoadRoom(); window._offSelectDesk(nr);
        } catch(err) {
            console.error('[Office] Book error:',err); notify('Fehler: '+err.message,'error');
        }
    };

    window._offCancelBooking = async function(bookingId) {
        try {
            var r=await sb.from('office_bookings').delete().eq('id',bookingId);
            if(r.error) throw r.error;
            notify('Buchung storniert','success');
            await loadTodayBookings(); window._offLoadRoom();
            document.getElementById('officeDeskDetail').style.display='none';
        } catch(err) {
            console.error('[Office] Cancel error:',err); notify('Fehler: '+err.message,'error');
        }
    };

    // ═══════════════════════════════════════════════════════
    // TAB 4: G\u00c4STE with Invite Modal + Check-in/out
    // ═══════════════════════════════════════════════════════
    async function renderGaeste() {
        var el=document.getElementById('officeTab_gaeste');
        if(!el) return;
        el.innerHTML='<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
        try {
            var td=todayISO();
            var [todayRes,futureRes]=await Promise.all([
                sb.from('office_guests').select('*').eq('visit_date',td).order('visit_time'),
                sb.from('office_guests').select('*').gt('visit_date',td).order('visit_date').limit(20)
            ]);
            var todayGuests=todayRes.data||[], futureGuests=futureRes.data||[];

            function badge(g) {
                if(g.status==='checked_out'||g.checked_in_at&&g.status==='done') return '<span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Ausgecheckt</span>';
                if(g.checked_in_at) return '<span class="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Eingecheckt</span>';
                return '<span class="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">Erwartet</span>';
            }

            function guestRow(g,showDate) {
                var pk=g.needs_parking?'\ud83c\udd7f\ufe0f':'';
                var dt=showDate?'<span class="text-xs text-gray-400 ml-2">'+g.visit_date+'</span>':'';
                var actions='';
                if(!g.checked_in_at) {
                    actions='<button onclick="window._offGuestCheckIn(\''+g.id+'\')" class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 ml-2">Einchecken</button>';
                } else if(!g.status||g.status!=='done') {
                    actions='<button onclick="window._offGuestCheckOut(\''+g.id+'\')" class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 ml-2">Auschecken</button>';
                }
                return '<div class="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">'+
                    '<div>'+
                        '<span class="font-medium text-sm">'+esc(g.name)+'</span> '+pk+dt+
                        (g.company?'<br><span class="text-xs text-gray-400">'+esc(g.company)+'</span>':'')+
                        (g.room?'<br><span class="text-xs text-gray-400">\ud83d\udccd '+esc(g.room)+'</span>':'')+
                    '</div>'+
                    '<div class="flex items-center gap-1 flex-shrink-0">'+
                        (g.visit_time?'<span class="text-xs text-gray-400">'+g.visit_time.substring(0,5)+'</span>':'')+
                        badge(g)+actions+
                    '</div>'+
                '</div>';
            }

            var html=
                '<div class="flex justify-end mb-4">'+
                    '<button onclick="window._offGuestModal()" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">+ Gast einladen</button>'+
                '</div>'+
                '<div class="grid md:grid-cols-2 gap-6">'+
                    '<div class="vit-card p-5">'+
                        '<h3 class="font-bold text-gray-800 mb-3">Heutige G\u00e4ste <span class="text-sm font-normal text-gray-400">('+todayGuests.length+')</span></h3>'+
                        (!todayGuests.length?'<p class="text-gray-400 text-sm">Keine G\u00e4ste heute</p>':todayGuests.map(function(g){return guestRow(g,false);}).join(''))+
                    '</div>'+
                    '<div class="vit-card p-5">'+
                        '<h3 class="font-bold text-gray-800 mb-3">Kommende G\u00e4ste</h3>'+
                        (!futureGuests.length?'<p class="text-gray-400 text-sm">Keine weiteren G\u00e4ste</p>':futureGuests.map(function(g){return guestRow(g,true);}).join(''))+
                    '</div>'+
                '</div>';

            // Guest invite modal placeholder
            html+='<div id="officeGuestModal" style="display:none" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">'+
                '<div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">'+
                    '<div class="flex items-center justify-between mb-4">'+
                        '<h3 class="text-lg font-bold text-gray-800">Gast einladen</h3>'+
                        '<button onclick="document.getElementById(\'officeGuestModal\').style.display=\'none\'" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button>'+
                    '</div>'+
                    '<div class="space-y-3">'+
                        '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Name *</label><input id="offGuestName" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Max Mustermann"></div>'+
                        '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Firma</label><input id="offGuestCompany" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Firma GmbH"></div>'+
                        '<div><label class="block text-sm font-semibold text-gray-600 mb-1">E-Mail</label><input id="offGuestEmail" type="email" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="max@firma.de"></div>'+
                        '<div class="grid grid-cols-2 gap-3">'+
                            '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Datum *</label><input id="offGuestDate" type="date" class="w-full border rounded-lg px-3 py-2 text-sm" value="'+todayISO()+'"></div>'+
                            '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Uhrzeit</label><input id="offGuestTime" type="time" class="w-full border rounded-lg px-3 py-2 text-sm" value="10:00"></div>'+
                        '</div>'+
                        '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Raum</label>'+
                            '<select id="offGuestRoom" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="">-- Kein Raum --</option>'+
                            (_rooms||[]).map(function(r){return '<option value="'+esc(r.name)+'">'+esc(r.name)+'</option>';}).join('')+
                            '</select>'+
                        '</div>'+
                        '<div class="flex items-center space-x-2">'+
                            '<input id="offGuestParking" type="checkbox" class="rounded border-gray-300">'+
                            '<label for="offGuestParking" class="text-sm text-gray-600">Parkplatz ben\u00f6tigt</label>'+
                        '</div>'+
                        '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Notizen</label><textarea id="offGuestNotes" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Anlass, besondere W\u00fcnsche..."></textarea></div>'+
                    '</div>'+
                    '<div class="flex gap-3 mt-5">'+
                        '<button onclick="window._offSaveGuest()" class="flex-1 px-4 py-2 bg-vit-orange text-white rounded-lg font-semibold hover:opacity-90">Speichern</button>'+
                        '<button onclick="document.getElementById(\'officeGuestModal\').style.display=\'none\'" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold hover:bg-gray-200">Abbrechen</button>'+
                    '</div>'+
                '</div>'+
            '</div>';

            el.innerHTML=html;
        } catch(err) {
            console.error('[Office] Gaeste error:',err);
            el.innerHTML='<div class="vit-card p-6 text-center text-red-500">Fehler: '+esc(err.message)+'</div>';
        }
    }

    window._offGuestModal = function() {
        var m=document.getElementById('officeGuestModal');
        if(m) m.style.display='flex';
    };

    window._offSaveGuest = async function() {
        var name=(document.getElementById('offGuestName')||{}).value;
        var company=(document.getElementById('offGuestCompany')||{}).value;
        var email=(document.getElementById('offGuestEmail')||{}).value;
        var date=(document.getElementById('offGuestDate')||{}).value;
        var time=(document.getElementById('offGuestTime')||{}).value;
        var room=(document.getElementById('offGuestRoom')||{}).value;
        var parking=(document.getElementById('offGuestParking')||{}).checked;
        var notes=(document.getElementById('offGuestNotes')||{}).value;
        if(!name||!date){notify('Name und Datum sind Pflichtfelder','error');return;}
        try {
            var r=await sb.from('office_guests').insert({
                host_user_id:sbUser.id, name:name, company:company||null,
                email:email||null, visit_date:date, visit_time:time||null,
                room:room||null, needs_parking:parking, notes:notes||null,
                status:'expected'
            }).select().single();
            if(r.error) throw r.error;
            notify('\ud83d\udc64 Gast '+esc(name)+' eingeladen!','success');
            document.getElementById('officeGuestModal').style.display='none';
            renderGaeste();
        } catch(err) {
            console.error('[Office] SaveGuest error:',err);
            notify('Fehler: '+err.message,'error');
        }
    };

    window._offGuestCheckIn = async function(id) {
        try {
            var r=await sb.from('office_guests').update({checked_in_at:new Date().toISOString(),status:'checked_in'}).eq('id',id);
            if(r.error) throw r.error;
            notify('Gast eingecheckt','success'); renderGaeste();
        } catch(err) { notify('Fehler: '+err.message,'error'); }
    };

    window._offGuestCheckOut = async function(id) {
        try {
            var r=await sb.from('office_guests').update({status:'done'}).eq('id',id);
            if(r.error) throw r.error;
            notify('Gast ausgecheckt','success'); renderGaeste();
        } catch(err) { notify('Fehler: '+err.message,'error'); }
    };

    // ═══════════════════════════════════════════════════════
    // TAB 5: STATISTIK + GAMIFICATION
    // ═══════════════════════════════════════════════════════
    async function renderStatistik() {
        var el=document.getElementById('officeTab_statistik');
        if(!el) return;
        el.innerHTML='<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
        try {
            var now=new Date(), monthStart=new Date(now.getFullYear(),now.getMonth(),1);
            var thirtyAgo=new Date(now); thirtyAgo.setDate(now.getDate()-30);

            var [engRes,checkinsRes,desksRes,allEngRes]=await Promise.all([
                sb.from('office_engagement').select('*').eq('user_id',sbUser.id).gte('month',fmtISO(monthStart)).limit(1),
                sb.from('office_checkins').select('user_id,checked_in_at,status').gte('checked_in_at',fmtISO(thirtyAgo)+'T00:00:00'),
                sb.from('office_desks').select('nr').eq('active',true).neq('desk_type','parkplatz'),
                sb.from('office_engagement').select('user_id,office_days,current_streak,badges').gte('month',fmtISO(monthStart))
            ]);

            var eng=(engRes.data||[])[0]||{};
            var checkins=(checkinsRes.data||[]).filter(function(c){return c.status==='office';});
            var totalDesks=(desksRes.data||[]).length;
            var allEng=allEngRes.data||[];

            await loadHQUsers();
            var userMap={}; _hqUsers.forEach(function(u){userMap[u.id]=u;});

            // ── Personal Stats ──
            var myDays=eng.office_days||0, myStreak=eng.current_streak||0, myMax=eng.max_streak||0;
            var myHours=eng.office_hours?parseFloat(eng.office_hours).toFixed(1):'0';
            var myGuests=eng.guests_hosted||0, myDesks=eng.unique_desks||0;

            var html='<h3 class="font-bold text-gray-800 mb-4">\ud83d\udcca Meine Statistik <span class="text-xs font-normal text-gray-400">(aktueller Monat)</span></h3>';
            html+='<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">';
            html+='<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-vit-orange">'+myDays+'</div><div class="text-xs text-gray-500">B\u00fcro-Tage</div></div>';
            html+='<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-blue-600">'+myHours+'h</div><div class="text-xs text-gray-500">B\u00fcro-Stunden</div></div>';
            html+='<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-green-600">'+myStreak+'</div><div class="text-xs text-gray-500">Aktuelle Streak \ud83d\udd25</div></div>';
            html+='<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-purple-600">'+myMax+'</div><div class="text-xs text-gray-500">Max Streak</div></div>';
            html+='<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-pink-600">'+myGuests+'</div><div class="text-xs text-gray-500">G\u00e4ste gehostet</div></div>';
            html+='<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-indigo-600">'+myDesks+'</div><div class="text-xs text-gray-500">Versch. Pl\u00e4tze</div></div>';
            html+='</div>';

            // ── Badges ──
            var badges=eng.badges||[];
            var allBadges=[
                {key:'early_bird',icon:'\ud83d\udc26',name:'Early Bird',desc:'Vor 8:00 eingecheckt'},
                {key:'night_owl',icon:'\ud83e\udd89',name:'Nachtschicht',desc:'Nach 19:00 noch da'},
                {key:'social_butterfly',icon:'\ud83e\udd8b',name:'Socializer',desc:'5+ verschiedene Plätze'},
                {key:'streak_5',icon:'\ud83d\udd25',name:'5er Streak',desc:'5 Tage am Stück im Büro'},
                {key:'streak_10',icon:'\u2b50',name:'10er Streak',desc:'10 Tage am Stück!'},
                {key:'host_hero',icon:'\ud83c\udf1f',name:'Host Hero',desc:'3+ Gäste gehostet'}
            ];
            html+='<div class="vit-card p-5 mb-6"><h3 class="font-bold text-gray-800 mb-3">\ud83c\udfc6 Badges</h3>';
            html+='<div class="grid grid-cols-3 md:grid-cols-6 gap-3">';
            allBadges.forEach(function(b){
                var earned=badges.indexOf(b.key)!==-1;
                html+='<div class="text-center p-3 rounded-xl '+(earned?'bg-yellow-50 border border-yellow-200':'bg-gray-50 opacity-40')+'">'+
                    '<div class="text-3xl mb-1">'+b.icon+'</div>'+
                    '<div class="text-xs font-bold '+(earned?'text-gray-800':'text-gray-400')+'">'+b.name+'</div>'+
                    '<div class="text-[10px] text-gray-400">'+b.desc+'</div>'+
                '</div>';
            });
            html+='</div></div>';

            // ── Weekday Chart (last 30 days) ──
            var dayNames=['Mo','Di','Mi','Do','Fr'];
            var dayCounts=[0,0,0,0,0];
            checkins.forEach(function(c){
                var wd=new Date(c.checked_in_at).getDay();
                if(wd>=1&&wd<=5) dayCounts[wd-1]++;
            });
            var maxDay=Math.max.apply(null,dayCounts)||1;
            var weeksP=4.3;

            html+='<div class="grid md:grid-cols-2 gap-6">';
            html+='<div class="vit-card p-5"><h3 class="font-bold text-gray-800 mb-4">Anwesenheit/Wochentag <span class="text-xs font-normal text-gray-400">(30 Tage)</span></h3>';
            html+='<div class="flex gap-2" style="height:140px">';
            dayNames.forEach(function(name,i){
                var pct=Math.round(dayCounts[i]/maxDay*100);
                var avg=(dayCounts[i]/weeksP).toFixed(1);
                html+='<div class="flex flex-col items-center flex-1">'+
                    '<div class="text-xs font-semibold text-gray-600 mb-1">'+avg+'</div>'+
                    '<div class="w-full bg-gray-100 rounded-t" style="height:100px;position:relative">'+
                        '<div class="absolute bottom-0 left-1 right-1 rounded-t transition-all" style="height:'+pct+'%;background:linear-gradient(to top,#f97316,#fb923c);opacity:'+(0.6+pct/250)+'"></div>'+
                    '</div>'+
                    '<div class="text-xs font-semibold text-gray-500 mt-1">'+name+'</div>'+
                '</div>';
            });
            html+='</div></div>';

            // ── Leaderboard ──
            html+='<div class="vit-card p-5"><h3 class="font-bold text-gray-800 mb-4">\ud83c\udfc6 Leaderboard <span class="text-xs font-normal text-gray-400">(aktueller Monat)</span></h3>';
            var sorted=allEng.slice().sort(function(a,b){return (b.office_days||0)-(a.office_days||0);});
            if(!sorted.length) {
                html+='<p class="text-gray-400 text-sm">Noch keine Daten</p>';
            } else {
                var medals=['\ud83e\udd47','\ud83e\udd48','\ud83e\udd49'];
                sorted.forEach(function(e,i){
                    var u=userMap[e.user_id]||{vorname:'?',nachname:'?'};
                    var isMe=e.user_id===sbUser.id;
                    html+='<div class="flex items-center justify-between py-2 '+(isMe?'bg-orange-50 -mx-2 px-2 rounded-lg':'')+'">'+
                        '<div class="flex items-center space-x-3">'+
                            '<span class="text-lg w-6 text-center">'+(medals[i]||(i+1)+'.')+'</span>'+
                            '<div class="w-7 h-7 rounded-full bg-vit-orange text-white flex items-center justify-center text-[10px] font-bold">'+initials(u)+'</div>'+
                            '<span class="text-sm font-semibold">'+esc(shortName(u))+(isMe?' <span class="text-vit-orange text-xs">(Du)</span>':'')+'</span>'+
                        '</div>'+
                        '<div class="text-right">'+
                            '<span class="font-bold text-sm">'+(e.office_days||0)+' Tage</span>'+
                            (e.current_streak?'<span class="text-xs text-gray-400 ml-2">\ud83d\udd25'+e.current_streak+'</span>':'')+
                        '</div>'+
                    '</div>';
                });
            }
            html+='</div></div>';

            el.innerHTML=html;
        } catch(err) {
            console.error('[Office] Statistik error:',err);
            el.innerHTML='<div class="vit-card p-6 text-center text-red-500">Fehler: '+esc(err.message)+'</div>';
        }
    }

})();
