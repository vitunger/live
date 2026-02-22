/**
 * views/hq-finanzen.js - Partner-Portal HQ Finanzen & Marketing
 * @module views/hq-finanzen
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// === HQ FINANZEN ===
export async function renderHqFinanzen() {
    if(hqStandorte.length === 0) await loadHqStandorte();
    var active = hqStandorte.filter(function(s){return s.umsatzIst>0;});
    var totalU = hqStandorte.reduce(function(a,s){return a+s.umsatzIst;},0);
    var totalP = hqStandorte.reduce(function(a,s){return a+s.umsatzPlan;},0);
    var avgRoh = active.length?(active.reduce(function(a,s){return a+s.rohertrag;},0)/active.length).toFixed(1):0;
    var avgRab = active.length?(active.reduce(function(a,s){return a+s.rabattQuote;},0)/active.length).toFixed(1):0;

    var kpi = document.getElementById('hqFinKpis');
    if(kpi) kpi.innerHTML = '<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Netzwerk-Umsatz</p><p class="text-2xl font-bold">'+fmt(totalU)+' €</p><p class="text-xs '+(totalU>=totalP?'text-green-500':'text-red-500')+'">Plan: '+fmt(totalP)+' €</p></div>'
        +'<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Ø Rohertrag</p><p class="text-2xl font-bold '+(avgRoh>=38?'text-green-600':'text-red-500')+'">'+avgRoh+'%</p></div>'
        +'<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Ø Rabattquote</p><p class="text-2xl font-bold '+(avgRab<=5?'text-green-600':'text-red-500')+'">'+avgRab+'%</p><p class="text-xs text-gray-500">Ziel: unter 5%</p></div>'
        +'<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">BWA-Auffaelligkeiten</p><p class="text-2xl font-bold text-red-600">'+hqStandorte.filter(function(s){return s.bwaAuffaellig;}).length+'</p></div>';

    // Table
    var t = document.getElementById('hqFinTable');
    if(t) {
        var th = '<thead><tr class="border-b-2 border-gray-200"><th class="text-left py-2 px-2 text-xs text-gray-500">Standort</th><th class="text-right py-2 px-2 text-xs text-gray-500">Umsatz Plan</th><th class="text-right py-2 px-2 text-xs text-gray-500">Umsatz Ist</th><th class="text-right py-2 px-2 text-xs text-gray-500">Abw.</th><th class="text-right py-2 px-2 text-xs text-gray-500">Rohertrag</th><th class="text-right py-2 px-2 text-xs text-gray-500">Rabatt %</th><th class="text-center py-2 px-2 text-xs text-gray-500">BWA</th></tr></thead><tbody>';
        hqStandorte.slice().sort(function(a,b){return b.umsatzIst-a.umsatzIst;}).forEach(function(s){
            var abw = s.umsatzPlan?Math.round((s.umsatzIst/s.umsatzPlan-1)*100):0;
            th += '<tr class="border-b border-gray-100 hover:bg-gray-50"><td class="py-2 px-2 text-sm font-semibold">'+s.name+'</td><td class="py-2 px-2 text-sm text-right text-gray-500">'+fmt(s.umsatzPlan)+'</td><td class="py-2 px-2 text-sm text-right font-semibold">'+fmt(s.umsatzIst)+'</td><td class="py-2 px-2 text-sm text-right font-bold '+(abw>=0?'text-green-600':'text-red-500')+'">'+(abw>=0?'+':'')+abw+'%</td><td class="py-2 px-2 text-sm text-right '+(s.rohertrag>=38?'text-green-600':'text-red-500')+'">'+s.rohertrag+'%</td><td class="py-2 px-2 text-sm text-right '+(s.rabattQuote<=5?'text-green-600':s.rabattQuote<=8?'text-yellow-600':'text-red-500')+'">'+s.rabattQuote+'%</td><td class="py-2 px-2 text-center">'+(s.bwaAuffaellig?'<span class="text-xs text-red-500">⚠️</span>':'<span class="text-xs text-green-500">✓</span>')+'</td></tr>';
        });
        th += '</tbody>';
        t.innerHTML = th;
    }

    // Alerts
    var al = document.getElementById('hqFinAlerts');
    if(al) {
        var alh = '';
        hqStandorte.filter(function(s){return s.bwaAuffaellig;}).sort(function(a,b){return a.rohertrag-b.rohertrag;}).forEach(function(s){
            alh += '<div class="p-3 bg-red-50 rounded-lg flex items-center justify-between"><div><p class="text-sm font-semibold text-red-700">'+s.name+'</p><p class="text-xs text-red-500">'+s.bwaAuffaellig+'</p></div><span class="text-xs text-gray-400">Rohertrag: '+s.rohertrag+'%</span></div>';
        });
        al.innerHTML = alh || '<p class="text-sm text-green-600">✅ Keine Auffaelligkeiten</p>';
    }

    // Rohertrag Ranking
    var rr = document.getElementById('hqFinRohertrag');
    if(rr) {
        var rrh = '';
        hqStandorte.filter(function(s){return s.umsatzIst>0;}).sort(function(a,b){return b.rohertrag-a.rohertrag;}).forEach(function(s){
            var w = Math.max(5, s.rohertrag * 2);
            rrh += '<div class="flex items-center space-x-2"><span class="text-xs w-28 truncate">'+s.name+'</span><div class="flex-1 bg-gray-100 rounded-full h-4"><div class="h-4 rounded-full '+(s.rohertrag>=38?'bg-green-500':s.rohertrag>=34?'bg-yellow-500':'bg-red-500')+'" style="width:'+w+'%"></div></div><span class="text-xs font-bold w-12 text-right">'+s.rohertrag+'%</span></div>';
        });
        rr.innerHTML = rrh;
    }

    // === WAWI NETZWERK-UMSATZ ===
    if (typeof window.renderHqWawiUmsatz === 'function') window.renderHqWawiUmsatz();
}


// === ADS / MARKETING PERFORMANCE ===
var adsCurrentContext = 'standort'; // 'standort' oder 'hq'

export function adsFmtEuro(n) { return Number(n||0).toLocaleString('de-DE', {style:'currency', currency:'EUR', minimumFractionDigits:0, maximumFractionDigits:0}); }
export function adsFmtK(n) { n = Number(n||0); if (n >= 1000000) return (n/1000000).toFixed(1)+'M'; if (n >= 1000) return (n/1000).toFixed(1)+'K'; return n.toString(); }
export function adsSetText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

export async function loadAdsData(context) {
    adsCurrentContext = context || 'standort';
    var suffix = adsCurrentContext === 'hq' ? 'Hq' : '';
    var filterEl = document.getElementById('adsZeitraumFilter' + (suffix || ''));
    var tage = filterEl ? parseInt(filterEl.value) : 30;
    var datumVon = new Date();
    datumVon.setDate(datumVon.getDate() - tage);
    var vonStr = datumVon.toISOString().split('T')[0];

    try {
        var query = _sb().from('ads_performance').select('*').gte('datum', vonStr).order('datum', {ascending: false});
        if (adsCurrentContext !== 'hq' && !_sbProfile().is_hq) {
            query = query.eq('standort_id', _sbProfile().standort_id);
        }
        var res = await query;
        if (res.error) throw res.error;
        adsPerformanceData = res.data || [];

        var kQuery = _sb().from('ads_kampagnen').select('*, standorte(name, stadt)').eq('ist_aktiv', true);
        if (adsCurrentContext !== 'hq' && !_sbProfile().is_hq) kQuery = kQuery.eq('standort_id', _sbProfile().standort_id);
        var kRes = await kQuery;
        adsKampagnenData = kRes.data || [];

        if (_sbProfile().is_hq) {
            var syncRes = await _sb().from('ads_accounts').select('plattform, letzter_sync, sync_status, sync_fehler');
            renderAdsSyncInfo(syncRes.data || [], suffix);
        }

        renderAdsKpis(suffix);
        renderAdsChart(suffix);
        renderAdsKampagnenTabelle(suffix);
        if (adsCurrentContext === 'hq' || _sbProfile().is_hq) renderAdsStandortVergleich(suffix);

        // Auch Performance-Tab KPIs updaten mit echten Daten
        updateMktPerformanceFromAds();

    } catch (e) {
        console.error('loadAdsData:', e);
    }
}

export function renderAdsKpis(suffix) {
    var s = suffix || '';
    var d = adsPerformanceData;
    var totalAusgaben=0, totalImpressions=0, totalKlicks=0, totalConv=0, totalConvWert=0;
    var googleAusgaben=0, googleKlicks=0, googleConv=0, googleKamp=new Set();
    var metaAusgaben=0, metaReichweite=0, metaConv=0, metaKamp=new Set();

    d.forEach(function(r) {
        totalAusgaben += Number(r.ausgaben||0); totalImpressions += Number(r.impressionen||0);
        totalKlicks += Number(r.klicks||0); totalConv += Number(r.conversions||0); totalConvWert += Number(r.conversion_wert||0);
        if (r.plattform==='google') { googleAusgaben+=Number(r.ausgaben||0); googleKlicks+=Number(r.klicks||0); googleConv+=Number(r.conversions||0); googleKamp.add(r.kampagne_id); }
        else { metaAusgaben+=Number(r.ausgaben||0); metaReichweite+=Number(r.reichweite||0); metaConv+=Number(r.conversions||0); metaKamp.add(r.kampagne_id); }
    });
    var ctr = totalImpressions > 0 ? (totalKlicks / totalImpressions * 100).toFixed(2) : '0';
    var cpc = totalKlicks > 0 ? (totalAusgaben / totalKlicks).toFixed(2) : '0';

    adsSetText('adsKpiAusgaben'+s, adsFmtEuro(totalAusgaben));
    adsSetText('adsKpiImpressions'+s, adsFmtK(totalImpressions));
    adsSetText('adsKpiKlicks'+s, adsFmtK(totalKlicks));
    adsSetText('adsKpiCtr'+s, ctr+'%');
    adsSetText('adsKpiCpc'+s, adsFmtEuro(Number(cpc)));
    adsSetText('adsKpiConversions'+s, Math.round(totalConv).toString());
    adsSetText('adsGoogleAusgaben'+s, adsFmtEuro(googleAusgaben));
    adsSetText('adsGoogleKlicks'+s, adsFmtK(googleKlicks));
    adsSetText('adsGoogleConv'+s, Math.round(googleConv).toString());
    adsSetText('adsGoogleKampagnenCount'+s, googleKamp.size+' Kampagnen');
    adsSetText('adsMetaAusgaben'+s, adsFmtEuro(metaAusgaben));
    adsSetText('adsMetaReichweite'+s, adsFmtK(metaReichweite));
    adsSetText('adsMetaConv'+s, Math.round(metaConv).toString());
    adsSetText('adsMetaKampagnenCount'+s, metaKamp.size+' Kampagnen');
}

export function renderAdsChart(suffix) {
    var s = suffix || '';
    var c = document.getElementById('adsChartContainer'+s);
    if (!c) return;
    var tageMap = {};
    adsPerformanceData.forEach(function(r) {
        if (!tageMap[r.datum]) tageMap[r.datum] = {ausgaben:0, klicks:0};
        tageMap[r.datum].ausgaben += Number(r.ausgaben||0);
        tageMap[r.datum].klicks += Number(r.klicks||0);
    });
    var tage = Object.keys(tageMap).sort();
    if (!tage.length) { c.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">Keine Daten im gewählten Zeitraum</p>'; return; }
    var maxAusgaben = Math.max.apply(null, tage.map(function(t){return tageMap[t].ausgaben;}))||1;
    var maxKlicks = Math.max.apply(null, tage.map(function(t){return tageMap[t].klicks;}))||1;
    var sichtbar = tage.slice(-14);
    c.innerHTML = '<div class="flex items-end space-x-1" style="height:120px">'
        + sichtbar.map(function(tag) {
            var d = tageMap[tag];
            var hA = Math.max(4, Math.round(d.ausgaben / maxAusgaben * 100));
            var hK = Math.max(4, Math.round(d.klicks / maxKlicks * 100));
            var tl = new Date(tag+'T00:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'});
            return '<div class="flex-1 flex flex-col items-center justify-end" title="'+tl+': '+adsFmtEuro(d.ausgaben)+' / '+d.klicks+' Klicks">'
                +'<div class="w-full flex space-x-0.5 justify-center items-end">'
                +'<div class="bg-vit-orange rounded-t" style="width:45%;height:'+hA+'px;opacity:0.8"></div>'
                +'<div class="bg-blue-400 rounded-t" style="width:45%;height:'+hK+'px;opacity:0.7"></div>'
                +'</div><p class="text-[9px] text-gray-400 mt-1 leading-none">'+tl+'</p></div>';
        }).join('') + '</div>'
        +'<div class="flex items-center justify-center space-x-4 mt-3">'
        +'<span class="flex items-center space-x-1 text-xs text-gray-500"><span class="w-3 h-3 rounded bg-vit-orange opacity-80"></span><span>Ausgaben</span></span>'
        +'<span class="flex items-center space-x-1 text-xs text-gray-500"><span class="w-3 h-3 rounded bg-blue-400 opacity-70"></span><span>Klicks</span></span></div>';
}

export function renderAdsKampagnenTabelle(suffix) {
    var s = suffix || '';
    var tbody = document.getElementById('adsKampagnenTabelle'+s);
    if (!tbody) return;
    var kampMap = {};
    adsPerformanceData.forEach(function(r) {
        if (adsPlattformFilter !== 'alle' && r.plattform !== adsPlattformFilter) return;
        var key = r.plattform+'_'+r.kampagne_id;
        if (!kampMap[key]) kampMap[key] = {plattform:r.plattform, name:r.kampagne_name, ausgaben:0, impressionen:0, klicks:0, conversions:0, conversion_wert:0};
        kampMap[key].ausgaben += Number(r.ausgaben||0); kampMap[key].impressionen += Number(r.impressionen||0);
        kampMap[key].klicks += Number(r.klicks||0); kampMap[key].conversions += Number(r.conversions||0); kampMap[key].conversion_wert += Number(r.conversion_wert||0);
    });
    var kampagnen = Object.values(kampMap).sort(function(a,b){return b.ausgaben-a.ausgaben;});
    if (!kampagnen.length) { tbody.innerHTML = '<tr><td colspan="9" class="p-4 text-center text-gray-400">Keine Kampagnen</td></tr>'; return; }
    tbody.innerHTML = kampagnen.map(function(k) {
        var ctr = k.impressionen>0 ? (k.klicks/k.impressionen*100).toFixed(2) : '0.00';
        var cpc = k.klicks>0 ? (k.ausgaben/k.klicks).toFixed(2) : '—';
        var roas = k.ausgaben>0 ? (k.conversion_wert/k.ausgaben).toFixed(1) : '—';
        var pb = k.plattform==='google' ? '<span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Google</span>' : '<span class="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Meta</span>';
        var rc = roas!=='—'&&Number(roas)>=3 ? 'text-green-600 font-bold' : roas!=='—'&&Number(roas)>=1 ? 'text-yellow-600' : 'text-red-500';
        return '<tr class="border-b hover:bg-gray-50"><td class="p-3 font-semibold text-gray-800 max-w-[200px] truncate" title="'+_escH(k.name)+'">'+_escH(k.name)+'</td><td class="p-3 text-center">'+pb+'</td><td class="p-3 text-right font-semibold">'+adsFmtEuro(k.ausgaben)+'</td><td class="p-3 text-right">'+adsFmtK(k.impressionen)+'</td><td class="p-3 text-right">'+adsFmtK(k.klicks)+'</td><td class="p-3 text-right">'+ctr+'%</td><td class="p-3 text-right">'+adsFmtEuro(Number(cpc||0))+'</td><td class="p-3 text-right font-semibold text-green-600">'+Math.round(k.conversions)+'</td><td class="p-3 text-right '+rc+'">'+(roas!=='—'?roas+'x':'—')+'</td></tr>';
    }).join('');
}

export function filterAdsPlattform(filter) {
    adsPlattformFilter = filter;
    document.querySelectorAll('.ads-plattform-filter').forEach(function(btn) {
        btn.className = btn.getAttribute('data-filter')===filter
            ? 'ads-plattform-filter text-xs px-3 py-1 rounded-full bg-vit-orange text-white font-semibold'
            : 'ads-plattform-filter text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-semibold';
    });
    renderAdsKampagnenTabelle(adsCurrentContext==='hq'?'Hq':'');
}

export function renderAdsStandortVergleich(suffix) {
    var s = suffix || '';
    var tbody = document.getElementById('adsStandortTabelle'+s);
    if (!tbody) return;
    var standortMap = {}; var totalAusgaben = 0;
    adsPerformanceData.forEach(function(r) {
        var sid = r.standort_id || 'ohne';
        if (!standortMap[sid]) standortMap[sid] = {name:'Ohne Zuordnung', ausgaben:0, klicks:0, conversions:0, conversion_wert:0};
        standortMap[sid].ausgaben += Number(r.ausgaben||0); standortMap[sid].klicks += Number(r.klicks||0);
        standortMap[sid].conversions += Number(r.conversions||0); standortMap[sid].conversion_wert += Number(r.conversion_wert||0);
        totalAusgaben += Number(r.ausgaben||0);
    });
    // Namen aus Kampagnen-Mapping
    adsKampagnenData.forEach(function(k) {
        if (k.standort_id && standortMap[k.standort_id] && k.standorte) {
            standortMap[k.standort_id].name = k.standorte.name + (k.standorte.stadt ? ' ('+k.standorte.stadt+')' : '');
        }
    });
    // Fallback: Namen aus Kampagnen-Namen parsen
    adsPerformanceData.forEach(function(r) {
        var sid = r.standort_id || 'ohne';
        if (standortMap[sid] && standortMap[sid].name === 'Ohne Zuordnung' && r.kampagne_name) {
            var m = r.kampagne_name.match(/\[vit:bikes\s+([^\]]+)\]/);
            if (m) standortMap[sid].name = 'vit:bikes ' + m[1];
        }
    });
    var standorte = Object.values(standortMap).sort(function(a,b){return b.ausgaben-a.ausgaben;});
    if (!standorte.length) { tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-400">Keine Daten</td></tr>'; return; }
    tbody.innerHTML = standorte.map(function(st) {
        var cpc = st.klicks>0 ? (st.ausgaben/st.klicks).toFixed(2) : '—';
        var roas = st.ausgaben>0 ? (st.conversion_wert/st.ausgaben).toFixed(1) : '—';
        var anteil = totalAusgaben>0 ? Math.round(st.ausgaben/totalAusgaben*100) : 0;
        return '<tr class="border-b hover:bg-gray-50"><td class="p-3 font-semibold text-gray-800">'+_escH(st.name)+'</td><td class="p-3 text-right">'+adsFmtEuro(st.ausgaben)+'</td><td class="p-3 text-right">'+adsFmtK(st.klicks)+'</td><td class="p-3 text-right font-semibold text-green-600">'+Math.round(st.conversions)+'</td><td class="p-3 text-right">'+adsFmtEuro(Number(cpc||0))+'</td><td class="p-3 text-right">'+(roas!=='—'?roas+'x':'—')+'</td><td class="p-3"><div class="w-full bg-gray-200 rounded-full h-2"><div class="bg-vit-orange h-2 rounded-full" style="width:'+anteil+'%"></div></div><span class="text-xs text-gray-500">'+anteil+'%</span></td></tr>';
    }).join('');
}

export function renderAdsSyncInfo(accounts, suffix) {
    var s = suffix || '';
    var el = document.getElementById('adsSyncStatus'+s);
    if (!el || !accounts.length) return;
    el.innerHTML = accounts.map(function(a) {
        var icon = a.sync_status==='success'?'🟢':a.sync_status==='error'?'🔴':'🟡';
        var zeit = a.letzter_sync ? new Date(a.letzter_sync).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : 'nie';
        return icon+' '+a.plattform+': '+zeit;
    }).join(' &nbsp;|&nbsp; ');
}

// Update die bestehenden Performance-Tab KPIs mit echten Ads-Daten
export function updateMktPerformanceFromAds() {
    if (!adsPerformanceData.length) return;
    var totalAusgaben=0, totalImpressions=0, totalKlicks=0, totalConv=0;
    var metaAusgaben=0, metaImpressions=0, metaKlicks=0;
    var googleAusgaben=0, googleImpressions=0, googleKlicks=0;

    adsPerformanceData.forEach(function(r) {
        totalAusgaben+=Number(r.ausgaben||0); totalImpressions+=Number(r.impressionen||0);
        totalKlicks+=Number(r.klicks||0); totalConv+=Number(r.conversions||0);
        if(r.plattform==='meta') { metaAusgaben+=Number(r.ausgaben||0); metaImpressions+=Number(r.impressionen||0); metaKlicks+=Number(r.klicks||0); }
        else { googleAusgaben+=Number(r.ausgaben||0); googleImpressions+=Number(r.impressionen||0); googleKlicks+=Number(r.klicks||0); }
    });

    // Cross-Channel KPIs updaten
    var kpiEl = document.getElementById('mktCrossKpis');
    if (kpiEl) {
        kpiEl.innerHTML = ''
            +'<div class="p-4 bg-gray-50 rounded-lg text-center"><p class="text-xs text-gray-500">Kosten Gesamt</p><p class="text-xl font-bold text-gray-800">'+adsFmtEuro(totalAusgaben)+'</p><p class="text-xs text-green-600">Live-Daten</p></div>'
            +'<div class="p-4 bg-gray-50 rounded-lg text-center"><p class="text-xs text-gray-500">Impressionen Gesamt</p><p class="text-xl font-bold text-gray-800">'+adsFmtK(totalImpressions)+'</p><p class="text-xs text-green-600">Live-Daten</p></div>'
            +'<div class="p-4 bg-gray-50 rounded-lg text-center"><p class="text-xs text-gray-500">Klicks Gesamt</p><p class="text-xl font-bold text-gray-800">'+adsFmtK(totalKlicks)+'</p><p class="text-xs text-green-600">Live-Daten</p></div>'
            +'<div class="p-4 bg-gray-50 rounded-lg text-center"><p class="text-xs text-gray-500">Conversions</p><p class="text-xl font-bold text-vit-orange">'+Math.round(totalConv)+'</p><p class="text-xs text-gray-400">Alle Plattformen</p></div>'
            +'<div class="p-4 bg-gray-50 rounded-lg text-center"><p class="text-xs text-gray-500">CPC</p><p class="text-xl font-bold text-gray-800">'+(totalKlicks>0?adsFmtEuro(totalAusgaben/totalKlicks):'—')+'</p><p class="text-xs text-gray-400">⌀ Kosten/Klick</p></div>'
            +'<div class="p-4 bg-gray-50 rounded-lg text-center"><p class="text-xs text-gray-500">CTR</p><p class="text-xl font-bold text-blue-600">'+(totalImpressions>0?(totalKlicks/totalImpressions*100).toFixed(2):'0')+'%</p><p class="text-xs text-gray-400">Click-Through</p></div>';
    }

    // Meta Kampagnen-Tabelle im Performance-Tab updaten
    var metaTb = document.getElementById('mktMetaKampagnen');
    if (metaTb) {
        var metaKampMap = {};
        adsPerformanceData.filter(function(r){return r.plattform==='meta';}).forEach(function(r) {
            var key = r.kampagne_id;
            if (!metaKampMap[key]) metaKampMap[key] = {name:r.kampagne_name, ausgaben:0, impressionen:0, klicks:0};
            metaKampMap[key].ausgaben+=Number(r.ausgaben||0); metaKampMap[key].impressionen+=Number(r.impressionen||0); metaKampMap[key].klicks+=Number(r.klicks||0);
        });
        var metaKamps = Object.values(metaKampMap).sort(function(a,b){return b.ausgaben-a.ausgaben;});
        var html = metaKamps.map(function(k,i) {
            return '<tr class="border-b"><td class="py-1.5 px-2">'+(i+1)+'.</td><td class="py-1.5 px-2 truncate max-w-[180px]" title="'+_escH(k.name)+'">'+_escH(k.name)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtEuro(k.ausgaben)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(k.impressionen)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(k.klicks)+'</td></tr>';
        }).join('');
        html += '<tr class="bg-blue-50 font-semibold"><td class="py-1.5 px-2" colspan="2">Gesamt</td><td class="py-1.5 px-2 text-right">'+adsFmtEuro(metaAusgaben)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(metaImpressions)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(metaKlicks)+'</td></tr>';
        metaTb.innerHTML = html;
    }

    // Google Kampagnen-Tabelle im Performance-Tab updaten
    var googleTb = document.getElementById('mktGoogleKampagnen');
    if (googleTb) {
        var googleKampMap = {};
        adsPerformanceData.filter(function(r){return r.plattform==='google';}).forEach(function(r) {
            var key = r.kampagne_id;
            if (!googleKampMap[key]) googleKampMap[key] = {name:r.kampagne_name, ausgaben:0, impressionen:0, klicks:0};
            googleKampMap[key].ausgaben+=Number(r.ausgaben||0); googleKampMap[key].impressionen+=Number(r.impressionen||0); googleKampMap[key].klicks+=Number(r.klicks||0);
        });
        var googleKamps = Object.values(googleKampMap).sort(function(a,b){return b.ausgaben-a.ausgaben;});
        if (googleKamps.length) {
            var ghtml = googleKamps.map(function(k,i) {
                return '<tr class="border-b"><td class="py-1.5 px-2">'+(i+1)+'.</td><td class="py-1.5 px-2 truncate max-w-[180px]" title="'+_escH(k.name)+'">'+_escH(k.name)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtEuro(k.ausgaben)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(k.impressionen)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(k.klicks)+'</td></tr>';
            }).join('');
            ghtml += '<tr class="bg-green-50 font-semibold"><td class="py-1.5 px-2" colspan="2">Gesamt</td><td class="py-1.5 px-2 text-right">'+adsFmtEuro(googleAusgaben)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(googleImpressions)+'</td><td class="py-1.5 px-2 text-right">'+adsFmtK(googleKlicks)+'</td></tr>';
            googleTb.innerHTML = ghtml;
        }
    }
}


// === HQ MARKETING ===
export function renderHqMarketing() {
    var active = hqStandorte.filter(function(s){return s.leads>0;});
    var totalLeads = hqStandorte.reduce(function(a,s){return a+s.leads;},0);
    var totalBudget = hqStandorte.reduce(function(a,s){return a+s.budget;},0);
    var avgCpt = active.length?Math.round(active.reduce(function(a,s){return a+s.cpt;},0)/active.length):0;
    var avgPerf = active.length?Math.round(active.reduce(function(a,s){return a+s.leadPerf;},0)/active.length):0;
    var stratDone = hqStandorte.filter(function(s){return s.strategieStatus==='done';}).length;

    var kpi = document.getElementById('hqMktKpis');
    if(kpi) kpi.innerHTML = '<div class="vit-card p-4"><p class="text-xs text-gray-400">Leads gesamt</p><p class="text-xl font-bold">'+totalLeads+'</p></div>'
        +'<div class="vit-card p-4"><p class="text-xs text-gray-400">Budget/Monat</p><p class="text-xl font-bold">'+fmt(totalBudget)+' €</p></div>'
        +'<div class="vit-card p-4"><p class="text-xs text-gray-400">Ø CPT</p><p class="text-xl font-bold">'+avgCpt+' €</p><p class="text-[10px] text-gray-400">Ziel: &lt;163 €</p></div>'
        +'<div class="vit-card p-4"><p class="text-xs text-gray-400">Ø Lead-Perf.</p><p class="text-xl font-bold '+perfColor(avgPerf)+'">'+avgPerf+'%</p></div>'
        +'<div class="vit-card p-4"><p class="text-xs text-gray-400">Strategie vereinbart</p><p class="text-xl font-bold">'+stratDone+' / '+hqStandorte.length+'</p></div>';

    // Lead Performance
    var lp = document.getElementById('hqMktLeads');
    if(lp) {
        var lph = '';
        hqStandorte.slice().sort(function(a,b){return b.leadPerf-a.leadPerf;}).forEach(function(s){
            var w = Math.min(100, s.leadPerf);
            lph += '<div class="flex items-center space-x-2"><span class="text-xs w-28 truncate">'+s.name+'</span><div class="flex-1 bg-gray-100 rounded-full h-3"><div class="h-3 rounded-full" style="width:'+w+'%;background:'+perfDot(s.leadPerf)+'"></div></div><span class="text-xs font-bold w-10 text-right">'+s.leadPerf+'%</span></div>';
        });
        lp.innerHTML = lph;
    }

    // Strategie Status
    var ms = document.getElementById('hqMktStrategie');
    if(ms) {
        var msh = '';
        hqStandorte.forEach(function(s){
            msh += '<div class="flex items-center justify-between py-1"><span class="text-xs">'+s.name+'</span>'+stratBadge(s.strategieStatus)+'</div>';
        });
        ms.innerHTML = msh;
    }

    // Alerts
    var ma = document.getElementById('hqMktAlerts');
    if(ma) {
        var mah = '';
        hqStandorte.filter(function(s){return s.leadPerf<50;}).sort(function(a,b){return a.leadPerf-b.leadPerf;}).forEach(function(s){
            mah += '<div class="p-3 bg-red-50 rounded-lg"><div class="flex justify-between"><span class="text-sm font-semibold text-red-700">'+s.name+' – '+s.leadPerf+'% Lead-Performance</span><span class="text-xs text-gray-400">CPT: '+s.cpt+' €</span></div><p class="text-xs text-red-500 mt-1">Budget: '+s.budget+' €/Monat · '+s.leads+' Leads · '+(s.strategieStatus==='missing'?'❌ Keine Strategie vereinbart':'Strategie: '+s.strategieStatus)+'</p></div>';
        });
        hqStandorte.filter(function(s){return s.strategieStatus==='missing';}).forEach(function(s){
            if(s.leadPerf>=50) mah += '<div class="p-3 bg-yellow-50 rounded-lg"><span class="text-sm font-semibold text-yellow-700">'+s.name+' – Marketing-Strategie fehlt</span></div>';
        });
        ma.innerHTML = mah || '<p class="text-sm text-green-600">✅ Alle Standorte im gruenen Bereich</p>';
    }
}

// === HQ MARKETING TABS ===
export function showHqMktTab(tabName) {
    document.querySelectorAll('.hqmkt-tab-content').forEach(function(t){t.style.display='none';});
    document.querySelectorAll('.hqmkt-tab-btn').forEach(function(b){b.className='hqmkt-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';});
    var el=document.getElementById('hqMktTab'+tabName.charAt(0).toUpperCase()+tabName.slice(1));
    if(el) el.style.display='block';
    var btn=document.querySelector('.hqmkt-tab-btn[data-hqmkt="'+tabName+'"]');
    if(btn) btn.className='hqmkt-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
    if(tabName==='budgetsteuerung') {} // placeholder - no render needed
    if(tabName==='leadreport') {} // placeholder
    if(tabName==='jahresgespraeche') {} // placeholder
    if(tabName==='handlungsbedarf') {} // placeholder
    if(tabName==='videoFreigabe' && window.vpRenderHqReview) vpRenderHqReview();
}

export function renderHqMktBudget() {
    var tb=document.getElementById('hqMktBudgetTable');
    if(!tb||tb.children.length>0) return;
    var data=[
        {name:'Berlin-Brandenburg',plz:'14513',st:'Aktiv',gBud:2800,gAusg:539,gHoch:-944,mBud:700,mAusg:56,mHoch:-97},
        {name:'Garching a.d. Alz',plz:'84518',st:'Aktiv',gBud:1152,gAusg:397,gHoch:-695,mBud:288,mAusg:57,mHoch:-99},
        {name:'Grafrath',plz:'82284',st:'Aktiv',gBud:1152,gAusg:302,gHoch:-529,mBud:280,mAusg:111,mHoch:-195},
        {name:'Gunzenhausen',plz:'91710',st:'Aktiv',gBud:1382,gAusg:0,gHoch:0,mBud:346,mAusg:0,mHoch:0},
        {name:'Hamburg',plz:'22761',st:'Aktiv',gBud:3072,gAusg:801,gHoch:-1500,mBud:768,mAusg:113,mHoch:-188},
        {name:'Hann Muenden',plz:'34346',st:'Aktiv',gBud:1152,gAusg:260,gHoch:-455,mBud:280,mAusg:0,mHoch:0},
        {name:'Holzkirchen',plz:'83607',st:'Aktiv',gBud:1536,gAusg:410,gHoch:-734,mBud:384,mAusg:111,mHoch:-194},
        {name:'Karlsdorf-Neuthard',plz:'76689',st:'Aktiv',gBud:1042,gAusg:567,gHoch:-993,mBud:261,mAusg:113,mHoch:-198},
        {name:'Limburg',plz:'65552',st:'Aktiv',gBud:1382,gAusg:419,gHoch:-734,mBud:346,mAusg:0,mHoch:0},
        {name:'Muenchen TK',plz:'81379',st:'Aktiv',gBud:1200,gAusg:273,gHoch:-479,mBud:300,mAusg:22,mHoch:-38},
        {name:'Muenster',plz:'48159',st:'Aktiv',gBud:1536,gAusg:331,gHoch:-579,mBud:384,mAusg:146,mHoch:-255},
        {name:'Pfaffenhofen a.d. Ilm',plz:'85276',st:'Aktiv',gBud:2074,gAusg:521,gHoch:-912,mBud:518,mAusg:110,mHoch:-192},
        {name:'Reutlingen',plz:'72793',st:'Aktiv',gBud:922,gAusg:209,gHoch:-366,mBud:230,mAusg:114,mHoch:-199},
        {name:'Rottweil',plz:'78628',st:'Aktiv',gBud:1152,gAusg:225,gHoch:-994,mBud:288,mAusg:182,mHoch:-318},
        {name:'Witten',plz:'58455',st:'Aktiv',gBud:2304,gAusg:513,gHoch:-887,mBud:576,mAusg:111,mHoch:-194}
    ];
    var h='';
    data.forEach(function(r,i){
        h+='<tr class="border-b'+(i%2?' bg-gray-50':'')+'"><td class="py-1.5 px-2 font-semibold">'+r.name+'<br><span class="text-gray-400">'+r.plz+'</span></td><td class="py-1.5 px-2 text-center"><span class="px-1.5 py-0.5 rounded-full text-[10px] bg-green-100 text-green-700">'+r.st+'</span></td><td class="py-1.5 px-2 text-right font-semibold text-yellow-600">'+fmt(r.gBud)+' €</td><td class="py-1.5 px-2 text-right">'+fmt(r.gAusg)+' €</td><td class="py-1.5 px-2 text-right text-red-500">'+fmt(r.gHoch)+'</td><td class="py-1.5 px-2 text-right font-semibold text-blue-600">'+fmt(r.mBud)+' €</td><td class="py-1.5 px-2 text-right">'+fmt(r.mAusg)+' €</td><td class="py-1.5 px-2 text-right text-red-500">'+fmt(r.mHoch)+'</td></tr>';
    });
    h+='<tr class="bg-gray-100 border-t-2 font-bold"><td class="py-2 px-2">Summe Februar</td><td></td><td class="py-2 px-2 text-right text-yellow-600">29.960 €</td><td class="py-2 px-2 text-right">8.133 €</td><td class="py-2 px-2 text-right text-red-500">-14.232 €</td><td class="py-2 px-2 text-right text-blue-600">7.490 €</td><td class="py-2 px-2 text-right">1.966 €</td><td class="py-2 px-2 text-right text-red-500">-3.441 €</td></tr>';
    tb.innerHTML=h;
}

export function renderHqMktLeadReport() {
    var el=document.getElementById('hqMktLeadRanking');
    if(!el||el.children.length>0) return;
    var sorted=hqStandorte.slice().sort(function(a,b){return b.leads-a.leads;});
    var h='';
    sorted.forEach(function(s,i){
        var perf=s.leadPerf; var pCol=perf>=80?'bg-green-500':perf>=50?'bg-yellow-500':'bg-red-500';
        h+='<div class="flex items-center space-x-3 py-2 border-b border-gray-50"><span class="text-xs font-bold text-gray-400 w-6">#'+(i+1)+'</span><span class="text-xs w-32 truncate font-semibold">'+s.name+'</span><div class="flex-1 bg-gray-100 rounded-full h-3"><div class="h-3 rounded-full '+pCol+'" style="width:'+Math.min(100,perf)+'%"></div></div><span class="text-xs font-bold w-10 text-right">'+s.leads+'</span><span class="text-xs w-16 text-right '+perfColor(perf)+'">'+perf+'%</span><span class="text-xs w-16 text-right text-gray-400">CPT '+s.cpt+'€</span></div>';
    });
    el.innerHTML=h;
}

export function renderHqMktJahresgespraeche() {
    var el=document.getElementById('hqMktJgTable');
    if(!el||el.children.length>0) return;
    var data=[
        {standort:'Grafrath',inhaber:'Sandra E.',ap:'Michael Stenzel',budget:1500,mix:'Meta+Google',crm:'✅',status:'done'},
        {standort:'Holzkirchen',inhaber:'Dirk Kolditz',ap:'Michael Stenzel',budget:2000,mix:'Meta+Google+Events',crm:'✅',status:'done'},
        {standort:'Hamburg',inhaber:'Thorsten B.',ap:'Michael Stenzel',budget:3072,mix:'Meta+Google',crm:'✅',status:'done'},
        {standort:'Muenster',inhaber:'Wolfgang P.',ap:'Michael Stenzel',budget:1536,mix:'Meta+Google',crm:'—',status:'done'},
        {standort:'Witten',inhaber:'Monique S.',ap:'Michael Stenzel',budget:2304,mix:'Meta+Google',crm:'✅',status:'done'},
        {standort:'Pfaffenhofen',inhaber:'Sabrina H.',ap:'Michael Stenzel',budget:2074,mix:'Meta+Google',crm:'✅',status:'done'},
        {standort:'Berlin-Brandenb.',inhaber:'Sven T.',ap:'Michael Stenzel',budget:2800,mix:'Meta+Google',crm:'—',status:'done'},
        {standort:'Kalkar',inhaber:'—',ap:'Michael Stenzel',budget:0,mix:'—',crm:'—',status:'missing'},
        {standort:'Wesel',inhaber:'—',ap:'Michael Stenzel',budget:0,mix:'—',crm:'—',status:'missing'},
        {standort:'Zell',inhaber:'—',ap:'Michael Stenzel',budget:0,mix:'—',crm:'—',status:'missing'}
    ];
    var h='';
    data.forEach(function(r,i){
        var sc={done:'bg-green-100 text-green-700',partial:'bg-yellow-100 text-yellow-700',missing:'bg-red-100 text-red-700'};
        var sl={done:'✅ Vereinbart',partial:'🔶 In Abstimmung',missing:'❌ Ausstehend'};
        h+='<tr class="border-b'+(i%2?' bg-gray-50':'')+'"><td class="py-1.5 px-2 font-semibold">'+r.standort+'</td><td class="py-1.5 px-2">'+r.inhaber+'</td><td class="py-1.5 px-2">'+r.ap+'</td><td class="py-1.5 px-2 text-right font-semibold">'+(r.budget?fmt(r.budget)+' €':'—')+'</td><td class="py-1.5 px-2">'+r.mix+'</td><td class="py-1.5 px-2 text-center">'+r.crm+'</td><td class="py-1.5 px-2 text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-semibold '+(sc[r.status]||sc.missing)+'">'+(sl[r.status]||'?')+'</span></td></tr>';
    });
    el.innerHTML=h;
}

export function renderHqMktHandlungsbedarf() {
    var el=document.getElementById('hqMktAlertsFull');
    if(!el||el.children.length>0) return;
    var alerts=[];
    hqStandorte.forEach(function(s){
        if(s.leadPerf<30) alerts.push({prio:'kritisch',icon:'🔴',title:s.name+' – Nur '+s.leadPerf+'% Lead-Performance',desc:'Budget: '+s.budget+' €/Mo · '+s.leads+' Leads · CPT: '+s.cpt+' € · Dringend Gespraech fuehren',color:'bg-red-50 border-red-200'});
        else if(s.leadPerf<50) alerts.push({prio:'warnung',icon:'🟡',title:s.name+' – '+s.leadPerf+'% Lead-Performance',desc:'Unter Ziel. Budget-Optimierung pruefen. CPT: '+s.cpt+' €',color:'bg-yellow-50 border-yellow-200'});
        if(s.strategieStatus==='missing') alerts.push({prio:'kritisch',icon:'📋',title:s.name+' – Keine Marketing-Strategie vereinbart',desc:'Jahresgespraech muss noch terminiert werden',color:'bg-red-50 border-red-200'});
    });
    alerts.push({prio:'info',icon:'💰',title:'3 Standorte über Budget im Februar',desc:'Grafrath (+224€), Rottweil (+318€), Lohmar (+342€) – Channel-Split prüfen',color:'bg-blue-50 border-blue-200'});
    alerts.push({prio:'info',icon:'🎬',title:'13 Standorte ohne Local Hero Video',desc:'Social-Media-Aktivierung pushen. Naechster Content-Drop: KW 9',color:'bg-blue-50 border-blue-200'});
    var h='';
    alerts.sort(function(a,b){var p={kritisch:0,warnung:1,info:2};return (p[a.prio]||9)-(p[b.prio]||9);});
    alerts.forEach(function(a){
        h+='<div class="p-4 rounded-lg border '+a.color+'"><div class="flex items-start space-x-3"><span class="text-lg">'+a.icon+'</span><div><p class="text-sm font-semibold text-gray-800">'+a.title+'</p><p class="text-xs text-gray-500 mt-1">'+a.desc+'</p></div></div></div>';
    });
    el.innerHTML=h||'<p class="text-sm text-green-600">✅ Keine offenen Punkte</p>';
    var krit=alerts.filter(function(a){return a.prio==='kritisch';}).length;
    var warn=alerts.filter(function(a){return a.prio==='warnung';}).length;
    var info=alerts.filter(function(a){return a.prio==='info';}).length;
    var ok=hqStandorte.length-krit-warn;
    var setVal=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
    setVal('hqMktAlertKrit',krit); setVal('hqMktAlertWarn',warn); setVal('hqMktAlertInfo',info); setVal('hqMktAlertOk',Math.max(0,ok));
}

export function renderMktSpendingChart() {
    var el=document.getElementById('mktSpendingChart');
    if(!el) return;
    el.innerHTML='<p class="text-sm text-gray-400 text-center py-8">Noch keine Ausgaben-Daten vorhanden.</p>';
}

export function renderMktLeadChart() {
    var el=document.getElementById('mktLeadChart');
    if(!el) return;
    el.innerHTML='<p class="text-sm text-gray-400 text-center py-8">Noch keine Lead-Daten vorhanden.</p>';
}
export function renderHqEinkauf() {
    var totalVO = hqStandorte.reduce(function(a,s){return a+s.vororderBikes;},0);
    var voDone = hqStandorte.filter(function(s){return s.vororderStatus==='done';}).length;
    var voOpen = hqStandorte.filter(function(s){return s.vororderStatus==='open';}).length;
    var avgRab = (hqStandorte.filter(function(s){return s.rabattQuote>0;}).reduce(function(a,s){return a+s.rabattQuote;},0)/hqStandorte.filter(function(s){return s.rabattQuote>0;}).length).toFixed(1);

    var kpi = document.getElementById('hqEkKpis');
    if(kpi) kpi.innerHTML = '<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Vororder Bikes gesamt</p><p class="text-2xl font-bold">'+totalVO+'</p></div>'
        +'<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Vororder abgeschlossen</p><p class="text-2xl font-bold text-green-600">'+voDone+' / '+hqStandorte.length+'</p></div>'
        +'<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Vororder offen</p><p class="text-2xl font-bold '+(voOpen>3?'text-red-600':'text-yellow-600')+'">'+voOpen+'</p></div>'
        +'<div class="vit-card p-5"><p class="text-xs text-gray-400 uppercase">Ø Rabattquote</p><p class="text-2xl font-bold '+(avgRab<=5?'text-green-600':'text-red-500')+'">'+avgRab+'%</p><p class="text-xs text-gray-500">Ziel: unter 5%</p></div>';

    // Vororder
    var vo = document.getElementById('hqEkVororder');
    if(vo) {
        var voh = '';
        hqStandorte.forEach(function(s){
            var vc = {done:'bg-green-100 text-green-700',partial:'bg-yellow-100 text-yellow-700',open:'bg-red-100 text-red-700'};
            var vl = {done:'✅ Abgeschlossen',partial:'🔶 Teilweise',open:'❌ Offen'};
            voh += '<div class="flex items-center justify-between py-1.5 border-b border-gray-50"><span class="text-xs w-28 truncate font-semibold">'+s.name+'</span><span class="text-xs">'+(s.vororderBikes||'—')+' Bikes</span><span class="text-[10px] px-2 py-0.5 rounded-full '+(vc[s.vororderStatus]||vc.open)+'">'+(vl[s.vororderStatus]||'?')+'</span></div>';
        });
        vo.innerHTML = voh;
    }

    // Rohertrag
    var rr = document.getElementById('hqEkRohertrag');
    if(rr) {
        var rrh = '';
        hqStandorte.filter(function(s){return s.rohertrag>0;}).sort(function(a,b){return b.rohertrag-a.rohertrag;}).forEach(function(s){
            rrh += '<div class="flex items-center space-x-2"><span class="text-xs w-28 truncate">'+s.name+'</span><div class="flex-1 bg-gray-100 rounded-full h-3"><div class="h-3 rounded-full '+(s.rohertrag>=38?'bg-green-500':s.rohertrag>=34?'bg-yellow-500':'bg-red-500')+'" style="width:'+Math.max(5,s.rohertrag*2)+'%"></div></div><span class="text-xs font-bold w-12 text-right">'+s.rohertrag+'%</span></div>';
        });
        rr.innerHTML = rrh;
    }

    // Alerts
    var al = document.getElementById('hqEkAlerts');
    if(al) {
        var alh = '';
        hqStandorte.filter(function(s){return s.vororderStatus==='open';}).forEach(function(s){
            alh += '<div class="p-3 bg-red-50 rounded-lg mb-2"><span class="text-sm font-semibold text-red-700">❌ '+s.name+' – Keine Vororder platziert</span><p class="text-xs text-red-500">Dringend Gespraech mit Inhaber fuehren</p></div>';
        });
        hqStandorte.filter(function(s){return s.rabattQuote>8;}).forEach(function(s){
            alh += '<div class="p-3 bg-yellow-50 rounded-lg mb-2"><span class="text-sm font-semibold text-yellow-700">⚠️ '+s.name+' – Rabattquote '+s.rabattQuote+'%</span><p class="text-xs text-yellow-600">Ziel unter 5%. Schulung Dreingaben vs. Rabatte empfohlen.</p></div>';
        });
        al.innerHTML = alh || '<p class="text-sm text-green-600">✅ Alle Standorte im gruenen Bereich</p>';
    }
}



// Strangler Fig
const _exports = {renderHqFinanzen,adsFmtEuro,adsFmtK,adsSetText,loadAdsData,renderAdsKpis,renderAdsChart,renderAdsKampagnenTabelle,filterAdsPlattform,renderAdsStandortVergleich,renderAdsSyncInfo,updateMktPerformanceFromAds,renderHqMarketing,showHqMktTab,renderHqMktBudget,renderHqMktLeadReport,renderHqMktJahresgespraeche,renderHqMktHandlungsbedarf,renderMktSpendingChart,renderMktLeadChart,renderHqEinkauf};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[hq-finanzen.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');

