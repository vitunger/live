/**
 * views/dev-utils.js - CSV export, HQ users, MA assignment, deadline, reanalyse, attachment, konzept chat, notizen
 * @module views/dev-utils
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }
function _sbUrl()        { return window.SUPABASE_URL || window._sb?.()?.supabaseUrl || 'https://lwwagbkxeofahhwebkab.supabase.co'; }

// Shared state access
function _devSubs() { return window._devState ? window._devState.submissions : []; }
function _devStatusLabels() { return window._devState ? window._devState.statusLabels : {}; }
function _devStatusColors() { return window._devState ? window._devState.statusColors : {}; }
function _devKatIcons() { return window._devState ? window._devState.katIcons : {}; }

// CSV Export
export function exportDevCSV() {
    if(!_devSubs() || _devSubs().length === 0) { _showToast('Keine Daten zum Exportieren', 'error'); return; }
    var header = ['Titel','Status','KI-Typ','KI-Bereich','Kategorie','Aufwand','Votes','Kommentare','Erstellt','Beschreibung'];
    var rows = _devSubs().map(function(s) {
        return [
            '"'+(s.titel||'').replace(/"/g,'""')+'"',
            s.status || '',
            s.ki_typ || '',
            s.ki_bereich || '',
            s.kategorie || '',
            s.geschaetzter_aufwand || '',
            (s.dev_votes||[]).length,
            (s.dev_kommentare||[]).length,
            s.created_at ? new Date(s.created_at).toLocaleDateString('de-DE') : '',
            '"'+(s.beschreibung||'').replace(/"/g,'""').substring(0,200)+'"'
        ].join(';');
    });
    var csv = '\uFEFF' + header.join(';') + '\n' + rows.join('\n');
    var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'dev-pipeline-export-'+new Date().toISOString().split('T')[0]+'.csv';
    a.click();
    URL.revokeObjectURL(url);
    _showToast('📥 CSV exportiert ('+_devSubs().length+' Einträge)', 'success');
}

// === KI-Konzept-Chat: iterativ Konzept verfeinern ===
export async function sendDevKonzeptChat(subId) {
    var input = document.getElementById('devKonzeptChatInput');
    var btn = document.getElementById('devKonzeptChatBtn');
    var history = document.getElementById('devKonzeptChatHistory');
    if(!input || !input.value.trim()) return;
    var feedback = input.value.trim();
    input.value = '';
    if(btn) { btn.disabled = true; btn.textContent = '⏳'; }

    // Show user message in chat
    if(history) {
        history.innerHTML += '<div class="bg-white rounded p-2 text-xs border border-gray-200"><span class="font-semibold text-gray-700">Du:</span> '+_escH(feedback)+'</div>';
        history.scrollTop = history.scrollHeight;
    }

    try {
        // Save feedback as comment
        await _sb().from('dev_kommentare').insert({
            submission_id: subId, user_id: _sbUser().id, typ: 'kommentar',
            inhalt: '💬 Konzept-Feedback: ' + feedback
        });

        // Call EF with konzept_chat mode
        var token = (await _sb().auth.getSession()).data.session.access_token;
        var resp = await fetch(_sbUrl() + '/functions/v1/dev-ki-analyse', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: subId, mode: 'konzept_chat', feedback: feedback })
        });
        var data = await resp.json();
        if(data.error) throw new Error(data.error);

        // Show KI response
        if(history) {
            history.innerHTML += '<div class="bg-purple-50 rounded p-2 text-xs border border-purple-100"><span class="font-semibold text-purple-700">KI:</span> '+(data.antwort || 'Konzept wurde aktualisiert.')+'</div>';
            history.scrollTop = history.scrollHeight;
        }
        _showToast('✅ Konzept aktualisiert (v' + (data.version || '?') + ')', 'success');
    } catch(e) {
        if(history) {
            history.innerHTML += '<div class="bg-red-50 rounded p-2 text-xs border border-red-100"><span class="text-red-600">❌ Fehler: '+_escH(e.message)+'</span></div>';
        }
        _showToast('Fehler: ' + e.message, 'error');
    } finally {
        if(btn) { btn.disabled = false; btn.textContent = '💬'; }
    }
}

async function _loadDevHQUsers(sub) {
    try {
        var resp = await _sb().from('users').select('id, name').eq('is_hq', true).order('name');
        var users = resp.data || [];
        ['devKonzeptMASelect','devEntwicklerMASelect'].forEach(function(selId) {
            var sel = document.getElementById(selId);
            if(!sel) return;
            var field = selId === 'devKonzeptMASelect' ? 'konzept_ma' : 'entwickler_ma';
            var currentVal = sub[field] || '';
            users.forEach(function(u) {
                var opt = document.createElement('option');
                opt.value = u.id;
                opt.textContent = u.name;
                if(u.id === currentVal) opt.selected = true;
                sel.appendChild(opt);
            });
        });
        // For non-owner view, show names
        if(sub.konzept_ma) {
            var km = users.find(function(u){return u.id===sub.konzept_ma;});
            var kmEl = document.getElementById('devKonzeptMAName');
            if(kmEl && km) kmEl.textContent = km.name;
        }
        if(sub.entwickler_ma) {
            var em = users.find(function(u){return u.id===sub.entwickler_ma;});
            var emEl = document.getElementById('devEntwicklerMAName');
            if(emEl && em) emEl.textContent = em.name;
        }
    } catch(e) { console.warn('HQ users load error', e); }
}

// === Update MA assignment (Owner only) ===
export async function updateDevMA(subId, field) {
    var selId = field === 'konzept_ma' ? 'devKonzeptMASelect' : 'devEntwicklerMASelect';
    var sel = document.getElementById(selId);
    if(!sel) return;
    var val = sel.value || null;
    try {
        var upd = {}; upd[field] = val;
        var resp = await _sb().from('dev_submissions').update(upd).eq('id', subId);
        if(resp.error) throw resp.error;
        _showToast(field === 'konzept_ma' ? 'Konzept-MA zugewiesen' : 'Entwickler zugewiesen', 'success');
    } catch(e) {
        _showToast('Fehler: ' + e.message, 'error');
    }
}

// === Update deadline (Owner only) ===
export async function updateDevDeadline(subId) {
    var el = document.getElementById('devDeadlineInput');
    if(!el) return;
    var val = el.value || null;
    try {
        var resp = await _sb().from('dev_submissions').update({ deadline: val }).eq('id', subId);
        if(resp.error) throw resp.error;
        _showToast('Deadline ' + (val ? 'gesetzt: ' + new Date(val).toLocaleDateString('de-DE') : 'entfernt'), 'success');
    } catch(e) {
        _showToast('Fehler: ' + e.message, 'error');
    }
}

// === Re-analyse submission (re-score with current vision) ===
export async function reanalyseDevSubmission(subId) {
    // Find the button and replace with status indicator
    var btn = event ? event.target.closest('button') : null;
    var container = btn ? btn.parentElement : null;

    if(container) {
        container.innerHTML = '<div id="devKiStatus" class="w-full">' +
            '<div class="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">' +
            '<div class="flex items-center gap-3 mb-3">' +
            '<div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center animate-pulse"><span class="text-white text-sm">🤖</span></div>' +
            '<div><h4 class="font-bold text-purple-800 text-sm">KI-Analyse läuft...</h4>' +
            '<p class="text-xs text-purple-500" id="devKiStatusText">Beschreibung wird gelesen...</p></div>' +
            '</div>' +
            '<div class="w-full bg-purple-100 rounded-full h-2 overflow-hidden">' +
            '<div id="devKiProgress" class="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-1000" style="width:10%"></div>' +
            '</div>' +
            '</div></div>';
    }

    // Animate progress steps
    var steps = [
        { pct: '25%', text: 'Portal-Module werden geprüft...' },
        { pct: '45%', text: 'Vision-Fit wird berechnet...' },
        { pct: '65%', text: 'Machbarkeit & Aufwand schätzen...' },
        { pct: '80%', text: 'Empfehlung wird erstellt...' },
    ];
    var stepIdx = 0;
    var stepTimer = setInterval(function() {
        if(stepIdx >= steps.length) { clearInterval(stepTimer); return; }
        var bar = document.getElementById('devKiProgress');
        var txt = document.getElementById('devKiStatusText');
        if(bar) bar.style.width = steps[stepIdx].pct;
        if(txt) txt.textContent = steps[stepIdx].text;
        stepIdx++;
    }, 3000);

    try {
        var token = (await _sb().auth.getSession()).data.session.access_token;
        var resp = await fetch(_sbUrl() + '/functions/v1/dev-ki-analyse', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: subId, mode: 'reanalyse' })
        });
        var data = await resp.json();
        clearInterval(stepTimer);
        if(data.error) throw new Error(data.error);

        // Show success
        var bar = document.getElementById('devKiProgress');
        var txt = document.getElementById('devKiStatusText');
        if(bar) bar.style.width = '100%';
        if(txt) txt.textContent = '✅ Analyse abgeschlossen!';

        var statusDiv = document.getElementById('devKiStatus');
        if(statusDiv) {
            var vf = data.vision_fit || '?';
            var typ = data.ki_typ === 'bug' ? '🐛 Bug' : data.ki_typ === 'feature' ? '✨ Feature' : '💡 Idee';
            statusDiv.innerHTML = '<div class="bg-green-50 border border-green-200 rounded-xl p-4">' +
                '<div class="flex items-center gap-3 mb-2">' +
                '<span class="text-2xl">✅</span>' +
                '<div><h4 class="font-bold text-green-800 text-sm">KI-Analyse abgeschlossen!</h4>' +
                '<p class="text-xs text-green-600">' + typ + ' · Vision-Fit: ' + vf + '/100</p></div>' +
                '</div>' +
                '<button onclick="openDevDetail(\'' + subId + '\')" class="mt-2 w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">📋 Ergebnis anzeigen</button>' +
                '</div>';
        }
        _showToast('✅ KI-Analyse fertig – Vision-Fit: ' + (data.vision_fit || '?'), 'success');
    } catch(e) {
        clearInterval(stepTimer);
        var statusDiv = document.getElementById('devKiStatus');
        if(statusDiv) {
            statusDiv.innerHTML = '<div class="bg-red-50 border border-red-200 rounded-xl p-4">' +
                '<div class="flex items-center gap-3">' +
                '<span class="text-2xl">❌</span>' +
                '<div><h4 class="font-bold text-red-800 text-sm">Analyse fehlgeschlagen</h4>' +
                '<p class="text-xs text-red-600">' + e.message + '</p></div>' +
                '</div>' +
                '<button onclick="reanalyseDevSubmission(\'' + subId + '\')" class="mt-2 w-full py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200">🔄 Erneut versuchen</button>' +
                '</div>';
        }
        _showToast('Fehler: ' + e.message, 'error');
    }
}

// === Upload attachment to existing submission ===
export async function uploadDevAttachment(subId) {
    var input = document.getElementById('devAttachInput');
    if(!input || !input.files || input.files.length === 0) return;
    _showToast('📎 Lade Anhänge hoch...', 'info');
    try {
        // Get current attachments
        var subResp = await _sb().from('dev_submissions').select('attachments').eq('id', subId).single();
        var currentAttachments = (subResp.data && subResp.data.attachments) || [];
        var newAttachments = [];
        for(var i = 0; i < input.files.length; i++) {
            var file = input.files[i];
            if(file.size > 10 * 1024 * 1024) { _showToast('Datei zu groß (max 10MB): ' + file.name, 'error'); continue; }
            var ts = Date.now();
            var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            var path = subId + '/' + ts + '_' + safeName;
            var upResp = await _sb().storage.from('dev-attachments').upload(path, file, { contentType: file.type, upsert: false });
            if(upResp.error) { console.error('Upload error:', upResp.error); continue; }
            var pubUrl = _sb().storage.from('dev-attachments').getPublicUrl(path).data.publicUrl;
            newAttachments.push({ name: file.name, type: file.type, size: file.size, url: pubUrl, uploaded_at: new Date().toISOString() });
        }
        if(newAttachments.length > 0) {
            var allAttachments = currentAttachments.concat(newAttachments);
            var updResp = await _sb().from('dev_submissions').update({ attachments: allAttachments }).eq('id', subId);
            if(updResp.error) throw updResp.error;
            _showToast('📎 ' + newAttachments.length + ' Anhang/Anhänge hochgeladen', 'success');
            openDevDetail(subId);
        }
        input.value = '';
    } catch(e) {
        _showToast('Fehler beim Upload: ' + e.message, 'error');
    }
}

const _exports = { exportDevCSV, sendDevKonzeptChat, updateDevMA, updateDevDeadline, reanalyseDevSubmission, uploadDevAttachment };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
