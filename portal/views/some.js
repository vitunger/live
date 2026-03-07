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
        // Fallback while module loads
        document.addEventListener('vit:modules-ready', function() {
            if (typeof window.renderScompler === 'function') window.renderScompler();
        }, { once: true });
    }
}

// Exports
window.renderSome = renderSome;
