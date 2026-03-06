// vit:bikes - Feedback Widget
// Migrated from inline

// Safe Helpers
function _sb()       { return window.sb; }
function _sbUser()   { return window.sbUser; }
function _sbProfile(){ return window.sbProfile; }
function _escH(s)    { return window.escH ? window.escH(s) : String(s); }
function _showToast(m,t){ if(window.showToast) window.showToast(m,t||'info'); }

// vit:bikes Partner Portal — Feedback Widget (Production)
// Extracted from index.html lines 12842-13180
// ============================================================
// ═══════════════════════════════════════
// FEEDBACK WIDGET – Production Module
// ═══════════════════════════════════════

'use strict';



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
    if(typeof sbUser !== 'undefined' && sbUser && sbUser.id) {
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
    showView('entwicklung');
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
    } catch(e) { _toast('Mikrofon-Zugriff nicht möglich: ' + e.message, 'error'); }
};

// ── Screen Recording ──
window.fbToggleScreen = async function(){
    if(fbState.recordingType === 'screen') { fbStopRec(); return; }
    fbStopRecIfActive();
    try {
        var stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

        // Overlay + Widget ausblenden
        var overlay = document.getElementById('fbOverlay');
        var widget = document.getElementById('fbWidget');
        if(overlay) overlay.style.display = 'none';
        if(widget) widget.style.display = 'none';

        // 3-Sekunden-Countdown
        var countdown = document.createElement('div');
        countdown.id = 'fbScreenCountdown';
        countdown.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;background:rgba(0,0,0,0.8);color:white;font-size:64px;font-weight:900;width:120px;height:120px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif;';
        document.body.appendChild(countdown);
        for(var c = 3; c > 0; c--) {
            countdown.textContent = c;
            await new Promise(function(r){ setTimeout(r, 1000); });
        }
        countdown.remove();

        startRecording(stream, 'screen');

        // Aufnahme-Indikator
        var indicator = document.createElement('div');
        indicator.id = 'fbRecIndicator';
        indicator.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:99999;background:#ef4444;color:white;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;font-family:Outfit,sans-serif;display:flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
        indicator.innerHTML = '<span style="width:10px;height:10px;background:white;border-radius:50%;animation:fbRecPulse 1s infinite"></span> Aufnahme... Klick zum Stoppen';
        indicator.onclick = function(){ window.fbStopRec(); };
        var style = document.createElement('style');
        style.id = 'fbRecPulseStyle';
        style.textContent = '@keyframes fbRecPulse{0%,100%{opacity:1}50%{opacity:0.3}}';
        document.head.appendChild(style);
        document.body.appendChild(indicator);

        stream.getVideoTracks()[0].onended = function(){ fbStopRec(); };
    } catch(e) {
        var ov = document.getElementById('fbOverlay');
        var wg = document.getElementById('fbWidget');
        if(ov) { ov.style.display = ''; ov.classList.add('fb-open'); }
        if(wg) wg.style.display = 'block';
        var cd = document.getElementById('fbScreenCountdown');
        if(cd) cd.remove();
        if(e.name !== 'AbortError') _toast('Bildschirmaufnahme nicht moeglich: ' + e.message, 'error');
    }
};

function startRecording(stream, type) {
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

function updateRecInfo() {
    if(!fbState.recordingStart) return;
    var elapsed = Math.floor((Date.now() - fbState.recordingStart) / 1000);
    var mm = String(Math.floor(elapsed/60)).padStart(2,'0');
    var ss = String(elapsed%60).padStart(2,'0');
    document.getElementById('fbRecTime').textContent = mm + ':' + ss;
    var totalSize = fbState.recordingChunks.reduce(function(a,c){ return a + c.size; }, 0);
    document.getElementById('fbRecSize').textContent = formatSize(totalSize);
}

function formatSize(bytes) {
    if(bytes < 1024) return bytes + ' B';
    if(bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/1048576).toFixed(1) + ' MB';
}

function finalizeRecording(type, mimeType) {
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

function fbStopRecIfActive() {
    if(fbState.recordingType) fbStopRec();
}

function resetRecUI() {
    clearInterval(fbState.recTimer);
    var wasScreen = fbState.recordingType === 'screen';
    fbState.recordingType = null;
    fbState.recordingStart = null;
    fbState.mediaRecorder = null;
    document.getElementById('fbRecInfo').style.display = 'none';
    document.getElementById('fbBtnAudio').classList.remove('recording');
    document.getElementById('fbBtnScreen').classList.remove('recording');
    document.getElementById('fbAudioLabel').textContent = 'Sprachaufnahme';
    document.getElementById('fbScreenLabel').textContent = 'Bildschirm aufnehmen';

    if(wasScreen) {
        var overlay = document.getElementById('fbOverlay');
        var widget = document.getElementById('fbWidget');
        if(overlay) { overlay.style.display = ''; overlay.classList.add('fb-open'); }
        if(widget) widget.style.display = 'block';
        var indicator = document.getElementById('fbRecIndicator');
        if(indicator) indicator.remove();
        var pulseStyle = document.getElementById('fbRecPulseStyle');
        if(pulseStyle) pulseStyle.remove();
    }
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
            _toast('Datei "' + file.name + '" ist zu groß (max. 10 MB).', 'warning');
            continue;
        }
        if(fbState.attachments.length >= 5) {
            _toast('Maximal 5 Anhänge möglich.', 'warning');
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
function renderAttachments() {
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
            var path = sbUser.id + '/' + Date.now() + '_' + i + '.' + ext;

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
            user_id: sbUser.id,
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
        window.logAudit && window.logAudit('feedback_eingereicht', 'feedback', { kategorie: fbRecord.kategorie, modul: fbRecord.modul });

        // Show success
        document.getElementById('fbForm').style.display = 'none';
        document.getElementById('fbSuccess').style.display = 'block';
        fbState.attachments = [];

    } catch(err) {
        console.error('Feedback submit error:', err);
        _toast('Fehler beim Senden: ' + (err.message || err), 'error');
        btn.disabled = false; btn.textContent = 'Feedback senden';
    }
};


