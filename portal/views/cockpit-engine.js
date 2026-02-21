/**
 * views/cockpit-engine.js - BWA Deadline Widget, Tages-Cockpit, Sales Momentum, KPI Trigger, Trainer Engine
 * @module views/cockpit-engine
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// ──── CONFIG ────
var MO_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
var STANDORTE_DEMO = [
{id:'s1',name:'München City',submitted:'2026-02-03',rating:'gold'},
{id:'s2',name:'Berlin Mitte',submitted:'2026-02-05',rating:'gold'},
{id:'s3',name:'Hamburg Altona',submitted:'2026-02-07',rating:'gold'},
{id:'s4',name:'Frankfurt Main',submitted:'2026-02-10',rating:'ok'},
{id:'s5',name:'Köln Ehrenfeld',submitted:'2026-02-11',rating:'ok'},
{id:'s6',name:'Stuttgart West',submitted:'2026-02-14',rating:'ok'},
{id:'s7',name:'Düsseldorf',submitted:'2026-02-15',rating:'ok'},
{id:'s8',name:'Leipzig',submitted:null,rating:'missing'},
{id:'s9',name:'Dresden',submitted:null,rating:'missing'},
{id:'s10',name:'Nürnberg',submitted:null,rating:'missing'},
{id:'s11',name:'Hannover',submitted:null,rating:'missing'},
{id:'s12',name:'Grafrath',submitted:null,rating:'missing'},
{id:'s13',name:'Münster',submitted:null,rating:'missing'},
{id:'s14',name:'Freiburg',submitted:null,rating:'missing'},
{id:'s15',name:'Augsburg',submitted:null,rating:'missing'},
{id:'s16',name:'Bonn',submitted:null,rating:'overdue'},
{id:'s17',name:'Mannheim',submitted:null,rating:'overdue'},
{id:'s18',name:'Karlsruhe',submitted:'2026-02-18',rating:'overdue'},
{id:'s19',name:'Dortmund',submitted:null,rating:'missing'},
{id:'s20',name:'Essen',submitted:null,rating:'missing'},
{id:'s21',name:'Bremen',submitted:'2026-02-12',rating:'ok'}
];

// ──── HELPERS ────
export function getBwaMonth(today) {
var d = today || new Date();
var m = d.getMonth(); // 0-based
var y = d.getFullYear();
// BWA bezieht sich auf Vormonat
if(m === 0) return {y:y-1, m:11};
return {y:y, m:m-1};
}

export function getDeadline(bwaMonth) {
// Deadline = 15. des Folgemonats
var fm = bwaMonth.m + 1;
var fy = bwaMonth.y;
if(fm > 11) { fm = 0; fy++; }
return new Date(fy, fm, 15, 23, 59, 59);
}

export function getEskalationsStufe(today, bwaMonth) {
var fm = bwaMonth.m + 1;
var fy = bwaMonth.y;
if(fm > 11) { fm = 0; fy++; }
// Are we in the follow month?
if(today.getFullYear() < fy || (today.getFullYear() === fy && today.getMonth() < fm)) return -1; // not yet
if(today.getFullYear() > fy || today.getMonth() > fm) return 3; // way past
var day = today.getDate();
if(day <= 7) return 0;
if(day <= 12) return 1;
if(day <= 15) return 2;
return 3;
}

export function getRating(submittedDate, bwaMonth) {
if(!submittedDate) return 'missing';
var fm = bwaMonth.m + 1;
var fy = bwaMonth.y;
if(fm > 11) { fm = 0; fy++; }
var d8 = new Date(fy, fm, 8, 23, 59, 59);
var d15 = new Date(fy, fm, 15, 23, 59, 59);
var sd = new Date(submittedDate);
if(sd <= d8) return 'gold';
if(sd <= d15) return 'ok';
return 'overdue';
}

export function daysUntil(deadline) {
var now = new Date();
return Math.ceil((deadline - now) / (1000*60*60*24));
}

export function ratingBadge(rating) {
var map = {
gold: {t:'🥇 GOLD', c:'#ca8a04', bg:'rgba(202,138,4,0.1)'},
ok: {t:'✅ OK', c:'#16a34a', bg:'rgba(22,163,74,0.1)'},
overdue: {t:'🚨 ÜBERFÄLLIG', c:'#dc2626', bg:'rgba(220,38,38,0.1)'},
missing: {t:'⏳ AUSSTEHEND', c:'#9ca3af', bg:'rgba(156,163,175,0.1)'}
};
var m = map[rating] || map.missing;
return '<span style="font-size:10px;font-weight:700;padding:3px 10px;border-radius:6px;color:'+m.c+';background:'+m.bg+'">'+m.t+'</span>';
}

export function eskalationBadge(stufe) {
var cols = ['#9ca3af','#ca8a04','#ea580c','#dc2626'];
var c = cols[Math.min(stufe,3)] || cols[0];
return '<span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;color:'+c+';background:'+c+'18">Stufe '+stufe+'</span>';
}

// ──── STANDORT-SICHT: Cockpit Widget ────
window.updateBwaDeadlineWidget = updateBwaDeadlineWidget;
export async function updateBwaDeadlineWidget() {
var today = new Date();
var bwaMo = getBwaMonth(today);
var deadline = getDeadline(bwaMo);
var stufe = getEskalationsStufe(today, bwaMo);
var days = daysUntil(deadline);
var moName = MO_NAMES[bwaMo.m] + ' ' + bwaMo.y;

var submitted = null;
var rating = 'missing';
if(typeof sb !== 'undefined' && typeof sbProfile !== 'undefined' && _sbProfile() && _sbProfile().standort_id) {
try {
    var bwaResp = await _sb().from('bwa_daten').select('created_at').eq('standort_id', _sbProfile().standort_id).eq('monat', bwaMo.m + 1).eq('jahr', bwaMo.y).limit(1);
    if(bwaResp.data && bwaResp.data.length > 0) {
        submitted = bwaResp.data[0].created_at.slice(0,10);
        var subDay = new Date(bwaResp.data[0].created_at).getDate();
        if(subDay <= 8) rating = 'gold';
        else if(subDay <= 15) rating = 'ok';
        else rating = 'overdue';
    }
} catch(e) { console.warn('BWA check:', e); }
}

var titleEl = document.getElementById('bwaDeadlineTitle');
var subEl = document.getElementById('bwaDeadlineSubtext');
var daysEl = document.getElementById('bwaCountdownDays');
var ringEl = document.getElementById('bwaRingCircle');
var ctaEl = document.getElementById('bwaUploadCTA');
var badgeEl = document.getElementById('bwaRatingBadge');
var eskBanner = document.getElementById('bwaEskalationBanner');

if(!titleEl) return;

if(submitted && rating !== 'missing') {
// Already submitted
titleEl.textContent = 'BWA für ' + moName + ' eingereicht';
subEl.textContent = 'Eingereicht am ' + submitted.split('-').reverse().join('.');
badgeEl.innerHTML = ratingBadge(rating);
badgeEl.style.display = '';
ctaEl.style.display = 'none';
daysEl.textContent = '✓';
daysEl.style.color = '#16a34a';
daysEl.style.fontSize = '20px';
ringEl.style.stroke = '#16a34a';
ringEl.setAttribute('stroke-dashoffset', '0');
eskBanner.style.display = 'none';
// Show KPI report
showKpiReport(bwaMo, rating);
// Unlock benchmark
setBenchmarkLock(false);
} else {
// Not submitted
ctaEl.style.display = '';
badgeEl.style.display = 'none';
setBenchmarkLock(true);
document.getElementById('bwaKpiReport').style.display = 'none';

if(days > 0) {
    titleEl.textContent = 'Noch ' + days + ' Tage bis zur BWA-Deadline';
    subEl.textContent = 'BWA für ' + moName + ' · Frist: 15. ' + MO_NAMES[bwaMo.m+1 > 11 ? 0 : bwaMo.m+1];
    daysEl.textContent = days;
    daysEl.style.color = days <= 3 ? '#dc2626' : days <= 7 ? '#ca8a04' : '#EF7D00';
    ringEl.style.stroke = days <= 3 ? '#dc2626' : days <= 7 ? '#ca8a04' : '#EF7D00';
    var pct = Math.max(0, 1 - days/15);
    ringEl.setAttribute('stroke-dashoffset', (175.9 * (1-pct)).toFixed(1));

    // CTA subtext
    if(days > 7) {
        ctaEl.textContent = '🥇 Frühabgabe = Gold-Status!';
    } else {
        ctaEl.textContent = '📤 BWA jetzt einreichen';
    }
} else {
    var overdueDays = Math.abs(days);
    titleEl.textContent = 'BWA ist seit ' + overdueDays + ' Tag' + (overdueDays>1?'en':'') + ' überfällig';
    subEl.textContent = 'BWA für ' + moName + ' · Deadline war der 15.';
    daysEl.textContent = '!';
    daysEl.style.color = '#dc2626';
    daysEl.style.fontSize = '24px';
    ringEl.style.stroke = '#dc2626';
    ringEl.setAttribute('stroke-dashoffset', '0');
    ctaEl.textContent = '🚨 BWA sofort einreichen';
    ctaEl.style.background = '#dc2626';
}

// Eskalation Banner
if(stufe >= 2) {
    eskBanner.style.display = '';
    var eskText = document.getElementById('bwaEskText');
    var eskSub = document.getElementById('bwaEskSub');
    if(stufe === 2) {
        eskText.textContent = 'Eskalationsstufe 2 – Nur noch ' + Math.max(0,days) + ' Tage!';
        eskSub.textContent = 'Reiche jetzt ein, um Stufe 3 und HQ-Benachrichtigung zu vermeiden.';
    } else {
        eskText.textContent = 'Eskalationsstufe 3 – BWA überfällig!';
        eskSub.textContent = 'Ohne aktuelle Zahlen können wir dich nicht gezielt bei Einkauf, Marketing und Controlling unterstützen.';
        eskBanner.style.background = '#fef2f2';
        eskBanner.style.borderColor = '#fca5a5';
    }
} else {
    eskBanner.style.display = 'none';
}
}

// Netzwerk-Widget
updateNetzwerkWidget();
}

// ──── NETZWERK WIDGET (Standort-Sicht) ────
export async function updateNetzwerkWidget() {
var gold = 0, ok = 0, missing = 0, overdue = 0, total = 21;
if(typeof sb !== 'undefined') {
try {
    var bwaMo = getBwaMonth(new Date());
    var stdResp = await _sb().from('standorte').select('id,name').eq('aktiv', true);
    total = (stdResp.data || []).length || 21;
    var bwaResp = await _sb().from('bwa_daten').select('standort_id,created_at').eq('monat', bwaMo.m + 1).eq('jahr', bwaMo.y);
    (bwaResp.data || []).forEach(function(b) {
        var subDay = new Date(b.created_at).getDate();
        if(subDay <= 8) gold++; else if(subDay <= 15) ok++; else overdue++;
    });
    missing = total - gold - ok - overdue;
} catch(e) { console.warn('Netzwerk widget:', e); missing = total; }
} else { missing = total; }
var submitted = gold + ok + overdue;
var pct = Math.round(submitted / total * 100);

var el = function(id) { return document.getElementById(id); };
if(el('bwaNetzwerkProgress')) el('bwaNetzwerkProgress').textContent = submitted + ' von ' + total + ' eingereicht';
if(el('bwaNetzwerkBar')) el('bwaNetzwerkBar').style.width = pct + '%';
if(el('bwaNwGold')) el('bwaNwGold').textContent = '🥇 Gold: ' + gold;
if(el('bwaNwOk')) el('bwaNwOk').textContent = '✅ OK: ' + ok;
if(el('bwaNwMissing')) el('bwaNwMissing').textContent = '⏳ Ausstehend: ' + missing;
if(el('bwaNwOverdue')) el('bwaNwOverdue').textContent = '🚨 Überfällig: ' + overdue;
}

// ──── KPI REPORT (Sofort-Nutzen nach Upload) ────
export function showKpiReport(bwaMo, rating) {
var report = document.getElementById('bwaKpiReport');
if(!report) return;
report.style.display = '';

var moName = MO_NAMES[bwaMo.m] + ' ' + bwaMo.y;
document.getElementById('bwaKpiReportMonth').textContent = moName;
document.getElementById('bwaKpiRating').innerHTML = ratingBadge(rating);

// Demo KPIs
var kpis = [
{l:'Umsatz', v:'68.400 €', c:'+4.2%', co:'#16a34a'},
{l:'Rohertrag', v:'24.100 €', c:'36.7%', co:'#2563eb'},
{l:'Personalkosten', v:'13.600 €', c:'19.9%', co:'#ca8a04'},
{l:'Ergebnis', v:'3.200 €', c:'+12%', co:'#16a34a'}
];
var grid = document.getElementById('bwaKpiReportGrid');
grid.innerHTML = kpis.map(function(k){
return '<div style="padding:12px;background:var(--c-bg2);border-radius:10px;text-align:center"><p style="font-size:9px;color:var(--c-muted);text-transform:uppercase">'+k.l+'</p><p style="font-size:18px;font-weight:800;color:var(--c-text);margin-top:2px">'+k.v+'</p><p style="font-size:10px;font-weight:600;color:'+k.co+'">'+k.c+'</p></div>';
}).join('');

// Insights
var recs = [
'Rohertragsmarge +2.5 Pp über Netzwerk-Durchschnitt – starke Performance! 💪',
'Personalkosten leicht über Schnitt (19.9% vs. 18.5%) – Arbeitszeitplanung prüfen.',
'Werkstatt-Umsatz +8% ggü. Vorjahr – Trend beibehalten mit proaktiver Service-Ansprache.'
];
document.getElementById('bwaKpiRecList').innerHTML = recs.map(function(r){return '<li>→ '+r+'</li>';}).join('');
}

// ──── BENCHMARK LOCK ────
export function setBenchmarkLock(locked) {
var overlay = document.getElementById('benchmarkLockOverlay');
var content = document.getElementById('benchmarkContent');
if(!overlay || !content) return;
if(locked) {
overlay.style.display = '';
content.style.display = 'none';
} else {
overlay.style.display = 'none';
content.style.display = '';
}
}

// ──── HQ-SICHT: BWA Netzwerk-Status ────
window.renderHqBwaStatus = renderHqBwaStatus;
export function renderHqBwaStatus() {
var bwaMo = getBwaMonth(new Date());
var moName = MO_NAMES[bwaMo.m] + ' ' + bwaMo.y;
var deadline = getDeadline(bwaMo);
var today = new Date();

var el = function(id){return document.getElementById(id);};
if(el('hqBwaMonth')) el('hqBwaMonth').textContent = moName;

// Sort: gold first, then ok, then overdue, then missing
var order = {gold:0, ok:1, overdue:2, missing:3};
var sorted = STANDORTE_DEMO.slice().sort(function(a,b){return (order[a.rating]||3) - (order[b.rating]||3);});

var gold=0, ok=0, overdue=0, missing=0;
sorted.forEach(function(s){
if(s.rating==='gold') gold++;
else if(s.rating==='ok') ok++;
else if(s.rating==='overdue') overdue++;
else missing++;
});

var total = sorted.length;
var submitted = gold + ok + overdue;
var pct = Math.round(submitted/total*100);

if(el('hqBwaSubmitted')) el('hqBwaSubmitted').textContent = submitted;
if(el('hqBwaTotal')) el('hqBwaTotal').textContent = total;
if(el('hqBwaGold')) el('hqBwaGold').textContent = gold;
if(el('hqBwaOk')) el('hqBwaOk').textContent = ok;
if(el('hqBwaMissing')) el('hqBwaMissing').textContent = missing;
if(el('hqBwaOverdue')) el('hqBwaOverdue').textContent = overdue;
if(el('hqBwaPct')) el('hqBwaPct').textContent = pct + '%';
if(el('hqBwaBar')) el('hqBwaBar').style.width = pct + '%';

// Table
var tbody = el('hqBwaTableBody');
if(!tbody) return;

tbody.innerHTML = sorted.map(function(s){
var stufe = s.rating === 'missing' ? getEskalationsStufe(today, bwaMo) : (s.rating==='overdue'?3:0);
var dl = daysUntil(deadline);
var daysText = s.submitted ? s.submitted.split('-').reverse().join('.') : (dl>0 ? 'noch '+dl+' Tage' : Math.abs(dl)+' Tage überfällig');
var daysColor = s.submitted ? '#16a34a' : (dl>0 ? '#9ca3af' : '#dc2626');
return '<tr class="text-sm">'+
    '<td class="py-2.5 font-semibold text-gray-800">'+s.name+'</td>'+
    '<td class="py-2.5">'+(s.submitted ? '<span class="text-green-600 text-xs font-semibold">✓ Eingereicht</span>' : '<span class="text-gray-400 text-xs">Ausstehend</span>')+'</td>'+
    '<td class="py-2.5">'+ratingBadge(s.rating)+'</td>'+
    '<td class="py-2.5 text-xs text-gray-500">'+(s.submitted||'—')+'</td>'+
    '<td class="py-2.5">'+(s.rating==='missing'||s.rating==='overdue' ? eskalationBadge(stufe) : '<span class="text-xs text-gray-300">—</span>')+'</td>'+
    '<td class="py-2.5 text-xs" style="color:'+daysColor+'">'+daysText+'</td>'+
    '</tr>';
}).join('');
}

// ──── INIT ────
// Hook into controlling view activation
var _origShowCtrl = window.showControllingTab;
if(_origShowCtrl) {
window.showControllingTab = function(t) {
_origShowCtrl(t);
if(t === 'cockpit') setTimeout(updateBwaDeadlineWidget, 100);
};
}

// [Hook 1 moved to unified dispatcher]

// [Init moved to unified dispatcher]
})();
</script>


<!-- ═══ TAGES-COCKPIT + VERKAUFS-STREAK SYSTEM ═══ -->
<script>
(function(){
var MO = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
var WOCHENTAGE = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
var IMPULSE = [
'Du hast 2 Angebote, die seit 5+ Tagen offen sind. Ein kurzer Follow-Up-Anruf könnte den Unterschied machen!',
'Kunden, die am Wochenende Probefahrt hatten, sind jetzt kaufbereit. Heute anrufen!',
'Werkstatt ist zu 78% ausgelastet – perfekte Gelegenheit für Service-Angebote an Bestandskunden.',
'Tipp: E-Bike-Leasing-Anfragen steigen im Frühjahr um 40%. Sprich aktiv Pendler an!',
'Dein Standort liegt 12% über dem Netzwerk-Durchschnitt bei Zubehör-Attach-Rate. Weiter so! 💪',
'3 Leads sind im "Schwebend"-Status. Schick heute ein kurzes "Noch Fragen?"-Follow-Up.',
'Diese Woche sind 2 Events im Kalender. Nutze die Chance für spontane Leads!',
'Top-Performer im Netzwerk machen 30% ihres Umsatzes mit Service. Wie siehts bei dir aus?'
];

// ──── TAGES-COCKPIT ────
window.renderDailyFocus = renderDailyFocus;
export function renderDailyFocus() {
var now = new Date();
var dateEl = document.getElementById('dailyFocusDate');
if(dateEl) dateEl.textContent = WOCHENTAGE[now.getDay()] + ', ' + now.getDate() + '. ' + MO[now.getMonth()];

// BWA Status
var bwaMo = now.getMonth() === 0 ? {y:now.getFullYear()-1,m:11} : {y:now.getFullYear(),m:now.getMonth()-1};
var fm = bwaMo.m+1 > 11 ? 0 : bwaMo.m+1;
var fy = bwaMo.m+1 > 11 ? bwaMo.y+1 : bwaMo.y;
var deadline = new Date(fy, fm, 15, 23, 59, 59);
var daysLeft = Math.ceil((deadline - now) / (1000*60*60*24));

var bwaEl = document.getElementById('dfBwa');
var bwaSubEl = document.getElementById('dfBwaSub');
if(bwaEl && bwaSubEl) {
if(daysLeft > 7) {
    bwaEl.textContent = '✅';
    bwaSubEl.textContent = daysLeft + ' Tage Zeit';
    bwaSubEl.style.color = '#16a34a';
} else if(daysLeft > 0) {
    bwaEl.textContent = '⚠️';
    bwaSubEl.textContent = 'Noch ' + daysLeft + ' Tage!';
    bwaSubEl.style.color = '#ca8a04';
} else {
    bwaEl.textContent = '🚨';
    bwaSubEl.textContent = Math.abs(daysLeft) + ' Tage überfällig';
    bwaSubEl.style.color = '#dc2626';
}
}

// Random Impulse
var impulseEl = document.getElementById('dfImpulseText');
if(impulseEl) {
var idx = now.getDate() % IMPULSE.length;
impulseEl.textContent = IMPULSE[idx];
}
}

// ──── VERKAUFS-STREAK ────
window.renderSalesMomentum = renderSalesMomentum;
export function renderSalesMomentum() {
// Demo data - in prod, fetch from Supabase
var streak = 12;
var bestStreak = 18;
var goalIst = 86400;
var goalSoll = 120000;
var closeRate = 34;
var closeRatePrev = 30;
var avgDeal = 4320;
var nwAvgDeal = 3890;

// Update streak emoji
var emojiEl = document.getElementById('streakEmoji');
if(emojiEl) {
if(streak >= 14) emojiEl.textContent = '🔥🔥';
else if(streak >= 7) emojiEl.textContent = '🔥';
else if(streak >= 3) emojiEl.textContent = '✨';
else emojiEl.textContent = '💤';
}

// Goal bar
var pct = Math.min(Math.round(goalIst / goalSoll * 100), 100);
var goalPctEl = document.getElementById('goalPct');
var goalBarEl = document.getElementById('goalBar');
if(goalPctEl) {
goalPctEl.textContent = pct + '%';
goalPctEl.style.color = pct >= 90 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#dc2626';
}
if(goalBarEl) {
goalBarEl.style.width = pct + '%';
goalBarEl.style.backgroundColor = pct >= 90 ? '#16a34a' : pct >= 60 ? '#EF7D00' : '#dc2626';
}

// Close rate change
var crDiff = closeRate - closeRatePrev;
var crEl = document.querySelector('#closeRate + p');
if(crEl && crDiff !== 0) {
crEl.textContent = (crDiff > 0 ? '↑ +' : '↓ ') + crDiff + '% ggü. Vormonat';
crEl.style.color = crDiff > 0 ? '#16a34a' : '#dc2626';
}
}

// ──── INIT ────
// [Hook 2 moved to unified dispatcher]

// [Init moved to unified dispatcher]
})();
</script>


<!-- ═══ FLOATING TRAINER CARD ═══ -->
<div id="trainerCardOverlay" style="display:none;position:fixed;bottom:24px;right:24px;z-index:9000;width:360px;">
<div class="vit-card p-0" style="box-shadow:0 8px 32px rgba(0,0,0,0.15);border:1px solid #fed7aa;overflow:visible;">
<div style="padding:14px 16px;background:linear-gradient(135deg,#EF7D00,#F59E0B);border-radius:8px 8px 0 0;color:white;">
<div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
        <span style="font-size:20px">🎓</span>
        <div><p class="text-xs font-bold" style="opacity:0.8" id="trainerModuleTag">VERKAUF</p><p class="text-sm font-bold" id="trainerTitle">—</p></div>
    </div>
    <div class="flex gap-1">
        <button onclick="snoozeTrainer()" style="background:rgba(255,255,255,0.2);border:none;border-radius:6px;padding:4px 8px;color:white;font-size:10px;cursor:pointer">⏰ Später</button>
        <button onclick="closeTrainer()" style="background:rgba(255,255,255,0.2);border:none;border-radius:6px;padding:4px 8px;color:white;font-size:10px;cursor:pointer">✕</button>
    </div>
</div>
</div>
<div style="padding:16px;">
<p id="trainerDesc" class="text-xs text-gray-600 mb-3"></p>
<div id="trainerSteps" class="space-y-2 mb-3"></div>
<div class="flex gap-2">
    <button onclick="startTrainer()" id="trainerCTA" class="flex-1 px-3 py-2.5 bg-vit-orange text-white text-xs font-bold rounded-lg hover:opacity-90">▶ Jetzt starten</button>
    <button onclick="createTrainerTask()" class="px-3 py-2.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200">📋 Als Aufgabe</button>
</div>
<div id="trainerImpact" class="mt-2 p-2 bg-green-50 rounded-lg text-xs text-green-700" style="display:none"></div>
</div>
<div style="padding:8px 16px;background:var(--c-bg2);border-radius:0 0 8px 8px;border-top:1px solid #f3f4f6;">
<div class="flex items-center justify-between">
    <span class="text-[10px] text-gray-400" id="trainerTriggerInfo"></span>
    <span class="text-[10px] text-gray-400" id="trainerProgress"></span>
</div>
</div>
</div>
</div>
<!-- ═══ GRUPPENCALL PREP BANNER ═══ -->
<div id="groupcallBanner" style="display:none;position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:8999;width:500px;">
<div class="vit-card p-4" style="box-shadow:0 8px 24px rgba(0,0,0,0.12);border:2px solid #3b82f6;">
<div class="flex items-center gap-3">
<span style="font-size:24px">📞</span>
<div style="flex:1"><p class="text-sm font-bold text-gray-800" id="gcBannerTitle">Inhaber-Call in 2 Stunden</p><p class="text-xs text-gray-500" id="gcBannerSub">Deine Zahlen sind vorbereitet</p></div>
<button onclick="showGroupcallPrep()" class="px-3 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600">📊 Vorbereitung</button>
<button onclick="document.getElementById('groupcallBanner').style.display='none'" style="background:none;border:none;color:var(--c-muted);cursor:pointer">✕</button>
</div>
</div>
</div>

<!-- === PERFORMANCE GOVERNANCE SYSTEM === -->
<script>
(function(){
var HEALTH_CATS=[
{id:'controlling',n:'Controlling',w:25,icon:'📊',color:'#2563eb'},
{id:'verkauf',n:'Verkauf',w:25,icon:'💰',color:'#16a34a'},
{id:'marketing',n:'Marketing',w:15,icon:'📣',color:'#EF7D00'},
{id:'werkstatt',n:'Werkstatt',w:15,icon:'🔧',color:'#9333ea'},
{id:'engagement',n:'Engagement',w:10,icon:'🔥',color:'#f59e0b'},
{id:'disziplin',n:'Disziplin',w:10,icon:'✅',color:'#6b7280'}
];

var DEMO_STD=[
{name:'München City',score:92,s:{controlling:95,verkauf:90,marketing:88,werkstatt:92,engagement:90,disziplin:95}},
{name:'Berlin Mitte',score:85,s:{controlling:90,verkauf:82,marketing:80,werkstatt:88,engagement:85,disziplin:82}},
{name:'Hamburg Altona',score:81,s:{controlling:85,verkauf:78,marketing:76,werkstatt:85,engagement:80,disziplin:80}},
{name:'Frankfurt Main',score:78,s:{controlling:80,verkauf:75,marketing:78,werkstatt:80,engagement:75,disziplin:78}},
{name:'Köln Ehrenfeld',score:74,s:{controlling:72,verkauf:80,marketing:70,werkstatt:74,engagement:72,disziplin:75}},
{name:'Stuttgart West',score:71,s:{controlling:75,verkauf:68,marketing:72,werkstatt:70,engagement:70,disziplin:72}},
{name:'Düsseldorf',score:68,s:{controlling:70,verkauf:65,marketing:68,werkstatt:72,engagement:66,disziplin:68}},
{name:'Grafrath',score:78,s:{controlling:72,verkauf:82,marketing:75,werkstatt:80,engagement:78,disziplin:80}},
{name:'Leipzig',score:62,s:{controlling:55,verkauf:70,marketing:60,werkstatt:65,engagement:62,disziplin:60}},
{name:'Dresden',score:58,s:{controlling:50,verkauf:62,marketing:55,werkstatt:60,engagement:58,disziplin:58}},
{name:'Nürnberg',score:54,s:{controlling:48,verkauf:60,marketing:50,werkstatt:58,engagement:54,disziplin:55}},
{name:'Freiburg',score:82,s:{controlling:88,verkauf:78,marketing:82,werkstatt:80,engagement:80,disziplin:82}},
{name:'Münster',score:76,s:{controlling:78,verkauf:74,marketing:76,werkstatt:78,engagement:72,disziplin:76}},
{name:'Augsburg',score:65,s:{controlling:60,verkauf:68,marketing:65,werkstatt:66,engagement:64,disziplin:62}},
{name:'Bonn',score:44,s:{controlling:35,verkauf:52,marketing:40,werkstatt:48,engagement:42,disziplin:45}},
{name:'Mannheim',score:48,s:{controlling:42,verkauf:55,marketing:45,werkstatt:50,engagement:48,disziplin:46}},
{name:'Dortmund',score:72,s:{controlling:74,verkauf:70,marketing:72,werkstatt:74,engagement:70,disziplin:72}},
{name:'Essen',score:66,s:{controlling:62,verkauf:68,marketing:65,werkstatt:70,engagement:64,disziplin:66}},
{name:'Bremen',score:79,s:{controlling:82,verkauf:76,marketing:78,werkstatt:80,engagement:76,disziplin:80}},
{name:'Karlsruhe',score:42,s:{controlling:38,verkauf:48,marketing:40,werkstatt:44,engagement:40,disziplin:42}},
{name:'Hannover',score:60,s:{controlling:58,verkauf:62,marketing:58,werkstatt:62,engagement:58,disziplin:60}}
];

var MY=DEMO_STD.find(function(s){return s.name==='Grafrath';});
var MY_TREND=[72,74,73,76,78];

export function sc(v){return v>=75?'#16a34a':v>=50?'#ca8a04':'#dc2626';}
export function se(v){return v>=75?'🟢':v>=50?'🟡':'🔴';}
export function sl(v){return v>=75?'Gesund':v>=50?'Beobachtung':'Kritisch';}

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
// ── Config ──
var RESEND_EDGE_URL = ''; // Set: _sb().functions.invoke('send-email', ...)
var EMAIL_LOG = []; // In-memory log (prod: notifications_log table)

// ── Central send function ──
window.sendEmail = async function(template, to, data) {
// Anti-spam check
var key = template + '|' + to + '|' + (data.context_id || '');
var cooldowns = {welcome:Infinity, employee_welcome:Infinity, employee_invite:Infinity, bwa_escalation:30*86400000, lead_stale:7*86400000, deal_status:0, trainer_ignored:48*3600000, groupcall_reminder:24*3600000};
var cd = cooldowns[template] || 86400000;
if(cd > 0) {
var existing = EMAIL_LOG.find(function(l){return l.key===key && (Date.now()-l.ts)<cd;});
if(existing) { console.log('[Email] Cooldown active for', key); return null; }
}

// Log
var logEntry = {key:key, template:template, to:to, ts:Date.now(), status:'sent'};
EMAIL_LOG.push(logEntry);

// In production: call Supabase Edge Function
if(typeof sb !== 'undefined' && _sb().functions) {
try {
    var res = await _sb().functions.invoke('send-email', {body:{template:template, to:to, data:data}});
    if(res.error) { logEntry.status = 'failed'; console.error('[Email] Error:', res.error); }
    else { console.log('[Email] Sent:', template, 'to', to); }
    // Log to DB
    if(sb.from) {
        await _sb().from('notifications_log').insert({
            location_id: data.location_id || null,
            user_id: data.user_id || null,
            template: template,
            recipient_email: to,
            context_json: data,
            status: logEntry.status,
            resend_id: res.data ? res.data.id : null
        });
    }
    return res;
} catch(e) { logEntry.status = 'failed'; console.error('[Email]', e); }
} else {
console.log('[Email][Demo] Would send:', template, 'to', to, data);
}

// Show notification in portal
showEmailNotification(template, to);
return logEntry;
};

// ── Visual notification ──
export function showEmailNotification(template, to) {
var names = {
welcome: '📧 Willkommens-Mail gesendet',
employee_welcome: '📧 Willkommens-Mail an Mitarbeiter gesendet',
employee_invite: '✉️ Einladungs-Mail an Mitarbeiter gesendet',
bwa_escalation: '⚠️ BWA-Eskalationsmail gesendet',
lead_stale: '📧 Lead-Erinnerung gesendet',
deal_status: '📧 Deal-Status-Mail gesendet',
trainer_ignored: '📧 Trainer-Erinnerung gesendet',
groupcall_reminder: '📧 Gruppencall-Erinnerung gesendet'
};
var msg = names[template] || '📧 E-Mail gesendet';
var toast = document.createElement('div');
toast.style.cssText = 'position:fixed;top:16px;right:16px;z-index:10000;padding:12px 20px;border-radius:10px;background:#16a34a;color:white;font-size:13px;font-weight:600;font-family:Outfit,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.15);opacity:0;transition:opacity 0.3s;';
toast.innerHTML = msg + '<span style="font-size:11px;opacity:0.8;margin-left:8px;">→ ' + to + '</span>';
document.body.appendChild(toast);
requestAnimationFrame(function(){toast.style.opacity='1';});
setTimeout(function(){toast.style.opacity='0';setTimeout(function(){toast.remove();},300);},3500);
}

// ════════════════════════════════════════════════
// TRIGGER 1: Welcome bei Anmeldung
// ════════════════════════════════════════════════
// Hook into enterApp for first-login detection
var _origEnterApp2 = window.enterApp;
if(_origEnterApp2) {
window.enterApp = function() {
_origEnterApp2();
// Check if first login (no previous session)
setTimeout(function(){
    if(typeof sbProfile !== 'undefined' && sbProfile) {
        var isFirst = !localStorage.getItem('vit-welcomed-' + _sbProfile().id);
        if(isFirst) {
            sendEmail('welcome', _sbProfile().email || '', {
                name: _sbProfile().name || 'Partner',
                portalUrl: window.location.href,
                standort: (typeof sbStandort !== 'undefined' && sbStandort) ? sbStandort.name : '',
                location_id: _sbProfile().standort_id,
                user_id: _sbProfile().id
            });
            try { localStorage.setItem('vit-welcomed-' + _sbProfile().id, '1'); } catch(e){}
        }
    }
}, 2000);
};
}

// ════════════════════════════════════════════════
// TRIGGER 2: BWA Eskalation (Stufe 3)
// ════════════════════════════════════════════════
window.triggerBwaEscalation = function(standortName, ownerEmail, bwaMonth) {
sendEmail('bwa_escalation', ownerEmail, {
month: bwaMonth,
standort: standortName,
uploadUrl: window.location.href + '#controlling',
context_id: 'bwa_' + bwaMonth
});
};

// ════════════════════════════════════════════════
// TRIGGER 3: Lead älter als X Tage
// ════════════════════════════════════════════════
window.checkStaleLeads = function() {
// In prod: query leads table
// Demo: simulate
var staleLeads = [
{name:'Thomas Müller', age:7, seller:'max@vitbikes-grafrath.de', id:'l1'},
{name:'Anna Schmidt', age:12, seller:'max@vitbikes-grafrath.de', id:'l2'}
];
staleLeads.forEach(function(lead){
if(lead.age >= 5) {
    sendEmail('lead_stale', lead.seller, {
        leadName: lead.name,
        daysSinceContact: lead.age,
        context_id: 'lead_' + lead.id
    });
}
});
};

// ════════════════════════════════════════════════
// TRIGGER 4: Pipeline – Angebot angenommen/abgelehnt
// ════════════════════════════════════════════════
window.triggerDealStatusEmail = function(dealName, dealValue, status, sellerEmail, kundeEmail) {
sendEmail('deal_status', sellerEmail, {
deal: dealName,
value: dealValue,
status: status, // 'gewonnen' oder 'verloren'
context_id: 'deal_' + dealName
});
// Optional: Auch Kunden benachrichtigen bei Gewonnen
if(status === 'gewonnen' && kundeEmail) {
sendEmail('deal_status', kundeEmail, {
    deal: dealName,
    value: dealValue,
    status: 'bestaetigung'
});
}
};

// ════════════════════════════════════════════════
// TRIGGER 5: Trainer ignoriert (48h)
// ════════════════════════════════════════════════
var _origSnooze = window.snoozeTrainer;
var snoozeCount = {};
window.snoozeTrainer = function() {
if(typeof currentTrainer !== 'undefined' && currentTrainer) {
var tid = currentTrainer.id;
snoozeCount[tid] = (snoozeCount[tid] || 0) + 1;
if(snoozeCount[tid] >= 2) {
    // 2x ignoriert → E-Mail
    var email = (typeof sbProfile !== 'undefined' && sbProfile) ? _sbProfile().email : 'demo@vitbikes.de';
    sendEmail('trainer_ignored', email, {
        trainerTitle: currentTrainer.title,
        module: currentTrainer.module,
        context_id: 'trainer_' + tid
    });
}
}
if(_origSnooze) _origSnooze();
else if(document.getElementById('trainerCardOverlay')) document.getElementById('trainerCardOverlay').style.display='none';
};

// ════════════════════════════════════════════════
// TRIGGER 6: Gruppencall-Erinnerung (24h vorher)
// ════════════════════════════════════════════════
window.triggerGroupcallReminder = function(callTitle, callDate, callTime, zoomLink, participants) {
participants.forEach(function(p){
sendEmail('groupcall_reminder', p.email, {
    callTitle: callTitle,
    date: callDate,
    time: callTime,
    link: zoomLink,
    context_id: 'call_' + callDate + '_' + callTitle
});
});
};

// ════════════════════════════════════════════════
// EMAIL LOG VIEWER (HQ feature)
// ════════════════════════════════════════════════
window.getEmailLog = function(){ return EMAIL_LOG; };

})();
</script>


<!-- === DB-BACKED SMART TRIGGER ENGINE === -->
<script>
(function(){
export function renderTrainerCard(a, c) {
var t=a.trainer;if(!t)return;var d=document.createElement('div');d.className='vit-card p-0 mb-3';
d.style.cssText='border:1px solid #fed7aa;overflow:hidden;';d.id='trainerCard_'+a.id;
d.innerHTML='<div style="padding:12px 16px;background:linear-gradient(135deg,rgba(239,125,0,0.08),rgba(245,158,11,0.04));border-bottom:1px solid #fed7aa;"><div class="flex items-center justify-between"><div class="flex items-center gap-2"><span style="font-size:18px">🎓</span><div><p class="text-[10px] font-bold text-vit-orange uppercase">'+(t.area_key||'').toUpperCase()+'</p><p class="text-sm font-bold text-gray-800">'+t.title+'</p></div></div><span class="text-[10px] text-gray-400">'+(t.duration_minutes||5)+' Min</span></div></div><div style="padding:12px 16px;"><p class="text-xs text-gray-600 mb-2">'+(t.summary||'')+'</p><div class="flex gap-2"><button onclick="window._startDbTrainer&&window._startDbTrainer(\''+a.id+'\')" class="flex-1 px-3 py-2 bg-vit-orange text-white text-xs font-bold rounded-lg hover:opacity-90">▶ Starten</button><button onclick="window._snoozeDbTrainer&&window._snoozeDbTrainer(\''+a.id+'\')" class="px-3 py-2 bg-gray-100 text-gray-500 text-xs font-bold rounded-lg hover:bg-gray-200">⏰ Später</button></div></div>';
c.appendChild(d);
}
export async function loadTrainersForArea(k){if(typeof sb==='undefined'||!sbProfile)return[];try{var r=await _sb().from('trainer_assignments').select('*,trainer:trainer_id(*)').eq('standort_id',_sbProfile().standort_id).eq('status','active');return(r.data||[]).filter(function(a){return a.trainer&&a.trainer.is_active&&(!k||a.trainer.area_key===k)&&(!a.cooldown_until||new Date(a.cooldown_until)<=new Date());}).sort(function(a,b){return(a.trainer.priority||3)-(b.trainer.priority||3);}).slice(0,1);}catch(e){return[];}}
export async function _smartTriggerCheck(k){if(typeof sb==='undefined'||!sbProfile||!_sbProfile().standort_id)return;var sid=_sbProfile().standort_id;try{var t=(await _sb().from('trainers').select('*').eq('area_key',k).eq('is_active',true)).data||[];if(!t.length)return;var ex=((await _sb().from('trainer_assignments').select('trainer_id').eq('standort_id',sid).eq('status','active')).data||[]).map(function(a){return a.trainer_id;});var cm={};((await _sb().from('trainer_completions').select('trainer_id,completed_at').eq('standort_id',sid).order('completed_at',{ascending:false}).limit(50)).data||[]).forEach(function(c){cm[c.trainer_id]=c.completed_at;});for(var i=0;i<t.length;i++){var tr=t[i];if(ex.indexOf(tr.id)>=0)continue;if(cm[tr.id]&&(Date.now()-new Date(cm[tr.id]).getTime())/86400000<14)continue;var fire=await _evaluateTrigger(tr,sid);if(fire)await _sb().from('trainer_assignments').upsert({trainer_id:tr.id,standort_id:sid,status:'active'},{onConflict:'trainer_id,standort_id'});}}catch(e){console.warn('SmartTrigger:',e);}}
export async function _evaluateTrigger(tr,sid){var k=tr.trigger_key;if(k==='open_offers_no_followup'){var r=await _sb().from('leads').select('id,letzter_kontakt,status').eq('standort_id',sid).not('status','in','("gewonnen","verloren")');var l=r.data||[];return l.filter(function(x){return!x.letzter_kontakt||(Date.now()-new Date(x.letzter_kontakt).getTime())/86400000>7;}).length>=5||l.length===0;}if(k==='bwa_missing'){var m=typeof getBwaMonth==='function'?getBwaMonth(new Date()):null;if(!m)return false;var r=await _sb().from('bwa_daten').select('id').eq('standort_id',sid).eq('monat',m.m+1).eq('jahr',m.y).limit(1);return!(r.data&&r.data.length>0);}if(k==='no_content_14d'){var s=new Date(Date.now()-14*86400000).toISOString();var r=await _sb().from('portal_events').select('id').eq('standort_id',sid).eq('event_type','content_uploaded').gte('created_at',s).limit(1);return!(r.data&&r.data.length>0);}return false;}
window.showTrainerForArea=async function(k,cid){var c=document.getElementById(cid);if(!c)return;c.innerHTML='';await _smartTriggerCheck(k);var a=await loadTrainersForArea(k);if(a.length>0)renderTrainerCard(a[0],c);};
window._snoozeDbTrainer=async function(id){if(typeof sb==='undefined')return;await _sb().from('trainer_assignments').update({cooldown_until:new Date(Date.now()+48*3600000).toISOString()}).eq('id',id);var c=document.getElementById('trainerCard_'+id);if(c)c.remove();};
window._startDbTrainer=function(){alert(_t('tr_started'));};
})();
</script>
<!-- === WISSEN MODULE: MEMBERSPOT-STYLE LEARNING PLATFORM === -->
<script>
(function(){

// ═══ PORTAL GUIDE DATA (auto-generated from module registry) ═══
var PORTAL_GUIDES = [
{id:'pg1',bereich:'portal',title:'Startseite & Tages-Cockpit',icon:'🏠',
 desc:'Deine Zentrale: Tages-KPIs, Health Score, Umsatz vs. Plan und Schnellzugriffe.',
 steps:['Nach Login siehst du das Tages-Cockpit mit 5 KPIs','Klicke auf eine Kachel um ins Modul zu springen','Der Health Score zeigt deine Gesamtperformance','Widgets kannst du über das Zahnrad-Icon anpassen'],
 version:'7.0',updated:'Feb 2026'},
{id:'pg2',bereich:'portal',title:'Verkauf & Pipeline',icon:'💰',
 desc:'Lead-Management, Pipeline-Stages, Angebote, Wochenauswertung und KI-Training.',
 steps:['Pipeline zeigt alle Leads in Kanban-Ansicht','Ziehe Leads zwischen den Stages','Streak-Anzeige motiviert zur täglichen Aktivität','Monatsziel-Fortschritt oben immer sichtbar','KI-Training simuliert Verkaufsgespräche'],
 version:'7.0',updated:'Feb 2026'},
{id:'pg3',bereich:'portal',title:'Controlling & BWA',icon:'📊',
 desc:'BWA hochladen, KPI-Report erhalten, Benchmarks freischalten, Plan/Ist vergleichen.',
 steps:['Cockpit zeigt BWA-Deadline Countdown','BWA hochladen unter "BWAs" Tab','Nach Upload: sofortiges KPI-Feedback','Benchmark wird freigeschaltet nach Einreichung','Gold-Status bei Abgabe vor dem 8.'],
 version:'7.0',updated:'Feb 2026'},
{id:'pg4',bereich:'portal',title:'Marketing',icon:'📣',
 desc:'Kampagnen-Cockpit, Social Media Ranking, Content-Upload, Budget-Übersicht.',
 steps:['Cockpit zeigt aktive Kampagnen und KPIs','Content hochladen im "Mein Content" Tab','Ranking zeigt deine Position im Netzwerk','Badge-System belohnt regelmäßige Aktivität'],
 version:'7.0',updated:'Feb 2026'},
{id:'pg5',bereich:'portal',title:'Einkauf',icon:'🛒',
 desc:'Sortiment, Lieferanten-Konditionen, Vororder-Planung, Bestandsmanagement.',
 steps:['Sortiment-Tab zeigt aktuelle Verfügbarkeit','Lieferanten-Tab mit Konditionen und Kontakten','Vororder-Planung mit Countdown-Timer'],
 version:'7.0',updated:'Feb 2026'},
{id:'pg6',bereich:'portal',title:'Support & Tickets',icon:'🎫',
 desc:'Tickets erstellen, Auto-Support nutzen, HQ-Kontakte finden.',
 steps:['Neues Ticket: Kategorie wählen','Auto-Support schlägt sofortige Lösungen vor','Nur bei Bedarf geht Ticket an HQ','Kontakte-Tab zeigt alle Ansprechpartner'],
 version:'7.0',updated:'Feb 2026'},
{id:'pg7',bereich:'portal',title:'Kalender & Aufgaben',icon:'📅',
 desc:'Termine verwalten, Aufgaben tracken, Gruppencall-Vorbereitung.',
 steps:['Monats/Wochen/Tagesansicht wählbar','Termine mit Typ und Teilnehmern anlegen','Aufgaben-Board mit Status-Spalten','Gruppencall-Vorbereitung vor jedem Call'],
 version:'7.0',updated:'Feb 2026'},
{id:'pg8',bereich:'portal',title:'Nutzerprofil & Einstellungen',icon:'⚙️',
 desc:'Persönliche Daten, Theme, E-Mail-Benachrichtigungen anpassen.',
 steps:['Klick auf Avatar oben rechts öffnet Profil','Name, Telefon, Position editierbar','Dark/Light Mode umschalten','E-Mail-Benachrichtigungen ein/ausschalten'],
 version:'7.0',updated:'Feb 2026'}
];

// ═══ KURSE (Memberspot-Style) ═══
var KURSE = [
{id:'k1',bereich:'verkauf',title:'Verkaufsprofi in 5 Tagen',
 desc:'Der komplette Verkaufskurs: Vom Erstkontakt bis zum Abschluss. Mit Praxisübungen und KI-Rollenspielen.',
 instructor:'vit:bikes Akademie',duration:'5 Tage · 3h Gesamt',level:'Einsteiger',
 thumbnail:'🎯',progress:35,enrolled:true,
 chapters:[
 {title:'Tag 1: Bedarfsanalyse',lessons:[
 {title:'Warum Fragen wichtiger sind als Antworten',type:'video',duration:'8:30',done:true},
 {title:'Die 5 Schlüsselfragen',type:'text',duration:'5 min',done:true},
 {title:'Übung: Bedarfsanalyse simulieren',type:'exercise',duration:'10 min',done:false}
 ]},
 {title:'Tag 2: Probefahrt & Erlebnis',lessons:[
 {title:'Die perfekte Probefahrt gestalten',type:'video',duration:'6:15',done:false},
 {title:'Emotionen wecken: Storytelling',type:'text',duration:'4 min',done:false},
 {title:'Checkliste: Probefahrt-Setup',type:'download',duration:'—',done:false}
 ]},
 {title:'Tag 3: Einwandbehandlung',lessons:[
 {title:'Top 5 Einwände und wie du sie löst',type:'video',duration:'12:00',done:false},
 {title:'Preis-Einwand: "Im Internet günstiger"',type:'text',duration:'6 min',done:false},
 {title:'KI-Rollenspiel: Einwand-Training',type:'ai',duration:'15 min',done:false}
 ]},
 {title:'Tag 4: Abschluss & Finanzierung',lessons:[
 {title:'Kaufsignale erkennen',type:'video',duration:'7:45',done:false},
 {title:'Leasing richtig erklären',type:'text',duration:'8 min',done:false}
 ]},
 {title:'Tag 5: Nachbetreuung',lessons:[
 {title:'Follow-Up das begeistert',type:'video',duration:'5:30',done:false},
 {title:'Empfehlungsmarketing aktivieren',type:'text',duration:'4 min',done:false},
 {title:'Abschlussquiz',type:'quiz',duration:'5 min',done:false}
 ]}
 ]},
{id:'k2',bereich:'controlling',title:'BWA verstehen & handeln',
 desc:'In 3 Lektionen lernst du, deine BWA zu lesen, KPIs zu interpretieren und Maßnahmen abzuleiten.',
 instructor:'vit:bikes Controlling',duration:'3 Lektionen · 90 Min',level:'Einsteiger',
 thumbnail:'📊',progress:0,enrolled:false,
 chapters:[
 {title:'Lektion 1: BWA-Grundlagen',lessons:[
 {title:'Was ist eine BWA?',type:'video',duration:'10:00',done:false},
 {title:'Die wichtigsten Positionen',type:'text',duration:'8 min',done:false},
 {title:'Deine erste BWA analysieren',type:'exercise',duration:'15 min',done:false}
 ]},
 {title:'Lektion 2: KPIs ableiten',lessons:[
 {title:'Rohertrag, Marge, Kostenquoten',type:'video',duration:'12:00',done:false},
 {title:'Benchmark: Du vs. Netzwerk',type:'text',duration:'6 min',done:false}
 ]},
 {title:'Lektion 3: Maßnahmen definieren',lessons:[
 {title:'Von der Zahl zur Aktion',type:'video',duration:'8:00',done:false},
 {title:'Maßnahmenplan erstellen',type:'exercise',duration:'20 min',done:false}
 ]}
 ]},
{id:'k3',bereich:'marketing',title:'Social Media Meisterklasse',
 desc:'Von Null auf Content-Pro: Reels, Stories, Ads – alles für lokale Fahrradhändler.',
 instructor:'vit:bikes Marketing',duration:'4 Module · 2h',level:'Mittel',
 thumbnail:'📱',progress:60,enrolled:true,
 chapters:[
 {title:'Modul 1: Content-Strategie',lessons:[
 {title:'Dein Content-Kalender',type:'video',duration:'10:00',done:true},
 {title:'Was funktioniert lokal?',type:'text',duration:'5 min',done:true},
 {title:'10 Posting-Ideen',type:'download',duration:'—',done:true}
 ]},
 {title:'Modul 2: Reels & Videos',lessons:[
 {title:'Reel in 60 Sekunden',type:'video',duration:'8:00',done:true},
 {title:'Schnitt mit CapCut',type:'video',duration:'12:00',done:true},
 {title:'Übung: Dein erstes Reel',type:'exercise',duration:'20 min',done:false}
 ]},
 {title:'Modul 3: Meta Ads',lessons:[
 {title:'Ads Manager Basics',type:'video',duration:'15:00',done:false},
 {title:'Zielgruppen definieren',type:'text',duration:'8 min',done:false}
 ]},
 {title:'Modul 4: Analyse & Optimierung',lessons:[
 {title:'KPIs die zählen',type:'video',duration:'7:00',done:false},
 {title:'A/B Testing',type:'text',duration:'5 min',done:false}
 ]}
 ]},
{id:'k4',bereich:'einkauf',title:'Einkauf & Rohertrag optimieren',
 desc:'Konditionen verhandeln, Dreingaben statt Rabatte, Lagerumschlag steigern.',
 instructor:'vit:bikes Einkauf',duration:'3 Module · 2h',level:'Fortgeschritten',
 thumbnail:'🛒',progress:0,enrolled:false,
 chapters:[
 {title:'Modul 1: Konditionsmodelle',lessons:[
 {title:'Block- vs. Vororder',type:'video',duration:'10:00',done:false},
 {title:'Rabatt-Staffeln verstehen',type:'text',duration:'6 min',done:false}
 ]},
 {title:'Modul 2: Rohertrag schützen',lessons:[
 {title:'Dreingaben statt Rabatte',type:'video',duration:'8:00',done:false},
 {title:'Sqlab & Co als Alternative',type:'text',duration:'5 min',done:false}
 ]},
 {title:'Modul 3: Bestandsmanagement',lessons:[
 {title:'Umschlag & Ladenhüter',type:'video',duration:'12:00',done:false},
 {title:'Saisonplanung Praxis',type:'exercise',duration:'15 min',done:false}
 ]}
 ]}
];

// ═══ ONBOARDING STEPS ═══
var ONBOARDING = [
{phase:'Phase 1 – Tag 1',title:'Portal verstehen',icon:'🚀',steps:[
{title:'Einloggen & Startseite erkunden',done:true,action:'Portal öffnen und alle Schnellzugriffe testen'},
{title:'Profil einrichten',done:true,action:'Name, Telefon, Position im Profil-Panel eintragen'},
{title:'1 Modul öffnen (Verkauf oder Controlling)',done:false,action:'Klicke in der Sidebar auf ein Modul deiner Wahl'}
]},
{phase:'Phase 2 – Woche 1',title:'Kernprozesse lernen',icon:'📚',steps:[
{title:'BWA hochladen',done:false,action:'Controlling → BWAs → Hochladen'},
{title:'Ersten Lead anlegen',done:false,action:'Verkauf → Pipeline → Neuer Lead'},
{title:'3 Schulungen abschließen',done:false,action:'Wissen → Akademie → Pflicht-Kurse starten'},
{title:'Support-Ticket erstellen (Test)',done:false,action:'Support → Neues Ticket → Auto-Support testen'},
{title:'Kalender-Termin anlegen',done:false,action:'Kalender → + Termin → Typ wählen'}
]},
{phase:'Phase 3 – Woche 2-3',title:'Performance verstehen',icon:'📊',steps:[
{title:'Health Score prüfen & verstehen',done:false,action:'Startseite → Health Score Widget → ⓘ klicken'},
{title:'Benchmark-Vergleich ansehen',done:false,action:'Controlling → Benchmarks (BWA muss eingereicht sein)'},
{title:'Am Gruppencall teilnehmen',done:false,action:'Kalender → Nächster Rollen-Call → Beitreten'},
{title:'1 Trainer abschließen',done:false,action:'Trainer-Card → Starten → Aufgabe erledigen'}
]}
];

// ═══ RENDER: Portal Guide ═══
window.renderPortalGuide = function() {
var el = document.getElementById('wissenGlobalContent');
if(!el) return;
var search = (document.getElementById('wissenSearch')||{}).value||'';
var items = PORTAL_GUIDES;
if(currentWissenBereich && currentWissenBereich !== 'all') items = items.filter(function(g){return g.bereich===currentWissenBereich;});
if(search) { var s=search.toLowerCase(); items=items.filter(function(g){return g.title.toLowerCase().indexOf(s)>-1||g.desc.toLowerCase().indexOf(s)>-1;}); }

el.innerHTML = '<div class="mb-4 p-4 rounded-xl" style="background:linear-gradient(135deg,rgba(239,125,0,0.06),rgba(245,158,11,0.04))"><div class="flex items-center gap-2 mb-1"><span style="font-size:16px">📱</span><span class="text-sm font-bold text-gray-800">Portal-Anleitungen</span></div><p class="text-xs text-gray-500">Automatisch generiert aus der aktuellen Portal-Version. Wird bei Modul-Änderungen aktualisiert.</p></div>' +
'<div class="grid grid-cols-1 md:grid-cols-2 gap-3">' +
items.map(function(g){
return '<div class="vit-card p-4 hover:shadow-md transition cursor-pointer" onclick="showGuideDetail(\''+g.id+'\')"><div class="flex items-center gap-3 mb-2"><span style="font-size:28px">'+g.icon+'</span><div><p class="text-sm font-bold text-gray-800">'+g.title+'</p><p class="text-[10px] text-gray-400">v'+g.version+' · '+g.updated+'</p></div></div><p class="text-xs text-gray-500">'+g.desc+'</p><p class="text-[10px] text-vit-orange font-semibold mt-2">'+g.steps.length+' Schritte →</p></div>';
}).join('') + '</div>';
};

window.showGuideDetail = function(id) {
var g = PORTAL_GUIDES.find(function(p){return p.id===id;});
if(!g) return;
var el = document.getElementById('wissenGlobalContent');
el.innerHTML = '<button onclick="switchWissenTyp(\'portal\')" class="text-xs text-vit-orange font-semibold mb-3 inline-block hover:underline">← Zurück zu allen Anleitungen</button>' +
'<div class="vit-card p-6"><div class="flex items-center gap-4 mb-4"><span style="font-size:40px">'+g.icon+'</span><div><h2 class="text-lg font-bold text-gray-800">'+g.title+'</h2><p class="text-sm text-gray-500">'+g.desc+'</p><p class="text-xs text-gray-400 mt-1">Version '+g.version+' · Aktualisiert '+g.updated+'</p></div></div>' +
'<div class="space-y-3">' + g.steps.map(function(s,i){
return '<div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"><span style="width:28px;height:28px;border-radius:50%;background:#EF7D00;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">'+(i+1)+'</span><p class="text-sm text-gray-700">'+s+'</p></div>';
}).join('') + '</div></div>';
};

// ═══ RENDER: Kurse (Memberspot-Style) ═══
window.renderKurse = function() {
var el = document.getElementById('wissenGlobalContent');
if(!el) return;
var items = KURSE;
if(currentWissenBereich && currentWissenBereich !== 'all') items = items.filter(function(k){return k.bereich===currentWissenBereich;});

el.innerHTML = items.map(function(k){
var totalLessons=0, doneLessons=0;
k.chapters.forEach(function(ch){ch.lessons.forEach(function(l){totalLessons++;if(l.done)doneLessons++;});});
var pct = totalLessons>0?Math.round(doneLessons/totalLessons*100):0;
return '<div class="vit-card p-0 mb-4 overflow-hidden hover:shadow-md transition cursor-pointer" onclick="showKursDetail(\''+k.id+'\')">' +
'<div class="flex">' +
'<div style="width:100px;background:linear-gradient(135deg,#EF7D00,#F59E0B);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-size:36px">'+k.thumbnail+'</span></div>' +
'<div class="p-4 flex-1"><div class="flex items-center justify-between mb-1"><h3 class="text-sm font-bold text-gray-800">'+k.title+'</h3>'+(k.enrolled?'<span class="text-[10px] px-2 py-0.5 bg-green-100 text-green-600 rounded-full font-bold">Eingeschrieben</span>':'<span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold">Nicht gestartet</span>')+'</div>' +
'<p class="text-xs text-gray-500 mb-2">'+k.desc+'</p>' +
'<div class="flex items-center gap-4 text-[10px] text-gray-400 mb-2"><span>👤 '+k.instructor+'</span><span>⏱ '+k.duration+'</span><span>📊 '+k.level+'</span><span>'+k.chapters.length+' Kapitel · '+totalLessons+' Lektionen</span></div>' +
'<div class="flex items-center gap-2"><div class="flex-1 bg-gray-200 rounded-full h-2"><div class="h-2 rounded-full transition-all" style="width:'+pct+'%;background:'+(pct===100?'#16a34a':'#EF7D00')+'"></div></div><span class="text-xs font-bold '+(pct===100?'text-green-600':'text-gray-500')+'">'+pct+'%</span></div>' +
'</div></div></div>';
}).join('');
};

window.showKursDetail = function(id) {
var k = KURSE.find(function(x){return x.id===id;});
if(!k) return;
var el = document.getElementById('wissenGlobalContent');
var h = '<button onclick="switchWissenTyp(\'kurse\')" class="text-xs text-vit-orange font-semibold mb-3 inline-block hover:underline">← Zurück zu allen Kursen</button>';
h += '<div class="vit-card p-6 mb-4"><div class="flex items-center gap-4 mb-3"><span style="font-size:48px">'+k.thumbnail+'</span><div><h2 class="text-lg font-bold text-gray-800">'+k.title+'</h2><p class="text-sm text-gray-500">'+k.desc+'</p><p class="text-xs text-gray-400 mt-1">'+k.instructor+' · '+k.duration+' · '+k.level+'</p></div></div>';
if(!k.enrolled) h += '<button onclick="enrollKurs(\''+k.id+'\')" class="px-5 py-2.5 bg-vit-orange text-white font-bold text-sm rounded-lg hover:opacity-90">▶ Kurs starten</button>';
h += '</div>';

// Chapters
k.chapters.forEach(function(ch,ci){
var chDone = ch.lessons.filter(function(l){return l.done;}).length;
var chTotal = ch.lessons.length;
var chPct = chTotal>0?Math.round(chDone/chTotal*100):0;
h += '<div class="vit-card p-0 mb-3 overflow-hidden">';
h += '<div class="p-4 cursor-pointer flex items-center justify-between" onclick="var b=this.nextElementSibling;b.style.display=b.style.display===\'none\'?\'block\':\'none\'" style="background:'+(chPct===100?'#f0fdf4':'#f9fafb')+'">';
h += '<div class="flex items-center gap-3"><span style="width:28px;height:28px;border-radius:50%;background:'+(chPct===100?'#16a34a':'#EF7D00')+';color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">'+(chPct===100?'✓':(ci+1))+'</span><div><p class="text-sm font-bold text-gray-800">'+ch.title+'</p><p class="text-[10px] text-gray-400">'+chDone+'/'+chTotal+' Lektionen</p></div></div>';
h += '<span class="text-xs text-gray-400">▼</span></div>';
h += '<div style="display:'+(ci===0?'block':'none')+'">';
ch.lessons.forEach(function(l){
var icons = {video:'▶️',text:'📄',exercise:'✏️',download:'📥',quiz:'❓',ai:'🤖'};
var ic = icons[l.type]||'📄';
h += '<div class="flex items-center gap-3 p-3 border-t border-gray-100 hover:bg-gray-50 transition cursor-pointer">';
h += '<span style="width:22px;height:22px;border-radius:50%;border:2px solid '+(l.done?'#16a34a':'#d1d5db')+';display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0">'+(l.done?'<span style="color:#16a34a">✓</span>':'')+'</span>';
h += '<span style="font-size:14px">'+ic+'</span>';
h += '<div class="flex-1"><p class="text-xs font-semibold text-gray-700">'+l.title+'</p></div>';
h += '<span class="text-[10px] text-gray-400">'+l.duration+'</span>';
h += '</div>';
});
h += '</div></div>';
});

// KI-Aufbereitung Button
h += '<div class="vit-card p-4 mt-4 text-center" style="border:2px dashed var(--c-border)"><p class="text-xs text-gray-400 mb-2">Inhalte erweitern?</p><button onclick="requestKiContent(\''+k.id+'\')" class="px-4 py-2 bg-purple-500 text-white text-xs font-bold rounded-lg hover:bg-purple-600">🤖 KI-Aufbereitung: Kurs erweitern</button><p class="text-[10px] text-gray-300 mt-1">KI erstellt zusätzliche Lektionen, Quizze und Zusammenfassungen</p></div>';

el.innerHTML = h;
};

window.enrollKurs = function(id) {
var k = KURSE.find(function(x){return x.id===id;});
if(k) { k.enrolled=true; k.progress=0; showKursDetail(id); }
};

window.requestKiContent = function(kursId) {
alert('🤖 KI-Aufbereitung gestartet!\n\nIn Produktion: Die Anthropic API generiert automatisch:\n• Zusammenfassungen pro Kapitel\n• Quiz-Fragen zur Wissensüberprüfung\n• Praxis-Aufgaben aus euren echten Daten\n• Handouts als PDF\n\nDies wird über die Claude API (Sonnet) realisiert.');
};

// ═══ RENDER: Onboarding ═══
window.renderOnboarding = function() {
var el = document.getElementById('wissenGlobalContent');
if(!el) return;
var totalSteps=0,doneSteps=0;
ONBOARDING.forEach(function(p){p.steps.forEach(function(s){totalSteps++;if(s.done)doneSteps++;});});
var pct = Math.round(doneSteps/totalSteps*100);

var h = '<div class="vit-card p-5 mb-4" style="border-left:4px solid #EF7D00"><div class="flex items-center justify-between mb-3"><div><h2 class="text-base font-bold text-gray-800">🚀 Dein Onboarding-Fortschritt</h2><p class="text-xs text-gray-500">'+doneSteps+' von '+totalSteps+' Schritten abgeschlossen</p></div><span class="text-2xl font-black" style="color:'+(pct===100?'#16a34a':'#EF7D00')+'">'+pct+'%</span></div>';
h += '<div class="bg-gray-200 rounded-full h-3 mb-1"><div class="h-3 rounded-full transition-all" style="width:'+pct+'%;background:linear-gradient(90deg,#EF7D00,#F59E0B)"></div></div></div>';

ONBOARDING.forEach(function(phase){
var pDone = phase.steps.filter(function(s){return s.done;}).length;
var pTotal = phase.steps.length;
h += '<div class="vit-card p-4 mb-3"><div class="flex items-center gap-3 mb-3"><span style="font-size:24px">'+phase.icon+'</span><div><p class="text-sm font-bold text-gray-800">'+phase.phase+'</p><p class="text-xs text-gray-500">'+phase.title+' · '+pDone+'/'+pTotal+'</p></div></div>';
phase.steps.forEach(function(s,i){
h += '<div class="flex items-center gap-3 p-2.5 rounded-lg mb-1 '+(s.done?'bg-green-50':'hover:bg-gray-50')+' cursor-pointer" onclick="toggleOnboardingStep(\''+phase.phase+'\','+i+')">';
h += '<span style="width:22px;height:22px;border-radius:50%;border:2px solid '+(s.done?'#16a34a':'#d1d5db')+';display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0">'+(s.done?'<span style="color:#16a34a">✓</span>':'')+'</span>';
h += '<div class="flex-1"><p class="text-xs font-semibold '+(s.done?'text-green-700 line-through':'text-gray-700')+'">'+s.title+'</p><p class="text-[10px] text-gray-400">'+s.action+'</p></div></div>';
});
h += '</div>';
});
el.innerHTML = h;
};

window.toggleOnboardingStep = function(phase,idx) {
var p = ONBOARDING.find(function(o){return o.phase===phase;});
if(p && p.steps[idx]) { p.steps[idx].done = !p.steps[idx].done; renderOnboarding(); }
};



// ═══ HOOK: extend switchWissenTyp ═══
var _origSwitch = window.switchWissenTyp;
window.switchWissenTyp = function(typ) {
if(typeof currentWissenTyp !== 'undefined') currentWissenTyp = typ;
// Update tab buttons
document.querySelectorAll('.wissen-typ-btn').forEach(function(b){
var isActive = b.getAttribute('data-wtt') === typ;
b.className = 'wissen-typ-btn whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm ' + (isActive ? 'border-vit-orange text-vit-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300');
});
// Render new types
if(typ === 'portal') { renderPortalGuide(); return; }
if(typ === 'kurse') { renderKurse(); return; }
if(typ === 'onboarding') { renderOnboarding(); return; }

// Fallback to original for akademie/handbuecher/bestpractices/faq
if(_origSwitch) _origSwitch(typ);
else if(typeof renderWissenGlobal === 'function') renderWissenGlobal();
};

})();
</script>

<!-- ═══ BILLING MODULE ═══ -->
<script>
(function(){
const BILLING_FN = 'https://lwwagbkxeofahhwebkab.supabase.co/functions/v1/billing';



// Strangler Fig
const _exports = {getBwaMonth,getDeadline,getEskalationsStufe,getRating,daysUntil,ratingBadge,eskalationBadge,updateBwaDeadlineWidget,updateNetzwerkWidget,showKpiReport,setBenchmarkLock,renderHqBwaStatus,renderDailyFocus,renderSalesMomentum,sc,se,sl,renderHealthScore,renderHqHealth,toggleWidgetInfo,showEmailNotification,renderTrainerCard,loadTrainersForArea,_smartTriggerCheck,_evaluateTrigger};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[cockpit-engine.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
