/**
function _sb() { return window.sb; }
 * views/office-stats.js — Statistik tab with gamification
 * @module views/office-stats
 */

// Access shared state
function _off() { return window._offState; }

async function renderStatistik() {
    var el=document.getElementById('officeTab_statistik');
    if(!el) return;
    var S=_off();
    el.innerHTML='<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';
    try {
        var now=new Date(), monthStart=new Date(now.getFullYear(),now.getMonth(),1);
        var thirtyAgo=new Date(now); thirtyAgo.setDate(now.getDate()-30);

        var [engRes,checkinsRes,desksRes,allEngRes]=await Promise.all([
            _sb().from('office_engagement').select('*').eq('user_id',sbUser.id).gte('month',S.fmtISO(monthStart)).limit(1),
            _sb().from('office_checkins').select('user_id,checked_in_at,status').gte('checked_in_at',S.fmtISO(thirtyAgo)+'T00:00:00'),
            _sb().from('office_desks').select('nr').eq('active',true).neq('desk_type','parkplatz'),
            _sb().from('office_engagement').select('user_id,office_days,current_streak,badges').gte('month',S.fmtISO(monthStart))
        ]);

        var eng=(engRes.data||[])[0]||{};
        var checkins=(checkinsRes.data||[]).filter(function(c){return c.status==='office';});
        var totalDesks=(desksRes.data||[]).length;
        var allEng=allEngRes.data||[];

        await S.loadHQUsers();
        var userMap={}; S.hqUsers.forEach(function(u){userMap[u.id]=u;});

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
            {key:'social_butterfly',icon:'\ud83e\udd8b',name:'Socializer',desc:'5+ verschiedene Pl\u00e4tze'},
            {key:'streak_5',icon:'\ud83d\udd25',name:'5er Streak',desc:'5 Tage am St\u00fcck im B\u00fcro'},
            {key:'streak_10',icon:'\u2b50',name:'10er Streak',desc:'10 Tage am St\u00fcck!'},
            {key:'host_hero',icon:'\ud83c\udf1f',name:'Host Hero',desc:'3+ G\u00e4ste gehostet'}
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
                        '<div class="w-7 h-7 rounded-full bg-vit-orange text-white flex items-center justify-center text-[10px] font-bold">'+S.initials(u)+'</div>'+
                        '<span class="text-sm font-semibold">'+S.esc(S.shortName(u))+(isMe?' <span class="text-vit-orange text-xs">(Du)</span>':'')+'</span>'+
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
        el.innerHTML='<div class="vit-card p-6 text-center text-red-500">Fehler: '+S.esc(err.message)+'</div>';
    }
}

export { renderStatistik };
window._offRenderStatistik = renderStatistik;
