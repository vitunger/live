/**
 * views/video-hq-review.js - HQ Review Dashboard, Approve/Reject mit Learning, KI-Learnings
 * @module views/video-hq-review
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// Local refs to shared constants
var vpCategoryLabels = {probefahrt:'Probefahrt',event:'Event',werkstatt:'Werkstatt',cargo_demo:'Cargo Demo',sonstiges:'Sonstiges'};

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
    html += '<div class="vit-card p-4 text-center '+(consent.length>0?'ring-2 ring-blue-400':'')+'"><div class="text-2xl font-bold text-blue-600">'+consent.length+'</div><div class="text-xs text-gray-500">Consent pr\u00fcfen</div></div>';
    html += '<div class="vit-card p-4 text-center '+(cutting.length>0?'ring-2 ring-purple-400':'')+'"><div class="text-2xl font-bold text-purple-600">'+cutting.length+'</div><div class="text-xs text-gray-500">Schnitt/Reels</div></div>';
    html += '<div class="vit-card p-4 text-center '+(review.length>0?'ring-2 ring-orange-400':'')+'"><div class="text-2xl font-bold text-orange-600">'+review.length+'</div><div class="text-xs text-gray-500">Freigabe</div></div>';
    html += '<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-green-600">'+(approved||[]).length+'</div><div class="text-xs text-gray-500">Erledigt</div></div>';
    html += '</div>';

    if(allVideos.length===0) {
        html += '<div class="vit-card p-8 text-center text-gray-400"><div class="text-4xl mb-2">\u2705</div><p>Keine Videos warten auf Bearbeitung.</p></div>';
    }

    // Template + Learnings Verwaltung
    html += '<div class="flex justify-end gap-2 mb-4"><button onclick="vpShowLearnings()" class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">\ud83e\udde0 KI-Learnings</button><button onclick="vpShowTemplates()" class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">\ud83c\udfa8 Reel-Templates</button></div>';

    // ── UPLOADED: Analyse starten ──
    if(uploaded.length>0) {
        html += '<div class="mb-6"><h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">\ud83d\udce4 Neu hochgeladen <span class="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">'+uploaded.length+'</span></h3><div class="space-y-3">';
        uploaded.forEach(function(v){
            var sn = v.standorte?v.standorte.name:'Unbekannt';
            html += '<div class="vit-card p-4"><div class="flex justify-between items-center"><div><span class="font-medium text-gray-800">'+v.filename+'</span><span class="text-xs ml-2 text-gray-400">\ud83d\udccd '+sn+' \u00b7 '+window.vpFileSize(v.file_size_bytes)+' \u00b7 '+window.vpDateTime(v.created_at)+'</span></div><div class="flex gap-2">';
            html += '<button onclick="vpTriggerAnalysis(\''+v.id+'\')" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-sm hover:bg-orange-600 font-medium">\ud83d\udd2c Analysieren</button>';
            html += '<button onclick="vpShowVideoDetail(\''+v.id+'\')" class="px-3 py-1.5 border rounded-lg text-gray-500 text-sm hover:bg-gray-50">Details</button>';
            html += '</div></div></div>';
        });
        html += '</div></div>';
    }

    // ── CONSENT CHECK ──
    if(consent.length>0) {
        html += '<div class="mb-6"><h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">\ud83d\udd0d Consent pr\u00fcfen <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">'+consent.length+'</span></h3><div class="space-y-3">';
        consent.forEach(function(v){
            var sn = v.standorte?v.standorte.name:'Unbekannt';
            var persons = v.analysis_result?v.analysis_result.persons_detected:0;
            html += '<div class="vit-card p-4"><div class="flex justify-between items-center"><div><span class="font-medium text-gray-800">'+v.filename+'</span><span class="text-xs ml-2 text-gray-400">\ud83d\udccd '+sn+' \u00b7 \ud83d\udc65 '+persons+' Person(en)</span>';
            if(v.pipeline_status==='consent_blocked') html += ' <span class="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">Blockiert</span>';
            html += '</div><div class="flex gap-2">';
            html += '<button onclick="vpTriggerConsent(\''+v.id+'\')" class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 font-medium">\ud83d\udd0d Pr\u00fcfen</button>';
            html += '<button onclick="vpManualAdvance(\''+v.id+'\',\'cutting\')" class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">\u23e9 \u00dcberspringen</button>';
            html += '<button onclick="vpShowVideoDetail(\''+v.id+'\')" class="px-3 py-1.5 border rounded-lg text-gray-500 text-sm hover:bg-gray-50">Details</button>';
            html += '</div></div></div>';
        });
        html += '</div></div>';
    }

    // ── CUTTING: Reels generieren ──
    if(cutting.length>0) {
        html += '<div class="mb-6"><h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">\u2702\ufe0f Schnitt & Reels <span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">'+cutting.length+'</span></h3><div class="space-y-3">';
        cutting.forEach(function(v){
            var sn = v.standorte?v.standorte.name:'Unbekannt';
            html += '<div class="vit-card p-4"><div class="flex justify-between items-center"><div><span class="font-medium text-gray-800">'+v.filename+'</span><span class="text-xs ml-2 text-gray-400">\ud83d\udccd '+sn+' \u00b7 '+(vpCategoryLabels[v.category]||v.category)+'</span></div><div class="flex gap-2">';
            html += '<button onclick="vpTriggerReels(\''+v.id+'\')" class="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 font-medium">\ud83c\udfac Reels generieren</button>';
            html += '<button onclick="vpShowVideoDetail(\''+v.id+'\')" class="px-3 py-1.5 border rounded-lg text-gray-500 text-sm hover:bg-gray-50">Details</button>';
            html += '</div></div></div>';
        });
        html += '</div></div>';
    }

    // ── REVIEW: Freigabe ──
    if(review.length>0) {
        html += '<div class="mb-6"><h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">\u2705 Freigabe <span class="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">'+review.length+'</span></h3><div class="space-y-3">';
        review.forEach(function(v){
            var sn = v.standorte?v.standorte.name:'Unbekannt';
            html += '<div class="vit-card p-5">';
            html += '<div class="flex justify-between items-start mb-3"><div><div class="flex items-center gap-2"><h4 class="font-semibold text-gray-800">'+v.filename+'</h4><span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">\ud83d\udccd '+sn+'</span></div><p class="text-xs text-gray-500 mt-1">'+(vpCategoryLabels[v.category]||v.category)+' \u00b7 '+window.vpFileSize(v.file_size_bytes)+' \u00b7 '+window.vpDateTime(v.created_at)+'</p></div>'+window.vpBadge('review')+'</div>';
            if(v.pipeline_status_detail) html += '<div class="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">\ud83d\udcac '+v.pipeline_status_detail+'</div>';

            html += '<div class="border-t pt-3 mt-3"><p class="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Pr\u00fcfcheckliste</p>';
            html += '<div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm" id="vpChecklist_'+v.id+'">';
            ['consent_ok:Datenschutz/Consent','legal_ok:Rechtlich ok','brand_ok:Markenkonform','quality_ok:Qualit\u00e4t ok','platform_ok:Plattform-Regeln','music_ok:Musik lizenziert'].forEach(function(item){
                var parts = item.split(':');
                html += '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" class="vp-check-item rounded text-vit-orange" data-key="'+parts[0]+'"><span>'+parts[1]+'</span></label>';
            });
            html += '</div></div>';

            html += '<div class="flex gap-2 mt-3 pt-3 border-t">';
            html += '<button onclick="vpHqApprove(\''+v.id+'\')" class="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-sm">\u2705 Freigeben</button>';
            html += '<button onclick="vpShowFeedback(\''+v.id+'\')" class="flex-1 px-4 py-2 bg-yellow-400 text-white rounded-lg hover:bg-yellow-500 font-medium text-sm">\ud83d\udcac Feedback</button>';
            html += '<button onclick="vpHqReject(\''+v.id+'\')" class="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm">\u274c Ablehnen</button>';
            html += '<button onclick="vpShowVideoDetail(\''+v.id+'\')" class="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm">Details</button>';
            html += '</div></div>';
        });
        html += '</div></div>';
    }

    // ── Kürzlich erledigt ──
    if(approved && approved.length>0) {
        html += '<div class="mt-6"><h3 class="font-semibold text-gray-700 mb-3">K\u00fcrzlich erledigt</h3><div class="vit-card overflow-hidden"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="text-left p-3">Video</th><th class="text-left p-3">Standort</th><th class="text-left p-3">Status</th><th class="text-left p-3">Datum</th></tr></thead><tbody>';
        approved.forEach(function(v){
            html += '<tr class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="vpShowVideoDetail(\''+v.id+'\')"><td class="p-3 font-medium">'+_escH(v.filename)+'</td><td class="p-3 text-gray-500">'+(v.standorte?_escH(v.standorte.name):'\u2013')+'</td><td class="p-3">'+window.vpBadge(v.pipeline_status)+'</td><td class="p-3 text-gray-500">'+window.vpDateTime(v.updated_at)+'</td></tr>';
        });
        html += '</tbody></table></div></div>';
    }

    c.innerHTML = html;
} catch(e) {
    c.innerHTML = '<div class="vit-card p-6 text-red-600">Fehler: '+_escH(e.message)+'</div>';
}
};

window.vpHqApprove = async function(videoId) {
var checks = {};
var allChecked = true;
document.querySelectorAll('#vpChecklist_'+videoId+' .vp-check-item').forEach(function(cb){ checks[cb.dataset.key]=cb.checked; if(!cb.checked) allChecked=false; });
if(!allChecked && !confirm('Nicht alle Pr\u00fcfpunkte abgehakt. Trotzdem freigeben?')) return;
try {
    await _sb().from('videos').update({pipeline_status:'approved',pipeline_status_detail:'Freigegeben von HQ'}).eq('id',videoId);
    await _sb().from('review_tasks').update({completed_at:new Date().toISOString(),decision:'approved',checklist:checks}).eq('video_id',videoId).is('completed_at',null);
    await _sb().from('reels').update({status:'approved',approved_by:_sbUser().id,approved_at:new Date().toISOString()}).eq('video_id',videoId).eq('status','generated');
    window.vpRenderHqReview();
    window.vpUpdateHqBadge();
} catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

window.vpHqReject = async function(videoId) {
// Strukturiertes Ablehnen mit Lerneffekt
var {data:v} = await _sb().from('videos').select('filename,category').eq('id',videoId).single();

var html = '<div class="flex justify-between items-center mb-4"><h2 class="text-lg font-bold text-gray-800">\u274c Video ablehnen</h2><button onclick="vpCloseModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>';
html += '<p class="text-sm text-gray-500 mb-4">'+(v?v.filename:'Video')+'</p>';

html += '<div class="space-y-3">';
html += '<div><p class="text-xs font-medium text-gray-500 mb-2 uppercase">Ablehnungsgr\u00fcnde</p>';
html += '<div class="flex flex-wrap gap-1.5" id="vpRejectTags">';
var rejectReasons = [
    {tag:'quality',label:'\ud83d\udcf9 Qualit\u00e4t zu schlecht'},
    {tag:'shaky',label:'\ud83e\udd1d Verwackelt'},
    {tag:'dark',label:'\ud83c\udf11 Zu dunkel'},
    {tag:'audio',label:'\ud83d\udd07 Ton-Probleme'},
    {tag:'branding',label:'\ud83c\udff7\ufe0f Branding fehlt'},
    {tag:'consent',label:'\ud83d\udc64 Consent-Problem'},
    {tag:'content',label:'\ud83d\udcdd Inhalt unpassend'},
    {tag:'length',label:'\u23f1\ufe0f Falsche L\u00e4nge'},
    {tag:'music',label:'\ud83c\udfb5 Musik ungeeignet'},
    {tag:'duplicate',label:'\ud83d\udd04 Duplikat'}
];
rejectReasons.forEach(function(r) {
    html += '<button onclick="vpToggleRejectTag(this)" class="vp-reject-tag px-2 py-1 text-xs border border-gray-300 rounded-full hover:bg-red-50 hover:border-red-300 cursor-pointer" data-tag="'+r.tag+'" data-active="false">'+r.label+'</button>';
});
html += '</div></div>';

html += '<div><label class="text-xs font-medium text-gray-500">Details / Begr\u00fcndung</label>';
html += '<textarea id="vpRejectReason" class="w-full mt-1 p-3 border rounded-lg text-sm" rows="3" placeholder="Was genau ist das Problem? Je genauer, desto besser lernt die KI..."></textarea></div>';

html += '<div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">';
html += '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="vpRejectLearn" checked class="rounded text-vit-orange"><span class="text-sm text-blue-700">\ud83e\udd16 KI soll daraus lernen (Regel wird automatisch erstellt)</span></label>';
html += '</div>';

html += '<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">';
html += '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="vpRejectExample" class="rounded text-vit-orange"><span class="text-sm text-yellow-700">\ud83d\udccc Als Negativ-Beispiel markieren (KI nutzt es als Referenz)</span></label>';
html += '</div>';

html += '</div>';
html += '<div class="flex gap-2 mt-4 pt-4 border-t">';
html += '<button onclick="vpConfirmReject(\''+videoId+'\')" class="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">\u274c Ablehnen & speichern</button>';
html += '<button onclick="vpCloseModal()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Abbrechen</button>';
html += '</div>';

window.vpModal(html);
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

if(!tags.length && !reason) { _showToast('Bitte mindestens einen Grund angeben.', 'error'); return; }

var tagLabels = [];
document.querySelectorAll('.vp-reject-tag[data-active="true"]').forEach(function(t) { tagLabels.push(t.textContent.trim()); });
var fullReason = (tagLabels.length ? tagLabels.join(', ') : '') + (reason ? (tagLabels.length ? ' \u2013 ' : '') + reason : '');

try {
    // 1. Video ablehnen
    await _sb().from('videos').update({pipeline_status:'rejected',pipeline_status_detail:'HQ: '+fullReason}).eq('id',videoId);
    await _sb().from('review_tasks').update({completed_at:new Date().toISOString(),decision:'rejected',checklist:{tags:tags,reason:reason}}).eq('video_id',videoId).is('completed_at',null);
    await _sb().from('reels').update({status:'rejected',review_notes:fullReason}).eq('video_id',videoId).eq('status','generated');

    // 2. KI-Learning erstellen
    if(shouldLearn && (reason || tags.length)) {
        var {data:v} = await _sb().from('videos').select('category').eq('id',videoId).single();
        var learningRules = [];
        if(tags.includes('shaky')) learningRules.push({cat:'quality',rule:'Verwackelte Aufnahmen vermeiden \u2013 Stativ oder Stabilisierung nutzen'});
        if(tags.includes('dark')) learningRules.push({cat:'quality',rule:'Auf ausreichende Beleuchtung achten \u2013 dunkle Szenen rausschneiden'});
        if(tags.includes('audio')) learningRules.push({cat:'audio',rule:'Tonqualit\u00e4t pr\u00fcfen \u2013 Hintergrundger\u00e4usche, Wind oder Rauschen vermeiden'});
        if(tags.includes('branding')) learningRules.push({cat:'branding',rule:'vit:bikes Branding (Logo, Farben) muss sichtbar sein'});
        if(tags.includes('music')) learningRules.push({cat:'audio',rule:'Musikauswahl pr\u00fcfen \u2013 muss zur Marke und Zielgruppe passen'});
        if(tags.includes('length')) learningRules.push({cat:'quality',rule:'Video-L\u00e4nge muss zum Template passen \u2013 nicht zu lang, nicht zu kurz'});
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

    window.vpCloseModal();
    window.vpRenderHqReview();
    window.vpUpdateHqBadge();
} catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

// ==================== APPROVE MIT LEARNING ====================
window.vpHqApproveWithLearning = async function(videoId) {
var {data:v} = await _sb().from('videos').select('filename,category').eq('id',videoId).single();
var html = '<div class="flex justify-between items-center mb-4"><h2 class="text-lg font-bold text-gray-800">\u2705 Video freigeben</h2><button onclick="vpCloseModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>';
html += '<p class="text-sm text-gray-500 mb-4">'+(v?v.filename:'Video')+'</p>';
html += '<div class="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">';
html += '<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="vpApproveExample" class="rounded text-green-500"><span class="text-sm text-green-700">\u2b50 Als Positiv-Beispiel markieren (KI lernt: "So soll es aussehen")</span></label>';
html += '</div>';
html += '<textarea id="vpApproveNote" class="w-full p-3 border rounded-lg text-sm mb-3" rows="2" placeholder="Optional: Was ist besonders gut an diesem Video?"></textarea>';
html += '<div class="flex gap-2">';
html += '<button onclick="vpConfirmApprove(\''+videoId+'\')" class="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium">\u2705 Freigeben</button>';
html += '<button onclick="vpCloseModal()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Abbrechen</button>';
html += '</div>';
window.vpModal(html);
};

window.vpConfirmApprove = async function(videoId) {
var markExample = document.getElementById('vpApproveExample').checked;
var note = (document.getElementById('vpApproveNote').value||'').trim();
try {
    await _sb().from('videos').update({pipeline_status:'approved',pipeline_status_detail:'Freigegeben von HQ'+(note?' \u2013 '+note:'')}).eq('id',videoId);
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

    window.vpCloseModal();
    window.vpRenderHqReview();
    window.vpUpdateHqBadge();
} catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

// ==================== KI-LEARNINGS VERWALTEN ====================
window.vpShowLearnings = async function() {
window.vpModal('<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>');
try {
    var {data:learnings} = await _sb().from('video_ki_learnings').select('*').eq('is_active',true).order('priority',{ascending:false});
    var {data:examples} = await _sb().from('video_ki_examples').select('*, videos(filename)').eq('is_active',true).order('created_at',{ascending:false});
    learnings = learnings||[]; examples = examples||[];

    var catIcons = {quality:'\ud83d\udcf9',branding:'\ud83c\udff7\ufe0f',audio:'\ud83d\udd0a',werkstatt:'\ud83d\udd27',probefahrt:'\ud83d\udeb2',event:'\ud83c\udf89',consent:'\ud83d\udc64',general:'\u26a1'};
    var typeColors = {rejection:'bg-red-100 text-red-700',approval:'bg-green-100 text-green-700',feedback:'bg-yellow-100 text-yellow-700',manual:'bg-blue-100 text-blue-700'};

    var html = '<div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold text-gray-800">\ud83e\udde0 KI-Learnings & Beispiele</h2><div class="flex gap-2"><button onclick="vpAddLearning()" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-sm hover:bg-orange-600">+ Neue Regel</button><button onclick="vpCloseModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div></div>';

    // Learnings
    html += '<h3 class="font-semibold text-gray-700 mb-2 flex items-center gap-2">\ud83d\udccb Regeln <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">'+learnings.length+'</span></h3>';
    if(!learnings.length) {
        html += '<p class="text-gray-400 text-sm mb-4">Noch keine Regeln. Werden automatisch aus Feedback und Ablehnungen erstellt.</p>';
    } else {
        html += '<div class="space-y-2 mb-6 max-h-60 overflow-y-auto">';
        learnings.forEach(function(l) {
            var tc = typeColors[l.learning_type]||'bg-gray-100 text-gray-600';
            html += '<div class="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-sm">';
            html += '<span>'+(catIcons[l.category]||'\u26a1')+'</span>';
            html += '<div class="flex-1 min-w-0"><div class="text-gray-800">'+l.rule+'</div>';
            html += '<div class="flex items-center gap-2 mt-1"><span class="text-xs px-1.5 py-0.5 rounded '+tc+'">'+l.learning_type+'</span><span class="text-xs text-gray-400">Priorit\u00e4t: '+l.priority+'/10</span>'+(l.applied_count?'<span class="text-xs text-gray-400">\u00b7 '+l.applied_count+'x angewendet</span>':'')+'</div></div>';
            html += '<button onclick="vpDeleteLearning(\''+l.id+'\')" class="text-gray-300 hover:text-red-500 text-xs">\u2715</button>';
            html += '</div>';
        });
        html += '</div>';
    }

    // Beispiele
    html += '<h3 class="font-semibold text-gray-700 mb-2 flex items-center gap-2 mt-4">\ud83d\udccc Beispiel-Videos <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">'+examples.length+'</span></h3>';
    if(!examples.length) {
        html += '<p class="text-gray-400 text-sm">Noch keine Beispiele. Markiere Videos beim Freigeben/Ablehnen als Beispiel.</p>';
    } else {
        html += '<div class="space-y-2 max-h-40 overflow-y-auto">';
        examples.forEach(function(ex) {
            var typeColor = ex.example_type==='good'?'bg-green-100 text-green-700':'bg-red-100 text-red-700';
            var typeIcon = ex.example_type==='good'?'\u2705':'\u274c';
            html += '<div class="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-sm">';
            html += '<span>'+typeIcon+'</span>';
            html += '<div class="flex-1"><div class="text-gray-800">'+(ex.videos?_escH(ex.videos.filename):'Video gel\u00f6scht')+'</div>';
            html += '<div class="text-xs text-gray-500">'+_escH(ex.description)+'</div>';
            html += '<span class="text-xs px-1.5 py-0.5 rounded '+typeColor+'">'+ex.example_type+'</span></div>';
            html += '<button onclick="vpDeleteExample(\''+ex.id+'\')" class="text-gray-300 hover:text-red-500 text-xs">\u2715</button>';
            html += '</div>';
        });
        html += '</div>';
    }

    window.vpModal(html);
} catch(e) { window.vpModal('<p class="text-red-600">Fehler: '+e.message+'</p>'); }
};

window.vpAddLearning = function() {
var html = '<div class="flex justify-between items-center mb-4"><h2 class="text-lg font-bold text-gray-800">+ Neue KI-Regel</h2><button onclick="vpShowLearnings()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>';
html += '<div class="space-y-3">';
html += '<div><label class="text-xs font-medium text-gray-500">Kategorie</label><select id="vlCat" class="w-full mt-1 p-2 border rounded-lg text-sm"><option value="general">Allgemein</option><option value="quality">Qualit\u00e4t</option><option value="branding">Branding</option><option value="audio">Audio/Musik</option><option value="werkstatt">Werkstatt</option><option value="probefahrt">Probefahrt</option><option value="event">Event</option><option value="consent">Consent</option></select></div>';
html += '<div><label class="text-xs font-medium text-gray-500">Regel</label><textarea id="vlRule" class="w-full mt-1 p-2 border rounded-lg text-sm" rows="2" placeholder="z.B. Immer den Standort-Namen im Intro einblenden"></textarea></div>';
html += '<div><label class="text-xs font-medium text-gray-500">Priorit\u00e4t (1-10)</label><input id="vlPrio" type="number" min="1" max="10" value="7" class="w-full mt-1 p-2 border rounded-lg text-sm"></div>';
html += '</div>';
html += '<div class="flex gap-2 mt-4"><button onclick="vpSaveLearning()" class="flex-1 px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 font-medium">\ud83d\udcbe Speichern</button><button onclick="vpShowLearnings()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Abbrechen</button></div>';
window.vpModal(html);
};

window.vpSaveLearning = async function() {
var rule = (document.getElementById('vlRule').value||'').trim();
if(!rule) { _showToast('Bitte Regel eingeben.', 'error'); return; }
try {
    await _sb().from('video_ki_learnings').insert({
        category: document.getElementById('vlCat').value,
        learning_type: 'manual',
        rule: rule,
        priority: parseInt(document.getElementById('vlPrio').value)||7,
        created_by: _sbUser().id
    });
    window.vpShowLearnings();
} catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

window.vpDeleteLearning = async function(id) {
if(!confirm('Regel deaktivieren?')) return;
try { await _sb().from('video_ki_learnings').update({is_active:false}).eq('id',id); window.vpShowLearnings(); } catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

window.vpDeleteExample = async function(id) {
if(!confirm('Beispiel entfernen?')) return;
try { await _sb().from('video_ki_examples').update({is_active:false}).eq('id',id); window.vpShowLearnings(); } catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};
