/**
 * views/user-employees.js - Partner-Mitarbeiter-Verwaltung, Rollen-Modal, Tools, Kosten
 * @module views/user-employees
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

// === ROLLEN-MODAL ===
export function openRollenModal(maIdx) {
    var kzMitarbeiter = window._umKzMitarbeiter || [];
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
    var kzMitarbeiter = window._umKzMitarbeiter || [];
    var allRollen = ['hq','inhaber','verkauf','werkstatt','buchhaltung'];
    var selected = [];
    allRollen.forEach(function(r){
        var chk = document.getElementById('roleChk_'+r);
        if(chk && chk.checked) selected.push(r);
    });
    if(selected.length===0) { _showToast('Mindestens eine Rolle muss zugewiesen werden.', 'info'); return; }
    kzMitarbeiter[maIdx].rollen = selected;
    closeRollenModal();
    window.renderKzMitarbeiter();

    var labels = {'hq':'HQ','inhaber':'Geschäftsleitung','verkauf':'Verkauf','werkstatt':'Werkstatt','buchhaltung':'Buchhaltung'};
    var names = selected.map(function(r){return labels[r];}).join(', ');
    _showToast('Rollen für '+kzMitarbeiter[maIdx].name+' gespeichert: '+names, 'success');
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
    var kzMitarbeiter = window._umKzMitarbeiter || [];
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

// Expose empCache for other sub-modules
window._umEmpCache = _empCache;

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
        var stdId = (_sbStandort()&&_sbStandort().id) ? _sbStandort().id : null;
        var isHQ = currentRoles.indexOf('hq')>=0||(_sbProfile() &&_sbProfile().is_hq);
        var empQ = _sb().from('employees').select('*, employee_tools(*, product:billing_products(name, key, default_amount))').order('nachname');
        if(stdId && !isHQ) empQ = empQ.eq('standort_id', stdId);
        var empResp = await empQ;
        if(empResp.error) throw empResp.error;
        var emps = empResp.data || [];

        // Auto-Check: Gekündigte MA mit abgelaufenem Austrittsdatum → ausgeschieden + Account sperren
        var today = new Date().toISOString().slice(0,10);
        for(var ai = 0; ai < emps.length; ai++) {
            var ae = emps[ai];
            if(ae.status === 'gekündigt' && ae.austrittsdatum && ae.austrittsdatum <= today) {
                try {
                    await _sb().from('employees').update({ status: 'ausgeschieden', updated_at: new Date().toISOString() }).eq('id', ae.id);
                    ae.status = 'ausgeschieden';
                    // Account sperren
                    if(ae.email) {
                        var uResp = await _sb().from('users').select('id').eq('email', ae.email).single();
                        if(uResp.data) await _sb().from('users').update({ status: 'offboarding' }).eq('id', uResp.data.id);
                    }
                    // Tools deaktivieren
                    await _sb().from('employee_tools').update({ is_active: false, deactivated_at: today, updated_at: new Date().toISOString() }).eq('employee_id', ae.id).eq('is_active', true);
                    _showToast(ae.vorname + ' ' + ae.nachname + ' ist ausgeschieden – Account gesperrt', 'warning');
                } catch(autoErr) { console.warn('Auto-Offboard fehlgeschlagen:', autoErr); }
            }
        }

        _empCache = emps;
        window._umEmpCache = _empCache;
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
    } catch(err) { console.error('MA:', err); container.innerHTML='<div class="text-red-400 p-4">Fehler: '+_escH(err.message)+'</div>'; }
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
    html+='<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold text-gray-800">✏️ Mitarbeiter bearbeiten</h3><button onclick="closeEditEmpModal()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>';
    html+='<div class="space-y-3">';
    html+='<div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-semibold text-gray-600 mb-1">Vorname</label><input id="editEmpVorname" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value="'+_escH(emp.vorname)+'"></div>';
    html+='<div><label class="block text-xs font-semibold text-gray-600 mb-1">Nachname</label><input id="editEmpNachname" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value="'+_escH(emp.nachname)+'"></div></div>';
    html+='<div><label class="block text-xs font-semibold text-gray-600 mb-1">E-Mail</label><input id="editEmpEmail" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value="'+_escH(emp.email||'')+'"></div>';
    html+='<div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-semibold text-gray-600 mb-1">Position</label><input id="editEmpPosition" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value="'+_escH(emp.position||'')+'"></div>';
    html+='<div><label class="block text-xs font-semibold text-gray-600 mb-1">Abteilung</label><select id="editEmpAbt" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="Verkauf"'+(emp.abteilung==='Verkauf'?' selected':'')+'>Verkauf</option><option value="Werkstatt"'+(emp.abteilung==='Werkstatt'?' selected':'')+'>Werkstatt</option><option value="Verwaltung"'+(emp.abteilung==='Verwaltung'?' selected':'')+'>Verwaltung</option><option value="Sonstiges"'+(emp.abteilung==='Sonstiges'?' selected':'')+'>Sonstiges</option></select></div></div>';
    // Status (ohne "inaktiv" – wird durch Löschen ersetzt)
    html+='<div class="grid grid-cols-2 gap-3"><div><label class="block text-xs font-semibold text-gray-600 mb-1">Status</label><select id="editEmpStatus" onchange="window._onEmpStatusChange()" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">';
    html+='<option value="aktiv"'+(emp.status==='aktiv'?' selected':'')+'>Aktiv</option>';
    var isGekuendigt = (emp.status==='gekündigt');
    html+='<option value="gekündigt"'+(isGekuendigt?' selected':'')+'>Gekündigt</option>';
    html+='<option value="ausgeschieden"'+(emp.status==='ausgeschieden'?' selected':'')+'>Ausgeschieden</option>';
    html+='</select></div>';
    html+='<div><label class="block text-xs font-semibold text-gray-600 mb-1">Anstelldatum</label><input id="editEmpStart" type="date" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" value="'+(emp.anstelldatum||'')+'"></div></div>';
    // Kündigungs-Block (sichtbar bei gekündigt)
    var today = new Date().toISOString().slice(0,10);
    html+='<div id="editEmpKuendigungBlock" style="display:'+(isGekuendigt?'block':'none')+'" class="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">';
    html+='<p class="text-xs font-bold text-red-700">⚠️ Kündigung</p>';
    html+='<div><label class="block text-xs font-semibold text-red-600 mb-1">Letzter Arbeitstag *</label>';
    html+='<input id="editEmpEnd" type="date" class="w-full px-3 py-2 border border-red-300 rounded-lg text-sm bg-white" value="'+(emp.austrittsdatum||'')+'" min="'+today+'"></div>';
    // Aktive Tools anzeigen
    var activeTools = (emp.employee_tools||[]).filter(function(t){return t.is_active;});
    if(activeTools.length > 0) {
        html+='<p class="text-[10px] text-red-600 font-semibold">'+activeTools.length+' aktive Tool(s) werden zum Austrittsdatum gekündigt:</p>';
        html+='<div class="flex flex-wrap gap-1">';
        activeTools.forEach(function(t){ html+='<span class="text-[9px] bg-red-100 text-red-700 rounded px-1.5 py-0.5">'+_escH(t.product_key)+'</span>'; });
        html+='</div>';
    }
    html+='<p class="text-[10px] text-red-500">Am letzten Arbeitstag wird der Account automatisch gesperrt.</p>';
    html+='</div>';
    // Info bei ausgeschieden
    if(emp.status === 'ausgeschieden') {
        html+='<div class="bg-gray-100 border border-gray-200 rounded-lg p-3">';
        html+='<p class="text-xs text-gray-500">🔒 Ausgeschieden am: <strong>'+(emp.austrittsdatum ? new Date(emp.austrittsdatum).toLocaleDateString('de-DE') : 'unbekannt')+'</strong></p>';
        html+='</div>';
    }
    html+='</div>';
    html+='<div id="editEmpError" style="display:none" class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mt-3"></div>';
    html+='<div class="flex space-x-3 mt-4"><button onclick="saveEditEmployee(\''+empId+'\')" id="saveEditEmpBtn" class="flex-1 py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">Speichern</button>';
    html+='<button onclick="closeEditEmpModal()" class="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Abbrechen</button></div>';
    html+='</div></div>';
    var c=document.createElement('div');c.id='editEmpContainer';c.innerHTML=html;document.body.appendChild(c);
}
// Toggle Kündigungsblock bei Statuswechsel
window._onEmpStatusChange = function() {
    var status = (document.getElementById('editEmpStatus')||{}).value;
    var block = document.getElementById('editEmpKuendigungBlock');
    if(block) block.style.display = (status === 'gekündigt') ? 'block' : 'none';
};
export function closeEditEmpModal(){var c=document.getElementById('editEmpContainer');if(c)c.remove();}
export async function saveEditEmployee(empId){
    var btn=document.getElementById('saveEditEmpBtn');
    var errEl=document.getElementById('editEmpError');
    if(btn){btn.disabled=true;btn.textContent='Speichern...';}
    if(errEl) errEl.style.display='none';
    var newStatus = document.getElementById('editEmpStatus').value;
    var austrittsdatum = (document.getElementById('editEmpEnd')||{}).value || null;
    // Validierung: Gekündigt braucht Austrittsdatum
    if(newStatus === 'gekündigt' && !austrittsdatum) {
        if(errEl){errEl.textContent='Bitte den letzten Arbeitstag eintragen.';errEl.style.display='block';}
        if(btn){btn.disabled=false;btn.textContent='Speichern';}
        return;
    }
    try{
        var emp = _empCache.find(function(e){return e.id===empId;});
        // 1. Employee-Record updaten
        await _sb().from('employees').update({
            vorname: document.getElementById('editEmpVorname').value.trim(),
            nachname: document.getElementById('editEmpNachname').value.trim(),
            email: document.getElementById('editEmpEmail').value.trim()||null,
            position: document.getElementById('editEmpPosition').value.trim()||null,
            abteilung: document.getElementById('editEmpAbt').value,
            status: newStatus,
            anstelldatum: document.getElementById('editEmpStart').value||null,
            austrittsdatum: austrittsdatum,
            updated_at: new Date().toISOString()
        }).eq('id', empId);
        // 2. Bei Kündigung: Alle aktiven Tools zum Austrittsdatum kündigen
        if(newStatus === 'gekündigt' && austrittsdatum) {
            var toolsResp = await _sb().from('employee_tools')
                .select('id, product_key, is_active, cancellation_requested_at')
                .eq('employee_id', empId).eq('is_active', true);
            var activeToolsList = (toolsResp.data || []).filter(function(t){ return !t.cancellation_requested_at; });
            if(activeToolsList.length > 0) {
                var todayStr = new Date().toISOString().slice(0,10);
                for(var i = 0; i < activeToolsList.length; i++) {
                    await _sb().from('employee_tools').update({
                        cancellation_requested_at: todayStr,
                        cancellation_effective_at: austrittsdatum,
                        cancelled_by: _sbUser() ? _sbUser().id : null,
                        updated_at: new Date().toISOString()
                    }).eq('id', activeToolsList[i].id);
                }
                _showToast(activeToolsList.length + ' Tool(s) zum ' + new Date(austrittsdatum).toLocaleDateString('de-DE') + ' gekündigt', 'info');
            }
        }
        // 3. Bei Ausgeschieden: Account sperren + alle Tools deaktivieren
        if(newStatus === 'ausgeschieden' && emp && emp.email) {
            var userResp = await _sb().from('users').select('id').eq('email', emp.email).single();
            if(userResp.data) {
                await _sb().from('users').update({ status: 'offboarding', updated_at: new Date().toISOString() }).eq('id', userResp.data.id);
                _showToast('Account von ' + emp.vorname + ' ' + emp.nachname + ' gesperrt', 'warning');
            }
            await _sb().from('employee_tools').update({
                is_active: false, deactivated_at: new Date().toISOString().slice(0,10), updated_at: new Date().toISOString()
            }).eq('employee_id', empId).eq('is_active', true);
        }
        closeEditEmpModal();
        await renderPartnerMitarbeiter();
        _showToast('✅ Mitarbeiter aktualisiert', 'success');
    }catch(err){
        if(errEl){errEl.textContent='Fehler: '+(err.message||err);errEl.style.display='block';}
        if(btn){btn.disabled=false;btn.textContent='Speichern';}
    }
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
        var stdId=(_sbStandort()&&_sbStandort().id)?_sbStandort().id:null;
        if(!stdId){el.innerHTML='<div class="text-center py-8 text-gray-400">Standort-Kontext ben\u00f6tigt.</div>';return;}
        var resp=await _sb().rpc('calculate_monthly_billing',{p_standort_id:stdId});
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
    }catch(err){el.innerHTML='<div class="text-red-400 p-4">Fehler: '+_escH(err.message)+'</div>';}
}

export function deactivateMa(idx) {
    // Deprecated - use openEditEmployeeModal instead
}

// Strangler Fig
const _exports = { openRollenModal, closeRollenModal, saveRollen, getStandortName, getPartnerMitarbeiter, filterPartnerMa, showMaTab, renderPartnerMitarbeiter, openEmployeeToolsModal, closeEmpToolsModal, saveEmployeeTools, openEditEmployeeModal, closeEditEmpModal, saveEditEmployee, renderMaToolsMatrix, renderMaKosten, deactivateMa };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
