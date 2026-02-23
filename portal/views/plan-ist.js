/**
 * views/plan-ist.js - Plan/Ist System & Lead Reporting Dashboard
 * @module views/plan-ist
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// === PLAN / IST SYSTEM ===
var currentPlan = null; // { jahr, monate: [{monat, umsatz, wareneinsatz, personal, raum, werbe, abschreibung, sonstige, zins, ...}] }
var planIstYear = new Date().getFullYear();

// Expose for inline onclick handlers
Object.defineProperty(window, 'currentPlan', {
    get: function() { return currentPlan; },
    set: function(v) { currentPlan = v; },
    configurable: true
});
Object.defineProperty(window, 'planIstYear', {
    get: function() { return planIstYear; },
    set: function(v) { planIstYear = v; },
    configurable: true
});

var forceUploadScreen = false;

// Expose for inline onclick
Object.defineProperty(window, 'forceUploadScreen', {
    get: function() { return forceUploadScreen; },
    set: function(v) { forceUploadScreen = v; },
    configurable: true
});

export async function renderPlanIst() {
    var el = document.getElementById('planIstContent');
    if(!el) return;

    // If user explicitly wants upload screen, show it directly
    if(forceUploadScreen) {
        forceUploadScreen = false;
        renderPlanUploadScreen(el);
        return;
    }

    // Try load plan from DB
    try {
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var resp = await _sb().from('jahresplaene').select('*').eq('jahr', planIstYear).eq('standort_id', stdId).single();
        if(!resp.error && resp.data) {
            currentPlan = resp.data;
        }
    } catch(e) { /* no plan yet */ }

    if(!currentPlan || !currentPlan.plan_daten) {
        renderPlanUploadScreen(el);
    } else {
        await renderPlanVergleich(el);
    }
}

export function renderPlanUploadScreen(el) {
    var h = '';
    h += '<div class="py-6">';
    h += '<div class="max-w-2xl mx-auto text-center mb-6">';
    h += '<div class="text-5xl mb-3">📋</div>';
    h += '<h2 class="text-xl font-bold text-gray-800 mb-2">Jahresplan '+planIstYear+'</h2>';
    h += '<p class="text-sm text-gray-500">Erstelle deinen Jahresplan für den Plan/Ist-Vergleich. Wähle eine der drei Optionen:</p>';
    h += '</div>';

    // 3 Options Grid
    h += '<div class="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">';

    // Option 1: Planungsassistent (primary)
    h += '<div class="vit-card p-5 text-center cursor-pointer hover:shadow-lg transition-shadow border-2 border-vit-orange" onclick="showPlanAssistent()">';
    h += '<div class="text-3xl mb-2">🧙‍♂️</div>';
    h += '<h3 class="font-bold text-gray-800 text-sm mb-1">Planungsassistent</h3>';
    h += '<p class="text-[11px] text-gray-500">Schritt für Schritt deinen Jahresplan erstellen. Umsatz, Kosten, Saisonalität – einfach & schnell.</p>';
    h += '<div class="mt-3 py-1.5 bg-vit-orange text-white rounded-lg text-xs font-semibold">Starten →</div>';
    h += '</div>';

    // Option 2: Excel-Vorlage
    h += '<div class="vit-card p-5 text-center cursor-pointer hover:shadow-lg transition-shadow" onclick="downloadPlanVorlage()">';
    h += '<div class="text-3xl mb-2">📥</div>';
    h += '<h3 class="font-bold text-gray-800 text-sm mb-1">Excel-Vorlage</h3>';
    h += '<p class="text-[11px] text-gray-500">Standardisierte Vorlage herunterladen, ausfüllen, und hier wieder hochladen.</p>';
    h += '<div class="mt-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">Vorlage laden</div>';
    h += '</div>';

    // Option 3: Eigene Datei hochladen
    h += '<div class="vit-card p-5 text-center cursor-pointer hover:shadow-lg transition-shadow" onclick="showPlanUploadForm()">';
    h += '<div class="text-3xl mb-2">📄</div>';
    h += '<h3 class="font-bold text-gray-800 text-sm mb-1">Datei hochladen</h3>';
    h += '<p class="text-[11px] text-gray-500">Eigenen Jahresplan als Excel oder PDF hochladen. KI versucht die Werte zu erkennen.</p>';
    h += '<div class="mt-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">Hochladen</div>';
    h += '</div>';

    h += '</div>';

    // Content area (filled by sub-functions)
    h += '<div id="planWizardContent" class="max-w-2xl mx-auto"></div>';
    h += '</div>';
    el.innerHTML = h;
}

// -- Planungsassistent --
var planAssistentData = {};
Object.defineProperty(window, 'planAssistentData', { get: function() { return planAssistentData; }, set: function(v) { planAssistentData = v; }, configurable: true });
var DEFAULT_SAISON = [5.5, 6.5, 9.5, 10.5, 11.5, 12.0, 11.0, 10.5, 8.5, 6.5, 4.5, 3.5];

export async function showPlanAssistent() {
    var stdId = _sbProfile() ? _sbProfile().standort_id : null;
    var vorjahr = planIstYear - 1;
    var vorjahrData = null, netzwerkSaison = null;
    try {
        var bwaResp = await _sb().from('bwa_daten').select('monat,umsatzerloese,wareneinsatz,rohertrag,personalkosten,raumkosten,ergebnis').eq('standort_id', stdId).eq('jahr', vorjahr).order('monat');
        if(bwaResp.data && bwaResp.data.length >= 3) {
            vorjahrData = { monate: {} };
            var tU = 0, tWe = 0, tPk = 0, tRk = 0;
            bwaResp.data.forEach(function(b) {
                var u = parseFloat(b.umsatzerloese)||0;
                vorjahrData.monate[b.monat] = { umsatz: u, wareneinsatz: parseFloat(b.wareneinsatz)||0, personalkosten: parseFloat(b.personalkosten)||0, raumkosten: parseFloat(b.raumkosten)||0 };
                tU += u; tWe += Math.abs(parseFloat(b.wareneinsatz)||0); tPk += Math.abs(parseFloat(b.personalkosten)||0); tRk += Math.abs(parseFloat(b.raumkosten)||0);
            });
            vorjahrData.totalUmsatz = tU;
            vorjahrData.wePct = tU ? Math.round(tWe/tU*100) : 65;
            vorjahrData.pkMonat = Math.round(tPk / bwaResp.data.length);
            vorjahrData.rkMonat = Math.round(tRk / bwaResp.data.length);
            if(tU > 0) { vorjahrData.saison = []; for(var s=1;s<=12;s++) vorjahrData.saison.push(Math.round(((vorjahrData.monate[s]||{}).umsatz||0)/tU*1000)/10); }
        }
        var nR = await _sb().from('bwa_daten').select('monat,umsatzerloese').eq('jahr', vorjahr);
        if(nR.data && nR.data.length > 20) {
            var nM={}, nT=0; nR.data.forEach(function(b){ var u=parseFloat(b.umsatzerloese)||0; if(u>0){nM[b.monat]=(nM[b.monat]||0)+u;nT+=u;}});
            if(nT>0){ netzwerkSaison=[]; for(var n=1;n<=12;n++) netzwerkSaison.push(Math.round((nM[n]||0)/nT*1000)/10); }
        }
    } catch(e) { console.warn('[PlanAssistent]', e.message); }
    planAssistentData = {
        step:1, vorjahr:vorjahrData, vorjahrJahr:vorjahr, netzwerkSaison:netzwerkSaison||DEFAULT_SAISON,
        vorjahrUmsatz: vorjahrData?vorjahrData.totalUmsatz:0, wachstumPct:10,
        saison: (vorjahrData&&vorjahrData.saison?vorjahrData.saison:(netzwerkSaison||DEFAULT_SAISON)).slice(),
        saisonSource: vorjahrData&&vorjahrData.saison?'vorjahr':'netzwerk',
        wePct: vorjahrData?vorjahrData.wePct:65, pkMonat: vorjahrData?vorjahrData.pkMonat:0, rkMonat: vorjahrData?vorjahrData.rkMonat:0, monate:{}
    };
    renderPlanStep();
}

function renderPlanStep() {
    var el = document.getElementById('planWizardContent'); if(!el) return;
    var d = planAssistentData, h = '';
    if(d.step === 1) {
        h += '<div class="vit-card p-6">';
        h += '<div class="flex items-center justify-between mb-4"><span class="text-xs text-gray-400">Schritt 1/3</span><div class="flex-1 mx-3 h-1.5 bg-gray-100 rounded-full"><div class="h-1.5 bg-vit-orange rounded-full" style="width:33%"></div></div></div>';
        h += '<h3 class="font-bold text-gray-800 mb-1">Vorjahr & Wachstumsziel</h3>';
        if(d.vorjahr) {
            h += '<div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4"><p class="text-xs font-semibold text-green-700">BWA-Daten '+d.vorjahrJahr+' geladen</p>';
            h += '<p class="text-[11px] text-green-600 mt-1">Umsatz: <strong>'+Math.round(d.vorjahr.totalUmsatz).toLocaleString('de-DE')+' Euro</strong> | WE: '+d.vorjahr.wePct+'% | Personal: '+d.vorjahr.pkMonat.toLocaleString('de-DE')+' Euro/Monat | Miete: '+d.vorjahr.rkMonat.toLocaleString('de-DE')+' Euro/Monat</p></div>';
        } else {
            h += '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4"><p class="text-xs font-semibold text-yellow-700">Keine BWA-Daten fuer '+d.vorjahrJahr+'</p><p class="text-[11px] text-yellow-600">Vorjahr-Umsatz bitte manuell eingeben.</p></div>';
        }
        h += '<div class="space-y-4"><div><label class="text-xs font-semibold text-gray-600">Gesamtumsatz '+d.vorjahrJahr+'</label>';
        h += '<input id="paVorjahrUmsatz" type="number" value="'+(d.vorjahrUmsatz||'')+'" class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-lg text-right font-bold focus:border-vit-orange outline-none" placeholder="z.B. 1200000"></div>';
        h += '<div><label class="text-xs font-semibold text-gray-600">Wachstumsziel '+planIstYear+' (%)</label>';
        h += '<div class="flex items-center space-x-3"><input id="paWachstum" type="range" min="-20" max="50" value="'+(d.wachstumPct||10)+'" class="flex-1" style="accent-color:#f58220" oninput="document.getElementById(\'paWachstumNum\').value=this.value">';
        h += '<input id="paWachstumNum" type="number" value="'+(d.wachstumPct||10)+'" class="w-20 px-2 py-2 border border-gray-200 rounded-lg text-sm text-right" oninput="document.getElementById(\'paWachstum\').value=this.value"></div></div></div>';
        h += '<div class="flex justify-end mt-5"><button onclick="planAssistentNext()" class="px-6 py-2.5 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">Weiter</button></div></div>';
    }
    else if(d.step === 2) {
        var zU = d.vorjahrUmsatz*(1+d.wachstumPct/100);
        h += '<div class="vit-card p-6">';
        h += '<div class="flex items-center justify-between mb-4"><span class="text-xs text-gray-400">Schritt 2/3</span><div class="flex-1 mx-3 h-1.5 bg-gray-100 rounded-full"><div class="h-1.5 bg-vit-orange rounded-full" style="width:66%"></div></div></div>';
        h += '<h3 class="font-bold text-gray-800 mb-1">Verteilung & Kosten</h3>';
        h += '<p class="text-xs text-gray-500 mb-3">Ziel '+planIstYear+': <strong>'+Math.round(zU).toLocaleString('de-DE')+' Euro</strong> ('+(d.wachstumPct>=0?'+':'')+d.wachstumPct+'%)</p>';
        h += '<label class="text-xs font-semibold text-gray-600 mb-1 block">Saisonschluessel</label><div class="flex space-x-2 mb-3">';
        if(d.vorjahr&&d.vorjahr.saison) h += '<button onclick="planAssistentData.saisonSource=\'vorjahr\';planAssistentData.saison=planAssistentData.vorjahr.saison.slice();renderPlanStep()" class="px-3 py-1.5 text-xs rounded-lg font-medium '+(d.saisonSource==='vorjahr'?'bg-vit-orange text-white':'bg-gray-100 text-gray-600')+'">Eigenes Vorjahr</button>';
        h += '<button onclick="planAssistentData.saisonSource=\'netzwerk\';planAssistentData.saison=planAssistentData.netzwerkSaison.slice();renderPlanStep()" class="px-3 py-1.5 text-xs rounded-lg font-medium '+(d.saisonSource==='netzwerk'?'bg-vit-orange text-white':'bg-gray-100 text-gray-600')+'">Netzwerk</button>';
        h += '<button onclick="planAssistentData.saisonSource=\'custom\';renderPlanStep()" class="px-3 py-1.5 text-xs rounded-lg font-medium '+(d.saisonSource==='custom'?'bg-vit-orange text-white':'bg-gray-100 text-gray-600')+'">Individuell</button></div>';
        var mL=['Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
        var sS=d.saison.reduce(function(a,b){return a+b;},0)||100;
        h += '<div class="grid grid-cols-12 gap-1 mb-4">';
        for(var i=0;i<12;i++){var p=d.saison[i],mv=Math.round(zU*p/sS),bH=Math.max(6,Math.round(p*4));
            h+='<div class="text-center"><div class="text-[8px] text-gray-400">'+mL[i]+'</div><div class="bg-vit-orange/30 rounded mx-auto" style="width:14px;height:'+bH+'px"></div>';
            if(d.saisonSource==='custom')h+='<input id="paSaison_'+i+'" type="number" value="'+p+'" class="w-full text-[9px] text-center border border-gray-200 rounded mt-1 p-0.5" step="0.5">';
            else h+='<div class="text-[9px] font-medium mt-0.5">'+p+'%</div>';
            h+='<div class="text-[8px] text-gray-400">'+(mv/1000).toFixed(0)+'k</div></div>';}
        h += '</div>';
        h += '<div class="border-t pt-3"><label class="text-xs font-semibold text-gray-600 mb-2 block">Kostenstruktur'+(d.vorjahr?' <span class="font-normal text-gray-400">(aus VJ)</span>':'')+'</label>';
        h += '<div class="grid grid-cols-3 gap-3">';
        h += '<div><label class="text-[10px] text-gray-500">Wareneinsatz %</label><input id="paWePct" type="number" value="'+(d.wePct||65)+'" class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-right"></div>';
        h += '<div><label class="text-[10px] text-gray-500">Personal mtl.</label><input id="paPkMonat" type="number" value="'+(d.pkMonat||'')+'" class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-right"></div>';
        h += '<div><label class="text-[10px] text-gray-500">Miete mtl.</label><input id="paRkMonat" type="number" value="'+(d.rkMonat||'')+'" class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-right"></div>';
        h += '</div></div>';
        h += '<div class="flex justify-between mt-5"><button onclick="planAssistentData.step=1;renderPlanStep()" class="px-4 py-2 text-sm text-gray-600">Zurueck</button><button onclick="planAssistentNext()" class="px-6 py-2.5 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">Vorschau</button></div></div>';
    }
    else if(d.step === 3) {
        h += '<div class="vit-card p-6">';
        h += '<div class="flex items-center justify-between mb-4"><span class="text-xs text-gray-400">Schritt 3/3</span><div class="flex-1 mx-3 h-1.5 bg-gray-100 rounded-full"><div class="h-1.5 bg-vit-orange rounded-full" style="width:100%"></div></div></div>';
        h += '<h3 class="font-bold text-gray-800 mb-1">Jahresplan '+planIstYear+'</h3>';
        var mN=['','Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
        var tU=0,tWe=0,tPk=0,tRk=0,tRoh=0,tErg=0;
        var hasVJ=d.vorjahr&&Object.keys(d.vorjahr.monate).length>0;
        h+='<div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="text-gray-500 border-b"><th class="py-1 text-left">Monat</th><th class="py-1 text-right">Umsatz</th>';
        if(hasVJ) h+='<th class="py-1 text-right text-gray-400">VJ</th>';
        h+='<th class="py-1 text-right">WE</th><th class="py-1 text-right">Rohertrag</th><th class="py-1 text-right">Personal</th><th class="py-1 text-right">Miete</th><th class="py-1 text-right font-bold">Ergebnis</th></tr></thead><tbody>';
        for(var m=1;m<=12;m++){var pm=d.monate[m]||{},ro=(pm.umsatz||0)+(pm.wareneinsatz||0),er=ro+(pm.personalkosten||0)+(pm.raumkosten||0);
            tU+=(pm.umsatz||0);tWe+=Math.abs(pm.wareneinsatz||0);tPk+=Math.abs(pm.personalkosten||0);tRk+=Math.abs(pm.raumkosten||0);tRoh+=ro;tErg+=er;
            h+='<tr class="border-b border-gray-50"><td class="py-1.5 font-medium">'+mN[m]+'</td><td class="py-1.5 text-right font-semibold">'+Math.round(pm.umsatz||0).toLocaleString('de-DE')+'</td>';
            if(hasVJ){var vU=(d.vorjahr.monate[m]||{}).umsatz||0;h+='<td class="py-1.5 text-right text-gray-400 text-[10px]">'+Math.round(vU).toLocaleString('de-DE')+'</td>';}
            h+='<td class="py-1.5 text-right text-red-400">'+Math.abs(pm.wareneinsatz||0).toLocaleString('de-DE')+'</td>';
            h+='<td class="py-1.5 text-right">'+Math.round(ro).toLocaleString('de-DE')+'</td>';
            h+='<td class="py-1.5 text-right">'+Math.abs(pm.personalkosten||0).toLocaleString('de-DE')+'</td>';
            h+='<td class="py-1.5 text-right">'+Math.abs(pm.raumkosten||0).toLocaleString('de-DE')+'</td>';
            h+='<td class="py-1.5 text-right font-bold '+(er>=0?'text-green-600':'text-red-500')+'">'+Math.round(er).toLocaleString('de-DE')+'</td></tr>';}
        h+='<tr class="font-bold border-t-2"><td class="py-2">GESAMT</td><td class="py-2 text-right">'+tU.toLocaleString('de-DE')+'</td>';
        if(hasVJ)h+='<td class="py-2 text-right text-gray-400 text-[10px]">'+Math.round(d.vorjahr.totalUmsatz).toLocaleString('de-DE')+'</td>';
        h+='<td class="py-2 text-right text-red-400">'+tWe.toLocaleString('de-DE')+'</td><td class="py-2 text-right">'+tRoh.toLocaleString('de-DE')+'</td><td class="py-2 text-right">'+tPk.toLocaleString('de-DE')+'</td><td class="py-2 text-right">'+tRk.toLocaleString('de-DE')+'</td><td class="py-2 text-right '+(tErg>=0?'text-green-600':'text-red-500')+'">'+Math.round(tErg).toLocaleString('de-DE')+'</td></tr></tbody></table></div>';
        var rP=tU?Math.round(tRoh/tU*100):0,pP=tU?Math.round(tPk/tU*100):0,wP=d.vorjahrUmsatz?Math.round((tU/d.vorjahrUmsatz-1)*100):0;
        h+='<div class="grid grid-cols-4 gap-2 mt-4">';
        h+='<div class="bg-orange-50 rounded-lg p-2.5 text-center"><p class="text-[10px] text-orange-500">Wachstum</p><p class="text-lg font-bold text-vit-orange">'+(wP>=0?'+':'')+wP+'%</p></div>';
        h+='<div class="bg-blue-50 rounded-lg p-2.5 text-center"><p class="text-[10px] text-blue-500">Rohertrag</p><p class="text-lg font-bold text-blue-700">'+rP+'%</p></div>';
        h+='<div class="bg-purple-50 rounded-lg p-2.5 text-center"><p class="text-[10px] text-purple-500">Personal</p><p class="text-lg font-bold text-purple-700">'+pP+'%</p></div>';
        h+='<div class="'+(tErg>=0?'bg-green-50':'bg-red-50')+' rounded-lg p-2.5 text-center"><p class="text-[10px] '+(tErg>=0?'text-green-500':'text-red-500')+'">Ergebnis</p><p class="text-lg font-bold '+(tErg>=0?'text-green-700':'text-red-600')+'">'+Math.round(tErg).toLocaleString('de-DE')+' Euro</p></div>';
        h+='</div>';
        h+='<div class="flex justify-between mt-5"><button onclick="planAssistentData.step=2;renderPlanStep()" class="px-4 py-2 text-sm text-gray-600">Zurueck</button><button onclick="savePlanAssistent()" class="px-8 py-3 bg-green-600 text-white rounded-lg text-sm font-bold hover:opacity-90">Plan fuer '+planIstYear+' speichern</button></div></div>';
    }
    el.innerHTML = h;
}
window.renderPlanStep = renderPlanStep;

export function planAssistentNext() {
    var d = planAssistentData;
    if(d.step === 1) {
        d.vorjahrUmsatz = parseFloat((document.getElementById('paVorjahrUmsatz')||{}).value)||0;
        d.wachstumPct = parseFloat((document.getElementById('paWachstumNum')||{}).value)||0;
        if(d.vorjahrUmsatz < 1000) { alert('Bitte einen Vorjahr-Umsatz eingeben.'); return; }
        d.step = 2;
    } else if(d.step === 2) {
        if(d.saisonSource==='custom'){for(var c=0;c<12;c++) d.saison[c]=parseFloat((document.getElementById('paSaison_'+c)||{}).value)||0;}
        d.wePct = parseFloat((document.getElementById('paWePct')||{}).value)||65;
        d.pkMonat = parseFloat((document.getElementById('paPkMonat')||{}).value)||0;
        d.rkMonat = parseFloat((document.getElementById('paRkMonat')||{}).value)||0;
        var zU=d.vorjahrUmsatz*(1+d.wachstumPct/100), sS=d.saison.reduce(function(a,b){return a+b;},0)||100;
        for(var k=1;k<=12;k++){var mu=Math.round(zU*d.saison[k-1]/sS);d.monate[k]={umsatz:mu,wareneinsatz:-Math.round(mu*d.wePct/100),personalkosten:-d.pkMonat,raumkosten:-d.rkMonat};}
        d.step = 3;
    }
    renderPlanStep();
}

export async function savePlanAssistent() {
    var pm = {};
    for(var s=1;s<=12;s++){var m=planAssistentData.monate[s]||{};pm[s]={monat:s,umsatz:m.umsatz||0,wareneinsatz:m.wareneinsatz||0,personalkosten:m.personalkosten||0,raumkosten:m.raumkosten||0,rohertrag:(m.umsatz||0)+(m.wareneinsatz||0),ergebnis:(m.umsatz||0)+(m.wareneinsatz||0)+(m.personalkosten||0)+(m.raumkosten||0)};}
    window._parsedPlanMonths = pm;
    await saveParsedPlan();
}

// ── Excel-Vorlage Download ──
export function downloadPlanVorlage() {
    var mNamen = ['Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    var rows = [
        ['vit:bikes Jahresplan ' + planIstYear],
        [],
        ['Position', 'Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez','GESAMT'],
        ['Umsatzerlöse', 0,0,0,0,0,0,0,0,0,0,0,0, {t:'n',f:'SUM(B4:M4)'}],
        ['Wareneinsatz', 0,0,0,0,0,0,0,0,0,0,0,0, {t:'n',f:'SUM(B5:M5)'}],
        ['Rohertrag', {t:'n',f:'B4+B5'},{t:'n',f:'C4+C5'},{t:'n',f:'D4+D5'},{t:'n',f:'E4+E5'},{t:'n',f:'F4+F5'},{t:'n',f:'G4+G5'},{t:'n',f:'H4+H5'},{t:'n',f:'I4+I5'},{t:'n',f:'J4+J5'},{t:'n',f:'K4+K5'},{t:'n',f:'L4+L5'},{t:'n',f:'M4+M5'},{t:'n',f:'SUM(B6:M6)'}],
        ['Personalkosten', 0,0,0,0,0,0,0,0,0,0,0,0, {t:'n',f:'SUM(B7:M7)'}],
        ['Raumkosten', 0,0,0,0,0,0,0,0,0,0,0,0, {t:'n',f:'SUM(B8:M8)'}],
        ['Sonstige Kosten', 0,0,0,0,0,0,0,0,0,0,0,0, {t:'n',f:'SUM(B9:M9)'}],
        ['Ergebnis', {t:'n',f:'B6+B7+B8+B9'},{t:'n',f:'C6+C7+C8+C9'},{t:'n',f:'D6+D7+D8+D9'},{t:'n',f:'E6+E7+E8+E9'},{t:'n',f:'F6+F7+F8+F9'},{t:'n',f:'G6+G7+G8+G9'},{t:'n',f:'H6+H7+H8+H9'},{t:'n',f:'I6+I7+I8+I9'},{t:'n',f:'J6+J7+J8+J9'},{t:'n',f:'K6+K7+K8+K9'},{t:'n',f:'L6+L7+L8+L9'},{t:'n',f:'M6+M7+M8+M9'},{t:'n',f:'SUM(B10:M10)'}]
    ];
    var ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:18},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:14}];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jahresplan');
    XLSX.writeFile(wb, 'vit-bikes_Jahresplan_'+planIstYear+'.xlsx');
}

// ── Upload Form (existing functionality) ──
export function showPlanUploadForm() {
    var el = document.getElementById('planWizardContent');
    if(!el) return;
    var h = '<div class="vit-card p-6">';
    h += '<h3 class="font-bold text-gray-800 mb-1">📄 Plan-Datei hochladen</h3>';
    h += '<p class="text-xs text-gray-500 mb-4">Excel oder PDF mit Monatszeilen und Spalten für Umsatz, Wareneinsatz, etc.</p>';
    h += '<div class="p-4 border-2 border-dashed border-vit-orange/40 rounded-lg bg-orange-50/50 mb-4">';
    h += '<input type="file" id="planFileInput" accept=".xlsx,.xls,.csv,.pdf" class="text-xs" onchange="document.getElementById(\'planParseBtn\').disabled=!this.files.length">';
    h += '</div>';
    h += '<button id="planParseBtn" onclick="parsePlanFile()" disabled class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed mb-3">📊 Plan auslesen & speichern</button>';
    h += '<div id="planParseStatus" class="hidden"></div>';
    h += '<div id="planParseResult" class="hidden"></div>';
    h += '<p class="text-[10px] text-gray-400 mt-3 text-center">Datei nicht erkannt? Nutze stattdessen den <a href="#" onclick="showPlanAssistent();return false" class="text-vit-orange underline">Planungsassistenten</a> oder die <a href="#" onclick="downloadPlanVorlage();return false" class="text-vit-orange underline">Excel-Vorlage</a>.</p>';
    h += '</div>';
    el.innerHTML = h;
}

export async function parsePlanFile() {
    var fileInput = document.getElementById('planFileInput');
    if(!fileInput || !fileInput.files[0]) return;
    var file = fileInput.files[0];
    var statusEl = document.getElementById('planParseStatus');
    var resultEl = document.getElementById('planParseResult');
    if(statusEl) statusEl.classList.remove('hidden');

    var isPdf = file.name.match(/\.pdf$/i);

    if(statusEl) statusEl.innerHTML = '<div class="flex items-center space-x-2 mt-2"><div class="w-4 h-4 border-2 border-vit-orange border-t-transparent rounded-full animate-spin"></div><span class="text-xs text-gray-600">📊 Plan wird analysiert...</span></div>';

    try {
        if(isPdf) {
            // PDF → nur KI
            if(statusEl) statusEl.innerHTML = '<div class="flex items-center space-x-2 mt-2"><div class="w-4 h-4 border-2 border-vit-orange border-t-transparent rounded-full animate-spin"></div><span class="text-xs text-gray-600">🤖 PDF wird mit KI analysiert...</span></div>';
            var base64 = await new Promise(function(resolve, reject) {
                var reader = new FileReader();
                reader.onload = function(e) { resolve(e.target.result.split(',')[1]); };
                reader.onerror = function() { reject(new Error('Datei konnte nicht gelesen werden')); };
                reader.readAsDataURL(file);
            });
            var kiResult = await callFinanceKi('jahresplan', base64, 'application/pdf', null, {jahr: planIstYear});
            applyPlanKiResult(kiResult, statusEl, resultEl);
            return;
        }

        // Excel → lokaler Parser first
        var localOk = false;
        try {
            await parsePlanFileLocal(file, statusEl, resultEl);
            localOk = true;
        } catch(localErr) {
            console.warn('[Plan] Lokaler Parser:', localErr.message, '→ KI-Fallback');
        }

        if(!localOk) {
            if(statusEl) statusEl.innerHTML = '<div class="flex items-center space-x-2 mt-2"><div class="w-4 h-4 border-2 border-vit-orange border-t-transparent rounded-full animate-spin"></div><span class="text-xs text-gray-600">🤖 KI-Analyse...</span></div>';
            var arrayBuf = await file.arrayBuffer();
            var wb = XLSX.read(arrayBuf, { type: 'array' });
            var rawText = cleanCsvForKi(wb);
            var kiResult2 = await callFinanceKi('jahresplan', null, null, rawText.substring(0, 15000), {jahr: planIstYear});
            applyPlanKiResult(kiResult2, statusEl, resultEl);
        }
    } catch(err) {
        if(statusEl) statusEl.innerHTML = '<p class="text-xs text-red-600 mt-2">❌ Analyse fehlgeschlagen: ' + _escH(err.message||'Unbekannt') + '</p>';
    }
}

// Local parser fallback (when KI is unavailable)
async function parsePlanFileLocal(file, statusEl, resultEl) {
    if (typeof BwaParser === 'undefined' && typeof window.BwaParser !== 'undefined') { var BwaParser = window.BwaParser; }
    return new Promise(function(resolve, reject) {
        BwaParser.parseFile(file, async function(err, result) {
            if(err) { reject(err); return; }
            var planMonths = {};
            var meta = result.meta;

            if(result.plan_bwa && result.plan_bwa.length > 0) {
                console.log('[Plan-Local] plan_bwa rows:', result.plan_bwa.length);
                console.log('[Plan-Local] First 3 rows raw:', JSON.stringify(result.plan_bwa.slice(0,3)));
                var mn = ['jan','feb','mrz','apr','mai','jun','jul','aug','sep','okt','nov','dez'];
                
                // Find summary rows by konto number first, then by kontengruppe/bezeichnung with highest values
                function findSummaryRow(kontoNrs, patterns) {
                    // 1. Try exact konto number match (summary rows like 1020, 1060, 1080)
                    for(var k=0; k<kontoNrs.length; k++) {
                        var found = result.plan_bwa.find(function(r) { return r.konto === kontoNrs[k]; });
                        if(found && (found.jan || found.feb || found.mrz)) return found;
                    }
                    // 2. Find rows without konto number (=Summenzeilen) matching kontengruppe
                    for(var p=0; p<patterns.length; p++) {
                        var pat = patterns[p].toLowerCase();
                        var found2 = result.plan_bwa.find(function(r) {
                            return !r.konto && ((r.kontengruppe||'').toLowerCase().includes(pat) || (r.bezeichnung||'').toLowerCase().includes(pat));
                        });
                        if(found2 && (found2.jan || found2.feb || found2.mrz)) return found2;
                    }
                    // 3. Fallback: any matching row with highest summe
                    var candidates = [];
                    for(var p2=0; p2<patterns.length; p2++) {
                        var pat2 = patterns[p2].toLowerCase();
                        result.plan_bwa.forEach(function(r) {
                            if((r.kontengruppe||'').toLowerCase().includes(pat2) || (r.bezeichnung||'').toLowerCase().includes(pat2)) {
                                candidates.push(r);
                            }
                        });
                    }
                    if(candidates.length > 0) {
                        candidates.sort(function(a,b) { return Math.abs(b.summe||0) - Math.abs(a.summe||0); });
                        return candidates[0];
                    }
                    return null;
                }
                var umsatzRow = findSummaryRow(['1020'], ['umsatzerlöse','umsatzerloese','gesamtleistung']);
                var weRow = findSummaryRow(['1060'], ['material-/wareneinkauf','wareneinsatz','materialaufwand']);
                var pkRow = findSummaryRow(['1100'], ['personalkosten']);
                var rkRow = findSummaryRow(['1120','1140'], ['raumkosten','miete']);
                var ergRow = findSummaryRow(['1290','1300'], ['betriebsergebnis','vorsteuer-ergebnis','ergebnis']);
                var werbeRow = findSummaryRow(['1200'], ['werbe','reisekosten']);
                var abschrRow = findSummaryRow(['1240'], ['abschreibung']);
                var sonstRow = findSummaryRow(['1260'], ['sonstige kosten','sonstige']);
                var gesamtkRow = findSummaryRow(['1270'], ['gesamtkosten']);
                
                console.log('[Plan-Local] Found rows:', {
                    umsatz: umsatzRow ? (umsatzRow.bezeichnung + ' konto=' + umsatzRow.konto + ' jan=' + umsatzRow.jan) : 'NOT FOUND',
                    wareneinsatz: weRow ? (weRow.bezeichnung + ' konto=' + weRow.konto + ' jan=' + weRow.jan) : 'NOT FOUND',
                    personal: pkRow ? (pkRow.bezeichnung + ' konto=' + pkRow.konto + ' jan=' + pkRow.jan) : 'NOT FOUND',
                    raum: rkRow ? (rkRow.bezeichnung + ' konto=' + rkRow.konto + ' jan=' + rkRow.jan) : 'NOT FOUND',
                    ergebnis: ergRow ? (ergRow.bezeichnung + ' konto=' + ergRow.konto + ' jan=' + ergRow.jan) : 'NOT FOUND'
                });
                console.log('[Plan-Local] Available kontengruppen:', result.plan_bwa.slice(0,10).map(function(r) { return r.kontengruppe + '|' + r.bezeichnung + '|konto=' + r.konto + '|jan=' + r.jan; }));
                
                for(var m=0; m<12; m++) {
                    var mKey = mn[m];
                    planMonths[m+1] = {
                        monat: m+1,
                        umsatz: umsatzRow ? Math.round(umsatzRow[mKey]||0) : 0,
                        wareneinsatz: weRow ? Math.round(weRow[mKey]||0) : 0,
                        personalkosten: pkRow ? Math.round(pkRow[mKey]||0) : 0,
                        raumkosten: rkRow ? Math.round(rkRow[mKey]||0) : 0,
                        werbekosten: werbeRow ? Math.round(werbeRow[mKey]||0) : 0,
                        abschreibungen: abschrRow ? Math.round(abschrRow[mKey]||0) : 0,
                        sonstige: sonstRow ? Math.round(sonstRow[mKey]||0) : 0,
                        gesamtkosten: gesamtkRow ? Math.round(gesamtkRow[mKey]||0) : 0
                    };
                    var pm = planMonths[m+1];
                    pm.rohertrag = pm.umsatz + pm.wareneinsatz;
                    pm.ergebnis = ergRow ? Math.round(ergRow[mKey]||0) : (pm.rohertrag + pm.personalkosten + pm.raumkosten);
                }
                
                var hasData = Object.values(planMonths).some(function(pm) { return pm.umsatz !== 0 || pm.wareneinsatz !== 0; });
                if(!hasData) { reject(new Error('Konten nicht zuordenbar')); return; }
                if(statusEl) statusEl.innerHTML = '<p class="text-xs text-green-600 mt-2">✅ Planung erkannt (lokaler Parser, '+result.plan_bwa.length+' Konten)</p>';
            } else {
                // Simple row-based parsing
                try {
                    var arrayBuf = await file.arrayBuffer();
                    var wb = XLSX.read(arrayBuf, { type: 'array' });
                    var sheet = wb.Sheets[wb.SheetNames[0]];
                    var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                    var mNamen = {januar:1,jan:1,february:2,februar:2,feb:2,maerz:3,märz:3,mar:3,april:4,apr:4,mai:5,may:5,juni:6,jun:6,juli:7,jul:7,august:8,aug:8,september:9,sep:9,oktober:10,okt:10,oct:10,november:11,nov:11,dezember:12,dez:12,dec:12};
                    rows.forEach(function(row) {
                        if(!row || row.length < 2) return;
                        var label = String(row[0]||'').trim().toLowerCase().replace(/[^a-zäöü]/g,'');
                        var monat = mNamen[label];
                        if(!monat) return;
                        var nums = [];
                        for(var c=1; c<row.length; c++) {
                            var v = typeof row[c]==='number' ? row[c] : parseFloat(String(row[c]).replace(/\./g,'').replace(',','.').replace(/[€%\s]/g,''));
                            if(!isNaN(v)) nums.push(v);
                        }
                        if(nums.length > 0) planMonths[monat] = {monat:monat,umsatz:nums[0]||0,wareneinsatz:nums[1]||0,rohertrag:nums[2]||0,personalkosten:nums[3]||0,raumkosten:nums[4]||0,ergebnis:nums[7]||0};
                    });
                    if(statusEl) statusEl.innerHTML = '<p class="text-xs text-green-600 mt-2">✅ '+Object.keys(planMonths).length+' Monate erkannt (lokaler Parser)</p>';
                } catch(e2) { reject(e2); return; }
            }

            var count = Object.keys(planMonths).length;
            if(count < 1) { reject(new Error('Keine Monatsdaten erkannt')); return; }

            var mLabels = ['','Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
            var ph = '<div class="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">';
            ph += '<p class="text-xs font-semibold text-green-700 mb-2">Erkannte Plan-Werte:</p>';
            ph += '<div class="grid grid-cols-6 gap-1 text-[10px]">';
            for(var mm=1;mm<=12;mm++) {
                var pd = planMonths[mm];
                ph += '<div class="text-center p-1 '+(pd?'bg-white rounded':'text-gray-300')+'"><div class="font-semibold">'+mLabels[mm]+'</div>';
                ph += '<div>'+(pd ? Math.round(pd.umsatz).toLocaleString('de-DE') : '—')+'</div></div>';
            }
            ph += '</div>';
            ph += '<button onclick="saveParsedPlan()" class="w-full mt-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:opacity-90">✅ Plan für '+planIstYear+' speichern</button>';
            ph += '</div>';
            if(resultEl) resultEl.innerHTML = ph;
            if(resultEl) resultEl.classList.remove('hidden');
            window._parsedPlanMonths = planMonths;
            resolve();
        });
    });
}

// Shared KI-Finance helper
export async function callFinanceKi(type, fileBase64, mediaType, rawText, meta) {
    var _sb2 = (typeof sb !== 'undefined') ? sb : _sb();
    var _SURL = (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL : window.SUPABASE_URL;
    var _SKEY = (typeof SUPABASE_ANON_KEY !== 'undefined') ? SUPABASE_ANON_KEY : window.SUPABASE_ANON_KEY;
    
    // Get user token, fallback to anon key
    var token = _SKEY; // default to anon key
    try {
        var session = await _sb2.auth.getSession();
        if(session && session.data && session.data.session && session.data.session.access_token) {
            token = session.data.session.access_token;
        }
    } catch(e) { console.warn('[callFinanceKi] Session error, using anon key:', e); }
    
    var payload = { type: type };
    if(fileBase64) { payload.file_base64 = fileBase64; payload.media_type = mediaType || 'application/pdf'; }
    if(rawText) { payload.raw_text = rawText; }
    if(meta) { payload.meta = meta; }
    
    console.log('[callFinanceKi] Calling analyze-finance, type:', type);
    var resp = await fetch(_SURL + '/functions/v1/analyze-finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token, 'apikey': _SKEY },
        body: JSON.stringify(payload)
    });
    
    // If 401 with user token, retry with anon key
    if(resp.status === 401 && token !== _SKEY) {
        console.warn('[callFinanceKi] User token 401, retrying with anon key');
        resp = await fetch(_SURL + '/functions/v1/analyze-finance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + _SKEY, 'apikey': _SKEY },
            body: JSON.stringify(payload)
        });
    }
    
    if(!resp.ok) { var errB=''; try { var eD=await resp.json(); errB=eD.error||eD.details||''; } catch(e2) {} throw new Error('KI-API Fehler ' + resp.status + (errB ? ': '+errB.substring(0,150) : '')); }
    var data = await resp.json();
    if(!data.result) throw new Error('Keine Ergebnisse');
    return data.result;
}

// Apply KI Jahresplan result to the plan preview
export function applyPlanKiResult(result, statusEl, resultEl) {
    if(!result || !result.monate) throw new Error('Keine Monatsdaten erkannt');
    var planMonths = {};
    Object.keys(result.monate).forEach(function(m) {
        var md = result.monate[m];
        if(!md) return;
        var monat = parseInt(m);
        planMonths[monat] = {
            monat: monat,
            umsatz: md.umsatz || 0,
            wareneinsatz: md.wareneinsatz || 0,
            personalkosten: md.personalkosten || 0,
            raumkosten: md.raumkosten || 0,
            rohertrag: (md.umsatz||0) + (md.wareneinsatz||0),
            ergebnis: (md.umsatz||0) + (md.wareneinsatz||0) + (md.personalkosten||0) + (md.raumkosten||0)
        };
    });
    var count = Object.keys(planMonths).length;
    if(count < 1) throw new Error('Keine Monatsdaten erkannt');

    if(statusEl) statusEl.innerHTML = '<p class="text-xs text-green-600 mt-2">✅ KI-Analyse: ' + count + ' Monate erkannt' + (result.confidence ? ' (Konfidenz: ' + Math.round(result.confidence * 100) + '%)' : '') + '</p>';

    // Show preview (same format as normal parser)
    var mLabels = ['','Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    var ph = '<div class="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-3">';
    ph += '<p class="text-xs font-semibold text-purple-700 mb-2">🤖 KI-erkannte Plan-Werte:</p>';
    ph += '<div class="grid grid-cols-6 gap-1 text-[10px]">';
    for(var mm=1;mm<=12;mm++) {
        var pd = planMonths[mm];
        ph += '<div class="text-center p-1 '+(pd?'bg-white rounded':'text-gray-300')+'"><div class="font-semibold">'+mLabels[mm]+'</div>';
        ph += '<div>'+(pd ? Math.round(pd.umsatz).toLocaleString('de-DE') : '—')+'</div></div>';
    }
    ph += '</div>';
    if(result.hinweise && result.hinweise.length > 0) {
        ph += '<div class="mt-2 text-[10px] text-purple-600">' + result.hinweise.map(function(h){return '⚠️ '+_escH(h);}).join('<br>') + '</div>';
    }
    ph += '<p class="mt-2 text-[10px] text-purple-400">Bitte Werte vor dem Speichern kontrollieren.</p>';
    ph += '<button onclick="saveParsedPlan()" class="w-full mt-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold hover:opacity-90">✅ Plan für '+planIstYear+' speichern</button>';
    ph += '</div>';
    if(resultEl) resultEl.innerHTML = ph;
    if(resultEl) resultEl.classList.remove('hidden');

    window._parsedPlanMonths = planMonths;
}

export async function saveParsedPlan() {
    var planMonths = window._parsedPlanMonths;
    if(!planMonths) return;
    try {
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var payload = {
            standort_id: stdId,
            jahr: planIstYear,
            plan_daten: planMonths,
            erstellt_von: _sbUser() ? _sbUser().id : null,
            updated_at: new Date().toISOString()
        };
        var resp = await _sb().from('jahresplaene').upsert(payload, {onConflict:'standort_id,jahr'}).select();
        if(resp.error) throw resp.error;
        currentPlan = resp.data[0] || payload;
        alert('✅ Jahresplan '+planIstYear+' gespeichert!');
        renderPlanIst();
    } catch(err) { alert('Fehler: '+(err.message||err)); }
}

export async function saveManualPlan() {
    var planMonths = {};
    for(var m=1;m<=12;m++) {
        var u = parseFloat((document.getElementById('planM_umsatz_'+m)||{}).value) || 0;
        var we = parseFloat((document.getElementById('planM_we_'+m)||{}).value) || 0;
        var pk = parseFloat((document.getElementById('planM_pk_'+m)||{}).value) || 0;
        var rk = parseFloat((document.getElementById('planM_rk_'+m)||{}).value) || 0;
        if(u || we || pk || rk) {
            planMonths[m] = { monat:m, umsatz:u, wareneinsatz:we, personalkosten:pk, raumkosten:rk };
        }
    }
    if(Object.keys(planMonths).length < 1) { alert(_t('misc_min_month')); return; }
    window._parsedPlanMonths = planMonths;
    await saveParsedPlan();
}

export async function renderPlanVergleich(el) {
    // Load all BWAs for this year
    var stdId = _sbProfile() ? _sbProfile().standort_id : null;
    var bwaResp = await _sb().from('bwa_daten').select('*').eq('standort_id', stdId).eq('jahr', planIstYear).order('monat');
    var bwas = bwaResp.data || [];
    var bwaByMonth = {};
    bwas.forEach(function(b) { bwaByMonth[b.monat] = b; });

    var plan = currentPlan.plan_daten;
    var mLabels = ['','Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    var currentMonth = new Date().getMonth() + 1;

    // Find selected month for detail view (default: latest with BWA data)
    var detailMonth = 0;
    for(var dm=12;dm>=1;dm--) { if(bwaByMonth[dm]) { detailMonth = dm; break; } }

    // KPIs: YTD totals
    var ytdPlanUmsatz = 0, ytdIstUmsatz = 0, ytdPlanErgebnis = 0, ytdIstErgebnis = 0;
    for(var k=1;k<=12;k++) {
        var p = plan[String(k)] || plan[k] || {};
        ytdPlanUmsatz += (p.umsatz||0);
        ytdPlanErgebnis += (p.ergebnis||0);
        if(bwaByMonth[k]) {
            ytdIstUmsatz += (parseFloat(bwaByMonth[k].umsatzerloese)||0);
            ytdIstErgebnis += (parseFloat(bwaByMonth[k].ergebnis_vor_steuern)||0);
        }
    }

    var h = '';
    // Year selector + reupload button
    h += '<div class="flex items-center justify-between mb-4">';
    h += '<div class="flex items-center space-x-3"><h2 class="text-lg font-bold text-gray-800">Plan / Ist Vergleich</h2>';
    h += '<select id="planIstYearSel" onchange="planIstYear=parseInt(this.value);currentPlan=null;renderPlanIst()" class="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">';
    for(var yy=2026;yy>=2024;yy--) h += '<option value="'+yy+'"'+(yy===planIstYear?' selected':'')+'>'+yy+'</option>';
    h += '</select></div>';
    h += '<button onclick="forceUploadScreen=true;currentPlan=null;renderPlanIst()" class="text-xs text-vit-orange font-semibold hover:underline">📄 Neuen Plan hochladen</button>';
    h += '</div>';

    // KPIs
    var diffUmsatz = ytdIstUmsatz - ytdPlanUmsatz;
    var pctUmsatz = ytdPlanUmsatz ? Math.round(ytdIstUmsatz/ytdPlanUmsatz*100) : 0;
    h += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
    h += '<div class="vit-card p-5 text-center"><p class="text-xs text-gray-500">Umsatz Plan YTD</p><p class="text-2xl font-bold text-blue-600">'+ytdPlanUmsatz.toLocaleString('de-DE')+' €</p></div>';
    h += '<div class="vit-card p-5 text-center"><p class="text-xs text-gray-500">Umsatz Ist YTD</p><p class="text-2xl font-bold '+(ytdIstUmsatz>=ytdPlanUmsatz?'text-green-600':'text-red-500')+'">'+ytdIstUmsatz.toLocaleString('de-DE')+' €</p><p class="text-xs '+(diffUmsatz>=0?'text-green-600':'text-red-500')+'">'+(diffUmsatz>=0?'+':'')+diffUmsatz.toLocaleString('de-DE')+' € ('+pctUmsatz+'%)</p></div>';
    h += '<div class="vit-card p-5 text-center"><p class="text-xs text-gray-500">BWAs eingereicht</p><p class="text-2xl font-bold text-gray-800">'+bwas.length+' / '+(currentMonth-1)+'</p><p class="text-xs text-gray-500">Monate</p></div>';
    var missing = [];
    for(var mm=1;mm<currentMonth;mm++) { if(!bwaByMonth[mm]) missing.push(mLabels[mm]); }
    h += '<div class="vit-card p-5 text-center"><p class="text-xs text-gray-500">Fehlend</p><p class="text-2xl font-bold '+(missing.length>0?'text-red-500':'text-green-600')+'">'+(missing.length||'✅')+'</p>'+(missing.length?'<p class="text-[10px] text-red-400">'+missing.join(', ')+'</p>':'')+'</div>';
    h += '</div>';

    // Monthly overview table
    h += '<div class="vit-card p-6 mb-6">';
    h += '<h3 class="font-semibold text-gray-800 mb-3">Monatsübersicht '+planIstYear+'</h3>';
    h += '<div class="overflow-x-auto"><table class="w-full text-sm">';
    h += '<thead><tr class="bg-gray-50"><th class="text-left py-2.5 px-3 font-semibold text-gray-600">Monat</th><th class="text-right py-2.5 px-3 font-semibold text-blue-600">Plan Umsatz</th><th class="text-right py-2.5 px-3 font-semibold text-vit-orange">Ist Umsatz</th><th class="text-right py-2.5 px-3 font-semibold text-gray-600">Abw.</th><th class="text-right py-2.5 px-3 font-semibold text-blue-600">Plan Rohertrag</th><th class="text-right py-2.5 px-3 font-semibold text-vit-orange">Ist Rohertrag</th><th class="text-right py-2.5 px-3 font-semibold text-blue-600">Plan Ergebnis</th><th class="text-right py-2.5 px-3 font-semibold text-vit-orange">Ist Ergebnis</th><th class="text-right py-2.5 px-3 font-semibold text-gray-600">Erfüllung</th><th class="text-center py-2.5 px-3 font-semibold text-gray-600">Status</th></tr></thead>';
    h += '<tbody>';
    var sumPlan=0,sumIst=0,sumPlanRoh=0,sumIstRoh=0,sumPlanErg=0,sumIstErg=0;
    for(var m=1;m<=12;m++) {
        var p = plan[String(m)] || plan[m] || {};
        var b = bwaByMonth[m];
        var pu = p.umsatz || 0;
        var iu = b ? (parseFloat(b.umsatzerloese)||0) : 0;
        var pRoh = (p.umsatz||0) + (p.wareneinsatz||0);
        var iRoh = b ? (parseFloat(b.rohertrag)||0) : 0;
        var pErg = p.ergebnis || ((p.umsatz||0)+(p.wareneinsatz||0)+(p.personalkosten||0)+(p.raumkosten||0));
        var iErg = b ? (parseFloat(b.ergebnis_vor_steuern)||parseFloat(b.betriebsergebnis)||0) : 0;
        sumPlan += pu; sumIst += iu; sumPlanRoh += pRoh; sumIstRoh += iRoh; sumPlanErg += pErg; sumIstErg += iErg;
        var diff = iu - pu;
        var pct = pu ? Math.round(iu/pu*100) : 0;
        var hasBwa = !!b;
        var isPast = m < currentMonth;
        var isCurrent = m === currentMonth;
        var status = hasBwa ? (pct>=100?'🟢':pct>=75?'🟡':'🔴') : (isPast?'⚠️':'⏳');
        var rowCls = hasBwa ? (pct>=100?'bg-green-50 border-l-4 border-green-400':'bg-orange-50 border-l-4 border-orange-400') : (isCurrent?'bg-blue-50 border-l-4 border-blue-400':'text-gray-400');
        h += '<tr class="border-b '+rowCls+'" '+(hasBwa?'onclick="showMonthDetail('+m+')" class="cursor-pointer hover:bg-gray-100"':'')+'>';
        h += '<td class="py-2.5 px-3 font-semibold">'+mLabels[m]+(isCurrent?' <span class="text-[10px] text-blue-500">(aktuell)</span>':'')+'</td>';
        h += '<td class="text-right py-2.5 px-3 text-blue-600">'+pu.toLocaleString('de-DE')+'</td>';
        h += '<td class="text-right py-2.5 px-3 font-bold '+(hasBwa?'text-vit-orange':'')+'">'+( hasBwa ? iu.toLocaleString('de-DE') : '—')+'</td>';
        h += '<td class="text-right py-2.5 px-3 text-xs '+(hasBwa?(diff>=0?'text-green-600':'text-red-600'):'')+'">'+( hasBwa ? (diff>=0?'+':'')+diff.toLocaleString('de-DE') : '—')+'</td>';
        h += '<td class="text-right py-2.5 px-3 text-blue-500 text-xs">'+pRoh.toLocaleString('de-DE')+'</td>';
        h += '<td class="text-right py-2.5 px-3 '+(hasBwa?'font-semibold':'')+'">'+( hasBwa ? iRoh.toLocaleString('de-DE') : '—')+'</td>';
        h += '<td class="text-right py-2.5 px-3 text-xs '+(pErg>=0?'text-blue-500':'text-blue-400')+'">'+Math.round(pErg).toLocaleString('de-DE')+'</td>';
        h += '<td class="text-right py-2.5 px-3 '+(hasBwa?(iErg>=0?'text-green-600 font-semibold':'text-red-500 font-semibold'):'')+'">'+( hasBwa ? Math.round(iErg).toLocaleString('de-DE') : '—')+'</td>';
        h += '<td class="text-right py-2.5 px-3 '+(hasBwa?(pct>=100?'text-green-600 font-bold':'text-red-600 font-bold'):'')+'">'+( hasBwa ? pct+'%' : '—')+'</td>';
        h += '<td class="text-center py-2.5 px-3">'+status+'</td>';
        h += '</tr>';
    }
    var totalDiff = sumIst-sumPlan; var totalPct = sumPlan?Math.round(sumIst/sumPlan*100):0;
    h += '<tr class="bg-gray-100 border-t-2"><td class="py-3 px-3 font-bold">GESAMT '+planIstYear+'</td>';
    h += '<td class="text-right py-3 px-3 font-bold text-blue-600">'+sumPlan.toLocaleString('de-DE')+'</td>';
    h += '<td class="text-right py-3 px-3 font-bold text-vit-orange">'+sumIst.toLocaleString('de-DE')+'</td>';
    h += '<td class="text-right py-3 px-3 font-bold text-xs '+(totalDiff>=0?'text-green-600':'text-red-600')+'">'+(totalDiff>=0?'+':'')+totalDiff.toLocaleString('de-DE')+'</td>';
    h += '<td class="text-right py-3 px-3 font-bold text-blue-500">'+sumPlanRoh.toLocaleString('de-DE')+'</td>';
    h += '<td class="text-right py-3 px-3 font-bold">'+sumIstRoh.toLocaleString('de-DE')+'</td>';
    h += '<td class="text-right py-3 px-3 font-bold '+(sumPlanErg>=0?'text-blue-600':'text-red-400')+'">'+Math.round(sumPlanErg).toLocaleString('de-DE')+'</td>';
    h += '<td class="text-right py-3 px-3 font-bold '+(sumIstErg>=0?'text-green-600':'text-red-500')+'">'+Math.round(sumIstErg).toLocaleString('de-DE')+'</td>';
    h += '<td class="text-right py-3 px-3 font-bold">'+totalPct+'%</td><td class="text-center">📊</td></tr>';
    h += '</tbody></table></div></div>';

    // Detail view for selected month
    if(detailMonth && bwaByMonth[detailMonth]) {
        var b = bwaByMonth[detailMonth];
        var p = plan[String(detailMonth)] || plan[detailMonth] || {};
        h += '<div class="vit-card p-6" id="planIstDetail">';
        h += '<div class="flex items-center justify-between mb-4"><h3 class="font-semibold text-gray-800">Plan / Ist Detail – '+mLabels[detailMonth]+' '+planIstYear+'</h3>';
        h += '<select onchange="showMonthDetail(parseInt(this.value))" class="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">';
        for(var ms=1;ms<=12;ms++) {
            var hasBwa2 = !!bwaByMonth[ms];
            h += '<option value="'+ms+'"'+(ms===detailMonth?' selected':'')+(hasBwa2?'':' disabled')+'>'+mLabels[ms]+(hasBwa2?'':' (keine BWA)')+'</option>';
        }
        h += '</select></div>';
        h += buildPlanIstTable(p, b);
        h += '</div>';
    }

    el.innerHTML = h;
}

export function buildPlanIstTable(plan, bwa) {
    var rows = [
        {label:'Umsatzerlöse', plan: plan.umsatz, ist: parseFloat(bwa.umsatzerloese)||0, bold:true},
        {label:'Wareneinsatz', plan: plan.wareneinsatz, ist: parseFloat(bwa.wareneinsatz)||0, bold:true},
        {label:'Rohertrag', plan: (plan.umsatz||0)+(plan.wareneinsatz||0), ist: parseFloat(bwa.rohertrag)||0, highlight:'blue'},
        {label:'Personalkosten', plan: plan.personalkosten, ist: parseFloat(bwa.personalkosten)||0, bold:true},
        {label:'Raumkosten', plan: plan.raumkosten, ist: parseFloat(bwa.raumkosten)||0},
        {label:'Werbe-/Reisekosten', plan: plan.werbekosten, ist: parseFloat(bwa.werbekosten)||0},
        {label:'Abschreibungen', plan: plan.abschreibungen||plan.abschreibung, ist: parseFloat(bwa.abschreibungen)||0},
        {label:'Sonstige Kosten', plan: plan.sonstige, ist: parseFloat(bwa.sonstige_kosten)||0},
        {label:'Gesamtkosten', plan: (plan.personalkosten||0)+(plan.raumkosten||0)+(plan.werbekosten||0)+(plan.sonstige||0), ist: parseFloat(bwa.gesamtkosten)||0, highlight:'gray'},
        {label:'Betriebsergebnis', plan: plan.ergebnis||((plan.umsatz||0)+(plan.wareneinsatz||0)+(plan.personalkosten||0)+(plan.raumkosten||0)+(plan.sonstige||0)), ist: parseFloat(bwa.betriebsergebnis)||0, highlight:'yellow'},
        {label:'Zinsaufwand', plan: plan.zins||plan.zinsaufwand, ist: parseFloat(bwa.zinsaufwand)||0},
        {label:'Ergebnis vor Steuern', plan: plan.ergebnis, ist: parseFloat(bwa.ergebnis_vor_steuern)||0, highlight:'result'}
    ];

    var h = '<div class="overflow-x-auto"><table class="w-full text-sm">';
    h += '<thead><tr class="bg-gray-50"><th class="text-left py-2.5 px-3 font-semibold text-gray-600 w-1/4">Position</th><th class="text-right py-2.5 px-3 font-semibold text-blue-600">Plan</th><th class="text-right py-2.5 px-3 font-semibold text-vit-orange">Ist (BWA)</th><th class="text-right py-2.5 px-3 font-semibold text-gray-600">Abweichung</th><th class="text-right py-2.5 px-3 font-semibold text-gray-600">%</th></tr></thead>';
    h += '<tbody>';
    rows.forEach(function(r) {
        var pv = r.plan || 0;
        var iv = r.ist || 0;
        var diff = iv - pv;
        var isGood = r.label.match(/Umsatz|Rohertrag|Ergebnis/) ? diff >= 0 : diff <= 0;
        var pct = pv ? Math.round(Math.abs(iv/pv)*100) : (iv?'—':'—');
        var bgCls = '';
        if(r.highlight==='blue') bgCls = 'bg-blue-50 border-b-2 border-gray-800';
        else if(r.highlight==='yellow') bgCls = 'bg-yellow-50 border-b-2 border-gray-600';
        else if(r.highlight==='gray') bgCls = 'bg-gray-100 border-t-2';
        else if(r.highlight==='result') bgCls = (iv>=0?'bg-green-50':'bg-red-50')+' border-t-2 border-gray-800';
        h += '<tr class="border-b '+bgCls+'">';
        h += '<td class="py-2.5 px-3 '+(r.bold||r.highlight?'font-bold':'font-semibold')+' text-gray-800 '+(r.highlight?'text-base':'')+'">'+r.label+'</td>';
        h += '<td class="text-right py-2.5 px-3 text-blue-600 '+(r.highlight?'font-bold':'')+'">'+pv.toLocaleString('de-DE')+'</td>';
        h += '<td class="text-right py-2.5 px-3 '+(r.highlight?'font-bold text-base':'font-semibold')+' text-vit-orange">'+iv.toLocaleString('de-DE')+'</td>';
        h += '<td class="text-right py-2.5 px-3 font-semibold '+(isGood?'text-green-600':'text-red-600')+'">'+(diff>=0?'+':'')+diff.toLocaleString('de-DE')+'</td>';
        h += '<td class="text-right py-2.5 px-3 '+(isGood?'text-green-600':'text-red-600')+'">'+pct+'%</td>';
        h += '</tr>';
    });
    h += '</tbody></table></div>';
    // Rohertragsmarge
    var planMarge = (rows[0].plan||1) ? (((rows[2].plan||0)/(rows[0].plan||1))*100).toFixed(1) : 0;
    var istMarge = (rows[0].ist||1) ? (((rows[2].ist||0)/(rows[0].ist||1))*100).toFixed(1) : 0;
    h += '<div class="mt-3 flex items-center space-x-4 text-xs text-gray-500"><span>Rohertragsmarge: <strong class="text-blue-600">Plan '+planMarge+'%</strong></span><span>|</span><span><strong class="text-vit-orange">Ist '+istMarge+'%</strong></span><span>|</span><span class="'+(parseFloat(istMarge)>=parseFloat(planMarge)?'text-green-600':'text-red-500')+'">Differenz: '+(parseFloat(istMarge)-parseFloat(planMarge)).toFixed(1)+' Pp</span></div>';
    return h;
}

export function showMonthDetail(m) {
    // Re-render detail only - we need to reload
    renderPlanIst();
}

export function editSelectedBwa() {
    if(!selectedBwaId) return;
    // Find in cache and open modal pre-filled
    var b = bwaCache.find(function(x){return x.id===selectedBwaId;});
    if(!b) { openBwaUploadModal(); return; }
    openBwaUploadModal();
    // Pre-fill after modal renders
    setTimeout(async function(){
        try {
            var resp = await _sb().from('bwa_daten').select('*').eq('id', selectedBwaId).single();
            if(resp.error) return;
            var d = resp.data;
            document.getElementById('bwaMonth').value = d.monat;
            document.getElementById('bwaYear').value = d.jahr;
            var map = {
                'bwaF_umsatz':d.umsatzerloese,'bwaF_fahrraeder':d.davon_fahrraeder,'bwaF_teile':d.davon_teile,
                'bwaF_service':d.davon_service,'bwaF_skonti':d.davon_skonti,'bwaF_wareneinsatz':d.wareneinsatz,
                'bwaF_personal':d.personalkosten,'bwaF_raum':d.raumkosten,'bwaF_werbe':d.werbekosten,
                'bwaF_warenabgabe':d.kosten_warenabgabe,'bwaF_abschreibung':d.abschreibungen,'bwaF_sonstige':d.sonstige_kosten,
                'bwaF_zins':d.zinsaufwand,'bwaF_planUmsatz':d.plan_umsatz,'bwaF_planWareneinsatz':d.plan_wareneinsatz,
                'bwaF_planRohertrag':d.plan_rohertrag,'bwaF_planPersonal':d.plan_personalkosten,'bwaF_planRaum':d.plan_raumkosten,
                'bwaF_planWerbe':d.plan_werbekosten,'bwaF_planGesamt':d.plan_gesamtkosten,'bwaF_planErgebnis':d.plan_ergebnis
            };
            Object.keys(map).forEach(function(id) { var el = document.getElementById(id); if(el && map[id]) el.value = map[id]; });
        } catch(e) {}
    }, 200);
}

export async function deleteBwa() {
    if(!selectedBwaId) return;
    if(!confirm(_t('confirm_delete_bwa'))) return;
    try {
        var resp = await _sb().from('bwa_daten').delete().eq('id', selectedBwaId);
        if(resp.error) throw resp.error;
        selectedBwaId = null;
        document.getElementById('bwaTitle').textContent = 'BWA auswaehlen';
        document.getElementById('bwaDetailBody').innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">BWA geloescht.</td></tr>';
        document.getElementById('bwaEditBtn').style.display = 'none';
        document.getElementById('bwaDeleteBtn').style.display = 'none';
        document.getElementById('bwaTrendSection').style.display = 'none';
        document.getElementById('bwaKpiUmsatz').textContent = '—';
        document.getElementById('bwaKpiRohertrag').textContent = '—';
        document.getElementById('bwaKpiKosten').textContent = '—';
        document.getElementById('bwaKpiErgebnis').textContent = '—';
        loadBwaList();
    } catch(err) { alert('Fehler: '+err.message); }
}

// =============================================
// VERKAUFSERFOLG TRACKING - SUPABASE
// =============================================
var vtCache = [];

export async function loadVerkaufTracking() {
    var stdId = _sbProfile() ? _sbProfile().standort_id : null;
    var now = new Date();
    // Get Monday of current week
    var day = now.getDay(); var diff = now.getDate() - day + (day===0?-6:1);
    var monday = new Date(now); monday.setDate(diff); monday.setHours(0,0,0,0);
    var sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
    var monStr = monday.toISOString().slice(0,10);
    var sunStr = sunday.toISOString().slice(0,10);
    try {
        var query = _sb().from('verkauf_tracking').select('*').gte('datum', monStr).lte('datum', sunStr).order('datum');
        if(stdId && !_sbProfile().is_hq) query = query.eq('standort_id', stdId);
        var resp = await query;
        if(resp.error) throw resp.error;
        vtCache = resp.data || [];
        renderVerkaufFromDb();
    } catch(err) { console.error('VT load error:', err); }
}

export function renderVerkaufFromDb() {
    // Aggregate data by seller
    var sellerMap = {};
    vtCache.forEach(function(entry) {
        var name = entry.verkaeufer_name;
        if(!sellerMap[name]) sellerMap[name] = {name:name,total:0,verkauft:0,umsatz:0,daily:{}};
        var s = sellerMap[name];
        var d = new Date(entry.datum);
        var dayNames = ['So','Mo','Di','Mi','Do','Fr','Sa'];
        var dayName = dayNames[d.getDay()];
        s.daily[dayName] = entry;
        var gesamt = (entry.geplant||0) + (entry.spontan||0) + (entry.online||0);
        s.total += gesamt;
        s.verkauft += (entry.verkauft||0);
        s.umsatz += parseFloat(entry.umsatz)||0;
    });

    // Update KPIs
    var totalPlan=0,totalGesamt=0,totalVerkauft=0,totalUmsatz=0;
    Object.values(sellerMap).forEach(function(s) {
        totalGesamt += s.total;
        totalVerkauft += s.verkauft;
        totalUmsatz += s.umsatz;
    });
    var el;
    el = document.getElementById('wkGesamt'); if(el) el.textContent = totalGesamt;
    el = document.getElementById('wkVerkauft'); if(el) el.textContent = totalVerkauft;
    el = document.getElementById('wkUmsatz'); if(el) el.textContent = totalUmsatz.toLocaleString('de-DE') + ' €';
    var quoteVal = totalGesamt > 0 ? Math.round((totalVerkauft/totalGesamt)*100) : 0;
    el = document.getElementById('wkQuote');
    if(el) { el.textContent = quoteVal + '%'; el.className = 'text-2xl font-bold ' + (quoteVal >= 70 ? 'text-green-600' : quoteVal >= 40 ? 'text-orange-600' : 'text-red-600'); }
}

export function openVerkaufEntryModal() {
    var now = new Date();
    var today = now.toISOString().slice(0,10);
    var isGF = _sbProfile() && (_sbProfile().rolle === 'geschaeftsfuehrung' || _sbProfile().rolle === 'geschaeftsleitung' || _sbProfile().is_hq);
    var currentUser = _sbProfile() ? _sbProfile().name : '';
    var html = '<div id="vtEntryOverlay" onclick="closeVtModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
    html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:24px;width:480px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
    html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-bold text-gray-800">💰 Verkaufserfolg eintragen</h3><button onclick="closeVtModal()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>';
    html += '<div class="grid grid-cols-2 gap-3 mb-4">';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Datum</label><input id="vtDate" type="date" value="'+today+'" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>';
    if(isGF) {
        html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Verkaeufer</label><select id="vtSeller" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="'+currentUser+'">'+currentUser+'</option></select></div>';
    } else {
        html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Verkaeufer</label><input id="vtSeller" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50" value="'+currentUser+'" readonly></div>';
    }
    html += '</div>';
    html += '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Beratungen</p>';
    html += '<div class="grid grid-cols-2 gap-3 mb-4">';
    var vtFields = [
        {id:'vtGeplant',label:'Geplant',ph:'0'},
        {id:'vtSpontan',label:'Spontan',ph:'0'},
        {id:'vtErgo',label:'Ergo-Beratung',ph:'0'},
        {id:'vtVerkauft',label:'Verkauft ✅',ph:'0'}
    ];
    vtFields.forEach(function(f) {
        html += '<div><label class="block text-xs text-gray-600 mb-1">'+f.label+'</label>';
        html += '<input id="'+f.id+'" type="number" min="0" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center" placeholder="'+f.ph+'" value="0"></div>';
    });
    html += '</div>';
    html += '<div class="grid grid-cols-2 gap-3 mb-4">';
    html += '<div><label class="block text-xs text-gray-600 mb-1">Uebergaben</label><input id="vtUebergabe" type="number" min="0" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center" value="0"></div>';
    html += '<div><label class="block text-xs text-gray-600 mb-1">Umsatz (€) <span class="text-gray-400 font-normal">aus WaWi</span></label><input id="vtUmsatz" type="number" step="0.01" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right" placeholder="0"></div>';
    html += '</div>';
    html += '<div class="mb-3"><label class="block text-xs text-gray-600 mb-1">Notizen</label><textarea id="vtNotizen" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" rows="2" placeholder="z.B. Kunde kommt naechste Woche wieder..."></textarea></div>';
    html += '<div id="vtError" style="display:none" class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-3"></div>';
    html += '<button onclick="saveVtEntry()" id="vtSaveBtn" class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">Speichern</button>';
    html += '</div></div>';
    var c = document.createElement('div'); c.id = 'vtEntryContainer'; c.innerHTML = html; document.body.appendChild(c);
    // Auto-prefill Umsatz from WaWi data for selected seller + date
    async function prefillWawiUmsatz() {
        try {
            var seller = (document.getElementById('vtSeller')||{}).value;
            var datum = (document.getElementById('vtDate')||{}).value;
            if(!seller || !datum) return;
            var stdId = _sbProfile() ? _sbProfile().standort_id : null;
            var q = _sb().from('wawi_belege').select('endbetrag').eq('verkaeufer', seller).eq('datum', datum);
            if(stdId) q = q.eq('standort_id', stdId);
            var resp = await q;
            if(resp.data && resp.data.length) {
                var total = resp.data.reduce(function(s,b){ return s + (parseFloat(b.endbetrag)||0); }, 0);
                var el = document.getElementById('vtUmsatz');
                if(el && !el._userEdited) { el.value = total.toFixed(2); }
            }
        } catch(e) { console.warn('WaWi prefill:', e); }
    }
    setTimeout(function(){
        prefillWawiUmsatz();
        var dateEl = document.getElementById('vtDate');
        var sellerEl = document.getElementById('vtSeller');
        if(dateEl) dateEl.addEventListener('change', function(){ prefillWawiUmsatz(); });
        if(sellerEl) sellerEl.addEventListener('change', function(){ prefillWawiUmsatz(); });
        var umsatzEl = document.getElementById('vtUmsatz');
        if(umsatzEl) umsatzEl.addEventListener('input', function(){ umsatzEl._userEdited = true; });
    }, 300);
    if(isGF) {
        (async function(){
            try {
                var stdId = _sbProfile().standort_id;
                var q = _sb().from('users').select('id, vorname, nachname, name').eq('status', 'aktiv');
                if(stdId && !_sbProfile().is_hq) q = q.eq('standort_id', stdId);
                var r = await q.order('name');
                if(r.data && r.data.length) {
                    var sel = document.getElementById('vtSeller');
                    if(sel) { sel.innerHTML = ''; r.data.forEach(function(p){ var nm = (p.vorname && p.nachname) ? (p.vorname+' '+p.nachname) : (p.name||'?'); var o=document.createElement('option'); o.value=nm; o.textContent=nm; if(p.id) o.dataset.uid=p.id; if(nm===currentUser) o.selected=true; sel.appendChild(o); }); }
                }
            } catch(e) { console.warn('Could not load sellers:', e); }
        })();
    }
}

export function closeVtModal() { var c = document.getElementById('vtEntryContainer'); if(c) c.remove(); }

// =============================================
// AUSWERTUNG TAB - Yearly Analysis from DB
// =============================================
export async function loadAuswertung() {
    try {
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var year = new Date().getFullYear();
        var startDate = year+'-01-01';
        var endDate = year+'-12-31';
        var query = _sb().from('verkauf_tracking').select('*').gte('datum', startDate).lte('datum', endDate).order('datum');
        if(stdId && !_sbProfile().is_hq) query = query.eq('standort_id', stdId);
        var resp = await query;
        if(resp.error) throw resp.error;
        var data = resp.data || [];
        renderAuswertung(data, year);
    } catch(e) { console.error('Auswertung load:', e); }
}

export function renderAuswertung(data, year) {
    var mn = ['','Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    var mnFull = ['','Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    var nowMonth = new Date().getMonth()+1;
    // Aggregate by month
    var months = {};
    for(var m=1;m<=12;m++) months[m]={beratungen:0,verkauft:0,umsatz:0,plan:0};
    var sellerMap = {};
    data.forEach(function(d){
        var dm = new Date(d.datum).getMonth()+1;
        var ges = (d.geplant||0)+(d.spontan||0)+(d.online||0);
        months[dm].beratungen += ges;
        months[dm].verkauft += (d.verkauft||0);
        months[dm].umsatz += parseFloat(d.umsatz)||0;
        months[dm].plan += (d.plan_termine||0);
        // Seller aggregation
        var n = d.verkaeufer_name||'Unbekannt';
        if(!sellerMap[n]) sellerMap[n]={name:n,umsatz:0,verkauft:0,beratungen:0};
        sellerMap[n].umsatz += parseFloat(d.umsatz)||0;
        sellerMap[n].verkauft += (d.verkauft||0);
        sellerMap[n].beratungen += ges;
    });
    // Year totals
    var totBer=0,totVk=0,totUms=0;
    for(var m=1;m<=12;m++){totBer+=months[m].beratungen;totVk+=months[m].verkauft;totUms+=months[m].umsatz;}
    var ytdQuote = totBer>0?Math.round(totVk/totBer*100):0;
    var avgPreis = totVk>0?Math.round(totUms/totVk):0;
    // Update KPIs
    var el;
    el=document.getElementById('ausUmsatzYTD'); if(el) el.textContent=eur(totUms)+' \u20AC';
    el=document.getElementById('ausVerkauft'); if(el) el.textContent=totVk;
    el=document.getElementById('ausQuote'); if(el) el.textContent=ytdQuote+'%';
    el=document.getElementById('ausAvgPreis'); if(el) el.textContent=eur(avgPreis)+' \u20AC';

    // SVG Chart
    var chartEl = document.getElementById('ausChartContainer');
    if(chartEl) {
        var w=chartEl.offsetWidth||600; var h=180; var pad=40;
        var vals=[]; for(var m=1;m<=12;m++) vals.push(months[m].umsatz);
        var maxV=Math.max.apply(null,vals.concat([1]));
        var barW=Math.floor((w-pad*2)/12)-8;
        var svg='<svg width="'+w+'" height="'+(h+30)+'" style="display:block">';
        // Grid lines
        for(var g=0;g<=4;g++){
            var gy=pad+g*(h-pad)/4;
            var label=eur(Math.round(maxV*(4-g)/4));
            svg+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(w-10)+'" y2="'+gy+'" stroke="#e5e7eb" stroke-width="1"/>';
            svg+='<text x="'+(pad-5)+'" y="'+(gy+4)+'" text-anchor="end" fill="#9ca3af" font-size="9">'+label+'</text>';
        }
        // Bars
        for(var m=1;m<=12;m++){
            var x=pad+(m-1)*((w-pad*2)/12)+4;
            var val=vals[m-1];
            var barH=maxV>0?(val/maxV)*(h-pad):0;
            var color=m<=nowMonth?(val>0?'#EF7D00':'#D1D5DB'):'#E5E7EB';
            svg+='<rect x="'+x+'" y="'+(h-barH)+'" width="'+barW+'" height="'+Math.max(barH,1)+'" rx="3" fill="'+color+'"/>';
            if(val>0) svg+='<text x="'+(x+barW/2)+'" y="'+(h-barH-4)+'" text-anchor="middle" fill="#374151" font-size="9" font-weight="bold">'+eur(val)+'</text>';
            svg+='<text x="'+(x+barW/2)+'" y="'+(h+15)+'" text-anchor="middle" fill="#6B7280" font-size="10">'+mn[m]+'</text>';
        }
        svg+='</svg>';
        chartEl.innerHTML=svg;
    }

    // Monthly table
    var tbody=document.getElementById('jahresTabelle');
    if(tbody){
        var h='';
        for(var m=1;m<=12;m++){
            var md=months[m];
            var q=md.beratungen>0?Math.round(md.verkauft/md.beratungen*100):0;
            var avg=md.verkauft>0?Math.round(md.umsatz/md.verkauft):0;
            var isCur=m===nowMonth; var isPast=m<nowMonth; var hasDat=md.beratungen>0||md.umsatz>0;
            var rc=isCur?'bg-blue-50 border-l-4 border-blue-400':hasDat?'':'text-gray-400';
            h+='<tr class="border-b '+rc+'">';
            h+='<td class="py-2.5 px-3 '+(isCur?'font-semibold':'')+'">'+mnFull[m]+'</td>';
            h+='<td class="text-right py-2.5 px-3 '+(md.beratungen>0?'text-blue-600 font-semibold':'')+'">'+( md.beratungen>0?md.beratungen:'\u2014')+'</td>';
            h+='<td class="text-right py-2.5 px-3 '+(md.verkauft>0?'text-green-600 font-bold':'')+'">'+( md.verkauft>0?md.verkauft:'\u2014')+'</td>';
            h+='<td class="text-right py-2.5 px-3 '+(q>=70?'text-green-600':q>=40?'text-orange-600':q>0?'text-red-600':'')+'">'+( q>0?q+'%':'\u2014')+'</td>';
            h+='<td class="text-right py-2.5 px-3 '+(md.umsatz>0?'font-bold text-vit-orange':'')+'">'+( md.umsatz>0?eur(md.umsatz)+' \u20AC':'\u2014')+'</td>';
            h+='<td class="text-right py-2.5 px-3">'+( avg>0?eur(avg)+' \u20AC':'\u2014')+'</td>';
            h+='</tr>';
        }
        h+='<tr class="bg-gray-100 border-t-2"><td class="py-3 px-3 font-bold">GESAMT '+year+'</td>';
        h+='<td class="text-right py-3 px-3 font-bold text-blue-600">'+totBer+'</td>';
        h+='<td class="text-right py-3 px-3 font-bold text-green-600">'+totVk+'</td>';
        h+='<td class="text-right py-3 px-3 font-bold">'+ytdQuote+'%</td>';
        h+='<td class="text-right py-3 px-3 font-bold text-vit-orange">'+eur(totUms)+' \u20AC</td>';
        h+='<td class="text-right py-3 px-3 font-bold">'+eur(avgPreis)+' \u20AC</td></tr>';
        tbody.innerHTML=h;
    }

    // Ranking
    var sellers=Object.values(sellerMap).sort(function(a,b){return b.umsatz-a.umsatz;});
    var rankEl=document.getElementById('ausRanking');
    if(rankEl && sellers.length>0){
        var medals=['\ud83e\udd47','\ud83e\udd48','\ud83e\udd49'];
        var colors=['border-2 border-yellow-400 bg-yellow-50','border-2 border-gray-300 bg-gray-50','border-2 border-orange-300 bg-orange-50'];
        var rh='';
        sellers.slice(0,8).forEach(function(s,i){
            var cls=i<3?colors[i]:'border border-gray-200';
            var q=s.beratungen>0?Math.round(s.verkauft/s.beratungen*100):0;
            rh+='<div class="p-4 '+cls+' rounded-xl text-center">';
            rh+='<p class="text-3xl mb-1">'+(i<3?medals[i]:(i+1))+'</p>';
            rh+='<p class="font-bold text-gray-800">'+s.name+'</p>';
            rh+='<p class="text-xl font-bold text-vit-orange">'+eur(s.umsatz)+' \u20AC</p>';
            rh+='<p class="text-xs text-gray-500">'+s.verkauft+' Verkaeufe · Quote: '+q+'%</p>';
            rh+='</div>';
        });
        rankEl.innerHTML=rh;
    } else if(rankEl) {
        rankEl.innerHTML='<p class="text-sm text-gray-400 col-span-4 text-center py-4">Noch keine Verkaufsdaten erfasst. Nutze "+ Eintragen" in der Wochenansicht.</p>';
    }
}

export async function saveVtEntry() {
    var datum = (document.getElementById('vtDate')||{}).value;
    var seller = (document.getElementById('vtSeller')||{}).value;
    var errEl = document.getElementById('vtError');
    var btn = document.getElementById('vtSaveBtn');
    if(!datum || !seller.trim()) { if(errEl){errEl.textContent='Bitte Datum und Verkaeufer eingeben.';errEl.style.display='block';} return; }
    var vi = function(id) { return parseInt((document.getElementById(id)||{}).value) || 0; };
    var vf = function(id) { return parseFloat((document.getElementById(id)||{}).value) || 0; };
    // Get verkaeufer_id from selected option
    var sellerEl = document.getElementById('vtSeller');
    var sellerUid = null;
    if(sellerEl && sellerEl.selectedOptions && sellerEl.selectedOptions[0]) {
        sellerUid = sellerEl.selectedOptions[0].dataset.uid || null;
    }
    if(!sellerUid) {
        // Fallback: use current user ID
        sellerUid = _sbUser() ? _sbUser().id : null;
    }

    if(btn) { btn.disabled=true; btn.textContent='Wird gespeichert...'; }
    try {
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var data = {
            standort_id: stdId,
            datum: datum,
            verkaeufer_id: sellerUid,
            verkaeufer_name: seller.trim(),
            plan_termine: 0,
            geplant: vi('vtGeplant'),
            spontan: vi('vtSpontan'),
            online: 0,
            ergo: vi('vtErgo'),
            verkauft: vi('vtVerkauft'),
            uebergabe: vi('vtUebergabe'),
            umsatz: vf('vtUmsatz'),
            notizen: (document.getElementById('vtNotizen')||{}).value || null,
            updated_at: new Date().toISOString()
        };
        var resp = await _sb().from('verkauf_tracking').upsert(data, {onConflict:'standort_id,verkaeufer_id,datum'}).select();
        if(resp.error) throw resp.error;
        closeVtModal();
        alert('✅ Verkaufsdaten gespeichert!');
        loadVerkaufTracking();
        loadWeekFromDb();
    } catch(err) {
        if(errEl){errEl.textContent='Fehler: '+err.message;errEl.style.display='block';}
        if(btn) { btn.disabled=false; btn.textContent=_t('btn_save'); }
    }
}

// Load BWA on controlling tab open (deferred until controlling.js exports the function)
window.addEventListener('vit:modules-ready', function() {
    if (typeof window.showControllingTab === 'function') {
        var origShowControllingTab = window.showControllingTab;
        window.showControllingTab = function(t) {
            origShowControllingTab(t);
            if(t === 'bwa') loadBwaList();
            if(t === 'planist') renderPlanIst();
            if(t === 'ctrlWissen' && typeof window.renderWissenTab === 'function') window.renderWissenTab('controlling','ctrlTabCtrlWissen');
        };
    }
});

// === LEAD REPORTING DASHBOARD (computed from hqStandorte) ===
export function getLeadData() {
    var hqStandorte = window.hqStandorte || [];
    // Standorte performance sorted
    var standorte = hqStandorte.map(function(s) {
        return { name: s.name, perf: s.leadPerf };
    }).sort(function(a,b) { return a.perf - b.perf; });

    // Monthly data - use actual data from DB where available
    var monate = [
        { name: 'Jan', soll: 135.3 }, { name: 'Feb', soll: 287.4 },
        { name: 'Maerz', soll: 363.4 }, { name: 'Apr', soll: 397.3 },
        { name: 'Mai', soll: 432.9 }, { name: 'Jun', soll: 397.3 },
        { name: 'Jul', soll: 396.2 }, { name: 'Aug', soll: 359.7 },
        { name: 'Sep', soll: 324.0 }, { name: 'Okt', soll: 218.8 },
        { name: 'Nov', soll: 182.0 }, { name: 'Dez', soll: 108.2 }
    ];
    // Calculate actual totals from standorte
    var totalIst = (window.hqStandorte||[]).reduce(function(a,s){ return a + s.umsatzIst; }, 0);
    var totalLeads = (window.hqStandorte||[]).reduce(function(a,s){ return a + s.leads; }, 0);
    var currentMonth = new Date().getMonth();
    if(currentMonth >= 0 && totalIst > 0) monate[0].ist = Math.round(totalIst * 0.4 / 1000);
    if(currentMonth >= 1 && totalIst > 0) monate[1].ist = Math.round(totalIst * 0.6 / 1000);

    return { standorte: standorte, monate: monate };
}

export function getPerformanceColor(perf) {
    if (perf >= 100) return 'bg-yellow-400';
    if (perf >= 75) return 'bg-green-500';
    if (perf >= 50) return 'bg-orange-500';
    return 'bg-red-500';
}

export function getPerformanceDot(perf) {
    if (perf >= 100) return '#FBBF24';
    if (perf >= 75) return '#22C55E';
    if (perf >= 50) return '#F97316';
    return '#EF4444';
}

export async function renderLeadDashboard() {
    try { if((window.hqStandorte||[]).length === 0 && typeof window.loadHqStandorte === 'function') await window.loadHqStandorte(); } catch(e) { console.warn('Lead dashboard: no HQ data'); }
    var leadData = getLeadData();
    if(!leadData || !leadData.monate) return;
    // Chart Bars
    var chartBars = document.getElementById('chartBars');
    var chartLabels = document.getElementById('chartLabels');
    if (!chartBars) return;
    var maxVal = 600;
    var barsHtml = '';
    var labelsHtml = '';
    leadData.monate.forEach(function(m) {
        var sollH = (m.soll / maxVal) * 100;
        var istH = m.ist ? (m.ist / maxVal) * 100 : 0;
        barsHtml += '<div class="flex-1 flex items-end justify-center space-x-1">' +
            '<div class="w-5 bg-gray-300 rounded-t" style="height:' + sollH + '%;"></div>';
        if (m.ist) {
            barsHtml += '<div class="w-5 bg-vit-orange rounded-t" style="height:' + istH + '%;"></div>';
        }
        barsHtml += '</div>';
        labelsHtml += '<span class="flex-1 text-center">' + m.name + '</span>';
    });
    chartBars.innerHTML = barsHtml;
    chartLabels.innerHTML = labelsHtml;

    // Detail Table
    var tbody = document.getElementById('detailTableBody');
    if (!tbody) return;
    var rowsHtml = '';
    leadData.monate.forEach(function(m, i) {
        var isCurrent = (i === 1);
        var rowClass = isCurrent ? 'bg-blue-50 border-l-4 border-blue-400' : '';
        var statusIcon = '⏳';
        if (m.perf) {
            statusIcon = m.perf >= 100 ? '✅' : '❌';
        }
        rowsHtml += '<tr class="border-b border-gray-100 ' + rowClass + '">' +
            '<td class="py-3 px-2 font-semibold text-gray-800">' + m.name + '</td>' +
            '<td class="py-3 px-2 text-right text-gray-700">' + m.soll.toFixed(1) + '</td>' +
            '<td class="py-3 px-2 text-right text-green-600 font-semibold">' + (m.ist || '—') + '</td>' +
            '<td class="py-3 px-2 text-right text-purple-600">' + (m.termin_cost ? m.termin_cost + ' €' : '—') + '</td>' +
            '<td class="py-3 px-2 text-right text-blue-600">' + (m.sv025 || '—') + '</td>' +
            '<td class="py-3 px-2 text-right text-orange-600">' + (m.sv_roh || '—') + '</td>' +
            '<td class="py-3 px-2 text-right font-bold text-gray-800">' + (m.gesamt ? m.gesamt.toFixed(1) : '—') + '</td>' +
            '<td class="py-3 px-2 text-right ' + (m.diff > 0 ? 'text-green-600' : m.diff < 0 ? 'text-red-600' : 'text-gray-400') + ' font-semibold">' + (m.diff ? (m.diff > 0 ? '+' : '') + m.diff.toFixed(1) : '—') + '</td>' +
            '<td class="py-3 px-2 text-right font-bold ' + (m.perf >= 100 ? 'text-green-600' : m.perf ? 'text-red-600' : 'text-gray-400') + '">' + (m.perf ? m.perf + '%' : '—') + '</td>' +
            '<td class="py-3 px-2 text-center">' + statusIcon + '</td>' +
            '</tr>';
    });
    tbody.innerHTML = rowsHtml;
}

// Render on load (deferred until HQ data might be available)
window.addEventListener('vit:modules-ready', function() {
    if (typeof window.renderLeadDashboard === 'function') renderLeadDashboard();
});



// Strangler Fig
const _exports = {renderPlanIst,renderPlanUploadScreen,parsePlanFile,callFinanceKi,applyPlanKiResult,saveParsedPlan,saveManualPlan,renderPlanVergleich,buildPlanIstTable,showMonthDetail,editSelectedBwa,deleteBwa,loadVerkaufTracking,renderVerkaufFromDb,openVerkaufEntryModal,closeVtModal,loadAuswertung,renderAuswertung,saveVtEntry,getLeadData,getPerformanceColor,getPerformanceDot,renderLeadDashboard,showPlanAssistent,planAssistentNext,savePlanAssistent,downloadPlanVorlage,showPlanUploadForm};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[plan-ist.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
