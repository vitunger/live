// ============================================================
// SPIRITUS – Call Intelligence & Protokoll
// vit:bikes Partner Portal
// Zeilen: ~600
// ============================================================

const SPIRITUS_VERSION = '1.0.0';

// ─── State ──────────────────────────────────────────────────
var SP = {
    transcripts: [],
    filter: { location: '', type: '' },
    analyzing: false
};

// ─── Render ─────────────────────────────────────────────────
window.renderSpiritus = function() {
    var el = document.getElementById('spiritusView');
    if (!el) return;
    el.innerHTML = `
    <div class="p-4 max-w-5xl mx-auto">

      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
        <div>
          <h1 class="text-xl font-bold text-gray-900 flex items-center gap-2">
            🎙️ <span>Spiritus</span>
            <span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">BETA</span>
          </h1>
          <p class="text-sm text-gray-500 mt-0.5">Call-Protokolle hochladen · KI extrahiert Erkenntnisse · Netzwerk lernt</p>
        </div>
        <button onclick="spOpenUploadModal()" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600 flex items-center gap-2 shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Call hochladen
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5" id="spStats">
        <div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-vit-orange" id="spStatTotal">–</div><div class="text-xs text-gray-500">Calls gesamt</div></div>
        <div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-blue-600" id="spStatMonth">–</div><div class="text-xs text-gray-500">Dieser Monat</div></div>
        <div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-amber-500" id="spStatPending">–</div><div class="text-xs text-gray-500">In Analyse</div></div>
        <div class="vit-card p-4 text-center"><div class="text-2xl font-bold text-green-600" id="spStatKB">–</div><div class="text-xs text-gray-500">KB-Einträge erzeugt</div></div>
      </div>

      <!-- Filter -->
      <div class="vit-card p-3 mb-4 flex flex-wrap gap-3 items-center">
        <select id="spFilterLocation" onchange="spApplyFilter()" class="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
          <option value="">Alle Standorte</option>
        </select>
        <select id="spFilterType" onchange="spApplyFilter()" class="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
          <option value="">Alle Typen</option>
          <option value="beratung">Beratungscall</option>
          <option value="review">Performance Review</option>
          <option value="onboarding">Onboarding</option>
          <option value="support">Support</option>
          <option value="strategie">Strategie</option>
        </select>
        <div class="ml-auto text-xs text-gray-400" id="spFilterInfo"></div>
      </div>

      <!-- Liste -->
      <div id="spList" class="space-y-3"></div>

    </div>

    <!-- Upload Modal -->
    <div id="spUploadModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" style="display:none!important;">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 class="text-base font-bold text-gray-800">🎙️ Neuen Call hochladen</h2>
          <button onclick="spCloseUploadModal()" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div class="p-5 space-y-4">

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Standort *</label>
              <select id="spLocation" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Standort wählen...</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Call-Datum *</label>
              <input type="date" id="spCallDate" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Call-Typ</label>
            <select id="spCallType" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="beratung">Beratungscall</option>
              <option value="review">Performance Review</option>
              <option value="onboarding">Onboarding</option>
              <option value="support">Support</option>
              <option value="strategie">Strategie</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Gesprächspartner (optional)</label>
            <input type="text" id="spContact" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="z.B. Max Müller (Inhaber)">
          </div>

          <!-- Input Mode Toggle -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-2">Protokoll-Quelle *</label>
            <div class="flex gap-2 mb-3">
              <button onclick="spSetInputMode('text')" id="spModeText" class="flex-1 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-vit-orange transition">✏️ Text / Transkript</button>
              <button onclick="spSetInputMode('file')" id="spModeFile" class="flex-1 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-vit-orange transition">📄 Datei Upload</button>
            </div>

            <div id="spInputText">
              <textarea id="spTranscriptText" rows="6" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" placeholder="Protokoll oder Transkript hier einfügen (mind. 100 Zeichen für KI-Analyse)..."></textarea>
            </div>

            <div id="spInputFile" style="display:none;">
              <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-vit-orange transition cursor-pointer" onclick="document.getElementById('spFileInput').click()">
                <div class="text-2xl mb-1">📄</div>
                <div class="text-sm text-gray-500">TXT oder DOCX hochladen</div>
                <div class="text-xs text-gray-400 mt-1">Klicken zum Auswählen</div>
              </div>
              <input type="file" id="spFileInput" accept=".txt,.docx,.doc" class="hidden" onchange="spHandleFile(this)">
              <div id="spFileName" class="text-xs text-gray-500 mt-1 text-center"></div>
            </div>
          </div>

          <!-- KI-Analyse Hinweis -->
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
            <strong>🤖 KI-Analyse:</strong> Nach dem Speichern extrahiert Claude automatisch Probleme, Maßnahmen und Stimmung. Erkenntnisse mit hoher Konfidenz (≥85%) fließen direkt in die Wissensbasis.
          </div>

          <button onclick="spSaveCall()" class="w-full py-2.5 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600">
            💾 Speichern & Analysieren
          </button>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div id="spDetailModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" style="display:none!important;">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 class="text-base font-bold text-gray-800" id="spDetailTitle">Call Details</h2>
          <button onclick="spCloseDetailModal()" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div id="spDetailContent" class="p-5"></div>
      </div>
    </div>
    `;

    spLoadData();
};

// ─── Input Mode ─────────────────────────────────────────────
window.spSetInputMode = function(mode) {
    var textBtn = document.getElementById('spModeText');
    var fileBtn = document.getElementById('spModeFile');
    var textArea = document.getElementById('spInputText');
    var fileArea = document.getElementById('spInputFile');
    if (!textBtn) return;

    if (mode === 'text') {
        textBtn.className = 'flex-1 py-2 text-xs rounded-lg border border-vit-orange bg-orange-50 text-vit-orange font-medium';
        fileBtn.className = 'flex-1 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-vit-orange transition';
        if (textArea) textArea.style.display = '';
        if (fileArea) fileArea.style.display = 'none';
    } else {
        fileBtn.className = 'flex-1 py-2 text-xs rounded-lg border border-vit-orange bg-orange-50 text-vit-orange font-medium';
        textBtn.className = 'flex-1 py-2 text-xs rounded-lg border border-gray-200 text-gray-600 hover:border-vit-orange transition';
        if (fileArea) fileArea.style.display = '';
        if (textArea) textArea.style.display = 'none';
    }
};

window.spHandleFile = function(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    var nameEl = document.getElementById('spFileName');
    if (nameEl) nameEl.textContent = '📄 ' + file.name + ' (' + Math.round(file.size / 1024) + ' KB)';

    if (file.name.endsWith('.txt')) {
        var reader = new FileReader();
        reader.onload = function(e) {
            SP._fileContent = e.target.result;
        };
        reader.readAsText(file);
    } else {
        // DOCX: hint only, would need mammoth in full impl
        SP._fileContent = null;
        SP._fileName = file.name;
        if (nameEl) nameEl.textContent += ' – DOCX wird als Referenz gespeichert';
    }
};

// ─── Load Data ───────────────────────────────────────────────
function spLoadData() {
    // Try Supabase first
    if (window.sb) {
        window.sb.from('spiritus_calls')
            .select('*, spiritus_extractions(*)')
            .order('call_date', { ascending: false })
            .limit(50)
            .then(function(res) {
                if (res.data) {
                    SP.transcripts = res.data;
                } else {
                    SP.transcripts = spDemoData();
                }
                spRefreshUI();
                spPopulateLocations();
            })
            .catch(function() {
                SP.transcripts = spDemoData();
                spRefreshUI();
                spPopulateLocations();
            });
    } else {
        SP.transcripts = spDemoData();
        spRefreshUI();
        spPopulateLocations();
    }
}

function spPopulateLocations() {
    var selects = ['spLocation', 'spFilterLocation'];
    if (!window.sb) return;
    window.sb.from('standorte').select('id, name').order('name').then(function(res) {
        if (!res.data) return;
        selects.forEach(function(id) {
            var el = document.getElementById(id);
            if (!el) return;
            var isFilter = id === 'spFilterLocation';
            var html = isFilter ? '<option value="">Alle Standorte</option>' : '<option value="">Standort wählen...</option>';
            res.data.forEach(function(s) {
                html += '<option value="' + s.id + '">' + s.name + '</option>';
            });
            el.innerHTML = html;
        });
    });
}

// ─── Refresh UI ──────────────────────────────────────────────
function spRefreshUI() {
    spUpdateStats();
    spRenderList();
    spUpdateFilterInfo();
}

function spUpdateStats() {
    var total = SP.transcripts.length;
    var now = new Date();
    var thisMonth = SP.transcripts.filter(function(t) {
        var d = new Date(t.call_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    var pending = SP.transcripts.filter(function(t) { return t.status === 'analyzing'; }).length;
    var kbCount = SP.transcripts.reduce(function(acc, t) {
        return acc + ((t.spiritus_extractions || []).filter(function(e) { return e.approved; }).length);
    }, 0);

    var el;
    if ((el = document.getElementById('spStatTotal'))) el.textContent = total;
    if ((el = document.getElementById('spStatMonth'))) el.textContent = thisMonth;
    if ((el = document.getElementById('spStatPending'))) el.textContent = pending;
    if ((el = document.getElementById('spStatKB'))) el.textContent = kbCount;
}

function spApplyFilter() {
    var loc = document.getElementById('spFilterLocation');
    var typ = document.getElementById('spFilterType');
    SP.filter.location = loc ? loc.value : '';
    SP.filter.type = typ ? typ.value : '';
    spRenderList();
    spUpdateFilterInfo();
}

function spUpdateFilterInfo() {
    var filtered = spFilteredTranscripts();
    var el = document.getElementById('spFilterInfo');
    if (el) el.textContent = filtered.length + ' von ' + SP.transcripts.length + ' Calls';
}

function spFilteredTranscripts() {
    return SP.transcripts.filter(function(t) {
        if (SP.filter.location && t.standort_id !== SP.filter.location && t.standort_name !== SP.filter.location) return false;
        if (SP.filter.type && t.call_type !== SP.filter.type) return false;
        return true;
    });
}

function spRenderList() {
    var el = document.getElementById('spList');
    if (!el) return;
    var items = spFilteredTranscripts();

    if (!items.length) {
        el.innerHTML = '<div class="vit-card p-8 text-center text-gray-400"><div class="text-3xl mb-2">🎙️</div><p class="text-sm">Noch keine Calls. Ersten Call hochladen!</p></div>';
        return;
    }

    el.innerHTML = items.map(function(t) {
        var extractions = t.spiritus_extractions || t.extractions || [];
        var problems = extractions.filter(function(e) { return e.type === 'problem'; });
        var actions = extractions.filter(function(e) { return e.type === 'massnahme'; });
        var sentiment = extractions.find(function(e) { return e.type === 'sentiment'; });

        var sentimentIcon = '😐';
        var sentimentClass = 'text-gray-500';
        if (sentiment) {
            if (sentiment.content === 'positiv' || (sentiment.data && sentiment.data.level === 'positiv')) {
                sentimentIcon = '😊'; sentimentClass = 'text-green-600';
            } else if (sentiment.content === 'angespannt' || (sentiment.data && sentiment.data.level === 'angespannt')) {
                sentimentIcon = '😟'; sentimentClass = 'text-red-500';
            }
        }

        var statusBadge = '';
        if (t.status === 'analyzing') {
            statusBadge = '<span class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full animate-pulse">⏳ Analyse...</span>';
        } else if (t.status === 'done' || t.status === 'analyzed') {
            statusBadge = '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Analysiert</span>';
        } else if (t.status === 'error') {
            statusBadge = '<span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">✗ Fehler</span>';
        } else {
            statusBadge = '<span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Entwurf</span>';
        }

        var typeLabel = { beratung: 'Beratung', review: 'Review', onboarding: 'Onboarding', support: 'Support', strategie: 'Strategie' };

        return '<div class="vit-card p-4 hover:shadow-md transition cursor-pointer" onclick="spOpenDetail(\'' + t.id + '\')">' +
            '<div class="flex items-start justify-between gap-3 mb-2">' +
              '<div>' +
                '<div class="font-semibold text-gray-800 text-sm">' + (t.standort_name || t.location_name || 'Standort') + '</div>' +
                '<div class="text-xs text-gray-400 mt-0.5">' + spFormatDate(t.call_date) + ' · ' + (typeLabel[t.call_type] || t.call_type || 'Call') + (t.contact ? ' · ' + t.contact : '') + '</div>' +
              '</div>' +
              '<div class="flex items-center gap-2 shrink-0">' +
                statusBadge +
                '<span class="text-lg ' + sentimentClass + '">' + sentimentIcon + '</span>' +
              '</div>' +
            '</div>' +
            (t.summary ? '<p class="text-xs text-gray-500 mb-2 line-clamp-2">' + (t.summary || '') + '</p>' : '') +
            '<div class="flex gap-3 text-xs text-gray-400">' +
              (problems.length ? '<span class="text-red-500">⚠️ ' + problems.length + ' Problem' + (problems.length !== 1 ? 'e' : '') + '</span>' : '') +
              (actions.length ? '<span class="text-blue-500">✓ ' + actions.length + ' Maßnahme' + (actions.length !== 1 ? 'n' : '') + '</span>' : '') +
              (!extractions.length && t.status !== 'analyzing' ? '<span>Noch keine Extraktion</span>' : '') +
            '</div>' +
        '</div>';
    }).join('');
}

// ─── Detail Modal ────────────────────────────────────────────
window.spOpenDetail = function(id) {
    var t = SP.transcripts.find(function(x) { return x.id == id; });
    if (!t) return;
    var modal = document.getElementById('spDetailModal');
    var title = document.getElementById('spDetailTitle');
    var content = document.getElementById('spDetailContent');
    if (!modal || !content) return;

    var extractions = t.spiritus_extractions || t.extractions || [];
    var problems = extractions.filter(function(e) { return e.type === 'problem'; });
    var actions = extractions.filter(function(e) { return e.type === 'massnahme'; });
    var sentiment = extractions.find(function(e) { return e.type === 'sentiment'; });

    if (title) title.textContent = '🎙️ ' + (t.standort_name || t.location_name || 'Standort') + ' · ' + spFormatDate(t.call_date);

    var html = '';

    // Meta
    html += '<div class="flex flex-wrap gap-2 mb-4 text-xs">' +
        '<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded">📅 ' + spFormatDate(t.call_date) + '</span>' +
        '<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded">📋 ' + (t.call_type || 'Call') + '</span>' +
        (t.contact ? '<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded">👤 ' + t.contact + '</span>' : '') +
    '</div>';

    // Summary
    if (t.summary) {
        html += '<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">' +
            '<strong>Zusammenfassung:</strong> ' + t.summary + '</div>';
    }

    // Sentiment
    if (sentiment) {
        var data = sentiment.data || {};
        var level = data.level || sentiment.content || 'neutral';
        var icons = { positiv: '😊', neutral: '😐', angespannt: '😟' };
        var colors = { positiv: 'green', neutral: 'gray', angespannt: 'red' };
        var c = colors[level] || 'gray';
        html += '<div class="bg-' + c + '-50 border border-' + c + '-200 rounded-lg p-3 mb-4">' +
            '<div class="text-sm font-semibold text-' + c + '-700 mb-1">' + (icons[level] || '😐') + ' Stimmung: ' + level.charAt(0).toUpperCase() + level.slice(1) + '</div>' +
            (data.begruendung ? '<div class="text-xs text-' + c + '-600">' + data.begruendung + '</div>' : '') +
        '</div>';
    }

    // Probleme
    if (problems.length) {
        html += '<div class="mb-4"><h3 class="text-sm font-semibold text-red-600 mb-2">⚠️ Probleme & Herausforderungen</h3><div class="space-y-2">';
        problems.forEach(function(p) {
            var conf = Math.round((p.confidence || 0) * 100);
            html += '<div class="flex items-start gap-3 p-3 bg-red-50 rounded-lg">' +
                '<div class="flex-1 text-sm text-gray-700">' + p.content + '</div>' +
                '<div class="text-xs text-gray-400 shrink-0">' + conf + '%</div>' +
            '</div>';
        });
        html += '</div></div>';
    }

    // Maßnahmen
    if (actions.length) {
        html += '<div class="mb-4"><h3 class="text-sm font-semibold text-blue-600 mb-2">✅ Maßnahmen & Empfehlungen</h3><div class="space-y-2">';
        actions.forEach(function(a) {
            var conf = Math.round((a.confidence || 0) * 100);
            var kbBadge = a.approved ? '<span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">In KB</span>' : '';
            html += '<div class="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">' +
                '<div class="flex-1 text-sm text-gray-700">' + a.content + ' ' + kbBadge + '</div>' +
                '<div class="text-xs text-gray-400 shrink-0">' + conf + '%</div>' +
            '</div>';
        });
        html += '</div></div>';
    }

    // Kein Ergebnis
    if (!extractions.length) {
        if (t.status === 'analyzing') {
            html += '<div class="text-center py-6 text-amber-600"><div class="text-3xl mb-2 animate-pulse">⏳</div><div class="text-sm">KI-Analyse läuft...</div></div>';
        } else {
            html += '<div class="text-center py-6 text-gray-400"><div class="text-3xl mb-2">🤖</div><div class="text-sm">Noch keine Extraktion. Analyse starten?</div>' +
                '<button onclick="spRunAnalysis(\'' + t.id + '\')" class="mt-3 px-4 py-2 bg-vit-orange text-white rounded-lg text-sm">Jetzt analysieren</button></div>';
        }
    }

    // Transkript (collapsed)
    if (t.transcript_text) {
        html += '<details class="mt-4"><summary class="text-xs text-gray-400 cursor-pointer hover:text-gray-600">📄 Originaltranskript anzeigen</summary>' +
            '<div class="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 whitespace-pre-wrap max-h-40 overflow-y-auto">' + t.transcript_text.substring(0, 1000) + (t.transcript_text.length > 1000 ? '...' : '') + '</div>' +
        '</details>';
    }

    modal.style.cssText = '';
    modal.style.display = 'flex';
    content.innerHTML = html;
};

window.spCloseDetailModal = function() {
    var modal = document.getElementById('spDetailModal');
    if (modal) modal.style.cssText = 'display:none!important;';
};

// ─── Upload Modal ────────────────────────────────────────────
window.spOpenUploadModal = function() {
    var modal = document.getElementById('spUploadModal');
    if (modal) { modal.style.cssText = ''; modal.style.display = 'flex'; }
    spSetInputMode('text');
    // Datum vorbelegen
    var d = document.getElementById('spCallDate');
    if (d) d.value = new Date().toISOString().split('T')[0];
};

window.spCloseUploadModal = function() {
    var modal = document.getElementById('spUploadModal');
    if (modal) modal.style.cssText = 'display:none!important;';
    SP._fileContent = null;
};

// ─── Save & Analyze ──────────────────────────────────────────
window.spSaveCall = function() {
    var loc = document.getElementById('spLocation');
    var date = document.getElementById('spCallDate');
    var type = document.getElementById('spCallType');
    var contact = document.getElementById('spContact');
    var textArea = document.getElementById('spTranscriptText');
    var fileInput = document.getElementById('spFileInput');

    var locationId = loc ? loc.value : '';
    var locationName = loc ? (loc.options[loc.selectedIndex] || {}).text : '';
    var callDate = date ? date.value : new Date().toISOString().split('T')[0];
    var callType = type ? type.value : 'beratung';
    var contactVal = contact ? contact.value.trim() : '';

    // Get transcript text
    var transcriptText = '';
    var textVisible = document.getElementById('spInputText');
    var fileVisible = document.getElementById('spInputFile');
    if (textVisible && textVisible.style.display !== 'none') {
        transcriptText = textArea ? textArea.value.trim() : '';
    } else {
        transcriptText = SP._fileContent || '';
    }

    if (!locationId) { window.showToast('Bitte Standort wählen', 'error'); return; }
    if (!transcriptText || transcriptText.length < 50) { window.showToast('Bitte Protokoll eingeben (mind. 50 Zeichen)', 'error'); return; }

    var callId = 'sp_' + Date.now();
    var newCall = {
        id: callId,
        standort_id: locationId,
        standort_name: locationName,
        call_date: callDate,
        call_type: callType,
        contact: contactVal,
        transcript_text: transcriptText,
        status: 'analyzing',
        created_at: new Date().toISOString(),
        spiritus_extractions: []
    };

    SP.transcripts.unshift(newCall);
    spCloseUploadModal();
    spRefreshUI();
    window.showToast('Call gespeichert – KI-Analyse gestartet...', 'success');

    // Supabase speichern
    if (window.sb) {
        window.sb.from('spiritus_calls').insert({
            standort_id: locationId,
            call_date: callDate,
            call_type: callType,
            contact: contactVal,
            transcript_text: transcriptText,
            status: 'analyzing',
            created_by: window.sbUser ? window.sbUser.id : null
        }).then(function(res) {
            if (res.data && res.data[0]) {
                newCall.id = res.data[0].id;
            }
            spRunAnalysisInternal(newCall);
        });
    } else {
        setTimeout(function() { spRunAnalysisInternal(newCall); }, 500);
    }
};

// ─── KI Analyse ─────────────────────────────────────────────
window.spRunAnalysis = function(id) {
    var t = SP.transcripts.find(function(x) { return x.id == id; });
    if (!t) return;
    t.status = 'analyzing';
    spRefreshUI();
    spRunAnalysisInternal(t);
};

function spRunAnalysisInternal(callObj) {
    if (!callObj.transcript_text) {
        callObj.status = 'error';
        spRefreshUI();
        return;
    }

    var prompt = 'Du analysierst ein Call-Protokoll eines Gesprächs zwischen dem HQ von vit:bikes (einem Fahrrad-Franchise-Netzwerk) und einem Franchise-Standort.\n\n' +
        'Extrahiere GENAU diese Kategorien:\n\n' +
        '1. PROBLEME: Konkrete Herausforderungen, Hürden oder Beschwerden des Standorts\n' +
        '2. MASSNAHMEN: Konkrete Empfehlungen oder Lösungsansätze aus dem Gespräch\n' +
        '3. SENTIMENT: Gesamtstimmung des Standorts (positiv/neutral/angespannt)\n\n' +
        'Für jede Erkenntnis: Bewerte confidence 0.0–1.0 (≥0.85 = explizit genannt, 0.6–0.84 = sinngemäß, <0.6 = Interpretation)\n\n' +
        'ANTWORT NUR ALS JSON (kein Markdown, kein Preamble):\n' +
        '{"probleme":[{"content":"...","confidence":0.0}],"massnahmen":[{"content":"...","confidence":0.0}],"sentiment":{"level":"positiv|neutral|angespannt","confidence":0.0,"begruendung":"..."},"summary":"..."}\n\n' +
        'TRANSKRIPT:\n' + callObj.transcript_text.substring(0, 4000);

    fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        var text = '';
        if (data.content && data.content[0]) text = data.content[0].text || '';
        try {
            var clean = text.replace(/```json|```/g, '').trim();
            var parsed = JSON.parse(clean);
            spProcessExtractions(callObj, parsed);
        } catch (e) {
            callObj.status = 'error';
            spRefreshUI();
        }
    })
    .catch(function() {
        callObj.status = 'error';
        spRefreshUI();
    });
}

function spProcessExtractions(callObj, parsed) {
    var extractions = [];
    var kbEntries = [];

    // Probleme
    (parsed.probleme || []).forEach(function(p) {
        extractions.push({ type: 'problem', content: p.content, confidence: p.confidence || 0.7, approved: false });
    });

    // Maßnahmen
    (parsed.massnahmen || []).forEach(function(m) {
        var approved = (m.confidence || 0) >= 0.85;
        extractions.push({ type: 'massnahme', content: m.content, confidence: m.confidence || 0.7, approved: approved });
        if (approved) kbEntries.push(m.content);
    });

    // Sentiment
    if (parsed.sentiment) {
        extractions.push({ type: 'sentiment', content: parsed.sentiment.level, confidence: parsed.sentiment.confidence || 0.8, data: parsed.sentiment, approved: false });
    }

    callObj.spiritus_extractions = extractions;
    callObj.summary = parsed.summary || '';
    callObj.status = 'done';

    spRefreshUI();
    window.showToast('Analyse abgeschlossen – ' + extractions.length + ' Erkenntnisse extrahiert', 'success');

    // In Supabase persistieren
    if (window.sb && callObj.id && !String(callObj.id).startsWith('sp_')) {
        window.sb.from('spiritus_calls').update({ status: 'done', summary: callObj.summary })
            .eq('id', callObj.id).then(function() {});

        extractions.forEach(function(ext) {
            window.sb.from('spiritus_extractions').insert({
                call_id: callObj.id,
                type: ext.type,
                content: ext.content,
                confidence: ext.confidence,
                approved: ext.approved
            }).then(function() {});
        });

        // KB-Einträge mit hoher Konfidenz
        kbEntries.forEach(function(entry) {
            window.sb.from('spiritus_kb').insert({
                source_call_id: callObj.id,
                standort_id: callObj.standort_id,
                content: entry,
                category: 'massnahme',
                auto_approved: true
            }).then(function() {});
        });
    }
}

// ─── Demo Daten ──────────────────────────────────────────────
function spDemoData() {
    return [
        {
            id: 'demo1', standort_name: 'Münster', call_date: '2026-03-01', call_type: 'review',
            contact: 'Thomas Weiser', status: 'done', summary: 'Guter Monat, Verkaufspipeline wächst. Werkstatt-Kapazität bleibt Engpass.',
            spiritus_extractions: [
                { type: 'problem', content: 'Werkstatt ist dauerhaft ausgelastet, Wartezeiten über 2 Wochen', confidence: 0.92, approved: false },
                { type: 'problem', content: 'E-Bike-Beratungskompetenz beim neuen MA noch ausbaufähig', confidence: 0.78, approved: false },
                { type: 'massnahme', content: 'Zweiten Werkstatt-MA einstellen oder Aushilfe für Hochsaison', confidence: 0.88, approved: true },
                { type: 'massnahme', content: 'E-Bike-Schulung über vit:bikes Akademie für neuen MA buchen', confidence: 0.91, approved: true },
                { type: 'sentiment', content: 'positiv', confidence: 0.85, data: { level: 'positiv', begruendung: 'Inhaber ist motiviert, Umsatz wächst, spricht positiv über Netzwerkvorteile' } }
            ]
        },
        {
            id: 'demo2', standort_name: 'Grafrath', call_date: '2026-02-26', call_type: 'beratung',
            contact: 'Klaus Bauer', status: 'done', summary: 'Onboarding läuft, erste BWA hochgeladen. Fragen zur Margenverbesserung.',
            spiritus_extractions: [
                { type: 'problem', content: 'Unsicherheit bei der BWA-Interpretation, weiß nicht was die Zahlen bedeuten', confidence: 0.89, approved: false },
                { type: 'massnahme', content: 'BWA-Erklärung im nächsten Call gemeinsam durchgehen + Screenshare', confidence: 0.86, approved: true },
                { type: 'massnahme', content: 'Einkaufskonditionen für Hauptlieferant optimieren über HQ-Rahmenvertrag', confidence: 0.82, approved: false },
                { type: 'sentiment', content: 'neutral', confidence: 0.80, data: { level: 'neutral', begruendung: 'Noch in der Eingewöhnungsphase, vorsichtig optimistisch' } }
            ]
        },
        {
            id: 'demo3', standort_name: 'Rottweil', call_date: '2026-02-20', call_type: 'support',
            contact: 'Maria Schlager', status: 'done', summary: 'Technisches Problem mit Terminbuchungssystem. Frustration über Ausfallzeit.',
            spiritus_extractions: [
                { type: 'problem', content: 'eTermin-Integration synchronisiert Buchungen nicht zuverlässig', confidence: 0.95, approved: false },
                { type: 'problem', content: 'Kunden beschweren sich über Doppelbuchungen', confidence: 0.88, approved: false },
                { type: 'massnahme', content: 'Webhook-Konfiguration prüfen und neu deployen', confidence: 0.90, approved: true },
                { type: 'sentiment', content: 'angespannt', confidence: 0.87, data: { level: 'angespannt', begruendung: 'Technischer Fehler sorgt für Frust, erwartet schnelle Lösung vom HQ' } }
            ]
        }
    ];
}

// ─── Helpers ─────────────────────────────────────────────────
function spFormatDate(dateStr) {
    if (!dateStr) return '';
    try {
        var d = new Date(dateStr);
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch(e) { return dateStr; }
}

// ─── View Hook ───────────────────────────────────────────────
window.showSpiritus = function() {
    window.renderSpiritus();
};

// Export for router
export { renderSpiritus };
