function checkSession() { return typeof window.sbUser !== "undefined" && window.sbUser; }

/**
 * views/perf-cockpit.js - Performance Cockpit & Aktenschrank
 * @module views/perf-cockpit
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// === AKTENSCHRANK ===
var aktenFiles = {};
var aktenLoaded = false;

export async function loadAktenFiles() {
if(aktenLoaded) return;
try {
    var query = _sb().from('standort_dokumente').select('*').order('erstellt_am', {ascending:false});
    if(_sbProfile() && _sbProfile().standort_id && !_sbProfile().is_hq) query = query.eq('standort_id', _sbProfile().standort_id);
    var resp = await query;
    if(!resp.error && resp.data && resp.data.length > 0) {
        aktenFiles = {};
        (resp.data||[]).forEach(function(d) {
            var kat = d.kategorie || 'diverses';
            if(!aktenFiles[kat]) aktenFiles[kat] = [];
            aktenFiles[kat].push({
                id: d.id, name: d.titel || d.datei_name,
                type: (d.datei_name||'').split('.').pop().toUpperCase() || 'PDF',
                date: d.erstellt_am ? new Date(d.erstellt_am).toLocaleDateString('de-DE') : '',
                size: d.datei_groesse ? formatBytes(d.datei_groesse) : '',
                path: d.datei_url
            });
        });
        aktenLoaded = true;
    } else {
        // Fallback: no data yet
        aktenFiles = {
            vertraege: [], finanzen: [], personal: [],
            standort: [], marketing: [], lieferanten: [], diverses: []
        };
        aktenLoaded = true;
    }
} catch(err) { console.warn('Aktenschrank load:', err); }
}

var aktenFolderLabels = {
vertraege:'Vertraege & Recht', finanzen:'Finanzen & Buchhaltung', personal:'Personal & HR',
standort:'Standort & Betrieb', marketing:'Marketing & Branding', lieferanten:'Lieferanten & Einkauf', diverses:'Diverses'
};

export function getFileIcon(type) {
var colors = {PDF:'text-red-500',XLSX:'text-green-600',DOCX:'text-blue-600',ZIP:'text-yellow-600',JPG:'text-purple-500'};
return '<span class="font-mono text-xs font-bold px-2 py-1 rounded '+(colors[type]||'text-gray-500')+' bg-gray-100">'+type+'</span>';
}

export function openDokUploadModal() {
var html = '<div id="dokUpOverlay" onclick="closeDokUpModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:24px;width:480px;max-width:95vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-bold text-gray-800">\uD83D\uDCC4 Dokument hochladen</h3><button onclick="closeDokUpModal()" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>';
html += '<div class="space-y-3 mb-4">';
html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Titel *</label><input id="dokUpTitel" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="z.B. Richtlinie Preisgestaltung"></div>';
html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Kategorie</label><select id="dokUpKat" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="richtlinie">Richtlinie</option><option value="vorlage">Vorlage</option><option value="schulung">Schulung</option><option value="vertrag">Vertrag</option><option value="sonstiges">Sonstiges</option></select></div>';
html += '<div class="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center"><p class="text-sm text-gray-500 mb-2">Datei auswaehlen</p><input type="file" id="dokUpFile" class="text-sm"></div>';
html += '</div>';
html += '<div id="dokUpError" style="display:none" class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-3"></div>';
html += '<button onclick="saveDokUpload()" id="dokUpBtn" class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">Hochladen</button>';
html += '</div></div>';
var c = document.createElement('div'); c.id = 'dokUpContainer'; c.innerHTML = html; document.body.appendChild(c);
}
export function closeDokUpModal() { var c = document.getElementById('dokUpContainer'); if(c) c.remove(); }
export async function saveDokUpload() {
var titel = (document.getElementById('dokUpTitel')||{}).value;
var kat = (document.getElementById('dokUpKat')||{}).value||'sonstiges';
var fileInput = document.getElementById('dokUpFile');
var errEl = document.getElementById('dokUpError');
var btn = document.getElementById('dokUpBtn');
if(!titel||!titel.trim()) { if(errEl){errEl.textContent='Bitte Titel eingeben.';errEl.style.display='block';} return; }
if(!fileInput||!fileInput.files||!fileInput.files[0]) { if(errEl){errEl.textContent='Bitte Datei auswaehlen.';errEl.style.display='block';} return; }
if(btn){btn.disabled=true;btn.textContent=_t('ui_uploading');}
try {
    var file = fileInput.files[0];
    var path = 'netzwerk/'+kat+'/'+Date.now()+'_'+file.name;
    var upResp = await _sb().storage.from('dokumente').upload(path, file, {upsert:true});
    if(upResp.error) throw upResp.error;
    var urlResp = _sb().storage.from('dokumente').getPublicUrl(path);
    await _sb().from('netzwerk_dokumente').insert({
        titel:titel.trim(), kategorie:kat, datei_url:path, datei_name:file.name,
        datei_groesse:file.size, mime_type:file.type,
        erstellt_von:_sbUser() ?_sbUser().id:null
    });
    closeDokUpModal();
    alert('\u2705 Dokument hochgeladen!');
    loadNetzwerkDokumente();
} catch(err) {
    if(errEl){errEl.textContent='Fehler: '+err.message;errEl.style.display='block';}
    if(btn){btn.disabled=false;btn.textContent=_t('ui_upload');}
}
}

export async function openAktenFolder(folderId) {
if(!aktenLoaded) await loadAktenFiles();
var files = aktenFiles[folderId] || [];
document.getElementById('aktenFolderTitle').textContent = aktenFolderLabels[folderId] || folderId;
var html = '';
files.forEach(function(f) {
    html += '<tr class="border-b hover:bg-gray-50">';
    html += '<td class="py-3 px-4"><div class="flex items-center space-x-3">' + getFileIcon(f.type) + '<span class="font-medium text-gray-800">' + f.name + '</span></div></td>';
    html += '<td class="py-3 px-4 text-gray-500">' + f.type + '</td>';
    html += '<td class="py-3 px-4 text-gray-500">' + f.date + '</td>';
    html += '<td class="py-3 px-4 text-gray-500">' + f.size + '</td>';
    html += '<td class="py-3 px-4 text-right"><button class="text-vit-orange hover:underline text-sm font-semibold mr-3">Oeffnen</button><button class="text-gray-400 hover:text-red-500 text-sm">Loeschen</button></td>';
    html += '</tr>';
});
document.getElementById('aktenFileList').innerHTML = html;
document.getElementById('aktenFolders').style.display = 'none';
document.getElementById('aktenFolderDetail').classList.remove('hidden');
}

export function closeAktenFolder() {
document.getElementById('aktenFolders').style.display = '';
document.getElementById('aktenFolderDetail').classList.add('hidden');
}

export function filterAkten() {
var q = document.getElementById('aktenSearch').value.toLowerCase();
document.querySelectorAll('.akten-folder').forEach(function(f) {
    var text = f.textContent.toLowerCase();
    f.style.display = text.indexOf(q) >= 0 ? '' : 'none';
});
}

// Init verkauf - DB loading happens on tab switch after login
renderPipeline();

// Check for existing Supabase session
checkSession();


// === PERFORMANCE COCKPIT ===
var cockpitMonth = null;

export function generateDemoBwaData() {
var currentYear = new Date().getFullYear();
var currentMonth = new Date().getMonth() + 1;
var bwas = [];
var vjBwas = [];
var baseUmsatz = [68000, 72000, 85000, 91000, 98000, 105000, 95000, 88000, 92000, 99000, 78000, 110000];
for (var m = 1; m <= Math.min(currentMonth, 12); m++) {
    var u = baseUmsatz[m-1] + Math.round((Math.random()-0.5)*8000);
    var we = Math.round(u * 0.58);
    var roh = u - we;
    var pk = Math.round(u * 0.18);
    var sk = Math.round(u * 0.12);
    var gk = pk + sk;
    var erg = roh - gk;
    bwas.push({
        id: 'demo-bwa-' + m,
        standort_id: 'demo',
        monat: m, jahr: currentYear,
        umsatzerloese: u,
        wareneinsatz: we,
        rohertrag: roh,
        personalkosten: pk,
        raumkosten: Math.round(u * 0.04),
        werbekosten: Math.round(u * 0.02),
        kfzkosten: Math.round(u * 0.015),
        abschreibungen: 1200,
        sonstige_kosten: Math.round(u * 0.03),
        gesamtkosten: gk,
        betriebsergebnis: erg,
        ergebnis_vor_steuern: erg - 400,
        rohertrag_prozent: Math.round(roh / u * 1000) / 10,
        personalkosten_prozent: Math.round(pk / u * 1000) / 10,
        created_at: new Date().toISOString()
    });
    // Vorjahr etwas niedriger
    var vu = Math.round(u * 0.92);
    var vwe = Math.round(vu * 0.6);
    var vroh = vu - vwe;
    var vpk = Math.round(vu * 0.19);
    var vsk = Math.round(vu * 0.13);
    var vgk = vpk + vsk;
    var verg = vroh - vgk;
    vjBwas.push({
        id: 'demo-vj-bwa-' + m,
        standort_id: 'demo',
        monat: m, jahr: currentYear - 1,
        umsatzerloese: vu,
        wareneinsatz: vwe,
        rohertrag: vroh,
        personalkosten: vpk,
        gesamtkosten: vgk,
        betriebsergebnis: verg,
        ergebnis_vor_steuern: verg - 350,
        rohertrag_prozent: Math.round(vroh / vu * 1000) / 10,
        personalkosten_prozent: Math.round(vpk / vu * 1000) / 10,
        created_at: new Date().toISOString()
    });
}
return { bwas: bwas, vjBwas: vjBwas };
}

export async function renderPerformanceCockpit() {
var el = document.getElementById('cockpitContent');
if(!el) return;
el.innerHTML = '<p class="text-sm text-gray-400 text-center py-8 animate-pulse">Lade Cockpit-Daten...</p>';

var useDemo = isDemoMode || (_sbProfile() && (_sbProfile().status === 'demo' || _sbProfile().status === 'demo_active'));
var stdId = _sbProfile() ? _sbProfile().standort_id : null;
console.log('[Cockpit] renderPerformanceCockpit() called, stdId:', stdId, 'demo:', useDemo);
var stdName = useDemo ? 'Muster-Filiale' : (_sbProfile() ? (_sbProfile().standort_name || _sbProfile().name || 'Mein Standort') : 'Mein Standort');
var currentYear = new Date().getFullYear();
var pn = function(v) { return parseFloat(v) || 0; };
var mLabels = {1:'Jan',2:'Feb',3:'Mär',4:'Apr',5:'Mai',6:'Jun',7:'Jul',8:'Aug',9:'Sep',10:'Okt',11:'Nov',12:'Dez'};

try {
    var bwas, vjBwas;
    if (useDemo) {
        var demoData = generateDemoBwaData();
        bwas = demoData.bwas;
        vjBwas = demoData.vjBwas;
    } else {
        // Load BWAs for current + previous year
        var bwaResp = await _sb().from('bwa_daten').select('*').eq('standort_id', stdId).eq('jahr', currentYear).order('monat');
        bwas = (bwaResp.data || []);
        var vjResp = await _sb().from('bwa_daten').select('*').eq('standort_id', stdId).eq('jahr', currentYear - 1).order('monat');
        vjBwas = (vjResp.data || []);
    }

    if(bwas.length === 0) {
        el.innerHTML = '<div class="text-center py-12"><p class="text-4xl mb-3">📊</p><p class="text-gray-500">Noch keine BWA-Daten für ' + currentYear + ' vorhanden.</p><p class="text-sm text-gray-400 mt-2">Lade eine BWA hoch, um das Performance Cockpit zu aktivieren.</p><button onclick="showControllingTab(\'bwa\')" class="mt-4 px-4 py-2 bg-vit-orange text-white rounded-lg text-sm hover:opacity-90">BWA hochladen →</button></div>';
        return;
    }

    // Find latest month or selected month
    var latestMonth = cockpitMonth || Math.max.apply(null, bwas.map(function(b) { return b.monat; }));
    var bwa = bwas.find(function(b) { return b.monat === latestMonth; });
    var vjBwa = vjBwas.find(function(b) { return b.monat === latestMonth; });

    if(!bwa) { el.innerHTML = '<p class="text-sm text-gray-400 text-center py-8">Keine Daten für gewählten Monat.</p>'; return; }

    // Correct values from detail positions if available (skip in demo)
    if (!useDemo) {
    var detCockpit = await _sb().from('bwa_detail_positionen').select('zeile,wert').eq('bwa_id', bwa.id).eq('ist_summenzeile', true).in('zeile', [1000,1040,1260,1300,1355]);
    if(detCockpit.data && detCockpit.data.length > 0) {
        var dm = {}; detCockpit.data.forEach(function(d){ dm[d.zeile] = pn(d.wert); });
        if(dm[1000]) bwa.umsatzerloese = dm[1000];
        if(dm[1040]) bwa.rohertrag = dm[1040];
        if(dm[1260]) bwa.gesamtkosten = dm[1260];
        if(dm[1355]) bwa.ergebnis_vor_steuern = dm[1355];
        else if(dm[1300]) bwa.ergebnis_vor_steuern = dm[1300];
    }
    }

    // Extract values
    var umsatz = pn(bwa.umsatzerloese);
    var rohertrag = pn(bwa.rohertrag);
    var marge = umsatz ? (rohertrag / umsatz * 100) : 0;
    var gesamtkosten = pn(bwa.gesamtkosten);
    var betriebsergebnis = pn(bwa.betriebsergebnis || bwa.ergebnis_vor_steuern);
    var ergebnis = pn(bwa.ergebnis_vor_steuern);
    var personal = pn(bwa.personalkosten);
    var raum = pn(bwa.raumkosten);
    var werbe = pn(bwa.werbekosten);
    var sonstige = pn(bwa.sonstige_kosten) + pn(bwa.abschreibungen) + pn(bwa.kosten_warenabgabe);
    var ebitMarge = umsatz ? (ergebnis / umsatz * 100) : null;
    var kostenquote = umsatz ? (Math.abs(gesamtkosten) / umsatz * 100) : null;

    // Plan values
    var planUmsatz = pn(bwa.plan_umsatz);
    var planRohertrag = pn(bwa.plan_rohertrag);
    var planErgebnis = pn(bwa.plan_ergebnis);

    // YTD
    var ytdUmsatz = 0, ytdVjUmsatz = 0;
    bwas.forEach(function(b) { ytdUmsatz += pn(b.umsatzerloese); });
    vjBwas.forEach(function(b) { if(b.monat <= latestMonth) ytdVjUmsatz += pn(b.umsatzerloese); });
    var ytdUmsatzVjPct = ytdVjUmsatz ? (ytdUmsatz / ytdVjUmsatz * 100) : null;

    var vjEbitMarge = (vjBwa && pn(vjBwa.umsatzerloese)) ? (pn(vjBwa.ergebnis_vor_steuern) / pn(vjBwa.umsatzerloese) * 100) : null;
    var ebitMargeDelta = (ebitMarge !== null && vjEbitMarge !== null) ? (ebitMarge - vjEbitMarge) : null;

    // Marketing
    var mktUmsatzPct = (umsatz && werbe) ? (Math.abs(werbe) / umsatz * 100) : null;

    // Build HTML
    var h = '';

    // Header
    h += '<div class="flex items-center justify-between mb-6">';
    h += '<div class="flex items-center space-x-3"><h2 class="text-lg font-bold text-vit-orange">Performance Cockpit</h2>';
    h += '<span class="text-sm text-gray-500">' + stdName + ' | ' + currentYear + '</span></div>';
    h += '<select id="cockpitMonthSel" onchange="cockpitMonth=parseInt(this.value);renderPerformanceCockpit()" class="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">';
    for(var mm = 1; mm <= 12; mm++) {
        var hasBwa = bwas.some(function(b){ return b.monat===mm; });
        h += '<option value="'+mm+'"'+(mm===latestMonth?' selected':'')+(hasBwa?'':' disabled')+'>'+mLabels[mm]+(hasBwa?'':' (leer)')+'</option>';
    }
    h += '</select></div>';

    // KPI Cards
    var vjUmsatz = vjBwa ? pn(vjBwa.umsatzerloese) : null;
    var vjMarge = vjBwa && pn(vjBwa.umsatzerloese) ? (pn(vjBwa.rohertrag) / pn(vjBwa.umsatzerloese) * 100) : null;
    var umsatzDelta = vjUmsatz ? ((umsatz - vjUmsatz) / vjUmsatz * 100) : null;

    function kpiCard(label, value, suffix, delta, deltaLabel, color) {
        var c = color || 'text-gray-800';
        var dStr = '';
        if(delta !== null && delta !== undefined) {
            var dColor = delta >= 0 ? 'text-green-600' : 'text-red-500';
            dStr = '<p class="text-xs mt-1 '+dColor+'">'+(delta>=0?'▲':'▼')+' '+Math.abs(delta).toFixed(1)+(deltaLabel||'')+'</p>';
        }
        return '<div class="vit-card p-4 text-center"><p class="text-xs text-gray-500 mb-1">'+label+'</p><p class="text-xl font-bold '+c+'">'+value+(suffix||'')+'</p>'+dStr+'</div>';
    }

    h += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">';
    h += kpiCard('Umsatz', umsatz.toLocaleString('de-DE'), ' €', umsatzDelta, '% vs VJ');
    h += kpiCard('Rohertrag', rohertrag.toLocaleString('de-DE'), ' €', null, null);
    h += kpiCard('Marge', marge.toFixed(1), '%', vjMarge !== null ? (marge - vjMarge) : null, ' Pp vs VJ', marge >= 35 ? 'text-green-600' : 'text-orange-500');
    h += kpiCard('Gesamtkosten', Math.abs(gesamtkosten).toLocaleString('de-DE'), ' €', null, null);
    h += kpiCard('Ergebnis', ergebnis.toLocaleString('de-DE'), ' €', null, null, ergebnis >= 0 ? 'text-green-600' : 'text-red-600');
    h += kpiCard('EBIT-Marge', ebitMarge !== null ? ebitMarge.toFixed(1) : '—', '%', ebitMargeDelta, ' Pp vs VJ', ebitMarge >= 0 ? 'text-green-600' : 'text-red-500');
    h += kpiCard('Kostenquote', kostenquote !== null ? kostenquote.toFixed(1) : '—', '%', null, null, kostenquote <= 100 ? 'text-blue-600' : 'text-red-500');
    h += kpiCard('YTD Umsatz', ytdUmsatz.toLocaleString('de-DE'), ' €', ytdUmsatzVjPct ? (ytdUmsatzVjPct - 100) : null, '% vs VJ');
    h += '</div>';

    // Plan vs Ist bars
    if(planUmsatz || planRohertrag || planErgebnis) {
        h += '<div class="vit-card p-5 mb-6"><h3 class="font-bold text-gray-800 mb-4">Plan vs. Ist</h3>';
        h += '<div class="space-y-4">';
        function planBar(label, ist, plan) {
            if(!plan) return '';
            var pct = Math.min(Math.round(ist / plan * 100), 150);
            var color = pct >= 100 ? 'bg-green-500' : pct >= 80 ? 'bg-yellow-400' : 'bg-red-400';
            return '<div><div class="flex justify-between text-sm mb-1"><span class="text-gray-600">'+label+'</span><span class="font-semibold">'+pct+'%</span></div><div class="w-full bg-gray-100 rounded-full h-3"><div class="'+color+' h-3 rounded-full transition-all" style="width:'+Math.min(pct,100)+'%"></div></div><div class="flex justify-between text-xs text-gray-400 mt-1"><span>Ist: '+ist.toLocaleString('de-DE')+' €</span><span>Plan: '+plan.toLocaleString('de-DE')+' €</span></div></div>';
        }
        h += planBar('Umsatz', umsatz, planUmsatz);
        h += planBar('Rohertrag', rohertrag, planRohertrag);
        h += planBar('Ergebnis', ergebnis, planErgebnis);
        h += '</div></div>';
    }

    // Kostenstruktur
    h += '<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">';
    h += '<div class="vit-card p-5"><h3 class="font-bold text-gray-800 mb-4">Kostenstruktur</h3>';
    var totalK = Math.abs(personal) + Math.abs(raum) + Math.abs(werbe) + Math.abs(sonstige);
    function kostenBar(label, val, color) {
        var pct = totalK ? (Math.abs(val) / totalK * 100) : 0;
        return '<div class="flex items-center gap-3 mb-3"><span class="text-xs text-gray-500 w-24">'+label+'</span><div class="flex-1 bg-gray-100 rounded-full h-2.5"><div class="'+color+' h-2.5 rounded-full" style="width:'+pct+'%"></div></div><span class="text-xs font-semibold text-gray-600 w-20 text-right">'+Math.abs(val).toLocaleString('de-DE')+' €</span></div>';
    }
    h += kostenBar('Personal', personal, 'bg-blue-500');
    h += kostenBar('Raum', raum, 'bg-purple-500');
    h += kostenBar('Werbung', werbe, 'bg-orange-500');
    h += kostenBar('Sonstige', sonstige, 'bg-gray-400');
    h += '</div>';

    // Monatsvergleich Trend
    h += '<div class="vit-card p-5"><h3 class="font-bold text-gray-800 mb-4">Umsatz-Trend ' + currentYear + '</h3>';
    if(bwas.length >= 2) {
        var maxU = Math.max.apply(null, bwas.map(function(b){ return pn(b.umsatzerloese); }));
        h += '<div class="flex items-end gap-2 h-32">';
        bwas.forEach(function(b) {
            var pct = maxU ? (pn(b.umsatzerloese) / maxU * 100) : 0;
            var isSelected = b.monat === latestMonth;
            h += '<div class="flex-1 flex flex-col items-center">';
            h += '<span class="text-[9px] text-gray-500 mb-1">'+pn(b.umsatzerloese).toLocaleString('de-DE')+'</span>';
            h += '<div class="w-full '+(isSelected?'bg-vit-orange':'bg-gray-300')+' rounded-t" style="height:'+Math.max(pct,5)+'%"></div>';
            h += '<span class="text-[10px] text-gray-400 mt-1">'+mLabels[b.monat]+'</span></div>';
        });
        h += '</div>';
    } else {
        h += '<p class="text-sm text-gray-400 text-center py-4">Mindestens 2 Monate für Trend nötig.</p>';
    }
    h += '</div></div>';

    // Marketing KPI + Benchmark (coming soon)
    h += '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">';
    h += '<div class="vit-card p-5"><h3 class="font-bold text-gray-800 mb-3">Marketing-Kennzahlen</h3>';
    h += '<div class="space-y-3">';
    h += '<div class="flex justify-between text-sm"><span class="text-gray-500">Werbekosten</span><span class="font-semibold">'+Math.abs(werbe).toLocaleString('de-DE')+' €</span></div>';
    h += '<div class="flex justify-between text-sm"><span class="text-gray-500">% vom Umsatz</span><span class="font-semibold '+(mktUmsatzPct && mktUmsatzPct <= 5 ? 'text-green-600' : 'text-orange-500')+'">'+(mktUmsatzPct ? mktUmsatzPct.toFixed(1) : '—')+'%</span></div>';
    h += '</div></div>';
    h += '<div class="vit-card p-5 opacity-50"><h3 class="font-bold text-gray-800 mb-3">🔒 Netzwerk-Benchmark</h3>';
    h += '<p class="text-sm text-gray-400 py-4 text-center">Verfügbar sobald Netzwerk-Daten aggregiert werden.</p></div>';
    h += '</div>';

    el.innerHTML = h;
} catch(err) {
    console.error('[COCKPIT]', err);
    el.innerHTML = '<div class="text-center py-8"><p class="text-red-400 text-sm">Fehler beim Laden: ' + err.message + '</p><button onclick="renderPerformanceCockpit()" class="mt-2 text-sm text-vit-orange underline">Erneut versuchen</button></div>';
}
}

// Hook HQ views into showView
var origShowView2 = showView;
showView = function(v) {
// Rechteprüfung
if(!hasAccess(v)) {
    alert('Kein Zugriff auf diesen Bereich mit deiner aktuellen Rolle.');
    return;
}
// Redirect 'home' to HQ Cockpit when in HQ mode
if(v==='home' && currentRole==='hq') { v='hqCockpit'; }
if(v==='home' && SESSION.account_level==='extern') { v='externHome'; }
if(v==='hqIdeen') { v='entwicklung'; showView('entwicklung'); return; }
origShowView2(v);
if(v==='externHome') renderExternHome();
if(v==='onboarding') renderOnboardingView();
if(v==='hqOnboarding') renderHqOnboarding();
if(v==='hqCockpit') renderHqCockpit();
if(v==='hqStandorte') renderHqStandorte();
if(v==='hqFinanzen') renderHqFinanzen();
if(v==='hqMarketing') { renderHqMarketing(); showHqMktTab('uebersicht'); }
if(v==='allgemein') { loadAllgemeinData().then(function(){ showAllgemeinTab('uebersicht'); }); }
if(v==='home') { loadDashboardWidgets(); loadAllgemeinData(); }
if(v==='einkauf') { showEinkaufTab('sortiment'); }
if(v==='hqAllgemein') { renderHqAllgemein(hqStandorte, [], [], []); }
if(v==='hqEinkauf') { showHqEkTab('dash'); }
if(v==='hqVerkauf') renderHqVerkauf();
if(v==='hqAktionen') renderHqAktionen();
if(v==='hqKomm'){showView('hqKommando');showKommandoTab('kommunikation');return;}
if(v==='hqKampagnen'){showView('hqKommando');showKommandoTab('kampagnen');return;}
if(v==='hqDokumente'){showView('hqKommando');showKommandoTab('dokumente');return;}
if(v==='hqKalender'){showView('hqKommando');showKommandoTab('kalender');return;}
if(v==='hqAufgaben'){showView('hqKommando');showKommandoTab('aufgaben');return;}
if(v==='hqAuswertung') renderHqAuswertung();
if(v==='hqWissen') renderHqWissen();
if(v==='hqSupport') renderHqSupport();
if(v==='hqShop') renderHqShop();
if(v==='hqBilling') { initBillingModule(); showBillingTab('overview'); }
if(v==='hqBillingDetail') { /* opened via showBillingInvoice() */ }
if(v==='standortBilling') { initStandortBilling(); showStBillingTab('invoices'); }
if(v==='hqEinstellungen') renderHqEinstellungen();
if(v==='mitarbeiter') renderPartnerMitarbeiter();
if(v==='hqKommando') renderKommandozentrale();
if(v==='kalender') loadKalTermine();
if(v==='todo') loadTodos();
if(v==='notifications') renderNotifications('all');
// Auto-Loading for Standort-Views
if(v==='controlling') { showControllingTab('cockpit'); renderPerformanceCockpit(); loadBwaList(); }
if(v==='verkauf') { showVerkaufTab('pipeline'); }
if(v==='kommunikation') { showKommTab('chat'); }
if(v==='aktenschrank') { loadAktenFiles(); }
if(v==='devStatus') { showView('entwicklung'); setTimeout(function(){showEntwicklungTab('module')},50); return; }
};



// Strangler Fig
const _exports = {loadAktenFiles,getFileIcon,openDokUploadModal,closeDokUpModal,saveDokUpload,openAktenFolder,closeAktenFolder,filterAkten,generateDemoBwaData,renderPerformanceCockpit,kpiCard,planBar,kostenBar};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[perf-cockpit.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
