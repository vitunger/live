/**
 * views/dev-tabs.js - Tab render functions for the Entwicklung unified view
 * @module views/dev-tabs
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// Shared state access
function _devSubs() { return window._devState ? window._devState.submissions : []; }
function _devStatusLabels() { return window._devState ? window._devState.statusLabels : {}; }
function _devStatusColors() { return window._devState ? window._devState.statusColors : {}; }
function _devKatIcons() { return window._devState ? window._devState.katIcons : {}; }

export function renderEntwIdeen() {
    var c = document.getElementById('entwIdeenContent');
    if(!c) return;
    var isHQ = (currentRoles||[]).indexOf('hq') !== -1;
    var userId = _sbUser() ? _sbUser().id : null;
    var fScope = document.getElementById('entwFilterScope');
    var fStatus = document.getElementById('entwFilterStatus');
    var fKat = document.getElementById('entwFilterKat');
    var fQuelle = document.getElementById('entwFilterQuelle');
    var fTyp = document.getElementById('entwFilterTyp');
    var scope = fScope ? fScope.value : 'alle';
    var status = fStatus ? fStatus.value : 'alle';
    var kat = fKat ? fKat.value : 'alle';
    var quelle = fQuelle ? fQuelle.value : 'alle';
    var typ = fTyp ? fTyp.value : 'alle';
    // Clear KPI filter if any dropdown is manually changed
    if(scope !== 'alle' || status !== 'alle' || kat !== 'alle' || quelle !== 'alle' || typ !== 'alle') {
        if((window._devState ? window._devState.kpiActiveFilter : '')) { window._devState.kpiActiveFilter = ''; renderEntwicklung(); }
    }

    var items = _devSubs().filter(function(s) {
        // KPI filter takes priority when active
        if((window._devState ? window._devState.kpiActiveFilter : '')) {
            var kf = (window._devState ? window._devState.kpiActiveFilter : '');
            if(kf === 'eingang' && ['neu','ki_pruefung'].indexOf(s.status) === -1) return false;
            if(kf === 'warten' && ['ki_rueckfragen','hq_rueckfragen'].indexOf(s.status) === -1) return false;
            if(kf === 'aktiv' && ['in_entwicklung','beta_test','im_review'].indexOf(s.status) === -1) return false;
            if(kf === 'done' && s.status !== 'ausgerollt') return false;
            if(kf === 'bugs' && (s.ki_typ !== 'bug' || ['abgelehnt','ausgerollt','geparkt'].indexOf(s.status) !== -1)) return false;
            if(kf === 'woche' && (Date.now() - new Date(s.created_at).getTime()) >= 7*86400000) return false;
            // gesamt = no additional filter
            return true;
        }
        if(scope !== 'alle' && s.scope !== scope) return false;
        if(status === 'neu' && ['neu','ki_pruefung','ki_rueckfragen','konzept_erstellt','konzept_wird_erstellt','im_ideenboard','hq_rueckfragen'].indexOf(s.status) === -1) return false;
        if(status === 'dev' && ['freigegeben','in_planung','in_entwicklung','beta_test','im_review','release_geplant'].indexOf(s.status) === -1) return false;
        if(status === 'done' && s.status !== 'ausgerollt' && s.status !== 'geschlossen') return false;
        if(kat !== 'alle' && s.kategorie !== kat) return false;
        if(quelle === 'meine' && s.user_id !== userId) return false;
        if(quelle === 'standort' && s.standort_id !== currentStandortId) return false;
        if(typ !== 'alle' && s.ki_typ !== typ) return false;
        return true;
    });

    var countEl = document.getElementById('entwIdeenCount');
    if(countEl) countEl.textContent = items.length + ' von ' + _devSubs().length + ' Einträgen';

    if(items.length === 0) {
        c.innerHTML = '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-2">💡</p><p>Keine Ideen mit diesen Filtern gefunden</p></div>';
        return;
    }

    // Sort by votes (most votes first), then by date
    var fSort = document.getElementById('entwFilterSort');
    var sortMode = fSort ? fSort.value : 'votes';
    if(sortMode === 'votes') {
        items.sort(function(a,b){ return (b.dev_votes||[]).length - (a.dev_votes||[]).length || new Date(b.created_at) - new Date(a.created_at); });
    } else if(sortMode === 'newest') {
        items.sort(function(a,b){ return new Date(b.created_at) - new Date(a.created_at); });
    } else if(sortMode === 'oldest') {
        items.sort(function(a,b){ return new Date(a.created_at) - new Date(b.created_at); });
    } else if(sortMode === 'fit') {
        items.sort(function(a,b){ var aFit = a.dev_ki_analysen && a.dev_ki_analysen[0] ? a.dev_ki_analysen[0].vision_fit_score||0 : 0; var bFit = b.dev_ki_analysen && b.dev_ki_analysen[0] ? b.dev_ki_analysen[0].vision_fit_score||0 : 0; return bFit - aFit; });
    }

    var h = '<div class="space-y-3">';
    items.forEach(function(s) {
        var votes = (s.dev_votes || []).length;
        var hasVoted = userId && (s.dev_votes || []).some(function(v){ return v.user_id === userId; });
        var ki = s.dev_ki_analysen && s.dev_ki_analysen.length > 0 ? s.dev_ki_analysen[0] : null;
        var scopeLabel = s.scope === 'netzwerk' ? '<span class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">Netzwerk</span>' : '<span class="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">Portal</span>';
        var statusLabel = _devStatusLabels()[s.status] || s.status;
        var statusColor = _devStatusColors()[s.status] || 'bg-gray-100 text-gray-600';

        h += '<div class="vit-card p-4 hover:shadow-md transition cursor-pointer" onclick="openDevDetail(\''+s.id+'\')">';
        h += '<div class="flex items-start gap-3">';
        // Vote button LEFT
        h += '<div class="flex flex-col items-center flex-shrink-0 pt-1">';
        h += '<button onclick="event.stopPropagation();toggleDevVote(\''+s.id+'\')" class="w-10 h-10 rounded-lg '+(hasVoted?'bg-vit-orange text-white shadow-md':'bg-gray-100 text-gray-400 hover:bg-vit-orange/20 hover:text-vit-orange')+' flex items-center justify-center text-lg font-bold transition">'+(hasVoted?'▲':'△')+'</button>';
        h += '<span class="text-sm font-bold '+(hasVoted?'text-vit-orange':'text-gray-500')+' mt-0.5">'+votes+'</span>';
        h += '</div>';
        // Content
        h += '<div class="flex-1 min-w-0">';
        h += '<div class="flex items-center gap-2 mb-1 flex-wrap">';
        h += '<span class="text-xs font-semibold rounded px-2 py-0.5 '+statusColor+'">'+statusLabel+'</span>';
        h += scopeLabel;
        if(s.kategorie) h += '<span class="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">'+s.kategorie+'</span>';
        if(ki && ki.aufwand_schaetzung) h += '<span class="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">'+ki.aufwand_schaetzung+'</span>';
        var _eKom = (s.dev_kommentare||[]).filter(function(k){return k.typ==='kommentar';}).length;
        if(_eKom > 0) h += '<span class="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">💬 '+_eKom+'</span>';
        h += '</div>';
        h += '<h3 class="font-semibold text-gray-800 text-sm">'+((s.titel||s.beschreibung||s.kurz_notiz||s.transkription||'Kein Titel').substring(0,80))+'</h3>';
        if(s.eingabe_typ && s.eingabe_typ !== 'text') h += '<span class="text-[10px] text-gray-400 ml-1">'+(s.eingabe_typ==='audio'?'🎤 Audio':s.eingabe_typ==='screenshot'?'📸 Screenshot':s.eingabe_typ==='video'?'🖥️ Video':'📎 '+s.eingabe_typ)+'</span>';
        if(!s.titel && !s.beschreibung && !s.kurz_notiz && s.eingabe_typ==='audio' && !s.transkription) h += '<p class="text-xs text-amber-500 mt-1">⏳ Audio wird transkribiert...</p>';
        if(!s.ki_analysiert_at && s.status==='neu') h += '<p class="text-xs text-blue-400 mt-1">' + ((currentRoles||[]).indexOf('hq')!==-1 ? '🤖 KI-Analyse ausstehend' : '⏳ Wird bearbeitet...') + '</p>';
        if(ki && ki.zusammenfassung) h += '<p class="text-xs text-gray-500 mt-1 line-clamp-2">'+ki.zusammenfassung+'</p>';
        h += '</div>';
        // Vision Fit Score RIGHT (only if exists)
        if(ki && ki.vision_fit_score != null) {
            var fitColor = ki.vision_fit_score>=70?'text-green-600':ki.vision_fit_score>=40?'text-yellow-600':'text-red-500';
            h += '<div class="text-center flex-shrink-0"><div class="text-xl font-bold '+fitColor+'">'+ki.vision_fit_score+'</div><div class="text-[9px] text-gray-400">Fit</div></div>';
        }
        h += '</div></div>';
    });
    h += '</div>';
    c.innerHTML = h;
}

export async function renderEntwReleases() {
    var c = document.getElementById('entwReleasesContent');
    if(!c) return;
    var isHQr = (currentRoles||[]).indexOf('hq') !== -1;
    c.innerHTML = '<div class="text-center py-8 text-gray-400">Lade Releases...</div>';
    try {
        var resp = await _sb().from('dev_release_docs').select('*, dev_submissions!dev_release_docs_submission_id_fkey(titel, status)').eq('freigegeben', true).order('created_at', {ascending: false});
        // [prod] log removed
        if(resp.error) console.error('[Releases] Error:', resp.error);
        var docs = resp.data || [];
        var respP = await _sb().from('dev_release_docs').select('*, dev_submissions!dev_release_docs_submission_id_fkey(titel, status)').eq('freigegeben', false).order('created_at', {ascending: false});
        var pending = respP.data || [];

        var h = '';
        // HQ: Create button
        if(isHQr) {
            h += '<div class="flex justify-end mb-4">';
            h += '<button onclick="devShowCreateRelease()" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">+ Release erstellen</button>';
            h += '</div>';
            // Hidden create form
            h += '<div id="devCreateReleaseForm" class="hidden vit-card p-4 mb-4 border-2 border-green-200 bg-green-50">';
            h += '<h4 class="text-sm font-bold text-green-800 mb-3">📣 Neue Release-Note erstellen</h4>';
            h += '<div class="grid grid-cols-2 gap-3 mb-3">';
            h += '<select id="relTyp" class="text-sm border border-gray-200 rounded-lg px-3 py-2"><option value="release_note">📣 Release-Note</option><option value="wissensartikel">📚 Wissensartikel</option></select>';
            h += '<input id="relVersion" type="text" placeholder="Version (z.B. v2.4)" class="text-sm border border-gray-200 rounded-lg px-3 py-2">';
            h += '</div>';
            h += '<input id="relTitel" type="text" placeholder="Titel der Release-Note" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3">';
            h += '<textarea id="relInhalt" placeholder="Was wurde geändert / verbessert / gefixt?\n\nTipp: Nutze Aufzählungen für mehrere Punkte." class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3" rows="5"></textarea>';
            h += '<details class="mb-3"><summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Zusätzliche Änderungen (nicht in Submissions erfasst)</summary>';
            h += '<textarea id="relManualContext" placeholder="Hier kannst du Änderungen eintragen, die nicht als Submission existieren.\nz.B. Bug-Fixes aus Claude-Sessions, Config-Änderungen, Refactorings..." class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mt-2" rows="3"></textarea>';
            h += '<p class="text-[10px] text-gray-400 mt-1">Die KI bezieht auch automatisch CLAUDE.md Session-Notizen und bereits veröffentlichte Releases ein.</p></details>';
            h += '<div class="flex justify-between items-center">';
            h += '<button onclick="devKIReleaseVorschlag()" id="btnKIRelease" class="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-xs font-semibold hover:from-purple-600 hover:to-indigo-700 flex items-center gap-1.5"><span>🧠</span><span>KI-Vorschlag generieren</span></button>';
            h += '<div class="flex gap-2">';
            h += '<button onclick="document.getElementById(\'devCreateReleaseForm\').classList.add(\'hidden\')" class="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Abbrechen</button>';
            h += '<button onclick="devSaveRelease()" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">💾 Veröffentlichen</button>';
            h += '</div></div></div>';
        }

        if(docs.length === 0 && pending.length === 0) {
            h += '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-2">🚀</p><p>Noch keine Release-Dokumentation vorhanden</p><p class="text-xs mt-1">Release-Notes und Wissensartikel werden automatisch bei Rollout generiert'+(isHQr?' — oder manuell über den Button oben.':'.')+'</p></div>';
            c.innerHTML = h;
            return;
        }

        // Published docs
        if(docs.length > 0) {
            h += '<div class="space-y-3 mb-6">';
            docs.forEach(function(d) {
                var icon = d.typ === 'release_note' ? '📣' : '📚';
                var feature = d.dev_submissions ? d.dev_submissions.titel : '';
                var date = new Date(d.created_at).toLocaleDateString('de-DE');
                var version = d.version ? ' v'+d.version : '';
                h += '<div class="vit-card p-4">';
                h += '<div class="flex items-start justify-between">';
                h += '<div class="flex-1"><div class="flex items-center gap-2 mb-1">';
                h += '<span class="text-lg">'+icon+'</span>';
                h += '<span class="font-semibold text-gray-800">'+_escH(d.titel)+'</span>';
                if(version) h += '<span class="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 font-mono">'+version+'</span>';
                h += '<span class="text-[10px] rounded px-1.5 py-0.5 '+(d.typ==='release_note'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700')+'">'+(d.typ==='release_note'?'Release':'Wissen')+'</span>';
                h += '</div>';
                if(feature) h += '<p class="text-[10px] text-gray-400 mb-1">Feature: '+_escH(feature)+'</p>';
                h += '<p class="text-sm text-gray-600 whitespace-pre-line">'+_escH(d.inhalt)+'</p>';
                h += '<span class="text-[10px] text-gray-400 mt-2 inline-block">'+date+'</span>';
                h += '</div>';
                if(isHQr) {
                    h += '<div class="flex gap-1 ml-2 shrink-0">';
                    h += '<button onclick="devEditReleaseDoc(\''+d.id+'\')" class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Bearbeiten">✏️</button>';
                    h += '<button onclick="devDeleteReleaseDoc(\''+d.id+'\')" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Löschen">🗑️</button>';
                    h += '</div>';
                }
                h += '</div></div>';
            });
            h += '</div>';
        }
        // Pending docs (HQ only)
        if(pending.length > 0 && isHQr) {
            h += '<h3 class="text-sm font-bold text-gray-500 mb-2">⏳ Entwürfe ('+pending.length+')</h3><div class="space-y-2">';
            pending.forEach(function(d) {
                var icon = d.typ === 'release_note' ? '📣' : '📚';
                var feature = d.dev_submissions ? d.dev_submissions.titel : '';
                h += '<div class="vit-card p-3 border-l-4 border-orange-300">';
                h += '<div class="flex items-center gap-2 mb-1"><span class="text-sm">'+icon+'</span><span class="font-semibold text-sm text-gray-700">'+_escH(d.titel)+'</span>';
                h += '<span class="text-[10px] bg-orange-100 text-orange-700 rounded px-1.5 py-0.5">Entwurf</span></div>';
                if(feature) h += '<p class="text-[10px] text-gray-400">Feature: '+_escH(feature)+'</p>';
                h += '<p class="text-xs text-gray-500">'+_escH(d.inhalt)+'</p>';
                h += '<button onclick="devApproveReleaseDoc(\''+d.id+'\',\''+d.submission_id+'\',\''+d.typ+'\',true)" class="mt-2 px-3 py-1 bg-green-500 text-white rounded text-xs font-semibold hover:bg-green-600">✅ Freigeben</button>';
                h += '</div>';
            });
            h += '</div>';
        }
        c.innerHTML = h;
    } catch(err) { c.innerHTML = '<div class="text-center py-8 text-red-400">Fehler: '+_escH(err.message)+'</div>'; }
}

export async function renderEntwSteuerung() {
    var c = document.getElementById('entwSteuerungContent');
    if(!c) return;
    await loadDevSubmissions();

    var h = '';

    // KI-Priorisierung Button (HQ only)
    var isHQ = _sbProfile() && (_sbProfile().role === 'geschaeftsleitung' || _sbProfile().role === 'hq_admin' || _sbProfile().is_hq);
    if(isHQ) {
        h += '<div class="flex items-center justify-between mb-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">';
        h += '<div><h3 class="text-sm font-bold text-purple-700">🤖 KI-Priorisierung</h3>';
        h += '<p class="text-xs text-purple-500">KI analysiert alle offenen Ideen und empfiehlt die optimale Reihenfolge</p></div>';
        h += '<button onclick="runDevKIPrioritize()" id="btnDevPrio" class="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-indigo-700 shadow-sm flex items-center gap-2">';
        h += '<span>🧠</span><span>Priorisierung starten</span></button></div>';
        h += '<div id="devPrioResult" class="hidden mb-4"></div>';
    }

    // Kanban board for HQ (6 Spalten lt. Plan)
    var columns = [
        {key:'neu', label:'📥 Eingang', statuses:['neu','ki_pruefung','ki_rueckfragen'], color:'blue'},
        {key:'board', label:'🎯 Ideenboard', statuses:['im_ideenboard','hq_rueckfragen'], color:'purple'},
        {key:'plan', label:'📅 Planung', statuses:['konzept_wird_erstellt','konzept_erstellt','freigegeben','in_planung'], color:'teal'},
        {key:'dev', label:'🔨 Entwicklung', statuses:['in_entwicklung','beta_test','im_review','release_geplant'], color:'yellow'},
        {key:'done', label:'✅ Umgesetzt', statuses:['ausgerollt'], color:'green'},
        {key:'parked', label:'⏸ Geparkt', statuses:['geparkt'], color:'gray'},
        {key:'rejected', label:'❌ Abgelehnt', statuses:['abgelehnt'], color:'red'},
        {key:'closed', label:'🔒 Geschlossen', statuses:['geschlossen'], color:'slate'}
    ];
    h += '<div class="flex gap-3 overflow-x-auto pb-2" style="min-height:400px">';
    columns.forEach(function(col) {
        var items = _devSubs().filter(function(s) { return col.statuses.indexOf(s.status) !== -1; });
        // Smart sort: critical bugs first, then by effort (quick wins up), then votes
        var aufwandOrder = {'XS':0,'S':1,'M':2,'L':3,'XL':4};
        items.sort(function(a,b) {
            // Bugs before features
            var aIsBug = a.ki_typ === 'bug' ? 0 : 1;
            var bIsBug = b.ki_typ === 'bug' ? 0 : 1;
            if(aIsBug !== bIsBug) return aIsBug - bIsBug;
            // Smaller effort first (quick wins)
            var aE = aufwandOrder[a.geschaetzter_aufwand] !== undefined ? aufwandOrder[a.geschaetzter_aufwand] : 2;
            var bE = aufwandOrder[b.geschaetzter_aufwand] !== undefined ? aufwandOrder[b.geschaetzter_aufwand] : 2;
            if(aE !== bE) return aE - bE;
            // More votes first
            var aV = (a.dev_votes||[]).length;
            var bV = (b.dev_votes||[]).length;
            return bV - aV;
        });
        h += '<div class="bg-gray-50 rounded-xl p-3 flex-shrink-0" style="min-width:200px;width:calc((100% - 7*0.75rem)/8)">';
        h += '<div class="flex items-center justify-between mb-3"><h3 class="text-sm font-bold text-gray-700">'+col.label+'</h3><span class="text-xs bg-'+col.color+'-100 text-'+col.color+'-700 rounded-full px-2 py-0.5 font-semibold">'+items.length+'</span></div>';
        h += '<div class="space-y-2 max-h-[600px] overflow-y-auto">';
        items.forEach(function(s) {
            var statusLabel = _devStatusLabels()[s.status] || s.status;
            h += '<div class="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition" onclick="openDevDetail(\''+s.id+'\')">';
            var _typ = s.ki_typ || (s.kategorie === 'feature' ? 'feature' : s.kategorie === 'bug' ? 'bug' : 'idee');
            var _typColor = _typ==='bug'?'bg-red-100 text-red-700':_typ==='feature'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700';
            var _typLabel = _typ==='bug'?'\uD83D\uDC1B Bug':_typ==='feature'?'\\u2728 Feature':'\\uD83D\\uDCA1 Idee';
            h += '<div class="flex items-center gap-1 mb-1"><span class="text-[9px] font-semibold rounded px-1.5 py-0.5 '+_typColor+'">'+_typLabel+'</span></div>';
            h += '<p class="text-xs font-semibold text-gray-800 mb-1 line-clamp-2">'+(s.titel||s.beschreibung||s.kurz_notiz||s.transkription||'Kein Titel').substring(0,60)+'</p>';
            h += '<div class="flex items-center gap-1 flex-wrap">';
            h += '<span class="text-[9px] rounded px-1.5 py-0.5 '+(_devStatusColors()[s.status]||'bg-gray-100 text-gray-600')+'">'+statusLabel+'</span>';
            var _einreicher = s.users && s.users.name ? s.users.name : '';
            if(_einreicher) h += '<span class="text-[9px] text-gray-400">\uD83D\uDC64 '+_escH(_einreicher)+'</span>';
            var votes = (s.dev_votes||[]).length;
            if(votes) h += '<span class="text-[9px] text-gray-400">▲'+votes+'</span>';
            h += '</div></div>';
        });

        if(items.length === 0) h += '<p class="text-xs text-gray-300 text-center py-4">Keine Einträge</p>';
        h += '</div></div>';
    });
    h += '</div>';
    c.innerHTML = h;
}

export async function renderEntwFlags() {
    var c = document.getElementById('entwFlagsContent');
    if(!c) return;
    // Trigger the existing feature flags render if available
    if(typeof renderHqFf === 'function') { renderHqFf(); return; }
    try {
        var resp = await _sb().from('feature_flags').select('*').order('created_at', {ascending: false});
        var flags = resp.data || [];
        if(flags.length === 0) { c.innerHTML = '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-2">🚩</p><p>Keine Feature Flags vorhanden</p><button onclick="ffShowCreate()" class="mt-3 px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold">+ Neuer Flag</button></div>'; return; }
        var active = flags.filter(function(f){return f.enabled;}).length;
        var h = '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">';
        h += '<div class="vit-card p-3 text-center"><p class="text-xl font-bold text-gray-800">'+flags.length+'</p><p class="text-[10px] text-gray-500">Gesamt</p></div>';
        h += '<div class="vit-card p-3 text-center"><p class="text-xl font-bold text-green-600">'+active+'</p><p class="text-[10px] text-gray-500">Aktiv</p></div>';
        h += '<div class="vit-card p-3 text-center"><p class="text-xl font-bold text-gray-400">'+(flags.length-active)+'</p><p class="text-[10px] text-gray-500">Inaktiv</p></div>';
        h += '<div class="vit-card p-3 text-center"><button onclick="ffShowCreate()" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">+ Neuer Flag</button></div>';
        h += '</div>';
        h += '<div class="space-y-3">';
        flags.forEach(function(f) {
            h += '<div class="vit-card p-4 flex items-center justify-between">';
            h += '<div class="flex-1 min-w-0">';
            h += '<div class="flex items-center gap-2 mb-1"><span class="font-mono text-sm font-bold text-gray-800">'+f.flag_key+'</span>';
            h += '<span class="text-[10px] rounded px-1.5 py-0.5 font-semibold '+(f.enabled?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500')+'">'+(f.enabled?'Aktiv':'Inaktiv')+'</span>';
            if(f.scope) h += '<span class="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">'+f.scope+'</span>';
            h += '</div>';
            if(f.rollout_percent !== null && f.rollout_percent !== undefined) h += '<p class="text-xs text-gray-500">Rollout: '+f.rollout_percent+'%</p>';
            h += '</div>';
            h += '<div class="flex items-center gap-2">';
            h += '<button onclick="ffToggle(\''+f.id+'\','+(!f.enabled)+')" class="px-3 py-1.5 text-xs font-semibold rounded-lg '+(f.enabled?'bg-red-50 text-red-600 hover:bg-red-100':'bg-green-50 text-green-600 hover:bg-green-100')+'">'+(f.enabled?'Deaktivieren':'Aktivieren')+'</button>';
            h += '<button onclick="ffEdit(\''+f.id+'\')" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100">Bearbeiten</button>';
            h += '</div></div>';
        });
        h += '</div>';
        c.innerHTML = h;
    } catch(err) { c.innerHTML = '<div class="text-center py-8 text-red-400">Fehler: '+_escH(err.message)+'</div>'; }
}

export async function renderEntwSystem() {
    var c = document.getElementById('entwSystemContent');
    if(!c) return;
    var h = '<h3 class="text-lg font-bold text-gray-800 mb-4">💾 Backups</h3>';
    h += '<div id="entwBackupContent"><div class="text-center py-8 text-gray-400 animate-pulse">Wird geladen...</div></div>';
    c.innerHTML = h;
    try {
        var days = 7;
        var since = new Date(Date.now() - days*86400000).toISOString();
        var resp = await _sb().from('backup_log').select('*').gte('started_at', since).order('started_at', {ascending: false}).limit(20);
        var backups = resp.data || [];
        var bc = document.getElementById('entwBackupContent');
        if(!bc) return;
        if(backups.length === 0) { bc.innerHTML = '<div class="text-center py-6 text-gray-400">Keine Backups in den letzten '+days+' Tagen</div>'; }
        else {
            var bh = '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
            backups.forEach(function(b) {
                var st = b.status === 'completed' ? '✅' : b.status === 'failed' ? '❌' : '⏳';
                bh += '<div class="vit-card p-3 flex items-center gap-3"><span class="text-xl">'+st+'</span><div class="flex-1 min-w-0">';
                bh += '<p class="text-sm font-semibold text-gray-800">'+new Date(b.started_at).toLocaleString('de-DE')+'</p>';
                bh += '<p class="text-xs text-gray-500">'+(b.backup_type||'auto')+' • '+(b.tables_count||'?')+' Tabellen • '+(b.total_rows||'?')+' Rows</p>';
                bh += '</div></div>';
            });
            bh += '</div>';
            bh += '<button onclick="bkTriggerBackup()" class="mt-4 px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">Backup jetzt starten</button>';
            bc.innerHTML = bh;
        }
    } catch(err) { var bc2=document.getElementById('entwBackupContent'); if(bc2) bc2.innerHTML='<div class="text-red-400 text-sm">'+_escH(err.message)+'</div>'; }
}

export async function renderEntwNutzung() {
    var c = document.getElementById('entwNutzungContent');
    if(!c) return;
    c.innerHTML = '<div class="text-center py-8 text-gray-400 animate-pulse">Lade Portal-Nutzungsdaten...</div>';
    try {
        // Parallel load all relevant data
        var [usersResp, loginsResp, bwaResp, tasksResp, msgsResp, subsResp] = await Promise.all([
            _sb().from('users').select('id, name, is_hq, standort_id, created_at, standorte(name), user_rollen(rollen(name,label))').order('updated_at', {ascending:false,nullsFirst:false}),
            _sb().from('audit_log').select('user_id, action, created_at').eq('action','login').gte('created_at', new Date(Date.now()-30*86400000).toISOString()).order('created_at',{ascending:false}).limit(500),
            _sb().from('bwa_daten').select('standort_id, created_at, monat, jahr').order('created_at',{ascending:false}).limit(100),
            _sb().from('todos').select('id, zugewiesen_an, erledigt, created_at').gte('created_at', new Date(Date.now()-30*86400000).toISOString()),
            _sb().from('nachrichten').select('id, autor_id, created_at').gte('created_at', new Date(Date.now()-30*86400000).toISOString()).limit(500),
            _sb().from('dev_submissions').select('id, user_id, created_at, status')
        ]);
        var users = usersResp.data || [];
        var logins = loginsResp.data || [];
        var bwas = bwaResp.data || [];
        var tasks = tasksResp.data || [];
        var msgs = msgsResp.data || [];
        var subs = subsResp.data || [];

        // Compute stats
        var totalUsers = users.length;
        var activeUsers30d = new Set(logins.map(function(l){return l.user_id})).size;
        var loginsToday = logins.filter(function(l){ return new Date(l.created_at).toDateString() === new Date().toDateString(); }).length;
        var loginsWeek = logins.filter(function(l){ return Date.now() - new Date(l.created_at).getTime() < 7*86400000; }).length;
        var tasksCreated = tasks.length;
        var tasksCompleted = tasks.filter(function(t){return t.erledigt}).length;
        var bwaCount = bwas.length;
        var msgCount = msgs.length;
        var feedbackCount = subs.length;

        // Users by role (from user_rollen join)
        var roleCounts = {};
        users.forEach(function(u) {
            var rollen = (u.user_rollen||[]).map(function(ur){return ur.rollen?ur.rollen.label:'';}).filter(Boolean);
            if(rollen.length===0) rollen = [u.is_hq ? 'HQ' : 'Keine Rolle'];
            rollen.forEach(function(r){ roleCounts[r] = (roleCounts[r]||0) + 1; });
        });

        // Login heatmap (last 14 days)
        var dayLabels = [];
        var dayCounts = [];
        for(var d=13; d>=0; d--) {
            var day = new Date(Date.now() - d*86400000);
            var ds = day.toDateString();
            dayLabels.push(day.toLocaleDateString('de-DE',{weekday:'short',day:'numeric'}));
            dayCounts.push(logins.filter(function(l){ return new Date(l.created_at).toDateString()===ds; }).length);
        }
        var maxLogins = Math.max.apply(null, dayCounts) || 1;

        // Top active users (most logins in 30d)
        var userLoginCount = {};
        logins.forEach(function(l){ userLoginCount[l.user_id] = (userLoginCount[l.user_id]||0)+1; });
        var topUsers = Object.keys(userLoginCount).map(function(uid){
            var u = users.find(function(x){return x.id===uid});
            var rollen = u ? (u.user_rollen||[]).map(function(ur){return ur.rollen?ur.rollen.label:'';}).filter(Boolean).join(', ') : '?';
            return {name: u?u.name:'Unbekannt', standort: u&&u.standorte?u.standorte.name:'–', logins: userLoginCount[uid], rolle: rollen||'?'};
        }).sort(function(a,b){return b.logins-a.logins}).slice(0,10);

        // Never logged in (not in audit_log at all)
        var loggedUserIds = new Set(logins.map(function(l){return l.user_id;}));
        var neverLogged = users.filter(function(u){ return !loggedUserIds.has(u.id); });
        // Inactive > 14 days (last login older than 14 days)
        var lastLoginMap = {};
        logins.forEach(function(l){ if(!lastLoginMap[l.user_id] || l.created_at > lastLoginMap[l.user_id]) lastLoginMap[l.user_id] = l.created_at; });
        var inactive14d = users.filter(function(u){ return lastLoginMap[u.id] && (Date.now() - new Date(lastLoginMap[u.id]).getTime() > 14*86400000); });

        var h = '';
        // KPI Cards
        h += '<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">';
        h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-gray-800">'+totalUsers+'</p><p class="text-[10px] text-gray-500">User gesamt</p></div>';
        h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-green-600">'+activeUsers30d+'</p><p class="text-[10px] text-gray-500">Aktiv (30 Tage)</p></div>';
        h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-blue-600">'+loginsToday+'</p><p class="text-[10px] text-gray-500">Logins heute</p></div>';
        h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-indigo-600">'+loginsWeek+'</p><p class="text-[10px] text-gray-500">Logins diese Woche</p></div>';
        h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-yellow-600">'+tasksCreated+'</p><p class="text-[10px] text-gray-500">Aufgaben (30T)</p></div>';
        h += '<div class="vit-card p-4 text-center"><p class="text-2xl font-bold text-purple-600">'+msgCount+'</p><p class="text-[10px] text-gray-500">Nachrichten (30T)</p></div>';
        h += '</div>';

        // Login Heatmap
        h += '<div class="vit-card p-4 mb-6"><h4 class="text-sm font-bold text-gray-700 mb-3">📈 Login-Verlauf (14 Tage)</h4>';
        h += '<div class="flex items-end gap-1" style="height:120px">';
        dayCounts.forEach(function(cnt, i) {
            var pct = Math.max(5, (cnt/maxLogins)*100);
            var color = cnt===0 ? 'bg-gray-200' : cnt<=2 ? 'bg-blue-200' : cnt<=5 ? 'bg-blue-400' : 'bg-blue-600';
            h += '<div class="flex-1 flex flex-col items-center justify-end h-full">';
            h += '<span class="text-[9px] text-gray-500 mb-1">'+cnt+'</span>';
            h += '<div class="w-full rounded-t '+color+'" style="height:'+pct+'%"></div>';
            h += '<span class="text-[8px] text-gray-400 mt-1 truncate w-full text-center">'+dayLabels[i]+'</span>';
            h += '</div>';
        });
        h += '</div></div>';

        // Two columns: Top Users + Role Distribution
        h += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">';

        // Top Active Users
        h += '<div class="vit-card p-4"><h4 class="text-sm font-bold text-gray-700 mb-3">🏆 Aktivste User (30 Tage)</h4>';
        h += '<div class="space-y-2">';
        topUsers.forEach(function(u, i) {
            var barW = Math.max(10, (u.logins / (topUsers[0]?topUsers[0].logins:1)) * 100);
            h += '<div class="flex items-center gap-2">';
            h += '<span class="text-xs text-gray-400 w-4">'+(i+1)+'</span>';
            h += '<div class="flex-1 min-w-0"><div class="flex items-center justify-between mb-0.5"><span class="text-xs font-semibold text-gray-700 truncate">'+u.name+'</span><span class="text-[10px] text-gray-400">'+u.logins+'×</span></div>';
            h += '<div class="w-full bg-gray-100 rounded-full h-1.5"><div class="bg-vit-orange rounded-full h-1.5" style="width:'+barW+'%"></div></div>';
            h += '<span class="text-[9px] text-gray-400">'+u.standort+' • '+u.rolle+'</span>';
            h += '</div></div>';
        });
        if(topUsers.length === 0) h += '<p class="text-xs text-gray-400">Keine Login-Daten verfügbar</p>';
        h += '</div></div>';

        // Role Distribution
        h += '<div class="vit-card p-4"><h4 class="text-sm font-bold text-gray-700 mb-3">👥 User nach Rolle</h4>';
        var roleColors = {hq:'bg-red-500',inhaber:'bg-blue-500',geschaeftsleitung:'bg-indigo-500',verkauf:'bg-green-500',werkstatt:'bg-yellow-500',buchhaltung:'bg-purple-500',marketing:'bg-pink-500'};
        var roleLabels = {hq:'HQ',inhaber:'Inhaber',geschaeftsleitung:'Geschäftsleitung',verkauf:'Verkauf',werkstatt:'Werkstatt',buchhaltung:'Buchhaltung',marketing:'Marketing'};
        h += '<div class="space-y-3">';
        Object.keys(roleCounts).sort(function(a,b){return roleCounts[b]-roleCounts[a]}).forEach(function(r) {
            var pct = Math.round((roleCounts[r]/totalUsers)*100);
            h += '<div><div class="flex justify-between text-xs mb-1"><span class="font-semibold text-gray-700">'+(roleLabels[r]||r)+'</span><span class="text-gray-500">'+roleCounts[r]+' ('+pct+'%)</span></div>';
            h += '<div class="w-full bg-gray-100 rounded-full h-2"><div class="'+(roleColors[r]||'bg-gray-500')+' rounded-full h-2" style="width:'+pct+'%"></div></div></div>';
        });
        h += '</div></div>';
        h += '</div>';

        // Activity Summary
        h += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">';
        // BWA Uploads
        h += '<div class="vit-card p-4"><h4 class="text-sm font-bold text-gray-700 mb-3">📊 BWA-Uploads</h4>';
        h += '<p class="text-3xl font-bold text-green-600 mb-1">'+bwaCount+'</p><p class="text-xs text-gray-500">in den letzten 30 Tagen</p>';
        if(bwas.length > 0) {
            h += '<div class="mt-3 space-y-1">';
            bwas.slice(0,5).forEach(function(b) { h += '<p class="text-[10px] text-gray-400">'+new Date(b.created_at).toLocaleDateString('de-DE')+' – '+(b.monat||'?')+'/'+(b.jahr||'?')+'</p>'; });
            h += '</div>';
        }
        h += '</div>';

        // Tasks
        h += '<div class="vit-card p-4"><h4 class="text-sm font-bold text-gray-700 mb-3">✅ Aufgaben (30T)</h4>';
        h += '<p class="text-3xl font-bold text-yellow-600 mb-1">'+tasksCreated+'</p>';
        h += '<p class="text-xs text-gray-500">'+tasksCompleted+' abgeschlossen ('+(tasksCreated>0?Math.round(tasksCompleted/tasksCreated*100):0)+'%)</p>';
        h += '</div>';

        // Feedback
        h += '<div class="vit-card p-4"><h4 class="text-sm font-bold text-gray-700 mb-3">💡 Entwicklungs-Feedback</h4>';
        h += '<p class="text-3xl font-bold text-purple-600 mb-1">'+feedbackCount+'</p>';
        var approved = subs.filter(function(s){return s.status==='freigegeben'||s.status==='ausgerollt'}).length;
        h += '<p class="text-xs text-gray-500">'+approved+' freigegeben</p>';
        h += '</div>';
        h += '</div>';

        // Inactive / Never logged in
        if(neverLogged.length > 0 || inactive14d.length > 0) {
            h += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
            if(neverLogged.length > 0) {
                h += '<div class="vit-card p-4 border-l-4 border-red-400"><h4 class="text-sm font-bold text-red-600 mb-2">⚠️ Nie eingeloggt ('+neverLogged.length+')</h4>';
                h += '<div class="space-y-1">';
                neverLogged.slice(0,10).forEach(function(u) {
                    var rLabel = (u.user_rollen||[]).map(function(ur){return ur.rollen?ur.rollen.label:'';}).filter(Boolean).join(', ') || '?';
                    h += '<p class="text-xs text-gray-600">'+u.name+' <span class="text-gray-400">('+rLabel+')</span></p>';
                });
                if(neverLogged.length>10) h += '<p class="text-xs text-gray-400">... und '+(neverLogged.length-10)+' weitere</p>';
                h += '</div></div>';
            }
            if(inactive14d.length > 0) {
                h += '<div class="vit-card p-4 border-l-4 border-yellow-400"><h4 class="text-sm font-bold text-yellow-700 mb-2">😴 Inaktiv >14 Tage ('+inactive14d.length+')</h4>';
                h += '<div class="space-y-1">';
                inactive14d.slice(0,10).forEach(function(u) {
                    var lastLogin = lastLoginMap[u.id];
                    var days = lastLogin ? Math.round((Date.now()-new Date(lastLogin).getTime())/86400000) : '?';
                    var rLabel = (u.user_rollen||[]).map(function(ur){return ur.rollen?ur.rollen.label:'';}).filter(Boolean).join(', ') || '?';
                    h += '<p class="text-xs text-gray-600">'+u.name+' <span class="text-gray-400">('+days+' Tage, '+rLabel+')</span></p>';
                });
                if(inactive14d.length>10) h += '<p class="text-xs text-gray-400">... und '+(inactive14d.length-10)+' weitere</p>';
                h += '</div></div>';
            }
            h += '</div>';
        }

        c.innerHTML = h;
    } catch(err) {
        c.innerHTML = '<div class="text-center py-8"><p class="text-red-400 text-sm">Fehler beim Laden: '+_escH(err.message)+'</p></div>';
        console.error('renderEntwNutzung error:', err);
    }
}

const _exports = { renderEntwIdeen, renderEntwReleases, renderEntwSteuerung, renderEntwFlags, renderEntwSystem, renderEntwNutzung };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
