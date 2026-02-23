/**
 * views/auth-system.js - Auth System: 3-Ebenen, Rechtemanagement, Impersonation, Registration, Demo/Beta Badges
 * @module views/auth-system
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _showView(v) { if (window.showView) window.showView(v); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// === Shared auth state (module-scoped, exported to window via _exports) ===
var sbUser = window.sbUser || null;
var sbProfile = window.sbProfile || null;
var sbRollen = window.sbRollen || [];
var sbStandort = window.sbStandort || null;
var currentRole = window.currentRole || 'inhaber';
var currentStandortId = window.currentStandortId || null;
var currentLocation = window.currentLocation || 'grafrath';
var currentLang = window.currentLang || 'de';
var isPremium = window.isPremium || false;

// === 3-EBENEN SYSTEM: HQ / Standort / Extern ===
var SESSION = {
account_level: 'standort', // 'hq' | 'standort' | 'extern'
stage: 'partner',          // 'phase0' | 'part1' | 'part2' | 'partner'
stage_status: 'active',    // 'active' | 'paused' | 'extended' | 'completed'
stage_started_at: null,
stage_due_at: null,
account_id: null,
account_name: ''
};

// Onboarding Milestones Definition
var ONBOARDING_MILESTONES = {
part1: [
    { key: 'license_signed', title: 'Lizenzvertrag unterschrieben', description: 'Partnerschafts-Lizenzvertrag mit vit:bikes unterzeichnet', required: true, order: 1 },
    { key: 'iht_onboarding_done', title: 'IHT-Onboarding abgeschlossen', description: 'Initial Hardware & Tools Setup vollständig', required: true, order: 2 },
    { key: 'strategy_marketing', title: 'Modul: Marketingstrategie', description: 'Marketingstrategie-Schulung absolviert', required: true, order: 3 },
    { key: 'strategy_purchasing', title: 'Modul: Einkaufsstrategie', description: 'Einkaufsstrategie-Schulung absolviert', required: true, order: 4 },
    { key: 'strategy_finance', title: 'Modul: Finanzstrategie', description: 'Finanzstrategie-Schulung absolviert', required: true, order: 5 },
    { key: 'strategy_general', title: 'Modul: Allgemeine Strategie', description: 'Allgemeine Unternehmensstrategie absolviert', required: true, order: 6 }
],
part2: [
    { key: 'workshop_sales', title: 'Workshop: Verkauf', description: 'Verkaufsworkshop absolviert', required: true, order: 1 },
    { key: 'workshop_team', title: 'Workshop: Teamführung', description: 'Teamführung-Workshop absolviert', required: true, order: 2 },
    { key: 'workshop_org', title: 'Workshop: Organisation', description: 'Organisationsworkshop absolviert', required: true, order: 3 },
    { key: 'system_integration', title: 'Systemintegration abgeschlossen', description: 'Warenwirtschaft & Prozesse integriert', required: true, order: 4 },
    { key: 'brand_guidelines', title: 'Markenrichtlinien umgesetzt', description: 'CI/CD Richtlinien im Laden umgesetzt', required: true, order: 5 },
    { key: 'all_trainings_done', title: 'Alle Trainingsmodule abgeschlossen', description: 'Sämtliche Pflichtmodule erfolgreich absolviert', required: true, order: 6 },
    { key: 'hq_final_review', title: 'HQ Abschlussbewertung', description: 'Finale Bewertung durch vit:bikes HQ', required: true, order: 7 }
]
};

// Account milestone states (in-memory prototype)
var accountMilestoneStates = {};

// Onboarding actions log
var onboardingActionsLog = [];

// Initialize milestones for an account
export function initMilestonesForStage(stage) {
var milestones = ONBOARDING_MILESTONES[stage] || [];
milestones.forEach(function(m) {
    var key = SESSION.account_id + '_' + m.key;
    if (!accountMilestoneStates[key]) {
        accountMilestoneStates[key] = { status: 'todo', updated_at: null };
    }
});
}

// Get milestone state
export function getMilestoneStatus(milestoneKey) {
var key = SESSION.account_id + '_' + milestoneKey;
return accountMilestoneStates[key] ? accountMilestoneStates[key].status : 'todo';
}

// Set milestone state
export function setMilestoneStatus(milestoneKey, status) {
var key = SESSION.account_id + '_' + milestoneKey;
accountMilestoneStates[key] = { status: status, updated_at: new Date().toISOString() };
}

// Log onboarding action
export function logOnboardingAction(actionType, payload) {
onboardingActionsLog.push({
    account_id: SESSION.account_id,
    action_type: actionType,
    payload: payload || {},
    actor: _sbProfile() ? _sbProfile().email : 'demo',
    created_at: new Date().toISOString()
});
console.log('[Onboarding] Action logged:', actionType, payload);
}

// Evaluate stage transitions
export function evaluateTransitions() {
var stage = SESSION.stage;
var now = new Date();

if (stage === 'part1' && SESSION.stage_due_at && now > new Date(SESSION.stage_due_at)) {
    if (SESSION.stage_status !== 'extended') {
        SESSION.stage_status = 'extended';
        logOnboardingAction('auto_extend', { stage: 'part1', reason: 'overdue' });
    }
}

if (stage === 'part1') {
    var part1Ready = true;
    var requiredKeys = ['license_signed', 'iht_onboarding_done', 'strategy_marketing', 'strategy_purchasing', 'strategy_finance', 'strategy_general'];
    requiredKeys.forEach(function(k) { if (getMilestoneStatus(k) !== 'done') part1Ready = false; });
    return { canAdvance: part1Ready, nextStage: 'part2', missingMilestones: requiredKeys.filter(function(k){ return getMilestoneStatus(k) !== 'done'; }) };
}

if (stage === 'part2') {
    var part2Ready = true;
    var requiredKeys2 = ONBOARDING_MILESTONES.part2.filter(function(m){ return m.required; }).map(function(m){ return m.key; });
    requiredKeys2.forEach(function(k) { if (getMilestoneStatus(k) !== 'done') part2Ready = false; });
    return { canAdvance: part2Ready, nextStage: 'partner', missingMilestones: requiredKeys2.filter(function(k){ return getMilestoneStatus(k) !== 'done'; }) };
}

return { canAdvance: false, nextStage: null, missingMilestones: [] };
}

// Execute stage transition
export function executeTransition(targetStage) {
var now = new Date();
var oldStage = SESSION.stage;
if (targetStage === 'part1') {
    SESSION.account_level = 'standort';
    SESSION.stage = 'part1'; SESSION.stage_status = 'active';
    SESSION.stage_started_at = now.toISOString();
    SESSION.stage_due_at = new Date(now.getTime() + 90*24*60*60*1000).toISOString();
    initMilestonesForStage('part1');
    logOnboardingAction('start_part1', { from: oldStage });
} else if (targetStage === 'part2') {
    SESSION.stage = 'part2'; SESSION.stage_status = 'active';
    SESSION.stage_started_at = now.toISOString();
    SESSION.stage_due_at = new Date(now.getTime() + 270*24*60*60*1000).toISOString();
    initMilestonesForStage('part2');
    logOnboardingAction('start_part2', { from: oldStage });
} else if (targetStage === 'partner') {
    SESSION.stage = 'partner'; SESSION.stage_status = 'active';
    SESSION.stage_started_at = now.toISOString(); SESSION.stage_due_at = null;
    logOnboardingAction('promote_partner', { from: oldStage });
}
updateUIForRole();
if (SESSION.account_level === 'extern') { _showView('externHome'); } else { _showView('onboarding'); }
}

// Apply for Part 1 (Extern action)
export function applyForPart1() {
logOnboardingAction('apply_part1', { account_name: SESSION.account_name });
alert('Deine Bewerbung für die Trainingsphase Part 1 wurde eingereicht! ✅\n\nDas vit:bikes Team wird sich in Kürze bei dir melden.');
renderOnboardingView();
}

// Location data
var locations = {
'vitbikes-muenchen': { name: 'vit:bikes München Sendling', premium: true },
'vitbikes-berlin': { name: 'vit:bikes Berlin Mitte', premium: true },
'vitbikes-hamburg': { name: 'vit:bikes Hamburg Altona', premium: true },
'radhaus-koeln': { name: 'Radhaus Köln', premium: false },
'bikeshop-dresden': { name: 'BikeShop Dresden', premium: false }
};

// Update location info in login screen
export function updateLocationInfo() {
const select = document.getElementById('locationSelect');
const selectedOption = select.options[select.selectedIndex];
const isPremiumLocation = selectedOption.dataset.premium === 'true';
const badge = document.getElementById('locationBadge');

if (isPremiumLocation) {
    badge.innerHTML = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-vit-orange to-yellow-500 text-white"><svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg> vit:bikes Partner - Alle Features</span>';
} else {
    badge.innerHTML = '<span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">📦 Basis-Version - Upgrade verfügbar</span>';
}
}

// Initialize location info on page load (only if login screen exists)
if(document.getElementById('locationSelect')) { updateLocationInfo(); }

// Auto-init: show home view and set defaults
try { updateUIForRole(); updatePremiumFeatures(); } catch(e) { console.warn('Init:', e); }

// Handle Login - Role & Location from email
// === RECHTEMANAGEMENT ===
// Rollen: inhaber, verkauf, werkstatt, buchhaltung (Standort-Ebene) + hq (HQ-Ebene)
// Jeder Mitarbeiter kann MEHRERE Rollen haben
var userAccounts = {
'max@vitbikes-grafrath.de': {roles:['inhaber'],location:'grafrath',name:'Max Mustermann'},
'sandra@vitbikes-grafrath.de': {roles:['inhaber','buchhaltung'],location:'grafrath',name:'Sandra Engelmann'},
'verkauf@vitbikes-grafrath.de': {roles:['verkauf'],location:'grafrath',name:'Tom Berater'},
'werkstatt@vitbikes-grafrath.de': {roles:['werkstatt'],location:'grafrath',name:'Felix Schrauber'},
'anna@vitbikes-grafrath.de': {roles:['verkauf','werkstatt'],location:'grafrath',name:'Anna Allround'},
'buchhaltung@vitbikes-grafrath.de': {roles:['buchhaltung'],location:'grafrath',name:'Petra Zahlen'},
'hq@vitbikes.de': {roles:['hq'],location:'hq',name:'Lisa Zentrale'},
'admin@vitbikes.de': {roles:['hq'],location:'hq',name:'Michael Stenzel'},
'extern@bikeshop.de': {roles:['external_owner'],location:'extern_demo',name:'Thomas Radler',account_level:'extern',stage:'phase0'},
'extern-p1@bikeshop.de': {roles:['inhaber'],location:'extern_p1',name:'Sabine Treter',account_level:'standort',stage:'part1'},
'extern-p2@bikeshop.de': {roles:['inhaber'],location:'extern_p2',name:'Klaus Speiche',account_level:'standort',stage:'part2'}
};

// Welche Rollen Zugriff auf welche Module haben
var rolePermissions = {
// View-Name: [erlaubte Rollen] — 'alle' = jede Standort-Rolle
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
'entwicklung':     ['alle'],
'shop':           ['inhaber'],
'onboarding':     ['inhaber','external_owner'],
'mitarbeiter':    ['inhaber'],
'externHome':     ['external_owner'],
'externWissen':   ['external_owner']
};

// Prüft ob der aktuelle User Zugriff auf eine View hat
export function hasAccess(viewName) {
if(currentRole === 'hq') return true; // HQ users have access to all views
// Extern level: only allow specific views
if(SESSION.account_level === 'extern') {
    var externAllowed = ['externHome','onboarding','externWissen','wissen','kommunikation','support','notifications'];
    return externAllowed.indexOf(viewName) >= 0;
}
var perms = rolePermissions[viewName];
if(!perms) return true;
if(perms.indexOf('alle') >= 0) return true;
for(var i=0; i<currentRoles.length; i++) {
    if(perms.indexOf(currentRoles[i]) >= 0) return true;
}
return false;
}

// Prüft ob User eine bestimmte Rolle hat
export function hasRole(role) {
return currentRoles.indexOf(role) >= 0;
}

// HQ granulare Berechtigung prüfen
export function hqCan(action) {
// Not HQ? Allow all (partner users don't need HQ permission checks)
if(!sbProfile || !_sbProfile().is_hq) return true;
// Legacy HQ without granular roles = full access
if(hasRole('hq') && !hasRole('hq_gf') && !hasRole('hq_sales') && !hasRole('hq_marketing') &&
   !hasRole('hq_einkauf') && !hasRole('hq_support') && !hasRole('hq_akademie') &&
   !hasRole('hq_hr') && !hasRole('hq_it')) return true;
// GF always full access
if(hasRole('hq_gf')) return true;
// Check DB-driven permissions first (action_* keys in modul_berechtigungen)
var actionKey = 'action_' + action;
if(window._hqRechteMatrix && window._hqRechteMatrix[actionKey]) {
    var dbPerms = window._hqRechteMatrix[actionKey];
    for(var i=0; i<currentRoles.length; i++) {
        if(dbPerms[currentRoles[i]]) return true;
    }
    return false;
}
// Fallback: hardcoded defaults (used until DB permissions are loaded)
var defaults = {
    'impersonate':       [],
    'delete_user':       [],
    'edit_user':         ['hq_hr'],
    'create_user':       ['hq_hr'],
    'approve_user':      ['hq_hr'],
    'edit_standort':     ['hq_sales'],
    'delete_standort':   [],
    'create_standort':   ['hq_sales'],
    'manage_billing':    ['hq_hr'],
    'manage_settings':   [],
    'manage_features':   [],
    'send_announcement': ['hq_sales','hq_marketing','hq_support'],
    'manage_campaigns':  ['hq_marketing'],
    'manage_documents':  ['hq_marketing','hq_akademie','hq_hr']
};
var allowed = defaults[action] || [];
for(var i=0;i<allowed.length;i++) { if(hasRole(allowed[i])) return true; }
return false;
}

// Aktuelle Rollen (Array)
var currentRoles = ['inhaber'];

// === IMPERSONATION (HQ only) ===
var _impOrigProfile = null;
var _impOrigRoles = null;
var _impOrigStandort = null;
var _impOrigSession = null;
var _impOrigSbStandort = null;
var _impActive = false;

export function impersonateDemo() {
if(!currentRoles || currentRoles.indexOf('hq') === -1) return;
_saveOrigState();
// Switch to demo standort view
currentRoles = ['inhaber'];
currentRole = 'inhaber';
currentStandortId = '5a077c1a-5db2-4fde-949c-8e5e34dcd2c0';
sbProfile = Object.assign({}, sbProfile, {
    name: 'Demo Partner',
    standort_id: '5a077c1a-5db2-4fde-949c-8e5e34dcd2c0',
    is_hq: false
});
sbStandort = { id: '5a077c1a-5db2-4fde-949c-8e5e34dcd2c0', name: 'Demo-Standort' };
window.sbProfile = sbProfile;
window.currentRoles = currentRoles;
window.currentRole = currentRole;
window.sbStandort = sbStandort;
SESSION.account_level = 'standort';
_activateImpersonation('👁️ Demo-Standort');
}

export async function impersonateUser(userId) {
if(!currentRoles || currentRoles.indexOf('hq') === -1) return;
_saveOrigState();
try {
    var resp = await _sb().from('users').select('*, standorte(name)').eq('id', userId).single();
    if(resp.error) throw resp.error;
    var user = resp.data;
    // Load user roles
    var roleResp = await _sb().from('user_rollen').select('*, rollen(name)').eq('user_id', userId);
    var roles = (roleResp.data || []).map(function(r){ return r.rollen ? r.rollen.name : ''; }).filter(Boolean);
    if(roles.length === 0) roles = ['inhaber'];

    currentRoles = roles;
    currentRole = roles[0] || 'inhaber';
    currentStandortId = user.standort_id;
    sbProfile = Object.assign({}, sbProfile, {
        id: user.id,
        name: user.name,
        email: user.email,
        standort_id: user.standort_id,
        is_hq: false
    });
    window.sbProfile = sbProfile;
    window.currentRoles = currentRoles;
    window.currentRole = currentRole;
    sbStandort = user.standorte ? { id: user.standort_id, name: user.standorte.name } : sbStandort;
    window.sbStandort = sbStandort;
    SESSION.account_level = 'standort';
    var label = '🔄 ' + user.name + (user.standorte ? ' (' + user.standorte.name + ')' : '');
    _activateImpersonation(label);
} catch(err) {
    alert('Impersonation fehlgeschlagen: ' + err.message);
    _restoreOrigState();
}
}

export function _saveOrigState() {
if(!_impActive) {
    _impOrigProfile = Object.assign({}, sbProfile);
    _impOrigRoles = currentRoles.slice();
    _impOrigStandort = typeof currentStandortId !== 'undefined' ? currentStandortId : null;
    _impOrigSbStandort = sbStandort ? Object.assign({}, sbStandort) : null;
    _impOrigSession = Object.assign({}, SESSION);
}
}

export function _activateImpersonation(label) {
_impActive = true;
// Update UI
var btns = document.getElementById('impersonationBtns');
var active = document.getElementById('impersonationActive');
var lbl = document.getElementById('impersonationLabel');
if(btns) btns.style.display = 'none';
if(active) active.style.display = '';
if(lbl) lbl.textContent = label;
// Update name, avatar, welcome for impersonated user
var impName = _sbProfile() ? _sbProfile().name : 'Benutzer';
var impFirst = impName.split(' ')[0];
var nameEl = document.querySelector('[data-user-name]');
if(nameEl) nameEl.textContent = impName;
var impAvatar = 'https://ui-avatars.com/api/?name='+encodeURIComponent(impName)+'&background=EF7D00&color=fff';
if(_sbProfile() && _sbProfile().avatar_url) impAvatar = _sbProfile().avatar_url;
var avatarEl = document.querySelector('.topnav-desktop img.rounded-full');
if(avatarEl) avatarEl.src = impAvatar;
var mobileAv = document.getElementById('userAvatarImgMobile');
if(mobileAv) mobileAv.src = impAvatar;
var welcomeEl = document.getElementById('welcomeText');
if(welcomeEl) { welcomeEl.textContent = 'Willkommen zurück, ' + impFirst + '!'; welcomeEl.setAttribute('data-i18n-name', impFirst); }
// Refresh sidebar & views
if(typeof updateUIForRole === 'function') updateUIForRole();
_showView('home');
}

export function exitImpersonation() {
if(!_impActive) return;
_restoreOrigState();
_impActive = false;
// Update UI
var btns = document.getElementById('impersonationBtns');
var active = document.getElementById('impersonationActive');
if(btns) btns.style.display = '';
if(active) active.style.display = 'none';
// Restore original name, avatar, welcome
var origName = _sbProfile() ? _sbProfile().name : 'Benutzer';
var origFirst = origName.split(' ')[0];
var nameEl = document.querySelector('[data-user-name]');
if(nameEl) nameEl.textContent = origName;
var origAvatar = 'https://ui-avatars.com/api/?name='+encodeURIComponent(origName)+'&background=EF7D00&color=fff';
if(_sbProfile() && _sbProfile().avatar_url) origAvatar = _sbProfile().avatar_url;
var avatarEl = document.querySelector('.topnav-desktop img.rounded-full');
if(avatarEl) avatarEl.src = origAvatar;
var mobileAv = document.getElementById('userAvatarImgMobile');
if(mobileAv) mobileAv.src = origAvatar;
var welcomeEl = document.getElementById('welcomeText');
if(welcomeEl) { welcomeEl.textContent = 'Willkommen zurück, ' + origFirst + '!'; welcomeEl.setAttribute('data-i18n-name', origFirst); }
// Refresh sidebar & views
if(typeof updateUIForRole === 'function') updateUIForRole();
if(currentRole === 'hq') { if(typeof window.switchViewMode === 'function') window.switchViewMode('hq'); }
else _showView('home');
}

export function _restoreOrigState() {
if(_impOrigProfile) sbProfile = _impOrigProfile;
if(_impOrigRoles) {
    currentRoles = _impOrigRoles;
    currentRole = _impOrigRoles.indexOf('hq') >= 0 ? 'hq' : _impOrigRoles[0] || 'inhaber';
}
if(_impOrigStandort !== null) currentStandortId = _impOrigStandort;
if(_impOrigSbStandort) sbStandort = _impOrigSbStandort;
if(_impOrigSession) Object.assign(SESSION, _impOrigSession);
if(sbProfile) sbProfile.is_hq = currentRoles.indexOf('hq') >= 0;
window.sbProfile = sbProfile;
window.currentRoles = currentRoles;
window.currentRole = currentRole;
window.sbStandort = sbStandort;
}

export function quickLogin(email) {
document.getElementById('loginEmail').value = email;
document.getElementById('loginPassword').value = '';
document.getElementById('loginPassword').focus();
}

// === PASSWORD RESET ===
export function showPasswordReset() {
var html = '<div id="pwResetOverlay" onclick="closePwReset()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:28px;width:420px;max-width:90vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
html += '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold text-gray-800">Passwort zuruecksetzen</h3><button onclick="closePwReset()" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>';
html += '<p class="text-sm text-gray-500 mb-4">Gib deine E-Mail-Adresse ein. Du erhaeltst einen Link zum Zuruecksetzen deines Passworts.</p>';
html += '<input id="pwResetEmail" type="email" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm mb-3" placeholder="deine@email.de">';
html += '<div id="pwResetMsg" style="display:none" class="text-sm rounded-lg p-3 mb-3"></div>';
html += '<button id="pwResetBtn" onclick="submitPwReset()" class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">Link senden</button>';
html += '<button onclick="closePwReset()" class="w-full py-2.5 mt-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Zurueck zum Login</button>';
html += '</div></div>';
var c = document.createElement('div'); c.id = 'pwResetContainer'; c.innerHTML = html; document.body.appendChild(c);
}
export function closePwReset() { var c = document.getElementById('pwResetContainer'); if(c) c.remove(); }
export async function submitPwReset() {
var email = (document.getElementById('pwResetEmail') || {}).value;
var msg = document.getElementById('pwResetMsg');
var btn = document.getElementById('pwResetBtn');
if (!email || !email.includes('@')) { msg.className = 'text-sm rounded-lg p-3 mb-3 bg-red-50 border border-red-200 text-red-600'; msg.textContent = 'Bitte gib eine gueltige E-Mail ein.'; msg.style.display = 'block'; return; }
btn.disabled = true; btn.textContent = 'Wird gesendet...';
try {
    var resp = await _sb().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
    if (resp.error) throw resp.error;
    msg.className = 'text-sm rounded-lg p-3 mb-3 bg-green-50 border border-green-200 text-green-700';
    msg.textContent = 'Falls ein Account mit dieser E-Mail existiert, wurde ein Reset-Link gesendet. Pruefe deinen Posteingang.';
    msg.style.display = 'block';
    btn.textContent = 'Gesendet \u2713'; btn.disabled = true;
} catch (e) {
    msg.className = 'text-sm rounded-lg p-3 mb-3 bg-red-50 border border-red-200 text-red-600';
    msg.textContent = 'Fehler: ' + e.message;
    msg.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Link senden';
}
}

// === REGISTRATION ===
export function showRegistration() {
var loginForm = document.querySelector('#loginScreen form');
var regLink = loginForm.parentElement.querySelector('.border-t');

var html = '<div id="regOverlay" onclick="hideRegistration()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:28px;width:440px;max-width:90vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
html += '<div class="flex items-center justify-between mb-5"><h3 class="text-lg font-bold text-gray-800">Registrieren</h3><button onclick="hideRegistration()" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>';
html += '<p class="text-sm text-gray-500 mb-4">Nach der Registrierung muss dein Account vom HQ freigeschaltet werden.</p>';
html += '<div class="space-y-3 mb-5">';
html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Vor- und Nachname *</label><input id="regName" type="text" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="Max Mustermann"></div>';
html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">E-Mail *</label><input id="regEmail" type="email" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="name@vitbikes-standort.de"></div>';
html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Passwort * (min. 6 Zeichen)</label><input id="regPassword" type="password" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"></div>';
html += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">Standort *</label><select id="regStandort" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"><option value="">Wird geladen...</option></select></div>';
html += '</div>';
html += '<div id="regError" style="display:none" class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-3"></div>';
html += '<div id="regSuccess" style="display:none" class="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-3"></div>';
html += '<button id="regSubmitBtn" onclick="submitRegistration()" class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90 transition">Registrieren</button>';
html += '<button onclick="hideRegistration()" class="w-full py-2.5 mt-2 bg-gray-100 text-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-200">Zurück zum Login</button>';
html += '</div></div>';

var c = document.createElement('div');
c.id = 'regContainer';
c.innerHTML = html;
document.body.appendChild(c);

// Load standorte into dropdown
setTimeout(async function(){
    try {
        var stdResp = await _sb().from('standorte').select('id,name').order('name');
        var sel = document.getElementById('regStandort');
        if(sel && stdResp.data) {
            sel.innerHTML = '<option value="">— Standort wählen —</option>';
            stdResp.data.forEach(function(s){ sel.innerHTML += '<option value="'+s.id+'">'+s.name+'</option>'; });
        }
    } catch(e){ console.error(e); }
}, 100);
}

export function hideRegistration() {
var c = document.getElementById('regContainer');
if(c) c.remove();
}

export async function submitRegistration() {
var name = (document.getElementById('regName')||{}).value||'';
var email = (document.getElementById('regEmail')||{}).value||'';
var pw = (document.getElementById('regPassword')||{}).value||'';
var standortId = (document.getElementById('regStandort')||{}).value||'';
var errEl = document.getElementById('regError');
var sucEl = document.getElementById('regSuccess');
var btn = document.getElementById('regSubmitBtn');

if(errEl) errEl.style.display = 'none';
if(sucEl) sucEl.style.display = 'none';

if(!name.trim() || !email.trim() || !pw) {
    if(errEl) { errEl.textContent = 'Bitte alle Pflichtfelder ausfüllen.'; errEl.style.display = 'block'; }
    return;
}
if(pw.length < 8) {
    if(errEl) { errEl.textContent = _t('misc_min_8_chars'); errEl.style.display = 'block'; }
    return;
}

if(btn) { btn.disabled = true; btn.textContent = 'Wird registriert...'; }

// Vorname/Nachname aus dem Namen splitten
var nameParts = name.trim().split(' ');
var vorname = nameParts[0] || '';
var nachname = nameParts.slice(1).join(' ') || '';

try {
    // Auth-User erstellen via Standard signUp()
    // Der DB-Trigger handle_new_auth_user() erstellt automatisch:
    // - public.users Eintrag mit status='pending'
    // - HQ-Todo Notification
    // - Email-Queue Eintrag
    var authResp = await _sb().auth.signUp({ 
        email: email.trim().toLowerCase(), 
        password: pw,
        options: { 
            data: { 
                vorname: vorname,
                nachname: nachname
            } 
        }
    });
    if(authResp.error) throw authResp.error;
    var newUserId = authResp.data.user ? authResp.data.user.id : null;
    
    // Optionalen Standort-Hinweis nachträglich setzen (hilft HQ bei Zuordnung)
    if(standortId && newUserId) {
        // Kurz warten damit der Trigger den User in public.users erstellt hat
        await new Promise(function(resolve){ setTimeout(resolve, 1500); });
        try {
            await _sb().from('users').update({ standort_id: standortId }).eq('id', newUserId);
        } catch(e) { console.warn('Standort-Hinweis konnte nicht gesetzt werden:', e); }
    }
    
    // Sofort ausloggen (signUp loggt automatisch ein)
    await _sb().auth.signOut();
    
    if(sucEl) {
        sucEl.innerHTML = '\u2705 <strong>Registrierung erfolgreich!</strong><br>Dein Account wartet auf Freigabe durch das HQ. Du wirst benachrichtigt, sobald dein Zugang freigeschaltet wurde.';
        sucEl.style.display = 'block';
    }
    if(btn) { btn.style.display = 'none'; }
} catch(err) {
    // Auch ausloggen falls teilweise erfolgreich
    try { await _sb().auth.signOut(); } catch(e){}
    var msg = 'Fehler: ' + (err.message||err);
    if(err.message && err.message.includes('already registered')) {
        msg = 'Diese E-Mail-Adresse ist bereits registriert. Bitte anmelden.';
    }
    if(errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    if(btn) { btn.disabled = false; btn.textContent = 'Registrieren'; }
}
}

export async function handleLogin(event) {
if(event) { event.preventDefault(); event.stopPropagation(); }
var email = (document.getElementById('loginEmail')||{}).value||'';
var pw = (document.getElementById('loginPassword')||{}).value||'';
if(!email || !pw) { alert(_t('alert_enter_email_pw')); return false; }

var loginBtn = document.querySelector('#loginScreen form button[type="submit"]');
if(loginBtn) { loginBtn.disabled = true; loginBtn.textContent = _t('ui_signing_in'); }
var errEl = document.getElementById('loginError');
if(errEl) errEl.style.display = 'none';

try {
    console.log('[Login] Signing in...');
    var resp = await _sb().auth.signInWithPassword({ email: email, password: pw });
    if(resp.error) throw resp.error;
    sbUser = resp.data.user;
    window.sbUser = sbUser;
    console.log('[Login] Auth OK, user:', _sbUser().id);
    
    // Status-Check: Was darf der User sehen?
    var profileResp = await _sb().from('users').select('status').eq('id', _sbUser().id).single();
    console.log('[Login] Profile status:', profileResp.data ? profileResp.data.status : 'no profile', profileResp.error ? profileResp.error.message : '');
    
    if(profileResp.data && (profileResp.data.status === 'pending' || profileResp.data.status === 'onboarding')) {
        // Pending-Screen zeigen statt Fehlermeldung
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('pendingScreen').style.display = 'flex';
        var pendingEmailEl = document.getElementById('pendingEmail');
        if(pendingEmailEl) pendingEmailEl.textContent = email;
        if(loginBtn) { loginBtn.disabled = false; loginBtn.textContent = _t('ui_sign_in'); }
        return false;
    }
    if(profileResp.data && (profileResp.data.status === 'offboarding' || profileResp.data.status === 'gesperrt')) {
        // Gesperrt-Screen zeigen
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('blockedScreen').style.display = 'flex';
        if(loginBtn) { loginBtn.disabled = false; loginBtn.textContent = _t('ui_sign_in'); }
        return false;
    }
    
    if(!profileResp.data) {
        // Kein Profil gefunden – wahrscheinlich Trigger-Problem, Pending zeigen
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('pendingScreen').style.display = 'flex';
        var pendingEmailEl2 = document.getElementById('pendingEmail');
        if(pendingEmailEl2) pendingEmailEl2.textContent = email;
        if(loginBtn) { loginBtn.disabled = false; loginBtn.textContent = _t('ui_sign_in'); }
        return false;
    }
    
    console.log('[Login] Loading profile...');
    await loadUserProfile(_sbUser().id);
    console.log('[Login] Profile loaded, roles:', currentRoles);
    await loadModulStatus();
    await loadFeatureFlags();
    console.log('[Login] Entering app...');
    enterApp();
    try { await loadPipelineFromSupabase(); } catch(e) { console.warn('[Login] Pipeline load optional:', e); }
} catch(err) {
    console.error('[Login] ERROR:', err);
    if(errEl) { errEl.textContent = err.message || 'Login fehlgeschlagen'; errEl.style.display = 'block'; }
    else alert('Login fehlgeschlagen: ' + (err.message||err));
} finally {
    if(loginBtn) { loginBtn.disabled = false; loginBtn.textContent = _t('ui_sign_in'); }
}
return false;
}

export async function loadUserProfile(userId) {
var resp1 = await _sb().from('users').select('*, standorte(*)').eq('id', userId).single();
if(resp1.error) { console.error('[Profile] Error:', resp1.error.message); throw resp1.error; }
sbProfile = resp1.data;
sbStandort = _sbProfile() ? _sbProfile().standorte : null;
window.sbProfile = sbProfile;
window.sbStandort = sbStandort;
window.sbUser = sbUser;
var resp2 = await _sb().from('user_rollen').select('rollen(name, label)').eq('user_id', userId);
if(resp2.error) { console.error('[Roles] Error:', resp2.error.message); }
sbRollen = (resp2.data || []).map(function(ur) { return ur.rollen; });
var roleNames = sbRollen.map(function(r) { return r ? r.name : ''; }).filter(Boolean);
currentRoles = roleNames.length > 0 ? roleNames : ['inhaber'];
// Ensure HQ role is in currentRoles if is_hq flag is set
if(_sbProfile() && _sbProfile().is_hq && currentRoles.indexOf('hq') === -1) {
    currentRoles.push('hq');
}
// is_hq from DB is the PRIMARY driver for HQ vs Standort view
if(_sbProfile() && _sbProfile().is_hq) {
    currentRole = 'hq';
} else {
    currentRole = currentRoles.indexOf('inhaber') >= 0 ? 'inhaber' : currentRoles[0];
}
currentLocation = sbStandort ? sbStandort.slug : 'grafrath';
isPremium = sbStandort ? sbStandort.is_premium : false;

// Load HQ module permissions for granular role access
if(_sbProfile() && _sbProfile().is_hq) {
    try {
        var rollenIds = (resp2.data || []).map(function(ur){ return ur.rollen && ur.rollen.id; }).filter(Boolean);
        // Get rolle IDs from names
        var rolleIdResp = await _sb().from('rollen').select('id, name').in('name', currentRoles);
        var hqRolleIds = (rolleIdResp.data || []).map(function(r){ return r.id; });
        if(hqRolleIds.length > 0) {
            var permResp = await _sb().from('modul_berechtigungen').select('modul, hat_zugriff').in('rolle_id', hqRolleIds).eq('hat_zugriff', true);
            window._hqModulPerms = {};
            (permResp.data || []).forEach(function(p){ window._hqModulPerms[p.modul] = true; });
        }
    } catch(e) { console.warn('[HQ Perms] Could not load:', e.message); window._hqModulPerms = null; }
}
// Sync all auth state to window for cross-module access
window.sbUser = sbUser; window.sbProfile = sbProfile; window.sbRollen = sbRollen;
window.sbStandort = sbStandort; window.currentRole = currentRole; window.currentRoles = currentRoles;
window.currentStandortId = currentStandortId; window.currentLocation = currentLocation;
window.isPremium = isPremium;
}


// ======================================================
// === DEMO / BETA BADGE SYSTEM ===
// ======================================================
// Module-Status: 'demo' = fake data (orange), 'teilweise'/'stub' = beta (purple), undefined = live

export function enterApp() {
// Guard: don't re-enter during impersonation or demo
if(_impActive || window.DEMO_ACTIVE) return;
var splash = document.getElementById('appSplash'); if(splash) splash.remove();
var userName = _sbProfile() ? _sbProfile().name : 'Benutzer';
var firstName = userName.split(' ')[0];
var nameEl = document.querySelector('[data-user-name]');
if(nameEl) nameEl.textContent = userName;
var avatarUrl = 'https://ui-avatars.com/api/?name='+encodeURIComponent(userName)+'&background=EF7D00&color=fff';
if(_sbProfile() && _sbProfile().avatar_url) avatarUrl = _sbProfile().avatar_url;
var avatarEl = document.querySelector('.topnav-desktop img.rounded-full');
if(avatarEl) avatarEl.src = avatarUrl;
var mobileAv = document.getElementById('userAvatarImgMobile');
if(mobileAv) mobileAv.src = avatarUrl;
// Dynamic welcome text
var welcomeEl = document.getElementById('welcomeText');
if(welcomeEl) {
    // Always start from German template, then translate
    welcomeEl.textContent = 'Willkommen zurück, ' + firstName + '!';
    welcomeEl.setAttribute('data-i18n-name', firstName);
}
// Dynamic date (language-aware)
var dateEl = document.getElementById('welcomeDate');
var now = new Date();
function getDateStr(lng) {
    var dD = {de:['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'],en:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],nl:['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag']};
    var mD = {de:['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],en:['January','February','March','April','May','June','July','August','September','October','November','December'],nl:['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']};
    var pre = {de:'Heute ist ',en:'Today is ',nl:'Vandaag is '};
    var l = lng || currentLang || 'de';
    var d = dD[l]||dD.de, m = mD[l]||mD.de, p = pre[l]||pre.de;
    return p + d[now.getDay()] + ', ' + now.getDate() + '. ' + m[now.getMonth()] + ' ' + now.getFullYear();
}
window.getDateStr = getDateStr;
var dateStr = getDateStr(currentLang);
if(dateEl) { dateEl.textContent = dateStr; dateEl.setAttribute('data-i18n-date','1'); }
var hqDateEl = document.getElementById('hqWelcomeDate');
if(hqDateEl) hqDateEl.textContent = 'Willkommen zurueck · ' + dateStr;
document.getElementById('loginScreen').style.display = 'none';
document.getElementById('mainApp').style.display = 'block';
try { updateUIForRole(); updatePremiumFeatures(); } catch(e) { console.warn(e); }
// Apply saved language
if(currentLang !== 'de') { setTimeout(function(){ if(typeof window.switchLang==='function') window.switchLang(currentLang); }, 500); }
// Apply dark mode to all dynamically rendered content
if(document.body.classList.contains('dark')) {
    setTimeout(function(){ if(typeof window.applyDarkModeInlineStyles==='function') window.applyDarkModeInlineStyles(true); }, 800);
    setTimeout(function(){ if(typeof window.applyDarkModeInlineStyles==='function') window.applyDarkModeInlineStyles(true); }, 2000);
    setTimeout(function(){ if(typeof window.applyDarkModeInlineStyles==='function') window.applyDarkModeInlineStyles(true); }, 4000);
}
// Apply DEMO/BETA badges
if(SESSION.account_level === 'extern') {
    _showView('externHome');
} else {
    // Restore last view from localStorage (if available)
    var _savedView = null;
    try { _savedView = localStorage.getItem('vit_lastView'); } catch(e) {}
    
    if(currentRole === 'hq') {
        window._vitRestoringView = true; // Flag to prevent showView from overwriting localStorage
        if(typeof window.switchViewMode==='function') window.switchViewMode('hq');
        window._vitRestoringView = false;
        // After HQ mode switch, restore saved view if it exists
        if(_savedView && _savedView !== 'home' && _savedView !== 'hqCockpit') {
            var _restoreAttempt = 0;
            var _tryRestore = function() {
                _restoreAttempt++;
                _showView(_savedView);
                // Also restore Entwicklung sub-tab if applicable
                if(_savedView === 'entwicklung') {
                    var _savedTab = null;
                    try { _savedTab = localStorage.getItem('vit_lastEntwicklungTab'); } catch(e) {}
                    if(_savedTab && typeof window.showEntwicklungTab === 'function') {
                        setTimeout(function() { window.showEntwicklungTab(_savedTab); }, 150);
                    } else if(_savedTab && _restoreAttempt < 5) {
                        // Module not loaded yet, retry
                        setTimeout(_tryRestore, 300);
                    }
                }
            };
            setTimeout(_tryRestore, 400);
        }
    } else {
        _showView(_savedView || 'home');
    }
}
// Load dashboard widgets with live data
if(currentRole !== 'hq' && SESSION.account_level !== 'extern') { if(typeof window.loadDashboardWidgets==='function') window.loadDashboardWidgets(); if(typeof window.loadAllgemeinData==='function') window.loadAllgemeinData(); }
// Check for pending approvals (HQ + GF only)
checkPendingApprovals();
checkDemoMode();
// Check BWA deadlines and create reminders
if(typeof window.checkBwaDeadlines==='function') window.checkBwaDeadlines();
// Auto-impersonation from URL param (?imp=demo or ?imp=userId)
var urlParams = new URLSearchParams(window.location.search);
var impParam = urlParams.get('imp');
if(impParam && currentRoles && currentRoles.indexOf('hq') >= 0) {
    // Clean URL without reloading
    window.history.replaceState({}, '', window.location.pathname);
    setTimeout(function() {
        if(impParam === 'demo') {
            impersonateDemo();
        } else {
            impersonateUser(impParam);
        }
    }, 500);
}
}

// === DEMO MODE SYSTEM ===
var isDemoMode = false;
var demoDataSeeded = false;

export function checkDemoMode() {
if(!sbProfile) return;
var isDemo = _sbProfile().status === 'demo' || _sbProfile().status === 'demo_active';
if(isDemo && !demoDataSeeded) {
    isDemoMode = true;
    seedDemoData();
    showDemoBanner();
} else if(!isDemo && demoDataSeeded) {
    isDemoMode = false;
    clearDemoData();
    removeDemoBanner();
}
}

export function showDemoBanner() {
if(document.getElementById('demoBanner')) return;
var banner = document.createElement('div');
banner.id = 'demoBanner';
banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;background:linear-gradient(90deg,#f97316,#ea580c);color:white;text-align:center;padding:8px 16px;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
banner.innerHTML = '\ud83c\udfad DEMO-MODUS AKTIV \u2013 Die angezeigten Daten sind Beispieldaten zur Veranschaulichung. <button onclick="removeDemoBanner()" style="margin-left:12px;background:rgba(255,255,255,0.2);border:none;color:white;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:11px;">\u2715 Ausblenden</button>';
document.body.prepend(banner);
document.body.style.paddingTop = '36px';
}

export function removeDemoBanner() {
var b = document.getElementById('demoBanner');
if(b) b.remove();
document.body.style.paddingTop = '0';
}

export async function seedDemoData() {
if(demoDataSeeded) return;
demoDataSeeded = true;
var stId = SESSION.standort_id;
if(!stId) return;
try {
    // Demo leads
    var demoLeads = [
        {standort_id:stId,name:'Thomas Müller',email:'t.mueller@example.com',telefon:'+49 170 1234567',interesse:'E-Bike Trekking',status:'neu',quelle:'Website',budget:'2000-3000',notizen:'Interessiert an Bosch CX Motor',demo_data:true},
        {standort_id:stId,name:'Lisa Schmidt',email:'l.schmidt@example.com',telefon:'+49 171 9876543',interesse:'Kinder-Mountainbike',status:'kontaktiert',quelle:'Empfehlung',budget:'500-800',notizen:'Für Tochter, 10 Jahre',demo_data:true},
        {standort_id:stId,name:'Hans Weber',email:'h.weber@example.com',telefon:'+49 172 5551234',interesse:'Rennrad Carbon',status:'angebot',quelle:'Laufkundschaft',budget:'3000-5000',notizen:'Wettkampfambition, sucht leichtes Rad',demo_data:true},
        {standort_id:stId,name:'Maria Fischer',email:'m.fischer@example.com',telefon:'+49 173 4445678',interesse:'City E-Bike',status:'verhandlung',quelle:'Google',budget:'2500-3500',notizen:'Pendlerin, 15km pro Tag',demo_data:true}
    ];
    await _sb().from('leads').insert(demoLeads);
    // Demo termine
    var today = new Date();
    var demoTermine = [
        {standort_id:stId,titel:'Probefahrt E-Bike',datum:new Date(today.getTime()+86400000).toISOString().split('T')[0],uhrzeit:'10:00',kunde:'Thomas Müller',typ:'probefahrt',notizen:'Bosch CX Testrad vorbereiten',demo_data:true},
        {standort_id:stId,titel:'Beratung Kinderrad',datum:new Date(today.getTime()+172800000).toISOString().split('T')[0],uhrzeit:'14:30',kunde:'Lisa Schmidt',typ:'beratung',notizen:'Mit Tochter',demo_data:true},
        {standort_id:stId,titel:'Werkstatt-Abholung',datum:new Date(today.getTime()+259200000).toISOString().split('T')[0],uhrzeit:'09:00',kunde:'Klaus Bauer',typ:'werkstatt',notizen:'Inspektion fertig',demo_data:true}
    ];
    await _sb().from('termine').insert(demoTermine);
    // Demo support tickets
    var demoTickets = [
        {standort_id:stId,erstellt_von:_sbUser().id,titel:'Bestellsystem zeigt falsche Preise',beschreibung:'Seit gestern werden bei einigen Artikeln die EK-Preise statt VK angezeigt.',prio:'hoch',status:'offen',kategorie:'IT & System',demo_data:true},
        {standort_id:stId,erstellt_von:_sbUser().id,titel:'Marketing-Material Q2 anfordern',beschreibung:'Brauche neue Plakate und Flyer für Frühjahrsaktion.',prio:'mittel',status:'offen',kategorie:'Marketing',demo_data:true}
    ];
    await _sb().from('support_tickets').insert(demoTickets);
    console.log('[Demo] Demo data seeded');
} catch(err) {
    console.warn('[Demo] Seed error:', err);
}
}

export async function clearDemoData() {
if(!demoDataSeeded) return;
demoDataSeeded = false;
var stId = SESSION.standort_id;
if(!stId) return;
try {
    await _sb().from('leads').delete().eq('standort_id', stId).eq('demo_data', true);
    await _sb().from('termine').delete().eq('standort_id', stId).eq('demo_data', true);
    await _sb().from('support_tickets').delete().eq('standort_id', stId).eq('demo_data', true);
    console.log('[Demo] Demo data cleared');
} catch(err) {
    console.warn('[Demo] Clear error:', err);
}
}

export async function checkPendingApprovals() {
var isHQ = currentRoles.indexOf('hq') >= 0 || (_sbProfile() && _sbProfile().is_hq);
if(!isHQ) return;
try {
    var query = _sb().from('users').select('id,name,email,created_at').in('status',['onboarding','pending']);
    // GF: nur eigener Standort
    if(!isHQ && sbStandort) query = query.eq('standort_id', sbStandort.id);
    var resp = await query;
    if(resp.error || !resp.data) return;
    // Filter: nur User die wirklich keine Rollen haben
    var pendingUsers = [];
    for(var i=0; i<resp.data.length; i++) {
        var rResp = await _sb().from('user_rollen').select('id').eq('user_id', resp.data[i].id);
        if(!rResp.data || rResp.data.length === 0) pendingUsers.push(resp.data[i]);
    }
    if(pendingUsers.length === 0) return;
    // Show notification banner
    var existing = document.getElementById('approvalBanner');
    if(existing) existing.remove();
    var names = pendingUsers.map(function(u){return u.name;}).join(', ');
    var btnAction;
    if(pendingUsers.length === 1) {
        btnAction = 'approveUser(\'' + pendingUsers[0].id + '\',\'' + (pendingUsers[0].name||'').replace(/'/g,"\\'") + '\');document.getElementById(\'approvalBanner\').remove();';
    } else {
        btnAction = 'showView(\'mitarbeiter\');document.getElementById(\'approvalBanner\').remove();';
    }
    var banner = document.createElement('div');
    banner.id = 'approvalBanner';
    banner.innerHTML = '<div style="position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:9000;max-width:600px;width:90%;" class="bg-yellow-50 border border-yellow-300 rounded-xl shadow-lg px-5 py-3 flex items-center justify-between">'
        + '<div class="flex items-center space-x-3">'
        + '<span class="text-2xl">\u26a0\ufe0f</span>'
        + '<div><p class="text-sm font-semibold text-yellow-800">' + pendingUsers.length + ' neue' + (pendingUsers.length===1?'r Mitarbeiter':' Mitarbeiter') + ' wartet auf Freigabe</p>'
        + '<p class="text-xs text-yellow-600">' + names + '</p></div></div>'
        + '<div class="flex items-center space-x-2">'
        + '<button onclick="' + btnAction + '" class="px-3 py-1.5 bg-vit-orange text-white text-xs font-semibold rounded-lg hover:opacity-90">Jetzt freigeben</button>'
        + '<button onclick="document.getElementById(\'approvalBanner\').remove();" class="text-yellow-400 hover:text-yellow-600 text-lg">\u2715</button>'
        + '</div></div>';
    document.body.appendChild(banner);
} catch(err) { console.warn('Approval check:', err); }
}

export async function loadPipelineFromSupabase() {
try {
    if(typeof verkaufData === 'undefined' && !window.verkaufData) { console.warn('Pipeline: verkaufData not yet available'); return; }
    var _vd = (typeof verkaufData !== 'undefined') ? verkaufData : window.verkaufData;
    var resp = await _sb().from('leads').select('*').order('created_at', { ascending: false });
    if(resp.error) throw resp.error;
    var stageMap = { 'neu':'lead','kontaktiert':'termin','angebot':'angebot','verhandlung':'beratung','gewonnen':'verkauft','verloren':'verloren' };
    _vd.pipeline = (resp.data||[]).map(function(l,i) {
        var d = new Date(l.created_at);
        return {
            id: i+1, sb_id: l.id,
            name: (l.vorname||'')+' '+(l.nachname||''),
            type: l.interesse||'E-Bike',
            seller: _sbProfile() ? _sbProfile().name.split(' ')[0] : 'Team',
            value: parseFloat(l.geschaetzter_wert)||0,
            stage: stageMap[l.status]||'lead',
            status_raw: l.status,
            date: d.getDate().toString().padStart(2,'0')+'.'+(d.getMonth()+1).toString().padStart(2,'0')+'.'
        };
    });
    if(document.getElementById('vkTabPipeline') && document.getElementById('vkTabPipeline').style.display !== 'none') renderPipeline();
} catch(err) { console.error('Pipeline load error:', err); }
}

export async function handleLogout() {
await _sb().auth.signOut();
sbUser = null; sbProfile = null; sbRollen = []; sbStandort = null;
window.sbUser = null; window.sbProfile = null; window.sbRollen = []; window.sbStandort = null;
var splash = document.getElementById('appSplash'); if(splash) splash.remove();
document.getElementById('loginScreen').style.display = 'flex';
document.getElementById('mainApp').style.display = 'none';
document.getElementById('homeView').style.display = 'none';
document.getElementById('pendingScreen').style.display = 'none';
document.getElementById('blockedScreen').style.display = 'none';
var fbw = document.getElementById('fbWidget'); if(fbw) fbw.style.display = 'none';
var fbctx = document.getElementById('fbContextPrompt'); if(fbctx) fbctx.style.display = 'none';
}

export async function checkSession() {
// Don't re-enter if impersonation or demo mode is active
if(_impActive || window.DEMO_ACTIVE) return;

// Detect password recovery from reset link (supports both hash fragments and PKCE query params)
var hash = window.location.hash;
var search = window.location.search;
var isRecovery = (hash && hash.includes('type=recovery')) || (search && search.includes('type=recovery'));
if (isRecovery) {
    // PKCE flow: exchange token_hash via verifyOtp
    var params = new URLSearchParams(search || hash.replace('#','?'));
    var tokenHash = params.get('token_hash');
    if (tokenHash) {
        try {
            var verifyResp = await _sb().auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
            if (verifyResp.data && verifyResp.data.session) {
                sbUser = verifyResp.data.session.user;
                window.sbUser = sbUser;
                // Clean URL
                window.history.replaceState({}, '', window.location.pathname);
                showChangePasswordModal();
                return;
            }
        } catch(e) { console.warn('Recovery token verify failed:', e); }
    }
    // Legacy implicit flow fallback
    var resp = await _sb().auth.getSession();
    if (resp.data.session) {
        sbUser = resp.data.session.user;
        window.sbUser = sbUser;
        window.history.replaceState({}, '', window.location.pathname);
        showChangePasswordModal();
        return;
    }
}
var resp = await _sb().auth.getSession();
if(resp.data.session && resp.data.session.user) {
    sbUser = resp.data.session.user;
    window.sbUser = sbUser;
    try {
        // Status-Check vor dem App-Laden
        var profileResp = await _sb().from('users').select('status').eq('id', _sbUser().id).single();
        
        if(profileResp.data && (profileResp.data.status === 'pending' || profileResp.data.status === 'onboarding')) {
            var _spl = document.getElementById('appSplash'); if(_spl) _spl.remove();
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('pendingScreen').style.display = 'flex';
            var pe = document.getElementById('pendingEmail');
            if(pe) pe.textContent = _sbUser().email || '';
            return;
        }
        if(profileResp.data && (profileResp.data.status === 'offboarding' || profileResp.data.status === 'gesperrt')) {
            var _spl2 = document.getElementById('appSplash'); if(_spl2) _spl2.remove();
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('blockedScreen').style.display = 'flex';
            return;
        }
        
        await loadUserProfile(_sbUser().id);
        await loadModulStatus();
        await loadFeatureFlags();
        enterApp();
    } catch(e) { console.warn('Auto-login failed:', e); _showLogin(); }
} else {
    _showLogin();
}
}

function _showLogin() {
    var splash = document.getElementById('appSplash'); if(splash) splash.remove();
    document.getElementById('loginScreen').style.display = 'flex';
}

export function showChangePasswordModal() {
var html = '<div id="changePwOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
html += '<div style="background:var(--c-bg);border-radius:16px;padding:28px;width:420px;max-width:90vw;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
html += '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold text-gray-800">\uD83D\uDD12 '+_t('pw_change_title')+'</h3></div>';
html += '<p class="text-sm text-gray-500 mb-4">'+_t('pw_change_desc')+'</p>';
html += '<input id="newPw1" type="password" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm mb-3" placeholder="'+_t('pw_change_new')+'">';
html += '<input id="newPw2" type="password" class="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm mb-3" placeholder="'+_t('pw_change_repeat')+'">';
html += '<div id="changePwMsg" style="display:none" class="text-sm rounded-lg p-3 mb-3"></div>';
html += '<button id="changePwBtn" onclick="submitNewPassword()" class="w-full py-2.5 bg-vit-orange text-white rounded-lg font-semibold text-sm hover:opacity-90">'+_t('pw_change_save')+'</button>';
html += '</div></div>';
var c = document.createElement('div'); c.id = 'changePwContainer'; c.innerHTML = html; document.body.appendChild(c);
}

export async function submitNewPassword() {
var pw1 = (document.getElementById('newPw1') || {}).value;
var pw2 = (document.getElementById('newPw2') || {}).value;
var msg = document.getElementById('changePwMsg');
var btn = document.getElementById('changePwBtn');
if (!pw1 || pw1.length < 6) { msg.className='text-sm rounded-lg p-3 mb-3 bg-red-50 border border-red-200 text-red-600'; msg.textContent='Mindestens 6 Zeichen.'; msg.style.display='block'; return; }
if (pw1 !== pw2) { msg.className='text-sm rounded-lg p-3 mb-3 bg-red-50 border border-red-200 text-red-600'; msg.textContent='Passwoerter stimmen nicht ueberein.'; msg.style.display='block'; return; }
btn.disabled = true; btn.textContent = 'Wird gespeichert...';
try {
    var resp = await _sb().auth.updateUser({ password: pw1 });
    if (resp.error) throw resp.error;
    msg.className='text-sm rounded-lg p-3 mb-3 bg-green-50 border border-green-200 text-green-700';
    msg.textContent=_t('ui_pw_changed_redirect');
    msg.style.display='block';
    // Clear hash and redirect
    window.location.hash = '';
    setTimeout(function() {
        var c = document.getElementById('changePwContainer'); if(c) c.remove();
        checkSession();
    }, 1500);
} catch(e) {
    var errMsg = e.message || 'Unbekannter Fehler';
    // Translate common Supabase Auth errors to German
    var translations = {
        'Password should be at least 6 characters': 'Passwort muss mindestens 6 Zeichen haben.',
        'Password should be at least 8 characters': 'Passwort muss mindestens 8 Zeichen haben.',
        'New password should be different from the old password': 'Das neue Passwort muss sich vom alten unterscheiden.',
        'Auth session missing': 'Sitzung abgelaufen. Bitte fordere einen neuen Reset-Link an.',
        'User not found': 'Benutzer nicht gefunden.',
        'Password is too short': 'Passwort ist zu kurz.',
        'Password is too weak': 'Passwort ist zu schwach. Verwende Gross-/Kleinbuchstaben, Zahlen und Sonderzeichen.'
    };
    for(var eng in translations) { if(errMsg.toLowerCase().indexOf(eng.toLowerCase()) >= 0) { errMsg = translations[eng]; break; } }
    msg.className='text-sm rounded-lg p-3 mb-3 bg-red-50 border border-red-200 text-red-600';
    msg.textContent=errMsg; msg.style.display='block';
    btn.disabled=false; btn.textContent='Passwort speichern';
}
}


// Update UI based on role
export function updateUIForRole() {
// Rollen-Texte
var roleLabels = {
    'inhaber': 'Geschäftsleitung',
    'verkauf': 'Verkauf',
    'werkstatt': 'Werkstatt',
    'buchhaltung': 'Buchhaltung',
    'hq': 'HQ',
    'hq_gf': 'GF', 'hq_sales': 'Sales', 'hq_marketing': 'Marketing',
    'hq_einkauf': 'Einkauf', 'hq_support': 'Support', 'hq_akademie': 'Akademie',
    'hq_hr': 'HR', 'hq_it': 'IT'
};

// Rollen-Anzeige zusammenbauen
if(!currentRoles || !Array.isArray(currentRoles)) currentRoles = ['inhaber'];
var roleDisplay = currentRoles.map(function(r){ return roleLabels[r]||r; }).join(', ');

// Location name from Supabase
var locationName = sbStandort ? sbStandort.name : 'Standort';
var isHQ = currentRole === 'hq' || (_sbProfile() && _sbProfile().is_hq);

var userRoleText = document.getElementById('userRoleText');
var locationDisplay = document.getElementById('locationDisplay');
var locationDisplayMobile = document.getElementById('locationDisplayMobile');
var userRoleDisplay = document.getElementById('userRoleDisplay');

var displayLocation = isHQ ? '🏢 HQ – Netzwerk' : locationName;
if (userRoleText) userRoleText.textContent = roleDisplay;
if (locationDisplay) locationDisplay.textContent = displayLocation;
if (locationDisplayMobile) locationDisplayMobile.textContent = displayLocation;
if (userRoleDisplay) userRoleDisplay.textContent = isHQ ? '' : '';

// Premium Badge
var premiumBadge = document.getElementById('premiumBadge');
if (premiumBadge) {
    if (isPremium) {
        premiumBadge.innerHTML = '<span class="premium-badge">PREMIUM</span>';
        premiumBadge.classList.remove('view-hidden');
    } else {
        premiumBadge.classList.add('view-hidden');
    }
}

var isInhaber = hasRole('inhaber');

// HQ Toggle anzeigen für Inhaber
var hqToggle = document.getElementById('hqToggleSection');
if(hqToggle) hqToggle.classList.toggle('hidden', !isInhaber);
var btnStandort = document.getElementById('btnModeStandort');
var btnHQ = document.getElementById('btnModeHQ');
if(btnStandort) btnStandort.className = 'flex-1 py-2 px-3 rounded-md text-xs font-bold transition ' + (isHQ ? 'text-white/60 hover:text-white' : 'bg-white text-gray-800');
if(btnHQ) btnHQ.className = 'flex-1 py-2 px-3 rounded-md text-xs font-bold transition ' + (isHQ ? 'bg-white text-gray-800' : 'text-white/60 hover:text-white');

// === SIDEBAR VISIBILITY ===
// Partner QuickNav (Startseite, Kalender, Aufgaben, Kommunikation) - alle Standort-Rollen
var partnerQuickNav = document.getElementById('partnerQuickNav');
if(partnerQuickNav) partnerQuickNav.classList.toggle('hidden', isHQ);

// Dashboards - nur Inhaber
var ownerDashboards = document.getElementById('ownerDashboards');
if(ownerDashboards) ownerDashboards.classList.toggle('hidden', !isInhaber || isHQ);

// Fachbereiche Container
var commonTools = document.getElementById('commonTools');
if(commonTools) commonTools.classList.toggle('hidden', isHQ);

// Einzelne Fachbereich-Buttons per Rolle steuern
var sidebarViews = {
    'allgemein': ['inhaber','buchhaltung'],
    'verkauf': ['inhaber','verkauf','buchhaltung'],
    'einkauf': ['inhaber','werkstatt','buchhaltung'],
    'marketing': ['inhaber','verkauf'],
    'controlling': ['inhaber','buchhaltung']
};
Object.keys(sidebarViews).forEach(function(viewName){
    var btns = document.querySelectorAll('[onclick*=\"_showView(\\\''+viewName+'\\\')\"]');
    btns.forEach(function(btn){
        var allowed = false;
        sidebarViews[viewName].forEach(function(r){ if(hasRole(r)) allowed=true; });
        btn.classList.toggle('hidden', !allowed);
    });
});

// Tools-Bereich Einzelsteuerung
var toolViews = {
    'wissen': ['alle'],
    'support': ['alle'],
    'aktenschrank': ['inhaber','buchhaltung'],
    'entwicklung': ['alle'],
    'shop': ['inhaber']
};
Object.keys(toolViews).forEach(function(viewName){
    var btns = document.querySelectorAll('[onclick*=\"_showView(\\\''+viewName+'\\\')\"]');
    btns.forEach(function(btn){
        if(btn.closest('#hqMenu')) return; if(isHQ) { btn.classList.add('hidden'); return; }
        var perms = toolViews[viewName];
        var allowed = perms.indexOf('alle')>=0;
        if(!allowed) perms.forEach(function(r){ if(hasRole(r)) allowed=true; });
        btn.classList.toggle('hidden', !allowed);
    });
});

// Onboarding - nur Inhaber
var onboardingNav = document.getElementById('onboardingNavSection');
if(onboardingNav) onboardingNav.classList.toggle('hidden', !isInhaber || isHQ);

// Mitarbeiter - nur Inhaber
var mitarbeiterNav = document.getElementById('mitarbeiterNavSection');
if(mitarbeiterNav) mitarbeiterNav.classList.toggle('hidden', !isInhaber || isHQ);

// Partner Tools (Wissen, Support, Ideenboard, Shop) - alle Standort-Rollen
var partnerToolsNav = document.getElementById('partnerToolsNav');
if(partnerToolsNav) partnerToolsNav.classList.toggle('hidden', isHQ);

// HQ Menu
var hqMenu = document.getElementById('hqMenu');
if(hqMenu) hqMenu.classList.toggle('hidden', !isHQ);

// === HQ GRANULAR ROLE-BASED VISIBILITY ===
if(isHQ && hqMenu) {
    var isLegacyHQ = hasRole('hq');
    var isHqGF = hasRole('hq_gf');
    var hasFullAccess = isLegacyHQ || isHqGF;

    if(!hasFullAccess && window._hqModulPerms) {
        // Apply granular permissions from modul_berechtigungen
        hqMenu.querySelectorAll('[data-hq-module]').forEach(function(btn) {
            var mod = btn.getAttribute('data-hq-module');
            var allowed = window._hqModulPerms[mod] || false;
            btn.classList.toggle('hidden', !allowed);
        });
    }
    // Legacy HQ, GF → show everything (no hiding)
}

// HQ Impersonation buttons (show if real user is HQ or currently impersonating, but NOT in demo mode)
var sidebarBtmHQ = document.getElementById('sidebarBottomHQ');
var isDemoActive = window.DEMO_ACTIVE || false;
if(sidebarBtmHQ) sidebarBtmHQ.style.display = ((isHQ || _impActive) && !isDemoActive) ? '' : 'none';

// ═══ EXTERN MENU ═══
var isExtern = SESSION.account_level === 'extern';
var externMenu = document.getElementById('externMenu');
if(externMenu) externMenu.classList.toggle('hidden', !isExtern);

// Hide all partner sections when extern
if(isExtern) {
    if(partnerQuickNav) partnerQuickNav.classList.add('hidden');
    if(ownerDashboards) ownerDashboards.classList.add('hidden');
    if(commonTools) commonTools.classList.add('hidden');
    if(onboardingNav) onboardingNav.classList.add('hidden');
    if(mitarbeiterNav) mitarbeiterNav.classList.add('hidden');
    var ptNav = document.getElementById('partnerToolsNav');
    if(ptNav) ptNav.classList.add('hidden');
    var devNav = document.getElementById('devStatusNavSection');
    if(devNav) devNav.classList.add('hidden');
}

// Update location display for extern
if(isExtern) {
    var stageLabels = {phase0:'⚡ BikeEngine',part1:'📋 Trainingsphase Part 1',part2:'📋 Trainingsphase Part 2',partner:'✅ Partner'};
    if(locationDisplay) locationDisplay.textContent = stageLabels[SESSION.stage] || '⚡ BikeEngine';
    if(locationDisplayMobile) locationDisplayMobile.textContent = stageLabels[SESSION.stage] || '⚡ BikeEngine';
    if(userRoleText) userRoleText.textContent = 'Extern';
}

// Show stage-badge in header for standort in training
if(SESSION.account_level === 'standort' && SESSION.stage !== 'partner') {
    var stageLabels2 = {part1:'Training Part 1',part2:'Training Part 2'};
    var premBadge = document.getElementById('premiumBadge');
    if(premBadge) {
        premBadge.innerHTML = '<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:9999px;font-size:10px;font-weight:700;letter-spacing:0.3px;background:#ede9fe;color:#6d28d9;">🎓 '+(stageLabels2[SESSION.stage]||SESSION.stage)+'</span>';
        premBadge.classList.remove('view-hidden');
    }
}
}

// Switch between Chat and Forum in Communication view
export function switchCommunicationTab(tab) {
const chatTab = document.getElementById('chatTab');
const forumTab = document.getElementById('forumTab');
const chatSection = document.getElementById('chatSection');
const forumSection = document.getElementById('forumSection');

if (tab === 'chat') {
    chatTab.classList.remove('bg-gray-200', 'text-gray-700');
    chatTab.classList.add('bg-vit-orange', 'text-white');
    forumTab.classList.remove('bg-vit-orange', 'text-white');
    forumTab.classList.add('bg-gray-200', 'text-gray-700');
    chatSection.style.display = 'block';
    forumSection.style.display = 'none';
} else {
    forumTab.classList.remove('bg-gray-200', 'text-gray-700');
    forumTab.classList.add('bg-vit-orange', 'text-white');
    chatTab.classList.remove('bg-vit-orange', 'text-white');
    chatTab.classList.add('bg-gray-200', 'text-gray-700');
    forumSection.style.display = 'block';
    chatSection.style.display = 'none';
}
}

// Update premium features visibility
export function updatePremiumFeatures() {
const premiumMenuItems = document.querySelectorAll('.premium-menu-item');
const premiumFeatures = document.querySelectorAll('.premium-feature');

premiumMenuItems.forEach(item => {
    if (!isPremium) {
        item.classList.add('locked-menu-item');
        item.onclick = function(e) {
            e.preventDefault();
            showPremiumUpgradeModal();
        };
    } else {
        item.classList.remove('locked-menu-item');
    }
});

premiumFeatures.forEach(feature => {
    if (!isPremium) {
        feature.classList.add('locked');
    } else {
        feature.classList.remove('locked');
    }
});
}

// Show premium upgrade modal
export function showPremiumUpgradeModal() {
alert('🔒 Premium Feature\n\nDiese Funktion ist nur für vit:bikes Franchisenehmer verfügbar.\n\n✨ Werde vit:bikes Partner und erhalte Zugang zu:\n• Marketing-Materialien vom HQ\n• Best Practice Forum\n• Einkaufsvorteile\n• Schulungen & Support\n\nInteresse? Kontaktiere uns unter: partner@vitbikes.de');
}

// Show specific view

// Dashboard Widget Management
let dashboardEditMode = false;

export function toggleDashboardEdit() {
dashboardEditMode = !dashboardEditMode;
const addPanel = document.getElementById('widgetAddPanel');
const removeButtons = document.querySelectorAll('.widget-remove');
const editButton = document.getElementById('dashboardEditButton');

if (dashboardEditMode) {
    addPanel.classList.remove('hidden');
    removeButtons.forEach(btn => btn.classList.remove('hidden'));
    editButton.textContent = 'Fertig';
} else {
    addPanel.classList.add('hidden');
    removeButtons.forEach(btn => btn.classList.add('hidden'));
    editButton.textContent = 'Dashboard anpassen';
}
}

export function addWidget(widgetName) {
const widget = document.querySelector(`[data-widget="${widgetName}"]`);
if (widget) {
    widget.style.display = 'block';
    _showToast(`Widget "${widgetName}" hinzugefügt`);
}
}

// Widget Remove (Event Delegation)
document.addEventListener('click', function(e) {
if (e.target.closest('.widget-remove')) {
    const widget = e.target.closest('.dashboard-widget');
    const widgetName = widget.getAttribute('data-widget');
    widget.style.display = 'none';
    _showToast(`Widget "${widgetName}" entfernt`);
}
});

// Tab Switching Functions

export function showMarketingTab(tabName) {
// Hide all marketing tabs
document.querySelectorAll('.marketing-tab-content').forEach(function(tab) { tab.style.display = 'none'; });

// Reset all tab buttons
document.querySelectorAll('.marketing-tab-btn').forEach(function(btn) {
    btn.className = 'marketing-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
});

// Show selected tab content
var tabId = 'marketingTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
var tabEl = document.getElementById(tabId);
if (tabEl) tabEl.style.display = 'block';

// Highlight active tab button
var activeBtn = document.querySelector('.marketing-tab-btn[data-tab="' + tabName + '"]');
if (activeBtn) {
    activeBtn.className = 'marketing-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
}

// Init Social Media themen on first open
if(tabName==='social') { renderSmThemen(); if(window.updateSocialMediaCards) updateSocialMediaCards(); }
if(tabName==='budget') { renderMktSpendingChart(); }
if(tabName==='leads') { renderMktLeadChart(); }
}



// Strangler Fig
// Sync auth state to window for cross-module access
window.sbUser = sbUser; window.sbProfile = sbProfile; window.sbRollen = sbRollen;
window.sbStandort = sbStandort; window.currentRole = currentRole; window.currentRoles = currentRoles;
window.currentStandortId = currentStandortId; window.currentLocation = currentLocation;
window.currentLang = currentLang; window.isPremium = isPremium; window.SESSION = SESSION;

const _exports = {initMilestonesForStage,getMilestoneStatus,setMilestoneStatus,logOnboardingAction,evaluateTransitions,executeTransition,applyForPart1,updateLocationInfo,hasAccess,hasRole,hqCan,impersonateDemo,impersonateUser,_saveOrigState,_activateImpersonation,exitImpersonation,_restoreOrigState,quickLogin,showPasswordReset,closePwReset,submitPwReset,showRegistration,hideRegistration,submitRegistration,handleLogin,loadUserProfile,enterApp,checkDemoMode,showDemoBanner,removeDemoBanner,seedDemoData,clearDemoData,checkPendingApprovals,loadPipelineFromSupabase,handleLogout,checkSession,showChangePasswordModal,submitNewPassword,updateUIForRole,switchCommunicationTab,updatePremiumFeatures,showPremiumUpgradeModal,toggleDashboardEdit,addWidget,showMarketingTab};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[auth-system.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');

// === Window Exports (onclick handlers) ===
window.addWidget = addWidget;
window.exitImpersonation = exitImpersonation;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.impersonateUser = impersonateUser;
window.showPasswordReset = showPasswordReset;
window.showRegistration = showRegistration;
window.switchCommunicationTab = switchCommunicationTab;
window.toggleDashboardEdit = toggleDashboardEdit;
