/**
 * views/video-pipeline.js - Video Pipeline Orchestrator
 * Constants, Helpers, Modal, Realtime, Init, Badge
 * Split 2026-03-03: 9 Sub-Module (video-upload, video-dashboard, video-consent,
 *   video-hq-review, video-templates, video-feedback, video-subtitles, video-themes)
 * @module views/video-pipeline
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }

// ==================== CONSTANTS ====================
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

// ==================== HELPER EXPORTS ====================
export function vpBadge(status) {
return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium '+(vpStatusColors[status]||'bg-gray-100 text-gray-700')+'">'+(vpStatusLabels[status]||status)+'</span>';
}
export function vpDate(d) { if(!d) return '\u2013'; return new Date(d).toLocaleDateString('de-DE'); }
export function vpDateTime(d) { if(!d) return '\u2013'; return new Date(d).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}); }
export function vpFileSize(bytes) { if(!bytes) return '\u2013'; if(bytes<1024*1024) return (bytes/1024).toFixed(0)+' KB'; return (bytes/(1024*1024)).toFixed(1)+' MB'; }

function vpFormatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

// ==================== MODAL ====================
export function vpModal(html) {
document.getElementById('vpModalContent').innerHTML = html;
document.getElementById('vpModal').style.display = 'flex';
}
window.vpCloseModal = function() { document.getElementById('vpModal').style.display = 'none'; };
document.addEventListener('click', function(e){ if(e.target && e.target.id === 'vpModal') vpCloseModal(); });

// ==================== SHARED STATE ====================
window._vpHelpers = { vpStatusLabels, vpStatusColors, vpCategoryLabels, vpConsentTypeLabels, vpFormatTime };

// ==================== REALTIME ====================
export function vpSetupRealtime() {
_sb().channel('video-pipeline-global')
    .on('postgres_changes',{event:'*',schema:'public',table:'videos'}, function(){
        vpUpdateHqBadge();
        // Refresh standort pipeline if visible
        var pipeEl = document.getElementById('smSubPipeline');
        if(pipeEl && pipeEl.style.display!=='none' && window.vpRenderPipelineDashboard) window.vpRenderPipelineDashboard();
        // Refresh HQ review if visible
        var hqEl = document.getElementById('hqMktTabVideoFreigabe');
        if(hqEl && hqEl.style.display!=='none' && window.vpRenderHqReview) window.vpRenderHqReview();
    })
    .subscribe();
}

// ==================== BADGE ====================
window.vpUpdateHqBadge = async function() {
try {
    var {count} = await _sb().from('videos').select('*',{count:'exact',head:true}).in('pipeline_status',['uploaded','consent_check','consent_blocked','cutting','review']);
    var b = document.getElementById('hqVpReviewBadge');
    if(b) { b.textContent = count||0; b.style.display = count>0?'inline':'none'; }
} catch(e) {}
};

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
const _exports = {vpBadge,vpDate,vpDateTime,vpFileSize,vpModal,vpSetupRealtime};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
