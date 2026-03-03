/**
 * views/dev-recording.js - Recording state + input type switching + file handling
 * @module views/dev-recording
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }
function _sbUrl() { return window.SUPABASE_URL; }

// Shared state access
function _devSubs() { return window._devState ? window._devState.submissions : []; }
function _devStatusLabels() { return window._devState ? window._devState.statusLabels : {}; }
function _devStatusColors() { return window._devState ? window._devState.statusColors : {}; }
function _devKatIcons() { return window._devState ? window._devState.katIcons : {}; }

// === LOCAL RECORDING STATE ===
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

    window._devState.inputType = typ;
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
        _showToast('Mikrofon-Zugriff nicht möglich: ' + (err.message||err, 'error'));
    }
}

export function finalizeDevAudioRecording() {
    var blob = new Blob(devRecordedChunks, { type: devRecordedChunks[0]?.type || 'audio/webm' });
    var file = new File([blob], 'Sprachaufnahme_' + Date.now() + '.webm', { type: blob.type });
    window._devState.selectedFiles.push(file);
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
        } else {
            _showToast('Bildschirmaufnahme nicht möglich: ' + (err.message||err, 'error'));
        }
    }
}

export function finalizeDevScreenRecording() {
    var mimeType = devRecordedChunks[0]?.type || 'video/webm';
    var blob = new Blob(devRecordedChunks, { type: mimeType });
    var ext = mimeType.includes('mp4') ? '.mp4' : '.webm';
    var file = new File([blob], 'Bildschirmaufnahme_' + Date.now() + ext, { type: blob.type });
    window._devState.selectedFiles.push(file);
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
        listEl.innerHTML = (window._devState ? window._devState.selectedFiles : []).map(function(f, i) {
            var sizeStr = f.size > 1024*1024 ? (Math.round(f.size/1024/1024*10)/10+' MB') : (Math.round(f.size/1024)+' KB');
            var icon = f.type.startsWith('audio') ? '🎤' : f.type.startsWith('video') ? '🖥️' : '📎';
            return '<div class="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-xs"><span>'+icon+' '+f.name+' ('+sizeStr+')</span><button onclick="window._devState.selectedFiles.splice('+i+',1);updateDevFileList()" class="text-red-400 hover:text-red-600 ml-2">✕</button></div>';
        }).join('');
    }
}

export function handleDevFileSelect(e) {
    var files = Array.from(e.target.files || []);
    window._devState.selectedFiles = (window._devState ? window._devState.selectedFiles : []).concat(files);
    updateDevFileList();
}

const _exports = {
    toggleDevSubmitForm, setDevInputType,
    toggleDevAudioRecord, finalizeDevAudioRecording,
    toggleDevScreenRecord, finalizeDevScreenRecording,
    stopDevRecording, getSupportedMimeType,
    startDevTimer, stopDevTimer,
    updateDevFileList, handleDevFileSelect
};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
