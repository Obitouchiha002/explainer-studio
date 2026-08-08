/* Service worker — app ko offline chalane ke liye.
   Soch simple hai: app ke apne file cache-first (turant khulen, internet ho ya na ho),
   aur bahar ki har cheez (Groq, Iconify, YouTube) bilkul cache na ho — wahan taaza
   jawab hi chahiye, aur purana jawab dena galat hoga. */
const CACHE = 'tbv-studio-v1';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-1024.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // apne origin ke bahar ka kuch bhi cache mat karo — API aur icons live hi rahen
  if(url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then(hit => {
      if(hit){
        // background me chupchaap taaza kar lo, agli baar naya milega
        fetch(req).then(res => {
          if(res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then(res => {
        if(res && res.ok && url.origin === self.location.origin){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// naya version aane par turant lagao
self.addEventListener('message', e => { if(e.data === 'skipWaiting') self.skipWaiting(); });
