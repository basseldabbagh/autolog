const CACHE_NAME = "autolog-v1";
const ASSETS_TO_CACHE = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (e) => {
	e.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(ASSETS_TO_CACHE))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("activate", (e) => {
	e.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (e) => {
	if (e.request.method !== "GET") return;
	e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => cached)));
});
