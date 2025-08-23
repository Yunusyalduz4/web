const CACHE_NAME = 'kuafor-app-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/dashboard/business',
  '/dashboard/user',
  '/login',
  '/register'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push notification event listener
self.addEventListener('push', (event) => {
  let title = 'RANDEVUO';
  const options = {
    body: 'Yeni bir bildirim var!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: { dateOfArrival: Date.now() },
    actions: [
      { action: 'explore', title: 'Görüntüle', icon: '/icons/icon-96x96.png' },
      { action: 'close', title: 'Kapat', icon: '/icons/icon-96x96.png' }
    ]
  };

  try {
    if (event.data) {
      const raw = event.data.text();
      try {
        const payload = JSON.parse(raw);
        title = payload.title || title;
        options.body = payload.body || options.body;
        if (payload.icon) options.icon = payload.icon;
        if (payload.badge) options.badge = payload.badge;
        if (payload.data) options.data = { ...options.data, ...payload.data };
      } catch {
        options.body = raw;
      }
    }
  } catch (e) {
    // ignore
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification && event.notification.data && event.notification.data.type === 'new_appointment')
    ? '/dashboard/business/appointments'
    : '/dashboard/business';
  if (event.action === 'close') return;
  event.waitUntil(clients.openWindow(target));
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Background sync logic here
  console.log('Background sync triggered');
}
