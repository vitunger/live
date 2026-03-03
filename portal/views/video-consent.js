/**
 * views/video-consent.js - Consent-Verwaltung, Tagging
 * @module views/video-consent
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// Local refs to shared constants
var vpConsentTypeLabels = {employee_general:'Mitarbeiter (Generell)',customer_single:'Kunde (Einmalig)',customer_general:'Kunde (Generell)'};

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
    if(!sid) { c.innerHTML = '<div class="vit-card p-8 text-center text-gray-400"><div class="text-4xl mb-2">\u2705</div><p>Kein Standort zugeordnet.</p></div>'; return; }
    var {data:consents,error} = await _sb().from('consents').select('*').eq('standort_id',sid).order('created_at',{ascending:false});
    if(error) throw error;
    consents = consents || [];

    var html = '<div class="flex justify-between items-center mb-4"><h3 class="font-semibold text-gray-700">Einverst\u00e4ndniserkl\u00e4rungen ('+consents.length+')</h3><button onclick="vpShowConsentForm()" class="px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 transition text-sm font-medium">+ Consent erfassen</button></div>';

    if(consents.length===0) {
        html += '<div class="vit-card p-8 text-center text-gray-400"><div class="text-4xl mb-2">\u2705</div><p>Noch keine Einverst\u00e4ndniserkl\u00e4rungen erfasst.</p><p class="text-sm mt-1">Erfasse Consents bevor Videos mit Personen verarbeitet werden.</p></div>';
    } else {
        html += '<div class="vit-card overflow-hidden"><table class="w-full text-sm"><thead class="bg-gray-50"><tr><th class="text-left p-3 font-medium text-gray-600">Person</th><th class="text-left p-3 font-medium text-gray-600">Typ</th><th class="text-left p-3 font-medium text-gray-600">G\u00fcltig ab</th><th class="text-left p-3 font-medium text-gray-600">G\u00fcltig bis</th><th class="text-left p-3 font-medium text-gray-600">Status</th><th class="text-right p-3 font-medium text-gray-600">Aktion</th></tr></thead><tbody>';
        consents.forEach(function(co){
            var isActive = !co.revoked_at && (!co.valid_until || new Date(co.valid_until)>=new Date());
            html += '<tr class="border-t border-gray-100"><td class="p-3 font-medium">'+co.person_name+(co.person_email?' <span class="text-gray-400 text-xs">('+co.person_email+')</span>':'')+'</td>';
            html += '<td class="p-3 text-gray-600">'+(vpConsentTypeLabels[co.consent_type]||co.consent_type)+'</td>';
            html += '<td class="p-3 text-gray-500">'+window.vpDate(co.valid_from)+'</td>';
            html += '<td class="p-3 text-gray-500">'+(co.valid_until?window.vpDate(co.valid_until):'Unbefristet')+'</td>';
            html += '<td class="p-3">'+(isActive?'<span class="text-green-600 font-medium">\u2705 Aktiv</span>':co.revoked_at?'<span class="text-red-600 font-medium">\ud83d\udeab Widerrufen</span>':'<span class="text-yellow-600 font-medium">\u23f0 Abgelaufen</span>')+'</td>';
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
window.vpModal(
    '<h2 class="text-lg font-bold text-gray-800 mb-4">\u2705 Neuen Consent erfassen</h2>' +
    '<div class="space-y-3">' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Name der Person *</label><input id="vpConsentName" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Max Mustermann"></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">E-Mail (optional)</label><input id="vpConsentEmail" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="max@example.com"></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Consent-Typ *</label><select id="vpConsentType" class="w-full px-3 py-2 border rounded-lg text-sm"><option value="employee_general">Mitarbeiter (Generell)</option><option value="customer_single">Kunde (Einmalig)</option><option value="customer_general">Kunde (Generell)</option></select></div>' +
    '<div class="grid grid-cols-2 gap-3"><div><label class="block text-sm font-medium text-gray-700 mb-1">G\u00fcltig ab</label><input type="date" id="vpConsentFrom" class="w-full px-3 py-2 border rounded-lg text-sm" value="'+new Date().toISOString().split('T')[0]+'"></div><div><label class="block text-sm font-medium text-gray-700 mb-1">G\u00fcltig bis (leer = unbefristet)</label><input type="date" id="vpConsentUntil" class="w-full px-3 py-2 border rounded-lg text-sm"></div></div>' +
    '<div><label class="block text-sm font-medium text-gray-700 mb-1">Notizen</label><textarea id="vpConsentNotes" class="w-full px-3 py-2 border rounded-lg text-sm" rows="2" placeholder="Optional..."></textarea></div></div>' +
    '<div class="flex justify-end gap-2 mt-4"><button onclick="vpCloseModal()" class="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Abbrechen</button><button onclick="vpSaveConsent()" class="px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 font-medium">Speichern</button></div>'
);
};

window.vpSaveConsent = async function() {
var name = document.getElementById('vpConsentName').value.trim();
if(!name) { _showToast('Name ist erforderlich.', 'info'); return; }
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
    window.vpCloseModal();
    window.vpRenderConsents();
} catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

window.vpRevokeConsent = async function(id) {
if(!confirm('Consent wirklich widerrufen?')) return;
try {
    await _sb().from('consents').update({revoked_at:new Date().toISOString()}).eq('id',id);
    window.vpRenderConsents();
} catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

// ==================== TAGGING ====================
window.vpShowTagging = async function(videoId) {
window.vpModal('<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>');
try {
    var {data:v} = await _sb().from('videos').select('*').eq('id',videoId).single();
    var {data:existingPersons} = await _sb().from('video_persons').select('*').eq('video_id',videoId);
    var {data:consents} = await _sb().from('consents').select('*').eq('standort_id',v.standort_id).is('revoked_at',null).order('person_name');

    var html = '<div class="flex justify-between items-start mb-4"><h2 class="text-lg font-bold text-gray-800">\ud83d\udc65 Personen taggen: '+v.filename+'</h2><button onclick="vpCloseModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div>';
    html += '<div id="vpTaggingList" class="space-y-2 mb-4">';
    if(existingPersons&&existingPersons.length>0) {
        existingPersons.forEach(function(p,i){ html += vpTagRow(i,consents,p); });
    } else { html += vpTagRow(0,consents); }
    html += '</div>';
    html += '<button onclick="vpAddTagRow()" class="text-sm text-vit-orange hover:underline mb-4">+ Weitere Person</button>';
    html += '<div class="flex justify-end gap-2 mt-4 pt-4 border-t"><button onclick="vpCloseModal()" class="px-4 py-2 border rounded-lg text-gray-600">Abbrechen</button><button onclick="vpSaveTagsAndCheck(\''+videoId+'\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 font-medium">Speichern & Consent pr\u00fcfen</button></div>';
    window._vpTagConsents = consents;
    window._vpTagRowCount = (existingPersons&&existingPersons.length)||1;
    window.vpModal(html);
} catch(e) { window.vpModal('<p class="text-red-600">Fehler: '+e.message+'</p>'); }
};

export function vpTagRow(idx,consents,existing) {
var opts = '<option value="">\u2013 Consent ausw\u00e4hlen \u2013</option>';
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
if(tags.length===0) { _showToast('Mindestens eine Person taggen.', 'info'); return; }
try {
    await _sb().from('video_persons').delete().eq('video_id',videoId);
    var {error} = await _sb().from('video_persons').insert(tags);
    if(error) throw error;
    await _sb().from('videos').update({persons_tagged:true}).eq('id',videoId);
    var {data:result} = await _sb().rpc('check_video_consent',{p_video_id:videoId});
    var check = result&&result[0]?result[0]:{all_cleared:false};
    if(check.all_cleared) {
        await _sb().from('videos').update({pipeline_status:'cutting',consent_cleared:true,pipeline_status_detail:'Alle Consents g\u00fcltig'}).eq('id',videoId);
        window.vpCloseModal(); _showToast('\u2705 Alle Consents g\u00fcltig! Video geht in den Schnitt.', 'success');
    } else {
        await _sb().from('videos').update({pipeline_status:'consent_blocked',pipeline_status_detail:'Consent fehlt f\u00fcr '+(check.blocked_persons||[]).map(function(p){return p.person}).join(', ')}).eq('id',videoId);
        window.vpCloseModal(); _showToast('\u26a0\ufe0f Consent fehlt f\u00fcr: '+(check.blocked_persons||[], 'warning').map(function(p){return p.person+' ('+p.reason+')'}).join(', '));
    }
    window.vpRenderPipelineDashboard();
} catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

// Strangler Fig
const _exports = {vpTagRow};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
