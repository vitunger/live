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

export function ratingBadge(rating, isSubmitted) {
var map = {
gold: {t:'🥇 GOLD', c:'#ca8a04', bg:'rgba(202,138,4,0.1)'},
ok: {t:'✅ OK', c:'#16a34a', bg:'rgba(22,163,74,0.1)'},
overdue: {t:'🚨 ÜBERFÄLLIG', c:'#dc2626', bg:'rgba(220,38,38,0.1)'},
late: {t:'⚠️ VERSPÄTET', c:'#ea580c', bg:'rgba(234,88,12,0.1)'},
missing: {t:'⏳ AUSSTEHEND', c:'#9ca3af', bg:'rgba(156,163,175,0.1)'}
};
var key = (rating === 'overdue' && isSubmitted) ? 'late' : rating;
var m = map[key] || map.missing;
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
badgeEl.innerHTML = ratingBadge(rating, true);
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
var gold = 0, ok = 0, missing = 0, late = 0, total = 30;
if(typeof sb !== 'undefined') {
try {
    var bwaMo = getBwaMonth(new Date());
    var stdResp = await _sb().from('standorte').select('id,name');
    total = (stdResp.data || []).length || 30;
    var netzResp = await _sb().rpc('get_bwa_network_status', { p_monat: bwaMo.m + 1, p_jahr: bwaMo.y });
    if(netzResp.data && typeof netzResp.data === 'object') {
        gold = netzResp.data.gold || 0;
        ok = netzResp.data.ok || 0;
        late = netzResp.data.late || 0;
        total = netzResp.data.total_standorte || total;
    }
    missing = total - gold - ok - late;
} catch(e) { console.warn('Netzwerk widget:', e); missing = total; }
} else { missing = total; }
var submitted = gold + ok + late;
var pct = Math.round(submitted / total * 100);

var el = function(id) { return document.getElementById(id); };
if(el('bwaNetzwerkProgress')) el('bwaNetzwerkProgress').textContent = submitted + ' von ' + total + ' eingereicht';
if(el('bwaNetzwerkBar')) el('bwaNetzwerkBar').style.width = pct + '%';
if(el('bwaNwGold')) el('bwaNwGold').textContent = '🥇 Gold: ' + gold;
if(el('bwaNwOk')) el('bwaNwOk').textContent = '✅ OK: ' + ok;
if(el('bwaNwMissing')) el('bwaNwMissing').textContent = '⏳ Ausstehend: ' + missing;
if(el('bwaNwOverdue')) el('bwaNwOverdue').textContent = (late > 0 ? '⚠️ Verspätet: ' + late : '');
}

// ──── KPI REPORT (Sofort-Nutzen nach Upload) ────
export function showKpiReport(bwaMo, rating) {
// Delegate to the live async version from bwa-cockpit.js if available
// This stub only exists as fallback – bwa-cockpit.js should have already
// registered the real async function on window.showKpiReport
if(window._bwaCockpitShowKpiReport) {
window._bwaCockpitShowKpiReport(bwaMo, rating);
return;
}
// Minimal fallback: show loading state (the real function will overwrite this)
var report = document.getElementById('bwaKpiReport');
if(!report) return;
report.style.display = '';
var moName = MO_NAMES[bwaMo.m] + ' ' + bwaMo.y;
document.getElementById('bwaKpiReportMonth').textContent = moName;
document.getElementById('bwaKpiRating').innerHTML = ratingBadge(rating);
var grid = document.getElementById('bwaKpiReportGrid');
if(grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--c-muted);font-size:12px;padding:8px">⏳ Lade echte Zahlen…</div>';
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
    '<td class="py-2.5">'+ratingBadge(s.rating, !!s.submitted)+'</td>'+
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

// Strangler Fig
const _exports = {getBwaMonth,getDeadline,getEskalationsStufe,getRating,daysUntil,ratingBadge,eskalationBadge,updateBwaDeadlineWidget,updateNetzwerkWidget,showKpiReport,setBenchmarkLock,renderHqBwaStatus};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
// [prod] log removed
