/**
 * views/verkauf.js - Verkauf Module (Wochenansicht + Auswertung)
 *
 * Pipeline/CRM lives entirely in /portal/inline/react-deal-pipeline.jsx
 * This module handles: Tab switching, Wochenansicht, Jahrestabelle/Auswertung
 *
 * @module views/verkauf
 */
function _sb()        { return window.sb; }
function _sbProfile() { return window.sbProfile; }
function _t(k)        { return typeof window.t === 'function' ? window.t(k) : k; }

// ── Tab Switching ──────────────────────────────────
export function showVerkaufTab(tabName) {
    document.querySelectorAll('.vk-tab-content').forEach(function(t){t.style.display='none';});
    document.querySelectorAll('.vk-tab-btn').forEach(function(b){
        b.className='vk-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
    });
    var tabId='vkTab'+tabName.charAt(0).toUpperCase()+tabName.slice(1);
    var el=document.getElementById(tabId);
    if(el) el.style.display='block';
    var btn=document.querySelector('.vk-tab-btn[data-tab="'+tabName+'"]');
    if(btn) btn.className='vk-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
    if(tabName==='woche') loadWeekFromDb();
    if(tabName==='pipeline') mountReactPipeline();
    if(tabName==='auswertung') renderJahresTabelle();
}

// ── Legacy redirect: showNewLeadModal → React quickCreate ──
export function showNewLeadModal() {
    if(typeof window.openReactNewLead === 'function') {
        window.openReactNewLead();
    } else {
        showVerkaufTab('pipeline');
        setTimeout(function(){ if(typeof window.openReactNewLead === 'function') window.openReactNewLead(); }, 500);
    }
}

// ── Wochenansicht ──────────────────────────────────
var currentWeekStart = null;
var weekDbData = null;

export function getMonday(d) { var day = d.getDay(); var diff = d.getDate() - day + (day === 0 ? -6 : 1); var m = new Date(d); m.setDate(diff); m.setHours(0,0,0,0); return m; }
export function getKW(d) { var t = new Date(d.getFullYear(), 0, 1); var dn = ((d - t) / 86400000); return Math.ceil((dn + t.getDay() + 1) / 7); }

export function changeWeek(dir) {
    if(!currentWeekStart) { currentWeekStart = getMonday(new Date()); }
    var d = new Date(currentWeekStart);
    d.setDate(d.getDate() + dir * 7);
    currentWeekStart = d;
    loadWeekFromDb();
}

export async function loadWeekFromDb() {
    if(!currentWeekStart) currentWeekStart = getMonday(new Date());
    var mon = currentWeekStart;
    var sun = new Date(mon); sun.setDate(mon.getDate() + 5);
    var monStr = mon.toISOString().slice(0,10);
    var sunStr = sun.toISOString().slice(0,10);
    var kw = getKW(mon);
    var fmt = function(d) { return d.getDate().toString().padStart(2,'0') + '.' + (d.getMonth()+1).toString().padStart(2,'0') + '.'; };
    var titleEl = document.getElementById('weekTitle');
    if(titleEl) titleEl.textContent = 'KW ' + kw + ' \u00B7 ' + fmt(mon) + ' - ' + fmt(sun) + sun.getFullYear();

    try {
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var query = _sb().from('verkauf_tracking').select('*').gte('datum', monStr).lte('datum', sunStr).order('datum');
        if(stdId && !_sbProfile().is_hq) query = query.eq('standort_id', stdId);
        var resp = await query;
        if(resp.error) throw resp.error;
        weekDbData = resp.data || [];
    } catch(e) { weekDbData = []; console.warn('Week load error:', e); }
    renderWeekViewFromDb();
}

export function renderWeekViewFromDb() {
    var data = weekDbData || [];
    var dayNames = ['So','Mo','Di','Mi','Do','Fr','Sa'];
    var weekDays = ['Mo','Di','Mi','Do','Fr','Sa'];
    var sellerMap = {};
    data.forEach(function(entry) {
        var name = entry.verkaeufer_name;
        if(!sellerMap[name]) sellerMap[name] = { name: name, plan_soll: 0, days: {} };
        weekDays.forEach(function(d) { if(!sellerMap[name].days[d]) sellerMap[name].days[d] = {day:d,plan:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0}; });
        var d = new Date(entry.datum);
        var dayName = dayNames[d.getDay()];
        if(sellerMap[name].days[dayName]) {
            var dd = sellerMap[name].days[dayName];
            dd.plan += (entry.plan_termine || 0);
            dd.geplant += (entry.geplant || 0);
            dd.spontan += (entry.spontan || 0);
            dd.online += (entry.online || 0);
            dd.ergo += (entry.ergo || 0);
            dd.verkauft += (entry.verkauft || 0);
            dd.uebergabe += (entry.uebergabe || 0);
            dd.umsatz += parseFloat(entry.umsatz) || 0;
        }
        sellerMap[name].plan_soll += (entry.plan_termine || 0);
    });
    var sellers = Object.values(sellerMap);

    var filterEl = document.getElementById('weekSellerFilter');
    if(filterEl) {
        var curVal = filterEl.value;
        var opts = '<option value="all">Alle Verkaeufer</option>';
        sellers.forEach(function(s) { opts += '<option value="'+s.name+'"'+(s.name===curVal?' selected':'')+'>'+s.name+'</option>'; });
        filterEl.innerHTML = opts;
    }
    var filter = filterEl ? filterEl.value : 'all';
    var filtered = filter === 'all' ? sellers : sellers.filter(function(s){return s.name === filter;});

    var totalPlan=0, totalGesamt=0, totalVerkauft=0, totalUmsatz=0;
    filtered.forEach(function(s) {
        totalPlan += s.plan_soll;
        weekDays.forEach(function(dn) {
            var dd = s.days[dn];
            if(dd) { totalGesamt += dd.geplant+dd.spontan+dd.online; totalVerkauft += dd.verkauft; totalUmsatz += dd.umsatz; }
        });
    });
    var el;
    el = document.getElementById('wkPlan'); if(el) el.textContent = totalPlan;
    el = document.getElementById('wkGesamt'); if(el) el.textContent = totalGesamt;
    el = document.getElementById('wkVerkauft'); if(el) el.textContent = totalVerkauft;
    el = document.getElementById('wkUmsatz'); if(el) el.textContent = totalUmsatz.toLocaleString('de-DE') + ' \u20AC';
    var quoteVal = totalGesamt > 0 ? Math.round((totalVerkauft/totalGesamt)*100) : 0;
    el = document.getElementById('wkQuote');
    if(el) { el.textContent = quoteVal + '%'; el.className = 'text-2xl font-bold ' + (quoteVal >= 70 ? 'text-green-600' : quoteVal >= 40 ? 'text-orange-600' : 'text-red-600'); }

    var container = document.getElementById('weekSellerTables');
    if(!container) return;
    if(filtered.length === 0) { container.innerHTML = '<div class="vit-card p-8 text-center text-gray-400"><p class="text-lg mb-2">'+_t('sales_no_data')+'</p><p class="text-sm">'+_t('sales_add_entry')+'</p></div>'; return; }
    var html = '';
    filtered.forEach(function(s) {
        var sUmsatz=0, sGesamt=0, sVerkauft=0;
        weekDays.forEach(function(dn) { var dd=s.days[dn]; if(dd) { sUmsatz+=dd.umsatz; sGesamt+=dd.geplant+dd.spontan+dd.online; sVerkauft+=dd.verkauft; } });
        var sQuote = sGesamt > 0 ? Math.round((sVerkauft/sGesamt)*100) : 0;
        html += '<div class="vit-card overflow-hidden">';
        html += '<div class="flex items-center justify-between p-4 bg-gray-50 border-b">';
        html += '<div class="flex items-center space-x-3"><div class="w-8 h-8 bg-vit-orange rounded-full flex items-center justify-center text-white font-bold text-sm">'+s.name.charAt(0)+'</div>';
        html += '<div><p class="font-semibold text-gray-800">'+s.name+'</p><p class="text-xs text-gray-500">Plan: '+s.plan_soll+' Termine</p></div></div>';
        html += '<div class="flex space-x-4 text-center">';
        html += '<div><p class="text-xs text-gray-500">Beratungen</p><p class="font-bold text-blue-600">'+sGesamt+'</p></div>';
        html += '<div><p class="text-xs text-gray-500">Verkauft</p><p class="font-bold text-green-600">'+sVerkauft+'</p></div>';
        html += '<div><p class="text-xs text-gray-500">Umsatz</p><p class="font-bold text-vit-orange">'+sUmsatz.toLocaleString('de-DE')+' \u20AC</p></div>';
        html += '<div><p class="text-xs text-gray-500">Quote</p><p class="font-bold '+(sQuote>=70?'text-green-600':sQuote>=40?'text-orange-600':'text-red-600')+'">'+sQuote+'%</p></div>';
        html += '</div></div>';
        html += '<div class="overflow-x-auto"><table class="w-full text-sm">';
        html += '<thead><tr class="bg-gray-50 text-xs"><th class="py-2 px-3 text-left text-gray-500">Tag</th><th class="py-2 px-3 text-center text-gray-500">Plan</th><th class="py-2 px-3 text-center text-blue-600">Geplant</th><th class="py-2 px-3 text-center text-purple-600">Spontan</th><th class="py-2 px-3 text-center text-cyan-600">Online</th><th class="py-2 px-3 text-center text-pink-600">Ergo</th><th class="py-2 px-3 text-center font-bold text-gray-700">Gesamt</th><th class="py-2 px-3 text-center text-green-600">Verkauft</th><th class="py-2 px-3 text-center text-gray-500">Uebergabe</th><th class="py-2 px-3 text-right text-vit-orange">Umsatz</th></tr></thead>';
        html += '<tbody>';
        weekDays.forEach(function(dn) {
            var dd = s.days[dn] || {plan:0,geplant:0,spontan:0,online:0,ergo:0,verkauft:0,uebergabe:0,umsatz:0};
            var total = dd.geplant+dd.spontan+dd.online;
            var hasData = dd.plan>0 || total>0 || dd.umsatz>0;
            html += '<tr class="border-b '+(hasData?'':'text-gray-300')+'">';
            html += '<td class="py-2 px-3 font-semibold">'+dn+'</td>';
            html += '<td class="py-2 px-3 text-center">'+(dd.plan||'-')+'</td>';
            html += '<td class="py-2 px-3 text-center text-blue-600">'+(dd.geplant||'-')+'</td>';
            html += '<td class="py-2 px-3 text-center text-purple-600">'+(dd.spontan||'-')+'</td>';
            html += '<td class="py-2 px-3 text-center text-cyan-600">'+(dd.online||'-')+'</td>';
            html += '<td class="py-2 px-3 text-center text-pink-600">'+(dd.ergo||'-')+'</td>';
            html += '<td class="py-2 px-3 text-center font-bold">'+(total||'-')+'</td>';
            html += '<td class="py-2 px-3 text-center text-green-600 font-bold">'+(dd.verkauft||'-')+'</td>';
            html += '<td class="py-2 px-3 text-center">'+(dd.uebergabe||'-')+'</td>';
            html += '<td class="py-2 px-3 text-right font-semibold '+(dd.umsatz>0?'text-vit-orange':'')+'">'+(dd.umsatz>0?dd.umsatz.toLocaleString('de-DE')+' \u20AC':'-')+'</td>';
            html += '</tr>';
        });
        html += '</tbody></table></div></div>';
    });
    container.innerHTML = html;
}

// ── Auswertung / Jahrestabelle ─────────────────────
export async function renderJahresTabelle() {
    var tbody = document.getElementById('jahresTabelle');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-400">Lade Daten...</td></tr>';

    var sb = window.sb || window.supabase;
    var profile = window.sbProfile;
    if(!sb || !profile) { tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-gray-400">Keine Verbindung</td></tr>'; return; }

    var stdId = profile.standort_id;
    var yr = new Date().getFullYear();
    var curMonth = new Date().getMonth();
    var monatsNamen = ['Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

    var trackingData = {};
    try {
        var q = _sb().from('verkauf_tracking').select('datum, geplant, spontan, ergo, verkauft, umsatz')
            .gte('datum', yr + '-01-01').lte('datum', yr + '-12-31');
        if(stdId && !profile.is_hq) q = q.eq('standort_id', stdId);
        var resp = await q;
        if(resp.data) {
            resp.data.forEach(function(r) {
                var m = new Date(r.datum).getMonth();
                if(!trackingData[m]) trackingData[m] = {beratungen:0, verkauft:0, umsatz:0};
                trackingData[m].beratungen += (r.geplant||0) + (r.spontan||0);
                trackingData[m].verkauft += (r.verkauft||0);
                trackingData[m].umsatz += parseFloat(r.umsatz||0);
            });
        }
    } catch(e) { console.warn('[Auswertung] Tracking error:', e); }

    var planData = {};
    try {
        if(stdId) {
            var jpResp = await _sb().from('jahresplaene').select('plan_daten').eq('standort_id', stdId).eq('jahr', yr).single();
            if(jpResp.data && jpResp.data.plan_daten) {
                for(var i = 1; i <= 12; i++) {
                    var mp = jpResp.data.plan_daten[String(i)] || jpResp.data.plan_daten[i] || {};
                    planData[i-1] = { umsatz: mp.umsatz || 0 };
                }
            }
        }
    } catch(e) { console.warn('[Auswertung] Jahresplan error:', e); }

    var html = '';
    var totals = {beratungen:0, verkauft:0, umsatz:0, plan:0};

    for(var i = 0; i < 12; i++) {
        var td = trackingData[i] || {beratungen:0, verkauft:0, umsatz:0};
        var plan = planData[i] ? planData[i].umsatz : 0;
        var isCurrent = (i === curMonth);
        var isFuture = i > curMonth && td.beratungen === 0 && td.verkauft === 0;
        var quote = td.beratungen > 0 ? Math.round((td.verkauft / td.beratungen) * 100) : 0;
        var avg = td.verkauft > 0 ? Math.round(td.umsatz / td.verkauft) : 0;
        totals.beratungen += td.beratungen; totals.verkauft += td.verkauft; totals.umsatz += td.umsatz; totals.plan += plan;

        html += '<tr class="border-b ' + (isCurrent ? 'bg-blue-50 border-l-4 border-blue-400' : '') + ' ' + (isFuture ? 'text-gray-400' : '') + '">';
        html += '<td class="py-2.5 px-3 font-semibold">' + monatsNamen[i] + '</td>';
        html += '<td class="text-right py-2.5 px-3">' + (td.beratungen > 0 ? td.beratungen : '\u2014') + '</td>';
        html += '<td class="text-right py-2.5 px-3 font-bold text-green-600">' + (td.verkauft > 0 ? td.verkauft : '\u2014') + '</td>';
        html += '<td class="text-right py-2.5 px-3 ' + (quote >= 70 ? 'text-green-600' : quote > 0 ? 'text-orange-600' : '') + '">' + (quote > 0 ? quote + '%' : '\u2014') + '</td>';
        html += '<td class="text-right py-2.5 px-3">' + (td.umsatz > 0 ? Math.round(td.umsatz).toLocaleString('de-DE') + ' \u20AC' : '\u2014') + '</td>';
        html += '<td class="text-right py-2.5 px-3">' + (avg > 0 ? avg.toLocaleString('de-DE') + ' \u20AC' : '\u2014') + '</td>';
        html += '</tr>';
    }

    var totalQuote = totals.beratungen > 0 ? Math.round((totals.verkauft / totals.beratungen) * 100) : 0;
    var totalAvg = totals.verkauft > 0 ? Math.round(totals.umsatz / totals.verkauft) : 0;
    html += '<tr class="bg-gray-100 border-t-2"><td class="py-3 px-3 font-bold">GESAMT</td>';
    html += '<td class="text-right py-3 px-3 font-bold">' + (totals.beratungen > 0 ? totals.beratungen : '\u2014') + '</td>';
    html += '<td class="text-right py-3 px-3 font-bold text-green-600">' + (totals.verkauft > 0 ? totals.verkauft : '\u2014') + '</td>';
    html += '<td class="text-right py-3 px-3 font-bold">' + (totalQuote > 0 ? totalQuote + '%' : '\u2014') + '</td>';
    html += '<td class="text-right py-3 px-3 font-bold">' + (totals.umsatz > 0 ? Math.round(totals.umsatz).toLocaleString('de-DE') + ' \u20AC' : '\u2014') + '</td>';
    html += '<td class="text-right py-3 px-3 font-bold">' + (totalAvg > 0 ? totalAvg.toLocaleString('de-DE') + ' \u20AC' : '\u2014') + '</td>';
    html += '</tr>';
    tbody.innerHTML = html;

    var elPlan = document.getElementById('ausJahresPlan');
    var elYTD = document.getElementById('ausUmsatzYTD');
    var elVK = document.getElementById('ausVerkauft');
    var elQuote = document.getElementById('ausQuote');
    var elAvg = document.getElementById('ausAvgPreis');
    if(elPlan) elPlan.textContent = totals.plan > 0 ? totals.plan.toLocaleString('de-DE') + ' \u20AC' : '\u2014';
    if(elYTD) elYTD.textContent = totals.umsatz > 0 ? Math.round(totals.umsatz).toLocaleString('de-DE') + ' \u20AC' : '0 \u20AC';
    if(elVK) elVK.textContent = totals.verkauft;
    if(elQuote) elQuote.textContent = totalQuote > 0 ? totalQuote + '%' : '0%';
    if(elAvg) elAvg.textContent = totalAvg > 0 ? totalAvg.toLocaleString('de-DE') + ' \u20AC' : '0 \u20AC';

    renderAuswertungChart(trackingData, planData);
}

function renderAuswertungChart(trackingData, planData) {
    var container = document.getElementById('ausChartContainer');
    if(!container) return;
    var maxVal = 1;
    for(var i = 0; i < 12; i++) {
        var td = trackingData[i] || {};
        var pd = planData[i] || {};
        if((td.umsatz||0) > maxVal) maxVal = td.umsatz;
        if((pd.umsatz||0) > maxVal) maxVal = pd.umsatz;
    }
    var months = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    var w = container.clientWidth || 800;
    var h = 180;
    var barW = Math.floor((w - 40) / 12) - 4;

    var svg = '<svg viewBox="0 0 '+w+' '+(h+30)+'" style="width:100%;height:100%">';
    for(var g = 0; g <= 4; g++) {
        var gy = h - (g/4)*h;
        svg += '<line x1="40" y1="'+gy+'" x2="'+w+'" y2="'+gy+'" stroke="#f0f0f0" stroke-width="1"/>';
        svg += '<text x="36" y="'+(gy+4)+'" text-anchor="end" fill="#9ca3af" font-size="10">' + Math.round(maxVal*g/4/1000) + '</text>';
    }
    for(var i = 0; i < 12; i++) {
        var td = trackingData[i] || {};
        var x = 44 + i * (barW + 4);
        var val = td.umsatz || 0;
        var barH = maxVal > 0 ? (val / maxVal) * h : 0;
        svg += '<rect x="'+x+'" y="'+(h-barH)+'" width="'+barW+'" height="'+barH+'" rx="3" fill="'+(val > 0 ? '#EF7D00' : '#f0f0f0')+'"/>';
        svg += '<text x="'+(x+barW/2)+'" y="'+(h+18)+'" text-anchor="middle" fill="#9ca3af" font-size="10">'+months[i]+'</text>';
    }
    svg += '</svg>';
    container.innerHTML = svg;
}

// ── Strangler Fig: Window Exports ──────────────────
const _exports = {showNewLeadModal,renderJahresTabelle,showVerkaufTab,changeWeek,getMonday,getKW,loadWeekFromDb,renderWeekViewFromDb};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
