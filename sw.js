const CACHE_NAME = 'motofolio-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './og-image.svg'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Network-first strategy: always fetch latest version; fallback to offline cache if offline
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Ignore non-http(s) schemes (e.g. chrome-extension://)
  if (!e.request.url.startsWith('http://') && !e.request.url.startsWith('https://')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
