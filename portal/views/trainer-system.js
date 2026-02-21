/**
 * views/trainer-system.js - Trainer Assignments, Interceptor Data, showView hooks
 * @module views/trainer-system
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// ── TRAINERS ──
var TRAINERS=[
{id:'t1',module:'verkauf',title:'Nachfass-Systematik',desc:'Offene Angebote systematisch nachfassen. Abschlussquote +10-15%.',trigger:'Abschlussquote unter Netzwerk-Ø',dur:'5 Min',steps:['Offene Angebote prüfen','Follow-Up-Template wählen','Innerhalb 48h anrufen'],task:'3 älteste Angebote heute nachfassen'},
{id:'t2',module:'controlling',title:'BWA richtig lesen',desc:'Wichtigste BWA-Kennzahlen verstehen und Maßnahmen ableiten.',trigger:'BWA hochgeladen',dur:'7 Min',steps:['Rohertragsmarge prüfen (>35%)','Personalkostenquote checken','1 Maßnahme ableiten'],task:'1 Maßnahme aus BWA-Analyse eintragen'},
{id:'t3',module:'marketing',title:'Content in 10 Minuten',desc:'Local-Hero-Video in unter 10 Minuten erstellen.',trigger:'Kein Content seit 14+ Tagen',dur:'3 Min',steps:['Thema wählen','30-Sek-Video aufnehmen','Im Portal hochladen'],task:'1 Local Hero Video diese Woche'},
{id:'t4',module:'werkstatt',title:'Durchlaufzeit optimieren',desc:'Durchlaufzeit reduzieren, Kundenzufriedenheit steigern.',trigger:'Durchlaufzeit über Schwellwert',dur:'5 Min',steps:['Engpässe identifizieren','Vorab-Diagnose einführen','Teile-Verfügbarkeit prüfen'],task:'Vorab-Diagnose bei Terminkunden testen'},
{id:'t5',module:'verkauf',title:'Lead-Qualifizierung',desc:'Leads systematisch bewerten und priorisieren. Fokus auf kaufbereite Kunden.',trigger:'Leads/Woche unter Mindestwert',dur:'4 Min',steps:['Lead-Scoring verstehen (A/B/C)','Bestehende Leads bewerten','Top-3 priorisieren'],task:'Top-3 A-Leads heute anrufen'},
{id:'t6',module:'einkauf',title:'Rohertrag steigern',desc:'Zubehör-Attach-Rate erhöhen. 2-3% mehr Rohertrag möglich.',trigger:'Rohertrag unter Netzwerk-Ø',dur:'5 Min',steps:['Aktuelle Attach-Rate prüfen','Top-5 Zubehör-Combos lernen','Bei nächstem Verkauf aktiv anbieten'],task:'3 Kunden heute Zubehör aktiv anbieten'},
{id:'t7',module:'controlling',title:'Liquiditätsplanung',desc:'Cashflow vorausplanen, Engpässe vermeiden.',trigger:'Liquidität unter Schwelle',dur:'6 Min',steps:['Nächste 30 Tage Zahlungen prüfen','Erwartete Eingänge planen','Puffer identifizieren'],task:'30-Tage-Cashflow-Plan erstellen'},
{id:'t8',module:'marketing',title:'Google My Business optimieren',desc:'GMB-Profil vollständig pflegen. Mehr lokale Sichtbarkeit.',trigger:'GMB Score unter 80%',dur:'7 Min',steps:['Alle Felder prüfen und ausfüllen','5 aktuelle Fotos hochladen','2 Bewertungen beantworten'],task:'GMB-Profil heute vervollständigen'}
];
var activeTrainers=[TRAINERS[0]];
window.activeTrainers = activeTrainers;
var currentTrainer=null;

// ── INTERCEPTOR DATA ──
var SOLUTIONS={
'it':{title:'IT-Probleme? Probier zuerst:',items:['Browser-Cache leeren (Strg+Shift+Del)','Anderen Browser testen (Chrome empfohlen)','Portal abmelden und neu anmelden']},
'einkauf':{title:'Einkauf – Häufige Lösung:',items:['Konditionen findest du unter Einkauf → Lieferanten','Bestellformulare im Wissen → Downloads','Vororder-Infos unter Einkauf → Kalender']},
'buchhaltung':{title:'Buchhaltung – Schnellhilfe:',items:['BWA hochladen: Controlling → BWAs → Upload','Trainer "BWA richtig lesen" starten','BWA-Vorlage im Wissen → Downloads']},
'marketing':{title:'Marketing – Sofort-Hilfe:',items:['Content-Vorlagen unter Marketing → Wissen','Posting-Kalender unter Marketing → Kampagnen','Trainer "Content in 10 Min" verfügbar']},
'allgemein':{title:'Allgemein – Mögliche Lösung:',items:['Wissensdatenbank durchsuchen','FAQ im Support-Bereich prüfen','Nächster Gruppencall: Frage dort stellen?']}
};

// ═══ HEALTH SCORE RENDER (Standort) ═══
window.renderHealthScore = renderHealthScore;
export function renderHealthScore(){
if(!MY)return;
var v=MY.score,col=sc(v);
var b=document.getElementById('healthBadge');
if(b){
var rank=DEMO_STD.slice().sort(function(a,b){return b.score-a.score;}).findIndex(function(s){return s.name==='Grafrath';})+1;
b.innerHTML='<span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:6px;color:'+col+';background:'+col+'18">'+se(v)+' '+sl(v)+' · Rang '+rank+'/'+DEMO_STD.length+'</span>';
}
var ring=document.getElementById('healthRing');
if(ring){ring.setAttribute('stroke-dashoffset',(213.6*(1-v/100)).toFixed(1));ring.style.stroke=col;}
var num=document.getElementById('healthScoreNum');
if(num){num.textContent=v;num.style.color=col;}
var cats=document.getElementById('healthCategories');
if(cats){
cats.innerHTML=HEALTH_CATS.map(function(c){
var cv=MY.s[c.id]||0,cc=sc(cv);
return '<div style="display:flex;align-items:center;gap:6px"><span style="font-size:11px;width:14px">'+c.icon+'</span><span style="font-size:10px;color:var(--c-muted);width:70px">'+c.n+'</span><div style="flex:1;height:4px;background:var(--c-bg3);border-radius:2px"><div style="height:100%;width:'+cv+'%;background:'+cc+';border-radius:2px;transition:width 1s"></div></div><span style="font-size:10px;font-weight:700;color:'+cc+';width:24px;text-align:right">'+cv+'</span></div>';
}).join('');
}
// Trend sparkline
var svg=document.getElementById('healthTrendSvg');
if(svg&&MY_TREND.length>1){
var pts=MY_TREND.map(function(v,i){return (i*(80/(MY_TREND.length-1)))+','+(32-((v-40)/60)*32);});
var h='';for(var i=1;i<pts.length;i++)h+='<line x1="'+pts[i-1].split(',')[0]+'" y1="'+pts[i-1].split(',')[1]+'" x2="'+pts[i].split(',')[0]+'" y2="'+pts[i].split(',')[1]+'" stroke="'+col+'" stroke-width="2"/>';
pts.forEach(function(p,i){h+='<circle cx="'+p.split(',')[0]+'" cy="'+p.split(',')[1]+'" r="'+(i===pts.length-1?3:1.5)+'" fill="'+col+'"/>';});
svg.innerHTML=h;
}
var tt=document.getElementById('healthTrendText');
if(tt){var d=MY_TREND[MY_TREND.length-1]-MY_TREND[MY_TREND.length-2];tt.textContent=(d>=0?'↑ +':'↓ ')+d;tt.style.color=d>=0?'#16a34a':'#dc2626';}
// Trainer hint
var th=document.getElementById('healthTrainerHint'),thT=document.getElementById('healthTrainerText');
if(th&&activeTrainers.length>0){th.style.display='';thT.textContent=activeTrainers.length+' Trainer aktiv: '+activeTrainers.map(function(t){return t.title;}).join(', ');}
}

// ═══ HQ HEALTH RENDER ═══
window.renderHqHealth = renderHqHealth;
export function renderHqHealth(){
var g=0,y=0,r=0,tot=0;
DEMO_STD.forEach(function(s){tot+=s.score;if(s.score>=75)g++;else if(s.score>=50)y++;else r++;});
var avg=Math.round(tot/DEMO_STD.length);
var $=function(id){return document.getElementById(id);};
if($('hqHealthGreen'))$('hqHealthGreen').textContent='🟢 '+g;
if($('hqHealthYellow'))$('hqHealthYellow').textContent='🟡 '+y;
if($('hqHealthRed'))$('hqHealthRed').textContent='🔴 '+r;
if($('hqHealthAvg'))$('hqHealthAvg').textContent=avg;
if($('hqHealthBar'))$('hqHealthBar').style.width=avg+'%';
var gr=$('hqHealthGrid');
if(gr){
var sorted=DEMO_STD.slice().sort(function(a,b){return b.score-a.score;});
gr.innerHTML=sorted.map(function(s){var c=sc(s.score);return '<div style="padding:8px;border-radius:8px;text-align:center;background:'+c+'08;border:1px solid '+c+'20;cursor:pointer" title="'+s.name+': '+s.score+'"><p style="font-size:9px;color:var(--c-sub);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+s.name.split(' ')[0]+'</p><p style="font-size:16px;font-weight:800;color:'+c+'">'+s.score+'</p></div>';}).join('');
}
// Trainer list
var tl=$('hqTrainerList');
if(tl){tl.innerHTML=[
{s:'Bonn',m:'Controlling',t:'BWA pünktlich',st:'aktiv'},
{s:'Karlsruhe',m:'Verkauf',t:'Nachfass-System',st:'aktiv'},
{s:'Mannheim',m:'Marketing',t:'Content-Routine',st:'gestartet'},
{s:'Nürnberg',m:'Controlling',t:'BWA hochladen',st:'ignoriert'},
{s:'Dresden',m:'Werkstatt',t:'Auslastung',st:'aktiv'}
].map(function(t){var c={aktiv:'#16a34a',gestartet:'#2563eb',ignoriert:'#dc2626'}[t.st]||'#9ca3af';return '<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--c-border2)"><span style="font-size:10px;font-weight:600;color:#111;flex:1">'+t.s+'</span><span style="font-size:9px;color:var(--c-muted)">'+t.m+' → '+t.t+'</span><span style="font-size:9px;padding:1px 6px;border-radius:4px;color:'+c+';background:'+c+'12;font-weight:600">'+t.st+'</span></div>';}).join('');}
// Gruppencall list
var gl=$('hqGroupcallList');
if(gl){gl.innerHTML=[
{t:'Inhaber-Call',d:'Mi 05.03 · 10:00',p:18},{t:'Verkäufer-Call',d:'Fr 07.03 · 09:00',p:24},{t:'Werkstatt-Call',d:'Do 13.03 · 14:00',p:15}
].map(function(c){return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--c-border2)"><span style="font-size:14px">📞</span><div style="flex:1"><p style="font-size:11px;font-weight:600;color:#111">'+c.t+'</p><p style="font-size:9px;color:var(--c-muted)">'+c.d+'</p></div><span style="font-size:9px;color:var(--c-sub)">'+c.p+' TN</span></div>';}).join('');}
}

// ═══ TRAINER CARD ═══
window.showTrainerCard=function(tr){
currentTrainer=tr;
var el=document.getElementById('trainerCardOverlay');if(!el)return;
document.getElementById('trainerModuleTag').textContent=tr.module.toUpperCase();
document.getElementById('trainerTitle').textContent=tr.title;
document.getElementById('trainerDesc').textContent=tr.desc;
document.getElementById('trainerTriggerInfo').textContent=_t('tr_triggered')+tr.trigger;
document.getElementById('trainerCTA').textContent='▶ Starten ('+tr.dur+')';
var st=document.getElementById('trainerSteps');
if(st)st.innerHTML=tr.steps.map(function(s,i){return '<div style="display:flex;align-items:flex-start;gap:6px"><span style="width:18px;height:18px;border-radius:50%;background:var(--c-bg3);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--c-muted);flex-shrink:0">'+(i+1)+'</span><span style="font-size:11px;color:var(--c-sub)">'+s+'</span></div>';}).join('');
el.style.display='';
};
window.closeTrainer=function(){document.getElementById('trainerCardOverlay').style.display='none';};
window.snoozeTrainer=function(){closeTrainer();};
window.startTrainer=function(){
if(!currentTrainer)return;
alert('🎓 Trainer "'+currentTrainer.title+'" gestartet!\n\nIn Produktion: Micro-Learning ('+currentTrainer.dur+') mit konkreter Handlung.');
var imp=document.getElementById('trainerImpact');
if(imp){imp.style.display='';imp.innerHTML='✅ Trainer gestartet! Aufgabe: <strong>'+currentTrainer.task+'</strong>';}
};
window.createTrainerTask=function(){
if(!currentTrainer)return;
alert('📋 Aufgabe erstellt: "'+currentTrainer.task+'"');
closeTrainer();
};

// ═══ TICKET INTERCEPTOR ═══
window.checkTicketInterceptor=function(){
var catEl=document.getElementById('ticketCatInput');
if(!catEl)return;
var cat=catEl.value;
var sol=SOLUTIONS[cat];
var ic=document.getElementById('ticketInterceptor');
var icC=document.getElementById('interceptorContent');
if(!sol||!ic||!icC){if(ic)ic.style.display='none';return;}
ic.style.display='';
icC.innerHTML='<p class="text-xs font-semibold text-gray-700 mb-1">'+sol.title+'</p>'+sol.items.map(function(i){return '<div style="display:flex;align-items:flex-start;gap:6px;padding:4px 8px;background:var(--c-bg);border-radius:6px"><span style="color:#EF7D00;font-size:12px">→</span><span style="font-size:11px;color:var(--c-sub)">'+i+'</span></div>';}).join('');
};
window.acceptInterceptor=function(){
document.getElementById('ticketInterceptor').style.display='none';
document.getElementById('ticketCreate').classList.add('hidden');
alert(_t('misc_solution_try'));
};
window.skipInterceptor=function(){
document.getElementById('ticketInterceptor').style.display='none';
};
// Hook category select
setTimeout(function(){
var catSel=document.getElementById('ticketCatInput');
if(catSel)catSel.addEventListener('change',function(){checkTicketInterceptor();});
},500);

// ═══ GRUPPENCALL PREP ═══
window.showGroupcallPrep=function(){
var p=document.getElementById('groupcallPrepPanel');if(!p)return;
document.getElementById('gcpScore').textContent=MY.score;
document.getElementById('gcpScore').style.color=sc(MY.score);
document.getElementById('gcpStatus').innerHTML=se(MY.score)+' '+sl(MY.score);
document.getElementById('gcpRank').textContent=DEMO_STD.slice().sort(function(a,b){return b.score-a.score;}).findIndex(function(s){return s.name==='Grafrath';})+1+'/'+DEMO_STD.length;
// Categories
var cats=document.getElementById('gcpCategories');
if(cats)cats.innerHTML=HEALTH_CATS.map(function(c){var v=MY.s[c.id]||0;return '<div style="display:flex;align-items:center;justify-content:between;gap:6px;padding:4px 0"><span style="font-size:12px">'+c.icon+'</span><span style="flex:1;font-size:11px;color:var(--c-sub)">'+c.n+'</span><span style="font-size:12px;font-weight:700;color:'+sc(v)+'">'+v+'</span></div>';}).join('');
// Trainers
var tl=document.getElementById('gcpTrainers');
if(tl)tl.innerHTML=activeTrainers.length>0?activeTrainers.map(function(t){return '<div style="font-size:11px;padding:3px 0;border-bottom:1px solid var(--c-border2)">🎓 '+t.title+' <span style="color:var(--c-muted)">('+t.module+')</span></div>';}).join(''):'<p style="font-size:11px;color:var(--c-muted)">Keine aktiven Trainer</p>';
p.style.display='';
p.querySelector('.gc-prep-slider').style.transform='translateX(0)';
};
window.closeGroupcallPrep=function(){
var s=document.querySelector('.gc-prep-slider');
if(s)s.style.transform='translateX(100%)';
setTimeout(function(){document.getElementById('groupcallPrepPanel').style.display='none';},350);
};

// [Hook 3 moved to unified dispatcher]

// [Init moved to unified dispatcher]

})();
</script>


<!-- ═══ GRUPPENCALL PREP PANEL ═══ -->
<div id="groupcallPrepPanel" style="display:none;position:fixed;inset:0;z-index:9998;">
<div onclick="closeGroupcallPrep()" style="position:absolute;inset:0;background:rgba(0,0,0,0.4)"></div>
<div class="gc-prep-slider" style="position:absolute;top:0;right:0;bottom:0;width:380px;background:var(--c-bg);box-shadow:-8px 0 30px rgba(0,0,0,0.15);transform:translateX(100%);transition:transform 0.35s cubic-bezier(0.16,1,0.3,1);overflow-y:auto;">
<div style="padding:24px;">
    <button onclick="closeGroupcallPrep()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:18px;cursor:pointer;color:var(--c-muted)">✕</button>
    <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--c-muted);font-weight:600;margin-bottom:4px;">Gruppencall</p>
    <h2 style="font-size:16px;font-weight:800;color:var(--c-text);margin-bottom:16px;">📊 Deine Zahlen für den Call</h2>

    <!-- Score Card -->
    <div style="background:var(--c-bg2);border-radius:12px;padding:16px;margin-bottom:16px;text-align:center;">
        <p style="font-size:10px;color:var(--c-muted);">Health Score</p>
        <p id="gcpScore" style="font-size:36px;font-weight:900;color:#16a34a">—</p>
        <p id="gcpStatus" style="font-size:11px;font-weight:600;margin-top:2px;"></p>
        <p style="font-size:10px;color:var(--c-muted);margin-top:4px;">Rang: <span id="gcpRank" style="font-weight:700;">—</span></p>
    </div>

    <!-- Categories -->
    <div style="background:var(--c-bg2);border-radius:12px;padding:16px;margin-bottom:16px;">
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--c-muted);font-weight:600;margin-bottom:8px;">KPI-Übersicht</p>
        <div id="gcpCategories"></div>
    </div>

    <!-- Key Metrics -->
    <div style="background:var(--c-bg2);border-radius:12px;padding:16px;margin-bottom:16px;">
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--c-muted);font-weight:600;margin-bottom:8px;">Wichtige Kennzahlen</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div style="padding:8px;background:var(--c-bg);border-radius:8px;text-align:center"><p style="font-size:9px;color:var(--c-muted)">Abschlussquote</p><p style="font-size:16px;font-weight:800;color:var(--c-text)">34%</p></div>
            <div style="padding:8px;background:var(--c-bg);border-radius:8px;text-align:center"><p style="font-size:9px;color:var(--c-muted)">BWA-Status</p><p style="font-size:16px;font-weight:800;color:#ca8a04">⏳</p></div>
            <div style="padding:8px;background:var(--c-bg);border-radius:8px;text-align:center"><p style="font-size:9px;color:var(--c-muted)">Offene Aufgaben</p><p style="font-size:16px;font-weight:800;color:var(--c-text)">4</p></div>
            <div style="padding:8px;background:var(--c-bg);border-radius:8px;text-align:center"><p style="font-size:9px;color:var(--c-muted)">Content letzte 14d</p><p style="font-size:16px;font-weight:800;color:#16a34a">2</p></div>
        </div>
    </div>

    <!-- Active Trainers -->
    <div style="background:var(--c-bg2);border-radius:12px;padding:16px;margin-bottom:16px;">
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--c-muted);font-weight:600;margin-bottom:8px;">Aktive Trainer</p>
        <div id="gcpTrainers"></div>
    </div>

    <!-- Actions -->
    <div style="display:flex;flex-direction:column;gap:8px;">
        <button onclick="alert(_t('misc_group_call'))" style="width:100%;padding:10px;background:#EF7D00;color:white;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">Frage für den Call einreichen</button>
        <button onclick="closeGroupcallPrep()" style="width:100%;padding:10px;background:var(--c-bg3);color:var(--c-sub);border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">Schließen</button>
    </div>
</div>
</div>
</div>

<!-- ═══ GOVERNANCE EXTENSIONS: KPI Triggers, Support Levels, Impact Checks ═══ -->
<script>
(function(){
// ──── KPI TRIGGER ENGINE ────
// Checks metrics and auto-assigns trainers
window.kpiTriggerEngine = function() {
if(typeof MY === 'undefined' || !MY) return;
var triggers = [];

// Controlling: BWA pünktlich?
if(MY.s.controlling < 60) triggers.push({module:'controlling', trainerId:'t2', reason:'Controlling-Score unter 60'});

// Verkauf: Abschlussquote?
if(MY.s.verkauf < 65) triggers.push({module:'verkauf', trainerId:'t1', reason:'Verkaufs-Score unter 65'});

// Marketing: Content-Frequenz?
if(MY.s.marketing < 60) triggers.push({module:'marketing', trainerId:'t3', reason:'Marketing-Score unter 60'});

// Werkstatt: Auslastung?
if(MY.s.werkstatt < 60) triggers.push({module:'werkstatt', trainerId:'t4', reason:'Werkstatt-Score unter 60'});

// Einkauf: Rohertrag?
if(MY.s.controlling < 50 || MY.s.verkauf < 50) triggers.push({module:'einkauf', trainerId:'t6', reason:'Rohertrag potentiell unter Schnitt'});

console.log('[KPI Trigger Engine] '+triggers.length+' triggers found:', triggers.map(function(t){return t.module;}).join(', '));
return triggers;
};

// ──── SUPPORT LEVEL SYSTEM ────
window.getSupportLevel = function() {
if(typeof MY === 'undefined' || !MY) return 'A';
var score = MY.score;
var hasTrainer = typeof activeTrainers !== 'undefined' && activeTrainers.length > 0;

// Level A: Quick Ping (async, for healthy scores)
// Level B: Review (for observation scores)
// Level C: 15 Min Call (only for critical or post-trainer)
if(score < 50) return 'C'; // Critical -> direct HQ access
if(score < 75 && !hasTrainer) return 'A'; // Observation, try trainer first
if(score < 75 && hasTrainer) return 'B'; // Observation + trainer tried
return 'A'; // Healthy
};

window.canBookHqCall = function() {
var level = getSupportLevel();
// Can only book call at Level B or C
return level === 'B' || level === 'C';
};

// ──── IMPACT CHECK (7-day follow-up) ────
window.scheduleImpactCheck = function(trainerId, startDate) {
// In production: store in Supabase, cron checks after 7 days
var checkDate = new Date(startDate);
checkDate.setDate(checkDate.getDate() + 7);
console.log('[Impact Check] Scheduled for trainer '+trainerId+' on '+checkDate.toISOString().split('T')[0]);
// Store locally for demo
try {
    var checks = JSON.parse(localStorage.getItem('vit_impact_checks') || '[]');
    checks.push({trainerId: trainerId, checkDate: checkDate.toISOString(), resolved: false});
    localStorage.setItem('vit_impact_checks', JSON.stringify(checks));
} catch(e){}
};

window.checkPendingImpacts = function() {
try {
    var checks = JSON.parse(localStorage.getItem('vit_impact_checks') || '[]');
    var today = new Date();
    var due = checks.filter(function(c) { return !c.resolved && new Date(c.checkDate) <= today; });
    if(due.length > 0) {
        console.log('[Impact Check] '+due.length+' checks due!');
        // In production: compare KPI before/after, show result
    }
} catch(e){}
};

// ──── ONBOARDING PHASE TRACKING ────
window.getOnboardingPhase = function() {
try {
    var phase = localStorage.getItem('vit_onb_phase');
    if(phase === 'done') return {phase: 4, label: 'Abgeschlossen'};
    if(phase) return JSON.parse(phase);
} catch(e){}
// Default: check if onboarding view has been shown
return {phase: 2, label: 'Woche 1', progress: 65};
};

window.completeOnboardingPhase = function(phaseNum) {
if(phaseNum >= 3) {
    try { localStorage.setItem('vit_onb_phase', 'done'); } catch(e){}
    console.log('[Onboarding] Completed! Switching to Performance trainers.');
} else {
    try { localStorage.setItem('vit_onb_phase', JSON.stringify({phase: phaseNum+1, label: phaseNum===1?'Woche 1':'Woche 2-3', progress: phaseNum*33})); } catch(e){}
}
};

// ──── SOFT LOCK CONTROLLER ────
window.checkSoftLocks = function() {
if(typeof MY === 'undefined' || !MY) return;

// Pipeline Insights: locked if close rate low AND no trainer completed
var pLock = document.getElementById('pipelineInsightLock');
if(pLock) {
    // Demo: lock if verkauf < 70
    pLock.style.display = MY.s.verkauf < 70 ? '' : 'none';
}

// HQ Booking: only available after trainer attempt or critical score
// (This is checked by canBookHqCall())
};

// ──── Dark mode for new panels ────
// Handled by existing [data-theme="dark"] rules for .gc-prep-slider via white bg override

// ──── INIT ────
setTimeout(function(){
if(typeof kpiTriggerEngine === 'function') kpiTriggerEngine();
if(typeof checkPendingImpacts === 'function') checkPendingImpacts();
if(typeof checkSoftLocks === 'function') checkSoftLocks();
}, 1000);
})();
</script>


<!-- ═══ UNIFIED VIEW DISPATCHER + AUTO-INIT ═══ -->
<script>
(function(){
// Single hook on showView – calls ALL subsystems
var _baseShowView = window.showView;
if(_baseShowView) {
window.showView = function(v) {
    _baseShowView(v);
    setTimeout(function(){
        // Startseite
        if(v === 'home' || v === 'startseite') {
            if(typeof renderDailyFocus === 'function') renderDailyFocus();
            if(typeof renderHealthScore === 'function') renderHealthScore();
        }
        // Verkauf
        if(v === 'verkauf') {
            if(typeof renderSalesMomentum === 'function') renderSalesMomentum();
        }
        // Controlling
        if(v === 'controlling') {
            if(typeof updateBwaDeadlineWidget === 'function') updateBwaDeadlineWidget();
        }
        // HQ Finanzen
        if(v === 'hqFinanzen') {
            if(typeof renderHqBwaStatus === 'function') renderHqBwaStatus();
        }
        // HQ Cockpit
        if(v === 'hqCockpit') {
            if(typeof renderHqHealth === 'function') renderHqHealth();
        }
    }, 150);
};
}

// Auto-init for initial page load (homeView is display:block by default)
// Wait for enterApp() to finish, then render everything
var _baseEnterApp = window.enterApp;
if(_baseEnterApp) {
window.enterApp = function() {
    _baseEnterApp();
    setTimeout(function(){
        if(typeof renderDailyFocus === 'function') renderDailyFocus();
        if(typeof renderHealthScore === 'function') renderHealthScore();
        if(typeof renderSalesMomentum === 'function') renderSalesMomentum();
        if(typeof updateBwaDeadlineWidget === 'function') updateBwaDeadlineWidget();
        if(typeof renderHqBwaStatus === 'function') renderHqBwaStatus();
        if(typeof renderHqHealth === 'function') renderHqHealth();
        // Trainer card after 4s (only for Standort users, not HQ)
        if(typeof showTrainerCard === 'function' && typeof activeTrainers !== 'undefined' && activeTrainers.length > 0 && currentRole !== 'hq') {
            setTimeout(function(){ showTrainerCard(activeTrainers[0]); }, 4000);
        }
    }, 500);
};
}

// Fallback: also init after 1s in case enterApp is not called (direct page load)
setTimeout(function(){
if(typeof renderDailyFocus === 'function') renderDailyFocus();
if(typeof renderHealthScore === 'function') renderHealthScore();
}, 1000);
})();
</script>


<!-- Widget Info Toggle -->
<script>
export function toggleWidgetInfo(e, id) {
e.stopPropagation();
e.preventDefault();
var el = document.getElementById(id);
if(!el) return;

// Close all others
document.querySelectorAll('.widget-info-popup.active').forEach(function(p){
if(p.id !== id) p.classList.remove('active');
});

// Remove existing overlay
var oldOv = document.getElementById('widgetInfoOverlay');
if(oldOv) oldOv.remove();

var isOpen = el.classList.contains('active');
if(isOpen) {
el.classList.remove('active');
return;
}

// Create overlay
var ov = document.createElement('div');
ov.id = 'widgetInfoOverlay';
ov.className = 'widget-info-overlay active';
ov.onclick = function(){ el.classList.remove('active'); ov.remove(); };
document.body.appendChild(ov);

el.classList.add('active');
}
</script>


<!-- ═══ RESEND E-MAIL INTEGRATION ═══ -->
<script>
(function(){


// Strangler Fig
const _exports = {renderHealthScore,renderHqHealth,toggleWidgetInfo};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[trainer-system.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
