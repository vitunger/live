/**
 * views/home.js – Partner-Portal Startseite / Dashboard
 *
 * Handles:
 *  - Dashboard widgets (Pipeline, Verkauf, Termine, Aufgaben, Marketing, Team, Controlling, Support, Wissen, Nachrichten)
 *  - Home widgets (Monatsfokus, Jahresziele, Journal, Maßnahmen)
 *  - Dashboard edit mode (add/remove widgets)
 *  - Dashboard tabs (Finanzen, Leadreporting, Team)
 *  - Extern home (for external partners)
 *  - Widget info popups
 *  - Demo widget fill
 *
 * Globals accessed via safe helpers:
 *   sb, sbProfile – Supabase client & user profile
 *   escH          – XSS-safe HTML encoding
 *   fmtN          – number formatter
 *   showToast     – toast notification
 *   SESSION       – session object
 *   allgemein*    – shared Allgemein module state
 *   monatsNamen   – month name array
 *
 * @module views/home
 */

// ── safe access to globals (available after app init) ──────────────
function _sb()        { return window.sb; }
function _sbProfile() { return window.sbProfile; }
function _escH(s)     { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _fmtN(n)     { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _showToast(m) { if (typeof window.showToast === 'function') window.showToast(m); }


// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD WIDGET EDIT MODE
// ═══════════════════════════════════════════════════════════════════

let dashboardEditMode = false;

export function toggleDashboardEdit() {
    dashboardEditMode = !dashboardEditMode;
    const addPanel = document.getElementById('widgetAddPanel');
    const removeButtons = document.querySelectorAll('.widget-remove');
    const editButton = document.getElementById('dashboardEditButton');

    if (dashboardEditMode) {
        if (addPanel) addPanel.classList.remove('hidden');
        removeButtons.forEach(btn => btn.classList.remove('hidden'));
        if (editButton) editButton.textContent = 'Fertig';
    } else {
        if (addPanel) addPanel.classList.add('hidden');
        removeButtons.forEach(btn => btn.classList.add('hidden'));
        if (editButton) editButton.textContent = 'Dashboard anpassen';
    }
}

export function addWidget(widgetName) {
    const widget = document.querySelector(`[data-widget="${widgetName}"]`);
    if (widget) {
        widget.style.display = 'block';
        _showToast(`Widget "${widgetName}" hinzugefügt`);
    }
}

// Widget remove via event delegation (self-registering)
document.addEventListener('click', function(e) {
    if (e.target.closest('.widget-remove')) {
        const widget = e.target.closest('.dashboard-widget');
        if (!widget) return;
        const widgetName = widget.getAttribute('data-widget');
        widget.style.display = 'none';
        _showToast(`Widget "${widgetName}" entfernt`);
    }
});


// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD TABS (Finanzen / Leadreporting / Team)
// ═══════════════════════════════════════════════════════════════════

var dashTabInited = false;

export function initDashboardTabs() {
    if (dashTabInited) return;
    dashTabInited = true;
    var finSrc  = document.getElementById('financesView');
    var leadSrc = document.getElementById('leadReportingView');
    var teamSrc = document.getElementById('teamView');
    var finDest  = document.getElementById('dashTabFinanzen');
    var leadDest = document.getElementById('dashTabLeadreporting');
    var teamDest = document.getElementById('dashTabTeam');
    if (finSrc  && finDest)  { while (finSrc.firstChild)  finDest.appendChild(finSrc.firstChild); }
    if (leadSrc && leadDest) { while (leadSrc.firstChild) leadDest.appendChild(leadSrc.firstChild); }
    if (teamSrc && teamDest) { while (teamSrc.firstChild) teamDest.appendChild(teamSrc.firstChild); }
}

export function showDashboardTab(tabName) {
    initDashboardTabs();
    document.querySelectorAll('.dash-tab-content').forEach(function(c) { c.style.display = 'none'; });
    document.querySelectorAll('.dash-tab-btn').forEach(function(b) {
        b.className = 'dash-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
    });
    var tabMap = { finanzen: 'Finanzen', leadreporting: 'Leadreporting', team: 'Team' };
    var el = document.getElementById('dashTab' + (tabMap[tabName] || ''));
    if (el) el.style.display = 'block';
    var btn = document.querySelector('.dash-tab-btn[data-tab="' + tabName + '"]');
    if (btn) btn.className = 'dash-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
}


// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD WIDGETS – Live-Daten laden
// ═══════════════════════════════════════════════════════════════════

export async function loadDashboardWidgets() {
    // In demo mode, widgets are filled by fillDemoWidgets - skip DB queries
    if (window.DEMO_ACTIVE) return;
    try {
        await Promise.all([
            loadWidgetPipeline(),
            loadWidgetSuccess(),
            loadWidgetTermine(),
            loadWidgetAufgaben(),
            loadWidgetMarketing(),
            loadWidgetTeam(),
            loadWidgetControlling(),
            loadWidgetSupport(),
            loadWidgetWissen(),
            loadWidgetNachrichten()
        ]);
    } catch (e) { console.error('Widget-Laden:', e); }
}

// --- Pipeline Widget ---
export async function loadWidgetPipeline() {
    var el = document.getElementById('wPipelineContent'); if (!el) return;
    try {
        var sb = _sb();
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var q = _sb().from('leads').select('id, status, wert').eq('archiviert', false);
        if (stdId) q = q.eq('standort_id', stdId);
        var res = await q;
        var leads = res.data || [];
        var offen = leads.filter(function(l) { return l.status !== 'gewonnen' && l.status !== 'verloren'; });
        var angebote = leads.filter(function(l) { return l.status === 'angebot'; });
        var pipeWert = offen.reduce(function(s, l) { return s + (l.wert || 0); }, 0);
        var badge = document.getElementById('wPipelineBadge');
        if (badge) badge.textContent = offen.length + ' aktiv';
        el.innerHTML = '<div class="space-y-3">'
            + '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">Offene Leads</span><span class="font-bold text-blue-600">' + offen.length + '</span></div>'
            + '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">Angebote offen</span><span class="font-bold text-orange-600">' + angebote.length + '</span></div>'
            + '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">Pipeline-Wert</span><span class="font-bold text-green-600">' + _fmtN(pipeWert) + ' €</span></div>'
            + '</div>';
    } catch (e) { el.innerHTML = '<p class="text-sm text-gray-400">Daten nicht verfügbar</p>'; }
}

// --- Verkaufserfolg Widget ---
export async function loadWidgetSuccess() {
    var el = document.getElementById('wSuccessContent'); if (!el) return;
    try {
        var sb = _sb();
        var kw = getKWnow(); var kwBadge = document.getElementById('wSuccessKW');
        if (kwBadge) kwBadge.textContent = 'KW ' + kw;
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var mondayISO = getKWMonday(kw);
        var sundayISO = getKWSunday(kw);
        var q = _sb().from('verkauf_tracking').select('id, typ').gte('datum', mondayISO).lte('datum', sundayISO);
        if (stdId) q = q.eq('standort_id', stdId);
        var res = await q;
        var data = res.data || [];
        var verkauft = data.filter(function(d) { return d.typ === 'verkauf'; }).length;
        var beratung = data.filter(function(d) { return d.typ === 'beratung'; }).length;
        var quote = beratung > 0 ? Math.round(verkauft / beratung * 100) : 0;
        el.innerHTML = '<div class="mb-3"><div class="flex items-center justify-between mb-1"><span class="text-sm text-gray-600">Verkaufsquote</span>'
            + '<span class="text-2xl font-bold ' + (quote >= 40 ? 'text-green-600' : quote >= 20 ? 'text-yellow-600' : 'text-red-500') + '">' + quote + '%</span></div>'
            + '<div class="w-full bg-gray-200 rounded-full h-2"><div class="' + (quote >= 40 ? 'bg-green-500' : quote >= 20 ? 'bg-yellow-500' : 'bg-red-500') + ' h-2 rounded-full" style="width:' + Math.min(quote, 100) + '%"></div></div></div>'
            + '<div class="grid grid-cols-2 gap-2 text-sm"><div><p class="text-gray-500">Verkäufe</p><p class="font-bold text-gray-800">' + verkauft + '</p></div>'
            + '<div><p class="text-gray-500">Beratungen</p><p class="font-bold text-gray-800">' + beratung + '</p></div></div>';
    } catch (e) { el.innerHTML = '<p class="text-sm text-gray-400">Keine Verkaufsdaten</p>'; }
}

// KW helper functions
export function getKWnow() {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    var w = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - w) / 864e5 - 3 + (w.getDay() + 6) % 7) / 7);
}
export function getKWMonday(kw) {
    var y = new Date().getFullYear();
    var d = new Date(y, 0, 4);
    var dayOfWeek = d.getDay() || 7;
    d.setDate(d.getDate() - dayOfWeek + 1 + (kw - 1) * 7);
    return d.toISOString().split('T')[0];
}
export function getKWSunday(kw) {
    var m = getKWMonday(kw);
    var d = new Date(m);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
}

// --- Termine Widget ---
export async function loadWidgetTermine() {
    var el = document.getElementById('wTermineContent'); if (!el) return;
    try {
        var sb = _sb();
        var today = new Date().toISOString().split('T')[0];
        var tomorrow = new Date(Date.now() + 864e5).toISOString().split('T')[0];
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var q = _sb().from('termine').select('id, titel, beschreibung, start_zeit').gte('start_zeit', today + 'T00:00:00').lt('start_zeit', tomorrow + 'T00:00:00').order('start_zeit');
        if (stdId) q = q.eq('standort_id', stdId);
        var res = await q;
        var terme = res.data || [];
        var badge = document.getElementById('wTermineCount');
        if (badge) badge.textContent = terme.length;
        if (!terme.length) { el.innerHTML = '<p class="text-sm text-gray-400 text-center py-2">Keine Termine heute 📭</p>'; return; }
        var colors = ['bg-blue-50', 'bg-purple-50', 'bg-green-50', 'bg-orange-50', 'bg-pink-50'];
        el.innerHTML = '<div class="space-y-2">' + terme.slice(0, 4).map(function(t, i) {
            var zeit = t.start_zeit ? new Date(t.start_zeit).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
            return '<div class="p-2.5 ' + colors[i % 5] + ' rounded-lg"><p class="text-sm font-semibold text-gray-800">' + zeit + (zeit ? ' - ' : '') + _escH(t.titel || '') + '</p>' + (t.beschreibung ? '<p class="text-xs text-gray-600">' + _escH(t.beschreibung).substring(0, 50) + '</p>' : '') + '</div>';
        }).join('') + (terme.length > 4 ? '<p class="text-xs text-gray-400 text-center">+' + (terme.length - 4) + ' weitere</p>' : '') + '</div>';
    } catch (e) { el.innerHTML = '<p class="text-sm text-gray-400">Fehler beim Laden</p>'; }
}

// --- Aufgaben Widget ---
export async function loadWidgetAufgaben() {
    var el = document.getElementById('wAufgabenContent'); if (!el) return;
    try {
        var sb = _sb();
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var userId = _sbProfile() ? _sbProfile().user_id : null;
        var q = _sb().from('todos').select('id, titel, erledigt, faellig_am, prio_sort').eq('erledigt', false).order('prio_sort').order('faellig_am').limit(5);
        if (userId) q = q.eq('user_id', userId);
        var res = await q;
        var aufgaben = res.data || [];
        var badge = document.getElementById('wAufgabenCount');
        if (badge) badge.textContent = aufgaben.length + (aufgaben.length >= 5 ? '+' : '');
        if (!aufgaben.length) { el.innerHTML = '<p class="text-sm text-green-600 font-semibold text-center py-2">Alles erledigt! 🎉</p>'; return; }
        var today = new Date().toISOString().split('T')[0];
        el.innerHTML = '<div class="space-y-2">' + aufgaben.map(function(t) {
            var overdue = t.faellig_am && t.faellig_am < today;
            return '<div class="flex items-start space-x-2"><input type="checkbox" class="mt-0.5 rounded border-gray-300 accent-orange-500" onchange="quickToggleTodo(\'' + t.id + '\',this.checked)"><span class="text-sm ' + (overdue ? 'text-red-600' : 'text-gray-700') + '">' + _escH(t.titel || '') + (overdue ? ' ⏰' : '') + '</span></div>';
        }).join('') + '</div>';
    } catch (e) { el.innerHTML = '<p class="text-sm text-gray-400">Fehler beim Laden</p>'; }
}

export async function quickToggleTodo(id, checked) {
    try {
        await _sb().from('todos').update({ erledigt: checked, erledigt_am: checked ? new Date().toISOString() : null }).eq('id', id);
        loadWidgetAufgaben();
    } catch (e) { /* silent */ }
}

// --- Marketing Widget ---
export async function loadWidgetMarketing() {
    var el = document.getElementById('wMarketingContent'); if (!el) return;
    el.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Noch keine Marketing-Daten vorhanden.</p>'
        + '<span class="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">In Vorbereitung</span>';
}

// --- Team Widget ---
export async function loadWidgetTeam() {
    var el = document.getElementById('wTeamContent'); if (!el) return;
    try {
        var sb = _sb();
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var q = _sb().from('users').select('id, vorname, nachname, status, rolle').eq('status', 'aktiv');
        if (stdId) q = q.eq('standort_id', stdId);
        var res = await q;
        var team = res.data || [];
        if (!team.length) { el.innerHTML = '<p class="text-sm text-gray-400">Keine Mitarbeiter</p>'; return; }
        var rolleIcons = { admin: '👑', geschaeftsfuehrer: '🏢', standortleiter: '⭐', verkauf: '💰', werkstatt: '🔧', mitarbeiter: '👤' };
        el.innerHTML = '<div class="space-y-2">' + team.slice(0, 5).map(function(u) {
            var icon = rolleIcons[u.rolle] || '👤';
            return '<div class="flex items-center justify-between"><div class="flex items-center space-x-2"><span>' + icon + '</span><span class="text-sm font-semibold text-gray-800">' + _escH((u.vorname || '') + ' ' + (u.nachname || '').charAt(0) + '.') + '</span></div><span class="text-xs text-green-600">● aktiv</span></div>';
        }).join('') + (team.length > 5 ? '<p class="text-xs text-gray-400 text-center">+' + (team.length - 5) + ' weitere</p>' : '') + '</div>';
    } catch (e) { el.innerHTML = '<p class="text-sm text-gray-400">Fehler beim Laden</p>'; }
}

// --- Controlling Widget ---
export async function loadWidgetControlling() {
    var el = document.getElementById('wControllingContent'); if (!el) return;
    try {
        var sb = _sb();
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var q = _sb().from('bwa_daten').select('monat, umsatz, rohertrag_pct, personalkosten_pct, ergebnis').order('monat', { ascending: false }).limit(1);
        if (stdId) q = q.eq('standort_id', stdId);
        var res = await q;
        var bwa = (res.data || [])[0];
        if (!bwa) { el.innerHTML = '<p class="text-sm text-gray-400 text-center py-2">Noch keine BWA hochgeladen</p>'; return; }
        el.innerHTML = '<div class="space-y-3">'
            + '<div class="flex justify-between items-center"><span class="text-sm text-gray-600">Umsatz</span><span class="font-bold text-gray-800">' + _fmtN(bwa.umsatz || 0) + ' €</span></div>'
            + '<div><div class="flex justify-between mb-1"><span class="text-sm text-gray-600">Rohertrag</span><span class="text-sm font-semibold ' + (bwa.rohertrag_pct >= 35 ? 'text-green-600' : 'text-red-500') + '">' + (bwa.rohertrag_pct || 0).toFixed(1) + '%</span></div>'
            + '<div class="w-full bg-gray-200 rounded-full h-2"><div class="' + (bwa.rohertrag_pct >= 35 ? 'bg-green-500' : 'bg-red-500') + ' h-2 rounded-full" style="width:' + Math.min(bwa.rohertrag_pct || 0, 60) / 60 * 100 + '%"></div></div></div>'
            + '<div class="flex justify-between items-center"><span class="text-sm text-gray-600">Ergebnis</span><span class="font-bold ' + ((bwa.ergebnis || 0) >= 0 ? 'text-green-600' : 'text-red-500') + '">' + _fmtN(bwa.ergebnis || 0) + ' €</span></div>'
            + '<p class="text-[10px] text-gray-400">Letzte BWA: ' + _escH(bwa.monat || '') + '</p>'
            + '</div>';
    } catch (e) { el.innerHTML = '<p class="text-sm text-gray-400">Fehler beim Laden</p>'; }
}

// --- Support Widget ---
export async function loadWidgetSupport() {
    var el = document.getElementById('wSupportContent'); if (!el) return;
    try {
        var sb = _sb();
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var q = _sb().from('support_tickets').select('id, titel, status, created_at').eq('status', 'offen').order('created_at', { ascending: false }).limit(3);
        if (stdId) q = q.eq('standort_id', stdId);
        var res = await q;
        var tickets = res.data || [];
        var badge = document.getElementById('wSupportCount');
        if (badge) badge.textContent = tickets.length + (tickets.length >= 3 ? '+' : '');
        if (!tickets.length) { el.innerHTML = '<div class="text-center py-3"><p class="text-2xl">✅</p><p class="text-sm text-green-600 font-semibold mt-1">Keine offenen Tickets</p></div>'; return; }
        el.innerHTML = '<div class="space-y-2">' + tickets.map(function(t) {
            var age = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 864e5);
            return '<div class="text-xs p-2 ' + (age > 7 ? 'bg-red-50' : 'bg-yellow-50') + ' rounded"><p class="font-semibold">' + _escH(t.titel || 'Ticket') + '</p><p class="text-gray-600">Offen seit ' + age + ' Tag' + (age !== 1 ? 'en' : '') + '</p></div>';
        }).join('') + '</div>';
    } catch (e) { el.innerHTML = '<p class="text-sm text-gray-400">Fehler beim Laden</p>'; }
}

// --- Wissen Widget ---
export async function loadWidgetWissen() {
    var el = document.getElementById('wWissenContent'); if (!el) return;
    el.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">Noch keine Wissensartikel vorhanden.</p>'
        + '<span class="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">In Vorbereitung</span>';
}

// --- Nachrichten Widget ---
export async function loadWidgetNachrichten() {
    var el = document.getElementById('wNachrichtenContent'); if (!el) return;
    try {
        var sb = _sb();
        var res = await _sb().from('ankuendigungen').select('id, titel, kategorie, created_at').order('created_at', { ascending: false }).limit(3);
        var news = res.data || [];
        if (!news.length) { el.innerHTML = '<p class="text-sm text-gray-400 text-center py-2">Keine Nachrichten</p>'; return; }
        var catColors = { wichtig: 'bg-red-50 border-red-400', info: 'bg-blue-50 border-blue-400', aktion: 'bg-orange-50 border-vit-orange', update: 'bg-green-50 border-green-400' };
        el.innerHTML = '<div class="space-y-2">' + news.map(function(n) {
            var ago = Math.floor((Date.now() - new Date(n.created_at).getTime()) / 36e5);
            var agoTxt = ago < 1 ? 'gerade eben' : ago < 24 ? 'vor ' + ago + ' Std.' : 'vor ' + Math.floor(ago / 24) + ' Tag' + (Math.floor(ago / 24) !== 1 ? 'en' : '');
            var col = catColors[n.kategorie] || 'bg-gray-50 border-gray-300';
            return '<div class="p-2.5 ' + col + ' rounded-lg border-l-4"><p class="text-sm font-semibold text-gray-800">' + _escH(n.titel || '') + '</p><p class="text-xs text-gray-500">' + agoTxt + '</p></div>';
        }).join('') + '</div>';
    } catch (e) { el.innerHTML = '<p class="text-sm text-gray-400">Fehler beim Laden</p>'; }
}


// ═══════════════════════════════════════════════════════════════════
//  HOME WIDGETS (Allgemein-Bereich auf Startseite)
// ═══════════════════════════════════════════════════════════════════

export function loadHomeWidgets() {
    var escH = _escH;

    // Monatsfokus
    var fokusContent = document.getElementById('homeMonatsfokusContent');
    var fokusMonat = document.getElementById('homeMonatsfokusMonat');
    var allgemeinMonatsplan = window.allgemeinMonatsplan || [];
    var allgemeinAktuellerMonat = window.allgemeinAktuellerMonat || '';
    var monatsNamen = window.monatsNamen || {};
    var aktMonat = allgemeinMonatsplan.find(function(p) { return p.monat === allgemeinAktuellerMonat; });
    if (fokusMonat) fokusMonat.textContent = monatsNamen[allgemeinAktuellerMonat] || '';
    if (fokusContent) {
        fokusContent.innerHTML = aktMonat && aktMonat.fokus_thema
            ? '<p class="font-bold text-gray-800">' + escH(aktMonat.fokus_thema) + '</p>' + (aktMonat.beschreibung ? '<p class="text-xs text-gray-500 mt-1">' + escH(aktMonat.beschreibung).substring(0, 80) + '</p>' : '')
            : '<p class="text-sm text-gray-400 italic">Noch kein Fokus definiert</p>';
    }

    // Jahresziele
    var allgemeinJahresziele = window.allgemeinJahresziele || [];
    var jzContent = document.getElementById('homeJahreszieleContent');
    var jzCount = document.getElementById('homeJahreszieleCount');
    if (jzCount) jzCount.textContent = allgemeinJahresziele.length + ' Ziele';
    if (jzContent) {
        var top = allgemeinJahresziele.filter(function(z) { return z.typ !== 'soft_target'; }).slice(0, 2);
        jzContent.innerHTML = !top.length
            ? '<p class="text-sm text-gray-400 italic">Keine Ziele definiert</p>'
            : top.map(function(z) {
                var pct = z.zielwert > 0 ? Math.round((z.aktueller_wert / z.zielwert) * 100) : 0;
                return '<div class="mb-2"><div class="flex justify-between text-xs"><span class="font-semibold text-gray-700 truncate">' + escH(z.titel) + '</span><span>' + pct + '%</span></div><div class="w-full bg-gray-200 rounded-full h-1.5 mt-0.5"><div class="bg-vit-orange h-1.5 rounded-full" style="width:' + Math.min(pct, 100) + '%"></div></div></div>';
            }).join('');
    }

    // Journal
    var allgemeinJournal = window.allgemeinJournal || [];
    var jContent = document.getElementById('homeJournalContent');
    var jDatum = document.getElementById('homeJournalDatum');
    var stimmungEmojis = { positiv: '😊', neutral: '😐', besorgt: '😟', kritisch: '😤' };
    if (!allgemeinJournal.length) {
        if (jContent) jContent.innerHTML = '<p class="text-sm text-gray-400 italic">Noch kein Gespräch</p>';
        if (jDatum) jDatum.textContent = '';
    } else {
        var lj = allgemeinJournal[0];
        if (jDatum) jDatum.textContent = lj.datum ? new Date(lj.datum + 'T00:00:00').toLocaleDateString('de-DE') : '';
        if (jContent) jContent.innerHTML = '<div class="flex items-center space-x-2 mb-1"><span>' + (stimmungEmojis[lj.stimmung] || '😐') + '</span><span class="text-sm font-semibold">Partnergespräch</span></div>' + (lj.aktuelle_lage ? '<p class="text-xs text-gray-500 line-clamp-2">' + escH(lj.aktuelle_lage).substring(0, 100) + '</p>' : '');
    }

    // Maßnahmen
    var maContent = document.getElementById('homeMassnahmenContent');
    var maCount = document.getElementById('homeMassnahmenCount');
    var offene = [];
    allgemeinJournal.forEach(function(j) { (j.massnahmen || []).forEach(function(m) { if (!m.erledigt) offene.push(m); }); });
    if (maCount) maCount.textContent = offene.length + ' offen';
    if (maContent) {
        maContent.innerHTML = !offene.length
            ? '<p class="text-sm text-green-600 font-semibold">Alles erledigt! 🎉</p>'
            : offene.slice(0, 3).map(function(m) { return '<p class="text-sm text-gray-700 mb-1">• ' + escH(m.text) + '</p>'; }).join('') + (offene.length > 3 ? '<p class="text-xs text-gray-400">+ ' + (offene.length - 3) + ' weitere</p>' : '');
    }
}


// ═══════════════════════════════════════════════════════════════════
//  EXTERN HOME (für externe Partner)
// ═══════════════════════════════════════════════════════════════════

export function renderExternHome() {
    var stage = (window.SESSION || {}).stage;
    var stageLabels = {
        phase0: { label: 'Phase 0 – Kostenloser Akademiezugang', desc: 'Einstieg ohne Verpflichtung – lerne vit:bikes kennen' },
        part1:  { label: 'Trainingsphase Part 1 – Strategie & Qualifizierung', desc: '3 Monate strategisches Fundament' },
        part2:  { label: 'Trainingsphase Part 2 – Integration & Umsetzung', desc: '9 Monate operative Systemintegration' },
        partner: { label: 'Partnerphase – Voller Standort', desc: 'Willkommen im vit:bikes Netzwerk!' }
    };
    var info = stageLabels[stage] || stageLabels.phase0;
    var el = document.getElementById('externStageLabel');
    if (el) el.textContent = info.label;
    var descEl = document.getElementById('externStageDesc');
    if (descEl) descEl.textContent = info.desc;

    // Render stage progress
    _renderExternStageProgress(stage);
}

function _renderExternStageProgress(stage) {
    var progressMap = { phase0: 10, part1: 35, part2: 70, partner: 100 };
    var pct = progressMap[stage] || 10;
    var bar = document.getElementById('externProgressBar');
    if (bar) bar.style.width = pct + '%';
    var pctEl = document.getElementById('externProgressPct');
    if (pctEl) pctEl.textContent = pct + '%';

    var stepsEl = document.getElementById('externStageSteps');
    if (stepsEl) {
        var stages = ['phase0', 'part1', 'part2', 'partner'];
        var stageIdx = stages.indexOf(stage);
        stepsEl.innerHTML = stages.map(function(s, i) {
            var done = i < stageIdx;
            var active = i === stageIdx;
            var labels = { phase0: 'Phase 0', part1: 'Part 1', part2: 'Part 2', partner: 'Partner' };
            return '<div class="flex flex-col items-center"><div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ' + (done ? 'bg-green-500 text-white' : active ? 'bg-vit-orange text-white' : 'bg-gray-200 text-gray-500') + '">' + (done ? '✓' : (i + 1)) + '</div><span class="text-[10px] mt-1 ' + (active ? 'text-vit-orange font-bold' : 'text-gray-400') + '">' + labels[s] + '</span></div>';
        }).join('<div class="flex-1 h-0.5 bg-gray-200 self-center mx-1"></div>');
    }
}


// ═══════════════════════════════════════════════════════════════════
//  WIDGET INFO POPUP
// ═══════════════════════════════════════════════════════════════════

export function toggleWidgetInfo(e, id) {
    e.stopPropagation();
    e.preventDefault();
    var el = document.getElementById(id);
    if (!el) return;

    // Close all others
    document.querySelectorAll('.widget-info-popup.active').forEach(function(p) {
        if (p.id !== id) p.classList.remove('active');
    });

    // Remove existing overlay
    var oldOv = document.getElementById('widgetInfoOverlay');
    if (oldOv) oldOv.remove();

    var isOpen = el.classList.contains('active');
    if (isOpen) {
        el.classList.remove('active');
        return;
    }

    // Create overlay
    var ov = document.createElement('div');
    ov.id = 'widgetInfoOverlay';
    ov.className = 'widget-info-overlay active';
    ov.onclick = function() { el.classList.remove('active'); ov.remove(); };
    document.body.appendChild(ov);

    el.classList.add('active');
}


// ═══════════════════════════════════════════════════════════════════
//  DEMO WIDGETS FILL
// ═══════════════════════════════════════════════════════════════════

export function fillDemoWidgets(level, stage) {
    setTimeout(function() {
        var wt2 = document.getElementById('welcomeText');
        if (wt2) wt2.textContent = level === 'hq' ? 'Willkommen im HQ! 👋' : 'Willkommen! 👋';

        if (level === 'hq') return; // HQ has own demo fill

        // ── Pipeline Widget ──
        var pip = document.getElementById('wPipelineContent');
        var pipBadge = document.getElementById('wPipelineBadge');
        if (pipBadge) pipBadge.textContent = '7 aktiv';
        if (pip) pip.innerHTML = '<div class="space-y-3">'
            + '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">Offene Leads</span><span class="font-bold text-blue-600">7</span></div>'
            + '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">Angebote offen</span><span class="font-bold text-orange-600">3</span></div>'
            + '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">Pipeline-Wert</span><span class="font-bold text-green-600">18.450 €</span></div>'
            + '</div>';

        // ── Verkaufserfolg Widget ──
        var suc = document.getElementById('wSuccessContent');
        var sucKW = document.getElementById('wSuccessKW');
        if (sucKW) sucKW.textContent = 'KW 8';
        if (suc) suc.innerHTML = '<div class="mb-3"><div class="flex items-center justify-between mb-1"><span class="text-sm text-gray-600">Verkaufsquote</span>'
            + '<span class="text-2xl font-bold text-green-600">42%</span></div>'
            + '<div class="w-full bg-gray-200 rounded-full h-2"><div class="bg-green-500 h-2 rounded-full" style="width:42%"></div></div></div>'
            + '<div class="grid grid-cols-2 gap-2 text-sm"><div><p class="text-gray-500">Verkäufe</p><p class="font-bold text-gray-800">5</p></div>'
            + '<div><p class="text-gray-500">Beratungen</p><p class="font-bold text-gray-800">12</p></div></div>';

        // ── Termine Heute Widget ──
        var ter = document.getElementById('wTermineContent');
        var terBadge = document.getElementById('wTermineCount');
        if (terBadge) terBadge.textContent = '3';
        if (ter) ter.innerHTML = '<div class="space-y-2">'
            + '<div class="p-2.5 bg-blue-50 rounded-lg"><p class="text-sm font-semibold text-gray-800">09:00 - Werkstatt-Meeting</p><p class="text-xs text-gray-600">Wochenbesprechung Team</p></div>'
            + '<div class="p-2.5 bg-purple-50 rounded-lg"><p class="text-sm font-semibold text-gray-800">11:30 - Kundenberatung E-Bike</p><p class="text-xs text-gray-600">Herr Müller, Cube Reaction Hybrid</p></div>'
            + '<div class="p-2.5 bg-green-50 rounded-lg"><p class="text-sm font-semibold text-gray-800">14:00 - Lieferant Telefonat</p><p class="text-xs text-gray-600">Giant DE, Saison-Konditionen</p></div>'
            + '</div>';

        // ── Offene Aufgaben Widget ──
        var auf = document.getElementById('wAufgabenContent');
        var aufBadge = document.getElementById('wAufgabenCount');
        if (aufBadge) aufBadge.textContent = '5+';
        if (auf) auf.innerHTML = '<div class="space-y-2">'
            + '<div class="flex items-start space-x-2"><input type="checkbox" class="mt-0.5 rounded border-gray-300 accent-orange-500" disabled><span class="text-sm text-red-600">BWA Februar hochladen ⏰</span></div>'
            + '<div class="flex items-start space-x-2"><input type="checkbox" class="mt-0.5 rounded border-gray-300 accent-orange-500" disabled><span class="text-sm text-gray-700">Schaufenster-Deko Frühjahr</span></div>'
            + '<div class="flex items-start space-x-2"><input type="checkbox" class="mt-0.5 rounded border-gray-300 accent-orange-500" disabled><span class="text-sm text-gray-700">Google-Bewertungen beantworten</span></div>'
            + '<div class="flex items-start space-x-2"><input type="checkbox" class="mt-0.5 rounded border-gray-300 accent-orange-500" disabled><span class="text-sm text-gray-700">Inventur E-Bike-Akkus</span></div>'
            + '<div class="flex items-start space-x-2"><input type="checkbox" class="mt-0.5 rounded border-gray-300 accent-orange-500" disabled><span class="text-sm text-gray-700">Werkstatt-Preisliste aktualisieren</span></div>'
            + '</div>';

        // ── Marketing Widget ──
        var mkt = document.getElementById('wMarketingContent');
        if (mkt) mkt.innerHTML = '<div class="space-y-3">'
            + '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">Social Media Posts</span><span class="font-bold text-blue-600">12 / Monat</span></div>'
            + '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">Google-Bewertung</span><span class="font-bold text-green-600">4.6 ⭐</span></div>'
            + '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">Website-Besucher</span><span class="font-bold text-purple-600">847</span></div>'
            + '</div>';

        // ── Team Widget ──
        var team = document.getElementById('wTeamContent');
        if (team) team.innerHTML = '<div class="space-y-2">'
            + '<div class="flex items-center justify-between"><div class="flex items-center space-x-2"><span>🏢</span><span class="text-sm font-semibold text-gray-800">Max M.</span></div><span class="text-xs text-green-600">● aktiv</span></div>'
            + '<div class="flex items-center justify-between"><div class="flex items-center space-x-2"><span>💰</span><span class="text-sm font-semibold text-gray-800">Lisa K.</span></div><span class="text-xs text-green-600">● aktiv</span></div>'
            + '<div class="flex items-center justify-between"><div class="flex items-center space-x-2"><span>🔧</span><span class="text-sm font-semibold text-gray-800">Tom S.</span></div><span class="text-xs text-green-600">● aktiv</span></div>'
            + '<div class="flex items-center justify-between"><div class="flex items-center space-x-2"><span>🔧</span><span class="text-sm font-semibold text-gray-800">Sarah B.</span></div><span class="text-xs text-yellow-600">● Urlaub</span></div>'
            + '</div>';

        // ── Controlling Widget ──
        var ctrl = document.getElementById('wControllingContent');
        if (ctrl) ctrl.innerHTML = '<div class="space-y-3">'
            + '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">Umsatz Jan</span><span class="font-bold text-gray-800">52.300 €</span></div>'
            + '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">Rohertrag</span><span class="font-bold text-green-600">38,2%</span></div>'
            + '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">Personalkosten</span><span class="font-bold text-orange-600">22,1%</span></div>'
            + '<div class="w-full bg-gray-200 rounded-full h-1.5 mt-1"><div class="bg-green-500 h-1.5 rounded-full" style="width:65%"></div></div>'
            + '<p class="text-[10px] text-gray-400 text-right">Ziel: 55.000 € (95%)</p>'
            + '</div>';

        // ── Support Widget ──
        var sup = document.getElementById('wSupportContent');
        var supBadge = document.getElementById('wSupportCount');
        if (supBadge) supBadge.textContent = '2';
        if (sup) sup.innerHTML = '<div class="space-y-2">'
            + '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">Offene Tickets</span><span class="font-bold text-yellow-600">2</span></div>'
            + '<div class="flex items-center justify-between"><span class="text-sm text-gray-600">Gelöst diese Woche</span><span class="font-bold text-green-600">3</span></div>'
            + '<div class="p-2 bg-yellow-50 rounded-lg mt-1"><p class="text-xs text-gray-700">📨 WaWi-Import fehlerhaft – <span class="text-yellow-600 font-semibold">In Bearbeitung</span></p></div>'
            + '</div>';

        // ── Wissen Widget ──
        var wis = document.getElementById('wWissenContent');
        if (wis) wis.innerHTML = '<div class="space-y-2">'
            + '<div class="p-2 bg-blue-50 rounded-lg"><p class="text-sm font-semibold text-gray-800">📖 E-Bike Verkaufsargumente 2026</p><p class="text-[10px] text-gray-500">Neu • vor 2 Tagen</p></div>'
            + '<div class="p-2 bg-green-50 rounded-lg"><p class="text-sm font-semibold text-gray-800">🎥 Video: Frühjahrs-Check Workshop</p><p class="text-[10px] text-gray-500">Akademie • vor 5 Tagen</p></div>'
            + '<div class="p-2 bg-purple-50 rounded-lg"><p class="text-sm font-semibold text-gray-800">📋 Checkliste Saison-Start</p><p class="text-[10px] text-gray-500">Best Practice • vor 1 Woche</p></div>'
            + '</div>';

        // ── Nachrichten HQ Widget ──
        var msg = document.getElementById('wNachrichtenContent');
        if (msg) msg.innerHTML = '<div class="space-y-2">'
            + '<div class="p-2 bg-orange-50 rounded-lg"><p class="text-sm font-semibold text-gray-800">📢 Neue Saison-Konditionen Giant</p><p class="text-[10px] text-gray-500">HQ • vor 1 Tag</p></div>'
            + '<div class="p-2 bg-blue-50 rounded-lg"><p class="text-sm font-semibold text-gray-800">📅 Inhaber-Call am 05.03.</p><p class="text-[10px] text-gray-500">HQ • vor 3 Tagen</p></div>'
            + '</div>';

        // ── Monatsfokus Widget ──
        var mfContent = document.getElementById('homeMonatsfokusContent');
        var mfMonat = document.getElementById('homeMonatsfokusMonat');
        if (mfMonat) mfMonat.textContent = 'Februar 2026';
        if (mfContent) mfContent.innerHTML = '<p class="font-bold text-gray-800">Frühjahrs-Offensive starten</p>'
            + '<p class="text-xs text-gray-500 mt-1">Schaufenster umgestalten, E-Bike Probefahrt-Aktion, Social Media Push</p>';

        // ── Jahresziele Widget ──
        var jzContent = document.getElementById('homeJahreszieleContent');
        var jzCount = document.getElementById('homeJahreszieleCount');
        if (jzCount) jzCount.textContent = '3 Ziele';
        if (jzContent) jzContent.innerHTML = ''
            + '<div class="mb-2"><div class="flex justify-between text-xs"><span class="font-semibold text-gray-700 truncate">Umsatz 650.000 €</span><span>8%</span></div><div class="w-full bg-gray-200 rounded-full h-1.5 mt-0.5"><div class="bg-vit-orange h-1.5 rounded-full" style="width:8%"></div></div></div>'
            + '<div class="mb-2"><div class="flex justify-between text-xs"><span class="font-semibold text-gray-700 truncate">Rohertrag ≥ 38%</span><span>100%</span></div><div class="w-full bg-gray-200 rounded-full h-1.5 mt-0.5"><div class="bg-green-500 h-1.5 rounded-full" style="width:100%"></div></div></div>';

        // ── Journal Widget ──
        var jContent = document.getElementById('homeJournalContent');
        var jDatum = document.getElementById('homeJournalDatum');
        if (jDatum) jDatum.textContent = '14.02.2026';
        if (jContent) jContent.innerHTML = '<div class="flex items-center space-x-2 mb-1"><span>😊</span><span class="text-sm font-semibold">Partnergespräch</span></div>'
            + '<p class="text-xs text-gray-500 line-clamp-2">Guter Start ins neue Jahr. Umsatz leicht über Plan, Werkstattauslastung steigt.</p>';

        // ── Maßnahmen Widget ──
        var maContent = document.getElementById('homeMassnahmenContent');
        var maCount = document.getElementById('homeMassnahmenCount');
        if (maCount) maCount.textContent = '2 offen';
        if (maContent) maContent.innerHTML = '<p class="text-sm text-gray-700 mb-1">• Frühjahrs-Schaufenster bis KW 10</p>'
            + '<p class="text-sm text-gray-700 mb-1">• Google Ads Budget erhöhen</p>';

        // ── Kalender: inject demo events ──
        _fillDemoKalender();

    }, 200);
}

function _fillDemoKalender() {
    // If kalender module is loaded, inject demo termine
    if (typeof window.kalTermine === 'undefined') window.kalTermine = [];
    var today = new Date();
    var y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
    var demoTermine = [
        { id:'demo-1', title:'Werkstatt-Meeting', date:_dStr(y,m,d), time:'09:00', endTime:'09:45', type:'meeting', user:'all', notes:'Wochenbesprechung', ganztaegig:false },
        { id:'demo-2', title:'Kundenberatung E-Bike', date:_dStr(y,m,d), time:'11:30', endTime:'12:15', type:'beratung', user:'all', notes:'Herr Müller, Cube Reaction Hybrid', ganztaegig:false },
        { id:'demo-3', title:'Lieferant Giant DE', date:_dStr(y,m,d), time:'14:00', endTime:'14:30', type:'sonstig', user:'all', notes:'Saison-Konditionen besprechen', ganztaegig:false },
        { id:'demo-4', title:'Probefahrt-Tag E-MTB', date:_dStr(y,m,d+2), time:'10:00', endTime:'17:00', type:'event', user:'all', notes:'Aktionstag mit Testbikes', ganztaegig:false },
        { id:'demo-5', title:'BWA-Abgabe', date:_dStr(y,m,d+5), time:'00:00', endTime:null, type:'deadline', user:'all', notes:'Monatliche BWA an HQ', ganztaegig:true },
        { id:'demo-6', title:'Inhaber-Call', date:_dStr(y,m,d+7), time:'10:00', endTime:'11:00', type:'meeting', user:'all', notes:'Monatlicher Netzwerk-Call', ganztaegig:false },
        { id:'demo-7', title:'Frühjahrs-Aktion Start', date:_dStr(y,m,d+10), time:'00:00', endTime:null, type:'event', user:'all', notes:'Rabattaktion E-Bikes', ganztaegig:true }
    ];
    window.kalTermine = demoTermine;
    // Re-render if kalender view is visible
    if (typeof window.kalRenderActive === 'function') {
        try { window.kalRenderActive(); } catch(e) {}
    }
}

function _dStr(y, m, d) {
    var dt = new Date(y, m, d);
    return dt.toISOString().slice(0, 10);
}


// ═══════════════════════════════════════════════════════════════════
//  STRANGLER FIG: window.* registration for onclick compatibility
// ═══════════════════════════════════════════════════════════════════

const _exports = {addWidget,showDashboardTab,loadDashboardWidgets,loadWidgetPipeline,loadWidgetSuccess,loadWidgetTermine,loadWidgetAufgaben,quickToggleTodo,loadWidgetMarketing,loadWidgetTeam,loadWidgetControlling,loadWidgetSupport,loadWidgetWissen,loadWidgetNachrichten,getKWMonday,getKWSunday,fillDemoWidgets};

Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });

console.log('[home.js] ✅ Module loaded – ' + Object.keys(_exports).length + ' exports registered');

// === Window Exports (onclick handlers) ===
window.addWidget = addWidget;
window.showDashboardTab = showDashboardTab;
window.toggleDashboardEdit = toggleDashboardEdit;
