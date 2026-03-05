/**
 * views/spiritus.js – Spiritus: Call Intelligence & Protokoll
 * Transkribiert Standort-Calls, extrahiert Erkenntnisse via KI,
 * speist den KI-Trainer mit netzwerkinternem Wissen.
 * @module views/spiritus
 * Nur für HQ sichtbar (is_hq = true)
 */

function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }

// ─── State ─────────────────────────────────────────────────────────────────
var SP = {
    transcripts: [],
    currentTab: 'uebersicht',
    filterStandort: '',
    filterStatus: '',
    uploadMode: 'audio',   // 'audio' | 'text'
    processing: false
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function spFmt(date) {
    if (!date) return '–';
    var d = new Date(date);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function spSentimentColor(level) {
    if (level === 'positiv')    return 'text-green-600 bg-green-50';
    if (level === 'angespannt') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-100';
}

function spSentimentIcon(level) {
    if (level === 'positiv')    return '😊';
    if (level === 'angespannt') return '😤';
    return '😐';
}

function spStatusBadge(status) {
    var map = {
        'verarbeitet':  'bg-green-100 text-green-700',
        'review':       'bg-yellow-100 text-yellow-700',
        'in_progress':  'bg-blue-100 text-blue-700',
        'fehler':       'bg-red-100 text-red-700'
    };
    var label = {
        'verarbeitet': 'Fertig',
        'review': 'Review',
        'in_progress': 'Wird verarbeitet',
        'fehler': 'Fehler'
    };
    var cls = map[status] || 'bg-gray-100 text-gray-600';
    return '<span class="text-xs px-2 py-0.5 rounded-full font-medium ' + cls + '">' + (label[status] || status) + '</span>';
}

// ─── Init ───────────────────────────────────────────────────────────────────
export function initSpiritus() {
    SP.transcripts = [];
    SP.currentTab  = 'uebersicht';
    SP.filterStandort = '';
    SP.filterStatus   = '';
    loadSpTranscripts();
    spRenderAll();
}

function loadSpTranscripts() {
    var sb = _sb();
    if (!sb) return;
    sb.from('spiritus_transcripts')
      .select('id, standort_id, standort_name, call_date, call_type, duration_min, status, summary, sentiment_level, created_at, spiritus_extractions(id, kategorie, content, confidence, approved)')
      .order('call_date', { ascending: false })
      .limit(200)
      .then(function(res) {
          if (res.error) { console.warn('Spiritus load:', res.error.message); return; }
          SP.transcripts = res.data || [];
          spRenderAll();
      });
}

// ─── Tab Navigation ─────────────────────────────────────────────────────────
export function spTab(tab) {
    SP.currentTab = tab;
    document.querySelectorAll('.sp-tab-btn').forEach(function(b) {
        var active = b.dataset.sptab === tab;
        b.className = 'sp-tab-btn whitespace-nowrap py-3 px-4 border-b-2 font-semibold text-sm transition-colors ' +
            (active ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700');
    });
    spRenderAll();
}

function spRenderAll() {
    spRenderUebersicht();
    spRenderTimeline();
    spRenderIntelligenz();
    spRenderUpload();

    // Tab visibility
    ['uebersicht','timeline','intelligenz','upload'].forEach(function(t) {
        var el = document.getElementById('spTab_' + t);
        if (el) el.style.display = SP.currentTab === t ? '' : 'none';
    });
}

// ─── Tab: Übersicht ──────────────────────────────────────────────────────────
function spRenderUebersicht() {
    var el = document.getElementById('spTab_uebersicht');
    if (!el) return;

    var total   = SP.transcripts.length;
    var pending = SP.transcripts.filter(function(t) { return t.status === 'review'; }).length;
    var done    = SP.transcripts.filter(function(t) { return t.status === 'verarbeitet'; }).length;

    // Sentiment verteilung
    var pos = 0, neu = 0, ang = 0;
    SP.transcripts.forEach(function(t) {
        if (t.sentiment_level === 'positiv')    pos++;
        else if (t.sentiment_level === 'angespannt') ang++;
        else neu++;
    });

    // Letzte 5 Calls
    var recent = SP.transcripts.slice(0, 5);

    var html = '';
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">';
    html += spStatCard('🎙️', total, 'Calls gesamt', 'text-orange-600');
    html += spStatCard('⏳', pending, 'Warten auf Review', 'text-yellow-600');
    html += spStatCard('✅', done, 'Abgeschlossen', 'text-green-600');
    html += spStatCard('😤', ang, 'Angespannte Calls', 'text-red-600');
    html += '</div>';

    // Sentiment Chart (simple bar)
    if (total > 0) {
        html += '<div class="vit-card p-4 mb-5">';
        html += '<h3 class="text-sm font-bold text-gray-700 mb-3">📊 Stimmungsbild im Netzwerk</h3>';
        html += '<div class="space-y-2">';
        html += spSentimentBar('Positiv 😊', pos, total, 'bg-green-400');
        html += spSentimentBar('Neutral 😐', neu, total, 'bg-gray-300');
        html += spSentimentBar('Angespannt 😤', ang, total, 'bg-red-400');
        html += '</div></div>';
    }

    // Pending Reviews
    var reviews = SP.transcripts.filter(function(t) { return t.status === 'review'; });
    if (reviews.length) {
        html += '<div class="vit-card p-4 mb-5">';
        html += '<h3 class="text-sm font-bold text-gray-700 mb-3">⏳ Warten auf deine Freigabe (' + reviews.length + ')</h3>';
        html += '<div class="space-y-2">';
        reviews.slice(0, 5).forEach(function(t) {
            html += '<div class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">';
            html += '<div>';
            html += '<span class="font-semibold text-sm text-gray-800">' + _escH(t.standort_name || '–') + '</span>';
            html += '<span class="text-xs text-gray-500 ml-2">' + spFmt(t.call_date) + '</span>';
            html += '</div>';
            html += '<button onclick="spOpenReview(\'' + t.id + '\')" class="text-xs bg-orange-500 text-white px-3 py-1 rounded-full hover:bg-orange-600 transition">Review →</button>';
            html += '</div>';
        });
        html += '</div></div>';
    }

    // Recent Calls
    html += '<div class="vit-card p-4">';
    html += '<h3 class="text-sm font-bold text-gray-700 mb-3">🕐 Letzte Calls</h3>';
    if (!recent.length) {
        html += '<p class="text-sm text-gray-400 text-center py-6">Noch keine Calls verarbeitet.</p>';
    } else {
        html += '<div class="space-y-2">';
        recent.forEach(function(t) {
            html += '<div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 cursor-pointer" onclick="spOpenDetail(\'' + t.id + '\')">';
            html += '<div class="flex items-center gap-3">';
            html += '<span class="text-lg">' + spSentimentIcon(t.sentiment_level) + '</span>';
            html += '<div>';
            html += '<div class="font-semibold text-sm text-gray-800">' + _escH(t.standort_name || '–') + '</div>';
            html += '<div class="text-xs text-gray-400">' + spFmt(t.call_date) + (t.duration_min ? ' · ' + t.duration_min + ' Min' : '') + '</div>';
            html += '</div></div>';
            html += '<div class="flex items-center gap-2">';
            html += spStatusBadge(t.status);
            html += '</div></div>';
        });
        html += '</div>';
    }
    html += '</div>';

    el.innerHTML = html;
}

function spStatCard(icon, val, label, colorCls) {
    return '<div class="vit-card p-4 text-center">' +
        '<div class="text-2xl mb-1">' + icon + '</div>' +
        '<div class="text-2xl font-bold ' + colorCls + '">' + val + '</div>' +
        '<div class="text-xs text-gray-500 mt-0.5">' + label + '</div>' +
        '</div>';
}

function spSentimentBar(label, count, total, color) {
    var pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return '<div class="flex items-center gap-3">' +
        '<span class="text-xs text-gray-600 w-28">' + label + '</span>' +
        '<div class="flex-1 bg-gray-100 rounded-full h-3">' +
        '<div class="h-3 rounded-full ' + color + ' transition-all" style="width:' + pct + '%"></div>' +
        '</div>' +
        '<span class="text-xs font-semibold text-gray-700 w-10 text-right">' + count + ' (' + pct + '%)</span>' +
        '</div>';
}

// ─── Tab: Timeline ───────────────────────────────────────────────────────────
function spRenderTimeline() {
    var el = document.getElementById('spTab_timeline');
    if (!el) return;

    // Filter controls
    var html = '<div class="flex flex-wrap gap-3 mb-5">';
    html += '<select id="spFilterStandort" onchange="spApplyFilter()" class="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"><option value="">Alle Standorte</option></select>';
    html += '<select id="spFilterStatus" onchange="spApplyFilter()" class="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">';
    html += '<option value="">Alle Status</option>';
    html += '<option value="verarbeitet">Fertig</option>';
    html += '<option value="review">Review</option>';
    html += '<option value="fehler">Fehler</option>';
    html += '</select>';
    html += '</div>';

    // Transcripts list
    var filtered = SP.transcripts.filter(function(t) {
        if (SP.filterStandort && t.standort_id !== SP.filterStandort) return false;
        if (SP.filterStatus  && t.status !== SP.filterStatus)          return false;
        return true;
    });

    if (!filtered.length) {
        html += '<div class="vit-card p-8 text-center text-gray-400"><div class="text-4xl mb-2">🎙️</div><p class="text-sm">Noch keine Calls vorhanden.<br>Neuen Call über <strong>Upload</strong> erfassen.</p></div>';
    } else {
        html += '<div class="space-y-3">';
        filtered.forEach(function(t) {
            var extr = t.spiritus_extractions || [];
            var problems  = extr.filter(function(e) { return e.kategorie === 'problem'; }).length;
            var massnahmen= extr.filter(function(e) { return e.kategorie === 'massnahme'; }).length;

            html += '<div class="vit-card p-4 hover:shadow-md transition cursor-pointer" onclick="spOpenDetail(\'' + t.id + '\')">';
            html += '<div class="flex items-start justify-between mb-2">';
            html += '<div class="flex items-center gap-3">';
            html += '<span class="text-2xl">' + spSentimentIcon(t.sentiment_level) + '</span>';
            html += '<div>';
            html += '<div class="font-bold text-gray-900">' + _escH(t.standort_name || '–') + '</div>';
            html += '<div class="text-xs text-gray-500">' + spFmt(t.call_date) + (t.call_type ? ' · ' + _escH(t.call_type) : '') + (t.duration_min ? ' · ' + t.duration_min + ' Min' : '') + '</div>';
            html += '</div></div>';
            html += '<div class="flex items-center gap-2">';
            html += spStatusBadge(t.status);
            html += '</div></div>';

            if (t.summary) {
                html += '<p class="text-sm text-gray-600 mb-3 line-clamp-2">' + _escH(t.summary) + '</p>';
            }

            html += '<div class="flex items-center gap-4 text-xs text-gray-500">';
            html += '<span>🔴 ' + problems + ' Probleme</span>';
            html += '<span>✅ ' + massnahmen + ' Maßnahmen</span>';
            if (t.sentiment_level) {
                var sentCls = spSentimentColor(t.sentiment_level);
                html += '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + sentCls + '">' + t.sentiment_level + '</span>';
            }
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
    }

    el.innerHTML = html;

    // Populate standort filter
    spPopulateStandortFilter();
}

export function spApplyFilter() {
    var s = document.getElementById('spFilterStandort');
    var f = document.getElementById('spFilterStatus');
    SP.filterStandort = s ? s.value : '';
    SP.filterStatus   = f ? f.value : '';
    spRenderTimeline();
}

function spPopulateStandortFilter() {
    var sel = document.getElementById('spFilterStandort');
    if (!sel) return;
    var seen = {};
    var opts = '<option value="">Alle Standorte</option>';
    SP.transcripts.forEach(function(t) {
        if (t.standort_id && !seen[t.standort_id]) {
            seen[t.standort_id] = true;
            opts += '<option value="' + _escH(t.standort_id) + '">' + _escH(t.standort_name || t.standort_id) + '</option>';
        }
    });
    sel.innerHTML = opts;
    if (SP.filterStandort) sel.value = SP.filterStandort;
}

// ─── Tab: Intelligenz ────────────────────────────────────────────────────────
function spRenderIntelligenz() {
    var el = document.getElementById('spTab_intelligenz');
    if (!el) return;

    // Aggregate all approved extractions
    var allExtr = [];
    SP.transcripts.forEach(function(t) {
        (t.spiritus_extractions || []).forEach(function(e) {
            if (e.approved) allExtr.push(Object.assign({}, e, { standort_name: t.standort_name, call_date: t.call_date }));
        });
    });

    var problems   = allExtr.filter(function(e) { return e.kategorie === 'problem'; });
    var massnahmen = allExtr.filter(function(e) { return e.kategorie === 'massnahme'; });

    var html = '';

    // Summary cards
    html += '<div class="grid grid-cols-2 gap-4 mb-6">';
    html += '<div class="vit-card p-4"><div class="text-2xl font-bold text-red-600">' + problems.length + '</div><div class="text-xs text-gray-500">Erkannte Probleme</div></div>';
    html += '<div class="vit-card p-4"><div class="text-2xl font-bold text-green-600">' + massnahmen.length + '</div><div class="text-xs text-gray-500">Bewährte Maßnahmen</div></div>';
    html += '</div>';

    // Top Problems
    html += '<div class="vit-card p-4 mb-5">';
    html += '<h3 class="text-sm font-bold text-gray-700 mb-3">🔴 Häufigste Probleme im Netzwerk</h3>';
    if (!problems.length) {
        html += '<p class="text-xs text-gray-400">Noch keine Daten.</p>';
    } else {
        html += '<div class="space-y-2">';
        problems.slice(0, 8).forEach(function(e) {
            html += '<div class="flex items-start gap-3 p-3 bg-red-50 rounded-lg">';
            html += '<span class="text-red-500 mt-0.5">•</span>';
            html += '<div class="flex-1">';
            html += '<p class="text-sm text-gray-800">' + _escH(e.content) + '</p>';
            html += '<p class="text-xs text-gray-400 mt-0.5">' + _escH(e.standort_name || '–') + ' · ' + spFmt(e.call_date) + '</p>';
            html += '</div>';
            html += '<span class="text-xs text-gray-400">' + Math.round((e.confidence || 0) * 100) + '%</span>';
            html += '</div>';
        });
        html += '</div>';
    }
    html += '</div>';

    // Top Maßnahmen
    html += '<div class="vit-card p-4">';
    html += '<h3 class="text-sm font-bold text-gray-700 mb-3">✅ Bewährte Maßnahmen aus dem Netzwerk</h3>';
    if (!massnahmen.length) {
        html += '<p class="text-xs text-gray-400">Noch keine Daten.</p>';
    } else {
        html += '<div class="space-y-2">';
        massnahmen.slice(0, 8).forEach(function(e) {
            html += '<div class="flex items-start gap-3 p-3 bg-green-50 rounded-lg">';
            html += '<span class="text-green-500 mt-0.5">✓</span>';
            html += '<div class="flex-1">';
            html += '<p class="text-sm text-gray-800">' + _escH(e.content) + '</p>';
            html += '<p class="text-xs text-gray-400 mt-0.5">' + _escH(e.standort_name || '–') + ' · ' + spFmt(e.call_date) + '</p>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
    }
    html += '</div>';

    el.innerHTML = html;
}

// ─── Tab: Upload ─────────────────────────────────────────────────────────────
function spRenderUpload() {
    var el = document.getElementById('spTab_upload');
    if (!el) return;

    var html = '<div class="max-w-2xl mx-auto">';
    html += '<div class="vit-card p-6">';
    html += '<h3 class="text-base font-bold text-gray-800 mb-4">🎙️ Neuen Call erfassen</h3>';

    // Mode toggle
    html += '<div class="flex gap-2 mb-5">';
    html += '<button onclick="spSetMode(\'audio\')" id="spModeAudio" class="flex-1 py-2 rounded-lg text-sm font-semibold transition ' + (SP.uploadMode === 'audio' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + '">🎵 Audio-Datei</button>';
    html += '<button onclick="spSetMode(\'text\')"  id="spModeText"  class="flex-1 py-2 rounded-lg text-sm font-semibold transition ' + (SP.uploadMode === 'text'  ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + '">📝 Transkript-Text</button>';
    html += '</div>';

    // Meta fields
    html += '<div class="grid grid-cols-2 gap-4 mb-4">';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Standort *</label>';
    html += '<select id="spUpStandort" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"><option value="">Standort wählen…</option></select></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Call-Datum *</label>';
    html += '<input id="spUpDate" type="date" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value="' + new Date().toISOString().split('T')[0] + '"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Call-Typ</label>';
    html += '<select id="spUpType" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">';
    html += '<option>Check-in</option><option>Onboarding</option><option>Problem-Call</option><option>Strategiegespräch</option><option>Sonstiges</option>';
    html += '</select></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Dauer (Minuten)</label>';
    html += '<input id="spUpDuration" type="number" min="1" max="180" placeholder="z.B. 30" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></div>';
    html += '</div>';

    // Upload area
    if (SP.uploadMode === 'audio') {
        html += '<div id="spDropZone" ondragover="spDragOver(event)" ondragleave="spDragLeave(event)" ondrop="spDrop(event)" class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-4 transition-colors hover:border-orange-400 cursor-pointer" onclick="document.getElementById(\'spAudioInput\').click()">';
        html += '<div class="text-4xl mb-2">🎵</div>';
        html += '<p class="text-sm font-semibold text-gray-700">Audio-Datei hierher ziehen</p>';
        html += '<p class="text-xs text-gray-400 mt-1">oder klicken zum Auswählen · MP3, M4A, WAV, MP4 · max. 100 MB</p>';
        html += '<p id="spFileLabel" class="text-xs text-orange-600 mt-2 font-medium"></p>';
        html += '</div>';
        html += '<input id="spAudioInput" type="file" accept="audio/*,video/mp4" class="hidden" onchange="spFileSelected(this)">';
    } else {
        html += '<div class="mb-4">';
        html += '<label class="text-xs font-semibold text-gray-600 block mb-1">Transkript einfügen *</label>';
        html += '<textarea id="spTranscriptText" rows="8" placeholder="Transkript hier einfügen…" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"></textarea>';
        html += '</div>';
    }

    // Submit
    html += '<button onclick="spSubmit()" id="spSubmitBtn" class="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 active:scale-95 transition-all">';
    html += SP.processing ? '⏳ Wird verarbeitet…' : '🚀 Call analysieren';
    html += '</button>';

    if (SP.processing) {
        html += '<div class="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 text-center">';
        html += '⏳ KI analysiert den Call… Das kann 30–60 Sekunden dauern.';
        html += '</div>';
    }

    html += '</div></div>';
    el.innerHTML = html;

    // Populate standort dropdown
    spPopulateUploadStandort();
}

export function spSetMode(mode) {
    SP.uploadMode = mode;
    spRenderUpload();
}

function spPopulateUploadStandort() {
    var sel = document.getElementById('spUpStandort');
    if (!sel) return;
    var sb = _sb();
    if (!sb) return;
    sb.from('standorte').select('id, name').eq('status', 'aktiv').order('name').then(function(res) {
        if (!res.data) return;
        var html = '<option value="">Standort wählen…</option>';
        res.data.forEach(function(s) {
            html += '<option value="' + _escH(s.id) + '">' + _escH(s.name) + '</option>';
        });
        sel.innerHTML = html;
    });
}

export function spFileSelected(input) {
    var label = document.getElementById('spFileLabel');
    if (label && input.files[0]) {
        label.textContent = '✓ ' + input.files[0].name + ' (' + Math.round(input.files[0].size / 1024 / 1024 * 10) / 10 + ' MB)';
    }
}

export function spDragOver(e) {
    e.preventDefault();
    var zone = document.getElementById('spDropZone');
    if (zone) zone.classList.add('border-orange-500', 'bg-orange-50');
}

export function spDragLeave(e) {
    var zone = document.getElementById('spDropZone');
    if (zone) zone.classList.remove('border-orange-500', 'bg-orange-50');
}

export function spDrop(e) {
    e.preventDefault();
    spDragLeave(e);
    var file = e.dataTransfer.files[0];
    if (!file) return;
    var input = document.getElementById('spAudioInput');
    if (input) {
        // Assign to file input via DataTransfer
        var dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        spFileSelected(input);
    }
}

// ─── Submit & Analyse ────────────────────────────────────────────────────────
export async function spSubmit() {
    if (SP.processing) return;

    var standortId   = (document.getElementById('spUpStandort')   || {}).value;
    var callDate     = (document.getElementById('spUpDate')        || {}).value;
    var callType     = (document.getElementById('spUpType')        || {}).value;
    var durationMin  = parseInt((document.getElementById('spUpDuration') || {}).value || '0') || null;

    if (!standortId) { _showToast('Bitte Standort wählen.', 'warning'); return; }
    if (!callDate)   { _showToast('Bitte Datum auswählen.', 'warning'); return; }

    var transcriptText = '';

    if (SP.uploadMode === 'audio') {
        var audioInput = document.getElementById('spAudioInput');
        if (!audioInput || !audioInput.files[0]) { _showToast('Bitte Audio-Datei wählen.', 'warning'); return; }
        var file = audioInput.files[0];
        if (file.size > 100 * 1024 * 1024) { _showToast('Datei zu groß (max. 100 MB).', 'error'); return; }

        SP.processing = true;
        spRenderUpload();
        _showToast('⏳ Audio wird transkribiert…', 'info');

        // Upload to Supabase Storage first
        var sb = _sb();
        var user = _sbUser();
        if (!sb || !user) { SP.processing = false; spRenderUpload(); _showToast('Nicht eingeloggt.', 'error'); return; }

        var fileName = 'spiritus/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        var uploadRes = await sb.storage.from('documents').upload(fileName, file, { contentType: file.type });
        if (uploadRes.error) {
            SP.processing = false; spRenderUpload();
            _showToast('Upload fehlgeschlagen: ' + uploadRes.error.message, 'error');
            return;
        }

        // Transcribe via Edge Function
        try {
            var resp = await fetch('/api/spiritus-transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ((await sb.auth.getSession()).data.session || {}).access_token },
                body: JSON.stringify({ filePath: fileName, standortId: standortId, callDate: callDate, callType: callType, durationMin: durationMin })
            });
            var result = await resp.json();
            if (!resp.ok) throw new Error(result.error || 'Transkription fehlgeschlagen');
            transcriptText = result.transcript || '';
        } catch(e) {
            SP.processing = false; spRenderUpload();
            _showToast('Transkription fehlgeschlagen: ' + e.message, 'error');
            return;
        }
    } else {
        transcriptText = (document.getElementById('spTranscriptText') || {}).value || '';
        if (!transcriptText.trim() || transcriptText.length < 50) {
            _showToast('Bitte Transkript einfügen (min. 50 Zeichen).', 'warning'); return;
        }
        SP.processing = true;
        spRenderUpload();
    }

    // Get standort name for display
    var standortSel = document.getElementById('spUpStandort');
    var standortName = standortSel ? (standortSel.options[standortSel.selectedIndex] || {}).text || standortId : standortId;

    _showToast('🤖 KI analysiert den Call…', 'info');

    // Analyse via Claude Edge Function
    try {
        var sb2 = _sb();
        var sess = await sb2.auth.getSession();
        var token = (sess.data.session || {}).access_token;

        var analyzeResp = await fetch('https://rlzkiuxmnouyqxinxchw.supabase.co/functions/v1/spiritus-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
                transcript: transcriptText,
                standortId: standortId,
                standortName: standortName,
                callDate: callDate,
                callType: callType,
                durationMin: durationMin
            })
        });

        var analyzeResult = await analyzeResp.json();
        if (!analyzeResp.ok) throw new Error(analyzeResult.error || 'Analyse fehlgeschlagen');

        SP.processing = false;
        _showToast('✅ Call erfolgreich analysiert!', 'success');

        // Reload transcripts and go to timeline
        loadSpTranscripts();
        spTab('timeline');

    } catch(e) {
        SP.processing = false;
        spRenderUpload();
        _showToast('Analyse fehlgeschlagen: ' + e.message, 'error');
    }
}

// ─── Detail Modal ────────────────────────────────────────────────────────────
export function spOpenDetail(id) {
    var t = SP.transcripts.find(function(t) { return t.id === id; });
    if (!t) return;

    var extr = t.spiritus_extractions || [];
    var problems   = extr.filter(function(e) { return e.kategorie === 'problem'; });
    var massnahmen = extr.filter(function(e) { return e.kategorie === 'massnahme'; });
    var sentiment  = extr.find(function(e)   { return e.kategorie === 'sentiment'; });

    var html = '<div id="spDetailOverlay" onclick="spCloseDetail()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;">';
    html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg,#fff);border-radius:16px;padding:24px;width:620px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';

    // Header
    html += '<div class="flex items-start justify-between mb-4">';
    html += '<div>';
    html += '<h2 class="text-lg font-bold text-gray-900">' + _escH(t.standort_name || '–') + '</h2>';
    html += '<p class="text-sm text-gray-500">' + spFmt(t.call_date) + (t.call_type ? ' · ' + _escH(t.call_type) : '') + (t.duration_min ? ' · ' + t.duration_min + ' Min' : '') + '</p>';
    html += '</div>';
    html += '<button onclick="spCloseDetail()" class="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>';
    html += '</div>';

    // Status + Sentiment
    html += '<div class="flex items-center gap-3 mb-4">';
    html += spStatusBadge(t.status);
    if (t.sentiment_level) {
        html += '<span class="text-sm px-3 py-1 rounded-full font-medium ' + spSentimentColor(t.sentiment_level) + '">' + spSentimentIcon(t.sentiment_level) + ' ' + t.sentiment_level + '</span>';
    }
    html += '</div>';

    // Summary
    if (t.summary) {
        html += '<div class="bg-gray-50 rounded-xl p-4 mb-4">';
        html += '<h4 class="text-xs font-bold text-gray-600 mb-1">📋 ZUSAMMENFASSUNG</h4>';
        html += '<p class="text-sm text-gray-700">' + _escH(t.summary) + '</p>';
        html += '</div>';
    }

    // Sentiment reason
    if (sentiment && sentiment.content) {
        html += '<div class="bg-blue-50 rounded-xl p-4 mb-4">';
        html += '<h4 class="text-xs font-bold text-blue-700 mb-1">💬 STIMMUNGS-BEGRÜNDUNG</h4>';
        html += '<p class="text-sm text-blue-800">' + _escH(sentiment.content) + '</p>';
        html += '</div>';
    }

    // Problems
    if (problems.length) {
        html += '<div class="mb-4">';
        html += '<h4 class="text-xs font-bold text-gray-600 mb-2">🔴 ERKANNTE PROBLEME (' + problems.length + ')</h4>';
        html += '<div class="space-y-2">';
        problems.forEach(function(e) {
            html += '<div class="flex items-start gap-2 p-3 bg-red-50 rounded-lg">';
            html += '<span class="text-red-400 mt-0.5 flex-shrink-0">•</span>';
            html += '<div class="flex-1"><p class="text-sm text-gray-800">' + _escH(e.content) + '</p></div>';
            if (!e.approved && t.status === 'review') {
                html += '<button onclick="spApproveExtraction(\'' + e.id + '\')" class="text-xs bg-green-500 text-white px-2 py-0.5 rounded hover:bg-green-600 flex-shrink-0">✓</button>';
            }
            html += '</div>';
        });
        html += '</div></div>';
    }

    // Maßnahmen
    if (massnahmen.length) {
        html += '<div class="mb-4">';
        html += '<h4 class="text-xs font-bold text-gray-600 mb-2">✅ EMPFOHLENE MAẞNAHMEN (' + massnahmen.length + ')</h4>';
        html += '<div class="space-y-2">';
        massnahmen.forEach(function(e) {
            html += '<div class="flex items-start gap-2 p-3 bg-green-50 rounded-lg">';
            html += '<span class="text-green-500 mt-0.5 flex-shrink-0">✓</span>';
            html += '<div class="flex-1"><p class="text-sm text-gray-800">' + _escH(e.content) + '</p></div>';
            if (!e.approved && t.status === 'review') {
                html += '<button onclick="spApproveExtraction(\'' + e.id + '\')" class="text-xs bg-green-500 text-white px-2 py-0.5 rounded hover:bg-green-600 flex-shrink-0">✓</button>';
            }
            html += '</div>';
        });
        html += '</div></div>';
    }

    // Review actions
    if (t.status === 'review') {
        html += '<div class="flex gap-3 mt-5 pt-4 border-t border-gray-100">';
        html += '<button onclick="spApproveAll(\'' + t.id + '\')" class="flex-1 py-2 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition">✅ Alle genehmigen & in KB übernehmen</button>';
        html += '<button onclick="spRejectTranscript(\'' + t.id + '\')" class="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-200 transition">Ablehnen</button>';
        html += '</div>';
    }

    html += '</div></div>';

    var existing = document.getElementById('spDetailOverlay');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', html);
}

export function spCloseDetail() {
    var el = document.getElementById('spDetailOverlay');
    if (el) el.remove();
}

export function spOpenReview(id) {
    spOpenDetail(id);
}

// ─── Approve / Reject ────────────────────────────────────────────────────────
export async function spApproveAll(transcriptId) {
    var t = SP.transcripts.find(function(x) { return x.id === transcriptId; });
    if (!t) return;

    var sb = _sb();
    if (!sb) return;

    // Mark all extractions as approved
    var extr = (t.spiritus_extractions || []).filter(function(e) { return !e.approved; });
    for (var i = 0; i < extr.length; i++) {
        await sb.from('spiritus_extractions').update({ approved: true }).eq('id', extr[i].id);
        extr[i].approved = true;
    }

    // Update transcript status
    await sb.from('spiritus_transcripts').update({ status: 'verarbeitet' }).eq('id', transcriptId);
    if (t) t.status = 'verarbeitet';
    window.logAudit && window.logAudit('spiritus_freigegeben', 'spiritus', { transcript_id: transcriptId });

    _showToast('✅ Erkenntnisse in Wissensbasis übernommen!', 'success');
    spCloseDetail();
    spRenderAll();
}

export async function spApproveExtraction(extractionId) {
    var sb = _sb();
    if (!sb) return;
    await sb.from('spiritus_extractions').update({ approved: true }).eq('id', extractionId);

    // Update local state
    SP.transcripts.forEach(function(t) {
        (t.spiritus_extractions || []).forEach(function(e) {
            if (e.id === extractionId) e.approved = true;
        });
    });
    _showToast('Erkenntnis genehmigt.', 'success');
    spRenderAll();
}

export async function spRejectTranscript(transcriptId) {
    var sb = _sb();
    if (!sb) return;
    await sb.from('spiritus_transcripts').update({ status: 'abgelehnt' }).eq('id', transcriptId);
    var t = SP.transcripts.find(function(x) { return x.id === transcriptId; });
    if (t) t.status = 'abgelehnt';
    window.logAudit && window.logAudit('spiritus_abgelehnt', 'spiritus', { transcript_id: transcriptId });
    _showToast('Call abgelehnt.', 'info');
    spCloseDetail();
    spRenderAll();
}

// ─── window exports ──────────────────────────────────────────────────────────
window.initSpiritus      = initSpiritus;
window.spTab             = spTab;
window.spSetMode         = spSetMode;
window.spSubmit          = spSubmit;
window.spFileSelected    = spFileSelected;
window.spDragOver        = spDragOver;
window.spDragLeave       = spDragLeave;
window.spDrop            = spDrop;
window.spApplyFilter     = spApplyFilter;
window.spOpenDetail      = spOpenDetail;
window.spCloseDetail     = spCloseDetail;
window.spOpenReview      = spOpenReview;
window.spApproveAll      = spApproveAll;
window.spApproveExtraction = spApproveExtraction;
window.spRejectTranscript= spRejectTranscript;
