/**
 * views/user-approval.js - User-Freigabe, Ablehnung, Ebene-Logik
 * @module views/user-approval
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _sbStandort()   { return window.sbStandort; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

var approveEbene = 'standort';

export async function approveUser(userId, userName) {
    if(!hqCan('approve_user')) { _showToast('Keine Berechtigung zur Freigabe', 'error'); return; }
    approveEbene = 'standort';

    // User-Daten laden für Standort-Info
    var userResp = await _sb().from('users').select('*, standorte(name)').eq('id', userId).single();
    var userData = userResp.data || {};
    var currentStandortId = userData.standort_id || '';
    var currentStandortName = userData.standorte ? userData.standorte.name : '';

    var html = '<div id="approveOverlay" onclick="closeApproveModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
    html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:24px;width:460px;max-width:90vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
    html += '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold text-gray-800">User freigeben</h3><button onclick="closeApproveModal()" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>';
    html += '<p class="text-sm text-gray-600 mb-4"><strong>'+userName+'</strong> hat sich registriert und wartet auf Freigabe.'+(currentStandortName ? ' <span class="text-xs text-gray-400">(Gewünschter Standort: '+currentStandortName+')</span>' : '')+'</p>';

    // === EBENE (HQ vs Standort) ===
    html += '<div class="space-y-3 mb-4">';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Ebene</label>';
    html += '<div class="flex space-x-2">';
    html += '<button type="button" id="approveEbeneHQ" onclick="switchApproveEbene(\'hq\')" class="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-gray-200 bg-white text-gray-500 hover:border-gray-300">\ud83c\udfe2 HQ</button>';
    html += '<button type="button" id="approveEbeneStd" onclick="switchApproveEbene(\'standort\')" class="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-vit-orange bg-orange-50 text-orange-700">\ud83c\udfea Standort</button>';
    html += '</div></div>';

    // Standort Dropdown
    html += '<div id="approveStandortWrap"><label class="block text-xs font-semibold text-gray-600 mb-1">Standort *</label><select id="approveStandort" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="">Wird geladen...</option></select></div>';
    html += '</div>';

    // === ROLLEN (dynamisch basierend auf Ebene) ===
    html += '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rollen zuweisen</p>';

    // HQ Rollen (initial hidden)
    html += '<div id="approveRollesHQ" style="display:none">';
    var hqRollenAppr = [
        {key:'hq_gf',label:'👑 Geschäftsführung',color:'border-red-300 bg-red-50'},
        {key:'hq_sales',label:'📊 Sales',color:'border-blue-300 bg-blue-50'},
        {key:'hq_marketing',label:'📣 Marketing',color:'border-pink-300 bg-pink-50'},
        {key:'hq_einkauf',label:'🛒 Einkauf',color:'border-green-300 bg-green-50'},
        {key:'hq_support',label:'🎧 Support',color:'border-yellow-300 bg-yellow-50'},
        {key:'hq_akademie',label:'🎓 Akademie',color:'border-indigo-300 bg-indigo-50'},
        {key:'hq_hr',label:'👥 HR',color:'border-purple-300 bg-purple-50'},
        {key:'hq_it',label:'🖥️ IT / Systemadmin',color:'border-gray-400 bg-gray-100'},
        {key:'hq_zahlen',label:'💹 Zahlen',color:'border-teal-300 bg-teal-50'}
    ];
    hqRollenAppr.forEach(function(r){
        html += '<label class="flex items-center space-x-3 p-2 rounded-lg border '+r.color+' mb-1.5 cursor-pointer hover:shadow-sm transition">';
        html += '<input type="checkbox" id="approveRole_'+r.key+'" class="rounded approveHqRoleCheck" style="accent-color:#EF7D00;"'+' data-role="'+r.key+'">';
        html += '<span class="text-sm font-semibold text-gray-800">'+r.label+'</span></label>';
    });
    html += '</div>';

    // Standort Rollen (initial visible)
    html += '<div id="approveRollesStd">';
    var stdRollen = ['inhaber','verkauf','werkstatt','buchhaltung'];
    var stdLabels = {'inhaber':'Geschäftsleitung','verkauf':'Verkauf','werkstatt':'Werkstatt','buchhaltung':'Buchhaltung'};
    var stdColors = {'inhaber':'border-orange-300 bg-orange-50','verkauf':'border-blue-300 bg-blue-50','werkstatt':'border-gray-300 bg-gray-50','buchhaltung':'border-purple-300 bg-purple-50'};
    stdRollen.forEach(function(r){
        html += '<label class="flex items-center space-x-3 p-2 rounded-lg border '+stdColors[r]+' mb-1.5 cursor-pointer hover:shadow-sm transition">';
        html += '<input type="checkbox" id="approveRole_'+r+'" class="rounded" style="accent-color:#EF7D00;">';
        html += '<span class="text-sm font-semibold text-gray-800">'+stdLabels[r]+'</span></label>';
    });
    html += '</div>';

    html += '<div id="approveError" style="display:none" class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mt-3"></div>';
    html += '<div class="flex space-x-3 mt-4">';
    html += '<button id="approveSaveBtn" onclick="confirmApprove(\''+userId+'\')" class="flex-1 py-2.5 bg-green-500 text-white rounded-lg font-semibold text-sm hover:bg-green-600">\u2705 Freigeben</button>';
    html += '<button onclick="rejectUser(\''+userId+'\')" class="py-2.5 px-4 bg-red-100 text-red-600 rounded-lg font-semibold text-sm hover:bg-red-200">\u274c Ablehnen</button>';
    html += '<button onclick="closeApproveModal()" class="py-2.5 px-4 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Abbrechen</button>';
    html += '</div>';
    html += '</div></div>';

    var c = document.createElement('div');
    c.id = 'approveContainer';
    c.innerHTML = html;
    document.body.appendChild(c);

    // Standorte laden
    setTimeout(async function(){
        try {
            var stdResp = await _sb().from('standorte').select('id,name').order('name');
            var sel = document.getElementById('approveStandort');
            if(sel && stdResp.data) {
                sel.innerHTML = '<option value="">— Standort wählen —</option>';
                stdResp.data.forEach(function(s){
                    var selected = (currentStandortId === s.id) ? ' selected' : '';
                    sel.innerHTML += '<option value="'+s.id+'"'+selected+'>'+_escH(s.name)+'</option>';
                });
            }
        } catch(e){ console.error(e); }
    }, 100);
}

export function switchApproveEbene(ebene) {
    approveEbene = ebene;
    var hqBtn = document.getElementById('approveEbeneHQ');
    var stdBtn = document.getElementById('approveEbeneStd');
    var stdWrap = document.getElementById('approveStandortWrap');
    var rollesHQ = document.getElementById('approveRollesHQ');
    var rollesStd = document.getElementById('approveRollesStd');
    if(ebene === 'hq') {
        if(hqBtn) hqBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-red-500 bg-red-50 text-red-700';
        if(stdBtn) stdBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-gray-200 bg-white text-gray-500 hover:border-gray-300';
        if(stdWrap) stdWrap.style.display = 'none';
        if(rollesHQ) rollesHQ.style.display = '';
        if(rollesStd) rollesStd.style.display = 'none';
        var hqChk = document.getElementById('approveRole_hq');
        if(hqChk) hqChk.checked = true;
        document.querySelectorAll('.approveHqRoleCheck').forEach(function(chk){
            chk.checked = false;
        });
        ['inhaber','verkauf','werkstatt','buchhaltung'].forEach(function(r){
            var chk = document.getElementById('approveRole_'+r);
            if(chk) chk.checked = false;
        });
    } else {
        if(stdBtn) stdBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-vit-orange bg-orange-50 text-orange-700';
        if(hqBtn) hqBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-gray-200 bg-white text-gray-500 hover:border-gray-300';
        if(stdWrap) stdWrap.style.display = '';
        if(rollesHQ) rollesHQ.style.display = 'none';
        if(rollesStd) rollesStd.style.display = '';
        document.querySelectorAll('.approveHqRoleCheck').forEach(function(chk){ chk.checked = false; });
    }
}

export function closeApproveModal() {
    var c = document.getElementById('approveContainer');
    if(c) c.remove();
}

export async function confirmApprove(userId) {
    var errEl = document.getElementById('approveError');
    if(errEl) errEl.style.display = 'none';

    // Rollen basierend auf Ebene sammeln
    var selected = [];
    var isHqUser = (approveEbene === 'hq');
    if(isHqUser) {
        document.querySelectorAll('.approveHqRoleCheck:checked').forEach(function(chk){
            selected.push(chk.getAttribute('data-role'));
        });
        if(selected.length > 0 && selected.indexOf('hq') === -1) selected.push('hq');
    } else {
        ['inhaber','verkauf','werkstatt','buchhaltung'].forEach(function(r){
            var chk = document.getElementById('approveRole_'+r);
            if(chk && chk.checked) selected.push(r);
        });
    }
    if(selected.length === 0) {
        if(errEl) { errEl.textContent = 'Bitte mindestens eine Rolle zuweisen.'; errEl.style.display = 'block'; }
        return;
    }

    // Standort-Pflicht für Standort-User
    var standortId = null;
    if(!isHqUser) {
        var stdSel = document.getElementById('approveStandort');
        standortId = stdSel ? stdSel.value : null;
        if(!standortId) {
            if(errEl) { errEl.textContent = 'Bitte einen Standort wählen.'; errEl.style.display = 'block'; }
            return;
        }
    }

    var btn = document.getElementById('approveSaveBtn');
    if(btn) { btn.disabled = true; btn.textContent = 'Wird freigeschaltet...'; }

    try {
        // 1. Status auf aktiv + is_hq + Standort setzen
        var updateData = {
            status: 'aktiv',
            is_hq: isHqUser,
            standort_id: isHqUser ? null : standortId
        };
        var upd = await _sb().from('users').update(updateData).eq('id', userId);
        if(upd.error) throw upd.error;

        // 2. Rollen-IDs holen
        var rollenResp = await _sb().from('rollen').select('id, name');
        var rollenMap = {};
        if(rollenResp.data) rollenResp.data.forEach(function(r){ rollenMap[r.name] = r.id; });

        // 3. Bestehende Rollen löschen
        await _sb().from('user_rollen').delete().eq('user_id', userId);

        // 4. Neue Rollen zuweisen
        var rollenInserts = selected.map(function(roleName){
            return { user_id: userId, rolle_id: rollenMap[roleName] };
        }).filter(function(ri){ return ri.rolle_id; });

        if(rollenInserts.length > 0) {
            var insResp = await _sb().from('user_rollen').insert(rollenInserts);
            if(insResp.error) throw insResp.error;
        }

        closeApproveModal();
        var rollenLabels = {'hq':'HQ','hq_gf':'GF','hq_sales':'Sales','hq_marketing':'Marketing','hq_einkauf':'Einkauf','hq_support':'Support','hq_akademie':'Akademie','hq_hr':'HR','hq_it':'IT','hq_zahlen':'Zahlen','inhaber':'Geschäftsleitung','verkauf':'Verkauf','werkstatt':'Werkstatt','buchhaltung':'Buchhaltung'};
        window.logAudit && window.logAudit('user_freigeschaltet', 'user-management', { user_id: userId, rollen: selected, is_hq: isHqUser });
        _showToast('User freigeschaltet! Rollen: ' + selected.map(function(r){return rollenLabels[r]||r;}).join(', '), 'success');
        window.renderKzMitarbeiter();
    } catch(err) {
        if(errEl) { errEl.textContent = 'Fehler: ' + err.message; errEl.style.display = 'block'; }
        if(btn) { btn.disabled = false; btn.textContent = '\u2705 Freigeben'; }
    }
}

export async function rejectUser(userId) {
    if(!confirm(_t('confirm_reject_user'))) return;
    try {
        await _sb().from('users').update({status: 'gesperrt'}).eq('id', userId);
        _sb().from('users').select('name,email').eq('id',userId).single().then(function(r){
            window.logAudit && window.logAudit('user_gesperrt', 'user-management', { user_id: userId, name: r.data ? r.data.name : '', email: r.data ? r.data.email : '' });
        });
        closeApproveModal();
        _showToast('User abgelehnt und gesperrt.', 'info');
        window.renderKzMitarbeiter();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

// Strangler Fig
const _exports = { approveUser, switchApproveEbene, closeApproveModal, confirmApprove, rejectUser };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
