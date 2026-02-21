/**
 * views/hq-kommando.js - HQ Kommunikation, Kampagnen, Dokumente, Kalender, Aufgaben, Auswertung, Wissen, Support, Ideenboard, Shop
 * @module views/hq-kommando
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// === HQ KOMMUNIKATION ===
var hqAnnouncements = [];
var hqForumTopics = [];
var currentHqKommTab='announce';
export function showHqKommTab(tab){
    currentHqKommTab=tab;
    document.querySelectorAll('.hqkomm-tab-btn').forEach(function(b){b.className='hqkomm-tab-btn whitespace-nowrap py-3 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700';});
    var btn=document.querySelector('.hqkomm-tab-btn[data-hkt="'+tab+'"]');
    if(btn)btn.className='hqkomm-tab-btn whitespace-nowrap py-3 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
    renderHqKomm();
}
export function openAnkuendigungModal() {
    var html = '<div id="ankOverlay" onclick="closeAnkModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
    html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:24px;width:520px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
    html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-bold text-gray-800">\uD83D\uDCE2 Neue Ankuendigung</h3><button onclick="closeAnkModal()" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>';
    html += '<div class="space-y-3 mb-4">';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Titel *</label><input id="ankTitel" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="z.B. Neue Preisliste ab Maerz"></div>';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Kategorie</label><select id="ankKat" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="news">News</option><option value="event">Event</option><option value="schulung">Schulung</option><option value="marketing">Marketing</option><option value="sortiment">Sortiment</option><option value="preise">Preise</option><option value="it">IT</option></select></div>';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Inhalt *</label><textarea id="ankInhalt" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" rows="5" placeholder="Ankuendigungstext..."></textarea></div>';
    html += '<label class="flex items-center space-x-2"><input id="ankWichtig" type="checkbox" class="rounded"><span class="text-sm text-gray-600">Als wichtig markieren</span></label>';
    html += '</div>';
    html += '<div id="ankError" style="display:none" class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-3"></div>';
    html += '<button onclick="saveAnkuendigung()" id="ankSaveBtn" class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">Veroeffentlichen</button>';
    html += '</div></div>';
    var c = document.createElement('div'); c.id = 'ankContainer'; c.innerHTML = html; document.body.appendChild(c);
}
export function closeAnkModal() { var c = document.getElementById('ankContainer'); if(c) c.remove(); }
export async function saveAnkuendigung() {
    var titel = (document.getElementById('ankTitel')||{}).value;
    var inhalt = (document.getElementById('ankInhalt')||{}).value;
    var kategorie = (document.getElementById('ankKat')||{}).value || 'news';
    var wichtig = (document.getElementById('ankWichtig')||{}).checked || false;
    var errEl = document.getElementById('ankError');
    if(!titel||!titel.trim()||!inhalt||!inhalt.trim()) { if(errEl){errEl.textContent='Bitte Titel und Inhalt ausfuellen.';errEl.style.display='block';} return; }
    var btn = document.getElementById('ankSaveBtn');
    if(btn) { btn.disabled=true; btn.textContent='Wird gespeichert...'; }
    try {
        var resp = await _sb().from('ankuendigungen').insert({
            titel: titel.trim(), inhalt: inhalt.trim(), kategorie: kategorie,
            wichtig: wichtig, erstellt_von: _sbUser() ? _sbUser().id : null
        });
        if(resp.error) throw resp.error;
        closeAnkModal();
        alert('\u2705 Ankuendigung veroeffentlicht!');
        renderAnnouncements();
    } catch(err) {
        if(errEl){errEl.textContent='Fehler: '+err.message;errEl.style.display='block';}
        if(btn){btn.disabled=false;btn.textContent='Veroeffentlichen';}
    }
}

export function renderHqKomm(){
    var el=document.getElementById('hqKommContent');if(!el)return;
    var h='';
    if(currentHqKommTab==='announce'){
        h+='<div class="flex justify-end mb-4"><button onclick="alert(\'Neue Ankuendigung erstellen (Demo)\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">+ Neue Ankuendigung</button></div>';
        hqAnnouncements.forEach(function(a){
            var prioBg=a.priority==='hoch'?'border-l-4 border-red-500':a.priority==='mittel'?'border-l-4 border-yellow-400':'border-l-4 border-gray-300';
            var readPct=Math.round(a.read/a.total*100);
            h+='<div class="vit-card p-4 mb-3 '+prioBg+'">';
            h+='<div class="flex items-start justify-between"><div class="flex-1">';
            h+='<div class="flex items-center space-x-2"><p class="font-bold text-gray-800">'+a.title+'</p>';
            if(a.priority==='hoch') h+='<span class="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">WICHTIG</span>';
            h+='</div>';
            h+='<p class="text-xs text-gray-500 mt-1">'+a.author+' · '+a.date+' · Ziel: '+a.target+'</p>';
            h+='<p class="text-sm text-gray-600 mt-2">'+a.body+'</p>';
            h+='</div>';
            h+='<div class="text-right flex-shrink-0 ml-4"><p class="text-xs text-gray-400">Gelesen</p>';
            h+='<p class="text-lg font-bold '+(readPct>=90?'text-green-600':readPct>=50?'text-yellow-600':'text-red-500')+'">'+a.read+'/'+a.total+'</p>';
            h+='<div class="w-16 bg-gray-100 rounded-full h-1.5 mt-1"><div class="h-1.5 rounded-full '+(readPct>=90?'bg-green-500':'bg-yellow-500')+'" style="width:'+readPct+'%"></div></div>';
            h+='</div></div></div>';
        });
    } else if(currentHqKommTab==='rundmail'){
        h+='<div class="vit-card p-6"><h3 class="font-bold text-gray-800 mb-4">✉️ Rundmail an Standorte senden</h3>';
        h+='<div class="space-y-3">';
        h+='<select class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option>Alle Standorte (21)</option><option>Region Sued (8)</option><option>Region Nord (5)</option><option>Region West (5)</option><option>Region Ost (3)</option><option>Nur Inhaber</option></select>';
        h+='<input type="text" placeholder="Betreff" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">';
        h+='<textarea rows="6" placeholder="Nachricht an das Netzwerk..." class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></textarea>';
        h+='<div class="flex items-center space-x-3"><label class="flex items-center text-sm text-gray-600"><input type="checkbox" class="mr-2"> Als Ankuendigung im Portal anzeigen</label></div>';
        h+='<button onclick="this.textContent=\'✅ Gesendet!\';this.disabled=true;setTimeout(function(){this.textContent=\'📨 Senden\';this.disabled=false;}.bind(this),2000)" class="px-6 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">📨 Senden</button>';
        h+='</div></div>';
        h+='<h3 class="font-bold text-gray-800 mt-6 mb-3">Letzte Rundmails</h3>';
        var mails=[];
        mails.forEach(function(m){
            h+='<div class="vit-card p-3 flex items-center justify-between mb-2"><div><p class="text-sm font-semibold text-gray-800">'+m.subj+'</p><p class="text-xs text-gray-500">'+m.date+' · An: '+m.to+'</p></div><span class="text-xs font-semibold text-gray-500">Geoeffnet: '+m.opened+'</span></div>';
        });
    } else if(currentHqKommTab==='forum'){
        h+='<p class="text-sm text-gray-500 mb-4">Netzwerk-Forum: Moderieren und Pinnen von Beitraegen aller Standorte.</p>';
        hqForumTopics.forEach(function(f){
            h+='<div class="vit-card p-4 flex items-center space-x-3 mb-2">';
            if(f.pinned) h+='<span class="text-vit-orange text-sm">📌</span>'; else h+='<span class="text-gray-300 text-sm">💬</span>';
            h+='<div class="flex-1 min-w-0"><p class="font-semibold text-sm text-gray-800 truncate">'+f.title+'</p><p class="text-xs text-gray-500">'+f.author+' · '+f.date+'</p></div>';
            h+='<div class="text-right flex-shrink-0"><span class="text-xs font-bold text-gray-600">'+f.replies+' Antworten</span></div>';
            h+='<button onclick="alert(\'Beitrag '+(f.pinned?'loesen':'pinnen')+' (Demo)\')" class="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50">'+(f.pinned?'Loesen':'Pinnen')+'</button>';
            h+='</div>';
        });
    }
    el.innerHTML=h;
}

// === HQ KAMPAGNEN ===
var hqKampagnen = [];
export function renderHqKampagnen(){
    var aktiv=hqKampagnen.filter(function(k){return k.status==='aktiv';}).length;
    var geplant=hqKampagnen.filter(function(k){return k.status==='geplant';}).length;
    var beendet=hqKampagnen.filter(function(k){return k.status==='beendet';}).length;
    var totalBudget=hqKampagnen.reduce(function(a,k){return a+k.budget;},0);
    var avgUmsetzung=Math.round(hqKampagnen.filter(function(k){return k.status==='aktiv';}).reduce(function(a,k){return a+Math.round(k.umgesetzt/k.standorte*100);},0)/(aktiv||1));
    var kpi=document.getElementById('hqKampKpis');
    if(kpi) kpi.innerHTML='<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-gray-800">'+hqKampagnen.length+'</p><p class="text-xs text-gray-500">Kampagnen total</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-green-600">'+aktiv+'</p><p class="text-xs text-gray-500">Aktiv</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-blue-600">'+geplant+'</p><p class="text-xs text-gray-500">Geplant</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-gray-400">'+beendet+'</p><p class="text-xs text-gray-500">Beendet</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-vit-orange">'+avgUmsetzung+'%</p><p class="text-xs text-gray-500">Ø Umsetzung (aktiv)</p></div>';

    var el=document.getElementById('hqKampList');if(!el)return;
    var h='';
    var statusCls={aktiv:'bg-green-100 text-green-700',geplant:'bg-blue-100 text-blue-700',beendet:'bg-gray-100 text-gray-500'};
    var statusLabel={aktiv:'🟢 Aktiv',geplant:'🔵 Geplant',beendet:'⚪ Beendet'};
    var typLabel={saisonal:'🌸 Saison',produkt:'🚲 Produkt',event:'🎪 Event',social:'📱 Social'};
    hqKampagnen.forEach(function(k){
        var pct=k.standorte?Math.round(k.umgesetzt/k.standorte*100):0;
        h+='<div class="vit-card p-5">';
        h+='<div class="flex items-start justify-between mb-3"><div><h3 class="font-bold text-gray-800">'+k.name+'</h3>';
        h+='<p class="text-xs text-gray-500">'+k.start+' bis '+k.end+' · Budget: '+fmt(k.budget)+' EUR</p></div>';
        h+='<div class="flex items-center space-x-2"><span class="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">'+(typLabel[k.type]||k.type)+'</span>';
        h+='<span class="text-[10px] px-2 py-0.5 rounded-full font-bold '+(statusCls[k.status]||'')+'">'+(statusLabel[k.status]||k.status)+'</span></div></div>';
        h+='<p class="text-sm text-gray-600 mb-3">'+k.desc+'</p>';
        h+='<div class="flex items-center space-x-4">';
        h+='<div class="flex-1"><p class="text-xs text-gray-500 mb-1">Umsetzung: '+k.umgesetzt+'/'+k.standorte+' Standorte ('+pct+'%)</p>';
        h+='<div class="w-full bg-gray-100 rounded-full h-2.5"><div class="h-2.5 rounded-full '+(pct>=80?'bg-green-500':pct>=50?'bg-yellow-500':'bg-red-500')+'" style="width:'+pct+'%"></div></div></div>';
        if(k.status!=='beendet') h+='<button onclick="alert(\'Kampagne bearbeiten (Demo)\')" class="text-xs px-3 py-1.5 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200">Bearbeiten</button>';
        h+='</div></div>';
    });
    el.innerHTML=h;
}
export function addHqKampagne(){
    var n=document.getElementById('hqKampName').value;if(!n){alert(_t('alert_enter_name'));return;}
    hqKampagnen.unshift({id:hqKampagnen.length+1,name:n,type:document.getElementById('hqKampType').value,start:document.getElementById('hqKampStart').value||'2026-03-01',end:document.getElementById('hqKampEnd').value||'2026-04-30',status:'geplant',standorte:21,umgesetzt:0,budget:0,desc:document.getElementById('hqKampDesc').value||''});
    document.getElementById('hqKampModal').classList.add('hidden');document.getElementById('hqKampName').value='';
    renderHqKampagnen();
}

// === HQ DOKUMENTE ===
var hqDokumente = [
    {id:1,name:'Franchise-Handbuch v4.2',kat:'richtlinie',date:'2026-01-15',size:'2.4 MB',type:'PDF',target:'alle',downloads:18},
    {id:2,name:'Einkaufsrichtlinie Q1/2026',kat:'richtlinie',date:'2026-02-10',size:'840 KB',type:'PDF',target:'alle',downloads:15},
    {id:3,name:'Margen-Kalkulation Vorlage',kat:'vorlage',date:'2026-01-20',size:'120 KB',type:'XLSX',target:'alle',downloads:12},
    {id:4,name:'Angebots-Template vit:bikes',kat:'vorlage',date:'2025-11-01',size:'95 KB',type:'DOCX',target:'alle',downloads:21},
    {id:5,name:'BWA-Analyse Checkliste',kat:'vorlage',date:'2026-01-08',size:'65 KB',type:'PDF',target:'Inhaber',downloads:9},
    {id:6,name:'Schulung: Bosch Smart System',kat:'schulung',date:'2026-02-08',size:'15 MB',type:'MP4',target:'alle',downloads:8},
    {id:7,name:'Schulung: Verkaufsgespraeche fuehren',kat:'schulung',date:'2025-12-15',size:'22 MB',type:'MP4',target:'alle',downloads:14},
    {id:8,name:'Schulung: Reklamationsmanagement',kat:'schulung',date:'2025-10-20',size:'18 MB',type:'MP4',target:'alle',downloads:19},
    {id:9,name:'Muster-Arbeitsvertrag Verkaeufer',kat:'vertrag',date:'2025-09-01',size:'180 KB',type:'DOCX',target:'Inhaber',downloads:7},
    {id:10,name:'Muster-Arbeitsvertrag Werkstatt',kat:'vertrag',date:'2025-09-01',size:'175 KB',type:'DOCX',target:'Inhaber',downloads:5},
    {id:11,name:'Social Media Guidelines',kat:'richtlinie',date:'2026-01-25',size:'1.1 MB',type:'PDF',target:'alle',downloads:11},
    {id:12,name:'Ladenbau-Richtlinie CI/CD',kat:'richtlinie',date:'2025-06-01',size:'3.8 MB',type:'PDF',target:'alle',downloads:20}
];
var currentHqDokFilter='all';
export function filterHqDok(f){
    currentHqDokFilter=f;
    document.querySelectorAll('.hqdok-filter').forEach(function(b){b.className='hqdok-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn=document.querySelector('.hqdok-filter[data-hdf="'+f+'"]');
    if(btn)btn.className='hqdok-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderHqDokumente();
}

var netzDokCache = null;
export async function loadNetzwerkDokumente() {
    try {
        var resp = await _sb().from('netzwerk_dokumente').select('*, users(name)').order('created_at', {ascending:false});
        if(resp.error) throw resp.error;
        netzDokCache = resp.data || [];
    } catch(e) { netzDokCache = []; console.warn('Dok load:', e); }
    renderHqDokumente();
}

export function renderHqDokumente(){
    // Wenn DB-Daten da sind, nutze die; sonst Fallback auf hardcoded
    var allDoks = netzDokCache || hqDokumente || [];
    var isFromDb = netzDokCache !== null && netzDokCache.length > 0;
    var isHQ = _sbProfile() && _sbProfile().is_hq;

    var list = currentHqDokFilter==='all' ? allDoks : allDoks.filter(function(d){ return isFromDb ? d.kategorie===currentHqDokFilter : d.kat===currentHqDokFilter; });

    var kpi=document.getElementById('hqDokKpis');
    var totalCount = allDoks.length;
    var richtCount = allDoks.filter(function(d){return (isFromDb?d.kategorie:d.kat)==='richtlinie';}).length;
    var vorlCount = allDoks.filter(function(d){return (isFromDb?d.kategorie:d.kat)==='vorlage';}).length;
    var schulCount = allDoks.filter(function(d){return (isFromDb?d.kategorie:d.kat)==='schulung';}).length;
    if(kpi) kpi.innerHTML='<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-gray-800">'+totalCount+'</p><p class="text-xs text-gray-500">Dokumente</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-blue-600">'+richtCount+'</p><p class="text-xs text-gray-500">Richtlinien</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-green-600">'+vorlCount+'</p><p class="text-xs text-gray-500">Vorlagen</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-purple-600">'+schulCount+'</p><p class="text-xs text-gray-500">Schulungen</p></div>';

    var el=document.getElementById('hqDokList');if(!el)return;
    var h='';
    var katIcons={richtlinie:'\uD83D\uDCCB',vorlage:'\uD83D\uDCC4',schulung:'\uD83C\uDF93',vertrag:'\uD83D\uDCD1',sonstiges:'\uD83D\uDCC1'};
    list.forEach(function(d){
        var kat = isFromDb ? d.kategorie : d.kat;
        var name = isFromDb ? d.titel : d.name;
        var dateStr = isFromDb ? new Date(d.created_at).toLocaleDateString('de-DE') : d.date;
        var sizeStr = isFromDb ? formatFileSize(d.datei_groesse) : d.size;
        var fileName = isFromDb ? (d.datei_name||'') : '';
        var ext = fileName.split('.').pop().toUpperCase();
        var typeColors={PDF:'bg-red-100 text-red-600',XLSX:'bg-green-100 text-green-700',DOCX:'bg-blue-100 text-blue-700',MP4:'bg-purple-100 text-purple-700',PNG:'bg-pink-100 text-pink-600',JPG:'bg-pink-100 text-pink-600'};

        h+='<div class="vit-card p-3 flex items-center space-x-3">';
        h+='<span class="text-2xl">'+(katIcons[kat]||'\uD83D\uDCC1')+'</span>';
        h+='<div class="flex-1 min-w-0"><p class="font-semibold text-sm text-gray-800 truncate">'+name+'</p>';
        h+='<p class="text-[10px] text-gray-500">'+dateStr+' \u00B7 '+sizeStr;
        if(isFromDb && d.users && d.users.name) h+=' \u00B7 '+d.users.name;
        h+='</p></div>';
        if(ext) h+='<span class="text-[10px] px-2 py-0.5 rounded-full font-bold '+(typeColors[ext]||'bg-gray-100 text-gray-600')+'">'+ext+'</span>';
        if(isFromDb) {
            h+='<button onclick="downloadDokument(\''+d.datei_url+'\')" class="text-xs px-3 py-1 bg-vit-orange text-white rounded-lg hover:opacity-90">\u2193</button>';
            if(isHQ) h+='<button onclick="deleteNetzwerkDok(\''+d.id+'\')" class="text-xs px-2 py-1 text-gray-300 hover:text-red-500">\u2715</button>';
        } else {
            h+='<span class="text-xs text-gray-400">'+(d.downloads||0)+'x \u2193</span>';
            h+='<button onclick="alert(\'Download fuer '+name+' wird vorbereitet...\')" class="text-xs px-3 py-1 bg-vit-orange text-white rounded-lg hover:opacity-90">\u2193</button>';
        }
        h+='</div>';
    });
    if(!list.length) h='<div class="text-center py-8 text-gray-400">Keine Dokumente in dieser Kategorie.</div>';
    el.innerHTML=h;
}

export function formatFileSize(bytes) {
    if(!bytes) return '—';
    if(bytes < 1024) return bytes + ' B';
    if(bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/1048576).toFixed(1) + ' MB';
}

export async function downloadDokument(path) {
    try {
        var resp = await _sb().storage.from('dokumente').createSignedUrl(path, 3600);
        if(resp.error) throw resp.error;
        window.open(resp.data.signedUrl, '_blank');
    } catch(err) { alert('Download-Fehler: '+err.message); }
}

export async function deleteNetzwerkDok(id) {
    if(!confirm(_t('confirm_delete_doc'))) return;
    try {
        var dokResp = await _sb().from('netzwerk_dokumente').select('datei_url').eq('id',id).single();
        if(dokResp.data && dokResp.data.datei_url) {
            await _sb().storage.from('dokumente').remove([dokResp.data.datei_url]);
        }
        await _sb().from('netzwerk_dokumente').delete().eq('id',id);
        await loadNetzwerkDokumente();
    } catch(err) { alert('Fehler: '+err.message); }
}

// === HQ KALENDER (DB-backed) ===
var hqKalTermine = [];

export async function loadHqKalTermine() {
    try {
        var resp = await _sb().from('termine').select('*').eq('ist_netzwerk_termin', true).order('start_zeit', {ascending:true});
        if(!resp.error && resp.data && resp.data.length > 0) {
            hqKalTermine = (resp.data||[]).map(function(t) {
                var d = new Date(t.start_zeit);
                return {
                    id: t.id, title: t.titel,
                    date: d.toISOString().slice(0,10),
                    time: t.ganztaegig ? '23:59' : String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'),
                    type: t.typ || 'meeting',
                    target: t.zielgruppe || 'alle',
                    pflicht: t.pflicht || false,
                    ms365_event_id: t.ms365_event_id || null
                };
            });
        } else {
            // Fallback: no data yet
            hqKalTermine = [];
        }
    } catch(err) { console.warn('HQ Kalender load:', err); }
    renderHqKalender();
}
var currentHqKalFilter='all';
export function filterHqKal(f){
    currentHqKalFilter=f;
    document.querySelectorAll('.hqkal-filter').forEach(function(b){b.className='hqkal-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn=document.querySelector('.hqkal-filter[data-hkf="'+f+'"]');
    if(btn)btn.className='hqkal-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderHqKalender();
}
export function renderHqKalender(){
    var today=new Date().toISOString().slice(0,10);
    var list=hqKalTermine.filter(function(t){
        if(currentHqKalFilter!=='all' && t.type!==currentHqKalFilter) return false;
        return true;
    }).sort(function(a,b){return a.date>b.date?1:-1;});

    var upcoming=list.filter(function(t){return t.date>=today;}).length;
    var past=list.filter(function(t){return t.date<today;}).length;
    var pflicht=list.filter(function(t){return t.pflicht && t.date>=today;}).length;
    var kpi=document.getElementById('hqKalKpis');
    if(kpi) kpi.innerHTML='<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-gray-800">'+hqKalTermine.length+'</p><p class="text-xs text-gray-500">Termine total</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-vit-orange">'+upcoming+'</p><p class="text-xs text-gray-500">Anstehend</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-red-500">'+pflicht+'</p><p class="text-xs text-gray-500">Pflichttermine</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-gray-400">'+past+'</p><p class="text-xs text-gray-500">Vergangen</p></div>';

    var el=document.getElementById('hqKalList');if(!el)return;
    var h='';
    var typeIcons={schulung:'🎓',event:'🎪',deadline:'⏰',meeting:'🤝'};
    var typeCls={schulung:'bg-purple-100 text-purple-700',event:'bg-green-100 text-green-700',deadline:'bg-red-100 text-red-700',meeting:'bg-blue-100 text-blue-700'};
    var dayNames=['So','Mo','Di','Mi','Do','Fr','Sa'];
    list.forEach(function(t){
        var dd=new Date(t.date);var dayName=dayNames[dd.getDay()];
        var isPast=t.date<today;
        h+='<div class="vit-card p-3 flex items-center space-x-3 '+(isPast?'opacity-50':'')+'">';
        h+='<div class="text-center flex-shrink-0 w-14 '+(isPast?'':'bg-orange-50 rounded-lg p-1')+'"><p class="text-[10px] text-gray-500">'+dayName+'</p><p class="text-lg font-bold text-gray-800">'+parseInt(t.date.slice(8))+'</p><p class="text-[10px] text-gray-400">'+t.date.slice(5,7)+'.'+t.date.slice(0,4)+'</p></div>';
        h+='<span class="text-xl">'+(typeIcons[t.type]||'📅')+'</span>';
        h+='<div class="flex-1 min-w-0"><p class="font-semibold text-sm text-gray-800 truncate">'+t.title+'</p>';
        h+='<p class="text-[10px] text-gray-500">'+t.time+' Uhr · Ziel: '+t.target+(t.pflicht?' · <span class="text-red-500 font-bold">PFLICHT</span>':'')+'</p></div>';
        h+='<span class="text-[10px] px-2 py-0.5 rounded-full font-bold '+(typeCls[t.type]||'')+'">'+(typeIcons[t.type]||'')+' '+t.type.charAt(0).toUpperCase()+t.type.slice(1)+'</span>';
        h+='</div>';
    });
    el.innerHTML=h;
}
export async function addHqKalTermin(){
    var title=document.getElementById('hqKalTitle').value;if(!title){alert(_t('alert_enter_title'));return;}
    var date=document.getElementById('hqKalDate').value||new Date().toISOString().slice(0,10);
    var time=document.getElementById('hqKalTime').value||'09:00';
    var type=document.getElementById('hqKalType').value;
    var target=document.getElementById('hqKalTarget').value;
    var payload={
        titel:title, start_zeit:date+'T'+time+':00', typ:type,
        ist_netzwerk_termin:true, zielgruppe:target==='alle'?'alle':target,
        pflicht:false, ganztaegig:type==='deadline',
        erstellt_von:_sbUser() ?_sbUser().id:null,
        erstellt_von_name:_sbProfile() ?_sbProfile().name:'HQ'
    };
    try{
        var resp=await _sb().from('termine').insert(payload);
        if(resp.error)throw resp.error;
        document.getElementById('hqKalModal').classList.add('hidden');
        document.getElementById('hqKalTitle').value='';
        await loadHqKalTermine();
    }catch(err){alert('Fehler: '+(err.message||err));}
}

// === HQ AUFGABEN ===
var hqTasks = [
    {id:1,title:'Fruehjahrs-Deko aufbauen (POS-Material)',deadline:'2026-03-01',prio:'hoch',target:'alle',status:'offen',done:8,total:21,kat:'Marketing'},
    {id:2,title:'Vororder Sommer 2026 platzieren',deadline:'2026-03-01',prio:'hoch',target:'alle',status:'inprogress',done:14,total:21,kat:'Einkauf'},
    {id:3,title:'BWA Januar einreichen',deadline:'2026-02-20',prio:'hoch',target:'Inhaber',status:'inprogress',done:15,total:21,kat:'Controlling'},
    {id:4,title:'Local Hero Video drehen: Fruehjahrsthema',deadline:'2026-02-28',prio:'mittel',target:'alle',status:'offen',done:5,total:21,kat:'Marketing'},
    {id:5,title:'Werkstatt-Inventur durchfuehren',deadline:'2026-03-01',prio:'mittel',target:'Region Süd',status:'inprogress',done:4,total:8,kat:'Operations'},
    {id:6,title:'Schulungs-Video Bosch anschauen',deadline:'2026-02-28',prio:'niedrig',target:'alle',status:'offen',done:8,total:21,kat:'Wissen'},
    {id:7,title:'Kundenzufriedenheits-Umfrage ausfuellen',deadline:'2026-02-15',prio:'mittel',target:'alle',status:'inprogress',done:17,total:21,kat:'Support'},
    {id:8,title:'Jobrad-Info im Laden aushangen',deadline:'2026-03-15',prio:'niedrig',target:'alle',status:'offen',done:0,total:21,kat:'Marketing'},
    {id:9,title:'Social Media Profil aktualisieren',deadline:'2026-01-31',prio:'niedrig',target:'alle',status:'done',done:21,total:21,kat:'Marketing'},
    {id:10,title:'Weihnachts-Deko abbauen',deadline:'2026-01-10',prio:'niedrig',target:'alle',status:'done',done:21,total:21,kat:'Operations'}
];
var currentHqTaskFilter='all';
export function filterHqTasks(f){
    currentHqTaskFilter=f;
    document.querySelectorAll('.hqtask-filter').forEach(function(b){b.className='hqtask-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn=document.querySelector('.hqtask-filter[data-htf="'+f+'"]');
    if(btn)btn.className='hqtask-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderHqAufgaben();
}
export function renderHqAufgaben(){
    var today=new Date().toISOString().slice(0,10);
    var list=hqTasks.filter(function(t){
        if(currentHqTaskFilter==='all') return true;
        return t.status===currentHqTaskFilter;
    });
    var offen=hqTasks.filter(function(t){return t.status==='offen';}).length;
    var inprog=hqTasks.filter(function(t){return t.status==='inprogress';}).length;
    var done=hqTasks.filter(function(t){return t.status==='done';}).length;
    var overdue=hqTasks.filter(function(t){return t.status!=='done'&&t.deadline<today;}).length;
    var avgCompl=Math.round(hqTasks.filter(function(t){return t.status!=='done';}).reduce(function(a,t){return a+Math.round(t.done/t.total*100);},0)/(hqTasks.filter(function(t){return t.status!=='done';}).length||1));
    var kpi=document.getElementById('hqTaskKpis');
    if(kpi) kpi.innerHTML='<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-gray-800">'+hqTasks.length+'</p><p class="text-xs text-gray-500">Aufgaben total</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-red-500">'+offen+'</p><p class="text-xs text-gray-500">Offen</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-blue-600">'+inprog+'</p><p class="text-xs text-gray-500">In Arbeit</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-green-600">'+done+'</p><p class="text-xs text-gray-500">Erledigt</p></div>'
        +'<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-vit-orange">'+avgCompl+'%</p><p class="text-xs text-gray-500">Ø Umsetzung</p></div>';

    var el=document.getElementById('hqTaskList');if(!el)return;
    var h='';
    var prioIcons={hoch:'🔴',mittel:'🟡',niedrig:'🟢'};
    var statusCls={offen:'bg-red-100 text-red-700',inprogress:'bg-blue-100 text-blue-700',done:'bg-green-100 text-green-700'};
    var statusLabel={offen:'Offen',inprogress:'In Arbeit',done:'Erledigt'};
    list.sort(function(a,b){var po={hoch:0,mittel:1,niedrig:2};return (po[a.prio]||1)-(po[b.prio]||1);});
    list.forEach(function(t){
        var pct=Math.round(t.done/t.total*100);
        var isOver=t.status!=='done'&&t.deadline<today;
        h+='<div class="vit-card p-4 '+(isOver?'border-l-4 border-red-500':'')+'">';
        h+='<div class="flex items-start justify-between mb-2"><div class="flex-1">';
        h+='<div class="flex items-center space-x-2"><span>'+(prioIcons[t.prio]||'')+'</span><p class="font-bold text-sm text-gray-800">'+t.title+'</p></div>';
        h+='<p class="text-[10px] text-gray-500 mt-0.5">'+t.kat+' · Deadline: '+t.deadline+' · Ziel: '+t.target+(isOver?' · <span class="text-red-500 font-bold">'+_t('todo_overdue')+'</span>':'')+'</p>';
        h+='</div>';
        h+='<span class="text-[10px] px-2 py-0.5 rounded-full font-bold '+(statusCls[t.status]||'')+'">'+(statusLabel[t.status]||t.status)+'</span></div>';
        h+='<div class="flex items-center space-x-3"><div class="flex-1">';
        h+='<div class="flex items-center justify-between mb-0.5"><span class="text-[10px] text-gray-500">'+t.done+' / '+t.total+' Standorte ('+pct+'%)</span></div>';
        h+='<div class="w-full bg-gray-100 rounded-full h-2"><div class="h-2 rounded-full '+(pct>=80?'bg-green-500':pct>=50?'bg-yellow-500':'bg-red-400')+'" style="width:'+pct+'%"></div></div>';
        h+='</div></div></div>';
    });
    if(!list.length) h='<div class="text-center py-8 text-gray-400"><p class="text-3xl mb-2">✅</p><p class="text-sm">Keine Aufgaben in diesem Filter</p></div>';
    el.innerHTML=h;
}
export function addHqTask(){
    var title=document.getElementById('hqTaskTitle').value;if(!title){alert(_t('alert_enter_task'));return;}
    var target=document.getElementById('hqTaskTarget').value;
    var total=target==='alle'?21:target==='region_sued'?8:target==='region_nord'?5:target==='region_west'?5:3;
    hqTasks.unshift({id:hqTasks.length+1,title:title,deadline:document.getElementById('hqTaskDeadline').value||'2026-03-31',prio:document.getElementById('hqTaskPrio').value,target:target==='alle'?'alle':target.replace('region_','Region '),status:'offen',done:0,total:total,kat:'HQ'});
    document.getElementById('hqTaskModal').classList.add('hidden');document.getElementById('hqTaskTitle').value='';
    renderHqAufgaben();
}

// === HQ AUSWERTUNG: Portal-Nutzung ===
// ========================================
// PORTAL-NUTZUNG MODUL - STANDALONE VERSION
// NUR für das Modul "Nutzung Portal" (hqAuswertung)
// 
// ERSETZE HIERMIT (in index.html):
// Von: var portalNutzung = [
// Bis: // === HQ WISSEN-VERWALTUNG ===
//
// Zeilen ca. 11726-11820
// ========================================

// === HILFSFUNKTIONEN ===

// Berechnet das Alter einer BWA in Tagen
export function calculateBwaAge(uploadDate) {
  if (!uploadDate) return null;
  const upload = new Date(uploadDate);
  const now = new Date();
  const diffTime = Math.abs(now - upload);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Zählt wie viele Features ein Standort nutzt (max 7)
export function countFeaturesUsed(s) {
  let count = 0;
  if (s.termine_30d > 0) count++; // Kalender
  if (s.todos_created_30d > 0) count++; // Aufgaben
  if (s.leads_30d > 0) count++; // Verkauf/Pipeline
  if (s.latest_bwa_month) count++; // BWA/Controlling
  if (s.chat_messages_30d > 0) count++; // Chat
  if (s.tickets_total > 0) count++; // Support
  if (s.forum_posts_30d > 0) count++; // Forum
  return count;
}

// Berechnet Activity Score (0-100 Punkte)
export function calculateActivityScore(s) {
  let score = 0;
  
  // 1. Team-Beteiligung (20 Punkte)
  if (s.user_count > 0) {
    const participationRate = s.active_users / s.user_count;
    score += Math.min(20, participationRate * 20);
  }
  
  // 2. Feature-Nutzung (30 Punkte)
  const featureScore = (s.features_used / 7) * 15;
  score += featureScore;
  
  // BWA-Bonus (15 Punkte)
  if (s.latest_bwa_month) {
    const bwaAge = calculateBwaAge(s.latest_bwa_upload);
    if (bwaAge !== null && bwaAge <= 45) {
      score += 15; // BWA aktuell
    } else if (bwaAge !== null && bwaAge <= 90) {
      score += 10; // BWA etwas älter
    } else {
      score += 5; // BWA sehr alt
    }
  }
  
  // 3. Produktivität (30 Punkte)
  score += Math.min(10, s.todos_done_30d / 5); // max 10 bei 50+ Todos
  score += Math.min(10, s.termine_30d / 3); // max 10 bei 30+ Terminen
  score += Math.min(10, s.leads_30d / 2); // max 10 bei 20+ Leads
  
  // 4. Kommunikation (20 Punkte)
  score += Math.min(10, s.chat_messages_30d / 5); // max 10 bei 50+ Chat
  const commScore = Math.min(5, s.tickets_total) + Math.min(5, s.forum_posts_30d / 2);
  score += Math.min(10, commScore);
  
  return Math.round(score);
}

// === DATEN LADEN ===

// Lädt Portal-Nutzungsdaten aus Supabase
export async function loadPortalNutzungData() {
  try {
    // Supabase RPC-Call
    const { data, error } = await _sb().rpc('get_portal_usage_stats');
    
    if (error) {
      console.error('Error loading portal usage stats:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.warn('No usage data returned from database');
      return [];
    }
    
    // Daten transformieren
    return data.map(standort => {
      const features_used = countFeaturesUsed(standort);
      const transformed = {
        id: standort.standort_id,
        name: standort.standort_name,
        user_count: parseInt(standort.user_count),
        active_users: parseInt(standort.active_users),
        termine_30d: parseInt(standort.termine_30d),
        todos_created_30d: parseInt(standort.todos_created_30d),
        todos_done_30d: parseInt(standort.todos_done_30d),
        leads_30d: parseInt(standort.leads_30d),
        pipeline_value: parseFloat(standort.pipeline_value),
        latest_bwa_month: standort.latest_bwa_month,
        latest_bwa_upload: standort.latest_bwa_upload,
        bwa_age_days: calculateBwaAge(standort.latest_bwa_upload),
        chat_messages_30d: parseInt(standort.chat_messages_30d),
        tickets_total: parseInt(standort.tickets_total),
        tickets_open: parseInt(standort.tickets_open),
        forum_posts_30d: parseInt(standort.forum_posts_30d),
        features_used: features_used
      };
      
      transformed.score = calculateActivityScore(transformed);
      return transformed;
    });
    
  } catch (err) {
    console.error('Error in loadPortalNutzungData:', err);
    return [];
  }
}

// === RENDER-FUNKTION ===

// Rendert das komplette HQ Auswertung Dashboard
export async function renderHqAuswertung() {
  // Daten laden
  const usageData = await loadPortalNutzungData();
  
  if (!usageData || usageData.length === 0) {
    console.warn('No usage data available - showing empty state');
    const kpiEl = document.getElementById('hqAuswKpis');
    if (kpiEl) {
      kpiEl.innerHTML = '<div class="col-span-5 text-center text-gray-500 p-8">Keine Nutzungsdaten verfügbar. Bitte SQL-Funktion in Supabase erstellen.</div>';
    }
    return;
  }
  
  // Nach Score sortieren
  const sorted = usageData.slice().sort((a, b) => b.score - a.score);
  const totalStandorte = usageData.length;
  
  // === KPI BERECHNUNG ===
  const avgScore = Math.round(usageData.reduce((sum, s) => sum + s.score, 0) / totalStandorte);
  
  const avgParticipation = Math.round(
    usageData.reduce((sum, s) => {
      return sum + (s.user_count > 0 ? (s.active_users / s.user_count) * 100 : 0);
    }, 0) / totalStandorte
  );
  
  const bwaCount = usageData.filter(s => s.bwa_age_days !== null && s.bwa_age_days <= 45).length;
  const avgFeatures = (usageData.reduce((sum, s) => sum + s.features_used, 0) / totalStandorte).toFixed(1);
  const inactiveCount = usageData.filter(s => s.score < 30).length;
  
  // === KPI-KARTEN ===
  const kpiEl = document.getElementById('hqAuswKpis');
  if (kpiEl) {
    kpiEl.innerHTML = `
      <div class="vit-card p-4 text-center">
        <p class="text-3xl font-bold text-gray-800">${avgScore}</p>
        <p class="text-xs text-gray-500 mt-1">Ø Activity Score</p>
      </div>
      <div class="vit-card p-4 text-center">
        <p class="text-3xl font-bold text-blue-600">${avgParticipation}%</p>
        <p class="text-xs text-gray-500 mt-1">Ø Team-Beteiligung</p>
      </div>
      <div class="vit-card p-4 text-center">
        <p class="text-3xl font-bold ${bwaCount >= Math.floor(totalStandorte * 0.7) ? 'text-green-600' : 'text-yellow-500'}">${bwaCount}/${totalStandorte}</p>
        <p class="text-xs text-gray-500 mt-1">Aktuelle BWA</p>
      </div>
      <div class="vit-card p-4 text-center">
        <p class="text-3xl font-bold text-vit-orange">${avgFeatures}</p>
        <p class="text-xs text-gray-500 mt-1">Ø Features genutzt</p>
      </div>
      <div class="vit-card p-4 text-center">
        <p class="text-3xl font-bold ${inactiveCount > 3 ? 'text-red-500' : 'text-gray-500'}">${inactiveCount}</p>
        <p class="text-xs text-gray-500 mt-1">Niedrige Aktivität</p>
      </div>
    `;
  }
  
  // === TOP 5 ===
  const topEl = document.getElementById('hqAuswTop');
  if (topEl) {
    let html = '';
    sorted.slice(0, 5).forEach((s, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
      html += `
        <div class="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
          <span class="text-sm font-bold text-gray-400 w-6">${medal || (index + 1)}</span>
          <div class="flex-1">
            <p class="text-xs font-semibold text-gray-800">${s.name}</p>
            <p class="text-[10px] text-gray-500">${s.active_users}/${s.user_count} User • ${s.features_used}/7 Features</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold text-vit-orange">${s.score}</p>
            <p class="text-[10px] text-gray-500">Score</p>
          </div>
        </div>
      `;
    });
    topEl.innerHTML = html;
  }
  
  // === BOTTOM 5 ===
  const bottomEl = document.getElementById('hqAuswBottom');
  if (bottomEl) {
    let html = '';
    sorted.slice(-5).reverse().forEach((s) => {
      const statusColor = s.score < 20 ? 'red' : s.score < 40 ? 'yellow' : 'gray';
      html += `
        <div class="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
          <div class="flex-1">
            <p class="text-xs font-semibold text-gray-800">${s.name}</p>
            <p class="text-[10px] text-gray-500">
              ${s.active_users}/${s.user_count} User • 
              ${s.latest_bwa_month ? `BWA: ${s.latest_bwa_month}` : 'Keine BWA'}
            </p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold text-${statusColor}-500">${s.score}</p>
            <p class="text-[10px] text-gray-500">Score</p>
          </div>
        </div>
      `;
    });
    bottomEl.innerHTML = html;
  }
  
  // === MODUL-NUTZUNG ===
  const moduleStats = [
    { name: 'Kalender', count: usageData.filter(s => s.termine_30d > 0).length, icon: '📅' },
    { name: 'Aufgaben', count: usageData.filter(s => s.todos_created_30d > 0).length, icon: '✓' },
    { name: 'Verkauf/Pipeline', count: usageData.filter(s => s.leads_30d > 0).length, icon: '💰' },
    { name: 'BWA/Controlling', count: usageData.filter(s => s.latest_bwa_month).length, icon: '📊' },
    { name: 'Chat', count: usageData.filter(s => s.chat_messages_30d > 0).length, icon: '💬' },
    { name: 'Support', count: usageData.filter(s => s.tickets_total > 0).length, icon: '🎫' },
    { name: 'Forum', count: usageData.filter(s => s.forum_posts_30d > 0).length, icon: '📢' }
  ];
  
  const moduleEl = document.getElementById('hqAuswModules');
  if (moduleEl) {
    let html = '';
    moduleStats.sort((a, b) => b.count - a.count).forEach(m => {
      const pct = Math.round((m.count / totalStandorte) * 100);
      html += `
        <div class="flex items-center space-x-3 py-2">
          <span class="text-sm w-6">${m.icon}</span>
          <span class="text-xs font-medium text-gray-700 w-36">${m.name}</span>
          <div class="flex-1 bg-gray-200 rounded-full h-2">
            <div class="bg-vit-orange h-2 rounded-full transition-all" style="width: ${pct}%"></div>
          </div>
          <span class="text-xs font-semibold text-gray-600 w-16 text-right">${m.count}/${totalStandorte}</span>
          <span class="text-xs text-gray-500 w-10 text-right">${pct}%</span>
        </div>
      `;
    });
    moduleEl.innerHTML = html;
  }
  
  // === ALLE STANDORTE - SCORE BARS ===
  const allEl = document.getElementById('hqAuswAll');
  if (allEl) {
    let html = '';
    sorted.forEach(s => {
      const maxScore = 100;
      const widthPct = Math.min(100, (s.score / maxScore) * 100);
      const barColor = s.score >= 70 ? 'bg-green-500' : 
                       s.score >= 50 ? 'bg-vit-orange' : 
                       s.score >= 30 ? 'bg-yellow-500' : 'bg-red-400';
      
      html += `
        <div class="flex items-center space-x-2 py-1">
          <span class="text-[10px] w-32 truncate text-gray-700 font-medium">${s.name}</span>
          <div class="flex-1 bg-gray-200 rounded-full h-1.5">
            <div class="${barColor} h-1.5 rounded-full transition-all" style="width: ${widthPct}%"></div>
          </div>
          <span class="text-[10px] font-bold text-gray-800 w-8 text-right">${s.score}</span>
        </div>
      `;
    });
    allEl.innerHTML = html;
  }
}

// === HQ WISSEN-VERWALTUNG ===
var hqWissenItems = [
    {titel:'E-Bike Beratungsleitfaden 2026',kat:'handbuch',bereich:'Verkauf',datum:'12.02.2026',status:'live'},
    {titel:'Werkstatt: Bosch CX Gen5 Service',kat:'akademie',bereich:'Werkstatt',datum:'08.02.2026',status:'live'},
    {titel:'Social Media Best Practices Q1',kat:'bestpractice',bereich:'Marketing',datum:'05.02.2026',status:'live'},
    {titel:'Kassensystem Einrichtung',kat:'handbuch',bereich:'Betrieb',datum:'01.02.2026',status:'live'},
    {titel:'FAQ: Garantie-Abwicklung',kat:'faq',bereich:'Verkauf',datum:'28.01.2026',status:'live'},
    {titel:'Leasing-Angebote richtig kalkulieren',kat:'akademie',bereich:'Verkauf',datum:'25.01.2026',status:'live'},
    {titel:'Ladenbau-Konzept Richtlinien',kat:'handbuch',bereich:'Betrieb',datum:'20.01.2026',status:'live'},
    {titel:'Instagram Reels Anleitung',kat:'bestpractice',bereich:'Marketing',datum:'15.01.2026',status:'live'}
];
export function renderHqWissen(){
    var el=document.getElementById('hqWissenList');
    if(!el) return;
    var katIcons={akademie:'🎓',handbuch:'📖',bestpractice:'⭐',faq:'❓'};
    var h='';
    hqWissenItems.forEach(function(w,i){
        h+='<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div class="flex items-center space-x-3"><span class="text-lg">'+katIcons[w.kat]+'</span><div><p class="text-sm font-semibold text-gray-800">'+w.titel+'</p><p class="text-xs text-gray-500">'+w.bereich+' · '+w.datum+'</p></div></div><span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold">'+w.status+'</span></div>';
    });
    el.innerHTML=h;
}
export function addHqWissen(){
    var t=document.getElementById('hqWissenTitel');
    var k=document.getElementById('hqWissenKat');
    if(!t||!t.value.trim()){alert(_t('alert_enter_title'));return;}
    hqWissenItems.unshift({titel:t.value.trim(),kat:k.value,bereich:document.getElementById('hqWissenBereich').value,datum:new Date().toLocaleDateString('de-DE'),status:'live'});
    t.value='';document.getElementById('hqWissenInhalt').value='';
    renderHqWissen();
}

// === HQ SUPPORT-ÜBERSICHT ===
var hqSupportData = [
    {id:'T-2401',standort:'Grafrath',betreff:'Kassensystem Fehler beim Tagesabschluss',prio:'hoch',status:'offen',datum:'13.02.2026'},
    {id:'T-2402',standort:'Hamburg',betreff:'Schaufenster-Folie loest sich',prio:'mittel',status:'offen',datum:'13.02.2026'},
    {id:'T-2403',standort:'Weilheim',betreff:'Zugang Buchhaltungs-Tool gesperrt',prio:'hoch',status:'in Bearbeitung',datum:'12.02.2026'},
    {id:'T-2404',standort:'Karlsdorf',betreff:'Lieferverzoegerung Shimano Steps',prio:'mittel',status:'offen',datum:'12.02.2026'},
    {id:'T-2405',standort:'Grafrath',betreff:'Portal: BWA-Upload Fehlermeldung',prio:'niedrig',status:'in Bearbeitung',datum:'11.02.2026'},
    {id:'T-2406',standort:'Hamburg',betreff:'Marketing-Material fuer Fruehjahrsaktion',prio:'niedrig',status:'offen',datum:'11.02.2026'},
    {id:'T-2407',standort:'Weilheim',betreff:'Werkstatt-Terminplaner synchronisiert nicht',prio:'hoch',status:'in Bearbeitung',datum:'10.02.2026'}
];
export function renderHqSupport(){
    var el=document.getElementById('hqSupportTickets');
    if(!el) return;
    var prioColors={hoch:'bg-red-100 text-red-700',mittel:'bg-yellow-100 text-yellow-700',niedrig:'bg-gray-100 text-gray-600'};
    var statusColors={'offen':'bg-red-50 text-red-600','in Bearbeitung':'bg-blue-50 text-blue-600'};
    var h='';
    hqSupportData.forEach(function(t){
        h+='<div class="p-4 bg-gray-50 rounded-lg"><div class="flex items-center justify-between mb-2"><div class="flex items-center space-x-2"><span class="text-xs font-mono text-gray-400">'+t.id+'</span><span class="text-xs px-2 py-0.5 rounded-full font-semibold '+(prioColors[t.prio]||'')+'">'+t.prio+'</span><span class="text-xs px-2 py-0.5 rounded-full font-semibold '+(statusColors[t.status]||'')+'">'+t.status+'</span></div><span class="text-xs text-gray-400">'+t.datum+'</span></div><p class="text-sm font-semibold text-gray-800">'+t.betreff+'</p><p class="text-xs text-gray-500 mt-1">📍 '+t.standort+'</p></div>';
    });
    el.innerHTML=h;
    // Stats per location
    var stats={};
    hqSupportData.forEach(function(t){stats[t.standort]=(stats[t.standort]||0)+1;});
    var sEl=document.getElementById('hqSupportStats');
    if(sEl){
        var sh='';
        Object.keys(stats).sort(function(a,b){return stats[b]-stats[a];}).forEach(function(s){
            sh+='<div class="flex items-center justify-between p-2 bg-gray-50 rounded"><span class="text-sm font-semibold">📍 '+s+'</span><span class="text-sm font-bold text-gray-800">'+stats[s]+' Tickets</span></div>';
        });
        sEl.innerHTML=sh;
    }
}

// === HQ IDEENBOARD (Supabase) ===
export async function renderHqIdeen(filter){
    var el=document.getElementById('hqIdeenList');
    if(!el) return;
    try {
        var query = _sb().from('ideen').select('*, users(name), standorte(name)').order('votes', {ascending:false});
        if(filter && filter!=='all' && filter!=='ki_hoch' && filter!=='ki_quickwin') query = query.eq('status', filter);
        var resp = await query;
        if(resp.error) throw resp.error;
        var ideas = resp.data || [];
        // KI filter
        if(filter==='ki_hoch') ideas = ideas.filter(function(i){ var ki=i.ki_analyse; return ki && (ki.prioritaet==='kritisch'||ki.prioritaet==='hoch'); });
        if(filter==='ki_quickwin') ideas = ideas.filter(function(i){ var ki=i.ki_analyse; return ki && ki.quick_win===true; });
        // Sorting
        var sort = document.getElementById('hqIdeenSort');
        var sortVal = sort ? sort.value : 'newest';
        if(sortVal==='ki_machbarkeit') ideas.sort(function(a,b){ return ((b.ki_analyse||{}).machbarkeit_score||0)-((a.ki_analyse||{}).machbarkeit_score||0); });
        else if(sortVal==='ki_vision_fit') ideas.sort(function(a,b){ return ((b.ki_analyse||{}).vision_fit_score||0)-((a.ki_analyse||{}).vision_fit_score||0); });
        else if(sortVal==='ki_prioritaet') { var pOrd={kritisch:4,hoch:3,mittel:2,niedrig:1}; ideas.sort(function(a,b){ return (pOrd[(b.ki_analyse||{}).prioritaet]||0)-(pOrd[(a.ki_analyse||{}).prioritaet]||0); }); }
        else if(sortVal==='votes') ideas.sort(function(a,b){ return (b.votes||0)-(a.votes||0); });
        else ideas.sort(function(a,b){ return new Date(b.created_at||0)-new Date(a.created_at||0); });
        // Stats
        var allResp = await _sb().from('ideen').select('status, ki_analyse');
        var all = allResp.data || [];
        var t=document.getElementById('hqIdeenTotal');if(t)t.textContent=all.length;
        var p=document.getElementById('hqIdeenPruefung');if(p)p.textContent=all.filter(function(i){return i.status==='wird_geprueft'||i.status==='diskussion';}).length;
        var u=document.getElementById('hqIdeenUmgesetzt');if(u)u.textContent=all.filter(function(i){return i.status==='umgesetzt';}).length;
        var a=document.getElementById('hqIdeenAbgelehnt');if(a)a.textContent=all.filter(function(i){return i.status==='abgelehnt';}).length;
        var ak=document.getElementById('hqIdeenAnalysiert');if(ak)ak.textContent=all.filter(function(i){return i.ki_analyse;}).length;
        var statusC={neu:'bg-blue-100 text-blue-700',diskussion:'bg-yellow-100 text-yellow-700',wird_geprueft:'bg-yellow-100 text-yellow-700',geplant:'bg-purple-100 text-purple-700',umgesetzt:'bg-green-100 text-green-700',abgelehnt:'bg-red-100 text-red-700'};
        var statusL={neu:'Neu',diskussion:'In Diskussion',wird_geprueft:'Wird gepr\u00fcft',geplant:'Geplant',umgesetzt:'Umgesetzt',abgelehnt:'Abgelehnt'};
        var h='';
        ideas.forEach(function(idee){
            var standortName = idee.standorte ? idee.standorte.name : 'HQ';
            var authorName = idee.users ? idee.users.name : 'Unbekannt';
            var d = idee.created_at ? new Date(idee.created_at).toLocaleDateString('de-DE') : '';
            var ki = idee.ki_analyse;
            h+='<div class="p-4 bg-gray-50 rounded-lg">';
            h+='<div class="flex items-center justify-between mb-2">';
            h+='<div class="flex flex-wrap items-center gap-2">';
            h+='<span class="text-lg font-bold text-vit-orange">\ud83d\udc4d '+(idee.votes||0)+'</span>';
            h+='<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+(statusC[idee.status]||'bg-gray-100 text-gray-600')+'">'+(statusL[idee.status]||idee.status)+'</span>';
            // KI badges
            if(ki){
                var pc={kritisch:'bg-red-100 text-red-700',hoch:'bg-orange-100 text-orange-700',mittel:'bg-yellow-100 text-yellow-700',niedrig:'bg-gray-100 text-gray-600'};
                h+='<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+(pc[ki.prioritaet]||'bg-gray-100 text-gray-600')+'">\ud83e\udd16 '+(ki.prioritaet||'?')+'</span>';
                var ac={S:'bg-green-100 text-green-700',M:'bg-blue-100 text-blue-700',L:'bg-orange-100 text-orange-700',XL:'bg-red-100 text-red-700'};
                if(ki.aufwand) h+='<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+(ac[ki.aufwand]||'bg-gray-100')+'">'+ki.aufwand+'</span>';
                if(ki.quick_win) h+='<span class="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">\u26a1 Quick-Win</span>';
            }
            h+='<select onchange="updateIdeeStatus(\''+idee.id+'\',this.value)" class="text-xs border border-gray-200 rounded px-1 py-0.5">';
            ['neu','wird_geprueft','geplant','umgesetzt','abgelehnt'].forEach(function(s){
                h+='<option value="'+s+'"'+(idee.status===s?' selected':'')+'>'+(statusL[s]||s)+'</option>';
            });
            h+='</select></div>';
            h+='<span class="text-xs text-gray-400">'+d+'</span></div>';
            h+='<p class="text-sm font-semibold text-gray-800">'+idee.titel+'</p>';
            if(idee.beschreibung) h+='<p class="text-xs text-gray-600 mt-1">'+idee.beschreibung+'</p>';
            h+='<div class="flex items-center justify-between mt-2">';
            h+='<p class="text-xs text-gray-400">\ud83d\udca1 '+authorName+' \u00b7 \ud83d\udccd '+standortName+'</p>';
            // KI action buttons
            if(!ki) h+='<button onclick="analysiereIdee(\''+idee.id+'\',this)" class="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 font-semibold">\ud83e\udd16 Analysieren</button>';
            else h+='<button onclick="toggleKiPanel(\''+idee.id+'\',this)" class="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 font-semibold">Analyse \u25bc</button>';
            h+='</div>';
            // KI analysis panel (hidden by default)
            if(ki) {
                var analyseDate = ki.analysiert_am ? new Date(ki.analysiert_am).toLocaleDateString('de-DE') : '';
                h+='<div id="kiPanel_'+idee.id+'" style="display:none" class="mt-3 p-4 bg-purple-50 rounded-lg border border-purple-200">';
                h+=renderKiAnalyseHtml(ki, analyseDate);
                h+='</div>';
            }
            // Machbarkeit + Vision-Fit bars
            if(ki && (ki.machbarkeit_score || ki.vision_fit_score)) {
                h+='<div class="flex gap-4 mt-2">';
                if(ki.machbarkeit_score) h+='<div class="flex-1"><div class="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Machbarkeit</span><span>'+ki.machbarkeit_score+'/10</span></div><div class="h-1.5 bg-gray-200 rounded-full"><div class="h-1.5 bg-blue-500 rounded-full" style="width:'+(ki.machbarkeit_score*10)+'%"></div></div></div>';
                if(ki.vision_fit_score) h+='<div class="flex-1"><div class="flex justify-between text-[10px] text-gray-500 mb-0.5"><span>Vision-Fit</span><span>'+ki.vision_fit_score+'/10</span></div><div class="h-1.5 bg-gray-200 rounded-full"><div class="h-1.5 bg-green-500 rounded-full" style="width:'+(ki.vision_fit_score*10)+'%"></div></div></div>';
                h+='</div>';
            }
            h+='</div>';
        });
        if(ideas.length===0) h='<div class="text-center py-4 text-gray-400">Keine Ideen f\u00fcr diesen Filter.</div>';
        el.innerHTML=h;
    } catch(err) { console.error('HQ Ideen:', err); }
}
export function filterHqIdeen(filter) {
    document.querySelectorAll('.hq-ideen-filter').forEach(function(b){b.className='hq-ideen-filter px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600';});
    var btn=document.querySelector('.hq-ideen-filter[data-hif="'+filter+'"]');
    if(btn) btn.className='hq-ideen-filter px-3 py-1.5 rounded-full text-xs font-semibold bg-vit-orange text-white';
    renderHqIdeen(filter);
}

// === KI IDEENBOARD ANALYSE ===
export function renderKiAnalyseHtml(ki, analyseDateStr) {
    var h='<div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">';
    // Machbarkeit
    h+='<div><h4 class="font-bold text-purple-800 mb-1">\ud83d\udee0\ufe0f Machbarkeit</h4>';
    if(ki.machbarkeit_score) h+='<p>Score: <strong>'+ki.machbarkeit_score+'/10</strong></p>';
    var ac2={S:'bg-green-100 text-green-700',M:'bg-blue-100 text-blue-700',L:'bg-orange-100 text-orange-700',XL:'bg-red-100 text-red-700'};
    if(ki.aufwand) h+='<p>Aufwand: <span class="px-1.5 py-0.5 rounded text-[10px] font-bold '+(ac2[ki.aufwand]||'')+'">'+ki.aufwand+'</span></p>';
    if(ki.technische_bewertung) h+='<p class="text-gray-600 mt-1">'+ki.technische_bewertung+'</p>';
    if(ki.risiken) h+='<p class="text-red-600 mt-1">\u26a0\ufe0f '+ki.risiken+'</p>';
    h+='</div>';
    // Vision-Fit
    h+='<div><h4 class="font-bold text-purple-800 mb-1">\ud83c\udfaf Vision-Fit</h4>';
    if(ki.vision_fit_score) h+='<p>Score: <strong>'+ki.vision_fit_score+'/10</strong></p>';
    if(ki.vision_fit_reasoning) h+='<p class="text-gray-600 mt-1">'+ki.vision_fit_reasoning+'</p>';
    if(ki.betroffene_ziele && ki.betroffene_ziele.length) h+='<p class="mt-1">Ziele: '+ki.betroffene_ziele.join(', ')+'</p>';
    h+='</div>';
    // Prioritaet
    h+='<div><h4 class="font-bold text-purple-800 mb-1">\ud83d\udcca Priorit\u00e4t</h4>';
    var pc2={kritisch:'text-red-700',hoch:'text-orange-700',mittel:'text-yellow-700',niedrig:'text-gray-600'};
    if(ki.prioritaet) h+='<p>Empfehlung: <strong class="'+(pc2[ki.prioritaet]||'')+'">'+ki.prioritaet.toUpperCase()+'</strong></p>';
    if(ki.quick_win) h+='<p class="text-green-600 font-semibold">\u26a1 Quick-Win!</p>';
    if(ki.abhaengigkeiten) h+='<p class="text-gray-600 mt-1">Abh\u00e4ngigkeiten: '+ki.abhaengigkeiten+'</p>';
    h+='</div>';
    // Konzept
    h+='<div><h4 class="font-bold text-purple-800 mb-1">\ud83d\udcd0 Konzept</h4>';
    if(ki.zusammenfassung) h+='<p class="text-gray-600">'+ki.zusammenfassung+'</p>';
    if(ki.betroffene_module && ki.betroffene_module.length) h+='<p class="mt-1">Module: '+ki.betroffene_module.join(', ')+'</p>';
    if(ki.umsetzungsschritte && ki.umsetzungsschritte.length) { h+='<ol class="list-decimal ml-4 mt-1">'; ki.umsetzungsschritte.forEach(function(s){h+='<li>'+s+'</li>';}); h+='</ol>'; }
    h+='</div>';
    h+='</div>';
    if(analyseDateStr) h+='<p class="text-[10px] text-gray-400 mt-2 text-right">Analysiert: '+analyseDateStr+'</p>';
    return h;
}

export function toggleKiPanel(ideeId, btn) {
    var panel = document.getElementById('kiPanel_' + ideeId);
    if(!panel) return;
    if(panel.style.display === 'none') { panel.style.display = 'block'; btn.textContent = 'Analyse \u25b2'; }
    else { panel.style.display = 'none'; btn.textContent = 'Analyse \u25bc'; }
}

export async function analysiereIdee(ideeId, btnEl) {
    if(btnEl) { btnEl.disabled = true; btnEl.textContent = '\u23f3 Analysiere...'; }
    try {
        var { data: idee } = await _sb().from('ideen').select('titel, beschreibung, kategorie, standorte(name)').eq('id', ideeId).single();
        if(!idee) throw new Error('Idee nicht gefunden');
        var resp = await fetch(SUPABASE_URL + '/functions/v1/feedback-analyst', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await sb.auth.getSession()).data.session.access_token },
            body: JSON.stringify({ text: idee.titel + '\n' + (idee.beschreibung||''), kategorie: idee.kategorie||'idee', standort: idee.standorte ? idee.standorte.name : 'HQ' })
        });
        var result = await resp.json();
        if(result.analyse) {
            result.analyse.analysiert_am = new Date().toISOString();
            await _sb().from('ideen').update({ ki_analyse: result.analyse }).eq('id', ideeId);
        }
        var activeFilter = document.querySelector('.hq-ideen-filter.bg-vit-orange');
        renderHqIdeen(activeFilter ? activeFilter.dataset.hif : 'all');
    } catch(err) {
        console.error('KI Analyse Fehler:', err);
        if(btnEl) { btnEl.disabled = false; btnEl.textContent = '\u274c Fehler - nochmal'; }
    }
}

export async function analysierAlleNeuen() {
    var { data: ideen } = await _sb().from('ideen').select('id, titel').is('ki_analyse', null);
    if(!ideen || !ideen.length) { alert('Alle Ideen sind bereits analysiert!'); return; }
    if(!confirm(ideen.length + ' Ideen ohne KI-Analyse gefunden. Alle jetzt analysieren?')) return;
    for(var i = 0; i < ideen.length; i++) {
        try { await analysiereIdee(ideen[i].id, null); } catch(e) { console.error('Batch error:', e); }
        if(i < ideen.length - 1) await new Promise(function(r){setTimeout(r, 2000);});
    }
    alert('Fertig! ' + ideen.length + ' Ideen analysiert.');
    renderHqIdeen('all');
}
export async function updateIdeeStatus(ideeId, newStatus) {
    try {
        var resp = await _sb().from('ideen').update({status: newStatus}).eq('id', ideeId).select();
        if(resp.error) throw resp.error;
        if(!resp.data || resp.data.length === 0) {
            alert('Status konnte nicht geändert werden – keine Berechtigung.');
            return;
        }
        renderHqIdeen('all');
    } catch(err) { alert('Fehler: '+err.message); }
}


// === HQ SHOP-VERWALTUNG ===
var hqShopOrderFilter = 'all';
var hqShopOrdersCache = [];

export function showHqShopTab(tab) {
    document.querySelectorAll('.hq-shop-tabcontent').forEach(function(el){el.style.display='none';});
    document.querySelectorAll('.hq-shop-tab').forEach(function(b){b.className='hq-shop-tab px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700';});
    var tabEl = document.getElementById('hqShopTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if(tabEl) tabEl.style.display = 'block';
    var btn = document.querySelector('.hq-shop-tab[data-tab="'+tab+'"]');
    if(btn) btn.className = 'hq-shop-tab px-4 py-2.5 text-sm font-semibold border-b-2 border-vit-orange text-vit-orange';
    if(tab==='orders') renderHqShopOrders();
    if(tab==='products') renderHqShopProducts();
}

export function filterHqShopOrders(f) {
    hqShopOrderFilter = f;
    document.querySelectorAll('.hq-order-filter').forEach(function(b){b.className='hq-order-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn = document.querySelector('.hq-order-filter[data-f="'+f+'"]');
    if(btn) btn.className = 'hq-order-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderHqShopOrders();
}

export async function renderHqShop() {
    // Load KPIs
    var { data: products } = await _sb().from('shop_products').select('id').eq('is_active', true);
    var el1 = document.getElementById('hqShopKpiProducts'); if(el1) el1.textContent = (products||[]).length;

    var { data: allOrders } = await _sb().from('shop_orders').select('id, status, total, created_at').order('created_at', {ascending:false});
    hqShopOrdersCache = allOrders || [];
    var pending = hqShopOrdersCache.filter(function(o){return o.status==='pending'||o.status==='confirmed'}).length;
    var el2 = document.getElementById('hqShopKpiPending'); if(el2) el2.textContent = pending;
    if(el2 && pending > 0) el2.parentNode.classList.add('ring-2','ring-yellow-400');

    var thisMonth = new Date().toISOString().substring(0,7);
    var monthOrders = hqShopOrdersCache.filter(function(o){return o.created_at.substring(0,7)===thisMonth});
    var shipped = monthOrders.filter(function(o){return o.status==='shipped'||o.status==='delivered'}).length;
    var el3 = document.getElementById('hqShopKpiShipped'); if(el3) el3.textContent = shipped;
    var revenue = monthOrders.reduce(function(a,o){return a+(parseFloat(o.total)||0)},0);
    var el4 = document.getElementById('hqShopKpiRevenue'); if(el4) el4.textContent = fmtEur(revenue);

    renderHqShopOrders();
}

export async function renderHqShopOrders() {
    var oEl = document.getElementById('hqShopOrders');
    if(!oEl) return;
    var { data: orders } = await _sb().from('shop_orders').select('*, standort:standorte(name, ort), items:shop_order_items(*, product:shop_products(name))').order('created_at', {ascending:false}).limit(50);
    if(!orders?.length) { oEl.innerHTML = '<p class="text-center text-gray-400 py-4">Keine Bestellungen</p>'; return; }

    var filtered = hqShopOrderFilter === 'all' ? orders : orders.filter(function(o){return o.status===hqShopOrderFilter});
    var statusC = {pending:'bg-red-100 text-red-700',confirmed:'bg-yellow-100 text-yellow-700',shipped:'bg-blue-100 text-blue-700',delivered:'bg-green-100 text-green-700',cancelled:'bg-gray-100 text-gray-400'};
    var statusL = {pending:'⏳ Offen',confirmed:'📋 Bestätigt',shipped:'🚚 Versendet',delivered:'✅ Geliefert',cancelled:'❌ Storniert'};
    var h = '';
    filtered.forEach(function(o) {
        var itemList = (o.items||[]).map(function(it){return it.quantity+'x '+(it.variant_name?it.variant_name+' ':'')+(it.product?.name||it.product_name)}).join(', ');
        h += '<div class="vit-card p-4 '+(o.status==='pending'?'border-l-4 border-red-500':'')+'">';
        h += '<div class="flex items-center justify-between mb-2">';
        h += '<div class="flex items-center space-x-3"><span class="font-mono text-sm font-bold text-gray-700">'+o.order_number+'</span>';
        h += '<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+(statusC[o.status]||'')+'">'+(statusL[o.status]||o.status)+'</span></div>';
        h += '<span class="text-lg font-bold text-gray-800">'+fmtEur(o.total)+'</span></div>';
        h += '<p class="text-sm text-gray-600 mb-1">📍 <strong>'+(o.standort?.name||'?')+'</strong>'+(o.standort?.ort?' · '+o.standort.ort:'')+'</p>';
        h += '<p class="text-xs text-gray-500 mb-2">'+itemList+'</p>';
        h += '<p class="text-xs text-gray-400 mb-3">Bestellt: '+fmtDate(o.created_at)+'</p>';

        // Tracking info
        if(o.tracking_number) {
            var trackUrl = o.tracking_url || getTrackingUrl(o.tracking_carrier, o.tracking_number);
            h += '<div class="p-2 bg-blue-50 rounded-lg mb-3 text-xs"><span class="font-semibold text-blue-700">🚚 '+(o.tracking_carrier||'')+': </span>';
            h += '<a href="'+trackUrl+'" target="_blank" class="text-blue-600 underline hover:text-blue-800">'+o.tracking_number+'</a></div>';
        }

        // Action buttons
        h += '<div class="flex flex-wrap gap-2">';
        if(o.status==='pending') {
            h += '<button onclick="updateShopOrderStatus(\x27'+o.id+'\x27,\x27confirmed\x27)" class="text-xs px-3 py-1.5 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600">✓ Bestätigen</button>';
        }
        if(o.status==='pending'||o.status==='confirmed') {
            h += '<button onclick="showPackingList(\x27'+o.id+'\x27)" class="text-xs px-3 py-1.5 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700">🖨️ Packliste</button>';
            h += '<button onclick="showTrackingModal(\x27'+o.id+'\x27)" class="text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">📦 Versenden</button>';
        }
        if(o.status==='shipped') {
            h += '<button onclick="updateShopOrderStatus(\x27'+o.id+'\x27,\x27delivered\x27)" class="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600">✅ Zugestellt</button>';
        }
        h += '</div></div>';
    });
    oEl.innerHTML = h;
}

export async function renderHqShopProducts() {
    var pEl = document.getElementById('hqShopProducts');
    if(!pEl) return;
    var { data: products } = await _sb().from('shop_products').select('*, variants:shop_product_variants(*)').order('category');
    var catIcons = {print:'🖨️',textil:'👕',display:'🏪',digital:'💻',give:'🎁'};
    var h = '';
    (products||[]).forEach(function(p) {
        var totalStock = (p.variants||[]).reduce(function(a,v){return a+v.stock},0);
        var hasVariants = p.variants && p.variants.length > 0;
        h += '<div class="vit-card p-4">';
        h += '<div class="flex items-center justify-between mb-1">';
        h += '<div class="flex items-center space-x-2"><span>'+(catIcons[p.category]||'🛍️')+'</span><span class="text-sm font-semibold">'+p.name+'</span>';
        h += '<span class="text-xs text-gray-400">('+p.category+')</span>';
        if(!p.is_active) h += '<span class="text-xs text-red-400 font-semibold">inaktiv</span>';
        h += '</div><span class="text-sm font-bold text-gray-800">'+fmtEur(p.price)+'</span></div>';
        if(hasVariants) {
            h += '<div class="flex flex-wrap gap-1 mt-2">';
            p.variants.sort(function(a,b){return a.sort_index-b.sort_index}).forEach(function(v) {
                var color = v.stock <= 0 ? 'bg-red-50 text-red-500' : v.stock <= 3 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700';
                h += '<span class="text-[10px] px-2 py-0.5 rounded font-mono '+color+'">'+v.variant_name+':'+v.stock+'</span>';
            });
            h += '<span class="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">Σ '+totalStock+'</span>';
            h += '</div>';
        }
        h += '</div>';
    });
    pEl.innerHTML = h;
}

export function getTrackingUrl(carrier, number) {
    var urls = {
        'DHL': 'https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode='+number,
        'DPD': 'https://tracking.dpd.de/status/de_DE/parcel/'+number,
        'Hermes': 'https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#'+number,
        'UPS': 'https://www.ups.com/track?tracknum='+number,
        'GLS': 'https://gls-group.eu/DE/de/paketverfolgung?match='+number
    };
    return urls[carrier] || '#';
}

export async function showPackingList(orderId) {
    var { data: order } = await _sb().from('shop_orders').select('*, standort:standorte(name, strasse, plz, ort), items:shop_order_items(*, product:shop_products(name, sku))').eq('id', orderId).single();
    if(!order) return;
    var h = '<div style="font-family:monospace;font-size:12px;">';
    h += '<div style="text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px;">';
    h += '<h2 style="margin:0;font-size:16px;">📋 PACKLISTE</h2>';
    h += '<p style="margin:4px 0 0;">'+order.order_number+' · '+fmtDate(order.created_at)+'</p></div>';
    h += '<div style="margin-bottom:12px;"><strong>Lieferadresse:</strong><br>';
    h += (order.standort?.name||'')+'<br>';
    h += (order.standort?.strasse||'')+'<br>';
    h += (order.standort?.plz||'')+' '+(order.standort?.ort||'')+'</div>';
    h += '<table style="width:100%;border-collapse:collapse;">';
    h += '<tr style="border-bottom:1px solid #000;"><th style="text-align:left;padding:4px;">✓</th><th style="text-align:left;padding:4px;">Menge</th><th style="text-align:left;padding:4px;">Artikel</th><th style="text-align:left;padding:4px;">SKU</th><th style="text-align:left;padding:4px;">Größe</th></tr>';
    (order.items||[]).forEach(function(it) {
        h += '<tr style="border-bottom:1px dashed #ccc;">';
        h += '<td style="padding:6px 4px;">☐</td>';
        h += '<td style="padding:6px 4px;font-weight:bold;font-size:14px;">'+it.quantity+'x</td>';
        h += '<td style="padding:6px 4px;">'+(it.product?.name||it.product_name)+'</td>';
        h += '<td style="padding:6px 4px;color:#888;">'+(it.product?.sku||'')+'</td>';
        h += '<td style="padding:6px 4px;font-weight:bold;">'+(it.variant_name||'-')+'</td>';
        h += '</tr>';
    });
    h += '</table>';
    h += '<div style="margin-top:16px;border-top:1px solid #000;padding-top:8px;">';
    h += '<strong>Gesamt: '+fmtEur(order.total)+'</strong></div>';
    h += '<div style="margin-top:20px;border-top:1px dashed #ccc;padding-top:8px;">';
    h += '<p>Gepackt von: _________________ Datum: _________</p></div></div>';
    document.getElementById('packingListContent').innerHTML = h;
    document.getElementById('packingListModal').classList.remove('hidden');
}

export function showTrackingModal(orderId) {
    document.getElementById('trackingOrderId').value = orderId;
    document.getElementById('trackingNumber').value = '';
    document.getElementById('trackingModal').classList.remove('hidden');
}

export async function saveTracking() {
    var orderId = document.getElementById('trackingOrderId').value;
    var carrier = document.getElementById('trackingCarrier').value;
    var number = document.getElementById('trackingNumber').value.trim();
    if(!number) { alert('Bitte Tracking-Nummer eingeben.'); return; }
    var trackUrl = getTrackingUrl(carrier, number);
    await _sb().from('shop_orders').update({
        status: 'shipped',
        shipped_at: new Date().toISOString(),
        tracking_number: number,
        tracking_carrier: carrier,
        tracking_url: trackUrl,
        updated_at: new Date().toISOString()
    }).eq('id', orderId);
    document.getElementById('trackingModal').classList.add('hidden');
    renderHqShop();
}

window.updateShopOrderStatus = async function(orderId, newStatus) {
    var updates = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'confirmed') updates.confirmed_at = new Date().toISOString();
    if (newStatus === 'shipped') updates.shipped_at = new Date().toISOString();
    if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString();
    await _sb().from('shop_orders').update(updates).eq('id', orderId);
    renderHqShop();
};
export function addHqShopProduct(){
    var n=document.getElementById('hqShopName');
    var p=document.getElementById('hqShopPreis');
    if(!n||!n.value.trim()){alert('Produktname eingeben');return;}
    _sb().from('shop_products').insert({
        name: n.value.trim(),
        category: document.getElementById('hqShopKat')?.value || 'print',
        price: parseFloat(p.value)||0,
        description: document.getElementById('hqShopDesc')?.value || ''
    }).then(function(){ n.value='';p.value='';if(document.getElementById('hqShopDesc'))document.getElementById('hqShopDesc').value=''; showHqShopTab('products'); });
}
var kzStandorte = []; // loaded from Supabase

// ============================================================
// === HQ BILLING / ABRECHNUNG MODULE ===


// Strangler Fig
const _exports = {showHqKommTab,openAnkuendigungModal,closeAnkModal,saveAnkuendigung,renderHqKomm,renderHqKampagnen,addHqKampagne,filterHqDok,loadNetzwerkDokumente,renderHqDokumente,formatFileSize,downloadDokument,deleteNetzwerkDok,loadHqKalTermine,filterHqKal,renderHqKalender,addHqKalTermin,filterHqTasks,renderHqAufgaben,addHqTask,calculateBwaAge,countFeaturesUsed,calculateActivityScore,loadPortalNutzungData,renderHqAuswertung,renderHqWissen,addHqWissen,renderHqSupport,renderHqIdeen,filterHqIdeen,renderKiAnalyseHtml,toggleKiPanel,analysiereIdee,analysierAlleNeuen,updateIdeeStatus,showHqShopTab,filterHqShopOrders,renderHqShop,renderHqShopOrders,renderHqShopProducts,getTrackingUrl,showPackingList,showTrackingModal,saveTracking,addHqShopProduct};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[hq-kommando.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
