/**
 * views/video-dashboard.js - Pipeline Dashboard, Video Detail Modal, Frame Extraction, Chat, Pipeline Triggers
 * @module views/video-dashboard
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// Local refs to shared constants (set by video-pipeline.js orchestrator)
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

function vpFormatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
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
        c.innerHTML = '<div class="vit-card p-8 text-center text-gray-400"><div class="text-4xl mb-2">\ud83c\udfac</div><p>Kein Standort zugeordnet.</p></div>'; return;
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
    html += '<div class="vit-card p-4"><div class="text-2xl font-bold text-green-600">'+published+'</div><div class="text-xs text-gray-500">Ver\u00f6ffentlicht</div></div>';
    html += '<div class="vit-card p-4 '+(needReview>0?'ring-2 ring-orange-400':'')+'"><div class="text-2xl font-bold text-orange-600">'+needReview+'</div><div class="text-xs text-gray-500">Bei HQ zur Freigabe</div></div>';
    html += '</div>';

    // Pipeline visualization
    html += '<div class="vit-card p-4 mb-6"><h3 class="font-semibold text-gray-700 mb-3">Pipeline-Status</h3>';
    var stages = ['uploaded','analyzing','consent_check','cutting','review','publishing','published'];
    html += '<div class="flex items-center gap-1 text-xs">';
    stages.forEach(function(s){
        var count = videos.filter(function(v){return v.pipeline_status===s}).length;
        html += '<div class="flex-1 text-center"><div class="h-8 rounded flex items-center justify-center font-medium '+(vpStatusColors[s]||'')+'">'+(count||'')+'</div><div class="mt-1 text-gray-500 truncate">'+(vpStatusLabels[s]||s)+'</div></div>';
        if(s !== 'published') html += '<div class="text-gray-300">\u2192</div>';
    });
    html += '</div></div>';

    if(videos.length === 0) {
        html += '<div class="vit-card p-8 text-center text-gray-400"><div class="text-4xl mb-2">\ud83c\udfac</div><p>Noch keine Videos hochgeladen.</p><button onclick="switchSmSub(\'upload\')" class="mt-3 text-vit-orange hover:underline font-medium">Erstes Video hochladen \u2192</button></div>';
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
            html += '<tr class="border-t-2 border-orange-200 bg-orange-50"><td class="p-3 font-medium text-gray-800" colspan="2">\ud83d\udcce '+g.label+' <span class="text-xs text-gray-400">('+g.videos.length+' Clips)</span></td><td class="p-3">'+window.vpBadge(g.videos[0].pipeline_status)+'</td><td class="p-3 text-gray-500">'+window.vpDateTime(g.videos[0].created_at)+'</td><td class="p-3 text-right text-gray-500">'+window.vpFileSize(totalSize)+'</td></tr>';
            g.videos.sort(function(a,b){return (a.sort_order||0)-(b.sort_order||0)});
            g.videos.forEach(function(v){
                html += '<tr class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer bg-orange-50/30" onclick="vpShowVideoDetail(\''+v.id+'\')">';
                html += '<td class="p-3 pl-8 text-gray-600">\u21b3 '+v.filename+'</td>';
                html += '<td class="p-3 text-gray-500">'+(vpCategoryLabels[v.category]||v.category)+'</td>';
                html += '<td class="p-3">'+window.vpBadge(v.pipeline_status)+'</td>';
                html += '<td class="p-3 text-gray-500">'+window.vpDateTime(v.created_at)+'</td>';
                html += '<td class="p-3 text-right text-gray-500">'+window.vpFileSize(v.file_size_bytes)+'</td>';
                html += '</tr>';
            });
        });

        // Then singles
        singles.forEach(function(v){
            html += '<tr class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="vpShowVideoDetail(\''+v.id+'\')">';
            html += '<td class="p-3 font-medium text-gray-800">'+v.filename+'</td>';
            html += '<td class="p-3">'+(vpCategoryLabels[v.category]||v.category)+'</td>';
            html += '<td class="p-3">'+window.vpBadge(v.pipeline_status)+'</td>';
            html += '<td class="p-3 text-gray-500">'+window.vpDateTime(v.created_at)+'</td>';
            html += '<td class="p-3 text-right text-gray-500">'+window.vpFileSize(v.file_size_bytes)+'</td>';
            html += '</tr>';
        });
        html += '</tbody></table></div>';
    }
    c.innerHTML = html;
} catch(e) {
    c.innerHTML = '<div class="vit-card p-6 text-red-600">Fehler beim Laden: '+_escH(e.message)+'</div>';
}
};

// ==================== VIDEO DETAIL MODAL ====================
window.vpShowVideoDetail = async function(videoId) {
window.vpModal('<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>');
try {
    var {data:v} = await _sb().from('videos').select('*').eq('id',videoId).single();
    var {data:persons} = await _sb().from('video_persons').select('*, consents(person_name,consent_type,valid_until,revoked_at)').eq('video_id',videoId);
    var {data:reels} = await _sb().from('reels').select('*, reel_publications(*)').eq('video_id',videoId);
    var {data:logs} = await _sb().from('pipeline_log').select('*').eq('video_id',videoId).order('created_at',{ascending:true});

    var isHqUser = (window.sbProfile && window.sbProfile.is_hq) || (window.currentRoles && window.currentRoles.indexOf('hq') !== -1) || false;

    // HEADER
    var html = '<div class="flex justify-between items-start mb-3"><div><h2 class="text-lg font-bold text-gray-800">'+v.filename+'</h2><p class="text-xs text-gray-500">'+(vpCategoryLabels[v.category]||v.category)+' \u00b7 '+window.vpFileSize(v.file_size_bytes)+' \u00b7 '+window.vpDateTime(v.created_at)+'</p></div><div class="flex items-center gap-2">'+window.vpBadge(v.pipeline_status)+'<button onclick="vpCloseModal()" class="text-gray-400 hover:text-gray-600 text-2xl ml-2">&times;</button></div></div>';

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
            html += '<div class="flex justify-between items-center p-2 bg-gray-50 rounded text-xs mb-1"><span>'+(r.caption?r.caption.substring(0,50):'Reel')+'</span>'+window.vpBadge(r.status)+'</div>';
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
        logs.forEach(function(l){ html += '<div class="flex gap-2 text-[10px] text-gray-500"><span class="whitespace-nowrap">'+window.vpDateTime(l.created_at)+'</span><span class="font-medium text-gray-600">['+l.phase+']</span><span>'+l.action+'</span></div>'; });
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
                html += '<div class="flex gap-2"><div class="w-6 h-6 rounded-full bg-vit-orange text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">HQ</div><div class="bg-white rounded-lg rounded-tl-sm px-3 py-2 text-xs shadow-sm max-w-[90%]">'+(d.feedback||l.action)+'<div class="text-[10px] text-gray-300 mt-1">'+window.vpDateTime(l.created_at)+'</div></div></div>';
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

    window.vpModal(html);

} catch(e) { window.vpModal('<p class="text-red-600 p-4">Fehler beim Laden: '+e.message+'</p>'); console.error('[vpShowVideoDetail]',e); }
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
            if(typing) typing.outerHTML = '<div class="flex gap-2 justify-end"><div class="bg-blue-50 rounded-lg rounded-tr-sm px-3 py-2 text-xs shadow-sm max-w-[90%]"><div class="text-[10px] font-medium text-blue-600 mb-1">\ud83e\udd16 KI</div>'+reply+'</div><div class="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">KI</div></div>';
        } else {
            if(typing) typing.outerHTML = '<div class="flex gap-2 justify-end"><div class="bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-500">\ud83d\udcdd Feedback gespeichert (KI-Revision sp\u00e4ter)</div><div class="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">KI</div></div>';
        }
    } catch(e) {
        var typing = document.getElementById('vpChatTyping');
        if(typing) typing.outerHTML = '<div class="flex gap-2 justify-end"><div class="bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-500">\ud83d\udcdd Gespeichert (Edge Function offline)</div><div class="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">KI</div></div>';
    }
    if(chatEl) chatEl.scrollTop = chatEl.scrollHeight;
};

function vpExtractPersonFrames(persons) {
    var video = document.getElementById('vpDetailPlayer');
    var canvas = document.getElementById('vpFrameCanvas');
    if(!video || !canvas) {
        // No player — show fallback icons
        persons.forEach(function(p, idx) {
            var loading = document.getElementById('vpFrameLoading_' + idx);
            if(loading) loading.innerHTML = '<span class="text-2xl">\ud83d\udc64</span>';
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
                if(loading) loading.innerHTML = '<span class="text-2xl">\ud83d\udc64</span>';
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
            if(loading) loading.innerHTML = '<span class="text-2xl">\ud83d\udc64</span>';
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

// ==================== PIPELINE TRIGGERS ====================
window.vpTriggerAnalysis = async function(videoId) {
if(!confirm('\ud83d\udd2c Video-Analyse starten?\n\nDas Video wird analysiert (Szenen, Personen, Highlights).\nDies kann 1-5 Minuten dauern.')) return;
try {
    window.vpModal('<div class="text-center py-8"><div class="animate-spin w-10 h-10 border-4 border-vit-orange border-t-transparent rounded-full mx-auto mb-4"></div><p class="text-gray-600 font-medium">Analyse wird gestartet...</p><p class="text-xs text-gray-400 mt-1">Edge Function: analyze-video</p></div>');
    var {data,error} = await _sb().functions.invoke('analyze-video', {
        body: { video_id: videoId }
    });
    if(error) throw error;
    if(data && data.success) {
        var msg = '\u2705 Analyse abgeschlossen!\n\n';
        msg += '\ud83d\udc65 Personen erkannt: ' + (data.analysis?.persons_detected || 0) + '\n';
        msg += '\ud83c\udfac Szenen: ' + (data.analysis?.scenes || 0) + '\n';
        msg += '\u2b50 Highlights: ' + (data.analysis?.highlights || 0) + '\n';
        msg += '\ud83d\udcca Qualit\u00e4t: ' + (data.analysis?.quality_score || '\u2013') + '/100\n';
        msg += '\ud83d\udcc1 Kategorie: ' + (data.analysis?.suggested_category || '\u2013');
        window.vpCloseModal();
        _showToast(msg, 'info');
    } else {
        throw new Error(data?.error || 'Unbekannter Fehler');
    }
    window.vpRenderPipelineDashboard();
} catch(e) {
    window.vpCloseModal();
    _showToast('\u274c Analyse fehlgeschlagen: ' + e.message, 'error');
    window.vpRenderPipelineDashboard();
}
};

window.vpTriggerConsent = async function(videoId) {
try {
    window.vpModal('<div class="text-center py-8"><div class="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div><p class="text-gray-600 font-medium">Consent wird gepr\u00fcft...</p></div>');
    var {data,error} = await _sb().functions.invoke('check-consent', {
        body: { video_id: videoId }
    });
    if(error) throw error;
    window.vpCloseModal();
    if(data && data.success) {
        if(data.consent_result === 'all_cleared' || data.consent_result === 'auto_cleared') {
            _showToast('\u2705 Consent OK! ' + (data.cleared||0, 'success') + ' Person(en) gepr\u00fcft.\nVideo geht in den Schnitt.');
        } else {
            var missing = (data.details||[]).filter(function(d){return d.consent_status==='missing';});
            _showToast('\u26a0\ufe0f Consent fehlt f\u00fcr ' + missing.length + ' Person(en):\n' + missing.map(function(m){return '- ' + m.person_label + ': ' + m.reason;}).join('\n'), 'warning');
        }
    } else {
        throw new Error(data?.error || 'Unbekannter Fehler');
    }
    window.vpRenderPipelineDashboard();
} catch(e) {
    window.vpCloseModal();
    _showToast('\u274c Consent-Check fehlgeschlagen: ' + e.message, 'error');
}
};

window.vpTriggerReels = async function(videoId) {
if(!confirm('\ud83c\udfac Reels generieren?\n\nDas System w\u00e4hlt automatisch das passende Template\nund erstellt Reels basierend auf der Video-Analyse.')) return;
try {
    window.vpModal('<div class="text-center py-8"><div class="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div><p class="text-gray-600 font-medium">Reels werden generiert...</p><p class="text-xs text-gray-400 mt-1">Edge Function: generate-reels</p></div>');
    var {data,error} = await _sb().functions.invoke('generate-reels', {
        body: { video_id: videoId }
    });
    if(error) throw error;
    window.vpCloseModal();
    if(data && data.success) {
        var msg = '\u2705 ' + (data.reels?.length||0) + ' Reel(s) generiert!\n\n';
        msg += 'Template: ' + (data.template?.name || '\u2013') + '\n';
        msg += 'Clips: ' + (data.cut_list?.length || 0) + '\n\n';
        msg += 'Das Video steht jetzt zur Freigabe bereit.';
        _showToast(msg, 'info');
    } else {
        throw new Error(data?.error || 'Unbekannter Fehler');
    }
    window.vpRenderPipelineDashboard();
} catch(e) {
    window.vpCloseModal();
    _showToast('\u274c Reel-Generierung fehlgeschlagen: ' + e.message, 'error');
}
};

window.vpApproveVideo = async function(videoId) {
if(!confirm('\u2705 Video freigeben und zur Ver\u00f6ffentlichung markieren?')) return;
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
        actor:_sbUser() ?.id||'unknown', details:{approved_by:_sbUser() ?.name||'\u2013'}
    });
    window.vpCloseModal();
    _showToast('\u2705 Video freigegeben!', 'success');
    window.vpRenderPipelineDashboard();
    if(window.vpRenderHqReview) window.vpRenderHqReview();
} catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

window.vpRejectVideo = async function(videoId) {
var reason = prompt('\u274c Grund f\u00fcr Ablehnung:');
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
    window.vpCloseModal();
    _showToast('Video abgelehnt.', 'info');
    window.vpRenderPipelineDashboard();
    if(window.vpRenderHqReview) window.vpRenderHqReview();
} catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

window.vpManualAdvance = async function(videoId, targetStatus) {
var labels = {analyzing:'Analyse',consent_check:'Consent-Check',cutting:'Schnitt',review:'Freigabe',approved:'Freigegeben',publishing:'Ver\u00f6ffentlichung',published:'Ver\u00f6ffentlicht'};
if(!confirm('\u23e9 Manuell weiter zu: '+(labels[targetStatus]||targetStatus)+'?')) return;
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
    window.vpCloseModal();
    window.vpRenderPipelineDashboard();
} catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};
