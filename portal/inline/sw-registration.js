// vit:bikes Partner Portal — Service Worker Registration + Cache
// Extracted from index.html lines 11306-11587
// ============================================================
(function(){
    // ── Service Worker Registration ──
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/sw.js')
                .then(function(reg) {
                    console.log('[PWA] Service Worker registered, scope:', reg.scope);
                    // Check for updates periodically
                    setInterval(function(){ reg.update(); }, 60 * 60 * 1000); // hourly
                })
                .catch(function(err) {
                    console.log('[PWA] SW registration failed:', err);
                });
        });

        // Listen for push navigation messages from SW
        navigator.serviceWorker.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'PUSH_NAVIGATE') {
                var url = event.data.url || '/';
                var params = new URLSearchParams(url.split('?')[1] || '');
                var view = params.get('view');
                if (view && typeof showView === 'function') {
                    showView(view);
                }
            }
            if (event.data && event.data.type === 'PUSH_SUBSCRIPTION_CHANGED') {
                console.log('[Push] Subscription changed, re-subscribing...');
                if (typeof setupPushNotifications === 'function') setupPushNotifications();
            }
        });
    }

    // ── Install Prompt ──
    var deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        showInstallBanner();
    });

    // ── Push Notification Trigger Helper ──
    async function triggerPush(userIds, title, body, url, prefKey) {
        if (!userIds || userIds.length === 0) return;
        try {
            var sb = window._supabase;
            if (!sb) return;
            if (prefKey) {
                var { data: prefs } = await sb.from('notification_preferences').select('user_id, ' + prefKey).in('user_id', userIds);
                if (prefs) userIds = prefs.filter(function(p) { return p[prefKey] !== false; }).map(function(p) { return p.user_id; });
                if (userIds.length === 0) return;
            }
            var { data: session } = await sb.auth.getSession();
            var token = session?.session?.access_token;
            if (!token) return;
            await fetch('https://lwwagbkxeofahhwebkab.supabase.co/functions/v1/send-push', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_ids: userIds, title: title, body: body, url: url || '/', icon: '/icon-192.png' })
            });
        } catch(e) { console.log('[Push] trigger error:', e.message); }
    }

    async function triggerPushStandort(title, body, url, prefKey) {
        try {
            var sb = window._supabase;
            var me = (await sb.auth.getUser()).data.user?.id;
            var sid = sbProfile ? sbProfile.standort_id : null;
            if (!sid || !me) return;
            var { data: users } = await sb.from('users').select('id').eq('standort_id', sid);
            if (!users) return;
            var ids = users.map(function(u) { return u.id; }).filter(function(id) { return id !== me; });
            await triggerPush(ids, title, body, url, prefKey);
        } catch(e) { console.log('[Push] standort trigger:', e.message); }
    }

    async function triggerPushHQ(title, body, url, prefKey) {
        try {
            var sb = window._supabase;
            var me = (await sb.auth.getUser()).data.user?.id;
            var { data: hqUsers } = await sb.from('users').select('id').eq('is_hq', true);
            if (!hqUsers) return;
            var ids = hqUsers.map(function(u) { return u.id; }).filter(function(id) { return id !== me; });
            await triggerPush(ids, title, body, url, prefKey);
        } catch(e) { console.log('[Push] HQ trigger:', e.message); }
    }

    function showInstallBanner() {
        // Don't show if already installed or dismissed
        if (window.matchMedia('(display-mode: standalone)').matches) return;
        try { if (localStorage.getItem('vit-pwa-dismissed')) return; } catch(e){}

        var banner = document.createElement('div');
        banner.id = 'pwaInstallBanner';
        banner.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:10001;width:calc(100% - 32px);max-width:420px;';
        banner.innerHTML = '<div style="background:var(--c-bg);border-radius:14px;padding:16px;box-shadow:0 8px 32px rgba(0,0,0,0.25);border:1px solid var(--c-border);display:flex;align-items:center;gap:12px">' +
            '<div style="width:44px;height:44px;border-radius:10px;background:#EF7D00;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-size:20px;color:white;font-weight:900">v</span></div>' +
            '<div style="flex:1"><p style="font-size:13px;font-weight:700;color:var(--c-text);margin:0">vit:bikes als App installieren</p><p style="font-size:11px;color:var(--c-sub);margin:2px 0 0">Schnellzugriff auf Pipeline, Kalender & mehr</p></div>' +
            '<button onclick="installPWA()" style="background:#EF7D00;color:white;border:none;padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">Installieren</button>' +
            '<button onclick="dismissInstall()" style="background:none;border:none;color:var(--c-muted);font-size:16px;cursor:pointer;padding:4px">✕</button>' +
            '</div>';
        document.body.appendChild(banner);
    }

    window.installPWA = function() {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(result) {
            if (result.outcome === 'accepted') {
                console.log('[PWA] App installed');
            }
            deferredPrompt = null;
            var b = document.getElementById('pwaInstallBanner');
            if (b) b.remove();
        });
    };

    window.dismissInstall = function() {
        var b = document.getElementById('pwaInstallBanner');
        if (b) b.remove();
        try { localStorage.setItem('vit-pwa-dismissed', '1'); } catch(e){}
    };

    // ── Push Notifications Setup ──
    window.setupPushNotifications = async function() {
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            alert(t('alert_push_unsupported'));
            return;
        }
        
        var permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            alert(t('alert_push_denied'));
            return;
        }

        try {
            var reg = await navigator.serviceWorker.ready;
            var VAPID_PUBLIC_KEY = 'BFjv8qdfhEPXyWvz8Ite8laCH0XMaLtzTXvRBRq7XIa4FELmOz2RA3fUh7me1LIAh0JsKQVd-Pl8Dlxg_8mFc3c';
            
            // Convert VAPID key to Uint8Array
            var padding = '='.repeat((4 - VAPID_PUBLIC_KEY.length % 4) % 4);
            var base64 = (VAPID_PUBLIC_KEY + padding).replace(/-/g, '+').replace(/_/g, '/');
            var rawData = atob(base64);
            var outputArray = new Uint8Array(rawData.length);
            for (var i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);

            var subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: outputArray
            });

            var sub = subscription.toJSON();
            var sba = window._supabase || window.sb;
            var user = (await sba.auth.getUser()).data.user;
            if (!user) { alert('Nicht eingeloggt'); return; }

            var deviceName = navigator.userAgent.indexOf('Mobile') > -1 ? 'Mobilgerät' : 'Desktop';
            deviceName += ' – ' + (navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge)[\/\s](\d+)/)||[])[0] || 'Browser';

            var { error } = await sba.from('push_subscriptions').upsert({
                user_id: user.id,
                endpoint: sub.endpoint,
                p256dh: sub.keys.p256dh,
                auth_key: sub.keys.auth,
                device_name: deviceName
            }, { onConflict: 'endpoint' });

            if (error) throw error;

            console.log('[Push] Subscription saved successfully');
            updatePushUI(true, deviceName);
            showLocalNotification('🔔 Push aktiviert!', 'Du erhältst jetzt Benachrichtigungen für Nachrichten, Leads, Aufgaben & mehr.');
        } catch(err) {
            console.error('[Push] Setup error:', err);
            alert('Push-Aktivierung fehlgeschlagen: ' + err.message);
        }
    };

    window.showLocalNotification = function(title, body, url) {
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.ready.then(function(reg) {
            reg.showNotification(title, {
                body: body,
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-72.png',
                vibrate: [100, 50, 100],
                data: { url: url || '/' },
                tag: 'local-' + Date.now()
            });
        });
    };

    function updatePushUI(active, deviceName) {
        var activateArea = document.getElementById('pushActivateArea');
        var activeArea = document.getElementById('pushActiveArea');
        if (activateArea) activateArea.style.display = active ? 'none' : 'block';
        if (activeArea) activeArea.style.display = active ? 'block' : 'none';
    }

    window.checkPushStatus = async function() {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
            var reg = await navigator.serviceWorker.ready;
            var sub = await reg.pushManager.getSubscription();
            updatePushUI(!!sub, sub ? 'Aktives Gerät' : null);
            if (sub) loadNotificationPrefs();
        } catch(e) { console.log('[Push] Status check:', e.message); }
    }

    window.loadNotificationPrefs = async function() {
        try {
            var sba = window._supabase || window.sb;
            var userId = (await sba.auth.getUser()).data.user?.id;
            if (!userId) return;
            var { data } = await sba.from('notification_preferences').select('*').eq('user_id', userId).single();
            if (!data) return;
            document.querySelectorAll('.notif-toggle').forEach(function(cb) {
                var key = cb.dataset.pref;
                if (key && data[key] !== undefined) cb.checked = data[key];
            });
        } catch(e) { console.log('[Prefs] load:', e.message); }
    }

    window.saveNotificationPrefs = async function() {
        try {
            var sba = window._supabase || window.sb;
            var userId = (await sba.auth.getUser()).data.user?.id;
            if (!userId) { alert('Nicht eingeloggt'); return; }
            var prefs = { user_id: userId, updated_at: new Date().toISOString() };
            document.querySelectorAll('.notif-toggle').forEach(function(cb) {
                var key = cb.dataset.pref;
                if (key) prefs[key] = cb.checked;
            });
            var { error } = await sba.from('notification_preferences').upsert(prefs, { onConflict: 'user_id' });
            if (error) throw error;
            alert('✅ Push-Einstellungen gespeichert!');
        } catch(e) { alert('Fehler: ' + e.message); }
    }

    window.unsubscribePush = async function() {
        try {
            var reg = await navigator.serviceWorker.ready;
            var sub = await reg.pushManager.getSubscription();
            if (sub) {
                var endpoint = sub.endpoint;
                await sub.unsubscribe();
                var sba = window._supabase || window.sb;
                await sba.from('push_subscriptions').delete().eq('endpoint', endpoint);
                console.log('[Push] Unsubscribed');
            }
            updatePushUI(false);
        } catch(e) { console.error('[Push] Unsubscribe error:', e); }
    }

    // ── Camera Access for Content Upload ──
    window.openCamera = function(callback) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.capture = 'environment'; // rear camera
        input.onchange = function(e) {
            var file = e.target.files[0];
            if (file && callback) callback(file);
        };
        input.click();
    };

    // ── App-installed detection ──
    window.addEventListener('appinstalled', function() {
        console.log('[PWA] App was installed');
        var b = document.getElementById('pwaInstallBanner');
        if (b) b.remove();
    });

    // ── Detect standalone mode ──
    if (window.matchMedia('(display-mode: standalone)').matches) {
        document.body.classList.add('pwa-standalone');
        console.log('[PWA] Running as installed app');
    }
})();
