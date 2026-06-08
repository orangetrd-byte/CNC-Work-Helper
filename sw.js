const CACHE_NAME = 'cnc-lathe-work-helper-v41';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './enhancements.css',
  './quickflow.css',
  './colorway.css',
  './app.js',
  './job-loader.js',
  './enhancements.js',
  './polish.js',
  './uiux.js',
  './assistant.js',
  './quickflow.js',
  './refnav-fix.js',
  './autosave-fix.js',
  './update-helper.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const freshFirst = event.request.mode === 'navigate' || /\.(html|js|css|json)$/i.test(url.pathname);
  event.respondWith((freshFirst ? fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))) : caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html')))));
});
