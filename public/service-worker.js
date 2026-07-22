/* global self */

// Network-only Service Worker: provides an installable PWA app context without
// risking stale music data, authentication state, or frontend bundles.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.method === 'GET') {
    event.respondWith(fetch(event.request));
  }
});
