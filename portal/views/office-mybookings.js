/**
function _sb() { return window.sb; }
 * views/office-mybookings.js — Meine Buchungen tab
 * @module views/office-mybookings
 */

// Access shared state
function _off() { return window._offState; }

// ─── Local state ───
var _mbYear = null;
var _mbMonth = null;
var _mbSelDate = null;
var _mbBookings = [];

async function renderMeineBuchungen() {
    var el = document.getElementById('officeTab_meinebuchungen');
    if (!el) return;
    var S=_off();
    el.innerHTML = '<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
    try {
        var now = new Date();
        if (!_mbYear)  _mbYear  = now.getFullYear();
        if (!_mbMonth) _mbMonth = now.getMonth();
        if (!_mbSelDate) _mbSelDate = S.todayISO();

        await S.loadDesks();
        await S.loadHQUsers();

        var from = new Date(now); from.setMonth(from.getMonth()-6);
        var to   = new Date(now); to.setMonth(to.getMonth()+3);
        var res = await _sb().from('office_bookings')
            .select('id,booking_date,status,desk_nr,parking_nr,time_from,time_to,note')
            .eq('user_id', sbUser.id)
            .gte('booking_date', S.fmtISO(from))
            .lte('booking_date', S.fmtISO(to))
            .order('booking_date', {ascending:true});
        if (res.error) throw res.error;
        _mbBookings = res.data || [];

        _mbBuildUI(el);
    } catch(err) {
        console.error('[MeineBuchungen]', err);
        el.innerHTML = '<div class="vit-card p-6 text-red-500">Fehler: '+S.esc(err.message)+'</div>';
    }
}

export { renderMeineBuchungen };
window._offRenderMeineBuchungen = renderMeineBuchungen;

function _mbBuildUI(el) {
    el.innerHTML =
        '<div style="display:grid;grid-template-columns:340px 1fr;gap:16px;min-height:600px">'+
            '<div>'+
                '<div class="vit-card p-4 mb-3">'+
                    '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border:1px solid #E5E7EB;border-radius:10px;margin-bottom:16px;cursor:default">'+
                        '<span style="font-size:14px;font-weight:600;color:#374151">Meine Buchungen</span>'+
                        '<span style="color:#9CA3AF">&#8964;</span>'+
                    '</div>'+
                    '<div id="mbCal"></div>'+
                '</div>'+
                '<div class="vit-card p-4" id="mbDayPanel"></div>'+
            '</div>'+
            '<div class="vit-card p-4" id="mbFloorPanel">'+
                '<p style="color:#9CA3AF;font-size:13px;text-align:center;margin-top:40px">Tag im Kalender ausw\u00e4hlen</p>'+
            '</div>'+
        '</div>';

    _mbRenderCal();
    _mbRenderDay(_mbSelDate);
    _mbRenderFloor(_mbSelDate);
}

function _mbRenderCal() {
    var S=_off();
    var cal = document.getElementById('mbCal');
    if (!cal) return;

    var today = S.todayISO();
    var MONTH_NAMES = ['Januar','Februar','M\u00e4rz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

    var bookedSet = {};
    _mbBookings.forEach(function(b){ bookedSet[b.booking_date] = true; });

    var firstDay = new Date(_mbYear, _mbMonth, 1);
    var lastDay  = new Date(_mbYear, _mbMonth+1, 0);
    var startDow = (firstDay.getDay()+6)%7;

    var h = '';

    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
        '<button onclick="window._mbNav(-1)" style="width:28px;height:28px;border:none;background:none;cursor:pointer;font-size:18px;color:#6B7280;border-radius:6px;display:flex;align-items:center;justify-content:center" onmouseover="this.style.background=\'#F3F4F6\'" onmouseout="this.style.background=\'none\'">&#8249;</button>'+
        '<span style="font-size:14px;font-weight:700;color:#374151">'+MONTH_NAMES[_mbMonth]+' '+_mbYear+'</span>'+
        '<button onclick="window._mbNav(1)" style="width:28px;height:28px;border:none;background:none;cursor:pointer;font-size:18px;color:#6B7280;border-radius:6px;display:flex;align-items:center;justify-content:center" onmouseover="this.style.background=\'#F3F4F6\'" onmouseout="this.style.background=\'none\'">&#8250;</button>'+
    '</div>';

    h += '<div style="display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:4px">';
    ['M','D','D','F','S','S','S'].forEach(function(d){
        h += '<div style="text-align:center;font-size:11px;font-weight:600;color:#9CA3AF;padding:4px 0">'+d+'</div>';
    });
    h += '</div>';

    h += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">';

    for (var i=0; i<startDow; i++) h += '<div></div>';

    for (var d=1; d<=lastDay.getDate(); d++) {
        var iso = _mbYear+'-'+String(_mbMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
        var isToday = iso===today;
        var isSel   = iso===_mbSelDate;
        var hasBook = bookedSet[iso];
        var dow     = (new Date(iso).getDay()+6)%7;
        var isWknd  = dow>=5;

        var bg='transparent', fg=isWknd?'#D1D5DB':'#374151', fw='400', border='none';

        if (isSel) {
            bg='#F97316'; fg='white'; fw='700'; border='none';
        } else if (isToday && hasBook) {
            bg='#FFF7ED'; fg='#EA580C'; fw='700'; border='2px solid #F97316';
        } else if (isToday) {
            bg='#FFF7ED'; fg='#EA580C'; fw='700';
        } else if (hasBook) {
            bg='#FFF7ED'; fg='#EA580C'; fw='600';
        }

        h += '<div onclick="window._mbSel(\''+iso+'\')" '+
            'style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;'+
            'width:36px;height:36px;border-radius:50%;cursor:pointer;background:'+bg+';color:'+fg+';font-weight:'+fw+';'+
            'font-size:13px;transition:.1s;border:'+border+';margin:auto" '+
            'onmouseover="this.style.background=\''+(isSel?'#F97316':'#FFF7ED')+'\';" '+
            'onmouseout="this.style.background=\''+bg+'\';">'+
            d+
            (hasBook&&!isSel ? '<span style="position:absolute;bottom:3px;width:4px;height:4px;border-radius:50%;background:'+(isToday||isSel?'white':'#F97316')+'"></span>' : '')+
        '</div>';
    }

    h += '</div>';
    cal.innerHTML = h;
}

function _mbRenderDay(iso) {
    var S=_off();
    var el = document.getElementById('mbDayPanel');
    if (!el) return;

    var dayBkgs = _mbBookings.filter(function(b){ return b.booking_date===iso; });
    var userMap = {}; (S.hqUsers||[]).forEach(function(u){userMap[u.id]=u;});
    var me = userMap[sbUser.id] || {vorname:'?', nachname:''};

    var dateStr = new Date(iso+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
    var h = '<p style="font-size:13px;font-weight:700;color:#374151;margin-bottom:12px">Alle Buchungen am '+dateStr+'</p>';

    if (!dayBkgs.length) {
        h += '<p style="font-size:12px;color:#9CA3AF;text-align:center;padding:16px 0">Keine Buchungen</p>';
        el.innerHTML = h;
        return;
    }

    dayBkgs.forEach(function(b) {
        var desk = b.desk_nr ? (S.desks||[]).find(function(d){return d.nr===b.desk_nr;}) : null;
        var timeStr = b.time_from ? b.time_from.substring(0,5)+' \u2013 '+(b.time_to||'').substring(0,5) : '08:00 \u2013 17:00';
        var isPast = iso < S.todayISO();

var dotColor = b.status==='remote' ? '#3B82F6' : '#F97316';
        h += '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px;border-radius:10px;background:'+(b.status==='remote'?'#EFF6FF':'#F9FAFB')+';margin-bottom:8px">';

        h += '<div style="width:10px;height:10px;border-radius:50%;background:'+dotColor+';margin-top:4px;flex-shrink:0"></div>';

        h += '<div style="flex:1">';

      if (b.status==='remote') {
            h += '<div style="display:flex;align-items:center;justify-content:space-between">'+
                '<span style="font-size:13px;font-weight:700;color:#374151">'+S.esc(me.vorname+' '+me.nachname)+'</span>'+
                '<span style="font-size:11px;color:#6B7280">'+timeStr+'</span>'+
            '</div>';
            h += '<div style="display:flex;align-items:center;gap:6px;margin-top:6px">'+
                '<span style="font-size:16px">\ud83c\udfe0</span>'+
                '<span style="font-size:13px;font-weight:600;color:#3B82F6">Remote</span>'+
            '</div>';
            h += '<p style="font-size:11px;color:#9CA3AF;margin-top:2px">Von zuhause oder unterwegs</p>';
            if (!isPast) {
                h += '<button onclick="window._mbCancelDesk(\''+b.id+'\')" style="font-size:10px;color:#EF4444;background:none;border:none;cursor:pointer;padding:0;margin-top:4px">Stornieren</button>';
            }
        } else if (b.desk_nr) {
            h += '<div style="display:flex;align-items:center;justify-content:space-between">'+
                '<span style="font-size:13px;font-weight:700;color:#374151">'+S.esc(me.vorname+' '+me.nachname)+'</span>'+
                '<span style="font-size:11px;color:#6B7280">'+timeStr+'</span>'+
            '</div>';
            var feats = [];
            if (desk&&desk.has_monitor) feats.push('Widescreen Monitor');
            if (desk&&desk.has_docking) feats.push('Docking');
            if (feats.length) h += '<p style="font-size:11px;color:#6B7280;margin-top:2px">'+S.esc(feats.join(', '))+'</p>';
            if (desk&&desk.room) h += '<p style="font-size:11px;color:#9CA3AF;margin-top:1px">HQ Unterf\u00f6hring, 1. OG, '+S.esc(desk.room)+'</p>';
            var isToday = iso===S.todayISO();
            if (isToday) {
                h += '<p style="font-size:11px;color:#16A34A;margin-top:4px;display:flex;align-items:center;gap:4px">'+
                    '<span>&#10003;</span> Check-in: Buchung best\u00e4tigt</p>';
            }
            if (!isPast) {
                h += '<button onclick="window._mbCancelDesk(\''+b.id+'\')" style="font-size:10px;color:#EF4444;background:none;border:none;cursor:pointer;padding:0;margin-top:4px">Stornieren</button>';
            }
        }

        if (b.parking_nr) {
            var pLabel = b.parking_nr<=2?'Ladeplatz '+b.parking_nr:b.parking_nr<=4?'G\u00e4ste P'+b.parking_nr:'Parkplatz';
            if (!b.desk_nr) {
                h += '<div style="display:flex;align-items:center;justify-content:space-between">'+
                    '<span style="font-size:13px;font-weight:700;color:#374151">'+S.esc(pLabel)+'</span>'+
                    '<span style="font-size:11px;color:#6B7280">'+timeStr+'</span>'+
                '</div>';
            } else {
                h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px solid #E5E7EB">'+
                    '<span style="font-size:12px;font-weight:600;color:#6B7280">'+S.esc(pLabel)+'</span>'+
                    '<span style="font-size:11px;color:#6B7280">'+timeStr+'</span>'+
                '</div>';
            }
            if (!isPast) {
                h += '<button onclick="window._mbCancelParking(\''+b.id+'\')" style="font-size:10px;color:#EF4444;background:none;border:none;cursor:pointer;padding:0;margin-top:4px">Stornieren</button>';
            }
        }

        h += '</div></div>';
    });

    el.innerHTML = h;
}

function _mbRenderFloor(iso) {
    var S=_off();
    var fp = document.getElementById('mbFloorPanel');
    if (!fp) return;

    var dayBkgs = _mbBookings.filter(function(b){ return b.booking_date===iso&&b.desk_nr; });
    var myDeskNr = dayBkgs.length ? dayBkgs[0].desk_nr : null;
    var myDesk = myDeskNr ? (S.desks||[]).find(function(d){return d.nr===myDeskNr;}) : null;

    var locationTitle = '1. OG \u2013 B\u00fcro Unterf\u00f6hring';

    var h = '<p style="font-size:13px;font-weight:600;color:#374151;margin-bottom:12px">'+S.esc(locationTitle)+'</p>';

    h += '<div style="overflow-x:auto;border:1px solid #E5E7EB;border-radius:8px">';
    h += '<div style="position:relative;display:inline-block;min-width:700px;width:100%">';
    h += '<img src="grundriss_og.png" style="width:100%;height:auto;display:block;border-radius:8px" onerror="this.style.display=\'none\'">';

    if (myDesk && myDesk.pct_x && myDesk.pct_y) {
        var px = parseFloat(myDesk.pct_x);
        var py = parseFloat(myDesk.pct_y);
        h += '<div style="position:absolute;left:'+px+'%;top:'+py+'%;transform:translate(-50%,-50%);'+
            'width:36px;height:36px;border-radius:50%;background:#F97316;'+
            'border:3px solid white;box-shadow:0 0 0 3px rgba(249,115,22,.4),0 4px 12px rgba(0,0,0,.3);'+
            'display:flex;align-items:center;justify-content:center;'+
            'font-size:16px;z-index:10;cursor:default" title="Platz '+myDeskNr+' \u2013 Deine Buchung">'+
            '&#9829;'+
        '</div>';
    }

    h += '</div></div>';

    if (!myDeskNr) {
        var hasRemote = _mbBookings.filter(function(b){return b.booking_date===iso&&b.status==='remote';}).length > 0;
        if (hasRemote) {
            h = '<p style="font-size:13px;font-weight:600;color:#374151;margin-bottom:12px">'+S.esc(locationTitle)+'</p>'+
                '<div style="display:flex;align-items:center;justify-content:center;min-height:300px;flex-direction:column;gap:16px">'+
                '<div style="width:80px;height:80px;border-radius:50%;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:40px">\ud83c\udfe0</div>'+
                '<p style="font-size:18px;font-weight:700;color:#3B82F6">Remote-Tag</p>'+
                '<p style="font-size:13px;color:#9CA3AF;text-align:center">Du arbeitest heute von zuhause<br>oder unterwegs \u2013 kein B\u00fcrobesuch geplant.</p>'+
                '</div>';
        } else {
            h = '<p style="font-size:13px;font-weight:600;color:#374151;margin-bottom:12px">'+S.esc(locationTitle)+'</p>'+
                '<div style="display:flex;align-items:center;justify-content:center;min-height:300px;flex-direction:column;gap:12px">'+
                '<p style="font-size:13px;color:#9CA3AF">Kein Desk gebucht f\u00fcr diesen Tag</p>'+
                '<button onclick="showOfficeTab(\'buchen\')" style="padding:8px 20px;background:#F97316;color:white;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer">+ Jetzt buchen</button>'+
                '</div>';
        }
    }

    fp.innerHTML = h;
}

window._mbNav = function(dir) {
    _mbMonth += dir;
    if (_mbMonth>11){_mbMonth=0;_mbYear++;}
    if (_mbMonth<0) {_mbMonth=11;_mbYear--;}
    _mbRenderCal();
};

window._mbSel = function(iso) {
    _mbSelDate = iso;
    _mbRenderCal();
    _mbRenderDay(iso);
    _mbRenderFloor(iso);
};

window._mbCancelDesk = async function(bookingId) {
    var S=_off();
    if (!confirm('Desk-Buchung stornieren?')) return;
    try {
        var bk = _mbBookings.find(function(b){return b.id===bookingId;});
        var res;
        if (bk&&bk.parking_nr) {
            res = await _sb().from('office_bookings').update({desk_nr:null,status:'parking'}).eq('id',bookingId);
        } else {
            res = await _sb().from('office_bookings').delete().eq('id',bookingId);
        }
        if (res.error) throw res.error;
        S.notify('Buchung storniert','success');
        await renderMeineBuchungen();
    } catch(e){S.notify('Fehler: '+e.message,'error');}
};

window._mbCancelParking = async function(bookingId) {
    var S=_off();
    if (!confirm('Parkplatz-Buchung stornieren?')) return;
    try {
        var bk = _mbBookings.find(function(b){return b.id===bookingId;});
        var res;
        if (bk&&bk.desk_nr) {
            res = await _sb().from('office_bookings').update({parking_nr:null}).eq('id',bookingId);
        } else {
            res = await _sb().from('office_bookings').delete().eq('id',bookingId);
        }
        if (res.error) throw res.error;
        S.notify('Parkplatz storniert','success');
        await renderMeineBuchungen();
    } catch(e){S.notify('Fehler: '+e.message,'error');}
};
