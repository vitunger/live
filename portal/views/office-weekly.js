/**
function _sb() { return window.sb; }
 * views/office-weekly.js — Wochenplan tab
 * @module views/office-weekly
 */

// Access shared state
function _off() { return window._offState; }

async function renderWochenplan() {
    var el=document.getElementById('officeTab_wochenplan');
    if(!el) return;
    var S=_off();
    el.innerHTML='<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
    try {
        var monday=S.getMonday(S.weekOffset);
        var days=[]; for(var i=0;i<5;i++){var d=new Date(monday);d.setDate(monday.getDate()+i);days.push(d);}
        var kw=S.getKW(monday), monISO=S.fmtISO(monday), friISO=S.fmtISO(days[4]);
        await S.loadHQUsers();
        await Promise.all([S.loadDesks(), S.loadRooms()]);
        var bkRes=await _sb().from('office_bookings').select('*').gte('booking_date',monISO).lte('booking_date',friISO);
        var bookings=bkRes.data||[];
        var bMap={}; bookings.forEach(function(b){bMap[b.user_id+'_'+b.booking_date]=b;});
        var dayLabels=['Mo','Di','Mi','Do','Fr'];

        // Day summaries
        var daySums=[]; days.forEach(function(d){
            var ds=S.fmtISO(d), ob=0,rb=0,ab=0;
            bookings.forEach(function(b){if(b.booking_date===ds){if(b.status==='office')ob++;else if(b.status==='remote')rb++;else if(b.status==='absent')ab++;}});
            daySums.push({office:ob,remote:rb,absent:ab});
        });

        var html='<div class="flex items-center justify-between mb-4">'+
            '<button onclick="window._offWeekNav(-1)" class="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold">\u2190</button>'+
            '<span class="font-bold text-gray-700">KW '+kw+' \u00b7 '+S.fmtDE(monday)+'\u2013'+S.fmtDE(days[4])+'</span>'+
            '<button onclick="window._offWeekNav(1)" class="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold">\u2192</button>'+
        '</div>';

        // Table
        html+='<div class="vit-card overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b">';
        html+='<th class="text-left p-3 font-semibold text-gray-600 min-w-[140px]">Mitarbeiter</th>';
        days.forEach(function(d,i){
            var isT=S.fmtISO(d)===S.todayISO();
            html+='<th class="text-center p-3 font-semibold '+(isT?'text-vit-orange bg-orange-50':'text-gray-600')+'">'+dayLabels[i]+'<br><span class="text-xs font-normal">'+S.fmtDE(d)+'</span></th>';
        });
        html+='</tr></thead><tbody>';

        // Sort: current user first
        var sorted=S.hqUsers.slice().sort(function(a,b){
            if(a.id===sbUser.id) return -1; if(b.id===sbUser.id) return 1;
            return (a.nachname||'').localeCompare(b.nachname||'');
        });

        sorted.forEach(function(u){
            var isMe=u.id===sbUser.id;
            html+='<tr class="border-b hover:bg-gray-50'+(isMe?' bg-orange-50/30':'')+'">';
            html+='<td class="p-3 font-medium text-sm'+(isMe?' text-vit-orange':'')+'">'+S.esc(S.shortName(u))+(isMe?' \u2b50':'')+'</td>';
            days.forEach(function(d){
                var ds=S.fmtISO(d), key=u.id+'_'+ds, b=bMap[key], st=b?b.status:'';
                var isT=ds===S.todayISO();
                if(isMe) {
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
                    if(st==='office' && S.desks && S.desks.length) {
                        html+='<select onchange="window._offSetDesk(\''+ds+'\',this.value)" class="text-[10px] border border-gray-100 rounded px-0.5 py-0.5 mt-1 w-full text-center text-gray-500 cursor-pointer">';
                        html+='<option value=""'+(myDesk?'':' selected')+'>Platz w\u00e4hlen\u2026</option>';
                        (S.rooms||[]).forEach(function(room){
                            var rd=(S.desks||[]).filter(function(dd){return (dd.room_id===room.id||dd.room===room.name) && dd.is_bookable!==false && dd.desk_type!=='parkplatz' && dd.desk_type!=='e-lade';});
                            if(!rd.length) return;
                            html+='<optgroup label="'+S.esc(room.name)+'">';
                            rd.forEach(function(dd){
                                var taken=dayBookedDesks.indexOf(dd.nr)>=0;
                                html+='<option value="'+dd.nr+'"'+(myDesk===dd.nr?' selected':'')+(taken?' disabled':'')+'>P'+dd.nr+(dd.label?' \u2013 '+S.esc(dd.label):'')+(taken?' (belegt)':'')+'</option>';
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
        var parkingDesks=(S.desks||[]).filter(function(d){return d.desk_type==='parkplatz'||d.desk_type==='e-lade';});
        if(parkingDesks.length) {
            html+='<tr class="border-b bg-blue-50/30">';
            html+='<td class="p-3 font-medium text-sm text-gray-500">\ud83c\udd7f\ufe0f Parkplatz</td>';
            days.forEach(function(d){
                var ds=S.fmtISO(d), key=sbUser.id+'_'+ds, b=bMap[key];
                var myParking=b?b.parking_nr:null;
                var isT=ds===S.todayISO();
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
                            html+='<option value="'+p.nr+'"'+(myParking===p.nr?' selected':'')+(taken?' disabled':'')+'>P'+p.nr+(p.label?' \u2013 '+S.esc(p.label):'')+(taken?' (belegt)':'')+'</option>';
                        });
                        html+='</optgroup>';
                    }
                    if(pool.length) {
                        html+='<optgroup label="\ud83c\udd7f\ufe0f Pool">';
                        pool.forEach(function(p){
                            var taken=dayBookedParking.indexOf(p.nr)>=0;
                            html+='<option value="'+p.nr+'"'+(myParking===p.nr?' selected':'')+(taken?' disabled':'')+'>P'+p.nr+(p.label?' \u2013 '+S.esc(p.label):'')+(taken?' (belegt)':'')+'</option>';
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
            var s=daySums[i], isT=S.fmtISO(d)===S.todayISO();
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
        el.innerHTML='<div class="vit-card p-6 text-center text-red-500">Fehler: '+S.esc(err.message)+'</div>';
    }
}

export { renderWochenplan };
window._offRenderWochenplan = renderWochenplan;

window._offWeekNav = function(dir) { var S=_off(); S.weekOffset+=dir; renderWochenplan(); };

window._offSetDay = async function(dateStr, status) {
    var S=_off();
    try {
        if(!status) {
            await _sb().from('office_bookings').delete().eq('user_id',sbUser.id).eq('booking_date',dateStr);
        } else {
            var r=await _sb().from('office_bookings').upsert({
                user_id:sbUser.id, booking_date:dateStr, status:status,
                desk_nr:null, updated_at:new Date().toISOString()
            },{onConflict:'user_id,booking_date'});
            if(r.error) throw r.error;
        }
        renderWochenplan();
    } catch(err) {
        console.error('[Office] SetDay error:',err);
        S.notify('Fehler: '+err.message,'error');
    }
};

window._offSetDesk = async function(dateStr, deskNr) {
    var S=_off();
    try {
        var nr=deskNr?parseInt(deskNr):null;
        var r=await _sb().from('office_bookings').update({desk_nr:nr,updated_at:new Date().toISOString()}).eq('user_id',sbUser.id).eq('booking_date',dateStr);
        if(r.error) throw r.error;
        S.notify('\u2705 P'+nr+' gebucht f\u00fcr '+dateStr,'success');
    } catch(err) {
        console.error('[Office] SetDesk error:',err);
        S.notify('Fehler: '+err.message,'error');
    }
};

window._offSetParking = async function(dateStr, parkNr) {
    var S=_off();
    try {
        var nr=parkNr?parseInt(parkNr):null;
        var r=await _sb().from('office_bookings').update({parking_nr:nr,updated_at:new Date().toISOString()}).eq('user_id',sbUser.id).eq('booking_date',dateStr);
        if(r.error) throw r.error;
        S.notify('\ud83c\udd7f\ufe0f P'+nr+' Parkplatz gebucht','success');
    } catch(err) {
        console.error('[Office] SetParking error:',err);
        S.notify('Fehler: '+err.message,'error');
    }
};
