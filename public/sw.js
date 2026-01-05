// Service Worker for PWA with Push Notifications - WhatsApp Style
const CACHE_NAME = 'blynk-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.png',
  '/logo-192.png',
  '/logo-512.png',
  '/sounds/notification.mp3',
  '/sounds/calling.mp3',
  '/sounds/connect.mp3',
  '/sounds/hangup.mp3',
  '/sounds/ringing.mp3'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Handle push notifications with WhatsApp-style features
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Blynk';
  
  const options = {
    body: data.body || 'Nova mensagem',
    icon: data.icon || data.avatar || '/logo-192.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || `notification-${Date.now()}`,
    image: data.image || null,
    data: {
      url: data.url || '/',
      avatar: data.avatar || null,
      senderId: data.senderId || null,
      messageId: data.messageId || null,
      ...data
    },
    requireInteraction: true,
    actions: [
      { action: 'reply', title: '💬 Responder', type: 'text', placeholder: 'Digite sua resposta...' },
      { action: 'mark-read', title: '✓ Lido' }
    ],
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks with quick actions
self.addEventListener('notificationclick', function(event) {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();

  if (action === 'reply') {
    // Handle inline reply (for browsers that support it)
    event.waitUntil(
      handleReplyAction(event, data)
    );
    return;
  }
  
  if (action === 'mark-read') {
    // Mark message as read
    event.waitUntil(
      sendMessageToClient({ type: 'MARK_READ', senderId: data.senderId, messageId: data.messageId })
    );
    return;
  }
  
  // Default: open the chat
  const urlToOpen = data.url || '/messages';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Focus existing window if open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          return client.focus().then(() => {
            client.postMessage({ type: 'NAVIGATE', url: urlToOpen });
            return client;
          });
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification reply action
async function handleReplyAction(event, data) {
  // For browsers supporting inline replies
  if (event.reply) {
    const reply = event.reply;
    await sendMessageToClient({
      type: 'NOTIFICATION_REPLY',
      senderId: data.senderId,
      reply: reply
    });
    return;
  }
  
  // Fallback: open chat
  const urlToOpen = data.url || '/messages';
  return clients.openWindow(urlToOpen);
}

// Send message to all clients
async function sendMessageToClient(message) {
  const allClients = await clients.matchAll({ includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage(message);
  }
}

// Handle background sync for offline messages
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // Sync pending messages when online
  const allClients = await clients.matchAll({ includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage({ type: 'SYNC_MESSAGES' });
  }
  return Promise.resolve();
}

// Fetch handler for offline support
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});
