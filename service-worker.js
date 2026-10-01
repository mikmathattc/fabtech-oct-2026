/* ATTC FABTECH kiosk: offline support.
   Each time the kiosk opens while online, it checks GitHub for a newer index.html
   and saves it for the next open. You do not need to edit this file for normal updates. */
const VERSION = 'v1';
const CACHE = `attc-kiosk-${VERSION}`;
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('attc-kiosk-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from the iPad's saved copy first so the kiosk works with no Wi-Fi.
// When online, quietly refresh the saved copy in the background.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const key = req.mode === 'navigate' ? './index.html' : req;
  const refresh = caches.open(CACHE).then(cache =>
    fetch(req, { cache: 'no-cache' }).then(res => { if (res && res.ok) cache.put(key, res.clone()); return res; })
  ).catch(() => null);
  event.waitUntil(refresh.then(() => {}));
  event.respondWith(
    caches.match(key, { ignoreSearch: true }).then(async cached => {
      if (cached) return cached;
      const res = await refresh;
      return res || new Response('Offline and not yet saved on this iPad. Connect to the internet and reload once.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    })
  );
});
