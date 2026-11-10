// RadPro Analyst Progressive Web App (PWA) Service Worker — Offline Field Edition
const CACHE_NAME = 'radpro-cache-v3';
const TILE_CACHE_NAME = 'radpro-map-tiles-v1';
const MAX_CACHED_TILES = 350;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== TILE_CACHE_NAME) {
            return caches.delete(key);
          }
          return undefined;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass caching for external live AI / weather APIs so offline errors fail fast & cleanly
  if (
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.hostname.includes('localhost') && url.port === '11434' ||
    url.hostname.includes('open-meteo.com')
  ) {
    return;
  }

  // Cache-first + LRU cap for GIS map tiles (CartoDB / OSM) so field maps work offline
  if (
    url.hostname.includes('basemaps.cartocdn.com') ||
    url.hostname.includes('tile.openstreetmap.org')
  ) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((tileCache) =>
        tileCache.match(event.request).then((cachedTile) => {
          if (cachedTile) return cachedTile;
          return fetch(event.request)
            .then((netRes) => {
              if (netRes && netRes.status === 200) {
                const clone = netRes.clone();
                tileCache.put(event.request, clone).then(() => {
                  tileCache.keys().then((keys) => {
                    if (keys.length > MAX_CACHED_TILES) {
                      tileCache.delete(keys[0]);
                    }
                  });
                });
              }
              return netRes;
            })
            .catch(() => cachedTile || Response.error());
        })
      )
    );
    return;
  }

  // Only handle same-origin assets below
  if (url.origin !== self.location.origin) return;

  const isNavigate =
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html');

  // Strategy 1: Network-First for HTML navigation (fresh deployments + full offline fallback)
  if (isNavigate) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match('/index.html').then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // Strategy 2: Cache-first with network fallback for hashed JS/CSS/font bundles
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return networkResponse;
        })
        .catch(() => cachedResponse || Response.error());
    })
  );
});
