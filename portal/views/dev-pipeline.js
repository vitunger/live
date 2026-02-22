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
    if(f) f.classList.toggle('hidden');
    // Stop any active recordings when closing
    if(f && f.classList.contains('hidden')) {
        stopDevRecording();
    }
    // Populate module dropdown
    var sel = document.getElementById('devModul');
    if(sel && sel.options.length <= 1) {
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

export async function loadDevSubmissions() {
    try {
        var query = _sb().from('dev_submissions').select('*, dev_ki_analysen(zusammenfassung, vision_fit_score, machbarkeit, aufwand_schaetzung), dev_votes(user_id)').order('created_at', {ascending: false});
        var resp = await query;
        if(resp.error) throw resp.error;
        devSubmissions = resp.data || [];
    } catch(err) {
        console.error('DevSubmissions load:', err);
        devSubmissions = [];
    }
    // Update stats
    var total = devSubmissions.length;
    var neu = devSubmissions.filter(function(s){ return ['neu','ki_pruefung','ki_rueckfragen','konzept_erstellt','im_ideenboard','hq_rueckfragen'].indexOf(s.status) !== -1; }).length;
    var dev = devSubmissions.filter(function(s){ return ['freigegeben','in_planung','in_entwicklung','im_review','release_geplant'].indexOf(s.status) !== -1; }).length;
    var done = devSubmissions.filter(function(s){ return s.status === 'ausgerollt'; }).length;
    var e1=document.getElementById('entwStatTotal');if(e1)e1.textContent=total;
    var e2=document.getElementById('entwStatNeu');if(e2)e2.textContent=neu;
    var e4=document.getElementById('entwStatDev');if(e4)e4.textContent=dev;
    var e5=document.getElementById('entwStatDone');if(e5)e5.textContent=done;
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
    var scope = fScope ? fScope.value : 'alle';
    var status = fStatus ? fStatus.value : 'alle';
    var kat = fKat ? fKat.value : 'alle';
    var quelle = fQuelle ? fQuelle.value : 'alle';

    var items = devSubmissions.filter(function(s) {
        if(scope !== 'alle' && s.scope !== scope) return false;
        if(status === 'neu' && ['neu','ki_pruefung','ki_rueckfragen','konzept_erstellt','im_ideenboard','hq_rueckfragen'].indexOf(s.status) === -1) return false;
        if(status === 'dev' && ['freigegeben','in_planung','in_entwicklung','im_review','release_geplant'].indexOf(s.status) === -1) return false;
        if(status === 'done' && s.status !== 'ausgerollt') return false;
        if(kat !== 'alle' && s.kategorie !== kat) return false;
        if(quelle === 'meine' && s.user_id !== userId) return false;
        if(quelle === 'standort' && s.standort_id !== currentStandortId) return false;
        return true;
    });

    var countEl = document.getElementById('entwIdeenCount');
    if(countEl) countEl.textContent = items.length + ' von ' + devSubmissions.length + ' Einträgen';

    if(items.length === 0) {
        c.innerHTML = '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-2">💡</p><p>Keine Ideen mit diesen Filtern gefunden</p></div>';
        return;
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
        h += '</div>';
        h += '<h3 class="font-semibold text-gray-800 text-sm">'+((s.titel||s.beschreibung||s.kurz_notiz||s.transkription||'Kein Titel').substring(0,80))+'</h3>';
        if(s.eingabe_typ && s.eingabe_typ !== 'text') h += '<span class="text-[10px] text-gray-400 ml-1">'+(s.eingabe_typ==='audio'?'🎤 Audio':s.eingabe_typ==='screenshot'?'📸 Screenshot':s.eingabe_typ==='video'?'🖥️ Video':'📎 '+s.eingabe_typ)+'</span>';
        if(!s.titel && !s.beschreibung && !s.kurz_notiz && s.eingabe_typ==='audio' && !s.transkription) h += '<p class="text-xs text-amber-500 mt-1">⏳ Audio wird transkribiert...</p>';
        if(!s.ki_analysiert_at && s.status==='neu') h += '<p class="text-xs text-blue-400 mt-1">🤖 KI-Analyse ausstehend</p>';
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
    if(typeof RELEASE_UPDATES !== 'undefined' && RELEASE_UPDATES.length > 0) {
        // Temporarily give our container the ID that renderReleaseUpdates expects
        var origEl = document.getElementById('releaseUpdatesContent');
        var origId = origEl ? origEl.id : null;
        if(origEl) origEl.id = '_releaseUpdatesOrig';
        c.id = 'releaseUpdatesContent';
        renderReleaseUpdates();
        c.id = 'entwReleasesContent';
        if(origEl) origEl.id = 'releaseUpdatesContent';
    } else {
        c.innerHTML = '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-2">🚀</p><p>Noch keine Releases vorhanden</p></div>';
    }
}

export async function renderEntwSteuerung() {
    var c = document.getElementById('entwSteuerungContent');
    if(!c) return;
    await loadDevSubmissions();
    // Kanban board for HQ
    var columns = [
        {key:'neu', label:'📥 Eingang', statuses:['neu','ki_pruefung','ki_rueckfragen','konzept_erstellt'], color:'blue'},
        {key:'board', label:'🎯 Ideenboard', statuses:['im_ideenboard','hq_rueckfragen'], color:'purple'},
        {key:'dev', label:'🔨 Entwicklung', statuses:['freigegeben','in_planung','in_entwicklung','im_review','release_geplant'], color:'yellow'},
        {key:'done', label:'✅ Umgesetzt', statuses:['ausgerollt'], color:'green'},
        {key:'parked', label:'⏸ Geparkt/Abgelehnt', statuses:['abgelehnt','geparkt'], color:'gray'}
    ];
    var h = '<div class="grid grid-cols-1 md:grid-cols-5 gap-4" style="min-height:400px">';
    columns.forEach(function(col) {
        var items = devSubmissions.filter(function(s) { return col.statuses.indexOf(s.status) !== -1; });
        h += '<div class="bg-gray-50 rounded-xl p-3">';
        h += '<div class="flex items-center justify-between mb-3"><h3 class="text-sm font-bold text-gray-700">'+col.label+'</h3><span class="text-xs bg-'+col.color+'-100 text-'+col.color+'-700 rounded-full px-2 py-0.5 font-semibold">'+items.length+'</span></div>';
        h += '<div class="space-y-2">';
        items.slice(0,10).forEach(function(s) {
            var statusLabel = devStatusLabels[s.status] || s.status;
            h += '<div class="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition" onclick="openDevDetail(\''+s.id+'\')">';
            h += '<p class="text-xs font-semibold text-gray-800 mb-1 line-clamp-2">'+(s.titel||s.beschreibung||s.kurz_notiz||s.transkription||'Kein Titel').substring(0,60)+'</p>';
            h += '<div class="flex items-center gap-1 flex-wrap">';
            h += '<span class="text-[9px] rounded px-1.5 py-0.5 '+(devStatusColors[s.status]||'bg-gray-100 text-gray-600')+'">'+statusLabel+'</span>';
            var votes = (s.dev_votes||[]).length;
            if(votes) h += '<span class="text-[9px] text-gray-400">▲'+votes+'</span>';
            h += '</div></div>';
        });
        if(items.length > 10) h += '<p class="text-xs text-gray-400 text-center mt-2">+'+(items.length-10)+' weitere</p>';
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
        var query = _sb().from('dev_submissions').select('*, dev_ki_analysen(zusammenfassung, vision_fit_score, machbarkeit, aufwand_schaetzung), dev_votes(user_id)').order('created_at', {ascending: false});
        var resp = await query;
        if(resp.error) throw resp.error;
        devSubmissions = resp.data || [];
    } catch(err) {
        console.error('DevPipeline load:', err);
        devSubmissions = [];
    }

    // Update stats
    var total = devSubmissions.length;
    var neu = devSubmissions.filter(function(s){ return ['neu','ki_pruefung','ki_rueckfragen','konzept_erstellt'].indexOf(s.status) !== -1; }).length;
    var board = devSubmissions.filter(function(s){ return ['im_ideenboard','hq_rueckfragen'].indexOf(s.status) !== -1; }).length;
    var dev = devSubmissions.filter(function(s){ return ['freigegeben','in_planung','in_entwicklung','im_review','release_geplant'].indexOf(s.status) !== -1; }).length;
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
    neu:'Neu eingereicht', ki_pruefung:'⏳ Wird analysiert...', ki_rueckfragen:'❓ Rückfragen',
    konzept_erstellt:'📋 Konzept fertig', im_ideenboard:'🎯 Im Ideenboard', hq_rueckfragen:'❓ HQ Rückfragen',
    freigegeben:'✅ Freigegeben', in_planung:'📅 In Planung', in_entwicklung:'🔨 In Entwicklung',
    im_review:'🔍 Im Review', release_geplant:'🚀 Release geplant', ausgerollt:'✅ Ausgerollt',
    abgelehnt:'❌ Abgelehnt', geparkt:'⏸ Geparkt'
};
var devStatusColors = {
    neu:'bg-blue-100 text-blue-700', ki_pruefung:'bg-purple-100 text-purple-700 animate-pulse',
    ki_rueckfragen:'bg-yellow-100 text-yellow-700', konzept_erstellt:'bg-indigo-100 text-indigo-700',
    im_ideenboard:'bg-orange-100 text-orange-700', hq_rueckfragen:'bg-yellow-100 text-yellow-700',
    freigegeben:'bg-green-100 text-green-700', in_planung:'bg-teal-100 text-teal-700',
    in_entwicklung:'bg-blue-100 text-blue-700', im_review:'bg-purple-100 text-purple-700',
    release_geplant:'bg-orange-100 text-orange-700', ausgerollt:'bg-green-100 text-green-700',
    abgelehnt:'bg-red-100 text-red-700', geparkt:'bg-gray-100 text-gray-600'
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
    h += '<span class="text-[10px] text-gray-400 mt-1 block">'+d+'</span>';
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
    // HQ sees everything, partners don't see abgelehnt/geparkt
    var visible = isHQ ? devSubmissions : devSubmissions.filter(function(s) { return s.status !== 'abgelehnt' && s.status !== 'geparkt'; });
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
        return ['freigegeben','in_planung','in_entwicklung','im_review','release_geplant','geparkt'].indexOf(s.status) !== -1;
    }).sort(function(a,b) { return (a.queue_position||9999) - (b.queue_position||9999); });
    if(planItems.length === 0) {
        c.innerHTML = '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-3">📅</p><p>Noch keine freigegebenen Ideen in der Planung.</p></div>';
        return;
    }

    // Group by status
    var groups = [
        { key: 'in_entwicklung', label: '🔨 In Entwicklung', items: [] },
        { key: 'in_planung', label: '📅 In Planung', items: [] },
        { key: 'freigegeben', label: '✅ Freigegeben (noch nicht geplant)', items: [] },
        { key: 'im_review', label: '🔍 Im Review', items: [] },
        { key: 'release_geplant', label: '🚀 Release geplant', items: [] },
        { key: 'geparkt', label: '⏸ Geparkt', items: [] }
    ];
    planItems.forEach(function(s) {
        var g = groups.find(function(gr){ return gr.key === s.status; });
        if(g) g.items.push(s);
        else groups[2].items.push(s); // fallback to freigegeben
    });

    var h = '';
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
                var planStatuses = ['freigegeben','in_planung','in_entwicklung','im_review','release_geplant','geparkt'];
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
        }).catch(function(kiErr) { console.warn('KI-Analyse Fehler (wird nachgeholt):', kiErr); });
    } catch(err) {
        alert('Fehler beim Einreichen: ' + (err.message||err));
    } finally {
        if(btn) { btn.disabled = false; btn.textContent = '💡 Feedback einreichen'; }
    }
}

export async function toggleDevVote(subId) {
    try {
        var checkResp = await _sb().from('dev_votes').select('id').eq('submission_id', subId).eq('user_id', _sbUser().id);
        if(checkResp.data && checkResp.data.length > 0) {
            await _sb().from('dev_votes').delete().eq('submission_id', subId).eq('user_id', _sbUser().id);
        } else {
            var ins = await _sb().from('dev_votes').insert({ submission_id: subId, user_id: _sbUser().id }).select();
            if(ins.error) throw ins.error;
        }
        // Refresh whichever view is active
        await loadDevSubmissions();
        renderEntwIdeen();
        renderDevPipeline();
    } catch(err) {
        if(err.code === '23505') { /* already voted, ignore */ }
        else { console.error('Vote error:', err); alert('Vote fehlgeschlagen: ' + (err.message||err)); }
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
    var statusMap = { freigabe:'freigegeben', freigabe_mit_aenderungen:'freigegeben', rueckfragen:'hq_rueckfragen', ablehnung:'abgelehnt', spaeter:'geparkt' };

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

        renderDevPipeline();
    } catch(err) { alert('Fehler: ' + (err.message||err)); }
}

export async function moveDevQueue(subId, direction) {
    // Find current item and swap positions
    var planItems = devSubmissions.filter(function(s) {
        return ['freigegeben','in_planung','in_entwicklung','im_review','release_geplant'].indexOf(s.status) !== -1;
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
    var wasHidden = modal.classList.contains('hidden');
    if(wasHidden) {
        content.innerHTML = '<div class="text-center py-8"><span class="animate-pulse text-gray-400">Lade Details...</span></div>';
    }
    modal.classList.remove('hidden');

    try {
        // Load full submission with relations
        var resp = await _sb().from('dev_submissions').select('*').eq('id', subId).single();
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

        // Build detail HTML
        var h = '';
        h += '<div class="flex items-start justify-between mb-4">';
        h += '<div><span class="text-xs font-semibold rounded px-2 py-1 '+devStatusColors[s.status]+'">'+devStatusLabels[s.status]+'</span>';
        if(s.ki_typ) { var _dtC = s.ki_typ==='bug'?'bg-red-100 text-red-700':s.ki_typ==='feature'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'; var _dtI = s.ki_typ==='bug'?'🐛 Bug':s.ki_typ==='feature'?'✨ Feature':'💡 Idee'; h += ' <span class="text-xs font-semibold rounded px-2 py-1 '+_dtC+'">'+_dtI+'</span>'; }
        if(s.ki_bereich) { h += ' <span class="text-xs rounded px-2 py-1 '+(s.ki_bereich==='portal'?'bg-gray-100 text-gray-600':'bg-green-50 text-green-700')+'">'+(s.ki_bereich==='portal'?'💻 Portal':'🌐 Netzwerk')+'</span>'; }
        h += '<h2 class="text-xl font-bold text-gray-800 mt-2">'+(s.titel||'(Ohne Titel)')+'</h2>';
        h += '<p class="text-xs text-gray-400 mt-1">'+(devKatIcons[s.kategorie]||'')+' '+s.kategorie+' · '+new Date(s.created_at).toLocaleDateString('de-DE')+'</p></div>';
        h += '<button onclick="closeDevDetail()" class="text-gray-400 hover:text-gray-600 text-2xl">✕</button></div>';

        // Original submission
        if(s.beschreibung) {
            h += '<div class="bg-gray-50 rounded-lg p-4 mb-4"><h4 class="text-xs font-bold text-gray-500 uppercase mb-1">Beschreibung</h4>';
            h += '<p class="text-sm text-gray-700">'+s.beschreibung+'</p></div>';
        }

        // Analyse
        if(ki) {
            var isHQDetail = (currentRoles||[]).indexOf('hq') !== -1;
            h += '<div class="border border-purple-200 rounded-lg p-4 mb-4 bg-purple-50/50">';
            h += '<h4 class="text-xs font-bold text-purple-600 uppercase mb-2">📊 Analyse</h4>';
            if(ki.zusammenfassung) h += '<p class="text-sm text-gray-700 mb-3">'+ki.zusammenfassung+'</p>';
            if(isHQDetail) {
                h += '<div class="grid grid-cols-3 gap-3 mb-3">';
                h += '<div class="text-center"><p class="text-2xl font-bold '+(ki.vision_fit_score>=70?'text-green-600':ki.vision_fit_score>=40?'text-yellow-600':'text-red-600')+'">'+ki.vision_fit_score+'</p><p class="text-[10px] text-gray-500">Vision-Fit</p></div>';
                h += '<div class="text-center"><p class="text-sm font-bold text-gray-800">'+(ki.machbarkeit||'-')+'</p><p class="text-[10px] text-gray-500">Machbarkeit</p></div>';
                h += '<div class="text-center"><p class="text-sm font-bold text-gray-800">'+(ki.aufwand_schaetzung||'-')+'</p><p class="text-[10px] text-gray-500">Aufwand</p></div>';
                h += '</div>';
                if(ki.machbarkeit_details) h += '<p class="text-xs text-gray-600 mb-2"><b>Details:</b> '+ki.machbarkeit_details+'</p>';
                if(ki.risiken && ki.risiken.length > 0) {
                    h += '<div class="mt-2"><p class="text-xs font-semibold text-gray-600 mb-1">Risiken:</p>';
                    ki.risiken.forEach(function(r) {
                        h += '<span class="inline-block text-[10px] rounded px-2 py-0.5 mr-1 mb-1 '+(r.schwere==='hoch'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700')+'">'+r.typ+': '+r.beschreibung+'</span>';
                    });
                    h += '</div>';
                }
            } else {
                // Partner sehen nur Status-Info
                h += '<div class="flex items-center space-x-3">';
                if(ki.aufwand_schaetzung) h += '<span class="text-xs bg-gray-100 rounded px-2 py-1 font-semibold text-gray-600">Aufwand: '+ki.aufwand_schaetzung+'</span>';
                if(ki.machbarkeit) h += '<span class="text-xs bg-gray-100 rounded px-2 py-1 font-semibold text-gray-600">Machbarkeit: '+ki.machbarkeit+'</span>';
                h += '</div>';
            }
            if(ki.rueckfragen && ki.rueckfragen.length > 0) {
                h += '<div class="mt-3 bg-yellow-50 rounded p-3"><p class="text-xs font-semibold text-yellow-700 mb-1">❓ Offene Rückfragen:</p>';
                ki.rueckfragen.forEach(function(q) {
                    h += '<div class="text-xs text-gray-700 mb-1">• '+(q.frage||q)+'</div>';
                });
                h += '</div>';
            }
            h += '</div>';
        }

        // Konzept (nur HQ) - prominent display
        var isHQKonzept = (currentRoles||[]).indexOf('hq') !== -1;
        if(isHQKonzept && konzept) {
            h += '<div class="border-2 border-indigo-300 rounded-lg mb-4 bg-indigo-50/30 overflow-hidden">';
            h += '<div class="bg-indigo-100 px-4 py-3 cursor-pointer flex items-center justify-between" onclick="var el=document.getElementById(\'devKonzeptBody\');el.style.display=el.style.display===\'none\'?\'block\':\'none\'">';
            h += '<h4 class="text-sm font-bold text-indigo-700">📋 KI-Entwicklungskonzept (v'+konzept.version+')</h4>';
            h += '<span class="text-indigo-400 text-xs">▼ auf/zuklappen</span>';
            h += '</div>';
            h += '<div id="devKonzeptBody" class="p-4">';
            var sections = [
                {label:'🎯 Problem', val:konzept.problem_beschreibung},
                {label:'💡 Ziel', val:konzept.ziel},
                {label:'✅ Nutzen', val:konzept.nutzen},
                {label:'📦 Scope (In)', val:konzept.scope_in},
                {label:'🚫 Scope (Out)', val:konzept.scope_out},
                {label:'🖥️ UI/Frontend', val:konzept.loesungsvorschlag_ui},
                {label:'⚙️ Backend', val:konzept.loesungsvorschlag_backend},
                {label:'🗄️ Datenbank', val:konzept.loesungsvorschlag_db},
                {label:'🧪 Testplan', val:konzept.testplan},
                {label:'🚀 Rollout', val:konzept.rollout_strategie},
                {label:'✔️ Definition of Done', val:konzept.definition_of_done}
            ];
            sections.forEach(function(sec) {
                if(sec.val) h += '<div class="mb-3"><span class="text-xs font-bold text-indigo-600 uppercase">'+sec.label+'</span><p class="text-sm text-gray-700 mt-0.5 whitespace-pre-line">'+sec.val+'</p></div>';
            });
            if(konzept.akzeptanzkriterien && konzept.akzeptanzkriterien.length > 0) {
                h += '<div class="mb-2"><span class="text-xs font-bold text-indigo-600 uppercase">📋 Akzeptanzkriterien</span>';
                konzept.akzeptanzkriterien.forEach(function(a) {
                    h += '<div class="text-sm text-gray-700 mt-0.5">☐ '+(a.beschreibung||a)+'</div>';
                });
                h += '</div>';
            }
            h += '</div></div>';
        }

        // Entscheidungen (nur HQ)
        if(isHQKonzept && entscheidungen.length > 0) {
            h += '<div class="mb-4"><h4 class="text-xs font-bold text-gray-500 uppercase mb-2">HQ-Entscheidungen</h4>';
            entscheidungen.forEach(function(e) {
                var eColors = {freigabe:'text-green-700 bg-green-50',freigabe_mit_aenderungen:'text-orange-700 bg-orange-50',rueckfragen:'text-yellow-700 bg-yellow-50',ablehnung:'text-red-700 bg-red-50',spaeter:'text-gray-600 bg-gray-50'};
                var eLabels = {freigabe:'✅ Freigabe',freigabe_mit_aenderungen:'✅ Freigabe mit Änderungen',rueckfragen:'❓ Rückfrage',ablehnung:'❌ Abgelehnt',spaeter:'⏸ Später'};
                h += '<div class="rounded p-3 mb-2 '+(eColors[e.ergebnis]||'bg-gray-50')+'"><span class="text-xs font-bold '+(eColors[e.ergebnis]||'text-gray-600').split(' ')[0]+'">'+eLabels[e.ergebnis]+'</span>';
                if(e.kommentar) h += '<p class="text-xs text-gray-700 mt-1">'+e.kommentar+'</p>';
                h += '<span class="text-[10px] text-gray-400">'+new Date(e.created_at).toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})+'</span></div>';
            });
            h += '</div>';
        }

        // Kommentare
        if(kommentare.length > 0) {
            h += '<div class="mb-4"><h4 class="text-xs font-bold text-gray-500 uppercase mb-2">Verlauf</h4><div class="space-y-2">';
            kommentare.forEach(function(k) {
                var isKI = k.typ === 'ki_nachricht';
                var isRF = k.typ === 'rueckfrage';
                var isAnt = k.typ === 'antwort';
                var bgClass = isKI ? 'bg-purple-50 border border-purple-100' : isRF ? 'bg-yellow-50 border border-yellow-100' : isAnt ? 'bg-green-50 border border-green-100' : 'bg-gray-50';
                var labelClass = isKI ? 'text-purple-600' : isRF ? 'text-yellow-700' : isAnt ? 'text-green-700' : 'text-gray-700';
                var label = isKI ? '🔔 System' : isRF ? '❓ Rückfrage' : isAnt ? '💬 ' + (k.users && k.users.name ? k.users.name : 'Antwort') : '💬 ' + (k.users && k.users.name ? k.users.name : 'Kommentar');
                h += '<div class="rounded p-3 text-xs '+bgClass+'">';
                h += '<span class="font-semibold '+labelClass+'">'+label+'</span>';
                h += '<p class="text-gray-700 mt-0.5" style="white-space:pre-line">'+k.inhalt+'</p>';
                h += '<span class="text-[10px] text-gray-400">'+new Date(k.created_at).toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span></div>';
            });
            h += '</div></div>';
        }

        // === RÜCKFRAGEN-ANTWORT-FORMULAR (NUR für Einreicher) ===
        var isHQUser = (currentRoles||[]).indexOf('hq') !== -1;
        var isSubmitter = sbUser && s.user_id === _sbUser().id;
        if((s.status === 'ki_rueckfragen' || s.status === 'hq_rueckfragen') && isSubmitter) {
            var rfQuelle = s.status === 'ki_rueckfragen' ? 'Unser System' : 'Das HQ';
            h += '<div id="devRueckfragenForm" class="border-2 border-yellow-300 rounded-lg p-4 mb-4 bg-yellow-50">';
            h += '<h4 class="text-sm font-bold text-yellow-800 mb-2">💬 '+rfQuelle+' hat Rückfragen – bitte antworte:</h4>';
            // Zeige offene Rückfragen aus KI-Analyse
            if(s.status === 'ki_rueckfragen' && ki && ki.rueckfragen) {
                var offeneRF = ki.rueckfragen.filter(function(q) { return !q.beantwortet; });
                if(offeneRF.length > 0) {
                    offeneRF.forEach(function(q, qi) {
                        h += '<div class="bg-white rounded p-3 mb-2 border border-yellow-200">';
                        h += '<p class="text-xs font-semibold text-gray-700 mb-1">❓ '+(q.frage||q)+'</p>';
                        h += '<textarea id="devRFAntwort_'+qi+'" placeholder="Deine Antwort..." class="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" rows="2"></textarea>';
                        h += '</div>';
                    });
                }
            }
            // Allgemeines Antwortfeld (für HQ-Rückfragen oder zusätzliche Infos)
            h += '<textarea id="devRFAntwortAllg" placeholder="Zusätzliche Informationen / Antwort..." class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3" rows="3"></textarea>';
            h += '<div class="flex space-x-2">';
            h += '<button onclick="submitDevRueckfragenAntwort(\''+s.id+'\',\''+s.status+'\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90">✅ Antwort senden</button>';
            h += '</div></div>';
        }

        // === HQ-AKTIONEN im Detail-Modal ===
        var isHQ = (currentRoles||[]).indexOf('hq') !== -1;
        var isOwnerDetail = (currentRoles||[]).indexOf('owner') !== -1;
        if(isHQ && ['neu','ki_pruefung','ki_rueckfragen','konzept_erstellt','im_ideenboard','hq_rueckfragen'].indexOf(s.status) !== -1) {
            h += '<div class="border-2 border-vit-orange/30 rounded-lg p-4 mb-4 bg-orange-50">';
            h += '<h4 class="text-sm font-bold text-gray-800 mb-3">🎯 HQ-Entscheidung</h4>';
            h += '<div class="grid grid-cols-2 gap-2 mb-3">';
            if(isOwnerDetail) {
                h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'freigabe\')" class="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600">✅ Freigeben</button>';
                h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'freigabe_mit_aenderungen\')" class="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600">✏️ Freigabe mit Änderungen</button>';
            }
            h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'rueckfragen\')" class="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600">❓ Rückfrage</button>';
            if(isOwnerDetail) {
                h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'ablehnung\')" class="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200">❌ Ablehnen</button>';
            }
            h += '</div>';
            h += '<button onclick="devHQDecisionFromDetail(\''+s.id+'\',\'spaeter\')" class="w-full px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-300">⏸ Später</button>';
            if(!isOwnerDetail) h += '<p class="text-xs text-gray-400 mt-2 italic">ℹ️ Freigabe & Ablehnung sind dem Owner vorbehalten.</p>';
            h += '</div>';
        }

        // === KOMMENTAR SCHREIBEN (immer sichtbar) ===
        h += '<div class="border-t border-gray-200 pt-4">';
        h += '<div class="flex space-x-2">';
        h += '<input type="text" id="devKommentarInput" placeholder="Kommentar schreiben..." class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" onkeydown="if(event.key===\'Enter\'){event.preventDefault();submitDevKommentar(\''+s.id+'\')}">';
        h += '<button id="devKommentarBtn" onclick="submitDevKommentar(\''+s.id+'\')" class="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-800">Senden</button>';
        h += '</div></div>';

        content.innerHTML = h;
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
        spaeter: 'geparkt'
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
            }
            await _sb().from('dev_submissions').update(updates).eq('id', subId);
        }

        closeDevDetail();
        renderDevPipeline(); if(typeof renderEntwIdeen==="function") renderEntwIdeen();
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

const _exports = {toggleDevSubmitForm,setDevInputType,toggleDevAudioRecord,finalizeDevAudioRecording,toggleDevScreenRecord,finalizeDevScreenRecording,stopDevRecording,getSupportedMimeType,startDevTimer,stopDevTimer,updateDevFileList,handleDevFileSelect,renderEntwicklung,showEntwicklungTab,renderEntwTabContent,loadDevSubmissions,renderEntwIdeen,renderEntwReleases,renderEntwSteuerung,renderEntwFlags,renderEntwSystem,renderEntwNutzung,showIdeenTab,renderDevPipeline,renderDevTab,devCardHTML,renderDevMeine,renderDevAlle,renderDevBoard,devBoardCardHTML,renderDevPlanung,updateDevPlanStatus,updateDevPlanField,renderDevRoadmap,toggleRoadmapForm,addRoadmapItem,updateRoadmapStatus,submitDevIdea,toggleDevVote,devHQDecision,moveDevQueue,openDevDetail,submitDevRueckfragenAntwort,devHQDecisionFromDetail,submitDevKommentar,closeDevDetail,renderDevVision,saveDevVision};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[dev-pipeline.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
