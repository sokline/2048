const CACHE_NAME = 'game2048-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// ===== INSTALL: кэшируем всё при первой установке =====
self.addEventListener('install', (event) => {
  console.log('[SW] Установка, кэширование ресурсов');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => {
        console.log('[SW] Все ресурсы закэшированы');
        return self.skipWaiting(); // активируем новый SW сразу
      })
      .catch((err) => console.error('[SW] Ошибка кэширования:', err))
  );
});

// ===== ACTIVATE: удаляем старые кэши =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Удаление старого кэша:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ===== FETCH: cache-first с фоновым обновлением =====
self.addEventListener('fetch', (event) => {
  // Игнорируем не-GET запросы
  if (event.request.method !== 'GET') return;

  // Игнорируем запросы к другим доменам (например, аналитика)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Нашли в кэше — возвращаем сразу (мгновенная загрузка)
          // И в фоне обновляем кэш свежей версией с сервера
          event.waitUntil(
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  const responseToCache = networkResponse.clone();
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
                }
              })
              .catch(() => {
                // Нет интернета — ничего не делаем, кэш уже есть
              })
          );
          return cachedResponse;
        }

        // Не нашли в кэше — грузим из сети и кэшируем
        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          })
          .catch(() => {
            // Сеть недоступна и в кэше нет — для навигации показываем index
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// ===== MESSAGE: ручной триггер обновления (опционально) =====
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
