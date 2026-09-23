/* Service Worker WebLinux Pro */

const VERSION = 'v2.0.0';
const CACHE_APP = 'weblinux-' + VERSION;
const CACHE_LIB = 'weblinux-lib-' + VERSION;

const SHELL = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_APP && k !== CACHE_LIB).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Runtime WASM (Pyodide, sql.js, Fengari) — cache runtime
  if (url.hostname.includes('pyodide') || url.hostname.includes('jsdelivr') ||
      url.hostname.includes('unpkg') || url.hostname.includes('cdn')) {
    e.respondWith(
      caches.open(CACHE_LIB).then(cache =>
        cache.match(req).then(hit => hit || fetch(req).then(res => {
          if (res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(() => hit))
      )
    );
    return;
  }

  // App shell — cache first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_APP).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html')))
    );
  }
});