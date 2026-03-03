/**
function _sb() { return window.sb; }
 * views/office-guests.js — Gäste tab with Invite Modal + Check-in/out
 * @module views/office-guests
 */

// Access shared state
function _off() { return window._offState; }

async function renderGaeste() {
    var el=document.getElementById('officeTab_gaeste');
    if(!el) return;
    var S=_off();
    el.innerHTML='<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
    try {
        var td=S.todayISO();
        var [todayRes,futureRes]=await Promise.all([
            _sb().from('office_guests').select('*').eq('visit_date',td).order('visit_time'),
            _sb().from('office_guests').select('*').gt('visit_date',td).order('visit_date').limit(20)
        ]);
        var todayGuests=todayRes.data||[], futureGuests=futureRes.data||[];

        function badge(g) {
            if(g.status==='ausgecheckt') return '<span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Ausgecheckt</span>';
            if(g.status==='eingecheckt') return '<span class="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Eingecheckt</span>';
            return '<span class="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">Erwartet</span>';
        }

        function guestRow(g,showDate) {
            var pk=g.needs_parking?'\ud83c\udd7f\ufe0f':'';
            var dt=showDate?'<span class="text-xs text-gray-400 ml-2">'+g.visit_date+'</span>':'';
            var actions='';
            if(!g.checked_in_at) {
                actions='<button onclick="window._offGuestCheckIn(\''+g.id+'\')" class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 ml-2">Einchecken</button>';
            } else if(!g.status||g.status!=='ausgecheckt') {
                actions='<button onclick="window._offGuestCheckOut(\''+g.id+'\')" class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 ml-2">Auschecken</button>';
            }
            return '<div class="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">'+
                '<div>'+
                    '<span class="font-medium text-sm">'+S.esc(g.name)+'</span> '+pk+dt+
                    (g.company?'<br><span class="text-xs text-gray-400">'+S.esc(g.company)+'</span>':'')+
                    (g.room?'<br><span class="text-xs text-gray-400">\ud83d\udccd '+S.esc(g.room)+'</span>':'')+
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
                    '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Name *</label><input id="offGuestName" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Max Mustermann"></div>'+
                    '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Firma</label><input id="offGuestCompany" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Firma GmbH"></div>'+
                    '<div><label class="block text-sm font-semibold text-gray-600 mb-1">E-Mail</label><input id="offGuestEmail" type="email" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="max@firma.de"></div>'+
                    '<div class="grid grid-cols-3 gap-2">'+
                        '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Datum *</label><input id="offGuestDate" type="date" class="w-full border rounded-lg px-3 py-2 text-sm" value="'+S.todayISO()+'"></div>'+
                        '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Von</label><input id="offGuestTime" type="time" class="w-full border rounded-lg px-3 py-2 text-sm" value="10:00"></div>'+
                        '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Bis</label><input id="offGuestTimeEnd" type="time" class="w-full border rounded-lg px-3 py-2 text-sm" value="17:00"></div>'+
                    '</div>'+
                    '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Raum</label>'+
                        '<select id="offGuestRoom" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="">-- Kein Raum --</option>'+
                        (S.rooms||[]).map(function(r){return '<option value="'+S.esc(r.name)+'">'+S.esc(r.name)+'</option>';}).join('')+
                        '</select>'+
                    '</div>'+
                    '<div>'+
                        '<label class="block text-sm font-semibold text-gray-600 mb-2">Parkplatz</label>'+
                        '<div class="flex flex-col gap-2">'+
                            '<label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="offGuestParkType" id="offGuestParkNone" value="none" checked class="text-vit-orange"><span class="text-sm text-gray-700">Kein Parkplatz n\u00f6tig</span></label>'+
                            '<label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="offGuestParkType" id="offGuestParkStd" value="standard"><span class="text-sm text-gray-700">\ud83c\udd7f\ufe0f Standard-Parkplatz (P5\u2013P12)</span></label>'+
                            '<label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="offGuestParkType" id="offGuestParkGuest" value="guest"><span class="text-sm text-gray-700">\ud83d\ude97 G\u00e4steparkplatz (P3/P4)</span></label>'+
                            '<label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="offGuestParkType" id="offGuestParkElec" value="electric"><span class="text-sm text-gray-700">\u26a1 Elektro-Ladeplatz (P1/P2)</span></label>'+
                        '</div>'+
                    '</div>'+
                    '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Notizen</label><textarea id="offGuestNotes" rows="2" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Anlass, besondere W\u00fcnsche..."></textarea></div>'+
                '</div>'+
                '<div class="flex gap-3 mt-5">'+
                    '<button id="offGuestSaveBtn" onclick="window._offSaveGuest()" class="flex-1 px-4 py-2 bg-vit-orange text-white rounded-lg font-semibold hover:opacity-90">Einladung senden</button>'+
                    '<button onclick="document.getElementById(\'officeGuestModal\').style.display=\'none\'" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold hover:bg-gray-200">Abbrechen</button>'+
                '</div>'+
            '</div>'+
        '</div>';

        el.innerHTML=html;
    } catch(err) {
        console.error('[Office] Gaeste error:',err);
        el.innerHTML='<div class="vit-card p-6 text-center text-red-500">Fehler: '+S.esc(err.message)+'</div>';
    }
}

export { renderGaeste };
window._offRenderGaeste = renderGaeste;

window._offGuestModal = function() {
    var m=document.getElementById('officeGuestModal');
    if(m) m.style.display='flex';
};

window._offSaveGuest = async function() {
    var S=_off();
    var name=(document.getElementById('offGuestName')||{}).value;
    var company=(document.getElementById('offGuestCompany')||{}).value;
    var email=(document.getElementById('offGuestEmail')||{}).value;
    var date=(document.getElementById('offGuestDate')||{}).value;
    var time=(document.getElementById('offGuestTime')||{}).value;
    var timeEnd=(document.getElementById('offGuestTimeEnd')||{}).value;
    var room=(document.getElementById('offGuestRoom')||{}).value;
    var parkTypeEl=document.querySelector('input[name="offGuestParkType"]:checked');
    var parkType=parkTypeEl?parkTypeEl.value:'none';
    var parking=parkType!=='none';
    var notes=(document.getElementById('offGuestNotes')||{}).value;
    if(!name||!date){_showToast('Bitte Name und Datum ausfüllen!','warning');return;}
    var btn=document.getElementById('offGuestSaveBtn');
    if(btn){btn.disabled=true;btn.textContent='Wird gespeichert...';}
    try {
        var me=(S.hqUsers||[]).find(function(u){return u.id===sbUser.id;})||{vorname:'',nachname:''};

        var r=await _sb().from('office_guests').insert({
            host_user_id:sbUser.id, name:name, company:company||null,
            email:email||null, visit_date:date, visit_time:time||null,
            room:room||null, needs_parking:parking, notes:notes||null,
            status:'erwartet'
        }).select().single();
        if(r.error) throw r.error;
        var guestId=r.data.id;

        // Auto-book parking if requested
        if(parking) {
            var slots=parkType==='electric'?[1,2]:(parkType==='guest'?[3,4]:[5,6,7,8,9,10,11,12]);
            var parkLabel=parkType==='electric'?'\u26a1 Elektro':(parkType==='guest'?'\ud83d\ude97 Gast':'\ud83c\udd7f\ufe0f Standard');
            var parkRes=await _sb().from('office_bookings').select('parking_nr').eq('booking_date',date).in('parking_nr',slots);
            var takenPark=(parkRes.data||[]).map(function(b){return b.parking_nr;});
            var freePark=slots.find(function(n){return takenPark.indexOf(n)===-1;});
            if(freePark) {
                await _sb().from('office_bookings').insert({
                    user_id:sbUser.id, booking_date:date, status:'parking',
                    parking_nr:freePark,
                    time_from:time||'08:00', time_to:timeEnd||'18:00',
                    note:'Gast: '+name+(company?' ('+company+')':'')+' ('+parkLabel+')'
                });
            } else {
                S.notify('\u26a0\ufe0f Kein freier '+parkLabel+'-Platz mehr f\u00fcr dieses Datum','warning');
            }
        }

        // Send invitation email if email provided
        if(email) {
            var dateStr=new Date(date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
            try {
                var sess=await _sb().auth.getSession();
                var accessToken=(sess.data&&sess.data.session)?sess.data.session.access_token:null;
                var invokeOpts={body:{
                    template:'guest-invitation',
                    to: email,
                    data: {
                        guest_name: name,
                        host_name: (me.vorname||'')+' '+(me.nachname||''),
                        visit_date: dateStr,
                        visit_time: time||'',
                        visit_time_end: timeEnd||'',
                        room: room||'',
                        company: company||'',
                        notes: notes||'',
                        needs_parking: parking,
                        parking_type: parkType,
                        address: 'Jahnstrasse 2c, 85774 Unterfoehring'
                    }
                }};
                if(accessToken) invokeOpts.headers={'Authorization':'Bearer '+accessToken};
                await _sb().functions.invoke('send-email', invokeOpts);
                S.notify('\ud83d\udc64 Gast eingeladen & E-Mail gesendet!','success');
            } catch(mailErr) {
                console.warn('[Office] Email send failed:', mailErr);
                S.notify('\ud83d\udc64 Gast gespeichert (E-Mail-Versand fehlgeschlagen)','success');
            }
        } else {
            S.notify('\ud83d\udc64 Gast '+name+' eingeladen!','success');
        }

        var modal=document.getElementById('officeGuestModal');
        if(modal) modal.style.display='none';
        if(document.getElementById('officeTab_gaeste')&&document.getElementById('officeTab_gaeste').style.display!=='none') renderGaeste();
    } catch(err) {
        console.error('[Office] SaveGuest error:',err);
        S.notify('Fehler: '+err.message,'error');
    } finally {
        if(btn){btn.disabled=false;btn.textContent='Einladung senden';}
    }
};

window._offGuestCheckIn = async function(id) {
    var S=_off();
    try {
        var r=await _sb().from('office_guests').update({checked_in_at:new Date().toISOString(),status:'eingecheckt'}).eq('id',id);
        if(r.error) throw r.error;
        S.notify('Gast eingecheckt','success'); renderGaeste();
    } catch(err) { S.notify('Fehler: '+err.message,'error'); }
};

window._offGuestCheckOut = async function(id) {
    var S=_off();
    try {
        var r=await _sb().from('office_guests').update({status:'ausgecheckt'}).eq('id',id);
        if(r.error) throw r.error;
        S.notify('Gast ausgecheckt','success'); renderGaeste();
    } catch(err) { S.notify('Fehler: '+err.message,'error'); }
};
