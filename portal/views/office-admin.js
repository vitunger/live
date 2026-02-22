// ============================================================
// vit:bikes Partner Portal — Office Admin (Settings Tab)
// v4 — 2026-02-22 — Draggable room labels + saved positions
// Depends on globals: sb, escH, showNotification, showSettingsTab
// ============================================================
(function(){
    'use strict';

    var _rooms = [];
    var _desks = [];
    var _dragMode = false;
    var _dragTarget = null;

    function esc(s) { return typeof escH === 'function' ? escH(s) : (s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function notify(msg, type) { if (typeof showNotification === 'function') showNotification(msg, type||'success'); }
    function gv(id) { return (document.getElementById(id)||{}).value||''; }
    function gc(id) { return (document.getElementById(id)||{}).checked||false; }

    var ROOM_COLORS = {
        'GF Markus':'#EF7D00','Coworking 1':'#3B82F6','Mitte':'#22C55E',
        'Expansion':'#8B5CF6','Rechts-Oben':'#EC4899','Finanzen':'#EF4444',
        'IT':'#6366F1','HR':'#14B8A6','GF Matthias':'#F59E0B','default':'#6B7280'
    };
    function roomColor(name) { return ROOM_COLORS[name] || ROOM_COLORS['default']; }
    function deskTypeLabel(t) {
        var icons = {standard:'🪑',stehplatz:'🧍',monitor:'🖥️',focus:'🎧',parkplatz:'🅿️','e-lade':'⚡'};
        return (icons[t]||'🪑') + ' ' + (t||'standard');
    }

    // ── FIXED: No destructuring, explicit error logging ──
    async function loadData() {
        if (typeof sb === 'undefined' || !sb) { console.warn('[OfficeAdmin] sb not ready'); return; }
        try {
            var roomsResp = await sb.from('office_rooms').select('*').order('sortierung');
            var desksResp = await sb.from('office_desks').select('*').order('nr');
            if (roomsResp.error) { console.error('[OfficeAdmin] rooms error:', roomsResp.error); return; }
            if (desksResp.error) { console.error('[OfficeAdmin] desks error:', desksResp.error); return; }
            _rooms = (roomsResp.data || []).filter(function(r) { return r.active && r.name !== 'unbekannt'; });
            _desks = (desksResp.data || []).filter(function(d) { return d.active; });
        } catch(err) { console.error('[OfficeAdmin] loadData exception:', err); }
    }

    // ═══════════════════════════════════════════════════════
    window.officeRenderAdminDots = async function() {
        await loadData();
        renderDots();
        renderLegend();
        renderRoomsAdmin();
    };

    // ═══════════════════════════════════════════════════════
    //  GRUNDRISS UPLOAD
    // ═══════════════════════════════════════════════════════
    window.officeUploadGrundriss = async function() {
        var input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
        input.onchange = async function() {
            var file = input.files[0]; if (!file) return;
            if (file.size > 10*1024*1024) { notify('Max 10 MB','error'); return; }
            try {
                var fn = 'grundriss_'+Date.now()+'_'+file.name.replace(/[^a-zA-Z0-9._-]/g,'');
                var r = await sb.storage.from('office-grundrisse').upload(fn, file, {cacheControl:'3600',upsert:false});
                if (r.error) throw r.error;
                var url = sb.storage.from('office-grundrisse').getPublicUrl(fn).data.publicUrl;
                var img = document.getElementById('officeGrundrissImg');
                var ph = document.getElementById('officeGrundrissPlaceholder');
                if (img) { img.src = url; img.style.display = 'block'; img.onload = function(){ renderDots(); }; }
                if (ph) ph.style.display = 'none';
                notify('✅ Grundriss hochgeladen!');
            } catch(err) { notify('Upload fehlgeschlagen: '+err.message,'error'); }
        };
        input.click();
    };

    // ═══════════════════════════════════════════════════════
    //  DOTS ON FLOORPLAN
    // ═══════════════════════════════════════════════════════
    var _labelDragTarget = null;

    function renderDots() {
        var c = document.getElementById('officeAdminDots'); if(!c) return;
        c.style.pointerEvents = _dragMode ? 'auto' : 'none';
        var h = '';
        _rooms.forEach(function(r) {
            var rd = _desks.filter(function(d){return d.room_id===r.id;});
            // Use saved label position, or fallback to computed average of desks
            var lx = parseFloat(r.label_pct_x);
            var ly = parseFloat(r.label_pct_y);
            if(isNaN(lx) || isNaN(ly)) {
                if(!rd.length) return;
                lx = rd.reduce(function(s,d){return s+(parseFloat(d.pct_x)||50);},0)/rd.length;
                ly = rd.reduce(function(s,d){return s+(parseFloat(d.pct_y)||50);},0)/rd.length - 5;
            }
            var col = roomColor(r.name);
            var cursor = _dragMode ? 'grab' : 'default';
            var outline = _dragMode ? 'outline:2px dashed rgba(255,255,255,.5);outline-offset:2px;' : '';
            h += '<div class="office-label" data-room-id="'+r.id+'" style="position:absolute;left:'+lx+'%;top:'+ly+'%;transform:translate(-50%,-100%);background:'+col+';color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap;pointer-events:'+(_dragMode?'auto':'none')+';z-index:15;box-shadow:0 1px 3px rgba(0,0,0,.2);opacity:.9;cursor:'+cursor+';'+outline+'">'+esc(r.name)+' <span style="opacity:.7">('+rd.length+')</span></div>';
        });
        _desks.forEach(function(d) {
            var px=parseFloat(d.pct_x)||50, py=parseFloat(d.pct_y)||50;
            var rm=_rooms.find(function(r){return r.id===d.room_id;}), col=rm?roomColor(rm.name):roomColor('default');
            var tt='P'+d.nr+(rm?' · '+rm.name:'')+(d.has_monitor?' · 🖥️':'');
            h += '<div class="office-admin-dot" data-nr="'+d.nr+'" title="'+esc(tt)+'" style="position:absolute;left:'+px+'%;top:'+py+'%;transform:translate(-50%,-50%);width:18px;height:18px;border-radius:50%;background:'+col+';border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:'+(_dragMode?'grab':'default')+';z-index:10;display:flex;align-items:center;justify-content:center;font-size:7px;color:white;font-weight:700">'+d.nr+'</div>';
        });
        c.innerHTML = h;
        if(_dragMode) {
            c.querySelectorAll('.office-admin-dot').forEach(function(dot){
                dot.addEventListener('mousedown',startDrag); dot.addEventListener('touchstart',startDragTouch,{passive:false});
            });
            c.querySelectorAll('.office-label').forEach(function(lbl){
                lbl.addEventListener('mousedown',startLabelDrag); lbl.addEventListener('touchstart',startLabelDragTouch,{passive:false});
            });
        }
    }

    // ── Label drag handlers ──
    function startLabelDrag(e){if(!_dragMode)return;e.preventDefault();e.stopPropagation();_labelDragTarget=e.currentTarget;_labelDragTarget.style.cursor='grabbing';_labelDragTarget.style.zIndex='100';_labelDragTarget.style.opacity='1';document.addEventListener('mousemove',onLabelDrag);document.addEventListener('mouseup',endLabelDrag);}
    function startLabelDragTouch(e){if(!_dragMode)return;e.preventDefault();e.stopPropagation();_labelDragTarget=e.currentTarget;_labelDragTarget.style.zIndex='100';document.addEventListener('touchmove',onLabelDragTouch,{passive:false});document.addEventListener('touchend',endLabelDragTouch);}
    function onLabelDrag(e){if(_labelDragTarget)moveLabelDot(e.clientX,e.clientY);}
    function onLabelDragTouch(e){if(_labelDragTarget&&e.touches[0]){e.preventDefault();moveLabelDot(e.touches[0].clientX,e.touches[0].clientY);}}
    function moveLabelDot(cx,cy){var img=document.getElementById('officeGrundrissImg');if(!img||!_labelDragTarget)return;var r=img.getBoundingClientRect();_labelDragTarget.style.left=Math.max(0,Math.min(100,((cx-r.left)/r.width)*100))+'%';_labelDragTarget.style.top=Math.max(0,Math.min(100,((cy-r.top)/r.height)*100))+'%';}
    async function endLabelDrag(){document.removeEventListener('mousemove',onLabelDrag);document.removeEventListener('mouseup',endLabelDrag);await saveLabelPos();}
    async function endLabelDragTouch(){document.removeEventListener('touchmove',onLabelDragTouch);document.removeEventListener('touchend',endLabelDragTouch);await saveLabelPos();}
    async function saveLabelPos(){
        if(!_labelDragTarget)return;
        var roomId=_labelDragTarget.dataset.roomId;
        var l=parseFloat(_labelDragTarget.style.left);
        var t=parseFloat(_labelDragTarget.style.top);
        _labelDragTarget.style.cursor='grab';_labelDragTarget.style.zIndex='15';_labelDragTarget=null;
        try{
            var r=await sb.from('office_rooms').update({label_pct_x:l.toFixed(2),label_pct_y:t.toFixed(2)}).eq('id',roomId);
            if(r.error)throw r.error;
            var rm=_rooms.find(function(rm){return rm.id===roomId;});
            if(rm){rm.label_pct_x=l.toFixed(2);rm.label_pct_y=t.toFixed(2);}
            notify('📌 Label verschoben','success');
        }catch(e){notify('Label speichern fehlgeschlagen','error');}
    }

    function startDrag(e){if(!_dragMode)return;e.preventDefault();_dragTarget=e.currentTarget;_dragTarget.style.cursor='grabbing';_dragTarget.style.zIndex='100';document.addEventListener('mousemove',onDrag);document.addEventListener('mouseup',endDrag);}
    function startDragTouch(e){if(!_dragMode)return;e.preventDefault();_dragTarget=e.currentTarget;_dragTarget.style.zIndex='100';document.addEventListener('touchmove',onDragTouch,{passive:false});document.addEventListener('touchend',endDragTouch);}
    function onDrag(e){if(_dragTarget)moveDot(e.clientX,e.clientY);}
    function onDragTouch(e){if(_dragTarget&&e.touches[0]){e.preventDefault();moveDot(e.touches[0].clientX,e.touches[0].clientY);}}
    function moveDot(cx,cy){var img=document.getElementById('officeGrundrissImg');if(!img||!_dragTarget)return;var r=img.getBoundingClientRect();_dragTarget.style.left=Math.max(0,Math.min(100,((cx-r.left)/r.width)*100))+'%';_dragTarget.style.top=Math.max(0,Math.min(100,((cy-r.top)/r.height)*100))+'%';}
    async function endDrag(){document.removeEventListener('mousemove',onDrag);document.removeEventListener('mouseup',endDrag);await saveDotPos();}
    async function endDragTouch(){document.removeEventListener('touchmove',onDragTouch);document.removeEventListener('touchend',endDragTouch);await saveDotPos();}
    async function saveDotPos(){if(!_dragTarget)return;var nr=parseInt(_dragTarget.dataset.nr),l=parseFloat(_dragTarget.style.left),t=parseFloat(_dragTarget.style.top);_dragTarget.style.cursor='grab';_dragTarget.style.zIndex='10';_dragTarget=null;try{var r=await sb.from('office_desks').update({pct_x:l.toFixed(2),pct_y:t.toFixed(2)}).eq('nr',nr);if(r.error)throw r.error;var d=_desks.find(function(d){return d.nr===nr;});if(d){d.pct_x=l.toFixed(2);d.pct_y=t.toFixed(2);}}catch(e){notify('Position speichern fehlgeschlagen','error');}}

    window.officeToggleDragMode = function(){var cb=document.getElementById('officeAdminDragMode');_dragMode=cb?cb.checked:false;var h=document.getElementById('officeAdminDragHint');if(h)h.innerHTML=_dragMode?'<span class="text-orange-600 font-semibold">⚡ Drag-Modus aktiv!</span> Ziehe Punkte <b>und Raumnamen</b> an die richtige Position.':'Aktiviere "Plätze verschieben" um Dots und Raumnamen per Drag & Drop auf dem Grundriss zu positionieren.';renderDots();};

    function renderLegend(){var el=document.getElementById('officeRoomLegend');if(!el)return;var h='';_rooms.forEach(function(r){var cnt=_desks.filter(function(d){return d.room_id===r.id;}).length;h+='<span class="flex items-center gap-1.5 text-[11px] text-gray-600 px-2 py-1 bg-gray-50 rounded-full"><span class="w-2.5 h-2.5 rounded-full" style="background:'+roomColor(r.name)+'"></span>'+esc(r.name)+' <span class="font-bold">('+cnt+')</span></span>';});el.innerHTML=h;}

    // ═══════════════════════════════════════════════════════
    //  ROOMS & DESKS ADMIN LIST
    // ═══════════════════════════════════════════════════════
    function renderRoomsAdmin() {
        var el = document.getElementById('officeRoomsAdmin');
        if (!el) return;

        if (!_rooms.length) {
            el.innerHTML = '<div class="vit-card p-6 text-center text-gray-400"><p class="text-3xl mb-2">🏢</p><p class="font-semibold">Noch keine Räume angelegt</p><button onclick="officeAddRoom()" class="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600">+ Ersten Raum anlegen</button></div>';
            return;
        }

        var h = '<div class="flex items-center justify-between mb-4"><h3 class="font-bold text-gray-800 text-lg">🏢 Räume & Plätze</h3><button onclick="officeAddRoom()" class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 shadow-sm">+ Raum hinzufügen</button></div>';

        _rooms.forEach(function(room) {
            var desks = _desks.filter(function(d) { return d.room_id === room.id; });
            var col = roomColor(room.name);

            h += '<div class="vit-card p-4 mb-3 border-l-4" style="border-left-color:'+col+'">';
            h += '<div class="flex items-center justify-between mb-3">';
            h += '<div class="flex items-center gap-3"><span class="w-3 h-3 rounded-full flex-shrink-0" style="background:'+col+'"></span><div><span class="font-bold text-gray-800">'+esc(room.name)+'</span>';
            if(room.floor_label) h += ' <span class="text-xs text-gray-400 ml-1">('+esc(room.floor_label)+')</span>';
            h += '<span class="text-xs text-gray-400 ml-2">'+desks.length+' Plätze</span></div></div>';
            h += '<div class="flex items-center gap-1"><button onclick="officeEditRoom(\''+room.id+'\')" class="text-xs px-2 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200" title="Bearbeiten">✏️</button>';
            h += '<button onclick="officeDeleteRoom(\''+room.id+'\')" class="text-xs px-2 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100" title="Löschen">🗑️</button></div></div>';

            if (desks.length) {
                h += '<div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="text-gray-400 border-b"><th class="text-left py-1.5 font-semibold">Nr</th><th class="text-left py-1.5 font-semibold">Label</th><th class="text-left py-1.5 font-semibold">Typ</th><th class="text-center py-1.5 font-semibold">🖥️</th><th class="text-center py-1.5 font-semibold">🔌</th><th class="text-center py-1.5 font-semibold">Buchbar</th><th class="text-left py-1.5 font-semibold">Pos.</th><th class="text-right py-1.5 font-semibold">Aktion</th></tr></thead><tbody>';
                desks.forEach(function(d) {
                    h += '<tr class="border-b border-gray-50 hover:bg-gray-50">';
                    h += '<td class="py-2 font-bold text-gray-700">P'+d.nr+'</td>';
                    h += '<td class="py-2 text-gray-500">'+(d.label?esc(d.label):'<span class="text-gray-300">—</span>')+'</td>';
                    h += '<td class="py-2">'+deskTypeLabel(d.desk_type)+'</td>';
                    h += '<td class="py-2 text-center">'+(d.has_monitor?'✅':'—')+'</td>';
                    h += '<td class="py-2 text-center">'+(d.has_docking?'✅':'—')+'</td>';
                    h += '<td class="py-2 text-center">'+(d.is_bookable!==false?'✅':'❌')+'</td>';
                    h += '<td class="py-2 text-gray-400">'+(d.pct_x?parseFloat(d.pct_x).toFixed(0)+'%,'+parseFloat(d.pct_y).toFixed(0)+'%':'<span class="text-yellow-500">⚠️</span>')+'</td>';
                    h += '<td class="py-2 text-right whitespace-nowrap"><button onclick="officeEditDesk('+d.nr+')" class="text-gray-400 hover:text-blue-500 mr-1" title="Bearbeiten">✏️</button><button onclick="officeDeleteDesk('+d.nr+')" class="text-gray-400 hover:text-red-500" title="Löschen">🗑️</button></td></tr>';
                });
                h += '</tbody></table></div>';
            } else {
                h += '<p class="text-gray-400 text-xs py-2 italic">Keine Plätze — füge den ersten hinzu ↓</p>';
            }

            h += '<button onclick="officeAddDesk(\''+room.id+'\',\''+esc(room.name).replace(/'/g,"\\'")+'\')" class="mt-3 text-xs px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-semibold">+ Platz hinzufügen</button></div>';
        });

        // Orphans
        var orphans = _desks.filter(function(d){ return !_rooms.find(function(r){return r.id===d.room_id;}); });
        if (orphans.length) {
            h += '<div class="vit-card p-4 mb-3 border-l-4 border-yellow-400"><h4 class="font-bold text-yellow-700 mb-2">⚠️ Plätze ohne Raum ('+orphans.length+')</h4><p class="text-xs text-gray-500 mb-2">Diese Plätze sind keinem aktiven Raum zugeordnet.</p>';
            orphans.forEach(function(d){
                h += '<div class="flex items-center justify-between py-1.5 border-b border-gray-100 text-xs"><span>P'+d.nr+' <span class="text-gray-400">('+esc(d.room||'?')+')</span></span><div><button onclick="officeEditDesk('+d.nr+')" class="text-gray-400 hover:text-blue-500 mr-1">✏️</button><button onclick="officeDeleteDesk('+d.nr+')" class="text-red-400 hover:text-red-600">🗑️</button></div></div>';
            });
            h += '</div>';
        }

        el.innerHTML = h;
    }

    // ═══════════════════════════════════════════════════════
    //  ROOM CRUD
    // ═══════════════════════════════════════════════════════
    window.officeAddRoom = function() {
        oModal('Neuen Raum anlegen',
            '<div class="space-y-3"><div><label class="block text-sm font-semibold text-gray-600 mb-1">Name *</label><input id="oaRN" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" placeholder="z.B. Meeting-Raum 1"></div><div><label class="block text-sm font-semibold text-gray-600 mb-1">Etage / Bereich</label><input id="oaRF" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="z.B. OG"></div><div><label class="block text-sm font-semibold text-gray-600 mb-1">Sortierung</label><input id="oaRS" type="number" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value="'+(_rooms.length+1)+'"></div></div>',
            async function() {
                var name = gv('oaRN').trim();
                if (!name) { notify('Name ist Pflichtfeld','error'); return; }
                try {
                    var r = await sb.from('office_rooms').insert({name:name,floor_label:gv('oaRF')||null,sortierung:parseInt(gv('oaRS'))||0}).select().single();
                    if (r.error) throw r.error;
                    notify('✅ Raum "'+name+'" angelegt');
                    cModal(); await officeRenderAdminDots();
                } catch(err) { notify('Fehler: '+err.message,'error'); }
            }
        );
    };

    window.officeEditRoom = function(id) {
        var room = _rooms.find(function(r){return r.id===id;}); if(!room) return;
        oModal('Raum bearbeiten: '+esc(room.name),
            '<div class="space-y-3"><div><label class="block text-sm font-semibold text-gray-600 mb-1">Name *</label><input id="oaRN" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500" value="'+esc(room.name)+'"></div><div><label class="block text-sm font-semibold text-gray-600 mb-1">Etage / Bereich</label><input id="oaRF" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value="'+esc(room.floor_label||'')+'"></div><div><label class="block text-sm font-semibold text-gray-600 mb-1">Sortierung</label><input id="oaRS" type="number" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value="'+(room.sortierung||0)+'"></div></div>',
            async function() {
                var name = gv('oaRN').trim();
                if (!name) { notify('Name ist Pflichtfeld','error'); return; }
                try {
                    var upd = await sb.from('office_rooms').update({name:name,floor_label:gv('oaRF')||null,sortierung:parseInt(gv('oaRS'))||0}).eq('id',id);
                    if (upd.error) throw upd.error;
                    await sb.from('office_desks').update({room:name}).eq('room_id',id);
                    notify('✅ Raum aktualisiert');
                    cModal(); await officeRenderAdminDots();
                } catch(err) { notify('Fehler: '+err.message,'error'); }
            }
        );
    };

    window.officeDeleteRoom = async function(id) {
        var room = _rooms.find(function(r){return r.id===id;}); if(!room) return;
        var cnt = _desks.filter(function(d){return d.room_id===id;}).length;
        if (cnt > 0) { notify('⚠️ Raum "'+room.name+'" hat noch '+cnt+' Plätze — erst löschen/verschieben','error'); return; }
        if (!confirm('Raum "'+room.name+'" wirklich löschen?')) return;
        try {
            var r = await sb.from('office_rooms').update({active:false}).eq('id',id);
            if (r.error) throw r.error;
            notify('🗑️ Raum "'+room.name+'" gelöscht');
            await officeRenderAdminDots();
        } catch(err) { notify('Fehler: '+err.message,'error'); }
    };

    // ═══════════════════════════════════════════════════════
    //  DESK CRUD
    // ═══════════════════════════════════════════════════════
    window.officeAddDesk = function(roomId, roomName) {
        var allNrs = _desks.map(function(d){return d.nr;});
        var nextNr = allNrs.length ? Math.max.apply(null,allNrs)+1 : 1;
        var opts = ['standard','stehplatz','monitor','focus','parkplatz','e-lade'].map(function(t){return '<option value="'+t+'">'+deskTypeLabel(t)+'</option>';}).join('');

        oModal('Neuen Platz in "'+esc(roomName)+'"',
            '<div class="space-y-3"><div class="grid grid-cols-2 gap-3"><div><label class="block text-sm font-semibold text-gray-600 mb-1">Platz-Nr *</label><input id="oaDN" type="number" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value="'+nextNr+'"></div><div><label class="block text-sm font-semibold text-gray-600 mb-1">Typ</label><select id="oaDT" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">'+opts+'</select></div></div><div><label class="block text-sm font-semibold text-gray-600 mb-1">Label</label><input id="oaDL" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="z.B. Fensterplatz"></div><div class="flex flex-wrap gap-4"><label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" id="oaDM" checked class="accent-orange-500 w-4 h-4"> 🖥️ Monitor</label><label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" id="oaDD" class="accent-orange-500 w-4 h-4"> 🔌 Docking</label><label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" id="oaDB" checked class="accent-orange-500 w-4 h-4"> 📅 Buchbar</label></div></div>',
            async function() {
                var nr = parseInt(gv('oaDN'));
                if (!nr||nr<1) { notify('Platz-Nr muss > 0 sein','error'); return; }
                var existing = await sb.from('office_desks').select('nr').eq('nr',nr).maybeSingle();
                if (existing.data) { notify('P'+nr+' existiert bereits!','error'); return; }
                try {
                    var r = await sb.from('office_desks').insert({nr:nr,room:roomName,room_id:roomId,desk_type:gv('oaDT')||'standard',has_monitor:gc('oaDM'),has_docking:gc('oaDD'),is_bookable:gc('oaDB'),label:gv('oaDL')||null,pct_x:50,pct_y:50,x:0,y:0}).select().single();
                    if (r.error) throw r.error;
                    notify('✅ P'+nr+' angelegt — Drag-Modus zum Positionieren!');
                    cModal();
                    var cb = document.getElementById('officeAdminDragMode');
                    if (cb&&!cb.checked) { cb.checked = true; officeToggleDragMode(); }
                    await officeRenderAdminDots();
                } catch(err) { notify('Fehler: '+err.message,'error'); }
            }
        );
    };

    window.officeEditDesk = function(nr) {
        var desk = _desks.find(function(d){return d.nr===nr;}); if(!desk) return;
        var tOpts = ['standard','stehplatz','monitor','focus','parkplatz','e-lade'].map(function(t){return '<option value="'+t+'"'+(desk.desk_type===t?' selected':'')+'>'+deskTypeLabel(t)+'</option>';}).join('');
        var rOpts = _rooms.map(function(r){return '<option value="'+r.id+'"'+(desk.room_id===r.id?' selected':'')+'>'+esc(r.name)+'</option>';}).join('');

        oModal('Platz P'+nr+' bearbeiten',
            '<div class="space-y-3"><div class="grid grid-cols-2 gap-3"><div><label class="block text-sm font-semibold text-gray-600 mb-1">Raum</label><select id="oaDR" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">'+rOpts+'</select></div><div><label class="block text-sm font-semibold text-gray-600 mb-1">Typ</label><select id="oaDT" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">'+tOpts+'</select></div></div><div><label class="block text-sm font-semibold text-gray-600 mb-1">Label</label><input id="oaDL" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value="'+esc(desk.label||'')+'"></div><div class="flex flex-wrap gap-4"><label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" id="oaDM"'+(desk.has_monitor?' checked':'')+' class="accent-orange-500 w-4 h-4"> 🖥️ Monitor</label><label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" id="oaDD"'+(desk.has_docking?' checked':'')+' class="accent-orange-500 w-4 h-4"> 🔌 Docking</label><label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" id="oaDB"'+(desk.is_bookable!==false?' checked':'')+' class="accent-orange-500 w-4 h-4"> 📅 Buchbar</label></div></div>',
            async function() {
                var selRoom = gv('oaDR');
                var rmObj = _rooms.find(function(r){return r.id===selRoom;});
                try {
                    var upd = await sb.from('office_desks').update({room_id:selRoom,room:rmObj?rmObj.name:desk.room,desk_type:gv('oaDT')||'standard',has_monitor:gc('oaDM'),has_docking:gc('oaDD'),is_bookable:gc('oaDB'),label:gv('oaDL')||null}).eq('nr',nr);
                    if (upd.error) throw upd.error;
                    notify('✅ P'+nr+' aktualisiert');
                    cModal(); await officeRenderAdminDots();
                } catch(err) { notify('Fehler: '+err.message,'error'); }
            }
        );
    };

    window.officeDeleteDesk = async function(nr) {
        var today = new Date().toISOString().split('T')[0];
        var bk = await sb.from('office_bookings').select('id').eq('desk_nr',nr).gte('booking_date',today).limit(1);
        if (bk.data&&bk.data.length>0) {
            if (!confirm('⚠️ P'+nr+' hat aktive Buchungen!\nTrotzdem deaktivieren?')) return;
        } else {
            if (!confirm('Platz P'+nr+' wirklich deaktivieren?')) return;
        }
        try {
            var r = await sb.from('office_desks').update({active:false}).eq('nr',nr);
            if (r.error) throw r.error;
            notify('🗑️ P'+nr+' deaktiviert');
            await officeRenderAdminDots();
        } catch(err) { notify('Fehler: '+err.message,'error'); }
    };

    // ═══════════════════════════════════════════════════════
    //  MODAL HELPER
    // ═══════════════════════════════════════════════════════
    function oModal(title, body, onSave) {
        var m = document.getElementById('officeAdminModal'); if(m) m.remove();
        m = document.createElement('div');
        m.id = 'officeAdminModal';
        m.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
        m.style.backdropFilter = 'blur(2px)';
        m.innerHTML = '<div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"><div class="flex items-center justify-between mb-4"><h3 class="text-lg font-bold text-gray-800">'+title+'</h3><button onclick="cModal()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div><div>'+body+'</div><div class="flex gap-3 mt-5"><button id="oaModalSave" class="flex-1 px-4 py-2.5 text-white rounded-lg font-semibold hover:opacity-90" style="background:#EF7D00">Speichern</button><button onclick="cModal()" class="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-semibold hover:bg-gray-200">Abbrechen</button></div></div>';
        document.body.appendChild(m);
        m.addEventListener('click', function(e){if(e.target===m)cModal();});
        var escH2 = function(e){if(e.key==='Escape'){cModal();document.removeEventListener('keydown',escH2);}};
        document.addEventListener('keydown', escH2);
        document.getElementById('oaModalSave').addEventListener('click', onSave);
        setTimeout(function(){var inp=m.querySelector('input:not([type=checkbox]):not([type=number])');if(inp)inp.focus();},100);
    }
    window.cModal = function(){var m=document.getElementById('officeAdminModal');if(m)m.remove();};

    // Hook settings tab
    var _origST = window.showSettingsTab;
    window.showSettingsTab = function(tab) {
        if (typeof _origST === 'function') _origST(tab);
        if (tab === 'office') setTimeout(officeRenderAdminDots, 150);
    };

    console.log('[OfficeAdmin] Module v4 loaded ✓');
})();
