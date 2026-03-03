/**
 * views/video-themes.js - Themen-Verwaltung (DB-basiert), Standort-Status
 * @module views/video-themes
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// ==================== THEMEN-VERWALTUNG (DB-BASIERT) ====================

// Laden der Themen aus DB statt hardcoded
window.vpLoadThemen = async function() {
    try {
        var s = _sb(); if(!s) return;
        var {data,error} = await s.from('video_themen').select('*').eq('is_active',true).order('sort_order');
        if(error) throw error;
        // Map DB format → legacy smThemen format für renderSmThemen Kompatibilität
        window.smThemen = (data||[]).map(function(t){
            return {
                _dbId: t.id,
                id: t.themen_id,
                thema: t.thema,
                kat: t.kategorie,
                schwierig: t.schwierigkeit,
                hook: t.hook || [],
                hauptteil: t.hauptteil || '',
                cta: t.cta || '',
                hqTipp: t.hq_tipp || '',
                beispiel: t.beispiel_url || null,
                done: false // wird per video_themen_status gesetzt
            };
        });
        // Lade Standort-Status
        var profile = window.sbProfile;
        if(profile && profile.standort_id && !profile.is_hq) {
            var {data:statusData} = await s.from('video_themen_status').select('*').eq('standort_id', profile.standort_id);
            if(statusData) {
                statusData.forEach(function(st){
                    var th = window.smThemen.find(function(t){ return t._dbId === st.thema_id; });
                    if(th) { th.done = (st.status === 'erledigt'); th._statusId = st.id; th._videoId = st.video_id; }
                });
            }
        }
        // Refresh Themen-Liste falls Tab schon offen
        if(typeof renderSmThemen === 'function') { try { renderSmThemen(); } catch(e){} }
        else if(window.renderSmThemen) { try { window.renderSmThemen(); } catch(e){} }
    } catch(e) { console.warn('[vpLoadThemen] Error:', e.message); }
};

// HQ: Themen-Verwaltung Modal
window.vpHqManageThemen = async function() {
    window.vpModal('<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-vit-orange border-t-transparent rounded-full"></div></div>');
    try {
        var s = _sb();
        var {data:themen} = await s.from('video_themen').select('*').order('sort_order');
        var {data:standorte} = await s.from('standorte').select('id,name,ort').order('name');
        var {data:allStatus} = await s.from('video_themen_status').select('*, standort:standorte(name,ort)');
        window._vpThemenData = themen || [];
        window._vpStandorte = standorte || [];
        window._vpThemenStatus = allStatus || [];
        vpRenderThemenManager();
    } catch(e) { window.vpModal('<p class="text-red-600 p-4">Fehler: '+e.message+'</p>'); }
};

function vpRenderThemenManager() {
    var themen = window._vpThemenData || [];
    var statMap = {};
    (window._vpThemenStatus||[]).forEach(function(s){
        if(!statMap[s.thema_id]) statMap[s.thema_id] = [];
        statMap[s.thema_id].push(s);
    });

    var katIcons = {Story:'\ud83d\udcd6',Technik:'\ud83d\udd27',Beratung:'\ud83d\udcac',Werkstatt:'\ud83d\udee0\ufe0f',Tipps:'\ud83d\udca1',Cargo:'\ud83d\udce6',Probefahrt:'\ud83d\udeb4',Event:'\ud83c\udf89'};
    var katColors = {Story:'bg-pink-100 text-pink-700',Technik:'bg-blue-100 text-blue-700',Beratung:'bg-green-100 text-green-700',Werkstatt:'bg-gray-200 text-gray-700',Tipps:'bg-cyan-100 text-cyan-700',Cargo:'bg-amber-100 text-amber-700',Probefahrt:'bg-indigo-100 text-indigo-700'};

    var html = '<div class="flex items-center justify-between mb-4">';
    html += '<h2 class="text-lg font-bold text-gray-800">\ud83c\udfac Themen-Auftr\u00e4ge verwalten</h2>';
    html += '<div class="flex gap-2"><button onclick="vpThemenNew()" class="px-3 py-1.5 bg-vit-orange text-white rounded-lg text-xs font-semibold">+ Neues Thema</button>';
    html += '<button onclick="vpCloseModal()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div></div>';

    html += '<div class="text-xs text-gray-500 mb-3">' + themen.length + ' Themen \u00b7 ' + themen.filter(function(t){return t.is_active;}).length + ' aktiv</div>';

    html += '<div class="space-y-2 max-h-[65vh] overflow-y-auto">';
    themen.forEach(function(t) {
        var stati = statMap[t.id] || [];
        var doneCount = stati.filter(function(s){ return s.status === 'erledigt'; }).length;
        var totalStandorte = (window._vpStandorte||[]).length;
        var pct = totalStandorte ? Math.round(doneCount/totalStandorte*100) : 0;

        html += '<div class="border rounded-lg p-3 '+(t.is_active?'bg-white':'bg-gray-50 opacity-60')+'">';
        html += '<div class="flex items-center gap-3">';
        // Info
        html += '<div class="flex-1 min-w-0">';
        html += '<div class="flex items-center gap-2 mb-0.5">';
        html += '<span class="text-[10px] font-mono font-bold text-gray-400">'+t.themen_id.toUpperCase()+'</span>';
        html += '<span class="text-[10px] px-1.5 py-0.5 rounded '+(katColors[t.kategorie]||'bg-gray-100 text-gray-600')+'">'+(katIcons[t.kategorie]||'\ud83d\udccc')+' '+t.kategorie+'</span>';
        if(!t.is_active) html += '<span class="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded">Deaktiviert</span>';
        html += '</div>';
        html += '<p class="text-sm font-semibold text-gray-800 truncate">'+t.thema+'</p>';
        html += '</div>';
        // Progress
        html += '<div class="text-center flex-shrink-0 w-16">';
        html += '<div class="text-lg font-bold '+(pct>=50?'text-green-600':pct>0?'text-vit-orange':'text-gray-400')+'">'+doneCount+'</div>';
        html += '<div class="text-[9px] text-gray-400">von '+totalStandorte+'</div>';
        html += '</div>';
        // Actions
        html += '<div class="flex gap-1 flex-shrink-0">';
        html += '<button onclick="vpThemenEdit(\''+t.id+'\')" class="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600" title="Bearbeiten">\u270f\ufe0f</button>';
        html += '<button onclick="vpThemenStatus(\''+t.id+'\')" class="p-1.5 hover:bg-blue-50 rounded text-gray-400 hover:text-blue-600" title="Standort-Status">\ud83d\udcca</button>';
        html += '<button onclick="vpThemenToggle(\''+t.id+'\','+t.is_active+')" class="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600" title="'+(t.is_active?'Deaktivieren':'Aktivieren')+'">'+(t.is_active?'\ud83d\udd34':'\ud83d\udfe2')+'</button>';
        html += '<button onclick="vpThemenDelete(\''+t.id+'\')" class="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600" title="L\u00f6schen">\ud83d\uddd1\ufe0f</button>';
        html += '</div>';
        html += '</div></div>';
    });
    html += '</div>';
    window.vpModal(html);
}

// Neues Thema erstellen
window.vpThemenNew = function() {
    var kats = ['Story','Technik','Beratung','Werkstatt','Tipps','Cargo','Probefahrt','Event'];
    var html = '<h2 class="text-lg font-bold text-gray-800 mb-4">\u2795 Neues Thema erstellen</h2>';
    html += '<div class="space-y-3">';
    html += '<div><label class="text-xs font-semibold text-gray-600">Themen-ID</label><input id="vtId" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="c200" value="c'+(200+Math.floor(Math.random()*800))+'"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600">Thema *</label><input id="vtThema" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Titel des Videothemas"></div>';
    html += '<div class="grid grid-cols-2 gap-3">';
    html += '<div><label class="text-xs font-semibold text-gray-600">Kategorie</label><select id="vtKat" class="w-full border rounded-lg px-3 py-2 text-sm">'+kats.map(function(k){return '<option>'+k+'</option>';}).join('')+'</select></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600">Schwierigkeit</label><select id="vtSchw" class="w-full border rounded-lg px-3 py-2 text-sm"><option>leicht</option><option>mittel</option><option>schwer</option></select></div>';
    html += '</div>';
    html += '<div><label class="text-xs font-semibold text-gray-600">Hook-S\u00e4tze (einer pro Zeile)</label><textarea id="vtHook" class="w-full border rounded-lg px-3 py-2 text-sm" rows="2" placeholder="Erster Hook-Satz&#10;Zweiter Hook-Satz"></textarea></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600">Hauptteil / Beschreibung</label><textarea id="vtHaupt" class="w-full border rounded-lg px-3 py-2 text-sm" rows="3" placeholder="Was soll gedreht werden?"></textarea></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600">Call-to-Action</label><input id="vtCta" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="CTA-Vorschlag"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600">HQ-Tipp</label><input id="vtTipp" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Tipp f\u00fcrs Drehen"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600">Beispiel-Video URL (optional)</label><input id="vtBeispiel" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://..."></div>';
    html += '</div>';
    html += '<div class="flex gap-2 mt-4"><button onclick="vpThemenSave()" class="flex-1 py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm">Speichern</button>';
    html += '<button onclick="vpHqManageThemen()" class="px-4 py-2.5 bg-gray-100 rounded-lg text-sm">Zur\u00fcck</button></div>';
    window.vpModal(html);
};

window.vpThemenSave = async function(editId) {
    var thema = document.getElementById('vtThema').value.trim();
    if(!thema) { _showToast('Bitte Thema eingeben', 'error'); return; }
    var hooks = (document.getElementById('vtHook').value||'').split('\n').filter(function(h){return h.trim();});
    var row = {
        themen_id: document.getElementById('vtId').value.trim(),
        thema: thema,
        kategorie: document.getElementById('vtKat').value,
        schwierigkeit: document.getElementById('vtSchw').value,
        hook: hooks,
        hauptteil: document.getElementById('vtHaupt').value.trim() || null,
        cta: document.getElementById('vtCta').value.trim() || null,
        hq_tipp: document.getElementById('vtTipp').value.trim() || null,
        beispiel_url: document.getElementById('vtBeispiel').value.trim() || null
    };
    try {
        var s = _sb();
        if(editId) {
            var {error} = await s.from('video_themen').update(row).eq('id', editId);
            if(error) throw error;
        } else {
            row.sort_order = (window._vpThemenData||[]).length;
            var {error} = await s.from('video_themen').insert(row);
            if(error) throw error;
        }
        window.vpHqManageThemen(); // Zurück zur Liste
    } catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

// Thema bearbeiten
window.vpThemenEdit = function(dbId) {
    var t = (window._vpThemenData||[]).find(function(x){return x.id===dbId;});
    if(!t) return;
    // Öffne Formular vorausgefüllt
    window.vpThemenNew();
    setTimeout(function(){
        document.getElementById('vtId').value = t.themen_id;
        document.getElementById('vtThema').value = t.thema;
        document.getElementById('vtKat').value = t.kategorie;
        document.getElementById('vtSchw').value = t.schwierigkeit;
        document.getElementById('vtHook').value = (t.hook||[]).join('\n');
        document.getElementById('vtHaupt').value = t.hauptteil||'';
        document.getElementById('vtCta').value = t.cta||'';
        document.getElementById('vtTipp').value = t.hq_tipp||'';
        document.getElementById('vtBeispiel').value = t.beispiel_url||'';
        // Replace save button to include editId
        var saveBtn = document.querySelector('#vpModal button[onclick="vpThemenSave()"]');
        if(saveBtn) saveBtn.setAttribute('onclick','vpThemenSave("'+dbId+'")');
        // Update title
        var h2 = document.querySelector('#vpModal h2');
        if(h2) h2.textContent = '\u270f\ufe0f Thema bearbeiten: ' + t.themen_id.toUpperCase();
    }, 50);
};

// Thema aktivieren/deaktivieren
window.vpThemenToggle = async function(dbId, currentActive) {
    try {
        var {error} = await _sb().from('video_themen').update({is_active: !currentActive}).eq('id', dbId);
        if(error) throw error;
        window.vpHqManageThemen();
    } catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

// Thema löschen
window.vpThemenDelete = async function(dbId) {
    if(!confirm('Thema wirklich l\u00f6schen? Alle Standort-Status-Daten gehen verloren.')) return;
    try {
        var {error} = await _sb().from('video_themen').delete().eq('id', dbId);
        if(error) throw error;
        window.vpHqManageThemen();
    } catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

// Standort-Status für ein Thema anzeigen + bearbeiten
window.vpThemenStatus = async function(themaDbId) {
    var t = (window._vpThemenData||[]).find(function(x){return x.id===themaDbId;});
    if(!t) return;
    var standorte = window._vpStandorte || [];
    var stati = (window._vpThemenStatus||[]).filter(function(s){return s.thema_id===themaDbId;});
    var statByStandort = {};
    stati.forEach(function(s){ statByStandort[s.standort_id] = s; });

    var html = '<div class="flex items-center justify-between mb-4">';
    html += '<div><h2 class="text-lg font-bold text-gray-800">\ud83d\udcca '+t.themen_id.toUpperCase()+': '+t.thema+'</h2>';
    var doneCount = stati.filter(function(s){return s.status==='erledigt';}).length;
    html += '<p class="text-xs text-gray-500">'+doneCount+' von '+standorte.length+' Standorten erledigt</p></div>';
    html += '<button onclick="vpHqManageThemen()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>';

    // Progress bar
    var pct = standorte.length ? Math.round(doneCount/standorte.length*100) : 0;
    html += '<div class="w-full bg-gray-200 rounded-full h-3 mb-4"><div class="h-3 rounded-full bg-gradient-to-r from-vit-orange to-green-500" style="width:'+pct+'%"></div></div>';

    html += '<div class="space-y-1 max-h-[55vh] overflow-y-auto">';
    standorte.forEach(function(st) {
        var status = statByStandort[st.id];
        var statusText = status ? status.status : 'offen';
        var statusColors = {offen:'text-gray-400',in_arbeit:'text-blue-600',erledigt:'text-green-600',uebersprungen:'text-gray-400 line-through'};
        var statusIcons = {offen:'\u2b1c',in_arbeit:'\ud83d\udd04',erledigt:'\u2705',uebersprungen:'\u23ed\ufe0f'};

        html += '<div class="flex items-center gap-3 p-2 rounded hover:bg-gray-50">';
        html += '<span class="text-sm">'+(statusIcons[statusText]||'\u2b1c')+'</span>';
        html += '<span class="flex-1 text-sm '+(statusColors[statusText]||'text-gray-600')+'">'+_escH(st.name)+(st.ort?' \u00b7 '+_escH(st.ort):'')+'</span>';

        // Status-Dropdown
        html += '<select onchange="vpThemenSetStatus(\''+themaDbId+'\',\''+st.id+'\',this.value)" class="text-xs border rounded px-2 py-1">';
        ['offen','in_arbeit','erledigt','uebersprungen'].forEach(function(opt){
            var labels = {offen:'Offen',in_arbeit:'In Arbeit',erledigt:'\u2705 Erledigt',uebersprungen:'\u00dcbersprungen'};
            html += '<option value="'+opt+'"'+(statusText===opt?' selected':'')+'>'+labels[opt]+'</option>';
        });
        html += '</select>';

        if(status && status.notiz) html += '<span class="text-[10px] text-gray-400" title="'+status.notiz+'">\ud83d\udcac</span>';
        html += '</div>';
    });
    html += '</div>';

    html += '<div class="mt-3 pt-3 border-t"><button onclick="vpHqManageThemen()" class="px-4 py-2 bg-gray-100 rounded-lg text-sm">\u2190 Zur\u00fcck zur \u00dcbersicht</button></div>';
    window.vpModal(html);
};

// Status eines Standorts für ein Thema setzen
window.vpThemenSetStatus = async function(themaDbId, standortId, newStatus) {
    try {
        var s = _sb();
        var row = {
            thema_id: themaDbId,
            standort_id: standortId,
            status: newStatus,
            erledigt_am: newStatus === 'erledigt' ? new Date().toISOString() : null,
            erledigt_von: newStatus === 'erledigt' ? (window.sbUser||{}).id : null
        };
        var {error} = await s.from('video_themen_status').upsert(row, {onConflict:'thema_id,standort_id'});
        if(error) throw error;
        // Refresh status data
        var {data:allStatus} = await s.from('video_themen_status').select('*, standort:standorte(name,ort)');
        window._vpThemenStatus = allStatus || [];
        window.vpThemenStatus(themaDbId); // Re-render
    } catch(e) { _showToast('Fehler: '+e.message, 'error'); }
};

// Init: Themen aus DB laden beim Modul-Start
(async function() {
    await window.vpLoadThemen();
    // HQ-Button sichtbar machen
    var isHq = (window.sbProfile && window.sbProfile.is_hq) || (window.currentRoles && window.currentRoles.indexOf('hq') !== -1);
    var btn = document.getElementById('btnHqThemenManage');
    if(btn && isHq) btn.style.display = '';
})();
