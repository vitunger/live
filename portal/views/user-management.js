/**
 * views/user-management.js - User-Verwaltung, Freigabe, Rollen, Mitarbeiter, HQ-Einstellungen, Neuer Standort
 * @module views/user-management
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// === USER FREIGABE (mit Ebene-Logik) ===
var approveEbene = 'standort';

// Standort-Rechte: Welche Rollen dürfen welche Module sehen
var rolePermissions = window.rolePermissions || {
    'home':           ['alle'],
    'kalender':       ['alle'],
    'todo':           ['alle'],
    'kommunikation':  ['alle'],
    'dashboards':     ['inhaber'],
    'allgemein':      ['inhaber','buchhaltung'],
    'verkauf':        ['inhaber','verkauf','buchhaltung'],
    'einkauf':        ['inhaber','werkstatt','buchhaltung'],
    'marketing':      ['inhaber','verkauf'],
    'controlling':    ['inhaber','buchhaltung'],
    'wissen':         ['alle'],
    'support':        ['alle'],
    'aktenschrank':   ['inhaber','buchhaltung'],
    'ideenboard':     ['alle'],
    'shop':           ['inhaber'],
    'onboarding':     ['inhaber'],
    'mitarbeiter':    ['inhaber']
};
window.rolePermissions = rolePermissions;

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
        {key:'hq_it',label:'🖥️ IT / Systemadmin',color:'border-gray-400 bg-gray-100'}
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
                    sel.innerHTML += '<option value="'+s.id+'"'+selected+'>'+s.name+'</option>';
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
        var rollenLabels = {'hq':'HQ','hq_gf':'GF','hq_sales':'Sales','hq_marketing':'Marketing','hq_einkauf':'Einkauf','hq_support':'Support','hq_akademie':'Akademie','hq_hr':'HR','hq_it':'IT','inhaber':'Geschäftsleitung','verkauf':'Verkauf','werkstatt':'Werkstatt','buchhaltung':'Buchhaltung'};
        alert('\u2705 User freigeschaltet!\nRollen: ' + selected.map(function(r){return rollenLabels[r]||r;}).join(', ') + '\n\nDer Mitarbeiter kann sich jetzt einloggen.');
        renderKzMitarbeiter();
    } catch(err) {
        if(errEl) { errEl.textContent = 'Fehler: ' + err.message; errEl.style.display = 'block'; }
        if(btn) { btn.disabled = false; btn.textContent = '\u2705 Freigeben'; }
    }
}

export async function rejectUser(userId) {
    if(!confirm(_t('confirm_reject_user'))) return;
    try {
        await _sb().from('users').update({status: 'gesperrt'}).eq('id', userId);
        closeApproveModal();
        alert('User abgelehnt und gesperrt.');
        renderKzMitarbeiter();
    } catch(err) { alert('Fehler: ' + err.message); }
}

// === ROLLEN-MODAL ===
export function openRollenModal(maIdx) {
    var m = kzMitarbeiter[maIdx];
    if(!m) return;
    var allRollen = ['hq','inhaber','verkauf','werkstatt','buchhaltung'];
    var labels = {'hq':'HQ','inhaber':'Geschäftsleitung','verkauf':'Verkauf','werkstatt':'Werkstatt','buchhaltung':'Buchhaltung'};
    var desc = {'inhaber':'Vollzugriff auf alle Module, Dashboards, Shop, Onboarding','verkauf':'Verkauf, Marketing, Wissen, Support, Ideenboard','werkstatt':'Einkauf, Wissen, Support, Ideenboard','buchhaltung':'Allgemein, Verkauf, Einkauf, Controlling, Aktenschrank'};

    var html = '<div id="rollenModalOverlay" onclick="closeRollenModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
    html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:24px;width:420px;max-width:90vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
    html += '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold text-gray-800">Rollen bearbeiten</h3><button onclick="closeRollenModal()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>';
    html += '<div class="flex items-center space-x-3 mb-5 pb-4 border-b"><img src="https://ui-avatars.com/api/?name='+encodeURIComponent(m.name)+'&background=EF7D00&color=fff&size=40" class="w-10 h-10 rounded-full"><div><p class="font-semibold text-gray-800">'+m.name+'</p><p class="text-xs text-gray-500">'+m.standort+' · '+m.email+'</p></div></div>';
    html += '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rollen zuweisen (Mehrfachauswahl)</p>';
    allRollen.forEach(function(r){
        var checked = m.rollen.indexOf(r)>=0 ? 'checked' : '';
        var colors = {'hq':'border-red-300 bg-red-50','inhaber':'border-orange-300 bg-orange-50','verkauf':'border-blue-300 bg-blue-50','werkstatt':'border-gray-300 bg-gray-50','buchhaltung':'border-purple-300 bg-purple-50'};
        html += '<label class="flex items-start space-x-3 p-3 rounded-lg border '+colors[r]+' mb-2 cursor-pointer hover:shadow-sm transition">';
        html += '<input type="checkbox" id="roleChk_'+r+'" '+checked+' class="mt-1 rounded" style="accent-color:#EF7D00;">';
        html += '<div><p class="font-semibold text-sm text-gray-800">'+labels[r]+'</p><p class="text-[11px] text-gray-500">'+desc[r]+'</p></div>';
        html += '</label>';
    });
    html += '<div class="flex space-x-3 mt-5"><button onclick="saveRollen('+maIdx+')" class="flex-1 py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">Speichern</button>';
    html += '<button onclick="closeRollenModal()" class="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Abbrechen</button></div>';
    html += '</div></div>';

    var container = document.createElement('div');
    container.id = 'rollenModalContainer';
    container.innerHTML = html;
    document.body.appendChild(container);
}
export function closeRollenModal() {
    var c = document.getElementById('rollenModalContainer');
    if(c) c.remove();
}
export function saveRollen(maIdx) {
    var allRollen = ['hq','inhaber','verkauf','werkstatt','buchhaltung'];
    var selected = [];
    allRollen.forEach(function(r){
        var chk = document.getElementById('roleChk_'+r);
        if(chk && chk.checked) selected.push(r);
    });
    if(selected.length===0) { alert('Mindestens eine Rolle muss zugewiesen werden.'); return; }
    kzMitarbeiter[maIdx].rollen = selected;
    closeRollenModal();
    renderKzMitarbeiter();

    var labels = {'hq':'HQ','inhaber':'Geschäftsleitung','verkauf':'Verkauf','werkstatt':'Werkstatt','buchhaltung':'Buchhaltung'};
    var names = selected.map(function(r){return labels[r];}).join(', ');
    alert('✅ Rollen für '+kzMitarbeiter[maIdx].name+' gespeichert:\n'+names);
}

// === PARTNER MITARBEITER-VERWALTUNG (GF-Ebene) ===
var currentPartnerMaFilter = 'all';

export function getStandortName() {
    if(currentLocation && locations[currentLocation]) return locations[currentLocation].name;
    var useDemo = isDemoMode || (_sbProfile() && (_sbProfile().status === 'demo' || _sbProfile().status === 'demo_active'));
    if(useDemo) return 'Muster-Filiale';
    return _sbProfile() && _sbProfile().standort_name ? _sbProfile().standort_name : 'Mein Standort';
}

export function getPartnerMitarbeiter() {
    var sName = getStandortName();
    return kzMitarbeiter.filter(function(m){ return m.standort === sName; });
}

export function filterPartnerMa(f) {
    currentPartnerMaFilter = f;
    document.querySelectorAll('.p-ma-filter').forEach(function(b){
        b.className='p-ma-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';
    });
    var btn=document.querySelector('.p-ma-filter[data-pmf="'+f+'"]');
    if(btn) btn.className='p-ma-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderPartnerMitarbeiter();
}

// ============== EMPLOYEE + TOOLS SYSTEM ==============
var _empCache = [];
var _empToolsCache = [];
var _toolProductsCache = [];

export function showMaTab(tab) {
    ['liste','tools','kosten'].forEach(function(t){
        var el=document.getElementById('maTab'+t.charAt(0).toUpperCase()+t.slice(1));
        if(el) el.style.display=(t===tab)?'':'none';
    });
    document.querySelectorAll('.ma-tab-btn').forEach(function(b){
        var isActive = b.getAttribute('data-matab')===tab;
        b.className='ma-tab-btn py-3 px-4 text-sm font-semibold border-b-2 '+(isActive?'border-vit-orange text-vit-orange':'border-transparent text-gray-500 hover:text-gray-700');
    });
    if(tab==='tools') renderMaToolsMatrix();
    if(tab==='kosten') renderMaKosten();
}

export async function renderPartnerMitarbeiter() {
    var container=document.getElementById('maCardList');
    if(!container) return;
    try {
        var stdId = (sbStandort&&sbStandort.id) ? sbStandort.id : null;
        var isHQ = currentRoles.indexOf('hq')>=0||(_sbProfile() &&_sbProfile().is_hq);
        var empQ = _sb().from('employees').select('*, employee_tools(*, product:billing_products(name, key, default_amount))').order('nachname');
        if(stdId && !isHQ) empQ = empQ.eq('standort_id', stdId);
        var empResp = await empQ;
        if(empResp.error) throw empResp.error;
        var emps = empResp.data || [];
        _empCache = emps;
        var prodResp = await _sb().from('billing_products').select('*').eq('is_per_employee',true).eq('active',true).order('name');
        _toolProductsCache = (prodResp.data||[]);
        var filter = currentPartnerMaFilter || 'all';
        var list = emps.filter(function(e){ if(filter!=='all' && e.status!==filter) return false; return true; });
        var el;
        el=document.getElementById('pMaGesamt'); if(el) el.textContent=emps.length;
        el=document.getElementById('pMaAktiv'); if(el) el.textContent=emps.filter(function(e){return e.status==='aktiv';}).length;
        var totalTools=0, totalCost=0;
        emps.forEach(function(e){ (e.employee_tools||[]).forEach(function(t){ if(t.is_active){totalTools++;totalCost+=Number(t.custom_price||(t.product?t.product.default_amount:0))||0;} }); });
        el=document.getElementById('pMaTools'); if(el) el.textContent=totalTools;
        el=document.getElementById('pMaMonatl'); if(el) el.textContent=totalCost.toLocaleString('de-DE')+' \u20ac';
        var h='';
        list.forEach(function(e){
            var tools=(e.employee_tools||[]).filter(function(t){return t.is_active;});
            var toolBadges=tools.map(function(t){ var name=t.product?t.product.name.replace(/ pro Nutzer/g,''):t.product_key; var isCan=!!t.cancellation_requested_at; return '<span class="inline-block text-[10px] px-1.5 py-0.5 rounded '+(isCan?'bg-yellow-100 text-yellow-700':'bg-blue-100 text-blue-700')+' mr-1 mb-1">'+(isCan?'\u23f3 ':'')+name+'</span>'; }).join('');
            var cost=tools.reduce(function(s,t){return s+(Number(t.custom_price||(t.product?t.product.default_amount:0))||0);},0);
            var statusColors={aktiv:'bg-green-100 text-green-700',inaktiv:'bg-gray-100 text-gray-500','gek\u00fcndigt':'bg-red-100 text-red-700',ausgeschieden:'bg-gray-200 text-gray-500'};
            var stClass=statusColors[e.status]||'bg-gray-100 text-gray-500';
            var eintritt=e.anstelldatum?new Date(e.anstelldatum).toLocaleDateString('de-DE',{month:'2-digit',year:'numeric'}):'-';
            h+='<div class="vit-card p-4 hover:shadow-md transition">';
            h+='<div class="flex items-start justify-between">';
            h+='<div class="flex items-center space-x-3">';
            h+='<img src="https://ui-avatars.com/api/?name='+encodeURIComponent(e.vorname+' '+e.nachname)+'&background=EF7D00&color=fff&size=40" class="w-10 h-10 rounded-full">';
            h+='<div><div class="font-semibold text-gray-800">'+e.vorname+' '+e.nachname+'</div>';
            h+='<div class="text-xs text-gray-500">'+(e.position||'-')+' \u00b7 '+(e.abteilung||'-')+' \u00b7 seit '+eintritt+'</div>';
            if(e.email) h+='<div class="text-xs text-gray-400">'+e.email+'</div>';
            h+='</div></div>';
            h+='<div class="flex items-center space-x-2">';
            h+='<span class="text-[10px] px-2 py-0.5 rounded-full font-semibold '+stClass+'">'+e.status+'</span>';
            h+='<button onclick="openEmployeeToolsModal(\''+e.id+'\')" class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-semibold" title="Tools bearbeiten">\ud83d\udd27 Tools</button>';
            h+='<button onclick="openEditEmployeeModal(\''+e.id+'\')" class="text-xs text-vit-orange hover:underline font-semibold">\u270f\ufe0f</button>';
            h+='</div></div>';
            if(tools.length>0){
                h+='<div class="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">';
                h+='<div class="flex flex-wrap">'+toolBadges+'</div>';
                h+='<span class="text-xs font-bold text-gray-600 whitespace-nowrap ml-2">'+cost.toLocaleString('de-DE')+' \u20ac/M</span>';
                h+='</div>';
            }
            h+='</div>';
        });
        if(list.length===0) h='<div class="vit-card p-8 text-center text-gray-400">Keine Mitarbeiter gefunden.</div>';
        container.innerHTML=h;
    } catch(err) { console.error('MA:', err); container.innerHTML='<div class="text-red-400 p-4">Fehler: '+err.message+'</div>'; }
}

// ---- Tool Assignment Modal ----
export async function openEmployeeToolsModal(empId) {
    var emp = _empCache.find(function(e){return e.id===empId;});
    if(!emp) return;
    var tools = emp.employee_tools || [];
    var html = '<div id="empToolsOverlay" onclick="closeEmpToolsModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
    html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:24px;width:520px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
    html += '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold text-gray-800">\ud83d\udd27 Tools f\u00fcr '+emp.vorname+' '+emp.nachname+'</h3><button onclick="closeEmpToolsModal()" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>';
    html += '<p class="text-xs text-gray-500 mb-4">'+(emp.position||'')+' \u00b7 '+(emp.abteilung||'')+'</p>';
    _toolProductsCache.forEach(function(prod){
        var existing = tools.find(function(t){return t.product_key===prod.key;});
        var isActive = existing && existing.is_active;
        var isCancelled = existing && existing.cancellation_requested_at;
        var price = (existing && existing.custom_price) ? existing.custom_price : prod.default_amount;
        html += '<div class="flex items-center justify-between p-3 rounded-lg border mb-2 '+(isActive?(isCancelled?'border-yellow-300 bg-yellow-50':'border-green-300 bg-green-50'):'border-gray-200 bg-white')+'">';
        html += '<div class="flex items-center space-x-3">';
        html += '<label class="relative inline-flex items-center cursor-pointer">';
        html += '<input type="checkbox" class="sr-only peer empToolCheck" data-key="'+prod.key+'" data-empid="'+empId+'"'+(isActive?' checked':'')+(isCancelled?' disabled':'')+'>';
        html += '<div class="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-vit-orange"></div>';
        html += '</label>';
        html += '<div><div class="text-sm font-semibold text-gray-800">'+prod.name+'</div>';
        if(isCancelled){ var effDate=new Date(existing.cancellation_effective_at).toLocaleDateString('de-DE'); html+='<div class="text-[10px] text-yellow-600">\u23f3 Gek\u00fcndigt zum '+effDate+'</div>'; }
        html += '</div></div>';
        html += '<div class="text-right"><span class="text-sm font-bold text-gray-700">'+Number(price).toLocaleString('de-DE')+' \u20ac</span><span class="text-[10px] text-gray-400">/Monat</span>';
        if(prod.default_cancellation_days > 0) html += '<br><span class="text-[10px] text-gray-400">'+prod.default_cancellation_days+' Tage Frist</span>';
        html += '</div></div>';
    });
    html += '<div id="empToolsError" style="display:none" class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mt-3"></div>';
    html += '<div class="flex space-x-3 mt-4"><button onclick="saveEmployeeTools(\''+empId+'\')" id="saveEmpToolsBtn" class="flex-1 py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">\u2714 Speichern</button>';
    html += '<button onclick="closeEmpToolsModal()" class="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Abbrechen</button></div>';
    html += '</div></div>';
    var c = document.createElement('div'); c.id='empToolsContainer'; c.innerHTML=html; document.body.appendChild(c);
}
export function closeEmpToolsModal() { var c=document.getElementById('empToolsContainer'); if(c) c.remove(); }

export async function saveEmployeeTools(empId) {
    var btn=document.getElementById('saveEmpToolsBtn');
    var errEl=document.getElementById('empToolsError');
    if(btn){btn.disabled=true;btn.textContent='Speichern...';}
    if(errEl) errEl.style.display='none';
    try {
        var checks=document.querySelectorAll('.empToolCheck');
        for(var i=0;i<checks.length;i++){
            var chk=checks[i]; var key=chk.getAttribute('data-key'); var shouldBeActive=chk.checked;
            if(chk.disabled) continue;
            var emp=_empCache.find(function(e){return e.id===empId;});
            var existing=(emp&&emp.employee_tools||[]).find(function(t){return t.product_key===key;});
            var prod=_toolProductsCache.find(function(p){return p.key===key;});
            var cancDays=(prod&&prod.default_cancellation_days)||0;
            if(shouldBeActive && !existing){
                await _sb().from('employee_tools').insert({employee_id:empId,product_key:key,is_active:true,activated_at:new Date().toISOString().slice(0,10),cancellation_period_days:cancDays});
            } else if(shouldBeActive && existing && !existing.is_active){
                await _sb().from('employee_tools').update({is_active:true,activated_at:new Date().toISOString().slice(0,10),deactivated_at:null,cancellation_requested_at:null,cancellation_effective_at:null,updated_at:new Date().toISOString()}).eq('id',existing.id);
            } else if(!shouldBeActive && existing && existing.is_active){
                if(cancDays > 0){
                    var effDate=new Date(); effDate.setDate(effDate.getDate()+cancDays);
                    await _sb().from('employee_tools').update({cancellation_requested_at:new Date().toISOString().slice(0,10),cancellation_effective_at:effDate.toISOString().slice(0,10),cancelled_by:_sbProfile() ?_sbProfile().id:null,updated_at:new Date().toISOString()}).eq('id',existing.id);
                } else {
                    await _sb().from('employee_tools').update({is_active:false,deactivated_at:new Date().toISOString().slice(0,10),updated_at:new Date().toISOString()}).eq('id',existing.id);
                }
            }
        }
        closeEmpToolsModal();
        renderPartnerMitarbeiter();
    } catch(err){ if(errEl){errEl.textContent='Fehler: '+err.message;errEl.style.display='block';} if(btn){btn.disabled=false;btn.textContent='\u2714 Speichern';} }
}

// ---- Edit Employee Modal ----
export async function openEditEmployeeModal(empId) {
    var emp=_empCache.find(function(e){return e.id===empId;});
    if(!emp) return;
    var html='<div id="editEmpOverlay" onclick="closeEditEmpModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
    html+='<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:24px;width:460px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
    html+='<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold text-gray-800">\u270f\ufe0f Mitarbeiter bearbeiten</h3><button onclick="closeEditEmpModal()" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>';
    html+='<div class="space-y-3">';
    html+='<div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-semibold text-gray-600 mb-1">Vorname</label><input id="editEmpVorname" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value="'+emp.vorname+'"></div>';
    html+='<div><label class="block text-xs font-semibold text-gray-600 mb-1">Nachname</label><input id="editEmpNachname" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value="'+emp.nachname+'"></div></div>';
    html+='<div><label class="block text-xs font-semibold text-gray-600 mb-1">E-Mail</label><input id="editEmpEmail" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value="'+(emp.email||'')+'"></div>';
    html+='<div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-semibold text-gray-600 mb-1">Position</label><input id="editEmpPosition" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value="'+(emp.position||'')+'"></div>';
    html+='<div><label class="block text-xs font-semibold text-gray-600 mb-1">Abteilung</label><select id="editEmpAbt" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="Verkauf"'+(emp.abteilung==='Verkauf'?' selected':'')+'>Verkauf</option><option value="Werkstatt"'+(emp.abteilung==='Werkstatt'?' selected':'')+'>Werkstatt</option><option value="Verwaltung"'+(emp.abteilung==='Verwaltung'?' selected':'')+'>Verwaltung</option><option value="Sonstiges"'+(emp.abteilung==='Sonstiges'?' selected':'')+'>Sonstiges</option></select></div></div>';
    html+='<div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-semibold text-gray-600 mb-1">Status</label><select id="editEmpStatus" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="aktiv"'+(emp.status==='aktiv'?' selected':'')+'>Aktiv</option><option value="inaktiv"'+(emp.status==='inaktiv'?' selected':'')+'>Inaktiv</option><option value="gek\u00fcndigt"'+(emp.status==='gek\u00fcndigt'?' selected':'')+'>Gek\u00fcndigt</option><option value="ausgeschieden"'+(emp.status==='ausgeschieden'?' selected':'')+'>Ausgeschieden</option></select></div>';
    html+='<div><label class="block text-xs font-semibold text-gray-600 mb-1">Anstelldatum</label><input id="editEmpStart" type="date" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value="'+(emp.anstelldatum||'')+'"></div></div>';
    html+='<div><label class="block text-xs font-semibold text-gray-600 mb-1">Austrittsdatum</label><input id="editEmpEnd" type="date" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value="'+(emp.austrittsdatum||'')+'"></div>';
    html+='</div>';
    html+='<div class="flex space-x-3 mt-4"><button onclick="saveEditEmployee(\''+empId+'\')" id="saveEditEmpBtn" class="flex-1 py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">Speichern</button>';
    html+='<button onclick="closeEditEmpModal()" class="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Abbrechen</button></div>';
    html+='</div></div>';
    var c=document.createElement('div');c.id='editEmpContainer';c.innerHTML=html;document.body.appendChild(c);
}
export function closeEditEmpModal(){var c=document.getElementById('editEmpContainer');if(c)c.remove();}
export async function saveEditEmployee(empId){
    var btn=document.getElementById('saveEditEmpBtn');
    if(btn){btn.disabled=true;btn.textContent='Speichern...';}
    try{
        await _sb().from('employees').update({vorname:document.getElementById('editEmpVorname').value.trim(),nachname:document.getElementById('editEmpNachname').value.trim(),email:document.getElementById('editEmpEmail').value.trim()||null,position:document.getElementById('editEmpPosition').value.trim()||null,abteilung:document.getElementById('editEmpAbt').value,status:document.getElementById('editEmpStatus').value,anstelldatum:document.getElementById('editEmpStart').value||null,austrittsdatum:document.getElementById('editEmpEnd').value||null,updated_at:new Date().toISOString()}).eq('id',empId);
        closeEditEmpModal(); renderPartnerMitarbeiter();
    }catch(err){alert('Fehler: '+err.message);if(btn){btn.disabled=false;btn.textContent='Speichern';}}
}

// ---- Tools Matrix (Tab 2) ----
export function renderMaToolsMatrix(){
    var el=document.getElementById('maToolsMatrix'); if(!el)return;
    var emps=_empCache.filter(function(e){return e.status==='aktiv';}); var prods=_toolProductsCache;
    if(emps.length===0||prods.length===0){el.innerHTML='<p class="p-4 text-gray-400 text-center">Keine Daten.</p>';return;}
    var h='<table class="w-full text-xs"><thead><tr class="bg-gray-50"><th class="px-3 py-2 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10">Mitarbeiter</th>';
    prods.forEach(function(p){h+='<th class="px-2 py-2 text-center font-semibold text-gray-600 whitespace-nowrap" style="writing-mode:vertical-lr;transform:rotate(180deg);max-width:30px;">'+p.name.replace(/ pro Nutzer/g,'')+'</th>';});
    h+='<th class="px-3 py-2 text-right font-semibold text-gray-600">Summe</th></tr></thead><tbody>';
    var colTotals=prods.map(function(){return 0;});
    emps.forEach(function(e){
        var tools=e.employee_tools||[]; var rowSum=0;
        h+='<tr class="border-t border-gray-100 hover:bg-gray-50"><td class="px-3 py-2 font-semibold text-gray-800 sticky left-0 bg-white z-10 whitespace-nowrap">'+e.vorname+' '+e.nachname+'</td>';
        prods.forEach(function(p,idx){
            var t=tools.find(function(t){return t.product_key===p.key;}); var isActive=t&&t.is_active; var isCan=t&&t.cancellation_requested_at;
            var price=Number(isActive?(t.custom_price||p.default_amount):0);
            if(isActive){rowSum+=price;colTotals[idx]+=price;}
            h+='<td class="px-2 py-2 text-center">';
            if(isActive&&!isCan)h+='<span class="text-green-600">\u2705</span>'; else if(isCan)h+='<span class="text-yellow-500">\u23f3</span>'; else h+='<span class="text-gray-300">\u2796</span>';
            h+='</td>';
        });
        h+='<td class="px-3 py-2 text-right font-bold text-gray-700">'+rowSum.toLocaleString('de-DE')+' \u20ac</td></tr>';
    });
    h+='<tr class="border-t-2 border-gray-300 bg-gray-50 font-bold"><td class="px-3 py-2 sticky left-0 bg-gray-50 z-10">Gesamt</td>';
    var grandTotal=0; colTotals.forEach(function(ct){h+='<td class="px-2 py-2 text-center text-gray-600">'+ct.toLocaleString('de-DE')+'</td>';grandTotal+=ct;});
    h+='<td class="px-3 py-2 text-right text-vit-orange">'+grandTotal.toLocaleString('de-DE')+' \u20ac</td></tr>';
    h+='</tbody></table>';
    el.innerHTML=h;
}

// ---- Kostenübersicht (Tab 3) ----
export async function renderMaKosten(){
    var el=document.getElementById('maKostenContent'); if(!el)return;
    el.innerHTML='<div class="text-center py-8 text-gray-400">Lade Kosten\u00fcbersicht...</div>';
    try{
        var stdId=(sbStandort&&sbStandort.id)?sbStandort.id:null;
        if(!stdId){el.innerHTML='<div class="text-center py-8 text-gray-400">Standort-Kontext ben\u00f6tigt.</div>';return;}
        var resp=await sb.rpc('calculate_monthly_billing',{p_standort_id:stdId});
        if(resp.error) throw resp.error;
        var rows=resp.data||[];
        var standortRows=rows.filter(function(r){return r.source==='standort';});
        var empRows=rows.filter(function(r){return r.source==='employee';});
        var standortSum=standortRows.reduce(function(s,r){return s+Number(r.line_total);},0);
        var empSum=empRows.reduce(function(s,r){return s+Number(r.line_total);},0);
        var h='<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">';
        h+='<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-gray-800">'+(standortSum+empSum).toLocaleString('de-DE')+' \u20ac</div><div class="text-xs text-gray-500">Gesamt monatlich (netto)</div></div>';
        h+='<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-blue-600">'+standortSum.toLocaleString('de-DE')+' \u20ac</div><div class="text-xs text-gray-500">Standort-Services</div></div>';
        h+='<div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-purple-600">'+empSum.toLocaleString('de-DE')+' \u20ac</div><div class="text-xs text-gray-500">Mitarbeiter-Tools</div></div>';
        h+='</div>';
        if(standortRows.length>0){
            h+='<div class="vit-card mb-4"><div class="px-4 py-3 bg-blue-50 border-b"><h3 class="font-semibold text-blue-800">\ud83c\udfe2 Standort-Services</h3></div><table class="w-full text-sm"><tbody>';
            standortRows.forEach(function(r){h+='<tr class="border-t border-gray-100"><td class="px-4 py-2 text-gray-700">'+r.product_name+'</td><td class="px-4 py-2 text-center text-gray-500">'+r.quantity+'x</td><td class="px-4 py-2 text-right font-semibold">'+Number(r.line_total).toLocaleString('de-DE')+' \u20ac</td></tr>';});
            h+='<tr class="border-t-2 border-blue-200 bg-blue-50"><td class="px-4 py-2 font-bold text-blue-800" colspan="2">Summe Standort</td><td class="px-4 py-2 text-right font-bold text-blue-800">'+standortSum.toLocaleString('de-DE')+' \u20ac</td></tr>';
            h+='</tbody></table></div>';
        }
        if(empRows.length>0){
            h+='<div class="vit-card"><div class="px-4 py-3 bg-purple-50 border-b"><h3 class="font-semibold text-purple-800">\ud83d\udc65 Mitarbeiter-Tools (aggregiert)</h3></div><table class="w-full text-sm"><tbody>';
            empRows.forEach(function(r){h+='<tr class="border-t border-gray-100"><td class="px-4 py-2"><div class="text-gray-700">'+r.product_name+'</div><div class="text-[10px] text-gray-400">'+(r.detail||'')+'</div></td><td class="px-4 py-2 text-center text-gray-500">'+r.quantity+'x</td><td class="px-4 py-2 text-right font-semibold">'+Number(r.line_total).toLocaleString('de-DE')+' \u20ac</td></tr>';});
            h+='<tr class="border-t-2 border-purple-200 bg-purple-50"><td class="px-4 py-2 font-bold text-purple-800" colspan="2">Summe Mitarbeiter</td><td class="px-4 py-2 text-right font-bold text-purple-800">'+empSum.toLocaleString('de-DE')+' \u20ac</td></tr>';
            h+='</tbody></table></div>';
        }
        el.innerHTML=h;
    }catch(err){el.innerHTML='<div class="text-red-400 p-4">Fehler: '+err.message+'</div>';}
}

export function deactivateMa(idx) {
    // Deprecated - use openEditEmployeeModal instead
}

// Neuer Mitarbeiter Modal
var newMaEbene = 'standort'; // tracks current ebene selection in create modal

export function openNeuerMaModal() {
    var isHQ = currentRoles.indexOf('hq') >= 0 || (_sbProfile() && _sbProfile().is_hq);
    if(isHQ && !hqCan('create_user')) { _showToast('Keine Berechtigung zum Anlegen von Mitarbeitern', 'error'); return; }
    newMaEbene = 'standort';

    var html = '<div id="neuerMaOverlay" onclick="closeNeuerMaModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
    html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:24px;width:460px;max-width:90vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
    html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-bold text-gray-800">Neuen Mitarbeiter anlegen</h3><button onclick="closeNeuerMaModal()" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>';
    
    // Name fields
    html += '<div class="space-y-3 mb-4">';
    html += '<div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-semibold text-gray-600 mb-1">Vorname *</label><input id="newMaVorname" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="Max" oninput="updateNewMaEmail()"></div>';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Nachname *</label><input id="newMaNachname" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="Mustermann" oninput="updateNewMaEmail()"></div></div>';

    // E-Mail Typ Auswahl
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">E-Mail-Typ</label>';
    html += '<div class="flex space-x-2 mb-2">';
    html += '<button type="button" id="newMaEmailTypeVit" onclick="switchNewMaEmailType(\'vitbikes\')" class="flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition border-vit-orange bg-orange-50 text-orange-700">🏢 vit:bikes E-Mail</button>';
    html += '<button type="button" id="newMaEmailTypeOwn" onclick="switchNewMaEmailType(\'eigen\')" class="flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition border-gray-200 bg-white text-gray-500 hover:border-gray-300">📧 Eigene E-Mail</button>';
    html += '</div>';
    html += '<input id="newMaEmail" type="email" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="vorname.nachname@vitbikes.de"></div>';
    html += '<input type="hidden" id="newMaEmailType" value="vitbikes">';

    // === Info: Mitarbeiter setzt Passwort selbst via E-Mail ===
    html += '<div class="bg-blue-50 border border-blue-200 rounded-lg p-3">';
    html += '<p class="text-xs text-blue-700"><strong>✉️ So funktioniert es:</strong> Der Mitarbeiter erhält eine Willkommens-E-Mail mit einem Link, über den er sein eigenes Passwort setzen kann.</p>';
    html += '</div>';
    html += '<input type="hidden" id="newMaMode" value="invite">';

    // === EBENE (HQ vs Standort) – nur für HQ-Admins sichtbar ===
    if(isHQ) {
        html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Ebene</label>';
        html += '<div class="flex space-x-2">';
        html += '<button type="button" id="newMaEbeneHQ" onclick="switchNewMaEbene(\'hq\')" class="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-gray-200 bg-white text-gray-500 hover:border-gray-300">\ud83c\udfe2 HQ</button>';
        html += '<button type="button" id="newMaEbeneStd" onclick="switchNewMaEbene(\'standort\')" class="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-vit-orange bg-orange-50 text-orange-700">\ud83c\udfea Standort</button>';
        html += '</div></div>';
    }

    // Standort Dropdown (visible when Ebene = Standort)
    if(isHQ) {
        html += '<div id="newMaStandortWrap"><label class="block text-xs font-semibold text-gray-600 mb-1">Standort *</label><select id="newMaStandort" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="">Wird geladen...</option></select></div>';
    } else {
        // GF: Standort ist fix der eigene
        var stdName = sbStandort ? sbStandort.name : 'Dein Standort';
        var stdId = sbStandort ? sbStandort.id : '';
        html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Standort</label><input type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500" value="'+stdName+'" disabled><input type="hidden" id="newMaStandort" value="'+stdId+'"></div>';
    }
    html += '</div>';

    // === ROLLEN (dynamisch basierend auf Ebene) ===
    html += '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rollen zuweisen</p>';

    // HQ Rollen (initial hidden)
    html += '<div id="newMaRollesHQ" style="display:none">';
    var hqRollen = [
        {key:'hq_gf',     label:'Geschäftsführung', color:'border-red-300 bg-red-50', icon:'👑', desc:'Vollzugriff auf alle HQ-Module'},
        {key:'hq_sales',  label:'Sales',            color:'border-blue-300 bg-blue-50', icon:'📊', desc:'Standorte, Pipeline, Leads'},
        {key:'hq_marketing',label:'Marketing',      color:'border-pink-300 bg-pink-50', icon:'📣', desc:'Kampagnen, Budget, Social Media'},
        {key:'hq_einkauf',label:'Einkauf',          color:'border-green-300 bg-green-50', icon:'🛒', desc:'Lieferanten, Bestellungen'},
        {key:'hq_support',label:'Support',          color:'border-yellow-300 bg-yellow-50', icon:'🎧', desc:'Tickets, Partner-Support'},
        {key:'hq_akademie',label:'Akademie',        color:'border-indigo-300 bg-indigo-50', icon:'🎓', desc:'Wissen, Schulungen, Onboarding'},
        {key:'hq_hr',     label:'HR',               color:'border-purple-300 bg-purple-50', icon:'👥', desc:'Personal, Tools, Abrechnung'},
        {key:'hq_it',     label:'IT / Systemadmin', color:'border-gray-400 bg-gray-100', icon:'🖥️', desc:'Einstellungen, Features, System'}
    ];
    hqRollen.forEach(function(r){
        html += '<label class="flex items-center space-x-3 p-2 rounded-lg border '+r.color+' mb-1.5 cursor-pointer hover:shadow-sm transition">';
        html += '<input type="checkbox" id="newMaRole_'+r.key+'" class="rounded hqRoleCheck" style="accent-color:#EF7D00;"'+' data-role="'+r.key+'">';
        html += '<div><span class="text-sm font-semibold text-gray-800">'+r.icon+' '+r.label+'</span>';
        html += '<p class="text-[10px] text-gray-400">'+r.desc+'</p></div></label>';
    });
    html += '<p class="text-[10px] text-gray-400 ml-1 mb-2">💡 GF hat automatisch Vollzugriff. Andere Rollen sehen nur freigegebene Module.</p>';
    html += '</div>';

    // Standort Rollen (initial visible)
    html += '<div id="newMaRollesStd">';
    var stdRollen = isHQ ? ['inhaber','verkauf','werkstatt','buchhaltung'] : ['verkauf','werkstatt','buchhaltung'];
    var stdLabels = {'inhaber':'Geschäftsleitung','verkauf':'Verkauf','werkstatt':'Werkstatt','buchhaltung':'Buchhaltung'};
    var stdColors = {'inhaber':'border-orange-300 bg-orange-50','verkauf':'border-blue-300 bg-blue-50','werkstatt':'border-gray-300 bg-gray-50','buchhaltung':'border-purple-300 bg-purple-50'};
    stdRollen.forEach(function(r){
        html += '<label class="flex items-center space-x-3 p-2 rounded-lg border '+stdColors[r]+' mb-1.5 cursor-pointer hover:shadow-sm transition">';
        html += '<input type="checkbox" id="newMaRole_'+r+'" class="rounded" style="accent-color:#EF7D00;">';
        html += '<span class="text-sm font-semibold text-gray-800">'+stdLabels[r]+'</span></label>';
    });
    html += '</div>';

    if(!isHQ) { html += '<p class="text-xs text-blue-600 bg-blue-50 rounded-lg p-2 mt-2">\ud83d\udccd Mitarbeiter wird deinem Standort zugeordnet.</p>'; }
    html += '<div id="newMaError" style="display:none" class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mt-3"></div>';
    html += '<div class="flex space-x-3 mt-4"><button id="newMaSaveBtn" onclick="saveNeuerMa()" class="flex-1 py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">✉️ Einladen</button>';
    html += '<button onclick="closeNeuerMaModal()" class="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Abbrechen</button></div>';
    html += '</div></div>';
    var c = document.createElement('div'); c.id = 'neuerMaContainer'; c.innerHTML = html; document.body.appendChild(c);
    if(isHQ) {
        setTimeout(async function(){
            try {
                var stdResp = await _sb().from('standorte').select('id,name').order('name');
                var sel = document.getElementById('newMaStandort');
                if(sel && stdResp.data) {
                    sel.innerHTML = '<option value="">— Standort wählen —</option>';
                    stdResp.data.forEach(function(s){ sel.innerHTML += '<option value="'+s.id+'">'+s.name+'</option>'; });
                }
            } catch(e){ console.error(e); }
        }, 100);
    }
}

export function switchNewMaEbene(ebene) {
    newMaEbene = ebene;
    var hqBtn = document.getElementById('newMaEbeneHQ');
    var stdBtn = document.getElementById('newMaEbeneStd');
    var stdWrap = document.getElementById('newMaStandortWrap');
    var rollesHQ = document.getElementById('newMaRollesHQ');
    var rollesStd = document.getElementById('newMaRollesStd');
    if(ebene === 'hq') {
        if(hqBtn) hqBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-red-500 bg-red-50 text-red-700';
        if(stdBtn) stdBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-gray-200 bg-white text-gray-500 hover:border-gray-300';
        if(stdWrap) stdWrap.style.display = 'none';
        if(rollesHQ) rollesHQ.style.display = '';
        if(rollesStd) rollesStd.style.display = 'none';
        // Auto-check GF role, uncheck others
        document.querySelectorAll('.hqRoleCheck').forEach(function(chk){
            chk.checked = false;
        });
        // Uncheck standort roles
        ['inhaber','verkauf','werkstatt','buchhaltung'].forEach(function(r){
            var chk = document.getElementById('newMaRole_'+r);
            if(chk) chk.checked = false;
        });
    } else {
        if(stdBtn) stdBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-vit-orange bg-orange-50 text-orange-700';
        if(hqBtn) hqBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-gray-200 bg-white text-gray-500 hover:border-gray-300';
        if(stdWrap) stdWrap.style.display = '';
        if(rollesHQ) rollesHQ.style.display = 'none';
        if(rollesStd) rollesStd.style.display = '';
        // Uncheck HQ roles
        document.querySelectorAll('.hqRoleCheck').forEach(function(chk){ chk.checked = false; });
    }
}

export function closeNeuerMaModal() { var c = document.getElementById('neuerMaContainer'); if(c) c.remove(); }

var newMaEmailTypeValue = 'vitbikes';

export function switchNewMaEmailType(typ) {
    newMaEmailTypeValue = typ;
    var vitBtn = document.getElementById('newMaEmailTypeVit');
    var ownBtn = document.getElementById('newMaEmailTypeOwn');
    var emailInput = document.getElementById('newMaEmail');
    var typeHidden = document.getElementById('newMaEmailType');
    if(typeHidden) typeHidden.value = typ;

    if(typ === 'vitbikes') {
        if(vitBtn) vitBtn.className = 'flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition border-vit-orange bg-orange-50 text-orange-700';
        if(ownBtn) ownBtn.className = 'flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition border-gray-200 bg-white text-gray-500 hover:border-gray-300';
        if(emailInput) { emailInput.readOnly = true; emailInput.style.backgroundColor = '#F9FAFB'; emailInput.style.color = '#6B7280'; }
        updateNewMaEmail();
    } else {
        if(ownBtn) ownBtn.className = 'flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition border-vit-orange bg-orange-50 text-orange-700';
        if(vitBtn) vitBtn.className = 'flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition border-gray-200 bg-white text-gray-500 hover:border-gray-300';
        if(emailInput) { emailInput.readOnly = false; emailInput.style.backgroundColor = '#fff'; emailInput.style.color = '#1a202c'; emailInput.value = ''; emailInput.placeholder = 'eigene@email.de'; emailInput.focus(); }
    }
}

export function updateNewMaEmail() {
    if(newMaEmailTypeValue !== 'vitbikes') return;
    var vorname = (document.getElementById('newMaVorname') || {}).value || '';
    var nachname = (document.getElementById('newMaNachname') || {}).value || '';
    var emailInput = document.getElementById('newMaEmail');
    if(!emailInput) return;
    if(vorname.trim() && nachname.trim()) {
        // Umlaute und Sonderzeichen bereinigen
        var v = vorname.trim().toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9.-]/g,'');
        var n = nachname.trim().toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9.-]/g,'');
        emailInput.value = v + '.' + n + '@vitbikes.de';
    } else {
        emailInput.value = '';
        emailInput.placeholder = 'vorname.nachname@vitbikes.de';
    }
}

export async function saveNeuerMa() {
    var vorname = (document.getElementById('newMaVorname')||{}).value||'';
    var nachname = (document.getElementById('newMaNachname')||{}).value||'';
    var email = (document.getElementById('newMaEmail')||{}).value||'';
    var stdSel = document.getElementById('newMaStandort');
    var standortId = stdSel ? stdSel.value : null;
    var errEl = document.getElementById('newMaError');
    if(errEl) errEl.style.display = 'none';

    if(!vorname.trim() || !nachname.trim() || !email.trim()) { if(errEl){errEl.textContent='Bitte Vorname, Nachname und E-Mail ausfüllen.';errEl.style.display='block';} return; }

    // Rollen basierend auf Ebene sammeln
    var selected = [];
    var isHqUser = (newMaEbene === 'hq');
    if(isHqUser) {
        // Collect all checked HQ role checkboxes
        document.querySelectorAll('.hqRoleCheck:checked').forEach(function(chk){
            selected.push(chk.getAttribute('data-role'));
        });
        // Also always include legacy 'hq' so is_hq flag works
        if(selected.length > 0 && selected.indexOf('hq') === -1) selected.push('hq');
    } else {
        ['inhaber','verkauf','werkstatt','buchhaltung'].forEach(function(r){
            var chk = document.getElementById('newMaRole_'+r);
            if(chk && chk.checked) selected.push(r);
        });
        // Standort-Pflicht prüfen
        if(!standortId) { if(errEl){errEl.textContent='Bitte einen Standort wählen.';errEl.style.display='block';} return; }
    }
    if(selected.length===0) { if(errEl){errEl.textContent='Bitte mindestens eine Rolle zuweisen.';errEl.style.display='block';} return; }

    var btn = document.getElementById('newMaSaveBtn');
    if(btn) { btn.disabled=true; btn.textContent='Wird eingeladen...'; }

    var isHqUser = selected.indexOf('hq') >= 0;

    try {
        // Rollen-IDs aus der DB holen
        var rollenResp = await _sb().from('rollen').select('id, name');
        var rollenMap = {};
        if(rollenResp.data) rollenResp.data.forEach(function(r){ rollenMap[r.name] = r.id; });
        var rollenIds = selected.map(function(r){ return rollenMap[r]; }).filter(Boolean);

        // Edge Function aufrufen
        var session = await _sb().auth.getSession();
        if(!session.data.session) throw { message: 'Nicht eingeloggt' };

        var response = await fetch((window.SUPABASE_URL || 'https://lwwagbkxeofahhwebkab.supabase.co') + '/functions/v1/create-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.data.session.access_token,
                'apikey': (window.SUPABASE_ANON_KEY || '')
            },
            body: JSON.stringify({
                email: email.trim().toLowerCase(),
                vorname: vorname.trim(),
                nachname: nachname.trim(),
                is_hq: isHqUser,
                standort_id: isHqUser ? null : (standortId || null),
                rollen: rollenIds,
                status: 'aktiv',
                mode: 'invite',
                portalUrl: window.location.origin + window.location.pathname
            })
        });

        var result = await response.json();
        if(!response.ok) throw { message: result.error || 'User-Erstellung fehlgeschlagen' };

        closeNeuerMaModal();
        var rollenLabels = {'hq':'HQ','hq_gf':'GF','hq_sales':'Sales','hq_marketing':'Marketing','hq_einkauf':'Einkauf','hq_support':'Support','hq_akademie':'Akademie','hq_hr':'HR','hq_it':'IT','inhaber':'Geschäftsleitung','verkauf':'Verkauf','werkstatt':'Werkstatt','buchhaltung':'Buchhaltung'};
        
        // Also create employee record for tool tracking
        if(!isHqUser && standortId) {
            try {
                var empInsert = await _sb().from('employees').insert({
                    standort_id: standortId,
                    vorname: vorname.trim(),
                    nachname: nachname.trim(),
                    email: email.trim().toLowerCase(),
                    position: selected.indexOf('inhaber')>=0 ? 'Geschäftsführer' : (selected.indexOf('verkauf')>=0 ? 'Verkäufer' : (selected.indexOf('werkstatt')>=0 ? 'Werkstatt' : 'Mitarbeiter')),
                    abteilung: selected.indexOf('verkauf')>=0 ? 'Verkauf' : (selected.indexOf('werkstatt')>=0 ? 'Werkstatt' : 'Verwaltung'),
                    anstelldatum: new Date().toISOString().slice(0,10),
                    status: 'aktiv'
                }).select().single();
                if(empInsert.data && empInsert.data.id) {
                    var assignTools = confirm('✅ Mitarbeiter eingeladen!\n'+vorname.trim()+' '+nachname.trim()+'\nRollen: '+selected.map(function(r){return rollenLabels[r]||r;}).join(', ')+'\n\n📧 Eine E-Mail mit dem Link zur Passwortvergabe wurde gesendet.\n\nMöchtest du jetzt Tools/Lizenzen zuweisen?');
                    if(assignTools) {
                        await renderPartnerMitarbeiter();
                        openEmployeeToolsModal(empInsert.data.id);
                        return;
                    }
                }
            } catch(empErr) { console.warn('Employee record creation:', empErr); }
        }
        
        alert('✅ Mitarbeiter eingeladen!\n'+vorname.trim()+' '+nachname.trim()+'\nRollen: '+selected.map(function(r){return rollenLabels[r]||r;}).join(', ')+'\n\n📧 Eine E-Mail mit dem Link zur Passwortvergabe wurde an '+email.trim()+' gesendet.');
        renderPartnerMitarbeiter();
        renderKzMitarbeiter();
    } catch(err) {
        if(errEl){errEl.textContent='Fehler: '+(err.message||err);errEl.style.display='block';}
        if(btn) { btn.disabled=false; btn.textContent='✉️ Einladen'; }
    }
}

// === MITARBEITER BEARBEITEN ===
export async function openEditMaModal(userId) {
    if(!hqCan('edit_user')) { _showToast('Keine Berechtigung zum Bearbeiten', 'error'); return; }
    try {
        var resp = await _sb().from('users').select('*, standorte(name), user_rollen(rollen(name,label))').eq('id', userId).single();
        if(resp.error) throw resp.error;
        var u = resp.data;
        var userRollen = (u.user_rollen||[]).map(function(ur){return ur.rollen?ur.rollen.name:'';}).filter(Boolean);
        var isUserHQ = u.is_hq || false;
        editMaEbene = isUserHQ ? 'hq' : 'standort';

        var html = '<div id="editMaOverlay" onclick="closeEditMaModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
        html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:24px;width:460px;max-width:90vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
        html += '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold text-gray-800">Mitarbeiter bearbeiten</h3><button onclick="closeEditMaModal()" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>';
        html += '<div class="space-y-3 mb-4">';
        html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Name</label><input id="editMaName" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value="'+u.name+'"></div>';
        html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">E-Mail</label><input id="editMaEmail" type="email" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value="'+u.email+'"></div>';
        html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Neues Passwort (leer lassen = unverändert)</label><input id="editMaPassword" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Neues Passwort eingeben..."></div>';

        // === EBENE (HQ vs Standort) ===
        html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Ebene</label>';
        html += '<div class="flex space-x-2">';
        html += '<button type="button" id="editMaEbeneHQ" onclick="switchEditEbene(\'hq\')" class="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition '+(isUserHQ?'border-red-500 bg-red-50 text-red-700':'border-gray-200 bg-white text-gray-500 hover:border-gray-300')+'">🏢 HQ</button>';
        html += '<button type="button" id="editMaEbeneStd" onclick="switchEditEbene(\'standort\')" class="flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition '+(!isUserHQ?'border-vit-orange bg-orange-50 text-orange-700':'border-gray-200 bg-white text-gray-500 hover:border-gray-300')+'">🏪 Standort</button>';
        html += '</div></div>';

        // Standort (hidden for HQ)
        html += '<div id="editMaStandortWrap" style="'+(isUserHQ?'display:none':'')+'"><label class="block text-xs font-semibold text-gray-600 mb-1">Standort</label><select id="editMaStandort" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="">Wird geladen...</option></select></div>';

        // Status
        html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Status</label><select id="editMaStatus" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">';
        html += '<option value="aktiv"'+(u.status==='aktiv'?' selected':'')+'>Aktiv</option>';
        html += '<option value="demo"'+(u.status==='demo'?' selected':'')+'>🔴 Demomodus</option>';
        html += '<option value="onboarding"'+(u.status==='onboarding'?' selected':'')+'>Onboarding</option>';
        html += '<option value="offboarding"'+(u.status==='offboarding'?' selected':'')+'>Offboarding</option>';
        html += '</select></div>';

        // === BETA TESTER ===
        var isBeta = u.is_beta || false;
        html += '<div class="flex items-center justify-between p-3 rounded-lg border '+(isBeta?'border-purple-300 bg-purple-50':'border-gray-200 bg-gray-50')+'">';
        html += '<div><span class="text-sm font-semibold '+(isBeta?'text-purple-700':'text-gray-700')+'">🧪 Beta-Tester</span>';
        html += '<p class="text-[10px] '+(isBeta?'text-purple-500':'text-gray-400')+'">Sieht Module im Beta-Status</p></div>';
        html += '<label class="relative inline-flex items-center cursor-pointer">';
        html += '<input type="checkbox" id="editMaBeta" class="sr-only peer"'+(isBeta?' checked':'')+'>';
        html += '<div class="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-purple-500 after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>';
        html += '</label></div>';
        html += '</div>';

        // === ROLLEN (dynamic based on Ebene) ===
        html += '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rollen</p>';

        // HQ Roles
        html += '<div id="editMaRollesHQ" style="'+(isUserHQ?'':'display:none')+'">';
        var editHqRollen = [
            {key:'hq_gf',label:'👑 Geschäftsführung',color:'border-red-300 bg-red-50'},
            {key:'hq_sales',label:'📊 Sales',color:'border-blue-300 bg-blue-50'},
            {key:'hq_marketing',label:'📣 Marketing',color:'border-pink-300 bg-pink-50'},
            {key:'hq_einkauf',label:'🛒 Einkauf',color:'border-green-300 bg-green-50'},
            {key:'hq_support',label:'🎧 Support',color:'border-yellow-300 bg-yellow-50'},
            {key:'hq_akademie',label:'🎓 Akademie',color:'border-indigo-300 bg-indigo-50'},
            {key:'hq_hr',label:'👥 HR',color:'border-purple-300 bg-purple-50'},
            {key:'hq_it',label:'🖥️ IT / Systemadmin',color:'border-gray-400 bg-gray-100'}
        ];
        editHqRollen.forEach(function(r){
            var checked = userRollen.indexOf(r.key) >= 0 ? ' checked' : '';
            html += '<label class="flex items-center space-x-3 p-2 rounded-lg border '+r.color+' mb-1.5 cursor-pointer hover:shadow-sm transition">';
            html += '<input type="checkbox" id="editMaRole_'+r.key+'" class="rounded editHqRoleCheck" style="accent-color:#EF7D00;"'+checked+' data-role="'+r.key+'">';
            html += '<span class="text-sm font-semibold text-gray-800">'+r.label+'</span></label>';
        });
        html += '</div>';

        // Standort Roles
        html += '<div id="editMaRollesStd" style="'+(!isUserHQ?'':'display:none')+'">';
        var stdRollen = ['inhaber','verkauf','werkstatt','buchhaltung'];
        var stdLabels = {'inhaber':'Geschäftsleitung','verkauf':'Verkauf','werkstatt':'Werkstatt','buchhaltung':'Buchhaltung'};
        var stdColors = {'inhaber':'border-orange-300 bg-orange-50','verkauf':'border-blue-300 bg-blue-50','werkstatt':'border-gray-300 bg-gray-50','buchhaltung':'border-purple-300 bg-purple-50'};
        stdRollen.forEach(function(r){
            var checked = userRollen.indexOf(r) >= 0 ? ' checked' : '';
            html += '<label class="flex items-center space-x-3 p-2 rounded-lg border '+stdColors[r]+' mb-1.5 cursor-pointer hover:shadow-sm transition">';
            html += '<input type="checkbox" id="editMaRole_'+r+'" class="rounded" style="accent-color:#EF7D00;"'+checked+'>';
            html += '<span class="text-sm font-semibold text-gray-800">'+stdLabels[r]+'</span></label>';
        });
        html += '</div>';

        html += '<div id="editMaError" style="display:none" class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mt-3"></div>';
        html += '<div class="flex space-x-3 mt-4">';
        html += '<button id="editMaSaveBtn" onclick="saveEditMa(\''+userId+'\')" class="flex-1 py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">Speichern</button>';
        html += '<button onclick="closeEditMaModal()" class="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Abbrechen</button>';
        html += '</div></div></div>';

        var c = document.createElement('div'); c.id = 'editMaContainer'; c.innerHTML = html; document.body.appendChild(c);

        // Load standorte dropdown
        setTimeout(async function(){
            try {
                var stdResp = await _sb().from('standorte').select('id,name').order('name');
                var sel = document.getElementById('editMaStandort');
                if(sel && stdResp.data) {
                    sel.innerHTML = '<option value="hq">HQ (kein Standort)</option>';
                    stdResp.data.forEach(function(s){
                        var selected = (u.standort_id === s.id) ? ' selected' : '';
                        sel.innerHTML += '<option value="'+s.id+'"'+selected+'>'+s.name+'</option>';
                    });
                }
            } catch(e){}
        }, 100);
    } catch(err) { alert('Fehler: '+err.message); }
}

var editMaEbene = 'standort'; // tracks current ebene selection in edit modal
export function switchEditEbene(ebene) {
    editMaEbene = ebene;
    var hqBtn = document.getElementById('editMaEbeneHQ');
    var stdBtn = document.getElementById('editMaEbeneStd');
    var stdWrap = document.getElementById('editMaStandortWrap');
    var rollesHQ = document.getElementById('editMaRollesHQ');
    var rollesStd = document.getElementById('editMaRollesStd');
    if(ebene === 'hq') {
        if(hqBtn) hqBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-red-500 bg-red-50 text-red-700';
        if(stdBtn) stdBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-gray-200 bg-white text-gray-500 hover:border-gray-300';
        if(stdWrap) stdWrap.style.display = 'none';
        if(rollesHQ) rollesHQ.style.display = '';
        if(rollesStd) rollesStd.style.display = 'none';
        // Auto-check GF role
        document.querySelectorAll('.editHqRoleCheck').forEach(function(chk){
            if(!chk.checked) chk.checked = false;
        });
        // Uncheck standort roles
        ['inhaber','verkauf','werkstatt','buchhaltung'].forEach(function(r){
            var chk = document.getElementById('editMaRole_'+r);
            if(chk) chk.checked = false;
        });
    } else {
        if(stdBtn) stdBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-vit-orange bg-orange-50 text-orange-700';
        if(hqBtn) hqBtn.className = 'flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition border-gray-200 bg-white text-gray-500 hover:border-gray-300';
        if(stdWrap) stdWrap.style.display = '';
        if(rollesHQ) rollesHQ.style.display = 'none';
        if(rollesStd) rollesStd.style.display = '';
        // Uncheck HQ roles
        document.querySelectorAll('.editHqRoleCheck').forEach(function(chk){ chk.checked = false; });
    }
}

export function closeEditMaModal() { var c = document.getElementById('editMaContainer'); if(c) c.remove(); }

export async function saveEditMa(userId) {
    var name = (document.getElementById('editMaName')||{}).value||'';
    var email = (document.getElementById('editMaEmail')||{}).value||'';
    var pw = (document.getElementById('editMaPassword')||{}).value||'';
    var standortId = (document.getElementById('editMaStandort')||{}).value||'';
    var status = (document.getElementById('editMaStatus')||{}).value||'aktiv';
    var isHQ = editMaEbene === 'hq';
    var errEl = document.getElementById('editMaError');
    if(errEl) errEl.style.display = 'none';

    if(!name.trim() || !email.trim()) { if(errEl){errEl.textContent='Name und E-Mail sind Pflicht.';errEl.style.display='block';} return; }
    if(!isHQ && (!standortId || standortId === 'hq')) { if(errEl){errEl.textContent='Bitte einen Standort zuweisen.';errEl.style.display='block';} return; }

    // Collect roles based on ebene
    var selected = [];
    if(isHQ) {
        document.querySelectorAll('.editHqRoleCheck:checked').forEach(function(chk){
            selected.push(chk.getAttribute('data-role'));
        });
        if(selected.length > 0 && selected.indexOf('hq') === -1) selected.push('hq');
    } else {
        ['inhaber','verkauf','werkstatt','buchhaltung'].forEach(function(r){
            var chk = document.getElementById('editMaRole_'+r);
            if(chk && chk.checked) selected.push(r);
        });
    }
    if(selected.length===0) { if(errEl){errEl.textContent='Mindestens eine Rolle nötig.';errEl.style.display='block';} return; }

    var btn = document.getElementById('editMaSaveBtn');
    if(btn) { btn.disabled=true; btn.textContent='Wird gespeichert...'; }

    try {
        // 1. Users-Tabelle updaten
        var isBetaChecked = document.getElementById('editMaBeta') ? document.getElementById('editMaBeta').checked : false;
        var upd = await _sb().from('users').update({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            standort_id: isHQ ? null : standortId,
            is_hq: isHQ,
            is_beta: isBetaChecked,
            status: status
        }).eq('id', userId);
        if(upd.error) throw upd.error;

        // 2. Passwort ändern (via set_user_password)
        if(pw && pw.length >= 6) {
            var pwResp = await sb.rpc('set_user_password', { user_id: userId, new_password: pw });
            if(pwResp && pwResp.error) console.warn('Passwort-Update:', pwResp.error.message);
        }

        // 3. Rollen: alte löschen, neue setzen
        await _sb().from('user_rollen').delete().eq('user_id', userId);
        
        // Rollen-IDs holen
        var rollenResp = await _sb().from('rollen').select('id, name');
        var rollenMap = {};
        if(rollenResp.data) rollenResp.data.forEach(function(r){ rollenMap[r.name] = r.id; });
        
        var rollenInserts = selected.map(function(roleName){
            return { user_id: userId, rolle_id: rollenMap[roleName] };
        }).filter(function(ri){ return ri.rolle_id; });
        
        if(rollenInserts.length > 0) {
            var insResp = await _sb().from('user_rollen').insert(rollenInserts);
            if(insResp.error) console.warn('Rollen-Zuweisung:', insResp.error.message);
        }

        closeEditMaModal();
        alert('\u2705 Mitarbeiter aktualisiert!');
        renderKzMitarbeiter();
        // If this user's status changed, re-check demo mode
        if(_sbProfile() && userId === _sbProfile().id) {
            _sbProfile().status = status;
        } else if(status === 'demo' || (_sbProfile() && _sbProfile().status === 'demo')) {
            // If any user was set to/from demo while viewing as that user
        }
    } catch(err) {
        if(errEl){errEl.textContent='Fehler: '+(err.message||err);errEl.style.display='block';}
        if(btn) { btn.disabled=false; btn.textContent=_t('btn_save'); }
    }
}


// === ALS USER ANMELDEN (ohne Passwort) ===
export async function loginAs(userId, email, userName) {
    if(!hqCan('impersonate')) { _showToast('Keine Berechtigung für "Anmelden als"', 'error'); return; }
    if(!confirm('Als "'+userName+'" anmelden?\n\nDu wirst als dieser User eingeloggt um die Rechte zu testen.')) return;
    try {
        // 1. Temporäres Passwort setzen
        var tempPw = '_TempLogin_' + Date.now();
        await sb.rpc('set_user_password', { user_id: userId, new_password: tempPw });
        
        // 2. Ausloggen
        await _sb().auth.signOut();
        
        // 3. Mit temporärem Passwort einloggen
        var resp = await _sb().auth.signInWithPassword({ email: email, password: tempPw });
        if(resp.error) throw resp.error;
        sbUser = resp.data.user;
        await loadUserProfile(_sbUser().id);
        await loadModulStatus();
        await loadFeatureFlags();
        // Reset cached module states (Office, etc.)
        if(typeof window._offResetState === 'function') window._offResetState();
        enterApp();
        try { await loadPipelineFromSupabase(); } catch(e) {}
    } catch(err) {
        alert('Login fehlgeschlagen: '+(err.message||err)+'\n\nSeite wird neu geladen.');
        location.reload();
    }
}

// === MITARBEITER LÖSCHEN ===
export async function deleteMa(userId, userName) {
    if(!hqCan('delete_user')) { _showToast('Keine Berechtigung zum Löschen', 'error'); return; }
    if(!confirm('Mitarbeiter "'+userName+'" wirklich löschen?\n\nDies löscht den Account komplett (Auth + Profil + Rollen).')) return;
    try {
        // 1. Rollen löschen
        await _sb().from('user_rollen').delete().eq('user_id', userId);
        // 2. User-Profil löschen
        await _sb().from('users').delete().eq('id', userId);
        // 3. Auth-User löschen (via DB-Funktion)
        await sb.rpc('delete_auth_user', { target_user_id: userId });
        alert('\u2705 '+userName+' wurde gelöscht.');
        renderKzMitarbeiter();
    } catch(err) {
        // Auch bei Fehler beim Auth-Löschen: Profil ist bereits weg
        if(err.message && err.message.includes('delete_auth_user')) {
            alert('\u2705 '+userName+' Profil gelöscht.\n\u26a0\ufe0f Auth-User muss manuell im Supabase Dashboard entfernt werden.');
            renderKzMitarbeiter();
        } else {
            alert('Fehler: '+(err.message||err));
        }
    }
}

// === NEUER STANDORT MODAL ===
export function openNeuerStandortModal() {
    var html = '<div id="neuerStdOverlay" onclick="closeNeuerStdModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
    html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:24px;width:460px;max-width:90vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
    html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-bold text-gray-800">Neuen Standort anlegen</h3><button onclick="closeNeuerStdModal()" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>';
    html += '<div class="space-y-3 mb-5">';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Name *</label><input id="newStdName" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="z.B. vit:bikes München"></div>';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Slug * (URL-Key, nur Kleinbuchstaben)</label><input id="newStdSlug" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="z.B. muenchen"></div>';
    html += '<div class="grid grid-cols-2 gap-3">';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Region</label><select id="newStdRegion" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option>Süd</option><option>Nord</option><option>West</option><option>Ost</option><option>Mitte</option></select></div>';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Status</label><select id="newStdStatus" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="onboarding">Onboarding</option><option value="aktiv">Aktiv</option></select></div>';
    html += '</div>';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Adresse</label><input id="newStdAdresse" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Straße, PLZ Ort"></div>';
    html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Telefon</label><input id="newStdTelefon" type="text" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="+49 ..."></div>';
    html += '<div><label class="flex items-center space-x-2 cursor-pointer"><input type="checkbox" id="newStdPremium" style="accent-color:#EF7D00;"><span class="text-sm text-gray-700">Premium-Partner</span></label></div>';
    html += '</div>';
    html += '<div class="flex space-x-3"><button onclick="saveNeuerStandort()" class="flex-1 py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">Anlegen</button>';
    html += '<button onclick="closeNeuerStdModal()" class="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Abbrechen</button></div>';
    html += '</div></div>';
    var container = document.createElement('div');
    container.id = 'neuerStdContainer';
    container.innerHTML = html;
    document.body.appendChild(container);
    // Auto-generate slug from name
    var nameInput = document.getElementById('newStdName');
    if(nameInput) nameInput.addEventListener('input', function(){
        var slug = this.value.toLowerCase().replace(/vit:bikes\s*/i,'').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
        var slugInput = document.getElementById('newStdSlug');
        if(slugInput) slugInput.value = slug;
    });
}

export function closeNeuerStdModal() {
    var c = document.getElementById('neuerStdContainer');
    if(c) c.remove();
}

export async function saveNeuerStandort() {
    var name = (document.getElementById('newStdName')||{}).value||'';
    var slug = (document.getElementById('newStdSlug')||{}).value||'';
    var region = (document.getElementById('newStdRegion')||{}).value||'Süd';
    var status = (document.getElementById('newStdStatus')||{}).value||'onboarding';
    var adresse = (document.getElementById('newStdAdresse')||{}).value||'';
    var telefon = (document.getElementById('newStdTelefon')||{}).value||'';
    var premium = (document.getElementById('newStdPremium')||{}).checked||false;

    if(!name.trim() || !slug.trim()) { alert(_t('misc_enter_name_slug')); return; }
    slug = slug.toLowerCase().replace(/[^a-z0-9-]/g,'');

    var btn = document.querySelector('#neuerStdContainer .bg-vit-orange');
    if(btn) { btn.disabled=true; btn.textContent='Wird angelegt...'; }

    try {
        var resp = await _sb().from('standorte').insert({
            name: name.trim(),
            slug: slug,
            region: region,
            status: status,
            is_premium: premium,
            adresse: adresse.trim() || null,
            telefon: telefon.trim() || null
        }).select().single();
        if(resp.error) throw resp.error;

        closeNeuerStdModal();
        alert('\u2705 Standort angelegt!\n'+name.trim()+'\nSlug: '+slug+'\nStatus: '+status);
        renderKzStandorte();
    } catch(err) {
        alert('Fehler: ' + err.message);
        if(btn) { btn.disabled=false; btn.textContent='Anlegen'; }
    }
}

// === HQ EINSTELLUNGEN - RECHTE-MATRIX ===
export function showSettingsTab(tab) {
    document.querySelectorAll('.settings-tab').forEach(function(b){
        b.className = 'settings-tab px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700';
    });
    var btn = document.querySelector('.settings-tab[data-tab="'+tab+'"]');
    if(btn) btn.className = 'settings-tab px-4 py-2.5 text-sm font-semibold border-b-2 border-vit-orange text-vit-orange';
    document.querySelectorAll('.settings-tab-content').forEach(function(c){ c.style.display = 'none'; });
    var content = document.getElementById('settingsTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if(content) content.style.display = '';
    // Load tab-specific data
    if(tab === 'demo') renderDemoModulList();
    if(tab === 'hqmodule') renderHqModulStatusList();
    if(tab === 'office') { setTimeout(function(){ if(typeof window.officeRenderAdminDots === 'function') window.officeRenderAdminDots(); }, 150); }
    if(tab === 'schnittstellen') { setTimeout(function(){ if(typeof window.renderSchnittstellen === 'function') window.renderSchnittstellen(); }, 100); }
}

// Tab/Widget-Konfiguration pro Modul
var MODULE_TABS = {
    verkauf: [{key:'pipeline',label:'Pipeline'},{key:'woche',label:'Wochenansicht'},{key:'auswertung',label:'Auswertung'},{key:'training',label:'KI-Trainer'},{key:'vkWissen',label:'Wissen'}],
    marketing: [{key:'cockpit',label:'Cockpit'},{key:'budget',label:'Budget'},{key:'kampagnen',label:'Kampagnen'},{key:'reichweite',label:'Reichweite'},{key:'social',label:'Social Media'},{key:'mktStrategie',label:'Strategie'},{key:'mktWissen',label:'Wissen'}],
    einkauf: [{key:'sortiment',label:'Sortiment'},{key:'lieferanten',label:'Lieferanten'},{key:'zentralreg',label:'Zentralreg.'},{key:'ekStrategie',label:'Strategie'},{key:'ekWissen',label:'Wissen'}],
    controlling: [{key:'cockpit',label:'Cockpit'},{key:'bwa',label:'BWA-Analyse'},{key:'benchmark',label:'Benchmark'},{key:'planist',label:'Plan/Ist'},{key:'liquiditaet',label:'Liquidität'},{key:'ctrlWissen',label:'Wissen'}],
    allgemein: [{key:'uebersicht',label:'Übersicht'},{key:'jahresziele',label:'Jahresziele'},{key:'monatsplan',label:'Monatsplan'},{key:'journal',label:'Journal'},{key:'strategie',label:'Strategie'},{key:'wissen',label:'Wissen'}],
    support: [{key:'tickets',label:'Tickets'},{key:'kontakte',label:'Kontakte'}],
    kommunikation: [{key:'chat',label:'Chat'},{key:'community',label:'Community'},{key:'ankuendigungen',label:'Ankündigungen'},{key:'notifications',label:'Benachrichtigungen'}],
    mitarbeiter: [{key:'team',label:'Team-Übersicht'},{key:'rollen',label:'Rollen'},{key:'einladungen',label:'Einladungen'}],
    entwicklung: [{key:'ideen',label:'Ideen'},{key:'module',label:'Module'},{key:'releases',label:'Releases'},{key:'steuerung',label:'Steuerung'},{key:'featureflags',label:'Feature Flags'},{key:'system',label:'System'},{key:'nutzung',label:'Nutzung'}],
    wissen: [{key:'artikel',label:'Artikel'},{key:'downloads',label:'Downloads'},{key:'schulungen',label:'Schulungen'}],
    buchhaltung: [{key:'rechnungen',label:'Rechnungen'},{key:'zahlungen',label:'Zahlungen'},{key:'mahnwesen',label:'Mahnwesen'}],
    abrechnung: [{key:'monatsabrechnung',label:'Monatsabrechnung'},{key:'settlement',label:'Settlement'},{key:'strategien',label:'Strategien'},{key:'produkte',label:'Produkte'},{key:'tools',label:'Tools'}],
    office: [{key:'team',label:'Team'},{key:'plan',label:'Grundriss'}]
};
var MODULE_WIDGETS = {
    startseite: [{key:'daily_focus',label:'Heute steuern'},{key:'health_score',label:'Health Score'},{key:'sales_momentum',label:'Sales Momentum'},{key:'bwa_deadline',label:'BWA-Deadline'},{key:'bwa_netzwerk',label:'BWA Netzwerk-Status'},{key:'kpi_feedback',label:'Monats-Feedback'},{key:'pipeline',label:'Pipeline'},{key:'success',label:'Verkaufserfolg'},{key:'termine',label:'Termine'},{key:'aufgaben',label:'Aufgaben'},{key:'marketing',label:'Marketing'},{key:'team',label:'Team'},{key:'controlling',label:'Controlling'},{key:'support',label:'Support'},{key:'wissen',label:'Wissen'},{key:'nachrichten',label:'Nachrichten'}]
};

// Persistent expanded state
var expandedModules = {};
// Local config cache: {modul_key: {tabs: {tab_key: status}, widgets: {w_key: status}}}
var sbModulConfig = {};

export async function renderModulStatusList() {
    var container = document.getElementById('modulStatusList');
    if(!container) return;
    try {
        var resp = await _sb().from('modul_status').select('*').order('reihenfolge');
        if(resp.error) throw resp.error;
        var modules = (resp.data || []).filter(function(m) { return m.ebene === 'partner' || m.ebene === 'beide'; });
        var html = '';
        var katLabels = {basis:'Basis',dashboards:'Dashboards',fachbereiche:'Fachbereiche',tools:'Tools'};
        var lastKat = '';
        var counts = {aktiv:0, demo:0, in_bearbeitung:0, deaktiviert:0};

        modules.forEach(function(m) {
            counts[m.status] = (counts[m.status]||0) + 1;
            var cfg = m.config || {};
            sbModulConfig[m.modul_key] = cfg;

            if(m.kategorie !== lastKat) {
                lastKat = m.kategorie;
                html += '<div class="px-5 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">' + (katLabels[m.kategorie]||m.kategorie) + '</div>';
            }
            html += _renderModulRow(m, m.status, 'partner');
        });
        container.innerHTML = html;

        var el1 = document.getElementById('countAktiv'); if(el1) el1.textContent = counts.aktiv||0;
        var el1b = document.getElementById('countDemo'); if(el1b) el1b.textContent = counts.demo||0;
        var el2 = document.getElementById('countWip'); if(el2) el2.textContent = counts.in_bearbeitung||0;
        var el3 = document.getElementById('countDeaktiviert'); if(el3) el3.textContent = counts.deaktiviert||0;
    } catch(err) { console.error('ModulStatusList:', err); container.innerHTML = '<div class="p-4 text-center text-red-400">Fehler beim Laden</div>'; }
}

export async function renderHqModulStatusList() {
    var container = document.getElementById('hqModulStatusList');
    if(!container) return;
    try {
        var resp = await _sb().from('modul_status').select('*').order('reihenfolge');
        if(resp.error) throw resp.error;
        var modules = (resp.data || []).filter(function(m) { return m.ebene === 'hq' || m.ebene === 'beide'; });
        var html = '';
        var katLabels = {basis:'Basis (Shared)',hq:'HQ-Intern',hq_steuerung:'HQ-Steuerung',hq_netzwerk:'HQ-Netzwerk',hq_admin:'HQ-Admin',dashboards:'Dashboards',fachbereiche:'Fachbereiche',tools:'Tools'};
        var lastKat = '';
        var counts = {aktiv:0, demo:0, in_bearbeitung:0, deaktiviert:0};

        modules.forEach(function(m) {
            var hqSt = m.hq_status || 'aktiv';
            counts[hqSt] = (counts[hqSt]||0) + 1;
            var cfg = m.hq_config || {};
            sbHqModulConfig[m.modul_key] = cfg;

            if(m.kategorie !== lastKat) {
                lastKat = m.kategorie;
                html += '<div class="px-5 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">' + (katLabels[m.kategorie]||m.kategorie) + '</div>';
            }
            html += _renderModulRow(m, hqSt, 'hq');
        });
        container.innerHTML = html;

        var el1 = document.getElementById('countHqAktiv'); if(el1) el1.textContent = counts.aktiv||0;
        var el1b = document.getElementById('countHqDemo'); if(el1b) el1b.textContent = counts.demo||0;
        var el2 = document.getElementById('countHqWip'); if(el2) el2.textContent = counts.in_bearbeitung||0;
        var el3 = document.getElementById('countHqDeaktiviert'); if(el3) el3.textContent = counts.deaktiviert||0;
    } catch(err) { console.error('HqModulStatusList:', err); container.innerHTML = '<div class="p-4 text-center text-red-400">Fehler beim Laden</div>'; }
}

// Shared renderer for both Partner and HQ module lists
export function _renderModulRow(m, currentStatus, ebene) {
    var icons = {startseite:'🏠',kalender:'📅',aufgaben:'📋',kommunikation:'💬',dashboards:'📊',allgemein:'🏢',verkauf:'📈',einkauf:'🛒',marketing:'📣',controlling:'📊',wissen:'📚',support:'🎫',ideenboard:'💡',shop:'🛍️',onboarding:'🎯',mitarbeiter:'👥',aktenschrank:'📁',entwicklung:'</>',spiritus:'📝',abrechnung:'💰',office:'🏢',standortBilling:'💳',hqCockpit:'🌐',hqKommandozentrale:'⚙️',hqHandlungsbedarf:'🚨',hqStandorte:'🏪',hqFinanzen:'💶',hqMarketing:'📣',hqEinkauf:'🛒',hqSupport:'🎫',hqAkademie:'📚',hqEinstellungen:'⚙️',hqEntwicklung:'</>'};
    var isHq = ebene === 'hq';
    var expandKey = (isHq ? 'hq_' : '') + m.modul_key;
    var cfg = isHq ? (m.hq_config || {}) : (m.config || {});
    var hasTabs = MODULE_TABS[m.modul_key] && MODULE_TABS[m.modul_key].length > 0;
    var hasWidgets = MODULE_WIDGETS[m.modul_key] && MODULE_WIDGETS[m.modul_key].length > 0;
    var hasChildren = hasTabs || hasWidgets;
    var isExpanded = expandedModules[expandKey] || false;
    var setFn = isHq ? 'setHqModulStatus' : 'setModulStatus';
    var setTabFn = isHq ? 'setHqTabStatus' : 'setTabStatus';
    var setWidgetFn = isHq ? 'setHqWidgetStatus' : 'setWidgetStatus';

    var html = '<div class="px-5 py-3 hover:bg-gray-50 transition">';
    html += '<div class="flex items-center justify-between">';
    html += '<div class="flex items-center space-x-3">';
    if(hasChildren) {
        html += '<button onclick="toggleModuleExpand(\'' + expandKey + '\',\'' + ebene + '\')" class="text-gray-400 hover:text-gray-700 text-sm" style="width:20px">' + (isExpanded?'▼':'▶') + '</button>';
    } else {
        html += '<span style="width:20px"></span>';
    }
    html += '<span class="text-xl">' + (icons[m.modul_key]||'📦') + '</span>';
    html += '<div><span class="font-semibold text-gray-800 text-sm">' + m.modul_name + '</span>';
    html += '<span class="text-xs text-gray-400 ml-2">' + m.modul_key + '</span>';
    if(m.ebene === 'beide') html += '<span class="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded ml-2">Beide</span>';
    if(hasTabs) html += '<span class="text-[10px] text-gray-400 ml-1">(' + MODULE_TABS[m.modul_key].length + ' Tabs)</span>';
    if(hasWidgets) html += '<span class="text-[10px] text-gray-400 ml-1">(' + MODULE_WIDGETS[m.modul_key].length + ' Widgets)</span>';
    html += '</div></div>';

    // Status toggle buttons
    html += '<div class="flex items-center space-x-1 bg-gray-100 rounded-lg p-0.5">';
    var btnBase = 'px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition cursor-pointer';
    html += '<button onclick="' + setFn + '(\'' + m.id + '\',\'aktiv\')" class="' + btnBase + ' ' + (currentStatus==='aktiv' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200') + '">✓ Aktiv</button>';
    html += '<button onclick="' + setFn + '(\'' + m.id + '\',\'beta\')" class="' + btnBase + ' ' + (currentStatus==='beta' ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200') + '">🧪 Beta</button>';
    html += '<button onclick="' + setFn + '(\'' + m.id + '\',\'demo\')" class="' + btnBase + ' ' + (currentStatus==='demo' ? 'bg-orange-400 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200') + '">👁 Demo</button>';
    html += '<button onclick="' + setFn + '(\'' + m.id + '\',\'in_bearbeitung\')" class="' + btnBase + ' ' + (currentStatus==='in_bearbeitung' ? 'bg-yellow-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200') + '">🔧 Bald</button>';
    html += '<button onclick="' + setFn + '(\'' + m.id + '\',\'deaktiviert\')" class="' + btnBase + ' ' + (currentStatus==='deaktiviert' ? 'bg-gray-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200') + '">✕ Aus</button>';
    html += '</div>';
    html += '</div>';

    // Expandable children
    if(hasChildren && isExpanded) {
        html += '<div class="ml-12 mt-3 mb-1 space-y-2">';
        if(hasTabs) {
            html += '<div class="text-[10px] font-bold text-gray-400 uppercase mb-1">Tabs</div>';
            MODULE_TABS[m.modul_key].forEach(function(tab) {
                var tabStatus = (cfg.tabs && cfg.tabs[tab.key]) || 'aktiv';
                html += '<div class="flex items-center justify-between py-1">';
                html += '<span class="text-xs text-gray-700">↳ ' + tab.label + '</span>';
                html += '<div class="flex items-center space-x-0.5 bg-gray-100 rounded p-0.5">';
                var tbtn = 'px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer';
                html += '<button onclick="' + setTabFn + '(\'' + m.modul_key + '\',\'' + tab.key + '\',\'aktiv\')" class="' + tbtn + ' ' + (tabStatus==='aktiv'?'bg-green-500 text-white':'text-gray-400 hover:bg-gray-200') + '">✓</button>';
                html += '<button onclick="' + setTabFn + '(\'' + m.modul_key + '\',\'' + tab.key + '\',\'beta\')" class="' + tbtn + ' ' + (tabStatus==='beta'?'bg-purple-500 text-white':'text-gray-400 hover:bg-gray-200') + '">🧪</button>';
                html += '<button onclick="' + setTabFn + '(\'' + m.modul_key + '\',\'' + tab.key + '\',\'demo\')" class="' + tbtn + ' ' + (tabStatus==='demo'?'bg-orange-400 text-white':'text-gray-400 hover:bg-gray-200') + '">👁</button>';
                html += '<button onclick="' + setTabFn + '(\'' + m.modul_key + '\',\'' + tab.key + '\',\'deaktiviert\')" class="' + tbtn + ' ' + (tabStatus==='deaktiviert'?'bg-gray-500 text-white':'text-gray-400 hover:bg-gray-200') + '">✕</button>';
                html += '</div></div>';
            });
        }
        if(hasWidgets) {
            html += '<div class="text-[10px] font-bold text-gray-400 uppercase mb-1 mt-2">Widgets</div>';
            MODULE_WIDGETS[m.modul_key].forEach(function(w) {
                var wStatus = (cfg.widgets && cfg.widgets[w.key]) || 'aktiv';
                html += '<div class="flex items-center justify-between py-1">';
                html += '<span class="text-xs text-gray-700">↳ ' + w.label + '</span>';
                html += '<div class="flex items-center space-x-0.5 bg-gray-100 rounded p-0.5">';
                var wbtn = 'px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer';
                html += '<button onclick="' + setWidgetFn + '(\'' + m.modul_key + '\',\'' + w.key + '\',\'aktiv\')" class="' + wbtn + ' ' + (wStatus==='aktiv'?'bg-green-500 text-white':'text-gray-400 hover:bg-gray-200') + '">✓</button>';
                html += '<button onclick="' + setWidgetFn + '(\'' + m.modul_key + '\',\'' + w.key + '\',\'beta\')" class="' + wbtn + ' ' + (wStatus==='beta'?'bg-purple-500 text-white':'text-gray-400 hover:bg-gray-200') + '">🧪</button>';
                html += '<button onclick="' + setWidgetFn + '(\'' + m.modul_key + '\',\'' + w.key + '\',\'demo\')" class="' + wbtn + ' ' + (wStatus==='demo'?'bg-orange-400 text-white':'text-gray-400 hover:bg-gray-200') + '">👁</button>';
                html += '<button onclick="' + setWidgetFn + '(\'' + m.modul_key + '\',\'' + w.key + '\',\'deaktiviert\')" class="' + wbtn + ' ' + (wStatus==='deaktiviert'?'bg-gray-500 text-white':'text-gray-400 hover:bg-gray-200') + '">✕</button>';
                html += '</div></div>';
            });
        }
        html += '</div>';
    }
    html += '</div>';
    return html;
}

export function toggleModuleExpand(key, ebene) {
    expandedModules[key] = !expandedModules[key];
    if(ebene === 'hq') renderHqModulStatusList();
    else renderModulStatusList();
}

// ═══ OFFICE-RÄUME ADMIN ═══
// Fully delegated to office-admin.js module — no duplicate code here


export async function renderOfficeRoomsAdmin() {
    // Delegated to office-admin.js module
    if(typeof window.officeRenderAdminDots === 'function') {
        await window.officeRenderAdminDots();
    }
}

// ═══ DEMO-MODUS KONFIGURATION ═══
export async function renderDemoModulList() {
    var container = document.getElementById('demoModulStatusList');
    if(!container) return;
    try {
        var resp = await _sb().from('modul_status').select('id, modul_key, modul_name, kategorie, demo_status, config').order('reihenfolge');
        if(resp.error) throw resp.error;
        var modules = resp.data || [];
        var icons = {startseite:'🏠',kalender:'📅',aufgaben:'📋',kommunikation:'💬',dashboards:'📊',allgemein:'🏢',verkauf:'📈',einkauf:'🛒',marketing:'📣',controlling:'📊',wissen:'📚',support:'🎫',ideenboard:'💡',shop:'🛍️',onboarding:'🎯',mitarbeiter:'👥',aktenschrank:'📁',entwicklung:'&lt;/&gt;',spiritus:'📝'};
        var katLabels = {basis:'Basis',dashboards:'Dashboards',fachbereiche:'Fachbereiche',tools:'Tools',hq:'HQ'};
        var lastKat = '';
        var html = '';
        modules.forEach(function(m) {
            if(m.kategorie !== lastKat) {
                lastKat = m.kategorie;
                html += '<div class="px-5 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">' + (katLabels[m.kategorie]||m.kategorie) + '</div>';
            }
            var ds = m.demo_status || 'demo';
            var hasTabs = MODULE_TABS[m.modul_key] && MODULE_TABS[m.modul_key].length > 0;
            var hasWidgets = MODULE_WIDGETS[m.modul_key] && MODULE_WIDGETS[m.modul_key].length > 0;
            var hasChildren = hasTabs || hasWidgets;
            var isExp = expandedModules['demo_'+m.modul_key] || false;

            html += '<div class="px-5 py-3 hover:bg-gray-50 transition">';
            html += '<div class="flex items-center justify-between">';
            html += '<div class="flex items-center space-x-3">';
            if(hasChildren) {
                html += '<button data-action="toggle-demo" data-key="' + m.modul_key + '" class="text-gray-400 hover:text-gray-700 text-sm" style="width:20px">' + (isExp?'▼':'▶') + '</button>';
            } else {
                html += '<span style="width:20px"></span>';
            }
            html += '<span class="text-xl">' + (icons[m.modul_key]||'📦') + '</span>';
            html += '<span class="font-semibold text-sm text-gray-800">' + m.modul_name + '</span>';
            if(hasTabs) html += '<span class="text-[10px] text-gray-400 ml-1">(' + MODULE_TABS[m.modul_key].length + ' Tabs)</span>';
            if(hasWidgets) html += '<span class="text-[10px] text-gray-400 ml-1">(' + MODULE_WIDGETS[m.modul_key].length + ' Widgets)</span>';
            html += '</div>';
            // Only Demo / Aus toggle
            html += '<div class="flex items-center space-x-1 bg-gray-100 rounded-lg p-0.5">';
            html += '<button data-action="set-demo" data-id="' + m.id + '" data-mk="' + m.modul_key + '" data-st="demo" class="px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition cursor-pointer ' + (ds!=='deaktiviert'?'bg-orange-400 text-white shadow-sm':'text-gray-500 hover:bg-gray-200') + '">👁 Demo</button>';
            html += '<button data-action="set-demo" data-id="' + m.id + '" data-mk="' + m.modul_key + '" data-st="deaktiviert" class="px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition cursor-pointer ' + (ds==='deaktiviert'?'bg-gray-500 text-white shadow-sm':'text-gray-500 hover:bg-gray-200') + '">✕ Aus</button>';
            html += '</div></div>';

            // Expandable tabs/widgets
            if(hasChildren && isExp) {
                var cfg = m.config || {};
                html += '<div class="ml-12 mt-3 mb-1 space-y-2">';
                if(hasTabs) {
                    html += '<div class="text-[10px] font-bold text-gray-400 uppercase mb-1">Tabs</div>';
                    MODULE_TABS[m.modul_key].forEach(function(tab) {
                        var ts = (cfg.demo_tabs && cfg.demo_tabs[tab.key]) || 'demo';
                        html += '<div class="flex items-center justify-between py-1">';
                        html += '<span class="text-xs text-gray-700">↳ ' + tab.label + '</span>';
                        html += '<div class="flex items-center space-x-0.5 bg-gray-100 rounded p-0.5">';
                        html += '<button data-action="set-demo-tab" data-mk="' + m.modul_key + '" data-tk="' + tab.key + '" data-st="demo" class="px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ' + (ts!=='deaktiviert'?'bg-orange-400 text-white':'text-gray-400 hover:bg-gray-200') + '">👁</button>';
                        html += '<button data-action="set-demo-tab" data-mk="' + m.modul_key + '" data-tk="' + tab.key + '" data-st="deaktiviert" class="px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ' + (ts==='deaktiviert'?'bg-gray-500 text-white':'text-gray-400 hover:bg-gray-200') + '">✕</button>';
                        html += '</div></div>';
                    });
                }
                if(hasWidgets) {
                    html += '<div class="text-[10px] font-bold text-gray-400 uppercase mb-1 mt-2">Widgets</div>';
                    MODULE_WIDGETS[m.modul_key].forEach(function(w) {
                        var ws = (cfg.demo_widgets && cfg.demo_widgets[w.key]) || 'demo';
                        html += '<div class="flex items-center justify-between py-1">';
                        html += '<span class="text-xs text-gray-700">↳ ' + w.label + '</span>';
                        html += '<div class="flex items-center space-x-0.5 bg-gray-100 rounded p-0.5">';
                        html += '<button data-action="set-demo-widget" data-mk="' + m.modul_key + '" data-wk="' + w.key + '" data-st="demo" class="px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ' + (ws!=='deaktiviert'?'bg-orange-400 text-white':'text-gray-400 hover:bg-gray-200') + '">👁</button>';
                        html += '<button data-action="set-demo-widget" data-mk="' + m.modul_key + '" data-wk="' + w.key + '" data-st="deaktiviert" class="px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ' + (ws==='deaktiviert'?'bg-gray-500 text-white':'text-gray-400 hover:bg-gray-200') + '">✕</button>';
                        html += '</div></div>';
                    });
                }
                html += '</div>';
            }
            html += '</div>';
        });
        container.innerHTML = html;

        // Event delegation for all buttons
        container.onclick = function(e) {
            var btn = e.target.closest('[data-action]');
            if(!btn) return;
            var action = btn.getAttribute('data-action');
            if(action === 'set-demo') {
                setDemoModulStatus(btn.getAttribute('data-id'), btn.getAttribute('data-mk'), btn.getAttribute('data-st'));
            } else if(action === 'toggle-demo') {
                var k = 'demo_' + btn.getAttribute('data-key');
                expandedModules[k] = !expandedModules[k];
                renderDemoModulList();
            } else if(action === 'set-demo-tab') {
                setDemoTabStatus(btn.getAttribute('data-mk'), btn.getAttribute('data-tk'), btn.getAttribute('data-st'));
            } else if(action === 'set-demo-widget') {
                setDemoWidgetStatus(btn.getAttribute('data-mk'), btn.getAttribute('data-wk'), btn.getAttribute('data-st'));
            }
        };
    } catch(err) { console.error('DemoModulList:', err); container.innerHTML = '<div class="p-4 text-center text-red-400">Fehler beim Laden</div>'; }
}

export async function setDemoModulStatus(id, modulKey, newStatus) {
    try {
        var resp = await _sb().from('modul_status').update({demo_status: newStatus}).eq('id', id);
        if(resp.error) throw resp.error;
        _showToast(modulKey + ' → ' + (newStatus==='deaktiviert'?'Aus':'Demo'), 'success');
        renderDemoModulList();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

export async function setDemoTabStatus(modulKey, tabKey, newStatus) {
    try {
        var cfg = sbModulConfig[modulKey] || {};
        if(!cfg.demo_tabs) cfg.demo_tabs = {};
        cfg.demo_tabs[tabKey] = newStatus;
        var resp = await _sb().from('modul_status').update({config: cfg}).eq('modul_key', modulKey);
        if(resp.error) throw resp.error;
        sbModulConfig[modulKey] = cfg;
        renderDemoModulList();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

export async function setDemoWidgetStatus(modulKey, widgetKey, newStatus) {
    try {
        var cfg = sbModulConfig[modulKey] || {};
        if(!cfg.demo_widgets) cfg.demo_widgets = {};
        cfg.demo_widgets[widgetKey] = newStatus;
        var resp = await _sb().from('modul_status').update({config: cfg}).eq('modul_key', modulKey);
        if(resp.error) throw resp.error;
        sbModulConfig[modulKey] = cfg;
        renderDemoModulList();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

export async function setAllDemoStatus(newStatus) {
    try {
        var resp = await _sb().from('modul_status').update({demo_status: newStatus}).neq('modul_key', 'dummy');
        if(resp.error) throw resp.error;
        _showToast('Alle Module → ' + (newStatus==='deaktiviert'?'Aus':'Demo'), 'success');
        renderDemoModulList();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

export async function setTabStatus(modulKey, tabKey, newStatus) {
    try {
        var cfg = sbModulConfig[modulKey] || {};
        if(!cfg.tabs) cfg.tabs = {};
        cfg.tabs[tabKey] = newStatus;
        var resp = await _sb().from('modul_status').update({config: cfg}).eq('modul_key', modulKey);
        if(resp.error) throw resp.error;
        sbModulConfig[modulKey] = cfg;
        renderModulStatusList();
        applyModulStatus();
    } catch(err) { console.error('setTabStatus:', err); }
}

export async function setWidgetStatus(modulKey, widgetKey, newStatus) {
    try {
        var cfg = sbModulConfig[modulKey] || {};
        if(!cfg.widgets) cfg.widgets = {};
        cfg.widgets[widgetKey] = newStatus;
        var resp = await _sb().from('modul_status').update({config: cfg}).eq('modul_key', modulKey);
        if(resp.error) throw resp.error;
        sbModulConfig[modulKey] = cfg;
        renderModulStatusList();
        applyModulStatus();
    } catch(err) { console.error('setWidgetStatus:', err); }
}

export async function setModulStatus(id, newStatus) {
    try {
        var resp = await _sb().from('modul_status').update({status: newStatus, updated_by: _sbUser() ? _sbUser().id : null}).eq('id', id);
        if(resp.error) throw resp.error;
        await loadModulStatus();
        renderModulStatusList();
    } catch(err) { alert('Fehler: ' + err.message); }
}

export async function setHqModulStatus(id, newStatus) {
    try {
        var resp = await _sb().from('modul_status').update({hq_status: newStatus, updated_by: _sbUser() ? _sbUser().id : null}).eq('id', id);
        if(resp.error) throw resp.error;
        await loadModulStatus();
        renderHqModulStatusList();
    } catch(err) { alert('Fehler: ' + err.message); }
}

export async function setHqTabStatus(modulKey, tabKey, newStatus) {
    try {
        var cfg = sbHqModulConfig[modulKey] || {};
        if(!cfg.tabs) cfg.tabs = {};
        cfg.tabs[tabKey] = newStatus;
        var resp = await _sb().from('modul_status').update({hq_config: cfg}).eq('modul_key', modulKey);
        if(resp.error) throw resp.error;
        sbHqModulConfig[modulKey] = cfg;
        renderHqModulStatusList();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

export async function setHqWidgetStatus(modulKey, widgetKey, newStatus) {
    try {
        var cfg = sbHqModulConfig[modulKey] || {};
        if(!cfg.widgets) cfg.widgets = {};
        cfg.widgets[widgetKey] = newStatus;
        var resp = await _sb().from('modul_status').update({hq_config: cfg}).eq('modul_key', modulKey);
        if(resp.error) throw resp.error;
        sbHqModulConfig[modulKey] = cfg;
        renderHqModulStatusList();
    } catch(err) { _showToast('Fehler: ' + err.message, 'error'); }
}

export function renderHqEinstellungen() {
    // Modul-Status Tab rendern
    renderModulStatusList();

    // Load HQ permissions from DB (async, re-renders when done)
    if(!window._hqRechteMatrix) {
        loadHqRechteMatrix().then(function(){ renderHqEinstellungen(); });
        return;
    }

    // Rechte-Matrix rendern
    var modules = [
        {key:'home',label:'Startseite',icon:'🏠',core:true},
        {key:'kalender',label:'Kalender',icon:'📅',core:true},
        {key:'todo',label:'Aufgaben',icon:'📋',core:true},
        {key:'kommunikation',label:'Kommunikation',icon:'💬',core:true},
        {key:'dashboards',label:'Dashboards',icon:'📊',core:false},
        {key:'allgemein',label:'Allgemein',icon:'🏢',core:false},
        {key:'verkauf',label:'Verkauf',icon:'📈',core:false},
        {key:'einkauf',label:'Einkauf',icon:'🛒',core:false},
        {key:'marketing',label:'Marketing',icon:'📣',core:false},
        {key:'controlling',label:'Controlling',icon:'📊',core:false},
        {key:'wissen',label:'Wissen',icon:'📚',core:false},
        {key:'support',label:'Support',icon:'🎫',core:false},
        {key:'aktenschrank',label:'Aktenschrank',icon:'📁',core:false},
        {key:'entwicklung',label:'Entwicklung',icon:'💻',core:false},
        {key:'shop',label:'Shop',icon:'🛍️',core:false},
        {key:'onboarding',label:'Onboarding',icon:'🎯',core:false}
    ];
    var rollen = ['inhaber','verkauf','werkstatt','buchhaltung'];

    var body = document.getElementById('rechteMatrixBody');
    if(!body) return;
    var h = '';
    modules.forEach(function(mod){
        var perms = rolePermissions[mod.key] || ['alle'];
        var isCore = mod.core;
        h += '<tr class="border-t border-gray-100 '+(isCore?'bg-green-50':'hover:bg-gray-50')+'">';
        h += '<td class="px-4 py-2.5 font-semibold text-gray-700 text-xs">'+mod.icon+' '+mod.label;
        if(isCore) h += ' <span class="text-[9px] text-green-600 font-normal">(Basis)</span>';
        h += '</td>';
        rollen.forEach(function(r){
            var isAllowed = perms.indexOf('alle')>=0 || perms.indexOf(r)>=0;
            if(isCore) {
                h += '<td class="px-4 py-2.5 text-center"><span class="text-green-500 text-lg cursor-not-allowed" title="Basis-Modul – immer aktiv">✅</span></td>';
            } else {
                h += '<td class="px-4 py-2.5 text-center"><button onclick="togglePermission(\''+mod.key+'\',\''+r+'\')" class="text-lg transition hover:scale-125" title="Klicken zum Umschalten">'+(isAllowed?'✅':'❌')+'</button></td>';
            }
        });
        h += '</tr>';
    });
    body.innerHTML = h;

    // ═══ HQ RECHTE-MATRIX ═══
    var hqBody = document.getElementById('hqRechteMatrixBody');
    if(hqBody) renderHqRechteMatrixBody(hqBody);

    // Update MA count
    var cnt = document.getElementById('settingsMaCount');
    if(cnt) cnt.textContent = kzMitarbeiter.length;
}

export function togglePermission(modKey, rolle) {
    var perms = rolePermissions[modKey];
    if(!perms) { rolePermissions[modKey] = [rolle]; renderHqEinstellungen(); return; }

    // If currently 'alle', convert to explicit list minus this role
    if(perms.indexOf('alle')>=0) {
        rolePermissions[modKey] = ['inhaber','verkauf','werkstatt','buchhaltung'].filter(function(r){return r!==rolle;});
        renderHqEinstellungen();
        return;
    }

    var idx = perms.indexOf(rolle);
    if(idx>=0) {
        perms.splice(idx,1);
        if(perms.length===0) perms.push('inhaber'); // mindestens Inhaber
    } else {
        perms.push(rolle);
    }
    // If all 4 roles selected, simplify to 'alle'
    if(perms.length===4) rolePermissions[modKey] = ['alle'];
    renderHqEinstellungen();
    // Also update sidebar immediately if user is logged in
    try { updateUIForRole(); } catch(e){}
}

// ═══ HQ RECHTE-MATRIX: Render, Load & Toggle ═══
export function renderHqRechteMatrixBody(hqBody) {
    var hqModules = [
        {key:'hqCockpit',label:'Netzwerk-Cockpit',icon:'🌐',core:true},
        {key:'hqKalender',label:'Kalender',icon:'📅',core:true},
        {key:'hqAufgaben',label:'Aufgaben',icon:'📋',core:true},
        {key:'hqKommunikation',label:'Kommunikation',icon:'💬',core:true},
        {key:'hqOffice',label:'Office',icon:'🏢',core:true},
        {key:'hqStandorte',label:'Standorte',icon:'🏪',core:false},
        {key:'hqFinanzen',label:'Finanzen',icon:'💰',core:false},
        {key:'hqMarketing',label:'Marketing',icon:'📣',core:false},
        {key:'hqKampagnen',label:'Kampagnen',icon:'🎯',core:false},
        {key:'hqHandlungsbedarf',label:'Handlungsbedarf',icon:'🚨',core:false},
        {key:'hqKommandozentrale',label:'Kommandozentrale',icon:'⚙️',core:false},
        {key:'hqDokumente',label:'Dokumente',icon:'📄',core:false},
        {key:'hqPersonal',label:'Personal',icon:'👥',core:false},
        {key:'hqBilling',label:'Abrechnung',icon:'💳',core:false},
        {key:'hqAnalytics',label:'Portal-Analytics',icon:'📈',core:false},
        {key:'hqEinstellungen',label:'Einstellungen',icon:'⚙️',core:false},
        {key:'hqFeatureFlags',label:'Feature Flags',icon:'🚩',core:false},
        {key:'hqEntwicklung',label:'Entwicklung',icon:'💻',core:false}
    ];
    // Aktions-Berechtigungen (unterhalb der Module)
    var hqActions = [
        {key:'action_impersonate',label:'Anmelden als User',icon:'🔑',core:false},
        {key:'action_delete_user',label:'User löschen',icon:'🗑️',core:false},
        {key:'action_edit_user',label:'User bearbeiten',icon:'✏️',core:false},
        {key:'action_create_user',label:'User anlegen',icon:'➕',core:false},
        {key:'action_approve_user',label:'User freigeben',icon:'✅',core:false},
        {key:'action_create_standort',label:'Standort anlegen',icon:'🏪',core:false}
    ];
    var hqRollen = ['hq_gf','hq_sales','hq_marketing','hq_einkauf','hq_support','hq_akademie','hq_hr','hq_it'];
    var hqH = '';
    // Module
    hqModules.forEach(function(mod){
        var isCore = mod.core;
        hqH += '<tr class="border-t border-gray-100 '+(isCore?'bg-green-50':'hover:bg-gray-50')+'">';
        hqH += '<td class="px-4 py-2.5 font-semibold text-gray-700 text-xs">'+mod.icon+' '+mod.label;
        if(isCore) hqH += ' <span class="text-[9px] text-green-600 font-normal">(Basis)</span>';
        hqH += '</td>';
        hqRollen.forEach(function(r){
            var isGf = (r==='hq_gf');
            if(isCore || isGf) {
                hqH += '<td class="px-4 py-2.5 text-center"><span class="text-green-500 text-lg cursor-not-allowed" title="'+(isGf?'Vollzugriff (GF)':'Basis-Modul')+'">✅</span></td>';
            } else {
                var isAllowed = window._hqRechteMatrix && window._hqRechteMatrix[mod.key] && window._hqRechteMatrix[mod.key][r];
                hqH += '<td class="px-4 py-2.5 text-center"><button onclick="toggleHqPermission(\''+mod.key+'\',\''+r+'\')" class="text-lg transition hover:scale-125" title="Klicken zum Umschalten">'+(isAllowed?'✅':'❌')+'</button></td>';
            }
        });
        hqH += '</tr>';
    });
    // Separator
    hqH += '<tr class="bg-gray-100"><td colspan="9" class="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">⚡ Aktionen</td></tr>';
    // Aktions-Berechtigungen
    hqActions.forEach(function(act){
        hqH += '<tr class="border-t border-gray-100 hover:bg-orange-50/50">';
        hqH += '<td class="px-4 py-2.5 font-semibold text-gray-700 text-xs">'+act.icon+' '+act.label+'</td>';
        hqRollen.forEach(function(r){
            var isGf = (r==='hq_gf');
            if(isGf) {
                hqH += '<td class="px-4 py-2.5 text-center"><span class="text-green-500 text-lg cursor-not-allowed" title="Vollzugriff (GF)">✅</span></td>';
            } else {
                var isAllowed = window._hqRechteMatrix && window._hqRechteMatrix[act.key] && window._hqRechteMatrix[act.key][r];
                hqH += '<td class="px-4 py-2.5 text-center"><button onclick="toggleHqPermission(\''+act.key+'\',\''+r+'\')" class="text-lg transition hover:scale-125" title="Klicken zum Umschalten">'+(isAllowed?'✅':'❌')+'</button></td>';
            }
        });
        hqH += '</tr>';
    });
    hqBody.innerHTML = hqH;
}

export async function loadHqRechteMatrix() {
    try {
        var resp = await _sb().from('modul_berechtigungen').select('modul, hat_zugriff, rolle_id, rollen(name)').eq('hat_zugriff', true);
        if(resp.error) { console.error('[HQ Matrix] Load error:', resp.error); }
        window._hqRechteMatrix = {};
        (resp.data || []).forEach(function(p){
            var roleName = p.rollen ? p.rollen.name : null;
            if(!roleName || !roleName.startsWith('hq_')) return;
            if(!window._hqRechteMatrix[p.modul]) window._hqRechteMatrix[p.modul] = {};
            window._hqRechteMatrix[p.modul][roleName] = true;
        });
        console.log('[HQ Matrix] Loaded:', JSON.stringify(window._hqRechteMatrix).substring(0, 200));
    } catch(e) { console.warn('loadHqRechteMatrix error:', e); window._hqRechteMatrix = {}; }
}

var _hqToggling = false;
export async function toggleHqPermission(modKey, rolle) {
    if(_hqToggling) return;
    _hqToggling = true;
    console.log('[HQ Toggle]', modKey, rolle);
    try {
        var rolleResp = await _sb().from('rollen').select('id').eq('name', rolle).single();
        if(!rolleResp.data) { _showToast('Rolle nicht gefunden: ' + rolle, 'error'); _hqToggling=false; return; }
        if(rolleResp.error) { _showToast('DB-Fehler: ' + rolleResp.error.message, 'error'); _hqToggling=false; return; }
        var rolleId = rolleResp.data.id;
        var isCurrentlyAllowed = window._hqRechteMatrix && window._hqRechteMatrix[modKey] && window._hqRechteMatrix[modKey][rolle];
        if(isCurrentlyAllowed) {
            var delResp = await _sb().from('modul_berechtigungen').delete().eq('modul', modKey).eq('rolle_id', rolleId);
            if(delResp.error) { _showToast('Löschen fehlgeschlagen: ' + delResp.error.message, 'error'); _hqToggling=false; return; }
            if(window._hqRechteMatrix[modKey]) delete window._hqRechteMatrix[modKey][rolle];
            _showToast('❌ ' + modKey + ' → ' + rolle + ' entfernt', 'warning');
        } else {
            var insResp = await _sb().from('modul_berechtigungen').upsert({modul: modKey, rolle_id: rolleId, hat_zugriff: true}, {onConflict: 'modul,rolle_id'});
            if(insResp.error) { _showToast('Speichern fehlgeschlagen: ' + insResp.error.message, 'error'); _hqToggling=false; return; }
            if(!window._hqRechteMatrix[modKey]) window._hqRechteMatrix[modKey] = {};
            window._hqRechteMatrix[modKey][rolle] = true;
            _showToast('✅ ' + modKey + ' → ' + rolle + ' aktiviert', 'success');
        }
        console.log('[HQ Toggle] Success:', modKey, rolle, isCurrentlyAllowed ? 'removed' : 'added');
        // Re-render the matrix only (not full settings)
        var hqBody = document.getElementById('hqRechteMatrixBody');
        if(hqBody) renderHqRechteMatrixBody(hqBody);
    } catch(e) { console.error('[HQ Toggle Error]', e); _showToast('Fehler: ' + e.message, 'error'); }
    _hqToggling = false;
}



// Strangler Fig
// === KOMMANDOZENTRALE TAB SWITCHING ===
var currentKzStdFilter = 'all';
var currentKzMaFilter = 'all';
var kzMitarbeiter = [];

export function showKommandoTab(tab) {
    document.querySelectorAll('.kommando-tab-content').forEach(function(el){el.style.display='none';});
    document.querySelectorAll('.kommando-tab-btn').forEach(function(b){
        b.className='kommando-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
    });
    var tabEl=document.getElementById('kommandoTab'+tab.charAt(0).toUpperCase()+tab.slice(1));
    if(tabEl)tabEl.style.display='block';
    var btn=document.querySelector('.kommando-tab-btn[data-ktab="'+tab+'"]');
    if(btn)btn.className='kommando-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
    if(tab==='standorte') renderKzStandorte();
    if(tab==='mitarbeiter') renderKzMitarbeiter();
    if(tab==='kommunikation' && typeof window.renderHqKomm==='function') window.renderHqKomm();
    if(tab==='kampagnen' && typeof window.renderHqKampagnen==='function') window.renderHqKampagnen();
    if(tab==='dokumente' && typeof window.loadNetzwerkDokumente==='function') window.loadNetzwerkDokumente();
    if(tab==='kalender' && typeof window.loadHqKalTermine==='function') window.loadHqKalTermine();
    if(tab==='aufgaben' && typeof window.renderHqAufgaben==='function') window.renderHqAufgaben();
}

export function filterKzStandorte(f) {
    currentKzStdFilter=f;
    document.querySelectorAll('.kz-std-filter').forEach(function(b){b.className='kz-std-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn=document.querySelector('.kz-std-filter[data-kzf="'+f+'"]');
    if(btn)btn.className='kz-std-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderKzStandorte();
}
export function filterKzMa(f) {
    currentKzMaFilter=f;
    document.querySelectorAll('.kz-ma-filter').forEach(function(b){b.className='kz-ma-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn=document.querySelector('.kz-ma-filter[data-kzmf="'+f+'"]');
    if(btn)btn.className='kz-ma-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderKzMitarbeiter();
}

function statusBadge(s) {
    if(s==='aktiv') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">\u{1F7E2} Aktiv</span>';
    if(s==='demo') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 animate-pulse">\u{1F534} Demo</span>';
    if(s==='onboarding') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">\u{1F535} Onboarding</span>';
    if(s==='pending') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700">\u23F3 Wartet</span>';
    if(s==='gesperrt') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">\u{1F6AB} Gesperrt</span>';
    if(s==='offboarding') return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">\u{1F534} Offboarding</span>';
    return s;
}
function rolleBadge(r) {
    var colors = {'inhaber':'bg-vit-orange text-white','verkauf':'bg-blue-100 text-blue-700','werkstatt':'bg-gray-200 text-gray-700','buchhaltung':'bg-purple-100 text-purple-700','hq':'bg-red-100 text-red-700','hq_gf':'bg-yellow-100 text-yellow-800','hq_sales':'bg-blue-100 text-blue-700','hq_marketing':'bg-pink-100 text-pink-700','hq_einkauf':'bg-cyan-100 text-cyan-700','hq_support':'bg-purple-100 text-purple-700','hq_akademie':'bg-emerald-100 text-emerald-700','hq_hr':'bg-rose-100 text-rose-700','hq_it':'bg-slate-200 text-slate-700','owner':'bg-amber-100 text-amber-800'};
    var labels = {'inhaber':'Gesch\u00e4ftsleitung','verkauf':'Verkauf','werkstatt':'Werkstatt','buchhaltung':'Buchhaltung','hq':'HQ','hq_gf':'Gesch\u00e4ftsf\u00fchrung','hq_sales':'Sales','hq_marketing':'Marketing','hq_einkauf':'Einkauf','hq_support':'Support','hq_akademie':'Akademie','hq_hr':'HR','hq_it':'IT / Systemadmin','owner':'Owner'};
    return '<span class="px-2 py-1 rounded-full text-[10px] font-semibold '+(colors[r]||'bg-gray-100 text-gray-600')+'">'+(labels[r]||r)+'</span>';
}
function rollenBadges(rollen) {
    return rollen.map(function(r){ return rolleBadge(r); }).join(' ');
}

export async function renderKzStandorte() {
    var body=document.getElementById('kzStandorteBody');
    if(!body)return;
    try {
        var resp = await _sb().from('standorte').select('*').order('name');
        if(resp.error) throw resp.error;
        var standorte = resp.data || [];
        var countResp = await _sb().from('users').select('standort_id');
        var userCounts = {};
        (countResp.data||[]).forEach(function(u){ if(u.standort_id) userCounts[u.standort_id] = (userCounts[u.standort_id]||0)+1; });
        var filter = currentKzStdFilter || 'all';
        var h='';
        standorte.forEach(function(s){
            var st = s.status || 'aktiv';
            if(filter!=='all' && st!==filter) return;
            var d = s.created_at ? new Date(s.created_at) : new Date();
            var beitritt = String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
            h+='<tr class="border-t border-gray-100 hover:bg-gray-50">';
            h+='<td class="px-4 py-3 font-semibold text-gray-800">'+s.name+'</td>';
            h+='<td class="px-4 py-3 text-gray-600">'+(s.adresse||s.region||'')+'</td>';
            h+='<td class="px-4 py-3 text-center"><span class="text-xs px-2 py-0.5 rounded '+(s.warenwirtschaft?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-400')+'">'+(s.warenwirtschaft||'—')+'</span></td>';
            h+='<td class="px-4 py-3 text-center">'+statusBadge(st)+'</td>';
            h+='<td class="px-4 py-3 text-center font-semibold">'+(userCounts[s.id]||0)+'</td>';
            h+='<td class="px-4 py-3 text-center text-gray-500 text-xs">'+beitritt+'</td>';
            h+='<td class="px-4 py-3 text-center text-xs text-gray-500">'+(s.telefon||'\u2014')+'</td>';
            h+='<td class="px-4 py-3 text-center"><button class="text-xs text-vit-orange hover:underline font-semibold" onclick="alert(\''+s.name+'\\nAdresse: '+(s.adresse||'\u2014')+'\\nTelefon: '+(s.telefon||'\u2014')+'\\nSlug: '+s.slug+'\')">Details \u2192</button></td>';
            h+='</tr>';
        });
        if(standorte.length===0) h='<tr><td colspan="8" class="text-center py-8 text-gray-400">Keine Standorte.</td></tr>';
        body.innerHTML=h;
        var ge=document.getElementById('kzStandorteGesamt');if(ge)ge.textContent=standorte.length;
        var ak=document.getElementById('kzStandorteAktiv');if(ak)ak.textContent=standorte.filter(function(s){return (s.status||'aktiv')==='aktiv';}).length;
        var ob=document.getElementById('kzStandorteOnb');if(ob)ob.textContent=standorte.filter(function(s){return s.status==='onboarding';}).length;
        var of2=document.getElementById('kzStandorteOff');if(of2)of2.textContent=standorte.filter(function(s){return s.status==='offboarding';}).length;
    } catch(err) { console.error('Standorte:', err); body.innerHTML='<tr><td colspan="8" class="text-center py-4 text-red-400">Fehler: '+err.message+'</td></tr>'; }
}

export async function renderKzMitarbeiter() {
    var body=document.getElementById('kzMaBody');
    if(!body)return;
    try {
        var resp = await _sb().from('users').select('*, standorte(name), user_rollen(rollen(name,label))').order('name');
        if(resp.error) throw resp.error;
        var users = resp.data || [];
        var stdFilter=(document.getElementById('kzMaStandortFilter')||{}).value||'all';
        var filter = currentKzMaFilter || 'all';
        var list = users.filter(function(u){
            var st = u.status || 'aktiv';
            if(filter!=='all' && st!==filter) return false;
            var stdName = u.standorte ? u.standorte.name : 'HQ';
            if(stdFilter!=='all' && stdName!==stdFilter) return false;
            return true;
        });
        kzMitarbeiter = list;
        var h='';
        list.forEach(function(u){
            var stdName = u.standorte ? u.standorte.name : 'HQ';
            var rollen = (u.user_rollen||[]).map(function(ur){ return ur.rollen ? ur.rollen.name : ''; }).filter(Boolean);
            var st = u.status || 'aktiv';
            var d = u.created_at ? new Date(u.created_at) : new Date();
            var eintritt = String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
            var actionBtn = '';
            if((st === 'onboarding' || st === 'pending') && rollen.length === 0) {
                actionBtn = '<button class="text-xs px-3 py-1 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600" onclick="approveUser(\''+u.id+'\',\''+u.name.replace(/'/g,"\\'")+'\')">Freigeben</button>';
            } else {
                actionBtn = '<button class="text-xs text-vit-orange hover:underline font-semibold" onclick="openEditMaModal(\''+u.id+'\')">✏️</button>'
                +' <button class="text-xs text-blue-500 hover:text-blue-700 hover:underline font-semibold ml-1" onclick="loginAs(\''+u.id+'\',\''+u.email+'\',\''+u.name.replace(/'/g,"\\'")+'\')">🔑</button>'
                +' <button class="text-xs text-red-400 hover:text-red-600 hover:underline font-semibold ml-1" onclick="deleteMa(\''+u.id+'\',\''+u.name.replace(/'/g,"\\'")+'\')">🗑️</button>';
            }
            h+='<tr class="border-t border-gray-100 hover:bg-gray-50'+((st==='onboarding' || st==='pending') && rollen.length===0 ? ' bg-yellow-50':'')+'">';
            h+='<td class="px-4 py-3"><div class="flex items-center space-x-2"><img src="https://ui-avatars.com/api/?name='+encodeURIComponent(u.name)+'&background=EF7D00&color=fff&size=28" class="w-7 h-7 rounded-full"><div><span class="font-semibold text-gray-800">'+u.name+'</span><p class="text-[10px] text-gray-400">'+u.email+'</p></div></div></td>';
            h+='<td class="px-4 py-3 text-gray-600 text-xs">'+stdName+'</td>';
            h+='<td class="px-4 py-3 text-center">'+(rollen.length > 0 ? rollenBadges(rollen) : '<span class="text-xs text-yellow-600 font-semibold">Wartet auf Freigabe</span>')+(u.is_beta ? ' <span class="text-[9px] bg-purple-500 text-white rounded px-1 py-0.5 font-bold">BETA</span>' : '')+'</td>';
            h+='<td class="px-4 py-3 text-center">'+statusBadge(st)+'</td>';
            h+='<td class="px-4 py-3 text-center text-gray-500 text-xs">'+eintritt+'</td>';
            h+='<td class="px-4 py-3 text-center"><span class="text-xs text-gray-400">'+(u.user_rollen||[]).map(function(ur){return ur.rollen?ur.rollen.label:'';}).filter(Boolean).join(', ')+'</span></td>';
            h+='<td class="px-4 py-3 text-center">'+actionBtn+'</td>';
            h+='</tr>';
        });
        if(list.length===0) h='<tr><td colspan="7" class="text-center py-8 text-gray-400">Keine Mitarbeiter gefunden.</td></tr>';
        body.innerHTML=h;
        var ge=document.getElementById('kzMaGesamt');if(ge)ge.textContent=users.length;
        var ak=document.getElementById('kzMaAktiv');if(ak)ak.textContent=users.filter(function(u){return (u.status||'aktiv')==='aktiv';}).length;
        var onbCount = users.filter(function(u){return u.status==='onboarding';}).length;
        var ob=document.getElementById('kzMaOnb');if(ob)ob.textContent=onbCount;
        var of2=document.getElementById('kzMaOff');if(of2)of2.textContent=users.filter(function(u){return u.status==='offboarding';}).length;
        var ro=document.getElementById('kzRollen');if(ro)ro.textContent='4';
        var sel=document.getElementById('kzMaStandortFilter');
        if(sel && sel.options.length<=1){
            var standorte=[];
            users.forEach(function(u){ var sn=u.standorte?u.standorte.name:'HQ'; if(standorte.indexOf(sn)===-1)standorte.push(sn); });
            standorte.sort().forEach(function(s){sel.innerHTML+='<option value="'+s+'">'+s+'</option>';});
        }
    } catch(err) { console.error('Mitarbeiter:', err); body.innerHTML='<tr><td colspan="7" class="text-center py-4 text-red-400">Fehler: '+err.message+'</td></tr>'; }
}

// ==================== BETA USER MANAGEMENT ====================

var _betaUsersCache = {};

export async function openBetaUsersModal(modulKey, modulName) {
    var modal = document.getElementById('approveModal');
    if(!modal) return;
    modal.style.display = 'flex';
    var inner = modal.querySelector('.modal-inner') || modal.querySelector('[class*="bg-white"]') || modal;
    if(inner === modal) {
        modal.innerHTML = '<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto p-6 modal-inner"></div></div>';
        inner = modal.querySelector('.modal-inner');
    }
    inner.innerHTML = '<div class="flex justify-center py-8"><div class="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div></div>';

    try {
        var s = _sb();
        // Load current beta users for this module
        var {data:betaUsers, error:e1} = await s.from('modul_beta_users').select('*, user:user_id(id, email, raw_user_meta_data)').eq('modul_key', modulKey);
        if(e1) throw e1;
        // Load all users for selection
        var {data:allUsers, error:e2} = await s.from('users').select('id, vorname, nachname, email, standort_id, standorte(name)').eq('status','active').order('nachname');
        if(e2) throw e2;

        var betaUserIds = (betaUsers||[]).map(function(b){ return b.user_id; });

        var html = '<div class="flex items-center justify-between mb-4">';
        html += '<div><h2 class="text-lg font-bold text-gray-800">🧪 Beta-Tester: ' + modulName + '</h2>';
        html += '<p class="text-xs text-gray-500">' + (betaUsers||[]).length + ' User haben Beta-Zugang</p></div>';
        html += '<button onclick="document.getElementById(\'approveModal\').style.display=\'none\'" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>';

        // Current beta users
        if(betaUsers && betaUsers.length) {
            html += '<div class="mb-4"><div class="text-xs font-bold text-purple-600 uppercase mb-2">Aktive Beta-Tester</div>';
            html += '<div class="space-y-1">';
            betaUsers.forEach(function(b) {
                var meta = (b.user && b.user.raw_user_meta_data) || {};
                var name = (meta.vorname||'') + ' ' + (meta.nachname||b.user_id);
                var email = b.user ? b.user.email : '';
                html += '<div class="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">';
                html += '<div class="w-7 h-7 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center text-xs font-bold">' + (name.charAt(0)||'?') + '</div>';
                html += '<div class="flex-1 min-w-0"><span class="text-sm font-medium text-gray-800">' + name.trim() + '</span>';
                if(email) html += '<span class="text-[10px] text-gray-400 ml-2">' + email + '</span>';
                html += '</div>';
                html += '<button onclick="removeBetaUser(\'' + b.id + '\',\'' + modulKey + '\',\'' + modulName.replace(/'/g,"") + '\')" class="text-red-400 hover:text-red-600 text-xs px-2 py-1 hover:bg-red-50 rounded">✕ Entfernen</button>';
                html += '</div>';
            });
            html += '</div></div>';
        }

        // Add new beta users
        html += '<div class="border-t pt-3"><div class="text-xs font-bold text-gray-600 uppercase mb-2">User hinzufügen</div>';
        html += '<input type="text" id="betaUserSearch" placeholder="Name oder Email suchen..." class="w-full border rounded-lg px-3 py-2 text-sm mb-2" oninput="filterBetaUserList(\'' + modulKey + '\')">';
        html += '<div id="betaUserList" class="max-h-48 overflow-y-auto space-y-1">';
        (allUsers||[]).forEach(function(u) {
            var isBeta = betaUserIds.indexOf(u.id) !== -1;
            if(isBeta) return; // Schon Beta
            var name = (u.vorname||'') + ' ' + (u.nachname||'');
            var standort = u.standorte ? u.standorte.name : 'HQ';
            html += '<div class="beta-user-option flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer" data-name="' + name.toLowerCase() + '" data-email="' + (u.email||'').toLowerCase() + '" onclick="addBetaUser(\'' + u.id + '\',\'' + modulKey + '\',\'' + modulName.replace(/'/g,"") + '\')">';
            html += '<div class="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">' + (name.charAt(0)||'?') + '</div>';
            html += '<div class="flex-1"><span class="text-sm text-gray-700">' + name.trim() + '</span>';
            html += '<span class="text-[10px] text-gray-400 ml-2">' + standort + '</span></div>';
            html += '<span class="text-purple-500 text-xs">+ Hinzufügen</span>';
            html += '</div>';
        });
        html += '</div></div>';

        inner.innerHTML = html;
    } catch(e) {
        inner.innerHTML = '<p class="text-red-600 p-4">Fehler: ' + e.message + '</p>';
    }
}

export function filterBetaUserList() {
    var search = (document.getElementById('betaUserSearch')||{}).value||'';
    search = search.toLowerCase();
    document.querySelectorAll('.beta-user-option').forEach(function(el) {
        var name = el.getAttribute('data-name') || '';
        var email = el.getAttribute('data-email') || '';
        el.style.display = (!search || name.indexOf(search) !== -1 || email.indexOf(search) !== -1) ? '' : 'none';
    });
}

export async function addBetaUser(userId, modulKey, modulName) {
    try {
        var {error} = await _sb().from('modul_beta_users').insert({
            modul_key: modulKey,
            user_id: userId,
            granted_by: _sbUser() ? _sbUser().id : null
        });
        if(error) throw error;
        openBetaUsersModal(modulKey, modulName); // Refresh
    } catch(e) { 
        if(e.message && e.message.indexOf('duplicate') !== -1) { alert('User ist bereits Beta-Tester'); }
        else { alert('Fehler: ' + e.message); }
    }
}

export async function removeBetaUser(betaId, modulKey, modulName) {
    if(!confirm('Beta-Zugang entfernen?')) return;
    try {
        var {error} = await _sb().from('modul_beta_users').delete().eq('id', betaId);
        if(error) throw error;
        openBetaUsersModal(modulKey, modulName); // Refresh
    } catch(e) { alert('Fehler: ' + e.message); }
}

const _exports = {approveUser,switchApproveEbene,closeApproveModal,confirmApprove,rejectUser,openRollenModal,closeRollenModal,saveRollen,getStandortName,getPartnerMitarbeiter,filterPartnerMa,showMaTab,renderPartnerMitarbeiter,openEmployeeToolsModal,closeEmpToolsModal,saveEmployeeTools,openEditEmployeeModal,closeEditEmpModal,saveEditEmployee,renderMaToolsMatrix,renderMaKosten,deactivateMa,openNeuerMaModal,switchNewMaEbene,closeNeuerMaModal,switchNewMaEmailType,updateNewMaEmail,saveNeuerMa,openEditMaModal,switchEditEbene,closeEditMaModal,saveEditMa,loginAs,deleteMa,openNeuerStandortModal,closeNeuerStdModal,saveNeuerStandort,showSettingsTab,renderModulStatusList,renderHqModulStatusList,_renderModulRow,toggleModuleExpand,renderOfficeRoomsAdmin,renderDemoModulList,setDemoModulStatus,setDemoTabStatus,setDemoWidgetStatus,setAllDemoStatus,setTabStatus,setWidgetStatus,setModulStatus,setHqModulStatus,setHqTabStatus,setHqWidgetStatus,renderHqEinstellungen,togglePermission,renderHqRechteMatrixBody,loadHqRechteMatrix,toggleHqPermission,showKommandoTab,filterKzStandorte,filterKzMa,renderKzStandorte,renderKzMitarbeiter,openBetaUsersModal,filterBetaUserList,addBetaUser,removeBetaUser};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[user-management.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');

// === Window Exports (onclick handlers) ===
window.filterPartnerMa = filterPartnerMa;
window.openNeuerMaModal = openNeuerMaModal;
window.openNeuerStandortModal = openNeuerStandortModal;
window.setAllDemoStatus = setAllDemoStatus;
window.showMaTab = showMaTab;
window.showKommandoTab = showKommandoTab;
window.filterKzMa = filterKzMa;
window.filterKzStandorte = filterKzStandorte;
window.renderKzMitarbeiter = renderKzMitarbeiter;
