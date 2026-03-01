/**
 * views/kalender.js - Partner-Portal Kalender / Termine
 *
 * Handles: Calendar month/week/day views, Termin CRUD, recurring events,
 *          Teilnehmer management, MS365 sync placeholders
 *
 * Globals via safe helpers: sb, sbUser, sbProfile, escH, t
 *
 * @module views/kalender
 */

// -- safe access to globals --
function _sb()        { return window.sb; }
function _sbUser()    { return window.sbUser; }
function _sbProfile() { return window.sbProfile; }
function _escH(s)     { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)        { return typeof window.t === 'function' ? window.t(k) : k; }

// === KALENDER DATA & LOGIC (DB-backed) ===
var kalMonth = new Date().getMonth(); var kalYear = new Date().getFullYear();
var kalTermine = [];
var kalEditId = null;
var kalSelectedTeilnehmer = []; // Array of {id, name} for current modal
var kalStandortUsers = []; // Cached users for teilnehmer dropdown
var kalCurrentView = 'month'; // 'month' | 'week' | 'day'
var kalWeekStart = null; // Date object for Monday of current week
var kalDayDate = null; // Date object for current day view
var kalHourStart = 7; // First hour shown in week/day grids
var kalHourEnd = 20; // Last hour shown

export var typeColors = {beratung:'bg-blue-100 text-blue-700 border-blue-300',probefahrt:'bg-green-100 text-green-700 border-green-300',werkstatt:'bg-gray-200 text-gray-700 border-gray-300',meeting:'bg-purple-100 text-purple-700 border-purple-300',sonstig:'bg-orange-100 text-orange-700 border-orange-300',schulung:'bg-indigo-100 text-indigo-700 border-indigo-300',event:'bg-pink-100 text-pink-700 border-pink-300',deadline:'bg-red-100 text-red-700 border-red-300'};
export var typeLabels = {beratung:'Beratung',probefahrt:'Probefahrt',werkstatt:'Werkstatt',meeting:'Meeting',sonstig:'Sonstiges',schulung:'Schulung',event:'Event',deadline:'Deadline'};
var typeSolid = {beratung:'bg-blue-500',probefahrt:'bg-green-500',werkstatt:'bg-gray-500',meeting:'bg-purple-500',sonstig:'bg-orange-500',schulung:'bg-indigo-500',event:'bg-pink-500',deadline:'bg-red-500'};

// Init week/day to current
(function(){
    var now=new Date(); var day=now.getDay(); var diff=now.getDate()-day+(day===0?-6:1);
    kalWeekStart=new Date(now.getFullYear(),now.getMonth(),diff);
    kalDayDate=new Date(now.getFullYear(),now.getMonth(),now.getDate());
})();

// === VIEW SWITCHING ===
export function switchKalView(view){
    kalCurrentView=view;
    document.querySelectorAll('.kal-view-btn').forEach(function(b){b.className='kal-view-btn px-3 py-1.5 text-xs font-semibold rounded-md text-gray-500';});
    var btn=document.getElementById('kalViewBtn'+view.charAt(0).toUpperCase()+view.slice(1));
    if(btn)btn.className='kal-view-btn px-3 py-1.5 text-xs font-semibold rounded-md bg-white text-gray-800 shadow-sm';
    document.getElementById('kalMonthContainer').style.display=view==='month'?'':'none';
    document.getElementById('kalWeekContainer').style.display=view==='week'?'':'none';
    document.getElementById('kalDayContainer').style.display=view==='day'?'':'none';
    kalRenderActive();
}

// Unified navigation
export function kalNav(dir){
    if(kalCurrentView==='month'){kalMonth+=dir;if(kalMonth>11){kalMonth=0;kalYear++;}if(kalMonth<0){kalMonth=11;kalYear--;}
    }else if(kalCurrentView==='week'){kalWeekStart=new Date(kalWeekStart.getTime()+dir*7*86400000);
    }else if(kalCurrentView==='day'){kalDayDate=new Date(kalDayDate.getTime()+dir*86400000);}
    kalRenderActive();
}
export function kalGoToday(){
    var now=new Date();kalMonth=now.getMonth();kalYear=now.getFullYear();
    var day=now.getDay();var diff=now.getDate()-day+(day===0?-6:1);
    kalWeekStart=new Date(now.getFullYear(),now.getMonth(),diff);
    kalDayDate=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    kalRenderActive();
}

export function kalRenderActive(){
    kalUpdateNavTitle();
    if(kalCurrentView==='month')renderKalender();
    else if(kalCurrentView==='week')renderKalWeek();
    else if(kalCurrentView==='day')renderKalDay();
}

export function kalUpdateNavTitle(){
    var months=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    var dayNames=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    var title='';
    if(kalCurrentView==='month'){title=months[kalMonth]+' '+kalYear;}
    else if(kalCurrentView==='week'){
        var end=new Date(kalWeekStart.getTime()+6*86400000);
        if(kalWeekStart.getMonth()===end.getMonth()){
            title=kalWeekStart.getDate()+'. – '+end.getDate()+'. '+months[end.getMonth()]+' '+end.getFullYear();
        }else{
            title=kalWeekStart.getDate()+'. '+months[kalWeekStart.getMonth()].slice(0,3)+' – '+end.getDate()+'. '+months[end.getMonth()].slice(0,3)+' '+end.getFullYear();
        }
        // Add KW
        var d=new Date(Date.UTC(kalWeekStart.getFullYear(),kalWeekStart.getMonth(),kalWeekStart.getDate()));
        d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
        var yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
        var kw=Math.ceil((((d-yearStart)/86400000)+1)/7);
        title='KW '+kw+' · '+title;
    }
    else if(kalCurrentView==='day'){title=dayNames[kalDayDate.getDay()]+', '+kalDayDate.getDate()+'. '+months[kalDayDate.getMonth()]+' '+kalDayDate.getFullYear();}
    document.getElementById('kalNavTitle').textContent=title;
}

// === FILTERED TERMINE HELPER ===
export function kalGetFiltered(){
    var userFilter=(document.getElementById('kalFilterUser')||{}).value||'all';
    return kalTermine.filter(function(t){
        if(userFilter==='me' && sbProfile) return t.erstellt_von===(_sbUser() ?_sbUser().id:null) || t.user==='all';
        return true;
    });
}

// Helper: format date to YYYY-MM-DD
export function kalFmtDate(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

// === MONTH VIEW (enhanced existing) ===
export function renderKalender(){
    var filtered=kalGetFiltered();
    var firstDay=new Date(kalYear,kalMonth,1).getDay();
    firstDay=firstDay===0?6:firstDay-1;
    var daysInMonth=new Date(kalYear,kalMonth+1,0).getDate();
    var today=new Date(); var todayStr=kalFmtDate(today);
    var grid=document.getElementById('kalGrid'); var h='';

    for(var i=0;i<firstDay;i++) h+='<div class="min-h-[80px] border-b border-r border-gray-100 p-1 bg-gray-50"></div>';

    for(var d=1;d<=daysInMonth;d++){
        var dateStr=kalYear+'-'+String(kalMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
        var isToday=dateStr===todayStr;
        var dayTermine=filtered.filter(function(t){return t.date===dateStr;});
        h+='<div class="min-h-[80px] border-b border-r border-gray-100 p-1 cursor-pointer hover:bg-blue-50 transition '+(isToday?'bg-orange-50':'')
            +'" onclick="kalClickDay(\''+dateStr+'\')">';
        h+='<p class="text-xs font-bold '+(isToday?'text-vit-orange':'text-gray-600')+'">'+d+'</p>';
        var shown=0;
        dayTermine.forEach(function(t){
            if(shown<3){
                var cls=typeColors[t.type]||'bg-gray-100 text-gray-600';
                h+='<div onclick="event.stopPropagation();openTerminDetail(\''+t.id+'\')" class="mt-0.5 px-1 py-0.5 rounded text-[9px] font-semibold truncate border cursor-pointer hover:opacity-80 '+cls+'" title="'+_escH(t.title)+'">'+
                    (t.ganztaegig?'◆':t.time.slice(0,5))+' '+_escH(t.title.slice(0,15))+'</div>';
            }
            shown++;
        });
        if(dayTermine.length>3) h+='<p class="text-[9px] text-gray-400 mt-0.5">+'+(dayTermine.length-3)+' weitere</p>';
        h+='</div>';
    }
    grid.innerHTML=h;

    // Upcoming list
    var todayStrUp=kalFmtDate(new Date());
    var upcoming=filtered.filter(function(t){return t.date>=todayStrUp;}).sort(function(a,b){return a.date>b.date?1:-1;}).slice(0,8);
    var uEl=document.getElementById('kalUpcoming'); var uh='';
    var dayNamesShort=['So','Mo','Di','Mi','Do','Fr','Sa'];
    upcoming.forEach(function(t){
        var cls=typeColors[t.type]||'bg-gray-100 text-gray-600';
        var dd=new Date(t.date); var dayName=dayNamesShort[dd.getDay()];
        uh+='<div class="vit-card p-3 flex items-center space-x-3 cursor-pointer hover:shadow-md transition" onclick="openTerminDetail(\''+t.id+'\')">';
        uh+='<div class="text-center flex-shrink-0 w-12"><p class="text-xs text-gray-500">'+dayName+'</p><p class="text-lg font-bold text-gray-800">'+parseInt(t.date.slice(8))+'</p><p class="text-[10px] text-gray-400">'+t.date.slice(5,7)+'</p></div>';
        uh+='<div class="flex-1 min-w-0"><p class="font-semibold text-gray-800 text-sm truncate">'+_escH(t.title)+'</p><p class="text-xs text-gray-500">'+(t.ganztaegig?'Ganztägig':t.time+' Uhr'+(t.endTime?' – '+t.endTime+' Uhr':''))+(t.ort?' · '+_escH(t.ort):'')+(t.user!=='all'?' · '+_escH(t.user):'')+'</p>';
        // Teilnehmer
        if(t.teilnehmer && t.teilnehmer.length > 0) {
            uh+='<p class="text-[10px] text-gray-400 mt-0.5">👥 '+t.teilnehmer.map(function(tn){return _escH(typeof tn==='object'?tn.name:tn);}).join(', ')+'</p>';
        }
        uh+='</div>';
        uh+='<div class="flex flex-col items-end space-y-1">';
        uh+='<span class="text-[10px] px-2 py-0.5 rounded-full font-semibold '+cls+'">'+typeLabels[t.type]+'</span>';
        if(t.serie_id) uh+='<span class="text-[10px] text-gray-400" title="Serie">🔁</span>';
        if(t.ms365_event_id) uh+='<span class="text-[10px] text-blue-500" title="Synced with MS365">📅</span>';
        uh+='</div>';
        uh+='</div>';
    });
    uEl.innerHTML=uh||'<div class="text-center py-4 text-gray-400 text-sm">Keine anstehenden Termine.</div>';
}

// Click on day in month view → switch to day view
export function kalClickDay(dateStr){
    kalDayDate=new Date(dateStr+'T12:00:00');
    switchKalView('day');
}

// === WEEK VIEW ===
export function renderKalWeek(){
    var filtered=kalGetFiltered();
    var todayStr=kalFmtDate(new Date());
    var dayNamesShort=['Mo','Di','Mi','Do','Fr','Sa','So'];

    // Build day columns
    var weekDays=[];
    for(var i=0;i<7;i++){
        var d=new Date(kalWeekStart.getTime()+i*86400000);
        weekDays.push({date:kalFmtDate(d),dayObj:d,label:dayNamesShort[i]+' '+d.getDate()+'.',isToday:kalFmtDate(d)===todayStr});
    }

    // Update headers
    for(var i=0;i<7;i++){
        var hEl=document.getElementById('kalWeekHead'+i);
        if(hEl){
            hEl.textContent=weekDays[i].label;
            hEl.className='py-2 text-center text-xs font-semibold '+(weekDays[i].isToday?'text-vit-orange bg-orange-50':'text-gray-600')+(i>=5?' text-orange-400':'');
        }
    }

    // All-day events
    var hasAllDay=false;
    for(var i=0;i<7;i++){
        var adEl=document.getElementById('kalWeekAllDay'+i);
        if(!adEl)continue;
        var adTerms=filtered.filter(function(t){return t.date===weekDays[i].date && t.ganztaegig;});
        var ah='';
        adTerms.forEach(function(t){
            var cls=typeColors[t.type]||'bg-gray-100 text-gray-600';
            ah+='<div onclick="openTerminDetail(\''+t.id+'\')" class="px-1 py-0.5 rounded text-[9px] font-semibold truncate border cursor-pointer hover:opacity-80 '+cls+'" title="'+_escH(t.title)+'">'+_escH(t.title.slice(0,12))+'</div>';
        });
        adEl.innerHTML=ah;
        adEl.className='p-1.5 border-r border-b border-gray-100 min-h-[32px]'+(weekDays[i].isToday?' bg-orange-50':'');
        if(adTerms.length>0) hasAllDay=true;
    }
    document.getElementById('kalWeekAllDay').style.display=hasAllDay?'':'none';

    // Time grid
    var gridEl=document.getElementById('kalWeekGrid');
    var h='';
    for(var hour=kalHourStart;hour<=kalHourEnd;hour++){
        h+='<div class="grid grid-cols-8 border-b border-gray-50" style="min-height:60px;">';
        h+='<div class="p-1 border-r border-gray-200 text-[10px] text-gray-400 font-semibold text-right pr-2 pt-1 bg-gray-50/50">'+String(hour).padStart(2,'0')+':00</div>';
        for(var col=0;col<7;col++){
            var dateStr=weekDays[col].date;
            var cellTerms=filtered.filter(function(t){
                if(t.ganztaegig) return false;
                if(t.date!==dateStr) return false;
                var tHour=parseInt(t.time.split(':')[0]);
                return tHour===hour;
            });
            var bgCls=weekDays[col].isToday?'bg-orange-50/30':'';
            h+='<div class="border-r border-gray-100 p-0.5 cursor-pointer hover:bg-blue-50/50 relative '+bgCls+'" onclick="kalClickWeekCell(\''+dateStr+'\','+hour+')">';
            cellTerms.forEach(function(t){
                var solid=typeSolid[t.type]||'bg-gray-500';
                var durSlots=1;
                if(t.endTime){var eh=parseInt(t.endTime.split(':')[0]);durSlots=Math.max(1,eh-hour);}
                var heightPx=Math.min(durSlots*60,180);
                h+='<div onclick="event.stopPropagation();openTerminDetail(\''+t.id+'\')" class="'+solid+' text-white rounded px-1.5 py-1 mb-0.5 text-[10px] cursor-pointer hover:opacity-90 shadow-sm overflow-hidden" style="min-height:'+Math.max(24,heightPx-4)+'px;" title="'+_escH(t.title)+'">';
                h+='<p class="font-bold truncate">'+_escH(t.title)+'</p>';
                h+='<p class="opacity-80 truncate">'+t.time+(t.endTime?' – '+t.endTime:'')+(t.ort?' · '+_escH(t.ort):'')+'</p>';
                h+='</div>';
            });
            h+='</div>';
        }
        h+='</div>';
    }
    gridEl.innerHTML=h;

    // Scroll to current hour
    var nowHour=new Date().getHours();
    if(nowHour>=kalHourStart && nowHour<=kalHourEnd){
        var scrollTo=(nowHour-kalHourStart)*60;
        gridEl.scrollTop=Math.max(0,scrollTo-60);
    }
}

export function kalClickWeekCell(dateStr,hour){
    kalEditId=null;
    kalSelectedTeilnehmer=[];
    document.getElementById('kalNewTitle').value='';
    document.getElementById('kalNewDate').value=dateStr;
    document.getElementById('kalNewTime').value=String(hour).padStart(2,'0')+':00';
    document.getElementById('kalNewEndTime').value=String(Math.min(hour+1,23)).padStart(2,'0')+':00';
    document.getElementById('kalNewType').value='beratung';
    document.getElementById('kalNewNotes').value='';
    document.getElementById('kalNewOrt').value='';
    document.getElementById('kalNewGanztaegig').checked=false;
    var rptEl=document.getElementById('kalNewRepeat');if(rptEl)rptEl.value='';
    var rptEndEl=document.getElementById('kalNewRepeatEnd');if(rptEndEl)rptEndEl.value='';
    var rptRow=document.getElementById('kalRepeatEndRow');if(rptRow)rptRow.style.display='none';
    document.getElementById('kalTimeFields').style.display='';
    document.getElementById('kalModalTitle').textContent='Neuen Termin anlegen';
    document.getElementById('kalSaveBtn').textContent='Speichern';
    var delBtn=document.getElementById('kalDeleteBtn');if(delBtn)delBtn.style.display='none';
    kalRenderTeilnehmerChips();
    kalLoadTeilnehmerDropdown();
    document.getElementById('kalNewModal').classList.remove('hidden');
}

// === DAY VIEW ===
export function renderKalDay(){
    var filtered=kalGetFiltered();
    var dateStr=kalFmtDate(kalDayDate);
    var todayStr=kalFmtDate(new Date());
    var isToday=dateStr===todayStr;
    var dayTermine=filtered.filter(function(t){return t.date===dateStr;});
    var allDayTerms=dayTermine.filter(function(t){return t.ganztaegig;});
    var timedTerms=dayTermine.filter(function(t){return !t.ganztaegig;}).sort(function(a,b){return a.time>b.time?1:-1;});

    // All-day section
    var adEl=document.getElementById('kalDayAllDay');
    var adList=document.getElementById('kalDayAllDayList');
    if(allDayTerms.length>0){
        adEl.style.display='';
        var ah='';
        allDayTerms.forEach(function(t){
            var cls=typeColors[t.type]||'bg-gray-100 text-gray-600';
            ah+='<div onclick="openTerminDetail(\''+t.id+'\')" class="px-3 py-2 rounded-lg border cursor-pointer hover:shadow-sm transition '+cls+'"><span class="font-semibold text-sm">'+_escH(t.title)+'</span>'+(t.ort?' <span class="text-xs opacity-70">· '+_escH(t.ort)+'</span>':'')+'</div>';
        });
        adList.innerHTML=ah;
    }else{adEl.style.display='none';}

    // Hour grid
    var gridEl=document.getElementById('kalDayGrid');
    var h='';
    var nowHour=new Date().getHours();
    var nowMin=new Date().getMinutes();

    for(var hour=kalHourStart;hour<=kalHourEnd;hour++){
        var hourTerms=timedTerms.filter(function(t){return parseInt(t.time.split(':')[0])===hour;});
        var isNowHour=isToday&&hour===nowHour;
        h+='<div class="flex border-b border-gray-50 relative'+(isNowHour?' bg-orange-50/40':'')+'" style="min-height:72px;">';
        h+='<div class="w-16 flex-shrink-0 p-2 border-r border-gray-200 text-right pr-3 bg-gray-50/50"><span class="text-xs text-gray-400 font-semibold">'+String(hour).padStart(2,'0')+':00</span></div>';
        h+='<div class="flex-1 p-1 cursor-pointer hover:bg-blue-50/50 relative" onclick="kalClickWeekCell(\''+dateStr+'\','+hour+')">';

        hourTerms.forEach(function(t){
            var solid=typeSolid[t.type]||'bg-gray-500';
            var durMin=60;
            if(t.endTime){
                var sh=parseInt(t.time.split(':')[0]),sm=parseInt(t.time.split(':')[1]||0);
                var eh=parseInt(t.endTime.split(':')[0]),em=parseInt(t.endTime.split(':')[1]||0);
                durMin=Math.max(30,(eh*60+em)-(sh*60+sm));
            }
            var heightPx=Math.max(36,Math.round(durMin/60*72));
            h+='<div onclick="event.stopPropagation();openTerminDetail(\''+t.id+'\')" class="'+solid+' text-white rounded-lg px-3 py-2 mb-1 cursor-pointer hover:opacity-90 shadow-sm" style="min-height:'+heightPx+'px;">';
            h+='<p class="font-bold text-sm">'+_escH(t.title)+'</p>';
            h+='<p class="text-xs opacity-80">'+t.time+(t.endTime?' – '+t.endTime:'')+(t.ort?' · '+_escH(t.ort):'')+'</p>';
            if(t.notes)h+='<p class="text-xs opacity-70 mt-0.5 truncate">'+_escH(t.notes)+'</p>';
            h+='</div>';
        });

        // Now indicator
        if(isNowHour){
            var topPct=Math.round((nowMin/60)*72);
            h+='<div class="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none" style="top:'+topPct+'px;"><div class="w-2.5 h-2.5 bg-red-500 rounded-full -mt-1.5 -ml-1"></div></div>';
        }
        h+='</div></div>';
    }
    gridEl.innerHTML=h;

    // Scroll to now
    if(isToday&&nowHour>=kalHourStart&&nowHour<=kalHourEnd){
        gridEl.scrollTop=Math.max(0,(nowHour-kalHourStart)*72-72);
    }

    // Sidebar: list of day's termine
    var months=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    document.getElementById('kalDaySideTitle').textContent='Termine am '+kalDayDate.getDate()+'. '+months[kalDayDate.getMonth()];
    var sideEl=document.getElementById('kalDaySideList');
    if(dayTermine.length===0){sideEl.innerHTML='<p class="text-sm text-gray-400">Keine Termine an diesem Tag.</p>';
    }else{
        var sh='';
        dayTermine.sort(function(a,b){if(a.ganztaegig&&!b.ganztaegig)return -1;if(!a.ganztaegig&&b.ganztaegig)return 1;return a.time>b.time?1:-1;});
        dayTermine.forEach(function(t){
            var cls=typeColors[t.type]||'bg-gray-100 text-gray-600';
            var solid=typeSolid[t.type]||'bg-gray-500';
            sh+='<div onclick="openTerminDetail(\''+t.id+'\')" class="flex items-start space-x-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">';
            sh+='<div class="w-1 rounded-full self-stretch flex-shrink-0 mt-0.5 '+solid+'"></div>';
            sh+='<div class="flex-1 min-w-0"><p class="font-semibold text-sm text-gray-800 truncate">'+_escH(t.title)+'</p>';
            sh+='<p class="text-xs text-gray-500">'+(t.ganztaegig?'Ganztägig':t.time+(t.endTime?' – '+t.endTime:''))+'</p>';
            if(t.ort)sh+='<p class="text-xs text-gray-400">📍 '+_escH(t.ort)+'</p>';
            if(t.teilnehmer && t.teilnehmer.length > 0) sh+='<p class="text-[10px] text-gray-400">👥 '+t.teilnehmer.map(function(tn){return _escH(typeof tn==="object"?tn.name:tn);}).join(", ")+'</p>';
            sh+='</div><span class="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 '+cls+'">'+typeLabels[t.type]+'</span></div>';
        });
        sideEl.innerHTML=sh;
    }

    // Stats
    var statsEl=document.getElementById('kalDayStats');
    var typeCount={};dayTermine.forEach(function(t){typeCount[t.type]=(typeCount[t.type]||0)+1;});
    var statH='<p><span class="font-semibold text-gray-800">'+dayTermine.length+'</span> Termine gesamt</p>';
    Object.keys(typeCount).forEach(function(k){
        statH+='<div class="flex items-center space-x-2"><div class="w-2 h-2 rounded-full '+(typeSolid[k]||'bg-gray-400')+'"></div><span>'+typeCount[k]+'× '+typeLabels[k]+'</span></div>';
    });
    var totalMin=0;timedTerms.forEach(function(t){
        if(t.endTime){var sh=parseInt(t.time.split(':')[0]),sm=parseInt(t.time.split(':')[1]||0),eh=parseInt(t.endTime.split(':')[0]),em=parseInt(t.endTime.split(':')[1]||0);totalMin+=(eh*60+em)-(sh*60+sm);}
    });
    if(totalMin>0){var hrs=Math.floor(totalMin/60);var mins=totalMin%60;statH+='<p class="mt-1">⏱️ Verplante Zeit: <span class="font-semibold">'+(hrs>0?hrs+'h ':'')+(mins>0?mins+'min':'')+'</span></p>';}
    statsEl.innerHTML=statH;
}

export async function loadKalTermine() {
    // In demo mode, termine are injected by fillDemoWidgets
    if (window.DEMO_ACTIVE) { kalRenderActive(); return; }
    try {
        var query = _sb().from('termine').select('*').order('start_zeit', {ascending:true});
        if(_sbProfile() && _sbProfile().standort_id && !_sbProfile().is_hq) query = query.eq('standort_id', _sbProfile().standort_id);
        var resp = await query;
        if(!resp.error) {
            kalTermine = (resp.data||[]).map(function(t) {
                var d = new Date(t.start_zeit);
                var endTime = t.end_zeit ? new Date(t.end_zeit) : null;
                return {
                    id: t.id, title: t.titel, 
                    date: d.toISOString().slice(0,10),
                    time: t.ganztaegig ? '00:00' : String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'),
                    endTime: endTime ? String(endTime.getHours()).padStart(2,'0')+':'+String(endTime.getMinutes()).padStart(2,'0') : null,
                    type: t.typ || 'sonstig',
                    user: t.erstellt_von_name || 'all',
                    notes: t.beschreibung || '',
                    ort: t.ort || '',
                    ganztaegig: t.ganztaegig || false,
                    erstellt_von: t.erstellt_von,
                    teilnehmer: t.teilnehmer || [],
                    wiederholung: t.wiederholung || '',
                    wiederholung_bis: t.wiederholung_bis || null,
                    serie_id: t.serie_id || null,
                    ms365_event_id: t.ms365_event_id || null,
                    ms365_sync_status: t.ms365_sync_status || null
                };
            });
        } else { kalTermine = []; }
    } catch(e) { console.warn('Kalender load:', e); kalTermine = []; }
    kalRenderActive();
}

export function kalNavMonth(d){kalNav(d);}

// Open day view to quickly add termin on that date
export function openKalDayModal(dateStr) {
    kalEditId = null;
    kalSelectedTeilnehmer = [];
    document.getElementById('kalNewTitle').value = '';
    document.getElementById('kalNewDate').value = dateStr;
    document.getElementById('kalNewTime').value = '09:00';
    document.getElementById('kalNewEndTime').value = '10:00';
    document.getElementById('kalNewType').value = 'beratung';
    document.getElementById('kalNewNotes').value = '';
    document.getElementById('kalNewOrt').value = '';
    document.getElementById('kalNewGanztaegig').checked = false;
    var rptEl=document.getElementById('kalNewRepeat'); if(rptEl) rptEl.value='';
    var rptEndEl=document.getElementById('kalNewRepeatEnd'); if(rptEndEl) rptEndEl.value='';
    var rptRow=document.getElementById('kalRepeatEndRow'); if(rptRow) rptRow.style.display='none';
    var rptInfo=document.getElementById('kalRepeatInfo'); if(rptInfo) rptInfo.textContent='';
    document.getElementById('kalModalTitle').textContent = 'Neuen Termin anlegen';
    document.getElementById('kalSaveBtn').textContent = 'Speichern';
    var delBtn = document.getElementById('kalDeleteBtn');
    if(delBtn) delBtn.style.display = 'none';
    kalRenderTeilnehmerChips();
    kalLoadTeilnehmerDropdown();
    document.getElementById('kalNewModal').classList.remove('hidden');
}

// Open termin detail/edit
export function openTerminDetail(terminId) {
    var t = kalTermine.find(function(x){ return x.id == terminId; });
    if(!t) return;
    kalEditId = t.id;
    kalSelectedTeilnehmer = (t.teilnehmer || []).map(function(tn) {
        return typeof tn === 'object' ? tn : {id: tn, name: tn};
    });
    document.getElementById('kalNewTitle').value = t.title;
    document.getElementById('kalNewDate').value = t.date;
    document.getElementById('kalNewTime').value = t.time || '09:00';
    document.getElementById('kalNewEndTime').value = t.endTime || '';
    document.getElementById('kalNewType').value = t.type;
    document.getElementById('kalNewNotes').value = t.notes || '';
    document.getElementById('kalNewOrt').value = t.ort || '';
    document.getElementById('kalNewGanztaegig').checked = t.ganztaegig || false;
    var rptEl=document.getElementById('kalNewRepeat'); if(rptEl) rptEl.value=t.wiederholung||'';
    var rptEndEl=document.getElementById('kalNewRepeatEnd'); if(rptEndEl) rptEndEl.value=t.wiederholung_bis||'';
    kalToggleRepeatEnd();
    document.getElementById('kalModalTitle').textContent = 'Termin bearbeiten';
    document.getElementById('kalSaveBtn').textContent = 'Aktualisieren';
    var delBtn = document.getElementById('kalDeleteBtn');
    if(delBtn) delBtn.style.display = '';
    kalRenderTeilnehmerChips();
    kalLoadTeilnehmerDropdown();
    document.getElementById('kalNewModal').classList.remove('hidden');
}

export async function saveKalTermin(){
    var title=document.getElementById('kalNewTitle').value;
    var date=document.getElementById('kalNewDate').value;
    var time=document.getElementById('kalNewTime').value||'09:00';
    var endTime=document.getElementById('kalNewEndTime').value||null;
    var type=document.getElementById('kalNewType').value;
    var notes=document.getElementById('kalNewNotes').value;
    var ort=document.getElementById('kalNewOrt').value;
    var ganztaegig=document.getElementById('kalNewGanztaegig').checked;
    var repeat=document.getElementById('kalNewRepeat').value||'';
    var repeatEnd=document.getElementById('kalNewRepeatEnd').value||null;
    if(!title||!date){alert(_t('misc_enter_title_date'));return;}

    var startZeit = date+'T'+time+':00';
    var endZeit = endTime ? date+'T'+endTime+':00' : null;
    var teilnehmerData = kalSelectedTeilnehmer.map(function(tn){ return {id:tn.id, name:tn.name}; });

    var payload = {
        titel: title, start_zeit: startZeit, end_zeit: endZeit,
        typ: type, beschreibung: notes, ort: ort, ganztaegig: ganztaegig,
        erstellt_von: _sbUser() ? _sbUser().id : null,
        erstellt_von_name: _sbProfile() ? _sbProfile().name : 'Unbekannt',
        standort_id: _sbProfile() ? _sbProfile().standort_id : null,
        teilnehmer: teilnehmerData,
        wiederholung: repeat || null,
        wiederholung_bis: repeatEnd || null
    };

    try {
        if(kalEditId) {
            var resp = await _sb().from('termine').update(payload).eq('id', kalEditId);
            if(resp.error) throw resp.error;
        } else {
            // Generate serie_id for repeating events
            if(repeat && repeatEnd) {
                var serieId = 'serie_' + Date.now();
                payload.serie_id = serieId;
                var dates = kalGenerateRepeatDates(date, repeat, repeatEnd);
                var inserts = dates.map(function(d) {
                    var p = JSON.parse(JSON.stringify(payload));
                    p.start_zeit = d + 'T' + time + ':00';
                    p.end_zeit = endTime ? d + 'T' + endTime + ':00' : null;
                    return p;
                });
                if(inserts.length > 100) { alert(_t('misc_max_repeat')); return; }
                var resp = await _sb().from('termine').insert(inserts);
                if(resp.error) throw resp.error;
            } else {
                var resp = await _sb().from('termine').insert(payload);
                if(resp.error) throw resp.error;
            }
        }
        document.getElementById('kalNewModal').classList.add('hidden');
        kalEditId = null;
        kalSelectedTeilnehmer = [];
        await loadKalTermine();
    } catch(err) { alert('Fehler: '+(err.message||err)); }
}

// Generate repeat dates array
export function kalGenerateRepeatDates(startDate, repeat, endDate) {
    var dates = [];
    var current = new Date(startDate + 'T12:00:00');
    var end = new Date(endDate + 'T12:00:00');
    var maxIterations = 200;
    var i = 0;
    while(current <= end && i < maxIterations) {
        dates.push(kalFmtDate(current));
        if(repeat === 'taeglich') current.setDate(current.getDate() + 1);
        else if(repeat === 'woechentlich') current.setDate(current.getDate() + 7);
        else if(repeat === '2wochen') current.setDate(current.getDate() + 14);
        else if(repeat === 'monatlich') current.setMonth(current.getMonth() + 1);
        else break;
        i++;
    }
    return dates;
}

// Toggle repeat end date visibility + calculate count preview
export function kalToggleRepeatEnd() {
    var repeatEl = document.getElementById('kalNewRepeat');
    var endRow = document.getElementById('kalRepeatEndRow');
    if(!repeatEl || !endRow) return;
    var repeat = repeatEl.value;
    if(repeat) {
        endRow.style.display = '';
        kalUpdateRepeatInfo();
    } else {
        endRow.style.display = 'none';
    }
}

export function kalUpdateRepeatInfo() {
    var repeat = document.getElementById('kalNewRepeat').value;
    var startDate = document.getElementById('kalNewDate').value;
    var endDate = document.getElementById('kalNewRepeatEnd').value;
    var infoEl = document.getElementById('kalRepeatInfo');
    if(!repeat || !startDate || !endDate) { infoEl.textContent = ''; return; }
    var dates = kalGenerateRepeatDates(startDate, repeat, endDate);
    infoEl.textContent = dates.length + ' Termine';
}

// Teilnehmer management
export async function kalLoadTeilnehmerDropdown() {
    var select = document.getElementById('kalNewTeilnehmer');
    if(!select) return;
    // Load users if not cached
    if(kalStandortUsers.length === 0) {
        try {
            var q = _sb().from('users').select('id, vorname, nachname, rolle').eq('status', 'aktiv');
            if(_sbProfile() && _sbProfile().standort_id && !_sbProfile().is_hq) q = q.eq('standort_id', _sbProfile().standort_id);
            var res = await q;
            kalStandortUsers = (res.data || []).map(function(u) {
                return { id: u.id, name: ((u.vorname || '') + ' ' + (u.nachname || '')).trim() || 'Unbekannt', rolle: u.rolle };
            });
        } catch(e) { console.warn('Teilnehmer laden:', e); }
    }
    var h = '<option value="">+ Teilnehmer hinzufügen...</option>';
    kalStandortUsers.forEach(function(u) {
        // Don't show users already selected
        var already = kalSelectedTeilnehmer.find(function(tn) { return tn.id === u.id; });
        if(!already) {
            h += '<option value="' + u.id + '">' + _escH(u.name) + (u.rolle ? ' (' + u.rolle + ')' : '') + '</option>';
        }
    });
    select.innerHTML = h;
}

export function kalAddTeilnehmer() {
    var select = document.getElementById('kalNewTeilnehmer');
    var userId = select.value;
    if(!userId) return;
    var user = kalStandortUsers.find(function(u) { return u.id === userId; });
    if(!user) return;
    kalSelectedTeilnehmer.push({ id: user.id, name: user.name });
    kalRenderTeilnehmerChips();
    kalLoadTeilnehmerDropdown(); // refresh to remove selected
    select.value = '';
}

export function kalRemoveTeilnehmer(userId) {
    kalSelectedTeilnehmer = kalSelectedTeilnehmer.filter(function(tn) { return tn.id !== userId; });
    kalRenderTeilnehmerChips();
    kalLoadTeilnehmerDropdown();
}

export function kalRenderTeilnehmerChips() {
    var container = document.getElementById('kalTeilnehmerList');
    if(!container) return;
    if(kalSelectedTeilnehmer.length === 0) { container.innerHTML = '<span class="text-xs text-gray-400">Keine Teilnehmer zugewiesen</span>'; return; }
    var h = '';
    kalSelectedTeilnehmer.forEach(function(tn) {
        h += '<span class="inline-flex items-center space-x-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">';
        h += '<span>' + _escH(tn.name) + '</span>';
        h += '<button onclick="kalRemoveTeilnehmer(\'' + tn.id + '\')" class="text-blue-400 hover:text-red-500 ml-0.5">×</button>';
        h += '</span>';
    });
    container.innerHTML = h;
}

export async function deleteKalTermin() {
    if(!kalEditId) return;
    var t = kalTermine.find(function(x){ return x.id == kalEditId; });

    if(t && t.serie_id) {
        var choice = prompt('Dieser Termin gehört zu einer Serie.\n\n1 = Nur diesen Termin löschen\n2 = Alle Termine der Serie löschen\n\nBitte 1 oder 2 eingeben:', '1');
        if(!choice) return;
        try {
            if(choice === '2') {
                var resp = await _sb().from('termine').delete().eq('serie_id', t.serie_id).select();
                if(resp.error) throw resp.error;
                if(!resp.data || resp.data.length === 0) throw new Error('Löschen fehlgeschlagen – evtl. fehlende Berechtigung. Bitte Admin kontaktieren.');
            } else {
                var resp = await _sb().from('termine').delete().eq('id', kalEditId).select();
                if(resp.error) throw resp.error;
                if(!resp.data || resp.data.length === 0) throw new Error('Löschen fehlgeschlagen – evtl. fehlende Berechtigung. Bitte Admin kontaktieren.');
            }
            document.getElementById('kalNewModal').classList.add('hidden');
            kalEditId = null;
            await loadKalTermine();
        } catch(err) { alert('Fehler: '+(err.message||err)); }
    } else {
        if(!confirm(_t('confirm_delete_event'))) return;
        try {
            var resp = await _sb().from('termine').delete().eq('id', kalEditId).select();
            if(resp.error) throw resp.error;
            if(!resp.data || resp.data.length === 0) throw new Error('Löschen fehlgeschlagen – evtl. fehlende Berechtigung. Bitte Admin kontaktieren.');
            document.getElementById('kalNewModal').classList.add('hidden');
            kalEditId = null;
            await loadKalTermine();
        } catch(err) { alert('Fehler: '+(err.message||err)); }
    }
}

// === MS365 CALENDAR SYNC PREPARATION ===
// Data model: termine table has ms365_event_id and ms365_sync_status columns
// Sync flow: 
//   1. User connects MS365 account (OAuth2 via Azure AD)
//   2. On termin create/update/delete → push to MS365 Graph API
//   3. Periodic pull from MS365 → merge into termine table
//   4. Conflict resolution: last-write-wins with ms365_last_synced timestamp
//
// Graph API endpoints:
//   POST   /me/events                    → Create event
//   PATCH  /me/events/{id}               → Update event  
//   DELETE /me/events/{id}               → Delete event
//   GET    /me/calendarView?startDateTime=&endDateTime= → Pull events
//
// Required Azure AD app permissions: Calendars.ReadWrite
//
// Implementation: Supabase Edge Function that:
//   1. Receives webhook from termine table changes
//   2. Calls MS Graph API with user's OAuth token
//   3. Stores ms365_event_id back in termine row
//   4. Cron job for periodic bidirectional sync

export async function syncTerminToMs365(terminId) {
    // Placeholder: will be implemented via Supabase Edge Function
    var t = kalTermine.find(function(x){ return x.id == terminId; });
    if(!t) return;
    // [prod] log removed
    // Future: await _sb().functions.invoke('ms365-calendar-sync', { body: { action: 'push', termin_id: terminId } });
}

export async function pullMs365Events() {
    // Placeholder: pull events from MS365 and merge into termine table
    // [prod] log removed
    // Future: var resp = await _sb().functions.invoke('ms365-calendar-sync', { body: { action: 'pull' } });
}


// Strangler Fig: window.* registration for onclick compatibility
const _exports = {switchKalView,kalNav,kalGoToday,kalRenderActive,kalUpdateNavTitle,kalGetFiltered,kalFmtDate,renderKalender,renderKalWeek,renderKalDay,loadKalTermine,kalClickDay,kalNavMonth,kalClickWeekCell,openKalDayModal,openTerminDetail,saveKalTermin,deleteKalTermin,kalGenerateRepeatDates,kalToggleRepeatEnd,kalUpdateRepeatInfo,kalLoadTeilnehmerDropdown,kalAddTeilnehmer,kalRemoveTeilnehmer,kalRenderTeilnehmerChips,syncTerminToMs365,pullMs365Events};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
// [prod] log removed

// === Window Exports (onclick handlers) ===
window.deleteKalTermin = deleteKalTermin;
window.kalAddTeilnehmer = kalAddTeilnehmer;
window.kalGoToday = kalGoToday;
window.kalNav = kalNav;
window.kalToggleRepeatEnd = kalToggleRepeatEnd;
window.kalUpdateRepeatInfo = kalUpdateRepeatInfo;
window.openKalDayModal = openKalDayModal;
window.saveKalTermin = saveKalTermin;
window.switchKalView = switchKalView;
window.loadKalTermine = loadKalTermine;
