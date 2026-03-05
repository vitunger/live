/**
 * views/hq-plz.js - PLZ-Gebiete Verwaltung (HQ)
 *
 * Tab-System fuer hqStandorteView (Uebersicht / PLZ-Gebiete).
 * CRUD fuer standort_plz_gebiete Tabelle.
 *
 * @module views/hq-plz
 */
(function() {
    'use strict';

    var plzData = [];
    var standortList = [];

    // ── Tab Switching ──

    function showHqStandorteTab(tab) {
        document.querySelectorAll('.hqst-tab-content').forEach(function(el) {
            el.style.display = 'none';
        });
        document.querySelectorAll('.hqst-tab-btn').forEach(function(btn) {
            btn.className = 'hqst-tab-btn whitespace-nowrap py-3 px-1 border-b-2 border-transparent font-semibold text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer';
        });

        var tabEl = document.getElementById('hqStandorteTab_' + tab);
        if (tabEl) tabEl.style.display = 'block';

        var btnEl = document.querySelector('.hqst-tab-btn[data-hqst="' + tab + '"]');
        if (btnEl) btnEl.className = 'hqst-tab-btn whitespace-nowrap py-3 px-1 border-b-2 border-vit-orange font-semibold text-sm text-vit-orange cursor-pointer';

        if (tab === 'uebersicht' && typeof window.renderHqStandorte === 'function') {
            window.renderHqStandorte();
        }
        if (tab === 'plz') {
            renderHqPlzGebiete();
        }
    }

    // ── PLZ-Gebiete Renderer ──

    async function renderHqPlzGebiete() {
        var container = document.getElementById('hqPlzContent');
        if (!container) return;

        container.innerHTML = '<div class="text-center py-8 text-gray-400">Lade PLZ-Gebiete...</div>';

        var sb = window.sb;
        if (!sb) return;

        try {
            var [plzRes, stRes] = await Promise.all([
                sb.from('standort_plz_gebiete').select('*, standorte(name)').order('plz'),
                sb.from('standorte').select('id, name').eq('is_demo', false).order('name')
            ]);

            if (plzRes.error) throw plzRes.error;
            if (stRes.error) throw stRes.error;

            plzData = plzRes.data || [];
            standortList = stRes.data || [];
        } catch (err) {
            container.innerHTML = '<div class="text-center py-8 text-red-500">Fehler: ' + window.escH(err.message) + '</div>';
            return;
        }

        var zugeordnet = plzData.filter(function(r) { return r.standort_id; }).length;
        var nichtZugeordnet = plzData.length - zugeordnet;

        // Standort-Options fuer Dropdown
        var stOptions = '<option value="">– Alle Standorte –</option>';
        stOptions += '<option value="__none__">Nicht zugeordnet</option>';
        standortList.forEach(function(s) {
            stOptions += '<option value="' + s.id + '">' + window.escH(s.name) + '</option>';
        });

        var addStOptions = '<option value="">– Standort waehlen –</option>';
        standortList.forEach(function(s) {
            addStOptions += '<option value="' + s.id + '">' + window.escH(s.name) + '</option>';
        });

        container.innerHTML =
            // KPI Leiste
            '<div class="grid grid-cols-3 gap-4 mb-6">' +
                '<div class="bg-white rounded-xl p-4 border border-gray-200 text-center">' +
                    '<div class="text-2xl font-bold text-gray-800">' + plzData.length + '</div>' +
                    '<div class="text-xs text-gray-500">Gesamt PLZs</div>' +
                '</div>' +
                '<div class="bg-white rounded-xl p-4 border border-gray-200 text-center">' +
                    '<div class="text-2xl font-bold text-green-600">' + zugeordnet + '</div>' +
                    '<div class="text-xs text-gray-500">Zugeordnet</div>' +
                '</div>' +
                '<div class="bg-white rounded-xl p-4 border border-gray-200 text-center">' +
                    '<div class="text-2xl font-bold text-red-500">' + nichtZugeordnet + '</div>' +
                    '<div class="text-xs text-gray-500">Nicht zugeordnet</div>' +
                '</div>' +
            '</div>' +
            // Hinzufuegen-Formular
            '<div class="bg-white rounded-xl p-4 border border-gray-200 mb-6">' +
                '<h3 class="font-semibold text-sm text-gray-700 mb-3">PLZ hinzufuegen</h3>' +
                '<div class="flex items-center gap-3 flex-wrap">' +
                    '<input type="text" id="plzAddInput" placeholder="PLZ (5-stellig)" maxlength="5" pattern="\\d{5}" class="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32">' +
                    '<select id="plzAddStandort" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">' + addStOptions + '</select>' +
                    '<input type="text" id="plzAddFranchise" placeholder="Franchise-Name (optional)" class="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48">' +
                    '<button onclick="addPlzGebiet()" class="px-4 py-2 bg-vit-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600">Hinzufuegen</button>' +
                '</div>' +
            '</div>' +
            // Filter
            '<div class="flex items-center gap-3 mb-4 flex-wrap">' +
                '<input type="text" id="plzSearchInput" placeholder="PLZ oder Name suchen..." class="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64" oninput="filterPlzStandort()">' +
                '<select id="plzStandortFilter" class="px-3 py-2 border border-gray-300 rounded-lg text-sm" onchange="filterPlzStandort()">' + stOptions + '</select>' +
                '<span id="plzFilterCount" class="text-xs text-gray-400"></span>' +
            '</div>' +
            // Tabelle
            '<div class="bg-white rounded-xl border border-gray-200 overflow-hidden">' +
                '<table class="w-full text-sm">' +
                    '<thead class="bg-gray-50">' +
                        '<tr>' +
                            '<th class="px-4 py-3 text-left font-semibold text-gray-600">PLZ</th>' +
                            '<th class="px-4 py-3 text-left font-semibold text-gray-600">Franchise-Name</th>' +
                            '<th class="px-4 py-3 text-left font-semibold text-gray-600">Standort</th>' +
                            '<th class="px-4 py-3 text-right font-semibold text-gray-600">Aktion</th>' +
                        '</tr>' +
                    '</thead>' +
                    '<tbody id="plzTableBody"></tbody>' +
                '</table>' +
            '</div>';

        filterPlzStandort();
    }

    // ── Filter ──

    function filterPlzStandort() {
        var search = (document.getElementById('plzSearchInput')?.value || '').toLowerCase();
        var standortFilter = document.getElementById('plzStandortFilter')?.value || '';
        var tbody = document.getElementById('plzTableBody');
        if (!tbody) return;

        var filtered = plzData.filter(function(row) {
            // Standort-Filter
            if (standortFilter === '__none__' && row.standort_id) return false;
            if (standortFilter && standortFilter !== '__none__' && row.standort_id !== standortFilter) return false;
            // Suchtext
            if (search) {
                var plzMatch = row.plz.toLowerCase().indexOf(search) >= 0;
                var nameMatch = (row.franchise_name || '').toLowerCase().indexOf(search) >= 0;
                var stName = row.standorte?.name || '';
                var stMatch = stName.toLowerCase().indexOf(search) >= 0;
                if (!plzMatch && !nameMatch && !stMatch) return false;
            }
            return true;
        });

        var countEl = document.getElementById('plzFilterCount');
        if (countEl) {
            countEl.textContent = filtered.length + ' von ' + plzData.length + ' PLZs';
        }

        var html = '';
        filtered.forEach(function(row) {
            var stName = row.standorte?.name || '–';
            var stClass = row.standort_id ? 'text-gray-800' : 'text-red-400 italic';
            html +=
                '<tr class="border-t border-gray-100 hover:bg-gray-50">' +
                    '<td class="px-4 py-2 font-mono font-semibold">' + window.escH(row.plz) + '</td>' +
                    '<td class="px-4 py-2 text-gray-600">' + window.escH(row.franchise_name || '–') + '</td>' +
                    '<td class="px-4 py-2 ' + stClass + '">' + window.escH(stName) + '</td>' +
                    '<td class="px-4 py-2 text-right">' +
                        '<button onclick="deletePlzGebiet(\'' + row.id + '\')" class="text-red-400 hover:text-red-600 text-xs" title="Loeschen">' +
                            '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>' +
                        '</button>' +
                    '</td>' +
                '</tr>';
        });

        tbody.innerHTML = html || '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-400">Keine PLZs gefunden</td></tr>';
    }

    // ── CRUD ──

    async function addPlzGebiet() {
        var plzInput = document.getElementById('plzAddInput');
        var stSelect = document.getElementById('plzAddStandort');
        var fnInput = document.getElementById('plzAddFranchise');
        if (!plzInput || !stSelect) return;

        var plz = plzInput.value.trim();
        if (!/^\d{5}$/.test(plz)) {
            window.showToast('Bitte eine gueltige 5-stellige PLZ eingeben', 'error');
            return;
        }

        var standortId = stSelect.value || null;
        var franchiseName = fnInput?.value.trim() || null;

        var sb = window.sb;
        if (!sb) return;

        var insertData = { plz: plz, franchise_name: franchiseName };
        if (standortId) insertData.standort_id = standortId;

        var { error } = await sb.from('standort_plz_gebiete').insert(insertData);

        if (error) {
            if (error.code === '23505') {
                window.showToast('PLZ ' + plz + ' existiert bereits', 'error');
            } else {
                window.showToast('Fehler: ' + error.message, 'error');
            }
            return;
        }

        window.showToast('PLZ ' + plz + ' hinzugefuegt', 'success');
        plzInput.value = '';
        if (fnInput) fnInput.value = '';
        stSelect.value = '';
        renderHqPlzGebiete();
    }

    async function deletePlzGebiet(id) {
        if (!confirm('PLZ-Zuordnung wirklich loeschen?')) return;

        var sb = window.sb;
        if (!sb) return;

        var { error } = await sb.from('standort_plz_gebiete').delete().eq('id', id);

        if (error) {
            window.showToast('Fehler: ' + error.message, 'error');
            return;
        }

        window.showToast('PLZ-Zuordnung geloescht', 'success');
        renderHqPlzGebiete();
    }

    // ── Window Exports ──
    window.showHqStandorteTab = showHqStandorteTab;
    window.renderHqPlzGebiete = renderHqPlzGebiete;
    window.addPlzGebiet = addPlzGebiet;
    window.deletePlzGebiet = deletePlzGebiet;
    window.filterPlzStandort = filterPlzStandort;
})();
