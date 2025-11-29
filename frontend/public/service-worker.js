// Service Worker for PWA
// Provides offline support and caching

const CACHE_NAME = 'jaktopplevelsen-v1';
const RUNTIME_CACHE = 'jaktopplevelsen-runtime';

// Assets to cache on install
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/logo.png'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then(response => {
                // Don't cache if not a success response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Clone the response
                const responseToCache = response.clone();

                // Cache runtime assets
                caches.open(RUNTIME_CACHE).then(cache => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            });
        })
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-hunts') {
        event.waitUntil(syncHunts());
    }
});

async function syncHunts() {
    // Sync offline hunts when back online
    console.log('Syncing offline hunts...');
    // Implementation would go here
}
