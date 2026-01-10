/* =============================================
   NEON PONG - Service Worker
   Offline Support & Caching
   ============================================= */

// Dynamic cache name with timestamp to force cache updates on deployment
// Update this timestamp when deploying new versions
const CACHE_VERSION = '2026-01-09-01';
const CACHE_NAME = `neon-pong-${CACHE_VERSION}`;
// Use relative URLs to support GitHub Pages subpath hosting
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/main.css',
    './css/animations.css',
    './css/responsive.css',
    './js/utils.js',
    './js/audio.js',
    './js/renderer.js',
    './js/controls.js',
    './js/ai.js',
    './js/powerups.js',
    './js/leaderboard.js',
    './js/multiplayer.js',
    './js/game.js',
    './assets/images/icons/icon-192x192.svg'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('[SW] Install complete');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Install failed:', error);
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch event - network-first for HTML, cache-first for assets
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip external requests (like Google Fonts)
    if (!event.request.url.startsWith(self.location.origin)) {
        // For external resources, try network first
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // If offline, return nothing for external resources
                    return new Response('', { status: 499, statusText: 'Offline' });
                })
        );
        return;
    }

    // Network-first strategy for HTML files to ensure fresh content
    const acceptHeader = event.request.headers.get('accept');
    const isHTMLRequest = acceptHeader && acceptHeader.includes('text/html');
    
    // Parse URL to handle query parameters and fragments correctly
    const url = new URL(event.request.url);
    const isRootRequest = url.pathname === '/' || url.pathname.endsWith('/index.html');

    if (isHTMLRequest || isRootRequest) {
        // Network-first for HTML
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // Cache the fresh response
                    if (networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            })
                            .catch((err) => {
                                console.warn('[SW] Failed to cache HTML response:', err);
                            });
                    }
                    console.log('[SW] Serving fresh HTML from network:', event.request.url);
                    return networkResponse;
                })
                .catch(() => {
                    // If network fails, fall back to cache
                    console.log('[SW] Network failed, serving HTML from cache:', event.request.url);
                    return caches.match(event.request)
                        .then((cachedResponse) => {
                            return cachedResponse || caches.match('./index.html');
                        });
                })
        );
        return;
    }

    // Always fetch Vercel analytics script from network to ensure updates
    // Do not cache this script as it can be updated by Vercel
    // Note: When deployed on Vercel, /_vercel/insights/script.js is served from same origin
    if (event.request.url.endsWith('/_vercel/insights/script.js')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                // If offline, return empty script that won't break the page
                return new Response('', { 
                    status: 200,
                    statusText: 'OK',
                    headers: { 'Content-Type': 'application/javascript' }
                });
            })
        );
        return;
    }

    // Cache-first strategy for static assets (CSS, JS, images)
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached version and update in background
                    console.log('[SW] Serving from cache:', event.request.url);
                    
                    // Update cache in background (stale-while-revalidate)
                    fetch(event.request)
                        .then((networkResponse) => {
                            if (networkResponse.status === 200) {
                                caches.open(CACHE_NAME)
                                    .then((cache) => {
                                        cache.put(event.request, networkResponse);
                                    })
                                    .catch((err) => {
                                        console.warn('[SW] Failed to update cache:', err);
                                    });
                            }
                        })
                        .catch(() => {
                            // Ignore network errors for cached resources
                        });
                    
                    return cachedResponse;
                }

                // Not in cache, fetch from network
                console.log('[SW] Fetching:', event.request.url);
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Cache the new response
                        if (networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                })
                                .catch((err) => {
                                    console.warn('[SW] Failed to cache response:', err);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Network failed, return offline page
                        console.log('[SW] Network failed for:', event.request.url);
                        
                        // For HTML requests, return index.html
                        if (acceptHeader && acceptHeader.includes('text/html')) {
                            return caches.match('./index.html');
                        }
                        
                        // For other requests, return empty response
                        return new Response('', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[SW] Cache cleared');
        });
    }
});

// Background sync for leaderboard (if supported)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-leaderboard') {
        console.log('[SW] Syncing leaderboard...');
        event.waitUntil(syncLeaderboard());
    }
});

async function syncLeaderboard() {
    // This would sync local scores to server when online
    // Implementation depends on backend
    try {
        await caches.open(CACHE_NAME);
        // Sync logic here
        console.log('[SW] Leaderboard sync complete');
    } catch (error) {
        console.error('[SW] Leaderboard sync failed:', error);
    }
}

// Push notifications (for multiplayer invites)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    
    const options = {
        body: data.body || 'You have a new notification',
        icon: './assets/images/icons/icon-192x192.svg',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || './'
        },
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'close', title: 'Close' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Neon Pong', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const urlToOpen = event.notification.data?.url || './';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Check if there's already a window open
                for (const client of windowClients) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
