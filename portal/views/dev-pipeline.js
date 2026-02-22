/**
 * views/dev-pipeline.js - Dev Pipeline (Ideenboard 2.0) + Roadmap/Entwicklung
 * @module views/dev-pipeline
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }
function _sbUrl()        { return window.SUPABASE_URL || 'https://lwwagbkxeofahhwebkab.supabase.co'; }

// === DEV PIPELINE (Ideenboard 2.0) ===
var devSubmissions = [];
var devCurrentTab = 'meine';
var devInputType = 'text';
var devSelectedFiles = [];

// Recording state
var devMediaRecorder = null;
var devRecordedChunks = [];
var devRecordingTimer = null;
var devRecordingSeconds = 0;
var devScreenStream = null;
var devMicStream = null;

export function toggleDevSubmitForm() {
    var f = document.getElementById('devSubmitForm');
    if(!f) return;
    var isVisible = f.style.display === 'flex';
    if(isVisible) {
        f.style.display = 'none';
        f.classList.add('hidden');
        stopDevRecording();
    } else {
        f.classList.remove('hidden');
        f.style.display = 'flex';
    }
    // Populate module dropdown
    var sel = document.getElementById('devModul');
    if(sel && sel.tagName === 'SELECT' && sel.options.length <= 1) {
        Object.keys(sbModulStatus).forEach(function(k) {
            if(sbModulStatus[k] !== 'deaktiviert') {
                var o = document.createElement('option');
                o.value = k; o.textContent = k;
                sel.appendChild(o);
            }
        });
    }
}

export function setDevInputType(typ) {
    // Stop any active recording first
    stopDevRecording();

    devInputType = typ;
    document.querySelectorAll('.dev-input-type-btn').forEach(function(b) {
        var isActive = b.getAttribute('data-dit') === typ;
        b.className = 'dev-input-type-btn px-3 py-2 rounded-lg text-sm font-semibold ' + (isActive ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600');
    });

    // Show/hide recording areas
    var audioArea = document.getElementById('devAudioRecordArea');
    var screenArea = document.getElementById('devScreenRecordArea');
    if(audioArea) { if(typ === 'audio') audioArea.classList.remove('hidden'); else audioArea.classList.add('hidden'); }
    if(screenArea) { if(typ === 'video') screenArea.classList.remove('hidden'); else screenArea.classList.add('hidden'); }
}

// ---- AUDIO RECORDING ----
export async function toggleDevAudioRecord() {
    if(devMediaRecorder && devMediaRecorder.state === 'recording') {
        stopDevRecording();
        return;
    }
    try {
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        devMicStream = stream;
        devRecordedChunks = [];
        devMediaRecorder = new MediaRecorder(stream, { mimeType: getSupportedMimeType('audio') });
        devMediaRecorder.ondataavailable = function(e) { if(e.data.size > 0) devRecordedChunks.push(e.data); };
        devMediaRecorder.onstop = function() { finalizeDevAudioRecording(); };
        devMediaRecorder.start(1000);

        // UI
        var btn = document.getElementById('devAudioRecBtn');
        if(btn) { btn.textContent = '⏹'; btn.className = 'w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition text-xl animate-pulse'; }
        var statusEl = document.getElementById('devAudioStatus');
        if(statusEl) statusEl.textContent = '⏺ Aufnahme läuft...';
        startDevTimer('devAudioTimer');
    } catch(err) {
        alert('Mikrofon-Zugriff nicht möglich: ' + (err.message||err));
    }
}

export function finalizeDevAudioRecording() {
    var blob = new Blob(devRecordedChunks, { type: devRecordedChunks[0]?.type || 'audio/webm' });
    var file = new File([blob], 'Sprachaufnahme_' + Date.now() + '.webm', { type: blob.type });
    devSelectedFiles.push(file);
    updateDevFileList();

    // Show preview
    var preview = document.getElementById('devAudioPreview');
    var player = document.getElementById('devAudioPlayer');
    if(preview && player) {
        preview.style.display = '';
        player.src = URL.createObjectURL(blob);
    }

    // Reset UI
    var btn = document.getElementById('devAudioRecBtn');
    if(btn) { btn.textContent = '🎤'; btn.className = 'w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition text-xl'; }
    var statusEl = document.getElementById('devAudioStatus');
    if(statusEl) statusEl.textContent = '✅ Aufnahme gespeichert (' + Math.round(blob.size/1024) + ' KB)';
}

// ---- SCREEN RECORDING (mit optionalem Mikrofon) ----
export async function toggleDevScreenRecord() {
    if(devMediaRecorder && devMediaRecorder.state === 'recording') {
        stopDevRecording();
        return;
    }
    try {
        // Screen-Stream holen
        devScreenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: 'always' },
            audio: true  // System-Audio (falls Browser es unterstützt)
        });

        var tracks = [...devScreenStream.getTracks()];

        // Mikrofon-Audio dazumischen wenn gewünscht
        var withMic = document.getElementById('devScreenWithMic');
        if(withMic && withMic.checked) {
            try {
                devMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                tracks.push(...devMicStream.getAudioTracks());
            } catch(micErr) {
                console.warn('Mikrofon nicht verfügbar, fahre ohne fort:', micErr);
            }
        }

        // Kombinierten Stream erstellen
        var combinedStream = new MediaStream(tracks);
        devRecordedChunks = [];
        devMediaRecorder = new MediaRecorder(combinedStream, { mimeType: getSupportedMimeType('video') });
        devMediaRecorder.ondataavailable = function(e) { if(e.data.size > 0) devRecordedChunks.push(e.data); };
        devMediaRecorder.onstop = function() { finalizeDevScreenRecording(); };

        // Wenn der Nutzer den Screen-Share stoppt (über Browser-UI)
        devScreenStream.getVideoTracks()[0].onended = function() {
            stopDevRecording();
        };

        devMediaRecorder.start(1000);

        // UI
        var btn = document.getElementById('devScreenRecBtn');
        if(btn) { btn.textContent = '⏹'; btn.className = 'w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition text-xl animate-pulse'; }
        var statusEl = document.getElementById('devScreenStatus');
        if(statusEl) statusEl.textContent = '⏺ Bildschirmaufnahme läuft...';
        startDevTimer('devScreenTimer');
    } catch(err) {
        if(err.name === 'NotAllowedError') {
            // Nutzer hat abgebrochen – kein Fehler
            console.log('Screen recording cancelled by user');
        } else {
            alert('Bildschirmaufnahme nicht möglich: ' + (err.message||err));
        }
    }
}

export function finalizeDevScreenRecording() {
    var mimeType = devRecordedChunks[0]?.type || 'video/webm';
    var blob = new Blob(devRecordedChunks, { type: mimeType });
    var ext = mimeType.includes('mp4') ? '.mp4' : '.webm';
    var file = new File([blob], 'Bildschirmaufnahme_' + Date.now() + ext, { type: blob.type });
    devSelectedFiles.push(file);
    updateDevFileList();

    // Show video preview
    var preview = document.getElementById('devScreenPreview');
    var player = document.getElementById('devScreenPlayer');
    if(preview && player) {
        preview.style.display = '';
        player.src = URL.createObjectURL(blob);
    }

    // Reset UI
    var btn = document.getElementById('devScreenRecBtn');
    if(btn) { btn.textContent = '🖥️'; btn.className = 'w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center hover:bg-purple-600 transition text-xl'; }
    var statusEl = document.getElementById('devScreenStatus');
    if(statusEl) statusEl.textContent = '✅ Aufnahme gespeichert (' + Math.round(blob.size/1024/1024*10)/10 + ' MB)';
}

// ---- RECORDING HELPERS ----
export function stopDevRecording() {
    if(devMediaRecorder && devMediaRecorder.state === 'recording') {
        devMediaRecorder.stop();
    }
    if(devScreenStream) { devScreenStream.getTracks().forEach(function(t){ t.stop(); }); devScreenStream = null; }
    if(devMicStream) { devMicStream.getTracks().forEach(function(t){ t.stop(); }); devMicStream = null; }
    stopDevTimer();
}

export function getSupportedMimeType(kind) {
    var types = kind === 'audio'
        ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4']
        : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    for(var i = 0; i < types.length; i++) {
        if(MediaRecorder.isTypeSupported(types[i])) return types[i];
    }
    return '';
}

export function startDevTimer(elId) {
    devRecordingSeconds = 0;
    stopDevTimer();
    devRecordingTimer = setInterval(function() {
        devRecordingSeconds++;
        var min = Math.floor(devRecordingSeconds / 60).toString().padStart(2,'0');
        var sec = (devRecordingSeconds % 60).toString().padStart(2,'0');
        var el = document.getElementById(elId);
        if(el) el.textContent = min + ':' + sec;
    }, 1000);
}

export function stopDevTimer() {
    if(devRecordingTimer) { clearInterval(devRecordingTimer); devRecordingTimer = null; }
}

export function updateDevFileList() {
    var listEl = document.getElementById('devFileList');
    if(listEl) {
        listEl.innerHTML = devSelectedFiles.map(function(f, i) {
            var sizeStr = f.size > 1024*1024 ? (Math.round(f.size/1024/1024*10)/10+' MB') : (Math.round(f.size/1024)+' KB');
            var icon = f.type.startsWith('audio') ? '🎤' : f.type.startsWith('video') ? '🖥️' : '📎';
            return '<div class="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-xs"><span>'+icon+' '+f.name+' ('+sizeStr+')</span><button onclick="devSelectedFiles.splice('+i+',1);updateDevFileList()" class="text-red-400 hover:text-red-600 ml-2">✕</button></div>';
        }).join('');
    }
}

export function handleDevFileSelect(e) {
    var files = Array.from(e.target.files || []);
    devSelectedFiles = devSelectedFiles.concat(files);
    updateDevFileList();
}

// ============================================
// ENTWICKLUNG V2 — Unified View Logic
// ============================================
var entwCurrentTab = 'ideen';

export async function renderEntwicklung() {
    var isHQ = (currentRoles||[]).indexOf('hq') !== -1;
    var isOwner = (currentRoles||[]).indexOf('owner') !== -1;

    // Add notification bell to header (once)
    // Show/hide HQ-only tabs
    document.querySelectorAll('.entw-hq-tab, .entw-hq-sep').forEach(function(el) {
        el.style.display = isHQ ? '' : 'none';
    });
    // Dynamic Vision tab (Owner only)
    var tabNav = document.getElementById('entwicklungTabs');
    var existingVisionBtn = document.getElementById('entwVisionTabBtn');
    if(isOwner && tabNav && !existingVisionBtn) {
        var vBtn = document.createElement('button');
        vBtn.id = 'entwVisionTabBtn';
        vBtn.className = 'entw-tab-btn entw-hq-tab px-4 py-2 rounded-md text-sm font-semibold text-gray-500 whitespace-nowrap';
        vBtn.setAttribute('data-etab', 'vision');
        vBtn.textContent = '🔭 Vision';
        vBtn.onclick = function(){ showEntwicklungTab('vision'); };
        tabNav.appendChild(vBtn);
        // Also create the tab content container
        var vContainer = document.createElement('div');
        vContainer.id = 'entwTabVision';
        vContainer.className = 'entw-tab-content';
        vContainer.style.display = 'none';
        var parentContainer = document.querySelector('#entwicklungView');
        if(parentContainer) parentContainer.appendChild(vContainer);
    }
    if(existingVisionBtn) existingVisionBtn.style.display = isOwner ? '' : 'none';
    // Load data based on current tab
    showEntwicklungTab(entwCurrentTab);
}

export function showEntwicklungTab(tab) {
    entwCurrentTab = tab;
    // Update tab buttons
    document.querySelectorAll('.entw-tab-btn').forEach(function(b) {
        var isActive = b.getAttribute('data-etab') === tab;
        b.className = 'entw-tab-btn px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap ' + 
            (isActive ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500') +
            (b.classList.contains('entw-hq-tab') ? ' entw-hq-tab' : '');
    });
    // Hide all tab contents
    document.querySelectorAll('.entw-tab-content').forEach(function(c) { c.style.display = 'none'; });
    // Show target tab
    var targetId = 'entwTab' + tab.charAt(0).toUpperCase() + tab.slice(1);
    var target = document.getElementById(targetId);
    if(target) target.style.display = '';
    // Render tab content
    renderEntwTabContent(tab);
}

export async function renderEntwTabContent(tab) {
    if(tab === 'ideen') {
        await loadDevSubmissions();
        renderEntwIdeen();
    } else if(tab === 'module') {
        renderModulStatus();
    } else if(tab === 'releases') {
        await renderEntwReleases();
    } else if(tab === 'steuerung') {
        await renderEntwSteuerung();
    } else if(tab === 'flags') {
        await renderEntwFlags();
    } else if(tab === 'nutzung') {
        await renderEntwNutzung();
    } else if(tab === 'system') {
        await renderEntwSystem();
    } else if(tab === 'vision') {
        await renderDevVision();
    }
}

export async function loadDevSubmissions(force) {
    try {
        var query = _sb().from('dev_submissions').select('*, users!dev_submissions_user_id_public_fkey(name), dev_ki_analysen(zusammenfassung, vision_fit_score, machbarkeit, aufwand_schaetzung, bug_schwere, deadline_vorschlag, deadline_begruendung), dev_votes(user_id), dev_kommentare(id, typ, inhalt, created_at, users!dev_kommentare_user_id_public_fkey(name))').order('created_at', {ascending: false});
        var resp = await query;
        if(resp.error) throw resp.error;
        devSubmissions = resp.data || [];
    } catch(err) {
        console.error('DevSubmissions load:', err);
        devSubmissions = [];
    }
    // Render actionable KPIs into entwStatsBar
    var bar = document.getElementById('entwStatsBar');
    if(bar) {
        var eingang = devSubmissions.filter(function(s){ return ['neu','ki_pruefung'].indexOf(s.status) !== -1; }).length;
        var warten = devSubmissions.filter(function(s){ return ['ki_rueckfragen','hq_rueckfragen'].indexOf(s.status) !== -1; }).length;
        var aktiv = devSubmissions.filter(function(s){ return ['in_entwicklung','beta_test','im_review'].indexOf(s.status) !== -1; }).length;
        var done = devSubmissions.filter(function(s){ return s.status === 'ausgerollt'; }).length;
        var bugs = devSubmissions.filter(function(s){ return s.ki_typ === 'bug' && ['abgelehnt','ausgerollt','geparkt'].indexOf(s.status) === -1; }).length;
        var week = devSubmissions.filter(function(s){ return (Date.now() - new Date(s.created_at).getTime()) < 7*86400000; }).length;
        var total = devSubmissions.length;
        var kh = '<div class="grid grid-cols-3 md:grid-cols-7 gap-2 mb-4">';
        kh += '<div class="vit-card p-2 text-center'+(eingang>3?' ring-2 ring-red-300':'')+'">';
        kh += '<p class="text-lg font-bold '+(eingang>3?'text-red-600':'text-gray-800')+'">'+eingang+'</p>';
        kh += '<p class="text-[9px] text-gray-500">📥 Eingang</p></div>';
        kh += '<div class="vit-card p-2 text-center'+(warten>0?' ring-2 ring-yellow-300':'')+'">';
        kh += '<p class="text-lg font-bold '+(warten>0?'text-yellow-600':'text-gray-800')+'">'+warten+'</p>';
        kh += '<p class="text-[9px] text-gray-500">⏳ Warten</p></div>';
        kh += '<div class="vit-card p-2 text-center"><p class="text-lg font-bold text-blue-600">'+aktiv+'</p>';
        kh += '<p class="text-[9px] text-gray-500">🔨 In Arbeit</p></div>';
        kh += '<div class="vit-card p-2 text-center"><p class="text-lg font-bold text-green-600">'+done+'</p>';
        kh += '<p class="text-[9px] text-gray-500">✅ Umgesetzt</p></div>';
        kh += '<div class="vit-card p-2 text-center'+(bugs>0?' ring-2 ring-red-300':'')+'">';
        kh += '<p class="text-lg font-bold '+(bugs>0?'text-red-600 animate-pulse':'text-gray-800')+'">'+bugs+'</p>';
        kh += '<p class="text-[9px] text-gray-500">🔴 Bugs</p></div>';
        kh += '<div class="vit-card p-2 text-center"><p class="text-lg font-bold text-purple-600">'+week+'</p>';
        kh += '<p class="text-[9px] text-gray-500">📈 Woche</p></div>';
        kh += '<div class="vit-card p-2 text-center cursor-pointer hover:shadow-md" onclick="exportDevCSV()">';
        kh += '<p class="text-lg font-bold text-gray-600">'+total+'</p>';
        kh += '<p class="text-[9px] text-gray-500">📥 Gesamt</p></div>';
        kh += '</div>';
        bar.innerHTML = kh;
    }
}

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

    var items = devSubmissions.filter(function(s) {
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
    if(countEl) countEl.textContent = items.length + ' von ' + devSubmissions.length + ' Einträgen';

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
        var statusLabel = devStatusLabels[s.status] || s.status;
        var statusColor = devStatusColors[s.status] || 'bg-gray-100 text-gray-600';

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
        var resp = await _sb().from('dev_release_docs').select('*, dev_submissions(titel, status)').eq('freigegeben', true).order('created_at', {ascending: false});
        var docs = resp.data || [];
        var respP = await _sb().from('dev_release_docs').select('*, dev_submissions(titel, status)').eq('freigegeben', false).order('created_at', {ascending: false});
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
            h += '<div class="flex justify-end gap-2">';
            h += '<button onclick="document.getElementById(\'devCreateReleaseForm\').classList.add(\'hidden\')" class="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Abbrechen</button>';
            h += '<button onclick="devSaveRelease()" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">💾 Veröffentlichen</button>';
            h += '</div></div>';
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
                h += '</div></div></div>';
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
    } catch(err) { c.innerHTML = '<div class="text-center py-8 text-red-400">Fehler: '+err.message+'</div>'; }
}

export async function renderEntwSteuerung() {
    var c = document.getElementById('entwSteuerungContent');
    if(!c) return;
    await loadDevSubmissions();

    var h = '';

    // Kanban board for HQ (6 Spalten lt. Plan)
    var columns = [
        {key:'neu', label:'📥 Eingang', statuses:['neu','ki_pruefung','ki_rueckfragen','konzept_erstellt','konzept_wird_erstellt'], color:'blue'},
        {key:'board', label:'🎯 Ideenboard', statuses:['im_ideenboard','hq_rueckfragen'], color:'purple'},
        {key:'plan', label:'📅 Planung', statuses:['freigegeben','in_planung'], color:'teal'},
        {key:'dev', label:'🔨 Entwicklung', statuses:['in_entwicklung','beta_test','im_review','release_geplant'], color:'yellow'},
        {key:'done', label:'✅ Umgesetzt', statuses:['ausgerollt'], color:'green'},
        {key:'parked', label:'⏸ Geparkt', statuses:['geparkt'], color:'gray'},
        {key:'rejected', label:'❌ Abgelehnt', statuses:['abgelehnt'], color:'red'},
        {key:'closed', label:'🔒 Geschlossen', statuses:['geschlossen'], color:'slate'}
    ];
    h += '<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3" style="min-height:400px">';
    columns.forEach(function(col) {
        var items = devSubmissions.filter(function(s) { return col.statuses.indexOf(s.status) !== -1; });
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
        h += '<div class="bg-gray-50 rounded-xl p-3">';
        h += '<div class="flex items-center justify-between mb-3"><h3 class="text-sm font-bold text-gray-700">'+col.label+'</h3><span class="text-xs bg-'+col.color+'-100 text-'+col.color+'-700 rounded-full px-2 py-0.5 font-semibold">'+items.length+'</span></div>';
        h += '<div class="space-y-2 max-h-[600px] overflow-y-auto">';
        items.forEach(function(s) {
            var statusLabel = devStatusLabels[s.status] || s.status;
            h += '<div class="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition" onclick="openDevDetail(\''+s.id+'\')">';
            h += '<p class="text-xs font-semibold text-gray-800 mb-1 line-clamp-2">'+(s.titel||s.beschreibung||s.kurz_notiz||s.transkription||'Kein Titel').substring(0,60)+'</p>';
            h += '<div class="flex items-center gap-1 flex-wrap">';
            h += '<span class="text-[9px] rounded px-1.5 py-0.5 '+(devStatusColors[s.status]||'bg-gray-100 text-gray-600')+'">'+statusLabel+'</span>';
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
    } catch(err) { c.innerHTML = '<div class="text-center py-8 text-red-400">Fehler: '+err.message+'</div>'; }
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
    } catch(err) { var bc2=document.getElementById('entwBackupContent'); if(bc2) bc2.innerHTML='<div class="text-red-400 text-sm">'+err.message+'</div>'; }
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
        c.innerHTML = '<div class="text-center py-8"><p class="text-red-400 text-sm">Fehler beim Laden: '+err.message+'</p></div>';
        console.error('renderEntwNutzung error:', err);
    }
}

export function showIdeenTab(tab) {
    devCurrentTab = tab;
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
        devSubmissions = resp.data || [];
    } catch(err) {
        console.error('DevPipeline load:', err);
        devSubmissions = [];
    }

    // Update stats
    var total = devSubmissions.length;
    var neu = devSubmissions.filter(function(s){ return ['neu','ki_pruefung','ki_rueckfragen','konzept_erstellt','konzept_wird_erstellt'].indexOf(s.status) !== -1; }).length;
    var board = devSubmissions.filter(function(s){ return ['im_ideenboard','hq_rueckfragen'].indexOf(s.status) !== -1; }).length;
    var dev = devSubmissions.filter(function(s){ return ['freigegeben','in_planung','in_entwicklung','beta_test','im_review','release_geplant'].indexOf(s.status) !== -1; }).length;
    var done = devSubmissions.filter(function(s){ return s.status === 'ausgerollt'; }).length;

    var e1=document.getElementById('devStatTotal');if(e1)e1.textContent=total;
    var e2=document.getElementById('devStatNeu');if(e2)e2.textContent=neu;
    var e3=document.getElementById('devStatBoard');if(e3)e3.textContent=board;
    var e4=document.getElementById('devStatDev');if(e4)e4.textContent=dev;
    var e5=document.getElementById('devStatDone');if(e5)e5.textContent=done;

    renderDevTab(devCurrentTab);
}

export function renderDevTab(tab) {
    if(tab === 'meine') renderDevMeine();
    else if(tab === 'alle') renderDevAlle();
    else if(tab === 'board') renderDevBoard();
    else if(tab === 'planung') renderDevPlanung();
    else if(tab === 'roadmap') renderDevRoadmap();
}

var devStatusLabels = {
    neu:'Neu eingereicht', ki_pruefung:'⏳ Wird geprüft...', ki_rueckfragen:'❓ Rückfragen',
    konzept_erstellt:'📋 Konzept fertig', konzept_wird_erstellt:'⏳ Konzept wird erstellt...', im_ideenboard:'🎯 Im Ideenboard', hq_rueckfragen:'❓ Rückfragen',
    freigegeben:'✅ Freigegeben', in_planung:'📅 In Planung', in_entwicklung:'🔨 In Entwicklung',
    beta_test:'🧪 Beta-Test', im_review:'🔍 Im Review', release_geplant:'🚀 Release geplant', ausgerollt:'✅ Ausgerollt',
    abgelehnt:'❌ Abgelehnt', geparkt:'⏸ Geparkt', geschlossen:'🔒 Geschlossen'
};
var devStatusColors = {
    neu:'bg-blue-100 text-blue-700', ki_pruefung:'bg-purple-100 text-purple-700 animate-pulse',
    ki_rueckfragen:'bg-yellow-100 text-yellow-700', konzept_erstellt:'bg-indigo-100 text-indigo-700', konzept_wird_erstellt:'bg-purple-100 text-purple-700',
    im_ideenboard:'bg-orange-100 text-orange-700', hq_rueckfragen:'bg-yellow-100 text-yellow-700',
    freigegeben:'bg-green-100 text-green-700', in_planung:'bg-teal-100 text-teal-700',
    in_entwicklung:'bg-blue-100 text-blue-700', beta_test:'bg-pink-100 text-pink-700',
    im_review:'bg-purple-100 text-purple-700',
    release_geplant:'bg-orange-100 text-orange-700', ausgerollt:'bg-green-100 text-green-700',
    abgelehnt:'bg-red-100 text-red-700', geparkt:'bg-gray-100 text-gray-600'
, geschlossen:'bg-slate-100 text-slate-600'
};
var devKatIcons = {bug:'🐛',verbesserung:'🔧',feature:'🚀',prozess:'📋',sonstiges:'💬'};

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
    h += '<span class="text-xs font-semibold rounded px-2 py-0.5 '+devStatusColors[s.status]+'">'+devStatusLabels[s.status]+'</span>';
    if(s.ki_typ) { var _typC = s.ki_typ==='bug'?'bg-red-100 text-red-700':s.ki_typ==='feature'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'; var _typI = s.ki_typ==='bug'?'🐛':s.ki_typ==='feature'?'✨':'💡'; h += '<span class="text-[10px] font-semibold rounded px-1.5 py-0.5 '+_typC+'">'+_typI+' '+s.ki_typ+'</span>'; }
    if(s.ki_bereich) { h += '<span class="text-[10px] rounded px-1.5 py-0.5 '+(s.ki_bereich==='portal'?'bg-gray-100 text-gray-600':'bg-green-50 text-green-700')+'">'+(s.ki_bereich==='portal'?'💻':'🌐')+' '+s.ki_bereich+'</span>'; }
    h += '<span class="text-xs text-gray-400">'+(devKatIcons[s.kategorie]||'')+ ' '+s.kategorie+'</span>';
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
    var mine = isHQ ? devSubmissions : devSubmissions.filter(function(s){ return s.user_id === (sbUser && _sbUser().id); });
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
    var visible = isHQ ? devSubmissions : devSubmissions.filter(function(s) { 
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
    var boardItems = devSubmissions.filter(function(s) {
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
    h += '<div class="flex items-center gap-2 mb-1 flex-wrap"><span class="text-xs font-semibold rounded px-2 py-0.5 '+devStatusColors[s.status]+'">'+devStatusLabels[s.status]+'</span>';
    if(s.ki_typ) { var _tC = s.ki_typ==='bug'?'bg-red-100 text-red-700':s.ki_typ==='feature'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'; var _tI = s.ki_typ==='bug'?'🐛':s.ki_typ==='feature'?'✨':'💡'; h += '<span class="text-xs font-semibold rounded px-1.5 py-0.5 '+_tC+'">'+_tI+' '+s.ki_typ+'</span>'; }
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
    var planItems = devSubmissions.filter(function(s) {
        return ['freigegeben','in_planung','in_entwicklung','beta_test','im_review','release_geplant','geparkt'].indexOf(s.status) !== -1;
    }).sort(function(a,b) { return (a.queue_position||9999) - (b.queue_position||9999); });
    if(planItems.length === 0) {
        c.innerHTML = '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-3">📅</p><p>Noch keine freigegebenen Ideen in der Planung.</p></div>';
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
    // KI-Priorisierung Button (HQ only)
    if(isHQ) {
        h += '<div id="devPrioContainer" class="mb-6">';
        h += '<div class="flex items-center justify-between mb-3">';
        h += '<div>';
        h += '<h3 class="text-sm font-bold text-gray-500 uppercase">🤖 KI-Priorisierung</h3>';
        h += '<p class="text-xs text-gray-400">Welche Idee sollte HQ als nächstes bearbeiten?</p>';
        h += '</div>';
        h += '<button onclick="runDevKIPrioritize()" id="btnDevPrio" class="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-indigo-700 shadow-sm flex items-center gap-2">';
        h += '<span>🧠</span><span>Priorisierung starten</span>';
        h += '</button>';
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
                    h += '<option value="'+st+'"'+(s.status===st?' selected':'')+'>'+devStatusLabels[st]+'</option>';
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
        var s = devSubmissions.find(function(s){return s.id===subId;});
        if(s) s[field] = value || null;
    } catch(err) { console.error('Update error:', err); }
}

// === ROADMAP / ENTWICKLUNG TAB ===
var devRoadmapItems = [];
var devRoadmapFilter = 'alle';

export async function renderDevRoadmap() {
    var c = document.getElementById('ideenTabRoadmap');
    if(!c) return;

    // Load roadmap items
    try {
        var resp = await _sb().from('dev_roadmap').select('*').order('sortierung');
        if(resp.error) throw resp.error;
        devRoadmapItems = resp.data || [];
    } catch(err) {
        console.error('Roadmap load:', err);
        devRoadmapItems = [];
    }

    var isHQ = (currentRoles||[]).indexOf('hq') !== -1;
    var items = devRoadmapItems;

    // Stats
    var total = items.length;
    var done = items.filter(function(r){ return r.status === 'ausgerollt'; }).length;
    var active = items.filter(function(r){ return r.status === 'in_entwicklung' || r.status === 'im_review'; }).length;
    var planned = items.filter(function(r){ return r.status === 'geplant'; }).length;

    // Quartale ermitteln
    var quartale = [];
    items.forEach(function(r) {
        if(r.ziel_quartal && quartale.indexOf(r.ziel_quartal) === -1) quartale.push(r.ziel_quartal);
    });
    quartale.sort();

    var h = '';

    // Header mit Stats (klickbar als Filter - ersetzt die separate Filter-Zeile)
    h += '<div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">';
    var statCards = [
        {filter:'alle', val:total, color:'text-gray-800', label:'Gesamt'},
        {filter:'geplant', val:planned, color:'text-gray-500', label:'Geplant 📅'},
        {filter:'in_entwicklung', val:active, color:'text-blue-600', label:'In Arbeit 🔨'},
        {filter:'ausgerollt', val:done, color:'text-green-600', label:'Ausgerollt ✅'},
        {filter:'verschoben', val:items.filter(function(r){ return r.status === 'verschoben'; }).length, color:'text-gray-400', label:'Verschoben ⏸'}
    ];
    statCards.forEach(function(sc) {
        var isActive = devRoadmapFilter === sc.filter;
        var toggleTo = (sc.filter === devRoadmapFilter && sc.filter !== 'alle') ? 'alle' : sc.filter;
        h += '<div onclick="devRoadmapFilter=\''+toggleTo+'\';renderDevRoadmap()" class="vit-card p-3 text-center cursor-pointer transition-all '+(isActive && sc.filter!=='alle'?'ring-2 ring-vit-orange bg-orange-50':'hover:shadow-md')+'"><p class="text-xl font-bold '+sc.color+'">'+sc.val+'</p><p class="text-[10px] text-gray-500">'+sc.label+'</p></div>';
    });
    h += '</div>';

    // Progress bar
    var pct = total > 0 ? Math.round(done / total * 100) : 0;
    h += '<div class="mb-6"><div class="flex items-center justify-between mb-1"><span class="text-xs font-semibold text-gray-600">Gesamtfortschritt</span><span class="text-xs font-bold text-gray-800">'+pct+'%</span></div>';
    h += '<div class="h-3 bg-gray-100 rounded-full overflow-hidden"><div class="h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all" style="width:'+pct+'%"></div></div></div>';

    // Gruppiert nach Quartal
    quartale.forEach(function(q) {
        var qItems = items.filter(function(r) {
            if(devRoadmapFilter !== 'alle' && r.status !== devRoadmapFilter) return false;
            return r.ziel_quartal === q;
        });
        if(qItems.length === 0) return;

        var qDone = qItems.filter(function(r){ return r.status === 'ausgerollt'; }).length;
        var qPct = Math.round(qDone / qItems.length * 100);

        h += '<div class="mb-6">';
        h += '<div class="flex items-center justify-between mb-3">';
        h += '<h3 class="text-sm font-bold text-gray-800">📅 '+q+'</h3>';
        h += '<div class="flex items-center space-x-2"><div class="w-24 h-1.5 bg-gray-100 rounded-full"><div class="h-1.5 bg-green-500 rounded-full" style="width:'+qPct+'%"></div></div><span class="text-[10px] text-gray-500">'+qDone+'/'+qItems.length+'</span></div>';
        h += '</div>';

        h += '<div class="space-y-2">';
        qItems.forEach(function(r) {
            var statusIcons = {geplant:'📅',in_entwicklung:'🔨',im_review:'🔍',ausgerollt:'✅',verschoben:'⏸'};
            var statusColors = {geplant:'bg-gray-100 text-gray-600',in_entwicklung:'bg-blue-100 text-blue-700',im_review:'bg-purple-100 text-purple-700',ausgerollt:'bg-green-100 text-green-700',verschoben:'bg-gray-100 text-gray-400'};
            var prioColors = {kritisch:'text-red-600',hoch:'text-orange-500',mittel:'text-yellow-600',niedrig:'text-green-600'};
            var katIcons = {feature:'🚀',verbesserung:'🔧',bugfix:'🐛',infrastruktur:'⚙️',sicherheit:'🔒',performance:'⚡',design:'🎨'};

            h += '<div class="vit-card p-3 flex items-center space-x-3 '+(r.status==='ausgerollt'?'opacity-60':'')+'">';
            h += '<span class="text-lg">'+(statusIcons[r.status]||'📋')+'</span>';
            h += '<div class="flex-1 min-w-0">';
            h += '<div class="flex items-center flex-wrap gap-1.5">';
            h += '<span class="text-xs font-semibold rounded px-2 py-0.5 '+(statusColors[r.status]||'bg-gray-100 text-gray-600')+'">'+r.status.replace('_',' ')+'</span>';
            h += '<span class="text-[10px] '+(prioColors[r.prioritaet]||'text-gray-500')+' font-semibold">●</span>';
            if(r.aufwand) h += '<span class="text-[10px] bg-gray-100 rounded px-1.5 py-0.5 font-semibold text-gray-600">'+r.aufwand+'</span>';
            h += '<span class="text-[10px] text-gray-400">'+(katIcons[r.kategorie]||'')+'</span>';
            h += '</div>';
            h += '<h4 class="font-semibold text-sm text-gray-800 '+(r.status==='ausgerollt'?'line-through':'')+'">'+ r.titel+'</h4>';
            if(r.beschreibung) h += '<p class="text-xs text-gray-500 truncate">'+r.beschreibung+'</p>';
            if(r.submission_id) h += '<span onclick="event.stopPropagation();openDevDetail(\''+r.submission_id+'\')" class="text-[10px] text-vit-orange hover:underline cursor-pointer">🔗 Verknüpfte Idee</span> ';
            if(r.ziel_datum) h += '<span class="text-[10px] text-gray-400">Ziel: '+new Date(r.ziel_datum).toLocaleDateString('de-DE')+'</span>';
            h += '</div>';

            // HQ: Status-Schnellwechsel
            if(isHQ) {
                h += '<select onchange="updateRoadmapStatus(\''+r.id+'\',this.value)" class="text-[10px] border rounded px-1.5 py-1 bg-white">';
                ['geplant','in_entwicklung','im_review','ausgerollt','verschoben'].forEach(function(st) {
                    h += '<option value="'+st+'"'+(r.status===st?' selected':'')+'>'+st.replace('_',' ')+'</option>';
                });
                h += '</select>';
            }
            h += '</div>';
        });
        h += '</div></div>';
    });

    // Items ohne Quartal
    var ohneQ = items.filter(function(r) {
        if(devRoadmapFilter !== 'alle' && r.status !== devRoadmapFilter) return false;
        return !r.ziel_quartal;
    });
    if(ohneQ.length > 0) {
        h += '<div class="mb-6"><h3 class="text-sm font-bold text-gray-400 mb-3">📋 Ohne Zeitplan</h3><div class="space-y-2">';
        ohneQ.forEach(function(r) {
            h += '<div class="vit-card p-3 opacity-50"><span class="font-semibold text-sm text-gray-600">'+r.titel+'</span></div>';
        });
        h += '</div></div>';
    }

    if(items.length === 0) {
        h += '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-3">🚀</p><p>Noch keine Roadmap-Einträge.</p></div>';
    }

    c.innerHTML = h;
}

export function toggleRoadmapForm() {
    var f = document.getElementById('roadmapAddForm');
    if(f) f.classList.toggle('hidden');
}

export async function addRoadmapItem() {
    var titel = (document.getElementById('rmTitel')||{}).value;
    if(!titel || !titel.trim()) { alert('Bitte Titel eingeben.'); return; }
    try {
        var maxSort = devRoadmapItems.reduce(function(m, r){ return Math.max(m, r.sortierung||0); }, 0);
        await _sb().from('dev_roadmap').insert({
            titel: titel.trim(),
            beschreibung: (document.getElementById('rmBeschreibung')||{}).value || null,
            kategorie: (document.getElementById('rmKategorie')||{}).value || 'feature',
            prioritaet: (document.getElementById('rmPrio')||{}).value || 'mittel',
            aufwand: (document.getElementById('rmAufwand')||{}).value || 'M',
            ziel_quartal: (document.getElementById('rmQuartal')||{}).value || null,
            ziel_datum: (document.getElementById('rmDatum')||{}).value || null,
            sortierung: maxSort + 1,
            status: 'geplant'
        });
        document.getElementById('rmTitel').value = '';
        document.getElementById('rmBeschreibung').value = '';
        toggleRoadmapForm();
        renderDevRoadmap();
    } catch(err) { alert('Fehler: '+(err.message||err)); }
}

export async function updateRoadmapStatus(id, newStatus) {
    try {
        await _sb().from('dev_roadmap').update({ status: newStatus }).eq('id', id);
        renderDevRoadmap();
    } catch(err) { console.error('Roadmap status update:', err); }
}

export async function submitDevIdea() {
    var btn = document.getElementById('devSubmitBtn');
    if(btn) { btn.disabled = true; btn.textContent = '⏳ Wird eingereicht...'; }
    try {
        var titel = (document.getElementById('devTitel').value || '').trim();
        var beschreibung = (document.getElementById('devBeschreibung').value || '').trim();
        var kategorie = document.getElementById('devKategorie').value;
        var modul = document.getElementById('devModul').value || null;

        if(!titel && !beschreibung && devSelectedFiles.length === 0) { alert('Bitte gib mindestens einen Titel, eine Beschreibung oder eine Aufnahme/Datei an.'); if(btn) { btn.disabled = false; btn.textContent = '💡 Feedback einreichen'; } return; }

        // Upload files to Supabase Storage
        var attachments = [];
        var userId = _sbUser() ? _sbUser().id : 'dd000000-0000-0000-0000-000000000002';
        for(var i = 0; i < devSelectedFiles.length; i++) {
            var file = devSelectedFiles[i];
            var path = 'dev-submissions/' + userId + '/' + Date.now() + '_' + file.name;
            var upResp = await _sb().storage.from('portal-uploads').upload(path, file);
            if(upResp.error) { console.error('Upload error:', upResp.error); continue; }
            var urlResp = _sb().storage.from('portal-uploads').getPublicUrl(path);
            attachments.push({ url: urlResp.data.publicUrl, name: file.name, type: file.type, size: file.size, storage_path: path });
        }

        // Insert submission
        var insertData = {
            user_id: userId,
            standort_id: sbStandort ? sbStandort.id : null,
            titel: titel || null,
            beschreibung: beschreibung || null,
            kurz_notiz: beschreibung ? beschreibung.substring(0, 200) : null,
            eingabe_typ: devInputType,
            kategorie: kategorie,
            kategorie_quelle: 'user',
            modul_key: modul,
            attachments: attachments,
            status: 'neu'
        };

        var resp = await _sb().from('dev_submissions').insert(insertData).select().single();
        if(resp.error) throw resp.error;

        // Reset form
        document.getElementById('devTitel').value = '';
        document.getElementById('devBeschreibung').value = '';
        devSelectedFiles = [];
        var fl = document.getElementById('devFileList'); if(fl) fl.innerHTML = '';
        toggleDevSubmitForm();

        // Sofort anzeigen
        renderDevPipeline();

        // Trigger KI-Analyse (fire-and-forget, im Hintergrund)
        var submissionId = resp.data.id;
        _sb().functions.invoke('dev-ki-analyse', {
            body: { submission_id: submissionId }
        }).then(function(kiResp) {
            if(kiResp.error) console.warn('KI-Analyse Fehler:', kiResp.error);
            else console.log('KI-Analyse fertig für:', submissionId);
            // Nach Analyse nochmal neu laden um Ergebnis zu zeigen
            renderDevPipeline();
        });
    } catch(err) {
        alert('Fehler beim Einreichen: ' + (err.message||err));
    } finally {
        if(btn) { btn.disabled = false; btn.textContent = '💡 Feedback einreichen'; }
    }
}

export async function toggleDevVote(subId) {
    try {
        // Prevent voting on own submissions
        var sub = devSubmissions.find(function(s){ return s.id === subId; });
        if(sub && sub.user_id === _sbUser().id) {
            _showToast('Du kannst deine eigene Idee nicht bewerten.', 'error');
            return;
        }
        var checkResp = await _sb().from('dev_votes').select('id').eq('submission_id', subId).eq('user_id', _sbUser().id);
        if(checkResp.data && checkResp.data.length > 0) {
            await _sb().from('dev_votes').delete().eq('submission_id', subId).eq('user_id', _sbUser().id);
            _showToast('Vote zurückgezogen', 'info');
        } else {
            var ins = await _sb().from('dev_votes').insert({ submission_id: subId, user_id: _sbUser().id }).select();
            if(ins.error) throw ins.error;
            _showToast('👍 Vote abgegeben!', 'success');
            // Notify submitter
            if(sub && sub.user_id !== _sbUser().id) {
                _sb().from('dev_notifications').insert({
                    user_id: sub.user_id, submission_id: subId,
                    typ: 'vote', titel: '👍 Jemand hat für deine Idee gestimmt',
                    inhalt: sub.titel || '(Ohne Titel)'
                });
            }
        }
        // Refresh whichever view is active
        await loadDevSubmissions();
        renderEntwIdeen();
        renderDevPipeline();
    } catch(err) {
        if(err.code === '23505') { _showToast('Bereits abgestimmt.', 'info'); }
        else { console.error('Vote error:', err); _showToast('Vote fehlgeschlagen: ' + (err.message||err), 'error'); }
    }
}

export async function devHQDecision(subId, ergebnis) {
    // Owner-Check: Nur Owner darf freigeben oder ablehnen
    var isOwner = (currentRoles||[]).indexOf('owner') !== -1;
    if(!isOwner && ['freigabe','freigabe_mit_aenderungen','ablehnung'].indexOf(ergebnis) !== -1) {
        _showToast('Nur der Owner kann Ideen freigeben oder ablehnen.', 'error');
        return;
    }
    var kommentar = '';
    var statusMap = { freigabe:'freigegeben', freigabe_mit_aenderungen:'freigegeben', rueckfragen:'hq_rueckfragen', ablehnung:'abgelehnt', spaeter:'geparkt', geschlossen:'geschlossen' };

    if(ergebnis === 'rueckfragen') {
        kommentar = prompt('Welche Rückfragen hast du?');
        if(!kommentar) return;
    } else if(ergebnis === 'ablehnung') {
        kommentar = prompt('Begründung für die Ablehnung:');
        if(!kommentar) return;
    }

    try {
        // Save decision
        await _sb().from('dev_entscheidungen').insert({
            submission_id: subId,
            entscheider_id: _sbUser().id,
            ergebnis: ergebnis,
            kommentar: kommentar || null
        });

        // Update submission status
        var newStatus = statusMap[ergebnis] || 'im_ideenboard';
        var updates = { status: newStatus };
        if(ergebnis === 'freigabe' || ergebnis === 'freigabe_mit_aenderungen') {
            updates.freigegeben_at = new Date().toISOString();
            updates.hq_entschieden_at = new Date().toISOString();
            // For freigabe: set temporary status, KI will create konzept
            if(ergebnis === 'freigabe') updates.status = 'konzept_wird_erstellt';
        }

        await _sb().from('dev_submissions').update(updates).eq('id', subId);

        // Add comment
        if(kommentar) {
            await _sb().from('dev_kommentare').insert({
                submission_id: subId,
                user_id: _sbUser().id,
                typ: ergebnis === 'rueckfragen' ? 'rueckfrage' : 'kommentar',
                inhalt: kommentar
            });
        }

        // Trigger KI-Konzepterstellung bei Freigabe (fire-and-forget)
        if(ergebnis === 'freigabe') {
            _showToast('✅ Freigegeben! Entwicklungskonzept wird erstellt...', 'success');
            try { _sb().functions.invoke('dev-ki-analyse', {
                body: { submission_id: subId, mode: 'konzept' }
            }).then(function() {
        // Update local cache
        var _ls = devSubmissions.find(function(s){ return s.id === subId; });
        if(_ls) { var _sm2 = {freigabe:'konzept_wird_erstellt',freigabe_mit_aenderungen:'ki_pruefung',rueckfragen:'hq_rueckfragen',ablehnung:'abgelehnt',spaeter:'geparkt',geschlossen:'geschlossen'}; _ls.status = _sm2[ergebnis] || _ls.status; }
                renderDevPipeline();
        setTimeout(function(){ loadDevSubmissions(); }, 1500);
            }); } catch(_e) {}

            // Auto-create roadmap entry
            var sub2 = devSubmissions.find(function(s){ return s.id === subId; });
            if(sub2) {
                var now2 = new Date();
                var qM = now2.getMonth() + 3;
                var qY = now2.getFullYear() + (qM > 11 ? 1 : 0);
                qM = qM > 11 ? qM - 12 : qM;
                var q2 = 'Q' + (Math.floor(qM/3)+1) + ' ' + qY;
                _sb().from('dev_roadmap').insert({
                    titel: sub2.titel || sub2.beschreibung || 'Freigegebene Idee',
                    beschreibung: sub2.beschreibung || '',
                    kategorie: sub2.kategorie || 'feature',
                    modul_key: sub2.modul_key || null,
                    status: 'geplant', prioritaet: sub2.ki_typ === 'bug' ? 'hoch' : 'mittel',
                    aufwand: sub2.geschaetzter_aufwand || 'M',
                    ziel_quartal: q2, submission_id: subId, sortierung: 999
                });
            }
        }

        await loadDevSubmissions(true);
        renderDevPipeline();
        if(typeof renderEntwSteuerung === 'function') renderEntwSteuerung();
    } catch(err) { alert('Fehler: ' + (err.message||err)); }
}

export async function moveDevQueue(subId, direction) {
    // Find current item and swap positions
    var planItems = devSubmissions.filter(function(s) {
        return ['freigegeben','in_planung','in_entwicklung','beta_test','im_review','release_geplant'].indexOf(s.status) !== -1;
    }).sort(function(a,b) { return (a.queue_position||9999) - (b.queue_position||9999); });

    var idx = planItems.findIndex(function(s) { return s.id === subId; });
    if(idx === -1) return;
    var targetIdx = idx + direction;
    if(targetIdx < 0 || targetIdx >= planItems.length) return;

    try {
        // Swap positions
        var pos1 = planItems[idx].queue_position || idx + 1;
        var pos2 = planItems[targetIdx].queue_position || targetIdx + 1;
        await _sb().from('dev_submissions').update({ queue_position: pos2 }).eq('id', planItems[idx].id);
        await _sb().from('dev_submissions').update({ queue_position: pos1 }).eq('id', planItems[targetIdx].id);
        renderDevPipeline();
    } catch(err) { console.error('Queue move error:', err); }
}

export async function openDevDetail(subId) {
    var modal = document.getElementById('devDetailModal');
    var content = document.getElementById('devDetailContent');
    if(!modal || !content) return;
    if(modal.classList.contains('hidden')) {
        content.innerHTML = '<div class="text-center py-8"><span class="animate-pulse text-gray-400">Lade Details...</span></div>';
    }
    modal.classList.remove('hidden');

    try {
        // Load all data
        var resp = await _sb().from('dev_submissions').select('*, users!dev_submissions_user_id_public_fkey(name, email)').eq('id', subId).single();
        if(resp.error) throw resp.error;
        var s = resp.data;
        var kiResp = await _sb().from('dev_ki_analysen').select('*').eq('submission_id', subId).order('version', {ascending: false}).limit(1);
        var ki = kiResp.data && kiResp.data[0] ? kiResp.data[0] : null;
        var konzResp = await _sb().from('dev_konzepte').select('*').eq('submission_id', subId).order('version', {ascending: false}).limit(1);
        var konzept = konzResp.data && konzResp.data[0] ? konzResp.data[0] : null;
        var kommResp = await _sb().from('dev_kommentare').select('*, users(name)').eq('submission_id', subId).order('created_at');
        var kommentare = kommResp.data || [];
        var entschResp = await _sb().from('dev_entscheidungen').select('*').eq('submission_id', subId).order('created_at', {ascending: false});
        var entscheidungen = entschResp.data || [];
        var logResp = await _sb().from('dev_status_log').select('*, users:geaendert_von(name)').eq('submission_id', subId).order('created_at', {ascending: false});
        var statusLog = logResp.data || [];
        var isHQ = (currentRoles||[]).indexOf('hq') !== -1;
        var isOwner = (currentRoles||[]).indexOf('owner') !== -1;
        var isSubmitter = sbUser && s.user_id === _sbUser().id;
        var canAttach = isSubmitter || isHQ;
        var hasKonzept = isHQ && konzept;
        var showMockup = hasKonzept && ['freigegeben','in_planung','in_entwicklung','beta_test','im_review'].indexOf(s.status) !== -1;
        var showCode = hasKonzept && ['in_entwicklung','beta_test','im_review','release_geplant','ausgerollt'].indexOf(s.status) !== -1;
        var showWorkflow = isHQ && ['freigegeben','in_planung','in_entwicklung','beta_test','im_review','release_geplant'].indexOf(s.status) !== -1;
        var showHQDecision = isHQ && ['neu','ki_pruefung','ki_rueckfragen','konzept_erstellt','konzept_wird_erstellt','im_ideenboard','hq_rueckfragen'].indexOf(s.status) !== -1;

        var h = '';

        // === HEADER (full width) ===
        h += '<div class="flex items-start justify-between mb-4 pb-3 border-b border-gray-200">';
        h += '<div>';
        h += '<span class="text-xs font-semibold rounded px-2 py-1 '+devStatusColors[s.status]+'">'+devStatusLabels[s.status]+'</span>';
        if(s.ki_typ) { var _dtC = s.ki_typ==='bug'?'bg-red-100 text-red-700':s.ki_typ==='feature'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'; var _dtI = s.ki_typ==='bug'?'\uD83D\uDC1B Bug':s.ki_typ==='feature'?'\u2728 Feature':'\uD83D\uDCA1 Idee'; h += ' <span class="text-xs font-semibold rounded px-2 py-1 '+_dtC+'">'+_dtI+'</span>'; }
        if(s.ki_bereich) { h += ' <span class="text-xs rounded px-2 py-1 '+(s.ki_bereich==='portal'?'bg-gray-100 text-gray-600':'bg-green-50 text-green-700')+'">'+(s.ki_bereich==='portal'?'\uD83D\uDCBB Portal':'\uD83C\uDF10 Netzwerk')+'</span>'; }
        h += '<h2 class="text-lg font-bold text-gray-800 mt-1">'+(s.titel||'(Ohne Titel)')+'</h2>';
        var _submitterName = s.users ? s.users.name : null;
        var _quelle = s.quelle || 'portal';
        h += '<p class="text-xs text-gray-400 mt-0.5">';
        if(_submitterName) h += '\uD83D\uDC64 ' + _escH(_submitterName) + ' \u00B7 ';
        h += (devKatIcons[s.kategorie]||'') + ' ' + s.kategorie + ' \u00B7 ' + new Date(s.created_at).toLocaleDateString('de-DE');
        h += '</p>';
        h += '</div>';
        h += '<button onclick="closeDevDetail()" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">\u2715</button>';
        h += '</div>';

        // === SPLIT LAYOUT ===
        h += '<div class="flex gap-6" style="min-height:500px">';

        // === LEFT COLUMN (Meta) ===
        h += '<div class="w-80 flex-shrink-0 space-y-4 overflow-y-auto pr-3" style="max-height:calc(80vh - 120px)">';

        // Beschreibung
        if(s.beschreibung) {
            h += '<div class="bg-gray-50 rounded-lg p-3">';
            h += '<h4 class="text-[10px] font-bold text-gray-500 uppercase mb-1">Beschreibung</h4>';
            h += '<p class="text-sm text-gray-700">'+s.beschreibung+'</p>';
            h += '</div>';
        }

        // Analyse (kompakt, collapsible - default eingeklappt)
        if(ki) {
            h += '<div class="bg-purple-50/50 border border-purple-200 rounded-lg p-3">';
            h += '<h4 onclick="this.nextElementSibling.classList.toggle(\'hidden\');this.querySelector(\'span\').textContent=this.nextElementSibling.classList.contains(\'hidden\')?\'+\':\'\u2212\'" class="text-[10px] font-bold text-purple-600 uppercase mb-1 cursor-pointer select-none flex items-center justify-between hover:text-purple-800"><span class="flex items-center gap-1">\uD83D\uDCCA Analyse</span><span class="text-xs text-purple-400">+</span></h4>';
            h += '<div class="hidden">';
            if(ki.zusammenfassung) h += '<p class="text-xs text-gray-600 mb-2">'+ki.zusammenfassung+'</p>';
            if(isHQ) {
                h += '<div class="grid grid-cols-3 gap-2 text-center">';
                h += '<div><p class="text-lg font-bold '+(ki.vision_fit_score>=70?'text-green-600':ki.vision_fit_score>=40?'text-yellow-600':'text-red-600')+'">'+ki.vision_fit_score+'</p><p class="text-[9px] text-gray-400">Vision-Fit</p></div>';
                h += '<div><p class="text-xs font-bold text-gray-700">'+(ki.machbarkeit||'-')+'</p><p class="text-[9px] text-gray-400">Machbarkeit</p></div>';
                h += '<div><p class="text-xs font-bold text-gray-700">'+(ki.aufwand_schaetzung||'-')+'</p><p class="text-[9px] text-gray-400">Aufwand</p></div>';
                h += '</div>';
                if(ki.risiken && ki.risiken.length > 0) {
                    h += '<div class="mt-2 flex flex-wrap gap-1">';
                    ki.risiken.forEach(function(r) {
                        h += '<span class="text-[9px] rounded px-1.5 py-0.5 '+(r.schwere==='hoch'?'bg-red-100 text-red-600':'bg-yellow-100 text-yellow-600')+'">'+r.typ+'</span>';
                    });
                    h += '</div>';
                }
            } else {
                h += '<div class="flex gap-2">';
                if(ki.aufwand_schaetzung) h += '<span class="text-xs bg-gray-100 rounded px-2 py-0.5">'+ki.aufwand_schaetzung+'</span>';
                if(ki.machbarkeit) h += '<span class="text-xs bg-gray-100 rounded px-2 py-0.5">'+ki.machbarkeit+'</span>';
                h += '</div>';
            }
            if(ki.rueckfragen && ki.rueckfragen.length > 0) {
                h += '<div class="mt-2 bg-yellow-50 rounded p-2">';
                h += '<p class="text-[10px] font-semibold text-yellow-700 mb-1">\u2753 R\u00FCckfragen:</p>';
                ki.rueckfragen.forEach(function(q) { h += '<p class="text-[10px] text-gray-600">\u2022 '+(q.frage||q)+'</p>'; });
                h += '</div>';
            }
            h += '</div>'; // end collapsible
            h += '</div>';
        }

        // Planung & Zuweisung (collapsible - eingeklappt wenn geplant, ausgeklappt wenn ungeplant)
        if(isHQ && (s.bug_schwere || s.deadline || s.konzept_ma || s.entwickler_ma || ['freigegeben','in_planung','in_entwicklung'].indexOf(s.status) !== -1)) {
            var _planFilled = s.deadline || s.konzept_ma || s.entwickler_ma;
            h += '<div class="bg-white border border-gray-200 rounded-lg p-3">';
            h += '<h4 onclick="this.nextElementSibling.classList.toggle(\'hidden\');this.querySelector(\'span:last-child\').textContent=this.nextElementSibling.classList.contains(\'hidden\')?\'+\':\'\u2212\'" class="text-[10px] font-bold text-gray-500 uppercase mb-1 cursor-pointer select-none flex items-center justify-between hover:text-gray-700"><span class="flex items-center gap-1">\uD83D\uDCCB Planung</span><span class="text-xs text-gray-400">'+(_planFilled?'+':'\u2212')+'</span></h4>';
            h += '<div class="'+(_planFilled?'hidden':'')+'">'; 
            h += '<div class="space-y-2 text-xs">';
            if(s.bug_schwere) {
                var bsColors = {kritisch:'text-red-700',mittel:'text-yellow-700',niedrig:'text-green-700'};
                var bsIcons = {kritisch:'\uD83D\uDD34',mittel:'\uD83D\uDFE1',niedrig:'\uD83D\uDFE2'};
                h += '<div class="flex justify-between"><span class="text-gray-400">Bug-Schwere</span><span class="font-semibold '+(bsColors[s.bug_schwere]||'')+'">'+bsIcons[s.bug_schwere]+' '+s.bug_schwere+'</span></div>';
            }
            h += '<div class="flex justify-between items-center"><span class="text-gray-400">Deadline</span>';
            if(isOwner) {
                h += '<input type="date" value="'+(s.deadline||'')+'" onchange="updateDevDeadline(\''+s.id+'\')" id="devDeadlineInput" class="px-1.5 py-0.5 border border-gray-200 rounded text-xs w-32">';
            } else {
                h += '<span class="font-semibold">'+(s.deadline ? new Date(s.deadline).toLocaleDateString('de-DE') : '\u2013')+'</span>';
            }
            h += '</div>';
            h += '<div class="flex justify-between items-center"><span class="text-gray-400">Konzept-MA</span>';
            if(isOwner) {
                h += '<select id="devKonzeptMASelect" onchange="updateDevMA(\''+s.id+'\',\'konzept_ma\')" class="px-1.5 py-0.5 border border-gray-200 rounded text-xs w-32"><option value="">\u2013</option></select>';
                h += '<span class="devMASelectSub hidden" data-field="konzept_ma" data-current="'+(s.konzept_ma||'')+'"></span>';
            } else {
                h += '<span class="font-semibold" id="devKonzeptMAName">\u2013</span>';
            }
            h += '</div>';
            h += '<div class="flex justify-between items-center"><span class="text-gray-400">Entwickler</span>';
            if(isOwner) {
                h += '<select id="devEntwicklerMASelect" onchange="updateDevMA(\''+s.id+'\',\'entwickler_ma\')" class="px-1.5 py-0.5 border border-gray-200 rounded text-xs w-32"><option value="">\u2013</option></select>';
                h += '<span class="devMASelectSub hidden" data-field="entwickler_ma" data-current="'+(s.entwickler_ma||'')+'"></span>';
            } else {
                h += '<span class="font-semibold" id="devEntwicklerMAName">\u2013</span>';
            }
            h += '</div>';
            h += '</div>'; // end collapsible
            h += '</div></div>';
            setTimeout(function(){ _loadDevHQUsers(s); }, 50);
        }

        // KI-Analyse Button
        if(isOwner && s.status !== 'ki_pruefung') {
            if(!ki) {
                h += '<button onclick="reanalyseDevSubmission(\''+s.id+'\')" class="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-indigo-700 shadow-sm">\uD83E\uDD16 KI-Analyse starten</button>';
            } else {
                h += '<button onclick="reanalyseDevSubmission(\''+s.id+'\')" class="w-full px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-200">\uD83D\uDD04 KI neu analysieren</button>';
            }
        }

        // Anh\u00E4nge
        if(canAttach) {
            var hasAtt = s.attachments && s.attachments.length > 0;
            h += '<div>';
            h += '<h4 class="text-[10px] font-bold text-gray-500 uppercase mb-1">\uD83D\uDCCE Anh\u00E4nge'+(hasAtt?' ('+s.attachments.length+')':'')+'</h4>';
            if(hasAtt) {
                h += '<div class="space-y-1 mb-1">';
                s.attachments.forEach(function(att) {
                    var url = att.url || att.publicUrl || '#';
                    h += '<a href="'+url+'" target="_blank" class="flex items-center gap-1 text-[10px] text-blue-600 hover:underline truncate">\uD83D\uDCC4 '+_escH(att.name||'Datei')+'</a>';
                });
                h += '</div>';
            }
            h += '<input type="file" id="devAttachInput" multiple class="hidden" onchange="uploadDevAttachment(\''+s.id+'\')">';
            h += '<button onclick="document.getElementById(\'devAttachInput\').click()" class="text-[10px] text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 rounded px-2 py-1 hover:border-gray-400">\uD83D\uDCCE Anhang hinzuf\u00FCgen</button>';
            h += '</div>';
        }

        // Notizen
        if(canAttach) {
            h += '<div>';
            h += '<h4 class="text-[10px] font-bold text-gray-500 uppercase mb-1">\u270D\uFE0F Notizen</h4>';
            h += '<textarea id="devNotizen" rows="2" class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs resize-y focus:border-orange-400" placeholder="Freie Notizen..." onblur="saveDevNotizen(\''+s.id+'\')">'+(s.notizen||'')+'</textarea>';
            h += '</div>';
        }

        // HQ-Entscheidung (compact)
        if(showHQDecision) {
            h += '<div class="bg-orange-50 border border-orange-200 rounded-lg p-3">';
            h += '<h4 class="text-[10px] font-bold text-gray-600 uppercase mb-2">\uD83C\uDFAF Entscheidung</h4>';
            h += '<div class="grid grid-cols-2 gap-1.5">';
            if(isOwner) {
                h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'freigabe\')" class="px-2 py-1.5 bg-green-500 text-white rounded text-[10px] font-semibold hover:bg-green-600">\u2705 Freigeben</button>';
                h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'freigabe_mit_aenderungen\')" class="px-2 py-1.5 bg-orange-500 text-white rounded text-[10px] font-semibold hover:bg-orange-600">\u270F\uFE0F mit \u00C4nderungen</button>';
            }
            h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'rueckfragen\')" class="px-2 py-1.5 bg-yellow-500 text-white rounded text-[10px] font-semibold hover:bg-yellow-600">\u2753 R\u00FCckfrage</button>';
            if(isOwner) {
                h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'ablehnung\')" class="px-2 py-1.5 bg-red-100 text-red-700 rounded text-[10px] font-semibold hover:bg-red-200">\u274C Ablehnen</button>';
            }
            h += '</div>';
            h += '<div class="flex gap-1 mt-1.5">';
            h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'spaeter\')" class="flex-1 px-2 py-1 bg-gray-200 text-gray-600 rounded text-[10px] hover:bg-gray-300">\u23F8 Sp\u00E4ter</button>';
            h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'geschlossen\')" class="flex-1 px-2 py-1 bg-slate-200 text-slate-600 rounded text-[10px] hover:bg-slate-300">\uD83D\uDD12 Schlie\u00DFen</button>';
            h += '</div>';
            h += '</div>';
        }

        // Workflow Actions (compact)
        if(showWorkflow) {
            h += '<div class="bg-blue-50 border border-blue-200 rounded-lg p-3">';
            h += '<h4 class="text-[10px] font-bold text-gray-600 uppercase mb-2">\u26A1 Workflow</h4>';
            h += '<div class="flex flex-wrap gap-1">';
            var wfActions = {
                'freigegeben': [{label:'Konzept erstellen',status:'konzept_wird_erstellt',fn:'createDevKonzept',icon:'\uD83D\uDCCB',color:'indigo'},{label:'\u2192 In Planung',status:'in_planung',icon:'\uD83D\uDCDD',color:'blue'}],
                'in_planung': [{label:'\u2192 Entwicklung',status:'in_entwicklung',icon:'\u2699\uFE0F',color:'emerald'}],
                'in_entwicklung': [{label:'\u2192 Beta-Test',status:'beta_test',icon:'\uD83E\uDDEA',color:'pink'}],
                'beta_test': [{label:'\u2192 Review',status:'im_review',icon:'\uD83D\uDD0D',color:'purple'}],
                'im_review': [{label:'\u2192 Release planen',status:'release_geplant',icon:'\uD83D\uDE80',color:'orange'}],
                'release_geplant': [{label:'\u2192 Ausgerollt!',status:'ausgerollt',icon:'\u2705',color:'green'}]
            };
            var acts = wfActions[s.status] || [];
            acts.forEach(function(a) {
                if(a.fn) {
                    h += '<button onclick="'+a.fn+'(\''+s.id+'\')" class="px-2 py-1 bg-'+a.color+'-500 text-white rounded text-[10px] font-semibold hover:bg-'+a.color+'-600">'+a.icon+' '+a.label+'</button>';
                } else {
                    h += '<button onclick="updateDevStatus(\''+s.id+'\',\''+a.status+'\')" class="px-2 py-1 bg-'+a.color+'-500 text-white rounded text-[10px] font-semibold hover:bg-'+a.color+'-600">'+a.icon+' '+a.label+'</button>';
                }
            });
            h += '</div></div>';
        }

        h += '</div>'; // END LEFT COLUMN

        // === RIGHT COLUMN (Tabs) ===
        h += '<div class="flex-1 min-w-0 flex flex-col overflow-hidden">';

        // Tab bar
        var tabs = [];
        tabs.push({id:'uebersicht',label:'\uD83D\uDCCB \u00DCbersicht',active:true});
        if(hasKonzept) tabs.push({id:'konzept',label:'\uD83D\uDCDD Konzept'});
        if(showMockup) tabs.push({id:'mockup',label:'\uD83C\uDFA8 Mockup'+(function(){ try { var m = arguments; } catch(e){} return ''; })()});
        if(showCode) tabs.push({id:'code',label:'\uD83D\uDCBB Code'});

        if(tabs.length > 1) {
            h += '<div class="flex border-b border-gray-200 mb-4 -mx-1">';
            tabs.forEach(function(t, ti) {
                h += '<button onclick="document.querySelectorAll(\'[data-devtab]\').forEach(function(el){el.style.display=\'none\'});document.getElementById(\'devTab_'+t.id+'\').style.display=\'block\';this.parentElement.querySelectorAll(\'button\').forEach(function(b){b.className=\'px-3 py-2 text-xs font-semibold border-b-2 border-transparent text-gray-400 hover:text-gray-600\'});this.className=\'px-3 py-2 text-xs font-semibold border-b-2 border-orange-500 text-gray-800\'" class="px-3 py-2 text-xs font-semibold border-b-2 '+(ti===0?'border-orange-500 text-gray-800':'border-transparent text-gray-400 hover:text-gray-600')+'">'+t.label+'</button>';
            });
            h += '</div>';
        }

        // Tab content wrapper
        h += '<div class="flex-1 overflow-y-auto pr-1" style="max-height:calc(80vh - 180px)">';

        // === TAB: ÜBERSICHT ===
        h += '<div data-devtab id="devTab_uebersicht">';

        // R\u00FCckfragen-Formular
        if((s.status === 'ki_rueckfragen' || s.status === 'hq_rueckfragen') && isSubmitter) {
            var rfQuelle = s.status === 'ki_rueckfragen' ? (isHQ ? 'Die KI-Analyse' : 'Das vit:bikes Team') : 'Das HQ';
            h += '<div class="border-2 border-yellow-300 rounded-lg p-4 mb-4 bg-yellow-50">';
            h += '<h4 class="text-sm font-bold text-yellow-800 mb-2">\uD83D\uDCAC '+rfQuelle+' hat R\u00FCckfragen:</h4>';
            if(s.status === 'ki_rueckfragen' && ki && ki.rueckfragen) {
                ki.rueckfragen.filter(function(q){return !q.beantwortet;}).forEach(function(q, qi) {
                    h += '<div class="bg-white rounded p-3 mb-2 border border-yellow-200">';
                    h += '<p class="text-xs font-semibold text-gray-700 mb-1">\u2753 '+(q.frage||q)+'</p>';
                    h += '<textarea id="devRFAntwort_'+qi+'" placeholder="Deine Antwort..." class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" rows="2"></textarea></div>';
                });
            }
            h += '<textarea id="devRFAntwortAllg" placeholder="Zus\u00E4tzliche Informationen..." class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3" rows="2"></textarea>';
            h += '<button onclick="submitDevRueckfragenAntwort(\''+s.id+'\',\''+s.status+'\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">\u2705 Antwort senden</button>';
            h += '</div>';
        }

        // Entscheidungen
        if(isHQ && entscheidungen.length > 0) {
            h += '<div class="mb-4"><h4 class="text-[10px] font-bold text-gray-500 uppercase mb-2">HQ-Entscheidungen</h4>';
            entscheidungen.forEach(function(e) {
                var eColors = {freigabe:'text-green-700 bg-green-50',freigabe_mit_aenderungen:'text-orange-700 bg-orange-50',rueckfragen:'text-yellow-700 bg-yellow-50',ablehnung:'text-red-700 bg-red-50',spaeter:'text-gray-600 bg-gray-50'};
                var eLabels = {freigabe:'\u2705 Freigabe',freigabe_mit_aenderungen:'\u2705 mit \u00C4nderungen',rueckfragen:'\u2753 R\u00FCckfrage',ablehnung:'\u274C Abgelehnt',spaeter:'\u23F8 Sp\u00E4ter'};
                h += '<div class="rounded p-2 mb-1 text-xs '+(eColors[e.ergebnis]||'bg-gray-50')+'"><span class="font-bold">'+eLabels[e.ergebnis]+'</span>';
                if(e.kommentar) h += ' \u2013 '+e.kommentar;
                h += ' <span class="text-[10px] text-gray-400">'+new Date(e.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span></div>';
            });
            h += '</div>';
        }

        // Verlauf
        if(kommentare.length > 0) {
            h += '<div class="mb-4"><h4 class="text-[10px] font-bold text-gray-500 uppercase mb-2">Verlauf</h4><div class="space-y-1.5">';
            kommentare.forEach(function(k) {
                var isKI = k.typ === 'ki_nachricht';
                var bgClass = isKI ? 'bg-purple-50 border-purple-100' : k.typ==='rueckfrage' ? 'bg-yellow-50 border-yellow-100' : k.typ==='antwort' ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100';
                var label = isKI ? (isHQ ? '\uD83E\uDD16 KI' : '\uD83D\uDCCB Team') : k.typ==='rueckfrage' ? '\u2753' : '\uD83D\uDCAC ' + (k.users && k.users.name ? k.users.name : '');
                h += '<div class="rounded p-2 text-xs border '+bgClass+'">';
                h += '<span class="font-semibold">'+label+'</span> ';
                h += '<span class="text-gray-600" style="white-space:pre-line">'+k.inhalt+'</span>';
                h += ' <span class="text-[9px] text-gray-400">'+new Date(k.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span></div>';
            });
            h += '</div></div>';
        }

        // Feedback-Anfragen section
        var fbResp = await _sb().from('dev_feedback_anfragen').select('*, dev_feedback_antworten(*)').eq('submission_id', subId);
        var fbList = fbResp.data || [];
        for(var _fbi=0; _fbi<fbList.length; _fbi++) {
            var _fb = fbList[_fbi];
            var _fbOptionen = _fb.optionen || [];
            var _fbAntworten = _fb.dev_feedback_antworten || [];
            var _meineAntwort = _fbAntworten.find(function(a){return a.user_id===_sbUser().id;});
            var _fbAbgelaufen = _fb.deadline && new Date(_fb.deadline) < new Date();
            h += '<div class="border-2 border-amber-300 rounded-lg p-3 mb-4 bg-amber-50">';
            h += '<h4 class="text-sm font-bold text-amber-800">\uD83D\uDDF3 Feedback-Anfrage</h4>';
            h += '<p class="text-xs text-gray-600 mt-1">'+(_fb.frage||'')+'</p>';
            if(isHQ) {
                h += '<p class="text-xs text-gray-500 mt-1">Antworten: '+_fbAntworten.length+'</p>';
            } else {
                if(_meineAntwort) {
                    h += '<p class="text-xs text-green-600 mt-1">\u2705 Feedback gegeben</p>';
                } else if(_fbAbgelaufen) {
                    h += '<p class="text-xs text-red-500 mt-1">\u23F0 Abgelaufen</p>';
                } else {
                    if(_fbOptionen.length > 0) {
                        h += '<div class="space-y-1 mt-2" id="fbOptionen_'+_fb.id+'">';
                        _fbOptionen.forEach(function(opt, idx) {
                            h += '<label class="flex items-center gap-2 bg-white rounded p-1.5 border border-gray-100 hover:border-amber-300 cursor-pointer text-xs"><input type="radio" name="fbChoice_'+_fb.id+'" value="'+idx+'"> '+_escH(opt)+'</label>';
                        });
                        h += '</div>';
                    }
                    h += '<textarea id="fbKommentar_'+_fb.id+'" placeholder="Kommentar..." class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs mt-2" rows="1"></textarea>';
                    h += '<button onclick="devSubmitFeedbackAntwort(\''+_fb.id+'\')" class="mt-1 px-3 py-1.5 bg-amber-500 text-white rounded text-xs font-semibold hover:bg-amber-600">\uD83D\uDCE8 Senden</button>';
                }
            }
            h += '</div>';
        }

        // Beta-Feedback
        if(s.status === 'beta_test') {
            h += '<div class="border-2 border-pink-200 rounded-lg p-3 mb-4 bg-pink-50">';
            h += '<h4 class="text-sm font-bold text-pink-700 mb-2">\uD83E\uDDEA Beta-Feedback</h4>';
            h += '<div class="flex gap-1 mb-2" id="devBetaStars">';
            for(var _star=1;_star<=5;_star++) h += '<button onclick="document.getElementById(\'devBetaRating\').value='+_star+';document.querySelectorAll(\'#devBetaStars button\').forEach(function(b,i){b.className=i<'+_star+'?\'text-xl text-yellow-400\':\'text-xl text-gray-300\';})" class="text-xl text-gray-300">\u2605</button>';
            h += '</div><input type="hidden" id="devBetaRating" value="0">';
            h += '<textarea id="devBetaText" placeholder="Wie l\u00E4uft es?" class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs mb-1" rows="2"></textarea>';
            h += '<button onclick="submitDevBetaFeedback(\''+s.id+'\')" class="px-3 py-1.5 bg-pink-500 text-white rounded text-xs font-semibold">\uD83D\uDCE8 Senden</button>';
            h += '</div>';
        }

        // Release-Docs
        if(['ausgerollt','release_geplant'].indexOf(s.status) !== -1) {
            try { var rdHtml = await renderDevReleaseDocs(s.id); if(rdHtml) h += rdHtml; } catch(e) {}
        }

        // Status-Log
        if(statusLog.length > 0) {
            h += '<details class="mb-4"><summary class="text-[10px] font-bold text-gray-500 uppercase cursor-pointer">\uD83D\uDCCB Status-Verlauf ('+statusLog.length+')</summary>';
            h += '<div class="mt-1 space-y-1 max-h-32 overflow-y-auto">';
            statusLog.forEach(function(log) {
                h += '<div class="text-[10px] text-gray-500"><span class="text-gray-400">'+new Date(log.created_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span> '+(devStatusLabels[log.alter_status]||log.alter_status||'\u2013')+' \u2192 <b>'+(devStatusLabels[log.neuer_status]||log.neuer_status)+'</b></div>';
            });
            h += '</div></details>';
        }

        // Kommentar schreiben
        h += '<div class="border-t border-gray-200 pt-3">';
        h += '<textarea id="devKommentarInput" placeholder="Kommentar..." class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs mb-1 resize-none" rows="2" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();submitDevKommentar(\''+s.id+'\')}"></textarea>';
        h += '<div class="flex justify-end"><button id="devKommentarBtn" onclick="submitDevKommentar(\''+s.id+'\')" class="px-3 py-1.5 bg-gray-700 text-white rounded text-xs font-semibold hover:bg-gray-800">\uD83D\uDCAC Senden</button></div>';
        h += '</div>';

        h += '</div>'; // END TAB ÜBERSICHT

        // === TAB: KONZEPT ===
        if(hasKonzept) {
            h += '<div data-devtab id="devTab_konzept" style="display:none">';
            var sections = [
                {label:'\uD83C\uDFAF Problem', val:konzept.problem_beschreibung},
                {label:'\uD83D\uDCA1 Ziel', val:konzept.ziel},
                {label:'\u2705 Nutzen', val:konzept.nutzen},
                {label:'\uD83D\uDCE6 Scope (In)', val:konzept.scope_in},
                {label:'\uD83D\uDEAB Scope (Out)', val:konzept.scope_out},
                {label:'\uD83D\uDDA5\uFE0F UI/Frontend', val:konzept.loesungsvorschlag_ui},
                {label:'\u2699\uFE0F Backend', val:konzept.loesungsvorschlag_backend},
                {label:'\uD83D\uDDC4\uFE0F Datenbank', val:konzept.loesungsvorschlag_db},
                {label:'\uD83E\uDDEA Testplan', val:konzept.testplan},
                {label:'\uD83D\uDE80 Rollout', val:konzept.rollout_strategie},
                {label:'\u2714\uFE0F DoD', val:konzept.definition_of_done}
            ];
            h += '<div class="mb-3 flex items-center justify-between"><span class="text-xs font-bold text-indigo-700">\uD83D\uDCDD Konzept v'+konzept.version+'</span>';
            if(konzept.feature_flag_key) h += '<span class="text-[10px] bg-gray-100 rounded px-2 py-0.5">\uD83D\uDEA9 '+konzept.feature_flag_key+'</span>';
            h += '</div>';
            sections.forEach(function(sec) {
                if(sec.val) h += '<div class="mb-3"><span class="text-[10px] font-bold text-indigo-600 uppercase">'+sec.label+'</span><p class="text-sm text-gray-700 mt-0.5 whitespace-pre-line">'+sec.val+'</p></div>';
            });
            if(konzept.akzeptanzkriterien && konzept.akzeptanzkriterien.length > 0) {
                h += '<div class="mb-3"><span class="text-[10px] font-bold text-indigo-600 uppercase">\uD83D\uDCCB Akzeptanzkriterien</span>';
                konzept.akzeptanzkriterien.forEach(function(a) { h += '<div class="text-sm text-gray-700 mt-0.5">\u2610 '+(a.beschreibung||a)+'</div>'; });
                h += '</div>';
            }
            // Konzept-Chat
            if(['freigegeben','in_planung','konzept_erstellt'].indexOf(s.status) !== -1) {
                h += '<div class="border-t border-indigo-200 pt-3 mt-4">';
                h += '<h5 class="text-xs font-bold text-indigo-600 uppercase mb-2">\uD83D\uDCAC Konzept verfeinern</h5>';
                h += '<div class="flex gap-2">';
                h += '<textarea id="devKonzeptChatInput" placeholder="z.B. Mach den UI-Teil einfacher..." class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" rows="2" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendDevKonzeptChat(\''+s.id+'\')}"></textarea>';
                h += '<button id="devKonzeptChatBtn" onclick="sendDevKonzeptChat(\''+s.id+'\')" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 self-end">\uD83D\uDCAC</button>';
                h += '</div></div>';
            }
            h += '</div>'; // END TAB KONZEPT
        }

        // === TAB: MOCKUP ===
        if(showMockup) {
            var mockupsResp = await _sb().from('dev_mockups').select('*').eq('submission_id', subId).order('version', {ascending: false});
            var mockups = mockupsResp.data || [];
            var latestMockup = mockups[0] || null;

            h += '<div data-devtab id="devTab_mockup" style="display:none">';
            h += '<div class="flex items-center justify-between mb-3">';
            if(!latestMockup) {
                h += '<p class="text-xs text-gray-500">Wireframe aus Konzept v'+konzept.version+'</p>';
                h += '<button onclick="devMockupGenerate(\''+s.id+'\',false)" id="devBtnMockGen" class="px-3 py-1.5 bg-pink-600 text-white rounded-lg text-xs font-semibold hover:bg-pink-700">\uD83C\uDFA8 Mockup generieren</button>';
            } else {
                h += '<div class="flex items-center gap-2"><span class="text-xs text-gray-500">v'+latestMockup.version+'</span>';
                if(mockups.length > 1) {
                    mockups.forEach(function(m) {
                        h += '<button onclick="devMockupShowVersion(\''+m.id+'\')" class="px-1.5 py-0.5 rounded text-[10px] '+(m.id===latestMockup.id?'bg-pink-200 text-pink-700':'bg-gray-100 text-gray-500 hover:bg-gray-200')+'">v'+m.version+'</button>';
                    });
                }
                h += '</div>';
                h += '<div class="flex gap-1">';
                h += '<button onclick="devMockupResize(\'mobile\')" class="text-xs px-2 py-0.5 bg-gray-200 rounded hover:bg-gray-300">\uD83D\uDCF1</button>';
                h += '<button onclick="devMockupResize(\'tablet\')" class="text-xs px-2 py-0.5 bg-gray-200 rounded hover:bg-gray-300">\uD83D\uDCCB</button>';
                h += '<button onclick="devMockupResize(\'desktop\')" class="text-xs px-2 py-0.5 bg-gray-200 rounded hover:bg-gray-300">\uD83D\uDDA5\uFE0F</button>';
                h += '<button onclick="devMockupFullscreen()" class="text-xs px-2 py-0.5 bg-pink-200 rounded hover:bg-pink-300 text-pink-700">\u26F6</button>';
                h += '<button onclick="devMockupGenerate(\''+s.id+'\',false)" class="text-xs px-2 py-0.5 bg-pink-100 text-pink-700 rounded hover:bg-pink-200">\uD83D\uDD04</button>';
                h += '</div>';
            }
            h += '</div>';

            if(!latestMockup) {
                h += '<div class="bg-white border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">';
                h += '<p class="text-3xl mb-2">\uD83C\uDFA8</p><p class="text-sm text-gray-500">Noch kein Mockup</p></div>';
            } else {
                h += '<iframe id="devMockupFrame" sandbox="allow-scripts" style="width:100%;height:400px;border:1px solid #e5e7eb;border-radius:8px;background:white;" srcdoc="'+latestMockup.html_content.replace(/"/g,'&quot;').replace(/'/g,'&#39;')+'"></iframe>';
            }

            // Design-Chat
            h += '<div class="mt-4 border-t border-pink-200 pt-3">';
            h += '<h5 class="text-xs font-bold text-pink-600 uppercase mb-2">\uD83D\uDCAC Design-Chat</h5>';
            h += '<div id="devMockupChatHistory" class="max-h-48 overflow-y-auto mb-3 space-y-2 scroll-smooth">';
            h += '<p class="text-xs text-gray-400 text-center py-2">Chat wird geladen...</p></div>';
            h += '<div id="devMockupChatAttachments" class="hidden mb-2 flex flex-wrap gap-2"></div>';
            h += '<div class="flex items-end gap-2">';
            h += '<label class="cursor-pointer flex-shrink-0"><input type="file" accept="image/*" onchange="devMockupChatAttachImage(this)" class="hidden"><span class="inline-flex items-center justify-center w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm">\uD83D\uDCF7</span></label>';
            h += '<button onclick="devMockupChatMic(this)" id="devMockupMicBtn" class="flex-shrink-0 w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm">\uD83C\uDFA4</button>';
            h += '<textarea id="devMockupChatInput" rows="1" class="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm resize-none focus:border-pink-400" placeholder="Design-Idee beschreiben..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();devMockupChatSend(\''+s.id+'\')}" oninput="this.style.height=\'auto\';this.style.height=Math.min(this.scrollHeight,100)+\'px\'"></textarea>';
            h += '<button onclick="devMockupChatSend(\''+s.id+'\')" id="devMockupChatSendBtn" class="flex-shrink-0 w-8 h-8 rounded bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold">\u27A4</button>';
            h += '</div></div>';

            h += '</div>'; // END TAB MOCKUP
        }

        // === TAB: CODE ===
        if(showCode) {
            var codeArtsResp = await _sb().from('dev_code_artifacts').select('*').eq('submission_id', subId).order('dateiname').order('version', {ascending: false});
            var codeArts = codeArtsResp.data || [];
            var seenFiles = {};
            var uniqueArts = codeArts.filter(function(a) { if(seenFiles[a.dateiname]) return false; seenFiles[a.dateiname] = true; return true; });

            h += '<div data-devtab id="devTab_code" style="display:none">';
            h += '<div class="flex items-center justify-between mb-3">';
            h += '<span class="text-xs text-gray-500">'+uniqueArts.length+' Datei'+(uniqueArts.length!==1?'en':'')+'</span>';
            h += '<button onclick="devCodeGenerate(\''+s.id+'\')" id="devBtnCodeGen" class="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700">'+(uniqueArts.length > 0 ? '\uD83D\uDD04 Neu generieren' : '\uD83E\uDD16 Code generieren')+'</button>';
            h += '</div>';

            if(uniqueArts.length === 0) {
                h += '<div class="bg-white border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">';
                h += '<p class="text-3xl mb-2">\uD83D\uDCBB</p><p class="text-sm text-gray-500">Noch kein Code</p></div>';
            } else {
                h += '<div class="space-y-2 mb-4">';
                uniqueArts.forEach(function(art) {
                    var langColors = {javascript:'#f7df1e',sql:'#e97d0a',typescript:'#3178c6'};
                    var lc = langColors[art.sprache] || '#6b7280';
                    h += '<div class="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300">';
                    h += '<div class="flex items-center justify-between">';
                    h += '<div class="flex items-center gap-2 min-w-0"><span style="background:'+lc+';color:white;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:600">'+art.sprache+'</span>';
                    h += '<div class="min-w-0"><p class="text-sm font-semibold text-gray-800 truncate">'+art.dateiname+'</p>';
                    h += '<p class="text-[10px] text-gray-400">v'+art.version+' \u00B7 '+(art.code_zeilen||'?')+' Zeilen</p></div></div>';
                    h += '<div class="flex gap-1">';
                    h += '<button onclick="devCodeViewFile(\''+art.id+'\')" class="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">\uD83D\uDCC4</button>';
                    h += '<button onclick="devCodeReview(\''+art.id+'\',\''+s.id+'\')" class="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200">\uD83D\uDD0D</button>';
                    h += '</div></div>';
                    if(art.review_ergebnis) {
                        var rv = art.review_ergebnis;
                        h += '<div class="mt-1 flex items-center gap-2 text-[10px]"><span class="font-bold '+(rv.score>=80?'text-green-600':'text-orange-600')+'">'+rv.score+'/100</span> <span class="'+(rv.empfehlung==='freigegeben'?'text-green-600':'text-orange-600')+'">'+(rv.empfehlung==='freigegeben'?'\u2705':'\uD83D\uDD04')+'</span></div>';
                    }
                    h += '</div>';
                });
                h += '</div>';
                // Code-Chat
                h += '<div class="border border-emerald-200 rounded-lg p-3 bg-white">';
                h += '<h5 class="text-xs font-bold text-emerald-600 uppercase mb-2">\uD83D\uDCAC Code-Chat</h5>';
                h += '<div id="devCodeChatMsgs" class="max-h-40 overflow-y-auto space-y-1 mb-2"></div>';
                h += '<div class="flex gap-2">';
                h += '<select id="devCodeChatArtifact" class="text-xs border border-gray-200 rounded px-2 py-1">';
                uniqueArts.forEach(function(a) { h += '<option value="'+a.id+'">'+a.dateiname+'</option>'; });
                h += '</select>';
                h += '<input id="devCodeChatInput" type="text" placeholder="Frage zum Code..." class="flex-1 px-2 py-1 border border-gray-200 rounded text-xs" onkeypress="if(event.key===\'Enter\')devSendCodeChat(\''+s.id+'\')">';
                h += '<button onclick="devSendCodeChat(\''+s.id+'\')" id="devBtnCodeChat" class="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-semibold">\uD83D\uDCAC</button>';
                h += '</div></div>';
            }
            // Deploy section
                h += '<div class="mt-4 border-t border-emerald-200 pt-3">';
                h += '<div class="flex items-center justify-between mb-2">';
                h += '<h5 class="text-xs font-bold text-emerald-600 uppercase">\uD83D\uDE80 Deployment</h5>';
                h += '<div class="flex gap-1">';
                h += '<select id="devDeployBranch" class="text-[10px] border border-gray-200 rounded px-2 py-0.5"><option value="main">main</option><option value="dev-pipeline">dev-pipeline (feature)</option></select>';
                h += '</div></div>';
                // Deployment History
                h += '<div id="devDeployHistory" class="mb-2"></div>';
                // Deploy button
                h += '<div class="flex gap-2">';
                h += '<button onclick="devDeployCode(\''+s.id+'\',false)" id="devBtnDeploy" class="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-sm font-bold hover:from-emerald-600 hover:to-teal-700 shadow-sm disabled:opacity-50" title="Alle finalen Dateien auf GitHub pushen">\uD83D\uDE80 Auf GitHub pushen</button>';
                h += '<button onclick="devDeployCode(\''+s.id+'\',true)" class="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200" title="Nur ausgewaehlte Dateien">\u2699\uFE0F Auswahl</button>';
                h += '</div>';
                h += '<p class="text-[9px] text-gray-400 mt-1">Pusht die Code-Artifacts auf GitHub \u2192 Vercel baut automatisch.</p>';
                h += '</div>';
            h += '</div>'; // END TAB CODE
        }

        h += '</div>'; // END tab content wrapper
        h += '</div>'; // END RIGHT COLUMN
        h += '</div>'; // END SPLIT LAYOUT

        content.innerHTML = h;
        if(document.getElementById('devMockupChatHistory')) loadMockupChatHistory(subId);
        if(document.getElementById('devDeployHistory')) loadDeployHistory(subId);
    } catch(err) {
        content.innerHTML = '<div class="text-center py-8 text-red-400">Fehler: '+err.message+'</div>';
    }
}

// Rückfragen beantworten + KI neu analysieren
export async function submitDevRueckfragenAntwort(subId, currentStatus) {
    try {
        // Nur der Einreicher darf Rückfragen beantworten
        var subResp = await _sb().from('dev_submissions').select('user_id').eq('id', subId).single();
        if(!subResp.data || subResp.data.user_id !== _sbUser().id) {
            _showToast('Nur der Einreicher kann Rückfragen beantworten.', 'error');
            return;
        }
        var allgAntwort = (document.getElementById('devRFAntwortAllg')||{}).value || '';

        // Einzelne Rückfragen-Antworten sammeln
        var einzelAntworten = [];
        for(var i = 0; i < 20; i++) {
            var el = document.getElementById('devRFAntwort_' + i);
            if(!el) break;
            if(el.value.trim()) einzelAntworten.push({ index: i, antwort: el.value.trim() });
        }

        if(!allgAntwort.trim() && einzelAntworten.length === 0) {
            alert('Bitte gib mindestens eine Antwort ein.');
            return;
        }

        // Sofort: Formular durch Analyse-Hinweis ersetzen
        var rfForm = document.getElementById('devRueckfragenForm');
        if(rfForm) {
            rfForm.innerHTML = '<div class="text-center py-8"><div class="inline-flex items-center space-x-3 bg-purple-50 border border-purple-200 rounded-xl px-6 py-4"><div class="animate-spin w-6 h-6 border-3 border-purple-400 border-t-transparent rounded-full"></div><div><p class="font-semibold text-purple-700">⏳ Antworten gespeichert – wird erneut analysiert...</p><p class="text-sm text-purple-500 mt-1">Die KI verarbeitet deine Antworten. Das dauert ca. 15-30 Sekunden.</p></div></div></div>';
        }

        // Antworten als Kommentare speichern
        var antwortText = '';
        if(einzelAntworten.length > 0) {
            antwortText = einzelAntworten.map(function(a) { return 'Antwort: ' + a.antwort; }).join('\n');
        }
        if(allgAntwort.trim()) {
            antwortText += (antwortText ? '\n\n' : '') + allgAntwort.trim();
        }

        await _sb().from('dev_kommentare').insert({
            submission_id: subId,
            user_id: _sbUser().id,
            typ: 'antwort',
            inhalt: antwortText
        });

        // KI-Rückfragen als beantwortet markieren (in der KI-Analyse)
        if(einzelAntworten.length > 0) {
            var kiResp = await _sb().from('dev_ki_analysen').select('id, rueckfragen')
                .eq('submission_id', subId).order('version', {ascending:false}).limit(1);
            if(kiResp.data && kiResp.data[0]) {
                var rfragen = kiResp.data[0].rueckfragen || [];
                einzelAntworten.forEach(function(a) {
                    if(rfragen[a.index]) {
                        rfragen[a.index].beantwortet = true;
                        rfragen[a.index].antwort = a.antwort;
                    }
                });
                await _sb().from('dev_ki_analysen').update({ rueckfragen: rfragen }).eq('id', kiResp.data[0].id);
            }
        }

        try {
            await _sb().functions.invoke('dev-ki-analyse', {
                body: { submission_id: subId, mode: 'reanalyse' }
            });
        } catch(kiErr) {
            console.warn('KI-Re-Analyse Fehler:', kiErr);
            await _sb().from('dev_submissions').update({ status: 'im_ideenboard' }).eq('id', subId);
        }

        // Detail neu laden
        openDevDetail(subId);
        renderDevPipeline();
    } catch(err) {
        alert('Fehler: ' + (err.message||err));
    }
}

// HQ-Entscheidung aus dem Detail-Modal (inkl. "Freigabe mit Änderungen")
export async function devHQDecisionFromDetail(subId, ergebnis) {
    // Owner-Check: Nur Owner darf freigeben oder ablehnen
    var isOwner = (currentRoles||[]).indexOf('owner') !== -1;
    if(!isOwner && ['freigabe','freigabe_mit_aenderungen','ablehnung'].indexOf(ergebnis) !== -1) {
        _showToast('Nur der Owner kann Ideen freigeben oder ablehnen.', 'error');
        return;
    }
    var kommentar = '';
    var aenderungswuensche = '';

    if(ergebnis === 'freigabe_mit_aenderungen') {
        aenderungswuensche = prompt('Welche Änderungen sollen am Konzept vorgenommen werden?');
        if(!aenderungswuensche) return;
        kommentar = prompt('Optionaler Kommentar zur Freigabe:') || '';
    } else if(ergebnis === 'rueckfragen') {
        kommentar = prompt('Welche Rückfragen hast du?');
        if(!kommentar) return;
    } else if(ergebnis === 'ablehnung') {
        kommentar = prompt('Begründung für die Ablehnung:');
        if(!kommentar) return;
    }

    var statusMap = {
        freigabe: 'freigegeben',
        freigabe_mit_aenderungen: 'freigegeben',
        rueckfragen: 'hq_rueckfragen',
        ablehnung: 'abgelehnt',
        spaeter: 'geparkt', geschlossen: 'geschlossen'
    };

    try {
        // Entscheidung speichern
        await _sb().from('dev_entscheidungen').insert({
            submission_id: subId,
            entscheider_id: _sbUser().id,
            ergebnis: ergebnis,
            kommentar: kommentar || null,
            aenderungswuensche: aenderungswuensche || null
        });

        // Kommentar
        if(kommentar) {
            await _sb().from('dev_kommentare').insert({
                submission_id: subId,
                user_id: _sbUser().id,
                typ: ergebnis === 'rueckfragen' ? 'rueckfrage' : 'kommentar',
                inhalt: kommentar
            });
        }

        // Bei "Freigabe mit Änderungen": KI Konzept überarbeiten lassen
        if(ergebnis === 'freigabe_mit_aenderungen') {
            await _sb().from('dev_kommentare').insert({
                submission_id: subId,
                user_id: _sbUser().id,
                typ: 'kommentar',
                inhalt: '✏️ Änderungswünsche: ' + aenderungswuensche
            });

            // Status temporär setzen, dann KI-Update starten
            await _sb().from('dev_submissions').update({
                status: 'ki_pruefung',
                hq_entschieden_at: new Date().toISOString()
            }).eq('id', subId);

            var loadingDiv = document.createElement('div');
            loadingDiv.className = 'fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-3 rounded-lg shadow-lg z-[60] animate-pulse';
            loadingDiv.id = 'devReanalyseLoading';
            loadingDiv.textContent = '⏳ Konzept wird überarbeitet...';
            document.body.appendChild(loadingDiv);

            try {
                await _sb().functions.invoke('dev-ki-analyse', {
                    body: { submission_id: subId, mode: 'update_konzept' }
                });
            } catch(kiErr) {
                console.warn('KI-Konzept-Update Fehler:', kiErr);
                await _sb().from('dev_submissions').update({ status: 'freigegeben' }).eq('id', subId);
            }

            var loadEl = document.getElementById('devReanalyseLoading');
            if(loadEl) loadEl.remove();
        } else {
            // Normaler Status-Update
            var newStatus = statusMap[ergebnis] || 'im_ideenboard';
            var updates = { status: newStatus };
            if(ergebnis === 'freigabe') {
                updates.freigegeben_at = new Date().toISOString();
                updates.hq_entschieden_at = new Date().toISOString();
                updates.status = 'konzept_wird_erstellt';
            }
            await _sb().from('dev_submissions').update(updates).eq('id', subId);

            // Trigger KI-Konzepterstellung bei Freigabe
            if(ergebnis === 'freigabe') {
                _showToast('✅ Freigegeben! Entwicklungskonzept wird erstellt...', 'success');
                _sb().functions.invoke('dev-ki-analyse', {
                    body: { submission_id: subId, mode: 'konzept' }
                }).then(function() {
                    renderDevPipeline(); if(typeof renderEntwIdeen==="function") renderEntwIdeen();
                });

                // Auto-create roadmap entry
                var sub = devSubmissions.find(function(s){ return s.id === subId; });
                if(sub) {
                    var now = new Date();
                    var qMonth = now.getMonth() + 3; // target ~1 quarter out
                    var qYear = now.getFullYear() + (qMonth > 11 ? 1 : 0);
                    qMonth = qMonth > 11 ? qMonth - 12 : qMonth;
                    var quarter = 'Q' + (Math.floor(qMonth/3)+1) + ' ' + qYear;
                    _sb().from('dev_roadmap').insert({
                        titel: sub.titel || sub.beschreibung || 'Freigegebene Idee',
                        beschreibung: sub.beschreibung || '',
                        kategorie: sub.kategorie || 'feature',
                        modul_key: sub.modul_key || null,
                        status: 'geplant',
                        prioritaet: sub.ki_typ === 'bug' ? 'hoch' : 'mittel',
                        aufwand: sub.geschaetzter_aufwand || 'M',
                        ziel_quartal: quarter,
                        submission_id: subId,
                        sortierung: 999
                    });
                }
            }
        }

        // Update local cache so UI reflects change immediately
        var localSub = devSubmissions.find(function(s){ return s.id === subId; });
        if(localSub) {
            if(ergebnis === 'freigabe') localSub.status = 'konzept_wird_erstellt';
            else if(ergebnis === 'geschlossen') localSub.status = 'geschlossen';
            else { var _sm = {freigabe_mit_aenderungen:'ki_pruefung',rueckfragen:'hq_rueckfragen',ablehnung:'abgelehnt',spaeter:'geparkt'}; localSub.status = _sm[ergebnis] || localSub.status; }
        }

        closeDevDetail();
        await loadDevSubmissions(true);
        renderDevPipeline(); if(typeof renderEntwIdeen==="function") renderEntwIdeen();
        if(typeof renderEntwSteuerung === 'function') renderEntwSteuerung();
        // Reload fresh data from DB after short delay (KI-Analyse etc.)
        setTimeout(function(){ loadDevSubmissions(); }, 1500);
    } catch(err) {
        alert('Fehler: ' + (err.message||err));
        var loadEl = document.getElementById('devReanalyseLoading');
        if(loadEl) loadEl.remove();
    }
}

// Kommentar schreiben
export async function submitDevKommentar(subId) {
    var input = document.getElementById('devKommentarInput');
    var btn = document.getElementById('devKommentarBtn');
    if(!input || !input.value.trim()) { if(input) input.focus(); return; }
    var text = input.value.trim();
    input.value = '';
    input.disabled = true;
    if(btn) { btn.disabled = true; btn.textContent = '⏳'; }
    try {
        var resp = await _sb().from('dev_kommentare').insert({
            submission_id: subId,
            user_id: _sbUser().id,
            typ: 'kommentar',
            inhalt: text
        });
        if(resp.error) throw resp.error;

        // Notify submitter if commenter is different
        var sub = devSubmissions.find(function(s){ return s.id === subId; });
        if(sub && sub.user_id !== _sbUser().id) {
            await _sb().from('dev_notifications').insert({
                user_id: sub.user_id,
                submission_id: subId,
                typ: 'kommentar',
                titel: '💬 Neuer Kommentar zu deiner Idee',
                inhalt: text.substring(0, 100) + (text.length > 100 ? '...' : '')
            });
        }

        await openDevDetail(subId);
    } catch(err) {
        console.error('Comment error:', err);
        alert('Fehler beim Kommentar: ' + (err.message||err));
        var input2 = document.getElementById('devKommentarInput');
        if(input2) input2.value = text;
    }
    var input3 = document.getElementById('devKommentarInput');
    var btn3 = document.getElementById('devKommentarBtn');
    if(input3) input3.disabled = false;
    if(btn3) { btn3.disabled = false; btn3.textContent = 'Senden'; }
}

export function closeDevDetail() {
    var modal = document.getElementById('devDetailModal');
    if(modal) modal.classList.add('hidden');
}



// Strangler Fig
// ============================================
// VISION EDITOR (Owner only)
// ============================================
export async function renderDevVision() {
    var c = document.getElementById('entwTabVision');
    if(!c) return;
    var isOwner = (currentRoles||[]).indexOf('owner') !== -1;
    if(!isOwner) { c.innerHTML = '<p class="text-gray-400 py-8 text-center">Nur für Owner sichtbar.</p>'; return; }

    c.innerHTML = '<div class="text-center py-8"><div class="animate-spin w-6 h-6 border-2 border-vit-orange border-t-transparent rounded-full mx-auto"></div><p class="text-sm text-gray-400 mt-2">Vision wird geladen...</p></div>';

    try {
        var resp = await _sb().from('portal_vision').select('*').order('updated_at', {ascending: false}).limit(1);
        var vision = resp.data && resp.data[0] ? resp.data[0] : null;
        var inhalt = vision ? vision.inhalt : '';
        var updatedAt = vision && vision.updated_at ? new Date(vision.updated_at).toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'noch nie';

        var h = '';
        h += '<div class="max-w-3xl mx-auto">';
        h += '<div class="vit-card p-6 mb-6">';
        h += '<div class="flex items-center justify-between mb-4">';
        h += '<div><h2 class="text-lg font-bold text-gray-800">🔭 Portal-Vision</h2>';
        h += '<p class="text-xs text-gray-400 mt-1">Zuletzt aktualisiert: '+updatedAt+'</p></div>';
        h += '</div>';
        h += '<p class="text-sm text-gray-500 mb-4">Beschreibe die Vision für das vit:bikes Portal. Die KI nutzt diesen Text, um den <b>Vision-Fit-Score</b> bei jeder neuen Idee zu berechnen. Je klarer die Vision, desto besser die Bewertungen.</p>';
        h += '<textarea id="devVisionTextarea" class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vit-orange focus:border-vit-orange" rows="12" placeholder="Beschreibe hier die Vision für das Portal...\n\nBeispiel:\nDas vit:bikes Partner Portal soll der zentrale digitale Arbeitsplatz für alle Franchise-Partner werden. Es vereint Verkauf, Controlling, Kommunikation und Wissensmanagement in einer Plattform. Ziel ist es, den Arbeitsalltag so zu vereinfachen, dass sich Partner auf das konzentrieren können, was sie am besten können: Fahrräder verkaufen und Kunden begeistern.\n\nFokus-Themen:\n- Automatisierung wiederkehrender Aufgaben\n- Echtzeit-Transparenz über alle Standorte\n- Einfache Bedienbarkeit für alle Altersgruppen\n- Mobile-First für den Einsatz im Laden">'+_escH(inhalt)+'</textarea>';
        h += '<div class="flex items-center justify-between mt-4">';
        h += '<p class="text-xs text-gray-400" id="devVisionCharCount">'+(inhalt.length)+' Zeichen</p>';
        h += '<button onclick="saveDevVision()" class="px-6 py-2.5 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">💾 Vision speichern</button>';
        h += '</div>';
        h += '</div>';

        // Info box
        h += '<div class="vit-card p-5 bg-blue-50 border border-blue-200">';
        h += '<h3 class="text-sm font-bold text-blue-800 mb-2">ℹ️ Wie wird die Vision verwendet?</h3>';
        h += '<ul class="text-xs text-blue-700 space-y-1.5">';
        h += '<li>• Bei jeder neuen Idee bewertet die KI den <b>Vision-Fit-Score</b> (0-100) basierend auf diesem Text</li>';
        h += '<li>• Ideen die gut zur Vision passen erhalten höhere Scores und werden im Board priorisiert</li>';
        h += '<li>• Die Vision hilft der KI auch bei der Konzepterstellung und Risikoeinschätzung</li>';
        h += '<li>• Aktualisiere die Vision regelmäßig wenn sich strategische Prioritäten ändern</li>';
        h += '</ul></div>';
        h += '</div>';

        c.innerHTML = h;

        // Live character count
        var ta = document.getElementById('devVisionTextarea');
        var cc = document.getElementById('devVisionCharCount');
        if(ta && cc) {
            ta.addEventListener('input', function() { cc.textContent = ta.value.length + ' Zeichen'; });
        }
    } catch(err) {
        c.innerHTML = '<div class="text-center py-8 text-red-500">Fehler: '+(err.message||err)+'</div>';
    }
}

export async function saveDevVision() {
    var ta = document.getElementById('devVisionTextarea');
    if(!ta) return;
    var inhalt = ta.value.trim();

    try {
        // Check if vision row exists
        var resp = await _sb().from('portal_vision').select('id').limit(1);
        if(resp.data && resp.data.length > 0) {
            await _sb().from('portal_vision').update({
                inhalt: inhalt,
                updated_at: new Date().toISOString(),
                updated_by: _sbUser().id
            }).eq('id', resp.data[0].id);
        } else {
            await _sb().from('portal_vision').insert({
                inhalt: inhalt,
                updated_by: _sbUser().id
            });
        }
        _showToast('Vision gespeichert! Die KI nutzt sie ab sofort für neue Bewertungen.', 'success');
    } catch(err) {
        _showToast('Fehler beim Speichern: '+(err.message||err), 'error');
    }
}

// ============================================
// DEV NOTIFICATIONS
// ============================================
var devNotifications = [];
var devNotifOpen = false;

export async function loadDevNotifications() {
    try {
        var resp = await _sb().from('dev_notifications')
            .select('*, dev_submissions(titel)')
            .eq('user_id', _sbUser().id)
            .order('created_at', {ascending: false})
            .limit(20);
        devNotifications = resp.data || [];
        updateDevNotifBadge();
    } catch(err) { console.warn('Notif load:', err); }
}

function updateDevNotifBadge() {
    var unread = devNotifications.filter(function(n){ return !n.gelesen; }).length;
    var badge = document.getElementById('devNotifBadge');
    if(badge) {
        badge.textContent = unread > 9 ? '9+' : unread;
        badge.style.display = unread > 0 ? '' : 'none';
    }
}

export function toggleDevNotifications() {
    devNotifOpen = !devNotifOpen;
    var panel = document.getElementById('devNotifPanel');
    if(!panel) {
        // Create panel dynamically
        panel = document.createElement('div');
        panel.id = 'devNotifPanel';
        panel.className = 'fixed top-14 right-4 w-80 max-h-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-[55] overflow-hidden';
        panel.style.display = 'none';
        document.body.appendChild(panel);
        // Close on click outside
        document.addEventListener('click', function(e) {
            if(devNotifOpen && !panel.contains(e.target) && e.target.id !== 'devNotifBtn' && !e.target.closest('#devNotifBtn')) {
                devNotifOpen = false;
                panel.style.display = 'none';
            }
        });
    }
    if(devNotifOpen) {
        renderDevNotifPanel();
        panel.style.display = '';
    } else {
        panel.style.display = 'none';
    }
}

function renderDevNotifPanel() {
    var panel = document.getElementById('devNotifPanel');
    if(!panel) return;
    var unread = devNotifications.filter(function(n){ return !n.gelesen; }).length;
    var h = '<div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">';
    h += '<h3 class="text-sm font-bold text-gray-800">🔔 Benachrichtigungen</h3>';
    if(unread > 0) h += '<button onclick="markAllDevNotifsRead()" class="text-xs text-vit-orange hover:underline">Alle gelesen</button>';
    h += '</div>';
    if(devNotifications.length === 0) {
        h += '<div class="text-center py-8 text-gray-400"><p class="text-2xl mb-1">🔔</p><p class="text-xs">Keine Benachrichtigungen</p></div>';
    } else {
        h += '<div class="max-h-72 overflow-y-auto">';
        devNotifications.forEach(function(n) {
            var dt = new Date(n.created_at);
            var ago = _timeAgo(dt);
            h += '<div onclick="openDevNotif(\''+n.id+'\',\''+n.submission_id+'\')" class="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 '+(n.gelesen?'opacity-60':'')+'">';
            h += '<div class="flex items-start gap-2">';
            if(!n.gelesen) h += '<span class="w-2 h-2 rounded-full bg-vit-orange flex-shrink-0 mt-1.5"></span>';
            else h += '<span class="w-2 h-2 flex-shrink-0"></span>';
            h += '<div class="flex-1 min-w-0">';
            h += '<p class="text-sm font-semibold text-gray-800 truncate">'+n.titel+'</p>';
            if(n.inhalt) h += '<p class="text-xs text-gray-500 truncate">'+n.inhalt+'</p>';
            h += '<p class="text-[10px] text-gray-400 mt-0.5">'+ago+'</p>';
            h += '</div></div></div>';
        });
        h += '</div>';
    }
    panel.innerHTML = h;
}

export async function openDevNotif(notifId, subId) {
    // Mark as read
    await _sb().from('dev_notifications').update({gelesen: true}).eq('id', notifId);
    devNotifications.forEach(function(n){ if(n.id === notifId) n.gelesen = true; });
    updateDevNotifBadge();
    toggleDevNotifications(); // close panel
    if(subId) openDevDetail(subId);
}

export async function markAllDevNotifsRead() {
    var unreadIds = devNotifications.filter(function(n){ return !n.gelesen; }).map(function(n){ return n.id; });
    if(unreadIds.length === 0) return;
    await _sb().from('dev_notifications').update({gelesen: true}).in('id', unreadIds);
    devNotifications.forEach(function(n){ n.gelesen = true; });
    updateDevNotifBadge();
    renderDevNotifPanel();
}

function _timeAgo(date) {
    var s = Math.floor((Date.now() - date.getTime()) / 1000);
    if(s < 60) return 'gerade eben';
    if(s < 3600) return Math.floor(s/60) + ' Min.';
    if(s < 86400) return Math.floor(s/3600) + ' Std.';
    if(s < 604800) return Math.floor(s/86400) + ' Tage';
    return date.toLocaleDateString('de-DE');
}

// CSV Export
export function exportDevCSV() {
    if(!devSubmissions || devSubmissions.length === 0) { _showToast('Keine Daten zum Exportieren', 'error'); return; }
    var header = ['Titel','Status','KI-Typ','KI-Bereich','Kategorie','Aufwand','Votes','Kommentare','Erstellt','Beschreibung'];
    var rows = devSubmissions.map(function(s) {
        return [
            '"'+(s.titel||'').replace(/"/g,'""')+'"',
            s.status || '',
            s.ki_typ || '',
            s.ki_bereich || '',
            s.kategorie || '',
            s.geschaetzter_aufwand || '',
            (s.dev_votes||[]).length,
            (s.dev_kommentare||[]).length,
            s.created_at ? new Date(s.created_at).toLocaleDateString('de-DE') : '',
            '"'+(s.beschreibung||'').replace(/"/g,'""').substring(0,200)+'"'
        ].join(';');
    });
    var csv = '\uFEFF' + header.join(';') + '\n' + rows.join('\n');
    var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'dev-pipeline-export-'+new Date().toISOString().split('T')[0]+'.csv';
    a.click();
    URL.revokeObjectURL(url);
    _showToast('📥 CSV exportiert ('+devSubmissions.length+' Einträge)', 'success');
}

// === Load HQ users into MA selects ===
// === KI-Konzept-Chat: iterativ Konzept verfeinern ===
export async function sendDevKonzeptChat(subId) {
    var input = document.getElementById('devKonzeptChatInput');
    var btn = document.getElementById('devKonzeptChatBtn');
    var history = document.getElementById('devKonzeptChatHistory');
    if(!input || !input.value.trim()) return;
    var feedback = input.value.trim();
    input.value = '';
    if(btn) { btn.disabled = true; btn.textContent = '⏳'; }

    // Show user message in chat
    if(history) {
        history.innerHTML += '<div class="bg-white rounded p-2 text-xs border border-gray-200"><span class="font-semibold text-gray-700">Du:</span> '+_escH(feedback)+'</div>';
        history.scrollTop = history.scrollHeight;
    }

    try {
        // Save feedback as comment
        await _sb().from('dev_kommentare').insert({
            submission_id: subId, user_id: _sbUser().id, typ: 'kommentar',
            inhalt: '💬 Konzept-Feedback: ' + feedback
        });

        // Call EF with konzept_chat mode
        var token = (await _sb().auth.getSession()).data.session.access_token;
        var resp = await fetch(_sbUrl() + '/functions/v1/dev-ki-analyse', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: subId, mode: 'konzept_chat', feedback: feedback })
        });
        var data = await resp.json();
        if(data.error) throw new Error(data.error);

        // Show KI response
        if(history) {
            history.innerHTML += '<div class="bg-purple-50 rounded p-2 text-xs border border-purple-100"><span class="font-semibold text-purple-700">KI:</span> '+(data.antwort || 'Konzept wurde aktualisiert.')+'</div>';
            history.scrollTop = history.scrollHeight;
        }
        _showToast('✅ Konzept aktualisiert (v' + (data.version || '?') + ')', 'success');
    } catch(e) {
        if(history) {
            history.innerHTML += '<div class="bg-red-50 rounded p-2 text-xs border border-red-100"><span class="text-red-600">❌ Fehler: '+_escH(e.message)+'</span></div>';
        }
        _showToast('Fehler: ' + e.message, 'error');
    } finally {
        if(btn) { btn.disabled = false; btn.textContent = '💬'; }
    }
}

async function _loadDevHQUsers(sub) {
    try {
        var resp = await _sb().from('users').select('id, name').eq('is_hq', true).order('name');
        var users = resp.data || [];
        ['devKonzeptMASelect','devEntwicklerMASelect'].forEach(function(selId) {
            var sel = document.getElementById(selId);
            if(!sel) return;
            var field = selId === 'devKonzeptMASelect' ? 'konzept_ma' : 'entwickler_ma';
            var currentVal = sub[field] || '';
            users.forEach(function(u) {
                var opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = u.name;
                if(u.id === currentVal) opt.selected = true;
                sel.appendChild(opt);
            });
        });
        // For non-owner view, show names
        if(sub.konzept_ma) {
            var km = users.find(function(u){return u.id===sub.konzept_ma;});
            var kmEl = document.getElementById('devKonzeptMAName');
            if(kmEl && km) kmEl.textContent = km.name;
        }
        if(sub.entwickler_ma) {
            var em = users.find(function(u){return u.id===sub.entwickler_ma;});
            var emEl = document.getElementById('devEntwicklerMAName');
            if(emEl && em) emEl.textContent = em.name;
        }
    } catch(e) { console.warn('HQ users load error', e); }
}

// === Update MA assignment (Owner only) ===
export async function updateDevMA(subId, field) {
    var selId = field === 'konzept_ma' ? 'devKonzeptMASelect' : 'devEntwicklerMASelect';
    var sel = document.getElementById(selId);
    if(!sel) return;
    var val = sel.value || null;
    try {
        var upd = {}; upd[field] = val;
        var resp = await _sb().from('dev_submissions').update(upd).eq('id', subId);
        if(resp.error) throw resp.error;
        _showToast(field === 'konzept_ma' ? 'Konzept-MA zugewiesen' : 'Entwickler zugewiesen', 'success');
    } catch(e) {
        _showToast('Fehler: ' + e.message, 'error');
    }
}

// === Update deadline (Owner only) ===
export async function updateDevDeadline(subId) {
    var el = document.getElementById('devDeadlineInput');
    if(!el) return;
    var val = el.value || null;
    try {
        var resp = await _sb().from('dev_submissions').update({ deadline: val }).eq('id', subId);
        if(resp.error) throw resp.error;
        _showToast('Deadline ' + (val ? 'gesetzt: ' + new Date(val).toLocaleDateString('de-DE') : 'entfernt'), 'success');
    } catch(e) {
        _showToast('Fehler: ' + e.message, 'error');
    }
}

// === Re-analyse submission (re-score with current vision) ===
export async function reanalyseDevSubmission(subId) {
    // Find the button and replace with status indicator
    var btn = event ? event.target.closest('button') : null;
    var container = btn ? btn.parentElement : null;

    if(container) {
        container.innerHTML = '<div id="devKiStatus" class="w-full">' +
            '<div class="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">' +
            '<div class="flex items-center gap-3 mb-3">' +
            '<div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center animate-pulse"><span class="text-white text-sm">🤖</span></div>' +
            '<div><h4 class="font-bold text-purple-800 text-sm">KI-Analyse läuft...</h4>' +
            '<p class="text-xs text-purple-500" id="devKiStatusText">Beschreibung wird gelesen...</p></div>' +
            '</div>' +
            '<div class="w-full bg-purple-100 rounded-full h-2 overflow-hidden">' +
            '<div id="devKiProgress" class="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000" style="width:10%"></div>' +
            '</div>' +
            '</div></div>';
    }

    // Animate progress steps
    var steps = [
        { pct: '25%', text: 'Portal-Module werden geprüft...' },
        { pct: '45%', text: 'Vision-Fit wird berechnet...' },
        { pct: '65%', text: 'Machbarkeit & Aufwand schätzen...' },
        { pct: '80%', text: 'Empfehlung wird erstellt...' },
    ];
    var stepIdx = 0;
    var stepTimer = setInterval(function() {
        if(stepIdx >= steps.length) { clearInterval(stepTimer); return; }
        var bar = document.getElementById('devKiProgress');
        var txt = document.getElementById('devKiStatusText');
        if(bar) bar.style.width = steps[stepIdx].pct;
        if(txt) txt.textContent = steps[stepIdx].text;
        stepIdx++;
    }, 3000);

    try {
        var token = (await _sb().auth.getSession()).data.session.access_token;
        var resp = await fetch(_sbUrl() + '/functions/v1/dev-ki-analyse', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: subId, mode: 'reanalyse' })
        });
        var data = await resp.json();
        clearInterval(stepTimer);
        if(data.error) throw new Error(data.error);

        // Show success
        var bar = document.getElementById('devKiProgress');
        var txt = document.getElementById('devKiStatusText');
        if(bar) bar.style.width = '100%';
        if(txt) txt.textContent = '✅ Analyse abgeschlossen!';

        var statusDiv = document.getElementById('devKiStatus');
        if(statusDiv) {
            var vf = data.vision_fit || '?';
            var typ = data.ki_typ === 'bug' ? '🐛 Bug' : data.ki_typ === 'feature' ? '✨ Feature' : '💡 Idee';
            statusDiv.innerHTML = '<div class="bg-green-50 border border-green-200 rounded-xl p-4">' +
                '<div class="flex items-center gap-3 mb-2">' +
                '<span class="text-2xl">✅</span>' +
                '<div><h4 class="font-bold text-green-800 text-sm">KI-Analyse abgeschlossen!</h4>' +
                '<p class="text-xs text-green-600">' + typ + ' · Vision-Fit: ' + vf + '/100</p></div>' +
                '</div>' +
                '<button onclick="openDevDetail(\'' + subId + '\')" class="mt-2 w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">📋 Ergebnis anzeigen</button>' +
                '</div>';
        }
        _showToast('✅ KI-Analyse fertig – Vision-Fit: ' + (data.vision_fit || '?'), 'success');
    } catch(e) {
        clearInterval(stepTimer);
        var statusDiv = document.getElementById('devKiStatus');
        if(statusDiv) {
            statusDiv.innerHTML = '<div class="bg-red-50 border border-red-200 rounded-xl p-4">' +
                '<div class="flex items-center gap-3">' +
                '<span class="text-2xl">❌</span>' +
                '<div><h4 class="font-bold text-red-800 text-sm">Analyse fehlgeschlagen</h4>' +
                '<p class="text-xs text-red-600">' + e.message + '</p></div>' +
                '</div>' +
                '<button onclick="reanalyseDevSubmission(\'' + subId + '\')" class="mt-2 w-full py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200">🔄 Erneut versuchen</button>' +
                '</div>';
        }
        _showToast('Fehler: ' + e.message, 'error');
    }
}

// === Upload attachment to existing submission ===
export async function uploadDevAttachment(subId) {
    var input = document.getElementById('devAttachInput');
    if(!input || !input.files || input.files.length === 0) return;
    _showToast('📎 Lade Anhänge hoch...', 'info');
    try {
        // Get current attachments
        var subResp = await _sb().from('dev_submissions').select('attachments').eq('id', subId).single();
        var currentAttachments = (subResp.data && subResp.data.attachments) || [];
        var newAttachments = [];
        for(var i = 0; i < input.files.length; i++) {
            var file = input.files[i];
            if(file.size > 10 * 1024 * 1024) { _showToast('Datei zu groß (max 10MB): ' + file.name, 'error'); continue; }
            var ts = Date.now();
            var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            var path = subId + '/' + ts + '_' + safeName;
            var upResp = await _sb().storage.from('dev-attachments').upload(path, file, { contentType: file.type, upsert: false });
            if(upResp.error) { console.error('Upload error:', upResp.error); continue; }
            var pubUrl = _sb().storage.from('dev-attachments').getPublicUrl(path).data.publicUrl;
            newAttachments.push({ name: file.name, type: file.type, size: file.size, url: pubUrl, uploaded_at: new Date().toISOString() });
        }
        if(newAttachments.length > 0) {
            var allAttachments = currentAttachments.concat(newAttachments);
            var updResp = await _sb().from('dev_submissions').update({ attachments: allAttachments }).eq('id', subId);
            if(updResp.error) throw updResp.error;
            _showToast('📎 ' + newAttachments.length + ' Anhang/Anhänge hochgeladen', 'success');
            openDevDetail(subId);
        }
        input.value = '';
    } catch(e) {
        _showToast('Fehler beim Upload: ' + e.message, 'error');
    }
}


// ============================================================
// PHASE 3d/5: Workflow Status Advancement
// ============================================================

export async function devAdvanceStatus(subId, newStatus) {
    var labels = {in_entwicklung:'In Entwicklung nehmen',beta_test:'Beta-Test starten',release_geplant:'Release freigeben',in_planung:'In Planung',geparkt:'Parken',ausgerollt:'Ausrollen'};
    if(!confirm((labels[newStatus]||newStatus) + '?')) return;
    try {
        var updates = { status: newStatus };
        if(newStatus === 'beta_test') updates.beta_start_at = new Date().toISOString();
        if(newStatus === 'ausgerollt') updates.ausgerollt_at = new Date().toISOString();
        var resp = await _sb().from('dev_submissions').update(updates).eq('id', subId);
        if(resp.error) throw resp.error;

        // If moving to beta: auto-link feature flag
        if(newStatus === 'beta_test') {
            var subResp = await _sb().from('dev_submissions').select('feature_flag_key, titel').eq('id', subId).single();
            var sub = subResp.data;
            if(sub && sub.feature_flag_key) {
                // Enable flag for beta testers
                await _sb().from('feature_flags').upsert({
                    flag_key: sub.feature_flag_key,
                    enabled: true,
                    scope: 'beta_tester',
                    rollout_percent: 0,
                    beschreibung: 'Beta-Test: ' + (sub.titel || subId)
                }, { onConflict: 'flag_key' });
            }
        }

        _showToast('\u2705 Status: ' + (labels[newStatus]||newStatus), 'success');
        // Close detail modal and refresh board
        closeDevDetail();
        await loadDevSubmissions(true);
        // Re-render current view
        var activeTab = document.querySelector('.entw-tab-btn.border-vit-orange, .entw-tab-btn[style*="border-color"]');
        if(document.getElementById('entwTabSteuerung') && document.getElementById('entwTabSteuerung').style.display !== 'none') {
            renderEntwSteuerung();
        } else if(document.getElementById('entwTabIdeen') && document.getElementById('entwTabIdeen').style.display !== 'none') {
            renderEntwIdeen();
        }
    } catch(e) {
        _showToast('Fehler: ' + e.message, 'error');
    }
}

// ============================================================
// PHASE 5: Beta-Feedback
// ============================================================

export async function submitDevBetaFeedback(subId) {
    var rating = parseInt((document.getElementById('devBetaRating')||{}).value || '0');
    var feedback = (document.getElementById('devBetaText')||{}).value || '';
    var bugs = (document.getElementById('devBetaBugs')||{}).value || '';
    if(!rating && !feedback.trim() && !bugs.trim()) { _showToast('Bitte gib eine Bewertung oder Feedback ein.', 'error'); return; }
    try {
        var resp = await _sb().from('dev_beta_feedback').insert({
            submission_id: subId, user_id: _sbUser().id,
            bewertung: rating || null, feedback: feedback.trim() || null, bugs: bugs.trim() || null
        });
        if(resp.error) throw resp.error;
        // Also add as comment for visibility
        await _sb().from('dev_kommentare').insert({
            submission_id: subId, user_id: _sbUser().id, typ: 'kommentar',
            inhalt: '\U0001f9ea Beta-Feedback: ' + (rating ? rating + '/5\u2b50 ' : '') + (feedback || '') + (bugs ? '\n\U0001f41b Bugs: ' + bugs : '')
        });
        _showToast('\U0001f4e8 Beta-Feedback gespeichert!', 'success');
        openDevDetail(subId);
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export async function devShowBetaFeedbackSummary(subId) {
    try {
        var resp = await _sb().from('dev_beta_feedback').select('*, users:user_id(name)').eq('submission_id', subId).order('created_at', {ascending: false});
        var feedbacks = resp.data || [];
        if(feedbacks.length === 0) { _showToast('Noch kein Beta-Feedback vorhanden.', 'info'); return; }
        var avgRating = feedbacks.filter(function(f){return f.bewertung;}).reduce(function(a,f){return a+f.bewertung;},0) / (feedbacks.filter(function(f){return f.bewertung;}).length || 1);
        var bugsCount = feedbacks.filter(function(f){return f.bugs;}).length;
        var html = '<div class="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onclick="this.remove()">';
        html += '<div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onclick="event.stopPropagation()">';
        html += '<h3 class="text-lg font-bold mb-4">\U0001f4ca Beta-Feedback (' + feedbacks.length + ')</h3>';
        html += '<div class="grid grid-cols-3 gap-3 mb-4">';
        html += '<div class="text-center p-3 bg-yellow-50 rounded-lg"><p class="text-2xl font-bold text-yellow-600">' + avgRating.toFixed(1) + '</p><p class="text-xs text-gray-500">\u00d8 Bewertung</p></div>';
        html += '<div class="text-center p-3 bg-blue-50 rounded-lg"><p class="text-2xl font-bold text-blue-600">' + feedbacks.length + '</p><p class="text-xs text-gray-500">Feedbacks</p></div>';
        html += '<div class="text-center p-3 bg-red-50 rounded-lg"><p class="text-2xl font-bold text-red-600">' + bugsCount + '</p><p class="text-xs text-gray-500">Bug-Meldungen</p></div>';
        html += '</div><div class="space-y-3">';
        feedbacks.forEach(function(f) {
            var name = f.users ? f.users.name : 'Unbekannt';
            var dt = new Date(f.created_at).toLocaleDateString('de-DE');
            html += '<div class="border border-gray-100 rounded-lg p-3">';
            html += '<div class="flex justify-between items-center mb-1"><span class="text-sm font-semibold">' + _escH(name) + '</span><span class="text-xs text-gray-400">' + dt + '</span></div>';
            if(f.bewertung) html += '<p class="text-sm">' + '\u2b50'.repeat(f.bewertung) + '\u2606'.repeat(5-f.bewertung) + '</p>';
            if(f.feedback) html += '<p class="text-sm text-gray-700 mt-1">' + _escH(f.feedback) + '</p>';
            if(f.bugs) html += '<p class="text-sm text-red-600 mt-1">\U0001f41b ' + _escH(f.bugs) + '</p>';
            html += '</div>';
        });
        html += '</div><button onclick="this.closest(\'.fixed\').remove()" class="mt-4 w-full px-4 py-2 bg-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300">Schlie\u00dfen</button>';
        html += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

// ============================================================
// PHASE 6: Rollout mit Auto-Release-Note + Wissensartikel
// ============================================================

export async function devRollout(subId) {
    if(!confirm('Feature jetzt f\u00fcr alle User ausrollen?\n\nDie KI generiert automatisch eine Release-Note und pr\u00fcft, ob ein Wissensartikel n\u00f6tig ist.')) return;
    _showToast('\U0001f680 Rollout l\u00e4uft + KI generiert Dokumentation...', 'info');
    try {
        // 1. Update status
        await _sb().from('dev_submissions').update({
            status: 'ausgerollt', ausgerollt_at: new Date().toISOString()
        }).eq('id', subId);

        // 2. Enable feature flag for all (100%)
        var subResp = await _sb().from('dev_submissions').select('feature_flag_key').eq('id', subId).single();
        if(subResp.data && subResp.data.feature_flag_key) {
            await _sb().from('feature_flags').update({
                scope: 'alle', rollout_percent: 100, enabled: true
            }).eq('flag_key', subResp.data.feature_flag_key);
        }

        // 3. Generate release docs via EF
        var token = (await _sb().auth.getSession()).data.session.access_token;
        var resp = await fetch(_sbUrl() + '/functions/v1/dev-ki-analyse', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: subId, mode: 'release_docs' })
        });
        var data = await resp.json();
        if(data.error) console.warn('Release docs generation error:', data.error);
        else _showToast('\u2705 Ausgerollt! Release-Note generiert.', 'success');

        openDevDetail(subId);
    } catch(e) {
        _showToast('Status aktualisiert, Doku-Fehler: ' + e.message, 'error');
        openDevDetail(subId);
    }
}

// ============================================================
// PHASE 5: Beta-Tester Verwaltung (im System-Tab)
// ============================================================

export async function renderDevBetaTester() {
    var c = document.getElementById('devBetaTesterContent');
    if(!c) return;
    try {
        var resp = await _sb().from('dev_beta_tester').select('*, users:user_id(name, email)').order('created_at');
        var testers = resp.data || [];
        var h = '<div class="flex justify-between items-center mb-4">';
        h += '<h3 class="text-sm font-bold text-gray-700">\U0001f9ea Beta-Tester (' + testers.filter(function(t){return t.aktiv;}).length + ' aktiv)</h3>';
        h += '<button onclick="devAddBetaTester()" class="px-3 py-1.5 bg-pink-500 text-white rounded-lg text-xs font-semibold hover:bg-pink-600">+ Tester hinzuf\u00fcgen</button>';
        h += '</div>';
        if(testers.length === 0) {
            h += '<p class="text-sm text-gray-400 text-center py-6">Noch keine Beta-Tester definiert.</p>';
        } else {
            h += '<div class="space-y-2">';
            testers.forEach(function(t) {
                var name = t.users ? t.users.name : 'Unbekannt';
                var email = t.users ? t.users.email : '';
                h += '<div class="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100">';
                h += '<div><p class="text-sm font-semibold">' + _escH(name) + '</p><p class="text-xs text-gray-400">' + _escH(email) + '</p></div>';
                h += '<div class="flex items-center gap-2">';
                h += '<span class="text-xs rounded px-2 py-0.5 ' + (t.aktiv ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500') + '">' + (t.aktiv ? 'Aktiv' : 'Inaktiv') + '</span>';
                h += '<button onclick="devToggleBetaTester(\'' + t.id + '\',' + (!t.aktiv) + ')" class="text-xs px-2 py-1 rounded ' + (t.aktiv ? 'bg-gray-100 hover:bg-gray-200' : 'bg-green-100 hover:bg-green-200') + '">' + (t.aktiv ? 'Deaktivieren' : 'Aktivieren') + '</button>';
                h += '</div></div>';
            });
            h += '</div>';
        }
        c.innerHTML = h;
    } catch(e) { c.innerHTML = '<p class="text-red-400 text-sm">Fehler: ' + e.message + '</p>'; }
}

export async function devAddBetaTester() {
    var email = prompt('E-Mail des neuen Beta-Testers:');
    if(!email) return;
    try {
        var userResp = await _sb().from('users').select('id, name').eq('email', email.trim()).single();
        if(!userResp.data) { _showToast('Kein User mit dieser E-Mail gefunden.', 'error'); return; }
        var resp = await _sb().from('dev_beta_tester').upsert({
            user_id: userResp.data.id, aktiv: true, hinzugefuegt_von: _sbUser().id
        }, { onConflict: 'user_id' });
        if(resp.error) throw resp.error;
        _showToast('\u2705 ' + userResp.data.name + ' als Beta-Tester hinzugef\u00fcgt!', 'success');
        renderDevBetaTester();
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export async function devToggleBetaTester(id, aktiv) {
    try {
        await _sb().from('dev_beta_tester').update({ aktiv: aktiv }).eq('id', id);
        _showToast(aktiv ? 'Beta-Tester aktiviert' : 'Beta-Tester deaktiviert', 'success');
        renderDevBetaTester();
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export function devShowCreateRelease() {
    var f = document.getElementById('devCreateReleaseForm');
    if(f) f.classList.toggle('hidden');
}

export async function devSaveRelease() {
    var typ = document.getElementById('relTyp').value;
    var titel = (document.getElementById('relTitel').value || '').trim();
    var inhalt = (document.getElementById('relInhalt').value || '').trim();
    var version = (document.getElementById('relVersion').value || '').trim();
    
    if(!titel) { _showToast('Bitte Titel eingeben.', 'error'); return; }
    if(!inhalt) { _showToast('Bitte Inhalt eingeben.', 'error'); return; }
    
    try {
        var resp = await _sb().from('dev_release_docs').insert({
            typ: typ,
            titel: titel,
            inhalt: inhalt,
            version: version || null,
            freigegeben: true,
            freigegeben_von: _sbUser().id,
            freigegeben_at: new Date().toISOString(),
            ki_generiert: false
        });
        if(resp.error) throw resp.error;
        _showToast('📣 Release-Note veröffentlicht!', 'success');
        renderEntwReleases();
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

// ============================================================
// PHASE 5b: Feedback-Anfragen
// ============================================================

export async function devShowFeedbackForm(subId) {
    // Load rollen for targeting
    var rollenResp = await _sb().from('rollen').select('*').order('sortierung');
    var rollen = rollenResp.data || [];
    var usersResp = await _sb().from('users').select('id, name, email, is_hq').eq('status','aktiv').order('name');
    var allUsers = usersResp.data || [];
    
    var html = '<div id="devFeedbackFormOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">';
    html += '<div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">';
    html += '<div class="flex justify-between items-center mb-4"><h3 class="text-lg font-bold text-gray-800">🗳 Feedback einholen</h3>';
    html += '<button onclick="document.getElementById(\'devFeedbackFormOverlay\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>';
    
    // Frage
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">Frage / Kontext</label>';
    html += '<textarea id="fbFormFrage" placeholder="Was möchtest du wissen? z.B.: Wie bewertet ihr diese Feature-Idee?" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3" rows="2"></textarea>';
    
    // Multiple Choice Optionen
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">Multiple-Choice Optionen <span class="text-gray-400 font-normal">(min. 2)</span></label>';
    html += '<div id="fbFormOptionen" class="space-y-1.5 mb-1">';
    html += '<input type="text" class="fb-option w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Option 1, z.B.: Sehr wichtig">';
    html += '<input type="text" class="fb-option w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Option 2, z.B.: Nice to have">';
    html += '<input type="text" class="fb-option w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Option 3 (optional)">';
    html += '</div>';
    html += '<button onclick="var d=document.getElementById(\'fbFormOptionen\');var inp=document.createElement(\'input\');inp.type=\'text\';inp.className=\'fb-option w-full px-3 py-2 border border-gray-200 rounded-lg text-sm\';inp.placeholder=\'Weitere Option...\';d.appendChild(inp)" class="text-xs text-amber-600 hover:text-amber-800 mb-3 block">+ Option hinzufügen</button>';
    
    // Zielgruppe: Rollen
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">Zielgruppe: Rollen</label>';
    html += '<div class="flex flex-wrap gap-1.5 mb-3" id="fbFormRollen">';
    rollen.forEach(function(r) {
        var icon = r.ebene === 'hq' ? '🏢' : '🏪';
        html += '<label class="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1 hover:bg-amber-50 cursor-pointer border border-gray-100 transition">';
        html += '<input type="checkbox" value="'+r.name+'" class="fb-rolle text-amber-500 rounded">';
        html += '<span class="text-xs">'+icon+' '+_escH(r.label)+'</span></label>';
    });
    html += '</div>';
    
    // Zielgruppe: Einzelne Personen
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">Einzelne Personen <span class="text-gray-400 font-normal">(optional)</span></label>';
    html += '<select id="fbFormUsers" multiple class="w-full border border-gray-200 rounded-lg text-sm mb-3 p-2" size="4">';
    allUsers.forEach(function(u) {
        var tag = u.is_hq ? ' [HQ]' : '';
        html += '<option value="'+u.id+'">'+_escH(u.name)+' ('+_escH(u.email)+')'+tag+'</option>';
    });
    html += '</select>';
    html += '<p class="text-[10px] text-gray-400 mb-3">Strg/Cmd gedrückt halten für Mehrfachauswahl</p>';
    
    // Deadline
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">Deadline</label>';
    var defaultDeadline = new Date(); defaultDeadline.setDate(defaultDeadline.getDate() + 7);
    var dlStr = defaultDeadline.toISOString().split('T')[0];
    html += '<input type="date" id="fbFormDeadline" value="'+dlStr+'" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-4">';
    
    // Submit
    html += '<button onclick="devCreateFeedbackAnfrage(\''+subId+'\')" class="w-full px-4 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition">🗳 Feedback-Anfrage senden</button>';
    html += '</div></div>';
    
    document.body.insertAdjacentHTML('beforeend', html);
}

export async function devCreateFeedbackAnfrage(subId) {
    try {
        var frage = document.getElementById('fbFormFrage').value.trim();
        if(!frage) { _showToast('Bitte Frage eingeben.', 'error'); return; }
        
        // Optionen sammeln
        var optInputs = document.querySelectorAll('.fb-option');
        var optionen = [];
        optInputs.forEach(function(inp) { if(inp.value.trim()) optionen.push(inp.value.trim()); });
        if(optionen.length < 2) { _showToast('Mindestens 2 Optionen angeben.', 'error'); return; }
        
        // Rollen sammeln
        var rollenChecked = [];
        document.querySelectorAll('.fb-rolle:checked').forEach(function(cb) { rollenChecked.push(cb.value); });
        
        // User IDs sammeln
        var userSelect = document.getElementById('fbFormUsers');
        var userIds = [];
        for(var i=0; i<userSelect.selectedOptions.length; i++) {
            userIds.push(userSelect.selectedOptions[i].value);
        }
        
        if(rollenChecked.length === 0 && userIds.length === 0) {
            _showToast('Bitte mindestens eine Rolle oder Person auswählen.', 'error'); return;
        }
        
        var deadline = document.getElementById('fbFormDeadline').value || null;
        
        var resp = await _sb().from('dev_feedback_anfragen').insert({
            submission_id: subId,
            erstellt_von: _sbUser().id,
            frage: frage,
            optionen: optionen,
            zielgruppe_rollen: rollenChecked,
            zielgruppe_user_ids: userIds,
            deadline: deadline
        }).select().single();
        
        if(resp.error) throw resp.error;
        
        // Benachrichtigungen erstellen
        var targetUsers = new Set(userIds);
        if(rollenChecked.length > 0) {
            var urResp = await _sb().from('user_rollen').select('user_id, rollen!inner(name)').in('rollen.name', rollenChecked);
            (urResp.data || []).forEach(function(ur) { targetUsers.add(ur.user_id); });
        }
        
        // Get submission title for notification
        var sub = devSubmissions.find(function(s){ return s.id === subId; });
        var titel = sub ? sub.titel : 'Idee';
        
        targetUsers.forEach(function(uid) {
            _sb().from('dev_notifications').insert({
                user_id: uid,
                submission_id: subId,
                typ: 'feedback_anfrage',
                titel: '🗳 Feedback gefragt: ' + titel,
                inhalt: frage,
                link_to: subId
            });
        });
        
        _showToast('🗳 Feedback-Anfrage an ' + targetUsers.size + ' Personen gesendet!', 'success');
        var overlay = document.getElementById('devFeedbackFormOverlay');
        if(overlay) overlay.remove();
        
        // Reload detail
        openDevDetail(subId);
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export async function devSubmitFeedbackAntwort(anfrageId) {
    try {
        var choiceEl = document.querySelector('input[name="fbChoice_'+anfrageId+'"]:checked');
        var auswahl = choiceEl ? parseInt(choiceEl.value) : null;
        var kommentar = (document.getElementById('fbKommentar_'+anfrageId) || {}).value || '';
        
        if(auswahl === null && !kommentar.trim()) {
            _showToast('Bitte Option wählen oder Kommentar schreiben.', 'error'); return;
        }
        
        var resp = await _sb().from('dev_feedback_antworten').insert({
            anfrage_id: anfrageId,
            user_id: _sbUser().id,
            auswahl: auswahl,
            kommentar: kommentar.trim() || null
        });
        
        if(resp.error) throw resp.error;
        _showToast('📨 Danke für dein Feedback!', 'success');
        
        // Reload current detail
        var detailId = document.querySelector('#devDetailContent')?.dataset?.subId;
        if(detailId) openDevDetail(detailId);
    } catch(e) {
        if(e.message && e.message.indexOf('unique') !== -1) {
            _showToast('Du hast bereits Feedback gegeben.', 'info');
        } else {
            _showToast('Fehler: ' + e.message, 'error');
        }
    }
}

export async function devCloseFeedbackAnfrage(anfrageId) {
    if(!confirm('Feedback-Anfrage schließen?')) return;
    try {
        await _sb().from('dev_feedback_anfragen').update({ status: 'abgeschlossen' }).eq('id', anfrageId);
        _showToast('Anfrage geschlossen.', 'success');
        var detailId = document.querySelector('#devDetailContent')?.dataset?.subId;
        if(detailId) openDevDetail(detailId);
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

// ============================================================
// PHASE 6: Release-Docs anzeigen
// ============================================================

export async function renderDevReleaseDocs(subId) {
    try {
        var resp = await _sb().from('dev_release_docs').select('*').eq('submission_id', subId).order('created_at');
        var docs = resp.data || [];
        if(docs.length === 0) return '';
        var h = '<div class="border-2 border-green-200 rounded-lg p-4 mb-4 bg-green-50">';
        h += '<h4 class="text-sm font-bold text-green-700 mb-3">\U0001f4dd Release-Dokumentation</h4>';
        docs.forEach(function(d) {
            var icon = d.typ === 'release_note' ? '\U0001f4e3' : '\U0001f4da';
            var label = d.typ === 'release_note' ? 'Release-Note' : 'Wissensartikel';
            h += '<div class="bg-white rounded-lg p-3 border border-green-100 mb-2">';
            h += '<div class="flex justify-between items-center mb-1">';
            h += '<span class="text-xs font-semibold">' + icon + ' ' + label + (d.freigegeben ? ' \u2705' : ' (Entwurf)') + '</span>';
            if(!d.freigegeben) h += '<button onclick="devApproveReleaseDoc(\'' + d.id + '\')" class="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600">Freigeben</button>';
            h += '</div>';
            h += '<p class="text-sm font-semibold text-gray-800">' + _escH(d.titel) + '</p>';
            h += '<p class="text-xs text-gray-600 mt-1 whitespace-pre-wrap">' + _escH(d.inhalt).substring(0, 300) + (d.inhalt.length > 300 ? '...' : '') + '</p>';
            h += '</div>';
        });
        h += '</div>';
        return h;
    } catch(e) { return ''; }
}

export async function devApproveReleaseDoc(docId) {
    try {
        await _sb().from('dev_release_docs').update({
            freigegeben: true, freigegeben_von: _sbUser().id, freigegeben_at: new Date().toISOString()
        }).eq('id', docId);
        _showToast('\u2705 Dokument freigegeben!', 'success');
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}



// === CODE-COPILOT FUNCTIONS (Phase 4a) ===

async function devCodeGenerate(subId) {
    var btn = document.getElementById('devBtnCodeGen');
    if(btn) { btn.disabled = true; btn.innerHTML = '<span class="animate-spin inline-block mr-1">⏳</span> KI generiert...'; }
    try {
        var resp = await _sb().functions.invoke('dev-ki-analyse', {
            body: { submission_id: subId, mode: 'code_generate' }
        });
        if(resp.error) throw resp.error;
        var d = resp.data;
        if(d.error) throw new Error(d.error);
        _showToast('✅ '+(d.artifacts?.length||0)+' Datei(en) generiert!', 'success');
        openDevDetail(subId);
    } catch(err) {
        console.error('Code-Generate:', err);
        _showToast('❌ '+err.message, 'error');
        if(btn) { btn.disabled = false; btn.innerHTML = '🤖 Code generieren'; }
    }
}

async function devCodeReview(artifactId, subId) {
    _showToast('🔍 Review wird gestartet...', 'info');
    try {
        var resp = await _sb().functions.invoke('dev-ki-analyse', {
            body: { submission_id: subId, mode: 'code_review', artifact_id: artifactId }
        });
        if(resp.error) throw resp.error;
        var d = resp.data;
        if(d.error) throw new Error(d.error);
        _showToast('✅ Review fertig! Score: '+(d.score||'?')+'/100', 'success');
        openDevDetail(subId);
    } catch(err) {
        console.error('Code-Review:', err);
        _showToast('❌ '+err.message, 'error');
    }
}

function devCodeViewFile(artifactId) {
    // Code im Modal anzeigen
    (async function() {
        try {
            var resp = await _sb().from('dev_code_artifacts').select('*').eq('id', artifactId).single();
            if(resp.error) throw resp.error;
            var art = resp.data;
            var lines = (art.code_inhalt || '').split('\n');
            var langColors = {javascript:'#f7df1e',sql:'#e97d0a',typescript:'#3178c6',html:'#e34c26',css:'#264de4'};
            var lc = langColors[art.sprache] || '#6b7280';

            // Einfaches Code-Viewer Modal
            var overlay = document.createElement('div');
            overlay.id = 'devCodeViewOverlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:20px';
            overlay.onclick = function(e) { if(e.target === overlay) overlay.remove(); };

            var box = document.createElement('div');
            box.style.cssText = 'background:#1e1e1e;border-radius:12px;width:90%;max-width:900px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden';

            // Toolbar
            var toolbar = '<div style="background:#2d2d2d;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #404040">';
            toolbar += '<div style="display:flex;align-items:center;gap:12px"><span style="background:'+lc+';color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase">'+art.sprache+'</span>';
            toolbar += '<span style="color:#e0e0e0;font-size:13px;font-weight:600;font-family:monospace">'+art.dateiname+'</span>';
            toolbar += '<span style="color:#858585;font-size:11px">v'+art.version+' · '+(art.code_zeilen||lines.length)+' Zeilen</span></div>';
            toolbar += '<div style="display:flex;gap:8px"><button onclick="navigator.clipboard.writeText(document.getElementById(\'devCodeRaw\').textContent);this.textContent=\'✅ Kopiert\'" style="color:#ccc;background:#404040;border:none;padding:4px 12px;border-radius:4px;font-size:12px;cursor:pointer">📋 Kopieren</button>';
            toolbar += '<button onclick="document.getElementById(\'devCodeViewOverlay\').remove()" style="color:#ccc;background:none;border:none;font-size:18px;cursor:pointer">✕</button></div></div>';

            // Code
            var codeHtml = '<div style="overflow:auto;flex:1;padding:0"><table style="border-collapse:collapse;width:100%"><tbody>';
            lines.forEach(function(line, i) {
                codeHtml += '<tr><td style="color:#858585;text-align:right;padding:0 12px 0 8px;border-right:1px solid #404040;user-select:none;white-space:nowrap;vertical-align:top;font-size:13px;line-height:1.6;font-family:monospace">'+(i+1)+'</td>';
                codeHtml += '<td style="padding:0 16px;white-space:pre;overflow-x:auto;font-size:13px;line-height:1.6;font-family:monospace;color:#d4d4d4"><code>'+_escH(line||' ')+'</code></td></tr>';
            });
            codeHtml += '</tbody></table></div>';
            codeHtml += '<pre id="devCodeRaw" style="display:none">'+_escH(art.code_inhalt)+'</pre>';

            box.innerHTML = toolbar + codeHtml;
            overlay.appendChild(box);
            document.body.appendChild(overlay);
        } catch(err) {
            _showToast('❌ '+err.message, 'error');
        }
    })();
}

async function devSendCodeChat(subId) {
    var artSelect = document.getElementById('devCodeChatArtifact');
    var input = document.getElementById('devCodeChatInput');
    var btn = document.getElementById('devBtnCodeChat');
    if(!artSelect || !input) return;
    var artifactId = artSelect.value;
    var msg = input.value.trim();
    if(!msg) return;

    // User-Nachricht anzeigen
    var chatDiv = document.getElementById('devCodeChatMsgs');
    if(chatDiv) {
        chatDiv.innerHTML += '<div style="margin-left:auto;max-width:85%;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;font-size:12px"><span style="color:#6b7280">👤</span> '+_escH(msg)+'</div>';
        chatDiv.innerHTML += '<div id="devCodeChatLoading" style="max-width:85%;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;font-size:12px"><span class="animate-pulse" style="color:#9ca3af">🤖 KI denkt nach...</span></div>';
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }
    input.value = '';
    if(btn) { btn.disabled = true; btn.textContent = '⏳'; }

    try {
        var resp = await _sb().functions.invoke('dev-ki-analyse', {
            body: { submission_id: subId, mode: 'code_chat', artifact_id: artifactId, feedback: msg }
        });
        if(resp.error) throw resp.error;
        var d = resp.data;
        if(d.error) throw new Error(d.error);

        // Loading entfernen
        var ld = document.getElementById('devCodeChatLoading');
        if(ld) ld.remove();

        // KI-Antwort
        var antwort = d.antwort || 'Keine Antwort.';
        if(d.code_aktualisiert && d.new_artifact) {
            antwort += '\n\n✅ Code aktualisiert → v'+d.new_artifact.version+' ('+d.new_artifact.zeilen+' Zeilen)';
        }
        if(chatDiv) {
            chatDiv.innerHTML += '<div style="max-width:85%;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;font-size:12px"><span style="color:#6b7280">🤖</span> '+_escH(antwort).replace(/\n/g,'<br>')+'</div>';
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }

        // Bei Code-Update: Sektion nach 2s neu laden
        if(d.code_aktualisiert) {
            setTimeout(function() { openDevDetail(subId); }, 2000);
        }
    } catch(err) {
        var ld = document.getElementById('devCodeChatLoading');
        if(ld) ld.remove();
        if(chatDiv) {
            chatDiv.innerHTML += '<div style="max-width:85%;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;font-size:12px">❌ '+_escH(err.message)+'</div>';
        }
    }
    if(btn) { btn.disabled = false; btn.textContent = '💬'; }
}



// ========== KI PRIORISIERUNG ==========
export async function runDevKIPrioritize() {
    var btn = document.getElementById('btnDevPrio');
    var resultDiv = document.getElementById('devPrioResult');
    if(!btn || !resultDiv) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="animate-spin">⏳</span><span>KI analysiert...</span>';
    resultDiv.className = 'hidden';

    try {
        var session = await window.supabase.auth.getSession();
        var token = session?.data?.session?.access_token;
        if(!token) throw new Error('Nicht angemeldet');

        var resp = await fetch(window.SUPABASE_URL + '/functions/v1/dev-ki-analyse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ mode: 'prioritize' })
        });
        var data = await resp.json();
        if(!resp.ok || !data.success) throw new Error(data.error || 'Fehler');

        // Render result
        var h = '';
        if(data.zusammenfassung) {
            h += '<div class="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 mb-4">';
            h += '<div class="flex items-start gap-3">';
            h += '<span class="text-2xl">🧠</span>';
            h += '<div>';
            h += '<h4 class="font-bold text-gray-800 text-sm mb-1">KI-Empfehlung</h4>';
            h += '<p class="text-sm text-gray-600">'+data.zusammenfassung+'</p>';
            h += '</div>';
            h += '</div>';
            h += '</div>';
        }

        if(data.empfehlung && data.empfehlung.length > 0) {
            h += '<div class="space-y-2">';
            data.empfehlung.forEach(function(e, i) {
                var actionColors = {
                    'sofort_starten': 'bg-red-100 text-red-700 border-red-200',
                    'einplanen': 'bg-blue-100 text-blue-700 border-blue-200',
                    'spaeter': 'bg-gray-100 text-gray-600 border-gray-200',
                    'pruefen': 'bg-yellow-100 text-yellow-700 border-yellow-200'
                };
                var actionLabels = {
                    'sofort_starten': '🔥 Sofort starten',
                    'einplanen': '📅 Einplanen',
                    'spaeter': '⏸ Später',
                    'pruefen': '🔍 Prüfen'
                };
                var impactIcons = { 'hoch': '🔴', 'mittel': '🟡', 'niedrig': '🟢' };
                var borderClass = i === 0 ? 'border-2 border-purple-300 shadow-md' : 'border border-gray-200';
                var bgClass = i === 0 ? 'bg-purple-50' : 'bg-white';

                h += '<div class="'+bgClass+' '+borderClass+' rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow" onclick="openDevDetail(\''+e.submission_id+'\')">';
                h += '<div class="flex items-center gap-3">';
                h += '<div class="flex-shrink-0 w-8 h-8 rounded-full '+(i===0?'bg-purple-600':'bg-gray-400')+' text-white flex items-center justify-center text-sm font-bold">'+e.rang+'</div>';
                h += '<div class="flex-1 min-w-0">';
                h += '<div class="flex items-center gap-2 flex-wrap">';
                h += '<h4 class="font-semibold text-gray-800 text-sm truncate">'+e.titel+'</h4>';
                var ac = actionColors[e.empfohlene_aktion] || 'bg-gray-100 text-gray-600';
                h += '<span class="text-[10px] font-semibold rounded-full px-2 py-0.5 '+ac+'">'+(actionLabels[e.empfohlene_aktion]||e.empfohlene_aktion)+'</span>';
                h += '<span class="text-[10px] text-gray-400">'+(impactIcons[e.geschaetzter_impact]||'')+' Impact: '+e.geschaetzter_impact+'</span>';
                h += '</div>';
                h += '<p class="text-xs text-gray-500 mt-0.5">'+e.begruendung+'</p>';
                h += '</div>';
                h += '<div class="flex-shrink-0 text-right">';
                h += '<div class="text-lg font-bold '+(e.priority_score >= 80?'text-purple-600':e.priority_score >= 60?'text-blue-600':'text-gray-500')+'">'+e.priority_score+'</div>';
                h += '<div class="text-[9px] text-gray-400 uppercase">Score</div>';
                h += '</div>';
                h += '</div>';
                h += '</div>';
            });
            h += '</div>';
        }

        if(data.quick_wins && data.quick_wins.length > 0) {
            h += '<div class="mt-3 flex items-center gap-2 text-xs text-gray-500">';
            h += '<span>⚡ Quick Wins: '+data.quick_wins.length+' Ideen mit hohem Impact bei niedrigem Aufwand</span>';
            h += '</div>';
        }

        resultDiv.innerHTML = h;
        resultDiv.className = '';
        btn.innerHTML = '<span>🧠</span><span>Erneut priorisieren</span>';
        btn.disabled = false;
        if(typeof _showToast === 'function') _showToast('KI-Priorisierung abgeschlossen!', 'success');
    } catch(err) {
        console.error('KI-Prio error:', err);
        btn.innerHTML = '<span>🧠</span><span>Priorisierung starten</span>';
        btn.disabled = false;
        if(typeof _showToast === 'function') _showToast('Fehler: ' + err.message, 'error');
    }
}



// === NOTIZEN SAVE ===
export async function saveDevNotizen(subId) {
    var textarea = document.getElementById('devNotizen');
    if(!textarea) return;
    var notizen = textarea.value;
    try {
        await _sb().from('dev_submissions').update({ notizen: notizen }).eq('id', subId);
    } catch(e) {
        console.warn('Notizen save error:', e);
    }
}



// === DEPLOY FUNCTIONS ===
export async function devDeployCode(subId, selectMode) {
    var btn = document.getElementById('devBtnDeploy');
    var branch = document.getElementById('devDeployBranch');
    var targetBranch = branch ? branch.value : 'main';
    
    // Load artifacts
    var resp = await _sb().from('dev_code_artifacts').select('*').eq('submission_id', subId).order('dateiname').order('version', {ascending: false});
    var arts = resp.data || [];
    // Unique latest per file
    var seen = {};
    var unique = arts.filter(function(a) { if(seen[a.dateiname]) return false; seen[a.dateiname] = true; return true; });
    
    if(unique.length === 0) { alert('Keine Code-Artifacts vorhanden.'); return; }
    
    var toDeploy = unique;
    
    if(selectMode) {
        // Show selection dialog
        var fileList = unique.map(function(a) {
            return a.dateiname + ' (v' + a.version + ', ' + (a.status || 'entwurf') + ')';
        }).join('\n');
        var selected = prompt('Welche Dateien deployen? (Nummern kommagetrennt)\n\n' + unique.map(function(a, i) { return (i+1) + '. ' + a.dateiname + ' (v' + a.version + ')'; }).join('\n'));
        if(!selected) return;
        var indices = selected.split(',').map(function(s) { return parseInt(s.trim()) - 1; });
        toDeploy = indices.filter(function(i) { return i >= 0 && i < unique.length; }).map(function(i) { return unique[i]; });
        if(toDeploy.length === 0) { alert('Keine gueltige Auswahl.'); return; }
    }
    
    var fileNames = toDeploy.map(function(a) { return a.dateiname; }).join(', ');
    if(!confirm('\uD83D\uDE80 Deployment auf "' + targetBranch + '"\n\n' + toDeploy.length + ' Datei(en):\n' + fileNames + '\n\nFortsetzung? Vercel baut nach dem Push automatisch.')) return;
    
    if(btn) { btn.disabled = true; btn.textContent = '\u23F3 Pushe auf GitHub...'; }
    
    try {
        var payload = {
            submission_id: subId,
            mode: 'deploy',
            artifact_ids: toDeploy.map(function(a) { return a.id; }),
            branch: targetBranch
        };
        var res = await fetch(_sb().supabaseUrl + '/functions/v1/dev-deploy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await _sb().auth.getSession()).data.session.access_token },
            body: JSON.stringify(payload)
        });
        var data = await res.json();
        if(data.error) throw new Error(data.error);
        
        // Success
        var commitLink = data.commit_url ? '<a href="' + data.commit_url + '" target="_blank" class="text-blue-600 underline">' + data.commit_sha.substring(0, 8) + '</a>' : data.commit_sha.substring(0, 8);
        
        var histDiv = document.getElementById('devDeployHistory');
        if(histDiv) {
            histDiv.innerHTML = '<div class="bg-green-50 border border-green-200 rounded-lg p-3 text-xs">' +
                '<span class="font-bold text-green-700">\u2705 Deployment erfolgreich!</span>' +
                '<p class="text-gray-600 mt-1">' + data.files_pushed + ' Datei(en) auf <b>' + data.branch + '</b> gepusht</p>' +
                '<p class="text-gray-500 mt-0.5">Commit: ' + commitLink + '</p>' +
                '<p class="text-gray-400 mt-0.5">Vercel baut automatisch...</p>' +
                '</div>';
        }
        
        if(btn) { btn.textContent = '\u2705 Deployed!'; btn.className = btn.className.replace('from-emerald-500 to-teal-600','from-green-400 to-green-500'); }
        
        // Reload detail after 2s
        setTimeout(function() { openDevDetail(subId); }, 2000);
        
    } catch(e) {
        alert('\u274C Deployment fehlgeschlagen: ' + e.message);
        if(btn) { btn.disabled = false; btn.textContent = '\uD83D\uDE80 Auf GitHub pushen'; }
    }
}

export async function loadDeployHistory(subId) {
    var container = document.getElementById('devDeployHistory');
    if(!container) return;
    try {
        var resp = await fetch(_sb().supabaseUrl + '/functions/v1/dev-deploy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await _sb().auth.getSession()).data.session.access_token },
            body: JSON.stringify({ submission_id: subId, mode: 'status' })
        });
        var data = await resp.json();
        if(!data.deployments || data.deployments.length === 0) {
            container.innerHTML = '<p class="text-[10px] text-gray-400">Noch kein Deployment.</p>';
            return;
        }
        var html = '<div class="space-y-1">';
        data.deployments.forEach(function(d) {
            var statusIcon = d.status === 'deployed' ? '\u2705' : d.status === 'rolled_back' ? '\u26A0\uFE0F' : d.status === 'failed' ? '\u274C' : '\u23F3';
            html += '<div class="flex items-center justify-between text-[10px] bg-gray-50 rounded px-2 py-1">';
            html += '<span>'+statusIcon+' '+d.branch+' · '+(d.commit_sha?d.commit_sha.substring(0,8):'...')+'</span>';
            html += '<span class="text-gray-400">'+new Date(d.deployed_at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span>';
            html += '</div>';
        });
        html += '</div>';
        container.innerHTML = html;
    } catch(e) { container.innerHTML = ''; }
}

// === MOCKUP CHAT FUNCTIONS ===
var _mockupChatAttachments = [];
var _mockupChatMediaRecorder = null;
var _mockupChatAudioChunks = [];

export async function loadMockupChatHistory(subId) {
    var container = document.getElementById('devMockupChatHistory');
    if (!container) return;
    try {
        var resp = await _sb().from('dev_mockup_chat').select('*').eq('submission_id', subId).order('created_at', {ascending: true});
        var msgs = resp.data || [];
        if (msgs.length === 0) {
            container.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">Starte einen Chat ueber das Design — die KI hilft dir beim Mockup!</p>';
            return;
        }
        var html = '';
        msgs.forEach(function(m) {
            var isUser = m.rolle === 'user';
            var align = isUser ? 'justify-end' : 'justify-start';
            var bg = isUser ? 'bg-pink-50 border-pink-200' : 'bg-white border-gray-200';
            var icon = isUser ? '👤' : '🤖';
            var time = new Date(m.created_at).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'});
            html += '<div class="flex '+align+'">';
            html += '<div class="max-w-[85%] border rounded-lg px-3 py-2 '+bg+'">';
            html += '<div class="flex items-center gap-1 mb-1"><span class="text-xs">'+icon+'</span><span class="text-[10px] text-gray-400">'+time+'</span>';
            if (m.mockup_version) html += '<span class="text-[10px] bg-pink-200 text-pink-700 px-1.5 rounded-full ml-1">Mockup v'+m.mockup_version+'</span>';
            html += '</div>';
            // Show attachments
            if (m.attachments && m.attachments.length > 0) {
                m.attachments.forEach(function(a) {
                    if (a.type && a.type.startsWith('image/')) {
                        html += '<img src="'+a.url+'" class="max-w-[200px] rounded mb-1 cursor-pointer" onclick="window.open(this.src)" />';
                    } else if (a.type && a.type.startsWith('audio/')) {
                        html += '<div class="text-xs text-gray-500 mb-1">🎤 Sprachnotiz</div>';
                    }
                });
            }
            html += '<p class="text-sm text-gray-700 whitespace-pre-wrap">'+m.nachricht+'</p>';
            html += '</div></div>';
        });
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    } catch(e) {
        console.warn('loadMockupChat error:', e);
        container.innerHTML = '<p class="text-xs text-red-400 text-center py-2">Fehler beim Laden</p>';
    }
}

export async function devMockupChatSend(subId) {
    var input = document.getElementById('devMockupChatInput');
    var btn = document.getElementById('devMockupChatSendBtn');
    if (!input) return;
    var text = input.value.trim();
    if (!text && _mockupChatAttachments.length === 0) return;
    
    // Disable input
    input.disabled = true;
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    
    // Add user message to chat immediately
    var container = document.getElementById('devMockupChatHistory');
    if (container) {
        var placeholder = container.querySelector('.text-gray-400');
        if (placeholder && placeholder.textContent.includes('Starte')) placeholder.remove();
        var msgDiv = document.createElement('div');
        msgDiv.className = 'flex justify-end';
        var attHtml = '';
        _mockupChatAttachments.forEach(function(a) {
            if (a.type.startsWith('image/')) attHtml += '<img src="'+a.url+'" class="max-w-[200px] rounded mb-1" />';
            if (a.type.startsWith('audio/')) attHtml += '<div class="text-xs text-gray-500 mb-1">🎤 Sprachnotiz</div>';
        });
        msgDiv.innerHTML = '<div class="max-w-[85%] border border-pink-200 rounded-lg px-3 py-2 bg-pink-50"><div class="flex items-center gap-1 mb-1"><span class="text-xs">👤</span><span class="text-[10px] text-gray-400">jetzt</span></div>'+attHtml+'<p class="text-sm text-gray-700 whitespace-pre-wrap">'+(text||'[Sprache/Bild]')+'</p></div>';
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    // Add "typing" indicator
    var typingDiv = document.createElement('div');
    typingDiv.className = 'flex justify-start';
    typingDiv.id = 'devMockupTyping';
    typingDiv.innerHTML = '<div class="border border-gray-200 rounded-lg px-3 py-2 bg-white"><span class="text-xs">🤖</span> <span class="text-sm text-gray-400 animate-pulse">denkt nach...</span></div>';
    if (container) { container.appendChild(typingDiv); container.scrollTop = container.scrollHeight; }
    
    try {
        var payload = { submission_id: subId, mode: 'mockup_chat', feedback: text || '[Attachment]', attachments: _mockupChatAttachments };
        var resp = await fetch(_sb().supabaseUrl + '/functions/v1/dev-ki-analyse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (await _sb().auth.getSession()).data.session.access_token },
            body: JSON.stringify(payload)
        });
        var data = await resp.json();
        if (data.error) throw new Error(data.error);
        
        // Remove typing indicator
        var typing = document.getElementById('devMockupTyping');
        if (typing) typing.remove();
        
        // Add KI response
        if (container && data.antwort) {
            var kiDiv = document.createElement('div');
            kiDiv.className = 'flex justify-start';
            var mockupBadge = data.mockup_version ? '<span class="text-[10px] bg-pink-200 text-pink-700 px-1.5 rounded-full ml-1">Mockup v'+data.mockup_version+'</span>' : '';
            kiDiv.innerHTML = '<div class="max-w-[85%] border border-gray-200 rounded-lg px-3 py-2 bg-white"><div class="flex items-center gap-1 mb-1"><span class="text-xs">🤖</span><span class="text-[10px] text-gray-400">jetzt</span>'+mockupBadge+'</div><p class="text-sm text-gray-700 whitespace-pre-wrap">'+data.antwort+'</p></div>';
            container.appendChild(kiDiv);
            container.scrollTop = container.scrollHeight;
        }
        
        // If new mockup was generated, update iframe
        if (data.neues_mockup && data.mockup_version) {
            // Reload the submission detail to get new mockup
            var mResp = await _sb().from('dev_mockups').select('html_content').eq('submission_id', subId).order('version', {ascending: false}).limit(1);
            if (mResp.data && mResp.data[0]) {
                var frame = document.getElementById('devMockupFrame');
                if (frame) {
                    frame.srcdoc = mResp.data[0].html_content;
                }
            }
        }
    } catch(e) {
        var typing = document.getElementById('devMockupTyping');
        if (typing) typing.innerHTML = '<div class="border border-red-200 rounded-lg px-3 py-2 bg-red-50"><span class="text-xs">❌</span> <span class="text-sm text-red-600">Fehler: '+e.message+'</span></div>';
    }
    
    // Reset
    input.value = '';
    input.style.height = 'auto';
    input.disabled = false;
    if (btn) { btn.disabled = false; btn.textContent = '➤'; }
    _mockupChatAttachments = [];
    var attContainer = document.getElementById('devMockupChatAttachments');
    if (attContainer) { attContainer.innerHTML = ''; attContainer.classList.add('hidden'); }
    input.focus();
}

export async function devMockupChatAttachImage(fileInput) {
    var file = fileInput.files[0];
    if (!file) return;
    
    // Upload to Supabase storage
    var ext = file.name.split('.').pop() || 'png';
    var path = 'mockup-chat/' + Date.now() + '.' + ext;
    var { data, error } = await _sb().storage.from('dev-attachments').upload(path, file);
    if (error) { console.warn('Upload error:', error); return; }
    var url = _sb().storage.from('dev-attachments').getPublicUrl(path).data.publicUrl;
    
    _mockupChatAttachments.push({ type: file.type, url: url, name: file.name });
    
    // Show preview
    var container = document.getElementById('devMockupChatAttachments');
    if (container) {
        container.classList.remove('hidden');
        var preview = document.createElement('div');
        preview.className = 'relative';
        preview.innerHTML = '<img src="'+url+'" class="w-16 h-16 object-cover rounded border" /><button onclick="this.parentElement.remove();window._mockupChatAttachments=window._mockupChatAttachments||[];window._mockupChatAttachments=window._mockupChatAttachments.filter(function(a){return a.url!==\''+url+'\';})" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">×</button>';
        container.appendChild(preview);
    }
    fileInput.value = '';
}

export async function devMockupChatMic(btn) {
    // Toggle recording
    if (_mockupChatMediaRecorder && _mockupChatMediaRecorder.state === 'recording') {
        _mockupChatMediaRecorder.stop();
        btn.textContent = '🎤';
        btn.classList.remove('bg-red-100', 'text-red-600', 'animate-pulse');
        btn.classList.add('bg-gray-100', 'text-gray-500');
        return;
    }
    
    try {
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        _mockupChatAudioChunks = [];
        _mockupChatMediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        _mockupChatMediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) _mockupChatAudioChunks.push(e.data);
        };
        
        _mockupChatMediaRecorder.onstop = async function() {
            stream.getTracks().forEach(function(t) { t.stop(); });
            var blob = new Blob(_mockupChatAudioChunks, { type: 'audio/webm' });
            
            // Upload audio
            var path = 'mockup-chat/' + Date.now() + '.webm';
            var { data, error } = await _sb().storage.from('dev-attachments').upload(path, blob);
            if (error) { console.warn('Audio upload error:', error); return; }
            var url = _sb().storage.from('dev-attachments').getPublicUrl(path).data.publicUrl;
            
            _mockupChatAttachments.push({ type: 'audio/webm', url: url, name: 'Sprachnotiz' });
            
            // Show indicator
            var container = document.getElementById('devMockupChatAttachments');
            if (container) {
                container.classList.remove('hidden');
                var preview = document.createElement('div');
                preview.className = 'flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-xs';
                preview.innerHTML = '🎤 Sprachnotiz <button onclick="this.parentElement.remove()" class="text-red-400 ml-1">×</button>';
                container.appendChild(preview);
            }
        };
        
        _mockupChatMediaRecorder.start();
        btn.textContent = '⏹';
        btn.classList.remove('bg-gray-100', 'text-gray-500');
        btn.classList.add('bg-red-100', 'text-red-600', 'animate-pulse');
    } catch(e) {
        console.warn('Mic error:', e);
        alert('Mikrofon nicht verfuegbar');
    }
}

// === MOCKUP FUNCTIONS ===
export async function devMockupGenerate(subId, isRefine) {
    var btn = document.getElementById('devBtnMockGen');
    var body = document.getElementById('devMockupBody');
    if(body) {
        body.innerHTML = '<div class="w-full"><div class="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-4">' +
            '<div class="flex items-center gap-3 mb-3">' +
            '<div class="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center animate-pulse"><span class="text-white text-sm">🎨</span></div>' +
            '<div><h4 class="font-bold text-pink-800 text-sm">Mockup wird generiert...</h4>' +
            '<p class="text-xs text-pink-500" id="devMockupStatusText">UI-Konzept wird analysiert...</p></div></div>' +
            '<div class="w-full bg-pink-100 rounded-full h-2 overflow-hidden">' +
            '<div id="devMockupProgress" class="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-1000" style="width:10%"></div>' +
            '</div></div></div>';
    }
    var steps = [
        {pct:'25%',text:'Tailwind-Layout wird designt...'},
        {pct:'50%',text:'Interaktive Elemente werden erstellt...'},
        {pct:'70%',text:'Beispieldaten werden eingefuegt...'},
        {pct:'85%',text:'Responsive Design wird optimiert...'}
    ];
    var si=0;
    var st = setInterval(function(){
        if(si>=steps.length){clearInterval(st);return;}
        var bar=document.getElementById('devMockupProgress');
        var txt=document.getElementById('devMockupStatusText');
        if(bar)bar.style.width=steps[si].pct;
        if(txt)txt.textContent=steps[si].text;
        si++;
    },4000);
    try {
        var token = (await _sb().auth.getSession()).data.session.access_token;
        var resp = await fetch(_sbUrl()+'/functions/v1/dev-ki-analyse', {
            method:'POST',
            headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
            body:JSON.stringify({submission_id:subId, mode:'mockup'})
        });
        var data = await resp.json();
        clearInterval(st);
        if(data.error) throw new Error(data.error);
        _showToast('🎨 Mockup v'+data.version+' erstellt!','success');
        openDevDetail(subId);
    } catch(e) {
        clearInterval(st);
        if(body) body.innerHTML = '<div class="bg-red-50 border border-red-200 rounded-xl p-4 text-center"><p class="text-red-600 text-sm">❌ '+e.message+'</p><button onclick="devMockupGenerate(\''+subId+'\',false)" class="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-xs">🔄 Erneut</button></div>';
        _showToast('Fehler: '+e.message,'error');
    }
}

export async function devMockupRefine(subId) {
    var fb = document.getElementById('devMockupFeedback');
    var feedback = fb ? fb.value.trim() : '';
    if(!feedback) { _showToast('Bitte Feedback eingeben','error'); return; }
    var body = document.getElementById('devMockupBody');
    if(body) {
        body.innerHTML = '<div class="w-full"><div class="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-4">' +
            '<div class="flex items-center gap-3 mb-3">' +
            '<div class="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center animate-pulse"><span class="text-white text-sm">✏️</span></div>' +
            '<div><h4 class="font-bold text-pink-800 text-sm">Mockup wird ueberarbeitet...</h4>' +
            '<p class="text-xs text-pink-500">Feedback: '+feedback.substring(0,60)+(feedback.length>60?'...':'')+'</p></div></div>' +
            '<div class="w-full bg-pink-100 rounded-full h-2 overflow-hidden">' +
            '<div class="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-pulse" style="width:60%"></div>' +
            '</div></div></div>';
    }
    try {
        var token = (await _sb().auth.getSession()).data.session.access_token;
        var resp = await fetch(_sbUrl()+'/functions/v1/dev-ki-analyse', {
            method:'POST',
            headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
            body:JSON.stringify({submission_id:subId, mode:'mockup_refine', feedback:feedback})
        });
        var data = await resp.json();
        if(data.error) throw new Error(data.error);
        _showToast('✏️ Mockup v'+data.version+' ueberarbeitet!','success');
        openDevDetail(subId);
    } catch(e) {
        _showToast('Fehler: '+e.message,'error');
        openDevDetail(subId);
    }
}

export function devMockupResize(size) {
    var frame = document.getElementById('devMockupFrame');
    if(!frame) return;
    if(size==='mobile') { frame.style.width='375px'; frame.style.height='667px'; frame.style.margin='0 auto'; frame.style.display='block'; }
    else if(size==='tablet') { frame.style.width='768px'; frame.style.height='500px'; frame.style.margin='0 auto'; frame.style.display='block'; }
    else { frame.style.width='100%'; frame.style.height='500px'; frame.style.margin=''; }
}

export function devMockupFullscreen() {
    var frame = document.getElementById('devMockupFrame');
    if(!frame) return;
    if(frame.requestFullscreen) frame.requestFullscreen();
    else if(frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
}

export async function devMockupShowVersion(mockupId) {
    var resp = await _sb().from('dev_mockups').select('html_content').eq('id', mockupId).single();
    if(resp.data) {
        var frame = document.getElementById('devMockupFrame');
        if(frame) frame.srcdoc = resp.data.html_content;
    }
}

const _exports = {
    saveDevNotizen,loadMockupChatHistory,devMockupChatSend,devMockupChatAttachImage,devMockupChatMic,devDeployCode,loadDeployHistory,devMockupGenerate,devMockupRefine,devMockupResize,devMockupFullscreen,devMockupShowVersion,toggleDevSubmitForm,setDevInputType,toggleDevAudioRecord,finalizeDevAudioRecording,toggleDevScreenRecord,finalizeDevScreenRecording,stopDevRecording,getSupportedMimeType,startDevTimer,stopDevTimer,updateDevFileList,handleDevFileSelect,renderEntwicklung,showEntwicklungTab,renderEntwTabContent,loadDevSubmissions,renderEntwIdeen,renderEntwReleases,renderEntwSteuerung,renderEntwFlags,renderEntwSystem,renderEntwNutzung,showIdeenTab,renderDevPipeline,renderDevTab,devCardHTML,renderDevMeine,renderDevAlle,renderDevBoard,devBoardCardHTML,renderDevPlanung,updateDevPlanStatus,updateDevPlanField,renderDevRoadmap,toggleRoadmapForm,addRoadmapItem,updateRoadmapStatus,submitDevIdea,toggleDevVote,devHQDecision,moveDevQueue,openDevDetail,submitDevRueckfragenAntwort,devHQDecisionFromDetail,submitDevKommentar,closeDevDetail,renderDevVision,saveDevVision,loadDevNotifications,toggleDevNotifications,openDevNotif,markAllDevNotifsRead,exportDevCSV,updateDevMA,updateDevDeadline,reanalyseDevSubmission,uploadDevAttachment,sendDevKonzeptChat,devAdvanceStatus,submitDevBetaFeedback,devShowBetaFeedbackSummary,devRollout,renderDevBetaTester,devAddBetaTester,devToggleBetaTester,renderDevReleaseDocs,devApproveReleaseDoc,devShowCreateRelease,devSaveRelease,devShowFeedbackForm,devCreateFeedbackAnfrage,devSubmitFeedbackAntwort,devCloseFeedbackAnfrage,devCodeGenerate,devCodeReview,devCodeViewFile,devSendCodeChat,runDevKIPrioritize,
};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[dev-pipeline.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
