/**
function _sb() { return window.sb; }
 * views/office-booking.js — Buchen tab (interactive desk booking with floorplan)
 * @module views/office-booking
 */

// Access shared state
function _off() { return window._offState; }

// ─── Local state for Buchen tab ───
var _buchDate = null;
var _buchFrom = '08:00';
var _buchTo   = '17:00';
var _buchAllDay = true;
var _buchRoomId = null;
var _buchBookings = [];
var _buchCheckins = [];
var _buchParkBookings = [];
var _buchAllBookingsForDay = [];
var _buchFavoriteDesk = null;

// Expose _buchDate for cross-module access (used by _offGuestModalForDate)
Object.defineProperty(window, '_buchDate', {
    get: function() { return _buchDate; },
    set: function(v) { _buchDate = v; },
    configurable: true
});

async function renderBuchen() {
    var el=document.getElementById('officeTab_buchen');
    if(!el) return;
    var S=_off();
    el.innerHTML='<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
    try {
        await Promise.all([S.loadRooms(),S.loadDesks(),S.loadHQUsers()]);
        if (!_buchFavoriteDesk) {
            var profRes = await _sb().from('users').select('office_favorite_desk').eq('id', sbUser.id).single();
            if (profRes.data && profRes.data.office_favorite_desk) {
                _buchFavoriteDesk = profRes.data.office_favorite_desk;
            }
        }
        if(!_buchDate) _buchDate=S.todayISO();
        _buildBuchenUI(el);
        await _buchLoadData();
        _buchRenderFloor();
        _buchRenderParking();
        _buchRenderRemote();
    } catch(err) {
        console.error('[Office] Buchen error:',err);
        el.innerHTML='<div class="vit-card p-6 text-center text-red-500">Fehler: '+S.esc(err.message)+'</div>';
    }
}

export { renderBuchen };
window._offRenderBuchen = renderBuchen;

function _buildBuchenUI(el) {
    var S=_off();
    var days=[];
    var d=new Date();
    var dayNames=['So','Mo','Di','Mi','Do','Fr','Sa'];
    for(var i=0;i<14;i++){
        var dt=new Date(d);
        dt.setDate(d.getDate()+i);
        days.push({iso:S.fmtISO(dt),day:dayNames[dt.getDay()],date:dt.getDate(),month:dt.getMonth()+1,isToday:i===0,isWeekend:dt.getDay()===0||dt.getDay()===6});
    }
    var dateStrip=days.map(function(dy){
        var active=dy.iso===_buchDate;
        var base='flex flex-col items-center px-3 py-2 rounded-xl cursor-pointer transition min-w-[52px] select-none ';
        var cls=active?base+'bg-vit-orange text-white shadow-md':(dy.isWeekend?base+'text-gray-400 hover:bg-gray-100':base+'text-gray-700 hover:bg-orange-50');
        return '<div class="'+cls+'" onclick="window._buchSelectDate(\''+dy.iso+'\')">'+
            '<span class="text-xs font-semibold">'+(dy.isToday?'Heute':dy.day)+'</span>'+
            '<span class="text-lg font-bold">'+dy.date+'</span>'+
            '<span class="text-xs opacity-70">'+(dy.isToday?'':dy.month+'.')+'</span>'+
        '</div>';
    }).join('');

    var timeRow='<div class="flex items-center gap-3 mt-4 flex-wrap">'+
        '<label class="flex items-center gap-1.5 cursor-pointer text-sm text-gray-600">'+
            '<input type="checkbox" id="buchAllDay" onchange="window._buchToggleAllDay()" '+(_buchAllDay?'checked':'')+' class="accent-vit-orange">'+
            'Ganzer Tag'+
        '</label>'+
        '<div id="buchTimeFields" class="flex items-center gap-2" style="'+(_buchAllDay?'display:none':'')+'">'+
            '<input type="time" id="buchFrom" value="'+_buchFrom+'" onchange="window._buchTimeChanged()" class="border rounded-lg px-2 py-1.5 text-sm font-semibold">'+
            '<span class="text-gray-400">&ndash;</span>'+
            '<input type="time" id="buchTo" value="'+_buchTo+'" onchange="window._buchTimeChanged()" class="border rounded-lg px-2 py-1.5 text-sm font-semibold">'+
        '</div>'+
        '<div class="flex items-center gap-3 text-xs text-gray-500 ml-auto">'+
            '<span><span class="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>Frei</span>'+
            '<span><span class="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>Gebucht</span>'+
            '<span><span class="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>Belegt</span>'+
            '<span><span class="inline-block w-3 h-3 rounded-full bg-orange-500 mr-1"></span>Deine Buchung</span>'+
        '</div>'+
    '</div>';

    el.innerHTML=
        '<div class="vit-card p-5 mb-4">'+
            '<div class="flex items-center gap-2 mb-3">'+
                '<span class="text-xl">&#128197;</span>'+
                '<h2 class="text-lg font-bold text-gray-800">Arbeitsplatz buchen</h2>'+
            '</div>'+
            '<div class="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">'+dateStrip+'</div>'+
            timeRow+
        '</div>'+
        '<div class="vit-card p-4" id="buchFloorWrap">'+
            '<div id="buchFloorplanArea" class="min-h-[350px] flex items-center justify-center">'+
                '<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div>'+
            '</div>'+
        '</div>'+
        '<div id="buchParkingArea" class="vit-card p-4 mt-4"></div>'+
        '<div id="buchRemoteArea" class="mt-4"></div>'+
        '<div id="buchDeskDetail" style="display:none" class="vit-card p-5 mt-4"></div>';
}


async function _buchLoadData() {
    var S=_off();
    var td=S.todayISO();
    var bRes=await _sb().from('office_bookings').select('id,user_id,desk_nr,parking_nr,status,time_from,time_to,note').eq('booking_date',_buchDate);
    var allBkgs=bRes.data||[];
    _buchAllBookingsForDay=allBkgs;
    _buchBookings=allBkgs.filter(function(b){return b.status==='office'&&b.desk_nr;});
    _buchParkBookings=allBkgs.filter(function(b){return b.parking_nr!=null;});
    if(_buchDate===td) {
        var cRes=await _sb().from('office_checkins').select('id,user_id,desk_nr,checked_in_at').gte('checked_in_at',td+'T00:00:00').is('checked_out_at',null);
        _buchCheckins=cRes.data||[];
    } else {
        _buchCheckins=[];
    }
}

function _buchRenderFloor() {
    var S=_off();
    var area=document.getElementById('buchFloorplanArea');
    if(!area) return;

    var userMap={}; (S.hqUsers||[]).forEach(function(u){userMap[u.id]=u;});
    var bookByDesk={}; _buchBookings.forEach(function(b){if(b.desk_nr) bookByDesk[b.desk_nr]=b;});
    var checkinByDesk={}; _buchCheckins.forEach(function(c){if(c.desk_nr) checkinByDesk[c.desk_nr]=c;});

    var allDesks=(S.desks||[]).filter(function(d){return d.active!==false;});
    var myBookCount=_buchBookings.filter(function(b){return b.user_id===sbUser.id;}).length;
    var totalBooked=_buchBookings.length;
    var totalFree=allDesks.filter(function(d){return !bookByDesk[d.nr]&&!checkinByDesk[d.nr]&&d.is_bookable!==false&&d.desk_type==='standard';}).length;
    var dateLabel=_buchDate===S.todayISO()?'Heute':new Date(_buchDate+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});

    var statsBar=
        '<div class="flex items-center justify-between mb-3 flex-wrap gap-2">'+
            '<p class="text-xs text-gray-400">'+dateLabel+' &middot; '+(_buchAllDay?'Ganzer Tag':_buchFrom+' &ndash; '+_buchTo)+'</p>'+
            '<div class="flex gap-4 text-xs text-gray-500">'+
                '<span><span class="inline-block w-2.5 h-2.5 rounded-full bg-green-500 mr-1"></span>'+totalFree+' frei</span>'+
                '<span><span class="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 mr-1"></span>'+totalBooked+' gebucht</span>'+
                (myBookCount?'<span class="font-semibold text-orange-500">&#10003; Du hast gebucht</span>':'')+
                (_buchFavoriteDesk&&!myBookCount?'<span class="text-green-600 text-xs">\u2665 Platz '+_buchFavoriteDesk+' ist dein Lieblingsplatz</span>':'')+
            '</div>'+
        '</div>';

    var allDesksSorted = allDesks.slice().sort(function(a,b){ return (b.nr===_buchFavoriteDesk?1:0)-(a.nr===_buchFavoriteDesk?1:0); });
    var dotsHtml=allDesksSorted.map(function(d){
        var px=parseFloat(d.pct_x)||50, py=parseFloat(d.pct_y)||50;
        var bk=bookByDesk[d.nr];
        var ci=checkinByDesk[d.nr];
        var isMyBooking=bk&&bk.user_id===sbUser.id;
        var isBusy=!!ci;
        var isFree=!bk&&!ci;
        var bookable=isFree&&d.is_bookable!==false&&d.desk_type==='standard';
        var isFavorite=d.nr===_buchFavoriteDesk;
        var col=isBusy?'#EF4444':(isMyBooking?'#F97316':(bk?'#3B82F6':(isFavorite&&!bk?'#16A34A':'#22C55E')));
        var sz=isMyBooking?30:(isFavorite&&!bk&&!isMyBooking?28:24);
        var ring=isMyBooking?'box-shadow:0 0 0 3px rgba(249,115,22,.4),0 2px 8px rgba(0,0,0,.3)':(isFavorite&&!bk?'box-shadow:0 0 0 3px rgba(22,163,74,.4),0 2px 8px rgba(0,0,0,.2)':'box-shadow:0 2px 6px rgba(0,0,0,.25)');
        var lbl='';
        if(ci){var u=userMap[ci.user_id];lbl=u?(u.vorname||'?')[0].toUpperCase()+(u.nachname||'?')[0].toUpperCase():'&#9679;';}
        else if(isMyBooking){lbl='Du';}
        else if(bk){var u2=userMap[bk.user_id];lbl=u2?(u2.vorname||'?')[0].toUpperCase():'B';}
        else if(d.nr===_buchFavoriteDesk){lbl='\u2665';}
        else{lbl=String(d.nr);}
        var tip='Platz '+d.nr;
        if(ci){var uu=userMap[ci.user_id];tip+=' \u2013 '+(uu?uu.vorname+' '+uu.nachname:'belegt');}
        else if(isMyBooking){tip+=' \u2013 Deine Buchung';}
        else if(bk){var uu2=userMap[bk.user_id];tip+=' \u2013 gebucht'+(uu2?' ('+uu2.vorname+')':'');}
        else{tip+=' \u2013 frei';}
        return '<div title="'+S.esc(tip)+'" onclick="window._buchSelectDesk('+d.nr+')"'+
            ' style="position:absolute;left:'+px+'%;top:'+py+'%;transform:translate(-50%,-50%);'+
            'width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+col+';'+
            'border:'+(isMyBooking?'3':'2')+'px solid white;'+ring+';'+
            'cursor:'+(bookable?'pointer':'default')+';z-index:10;display:flex;align-items:center;justify-content:center;'+
            'font-size:'+(sz<=24?'8':'10')+'px;color:white;font-weight:700;user-select:none;'+
            'transition:transform .12s ease;" '+
            'onmouseenter="this.style.transform=\'translate(-50%,-50%) scale(1.2)\'" '+
            'onmouseleave="this.style.transform=\'translate(-50%,-50%) scale(1)\'">'+
            lbl+
        '</div>';
    }).join('');

    area.innerHTML=statsBar+
        '<div style="overflow-x:auto;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;" id="buchFloorImgWrap">'+
            '<div style="position:relative;min-width:700px;display:inline-block;width:100%">'+
            '<img src="grundriss_og.png" id="buchFloorImg" '+
                'style="width:100%;display:block;border-radius:12px;" '+
                'onerror="this.style.opacity=\'0.2\'" />'+
            dotsHtml+
            '</div>'+
        '</div>'+
        '<p class="text-xs text-gray-400 mt-2 text-center">'+allDesks.length+' Pl\u00e4tze &middot; Klick auf einen freien Platz zum Buchen</p>';
}


function _buchRenderRemote() {
    var S=_off();
    var area = document.getElementById('buchRemoteArea');
    if (!area) return;

    var myDesk = _buchBookings.find(function(b){return b.user_id===sbUser.id;});
    var myRemote = (_buchAllBookingsForDay||[]).find(function(b){return b.user_id===sbUser.id&&b.status==='remote';});

    var remoteBooked = !!myRemote;
    var deskBooked = !!myDesk;
    var isToday = _buchDate === S.todayISO();

    var h = '<div class="vit-card p-5">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">';

    h += '<div style="display:flex;align-items:center;gap:14px">';
    h += '<div style="width:48px;height:48px;border-radius:12px;background:'+(remoteBooked?'#F97316':'#F3F4F6')+';display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">\ud83c\udfe0</div>';
    h += '<div>';
    h += '<p style="font-size:15px;font-weight:700;color:#374151">Remote arbeiten</p>';
    h += '<p style="font-size:12px;color:#9CA3AF">Kein B\u00fcrobesuch \u2013 von zuhause oder unterwegs</p>';
    h += '</div></div>';

    if (remoteBooked) {
        h += '<div style="display:flex;align-items:center;gap:10px">';
        h += '<span style="font-size:12px;font-weight:600;color:#F97316;background:#FFF7ED;padding:6px 14px;border-radius:20px">\u2713 Als Remote gebucht</span>';
        h += '<button data-rid="'+myRemote.id+'" onclick="window._buchCancelRemote(this.dataset.rid)" style="font-size:12px;color:#EF4444;background:none;border:none;cursor:pointer;padding:4px 8px">Stornieren</button>';
        h += '</div>';
    } else if (deskBooked) {
        h += '<span style="font-size:12px;color:#9CA3AF;font-style:italic">Du hast bereits einen Desk gebucht</span>';
    } else {
        h += '<button onclick="window._buchBookRemote()" style="padding:10px 24px;background:#374151;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer">\ud83c\udfe0 Remote buchen</button>';
    }

    h += '</div>';

    h += '<div style="border-top:1px solid #F3F4F6;margin-top:14px;padding-top:14px;display:flex;align-items:center;justify-content:space-between">';
    h += '<div style="display:flex;align-items:center;gap:12px">';
    h += '<div style="width:40px;height:40px;border-radius:10px;background:#F3F4F6;display:flex;align-items:center;justify-content:center;font-size:20px">\ud83d\udc64</div>';
    h += '<div><p style="font-size:14px;font-weight:600;color:#374151">Gast einladen</p><p style="font-size:12px;color:#9CA3AF">Externer Besucher \u2013 Einladung per E-Mail</p></div>';
    h += '</div>';
    h += '<button onclick="window._offGuestModalForDate(window._buchDate)" style="padding:8px 20px;background:#F97316;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer">+ Gast einladen</button>';
    h += '</div>';

    h += '</div>';
    area.innerHTML = h;
}

window._buchBookRemote = async function() {
    var S=_off();
    try {
        var timeFrom = _buchAllDay ? null : _buchFrom;
        var timeTo   = _buchAllDay ? null : _buchTo;
        var r = await _sb().from('office_bookings').insert({
            user_id: sbUser.id,
            booking_date: _buchDate,
            status: 'remote',
            time_from: timeFrom||'08:00',
            time_to: timeTo||'17:00'
        }).select().single();
        if (r.error) throw r.error;
        if (!_buchAllBookingsForDay) _buchAllBookingsForDay = [];
        _buchAllBookingsForDay.push(r.data);
        S.notify('\ud83c\udfe0 Remote gebucht f\u00fcr '+_buchDate,'success');
        _buchRenderRemote();
    } catch(err) {
        console.error('[Office] BookRemote:', err);
        S.notify('Fehler: '+err.message,'error');
    }
};

window._buchCancelRemote = async function(id) {
    var S=_off();
    if (!confirm('Remote-Buchung stornieren?')) return;
    try {
        var r = await _sb().from('office_bookings').delete().eq('id', id);
        if (r.error) throw r.error;
        if (_buchAllBookingsForDay) _buchAllBookingsForDay = _buchAllBookingsForDay.filter(function(b){return b.id!==id;});
        S.notify('Remote-Buchung storniert','success');
        _buchRenderRemote();
    } catch(err) { S.notify('Fehler: '+err.message,'error'); }
};

window._offGuestModalForDate = function(date) {
    var existing = document.getElementById('officeGuestModal');
    if (existing) {
        existing.style.display = 'flex';
        var dateInput = document.getElementById('offGuestDate');
        if (dateInput && date) dateInput.value = date;
        return;
    }
    showOfficeTab('gaeste');
    setTimeout(function(){
        window._offGuestModal();
        var di = document.getElementById('offGuestDate');
        if (di && date) di.value = date;
    }, 300);
};


window._buchSetFavorite = async function(nr) {
    var S=_off();
    try {
        var r = await _sb().from('users').update({office_favorite_desk: nr===_buchFavoriteDesk ? null : nr}).eq('id', sbUser.id);
        if (r.error) throw r.error;
        _buchFavoriteDesk = nr===_buchFavoriteDesk ? null : nr;
        S.notify(_buchFavoriteDesk ? '\u2665 Platz '+nr+' als Lieblingsplatz gesetzt' : '\u2661 Lieblingsplatz entfernt', 'success');
        _buchRenderFloor();
        window._buchSelectDesk(nr);
    } catch(err) { S.notify('Fehler: '+err.message,'error'); }
};

window._buchSelectDate = function(iso) {
    var S=_off();
    _buchDate=iso; window._buchDate=iso;
    var el=document.getElementById('officeTab_buchen');
    if(!el) return;
    _buildBuchenUI(el);
    _buchLoadData().then(function(){_buchRenderFloor();_buchRenderParking();_buchRenderRemote();});
};

window._buchToggleAllDay = function() {
    _buchAllDay=document.getElementById('buchAllDay').checked;
    var tf=document.getElementById('buchTimeFields');
    if(tf) tf.style.display=_buchAllDay?'none':'flex';
};

window._buchTimeChanged = function() {
    _buchFrom=(document.getElementById('buchFrom')||{}).value||'08:00';
    _buchTo=(document.getElementById('buchTo')||{}).value||'17:00';
};

window._buchRoomChanged = function() {
    var sel=document.getElementById('buchRoomSelect');
    if(sel) _buchRoomId=sel.value;
    _buchRenderFloor();
    var det=document.getElementById('buchDeskDetail'); if(det) det.style.display='none';
};

window._buchSelectDesk = function(nr) {
    var S=_off();
    var det=document.getElementById('buchDeskDetail');
    if(!det) return;
    var desk=(S.desks||[]).find(function(d){return d.nr===nr;});
    if(!desk){det.style.display='none';return;}

    var bk=_buchBookings.find(function(b){return b.desk_nr===nr;});
    var ci=_buchCheckins.find(function(c){return c.desk_nr===nr;});
    var userMap={}; (S.hqUsers||[]).forEach(function(u){userMap[u.id]=u;});

    var isMyBooking=bk&&bk.user_id===sbUser.id;
    var isFree=!bk&&!ci;
    var isToday=_buchDate===S.todayISO();

    var statusHtml='';
    if(ci){
        var u=userMap[ci.user_id]||{vorname:'?',nachname:'?'};
        statusHtml='<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></span><span class="font-semibold text-red-600">Eingecheckt</span><span class="text-sm text-gray-500">von '+S.esc(S.fullName(u))+'</span></div>';
    } else if(isMyBooking) {
        var tf=bk.time_from?bk.time_from.substring(0,5):null;
        var tt=bk.time_to?bk.time_to.substring(0,5):null;
        statusHtml='<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0"></span><span class="font-semibold text-orange-600">\u2713 Deine Buchung</span>'+(tf&&tt?'<span class="text-sm text-gray-500">'+tf+' \u2013 '+tt+'</span>':'<span class="text-sm text-gray-500">Ganzer Tag</span>')+'</div>';
    } else if(bk) {
        var u2=userMap[bk.user_id]||{vorname:'?',nachname:'?'};
        statusHtml='<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0"></span><span class="font-semibold text-blue-600">Gebucht</span><span class="text-sm text-gray-500">'+S.esc(S.fullName(u2))+'</span></div>';
    } else {
        statusHtml='<div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-green-500 flex-shrink-0"></span><span class="font-semibold text-green-600">Frei</span></div>';
    }

    var features='';
    if(desk.has_monitor) features+='<span class="px-2 py-1 bg-gray-100 rounded-lg text-xs">\ud83d\udda5\ufe0f Monitor</span>';
    if(desk.has_docking) features+='<span class="px-2 py-1 bg-gray-100 rounded-lg text-xs">\ud83d\udd0c Docking</span>';
    if(desk.zone) features+='<span class="px-2 py-1 bg-gray-100 rounded-lg text-xs">\ud83d\udccd '+S.esc(desk.zone)+'</span>';

    var actions='';
    if(isFree && desk.is_bookable!==false && desk.desk_type==='standard') {
        actions='<div class="flex gap-2 mt-4 flex-wrap">'+
            '<button onclick="window._buchBook('+nr+')" class="px-5 py-2.5 bg-vit-orange text-white rounded-xl text-sm font-bold hover:opacity-90 shadow-sm transition">\ud83d\udcc5 Buchen</button>'+
            (isToday?'<button onclick="window._offCheckIn('+nr+')" class="px-5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:opacity-90 shadow-sm transition">\u2705 Direkt einchecken</button>':'')+
        '</div>';
    } else if(isMyBooking) {
        actions='<div class="flex gap-2 mt-4 flex-wrap">'+
            (isToday?'<button onclick="window._offCheckIn('+nr+')" class="px-5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:opacity-90 shadow-sm transition">\u2705 Einchecken</button>':'')+
            '<button onclick="window._buchCancel(\''+bk.id+'\')" class="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-red-50 hover:text-red-600 transition">Stornieren</button>'+
        '</div>';
    }

    det.style.display='block';
    det.innerHTML=
        '<div class="flex items-start justify-between">'+
            '<div>'+
                '<div class="flex items-center gap-3">'+
                    '<span class="text-2xl font-black text-gray-800">Platz '+nr+'</span>'+
                    '<span class="text-sm text-gray-400">'+S.esc(desk.room||'')+' \u00b7 '+S.esc(desk.label||'')+'</span>'+
                '</div>'+
            '</div>'+
            '<button onclick="document.getElementById(\'buchDeskDetail\').style.display=\'none\'" class="text-gray-300 hover:text-gray-600 text-2xl leading-none">\u00d7</button>'+
        '</div>'+
        '<div class="mt-3">'+statusHtml+'</div>'+
        (features?'<div class="flex flex-wrap gap-2 mt-3">'+features+'</div>':'')+
        actions;

    det.scrollIntoView({behavior:'smooth',block:'nearest'});
};

window._buchBook = async function(deskNr) {
    var S=_off();
    try {
        var tf=_buchAllDay?null:_buchFrom+':00';
        var tt=_buchAllDay?null:_buchTo+':00';
        var existing=_buchBookings.find(function(b){return b.user_id===sbUser.id;});
        if(existing&&existing.desk_nr!==deskNr){
            S.notify('Du hast bereits Platz '+existing.desk_nr+' gebucht. Erst stornieren?','info');
            return;
        }
        var payload={user_id:sbUser.id,booking_date:_buchDate,status:'office',desk_nr:deskNr,time_from:tf,time_to:tt,updated_at:new Date().toISOString()};
        var r=await _sb().from('office_bookings').upsert(payload,{onConflict:'user_id,booking_date'});
        if(r.error) throw r.error;
        S.notify('\u2705 Platz '+deskNr+' gebucht f\u00fcr '+_buchDate+(tf?' ('+_buchFrom+' \u2013 '+_buchTo+')':'')+'!','success');
        await _buchLoadData();
        _buchRenderFloor();
        window._buchSelectDesk(deskNr);
    } catch(err) {
        console.error('[Office] Buchung error:',err);
        S.notify('Fehler: '+err.message,'error');
    }
};

window._buchCancel = async function(bookingId) {
    var S=_off();
    try {
        var r=await _sb().from('office_bookings').delete().eq('id',bookingId);
        if(r.error) throw r.error;
        S.notify('Buchung storniert','success');
        await _buchLoadData();
        _buchRenderFloor();
        var det=document.getElementById('buchDeskDetail'); if(det) det.style.display='none';
    } catch(err) {
        console.error('[Office] Cancel error:',err);
        S.notify('Fehler: '+err.message,'error');
    }
};

// ═══════════════════════════════════════════════════════
// PARKPLATZ-BUCHUNG im Buchen-Tab
// P1+P2 = Elektro, P3+P4 = Gäste, P5-P12 = Standard
// ═══════════════════════════════════════════════════════
function _buchRenderParking() {
    var S=_off();
    var area=document.getElementById('buchParkingArea');
    if(!area) return;

    var userMap={}; (S.hqUsers||[]).forEach(function(u){userMap[u.id]=u;});
    var myParkBk=_buchParkBookings.find(function(b){return b.user_id===sbUser.id;});
    var myParkNr=myParkBk?myParkBk.parking_nr:null;
    var parkMap={};
    _buchParkBookings.forEach(function(b){if(b.parking_nr) parkMap[b.parking_nr]=b;});

    var dateLabel=_buchDate===S.todayISO()?'Heute':new Date(_buchDate+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'numeric',month:'short'});
    var total=_buchParkBookings.length;

    function namedSlot(nr, icon, shortLabel) {
        var bk=parkMap[nr];
        var isMe=myParkNr===nr;
        var isTaken=!!bk&&!isMe;
        var u=bk?userMap[bk.user_id]:null;
        var ini=u?((u.vorname||'')[0]+(u.nachname||'')[0]).toUpperCase():'?';
        var wrapBase='display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;border-radius:12px;border:2px solid;min-width:70px;transition:.12s;';
        if(isMe) {
            return '<div data-parkid="'+myParkBk.id+'" onclick="_buchCancelParking(this.dataset.parkid)" title="Klick zum Stornieren" style="'+wrapBase+'border-color:#FB923C;background:#FFF7ED;cursor:pointer;box-shadow:0 0 0 3px rgba(251,146,60,.25)">'+
                '<span style="font-size:20px">'+icon+'</span>'+
                '<span style="font-size:10px;font-weight:700;color:#EA580C;margin-top:3px">P'+nr+'</span>'+
                '<span style="font-size:10px;color:#F97316;font-weight:600">Du \u2713</span>'+
                '<span style="font-size:8px;color:#9CA3AF;margin-top:1px">stornieren</span>'+
            '</div>';
        } else if(isTaken) {
            return '<div title="Belegt:'+(u?u.vorname+' '+u.nachname:'jemand')+'" style="'+wrapBase+'border-color:#E5E7EB;background:#F9FAFB;opacity:.55">'+
                '<span style="font-size:20px">'+icon+'</span>'+
                '<span style="font-size:10px;font-weight:700;color:#6B7280;margin-top:3px">P'+nr+'</span>'+
                '<span style="width:22px;height:22px;border-radius:50%;background:#9CA3AF;display:flex;align-items:center;justify-content:center;color:white;font-size:8px;font-weight:700;margin-top:2px">'+ini+'</span>'+
            '</div>';
        } else {
            var canBook=!myParkNr;
            return '<div '+(canBook?'onclick="_buchBookParking('+nr+')" title="P'+nr+' '+shortLabel+' buchen"':'title="P'+nr+' '+shortLabel+'"')+' style="'+wrapBase+'border-color:'+(icon==='\u26a1'?'#FDE68A':'#BFDBFE')+';background:'+(icon==='\u26a1'?'#FFFBEB':'#EFF6FF')+';cursor:'+(canBook?'pointer':'default')+'">'+
                '<span style="font-size:20px">'+icon+'</span>'+
                '<span style="font-size:10px;font-weight:700;color:#374151;margin-top:3px">P'+nr+'</span>'+
                '<span style="font-size:9px;color:#16A34A;font-weight:600">frei</span>'+
            '</div>';
        }
    }

    function standardBlock() {
        var takenNrs=_buchParkBookings.map(function(b){return b.parking_nr;});
        var freeCount=0;
        for(var i=5;i<=12;i++){if(takenNrs.indexOf(i)<0) freeCount++;}
        var isMyStd=myParkNr!=null&&myParkNr>=5&&myParkNr<=12;
        var wrapBase='display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;border-radius:12px;border:2px solid;min-width:110px;transition:.12s;';
        if(isMyStd) {
            return '<div data-parkid="'+myParkBk.id+'" onclick="_buchCancelParking(this.dataset.parkid)" title="Klick zum Stornieren" style="'+wrapBase+'border-color:#FB923C;background:#FFF7ED;cursor:pointer;box-shadow:0 0 0 3px rgba(251,146,60,.25)">'+
                '<span style="font-size:26px">\ud83c\udd7f\ufe0f</span>'+
                '<span style="font-size:12px;font-weight:700;color:#EA580C;margin-top:4px">Standard</span>'+
                '<span style="font-size:10px;color:#F97316;font-weight:600">Gebucht \u2713</span>'+
                '<span style="font-size:8px;color:#9CA3AF;margin-top:2px">klicken zum Stornieren</span>'+
            '</div>';
        }
        var canBook=freeCount>0&&!myParkNr;
        return '<div '+(canBook?'onclick="_buchBookParking(0)" title="Parkplatz buchen"':'')+' style="'+wrapBase+'border-color:'+(canBook?'#BBF7D0':'#E5E7EB')+';background:'+(canBook?'#F0FDF4':'#F9FAFB')+';cursor:'+(canBook?'pointer':'default')+'">'+
            '<span style="font-size:26px">\ud83c\udd7f\ufe0f</span>'+
            '<span style="font-size:12px;font-weight:700;color:#374151;margin-top:4px">Standard</span>'+
            '<span style="font-size:10px;color:'+(freeCount>0?'#16A34A':'#EF4444')+';font-weight:600">'+freeCount+' frei &bull; '+(8-freeCount)+' belegt</span>'+
            (canBook?'<span style="font-size:8px;color:#6B7280;margin-top:2px">klicken zum Buchen</span>':'')+
        '</div>';
    }

    area.innerHTML=
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">'+
            '<div style="display:flex;align-items:center;gap:8px">'+
                '<span style="font-size:18px">\ud83c\udd7f\ufe0f</span>'+
                '<span style="font-weight:700;color:#1F2937;font-size:14px">Parkplatz</span>'+
                '<span style="font-size:11px;color:#9CA3AF">'+dateLabel+'</span>'+
            '</div>'+
            (myParkNr?
                '<span style="font-size:11px;color:#EA580C;font-weight:600;background:#FFF7ED;padding:3px 10px;border-radius:20px">\u2713 P'+myParkNr+' gebucht \u00b7 Klick zum Stornieren</span>':
                '<span style="font-size:11px;color:#9CA3AF">'+total+' von 12 belegt</span>'
            )+
        '</div>'+
        '<div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:4px">'+
            namedSlot(1,'\u26a1','Elektro')+
            namedSlot(2,'\u26a1','Elektro')+
            namedSlot(3,'\ud83d\ude97','Gast')+
            namedSlot(4,'\ud83d\ude97','Gast')+
            standardBlock()+
        '</div>'+
        (total>=12?'<p style="font-size:11px;color:#EF4444;text-align:center;margin-top:8px">Alle Parkpl\u00e4tze belegt</p>':'');
}

window._buchBookParking = function(nr) {
    var S=_off();
    (async function(){
        try {
            var assignNr=nr;
            if(nr===0){
                var taken=_buchParkBookings.map(function(b){return b.parking_nr;});
                for(var i=5;i<=12;i++){if(taken.indexOf(i)<0){assignNr=i;break;}}
                if(!assignNr){S.notify('Keine Standard-Parkpl\u00e4tze frei','info');return;}
            }
            if(_buchParkBookings.find(function(b){return b.parking_nr===assignNr;})){S.notify('Dieser Platz ist bereits belegt','info');return;}
            if(_buchParkBookings.find(function(b){return b.user_id===sbUser.id;})){S.notify('Du hast bereits einen Parkplatz gebucht','info');return;}
            var deskBk=_buchBookings.find(function(b){return b.user_id===sbUser.id;});
            var res;
            if(deskBk){
                res=await _sb().from('office_bookings').update({parking_nr:assignNr,updated_at:new Date().toISOString()}).eq('id',deskBk.id);
            } else {
                res=await _sb().from('office_bookings').insert({user_id:sbUser.id,booking_date:_buchDate,status:'parking',parking_nr:assignNr,updated_at:new Date().toISOString()});
            }
            if(res.error) throw res.error;
            var lbl=assignNr<=2?'\u26a1 P'+assignNr+' Elektro':assignNr<=4?'\ud83d\ude97 P'+assignNr+' Gast':'\ud83c\udd7f\ufe0f Parkplatz P'+assignNr;
            S.notify(lbl+' gebucht!','success');
            await _buchLoadData();
            _buchRenderParking();
        } catch(e){console.error('[Office] BookParking:',e);S.notify('Fehler: '+e.message,'error');}
    })();
};

window._buchCancelParking = function(bookingId) {
    var S=_off();
    (async function(){
        try {
            var bk=_buchParkBookings.find(function(b){return b.id===bookingId;});
            if(!bk) return;
            var res;
            if(bk.desk_nr){
                res=await _sb().from('office_bookings').update({parking_nr:null,updated_at:new Date().toISOString()}).eq('id',bookingId);
            } else {
                res=await _sb().from('office_bookings').delete().eq('id',bookingId);
            }
            if(res.error) throw res.error;
            S.notify('Parkplatz-Buchung storniert','success');
            await _buchLoadData();
            _buchRenderParking();
        } catch(e){console.error('[Office] CancelParking:',e);S.notify('Fehler: '+e.message,'error');}
    })();
};
