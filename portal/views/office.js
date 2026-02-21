// ============================================================
// vit:bikes Partner Portal — Office Module (HQ only)
// Standalone JS file loaded via <script src="office.js">
// Uses global: sb, sbUser, sbProfile, sbRollen, escH, t
// ============================================================

(function() {
    'use strict';

    // --- State ---
    var _officeWeekOffset = 0;
    var _officeRooms = null;
    var _officeEditMode = false;

    // --- Helpers ---
    function getISOWeek(d) {
        var date = new Date(d.getTime());
        date.setHours(0,0,0,0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        var week1 = new Date(date.getFullYear(), 0, 4);
        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    }

    function fmtDate(d) {
        return d.getDate() + '.' + (d.getMonth()+1) + '.';
    }

    function fmtDateISO(d) {
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }

    function getMondayOfWeek(offset) {
        var now = new Date();
        var day = now.getDay() || 7;
        var mon = new Date(now);
        mon.setDate(now.getDate() - day + 1 + (offset * 7));
        mon.setHours(0,0,0,0);
        return mon;
    }

    function esc(s) {
        return typeof escH === 'function' ? escH(s) : (s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // --- Tab Navigation ---
    window.showOfficeTab = function(tab) {
        var contents = document.querySelectorAll('.office-tab-content');
        for(var i=0; i<contents.length; i++) contents[i].style.display = 'none';

        var btns = document.querySelectorAll('.office-tab-btn');
        for(var i=0; i<btns.length; i++) {
            btns[i].className = 'office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition';
        }

        var el = document.getElementById('officeTab_' + tab);
        if(el) el.style.display = 'block';

        var btn = document.querySelector('.office-tab-btn[data-tab="' + tab + '"]');
        if(btn) btn.className = 'office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold bg-white text-gray-800 shadow-sm border-b-2 border-vit-orange transition';

        if(tab === 'dashboard') renderOfficeDashboard();
        else if(tab === 'wochenplan') renderOfficeWochenplan();
        else if(tab === 'gaeste') renderOfficeGaeste();
        else if(tab === 'grundriss') renderOfficeGrundriss();
        else if(tab === 'analyse') renderOfficeAnalyse();
    };

    // --- Init: Build the view HTML ---
    // Registered as _mountVitSpaceOffice because view-router.js expects this name
    window._mountVitSpaceOffice = function() {
        // Use officeReactRoot container (replaces the old React version)
        var container = document.getElementById('officeReactRoot') || document.getElementById('hqOfficeView');
        if(!container || container.dataset.officeInited) return;
        container.dataset.officeInited = '1';

        container.innerHTML = `
            <h1 class="text-xl font-bold text-gray-800 mb-4">
                <svg class="w-6 h-6 inline-block mr-2 -mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                Office
                <span class="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ml-2">BETA</span>
            </h1>

            <!-- Tab Navigation -->
            <div class="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6 overflow-x-auto">
                <button onclick="showOfficeTab('dashboard')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold bg-white text-gray-800 shadow-sm border-b-2 border-vit-orange transition" data-tab="dashboard">Dashboard</button>
                <button onclick="showOfficeTab('wochenplan')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition" data-tab="wochenplan">Wochenplanung</button>
                <button onclick="showOfficeTab('gaeste')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition" data-tab="gaeste">G&auml;ste</button>
                <button onclick="showOfficeTab('grundriss')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition" data-tab="grundriss">Grundriss</button>
                <button onclick="showOfficeTab('analyse')" class="office-tab-btn px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-700 transition" data-tab="analyse">Analyse</button>
            </div>

            <!-- Tab Contents -->
            <div id="officeTab_dashboard" class="office-tab-content"></div>
            <div id="officeTab_wochenplan" class="office-tab-content" style="display:none"></div>
            <div id="officeTab_gaeste" class="office-tab-content" style="display:none"></div>
            <div id="officeTab_grundriss" class="office-tab-content" style="display:none"></div>
            <div id="officeTab_analyse" class="office-tab-content" style="display:none"></div>
        `;

        renderOfficeDashboard();
    };

    // ============================================================
    // TAB 1: Dashboard
    // ============================================================
    async function renderOfficeDashboard() {
        var el = document.getElementById('officeTab_dashboard');
        if(!el) return;
        el.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';

        try {
            var today = fmtDateISO(new Date());

            // Parallel queries
            var [checkinsRes, bookingsRes, desksRes, guestsRes, usersRes] = await Promise.all([
                sb.from('office_checkins').select('*').eq('check_in_date', today).is('checked_out_at', null),
                sb.from('office_bookings').select('*').eq('booking_date', today),
                sb.from('office_desks').select('*').eq('is_active', true).not('desk_type', 'in', '("parkplatz","e-lade")'),
                sb.from('office_guests').select('*').eq('visit_date', today),
                sb.from('users').select('id, vorname, nachname').eq('is_hq', true).eq('status', 'aktiv')
            ]);

            var checkins = checkinsRes.data || [];
            var bookings = bookingsRes.data || [];
            var desks = desksRes.data || [];
            var guests = guestsRes.data || [];
            var users = usersRes.data || [];

            // Build user lookup
            var userMap = {};
            users.forEach(function(u) { userMap[u.id] = u; });

            // Determine who's in office (checkin or booking with status=office)
            var inOffice = {};
            checkins.forEach(function(c) {
                inOffice[c.user_id] = { desk: c.desk_id, via: 'checkin' };
            });
            bookings.forEach(function(b) {
                if(b.status === 'office' && !inOffice[b.user_id]) {
                    inOffice[b.user_id] = { desk: b.desk_id, via: 'booking' };
                }
            });

            var inOfficeCount = Object.keys(inOffice).length;
            var remoteUsers = users.filter(function(u) { return !inOffice[u.id]; });
            var totalDesks = desks.length;
            var occupancy = totalDesks > 0 ? Math.round((inOfficeCount / totalDesks) * 100) : 0;

            // KPIs
            var html = `
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div class="vit-card p-4 text-center">
                        <div class="text-2xl font-bold text-green-600">${inOfficeCount}</div>
                        <div class="text-xs text-gray-500">Im B&uuml;ro</div>
                    </div>
                    <div class="vit-card p-4 text-center">
                        <div class="text-2xl font-bold text-blue-600">${remoteUsers.length}</div>
                        <div class="text-xs text-gray-500">Remote</div>
                    </div>
                    <div class="vit-card p-4 text-center">
                        <div class="text-2xl font-bold text-gray-700">${totalDesks}</div>
                        <div class="text-xs text-gray-500">Pl&auml;tze gesamt</div>
                    </div>
                    <div class="vit-card p-4 text-center">
                        <div class="text-2xl font-bold ${occupancy > 80 ? 'text-red-600' : 'text-vit-orange'}">${occupancy}%</div>
                        <div class="text-xs text-gray-500">Auslastung</div>
                    </div>
                    <div class="vit-card p-4 text-center">
                        <div class="text-2xl font-bold text-purple-600">${guests.length}</div>
                        <div class="text-xs text-gray-500">G&auml;ste heute</div>
                    </div>
                </div>

                <div class="grid md:grid-cols-2 gap-6">
                    <!-- In Office -->
                    <div class="vit-card p-5">
                        <h3 class="font-bold text-gray-800 mb-3">Heute im B&uuml;ro</h3>
                        ${inOfficeCount === 0 ? '<p class="text-gray-400 text-sm">Noch niemand eingecheckt</p>' :
                        Object.keys(inOffice).map(function(uid) {
                            var u = userMap[uid];
                            var name = u ? esc(u.vorname + ' ' + u.nachname) : 'Unbekannt';
                            return '<div class="flex items-center space-x-2 py-1.5"><span class="w-2 h-2 rounded-full bg-green-500"></span><span class="text-sm">' + name + '</span></div>';
                        }).join('')}
                    </div>

                    <!-- Remote -->
                    <div class="vit-card p-5">
                        <h3 class="font-bold text-gray-800 mb-3">Remote / Nicht gebucht</h3>
                        ${remoteUsers.length === 0 ? '<p class="text-gray-400 text-sm">Alle im B&uuml;ro!</p>' :
                        remoteUsers.map(function(u) {
                            return '<div class="flex items-center space-x-2 py-1.5"><span class="w-2 h-2 rounded-full bg-blue-400"></span><span class="text-sm">' + esc(u.vorname + ' ' + u.nachname) + '</span></div>';
                        }).join('')}
                    </div>
                </div>
            `;
            el.innerHTML = html;

        } catch(err) {
            console.error('Office Dashboard error:', err);
            el.innerHTML = '<div class="vit-card p-6 text-center text-red-500">Fehler beim Laden: ' + esc(err.message) + '</div>';
        }
    }

    // ============================================================
    // TAB 2: Wochenplanung
    // ============================================================
    async function renderOfficeWochenplan() {
        var el = document.getElementById('officeTab_wochenplan');
        if(!el) return;
        el.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';

        try {
            var monday = getMondayOfWeek(_officeWeekOffset);
            var days = [];
            for(var i=0; i<5; i++) {
                var d = new Date(monday);
                d.setDate(monday.getDate() + i);
                days.push(d);
            }
            var friday = days[4];
            var kw = getISOWeek(monday);

            var monISO = fmtDateISO(monday);
            var friISO = fmtDateISO(friday);

            var [usersRes, bookingsRes] = await Promise.all([
                sb.from('users').select('id, vorname, nachname').eq('is_hq', true).eq('status', 'aktiv').order('nachname'),
                sb.from('office_bookings').select('*').gte('booking_date', monISO).lte('booking_date', friISO)
            ]);

            var users = usersRes.data || [];
            var bookings = bookingsRes.data || [];

            // Build booking map: { "userId_2026-02-17": {status, desk_id} }
            var bookingMap = {};
            bookings.forEach(function(b) {
                bookingMap[b.user_id + '_' + b.booking_date] = b;
            });

            var dayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

            var html = `
                <div class="flex items-center justify-between mb-4">
                    <button onclick="window._officeWeekNav(-1)" class="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold">&larr;</button>
                    <span class="font-bold text-gray-700">KW ${kw} &middot; ${fmtDate(monday)}&ndash;${fmtDate(friday)}</span>
                    <button onclick="window._officeWeekNav(1)" class="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold">&rarr;</button>
                </div>

                <div class="vit-card overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b">
                                <th class="text-left p-3 font-semibold text-gray-600 min-w-[140px]">Mitarbeiter</th>
                                ${days.map(function(d, i) {
                                    var isToday = fmtDateISO(d) === fmtDateISO(new Date());
                                    return '<th class="text-center p-3 font-semibold ' + (isToday ? 'text-vit-orange bg-orange-50' : 'text-gray-600') + '">' + dayLabels[i] + '<br><span class="text-xs font-normal">' + fmtDate(d) + '</span></th>';
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(function(u) {
                                return '<tr class="border-b hover:bg-gray-50">' +
                                    '<td class="p-3 font-medium">' + esc(u.vorname + ' ' + u.nachname) + '</td>' +
                                    days.map(function(d) {
                                        var key = u.id + '_' + fmtDateISO(d);
                                        var b = bookingMap[key];
                                        if(!b) return '<td class="text-center p-3"><span class="text-gray-300">&mdash;</span></td>';
                                        if(b.status === 'office') return '<td class="text-center p-3"><span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">B&uuml;ro</span></td>';
                                        if(b.status === 'remote') return '<td class="text-center p-3"><span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Remote</span></td>';
                                        if(b.status === 'absent') return '<td class="text-center p-3"><span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Abwesend</span></td>';
                                        return '<td class="text-center p-3"><span class="text-gray-400">' + esc(b.status) + '</span></td>';
                                    }).join('') +
                                '</tr>';
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            el.innerHTML = html;

        } catch(err) {
            console.error('Office Wochenplan error:', err);
            el.innerHTML = '<div class="vit-card p-6 text-center text-red-500">Fehler beim Laden: ' + esc(err.message) + '</div>';
        }
    }

    // Week navigation
    window._officeWeekNav = function(dir) {
        _officeWeekOffset += dir;
        renderOfficeWochenplan();
    };

    // ============================================================
    // TAB 3: Gaeste
    // ============================================================
    async function renderOfficeGaeste() {
        var el = document.getElementById('officeTab_gaeste');
        if(!el) return;
        el.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';

        try {
            var today = fmtDateISO(new Date());

            var [todayRes, futureRes] = await Promise.all([
                sb.from('office_guests').select('*').eq('visit_date', today).order('expected_arrival'),
                sb.from('office_guests').select('*').gt('visit_date', today).order('visit_date').limit(20)
            ]);

            var todayGuests = todayRes.data || [];
            var futureGuests = futureRes.data || [];

            function guestStatusBadge(g) {
                if(g.checked_out_at) return '<span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Ausgecheckt</span>';
                if(g.checked_in_at) return '<span class="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Eingecheckt</span>';
                return '<span class="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">Erwartet</span>';
            }

            function guestRow(g, showDate) {
                var parking = g.needs_parking ? ' <span title="Parkplatz">&#x1f17f;&#xfe0f;</span>' : '';
                var dateStr = showDate ? '<span class="text-xs text-gray-400 ml-2">' + g.visit_date + '</span>' : '';
                return `<div class="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <div>
                        <span class="font-medium text-sm">${esc(g.guest_name)}</span>${parking}${dateStr}
                        ${g.company ? '<br><span class="text-xs text-gray-400">' + esc(g.company) + '</span>' : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        ${g.expected_arrival ? '<span class="text-xs text-gray-400">' + g.expected_arrival.substring(0,5) + '</span>' : ''}
                        ${guestStatusBadge(g)}
                    </div>
                </div>`;
            }

            var html = `
                <div class="flex justify-end mb-4">
                    <button onclick="window._openOfficeGuestModal()" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">+ Gast einladen</button>
                </div>

                <div class="grid md:grid-cols-2 gap-6">
                    <div class="vit-card p-5">
                        <h3 class="font-bold text-gray-800 mb-3">Heutige G&auml;ste <span class="text-sm font-normal text-gray-400">(${todayGuests.length})</span></h3>
                        ${todayGuests.length === 0 ? '<p class="text-gray-400 text-sm">Keine G&auml;ste heute</p>' : todayGuests.map(function(g) { return guestRow(g, false); }).join('')}
                    </div>
                    <div class="vit-card p-5">
                        <h3 class="font-bold text-gray-800 mb-3">Kommende G&auml;ste</h3>
                        ${futureGuests.length === 0 ? '<p class="text-gray-400 text-sm">Keine kommenden G&auml;ste</p>' : futureGuests.map(function(g) { return guestRow(g, true); }).join('')}
                    </div>
                </div>
            `;
            el.innerHTML = html;

        } catch(err) {
            console.error('Office Gaeste error:', err);
            el.innerHTML = '<div class="vit-card p-6 text-center text-red-500">Fehler beim Laden: ' + esc(err.message) + '</div>';
        }
    }

    window._openOfficeGuestModal = function() {
        alert('Gast-Einladung: Kommt in der n\u00e4chsten Version!');
    };

    // ============================================================
    // TAB 4: Grundriss
    // ============================================================
    async function renderOfficeGrundriss() {
        var el = document.getElementById('officeTab_grundriss');
        if(!el) return;
        el.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';

        try {
            // Load rooms on first call
            if(!_officeRooms) {
                var roomsRes = await sb.from('office_rooms').select('*').eq('is_active', true).order('sortierung');
                _officeRooms = roomsRes.data || [];
            }

            if(_officeRooms.length === 0) {
                el.innerHTML = '<div class="vit-card p-8 text-center text-gray-400">Keine R&auml;ume konfiguriert</div>';
                return;
            }

            // Room selector
            var roomOptions = _officeRooms.map(function(r,i) {
                return '<option value="' + r.id + '"' + (i===0 ? ' selected' : '') + '>' + esc(r.name) + (r.floor ? ' ('+esc(r.floor)+')' : '') + '</option>';
            }).join('');

            el.innerHTML = `
                <div class="flex items-center justify-between mb-4">
                    <select id="officeRoomSelect" onchange="window._loadOfficeRoom()" class="border rounded-lg px-3 py-2 text-sm">${roomOptions}</select>
                    <button onclick="window._toggleOfficeEdit()" id="officeEditBtn" class="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm">&#9998; Bearbeiten</button>
                </div>
                <div id="officeFloorplanArea" class="vit-card p-4 min-h-[400px]"></div>
                <div id="officeEditPanel" style="display:none" class="vit-card p-4 mt-4">
                    <h4 class="font-bold text-sm mb-2">Grundriss bearbeiten</h4>
                    <p class="text-xs text-gray-500 mb-3">Grundriss-Bild hochladen und Tische per Klick platzieren (kommt bald)</p>
                    <input type="file" accept="image/*" class="text-sm" id="officeFloorplanUpload">
                </div>
            `;

            window._loadOfficeRoom();

        } catch(err) {
            console.error('Office Grundriss error:', err);
            el.innerHTML = '<div class="vit-card p-6 text-center text-red-500">Fehler: ' + esc(err.message) + '</div>';
        }
    }

    window._loadOfficeRoom = async function() {
        var area = document.getElementById('officeFloorplanArea');
        if(!area) return;
        area.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-vit-orange"></div></div>';

        var roomId = document.getElementById('officeRoomSelect').value;
        var room = _officeRooms.find(function(r) { return String(r.id) === String(roomId); });
        if(!room) { area.innerHTML = '<p class="text-gray-400">Raum nicht gefunden</p>'; return; }

        var today = fmtDateISO(new Date());

        var [desksRes, bookingsRes] = await Promise.all([
            sb.from('office_desks').select('*').eq('room_id', roomId).eq('is_active', true).order('desk_number'),
            sb.from('office_bookings').select('desk_id').eq('booking_date', today).eq('status', 'office')
        ]);

        var desks = desksRes.data || [];
        var bookedDeskIds = {};
        (bookingsRes.data || []).forEach(function(b) { bookedDeskIds[b.desk_id] = true; });

        var viewBox = room.svg_viewbox || '0 0 100 70';
        var imgOpacity = room.image_opacity || 0.3;
        var bgImage = room.grundriss_url ? '<image href="' + room.grundriss_url + '" x="0" y="0" width="100" height="70" opacity="' + imgOpacity + '"/>' : '';

        var desksSvg = desks.map(function(d) {
            var booked = bookedDeskIds[d.id];
            var cx = d.pct_x || 50;
            var cy = d.pct_y || 50;
            var color = booked ? '#ef4444' : '#22c55e';
            var title = 'Platz ' + d.desk_number + (booked ? ' (belegt)' : ' (frei)');
            return '<circle cx="' + cx + '" cy="' + cy + '" r="2" fill="' + color + '" stroke="white" stroke-width="0.3" style="cursor:pointer" onclick="window._showDeskInfo(\'' + d.id + '\')">' +
                '<title>' + title + '</title></circle>' +
                '<text x="' + cx + '" y="' + (cy + 3.5) + '" text-anchor="middle" font-size="1.8" fill="#666">' + d.desk_number + '</text>';
        }).join('');

        area.innerHTML = `
            <div class="flex items-center gap-4 mb-3 text-xs text-gray-500">
                <span><span class="inline-block w-3 h-3 rounded-full bg-green-500"></span> Frei</span>
                <span><span class="inline-block w-3 h-3 rounded-full bg-red-500"></span> Belegt</span>
                <span class="ml-auto">${desks.length} Pl&auml;tze</span>
            </div>
            <svg viewBox="${viewBox}" class="w-full border rounded-lg bg-gray-50" style="max-height:500px">
                ${bgImage}
                ${desksSvg}
            </svg>
        `;
    };

    window._toggleOfficeEdit = function() {
        _officeEditMode = !_officeEditMode;
        var btn = document.getElementById('officeEditBtn');
        var panel = document.getElementById('officeEditPanel');
        if(_officeEditMode) {
            if(btn) btn.innerHTML = '&#10004; Fertig';
            if(panel) panel.style.display = 'block';
        } else {
            if(btn) btn.innerHTML = '&#9998; Bearbeiten';
            if(panel) panel.style.display = 'none';
        }
    };

    window._showDeskInfo = function(deskId) {
        alert('Tisch-Details: Kommt in der n\u00e4chsten Version! (ID: ' + deskId + ')');
    };

    // ============================================================
    // TAB 5: Analyse
    // ============================================================
    async function renderOfficeAnalyse() {
        var el = document.getElementById('officeTab_analyse');
        if(!el) return;
        el.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';

        try {
            var now = new Date();
            var thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);
            var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            var [checkinsRes, desksRes, guestsRes] = await Promise.all([
                sb.from('office_checkins').select('check_in_date, status').gte('check_in_date', fmtDateISO(thirtyDaysAgo)),
                sb.from('office_desks').select('id').eq('is_active', true).not('desk_type', 'in', '("parkplatz","e-lade")'),
                sb.from('office_guests').select('id').gte('visit_date', fmtDateISO(monthStart))
            ]);

            var checkins = (checkinsRes.data || []).filter(function(c) { return c.status === 'office'; });
            var totalDesks = (desksRes.data || []).length;
            var guestCount = (guestsRes.data || []).length;

            // Count per weekday (1=Mo ... 5=Fr)
            var dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
            var dayCounts = [0,0,0,0,0];
            checkins.forEach(function(c) {
                var d = new Date(c.check_in_date);
                var wd = d.getDay(); // 0=Su, 1=Mo...
                if(wd >= 1 && wd <= 5) dayCounts[wd - 1]++;
            });

            var maxDay = Math.max.apply(null, dayCounts) || 1;
            var totalOfficeDays = dayCounts.reduce(function(a,b){return a+b;}, 0);
            var weeksInPeriod = 4.3;
            var avgPerWeek = (totalOfficeDays / weeksInPeriod).toFixed(1);
            var avgOccupancy = totalDesks > 0 ? Math.round((totalOfficeDays / (weeksInPeriod * 5 * totalDesks)) * 100) : 0;

            // Find top weekday
            var topDayIdx = dayCounts.indexOf(Math.max.apply(null, dayCounts));
            var topDay = dayNames[topDayIdx] || '-';

            // Bar chart
            var bars = dayNames.map(function(name, i) {
                var pct = Math.round((dayCounts[i] / maxDay) * 100);
                var avg = (dayCounts[i] / weeksInPeriod).toFixed(1);
                return `<div class="flex flex-col items-center flex-1">
                    <div class="text-xs font-semibold text-gray-600 mb-1">${avg}</div>
                    <div class="w-full bg-gray-100 rounded-t" style="height:120px;position:relative">
                        <div class="absolute bottom-0 left-1 right-1 rounded-t transition-all" style="height:${pct}%;background:linear-gradient(to top,#f97316,#fb923c);opacity:${0.6 + (pct/250)}"></div>
                    </div>
                    <div class="text-xs font-semibold text-gray-500 mt-1">${name}</div>
                </div>`;
            }).join('');

            var html = `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="vit-card p-4 text-center">
                        <div class="text-2xl font-bold text-vit-orange">${avgPerWeek}</div>
                        <div class="text-xs text-gray-500">&Oslash; B&uuml;ro-Tage/Woche</div>
                    </div>
                    <div class="vit-card p-4 text-center">
                        <div class="text-2xl font-bold text-gray-700">${topDay}</div>
                        <div class="text-xs text-gray-500">Beliebtester Tag</div>
                    </div>
                    <div class="vit-card p-4 text-center">
                        <div class="text-2xl font-bold text-blue-600">${avgOccupancy}%</div>
                        <div class="text-xs text-gray-500">&Oslash; Auslastung</div>
                    </div>
                    <div class="vit-card p-4 text-center">
                        <div class="text-2xl font-bold text-purple-600">${guestCount}</div>
                        <div class="text-xs text-gray-500">G&auml;ste diesen Monat</div>
                    </div>
                </div>

                <div class="vit-card p-5">
                    <h3 class="font-bold text-gray-800 mb-4">Anwesenheit nach Wochentag <span class="text-xs font-normal text-gray-400">(letzte 30 Tage)</span></h3>
                    <div class="flex gap-2" style="height:160px">
                        ${bars}
                    </div>
                </div>
            `;
            el.innerHTML = html;

        } catch(err) {
            console.error('Office Analyse error:', err);
            el.innerHTML = '<div class="vit-card p-6 text-center text-red-500">Fehler: ' + esc(err.message) + '</div>';
        }
    }

})();
