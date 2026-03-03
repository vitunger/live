/**
function _sb() { return window.sb; }
 * views/office-checkin.js — Dashboard tab + Check-in/out + Desk Modal
 * @module views/office-checkin
 */

// Access shared state
function _off() { return window._offState; }

async function renderDashboard() {
    var el=document.getElementById('officeTab_dashboard');
    if(!el) return;
    var S=_off();
    el.innerHTML='<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
    try {
        await Promise.all([S.loadDesks(),S.loadRooms(),S.loadHQUsers(),S.loadTodayCheckins(),S.loadTodayBookings()]);
        var userMap={}; S.hqUsers.forEach(function(u){userMap[u.id]=u;});
        var bookable=S.desks.filter(function(d){return d.is_bookable!==false && d.desk_type==='standard';});
        var occ=S.todayCheckins.length, total=bookable.length;
        var pct=total>0?Math.round(occ/total*100):0;
        var myBooking=S.todayBookings.find(function(b){return b.user_id===sbUser.id && b.status==='office';});
        var now=new Date(), dateLabel=now.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
        var html='';

        // ── Check-in Status Card ──
if(S.myCheckin) {
            var desk=S.desks.find(function(d){return d.nr===S.myCheckin.desk_nr;});
            var mins=S.minutesSince(S.myCheckin.checked_in_at),h2=Math.floor(mins/60),m=mins%60;
            var isRemoteCheckin=S.myCheckin.status==='remote';
            html+=
                '<div class="vit-card p-6 mb-6 border-l-4 '+(isRemoteCheckin?'border-blue-500':'border-green-500')+'">'+
                    '<div class="flex items-center justify-between flex-wrap gap-4">'+
                        '<div>'+
                            '<p class="text-xs text-gray-400 uppercase font-semibold">'+S.esc(dateLabel)+'</p>'+
                            (isRemoteCheckin?
                                '<p class="text-2xl font-bold text-blue-600 mt-1">\ud83c\udfe0 Remote</p>'+
                                '<p class="text-sm text-gray-600 mt-1">Von zuhause oder unterwegs</p>'
                            :
                                '<p class="text-2xl font-bold text-green-600 mt-1">\u2705 Im B\u00fcro</p>'+
                                '<p class="text-sm text-gray-600 mt-1">Platz '+(S.myCheckin.desk_nr||'?')+(desk?' \u00b7 '+S.esc(desk.room):'')+(desk&&desk.has_monitor?' \u00b7 \ud83d\udda5\ufe0f Monitor':'')+'</p>'
                            )+
                            '<p class="text-xs text-gray-400 mt-1">Seit '+S.hhmm(S.myCheckin.checked_in_at)+' ('+(h2>0?h2+'h ':'')+m+' Min.)</p>'+
                        '</div>'+
                        '<button onclick="window._offCheckOut()" class="px-5 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 shadow-lg transition">Auschecken</button>'+
                    '</div>'+
                '</div>';
        } else {
            html+=
                '<div class="vit-card p-6 mb-6 border-l-4 border-gray-300">'+
                    '<div class="flex items-center justify-between flex-wrap gap-4">'+
                        '<div>'+
                            '<p class="text-xs text-gray-400 uppercase font-semibold">'+S.esc(dateLabel)+'</p>'+
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
if(S.myCheckin) {
                var m2=S.minutesSince(S.myCheckin.checked_in_at),h3=Math.floor(m2/60),mm2=m2%60;
                var isRem2=S.myCheckin.status==='remote';
                hdr.innerHTML=(isRem2?'<span class="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold mr-2">\ud83c\udfe0 Remote</span>':'')+
                    '<button onclick="window._offCheckOut()" class="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600">Auschecken <span class="text-xs opacity-75">'+(h3>0?h3+'h ':'')+mm2+'m</span></button>';
            }
        }

        // ── KPIs ──
var remoteCheckins=S.todayCheckins.filter(function(c){return c.status==='remote';}).length;
        var officeCheckins=S.todayCheckins.filter(function(c){return c.status!=='remote';}).length;
        var remoteCount=S.todayBookings.filter(function(b){return b.status==='remote';}).length;
        var absentCount=S.todayBookings.filter(function(b){return b.status==='absent';}).length;
        var bookedCount=S.todayBookings.filter(function(b){return b.status==='office';}).length;
        html+='<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">'+
'<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-green-600">'+officeCheckins+'</div><div class="text-xs text-gray-500">Im B\u00fcro</div></div>'+
            '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-blue-600">'+remoteCount+'</div><div class="text-xs text-gray-500">Remote</div></div>'+
            '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-gray-400">'+absentCount+'</div><div class="text-xs text-gray-500">Abwesend</div></div>'+
            '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-gray-700">'+total+'</div><div class="text-xs text-gray-500">Pl\u00e4tze</div></div>'+
            '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold '+(pct>80?'text-red-600':'text-vit-orange')+'">'+pct+'%</div><div class="text-xs text-gray-500">Auslastung</div></div>'+
        '</div>';

        // ── Team lists ──
var checkedInIds={}; S.todayCheckins.forEach(function(c){checkedInIds[c.user_id]=c.status||'office';});
        var teamHtml='';
var officeOnlyCheckins=S.todayCheckins.filter(function(c){return c.status!=='remote';});
        if(!officeOnlyCheckins.length) {
            teamHtml='<p class="text-gray-400 text-sm py-4">Noch niemand eingecheckt</p>';
        } else {
            officeOnlyCheckins.forEach(function(c){
                var u=userMap[c.user_id]||{vorname:'?',nachname:'?'};
                var desk2=S.desks.find(function(d){return d.nr===c.desk_nr;});
                var isMe=c.user_id===sbUser.id;
                teamHtml+='<div class="flex items-center justify-between py-2 '+(isMe?'bg-green-50 -mx-2 px-2 rounded-lg':'')+'">'+
                    '<div class="flex items-center space-x-3">'+
                        '<div class="w-8 h-8 rounded-full bg-vit-orange text-white flex items-center justify-center text-xs font-bold">'+S.initials(u)+'</div>'+
                        '<div><span class="text-sm font-semibold">'+S.esc(S.shortName(u))+(isMe?' <span class="text-green-600 text-xs">(Du)</span>':'')+'</span>'+
                        '<br><span class="text-xs text-gray-400">P'+c.desk_nr+(desk2?' \u00b7 '+S.esc(desk2.room):'')+'</span></div>'+
                    '</div>'+
                    '<span class="text-xs text-gray-400">'+S.hhmm(c.checked_in_at)+'</span>'+
                '</div>';
            });
        }
var remoteList=[], absentList=[], unknownList=[];
        S.hqUsers.forEach(function(u){
            var ciStatus=checkedInIds[u.id];
            if(ciStatus==='remote') { remoteList.push(u); return; }
            if(ciStatus&&ciStatus!=='remote') return;
            var bk=S.todayBookings.find(function(b){return b.user_id===u.id;});
            if(bk && bk.status==='absent') absentList.push(u);
            else if(bk && bk.status==='remote') remoteList.push(u);
            else unknownList.push(u);
        });

        function renderUserList(users, emptyMsg, dotClass) {
            if(!users.length) return '<p class="text-gray-400 text-sm py-4">'+emptyMsg+'</p>';
            var h4='';
            users.forEach(function(u){
                h4+='<div class="flex items-center justify-between py-1.5">'+
                    '<div class="flex items-center space-x-2">'+
                        '<span class="w-2 h-2 rounded-full '+(dotClass||'bg-gray-300')+'"></span>'+
                        '<span class="text-sm">'+S.esc(S.shortName(u))+'</span>'+
                    '</div>'+
                '</div>';
            });
            return h4;
        }

        html+='<div class="grid md:grid-cols-3 gap-6 mb-6">'+
'<div class="vit-card p-5"><h3 class="font-bold text-gray-800 mb-3">\ud83d\udfe2 Im B\u00fcro <span class="text-sm font-normal text-gray-400">('+officeOnlyCheckins.length+')</span></h3>'+teamHtml+'</div>'+
            '<div class="vit-card p-5"><h3 class="font-bold text-gray-800 mb-3">\ud83c\udfe0 Remote <span class="text-sm font-normal text-gray-400">('+remoteList.length+')</span></h3>'+renderUserList(remoteList,'Niemand remote','bg-blue-400')+'</div>'+
            '<div class="vit-card p-5"><h3 class="font-bold text-gray-800 mb-3">\u2796 Abwesend <span class="text-sm font-normal text-gray-400">('+absentList.length+')</span></h3>'+renderUserList(absentList,'Niemand abwesend','bg-gray-300')+'</div>'+
        '</div>';

        el.innerHTML=html;
    } catch(err) {
        console.error('[Office] Dashboard error:',err);
        el.innerHTML='<div class="vit-card p-6 text-center text-red-500">Fehler: '+S.esc(err.message)+'</div>';
    }
}

export { renderDashboard };
window._offRenderDashboard = renderDashboard;

// ─── CHECK-IN / CHECK-OUT ───
window._offCheckIn = async function(deskNr) {
    var S=_off();
    try {
        if(S.myCheckin) {
            S.notify('\u2705 Du bist bereits eingecheckt','info');
            return;
        }

        var myBk=(S.todayBookings||[]).find(function(b){return b.user_id===sbUser.id;});

        if(!deskNr && myBk) {
            if(myBk.status==='remote') {
                await window._offDoCheckIn(null, 'remote');
                return;
            }
            if(myBk.status==='office' && myBk.desk_nr) {
                deskNr=myBk.desk_nr;
            }
        }

        if(!deskNr) {
            await S.loadDesks();
            var occ=(S.todayCheckins||[]).map(function(c){return c.desk_nr;});
            var freeDesks=(S.desks||[]).filter(function(d){return d.is_bookable!==false&&d.desk_type==='standard'&&occ.indexOf(d.nr)===-1;});
            window._offShowDeskModal(freeDesks);
            return;
        }

        await window._offDoCheckIn(deskNr, 'office');
    } catch(err) {
        console.error('[Office] Check-in error:',err);
        S.notify('Fehler: '+err.message,'error');
    }
};

window._offShowDeskModal = function(freeDesks) {
    var S=_off();
    var old=document.getElementById('offDeskModal');if(old) old.remove();

    var opts='';
    freeDesks.forEach(function(d){
        opts+='<div onclick="window._offModalSelectDesk('+d.nr+')" style="display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid #E5E7EB;border-radius:10px;cursor:pointer;transition:.12s" '+
            'onmouseover="this.style.background=\'#FFF7ED\'" '+
            'onmouseout="this.style.background=\'white\'">'+
            '<div style="width:36px;height:36px;border-radius:50%;background:#22C55E;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px;flex-shrink:0">'+d.nr+'</div>'+
            '<div>'+
                '<p style="font-size:13px;font-weight:600;color:#374151">Platz '+d.nr+'</p>'+
                '<p style="font-size:11px;color:#9CA3AF">'+S.esc(d.room||'')+(d.has_monitor?' &middot; Monitor':'')+(d.has_docking?' &middot; Docking':'')+'</p>'+
            '</div>'+
        '</div>';
    });

    var modal=document.createElement('div');
    modal.id='offDeskModal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML=
        '<div style="background:white;border-radius:16px;padding:24px;max-width:420px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">'+
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'+
                '<h3 style="font-size:16px;font-weight:700;color:#374151">Platz wählen</h3>'+
                '<button onclick="var m=document.getElementById(\'offDeskModal\');if(m)m.remove()" style="width:28px;height:28px;border:none;background:#F3F4F6;border-radius:50%;cursor:pointer;font-size:16px;color:#6B7280">&#215;</button>'+
            '</div>'+
            '<p style="font-size:12px;color:#9CA3AF;margin-bottom:12px">Du hast heute keinen Platz gebucht. Wähle einen freien Platz zum Einchecken:</p>'+
            '<div style="display:flex;flex-direction:column;gap:8px">'+opts+'</div>'+
            (freeDesks.length===0?'<p style="color:#EF4444;text-align:center;padding:16px;font-size:13px">Keine freien Plätze verfügbar</p>':'')+
            '<button onclick="window._offDoCheckIn(null);var _m=document.getElementById(\'offDeskModal\');if(_m)_m.remove()" style="margin-top:16px;width:100%;padding:10px;background:#F3F4F6;border:none;border-radius:10px;cursor:pointer;font-size:13px;color:#6B7280">Ohne Platz einchecken</button>'+
        '</div>';
    modal.addEventListener('click',function(e){if(e.target===modal) modal.remove();});
    document.body.appendChild(modal);
};

window._offModalSelectDesk = function(deskNr) {
    var m=document.getElementById('offDeskModal'); if(m) m.remove();
    (async function(){
        var S=_off();
        S.myCheckin=null;
        await window._offDoCheckIn(deskNr, 'office');
    })();
};

window._offDoCheckIn = async function(deskNr, checkinStatus) {
    var S=_off();
    try {
        if(S.myCheckin){S.notify('\u2705 Bereits eingecheckt','info');return;}
        var finalStatus = checkinStatus || 'office';
        var r=await _sb().from('office_checkins').insert({
            user_id:sbUser.id, desk_nr:deskNr||null, status:finalStatus,
            checked_in_at:new Date().toISOString(), source:'manual'
        }).select().single();
        if(r.error){
            if(r.error.code==='23505'){
                await _sb().from('office_checkins').update({checked_out_at:new Date().toISOString()}).eq('user_id',sbUser.id).is('checked_out_at',null);
                var r2=await _sb().from('office_checkins').insert({user_id:sbUser.id,desk_nr:deskNr||null,status:'office',checked_in_at:new Date().toISOString(),source:'manual'}).select().single();
                if(r2.error) throw r2.error;
            } else throw r.error;
        }
S.notify(finalStatus==='remote'?'\ud83c\udfe0 Remote eingecheckt':'\u2705 Eingecheckt'+(deskNr?' auf Platz '+deskNr:''),'success');
        await S.loadTodayCheckins(); renderDashboard();
    } catch(err){
        console.error('[Office] CheckIn:',err);
        S.notify('Fehler: '+err.message,'error');
    }
};

window._offCheckOut = async function() {
    var S=_off();
    if(!S.myCheckin) return;
    try {
        var r=await _sb().from('office_checkins').update({checked_out_at:new Date().toISOString()}).eq('id',S.myCheckin.id);
        if(r.error) throw r.error;
        S.notify('\ud83d\udc4b Ausgecheckt!','success');
        S.myCheckin=null; await S.loadTodayCheckins(); renderDashboard();
    } catch(err) {
        console.error('[Office] Check-out error:',err);
        S.notify('Fehler: '+err.message,'error');
    }
};
