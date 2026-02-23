/**
 * views/hq-feedback.js - HQ Feedback Inbox, Ideenboard Integration
 * @module views/hq-feedback
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

window.showHqFeedbackTab = function(tab) {
document.querySelectorAll('.ideen-tab').forEach(function(b){
var t = b.getAttribute('data-itab');
b.className = 'ideen-tab whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm ' + (t===tab ? 'border-vit-orange text-vit-orange' : 'border-transparent text-gray-500');
});
document.querySelectorAll('.hq-fb-tab-content').forEach(function(c){ c.style.display = 'none'; });
var el = document.getElementById(tab === 'ideen' ? 'ideenTabIdeen' : 'ideenTabFeedback');
if(el) el.style.display = 'block';
if(tab === 'feedback') renderHqFeedbackInbox();
};

export async function renderHqFeedbackInbox() {
var list = document.getElementById('hqFbList');
if(!list) return;
list.innerHTML = '<div class="p-8 text-center text-gray-400">Wird geladen...</div>';

try {
var resp = await _sb().from('portal_feedback')
    .select('*, users(name, email), standorte(name)')
    .order('created_at', { ascending: false })
    .limit(100);

if(resp.error) throw resp.error;
var items = resp.data || [];
window._hqFbItems = items;

// KPIs
var el = function(id){ return document.getElementById(id); };
if(el('hqFbTotal')) el('hqFbTotal').textContent = items.length;
if(el('hqFbNeu')) el('hqFbNeu').textContent = items.filter(function(i){ return i.status==='neu'; }).length;
if(el('hqFbBugs')) el('hqFbBugs').textContent = items.filter(function(i){ return i.kategorie==='bug'; }).length;
if(el('hqFbWuensche')) el('hqFbWuensche').textContent = items.filter(function(i){ return i.kategorie==='wunsch'; }).length;
if(el('hqFbIdeen')) el('hqFbIdeen').textContent = items.filter(function(i){ return i.kategorie==='idee'; }).length;

// Badge (sidebar + tab)
var badge = document.getElementById('hqFbBadge');
var tabBadge = document.getElementById('hqFbTabBadge');
var neuCount = items.filter(function(i){ return i.status==='neu'; }).length;
if(badge) { badge.textContent = neuCount; badge.style.display = neuCount > 0 ? '' : 'none'; }
if(tabBadge) { tabBadge.textContent = neuCount; tabBadge.style.display = neuCount > 0 ? '' : 'none'; }

renderHqFbList(items);
} catch(err) {
list.innerHTML = '<div class="p-8 text-center text-red-400">Fehler: '+err.message+'</div>';
}
}

export function renderHqFbList(items) {
var list = document.getElementById('hqFbList');
if(!list) return;

var filtered = items;
if(hqFbCurrentFilter !== 'alle') {
filtered = items.filter(function(i){ return i.status === hqFbCurrentFilter; });
}

if(!filtered.length) {
list.innerHTML = '<div class="p-8 text-center text-gray-400">Keine Feedbacks mit diesem Filter.</div>';
return;
}

var catIcons = {bug:'🐛',wunsch:'✨',ux:'🎨',performance:'⚡',idee:'💡'};
var catColors = {bug:'bg-red-100 text-red-700',wunsch:'bg-emerald-100 text-emerald-700',ux:'bg-blue-100 text-blue-700',performance:'bg-amber-100 text-amber-700',idee:'bg-purple-100 text-purple-700'};
var statusLabels = {neu:'🆕 Neu',gesehen:'👁️ Gesehen',in_arbeit:'🔧 In Arbeit',erledigt:'✅ Erledigt',abgelehnt:'❌ Abgelehnt'};
var statusColors = {neu:'bg-amber-100 text-amber-700',gesehen:'bg-blue-100 text-blue-700',in_arbeit:'bg-orange-100 text-orange-700',erledigt:'bg-green-100 text-green-700',abgelehnt:'bg-red-100 text-red-700'};

list.innerHTML = filtered.map(function(fb){
var user = fb.users || {};
var standort = fb.standorte || {};
var cat = fb.kategorie || 'idee';
var attachCount = (fb.attachments || []).length;
var date = new Date(fb.created_at);
var dateStr = date.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'}) + ' ' + date.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});

return '<div class="p-4 hover:bg-gray-50 cursor-pointer transition" onclick="openHqFbDetail(\''+fb.id+'\')">'
    +'<div class="flex items-start gap-3">'
    +'<div class="text-2xl">'+(catIcons[cat]||'💬')+'</div>'
    +'<div class="flex-1 min-w-0">'
    +'<div class="flex items-center gap-2 mb-1 flex-wrap">'
    +'<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+(catColors[cat]||'bg-gray-100 text-gray-600')+'">'+cat.charAt(0).toUpperCase()+cat.slice(1)+'</span>'
    +'<span class="text-xs px-2 py-0.5 rounded-full font-semibold '+(statusColors[fb.status]||'bg-gray-100')+'">'+( statusLabels[fb.status]||fb.status)+'</span>'
    +(attachCount ? '<span class="text-xs text-gray-400">📎 '+attachCount+'</span>' : '')
    +'</div>'
    +'<p class="text-sm font-semibold text-gray-800 truncate">'+(fb.titel || fb.beschreibung || 'Kein Text').substring(0,80)+'</p>'
    +'<div class="flex items-center gap-3 mt-1 text-[11px] text-gray-400">'
    +'<span>👤 '+(user.name||user.email||'Unbekannt')+'</span>'
    +(standort.name ? '<span>📍 '+standort.name+'</span>' : '')
    +(fb.route ? '<span>📄 '+fb.route+'</span>' : '')
    +'<span>'+dateStr+'</span>'
    +'</div>'
    +'</div>'
    +'</div></div>';
}).join('');
}

window.filterHqFb = function(filter) {
hqFbCurrentFilter = filter;
document.querySelectorAll('.hq-fb-filter').forEach(function(b){
var f = b.getAttribute('data-fbf');
b.className = 'hq-fb-filter px-3 py-1.5 rounded-full text-xs font-semibold ' + (f===filter ? 'bg-vit-orange text-white' : 'bg-gray-100 text-gray-600');
});
if(window._hqFbItems) renderHqFbList(window._hqFbItems);
};

window.openHqFbDetail = async function(id) {
var fb = (window._hqFbItems||[]).find(function(i){ return i.id===id; });
if(!fb) return;
var modal = document.getElementById('hqFbDetailModal');
var content = document.getElementById('hqFbDetailContent');
if(!modal || !content) return;

var catIcons = {bug:'🐛',wunsch:'✨',ux:'🎨',performance:'⚡',idee:'💡'};
var user = fb.users || {};
var standort = fb.standorte || {};
var bi = fb.browser_info || {};
var date = new Date(fb.created_at).toLocaleString('de-DE');

var h = '<div class="flex items-center justify-between mb-4">';
h += '<div class="flex items-center gap-2"><span class="text-2xl">'+(catIcons[fb.kategorie]||'💬')+'</span><h2 class="text-lg font-bold text-gray-800">'+(fb.titel||'Portal-Feedback')+'</h2></div>';
h += '<button onclick="document.getElementById(\'hqFbDetailModal\').style.display=\'none\'" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button></div>';

h += '<div class="grid grid-cols-2 gap-3 mb-4 text-xs">';
h += '<div class="bg-gray-50 rounded-lg p-3"><strong>Nutzer:</strong> '+(user.name||user.email||'-')+'</div>';
h += '<div class="bg-gray-50 rounded-lg p-3"><strong>Standort:</strong> '+(standort.name||'HQ')+'</div>';
h += '<div class="bg-gray-50 rounded-lg p-3"><strong>Route:</strong> '+(fb.route||'-')+'</div>';
h += '<div class="bg-gray-50 rounded-lg p-3"><strong>Zeitpunkt:</strong> '+date+'</div>';
h += '<div class="bg-gray-50 rounded-lg p-3"><strong>Browser:</strong> '+(bi.userAgent ? bi.userAgent.substring(0,50)+'…' : '-')+'</div>';
h += '<div class="bg-gray-50 rounded-lg p-3"><strong>Viewport:</strong> '+(bi.viewport||'-')+'</div>';
h += '</div>';

if(fb.beschreibung) {
h += '<div class="bg-white border border-gray-200 rounded-lg p-4 mb-4"><p class="text-sm text-gray-700 whitespace-pre-wrap">'+fb.beschreibung+'</p></div>';
}

// Attachments
var attachments = fb.attachments || [];
if(attachments.length) {
h += '<div class="mb-4"><p class="text-xs font-bold text-gray-500 uppercase mb-2">Anhänge ('+attachments.length+')</p>';
for(var i=0; i<attachments.length; i++) {
    var a = attachments[i];
    var url = _sb().storage.from('feedback-attachments').getPublicUrl(a.path).data.publicUrl;
    var signedResp = await _sb().storage.from('feedback-attachments').createSignedUrl(a.path, 3600);
    var signedUrl = signedResp.data ? signedResp.data.signedUrl : url;
    if(a.type === 'screenshot') {
        h += '<div class="mb-2"><img src="'+signedUrl+'" class="rounded-lg border max-h-[300px] w-auto" alt="Screenshot"></div>';
    } else if(a.type === 'audio') {
        h += '<div class="mb-2"><audio controls src="'+signedUrl+'" class="w-full"></audio><p class="text-[10px] text-gray-400 mt-1">'+a.name+' ('+formatFbSize(a.size)+')</p></div>';
    } else if(a.type === 'screen') {
        h += '<div class="mb-2"><video controls src="'+signedUrl+'" class="rounded-lg border w-full max-h-[300px]"></video><p class="text-[10px] text-gray-400 mt-1">'+a.name+' ('+formatFbSize(a.size)+')</p></div>';
    }
}
h += '</div>';
}

// Status changer
h += '<div class="border-t pt-4 mt-4"><p class="text-xs font-bold text-gray-500 uppercase mb-2">Status ändern</p>';
h += '<div class="flex gap-2 flex-wrap">';
['neu','gesehen','in_arbeit','erledigt','abgelehnt'].forEach(function(s){
var labels = {neu:'🆕 Neu',gesehen:'👁️ Gesehen',in_arbeit:'🔧 In Arbeit',erledigt:'✅ Erledigt',abgelehnt:'❌ Abgelehnt'};
var active = fb.status === s;
h += '<button onclick="updateFbStatus(\''+id+'\',\''+s+'\')" class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition '+(active?'bg-emerald-500 text-white border-emerald-500':'bg-white text-gray-600 border-gray-200 hover:border-emerald-400')+'">'+labels[s]+'</button>';
});
h += '</div></div>';

// Ideenboard integration button
h += '<div class="border-t pt-4 mt-4"><button onclick="fbCreateIdeenboardTicket(\''+id+'\')" class="w-full py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg text-sm font-bold hover:opacity-90 transition">💡 Als Idee ins Ideenboard übernehmen</button></div>';

content.innerHTML = h;
modal.style.display = 'flex';
};

export function formatFbSize(bytes) {
if(!bytes) return '0 B';
if(bytes < 1024) return bytes + ' B';
if(bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
return (bytes/1048576).toFixed(1) + ' MB';
}

window.updateFbStatus = async function(id, status) {
try {
await _sb().from('portal_feedback').update({ status: status, updated_at: new Date().toISOString() }).eq('id', id);
document.getElementById('hqFbDetailModal').style.display = 'none';
renderHqFeedbackInbox();
} catch(e) { alert('Fehler: '+e.message); }
};

// ── Ideenboard Integration ──
window.fbCreateIdeenboardTicket = async function(fbId) {
var fb = (window._hqFbItems||[]).find(function(i){ return i.id===fbId; });
if(!fb) return;
var catLabels = {bug:'Bug',wunsch:'Wunsch',ux:'UX',performance:'Performance',idee:'Idee'};
var title = '[Portal-Feedback] ' + (catLabels[fb.kategorie]||fb.kategorie) + ' – ' + (fb.route||'Allgemein');
if(fb.titel) title += ': ' + fb.titel;

var user = fb.users || {};
var standort = fb.standorte || {};
var desc = (fb.beschreibung||'Kein Text') + '\n\n---\n';
desc += '📧 Von: ' + (user.name||user.email||'Unbekannt') + '\n';
desc += '📍 Standort: ' + (standort.name||'HQ') + '\n';
desc += '📄 Route: ' + (fb.route||'-') + '\n';
desc += '🏷️ Kategorie: ' + (catLabels[fb.kategorie]||fb.kategorie) + '\n';
desc += '📅 Datum: ' + new Date(fb.created_at).toLocaleString('de-DE') + '\n';
if((fb.attachments||[]).length) desc += '📎 Anhänge: ' + fb.attachments.length + ' Dateien\n';

try {
var resp = await _sb().from('ideen').insert({
    standort_id: fb.standort_id,
    user_id: fb.user_id,
    titel: title.substring(0,200),
    beschreibung: desc,
    kategorie: fb.kategorie === 'bug' ? 'problem' : (fb.kategorie === 'wunsch' || fb.kategorie === 'idee' ? 'feature' : 'sonstiges'),
    status: 'neu',
    quelle: 'portal-feedback'
});
if(resp.error) throw resp.error;

// Mark feedback as linked
await _sb().from('portal_feedback').update({ status: 'gesehen' }).eq('id', fbId);
alert('✅ Idee wurde ins Ideenboard übernommen!');
document.getElementById('hqFbDetailModal').style.display = 'none';
renderHqFeedbackInbox();
} catch(e) {
// If ideas table doesn't exist yet, fall back gracefully
if(e.message && e.message.indexOf('ideas') >= 0) {
    alert('💡 Ideenboard-Tabelle noch nicht vorhanden. Feedback wurde als "gesehen" markiert.');
    await _sb().from('portal_feedback').update({ status: 'gesehen' }).eq('id', fbId);
    document.getElementById('hqFbDetailModal').style.display = 'none';
    renderHqFeedbackInbox();
} else {
    alert('Fehler: ' + e.message);
}
}
};

// ── Badge counter on load ──


// Strangler Fig
const _exports = {renderHqFeedbackInbox,renderHqFbList,formatFbSize};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
// [prod] log removed
