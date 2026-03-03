/**
function _sb() { return window.sb; }
 * views/office-floorplan.js — Grundriss tab with Seat Picker
 * @module views/office-floorplan
 */

// Access shared state
function _off() { return window._offState; }

async function renderGrundriss() {
    var el=document.getElementById('officeTab_grundriss');
    if(!el) return;
    var S=_off();
    el.innerHTML='<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
    try {
        await Promise.all([S.loadRooms(),S.loadDesks(),S.loadTodayCheckins(),S.loadTodayBookings(),S.loadHQUsers()]);
        if(!S.rooms||!S.rooms.length) {
            el.innerHTML='<div class="vit-card p-8 text-center text-gray-400">Keine R\u00e4ume konfiguriert</div>';
            return;
        }
        var opts=S.rooms.map(function(r,i){
            return '<option value="'+r.id+'"'+(i===0?' selected':'')+'>'+S.esc(r.name)+(r.floor_label?' ('+S.esc(r.floor_label)+')':'')+'</option>';
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
        el.innerHTML='<div class="vit-card p-6 text-center text-red-500">Fehler: '+S.esc(err.message)+'</div>';
    }
}

export { renderGrundriss };
window._offRenderGrundriss = renderGrundriss;

window._offLoadRoom = async function() {
    var S=_off();
    var area=document.getElementById('officeFloorplanArea');
    if(!area) return;
    area.innerHTML='<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';

    var roomId=document.getElementById('officeRoomSelect').value;
    var room=S.rooms.find(function(r){return String(r.id)===String(roomId);});
    if(!room){area.innerHTML='<p class="text-gray-400">Raum nicht gefunden</p>';return;}

    var roomDesks=S.desks.filter(function(d){return d.room_id===roomId || d.room===room.name;});
    var viewBox=room.svg_viewbox||'0 0 100 70';
    var imgOp=room.image_opacity||0.3;
    var bgImg=room.grundriss_url?'<image href="'+room.grundriss_url+'" x="0" y="0" width="100%" height="100%" opacity="'+imgOp+'"/>':'';

    var userMap={}; S.hqUsers.forEach(function(u){userMap[u.id]=u;});
    var checkinByDesk={}; S.todayCheckins.forEach(function(c){if(c.desk_nr) checkinByDesk[c.desk_nr]=c;});
    var bookingByDesk={}; S.todayBookings.forEach(function(b){if(b.desk_nr&&b.status==='office') bookingByDesk[b.desk_nr]=b;});

    var desksSvg=roomDesks.map(function(d){
        var cx=parseFloat(d.pct_x)||50, cy=parseFloat(d.pct_y)||50;
        var ci=checkinByDesk[d.nr], bk=bookingByDesk[d.nr];
        var isMe=(ci&&ci.user_id===sbUser.id)||(bk&&bk.user_id===sbUser.id);
        var col=ci?'#EF4444':bk?'#3B82F6':'#22C55E';
        if(isMe) col='#F97316';
        var r=isMe?3:2;
        var tooltip='Platz '+d.nr;
        if(ci){var u=userMap[ci.user_id]; tooltip+=' \u2022 '+(u?S.shortName(u):'belegt');}
        else if(bk){var u2=userMap[bk.user_id]; tooltip+=' \u2022 gebucht'+(u2?' ('+S.shortName(u2)+')':'');}
        else tooltip+=' \u2022 frei';
        var s='<g style="cursor:pointer" onclick="window._offSelectDesk('+d.nr+')">';
        s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+col+'" stroke="white" stroke-width="0.4" opacity="0.9"><title>'+S.esc(tooltip)+'</title></circle>';
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

window._offSelectDesk = function(nr) {
    var S=_off();
    S.selectedDeskNr=nr;
    var det=document.getElementById('officeDeskDetail');
    if(!det) return;
    var desk=S.desks.find(function(d){return d.nr===nr;});
    if(!desk){det.style.display='none';return;}

    var ci=S.todayCheckins.find(function(c){return c.desk_nr===nr;});
    var bk=S.todayBookings.find(function(b){return b.desk_nr===nr&&b.status==='office';});
    var userMap={}; S.hqUsers.forEach(function(u){userMap[u.id]=u;});

    var statusHtml='';
    if(ci) {
        var u=userMap[ci.user_id]||{vorname:'?',nachname:'?'};
        statusHtml='<div class="flex items-center space-x-2"><span class="w-3 h-3 rounded-full bg-red-500"></span><span class="font-semibold text-red-600">Belegt</span><span class="text-sm text-gray-500">von '+S.esc(S.fullName(u))+' seit '+S.hhmm(ci.checked_in_at)+'</span></div>';
    } else if(bk) {
        var u2=userMap[bk.user_id]||{vorname:'?',nachname:'?'};
        statusHtml='<div class="flex items-center space-x-2"><span class="w-3 h-3 rounded-full bg-blue-500"></span><span class="font-semibold text-blue-600">Gebucht</span><span class="text-sm text-gray-500">von '+S.esc(S.fullName(u2))+'</span></div>';
    } else {
        statusHtml='<div class="flex items-center space-x-2"><span class="w-3 h-3 rounded-full bg-green-500"></span><span class="font-semibold text-green-600">Frei</span></div>';
    }

    var features='';
    if(desk.has_monitor) features+='<span class="px-2 py-1 bg-gray-100 rounded text-xs">\ud83d\udda5\ufe0f Monitor</span>';
    if(desk.has_docking) features+='<span class="px-2 py-1 bg-gray-100 rounded text-xs">\ud83d\udd0c Docking</span>';
    if(desk.zone) features+='<span class="px-2 py-1 bg-gray-100 rounded text-xs">\ud83d\udccd '+S.esc(desk.zone)+'</span>';

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
                '<p class="text-sm text-gray-500">'+S.esc(desk.room)+(desk.label?' \u00b7 '+S.esc(desk.label):'')+'</p>'+
            '</div>'+
            '<button onclick="document.getElementById(\'officeDeskDetail\').style.display=\'none\'" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button>'+
        '</div>'+
        '<div class="mt-3">'+statusHtml+'</div>'+
        (features?'<div class="flex flex-wrap gap-2 mt-3">'+features+'</div>':'')+
        actions;

    det.scrollIntoView({behavior:'smooth',block:'nearest'});
};

window._offBookDesk = async function(nr) {
    var S=_off();
    try {
        var r=await _sb().from('office_bookings').upsert({
            user_id:sbUser.id, booking_date:S.todayISO(), status:'office',
            desk_nr:nr, updated_at:new Date().toISOString()
        },{onConflict:'user_id,booking_date'});
        if(r.error) throw r.error;
        S.notify('\ud83d\udcc5 Platz '+nr+' gebucht!','success');
        await S.loadTodayBookings(); window._offLoadRoom(); window._offSelectDesk(nr);
    } catch(err) {
        console.error('[Office] Book error:',err); S.notify('Fehler: '+err.message,'error');
    }
};

window._offCancelBooking = async function(bookingId) {
    var S=_off();
    try {
        var r=await _sb().from('office_bookings').delete().eq('id',bookingId);
        if(r.error) throw r.error;
        S.notify('Buchung storniert','success');
        await S.loadTodayBookings(); window._offLoadRoom();
        document.getElementById('officeDeskDetail').style.display='none';
    } catch(err) {
        console.error('[Office] Cancel error:',err); S.notify('Fehler: '+err.message,'error');
    }
};
