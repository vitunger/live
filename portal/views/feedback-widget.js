/**
 * views/feedback-widget.js - Feedback Widget (Audio, Screen, Screenshot, Upload)
 * @module views/feedback-widget
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _showView(v) { if (window.showView) window.showView(v); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// ── State ──
var fbState = {
category: 'wunsch',
attachments: [],       // [{name, type, blob, size}]
mediaRecorder: null,
recordingType: null,   // 'audio' | 'screen'
recordingChunks: [],
recordingStart: null,
recTimer: null,
stream: null
};

// ── Init: show widget after login ──
var fbInitInterval = setInterval(function(){
if(typeof sbUser !== 'undefined' && sbUser && _sbUser().id) {
    // Don't show on login screen
    var loginEl = document.getElementById('loginScreen');
    if(loginEl && loginEl.style.display !== 'none') return;
    clearInterval(fbInitInterval);
    var w = document.getElementById('fbWidget');
    if(w) w.style.display = 'block';
    // Pulse animation on first visit of the day
    var today = new Date().toDateString();
    var lastPulse = localStorage.getItem('fb_pulse_date');
    if(lastPulse !== today) {
        localStorage.setItem('fb_pulse_date', today);
        var btn = document.getElementById('fbTrigger');
        if(btn) btn.classList.add('fb-pulse');
        setTimeout(function(){ if(btn) btn.classList.remove('fb-pulse'); }, 7000);
    }
}
}, 1000);

// ── Contextual prompt on module switch ──
var fbLastView = '';
var fbCtxCount = 0;
var fbCtxShownForView = {};
setInterval(function(){
if(typeof currentView === 'undefined') return;
if(currentView !== fbLastView && currentView && fbCtxCount < 3) {
    fbLastView = currentView;
    if(!fbCtxShownForView[currentView] && Math.random() < 0.15) {
        fbCtxShownForView[currentView] = true;
        fbCtxCount++;
        var viewNames = {controlling:'Zahlen',verkauf:'Verkauf',marketing:'Marketing',einkauf:'Einkauf',standortBilling:'Buchhaltung'};
        var vn = viewNames[currentView] || currentView;
        document.getElementById('fbCtxText').textContent = 'Wie findest du den Bereich „'+vn+'"? Feedback geben →';
        var cp = document.getElementById('fbContextPrompt');
        if(cp) { cp.style.display = 'block'; setTimeout(function(){ cp.style.display='none'; }, 8000); }
    }
}
}, 2000);

window.fbHideCtx = function(){ document.getElementById('fbContextPrompt').style.display='none'; };

// ── Open / Close ──
window.fbOpen = function(){
// Zum neuen Ideenboard navigieren und Formular öffnen
_showView('entwicklung');
setTimeout(function(){
    var f = document.getElementById('devSubmitForm');
    if(f && f.classList.contains('hidden')) toggleDevSubmitForm();
}, 200);
};
window.fbClose = function(){
document.getElementById('fbOverlay').classList.remove('fb-open');
fbStopRecIfActive();
};

// ── Category selection ──
window.fbSetCat = function(el){
document.querySelectorAll('.fb-cat').forEach(function(b){ b.classList.remove('active'); });
el.classList.add('active');
fbState.category = el.getAttribute('data-cat');
};

// ── Audio Recording ──
window.fbToggleAudio = async function(){
if(fbState.recordingType === 'audio') { fbStopRec(); return; }
fbStopRecIfActive();
try {
    var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    startRecording(stream, 'audio');
    document.getElementById('fbBtnAudio').classList.add('recording');
    document.getElementById('fbAudioLabel').textContent = '⏹ Aufnahme stoppen';
} catch(e) { alert('Mikrofon-Zugriff nicht möglich: ' + e.message); }
};

// ── Screen Recording ──
window.fbToggleScreen = async function(){
if(fbState.recordingType === 'screen') { fbStopRec(); return; }
fbStopRecIfActive();
try {
    var stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    startRecording(stream, 'screen');
    document.getElementById('fbBtnScreen').classList.add('recording');
    document.getElementById('fbScreenLabel').textContent = '⏹ Aufnahme stoppen';
    // Handle user stopping share via browser UI
    stream.getVideoTracks()[0].onended = function(){ fbStopRec(); };
} catch(e) { if(e.name !== 'AbortError') alert('Bildschirmaufnahme nicht möglich: ' + e.message); }
};

export function startRecording(stream, type) {
fbState.stream = stream;
fbState.recordingType = type;
fbState.recordingChunks = [];
fbState.recordingStart = Date.now();

var mimeType = 'video/webm';
if(type === 'audio') mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';

fbState.mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
fbState.mediaRecorder.ondataavailable = function(e){ if(e.data.size > 0) fbState.recordingChunks.push(e.data); };
fbState.mediaRecorder.onstop = function(){ finalizeRecording(type, mimeType); };
fbState.mediaRecorder.start(1000); // chunk every 1s for memory safety

document.getElementById('fbRecInfo').style.display = 'flex';
fbState.recTimer = setInterval(updateRecInfo, 500);
}

export function updateRecInfo() {
if(!fbState.recordingStart) return;
var elapsed = Math.floor((Date.now() - fbState.recordingStart) / 1000);
var mm = String(Math.floor(elapsed/60)).padStart(2,'0');
var ss = String(elapsed%60).padStart(2,'0');
document.getElementById('fbRecTime').textContent = mm + ':' + ss;
var totalSize = fbState.recordingChunks.reduce(function(a,c){ return a + c.size; }, 0);
document.getElementById('fbRecSize').textContent = formatSize(totalSize);
}

export function formatSize(bytes) {
if(bytes < 1024) return bytes + ' B';
if(bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
return (bytes/1048576).toFixed(1) + ' MB';
}

export function finalizeRecording(type, mimeType) {
var blob = new Blob(fbState.recordingChunks, { type: mimeType });
var ext = type === 'audio' ? 'webm' : 'webm';
var name = (type === 'audio' ? 'Sprachaufnahme' : 'Bildschirmaufnahme') + '.' + ext;
fbState.attachments.push({ name:name, type:type, blob:blob, size:blob.size, mime:mimeType });
renderAttachments();
resetRecUI();
}

window.fbStopRec = function(){
if(fbState.mediaRecorder && fbState.mediaRecorder.state !== 'inactive') {
    fbState.mediaRecorder.stop();
}
if(fbState.stream) {
    fbState.stream.getTracks().forEach(function(t){ t.stop(); });
    fbState.stream = null;
}
};

export function fbStopRecIfActive() {
if(fbState.recordingType) fbStopRec();
}

export function resetRecUI() {
clearInterval(fbState.recTimer);
fbState.recordingType = null;
fbState.recordingStart = null;
fbState.mediaRecorder = null;
document.getElementById('fbRecInfo').style.display = 'none';
document.getElementById('fbBtnAudio').classList.remove('recording');
document.getElementById('fbBtnScreen').classList.remove('recording');
document.getElementById('fbAudioLabel').textContent = 'Sprachaufnahme';
document.getElementById('fbScreenLabel').textContent = 'Bildschirm aufnehmen';
}

// ── Screenshot ──
window.fbScreenshot = async function(){
try {
    // Hide widget temporarily
    document.getElementById('fbOverlay').style.display = 'none';
    await new Promise(function(r){ setTimeout(r, 200); });

    if(typeof html2canvas !== 'undefined') {
        var canvas = await html2canvas(document.body, { scale: 1, useCORS: true });
        canvas.toBlob(function(blob){
            fbState.attachments.push({ name:'Screenshot.png', type:'screenshot', blob:blob, size:blob.size, mime:'image/png' });
            renderAttachments();
            document.getElementById('fbOverlay').classList.add('fb-open');
        }, 'image/png');
    } else {
        // Fallback: use getDisplayMedia for single frame
        var stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        var track = stream.getVideoTracks()[0];
        var imageCapture = new ImageCapture(track);
        var bitmap = await imageCapture.grabFrame();
        track.stop();
        var canvas = document.createElement('canvas');
        canvas.width = bitmap.width; canvas.height = bitmap.height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        canvas.toBlob(function(blob){
            fbState.attachments.push({ name:'Screenshot.png', type:'screenshot', blob:blob, size:blob.size, mime:'image/png' });
            renderAttachments();
        }, 'image/png');
        document.getElementById('fbOverlay').classList.add('fb-open');
    }
} catch(e) {
    document.getElementById('fbOverlay').classList.add('fb-open');
    if(e.name !== 'AbortError') console.warn('Screenshot failed:', e);
}
};

// ── File Upload ──
window.fbHandleFiles = function(input) {
if(!input.files) return;
var maxSize = 10 * 1024 * 1024; // 10MB per file
for(var i = 0; i < input.files.length; i++) {
    var file = input.files[i];
    if(file.size > maxSize) {
        alert('Datei "' + file.name + '" ist zu groß (max. 10 MB).');
        continue;
    }
    if(fbState.attachments.length >= 5) {
        alert('Maximal 5 Anhänge möglich.');
        break;
    }
    fbState.attachments.push({
        name: file.name,
        type: 'file',
        blob: file,
        size: file.size,
        mime: file.type || 'application/octet-stream'
    });
}
input.value = ''; // reset for re-selection
renderAttachments();
};

// ── Attachments UI ──
export function renderAttachments() {
var el = document.getElementById('fbAttachments');
if(!el) return;
if(!fbState.attachments.length) { el.innerHTML = ''; return; }
el.innerHTML = fbState.attachments.map(function(a, i){
    var icon = a.type==='audio' ? '🎙️' : a.type==='screen' ? '🖥️' : a.type==='file' ? '📎' : '📷';
    return '<div class="fb-attachment">' + icon + ' ' + a.name + ' <span style="color:var(--c-muted)">(' + formatSize(a.size) + ')</span>' +
        '<button onclick="fbRemoveAttachment('+i+')">&times;</button></div>';
}).join('');
}
window.fbRemoveAttachment = function(i){
fbState.attachments.splice(i, 1);
renderAttachments();
};

// ── Submit ──
window.fbSubmit = async function(){
var desc = (document.getElementById('fbDesc').value || '').trim();
var title = (document.getElementById('fbTitle').value || '').trim();
if(!desc && !fbState.attachments.length) {
    document.getElementById('fbDesc').style.borderColor = '#ef4444';
    document.getElementById('fbDesc').placeholder = 'Bitte beschreibe dein Feedback...';
    return;
}
document.getElementById('fbDesc').style.borderColor = '';

var btn = document.getElementById('fbSubmitBtn');
btn.disabled = true; btn.textContent = 'Wird gesendet...';

try {
    // Upload attachments to Supabase Storage
    var uploadedFiles = [];
    for(var i = 0; i < fbState.attachments.length; i++) {
        var a = fbState.attachments[i];
        var ext = a.name.split('.').pop();
        var path = _sbUser().id + '/' + Date.now() + '_' + i + '.' + ext;

        // Chunked upload for large files
        if(a.size > 5 * 1024 * 1024) {
            // For very large files, upload directly (Supabase handles chunking)
            var upResp = await _sb().storage.from('feedback-attachments').upload(path, a.blob, {
                contentType: a.mime,
                upsert: false
            });
            if(upResp.error) { console.error('Upload failed:', upResp.error); continue; }
        } else {
            var upResp = await _sb().storage.from('feedback-attachments').upload(path, a.blob, {
                contentType: a.mime
            });
            if(upResp.error) { console.error('Upload failed:', upResp.error); continue; }
        }
        uploadedFiles.push({
            path: path,
            name: a.name,
            type: a.type,
            size: a.size,
            mime: a.mime
        });
    }

    // Browser info
    var browserInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screen: screen.width + 'x' + screen.height,
        viewport: window.innerWidth + 'x' + window.innerHeight
    };

    // Insert feedback record
    var fbRecord = {
        user_id: _sbUser().id,
        standort_id: (typeof sbStandort !== 'undefined' && sbStandort) ? sbStandort.id : null,
        kategorie: fbState.category,
        titel: title || null,
        beschreibung: desc,
        route: fbState.currentRoute || null,
        browser_info: browserInfo,
        attachments: uploadedFiles
    };

    var resp = await _sb().from('portal_feedback').insert(fbRecord);
    if(resp.error) throw resp.error;

    // Show success
    document.getElementById('fbForm').style.display = 'none';
    document.getElementById('fbSuccess').style.display = 'block';
    fbState.attachments = [];

} catch(err) {
    console.error('Feedback submit error:', err);
    alert('Fehler beim Senden: ' + (err.message || err));
    btn.disabled = false; btn.textContent = 'Feedback senden';
}
};

// Strangler Fig
const _exports = {startRecording,updateRecInfo,formatSize,finalizeRecording,fbStopRecIfActive,resetRecUI,renderAttachments};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[feedback-widget.js] Module loaded – ' + Object.keys(_exports).length + ' exports registered');
