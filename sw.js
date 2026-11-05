const CACHE = 'game2048-v3';
const ASSETS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(ASSETS))
      .catch(err=>console.log('Cache failed:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request).then(r=>{
      return r || fetch(e.request).then(resp=>{
        if(resp.ok && e.request.method==='GET'){
          const copy = resp.clone();
          caches.open(CACHE).then(c=>c.put(e.request, copy));
        }
        return resp;
      }).catch(()=>{
        if(e.request.mode === 'navigate'){
          return caches.match('./index.html');
        }
      });
    })
  );
});
