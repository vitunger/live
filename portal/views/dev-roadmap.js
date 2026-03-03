/**
 * views/dev-roadmap.js - Roadmap tab with quarterly grouping + status filter
 * @module views/dev-roadmap
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

// === LOCAL ROADMAP STATE ===
var devRoadmapItems = [];
window.devRoadmapFilter = 'alle';

export async function renderDevRoadmap() {
    var c = document.getElementById('ideenTabRoadmap');
    if(!c) return;

    // Load roadmap items
    try {
        var resp = await _sb().from('dev_roadmap').select('*').order('sortierung');
        if(resp.error) throw resp.error;
        devRoadmapItems = resp.data || [];
    } catch(err) {
        console.error('Roadmap load:', err);
        devRoadmapItems = [];
    }

    var isHQ = (currentRoles||[]).indexOf('hq') !== -1;
    var items = devRoadmapItems;

    // Stats
    var total = items.length;
    var done = items.filter(function(r){ return r.status === 'ausgerollt'; }).length;
    var active = items.filter(function(r){ return r.status === 'in_entwicklung' || r.status === 'im_review'; }).length;
    var planned = items.filter(function(r){ return r.status === 'geplant'; }).length;

    // Quartale ermitteln
    var quartale = [];
    items.forEach(function(r) {
        if(r.ziel_quartal && quartale.indexOf(r.ziel_quartal) === -1) quartale.push(r.ziel_quartal);
    });
    quartale.sort();

    var h = '';

    // Header mit Stats (klickbar als Filter - ersetzt die separate Filter-Zeile)
    h += '<div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">';
    var statCards = [
        {filter:'alle', val:total, color:'text-gray-800', label:'Gesamt'},
        {filter:'geplant', val:planned, color:'text-gray-500', label:'Geplant 📅'},
        {filter:'in_entwicklung', val:active, color:'text-blue-600', label:'In Arbeit 🔨'},
        {filter:'ausgerollt', val:done, color:'text-green-600', label:'Ausgerollt ✅'},
        {filter:'verschoben', val:items.filter(function(r){ return r.status === 'verschoben'; }).length, color:'text-gray-400', label:'Verschoben ⏸'}
    ];
    statCards.forEach(function(sc) {
        var isActive = window.devRoadmapFilter === sc.filter;
        var toggleTo = (sc.filter === window.devRoadmapFilter && sc.filter !== 'alle') ? 'alle' : sc.filter;
        h += '<div onclick="window.devRoadmapFilter=\''+toggleTo+'\';renderDevRoadmap()" class="vit-card p-3 text-center cursor-pointer transition-all '+(isActive && sc.filter!=='alle'?'ring-2 ring-vit-orange bg-orange-50':'hover:shadow-md')+'"><p class="text-xl font-bold '+sc.color+'">'+sc.val+'</p><p class="text-[10px] text-gray-500">'+sc.label+'</p></div>';
    });
    h += '</div>';

    // Progress bar
    var pct = total > 0 ? Math.round(done / total * 100) : 0;
    h += '<div class="mb-6"><div class="flex items-center justify-between mb-1"><span class="text-xs font-semibold text-gray-600">Gesamtfortschritt</span><span class="text-xs font-bold text-gray-800">'+pct+'%</span></div>';
    h += '<div class="h-3 bg-gray-100 rounded-full overflow-hidden"><div class="h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all" style="width:'+pct+'%"></div></div></div>';

    // Gruppiert nach Quartal
    quartale.forEach(function(q) {
        var qItems = items.filter(function(r) {
            if(window.devRoadmapFilter !== 'alle' && r.status !== window.devRoadmapFilter) return false;
            return r.ziel_quartal === q;
        });
        if(qItems.length === 0) return;

        var qDone = qItems.filter(function(r){ return r.status === 'ausgerollt'; }).length;
        var qPct = Math.round(qDone / qItems.length * 100);

        h += '<div class="mb-6">';
        h += '<div class="flex items-center justify-between mb-3">';
        h += '<h3 class="text-sm font-bold text-gray-800">📅 '+q+'</h3>';
        h += '<div class="flex items-center space-x-2"><div class="w-24 h-1.5 bg-gray-100 rounded-full"><div class="h-1.5 bg-green-500 rounded-full" style="width:'+qPct+'%"></div></div><span class="text-[10px] text-gray-500">'+qDone+'/'+qItems.length+'</span></div>';
        h += '</div>';

        h += '<div class="space-y-2">';
        qItems.forEach(function(r) {
            var statusIcons = {geplant:'📅',in_entwicklung:'🔨',im_review:'🔍',ausgerollt:'✅',verschoben:'⏸'};
            var statusColors = {geplant:'bg-gray-100 text-gray-600',in_entwicklung:'bg-blue-100 text-blue-700',im_review:'bg-purple-100 text-purple-700',ausgerollt:'bg-green-100 text-green-700',verschoben:'bg-gray-100 text-gray-400'};
            var prioColors = {kritisch:'text-red-600',hoch:'text-orange-500',mittel:'text-yellow-600',niedrig:'text-green-600'};
            var katIcons = {feature:'🚀',verbesserung:'🔧',bugfix:'🐛',infrastruktur:'⚙️',sicherheit:'🔒',performance:'⚡',design:'🎨'};

            h += '<div class="vit-card p-3 flex items-center space-x-3 '+(r.status==='ausgerollt'?'opacity-60':'')+'">';
            h += '<span class="text-lg">'+(statusIcons[r.status]||'📋')+'</span>';
            h += '<div class="flex-1 min-w-0">';
            h += '<div class="flex items-center flex-wrap gap-1.5">';
            h += '<span class="text-xs font-semibold rounded px-2 py-0.5 '+(statusColors[r.status]||'bg-gray-100 text-gray-600')+'">'+r.status.replace('_',' ')+'</span>';
            h += '<span class="text-[10px] '+(prioColors[r.prioritaet]||'text-gray-500')+' font-semibold">●</span>';
            if(r.aufwand) h += '<span class="text-[10px] bg-gray-100 rounded px-1.5 py-0.5 font-semibold text-gray-600">'+r.aufwand+'</span>';
            h += '<span class="text-[10px] text-gray-400">'+(katIcons[r.kategorie]||'')+'</span>';
            h += '</div>';
            h += '<h4 class="font-semibold text-sm text-gray-800 '+(r.status==='ausgerollt'?'line-through':'')+'">'+ r.titel+'</h4>';
            if(r.beschreibung) h += '<p class="text-xs text-gray-500 truncate">'+r.beschreibung+'</p>';
            if(r.submission_id) h += '<span onclick="event.stopPropagation();openDevDetail(\''+r.submission_id+'\')" class="text-[10px] text-vit-orange hover:underline cursor-pointer">🔗 Verknüpfte Idee</span> ';
            if(r.ziel_datum) h += '<span class="text-[10px] text-gray-400">Ziel: '+new Date(r.ziel_datum).toLocaleDateString('de-DE')+'</span>';
            h += '</div>';

            // HQ: Status-Schnellwechsel
            if(isHQ) {
                h += '<select onchange="updateRoadmapStatus(\''+r.id+'\',this.value)" class="text-[10px] border rounded px-1.5 py-1 bg-white">';
                ['geplant','in_entwicklung','im_review','ausgerollt','verschoben'].forEach(function(st) {
                    h += '<option value="'+st+'"'+(r.status===st?' selected':'')+'>'+st.replace('_',' ')+'</option>';
                });
                h += '</select>';
            }
            h += '</div>';
        });
        h += '</div></div>';
    });

    // Items ohne Quartal
    var ohneQ = items.filter(function(r) {
        if(window.devRoadmapFilter !== 'alle' && r.status !== window.devRoadmapFilter) return false;
        return !r.ziel_quartal;
    });
    if(ohneQ.length > 0) {
        h += '<div class="mb-6"><h3 class="text-sm font-bold text-gray-400 mb-3">📋 Ohne Zeitplan</h3><div class="space-y-2">';
        ohneQ.forEach(function(r) {
            h += '<div class="vit-card p-3 opacity-50"><span class="font-semibold text-sm text-gray-600">'+r.titel+'</span></div>';
        });
        h += '</div></div>';
    }

    if(items.length === 0) {
        h += '<div class="text-center py-12 text-gray-400"><p class="text-4xl mb-3">🚀</p><p>Noch keine Roadmap-Einträge.</p></div>';
    }

    c.innerHTML = h;
}

export function toggleRoadmapForm() {
    var f = document.getElementById('roadmapAddForm');
    if(f) f.classList.toggle('hidden');
}

export async function addRoadmapItem() {
    var titel = (document.getElementById('rmTitel')||{}).value;
    if(!titel || !titel.trim()) { _showToast('Bitte Titel eingeben.', 'error'); return; }
    try {
        var maxSort = devRoadmapItems.reduce(function(m, r){ return Math.max(m, r.sortierung||0); }, 0);
        await _sb().from('dev_roadmap').insert({
            titel: titel.trim(),
            beschreibung: (document.getElementById('rmBeschreibung')||{}).value || null,
            kategorie: (document.getElementById('rmKategorie')||{}).value || 'feature',
            prioritaet: (document.getElementById('rmPrio')||{}).value || 'mittel',
            aufwand: (document.getElementById('rmAufwand')||{}).value || 'M',
            ziel_quartal: (document.getElementById('rmQuartal')||{}).value || null,
            ziel_datum: (document.getElementById('rmDatum')||{}).value || null,
            sortierung: maxSort + 1,
            status: 'geplant'
        });
        document.getElementById('rmTitel').value = '';
        document.getElementById('rmBeschreibung').value = '';
        toggleRoadmapForm();
        renderDevRoadmap();
    } catch(err) { _showToast('Fehler: '+(err.message||err, 'error')); }
}

export async function updateRoadmapStatus(id, newStatus) {
    try {
        await _sb().from('dev_roadmap').update({ status: newStatus }).eq('id', id);
        renderDevRoadmap();
    } catch(err) { console.error('Roadmap status update:', err); }
}

const _exports = { renderDevRoadmap, toggleRoadmapForm, addRoadmapItem, updateRoadmapStatus };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
