// ============================================================
// vit:bikes Partner Portal — Office Admin (Settings Tab)
// Extracted Module: /portal/views/office-admin.js
// Manages: Rooms, Desks, Grundriss Upload, Drag-to-Position
// Depends on globals: sb, escH, showNotification, showSettingsTab
// ============================================================
(function(){
    'use strict';

    // ── State ──
    var _rooms = [];
    var _desks = [];
    var _dragMode = false;
    var _dragTarget = null;

    // ── Helpers ──
    function esc(s) { return typeof escH === 'function' ? escH(s) : (s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function notify(msg, type) { if (typeof showNotification === 'function') showNotification(msg, type||'success'); }
    function gv(id) { return (document.getElementById(id)||{}).value||''; }
    function gc(id) { return (document.getElementById(id)||{}).checked||false; }

    var ROOM_COLORS = {
        'GF Markus':'#EF7D00', 'Coworking 1':'#3B82F6', 'Mitte':'#22C55E',
        'Expansion':'#8B5CF6', 'Rechts-Oben':'#EC4899', 'Finanzen':'#EF4444',
        'IT':'#6366F1', 'HR':'#14B8A6', 'default':'#6B7280'
    };
    function roomColor(name) { return ROOM_COLORS[name] || ROOM_COLORS['default']; }

    function deskTypeLabel(t) {
        var icons = { standard:'🪑', stehplatz:'🧍', monitor:'🖥️', focus:'🎧', parkplatz:'🅿️', 'e-lade':'⚡' };
        return (icons[t]||'') + ' ' + (t||'standard');
    }

    // ── Data Loading ──
    async function loadData() {
        var [rr, dr] = await Promise.all([
            sb.from('office_rooms').select('*').order('sortierung'),
            sb.from('office_desks').select('*').order('nr')
        ]);
        _rooms = (rr.data||[]).filter(function(r) { return r.active && r.name !== 'unbekannt'; });
        _desks = (dr.data||[]).filter(function(d) { return d.active; });
    }

    // ═══════════════════════════════════════════════════════
    //  MAIN ENTRY — called on img load + settings tab open
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
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
        input.onchange = async function() {
            var file = input.files[0];
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) { notify('Datei zu groß (max 10 MB)', 'error'); return; }
            try {
                var fileName = 'grundriss_' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '');
                var r = await sb.storage.from('office-grundrisse').upload(fileName, file, { cacheControl: '3600', upsert: false });
                if (r.error) throw r.error;
                var url = sb.storage.from('office-grundrisse').getPublicUrl(fileName).data.publicUrl;
                var img = document.getElementById('officeGrundrissImg');
                var ph = document.getElementById('officeGrundrissPlaceholder');
                if (img) { img.src = url; img.style.display = 'block'; img.onload = function() { renderDots(); }; }
                if (ph) ph.style.display = 'none';
                notify('✅ Grundriss hochgeladen!', 'success');
            } catch (err) {
                console.error('[OfficeAdmin] Upload error:', err);
                notify('Upload fehlgeschlagen: ' + err.message, 'error');
            }
        };
        input.click();
    };

    // ═══════════════════════════════════════════════════════
    //  DOTS ON FLOORPLAN
    // ═══════════════════════════════════════════════════════
    function renderDots() {
        var container = document.getElementById('officeAdminDots');
        if (!container) return;
        container.style.pointerEvents = _dragMode ? 'auto' : 'none';

        var html = '';
        _desks.forEach(function(d) {
            var px = parseFloat(d.pct_x) || 50;
            var py = parseFloat(d.pct_y) || 50;
            var rm = _rooms.find(function(r) { return r.id === d.room_id; });
            var col = rm ? roomColor(rm.name) : roomColor('default');
            var title = 'P' + d.nr + (rm ? ' · ' + rm.name : '') + (d.has_monitor ? ' · 🖥️' : '');
            html += '<div class="office-admin-dot" data-nr="' + d.nr + '" title="' + esc(title) + '" ' +
                'style="position:absolute;left:' + px + '%;top:' + py + '%;transform:translate(-50%,-50%);' +
                'width:18px;height:18px;border-radius:50%;background:' + col + ';border:2px solid white;' +
                'box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:' + (_dragMode ? 'grab' : 'default') + ';z-index:10;' +
                'display:flex;align-items:center;justify-content:center;font-size:7px;color:white;font-weight:700">' +
                d.nr + '</div>';
        });
        container.innerHTML = html;

        if (_dragMode) {
            container.querySelectorAll('.office-admin-dot').forEach(function(dot) {
                dot.addEventListener('mousedown', startDrag);
                dot.addEventListener('touchstart', startDragTouch, { passive: false });
            });
        }
    }

    // ── Drag & Drop ──
    function startDrag(e) {
        if (!_dragMode) return;
        e.preventDefault();
        _dragTarget = e.currentTarget;
        _dragTarget.style.cursor = 'grabbing';
        _dragTarget.style.zIndex = '100';
        _dragTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.4)';
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', endDrag);
    }
    function startDragTouch(e) {
        if (!_dragMode) return;
        e.preventDefault();
        _dragTarget = e.currentTarget;
        _dragTarget.style.zIndex = '100';
        document.addEventListener('touchmove', onDragTouch, { passive: false });
        document.addEventListener('touchend', endDragTouch);
    }
    function onDrag(e) { if (_dragTarget) moveDot(e.clientX, e.clientY); }
    function onDragTouch(e) { if (_dragTarget && e.touches[0]) { e.preventDefault(); moveDot(e.touches[0].clientX, e.touches[0].clientY); } }

    function moveDot(cx, cy) {
        var img = document.getElementById('officeGrundrissImg');
        if (!img || !_dragTarget) return;
        var rect = img.getBoundingClientRect();
        var pctX = Math.max(0, Math.min(100, ((cx - rect.left) / rect.width) * 100));
        var pctY = Math.max(0, Math.min(100, ((cy - rect.top) / rect.height) * 100));
        _dragTarget.style.left = pctX + '%';
        _dragTarget.style.top = pctY + '%';
    }

    async function endDrag() {
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', endDrag);
        await saveDotPosition();
    }
    async function endDragTouch() {
        document.removeEventListener('touchmove', onDragTouch);
        document.removeEventListener('touchend', endDragTouch);
        await saveDotPosition();
    }

    async function saveDotPosition() {
        if (!_dragTarget) return;
        var nr = parseInt(_dragTarget.dataset.nr);
        var left = parseFloat(_dragTarget.style.left);
        var top = parseFloat(_dragTarget.style.top);
        _dragTarget.style.cursor = 'grab';
        _dragTarget.style.zIndex = '10';
        _dragTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
        _dragTarget = null;
        try {
            var r = await sb.from('office_desks').update({ pct_x: left.toFixed(2), pct_y: top.toFixed(2) }).eq('nr', nr);
            if (r.error) throw r.error;
            var d = _desks.find(function(d) { return d.nr === nr; });
            if (d) { d.pct_x = left.toFixed(2); d.pct_y = top.toFixed(2); }
        } catch (err) {
            console.error('[OfficeAdmin] Save position error:', err);
            notify('Position speichern fehlgeschlagen', 'error');
        }
    }

    // ── Toggle ──
    window.officeToggleDragMode = function() {
        var cb = document.getElementById('officeAdminDragMode');
        _dragMode = cb ? cb.checked : false;
        var hint = document.getElementById('officeAdminDragHint');
        if (hint) {
            hint.innerHTML = _dragMode
                ? '<span class="text-orange-600 font-semibold">⚡ Drag-Modus aktiv!</span> Ziehe die Punkte an die richtige Position.'
                : 'Aktiviere "Plätze verschieben" um Dots per Drag & Drop auf dem Grundriss zu positionieren.';
        }
        renderDots();
    };

    // ── Legend ──
    function renderLegend() {
        var el = document.getElementById('officeRoomLegend');
        if (!el) return;
        var html = '';
        _rooms.forEach(function(r) {
            var cnt = _desks.filter(function(d) { return d.room_id === r.id; }).length;
            html += '<span class="flex items-center gap-1.5 text-[11px] text-gray-600 px-2 py-1 bg-gray-50 rounded-full">' +
                '<span class="w-2.5 h-2.5 rounded-full" style="background:' + roomColor(r.name) + '"></span>' +
                esc(r.name) + ' <span class="font-bold">(' + cnt + ')</span></span>';
        });
        el.innerHTML = html;
    }

    // ═══════════════════════════════════════════════════════
    //  ROOMS & DESKS ADMIN LIST
    // ═══════════════════════════════════════════════════════
    function renderRoomsAdmin() {
        var el = document.getElementById('officeRoomsAdmin');
        if (!el) return;

        var html = '<div class="flex items-center justify-between mb-4">' +
            '<h3 class="font-bold text-gray-800">🏢 Räume & Plätze</h3>' +
            '<button onclick="officeAddRoom()" class="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600">+ Raum hinzufügen</button>' +
        '</div>';

        _rooms.forEach(function(room) {
            var desks = _desks.filter(function(d) { return d.room_id === room.id; });
            var col = roomColor(room.name);

            html += '<div class="vit-card p-4 mb-3 border-l-4" style="border-left-color:' + col + '">' +
                '<div class="flex items-center justify-between mb-3">' +
                    '<div class="flex items-center gap-3">' +
                        '<span class="w-3 h-3 rounded-full" style="background:' + col + '"></span>' +
                        '<span class="font-bold text-gray-800">' + esc(room.name) + '</span>' +
                        (room.floor_label ? ' <span class="text-xs text-gray-400">(' + esc(room.floor_label) + ')</span>' : '') +
                    '</div>' +
                    '<div class="flex items-center gap-2">' +
                        '<button onclick="officeEditRoom(\'' + room.id + '\')" class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">✏️</button>' +
                        '<button onclick="officeDeleteRoom(\'' + room.id + '\')" class="text-xs px-2 py-1 bg-red-50 text-red-500 rounded hover:bg-red-100">🗑️</button>' +
                    '</div>' +
                '</div>';

            if (desks.length) {
                html += '<table class="w-full text-xs"><thead><tr class="text-gray-400 border-b">' +
                    '<th class="text-left py-1 font-semibold">Nr</th>' +
                    '<th class="text-left py-1 font-semibold">Typ</th>' +
                    '<th class="text-center py-1 font-semibold">🖥️</th>' +
                    '<th class="text-center py-1 font-semibold">🔌</th>' +
                    '<th class="text-center py-1 font-semibold">Buchbar</th>' +
                    '<th class="text-left py-1 font-semibold">Position</th>' +
                    '<th class="text-right py-1 font-semibold">Aktion</th>' +
                '</tr></thead><tbody>';
                desks.forEach(function(d) {
                    html += '<tr class="border-b border-gray-50 hover:bg-gray-50">' +
                        '<td class="py-1.5 font-bold text-gray-700">P' + d.nr + '</td>' +
                        '<td class="py-1.5">' + deskTypeLabel(d.desk_type) + '</td>' +
                        '<td class="py-1.5 text-center">' + (d.has_monitor ? '✅' : '—') + '</td>' +
                        '<td class="py-1.5 text-center">' + (d.has_docking ? '✅' : '—') + '</td>' +
                        '<td class="py-1.5 text-center">' + (d.is_bookable !== false ? '✅' : '❌') + '</td>' +
                        '<td class="py-1.5 text-gray-400">' + (d.pct_x ? d.pct_x + '%, ' + d.pct_y + '%' : '—') + '</td>' +
                        '<td class="py-1.5 text-right">' +
                            '<button onclick="officeEditDesk(' + d.nr + ')" class="text-gray-400 hover:text-blue-500 mr-1">✏️</button>' +
                            '<button onclick="officeDeleteDesk(' + d.nr + ')" class="text-gray-400 hover:text-red-500">🗑️</button>' +
                        '</td></tr>';
                });
                html += '</tbody></table>';
            } else {
                html += '<p class="text-gray-400 text-xs py-2">Keine Plätze</p>';
            }

            html += '<button onclick="officeAddDesk(\'' + room.id + '\',\'' + esc(room.name) + '\')" ' +
                'class="mt-2 text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-semibold">+ Platz hinzufügen</button>';
            html += '</div>';
        });

        // Orphan desks
        var orphans = _desks.filter(function(d) {
            return !_rooms.find(function(r) { return r.id === d.room_id; });
        });
        if (orphans.length) {
            html += '<div class="vit-card p-4 mb-3 border-l-4 border-yellow-400">' +
                '<h4 class="font-bold text-yellow-700 mb-2">⚠️ Plätze ohne Raum (' + orphans.length + ')</h4>';
            orphans.forEach(function(d) {
                html += '<div class="flex items-center justify-between py-1 text-xs">' +
                    '<span>P' + d.nr + ' <span class="text-gray-400">(' + esc(d.room || '?') + ')</span></span>' +
                    '<button onclick="officeDeleteDesk(' + d.nr + ')" class="text-red-400 hover:text-red-600">🗑️</button></div>';
            });
            html += '</div>';
        }

        el.innerHTML = html;
    }

    // ═══════════════════════════════════════════════════════
    //  ROOM CRUD
    // ═══════════════════════════════════════════════════════
    window.officeAddRoom = function() {
        oModal('Neuen Raum anlegen',
            '<div class="space-y-3">' +
                '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Name *</label>' +
                '<input id="oaRN" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="z.B. Meeting-Raum 1"></div>' +
                '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Etage / Bereich</label>' +
                '<input id="oaRF" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="z.B. OG"></div>' +
                '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Sortierung</label>' +
                '<input id="oaRS" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" value="' + (_rooms.length + 1) + '"></div>' +
            '</div>',
            async function() {
                var name = gv('oaRN');
                if (!name) { notify('Name ist Pflichtfeld', 'error'); return; }
                try {
                    var r = await sb.from('office_rooms').insert({
                        name: name, floor_label: gv('oaRF') || null, sortierung: parseInt(gv('oaRS')) || 0
                    }).select().single();
                    if (r.error) throw r.error;
                    notify('✅ Raum "' + name + '" angelegt', 'success');
                    cModal(); await officeRenderAdminDots();
                } catch (err) { notify('Fehler: ' + err.message, 'error'); }
            }
        );
    };

    window.officeEditRoom = function(id) {
        var room = _rooms.find(function(r) { return r.id === id; });
        if (!room) return;
        oModal('Raum bearbeiten: ' + esc(room.name),
            '<div class="space-y-3">' +
                '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Name *</label>' +
                '<input id="oaRN" class="w-full border rounded-lg px-3 py-2 text-sm" value="' + esc(room.name) + '"></div>' +
                '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Etage / Bereich</label>' +
                '<input id="oaRF" class="w-full border rounded-lg px-3 py-2 text-sm" value="' + esc(room.floor_label || '') + '"></div>' +
                '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Sortierung</label>' +
                '<input id="oaRS" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" value="' + (room.sortierung || 0) + '"></div>' +
            '</div>',
            async function() {
                var name = gv('oaRN');
                if (!name) { notify('Name ist Pflichtfeld', 'error'); return; }
                try {
                    await sb.from('office_rooms').update({
                        name: name, floor_label: gv('oaRF') || null, sortierung: parseInt(gv('oaRS')) || 0
                    }).eq('id', id);
                    await sb.from('office_desks').update({ room: name }).eq('room_id', id);
                    notify('✅ Raum aktualisiert', 'success');
                    cModal(); await officeRenderAdminDots();
                } catch (err) { notify('Fehler: ' + err.message, 'error'); }
            }
        );
    };

    window.officeDeleteRoom = async function(id) {
        var room = _rooms.find(function(r) { return r.id === id; });
        if (!room) return;
        var cnt = _desks.filter(function(d) { return d.room_id === id; }).length;
        if (cnt > 0) { notify('⚠️ Raum hat noch ' + cnt + ' Plätze – erst löschen/verschieben', 'error'); return; }
        if (!confirm('Raum "' + room.name + '" wirklich löschen?')) return;
        try {
            await sb.from('office_rooms').update({ active: false }).eq('id', id);
            notify('🗑️ Raum gelöscht', 'success');
            await officeRenderAdminDots();
        } catch (err) { notify('Fehler: ' + err.message, 'error'); }
    };

    // ═══════════════════════════════════════════════════════
    //  DESK CRUD
    // ═══════════════════════════════════════════════════════
    window.officeAddDesk = function(roomId, roomName) {
        var nextNr = _desks.length ? Math.max.apply(null, _desks.map(function(d) { return d.nr; })) + 1 : 1;
        var opts = ['standard','stehplatz','monitor','focus','parkplatz','e-lade'].map(function(t) {
            return '<option value="' + t + '">' + deskTypeLabel(t) + '</option>';
        }).join('');

        oModal('Neuen Platz in "' + esc(roomName) + '"',
            '<div class="space-y-3">' +
                '<div class="grid grid-cols-2 gap-3">' +
                    '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Platz-Nr *</label>' +
                    '<input id="oaDN" type="number" class="w-full border rounded-lg px-3 py-2 text-sm" value="' + nextNr + '"></div>' +
                    '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Typ</label>' +
                    '<select id="oaDT" class="w-full border rounded-lg px-3 py-2 text-sm">' + opts + '</select></div>' +
                '</div>' +
                '<div class="flex flex-wrap gap-4">' +
                    '<label class="flex items-center gap-2 text-sm"><input type="checkbox" id="oaDM" checked class="accent-orange-500"> 🖥️ Monitor</label>' +
                    '<label class="flex items-center gap-2 text-sm"><input type="checkbox" id="oaDD" class="accent-orange-500"> 🔌 Docking</label>' +
                    '<label class="flex items-center gap-2 text-sm"><input type="checkbox" id="oaDB" checked class="accent-orange-500"> 📅 Buchbar</label>' +
                '</div>' +
                '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Label</label>' +
                '<input id="oaDL" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="z.B. Fensterplatz"></div>' +
            '</div>',
            async function() {
                var nr = parseInt(gv('oaDN'));
                if (!nr || nr < 1) { notify('Platz-Nr muss > 0 sein', 'error'); return; }
                var existing = await sb.from('office_desks').select('nr').eq('nr', nr).maybeSingle();
                if (existing.data) { notify('P' + nr + ' existiert bereits', 'error'); return; }
                try {
                    var r = await sb.from('office_desks').insert({
                        nr: nr, room: roomName, room_id: roomId,
                        desk_type: gv('oaDT') || 'standard',
                        has_monitor: gc('oaDM'), has_docking: gc('oaDD'), is_bookable: gc('oaDB'),
                        label: gv('oaDL') || null,
                        pct_x: 50, pct_y: 50, x: 0, y: 0
                    }).select().single();
                    if (r.error) throw r.error;
                    notify('✅ P' + nr + ' angelegt – jetzt positionieren!', 'success');
                    cModal();
                    var cb = document.getElementById('officeAdminDragMode');
                    if (cb && !cb.checked) { cb.checked = true; officeToggleDragMode(); }
                    await officeRenderAdminDots();
                } catch (err) { notify('Fehler: ' + err.message, 'error'); }
            }
        );
    };

    window.officeEditDesk = function(nr) {
        var desk = _desks.find(function(d) { return d.nr === nr; });
        if (!desk) return;
        var tOpts = ['standard','stehplatz','monitor','focus','parkplatz','e-lade'].map(function(t) {
            return '<option value="' + t + '"' + (desk.desk_type === t ? ' selected' : '') + '>' + deskTypeLabel(t) + '</option>';
        }).join('');
        var rOpts = _rooms.map(function(r) {
            return '<option value="' + r.id + '"' + (desk.room_id === r.id ? ' selected' : '') + '>' + esc(r.name) + '</option>';
        }).join('');

        oModal('Platz P' + nr + ' bearbeiten',
            '<div class="space-y-3">' +
                '<div class="grid grid-cols-2 gap-3">' +
                    '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Raum</label>' +
                    '<select id="oaDR" class="w-full border rounded-lg px-3 py-2 text-sm">' + rOpts + '</select></div>' +
                    '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Typ</label>' +
                    '<select id="oaDT" class="w-full border rounded-lg px-3 py-2 text-sm">' + tOpts + '</select></div>' +
                '</div>' +
                '<div class="flex flex-wrap gap-4">' +
                    '<label class="flex items-center gap-2 text-sm"><input type="checkbox" id="oaDM"' + (desk.has_monitor ? ' checked' : '') + ' class="accent-orange-500"> 🖥️ Monitor</label>' +
                    '<label class="flex items-center gap-2 text-sm"><input type="checkbox" id="oaDD"' + (desk.has_docking ? ' checked' : '') + ' class="accent-orange-500"> 🔌 Docking</label>' +
                    '<label class="flex items-center gap-2 text-sm"><input type="checkbox" id="oaDB"' + (desk.is_bookable !== false ? ' checked' : '') + ' class="accent-orange-500"> 📅 Buchbar</label>' +
                '</div>' +
                '<div><label class="block text-sm font-semibold text-gray-600 mb-1">Label</label>' +
                '<input id="oaDL" class="w-full border rounded-lg px-3 py-2 text-sm" value="' + esc(desk.label || '') + '"></div>' +
            '</div>',
            async function() {
                var selRoom = gv('oaDR');
                var rmObj = _rooms.find(function(r) { return r.id === selRoom; });
                try {
                    await sb.from('office_desks').update({
                        room_id: selRoom, room: rmObj ? rmObj.name : desk.room,
                        desk_type: gv('oaDT') || 'standard',
                        has_monitor: gc('oaDM'), has_docking: gc('oaDD'), is_bookable: gc('oaDB'),
                        label: gv('oaDL') || null
                    }).eq('nr', nr);
                    notify('✅ P' + nr + ' aktualisiert', 'success');
                    cModal(); await officeRenderAdminDots();
                } catch (err) { notify('Fehler: ' + err.message, 'error'); }
            }
        );
    };

    window.officeDeleteDesk = async function(nr) {
        if (!confirm('Platz P' + nr + ' wirklich löschen?')) return;
        try {
            await sb.from('office_desks').update({ active: false }).eq('nr', nr);
            notify('🗑️ P' + nr + ' deaktiviert', 'success');
            await officeRenderAdminDots();
        } catch (err) { notify('Fehler: ' + err.message, 'error'); }
    };

    // ═══════════════════════════════════════════════════════
    //  MODAL HELPER
    // ═══════════════════════════════════════════════════════
    function oModal(title, body, onSave) {
        var m = document.getElementById('officeAdminModal');
        if (m) m.remove();
        m = document.createElement('div');
        m.id = 'officeAdminModal';
        m.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
        m.innerHTML =
            '<div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">' +
                '<div class="flex items-center justify-between mb-4">' +
                    '<h3 class="text-lg font-bold text-gray-800">' + title + '</h3>' +
                    '<button onclick="cModal()" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>' +
                '</div>' +
                '<div>' + body + '</div>' +
                '<div class="flex gap-3 mt-5">' +
                    '<button id="oaModalSave" class="flex-1 px-4 py-2 text-white rounded-lg font-semibold hover:opacity-90" style="background:#EF7D00">Speichern</button>' +
                    '<button onclick="cModal()" class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-semibold hover:bg-gray-200">Abbrechen</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(m);
        document.getElementById('oaModalSave').addEventListener('click', onSave);
    }
    window.cModal = function() {
        var m = document.getElementById('officeAdminModal');
        if (m) m.remove();
    };

    // ── Hook into Settings Tab switcher ──
    var _origShowSettingsTab = window.showSettingsTab;
    window.showSettingsTab = function(tab) {
        if (typeof _origShowSettingsTab === 'function') _origShowSettingsTab(tab);
        if (tab === 'office' && typeof officeRenderAdminDots === 'function') {
            setTimeout(officeRenderAdminDots, 100);
        }
    };

    console.log('[OfficeAdmin] Module loaded ✓');
})();
