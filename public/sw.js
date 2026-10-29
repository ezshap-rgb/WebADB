// Minimal service worker to fulfill PWA and TWA installability
const CACHE_NAME = 'webadb-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network handle WebUSB / live scripts
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

