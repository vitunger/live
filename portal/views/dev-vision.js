/**
 * views/dev-vision.js - Vision editor (Owner only)
 * @module views/dev-vision
 */
function _sb()           { return window.sb; }
function _sbUser()       { return window.sbUser; }
function _sbProfile()    { return window.sbProfile; }
function _escH(s)        { return typeof window.escH === 'function' ? window.escH(s) : String(s); }
function _t(k)           { return typeof window.t === 'function' ? window.t(k) : k; }
function _showToast(m,t) { if (typeof window.showToast === 'function') window.showToast(m,t); }
function _fmtN(n)        { return typeof window.fmtN === 'function' ? window.fmtN(n) : String(n); }
function _triggerPush()  { if (typeof window.triggerPush === 'function') window.triggerPush.apply(null, arguments); }
function _sbUrl() { return window.SUPABASE_URL; }

// Shared state access
function _devSubs() { return window._devState ? window._devState.submissions : []; }
function _devStatusLabels() { return window._devState ? window._devState.statusLabels : {}; }
function _devStatusColors() { return window._devState ? window._devState.statusColors : {}; }
function _devKatIcons() { return window._devState ? window._devState.katIcons : {}; }

export async function renderDevVision() {
    var c = document.getElementById('entwTabVision');
    if(!c) return;
    var isOwner = (currentRoles||[]).indexOf('owner') !== -1;
    if(!isOwner) { c.innerHTML = '<p class="text-gray-400 py-8 text-center">Nur für Owner sichtbar.</p>'; return; }

    c.innerHTML = '<div class="text-center py-8"><div class="animate-spin w-6 h-6 border-2 border-vit-orange border-t-transparent rounded-full mx-auto"></div><p class="text-sm text-gray-400 mt-2">Vision wird geladen...</p></div>';

    try {
        var resp = await _sb().from('portal_vision').select('*').order('updated_at', {ascending: false}).limit(1);
        var vision = resp.data && resp.data[0] ? resp.data[0] : null;
        var inhalt = vision ? vision.inhalt : '';
        var updatedAt = vision && vision.updated_at ? new Date(vision.updated_at).toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'noch nie';

        var h = '';
        h += '<div class="max-w-3xl mx-auto">';
        h += '<div class="vit-card p-6 mb-6">';
        h += '<div class="flex items-center justify-between mb-4">';
        h += '<div><h2 class="text-lg font-bold text-gray-800">🔭 Portal-Vision</h2>';
        h += '<p class="text-xs text-gray-400 mt-1">Zuletzt aktualisiert: '+updatedAt+'</p></div>';
        h += '</div>';
        h += '<p class="text-sm text-gray-500 mb-4">Beschreibe die Vision für das vit:bikes Portal. Die KI nutzt diesen Text, um den <b>Vision-Fit-Score</b> bei jeder neuen Idee zu berechnen. Je klarer die Vision, desto besser die Bewertungen.</p>';
        h += '<textarea id="devVisionTextarea" class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-vit-orange focus:border-vit-orange" rows="12" placeholder="Beschreibe hier die Vision für das Portal...\n\nBeispiel:\nDas vit:bikes Partner Portal soll der zentrale digitale Arbeitsplatz für alle Franchise-Partner werden. Es vereint Verkauf, Controlling, Kommunikation und Wissensmanagement in einer Plattform. Ziel ist es, den Arbeitsalltag so zu vereinfachen, dass sich Partner auf das konzentrieren können, was sie am besten können: Fahrräder verkaufen und Kunden begeistern.\n\nFokus-Themen:\n- Automatisierung wiederkehrender Aufgaben\n- Echtzeit-Transparenz über alle Standorte\n- Einfache Bedienbarkeit für alle Altersgruppen\n- Mobile-First für den Einsatz im Laden">'+_escH(inhalt)+'</textarea>';
        h += '<div class="flex items-center justify-between mt-4">';
        h += '<p class="text-xs text-gray-400" id="devVisionCharCount">'+(inhalt.length)+' Zeichen</p>';
        h += '<button onclick="saveDevVision()" class="px-6 py-2.5 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">💾 Vision speichern</button>';
        h += '</div>';
        h += '</div>';

        // Info box
        h += '<div class="vit-card p-5 bg-blue-50 border border-blue-200">';
        h += '<h3 class="text-sm font-bold text-blue-800 mb-2">ℹ️ Wie wird die Vision verwendet?</h3>';
        h += '<ul class="text-xs text-blue-700 space-y-1.5">';
        h += '<li>• Bei jeder neuen Idee bewertet die KI den <b>Vision-Fit-Score</b> (0-100) basierend auf diesem Text</li>';
        h += '<li>• Ideen die gut zur Vision passen erhalten höhere Scores und werden im Board priorisiert</li>';
        h += '<li>• Die Vision hilft der KI auch bei der Konzepterstellung und Risikoeinschätzung</li>';
        h += '<li>• Aktualisiere die Vision regelmäßig wenn sich strategische Prioritäten ändern</li>';
        h += '</ul></div>';
        h += '</div>';

        c.innerHTML = h;

        // Live character count
        var ta = document.getElementById('devVisionTextarea');
        var cc = document.getElementById('devVisionCharCount');
        if(ta && cc) {
            ta.addEventListener('input', function() { cc.textContent = ta.value.length + ' Zeichen'; });
        }
    } catch(err) {
        c.innerHTML = '<div class="text-center py-8 text-red-500">Fehler: '+_escH(err.message||err)+'</div>';
    }
}

export async function saveDevVision() {
    var ta = document.getElementById('devVisionTextarea');
    if(!ta) return;
    var inhalt = ta.value.trim();

    try {
        // Check if vision row exists
        var resp = await _sb().from('portal_vision').select('id').limit(1);
        if(resp.data && resp.data.length > 0) {
            await _sb().from('portal_vision').update({
                inhalt: inhalt,
                updated_at: new Date().toISOString(),
                updated_by: _sbUser().id
            }).eq('id', resp.data[0].id);
        } else {
            await _sb().from('portal_vision').insert({
                inhalt: inhalt,
                updated_by: _sbUser().id
            });
        }
        _showToast('Vision gespeichert! Die KI nutzt sie ab sofort für neue Bewertungen.', 'success');
    } catch(err) {
        _showToast('Fehler beim Speichern: '+(err.message||err), 'error');
    }
}

const _exports = { renderDevVision, saveDevVision };
Object.entries(_exports).forEach(([k, fn]) => { window[k] = fn; });
