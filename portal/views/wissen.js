/**
 * views/wissen.js - Wissen Module (DB-basiert)
 * Partner: Wissensdatenbank lesen, filtern (Kategorie + Inhaltsart), Gelesen-Tracking
 * HQ: CMS mit Quill WYSIWYG-Editor – CRUD fuer Artikel
 * Cross-Modul: Artikel erscheinen in Fachmodul-Tabs (Verkauf, Controlling, etc.)
 * @module views/wissen
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// ══════════════════════════════════════════════════════
// SHARED: Kategorie- & Inhaltsart-Definitionen
// ══════════════════════════════════════════════════════
var KAT_LABELS  = {allgemein:'Allgemein',verkauf:'Verkauf',einkauf:'Einkauf',marketing:'Marketing',zahlen:'Zahlen',team:'Team',it:'IT',werkstatt:'Werkstatt',hiw:'HIW'};
var KAT_ICONS   = {allgemein:'🏢',verkauf:'💰',einkauf:'🛒',marketing:'📣',zahlen:'📊',team:'👥',it:'🖥️',werkstatt:'🔧',hiw:'💻'};
var KAT_COLORS  = {allgemein:'bg-gray-100 text-gray-700',verkauf:'bg-blue-100 text-blue-700',einkauf:'bg-cyan-100 text-cyan-700',marketing:'bg-orange-100 text-orange-700',zahlen:'bg-green-100 text-green-700',team:'bg-purple-100 text-purple-700',it:'bg-slate-100 text-slate-700',werkstatt:'bg-yellow-100 text-yellow-700',hiw:'bg-teal-100 text-teal-700'};
var KAT_ORDER   = ['allgemein','verkauf','einkauf','marketing','zahlen','team','it','werkstatt','hiw'];

var ART_LABELS  = {anleitung_cockpit:'Anleitung Cockpit',wissen:'Wissen',faq:'FAQ',training:'Training'};
var ART_ICONS   = {anleitung_cockpit:'📱',wissen:'📚',faq:'❓',training:'🎓'};
var ART_ORDER   = ['anleitung_cockpit','wissen','faq','training'];

// ══════════════════════════════════════════════════════
// SHARED: Cache & Laden
// ══════════════════════════════════════════════════════
var _wissenArtikelCache = null;
var _wissenArtikelLoading = false;
var _wissenGelesenSet = new Set();

async function _ladeWissenArtikel(forceReload) {
    if (_wissenArtikelCache && !forceReload) return _wissenArtikelCache;
    if (_wissenArtikelLoading) return _wissenArtikelCache || [];
    _wissenArtikelLoading = true;
    try {
        var sb = _sb(); if (!sb) return [];
        var { data, error } = await sb.from('wissen_artikel').select('*').order('gepinnt', {ascending: false}).order('updated_at', {ascending: false});
        if (error) throw error;
        _wissenArtikelCache = data || [];
    } catch(e) {
        console.warn('wissen_artikel Ladefehler:', e);
        _wissenArtikelCache = _wissenArtikelCache || [];
    }
    _wissenArtikelLoading = false;
    return _wissenArtikelCache;
}

async function _ladeGelesenStatus() {
    try {
        var sb = _sb(); var user = _sbUser(); if (!sb || !user) return;
        var { data } = await sb.from('wissen_gelesen').select('artikel_id').eq('user_id', user.id);
        _wissenGelesenSet = new Set((data || []).map(function(r){ return r.artikel_id; }));
    } catch(e) { console.warn('wissen_gelesen Ladefehler:', e); }
}

async function _markiereGelesen(artikelId) {
    try {
        var sb = _sb(); var user = _sbUser(); if (!sb || !user) return;
        await sb.from('wissen_gelesen').upsert({ user_id: user.id, artikel_id: artikelId }, { onConflict: 'user_id,artikel_id' });
        _wissenGelesenSet.add(artikelId);
    } catch(e) { console.warn('Gelesen-Markierung fehlgeschlagen:', e); }
}

async function _artikelViewCount(id) {
    try {
        var sb = _sb(); if (!sb) return;
        var artikel = (_wissenArtikelCache||[]).find(function(a){return a.id===id;});
        var currentViews = artikel ? (artikel.views || 0) : 0;
        await sb.from('wissen_artikel').update({ views: currentViews + 1 }).eq('id', id);
        if (artikel) artikel.views = currentViews + 1;
    } catch(e) {}
}

// ══════════════════════════════════════════════════════
// PARTNER: Global Wissen View
// ══════════════════════════════════════════════════════
var currentWissenBereich = 'all';
var currentWissenArt = 'all';

window.renderWissenGlobal = renderWissenGlobal;
export async function renderWissenGlobal() {
    var el = document.getElementById('wissenGlobalContent');
    if (!el) { console.warn('[wissen] wissenGlobalContent nicht gefunden'); return; }

    el.innerHTML = '<div class="text-center py-12 text-gray-400"><div class="animate-spin text-3xl mb-3">⚙️</div><p class="text-sm">Artikel werden geladen…</p></div>';

    try {
    var alleArtikel = await _ladeWissenArtikel();
    } catch(e) { console.error('[wissen] Artikel laden fehlgeschlagen:', e); var alleArtikel = []; }
    try { await _ladeGelesenStatus(); } catch(e) { console.warn('[wissen] Gelesen-Status Fehler:', e); }

    // Bereich-Filter aktualisieren (dynamisch aus DB)
    try { if (typeof window.renderWissenBereichFilter === 'function') await window.renderWissenBereichFilter(); } catch(e) { console.warn('[wissen] Filter-Fehler:', e); }

    // Filter: Kategorie
    var items = alleArtikel;
    if (currentWissenBereich !== 'all') {
        items = items.filter(function(a){ return a.kategorie === currentWissenBereich; });
    }
    // Filter: Inhaltsart
    if (currentWissenArt !== 'all') {
        items = items.filter(function(a){ return a.inhaltsart === currentWissenArt; });
    }
    // Suche (nur über globale Suche Ctrl+K)
    var search = '';

    // KPI-Leiste
    var kpi = document.getElementById('wissenKpis');
    console.log('[wissen] KPIs:', kpi ? 'gefunden' : 'NICHT GEFUNDEN', 'Artikel:', alleArtikel.length, 'Gelesen:', _wissenGelesenSet.size);
    if (kpi) {
        var gelesenCount = _wissenGelesenSet.size;
        kpi.innerHTML =
            '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-gray-800">'+alleArtikel.length+'</p><p class="text-xs text-gray-500">Artikel gesamt</p></div>' +
            '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-green-600">'+gelesenCount+'</p><p class="text-xs text-gray-500">Gelesen</p></div>' +
            '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-vit-orange">'+(alleArtikel.length - gelesenCount)+'</p><p class="text-xs text-gray-500">Ungelesen</p></div>' +
            '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-blue-600">'+alleArtikel.filter(function(a){return a.gepinnt;}).length+'</p><p class="text-xs text-gray-500">Gepinnt</p></div>';
    }

    // Artikel-Karten rendern
    if (!items.length) {
        el.innerHTML = '<div class="text-center text-gray-400 py-12"><p class="text-2xl mb-2">🔍</p><p class="text-sm">Keine Artikel gefunden' + (search ? ' für "'+_escH(search)+'"' : '') + '.</p></div>';
        return;
    }

    var h = '<div class="grid grid-cols-1 gap-3">';
    items.forEach(function(a) {
        var kat = a.kategorie || 'allgemein';
        var art = a.inhaltsart || 'wissen';
        var katColor = KAT_COLORS[kat] || 'bg-gray-100 text-gray-700';
        var tags = (a.tags||[]).slice(0,4).map(function(t){ return '<span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">'+_escH(t)+'</span>'; }).join(' ');
        var preview = (a.inhalt||'').replace(/<[^>]*>/g, '').replace(/\s+/g,' ').trim().slice(0,160);
        var isGelesen = _wissenGelesenSet.has(a.id);
        h += '<div class="vit-card p-4 hover:shadow-md transition cursor-pointer '+(isGelesen?'border-l-4 border-l-green-400':'border-l-4 border-l-transparent')+'" onclick="window.openWissenArtikel(\''+a.id+'\')">' +
            '<div class="flex items-start justify-between mb-2">' +
                '<div class="flex items-center space-x-2 flex-wrap gap-1">' +
                    '<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+katColor+'">'+(KAT_ICONS[kat]||'📄')+' '+(KAT_LABELS[kat]||kat)+'</span>' +
                    '<span class="text-xs px-2 py-0.5 rounded-full font-semibold bg-white border border-gray-200 text-gray-600">'+(ART_ICONS[art]||'📄')+' '+(ART_LABELS[art]||art)+'</span>' +
                    (a.gepinnt?'<span class="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-semibold">📌</span>':'') +
                    (isGelesen?'<span class="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">✓ Gelesen</span>':'') +
                    tags +
                '</div>' +
                '<span class="text-xs text-gray-400 ml-2 whitespace-nowrap">👁️ '+a.views+'</span>' +
            '</div>' +
            '<h4 class="font-semibold text-gray-800 text-sm mb-1">'+_escH(a.titel)+'</h4>' +
            '<p class="text-xs text-gray-500 leading-relaxed">'+_escH(preview)+(preview.length>=160?'…':'')+'</p>' +
        '</div>';
    });
    h += '</div>';
    el.innerHTML = h;
}

// Artikel-Modal
window.openWissenArtikel = function(id) {
    var artikel = (_wissenArtikelCache||[]).find(function(a){ return a.id === id; });
    if (!artikel) return;
    _artikelViewCount(id);
    _markiereGelesen(id);

    var modal = document.getElementById('wissenArtikelModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'wissenArtikelModal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.style.background = 'rgba(0,0,0,0.5)';
        modal.onclick = function(e){ if(e.target===modal) modal.style.display='none'; };
        document.body.appendChild(modal);
    }
    var kat = artikel.kategorie || 'allgemein';
    var art = artikel.inhaltsart || 'wissen';
    var katColor = KAT_COLORS[kat] || 'bg-gray-100 text-gray-700';
    var tags = (artikel.tags||[]).map(function(t){ return '<span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">'+_escH(t)+'</span>'; }).join(' ');
    var inhalt = artikel.inhalt || '';
    var inhaltHtml = inhalt.indexOf('<') > -1 ? inhalt : '<p>' + _escH(inhalt).replace(/\n/g, '</p><p>') + '</p>';

    modal.innerHTML =
        '<div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">' +
            '<div class="flex items-start justify-between p-6 border-b border-gray-100">' +
                '<div>' +
                    '<div class="flex items-center space-x-2 mb-2">' +
                        '<span class="text-sm">'+(KAT_ICONS[kat]||'📄')+'</span>' +
                        '<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+katColor+'">'+(KAT_LABELS[kat]||kat)+'</span>' +
                        '<span class="text-xs px-2 py-0.5 rounded-full font-semibold bg-white border border-gray-200 text-gray-600">'+(ART_ICONS[art]||'📄')+' '+(ART_LABELS[art]||art)+'</span>' +
                        (artikel.gepinnt?'<span class="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-semibold">📌 Gepinnt</span>':'') +
                    '</div>' +
                    '<h2 class="text-lg font-bold text-gray-900">'+_escH(artikel.titel)+'</h2>' +
                    '<div class="flex items-center space-x-3 mt-1">'+tags+'</div>' +
                '</div>' +
                '<button onclick="document.getElementById(\'wissenArtikelModal\').style.display=\'none\'" class="text-gray-400 hover:text-gray-600 text-xl font-bold ml-4">✕</button>' +
            '</div>' +
            '<div class="p-6 overflow-y-auto flex-1 prose prose-sm max-w-none">'+inhaltHtml+'</div>' +
            '<div class="px-6 py-3 border-t border-gray-100 flex items-center justify-between">' +
                '<div class="flex items-center space-x-4"><span class="text-xs text-gray-400">👁️ '+(artikel.views+1)+' Aufrufe</span><span class="text-xs text-green-600 font-semibold">✓ Als gelesen markiert</span></div>' +
                '<button onclick="document.getElementById(\'wissenArtikelModal\').style.display=\'none\'" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200">Schließen</button>' +
            '</div>' +
        '</div>';
    modal.style.display = 'flex';
};

// Filter-Funktionen
window.filterWissenBereich = filterWissenBereich;
export function filterWissenBereich(b){
    currentWissenBereich=b;
    document.querySelectorAll('.wissen-bereich-filter').forEach(function(btn){btn.className='wissen-bereich-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn=document.querySelector('.wissen-bereich-filter[data-wbf="'+b+'"]');
    if(btn) btn.className='wissen-bereich-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderWissenGlobal();
}

window.filterWissenArt = filterWissenArt;
export function filterWissenArt(a){
    currentWissenArt=a;
    document.querySelectorAll('.wissen-art-filter').forEach(function(btn){btn.className='wissen-art-filter whitespace-nowrap py-3 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';});
    var btn=document.querySelector('.wissen-art-filter[data-waf="'+a+'"]');
    if(btn) btn.className='wissen-art-filter whitespace-nowrap py-3 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
    renderWissenGlobal();
}

export function filterWissenGlobal(){ renderWissenGlobal(); }
window.filterWissenGlobal = filterWissenGlobal;

// Dynamische Bereich-Filter aus DB
window.renderWissenBereichFilter = async function() {
    var container = document.getElementById('wissenBereichFilter');
    if (!container) return;
    var alleArtikel = await _ladeWissenArtikel();
    var katCounts = {};
    alleArtikel.forEach(function(a){ var k=a.kategorie||'allgemein'; katCounts[k]=(katCounts[k]||0)+1; });
    var h = '<button onclick="filterWissenBereich(\'all\')" class="wissen-bereich-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white" data-wbf="all">📚 Alle ('+alleArtikel.length+')</button>';
    KAT_ORDER.forEach(function(k){
        var count = katCounts[k] || 0;
        if (count > 0) {
            h += '<button onclick="filterWissenBereich(\''+k+'\')" class="wissen-bereich-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600" data-wbf="'+k+'">'+(KAT_ICONS[k]||'📄')+' '+(KAT_LABELS[k]||k)+' ('+count+')</button>';
        }
    });
    container.innerHTML = h;
};

// ══════════════════════════════════════════════════════
// CROSS-MODUL: Wissen-Tab in Fachmodulen
// ══════════════════════════════════════════════════════
var _modulWissenLoaded = {};

window.loadModulWissen = loadModulWissen;
export async function loadModulWissen(kategorie, containerId) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (_modulWissenLoaded[containerId]) return;
    _modulWissenLoaded[containerId] = true;

    el.innerHTML = '<div class="text-center py-8 text-gray-400"><p class="text-lg mb-2">⏳</p><p class="text-sm">Lade Wissen...</p></div>';

    try {
        var alleArtikel = await _ladeWissenArtikel();
        var articles = alleArtikel.filter(function(a){ return a.kategorie === kategorie; });

        if (!articles.length) {
            el.innerHTML = '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-2">📚</p><p>Noch keine Wissensartikel für '+(KAT_LABELS[kategorie]||kategorie)+'.</p></div>';
            return;
        }

        // Gruppiert nach Inhaltsart
        var grouped = {};
        ART_ORDER.forEach(function(a){ grouped[a] = []; });
        articles.forEach(function(a){
            var art = a.inhaltsart || 'wissen';
            if (!grouped[art]) grouped[art] = [];
            grouped[art].push(a);
        });

        // Sub-Tab Navigation
        var activeArts = ART_ORDER.filter(function(a){ return grouped[a] && grouped[a].length > 0; });
        var firstArt = activeArts[0] || 'wissen';

        var html = '';
        // Sub-Tabs
        if (activeArts.length > 1) {
            html += '<div class="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">';
            activeArts.forEach(function(art, idx){
                var isActive = idx === 0;
                html += '<button onclick="window.switchModulWissenSub(\''+containerId+'\',\''+art+'\')" class="mw-sub-'+containerId+' flex-1 px-3 py-2 text-xs font-semibold rounded-md '+(isActive?'bg-white shadow text-vit-orange':'text-gray-500 hover:bg-white')+'" data-mwsub="'+art+'">'+(ART_ICONS[art]||'📄')+' '+(ART_LABELS[art]||art)+' ('+grouped[art].length+')</button>';
            });
            html += '</div>';
        }

        // Content per Inhaltsart
        activeArts.forEach(function(art, idx){
            html += '<div id="'+containerId+'_'+art+'" class="mw-section-'+containerId+'"'+(idx>0?' style="display:none"':'')+'>';
            html += '<div class="space-y-3">';
            grouped[art].forEach(function(a){
                var pinBadge = a.gepinnt ? '<span class="text-[10px] px-2 py-0.5 bg-orange-100 text-vit-orange rounded-full font-bold ml-2">📌</span>' : '';
                var date = new Date(a.updated_at || a.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
                html += '<div class="vit-card overflow-hidden">';
                html += '<div class="p-4 cursor-pointer hover:bg-gray-50 transition" onclick="window.openWissenArtikel(\''+a.id+'\')">';
                html += '<div class="flex items-center justify-between">';
                html += '<div class="flex items-center"><span class="text-lg mr-3">'+(ART_ICONS[a.inhaltsart||'wissen']||'📚')+'</span><h3 class="font-semibold text-gray-800 text-sm">'+_escH(a.titel)+'</h3>'+pinBadge+'</div>';
                html += '<span class="text-xs text-gray-400">'+date+'</span>';
                html += '</div>';
                if (a.tags && a.tags.length) {
                    html += '<div class="flex gap-1 mt-2">';
                    a.tags.forEach(function(t){ html += '<span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">'+_escH(t)+'</span>'; });
                    html += '</div>';
                }
                var preview = (a.inhalt||'').replace(/<[^>]*>/g,'').trim().slice(0,120);
                if (preview) html += '<p class="text-xs text-gray-400 mt-1">'+_escH(preview)+(preview.length>=120?'…':'')+'</p>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div></div>';
        });

        el.innerHTML = html;
    } catch(e) {
        console.warn('[Wissen] Modul-Wissen load error:', e);
        el.innerHTML = '<div class="text-center py-8 text-red-400"><p>⚠️ Fehler beim Laden der Wissensartikel.</p></div>';
    }
}

window.switchModulWissenSub = function(containerId, sub) {
    document.querySelectorAll('.mw-section-'+containerId).forEach(function(s){ s.style.display='none'; });
    var target = document.getElementById(containerId+'_'+sub);
    if (target) target.style.display='block';
    document.querySelectorAll('.mw-sub-'+containerId).forEach(function(b){
        b.className='mw-sub-'+containerId+' flex-1 px-3 py-2 text-xs font-semibold rounded-md text-gray-500 hover:bg-white';
    });
    var btn = document.querySelector('.mw-sub-'+containerId+'[data-mwsub="'+sub+'"]');
    if (btn) btn.className='mw-sub-'+containerId+' flex-1 px-3 py-2 text-xs font-semibold rounded-md bg-white shadow text-vit-orange';
};

// Convenience: Verkauf Wissen (replaces old loadVerkaufWissen)
window.loadVerkaufWissen = function() { loadModulWissen('verkauf', 'vkTabVkWissen'); };
// Controlling Wissen
window.loadControllingWissen = function() { loadModulWissen('zahlen', 'ctrlTabCtrlWissen'); };
// Allgemein Wissen
window.loadAllgemeinWissen = function() { loadModulWissen('allgemein', 'allgemeinWissenContent'); };

// ══════════════════════════════════════════════════════
// HQ: Wissen-Verwaltung (CMS)
// ══════════════════════════════════════════════════════
var _quillEditor = null;
var _editingArtikelId = null;

function _ensureQuillLoaded(callback) {
    if (window.Quill) { callback(); return; }
    if (!document.getElementById('quill-css')) {
        var link = document.createElement('link');
        link.id = 'quill-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css';
        document.head.appendChild(link);
    }
    if (!document.getElementById('quill-js')) {
        var script = document.createElement('script');
        script.id = 'quill-js';
        script.src = 'https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js';
        script.onload = function() { setTimeout(callback, 100); };
        document.head.appendChild(script);
    } else {
        var check = setInterval(function(){ if (window.Quill) { clearInterval(check); callback(); } }, 100);
    }
}

function _initQuillEditor() {
    if (_quillEditor) return;
    var container = document.getElementById('hqWissenEditor');
    if (!container) return;
    _quillEditor = new window.Quill('#hqWissenEditor', {
        theme: 'snow',
        placeholder: 'Artikel-Inhalt hier eingeben…',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['blockquote', 'code-block'],
                ['link', 'image'],
                ['clean']
            ]
        }
    });
}

window.renderHqWissen = renderHqWissen;
export async function renderHqWissen() {
    var el = document.getElementById('hqWissenList');
    if (!el) return;

    var alleArtikel = await _ladeWissenArtikel(true);

    // KPIs
    var kpiEl = document.getElementById('hqWissenKpis');
    if (kpiEl) {
        var artCounts = {};
        alleArtikel.forEach(function(a){ var k=a.inhaltsart||'wissen'; artCounts[k]=(artCounts[k]||0)+1; });
        kpiEl.innerHTML =
            '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-vit-orange">'+alleArtikel.length+'</div><div class="text-xs text-gray-500">Artikel gesamt</div></div>' +
            '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-blue-600">'+(artCounts.anleitung_cockpit||0)+'</div><div class="text-xs text-gray-500">📱 Anleitungen</div></div>' +
            '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-green-600">'+(artCounts.wissen||0)+'</div><div class="text-xs text-gray-500">📚 Wissen</div></div>' +
            '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-amber-600">'+(artCounts.faq||0)+'</div><div class="text-xs text-gray-500">❓ FAQ</div></div>' +
            '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-purple-600">'+(artCounts.training||0)+'</div><div class="text-xs text-gray-500">🎓 Training</div></div>';
    }

    // Quill laden
    _ensureQuillLoaded(function(){ _initQuillEditor(); });

    // Kategorie-Dropdown dynamisch
    var katSelect = document.getElementById('hqWissenKat');
    if (katSelect && !katSelect.dataset.filled) {
        katSelect.dataset.filled = 'true';
        katSelect.innerHTML = '';
        KAT_ORDER.forEach(function(k){
            var opt = document.createElement('option');
            opt.value = k;
            opt.textContent = (KAT_ICONS[k]||'') + ' ' + KAT_LABELS[k];
            katSelect.appendChild(opt);
        });
    }

    // Inhaltsart-Dropdown dynamisch
    var artSelect = document.getElementById('hqWissenArt');
    if (artSelect && !artSelect.dataset.filled) {
        artSelect.dataset.filled = 'true';
        artSelect.innerHTML = '';
        ART_ORDER.forEach(function(a){
            var opt = document.createElement('option');
            opt.value = a;
            opt.textContent = (ART_ICONS[a]||'') + ' ' + ART_LABELS[a];
            artSelect.appendChild(opt);
        });
    }

    // Filter
    var filterKat = (document.getElementById('hqWissenFilterKat') || {}).value || 'all';
    var filterArt = (document.getElementById('hqWissenFilterArt') || {}).value || 'all';
    var filterSearch = (document.getElementById('hqWissenSearch') || {}).value || '';
    var filtered = alleArtikel;
    if (filterKat !== 'all') filtered = filtered.filter(function(a){ return a.kategorie === filterKat; });
    if (filterArt !== 'all') filtered = filtered.filter(function(a){ return a.inhaltsart === filterArt; });
    if (filterSearch) {
        var s = filterSearch.toLowerCase();
        filtered = filtered.filter(function(a){ return (a.titel||'').toLowerCase().indexOf(s)>-1 || (a.tags||[]).join(' ').toLowerCase().indexOf(s)>-1; });
    }

    // Artikel-Liste
    var h = '';
    if (!filtered.length) {
        h = '<p class="text-gray-400 text-sm py-4 text-center">Keine Artikel gefunden.</p>';
    }
    filtered.forEach(function(a){
        var kat = a.kategorie || 'allgemein';
        var art = a.inhaltsart || 'wissen';
        var katColor = KAT_COLORS[kat] || 'bg-gray-100 text-gray-700';
        var datum = a.updated_at ? new Date(a.updated_at).toLocaleDateString('de-DE') : '-';
        h += '<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">' +
            '<div class="flex items-center space-x-3 flex-1 min-w-0">' +
                '<span class="text-lg flex-shrink-0">'+(KAT_ICONS[kat]||'📄')+'</span>' +
                '<div class="min-w-0">' +
                    '<p class="text-sm font-semibold text-gray-800 truncate">'+_escH(a.titel)+'</p>' +
                    '<div class="flex items-center space-x-2 mt-0.5">' +
                        '<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+katColor+'">'+(KAT_LABELS[kat]||kat)+'</span>' +
                        '<span class="text-[10px] px-2 py-0.5 bg-white border border-gray-200 text-gray-500 rounded-full">'+(ART_ICONS[art]||'📄')+' '+(ART_LABELS[art]||art)+'</span>' +
                        '<span class="text-xs text-gray-400">'+datum+'</span>' +
                        '<span class="text-xs text-gray-400">👁️ '+(a.views||0)+'</span>' +
                        (a.gepinnt?'<span class="text-xs text-yellow-600">📌</span>':'') +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="flex items-center space-x-2 flex-shrink-0 ml-2">' +
                '<button onclick="window.editWissenArtikel(\''+a.id+'\')" class="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-white" title="Bearbeiten">✏️</button>' +
                '<button onclick="window.togglePinWissen(\''+a.id+'\','+(!a.gepinnt)+')" class="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-white" title="'+(a.gepinnt?'Entpinnen':'Pinnen')+'">'+(a.gepinnt?'📌':'📍')+'</button>' +
                '<button onclick="window.deleteWissenArtikel(\''+a.id+'\',\''+_escH(a.titel).replace(/'/g,"\\'")+'\')" class="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50" title="Löschen">🗑️</button>' +
            '</div>' +
        '</div>';
    });
    el.innerHTML = h;
}

// Neuen Artikel speichern
window.addHqWissen = addHqWissen;
export async function addHqWissen() {
    var titelEl = document.getElementById('hqWissenTitel');
    var katEl   = document.getElementById('hqWissenKat');
    var artEl   = document.getElementById('hqWissenArt');
    var tagsEl  = document.getElementById('hqWissenTags');
    var titel = (titelEl||{}).value || '';
    if (!titel.trim()) { _showToast('Bitte Titel eingeben', 'error'); return; }

    var inhalt = _quillEditor ? _quillEditor.root.innerHTML : '';
    if (!inhalt || inhalt === '<p><br></p>') { _showToast('Bitte Inhalt eingeben', 'error'); return; }

    var kategorie = (katEl||{}).value || 'allgemein';
    var inhaltsart = (artEl||{}).value || 'wissen';
    var tagsStr = (tagsEl||{}).value || '';
    var tags = tagsStr.split(',').map(function(t){ return t.trim(); }).filter(function(t){ return t; });

    var sb = _sb(); if (!sb) return;
    var user = _sbUser();

    try {
        if (_editingArtikelId) {
            var { error } = await sb.from('wissen_artikel').update({
                titel: titel.trim(), inhalt: inhalt, kategorie: kategorie, inhaltsart: inhaltsart,
                tags: tags, updated_at: new Date().toISOString()
            }).eq('id', _editingArtikelId);
            if (error) throw error;
            _showToast('Artikel aktualisiert ✓', 'success');
            _editingArtikelId = null;
            var saveBtn = document.getElementById('hqWissenSaveBtn');
            if (saveBtn) saveBtn.textContent = '📚 Veröffentlichen';
            var cancelBtn = document.getElementById('hqWissenCancelBtn');
            if (cancelBtn) cancelBtn.style.display = 'none';
        } else {
            var { error } = await sb.from('wissen_artikel').insert({
                titel: titel.trim(), inhalt: inhalt, kategorie: kategorie, inhaltsart: inhaltsart,
                tags: tags, erstellt_von: user ? user.id : null, views: 0, gepinnt: false
            });
            if (error) throw error;
            _showToast('Artikel veröffentlicht ✓', 'success');
        }
        // Reset form
        if (titelEl) titelEl.value = '';
        if (tagsEl) tagsEl.value = '';
        if (_quillEditor) _quillEditor.setText('');
        _wissenArtikelCache = null;
        _modulWissenLoaded = {}; // Reset cross-modul cache
        renderHqWissen();
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

window.editWissenArtikel = async function(id) {
    var artikel = (_wissenArtikelCache||[]).find(function(a){ return a.id === id; });
    if (!artikel) return;
    _editingArtikelId = id;
    var titelEl = document.getElementById('hqWissenTitel');
    var katEl   = document.getElementById('hqWissenKat');
    var artEl   = document.getElementById('hqWissenArt');
    var tagsEl  = document.getElementById('hqWissenTags');
    if (titelEl) titelEl.value = artikel.titel || '';
    if (katEl) katEl.value = artikel.kategorie || 'allgemein';
    if (artEl) artEl.value = artikel.inhaltsart || 'wissen';
    if (tagsEl) tagsEl.value = (artikel.tags||[]).join(', ');
    _ensureQuillLoaded(function(){
        _initQuillEditor();
        if (_quillEditor) {
            var inhalt = artikel.inhalt || '';
            if (inhalt.indexOf('<') > -1) { _quillEditor.root.innerHTML = inhalt; }
            else { _quillEditor.setText(inhalt); }
        }
    });
    var saveBtn = document.getElementById('hqWissenSaveBtn');
    if (saveBtn) saveBtn.textContent = '💾 Aktualisieren';
    var cancelBtn = document.getElementById('hqWissenCancelBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    var editorCard = document.getElementById('hqWissenEditorCard');
    if (editorCard) editorCard.scrollIntoView({ behavior: 'smooth' });
    _showToast('Artikel zum Bearbeiten geladen', 'info');
};

window.cancelEditWissen = function() {
    _editingArtikelId = null;
    var titelEl = document.getElementById('hqWissenTitel');
    var tagsEl  = document.getElementById('hqWissenTags');
    if (titelEl) titelEl.value = '';
    if (tagsEl) tagsEl.value = '';
    if (_quillEditor) _quillEditor.setText('');
    var saveBtn = document.getElementById('hqWissenSaveBtn');
    if (saveBtn) saveBtn.textContent = '📚 Veröffentlichen';
    var cancelBtn = document.getElementById('hqWissenCancelBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
};

window.deleteWissenArtikel = async function(id, titel) {
    if (!confirm('Artikel "'+titel+'" wirklich löschen?')) return;
    try {
        var sb = _sb(); if (!sb) return;
        var { error } = await sb.from('wissen_artikel').delete().eq('id', id);
        if (error) throw error;
        _showToast('Artikel gelöscht ✓', 'success');
        _wissenArtikelCache = null;
        _modulWissenLoaded = {};
        renderHqWissen();
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
};

window.togglePinWissen = async function(id, pinned) {
    try {
        var sb = _sb(); if (!sb) return;
        var { error } = await sb.from('wissen_artikel').update({ gepinnt: pinned }).eq('id', id);
        if (error) throw error;
        _showToast(pinned ? 'Artikel angepinnt 📌' : 'Artikel entpinnt', 'success');
        _wissenArtikelCache = null;
        renderHqWissen();
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
};

window.filterHqWissen = function() { renderHqWissen(); };

// ══════════════════════════════════════════════════════
// Event Hooks + Cross-Modul Integration
// ══════════════════════════════════════════════════════
// Register view-changed listener (works even if vit:modules-ready already fired)
document.addEventListener('vit:view-changed', function(e) {
    if (e && e.detail && e.detail.view === 'wissen') {
        renderWissenGlobal();
    }
});

window.addEventListener('vit:modules-ready', function() {

    // Cross-Modul: Wrap showVerkaufTab
    if (typeof window.showVerkaufTab === 'function') {
        var origVK = window.showVerkaufTab;
        window.showVerkaufTab = function(t) {
            origVK(t);
            if (t === 'vkWissen') loadModulWissen('verkauf', 'vkTabVkWissen');
        };
    }

    // Cross-Modul: Wrap showControllingTab
    if (typeof window.showControllingTab === 'function') {
        var origCtrl = window.showControllingTab;
        window.showControllingTab = function(t) {
            origCtrl(t);
            if (t === 'ctrlWissen') loadModulWissen('zahlen', 'ctrlTabCtrlWissen');
        };
    }

    // Cross-Modul: Wrap showAllgemeinTab
    if (typeof window.showAllgemeinTab === 'function') {
        var origAllg = window.showAllgemeinTab;
        window.showAllgemeinTab = function(t) {
            origAllg(t);
            if (t === 'wissen') loadModulWissen('allgemein', 'allgemeinWissenContent');
        };
    }
});

// ══════════════════════════════════════════════════════
// Strangler Fig Exports
// ══════════════════════════════════════════════════════
const _exports = {renderWissenGlobal,filterWissenBereich,filterWissenArt,filterWissenGlobal,renderHqWissen,addHqWissen,loadModulWissen};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
