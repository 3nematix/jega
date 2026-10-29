/* Jėga service worker — network-first app shell (always fresh online),
   cache fallback offline, runtime-cached exercise thumbnails. */
const VERSION = 'jega-v9';
const SHELL = VERSION + '-shell';
const THUMBS = VERSION + '-media';

const SHELL_ASSETS = [
  './',
  './index.html',
  './app.js',
  './boot.js',
  './exercises.js',
  './assets/vendor/supabase.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/icon.svg',
  './assets/fonts/figtree.woff2'
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

  // Exercise thumbnails and videos: cache-first, stored on first view so they work offline later.
  if (url.pathname.includes('/assets/thumbs/') || url.pathname.includes('/assets/videos/')) {
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

  // Navigations: network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(SHELL).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Other same-origin assets (app code, icons): network-first so updates apply,
  // cache fallback for offline.
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
  }
});
