/**
 * views/video-templates.js - Reel-Template CRUD
 * @module views/video-templates
 */
function _sb()           { return window.sb; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// ==================== TEMPLATE VERWALTUNG ====================
window.vpShowTemplates = async function() {
window.vpModal('<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>');
try {
    var {data:templates} = await _sb().from('reel_templates').select('*').order('category');
    templates = templates || [];
    var catLabels = {probefahrt:'\ud83d\udeb2 Probefahrt',event:'\ud83c\udf89 Event',werkstatt:'\ud83d\udd27 Werkstatt',cargo_demo:'\ud83d\udce6 Cargo',sonstiges:'\u26a1 Sonstiges'};

    var html = '<div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold text-gray-800">\ud83c\udfa8 Reel-Templates</h2><div class="flex gap-2"><button onclick="vpNewTemplate()" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-sm hover:bg-orange-600">+ Neues Template</button><button onclick="vpCloseModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button></div></div>';

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
            html += '<div class="text-xs text-gray-500 mt-1">'+t.target_duration_seconds+'s \u00b7 max '+str.max_clips+' Clips \u00b7 Intro '+str.intro_seconds+'s / Outro '+str.outro_seconds+'s \u00b7 '+(str.transition_type||'cut')+'</div>';
            html += '<div class="text-xs text-gray-400 mt-0.5">CTA: "'+(br.cta_text||'\u2013')+'"</div>';
            html += '</div>';
            html += '<div class="flex gap-1"><button onclick="vpEditTemplate(\''+t.id+'\')" class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">\u270f\ufe0f</button><button onclick="vpToggleTemplate(\''+t.id+'\','+!t.is_active+')" class="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">'+(t.is_active?'\u23f8\ufe0f':'\u25b6\ufe0f')+'</button></div>';
            html += '</div></div>';
        });
        html += '</div>';
    }
    window.vpModal(html);
} catch(e) { window.vpModal('<p class="text-red-600">Fehler: '+e.message+'</p>'); }
};

window.vpNewTemplate = function() { window.vpEditTemplate(null); };

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
html += '<button onclick="vpSaveTemplate('+(templateId?"'"+templateId+"'":"null")+')" class="flex-1 px-4 py-2 bg-vit-orange text-white rounded-lg hover:bg-orange-600 font-medium">\ud83d\udcbe Speichern</button>';
if(templateId) html += '<button onclick="vpDeleteTemplate(\''+templateId+'\')" class="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm">\ud83d\uddd1\ufe0f L\u00f6schen</button>';
html += '<button onclick="vpShowTemplates()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">Abbrechen</button>';
html += '</div>';
window.vpModal(html);
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
    window.vpShowTemplates();
} catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

window.vpToggleTemplate = async function(id, active) {
try { await _sb().from('reel_templates').update({is_active:active}).eq('id',id); window.vpShowTemplates(); } catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

window.vpDeleteTemplate = async function(id) {
if(!confirm('Template wirklich l\u00f6schen?')) return;
try { await _sb().from('reel_templates').delete().eq('id',id); window.vpShowTemplates(); } catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};
