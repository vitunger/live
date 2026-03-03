/**
 * views/office-whoishere.js — "Wer ist im Office?" tab
 * @module views/office-whoishere
 */

// Access shared state
function _off() { return window._offState; }

// ─── Local state ───
var _wioDate = null;
var _wioSearch = '';
var _wioBookings = [];
var _wioParkBookings = [];
var _wioCheckins = [];

async function renderWerImOffice() {
    var el = document.getElementById('officeTab_werImOffice');
    if (!el) return;
    var S=_off();
    el.innerHTML = '<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
    try {
        if (!_wioDate) _wioDate = S.todayISO();
        await Promise.all([S.loadDesks(), S.loadHQUsers()]);
        await _wioLoad();
        _wioBuildUI(el);
    } catch(err) {
        console.error('[WerImOffice]', err);
        el.innerHTML = '<div class="vit-card p-6 text-red-500">Fehler: '+S.esc(err.message)+'</div>';
    }
}

export { renderWerImOffice };
window._offRenderWerImOffice = renderWerImOffice;

async function _wioLoad() {
    var S=_off();
    var td = S.todayISO();
    var bRes = await sb.from('office_bookings')
        .select('id,user_id,desk_nr,parking_nr,status,time_from,time_to,note')
        .eq('booking_date', _wioDate)
        .or('status.eq.office,status.eq.parking');
    var allBkgs = bRes.data || [];
    _wioBookings = allBkgs.filter(function(b){ return b.desk_nr; });
    _wioParkBookings = allBkgs.filter(function(b){ return b.parking_nr; });

    if (_wioDate === td) {
        var cRes = await sb.from('office_checkins')
            .select('id,user_id,desk_nr,checked_in_at')
            .gte('checked_in_at', td+'T00:00:00')
            .is('checked_out_at', null);
        _wioCheckins = cRes.data || [];
    } else {
        _wioCheckins = [];
    }
}

function _wioBuildUI(el) {
    var S=_off();
    var userMap = {};
    (S.hqUsers||[]).forEach(function(u){ userMap[u.id] = u; });

    var userDataMap = {};

    _wioBookings.forEach(function(b) {
        if (!userDataMap[b.user_id]) userDataMap[b.user_id] = {bookings:[], checkins:[], deskNr:null};
        userDataMap[b.user_id].bookings.push(b);
        if (!userDataMap[b.user_id].deskNr) userDataMap[b.user_id].deskNr = b.desk_nr;
    });
    _wioParkBookings.forEach(function(b) {
        if (!userDataMap[b.user_id]) userDataMap[b.user_id] = {bookings:[], checkins:[], deskNr:null};
    });
_wioCheckins.forEach(function(c) {
        if (!userDataMap[c.user_id]) userDataMap[c.user_id] = {bookings:[], checkins:[], deskNr:null, isRemote:false};
        userDataMap[c.user_id].checkins.push(c);
        if(c.status==='remote') userDataMap[c.user_id].isRemote=true;
        if (!userDataMap[c.user_id].deskNr) userDataMap[c.user_id].deskNr = c.desk_nr;
    });

    var entries = Object.keys(userDataMap).map(function(uid) {
        return {uid: uid, user: userMap[uid], data: userDataMap[uid]};
    }).filter(function(e) { return !!e.user; });

    var search = (_wioSearch||'').toLowerCase().trim();
    if (search) {
        entries = entries.filter(function(e) {
            var n = ((e.user.vorname||'')+' '+(e.user.nachname||'')).toLowerCase();
            return n.indexOf(search) >= 0;
        });
    }
    entries.sort(function(a,b) {
        return ((a.user.nachname||'')+(a.user.vorname||'')).localeCompare((b.user.nachname||'')+(b.user.vorname||''));
    });

    var isToday = _wioDate === S.todayISO();
    var dateLabel = isToday ? 'Heute, '+new Date().toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) :
        new Date(_wioDate+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});

    // ── Sidebar ──
    var sidebar = '';

    sidebar += '<div style="display:flex;align-items:center;gap:8px;border:1px solid #E5E7EB;border-radius:10px;padding:10px 14px;margin-bottom:12px;cursor:pointer;background:white" onclick="window._wioOpenDatePicker()">'+
        '<span style="font-size:16px">\ud83d\udcc5</span>'+
        '<span style="font-size:13px;font-weight:600;color:#374151">'+S.esc(isToday ? 'Mo., '+new Date(_wioDate+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : new Date(_wioDate+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}))+'</span>'+
        '<input type="date" id="wioDateInput" value="'+_wioDate+'" onchange="window._wioChangeDate(this.value)" style="position:absolute;opacity:0;width:1px;height:1px">'+
    '</div>';

    sidebar += '<div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #E5E7EB;border-radius:10px;padding:10px 14px;margin-bottom:8px;background:white">'+
        '<span style="font-size:13px;color:#374151">HQ Unterf\u00f6hring</span>'+
        '<span style="color:#9CA3AF;font-size:14px">&#8964;</span>'+
    '</div>';

    sidebar += '<div style="display:flex;align-items:center;justify-content:space-between;border:1px solid #E5E7EB;border-radius:10px;padding:10px 14px;margin-bottom:12px;background:white">'+
        '<span style="font-size:13px;color:#374151">1. OG \u2013 B\u00fcro Unterf\u00f6hring</span>'+
        '<span style="color:#9CA3AF;font-size:14px">&#8964;</span>'+
    '</div>';

    sidebar += '<div style="position:relative;margin-bottom:10px">'+
        '<input type="text" id="wioSearch" placeholder="Suche nach Personen" value="'+S.esc(_wioSearch)+'" '+
        'oninput="window._wioSearchChange(this.value)" '+
        'style="width:100%;box-sizing:border-box;border:1px solid #E5E7EB;border-radius:10px;padding:10px 14px;font-size:13px;outline:none;background:white">'+
    '</div>';

    sidebar += '<p style="font-size:11px;color:#9CA3AF;margin-bottom:8px">'+entries.length+' Kolleg*innen</p>';

    if (!entries.length) {
        sidebar += '<div style="text-align:center;padding:24px 0;color:#9CA3AF;font-size:13px">Keine Buchungen f\u00fcr diesen Tag</div>';
    }

    entries.forEach(function(e) {
        var u = e.user;
        var data = e.data;
        var isCheckedIn = data.checkins.length > 0;
        var ini = ((u.vorname||'')[0]+(u.nachname||'')[0]).toUpperCase();
        var hasAvatar = !!u.avatar_url;

        var mainBk = data.bookings[0];
        var mainTime = mainBk ? (mainBk.time_from ? mainBk.time_from.substring(0,5)+' \u2013 '+(mainBk.time_to||'').substring(0,5) : '08:00 \u2013 17:00') : '';

        var avatarHtml = hasAvatar ?
            '<img src="'+S.esc(u.avatar_url)+'" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid '+(isCheckedIn?'#F97316':'#E5E7EB')+'">':
            '<div style="width:36px;height:36px;border-radius:50%;background:#F97316;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;flex-shrink:0;border:2px solid '+(isCheckedIn?'white':'transparent')+'">'+ini+'</div>';

        sidebar += '<div style="padding:10px;border-radius:10px;margin-bottom:4px;background:'+(isCheckedIn?'#FFF7ED':'#F9FAFB')+';cursor:default">';
        sidebar += '<div style="display:flex;align-items:center;gap:10px">'+
            avatarHtml+
            '<div style="flex:1;min-width:0">'+
                '<p style="font-size:13px;font-weight:700;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+S.esc(u.vorname+' '+u.nachname)+'</p>'+
(isCheckedIn ? '<p style="font-size:11px;color:'+(data.isRemote?'#3B82F6':'#F97316')+';font-weight:600">'+(data.isRemote?'\ud83c\udfe0 Remote eingecheckt':'\u25cf Eingecheckt')+'</p>' : '')+
            '</div>'+
            (mainTime ? '<span style="font-size:11px;color:#6B7280;white-space:nowrap">'+S.esc(mainTime)+'</span>' : '')+
        '</div>';

        data.bookings.forEach(function(b) {
            var desk = (S.desks||[]).find(function(d){return d.nr===b.desk_nr;});
            var timeStr = b.time_from ? b.time_from.substring(0,5)+' \u2013 '+(b.time_to||'').substring(0,5) : '08:00 \u2013 17:00';
            var label = desk ? (desk.room||'Platz '+b.desk_nr) : 'Platz '+(b.desk_nr||'?');
            sidebar += '<div style="display:flex;align-items:center;gap:6px;margin-top:6px;padding-left:46px">'+
                '<span style="font-size:12px">\ud83e\ude91</span>'+
                '<span style="font-size:12px;font-weight:600;color:#374151;flex:1">'+S.esc(label)+'</span>'+
                '<span style="font-size:11px;color:#9CA3AF">'+S.esc(timeStr)+'</span>'+
            '</div>';
        });
        _wioParkBookings.filter(function(b){return b.user_id===e.uid;}).forEach(function(b) {
            var pNr = b.parking_nr;
            var pLabel = pNr<=2?'\u26a1 Ladeplatz '+pNr:pNr<=4?'\ud83d\ude97 G\u00e4steparkplatz P'+pNr:'\ud83c\udd7f\ufe0f Parkplatz';
            var timeStr = b.time_from ? b.time_from.substring(0,5)+' \u2013 '+(b.time_to||'').substring(0,5) : '08:00 \u2013 17:00';
            sidebar += '<div style="display:flex;align-items:center;gap:6px;margin-top:4px;padding-left:46px">'+
                '<span style="font-size:12px">'+(pNr<=2?'\u26a1':pNr<=4?'\ud83d\ude97':'\ud83c\udd7f\ufe0f')+'</span>'+
                '<span style="font-size:12px;font-weight:600;color:#6B7280;flex:1">'+S.esc(pLabel)+'</span>'+
                '<span style="font-size:11px;color:#9CA3AF">'+S.esc(timeStr)+'</span>'+
            '</div>';
        });

        sidebar += '</div>';
    });

    // ── Floor plan ──
    var floorHtml = '<p style="font-size:13px;font-weight:600;color:#374151;margin-bottom:12px">1. OG \u2013 B\u00fcro Unterf\u00f6hring</p>';

    var deskPersonMap = {};
    _wioCheckins.forEach(function(c) {
        if (c.desk_nr) deskPersonMap[c.desk_nr] = {uid: c.user_id, type:'checkin'};
    });
    _wioBookings.forEach(function(b) {
        if (b.desk_nr && !deskPersonMap[b.desk_nr]) deskPersonMap[b.desk_nr] = {uid: b.user_id, type:'booking'};
    });

    var dotsHtml = '';
    (S.desks||[]).forEach(function(d) {
        if (!d.pct_x || !d.pct_y || d.desk_type !== 'standard') return;
        var px = parseFloat(d.pct_x), py = parseFloat(d.pct_y);
        var entry = deskPersonMap[d.nr];
        if (!entry) return;

        var u = userMap[entry.uid];
        if (!u) return;
        var isCheckedIn = entry.type === 'checkin';
        var ini = ((u.vorname||'')[0]+(u.nachname||'')[0]).toUpperCase();
        var hasAvatar = !!u.avatar_url;
        var sz = isCheckedIn ? 38 : 32;
        var ring = isCheckedIn ? 'box-shadow:0 0 0 3px rgba(249,115,22,.5),0 3px 10px rgba(0,0,0,.25)' : 'box-shadow:0 2px 6px rgba(0,0,0,.2)';

        var innerHtml = hasAvatar ?
            '<img src="'+S.esc(u.avatar_url)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' :
            ini;

        dotsHtml += '<div title="'+S.esc(u.vorname+' '+u.nachname+(isCheckedIn?' (eingecheckt)':' (gebucht)'))+'" '+
            'style="position:absolute;left:'+px+'%;top:'+py+'%;transform:translate(-50%,-50%);'+
            'width:'+sz+'px;height:'+sz+'px;border-radius:50%;'+
            'background:'+(isCheckedIn?'#F97316':'#4B5563')+';'+
            'border:2px solid white;'+ring+';'+
            'z-index:10;display:flex;align-items:center;justify-content:center;'+
            'font-size:'+(sz<=32?'10':'12')+'px;color:white;font-weight:700;overflow:hidden;'+
            'cursor:default">'+
            innerHtml+
        '</div>';
    });

    floorHtml += '<div style="overflow-x:auto;border:1px solid #E5E7EB;border-radius:8px">'+
        '<div style="position:relative;display:inline-block;min-width:700px;width:100%">'+
        '<img src="grundriss_og.png" style="width:100%;height:auto;display:block;border-radius:8px">'+
        dotsHtml+
    '</div>';

    // Parking section below floor plan
    if (_wioParkBookings.length > 0) {
        floorHtml += '<div style="margin-top:16px;border-top:1px solid #F3F4F6;padding-top:16px">';
        floorHtml += '<p style="font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">\ud83c\udd7f\ufe0f Parkpl\u00e4tze</p>';
        floorHtml += '<div style="display:flex;flex-wrap:wrap;gap:8px">';

        var parkSlots = [
            {nrs:[1,2], icon:'\u26a1', label:'Elektro', bg:'#FFFBEB', border:'#FDE68A'},
            {nrs:[3,4], icon:'\ud83d\ude97', label:'Gast',    bg:'#EFF6FF', border:'#BFDBFE'},
            {nrs:[5,6,7,8,9,10,11,12], icon:'\ud83c\udd7f\ufe0f', label:'Standard', bg:'#F0FDF4', border:'#BBF7D0'}
        ];

        parkSlots.forEach(function(grp) {
            grp.nrs.forEach(function(nr) {
                var bk = _wioParkBookings.find(function(b){return b.parking_nr===nr;});
                if (!bk && grp.nrs.length > 4) return;
                var u = bk ? userMap[bk.user_id] : null;
                var ini2 = u ? ((u.vorname||'')[0]+(u.nachname||'')[0]).toUpperCase() : null;
                var timeStr = bk && bk.time_from ? bk.time_from.substring(0,5)+'-'+(bk.time_to||'').substring(0,5) : '';
                if (grp.nrs.length > 4 && !bk) return;
                floorHtml += '<div style="display:flex;flex-direction:column;align-items:center;padding:10px 14px;border-radius:10px;border:1px solid '+(bk?'#F97316':grp.border)+';background:'+(bk?'#FFF7ED':grp.bg)+';min-width:80px;text-align:center">';
                floorHtml += '<span style="font-size:18px">'+grp.icon+'</span>';
                if (grp.nrs.length <= 4) {
                    floorHtml += '<span style="font-size:11px;font-weight:700;color:#374151;margin-top:2px">P'+nr+'</span>';
                } else {
                    floorHtml += '<span style="font-size:11px;font-weight:700;color:#374151;margin-top:2px">'+grp.label+'</span>';
                }
                if (bk && u) {
                    floorHtml += '<div style="width:24px;height:24px;border-radius:50%;background:#F97316;display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:700;margin-top:4px">'+ini2+'</div>';
                    floorHtml += '<span style="font-size:9px;color:#9CA3AF;margin-top:2px">'+S.esc(u.vorname)+'</span>';
                    if (timeStr) floorHtml += '<span style="font-size:9px;color:#9CA3AF">'+timeStr+'</span>';
                } else if (!bk) {
                    floorHtml += '<span style="font-size:10px;color:#16A34A;font-weight:600;margin-top:4px">frei</span>';
                }
                floorHtml += '</div>';
            });
        });

        floorHtml += '</div></div>';
    }

    // Assemble
    el.innerHTML =
        '<div style="display:grid;grid-template-columns:300px 1fr;gap:16px;min-height:500px">'+
            '<div style="overflow-y:auto;max-height:80vh">'+sidebar+'</div>'+
            '<div class="vit-card p-4">'+floorHtml+'</div>'+
        '</div>';
}

window._wioOpenDatePicker = function() {
    var inp = document.getElementById('wioDateInput');
    if (inp) inp.showPicker ? inp.showPicker() : inp.click();
};

window._wioChangeDate = async function(iso) {
    var S=_off();
    _wioDate = iso;
    var el = document.getElementById('officeTab_werImOffice');
    if (!el) return;
    try {
        await _wioLoad();
        _wioBuildUI(el);
    } catch(e) { S.notify('Fehler: '+e.message,'error'); }
};

window._wioSearchChange = function(val) {
    _wioSearch = val;
    var el = document.getElementById('officeTab_werImOffice');
    if (el) _wioBuildUI(el);
};
