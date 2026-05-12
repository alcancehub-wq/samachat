const STATIC_CACHE_NAME = "samachat-static-v1";
const PRECACHE_URLS = [
	"/manifest.json",
	"/favicon.ico",
	"/favicon-16x16.png",
	"/favicon-32x32.png",
	"/apple-touch-icon.png",
	"/android-chrome-192x192.png",
	"/android-chrome-512x512.png",
];

const STATIC_DESTINATIONS = new Set(["style", "script", "image", "font", "manifest"]);

const isSafeStaticAssetRequest = request => {
	if (request.method !== "GET") {
		return false;
	}

	const url = new URL(request.url);

	if (url.origin !== self.location.origin) {
		return false;
	}

	if (request.mode === "navigate") {
		return false;
	}

	if (url.pathname === "/manifest.json") {
		return true;
	}

	return STATIC_DESTINATIONS.has(request.destination);
};

self.addEventListener("install", event => {
	event.waitUntil(
		caches
			.open(STATIC_CACHE_NAME)
			.then(cache => cache.addAll(PRECACHE_URLS))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener("activate", event => {
	event.waitUntil(
		caches
			.keys()
			.then(cacheNames =>
				Promise.all(
					cacheNames
						.filter(cacheName => cacheName !== STATIC_CACHE_NAME)
						.map(cacheName => caches.delete(cacheName))
				)
			)
			.then(() => self.clients.claim())
	);
});

self.addEventListener("fetch", event => {
	if (!isSafeStaticAssetRequest(event.request)) {
		return;
	}

	event.respondWith(
		caches.match(event.request).then(cachedResponse => {
			if (cachedResponse) {
				return cachedResponse;
			}

			return fetch(event.request).then(networkResponse => {
				if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
					return networkResponse;
				}

				const responseClone = networkResponse.clone();

				caches.open(STATIC_CACHE_NAME).then(cache => {
					cache.put(event.request, responseClone);
				});

				return networkResponse;
			});
		})
	);
});