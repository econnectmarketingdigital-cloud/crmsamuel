const CACHE_NAME = 'samuel-crm-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo_icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/api/')) {
    return;
  }

  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Samuel Corrêa | CRM', body: event.data.text() };
    }
  }

  const title = data.title || '🔥 Novo Lead no CRM!';
  const options = {
    body: data.body || 'Você recebeu uma atualização no CRM. Toque para ver.',
    icon: data.icon || '/logo_icon.png',
    badge: data.badge || '/logo_icon.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'samuel-crm-lead',
    renotify: true,
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: 'Abrir no CRM' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
