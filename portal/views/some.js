/**
 * views/some.js - Social Media (SOME) Modul
 * Delegates to scompler.js (renderScompler)
 * @module views/some
 */

function renderSome() {
    // Ensure scomplerContent is inside someContent
    var someEl = document.getElementById('someContent');
    if (someEl && !document.getElementById('scomplerContent')) {
        var div = document.createElement('div');
        div.id = 'scomplerContent';
        div.className = 'p-0';
        someEl.appendChild(div);
    }

    // Delegate to scompler module
    if (typeof window.renderScompler === 'function') {
        window.renderScompler();
    } else {
        // Module not loaded yet — retry up to 5x
        var _retries = 0;
        var _tryRender = function() {
            _retries++;
            if (typeof window.renderScompler === 'function') {
                window.renderScompler();
            } else if (_retries < 5) {
                setTimeout(_tryRender, 500);
            } else {
                var el = document.getElementById('scomplerContent');
                if (el) el.innerHTML = '<p class="p-8 text-gray-500">SOME-Modul konnte nicht geladen werden. Bitte Seite neu laden.</p>';
            }
        };
        setTimeout(_tryRender, 500);
    }
}

// Exports
window.renderSome = renderSome;
