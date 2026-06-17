/* MangaHub mock — service worker.
   HTML/navigation = network-first (always get the latest app shell when online).
   Static assets (images/icons/manifest) = cache-first for speed + offline. */
const CACHE = 'mangahub-mock-v7';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icon-180.png', './icon-192.png', './icon-512.png'
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
  const req = e.request;
  if (req.method !== 'GET') return;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // network-first: latest home shows immediately when online, cached copy as offline fallback
    e.respondWith(
      fetch(req)
        .then((res) => { const c = res.clone(); caches.open(CACHE).then((ca) => ca.put('./index.html', c)).catch(() => {}); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // cache-first for static assets (pages, covers, icons)
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => { const c = res.clone(); caches.open(CACHE).then((ca) => ca.put(req, c)).catch(() => {}); return res; })
    )
  );
});
