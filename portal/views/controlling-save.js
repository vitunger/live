/**
 * views/controlling-save.js - BWA Auto-Save, Apply KI Result, Save Data
 *
 * Sub-module of controlling.js (Orchestrator).
 * Exports: autoSaveBwa, bwaApplyKiResult, closeBwaUploadModal, saveBwaData
 *
 * @module views/controlling-save
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

// Auto-save a parsed BWA to DB
export async function autoSaveBwa(data, filename) {
    var stdId = _sbProfile() ? _sbProfile().standort_id : null;
    if(!stdId) throw new Error('Kein Standort');

    // Use parsed summation values if available, compute as fallback
    var rohertrag = data.rohertrag || ((data.umsatzerloese||0) + (data.wareneinsatz||0));

    // Gesamtkosten: use parsed value or sum all cost categories
    var gesamtkosten = data.gesamtkosten || (
        (data.personalkosten||0) + (data.raumkosten||0) + (data.werbekosten||0) +
        (data.kosten_warenabgabe||0) + (data.abschreibungen||0) + (data.sonstige_kosten||0) +
        (data.fahrzeugkosten||0) + (data.versicherungen||0) +
        (data.reparaturen_instandhaltung||0)
    );

    // Betrieblicher Rohertrag = Rohertrag + So. betr. Erlöse
    var betrRohertrag = data.betrieblicher_rohertrag || (rohertrag + (data.so_betr_erloese||0));

    // Betriebsergebnis: use parsed value, fallback = betr. Rohertrag + Gesamtkosten
    var betriebsergebnis = data.betriebsergebnis || (betrRohertrag + gesamtkosten);

    // Ergebnis v.St.: use parsed value, fallback = BE + Zins + Neutral
    var ergebnis = data.ergebnis_vor_steuern || (
        betriebsergebnis + (data.zinsaufwand||0) + (data.neutraler_aufwand||0) + (data.neutraler_ertrag||0)
    );

    var payload = {
        standort_id: stdId,
        monat: data.monat,
        jahr: data.jahr,
        umsatzerloese: data.umsatzerloese || 0,
        davon_fahrraeder: data.davon_fahrraeder || null,
        davon_teile: data.davon_teile || null,
        davon_service: data.davon_service || null,
        davon_skonti: data.davon_skonti || null,
        wareneinsatz: data.wareneinsatz || 0,
        rohertrag: rohertrag,
        so_betr_erloese: data.so_betr_erloese || 0,
        betrieblicher_rohertrag: betrRohertrag,
        gesamtleistung: data.gesamtleistung || data.umsatzerloese || 0,
        personalkosten: data.personalkosten || 0,
        raumkosten: data.raumkosten || 0,
        versicherungen: data.versicherungen || 0,
        fahrzeugkosten: data.fahrzeugkosten || 0,
        werbekosten: data.werbekosten || 0,
        kosten_warenabgabe: data.kosten_warenabgabe || 0,
        abschreibungen: data.abschreibungen || 0,
        reparaturen_instandhaltung: data.reparaturen_instandhaltung || 0,
        sonstige_kosten: data.sonstige_kosten || 0,
        gesamtkosten: gesamtkosten,
        betriebsergebnis: betriebsergebnis,
        zinsaufwand: data.zinsaufwand || 0,
        neutraler_aufwand: data.neutraler_aufwand || 0,
        neutraler_ertrag: data.neutraler_ertrag || 0,
        ergebnis_vor_steuern: ergebnis,
        steuern: data.steuern || 0,
        ergebnis_nach_steuern: data.ergebnis_nach_steuern || (ergebnis + (data.steuern||0)),
        datei_name: filename,
        format: data.quelle === 'ki' ? 'KI-Analyse' : 'Auto-Parser',
        hochgeladen_von: sbUser ? _sbUser().id : null,
        updated_at: new Date().toISOString()
    };

    var resp = await _sb().from('bwa_daten').upsert(payload, {onConflict: 'standort_id,monat,jahr'}).select();
    if(resp.error) throw resp.error;

    // Run validation after save
    if(resp.data && resp.data[0]) {
        try {
            await _sb().rpc('validate_bwa', {p_bwa_id: resp.data[0].id});
        } catch(e) { console.warn('BWA Validation failed:', e); }
    }

    return resp.data;
}

// Apply KI analysis result to BWA form fields
export function bwaApplyKiResult(result) {
    if(!result) return;
    var meta = result.meta || {};
    var werte = result.werte || {};
    // Apply month/year
    if(meta.monat) {
        var mSel = document.getElementById('bwaMonth');
        if(mSel) { mSel.value = meta.monat; mSel.style.borderColor = '#a855f7'; mSel.style.backgroundColor = '#faf5ff'; }
    }
    if(meta.jahr) {
        var ySel = document.getElementById('bwaYear');
        if(ySel) { ySel.value = meta.jahr; ySel.style.borderColor = '#a855f7'; ySel.style.backgroundColor = '#faf5ff'; }
    }
    // Map KI werte to form fields (bwaF_ IDs)
    var fieldMap = {
        umsatzerloese:'bwaF_umsatz', wareneinsatz:'bwaF_wareneinsatz',
        personalkosten:'bwaF_personal', raumkosten:'bwaF_raum',
        werbekosten:'bwaF_werbe', kosten_warenabgabe:'bwaF_warenabgabe',
        abschreibungen:'bwaF_abschreibung', sonstige_kosten:'bwaF_sonstige',
        zinsaufwand:'bwaF_zins',
        davon_fahrraeder:'bwaF_fahrraeder', davon_teile:'bwaF_teile',
        davon_service:'bwaF_service', davon_skonti:'bwaF_skonti'
    };
    var filled = 0;
    Object.keys(werte).forEach(function(key) {
        var elId = fieldMap[key];
        if(!elId) return;
        var el = document.getElementById(elId);
        if(el && werte[key] !== null && werte[key] !== undefined) {
            el.value = Math.round(werte[key] * 100) / 100;
            el.style.borderColor = '#a855f7';
            el.style.backgroundColor = '#faf5ff';
            filled++;
        }
    });
}

export function closeBwaUploadModal() { var c = document.getElementById('bwaUploadContainer'); if(c) c.remove(); }

export async function saveBwaData() {
    var monthEl = document.getElementById('bwaMonth');
    var yearEl = document.getElementById('bwaYear');
    if(!monthEl || !yearEl) { _showToast('Upload-Formular nicht verfügbar', 'error'); return; }
    var month = parseInt(monthEl.value);
    var year = parseInt(yearEl.value);
    var errEl = document.getElementById('bwaUploadError');
    var btn = document.getElementById('bwaSaveBtn');
    var v = function(id) { return parseFloat((document.getElementById(id)||{}).value) || 0; };

    var umsatz = v('bwaF_umsatz');
    var wareneinsatz = v('bwaF_wareneinsatz');
    var rohertrag = umsatz + wareneinsatz; // wareneinsatz is negative
    var personal = v('bwaF_personal');
    var raum = v('bwaF_raum');
    var werbe = v('bwaF_werbe');
    var warenabgabe = v('bwaF_warenabgabe');
    var abschreibung = v('bwaF_abschreibung');
    var sonstige = v('bwaF_sonstige');
    var zins = v('bwaF_zins');

    if(!umsatz && !wareneinsatz) { if(errEl){errEl.textContent='Bitte mindestens Umsatz oder Wareneinsatz eingeben.';errEl.style.display='block';} return; }

    if(btn) { btn.disabled=true; btn.textContent='Wird gespeichert...'; }
    try {
        // HQ-Upload: Use target standort from hq-finanzen, otherwise user's own standort
        var stdId = window._hqBwaUploadStandortId || (_sbProfile() ? _sbProfile().standort_id : null);
        if(!stdId) { if(errEl){errEl.textContent='Kein Standort zugeordnet. Bitte Standort auswählen.';errEl.style.display='block';} if(btn){btn.disabled=false;btn.textContent='BWA speichern';} return; }

        // Upload file if selected
        var fileUrl = null;
        var fileName = null;
        var fileInput = document.getElementById('bwaFileInput');
        if(fileInput && fileInput.files && fileInput.files[0]) {
            var file = fileInput.files[0];
            fileName = file.name;
            var path = (stdId||'hq')+'/'+year+'/'+month+'_'+file.name;
            var upResp = await _sb().storage.from('bwa-dateien').upload(path, file, {upsert:true});
            if(upResp.error) console.warn('File upload error:', upResp.error);
            else fileUrl = path;
        }

        var soErloese = v('bwaF_soErloese');
        var versicherungen = v('bwaF_versicherungen');
        var kfzkosten = v('bwaF_kfz');
        var reparatur = v('bwaF_reparatur');
        var neutralAufwand = v('bwaF_neutralAufwand');
        var neutralErtrag = v('bwaF_neutralErtrag');
        var betrRohertrag = rohertrag + soErloese;
        var gesamtkosten = personal + raum + versicherungen + kfzkosten + werbe + warenabgabe + abschreibung + reparatur + sonstige;
        var betriebsergebnis = betrRohertrag + gesamtkosten;
        var ergebnis = betriebsergebnis + zins + neutralAufwand + neutralErtrag;

        var data = {
            standort_id: stdId,
            monat: month,
            jahr: year,
            umsatzerloese: umsatz,
            davon_fahrraeder: v('bwaF_fahrraeder'),
            davon_teile: v('bwaF_teile'),
            davon_service: v('bwaF_service'),
            davon_skonti: v('bwaF_skonti'),
            wareneinsatz: wareneinsatz,
            rohertrag: rohertrag,
            so_betr_erloese: soErloese,
            betrieblicher_rohertrag: betrRohertrag,
            personalkosten: personal,
            raumkosten: raum,
            versicherungen: versicherungen,
            fahrzeugkosten: kfzkosten,
            werbekosten: werbe,
            kosten_warenabgabe: warenabgabe,
            abschreibungen: abschreibung,
            reparaturen_instandhaltung: reparatur,
            sonstige_kosten: sonstige,
            gesamtkosten: gesamtkosten,
            betriebsergebnis: betriebsergebnis,
            zinsaufwand: zins,
            neutraler_aufwand: neutralAufwand,
            neutraler_ertrag: neutralErtrag,
            ergebnis_vor_steuern: ergebnis,
            plan_umsatz: v('bwaF_planUmsatz'),
            plan_wareneinsatz: v('bwaF_planWareneinsatz'),
            plan_rohertrag: v('bwaF_planRohertrag'),
            plan_personalkosten: v('bwaF_planPersonal'),
            plan_raumkosten: v('bwaF_planRaum'),
            plan_werbekosten: v('bwaF_planWerbe'),
            plan_gesamtkosten: v('bwaF_planGesamt'),
            plan_ergebnis: v('bwaF_planErgebnis'),
            format: window._lastParsedFormat || null,
            hochgeladen_von: sbUser ? _sbUser().id : null,
            updated_at: new Date().toISOString()
        };
        if(fileUrl) { data.datei_url = fileUrl; data.datei_name = fileName; }

        var resp = await _sb().from('bwa_daten').upsert(data, {onConflict:'standort_id,monat,jahr'}).select();
        if(resp.error) throw resp.error;
        var bwaId = resp.data && resp.data[0] ? resp.data[0].id : null;

        // Detail-Positionen speichern (nur wenn Parser-Daten vorhanden UND KI nicht korrigiert hat)
        // Bei KI-Korrektur sind die Parser-Details unzuverlässig → nicht speichern
        if(bwaId && window._lastParsedDetails && window._lastParsedDetails.length > 0 && !window._bwaKiCorrected) {
            // Alte Details löschen
            await _sb().from('bwa_detail_positionen').delete().eq('bwa_id', bwaId);
            // Neue Details in Batches speichern
            var details = window._lastParsedDetails.map(function(d) {
                return {
                    bwa_id: bwaId,
                    standort_id: stdId,
                    jahr: year,
                    monat: month,
                    zeile: d.zeile || null,
                    konto: d.konto || null,
                    kontengruppe: d.kontengruppe || null,
                    bezeichnung: d.bezeichnung,
                    wert: d.wert,
                    wert_kumuliert: d.wert_kumuliert || null,
                    wert_vorjahr: d.wert_vorjahr || null,
                    prozent_gesamtleistung: d.prozent_gesamtleistung || null,
                    ist_summenzeile: d.ist_summenzeile || false,
                    ebene: d.ebene || 0,
                    sortierung: d.sortierung || 0,
                    format: window._lastParsedFormat || null
                };
            });
            // Batch insert (max 500 per request)
            for(var bi = 0; bi < details.length; bi += 500) {
                var batch = details.slice(bi, bi + 500);
                var detResp = await _sb().from('bwa_detail_positionen').insert(batch);
                if(detResp.error) console.warn('Detail insert batch error:', detResp.error);
            }
        }

        // Save training example (user-confirmed values + raw text)
        try {
            if(window._bwaRawText) {
                var finalValues = {
                    umsatzerloese: umsatz, wareneinsatz: wareneinsatz,
                    so_betr_erloese: soErloese, personalkosten: personal,
                    raumkosten: raum, versicherungen: versicherungen,
                    fahrzeugkosten: kfzkosten, werbekosten: werbe,
                    kosten_warenabgabe: warenabgabe, abschreibungen: abschreibung,
                    reparaturen_instandhaltung: reparatur, sonstige_kosten: sonstige,
                    zinsaufwand: zins, neutraler_aufwand: neutralAufwand,
                    neutraler_ertrag: neutralErtrag,
                    rohertrag: rohertrag, gesamtkosten: gesamtkosten,
                    betriebsergebnis: betriebsergebnis, ergebnis_vor_steuern: ergebnis
                };
                await _sb().from('bwa_training_examples').insert({
                    standort_id: stdId,
                    format: window._lastParsedFormat || null,
                    monat: month, jahr: year,
                    raw_text: window._bwaRawText,
                    final_values: finalValues
                });
            }
        } catch(trainErr) { console.warn('[BWA] Training example save:', trainErr); }

        // Cleanup temp vars
        window._lastParsedDetails = null;
        window._lastParsedFormat = null;
        window._bwaKiCorrected = null;
        window._bwaRawText = null;
        window._hqBwaUploadStandortId = null;
        window._hqBwaUploadStandortName = null;

        closeBwaUploadModal();
        await loadBwaList();
        if(bwaId) showBwaFromDb(bwaId);
        if (typeof window.logAudit === 'function') window.logAudit('bwa_upload', 'controlling', { monat: month, jahr: year });
        _showToast('\u2705 BWA '+monatNamen[month]+' '+year+' gespeichert!', 'success');
    } catch(err) {
        if(errEl){errEl.textContent='Fehler: '+err.message;errEl.style.display='block';}
        if(btn) { btn.disabled=false; btn.textContent=_t('ui_save_bwa'); }
    }
}

// === Window Exports ===
const _exports = {autoSaveBwa, bwaApplyKiResult, closeBwaUploadModal, saveBwaData};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
