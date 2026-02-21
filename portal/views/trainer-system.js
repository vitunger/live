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

// Module-level state (from monolith globals)
var HEALTH_CATS = window.HEALTH_CATS || [];
var DEMO_STD = window.DEMO_STD || [];
var MY = window.MY || null;
var MY_TREND = window.MY_TREND || [];

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

// Strangler Fig
const _exports = {renderHealthScore,renderHqHealth};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[trainer-system.js] Module loaded – ' + Object.keys(_exports).length + ' exports registered');
