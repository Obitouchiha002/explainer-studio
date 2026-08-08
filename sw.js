/* Service worker.
   Do alag rastey, kyunki dono ki zaroorat alag hai:

   · HTML (app khud)  -> NETWORK-FIRST. Naya version turant milna chahiye.
     Pehle cache-first tha, jiska matlab tha ki har deploy ke baad aapko purana
     app dikhta tha jab tak do baar reload na karo. Wahi galat tha.
   · icons/manifest   -> CACHE-FIRST. Ye badalte nahi, turant milne chahiye.
   · bahar ki API     -> bilkul chhoo mat. Groq/Iconify/YouTube ka purana jawab
     dena galat hoga.                                                        */
const CACHE = 'tbv-studio-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest',
               './icon-192.png', './icon-512.png', './icon-1024.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;      // API kabhi cache nahi

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if(isHTML){
    // pehle network — na chale to cache se, taaki offline bhi khule
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if(res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit))
  );
});

self.addEventListener('message', e => { if(e.data === 'skipWaiting') self.skipWaiting(); });
