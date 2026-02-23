/**
 * views/aktenschrank.js – Intelligenter Aktenschrank v2
 * vit:bikes Partner-Portal
 * 
 * DB-driven (dokument_ordner, dokument_typen, dokumente, dokument_felder, dokument_audit)
 * KI-ready: Upload → Eingang → KI-Klassifikation → Review → Geprüft
 * Vereinfachter Upload: nur Drag & Drop, keine Kategorie/Beschreibung
 * 
 * Dependencies: sb, sbUser, sbProfile
 */
console.log('[aktenschrank.js] Module parsing started...');

function _sb()        { return window.sb; }
function _sbUser()    { return window.sbUser; }
function _sbProfile() { return window.sbProfile; }

// STATE
var _akten = { ordner:[], typen:[], dokumente:[], loaded:false, currentFolder:null, uploadQueue:[] };
export var aktenFiles = {};
export var aktenLoaded = false;
export var aktenFolderLabels = {};

// HELPERS
function esc(s){ if(!s)return''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtDate(d){ if(!d)return'\u2014'; try{return new Date(d).toLocaleDateString('de-DE');}catch(e){return'\u2014';} }
function fmtDateTime(d){ if(!d)return'\u2014'; try{return new Date(d).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});}catch(e){return'\u2014';} }
function fmtBytes(b){ if(!b)return'\u2014'; if(b<1024)return b+' B'; if(b<1048576)return(b/1024).toFixed(0)+' KB'; return(b/1048576).toFixed(1)+' MB'; }

export function getFileIcon(type){
    var c={PDF:'text-red-500',XLSX:'text-green-600',XLS:'text-green-600',DOCX:'text-blue-600',DOC:'text-blue-600',JPG:'text-purple-500',JPEG:'text-purple-500',PNG:'text-indigo-500'};
    return'<span class="font-mono text-xs font-bold px-2 py-1 rounded '+(c[type]||'text-gray-500')+' bg-gray-100">'+type+'</span>';
}

function statusBadge(s){
    var m={'eingegangen':'<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700">\uD83D\uDCE5 Eingegangen</span>','ki_verarbeitet':'<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">\uD83E\uDD16 KI-Vorschlag</span>','geprueft':'<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">\u2705 Gepr\u00fcft</span>','abgelehnt':'<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">\u274C Abgelehnt</span>','archiviert':'<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">\uD83D\uDCE6 Archiviert</span>'};
    return m[s]||'<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">'+(s||'\u2014')+'</span>';
}

function quelleBadge(q){
    var m={'upload':'<span class="text-xs text-gray-500">\uD83D\uDCE4 Upload</span>','controlling':'<span class="text-xs text-blue-600 font-semibold">\uD83D\uDD17 Controlling</span>','email':'<span class="text-xs text-purple-600 font-semibold">\uD83D\uDCE7 E-Mail</span>','api':'<span class="text-xs text-cyan-600 font-semibold">\uD83D\uDD0C API</span>'};
    return m[q]||'<span class="text-xs text-gray-400">'+(q||'\u2014')+'</span>';
}

function aktenToast(msg){
    if(window.showToast){window.showToast(msg);return;}
    var t=document.createElement('div');t.className='fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm z-[9999]';t.textContent=msg;document.body.appendChild(t);
    setTimeout(function(){t.style.opacity='0';t.style.transition='opacity 0.3s';setTimeout(function(){t.remove();},300);},3000);
}

// ═══════════════════════════════════════════════════════════
// RENDER MAIN VIEW
// ═══════════════════════════════════════════════════════════

function renderMainView(){
    var c=document.getElementById('aktenschrankView'); if(!c) return;
    c.innerHTML=
        '<div class="flex items-center justify-between mb-6"><div class="flex items-center space-x-3"><h1 class="h1-headline text-gray-800">AKTENSCHRANK</h1><span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full uppercase">Beta</span></div><div class="flex items-center space-x-3"><button onclick="showAktenInbox()" class="relative px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition flex items-center space-x-2"><span>\uD83D\uDCE5</span><span>Eingang</span><span id="aktenInboxBadge" class="hidden absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">0</span></button><button onclick="openAktenUpload()" class="px-4 py-2.5 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90 flex items-center space-x-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg><span>Hochladen</span></button></div></div>'+
        '<div class="relative max-w-md mb-6"><input type="text" id="aktenSearch" onkeyup="filterAkten()" placeholder="Dokument suchen..." class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-vit-orange"><svg class="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></div>'+
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" id="aktenStats"><div class="bg-white rounded-lg border border-gray-200 p-3 text-center"><p class="text-2xl font-bold text-gray-800" id="aktenStatTotal">-</p><p class="text-xs text-gray-500">Dokumente</p></div><div class="bg-white rounded-lg border border-gray-200 p-3 text-center"><p class="text-2xl font-bold text-green-600" id="aktenStatPruef">-</p><p class="text-xs text-gray-500">Gepr\u00fcft</p></div><div class="bg-white rounded-lg border border-gray-200 p-3 text-center"><p class="text-2xl font-bold text-yellow-600" id="aktenStatKi">-</p><p class="text-xs text-gray-500">Zu pr\u00fcfen</p></div><div class="bg-white rounded-lg border border-gray-200 p-3 text-center"><p class="text-2xl font-bold text-blue-600" id="aktenStatSync">-</p><p class="text-xs text-gray-500">Auto-Sync</p></div></div>'+
        '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8" id="aktenFolders"><div class="text-center py-12 col-span-full text-gray-400"><div class="animate-spin w-6 h-6 border-2 border-vit-orange border-t-transparent rounded-full mx-auto mb-2"></div>Ordner werden geladen...</div></div>'+
        '<div id="aktenFolderDetail" class="hidden"><div class="flex items-center justify-between mb-4"><div class="flex items-center space-x-3"><button onclick="closeAktenFolder()" class="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-600">&#9664; Zur\u00fcck</button><h2 class="text-lg font-semibold text-gray-800" id="aktenFolderTitle">Ordner</h2><span class="text-sm text-gray-400" id="aktenFolderCount"></span></div><button onclick="openAktenUpload()" class="px-3 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">+ Hochladen</button></div><div class="vit-card overflow-hidden"><table class="w-full text-sm"><thead><tr class="bg-gray-50"><th class="text-left py-2.5 px-4 font-semibold text-gray-600">Dokument</th><th class="text-left py-2.5 px-4 font-semibold text-gray-600">Typ</th><th class="text-left py-2.5 px-4 font-semibold text-gray-600">Status</th><th class="text-left py-2.5 px-4 font-semibold text-gray-600">Datum</th><th class="text-left py-2.5 px-4 font-semibold text-gray-600">Quelle</th><th class="text-right py-2.5 px-4 font-semibold text-gray-600">Aktion</th></tr></thead><tbody id="aktenFileList"></tbody></table><div id="aktenFileEmpty" class="hidden text-center py-8 text-gray-400 text-sm">Keine Dokumente in diesem Ordner</div></div></div>'+
        '<div id="aktenInboxView" class="hidden"><div class="flex items-center justify-between mb-4"><div class="flex items-center space-x-3"><button onclick="closeAktenInbox()" class="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-600">&#9664; Zur\u00fcck</button><h2 class="text-lg font-semibold text-gray-800">\uD83D\uDCE5 Eingang \u2014 Dokumente pr\u00fcfen</h2></div></div><div id="aktenInboxList" class="space-y-3"></div></div>';
    ensureUploadOverlay();
    ensureReviewOverlay();
}

function ensureUploadOverlay(){
    if(document.getElementById('aktenUploadOverlay')) return;
    var el=document.createElement('div');el.id='aktenUploadOverlay';
    el.className='hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    el.onclick=function(e){if(e.target===el)closeAktenUpload();};
    el.innerHTML='<div class="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" onclick="event.stopPropagation()"><div class="flex justify-between items-center mb-5"><h3 class="text-lg font-bold text-gray-800">\uD83D\uDCC4 Dokument hochladen</h3><button onclick="closeAktenUpload()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div><div id="aktenDropZone" class="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-vit-orange transition cursor-pointer" onclick="document.getElementById(\'aktenFileInput\').click()" ondragover="event.preventDefault();this.classList.add(\'border-vit-orange\',\'bg-orange-50\')" ondragleave="this.classList.remove(\'border-vit-orange\',\'bg-orange-50\')" ondrop="handleAktenDrop(event)"><input type="file" id="aktenFileInput" class="hidden" accept=".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png" onchange="handleAktenFileSelect(this)" multiple><svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg><p class="text-sm text-gray-600 font-medium">Dateien hierher ziehen</p><p class="text-sm text-gray-400 mt-1">oder <span class="text-vit-orange font-semibold">durchsuchen</span></p><p class="text-xs text-gray-400 mt-2">PDF, XLSX, DOCX, JPG \u2014 max. 25 MB</p></div><div id="aktenFileQueue" class="hidden mt-4 space-y-2 max-h-40 overflow-y-auto"></div><div id="aktenUploadProgress" class="hidden mt-4"><div class="flex items-center space-x-3"><div class="animate-spin w-5 h-5 border-2 border-vit-orange border-t-transparent rounded-full"></div><span class="text-sm text-gray-600" id="aktenUploadStatus">Wird hochgeladen...</span></div><div class="w-full bg-gray-200 rounded-full h-1.5 mt-2"><div class="bg-vit-orange h-1.5 rounded-full transition-all" id="aktenUploadBar" style="width:0%"></div></div></div><div class="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start space-x-2"><span class="text-lg">\uD83E\uDD16</span><div><p class="text-xs font-semibold text-blue-800">KI-Erkennung aktiv</p><p class="text-xs text-blue-600">Dokumenttyp, Ordner und Daten werden automatisch erkannt.</p></div></div><button onclick="startAktenUpload()" id="aktenUploadBtn" class="hidden w-full mt-4 bg-vit-orange text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"><span id="aktenUploadBtnText">Hochladen</span></button></div>';
    document.body.appendChild(el);
}

function ensureReviewOverlay(){
    if(document.getElementById('aktenReviewOverlay')) return;
    var el=document.createElement('div');el.id='aktenReviewOverlay';
    el.className='hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    el.onclick=function(e){if(e.target===el)closeAktenReview();};
    el.innerHTML='<div class="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onclick="event.stopPropagation()"><div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl flex items-center justify-between"><h3 class="text-lg font-bold text-gray-800" id="aktenReviewTitle">Dokument</h3><button onclick="closeAktenReview()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div><div class="p-6" id="aktenReviewContent"></div></div>';
    document.body.appendChild(el);
}

// ═══════════════════════════════════════════════════════════
// LOAD DATA
// ═══════════════════════════════════════════════════════════

export async function loadAktenFiles(){
    if(_akten.loaded){renderFolders();return;}
    try{
        var s=_sb(),p=_sbProfile();
        if(!s){console.warn('[aktenschrank] Supabase not ready, waiting...');await new Promise(function(r){setTimeout(r,1000);});s=_sb();}
        if(!s){console.error('[aktenschrank] Supabase still not ready!');renderFoldersDemo();return;}
        var [oR,tR,dR]=await Promise.all([
            s.from('dokument_ordner').select('*').eq('ist_aktiv',true).order('sort_order'),
            s.from('dokument_typen').select('*').eq('ist_aktiv',true).order('sort_order'),
            (function(){var q=s.from('dokumente').select('*, dokument_typen(name,icon,key), dokument_ordner(name,key,icon,farbe)').order('created_at',{ascending:false});if(p&&p.standort_id&&!p.is_hq)q=q.eq('standort_id',p.standort_id);return q;})()
        ]);
        console.log('[aktenschrank] DB results:', {ordner:oR.error||oR.data?.length, typen:tR.error||tR.data?.length, docs:dR.error||dR.data?.length});
        if(!oR.error)_akten.ordner=oR.data||[];
        if(!tR.error)_akten.typen=tR.data||[];
        if(!dR.error)_akten.dokumente=dR.data||[];
        _akten.loaded=true; aktenLoaded=true;
        aktenFolderLabels={};_akten.ordner.forEach(function(o){aktenFolderLabels[o.key]=o.name;});
        renderFolders();updateStats();updateInboxBadge();
    }catch(err){console.error('[aktenschrank] Load error:',err);renderFoldersDemo();}
}

// RENDER FOLDERS
function renderFolders(){
    var c=document.getElementById('aktenFolders');if(!c)return;
    if(_akten.ordner.length===0){renderFoldersDemo();return;}
    var html='';
    _akten.ordner.forEach(function(o){
        var cnt=_akten.dokumente.filter(function(d){return d.ordner_id===o.id;}).length;
        var f=o.farbe||'#6B7280';
        html+='<div class="akten-folder vit-card p-5 cursor-pointer hover:shadow-lg transition group" onclick="openAktenFolder(\''+o.id+'\')" data-ordner="'+o.key+'">';
        html+='<div class="flex items-start justify-between mb-3"><div class="p-3 rounded-xl transition" style="background:'+f+'15"><span class="text-2xl">'+(o.icon||'\uD83D\uDCC1')+'</span></div>';
        if(cnt>0)html+='<span class="text-xs font-bold rounded-full px-2 py-0.5" style="background:'+f+'15;color:'+f+'">'+cnt+'</span>';
        html+='</div><h3 class="font-bold text-gray-800 mb-1">'+esc(o.name)+'</h3>';
        if(o.beschreibung)html+='<p class="text-xs text-gray-500 line-clamp-2">'+esc(o.beschreibung)+'</p>';
        var last=_akten.dokumente.find(function(d){return d.ordner_id===o.id;});
        html+='<p class="text-xs text-gray-400 mt-2">'+(last?'Zuletzt: '+fmtDate(last.created_at):'Noch keine Dokumente')+'</p></div>';
    });
    c.innerHTML=html;
}

function renderFoldersDemo(){
    var demo=[
        {icon:'\uD83D\uDCB0',name:'Umsatz & Erl\u00f6se',desc:'Kundenrechnungen, Gutschriften, Provisionen',color:'#059669'},
        {icon:'\uD83D\uDC65',name:'Personalkosten',desc:'Lohn, Gehalt, SV-Beitr\u00e4ge, Fortbildung',color:'#DC2626'},
        {icon:'\uD83C\uDFE0',name:'Raumkosten & Nebenkosten',desc:'Miete, Strom, Gas, Wasser, Telefon',color:'#D97706'},
        {icon:'\uD83D\uDEE1\uFE0F',name:'Versicherungen & Beitr\u00e4ge',desc:'Haftpflicht, IHK, BG',color:'#7C3AED'},
        {icon:'\uD83D\uDCE2',name:'Werbe- & Reisekosten',desc:'Werbung, Messen, Bewirtung',color:'#EC4899'},
        {icon:'\uD83D\uDCE6',name:'Wareneinsatz & Lieferanten',desc:'Lieferantenrechnungen, Einkauf',color:'#2563EB'},
        {icon:'\uD83D\uDE97',name:'Fahrzeuge & Betriebsbedarf',desc:'Kfz, IT, B\u00fcromaterial, Porto',color:'#6366F1'},
        {icon:'\uD83D\uDCC9',name:'Abschreibungen & Leasing',desc:'AfA, Leasing, Investitionen',color:'#0891B2'},
        {icon:'\uD83D\uDCCA',name:'BWA & Steuern',desc:'BWA, DATEV, Steuerbescheide',color:'#4F46E5'},
        {icon:'\uD83D\uDCCE',name:'Sonstiges',desc:'Nicht zugeordnete Dokumente',color:'#6B7280'}
    ];
    var c=document.getElementById('aktenFolders');if(!c)return;var html='';
    demo.forEach(function(o){html+='<div class="akten-folder vit-card p-5 hover:shadow-lg transition group"><div class="flex items-start justify-between mb-3"><div class="p-3 rounded-xl" style="background:'+o.color+'15"><span class="text-2xl">'+o.icon+'</span></div></div><h3 class="font-bold text-gray-800 mb-1">'+o.name+'</h3><p class="text-xs text-gray-500">'+o.desc+'</p><p class="text-xs text-gray-400 mt-2">Noch keine Dokumente</p></div>';});
    c.innerHTML=html;
}

// FOLDER DETAIL
export async function openAktenFolder(ordnerId){
    if(!_akten.loaded)await loadAktenFiles();
    _akten.currentFolder=ordnerId;
    var o=_akten.ordner.find(function(x){return x.id===ordnerId;});
    var docs=_akten.dokumente.filter(function(d){return d.ordner_id===ordnerId;});
    document.getElementById('aktenFolderTitle').textContent=(o?o.icon+' ':'')+(o?o.name:'Ordner');
    document.getElementById('aktenFolderCount').textContent=docs.length+' Dokument'+(docs.length!==1?'e':'');
    var tb=document.getElementById('aktenFileList'),em=document.getElementById('aktenFileEmpty');
    if(docs.length===0){tb.innerHTML='';em.classList.remove('hidden');}
    else{em.classList.add('hidden');var html='';docs.forEach(function(d){html+=renderRow(d);});tb.innerHTML=html;}
    document.getElementById('aktenFolders').style.display='none';
    document.getElementById('aktenStats').style.display='none';
    document.getElementById('aktenFolderDetail').classList.remove('hidden');
    var iv=document.getElementById('aktenInboxView');if(iv)iv.classList.add('hidden');
}

function renderRow(d){
    var ext=(d.datei_name||'').split('.').pop().toUpperCase()||'\u2014';
    var typN=d.dokument_typen?d.dokument_typen.name:(d.ki_typ_vorschlag||'\u2014');
    var h='<tr class="border-b hover:bg-gray-50 cursor-pointer" onclick="openAktenReview(\''+d.id+'\')">';
    h+='<td class="py-3 px-4"><div class="flex items-center space-x-3">'+getFileIcon(ext)+'<div><span class="font-medium text-gray-800 block">'+esc(d.titel)+'</span>';
    if(d.datei_name)h+='<span class="text-xs text-gray-400">'+esc(d.datei_name)+'</span>';
    h+='</div></div></td><td class="py-3 px-4 text-gray-500 text-xs">'+esc(typN)+'</td><td class="py-3 px-4">'+statusBadge(d.status)+'</td><td class="py-3 px-4 text-gray-500 text-xs">'+fmtDate(d.created_at)+'</td><td class="py-3 px-4">'+quelleBadge(d.quelle)+'</td><td class="py-3 px-4 text-right">';
    if(d.datei_url)h+='<button onclick="event.stopPropagation();downloadAktenDoc(\''+d.id+'\')" class="text-vit-orange hover:underline text-xs font-semibold mr-2">\u2B07</button>';
    h+='<button onclick="event.stopPropagation();openAktenReview(\''+d.id+'\')" class="text-blue-600 hover:underline text-xs font-semibold">Details</button></td></tr>';
    return h;
}

export function closeAktenFolder(){
    _akten.currentFolder=null;
    document.getElementById('aktenFolders').style.display='';
    document.getElementById('aktenStats').style.display='';
    document.getElementById('aktenFolderDetail').classList.add('hidden');
}

// INBOX
export async function showAktenInbox(){
    // Force reload to get fresh KI status
    _akten.loaded=false; await loadAktenFiles();
    var inbox=_akten.dokumente.filter(function(d){return d.status==='eingegangen'||d.status==='ki_verarbeitet';});
    var c=document.getElementById('aktenInboxList');if(!c)return;
    if(inbox.length===0){c.innerHTML='<div class="text-center py-12 text-gray-400"><span class="text-4xl block mb-2">\u2705</span><p class="text-sm">Alle Dokumente gepr\u00fcft \u2014 nichts zu tun!</p></div>';}
    else{var html='';inbox.forEach(function(d){
        var icon=d.status==='ki_verarbeitet'?'\uD83E\uDD16':'\uD83D\uDCE5';
        var stxt=d.status==='ki_verarbeitet'?'KI-Vorschlag bereit':'Wartet auf Verarbeitung';
        var confBar='';
        if(d.ki_confidence){var p=Math.round(d.ki_confidence*100);var bc=p>=80?'bg-green-500':p>=50?'bg-yellow-500':'bg-red-500';var tc=p>=80?'#16a34a':p>=50?'#ca8a04':'#dc2626';confBar='<div class="flex items-center space-x-2 mt-1"><span class="text-xs text-gray-400">Konfidenz:</span><div class="w-20 bg-gray-200 rounded-full h-1.5"><div class="'+bc+' h-1.5 rounded-full" style="width:'+p+'%"></div></div><span class="text-xs font-semibold" style="color:'+tc+'">'+p+'%</span></div>';}
        html+='<div class="vit-card p-4 hover:shadow-md transition cursor-pointer flex items-center justify-between" onclick="openAktenReview(\''+d.id+'\')">';
        html+='<div class="flex items-center space-x-4"><span class="text-2xl">'+icon+'</span><div><p class="font-semibold text-gray-800">'+esc(d.titel)+'</p><p class="text-xs text-gray-500">'+stxt+' \u00B7 '+fmtDate(d.created_at)+'</p>';
        if(d.ki_typ_vorschlag)html+='<p class="text-xs text-blue-600 mt-0.5">Erkannt als: <strong>'+esc(d.ki_typ_vorschlag)+'</strong></p>';
        html+=confBar+'</div></div><button class="px-3 py-1.5 bg-vit-orange text-white text-xs font-semibold rounded-lg hover:opacity-90 flex-shrink-0">Pr\u00fcfen \u2192</button></div>';
    });c.innerHTML=html;}
    document.getElementById('aktenFolders').style.display='none';
    document.getElementById('aktenStats').style.display='none';
    document.getElementById('aktenFolderDetail').classList.add('hidden');
    document.getElementById('aktenInboxView').classList.remove('hidden');
}

export function closeAktenInbox(){
    document.getElementById('aktenFolders').style.display='';document.getElementById('aktenStats').style.display='';document.getElementById('aktenInboxView').classList.add('hidden');
}

function updateInboxBadge(){
    var cnt=_akten.dokumente.filter(function(d){return d.status==='eingegangen'||d.status==='ki_verarbeitet';}).length;
    var b=document.getElementById('aktenInboxBadge');if(b){if(cnt>0){b.textContent=cnt;b.classList.remove('hidden');}else{b.classList.add('hidden');}}
}

// REVIEW
export async function openAktenReview(dokId){
    var dok=_akten.dokumente.find(function(d){return d.id===dokId;});if(!dok)return;
    var s=_sb();
    var [fR,aR]=await Promise.all([s.from('dokument_felder').select('*').eq('dokument_id',dokId).order('created_at'),s.from('dokument_audit').select('*').eq('dokument_id',dokId).order('created_at',{ascending:false}).limit(10)]);
    var felder=(!fR.error&&fR.data)?fR.data:[];var audit=(!aR.error&&aR.data)?aR.data:[];
    var typN=dok.dokument_typen?dok.dokument_typen.name:(dok.ki_typ_vorschlag||'Unbekannt');
    document.getElementById('aktenReviewTitle').textContent=dok.titel;
    var html='<div class="grid grid-cols-2 gap-4 mb-6"><div><p class="text-xs text-gray-400 mb-1">Dokumenttyp</p><p class="text-sm font-semibold text-gray-800">'+esc(typN)+'</p></div><div><p class="text-xs text-gray-400 mb-1">Status</p>'+statusBadge(dok.status)+'</div><div><p class="text-xs text-gray-400 mb-1">Quelle</p>'+quelleBadge(dok.quelle)+'</div><div><p class="text-xs text-gray-400 mb-1">Hochgeladen</p><p class="text-sm text-gray-600">'+fmtDate(dok.created_at)+'</p></div></div>';
    if(dok.ki_confidence){var p=Math.round(dok.ki_confidence*100);html+='<div class="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6"><div class="flex items-center justify-between mb-1"><span class="text-xs font-semibold text-blue-800">\uD83E\uDD16 KI-Konfidenz</span><span class="text-xs font-bold text-blue-700">'+p+'%</span></div><div class="w-full bg-blue-200 rounded-full h-2"><div class="bg-blue-600 h-2 rounded-full" style="width:'+p+'%"></div></div></div>';}
    if(felder.length>0){html+='<div class="mb-6"><h4 class="text-sm font-bold text-gray-800 mb-3">\uD83D\uDCCA Extrahierte Daten</h4><div class="bg-gray-50 rounded-lg overflow-hidden"><table class="w-full text-sm">';felder.forEach(function(f){var cb='';if(f.confidence){var cp=Math.round(f.confidence*100);var cc=cp>=80?'text-green-600':cp>=50?'text-yellow-600':'text-red-600';cb='<span class="'+cc+' text-xs font-mono">'+cp+'%</span>';}var cor=f.manuell_korrigiert?' <span class="text-xs text-purple-600">\u270F\uFE0F</span>':'';html+='<tr class="border-b border-gray-200"><td class="py-2 px-3 text-gray-500 font-medium text-xs w-1/3">'+esc(f.feld_label||f.feld_name)+'</td><td class="py-2 px-3 text-gray-800 font-semibold text-xs">'+esc(f.feld_wert||'\u2014')+cor+'</td><td class="py-2 px-3 text-right">'+cb+'</td></tr>';});html+='</table></div></div>';}
    if(audit.length>0){var aL={'hochgeladen':'\uD83D\uDCE4 Hochgeladen','ki_klassifiziert':'\uD83E\uDD16 KI klassifiziert','ki_extrahiert':'\uD83E\uDD16 Felder extrahiert','manuell_geprueft':'\u2705 Gepr\u00fcft','typ_geaendert':'\uD83D\uDD04 Typ ge\u00e4ndert','feld_korrigiert':'\u270F\uFE0F Korrigiert','status_geaendert':'\uD83D\uDD00 Status','archiviert':'\uD83D\uDCE6 Archiviert','auto_sync':'\uD83D\uDD17 Auto-Sync'};html+='<div class="mb-6"><h4 class="text-sm font-bold text-gray-800 mb-3">\uD83D\uDCCB Verlauf</h4><div class="space-y-2">';audit.forEach(function(a){var desc=a.details&&a.details.beschreibung?a.details.beschreibung:'';html+='<div class="flex items-start space-x-3 text-xs"><span class="text-gray-400 whitespace-nowrap">'+fmtDateTime(a.created_at)+'</span><span class="font-medium text-gray-700">'+(aL[a.aktion]||a.aktion)+'</span>';if(desc)html+='<span class="text-gray-400">'+esc(desc)+'</span>';html+='</div>';});html+='</div></div>';}
    html+='<div class="flex items-center space-x-3 border-t border-gray-200 pt-4">';
    if(dok.status==='ki_verarbeitet'||dok.status==='eingegangen'){html+='<button onclick="confirmAktenDoc(\''+dokId+'\')" class="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">\u2705 Best\u00e4tigen</button><button onclick="rejectAktenDoc(\''+dokId+'\')" class="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 border border-red-200">Ablehnen</button>';}
    if(dok.datei_url)html+='<button onclick="downloadAktenDoc(\''+dokId+'\')" class="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200">\u2B07 Download</button>';
    html+='</div>';
    document.getElementById('aktenReviewContent').innerHTML=html;
    document.getElementById('aktenReviewOverlay').classList.remove('hidden');
}

export function closeAktenReview(){document.getElementById('aktenReviewOverlay').classList.add('hidden');}

export async function confirmAktenDoc(dokId){try{var u=_sbUser();await _sb().from('dokumente').update({status:'geprueft',geprueft_von:u.id,geprueft_am:new Date().toISOString()}).eq('id',dokId);await _sb().from('dokument_audit').insert({dokument_id:dokId,aktion:'manuell_geprueft',details:{beschreibung:'Manuell best\u00e4tigt'},user_id:u.id});var d=_akten.dokumente.find(function(x){return x.id===dokId;});if(d)d.status='geprueft';closeAktenReview();updateStats();updateInboxBadge();if(_akten.currentFolder)openAktenFolder(_akten.currentFolder);aktenToast('\u2705 Dokument best\u00e4tigt');}catch(e){console.error('Confirm err:',e);}}

export async function rejectAktenDoc(dokId){if(!confirm('Dokument wirklich ablehnen?'))return;try{var u=_sbUser();await _sb().from('dokumente').update({status:'abgelehnt'}).eq('id',dokId);await _sb().from('dokument_audit').insert({dokument_id:dokId,aktion:'status_geaendert',details:{beschreibung:'Abgelehnt',neuer_status:'abgelehnt'},user_id:u.id});var d=_akten.dokumente.find(function(x){return x.id===dokId;});if(d)d.status='abgelehnt';closeAktenReview();updateStats();updateInboxBadge();aktenToast('\u274C Dokument abgelehnt');}catch(e){console.error('Reject err:',e);}}

// UPLOAD
export function openAktenUpload(){_akten.uploadQueue=[];var fi=document.getElementById('aktenFileInput');if(fi)fi.value='';var fq=document.getElementById('aktenFileQueue');if(fq){fq.innerHTML='';fq.classList.add('hidden');}var up=document.getElementById('aktenUploadProgress');if(up)up.classList.add('hidden');var ub=document.getElementById('aktenUploadBtn');if(ub)ub.classList.add('hidden');document.getElementById('aktenUploadOverlay').classList.remove('hidden');}
export function closeAktenUpload(){document.getElementById('aktenUploadOverlay').classList.add('hidden');_akten.uploadQueue=[];}
export function handleAktenDrop(ev){ev.preventDefault();ev.currentTarget.classList.remove('border-vit-orange','bg-orange-50');addToQueue(ev.dataTransfer.files);}
export function handleAktenFileSelect(input){addToQueue(input.files);}

function addToQueue(files){
    var maxSz=25*1024*1024,okExt=['pdf','xlsx','xls','docx','doc','jpg','jpeg','png'];
    for(var i=0;i<files.length;i++){var f=files[i];if(f.size>maxSz){aktenToast('\u26A0\uFE0F '+f.name+' ist zu gro\u00DF (max 25 MB)');continue;}var ext=f.name.split('.').pop().toLowerCase();if(okExt.indexOf(ext)<0){aktenToast('\u26A0\uFE0F '+f.name+' \u2014 Typ nicht unterst\u00fctzt');continue;}_akten.uploadQueue.push(f);}
    renderQueue();
}

function renderQueue(){
    var c=document.getElementById('aktenFileQueue'),b=document.getElementById('aktenUploadBtn');
    if(_akten.uploadQueue.length===0){c.classList.add('hidden');b.classList.add('hidden');return;}
    c.classList.remove('hidden');b.classList.remove('hidden');
    document.getElementById('aktenUploadBtnText').textContent=_akten.uploadQueue.length===1?'Hochladen':_akten.uploadQueue.length+' Dateien hochladen';
    var html='';_akten.uploadQueue.forEach(function(f,idx){var ext=f.name.split('.').pop().toUpperCase();html+='<div class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"><div class="flex items-center space-x-2">'+getFileIcon(ext)+'<div><p class="text-sm font-medium text-gray-800 truncate max-w-[200px]">'+esc(f.name)+'</p><p class="text-xs text-gray-400">'+fmtBytes(f.size)+'</p></div></div><button onclick="removeFromAktenQueue('+idx+')" class="text-gray-400 hover:text-red-500 text-lg">&times;</button></div>';});
    c.innerHTML=html;
}

export function removeFromAktenQueue(idx){_akten.uploadQueue.splice(idx,1);renderQueue();}

export async function startAktenUpload(){
    if(_akten.uploadQueue.length===0)return;
    var btn=document.getElementById('aktenUploadBtn'),prog=document.getElementById('aktenUploadProgress'),stat=document.getElementById('aktenUploadStatus'),bar=document.getElementById('aktenUploadBar');
    btn.disabled=true;btn.classList.add('opacity-50');prog.classList.remove('hidden');
    var total=_akten.uploadQueue.length,p=_sbProfile(),sid=p?p.standort_id:null,u=_sbUser(),s=_sb();
    for(var i=0;i<total;i++){var file=_akten.uploadQueue[i];bar.style.width=Math.round((i/total)*100)+'%';stat.textContent=file.name+' ('+(i+1)+'/'+total+')';
        try{var path=(sid||'unknown')+'/inbox/'+Date.now()+'_'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');var upR=await s.storage.from('dokumente').upload(path,file,{upsert:true});var fileUrl=path;if(!upR.error){var urlR=s.storage.from('dokumente').getPublicUrl(path);fileUrl=urlR.data?urlR.data.publicUrl:path;}var titel=file.name.replace(/\.[^.]+$/,'').replace(/[_-]/g,' ');
        var insR=await s.from('dokumente').insert({standort_id:sid,titel:titel,datei_url:fileUrl,datei_name:file.name,datei_groesse:file.size,datei_typ:file.type,status:'eingegangen',quelle:'upload',hochgeladen_von:u?u.id:null}).select().single();
        if(!insR.error&&insR.data){await s.from('dokument_audit').insert({dokument_id:insR.data.id,aktion:'hochgeladen',details:{datei_name:file.name,datei_groesse:file.size},user_id:u?u.id:null});_akten.dokumente.unshift(insR.data);
        // KI-Klassifikation asynchron starten
        triggerKiClassification(insR.data.id);
        }}catch(err){console.error('Upload err:',file.name,err);aktenToast('\u274C Fehler: '+file.name);}}
    bar.style.width='100%';stat.textContent='\u2705 Hochgeladen! \uD83E\uDD16 KI analysiert...';
    setTimeout(function(){closeAktenUpload();_akten.uploadQueue=[];renderFolders();updateStats();updateInboxBadge();aktenToast('\u2705 '+total+' Dokument'+(total>1?'e':'')+' hochgeladen');},800);
}

// KI CLASSIFICATION
async function triggerKiClassification(dokId){
    try{
        var s=_sb(),sess=await s.auth.getSession();
        var token=sess.data&&sess.data.session?sess.data.session.access_token:'';
        var url=(window.SUPABASE_URL||'https://lwwagbkxeofahhwebkab.supabase.co')+'/functions/v1/classify-document';
        var resp=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({dokument_id:dokId})});
        var data=await resp.json();
        if(data.success){
            console.log('[Aktenschrank] KI: '+data.typ+' ('+Math.round(data.confidence*100)+'%) - '+data.felder_count+' Felder');
            var dok=_akten.dokumente.find(function(d){return d.id===dokId;});
            if(dok){dok.status='ki_verarbeitet';dok.ki_typ_vorschlag=data.typ;dok.ki_confidence=data.confidence;if(data.titel)dok.titel=data.titel;}
            renderFolders();updateStats();updateInboxBadge();
            aktenToast('\uD83E\uDD16 KI: '+data.typ+' erkannt ('+Math.round(data.confidence*100)+'%)');
        }else{console.warn('[Aktenschrank] KI-Fehler:',data.error);}
    }catch(err){console.warn('[Aktenschrank] KI-Klassifikation fehlgeschlagen:',err);}
}

// STATS & UTILS
function updateStats(){
    var d=_akten.dokumente,el=function(id){return document.getElementById(id);};
    if(el('aktenStatTotal'))el('aktenStatTotal').textContent=d.length;
    if(el('aktenStatPruef'))el('aktenStatPruef').textContent=d.filter(function(x){return x.status==='geprueft';}).length;
    if(el('aktenStatKi'))el('aktenStatKi').textContent=d.filter(function(x){return x.status==='ki_verarbeitet'||x.status==='eingegangen';}).length;
    if(el('aktenStatSync'))el('aktenStatSync').textContent=d.filter(function(x){return x.quelle==='controlling';}).length;
}

export async function downloadAktenDoc(dokId){
    var dok=_akten.dokumente.find(function(d){return d.id===dokId;});if(!dok||!dok.datei_url)return;
    try{if(dok.datei_url.startsWith('http')){window.open(dok.datei_url,'_blank');}else{var r=await _sb().storage.from('dokumente').createSignedUrl(dok.datei_url,3600);if(r.data&&r.data.signedUrl)window.open(r.data.signedUrl,'_blank');}}
    catch(err){console.error('Download error:',err);aktenToast('\u274C Download fehlgeschlagen');}
}

export function filterAkten(){
    var q=(document.getElementById('aktenSearch').value||'').toLowerCase();
    document.querySelectorAll('.akten-folder').forEach(function(f){f.style.display=f.textContent.toLowerCase().indexOf(q)>=0?'':'none';});
}

// INIT
export function loadAktenschrank(){console.log('[aktenschrank.js] loadAktenschrank called, aktenschrankView exists:', !!document.getElementById('aktenschrankView'));renderMainView();loadAktenFiles();}

// WINDOW REGISTRATION
const _exports={loadAktenschrank,loadAktenFiles,getFileIcon,openAktenFolder,closeAktenFolder,filterAkten,showAktenInbox,closeAktenInbox,openAktenReview,closeAktenReview,confirmAktenDoc,rejectAktenDoc,openAktenUpload,closeAktenUpload,handleAktenDrop,handleAktenFileSelect,startAktenUpload,removeFromAktenQueue,downloadAktenDoc};
Object.keys(_exports).forEach(k=>{window[k]=_exports[k];});
console.log('[aktenschrank.js] \u2705 v2 loaded \u2013 '+Object.keys(_exports).length+' exports (DB-driven, KI-ready)');
