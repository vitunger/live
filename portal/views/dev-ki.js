/**
 * views/dev-ki.js - KI prioritization, notizen save, KPI filter, prompt copy/regenerate, toggle filter
 * @module views/dev-ki
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

// ========== KI PRIORISIERUNG ==========
export async function runDevKIPrioritize() {
    var btn = document.getElementById('btnDevPrio');
    var resultDiv = document.getElementById('devPrioResult');
    if(!btn || !resultDiv) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="animate-spin">⏳</span><span>KI analysiert...</span>';
    resultDiv.className = 'hidden';

    try {
        var session = await _sb().auth.getSession();
        var token = session?.data?.session?.access_token;
        if(!token) throw new Error('Nicht angemeldet');

        var resp = await fetch(_sbUrl() + '/functions/v1/dev-ki-analyse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ mode: 'prioritize' })
        });
        var data = await resp.json();
        if(!resp.ok || !data.success) throw new Error(data.error || 'Fehler');

        // Render result
        var h = '';
        if(data.zusammenfassung) {
            h += '<div class="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 mb-4">';
            h += '<div class="flex items-start gap-3">';
            h += '<span class="text-2xl">🧠</span>';
            h += '<div>';
            h += '<h4 class="font-bold text-gray-800 text-sm mb-1">KI-Empfehlung</h4>';
            h += '<p class="text-sm text-gray-600">'+data.zusammenfassung+'</p>';
            h += '</div>';
            h += '</div>';
            h += '</div>';
        }

        if(data.empfehlung && data.empfehlung.length > 0) {
            h += '<div class="space-y-2">';
            data.empfehlung.forEach(function(e, i) {
                var actionColors = {
                    'sofort_starten': 'bg-red-100 text-red-700 border-red-200',
                    'einplanen': 'bg-blue-100 text-blue-700 border-blue-200',
                    'spaeter': 'bg-gray-100 text-gray-600 border-gray-200',
                    'pruefen': 'bg-yellow-100 text-yellow-700 border-yellow-200'
                };
                var actionLabels = {
                    'sofort_starten': '🔥 Sofort starten',
                    'einplanen': '📅 Einplanen',
                    'spaeter': '⏸ Später',
                    'pruefen': '🔍 Prüfen'
                };
                var impactIcons = { 'hoch': '🔴', 'mittel': '🟡', 'niedrig': '🟢' };
                var borderClass = i === 0 ? 'border-2 border-purple-300 shadow-md' : 'border border-gray-200';
                var bgClass = i === 0 ? 'bg-purple-50' : 'bg-white';

                h += '<div class="'+bgClass+' '+borderClass+' rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow" onclick="openDevDetail(\''+e.submission_id+'\')">';
                h += '<div class="flex items-center gap-3">';
                h += '<div class="flex-shrink-0 w-8 h-8 rounded-full '+(i===0?'bg-purple-600':'bg-gray-400')+' text-white flex items-center justify-center text-sm font-bold">'+e.rang+'</div>';
                h += '<div class="flex-1 min-w-0">';
                h += '<div class="flex items-center gap-2 flex-wrap">';
                h += '<h4 class="font-semibold text-gray-800 text-sm truncate">'+e.titel+'</h4>';
                var ac = actionColors[e.empfohlene_aktion] || 'bg-gray-100 text-gray-600';
                h += '<span class="text-[10px] font-semibold rounded-full px-2 py-0.5 '+ac+'">'+(actionLabels[e.empfohlene_aktion]||e.empfohlene_aktion)+'</span>';
                h += '<span class="text-[10px] text-gray-400">'+(impactIcons[e.geschaetzter_impact]||'')+' Impact: '+e.geschaetzter_impact+'</span>';
                h += '</div>';
                h += '<p class="text-xs text-gray-500 mt-0.5">'+e.begruendung+'</p>';
                h += '</div>';
                h += '<div class="flex-shrink-0 text-right">';
                h += '<div class="text-lg font-bold '+(e.priority_score >= 80?'text-purple-600':e.priority_score >= 60?'text-blue-600':'text-gray-500')+'">'+e.priority_score+'</div>';
                h += '<div class="text-[9px] text-gray-400 uppercase">Score</div>';
                h += '</div>';
                h += '</div>';
                h += '</div>';
            });
            h += '</div>';
        }

        if(data.quick_wins && data.quick_wins.length > 0) {
            h += '<div class="mt-3 flex items-center gap-2 text-xs text-gray-500">';
            h += '<span>⚡ Quick Wins: '+data.quick_wins.length+' Ideen mit hohem Impact bei niedrigem Aufwand</span>';
            h += '</div>';
        }

        resultDiv.innerHTML = h;
        resultDiv.className = '';
        btn.innerHTML = '<span>🧠</span><span>Erneut priorisieren</span>';
        btn.disabled = false;
        if(typeof _showToast === 'function') _showToast('KI-Priorisierung abgeschlossen!', 'success');
    } catch(err) {
        console.error('KI-Prio error:', err);
        btn.innerHTML = '<span>🧠</span><span>Priorisierung starten</span>';
        btn.disabled = false;
        if(typeof _showToast === 'function') _showToast('Fehler: ' + err.message, 'error');
    }
}

// === NOTIZEN SAVE ===
export async function saveDevNotizen(subId) {
    var textarea = document.getElementById('devNotizen');
    if(!textarea) return;
    var notizen = textarea.value;
    try {
        await _sb().from('dev_submissions').update({ notizen: notizen }).eq('id', subId);
    } catch(e) {
        console.warn('Notizen save error:', e);
    }
}

// === DEPLOY FUNCTIONS ===
export function devKPIFilter(filterKey) {
    // Toggle: click same KPI again = reset
    if((window._devState ? window._devState.kpiActiveFilter : '') === filterKey) {
        window._devState.kpiActiveFilter = '';
    } else {
        window._devState.kpiActiveFilter = filterKey;
    }
    // Switch to Ideen tab and re-render
    showEntwicklungTab('ideen');
    // Reset dropdown filters when KPI is active
    if(window._devState ? window._devState.kpiActiveFilter : '') {
        var fStatus = document.getElementById('entwFilterStatus');
        var fTyp = document.getElementById('entwFilterTyp');
        var fKat = document.getElementById('entwFilterKat');
        var fQuelle = document.getElementById('entwFilterQuelle');
        if(fStatus) fStatus.value = 'alle';
        if(fTyp) fTyp.value = 'alle';
        if(fKat) fKat.value = 'alle';
        if(fQuelle) fQuelle.value = 'alle';
    }
    renderEntwIdeen();
    // Re-render KPIs to update active highlight
    renderEntwicklung();
}

export function devToggleMirZugewiesen() {
    window._devState.filterMirZugewiesen = !(window._devState ? window._devState.filterMirZugewiesen : false);
    renderDevPlanung();
}

export function devCopyPrompt() {
    var pre = document.getElementById('devPromptContent');
    if(!pre) return;
    var text = pre.textContent || pre.innerText;
    navigator.clipboard.writeText(text).then(function() {
        _showToast('\uD83D\uDCCB Prompt in Zwischenablage kopiert!', 'success');
    }).catch(function() {
        // Fallback: select text
        var range = document.createRange();
        range.selectNodeContents(pre);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        _showToast('\uD83D\uDCCB Prompt kopiert!', 'success');
    });
}

export async function devRegeneratePrompt(subId) {
    // Rebuild prompt based on checkbox state
    var includeMockup = document.getElementById('devPromptIncludeMockup');
    var includeKontext = document.getElementById('devPromptIncludeKontext');
    var wantMockup = includeMockup ? includeMockup.checked : true;
    var wantKontext = includeKontext ? includeKontext.checked : true;

    var s = _devSubs().find(function(x){ return x.id === subId; });
    if(!s) return;

    var kiResp = await _sb().from('dev_ki_analysen').select('*').eq('submission_id', subId).order('version', {ascending: false}).limit(1);
    var ki = (kiResp.data||[])[0] || null;
    var kResp = await _sb().from('dev_konzepte').select('*').eq('submission_id', subId).order('version', {ascending: false}).limit(1);
    var konzept = (kResp.data||[])[0] || null;

    var parts = [];
    parts.push('# Aufgabe: ' + (s.titel || 'Feature-Entwicklung'));
    parts.push('');
    if(s.beschreibung) { parts.push('## Beschreibung'); parts.push(s.beschreibung); parts.push(''); }
    if(s.ki_typ) parts.push('**Typ:** ' + (s.ki_typ==='bug'?'\uD83D\uDC1B Bug':s.ki_typ==='feature'?'\u2728 Feature':'\uD83D\uDCA1 Idee') + (s.bug_schwere ? ' (Schwere: '+s.bug_schwere+')' : ''));
    if(s.modul_key) parts.push('**Modul:** ' + s.modul_key);
    if(ki) parts.push('**Aufwand:** ' + (ki.aufwand_schaetzung||'-') + ' | **Machbarkeit:** ' + (ki.machbarkeit||'-') + ' | **Vision-Fit:** ' + (ki.vision_fit_score||'-') + '/100');
    parts.push('');

    if(konzept) {
        parts.push('## Konzept (v' + konzept.version + ')');
        if(konzept.problem_beschreibung) { parts.push('### Problem'); parts.push(konzept.problem_beschreibung); }
        if(konzept.ziel) { parts.push('### Ziel'); parts.push(konzept.ziel); }
        if(konzept.nutzen) { parts.push('### Nutzen'); parts.push(konzept.nutzen); }
        if(konzept.scope_in) { parts.push('### Scope (In)'); parts.push(konzept.scope_in); }
        if(konzept.scope_out) { parts.push('### Scope (Out)'); parts.push(konzept.scope_out); }
        if(konzept.loesungsvorschlag_ui) { parts.push('### UI/Frontend'); parts.push(konzept.loesungsvorschlag_ui); }
        if(konzept.loesungsvorschlag_backend) { parts.push('### Backend'); parts.push(konzept.loesungsvorschlag_backend); }
        if(konzept.loesungsvorschlag_db) { parts.push('### Datenbank'); parts.push(konzept.loesungsvorschlag_db); }
        if(konzept.akzeptanzkriterien && konzept.akzeptanzkriterien.length > 0) {
            parts.push('### Akzeptanzkriterien');
            konzept.akzeptanzkriterien.forEach(function(a) { parts.push('- ' + (a.beschreibung||a)); });
        }
        if(konzept.testplan) { parts.push('### Testplan'); parts.push(konzept.testplan); }
        if(konzept.rollout_strategie) { parts.push('### Rollout'); parts.push(konzept.rollout_strategie); }
        if(konzept.definition_of_done) { parts.push('### Definition of Done'); parts.push(konzept.definition_of_done); }
        if(konzept.feature_flag_key) parts.push('**Feature-Flag:** ' + konzept.feature_flag_key);
        parts.push('');
    }

    if(wantMockup) {
        var mResp = await _sb().from('dev_mockups').select('version,html_content').eq('submission_id', subId).order('version', {ascending: false}).limit(1);
        var mockup = (mResp.data||[])[0] || null;
        if(mockup) {
            parts.push('## Mockup (v' + mockup.version + ')');
            parts.push('```html');
            parts.push(mockup.html_content);
            parts.push('```');
            parts.push('');
        }
    }

    if(wantKontext) {
        parts.push('## Tech-Stack & Kontext');
        parts.push('- **Framework:** Vanilla JavaScript (ES6 Module in portal/views/*.js)');
        parts.push('- **Backend:** Supabase (PostgreSQL + RLS + Edge Functions)');
        parts.push('- **Styling:** Tailwind CSS, Prim\u00E4rfarbe Orange (#f97316)');
        parts.push('- **Architektur:** Single Page Application, Module werden per ES6 import geladen');
        parts.push('- **Deployment:** GitHub \u2192 Vercel (auto-deploy bei Push auf main)');
        parts.push('- **Repo:** github.com/vitunger/live');
        parts.push('');
    }

    parts.push('Bitte setze dieses Feature gem\u00E4\u00DF dem Konzept um. Achte auf das bestehende Design-System und die Modulstruktur.');

    var fullText = parts.join('\n');
    var pre = document.getElementById('devPromptContent');
    if(pre) pre.textContent = fullText;
    var counter = document.getElementById('devPromptCharCount');
    if(counter) counter.textContent = fullText.length + ' Zeichen';
}

const _exports = { runDevKIPrioritize, saveDevNotizen, devKPIFilter, devToggleMirZugewiesen, devCopyPrompt, devRegeneratePrompt };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });

window.devKPIFilter = devKPIFilter;
window.devToggleMirZugewiesen = devToggleMirZugewiesen;
window.devCopyPrompt = devCopyPrompt;
window.devRegeneratePrompt = devRegeneratePrompt;
