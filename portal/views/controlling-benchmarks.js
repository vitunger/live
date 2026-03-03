/**
 * views/controlling-benchmarks.js - Netzwerk-Benchmark Vergleich
 *
 * Sub-module of controlling.js (Orchestrator).
 * Exports: renderBenchmarks, window._switchBenchMonth
 *
 * @module views/controlling-benchmarks
 */
function _sb()        { return window.sb; }
function _sbUser()    { return window.sbUser; }
function _sbProfile() { return window.sbProfile; }
function _escH(s)     { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)        { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t){ if (typeof window.showToast === 'function') window.showToast(m,t); }

// Local state
var _benchMonat = null, _benchJahr = null;

export async function renderBenchmarks(forceMonat, forceJahr) {
    var el = document.getElementById('benchmarkDynamic');
    if(!el) return;
    var stdId = _sbProfile() ? _sbProfile().standort_id : null;
    if(!stdId) { el.innerHTML = '<p class="text-center text-gray-400 py-8">Kein Standort zugeordnet.</p>'; return; }

    el.innerHTML = '<div class="flex items-center justify-center py-12"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div><p class="ml-3 text-gray-500">Benchmark wird geladen...</p></div>';

    try {
        var params = { p_standort_id: stdId };
        if(forceMonat && forceJahr) { params.p_monat = forceMonat; params.p_jahr = forceJahr; }
        var resp = await _sb().rpc('get_benchmark_data', params);
        if(resp.error) throw resp.error;
        var d = resp.data;
        if(!d || d.error === 'no_data') { el.innerHTML = '<p class="text-center text-gray-400 py-8">Noch keine BWA-Daten vorhanden. Lade eine BWA hoch, um den Benchmark zu sehen.</p>'; return; }

        var own = d.own || {};
        var netz = d.netzwerk || {};
        var nCount = d.anzahl_standorte || 1;
        var rankings = d.rankings || {};
        var months = d.available_months || [];
        var trend = d.trend_6m || [];
        _benchMonat = d.monat; _benchJahr = d.jahr;

        var mLabels = ['','Januar','Februar','M\u00e4rz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

        var h = '';

        // ── Header with month selector ──
        h += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">';
        h += '<div><h2 class="text-lg font-semibold text-gray-800">Netzwerk-Benchmark</h2>';
        h += '<p class="text-sm text-gray-500">Dein Standort vs. Netzwerk-Durchschnitt</p></div>';
        h += '<select id="benchMonthSelect" onchange="window._switchBenchMonth(this.value)" class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-300 focus:border-orange-400">';
        months.forEach(function(m) {
            var sel = (m.monat === d.monat && m.jahr === d.jahr) ? ' selected' : '';
            h += '<option value="'+m.monat+'-'+m.jahr+'"'+sel+'>'+mLabels[m.monat]+' '+m.jahr+'</option>';
        });
        h += '</select></div>';

        // ── Network status badge ──
        h += '<div class="flex items-center space-x-3 mb-6 p-3 rounded-lg '+(nCount >= 3 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200')+'">';
        h += '<div class="text-2xl font-bold '+(nCount >= 3 ? 'text-green-600' : 'text-yellow-600')+'">'+nCount+'</div>';
        h += '<div><p class="text-sm font-semibold '+(nCount >= 3 ? 'text-green-700' : 'text-yellow-700')+'">Standorte mit BWA in '+mLabels[d.monat]+' '+d.jahr+'</p>';
        if(nCount < 3) {
            h += '<p class="text-xs text-yellow-600">Benchmark wird aussagekr\u00e4ftiger mit mehr Teilnehmern.</p>';
        } else {
            h += '<p class="text-xs text-green-600">Ausreichend Daten f\u00fcr aussagekr\u00e4ftigen Vergleich.</p>';
        }
        h += '</div></div>';

        // ── Rankings row (if enough data) ──
        if(nCount >= 2) {
            h += '<div class="grid grid-cols-3 gap-3 mb-6">';
            var rankItems = [
                {label:'Umsatz', rank: rankings.umsatz_rank, icon:'\ud83d\udcb0'},
                {label:'Rohertrag', rank: rankings.rohertrag_rank, icon:'\ud83d\udcc8'},
                {label:'Ergebnis', rank: rankings.ergebnis_rank, icon:'\ud83c\udfc6'}
            ];
            rankItems.forEach(function(ri) {
                var r = ri.rank || '-';
                var medal = r === 1 ? '\ud83e\udd47' : r === 2 ? '\ud83e\udd48' : r === 3 ? '\ud83e\udd49' : ri.icon;
                h += '<div class="text-center p-4 bg-white border border-gray-200 rounded-xl">';
                h += '<p class="text-2xl mb-1">'+medal+'</p>';
                h += '<p class="text-xl font-bold text-gray-800">Platz '+r+'</p>';
                h += '<p class="text-xs text-gray-500">'+ri.label+' (von '+nCount+')</p></div>';
            });
            h += '</div>';
        }

        // ── KPI comparison cards ──
        var kpis = [
            {label:'Umsatz', own:parseFloat(own.umsatz)||0, netz:parseFloat(netz.avg_umsatz)||0, fmt:'eur', higher_better:true, icon:'\ud83d\udcb0'},
            {label:'Rohertragsmarge', own:parseFloat(own.rohertrag_pct)||0, netz:parseFloat(netz.avg_rohertrag_pct)||0, fmt:'pct', higher_better:true, icon:'\ud83d\udcc8', p25:parseFloat(netz.p25_rohertrag_pct), p75:parseFloat(netz.p75_rohertrag_pct), best:parseFloat(netz.best_rohertrag_pct)},
            {label:'Wareneinsatzquote', own:parseFloat(own.wareneinsatz_pct)||0, netz:parseFloat(netz.avg_wareneinsatz_pct)||0, fmt:'pct', higher_better:false, icon:'\ud83d\uded2'},
            {label:'Personalkostenquote', own:parseFloat(own.personalkosten_pct)||0, netz:parseFloat(netz.avg_personalkosten_pct)||0, fmt:'pct', higher_better:false, icon:'\ud83d\udc65'},
            {label:'Raumkostenquote', own:parseFloat(own.raumkosten_pct)||0, netz:parseFloat(netz.avg_raumkosten_pct)||0, fmt:'pct', higher_better:false, icon:'\ud83c\udfe0'},
            {label:'Werbekostenquote', own:parseFloat(own.werbekosten_pct)||0, netz:parseFloat(netz.avg_werbekosten_pct)||0, fmt:'pct', higher_better:false, icon:'\ud83d\udce3'},
            {label:'Ergebnismarge', own:parseFloat(own.ergebnis_pct)||0, netz:parseFloat(netz.avg_ergebnis_pct)||0, fmt:'pct', higher_better:true, icon:'\u2b50', best:parseFloat(netz.best_ergebnis_pct)}
        ];

        h += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">';

        kpis.forEach(function(k) {
            var diff, diffLabel;
            if(k.fmt === 'pct') {
                diff = k.own - k.netz;
                diffLabel = (diff>=0?'+':'')+diff.toFixed(1)+' Pp';
            } else {
                diff = k.netz ? ((k.own/k.netz-1)*100) : 0;
                diffLabel = (diff>=0?'+':'')+Math.round(diff)+'%';
            }
            var isGood = k.higher_better ? (k.own >= k.netz) : (k.own <= k.netz);
            var color = isGood ? 'green' : (Math.abs(diff) < 3 ? 'yellow' : 'red');

            var ownStr = k.fmt === 'eur' ? Math.round(k.own).toLocaleString('de-DE')+' \u20ac' : k.own.toFixed(1)+'%';
            var netzStr = k.fmt === 'eur' ? Math.round(k.netz).toLocaleString('de-DE')+' \u20ac' : k.netz.toFixed(1)+'%';

            h += '<div class="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition">';
            h += '<div class="flex items-center justify-between mb-2"><span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">'+k.label+'</span><span class="text-lg">'+k.icon+'</span></div>';
            h += '<p class="text-2xl font-bold text-gray-800">'+ownStr+'</p>';
            h += '<div class="flex items-center justify-between mt-1">';
            h += '<span class="text-xs text-gray-400">\u00d8 Netzwerk: '+netzStr+'</span>';
            h += '<span class="text-xs font-bold px-2 py-0.5 rounded-full bg-'+color+'-100 text-'+color+'-700">'+diffLabel+'</span>';
            h += '</div>';
            // Progress bar: own vs netz
            var barMax = Math.max(Math.abs(k.own), Math.abs(k.netz)) * 1.2 || 1;
            var ownW = Math.round(Math.abs(k.own) / barMax * 100);
            var netzW = Math.round(Math.abs(k.netz) / barMax * 100);
            h += '<div class="mt-3 space-y-1">';
            h += '<div class="flex items-center gap-2"><span class="text-[10px] text-gray-500 w-10">Du</span><div class="flex-1 bg-gray-100 rounded-full h-2"><div class="bg-'+color+'-500 h-2 rounded-full transition-all" style="width:'+ownW+'%"></div></div></div>';
            h += '<div class="flex items-center gap-2"><span class="text-[10px] text-gray-400 w-10">\u00d8</span><div class="flex-1 bg-gray-100 rounded-full h-2"><div class="bg-gray-300 h-2 rounded-full" style="width:'+netzW+'%"></div></div></div>';
            h += '</div>';
            if(k.best !== undefined && k.best !== null && !isNaN(k.best)) {
                h += '<p class="text-[10px] text-gray-400 mt-1">Bester im Netzwerk: '+k.best.toFixed(1)+'%</p>';
            }
            h += '</div>';
        });

        h += '</div>';

        // ── Trend table ──
        if(trend.length >= 2) {
            h += '<div class="bg-white border border-gray-200 rounded-xl p-5 mb-6">';
            h += '<h3 class="text-sm font-semibold text-gray-800 mb-4">\ud83d\udcc9 Trend-Vergleich (letzte '+trend.length+' Monate)</h3>';
            h += '<div class="overflow-x-auto"><table class="w-full text-sm">';
            h += '<thead><tr class="border-b border-gray-100">';
            h += '<th class="text-left py-2 px-2 text-xs font-semibold text-gray-500">Monat</th>';
            h += '<th class="text-right py-2 px-2 text-xs font-semibold text-gray-500">Umsatz</th>';
            h += '<th class="text-right py-2 px-2 text-xs font-semibold text-gray-500">\u00d8 Netzwerk</th>';
            h += '<th class="text-right py-2 px-2 text-xs font-semibold text-gray-500">Rohertrag %</th>';
            h += '<th class="text-right py-2 px-2 text-xs font-semibold text-gray-500">\u00d8 Netzwerk</th>';
            h += '<th class="text-right py-2 px-2 text-xs font-semibold text-gray-500">Ergebnis %</th>';
            h += '<th class="text-right py-2 px-2 text-xs font-semibold text-gray-500">\u00d8 Netzwerk</th>';
            h += '<th class="text-center py-2 px-2 text-xs font-semibold text-gray-500">N</th>';
            h += '</tr></thead><tbody>';

            trend.forEach(function(t) {
                var rohColor = (t.own_rohertrag_pct||0) >= (t.netz_rohertrag_pct||0) ? 'text-green-600' : 'text-red-600';
                var ergColor = (t.own_ergebnis_pct||0) >= (t.netz_ergebnis_pct||0) ? 'text-green-600' : 'text-red-600';
                var umsColor = (t.own_umsatz||0) >= (t.netz_umsatz||0) ? 'text-green-600' : 'text-red-600';
                h += '<tr class="border-b border-gray-50 hover:bg-gray-50">';
                h += '<td class="py-2 px-2 font-medium text-gray-700">'+mLabels[t.monat].substring(0,3)+' '+t.jahr+'</td>';
                h += '<td class="py-2 px-2 text-right font-semibold '+umsColor+'">'+Math.round(t.own_umsatz||0).toLocaleString('de-DE')+' \u20ac</td>';
                h += '<td class="py-2 px-2 text-right text-gray-400">'+Math.round(t.netz_umsatz||0).toLocaleString('de-DE')+' \u20ac</td>';
                h += '<td class="py-2 px-2 text-right font-semibold '+rohColor+'">'+(t.own_rohertrag_pct||0).toFixed(1)+'%</td>';
                h += '<td class="py-2 px-2 text-right text-gray-400">'+(t.netz_rohertrag_pct||0).toFixed(1)+'%</td>';
                h += '<td class="py-2 px-2 text-right font-semibold '+ergColor+'">'+(t.own_ergebnis_pct||0).toFixed(1)+'%</td>';
                h += '<td class="py-2 px-2 text-right text-gray-400">'+(t.netz_ergebnis_pct||0).toFixed(1)+'%</td>';
                h += '<td class="py-2 px-2 text-center text-gray-400 text-xs">'+(t.netz_count||0)+'</td>';
                h += '</tr>';
            });

            h += '</tbody></table></div></div>';
        }

        // ── Handlungsempfehlungen ──
        var tips = [];
        if(own.personalkosten_pct && netz.avg_personalkosten_pct && own.personalkosten_pct > parseFloat(netz.avg_personalkosten_pct) + 2) {
            tips.push({icon:'\u26a0\ufe0f', color:'red', text:'Deine Personalkostenquote liegt '+(own.personalkosten_pct - parseFloat(netz.avg_personalkosten_pct)).toFixed(1)+' Pp \u00fcber dem Netzwerk-Schnitt. Pr\u00fcfe Personalplanung und Produktivit\u00e4t.'});
        }
        if(own.rohertrag_pct && netz.avg_rohertrag_pct && own.rohertrag_pct < parseFloat(netz.avg_rohertrag_pct) - 2) {
            tips.push({icon:'\ud83d\udcc9', color:'red', text:'Dein Rohertrag liegt '+(parseFloat(netz.avg_rohertrag_pct) - own.rohertrag_pct).toFixed(1)+' Pp unter dem Netzwerk. Pr\u00fcfe Preisgestaltung und Einkaufskonditionen.'});
        }
        if(own.ergebnis_pct && own.ergebnis_pct < 0) {
            tips.push({icon:'\ud83d\udea8', color:'red', text:'Dein Betriebsergebnis ist negativ ('+own.ergebnis_pct.toFixed(1)+'%). Handlungsbedarf bei Kosten oder Umsatz.'});
        }
        if(own.raumkosten_pct && netz.avg_raumkosten_pct && own.raumkosten_pct > parseFloat(netz.avg_raumkosten_pct) + 3) {
            tips.push({icon:'\ud83c\udfe0', color:'yellow', text:'Deine Raumkosten sind \u00fcberdurchschnittlich ('+(own.raumkosten_pct - parseFloat(netz.avg_raumkosten_pct)).toFixed(1)+' Pp \u00fcber \u00d8). Mietverhandlung oder Fl\u00e4chenoptimierung pr\u00fcfen.'});
        }
        if(own.rohertrag_pct && netz.avg_rohertrag_pct && own.rohertrag_pct >= parseFloat(netz.avg_rohertrag_pct) && own.ergebnis_pct > 0) {
            tips.push({icon:'\u2705', color:'green', text:'Dein Standort performt gut! Rohertrag und Ergebnis liegen im oder \u00fcber dem Netzwerk-Schnitt.'});
        }

        if(tips.length > 0) {
            h += '<div class="bg-white border border-gray-200 rounded-xl p-5">';
            h += '<h3 class="text-sm font-semibold text-gray-800 mb-3">\ud83d\udca1 Handlungsempfehlungen</h3>';
            tips.forEach(function(tip) {
                h += '<div class="flex items-start gap-3 p-3 rounded-lg bg-'+tip.color+'-50 border border-'+tip.color+'-100 mb-2">';
                h += '<span class="text-lg flex-shrink-0">'+tip.icon+'</span>';
                h += '<p class="text-sm text-'+tip.color+'-800">'+tip.text+'</p>';
                h += '</div>';
            });
            h += '</div>';
        }

        el.innerHTML = h;
    } catch(e) {
        console.error('[Benchmarks]', e);
        el.innerHTML = '<p class="text-center text-red-400 py-8">Fehler beim Laden: '+_escH(e.message)+'</p>';
    }
}

// Month switcher callback
window._switchBenchMonth = function(val) {
    var parts = val.split('-');
    renderBenchmarks(parseInt(parts[0]), parseInt(parts[1]));
};

// === Window Exports ===
const _exports = {renderBenchmarks};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
