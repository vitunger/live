/**
 * views/todo.js – Aufgaben-Modul v2.0 (Todoist-Inspired)
 * vit:bikes Partner-Portal
 * 
 * Extracted from index.html lines 18637-19318
 * Phase B: Basis-Views (Strangler Fig Pattern)
 * 
 * Dependencies:
 *   - sb (Supabase client) via window.sb
 *   - sbUser, sbProfile via window globals
 *   - escH() / escapeHtml() via window
 *   - triggerPush() via window (for assignment notifications)
 *   - t() via window (i18n function)
 * 
 * Exports all 32+ functions to window.* for onclick compatibility.
 */

// ═══════════════════════════════════════════════════════════════
// STATE & CONSTANTS
// ═══════════════════════════════════════════════════════════════

const todoState = {
    todos: [],
    sections: [],
    labels: [],
    comments: {},
    teamMembers: [],
    templates: [],
    attachments: {},
    filter: 'all',
    view: 'list',    // 'list' | 'board' | 'stats'
    search: '',
    selectedId: null,
    collapsedSecs: {},
    dragId: null      // for list drag & drop
};

const TODO_TODAY = new Date().toISOString().slice(0, 10);

const TODO_PRIO = {
    dringend: { icon: '🔴', border: 'border-red-400', bg: 'bg-red-500', sort: -1 },
    hoch:     { icon: '🟠', border: 'border-yellow-500', bg: 'bg-yellow-500', sort: 0 },
    normal:   { icon: '🟡', border: 'border-gray-300', bg: 'bg-gray-400', sort: 1 },
    niedrig:  { icon: '🟢', border: 'border-green-400', bg: 'bg-green-500', sort: 2 }
};

const TODO_CAT = {
    verkauf:  { icon: '💰', label: 'Verkauf' },
    werkstatt:{ icon: '🔧', label: 'Werkstatt' },
    marketing:{ icon: '📣', label: 'Marketing' },
    admin:    { icon: '📋', label: 'Admin' },
    sonstig:  { icon: '📌', label: 'Sonstiges' }
};

const TODO_SRC = {
    system: { icon: '🤖', label: 'System', cls: 'bg-blue-50 text-blue-600 border border-blue-100' },
    hq:     { icon: '🏢', label: 'HQ', cls: 'bg-purple-50 text-purple-600 border border-purple-100' }
};

// ═══════════════════════════════════════════════════════════════
// HELPER: safe access to globals
// ═══════════════════════════════════════════════════════════════

function _sb()        { return window.sb; }
function _sbUser()    { return window.sbUser; }
function _sbProfile() { return window.sbProfile; }
function _escH(s)     { return (window.escH || window.escapeHtml || (x => x))(s); }
function _t(key)      { return (window.t || (k => k))(key); }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

// ═══════════════════════════════════════════════════════════════
// DATA LOADING
// ═══════════════════════════════════════════════════════════════

export async function loadTodos() {
    // ── Demo Mode: inject fake todos ──
    if (window.DEMO_ACTIVE && window.DEMO_DATA && window.DEMO_DATA.todos) {
        todoState.todos = window.DEMO_DATA.todos;
        todoState.sections = [{ id: 'demo-s1', name: 'Eingang', sort_order: 0 }, { id: 'demo-s2', name: 'Diese Woche', sort_order: 1 }];
        todoState.labels = [];
        todoState.teamMembers = window.DEMO_DATA.mitarbeiter || [];
        todoState.templates = [];
        var sbI = document.getElementById('todoSbInitials');
        var sbS = document.getElementById('todoSbStore');
        if (sbI) sbI.textContent = 'SE';
        if (sbS) sbS.textContent = 'vit:bikes Grafrath';
        todoRender();
        return;
    }
    try {
        var sid = _sbProfile() ? _sbProfile().standort_id : null;
        var isHQ = _sbProfile() && _sbProfile().is_hq;

        // Todos (with new fields)
        var myId = window.sbUser ? window.sbUser.id : null;
        var q = _sb().from('todos').select('*, zugewiesen:zugewiesen_an(name)')
            .order('prio_sort', { ascending: true })
            .order('faellig_am', { ascending: true, nullsFirst: false });
        if (isHQ) {
            // HQ: nur eigene Todos (erstellt oder zugewiesen)
            if (myId) q = q.or('erstellt_von.eq.' + myId + ',zugewiesen_an.eq.' + myId);
        } else if (sid) {
            q = q.eq('standort_id', sid);
        }
        var r = await q;
        todoState.todos = (!r.error && r.data) ? r.data : [];

        // Sections
        var sq = _sb().from('todo_sections').select('*').order('sort_order', { ascending: true });
        if (isHQ) {
            // HQ: globale Sections (standort_id null) oder eigene
            sq = sq.is('standort_id', null);
        } else if (sid) {
            sq = sq.eq('standort_id', sid);
        }
        var sr = await sq;
        todoState.sections = (!sr.error && sr.data) ? sr.data : [];

        // Ensure "Eingang" section exists
        if (!todoState.sections.find(function(s) { return s.name === 'Eingang'; })) {
            var ins = await _sb().from('todo_sections').insert({ name: 'Eingang', standort_id: sid, sort_order: 0 }).select();
            if (ins.data && ins.data[0]) todoState.sections.unshift(ins.data[0]);
        }

        // Labels
        var lq = _sb().from('todo_labels').select('*').order('name');
        if (!isHQ && sid) lq = lq.or('standort_id.eq.' + sid + ',standort_id.is.null');
        var lr = await lq;
        todoState.labels = (!lr.error && lr.data) ? lr.data : [];

        // Team Members (for assignee dropdown)
        try {
            var tq = _sb().from('users').select('id, name, vorname, nachname').eq('status', 'aktiv');
            if (!isHQ && sid) tq = tq.eq('standort_id', sid);
            var tr = await tq;
            todoState.teamMembers = (!tr.error && tr.data) ? tr.data : [];
        } catch(e) { todoState.teamMembers = []; }

        // Templates
        try {
            var tmq = _sb().from('todo_templates').select('*, todo_template_items(*)').order('name');
            var tmr = await tmq;
            todoState.templates = (!tmr.error && tmr.data) ? tmr.data : [];
        } catch(e) { todoState.templates = []; }

        // Store info in sidebar
        var sbI = document.getElementById('todoSbInitials');
        var sbS = document.getElementById('todoSbStore');
        if (sbI && _sbProfile()) sbI.textContent = (_sbProfile().name || '??').split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2);
        if (sbS && _sbProfile()) sbS.textContent = _sbProfile().standort_name || 'Mein Standort';

    } catch (e) { console.warn('loadTodos:', e); _showToast('Fehler beim Laden der Aufgaben', 'error'); }
    todoRender();
}

// ═══════════════════════════════════════════════════════════════
// COUNTS & FILTERS
// ═══════════════════════════════════════════════════════════════

export function todoCounts() {
    var parents = todoState.todos.filter(function(t) { return !t.parent_id; });
    return {
        open:    parents.filter(function(t) { return !t.erledigt; }).length,
        today:   parents.filter(function(t) { return !t.erledigt && t.faellig_am === TODO_TODAY; }).length,
        overdue: parents.filter(function(t) { return !t.erledigt && t.faellig_am && t.faellig_am < TODO_TODAY; }).length,
        done:    parents.filter(function(t) { return t.erledigt; }).length
    };
}

export function todoSetFilter(f) {
    todoState.filter = f;
    var titles = { all: 'Alle Aufgaben', heute: 'Heute', ueberfaellig: 'Überfällig', done: 'Erledigt' };
    var h1 = document.getElementById('todoHeaderTitle');
    if (h1) h1.textContent = titles[f] || 'Aufgaben';
    // Sidebar highlight
    document.querySelectorAll('.todo-f2').forEach(function(b) {
        b.className = 'todo-f2 w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-[13px] text-gray-600 hover:bg-gray-200';
    });
    var btn = document.querySelector('.todo-f2[data-tf2="' + f + '"]');
    if (btn) btn.className = 'todo-f2 w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-[13px] bg-white shadow-sm text-gray-900 font-semibold';
    // KPI highlight
    document.querySelectorAll('.todo-kpi').forEach(function(b) { b.style.background = ''; b.style.boxShadow = ''; });
    var kpiColors = { all: '#fafaf9', heute: '#fff7ed', ueberfaellig: '#fef2f2', done: '#f0fdf4' };
    var kpiBtn = document.querySelector('.todo-kpi[data-kpi="' + f + '"]');
    if (kpiBtn) { kpiBtn.style.background = kpiColors[f] || ''; kpiBtn.style.boxShadow = '0 0 0 1px #e7e5e4'; }
    todoRender();
}

export function todoSetView(v) {
    todoState.view = v;
    var lb = document.getElementById('todoViewListBtn');
    var bb = document.getElementById('todoViewBoardBtn');
    var sb = document.getElementById('todoViewStatsBtn');
    var activeClass = 'px-2 py-1 rounded-md text-[11px] bg-white text-gray-900 shadow-sm';
    var inactiveClass = 'px-2 py-1 rounded-md text-[11px] text-gray-500 hover:text-gray-700';
    if (lb) lb.className = v === 'list' ? activeClass : inactiveClass;
    if (bb) bb.className = v === 'board' ? activeClass : inactiveClass;
    if (sb) sb.className = v === 'stats' ? activeClass : inactiveClass;
    // Hide quick-add in stats view
    var qa = document.getElementById('todoQuickAddArea');
    if (qa) qa.style.display = v === 'stats' ? 'none' : '';
    todoRender();
}

export function todoSearchChanged() {
    todoState.search = (document.getElementById('todoSearchInput') || {}).value || '';
    todoRender();
}

export function todoFilteredParents() {
    var f = todoState.filter, s = todoState.search.toLowerCase();
    return todoState.todos.filter(function(t) {
        if (t.parent_id) return false;
        if (s && t.titel.toLowerCase().indexOf(s) === -1 && (!t.beschreibung || t.beschreibung.toLowerCase().indexOf(s) === -1)) return false;
        if (f === 'all') return !t.erledigt;
        if (f === 'heute') return !t.erledigt && t.faellig_am === TODO_TODAY;
        if (f === 'ueberfaellig') return !t.erledigt && t.faellig_am && t.faellig_am < TODO_TODAY;
        if (f === 'done') return t.erledigt;
        return !t.erledigt;
    });
}

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

export function todoRender() {
    var c = todoCounts();
    // KPIs
    var e1 = document.getElementById('kpiOpen2');     if (e1) e1.textContent = c.open;
    var e2 = document.getElementById('kpiToday2');    if (e2) e2.textContent = c.today;
    var e3 = document.getElementById('kpiOverdue2');  if (e3) e3.textContent = c.overdue;
    var e4 = document.getElementById('kpiDone2');     if (e4) e4.textContent = c.done;
    // Header sub
    var hs = document.getElementById('todoHeaderSub');
    if (hs) hs.textContent = c.open + ' offen · ' + c.today + ' heute · ' + c.overdue + ' überfällig';
    // Sidebar badges
    var ba = document.getElementById('tfBadgeAll');    if (ba) { ba.textContent = c.open;    ba.classList.toggle('hidden', !c.open); }
    var bh = document.getElementById('tfBadgeHeute');  if (bh) { bh.textContent = c.today;   bh.classList.toggle('hidden', !c.today); }
    var bu = document.getElementById('tfBadgeUeber');  if (bu) { bu.textContent = c.overdue;  bu.classList.toggle('hidden', !c.overdue); }
    var bd = document.getElementById('tfBadgeDone');   if (bd) { bd.textContent = c.done;     bd.classList.toggle('hidden', !c.done); }
    // Sidebar badge in nav
    var navBadge = document.getElementById('todoSidebarBadge');
    if (navBadge) navBadge.textContent = c.open;

    // Quick Add
    var qa = document.getElementById('todoQuickAddArea');
    if (qa) qa.innerHTML = todoQuickAddHTML();

    // List or Board or Stats
    var area = document.getElementById('todoListArea');
    if (!area) return;
    if (todoState.view === 'list') area.innerHTML = todoListHTML();
    else if (todoState.view === 'board') area.innerHTML = todoBoardHTML();
    else if (todoState.view === 'stats') area.innerHTML = todoStatsHTML();

    // Detail panel
    todoRenderDetail();
}

// ── Quick Add HTML ──
export function todoQuickAddHTML() {
    return '<div id="todoQAWrapper">' +
        '<button onclick="todoOpenQuickAdd()" id="todoQABtn" class="w-full flex items-center space-x-2 px-4 py-2 text-left text-sm text-gray-400 hover:text-vit-orange border border-dashed border-gray-200 hover:border-vit-orange rounded-xl group">' +
        '<span class="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-vit-orange flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="text-gray-300 group-hover:text-vit-orange"><path d="M12 5v14M5 12h14"/></svg></span>' +
        '<span>Aufgabe hinzufügen...</span></button>' +
        '<div id="todoQAForm" class="hidden border border-vit-orange/30 bg-white rounded-xl overflow-hidden" style="box-shadow:0 4px 20px rgba(249,115,22,0.08)">' +
        '<div class="px-4 pt-3 pb-1"><input id="todoQATitle" placeholder="Was muss erledigt werden?" class="w-full text-sm text-gray-800 placeholder-gray-400 font-medium outline-none" onkeydown="todoQAKeydown(event)"></div>' +
        '<div class="flex items-center space-x-2 px-4 pb-3 flex-wrap">' +
        '<input type="date" id="todoQADate" class="text-xs px-2 py-1 border border-gray-200 rounded-md outline-none focus:border-vit-orange">' +
        '<select id="todoQAPrio" class="text-xs px-2 py-1 border border-gray-200 rounded-md outline-none focus:border-vit-orange">' +
        '<option value="normal">🟡 Normal</option><option value="dringend">🔴 Dringend</option><option value="hoch">🟠 Hoch</option><option value="niedrig">🟢 Niedrig</option></select>' +
        '<select id="todoQASec" class="text-xs px-2 py-1 border border-gray-200 rounded-md outline-none focus:border-vit-orange">' +
        todoState.sections.map(function(s) { return '<option value="' + s.id + '">' + _escH(s.name) + '</option>'; }).join('') +
        '</select>' +
        '<div class="ml-auto flex space-x-1">' +
        '<button onclick="todoCloseQuickAdd()" class="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-md">Abbrechen</button>' +
        '<button onclick="todoSubmitQuickAdd()" class="px-4 py-1 text-xs font-semibold text-white rounded-md bg-vit-orange hover:opacity-90">Hinzufügen</button>' +
        '</div></div></div></div>';
}

export function todoOpenQuickAdd() {
    var btn = document.getElementById('todoQABtn');   if (btn)  btn.classList.add('hidden');
    var form = document.getElementById('todoQAForm'); if (form) form.classList.remove('hidden');
    var inp = document.getElementById('todoQATitle'); if (inp)  inp.focus();
}

export function todoCloseQuickAdd() {
    var btn = document.getElementById('todoQABtn');   if (btn)  btn.classList.remove('hidden');
    var form = document.getElementById('todoQAForm'); if (form) form.classList.add('hidden');
    var inp = document.getElementById('todoQATitle'); if (inp)  inp.value = '';
}

export function todoQAKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); todoSubmitQuickAdd(); }
    if (e.key === 'Escape') todoCloseQuickAdd();
}

export async function todoSubmitQuickAdd() {
    var title = (document.getElementById('todoQATitle') || {}).value;
    if (!title || !title.trim()) return;
    var due = (document.getElementById('todoQADate') || {}).value || null;
    var prio = (document.getElementById('todoQAPrio') || {}).value || 'normal';
    var secIdRaw = (document.getElementById('todoQASec') || {}).value;
    var secId = (secIdRaw && secIdRaw.trim()) ? secIdRaw.trim() : null;
    var prioSort = (TODO_PRIO[prio] || {}).sort || 1;
    var newId = null;
    try {
        var resp = await _sb().from('todos').insert({
            standort_id: _sbProfile() ? _sbProfile().standort_id : null,
            erstellt_von: _sbUser() ? _sbUser().id : null,
            titel: title.trim(), faellig_am: due, prio: prio, prio_sort: prioSort,
            kategorie: 'sonstig', section_id: secId, erledigt: false
        }).select('*, zugewiesen:zugewiesen_an(name)');
        if (resp.error) throw resp.error;
        if (resp.data && resp.data[0]) {
            todoState.todos.unshift(resp.data[0]);
            newId = resp.data[0].id;
            if (typeof window.logAudit === 'function') window.logAudit('todo_erstellt', 'todo', { titel: title.trim(), prio: prio });
        }
    } catch (e) { console.error('QA add:', e); }
    todoCloseQuickAdd();
    if (newId) {
        todoState.selectedId = newId;
        todoRender();
        todoLoadComments(newId);
    } else {
        todoRender();
    }
}

// ── List View HTML ──
export function todoListHTML() {
    var parents = todoFilteredParents();
    var secs = todoState.sections.slice().sort(function(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    var h = '';

    secs.forEach(function(sec) {
        var tasks = parents.filter(function(t) { return t.section_id === sec.id; });
        if (!tasks.length && todoState.filter !== 'all') return;
        var collapsed = todoState.collapsedSecs[sec.id];
        h += '<div class="mb-1">';
        // Section header
        h += '<div class="group flex items-center space-x-2 py-1 px-1 cursor-pointer" onclick="todoToggleSec(\'' + sec.id + '\')">';
        h += '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-gray-400" style="transform:rotate(' + (collapsed ? '0' : '90') + 'deg);transition:transform 150ms"><path d="M9 18l6-6-6-6"/></svg>';
        h += '<h3 class="font-bold text-gray-500 uppercase" style="font-size:11px;letter-spacing:0.05em">' + _escH(sec.name) + '</h3>';
        h += '<span class="text-gray-400 text-[10px]">' + tasks.length + '</span>';
        h += '<div class="flex-1"></div>';
        if (sec.name !== 'Eingang') h += '<button onclick="event.stopPropagation();todoDeleteSec(\'' + sec.id + '\')" class="text-gray-400 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100">✕</button>';
        h += '</div>';
        // Tasks
        if (!collapsed) {
            if (tasks.length) {
                tasks.forEach(function(t) { h += todoRowHTML(t, 0); });
            } else {
                h += '<p class="text-xs text-gray-400 italic px-3 py-1">Keine Aufgaben</p>';
            }
        }
        h += '</div>';
    });

    // Unsectioned tasks
    var unsec = parents.filter(function(t) { return !t.section_id || !todoState.sections.find(function(s) { return s.id === t.section_id; }); });
    if (unsec.length) {
        h += '<div class="mb-1"><div class="flex items-center space-x-2 py-1 px-1"><h3 class="font-bold text-gray-500 uppercase" style="font-size:11px;letter-spacing:0.05em">Ohne Sektion</h3><span class="text-gray-400 text-[10px]">' + unsec.length + '</span></div>';
        unsec.forEach(function(t) { h += todoRowHTML(t, 0); });
        h += '</div>';
    }

    // Add section button
    h += '<div class="mt-3 px-1"><button onclick="todoAddSecPrompt()" class="text-xs text-gray-400 hover:text-vit-orange flex items-center space-x-1">' +
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>' +
        '<span>Sektion hinzufügen</span></button></div>';

    return h;
}

// ── Single Task Row ──
export function todoRowHTML(task, depth) {
    var subs = todoState.todos.filter(function(t) { return t.parent_id === task.id; });
    var doneSubs = subs.filter(function(s) { return s.erledigt; }).length;
    var p = TODO_PRIO[task.prio] || TODO_PRIO.normal;
    var isOver = !task.erledigt && task.faellig_am && task.faellig_am < TODO_TODAY;
    var isToday = task.faellig_am === TODO_TODAY;
    var isSel = todoState.selectedId === task.id;
    var isSystem = task.typ === 'system';
    var isHQTask = task.typ === 'hq';
    var isEsc = task.eskalation_stufe >= 2;
    var assigneeName = task.zugewiesen && task.zugewiesen.name ? task.zugewiesen.name : null;
    var fmtD = task.faellig_am ? task.faellig_am.slice(8) + '.' + task.faellig_am.slice(5, 7) + '.' : '';
    var lbls = (task.labels || []).map(function(lid) { return todoState.labels.find(function(l) { return l.id === lid; }); }).filter(Boolean);
    var isBlocked = task.blocked_by && !todoState.todos.find(function(t) { return t.id === task.blocked_by && t.erledigt; });

    var h = '<div style="margin-left:' + (depth > 0 ? 28 : 0) + 'px">';
    h += '<div draggable="true" ondragstart="todoListDragStart(event,\'' + task.id + '\')" ondragover="todoListDragOver(event)" ondrop="todoListDrop(event,\'' + task.id + '\')" class="group flex items-start space-x-2 px-3 py-2 rounded-lg cursor-pointer ' + (isSel ? 'bg-yellow-50' : 'hover:bg-gray-50') + ' ' + (task.erledigt ? 'opacity-40' : '') + ' ' + (isBlocked ? 'border-l-2 border-red-300' : '') + '" ' + (isSel ? 'style="box-shadow:0 0 0 1px #fed7aa"' : '') + ' onclick="todoSelect(\'' + task.id + '\')">';

    // Checkbox
    h += '<button onclick="event.stopPropagation();todoToggle(\'' + task.id + '\')" class="mt-1 flex-shrink-0 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ' + (task.erledigt ? p.bg + ' border-transparent' : p.border) + '">';
    if (task.erledigt) h += '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"><path d="M5 13l4 4L19 7"/></svg>';
    h += '</button>';

    // Expand toggle for subtasks
    if (subs.length > 0 && depth === 0) {
        h += '<button onclick="event.stopPropagation();todoToggleExpand(\'' + task.id + '\')" class="mt-1 text-gray-400 hover:text-gray-600">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="transform:rotate(' + (todoState.collapsedSecs['sub_' + task.id] ? '0' : '90') + 'deg);transition:transform 150ms"><path d="M9 18l6-6-6-6"/></svg></button>';
    }

    // Content
    h += '<div class="flex-1 min-w-0">';
    // Source badges
    if (isSystem || isHQTask || isEsc) {
        h += '<div class="flex items-center space-x-1 flex-wrap">';
        if (isSystem && TODO_SRC.system) h += '<span class="text-[9px] px-1 rounded font-bold ' + TODO_SRC.system.cls + '">' + TODO_SRC.system.icon + ' ' + TODO_SRC.system.label + '</span>';
        if (isHQTask && TODO_SRC.hq) h += '<span class="text-[9px] px-1 rounded font-bold ' + TODO_SRC.hq.cls + '">' + TODO_SRC.hq.icon + ' ' + TODO_SRC.hq.label + '</span>';
        if (isEsc) h += '<span class="text-[9px] px-1 rounded bg-red-50 text-red-600 border border-red-100 font-bold">🔥 Eskaliert</span>';
        h += '</div>';
    }
    // Title
    h += '<p class="text-sm leading-snug ' + (task.erledigt ? 'line-through text-gray-400' : 'text-gray-800 font-medium') + '">' + _escH(task.titel) + '</p>';
    // Meta
    h += '<div class="flex items-center mt-1 flex-wrap" style="gap:6px">';
    h += '<span class="text-gray-400 text-[10px]">' + (TODO_CAT[task.kategorie] || TODO_CAT.sonstig).icon + '</span>';
    if (fmtD && !task.erledigt) h += '<span class="font-semibold text-[10px] ' + (isOver ? 'text-red-500' : isToday ? 'text-yellow-600' : 'text-gray-400') + '">📅 ' + fmtD + (isOver ? ' überfällig' : isToday ? ' heute' : '') + '</span>';
    lbls.forEach(function(l) { h += '<span class="font-semibold px-1 rounded-full text-[9px]" style="background:' + l.color + '18;color:' + l.color + '">' + _escH(l.name) + '</span>'; });
    if (subs.length > 0) h += '<span class="text-gray-400 text-[10px]">☑ ' + doneSubs + '/' + subs.length + '</span>';
    if (assigneeName) h += '<span class="text-gray-400 text-[10px]">👤 ' + _escH(assigneeName) + '</span>';
    if (task.wiederkehrend) h += '<span class="text-blue-400 text-[10px]">🔄 ' + ({taeglich:'Tägl.',woechentlich:'Wöch.',monatlich:'Mon.',jaehrlich:'Jährl.'}[task.wiederkehrend]||'') + '</span>';
    if (isBlocked) h += '<span class="text-red-400 text-[10px] font-semibold">🔒 Blockiert</span>';
    h += '</div></div>';

    // Hover actions
    h += '<div class="flex space-x-1 opacity-0 group-hover:opacity-100">';
    if (depth === 0) h += '<button onclick="event.stopPropagation();todoAddSubPrompt(\'' + task.id + '\')" class="p-1 text-gray-400 hover:text-yellow-600 rounded" title="Unteraufgabe"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></button>';
    h += '<button onclick="event.stopPropagation();todoDelete(\'' + task.id + '\')" class="p-1 text-gray-400 hover:text-red-500 rounded" title="Löschen"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
    h += '</div></div>';

    // Subtasks
    if (subs.length > 0 && !todoState.collapsedSecs['sub_' + task.id]) {
        subs.forEach(function(st) { h += todoRowHTML(st, depth + 1); });
    }

    // Subtask progress bar
    if (subs.length > 0 && depth === 0 && !todoState.collapsedSecs['sub_' + task.id]) {
        var pct = subs.length ? Math.round(doneSubs / subs.length * 100) : 0;
        h += '<div style="margin-left:28px" class="mt-1 mb-2 rounded-full overflow-hidden bg-gray-100 h-1"><div class="h-full bg-green-400 rounded-full" style="width:' + pct + '%;transition:width 150ms"></div></div>';
    }
    h += '</div>';
    return h;
}

// ── Board View HTML ──
export function todoBoardHTML() {
    var parents = todoFilteredParents();
    var secs = todoState.sections.slice().sort(function(a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    var h = '<div class="mt-2 flex space-x-3 overflow-x-auto pb-4" style="min-height:400px">';

    secs.forEach(function(sec) {
        var tasks = parents.filter(function(t) { return t.section_id === sec.id; });
        h += '<div class="flex-shrink-0" style="width:260px" ondragover="event.preventDefault();event.dataTransfer.dropEffect=\'move\'" ondrop="todoBoardDrop(event,\'' + sec.id + '\')">';
        h += '<div class="flex items-center space-x-2 px-2 py-1 mb-2 group"><h3 class="font-bold text-gray-500 uppercase" style="font-size:11px;letter-spacing:0.05em">' + _escH(sec.name) + '</h3>';
        h += '<span class="font-bold rounded-full bg-gray-200 text-gray-500 flex items-center justify-center" style="width:18px;height:18px;font-size:9px">' + tasks.length + '</span>';
        if (sec.name !== 'Eingang') h += '<button onclick="todoDeleteSec(\'' + sec.id + '\')" class="text-gray-400 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 ml-auto" title="Sektion löschen">✕</button>';
        h += '</div>';
        h += '<div class="space-y-2">';

        tasks.forEach(function(task) {
            var subs = todoState.todos.filter(function(t) { return t.parent_id === task.id; });
            var doneSubs = subs.filter(function(s) { return s.erledigt; }).length;
            var p = TODO_PRIO[task.prio] || TODO_PRIO.normal;
            var isOver = !task.erledigt && task.faellig_am && task.faellig_am < TODO_TODAY;
            var isToday = task.faellig_am === TODO_TODAY;
            var fmtD = task.faellig_am ? task.faellig_am.slice(8) + '.' + task.faellig_am.slice(5, 7) + '.' : '';
            var lbls = (task.labels || []).map(function(lid) { return todoState.labels.find(function(l) { return l.id === lid; }); }).filter(Boolean);
            var assigneeName = task.zugewiesen && task.zugewiesen.name ? task.zugewiesen.name : null;

            h += '<div draggable="true" ondragstart="event.dataTransfer.setData(\'text/plain\',\'' + task.id + '\')" onclick="todoSelect(\'' + task.id + '\')" class="bg-white rounded-xl border border-gray-200 p-3 cursor-pointer hover:shadow-md ' + (task.erledigt ? 'opacity-40' : '') + '" style="cursor:grab">';
            // Labels
            if (lbls.length) {
                h += '<div class="flex space-x-1 mb-1 flex-wrap">';
                lbls.forEach(function(l) { h += '<span class="font-bold px-1 rounded-full" style="font-size:8px;background:' + l.color + '18;color:' + l.color + '">' + _escH(l.name) + '</span>'; });
                h += '</div>';
            }
            // Checkbox + Title
            h += '<div class="flex items-start space-x-2">';
            h += '<button onclick="event.stopPropagation();todoToggle(\'' + task.id + '\')" class="mt-1 flex-shrink-0 rounded-full border-2 flex items-center justify-center ' + (task.erledigt ? p.bg + ' border-transparent' : p.border) + '" style="width:15px;height:15px">';
            if (task.erledigt) h += '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"><path d="M5 13l4 4L19 7"/></svg>';
            h += '</button>';
            h += '<p class="text-xs leading-snug flex-1 ' + (task.erledigt ? 'line-through text-gray-400' : 'text-gray-800 font-medium') + '">' + _escH(task.titel) + '</p></div>';
            // Meta
            h += '<div class="flex items-center mt-1 flex-wrap" style="gap:5px">';
            if (fmtD) h += '<span class="font-semibold text-[9px] ' + (isOver ? 'text-red-500' : isToday ? 'text-yellow-600' : 'text-gray-400') + '">📅 ' + fmtD + '</span>';
            if (subs.length) h += '<span class="text-gray-400 text-[9px]">☑ ' + doneSubs + '/' + subs.length + '</span>';
            if (task.typ !== 'manual') h += '<span class="px-1 rounded font-bold text-[8px] ' + (task.typ === 'system' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500') + '">' + (task.typ === 'system' ? '🤖' : '🏢') + '</span>';
            h += '<div class="flex-1"></div>';
            if (assigneeName) {
                var ini = assigneeName.split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2);
                h += '<div class="rounded-full bg-gray-200 flex items-center justify-center" style="width:18px;height:18px" title="' + _escH(assigneeName) + '"><span class="font-bold text-gray-500" style="font-size:7px">' + ini + '</span></div>';
            }
            h += '</div>';
            // Progress bar
            if (subs.length) {
                var pct = Math.round(doneSubs / subs.length * 100);
                h += '<div class="mt-1 rounded-full overflow-hidden bg-gray-100" style="height:4px"><div class="h-full bg-green-400 rounded-full" style="width:' + pct + '%"></div></div>';
            }
            h += '</div>';
        });

        if (!tasks.length) h += '<div class="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center"><p class="text-gray-400 text-[11px]">Hierher ziehen</p></div>';
        h += '</div></div>';
    });
    h += '</div>';
    return h;
}

// ── Board drag & drop ──
export async function todoBoardDrop(e, secId) {
    e.preventDefault();
    var id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    var t = todoState.todos.find(function(x) { return x.id === id; });
    if (!t) return;
    t.section_id = secId;
    todoRender();
    try { await _sb().from('todos').update({ section_id: secId }).eq('id', id); } catch (err) { console.warn(err); }
}

// ── Detail Panel ──
export function todoRenderDetail() {
    var panel = document.getElementById('todoDetailPanel');
    if (!panel) return;
    if (!todoState.selectedId) { panel.classList.add('hidden'); return; }
    var task = todoState.todos.find(function(t) { return t.id === todoState.selectedId; });
    if (!task) { panel.classList.add('hidden'); todoState.selectedId = null; return; }
    panel.classList.remove('hidden');

    var subs = todoState.todos.filter(function(t) { return t.parent_id === task.id; });
    var doneSubs = subs.filter(function(s) { return s.erledigt; }).length;
    var sec = todoState.sections.find(function(s) { return s.id === task.section_id; });
    var p = TODO_PRIO[task.prio] || TODO_PRIO.normal;
    var comments = todoState.comments[task.id] || [];
    var lbls = (task.labels || []).map(function(lid) { return todoState.labels.find(function(l) { return l.id === lid; }); }).filter(Boolean);

    var h = '';
    // Header
    h += '<div class="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">';
    h += '<div class="flex items-center space-x-2 text-xs text-gray-400">';
    if (sec) h += '<span class="font-medium">' + _escH(sec.name) + '</span>';
    if (task.typ !== 'manual' && TODO_SRC[task.typ]) h += '<span class="px-1 py-0 rounded font-bold text-[9px] ' + TODO_SRC[task.typ].cls + '">' + TODO_SRC[task.typ].icon + ' ' + TODO_SRC[task.typ].label + '</span>';
    h += '</div>';
    h += '<button onclick="todoCloseDetail()" class="p-1 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
    h += '</div>';

    // Scrollable content
    h += '<div class="flex-1 overflow-y-auto min-h-0"><div class="p-4 space-y-4">';

    // Title with checkbox
    h += '<div class="flex items-start space-x-2">';
    h += '<button onclick="todoToggle(\'' + task.id + '\')" class="mt-1 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ' + (task.erledigt ? p.bg + ' border-transparent' : p.border) + '">';
    if (task.erledigt) h += '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"><path d="M5 13l4 4L19 7"/></svg>';
    h += '</button>';
    h += '<input value="' + _escH(task.titel).replace(/"/g, '&quot;') + '" onblur="todoUpdateField(\'' + task.id + '\',\'titel\',this.value)" onkeydown="if(event.key===\'Enter\')this.blur()" class="flex-1 font-semibold outline-none bg-transparent ' + (task.erledigt ? 'line-through text-gray-400' : 'text-gray-800') + '" style="font-size:15px">';
    h += '</div>';

    // Description
    h += '<textarea onblur="todoUpdateField(\'' + task.id + '\',\'beschreibung\',this.value)" placeholder="Beschreibung..." rows="5" class="w-full text-sm text-gray-600 placeholder-gray-400 outline-none bg-gray-50 rounded-lg p-2 border border-gray-100 focus:border-vit-orange/30" style="resize:vertical;min-height:80px">' + (task.beschreibung || '') + '</textarea>';

    // Attachments - with drag & drop
    h += '<div id="todoDropZone" class="bg-gray-50 rounded-xl p-3 border-2 border-dashed border-gray-200 transition-colors" ondragover="event.preventDefault();event.stopPropagation();this.classList.add(\'border-vit-orange\',\'bg-orange-50\');this.classList.remove(\'border-gray-200\')" ondragleave="this.classList.remove(\'border-vit-orange\',\'bg-orange-50\');this.classList.add(\'border-gray-200\')" ondrop="event.preventDefault();event.stopPropagation();this.classList.remove(\'border-vit-orange\',\'bg-orange-50\');this.classList.add(\'border-gray-200\');todoDropFiles(\'' + task.id + '\',event.dataTransfer.files)">';
    h += '<div class="flex items-center justify-between mb-2">';
    h += '<label class="font-bold text-gray-400 uppercase text-[9px]" style="letter-spacing:0.05em">📎 Anhänge</label>';
    h += '<label class="flex items-center space-x-1 cursor-pointer px-3 py-1.5 bg-vit-orange text-white text-xs font-semibold rounded-lg hover:opacity-90">';
    h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>';
    h += '<span>Datei hochladen</span>';
    h += '<input type="file" class="hidden" multiple onchange="todoDropFiles(\'' + task.id + '\',this.files)">';
    h += '</label></div>';
    h += '<div class="space-y-1" id="todoDetailAttachments"><p class="text-xs text-gray-400 italic">Dateien hierher ziehen oder Button klicken</p></div>';
    h += '</div>';

    // Properties grid
    h += '<div class="grid grid-cols-2 gap-2">';
    h += '<div><label class="font-bold text-gray-400 uppercase text-[9px]" style="letter-spacing:0.05em">Fällig</label>';
    h += '<input type="date" value="' + (task.faellig_am || '') + '" onchange="todoUpdateField(\'' + task.id + '\',\'faellig_am\',this.value||null)" class="mt-1 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-vit-orange/50"></div>';
    h += '<div><label class="font-bold text-gray-400 uppercase text-[9px]" style="letter-spacing:0.05em">Priorität</label>';
    h += '<select onchange="todoUpdatePrio(\'' + task.id + '\',this.value)" class="mt-1 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-vit-orange/50">';
    Object.keys(TODO_PRIO).forEach(function(k) { h += '<option value="' + k + '"' + (task.prio === k ? ' selected' : '') + '>' + TODO_PRIO[k].icon + ' ' + k[0].toUpperCase() + k.slice(1) + '</option>'; });
    h += '</select></div>';
    h += '<div><label class="font-bold text-gray-400 uppercase text-[9px]" style="letter-spacing:0.05em">Kategorie</label>';
    h += '<select onchange="todoUpdateField(\'' + task.id + '\',\'kategorie\',this.value)" class="mt-1 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-vit-orange/50">';
    Object.keys(TODO_CAT).forEach(function(k) { h += '<option value="' + k + '"' + (task.kategorie === k ? ' selected' : '') + '>' + TODO_CAT[k].icon + ' ' + TODO_CAT[k].label + '</option>'; });
    h += '</select></div>';
    h += '<div><label class="font-bold text-gray-400 uppercase text-[9px]" style="letter-spacing:0.05em">Sektion</label>';
    h += '<select onchange="todoUpdateField(\'' + task.id + '\',\'section_id\',this.value)" class="mt-1 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-vit-orange/50">';
    h += '<option value="">—</option>';
    todoState.sections.forEach(function(s) { h += '<option value="' + s.id + '"' + (task.section_id === s.id ? ' selected' : '') + '>' + _escH(s.name) + '</option>'; });
    h += '</select></div>';
    // Zugewiesen an (Mitarbeiter-Dropdown)
    h += '<div><label class="font-bold text-gray-400 uppercase text-[9px]" style="letter-spacing:0.05em">Zugewiesen an</label>';
    h += '<select onchange="todoUpdateField(\'' + task.id + '\',\'zugewiesen_an\',this.value||null)" class="mt-1 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-vit-orange/50">';
    h += '<option value="">— niemand —</option>';
    (todoState.teamMembers || []).forEach(function(u) { h += '<option value="' + u.id + '"' + (task.zugewiesen_an === u.id ? ' selected' : '') + '>👤 ' + _escH(u.name || (u.vorname + ' ' + u.nachname)) + '</option>'; });
    h += '</select></div>';
    // Wiederkehrend
    h += '<div><label class="font-bold text-gray-400 uppercase text-[9px]" style="letter-spacing:0.05em">Wiederkehrend</label>';
    h += '<select onchange="todoUpdateField(\'' + task.id + '\',\'wiederkehrend\',this.value||null)" class="mt-1 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-vit-orange/50">';
    h += '<option value=""' + (!task.wiederkehrend ? ' selected' : '') + '>— einmalig —</option>';
    h += '<option value="taeglich"' + (task.wiederkehrend === 'taeglich' ? ' selected' : '') + '>🔄 Täglich</option>';
    h += '<option value="woechentlich"' + (task.wiederkehrend === 'woechentlich' ? ' selected' : '') + '>🔄 Wöchentlich</option>';
    h += '<option value="monatlich"' + (task.wiederkehrend === 'monatlich' ? ' selected' : '') + '>🔄 Monatlich</option>';
    h += '<option value="jaehrlich"' + (task.wiederkehrend === 'jaehrlich' ? ' selected' : '') + '>🔄 Jährlich</option>';
    h += '</select></div>';
    h += '</div>';

    // Blocked by (Abhängigkeit)
    var blockedTask = task.blocked_by ? todoState.todos.find(function(t) { return t.id === task.blocked_by; }) : null;
    h += '<div><label class="font-bold text-gray-400 uppercase text-[9px]" style="letter-spacing:0.05em">Blockiert durch</label>';
    if (blockedTask && !blockedTask.erledigt) {
        h += '<div class="mt-1 flex items-center space-x-2 p-2 bg-red-50 rounded-lg border border-red-100"><span class="text-red-500 text-xs">🔒</span><span class="text-xs text-red-700 font-medium">' + _escH(blockedTask.titel) + '</span>';
        h += '<button onclick="todoUpdateField(\'' + task.id + '\',\'blocked_by\',null)" class="ml-auto text-red-400 hover:text-red-600 text-xs">✕</button></div>';
    } else if (blockedTask && blockedTask.erledigt) {
        h += '<div class="mt-1 flex items-center space-x-2 p-2 bg-green-50 rounded-lg"><span class="text-xs text-green-600">✅ ' + _escH(blockedTask.titel) + ' (erledigt)</span>';
        h += '<button onclick="todoUpdateField(\'' + task.id + '\',\'blocked_by\',null)" class="ml-auto text-gray-400 hover:text-gray-600 text-xs">✕</button></div>';
    } else {
        h += '<select onchange="todoUpdateField(\'' + task.id + '\',\'blocked_by\',this.value||null)" class="mt-1 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-vit-orange/50">';
        h += '<option value="">— keine Abhängigkeit —</option>';
        todoState.todos.filter(function(t) { return t.id !== task.id && !t.parent_id; }).forEach(function(t) {
            h += '<option value="' + t.id + '">' + (t.erledigt ? '✅ ' : '') + _escH(t.titel.substring(0, 40)) + '</option>';
        });
        h += '</select>';
    }
    h += '</div>';

    // Erinnerung
    h += '<div class="flex items-center space-x-3 py-1">';
    h += '<label class="flex items-center space-x-2 cursor-pointer"><input type="checkbox" ' + (task.erinnerung_push ? 'checked' : '') + ' onchange="todoUpdateField(\'' + task.id + '\',\'erinnerung_push\',this.checked)" class="accent-orange-500 rounded"><span class="text-xs text-gray-600">🔔 Push-Erinnerung</span></label>';
    h += '<label class="flex items-center space-x-2 cursor-pointer"><input type="checkbox" ' + (task.erinnerung_email_faellig ? 'checked' : '') + ' onchange="todoUpdateField(\'' + task.id + '\',\'erinnerung_email_faellig\',this.checked)" class="accent-orange-500 rounded"><span class="text-xs text-gray-600">📧 E-Mail</span></label>';
    h += '</div>';

    // Labels
    h += '<div><label class="font-bold text-gray-400 uppercase text-[9px]" style="letter-spacing:0.05em">Labels</label>';
    h += '<div class="flex flex-wrap gap-1 mt-1">';
    todoState.labels.forEach(function(l) {
        var active = (task.labels || []).indexOf(l.id) >= 0;
        h += '<button onclick="todoToggleLabel(\'' + task.id + '\',\'' + l.id + '\')" class="font-semibold px-2 py-1 rounded-full border text-[10px] ' + (active ? '' : 'opacity-50 hover:opacity-80') + '" style="background:' + l.color + '15;color:' + l.color + ';border-color:' + (active ? l.color : 'transparent') + ';' + (active ? 'box-shadow:0 0 0 1px ' + l.color + '40' : '') + '">' + _escH(l.name) + '</button>';
    });
    h += '</div></div>';

    // Subtasks
    h += '<div><div class="flex items-center justify-between mb-2"><label class="font-bold text-gray-400 uppercase text-[9px]" style="letter-spacing:0.05em">Unteraufgaben</label>';
    if (subs.length) h += '<span class="text-gray-400 text-[10px]">' + doneSubs + '/' + subs.length + '</span>';
    h += '</div>';
    if (subs.length) {
        var pct = Math.round(doneSubs / subs.length * 100);
        h += '<div class="rounded-full overflow-hidden bg-gray-100 mb-2" style="height:5px"><div class="h-full bg-green-400 rounded-full" style="width:' + pct + '%"></div></div>';
    }
    subs.forEach(function(s) {
        var sp = TODO_PRIO[s.prio] || TODO_PRIO.normal;
        h += '<div class="flex items-center space-x-2 py-1 group">';
        h += '<button onclick="todoToggle(\'' + s.id + '\')" class="flex-shrink-0 rounded-full border-2 flex items-center justify-center ' + (s.erledigt ? sp.bg + ' border-transparent' : sp.border) + '" style="width:15px;height:15px">';
        if (s.erledigt) h += '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"><path d="M5 13l4 4L19 7"/></svg>';
        h += '</button>';
        h += '<span class="flex-1 text-xs ' + (s.erledigt ? 'line-through text-gray-400' : 'text-gray-700') + '">' + _escH(s.titel) + '</span>';
        h += '<button onclick="todoDelete(\'' + s.id + '\')" class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 text-[10px]">✕</button>';
        h += '</div>';
    });
    h += '<div class="flex items-center space-x-2 mt-1">';
    h += '<div class="rounded-full border-2 border-dashed border-gray-300 flex-shrink-0" style="width:15px;height:15px"></div>';
    h += '<input id="todoDetailSubInput" placeholder="Unteraufgabe..." class="flex-1 px-1 py-1 border-b border-gray-100 outline-none focus:border-vit-orange/30 bg-transparent text-xs" onkeydown="if(event.key===\'Enter\')todoAddSubFromDetail(\'' + task.id + '\')">';
    h += '</div></div>';

    // Comments
    h += '<div><label class="font-bold text-gray-400 uppercase text-[9px]" style="letter-spacing:0.05em">Kommentare</label>';
    h += '<div class="mt-2 space-y-2" id="todoDetailComments">';
    comments.forEach(function(c) {
        var cName = c.users ? c.users.name : 'Du';
        var cInit = cName.split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2);
        var cd = new Date(c.created_at);
        var cDate = String(cd.getDate()).padStart(2, '0') + '.' + String(cd.getMonth() + 1).padStart(2, '0') + '.';
        h += '<div class="bg-gray-50 rounded-lg p-2">';
        h += '<div class="flex items-center space-x-1 mb-1"><div class="rounded-full bg-yellow-100 flex items-center justify-center" style="width:16px;height:16px"><span class="font-bold text-yellow-600 text-[7px]">' + cInit + '</span></div>';
        h += '<span class="font-semibold text-gray-600 text-[10px]">' + _escH(cName) + '</span>';
        h += '<span class="text-gray-400 text-[9px]">' + cDate + '</span></div>';
        h += '<p class="text-gray-600 text-xs">' + _escH(c.inhalt) + '</p></div>';
    });
    h += '</div>';
    h += '<div class="flex space-x-2 mt-2"><input id="todoCommentInput" placeholder="Kommentar... (@Name für Erwähnung)" class="flex-1 px-2 py-1 border border-gray-200 rounded-lg outline-none focus:border-vit-orange/30 text-xs" onkeydown="if(event.key===\'Enter\')todoAddCommentWithMentions(\'' + task.id + '\')">';
    h += '</div></div>';

    h += '</div></div>';

    // Footer
    h += '<div class="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">';
    var cDate = task.created_at ? new Date(task.created_at) : null;
    var cStr = cDate ? String(cDate.getDate()).padStart(2, '0') + '.' + String(cDate.getMonth() + 1).padStart(2, '0') + '.' : '';
    h += '<span class="text-gray-400 text-[9px]">Erstellt: ' + cStr + '</span>';
    h += '<button onclick="todoDelete(\'' + task.id + '\');todoCloseDetail()" class="text-red-400 hover:text-red-600 font-semibold text-[10px]">Löschen</button>';
    h += '</div>';

    panel.innerHTML = h;
    // Load comments and attachments async
    todoLoadComments(task.id);
    todoLoadAttachments(task.id).then(function() { todoRenderAttachments(task.id); });
}

// ═══════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════

export function todoSelect(id) {
    todoState.selectedId = (todoState.selectedId === id) ? null : id;
    todoRender();
}

export function todoCloseDetail() { todoState.selectedId = null; todoRender(); }

export function todoToggleSec(id) { todoState.collapsedSecs[id] = !todoState.collapsedSecs[id]; todoRender(); }

export function todoToggleExpand(id) { todoState.collapsedSecs['sub_' + id] = !todoState.collapsedSecs['sub_' + id]; todoRender(); }

export async function todoToggle(id) {
    var t = todoState.todos.find(function(x) { return x.id === id; });
    if (!t) return;
    var nowDone = !t.erledigt;
    t.erledigt = nowDone;
    t.erledigt_am = nowDone ? new Date().toISOString() : null;
    // If completing parent → complete all subtasks (batch update)
    var subtaskIds = [];
    if (nowDone && !t.parent_id) {
        todoState.todos.forEach(function(s) {
            if (s.parent_id === id && !s.erledigt) {
                s.erledigt = true;
                s.erledigt_am = new Date().toISOString();
                subtaskIds.push(s.id);
            }
        });
    }
    todoRender();
    try {
        await _sb().from('todos').update({ erledigt: nowDone, erledigt_am: t.erledigt_am }).eq('id', id);
        if (subtaskIds.length > 0) await _sb().from('todos').update({ erledigt: true, erledigt_am: new Date().toISOString() }).in('id', subtaskIds);
    } catch (e) { console.warn(e); }
}

export async function todoDelete(id) {
    // Delete subtasks too
    todoState.todos = todoState.todos.filter(function(t) { return t.id !== id && t.parent_id !== id; });
    todoRender();
    try { await _sb().from('todos').delete().eq('id', id); } catch (e) { console.warn(e); }
}

export async function todoUpdateField(id, field, value) {
    var t = todoState.todos.find(function(x) { return x.id === id; });
    if (!t) return;
    t[field] = value;
    todoRender();
    var upd = {};
    upd[field] = value;
    try { await _sb().from('todos').update(upd).eq('id', id); } catch (e) { console.warn(e); }
    if (field === 'zugewiesen_an' && value && value !== (_sbUser() ? _sbUser().id : '')) {
        if (window.triggerPush) {
            window.triggerPush([value], '📋 Aufgabe zugewiesen', (_sbProfile() ? _sbProfile().name : 'Jemand') + ': ' + (t.titel || '').substring(0, 80), '/?view=todo', 'push_aufgabe_zugewiesen');
        }
    }
}

export async function todoUpdatePrio(id, prio) {
    var t = todoState.todos.find(function(x) { return x.id === id; });
    if (!t) return;
    t.prio = prio;
    t.prio_sort = (TODO_PRIO[prio] || {}).sort || 1;
    todoRender();
    try { await _sb().from('todos').update({ prio: prio, prio_sort: t.prio_sort }).eq('id', id); } catch (e) { console.warn(e); }
}

export async function todoToggleLabel(taskId, labelId) {
    var t = todoState.todos.find(function(x) { return x.id === taskId; });
    if (!t) return;
    var arr = t.labels || [];
    var idx = arr.indexOf(labelId);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(labelId);
    t.labels = arr;
    todoRender();
    try { await _sb().from('todos').update({ labels: arr }).eq('id', taskId); } catch (e) { console.warn(e); }
}

// ═══════════════════════════════════════════════════════════════
// SUBTASKS
// ═══════════════════════════════════════════════════════════════

export async function todoAddSubFromDetail(parentId) {
    var inp = document.getElementById('todoDetailSubInput');
    var title = inp ? inp.value.trim() : '';
    if (!title) return;
    var parent = todoState.todos.find(function(t) { return t.id === parentId; });
    try {
        var resp = await _sb().from('todos').insert({
            standort_id: _sbProfile() ? _sbProfile().standort_id : null,
            erstellt_von: _sbUser() ? _sbUser().id : null,
            titel: title, parent_id: parentId,
            section_id: parent ? parent.section_id : null,
            kategorie: parent ? parent.kategorie : 'sonstig',
            prio: 'normal', prio_sort: 1, erledigt: false
        }).select('*, zugewiesen:zugewiesen_an(name)');
        if (resp.error) throw resp.error;
        if (resp.data && resp.data[0]) todoState.todos.push(resp.data[0]);
    } catch (e) { console.error(e); }
    todoRender();
}

export function todoAddSubPrompt(parentId) {
    var title = prompt('Unteraufgabe:');
    if (!title || !title.trim()) return;
    var parent = todoState.todos.find(function(t) { return t.id === parentId; });
    _sb().from('todos').insert({
        standort_id: _sbProfile() ? _sbProfile().standort_id : null,
        erstellt_von: _sbUser() ? _sbUser().id : null,
        titel: title.trim(), parent_id: parentId,
        section_id: parent ? parent.section_id : null,
        kategorie: parent ? parent.kategorie : 'sonstig',
        prio: 'normal', prio_sort: 1, erledigt: false
    }).select('*, zugewiesen:zugewiesen_an(name)').then(function(r) {
        if (r.data && r.data[0]) todoState.todos.push(r.data[0]);
        todoRender();
    });
}

// ═══════════════════════════════════════════════════════════════
// SECTIONS
// ═══════════════════════════════════════════════════════════════

export async function todoAddSecPrompt() {
    var name = prompt('Name der neuen Sektion:');
    if (!name || !name.trim()) return;
    try {
        var resp = await _sb().from('todo_sections').insert({
            name: name.trim(),
            standort_id: _sbProfile() ? _sbProfile().standort_id : null,
            sort_order: todoState.sections.length
        }).select();
        if (resp.error) throw resp.error;
        if (resp.data && resp.data[0]) todoState.sections.push(resp.data[0]);
    } catch (e) { _showToast('Fehler: ' + e.message, 'error'); }
    todoRender();
}

export async function todoDeleteSec(id) {
    if (!confirm(_t('confirm_delete_section'))) return;
    var inbox = todoState.sections.find(function(s) { return s.name === 'Eingang'; });
    var inboxId = inbox ? inbox.id : null;
    // Move tasks to inbox
    todoState.todos.forEach(function(t) { if (t.section_id === id) t.section_id = inboxId; });
    todoState.sections = todoState.sections.filter(function(s) { return s.id !== id; });
    todoRender();
    try {
        if (inboxId) await _sb().from('todos').update({ section_id: inboxId }).eq('section_id', id);
        await _sb().from('todo_sections').delete().eq('id', id);
    } catch (e) { console.warn(e); }
}

// ═══════════════════════════════════════════════════════════════
// COMMENTS
// ═══════════════════════════════════════════════════════════════

export async function todoLoadComments(taskId) {
    try {
        var r = await _sb().from('todo_comments').select('*, users(name)').eq('todo_id', taskId).order('created_at', { ascending: true });
        todoState.comments[taskId] = (!r.error && r.data) ? r.data : [];
        // Re-render comments section only
        var el = document.getElementById('todoDetailComments');
        if (el && todoState.selectedId === taskId) {
            var comments = todoState.comments[taskId] || [];
            var ch = '';
            comments.forEach(function(c) {
                var cName = c.users ? c.users.name : 'Du';
                var cInit = cName.split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2);
                var cd = new Date(c.created_at);
                var cDate = String(cd.getDate()).padStart(2, '0') + '.' + String(cd.getMonth() + 1).padStart(2, '0') + '.';
                ch += '<div class="bg-gray-50 rounded-lg p-2"><div class="flex items-center space-x-1 mb-1"><div class="rounded-full bg-yellow-100 flex items-center justify-center" style="width:16px;height:16px"><span class="font-bold text-yellow-600 text-[7px]">' + cInit + '</span></div>';
                ch += '<span class="font-semibold text-gray-600 text-[10px]">' + _escH(cName) + '</span><span class="text-gray-400 text-[9px]">' + cDate + '</span></div>';
                ch += '<p class="text-gray-600 text-xs">' + _escH(c.inhalt) + '</p></div>';
            });
            if (!comments.length) ch = '<p class="text-xs text-gray-400 italic">Noch keine Kommentare.</p>';
            el.innerHTML = ch;
        }
    } catch (e) { console.warn(e); }
}

export async function todoAddComment(taskId) {
    var inp = document.getElementById('todoCommentInput');
    var text = inp ? inp.value.trim() : '';
    if (!text) return;
    try {
        var r = await _sb().from('todo_comments').insert({
            todo_id: taskId,
            user_id: _sbUser() ? _sbUser().id : null,
            inhalt: text
        }).select('*, users(name)');
        if (r.error) throw r.error;
        if (!todoState.comments[taskId]) todoState.comments[taskId] = [];
        if (r.data && r.data[0]) todoState.comments[taskId].push(r.data[0]);
        inp.value = '';
        todoLoadComments(taskId);
    } catch (e) { _showToast('Fehler: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// @MENTIONS IN COMMENTS
// ═══════════════════════════════════════════════════════════════

export async function todoAddCommentWithMentions(taskId) {
    var inp = document.getElementById('todoCommentInput');
    var text = inp ? inp.value.trim() : '';
    if (!text) return;
    // Parse @mentions - find @Name patterns and match to team members
    var mentions = [];
    var mentionRegex = /@(\S+(?:\s\S+)?)/g;
    var match;
    while ((match = mentionRegex.exec(text)) !== null) {
        var mName = match[1].toLowerCase();
        var found = todoState.teamMembers.find(function(u) {
            var fullName = (u.name || (u.vorname + ' ' + u.nachname)).toLowerCase();
            return fullName.indexOf(mName) === 0 || (u.vorname && u.vorname.toLowerCase() === mName);
        });
        if (found) mentions.push(found.id);
    }
    try {
        var r = await _sb().from('todo_comments').insert({
            todo_id: taskId,
            user_id: _sbUser() ? _sbUser().id : null,
            inhalt: text,
            mentions: mentions.length ? mentions : []
        }).select('*, users(name)');
        if (r.error) throw r.error;
        if (!todoState.comments[taskId]) todoState.comments[taskId] = [];
        if (r.data && r.data[0]) todoState.comments[taskId].push(r.data[0]);
        inp.value = '';
        todoLoadComments(taskId);
        // Send push notifications to mentioned users
        if (mentions.length && window.triggerPush) {
            var task = todoState.todos.find(function(t) { return t.id === taskId; });
            window.triggerPush(mentions, '💬 Du wurdest erwähnt', (_sbProfile() ? _sbProfile().name : 'Jemand') + ' in "' + (task ? task.titel.substring(0, 50) : 'Aufgabe') + '"', '/?view=todo', 'push_todo_mention');
        }
    } catch (e) { (typeof _showToast==="function"?_showToast:typeof showToast==="function"?showToast:function(m){console.warn(m)})('Fehler: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// LIST DRAG & DROP (Sortierung)
// ═══════════════════════════════════════════════════════════════

export function todoListDragStart(e, id) {
    todoState.dragId = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    e.target.closest('[draggable]').style.opacity = '0.5';
}

export function todoListDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

export async function todoListDrop(e, targetId) {
    e.preventDefault();
    e.stopPropagation();
    var dragId = todoState.dragId;
    if (!dragId || dragId === targetId) return;
    var dragTask = todoState.todos.find(function(t) { return t.id === dragId; });
    var targetTask = todoState.todos.find(function(t) { return t.id === targetId; });
    if (!dragTask || !targetTask) return;
    // Move to same section as target
    dragTask.section_id = targetTask.section_id;
    // Reorder: put dragged task right after target
    var secTasks = todoState.todos.filter(function(t) { return t.section_id === targetTask.section_id && !t.parent_id; });
    var targetIdx = secTasks.indexOf(targetTask);
    // Update sort_order for all tasks in section
    secTasks.forEach(function(t, i) { t.sort_order = i * 10; });
    dragTask.sort_order = (targetTask.sort_order || 0) + 5;
    todoState.dragId = null;
    todoRender();
    try {
        await _sb().from('todos').update({ section_id: dragTask.section_id, sort_order: dragTask.sort_order }).eq('id', dragId);
    } catch(e) { console.warn(e); }
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATES (Vorlagen)
// ═══════════════════════════════════════════════════════════════

export function todoShowTemplates() {
    var overlay = document.createElement('div');
    overlay.id = 'todoTemplateOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    var h = '<div onclick="event.stopPropagation()" style="background:white;border-radius:16px;padding:24px;width:520px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.25);">';
    h += '<div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold text-gray-800">📋 Aufgaben-Vorlagen</h3><button onclick="document.getElementById(\'todoTemplateOverlay\').remove()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>';

    if (todoState.templates.length) {
        todoState.templates.forEach(function(tmpl) {
            var items = tmpl.todo_template_items || [];
            h += '<div class="border border-gray-200 rounded-xl p-4 mb-3 hover:border-vit-orange/50 transition">';
            h += '<div class="flex items-center justify-between mb-2">';
            h += '<div><h4 class="font-semibold text-gray-800">' + _escH(tmpl.name) + '</h4>';
            if (tmpl.beschreibung) h += '<p class="text-xs text-gray-500">' + _escH(tmpl.beschreibung) + '</p>';
            h += '</div>';
            h += '<div class="flex space-x-1">';
            h += '<button onclick="todoApplyTemplate(\'' + tmpl.id + '\')" class="px-3 py-1 text-xs font-semibold text-white bg-vit-orange rounded-lg hover:opacity-90">Anwenden</button>';
            h += '<button onclick="todoDeleteTemplate(\'' + tmpl.id + '\')" class="px-2 py-1 text-xs text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50">✕</button>';
            h += '</div></div>';
            if (items.length) {
                h += '<div class="ml-2 space-y-1">';
                items.sort(function(a,b) { return (a.sort_order||0)-(b.sort_order||0); }).forEach(function(item) {
                    h += '<div class="flex items-center space-x-2 text-xs text-gray-600"><span class="w-3 h-3 rounded-full border-2 border-gray-300 flex-shrink-0"></span><span>' + _escH(item.titel) + '</span>';
                    if (item.relative_faelligkeit !== null) h += '<span class="text-gray-400">(+' + item.relative_faelligkeit + ' Tage)</span>';
                    h += '</div>';
                });
                h += '</div>';
            }
            h += '</div>';
        });
    } else {
        h += '<p class="text-gray-400 text-sm text-center py-8">Noch keine Vorlagen erstellt.</p>';
    }

    h += '<div class="mt-4 border-t pt-4"><h4 class="font-semibold text-gray-700 text-sm mb-3">Neue Vorlage erstellen</h4>';
    h += '<input id="tmplName" placeholder="Name der Vorlage" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2">';
    h += '<input id="tmplDesc" placeholder="Beschreibung (optional)" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2">';
    h += '<div id="tmplItems" class="space-y-1 mb-2"></div>';
    h += '<div class="flex space-x-2"><button onclick="todoTmplAddItem()" class="text-xs text-vit-orange hover:underline">+ Aufgabe hinzufügen</button></div>';
    h += '<button onclick="todoCreateTemplate()" class="mt-3 w-full py-2 text-sm font-semibold text-white bg-vit-orange rounded-lg hover:opacity-90">Vorlage speichern</button>';
    h += '</div></div>';
    overlay.innerHTML = h;
    document.body.appendChild(overlay);
}

var _tmplItemCount = 0;
export function todoTmplAddItem() {
    var container = document.getElementById('tmplItems');
    if (!container) return;
    _tmplItemCount++;
    var d = document.createElement('div');
    d.className = 'flex items-center space-x-2';
    d.innerHTML = '<input placeholder="Aufgabentitel" class="tmpl-item-title flex-1 px-2 py-1 border border-gray-200 rounded text-xs">' +
        '<input type="number" placeholder="Tage" class="tmpl-item-days w-16 px-2 py-1 border border-gray-200 rounded text-xs" title="Fällig nach X Tagen">' +
        '<button onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-600 text-xs">✕</button>';
    container.appendChild(d);
}

export async function todoCreateTemplate() {
    var name = (document.getElementById('tmplName') || {}).value;
    if (!name || !name.trim()) { _showToast('Name erforderlich', 'warning'); return; }
    var desc = (document.getElementById('tmplDesc') || {}).value || null;
    var items = [];
    document.querySelectorAll('#tmplItems > div').forEach(function(row) {
        var title = row.querySelector('.tmpl-item-title');
        var days = row.querySelector('.tmpl-item-days');
        if (title && title.value.trim()) {
            items.push({ titel: title.value.trim(), relative_faelligkeit: days && days.value ? parseInt(days.value) : null });
        }
    });
    try {
        var r = await _sb().from('todo_templates').insert({
            name: name.trim(), beschreibung: desc,
            standort_id: _sbProfile() ? _sbProfile().standort_id : null,
            erstellt_von: _sbUser() ? _sbUser().id : null
        }).select();
        if (r.error) throw r.error;
        if (r.data && r.data[0] && items.length) {
            var tmplId = r.data[0].id;
            var inserts = items.map(function(item, i) {
                return { template_id: tmplId, titel: item.titel, relative_faelligkeit: item.relative_faelligkeit, sort_order: i, prio: 'normal', kategorie: 'sonstig' };
            });
            await _sb().from('todo_template_items').insert(inserts);
        }
        _showToast('Vorlage gespeichert!', 'success');
        var ol = document.getElementById('todoTemplateOverlay');
        if (ol) ol.remove();
        await loadTodos();
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export async function todoApplyTemplate(templateId) {
    var tmpl = todoState.templates.find(function(t) { return t.id === templateId; });
    if (!tmpl) return;
    var items = (tmpl.todo_template_items || []).sort(function(a,b) { return (a.sort_order||0)-(b.sort_order||0); });
    if (!items.length) { _showToast('Vorlage hat keine Aufgaben', 'warning'); return; }
    var sid = _sbProfile() ? _sbProfile().standort_id : null;
    var uid = _sbUser() ? _sbUser().id : null;
    var inbox = todoState.sections.find(function(s) { return s.name === 'Eingang'; });
    var secId = inbox ? inbox.id : null;
    var today = new Date();
    try {
        var inserts = items.map(function(item) {
            var due = null;
            if (item.relative_faelligkeit !== null) {
                var d = new Date(today);
                d.setDate(d.getDate() + item.relative_faelligkeit);
                due = d.toISOString().slice(0, 10);
            }
            return {
                standort_id: sid, erstellt_von: uid, titel: item.titel,
                beschreibung: item.beschreibung || null, prio: item.prio || 'normal',
                prio_sort: (TODO_PRIO[item.prio] || TODO_PRIO.normal).sort,
                kategorie: item.kategorie || 'sonstig', section_id: secId,
                faellig_am: due, erledigt: false, template_id: templateId
            };
        });
        var r = await _sb().from('todos').insert(inserts).select('*, zugewiesen:zugewiesen_an(name)');
        if (r.error) throw r.error;
        if (r.data) r.data.forEach(function(t) { todoState.todos.unshift(t); });
        _showToast(items.length + ' Aufgaben aus "' + _escH(tmpl.name) + '" erstellt!', 'success');
        var ol = document.getElementById('todoTemplateOverlay');
        if (ol) ol.remove();
        todoRender();
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export async function todoDeleteTemplate(templateId) {
    if (!confirm('Vorlage wirklich löschen?')) return;
    try {
        await _sb().from('todo_template_items').delete().eq('template_id', templateId);
        await _sb().from('todo_templates').delete().eq('id', templateId);
        todoState.templates = todoState.templates.filter(function(t) { return t.id !== templateId; });
        _showToast('Vorlage gelöscht', 'success');
        var ol = document.getElementById('todoTemplateOverlay');
        if (ol) ol.remove();
        todoShowTemplates();
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// ATTACHMENTS (Datei-Anhänge)
// ═══════════════════════════════════════════════════════════════

export async function todoLoadAttachments(taskId) {
    try {
        var r = await _sb().from('todo_attachments').select('*').eq('todo_id', taskId).order('created_at', { ascending: false });
        todoState.attachments[taskId] = (!r.error && r.data) ? r.data : [];
    } catch(e) { todoState.attachments[taskId] = []; }
}

export async function todoDropFiles(taskId, files) {
    if (!files || !files.length) return;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (file.size > 10 * 1024 * 1024) { _showToast('Max. 10 MB: ' + file.name, 'warning'); continue; }
        var sid = _sbProfile() ? _sbProfile().standort_id : 'unknown';
        var path = sid + '/' + taskId + '/' + Date.now() + '_' + file.name;
        try {
            var upload = await _sb().storage.from('todo-attachments').upload(path, file);
            if (upload.error) throw upload.error;
            var r = await _sb().from('todo_attachments').insert({
                todo_id: taskId, user_id: _sbUser() ? _sbUser().id : null,
                dateiname: file.name, dateipfad: path,
                dateigroesse: file.size, mime_type: file.type
            }).select();
            if (r.error) throw r.error;
            if (!todoState.attachments[taskId]) todoState.attachments[taskId] = [];
            if (r.data && r.data[0]) todoState.attachments[taskId].unshift(r.data[0]);
            _showToast('📎 ' + file.name + ' hochgeladen', 'success');
        } catch(e) { _showToast('Fehler: ' + file.name + ' – ' + e.message, 'error'); }
    }
    todoRenderAttachments(taskId);
}

export async function todoUploadAttachment(taskId, fileInput) {
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
    var file = fileInput.files[0];
    if (file.size > 10 * 1024 * 1024) { _showToast('Max. 10 MB pro Datei', 'warning'); return; }
    var sid = _sbProfile() ? _sbProfile().standort_id : 'unknown';
    var path = sid + '/' + taskId + '/' + Date.now() + '_' + file.name;
    try {
        var upload = await _sb().storage.from('todo-attachments').upload(path, file);
        if (upload.error) throw upload.error;
        var r = await _sb().from('todo_attachments').insert({
            todo_id: taskId, user_id: _sbUser() ? _sbUser().id : null,
            dateiname: file.name, dateipfad: path,
            dateigroesse: file.size, mime_type: file.type
        }).select();
        if (r.error) throw r.error;
        if (!todoState.attachments[taskId]) todoState.attachments[taskId] = [];
        if (r.data && r.data[0]) todoState.attachments[taskId].unshift(r.data[0]);
        _showToast('📎 ' + file.name + ' hochgeladen', 'success');
        todoRenderAttachments(taskId);
    } catch(e) { _showToast('Upload-Fehler: ' + e.message, 'error'); }
}

export async function todoDeleteAttachment(taskId, attachId, path) {
    try {
        await _sb().storage.from('todo-attachments').remove([path]);
        await _sb().from('todo_attachments').delete().eq('id', attachId);
        todoState.attachments[taskId] = (todoState.attachments[taskId] || []).filter(function(a) { return a.id !== attachId; });
        todoRenderAttachments(taskId);
        _showToast('Anhang gelöscht', 'success');
    } catch(e) { _showToast('Fehler: ' + e.message, 'error'); }
}

export function todoRenderAttachments(taskId) {
    var el = document.getElementById('todoDetailAttachments');
    if (!el) return;
    var atts = todoState.attachments[taskId] || [];
    var h = '';
    atts.forEach(function(a) {
        var sizeStr = a.dateigroesse < 1024 ? a.dateigroesse + ' B' : (a.dateigroesse / 1024).toFixed(1) + ' KB';
        var icon = (a.mime_type || '').indexOf('image') === 0 ? '🖼️' : (a.mime_type || '').indexOf('pdf') !== -1 ? '📄' : '📎';
        h += '<div class="flex items-center space-x-2 py-1 group">';
        h += '<span class="text-sm">' + icon + '</span>';
        h += '<button onclick="todoDownloadAttachment(\'' + _escH(a.dateipfad) + '\')" class="text-xs text-blue-600 hover:underline flex-1 truncate text-left">' + _escH(a.dateiname) + '</button>';
        h += '<span class="text-gray-400 text-[9px]">' + sizeStr + '</span>';
        h += '<button onclick="todoDeleteAttachment(\'' + taskId + '\',\'' + a.id + '\',\'' + _escH(a.dateipfad) + '\')" class="text-gray-400 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100">✕</button>';
        h += '</div>';
    });
    if (!atts.length) h = '<p class="text-xs text-gray-400 italic">Keine Anhänge.</p>';
    el.innerHTML = h;
}

export async function todoDownloadAttachment(path) {
    try {
        var r = await _sb().storage.from('todo-attachments').createSignedUrl(path, 300);
        if (r.error) throw r.error;
        window.open(r.data.signedUrl, '_blank');
    } catch(e) { _showToast('Download-Fehler: ' + e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════════
// STATISTICS / REPORT VIEW
// ═══════════════════════════════════════════════════════════════

export function todoStatsHTML() {
    var all = todoState.todos.filter(function(t) { return !t.parent_id; });
    var done = all.filter(function(t) { return t.erledigt; });
    var open = all.filter(function(t) { return !t.erledigt; });
    var overdue = open.filter(function(t) { return t.faellig_am && t.faellig_am < TODO_TODAY; });

    // Erledigte pro KW (letzte 8 Wochen)
    var weekStats = {};
    var now = new Date();
    for (var w = 7; w >= 0; w--) {
        var d = new Date(now);
        d.setDate(d.getDate() - w * 7);
        var kwStart = new Date(d);
        kwStart.setDate(kwStart.getDate() - kwStart.getDay() + 1);
        var kwEnd = new Date(kwStart);
        kwEnd.setDate(kwEnd.getDate() + 6);
        var kwKey = 'KW' + getWeekNumber(kwStart);
        var kwStartISO = kwStart.toISOString().slice(0, 10);
        var kwEndISO = kwEnd.toISOString().slice(0, 10);
        weekStats[kwKey] = done.filter(function(t) {
            return t.erledigt_am && t.erledigt_am.slice(0, 10) >= kwStartISO && t.erledigt_am.slice(0, 10) <= kwEndISO;
        }).length;
    }

    // Durchschnittliche Bearbeitungszeit (Tage)
    var durationDays = [];
    done.forEach(function(t) {
        if (t.created_at && t.erledigt_am) {
            var diff = (new Date(t.erledigt_am) - new Date(t.created_at)) / (1000 * 60 * 60 * 24);
            if (diff >= 0 && diff < 365) durationDays.push(diff);
        }
    });
    var avgDuration = durationDays.length ? (durationDays.reduce(function(a,b){return a+b;}, 0) / durationDays.length).toFixed(1) : '—';

    // Pro Mitarbeiter
    var byMember = {};
    done.forEach(function(t) {
        var name = t.zugewiesen && t.zugewiesen.name ? t.zugewiesen.name : 'Nicht zugewiesen';
        byMember[name] = (byMember[name] || 0) + 1;
    });
    var memberArr = Object.keys(byMember).map(function(k) { return { name: k, count: byMember[k] }; })
        .sort(function(a,b) { return b.count - a.count; });

    // Pro Kategorie
    var byCat = {};
    all.forEach(function(t) {
        var cat = (TODO_CAT[t.kategorie] || TODO_CAT.sonstig).label;
        byCat[cat] = (byCat[cat] || 0) + 1;
    });

    var h = '<div class="space-y-4 mt-3">';

    // Top KPIs
    h += '<div class="grid grid-cols-4 gap-3">';
    h += _statsCard('Gesamt', all.length, '📊', 'gray');
    h += _statsCard('Erledigt', done.length, '✅', 'green');
    h += _statsCard('Offen', open.length, '📋', 'yellow');
    h += _statsCard('Überfällig', overdue.length, '🔴', 'red');
    h += '</div>';

    h += '<div class="grid grid-cols-2 gap-3">';
    h += _statsCard('Ø Bearbeitungszeit', avgDuration + ' Tage', '⏱️', 'blue');
    h += _statsCard('Erledigungsrate', all.length ? Math.round(done.length / all.length * 100) + '%' : '—', '📈', 'green');
    h += '</div>';

    // Wochenübersicht (einfaches Balkendiagramm)
    h += '<div class="bg-white rounded-xl border border-gray-200 p-4">';
    h += '<h4 class="font-bold text-gray-700 text-sm mb-3">Erledigte Aufgaben pro Woche</h4>';
    var maxWeek = Math.max.apply(null, Object.values(weekStats).concat([1]));
    h += '<div class="flex items-end space-x-2" style="height:120px">';
    Object.keys(weekStats).forEach(function(kw) {
        var val = weekStats[kw];
        var pct = Math.round(val / maxWeek * 100);
        h += '<div class="flex-1 flex flex-col items-center">';
        h += '<span class="text-[10px] text-gray-600 font-semibold mb-1">' + val + '</span>';
        h += '<div class="w-full bg-vit-orange/80 rounded-t" style="height:' + Math.max(pct, 4) + '%;min-height:4px;transition:height 0.3s"></div>';
        h += '<span class="text-[9px] text-gray-400 mt-1">' + kw + '</span>';
        h += '</div>';
    });
    h += '</div></div>';

    // Top Erlediger
    if (memberArr.length) {
        h += '<div class="bg-white rounded-xl border border-gray-200 p-4">';
        h += '<h4 class="font-bold text-gray-700 text-sm mb-3">🏆 Top Erlediger</h4>';
        memberArr.slice(0, 5).forEach(function(m, i) {
            var pct = Math.round(m.count / (memberArr[0].count || 1) * 100);
            h += '<div class="flex items-center space-x-3 mb-2">';
            h += '<span class="text-xs font-semibold text-gray-500 w-4">' + (i + 1) + '.</span>';
            h += '<span class="text-xs font-medium text-gray-700 w-32 truncate">' + _escH(m.name) + '</span>';
            h += '<div class="flex-1 bg-gray-100 rounded-full h-2"><div class="h-full bg-vit-orange rounded-full" style="width:' + pct + '%"></div></div>';
            h += '<span class="text-xs font-bold text-gray-600 w-8 text-right">' + m.count + '</span>';
            h += '</div>';
        });
        h += '</div>';
    }

    // Pro Kategorie
    h += '<div class="bg-white rounded-xl border border-gray-200 p-4">';
    h += '<h4 class="font-bold text-gray-700 text-sm mb-3">Aufgaben nach Kategorie</h4>';
    h += '<div class="flex flex-wrap gap-3">';
    Object.keys(byCat).forEach(function(cat) {
        h += '<div class="text-center"><span class="block text-xl font-bold text-gray-700">' + byCat[cat] + '</span><span class="text-[10px] text-gray-500">' + cat + '</span></div>';
    });
    h += '</div></div>';

    h += '</div>';
    return h;
}

function _statsCard(label, value, icon, color) {
    var bgMap = { gray:'bg-gray-50', green:'bg-green-50', yellow:'bg-yellow-50', red:'bg-red-50', blue:'bg-blue-50' };
    var textMap = { gray:'text-gray-700', green:'text-green-700', yellow:'text-yellow-700', red:'text-red-700', blue:'text-blue-700' };
    return '<div class="' + (bgMap[color]||'bg-gray-50') + ' rounded-xl p-3 text-center"><span class="text-lg">' + icon + '</span><p class="text-xl font-bold ' + (textMap[color]||'') + '">' + value + '</p><p class="text-[10px] text-gray-500">' + label + '</p></div>';
}

function getWeekNumber(d) {
    var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

// ═══════════════════════════════════════════════════════════════
// CREATE TODO FROM OTHER MODULES
// ═══════════════════════════════════════════════════════════════

export async function createTodoFromModule(opts) {
    // opts: { titel, beschreibung, referenz_typ, referenz_id, kategorie, prio, faellig_am, typ }
    if (!opts || !opts.titel) return null;
    var sid = _sbProfile() ? _sbProfile().standort_id : null;
    var uid = _sbUser() ? _sbUser().id : null;
    var inbox = todoState.sections.find(function(s) { return s.name === 'Eingang'; });
    var prio = opts.prio || 'normal';
    try {
        var r = await _sb().from('todos').insert({
            standort_id: sid, erstellt_von: uid,
            titel: opts.titel, beschreibung: opts.beschreibung || null,
            referenz_typ: opts.referenz_typ || null, referenz_id: opts.referenz_id || null,
            kategorie: opts.kategorie || 'sonstig', prio: prio,
            prio_sort: (TODO_PRIO[prio] || TODO_PRIO.normal).sort,
            faellig_am: opts.faellig_am || null,
            typ: opts.typ || 'system',
            section_id: inbox ? inbox.id : null,
            erledigt: false
        }).select('*, zugewiesen:zugewiesen_an(name)');
        if (r.error) throw r.error;
        if (r.data && r.data[0]) {
            todoState.todos.unshift(r.data[0]);
            _showToast('📋 Aufgabe erstellt: ' + opts.titel.substring(0, 40), 'success');
            return r.data[0];
        }
    } catch(e) { console.error('createTodoFromModule:', e); }
    return null;
}

// ═══════════════════════════════════════════════════════════════
// KALENDER INTEGRATION
// ═══════════════════════════════════════════════════════════════

export function todoGetCalendarEvents(year, month) {
    // Returns array of { date, title, prio, id } for the kalender module
    return todoState.todos.filter(function(t) {
        if (!t.faellig_am || t.erledigt || t.parent_id) return false;
        var d = t.faellig_am;
        var y = parseInt(d.slice(0, 4));
        var m = parseInt(d.slice(5, 7));
        return y === year && m === month;
    }).map(function(t) {
        return {
            date: t.faellig_am,
            title: '📋 ' + t.titel,
            prio: t.prio,
            id: t.id,
            type: 'todo',
            color: t.prio === 'dringend' ? '#ef4444' : t.prio === 'hoch' ? '#f97316' : '#6b7280'
        };
    });
}

// ═══════════════════════════════════════════════════════════════
// BACKWARDS COMPATIBILITY
// ═══════════════════════════════════════════════════════════════

export function filterTodos(f) { todoSetFilter(f); }
export function renderTodos() { todoRender(); }

// ═══════════════════════════════════════════════════════════════
// WINDOW REGISTRATION (Strangler Fig Pattern)
// All functions registered on window.* for onclick="" compatibility
// ═══════════════════════════════════════════════════════════════

const exports = {
    // State & Constants (read-only access)
    todoState,
    TODO_TODAY,
    TODO_PRIO,
    TODO_CAT,
    TODO_SRC,
    // Data loading
    loadTodos,
    // Counts & Filters
    todoCounts,
    todoSetFilter,
    todoSetView,
    todoSearchChanged,
    todoFilteredParents,
    // Rendering
    todoRender,
    todoQuickAddHTML,
    todoOpenQuickAdd,
    todoCloseQuickAdd,
    todoQAKeydown,
    todoSubmitQuickAdd,
    todoListHTML,
    todoRowHTML,
    todoBoardHTML,
    todoBoardDrop,
    todoRenderDetail,
    todoStatsHTML,
    // Actions
    todoSelect,
    todoCloseDetail,
    todoToggleSec,
    todoToggleExpand,
    todoToggle,
    todoDelete,
    todoUpdateField,
    todoUpdatePrio,
    todoToggleLabel,
    // Subtasks
    todoAddSubFromDetail,
    todoAddSubPrompt,
    // Sections
    todoAddSecPrompt,
    todoDeleteSec,
    // Comments + @Mentions
    todoLoadComments,
    todoAddComment,
    todoAddCommentWithMentions,
    // List Drag & Drop
    todoListDragStart,
    todoListDragOver,
    todoListDrop,
    // Templates
    todoShowTemplates,
    todoTmplAddItem,
    todoCreateTemplate,
    todoApplyTemplate,
    todoDeleteTemplate,
    // Attachments
    todoLoadAttachments,
    todoDropFiles,
    todoUploadAttachment,
    todoDeleteAttachment,
    todoRenderAttachments,
    todoDownloadAttachment,
    // Cross-module
    createTodoFromModule,
    // Calendar integration
    todoGetCalendarEvents,
    // Backwards compat
    filterTodos,
    renderTodos,
    currentTodoFilter: 'all'
};

// Register all on window
Object.keys(exports).forEach(function(key) {
    window[key] = exports[key];
});

// [prod] log removed

// === Window Exports (onclick handlers) ===
window.todoSearchChanged = todoSearchChanged;
window.todoSetFilter = todoSetFilter;
window.todoSetView = todoSetView;
window.loadTodos = loadTodos;

