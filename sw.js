/* Versioned, atomic offline shell. All brand logos are available offline.
   Never substitute HTML for a failed image or cache unrelated origins. */
const CACHE = 'spotted-v16';
const ASSETS = [
  './', './index.html', './styles.css?v=16', './cars.js?v=16', './game.js?v=16', './app.js?v=16',
  './manifest.json', './icon.svg',
  './assets/brands/abarth.png',
  './assets/brands/alfa-romeo.png',
  './assets/brands/aston-martin.png',
  './assets/brands/audi.png',
  './assets/brands/bentley.png',
  './assets/brands/bmw.png',
  './assets/brands/byd.png',
  './assets/brands/chevrolet.png',
  './assets/brands/citroen.png',
  './assets/brands/cupra.png',
  './assets/brands/dacia.png',
  './assets/brands/ds.png',
  './assets/brands/ferrari.png',
  './assets/brands/fiat.png',
  './assets/brands/ford.png',
  './assets/brands/genesis.png',
  './assets/brands/honda.png',
  './assets/brands/hyundai.png',
  './assets/brands/jaguar.png',
  './assets/brands/jeep.png',
  './assets/brands/kia.png',
  './assets/brands/lamborghini.png',
  './assets/brands/land-rover.png',
  './assets/brands/lexus.png',
  './assets/brands/lotus.png',
  './assets/brands/maserati.png',
  './assets/brands/mazda.png',
  './assets/brands/mclaren.png',
  './assets/brands/mercedes-benz.png',
  './assets/brands/mg.png',
  './assets/brands/mini.png',
  './assets/brands/mitsubishi.png',
  './assets/brands/nissan.png',
  './assets/brands/peugeot.png',
  './assets/brands/polestar.png',
  './assets/brands/porsche.png',
  './assets/brands/renault.png',
  './assets/brands/rolls-royce.png',
  './assets/brands/saab.png',
  './assets/brands/seat.png',
  './assets/brands/skoda.png',
  './assets/brands/smart.png',
  './assets/brands/ssangyong.png',
  './assets/brands/subaru.png',
  './assets/brands/suzuki.png',
  './assets/brands/tesla.png',
  './assets/brands/toyota.png',
  './assets/brands/vauxhall.png',
  './assets/brands/volkswagen.png',
  './assets/brands/volvo.png',
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
