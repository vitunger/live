/**
 * views/office.js - Office Module (Check-in, Desk Booking, Analytics)
 * @module views/office
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// Module-level state
var D = [], CI = [], CH = [], BK = [], HQ_USERS = [];
function _showView(v) { if (window.showView) window._showView(v); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

export async function init() {
if (!window.sb || !window.sbUser) return;
if (INIT) { render(); return; }
INIT = true;
await load();
render();
setupRT();
updateBadge();
}

export async function load() {
try {
    var today = new Date().toISOString().split('T')[0];
    var r = await Promise.all([
        _sb().from('office_desks').select('*').eq('active', true).order('nr'),
        _sb().from('v_office_status').select('*'),
        _sb().from('office_charging').select('*'),
        _sb().from('v_office_bookings').select('*').gte('booking_date', new Date(Date.now()-7*86400000).toISOString().split('T')[0]).order('booking_date'),
        _sb().from('users').select('id,name,vorname,nachname,avatar_url,position,is_hq').eq('is_hq', true)
    ]);
    D = r[0].data||[]; CI = r[1].data||[]; CH = r[2].data||[];
    BK = r[3].data||[]; HQ_USERS = r[4].data||[];
} catch(e) { console.error('[Office]', e); }
}

// ===== HELPERS =====
export function me() { return window._sbUser() ? window._sbUser().id : null; }
export function myCI() { var u=me(); for(var i=0;i<CI.length;i++) if(CI[i].user_id===u) return CI[i]; return null; }
export function deskCI(nr) { for(var i=0;i<CI.length;i++) if(CI[i].desk_nr===nr) return CI[i]; return null; }
export function myBK(ds) { var u=me(); for(var i=0;i<BK.length;i++) if(BK[i].user_id===u&&BK[i].booking_date===ds) return BK[i]; return null; }
export function deskBK(nr,ds) { for(var i=0;i<BK.length;i++) if(BK[i].desk_nr===nr&&BK[i].booking_date===ds) return BK[i]; return null; }
export function dayBK(ds) { return BK.filter(function(b){return b.booking_date===ds}); }
export function av(u,s) { s=s||32; if(u.avatar_url) return u.avatar_url; var n=u.name||((u.vorname||'')+' '+(u.nachname||'')).trim()||'?'; return 'https://ui-avatars.com/api/?name='+encodeURIComponent(n)+'&background=EF7D00&color=fff&size='+(s*2); }
export function ini(u) { return ((u.vorname||u.name||'').charAt(0)+(u.nachname||'').charAt(0)).toUpperCase(); }
export function fmtD(ds) { var d=new Date(ds+'T00:00:00'); return ['So','Mo','Di','Mi','Do','Fr','Sa'][d.getDay()]+', '+d.getDate()+'.'+(d.getMonth()+1)+'.'; }
export function fmtDL(ds) { var d=new Date(ds+'T00:00:00'); var days=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']; return days[d.getDay()]+', '+d.getDate()+'.'+(d.getMonth()+1)+'.'+d.getFullYear(); }
export function todayStr() { return new Date().toISOString().split('T')[0]; }
export function isToday(ds) { return ds===todayStr(); }
export function workdays(offset,count) {
var r=[],d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+offset*7);
// Go to Monday of that week
var dow=d.getDay(); d.setDate(d.getDate()-(dow===0?6:dow-1));
for(var i=0;i<7&&r.length<count;i++){var nd=new Date(d);nd.setDate(d.getDate()+i);if(nd.getDay()!==0&&nd.getDay()!==6)r.push(nd);}
return r;
}
export function userName() { if(window.sbProfile) return window._sbProfile().vorname||window._sbProfile().name||''; return ''; }

// ===== RENDER =====
export function render() {
renderHero();
if(TAB==='home') renderHome();
if(TAB==='plan') renderPlan();
if(TAB==='woche') renderWoche();
if(TAB==='laden') renderLaden();
if(TAB==='analytics') renderAnalytics();
updateBadge();
}

// ===== HERO =====
export function renderHero() {
var h = document.getElementById('officeHero');
if(!h) return;
var ci = myCI();
var offU = CI.filter(function(c){return c.status==='office'}).length;
var remU = CI.filter(function(c){return c.status==='remote'}).length;
var free = D.filter(function(d){return d.room!=='Konferenz'}).length - offU;

var html = '<div class="flex items-center justify-between flex-wrap gap-4">';
html += '<div><h1 class="text-2xl font-bold" style="color:var(--c-text)">Hallo '+userName()+',</h1>';
html += '<p class="text-sm" style="color:var(--c-sub)">Wo bist du die nächsten Tage?</p></div>';
html += '<div class="flex items-center gap-3">';
html += '<div class="flex gap-2 text-xs">';
html += '<span class="px-2.5 py-1 rounded-full font-bold" style="background:#f0fdf4;color:#22c55e">'+offU+' Büro</span>';
html += '<span class="px-2.5 py-1 rounded-full font-bold" style="background:#eff6ff;color:#3b82f6">'+remU+' Remote</span>';
html += '<span class="px-2.5 py-1 rounded-full font-bold" style="background:#fafafa;color:#999">'+Math.max(0,free)+' Frei</span>';
html += '</div>';
if(ci) {
    html += '<button onclick="officeDoCheckout()" class="px-4 py-2 rounded-lg text-sm font-bold text-white" style="background:#ef4444">🚪 Auschecken</button>';
} else {
    html += '<button onclick="officeToggleCheckin()" class="px-4 py-2 rounded-lg text-sm font-bold text-white bg-vit-orange">📍 Einchecken</button>';
}
html += '</div></div>';
h.innerHTML = html;
}

// ===============================================================
// TAB 1: HOME — "Where are you for the next few days?"
// ===============================================================
export function renderHome() {
var el = document.getElementById('officeHomeContent');
if(!el) return;
var days = workdays(HOME_OFFSET, 5);
var ci = myCI();
var weekStart = days[0], weekEnd = days[days.length-1];

// Week navigation
var html = '<div class="flex items-center gap-3 mb-4">';
html += '<button onclick="officeHomeNav(-1)" class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style="background:var(--c-bg3);color:var(--c-muted)">‹</button>';
html += '<span class="text-sm font-semibold" style="color:var(--c-text)">'+weekStart.getDate()+'.'+(weekStart.getMonth()+1)+'. – '+weekEnd.getDate()+'.'+(weekEnd.getMonth()+1)+'.'+(weekEnd.getFullYear())+'</span>';
html += '<button onclick="officeHomeNav(1)" class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style="background:var(--c-bg3);color:var(--c-muted)">›</button>';
if(HOME_OFFSET!==0) html += '<button onclick="officeHomeNav(0)" class="text-xs font-bold px-3 py-1 rounded-lg text-vit-orange" style="border:1px solid #EF7D00">Heute</button>';
html += '</div>';

html += '<div class="grid gap-4" style="grid-template-columns:repeat('+days.length+',1fr);overflow-x:auto">';

days.forEach(function(day) {
    var ds = day.toISOString().split('T')[0];
    var today = isToday(ds);
    var past = new Date(ds+'T23:59:59') < new Date();
    var bk = myBK(ds);
    var dayBookings = dayBK(ds);
    var dayColleagues = dayBookings.filter(function(b){return b.user_id!==me()});
    
    // Card
    html += '<div class="rounded-xl p-4 min-w-[160px]" style="background:var(--c-bg);border:' + (today ? '2px solid #EF7D00' : '1px solid var(--c-border)') + (past&&!today?';opacity:0.6':'') + '">';
    
    // Date header
    if(today) html += '<div class="w-8 h-1 rounded-full bg-vit-orange mx-auto mb-2"></div>';
    html += '<div class="text-xs font-bold text-center mb-3" style="color:'+(today?'#EF7D00':'var(--c-muted)')+'">'+( today ? 'Heute' : fmtD(ds))+'</div>';
    
    // Status button
    if(today && ci) {
        var loc = ci.status==='office' ? '🏢 Büro #'+ci.desk_nr : '🏠 Remote';
        html += '<div class="rounded-lg p-2.5 text-center text-sm font-semibold mb-3" style="background:#FFF4E6;color:#EF7D00;border:1px solid rgba(239,125,0,0.2)">'+loc+'</div>';
    } else if(bk) {
        var loc = bk.status==='office' ? '🏢 Büro'+(bk.desk_nr?' #'+bk.desk_nr:'') : '🏠 Remote';
        html += '<div class="rounded-lg p-2.5 text-center text-sm font-semibold mb-3" style="background:'+(bk.status==='office'?'#FFF4E6':'#eff6ff')+';color:'+(bk.status==='office'?'#EF7D00':'#3b82f6')+';border:1px solid '+(bk.status==='office'?'rgba(239,125,0,0.2)':'rgba(59,130,246,0.2)')+'">'+loc+'</div>';
        if(!past) html += '<div class="text-[10px] text-center mb-2" style="color:var(--c-muted);cursor:pointer" onclick="officeDeleteBooking(\''+bk.id+'\')">✕ stornieren</div>';
    } else if(!past) {
        html += '<div class="rounded-lg p-2.5 text-center text-sm cursor-pointer mb-3 hover:shadow transition" style="background:var(--c-bg3);color:var(--c-sub);border:1px solid var(--c-border)" onclick="officeShowBookingModal(\''+ds+'\')">Dein Status?</div>';
    } else {
        html += '<div class="rounded-lg p-2.5 text-center text-[11px] mb-3" style="background:var(--c-bg3);color:var(--c-dim)">–</div>';
    }
    
    // Colleagues
    if(dayColleagues.length > 0) {
        html += '<div class="text-[10px] mb-1.5" style="color:var(--c-muted)">Kollegen anwesend:</div>';
        html += '<div class="flex flex-wrap gap-1 mb-2">';
        var show = dayColleagues.slice(0,4);
        show.forEach(function(c) {
            html += '<img src="'+av(c,24)+'" width="24" height="24" style="border-radius:50%;object-fit:cover" title="'+(c.name||'')+'">';
        });
        if(dayColleagues.length > 4) html += '<span class="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold" style="background:var(--c-bg3);color:var(--c-muted)">+' + (dayColleagues.length-4) + '</span>';
        html += '</div>';
    } else {
        html += '<div class="text-[10px] mb-1.5" style="color:var(--c-dim)">Noch keine Buchungen</div>';
    }
    
    // Book button
    if(!bk && !past && !(today&&ci)) {
        html += '<button onclick="officeShowBookingModal(\''+ds+'\')" class="w-full rounded-lg py-1.5 text-xs font-semibold text-center mt-1 transition hover:shadow" style="border:1px solid #EF7D00;color:#EF7D00;background:transparent">Buchen</button>';
    }
    
    html += '</div>';
});

html += '</div>';

// Who is in the office today (only on current week)
if(HOME_OFFSET === 0) {
    var todayCI = CI.filter(function(c){return c.status==='office'});
    var todayRemote = CI.filter(function(c){return c.status==='remote'});
    if(todayCI.length>0 || todayRemote.length>0) {
        html += '<div class="mt-6 vit-card p-4"><div class="text-xs font-bold mb-3" style="color:var(--c-muted)">📍 Heute im Büro</div>';
        html += '<div class="flex flex-wrap gap-3">';
        todayCI.forEach(function(c) {
            var isMe = c.user_id===me();
            html += '<div class="flex items-center gap-2 px-3 py-2 rounded-lg" style="background:'+(isMe?'#FFF4E6':'var(--c-bg3)')+'">';
            html += '<img src="'+av(c,28)+'" width="28" height="28" style="border-radius:50%;object-fit:cover">';
            html += '<div><div class="text-xs font-semibold" style="color:var(--c-text)">'+(c.name||'')+(isMe?' (Du)':'')+'</div>';
            html += '<div class="text-[10px]" style="color:var(--c-muted)">#'+c.desk_nr+' · seit '+c.since+'</div></div>';
            html += '</div>';
        });
        html += '</div>';
        if(todayRemote.length>0) {
            html += '<div class="text-xs font-bold mt-3 mb-2" style="color:var(--c-muted)">🏠 Remote</div><div class="flex flex-wrap gap-2">';
            todayRemote.forEach(function(c) {
                html += '<div class="flex items-center gap-1.5 px-2 py-1 rounded-lg" style="background:#eff6ff"><img src="'+av(c,20)+'" width="20" height="20" style="border-radius:50%"><span class="text-[11px] font-semibold" style="color:#3b82f6">'+(c.vorname||c.name||'')+'</span></div>';
            });
            html += '</div>';
        }
        html += '</div>';
    }
}

el.innerHTML = html;
}

// ===============================================================
// TAB 2: GRUNDRISS — Floor plan with real layout + colleague list
// ===============================================================
export function renderPlan() {
var el = document.getElementById('officePlanContent');
if(!el) return;
var ci = myCI();
var offU = CI.filter(function(c){return c.status==='office'});
var remU = CI.filter(function(c){return c.status==='remote'});

var html = '';

// Floor plan card — full width
html += '<div class="vit-card p-3 mb-4" style="overflow-x:auto">';
html += '<div class="flex justify-between items-center mb-2"><span class="text-xs font-bold" style="color:var(--c-muted)">1. OG · Büro Unterföhring</span>';
html += '<div class="flex gap-3 text-[10px]" style="color:var(--c-dim)"><span>🟢 Frei</span><span>🟠 Belegt</span><span>🔵 Du</span></div></div>';
html += '<div id="officePlanContainer" style="position:relative;width:100%;min-width:700px">';
html += '<img src="grundriss_og.png" style="width:100%;display:block;opacity:0.88;border-radius:6px" onload="officeRenderDots()">';
html += '<div id="officePlanDots" style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none"></div>';
html += '</div>';
html += '</div>';

// Colleague list below — horizontal cards
if(offU.length > 0 || remU.length > 0) {
    html += '<div class="vit-card p-4">';
    html += '<div class="text-xs font-bold mb-1" style="color:var(--c-muted)">📅 '+fmtDL(todayStr())+'</div>';
    html += '<input type="text" id="officeSearchColleague" placeholder="Kollegen suchen..." oninput="officeFilterColleagues()" class="w-full px-3 py-1.5 rounded-lg text-xs mb-3" style="background:var(--c-bg3);border:1px solid var(--c-border);color:var(--c-text)">';
    
    if(offU.length > 0) {
        html += '<div class="text-[10px] font-bold mb-2" style="color:var(--c-muted)">🏢 '+offU.length+' im Büro</div>';
        html += '<div id="officeColleagueList" class="flex flex-wrap gap-2 mb-3">';
        offU.forEach(function(c) {
            var isMe = c.user_id===me();
            html += '<div class="colleague-row flex items-center gap-2 px-3 py-2 rounded-lg" style="background:'+(isMe?'#FFF4E6':'var(--c-bg3)')+'" data-name="'+(c.name||'').toLowerCase()+'">';
            html += '<img src="'+av(c,28)+'" width="28" height="28" style="border-radius:50%;object-fit:cover">';
            html += '<div><div class="text-xs font-semibold" style="color:var(--c-text)">'+(c.name||'')+(isMe?' (Du)':'')+'</div>';
            html += '<div class="text-[10px]" style="color:var(--c-muted)">'+(c.room||'Platz')+' · seit '+(c.since||'')+'</div></div></div>';
        });
        html += '</div>';
    }
    
    if(remU.length > 0) {
        html += '<div class="text-[10px] font-bold mb-2" style="color:var(--c-muted)">🏠 '+remU.length+' Remote</div>';
        html += '<div class="flex flex-wrap gap-2">';
        remU.forEach(function(c) {
            html += '<div class="colleague-row flex items-center gap-1.5 px-2 py-1 rounded-lg" style="background:#eff6ff" data-name="'+(c.name||'').toLowerCase()+'">';
            html += '<img src="'+av(c,20)+'" width="20" height="20" style="border-radius:50%">';
            html += '<span class="text-[11px] font-semibold" style="color:#3b82f6">'+(c.vorname||c.name||'')+'</span></div>';
        });
        html += '</div>';
    }
    
    if(offU.length===0 && remU.length===0) html += '<div class="text-sm py-4 text-center" style="color:var(--c-muted)">Noch niemand eingecheckt</div>';
    html += '</div>';
}

el.innerHTML = html;

// Render dots immediately if image already cached
setTimeout(officeRenderDots, 100);
}

window.officeRenderDots = function() {
var container = document.getElementById('officePlanContainer');
var dotsEl = document.getElementById('officePlanDots');
if(!container || !dotsEl) return;

var ci = myCI();
var html = '';

D.forEach(function(d) {
    if(!d.pct_x || !d.pct_y) return;
    var c = deskCI(d.nr);
    var free = !c;
    var isMe = c && c.user_id===me();
    var isConf = d.room==='Konferenz';
    var size = isConf ? 32 : 28;
    
    // Position as percentage
    var left = d.pct_x;
    var top = d.pct_y;
    
    var style = 'position:absolute;left:'+left+'%;top:'+top+'%;transform:translate(-50%,-50%);width:'+size+'px;height:'+size+'px;border-radius:50%;pointer-events:auto;cursor:'+(free&&!ci?'pointer':'default')+';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;transition:all 0.2s;';
    
    if(free) {
        // Green free dot
        style += 'background:rgba(34,197,94,0.15);border:2px solid #22c55e;color:#22c55e;';
        html += '<div style="'+style+'" '+(ci?'':'onclick="officeCheckinDesk('+d.nr+')"')+' title="Platz #'+d.nr+' · '+d.room+' · Frei">';
        html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><circle cx="12" cy="10" r="3"/><path d="M6 21v-1a6 6 0 0112 0v1"/></svg>';
        html += '</div>';
    } else if(isConf) {
        // Gray conference
        style += 'background:#e5e5e5;border:2px solid #ccc;';
        html += '<div style="'+style+'" title="Konferenz · '+(c?c.name:'')+'"><img src="'+av(c,size-4)+'" width="'+(size-4)+'" height="'+(size-4)+'" style="border-radius:50%;object-fit:cover"></div>';
    } else {
        // Occupied
        var col = isMe ? '#3b82f6' : '#EF7D00';
        style += 'background:'+col+';border:2px solid '+col+';';
        if(isMe) style += 'box-shadow:0 0 0 3px rgba(59,130,246,0.3);';
        html += '<div style="'+style+'" title="'+(c.name||'')+' · '+d.room+'">';
        html += '<img src="'+av(c,size-4)+'" width="'+(size-4)+'" height="'+(size-4)+'" style="border-radius:50%;object-fit:cover">';
        html += '</div>';
        // Name label below
        html += '<div style="position:absolute;left:'+left+'%;top:calc('+top+'% + '+(size/2+2)+'px);transform:translateX(-50%);font-size:8px;font-weight:700;color:#666;white-space:nowrap;pointer-events:none">'+ini(c)+'</div>';
    }
});

dotsEl.innerHTML = html;
};

window.officeFilterColleagues = function() {
var q = (document.getElementById('officeSearchColleague')||{}).value||'';
q = q.toLowerCase();
document.querySelectorAll('#officeColleagueList .colleague-row').forEach(function(row) {
    var name = row.getAttribute('data-name')||'';
    row.style.display = !q || name.indexOf(q)!==-1 ? '' : 'none';
});
};

// ===============================================================
// TAB 3: WOCHE — Week overview with all colleagues
// ===============================================================
export function renderWoche() {
var el = document.getElementById('officeWocheContent');
if(!el) return;
var days = workdays(WEEK_OFFSET, 5);

// Week navigation
var weekStart = days[0], weekEnd = days[days.length-1];
var html = '<div class="flex items-center gap-3 mb-4">';
html += '<span class="text-sm font-bold" style="color:var(--c-text)">Wochenübersicht</span>';
html += '<button onclick="officeWeekNav(-1)" class="w-7 h-7 rounded flex items-center justify-center" style="background:var(--c-bg3);color:var(--c-muted)">‹</button>';
html += '<span class="text-xs font-semibold" style="color:var(--c-muted)">'+weekStart.getDate()+'.'+(weekStart.getMonth()+1)+'. – '+weekEnd.getDate()+'.'+(weekEnd.getMonth()+1)+'.'+'</span>';
html += '<button onclick="officeWeekNav(1)" class="w-7 h-7 rounded flex items-center justify-center" style="background:var(--c-bg3);color:var(--c-muted)">›</button>';
if(WEEK_OFFSET!==0) html += '<button onclick="officeWeekNav(0)" class="text-xs font-bold text-vit-orange">Heute</button>';
html += '</div>';

// Build user list (me first, then sorted)
var users = HQ_USERS.slice().sort(function(a,b) {
    if(a.id===me()) return -1; if(b.id===me()) return 1;
    return (a.name||'').localeCompare(b.name||'');
});

// Grid: name col + day cols
html += '<div class="vit-card p-0 overflow-x-auto"><table style="width:100%;border-collapse:collapse;min-width:700px">';

// Header row
html += '<thead><tr><th class="text-left p-3 text-xs font-bold" style="color:var(--c-muted);width:200px;border-bottom:2px solid var(--c-border)">Meine Woche</th>';
days.forEach(function(day) {
    var ds = day.toISOString().split('T')[0];
    var today = isToday(ds);
    html += '<th class="p-3 text-center text-xs font-bold" style="color:'+(today?'#EF7D00':'var(--c-muted)')+';border-bottom:2px solid '+(today?'#EF7D00':'var(--c-border)')+'">';
    html += (today?'Heute':['So','Mo','Di','Mi','Do','Fr','Sa'][day.getDay()])+', '+day.getDate()+'.'+(day.getMonth()+1)+'.';
    html += '</th>';
});
html += '</tr></thead><tbody>';

// User rows
users.forEach(function(user,idx) {
    var isMe = user.id===me();
    html += '<tr style="border-bottom:1px solid var(--c-border);'+(isMe?'background:#FFF9F0':'')+'"><td class="p-3">';
    html += '<div class="flex items-center gap-2">';
    html += '<img src="'+av(user,28)+'" width="28" height="28" style="border-radius:50%;object-fit:cover">';
    html += '<div><div class="text-sm font-semibold" style="color:var(--c-text)">'+(user.vorname||user.name||'')+(isMe?' (Du)':'')+'</div>';
    html += '<div class="text-[10px]" style="color:var(--c-muted)">'+(user.position||'')+'</div></div>';
    html += '</div></td>';
    
    days.forEach(function(day) {
        var ds = day.toISOString().split('T')[0];
        var today = isToday(ds);
        var bk = null;
        for(var i=0;i<BK.length;i++) if(BK[i].user_id===user.id&&BK[i].booking_date===ds){bk=BK[i];break;}
        
        // Today: also check live checkin
        var liveCI = null;
        if(today) { for(var j=0;j<CI.length;j++) if(CI[j].user_id===user.id){liveCI=CI[j];break;} }
        
        html += '<td class="p-2 text-center" style="'+(today?'background:rgba(239,125,0,0.03)':'')+'">';
        
        if(liveCI && today) {
            var icon = liveCI.status==='office' ? '🏢' : '🏠';
            var label = liveCI.status==='office' ? '#'+liveCI.desk_nr : 'Remote';
            var bg = liveCI.status==='office' ? '#FFF4E6' : '#eff6ff';
            var fg = liveCI.status==='office' ? '#EF7D00' : '#3b82f6';
            html += '<div class="inline-block rounded-lg px-2.5 py-1.5 text-[11px] font-bold" style="background:'+bg+';color:'+fg+'">'+icon+' '+label+'</div>';
            html += '<div class="text-[9px] mt-0.5" style="color:#22c55e">● Live</div>';
        } else if(bk) {
            var icon = bk.status==='office' ? '🏢' : '🏠';
            var label = bk.status==='office' ? (bk.desk_nr?'#'+bk.desk_nr:'Büro') : 'Remote';
            var bg = bk.status==='office' ? '#FFF4E6' : '#eff6ff';
            var fg = bk.status==='office' ? '#EF7D00' : '#3b82f6';
            html += '<div class="inline-block rounded-lg px-2.5 py-1.5 text-[11px] font-bold" style="background:'+bg+';color:'+fg+'">'+icon+' '+label+'</div>';
            if(isMe) html += '<div class="text-[8px] mt-0.5 cursor-pointer" style="color:var(--c-muted)" onclick="officeDeleteBooking(\''+bk.id+'\')">✕</div>';
        } else if(isMe) {
            html += '<div class="inline-block rounded-lg px-2.5 py-1.5 text-[11px] cursor-pointer hover:shadow transition" style="background:var(--c-bg3);color:var(--c-sub);border:1px dashed var(--c-border)" onclick="officeShowBookingModal(\''+ds+'\')">Dein Status?</div>';
        } else {
            html += '<span class="text-xs" style="color:var(--c-dim)">–</span>';
        }
        html += '</td>';
    });
    html += '</tr>';
});

// Summary row
html += '<tr style="background:var(--c-bg3)"><td class="p-3 text-xs font-bold" style="color:var(--c-muted)">Gesamt</td>';
days.forEach(function(day) {
    var ds = day.toISOString().split('T')[0];
    var oc=0, rc=0;
    BK.forEach(function(b){if(b.booking_date===ds){if(b.status==='office')oc++;else rc++;}});
    html += '<td class="p-2 text-center"><span class="text-[10px] font-bold text-vit-orange">'+oc+'🏢</span> <span class="text-[10px] font-bold" style="color:#3b82f6">'+rc+'🏠</span></td>';
});
html += '</tr></tbody></table></div>';

el.innerHTML = html;
}

// ===============================================================
// TAB 4: LADESÄULEN — Calendar + booking + visual
// ===============================================================
export function renderLaden() {
var el = document.getElementById('officeLadenContent');
if(!el) return;
var ds = LADEN_DAY.toISOString().split('T')[0];

var html = '<div class="grid gap-4" style="grid-template-columns:320px 1fr">';

// LEFT: Calendar + Bookings
html += '<div>';

// Mini calendar
html += '<div class="vit-card p-4 mb-4">';
html += buildMiniCal(LADEN_MONTH, LADEN_DAY);
html += '</div>';

// Bookings for selected day
html += '<div class="vit-card p-4">';
html += '<div class="text-xs font-bold mb-3" style="color:var(--c-muted)">Buchungen am '+fmtD(ds)+'</div>';

// Check charging bookings
var dayChargeBK = BK.filter(function(b){return b.booking_date===ds && b.status==='charging'});
CH.forEach(function(ch,idx) {
    var booked = null;
    for(var i=0;i<dayChargeBK.length;i++) { if(dayChargeBK[i].note==='charging_'+ch.id) booked=dayChargeBK[i]; }
    html += '<div class="py-2.5 border-b flex items-center justify-between" style="border-color:var(--c-border)">';
    html += '<div><div class="text-sm font-bold" style="color:var(--c-text)">⚡ '+ch.label+'</div>';
    if(booked) {
        html += '<div class="text-[10px]" style="color:#22c55e">✓ Gebucht: '+(booked.name||'')+'</div>';
    } else {
        html += '<div class="text-[10px]" style="color:var(--c-muted)">Verfügbar</div>';
    }
    html += '</div>';
    if(!booked) {
        html += '<button onclick="officeBookCharging(\''+ds+'\',\''+ch.id+'\')" class="text-xs font-bold px-3 py-1 rounded-lg" style="border:1px solid #EF7D00;color:#EF7D00">Buchen</button>';
    } else if(booked.user_id===me()) {
        html += '<button onclick="officeDeleteBooking(\''+booked.id+'\')" class="text-xs px-2 py-1 rounded" style="color:#ef4444">✕</button>';
    }
    html += '</div>';
});

if(CH.length===0) html += '<div class="text-sm" style="color:var(--c-muted)">Keine Ladesäulen konfiguriert</div>';
html += '</div></div>';

// RIGHT: Visual
html += '<div class="vit-card p-6 flex flex-col items-center justify-center" style="min-height:300px">';
html += '<div class="text-sm font-bold mb-4" style="color:var(--c-muted)">Ladesäulen · HQ Unterföhring</div>';
html += '<svg viewBox="0 0 400 240" style="max-width:400px;width:100%">';

// Two charging stations
CH.forEach(function(ch,idx) {
    var cx = idx===0 ? 120 : 280;
    var booked = null;
    for(var i=0;i<dayChargeBK.length;i++) { if(dayChargeBK[i].note==='charging_'+ch.id) booked=dayChargeBK[i]; }
    var free = !booked;
    
    // P-pin
    html += '<circle cx="'+cx+'" cy="20" r="16" fill="#EF7D00"/>';
    html += '<text x="'+cx+'" y="26" text-anchor="middle" font-size="14" font-weight="900" fill="#fff">P</text>';
    html += '<polygon points="'+(cx-4)+',36 '+(cx+4)+',36 '+cx+',44" fill="#EF7D00"/>';
    
    // Station body
    html += '<rect x="'+(cx-30)+'" y="60" width="60" height="100" rx="6" fill="'+(free?'#f0fdf4':'#fef2f2')+'" stroke="'+(free?'#22c55e':'#ef4444')+'" stroke-width="2"/>';
    // Plug icon
    html += '<circle cx="'+cx+'" cy="110" r="15" fill="none" stroke="'+(free?'#22c55e':'#ef4444')+'" stroke-width="2"/>';
    html += '<text x="'+cx+'" y="115" text-anchor="middle" font-size="14" fill="'+(free?'#22c55e':'#ef4444')+'">⚡</text>';
    
    // Label
    html += '<text x="'+cx+'" y="185" text-anchor="middle" font-size="12" font-weight="700" fill="#EF7D00">'+(ch.label||('Ladeplatz '+(idx+1)))+'</text>';
    html += '<text x="'+cx+'" y="200" text-anchor="middle" font-size="9" fill="'+(free?'#22c55e':'#ef4444')+'">'+(free?'✓ Verfügbar':'● Gebucht')+'</text>';
    if(booked) html += '<text x="'+cx+'" y="215" text-anchor="middle" font-size="8" fill="#999">'+(booked.name||'')+'</text>';
});

html += '</svg></div></div>';
el.innerHTML = html;
}

export function buildMiniCal(month, selected) {
var y = month.getFullYear(), m = month.getMonth();
var first = new Date(y,m,1);
var last = new Date(y,m+1,0);
var startDay = first.getDay()||7; // Mon=1
var selDs = selected.toISOString().split('T')[0];

var mNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
var h = '<div class="flex items-center justify-between mb-3">';
h += '<button onclick="officeLadenMonthNav(-1)" class="text-sm" style="color:var(--c-muted)">‹</button>';
h += '<span class="text-sm font-bold" style="color:var(--c-text)">'+mNames[m]+' '+y+'</span>';
h += '<button onclick="officeLadenMonthNav(1)" class="text-sm" style="color:var(--c-muted)">›</button></div>';

h += '<div class="grid grid-cols-7 gap-0 text-center text-[10px] font-bold mb-1" style="color:var(--c-muted)"><span>M</span><span>D</span><span>M</span><span>D</span><span>F</span><span>S</span><span>S</span></div>';
h += '<div class="grid grid-cols-7 gap-0 text-center">';

// Empty cells before first day
for(var i=1;i<startDay;i++) h+='<span></span>';

for(var d=1;d<=last.getDate();d++) {
    var ds = y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var isSel = ds===selDs;
    var isT = ds===todayStr();
    var hasBK = BK.some(function(b){return b.booking_date===ds && (b.status==='charging'||b.note&&b.note.startsWith('charging_'))});
    
    h += '<button onclick="officeLadenSelectDay(\''+ds+'\')" class="w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center mx-auto" style="';
    if(isSel) h += 'background:#EF7D00;color:#fff';
    else if(isT) h += 'border:2px solid #EF7D00;color:#EF7D00';
    else if(hasBK) h += 'border:1px solid #EF7D00;color:#EF7D00';
    else h += 'color:var(--c-text)';
    h += '">'+d+'</button>';
}
h += '</div>';
return h;
}

// ===============================================================
// TAB 5: ANALYTICS — Occupancy charts & stats
// ===============================================================
export function renderAnalytics() {
var el = document.getElementById('officeAnalyticsContent');
if(!el) return;

var totalDesks = D.filter(function(d){return d.room!=='Konferenz'}).length;
var offU = CI.filter(function(c){return c.status==='office'}).length;
var remU = CI.filter(function(c){return c.status==='remote'}).length;
var totalU = HQ_USERS.length || 1;
var pct = totalDesks>0?Math.round(offU/totalDesks*100):0;

var html = '';

// Top stats — simple row
html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">';
html += '<div class="vit-card p-4"><div class="text-[10px] font-bold" style="color:var(--c-muted)">PLÄTZE GESAMT</div><div class="text-2xl font-extrabold mt-1" style="color:var(--c-text)">'+totalDesks+'</div><div class="text-[10px] mt-1" style="color:var(--c-dim)">exkl. Konferenz</div></div>';
html += '<div class="vit-card p-4"><div class="text-[10px] font-bold" style="color:var(--c-muted)">AKTUELL BELEGT</div><div class="text-2xl font-extrabold mt-1" style="color:#EF7D00">'+offU+'</div><div class="text-[10px] mt-1" style="color:var(--c-dim)">'+pct+'% Auslastung</div></div>';
html += '<div class="vit-card p-4"><div class="text-[10px] font-bold" style="color:var(--c-muted)">REMOTE</div><div class="text-2xl font-extrabold mt-1" style="color:#3b82f6">'+remU+'</div><div class="text-[10px] mt-1" style="color:var(--c-dim)">von '+totalU+' Mitarbeitern</div></div>';
html += '<div class="vit-card p-4"><div class="text-[10px] font-bold" style="color:var(--c-muted)">FREI</div><div class="text-2xl font-extrabold mt-1" style="color:#22c55e">'+Math.max(0,totalDesks-offU)+'</div><div class="text-[10px] mt-1" style="color:var(--c-dim)">Plätze verfügbar</div></div>';
html += '</div>';

// Charts row
html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">';

// Occupancy next 7 days — simple horizontal bars
html += '<div class="vit-card p-4">';
html += '<div class="text-sm font-bold mb-4" style="color:var(--c-text)">Büro-Buchungen nächste 7 Tage</div>';
var days7=[]; var dd=new Date(); dd.setHours(0,0,0,0);
for(var i=0;i<7;i++){days7.push(new Date(dd));dd.setDate(dd.getDate()+1);}
days7.forEach(function(day) {
    var ds = day.toISOString().split('T')[0];
    var booked = BK.filter(function(b){return b.booking_date===ds&&b.status==='office'}).length;
    var barPct = totalDesks>0 ? Math.round(booked/totalDesks*100) : 0;
    var dn = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    var isT = ds===todayStr();
    html += '<div class="flex items-center gap-2 mb-2">';
    html += '<div class="text-[10px] font-bold w-14" style="color:'+(isT?'#EF7D00':'var(--c-muted)')+'">'+(isT?'Heute':dn[day.getDay()]+' '+day.getDate()+'.')+'</div>';
    html += '<div class="flex-1 h-5 rounded-full" style="background:var(--c-bg3)">';
    if(barPct>0) html += '<div class="h-5 rounded-full flex items-center justify-end pr-2" style="width:'+Math.max(barPct,8)+'%;background:#EF7D00"><span class="text-[9px] font-bold text-white">'+booked+'</span></div>';
    else html += '<div class="h-5 flex items-center pl-2"><span class="text-[9px]" style="color:var(--c-dim)">0</span></div>';
    html += '</div>';
    html += '<div class="text-[9px] w-8 text-right" style="color:var(--c-dim)">'+barPct+'%</div>';
    html += '</div>';
});
html += '</div>';

// Status breakdown
html += '<div class="vit-card p-4">';
html += '<div class="text-sm font-bold mb-4" style="color:var(--c-text)">Status nächste 7 Tage</div>';
days7.forEach(function(day) {
    var ds = day.toISOString().split('T')[0];
    var off = BK.filter(function(b){return b.booking_date===ds&&b.status==='office'}).length;
    var rem = BK.filter(function(b){return b.booking_date===ds&&b.status==='remote'}).length;
    var none = Math.max(0,totalU-off-rem);
    var dn = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    var isT = ds===todayStr();
    html += '<div class="flex items-center gap-2 mb-2">';
    html += '<div class="text-[10px] font-bold w-14" style="color:'+(isT?'#EF7D00':'var(--c-muted)')+'">'+(isT?'Heute':dn[day.getDay()]+' '+day.getDate()+'.')+'</div>';
    html += '<div class="flex-1 flex h-5 rounded-full overflow-hidden" style="background:var(--c-bg3)">';
    var total = off+rem+none || 1;
    if(off>0) html += '<div class="h-5 flex items-center justify-center" style="width:'+Math.round(off/total*100)+'%;background:#EF7D00"><span class="text-[9px] font-bold text-white">'+off+'</span></div>';
    if(rem>0) html += '<div class="h-5 flex items-center justify-center" style="width:'+Math.round(rem/total*100)+'%;background:#93c5fd"><span class="text-[9px] font-bold" style="color:#1e40af">'+rem+'</span></div>';
    html += '</div>';
    html += '</div>';
});
html += '<div class="flex gap-4 mt-3 text-[10px]" style="color:var(--c-muted)"><span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full" style="background:#EF7D00"></span> Büro</span><span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full" style="background:#93c5fd"></span> Remote</span><span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full" style="background:var(--c-bg3)"></span> Offen</span></div>';
html += '</div>';

html += '</div>';

// Room breakdown
html += '<div class="vit-card p-4">';
html += '<div class="text-sm font-bold mb-3" style="color:var(--c-text)">Belegung nach Raum</div>';
var rooms = {};
D.forEach(function(d) { if(!rooms[d.room]) rooms[d.room] = {total:0, used:0}; rooms[d.room].total++; if(deskCI(d.nr)) rooms[d.room].used++; });
Object.keys(rooms).forEach(function(name) {
    var r = rooms[name];
    var rPct = r.total>0 ? Math.round(r.used/r.total*100) : 0;
    html += '<div class="flex items-center gap-2 mb-2">';
    html += '<div class="text-[10px] font-bold w-24 truncate" style="color:var(--c-muted)">'+name+'</div>';
    html += '<div class="flex-1 h-4 rounded-full" style="background:var(--c-bg3)">';
    if(rPct>0) html += '<div class="h-4 rounded-full" style="width:'+Math.max(rPct,5)+'%;background:#22c55e"></div>';
    html += '</div>';
    html += '<div class="text-[10px] w-16 text-right" style="color:var(--c-dim)">'+r.used+'/'+r.total+'</div>';
    html += '</div>';
});
html += '</div>';

el.innerHTML = html;
}

// ===== TAB SWITCHING =====
window.showOfficeTab = function(tab) {
TAB = tab;
var tabs = ['home','plan','woche','laden','analytics'];
tabs.forEach(function(t) {
    var btn = document.getElementById('officeTab'+t.charAt(0).toUpperCase()+t.slice(1));
    var ct = document.getElementById('office'+t.charAt(0).toUpperCase()+t.slice(1)+'Content');
    if(btn) {
        if(t===tab) { btn.style.borderColor='#EF7D00'; btn.style.color='#EF7D00'; }
        else { btn.style.borderColor='transparent'; btn.style.color='var(--c-sub)'; }
    }
    if(ct) ct.style.display = t===tab ? '' : 'none';
});
render();
};

// ===== ACTIONS =====
window.officeToggleCheckin = function() {
var ci = myCI();
if(ci) officeDoCheckout(); else showCheckinDD();
};

window.officeDoCheckout = async function() {
try {
    var r = await _sb().rpc('office_checkout');
    if(r.error) throw r.error;
    _showToast('Ausgecheckt', 'success');
    await load(); render();
} catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

export function showCheckinDD() {
var btn = document.querySelector('[onclick="officeToggleCheckin()"]');
if(!btn) return;
var rect = btn.getBoundingClientRect();
var dd = document.getElementById('officeCheckinDropdown');
var freeD = D.filter(function(d){ return !deskCI(d.nr) && d.room!=='Konferenz'; });

var h = '<div class="vit-card p-3 shadow-xl" style="width:450px;max-height:500px;overflow-y:auto">';
h += '<div class="text-xs font-bold mb-2" style="color:var(--c-muted)">Wo arbeitest du heute?</div>';
h += '<button onclick="officeCheckinRemote()" class="w-full p-2.5 rounded-lg text-left text-sm font-semibold mb-2 hover:shadow transition" style="background:#eff6ff;color:#3b82f6">🏠 Remote</button>';
h += '<div class="text-[10px] font-bold mb-1" style="color:var(--c-muted)">🏢 Platz wählen:</div>';
// Mini floor plan
h += '<div style="position:relative;border-radius:6px;overflow:hidden;border:1px solid var(--c-border)">';
h += '<img src="grundriss_og.png" style="width:100%;display:block;opacity:0.9">';
D.forEach(function(d) {
    if(!d.pct_x || !d.pct_y || d.room==='Konferenz') return;
    var occupied = !!deskCI(d.nr);
    var bg = occupied ? '#ef4444' : '#22c55e';
    var cursor = occupied ? 'not-allowed' : 'pointer';
    var click = occupied ? '' : 'onclick="officeCheckinDesk('+d.nr+')"';
    h += '<div '+click+' style="position:absolute;left:'+d.pct_x+'%;top:'+d.pct_y+'%;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:'+bg+';border:1.5px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#fff;cursor:'+cursor+';opacity:'+(occupied?'0.5':'1')+'" title="#'+d.nr+' '+(d.room||'')+'">'+d.nr+'</div>';
});
h += '</div>';
h += '<div class="flex items-center gap-3 mt-1.5 text-[9px]" style="color:var(--c-muted)"><span>🟢 Frei</span><span>🔴 Belegt</span></div>';
h += '<button onclick="officeCloseDD()" class="w-full mt-2 p-1.5 rounded text-xs text-center" style="color:var(--c-muted)">Abbrechen</button></div>';

dd.innerHTML = h;
dd.style.display = 'block';
dd.style.top = (rect.bottom+4)+'px';
dd.style.right = Math.max(8,window.innerWidth-rect.right)+'px';
setTimeout(function(){ document.addEventListener('click', closeDDH); }, 100);
}
export function closeDDH(e) { var dd=document.getElementById('officeCheckinDropdown'); if(dd&&!dd.contains(e.target)) officeCloseDD(); }
window.officeCloseDD = function() { document.getElementById('officeCheckinDropdown').style.display='none'; document.removeEventListener('click',closeDDH); };

window.officeCheckinDesk = async function(nr) {
officeCloseDD();
try { var r=await _sb().rpc('office_checkin',{p_status:'office',p_desk_nr:nr}); if(r.error)throw r.error; if(r.data&&r.data.error){_showToast(r.data.error,'error');return;} _showToast('Eingecheckt an Platz #'+nr,'success'); await load(); render(); } catch(e){_showToast('Fehler: '+e.message,'error');}
};
window.officeCheckinRemote = async function() {
officeCloseDD();
try { var r=await _sb().rpc('office_checkin',{p_status:'remote'}); if(r.error)throw r.error; if(r.data&&r.data.error){_showToast(r.data.error,'error');return;} _showToast('Remote eingecheckt','success'); await load(); render(); } catch(e){_showToast('Fehler: '+e.message,'error');}
};

// ===== BOOKING =====
window.officeShowBookingModal = function(ds) {
var freeD = D.filter(function(d){ return !deskBK(d.nr,ds) && d.room!=='Konferenz'; });
var bookedNrs = {};
BK.filter(function(b){return b.booking_date===ds}).forEach(function(b){if(b.desk_nr) bookedNrs[b.desk_nr]=b;});

var h = '<div style="background:rgba(0,0,0,0.5);position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999" onclick="officeCloseModal()">';
h += '<div class="vit-card p-5" style="width:700px;max-width:95vw;max-height:90vh;overflow-y:auto" onclick="event.stopPropagation()">';
h += '<div class="flex justify-between items-center mb-3"><h3 class="text-base font-bold" style="color:var(--c-text)">📅 '+fmtDL(ds)+'</h3><button onclick="officeCloseModal()" class="w-7 h-7 rounded flex items-center justify-center" style="background:var(--c-bg3);color:var(--c-muted)">✕</button></div>';
h += '<button onclick="officeBookDay(\''+ds+'\',\'remote\',null)" class="w-full p-3 rounded-lg text-left text-sm font-semibold mb-3 hover:shadow transition" style="background:#eff6ff;color:#3b82f6">🏠 Remote arbeiten</button>';

// Floor plan with clickable desks
h += '<div class="text-xs font-bold mb-2" style="color:var(--c-muted)">🏢 Platz auf dem Grundriss wählen:</div>';
h += '<div style="position:relative;border-radius:8px;overflow:hidden;border:1px solid var(--c-border)">';
h += '<img src="grundriss_og.png" style="width:100%;display:block;opacity:0.9">';
D.forEach(function(d) {
    if(!d.pct_x || !d.pct_y || d.room==='Konferenz') return;
    var isBooked = !!bookedNrs[d.nr];
    var isFree = !isBooked;
    var bg = isBooked ? '#ef4444' : '#22c55e';
    var cursor = isFree ? 'pointer' : 'not-allowed';
    var opacity = isFree ? '1' : '0.5';
    var click = isFree ? 'onclick="officeBookDay(\''+ds+'\',\'office\','+d.nr+')"' : '';
    var title = isFree ? 'Platz #'+d.nr+' buchen ('+d.room+')' : '#'+d.nr+' belegt von '+(bookedNrs[d.nr].user_name||'');
    h += '<div '+click+' style="position:absolute;left:'+d.pct_x+'%;top:'+d.pct_y+'%;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:'+bg+';border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#fff;cursor:'+cursor+';opacity:'+opacity+';z-index:5" title="'+title+'">'+d.nr+'</div>';
});
h += '</div>';
h += '<div class="flex items-center gap-4 mt-2 text-[10px]" style="color:var(--c-muted)"><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#22c55e;vertical-align:middle"></span> Frei</span><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;vertical-align:middle"></span> Belegt</span></div>';

if(freeD.length===0) h += '<p class="text-xs mt-2" style="color:#ef4444">Alle Plätze belegt</p>';
h += '</div></div>';
document.getElementById('officeBookingModal').innerHTML = h;
document.getElementById('officeBookingModal').style.display = 'block';
};
window.officeCloseModal = function() { document.getElementById('officeBookingModal').style.display='none'; };

window.officeBookDay = async function(ds,status,nr) {
officeCloseModal();
try {
    var r = await _sb().from('office_bookings').upsert({user_id:me(),booking_date:ds,status:status,desk_nr:nr},{onConflict:'user_id,booking_date'});
    if(r.error) throw r.error;
    _showToast((status==='remote'?'🏠 Remote':'🏢 Platz #'+(nr||'?'))+' gebucht für '+fmtD(ds),'success');
    await load(); render();
} catch(e) { _showToast('Fehler: '+e.message,'error'); }
};

window.officeDeleteBooking = async function(id) {
try { var r=await _sb().from('office_bookings').delete().eq('id',id); if(r.error) throw r.error; _showToast('Buchung storniert','success'); await load(); render(); } catch(e) { _showToast('Fehler: '+e.message,'error'); }
};

window.officeBookCharging = async function(ds,chId) {
try {
    var r = await _sb().from('office_bookings').insert({user_id:me(),booking_date:ds,status:'charging',note:'charging_'+chId});
    if(r.error) throw r.error;
    _showToast('⚡ Ladeplatz gebucht','success');
    await load(); render();
} catch(e) { _showToast('Fehler: '+e.message,'error'); }
};

// ===== WEEK NAVIGATION =====
window.officeWeekNav = function(dir) { if(dir===0) WEEK_OFFSET=0; else WEEK_OFFSET+=dir; render(); };
window.officeHomeNav = function(dir) { if(dir===0) HOME_OFFSET=0; else HOME_OFFSET+=dir; render(); };

// ===== LADEN CALENDAR =====
window.officeLadenMonthNav = function(dir) { LADEN_MONTH.setMonth(LADEN_MONTH.getMonth()+dir); render(); };
window.officeLadenSelectDay = function(ds) { LADEN_DAY = new Date(ds+'T00:00:00'); render(); };

// ===== BADGE =====
export function updateBadge() { var b=document.getElementById('officeOnlineBadge'); if(b){var c=CI.length; b.textContent=c; b.style.display=c>0?'inline':'none';} }

// ===== REALTIME =====
export function setupRT() {
_sb().channel('office-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'office_checkins'},async function(){await load();render();})
    .on('postgres_changes',{event:'*',schema:'public',table:'office_bookings'},async function(){await load();render();})
    .subscribe();
}

// ===== QR URL =====
export function checkQR() {
var p = new URLSearchParams(window.location.search);
var t = p.get('office_desk_token');
if(t) { window.history.replaceState({},'',window.location.pathname); var w=setInterval(function(){if(window.sb&&window.sbUser){clearInterval(w);handleQR(t);}},500); }
}
export async function handleQR(token) {
try { var r=await _sb().rpc('office_checkin',{p_status:'office',p_qr_token:token}); if(r.error) throw r.error; if(r.data&&r.data.error){_showToast(r.data.error,'error');return;} _showToast('QR Check-in: Platz #'+(r.data.desk_nr||'?'),'success'); if(typeof showView==='function') _showView('hqOffice'); await load(); render(); } catch(e){_showToast('QR Fehler: '+e.message,'error');}
}

// ===== STARTUP =====
var _sv = window.showView;
if(typeof _sv==='function') {
window.showView = function(v) { _sv(v); if(v==='hqOffice') init(); };
}
var _w=setInterval(function(){if(window.sb&&window.sbUser){clearInterval(_w);load().then(function(){updateBadge();});}},1000);
checkQR();

// Strangler Fig
const _exports = {init,load,me,myCI,deskCI,myBK,deskBK,dayBK,av,ini,fmtD,fmtDL,todayStr,isToday,workdays,userName,render,renderHero,renderHome,renderPlan,renderWoche,renderLaden,buildMiniCal,renderAnalytics,showCheckinDD,closeDDH,updateBadge,setupRT,checkQR,handleQR};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[office.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
