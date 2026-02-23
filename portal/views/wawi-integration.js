/**
 * views/wawi-integration.js - WaWi Beleg-Pipeline Modul
 * PDF Parse, Sync, Beleg-Übersicht, Umsatz-Dashboard
 * @module views/wawi-integration
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// ── pdf.js worker ──
if(typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ── State ──
var wawiInitDone = false;
var parsedQueue = []; // pending parsed docs awaiting save

// ── Sub-Tab Switching (inside Controlling → WaWi tab) ──
window.showWawiSubTab = function(tab) {
    document.querySelectorAll('.wawi-sub-content').forEach(function(el){ el.style.display='none'; });
    document.querySelectorAll('.wawi-sub-btn').forEach(function(b){
        b.classList.remove('bg-white','text-gray-800','shadow-sm');
        b.classList.add('text-gray-500');
    });
    var tabEl = document.getElementById('wawiSub'+tab.charAt(0).toUpperCase()+tab.slice(1));
    if(tabEl) tabEl.style.display='block';
    var btn = document.querySelector('.wawi-sub-btn[data-sub="'+tab+'"]');
    if(btn){ btn.classList.add('bg-white','text-gray-800','shadow-sm'); btn.classList.remove('text-gray-500'); }
    if(tab==='belege') loadWawiBelege();
    if(tab==='dashboard') loadWawiDashboard();
    if(tab==='leasing') loadWawiLeasing();
    if(tab==='api') loadWawiApiTab();
};

// ── Init (called when Controlling WaWi tab opens) ──
window.initWawiTab = function() {
    if(wawiInitDone) return;
    wawiInitDone = true;
};

// ═══ WaWi API Connection Management ═══
var _wawiConnection = null;

window.loadWawiApiTab = async function() {
    var stdId = SESSION && SESSION.standort_id ? SESSION.standort_id : null;
    if(!stdId) { document.getElementById('wawiConnectionForm').innerHTML = '<p class="text-sm text-gray-400">Kein Standort zugeordnet</p>'; return; }

    // Load existing connection
    try {
        var r = await _sb().from('wawi_connections').select('*').eq('standort_id', stdId).maybeSingle();
        if(r.data) {
            _wawiConnection = r.data;
            wawiPopulateForm(r.data);
            if(r.data.ist_aktiv) {
                document.getElementById('wawiSyncPanel').style.display = 'block';
                loadWawiSyncLog();
                loadWawiDataPreview();
            }
            wawiRenderStatus(r.data);
        }
    } catch(e) { console.error('loadWawiApiTab:', e); }
};

export function wawiPopulateForm(conn) {
    var s = document.getElementById('wawiSystemTyp'); if(s) s.value = conn.system_typ || 'approom';
    var u = document.getElementById('wawiApiUrl'); if(u) u.value = conn.api_url || '';
    var k = document.getElementById('wawiApiKey'); if(k) k.value = conn.api_key_encrypted ? '••••••••' : '';
    var l = document.getElementById('wawiLabel'); if(l) l.value = conn.system_label || '';
    // Sync module checkboxes
    var mods = conn.sync_module || {};
    var cb = document.getElementById('wawiSyncContacts'); if(cb) cb.checked = mods.contacts !== false;
    cb = document.getElementById('wawiSyncProducts'); if(cb) cb.checked = mods.products !== false;
    cb = document.getElementById('wawiSyncOrders'); if(cb) cb.checked = mods.orders !== false;
    cb = document.getElementById('wawiSyncStock'); if(cb) cb.checked = mods.stock !== false;
    cb = document.getElementById('wawiSyncBills'); if(cb) cb.checked = !!mods.bills;
}

export function wawiRenderStatus(conn) {
    var el = document.getElementById('wawiConnectionStatus');
    if(!el) return;
    if(conn && conn.ist_aktiv) {
        var ago = conn.letzter_sync ? timeAgo(new Date(conn.letzter_sync)) : 'Nie';
        el.innerHTML = '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">✅ Verbunden' +
            (conn.letzter_sync ? ' • Letzter Sync: ' + ago : '') + '</span>';
    } else if(conn && conn.fehler_count > 0) {
        el.innerHTML = '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">❌ Fehler: ' + (conn.letzter_fehler || 'Unbekannt').substring(0,50) + '</span>';
    } else {
        el.innerHTML = '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">⚪ Nicht verbunden</span>';
    }
}

export function timeAgo(d) {
    var s = Math.floor((Date.now() - d.getTime()) / 1000);
    if(s < 60) return 'gerade eben';
    if(s < 3600) return Math.floor(s/60) + ' Min.';
    if(s < 86400) return Math.floor(s/3600) + ' Std.';
    return Math.floor(s/86400) + ' Tage';
}

window.wawiSystemChanged = function() {
    var typ = document.getElementById('wawiSystemTyp').value;
    var urlEl = document.getElementById('wawiApiUrl');
    if(typ === 'approom' && !urlEl.value) urlEl.placeholder = 'https://erp.app-room.ch/api';
    else if(typ === 'velo_plus') urlEl.placeholder = 'https://api.veloplus.ch';
    else if(typ === 'bc') urlEl.placeholder = 'https://api.businesscentral.dynamics.com/...';
    else urlEl.placeholder = 'https://your-erp.com/api';
};

window.wawiTestConnection = async function() {
    var btn = document.getElementById('wawiTestBtn');
    var resEl = document.getElementById('wawiTestResult');
    var apiUrl = document.getElementById('wawiApiUrl').value.trim();
    var apiKey = document.getElementById('wawiApiKey').value.trim();
    if(!apiUrl || !apiKey || apiKey === '••••••••') {
        resEl.innerHTML = '<p class="text-sm text-red-600">⚠️ Bitte API-URL und API-Key eingeben</p>';
        return;
    }
    btn.disabled = true; btn.textContent = '⏳ Teste...';
    resEl.innerHTML = '<p class="text-sm text-gray-500">Verbindung wird getestet...</p>';

    try {
        var r = await _sb().functions.invoke('wawi-sync', { body: {
            action: 'test_connection',
            api_url: apiUrl,
            api_key: apiKey,
            system_typ: document.getElementById('wawiSystemTyp').value,
            standort_id: SESSION.standort_id
        }});
        var data = r.data;
        if(data && data.success) {
            resEl.innerHTML = '<div class="p-3 bg-green-50 border border-green-200 rounded-lg"><p class="text-sm text-green-700 font-semibold">✅ ' + (data.message || 'Verbindung erfolgreich!') + '</p></div>';
        } else {
            resEl.innerHTML = '<div class="p-3 bg-red-50 border border-red-200 rounded-lg"><p class="text-sm text-red-700">❌ ' + (data && data.error ? data.error : 'Unbekannter Fehler') + '</p></div>';
        }
    } catch(e) {
        resEl.innerHTML = '<div class="p-3 bg-red-50 border border-red-200 rounded-lg"><p class="text-sm text-red-700">❌ Fehler: ' + e.message + '</p></div>';
    }
    btn.disabled = false; btn.textContent = '🔍 Verbindung testen';
};

window.wawiSaveConnection = async function() {
    var stdId = SESSION && SESSION.standort_id;
    if(!stdId) { _showToast('Kein Standort', 'error'); return; }
    var apiUrl = document.getElementById('wawiApiUrl').value.trim();
    var apiKey = document.getElementById('wawiApiKey').value.trim();
    if(!apiUrl) { _showToast('API-URL fehlt', 'error'); return; }
    if(!apiKey || apiKey === '••••••••') {
        if(!_wawiConnection) { _showToast('API-Key fehlt', 'error'); return; }
        // Keep existing key if user didn't change it
    }

    var syncMods = {
        contacts: document.getElementById('wawiSyncContacts').checked,
        products: document.getElementById('wawiSyncProducts').checked,
        orders: document.getElementById('wawiSyncOrders').checked,
        stock: document.getElementById('wawiSyncStock').checked,
        bills: document.getElementById('wawiSyncBills').checked
    };

    var payload = {
        standort_id: stdId,
        system_typ: document.getElementById('wawiSystemTyp').value,
        system_label: document.getElementById('wawiLabel').value.trim() || null,
        api_url: apiUrl,
        sync_module: syncMods,
        ist_aktiv: true
    };
    if(apiKey && apiKey !== '••••••••') {
        payload.api_key_encrypted = apiKey; // TODO: real encryption
    }

    try {
        var r;
        if(_wawiConnection) {
            r = await _sb().from('wawi_connections').update(payload).eq('id', _wawiConnection.id).select().single();
        } else {
            if(apiKey && apiKey !== '••••••••') payload.api_key_encrypted = apiKey;
            r = await _sb().from('wawi_connections').insert(payload).select().single();
        }
        if(r.error) throw r.error;
        _wawiConnection = r.data;
        _showToast('WaWi-Verbindung gespeichert ✅', 'success');
        wawiRenderStatus(r.data);
        document.getElementById('wawiSyncPanel').style.display = 'block';
        loadWawiSyncLog();
    } catch(e) {
        _showToast('Fehler: ' + e.message, 'error');
    }
};

window.wawiTriggerSync = async function(module) {
    if(!_wawiConnection) { _showToast('Keine Verbindung', 'error'); return; }
    _showToast('Sync ' + module + ' gestartet...', 'info');
    try {
        var r = await _sb().functions.invoke('wawi-sync', { body: {
            action: 'sync',
            connection_id: _wawiConnection.id,
            standort_id: SESSION.standort_id,
            module: module
        }});
        var data = r.data;
        if(data && data.success) {
            _showToast('✅ ' + module + ': ' + (data.total || 0) + ' Datensätze in ' + (data.dauer_ms || 0) + 'ms', 'success');
            loadWawiSyncLog();
            loadWawiDataPreview();
        } else {
            _showToast('❌ ' + (data && data.error ? data.error : 'Fehler'), 'error');
        }
    } catch(e) { _showToast('Sync-Fehler: ' + e.message, 'error'); }
};

window.wawiSyncAll = async function() {
    if(!_wawiConnection) { _showToast('Keine Verbindung', 'error'); return; }
    _showToast('Komplett-Sync gestartet...', 'info');
    try {
        var r = await _sb().functions.invoke('wawi-sync', { body: {
            action: 'sync_all',
            connection_id: _wawiConnection.id,
            standort_id: SESSION.standort_id
        }});
        var data = r.data;
        if(data && data.success) {
            _showToast('✅ Sync abgeschlossen', 'success');
            loadWawiSyncLog();
            loadWawiDataPreview();
        } else {
            _showToast('❌ ' + (data && data.error ? data.error : 'Fehler'), 'error');
        }
    } catch(e) { _showToast('Sync-Fehler: ' + e.message, 'error'); }
};

export async function loadWawiSyncLog() {
    if(!_wawiConnection) return;
    var r = await _sb().from('wawi_sync_log').select('*').eq('connection_id', _wawiConnection.id).order('created_at', {ascending:false}).limit(15);
    var el = document.getElementById('wawiSyncLog');
    if(!el) return;
    if(!r.data || !r.data.length) { el.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Noch keine Syncs durchgeführt</p>'; return; }
    el.innerHTML = r.data.map(function(l) {
        var icon = l.status === 'erfolgreich' ? '✅' : l.status === 'fehler' ? '❌' : '⏳';
        var color = l.status === 'erfolgreich' ? 'green' : l.status === 'fehler' ? 'red' : 'gray';
        var d = new Date(l.created_at);
        var zeit = d.toLocaleDateString('de') + ' ' + d.toLocaleTimeString('de', {hour:'2-digit',minute:'2-digit'});
        return '<div class="flex items-center justify-between py-2 px-3 rounded-lg bg-' + color + '-50">' +
            '<div class="flex items-center gap-2"><span>' + icon + '</span><span class="text-xs font-semibold text-gray-700">' + (l.modul || '').toUpperCase() + '</span></div>' +
            '<div class="text-xs text-gray-500">' + (l.datensaetze_total || 0) + ' Datensätze • ' + (l.dauer_ms || 0) + 'ms</div>' +
            '<div class="text-xs text-gray-400">' + zeit + '</div></div>';
    }).join('');
}

export async function loadWawiDataPreview() {
    if(!_wawiConnection) return;
    var stdId = SESSION.standort_id;

    // Contacts count & preview
    var cr = await _sb().from('wawi_kontakte').select('id,name,vorname,email,ort', {count:'exact'}).eq('standort_id', stdId).limit(10);
    var cntEl = document.getElementById('wawiContactCount');
    if(cntEl) cntEl.textContent = '(' + (cr.count || 0) + ')';
    var cpEl = document.getElementById('wawiContactPreview');
    if(cpEl && cr.data) {
        cpEl.innerHTML = cr.data.map(function(c) {
            return '<div class="flex justify-between py-1 border-b border-gray-100"><span class="text-gray-700">' + 
                (c.vorname ? c.vorname + ' ' : '') + (c.name || '–') + '</span><span class="text-gray-400">' + (c.ort || '') + '</span></div>';
        }).join('') || '<p class="text-gray-400">Keine Kontakte</p>';
    }

    // Products count & preview
    var pr = await _sb().from('wawi_produkte').select('id,name,hersteller,preis_vk,bestand', {count:'exact'}).eq('standort_id', stdId).limit(10);
    var pCntEl = document.getElementById('wawiProductCount');
    if(pCntEl) pCntEl.textContent = '(' + (pr.count || 0) + ')';
    var ppEl = document.getElementById('wawiProductPreview');
    if(ppEl && pr.data) {
        ppEl.innerHTML = pr.data.map(function(p) {
            return '<div class="flex justify-between py-1 border-b border-gray-100"><span class="text-gray-700 truncate mr-2">' + (p.name || '–') + 
                '</span><span class="text-gray-400 whitespace-nowrap">' + (p.preis_vk ? p.preis_vk.toFixed(2) + ' €' : '') + 
                (p.bestand != null ? ' • ' + p.bestand + ' Stk.' : '') + '</span></div>';
        }).join('') || '<p class="text-gray-400">Keine Produkte</p>';
    }

    // KPIs
    var kpiEl = document.getElementById('wawiApiKpis');
    if(kpiEl) {
        kpiEl.innerHTML = [
            {label:'Kontakte', val: cr.count || 0, icon:'👥', color:'blue'},
            {label:'Produkte', val: pr.count || 0, icon:'📦', color:'green'},
            {label:'Letzter Sync', val: _wawiConnection.letzter_sync ? timeAgo(new Date(_wawiConnection.letzter_sync)) : 'Nie', icon:'🔄', color:'orange'},
            {label:'Fehler', val: _wawiConnection.fehler_count || 0, icon: (_wawiConnection.fehler_count || 0) > 0 ? '⚠️' : '✅', color: (_wawiConnection.fehler_count || 0) > 0 ? 'red' : 'green'}
        ].map(function(k) {
            return '<div class="vit-card p-4 text-center"><div class="text-2xl mb-1">' + k.icon + '</div><div class="text-xl font-bold text-gray-800">' + k.val + '</div><div class="text-xs text-gray-500">' + k.label + '</div></div>';
        }).join('');
    }
}

// ── PDF Text Extraction ──
export async function extractPdfText(file) {
    var buf = await file.arrayBuffer();
    var pdf = await pdfjsLib.getDocument({data: buf}).promise;
    var fullText = '';
    for(var p = 1; p <= pdf.numPages; p++) {
        var page = await pdf.getPage(p);
        var content = await page.getTextContent();
        var lastY = null;
        content.items.forEach(function(item) {
            if(lastY !== null && Math.abs(item.transform[5] - lastY) > 3) fullText += '\n';
            else if(lastY !== null) fullText += ' ';
            fullText += item.str;
            lastY = item.transform[5];
        });
        fullText += '\n';
    }
    return fullText;
}

// ── Parser ──
export function parseEur(s) {
    if(!s) return 0;
    return parseFloat(s.replace(/\./g,'').replace(',','.'));
}

export function parseWawiText(text, fileName) {
    var lines = text.split('\n');
    var result = { source_file:fileName, header:{}, customer:{}, items:[], totals:{}, meta:{}, raw_text: text.substring(0, 2000) };
    var m;
    var textLower = text.toLowerCase();

    // ── Belegtyp: 1) Text scan, 2) Filename fallback ──
    // Broad text scan – check first 30 lines and full text
    var headerText = lines.slice(0, 30).join('\n');
    if(!result.header.beleg_typ) {
        // Direct word matches (case-insensitive, various positions)
        if(/\brechnung\b/i.test(headerText)) result.header.beleg_typ = 'Rechnung';
        else if(/\bauftrag\b/i.test(headerText)) result.header.beleg_typ = 'Auftrag';
        else if(/\bangebot\b/i.test(headerText)) result.header.beleg_typ = 'Angebot';
        else if(/\bgutschrift\b/i.test(headerText)) result.header.beleg_typ = 'Gutschrift';
        else if(/\blieferschein\b/i.test(headerText)) result.header.beleg_typ = 'Lieferschein';
        // Full text fallback
        else if(/\brechnung\b/i.test(text)) result.header.beleg_typ = 'Rechnung';
        else if(/\bauftrag\b/i.test(text)) result.header.beleg_typ = 'Auftrag';
        else if(/\bangebot\b/i.test(text)) result.header.beleg_typ = 'Angebot';
    }

    // Filename fallback: "Auftrag_939313_...", "Rechnung_939329_..."
    if(!result.header.beleg_typ) {
        var fnLower = fileName.toLowerCase();
        if(fnLower.indexOf('rechnung') >= 0) result.header.beleg_typ = 'Rechnung';
        else if(fnLower.indexOf('auftrag') >= 0) result.header.beleg_typ = 'Auftrag';
        else if(fnLower.indexOf('angebot') >= 0) result.header.beleg_typ = 'Angebot';
        else if(fnLower.indexOf('gutschrift') >= 0) result.header.beleg_typ = 'Gutschrift';
        else if(fnLower.indexOf('lieferschein') >= 0) result.header.beleg_typ = 'Lieferschein';
    }

    // ── Belegnummer: Multiple patterns ──
    // Pattern 1: "Belegnummer: 939313"
    m = text.match(/Belegnummer[:\s]+(\d+)/i); if(m) result.header.beleg_nr = m[1];
    // Pattern 2: "Beleg-Nr.: 939313" or "Beleg-Nr: 939313"
    if(!result.header.beleg_nr) { m = text.match(/Beleg[\-\s]?Nr\.?[:\s]+(\d+)/i); if(m) result.header.beleg_nr = m[1]; }
    // Pattern 3: "Rechnungsnummer: 939329" / "Auftragsnummer: 939313"
    if(!result.header.beleg_nr) { m = text.match(/(?:Rechnungs?|Auftrags?|Angebots?)[\-\s]?(?:nummer|nr)\.?[:\s]+(\d+)/i); if(m) result.header.beleg_nr = m[1]; }
    // Pattern 4: "Nr.: 939313" or "Nr: 939313"
    if(!result.header.beleg_nr) { m = text.match(/\bNr\.?[:\s]+(\d{5,})/); if(m) result.header.beleg_nr = m[1]; }
    // Pattern 5: "Beleg 939313" (just the word Beleg followed by number)
    if(!result.header.beleg_nr) { m = text.match(/\bBeleg\s+(\d{5,})/i); if(m) result.header.beleg_nr = m[1]; }
    // Filename fallback: "Auftrag_939313_20260217..."
    if(!result.header.beleg_nr) { m = fileName.match(/(\d{5,7})/); if(m) result.header.beleg_nr = m[1]; }

    // ── Datum: Multiple patterns ──
    m = text.match(/Datum[:\s]+(\d{2})\.(\d{2})\.(\d{4})/i);
    if(m) result.header.datum = m[3]+'-'+m[2]+'-'+m[1];
    if(!result.header.datum) { m = text.match(/(\d{2})\.(\d{2})\.(\d{4})/); if(m) result.header.datum = m[3]+'-'+m[2]+'-'+m[1]; }
    // Filename date: "..._202602171339" = 2026-02-17
    if(!result.header.datum) { m = fileName.match(/(\d{4})(\d{2})(\d{2})\d{4,6}/); if(m) result.header.datum = m[1]+'-'+m[2]+'-'+m[3]; }

    // ── Kunden-Nr ──
    m = text.match(/Kunden[\-\s]?Nr\.?[:\s]+(\d+)/i); if(m) result.header.kunden_nr = m[1];
    if(!result.header.kunden_nr) { m = text.match(/Kdnr\.?[:\s]+(\d+)/i); if(m) result.header.kunden_nr = m[1]; }

    // ── Verkäufer ──
    m = text.match(/Verkäufer[:\s]+(.+)/i); if(m) result.header.verkaeufer = m[1].trim();
    if(!result.header.verkaeufer) { m = text.match(/Berater[:\s]+(.+)/i); if(m) result.header.verkaeufer = m[1].trim(); }
    if(!result.header.verkaeufer) { m = text.match(/Sachbearbeiter[:\s]+(.+)/i); if(m) result.header.verkaeufer = m[1].trim(); }

    // ── Zahlungsbedingung ──
    m = text.match(/Zahlungsbedingung[:\s]+(.+)/i); if(m) result.header.zahlungsbedingung = m[1].trim();
    if(!result.header.zahlungsbedingung) { m = text.match(/Zahlungsart[:\s]+(.+)/i); if(m) result.header.zahlungsbedingung = m[1].trim(); }

    // Standort (first lines)
    for(var li=0;li<Math.min(8,lines.length);li++){
        m=lines[li].match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*(\d{5})\s+(.+?)(?:\s+Bezahlen|$)/);
        if(m){ result.meta.standort_name=m[1].trim(); result.meta.standort_plz=m[3]; result.meta.standort_ort=m[4].trim(); break; }
    }
    m=text.match(/Email[:\s]+([\w@.\-]+)/i); if(m) result.meta.standort_email=m[1];

    // Kunde
    var kundeLines=[], inKunde=false;
    lines.forEach(function(line){
        var ls=line.trim();
        if(['Herr','Frau','Firma'].indexOf(ls)>=0){ inKunde=true; result.customer.anrede=ls; return; }
        if(inKunde){
            if(['Datum:','Kunden-Nr','Verkäufer','Zahlungs','Auftrag','Angebot','Rechnung','Belegnummer','Kunde ','Abweichende','Art.-Nr'].some(function(k){return ls.startsWith(k);})){ inKunde=false; return; }
            if(ls && ls!=='Girocode:' && ls!=='Bezahlen per App' && ls.length < 80) kundeLines.push(ls);
        }
    });
    for(var j=kundeLines.length-1;j>=0;j--){
        var plzM=kundeLines[j].match(/^(?:DE\s*)?(\d{5})\s+(.+)/);
        if(plzM){
            result.customer.plz=plzM[1]; result.customer.ort=plzM[2];
            if(j>0 && /\d/.test(kundeLines[j-1])){
                result.customer.strasse=kundeLines[j-1];
                result.customer.name=kundeLines.slice(0,j-1).join(' ').replace(/\s*\. \.\s*/,' ').trim();
            } else {
                result.customer.name=kundeLines.slice(0,j).join(' ').replace(/\s*\. \.\s*/,' ').trim();
            }
            break;
        }
    }
    if(!result.customer.name && kundeLines.length) result.customer.name=kundeLines.join(' ').replace(/\s*\. \.\s*/,' ').trim();
    m=text.match(/Kunde Telefon[:\s]+(.+)/i); if(m) result.customer.telefon=m[1].trim();
    m=text.match(/Kunde Mobil[:\s]+(.+)/i); if(m) result.customer.mobil=m[1].trim();
    m=text.match(/(?:Tel|Telefon)\.?[:\s]+([\d\s\+\-\/]+)/i); if(m && !result.customer.telefon) result.customer.telefon=m[1].trim();

    // ── Positionen: Multiple patterns ──
    var itemRe=/^(\d{4,7})\s+(.+?)\s+(\d+)\s+([\d.,]+)\s*€\s*(?:([\d.,]+)\s*€\s*)?([\d.,]+)\s*€/;
    // Alternative: without € sign, just numbers at end
    var itemRe2=/^(\d{4,7})\s+(.+?)\s+(\d+)\s+([\d.,]+)\s+([\d.,]+)$/;
    // Alternative: Pos | ArtNr | Bezeichnung | Menge | Preis
    var itemRe3=/^\d+\s+(\d{4,7})\s+(.+?)\s+(\d+)\s+([\d.,]+)\s+([\d.,]+)/;
    var inItems=false, i=0;
    while(i<lines.length){
        var line=lines[i].trim();
        if(line.indexOf('Art.-Nr.')>=0 || line.indexOf('Artikelbezeichnung')>=0 || line.indexOf('Artikelnr')>=0 || (line.indexOf('Pos')>=0 && line.indexOf('Bezeichnung')>=0)){ inItems=true; i++; continue; }
        if(inItems && (line.startsWith('Belegrabatt')||line.startsWith('MwSt')||line.startsWith('Summe')||line.startsWith('Gesamt'))){
            if(line.startsWith('Belegrabatt')){ var rabM=line.match(/-?([\d.,]+)\s*€?/); if(rabM) result.totals.belegrabatt=-parseEur(rabM[1]); }
            inItems=false; i++; continue;
        }
        if(!inItems){ i++; continue; }
        var mI=line.match(itemRe);
        if(!mI) mI = line.match(itemRe2);
        if(!mI) { var mI3 = line.match(itemRe3); if(mI3) mI = [null, mI3[1], mI3[2], mI3[3], mI3[4], null, mI3[5]]; }
        if(mI){
            var itm={art_nr:mI[1],bezeichnung:mI[2].trim(),menge:parseInt(mI[3]),einzelpreis:parseEur(mI[4]),gesamtpreis:parseEur(mI[6]||mI[5])};
            if(mI[5] && mI[6]) itm.rabatt=parseEur(mI[5]);
            var extra=[];var k=i+1;
            while(k<lines.length){ var nl=lines[k].trim(); if(!nl||itemRe.test(nl)||itemRe2.test(nl)||nl.startsWith('Belegrabatt')||nl.startsWith('MwSt')||nl.startsWith('Summe')||/^\d{4,7}\s+/.test(nl))break; extra.push(nl);k++; }
            if(extra.length){ itm.zusatzinfo=extra.join(' | '); var snrM=extra.join(' ').match(/(?:SNr|Seriennr|S\/N)[:\s]*(\S+)/i); if(snrM) itm.seriennummer=snrM[1]; }
            result.items.push(itm); i=k; continue;
        }
        var mZ=line.match(/^(\d{4,7})\s+(.+)$/);
        if(mZ && !/\d+\s+[\d.,]+\s*€/.test(line)){
            result.items.push({art_nr:mZ[1],bezeichnung:mZ[2].trim(),menge:0,einzelpreis:0,gesamtpreis:0,hinweis:true});
        }
        i++;
    }

    // ── Totals: Multiple patterns ──
    m=text.match(/MwSt\s+([\d,]+)%\s+auf\s+([\d.,]+)\s*€\s*=\s*([\d.,]+)\s*€\s*Endbetrag\s*([\d.,]+)\s*€/);
    if(m){ result.totals.mwst_satz=parseFloat(m[1].replace(',','.')); result.totals.netto=parseEur(m[2]); result.totals.mwst_betrag=parseEur(m[3]); result.totals.endbetrag=parseEur(m[4]); }
    // Alternative: "Netto: 1.234,56 €" + "MwSt: 234,56 €" + "Brutto: 1.469,12 €"
    if(!result.totals.endbetrag) { m=text.match(/(?:Endbetrag|Brutto|Gesamtbetrag|Rechnungsbetrag)[:\s]*([\d.,]+)\s*€/i); if(m) result.totals.endbetrag=parseEur(m[1]); }
    if(!result.totals.netto) { m=text.match(/(?:Netto(?:betrag)?|Zwischensumme)[:\s]*([\d.,]+)\s*€/i); if(m) result.totals.netto=parseEur(m[1]); }
    if(!result.totals.mwst_betrag) { m=text.match(/MwSt\.?\s*(?:\d+[,%]?\s*)?[:\s]*([\d.,]+)\s*€/i); if(m) result.totals.mwst_betrag=parseEur(m[1]); }
    // If still no endbetrag, sum items
    if(!result.totals.endbetrag && result.items.length) {
        result.totals.endbetrag = result.items.reduce(function(s,it){ return s + (it.gesamtpreis||0); }, 0);
    }

    if(text.indexOf('Skonto')>=0){ var skM=text.match(/(\d+)%\s*Skonto/i); if(skM) result.totals.skonto_prozent=parseInt(skM[1]); }

    // Leasing
    var zb=(result.header.zahlungsbedingung||'').toLowerCase();
    if(/leasing/i.test(text) || /leasing/i.test(zb)){
        result.meta.ist_leasing=true;
        var lm=text.match(/[Ll]easing\s*[-–]\s*(.+?)(?:\n|$)/); if(lm) result.meta.leasing_anbieter=lm[1].trim();
        if(!result.meta.leasing_anbieter) { lm=text.match(/(JobRad|BusinessBike|Bikeleasing|eurorad|Lease\s*a\s*bike|mein[\-\s]?dienstrad)/i); if(lm) result.meta.leasing_anbieter=lm[1]; }
    }
    else result.meta.ist_leasing=false;

    // Debug log for development
    if(!result.header.beleg_nr && !result.header.beleg_typ) {
        console.warn('[WaWi Parser] Konnte Beleg nicht erkennen:', fileName, '\nErste 500 Zeichen:\n', text.substring(0,500));
    }

    return result;
}

// ── File Handler ──
window.wawiHandleFiles = async function(files) {
    console.log('[WaWi Parser v2.0] Processing', files.length, 'files');
    var container = document.getElementById('wawiParseResults');
    if(!container) return;
    parsedQueue = [];

    for(var f = 0; f < files.length; f++) {
        var file = files[f];
        if(!file.name.toLowerCase().endsWith('.pdf')){ continue; }

        var card = document.createElement('div');
        card.className = 'vit-card p-4';
        card.innerHTML = '<div class="flex items-center gap-3"><div class="animate-pulse w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-vit-orange">⏳</div><div><p class="font-semibold text-sm text-gray-800">'+file.name+'</p><p class="text-xs text-gray-400">Wird verarbeitet...</p></div></div>';
        container.appendChild(card);

        try {
            var text = await extractPdfText(file);
            console.log('[WaWi] Extracted text from', file.name, '– length:', text.length, '– first 200:', text.substring(0,200));
            var parsed = parseWawiText(text, file.name);
            console.log('[WaWi] Parsed result:', JSON.stringify(parsed.header), 'items:', parsed.items.length);

            if(!parsed.header.beleg_nr && !parsed.header.beleg_typ) {
                card.innerHTML = renderParseCard(file.name, null, 'Beleg konnte nicht erkannt werden');
                // Debug: show first 500 chars of extracted text
                var dbg = document.createElement('details');
                dbg.style.cssText = 'padding:8px 12px';
                dbg.innerHTML = '<summary style="cursor:pointer;font-size:11px;color:#EF7D00;margin-top:4px;font-weight:600">🔍 Extrahierten Text anzeigen (Debug)</summary><pre style="font-size:10px;color:var(--c-sub);background:var(--c-bg2);padding:10px;border-radius:8px;max-height:250px;overflow:auto;white-space:pre-wrap;margin-top:6px;border:1px solid var(--c-border)">'+(text||'(leer)').substring(0,800).replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</pre>';
                card.appendChild(dbg);
                continue;
            }
            parsedQueue.push(parsed);
            card.innerHTML = renderParseCard(file.name, parsed, null);
        } catch(err) {
            console.error('[WaWi] PDF parse error for', file.name, err);
            card.innerHTML = renderParseCard(file.name, null, 'Fehler: ' + (err.message || String(err)));
            // Also show debug for errors
            var dbgErr = document.createElement('details');
            dbgErr.style.cssText = 'padding:8px 12px';
            dbgErr.innerHTML = '<summary style="cursor:pointer;font-size:11px;color:#ef4444;margin-top:4px;font-weight:600">🔍 Fehlerdetails anzeigen</summary><pre style="font-size:10px;color:#991b1b;background:#fef2f2;padding:10px;border-radius:8px;max-height:200px;overflow:auto;white-space:pre-wrap;margin-top:6px;border:1px solid #fecaca">'+(err.stack||err.message||String(err)).replace(/</g,'&lt;')+'</pre>';
            card.appendChild(dbgErr);
        }
    }

    // Add save-all button if there are results
    if(parsedQueue.length > 0) {
        var btnDiv = document.createElement('div');
        btnDiv.className = 'flex justify-end mt-4 gap-3';
        btnDiv.innerHTML = '<button onclick="wawiSaveAll()" class="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'+parsedQueue.length+' Beleg'+(parsedQueue.length>1?'e':'')+' importieren</button>';
        container.appendChild(btnDiv);
    }

    // Reset file input
    document.getElementById('wawiFileInput').value = '';
};

export function renderParseCard(fileName, parsed, error) {
    if(error) {
        return '<div class="flex items-center gap-3"><div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-500">✗</div><div><p class="font-semibold text-sm text-gray-800">'+fileName+'</p><p class="text-xs text-red-500">'+error+'</p></div></div>';
    }
    var typColors = {Angebot:'blue',Auftrag:'orange',Rechnung:'green'};
    var tc = typColors[parsed.header.beleg_typ]||'gray';
    var leasing = parsed.meta.ist_leasing ? '<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">🚲 '+_escH(parsed.meta.leasing_anbieter||'Leasing')+'</span>' : '';
    return '<div class="flex items-start gap-3"><div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 flex-shrink-0 mt-0.5">✓</div>'
        +'<div class="flex-1 min-w-0">'
        +'<div class="flex items-center gap-2 flex-wrap"><p class="font-semibold text-sm text-gray-800">'+_escH(fileName)+'</p>'
        +'<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-'+tc+'-100 text-'+tc+'-700 font-semibold">'+parsed.header.beleg_typ+'</span>'
        +leasing+'</div>'
        +'<div class="flex gap-4 mt-1 text-xs text-gray-500">'
        +'<span>Nr. <strong>'+parsed.header.beleg_nr+'</strong></span>'
        +'<span>'+_escH(parsed.customer.name||'–')+'</span>'
        +'<span>'+parsed.items.filter(function(x){return !x.hinweis}).length+' Positionen</span>'
        +'<span class="font-bold text-gray-800">'+(parsed.totals.endbetrag||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'})+'</span>'
        +'</div>'
        +'<div class="flex gap-1 mt-1.5 flex-wrap">'
        +parsed.items.filter(function(x){return !x.hinweis && x.einzelpreis>100}).map(function(x){
            return '<span class="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-600 truncate max-w-[200px]">'+_escH(x.bezeichnung.substring(0,40))+'</span>';
        }).join('')
        +'</div></div></div>';
}


// ── Save All ──
window.wawiSaveAll = async function() {
    var container = document.getElementById('wawiParseResults');
    var saved = 0, errors = 0;
    var standortId = typeof currentUser !== 'undefined' && currentUser ? currentUser.standort_id : null;

    for(var i = 0; i < parsedQueue.length; i++) {
        var p = parsedQueue[i];
        p.standort_id = standortId;
        p.quelle = 'upload';
        p.quell_datei_name = p.source_file;

        try {
            var resp = await _sb().rpc('upsert_wawi_beleg', { p_data: p });
            if(resp.error) { errors++; console.error('WaWi save error:', resp.error); }
            else saved++;
        } catch(e) { errors++; console.error('WaWi save exception:', e); }
    }

    container.innerHTML = '<div class="vit-card p-5 text-center">'
        +'<div class="text-3xl mb-2">'+(errors===0?'🎉':'⚠️')+'</div>'
        +'<p class="font-bold text-gray-800">'+saved+' Beleg'+(saved!==1?'e':'')+' importiert'+(errors>0?', '+errors+' Fehler':'')+'</p>'
        +'<button onclick="showWawiTab(\'belege\')" class="mt-3 text-sm text-vit-orange font-semibold hover:underline">→ Zur Belegübersicht</button>'
        +'</div>';
    parsedQueue = [];
};

// ── Load Belege List ──
window.loadWawiBelege = async function() {
    var container = document.getElementById('wawiListContainer');
    if(!container) return;
    container.innerHTML = '<div class="p-6 text-center text-gray-400"><div class="animate-pulse">Lade Belege...</div></div>';

    var q = _sb().from('wawi_belege').select('id,beleg_typ,beleg_nr,datum,kunde_name,verkaeufer,endbetrag,ist_leasing,leasing_anbieter,status,kunden_nr').order('datum',{ascending:false}).limit(100);

    var fTyp = document.getElementById('wawiFilterTyp');
    if(fTyp && fTyp.value) q = q.eq('beleg_typ', fTyp.value);
    var fL = document.getElementById('wawiFilterLeasing');
    if(fL && fL.value) q = q.eq('ist_leasing', fL.value==='true');
    var fS = document.getElementById('wawiFilterSearch');
    if(fS && fS.value.length >= 2) q = q.or('beleg_nr.ilike.%'+fS.value+'%,kunde_name.ilike.%'+fS.value+'%');

    var {data, error} = await q;
    if(error){ container.innerHTML='<div class="p-4 text-red-500 text-sm">Fehler: '+error.message+'</div>'; return; }
    if(!data || data.length===0){ container.innerHTML='<div class="p-8 text-center text-gray-400"><div class="text-3xl mb-2">📭</div><p>Noch keine Belege importiert</p><p class="text-xs mt-1">Lade PDFs im Upload-Tab hoch oder sende Belege per E-Mail</p></div>'; return; }

    var typColors = {Angebot:'blue',Auftrag:'orange',Rechnung:'green'};
    var h = '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50 text-left text-xs text-gray-500 uppercase">'
        +'<th class="px-4 py-3">Typ</th><th class="px-4 py-3">Nr.</th><th class="px-4 py-3">Datum</th><th class="px-4 py-3">Kunde</th>'
        +'<th class="px-4 py-3">Verkäufer</th><th class="px-4 py-3 text-right">Betrag</th><th class="px-4 py-3">Leasing</th>'
        +'</tr></thead><tbody>';

    data.forEach(function(b) {
        var tc = typColors[b.beleg_typ]||'gray';
        var datum = b.datum ? new Date(b.datum).toLocaleDateString('de-DE') : '–';
        h += '<tr class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="showWawiBelegDetail(\''+b.id+'\')">';
        h += '<td class="px-4 py-3"><span class="text-[10px] px-2 py-0.5 rounded-full bg-'+tc+'-100 text-'+tc+'-700 font-bold">'+b.beleg_typ+'</span></td>';
        h += '<td class="px-4 py-3 font-mono font-bold text-gray-800">'+_escH(b.beleg_nr)+'</td>';
        h += '<td class="px-4 py-3 text-gray-600">'+datum+'</td>';
        h += '<td class="px-4 py-3 text-gray-800 font-medium truncate max-w-[200px]">'+_escH(b.kunde_name||'–')+'</td>';
        h += '<td class="px-4 py-3 text-gray-600">'+_escH(b.verkaeufer||'–')+'</td>';
        h += '<td class="px-4 py-3 text-right font-bold text-gray-800">'+(b.endbetrag||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'})+'</td>';
        h += '<td class="px-4 py-3">'+(b.ist_leasing?'<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">'+_escH(b.leasing_anbieter||'Ja')+'</span>':'<span class="text-xs text-gray-300">–</span>')+'</td>';
        h += '</tr>';
    });
    h += '</tbody></table></div>';
    container.innerHTML = h;
};

// ── Beleg Detail ──
window.showWawiBelegDetail = async function(id) {
    var modal = document.getElementById('wawiBelegModal');
    var detail = document.getElementById('wawiBelegDetail');
    modal.style.display = 'flex';
    detail.innerHTML = '<div class="text-center p-6"><div class="animate-pulse text-gray-400">Lade Beleg...</div></div>';

    var {data:b} = await _sb().from('wawi_belege').select('*').eq('id',id).single();
    if(!b){ detail.innerHTML='<p class="text-red-500">Beleg nicht gefunden</p>'; return; }
    var {data:pos} = await _sb().from('wawi_beleg_positionen').select('*').eq('beleg_id',id).order('sortierung');
    pos = pos || [];
    // Fallback: Positionen aus raw_json wenn keine separaten Einträge
    if(pos.length === 0 && b.raw_json && b.raw_json.items && b.raw_json.items.length > 0) {
        pos = b.raw_json.items.map(function(it, idx) {
            return { art_nr: it.art_nr, bezeichnung: it.bezeichnung, menge: it.menge, einzelpreis: it.einzelpreis, gesamtpreis: it.gesamtpreis, seriennummer: it.seriennummer || null, sortierung: idx+1, ist_hauptprodukt: (it.einzelpreis||0) > 500 };
        });
    }

    var typColors = {Angebot:'blue',Auftrag:'orange',Rechnung:'green'};
    var tc = typColors[b.beleg_typ]||'gray';
    var datum = b.datum ? new Date(b.datum).toLocaleDateString('de-DE') : '–';

    var h = '<div class="flex items-center justify-between mb-4">';
    h += '<div class="flex items-center gap-3"><span class="text-[11px] px-2.5 py-1 rounded-full bg-'+tc+'-100 text-'+tc+'-700 font-bold">'+b.beleg_typ+'</span>';
    h += '<span class="text-xl font-bold text-gray-800">#'+_escH(b.beleg_nr)+'</span></div>';
    h += '<button onclick="document.getElementById(\'wawiBelegModal\').style.display=\'none\'" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>';

    // Info Grid
    h += '<div class="grid grid-cols-2 gap-4 mb-5 text-sm">';
    h += '<div><span class="text-gray-400 text-xs block">Datum</span><strong>'+datum+'</strong></div>';
    h += '<div><span class="text-gray-400 text-xs block">Kunde</span><strong>'+_escH(b.kunde_name||'–')+'</strong>'+(b.kunde_ort?'<br><span class="text-xs text-gray-500">'+_escH(b.kunde_plz||'')+' '+_escH(b.kunde_ort)+'</span>':'')+'</div>';
    h += '<div><span class="text-gray-400 text-xs block">Verkäufer</span><strong>'+_escH(b.verkaeufer||'–')+'</strong></div>';
    h += '<div><span class="text-gray-400 text-xs block">Zahlung</span><strong>'+_escH(b.zahlungsbedingung||'–')+'</strong></div>';
    if(b.ist_leasing) h += '<div class="col-span-2"><span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">🚲 Leasing: '+_escH(b.leasing_anbieter||'Ja')+'</span></div>';
    h += '</div>';

    // Positionen
    h += '<h3 class="text-xs font-bold text-gray-500 uppercase mb-2">Positionen</h3>';
    h += '<div class="overflow-x-auto mb-4"><table class="w-full text-sm"><thead><tr class="text-left text-xs text-gray-400 border-b">';
    h += '<th class="pb-2">Art.-Nr.</th><th class="pb-2">Bezeichnung</th><th class="pb-2 text-center">Mg.</th><th class="pb-2 text-right">Einzel</th><th class="pb-2 text-right">Gesamt</th></tr></thead><tbody>';
    pos.forEach(function(p){
        var isMain = (p.einzelpreis||0) > 500;
        h += '<tr class="border-t border-gray-50'+(isMain?' bg-orange-50/50':'')+(p.ist_hinweis?' text-gray-400 italic':'')+'">';
        h += '<td class="py-1.5 pr-2 font-mono text-xs text-gray-500">'+_escH(p.art_nr||'–')+'</td>';
        h += '<td class="py-1.5 pr-2 '+(isMain?'font-semibold text-gray-800':'text-gray-700')+'">'+_escH(p.bezeichnung)+(p.seriennummer?'<br><span class="text-[10px] text-gray-400">SN: '+_escH(p.seriennummer)+'</span>':'')+'</td>';
        h += '<td class="py-1.5 text-center">'+(p.menge||'–')+'</td>';
        h += '<td class="py-1.5 text-right">'+(p.einzelpreis?p.einzelpreis.toLocaleString('de-DE',{style:'currency',currency:'EUR'}):'–')+'</td>';
        h += '<td class="py-1.5 text-right font-semibold">'+(p.gesamtpreis?p.gesamtpreis.toLocaleString('de-DE',{style:'currency',currency:'EUR'}):'–')+'</td>';
        h += '</tr>';
        if(p.zusatzinfo){ h += '<tr class="text-[10px] text-gray-400"><td></td><td colspan="4" class="pb-1">'+_escH(p.zusatzinfo)+'</td></tr>'; }
    });
    h += '</tbody></table></div>';

    // Totals
    h += '<div class="border-t-2 border-gray-200 pt-3 space-y-1 text-sm">';
    if(b.belegrabatt && b.belegrabatt!==0) h += '<div class="flex justify-between text-red-600"><span>Belegrabatt</span><span>'+b.belegrabatt.toLocaleString('de-DE',{style:'currency',currency:'EUR'})+'</span></div>';
    h += '<div class="flex justify-between text-gray-600"><span>Netto</span><span>'+(b.netto||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'})+'</span></div>';
    h += '<div class="flex justify-between text-gray-600"><span>MwSt '+(b.mwst_satz||19)+'%</span><span>'+(b.mwst_betrag||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'})+'</span></div>';
    h += '<div class="flex justify-between text-lg font-bold text-gray-800 pt-1 border-t"><span>Endbetrag</span><span>'+(b.endbetrag||0).toLocaleString('de-DE',{style:'currency',currency:'EUR'})+'</span></div>';
    if(b.skonto_prozent) h += '<div class="text-xs text-green-600 text-right">'+b.skonto_prozent+'% Skonto möglich</div>';
    h += '</div>';

    detail.innerHTML = h;
};

// ── Dashboard ──
window.loadWawiDashboard = async function() {
    var kpiEl = document.getElementById('wawiKpiCards');
    var typEl = document.getElementById('wawiChartTyp');
    var topEl = document.getElementById('wawiTopProducts');
    if(!kpiEl) return;

    // Summary query
    var {data:belege} = await _sb().from('wawi_belege').select('beleg_typ,endbetrag,ist_leasing,datum').eq('status','neu');
    belege = belege || [];

    var total=0, countA=0, countR=0, countAng=0, leasingSum=0;
    belege.forEach(function(b){
        total += (b.endbetrag||0);
        if(b.beleg_typ==='Auftrag') countA++;
        if(b.beleg_typ==='Rechnung') countR++;
        if(b.beleg_typ==='Angebot') countAng++;
        if(b.ist_leasing) leasingSum += (b.endbetrag||0);
    });

    function kpiCard(icon, label, value, color) {
        return '<div class="vit-card p-4 text-center"><div class="text-2xl mb-1">'+icon+'</div><div class="text-xl font-bold text-'+color+'-700">'+value+'</div><div class="text-[10px] text-gray-500 uppercase font-semibold mt-1">'+label+'</div></div>';
    }
    kpiEl.innerHTML = kpiCard('📄','Belege gesamt', belege.length, 'gray')
        + kpiCard('💰','Umsatz gesamt', total.toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}), 'green')
        + kpiCard('🚲','Davon Leasing', leasingSum.toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}), 'purple')
        + kpiCard('📊','Ø Belegwert', belege.length>0?(total/belege.length).toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}):'–', 'blue');

    // Typ breakdown
    var typData = [
        {typ:'Angebote', count:countAng, color:'#3B82F6'},
        {typ:'Aufträge', count:countA, color:'#EF7D00'},
        {typ:'Rechnungen', count:countR, color:'#22C55E'}
    ];
    var maxCount = Math.max(countAng, countA, countR, 1);
    typEl.innerHTML = typData.map(function(t){
        var pct = Math.round(t.count/maxCount*100);
        return '<div class="flex items-center gap-3 mb-3"><span class="text-xs w-24 text-gray-600 font-semibold">'+t.typ+'</span><div class="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden"><div class="h-full rounded-full flex items-center px-2 text-xs text-white font-bold" style="width:'+Math.max(pct,8)+'%;background:'+t.color+'">'+t.count+'</div></div></div>';
    }).join('');

    // Top Products
    var {data:top} = await _sb().from('v_wawi_top_produkte').select('*').order('gesamt_umsatz',{ascending:false}).limit(8);
    top = top || [];
    if(top.length===0){ topEl.innerHTML='<p class="text-gray-400 text-sm text-center py-6">Noch keine Daten</p>'; return; }
    topEl.innerHTML = '<div class="space-y-2">'+top.map(function(p,i){
        return '<div class="flex items-center gap-2 text-sm"><span class="w-5 text-center font-bold text-gray-400">'+(i+1)+'</span><span class="flex-1 truncate text-gray-800">'+_escH(p.bezeichnung)+'</span><span class="font-bold text-gray-800 whitespace-nowrap">'+(p.gesamt_umsatz||0).toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0})+'</span></div>';
    }).join('')+'</div>';
};

// ── Leasing ──
window.loadWawiLeasing = async function() {
    var kpiEl = document.getElementById('wawiLeasingKpis');
    var tableEl = document.getElementById('wawiLeasingTable');
    if(!kpiEl) return;

    var {data} = await _sb().from('v_wawi_leasing_uebersicht').select('*');
    data = data || [];

    var totalCount=0, totalSum=0, providers={};
    data.forEach(function(r){
        totalCount += (r.anzahl||0);
        totalSum += (r.summe_brutto||0);
        var p = r.leasing_anbieter||'Sonstige';
        if(!providers[p]) providers[p]={count:0,sum:0};
        providers[p].count += (r.anzahl||0);
        providers[p].sum += (r.summe_brutto||0);
    });

    function kpiCard(icon, label, value, color) {
        return '<div class="vit-card p-4 text-center"><div class="text-2xl mb-1">'+icon+'</div><div class="text-xl font-bold text-'+color+'-700">'+value+'</div><div class="text-[10px] text-gray-500 uppercase font-semibold mt-1">'+label+'</div></div>';
    }
    kpiEl.innerHTML = kpiCard('🚲','Leasing-Vorgänge',totalCount,'purple')
        + kpiCard('💰','Leasing-Volumen',totalSum.toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}),'green')
        + kpiCard('📊','Ø Leasing-Wert',totalCount>0?(totalSum/totalCount).toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}):'–','blue')
        + kpiCard('🏢','Anbieter',Object.keys(providers).length,'gray');

    if(Object.keys(providers).length===0){ tableEl.innerHTML='<p class="text-gray-400 text-sm text-center py-6">Noch keine Leasing-Daten</p>'; return; }

    var sortedProviders = Object.entries(providers).sort(function(a,b){return b[1].sum-a[1].sum;});
    var h = '<table class="w-full text-sm mt-3"><thead><tr class="text-left text-xs text-gray-400 border-b"><th class="pb-2">Anbieter</th><th class="pb-2 text-center">Anzahl</th><th class="pb-2 text-right">Volumen</th><th class="pb-2 text-right">Ø Wert</th></tr></thead><tbody>';
    sortedProviders.forEach(function(e){
        var name=e[0], d=e[1];
        h += '<tr class="border-t border-gray-100"><td class="py-2 font-semibold text-gray-800">'+_escH(name)+'</td>';
        h += '<td class="py-2 text-center">'+d.count+'</td>';
        h += '<td class="py-2 text-right font-bold">'+d.sum.toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0})+'</td>';
        h += '<td class="py-2 text-right text-gray-600">'+(d.count>0?(d.sum/d.count).toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}):'–')+'</td></tr>';
    });
    h += '</tbody></table>';
    tableEl.innerHTML = h;
};



// Strangler Fig
const _exports = {wawiPopulateForm,wawiRenderStatus,timeAgo,loadWawiSyncLog,loadWawiDataPreview,extractPdfText,parseEur,parseWawiText,renderParseCard};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[wawi-integration.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
