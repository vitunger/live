/**
 * views/controlling-display.js - BWA List, Detail, Trend, Download, Delete
 *
 * Sub-module of controlling.js (Orchestrator).
 * Exports: loadBwaList, downloadBwa, showBwaFromDb, loadBwaTrend, deleteBwa
 *
 * @module views/controlling-display
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

// Local duplicates (race-condition-safe)
var monatNamen = ['','Januar','Februar','Maerz','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
function eur(val) {
    if(val===null||val===undefined) return '—';
    var n = parseFloat(val);
    return n.toLocaleString('de-DE', {minimumFractionDigits:0, maximumFractionDigits:0});
}
function eurColor(val) {
    var n = parseFloat(val)||0;
    return n >= 0 ? 'text-gray-800' : 'text-red-600';
}
function diffHtml(ist, plan) {
    if(!plan) return '<td class="text-right py-2 px-3 text-gray-300">—</td>';
    var d = parseFloat(ist) - parseFloat(plan);
    var cl = d >= 0 ? 'text-green-600' : 'text-red-600';
    var prefix = d >= 0 ? '+' : '';
    return '<td class="text-right py-2 px-3 '+cl+' font-semibold">'+prefix+eur(d)+'</td>';
}

export async function loadBwaList() {
    var container = document.getElementById('bwaFileList');
    if(!container) return;
    // Set standort label dynamically
    var bwaLabel = document.getElementById('bwaStandortLabel');
    var useDemo = (typeof isDemoMode !== 'undefined' && isDemoMode) || (_sbProfile() && (_sbProfile().status === 'demo' || _sbProfile().status === 'demo_active'));
    if(bwaLabel) bwaLabel.textContent = useDemo ? 'vit:bikes Muster-Filiale' : ('vit:bikes ' + (_sbProfile() && _sbProfile().standort_name ? _sbProfile().standort_name : 'Standort'));
    try {
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var query = _sb().from('bwa_daten').select('id,monat,jahr,umsatzerloese,rohertrag,ergebnis_vor_steuern,datei_name,datei_url,created_at').order('jahr', {ascending:false}).order('monat', {ascending:false});
        if(stdId && !_sbProfile().is_hq) query = query.eq('standort_id', stdId);
        var resp = await query;
        if(resp.error) throw resp.error;
        window.bwaCache = resp.data || [];
        if(window.bwaCache.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Noch keine BWAs erfasst.</p>';
            return;
        }
        // Load corrected ergebnis from detail positions (Zeile 1355, 1300, or 1370)
        var bwaIds = window.bwaCache.map(function(b){ return b.id; });
        var detResp = await _sb().from('bwa_detail_positionen').select('bwa_id,zeile,wert').in('bwa_id', bwaIds).in('zeile', [1300, 1355, 1370]).eq('ist_summenzeile', true);
        var detMap = {};
        if(detResp.data) detResp.data.forEach(function(d){
            var val = parseFloat(d.wert)||0;
            // Priorität: 1355 > 1300 > 1370
            if(!detMap[d.bwa_id] || d.zeile === 1355 || (d.zeile === 1300 && !detMap[d.bwa_id + '_z1355'])) {
                detMap[d.bwa_id] = val;
                if(d.zeile === 1355) detMap[d.bwa_id + '_z1355'] = true;
            }
        });
        // Group by year
        var years = {};
        window.bwaCache.forEach(function(b) {
            if(!years[b.jahr]) years[b.jahr] = [];
            years[b.jahr].push(b);
        });
        var h = '';
        Object.keys(years).sort(function(a,b){return b-a;}).forEach(function(yr) {
            var items = years[yr];
            h += '<div class="mb-3">';
            h += '<button onclick="this.nextElementSibling.classList.toggle(\'hidden\')" class="flex items-center justify-between w-full text-left p-2 bg-gray-100 rounded-lg hover:bg-gray-200">';
            h += '<span class="font-semibold text-gray-700">\u{1F4C1} '+yr+'</span>';
            h += '<span class="text-gray-400 text-xs">'+items.length+' BWA'+(items.length>1?'s':'')+'</span></button>';
            h += '<div class="mt-2 space-y-1">';
            items.forEach(function(b) {
                var isSelected = window.selectedBwaId === b.id;
                // Use corrected ergebnis from detail positions if available
                var erg = detMap[b.id] !== undefined ? detMap[b.id] : parseFloat(b.ergebnis_vor_steuern);
                var ergClass = erg >= 0 ? 'text-green-600' : 'text-red-500';
                h += '<div class="flex items-center gap-1">';
                h += '<button onclick="showBwaFromDb(\''+b.id+'\')" class="bwa-file-db flex-1 flex items-center justify-between p-2.5 rounded-lg hover:bg-orange-50 text-left'+(isSelected?' bg-orange-50 border border-vit-orange':'')+'">';
                h += '<div class="flex items-center space-x-3"><span class="text-red-500">\u{1F4C4}</span>';
                h += '<div><p class="text-sm font-semibold '+(isSelected?'text-vit-orange':'text-gray-800')+'">'+monatNamen[b.monat]+' '+b.jahr+'</p>';
                h += '<p class="text-xs text-gray-500">Umsatz: '+eur(b.umsatzerloese)+' \u20AC</p></div></div>';
                h += '<span class="text-xs '+ergClass+'">'+eur(erg)+' \u20AC</span>';
                h += '</button>';
                h += '<button onclick="downloadBwa(\''+b.id+'\')" class="p-2 text-gray-400 hover:text-vit-orange rounded-lg hover:bg-orange-50" title="BWA herunterladen"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></button>';
                h += '</div>';
            });
            h += '</div></div>';
        });
        container.innerHTML = h;
    } catch(err) { console.error('[BWA] loadBwaList error:', err); container.innerHTML = '<p class="text-sm text-red-400 text-center py-4">Fehler: '+err.message+'</p><button onclick="loadBwaList()" class="text-xs text-vit-orange underline mt-2">Erneut versuchen</button>'; }
}

export async function downloadBwa(bwaId) {
    try {
        // Load BWA summary
        var resp = await _sb().from('bwa_daten').select('*').eq('id', bwaId).single();
        if(resp.error) throw resp.error;
        var b = resp.data;

        // If original file exists in storage, download that
        if(b.datei_url) {
            var dlResp = await _sb().storage.from('bwa-dateien').download(b.datei_url);
            if(dlResp.data) {
                var url = URL.createObjectURL(dlResp.data);
                var a = document.createElement('a');
                a.href = url; a.download = b.datei_name || ('BWA_'+monatNamen[b.monat]+'_'+b.jahr+'.csv');
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
                return;
            }
        }

        // Otherwise generate CSV from detail positions
        var detResp = await _sb().from('bwa_detail_positionen').select('*').eq('bwa_id', bwaId).order('sortierung');
        var rows = (detResp.data && detResp.data.length > 0) ? detResp.data : null;
        var csv = '\uFEFF'; // BOM for Excel
        csv += 'BWA ' + monatNamen[b.monat] + ' ' + b.jahr + '\n\n';
        csv += 'Position;Monat;Kumuliert\n';

        if(rows) {
            rows.forEach(function(d) {
                var prefix = d.ist_summenzeile ? '' : '  ';
                var name = (prefix + (d.bezeichnung||'')).replace(/;/g, ',');
                var wert = d.wert !== null ? d.wert.toString().replace('.', ',') : '';
                var kum = d.wert_kumuliert !== null ? d.wert_kumuliert.toString().replace('.', ',') : '';
                csv += name + ';' + wert + ';' + kum + '\n';
            });
        } else {
            // Fallback: use summary fields
            csv += 'Umsatzerl\u00f6se;' + b.umsatzerloese + ';\n';
            csv += 'Wareneinsatz;' + b.wareneinsatz + ';\n';
            csv += 'Rohertrag;' + b.rohertrag + ';\n';
            csv += 'Personalkosten;' + b.personalkosten + ';\n';
            csv += 'Raumkosten;' + b.raumkosten + ';\n';
            csv += 'Werbekosten;' + b.werbekosten + ';\n';
            csv += 'Abschreibungen;' + b.abschreibungen + ';\n';
            csv += 'Sonstige Kosten;' + b.sonstige_kosten + ';\n';
            csv += 'Gesamtkosten;' + b.gesamtkosten + ';\n';
            csv += 'Betriebsergebnis;' + b.betriebsergebnis + ';\n';
            csv += 'Zinsaufwand;' + b.zinsaufwand + ';\n';
            csv += 'Ergebnis vor Steuern;' + b.ergebnis_vor_steuern + ';\n';
        }

        var blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'BWA_' + monatNamen[b.monat] + '_' + b.jahr + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch(err) {
        console.error('[BWA Download]', err);
        _showToast('Download fehlgeschlagen: ' + err.message, 'error');
    }
}

export async function showBwaFromDb(bwaId) {
    window.selectedBwaId = bwaId;
    try {
        var resp = await _sb().from('bwa_daten').select('*').eq('id', bwaId).single();
        if(resp.error) throw resp.error;
        var b = resp.data;
        // Update title
        _setTxt('bwaTitle', 'BWA ' + monatNamen[b.monat] + ' ' + b.jahr);
        _setDisp('bwaEditBtn', '');
        _setDisp('bwaDeleteBtn', '');
        // KPIs
        var marge = parseFloat(b.umsatzerloese) > 0 ? ((parseFloat(b.rohertrag)/parseFloat(b.umsatzerloese))*100).toFixed(1) : 0;
        var ergMarge = parseFloat(b.umsatzerloese) > 0 ? ((parseFloat(b.ergebnis_vor_steuern)/parseFloat(b.umsatzerloese))*100).toFixed(1) : 0;
        _setTxt('bwaKpiUmsatz', eur(b.umsatzerloese) + ' \u20AC');
        _setTxt('bwaKpiUmsatzVj', b.plan_umsatz ? 'Plan: '+eur(b.plan_umsatz)+' \u20AC' : '');
        _setTxt('bwaKpiRohertrag', eur(b.rohertrag) + ' \u20AC');
        _setTxt('bwaKpiMarge', 'Marge: '+marge+'%');
        _setTxt('bwaKpiKosten', eur(b.gesamtkosten) + ' \u20AC');
        _setTxt('bwaKpiKostenVj', b.plan_gesamtkosten ? 'Plan: '+eur(b.plan_gesamtkosten)+' \u20AC' : '');
        var ergEl = _el('bwaKpiErgebnis');
        if(ergEl) { ergEl.textContent = eur(b.ergebnis_vor_steuern) + ' \u20AC'; ergEl.className = 'text-xl font-bold ' + (parseFloat(b.ergebnis_vor_steuern) >= 0 ? 'text-green-600' : 'text-red-600'); }
        _setTxt('bwaKpiErgebnisMarge', 'Marge: '+ergMarge+'%');

        // Detail table - try loading from bwa_detail_positionen first
        var detailResp = await _sb().from('bwa_detail_positionen').select('*').eq('bwa_id', bwaId).order('sortierung');
        var detailRows = (detailResp.data && detailResp.data.length > 0) ? detailResp.data : null;

        // Recalculate KPIs from detail positions if available (sign-inversion correction)
        if(detailRows) {
            var sumMap = {};
            detailRows.forEach(function(d) { if(d.ist_summenzeile && d.zeile) sumMap[d.zeile] = d; });
            // BWA Zeilen: 1000=Umsatzerlöse, 1040=Rohertrag, 1300=Betriebsergebnis, 1355=Vorl.Ergebnis
            var detUmsatz = sumMap[1000] ? parseFloat(sumMap[1000].wert)||0 : parseFloat(b.umsatzerloese)||0;
            var detRohertrag = sumMap[1040] ? parseFloat(sumMap[1040].wert)||0 : parseFloat(b.rohertrag)||0;
            var detErgebnis = sumMap[1355] ? parseFloat(sumMap[1355].wert)||0 : (sumMap[1300] ? parseFloat(sumMap[1300].wert)||0 : parseFloat(b.ergebnis_vor_steuern)||0);
            // Gesamtkosten berechnen: Summe aller Kostenpositionen aus Detail-Zeilen
            var detKosten = 0;
            // Methode 1: Direkt aus Summenzeile 1250 (Gesamtkosten) oder 1260 (Summe Aufwendungen)
            if(sumMap[1250]) { detKosten = parseFloat(sumMap[1250].wert)||0; }
            else if(sumMap[1260]) { detKosten = parseFloat(sumMap[1260].wert)||0; }
            else {
                // Methode 2: Alle Kostengruppen-Summen addieren
                var kostenZeilen = [1140,1160,1170,1175,1180,1190,1200,1210,1220,1240];
                var kostenSumme = 0;
                kostenZeilen.forEach(function(z) {
                    if(sumMap[z]) kostenSumme += Math.abs(parseFloat(sumMap[z].wert)||0);
                });
                if(kostenSumme > 0) { detKosten = -kostenSumme; }
                else if(detRohertrag) {
                    // Methode 3: Rohertrag - Betriebsergebnis
                    var betriebsErg = sumMap[1270] ? parseFloat(sumMap[1270].wert)||0 : (sumMap[1300] ? parseFloat(sumMap[1300].wert)||0 : 0);
                    if(betriebsErg) detKosten = betriebsErg - detRohertrag;
                }
            }
            // Override KPIs with corrected values
            var detMarge = detUmsatz > 0 ? ((detRohertrag/detUmsatz)*100).toFixed(1) : 0;
            var detErgMarge = detUmsatz > 0 ? ((detErgebnis/detUmsatz)*100).toFixed(1) : 0;
            _setTxt('bwaKpiUmsatz', eur(detUmsatz) + ' \u20AC');
            _setTxt('bwaKpiRohertrag', eur(detRohertrag) + ' \u20AC');
            _setTxt('bwaKpiMarge', 'Marge: '+detMarge+'%');
            if(detKosten) _setTxt('bwaKpiKosten', eur(detKosten) + ' \u20AC');
            var ergEl2 = _el('bwaKpiErgebnis');
            if(ergEl2) { ergEl2.textContent = eur(detErgebnis) + ' \u20AC'; ergEl2.className = 'text-xl font-bold ' + (detErgebnis >= 0 ? 'text-green-600' : 'text-red-600'); }
            _setTxt('bwaKpiErgebnisMarge', 'Marge: '+detErgMarge+'%');
            // Permanently fix wrong values in bwa_daten
            if(Math.abs(detErgebnis - (parseFloat(b.ergebnis_vor_steuern)||0)) > 1) {
                var fixData = {ergebnis_vor_steuern: detErgebnis, rohertrag: detRohertrag, umsatzerloese: detUmsatz};
                if(detKosten && Math.abs(detKosten - (parseFloat(b.gesamtkosten)||0)) > 1) fixData.gesamtkosten = detKosten;
                _sb().from('bwa_daten').update(fixData).eq('id', bwaId).then(function(r){
                    if(!r.error) { console.log('[BWA] DB values corrected for', bwaId); loadBwaList(); }
                    else console.warn('[BWA] DB fix failed:', r.error);
                });
            }
        }

        var tbody = '';
        if(detailRows) {
            // Zeige alle Detail-Positionen aus dem Parser
            var lastGruppe = '';
            detailRows.forEach(function(d) {
                var isSumme = d.ist_summenzeile;
                var isDetail = d.ebene >= 2;
                var cls = isSumme ? 'bg-gray-50 border-b-2 border-gray-300' : 'border-b border-gray-100';
                var tdBold = isSumme ? 'font-semibold' : '';
                var indent = isDetail ? 'pl-6 text-xs text-gray-500' : (d.ebene === 1 ? 'pl-3 text-sm' : '');

                // Gruppenheader
                if(isSumme && d.kontengruppe && d.kontengruppe !== lastGruppe) {
                    lastGruppe = d.kontengruppe;
                }

                // Highlight für wichtige Summenzeilen
                var hlCls = '';
                if(d.kontengruppe === 'Rohertrag' && isSumme) { cls = 'bg-blue-50 border-b-2 border-blue-200'; hlCls = 'text-blue-800'; }
                if(d.kontengruppe === 'Ergebnis' && isSumme) {
                    var ergVal = parseFloat(d.wert)||0;
                    cls = (ergVal >= 0 ? 'bg-green-50 border-t-2 border-green-400' : 'bg-red-50 border-t-2 border-red-400');
                    hlCls = ergVal >= 0 ? 'text-green-800' : 'text-red-800';
                }
                if(d.kontengruppe === 'Betriebsergebnis' && isSumme) cls = 'bg-orange-50 border-b-2 border-orange-200';
                if(d.kontengruppe === 'Gesamtkosten' || d.kontengruppe === 'Summe Aufwendungen') cls = 'bg-gray-100 border-b-2 border-gray-400';

                tbody += '<tr class="'+cls+'">';
                tbody += '<td class="py-1.5 px-3 '+tdBold+' '+hlCls+' '+indent+'">';
                if(isDetail && d.konto) tbody += '<span class="text-gray-400 text-[10px] mr-1">'+d.konto+'</span> ';
                tbody += (d.bezeichnung||'')+'</td>';
                tbody += '<td class="text-right py-1.5 px-3 '+tdBold+' '+hlCls+' '+eurColor(d.wert)+'">'+eur(d.wert)+'</td>';
                tbody += '<td class="text-right py-1.5 px-3 text-gray-400">'+(d.wert_kumuliert ? eur(d.wert_kumuliert) : '\u2014')+'</td>';
                tbody += '<td class="text-right py-1.5 px-3 text-gray-400">'+(d.wert_vorjahr ? eur(d.wert_vorjahr) : '\u2014')+'</td>';
                tbody += '<td class="text-right py-1.5 px-3 text-gray-300">'+(d.prozent_gesamtleistung ? d.prozent_gesamtleistung+'%' : '')+'</td>';
                tbody += '</tr>';
            });
            // Update table header for detail view
            document.querySelector('#bwaDetailTable thead tr').innerHTML =
                '<th class="text-left py-2 px-3 font-semibold text-gray-600">Position</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">Monat</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">Kumuliert</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">Vorjahr</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">%</th>';
        } else {
            // Fallback: Standard-Ansicht aus Zusammenfassung
            var rows = [
                {label:'Umsatzerloese', ist:b.umsatzerloese, plan:b.plan_umsatz, bold:true},
                {label:'  Fahrraeder', ist:b.davon_fahrraeder, sub:true},
                {label:'  Teile & Zubehoer', ist:b.davon_teile, sub:true},
                {label:'  Service / Reparatur', ist:b.davon_service, sub:true},
                {label:'  Skonti', ist:b.davon_skonti, sub:true},
                {label:'Wareneinsatz', ist:b.wareneinsatz, plan:b.plan_wareneinsatz, bold:true, bg:'bg-gray-50'},
                {label:'Rohertrag', ist:b.rohertrag, plan:b.plan_rohertrag, bold:true, bg:'bg-blue-50', highlight:'text-blue-800'},
                {label:'Personalkosten', ist:b.personalkosten, plan:b.plan_personalkosten, bold:true},
                {label:'Raumkosten', ist:b.raumkosten, plan:b.plan_raumkosten, bold:true},
                {label:'Werbe-/Reisekosten', ist:b.werbekosten, plan:b.plan_werbekosten, bold:true},
                {label:'Kosten Warenabgabe', ist:b.kosten_warenabgabe, bold:true},
                {label:'Abschreibungen', ist:b.abschreibungen, bold:true},
                {label:'Sonstige Kosten', ist:b.sonstige_kosten, bold:true},
                {label:'Gesamtkosten', ist:b.gesamtkosten, plan:b.plan_gesamtkosten, bold:true, bg:'bg-gray-50', separator:true},
                {label:'Betriebsergebnis', ist:b.betriebsergebnis, bold:true},
                {label:'Zinsaufwand', ist:b.zinsaufwand, bold:true},
                {label:'Ergebnis vor Steuern', ist:b.ergebnis_vor_steuern, plan:b.plan_ergebnis, bold:true, bg:parseFloat(b.ergebnis_vor_steuern)>=0?'bg-green-50':'bg-red-50', highlight:parseFloat(b.ergebnis_vor_steuern)>=0?'text-green-800':'text-red-800', separator:true, big:true}
            ];
            // Restore default header
            document.querySelector('#bwaDetailTable thead tr').innerHTML =
                '<th class="text-left py-2 px-3 font-semibold text-gray-600">Position</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">IST</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">Plan</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">Abweichung</th>'
                +'<th class="text-right py-2 px-3 font-semibold text-gray-600">VJ</th>';
            rows.forEach(function(r) {
                var cls = (r.separator?'border-t-2 border-gray-800 ':'border-b ') + (r.bg||'');
                var tdCls = r.bold ? 'font-semibold' : '';
                var hlCls = r.highlight || '';
                var sz = r.big ? 'text-base' : '';
                var indent = r.sub ? 'pl-6 text-gray-600 text-xs' : '';
                tbody += '<tr class="'+cls+'">';
                tbody += '<td class="py-2 px-3 '+tdCls+' '+hlCls+' '+sz+' '+indent+'">'+r.label.trim()+'</td>';
                tbody += '<td class="text-right py-2 px-3 '+tdCls+' '+hlCls+' '+sz+' '+eurColor(r.ist)+'">'+eur(r.ist)+'</td>';
                tbody += '<td class="text-right py-2 px-3 text-gray-400">'+(r.plan?eur(r.plan):'\u2014')+'</td>';
                tbody += diffHtml(r.ist, r.plan);
                tbody += '<td class="text-right py-2 px-3 text-gray-400">\u2014</td>';
                tbody += '</tr>';
            });
        }
        document.getElementById('bwaDetailBody').innerHTML = tbody;

        // Load trend
        loadBwaTrend(b.standort_id, b.jahr);
        // Refresh file list highlight
        loadBwaList();

        // Run and display validation
        var valBanner = document.getElementById('bwaValidationBanner');
        if(valBanner) {
            try {
                var valResp = await _sb().rpc('validate_bwa', {p_bwa_id: bwaId});
                if(valResp.data) {
                    var vd = valResp.data;
                    var checks = vd.checks || [];
                    var umsatzVal = Math.abs(parseFloat(b.umsatzerloese)||50000);
                    var threshold = umsatzVal * 0.02; // 2% tolerance
                    var failed = checks.filter(function(c) { return c.pass === false && Math.abs(c.diff||0) >= threshold; });
                    var minor = checks.filter(function(c) { return c.pass === false && Math.abs(c.diff||0) < threshold; });
                    var hasNotes = checks.filter(function(c) { return c.note; });

                    if(failed.length === 0) {
                        valBanner.className = 'mt-3 p-3 rounded-lg border text-xs';
                        valBanner.style.background = '#f0fdf4';
                        valBanner.style.borderColor = '#bbf7d0';
                        var infoTxt = '<div class="flex items-center gap-2"><span class="text-green-600 font-bold">\u2705 Validierung bestanden</span><span class="text-gray-400">\u00b7 ' + checks.length + ' Pr\u00fcfungen OK</span></div>';
                        if(minor.length > 0) {
                            infoTxt += '<div class="text-gray-400 mt-1">' + minor.length + ' minimale Rundungsdifferenz' + (minor.length>1?'en':'') + ' (&lt;2%) \u2014 unbedenklich</div>';
                        }
                        valBanner.innerHTML = infoTxt;
                    } else {
                        valBanner.className = 'mt-3 p-3 rounded-lg border text-xs';
                        valBanner.style.background = vd.status === 'error' ? '#fef2f2' : '#fffbeb';
                        valBanner.style.borderColor = vd.status === 'error' ? '#fecaca' : '#fde68a';
                        var icon = vd.status === 'error' ? '\u274C' : '\u26a0\ufe0f';
                        var vh = '<div class="flex items-center gap-2 mb-2"><span class="font-bold" style="color:' + (vd.status === 'error' ? '#dc2626' : '#d97706') + '">' + icon + ' ' + failed.length + ' Abweichung' + (failed.length > 1 ? 'en' : '') + ' gefunden</span></div>';
                        vh += '<div class="space-y-1">';
                        failed.forEach(function(c) {
                            vh += '<div class="flex items-start gap-1.5">';
                            vh += '<span style="color:#d97706">\u26a0</span>';
                            vh += '<div><strong>' + c.check + '</strong>';
                            if(c.diff !== undefined) vh += ' \u2014 Differenz: ' + Number(c.diff).toLocaleString('de-DE') + ' \u20AC';
                            if(c.note) vh += '<div class="text-gray-500 mt-0.5">' + c.note + '</div>';
                            vh += '</div></div>';
                        });
                        vh += '</div>';
                        valBanner.innerHTML = vh;
                    }
                } else { valBanner.className = 'hidden'; }
            } catch(valErr) {
                valBanner.className = 'hidden';
                console.warn('BWA Validation display error:', valErr);
            }
        }
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); }
}

export async function loadBwaTrend(stdId, jahr) {
    var sec = document.getElementById('bwaTrendSection');
    var cards = document.getElementById('bwaTrendCards');
    if(!sec||!cards) return;
    // HQ-User ohne Standort: Trend ausblenden statt alle Standorte zu mischen
    if(!stdId) { sec.style.display = 'none'; return; }
    try {
        var query = _sb().from('bwa_daten').select('monat,umsatzerloese,rohertrag,gesamtkosten,ergebnis_vor_steuern').eq('jahr', jahr).eq('standort_id', stdId).order('monat');
        var resp = await query;
        if(resp.error || !resp.data || resp.data.length < 2) { sec.style.display = 'none'; return; }
        sec.style.display = '';
        var data = resp.data;
        var metrics = [
            {label:'Umsatz',key:'umsatzerloese',color:'#22C55E',bg:'bg-green-50'},
            {label:'Rohertrag',key:'rohertrag',color:'#3B82F6',bg:'bg-blue-50'},
            {label:'Ergebnis',key:'ergebnis_vor_steuern',color:'#EF7D00',bg:'bg-orange-50'},
            {label:'Gesamtkosten',key:'gesamtkosten',color:'#EF4444',bg:'bg-red-50'}
        ];
        var h = '';
        metrics.forEach(function(m) {
            var vals = data.map(function(d){return parseFloat(d[m.key])||0;});
            var labels = data.map(function(d){return monatNamen[d.monat].substring(0,3);});
            var last = vals[vals.length-1];
            var prev = vals.length>1 ? vals[vals.length-2] : last;
            var change = prev!==0 ? Math.round((last-prev)/Math.abs(prev)*100) : 0;
            var totalYTD = vals.reduce(function(a,b){return a+b;},0);
            // Sparkline SVG
            var minV=Math.min.apply(null,vals); var maxV=Math.max.apply(null,vals); var range=maxV-minV||1;
            var sw=120; var sh=35;
            var pts = vals.map(function(v,i){return Math.round(i/(vals.length-1)*sw)+','+Math.round(sh-(v-minV)/range*sh);});
            // Fill area
            var areaPts = pts.join(' ')+' '+sw+','+sh+' 0,'+sh;
            h += '<div class="p-3 '+m.bg+' rounded-lg">';
            h += '<p class="text-xs text-gray-500 mb-1">'+m.label+'</p>';
            h += '<p class="text-lg font-bold text-gray-800">'+eur(last)+' \u20AC</p>';
            h += '<div class="flex items-center justify-between">';
            h += '<p class="text-xs '+(change>=0?'text-green-600':'text-red-600')+'">'+(change>=0?'\u2191':'\u2193')+' '+(change>=0?'+':'')+change+'%</p>';
            h += '<p class="text-xs text-gray-400">YTD: '+eur(totalYTD)+'</p>';
            h += '</div>';
            h += '<svg width="'+sw+'" height="'+(sh+2)+'" class="mt-1">';
            h += '<polygon points="'+areaPts+'" fill="'+m.color+'" fill-opacity="0.15"/>';
            h += '<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+m.color+'" stroke-width="2" stroke-linejoin="round"/>';
            // Last point dot
            var lastPt = pts[pts.length-1].split(',');
            h += '<circle cx="'+lastPt[0]+'" cy="'+lastPt[1]+'" r="3" fill="'+m.color+'"/>';
            h += '</svg>';
            h += '</div>';
        });
        cards.innerHTML = h;
    } catch(e) { sec.style.display = 'none'; }
}

// === DELETE BWA ===
export async function deleteBwa() {
    if(!window.selectedBwaId) return;
    if(!confirm('BWA wirklich l\u00f6schen?')) return;
    try {
        // Fix 4: Detail-Positionen zuerst löschen (FK-Constraint)
        await _sb().from('bwa_detail_positionen').delete().eq('bwa_id', window.selectedBwaId);
        var resp = await _sb().from('bwa_daten').delete().eq('id', window.selectedBwaId);
        if(resp.error) throw resp.error;
        window.selectedBwaId = null;
        _setTxt('bwaTitle', 'BWA ausw\u00e4hlen');
        var body = _el('bwaDetailBody');
        if(body) body.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">BWA gel\u00f6scht.</td></tr>';
        _setDisp('bwaEditBtn', 'none');
        _setDisp('bwaDeleteBtn', 'none');
        _setDisp('bwaTrendSection', 'none');
        _setTxt('bwaKpiUmsatz', '\u2014');
        _setTxt('bwaKpiRohertrag', '\u2014');
        _setTxt('bwaKpiKosten', '\u2014');
        _setTxt('bwaKpiErgebnis', '\u2014');
        loadBwaList();
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); }
}

// === Window Exports ===
const _exports = {loadBwaList, downloadBwa, showBwaFromDb, loadBwaTrend, deleteBwa};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
// Extra explicit export for view-router
window.loadBwaList = loadBwaList;
