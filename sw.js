const CACHE_NAME = 'cnc-lathe-work-helper-v10';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './job-loader.js',
  './manifest.json',
  './icons/app-icon.svg',
  './icons/app-icon-maskable.svg',
  './icons/favicon.svg',
  './icons/ui-symbols.svg'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); return response;
  }).catch(() => caches.match('./index.html'))));
});
