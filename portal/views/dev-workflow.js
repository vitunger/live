/**
 * views/dev-workflow.js - Status Advancement, Beta Test, Rollout, Beta Testers
 * @module views/dev-workflow
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }


// Shared state access
function _devSubs() { return window._devState ? window._devState.submissions : []; }
function _devStatusLabels() { return window._devState ? window._devState.statusLabels : {}; }
function _devStatusColors() { return window._devState ? window._devState.statusColors : {}; }
function _devKatIcons() { return window._devState ? window._devState.katIcons : {}; }

// === Private helpers (NOT exported) ===

// Generische Loading-Anzeige für KI-Aktionen im Detail-Modal
function _showDevActionLoading(title, subtitle) {
    var wfBox = document.querySelector('.bg-blue-50.border-blue-200');
    if(wfBox) {
        wfBox.innerHTML = '<div class="flex items-center gap-3">' +
            '<div class="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center animate-pulse"><span class="text-white text-xs">\uD83E\uDD16</span></div>' +
            '<div class="flex-1"><h4 class="font-semibold text-purple-800 text-xs">' + title + '</h4>' +
            '<p class="text-[10px] text-purple-500" id="_devLoadText">' + subtitle + '</p></div></div>' +
            '<div class="w-full bg-purple-100 rounded-full h-1.5 mt-2 overflow-hidden">' +
            '<div id="_devLoadBar" class="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000" style="width:15%"></div></div>';
    }
}

function _animateDevLoadBar(steps) {
    var i = 0;
    return setInterval(function() {
        if(i >= steps.length) return;
        var bar = document.getElementById('_devLoadBar');
        var txt = document.getElementById('_devLoadText');
        if(bar) bar.style.width = steps[i].pct;
        if(txt) txt.textContent = steps[i].text;
        i++;
    }, 3000);
}

// === Public exported functions ===

export async function createDevKonzept(subId) {
    _showDevActionLoading('\uD83D\uDCCB Konzept wird erstellt...', 'Feature wird analysiert...');
    var timer = _animateDevLoadBar([
        {pct:'30%',text:'Anforderungen werden erfasst...'},
        {pct:'50%',text:'L\u00F6sungsvorschl\u00E4ge werden erarbeitet...'},
        {pct:'70%',text:'Akzeptanzkriterien definieren...'},
        {pct:'85%',text:'Konzept wird finalisiert...'}
    ]);
    try {
        var resp = await _sb().functions.invoke('dev-ki-analyse', {
            body: { submission_id: subId, mode: 'konzept' }
        });
        clearInterval(timer);
        if(resp.error) throw resp.error;
        if(resp.data && resp.data.error) throw new Error(resp.data.error);
        _showToast('\uD83D\uDCCB Konzept erstellt!', 'success');
        await loadDevSubmissions(true);
        openDevDetail(subId);
    } catch(err) {
        clearInterval(timer);
        _showToast('Fehler: ' + (err.message||err), 'error');
        openDevDetail(subId);
    }
}

export async function updateDevStatus(subId, newStatus) {
    var btn = window.event ? window.event.target.closest('button') : null;
    if(btn) { btn.disabled = true; var _origText = btn.textContent; btn.innerHTML = '\u23F3 ' + _origText; }
    try {
        var updates = { status: newStatus };
        if(newStatus === 'beta_test') updates.beta_start_at = new Date().toISOString();
        if(newStatus === 'ausgerollt') updates.ausgerollt_at = new Date().toISOString();
        var resp = await _sb().from('dev_submissions').update(updates).eq('id', subId);
        if(resp.error) throw resp.error;
        _showToast('\u2705 Status aktualisiert', 'success');
        closeDevDetail();
        await loadDevSubmissions(true);
        refreshEntwicklungViews();
    } catch(err) {
        _showToast('Fehler: ' + (err.message||err), 'error');
        if(btn) { btn.disabled = false; btn.textContent = _origText || ''; }
    }
}

export async function devAdvanceStatus(subId, newStatus) {
    var labels = {in_entwicklung:'In Entwicklung nehmen',beta_test:'Beta-Test starten',release_geplant:'Release freigeben',in_planung:'In Planung',geparkt:'Parken',ausgerollt:'Ausrollen'};
    if(!confirm((labels[newStatus]||newStatus) + '?')) return;
    try {
        var updates = { status: newStatus };
        if(newStatus === 'beta_test') updates.beta_start_at = new Date().toISOString();
        if(newStatus === 'ausgerollt') updates.ausgerollt_at = new Date().toISOString();
        var resp = await _sb().from('dev_submissions').update(updates).eq('id', subId);
        if(resp.error) throw resp.error;

        // If moving to beta: auto-link feature flag
        if(newStatus === 'beta_test') {
            var subResp = await _sb().from('dev_submissions').select('feature_flag_key, titel').eq('id', subId).single();
            var sub = subResp.data;
            if(sub && sub.feature_flag_key) {
                // Enable flag for beta testers
                await _sb().from('feature_flags').upsert({
                    flag_key: sub.feature_flag_key,
                    enabled: true,
                    scope: 'beta_tester',
                    rollout_percent: 0,
                    beschreibung: 'Beta-Test: ' + (sub.titel || subId)
                }, { onConflict: 'flag_key' });
            }
        }

        _showToast('\u2705 Status: ' + (labels[newStatus]||newStatus), 'success');
        // Close detail modal and refresh board
        closeDevDetail();
        await loadDevSubmissions(true);
        // Re-render current view
        var activeTab = document.querySelector('.entw-tab-btn.border-vit-orange, .entw-tab-btn[style*="border-color"]');
        if(document.getElementById('entwTabSteuerung') && document.getElementById('entwTabSteuerung').style.display !== 'none') {
            renderEntwSteuerung();
        } else if(document.getElementById('entwTabIdeen') && document.getElementById('entwTabIdeen').style.display !== 'none') {
            renderEntwIdeen();
        }
    } catch(e) {
        _showToast('Fehler: ' + e.message, 'error');
    }
}

export async function submitDevBetaFeedback(subId) {
    var rating = parseInt((document.getElementById('devBetaRating')||{}).value || '0');
    var feedback = (document.getElementById('devBetaText')||{}).value || '';
    var bugs = (document.getElementById('devBetaBugs')||{}).value || '';
    if(!rating && !feedback.trim() && !bugs.trim()) { _showToast('Bitte gib eine Bewertung oder Feedback ein.', 'error'); return; }
    try {
        var resp = await _sb().from('dev_beta_feedback').insert({
            submission_id: subId, user_id: _sbUser().id,
            bewertung: rating || null, feedback: feedback.trim() || null, bugs: bugs.trim() || null
        });
        if(resp.error) throw resp.error;
        // Also add as comment for visibility
        await _sb().from('dev_kommentare').insert({
            submission_id: subId, user_id: _sbUser().id, typ: 'kommentar',
            inhalt: '\u{1F9EA} Beta-Feedback: ' + (rating ? rating + '/5\u2B50 ' : '') + (feedback || '') + (bugs ? '\n\u{1F41B} Bugs: ' + bugs : '')
        });
        _showToast('\u{1F4E8} Beta-Feedback gespeichert!', 'success');
        openDevDetail(subId);
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export async function devShowBetaFeedbackSummary(subId) {
    try {
        var resp = await _sb().from('dev_beta_feedback').select('*, users:user_id(name)').eq('submission_id', subId).order('created_at', {ascending: false});
        var feedbacks = resp.data || [];
        if(feedbacks.length === 0) { _showToast('Noch kein Beta-Feedback vorhanden.', 'info'); return; }
        var avgRating = feedbacks.filter(function(f){return f.bewertung;}).reduce(function(a,f){return a+f.bewertung;},0) / (feedbacks.filter(function(f){return f.bewertung;}).length || 1);
        var bugsCount = feedbacks.filter(function(f){return f.bugs;}).length;
        var html = '<div class="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onclick="this.remove()">';
        html += '<div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onclick="event.stopPropagation()">';
        html += '<h3 class="text-lg font-bold mb-4">\u{1F4CA} Beta-Feedback (' + feedbacks.length + ')</h3>';
        html += '<div class="grid grid-cols-3 gap-3 mb-4">';
        html += '<div class="text-center p-3 bg-yellow-50 rounded-lg"><p class="text-2xl font-bold text-yellow-600">' + avgRating.toFixed(1) + '</p><p class="text-xs text-gray-500">\u00D8 Bewertung</p></div>';
        html += '<div class="text-center p-3 bg-blue-50 rounded-lg"><p class="text-2xl font-bold text-blue-600">' + feedbacks.length + '</p><p class="text-xs text-gray-500">Feedbacks</p></div>';
        html += '<div class="text-center p-3 bg-red-50 rounded-lg"><p class="text-2xl font-bold text-red-600">' + bugsCount + '</p><p class="text-xs text-gray-500">Bug-Meldungen</p></div>';
        html += '</div><div class="space-y-3">';
        feedbacks.forEach(function(f) {
            var name = f.users ? f.users.name : 'Unbekannt';
            var dt = new Date(f.created_at).toLocaleDateString('de-DE');
            html += '<div class="border border-gray-100 rounded-lg p-3">';
            html += '<div class="flex justify-between items-center mb-1"><span class="text-sm font-semibold">' + _escH(name) + '</span><span class="text-xs text-gray-400">' + dt + '</span></div>';
            if(f.bewertung) html += '<p class="text-sm">' + '\u2B50'.repeat(f.bewertung) + '\u2606'.repeat(5-f.bewertung) + '</p>';
            if(f.feedback) html += '<p class="text-sm text-gray-700 mt-1">' + _escH(f.feedback) + '</p>';
            if(f.bugs) html += '<p class="text-sm text-red-600 mt-1">\u{1F41B} ' + _escH(f.bugs) + '</p>';
            html += '</div>';
        });
        html += '</div><button onclick="this.closest(\'.fixed\').remove()" class="mt-4 w-full px-4 py-2 bg-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-300">Schlie\u00DFen</button>';
        html += '</div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export async function devRollout(subId) {
    if(!confirm('Feature jetzt f\u00FCr alle User ausrollen?\n\nDie KI generiert automatisch eine Release-Note und pr\u00FCft, ob ein Wissensartikel n\u00F6tig ist.')) return;
    _showToast('\u{1F680} Rollout l\u00E4uft + KI generiert Dokumentation...', 'info');
    try {
        // 1. Update status
        await _sb().from('dev_submissions').update({
            status: 'ausgerollt', ausgerollt_at: new Date().toISOString()
        }).eq('id', subId);

        // 2. Enable feature flag for all (100%)
        var subResp = await _sb().from('dev_submissions').select('feature_flag_key').eq('id', subId).single();
        if(subResp.data && subResp.data.feature_flag_key) {
            await _sb().from('feature_flags').update({
                scope: 'alle', rollout_percent: 100, enabled: true
            }).eq('flag_key', subResp.data.feature_flag_key);
        }

        // 3. Generate release docs via EF
        var token = (await _sb().auth.getSession()).data.session.access_token;
        var resp = await fetch(window.SUPABASE_URL + '/functions/v1/dev-ki-analyse', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: subId, mode: 'release_docs' })
        });
        var data = await resp.json();
        if(data.error) console.warn('Release docs generation error:', data.error);
        else _showToast('\u2705 Ausgerollt! Release-Note generiert.', 'success');

        openDevDetail(subId);
    } catch(e) {
        _showToast('Status aktualisiert, Doku-Fehler: ' + e.message, 'error');
        openDevDetail(subId);
    }
}

export async function renderDevBetaTester() {
    var c = document.getElementById('devBetaTesterContent');
    if(!c) return;
    try {
        var resp = await _sb().from('dev_beta_tester').select('*, users:user_id(name, email)').order('created_at');
        var testers = resp.data || [];
        var h = '<div class="flex justify-between items-center mb-4">';
        h += '<h3 class="text-sm font-bold text-gray-700">\u{1F9EA} Beta-Tester (' + testers.filter(function(t){return t.aktiv;}).length + ' aktiv)</h3>';
        h += '<button onclick="devAddBetaTester()" class="px-3 py-1.5 bg-pink-500 text-white rounded-lg text-xs font-semibold hover:bg-pink-600">+ Tester hinzuf\u00FCgen</button>';
        h += '</div>';
        if(testers.length === 0) {
            h += '<p class="text-sm text-gray-400 text-center py-6">Noch keine Beta-Tester definiert.</p>';
        } else {
            h += '<div class="space-y-2">';
            testers.forEach(function(t) {
                var name = t.users ? t.users.name : 'Unbekannt';
                var email = t.users ? t.users.email : '';
                h += '<div class="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100">';
                h += '<div><p class="text-sm font-semibold">' + _escH(name) + '</p><p class="text-xs text-gray-400">' + _escH(email) + '</p></div>';
                h += '<div class="flex items-center gap-2">';
                h += '<span class="text-xs rounded px-2 py-0.5 ' + (t.aktiv ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500') + '">' + (t.aktiv ? 'Aktiv' : 'Inaktiv') + '</span>';
                h += '<button onclick="devToggleBetaTester(\'' + t.id + '\',' + (!t.aktiv) + ')" class="text-xs px-2 py-1 rounded ' + (t.aktiv ? 'bg-gray-100 hover:bg-gray-200' : 'bg-green-100 hover:bg-green-200') + '">' + (t.aktiv ? 'Deaktivieren' : 'Aktivieren') + '</button>';
                h += '</div></div>';
            });
            h += '</div>';
        }
        c.innerHTML = h;
    } catch(e) { c.innerHTML = '<p class="text-red-400 text-sm">Fehler: ' + _escH(e.message) + '</p>'; }
}

export async function devAddBetaTester() {
    var email = prompt('E-Mail des neuen Beta-Testers:');
    if(!email) return;
    try {
        var userResp = await _sb().from('users').select('id, name').eq('email', email.trim()).single();
        if(!userResp.data) { _showToast('Kein User mit dieser E-Mail gefunden.', 'error'); return; }
        var resp = await _sb().from('dev_beta_tester').upsert({
            user_id: userResp.data.id, aktiv: true, hinzugefuegt_von: _sbUser().id
        }, { onConflict: 'user_id' });
        if(resp.error) throw resp.error;
        _showToast('\u2705 ' + userResp.data.name + ' als Beta-Tester hinzugef\u00FCgt!', 'success');
        renderDevBetaTester();
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export async function devToggleBetaTester(id, aktiv) {
    try {
        await _sb().from('dev_beta_tester').update({ aktiv: aktiv }).eq('id', id);
        _showToast(aktiv ? 'Beta-Tester aktiviert' : 'Beta-Tester deaktiviert', 'success');
        renderDevBetaTester();
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export async function devTogglePartnerSichtbar(subId, visible) {
    try {
        var resp = await _sb().from('dev_submissions').update({ partner_sichtbar: visible }).eq('id', subId);
        if(resp.error) throw resp.error;
        _showToast(visible ? '\uD83D\uDC41 F\u00FCr Partner sichtbar' : '\uD83D\uDD12 Nur f\u00FCr HQ sichtbar', 'success');
        // Update local data
        var sub = _devSubs().find(function(s){ return s.id === subId; });
        if(sub) sub.partner_sichtbar = visible;
        // Refresh detail to update toggle styling
        openDevDetail(subId);
    } catch(err) {
        _showToast('Fehler: ' + err.message, 'error');
    }
}

const _exports = { createDevKonzept, updateDevStatus, devAdvanceStatus, submitDevBetaFeedback, devShowBetaFeedbackSummary, devRollout, renderDevBetaTester, devAddBetaTester, devToggleBetaTester, devTogglePartnerSichtbar };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
