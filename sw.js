/* Versioned, atomic offline shell. All ten posters are available offline.
   Never substitute HTML for a failed image or cache unrelated origins. */
const CACHE = 'spotted-v11';
const ASSETS = [
  './', './index.html', './styles.css?v=11', './cars.js?v=11', './game.js?v=11', './app.js?v=11',
  './manifest.json', './icon.svg',
  './assets/cars/tesla-model-y.webp', './assets/cars/honda-jazz.webp',
  './assets/cars/ford-fiesta.webp', './assets/cars/vauxhall-corsa.webp',
  './assets/cars/volkswagen-golf.webp', './assets/cars/mini-hatch.webp',
  './assets/cars/nissan-qashqai.webp', './assets/cars/kia-sportage.webp',
  './assets/cars/tesla-model-3.webp', './assets/cars/fiat-500.webp',
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
  // Activate only after the complete version is cached. Current in-memory
  // journeys stay open; the next navigation loads the new complete shell.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('spotted-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (event.request.mode !== 'navigate' && cached) return cached;
    try {
      const response = await fetch(event.request);
      if (!response.ok) return cached || response;
      // Cache the complete shell only at install time. A fresh HTML document
      // may reference a newer version; its requests pass through normally.
      return response;
    } catch {
      return cached || (event.request.mode === 'navigate' ? await cache.match('./index.html') : undefined) || Response.error();
    }
  })());
});
