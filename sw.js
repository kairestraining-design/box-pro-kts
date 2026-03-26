const CACHE_NAME = 'box-pro-kts-v4';
const urlsToCache = ['/', '/index.html', '/timer-wod.js', '/gestion-clases.js', '/calendario-atleta.js', '/calendario-semanal.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
