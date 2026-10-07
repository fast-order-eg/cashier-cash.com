const CACHE_NAME = 'casher-pos-v2';
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

    let url;
    try {
        url = new URL(event.request.url);
    } catch {
        return;
    }

    // 1. لا تتدخل نهائياً في أي روابط خارج نفس الدومين (cross-origin / subdomains)
    if (url.origin !== self.location.origin) {
        return;
    }

    // 2. تفعيل الكاش فقط لمسارات نقطة البيع POS وملفات البناء الثابتة
    if (!url.pathname.startsWith('/pos') && !url.pathname.startsWith('/build/')) {
        return;
    }

    // Do not cache API requests or webhooks
    if (url.pathname.includes('/api/') || url.pathname.includes('/webhook/')) {
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
