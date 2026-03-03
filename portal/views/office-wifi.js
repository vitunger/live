/**
 * views/office-wifi.js — WiFi Presence: Device Registration + Status
 * v1 — 2026-03-04
 * Depends on: _offState, sb, sbUser, sbProfile, showToast
 * @module views/office-wifi
 */
(function() {
    'use strict';

    function _sb() { return window.sb; }
    function _off() { return window._offState; }

    // ── Format MAC as user types ──
    function formatMacInput(val) {
        var clean = val.replace(/[^a-fA-F0-9]/g, '').substring(0, 12);
        var parts = [];
        for (var i = 0; i < clean.length; i += 2) {
            parts.push(clean.substring(i, i + 2));
        }
        return parts.join(':').toLowerCase();
    }

    // ── Render WiFi Tab ──
    window._offRenderWifi = async function() {
        var el = document.getElementById('officeTab_wifi');
        if (!el) return;
        el.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-vit-orange"></div></div>';

        try {
            var devicesResp = await _sb().from('wifi_devices').select('*').eq('user_id', sbUser.id).order('created_at', { ascending: false });
            var devices = devicesResp.data || [];

            // Get recent wifi events for my devices
            var myMacs = devices.filter(function(d) { return d.active; }).map(function(d) { return d.mac_address; });
            var recentEvents = [];
            if (myMacs.length > 0) {
                var evResp = await _sb().from('wifi_events').select('mac_address,event_type,ap_name,ssid,created_at')
                    .in('mac_address', myMacs).order('created_at', { ascending: false }).limit(10);
                recentEvents = evResp.data || [];
            }

            var html = '';

            // ── Header Card ──
            html += '<div class="vit-card p-6 mb-6 border-l-4 border-blue-500">' +
                '<div class="flex items-center justify-between flex-wrap gap-4">' +
                    '<div>' +
                        '<h2 class="text-lg font-bold text-gray-800">📶 WLAN Auto-Präsenz</h2>' +
                        '<p class="text-sm text-gray-500 mt-1">Registriere deine Geräte und werde automatisch ein- und ausgecheckt, wenn du das Büro-WLAN betrittst oder verlässt.</p>' +
                    '</div>' +
                    '<button onclick="window._offShowAddDeviceModal()" class="px-4 py-2.5 bg-vit-orange text-white rounded-xl font-semibold text-sm hover:opacity-90 shadow transition flex items-center gap-2">' +
                        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>' +
                        'Gerät hinzufügen' +
                    '</button>' +
                '</div>' +
            '</div>';

            // ── How it works ──
            if (devices.length === 0) {
                html += '<div class="vit-card p-6 mb-6">' +
                    '<h3 class="font-bold text-gray-800 mb-3">ℹ️ So funktioniert es</h3>' +
                    '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">' +
                        '<div class="text-center p-4 bg-blue-50 rounded-xl">' +
                            '<div class="text-3xl mb-2">📱</div>' +
                            '<p class="text-sm font-semibold text-gray-700">1. Gerät registrieren</p>' +
                            '<p class="text-xs text-gray-500 mt-1">Trage die MAC-Adresse deines Handys oder Laptops ein</p>' +
                        '</div>' +
                        '<div class="text-center p-4 bg-green-50 rounded-xl">' +
                            '<div class="text-3xl mb-2">📶</div>' +
                            '<p class="text-sm font-semibold text-gray-700">2. WLAN verbinden</p>' +
                            '<p class="text-xs text-gray-500 mt-1">Verbinde dich ganz normal mit dem Büro-WLAN</p>' +
                        '</div>' +
                        '<div class="text-center p-4 bg-orange-50 rounded-xl">' +
                            '<div class="text-3xl mb-2">✅</div>' +
                            '<p class="text-sm font-semibold text-gray-700">3. Automatisch eingecheckt</p>' +
                            '<p class="text-xs text-gray-500 mt-1">Der Router meldet deine Anwesenheit – kein manuelles Einchecken nötig</p>' +
                        '</div>' +
                    '</div>' +
                    '<div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">' +
                        '<p class="text-xs text-yellow-800">💡 <strong>MAC-Adresse finden:</strong> ' +
                            'iPhone: Einstellungen → Allgemein → Info → WLAN-Adresse. ' +
                            'Android: Einstellungen → Über das Telefon → Status → WLAN-MAC-Adresse. ' +
                            'Laptop: Systemeinstellungen → Netzwerk → Details → MAC-Adresse.</p>' +
                    '</div>' +
                '</div>';
            }

            // ── Registered Devices ──
            if (devices.length > 0) {
                html += '<div class="vit-card overflow-hidden mb-6">' +
                    '<div class="p-4 border-b bg-gray-50 flex items-center justify-between">' +
                        '<h3 class="font-bold text-gray-800">📱 Meine Geräte (' + devices.length + ')</h3>' +
                    '</div>' +
                    '<div class="divide-y divide-gray-100">';

                devices.forEach(function(d) {
                    var statusColor = d.active ? (d.auto_checkin ? 'green' : 'yellow') : 'gray';
                    var statusText = d.active ? (d.auto_checkin ? 'Aktiv' : 'Pausiert') : 'Deaktiviert';
                    var statusIcon = d.active ? (d.auto_checkin ? '🟢' : '🟡') : '⚫';

                    // Check if device has recent connect event
                    var lastEvt = recentEvents.find(function(e) { return e.mac_address === d.mac_address; });
                    var connInfo = '';
                    if (lastEvt) {
                        var evtTime = new Date(lastEvt.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                        var evtType = lastEvt.event_type === 'connect' ? '🟢 Verbunden' : (lastEvt.event_type === 'disconnect' ? '🔴 Getrennt' : '🔄 Roaming');
                        connInfo = '<span class="text-xs text-gray-400 ml-2">' + evtType + ' um ' + evtTime + (lastEvt.ap_name ? ' (' + _off().esc(lastEvt.ap_name) + ')' : '') + '</span>';
                    }

                    html += '<div class="p-4 flex items-center justify-between hover:bg-gray-50 transition">' +
                        '<div class="flex items-center gap-3">' +
                            '<div class="w-10 h-10 rounded-full bg-' + statusColor + '-100 flex items-center justify-center text-lg">' + statusIcon + '</div>' +
                            '<div>' +
                                '<p class="text-sm font-semibold text-gray-800">' + _off().esc(d.device_name || 'Unbenannt') + '</p>' +
                                '<p class="text-xs text-gray-400 font-mono">' + _off().esc(d.mac_address) + connInfo + '</p>' +
                            '</div>' +
                        '</div>' +
                        '<div class="flex items-center gap-2">' +
                            '<span class="text-xs px-2 py-1 rounded-full bg-' + statusColor + '-100 text-' + statusColor + '-700 font-semibold">' + statusText + '</span>' +
                            '<button onclick="window._offToggleDevice(\'' + d.id + '\',' + !d.auto_checkin + ')" class="p-2 rounded-lg hover:bg-gray-100 transition" title="' + (d.auto_checkin ? 'Pausieren' : 'Aktivieren') + '">' +
                                (d.auto_checkin ? '⏸️' : '▶️') +
                            '</button>' +
                            '<button onclick="window._offDeleteDevice(\'' + d.id + '\',\'' + _off().esc(d.device_name || d.mac_address) + '\')" class="p-2 rounded-lg hover:bg-red-50 transition text-red-400 hover:text-red-600" title="Löschen">🗑️</button>' +
                        '</div>' +
                    '</div>';
                });

                html += '</div></div>';
            }

            // ── Recent Events ──
            if (recentEvents.length > 0) {
                html += '<div class="vit-card overflow-hidden">' +
                    '<div class="p-4 border-b bg-gray-50">' +
                        '<h3 class="font-bold text-gray-800">📋 Letzte Events</h3>' +
                    '</div>' +
                    '<div class="divide-y divide-gray-100">';

                recentEvents.forEach(function(e) {
                    var icon = e.event_type === 'connect' ? '🟢' : (e.event_type === 'disconnect' ? '🔴' : '🔄');
                    var label = e.event_type === 'connect' ? 'Verbunden' : (e.event_type === 'disconnect' ? 'Getrennt' : 'Roaming');
                    var time = new Date(e.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                    var device = devices.find(function(d) { return d.mac_address === e.mac_address; });

                    html += '<div class="px-4 py-3 flex items-center justify-between">' +
                        '<div class="flex items-center gap-3">' +
                            '<span class="text-lg">' + icon + '</span>' +
                            '<div>' +
                                '<p class="text-sm font-medium text-gray-700">' + label + (e.ap_name ? ' · ' + _off().esc(e.ap_name) : '') + '</p>' +
                                '<p class="text-xs text-gray-400">' + (device ? _off().esc(device.device_name || '') + ' · ' : '') + _off().esc(e.mac_address) + '</p>' +
                            '</div>' +
                        '</div>' +
                        '<span class="text-xs text-gray-400">' + time + '</span>' +
                    '</div>';
                });

                html += '</div></div>';
            }

            el.innerHTML = html;

        } catch (err) {
            console.error('[Office-WiFi] Render error:', err);
            el.innerHTML = '<div class="vit-card p-6 text-center text-red-500">Fehler beim Laden: ' + (err.message || err) + '</div>';
        }
    };

    // ── Add Device Modal ──
    window._offShowAddDeviceModal = function() {
        var old = document.getElementById('offWifiModal');
        if (old) old.remove();

        var modal = document.createElement('div');
        modal.id = 'offWifiModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
        modal.innerHTML =
            '<div style="background:white;border-radius:16px;padding:24px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3)">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
                    '<h3 style="font-size:16px;font-weight:700;color:#374151">📱 Gerät registrieren</h3>' +
                    '<button onclick="document.getElementById(\'offWifiModal\').remove()" style="width:28px;height:28px;border:none;background:#F3F4F6;border-radius:50%;cursor:pointer;font-size:16px;color:#6B7280">&#215;</button>' +
                '</div>' +
                '<div style="margin-bottom:16px">' +
                    '<label style="display:block;font-size:12px;font-weight:600;color:#6B7280;margin-bottom:4px">Gerätename</label>' +
                    '<input id="wifiDeviceName" type="text" placeholder="z.B. Mein iPhone, Büro-Laptop" ' +
                        'style="width:100%;padding:10px 14px;border:1px solid #D1D5DB;border-radius:10px;font-size:14px;outline:none" />' +
                '</div>' +
                '<div style="margin-bottom:16px">' +
                    '<label style="display:block;font-size:12px;font-weight:600;color:#6B7280;margin-bottom:4px">MAC-Adresse</label>' +
                    '<input id="wifiDeviceMac" type="text" placeholder="aa:bb:cc:dd:ee:ff" maxlength="17" ' +
                        'style="width:100%;padding:10px 14px;border:1px solid #D1D5DB;border-radius:10px;font-size:14px;font-family:monospace;outline:none" ' +
                        'oninput="this.value=window._offFormatMac(this.value)" />' +
                '</div>' +
                '<div style="padding:10px 14px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;margin-bottom:16px">' +
                    '<p style="font-size:11px;color:#92400E"><strong>💡 MAC-Adresse finden:</strong></p>' +
                    '<p style="font-size:11px;color:#92400E;margin-top:4px"><strong>iPhone:</strong> Einstellungen → Allgemein → Info → WLAN-Adresse</p>' +
                    '<p style="font-size:11px;color:#92400E;margin-top:2px"><strong>Android:</strong> Einstellungen → Über das Telefon → Status</p>' +
                    '<p style="font-size:11px;color:#92400E;margin-top:2px"><strong>Mac/PC:</strong> Systemeinstellungen → Netzwerk → Details</p>' +
                    '<p style="font-size:11px;color:#C2410C;margin-top:6px">⚠️ <strong>Wichtig:</strong> Deaktiviere "Private WLAN-Adresse" / "MAC-Randomisierung" in deinen WLAN-Einstellungen für das Büro-Netzwerk, damit dein Gerät immer dieselbe MAC-Adresse sendet.</p>' +
                '</div>' +
                '<div style="display:flex;gap:8px;justify-content:flex-end">' +
                    '<button onclick="document.getElementById(\'offWifiModal\').remove()" style="padding:10px 20px;border:1px solid #D1D5DB;background:white;border-radius:10px;font-size:13px;cursor:pointer;color:#6B7280">Abbrechen</button>' +
                    '<button onclick="window._offSaveDevice()" style="padding:10px 20px;border:none;background:#EF7D00;color:white;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer">Speichern</button>' +
                '</div>' +
            '</div>';
        modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
        document.getElementById('wifiDeviceName').focus();
    };

    window._offFormatMac = function(val) {
        return formatMacInput(val);
    };

    // ── Save Device ──
    window._offSaveDevice = async function() {
        var name = (document.getElementById('wifiDeviceName') || {}).value || '';
        var mac = (document.getElementById('wifiDeviceMac') || {}).value || '';

        if (!name.trim()) { _off().notify('Bitte Gerätename eingeben', 'error'); return; }
        var cleanMac = mac.replace(/[^a-fA-F0-9:]/g, '').toLowerCase();
        if (cleanMac.replace(/:/g, '').length !== 12) { _off().notify('Ungültige MAC-Adresse (12 Hex-Zeichen erwartet)', 'error'); return; }

        var normalizedMac = formatMacInput(cleanMac);

        try {
            var resp = await _sb().from('wifi_devices').insert({
                user_id: sbUser.id,
                mac_address: normalizedMac,
                device_name: name.trim(),
                active: true,
                auto_checkin: true
            }).select().single();

            if (resp.error) {
                if (resp.error.code === '23505') {
                    _off().notify('Diese MAC-Adresse ist bereits registriert', 'error');
                } else {
                    throw resp.error;
                }
                return;
            }

            _off().notify('✅ Gerät "' + name.trim() + '" registriert!', 'success');
            var modal = document.getElementById('offWifiModal');
            if (modal) modal.remove();
            window._offRenderWifi();
        } catch (err) {
            console.error('[Office-WiFi] Save device error:', err);
            _off().notify('Fehler: ' + err.message, 'error');
        }
    };

    // ── Toggle auto_checkin ──
    window._offToggleDevice = async function(deviceId, newState) {
        try {
            var resp = await _sb().from('wifi_devices').update({ auto_checkin: newState }).eq('id', deviceId).eq('user_id', sbUser.id);
            if (resp.error) throw resp.error;
            _off().notify(newState ? '▶️ Auto-Checkin aktiviert' : '⏸️ Auto-Checkin pausiert', 'success');
            window._offRenderWifi();
        } catch (err) {
            _off().notify('Fehler: ' + err.message, 'error');
        }
    };

    // ── Delete Device ──
    window._offDeleteDevice = async function(deviceId, deviceName) {
        if (!confirm('Gerät "' + deviceName + '" wirklich löschen?')) return;
        try {
            var resp = await _sb().from('wifi_devices').delete().eq('id', deviceId).eq('user_id', sbUser.id);
            if (resp.error) throw resp.error;
            _off().notify('🗑️ Gerät gelöscht', 'success');
            window._offRenderWifi();
        } catch (err) {
            _off().notify('Fehler: ' + err.message, 'error');
        }
    };

})();
