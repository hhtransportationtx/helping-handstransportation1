const CACHE_NAME = 'healthhub-driver-v2';
const OFFLINE_CACHE = 'healthhub-offline-v1';
const urlsToCache = [
  '/',
  '/driver-login',
  '/driver-mobile',
  '/index.html',
  '/hh_logo_white.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)),
      caches.open(OFFLINE_CACHE).then((cache) => {
        return cache.add('/offline.html');
      })
    ])
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline - request queued for later' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((fetchResponse) => {
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return fetchResponse;
        }).catch(() => {
          return caches.match('/offline.html');
        });
      })
    );
  } else {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Network unavailable' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'New Trip Assignment';
  const options = {
    body: data.body || 'You have a new trip assignment',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: data.tag || 'trip-notification',
    data: data,
    actions: [
      { action: 'view', title: 'View Trip' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/driver-mobile')
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-trip-data') {
    event.waitUntil(syncTripData());
  }
});

async function syncTripData() {
  console.log('Syncing trip data in background...');
}
