/**
 * views/user-kommando.js - Kommandozentrale: Standorte, Mitarbeiter, Beta-User
 * @module views/user-kommando
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

// === KOMMANDOZENTRALE TAB SWITCHING ===
var currentKzStdFilter = 'all';
var currentKzMaFilter = 'all';
var kzMitarbeiter = [];

// Expose kzMitarbeiter for other sub-modules
window._umKzMitarbeiter = kzMitarbeiter;

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
            h+='<td class="px-4 py-3 text-center">'+window.statusBadge(st)+'</td>';
            h+='<td class="px-4 py-3 text-center font-semibold">'+(userCounts[s.id]||0)+'</td>';
            h+='<td class="px-4 py-3 text-center text-gray-500 text-xs">'+beitritt+'</td>';
            h+='<td class="px-4 py-3 text-center text-xs text-gray-500">'+(s.telefon||'\u2014')+'</td>';
            h+='<td class="px-4 py-3 text-center"><button class="text-xs text-vit-orange hover:underline font-semibold" onclick="window.showToast(\''+s.name+'\\nAdresse: '+(s.adresse||'\u2014')+'\\nTelefon: '+(s.telefon||'\u2014')+'\\nSlug: '+s.slug+'\')">Details \u2192</button></td>';
            h+='</tr>';
        });
        if(standorte.length===0) h='<tr><td colspan="8" class="text-center py-8 text-gray-400">Keine Standorte.</td></tr>';
        body.innerHTML=h;
        var ge=document.getElementById('kzStandorteGesamt');if(ge)ge.textContent=standorte.length;
        var ak=document.getElementById('kzStandorteAktiv');if(ak)ak.textContent=standorte.filter(function(s){return (s.status||'aktiv')==='aktiv';}).length;
        var ob=document.getElementById('kzStandorteOnb');if(ob)ob.textContent=standorte.filter(function(s){return s.status==='onboarding';}).length;
        var of2=document.getElementById('kzStandorteOff');if(of2)of2.textContent=standorte.filter(function(s){return s.status==='offboarding';}).length;
    } catch(err) { console.error('Standorte:', err); body.innerHTML='<tr><td colspan="8" class="text-center py-4 text-red-400">Fehler: '+_escH(err.message)+'</td></tr>'; }
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
        window._umKzMitarbeiter = kzMitarbeiter;
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
            h+='<td class="px-4 py-3 text-center">'+(rollen.length > 0 ? window.rollenBadges(rollen) : '<span class="text-xs text-yellow-600 font-semibold">Wartet auf Freigabe</span>')+(u.is_beta ? ' <span class="text-[9px] bg-purple-500 text-white rounded px-1 py-0.5 font-bold">BETA</span>' : '')+'</td>';
            h+='<td class="px-4 py-3 text-center">'+window.statusBadge(st)+'</td>';
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
            standorte.sort().forEach(function(s){sel.innerHTML+='<option value="'+_escH(s)+'">'+_escH(s)+'</option>';});
        }
    } catch(err) { console.error('Mitarbeiter:', err); body.innerHTML='<tr><td colspan="7" class="text-center py-4 text-red-400">Fehler: '+_escH(err.message)+'</td></tr>'; }
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
        inner.innerHTML = '<p class="text-red-600 p-4">Fehler: ' + _escH(e.message) + '</p>';
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
        if(e.message && e.message.indexOf('duplicate') !== -1) { _showToast('User ist bereits Beta-Tester', 'info'); }
        else { _showToast('Fehler: ' + e.message, 'error'); }
    }
}

export async function removeBetaUser(betaId, modulKey, modulName) {
    if(!confirm('Beta-Zugang entfernen?')) return;
    try {
        var {error} = await _sb().from('modul_beta_users').delete().eq('id', betaId);
        if(error) throw error;
        openBetaUsersModal(modulKey, modulName); // Refresh
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

// Strangler Fig
const _exports = { showKommandoTab, filterKzStandorte, filterKzMa, renderKzStandorte, renderKzMitarbeiter, openBetaUsersModal, filterBetaUserList, addBetaUser, removeBetaUser };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
