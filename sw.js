// vit:bikes Portal Service Worker - Push Notifications
const CACHE_NAME = 'vitbikes-portal-v2.1.0';

// Push received
self.addEventListener('push', function(event) {
    let data = { title: 'vit:bikes Portal', body: 'Neue Benachrichtigung', icon: '/icon-192.png', url: '/' };
    try {
        if (event.data) data = Object.assign(data, event.data.json());
    } catch(e) {
        if (event.data) data.body = event.data.text();
    }
    
    const options = {
        body: data.body,
        icon: data.icon || '/icon-192.png',
        badge: data.badge || '/icon-badge.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'vitbikes-' + Date.now(),
        renotify: true,
        data: { url: data.url || '/', ...data.data },
        actions: [
            { action: 'open', title: 'Öffnen' },
            { action: 'dismiss', title: 'Schließen' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    if (event.action === 'dismiss') return;
    
    const url = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Focus existing window if available
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.postMessage({ type: 'PUSH_NAVIGATE', url: url });
                    return;
                }
            }
            // Open new window
            return clients.openWindow(url);
        })
    );
});

// Install
self.addEventListener('install', function(event) {
    self.skipWaiting();
});

// Activate
self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});
