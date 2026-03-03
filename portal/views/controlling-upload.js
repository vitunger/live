/**
 * views/controlling-upload.js - BWA Upload Modal, Parse, Batch, KI-Fallback
 *
 * Sub-module of controlling.js (Orchestrator).
 * Exports: openBwaUploadModal, handleBwaFileSelect, parseBwaWithAI, parseBwaBatch,
 *          parseSingleBwaFileWithRetry, cleanCsvForKi, parseSingleBwaFile
 *
 * @module views/controlling-upload
 */
function _sb()        { return window.sb; }
function _sbUser()    { return window.sbUser; }
function _sbProfile() { return window.sbProfile; }
function _escH(s)     { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)        { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t){ if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)     { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _el(id)      { return document.getElementById(id); }
function _setTxt(id,v){ var e=_el(id); if(e) e.textContent=v; }
function _setDisp(id,v){ var e=_el(id); if(e) e.style.display=v; }

// Local duplicate (race-condition-safe)
var monatNamen = ['','Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

export function openBwaUploadModal() {
    var stdId = _sbProfile() ? _sbProfile().standort_id : null;
    var now = new Date();
    var _mn = (typeof monatNamen !== 'undefined') ? monatNamen : ['','Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    var html = '<div id="bwaUploadOverlay" onclick="closeBwaUploadModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
    html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:24px;width:600px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
    html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-bold text-gray-800">\u{1F4CA} BWA erfassen</h3><button onclick="closeBwaUploadModal()" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>';

    // AI Upload Section FIRST
    html += '<div class="mb-4 p-4 border-2 border-dashed border-vit-orange/40 rounded-lg bg-orange-50/50">';
    html += '<div class="flex items-center space-x-2 mb-2"><span class="text-lg">\u{1F916}</span><p class="text-sm font-semibold text-gray-800">BWA-Datei hochladen \u2013 KI liest Werte automatisch</p></div>';
    html += '<p class="text-xs text-gray-500 mb-3">Lade deine BWA als Excel (.xlsx/.xls/.csv) oder PDF hoch. Die KI erkennt Monat, Jahr und alle Kennzahlen automatisch.</p>';
    html += '<div class="flex items-center space-x-3">';
    html += '<input type="file" id="bwaFileInput" accept=".pdf,.xlsx,.xls,.csv" multiple class="text-xs flex-1" onchange="handleBwaFileSelect(this)">';
    html += '<button id="bwaParseBtn" onclick="parseBwaWithAI()" disabled class="px-4 py-2 bg-vit-orange text-white rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">\u{1F916} Auslesen</button>';
    html += '</div>';
    html += '<div id="bwaAiStatus" class="mt-2 hidden"><div class="flex items-center space-x-2"><div class="w-4 h-4 border-2 border-vit-orange border-t-transparent rounded-full animate-spin"></div><span class="text-xs text-gray-600" id="bwaAiStatusText">KI analysiert Datei...</span></div></div>';
    html += '<div id="bwaAiResult" class="mt-2 hidden"></div>';
    html += '</div>';

    // Month/Year AFTER upload (auto-filled by KI)
    html += '<div class="grid grid-cols-2 gap-3 mb-4">';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Monat</label><select id="bwaMonth" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">';
    for(var m=1;m<=12;m++) html += '<option value="'+m+'"'+(m===(now.getMonth())?' selected':'')+'>'+_mn[m]+'</option>';
    html += '</select></div>';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Jahr</label><select id="bwaYear" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">';
    for(var y=2026;y>=2023;y--) html += '<option value="'+y+'">'+y+'</option>';
    html += '</select></div></div>';

    // Data entry
    html += '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Kennzahlen <span class="text-gray-400 font-normal">(werden automatisch bef\u00fcllt oder manuell eingeben)</span></p>';
    var fields = [
        {id:'bwaF_umsatz',label:'Umsatzerloese',ph:'z.B. 54938'},
        {id:'bwaF_fahrraeder',label:'davon Fahrraeder',ph:'',sub:true},
        {id:'bwaF_teile',label:'davon Teile & Zubehoer',ph:'',sub:true},
        {id:'bwaF_service',label:'davon Service',ph:'',sub:true},
        {id:'bwaF_skonti',label:'davon Skonti (negativ)',ph:'z.B. -2028',sub:true},
        {id:'bwaF_wareneinsatz',label:'Wareneinsatz (negativ)',ph:'z.B. -33580'},
        {id:'bwaF_personal',label:'Personalkosten (negativ)',ph:'z.B. -13485'},
        {id:'bwaF_raum',label:'Raumkosten (negativ)',ph:'z.B. -4150'},
        {id:'bwaF_werbe',label:'Werbe-/Reisekosten',ph:''},
        {id:'bwaF_warenabgabe',label:'Kosten Warenabgabe',ph:''},
        {id:'bwaF_abschreibung',label:'Abschreibungen',ph:''},
        {id:'bwaF_sonstige',label:'Sonstige Kosten',ph:''},
        {id:'bwaF_zins',label:'Zinsaufwand',ph:''}
    ];
    html += '<div class="space-y-2 mb-4 max-h-60 overflow-y-auto">';
    fields.forEach(function(f) {
        html += '<div class="flex items-center space-x-2"><label class="'+(f.sub?'pl-4 ':'')+' text-xs text-gray-600 w-48 flex-shrink-0">'+f.label+'</label>';
        html += '<input id="'+f.id+'" type="number" step="0.01" class="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm text-right bwa-field" placeholder="'+f.ph+'"></div>';
    });
    html += '</div>';
    html += '<div id="bwaUploadError" style="display:none" class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-3"></div>';
    html += '<button onclick="saveBwaData()" id="bwaSaveBtn" class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">BWA speichern</button>';
    html += '</div></div>';
    var c = document.createElement('div'); c.id = 'bwaUploadContainer'; c.innerHTML = html; document.body.appendChild(c);
}

export function handleBwaFileSelect(input) {
    var btn = document.getElementById('bwaParseBtn');
    var count = input.files ? input.files.length : 0;
    if(btn) {
        btn.disabled = count === 0;
        btn.textContent = count > 1 ? '\u{1F916} ' + count + ' Dateien auslesen' : '\u{1F916} Auslesen';
    }
}

export async function parseBwaWithAI() {
    var fileInput = document.getElementById('bwaFileInput');
    if(!fileInput || !fileInput.files || !fileInput.files.length) return;

    // Multi-file mode
    if(fileInput.files.length > 1) {
        return parseBwaBatch(fileInput.files);
    }

    var file = fileInput.files[0];
    var statusEl = document.getElementById('bwaAiStatus');
    var statusText = document.getElementById('bwaAiStatusText');
    var resultEl = document.getElementById('bwaAiResult');
    var parseBtn = document.getElementById('bwaParseBtn');

    statusEl.classList.remove('hidden');
    resultEl.classList.add('hidden');
    if(parseBtn) parseBtn.disabled = true;

    var isPdf = file.name.match(/\.pdf$/i);
    if(isPdf) {
        // PDF → KI-Analyse via Edge Function
        statusText.textContent = '\u{1F916} PDF wird mit KI analysiert...';
        try {
            var reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    var base64 = e.target.result.split(',')[1];
                    var session = await _sb().auth.getSession();
                    var token = session?.data?.session?.access_token;
                    var resp = await fetch(SUPABASE_URL + '/functions/v1/analyze-finance', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token||''), 'apikey': SUPABASE_ANON_KEY },
                        body: JSON.stringify({ type: 'bwa', file_base64: base64, media_type: 'application/pdf' })
                    });
                    if(!resp.ok) throw new Error('API Fehler ' + resp.status);
                    var data = await resp.json();
                    var result = data.result;
                    if(result && result.werte) {
                        // Fill form fields from KI result
                        bwaApplyKiResult(result);
                        statusEl.querySelector('.animate-spin').style.display = 'none';
                        statusText.textContent = '\u2705 KI-Analyse abgeschlossen' + (result.confidence ? ' (Konfidenz: ' + Math.round(result.confidence * 100) + '%)' : '');
                        if(result.hinweise && result.hinweise.length > 0) {
                            resultEl.innerHTML = '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700"><p class="font-semibold mb-1">KI-Hinweise:</p><ul class="list-disc pl-4">' + result.hinweise.map(function(h){return '<li>'+_escH(h)+'</li>';}).join('') + '</ul></div>';
                            resultEl.classList.remove('hidden');
                        }
                    } else {
                        throw new Error('Keine Werte erkannt');
                    }
                } catch(err2) {
                    statusEl.querySelector('.animate-spin').style.display = 'none';
                    statusText.textContent = '\u274C KI-Analyse fehlgeschlagen: ' + (err2.message||err2);
                }
                if(parseBtn) parseBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        } catch(pdfErr) {
            statusEl.querySelector('.animate-spin').style.display = 'none';
            statusText.textContent = '\u274C Fehler: ' + (pdfErr.message||pdfErr);
            if(parseBtn) parseBtn.disabled = false;
        }
        return;
    }

    statusText.textContent = '\u{1F4CA} Datei wird analysiert...';

    // Check XLSX library availability
    if(typeof XLSX === 'undefined' && typeof window.XLSX === 'undefined') {
        statusEl.querySelector('.animate-spin').style.display = 'none';
        statusText.textContent = '\u274C Excel-Bibliothek (SheetJS) nicht geladen. Bitte Seite neu laden.';
        if(parseBtn) parseBtn.disabled = false;
        return;
    }

    // === DATEV Sign Inversion Fix ===
    var negZeilen = {1060:1,1100:1,1120:1,1140:1,1150:1,1155:1,1160:1,1170:1,1175:1,1180:1,1190:1,1200:1,1210:1,1220:1,1240:1,1250:1,1260:1,1280:1,1290:1,1310:1,1312:1,1320:1,1355:1};
    function fixDatevSigns(bwaRows) {
        if(!bwaRows || bwaRows.length === 0) return bwaRows;
        // Check if Material/Wareneinkauf (1060) is positive - if so, this is DATEV format where costs are positive
        var we = bwaRows.find(function(x) { return x.zeile === 1060 && x.ist_summenzeile; });
        if(we && we.wert > 0) {
            bwaRows.forEach(function(row) {
                if(row.zeile && negZeilen[row.zeile] && row.ist_summenzeile) {
                    if(row.wert > 0) row.wert = -row.wert;
                    if(row.wert_kumuliert > 0) row.wert_kumuliert = -row.wert_kumuliert;
                }
            });
        }
        return bwaRows;
    }
    BwaParser.parseFile(file, async function(err, result) {
        if(!err && result && result.bwa_daten) {
            result.bwa_daten = fixDatevSigns(result.bwa_daten);
        }
        if(err) {
            // KI-Fallback: Excel-Text extrahieren und an KI senden
            statusText.textContent = '\u{1F916} Parser fehlgeschlagen \u2013 KI-Analyse wird gestartet...';
            try {
                var arrayBuf = await file.arrayBuffer();
                var wb = XLSX.read(arrayBuf, { type: 'array' });
                var rawText = cleanCsvForKi(wb);
                var session = await _sb().auth.getSession();
                var token = session?.data?.session?.access_token;
                var resp = await fetch(SUPABASE_URL + '/functions/v1/analyze-finance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token||''), 'apikey': SUPABASE_ANON_KEY },
                    body: JSON.stringify({ type: 'bwa', raw_text: rawText.substring(0, 15000) })
                });
                if(!resp.ok) { var errB=''; try { var eD=await resp.json(); errB=eD.error||eD.details||''; } catch(e2) {} throw new Error('KI-API Fehler ' + resp.status + (errB ? ': '+errB.substring(0,150) : '')); }
                var data = await resp.json();
                if(data.result && data.result.werte) {
                    bwaApplyKiResult(data.result);
                    statusEl.querySelector('.animate-spin').style.display = 'none';
                    statusText.textContent = '\u2705 KI-Analyse abgeschlossen' + (data.result.confidence ? ' (Konfidenz: ' + Math.round(data.result.confidence * 100) + '%)' : '');
                    if(data.result.hinweise && data.result.hinweise.length > 0) {
                        resultEl.innerHTML = '<div class="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700"><p class="font-semibold mb-1">\u{1F916} KI-Hinweise:</p><ul class="list-disc pl-4">' + data.result.hinweise.map(function(h){return '<li>'+_escH(h)+'</li>';}).join('') + '</ul><p class="mt-2 text-[10px] text-purple-400">Bitte Werte vor dem Speichern kontrollieren.</p></div>';
                        resultEl.classList.remove('hidden');
                    }
                } else { throw new Error('Keine Werte erkannt'); }
            } catch(kiFallbackErr) {
                statusEl.querySelector('.animate-spin').style.display = 'none';
                statusText.textContent = '\u274C Auch KI-Analyse fehlgeschlagen: ' + (kiFallbackErr.message||'Unbekannt');
                resultEl.innerHTML = '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">'
                    + '<p class="font-semibold mb-1">Automatische Erkennung fehlgeschlagen</p>'
                    + '<p>Bitte die Werte manuell eingeben.</p></div>';
                resultEl.classList.remove('hidden');
            }
            if(parseBtn) parseBtn.disabled = false;
            return;
        }

        var meta = result.meta;
        var daten = result.bwa_daten;
        var jahrDaten = result.bwa_jahr_daten;

        // Apply detected month/year
        if(meta.monat) {
            var mSel = document.getElementById('bwaMonth');
            if(mSel) { mSel.value = meta.monat; mSel.style.borderColor = '#f97316'; mSel.style.backgroundColor = '#fff7ed'; }
        }
        if(meta.jahr) {
            var ySel = document.getElementById('bwaYear');
            if(ySel) { ySel.value = meta.jahr; ySel.style.borderColor = '#f97316'; ySel.style.backgroundColor = '#fff7ed'; }
        }

        // Extract key values from parsed data
        var parsed = {};
        var matchedRows = [];

        // Mapping: kontengruppe/bezeichnung → form field
        var gruppenMap = {
            'Umsatzerl\u00f6se': 'umsatzerloese',
            'Gesamtleistung': 'gesamtleistung',
            'Materialaufwand': 'wareneinsatz',
            'Rohertrag': 'rohertrag',
            'Sonstige Erl\u00f6se': 'so_betr_erloese',
            'Betrieblicher Rohertrag': 'betrieblicher_rohertrag',
            'Personalkosten': 'personalkosten',
            'Raumkosten': 'raumkosten',
            'Steuern/Versicherungen': 'versicherungen',
            'Fahrzeugkosten': 'fahrzeugkosten',
            'Werbe-/Reisekosten': 'werbekosten',
            'Warenabgabekosten': 'kosten_warenabgabe',
            'Abschreibungen': 'abschreibungen',
            'Instandhaltung': 'reparaturen_instandhaltung',
            'Sonstige Kosten': 'sonstige_kosten',
            'Gesamtkosten': 'gesamtkosten',
            'Summe Aufwendungen': 'gesamtkosten',
            'Betriebsergebnis': 'betriebsergebnis',
            'Zinsen': 'zinsaufwand',
            'Neutrales Ergebnis': 'neutraler_aufwand',
            'Ergebnis': 'ergebnis_vor_steuern'
        };

        // Detail-Konten Mapping
        var kontoMap = {
            '4400': 'davon_fahrraeder',
            '4405': 'davon_teile',
            '4407': 'davon_service',
            '4410': 'davon_service',
            '4730': 'davon_skonti',
            '4736': 'davon_skonti'
        };

        // Verarbeite Monats-BWA Daten
        if(daten && daten.length > 0) {
            daten.forEach(function(row) {
                if(!row.wert && row.wert !== 0) return;

                // Summenzeilen → Hauptfelder
                if(row.ist_summenzeile && row.kontengruppe && gruppenMap[row.kontengruppe]) {
                    var key = gruppenMap[row.kontengruppe];
                    if(!parsed[key]) {
                        parsed[key] = row.wert;
                        matchedRows.push({key: key, label: row.bezeichnung, value: row.wert});
                    }
                }

                // Detail-Konten → Unterfelder
                if(row.konto && kontoMap[row.konto]) {
                    var dKey = kontoMap[row.konto];
                    parsed[dKey] = (parsed[dKey] || 0) + row.wert;
                    matchedRows.push({key: dKey, label: row.bezeichnung, value: row.wert});
                }
            });
        }

        // Verarbeite Jahres-BWA Daten (nimm den letzten befüllten Monat)
        if(jahrDaten && jahrDaten.length > 0 && daten.length === 0) {
            var monatKeys = ['jan','feb','mrz','apr','mai','jun','jul','aug','sep','okt','nov','dez'];
            // Finde letzten Monat mit Daten
            var lastMonat = 0;
            jahrDaten.forEach(function(row) {
                for(var m = 11; m >= 0; m--) {
                    if(row[monatKeys[m]] && row[monatKeys[m]] !== 0 && m+1 > lastMonat) {
                        lastMonat = m+1;
                    }
                }
            });
            if(lastMonat > 0 && !meta.monat) {
                meta.monat = lastMonat;
                var mSel2 = document.getElementById('bwaMonth');
                if(mSel2) { mSel2.value = lastMonat; mSel2.style.borderColor = '#f97316'; mSel2.style.backgroundColor = '#fff7ed'; }
            }
            var mKey = lastMonat > 0 ? monatKeys[lastMonat - 1] : null;
            if(mKey) {
                jahrDaten.forEach(function(row) {
                    var val = row[mKey];
                    if(!val && val !== 0) return;
                    var bez = (row.bezeichnung || '').toLowerCase();
                    var mapped = null;
                    // Suche in kompakt map
                    var kompaktKeys = Object.keys(BwaParser.KOMPAKT_MAP);
                    for(var i = 0; i < kompaktKeys.length; i++) {
                        if(bez === kompaktKeys[i]) {
                            var info = BwaParser.KOMPAKT_MAP[kompaktKeys[i]];
                            if(info.gruppe && gruppenMap[info.gruppe]) {
                                mapped = gruppenMap[info.gruppe];
                                break;
                            }
                        }
                    }
                    if(mapped && !parsed[mapped]) {
                        parsed[mapped] = val;
                        matchedRows.push({key: mapped, label: row.bezeichnung, value: val});
                    }
                });
            }
        }

        // Berechne abgeleitete Werte
        if(!parsed.rohertrag && parsed.umsatzerloese && parsed.wareneinsatz) {
            parsed.rohertrag = parsed.umsatzerloese + parsed.wareneinsatz;
        }
        if(!parsed.gesamtkosten) {
            parsed.gesamtkosten = (parsed.personalkosten||0) + (parsed.raumkosten||0) + (parsed.werbekosten||0) +
                (parsed.kosten_warenabgabe||0) + (parsed.abschreibungen||0) + (parsed.sonstige_kosten||0) +
                (parsed.kfzkosten||0) + (parsed.versicherungen||0) + (parsed.instandhaltung||0);
        }
        if(!parsed.betriebsergebnis && parsed.rohertrag) {
            parsed.betriebsergebnis = parsed.rohertrag + (parsed.gesamtkosten||0);
        }
        if(!parsed.ergebnis_vor_steuern && parsed.betriebsergebnis) {
            parsed.ergebnis_vor_steuern = parsed.betriebsergebnis + (parsed.zinsaufwand||0);
        }

        statusEl.querySelector('.animate-spin').style.display = 'none';

        if(matchedRows.length === 0) {
            // KI-Fallback: Format erkannt aber keine Zuordnung möglich
            statusText.textContent = '\u{1F916} Format "' + meta.format + '" nicht zuordbar \u2013 KI-Analyse l\u00e4uft...';
            try {
                var arrayBuf2 = await file.arrayBuffer();
                var wb2 = XLSX.read(arrayBuf2, { type: 'array' });
                var rawText2 = cleanCsvForKi(wb2);
                var kiResult = await callFinanceKi('bwa', null, null, rawText2.substring(0, 15000), {jahr: meta.jahr, monat: meta.monat, format: meta.format});
                if(kiResult && kiResult.werte) {
                    bwaApplyKiResult(kiResult);
                    statusEl.querySelector('.animate-spin').style.display = 'none';
                    statusText.textContent = '\u2705 KI-Analyse abgeschlossen' + (kiResult.confidence ? ' (Konfidenz: ' + Math.round(kiResult.confidence * 100) + '%)' : '') + ' [' + meta.format + ' \u2192 KI]';
                    if(kiResult.hinweise && kiResult.hinweise.length > 0) {
                        resultEl.innerHTML = '<div class="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-700"><p class="font-semibold mb-1">\u{1F916} KI-Hinweise:</p><ul class="list-disc pl-4">' + kiResult.hinweise.map(function(h){return '<li>'+_escH(h)+'</li>';}).join('') + '</ul><p class="mt-2 text-[10px] text-purple-400">Bitte Werte vor dem Speichern kontrollieren.</p></div>';
                        resultEl.classList.remove('hidden');
                    }
                } else { throw new Error('Keine Werte erkannt'); }
            } catch(kiErr2) {
                statusEl.querySelector('.animate-spin').style.display = 'none';
                statusText.textContent = '\u26a0\ufe0f Auch KI konnte keine Werte zuordnen (Format: ' + meta.format + ')';
                resultEl.innerHTML = '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">'
                    + '<p class="font-semibold mb-1">Automatische Erkennung fehlgeschlagen</p>'
                    + '<p>Bitte die Werte manuell eingeben.</p></div>';
                resultEl.classList.remove('hidden');
            }
            if(parseBtn) parseBtn.disabled = false;
            return;
        }

        var periodInfo = meta.monat && meta.jahr ? ' (' + monatNamen[meta.monat] + ' ' + meta.jahr + ')' : '';
        statusText.textContent = '\u2705 ' + matchedRows.length + ' Werte erkannt!' + periodInfo + ' [' + meta.format + ']';

        // Fill form fields
        var fieldMap = {
            umsatzerloese: 'bwaF_umsatz',
            davon_fahrraeder: 'bwaF_fahrraeder',
            davon_teile: 'bwaF_teile',
            davon_service: 'bwaF_service',
            davon_skonti: 'bwaF_skonti',
            wareneinsatz: 'bwaF_wareneinsatz',
            personalkosten: 'bwaF_personal',
            raumkosten: 'bwaF_raum',
            werbekosten: 'bwaF_werbe',
            kosten_warenabgabe: 'bwaF_warenabgabe',
            abschreibungen: 'bwaF_abschreibung',
            sonstige_kosten: 'bwaF_sonstige',
            zinsaufwand: 'bwaF_zins'
        };

        var filledCount = 0;
        Object.keys(fieldMap).forEach(function(key) {
            var val = parsed[key];
            if(val !== undefined && val !== 0) {
                var el = document.getElementById(fieldMap[key]);
                if(el) {
                    el.value = Math.round(val * 100) / 100;
                    el.style.borderColor = '#f97316';
                    el.style.backgroundColor = '#fff7ed';
                    filledCount++;
                }
            }
        });

        // Show results
        var umsatz = parsed.umsatzerloese || 0;
        var rohertrag = parsed.rohertrag || 0;
        var rohertragPct = umsatz ? ((rohertrag / umsatz) * 100).toFixed(1) : 0;
        var ergebnis = parsed.ergebnis_vor_steuern || parsed.betriebsergebnis || 0;

        resultEl.innerHTML = '<div class="bg-green-50 border border-green-200 rounded-lg p-3">'
            + '<p class="text-xs font-semibold text-green-700 mb-2">\u2705 ' + filledCount + ' Werte erkannt \u00b7 Format: <code>' + meta.format + '</code></p>'
            + '<div class="grid grid-cols-3 gap-2 text-xs">'
            + '<div><span class="text-gray-500">Umsatz:</span><br><strong>' + umsatz.toLocaleString('de-DE') + ' \u20AC</strong></div>'
            + '<div><span class="text-gray-500">Rohertrag:</span><br><strong>' + rohertragPct + '%</strong></div>'
            + '<div><span class="text-gray-500">Ergebnis:</span><br><strong class="' + (ergebnis >= 0 ? 'text-green-600' : 'text-red-600') + '">' + ergebnis.toLocaleString('de-DE') + ' \u20AC</strong></div>'
            + '</div>'
            + '<details class="mt-2"><summary class="text-[10px] text-gray-400 cursor-pointer">Erkannte Zuordnungen (' + matchedRows.length + ')</summary>'
            + '<div class="mt-1 space-y-0.5 max-h-40 overflow-y-auto">' + matchedRows.map(function(m) {
                return '<div class="text-[10px] text-gray-500"><span class="text-gray-700">"' + m.label + '"</span> \u2192 <strong>' + m.key + '</strong> = ' + (typeof m.value === 'number' ? m.value.toLocaleString('de-DE') : m.value) + '</div>';
            }).join('') + '</div></details>'
            + '<p class="text-[10px] text-gray-400 mt-2">\u26a0\ufe0f Bitte pr\u00fcfe die Werte vor dem Speichern.</p>'
            + '</div>';
        resultEl.classList.remove('hidden');

        // Store detail data for saveBwaData()
        window._lastParsedDetails = daten && daten.length > 0 ? daten : [];
        window._lastParsedFormat = meta.format;

        if(parseBtn) parseBtn.disabled = false;
    });
}

// Batch BWA Upload – mehrere Dateien nacheinander parsen + speichern
export async function parseBwaBatch(files) {
    var statusEl = document.getElementById('bwaAiStatus');
    var statusText = document.getElementById('bwaAiStatusText');
    var resultEl = document.getElementById('bwaAiResult');
    var parseBtn = document.getElementById('bwaParseBtn');
    statusEl.classList.remove('hidden');
    resultEl.classList.remove('hidden');
    if(parseBtn) parseBtn.disabled = true;

    var total = files.length;
    var results = [];
    resultEl.innerHTML = '<div id="bwaBatchProgress" class="space-y-2"></div>';

    for(var i = 0; i < total; i++) {
        var file = files[i];
        statusText.textContent = '\u{1F4CA} Datei ' + (i+1) + '/' + total + ': ' + file.name + '...';

        var progEl = document.getElementById('bwaBatchProgress');
        var itemId = 'bwaBatch_' + i;
        progEl.innerHTML += '<div id="' + itemId + '" class="flex items-center space-x-2 text-xs p-2 bg-gray-50 rounded"><div class="w-3 h-3 border-2 border-vit-orange border-t-transparent rounded-full animate-spin"></div><span class="flex-1 truncate">' + _escH(file.name) + '</span><span class="text-gray-400">Analysiert...</span></div>';

        // Delay between requests to avoid rate limiting (429)
        if(i > 0) { await new Promise(function(r){ setTimeout(r, 4000); }); }

        try {
            var bwaResult = await parseSingleBwaFileWithRetry(file);
            if(bwaResult && bwaResult.umsatzerloese) {
                // Auto-save
                var saveRes = await autoSaveBwa(bwaResult, file.name);
                var el = document.getElementById(itemId);
                if(el) el.innerHTML = '<span class="text-green-600">\u2705</span><span class="flex-1">' + _escH(file.name) + '</span><span class="text-green-600 font-semibold">' + bwaResult.monatName + ' ' + bwaResult.jahr + ' \u2013 Umsatz: ' + Math.round(bwaResult.umsatzerloese).toLocaleString('de-DE') + ' \u20AC</span>';
                results.push({file: file.name, success: true, monat: bwaResult.monat, jahr: bwaResult.jahr});
            } else {
                throw new Error('Keine Werte erkannt');
            }
        } catch(err) {
            var el2 = document.getElementById(itemId);
            if(el2) el2.innerHTML = '<span class="text-red-500">\u274C</span><span class="flex-1">' + _escH(file.name) + '</span><span class="text-red-500">' + _escH(err.message || 'Fehler') + '</span>';
            results.push({file: file.name, success: false, error: err.message});
        }
    }

    var ok = results.filter(function(r){return r.success;}).length;
    statusEl.querySelector('.animate-spin').style.display = 'none';
    statusText.textContent = '\u2705 Batch fertig: ' + ok + '/' + total + ' BWAs erfolgreich gespeichert';
    if(parseBtn) parseBtn.disabled = false;

    // Reload BWA list
    if(ok > 0 && typeof loadBwaList === 'function') {
        setTimeout(function(){ loadBwaList(); }, 500);
    }
}

// Parse a single BWA file – returns {monat, jahr, monatName, umsatzerloese, ...} or throws
// Retry wrapper: retries on 429 rate limit with exponential backoff
export async function parseSingleBwaFileWithRetry(file, attempt) {
    attempt = attempt || 1;
    try {
        return await parseSingleBwaFile(file);
    } catch(err) {
        if(err.message && err.message.includes('429') && attempt < 4) {
            var wait = attempt * 5000; // 5s, 10s, 15s
            await new Promise(function(r){ setTimeout(r, wait); });
            return parseSingleBwaFileWithRetry(file, attempt + 1);
        }
        throw err;
    }
}

// Clean CSV for KI: remove line breaks in cells, clarify SUSA columns
export function cleanCsvForKi(wb) {
    var rawText = '';
    wb.SheetNames.forEach(function(sn) {
        var ws = wb.Sheets[sn];
        // Clean cell values: remove newlines
        var range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        for(var R = range.s.r; R <= range.e.r; R++) {
            for(var C = range.s.c; C <= range.e.c; C++) {
                var addr = XLSX.utils.encode_cell({r:R, c:C});
                var cell = ws[addr];
                if(cell && typeof cell.v === 'string') {
                    cell.v = cell.v.replace(/[\r\n]+/g, ' ').trim();
                    if(cell.w) cell.w = cell.w.replace(/[\r\n]+/g, ' ').trim();
                }
            }
        }
        rawText += '=== Sheet: ' + sn + ' ===\n' + XLSX.utils.sheet_to_csv(ws, {FS:';'}) + '\n\n';
    });
    return rawText;
}

export async function parseSingleBwaFile(file) {
    return new Promise(function(resolve, reject) {
        var meta = BwaParser.extractMonatJahr(file.name);
        meta.dateiname = file.name;
        var monatNamen = ['','Januar','Februar','M\u00e4rz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

        var isPdf = file.name.match(/\.pdf$/i);
        if(isPdf) {
            // PDF → direkt KI
            var reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    var base64 = e.target.result.split(',')[1];
                    var kiResult = await callFinanceKi('bwa', base64, 'application/pdf', null, {jahr: meta.jahr, monat: meta.monat});
                    if(kiResult && kiResult.werte) {
                        var w = kiResult.werte;
                        var m = (kiResult.meta && kiResult.meta.monat) || meta.monat;
                        var j = (kiResult.meta && kiResult.meta.jahr) || meta.jahr;
                        resolve(Object.assign(w, {monat: m, jahr: j, monatName: monatNamen[m] || '?', quelle: 'ki'}));
                    } else { reject(new Error('KI: Keine Werte')); }
                } catch(err) { reject(err); }
            };
            reader.readAsDataURL(file);
            return;
        }

        // Excel → Parser zuerst, dann KI-Fallback
        BwaParser.parseFile(file, async function(err, result) {
            // Versuche regelbasiert zu parsen
            var parsed = {};
            var matchCount = 0;
            if(!err && result) {
                var daten = result.bwa_daten || [];
                var gruppenMap = {
                    'Umsatzerl\u00f6se':'umsatzerloese','Materialaufwand':'wareneinsatz','Rohertrag':'rohertrag',
                    'Betrieblicher Rohertrag':'rohertrag','Personalkosten':'personalkosten','Raumkosten':'raumkosten',
                    'Werbe-/Reisekosten':'werbekosten','Warenabgabekosten':'kosten_warenabgabe',
                    'Abschreibungen':'abschreibungen','Sonstige Kosten':'sonstige_kosten',
                    'Fahrzeugkosten':'kfzkosten','Steuern/Versicherungen':'versicherungen',
                    'Betriebsergebnis':'betriebsergebnis','Zinsen':'zinsaufwand'
                };
                daten.forEach(function(row) {
                    if(row.ist_summenzeile && row.kontengruppe && gruppenMap[row.kontengruppe] && row.wert !== null) {
                        var key = gruppenMap[row.kontengruppe];
                        if(!parsed[key]) { parsed[key] = row.wert; matchCount++; }
                    }
                });
                if(result.meta) { meta.monat = result.meta.monat || meta.monat; meta.jahr = result.meta.jahr || meta.jahr; }
            }

            if(matchCount >= 3) {
                // Parser hat genug Felder gefunden
                resolve(Object.assign(parsed, {monat: meta.monat, jahr: meta.jahr, monatName: monatNamen[meta.monat] || '?', quelle: 'parser'}));
                return;
            }

            // KI-Fallback
            try {
                var arrayBuf = await file.arrayBuffer();
                var wb = XLSX.read(arrayBuf, { type: 'array' });
                var rawText = cleanCsvForKi(wb);
                var kiResult = await callFinanceKi('bwa', null, null, rawText.substring(0, 15000), {jahr: meta.jahr, monat: meta.monat, format: meta.format});
                if(kiResult && kiResult.werte) {
                    var w2 = kiResult.werte;
                    var m2 = (kiResult.meta && kiResult.meta.monat) || meta.monat;
                    var j2 = (kiResult.meta && kiResult.meta.jahr) || meta.jahr;
                    resolve(Object.assign(w2, {monat: m2, jahr: j2, monatName: monatNamen[m2] || '?', quelle: 'ki'}));
                } else { reject(new Error('KI: Keine Werte')); }
            } catch(kiErr) { reject(kiErr); }
        });
    });
}

// === Window Exports ===
const _exports = {openBwaUploadModal, handleBwaFileSelect, parseBwaWithAI, parseBwaBatch, parseSingleBwaFileWithRetry, cleanCsvForKi, parseSingleBwaFile};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
