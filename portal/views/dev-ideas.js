/**
 * views/dev-ideas.js - Idea submission, voting, HQ decisions, queue management
 * @module views/dev-ideas
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

export async function submitDevIdea() {
    var btn = document.getElementById('devSubmitBtn');
    if(btn) { btn.disabled = true; btn.textContent = '⏳ Wird eingereicht...'; }
    try {
        var titel = (document.getElementById('devTitel').value || '').trim();
        var beschreibung = (document.getElementById('devBeschreibung').value || '').trim();
        var kategorie = document.getElementById('devKategorie').value;
        var modul = document.getElementById('devModul').value || null;

        if(!titel && !beschreibung && (window._devState ? window._devState.selectedFiles : []).length === 0) { _showToast('Bitte gib mindestens einen Titel, eine Beschreibung oder eine Aufnahme/Datei an.', 'error'); if(btn) { btn.disabled = false; btn.textContent = '💡 Feedback einreichen'; } return; }

        // Upload files to Supabase Storage
        var attachments = [];
        var userId = _sbUser() ? _sbUser().id : 'dd000000-0000-0000-0000-000000000002';
        var _selectedFiles = window._devState ? window._devState.selectedFiles : [];
        for(var i = 0; i < _selectedFiles.length; i++) {
            var file = _selectedFiles[i];
            var path = 'dev-submissions/' + userId + '/' + Date.now() + '_' + file.name;
            var upResp = await _sb().storage.from('portal-uploads').upload(path, file);
            if(upResp.error) { console.error('Upload error:', upResp.error); continue; }
            var urlResp = _sb().storage.from('portal-uploads').getPublicUrl(path);
            attachments.push({ url: urlResp.data.publicUrl, name: file.name, type: file.type, size: file.size, storage_path: path });
        }

        // Insert submission
        var insertData = {
            user_id: userId,
            standort_id: sbStandort ? sbStandort.id : null,
            titel: titel || null,
            beschreibung: beschreibung || null,
            kurz_notiz: beschreibung ? beschreibung.substring(0, 200) : null,
            eingabe_typ: (window._devState ? window._devState.inputType : 'text'),
            kategorie: kategorie,
            kategorie_quelle: 'user',
            modul_key: modul,
            attachments: attachments,
            status: 'neu',
            partner_sichtbar: (currentRoles||[]).indexOf('hq') === -1
        };

        var resp = await _sb().from('dev_submissions').insert(insertData).select().single();
        if(resp.error) throw resp.error;

        // Reset form
        document.getElementById('devTitel').value = '';
        document.getElementById('devBeschreibung').value = '';
        window._devState.selectedFiles = [];
        var fl = document.getElementById('devFileList'); if(fl) fl.innerHTML = '';
        toggleDevSubmitForm();

        _showToast('\uD83D\uDCA1 Idee eingereicht! KI analysiert im Hintergrund...', 'success');

        // Sofort anzeigen: Daten neu laden + rendern
        await loadDevSubmissions(true);
        refreshEntwicklungViews();

        // Trigger KI-Analyse (fire-and-forget, im Hintergrund)
        var submissionId = resp.data.id;
        _sb().functions.invoke('dev-ki-analyse', {
            body: { submission_id: submissionId }
        }).then(function(kiResp) {
            if(kiResp.error) console.warn('KI-Analyse Fehler:', kiResp.error);
            else console.debug('KI-Analyse fertig für:', submissionId);
            // Nach Analyse nochmal neu laden um Ergebnis zu zeigen
            loadDevSubmissions(true).then(function(){ refreshEntwicklungViews(); });
        });
    } catch(err) {
        _showToast('Fehler beim Einreichen: ' + (err.message||err), 'error');
    } finally {
        if(btn) { btn.disabled = false; btn.textContent = '💡 Feedback einreichen'; }
    }
}

export async function toggleDevVote(subId) {
    try {
        // Prevent voting on own submissions
        var sub = _devSubs().find(function(s){ return s.id === subId; });
        if(sub && sub.user_id === _sbUser().id) {
            _showToast('Du kannst deine eigene Idee nicht bewerten.', 'error');
            return;
        }
        var checkResp = await _sb().from('dev_votes').select('id').eq('submission_id', subId).eq('user_id', _sbUser().id);
        if(checkResp.data && checkResp.data.length > 0) {
            await _sb().from('dev_votes').delete().eq('submission_id', subId).eq('user_id', _sbUser().id);
            _showToast('Vote zurückgezogen', 'info');
        } else {
            var ins = await _sb().from('dev_votes').insert({ submission_id: subId, user_id: _sbUser().id }).select();
            if(ins.error) throw ins.error;
            _showToast('👍 Vote abgegeben!', 'success');
            // Notify submitter
            if(sub && sub.user_id !== _sbUser().id) {
                _sb().from('dev_notifications').insert({
                    user_id: sub.user_id, submission_id: subId,
                    typ: 'vote', titel: '👍 Jemand hat für deine Idee gestimmt',
                    inhalt: sub.titel || '(Ohne Titel)'
                });
            }
        }
        // Refresh whichever view is active
        await loadDevSubmissions();
        if(typeof window.renderEntwIdeen === 'function') window.renderEntwIdeen();
        if(typeof window.renderDevPipeline === 'function') window.renderDevPipeline();
    } catch(err) {
        if(err.code === '23505') { _showToast('Bereits abgestimmt.', 'info'); }
        else { console.error('Vote error:', err); _showToast('Vote fehlgeschlagen: ' + (err.message||err), 'error'); }
    }
}

export async function devHQDecision(subId, ergebnis) {
    // Owner-Check: Nur Owner darf freigeben oder ablehnen
    var isOwner = (currentRoles||[]).indexOf('owner') !== -1;
    if(!isOwner && ['freigabe','freigabe_mit_aenderungen','ablehnung'].indexOf(ergebnis) !== -1) {
        _showToast('Nur der Owner kann Ideen freigeben oder ablehnen.', 'error');
        return;
    }
    var kommentar = '';
    var statusMap = { freigabe:'freigegeben', freigabe_mit_aenderungen:'freigegeben', ideenboard:'im_ideenboard', rueckfragen:'hq_rueckfragen', ablehnung:'abgelehnt', spaeter:'geparkt', geschlossen:'geschlossen' };

    if(ergebnis === 'rueckfragen') {
        kommentar = prompt('Welche Rückfragen hast du?');
        if(!kommentar) return;
    } else if(ergebnis === 'ablehnung') {
        kommentar = prompt('Begründung für die Ablehnung:');
        if(!kommentar) return;
    }

    try {
        // Save decision
        await _sb().from('dev_entscheidungen').insert({
            submission_id: subId,
            entscheider_id: _sbUser().id,
            ergebnis: ergebnis,
            kommentar: kommentar || null
        });

        // Update submission status
        var newStatus = statusMap[ergebnis] || 'im_ideenboard';
        var updates = { status: newStatus };
        if(ergebnis === 'freigabe' || ergebnis === 'freigabe_mit_aenderungen') {
            updates.freigegeben_at = new Date().toISOString();
            updates.hq_entschieden_at = new Date().toISOString();
            // For freigabe: set temporary status, KI will create konzept
            if(ergebnis === 'freigabe') updates.status = 'konzept_wird_erstellt';
        }

        await _sb().from('dev_submissions').update(updates).eq('id', subId);

        // Add comment
        if(kommentar) {
            await _sb().from('dev_kommentare').insert({
                submission_id: subId,
                user_id: _sbUser().id,
                typ: ergebnis === 'rueckfragen' ? 'rueckfrage' : 'kommentar',
                inhalt: kommentar
            });
        }

        // Trigger KI-Konzepterstellung bei Freigabe (fire-and-forget)
        if(ergebnis === 'freigabe') {
            _showToast('✅ Freigegeben! Entwicklungskonzept wird erstellt...', 'success');
            try { _sb().functions.invoke('dev-ki-analyse', {
                body: { submission_id: subId, mode: 'konzept' }
            }).then(function() {
        // Update local cache
        var _ls = _devSubs().find(function(s){ return s.id === subId; });
        if(_ls) { var _sm2 = {freigabe:'konzept_wird_erstellt',freigabe_mit_aenderungen:'ki_pruefung',rueckfragen:'hq_rueckfragen',ablehnung:'abgelehnt',spaeter:'geparkt',geschlossen:'geschlossen'}; _ls.status = _sm2[ergebnis] || _ls.status; }
                if(typeof window.refreshEntwicklungViews === 'function') window.refreshEntwicklungViews();
        setTimeout(function(){ loadDevSubmissions().then(function(){ if(typeof window.refreshEntwicklungViews === 'function') window.refreshEntwicklungViews(); }); }, 1500);
            }); } catch(_e) {}

            // Auto-create roadmap entry
            var sub2 = _devSubs().find(function(s){ return s.id === subId; });
            if(sub2) {
                var now2 = new Date();
                var qM = now2.getMonth() + 3;
                var qY = now2.getFullYear() + (qM > 11 ? 1 : 0);
                qM = qM > 11 ? qM - 12 : qM;
                var q2 = 'Q' + (Math.floor(qM/3)+1) + ' ' + qY;
                _sb().from('dev_roadmap').insert({
                    titel: sub2.titel || sub2.beschreibung || 'Freigegebene Idee',
                    beschreibung: sub2.beschreibung || '',
                    kategorie: sub2.kategorie || 'feature',
                    modul_key: sub2.modul_key || null,
                    status: 'geplant', prioritaet: sub2.ki_typ === 'bug' ? 'hoch' : 'mittel',
                    aufwand: sub2.geschaetzter_aufwand || 'M',
                    ziel_quartal: q2, submission_id: subId, sortierung: 999
                });
            }
        }

        await loadDevSubmissions(true);
        if(typeof window.renderDevPipeline === 'function') window.renderDevPipeline();
        if(typeof window.renderEntwSteuerung === 'function') window.renderEntwSteuerung();
    } catch(err) { _showToast('Fehler: ' + (err.message||err), 'error'); }
}

export async function moveDevQueue(subId, direction) {
    // Find current item and swap positions
    var planItems = _devSubs().filter(function(s) {
        return ['freigegeben','in_planung','in_entwicklung','beta_test','im_review','release_geplant'].indexOf(s.status) !== -1;
    }).sort(function(a,b) { return (a.queue_position||9999) - (b.queue_position||9999); });

    var idx = planItems.findIndex(function(s) { return s.id === subId; });
    if(idx === -1) return;
    var targetIdx = idx + direction;
    if(targetIdx < 0 || targetIdx >= planItems.length) return;

    try {
        // Swap positions
        var pos1 = planItems[idx].queue_position || idx + 1;
        var pos2 = planItems[targetIdx].queue_position || targetIdx + 1;
        await _sb().from('dev_submissions').update({ queue_position: pos2 }).eq('id', planItems[idx].id);
        await _sb().from('dev_submissions').update({ queue_position: pos1 }).eq('id', planItems[targetIdx].id);
        if(typeof window.renderDevPipeline === 'function') window.renderDevPipeline();
    } catch(err) { console.error('Queue move error:', err); }
}

const _exports = { submitDevIdea, toggleDevVote, devHQDecision, moveDevQueue };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
