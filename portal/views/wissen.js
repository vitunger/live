/**
 * views/wissen.js - Wissen Module (DB-basiert)
 * Partner: Wissensdatenbank lesen, filtern, suchen, als gelesen markieren
 * HQ: CMS mit Quill WYSIWYG-Editor – Artikel erstellen, bearbeiten, löschen
 * @module views/wissen
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// ══════════════════════════════════════════════════════
// SHARED: Kategorie-Definitionen
// ══════════════════════════════════════════════════════
var _katLabels = {allgemein:'Allgemein',verkauf:'Verkauf',einkauf:'Einkauf',marketing:'Marketing',controlling:'Controlling',werkstatt:'Werkstatt',mitarbeiter:'Mitarbeiter',onboarding:'Onboarding',kommunikation:'Kommunikation',system:'System & WaWi'};
var _katIcons  = {allgemein:'🏢',verkauf:'💰',einkauf:'🛒',marketing:'📣',controlling:'📊',werkstatt:'🔧',mitarbeiter:'👥',onboarding:'🚀',kommunikation:'✉️',system:'🖥️'};
var _katColors = {allgemein:'bg-gray-100 text-gray-700',verkauf:'bg-blue-100 text-blue-700',einkauf:'bg-cyan-100 text-cyan-700',marketing:'bg-orange-100 text-orange-700',controlling:'bg-green-100 text-green-700',werkstatt:'bg-yellow-100 text-yellow-700',mitarbeiter:'bg-purple-100 text-purple-700',onboarding:'bg-pink-100 text-pink-700',kommunikation:'bg-indigo-100 text-indigo-700',system:'bg-slate-100 text-slate-700'};

// ══════════════════════════════════════════════════════
// SHARED: Cache & Laden
// ══════════════════════════════════════════════════════
var _wissenArtikelCache = null;
var _wissenArtikelLoading = false;
var _wissenGelesenSet = new Set(); // artikel_ids die der User gelesen hat

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

// ══════════════════════════════════════════════════════
// PARTNER: Global Wissen View
// ══════════════════════════════════════════════════════
var currentWissenBereich = 'all';
window.currentWissenBereich = currentWissenBereich;

window.renderWissenGlobal = renderWissenGlobal;
export async function renderWissenGlobal() {
    var el = document.getElementById('wissenGlobalContent');
    if (!el) return;

    // Ladeindikator
    el.innerHTML = '<div class="text-center py-12 text-gray-400"><div class="animate-spin text-3xl mb-3">⚙️</div><p class="text-sm">Artikel werden geladen…</p></div>';

    var alleArtikel = await _ladeWissenArtikel();
    await _ladeGelesenStatus();

    // Filter nach Kategorie
    var items = alleArtikel;
    if (currentWissenBereich !== 'all') {
        items = items.filter(function(a){ return a.kategorie === currentWissenBereich; });
    }

    // Suche
    var search = (document.getElementById('wissenSearch') || {}).value || '';
    if (search) {
        var s = search.toLowerCase();
        items = items.filter(function(a){
            return (a.titel||'').toLowerCase().indexOf(s) > -1 ||
                   (a.inhalt||'').toLowerCase().indexOf(s) > -1 ||
                   (a.tags||[]).join(' ').toLowerCase().indexOf(s) > -1;
        });
    }

    // KPI-Leiste
    var kpi = document.getElementById('wissenKpis');
    if (kpi) {
        var katCounts = {};
        alleArtikel.forEach(function(a){ var k=a.kategorie||'allgemein'; katCounts[k]=(katCounts[k]||0)+1; });
        var gelesenCount = _wissenGelesenSet.size;
        kpi.innerHTML =
            '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-gray-800">'+alleArtikel.length+'</p><p class="text-xs text-gray-500">Artikel gesamt</p></div>' +
            '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-green-600">'+gelesenCount+'</p><p class="text-xs text-gray-500">Gelesen</p></div>' +
            '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-vit-orange">'+(alleArtikel.length - gelesenCount)+'</p><p class="text-xs text-gray-500">Ungelesen</p></div>' +
            '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-blue-600">'+alleArtikel.filter(function(a){return a.gepinnt;}).length+'</p><p class="text-xs text-gray-500">Gepinnt</p></div>' +
            '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-purple-600">'+Object.keys(katCounts).length+'</p><p class="text-xs text-gray-500">Kategorien</p></div>';
    }

    // Artikel-Karten rendern
    if (!items.length) {
        el.innerHTML = '<div class="text-center text-gray-400 py-12"><p class="text-2xl mb-2">🔍</p><p class="text-sm">Keine Artikel gefunden' + (search ? ' für "'+_escH(search)+'"' : '') + '.</p></div>';
        return;
    }

    var h = '<div class="grid grid-cols-1 gap-3">';
    items.forEach(function(a) {
        var kat = a.kategorie || 'allgemein';
        var katColor = _katColors[kat] || 'bg-gray-100 text-gray-700';
        var tags = (a.tags||[]).slice(0,4).map(function(t){ return '<span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">'+_escH(t)+'</span>'; }).join(' ');
        var preview = (a.inhalt||'').replace(/<[^>]*>/g, '').replace(/\s+/g,' ').trim().slice(0,160);
        var isGelesen = _wissenGelesenSet.has(a.id);
        h += '<div class="vit-card p-4 hover:shadow-md transition cursor-pointer '+(isGelesen?'border-l-4 border-l-green-400':'border-l-4 border-l-transparent')+'" onclick="window.openWissenArtikel(\''+a.id+'\')">' +
            '<div class="flex items-start justify-between mb-2">' +
                '<div class="flex items-center space-x-2 flex-wrap gap-1">' +
                    '<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+katColor+'">'+(_katIcons[kat]||'📄')+' '+(_katLabels[kat]||kat)+'</span>' +
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

// Artikel-Modal (Partner-View)
window.openWissenArtikel = function(id) {
    var artikel = (_wissenArtikelCache||[]).find(function(a){ return a.id === id; });
    if (!artikel) return;

    // View-Counter erhöhen
    _artikelViewCount(id);
    // Als gelesen markieren
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
    var katColor = _katColors[kat] || 'bg-gray-100 text-gray-700';
    var tags = (artikel.tags||[]).map(function(t){ return '<span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">'+_escH(t)+'</span>'; }).join(' ');
    var inhalt = artikel.inhalt || '';
    // Wenn HTML-Inhalt, direkt rendern; sonst als Plaintext mit Zeilenumbrüchen
    var inhaltHtml = inhalt.indexOf('<') > -1 ? inhalt : '<p>' + _escH(inhalt).replace(/\n/g, '</p><p>') + '</p>';

    modal.innerHTML =
        '<div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">' +
            '<div class="flex items-start justify-between p-6 border-b border-gray-100">' +
                '<div>' +
                    '<div class="flex items-center space-x-2 mb-2">' +
                        '<span class="text-sm">'+(_katIcons[kat]||'📄')+'</span>' +
                        '<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+katColor+'">'+(_katLabels[kat]||kat)+'</span>' +
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

async function _artikelViewCount(id) {
    try {
        var sb = _sb(); if (!sb) return;
        var artikel = (_wissenArtikelCache||[]).find(function(a){return a.id===id;});
        var currentViews = artikel ? (artikel.views || 0) : 0;
        await sb.from('wissen_artikel').update({ views: currentViews + 1 }).eq('id', id);
        if (artikel) artikel.views = currentViews + 1;
    } catch(e) {}
}

// Filter-Funktionen
window.filterWissenBereich = filterWissenBereich;
export function filterWissenBereich(b){
    currentWissenBereich=b; window.currentWissenBereich=b;
    document.querySelectorAll('.wissen-bereich-filter').forEach(function(btn){btn.className='wissen-bereich-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn=document.querySelector('.wissen-bereich-filter[data-wbf="'+b+'"]');
    if(btn) btn.className='wissen-bereich-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
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
    var kats = Object.keys(katCounts).sort(function(a,b){ return katCounts[b]-katCounts[a]; });
    var h = '<button onclick="filterWissenBereich(\'all\')" class="wissen-bereich-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white" data-wbf="all">📚 Alle ('+alleArtikel.length+')</button>';
    kats.forEach(function(k){
        h += '<button onclick="filterWissenBereich(\''+k+'\')" class="wissen-bereich-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600" data-wbf="'+k+'">'+(_katIcons[k]||'📄')+' '+(_katLabels[k]||k)+' ('+katCounts[k]+')</button>';
    });
    container.innerHTML = h;
};

// ══════════════════════════════════════════════════════
// HQ: Wissen-Verwaltung (CMS)
// ══════════════════════════════════════════════════════
var _quillEditor = null;
var _editingArtikelId = null;

function _ensureQuillLoaded(callback) {
    if (window.Quill) { callback(); return; }
    // CSS laden
    if (!document.getElementById('quill-css')) {
        var link = document.createElement('link');
        link.id = 'quill-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css';
        document.head.appendChild(link);
    }
    // JS laden
    if (!document.getElementById('quill-js')) {
        var script = document.createElement('script');
        script.id = 'quill-js';
        script.src = 'https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js';
        script.onload = function() {
            // Kurze Verzögerung damit Quill-Styles greifen
            setTimeout(callback, 100);
        };
        document.head.appendChild(script);
    } else {
        // Script already loading, poll for Quill
        var check = setInterval(function(){
            if (window.Quill) { clearInterval(check); callback(); }
        }, 100);
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

    // KPIs aus DB laden
    var alleArtikel = await _ladeWissenArtikel(true);
    var katCounts = {};
    alleArtikel.forEach(function(a){ var k=a.kategorie||'allgemein'; katCounts[k]=(katCounts[k]||0)+1; });

    // KPI-Leiste aktualisieren
    var kpiEl = document.getElementById('hqWissenKpis');
    if (kpiEl) {
        kpiEl.innerHTML =
            '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-vit-orange">'+alleArtikel.length+'</div><div class="text-xs text-gray-500">Artikel gesamt</div></div>' +
            '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-blue-600">'+Object.keys(katCounts).length+'</div><div class="text-xs text-gray-500">Kategorien</div></div>' +
            '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-green-600">'+alleArtikel.filter(function(a){return a.gepinnt;}).length+'</div><div class="text-xs text-gray-500">Gepinnt</div></div>' +
            '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-purple-600">'+alleArtikel.reduce(function(s,a){return s+(a.views||0);},0)+'</div><div class="text-xs text-gray-500">Views gesamt</div></div>';
    }

    // Quill laden & initialisieren
    _ensureQuillLoaded(function(){
        _initQuillEditor();
    });

    // Kategorie-Dropdown dynamisch befüllen
    var katSelect = document.getElementById('hqWissenKat');
    if (katSelect && !katSelect.dataset.filled) {
        katSelect.dataset.filled = 'true';
        katSelect.innerHTML = '';
        Object.keys(_katLabels).forEach(function(k){
            var opt = document.createElement('option');
            opt.value = k;
            opt.textContent = (_katIcons[k]||'') + ' ' + _katLabels[k];
            katSelect.appendChild(opt);
        });
    }

    // Filter
    var filterKat = (document.getElementById('hqWissenFilterKat') || {}).value || 'all';
    var filterSearch = (document.getElementById('hqWissenSearch') || {}).value || '';
    var filtered = alleArtikel;
    if (filterKat !== 'all') filtered = filtered.filter(function(a){ return a.kategorie === filterKat; });
    if (filterSearch) {
        var s = filterSearch.toLowerCase();
        filtered = filtered.filter(function(a){ return (a.titel||'').toLowerCase().indexOf(s)>-1 || (a.tags||[]).join(' ').toLowerCase().indexOf(s)>-1; });
    }

    // Artikel-Liste rendern
    var katIcons = _katIcons;
    var h = '';
    if (!filtered.length) {
        h = '<p class="text-gray-400 text-sm py-4 text-center">Keine Artikel gefunden.</p>';
    }
    filtered.forEach(function(a){
        var kat = a.kategorie || 'allgemein';
        var katColor = _katColors[kat] || 'bg-gray-100 text-gray-700';
        var datum = a.updated_at ? new Date(a.updated_at).toLocaleDateString('de-DE') : '-';
        h += '<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">' +
            '<div class="flex items-center space-x-3 flex-1 min-w-0">' +
                '<span class="text-lg flex-shrink-0">'+(katIcons[kat]||'📄')+'</span>' +
                '<div class="min-w-0">' +
                    '<p class="text-sm font-semibold text-gray-800 truncate">'+_escH(a.titel)+'</p>' +
                    '<div class="flex items-center space-x-2 mt-0.5">' +
                        '<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+katColor+'">'+(_katLabels[kat]||kat)+'</span>' +
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
    var tagsEl  = document.getElementById('hqWissenTags');
    var titel = (titelEl||{}).value || '';
    if (!titel.trim()) { _showToast('Bitte Titel eingeben', 'error'); return; }

    var inhalt = _quillEditor ? _quillEditor.root.innerHTML : '';
    if (!inhalt || inhalt === '<p><br></p>') { _showToast('Bitte Inhalt eingeben', 'error'); return; }

    var kategorie = (katEl||{}).value || 'allgemein';
    var tagsStr = (tagsEl||{}).value || '';
    var tags = tagsStr.split(',').map(function(t){ return t.trim(); }).filter(function(t){ return t; });

    var sb = _sb(); if (!sb) return;
    var user = _sbUser();

    try {
        if (_editingArtikelId) {
            // Update bestehenden Artikel
            var { error } = await sb.from('wissen_artikel').update({
                titel: titel.trim(),
                inhalt: inhalt,
                kategorie: kategorie,
                tags: tags,
                updated_at: new Date().toISOString()
            }).eq('id', _editingArtikelId);
            if (error) throw error;
            _showToast('Artikel aktualisiert ✓', 'success');
            _editingArtikelId = null;
            var saveBtn = document.getElementById('hqWissenSaveBtn');
            if (saveBtn) saveBtn.textContent = '📚 Veröffentlichen';
            var cancelBtn = document.getElementById('hqWissenCancelBtn');
            if (cancelBtn) cancelBtn.style.display = 'none';
        } else {
            // Neuen Artikel erstellen
            var { error } = await sb.from('wissen_artikel').insert({
                titel: titel.trim(),
                inhalt: inhalt,
                kategorie: kategorie,
                tags: tags,
                erstellt_von: user ? user.id : null,
                views: 0,
                gepinnt: false
            });
            if (error) throw error;
            _showToast('Artikel veröffentlicht ✓', 'success');
        }

        // Form zurücksetzen
        if (titelEl) titelEl.value = '';
        if (tagsEl) tagsEl.value = '';
        if (_quillEditor) _quillEditor.setText('');
        _wissenArtikelCache = null; // Cache invalidieren
        renderHqWissen();
    } catch(e) {
        _showToast('Fehler: ' + e.message, 'error');
    }
}

// Artikel zum Bearbeiten laden
window.editWissenArtikel = async function(id) {
    var artikel = (_wissenArtikelCache||[]).find(function(a){ return a.id === id; });
    if (!artikel) return;

    _editingArtikelId = id;
    var titelEl = document.getElementById('hqWissenTitel');
    var katEl   = document.getElementById('hqWissenKat');
    var tagsEl  = document.getElementById('hqWissenTags');

    if (titelEl) titelEl.value = artikel.titel || '';
    if (katEl) katEl.value = artikel.kategorie || 'allgemein';
    if (tagsEl) tagsEl.value = (artikel.tags||[]).join(', ');

    _ensureQuillLoaded(function(){
        _initQuillEditor();
        if (_quillEditor) {
            // HTML-Inhalt in Quill setzen
            var inhalt = artikel.inhalt || '';
            if (inhalt.indexOf('<') > -1) {
                _quillEditor.root.innerHTML = inhalt;
            } else {
                _quillEditor.setText(inhalt);
            }
        }
    });

    // Button-Text ändern
    var saveBtn = document.getElementById('hqWissenSaveBtn');
    if (saveBtn) saveBtn.textContent = '💾 Aktualisieren';
    var cancelBtn = document.getElementById('hqWissenCancelBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    // Zum Editor scrollen
    var editorCard = document.getElementById('hqWissenEditorCard');
    if (editorCard) editorCard.scrollIntoView({ behavior: 'smooth' });

    _showToast('Artikel zum Bearbeiten geladen', 'info');
};

// Bearbeitung abbrechen
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
    _showToast('Bearbeitung abgebrochen', 'info');
};

// Artikel löschen
window.deleteWissenArtikel = async function(id, titel) {
    if (!confirm('Artikel "'+titel+'" wirklich löschen? Dies kann nicht rückgängig gemacht werden.')) return;
    try {
        var sb = _sb(); if (!sb) return;
        var { error } = await sb.from('wissen_artikel').delete().eq('id', id);
        if (error) throw error;
        _showToast('Artikel gelöscht ✓', 'success');
        _wissenArtikelCache = null;
        renderHqWissen();
    } catch(e) {
        _showToast('Fehler beim Löschen: ' + e.message, 'error');
    }
};

// Artikel pinnen/entpinnen
window.togglePinWissen = async function(id, pinned) {
    try {
        var sb = _sb(); if (!sb) return;
        var { error } = await sb.from('wissen_artikel').update({ gepinnt: pinned }).eq('id', id);
        if (error) throw error;
        _showToast(pinned ? 'Artikel angepinnt 📌' : 'Artikel entpinnt', 'success');
        _wissenArtikelCache = null;
        renderHqWissen();
    } catch(e) {
        _showToast('Fehler: ' + e.message, 'error');
    }
};

// HQ Filter
window.filterHqWissen = function() { renderHqWissen(); };

// ══════════════════════════════════════════════════════
// Event Hooks
// ══════════════════════════════════════════════════════
window.addEventListener('vit:modules-ready', function() {
    document.addEventListener('vit:view-changed', function(e) {
        if (e && e.detail && e.detail.view === 'wissen') {
            if (typeof window.renderWissenBereichFilter === 'function') window.renderWissenBereichFilter();
            renderWissenGlobal();
        }
    });
});

// ══════════════════════════════════════════════════════
// Strangler Fig Exports
// ══════════════════════════════════════════════════════
const _exports = {renderWissenGlobal,filterWissenBereich,filterWissenGlobal,renderHqWissen,addHqWissen};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
