/**
 * views/support-chatbot.js - Floating Chat-Widget fuer Partner-Support
 *
 * Schwebendes Chat-Widget (unten rechts), Claude-powered Antworten,
 * Ticket-Erstellung direkt aus dem Chat.
 *
 * @module views/support-chatbot
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }

var _chatState = {
    open: false,
    history: [],
    sending: false,
    mounted: false
};

// ========== Widget montieren ==========
function mountChatWidget() {
    if (_chatState.mounted) return;
    if (document.getElementById('supChatWidget')) return;

    var profile = _sbProfile();
    // Nur fuer eingeloggte Partner (nicht HQ)
    if (!profile || profile.is_hq) return;

    var widget = document.createElement('div');
    widget.id = 'supChatWidget';
    widget.innerHTML = renderWidget();
    document.body.appendChild(widget);
    _chatState.mounted = true;
}

function renderWidget() {
    var h = '';
    // Floating Button
    h += '<button id="supChatToggle" onclick="supChatToggle()" class="fixed bottom-20 right-6 w-14 h-14 bg-vit-orange text-white rounded-full shadow-lg hover:opacity-90 flex items-center justify-center z-40 transition-transform" title="Support-Chat">';
    h += '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>';
    h += '</button>';

    // Chat Panel
    h += '<div id="supChatPanel" class="fixed bottom-36 right-6 w-80 max-h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-40 overflow-hidden" style="display:none;">';

    // Header
    h += '<div class="bg-vit-orange text-white p-3 flex items-center justify-between flex-shrink-0">';
    h += '<div class="flex items-center gap-2"><span class="text-lg">🤖</span><div><p class="text-sm font-bold">Support-Assistent</p><p class="text-[10px] opacity-80">Frag mich alles zum Cockpit</p></div></div>';
    h += '<button onclick="supChatToggle()" class="text-white hover:opacity-80 text-lg">✕</button>';
    h += '</div>';

    // Messages
    h += '<div id="supChatMessages" class="flex-1 overflow-y-auto p-3 space-y-3" style="min-height:200px;max-height:340px;">';
    h += renderMessages();
    h += '</div>';

    // Input
    h += '<div class="border-t border-gray-100 p-3 flex-shrink-0">';
    h += '<div class="flex gap-2">';
    h += '<input type="text" id="supChatInput" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-vit-orange focus:outline-none" placeholder="Frage stellen..." onkeydown="if(event.key===\'Enter\')supChatSend()">';
    h += '<button onclick="supChatSend()" id="supChatSendBtn" class="px-3 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90 flex-shrink-0">↑</button>';
    h += '</div></div>';

    h += '</div>';
    return h;
}

function renderMessages() {
    if (_chatState.history.length === 0) {
        return '<div class="text-center py-6">'
            + '<div class="text-3xl mb-2">👋</div>'
            + '<p class="text-sm text-gray-600 font-semibold">Hallo!</p>'
            + '<p class="text-xs text-gray-400">Ich bin dein Support-Assistent. Wie kann ich dir helfen?</p>'
            + '<div class="mt-3 space-y-1">'
            + '<button onclick="supChatQuick(\'BWA Upload Anleitung\')" class="w-full text-left text-xs px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600">📄 Wie lade ich meine BWA hoch?</button>'
            + '<button onclick="supChatQuick(\'Login Problem\')" class="w-full text-left text-xs px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600">🔐 Login funktioniert nicht</button>'
            + '<button onclick="supChatQuick(\'Rechnung finden\')" class="w-full text-left text-xs px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600">💰 Wo finde ich meine Rechnung?</button>'
            + '</div></div>';
    }

    var h = '';
    _chatState.history.forEach(function(msg) {
        if (msg.role === 'user') {
            h += '<div class="flex justify-end"><div class="max-w-[85%] bg-vit-orange text-white rounded-lg rounded-br-none px-3 py-2 text-sm">' + _escH(msg.content) + '</div></div>';
        } else {
            h += '<div class="flex justify-start"><div class="max-w-[85%] bg-gray-100 text-gray-800 rounded-lg rounded-bl-none px-3 py-2 text-sm">' + _escH(msg.content);
            if (msg.ticket_empfohlen) {
                h += '<div class="mt-2 pt-2 border-t border-gray-200">';
                h += '<button onclick="supChatCreateTicket()" class="text-xs px-3 py-1.5 bg-vit-orange text-white rounded-lg font-semibold hover:opacity-90 w-full">🎫 Support-Ticket erstellen</button>';
                h += '</div>';
            }
            h += '</div></div>';
        }
    });
    return h;
}

// ========== Toggle ==========
export function supChatToggle() {
    _chatState.open = !_chatState.open;
    var panel = document.getElementById('supChatPanel');
    var toggle = document.getElementById('supChatToggle');
    if (panel) panel.style.display = _chatState.open ? 'flex' : 'none';
    if (toggle) toggle.style.transform = _chatState.open ? 'scale(0.9)' : '';
    if (_chatState.open) {
        var input = document.getElementById('supChatInput');
        if (input) setTimeout(function() { input.focus(); }, 100);
    }
}

// ========== Quick Questions ==========
export function supChatQuick(text) {
    var input = document.getElementById('supChatInput');
    if (input) input.value = text;
    supChatSend();
}

// ========== Send Message ==========
export async function supChatSend() {
    var input = document.getElementById('supChatInput');
    if (!input || !input.value.trim() || _chatState.sending) return;

    var message = input.value.trim();
    input.value = '';
    _chatState.sending = true;

    // User-Nachricht sofort anzeigen
    _chatState.history.push({ role: 'user', content: message });
    updateMessages();

    // Loading indicator
    var msgContainer = document.getElementById('supChatMessages');
    if (msgContainer) {
        msgContainer.innerHTML += '<div id="supChatLoading" class="flex justify-start"><div class="bg-gray-100 rounded-lg rounded-bl-none px-3 py-2"><div class="flex gap-1"><div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:0ms"></div><div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:150ms"></div><div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:300ms"></div></div></div></div>';
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }

    // Disable send
    var btn = document.getElementById('supChatSendBtn');
    if (btn) btn.disabled = true;

    try {
        var sess = await _sb().auth.getSession();
        var token = sess.data && sess.data.session ? sess.data.session.access_token : '';

        var resp = await fetch(window.SUPABASE_URL + '/functions/v1/support-chatbot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
                message: message,
                history: _chatState.history.slice(-6)
            })
        });

        var data = resp.ok ? await resp.json() : { antwort: 'Entschuldigung, ich kann gerade nicht antworten. Bitte erstelle ein Support-Ticket.' , ticket_empfohlen: true };

        _chatState.history.push({
            role: 'assistant',
            content: data.antwort || 'Keine Antwort erhalten.',
            ticket_empfohlen: data.ticket_empfohlen || false
        });

    } catch(err) {
        _chatState.history.push({
            role: 'assistant',
            content: 'Entschuldigung, es gab einen Fehler. Bitte erstelle ein Support-Ticket.',
            ticket_empfohlen: true
        });
    } finally {
        _chatState.sending = false;
        if (btn) btn.disabled = false;
        // Remove loading, update messages
        var loading = document.getElementById('supChatLoading');
        if (loading) loading.remove();
        updateMessages();
    }
}

function updateMessages() {
    var container = document.getElementById('supChatMessages');
    if (container) {
        container.innerHTML = renderMessages();
        container.scrollTop = container.scrollHeight;
    }
}

// ========== Ticket aus Chat erstellen ==========
export function supChatCreateTicket() {
    // Letzte User-Nachricht als Betreff
    var lastUser = '';
    for (var i = _chatState.history.length - 1; i >= 0; i--) {
        if (_chatState.history[i].role === 'user') {
            lastUser = _chatState.history[i].content;
            break;
        }
    }
    // Chat schliessen und Ticket-Modal oeffnen
    supChatToggle();
    if (typeof window.openNewTicketModal === 'function') {
        window.openNewTicketModal();
        // Betreff vorausfuellen
        setTimeout(function() {
            var betreffInput = document.getElementById('supNewBetreff');
            if (betreffInput && lastUser) betreffInput.value = lastUser;
        }, 100);
    } else {
        // Fallback: Support-View oeffnen
        if (typeof window.showView === 'function') window.showView('support');
    }
}

// ========== Auto-Mount nach Module-Ready ==========
function initChatbot() {
    // Warten bis User eingeloggt ist
    if (_sbUser() && _sbProfile()) {
        mountChatWidget();
    } else {
        // Retry nach kurzer Wartezeit
        setTimeout(function() {
            if (_sbUser() && _sbProfile()) mountChatWidget();
        }, 3000);
    }
}

// Mount on module load und auf View-Change events
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(initChatbot, 2000); });
} else {
    setTimeout(initChatbot, 2000);
}

// Auch bei Login nachmounten
window.addEventListener('vit:modules-ready', function() {
    setTimeout(initChatbot, 1500);
});

// Chatbot ausblenden wenn Kommunikation aktiv, sonst einblenden
window.addEventListener('vit:view-changed', function(e) {
    var widget = document.getElementById('supChatWidget');
    if (!widget) return;
    widget.style.display = (e.detail && e.detail.view === 'kommunikation') ? 'none' : '';
});

// ========== Strangler Fig: window.* registration ==========
const _exports = {
    supChatToggle, supChatSend, supChatQuick, supChatCreateTicket
};
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
