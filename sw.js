/* Tiny offline cache — the game has to keep working when signal drops. */
const CACHE = 'carspotter-v6';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=6',
  './cars.js?v=6',
  './app.js?v=6',
  './manifest.json',
  './assets/cars/tesla-model-y.webp',
  './assets/cars/honda-jazz.webp',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // Network first so a deploy is picked up, cache as the fallback.
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  );
});
