// RadPro Analyst Progressive Web App (PWA) Service Worker — Offline Field Edition
const CACHE_NAME = 'radpro-cache-v5';
const TILE_CACHE_NAME = 'radpro-map-tiles-v1';
const MAX_CACHED_TILES = 350;

const BASE_PATH = new URL('./', self.location.href).pathname.replace(/\/$/, '');
const withBase = (p) => `${BASE_PATH}${p}`;

const STATIC_ASSETS = [
  withBase('/'),
  withBase('/index.html'),
  withBase('/manifest.json'),
  withBase('/favicon.svg')
];

async function warmLazyChunksInBackground(cache) {
  try {
    const res = await fetch(withBase('/precache-manifest.json'), { cache: 'no-cache' });
    if (!res.ok) return;
    const manifest = await res.json();
    if (!manifest || !Array.isArray(manifest.assets)) return;
    // Warm lazy JS/CSS module chunks sequentially in small batches so offline vaults never hit ChunkLoadError
    const batchSize = 6;
    for (let i = 0; i < manifest.assets.length; i += batchSize) {
      const batch = manifest.assets.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (assetUrl) => {
          const existing = await cache.match(assetUrl);
          if (!existing) {
            const net = await fetch(assetUrl);
            if (net && net.status === 200) {
              await cache.put(assetUrl, net);
            }
          }
        })
      );
    }
  } catch {
    // Offline or dev server (no precache-manifest.json) — gracefully skip
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== TILE_CACHE_NAME) {
            return caches.delete(key);
          }
          return undefined;
        })
      );
      await self.clients.claim();
      const cache = await caches.open(CACHE_NAME);
      // Kick off non-blocking background precache of all lazy-loaded module chunks
      warmLazyChunksInBackground(cache);
    })()
  );
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
    (url.hostname.includes('localhost') && url.port === '11434') ||
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

  // Never intercept or cache Vite dev server module/HMR requests
  if (
    url.pathname.startsWith(withBase('/src/')) ||
    url.pathname.startsWith(withBase('/@')) ||
    url.pathname.startsWith(withBase('/node_modules/'))
  ) {
    return;
  }

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
            caches.open(CACHE_NAME).then((cache) => cache.put(withBase('/index.html'), copy));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(withBase('/index.html')).then((cached) => cached || caches.match(withBase('/')))
        )
    );
    return;
  }

  // Strategy 2: Cache-first only for hashed immutable bundles/fonts/icons; network-first for other assets
  const isImmutableAsset =
    url.pathname.startsWith(withBase('/assets/')) ||
    /\.(woff2|svg|png|ico)$/i.test(url.pathname);

  if (isImmutableAsset) {
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
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
  );
});
