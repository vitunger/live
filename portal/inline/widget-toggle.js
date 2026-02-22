function toggleWidgetInfo(e, id) {
    e.stopPropagation();
    e.preventDefault();
    var el = document.getElementById(id);
    if(!el) return;
    
    // Close all others
    document.querySelectorAll('.widget-info-popup.active').forEach(function(p){
        if(p.id !== id) p.classList.remove('active');
    });
    
    // Remove existing overlay
    var oldOv = document.getElementById('widgetInfoOverlay');
    if(oldOv) oldOv.remove();
    
    var isOpen = el.classList.contains('active');
    if(isOpen) {
        el.classList.remove('active');
        return;
    }
    
    // Create overlay
    var ov = document.createElement('div');
    ov.id = 'widgetInfoOverlay';
    ov.className = 'widget-info-overlay active';
    ov.onclick = function(){ el.classList.remove('active'); ov.remove(); };
    document.body.appendChild(ov);
    
    el.classList.add('active');
}
