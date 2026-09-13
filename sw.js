/* ==========================================================================
   True Hue Estimate Builder — service worker
   Caches the app shell so it opens and works with no signal on a jobsite.

   IMPORTANT: whenever you edit index.html (or anything else in this
   folder) and re-upload it, bump CACHE_NAME below (e.g. v1 -> v2).
   Phones that already installed the app keep serving the OLD cached
   files until the cache name changes — that's what forces them to
   fetch the new version next time the app opens.
   ========================================================================== */

const CACHE_NAME = 'true-hue-estimator-v1';

const ASSETS = [
  './',
  './index.html',
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
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for the app shell, falling back to network, and updating
// the cache with anything fresh so it's ready for the next offline visit.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && event.request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
