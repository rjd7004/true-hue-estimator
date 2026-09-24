/* ==========================================================================
   True Hue Estimate Builder — service worker
   Keeps the app working with no signal on a jobsite, while still picking
   up new versions on its own whenever there IS signal.

   Strategy
   - Our own files (the .html/.js/.css pages, sw-colors.json, logos, icons): NETWORK-FIRST.
     Try the network; if it answers within NETWORK_TIMEOUT_MS, use it and
     refresh the cache. If it's slow or offline, fall back to the cache.
     So normal edits to index.html show up automatically — no need to bump
     CACHE_NAME just to push an update.
   - The JsBarcode CDN script: CACHE-FIRST. Its URL is pinned to a version,
     so the file at that URL never changes.
   - Cached copies are stored WITHOUT the query string, so the iOS print
     tab (e.g. residential.html?autoprint=1) still finds the page offline.

   When to bump CACHE_NAME (e.g. v2 -> v3): only when you add/remove/rename
   a file in the ASSETS list below, or want to force-purge old cached files.
   ========================================================================== */

const CACHE_NAME = 'true-hue-estimator-v5'; // v5: v7.5 added settings.html + settings.js
const NETWORK_TIMEOUT_MS = 4000;

const ASSETS = [
  './',
  './index.html',
  './residential.html',
  './commercial.html',
  './settings.html',
  './common.css',
  './common.js',
  './residential.js',
  './commercial.js',
  './settings.js',
  './manifest.json',
  './sw-colors.json',
  './logo-light.svg',
  './logo-dark.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.4/dist/JsBarcode.all.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Pinned third-party script: cache-first.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Our own files: network-first, cached under the URL minus its query string.
  const cacheKey = url.origin + url.pathname;
  event.respondWith(networkFirst(event, request, cacheKey));
});

function networkFirst(event, request, cacheKey) {
  const network = fetch(request);

  // Whenever the network does come back OK (even after we've given up
  // waiting and served the cache), save it for next time.
  event.waitUntil(
    network
      .then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          return caches.open(CACHE_NAME).then((cache) => cache.put(cacheKey, copy));
        }
      })
      .catch(() => { /* offline — nothing to update */ })
  );

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('network timeout')), NETWORK_TIMEOUT_MS)
  );

  return Promise.race([network, timeout])
    .then((response) => {
      if (response && response.ok) return response;
      throw new Error('bad response');
    })
    .catch(() =>
      caches.match(cacheKey, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        // Nothing cached yet (e.g. very first visit on weak signal):
        // keep waiting on the network rather than failing outright.
        return network;
      })
    );
}
