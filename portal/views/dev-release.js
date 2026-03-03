/**
 * views/dev-release.js - Release docs, feedback surveys
 * @module views/dev-release
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }
function _sbUrl() { return window.sbUrl ? window.sbUrl() : 'https://lwwagbkxeofahhwebkab.supabase.co'; }

// Shared state access
function _devSubs() { return window._devState ? window._devState.submissions : []; }
function _devStatusLabels() { return window._devState ? window._devState.statusLabels : {}; }
function _devStatusColors() { return window._devState ? window._devState.statusColors : {}; }
function _devKatIcons() { return window._devState ? window._devState.katIcons : {}; }

export async function devKIReleaseVorschlag() {
    var btn = document.getElementById('btnKIRelease');
    if(btn) { btn.disabled = true; btn.innerHTML = '<span class="animate-spin">🧠</span><span>KI denkt nach...</span>'; }

    try {
        // Submissions laden falls noch nicht geladen
        if(!_devSubs() || _devSubs().length === 0) {
            await loadDevSubmissions();
        }
        // Sammle alle umgesetzten + in Arbeit befindlichen Submissions
        var relevant = _devSubs().filter(function(s) {
            return ['ausgerollt','release_geplant','im_review','in_entwicklung','geschlossen'].indexOf(s.status) !== -1;
        });
        // Fallback: wenn nichts gefunden, nehme alle nicht-abgelehnten der letzten 30 Tage
        if(relevant.length === 0) {
            var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
            relevant = _devSubs().filter(function(s) {
                return s.status !== 'abgelehnt' && s.status !== 'geparkt' && new Date(s.created_at) > cutoff;
            }).slice(0, 20);
        }
        if(relevant.length === 0) {
            _showToast('Keine Features/Bugs für Release-Note gefunden.', 'error');
            if(btn) { btn.disabled = false; btn.innerHTML = '<span>🧠</span><span>KI-Vorschlag generieren</span>'; }
            return;
        }

        var zusammenfassung = relevant.map(function(s) {
            var typ = s.ki_typ === 'bug' ? 'Bug-Fix' : s.ki_typ === 'feature' ? 'Feature' : 'Verbesserung';
            var titel = s.titel || s.beschreibung || s.kurz_notiz || 'Kein Titel';
            var analyse = s.dev_ki_analysen && s.dev_ki_analysen[0] ? s.dev_ki_analysen[0].zusammenfassung : '';
            return typ + ': ' + titel + (analyse ? ' – ' + analyse : '');
        }).join('\n');

        var resp = await _sb().functions.invoke('dev-ki-analyse', {
            body: {
                mode: 'release_notes',
                context: zusammenfassung,
                count: relevant.length
            }
        });

        if(resp.error) throw resp.error;
        var d = resp.data;
        if(d.error) throw new Error(d.error);

        var vorschlag = d.release_notes || d.antwort || d.text || '';
        if(vorschlag) {
            // Strip intro/greeting lines (Partneransprache entfernen)
            vorschlag = vorschlag.replace(/^(Liebe\s+Partner[^\n]*\n+|Hallo[^\n]*\n+|Sehr\s+geehrte[^\n]*\n+|Dieses\s+Release\s+bringt[^\n]*\n+|Diese[sr]?\s+(Release|Update|Version)\s+[^\n]*\n+)/gi, '').trim();
            // Strip trailing greetings
            vorschlag = vorschlag.replace(/\n+(Viele\s+Gr[uü][sß]e[^\n]*|Euer\s+[^\n]*|Beste\s+Gr[uü][sß]e[^\n]*|Mit\s+freundlichen[^\n]*)$/gi, '').trim();
            var titelField = document.getElementById('relTitel');
            var inhaltField = document.getElementById('relInhalt');
            if(d.titel && titelField && !titelField.value) titelField.value = d.titel;
            if(inhaltField) inhaltField.value = vorschlag;
            _showToast('🧠 KI-Vorschlag eingefügt! Bitte prüfen und anpassen.', 'success');
        } else {
            _showToast('KI hat keinen Vorschlag generiert.', 'error');
        }
    } catch(err) {
        console.error('KI Release error:', err);
        _showToast('KI-Fehler: ' + (err.message || err), 'error');
    }

    if(btn) { btn.disabled = false; btn.innerHTML = '<span>🧠</span><span>KI-Vorschlag generieren</span>'; }
}

export function devShowCreateRelease() {
    var f = document.getElementById('devCreateReleaseForm');
    if(f) f.classList.toggle('hidden');
}

export async function devSaveRelease() {
    var typ = document.getElementById('relTyp').value;
    var titel = (document.getElementById('relTitel').value || '').trim();
    var inhalt = (document.getElementById('relInhalt').value || '').trim();
    var version = (document.getElementById('relVersion').value || '').trim();

    if(!titel) { _showToast('Bitte Titel eingeben.', 'error'); return; }
    if(!inhalt) { _showToast('Bitte Inhalt eingeben.', 'error'); return; }

    try {
        var resp = await _sb().from('dev_release_docs').insert({
            typ: typ,
            titel: titel,
            inhalt: inhalt,
            version: version || null,
            freigegeben: true,
            freigegeben_von: _sbUser().id,
            freigegeben_at: new Date().toISOString(),
            ki_generiert: false
        });
        if(resp.error) throw resp.error;
        _showToast('📣 Release-Note veröffentlicht!', 'success');
        // Formular leeren und schließen
        document.getElementById('relTitel').value = '';
        document.getElementById('relInhalt').value = '';
        document.getElementById('relVersion').value = '';
        var form = document.getElementById('devCreateReleaseForm');
        if(form) form.classList.add('hidden');
        // Sofort neu rendern
        await renderEntwReleases();
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export async function devEditReleaseDoc(docId) {
    try {
        var resp = await _sb().from('dev_release_docs').select('*').eq('id', docId).single();
        if(resp.error) throw resp.error;
        var d = resp.data;
        var overlay = document.createElement('div');
        overlay.id = 'devEditReleaseOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center';
        overlay.onclick = function(e) { if(e.target === overlay) overlay.remove(); };
        overlay.innerHTML = '<div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">'
            + '<div class="flex justify-between items-center mb-4"><h3 class="text-lg font-bold text-gray-800">✏️ Release bearbeiten</h3>'
            + '<button onclick="document.getElementById(\'devEditReleaseOverlay\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>'
            + '<input id="editRelTitel" type="text" value="' + _escH(d.titel).replace(/"/g,'&quot;') + '" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3" placeholder="Titel">'
            + '<input id="editRelVersion" type="text" value="' + _escH(d.version || '').replace(/"/g,'&quot;') + '" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3" placeholder="Version (z.B. v2.4)">'
            + '<textarea id="editRelInhalt" class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-4" rows="8" placeholder="Inhalt">' + _escH(d.inhalt) + '</textarea>'
            + '<div class="flex justify-end gap-2">'
            + '<button onclick="document.getElementById(\'devEditReleaseOverlay\').remove()" class="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Abbrechen</button>'
            + '<button onclick="devSaveEditRelease(\'' + docId + '\')" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">💾 Speichern</button>'
            + '</div></div>';
        document.body.appendChild(overlay);
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export async function devSaveEditRelease(docId) {
    var titel = (document.getElementById('editRelTitel').value || '').trim();
    var inhalt = (document.getElementById('editRelInhalt').value || '').trim();
    var version = (document.getElementById('editRelVersion').value || '').trim();
    if(!titel || !inhalt) { _showToast('Titel und Inhalt erforderlich.', 'error'); return; }
    try {
        var resp = await _sb().from('dev_release_docs').update({ titel: titel, inhalt: inhalt, version: version || null }).eq('id', docId);
        if(resp.error) throw resp.error;
        _showToast('✅ Release aktualisiert!', 'success');
        var overlay = document.getElementById('devEditReleaseOverlay');
        if(overlay) overlay.remove();
        await renderEntwReleases();
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export async function devDeleteReleaseDoc(docId) {
    if(!confirm('Release-Dokument wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    try {
        var resp = await _sb().from('dev_release_docs').delete().eq('id', docId);
        if(resp.error) throw resp.error;
        _showToast('🗑️ Release gelöscht.', 'success');
        await renderEntwReleases();
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

// ============================================================
// PHASE 5b: Feedback-Anfragen
// ============================================================

export async function devShowFeedbackForm(subId) {
    // Load rollen for targeting
    var rollenResp = await _sb().from('rollen').select('*').order('sortierung');
    var rollen = rollenResp.data || [];
    var usersResp = await _sb().from('users').select('id, name, email, is_hq').eq('status','aktiv').order('name');
    var allUsers = usersResp.data || [];

    var html = '<div id="devFeedbackFormOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center" onclick="if(event.target===this)this.remove()">';
    html += '<div class="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">';
    html += '<div class="flex justify-between items-center mb-4"><h3 class="text-lg font-bold text-gray-800">🗳 Feedback einholen</h3>';
    html += '<button onclick="document.getElementById(\'devFeedbackFormOverlay\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>';

    // Frage
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">Frage / Kontext</label>';
    html += '<textarea id="fbFormFrage" placeholder="Was möchtest du wissen? z.B.: Wie bewertet ihr diese Feature-Idee?" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3" rows="2"></textarea>';

    // Multiple Choice Optionen
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">Multiple-Choice Optionen <span class="text-gray-400 font-normal">(min. 2)</span></label>';
    html += '<div id="fbFormOptionen" class="space-y-1.5 mb-1">';
    html += '<input type="text" class="fb-option w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Option 1, z.B.: Sehr wichtig">';
    html += '<input type="text" class="fb-option w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Option 2, z.B.: Nice to have">';
    html += '<input type="text" class="fb-option w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Option 3 (optional)">';
    html += '</div>';
    html += '<button onclick="var d=document.getElementById(\'fbFormOptionen\');var inp=document.createElement(\'input\');inp.type=\'text\';inp.className=\'fb-option w-full px-3 py-2 border border-gray-200 rounded-lg text-sm\';inp.placeholder=\'Weitere Option...\';d.appendChild(inp)" class="text-xs text-amber-600 hover:text-amber-800 mb-3 block">+ Option hinzufügen</button>';

    // Zielgruppe: Rollen
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">Zielgruppe: Rollen</label>';
    html += '<div class="flex flex-wrap gap-1.5 mb-3" id="fbFormRollen">';
    rollen.forEach(function(r) {
        var icon = r.ebene === 'hq' ? '🏢' : '🏪';
        html += '<label class="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1 hover:bg-amber-50 cursor-pointer border border-gray-100 transition">';
        html += '<input type="checkbox" value="'+r.name+'" class="fb-rolle text-amber-500 rounded">';
        html += '<span class="text-xs">'+icon+' '+_escH(r.label)+'</span></label>';
    });
    html += '</div>';

    // Zielgruppe: Einzelne Personen
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">Einzelne Personen <span class="text-gray-400 font-normal">(optional)</span></label>';
    html += '<select id="fbFormUsers" multiple class="w-full border border-gray-200 rounded-lg text-sm mb-3 p-2" size="4">';
    allUsers.forEach(function(u) {
        var tag = u.is_hq ? ' [HQ]' : '';
        html += '<option value="'+u.id+'">'+_escH(u.name)+' ('+_escH(u.email)+')'+tag+'</option>';
    });
    html += '</select>';
    html += '<p class="text-[10px] text-gray-400 mb-3">Strg/Cmd gedrückt halten für Mehrfachauswahl</p>';

    // Deadline
    html += '<label class="block text-xs font-semibold text-gray-600 mb-1">Deadline</label>';
    var defaultDeadline = new Date(); defaultDeadline.setDate(defaultDeadline.getDate() + 7);
    var dlStr = defaultDeadline.toISOString().split('T')[0];
    html += '<input type="date" id="fbFormDeadline" value="'+dlStr+'" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-4">';

    // Submit
    html += '<button onclick="devCreateFeedbackAnfrage(\''+subId+'\')" class="w-full px-4 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition">🗳 Feedback-Anfrage senden</button>';
    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
}

export async function devCreateFeedbackAnfrage(subId) {
    try {
        var frage = document.getElementById('fbFormFrage').value.trim();
        if(!frage) { _showToast('Bitte Frage eingeben.', 'error'); return; }

        // Optionen sammeln
        var optInputs = document.querySelectorAll('.fb-option');
        var optionen = [];
        optInputs.forEach(function(inp) { if(inp.value.trim()) optionen.push(inp.value.trim()); });
        if(optionen.length < 2) { _showToast('Mindestens 2 Optionen angeben.', 'error'); return; }

        // Rollen sammeln
        var rollenChecked = [];
        document.querySelectorAll('.fb-rolle:checked').forEach(function(cb) { rollenChecked.push(cb.value); });

        // User IDs sammeln
        var userSelect = document.getElementById('fbFormUsers');
        var userIds = [];
        for(var i=0; i<userSelect.selectedOptions.length; i++) {
            userIds.push(userSelect.selectedOptions[i].value);
        }

        if(rollenChecked.length === 0 && userIds.length === 0) {
            _showToast('Bitte mindestens eine Rolle oder Person auswählen.', 'error'); return;
        }

        var deadline = document.getElementById('fbFormDeadline').value || null;

        var resp = await _sb().from('dev_feedback_anfragen').insert({
            submission_id: subId,
            erstellt_von: _sbUser().id,
            frage: frage,
            optionen: optionen,
            zielgruppe_rollen: rollenChecked,
            zielgruppe_user_ids: userIds,
            deadline: deadline
        }).select().single();

        if(resp.error) throw resp.error;

        // Benachrichtigungen erstellen
        var targetUsers = new Set(userIds);
        if(rollenChecked.length > 0) {
            var urResp = await _sb().from('user_rollen').select('user_id, rollen!inner(name)').in('rollen.name', rollenChecked);
            (urResp.data || []).forEach(function(ur) { targetUsers.add(ur.user_id); });
        }

        // Get submission title for notification
        var sub = _devSubs().find(function(s){ return s.id === subId; });
        var titel = sub ? sub.titel : 'Idee';

        targetUsers.forEach(function(uid) {
            _sb().from('dev_notifications').insert({
                user_id: uid,
                submission_id: subId,
                typ: 'feedback_anfrage',
                titel: '🗳 Feedback gefragt: ' + titel,
                inhalt: frage,
                link_to: subId
            });
        });

        _showToast('🗳 Feedback-Anfrage an ' + targetUsers.size + ' Personen gesendet!', 'success');
        var overlay = document.getElementById('devFeedbackFormOverlay');
        if(overlay) overlay.remove();

        // Reload detail
        openDevDetail(subId);
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export async function devSubmitFeedbackAntwort(anfrageId) {
    try {
        var choiceEl = document.querySelector('input[name="fbChoice_'+anfrageId+'"]:checked');
        var auswahl = choiceEl ? parseInt(choiceEl.value) : null;
        var kommentar = (document.getElementById('fbKommentar_'+anfrageId) || {}).value || '';

        if(auswahl === null && !kommentar.trim()) {
            _showToast('Bitte Option wählen oder Kommentar schreiben.', 'error'); return;
        }

        var resp = await _sb().from('dev_feedback_antworten').insert({
            anfrage_id: anfrageId,
            user_id: _sbUser().id,
            auswahl: auswahl,
            kommentar: kommentar.trim() || null
        });

        if(resp.error) throw resp.error;
        _showToast('📨 Danke für dein Feedback!', 'success');

        // Reload current detail
        var detailId = document.querySelector('#devDetailContent')?.dataset?.subId;
        if(detailId) openDevDetail(detailId);
    } catch(e) {
        if(e.message && e.message.indexOf('unique') !== -1) {
            _showToast('Du hast bereits Feedback gegeben.', 'info');
        } else {
            _showToast('Fehler: ' + e.message, 'error');
        }
    }
}

export async function devCloseFeedbackAnfrage(anfrageId) {
    if(!confirm('Feedback-Anfrage schließen?')) return;
    try {
        await _sb().from('dev_feedback_anfragen').update({ status: 'abgeschlossen' }).eq('id', anfrageId);
        _showToast('Anfrage geschlossen.', 'success');
        var detailId = document.querySelector('#devDetailContent')?.dataset?.subId;
        if(detailId) openDevDetail(detailId);
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

// ============================================================
// PHASE 6: Release-Docs anzeigen
// ============================================================

export async function renderDevReleaseDocs(subId) {
    try {
        var resp = await _sb().from('dev_release_docs').select('*').eq('submission_id', subId).order('created_at');
        var docs = resp.data || [];
        if(docs.length === 0) return '';
        var h = '<div class="border-2 border-green-200 rounded-lg p-4 mb-4 bg-green-50">';
        h += '<h4 class="text-sm font-bold text-green-700 mb-3">\u{1F4DD} Release-Dokumentation</h4>';
        docs.forEach(function(d) {
            var icon = d.typ === 'release_note' ? '\u{1F4E3}' : '\u{1F4DA}';
            var label = d.typ === 'release_note' ? 'Release-Note' : 'Wissensartikel';
            h += '<div class="bg-white rounded-lg p-3 border border-green-100 mb-2">';
            h += '<div class="flex justify-between items-center mb-1">';
            h += '<span class="text-xs font-semibold">' + icon + ' ' + label + (d.freigegeben ? ' \u2705' : ' (Entwurf)') + '</span>';
            if(!d.freigegeben) h += '<button onclick="devApproveReleaseDoc(\'' + d.id + '\')" class="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600">Freigeben</button>';
            h += '</div>';
            h += '<p class="text-sm font-semibold text-gray-800">' + _escH(d.titel) + '</p>';
            h += '<p class="text-xs text-gray-600 mt-1 whitespace-pre-wrap">' + _escH(d.inhalt).substring(0, 300) + (d.inhalt.length > 300 ? '...' : '') + '</p>';
            h += '</div>';
        });
        h += '</div>';
        return h;
    } catch(e) { return ''; }
}

export async function devApproveReleaseDoc(docId) {
    try {
        await _sb().from('dev_release_docs').update({
            freigegeben: true, freigegeben_von: _sbUser().id, freigegeben_at: new Date().toISOString()
        }).eq('id', docId);
        _showToast('\u2705 Dokument freigegeben!', 'success');
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

const _exports = { devKIReleaseVorschlag, devShowCreateRelease, devSaveRelease, devEditReleaseDoc, devSaveEditRelease, devDeleteReleaseDoc, devShowFeedbackForm, devCreateFeedbackAnfrage, devSubmitFeedbackAntwort, devCloseFeedbackAnfrage, renderDevReleaseDocs, devApproveReleaseDoc };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
