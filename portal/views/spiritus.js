/**
 * views/spiritus.js – Spiritus v3.0: Call Intelligence & Protokoll
 * 8-Felder-Protokoll, 3 Kontexte (Partner/Lieferant/Akquise),
 * KI-Lernfaktor, Todo-Flow, eigene Notizen.
 * @module views/spiritus
 * Nur fuer HQ sichtbar (is_hq = true)
 */

function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// ─── State ─────────────────────────────────────────────────────────────────
var SP = {
    transcripts: [],
    currentTab: 'uebersicht',
    filterStandort: '',
    filterStatus: '',
    filterKontext: 'alle',
    uploadMode: 'audio',
    uploadKontext: 'partner',
    processing: false,
    kiOriginals: {},
    currentValues: {},
    currentTranscript: null
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function spFmt(date) {
    if (!date) return '\u2013';
    var d = new Date(date);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function spSentimentIcon(level) {
    if (level === 'positiv')    return '\uD83D\uDE0A';
    if (level === 'angespannt') return '\uD83D\uDE24';
    return '\uD83D\uDE10';
}

function spSentimentColor(level) {
    if (level === 'positiv')    return 'text-green-600 bg-green-50';
    if (level === 'angespannt') return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-100';
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

function spKontextBadge(t) {
    var k = t.gespraechs_kontext || 'partner';
    if (k === 'lieferant') {
        return '<span class="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">\uD83D\uDCE6 Lieferant' + (t.lieferant_name ? ' \u00b7 ' + _escH(t.lieferant_name) : '') + '</span>';
    }
    if (k === 'akquise') {
        var info = t.akquise_kontakt_name || '';
        if (t.akquise_kontakt_ort) info += (info ? ', ' : '') + t.akquise_kontakt_ort;
        return '<span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">\uD83C\uDFAF Akquise' + (info ? ' \u00b7 ' + _escH(info) : '') + '</span>';
    }
    return '<span class="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">\uD83E\uDD1D Partner' + (t.standort_name ? ' \u00b7 ' + _escH(t.standort_name) : '') + '</span>';
}

function spEinschaetzungIcon(e) {
    if (e === 'stabil') return '\uD83D\uDE42';
    if (e === 'kritisch') return '\u26A0\uFE0F';
    return '\uD83D\uDE10';
}

function spKategorieLabel(k) {
    var map = {
        'marketing_sichtbarkeit': 'Marketing',
        'verkauf_conversion': 'Verkauf',
        'werkstatt_service': 'Werkstatt',
        'mitarbeiter': 'Mitarbeiter',
        'einkauf_sortiment': 'Einkauf',
        'finanzen_controlling': 'Finanzen',
        'digitalisierung': 'Digital'
    };
    return map[k] || k;
}

// ─── Init ───────────────────────────────────────────────────────────────────
export function initSpiritus() {
    SP.transcripts = [];
    SP.currentTab  = 'uebersicht';
    SP.filterStandort = '';
    SP.filterStatus   = '';
    SP.filterKontext  = 'alle';
    loadSpTranscripts();
    spRenderAll();
}

function loadSpTranscripts() {
    var sb = _sb();
    if (!sb) return;
    sb.from('spiritus_transcripts')
      .select('id, standort_id, standort_name, call_date, call_type, duration_min, status, summary, sentiment_level, thema, gespraechs_kontext, lieferant_name, akquise_kontakt_name, akquise_kontakt_firma, akquise_kontakt_ort, protokoll_anlass, protokoll_situation, protokoll_fokus, protokoll_massnahmen, protokoll_ziel, protokoll_review, protokoll_einschaetzung, protokoll_beobachtung, kategorien, eigene_notizen, created_at, spiritus_extractions(id, kategorie, content, confidence, approved)')
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

// ─── Kontext Filter ─────────────────────────────────────────────────────────
export function spFilterKontext(kontext) {
    SP.filterKontext = kontext;
    document.querySelectorAll('.sp-kontext-btn').forEach(function(btn) {
        if (btn.dataset.kontext === kontext) {
            btn.className = 'sp-kontext-btn px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 cursor-pointer';
        } else {
            btn.className = 'sp-kontext-btn px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 cursor-pointer';
        }
    });
    spRenderAll();
}

function spFilteredTranscripts() {
    return SP.transcripts.filter(function(t) {
        if (SP.filterKontext !== 'alle' && (t.gespraechs_kontext || 'partner') !== SP.filterKontext) return false;
        if (SP.filterStandort && t.standort_id !== SP.filterStandort) return false;
        if (SP.filterStatus && t.status !== SP.filterStatus) return false;
        return true;
    });
}

function spRenderAll() {
    spRenderUebersicht();
    spRenderTimeline();
    spRenderIntelligenz();
    spRenderUpload();
    ['uebersicht','timeline','intelligenz','upload'].forEach(function(t) {
        var el = document.getElementById('spTab_' + t);
        if (el) el.style.display = SP.currentTab === t ? '' : 'none';
    });
}

// ─── Tab: Uebersicht ────────────────────────────────────────────────────────
function spRenderUebersicht() {
    var el = document.getElementById('spTab_uebersicht');
    if (!el) return;

    var filtered = spFilteredTranscripts();
    var total   = filtered.length;
    var pending = filtered.filter(function(t) { return t.status === 'review'; }).length;
    var done    = filtered.filter(function(t) { return t.status === 'verarbeitet'; }).length;

    var pos = 0, neu = 0, ang = 0;
    filtered.forEach(function(t) {
        if (t.sentiment_level === 'positiv')    pos++;
        else if (t.sentiment_level === 'angespannt') ang++;
        else neu++;
    });

    var html = '';
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">';
    html += spStatCard('\uD83C\uDFA4', total, 'Calls gesamt', 'text-orange-600');
    html += spStatCard('\u23F3', pending, 'Warten auf Review', 'text-yellow-600');
    html += spStatCard('\u2705', done, 'Abgeschlossen', 'text-green-600');
    html += spStatCard('\uD83D\uDE24', ang, 'Angespannte Calls', 'text-red-600');
    html += '</div>';

    // Sentiment Chart
    if (total > 0) {
        html += '<div class="vit-card p-4 mb-5">';
        html += '<h3 class="text-sm font-bold text-gray-700 mb-3">\uD83D\uDCCA Stimmungsbild</h3>';
        html += '<div class="space-y-2">';
        html += spSentimentBar('Positiv \uD83D\uDE0A', pos, total, 'bg-green-400');
        html += spSentimentBar('Neutral \uD83D\uDE10', neu, total, 'bg-gray-300');
        html += spSentimentBar('Angespannt \uD83D\uDE24', ang, total, 'bg-red-400');
        html += '</div></div>';
    }

    // Kategorie-Verteilung
    var katCounts = {};
    filtered.forEach(function(t) {
        (t.kategorien || []).forEach(function(k) { katCounts[k] = (katCounts[k] || 0) + 1; });
    });
    var katKeys = Object.keys(katCounts).sort(function(a,b) { return katCounts[b] - katCounts[a]; });
    if (katKeys.length > 0) {
        html += '<div class="vit-card p-4 mb-5">';
        html += '<h3 class="text-sm font-bold text-gray-700 mb-3">\uD83C\uDFF7\uFE0F Themen-Verteilung</h3>';
        html += '<div class="flex flex-wrap gap-2">';
        katKeys.forEach(function(k) {
            html += '<span class="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">' + _escH(spKategorieLabel(k)) + ' <span class="font-bold">' + katCounts[k] + '</span></span>';
        });
        html += '</div></div>';
    }

    // Pending Reviews
    var reviews = filtered.filter(function(t) { return t.status === 'review'; });
    if (reviews.length) {
        html += '<div class="vit-card p-4 mb-5">';
        html += '<h3 class="text-sm font-bold text-gray-700 mb-3">\u23F3 Warten auf deine Freigabe (' + reviews.length + ')</h3>';
        html += '<div class="space-y-2">';
        reviews.slice(0, 5).forEach(function(t) {
            html += '<div class="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">';
            html += '<div class="flex items-center gap-2">';
            html += spKontextBadge(t);
            html += '<span class="font-semibold text-sm text-gray-800">' + _escH(t.thema || t.standort_name || '\u2013') + '</span>';
            html += '<span class="text-xs text-gray-500">' + spFmt(t.call_date) + '</span>';
            html += '</div>';
            html += '<button onclick="spOpenReview(\'' + t.id + '\')" class="text-xs bg-orange-500 text-white px-3 py-1 rounded-full hover:bg-orange-600 transition cursor-pointer">Review \u2192</button>';
            html += '</div>';
        });
        html += '</div></div>';
    }

    // Recent Calls
    var recent = filtered.slice(0, 5);
    html += '<div class="vit-card p-4">';
    html += '<h3 class="text-sm font-bold text-gray-700 mb-3">\uD83D\uDD50 Letzte Calls</h3>';
    if (!recent.length) {
        html += '<p class="text-sm text-gray-400 text-center py-6">Noch keine Calls verarbeitet.</p>';
    } else {
        html += '<div class="space-y-2">';
        recent.forEach(function(t) {
            html += '<div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 cursor-pointer" onclick="spOpenDetail(\'' + t.id + '\')">';
            html += '<div class="flex items-center gap-3">';
            html += '<span class="text-lg">' + spSentimentIcon(t.sentiment_level) + '</span>';
            html += '<div>';
            html += '<div class="font-semibold text-sm text-gray-800">' + _escH(t.thema || t.standort_name || '\u2013') + '</div>';
            html += '<div class="text-xs text-gray-400">' + spFmt(t.call_date) + (t.duration_min ? ' \u00b7 ' + t.duration_min + ' Min' : '') + '</div>';
            html += '</div></div>';
            html += '<div class="flex items-center gap-2">';
            html += spKontextBadge(t);
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
        '<span class="text-xs font-semibold text-gray-700 w-10 text-right">' + count + '</span>' +
        '</div>';
}

// ─── Tab: Timeline ──────────────────────────────────────────────────────────
function spRenderTimeline() {
    var el = document.getElementById('spTab_timeline');
    if (!el) return;

    var html = '<div class="flex flex-wrap gap-3 mb-5">';
    html += '<select id="spFilterStandort" onchange="spApplyFilter()" class="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"><option value="">Alle Standorte</option></select>';
    html += '<select id="spFilterStatus" onchange="spApplyFilter()" class="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">';
    html += '<option value="">Alle Status</option>';
    html += '<option value="verarbeitet">Fertig</option>';
    html += '<option value="review">Review</option>';
    html += '<option value="fehler">Fehler</option>';
    html += '</select>';
    html += '</div>';

    var filtered = spFilteredTranscripts();

    if (!filtered.length) {
        html += '<div class="vit-card p-8 text-center text-gray-400"><div class="text-4xl mb-2">\uD83C\uDFA4</div><p class="text-sm">Noch keine Calls vorhanden.<br>Neuen Call \u00fcber <strong>Upload</strong> erfassen.</p></div>';
    } else {
        html += '<div class="space-y-3">';
        filtered.forEach(function(t) {
            html += '<div class="vit-card p-4 hover:shadow-md transition cursor-pointer" onclick="spOpenDetail(\'' + t.id + '\')">';
            html += '<div class="flex items-start justify-between mb-2">';
            html += '<div class="flex items-center gap-3">';
            html += '<span class="text-2xl">' + spSentimentIcon(t.sentiment_level) + '</span>';
            html += '<div>';
            html += '<div class="font-bold text-gray-900">' + _escH(t.thema || t.standort_name || '\u2013') + '</div>';
            html += '<div class="text-xs text-gray-500">' + spFmt(t.call_date) + (t.call_type ? ' \u00b7 ' + _escH(t.call_type) : '') + (t.duration_min ? ' \u00b7 ' + t.duration_min + ' Min' : '') + '</div>';
            html += '</div></div>';
            html += '<div class="flex items-center gap-2">';
            html += spKontextBadge(t);
            html += spStatusBadge(t.status);
            html += '</div></div>';

            if (t.protokoll_anlass) {
                html += '<p class="text-sm text-gray-600 mb-2 line-clamp-2">' + _escH(t.protokoll_anlass) + '</p>';
            } else if (t.summary) {
                html += '<p class="text-sm text-gray-600 mb-2 line-clamp-2">' + _escH(t.summary) + '</p>';
            }

            // Kategorie tags
            if (t.kategorien && t.kategorien.length) {
                html += '<div class="flex flex-wrap gap-1 mt-1">';
                t.kategorien.forEach(function(k) {
                    html += '<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">' + _escH(spKategorieLabel(k)) + '</span>';
                });
                html += '</div>';
            }

            // Einschaetzung
            if (t.protokoll_einschaetzung) {
                html += '<div class="mt-2 text-xs text-gray-500">' + spEinschaetzungIcon(t.protokoll_einschaetzung) + ' ' + _escH(t.protokoll_einschaetzung) + '</div>';
            }

            html += '</div>';
        });
        html += '</div>';
    }

    el.innerHTML = html;
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

// ─── Tab: Intelligenz ───────────────────────────────────────────────────────
function spRenderIntelligenz() {
    var el = document.getElementById('spTab_intelligenz');
    if (!el) return;

    var allExtr = [];
    spFilteredTranscripts().forEach(function(t) {
        (t.spiritus_extractions || []).forEach(function(e) {
            if (e.approved) allExtr.push(Object.assign({}, e, { standort_name: t.standort_name, call_date: t.call_date }));
        });
    });

    var problems   = allExtr.filter(function(e) { return e.kategorie === 'problem'; });
    var massnahmen = allExtr.filter(function(e) { return e.kategorie === 'massnahme'; });

    var html = '';
    html += '<div class="grid grid-cols-2 gap-4 mb-6">';
    html += '<div class="vit-card p-4"><div class="text-2xl font-bold text-red-600">' + problems.length + '</div><div class="text-xs text-gray-500">Erkannte Probleme</div></div>';
    html += '<div class="vit-card p-4"><div class="text-2xl font-bold text-green-600">' + massnahmen.length + '</div><div class="text-xs text-gray-500">Bew\u00e4hrte Ma\u00dfnahmen</div></div>';
    html += '</div>';

    html += '<div class="vit-card p-4 mb-5">';
    html += '<h3 class="text-sm font-bold text-gray-700 mb-3">\uD83D\uDD34 H\u00e4ufigste Probleme im Netzwerk</h3>';
    if (!problems.length) {
        html += '<p class="text-xs text-gray-400">Noch keine Daten.</p>';
    } else {
        html += '<div class="space-y-2">';
        problems.slice(0, 8).forEach(function(e) {
            html += '<div class="flex items-start gap-3 p-3 bg-red-50 rounded-lg">';
            html += '<span class="text-red-500 mt-0.5">\u2022</span>';
            html += '<div class="flex-1">';
            html += '<p class="text-sm text-gray-800">' + _escH(e.content) + '</p>';
            html += '<p class="text-xs text-gray-400 mt-0.5">' + _escH(e.standort_name || '\u2013') + ' \u00b7 ' + spFmt(e.call_date) + '</p>';
            html += '</div>';
            html += '<span class="text-xs text-gray-400">' + Math.round((e.confidence || 0) * 100) + '%</span>';
            html += '</div>';
        });
        html += '</div>';
    }
    html += '</div>';

    html += '<div class="vit-card p-4">';
    html += '<h3 class="text-sm font-bold text-gray-700 mb-3">\u2705 Bew\u00e4hrte Ma\u00dfnahmen aus dem Netzwerk</h3>';
    if (!massnahmen.length) {
        html += '<p class="text-xs text-gray-400">Noch keine Daten.</p>';
    } else {
        html += '<div class="space-y-2">';
        massnahmen.slice(0, 8).forEach(function(e) {
            html += '<div class="flex items-start gap-3 p-3 bg-green-50 rounded-lg">';
            html += '<span class="text-green-500 mt-0.5">\u2713</span>';
            html += '<div class="flex-1">';
            html += '<p class="text-sm text-gray-800">' + _escH(e.content) + '</p>';
            html += '<p class="text-xs text-gray-400 mt-0.5">' + _escH(e.standort_name || '\u2013') + ' \u00b7 ' + spFmt(e.call_date) + '</p>';
            html += '</div></div>';
        });
        html += '</div>';
    }
    html += '</div>';

    el.innerHTML = html;
}

// ─── Tab: Upload ────────────────────────────────────────────────────────────
function spRenderUpload() {
    var el = document.getElementById('spTab_upload');
    if (!el) return;

    var html = '<div class="max-w-2xl mx-auto">';
    html += '<div class="vit-card p-6">';
    html += '<h3 class="text-base font-bold text-gray-800 mb-4">\uD83C\uDFA4 Neuen Call erfassen</h3>';

    // Kontext-Auswahl
    html += '<div class="mb-4">';
    html += '<label class="text-xs font-semibold text-gray-600 block mb-2">Gespr\u00e4chskontext *</label>';
    html += '<div class="flex gap-2">';
    ['partner', 'lieferant', 'akquise'].forEach(function(k) {
        var icons = { partner: '\uD83E\uDD1D', lieferant: '\uD83D\uDCE6', akquise: '\uD83C\uDFAF' };
        var labels = { partner: 'Partner', lieferant: 'Lieferant', akquise: 'Akquise' };
        var active = SP.uploadKontext === k;
        html += '<button onclick="spSetUploadKontext(\'' + k + '\')" class="flex-1 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ' +
            (active ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + '">' +
            icons[k] + ' ' + labels[k] + '</button>';
    });
    html += '</div></div>';

    // Kontext-spezifische Felder
    if (SP.uploadKontext === 'partner') {
        html += '<div class="grid grid-cols-2 gap-4 mb-4">';
        html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Standort *</label>';
        html += '<select id="spUpStandort" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"><option value="">Standort w\u00e4hlen\u2026</option></select></div>';
        html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Thema</label>';
        html += '<input id="spUpThema" type="text" placeholder="z.B. Monatliches Check-in" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></div>';
        html += '</div>';
    } else if (SP.uploadKontext === 'lieferant') {
        html += '<div class="grid grid-cols-2 gap-4 mb-4">';
        html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Lieferant *</label>';
        html += '<input id="spUpLieferant" type="text" placeholder="z.B. Shimano Deutschland" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></div>';
        html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Thema</label>';
        html += '<input id="spUpThema" type="text" placeholder="z.B. Konditionen Q3" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></div>';
        html += '</div>';
    } else {
        html += '<div class="grid grid-cols-2 gap-4 mb-4">';
        html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Kontaktperson *</label>';
        html += '<input id="spUpAkquiseName" type="text" placeholder="Vor- und Nachname" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></div>';
        html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Firma</label>';
        html += '<input id="spUpAkquiseFirma" type="text" placeholder="z.B. Fahrrad M\u00fcller" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></div>';
        html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Ort</label>';
        html += '<input id="spUpAkquiseOrt" type="text" placeholder="z.B. Augsburg" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></div>';
        html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Thema</label>';
        html += '<input id="spUpThema" type="text" placeholder="z.B. Erstgespr\u00e4ch Standort" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></div>';
        html += '</div>';
    }

    // Gemeinsame Felder
    html += '<div class="grid grid-cols-2 gap-4 mb-4">';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Call-Datum *</label>';
    html += '<input id="spUpDate" type="date" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value="' + new Date().toISOString().split('T')[0] + '"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Dauer (Minuten)</label>';
    html += '<input id="spUpDuration" type="number" min="1" max="180" placeholder="z.B. 30" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></div>';
    html += '<div><label class="text-xs font-semibold text-gray-600 block mb-1">Call-Typ</label>';
    html += '<select id="spUpType" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">';
    html += '<option>Check-in</option><option>Onboarding</option><option>Problem-Call</option><option>Strategiegespr\u00e4ch</option><option>Verhandlung</option><option>Sonstiges</option>';
    html += '</select></div>';
    html += '</div>';

    // Mode toggle
    html += '<div class="flex gap-2 mb-5">';
    html += '<button onclick="spSetMode(\'audio\')" class="flex-1 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ' + (SP.uploadMode === 'audio' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + '">\uD83C\uDFB5 Audio-Datei</button>';
    html += '<button onclick="spSetMode(\'text\')" class="flex-1 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ' + (SP.uploadMode === 'text'  ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') + '">\uD83D\uDCDD Transkript-Text</button>';
    html += '</div>';

    // Upload area
    if (SP.uploadMode === 'audio') {
        html += '<div id="spDropZone" ondragover="spDragOver(event)" ondragleave="spDragLeave(event)" ondrop="spDrop(event)" class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-4 transition-colors hover:border-orange-400 cursor-pointer" onclick="document.getElementById(\'spAudioInput\').click()">';
        html += '<div class="text-4xl mb-2">\uD83C\uDFB5</div>';
        html += '<p class="text-sm font-semibold text-gray-700">Audio-Datei hierher ziehen</p>';
        html += '<p class="text-xs text-gray-400 mt-1">oder klicken zum Ausw\u00e4hlen \u00b7 MP3, M4A, WAV, MP4 \u00b7 max. 100 MB</p>';
        html += '<p id="spFileLabel" class="text-xs text-orange-600 mt-2 font-medium"></p>';
        html += '</div>';
        html += '<input id="spAudioInput" type="file" accept="audio/*,video/mp4" class="hidden" onchange="spFileSelected(this)">';
    } else {
        html += '<div class="mb-4">';
        html += '<label class="text-xs font-semibold text-gray-600 block mb-1">Transkript einf\u00fcgen *</label>';
        html += '<textarea id="spTranscriptText" rows="8" placeholder="Transkript hier einf\u00fcgen\u2026" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"></textarea>';
        html += '</div>';
    }

    // Submit
    html += '<button onclick="spSubmit()" id="spSubmitBtn" class="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 active:scale-95 transition-all cursor-pointer">';
    html += SP.processing ? '\u23F3 Wird verarbeitet\u2026' : '\uD83D\uDE80 Call analysieren';
    html += '</button>';

    if (SP.processing) {
        html += '<div class="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 text-center">';
        html += '\u23F3 KI analysiert den Call\u2026 Das kann 30\u201360 Sekunden dauern.';
        html += '</div>';
    }

    html += '</div></div>';
    el.innerHTML = html;

    if (SP.uploadKontext === 'partner') spPopulateUploadStandort();
}

export function spSetUploadKontext(k) {
    SP.uploadKontext = k;
    spRenderUpload();
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
        var html = '<option value="">Standort w\u00e4hlen\u2026</option>';
        res.data.forEach(function(s) {
            html += '<option value="' + _escH(s.id) + '">' + _escH(s.name) + '</option>';
        });
        sel.innerHTML = html;
    });
}

export function spFileSelected(input) {
    var label = document.getElementById('spFileLabel');
    if (label && input.files[0]) {
        label.textContent = '\u2713 ' + input.files[0].name + ' (' + Math.round(input.files[0].size / 1024 / 1024 * 10) / 10 + ' MB)';
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
        var dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        spFileSelected(input);
    }
}

// ─── Submit & Analyse ───────────────────────────────────────────────────────
export async function spSubmit() {
    if (SP.processing) return;

    var callDate    = (document.getElementById('spUpDate')     || {}).value;
    var callType    = (document.getElementById('spUpType')     || {}).value;
    var durationMin = parseInt((document.getElementById('spUpDuration') || {}).value || '0') || null;
    var thema       = (document.getElementById('spUpThema')    || {}).value || '';

    if (!callDate) { _showToast('Bitte Datum ausw\u00e4hlen.', 'warning'); return; }

    // Kontext-spezifische Felder sammeln
    var standortId = null, standortName = '', lieferantName = '';
    var akquiseName = '', akquiseFirma = '', akquiseOrt = '';

    if (SP.uploadKontext === 'partner') {
        standortId = (document.getElementById('spUpStandort') || {}).value;
        if (!standortId) { _showToast('Bitte Standort w\u00e4hlen.', 'warning'); return; }
        var standortSel = document.getElementById('spUpStandort');
        standortName = standortSel ? (standortSel.options[standortSel.selectedIndex] || {}).text || '' : '';
    } else if (SP.uploadKontext === 'lieferant') {
        lieferantName = (document.getElementById('spUpLieferant') || {}).value || '';
        if (!lieferantName.trim()) { _showToast('Bitte Lieferant-Name eingeben.', 'warning'); return; }
    } else {
        akquiseName = (document.getElementById('spUpAkquiseName') || {}).value || '';
        akquiseFirma = (document.getElementById('spUpAkquiseFirma') || {}).value || '';
        akquiseOrt = (document.getElementById('spUpAkquiseOrt') || {}).value || '';
        if (!akquiseName.trim()) { _showToast('Bitte Kontaktperson eingeben.', 'warning'); return; }
    }

    var transcriptText = '';

    if (SP.uploadMode === 'audio') {
        var audioInput = document.getElementById('spAudioInput');
        if (!audioInput || !audioInput.files[0]) { _showToast('Bitte Audio-Datei w\u00e4hlen.', 'warning'); return; }
        var file = audioInput.files[0];
        if (file.size > 100 * 1024 * 1024) { _showToast('Datei zu gro\u00df (max. 100 MB).', 'error'); return; }

        SP.processing = true;
        spRenderUpload();
        _showToast('\u23F3 Audio wird transkribiert\u2026', 'info');

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
            _showToast('Bitte Transkript einf\u00fcgen (min. 50 Zeichen).', 'warning'); return;
        }
        SP.processing = true;
        spRenderUpload();
    }

    _showToast('\uD83E\uDD16 KI analysiert den Call\u2026', 'info');

    try {
        var sb2 = _sb();
        var sess = await sb2.auth.getSession();
        var token = (sess.data.session || {}).access_token;

        var analyzeResp = await fetch((window.sbUrl ? window.sbUrl() : 'https://lwwagbkxeofahhwebkab.supabase.co') + '/functions/v1/spiritus-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
                transcript: transcriptText,
                standortId: standortId,
                standortName: standortName,
                callDate: callDate,
                callType: callType,
                durationMin: durationMin,
                gespraechsKontext: SP.uploadKontext,
                lieferantName: lieferantName,
                akquiseKontaktName: akquiseName,
                akquiseKontaktFirma: akquiseFirma,
                akquiseKontaktOrt: akquiseOrt,
                thema: thema
            })
        });

        var analyzeResult = await analyzeResp.json();
        if (!analyzeResp.ok) throw new Error(analyzeResult.error || 'Analyse fehlgeschlagen');

        SP.processing = false;
        _showToast('\u2705 Call erfolgreich analysiert!', 'success');

        loadSpTranscripts();
        spTab('timeline');

    } catch(e) {
        SP.processing = false;
        spRenderUpload();
        _showToast('Analyse fehlgeschlagen: ' + e.message, 'error');
    }
}

// ─── Detail Modal ───────────────────────────────────────────────────────────
export function spOpenDetail(id) {
    var t = SP.transcripts.find(function(x) { return x.id === id; });
    if (!t) return;
    SP.currentTranscript = t;

    var html = '<div id="spDetailOverlay" onclick="spCloseDetail()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;">';
    html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg,#fff);border-radius:16px;padding:24px;width:680px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';

    // Header
    html += '<div class="flex items-start justify-between mb-4">';
    html += '<div>';
    html += '<h2 class="text-lg font-bold text-gray-900">' + _escH(t.thema || t.standort_name || '\u2013') + '</h2>';
    html += '<p class="text-sm text-gray-500">' + spFmt(t.call_date) + (t.call_type ? ' \u00b7 ' + _escH(t.call_type) : '') + (t.duration_min ? ' \u00b7 ' + t.duration_min + ' Min' : '') + '</p>';
    html += '</div>';
    html += '<button onclick="spCloseDetail()" class="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer">\u2715</button>';
    html += '</div>';

    // Badges
    html += '<div class="flex flex-wrap items-center gap-2 mb-4">';
    html += spKontextBadge(t);
    html += spStatusBadge(t.status);
    if (t.sentiment_level) {
        html += '<span class="text-sm px-3 py-1 rounded-full font-medium ' + spSentimentColor(t.sentiment_level) + '">' + spSentimentIcon(t.sentiment_level) + ' ' + _escH(t.sentiment_level) + '</span>';
    }
    if (t.protokoll_einschaetzung) {
        html += '<span class="text-sm px-3 py-1 rounded-full font-medium bg-gray-100 text-gray-700">' + spEinschaetzungIcon(t.protokoll_einschaetzung) + ' ' + _escH(t.protokoll_einschaetzung) + '</span>';
    }
    html += '</div>';

    // 8-Felder-Protokoll EXTERN
    if (t.protokoll_anlass || t.protokoll_situation || t.protokoll_fokus || t.protokoll_massnahmen) {
        html += '<div class="text-xs font-bold text-orange-600 mb-2 uppercase">Extern</div>';

        if (t.protokoll_anlass) {
            html += '<div class="bg-gray-50 rounded-xl p-4 mb-3">';
            html += '<h4 class="text-xs font-bold text-gray-600 mb-1">1. ANLASS</h4>';
            html += '<p class="text-sm text-gray-700">' + _escH(t.protokoll_anlass) + '</p>';
            html += '</div>';
        }

        var situation = t.protokoll_situation || [];
        if (situation.length) {
            html += '<div class="bg-gray-50 rounded-xl p-4 mb-3">';
            html += '<h4 class="text-xs font-bold text-gray-600 mb-1">2. AKTUELLE SITUATION</h4>';
            html += '<ul class="list-disc list-inside text-sm text-gray-700 space-y-1">';
            situation.forEach(function(s) { html += '<li>' + _escH(s) + '</li>'; });
            html += '</ul></div>';
        }

        var fokus = t.protokoll_fokus || [];
        if (fokus.length) {
            html += '<div class="bg-gray-50 rounded-xl p-4 mb-3">';
            html += '<h4 class="text-xs font-bold text-gray-600 mb-1">3. FOKUS-THEMA</h4>';
            html += '<ul class="list-disc list-inside text-sm text-gray-700 space-y-1">';
            fokus.forEach(function(f) { html += '<li>' + _escH(f) + '</li>'; });
            html += '</ul></div>';
        }

        var mass = t.protokoll_massnahmen || [];
        if (mass.length) {
            html += '<div class="bg-gray-50 rounded-xl p-4 mb-3">';
            html += '<h4 class="text-xs font-bold text-gray-600 mb-1">4. MASSNAHMEN</h4>';
            html += '<div class="overflow-x-auto"><table class="w-full text-sm">';
            html += '<thead><tr class="text-xs text-gray-500 border-b"><th class="text-left py-1">Ma\u00dfnahme</th><th class="text-left py-1">Verantwortlich</th><th class="text-left py-1">Deadline</th><th class="text-left py-1">Seite</th></tr></thead><tbody>';
            mass.forEach(function(m) {
                html += '<tr class="border-b border-gray-100">';
                html += '<td class="py-1.5 text-gray-800">' + _escH(m.massnahme || '') + '</td>';
                html += '<td class="py-1.5 text-gray-600">' + _escH(m.verantwortlich || '\u2013') + '</td>';
                html += '<td class="py-1.5 text-gray-600">' + (m.deadline ? spFmt(m.deadline) : '\u2013') + '</td>';
                html += '<td class="py-1.5 text-gray-600">' + _escH(m.seite || '\u2013') + '</td>';
                html += '</tr>';
            });
            html += '</tbody></table></div></div>';
        }

        if (t.protokoll_ziel) {
            html += '<div class="bg-gray-50 rounded-xl p-4 mb-3">';
            html += '<h4 class="text-xs font-bold text-gray-600 mb-1">5. ZIEL / MESSGR\u00d6SSE</h4>';
            html += '<p class="text-sm text-gray-700">' + _escH(t.protokoll_ziel) + '</p>';
            html += '</div>';
        }

        if (t.protokoll_review) {
            html += '<div class="bg-gray-50 rounded-xl p-4 mb-3">';
            html += '<h4 class="text-xs font-bold text-gray-600 mb-1">6. REVIEW / N\u00c4CHSTER TERMIN</h4>';
            html += '<p class="text-sm text-gray-700">' + _escH(t.protokoll_review) + '</p>';
            html += '</div>';
        }

        // INTERN
        if (t.protokoll_einschaetzung || t.protokoll_beobachtung) {
            html += '<div class="text-xs font-bold text-red-600 mb-2 mt-4 uppercase">Intern (nur HQ)</div>';

            if (t.protokoll_einschaetzung) {
                html += '<div class="bg-red-50 rounded-xl p-4 mb-3">';
                html += '<h4 class="text-xs font-bold text-gray-600 mb-1">7. PARTNER-EINSCH\u00c4TZUNG</h4>';
                html += '<p class="text-sm text-gray-700">' + spEinschaetzungIcon(t.protokoll_einschaetzung) + ' ' + _escH(t.protokoll_einschaetzung) + '</p>';
                html += '</div>';
            }

            if (t.protokoll_beobachtung) {
                html += '<div class="bg-red-50 rounded-xl p-4 mb-3">';
                html += '<h4 class="text-xs font-bold text-gray-600 mb-1">8. INTERNE BEOBACHTUNG</h4>';
                html += '<p class="text-sm text-gray-700">' + _escH(t.protokoll_beobachtung) + '</p>';
                html += '</div>';
            }
        }

        // Kategorien
        if (t.kategorien && t.kategorien.length) {
            html += '<div class="flex flex-wrap gap-1 mb-3">';
            t.kategorien.forEach(function(k) {
                html += '<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">' + _escH(spKategorieLabel(k)) + '</span>';
            });
            html += '</div>';
        }
    } else if (t.summary) {
        // Fallback: alte Zusammenfassung
        html += '<div class="bg-gray-50 rounded-xl p-4 mb-4">';
        html += '<h4 class="text-xs font-bold text-gray-600 mb-1">\uD83D\uDCCB ZUSAMMENFASSUNG</h4>';
        html += '<p class="text-sm text-gray-700">' + _escH(t.summary) + '</p>';
        html += '</div>';
    }

    // Eigene Notizen
    html += '<div class="border-t border-gray-200 pt-4 mt-4">';
    html += '<div class="text-xs font-bold text-gray-500 mb-1">\uD83D\uDCDD EIGENE NOTIZEN</div>';
    html += '<p class="text-xs text-gray-400 mb-2">Dein pers\u00f6nliches Protokoll. Wird nicht von der KI verarbeitet.</p>';
    html += '<textarea id="spEigeneNotizen" rows="3" placeholder="Eigene Notizen, Eindr\u00fccke\u2026" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-orange-400">' + _escH(t.eigene_notizen || '') + '</textarea>';
    html += '<button onclick="spSaveNotizen(\'' + t.id + '\')" class="mt-2 text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200 transition cursor-pointer">Notizen speichern</button>';
    html += '</div>';

    // Linked Todos
    html += '<div id="spDetailTodos" class="border-t border-gray-200 pt-4 mt-4"></div>';

    // Review actions
    if (t.status === 'review') {
        html += '<div class="flex gap-3 mt-5 pt-4 border-t border-gray-100">';
        html += '<button onclick="spOpenReviewForm(\'' + t.id + '\')" class="flex-1 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition cursor-pointer">\uD83D\uDD0D Protokoll pr\u00fcfen & freigeben</button>';
        html += '<button onclick="spRejectTranscript(\'' + t.id + '\')" class="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-200 transition cursor-pointer">Ablehnen</button>';
        html += '</div>';
    }

    html += '</div></div>';

    var existing = document.getElementById('spDetailOverlay');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', html);

    // Load linked todos
    spLoadLinkedTodos(t.id);
}

async function spLoadLinkedTodos(transcriptId) {
    var el = document.getElementById('spDetailTodos');
    if (!el) return;
    var sb = _sb();
    if (!sb) return;
    var res = await sb.from('todos').select('id, titel, erledigt, faellig_am, prio').eq('spiritus_transcript_id', transcriptId);
    if (res.error || !res.data || !res.data.length) {
        el.innerHTML = '';
        return;
    }
    var done = res.data.filter(function(t) { return t.erledigt; }).length;
    var html = '<div class="text-xs font-bold text-gray-500 mb-2">\u2705 Todos (' + done + '/' + res.data.length + ' erledigt)</div>';
    html += '<div class="space-y-1">';
    res.data.forEach(function(todo) {
        html += '<div class="flex items-center gap-2 text-sm ' + (todo.erledigt ? 'text-gray-400 line-through' : 'text-gray-700') + '">';
        html += '<span>' + (todo.erledigt ? '\u2705' : '\u2B1C') + '</span>';
        html += '<span>' + _escH(todo.titel) + '</span>';
        if (todo.faellig_am) html += '<span class="text-xs text-gray-400 ml-auto">' + spFmt(todo.faellig_am) + '</span>';
        html += '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
}

export function spCloseDetail() {
    var el = document.getElementById('spDetailOverlay');
    if (el) el.remove();
}

export function spOpenReview(id) {
    spOpenDetail(id);
}

// ─── Review Form (8-Felder editierbar) ──────────────────────────────────────
export function spOpenReviewForm(id) {
    var t = SP.transcripts.find(function(x) { return x.id === id; });
    if (!t) return;
    SP.currentTranscript = t;

    // Save KI originals for feedback
    SP.kiOriginals = {
        anlass: t.protokoll_anlass || '',
        aktuelle_situation: t.protokoll_situation || [],
        fokus_thema: t.protokoll_fokus || [],
        massnahmen: t.protokoll_massnahmen || [],
        ziel_messgroesse: t.protokoll_ziel || '',
        review_termin: t.protokoll_review || '',
        einschaetzung: t.protokoll_einschaetzung || '',
        beobachtung: t.protokoll_beobachtung || ''
    };

    // Close detail overlay
    spCloseDetail();

    var mass = t.protokoll_massnahmen || [];

    var html = '<div id="spReviewOverlay" onclick="spCloseReview()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;">';
    html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg,#fff);border-radius:16px;padding:24px;width:720px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';

    html += '<div class="flex items-center justify-between mb-4">';
    html += '<h2 class="text-lg font-bold text-gray-900">\uD83D\uDD0D Protokoll pr\u00fcfen</h2>';
    html += '<button onclick="spCloseReview()" class="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer">\u2715</button>';
    html += '</div>';

    html += '<div class="text-xs font-bold text-orange-600 mb-2 uppercase">Extern</div>';

    // 1. Anlass
    html += '<div class="mb-3"><label class="text-xs font-bold text-gray-600 block mb-1">1. Anlass</label>';
    html += '<input id="spRvAnlass" type="text" value="' + _escH(t.protokoll_anlass || '') + '" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></div>';

    // 2. Aktuelle Situation
    html += '<div class="mb-3"><label class="text-xs font-bold text-gray-600 block mb-1">2. Aktuelle Situation (je Zeile ein Punkt)</label>';
    html += '<textarea id="spRvSituation" rows="3" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none">' + _escH((t.protokoll_situation || []).join('\n')) + '</textarea></div>';

    // 3. Fokus-Thema
    html += '<div class="mb-3"><label class="text-xs font-bold text-gray-600 block mb-1">3. Fokus-Thema (je Zeile ein Punkt)</label>';
    html += '<textarea id="spRvFokus" rows="2" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none">' + _escH((t.protokoll_fokus || []).join('\n')) + '</textarea></div>';

    // 4. Massnahmen (editable rows with checkboxes)
    html += '<div class="mb-3"><label class="text-xs font-bold text-gray-600 block mb-1">4. Ma\u00dfnahmen (als Todos)</label>';
    html += '<div id="spRvMassnahmen" class="space-y-2">';
    mass.forEach(function(m, i) {
        html += spRenderMassnahmeRow(m, i);
    });
    html += '</div>';
    html += '<button onclick="spAddMassnahme()" class="mt-2 text-xs text-orange-600 hover:text-orange-700 font-semibold cursor-pointer">+ Ma\u00dfnahme hinzuf\u00fcgen</button>';
    html += '</div>';

    // 5. Ziel/Messgroesse
    html += '<div class="mb-3"><label class="text-xs font-bold text-gray-600 block mb-1">5. Ziel / Messgr\u00f6\u00dfe</label>';
    html += '<input id="spRvZiel" type="text" value="' + _escH(t.protokoll_ziel || '') + '" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></div>';

    // 6. Review-Termin
    html += '<div class="mb-4"><label class="text-xs font-bold text-gray-600 block mb-1">6. Review / N\u00e4chster Termin</label>';
    html += '<input id="spRvReview" type="text" value="' + _escH(t.protokoll_review || '') + '" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"></div>';

    html += '<div class="text-xs font-bold text-red-600 mb-2 uppercase">Intern (nur HQ)</div>';

    // 7. Einschaetzung
    html += '<div class="mb-3"><label class="text-xs font-bold text-gray-600 block mb-1">7. Partner-Einsch\u00e4tzung</label>';
    html += '<select id="spRvEinschaetzung" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">';
    ['stabil', 'entwicklungsfaehig', 'kritisch'].forEach(function(v) {
        html += '<option value="' + v + '"' + (t.protokoll_einschaetzung === v ? ' selected' : '') + '>' + spEinschaetzungIcon(v) + ' ' + v + '</option>';
    });
    html += '</select></div>';

    // 8. Beobachtung
    html += '<div class="mb-4"><label class="text-xs font-bold text-gray-600 block mb-1">8. Interne Beobachtung</label>';
    html += '<textarea id="spRvBeobachtung" rows="3" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none">' + _escH(t.protokoll_beobachtung || '') + '</textarea></div>';

    // Eigene Notizen
    html += '<div class="border-t border-gray-200 pt-4 mt-2 mb-4">';
    html += '<div class="text-xs font-bold text-gray-500 mb-1">\uD83D\uDCDD EIGENE NOTIZEN</div>';
    html += '<textarea id="spRvNotizen" rows="3" placeholder="Eigene Notizen, Eindr\u00fccke\u2026" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none">' + _escH(t.eigene_notizen || '') + '</textarea>';
    html += '</div>';

    // Freigabe-Button
    var activeCount = mass.length; // will be recalculated
    html += '<div class="flex gap-3 pt-4 border-t border-gray-100">';
    html += '<button id="spRvFreigebenBtn" onclick="spFreigeben(\'' + t.id + '\')" class="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition cursor-pointer">\u2705 Freigeben & ' + activeCount + ' Todos anlegen</button>';
    html += '<button onclick="spCloseReview()" class="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition cursor-pointer">Abbrechen</button>';
    html += '</div>';

    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
}

function spRenderMassnahmeRow(m, i) {
    var html = '<div class="flex items-start gap-2 p-2 rounded-lg border hover:bg-gray-50" data-sp-mass-idx="' + i + '">';
    html += '<input type="checkbox" checked class="mt-1 sp-mass-check" data-idx="' + i + '" style="accent-color:#EF7D00" onchange="spUpdateFreigebenBtn()">';
    html += '<div class="flex-1">';
    html += '<input type="text" value="' + _escH(m.massnahme || '') + '" class="w-full text-sm font-medium border-0 bg-transparent sp-mass-text" data-idx="' + i + '" placeholder="Ma\u00dfnahme">';
    html += '<div class="flex gap-2 mt-1">';
    html += '<select class="text-xs border rounded px-2 py-1 sp-mass-seite" data-idx="' + i + '"><option value="hq"' + (m.seite === 'hq' ? ' selected' : '') + '>HQ</option><option value="partner"' + (m.seite === 'partner' ? ' selected' : '') + '>Partner</option><option value="lieferant"' + (m.seite === 'lieferant' ? ' selected' : '') + '>Lieferant</option></select>';
    html += '<input type="text" value="' + _escH(m.verantwortlich || '') + '" placeholder="Verantwortlich" class="text-xs border rounded px-2 py-1 flex-1 sp-mass-verantw" data-idx="' + i + '">';
    html += '<input type="date" value="' + (m.deadline || '') + '" class="text-xs border rounded px-2 py-1 sp-mass-deadline" data-idx="' + i + '">';
    html += '</div></div>';
    html += '<button onclick="this.closest(\'[data-sp-mass-idx]\').remove();spUpdateFreigebenBtn()" class="text-gray-300 hover:text-red-500 text-sm cursor-pointer">\u2715</button>';
    html += '</div>';
    return html;
}

export function spAddMassnahme() {
    var container = document.getElementById('spRvMassnahmen');
    if (!container) return;
    var idx = container.children.length;
    container.insertAdjacentHTML('beforeend', spRenderMassnahmeRow({ massnahme: '', verantwortlich: '', deadline: '', seite: 'hq' }, idx));
    spUpdateFreigebenBtn();
}

export function spUpdateFreigebenBtn() {
    var btn = document.getElementById('spRvFreigebenBtn');
    if (!btn) return;
    var checks = document.querySelectorAll('.sp-mass-check:checked');
    var count = checks.length;
    if (count > 0) {
        btn.textContent = '\u2705 Freigeben & ' + count + ' Todos anlegen';
    } else {
        btn.textContent = '\u2705 Freigeben (ohne Todos)';
    }
}

export function spCloseReview() {
    var el = document.getElementById('spReviewOverlay');
    if (el) el.remove();
}

// ─── Freigabe + Todos + Feedback ────────────────────────────────────────────
export async function spFreigeben(transcriptId) {
    var t = SP.transcripts.find(function(x) { return x.id === transcriptId; });
    if (!t) return;

    // Collect current values from form
    var currentValues = {
        anlass: (document.getElementById('spRvAnlass') || {}).value || '',
        aktuelle_situation: ((document.getElementById('spRvSituation') || {}).value || '').split('\n').filter(function(s) { return s.trim(); }),
        fokus_thema: ((document.getElementById('spRvFokus') || {}).value || '').split('\n').filter(function(s) { return s.trim(); }),
        ziel_messgroesse: (document.getElementById('spRvZiel') || {}).value || '',
        review_termin: (document.getElementById('spRvReview') || {}).value || '',
        einschaetzung: (document.getElementById('spRvEinschaetzung') || {}).value || '',
        beobachtung: (document.getElementById('spRvBeobachtung') || {}).value || ''
    };

    // Collect massnahmen from rows
    var massRows = document.querySelectorAll('[data-sp-mass-idx]');
    var allMass = [];
    var todoMass = [];
    massRows.forEach(function(row) {
        var idx = row.dataset.spMassIdx;
        var text = (row.querySelector('.sp-mass-text') || {}).value || '';
        if (!text.trim()) return;
        var m = {
            massnahme: text.trim(),
            verantwortlich: (row.querySelector('.sp-mass-verantw') || {}).value || '',
            deadline: (row.querySelector('.sp-mass-deadline') || {}).value || null,
            seite: (row.querySelector('.sp-mass-seite') || {}).value || 'hq'
        };
        allMass.push(m);
        var check = row.querySelector('.sp-mass-check');
        if (check && check.checked) todoMass.push(m);
    });
    currentValues.massnahmen = allMass;

    var eigeneNotizen = (document.getElementById('spRvNotizen') || {}).value || '';

    var sb = _sb();
    if (!sb) return;

    // 1. Update transcript with reviewed values
    var updateData = {
        protokoll_anlass: currentValues.anlass,
        protokoll_situation: currentValues.aktuelle_situation,
        protokoll_fokus: currentValues.fokus_thema,
        protokoll_massnahmen: currentValues.massnahmen,
        protokoll_ziel: currentValues.ziel_messgroesse,
        protokoll_review: currentValues.review_termin,
        protokoll_einschaetzung: currentValues.einschaetzung,
        protokoll_beobachtung: currentValues.beobachtung,
        eigene_notizen: eigeneNotizen,
        status: 'verarbeitet'
    };

    var updateRes = await sb.from('spiritus_transcripts').update(updateData).eq('id', transcriptId);
    if (updateRes.error) {
        _showToast('Fehler beim Speichern: ' + updateRes.error.message, 'error');
        return;
    }

    // 2. Mark all extractions as approved
    var extr = (t.spiritus_extractions || []).filter(function(e) { return !e.approved; });
    for (var i = 0; i < extr.length; i++) {
        await sb.from('spiritus_extractions').update({ approved: true }).eq('id', extr[i].id);
    }

    // 3. Save KI feedback (Lernfaktor)
    var felder = ['anlass', 'aktuelle_situation', 'fokus_thema', 'massnahmen', 'ziel_messgroesse', 'review_termin', 'einschaetzung', 'beobachtung'];
    var feedbackRows = [];
    felder.forEach(function(feld) {
        var original = SP.kiOriginals[feld];
        var final = currentValues[feld];
        if (JSON.stringify(original) !== JSON.stringify(final)) {
            feedbackRows.push({
                transcript_id: transcriptId,
                user_id: _sbUser().id,
                feld: feld,
                ki_original: typeof original === 'string' ? JSON.stringify(original) : original,
                user_final: typeof final === 'string' ? JSON.stringify(final) : final,
                gespraechs_kontext: t.gespraechs_kontext || 'partner'
            });
        }
    });
    if (feedbackRows.length > 0) {
        await sb.from('spiritus_ki_feedback').insert(feedbackRows);
    }

    // 4. Create todos from checked massnahmen
    if (todoMass.length > 0) {
        var todoRows = todoMass.map(function(m) {
            return {
                standort_id: t.standort_id || null,
                erstellt_von: _sbUser().id,
                titel: m.massnahme,
                beschreibung: 'Aus Spiritus-Gespr\u00e4ch: ' + _escH(t.thema || t.standort_name || ''),
                faellig_am: m.deadline || null,
                prio: 'normal',
                prio_sort: 1,
                kategorie: 'spiritus',
                referenz_typ: 'spiritus',
                referenz_id: transcriptId,
                spiritus_transcript_id: transcriptId,
                erledigt: false
            };
        });
        var todoRes = await sb.from('todos').insert(todoRows);
        if (todoRes.error) {
            _showToast('Protokoll gespeichert, aber Todos fehlgeschlagen: ' + todoRes.error.message, 'warning');
        } else {
            _showToast('\u2705 Freigegeben & ' + todoMass.length + ' Todos angelegt!', 'success');
        }
    } else {
        _showToast('\u2705 Protokoll freigegeben!', 'success');
    }

    // Update local state
    Object.assign(t, updateData);
    t.status = 'verarbeitet';
    (t.spiritus_extractions || []).forEach(function(e) { e.approved = true; });

    spCloseReview();
    spRenderAll();
}

// ─── Save Notizen ───────────────────────────────────────────────────────────
export async function spSaveNotizen(transcriptId) {
    var val = (document.getElementById('spEigeneNotizen') || {}).value || '';
    var sb = _sb();
    if (!sb) return;
    var res = await sb.from('spiritus_transcripts').update({ eigene_notizen: val }).eq('id', transcriptId);
    if (res.error) {
        _showToast('Fehler: ' + res.error.message, 'error');
        return;
    }
    var t = SP.transcripts.find(function(x) { return x.id === transcriptId; });
    if (t) t.eigene_notizen = val;
    _showToast('Notizen gespeichert.', 'success');
}

// ─── Approve / Reject (legacy) ──────────────────────────────────────────────
export async function spApproveAll(transcriptId) {
    var t = SP.transcripts.find(function(x) { return x.id === transcriptId; });
    if (!t) return;
    var sb = _sb();
    if (!sb) return;
    var extr = (t.spiritus_extractions || []).filter(function(e) { return !e.approved; });
    for (var i = 0; i < extr.length; i++) {
        await sb.from('spiritus_extractions').update({ approved: true }).eq('id', extr[i].id);
        extr[i].approved = true;
    }
    await sb.from('spiritus_transcripts').update({ status: 'verarbeitet' }).eq('id', transcriptId);
    if (t) t.status = 'verarbeitet';
    _showToast('\u2705 Erkenntnisse in Wissensbasis \u00fcbernommen!', 'success');
    spCloseDetail();
    spRenderAll();
}

export async function spApproveExtraction(extractionId) {
    var sb = _sb();
    if (!sb) return;
    await sb.from('spiritus_extractions').update({ approved: true }).eq('id', extractionId);
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
    _showToast('Call abgelehnt.', 'info');
    spCloseDetail();
    spRenderAll();
}

// ─── window exports ─────────────────────────────────────────────────────────
window.initSpiritus       = initSpiritus;
window.spTab              = spTab;
window.spFilterKontext    = spFilterKontext;
window.spSetUploadKontext = spSetUploadKontext;
window.spSetMode          = spSetMode;
window.spSubmit           = spSubmit;
window.spFileSelected     = spFileSelected;
window.spDragOver         = spDragOver;
window.spDragLeave        = spDragLeave;
window.spDrop             = spDrop;
window.spApplyFilter      = spApplyFilter;
window.spOpenDetail       = spOpenDetail;
window.spCloseDetail      = spCloseDetail;
window.spOpenReview       = spOpenReview;
window.spOpenReviewForm   = spOpenReviewForm;
window.spAddMassnahme     = spAddMassnahme;
window.spUpdateFreigebenBtn = spUpdateFreigebenBtn;
window.spCloseReview      = spCloseReview;
window.spFreigeben        = spFreigeben;
window.spSaveNotizen      = spSaveNotizen;
window.spApproveAll       = spApproveAll;
window.spApproveExtraction = spApproveExtraction;
window.spRejectTranscript = spRejectTranscript;
