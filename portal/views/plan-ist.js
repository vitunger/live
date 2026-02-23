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

export async function renderPlanIst() {
    var el = document.getElementById('planIstContent');
    if(!el) return;

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
    h += '<div class="text-center py-8">';
    h += '<div class="max-w-lg mx-auto">';
    h += '<div class="text-6xl mb-4">📋</div>';
    h += '<h2 class="text-xl font-bold text-gray-800 mb-2">Jahresplan '+planIstYear+' hochladen</h2>';
    h += '<p class="text-sm text-gray-500 mb-6">Um den Plan/Ist-Vergleich nutzen zu können, lade zuerst deinen Jahresplan als Excel-Datei hoch. Das Portal liest die monatlichen Plan-Werte automatisch aus.</p>';
    h += '<div class="vit-card p-6 text-left">';
    h += '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Schritt 1: Plan-Datei hochladen</p>';
    h += '<div class="p-4 border-2 border-dashed border-vit-orange/40 rounded-lg bg-orange-50/50 mb-4">';
    h += '<p class="text-xs text-gray-500 mb-2">Erwartetes Format: Excel oder PDF mit Monatszeilen und Spalten für Umsatz, Wareneinsatz, Personalkosten, etc.</p>';
    h += '<input type="file" id="planFileInput" accept=".xlsx,.xls,.csv,.pdf" class="text-xs" onchange="document.getElementById(\'planParseBtn\').disabled=!this.files.length">';
    h += '</div>';
    h += '<button id="planParseBtn" onclick="parsePlanFile()" disabled class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed mb-3">📊 Plan auslesen & speichern</button>';
    h += '<div id="planParseStatus" class="hidden"></div>';
    h += '<div id="planParseResult" class="hidden"></div>';
    h += '</div>';
    // Manual entry option
    h += '<details class="vit-card p-6 text-left mt-4"><summary class="text-xs font-semibold text-gray-500 cursor-pointer">Alternativ: Plan manuell eingeben</summary>';
    h += '<div class="mt-4 space-y-2">';
    var mNamen = ['','Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    for(var m=1;m<=12;m++) {
        h += '<div class="flex items-center space-x-2"><label class="text-xs text-gray-600 w-24 flex-shrink-0">'+mNamen[m]+'</label>';
        h += '<input id="planM_umsatz_'+m+'" type="number" placeholder="Umsatz" class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs text-right">';
        h += '<input id="planM_we_'+m+'" type="number" placeholder="Wareneins." class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs text-right">';
        h += '<input id="planM_pk_'+m+'" type="number" placeholder="Personal" class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs text-right">';
        h += '<input id="planM_rk_'+m+'" type="number" placeholder="Raum" class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs text-right">';
        h += '</div>';
    }
    h += '<button onclick="saveManualPlan()" class="w-full mt-3 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">Plan speichern</button>';
    h += '</div></details>';
    h += '</div></div>';
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

    // PDF → direkt KI-Analyse
    if(isPdf) {
        if(statusEl) statusEl.innerHTML = '<div class="flex items-center space-x-2 mt-2"><div class="w-4 h-4 border-2 border-vit-orange border-t-transparent rounded-full animate-spin"></div><span class="text-xs text-gray-600">🤖 PDF wird mit KI analysiert...</span></div>';
        try {
            var reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    var base64 = e.target.result.split(',')[1];
                    var kiResult = await callFinanceKi('jahresplan', base64, 'application/pdf', null, {jahr: planIstYear});
                    applyPlanKiResult(kiResult, statusEl, resultEl);
                } catch(err) {
                    if(statusEl) statusEl.innerHTML = '<p class="text-xs text-red-600 mt-2">❌ KI-Analyse fehlgeschlagen: ' + _escH(err.message||'Unbekannt') + '</p>';
                }
            };
            reader.readAsDataURL(file);
        } catch(pdfErr) {
            if(statusEl) statusEl.innerHTML = '<p class="text-xs text-red-600 mt-2">❌ Fehler: ' + _escH(pdfErr.message||pdfErr) + '</p>';
        }
        return;
    }

    if(statusEl) statusEl.innerHTML = '<div class="flex items-center space-x-2 mt-2"><div class="w-4 h-4 border-2 border-vit-orange border-t-transparent rounded-full animate-spin"></div><span class="text-xs text-gray-600">Excel wird analysiert...</span></div>';

    // Try BwaParser first for structured Planung files
    if (typeof BwaParser === 'undefined' && typeof window.BwaParser !== 'undefined') { var BwaParser = window.BwaParser; }
    BwaParser.parseFile(file, async function(err, result) {
        if(err) {
            // KI-Fallback bei Parse-Fehler
            if(statusEl) statusEl.innerHTML = '<div class="flex items-center space-x-2 mt-2"><div class="w-4 h-4 border-2 border-vit-orange border-t-transparent rounded-full animate-spin"></div><span class="text-xs text-gray-600">🤖 Parser fehlgeschlagen – KI-Analyse...</span></div>';
            try {
                var arrayBuf = await file.arrayBuffer();
                var wb = XLSX.read(arrayBuf, { type: 'array' });
                var rawText = cleanCsvForKi(wb);
                var kiResult = await callFinanceKi('jahresplan', null, null, rawText.substring(0, 15000), {jahr: planIstYear});
                applyPlanKiResult(kiResult, statusEl, resultEl);
            } catch(kiErr) {
                if(statusEl) statusEl.innerHTML = '<p class="text-xs text-red-600 mt-2">❌ Auch KI-Analyse fehlgeschlagen: ' + _escH(kiErr.message||kiErr) + '</p>';
            }
            return;
        }

        var planMonths = {};
        var meta = result.meta;

        // If it's a structured Planung file with plan_bwa data
        if(result.plan_bwa && result.plan_bwa.length > 0) {
            var mn = ['jan','feb','mrz','apr','mai','jun','jul','aug','sep','okt','nov','dez'];
            // Find key BWA rows
            var umsatzRow = result.plan_bwa.find(function(r) { return r.kontengruppe && r.kontengruppe.includes('Umsatzerlöse') && !r.konto; }) 
                || result.plan_bwa.find(function(r) { return r.bezeichnung && r.bezeichnung.toLowerCase().includes('umsatzerlöse'); });
            var weRow = result.plan_bwa.find(function(r) { return r.kontengruppe && (r.kontengruppe.includes('Wareneinsatz') || r.kontengruppe.includes('Materialaufwand')); });
            var pkRow = result.plan_bwa.find(function(r) { return r.kontengruppe && r.kontengruppe.includes('Personalkosten'); });
            var rkRow = result.plan_bwa.find(function(r) { return r.kontengruppe && r.kontengruppe.includes('Raumkosten'); });
            
            for(var m=0; m<12; m++) {
                var mKey = mn[m];
                planMonths[m+1] = {
                    monat: m+1,
                    umsatz: umsatzRow ? (umsatzRow[mKey]||0) : 0,
                    wareneinsatz: weRow ? (weRow[mKey]||0) : 0,
                    personalkosten: pkRow ? (pkRow[mKey]||0) : 0,
                    raumkosten: rkRow ? (rkRow[mKey]||0) : 0
                };
                // Calculate rohertrag + ergebnis
                var pm = planMonths[m+1];
                pm.rohertrag = pm.umsatz + pm.wareneinsatz;
                pm.ergebnis = pm.rohertrag + pm.personalkosten + pm.raumkosten;
            }
            if(statusEl) statusEl.innerHTML = '<p class="text-xs text-green-600 mt-2">✅ Planung erkannt! ('+result.plan_bwa.length+' Konten, Format: '+meta.format+')</p>';
        } 
        // Fallback: old parsing logic for simple plan files
        else {
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
                if(statusEl) statusEl.innerHTML = '<p class="text-xs text-green-600 mt-2">✅ '+Object.keys(planMonths).length+' Monate erkannt!</p>';
            } catch(e2) {
                if(statusEl) statusEl.innerHTML = '<p class="text-xs text-red-600 mt-2">❌ Fehler: '+(e2.message||e2)+'</p>';
                return;
            }
        }

        var count = Object.keys(planMonths).length;
        if(count < 1) {
            if(statusEl) statusEl.innerHTML = '<p class="text-xs text-red-600 mt-2">❌ Keine Monatsdaten erkannt. Bitte prüfe das Format deiner Excel-Datei.</p>';
            return;
        }

        // Show preview
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

        // Store for saving
        window._parsedPlanMonths = planMonths;
    });
}

// Shared KI-Finance helper
export async function callFinanceKi(type, fileBase64, mediaType, rawText, meta) {
    var session = await _sb().auth.getSession();
    var token = session?.data?.session?.access_token;
    var payload = { type: type };
    if(fileBase64) { payload.file_base64 = fileBase64; payload.media_type = mediaType || 'application/pdf'; }
    if(rawText) { payload.raw_text = rawText; }
    if(meta) { payload.meta = meta; }
    var resp = await fetch(SUPABASE_URL + '/functions/v1/analyze-finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token||''), 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify(payload)
    });
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
    h += '<button onclick="currentPlan=null;renderPlanIst()" class="text-xs text-vit-orange font-semibold hover:underline">📄 Neuen Plan hochladen</button>';
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
    h += '<thead><tr class="bg-gray-50"><th class="text-left py-2.5 px-3 font-semibold text-gray-600">Monat</th><th class="text-right py-2.5 px-3 font-semibold text-blue-600">Plan Umsatz</th><th class="text-right py-2.5 px-3 font-semibold text-vit-orange">Ist Umsatz</th><th class="text-right py-2.5 px-3 font-semibold text-gray-600">Abweichung</th><th class="text-right py-2.5 px-3 font-semibold text-gray-600">Erfüllung</th><th class="text-center py-2.5 px-3 font-semibold text-gray-600">Status</th></tr></thead>';
    h += '<tbody>';
    var sumPlan=0,sumIst=0;
    for(var m=1;m<=12;m++) {
        var p = plan[String(m)] || plan[m] || {};
        var b = bwaByMonth[m];
        var pu = p.umsatz || 0;
        var iu = b ? (parseFloat(b.umsatzerloese)||0) : 0;
        sumPlan += pu; sumIst += iu;
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
        h += '<td class="text-right py-2.5 px-3 '+(hasBwa?(diff>=0?'text-green-600 font-semibold':'text-red-600 font-semibold'):'')+'">'+( hasBwa ? (diff>=0?'+':'')+diff.toLocaleString('de-DE') : '—')+'</td>';
        h += '<td class="text-right py-2.5 px-3 '+(hasBwa?(pct>=100?'text-green-600 font-bold':'text-red-600 font-bold'):'')+'">'+( hasBwa ? pct+'%' : '—')+'</td>';
        h += '<td class="text-center py-2.5 px-3">'+status+'</td>';
        h += '</tr>';
    }
    var totalDiff = sumIst-sumPlan; var totalPct = sumPlan?Math.round(sumIst/sumPlan*100):0;
    h += '<tr class="bg-gray-100 border-t-2"><td class="py-3 px-3 font-bold">GESAMT '+planIstYear+'</td>';
    h += '<td class="text-right py-3 px-3 font-bold text-blue-600">'+sumPlan.toLocaleString('de-DE')+'</td>';
    h += '<td class="text-right py-3 px-3 font-bold text-vit-orange">'+sumIst.toLocaleString('de-DE')+'</td>';
    h += '<td class="text-right py-3 px-3 font-bold '+(totalDiff>=0?'text-green-600':'text-red-600')+'">'+(totalDiff>=0?'+':'')+totalDiff.toLocaleString('de-DE')+'</td>';
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
        var gesamt = (entry.geplant||0) + (entry.spontan||0) + (entry.online||0) + (entry.ergo||0);
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
                var q = _sb().from('users').select('vorname, nachname, name').eq('status', 'aktiv');
                if(stdId && !_sbProfile().is_hq) q = q.eq('standort_id', stdId);
                var r = await q.order('name');
                if(r.data && r.data.length) {
                    var sel = document.getElementById('vtSeller');
                    if(sel) { sel.innerHTML = ''; r.data.forEach(function(p){ var nm = (p.vorname && p.nachname) ? (p.vorname+' '+p.nachname) : (p.name||'?'); var o=document.createElement('option'); o.value=nm; o.textContent=nm; if(nm===currentUser) o.selected=true; sel.appendChild(o); }); }
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
        var ges = (d.geplant||0)+(d.spontan||0)+(d.online||0)+(d.ergo||0);
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

    if(btn) { btn.disabled=true; btn.textContent='Wird gespeichert...'; }
    try {
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var data = {
            standort_id: stdId,
            datum: datum,
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
        var resp = await _sb().from('verkauf_tracking').upsert(data, {onConflict:'standort_id,datum,verkaeufer_name'}).select();
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
const _exports = {renderPlanIst,renderPlanUploadScreen,parsePlanFile,callFinanceKi,applyPlanKiResult,saveParsedPlan,saveManualPlan,renderPlanVergleich,buildPlanIstTable,showMonthDetail,editSelectedBwa,deleteBwa,loadVerkaufTracking,renderVerkaufFromDb,openVerkaufEntryModal,closeVtModal,loadAuswertung,renderAuswertung,saveVtEntry,getLeadData,getPerformanceColor,getPerformanceDot,renderLeadDashboard};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[plan-ist.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
