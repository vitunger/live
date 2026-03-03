/**
 * views/video-upload.js - Multi-File Upload, Drag&Drop, Auto-Analyse
 * @module views/video-upload
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// ==================== UPLOAD (Standort – Multi-File) ====================
var vpSelectedFiles = [];

window.vpInitUpload = function() {
var dz = document.getElementById('vpDropZone');
var fi = document.getElementById('vpFileInput');
if(!dz || dz._vpInit) return;
dz._vpInit = true;
dz.addEventListener('click', function(){ fi.click(); });
dz.addEventListener('dragover', function(e){ e.preventDefault(); dz.classList.add('border-vit-orange','bg-orange-50'); });
dz.addEventListener('dragleave', function(){ dz.classList.remove('border-vit-orange','bg-orange-50'); });
dz.addEventListener('drop', function(e){
    e.preventDefault(); dz.classList.remove('border-vit-orange','bg-orange-50');
    vpAddFiles(e.dataTransfer.files);
});
fi.addEventListener('change', function(){ vpAddFiles(this.files); this.value=''; });
};

export function vpAddFiles(fileList) {
for(var i=0; i<fileList.length; i++) {
    var f = fileList[i];
    if(!f.type.startsWith('video/')) continue;
    if(f.size > 2147483648) { _showToast(f.name + ': zu gross (max. 2 GB)', 'info'); continue; }
    if(vpSelectedFiles.some(function(sf){ return sf.name===f.name && sf.size===f.size; })) continue;
    vpSelectedFiles.push(f);
}
vpRenderFileQueue();
}

export function vpRenderFileQueue() {
var q = document.getElementById('vpFileQueue');
var btn = document.getElementById('vpUploadBtn');
if(!q) return;
if(vpSelectedFiles.length === 0) { q.innerHTML = ''; btn.disabled = true; return; }
btn.disabled = false;
var html = '<div class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">' + vpSelectedFiles.length + ' Video' + (vpSelectedFiles.length>1?'s':'') + ' ausgewaehlt' + (vpSelectedFiles.length>1?' (werden als Gruppe geschnitten)':'') + '</div>';
vpSelectedFiles.forEach(function(f, idx) {
    var sizeMB = (f.size/(1024*1024)).toFixed(1);
    html += '<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" id="vpFileItem_'+idx+'">';
    html += '<div class="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">'+(idx+1)+'</div>';
    html += '<div class="flex-1 min-w-0"><p class="text-sm font-medium text-gray-800 truncate">'+_escH(f.name)+'</p><p class="text-xs text-gray-400">'+sizeMB+' MB</p></div>';
    html += '<div id="vpFileStatus_'+idx+'" class="text-xs text-gray-400">Bereit</div>';
    html += '<button onclick="vpRemoveFile('+idx+')" class="text-gray-300 hover:text-red-500 text-lg">&times;</button>';
    html += '</div>';
});
q.innerHTML = html;
}

window.vpRemoveFile = function(idx) {
vpSelectedFiles.splice(idx, 1);
vpRenderFileQueue();
};

window.vpDoMultiUpload = async function() {
if(vpSelectedFiles.length === 0) return;
var btn = document.getElementById('vpUploadBtn');
var status = document.getElementById('vpUploadStatus');
var statusText = document.getElementById('vpUploadStatusText');
var bar = document.getElementById('vpUploadBar');
var pct = document.getElementById('vpUploadPercent');
btn.disabled = true;
status.style.display = 'block';
bar.className = 'bg-vit-orange h-2 rounded-full transition-all';

var cat = document.getElementById('vpUploadCategory')?.value || 'sonstiges';
var comment = document.getElementById('vpUploadComment')?.value?.trim() || null;
var thema = document.getElementById('smUploadThema')?.value || null;
var groupId = vpSelectedFiles.length > 1 ? crypto.randomUUID() : null;
var groupLabel = thema || (vpSelectedFiles.length > 1 ? 'Gruppe vom ' + new Date().toLocaleDateString('de-DE') : null);

var total = vpSelectedFiles.length;
var done = 0;
var errors = [];

// Get session for auth token
var sessionResp = await _sb().auth.getSession();
var accessToken = sessionResp?.data?.session?.access_token;
if(!accessToken) { _showToast('Nicht eingeloggt!', 'info'); btn.disabled = false; return; }

var projectId = (window.SUPABASE_URL || '').split('//')[1]?.split('.')[0] || 'lwwagbkxeofahhwebkab';

for(var i=0; i<total; i++) {
    var file = vpSelectedFiles[i];
    var fStatus = document.getElementById('vpFileStatus_'+i);
    var standortId = (window.sbStandort && window.sbStandort.id)
        || (window.sbProfile && window.sbProfile.standort_id)
        || (window.currentStandortId)
        || null;
    if(!standortId) {
        // Try to get from profile in DB
        try {
            var uid = _sbUser()?.id;
            if(uid) {
                var {data:u} = await _sb().from('users').select('standort_id').eq('id', uid).single();
                if(u && u.standort_id) standortId = u.standort_id;
            }
        } catch(e) {}
    }
    if(!standortId) { _showToast('Kein Standort zugewiesen. Bitte Profil pr\u00fcfen.', 'error'); btn.disabled = false; return; }
    var storagePath = standortId + '/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g,'_');

    pct.textContent = (i+1) + ' / ' + total;
    statusText.textContent = 'Hochladen: ' + file.name;
    if(fStatus) fStatus.innerHTML = '<span class="text-blue-500">\u2b06\ufe0f 0%</span>';

    try {
        await new Promise(function(resolve, reject) {
            var upload = new tus.Upload(file, {
                endpoint: 'https://' + projectId + '.storage.supabase.co/storage/v1/upload/resumable',
                retryDelays: [0, 3000, 5000, 10000, 20000],
                headers: {
                    authorization: 'Bearer ' + accessToken,
                    'x-upsert': 'true'
                },
                uploadDataDuringCreation: true,
                removeFingerprintOnSuccess: true,
                metadata: {
                    bucketName: 'videos',
                    objectName: storagePath,
                    contentType: file.type,
                    cacheControl: '3600'
                },
                chunkSize: 6 * 1024 * 1024,
                onError: function(error) {
                    reject(error);
                },
                onProgress: function(bytesUploaded, bytesTotal) {
                    var filePct = Math.round((bytesUploaded / bytesTotal) * 100);
                    var totalPct = Math.round(((done + bytesUploaded/bytesTotal) / total) * 100);
                    bar.style.width = totalPct + '%';
                    if(fStatus) fStatus.innerHTML = '<span class="text-blue-500">\u2b06\ufe0f ' + filePct + '%</span>';
                    statusText.textContent = 'Hochladen: ' + file.name + ' (' + filePct + '%)';
                },
                onSuccess: function() {
                    resolve();
                }
            });
            upload.findPreviousUploads().then(function(prev) {
                if(prev.length) upload.resumeFromPreviousUpload(prev[0]);
                upload.start();
            });
        });

        if(fStatus) fStatus.innerHTML = '<span class="text-yellow-500">\ud83d\udcbe Speichern...</span>';

        var insertData = {
            standort_id: standortId,
            uploaded_by: _sbUser().id,
            storage_path: storagePath,
            filename: file.name,
            file_size_bytes: file.size,
            category: cat,
            pipeline_status: 'uploaded',
            pipeline_status_detail: comment,
            sort_order: i
        };
        if(groupId) { insertData.group_id = groupId; insertData.group_label = groupLabel; }

        var {data:insertedRow, error:dbErr} = await _sb().from('videos').insert(insertData).select('id').single();
        if(dbErr) throw dbErr;

        if(fStatus) fStatus.innerHTML = '<span class="text-green-600">\u2705 Fertig</span>';
        done++;

        // Auto-trigger analysis in background (HQ only)
        var _isHq = (window.sbProfile && window.sbProfile.is_hq) || false;
        if(insertedRow && insertedRow.id && _isHq) {
            vpAutoAnalyze(insertedRow.id, file.name, fStatus);
        }
    } catch(e) {
        var errMsg = e.message || e.toString();
        errors.push(file.name + ': ' + errMsg);
        if(fStatus) fStatus.innerHTML = '<span class="text-red-500">\u274c ' + errMsg.substring(0,40) + '</span>';
    }
}

bar.style.width = '100%';
if(errors.length === 0) {
    statusText.textContent = '\u2705 Alle ' + total + ' Videos hochgeladen!' + ((window.sbProfile && window.sbProfile.is_hq) ? ' Analyse startet automatisch...' : ' Das HQ \u00fcbernimmt ab hier.');
    bar.className = 'bg-green-500 h-2 rounded-full transition-all';
    vpSelectedFiles = [];
    setTimeout(function(){ switchSmSub('pipeline'); }, 4000);
} else {
    statusText.textContent = done + ' von ' + total + ' hochgeladen, ' + errors.length + ' Fehler';
    bar.className = 'bg-yellow-500 h-2 rounded-full transition-all';
}
btn.disabled = false;
};

// ==================== AUTO-ANALYSE NACH UPLOAD ====================
async function vpAutoAnalyze(videoId, filename, statusEl) {
    try {
        if(statusEl) statusEl.innerHTML = '<span class="text-blue-500">\ud83d\udd2c Analyse l\u00e4uft...</span>';
        var {data, error} = await _sb().functions.invoke('analyze-video', {
            body: { video_id: videoId }
        });
        if(error) throw error;
        if(data && data.success) {
            var persons = data.analysis?.persons_detected || 0;
            var quality = data.analysis?.quality_score || '\u2013';
            if(statusEl) statusEl.innerHTML = '<span class="text-green-600">\u2705 Analysiert (\ud83d\udc65' + persons + ' \u00b7 \u2b50' + quality + '/100)</span>';
        } else {
            throw new Error(data?.error || 'Analyse fehlgeschlagen');
        }
    } catch(e) {
        console.warn('[Pipeline] Auto-Analyse Fehler f\u00fcr ' + filename + ':', e.message);
        if(statusEl) statusEl.innerHTML = '<span class="text-yellow-500">\u26a0\ufe0f Hochgeladen (Analyse manuell starten)</span>';
    }
}

// Strangler Fig
const _exports = {vpAddFiles,vpRenderFileQueue};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
