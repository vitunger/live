/**
 * views/user-create-edit.js - Neuer Mitarbeiter, Bearbeiten, Login-As, Löschen, Neuer Standort
 * @module views/user-create-edit
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

// Neuer Mitarbeiter Modal
var newMaEbene = 'standort';
var newMaEmailTypeValue = 'vitbikes';
var editMaEbene = 'standort';

export async function openNeuerMaModal() {
    var isHQ = currentRoles.indexOf('hq') >= 0 || (_sbProfile() && _sbProfile().is_hq);
    if(isHQ && !hqCan('create_user')) { _showToast('Keine Berechtigung zum Anlegen von Mitarbeitern', 'error'); return; }
    newMaEbene = 'standort';

    // Ensure sbStandort is set for GF/Partner users
    if(!_sbStandort() && _sbProfile() && _sbProfile().standort_id) {
        // Try from joined data first, then fetch from DB
        if(_sbProfile().standorte && _sbProfile().standorte.name) {
            window.sbStandort = { id: _sbProfile().standort_id, name: _sbProfile().standorte.name };
        } else {
            try {
                var stResp = await _sb().from('standorte').select('id,name').eq('id', _sbProfile().standort_id).single();
                if(stResp.data) window.sbStandort = { id: stResp.data.id, name: stResp.data.name };
            } catch(e) { console.warn('Standort-Lookup fehlgeschlagen:', e); }
        }
    }

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
        var stdName = _sbStandort() ? _sbStandort().name : 'Dein Standort';
        var stdId = _sbStandort() ? _sbStandort().id : '';
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
        {key:'hq_it',     label:'IT / Systemadmin', color:'border-gray-400 bg-gray-100', icon:'🖥️', desc:'Einstellungen, Features, System'},
        {key:'hq_zahlen', label:'Zahlen',           color:'border-teal-300 bg-teal-50',   icon:'💹', desc:'BWA, Controlling, Finanzen'}
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
                    stdResp.data.forEach(function(s){ sel.innerHTML += '<option value="'+s.id+'">'+_escH(s.name)+'</option>'; });
                }
            } catch(e){ console.error(e); }
        }, 100);
    } else {
        // Standort-User: eigenen Standort automatisch setzen
        var sel = document.getElementById('newMaStandort');
        if(sel && window.sbStandort) {
            sel.innerHTML = '<option value="'+window.sbStandort.id+'" selected>'+_escH(window.sbStandort.name)+'</option>';
            sel.disabled = true;
        } else if(sel && _sbProfile() && _sbProfile().standort_id) {
            sel.innerHTML = '<option value="'+_sbProfile().standort_id+'" selected>'+_escH((_sbProfile().standorte && _sbProfile().standorte.name) || 'Mein Standort')+'</option>';
            sel.disabled = true;
        }
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

        var response = await fetch(window.SUPABASE_URL + '/functions/v1/create-user', {
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

        window.logAudit && window.logAudit('user_erstellt', 'user-management', { email: email.trim().toLowerCase(), vorname: vorname.trim(), nachname: nachname.trim(), is_hq: isHqUser });
        closeNeuerMaModal();
        var rollenLabels = {'hq':'HQ','hq_gf':'GF','hq_sales':'Sales','hq_marketing':'Marketing','hq_einkauf':'Einkauf','hq_support':'Support','hq_akademie':'Akademie','hq_hr':'HR','hq_it':'IT','hq_zahlen':'Zahlen','inhaber':'Geschäftsleitung','verkauf':'Verkauf','werkstatt':'Werkstatt','buchhaltung':'Buchhaltung'};

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
                        await window.renderPartnerMitarbeiter();
                        window.openEmployeeToolsModal(empInsert.data.id);
                        return;
                    }
                }
            } catch(empErr) { console.warn('Employee record creation:', empErr); }
        }

        _showToast('✅ ' + vorname.trim() + ' ' + nachname.trim() + ' eingeladen! E-Mail an ' + email.trim() + ' gesendet.', 'success');
        await window.renderPartnerMitarbeiter();
        await window.renderKzMitarbeiter();
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
            {key:'hq_it',label:'🖥️ IT / Systemadmin',color:'border-gray-400 bg-gray-100'},
            {key:'hq_zahlen',label:'💹 Zahlen',color:'border-teal-300 bg-teal-50'}
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
        // User product assignments
        var { data: userProds } = await _sb().from('billing_products').select('id, key, name, default_amount').eq('active', true).eq('is_per_employee', true).is('deleted_at', null).order('name');
        var { data: userAssigns } = await _sb().from('billing_user_product_assignments').select('id, product_id, product:billing_products(name, default_amount)').eq('user_id', userId).eq('assignment_type', 'user').eq('is_active', true);
        var uAssignedIds = (userAssigns || []).map(function(a) { return a.product_id; });
        
        html += '<div class="border-t border-gray-200 pt-3 mt-3"><label class="block text-xs font-semibold text-gray-600 mb-2">\ud83d\udce6 Nutzer-Produkte</label>';
        html += '<div class="space-y-1 mb-2">';
        (userProds || []).forEach(function(p) {
            var isAssigned = uAssignedIds.indexOf(p.id) >= 0;
            var assignId = isAssigned ? (userAssigns.find(function(a){return a.product_id===p.id;})||{}).id : null;
            html += '<label class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">';
            html += '<div class="flex items-center gap-2"><input type="checkbox" class="userProdCheck" data-product-id="'+p.id+'" data-assign-id="'+(assignId||'')+'" '+(isAssigned?'checked':'')+' onchange="toggleUserProduct(\''+userId+'\',\''+p.id+'\',this.checked,\''+(assignId||'')+'\')"><span class="text-sm">'+_escH(p.name)+'</span></div>';
            html += '<span class="text-xs text-gray-400">'+Number(p.default_amount||0).toLocaleString('de-DE')+' \u20ac/Mt.</span>';
            html += '</label>';
        });
        html += '</div></div>';

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
                        sel.innerHTML += '<option value="'+s.id+'"'+selected+'>'+_escH(s.name)+'</option>';
                    });
                }
            } catch(e){}
        }, 100);
    } catch(err) { _showToast('Fehler: '+err.message, 'error'); }
}

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
            var pwResp = await _sb().rpc('set_user_password', { user_id: userId, new_password: pw });
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
        _showToast('Mitarbeiter aktualisiert!', 'success');
        window.logAudit && window.logAudit('user_bearbeitet', 'user-management', { user_id: userId, status: status, is_hq: isHQ });
        window.renderKzMitarbeiter();
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
    if(!confirm('Als "'+userName+'" anmelden?\n\nDu siehst das Cockpit aus Sicht dieses Users.')) return;
    if(typeof window.impersonateUser === 'function') {
        await window.impersonateUser(userId);
    } else {
        _showToast('Impersonation nicht verfügbar', 'error');
    }
}

export async function deleteMa(userId, userName) {
    if(!hqCan('delete_user')) { _showToast('Keine Berechtigung zum Löschen', 'error'); return; }
    if(!confirm('Mitarbeiter "'+userName+'" wirklich löschen?\n\nDies löscht den Account komplett (Auth + Profil + Rollen).')) return;
    try {
        // 1. Rollen löschen
        await _sb().from('user_rollen').delete().eq('user_id', userId);
        // 2. User-Profil löschen
        await _sb().from('users').delete().eq('id', userId);
        // 3. Auth-User löschen (via DB-Funktion)
        await _sb().rpc('delete_auth_user', { target_user_id: userId });
        window.logAudit && window.logAudit('user_geloescht', 'user-management', { user_id: userId, name: userName });
        _showToast(userName+' wurde gelöscht.', 'success');
        window.renderKzMitarbeiter();
    } catch(err) {
        // Auch bei Fehler beim Auth-Löschen: Profil ist bereits weg
        if(err.message && err.message.includes('delete_auth_user')) {
            _showToast(userName+' Profil gelöscht. Auth-User muss manuell entfernt werden.', 'warning');
            window.renderKzMitarbeiter();
        } else {
            _showToast('Fehler: '+(err.message||err), 'error');
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

    if(!name.trim() || !slug.trim()) { _showToast(_t('misc_enter_name_slug'), 'error'); return; }
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
        window.logAudit && window.logAudit('standort_angelegt', 'user-management', { name: name.trim(), slug: slug, region: region });
        closeNeuerStdModal();
        _showToast('Standort angelegt: '+name.trim()+' ('+slug+')', 'success');
        window.renderKzStandorte();
    } catch(err) {
        _showToast('Fehler: ' + err.message, 'error');
        if(btn) { btn.disabled=false; btn.textContent='Anlegen'; }
    }
}


window.toggleUserProduct = async function(userId, productId, checked, assignId) {
    if (checked) {
        // Get standort_id from the user
        var { data: usr } = await _sb().from('users').select('standort_id').eq('id', userId).single();
        var r = await billingApi('assign-product-to-user', { user_id: userId, standort_id: usr?.standort_id, product_id: productId, assignment_type: 'user' });
        if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
        _showToast('Produkt zugewiesen', 'success');
        // Trigger cost confirmation email
        var { data: prod } = await _sb().from('billing_products').select('name, default_amount').eq('id', productId).single();
        if (typeof sendCostConfirmation === 'function' && usr?.standort_id) {
            sendCostConfirmation(usr.standort_id, 'product_assigned', 
                (prod?.name || 'Produkt') + ' zugewiesen an Mitarbeiter',
                { items: [{ name: prod?.name, cost: prod?.default_amount }] });
        }
    } else if (assignId) {
        var r = await billingApi('remove-product-assignment', { assignment_id: assignId });
        if (r.error) { _showToast('Fehler: ' + r.error, 'error'); return; }
        _showToast('Produkt entfernt', 'success');
        // Trigger cost confirmation email
        if (typeof sendCostConfirmation === 'function') {
            var { data: u2 } = await _sb().from('users').select('standort_id').eq('id', userId).single();
            if (u2?.standort_id) sendCostConfirmation(u2.standort_id, 'product_removed', 'Produkt entfernt von Mitarbeiter', {});
        }
    }
};

// Strangler Fig
const _exports = { openNeuerMaModal, switchNewMaEbene, closeNeuerMaModal, switchNewMaEmailType, updateNewMaEmail, saveNeuerMa, openEditMaModal, switchEditEbene, closeEditMaModal, saveEditMa, loginAs, deleteMa, openNeuerStandortModal, closeNeuerStdModal, saveNeuerStandort };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
