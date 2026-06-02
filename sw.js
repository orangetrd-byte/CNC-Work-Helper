const CACHE_NAME = 'cnc-lathe-work-helper-v28';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './enhancements.css',
  './app.js',
  './job-loader.js',
  './enhancements.js',
  './polish.js',
  './uiux.js',
  './assistant.js',
  './refnav-fix.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/app-icon.svg',
  './icons/app-icon-maskable.svg',
  './icons/favicon.svg',
  './icons/ui-symbols.svg'
];
const EXTRA_TAGS = [
  '<script src="./polish.js" defer></script>',
  '<script src="./uiux.js" defer></script>',
  '<script src="./assistant.js" defer></script>',
  '<script src="./refnav-fix.js" defer></script>'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function injectExtraScripts(response) {
  if (!response) return response;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;
  let html = await response.text();
  const missing = EXTRA_TAGS.filter(tag => !html.includes(tag.match(/\.\/([^" ]+)/)?.[1] || tag));
  if (missing.length) html = html.replace('</body>', `${missing.join('\n')}\n</body>`);
  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/html; charset=UTF-8');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const wantsHtml = event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html');
  if (wantsHtml) {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return injectExtraScripts(response);
    }).catch(() => caches.match(event.request).then(cached => injectExtraScripts(cached)).then(injected => injected || caches.match('./index.html').then(fallback => injectExtraScripts(fallback)))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
