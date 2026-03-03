// Temp debug for aktenschrank
document.addEventListener('vit:modules-ready', function() {
    console.log('[akten-debug] modules ready');
    var el = document.getElementById('aktenschrankView');
    console.log('[akten-debug] el:', el, 'display:', el ? el.style.display : 'N/A');
    console.log('[akten-debug] innerHTML len:', el ? el.innerHTML.length : 0);
    console.log('[akten-debug] loadAktenschrank:', typeof window.loadAktenschrank);
    if (el) {
        new MutationObserver(function(m) {
            m.forEach(function(mut) {
                if (mut.attributeName === 'style')
                    console.log('[akten-debug] STYLE:', el.style.display, 'html:', el.innerHTML.length);
            });
        }).observe(el, { attributes: true, attributeFilter: ['style'] });
        new MutationObserver(function() {
            console.log('[akten-debug] CHILDREN:', el.innerHTML.length);
        }).observe(el, { childList: true });
    }
});
