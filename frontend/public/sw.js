const CACHE_NAME = 'veridoc-ai-cache-v3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/logo.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
];

// Install event: cache static assets only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event: clean up all old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    })
  );
  self.clients.claim();
});

// Fetch event: network first for HTML and API, cache only for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API or HTML navigation requests - always network first
  if (
    url.pathname.startsWith('/api/') ||
    event.request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
