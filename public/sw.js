// Service Worker for PWA with Push Notifications
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('blynk-v1').then(function(cache) {
      return cache.addAll([
        '/',
        '/favicon.png',
        '/logo-192.png',
        '/logo-512.png'
      ]);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Blynk';
  const options = {
    body: data.body || 'Nova notificação',
    icon: data.icon || data.avatar || '/logo-192.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'notification',
    image: data.image || null,
    data: {
      url: data.url || '/',
      avatar: data.avatar || null,
      ...data
    },
    requireInteraction: false,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle background sync
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

function syncMessages() {
  // Sync logic here
  return Promise.resolve();
}
