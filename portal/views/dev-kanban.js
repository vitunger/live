/**
 * views/dev-kanban.js - Kanban board views, card rendering, pipeline
 * @module views/dev-kanban
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }
function _sbUrl()        { return window.SUPABASE_URL || window._sb?.()?.supabaseUrl || 'https://lwwagbkxeofahhwebkab.supabase.co'; }

// Shared state access
function _devSubs() { return window._devState ? window._devState.submissions : []; }
function _devStatusLabels() { return window._devState ? window._devState.statusLabels : {}; }
function _devStatusColors() { return window._devState ? window._devState.statusColors : {}; }
function _devKatIcons() { return window._devState ? window._devState.katIcons : {}; }

export function showIdeenTab(tab) {
    try { localStorage.setItem('vit:lastIdeenTab', tab); } catch(e) {}
    window._devState.currentTab = tab;
    document.querySelectorAll('.dev-tab-btn').forEach(function(b) {
        var isActive = b.getAttribute('data-dtab') === tab;
        b.className = 'dev-tab-btn px-4 py-2 rounded-md text-sm font-semibold ' + (isActive ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500');
    });
    document.querySelectorAll('#entwicklungView .ideen-tab-content, #ideenboardView .ideen-tab-content').forEach(function(c) { c.style.display = 'none'; });
    var target = document.getElementById('ideenTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if(target) target.style.display = '';
    // Hide ideenboard stats on Entwicklung tab (it has its own)
    var statsBar = document.getElementById('devStatsBar');
    if(statsBar) statsBar.style.display = (tab === 'roadmap') ? 'none' : '';
    renderDevTab(tab);
}

export async function renderDevPipeline() {
    // Show HQ tabs if HQ user
    var isHQ = (currentRoles||[]).indexOf('hq') !== -1;
    var boardBtn = document.getElementById('devTabBoardBtn');
    var planBtn = document.getElementById('devTabPlanungBtn');
    if(boardBtn) boardBtn.style.display = isHQ ? '' : 'none';
    if(planBtn) planBtn.style.display = isHQ ? '' : 'none';

    // Load all submissions
    try {
        var query = _sb().from('dev_submissions').select('*, users!dev_submissions_user_id_public_fkey(name), dev_ki_analysen(zusammenfassung, vision_fit_score, machbarkeit, aufwand_schaetzung, bug_schwere, deadline_vorschlag, deadline_begruendung), dev_votes(user_id), dev_kommentare(id, typ, inhalt, created_at, users!dev_kommentare_user_id_public_fkey(name))').order('created_at', {ascending: false});
        var resp = await query;
        if(resp.error) throw resp.error;
        window._devState.submissions = resp.data || [];
    } catch(err) {
        console.error('DevPipeline load:', err);
        window._devState.submissions = [];
    }

    // Update stats
    var total = _devSubs().length;
    var neu = _devSubs().filter(function(s){ return ['neu','ki_pruefung','ki_rueckfragen','konzept_erstellt','konzept_wird_erstellt'].indexOf(s.status) !== -1; }).length;
    var board = _devSubs().filter(function(s){ return ['im_ideenboard','hq_rueckfragen'].indexOf(s.status) !== -1; }).length;
    var dev = _devSubs().filter(function(s){ return ['freigegeben','in_planung','in_entwicklung','beta_test','im_review','release_geplant'].indexOf(s.status) !== -1; }).length;
    var done = _devSubs().filter(function(s){ return s.status === 'ausgerollt'; }).length;

    var e1=document.getElementById('devStatTotal');if(e1)e1.textContent=total;
    var e2=document.getElementById('devStatNeu');if(e2)e2.textContent=neu;
    var e3=document.getElementById('devStatBoard');if(e3)e3.textContent=board;
    var e4=document.getElementById('devStatDev');if(e4)e4.textContent=dev;
    var e5=document.getElementById('devStatDone');if(e5)e5.textContent=done;

    renderDevTab(window._devState.currentTab);
}

export function renderDevTab(tab) {
    if(tab === 'meine') renderDevMeine();
    else if(tab === 'alle') renderDevAlle();
    else if(tab === 'board') renderDevBoard();
    else if(tab === 'planung') renderDevPlanung();
    else if(tab === 'roadmap') { if(typeof window.renderDevRoadmap === 'function') window.renderDevRoadmap(); }
}

export function devCardHTML(s) {
    var ki = s.dev_ki_analysen && s.dev_ki_analysen[0] ? s.dev_ki_analysen[0] : null;
    var votes = s.dev_votes ? s.dev_votes.length : 0;
    var hasVoted = s.dev_votes && _sbUser() ? s.dev_votes.some(function(v){return v.user_id===_sbUser().id;}) : false;
    var d = new Date(s.created_at).toLocaleDateString('de-DE');
    var h = '<div class="vit-card p-4 hover:shadow-md transition cursor-pointer" onclick="openDevDetail(\''+s.id+'\')">';
    h += '<div class="flex items-start space-x-3">';
    // Vote button
    h += '<div class="text-center flex-shrink-0"><button onclick="event.stopPropagation();toggleDevVote(\''+s.id+'\')" class="w-10 h-10 rounded-lg '+(hasVoted?'bg-vit-orange text-white':'bg-gray-100 text-gray-500 hover:bg-vit-orange/20')+' flex items-center justify-center text-sm font-bold transition">▲</button><span class="text-xs font-bold text-gray-700 block mt-0.5">'+votes+'</span></div>';
    // Content
    h += '<div class="flex-1 min-w-0">';
    h += '<div class="flex items-center flex-wrap gap-1.5 mb-1">';
    h += '<span class="text-xs font-semibold rounded px-2 py-0.5 '+_devStatusColors()[s.status]+'">'+_devStatusLabels()[s.status]+'</span>';
    // Typ-Badge: always show (bug/feature/idee)
    var _typ = s.ki_typ || (s.kategorie === 'feature' ? 'feature' : s.kategorie === 'bug' ? 'bug' : 'idee');
    var _typC = _typ==='bug'?'bg-red-100 text-red-700':_typ==='feature'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700';
    var _typI = _typ==='bug'?'🐛':_typ==='feature'?'✨':'💡';
    var _typLabel = _typ==='bug'?'Bug':_typ==='feature'?'Feature':'Idee';
    h += '<span class="text-[10px] font-semibold rounded px-1.5 py-0.5 '+_typC+'">'+_typI+' '+_typLabel+'</span>';
    // Einreicher prominent anzeigen
    var _subName = s.users && s.users.name ? s.users.name : '';
    if(_subName) h += '<span class="text-[10px] rounded px-1.5 py-0.5 bg-gray-50 text-gray-500">👤 '+_escH(_subName)+'</span>';
    if(s.ki_bereich) { h += '<span class="text-[10px] rounded px-1.5 py-0.5 '+(s.ki_bereich==='portal'?'bg-gray-100 text-gray-600':'bg-green-50 text-green-700')+'">'+(s.ki_bereich==='portal'?'💻':'🌐')+' '+s.ki_bereich+'</span>'; }
    h += '<span class="text-xs text-gray-400">'+(_devKatIcons()[s.kategorie]||'')+ ' '+s.kategorie+'</span>';
    if(s.geschaetzter_aufwand) h += '<span class="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 font-semibold">'+s.geschaetzter_aufwand+'</span>';
    if(s.bug_schwere) { var _bsC = s.bug_schwere==='kritisch'?'bg-red-200 text-red-800':s.bug_schwere==='mittel'?'bg-yellow-100 text-yellow-800':'bg-green-100 text-green-700'; h += '<span class="text-[10px] font-semibold rounded px-1.5 py-0.5 '+_bsC+'">'+(s.bug_schwere==='kritisch'?'🔴':s.bug_schwere==='mittel'?'🟡':'🟢')+' '+s.bug_schwere+'</span>'; }
    if(s.deadline) h += '<span class="text-[10px] bg-indigo-50 text-indigo-600 rounded px-1.5 py-0.5">📅 '+new Date(s.deadline).toLocaleDateString('de-DE')+'</span>';
    var _komCount = s.dev_kommentare ? s.dev_kommentare.filter(function(k){return k.typ==='kommentar';}).length : 0;
    if(_komCount > 0) h += '<span class="text-[10px] bg-gray-50 text-gray-500 rounded px-1.5 py-0.5">💬 '+_komCount+'</span>';
    h += '</div>';
    h += '<h3 class="font-semibold text-gray-800 text-sm truncate">'+(s.titel||'(Ohne Titel)')+'</h3>';
    if(ki && ki.zusammenfassung) h += '<p class="text-xs text-gray-500 mt-0.5 line-clamp-2">'+ki.zusammenfassung+'</p>';
    else if(s.beschreibung) h += '<p class="text-xs text-gray-500 mt-0.5 line-clamp-2">'+s.beschreibung+'</p>';
    // Score bar (nur HQ)
    var isHQ = (currentRoles||[]).indexOf('hq') !== -1;
    if(isHQ && ki && ki.vision_fit_score != null) {
        var score = ki.vision_fit_score;
        var barColor = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
        h += '<div class="flex items-center space-x-2 mt-2"><span class="text-[10px] text-gray-400 w-16">Vision-Fit</span><div class="flex-1 h-1.5 bg-gray-100 rounded-full"><div class="h-1.5 '+barColor+' rounded-full" style="width:'+score+'%"></div></div><span class="text-[10px] font-bold text-gray-600">'+score+'</span></div>';
    }
    // Submitter name (HQ sees all, Standort sees own name or "Partner-Idee")
    var isHQCard = (currentRoles||[]).indexOf('hq') !== -1;
    var submitterName = s.users && s.users.name ? s.users.name : '';
    var isOwn = _sbUser() && s.user_id === _sbUser().id;
    if(isHQCard && submitterName) h += '<span class="text-[10px] text-gray-400 mt-1 inline-block">👤 '+submitterName+' · '+d+'</span>';
    else if(!isHQCard && !isOwn) h += '<span class="text-[10px] text-gray-400 mt-1 inline-block">👤 Partner-Idee · '+d+'</span>';
    else h += '<span class="text-[10px] text-gray-400 mt-1 block">'+d+'</span>';
    // Last comment preview (skip KI messages for non-HQ)
    var _komms = s.dev_kommentare || [];
    var _userKomms = _komms.filter(function(k){return k.typ==='kommentar';});
    var _previewKomms = isHQCard ? _komms : _userKomms;
    if(_previewKomms.length > 0) {
        var _lastK = _previewKomms[_previewKomms.length - 1];
        var _kName = _lastK.users && _lastK.users.name ? _lastK.users.name : (_lastK.typ === 'ki_nachricht' ? ((currentRoles||[]).indexOf('hq')!==-1 ? '🤖 KI' : 'vit:bikes Team') : '');
        var _kText = (_lastK.inhalt || '').substring(0, 60);
        if(_lastK.inhalt && _lastK.inhalt.length > 60) _kText += '...';
        h += '<div class="flex items-center gap-1 mt-1 bg-gray-50 rounded px-2 py-1"><span class="text-[10px] text-gray-500 truncate">💬 <b>'+_kName+':</b> '+_kText+'</span></div>';
    }
    h += '</div></div></div>';
    return h;
}

export function renderDevMeine() {
    var c = document.getElementById('ideenTabMeine');
    if(!c) return;
    var isHQ = (currentRoles||[]).indexOf('hq') !== -1;
    var mine = isHQ ? _devSubs() : _devSubs().filter(function(s){ return s.user_id === (sbUser && _sbUser().id); });
    if(mine.length === 0) {
        c.innerHTML = '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-3">💡</p><p>Du hast noch keine Ideen eingereicht.</p><p class="text-sm mt-1">Klick oben auf "Feedback geben" um loszulegen!</p></div>';
        return;
    }
    c.innerHTML = '<div class="space-y-3">' + mine.map(devCardHTML).join('') + '</div>';
}

export function renderDevAlle() {
    var c = document.getElementById('ideenTabAlle');
    if(!c) return;
    var isHQ = (currentRoles||[]).indexOf('hq') !== -1;
    // HQ sees everything, partners see own + all public (im_ideenboard+)
    var visible = isHQ ? _devSubs() : _devSubs().filter(function(s) {
        return s.status !== 'abgelehnt' && s.status !== 'geparkt' && s.status !== 'ki_pruefung' && s.status !== 'neu';
    });
    if(visible.length === 0) {
        c.innerHTML = '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-3">🌐</p><p>Noch keine Ideen im System.</p></div>';
        return;
    }
    c.innerHTML = '<div class="space-y-3">' + visible.map(devCardHTML).join('') + '</div>';
}

export function renderDevBoard() {
    var c = document.getElementById('ideenTabBoard');
    if(!c) return;
    var isHQ = (currentRoles||[]).indexOf('hq') !== -1;
    // HQ sees all ideas that have a KI analysis and need a decision
    var boardItems = _devSubs().filter(function(s) {
        return ['konzept_erstellt','im_ideenboard','hq_rueckfragen','ki_rueckfragen'].indexOf(s.status) !== -1;
    });
    if(boardItems.length === 0) {
        c.innerHTML = '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-3">🎯</p><p>Keine Ideen warten auf HQ-Entscheidung.</p></div>';
        return;
    }
    var h = '';
    // Group: Needs HQ decision vs waiting on user
    var needsDecision = boardItems.filter(function(s){ return ['konzept_erstellt','im_ideenboard'].indexOf(s.status) !== -1; });
    var waitingUser = boardItems.filter(function(s){ return s.status === 'ki_rueckfragen'; });
    var waitingHQ = boardItems.filter(function(s){ return s.status === 'hq_rueckfragen'; });

    if(needsDecision.length > 0) {
        h += '<h3 class="text-sm font-bold text-gray-500 uppercase mb-2 mt-2">📋 Bereit zur Entscheidung ('+needsDecision.length+')</h3>';
        h += '<div class="space-y-3 mb-6">';
        needsDecision.forEach(function(s) { h += devBoardCardHTML(s, isHQ); });
        h += '</div>';
    }
    if(waitingHQ.length > 0) {
        h += '<h3 class="text-sm font-bold text-gray-500 uppercase mb-2">❓ Warten auf HQ-Antwort ('+waitingHQ.length+')</h3>';
        h += '<div class="space-y-3 mb-6">';
        waitingHQ.forEach(function(s) { h += devBoardCardHTML(s, isHQ); });
        h += '</div>';
    }
    if(waitingUser.length > 0) {
        h += '<h3 class="text-sm font-bold text-gray-500 uppercase mb-2">⏳ Warten auf User-Antwort ('+waitingUser.length+')</h3>';
        h += '<div class="space-y-3 opacity-70">';
        waitingUser.forEach(function(s) { h += devBoardCardHTML(s, false); });
        h += '</div>';
    }
    c.innerHTML = h;
}

export function devBoardCardHTML(s, showActions) {
    var ki = s.dev_ki_analysen && s.dev_ki_analysen[0] ? s.dev_ki_analysen[0] : null;
    var votes = s.dev_votes ? s.dev_votes.length : 0;
    var h = '<div class="vit-card p-5 border-l-4 '+(s.status==='konzept_erstellt'||s.status==='im_ideenboard'?'border-vit-orange':'border-yellow-400')+'">';
    h += '<div class="flex items-start justify-between">';
    h += '<div class="flex-1 cursor-pointer" onclick="openDevDetail(\''+s.id+'\')">';
    h += '<div class="flex items-center gap-2 mb-1 flex-wrap"><span class="text-xs font-semibold rounded px-2 py-0.5 '+_devStatusColors()[s.status]+'">'+_devStatusLabels()[s.status]+'</span>';
    var _bt = s.ki_typ || (s.kategorie === 'feature' ? 'feature' : s.kategorie === 'bug' ? 'bug' : 'idee');
    var _tC = _bt==='bug'?'bg-red-100 text-red-700':_bt==='feature'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'; var _tI = _bt==='bug'?'🐛':_bt==='feature'?'✨':'💡'; var _tL = _bt==='bug'?'Bug':_bt==='feature'?'Feature':'Idee';
    h += '<span class="text-xs font-semibold rounded px-1.5 py-0.5 '+_tC+'">'+_tI+' '+_tL+'</span>';
    var _bName = s.users && s.users.name ? s.users.name : ''; if(_bName) h += '<span class="text-[10px] rounded px-1.5 py-0.5 bg-gray-50 text-gray-500">👤 '+_escH(_bName)+'</span>';
    if(s.ki_bereich) { h += '<span class="text-xs rounded px-1.5 py-0.5 '+(s.ki_bereich==='portal'?'bg-gray-100 text-gray-600':'bg-green-50 text-green-700')+'">'+(s.ki_bereich==='portal'?'💻':'🌐')+' '+s.ki_bereich+'</span>'; }
    if(ki && ki.machbarkeit) h += '<span class="text-xs bg-gray-100 rounded px-1.5 py-0.5">Machbarkeit: <b>'+ki.machbarkeit+'</b></span>';
    if(ki && ki.vision_fit_score) h += '<span class="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5">Vision: <b>'+ki.vision_fit_score+'/100</b></span>';
    if(ki && ki.aufwand_schaetzung) h += '<span class="text-xs bg-gray-100 rounded px-1.5 py-0.5">Aufwand: <b>'+ki.aufwand_schaetzung+'</b></span>';
    if(votes > 0) h += '<span class="text-xs bg-orange-50 text-orange-600 rounded px-1.5 py-0.5">▲ '+votes+'</span>';
    var _bKom = s.dev_kommentare ? s.dev_kommentare.filter(function(k){return k.typ==='kommentar';}).length : 0;
    if(_bKom > 0) h += '<span class="text-xs bg-gray-50 text-gray-500 rounded px-1.5 py-0.5">💬 '+_bKom+'</span>';
    h += '</div>';
    h += '<h3 class="font-semibold text-gray-800">'+(s.titel||'(Ohne Titel)')+'</h3>';
    if(ki && ki.zusammenfassung) h += '<p class="text-sm text-gray-500 mt-1 line-clamp-2">'+ki.zusammenfassung+'</p>';
    h += '</div>';
    if(showActions) {
        var _isOwner = (currentRoles||[]).indexOf('owner') !== -1;
        h += '<div class="flex flex-col space-y-1 ml-4 flex-shrink-0">';
        if(_isOwner) h += '<button onclick="event.stopPropagation();devHQDecision(\''+s.id+'\',\'freigabe\')" class="px-3 py-1.5 bg-green-500 text-white rounded text-xs font-semibold hover:bg-green-600">✅ Freigeben</button>';
        h += '<button onclick="event.stopPropagation();devHQDecision(\''+s.id+'\',\'rueckfragen\')" class="px-3 py-1.5 bg-yellow-500 text-white rounded text-xs font-semibold hover:bg-yellow-600">❓ Rückfrage</button>';
        h += '<button onclick="event.stopPropagation();devHQDecision(\''+s.id+'\',\'spaeter\')" class="px-3 py-1.5 bg-gray-300 text-gray-700 rounded text-xs font-semibold hover:bg-gray-400">⏸ Später</button>';
        h += '<button onclick="event.stopPropagation();devHQDecision(\''+s.id+'\',\'geschlossen\')" class="px-3 py-1.5 bg-slate-200 text-slate-600 rounded text-xs font-semibold hover:bg-slate-300">🔒</button>';
        if(_isOwner) h += '<button onclick="event.stopPropagation();devHQDecision(\''+s.id+'\',\'ablehnung\')" class="px-3 py-1.5 bg-red-100 text-red-600 rounded text-xs font-semibold hover:bg-red-200">❌ Ablehnen</button>';
        h += '</div>';
    }
    h += '</div></div>';
    return h;
}

export function renderDevPlanung() {
    var c = document.getElementById('ideenTabPlanung');
    if(!c) return;
    var isHQ = (currentRoles||[]).indexOf('hq') !== -1;
    var planItems = _devSubs().filter(function(s) {
        return ['freigegeben','in_planung','in_entwicklung','beta_test','im_review','release_geplant','geparkt'].indexOf(s.status) !== -1;
    }).sort(function(a,b) { return (a.queue_position||9999) - (b.queue_position||9999); });

    // Apply "Mir zugewiesen" filter
    if((window._devState ? window._devState.filterMirZugewiesen : false) && _sbUser()) {
        var myId = _sbUser().id;
        planItems = planItems.filter(function(s) {
            return s.konzept_ma === myId || s.entwickler_ma === myId;
        });
    }

    if(planItems.length === 0) {
        c.innerHTML = '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-3">' + ((window._devState ? window._devState.filterMirZugewiesen : false) ? '👤' : '📅') + '</p><p>' + ((window._devState ? window._devState.filterMirZugewiesen : false) ? 'Dir sind noch keine Ideen zugewiesen.' : 'Noch keine freigegebenen Ideen in der Planung.') + '</p></div>';
        return;
    }

    // Group by status
    var groups = [
        { key: 'in_entwicklung', label: '🔨 In Entwicklung', items: [] },
        { key: 'beta_test', label: '🧪 Beta-Test', items: [] },
        { key: 'in_planung', label: '📅 In Planung', items: [] },
        { key: 'freigegeben', label: '✅ Freigegeben (noch nicht geplant)', items: [] },
        { key: 'im_review', label: '🔍 Im Review', items: [] },
        { key: 'release_geplant', label: '🚀 Release geplant', items: [] },
        { key: 'geparkt', label: '⏸ Geparkt', items: [] },
        { key: 'geschlossen', label: '🔒 Geschlossen', items: [] }
    ];
    planItems.forEach(function(s) {
        var g = groups.find(function(gr){ return gr.key === s.status; });
        if(g) g.items.push(s);
        else groups[2].items.push(s); // fallback to freigegeben
    });

    var h = '';
    // KI-Priorisierung Button + Filter (HQ only)
    if(isHQ) {
        h += '<div id="devPrioContainer" class="mb-6">';
        h += '<div class="flex items-center justify-between mb-3">';
        h += '<div>';
        h += '<h3 class="text-sm font-bold text-gray-500 uppercase">🤖 KI-Priorisierung</h3>';
        h += '<p class="text-xs text-gray-400">Welche Idee sollte HQ als nächstes bearbeiten?</p>';
        h += '</div>';
        h += '<div class="flex items-center gap-2">';
        h += '<button onclick="devToggleMirZugewiesen()" id="btnDevMirZugewiesen" class="px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition '+((window._devState ? window._devState.filterMirZugewiesen : false) ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')+'">';
        h += '<span>👤</span><span>Mir zugewiesen</span>';
        h += '</button>';
        h += '<button onclick="runDevKIPrioritize()" id="btnDevPrio" class="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-indigo-700 shadow-sm flex items-center gap-2">';
        h += '<span>🧠</span><span>Priorisierung starten</span>';
        h += '</button>';
        h += '</div>';
        h += '</div>';
        h += '<div id="devPrioResult" class="hidden"></div>';
        h += '</div>';
    }

    groups.forEach(function(group) {
        if(group.items.length === 0) return;
        h += '<div class="mb-6">';
        h += '<h3 class="text-sm font-bold text-gray-500 uppercase mb-2">'+group.label+' ('+group.items.length+')</h3>';
        h += '<div class="space-y-2">';
        group.items.forEach(function(s, i) {
            var ki = s.dev_ki_analysen && s.dev_ki_analysen[0] ? s.dev_ki_analysen[0] : null;
            h += '<div class="vit-card p-4 '+(s.status==='geparkt'?'opacity-60':'')+'">';
            h += '<div class="flex items-center space-x-3">';
            // Queue reorder (HQ only)
            if(isHQ) {
                h += '<div class="flex flex-col space-y-0.5 flex-shrink-0">';
                h += '<button onclick="moveDevQueue(\''+s.id+'\',-1)" class="text-gray-400 hover:text-gray-700 text-xs leading-none">▲</button>';
                h += '<button onclick="moveDevQueue(\''+s.id+'\',1)" class="text-gray-400 hover:text-gray-700 text-xs leading-none">▼</button>';
                h += '</div>';
            }
            // Content
            h += '<div class="flex-1 cursor-pointer" onclick="openDevDetail(\''+s.id+'\')">';
            h += '<div class="flex items-center gap-2 flex-wrap">';
            if(ki && ki.aufwand_schaetzung) h += '<span class="text-[10px] bg-gray-100 rounded px-1.5 py-0.5 font-semibold">'+ki.aufwand_schaetzung+'</span>';
            h += '<h3 class="font-semibold text-gray-800 text-sm">'+(s.titel||'(Ohne Titel)')+'</h3>';
            h += '</div>';
            // Meta info line
            var meta = [];
            if(s.ziel_release) meta.push('📅 '+s.ziel_release);
            if(s.verantwortlicher) meta.push('👤 Zugewiesen');
            if(meta.length) h += '<p class="text-xs text-gray-400 mt-0.5">'+meta.join(' · ')+'</p>';
            h += '</div>';
            // HQ inline actions
            if(isHQ) {
                h += '<div class="flex items-center gap-1 flex-shrink-0">';
                // Status change dropdown
                h += '<select onchange="updateDevPlanStatus(\''+s.id+'\',this.value)" class="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white">';
                var planStatuses = ['freigegeben','in_planung','in_entwicklung','beta_test','im_review','release_geplant','geparkt'];
                planStatuses.forEach(function(st) {
                    h += '<option value="'+st+'"'+(s.status===st?' selected':'')+'>'+_devStatusLabels()[st]+'</option>';
                });
                h += '</select>';
                // Deadline
                h += '<input type="text" placeholder="Q1/26" value="'+(s.ziel_release||'')+'" onchange="updateDevPlanField(\''+s.id+'\',\'ziel_release\',this.value)" class="text-xs border border-gray-200 rounded px-1.5 py-1 w-16 text-center" title="Ziel-Release">';
                h += '</div>';
            }
            h += '</div></div>';
        });
        h += '</div></div>';
    });
    c.innerHTML = h;
}

export async function updateDevPlanStatus(subId, newStatus) {
    try {
        await _sb().from('dev_submissions').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', subId);
        renderDevPipeline();
    } catch(err) { alert('Fehler: ' + (err.message||err)); }
}

export async function updateDevPlanField(subId, field, value) {
    try {
        var upd = { updated_at: new Date().toISOString() };
        upd[field] = value || null;
        await _sb().from('dev_submissions').update(upd).eq('id', subId);
        // Don't re-render, just update locally
        var s = _devSubs().find(function(s){return s.id===subId;});
        if(s) s[field] = value || null;
    } catch(err) { console.error('Update error:', err); }
}

const _exports = { showIdeenTab, renderDevPipeline, renderDevTab, devCardHTML, renderDevMeine, renderDevAlle, renderDevBoard, devBoardCardHTML, renderDevPlanung, updateDevPlanStatus, updateDevPlanField };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
