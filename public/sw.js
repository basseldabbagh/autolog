const CACHE_NAME = 'motofolio-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './og-image.svg',
  './images/identity/favicon.png',
  './images/identity/favicon-light.png',
  './images/identity/appicon.png',
  './images/identity/appicon-light.png',
  './images/identity/logo.png',
  './images/identity/logo-light.png',
  './images/identity/icon.png',
  './images/identity/icon-light.png',
  './images/identity/spinner.png',
  './images/identity/spinner-light.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Network-first strategy with cache fallback for HTML/API, cache-first for immutable static identity images
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http://') && !e.request.url.startsWith('https://')) return;

  const url = new URL(e.request.url);
  const isImageOrFont = /\.(png|svg|jpg|jpeg|webp|woff2?|ttf|css)$/i.test(url.pathname);

  if (isImageOrFont) {
    // Cache-first for images & fonts
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone)).catch(() => {});
          }
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Network-first for HTML and documents
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
