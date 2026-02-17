// vit:bikes Portal Service Worker v3.0.0
const SW_VERSION = '3.0.0';
const CACHE_NAME = 'vitbikes-portal-v3';

// ── Push Event ──
self.addEventListener('push', function(event) {
    console.log('[SW] Push received', event);
    
    let data = {
        title: 'vit:bikes Portal',
        body: 'Neue Benachrichtigung',
        icon: '/icons/icon-192.png',
        url: '/'
    };
    
    try {
        if (event.data) {
            const json = event.data.json();
            data = Object.assign(data, json);
            console.log('[SW] Push data:', json);
        }
    } catch(e) {
        console.log('[SW] Push data as text');
        if (event.data) data.body = event.data.text();
    }
    
    const options = {
        body: data.body,
        icon: data.icon || '/icons/icon-192.png',
        badge: '/icons/icon-96.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'vitbikes-' + Date.now(),
        renotify: true,
        requireInteraction: false,
        data: { url: data.url || '/' },
        actions: [
            { action: 'open', title: '📂 Öffnen' },
            { action: 'dismiss', title: '✕ Schließen' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// ── Notification Click ──
self.addEventListener('notificationclick', function(event) {
    console.log('[SW] Notification clicked', event.action);
    event.notification.close();
    
    if (event.action === 'dismiss') return;
    
    const url = event.notification.data?.url || '/';
    const fullUrl = new URL(url, self.location.origin).href;
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    if (url !== '/') {
                        client.postMessage({ type: 'PUSH_NAVIGATE', url: url });
                    }
                    return;
                }
            }
            return clients.openWindow(fullUrl);
        })
    );
});

// ── Install ──
self.addEventListener('install', function(event) {
    console.log('[SW] Installing v' + SW_VERSION);
    // Skip waiting to activate immediately
    self.skipWaiting();
});

// ── Activate ──
self.addEventListener('activate', function(event) {
    console.log('[SW] Activating v' + SW_VERSION);
    event.waitUntil(
        Promise.all([
            // Claim all clients immediately
            self.clients.claim(),
            // Clean old caches
            caches.keys().then(function(names) {
                return Promise.all(
                    names.filter(function(name) { return name !== CACHE_NAME; })
                         .map(function(name) { return caches.delete(name); })
                );
            })
        ])
    );
});

// ── Push subscription change ──
self.addEventListener('pushsubscriptionchange', function(event) {
    console.log('[SW] Subscription changed');
    // Notify the app to re-subscribe
    event.waitUntil(
        self.clients.matchAll().then(function(clients) {
            clients.forEach(function(client) {
                client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
            });
        })
    );
});
