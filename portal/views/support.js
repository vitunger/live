/**
 * views/support.js - Partner-Portal Support Module
 *
 * Handles: Ticket list, detail, comments, status changes, new ticket form, contacts
 *
 * @module views/support
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }

// === SUPPORT MODULE ===
export async function renderTickets(filter) {
    var container = document.getElementById('ticketList');
    if(!container) return;
    try {
        var query = _sb().from('support_tickets').select('*, users(name)').order('created_at', {ascending:false});
        if(_sbProfile() && _sbProfile().standort_id && !_sbProfile().is_hq) query = query.eq('standort_id', _sbProfile().standort_id);
        if(filter==='offen') query = query.in('status', ['offen','in_bearbeitung']);
        if(filter==='geloest') query = query.eq('status', 'geloest');
        var resp = await query;
        if(resp.error) throw resp.error;
        var tickets = resp.data || [];
        var html = '';
        var statusColors = {offen:'bg-yellow-100 text-yellow-700',in_bearbeitung:'bg-blue-100 text-blue-700',warten:'bg-gray-100 text-gray-700',geloest:'bg-green-100 text-green-700'};
        var statusLabels = {offen:'Offen',in_bearbeitung:'In Bearbeitung',warten:'Wartend',geloest:'Gel\u00f6st'};
        var prioIcons = {dringend:'\uD83D\uDD34',hoch:'\uD83D\uDFE0',mittel:'\uD83D\uDFE1',niedrig:'\u26AA'};
        tickets.forEach(function(t) {
            var d = new Date(t.created_at);
            var desc = (t.beschreibung||'').length > 120 ? t.beschreibung.substring(0,120)+'...' : (t.beschreibung||'');
            html += '<div class="vit-card p-4 hover:shadow-md transition cursor-pointer" onclick="openTicketDetail(\''+t.id+'\')">';
            html += '<div class="flex items-start justify-between">';
            html += '<div class="flex-1"><div class="flex items-center space-x-2 mb-1">';
            html += '<span class="text-xs font-semibold rounded px-2 py-0.5 ' + (statusColors[t.status]||'') + '">' + (statusLabels[t.status]||t.status) + '</span>';
            html += '<span>' + (prioIcons[t.prioritaet]||'') + '</span>';
            html += '<span class="text-xs text-gray-400">#' + t.id.substring(0,8) + '</span></div>';
            html += '<h4 class="font-bold text-gray-800 text-sm">' + t.titel + '</h4>';
            html += '<p class="text-xs text-gray-500 mt-1">' + desc + '</p>';
            html += '<div class="flex items-center space-x-3 mt-2 text-xs text-gray-400">';
            html += '<span>' + d.toLocaleDateString('de-DE') + '</span>';
            html += '<span>' + (t.kategorie||'') + '</span>';
            if(t.users && t.users.name) html += '<span>\uD83D\uDC64 '+t.users.name+'</span>';
            html += '</div></div>';
            html += '<span class="text-gray-300 text-lg ml-2">\u203A</span>';
            html += '</div></div>';
        });
        if(tickets.length===0) html = '<div class="text-center py-8 text-gray-400">Keine Tickets in dieser Kategorie.</div>';
        container.innerHTML = html;
    } catch(err) { console.error('Support:', err); container.innerHTML='<div class="text-center py-8 text-red-400">Fehler beim Laden der Tickets.</div>'; }
}

export async function openTicketDetail(ticketId) {
    try {
        var tResp = await _sb().from('support_tickets').select('*, users(name)').eq('id', ticketId).single();
        if(tResp.error) throw tResp.error;
        var t = tResp.data;
        var cResp = await _sb().from('ticket_kommentare').select('*, users(name)').eq('ticket_id', ticketId).order('created_at', {ascending:true});
        var kommentare = (cResp.data || []);

        var statusLabels = {offen:'Offen',in_bearbeitung:'In Bearbeitung',warten:'Wartend',geloest:'Gel\u00f6st'};
        var statusColors = {offen:'bg-yellow-100 text-yellow-700',in_bearbeitung:'bg-blue-100 text-blue-700',warten:'bg-gray-100 text-gray-700',geloest:'bg-green-100 text-green-700'};
        var prioIcons = {dringend:'\uD83D\uDD34',hoch:'\uD83D\uDFE0',mittel:'\uD83D\uDFE1',niedrig:'\u26AA'};
        var d = new Date(t.created_at);
        var isHQ = _sbProfile() && _sbProfile().is_hq;

        var html = '<div id="ticketDetailOverlay" onclick="closeTicketDetail()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">';
        html += '<div onclick="event.stopPropagation()" style="background:var(--c-bg);border-radius:16px;padding:0;width:640px;max-width:95vw;max-height:90vh;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.25);display:flex;flex-direction:column;">';

        // Header
        html += '<div class="p-5 border-b border-gray-100">';
        html += '<div class="flex items-center justify-between mb-3">';
        html += '<div class="flex items-center space-x-2"><span class="text-xs font-semibold rounded px-2 py-0.5 '+(statusColors[t.status]||'')+'">'+(statusLabels[t.status]||t.status)+'</span>';
        html += '<span>'+(prioIcons[t.prioritaet]||'')+'</span>';
        html += '<span class="text-xs text-gray-400">#'+t.id.substring(0,8)+'</span></div>';
        html += '<button onclick="closeTicketDetail()" class="text-gray-400 hover:text-gray-600 text-xl">\u2715</button></div>';
        html += '<h3 class="font-bold text-gray-800 text-lg">'+t.titel+'</h3>';
        html += '<div class="flex items-center space-x-4 mt-2 text-xs text-gray-400">';
        html += '<span>Erstellt: '+d.toLocaleDateString('de-DE')+' '+d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+'</span>';
        html += '<span>Kategorie: '+(t.kategorie||'')+'</span>';
        if(t.users&&t.users.name) html += '<span>Von: '+t.users.name+'</span>';
        html += '</div></div>';

        // Body
        html += '<div class="flex-1 overflow-y-auto p-5">';
        html += '<div class="bg-gray-50 rounded-lg p-4 mb-4"><p class="text-sm text-gray-700 whitespace-pre-wrap">'+(t.beschreibung||'Keine Beschreibung.')+'</p></div>';

        // Status change (HQ can change, user can close)
        html += '<div class="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">';
        html += '<span class="text-xs font-semibold text-blue-700">'+_t('ticket_change_status')+':</span>';
        html += '<div class="flex space-x-1">';
        if(isHQ) {
            ['offen','in_bearbeitung','warten','geloest'].forEach(function(st) {
                var active = t.status===st;
                html += '<button onclick="changeTicketStatus(\''+ticketId+'\',\''+st+'\')" class="text-xs px-2.5 py-1 rounded-full font-semibold '+(active?'bg-vit-orange text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100')+'">'+(statusLabels[st])+'</button>';
            });
        } else {
            if(t.status!=='geloest') html += '<button onclick="changeTicketStatus(\''+ticketId+'\',\'geloest\')" class="text-xs px-3 py-1 rounded-full font-semibold bg-green-500 text-white hover:bg-green-600">'+_t('ticket_mark_resolved')+'</button>';
            else html += '<span class="text-xs text-green-600 font-semibold">\u2705 Gel\u00f6st</span>';
        }
        html += '</div></div>';

        // Kommentare
        html += '<h4 class="font-semibold text-gray-700 text-sm mb-3">'+_t('ticket_comments')+' ('+kommentare.length+')</h4>';
        if(kommentare.length === 0) html += '<p class="text-sm text-gray-400 mb-4">Noch keine Kommentare.</p>';
        kommentare.forEach(function(k) {
            var kd = new Date(k.created_at);
            var isOwn = sbUser && k.erstellt_von === _sbUser().id;
            html += '<div class="mb-3 p-3 rounded-lg '+(isOwn?'bg-orange-50 border border-orange-100':'bg-gray-50 border border-gray-100')+'">';
            html += '<div class="flex items-center justify-between mb-1"><span class="text-xs font-bold text-gray-700">'+(k.users&&k.users.name?k.users.name:'Unbekannt')+'</span>';
            html += '<span class="text-[10px] text-gray-400">'+kd.toLocaleDateString('de-DE')+' '+kd.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+'</span></div>';
            html += '<p class="text-sm text-gray-600 whitespace-pre-wrap">'+k.text+'</p></div>';
        });

        // Neuer Kommentar
        html += '<div class="mt-3 flex space-x-2">';
        html += '<textarea id="ticketKommentarInput" class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" rows="2" placeholder="'+_t('ticket_comment_ph')+'"></textarea>';
        html += '<button onclick="addTicketComment(\''+ticketId+'\')" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90 self-end">'+_t('ticket_comment_send')+'</button>';
        html += '</div>';

        html += '</div></div></div>';
        var c = document.createElement('div'); c.id = 'ticketDetailContainer'; c.innerHTML = html; document.body.appendChild(c);
    } catch(err) { console.error('Ticket detail:', err); alert('Fehler beim Laden des Tickets.'); }
}

export function closeTicketDetail() { var c = document.getElementById('ticketDetailContainer'); if(c) c.remove(); }

export async function changeTicketStatus(ticketId, newStatus) {
    try {
        var resp = await _sb().from('support_tickets').update({status:newStatus, updated_at:new Date().toISOString()}).eq('id',ticketId);
        if(resp.error) throw resp.error;
        closeTicketDetail();
        await openTicketDetail(ticketId);
        renderTickets('all');
    } catch(err) { alert('Fehler: '+err.message); }
}

export async function addTicketComment(ticketId) {
    var input = document.getElementById('ticketKommentarInput');
    if(!input || !input.value.trim()) return;
    try {
        var resp = await _sb().from('ticket_kommentare').insert({
            ticket_id:ticketId, erstellt_von:sbUser?_sbUser().id:null, text:input.value.trim()
        });
        if(resp.error) throw resp.error;
        (async function() { try { var { data: t } = await _sb().from('support_tickets').select('erstellt_von,titel').eq('id',ticketId).single(); if(t&&t.erstellt_von&&t.erstellt_von!==_sbUser().id) _triggerPush([t.erstellt_von],'💬 Ticket-Kommentar',(_sbProfile() ?_sbProfile().name:'Jemand')+' zu: '+(t.titel||'').substring(0,50),'/?view=support','push_support_update'); } catch(e){} })();
        closeTicketDetail();
        await openTicketDetail(ticketId);
    } catch(err) { alert('Fehler: '+err.message); }
}

export function filterTickets(filter) {
    document.querySelectorAll('.ticket-filter').forEach(function(b){b.className='ticket-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-gray-100 text-gray-600';});
    var btn=document.querySelector('.ticket-filter[data-f="'+filter+'"]');
    if(btn) btn.className='ticket-filter text-xs px-3 py-1.5 rounded-full font-semibold bg-vit-orange text-white';
    renderTickets(filter);
}

export async function sendTicket() {
    var title = document.getElementById('ticketTitle');
    var desc = document.getElementById('ticketDesc');
    var cat = document.getElementById('ticketCat');
    if(!title || !title.value.trim()) return;
    try {
        await _sb().from('support_tickets').insert({standort_id: sbStandort?sbStandort.id:null, erstellt_von:_sbUser().id, titel:title.value.trim(), beschreibung:(desc?desc.value:''), kategorie:(cat?cat.value:'allgemein'), prioritaet:'mittel'});
        if(title) title.value=''; if(desc) desc.value='';
        var form=document.getElementById('newTicketForm'); if(form) form.classList.add('hidden');
        renderTickets('all');
    } catch(err) { alert('Fehler: '+err.message); }
}

export async function submitTicketForm() {
    var titel = (document.getElementById('ticketTitelInput')||{}).value;
    var beschreibung = (document.getElementById('ticketBeschreibungInput')||{}).value;
    var kategorie = (document.getElementById('ticketCatInput')||{}).value || 'allgemein';
    var prioritaet = (document.getElementById('ticketPrioInput')||{}).value || 'mittel';
    if(!titel || !titel.trim()) { alert(_t('alert_enter_subject')); return; }
    try {
        var stdId = _sbProfile() ? _sbProfile().standort_id : null;
        var resp = await _sb().from('support_tickets').insert({
            standort_id: stdId, erstellt_von: sbUser ? _sbUser().id : null,
            titel: titel.trim(), beschreibung: beschreibung || '',
            kategorie: kategorie, prioritaet: prioritaet, status: 'offen'
        });
        if(resp.error) throw resp.error;
        triggerPushHQ('🆘 Neues Ticket', titel.trim() + (sbStandort ? ' – ' + sbStandort.name : ''), '/?view=hqSupport', 'push_support_update');
        document.getElementById('ticketCreate').classList.add('hidden');
        document.getElementById('ticketTitelInput').value = '';
        document.getElementById('ticketBeschreibungInput').value = '';
        alert('\u2705 Ticket erstellt!');
        renderTickets('all');
    } catch(err) { alert('Fehler: ' + err.message); }
}

var zentraleKontakte = [
    {name:'Sascha Matthies',rolle:'Geschaeftsfuehrung',bereich:'GF',tel:'+49 170 1234567',email:'sascha@vitbikes.de',verfuegbar:true,zeiten:'Mo-Fr 9-18 Uhr',schwerpunkt:'Strategie, Partnerschaften, Finanzen'},
    {name:'Florian Meier',rolle:'Einkauf & Sortiment',bereich:'Einkauf',tel:'+49 170 2345678',email:'florian@vitbikes.de',verfuegbar:true,zeiten:'Mo-Fr 8-17 Uhr',schwerpunkt:'Vororder, Konditionen, Lieferanten, Sortiment'},
    {name:'Michael Stenzel',rolle:'Marketing & Performance',bereich:'Marketing',tel:'+49 170 3456789',email:'michael@vitbikes.de',verfuegbar:true,zeiten:'Mo-Fr 9-18 Uhr',schwerpunkt:'Ads, Content, Events, Jahresgespraeche'},
    {name:'Tim Schaefer',rolle:'IT & Systeme',bereich:'IT',tel:'+49 170 4567890',email:'tim@vitbikes.de',verfuegbar:false,zeiten:'Mo-Fr 8-16 Uhr',schwerpunkt:'Kassensystem, B2B-Portale, Etermin, Netzwerk'},
    {name:'Laura Hofmann',rolle:'Buchhaltung & Controlling',bereich:'Buchhaltung',tel:'+49 170 5678901',email:'laura@vitbikes.de',verfuegbar:true,zeiten:'Mo-Do 8-16, Fr 8-14 Uhr',schwerpunkt:'BWA, Monatsabschluss, Rechnungen, DATEV'},
    {name:'Jonas Becker',rolle:'Werkstatt-Support & Schulung',bereich:'Werkstatt',tel:'+49 170 6789012',email:'jonas@vitbikes.de',verfuegbar:true,zeiten:'Mo-Fr 7-16 Uhr',schwerpunkt:'Shimano, Bosch, Diagnose, Technik-Schulungen'}
];

export function showSupportTab(tabName) {
    document.querySelectorAll('.sup-tab-content').forEach(function(c){ c.style.display='none'; });
    document.querySelectorAll('.sup-tab-btn').forEach(function(b){
        b.className='sup-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
    });
    var tabMap = {tickets:'Tickets',kontakte:'Kontakte'};
    var el = document.getElementById('supTab'+(tabMap[tabName]||''));
    if(el) el.style.display='block';
    var btn = document.querySelector('.sup-tab-btn[data-tab="'+tabName+'"]');
    if(btn) btn.className='sup-tab-btn whitespace-nowrap py-4 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange';
    if(tabName==='tickets') renderTickets('all');
    if(tabName==='kontakte') renderKontakte();
}

export function renderKontakte() {
    var grid = document.getElementById('kontakteGrid');
    if(!grid || grid.dataset.rendered) return;
    grid.dataset.rendered = 'true';
    var bereichColors = {'GF':'bg-purple-500','Einkauf':'bg-blue-500','Marketing':'bg-orange-500','IT':'bg-gray-600','Buchhaltung':'bg-green-600','Werkstatt':'bg-red-500'};
    var h = '';
    zentraleKontakte.forEach(function(k) {
        var col = bereichColors[k.bereich]||'bg-gray-500';
        var initials = k.name.split(' ').map(function(w){return w[0];}).join('');
        h += '<div class="vit-card p-5 hover:shadow-md transition">';
        h += '<div class="flex items-center space-x-3 mb-4">';
        h += '<div class="w-14 h-14 '+col+' rounded-full flex items-center justify-center text-white font-bold text-lg">'+initials+'</div>';
        h += '<div>';
        h += '<p class="font-semibold text-gray-800">'+k.name+'</p>';
        h += '<p class="text-xs text-gray-500">'+k.rolle+'</p>';
        h += '<span class="inline-flex items-center mt-1 '+(k.verfuegbar?'text-green-600':'text-gray-400')+' text-xs">';
        h += '<span class="w-2 h-2 rounded-full '+(k.verfuegbar?'bg-green-500':'bg-gray-300')+' mr-1"></span>';
        h += (k.verfuegbar?'Verfuegbar':'Nicht verfuegbar');
        h += '</span>';
        h += '</div></div>';
        h += '<div class="space-y-2 mb-4">';
        h += '<div class="flex items-center space-x-2 text-sm"><span class="text-gray-400 w-5">📞</span><a href="tel:'+k.tel+'" class="text-gray-700 hover:text-vit-orange">'+k.tel+'</a></div>';
        h += '<div class="flex items-center space-x-2 text-sm"><span class="text-gray-400 w-5">✉️</span><a href="mailto:'+k.email+'" class="text-gray-700 hover:text-vit-orange">'+k.email+'</a></div>';
        h += '<div class="flex items-center space-x-2 text-sm"><span class="text-gray-400 w-5">🕐</span><span class="text-gray-600">'+k.zeiten+'</span></div>';
        h += '</div>';
        h += '<div class="pt-3 border-t border-gray-100">';
        h += '<p class="text-xs text-gray-400 mb-1">Schwerpunkte</p>';
        h += '<p class="text-xs text-gray-600">'+k.schwerpunkt+'</p>';
        h += '</div>';
        h += '<div class="flex space-x-2 mt-3">';
        h += '<button class="flex-1 px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-50">✉️ E-Mail</button>';
        h += '<button class="flex-1 px-3 py-2 text-xs font-semibold bg-vit-orange text-white rounded-lg hover:opacity-90">📞 Anrufen</button>';
        h += '</div>';
        h += '</div>';
    });
    grid.innerHTML = h;
}

// Init support on view



// Strangler Fig
const _exports = {renderTickets,openTicketDetail,closeTicketDetail,changeTicketStatus,addTicketComment,filterTickets,sendTicket,submitTicketForm,showSupportTab,renderKontakte};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
console.log('[support.js] Module loaded - ' + Object.keys(_exports).length + ' exports registered');

// === Window Exports (onclick handlers) ===
window.filterTickets = filterTickets;
window.showSupportTab = showSupportTab;
window.submitTicketForm = submitTicketForm;

// === Stub-Funktionen für Support-Interceptor (TODO: vollständig implementieren) ===
window.acceptInterceptor = function() {
    var modal = document.getElementById('supportInterceptorModal');
    if(modal) modal.style.display = 'none';
    if(window.showToast) window.showToast('Lösung wird ausprobiert...', 'info');
};
window.skipInterceptor = function() {
    var modal = document.getElementById('supportInterceptorModal');
    if(modal) modal.style.display = 'none';
    // Direkt zum Ticket-Formular
    var form = document.getElementById('newTicketForm');
    if(form) form.style.display = '';
};
