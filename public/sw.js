const CACHE_NAME = 'casher-pos-v1';
const ASSETS_TO_CACHE = [
    '/pos',
    '/build/manifest.json',
];

// Install Service Worker & cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.log('SW cache addAll warning:', err);
            });
        })
    );
    self.skipWaiting();
});

// Activate & clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: Stale-While-Revalidate strategy for offline POS
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // Do not cache API requests or webhooks
    if (event.request.url.includes('/api/') || event.request.url.includes('/webhook/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return cachedResponse;
                });

            return cachedResponse || fetchPromise;
        })
    );
});
