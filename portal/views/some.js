/**
 * views/some.js - Social Media (SOME) Modul
 * @module views/some
 */

function renderSome() {
    var el = document.getElementById('hqSomeView');
    if (!el) return;
    el.innerHTML = '<div class="p-8 text-center text-gray-400"><p class="text-lg font-semibold mb-2">Social Media</p><p class="text-sm">Modul in Entwicklung</p></div>';
}

// Exports
window.renderSome = renderSome;
