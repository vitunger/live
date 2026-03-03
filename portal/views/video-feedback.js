/**
 * views/video-feedback.js - Video Feedback mit Tags
 * @module views/video-feedback
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// ==================== VIDEO FEEDBACK ====================
window.vpShowFeedback = async function(videoId) {
window.vpModal('<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>');
try {
    var {data:v} = await _sb().from('videos').select('*').eq('id',videoId).single();
    var {data:reels} = await _sb().from('reels').select('*').eq('video_id',videoId).order('created_at',{ascending:false});
    var {data:logs} = await _sb().from('pipeline_log').select('*').eq('video_id',videoId).eq('phase','feedback').order('created_at',{ascending:false});

    var html = '<div class="flex justify-between items-center mb-4"><h2 class="text-lg font-bold text-gray-800">\ud83d\udcac Feedback: '+v.filename+'</h2><button onclick="vpShowVideoDetail(\''+videoId+'\')" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>';

    // Current reels
    if(reels && reels.length > 0) {
        html += '<div class="mb-4"><h3 class="text-sm font-semibold text-gray-600 mb-2">Aktuelle Reels</h3>';
        reels.forEach(function(r) {
            html += '<div class="p-3 bg-gray-50 rounded-lg mb-2 text-sm">';
            html += '<div class="flex justify-between items-center"><span>\ud83c\udf9e\ufe0f '+(r.caption||'Reel')+' <span class="text-xs text-gray-400">(Rev. '+(r.revision_number||1)+')</span></span>'+window.vpBadge(r.status)+'</div>';
            if(r.feedback_summary) html += '<div class="mt-1 p-2 bg-yellow-50 rounded text-xs text-yellow-800">\ud83d\udca1 KI-Zusammenfassung: '+r.feedback_summary+'</div>';
            if(r.review_notes) html += '<div class="mt-1 text-xs text-gray-500">\ud83d\udcdd '+r.review_notes+'</div>';
            html += '</div>';
        });
        html += '</div>';
    }

    // Previous feedback
    if(logs && logs.length > 0) {
        html += '<div class="mb-4"><h3 class="text-sm font-semibold text-gray-600 mb-2">Bisheriges Feedback</h3><div class="space-y-2 max-h-40 overflow-y-auto">';
        logs.forEach(function(l) {
            var d = l.details || {};
            html += '<div class="p-2 bg-gray-50 rounded text-xs"><span class="text-gray-400">'+window.vpDateTime(l.created_at)+'</span> <span class="font-medium">'+(d.feedback||l.action)+'</span></div>';
        });
        html += '</div></div>';
    }

    // Feedback input
    html += '<div class="border-t pt-4 mt-4">';
    html += '<h3 class="text-sm font-semibold text-gray-600 mb-2">Neues Feedback</h3>';
    html += '<div class="space-y-2">';
    html += '<div class="flex flex-wrap gap-1.5">';
    ['Zu lang','Zu kurz','Schlechte Stellen raus','Mehr Action','Anderer CTA','Musik passt nicht','Branding fehlt','Untertitel hinzuf\u00fcgen','Intro \u00e4ndern','Outro \u00e4ndern'].forEach(function(tag) {
        html += '<button onclick="vpAddFeedbackTag(this)" class="vp-fb-tag px-2 py-1 text-xs border border-gray-300 rounded-full hover:bg-vit-orange hover:text-white hover:border-vit-orange transition cursor-pointer" data-active="false">'+tag+'</button>';
    });
    html += '</div>';
    html += '<textarea id="vpFeedbackText" class="w-full p-3 border rounded-lg text-sm" rows="3" placeholder="Detailliertes Feedback eingeben... z.B. \'Ab Sekunde 12 ist das Bild unscharf, bitte die Szene 0:05-0:15 verwenden statt...\'"></textarea>';
    html += '<div class="flex gap-2">';
    html += '<button onclick="vpSubmitFeedback(\''+videoId+'\')" class="flex-1 px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 font-medium text-sm">\ud83e\udd16 Feedback absenden & KI-Revision</button>';
    html += '<button onclick="vpShowVideoDetail(\''+videoId+'\')" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">Zur\u00fcck</button>';
    html += '</div></div></div>';

    window.vpModal(html);
} catch(e) { window.vpModal('<p class="text-red-600">Fehler: '+e.message+'</p>'); }
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
if(!text && !tags.length) { _showToast('Bitte Feedback eingeben oder Tags ausw\u00e4hlen.', 'error'); return; }

var feedbackStr = (tags.length ? '['+tags.join(', ')+'] ' : '') + text;
window.vpModal('<div class="text-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full mx-auto mb-3"></div><p class="text-gray-600">KI analysiert Feedback...</p><p class="text-xs text-gray-400 mt-1">Edge Function: review-feedback</p></div>');

try {
    var res = await _sb().functions.invoke('review-feedback', { body: { video_id: videoId, feedback: feedbackStr } });
    if(res.error) throw res.error;
    var data = res.data;

    if(data && data.success) {
        window.vpModal('<div class="text-center py-6"><div class="text-4xl mb-3">\u2705</div><p class="font-semibold text-gray-800">Feedback verarbeitet!</p><p class="text-sm text-gray-500 mt-1">'+(data.message||'KI-Revision wird vorbereitet')+'</p><button onclick="vpShowFeedback(\''+videoId+'\')" class="mt-4 px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 text-sm">Weiter</button></div>');
    } else {
        // Fallback: save feedback manually
        await _sb().from('pipeline_log').insert({ video_id: videoId, phase: 'feedback', action: 'hq_feedback', details: { feedback: feedbackStr, tags: tags } });
        await _sb().from('reels').update({ review_notes: feedbackStr, status: 'revision_needed' }).eq('video_id', videoId).eq('status', 'generated');
        window.vpModal('<div class="text-center py-6"><div class="text-4xl mb-3">\ud83d\udcdd</div><p class="font-semibold text-gray-800">Feedback gespeichert</p><p class="text-sm text-gray-500 mt-1">Feedback wurde hinterlegt. KI-Revision kann manuell ausgel\u00f6st werden.</p><button onclick="vpShowFeedback(\''+videoId+'\')" class="mt-4 px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 text-sm">OK</button></div>');
    }
} catch(e) {
    // Save feedback even if Edge Function fails
    try {
        await _sb().from('pipeline_log').insert({ video_id: videoId, phase: 'feedback', action: 'hq_feedback', details: { feedback: feedbackStr, tags: tags } });
        await _sb().from('reels').update({ review_notes: feedbackStr }).eq('video_id', videoId).in('status', ['generated','rendering']);
    } catch(_) {}
    window.vpModal('<div class="text-center py-6"><div class="text-4xl mb-3">\ud83d\udcdd</div><p class="font-semibold text-gray-800">Feedback gespeichert</p><p class="text-sm text-gray-500 mt-1">'+(e.message||'Edge Function nicht verf\u00fcgbar \u2013 Feedback wurde trotzdem gespeichert.')+'</p><button onclick="vpShowVideoDetail(\''+videoId+'\')" class="mt-4 px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 text-sm">OK</button></div>');
}
};
