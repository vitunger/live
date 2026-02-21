/**
 * views/feature-flags-full.js - Feature Flags & Backup System (full)
 * @module views/feature-flags-full
 */
var sbFeatureFlags = window.sbFeatureFlags || {};
var sbModulStatus = window.sbModulStatus || {};
var sbHqModulStatus = window.sbHqModulStatus || {};
var sbModulConfig = window.sbModulConfig || {};
var sbHqModulConfig = window.sbHqModulConfig || {};
var sbModulEbene = window.sbModulEbene || {};

function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

export async function loadFeatureFlags() {
    try {
        var resp = await _sb().from('feature_flags').select('flag_key, enabled, rollout_percent, target_roles, target_standorte, target_users, scope, metadata, expires_at');
        if(resp.error) throw resp.error;
        sbFeatureFlags = {};
        (resp.data||[]).forEach(function(f) { sbFeatureFlags[f.flag_key] = f; });
        console.log('[FeatureFlags] Loaded ' + Object.keys(sbFeatureFlags).length + ' flags');
        applyFeatureFlags();
    } catch(err) { console.error('[FeatureFlags] Load error:', err); }
}

export function isFeatureEnabled(flagKey) {
    var flag = sbFeatureFlags[flagKey];
    if(!flag || !flag.enabled) return false;
    if(flag.expires_at && new Date(flag.expires_at) < new Date()) return false;

    var hasUserTargeting = flag.target_users && flag.target_users.length > 0;
    if(hasUserTargeting && sbUser && flag.target_users.indexOf(_sbUser().id) !== -1) return true;

    var hasStandortTargeting = flag.target_standorte && flag.target_standorte.length > 0;
    if(hasStandortTargeting) {
        var uid = _sbProfile() ? _sbProfile().standort_id : null;
        if(uid && flag.target_standorte.indexOf(uid) !== -1) return true;
    }

    var hasRoleTargeting = flag.target_roles && flag.target_roles.length > 0;
    if(hasRoleTargeting) {
        var match = (sbRollen||[]).some(function(r){ return flag.target_roles.indexOf(r) !== -1; });
        if(match) return true;
    }

    if(hasUserTargeting || hasStandortTargeting || hasRoleTargeting) return false;

    if(flag.rollout_percent < 100) {
        var h = 0, s = ((sbUser && _sbUser().id)||'anon') + flagKey;
        for(var i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; }
        return (Math.abs(h) % 100) < flag.rollout_percent;
    }
    return true;
}

export function getFeatureMeta(flagKey, key, def) {
    var f = sbFeatureFlags[flagKey];
    if(!f || !f.metadata) return def !== undefined ? def : null;
    return f.metadata[key] !== undefined ? f.metadata[key] : (def !== undefined ? def : null);
}

export function applyFeatureFlags() {
    document.querySelectorAll('[data-feature]').forEach(function(el) {
        var k = el.getAttribute('data-feature');
        var result = isFeatureEnabled(k);
        el.style.display = result ? '' : 'none';
        if(typeof logFeatureFlagCheck === 'function') logFeatureFlagCheck(k, result);
    });
}

// ============================================
// HQ FEATURE FLAGS MANAGEMENT
// ============================================
var ffCurrentFilter = 'all';
var ffAllFlags = [];
var ffAllStandorte = [];
var ffAllUsers = [];
var ffAvailableRoles = ['inhaber','geschaeftsleitung','verkaeufer','werkstatt','admin','hq_admin','hq_mitarbeiter'];

export async function loadFFView() {
    try {
        var [flagsResp, standorteResp, usersResp] = await Promise.all([
            _sb().from('feature_flags').select('*').order('created_at', {ascending: false}),
            _sb().from('standorte').select('id, name, ort').order('name'),
            _sb().from('users').select('id, vorname, nachname, email, standort_id').order('nachname')
        ]);
        if(flagsResp.error) throw flagsResp.error;
        ffAllFlags = flagsResp.data || [];
        ffAllStandorte = standorteResp.data || [];
        ffAllUsers = usersResp.data || [];
        ffUpdateStats();
        ffRenderList();
    } catch(err) {
        console.error('[FF] Load error:', err);
        document.getElementById('ffFlagsList').innerHTML = '<p class="p-6 text-center text-red-500">Fehler beim Laden: ' + err.message + '</p>';
    }
}

export function ffUpdateStats() {
    var total = ffAllFlags.length;
    var active = ffAllFlags.filter(function(f){ return f.enabled && !ffHasTargeting(f); }).length;
    var beta = ffAllFlags.filter(function(f){ return f.enabled && ffHasTargeting(f); }).length;
    var disabled = ffAllFlags.filter(function(f){ return !f.enabled; }).length;
    document.getElementById('ffStatTotal').textContent = total;
    document.getElementById('ffStatActive').textContent = active;
    document.getElementById('ffStatBeta').textContent = beta;
    document.getElementById('ffStatDisabled').textContent = disabled;
}

export function ffHasTargeting(f) {
    return (f.target_users && f.target_users.length > 0) ||
           (f.target_standorte && f.target_standorte.length > 0) ||
           (f.target_roles && f.target_roles.length > 0) ||
           (f.rollout_percent < 100);
}

export function ffGetStatus(f) {
    if(!f.enabled) return {label:'Deaktiviert', color:'bg-gray-100 text-gray-600', dot:'bg-gray-400'};
    if(f.expires_at && new Date(f.expires_at) < new Date()) return {label:'Abgelaufen', color:'bg-red-100 text-red-600', dot:'bg-red-400'};
    if(ffHasTargeting(f)) return {label:'Beta', color:'bg-purple-100 text-purple-700', dot:'bg-purple-500'};
    return {label:'Aktiv (alle)', color:'bg-green-100 text-green-700', dot:'bg-green-500'};
}

export function ffFilter(type) {
    ffCurrentFilter = type;
    document.querySelectorAll('.ff-filter').forEach(function(btn){
        var isActive = btn.getAttribute('data-f') === type;
        btn.className = 'ff-filter text-xs px-3 py-1.5 rounded-full font-semibold ' + (isActive ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600');
    });
    ffRenderList();
}

export function ffRenderList() {
    var filtered = ffAllFlags;
    if(ffCurrentFilter === 'active') filtered = ffAllFlags.filter(function(f){ return f.enabled && !ffHasTargeting(f); });
    else if(ffCurrentFilter === 'beta') filtered = ffAllFlags.filter(function(f){ return f.enabled && ffHasTargeting(f); });
    else if(ffCurrentFilter === 'disabled') filtered = ffAllFlags.filter(function(f){ return !f.enabled; });

    if(!filtered.length) {
        document.getElementById('ffFlagsList').innerHTML = '<p class="p-6 text-center text-gray-400">Keine Feature Flags in dieser Kategorie</p>';
        return;
    }

    var h = '';
    filtered.forEach(function(f) {
        var st = ffGetStatus(f);
        var targeting = [];
        if(f.target_roles && f.target_roles.length) targeting.push(f.target_roles.length + ' Rolle(n)');
        if(f.target_standorte && f.target_standorte.length) targeting.push(f.target_standorte.length + ' Standort(e)');
        if(f.target_users && f.target_users.length) targeting.push(f.target_users.length + ' User');
        if(f.rollout_percent < 100) targeting.push(f.rollout_percent + '% Rollout');
        var targetStr = targeting.length ? targeting.join(' · ') : 'Alle Nutzer';

        h += '<div class="p-4 hover:bg-gray-50 flex items-center justify-between group">';
        h += '<div class="flex items-center space-x-3 flex-1 min-w-0">';
        h += '<div class="w-2.5 h-2.5 rounded-full flex-shrink-0 ' + st.dot + '"></div>';
        h += '<div class="min-w-0">';
        h += '<div class="flex items-center space-x-2">';
        h += '<span class="font-semibold text-sm text-gray-800 truncate">' + (f.name || f.flag_key) + '</span>';
        h += '<code class="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">' + f.flag_key + '</code>';
        if(f.scope !== 'feature') h += '<span class="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">' + f.scope + '</span>';
        if(f.modul_key) h += '<span class="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">' + f.modul_key + '</span>';
        h += '</div>';
        h += '<p class="text-xs text-gray-500 mt-0.5">' + targetStr + '</p>';
        if(f.description) h += '<p class="text-xs text-gray-400 mt-0.5 truncate">' + f.description + '</p>';
        h += '</div></div>';
        h += '<div class="flex items-center space-x-3 flex-shrink-0">';
        h += '<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ' + st.color + '">' + st.label + '</span>';
        h += '<label class="relative inline-flex items-center cursor-pointer">';
        h += '<input type="checkbox" class="sr-only peer" ' + (f.enabled ? 'checked' : '') + ' onchange="ffToggle(\'' + f.id + '\', this.checked)">';
        h += '<div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-vit-orange"></div>';
        h += '</label>';
        h += '<button onclick="ffShowEdit(\'' + f.id + '\')" class="text-gray-400 hover:text-vit-orange text-sm opacity-0 group-hover:opacity-100 transition" title="Bearbeiten">✏️</button>';
        h += '<button onclick="ffDelete(\'' + f.id + '\')" class="text-gray-400 hover:text-red-500 text-sm opacity-0 group-hover:opacity-100 transition" title="Löschen">🗑️</button>';
        h += '</div></div>';
    });
    document.getElementById('ffFlagsList').innerHTML = h;
}

export async function ffToggle(flagId, enabled) {
    try {
        var resp = await _sb().from('feature_flags').update({enabled: enabled, updated_at: new Date().toISOString(), updated_by: _sbUser() ? _sbUser().id : null}).eq('id', flagId);
        if(resp.error) throw resp.error;
        var f = ffAllFlags.find(function(x){ return x.id === flagId; });
        if(f) f.enabled = enabled;
        ffUpdateStats();
        ffRenderList();
        await loadFeatureFlags(); // refresh client-side flags
        _showToast(enabled ? '✅ Feature aktiviert' : '⏸️ Feature deaktiviert', 'success');
    } catch(err) {
        console.error('[FF] Toggle error:', err);
        _showToast('Fehler: ' + err.message, 'error');
    }
}

export async function ffDelete(flagId) {
    if(!confirm('Feature Flag wirklich löschen?')) return;
    try {
        var resp = await _sb().from('feature_flags').delete().eq('id', flagId);
        if(resp.error) throw resp.error;
        ffAllFlags = ffAllFlags.filter(function(x){ return x.id !== flagId; });
        ffUpdateStats();
        ffRenderList();
        await loadFeatureFlags();
        _showToast('🗑️ Feature Flag gelöscht', 'success');
    } catch(err) {
        console.error('[FF] Delete error:', err);
        _showToast('Fehler: ' + err.message, 'error');
    }
}

export function ffShowCreate() {
    document.getElementById('ffEditId').value = '';
    document.getElementById('ffModalTitle').textContent = 'Neuer Feature Flag';
    document.getElementById('ffKey').value = '';
    document.getElementById('ffKey').disabled = false;
    document.getElementById('ffName').value = '';
    document.getElementById('ffDesc').value = '';
    document.getElementById('ffScope').value = 'feature';
    document.getElementById('ffModul').value = '';
    document.getElementById('ffRollout').value = 100;
    document.getElementById('ffEnabled').checked = false;
    document.getElementById('ffExpires').value = '';
    ffPopulateSelectors();
    document.getElementById('ffModal').style.display = 'flex';
}

export function ffShowEdit(flagId) {
    var f = ffAllFlags.find(function(x){ return x.id === flagId; });
    if(!f) return;
    document.getElementById('ffEditId').value = f.id;
    document.getElementById('ffModalTitle').textContent = 'Feature Flag bearbeiten';
    document.getElementById('ffKey').value = f.flag_key;
    document.getElementById('ffKey').disabled = true;
    document.getElementById('ffName').value = f.name || '';
    document.getElementById('ffDesc').value = f.description || '';
    document.getElementById('ffScope').value = f.scope || 'feature';
    document.getElementById('ffModul').value = f.modul_key || '';
    document.getElementById('ffRollout').value = f.rollout_percent;
    document.getElementById('ffEnabled').checked = f.enabled;
    document.getElementById('ffExpires').value = f.expires_at ? f.expires_at.substring(0,10) : '';
    ffPopulateSelectors(f);
    document.getElementById('ffModal').style.display = 'flex';
}

export function ffPopulateSelectors(flag) {
    // Roles
    var rolesHtml = '';
    ffAvailableRoles.forEach(function(r) {
        var checked = flag && flag.target_roles && flag.target_roles.indexOf(r) !== -1;
        rolesHtml += '<label class="flex items-center space-x-1.5 text-xs bg-gray-100 rounded-full px-3 py-1.5 cursor-pointer hover:bg-gray-200">';
        rolesHtml += '<input type="checkbox" class="ff-role-cb w-3 h-3" value="' + r + '"' + (checked ? ' checked' : '') + '>';
        rolesHtml += '<span>' + r + '</span></label>';
    });
    document.getElementById('ffRolesSelector').innerHTML = rolesHtml;

    // Standorte
    var stHtml = '';
    ffAllStandorte.forEach(function(s) {
        var sel = flag && flag.target_standorte && flag.target_standorte.indexOf(s.id) !== -1;
        stHtml += '<option value="' + s.id + '"' + (sel ? ' selected' : '') + '>' + s.name + (s.ort ? ' (' + s.ort + ')' : '') + '</option>';
    });
    document.getElementById('ffStandorte').innerHTML = stHtml;

    // Users
    var uHtml = '';
    ffAllUsers.forEach(function(u) {
        var sel = flag && flag.target_users && flag.target_users.indexOf(u.id) !== -1;
        var label = (u.vorname || '') + ' ' + (u.nachname || '') + (u.email ? ' <' + u.email + '>' : '');
        uHtml += '<option value="' + u.id + '"' + (sel ? ' selected' : '') + '>' + label.trim() + '</option>';
    });
    document.getElementById('ffUsers').innerHTML = uHtml;
}

export function ffCloseModal() {
    document.getElementById('ffModal').style.display = 'none';
}

export async function ffSave() {
    var editId = document.getElementById('ffEditId').value;
    var flagKey = document.getElementById('ffKey').value.trim();
    var name = document.getElementById('ffName').value.trim();
    if(!flagKey || !name) { _showToast('Flag Key und Name sind Pflichtfelder', 'error'); return; }
    if(!editId && !/^[a-z0-9_]+$/.test(flagKey)) { _showToast('Flag Key: nur Kleinbuchstaben, Zahlen, Unterstriche', 'error'); return; }

    var selectedRoles = [];
    document.querySelectorAll('.ff-role-cb:checked').forEach(function(cb){ selectedRoles.push(cb.value); });
    var selectedStandorte = Array.from(document.getElementById('ffStandorte').selectedOptions).map(function(o){ return o.value; });
    var selectedUsers = Array.from(document.getElementById('ffUsers').selectedOptions).map(function(o){ return o.value; });
    var expiresVal = document.getElementById('ffExpires').value;

    var data = {
        name: name,
        description: document.getElementById('ffDesc').value.trim() || null,
        enabled: document.getElementById('ffEnabled').checked,
        rollout_percent: parseInt(document.getElementById('ffRollout').value) || 100,
        scope: document.getElementById('ffScope').value,
        modul_key: document.getElementById('ffModul').value.trim() || null,
        target_roles: selectedRoles,
        target_standorte: selectedStandorte,
        target_users: selectedUsers,
        expires_at: expiresVal ? new Date(expiresVal + 'T23:59:59Z').toISOString() : null,
        updated_at: new Date().toISOString(),
        updated_by: _sbUser() ? _sbUser().id : null
    };

    try {
        var resp;
        if(editId) {
            resp = await _sb().from('feature_flags').update(data).eq('id', editId).select();
        } else {
            data.flag_key = flagKey;
            data.created_by = _sbUser() ? _sbUser().id : null;
            resp = await _sb().from('feature_flags').insert(data).select();
        }
        if(resp.error) throw resp.error;
        ffCloseModal();
        await loadFFView();
        await loadFeatureFlags();
        _showToast(editId ? '✅ Feature Flag aktualisiert' : '✅ Feature Flag erstellt', 'success');
    } catch(err) {
        console.error('[FF] Save error:', err);
        _showToast('Fehler: ' + err.message, 'error');
    }
}

// ============================================
// FEATURE FLAG EVENT LOGGING
// ============================================
var ffLogQueue = [];
var ffLogTimer = null;

export function logFeatureFlagCheck(flagKey, result) {
    if(!sbUser) return;
    ffLogQueue.push({
        flag_key: flagKey,
        user_id: _sbUser().id,
        standort_id: _sbProfile() ? _sbProfile().standort_id : null,
        action: 'check',
        result: result,
        metadata: {ua: navigator.userAgent.substring(0,100)},
        created_at: new Date().toISOString()
    });
    if(!ffLogTimer) {
        ffLogTimer = setTimeout(ffFlushLog, 5000); // batch every 5s
    }
}

export async function ffFlushLog() {
    ffLogTimer = null;
    if(!ffLogQueue.length) return;
    var batch = ffLogQueue.splice(0, 50);
    try {
        await _sb().from('feature_flag_events').insert(batch);
    } catch(err) {
        console.warn('[FF] Event log error:', err.message);
    }
}

// Hook into showView to load FF management when navigated to
var _origShowView = typeof showView === 'function' ? showView : null;

// ============================================
// HQ BACKUP DASHBOARD
// ============================================
export async function loadBkView() {
    var days = parseInt(document.getElementById('bkFilterDays')?.value || '7');
    var since = new Date(Date.now() - days * 86400000).toISOString();
    try {
        var { data, error } = await _sb().from('backup_log')
            .select('*')
            .gte('started_at', since)
            .order('started_at', { ascending: false });
        if(error) throw error;
        var logs = data || [];
        bkRenderStats(logs, days);
        bkRenderTable(logs);
        bkRenderHealth(logs);
    } catch(err) {
        console.error('[Backup Dashboard]', err);
        _showToast('Fehler beim Laden der Backup-Daten', 'error');
    }
}

export function bkRenderStats(logs, days) {
    // Last backup
    var last = logs[0];
    if(last) {
        var d = new Date(last.started_at);
        document.getElementById('bkLastTime').textContent = d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'});
        var st = last.status === 'completed' ? '✅ Erfolgreich' : last.status === 'running' ? '⏳ Laeuft...' : '❌ Fehlgeschlagen';
        var stColor = last.status === 'completed' ? 'text-green-600' : last.status === 'running' ? 'text-yellow-600' : 'text-red-600';
        document.getElementById('bkLastStatus').innerHTML = '<span class="' + stColor + '">' + st + '</span>';
    } else {
        document.getElementById('bkLastTime').textContent = '-';
        document.getElementById('bkLastStatus').textContent = 'Keine Daten';
    }

    // 24h count
    var h24 = new Date(Date.now() - 86400000).toISOString();
    var count24 = logs.filter(function(l) { return l.started_at >= h24; }).length;
    document.getElementById('bkCount24h').textContent = count24;

    // Tables
    if(last && last.tables_backed_up) {
        document.getElementById('bkTableCount').textContent = last.tables_backed_up.length;
    } else {
        document.getElementById('bkTableCount').textContent = '-';
    }

    // Total size in period
    var totalBytes = logs.reduce(function(s, l) { return s + (l.total_size_bytes || 0); }, 0);
    if(totalBytes > 1048576) {
        document.getElementById('bkSizeTotal').textContent = (totalBytes / 1048576).toFixed(1) + ' MB';
    } else {
        document.getElementById('bkSizeTotal').textContent = Math.round(totalBytes / 1024) + ' KB';
    }
}

export function bkRenderHealth(logs) {
    var dot = document.getElementById('bkHealthDot');
    var txt = document.getElementById('bkHealthText');
    var container = document.getElementById('bkHealth');
    
    var h3 = new Date(Date.now() - 3 * 3600000).toISOString();
    var recent = logs.filter(function(l) { return l.started_at >= h3 && l.status === 'completed'; });
    
    if(recent.length >= 2) {
        dot.className = 'w-3 h-3 rounded-full bg-green-500 animate-pulse';
        txt.textContent = 'Backup-System laeuft normal — ' + recent.length + ' erfolgreiche Backups in den letzten 3 Stunden';
        txt.className = 'text-sm font-medium text-green-700';
        container.className = 'mb-6 p-4 rounded-xl border border-green-200 bg-green-50 flex items-center gap-3';
    } else if(recent.length === 1) {
        dot.className = 'w-3 h-3 rounded-full bg-yellow-500';
        txt.textContent = 'Achtung — Nur 1 Backup in den letzten 3 Stunden (erwartet: 3)';
        txt.className = 'text-sm font-medium text-yellow-700';
        container.className = 'mb-6 p-4 rounded-xl border border-yellow-200 bg-yellow-50 flex items-center gap-3';
    } else {
        dot.className = 'w-3 h-3 rounded-full bg-red-500';
        txt.textContent = 'Warnung — Kein erfolgreiches Backup in den letzten 3 Stunden! Bitte pruefen.';
        txt.className = 'text-sm font-medium text-red-700';
        container.className = 'mb-6 p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3';
    }
}

export function bkRenderTable(logs) {
    var tbody = document.getElementById('bkTableBody');
    var noData = document.getElementById('bkNoData');
    if(!logs.length) {
        tbody.innerHTML = '';
        noData.classList.remove('hidden');
        return;
    }
    noData.classList.add('hidden');
    
    tbody.innerHTML = logs.map(function(l) {
        var d = new Date(l.started_at);
        var timeStr = d.toLocaleDateString('de-DE') + ' ' + d.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'});
        
        var typeBadge = l.backup_type === 'scheduled'
            ? '<span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Auto</span>'
            : l.backup_type === 'manual'
            ? '<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Manuell</span>'
            : '<span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">' + (l.backup_type||'?') + '</span>';
        
        var statusBadge = l.status === 'completed'
            ? '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">OK</span>'
            : l.status === 'running'
            ? '<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Laeuft</span>'
            : '<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">Fehler</span>';

        var tables = l.tables_backed_up ? l.tables_backed_up.length : 0;
        var sizeStr = l.total_size_bytes ? Math.round(l.total_size_bytes / 1024) + ' KB' : '-';
        
        var duration = '-';
        if(l.started_at && l.completed_at) {
            var ms = new Date(l.completed_at) - new Date(l.started_at);
            duration = (ms / 1000).toFixed(1) + 's';
        }

        var errHtml = '';
        if(l.error_message) {
            var shortErr = l.error_message.length > 60 ? l.error_message.substring(0, 60) + '...' : l.error_message;
            errHtml = '<span class="text-red-500 cursor-help" title="' + l.error_message.replace(/"/g, '&quot;') + '">' + shortErr + '</span>';
        } else {
            errHtml = '<span class="text-green-500">—</span>';
        }

        return '<tr class="hover:bg-gray-50">'
            + '<td class="px-4 py-3 text-xs whitespace-nowrap">' + timeStr + '</td>'
            + '<td class="px-4 py-3">' + typeBadge + '</td>'
            + '<td class="px-4 py-3">' + statusBadge + '</td>'
            + '<td class="px-4 py-3 text-xs">' + tables + '/15</td>'
            + '<td class="px-4 py-3 text-xs">' + (l.total_rows || 0) + '</td>'
            + '<td class="px-4 py-3 text-xs">' + sizeStr + '</td>'
            + '<td class="px-4 py-3 text-xs">' + duration + '</td>'
            + '<td class="px-4 py-3 text-xs max-w-[200px] truncate">' + errHtml + '</td>'
            + '</tr>';
    }).join('');
}

export async function bkTriggerBackup() {
    if(!confirm('Manuelles Backup jetzt starten?')) return;
    try {
        var session = (await _sb().auth.getSession()).data.session;
        if(!session) { _showToast('Nicht eingeloggt', 'error'); return; }
        var resp = await fetch(SUPABASE_URL + '/functions/v1/db-backup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.access_token
            },
            body: JSON.stringify({ type: 'manual' })
        });
        var result = await resp.json();
        if(result.success) {
            _showToast('Backup erfolgreich! ' + result.total_rows + ' Rows, ' + result.total_size_kb + ' KB', 'success');
            setTimeout(function() { loadBkView(); }, 1000);
        } else {
            _showToast('Backup-Fehler: ' + (result.error || 'Unbekannt'), 'error');
        }
    } catch(err) {
        _showToast('Backup fehlgeschlagen: ' + err.message, 'error');
    }
}


// Modul-Status aus Supabase laden und auf Sidebar anwenden
export async function loadModulStatus() {
    try {
        var resp = await _sb().from('modul_status').select('modul_key, status, hq_status, ebene, demo_status, config, hq_config').order('reihenfolge');
        if(resp.error) throw resp.error;
        sbModulStatus = {};
        sbHqModulStatus = {};
        sbModulConfig = {};
        sbHqModulConfig = {};
        sbModulEbene = {};
        var useDemo = (typeof isDemoMode !== 'undefined' && isDemoMode) || window.isDemoMode || (_sbProfile() && (_sbProfile().status === 'demo' || _sbProfile().status === 'demo_active'));
        (resp.data||[]).forEach(function(m) { 
            sbModulStatus[m.modul_key] = useDemo ? (m.demo_status || 'demo') : m.status;
            sbHqModulStatus[m.modul_key] = m.hq_status || 'aktiv';
            sbModulConfig[m.modul_key] = m.config || {};
            sbHqModulConfig[m.modul_key] = m.hq_config || {};
            sbModulEbene[m.modul_key] = m.ebene || 'partner';
        });
        applyModulStatus();
        // Re-sync to window (reassignment breaks reference)
        window.sbModulStatus = sbModulStatus;
        window.sbHqModulStatus = sbHqModulStatus;
        window.sbModulConfig = sbModulConfig;
        window.sbHqModulConfig = sbHqModulConfig;
        window.sbModulEbene = sbModulEbene;
    } catch(err) { console.error('ModulStatus:', err); }
}

export function applyModulStatus() {
    // Alle Sidebar-Buttons mit data-module durchgehen
    document.querySelectorAll('[data-module]').forEach(function(btn) {
        var key = btn.getAttribute('data-module');
        var status = sbModulStatus[key] || 'aktiv';

        // Remove old badges first
        var oldBadge = btn.querySelector('.modul-wip-badge,.modul-demo-badge');
        if(oldBadge) oldBadge.remove();

        if(status === 'deaktiviert') {
            // On QuickActions grid: gray out instead of hiding
            if(btn.closest('#quickActionsGrid')) {
                btn.classList.remove('hidden');
                btn.style.display = '';
                btn.style.opacity = '0.35';
                btn.style.pointerEvents = 'none';
            } else {
                btn.style.display = 'none';
            }
        } else if(status === 'in_bearbeitung') {
            btn.style.display = '';
            btn.style.opacity = '0.4';
            btn.style.pointerEvents = 'none';
            btn.style.cursor = 'not-allowed';
            if(!btn.querySelector('.modul-wip-badge')) {
                var badge = document.createElement('span');
                badge.className = 'modul-wip-badge ml-auto text-[9px] bg-yellow-500 text-white rounded px-1 py-0.5 font-bold';
                badge.textContent = 'BALD';
                btn.appendChild(badge);
            }
        } else if(status === 'demo') {
            btn.style.display = '';
            btn.style.opacity = '';
            btn.style.pointerEvents = '';
            btn.style.cursor = '';
            if(!btn.querySelector('.modul-demo-badge')) {
                var badge = document.createElement('span');
                badge.className = 'modul-demo-badge ml-auto text-[9px] bg-orange-500 text-white rounded px-1 py-0.5 font-bold';
                badge.textContent = 'DEMO';
                btn.appendChild(badge);
            }
        } else {
            // aktiv - reset everything
            btn.style.display = '';
            btn.style.opacity = '';
            btn.style.pointerEvents = '';
            btn.style.cursor = '';
        }
    });

    // Wissen-Tabs in Fachbereichen ausblenden wenn Modul deaktiviert
    var wissenStatus = sbModulStatus['wissen'] || 'aktiv';
    var wissenDisabled = wissenStatus === 'deaktiviert';
    var wissenTabSelectors = [
        'button[data-tab="vkWissen"]', '#vkTabVkWissen',
        'button[data-tab="mktWissen"]', '#marketingTabMktWissen',
        'button[data-tab="ekWissen"]', '#ekTabEkWissen',
        'button[data-tab="ctrlWissen"]', '#ctrlTabCtrlWissen',
        'button[data-tab="wissen"]', '#allgTabWissen'
    ];
    wissenTabSelectors.forEach(function(sel) {
        var el = document.querySelector(sel);
        if(el) el.style.display = wissenDisabled ? 'none' : '';
    });
}


// Strangler Fig
// Sync to window for cross-module access
window.sbFeatureFlags = sbFeatureFlags;
window.sbModulStatus = sbModulStatus;
window.sbHqModulStatus = sbHqModulStatus;
window.sbModulConfig = sbModulConfig;
window.sbHqModulConfig = sbHqModulConfig;
window.sbModulEbene = sbModulEbene;

const _exports = {loadFeatureFlags,isFeatureEnabled,getFeatureMeta,applyFeatureFlags,loadFFView,ffUpdateStats,ffHasTargeting,ffGetStatus,ffFilter,ffRenderList,ffToggle,ffDelete,ffShowCreate,ffShowEdit,ffPopulateSelectors,ffCloseModal,ffSave,logFeatureFlagCheck,ffFlushLog,loadBkView,bkRenderStats,bkRenderHealth,bkRenderTable,bkTriggerBackup,loadModulStatus,applyModulStatus};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[feature-flags-full.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');
