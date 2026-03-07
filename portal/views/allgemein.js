/**
 * views/allgemein.js - Partner-Portal Allgemein Module
 *
 * Handles: Jahresziele, Monatsplan, Journal (Stimmung, Themen, Maßnahmen, Wünsche),
 *          Allgemein-Übersicht, HQ Allgemein aggregation
 *
 * Globals: allgemeinJahresziele, allgemeinMonatsplan, allgemeinJournal (shared state)
 *
 * @module views/allgemein
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// Gruppen-Standort-IDs laden (gemeinsame BWA via firma_name)
async function _getGruppenStandortIds(stdId) {
    try {
        var stdResp = await _sb().from('standorte')
            .select('firma_name, gemeinsame_bwa').eq('id', stdId).single();
        var std = (!stdResp.error && stdResp.data) ? stdResp.data : null;
        if (std && std.gemeinsame_bwa && std.firma_name) {
            var firmaResp = await _sb().from('standorte')
                .select('id').eq('firma_name', std.firma_name);
            if (!firmaResp.error && firmaResp.data && firmaResp.data.length > 1) {
                return firmaResp.data.map(function(s){ return s.id; });
            }
        }
    } catch(e) { /* Fallback */ }
    return null; // null = nur eigener Standort
}
function _showView(v) { if (window.showView) window.showView(v); }

// === ALLGEMEIN MODULE (Jahresziele, Monatsplan, Journal) ===
// ╔══════════════════════════════════════════════════════════════╗
// ║  vit:bikes – MODUL ALLGEMEIN: JavaScript (komplett)         ║
// ║  Einsetzen im <script>-Block der index.html                 ║
// ║  ERSETZE die bestehende showAllgemeinTab() Funktion!        ║
// ╚══════════════════════════════════════════════════════════════╝

// --- State ---
var allgemeinJahresziele = [];
var allgemeinMonatsplan = [];
var allgemeinJournal = [];
var allgemeinAktuellerMonat = new Date().getMonth() + 1;
var allgemeinJahr = new Date().getFullYear();
var monatsDetailEditMonat = null;
var journalStimmungValue = '';
var monatsNamen = ['', 'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

// ============================================================
// TAB NAVIGATION (ERSETZE bestehende showAllgemeinTab!)
// ============================================================

export function showAllgemeinTab(tabName) {
    document.querySelectorAll('[id^="allgemeinTabContent-"]').forEach(function(el) {
        el.style.display = 'none';
    });
    document.querySelectorAll('#allgemeinTabs button').forEach(function(btn) {
        btn.className = 'px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition text-gray-500 hover:text-gray-700';
    });
    var content = document.getElementById('allgemeinTabContent-' + tabName);
    if (content) content.style.display = 'block';
    var btn = document.getElementById('allgemeinTab-' + tabName);
    if (btn) btn.className = 'px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition bg-white text-vit-orange shadow-sm';

    if (tabName === 'uebersicht') renderAllgemeinUebersicht();
    if (tabName === 'jahresziele') loadJahresziele();
    if (tabName === 'monatsplan') loadMonatsplan();
    if (tabName === 'journal') loadJournal();
}

// ============================================================
// MASTER LOAD
// ============================================================

export async function loadAllgemeinData() {
    if (!_sbProfile()) { console.warn('[allgemein] Profile not loaded yet, skipping'); return; }
    try {
        await Promise.all([loadJahresziele(), loadMonatsplan(), loadJournal()]);
        renderAllgemeinUebersicht();
        if(typeof window.loadHomeWidgets==='function') window.loadHomeWidgets();
    } catch (err) {
        console.error('Fehler loadAllgemeinData:', err);
    }
}

// ============================================================
// JAHRESZIELE
// ============================================================

export async function loadJahresziele() {
    try {
        var query = _sb().from('partner_jahresziele').select('*')
            .eq('jahr', allgemeinJahr)
            .order('sortierung', {ascending: true});
        if (_sbProfile() && !_sbProfile().is_hq) {
            var jzStdId = _sbProfile().standort_id;
            var jzGrpIds = await _getGruppenStandortIds(jzStdId);
            if (jzGrpIds) { query = query.in('standort_id', jzGrpIds); }
            else { query = query.eq('standort_id', jzStdId); }
        }
        var res = await query;
        if (res.error) throw res.error;
        allgemeinJahresziele = res.data || [];
        renderJahresziele();
    } catch (err) { console.error('loadJahresziele:', err); }
}

export function renderJahresziele() {
    var hart = allgemeinJahresziele.filter(function(z){return z.typ==='umsatz'||z.typ==='deckungsbeitrag';});
    var smart = allgemeinJahresziele.filter(function(z){return z.typ==='smart';});
    var soft = allgemeinJahresziele.filter(function(z){return z.typ==='soft_target';});

    var el = document.getElementById('jahreszieleHart');
    if (el) {
        if (!hart.length) {
            el.innerHTML = '<div class="vit-card p-4 text-center text-gray-400 text-sm">Noch keine Umsatz-/Ertragsziele definiert</div>';
        } else {
            el.innerHTML = hart.map(function(z){
                var pct = z.zielwert > 0 ? Math.round((z.aktueller_wert/z.zielwert)*100) : 0;
                var barColor = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-vit-orange';
                return '<div class="vit-card p-4"><div class="flex items-center justify-between mb-2"><div><h4 class="font-bold text-gray-800">'+escH(z.titel)+'</h4>'
                  +(z.beschreibung?'<p class="text-xs text-gray-500">'+escH(z.beschreibung)+'</p>':'')
                  +'</div><div class="text-right"><span class="text-lg font-bold text-vit-orange">'+pct+'%</span>'
                  +'<p class="text-xs text-gray-500">'+fmtN(z.aktueller_wert)+' / '+fmtN(z.zielwert)+' '+(z.einheit||'€')+'</p></div></div>'
                  +'<div class="w-full bg-gray-200 rounded-full h-2.5"><div class="'+barColor+' h-2.5 rounded-full transition-all" style="width:'+Math.min(pct,100)+'%"></div></div>'
                  +'<div class="flex justify-end mt-2 space-x-3"><button onclick="openJahreszielEdit(\''+z.id+'\')" class="text-xs text-gray-400 hover:text-gray-600">Bearbeiten</button>'
                  +'<button onclick="deleteJahresziel(\''+z.id+'\')" class="text-xs text-red-400 hover:text-red-600">Löschen</button></div></div>';
            }).join('');
        }
    }

    el = document.getElementById('jahreszieleSmart');
    if (el) {
        if (!smart.length) {
            el.innerHTML = '<div class="vit-card p-4 text-center text-gray-400 text-sm">Noch keine SMART-Ziele definiert</div>';
        } else {
            el.innerHTML = smart.map(function(z){
                var pct = z.zielwert > 0 ? Math.round((z.aktueller_wert/z.zielwert)*100) : 0;
                var badge = z.status==='erreicht'?'<span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Erreicht</span>'
                    : z.status==='gefaehrdet'?'<span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">⚠ Gefährdet</span>'
                    : '<span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Aktiv</span>';
                return '<div class="vit-card p-4"><div class="flex items-center justify-between mb-2">'
                  +'<h4 class="font-bold text-gray-800 flex-1">'+escH(z.titel)+'</h4>'
                  +'<div class="flex items-center space-x-2">'+badge
                  +(z.zielwert>0?'<span class="text-sm font-bold text-blue-600">'+pct+'%</span>':'')
                  +'</div></div>'
                  +(z.beschreibung?'<p class="text-xs text-gray-500 mb-2 whitespace-pre-line">'+escH(z.beschreibung)+'</p>':'')
                  +(z.zielwert>0?'<div class="w-full bg-gray-200 rounded-full h-2 mb-2"><div class="bg-blue-500 h-2 rounded-full" style="width:'+Math.min(pct,100)+'%"></div></div>':'')
                  +'<div class="flex justify-end space-x-3"><button onclick="openJahreszielEdit(\''+z.id+'\')" class="text-xs text-gray-400 hover:text-gray-600">Bearbeiten</button>'
                  +'<button onclick="deleteJahresziel(\''+z.id+'\')" class="text-xs text-red-400 hover:text-red-600">Löschen</button></div></div>';
            }).join('');
        }
    }

    el = document.getElementById('jahreszieleSoft');
    if (el) {
        if (!soft.length) {
            el.innerHTML = '<div class="vit-card p-4 text-center text-gray-400 text-sm">Noch keine Soft Targets definiert</div>';
        } else {
            el.innerHTML = soft.map(function(z){
                var ck = z.ist_abgehakt ? 'checked' : '';
                var strike = z.ist_abgehakt ? 'line-through text-gray-400' : 'text-gray-800';
                return '<div class="vit-card p-3 flex items-center justify-between">'
                  +'<label class="flex items-center space-x-3 cursor-pointer flex-1">'
                  +'<input type="checkbox" '+ck+' onchange="toggleSoftTarget(\''+z.id+'\',this.checked)" class="w-4 h-4 rounded border-gray-300 text-vit-orange focus:ring-orange-400">'
                  +'<span class="text-sm font-semibold '+strike+'">'+escH(z.titel)+'</span></label>'
                  +'<button onclick="deleteJahresziel(\''+z.id+'\')" class="text-xs text-red-400 hover:text-red-600 ml-2">✕</button></div>';
            }).join('');
        }
    }
}

function fmtN(n) { return (!n && n !== 0) ? '0' : Number(n).toLocaleString('de-DE'); }
function escH(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

export function openJahreszielModal() {
    var modal = document.getElementById('jahreszielModal');
    if(!modal) return;
    document.getElementById('jahreszielEditId').value = '';
    var el;
    el = document.getElementById('jahreszielTyp'); if(el) el.value = 'umsatz';
    el = document.getElementById('jahreszielTitel'); if(el) el.value = '';
    el = document.getElementById('jahreszielBeschreibung'); if(el) el.value = '';
    el = document.getElementById('jahreszielZielwert'); if(el) el.value = '';
    el = document.getElementById('jahreszielAktuellerWert'); if(el) el.value = '';
    el = document.getElementById('jahreszielEinheit'); if(el) el.value = '€';
    toggleJahreszielFelder();
    modal.style.display = 'flex';
}

export function openJahreszielEdit(id) {
    var z = allgemeinJahresziele.find(function(x){return x.id===id;});
    if (!z) return;
    var modal = document.getElementById('jahreszielModal');
    if(!modal) return;
    document.getElementById('jahreszielEditId').value = z.id;
    var el;
    el = document.getElementById('jahreszielTyp'); if(el) el.value = z.typ;
    el = document.getElementById('jahreszielTitel'); if(el) el.value = z.titel||'';
    el = document.getElementById('jahreszielBeschreibung'); if(el) el.value = z.beschreibung||'';
    el = document.getElementById('jahreszielZielwert'); if(el) el.value = z.zielwert||'';
    el = document.getElementById('jahreszielAktuellerWert'); if(el) el.value = z.aktueller_wert||'';
    el = document.getElementById('jahreszielEinheit'); if(el) el.value = z.einheit||'€';
    toggleJahreszielFelder();
    modal.style.display = 'flex';
}
export function closeJahreszielModal() { var el=document.getElementById('jahreszielModal'); if(el) el.style.display='none'; }

export function toggleJahreszielFelder() {
    var typEl = document.getElementById('jahreszielTyp');
    if(!typEl) return;
    var typ = typEl.value;
    var wEl = document.getElementById('jahreszielWerteWrap'); if(wEl) wEl.style.display = typ==='soft_target' ? 'none' : 'grid';
    var bEl = document.getElementById('jahreszielBeschreibungWrap'); if(bEl) bEl.style.display = typ==='soft_target' ? 'none' : 'block';
}

export async function saveJahresziel() {
    var p = _sbProfile();
    if(!p || !p.standort_id) { _showToast('Kein Standort zugewiesen', 'error'); return; }
    var editId = document.getElementById('jahreszielEditId').value;
    var payload = {
        standort_id: p.standort_id, jahr: allgemeinJahr,
        typ: document.getElementById('jahreszielTyp').value,
        titel: document.getElementById('jahreszielTitel').value.trim(),
        beschreibung: document.getElementById('jahreszielBeschreibung').value.trim(),
        zielwert: parseFloat(document.getElementById('jahreszielZielwert').value)||0,
        aktueller_wert: parseFloat(document.getElementById('jahreszielAktuellerWert').value)||0,
        einheit: document.getElementById('jahreszielEinheit').value,
        status: 'aktiv', ist_abgehakt: false, sortierung: allgemeinJahresziele.length + 1
    };
    if (!payload.titel) { _showToast(_t('alert_enter_title'), 'error'); return; }
    try {
        var res = editId ? await _sb().from('partner_jahresziele').update(payload).eq('id', editId) : await _sb().from('partner_jahresziele').insert([payload]);
        if (res.error) throw res.error;
        window.logAudit && window.logAudit(editId ? 'jahresziel_bearbeitet' : 'jahresziel_erstellt', 'allgemein', { titel: payload.titel });
        closeJahreszielModal(); loadJahresziele();
    } catch(e) { _showToast('Fehler: '+e.message, 'error'); }
}

export async function deleteJahresziel(id) {
    if (!confirm(_t('confirm_delete_goal'))) return;
    try { var r = await _sb().from('partner_jahresziele').delete().eq('id', id); if (r.error) throw r.error; window.logAudit && window.logAudit('jahresziel_geloescht', 'allgemein', { id: id }); loadJahresziele(); } catch(e) { _showToast('Fehler: '+e.message, 'error'); }
}

export async function toggleSoftTarget(id, checked) {
    try { await _sb().from('partner_jahresziele').update({ist_abgehakt:checked, status:checked?'erreicht':'aktiv'}).eq('id',id); loadJahresziele(); } catch(e) { console.error(e); }
}

// ============================================================
// MONATSPLAN
// ============================================================

export async function loadMonatsplan() {
    try {
        var query = _sb().from('partner_monatsplan').select('*').eq('jahr', allgemeinJahr).order('monat',{ascending:true});
        if (_sbProfile() && !_sbProfile().is_hq) {
            var mpStdId = _sbProfile().standort_id;
            var mpGrpIds = await _getGruppenStandortIds(mpStdId);
            if (mpGrpIds) { query = query.in('standort_id', mpGrpIds); }
            else { query = query.eq('standort_id', mpStdId); }
        }
        var res = await query;
        if (res.error) throw res.error;
        allgemeinMonatsplan = res.data || [];
        var pStdId = _sbProfile() ? _sbProfile().standort_id : null;
        for (var m = 1; m <= 12; m++) {
            if (!allgemeinMonatsplan.find(function(p){return p.monat===m;})) {
                allgemeinMonatsplan.push({id:null, standort_id:pStdId, jahr:allgemeinJahr, monat:m, fokus_thema:'', beschreibung:'', massnahmen:[], verknuepfte_ziele:[], reflexion:'', status:'offen'});
            }
        }
        allgemeinMonatsplan.sort(function(a,b){return a.monat-b.monat;});
        renderMonatsplan();
    } catch(e) { console.error('loadMonatsplan:',e); }
}

export function renderMonatsplan() {
    var c = document.getElementById('monatsplanContent');
    if (!c) return;
    c.innerHTML = allgemeinMonatsplan.map(function(mp){
        var isAkt = mp.monat === allgemeinAktuellerMonat;
        var isVerg = mp.monat < allgemeinAktuellerMonat;
        var isDone = mp.status === 'abgeschlossen';
        var border = isAkt ? 'border-l-4 border-vit-orange' : isDone ? 'border-l-4 border-green-500' : isVerg ? 'border-l-4 border-gray-300' : '';
        var bg = isAkt ? 'bg-orange-50' : '';
        var icon = isDone ? '✅' : isAkt ? '🔶' : isVerg ? '⬜' : '○';
        var hasFokus = mp.fokus_thema && mp.fokus_thema.trim().length > 0;
        var mCount = 0, mDone = 0;
        if (mp.massnahmen && Array.isArray(mp.massnahmen)) { mCount = mp.massnahmen.length; mDone = mp.massnahmen.filter(function(x){return x.erledigt;}).length; }
        return '<div class="vit-card p-4 '+border+' '+bg+' cursor-pointer hover:shadow-lg transition" onclick="openMonatsDetail('+mp.monat+')">'
          +'<div class="flex items-center justify-between"><div class="flex items-center space-x-3"><span class="text-lg">'+icon+'</span><div>'
          +'<span class="font-bold text-gray-800">'+monatsNamen[mp.monat]+'</span>'
          +(isAkt?' <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-vit-orange ml-2">Aktuell</span>':'')
          +'<p class="text-sm '+(hasFokus?'text-gray-600':'text-gray-400 italic')+'">'+(hasFokus?escH(mp.fokus_thema):'Kein Fokus definiert – klicke zum Bearbeiten')+'</p>'
          +'</div></div><div class="flex items-center space-x-4">'
          +(mCount>0?'<span class="text-xs text-gray-500">'+mDone+'/'+mCount+' Maßnahmen</span>':'')
          +'<span class="text-gray-300">›</span></div></div></div>';
    }).join('');
}

export function openMonatsDetail(monat) {
    monatsDetailEditMonat = monat;
    var mp = allgemeinMonatsplan.find(function(p){return p.monat===monat;});
    if (!mp) return;
    var titelEl = document.getElementById('monatsDetailTitel');
    if(!titelEl) return;
    titelEl.textContent = '📅 ' + monatsNamen[monat] + ' ' + allgemeinJahr;
    var fokusEl = document.getElementById('monatsDetailFokus'); if(fokusEl) fokusEl.value = mp.fokus_thema || '';
    var beschrEl = document.getElementById('monatsDetailBeschreibung'); if(beschrEl) beschrEl.value = mp.beschreibung || '';
    var reflEl = document.getElementById('monatsDetailReflexion'); if(reflEl) reflEl.value = mp.reflexion || '';
    var reflWrap = document.getElementById('monatsDetailReflexionWrap'); if(reflWrap) reflWrap.style.display = monat <= allgemeinAktuellerMonat ? 'block' : 'none';

    var mc = document.getElementById('monatsDetailMassnahmen');
    if(!mc) return;
    mc.innerHTML = (mp.massnahmen||[]).map(function(m,i){
        return '<div class="flex items-center space-x-2">'
          +'<input type="checkbox" '+(m.erledigt?'checked':'')+' class="monats-massnahme-cb w-4 h-4 rounded border-gray-300 text-vit-orange focus:ring-orange-400" data-index="'+i+'">'
          +'<input type="text" value="'+escH(m.text)+'" class="monats-massnahme-text flex-1 border rounded px-2 py-1 text-sm">'
          +'<button onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 text-xs">✕</button></div>';
    }).join('');

    var zc = document.getElementById('monatsDetailZiele');
    if(!zc) return;
    var vIds = mp.verknuepfte_ziele || [];
    if (!allgemeinJahresziele.length) {
        zc.innerHTML = '<p class="text-xs text-gray-400">Erst Jahresziele anlegen</p>';
    } else {
        zc.innerHTML = allgemeinJahresziele.filter(function(z){return z.typ!=='soft_target';}).map(function(z){
            var linked = vIds.indexOf(z.id) !== -1;
            return '<label class="flex items-center space-x-2 cursor-pointer"><input type="checkbox" value="'+z.id+'" class="monats-ziel-cb w-3.5 h-3.5 rounded border-gray-300 text-vit-orange focus:ring-orange-400" '+(linked?'checked':'')+'><span class="text-xs text-gray-600">'+escH(z.titel)+'</span></label>';
        }).join('');
    }
    var panel = document.getElementById('monatsDetailPanel');
    if(panel) { panel.style.display = 'block'; panel.scrollIntoView({behavior:'smooth'}); }
}

export function addMonatsMassnahme() {
    var el = document.getElementById('monatsDetailMassnahmen');
    if (el) el.insertAdjacentHTML('beforeend',
        '<div class="flex items-center space-x-2"><input type="checkbox" class="monats-massnahme-cb w-4 h-4 rounded border-gray-300 text-vit-orange focus:ring-orange-400"><input type="text" class="monats-massnahme-text flex-1 border rounded px-2 py-1 text-sm" placeholder="Neue Ma\u00dfnahme..."><button onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 text-xs">\u2715</button></div>');
}
export function closeMonatsDetail() { var el=document.getElementById('monatsDetailPanel'); if(el) el.style.display = 'none'; monatsDetailEditMonat = null; }

export async function saveMonatsDetail() {
    if (!monatsDetailEditMonat) return;
    var massnahmen = [];
    document.querySelectorAll('#monatsDetailMassnahmen > div').forEach(function(row){
        var txt = row.querySelector('.monats-massnahme-text');
        if (txt && txt.value.trim()) massnahmen.push({text: txt.value.trim(), erledigt: row.querySelector('.monats-massnahme-cb').checked});
    });
    var zielIds = [];
    document.querySelectorAll('.monats-ziel-cb:checked').forEach(function(cb){ zielIds.push(cb.value); });
    var m = monatsDetailEditMonat;
    var p = _sbProfile();
    if(!p || !p.standort_id) { _showToast('Kein Standort zugewiesen', 'error'); return; }
    var payload = { standort_id: p.standort_id, jahr: allgemeinJahr, monat: m,
        fokus_thema: document.getElementById('monatsDetailFokus').value.trim(),
        beschreibung: document.getElementById('monatsDetailBeschreibung').value.trim(),
        massnahmen: massnahmen, verknuepfte_ziele: zielIds,
        reflexion: document.getElementById('monatsDetailReflexion').value.trim(),
        status: m < allgemeinAktuellerMonat ? 'abgeschlossen' : m === allgemeinAktuellerMonat ? 'aktiv' : 'offen'
    };
    try {
        var existing = allgemeinMonatsplan.find(function(p){return p.monat===m && p.id;});
        var res = existing && existing.id ? await _sb().from('partner_monatsplan').update(payload).eq('id', existing.id) : await _sb().from('partner_monatsplan').insert([payload]);
        if (res.error) throw res.error;
        closeMonatsDetail(); loadMonatsplan();
    } catch(e) { _showToast('Fehler: '+e.message, 'error'); }
}

// ============================================================
// PARTNER-JOURNAL
// ============================================================

export async function loadJournal() {
    try {
        var query = _sb().from('partner_journal').select('*').order('datum',{ascending:false});
        if (_sbProfile() && !_sbProfile().is_hq) query = query.eq('standort_id', _sbProfile().standort_id);
        var res = await query;
        if (res.error) throw res.error;
        allgemeinJournal = res.data || [];
        renderJournal();
    } catch(e) { console.error('loadJournal:',e); }
}

export function renderJournal() {
    var c = document.getElementById('journalContent');
    if (!c) return;
    var stimmungEmojis = {positiv:'😊', neutral:'😐', besorgt:'😟', kritisch:'😤'};
    if (!allgemeinJournal.length) {
        c.innerHTML = '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-3">📝</p><p class="font-semibold">Noch keine Gesprächsprotokolle</p><p class="text-sm mt-1">Dokumentiere dein nächstes Partner-Meeting</p></div>';
        return;
    }
    c.innerHTML = allgemeinJournal.map(function(j){
        var themen = j.themen || [];
        var wuensche = j.wuensche_hq || [];
        var massnahmen = j.massnahmen || [];
        var offen = massnahmen.filter(function(m){return !m.erledigt;});
        var emoji = stimmungEmojis[j.stimmung] || '😐';
        var teiln = Array.isArray(j.teilnehmer) ? j.teilnehmer.join(', ') : (j.teilnehmer||'');
        var datFmt = j.datum ? new Date(j.datum+'T00:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';

        return '<div class="vit-card p-5">'
          +'<div class="flex items-start justify-between mb-3"><div class="flex items-center space-x-3"><span class="text-2xl">'+emoji+'</span><div>'
          +'<h4 class="font-bold text-gray-800">📅 '+datFmt+' – Partnergespräch</h4>'
          +'<p class="text-xs text-gray-500">Teilnehmer: '+escH(teiln)+'</p></div></div>'
          +'<div class="flex space-x-2"><button onclick="openJournalEdit(\''+j.id+'\')" class="text-xs text-gray-400 hover:text-gray-600">Bearbeiten</button>'
          +'<button onclick="deleteJournalEntry(\''+j.id+'\')" class="text-xs text-red-400 hover:text-red-600">Löschen</button></div></div>'
          +(themen.length?'<div class="flex flex-wrap gap-1 mb-3">'+themen.map(function(t){return '<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">'+escH(t)+'</span>';}).join('')+'</div>':'')
          +(j.aktuelle_lage?'<div class="mb-3"><p class="text-sm text-gray-700">'+escH(j.aktuelle_lage).replace(/\n/g,'<br>')+'</p></div>':'')
          +(wuensche.length?'<div class="mb-3 p-3 bg-red-50 rounded-lg"><p class="text-xs font-semibold text-red-700 mb-1">🔴 Wünsche an HQ:</p>'+wuensche.map(function(w){var t=typeof w==='string'?w:w.text; return '<p class="text-sm text-red-800">• '+escH(t)+'</p>';}).join('')+'</div>':'')
          +(massnahmen.length?'<div class="mb-2"><p class="text-xs font-semibold text-gray-600 mb-1">Maßnahmen ('+(massnahmen.length-offen.length)+'/'+massnahmen.length+' erledigt):</p>'
            +massnahmen.map(function(m){
                return '<div class="flex items-center space-x-2 text-sm"><input type="checkbox" '+(m.erledigt?'checked':'')+' onchange="toggleJournalMassnahme(\''+j.id+'\',\''+escH(m.text).replace(/'/g,"\\'")+'\',this.checked)" class="w-3.5 h-3.5 rounded">'
                  +'<span class="'+(m.erledigt?'line-through text-gray-400':'text-gray-700')+'">'+escH(m.text)+(m.verantwortlich?' <span class="text-xs text-gray-400">('+escH(m.verantwortlich)+')</span>':'')+'</span></div>';}).join('')+'</div>':'')
          +(j.naechster_termin?'<p class="text-xs text-gray-500 mt-2">📅 Nächster Termin: '+new Date(j.naechster_termin+'T00:00:00').toLocaleDateString('de-DE')+'</p>':'')
          +'</div>';
    }).join('');
}

export function openJournalModal() {
    var modal = document.getElementById('journalModal');
    if(!modal) return;
    var el;
    el=document.getElementById('journalEditId'); if(el) el.value = '';
    el=document.getElementById('journalDatum'); if(el) el.value = new Date().toISOString().split('T')[0];
    el=document.getElementById('journalStimmung'); if(el) el.value = '';
    journalStimmungValue = '';
    el=document.getElementById('journalTeilnehmer'); if(el) el.value = '';
    el=document.getElementById('journalLage'); if(el) el.value = '';
    el=document.getElementById('journalNaechsterTermin'); if(el) el.value = '';
    document.querySelectorAll('.journal-thema-cb').forEach(function(cb){cb.checked=false; updateThemaStyle(cb);});
    document.querySelectorAll('.journal-stimmung-btn').forEach(function(b){b.style.opacity='0.4'; b.style.transform='scale(1)';});
    el=document.getElementById('journalWuensche'); if(el) el.innerHTML = '';
    el=document.getElementById('journalMassnahmen'); if(el) el.innerHTML = '';
    modal.style.display = 'flex';
}

export function openJournalEdit(id) {
    var j = allgemeinJournal.find(function(x){return x.id===id;});
    if (!j) return;
    var modal = document.getElementById('journalModal');
    if(!modal) return;
    var el;
    el=document.getElementById('journalEditId'); if(el) el.value = j.id;
    el=document.getElementById('journalDatum'); if(el) el.value = j.datum||'';
    setJournalStimmung(j.stimmung||'neutral');
    el=document.getElementById('journalTeilnehmer'); if(el) el.value = Array.isArray(j.teilnehmer)?j.teilnehmer.join(', '):(j.teilnehmer||'');
    el=document.getElementById('journalLage'); if(el) el.value = j.aktuelle_lage||'';
    el=document.getElementById('journalNaechsterTermin'); if(el) el.value = j.naechster_termin||'';
    document.querySelectorAll('.journal-thema-cb').forEach(function(cb){ cb.checked = (j.themen||[]).indexOf(cb.value)!==-1; updateThemaStyle(cb); });
    var wEl = document.getElementById('journalWuensche'); if(wEl) { wEl.innerHTML=''; (j.wuensche_hq||[]).forEach(function(w){addJournalWunsch(typeof w==='string'?w:w.text);}); }
    var mEl = document.getElementById('journalMassnahmen'); if(mEl) { mEl.innerHTML=''; (j.massnahmen||[]).forEach(function(m){addJournalMassnahme(m.text,m.verantwortlich,m.frist);}); }
    modal.style.display = 'flex';
}
export function closeJournalModal() { var el=document.getElementById('journalModal'); if(el) el.style.display='none'; }

export function setJournalStimmung(val) {
    journalStimmungValue = val;
    var _js = document.getElementById('journalStimmung'); if (_js) _js.value = val;
    document.querySelectorAll('.journal-stimmung-btn').forEach(function(b){
        var match = b.getAttribute('data-val') === val;
        b.style.opacity = match ? '1' : '0.4';
        b.style.transform = match ? 'scale(1.2)' : 'scale(1)';
    });
}

export function updateThemaStyle(cb) {
    var label = cb.closest('label');
    if (!label) return;
    if (cb.checked) { label.className = label.className.replace('bg-gray-100','bg-orange-100').replace('text-gray-600','text-vit-orange'); }
    else { label.className = label.className.replace('bg-orange-100','bg-gray-100').replace('text-vit-orange','text-gray-600'); }
}
document.addEventListener('change', function(e) { if (e.target.classList.contains('journal-thema-cb')) updateThemaStyle(e.target); });

export function addJournalWunsch(text) {
    var el = document.getElementById('journalWuensche'); if (!el) return;
    el.insertAdjacentHTML('beforeend',
        '<div class="flex items-center space-x-2"><span class="text-red-500 text-xs">🔴</span>'
        +'<input type="text" value="'+escH(text||'')+'" class="journal-wunsch-text flex-1 border rounded px-2 py-1 text-sm" placeholder="Wunsch an HQ...">'
        +'<button onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 text-xs">✕</button></div>');
}
export function addJournalMassnahme(text, verantw, frist) {
    var el = document.getElementById('journalMassnahmen'); if (!el) return;
    el.insertAdjacentHTML('beforeend',
        '<div class="flex items-center space-x-2 flex-wrap gap-y-1"><span class="text-xs">☐</span>'
        +'<input type="text" value="'+escH(text||'')+'" class="journal-massnahme-text flex-1 min-w-[150px] border rounded px-2 py-1 text-sm" placeholder="Maßnahme...">'
        +'<input type="text" value="'+escH(verantw||'')+'" class="journal-massnahme-verantw w-24 border rounded px-2 py-1 text-sm" placeholder="Wer?">'
        +'<input type="date" value="'+(frist||'')+'" class="journal-massnahme-frist border rounded px-2 py-1 text-sm">'
        +'<button onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 text-xs">✕</button></div>');
}

export async function saveJournalEntry() {
    var editId = document.getElementById('journalEditId').value;
    var themen = []; document.querySelectorAll('.journal-thema-cb:checked').forEach(function(cb){themen.push(cb.value);});
    var wuensche = []; document.querySelectorAll('.journal-wunsch-text').forEach(function(inp){ if (inp.value.trim()) wuensche.push({text:inp.value.trim(), status:'offen'}); });
    var massnahmen = [];
    document.querySelectorAll('#journalMassnahmen > div').forEach(function(row){
        var t = row.querySelector('.journal-massnahme-text');
        if (t && t.value.trim()) massnahmen.push({ text: t.value.trim(), verantwortlich: (row.querySelector('.journal-massnahme-verantw')||{}).value||'', frist: (row.querySelector('.journal-massnahme-frist')||{}).value||'', erledigt: false });
    });
    var teilnStr = document.getElementById('journalTeilnehmer').value;
    var teilnehmer = teilnStr.split(',').map(function(s){return s.trim();}).filter(Boolean);
    var p = _sbProfile();
    if(!p || !p.standort_id) { _showToast('Kein Standort zugewiesen', 'error'); return; }
    var payload = { standort_id: p.standort_id, datum: (document.getElementById('journalDatum')||{}).value||'',
        teilnehmer: teilnehmer, stimmung: journalStimmungValue || 'neutral', themen: themen,
        aktuelle_lage: (document.getElementById('journalLage')||{}).value||'', wuensche_hq: wuensche, massnahmen: massnahmen,
        naechster_termin: (document.getElementById('journalNaechsterTermin')||{}).value || null, erstellt_von: _sbUser() ? _sbUser().id : null
    };
    if (!payload.datum) { _showToast(_t('alert_enter_date'), 'error'); return; }
    try {
        var res = editId ? await _sb().from('partner_journal').update(payload).eq('id', editId) : await _sb().from('partner_journal').insert([payload]);
        if (res.error) throw res.error;
        window.logAudit && window.logAudit(editId ? 'journal_bearbeitet' : 'journal_erstellt', 'allgemein', { datum: payload.datum });
        closeJournalModal(); loadJournal();
    } catch(e) { _showToast('Fehler: '+e.message, 'error'); }
}

export async function deleteJournalEntry(id) {
    if (!confirm(_t('confirm_delete_protocol'))) return;
    try { var r = await _sb().from('partner_journal').delete().eq('id',id); if (r.error) throw r.error; window.logAudit && window.logAudit('journal_geloescht', 'allgemein', { id: id }); loadJournal(); } catch(e) { _showToast('Fehler: '+e.message, 'error'); }
}

export async function toggleJournalMassnahme(journalId, massnahmeText, checked) {
    var j = allgemeinJournal.find(function(x){return x.id===journalId;});
    if (!j) return;
    var massnahmen = (j.massnahmen||[]).map(function(m){ if (m.text === massnahmeText) return Object.assign({}, m, {erledigt: checked}); return m; });
    try { await _sb().from('partner_journal').update({massnahmen:massnahmen}).eq('id',journalId); j.massnahmen = massnahmen; } catch(e) { console.error(e); }
}

// ============================================================
// STIMMUNG
// ============================================================

export async function setStimmung(val) {
    document.querySelectorAll('.stimmung-btn').forEach(function(b){
        b.style.opacity = b.getAttribute('data-stimmung') === val ? '1' : '0.4';
        b.style.transform = b.getAttribute('data-stimmung') === val ? 'scale(1.2)' : 'scale(1)';
    });
    try {
        var existing = allgemeinMonatsplan.find(function(p){return p.monat===allgemeinAktuellerMonat && p.id;});
        var pStd = _sbProfile() ? _sbProfile().standort_id : null;
        if(!pStd) return;
        if (existing && existing.id) { await _sb().from('partner_monatsplan').update({stimmung:val}).eq('id',existing.id); }
        else { await _sb().from('partner_monatsplan').insert([{standort_id:pStd, jahr:allgemeinJahr, monat:allgemeinAktuellerMonat, stimmung:val, fokus_thema:'', status:'aktiv', massnahmen:[], verknuepfte_ziele:[]}]); }
    } catch(e) { console.error('setStimmung:',e); }
}

// ============================================================
// ÜBERSICHT TAB
// ============================================================

export function renderAllgemeinUebersicht() {
    var monatLabel = document.getElementById('uebersichtAktuellerMonat');
    if (monatLabel) monatLabel.textContent = monatsNamen[allgemeinAktuellerMonat] + ' ' + allgemeinJahr;
    var fokusEl = document.getElementById('uebersichtMonatsfokus');
    var aktMonat = allgemeinMonatsplan.find(function(p){return p.monat===allgemeinAktuellerMonat;});
    if (fokusEl) {
        if (aktMonat && aktMonat.fokus_thema) {
            var mCount = (aktMonat.massnahmen||[]).length, mDone = (aktMonat.massnahmen||[]).filter(function(m){return m.erledigt;}).length;
            fokusEl.innerHTML = '<p class="font-bold text-gray-800 text-lg mb-1">'+escH(aktMonat.fokus_thema)+'</p>'
              +(aktMonat.beschreibung?'<p class="text-sm text-gray-600 mb-2">'+escH(aktMonat.beschreibung)+'</p>':'')
              +(mCount>0?'<div class="flex items-center space-x-2"><div class="flex-1 bg-gray-200 rounded-full h-2"><div class="bg-vit-orange h-2 rounded-full" style="width:'+Math.round(mDone/mCount*100)+'%"></div></div><span class="text-xs text-gray-500">'+mDone+'/'+mCount+'</span></div>':'');
        } else { fokusEl.innerHTML = '<p class="text-gray-400 text-sm italic">Kein Fokusthema definiert</p><button onclick="showAllgemeinTab(\'monatsplan\')" class="text-sm text-vit-orange font-semibold mt-1">Jetzt festlegen →</button>'; }
    }
    var jzEl = document.getElementById('uebersichtJahresziele');
    if (jzEl) {
        var aktiveZiele = allgemeinJahresziele.filter(function(z){return z.typ!=='soft_target';});
        if (!aktiveZiele.length) { jzEl.innerHTML = '<p class="text-gray-400 text-sm italic">Keine Ziele definiert</p>'; }
        else { jzEl.innerHTML = aktiveZiele.slice(0,3).map(function(z){ var pct = z.zielwert>0 ? Math.round((z.aktueller_wert/z.zielwert)*100) : 0; return '<div class="mb-2"><div class="flex justify-between text-xs mb-0.5"><span class="text-gray-700 font-semibold truncate">'+escH(z.titel)+'</span><span class="text-gray-500">'+pct+'%</span></div><div class="w-full bg-gray-200 rounded-full h-1.5"><div class="bg-vit-orange h-1.5 rounded-full" style="width:'+Math.min(pct,100)+'%"></div></div></div>'; }).join(''); }
    }
    var maEl = document.getElementById('uebersichtMassnahmen');
    var maBadge = document.getElementById('uebersichtMassnahmenBadge');
    var offeneMassn = [];
    allgemeinJournal.forEach(function(j){ (j.massnahmen||[]).forEach(function(m){ if (!m.erledigt) offeneMassn.push({text:m.text, datum:j.datum}); }); });
    if (maBadge) maBadge.textContent = offeneMassn.length;
    if (maEl) {
        if (!offeneMassn.length) { maEl.innerHTML = '<p class="text-gray-400 text-sm">Keine offenen Maßnahmen 🎉</p>'; }
        else { maEl.innerHTML = offeneMassn.slice(0,4).map(function(m){ return '<div class="flex items-center space-x-2 text-sm mb-1"><span class="text-red-400">•</span><span class="text-gray-700 truncate">'+escH(m.text)+'</span></div>'; }).join('') + (offeneMassn.length>4?'<p class="text-xs text-gray-400 mt-1">+ '+(offeneMassn.length-4)+' weitere</p>':''); }
    }
    var stimmungEmojis = {positiv:'😊', neutral:'😐', besorgt:'😟', kritisch:'😤'};
    var ljEl = document.getElementById('uebersichtLetztesJournal');
    if (ljEl) {
        if (!allgemeinJournal.length) { ljEl.innerHTML = '<p class="text-gray-400 text-sm italic">Noch kein Gespräch protokolliert</p>'; }
        else { var lj = allgemeinJournal[0]; ljEl.innerHTML = '<div class="flex items-center space-x-2 mb-1"><span class="text-lg">'+(stimmungEmojis[lj.stimmung]||'😐')+'</span><span class="text-sm font-semibold text-gray-800">'+(lj.datum?new Date(lj.datum+'T00:00:00').toLocaleDateString('de-DE'):'')+'</span></div>'+(lj.aktuelle_lage?'<p class="text-xs text-gray-600 line-clamp-2">'+escH(lj.aktuelle_lage).substring(0,120)+'...</p>':''); }
    }
    var nmEl = document.getElementById('uebersichtNaechstesMeeting');
    if (nmEl) {
        var naechster = null;
        allgemeinJournal.forEach(function(j){ if (j.naechster_termin && (!naechster || j.naechster_termin > naechster)) naechster = j.naechster_termin; });
        nmEl.innerHTML = naechster ? '<p class="text-2xl font-bold text-vit-orange">'+new Date(naechster+'T00:00:00').toLocaleDateString('de-DE')+'</p>' : '<p class="text-gray-400 text-sm italic">Kein Termin eingetragen</p>';
    }
    if (aktMonat && aktMonat.stimmung) { document.querySelectorAll('.stimmung-btn').forEach(function(b){ b.style.opacity = b.getAttribute('data-stimmung')===aktMonat.stimmung ? '1' : '0.4'; b.style.transform = b.getAttribute('data-stimmung')===aktMonat.stimmung ? 'scale(1.2)' : 'scale(1)'; }); }
}

// ============================================================
// HOME WIDGETS (Startseite)
// ============================================================


// ========================================
// DASHBOARD WIDGETS – Live-Daten laden

// ── HQ ALLGEMEIN ──
export async function loadHqAllgemeinData() {
    try {
        var mpRes = await _sb().from('partner_monatsplan').select('*, standorte(name, stadt)').eq('jahr', allgemeinJahr).eq('monat', allgemeinAktuellerMonat);
        var jRes = await _sb().from('partner_journal').select('*, standorte(name, stadt)').order('datum', {ascending:false});
        var jzRes = await _sb().from('partner_jahresziele').select('*, standorte(name, stadt)').eq('jahr', allgemeinJahr);
        var stRes = await _sb().from('standorte').select('id, name, stadt, status').eq('status', 'aktiv');
        if (mpRes.error) throw mpRes.error; if (jRes.error) throw jRes.error; if (stRes.error) throw stRes.error;
        renderHqAllgemein(stRes.data||[], mpRes.data||[], jRes.data||[], jzRes.data||[]);
    } catch(e) { console.error('loadHqAllgemeinData:', e); }
}

export function renderHqAllgemein(standorte, monatsplaene, journals, jahresziele) {
    var stimmungEmojis = {positiv:'😊', neutral:'😐', besorgt:'😟', kritisch:'😤'};
    var stimmungen = {positiv:0, neutral:0, besorgt:0, kritisch:0};
    monatsplaene.forEach(function(mp){ if (mp.stimmung && stimmungen.hasOwnProperty(mp.stimmung)) stimmungen[mp.stimmung]++; });
    var el;
    el=document.getElementById('hqStimmungPositiv'); if(el) el.textContent = stimmungen.positiv;
    el=document.getElementById('hqStimmungNeutral'); if(el) el.textContent = stimmungen.neutral;
    el=document.getElementById('hqStimmungBesorgt'); if(el) el.textContent = stimmungen.besorgt;
    el=document.getElementById('hqStimmungKritisch'); if(el) el.textContent = stimmungen.kritisch;

    var hqAufgaben = [];
    journals.forEach(function(j){ (j.wuensche_hq||[]).forEach(function(w){ var text = typeof w==='string'?w:w.text; var status = typeof w==='object'?w.status:'offen'; if (status === 'offen') hqAufgaben.push({text:text, standort:j.standorte?j.standorte.name:'', datum:j.datum}); }); });
    el=document.getElementById('hqAufgabenBadge'); if(el) el.textContent = hqAufgaben.length;
    var aufgEl = document.getElementById('hqJournalAufgaben');
    if(!aufgEl) return;
    aufgEl.innerHTML = !hqAufgaben.length ? '<p class="text-sm text-green-600 font-semibold">Keine offenen HQ-Aufgaben 🎉</p>'
        : hqAufgaben.map(function(a){ return '<div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"><div class="flex items-center space-x-2"><span class="text-red-500">•</span><span class="text-sm text-gray-800">'+escH(a.text)+'</span></div><div class="text-xs text-gray-500">'+escH(a.standort)+' · '+(a.datum?new Date(a.datum+'T00:00:00').toLocaleDateString('de-DE'):'')+'</div></div>'; }).join('');

    var tbody = document.getElementById('hqPartnerTabelle');
    if(!tbody) return;
    if (!standorte.length) { tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-400">Keine aktiven Standorte</td></tr>'; return; }
    tbody.innerHTML = standorte.map(function(st){
        var mp = monatsplaene.find(function(p){return p.standort_id===st.id;});
        var stJournals = journals.filter(function(j){return j.standort_id===st.id;});
        var stZiele = jahresziele.filter(function(z){return z.standort_id===st.id;});
        var letztes = stJournals.length ? stJournals[0] : null;
        var stimmung = mp && mp.stimmung ? stimmungEmojis[mp.stimmung] : '—';
        var fokus = mp && mp.fokus_thema ? mp.fokus_thema : '—';
        var offenCount = 0; stJournals.forEach(function(j){ (j.massnahmen||[]).forEach(function(m){if(!m.erledigt) offenCount++;}); });
        return '<tr class="border-b hover:bg-gray-50">'
          +'<td class="p-3"><span class="font-semibold text-gray-800">'+escH(st.name)+'</span><br><span class="text-xs text-gray-500">'+escH(st.stadt||'')+'</span></td>'
          +'<td class="p-3 text-center text-xl">'+stimmung+'</td>'
          +'<td class="p-3 text-sm text-gray-700 max-w-[200px] truncate">'+escH(fokus)+'</td>'
          +'<td class="p-3 text-center"><span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">'+stZiele.length+'</span></td>'
          +'<td class="p-3 text-center">'+(offenCount>0?'<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">'+offenCount+'</span>':'<span class="text-xs text-green-600">✓</span>')+'</td>'
          +'<td class="p-3 text-center text-xs text-gray-500">'+(letztes?new Date(letztes.datum+'T00:00:00').toLocaleDateString('de-DE'):'—')+'</td>'
          +'<td class="p-3 text-center"><button onclick="viewPartnerDetails(\''+st.id+'\')" class="text-xs text-vit-orange font-semibold hover:underline">Details →</button></td></tr>';
    }).join('');
}

export function viewPartnerDetails(standortId) { _showToast('Partner-Detail für Standort ' + standortId + ' – wird in nächster Iteration implementiert', 'info'); }

// NOTE: View render triggers (support, entwicklung, wissen, shop) are now 
// handled by view-router.js via 'vit:view-changed' events.



// Strangler Fig
const _exports = {showAllgemeinTab,loadAllgemeinData,loadJahresziele,renderJahresziele,openJahreszielModal,openJahreszielEdit,closeJahreszielModal,toggleJahreszielFelder,saveJahresziel,deleteJahresziel,toggleSoftTarget,loadMonatsplan,renderMonatsplan,openMonatsDetail,addMonatsMassnahme,closeMonatsDetail,saveMonatsDetail,loadJournal,renderJournal,openJournalModal,openJournalEdit,closeJournalModal,setJournalStimmung,updateThemaStyle,addJournalWunsch,addJournalMassnahme,saveJournalEntry,deleteJournalEntry,toggleJournalMassnahme,setStimmung,renderAllgemeinUebersicht,loadHqAllgemeinData,renderHqAllgemein,viewPartnerDetails};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
// [prod] log removed

// === Window Exports (onclick handlers) ===
window.addJournalMassnahme = addJournalMassnahme;
window.addJournalWunsch = addJournalWunsch;
window.addMonatsMassnahme = addMonatsMassnahme;
window.closeJahreszielModal = closeJahreszielModal;
window.closeJournalModal = closeJournalModal;
window.closeMonatsDetail = closeMonatsDetail;
window.openJahreszielModal = openJahreszielModal;
window.openJournalModal = openJournalModal;
window.saveJahresziel = saveJahresziel;
window.saveJournalEntry = saveJournalEntry;
window.saveMonatsDetail = saveMonatsDetail;
window.setJournalStimmung = setJournalStimmung;
window.setStimmung = setStimmung;
window.toggleJahreszielFelder = toggleJahreszielFelder;
window.renderHqAllgemein = renderHqAllgemein;
window.loadAllgemeinData = loadAllgemeinData;
window.showAllgemeinTab = showAllgemeinTab;
