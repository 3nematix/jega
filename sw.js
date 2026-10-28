/* Jėga service worker — offline app shell + runtime-cached exercise thumbnails */
const VERSION = 'jega-v1';
const SHELL = VERSION + '-shell';
const THUMBS = VERSION + '-thumbs';

const SHELL_ASSETS = [
  './',
  './index.html',
  './app.js',
  './exercises.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Exercise thumbnails: cache-first, store on first view so they work offline later.
  if (url.pathname.includes('/assets/thumbs/')) {
    e.respondWith(
      caches.open(THUMBS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        } catch (err) {
          return hit || Response.error();
        }
      })
    );
    return;
  }

  // Navigations: serve cached app shell (offline-first SPA).
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then((hit) => hit || fetch(req))
    );
    return;
  }

  // Everything else same-origin: cache-first, fall back to network.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit))
    );
  }
});
