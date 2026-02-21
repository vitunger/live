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
    var storagePath = sbStandort.id + '/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g,'_');

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
            standort_id: sbStandort.id,
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

        var {error:dbErr} = await _sb().from('videos').insert(insertData);
        if(dbErr) throw dbErr;

        if(fStatus) fStatus.innerHTML = '<span class="text-green-600">✅ Fertig</span>';
        done++;
    } catch(e) {
        var errMsg = e.message || e.toString();
        errors.push(file.name + ': ' + errMsg);
        if(fStatus) fStatus.innerHTML = '<span class="text-red-500">❌ ' + errMsg.substring(0,40) + '</span>';
    }
}

bar.style.width = '100%';
if(errors.length === 0) {
    statusText.textContent = '✅ Alle ' + total + ' Videos hochgeladen!';
    bar.className = 'bg-green-500 h-2 rounded-full transition-all';
    vpSelectedFiles = [];
    setTimeout(function(){ switchSmSub('pipeline'); }, 2000);
} else {
    statusText.textContent = done + ' von ' + total + ' hochgeladen, ' + errors.length + ' Fehler';
    bar.className = 'bg-yellow-500 h-2 rounded-full transition-all';
}
btn.disabled = false;
};

// ==================== PIPELINE DASHBOARD (Standort: "Meine Videos") ====================
window.vpRenderPipelineDashboard = async function() {
var c = document.getElementById('vpDashboardContent');
if(!c) return;
c.innerHTML = '<div class="flex justify-center py-12"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>';

try {
    var sid = sbStandort?.id;
    var {data:videos,error} = await _sb().from('videos').select('*').eq('standort_id',sid).order('created_at',{ascending:false});
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

    var html = '<div class="flex justify-between items-start mb-4"><div><h2 class="text-xl font-bold text-gray-800">'+v.filename+'</h2><p class="text-sm text-gray-500">'+(vpCategoryLabels[v.category]||v.category)+' · '+vpFileSize(v.file_size_bytes)+' · '+vpDateTime(v.created_at)+'</p></div><div class="flex items-center gap-2">'+vpBadge(v.pipeline_status)+'<button onclick="vpCloseModal()" class="text-gray-400 hover:text-gray-600 text-2xl ml-2">&times;</button></div></div>';

    var stages = ['uploaded','analyzing','consent_check','cutting','review','approved','published'];
    var currentIdx = stages.indexOf(v.pipeline_status);
    if(currentIdx===-1) currentIdx = stages.indexOf({consent_blocked:'consent_check',rejected:'review',failed:'uploaded'}[v.pipeline_status]||'uploaded');
    html += '<div class="flex items-center gap-0.5 mb-6">';
    stages.forEach(function(s,i){
        var cls = i<currentIdx?'bg-green-400':i===currentIdx?'bg-vit-orange':'bg-gray-200';
        html += '<div class="flex-1 h-2 rounded-full '+cls+'" title="'+(vpStatusLabels[s]||s)+'"></div>';
    });
    html += '</div>';

    if(v.pipeline_status_detail) html += '<div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">ℹ️ '+v.pipeline_status_detail+'</div>';

    if(persons && persons.length>0) {
        html += '<div class="mb-4"><h3 class="font-semibold text-gray-700 mb-2">👥 Getaggte Personen ('+persons.length+')</h3><div class="space-y-1">';
        persons.forEach(function(p){
            var statusCls = p.consent_status==='valid'?'text-green-600':p.consent_status==='missing'?'text-red-600':'text-yellow-600';
            html += '<div class="flex items-center gap-2 text-sm"><span class="'+statusCls+'">'+(p.consent_status==='valid'?'✅':p.consent_status==='missing'?'❌':'⚠️')+'</span><span class="font-medium">'+p.person_label+'</span><span class="text-gray-400">'+(p.consent_status||'–')+'</span></div>';
        });
        html += '</div></div>';
    }

    if(reels && reels.length>0) {
        html += '<div class="mb-4"><h3 class="font-semibold text-gray-700 mb-2">🎞️ Reels ('+reels.length+')</h3><div class="grid gap-2">';
        reels.forEach(function(r){
            html += '<div class="p-3 bg-gray-50 rounded-lg"><div class="flex justify-between items-center"><span class="font-medium text-sm">'+(r.caption?r.caption.substring(0,60)+'...':'Reel')+'</span>'+vpBadge(r.status)+'</div>';
            if(r.reel_publications && r.reel_publications.length>0) {
                html += '<div class="flex gap-2 mt-2">';
                r.reel_publications.forEach(function(pub){ html += '<span class="text-xs px-2 py-1 rounded '+(pub.is_published?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600')+'">'+pub.platform.replace('_',' ')+(pub.is_published?' ✓':'')+'</span>'; });
                html += '</div>';
            }
            html += '</div>';
        });
        html += '</div></div>';
    }

    if(logs && logs.length>0) {
        html += '<div class="mb-4"><h3 class="font-semibold text-gray-700 mb-2">📋 Pipeline-Log</h3><div class="space-y-1 max-h-48 overflow-y-auto">';
        logs.forEach(function(l){ html += '<div class="flex gap-2 text-xs text-gray-500"><span class="whitespace-nowrap">'+vpDateTime(l.created_at)+'</span><span class="font-medium text-gray-600">['+l.phase+']</span><span>'+l.action+'</span></div>'; });
        html += '</div></div>';
    }

    if(v.pipeline_status==='uploaded') {
        html += '<div class="mt-4 pt-4 border-t flex gap-2">';
        html += '<button onclick="vpTriggerAnalysis(\''+v.id+'\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 transition font-medium">🔬 Analyse starten</button>';
        html += '<button onclick="vpManualAdvance(\''+v.id+'\',\'analyzing\')" class="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition text-sm">⏩ Manuell weiter</button>';
        html += '</div>';
    }

    if(v.pipeline_status==='consent_check' || v.pipeline_status==='consent_blocked') {
        html += '<div class="mt-4 pt-4 border-t flex gap-2">';
        html += '<button onclick="vpCloseModal();vpShowTagging(\''+v.id+'\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 transition font-medium">👥 Personen taggen</button>';
        html += '<button onclick="vpTriggerConsent(\''+v.id+'\')" class="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm">🔍 Consent prüfen</button>';
        html += '<button onclick="vpManualAdvance(\''+v.id+'\',\'cutting\')" class="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition text-sm">⏩ Überspringen</button>';
        html += '</div>';
    }

    if(v.pipeline_status==='cutting') {
        html += '<div class="mt-4 pt-4 border-t flex gap-2">';
        html += '<button onclick="vpTriggerReels(\''+v.id+'\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 transition font-medium">🎬 Reels generieren</button>';
        html += '<button onclick="vpManualAdvance(\''+v.id+'\',\'review\')" class="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition text-sm">⏩ Zur Freigabe</button>';
        html += '</div>';
    }

    if(v.pipeline_status==='review') {
        html += '<div class="mt-4 pt-4 border-t flex gap-2">';
        html += '<button onclick="vpApproveVideo(\''+v.id+'\')" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium">✅ Freigeben</button>';
        html += '<button onclick="vpRejectVideo(\''+v.id+'\')" class="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition text-sm">❌ Ablehnen</button>';
        html += '</div>';
    }

    if(v.pipeline_status==='approved') {
        html += '<div class="mt-4 pt-4 border-t"><button onclick="vpManualAdvance(\''+v.id+'\',\'publishing\')" class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition font-medium">🚀 Veröffentlichen</button></div>';
    }

    vpModal(html);
} catch(e) {
    vpModal('<p class="text-red-600">Fehler: '+e.message+'</p><button onclick="vpCloseModal()" class="mt-4 text-gray-500">Schließen</button>');
}
};

// ==================== CONSENTS (Standort) ====================
window.vpRenderConsents = async function() {
var c = document.getElementById('vpConsentsContent');
if(!c) return;
c.innerHTML = '<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>';

try {
    var sid = sbStandort?.id;
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
        standort_id: sbStandort.id,
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
    // HQ sieht Videos ALLER Standorte im Status review
    var {data:videos,error} = await _sb().from('videos').select('*, standorte(name)').eq('pipeline_status','review').order('created_at',{ascending:true});
    if(error) throw error;
    videos = videos || [];

    // Also load all that need review but are approved already
    var {data:approved} = await _sb().from('videos').select('*, standorte(name)').eq('pipeline_status','approved').order('updated_at',{ascending:false}).limit(10);
    var {data:reels} = await _sb().from('reels').select('*').eq('status','generated');

    var html = '';

    // Stats
    html += '<div class="grid grid-cols-3 gap-4 mb-6">';
    html += '<div class="vit-card p-4 text-center '+(videos.length>0?'ring-2 ring-orange-400':'')+'"><div class="text-3xl font-bold text-orange-600">'+videos.length+'</div><div class="text-xs text-gray-500">Warten auf Freigabe</div></div>';
    html += '<div class="vit-card p-4 text-center"><div class="text-3xl font-bold text-green-600">'+(approved||[]).length+'</div><div class="text-xs text-gray-500">Kürzlich freigegeben</div></div>';
    html += '<div class="vit-card p-4 text-center"><div class="text-3xl font-bold text-blue-600">'+(reels||[]).length+'</div><div class="text-xs text-gray-500">Reels bereit</div></div>';
    html += '</div>';

    if(videos.length===0) {
        html += '<div class="vit-card p-8 text-center text-gray-400"><div class="text-4xl mb-2">✅</div><p>Keine Videos warten auf Freigabe.</p></div>';
    } else {
        html += '<div class="space-y-4">';
        videos.forEach(function(v){
            var standortName = v.standorte?v.standorte.name:'Unbekannt';
            var videoReels = (reels||[]).filter(function(r){return r.video_id===v.id;});

            html += '<div class="vit-card p-5">';
            html += '<div class="flex justify-between items-start mb-3"><div><div class="flex items-center gap-2"><h4 class="font-semibold text-gray-800">'+v.filename+'</h4><span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">📍 '+standortName+'</span></div><p class="text-xs text-gray-500 mt-1">'+(vpCategoryLabels[v.category]||v.category)+' · '+vpFileSize(v.file_size_bytes)+' · '+vpDateTime(v.created_at)+'</p></div>'+vpBadge('review')+'</div>';

            if(v.pipeline_status_detail) html += '<div class="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">💬 '+v.pipeline_status_detail+'</div>';

            if(videoReels.length>0) {
                html += '<div class="space-y-2 mb-3">';
                videoReels.forEach(function(r){ html += '<div class="p-3 bg-gray-50 rounded-lg text-sm">🎞️ '+(r.caption||'Reel')+' <span class="text-xs text-gray-400">('+r.format+', '+(r.duration_seconds||'?')+'s)</span></div>'; });
                html += '</div>';
            }

            // Checklist
            html += '<div class="border-t pt-3 mt-3"><p class="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Prüfcheckliste</p>';
            html += '<div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm" id="vpChecklist_'+v.id+'">';
            ['consent_ok:Datenschutz/Consent','legal_ok:Rechtlich ok','brand_ok:Markenkonform','quality_ok:Qualität ok','platform_ok:Plattform-Regeln','music_ok:Musik lizenziert'].forEach(function(item){
                var parts = item.split(':');
                html += '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" class="vp-check-item rounded text-vit-orange" data-key="'+parts[0]+'"><span>'+parts[1]+'</span></label>';
            });
            html += '</div></div>';

            html += '<div class="flex gap-2 mt-3 pt-3 border-t">';
            html += '<button onclick="vpHqApprove(\''+v.id+'\')" class="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-sm">✅ Freigeben</button>';
            html += '<button onclick="vpHqReject(\''+v.id+'\')" class="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm">❌ Ablehnen</button>';
            html += '<button onclick="vpShowVideoDetail(\''+v.id+'\')" class="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm">Details</button>';
            html += '</div></div>';
        });
        html += '</div>';
    }

    // Recently approved
    if(approved && approved.length>0) {
        html += '<div class="mt-6"><h3 class="font-semibold text-gray-700 mb-3">Kürzlich freigegeben</h3><div class="vit-card overflow-hidden"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="text-left p-3">Video</th><th class="text-left p-3">Standort</th><th class="text-left p-3">Freigegeben</th></tr></thead><tbody>';
        approved.forEach(function(v){
            html += '<tr class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="vpShowVideoDetail(\''+v.id+'\')"><td class="p-3 font-medium">'+v.filename+'</td><td class="p-3 text-gray-500">'+(v.standorte?v.standorte.name:'–')+'</td><td class="p-3 text-gray-500">'+vpDateTime(v.updated_at)+'</td></tr>';
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
var reason = prompt('Ablehnungsgrund:');
if(reason===null) return;
try {
    await _sb().from('videos').update({pipeline_status:'rejected',pipeline_status_detail:'HQ: '+reason}).eq('id',videoId);
    await _sb().from('review_tasks').update({completed_at:new Date().toISOString(),decision:'rejected',checklist:{reason:reason}}).eq('video_id',videoId).is('completed_at',null);
    await _sb().from('reels').update({status:'rejected',review_notes:reason}).eq('video_id',videoId).eq('status','generated');
    vpRenderHqReview();
    vpUpdateHqBadge();
} catch(e) { alert('Fehler: '+e.message); }
};

// ==================== BADGE UPDATES ====================
window.vpUpdateHqBadge = async function() {
try {
    var {count} = await _sb().from('videos').select('*',{count:'exact',head:true}).eq('pipeline_status','review');
    var b = document.getElementById('hqVpReviewBadge');
    if(b) { b.textContent = count||0; b.style.display = count>0?'inline':'none'; }
} catch(e) {}
};

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

})();
