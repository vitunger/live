/**
 * views/video-pipeline.js - Video Pipeline (Upload, Tagging, Consent, Analysis, HQ Review)
 * @module views/video-pipeline
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// ==================== HELPERS ====================
var vpStatusLabels = {
uploaded:'Hochgeladen', analyzing:'Analyse...', consent_check:'Consent-Check',
consent_blocked:'Consent fehlt', cutting:'Wird geschnitten', review:'Freigabe',
approved:'Freigegeben', publishing:'Publishing...', published:'Veröffentlicht',
rejected:'Abgelehnt', failed:'Fehler'
};
var vpStatusColors = {
uploaded:'bg-gray-100 text-gray-700', analyzing:'bg-blue-100 text-blue-700',
consent_check:'bg-yellow-100 text-yellow-700', consent_blocked:'bg-red-100 text-red-700',
cutting:'bg-purple-100 text-purple-700', review:'bg-orange-100 text-orange-700',
approved:'bg-green-100 text-green-700', publishing:'bg-blue-100 text-blue-700',
published:'bg-green-200 text-green-800', rejected:'bg-red-100 text-red-700',
failed:'bg-red-200 text-red-800'
};
var vpCategoryLabels = {probefahrt:'Probefahrt',event:'Event',werkstatt:'Werkstatt',cargo_demo:'Cargo Demo',sonstiges:'Sonstiges'};
var vpConsentTypeLabels = {employee_general:'Mitarbeiter (Generell)',customer_single:'Kunde (Einmalig)',customer_general:'Kunde (Generell)'};

export function vpBadge(status) {
return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium '+(vpStatusColors[status]||'bg-gray-100 text-gray-700')+'">'+(vpStatusLabels[status]||status)+'</span>';
}
export function vpDate(d) { if(!d) return '–'; return new Date(d).toLocaleDateString('de-DE'); }
export function vpDateTime(d) { if(!d) return '–'; return new Date(d).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}); }
export function vpFileSize(bytes) { if(!bytes) return '–'; if(bytes<1024*1024) return (bytes/1024).toFixed(0)+' KB'; return (bytes/(1024*1024)).toFixed(1)+' MB'; }

export function vpModal(html) {
document.getElementById('vpModalContent').innerHTML = html;
document.getElementById('vpModal').style.display = 'flex';
}
window.vpCloseModal = function() { document.getElementById('vpModal').style.display = 'none'; };
document.addEventListener('click', function(e){ if(e.target && e.target.id === 'vpModal') vpCloseModal(); });

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
    if(f.size > 2147483648) { alert(f.name + ': zu gross (max. 2 GB)'); continue; }
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
    html += '<div class="flex-1 min-w-0"><p class="text-sm font-medium text-gray-800 truncate">'+f.name+'</p><p class="text-xs text-gray-400">'+sizeMB+' MB</p></div>';
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
if(!accessToken) { alert('Nicht eingeloggt!'); btn.disabled = false; return; }

var projectId = 'lwwagbkxeofahhwebkab';

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
    if(!standortId) { alert('Kein Standort zugewiesen. Bitte Profil prüfen.'); btn.disabled = false; return; }
    var storagePath = standortId + '/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g,'_');

    pct.textContent = (i+1) + ' / ' + total;
    statusText.textContent = 'Hochladen: ' + file.name;
    if(fStatus) fStatus.innerHTML = '<span class="text-blue-500">⬆️ 0%</span>';

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
                    if(fStatus) fStatus.innerHTML = '<span class="text-blue-500">⬆️ ' + filePct + '%</span>';
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

        if(fStatus) fStatus.innerHTML = '<span class="text-yellow-500">💾 Speichern...</span>';

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

        if(fStatus) fStatus.innerHTML = '<span class="text-green-600">✅ Fertig</span>';
        done++;

        // Auto-trigger analysis in background (HQ only)
        var _isHq = (window.sbProfile && window.sbProfile.is_hq) || false;
        if(insertedRow && insertedRow.id && _isHq) {
            vpAutoAnalyze(insertedRow.id, file.name, fStatus);
        }
    } catch(e) {
        var errMsg = e.message || e.toString();
        errors.push(file.name + ': ' + errMsg);
        if(fStatus) fStatus.innerHTML = '<span class="text-red-500">❌ ' + errMsg.substring(0,40) + '</span>';
    }
}

bar.style.width = '100%';
if(errors.length === 0) {
    statusText.textContent = '✅ Alle ' + total + ' Videos hochgeladen!' + ((window.sbProfile && window.sbProfile.is_hq) ? ' Analyse startet automatisch...' : ' Das HQ übernimmt ab hier.');
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
        if(statusEl) statusEl.innerHTML = '<span class="text-blue-500">🔬 Analyse läuft...</span>';
        var {data, error} = await _sb().functions.invoke('analyze-video', {
            body: { video_id: videoId }
        });
        if(error) throw error;
        if(data && data.success) {
            var persons = data.analysis?.persons_detected || 0;
            var quality = data.analysis?.quality_score || '–';
            if(statusEl) statusEl.innerHTML = '<span class="text-green-600">✅ Analysiert (👥' + persons + ' · ⭐' + quality + '/100)</span>';
            console.log('[Pipeline] Auto-Analyse OK für ' + filename + ':', data.analysis);
        } else {
            throw new Error(data?.error || 'Analyse fehlgeschlagen');
        }
    } catch(e) {
        console.warn('[Pipeline] Auto-Analyse Fehler für ' + filename + ':', e.message);
        if(statusEl) statusEl.innerHTML = '<span class="text-yellow-500">⚠️ Hochgeladen (Analyse manuell starten)</span>';
    }
}

// ==================== PIPELINE DASHBOARD (Standort: "Meine Videos") ====================
window.vpRenderPipelineDashboard = async function() {
var c = document.getElementById('vpDashboardContent');
if(!c) return;
c.innerHTML = '<div class="flex justify-center py-12"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>';

try {
    var sid = (typeof sbStandort === 'object' && sbStandort) ? sbStandort.id 
        : (window.sbProfile && window.sbProfile.standort_id) ? window.sbProfile.standort_id
        : null;
    var isHq = (window.sbProfile && window.sbProfile.is_hq) || false;
    if(!sid) {
        // Try DB lookup
        try {
            var uid = _sbUser()?.id;
            if(uid) {
                var {data:u} = await _sb().from('users').select('standort_id, is_hq').eq('id', uid).single();
                if(u) { sid = u.standort_id; if(u.is_hq) isHq = true; }
            }
        } catch(e) {}
    }
    // HQ without standort: show all videos
    var query = _sb().from('videos').select('*').order('created_at',{ascending:false});
    if(sid) {
        query = query.eq('standort_id', sid);
    } else if(!isHq) {
        c.innerHTML = '<div class="vit-card p-8 text-center text-gray-400"><div class="text-4xl mb-2">🎬</div><p>Kein Standort zugeordnet.</p></div>'; return;
    }
    var {data:videos,error} = await query;
    if(error) throw error;
    videos = videos || [];

    var total = videos.length;
    var inPipeline = videos.filter(function(v){return !['published','rejected','failed'].includes(v.pipeline_status)}).length;
    var published = videos.filter(function(v){return v.pipeline_status==='published'}).length;
    var needReview = videos.filter(function(v){return v.pipeline_status==='review'}).length;

    var html = '';
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">';
    html += '<div class="vit-card p-4"><div class="text-2xl font-bold text-gray-800">'+total+'</div><div class="text-xs text-gray-500">Videos gesamt</div></div>';
    html += '<div class="vit-card p-4"><div class="text-2xl font-bold text-blue-600">'+inPipeline+'</div><div class="text-xs text-gray-500">In Pipeline</div></div>';
    html += '<div class="vit-card p-4"><div class="text-2xl font-bold text-green-600">'+published+'</div><div class="text-xs text-gray-500">Veröffentlicht</div></div>';
    html += '<div class="vit-card p-4 '+(needReview>0?'ring-2 ring-orange-400':'')+'"><div class="text-2xl font-bold text-orange-600">'+needReview+'</div><div class="text-xs text-gray-500">Bei HQ zur Freigabe</div></div>';
    html += '</div>';

    // Pipeline visualization
    html += '<div class="vit-card p-4 mb-6"><h3 class="font-semibold text-gray-700 mb-3">Pipeline-Status</h3>';
    var stages = ['uploaded','analyzing','consent_check','cutting','review','publishing','published'];
    html += '<div class="flex items-center gap-1 text-xs">';
    stages.forEach(function(s){
        var count = videos.filter(function(v){return v.pipeline_status===s}).length;
        html += '<div class="flex-1 text-center"><div class="h-8 rounded flex items-center justify-center font-medium '+(vpStatusColors[s]||'')+'">'+(count||'')+'</div><div class="mt-1 text-gray-500 truncate">'+(vpStatusLabels[s]||s)+'</div></div>';
        if(s !== 'published') html += '<div class="text-gray-300">→</div>';
    });
    html += '</div></div>';

    if(videos.length === 0) {
        html += '<div class="vit-card p-8 text-center text-gray-400"><div class="text-4xl mb-2">🎬</div><p>Noch keine Videos hochgeladen.</p><button onclick="switchSmSub(\'upload\')" class="mt-3 text-vit-orange hover:underline font-medium">Erstes Video hochladen →</button></div>';
    } else {
        // Group videos by group_id
        var groups = {};
        var singles = [];
        videos.forEach(function(v){
            if(v.group_id) {
                if(!groups[v.group_id]) groups[v.group_id] = {label: v.group_label || 'Gruppe', videos: []};
                groups[v.group_id].videos.push(v);
            } else {
                singles.push(v);
            }
        });

        html += '<div class="vit-card overflow-hidden"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="text-left p-3 font-medium text-gray-600">Video</th><th class="text-left p-3 font-medium text-gray-600">Kategorie</th><th class="text-left p-3 font-medium text-gray-600">Status</th><th class="text-left p-3 font-medium text-gray-600">Hochgeladen</th><th class="text-right p-3 font-medium text-gray-600">Groesse</th></tr></thead><tbody>';

        // Render groups first
        Object.keys(groups).forEach(function(gid){
            var g = groups[gid];
            var totalSize = g.videos.reduce(function(sum,v){return sum+v.file_size_bytes},0);
            html += '<tr class="border-t-2 border-orange-200 bg-orange-50"><td class="p-3 font-medium text-gray-800" colspan="2">📎 '+g.label+' <span class="text-xs text-gray-400">('+g.videos.length+' Clips)</span></td><td class="p-3">'+vpBadge(g.videos[0].pipeline_status)+'</td><td class="p-3 text-gray-500">'+vpDateTime(g.videos[0].created_at)+'</td><td class="p-3 text-right text-gray-500">'+vpFileSize(totalSize)+'</td></tr>';
            g.videos.sort(function(a,b){return (a.sort_order||0)-(b.sort_order||0)});
            g.videos.forEach(function(v){
                html += '<tr class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer bg-orange-50/30" onclick="vpShowVideoDetail(\''+v.id+'\')">';
                html += '<td class="p-3 pl-8 text-gray-600">↳ '+v.filename+'</td>';
                html += '<td class="p-3 text-gray-500">'+(vpCategoryLabels[v.category]||v.category)+'</td>';
                html += '<td class="p-3">'+vpBadge(v.pipeline_status)+'</td>';
                html += '<td class="p-3 text-gray-500">'+vpDateTime(v.created_at)+'</td>';
                html += '<td class="p-3 text-right text-gray-500">'+vpFileSize(v.file_size_bytes)+'</td>';
                html += '</tr>';
            });
        });

        // Then singles
        singles.forEach(function(v){
            html += '<tr class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="vpShowVideoDetail(\''+v.id+'\')">';
            html += '<td class="p-3 font-medium text-gray-800">'+v.filename+'</td>';
            html += '<td class="p-3">'+(vpCategoryLabels[v.category]||v.category)+'</td>';
            html += '<td class="p-3">'+vpBadge(v.pipeline_status)+'</td>';
            html += '<td class="p-3 text-gray-500">'+vpDateTime(v.created_at)+'</td>';
            html += '<td class="p-3 text-right text-gray-500">'+vpFileSize(v.file_size_bytes)+'</td>';
            html += '</tr>';
        });
        html += '</tbody></table></div>';
    }
    c.innerHTML = html;
} catch(e) {
    c.innerHTML = '<div class="vit-card p-6 text-red-600">Fehler beim Laden: '+e.message+'</div>';
}
};

// ==================== VIDEO DETAIL MODAL ====================
window.vpShowVideoDetail = async function(videoId) {
vpModal('<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>');
try {
    var {data:v} = await _sb().from('videos').select('*').eq('id',videoId).single();
    var {data:persons} = await _sb().from('video_persons').select('*, consents(person_name,consent_type,valid_until,revoked_at)').eq('video_id',videoId);
    var {data:reels} = await _sb().from('reels').select('*, reel_publications(*)').eq('video_id',videoId);
    var {data:logs} = await _sb().from('pipeline_log').select('*').eq('video_id',videoId).order('created_at',{ascending:true});

    var isHqUser = (window.sbProfile && window.sbProfile.is_hq) || (window.currentRoles && window.currentRoles.indexOf('hq') !== -1) || false;

    // HEADER
    var html = '<div class="flex justify-between items-start mb-3"><div><h2 class="text-lg font-bold text-gray-800">'+v.filename+'</h2><p class="text-xs text-gray-500">'+(vpCategoryLabels[v.category]||v.category)+' \u00b7 '+vpFileSize(v.file_size_bytes)+' \u00b7 '+vpDateTime(v.created_at)+'</p></div><div class="flex items-center gap-2">'+vpBadge(v.pipeline_status)+'<button onclick="vpCloseModal()" class="text-gray-400 hover:text-gray-600 text-2xl ml-2">&times;</button></div></div>';

    // Progress bar
    var stages = ['uploaded','analyzing','consent_check','cutting','review','approved','published'];
    var currentIdx = stages.indexOf(v.pipeline_status);
    if(currentIdx===-1) currentIdx = stages.indexOf({consent_blocked:'consent_check',rejected:'review',failed:'uploaded'}[v.pipeline_status]||'uploaded');
    html += '<div class="flex items-center gap-0.5 mb-4">';
    stages.forEach(function(s,i){
        var cls = i<currentIdx?'bg-green-400':i===currentIdx?'bg-vit-orange':'bg-gray-200';
        html += '<div class="flex-1 h-1.5 rounded-full '+cls+'" title="'+(vpStatusLabels[s]||s)+'"></div>';
    });
    html += '</div>';

    if(v.pipeline_status_detail) html += '<div class="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">\u2139\ufe0f '+v.pipeline_status_detail+'</div>';

    // Get signed URL
    var signedUrl = null;
    try {
        var {data:signData} = await _sb().storage.from('videos').createSignedUrl(v.storage_path, 600);
        if(signData && signData.signedUrl) signedUrl = signData.signedUrl;
    } catch(e) { console.warn('Signed URL failed:', e); }

    // SPLIT LAYOUT
    html += '<div class="grid grid-cols-1 lg:grid-cols-5 gap-4">';

    // LEFT: Video + Meta (3 cols)
    html += '<div class="lg:col-span-3">';

    if(signedUrl) {
        html += '<div class="rounded-lg overflow-hidden bg-black mb-3">';
        html += '<video id="vpDetailPlayer" controls preload="metadata" class="w-full" style="max-height:360px;">';
        html += '<source src="'+signedUrl+'" type="video/mp4">';
        html += '<source src="'+signedUrl+'" type="video/quicktime">';
        html += '</video></div>';
        html += '<a href="'+signedUrl+'" target="_blank" download class="text-xs text-gray-400 hover:text-vit-orange">\u2b07\ufe0f Herunterladen</a>';
    } else {
        html += '<div class="p-8 bg-gray-100 rounded-lg text-center text-gray-400 mb-3"><div class="text-3xl mb-2">\ud83c\udfac</div><p class="text-sm">Video nicht verf\u00fcgbar</p></div>';
    }

    // Quick Actions (HQ)
    if(isHqUser) {
        html += '<div class="flex flex-wrap gap-2 mt-2 mb-3">';
        if(v.pipeline_status==='uploaded') {
            html += '<button onclick="vpTriggerAnalysis(\''+v.id+'\')" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-xs hover:bg-orange-600">\ud83d\udd2c Analysieren</button>';
            html += '<button onclick="vpManualAdvance(\''+v.id+'\',\'analyzing\')" class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200">\u23e9 Weiter</button>';
        }
        if(v.pipeline_status==='consent_check'||v.pipeline_status==='consent_blocked') {
            html += '<button onclick="vpCloseModal();vpShowTagging(\''+v.id+'\')" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-xs hover:bg-orange-600">\ud83d\udc65 Taggen</button>';
            html += '<button onclick="vpTriggerConsent(\''+v.id+'\')" class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600">\ud83d\udd0d Consent</button>';
            html += '<button onclick="vpManualAdvance(\''+v.id+'\',\'cutting\')" class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200">\u23e9 Skip</button>';
        }
        if(v.pipeline_status==='cutting') {
            html += '<button onclick="vpTriggerReels(\''+v.id+'\')" class="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600">\ud83c\udfac Reels</button>';
            html += '<button onclick="vpManualAdvance(\''+v.id+'\',\'review\')" class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200">\u23e9 Freigabe</button>';
        }
        if(v.pipeline_status==='review') {
            html += '<button onclick="vpHqApprove(\''+v.id+'\')" class="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600">\u2705 Freigeben</button>';
            html += '<button onclick="vpHqReject(\''+v.id+'\')" class="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600">\u274c Ablehnen</button>';
        }
        if(v.pipeline_status==='approved') html += '<button onclick="vpManualAdvance(\''+v.id+'\',\'publishing\')" class="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs hover:bg-purple-600">\ud83d\ude80 Publish</button>';
        if(v.pipeline_status==='rejected') html += '<button onclick="vpManualAdvance(\''+v.id+'\',\'uploaded\')" class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200">\ud83d\udd04 Reset</button>';
        html += '</div>';
    } else {
        var statusMsgs = {uploaded:'\ud83d\udce4 HQ \u00fcbernimmt ab hier.',consent_check:'\u23f3 HQ pr\u00fcft Einwilligungen.',cutting:'\u2702\ufe0f HQ k\u00fcmmert sich um den Schnitt.',review:'\ud83d\udc40 Wird vom HQ gepr\u00fcft.',approved:'\u2705 Freigegeben!',published:'\ud83c\udf89 Ver\u00f6ffentlicht!',rejected:'\u274c Abgelehnt: '+(v.pipeline_status_detail||'')};
        html += '<div class="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 mt-2 mb-3">'+(statusMsgs[v.pipeline_status]||'')+'</div>';
    }

    // Personen (compact pills, click to jump in video)
    if(persons && persons.length>0) {
        html += '<div class="mb-3"><h3 class="text-sm font-semibold text-gray-600 mb-2">\ud83d\udc65 Personen ('+persons.length+')</h3>';
        html += '<div class="flex flex-wrap gap-2">';
        persons.forEach(function(p) {
            var statusIcon = p.consent_status==='cleared'?'\u2705':p.consent_status==='missing'?'\u274c':'\u26a0\ufe0f';
            var bg = p.consent_status==='cleared'?'bg-green-50 border-green-300':p.consent_status==='missing'?'bg-red-50 border-red-300':'bg-yellow-50 border-yellow-300';
            var timestamps = p.scene_timestamps || [];
            var firstSec = (timestamps[0] && timestamps[0].start) || 0;
            html += '<div class="flex items-center gap-2 px-3 py-2 rounded-lg border '+bg+' cursor-pointer hover:shadow-sm" onclick="vpJumpTo('+firstSec+')">';
            html += '<span>'+statusIcon+'</span><span class="text-sm font-medium">'+p.person_label+'</span>';
            html += '<span class="text-xs text-gray-400">'+vpFormatTime(firstSec)+'</span>';
            html += '</div>';
        });
        html += '</div></div>';
    }

    // Reels (compact)
    if(reels && reels.length>0) {
        html += '<div class="mb-3"><h3 class="text-sm font-semibold text-gray-600 mb-2">\ud83c\udfde\ufe0f Reels ('+reels.length+')</h3>';
        reels.forEach(function(r) {
            html += '<div class="flex justify-between items-center p-2 bg-gray-50 rounded text-xs mb-1"><span>'+(r.caption?r.caption.substring(0,50):'Reel')+'</span>'+vpBadge(r.status)+'</div>';
        });
        html += '</div>';
    }

    // Untertitel-Sektion (HQ only)
    if(isHqUser) {
        html += '<div class="mb-3"><h3 class="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">\ud83d\udcac Untertitel '+(v.has_subtitles?'<span class="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">\u2713 vorhanden</span>':'<span class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">nicht vorhanden</span>')+'</h3>';
        html += '<div class="flex gap-2 flex-wrap">';
        html += '<button onclick="vpShowSubtitleEditor(\''+v.id+'\')" class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200">\u270f\ufe0f Editor</button>';
        html += '<button onclick="vpAutoTranscribe(\''+v.id+'\')" class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100">\ud83e\udd16 Auto-Transkription</button>';
        html += '<button onclick="vpImportSrt(\''+v.id+'\')" class="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs hover:bg-gray-100">\ud83d\udcc4 SRT Import</button>';
        html += '</div></div>';
    }

    // Pipeline-Log (collapsible)
    if(logs && logs.length>0) {
        html += '<details class="mb-3"><summary class="text-sm font-semibold text-gray-600 cursor-pointer hover:text-gray-800">\ud83d\udccb Pipeline-Log ('+logs.length+')</summary>';
        html += '<div class="space-y-0.5 max-h-32 overflow-y-auto mt-2">';
        logs.forEach(function(l){ html += '<div class="flex gap-2 text-[10px] text-gray-500"><span class="whitespace-nowrap">'+vpDateTime(l.created_at)+'</span><span class="font-medium text-gray-600">['+l.phase+']</span><span>'+l.action+'</span></div>'; });
        html += '</div></details>';
    }

    html += '</div>'; // end left

    // RIGHT: KI-Feedback Chat (2 cols)
    html += '<div class="lg:col-span-2 flex flex-col">';

    if(isHqUser) {
        html += '<div class="bg-gray-50 rounded-xl border border-gray-200 flex flex-col" style="height:100%;min-height:400px;">';
        html += '<div class="flex items-center gap-2 px-4 py-3 border-b bg-white rounded-t-xl"><span class="text-lg">\ud83e\udd16</span><div><div class="font-semibold text-sm text-gray-800">KI-Feedback</div><div class="text-[10px] text-gray-400">Sag der KI was du \u00e4ndern willst</div></div></div>';

        html += '<div id="vpChatMessages" class="flex-1 overflow-y-auto px-4 py-3 space-y-3" style="max-height:350px;">';

        var feedbackLogs = (logs||[]).filter(function(l){ return l.phase==='feedback' || l.action==='hq_feedback'; });
        if(feedbackLogs.length > 0) {
            feedbackLogs.forEach(function(l) {
                var d = l.details || {};
                html += '<div class="flex gap-2"><div class="w-6 h-6 rounded-full bg-vit-orange text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">HQ</div><div class="bg-white rounded-lg rounded-tl-sm px-3 py-2 text-xs shadow-sm max-w-[90%]">'+(d.feedback||l.action)+'<div class="text-[10px] text-gray-300 mt-1">'+vpDateTime(l.created_at)+'</div></div></div>';
            });
        }
        if(reels) {
            reels.forEach(function(r) {
                if(r.feedback_summary) html += '<div class="flex gap-2 justify-end"><div class="bg-blue-50 rounded-lg rounded-tr-sm px-3 py-2 text-xs shadow-sm max-w-[90%]"><div class="text-[10px] font-medium text-blue-600 mb-1">\ud83e\udd16 KI</div>'+r.feedback_summary+'</div><div class="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">KI</div></div>';
                if(r.review_notes && r.status==='rejected') html += '<div class="flex gap-2"><div class="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">HQ</div><div class="bg-red-50 rounded-lg rounded-tl-sm px-3 py-2 text-xs shadow-sm">\u274c '+r.review_notes+'</div></div>';
            });
        }
        if(feedbackLogs.length===0 && !(reels||[]).some(function(r){return r.feedback_summary||r.review_notes;})) {
            html += '<div class="text-center text-gray-300 text-xs py-8"><p>\ud83d\udcac Noch kein Feedback</p><p class="mt-1">Nutze die Tags oder schreib frei</p></div>';
        }
        html += '</div>';

        html += '<div class="px-3 py-2 border-t bg-white rounded-b-xl"><div class="flex flex-wrap gap-1 mb-2">';
        ['K\u00fcrzer','L\u00e4nger','Mehr Action','Anderer CTA','Untertitel','Intro','Outro','Ton','Branding','Schnitt'].forEach(function(tag) {
            html += '<button onclick="vpChatAddTag(this)" class="vp-chat-tag text-[10px] px-2 py-0.5 border border-gray-200 rounded-full hover:bg-vit-orange hover:text-white hover:border-vit-orange transition cursor-pointer" data-active="false">'+tag+'</button>';
        });
        html += '</div>';
        html += '<div class="flex gap-2">';
        html += '<input id="vpChatInput" class="flex-1 px-3 py-2 border rounded-lg text-xs" placeholder="z.B. Ab 0:12 rausschneiden..." onkeydown="if(event.key===\'Enter\')vpChatSend(\''+v.id+'\')">';
        html += '<button onclick="vpChatSend(\''+v.id+'\')" class="px-3 py-2 bg-vit-orange text-white rounded-lg text-xs hover:bg-orange-600 flex-shrink-0">\u27a1\ufe0f</button>';
        html += '</div></div>';
        html += '</div>';
    } else {
        html += '<div class="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center text-gray-400"><div class="text-3xl mb-2">\ud83e\udd16</div><p class="text-sm">KI-Feedback wird vom HQ gesteuert</p></div>';
    }

    html += '</div>'; // end right
    html += '</div>'; // end grid

    vpModal(html);

} catch(e) { vpModal('<p class="text-red-600 p-4">Fehler beim Laden: '+e.message+'</p>'); console.error('[vpShowVideoDetail]',e); }
};

// ==================== FRAME EXTRACTION ====================
// ==================== CHAT HELPERS ====================
window.vpJumpTo = function(sec) {
    var v = document.getElementById('vpDetailPlayer');
    if(v) { v.currentTime = sec; v.play(); }
};

window.vpChatAddTag = function(btn) {
    var active = btn.getAttribute('data-active') === 'true';
    btn.setAttribute('data-active', !active);
    btn.className = !active
        ? 'vp-chat-tag text-[10px] px-2 py-0.5 border border-vit-orange rounded-full bg-vit-orange text-white cursor-pointer'
        : 'vp-chat-tag text-[10px] px-2 py-0.5 border border-gray-200 rounded-full hover:bg-vit-orange hover:text-white hover:border-vit-orange transition cursor-pointer';
};

window.vpChatSend = async function(videoId) {
    var tags = [];
    document.querySelectorAll('.vp-chat-tag[data-active="true"]').forEach(function(t) { tags.push(t.textContent.trim()); });
    var input = document.getElementById('vpChatInput');
    var text = (input ? input.value : '').trim();
    if(!text && !tags.length) return;

    var msg = (tags.length ? '['+tags.join(', ')+'] ' : '') + text;

    // Add message to chat UI immediately
    var chatEl = document.getElementById('vpChatMessages');
    if(chatEl) {
        chatEl.innerHTML += '<div class="flex gap-2"><div class="w-6 h-6 rounded-full bg-vit-orange text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">HQ</div><div class="bg-white rounded-lg rounded-tl-sm px-3 py-2 text-xs shadow-sm max-w-[90%]">'+msg+'<div class="text-[10px] text-gray-300 mt-1">gerade eben</div></div></div>';
        chatEl.innerHTML += '<div id="vpChatTyping" class="flex gap-2 justify-end"><div class="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-400"><span class="animate-pulse">KI denkt nach...</span></div><div class="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">KI</div></div>';
        chatEl.scrollTop = chatEl.scrollHeight;
    }

    // Clear input + tags
    if(input) input.value = '';
    document.querySelectorAll('.vp-chat-tag[data-active="true"]').forEach(function(t) { vpChatAddTag(t); });

    try {
        // Save feedback
        await _sb().from('pipeline_log').insert({ video_id: videoId, phase: 'feedback', action: 'hq_feedback', details: { feedback: msg, tags: tags } });

        // Try Edge Function
        var res = await _sb().functions.invoke('review-feedback', { body: { video_id: videoId, feedback: msg } });
        var typing = document.getElementById('vpChatTyping');

        if(res.data && res.data.success) {
            var reply = res.data.message || 'Feedback verarbeitet. Revision wird vorbereitet.';
            if(typing) typing.outerHTML = '<div class="flex gap-2 justify-end"><div class="bg-blue-50 rounded-lg rounded-tr-sm px-3 py-2 text-xs shadow-sm max-w-[90%]"><div class="text-[10px] font-medium text-blue-600 mb-1">🤖 KI</div>'+reply+'</div><div class="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">KI</div></div>';
        } else {
            if(typing) typing.outerHTML = '<div class="flex gap-2 justify-end"><div class="bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-500">📝 Feedback gespeichert (KI-Revision später)</div><div class="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">KI</div></div>';
        }
    } catch(e) {
        var typing = document.getElementById('vpChatTyping');
        if(typing) typing.outerHTML = '<div class="flex gap-2 justify-end"><div class="bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-500">📝 Gespeichert (Edge Function offline)</div><div class="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">KI</div></div>';
    }
    if(chatEl) chatEl.scrollTop = chatEl.scrollHeight;
};

function vpFormatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function vpExtractPersonFrames(persons) {
    var video = document.getElementById('vpDetailPlayer');
    var canvas = document.getElementById('vpFrameCanvas');
    if(!video || !canvas) {
        // No player — show fallback icons
        persons.forEach(function(p, idx) {
            var loading = document.getElementById('vpFrameLoading_' + idx);
            if(loading) loading.innerHTML = '<span class="text-2xl">👤</span>';
        });
        return;
    }

    var ctx = canvas.getContext('2d');
    var queue = [];
    persons.forEach(function(p, idx) {
        var timestamps = p.scene_timestamps || [];
        var firstAppear = (timestamps[0] && timestamps[0].start) || 0;
        queue.push({ idx: idx, time: firstAppear + 1 });
    });

    var currentQ = 0;
    var canCapture = true;

    function captureNext() {
        if(currentQ >= queue.length || !canCapture) return;
        var item = queue[currentQ];
        video.currentTime = item.time;
    }

    function doCapture() {
        if(currentQ >= queue.length) return;
        var item = queue[currentQ];
        try {
            var vw = video.videoWidth;
            var vh = video.videoHeight;
            if(!vw || !vh) throw new Error('No dimensions');
            var size = Math.min(vw, vh);
            var sx = (vw - size) / 2;
            var sy = (vh - size) / 2;
            canvas.width = 160; canvas.height = 160;
            ctx.drawImage(video, sx, sy, size, size, 0, 0, 160, 160);
            // Test if canvas is tainted
            var dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            var container = document.getElementById('vpFrame_' + item.idx);
            if(container) container.innerHTML = '<img src="' + dataUrl + '" class="w-full h-full object-cover" alt="Frame"/>';
        } catch(e) {
            // Tainted canvas or other error — stop trying
            console.warn('Frame capture failed (CORS):', e.message);
            canCapture = false;
            persons.forEach(function(p, idx) {
                var loading = document.getElementById('vpFrameLoading_' + idx);
                if(loading) loading.innerHTML = '<span class="text-2xl">👤</span>';
            });
            return;
        }
        currentQ++;
        if(currentQ < queue.length) setTimeout(captureNext, 100);
    }

    video.addEventListener('loadedmetadata', function onMeta() {
        video.removeEventListener('loadedmetadata', onMeta);
        captureNext();
    });
    // If already loaded
    if(video.readyState >= 1) captureNext();

    video.addEventListener('seeked', function onSeek() {
        if(!canCapture) { video.removeEventListener('seeked', onSeek); return; }
        doCapture();
    });

    video.addEventListener('error', function() {
        persons.forEach(function(p, idx) {
            var loading = document.getElementById('vpFrameLoading_' + idx);
            if(loading) loading.innerHTML = '<span class="text-2xl">👤</span>';
        });
    });
}

// Seek to a specific timestamp and update the frame
window.vpSeekFrame = function(timestamp, personIdx) {
    var video = document.getElementById('vpDetailPlayer');
    var canvas = document.getElementById('vpFrameCanvas');
    if(!video || !canvas) return;

    var ctx = canvas.getContext('2d');

    function onSeeked() {
        video.removeEventListener('seeked', onSeeked);
        try {
            var vw = video.videoWidth;
            var vh = video.videoHeight;
            var size = Math.min(vw, vh);
            var sx = (vw - size) / 2;
            var sy = (vh - size) / 2;
            canvas.width = 160; canvas.height = 160;
            ctx.drawImage(video, sx, sy, size, size, 0, 0, 160, 160);
            var dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            var container = document.getElementById('vpFrame_' + personIdx);
            if(container) container.innerHTML = '<img src="' + dataUrl + '" class="w-full h-full object-cover" alt="Frame"/>';
        } catch(e) { console.warn('Seek frame failed:', e); }
    }

    video.addEventListener('seeked', onSeeked);
    video.currentTime = timestamp + 0.5;
};

// ==================== CONSENTS (Standort) ====================
window.vpRenderConsents = async function() {
var c = document.getElementById('vpConsentsContent');
if(!c) return;
c.innerHTML = '<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>';

try {
    var sid = (typeof sbStandort === 'object' && sbStandort) ? sbStandort.id 
        : (window.sbProfile && window.sbProfile.standort_id) ? window.sbProfile.standort_id
        : null;
    if(!sid) {
        try {
            var uid = _sbUser()?.id;
            if(uid) { var {data:u} = await _sb().from('users').select('standort_id').eq('id', uid).single(); if(u) sid = u.standort_id; }
        } catch(e) {}
    }
    if(!sid) { c.innerHTML = '<div class="vit-card p-8 text-center text-gray-400"><div class="text-4xl mb-2">✅</div><p>Kein Standort zugeordnet.</p></div>'; return; }
    var {data:consents,error} = await _sb().from('consents').select('*').eq('standort_id',sid).order('created_at',{ascending:false});
    if(error) throw error;
    consents = consents || [];

    var html = '<div class="flex justify-between items-center mb-4"><h3 class="font-semibold text-gray-700">Einverständniserklärungen ('+consents.length+')</h3><button onclick="vpShowConsentForm()" class="px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 transition text-sm font-medium">+ Consent erfassen</button></div>';

    if(consents.length===0) {
        html += '<div class="vit-card p-8 text-center text-gray-400"><div class="text-4xl mb-2">✅</div><p>Noch keine Einverständniserklärungen erfasst.</p><p class="text-sm mt-1">Erfasse Consents bevor Videos mit Personen verarbeitet werden.</p></div>';
    } else {
        html += '<div class="vit-card overflow-hidden"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="text-left p-3 font-medium text-gray-600">Person</th><th class="text-left p-3 font-medium text-gray-600">Typ</th><th class="text-left p-3 font-medium text-gray-600">Gültig ab</th><th class="text-left p-3 font-medium text-gray-600">Gültig bis</th><th class="text-left p-3 font-medium text-gray-600">Status</th><th class="text-right p-3 font-medium text-gray-600">Aktion</th></tr></thead><tbody>';
        consents.forEach(function(co){
            var isActive = !co.revoked_at && (!co.valid_until || new Date(co.valid_until)>=new Date());
            html += '<tr class="border-t border-gray-100"><td class="p-3 font-medium">'+co.person_name+(co.person_email?' <span class="text-gray-400 text-xs">('+co.person_email+')</span>':'')+'</td>';
            html += '<td class="p-3 text-gray-600">'+(vpConsentTypeLabels[co.consent_type]||co.consent_type)+'</td>';
            html += '<td class="p-3 text-gray-500">'+vpDate(co.valid_from)+'</td>';
            html += '<td class="p-3 text-gray-500">'+(co.valid_until?vpDate(co.valid_until):'Unbefristet')+'</td>';
            html += '<td class="p-3">'+(isActive?'<span class="text-green-600 font-medium">✅ Aktiv</span>':co.revoked_at?'<span class="text-red-600 font-medium">🚫 Widerrufen</span>':'<span class="text-yellow-600 font-medium">⏰ Abgelaufen</span>')+'</td>';
            html += '<td class="p-3 text-right">'+(isActive?'<button onclick="vpRevokeConsent(\''+co.id+'\')" class="text-xs text-red-500 hover:text-red-700">Widerrufen</button>':'')+'</td></tr>';
        });
        html += '</tbody></table></div>';
    }
    c.innerHTML = html;
} catch(e) {
    c.innerHTML = '<div class="text-red-600 p-4">Fehler: '+e.message+'</div>';
}
};

window.vpShowConsentForm = function() {
vpModal(
    '<h2 class="text-lg font-bold text-gray-800 mb-4">✅ Neuen Consent erfassen</h2>' +
    '<div class="space-y-3">' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Name der Person *</label><input id="vpConsentName" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Max Mustermann"></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">E-Mail (optional)</label><input id="vpConsentEmail" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="max@example.com"></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Consent-Typ *</label><select id="vpConsentType" class="w-full px-3 py-2 border rounded-lg text-sm"><option value="employee_general">Mitarbeiter (Generell)</option><option value="customer_single">Kunde (Einmalig)</option><option value="customer_general">Kunde (Generell)</option></select></div>' +
    '<div class="grid grid-cols-2 gap-3"><div><label class="block text-sm font-medium text-gray-700 mb-1">Gültig ab</label><input type="date" id="vpConsentFrom" class="w-full px-3 py-2 border rounded-lg text-sm" value="'+new Date().toISOString().split('T')[0]+'"></div><div><label class="block text-sm font-medium text-gray-700 mb-1">Gültig bis (leer = unbefristet)</label><input type="date" id="vpConsentUntil" class="w-full px-3 py-2 border rounded-lg text-sm"></div></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Notizen</label><textarea id="vpConsentNotes" class="w-full px-3 py-2 border rounded-lg text-sm" rows="2" placeholder="Optional..."></textarea></div></div>' +
    '<div class="flex justify-end gap-2 mt-4"><button onclick="vpCloseModal()" class="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Abbrechen</button><button onclick="vpSaveConsent()" class="px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 font-medium">Speichern</button></div>'
);
};

window.vpSaveConsent = async function() {
var name = document.getElementById('vpConsentName').value.trim();
if(!name) { alert('Name ist erforderlich.'); return; }
try {
    var {error} = await _sb().from('consents').insert({
        person_name: name,
        person_email: document.getElementById('vpConsentEmail').value.trim()||null,
        standort_id: (window.sbStandort && window.sbStandort.id) || null,
        consent_type: document.getElementById('vpConsentType').value,
        valid_from: document.getElementById('vpConsentFrom').value,
        valid_until: document.getElementById('vpConsentUntil').value||null,
        notes: document.getElementById('vpConsentNotes').value.trim()||null,
        created_by: _sbUser().id
    });
    if(error) throw error;
    vpCloseModal();
    vpRenderConsents();
} catch(e) { alert('Fehler: '+e.message); }
};

window.vpRevokeConsent = async function(id) {
if(!confirm('Consent wirklich widerrufen?')) return;
try {
    await _sb().from('consents').update({revoked_at:new Date().toISOString()}).eq('id',id);
    vpRenderConsents();
} catch(e) { alert('Fehler: '+e.message); }
};

// ==================== TAGGING ====================
window.vpShowTagging = async function(videoId) {
vpModal('<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>');
try {
    var {data:v} = await _sb().from('videos').select('*').eq('id',videoId).single();
    var {data:existingPersons} = await _sb().from('video_persons').select('*').eq('video_id',videoId);
    var {data:consents} = await _sb().from('consents').select('*').eq('standort_id',v.standort_id).is('revoked_at',null).order('person_name');

    var html = '<div class="flex justify-between items-start mb-4"><h2 class="text-lg font-bold text-gray-800">👥 Personen taggen: '+v.filename+'</h2><button onclick="vpCloseModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>';
    html += '<div id="vpTaggingList" class="space-y-2 mb-4">';
    if(existingPersons&&existingPersons.length>0) {
        existingPersons.forEach(function(p,i){ html += vpTagRow(i,consents,p); });
    } else { html += vpTagRow(0,consents); }
    html += '</div>';
    html += '<button onclick="vpAddTagRow()" class="text-sm text-vit-orange hover:underline mb-4">+ Weitere Person</button>';
    html += '<div class="flex justify-end gap-2 mt-4 pt-4 border-t"><button onclick="vpCloseModal()" class="px-4 py-2 border rounded-lg text-gray-600">Abbrechen</button><button onclick="vpSaveTagsAndCheck(\''+videoId+'\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 font-medium">Speichern & Consent prüfen</button></div>';
    window._vpTagConsents = consents;
    window._vpTagRowCount = (existingPersons&&existingPersons.length)||1;
    vpModal(html);
} catch(e) { vpModal('<p class="text-red-600">Fehler: '+e.message+'</p>'); }
};

export function vpTagRow(idx,consents,existing) {
var opts = '<option value="">– Consent auswählen –</option>';
if(consents) consents.forEach(function(co){
    var sel = existing&&existing.consent_id===co.id?' selected':'';
    opts += '<option value="'+co.id+'"'+sel+'>'+co.person_name+' ('+vpConsentTypeLabels[co.consent_type]+')</option>';
});
return '<div class="flex gap-2 items-center vp-tag-row"><input class="flex-1 px-3 py-2 border rounded-lg text-sm vp-tag-label" placeholder="Name/Beschreibung" value="'+(existing?existing.person_label:'')+'"><select class="flex-1 px-3 py-2 border rounded-lg text-sm vp-tag-consent">'+opts+'</select><label class="flex items-center gap-1 text-xs text-gray-500"><input type="checkbox" class="vp-tag-employee rounded" '+(existing&&existing.is_employee?'checked':'')+'>MA</label></div>';
}

window.vpAddTagRow = function() {
var list = document.getElementById('vpTaggingList');
if(!list) return;
var div = document.createElement('div');
div.innerHTML = vpTagRow(++window._vpTagRowCount, window._vpTagConsents);
list.appendChild(div.firstChild);
};

window.vpSaveTagsAndCheck = async function(videoId) {
var rows = document.querySelectorAll('.vp-tag-row');
var tags = [];
rows.forEach(function(row){
    var label = row.querySelector('.vp-tag-label').value.trim();
    if(!label) return;
    tags.push({ video_id:videoId, person_label:label, consent_id:row.querySelector('.vp-tag-consent').value||null, is_employee:row.querySelector('.vp-tag-employee').checked, tagged_by:_sbUser().id });
});
if(tags.length===0) { alert('Mindestens eine Person taggen.'); return; }
try {
    await _sb().from('video_persons').delete().eq('video_id',videoId);
    var {error} = await _sb().from('video_persons').insert(tags);
    if(error) throw error;
    await _sb().from('videos').update({persons_tagged:true}).eq('id',videoId);
    var {data:result} = await _sb().rpc('check_video_consent',{p_video_id:videoId});
    var check = result&&result[0]?result[0]:{all_cleared:false};
    if(check.all_cleared) {
        await _sb().from('videos').update({pipeline_status:'cutting',consent_cleared:true,pipeline_status_detail:'Alle Consents gültig'}).eq('id',videoId);
        vpCloseModal(); alert('✅ Alle Consents gültig! Video geht in den Schnitt.');
    } else {
        await _sb().from('videos').update({pipeline_status:'consent_blocked',pipeline_status_detail:'Consent fehlt für '+(check.blocked_persons||[]).map(function(p){return p.person}).join(', ')}).eq('id',videoId);
        vpCloseModal(); alert('⚠️ Consent fehlt für: '+(check.blocked_persons||[]).map(function(p){return p.person+' ('+p.reason+')'}).join(', '));
    }
    vpRenderPipelineDashboard();
} catch(e) { alert('Fehler: '+e.message); }
};

// ==================== PIPELINE TRIGGERS ====================
window.vpTriggerAnalysis = async function(videoId) {
if(!confirm('🔬 Video-Analyse starten?\n\nDas Video wird analysiert (Szenen, Personen, Highlights).\nDies kann 1-5 Minuten dauern.')) return;
try {
    vpModal('<div class="text-center py-8"><div class="animate-spin w-10 h-10 border-4 border-vit-orange border-t-transparent rounded-full mx-auto mb-4"></div><p class="text-gray-600 font-medium">Analyse wird gestartet...</p><p class="text-xs text-gray-400 mt-1">Edge Function: analyze-video</p></div>');
    var {data,error} = await _sb().functions.invoke('analyze-video', {
        body: { video_id: videoId }
    });
    if(error) throw error;
    if(data && data.success) {
        var msg = '✅ Analyse abgeschlossen!\n\n';
        msg += '👥 Personen erkannt: ' + (data.analysis?.persons_detected || 0) + '\n';
        msg += '🎬 Szenen: ' + (data.analysis?.scenes || 0) + '\n';
        msg += '⭐ Highlights: ' + (data.analysis?.highlights || 0) + '\n';
        msg += '📊 Qualität: ' + (data.analysis?.quality_score || '–') + '/100\n';
        msg += '📁 Kategorie: ' + (data.analysis?.suggested_category || '–');
        vpCloseModal();
        alert(msg);
    } else {
        throw new Error(data?.error || 'Unbekannter Fehler');
    }
    vpRenderPipelineDashboard();
} catch(e) {
    vpCloseModal();
    alert('❌ Analyse fehlgeschlagen: ' + e.message);
    vpRenderPipelineDashboard();
}
};

window.vpTriggerConsent = async function(videoId) {
try {
    vpModal('<div class="text-center py-8"><div class="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div><p class="text-gray-600 font-medium">Consent wird geprüft...</p></div>');
    var {data,error} = await _sb().functions.invoke('check-consent', {
        body: { video_id: videoId }
    });
    if(error) throw error;
    vpCloseModal();
    if(data && data.success) {
        if(data.consent_result === 'all_cleared' || data.consent_result === 'auto_cleared') {
            alert('✅ Consent OK! ' + (data.cleared||0) + ' Person(en) geprüft.\nVideo geht in den Schnitt.');
        } else {
            var missing = (data.details||[]).filter(function(d){return d.consent_status==='missing';});
            alert('⚠️ Consent fehlt für ' + missing.length + ' Person(en):\n' + missing.map(function(m){return '- ' + m.person_label + ': ' + m.reason;}).join('\n'));
        }
    } else {
        throw new Error(data?.error || 'Unbekannter Fehler');
    }
    vpRenderPipelineDashboard();
} catch(e) {
    vpCloseModal();
    alert('❌ Consent-Check fehlgeschlagen: ' + e.message);
}
};

window.vpTriggerReels = async function(videoId) {
if(!confirm('🎬 Reels generieren?\n\nDas System wählt automatisch das passende Template\nund erstellt Reels basierend auf der Video-Analyse.')) return;
try {
    vpModal('<div class="text-center py-8"><div class="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div><p class="text-gray-600 font-medium">Reels werden generiert...</p><p class="text-xs text-gray-400 mt-1">Edge Function: generate-reels</p></div>');
    var {data,error} = await _sb().functions.invoke('generate-reels', {
        body: { video_id: videoId }
    });
    if(error) throw error;
    vpCloseModal();
    if(data && data.success) {
        var msg = '✅ ' + (data.reels?.length||0) + ' Reel(s) generiert!\n\n';
        msg += 'Template: ' + (data.template?.name || '–') + '\n';
        msg += 'Clips: ' + (data.cut_list?.length || 0) + '\n\n';
        msg += 'Das Video steht jetzt zur Freigabe bereit.';
        alert(msg);
    } else {
        throw new Error(data?.error || 'Unbekannter Fehler');
    }
    vpRenderPipelineDashboard();
} catch(e) {
    vpCloseModal();
    alert('❌ Reel-Generierung fehlgeschlagen: ' + e.message);
}
};

window.vpApproveVideo = async function(videoId) {
if(!confirm('✅ Video freigeben und zur Veröffentlichung markieren?')) return;
try {
    await _sb().from('videos').update({
        pipeline_status:'approved',
        pipeline_status_detail:'Freigegeben am '+new Date().toLocaleDateString('de-DE'),
        approved_by:_sbUser() ?.id||null,
        approved_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
    }).eq('id',videoId);
    await _sb().from('pipeline_log').insert({
        video_id:videoId, phase:'review', action:'approved',
        actor:_sbUser() ?.id||'unknown', details:{approved_by:_sbUser() ?.name||'–'}
    });
    vpCloseModal();
    alert('✅ Video freigegeben!');
    vpRenderPipelineDashboard();
    if(window.vpRenderHqReview) vpRenderHqReview();
} catch(e) { alert('Fehler: '+e.message); }
};

window.vpRejectVideo = async function(videoId) {
var reason = prompt('❌ Grund für Ablehnung:');
if(!reason) return;
try {
    await _sb().from('videos').update({
        pipeline_status:'rejected',
        pipeline_status_detail:'Abgelehnt: '+reason,
        updated_at:new Date().toISOString()
    }).eq('id',videoId);
    await _sb().from('pipeline_log').insert({
        video_id:videoId, phase:'review', action:'rejected',
        actor:_sbUser() ?.id||'unknown', details:{reason:reason}
    });
    vpCloseModal();
    alert('Video abgelehnt.');
    vpRenderPipelineDashboard();
    if(window.vpRenderHqReview) vpRenderHqReview();
} catch(e) { alert('Fehler: '+e.message); }
};

window.vpManualAdvance = async function(videoId, targetStatus) {
var labels = {analyzing:'Analyse',consent_check:'Consent-Check',cutting:'Schnitt',review:'Freigabe',approved:'Freigegeben',publishing:'Veröffentlichung',published:'Veröffentlicht'};
if(!confirm('⏩ Manuell weiter zu: '+(labels[targetStatus]||targetStatus)+'?')) return;
try {
    await _sb().from('videos').update({
        pipeline_status:targetStatus,
        pipeline_status_detail:'Manuell gesetzt am '+new Date().toLocaleDateString('de-DE'),
        updated_at:new Date().toISOString()
    }).eq('id',videoId);
    await _sb().from('pipeline_log').insert({
        video_id:videoId, phase:targetStatus, action:'manual_advance',
        actor:_sbUser() ?.id||'unknown', details:{from:'manual',to:targetStatus}
    });
    vpCloseModal();
    vpRenderPipelineDashboard();
} catch(e) { alert('Fehler: '+e.message); }
};

// ==================== HQ VIDEO-FREIGABE ====================
window.vpRenderHqReview = async function() {
var c = document.getElementById('hqVpReviewContent');
if(!c) return;
c.innerHTML = '<div class="flex justify-center py-12"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>';

try {
    // HQ sieht ALLE Videos die Aktion brauchen
    var {data:allVideos,error} = await _sb().from('videos').select('*, standorte(name)').in('pipeline_status',['uploaded','consent_check','consent_blocked','cutting','review']).order('created_at',{ascending:true});
    if(error) throw error;
    allVideos = allVideos || [];

    var uploaded = allVideos.filter(function(v){ return v.pipeline_status==='uploaded'; });
    var consent = allVideos.filter(function(v){ return v.pipeline_status==='consent_check'||v.pipeline_status==='consent_blocked'; });
    var cutting = allVideos.filter(function(v){ return v.pipeline_status==='cutting'; });
    var review = allVideos.filter(function(v){ return v.pipeline_status==='review'; });

    var {data:approved} = await _sb().from('videos').select('*, standorte(name)').in('pipeline_status',['approved','published']).order('updated_at',{ascending:false}).limit(10);

    var html = '';

    // Stats
    html += '<div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">';
    html += '<div class="vit-card p-4 text-center '+(uploaded.length>0?'ring-2 ring-yellow-400':'')+'"><div class="text-2xl font-bold text-yellow-600">'+uploaded.length+'</div><div class="text-xs text-gray-500">Neu hochgeladen</div></div>';
    html += '<div class="vit-card p-4 text-center '+(consent.length>0?'ring-2 ring-blue-400':'')+'"><div class="text-2xl font-bold text-blue-600">'+consent.length+'</div><div class="text-xs text-gray-500">Consent prüfen</div></div>';
    html += '<div class="vit-card p-4 text-center '+(cutting.length>0?'ring-2 ring-purple-400':'')+'"><div class="text-2xl font-bold text-purple-600">'+cutting.length+'</div><div class="text-xs text-gray-500">Schnitt/Reels</div></div>';
    html += '<div class="vit-card p-4 text-center '+(review.length>0?'ring-2 ring-orange-400':'')+'"><div class="text-2xl font-bold text-orange-600">'+review.length+'</div><div class="text-xs text-gray-500">Freigabe</div></div>';
    html += '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-green-600">'+(approved||[]).length+'</div><div class="text-xs text-gray-500">Erledigt</div></div>';
    html += '</div>';

    if(allVideos.length===0) {
        html += '<div class="vit-card p-8 text-center text-gray-400"><div class="text-4xl mb-2">✅</div><p>Keine Videos warten auf Bearbeitung.</p></div>';
    }

    // Template + Learnings Verwaltung
    html += '<div class="flex justify-end gap-2 mb-4"><button onclick="vpShowLearnings()" class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">🧠 KI-Learnings</button><button onclick="vpShowTemplates()" class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">🎨 Reel-Templates</button></div>';

    // ── UPLOADED: Analyse starten ──
    if(uploaded.length>0) {
        html += '<div class="mb-6"><h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">📤 Neu hochgeladen <span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">'+uploaded.length+'</span></h3><div class="space-y-3">';
        uploaded.forEach(function(v){
            var sn = v.standorte?v.standorte.name:'Unbekannt';
            html += '<div class="vit-card p-4"><div class="flex justify-between items-center"><div><span class="font-medium text-gray-800">'+v.filename+'</span><span class="text-xs ml-2 text-gray-400">📍 '+sn+' · '+vpFileSize(v.file_size_bytes)+' · '+vpDateTime(v.created_at)+'</span></div><div class="flex gap-2">';
            html += '<button onclick="vpTriggerAnalysis(\''+v.id+'\')" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-sm hover:bg-orange-600 font-medium">🔬 Analysieren</button>';
            html += '<button onclick="vpShowVideoDetail(\''+v.id+'\')" class="px-3 py-1.5 border rounded-lg text-gray-500 text-sm hover:bg-gray-50">Details</button>';
            html += '</div></div></div>';
        });
        html += '</div></div>';
    }

    // ── CONSENT CHECK ──
    if(consent.length>0) {
        html += '<div class="mb-6"><h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">🔍 Consent prüfen <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">'+consent.length+'</span></h3><div class="space-y-3">';
        consent.forEach(function(v){
            var sn = v.standorte?v.standorte.name:'Unbekannt';
            var persons = v.analysis_result?v.analysis_result.persons_detected:0;
            html += '<div class="vit-card p-4"><div class="flex justify-between items-center"><div><span class="font-medium text-gray-800">'+v.filename+'</span><span class="text-xs ml-2 text-gray-400">📍 '+sn+' · 👥 '+persons+' Person(en)</span>';
            if(v.pipeline_status==='consent_blocked') html += ' <span class="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">Blockiert</span>';
            html += '</div><div class="flex gap-2">';
            html += '<button onclick="vpTriggerConsent(\''+v.id+'\')" class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 font-medium">🔍 Prüfen</button>';
            html += '<button onclick="vpManualAdvance(\''+v.id+'\',\'cutting\')" class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">⏩ Überspringen</button>';
            html += '<button onclick="vpShowVideoDetail(\''+v.id+'\')" class="px-3 py-1.5 border rounded-lg text-gray-500 text-sm hover:bg-gray-50">Details</button>';
            html += '</div></div></div>';
        });
        html += '</div></div>';
    }

    // ── CUTTING: Reels generieren ──
    if(cutting.length>0) {
        html += '<div class="mb-6"><h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">✂️ Schnitt & Reels <span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">'+cutting.length+'</span></h3><div class="space-y-3">';
        cutting.forEach(function(v){
            var sn = v.standorte?v.standorte.name:'Unbekannt';
            html += '<div class="vit-card p-4"><div class="flex justify-between items-center"><div><span class="font-medium text-gray-800">'+v.filename+'</span><span class="text-xs ml-2 text-gray-400">📍 '+sn+' · '+(vpCategoryLabels[v.category]||v.category)+'</span></div><div class="flex gap-2">';
            html += '<button onclick="vpTriggerReels(\''+v.id+'\')" class="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 font-medium">🎬 Reels generieren</button>';
            html += '<button onclick="vpShowVideoDetail(\''+v.id+'\')" class="px-3 py-1.5 border rounded-lg text-gray-500 text-sm hover:bg-gray-50">Details</button>';
            html += '</div></div></div>';
        });
        html += '</div></div>';
    }

    // ── REVIEW: Freigabe ──
    if(review.length>0) {
        html += '<div class="mb-6"><h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">✅ Freigabe <span class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">'+review.length+'</span></h3><div class="space-y-3">';
        review.forEach(function(v){
            var sn = v.standorte?v.standorte.name:'Unbekannt';
            html += '<div class="vit-card p-5">';
            html += '<div class="flex justify-between items-start mb-3"><div><div class="flex items-center gap-2"><h4 class="font-semibold text-gray-800">'+v.filename+'</h4><span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">📍 '+sn+'</span></div><p class="text-xs text-gray-500 mt-1">'+(vpCategoryLabels[v.category]||v.category)+' · '+vpFileSize(v.file_size_bytes)+' · '+vpDateTime(v.created_at)+'</p></div>'+vpBadge('review')+'</div>';
            if(v.pipeline_status_detail) html += '<div class="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">💬 '+v.pipeline_status_detail+'</div>';

            html += '<div class="border-t pt-3 mt-3"><p class="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Prüfcheckliste</p>';
            html += '<div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm" id="vpChecklist_'+v.id+'">';
            ['consent_ok:Datenschutz/Consent','legal_ok:Rechtlich ok','brand_ok:Markenkonform','quality_ok:Qualität ok','platform_ok:Plattform-Regeln','music_ok:Musik lizenziert'].forEach(function(item){
                var parts = item.split(':');
                html += '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" class="vp-check-item rounded text-vit-orange" data-key="'+parts[0]+'"><span>'+parts[1]+'</span></label>';
            });
            html += '</div></div>';

            html += '<div class="flex gap-2 mt-3 pt-3 border-t">';
            html += '<button onclick="vpHqApprove(\''+v.id+'\')" class="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-sm">✅ Freigeben</button>';
            html += '<button onclick="vpShowFeedback(\''+v.id+'\')" class="flex-1 px-4 py-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 font-medium text-sm">💬 Feedback</button>';
            html += '<button onclick="vpHqReject(\''+v.id+'\')" class="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm">❌ Ablehnen</button>';
            html += '<button onclick="vpShowVideoDetail(\''+v.id+'\')" class="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm">Details</button>';
            html += '</div></div>';
        });
        html += '</div></div>';
    }

    // ── Kürzlich erledigt ──
    if(approved && approved.length>0) {
        html += '<div class="mt-6"><h3 class="font-semibold text-gray-700 mb-3">Kürzlich erledigt</h3><div class="vit-card overflow-hidden"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="text-left p-3">Video</th><th class="text-left p-3">Standort</th><th class="text-left p-3">Status</th><th class="text-left p-3">Datum</th></tr></thead><tbody>';
        approved.forEach(function(v){
            html += '<tr class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="vpShowVideoDetail(\''+v.id+'\')"><td class="p-3 font-medium">'+v.filename+'</td><td class="p-3 text-gray-500">'+(v.standorte?v.standorte.name:'–')+'</td><td class="p-3">'+vpBadge(v.pipeline_status)+'</td><td class="p-3 text-gray-500">'+vpDateTime(v.updated_at)+'</td></tr>';
        });
        html += '</tbody></table></div></div>';
    }

    c.innerHTML = html;
} catch(e) {
    c.innerHTML = '<div class="vit-card p-6 text-red-600">Fehler: '+e.message+'</div>';
}
};

window.vpHqApprove = async function(videoId) {
var checks = {};
var allChecked = true;
document.querySelectorAll('#vpChecklist_'+videoId+' .vp-check-item').forEach(function(cb){ checks[cb.dataset.key]=cb.checked; if(!cb.checked) allChecked=false; });
if(!allChecked && !confirm('Nicht alle Prüfpunkte abgehakt. Trotzdem freigeben?')) return;
try {
    await _sb().from('videos').update({pipeline_status:'approved',pipeline_status_detail:'Freigegeben von HQ'}).eq('id',videoId);
    await _sb().from('review_tasks').update({completed_at:new Date().toISOString(),decision:'approved',checklist:checks}).eq('video_id',videoId).is('completed_at',null);
    await _sb().from('reels').update({status:'approved',approved_by:_sbUser().id,approved_at:new Date().toISOString()}).eq('video_id',videoId).eq('status','generated');
    vpRenderHqReview();
    vpUpdateHqBadge();
} catch(e) { alert('Fehler: '+e.message); }
};

window.vpHqReject = async function(videoId) {
// Strukturiertes Ablehnen mit Lerneffekt
var {data:v} = await _sb().from('videos').select('filename,category').eq('id',videoId).single();

var html = '<div class="flex justify-between items-center mb-4"><h2 class="text-lg font-bold text-gray-800">❌ Video ablehnen</h2><button onclick="vpCloseModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>';
html += '<p class="text-sm text-gray-500 mb-4">'+(v?v.filename:'Video')+'</p>';

html += '<div class="space-y-3">';
html += '<div><p class="text-xs font-medium text-gray-500 mb-2 uppercase">Ablehnungsgründe</p>';
html += '<div class="flex flex-wrap gap-1.5" id="vpRejectTags">';
var rejectReasons = [
    {tag:'quality',label:'📹 Qualität zu schlecht'},
    {tag:'shaky',label:'🤝 Verwackelt'},
    {tag:'dark',label:'🌑 Zu dunkel'},
    {tag:'audio',label:'🔇 Ton-Probleme'},
    {tag:'branding',label:'🏷️ Branding fehlt'},
    {tag:'consent',label:'👤 Consent-Problem'},
    {tag:'content',label:'📝 Inhalt unpassend'},
    {tag:'length',label:'⏱️ Falsche Länge'},
    {tag:'music',label:'🎵 Musik ungeeignet'},
    {tag:'duplicate',label:'🔄 Duplikat'}
];
rejectReasons.forEach(function(r) {
    html += '<button onclick="vpToggleRejectTag(this)" class="vp-reject-tag px-2 py-1 text-xs border border-gray-300 rounded-full hover:bg-red-50 hover:border-red-300 cursor-pointer" data-tag="'+r.tag+'" data-active="false">'+r.label+'</button>';
});
html += '</div></div>';

html += '<div><label class="text-xs font-medium text-gray-500">Details / Begründung</label>';
html += '<textarea id="vpRejectReason" class="w-full mt-1 p-3 border rounded-lg text-sm" rows="3" placeholder="Was genau ist das Problem? Je genauer, desto besser lernt die KI..."></textarea></div>';

html += '<div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">';
html += '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="vpRejectLearn" checked class="rounded text-vit-orange"><span class="text-sm text-blue-700">🤖 KI soll daraus lernen (Regel wird automatisch erstellt)</span></label>';
html += '</div>';

html += '<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">';
html += '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="vpRejectExample" class="rounded text-vit-orange"><span class="text-sm text-yellow-700">📌 Als Negativ-Beispiel markieren (KI nutzt es als Referenz)</span></label>';
html += '</div>';

html += '</div>';
html += '<div class="flex gap-2 mt-4 pt-4 border-t">';
html += '<button onclick="vpConfirmReject(\''+videoId+'\')" class="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">❌ Ablehnen & speichern</button>';
html += '<button onclick="vpCloseModal()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Abbrechen</button>';
html += '</div>';

vpModal(html);
};

window.vpToggleRejectTag = function(btn) {
    var active = btn.getAttribute('data-active') === 'true';
    btn.setAttribute('data-active', !active);
    btn.className = !active
        ? 'vp-reject-tag px-2 py-1 text-xs border border-red-400 rounded-full bg-red-100 text-red-700 cursor-pointer'
        : 'vp-reject-tag px-2 py-1 text-xs border border-gray-300 rounded-full hover:bg-red-50 hover:border-red-300 cursor-pointer';
};

window.vpConfirmReject = async function(videoId) {
var tags = [];
document.querySelectorAll('.vp-reject-tag[data-active="true"]').forEach(function(t) { tags.push(t.dataset.tag); });
var reason = (document.getElementById('vpRejectReason').value||'').trim();
var shouldLearn = document.getElementById('vpRejectLearn').checked;
var markExample = document.getElementById('vpRejectExample').checked;

if(!tags.length && !reason) { alert('Bitte mindestens einen Grund angeben.'); return; }

var tagLabels = [];
document.querySelectorAll('.vp-reject-tag[data-active="true"]').forEach(function(t) { tagLabels.push(t.textContent.trim()); });
var fullReason = (tagLabels.length ? tagLabels.join(', ') : '') + (reason ? (tagLabels.length ? ' – ' : '') + reason : '');

try {
    // 1. Video ablehnen
    await _sb().from('videos').update({pipeline_status:'rejected',pipeline_status_detail:'HQ: '+fullReason}).eq('id',videoId);
    await _sb().from('review_tasks').update({completed_at:new Date().toISOString(),decision:'rejected',checklist:{tags:tags,reason:reason}}).eq('video_id',videoId).is('completed_at',null);
    await _sb().from('reels').update({status:'rejected',review_notes:fullReason}).eq('video_id',videoId).eq('status','generated');

    // 2. KI-Learning erstellen
    if(shouldLearn && (reason || tags.length)) {
        var {data:v} = await _sb().from('videos').select('category').eq('id',videoId).single();
        var learningRules = [];
        if(tags.includes('shaky')) learningRules.push({cat:'quality',rule:'Verwackelte Aufnahmen vermeiden – Stativ oder Stabilisierung nutzen'});
        if(tags.includes('dark')) learningRules.push({cat:'quality',rule:'Auf ausreichende Beleuchtung achten – dunkle Szenen rausschneiden'});
        if(tags.includes('audio')) learningRules.push({cat:'audio',rule:'Tonqualität prüfen – Hintergrundgeräusche, Wind oder Rauschen vermeiden'});
        if(tags.includes('branding')) learningRules.push({cat:'branding',rule:'vit:bikes Branding (Logo, Farben) muss sichtbar sein'});
        if(tags.includes('music')) learningRules.push({cat:'audio',rule:'Musikauswahl prüfen – muss zur Marke und Zielgruppe passen'});
        if(tags.includes('length')) learningRules.push({cat:'quality',rule:'Video-Länge muss zum Template passen – nicht zu lang, nicht zu kurz'});
        // Custom learning from freetext
        if(reason && reason.length > 10) {
            learningRules.push({cat:v?v.category:'general', rule: reason});
        }
        for(var i=0; i<learningRules.length; i++) {
            await _sb().from('video_ki_learnings').insert({
                category: learningRules[i].cat,
                learning_type: 'rejection',
                source_video_id: videoId,
                rule: learningRules[i].rule,
                context: fullReason,
                priority: 7,
                created_by: _sbUser().id
            });
        }
    }

    // 3. Als Negativ-Beispiel markieren
    if(markExample) {
        var {data:v2} = await _sb().from('videos').select('category').eq('id',videoId).single();
        await _sb().from('video_ki_examples').insert({
            video_id: videoId,
            example_type: 'bad',
            category: v2?v2.category:'general',
            description: 'Abgelehnt: ' + fullReason,
            tags: tags,
            created_by: _sbUser().id
        });
    }

    // 4. Log
    await _sb().from('pipeline_log').insert({video_id:videoId, phase:'review', action:'rejected', details:{tags:tags,reason:reason,learned:shouldLearn,example:markExample}});

    vpCloseModal();
    vpRenderHqReview();
    vpUpdateHqBadge();
} catch(e) { alert('Fehler: '+e.message); }
};

// ==================== APPROVE MIT LEARNING ====================
// Erweitere Approve: Bei Freigabe optional als Positiv-Beispiel markieren
window.vpHqApproveWithLearning = async function(videoId) {
var {data:v} = await _sb().from('videos').select('filename,category').eq('id',videoId).single();
var html = '<div class="flex justify-between items-center mb-4"><h2 class="text-lg font-bold text-gray-800">✅ Video freigeben</h2><button onclick="vpCloseModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>';
html += '<p class="text-sm text-gray-500 mb-4">'+(v?v.filename:'Video')+'</p>';
html += '<div class="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">';
html += '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="vpApproveExample" class="rounded text-green-500"><span class="text-sm text-green-700">⭐ Als Positiv-Beispiel markieren (KI lernt: "So soll es aussehen")</span></label>';
html += '</div>';
html += '<textarea id="vpApproveNote" class="w-full p-3 border rounded-lg text-sm mb-3" rows="2" placeholder="Optional: Was ist besonders gut an diesem Video?"></textarea>';
html += '<div class="flex gap-2">';
html += '<button onclick="vpConfirmApprove(\''+videoId+'\')" class="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium">✅ Freigeben</button>';
html += '<button onclick="vpCloseModal()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Abbrechen</button>';
html += '</div>';
vpModal(html);
};

window.vpConfirmApprove = async function(videoId) {
var markExample = document.getElementById('vpApproveExample').checked;
var note = (document.getElementById('vpApproveNote').value||'').trim();
try {
    await _sb().from('videos').update({pipeline_status:'approved',pipeline_status_detail:'Freigegeben von HQ'+(note?' – '+note:'')}).eq('id',videoId);
    await _sb().from('review_tasks').update({completed_at:new Date().toISOString(),decision:'approved'}).eq('video_id',videoId).is('completed_at',null);
    await _sb().from('reels').update({status:'approved',approved_by:_sbUser().id,approved_at:new Date().toISOString()}).eq('video_id',videoId).eq('status','generated');

    if(markExample) {
        var {data:v} = await _sb().from('videos').select('category').eq('id',videoId).single();
        await _sb().from('video_ki_examples').insert({
            video_id: videoId,
            example_type: 'good',
            category: v?v.category:'general',
            description: note || 'Freigegeben als Positiv-Beispiel',
            created_by: _sbUser().id
        });
        if(note && note.length > 10) {
            await _sb().from('video_ki_learnings').insert({
                category: v?v.category:'general',
                learning_type: 'approval',
                source_video_id: videoId,
                rule: note,
                priority: 6,
                created_by: _sbUser().id
            });
        }
    }

    vpCloseModal();
    vpRenderHqReview();
    vpUpdateHqBadge();
} catch(e) { alert('Fehler: '+e.message); }
};

// ==================== KI-LEARNINGS VERWALTEN ====================
window.vpShowLearnings = async function() {
vpModal('<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>');
try {
    var {data:learnings} = await _sb().from('video_ki_learnings').select('*').eq('is_active',true).order('priority',{ascending:false});
    var {data:examples} = await _sb().from('video_ki_examples').select('*, videos(filename)').eq('is_active',true).order('created_at',{ascending:false});
    learnings = learnings||[]; examples = examples||[];

    var catIcons = {quality:'📹',branding:'🏷️',audio:'🔊',werkstatt:'🔧',probefahrt:'🚲',event:'🎉',consent:'👤',general:'⚡'};
    var typeColors = {rejection:'bg-red-100 text-red-700',approval:'bg-green-100 text-green-700',feedback:'bg-yellow-100 text-yellow-700',manual:'bg-blue-100 text-blue-700'};

    var html = '<div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold text-gray-800">🧠 KI-Learnings & Beispiele</h2><div class="flex gap-2"><button onclick="vpAddLearning()" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-sm hover:bg-orange-600">+ Neue Regel</button><button onclick="vpCloseModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div></div>';

    // Learnings
    html += '<h3 class="font-semibold text-gray-700 mb-2 flex items-center gap-2">📋 Regeln <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">'+learnings.length+'</span></h3>';
    if(!learnings.length) {
        html += '<p class="text-gray-400 text-sm mb-4">Noch keine Regeln. Werden automatisch aus Feedback und Ablehnungen erstellt.</p>';
    } else {
        html += '<div class="space-y-2 mb-6 max-h-60 overflow-y-auto">';
        learnings.forEach(function(l) {
            var tc = typeColors[l.learning_type]||'bg-gray-100 text-gray-600';
            html += '<div class="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-sm">';
            html += '<span>'+(catIcons[l.category]||'⚡')+'</span>';
            html += '<div class="flex-1 min-w-0"><div class="text-gray-800">'+l.rule+'</div>';
            html += '<div class="flex items-center gap-2 mt-1"><span class="text-xs px-1.5 py-0.5 rounded '+tc+'">'+l.learning_type+'</span><span class="text-xs text-gray-400">Priorität: '+l.priority+'/10</span>'+(l.applied_count?'<span class="text-xs text-gray-400">· '+l.applied_count+'x angewendet</span>':'')+'</div></div>';
            html += '<button onclick="vpDeleteLearning(\''+l.id+'\')" class="text-gray-300 hover:text-red-500 text-xs">✕</button>';
            html += '</div>';
        });
        html += '</div>';
    }

    // Beispiele
    html += '<h3 class="font-semibold text-gray-700 mb-2 flex items-center gap-2 mt-4">📌 Beispiel-Videos <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">'+examples.length+'</span></h3>';
    if(!examples.length) {
        html += '<p class="text-gray-400 text-sm">Noch keine Beispiele. Markiere Videos beim Freigeben/Ablehnen als Beispiel.</p>';
    } else {
        html += '<div class="space-y-2 max-h-40 overflow-y-auto">';
        examples.forEach(function(ex) {
            var typeColor = ex.example_type==='good'?'bg-green-100 text-green-700':'bg-red-100 text-red-700';
            var typeIcon = ex.example_type==='good'?'✅':'❌';
            html += '<div class="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-sm">';
            html += '<span>'+typeIcon+'</span>';
            html += '<div class="flex-1"><div class="text-gray-800">'+(ex.videos?ex.videos.filename:'Video gelöscht')+'</div>';
            html += '<div class="text-xs text-gray-500">'+ex.description+'</div>';
            html += '<span class="text-xs px-1.5 py-0.5 rounded '+typeColor+'">'+ex.example_type+'</span></div>';
            html += '<button onclick="vpDeleteExample(\''+ex.id+'\')" class="text-gray-300 hover:text-red-500 text-xs">✕</button>';
            html += '</div>';
        });
        html += '</div>';
    }

    vpModal(html);
} catch(e) { vpModal('<p class="text-red-600">Fehler: '+e.message+'</p>'); }
};

window.vpAddLearning = function() {
var html = '<div class="flex justify-between items-center mb-4"><h2 class="text-lg font-bold text-gray-800">+ Neue KI-Regel</h2><button onclick="vpShowLearnings()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>';
html += '<div class="space-y-3">';
html += '<div><label class="text-xs font-medium text-gray-500">Kategorie</label><select id="vlCat" class="w-full mt-1 p-2 border rounded-lg text-sm"><option value="general">Allgemein</option><option value="quality">Qualität</option><option value="branding">Branding</option><option value="audio">Audio/Musik</option><option value="werkstatt">Werkstatt</option><option value="probefahrt">Probefahrt</option><option value="event">Event</option><option value="consent">Consent</option></select></div>';
html += '<div><label class="text-xs font-medium text-gray-500">Regel</label><textarea id="vlRule" class="w-full mt-1 p-2 border rounded-lg text-sm" rows="2" placeholder="z.B. Immer den Standort-Namen im Intro einblenden"></textarea></div>';
html += '<div><label class="text-xs font-medium text-gray-500">Priorität (1-10)</label><input id="vlPrio" type="number" min="1" max="10" value="7" class="w-full mt-1 p-2 border rounded-lg text-sm"></div>';
html += '</div>';
html += '<div class="flex gap-2 mt-4"><button onclick="vpSaveLearning()" class="flex-1 px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 font-medium">💾 Speichern</button><button onclick="vpShowLearnings()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Abbrechen</button></div>';
vpModal(html);
};

window.vpSaveLearning = async function() {
var rule = (document.getElementById('vlRule').value||'').trim();
if(!rule) { alert('Bitte Regel eingeben.'); return; }
try {
    await _sb().from('video_ki_learnings').insert({
        category: document.getElementById('vlCat').value,
        learning_type: 'manual',
        rule: rule,
        priority: parseInt(document.getElementById('vlPrio').value)||7,
        created_by: _sbUser().id
    });
    vpShowLearnings();
} catch(e) { alert('Fehler: '+e.message); }
};

window.vpDeleteLearning = async function(id) {
if(!confirm('Regel deaktivieren?')) return;
try { await _sb().from('video_ki_learnings').update({is_active:false}).eq('id',id); vpShowLearnings(); } catch(e) { alert('Fehler: '+e.message); }
};

window.vpDeleteExample = async function(id) {
if(!confirm('Beispiel entfernen?')) return;
try { await _sb().from('video_ki_examples').update({is_active:false}).eq('id',id); vpShowLearnings(); } catch(e) { alert('Fehler: '+e.message); }
};

// ==================== BADGE UPDATES ====================
window.vpUpdateHqBadge = async function() {
try {
    var {count} = await _sb().from('videos').select('*',{count:'exact',head:true}).in('pipeline_status',['uploaded','consent_check','consent_blocked','cutting','review']);
    var b = document.getElementById('hqVpReviewBadge');
    if(b) { b.textContent = count||0; b.style.display = count>0?'inline':'none'; }
} catch(e) {}
};

// ==================== TEMPLATE VERWALTUNG ====================
window.vpShowTemplates = async function() {
vpModal('<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>');
try {
    var {data:templates} = await _sb().from('reel_templates').select('*').order('category');
    templates = templates || [];
    var catLabels = {probefahrt:'🚲 Probefahrt',event:'🎉 Event',werkstatt:'🔧 Werkstatt',cargo_demo:'📦 Cargo',sonstiges:'⚡ Sonstiges'};

    var html = '<div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold text-gray-800">🎨 Reel-Templates</h2><div class="flex gap-2"><button onclick="vpNewTemplate()" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-sm hover:bg-orange-600">+ Neues Template</button><button onclick="vpCloseModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div></div>';

    if(!templates.length) {
        html += '<p class="text-gray-400 text-center py-6">Keine Templates vorhanden.</p>';
    } else {
        html += '<div class="space-y-3">';
        templates.forEach(function(t) {
            var str = t.structure || {};
            var br = t.branding || {};
            html += '<div class="vit-card p-4 '+(t.is_active?'':'opacity-50 border-dashed')+'">';
            html += '<div class="flex justify-between items-start">';
            html += '<div><div class="flex items-center gap-2"><span class="font-semibold text-gray-800">'+t.name+'</span><span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">'+(catLabels[t.category]||t.category)+'</span>'+(t.is_active?'':'<span class="text-xs text-red-500">inaktiv</span>')+'</div>';
            html += '<div class="text-xs text-gray-500 mt-1">'+t.target_duration_seconds+'s · max '+str.max_clips+' Clips · Intro '+str.intro_seconds+'s / Outro '+str.outro_seconds+'s · '+(str.transition_type||'cut')+'</div>';
            html += '<div class="text-xs text-gray-400 mt-0.5">CTA: "'+( br.cta_text||'–')+'"</div>';
            html += '</div>';
            html += '<div class="flex gap-1"><button onclick="vpEditTemplate(\''+t.id+'\')" class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">✏️</button><button onclick="vpToggleTemplate(\''+t.id+'\','+!t.is_active+')" class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">'+(t.is_active?'⏸️':'▶️')+'</button></div>';
            html += '</div></div>';
        });
        html += '</div>';
    }
    vpModal(html);
} catch(e) { vpModal('<p class="text-red-600">Fehler: '+e.message+'</p>'); }
};

window.vpNewTemplate = function() { vpEditTemplate(null); };

window.vpEditTemplate = async function(templateId) {
var t = {name:'',category:'werkstatt',target_duration_seconds:30,structure:{max_clips:4,intro_seconds:2,outro_seconds:3,transition_type:'crossfade',transition_ms:500},branding:{cta_text:'',cta_position:'bottom_center',logo_position:'top_right'},is_active:true};
if(templateId) {
    var {data} = await _sb().from('reel_templates').select('*').eq('id',templateId).single();
    if(data) t = data;
}
var str = t.structure||{}; var br = t.branding||{};
var html = '<div class="flex justify-between items-center mb-4"><h2 class="text-lg font-bold text-gray-800">'+(templateId?'Template bearbeiten':'Neues Template')+'</h2><button onclick="vpShowTemplates()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>';
html += '<div class="space-y-3">';
html += '<div><label class="text-xs font-medium text-gray-500">Name</label><input id="vtName" class="w-full mt-1 p-2 border rounded-lg text-sm" value="'+t.name+'"></div>';
html += '<div class="grid grid-cols-2 gap-3">';
html += '<div><label class="text-xs font-medium text-gray-500">Kategorie</label><select id="vtCat" class="w-full mt-1 p-2 border rounded-lg text-sm"><option value="probefahrt"'+(t.category==='probefahrt'?' selected':'')+'>Probefahrt</option><option value="event"'+(t.category==='event'?' selected':'')+'>Event</option><option value="werkstatt"'+(t.category==='werkstatt'?' selected':'')+'>Werkstatt</option><option value="cargo_demo"'+(t.category==='cargo_demo'?' selected':'')+'>Cargo</option><option value="sonstiges"'+(t.category==='sonstiges'?' selected':'')+'>Sonstiges</option></select></div>';
html += '<div><label class="text-xs font-medium text-gray-500">Dauer (Sek.)</label><input id="vtDur" type="number" class="w-full mt-1 p-2 border rounded-lg text-sm" value="'+t.target_duration_seconds+'"></div>';
html += '</div>';
html += '<div class="grid grid-cols-3 gap-3">';
html += '<div><label class="text-xs font-medium text-gray-500">Max Clips</label><input id="vtClips" type="number" class="w-full mt-1 p-2 border rounded-lg text-sm" value="'+(str.max_clips||4)+'"></div>';
html += '<div><label class="text-xs font-medium text-gray-500">Intro (Sek.)</label><input id="vtIntro" type="number" class="w-full mt-1 p-2 border rounded-lg text-sm" value="'+(str.intro_seconds||2)+'"></div>';
html += '<div><label class="text-xs font-medium text-gray-500">Outro (Sek.)</label><input id="vtOutro" type="number" class="w-full mt-1 p-2 border rounded-lg text-sm" value="'+(str.outro_seconds||3)+'"></div>';
html += '</div>';
html += '<div><label class="text-xs font-medium text-gray-500">Transition</label><select id="vtTrans" class="w-full mt-1 p-2 border rounded-lg text-sm"><option value="cut"'+(str.transition_type==='cut'?' selected':'')+'>Harter Schnitt</option><option value="fade"'+(str.transition_type==='fade'?' selected':'')+'>Fade</option><option value="crossfade"'+(str.transition_type==='crossfade'?' selected':'')+'>Crossfade</option></select></div>';
html += '<div><label class="text-xs font-medium text-gray-500">CTA-Text</label><input id="vtCta" class="w-full mt-1 p-2 border rounded-lg text-sm" value="'+(br.cta_text||'')+'" placeholder="z.B. Jetzt Probefahrt buchen!"></div>';
html += '<div class="flex items-center gap-2"><input type="checkbox" id="vtActive" '+(t.is_active?'checked':'')+' class="rounded text-vit-orange"><label for="vtActive" class="text-sm text-gray-700">Aktiv</label></div>';
html += '</div>';
html += '<div class="flex gap-2 mt-4 pt-4 border-t">';
html += '<button onclick="vpSaveTemplate('+(templateId?"'"+templateId+"'":"null")+')" class="flex-1 px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 font-medium">💾 Speichern</button>';
if(templateId) html += '<button onclick="vpDeleteTemplate(\''+templateId+'\')" class="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm">🗑️ Löschen</button>';
html += '<button onclick="vpShowTemplates()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">Abbrechen</button>';
html += '</div>';
vpModal(html);
};

window.vpSaveTemplate = async function(templateId) {
try {
    var data = {
        name: document.getElementById('vtName').value,
        category: document.getElementById('vtCat').value,
        target_duration_seconds: parseInt(document.getElementById('vtDur').value) || 30,
        structure: { max_clips: parseInt(document.getElementById('vtClips').value)||4, intro_seconds: parseInt(document.getElementById('vtIntro').value)||2, outro_seconds: parseInt(document.getElementById('vtOutro').value)||3, transition_type: document.getElementById('vtTrans').value, transition_ms: document.getElementById('vtTrans').value==='cut'?0:500 },
        branding: { cta_text: document.getElementById('vtCta').value, cta_position: 'bottom_center', logo_position: 'top_right' },
        is_active: document.getElementById('vtActive').checked
    };
    if(templateId) {
        await _sb().from('reel_templates').update(data).eq('id', templateId);
    } else {
        await _sb().from('reel_templates').insert(data);
    }
    vpShowTemplates();
} catch(e) { alert('Fehler: '+e.message); }
};

window.vpToggleTemplate = async function(id, active) {
try { await _sb().from('reel_templates').update({is_active:active}).eq('id',id); vpShowTemplates(); } catch(e) { alert('Fehler: '+e.message); }
};

window.vpDeleteTemplate = async function(id) {
if(!confirm('Template wirklich löschen?')) return;
try { await _sb().from('reel_templates').delete().eq('id',id); vpShowTemplates(); } catch(e) { alert('Fehler: '+e.message); }
};

// ==================== VIDEO FEEDBACK ====================
window.vpShowFeedback = async function(videoId) {
vpModal('<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>');
try {
    var {data:v} = await _sb().from('videos').select('*').eq('id',videoId).single();
    var {data:reels} = await _sb().from('reels').select('*').eq('video_id',videoId).order('created_at',{ascending:false});
    var {data:logs} = await _sb().from('pipeline_log').select('*').eq('video_id',videoId).eq('phase','feedback').order('created_at',{ascending:false});

    var html = '<div class="flex justify-between items-center mb-4"><h2 class="text-lg font-bold text-gray-800">💬 Feedback: '+v.filename+'</h2><button onclick="vpShowVideoDetail(\''+videoId+'\')" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>';

    // Current reels
    if(reels && reels.length > 0) {
        html += '<div class="mb-4"><h3 class="text-sm font-semibold text-gray-600 mb-2">Aktuelle Reels</h3>';
        reels.forEach(function(r) {
            html += '<div class="p-3 bg-gray-50 rounded-lg mb-2 text-sm">';
            html += '<div class="flex justify-between items-center"><span>🎞️ '+(r.caption||'Reel')+' <span class="text-xs text-gray-400">(Rev. '+(r.revision_number||1)+')</span></span>'+vpBadge(r.status)+'</div>';
            if(r.feedback_summary) html += '<div class="mt-1 p-2 bg-yellow-50 rounded text-xs text-yellow-800">💡 KI-Zusammenfassung: '+r.feedback_summary+'</div>';
            if(r.review_notes) html += '<div class="mt-1 text-xs text-gray-500">📝 '+r.review_notes+'</div>';
            html += '</div>';
        });
        html += '</div>';
    }

    // Previous feedback
    if(logs && logs.length > 0) {
        html += '<div class="mb-4"><h3 class="text-sm font-semibold text-gray-600 mb-2">Bisheriges Feedback</h3><div class="space-y-2 max-h-40 overflow-y-auto">';
        logs.forEach(function(l) {
            var d = l.details || {};
            html += '<div class="p-2 bg-gray-50 rounded text-xs"><span class="text-gray-400">'+vpDateTime(l.created_at)+'</span> <span class="font-medium">'+(d.feedback||l.action)+'</span></div>';
        });
        html += '</div></div>';
    }

    // Feedback input
    html += '<div class="border-t pt-4 mt-4">';
    html += '<h3 class="text-sm font-semibold text-gray-600 mb-2">Neues Feedback</h3>';
    html += '<div class="space-y-2">';
    html += '<div class="flex flex-wrap gap-1.5">';
    ['Zu lang','Zu kurz','Schlechte Stellen raus','Mehr Action','Anderer CTA','Musik passt nicht','Branding fehlt','Untertitel hinzufügen','Intro ändern','Outro ändern'].forEach(function(tag) {
        html += '<button onclick="vpAddFeedbackTag(this)" class="vp-fb-tag px-2 py-1 text-xs border border-gray-300 rounded-full hover:bg-vit-orange hover:text-white hover:border-vit-orange transition cursor-pointer" data-active="false">'+tag+'</button>';
    });
    html += '</div>';
    html += '<textarea id="vpFeedbackText" class="w-full p-3 border rounded-lg text-sm" rows="3" placeholder="Detailliertes Feedback eingeben... z.B. \'Ab Sekunde 12 ist das Bild unscharf, bitte die Szene 0:05-0:15 verwenden statt...\'"></textarea>';
    html += '<div class="flex gap-2">';
    html += '<button onclick="vpSubmitFeedback(\''+videoId+'\')" class="flex-1 px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 font-medium text-sm">🤖 Feedback absenden & KI-Revision</button>';
    html += '<button onclick="vpShowVideoDetail(\''+videoId+'\')" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">Zurück</button>';
    html += '</div></div></div>';

    vpModal(html);
} catch(e) { vpModal('<p class="text-red-600">Fehler: '+e.message+'</p>'); }
};

window.vpAddFeedbackTag = function(btn) {
    var active = btn.getAttribute('data-active') === 'true';
    btn.setAttribute('data-active', !active);
    if(!active) { btn.className = 'vp-fb-tag px-2 py-1 text-xs border border-vit-orange rounded-full bg-vit-orange text-white cursor-pointer'; }
    else { btn.className = 'vp-fb-tag px-2 py-1 text-xs border border-gray-300 rounded-full hover:bg-vit-orange hover:text-white hover:border-vit-orange transition cursor-pointer'; }
};

window.vpSubmitFeedback = async function(videoId) {
var tags = [];
document.querySelectorAll('.vp-fb-tag[data-active="true"]').forEach(function(t) { tags.push(t.textContent); });
var text = (document.getElementById('vpFeedbackText').value || '').trim();
if(!text && !tags.length) { alert('Bitte Feedback eingeben oder Tags auswählen.'); return; }

var feedbackStr = (tags.length ? '['+tags.join(', ')+'] ' : '') + text;
vpModal('<div class="text-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full mx-auto mb-3"></div><p class="text-gray-600">KI analysiert Feedback...</p><p class="text-xs text-gray-400 mt-1">Edge Function: review-feedback</p></div>');

try {
    var res = await _sb().functions.invoke('review-feedback', { body: { video_id: videoId, feedback: feedbackStr } });
    if(res.error) throw res.error;
    var data = res.data;

    if(data && data.success) {
        vpModal('<div class="text-center py-6"><div class="text-4xl mb-3">✅</div><p class="font-semibold text-gray-800">Feedback verarbeitet!</p><p class="text-sm text-gray-500 mt-1">'+(data.message||'KI-Revision wird vorbereitet')+'</p><button onclick="vpShowFeedback(\''+videoId+'\')" class="mt-4 px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 text-sm">Weiter</button></div>');
    } else {
        // Fallback: save feedback manually
        await _sb().from('pipeline_log').insert({ video_id: videoId, phase: 'feedback', action: 'hq_feedback', details: { feedback: feedbackStr, tags: tags } });
        await _sb().from('reels').update({ review_notes: feedbackStr, status: 'revision_needed' }).eq('video_id', videoId).eq('status', 'generated');
        vpModal('<div class="text-center py-6"><div class="text-4xl mb-3">📝</div><p class="font-semibold text-gray-800">Feedback gespeichert</p><p class="text-sm text-gray-500 mt-1">Feedback wurde hinterlegt. KI-Revision kann manuell ausgelöst werden.</p><button onclick="vpShowFeedback(\''+videoId+'\')" class="mt-4 px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 text-sm">OK</button></div>');
    }
} catch(e) {
    // Save feedback even if Edge Function fails
    try {
        await _sb().from('pipeline_log').insert({ video_id: videoId, phase: 'feedback', action: 'hq_feedback', details: { feedback: feedbackStr, tags: tags } });
        await _sb().from('reels').update({ review_notes: feedbackStr }).eq('video_id', videoId).in('status', ['generated','rendering']);
    } catch(_) {}
    vpModal('<div class="text-center py-6"><div class="text-4xl mb-3">📝</div><p class="font-semibold text-gray-800">Feedback gespeichert</p><p class="text-sm text-gray-500 mt-1">'+(e.message||'Edge Function nicht verfügbar – Feedback wurde trotzdem gespeichert.')+'</p><button onclick="vpShowVideoDetail(\''+videoId+'\')" class="mt-4 px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 text-sm">OK</button></div>');
}
};

// ==================== UNTERTITEL ====================
window.vpShowSubtitleEditor = async function(videoId) {
vpModal('<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>');
try {
    var {data:existing} = await _sb().from('video_subtitles').select('*').eq('video_id',videoId).eq('is_active',true).order('created_at',{ascending:false}).limit(1);
    var sub = (existing && existing[0]) || null;
    var entries = (sub && sub.entries) || [];

    // Get signed URL for video player
    var {data:v} = await _sb().from('videos').select('storage_path,filename').eq('id',videoId).single();
    var signedUrl = null;
    try { var {data:sd} = await _sb().storage.from('videos').createSignedUrl(v.storage_path, 600); if(sd) signedUrl = sd.signedUrl; } catch(e){}

    var html = '<div class="flex justify-between items-center mb-3"><h2 class="text-lg font-bold text-gray-800">\ud83d\udcac Untertitel-Editor</h2><button onclick="vpShowVideoDetail(\''+videoId+'\')" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>';
    html += '<p class="text-xs text-gray-500 mb-3">'+v.filename+'</p>';

    // Mini video player for reference
    if(signedUrl) {
        html += '<div class="mb-3 rounded-lg overflow-hidden bg-black"><video id="vpSubPlayer" controls class="w-full" style="max-height:200px;"><source src="'+signedUrl+'" type="video/mp4"><source src="'+signedUrl+'" type="video/quicktime"></video></div>';
        html += '<div class="flex gap-2 mb-3"><button onclick="vpSubInsertTime(\'start\')" class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">\u23f1 Start = aktuelle Zeit</button><button onclick="vpSubInsertTime(\'end\')" class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">\u23f1 Ende = aktuelle Zeit</button></div>';
    }

    // Entries table
    html += '<div class="border rounded-lg overflow-hidden mb-3"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="p-2 text-left text-xs w-20">Start</th><th class="p-2 text-left text-xs w-20">Ende</th><th class="p-2 text-left text-xs">Text</th><th class="p-2 w-10"></th></tr></thead>';
    html += '<tbody id="vpSubEntries">';
    if(entries.length === 0) {
        // Start with one empty row
        entries = [{start:0, end:2, text:''}];
    }
    entries.forEach(function(e, idx) {
        html += '<tr class="border-t vpSubRow" data-idx="'+idx+'"><td class="p-1"><input type="number" step="0.1" min="0" class="w-full p-1 border rounded text-xs vpSubStart" value="'+e.start+'"></td><td class="p-1"><input type="number" step="0.1" min="0" class="w-full p-1 border rounded text-xs vpSubEnd" value="'+e.end+'"></td><td class="p-1"><input type="text" class="w-full p-1 border rounded text-xs vpSubText" value="'+(e.text||'').replace(/"/g,'&quot;')+'" placeholder="Untertitel-Text..."></td><td class="p-1"><button onclick="this.closest(\'tr\').remove()" class="text-red-400 hover:text-red-600 text-xs">\u2715</button></td></tr>';
    });
    html += '</tbody></table></div>';

    html += '<div class="flex gap-2 mb-4">';
    html += '<button onclick="vpSubAddRow()" class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200">+ Zeile</button>';
    html += '<button onclick="vpSubFromPlayer(\''+videoId+'\')" class="px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100">\u25b6 Beim Abspielen erfassen</button>';
    html += '</div>';

    html += '<div class="flex gap-2 border-t pt-3">';
    html += '<button onclick="vpSubSave(\''+videoId+'\','+(sub?"'"+sub.id+"'":"null")+')" class="flex-1 px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 font-medium text-sm">\ud83d\udcbe Speichern</button>';
    html += '<button onclick="vpSubExportSrt(\''+videoId+'\')" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">\u2b07 SRT Export</button>';
    html += '<button onclick="vpShowVideoDetail(\''+videoId+'\')" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">Zur\u00fcck</button>';
    html += '</div>';

    vpModal(html);
} catch(e) { vpModal('<p class="text-red-600">Fehler: '+e.message+'</p>'); }
};

window.vpSubAddRow = function() {
var tbody = document.getElementById('vpSubEntries');
if(!tbody) return;
var rows = tbody.querySelectorAll('.vpSubRow');
var lastEnd = 0;
if(rows.length > 0) {
    var lastEndInput = rows[rows.length-1].querySelector('.vpSubEnd');
    lastEnd = parseFloat(lastEndInput.value) || 0;
}
var idx = rows.length;
var tr = document.createElement('tr');
tr.className = 'border-t vpSubRow';
tr.dataset.idx = idx;
tr.innerHTML = '<td class="p-1"><input type="number" step="0.1" min="0" class="w-full p-1 border rounded text-xs vpSubStart" value="'+lastEnd.toFixed(1)+'"></td><td class="p-1"><input type="number" step="0.1" min="0" class="w-full p-1 border rounded text-xs vpSubEnd" value="'+(lastEnd+2).toFixed(1)+'"></td><td class="p-1"><input type="text" class="w-full p-1 border rounded text-xs vpSubText" value="" placeholder="Untertitel-Text..."></td><td class="p-1"><button onclick="this.closest(\'tr\').remove()" class="text-red-400 hover:text-red-600 text-xs">\u2715</button></td>';
tbody.appendChild(tr);
tr.querySelector('.vpSubText').focus();
};

window.vpSubInsertTime = function(field) {
var player = document.getElementById('vpSubPlayer');
if(!player) return;
var time = player.currentTime.toFixed(1);
// Find focused or last row
var rows = document.querySelectorAll('.vpSubRow');
var lastRow = rows[rows.length - 1];
if(lastRow) {
    var input = lastRow.querySelector(field==='start' ? '.vpSubStart' : '.vpSubEnd');
    if(input) input.value = time;
}
};

window.vpSubSave = async function(videoId, existingId) {
var entries = [];
document.querySelectorAll('.vpSubRow').forEach(function(row) {
    var start = parseFloat(row.querySelector('.vpSubStart').value) || 0;
    var end = parseFloat(row.querySelector('.vpSubEnd').value) || 0;
    var text = (row.querySelector('.vpSubText').value || '').trim();
    if(text) entries.push({start: start, end: end, text: text});
});

// Generate SRT
var srt = '';
entries.forEach(function(e, i) {
    srt += (i+1) + '\n';
    srt += vpFormatSrtTime(e.start) + ' --> ' + vpFormatSrtTime(e.end) + '\n';
    srt += e.text + '\n\n';
});

// Generate VTT
var vtt = 'WEBVTT\n\n';
entries.forEach(function(e, i) {
    vtt += vpFormatVttTime(e.start) + ' --> ' + vpFormatVttTime(e.end) + '\n';
    vtt += e.text + '\n\n';
});

try {
    var data = { video_id: videoId, entries: entries, srt_text: srt, vtt_text: vtt, subtitle_type: 'manual', language: 'de', is_active: true, updated_at: new Date().toISOString() };
    if(existingId) {
        await _sb().from('video_subtitles').update(data).eq('id', existingId);
    } else {
        data.created_by = _sbUser().id;
        await _sb().from('video_subtitles').insert(data);
    }
    await _sb().from('videos').update({has_subtitles: entries.length > 0}).eq('id', videoId);
    alert('\u2705 '+entries.length+' Untertitel gespeichert!');
} catch(e) { alert('Fehler: '+e.message); }
};

function vpFormatSrtTime(sec) {
    var h = Math.floor(sec/3600); var m = Math.floor((sec%3600)/60); var s = Math.floor(sec%60); var ms = Math.round((sec%1)*1000);
    return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+','+String(ms).padStart(3,'0');
}
function vpFormatVttTime(sec) {
    var h = Math.floor(sec/3600); var m = Math.floor((sec%3600)/60); var s = Math.floor(sec%60); var ms = Math.round((sec%1)*1000);
    return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+String(ms).padStart(3,'0');
}

window.vpSubExportSrt = async function(videoId) {
try {
    var {data:existing} = await _sb().from('video_subtitles').select('srt_text,entries').eq('video_id',videoId).eq('is_active',true).limit(1);
    var sub = existing && existing[0];
    if(!sub || !sub.srt_text) { alert('Keine Untertitel vorhanden.'); return; }
    var blob = new Blob([sub.srt_text], {type:'text/plain'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'untertitel.srt'; a.click();
    URL.revokeObjectURL(url);
} catch(e) { alert('Fehler: '+e.message); }
};

window.vpAutoTranscribe = async function(videoId) {
vpModal('<div class="text-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full mx-auto mb-3"></div><p class="text-gray-600">KI transkribiert Audio...</p><p class="text-xs text-gray-400 mt-1">Dies kann 30-60 Sekunden dauern</p></div>');
try {
    var res = await _sb().functions.invoke('transcribe-video', { body: { video_id: videoId } });
    if(res.error) throw res.error;
    var data = res.data;
    if(data && data.entries) {
        await _sb().from('video_subtitles').insert({
            video_id: videoId, entries: data.entries, srt_text: data.srt||'', vtt_text: data.vtt||'',
            subtitle_type: 'auto_transcription', language: data.language||'de',
            created_by: _sbUser().id
        });
        await _sb().from('videos').update({has_subtitles: true}).eq('id', videoId);
        vpShowSubtitleEditor(videoId); // Open editor with results
    } else {
        throw new Error('Keine Transkription erhalten');
    }
} catch(e) {
    // Fallback: offer manual entry
    vpModal('<div class="text-center py-6"><div class="text-4xl mb-3">\ud83c\udf99\ufe0f</div><p class="font-semibold text-gray-800">Auto-Transkription nicht verf\u00fcgbar</p><p class="text-sm text-gray-500 mt-1">'+(e.message||'Edge Function fehlt noch')+'</p><p class="text-xs text-gray-400 mt-2">Du kannst Untertitel manuell im Editor eingeben oder eine SRT-Datei importieren.</p><div class="flex gap-2 mt-4 justify-center"><button onclick="vpShowSubtitleEditor(\''+videoId+'\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 text-sm">\u270f\ufe0f Manuell</button><button onclick="vpImportSrt(\''+videoId+'\')" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">\ud83d\udcc4 SRT Import</button></div></div>');
}
};

window.vpImportSrt = function(videoId) {
var input = document.createElement('input');
input.type = 'file'; input.accept = '.srt,.vtt';
input.onchange = async function() {
    var file = input.files[0];
    if(!file) return;
    var text = await file.text();
    var entries = vpParseSrt(text);
    if(!entries.length) { alert('Keine Untertitel in der Datei gefunden.'); return; }

    // Generate formats
    var srt = ''; var vtt = 'WEBVTT\n\n';
    entries.forEach(function(e, i) {
        srt += (i+1)+'\n'+vpFormatSrtTime(e.start)+' --> '+vpFormatSrtTime(e.end)+'\n'+e.text+'\n\n';
        vtt += vpFormatVttTime(e.start)+' --> '+vpFormatVttTime(e.end)+'\n'+e.text+'\n\n';
    });

    try {
        await _sb().from('video_subtitles').insert({
            video_id: videoId, entries: entries, srt_text: srt, vtt_text: vtt,
            subtitle_type: 'manual', language: 'de', created_by: _sbUser().id
        });
        await _sb().from('videos').update({has_subtitles: true}).eq('id', videoId);
        vpShowSubtitleEditor(videoId);
    } catch(e) { alert('Fehler: '+e.message); }
};
input.click();
};

function vpParseSrt(text) {
    var entries = [];
    // Support both SRT and VTT
    var blocks = text.replace(/\r\n/g,'\n').split(/\n\n+/);
    blocks.forEach(function(block) {
        var lines = block.trim().split('\n');
        for(var i=0; i<lines.length; i++) {
            var m = lines[i].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
            if(m) {
                var start = parseInt(m[1])*3600 + parseInt(m[2])*60 + parseInt(m[3]) + parseInt(m[4])/1000;
                var end = parseInt(m[5])*3600 + parseInt(m[6])*60 + parseInt(m[7]) + parseInt(m[8])/1000;
                var textLines = lines.slice(i+1).join('\n').trim();
                if(textLines) entries.push({start:start, end:end, text:textLines});
                break;
            }
        }
    });
    return entries;
}

// ==================== REALTIME ====================
export function vpSetupRealtime() {
_sb().channel('video-pipeline-global')
    .on('postgres_changes',{event:'*',schema:'public',table:'videos'}, function(){
        vpUpdateHqBadge();
        // Refresh standort pipeline if visible
        var pipeEl = document.getElementById('smSubPipeline');
        if(pipeEl && pipeEl.style.display!=='none') vpRenderPipelineDashboard();
        // Refresh HQ review if visible
        var hqEl = document.getElementById('hqMktTabVideoFreigabe');
        if(hqEl && hqEl.style.display!=='none') vpRenderHqReview();
    })
    .subscribe();
}

// ==================== INIT ====================
var vpInitInterval = setInterval(function(){
if(window.sb) {
    clearInterval(vpInitInterval);
    vpUpdateHqBadge();
    vpSetupRealtime();
    setInterval(vpUpdateHqBadge, 60000);
}
}, 500);

// Strangler Fig
const _exports = {vpBadge,vpDate,vpDateTime,vpFileSize,vpModal,vpAddFiles,vpRenderFileQueue,vpTagRow,vpSetupRealtime};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[video-pipeline.js] Module loaded – ' + Object.keys(_exports).length + ' exports registered');
