const STATIC_CACHE = 'rideiq-static-v1';
const RUNTIME_CACHE = 'rideiq-runtime-v1';
const MAX_RUNTIME_ITEMS = 100;

const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

function isStaticAsset(request) {
  return request.method === 'GET' && request.url.startsWith(self.location.origin) && !request.url.includes('/api/');
}

function isSupabaseRequest(url) {
  return url.includes('.supabase.co') || url.includes('/rest/v1/') || url.includes('/auth/v1/') || url.includes('/functions/v1/');
}

async function trimRuntimeCache() {
  const cache = await caches.open(RUNTIME_CACHE);
  const keys = await cache.keys();
  if (keys.length <= MAX_RUNTIME_ITEMS) return;
  const removeCount = keys.length - MAX_RUNTIME_ITEMS;
  await Promise.all(keys.slice(0, removeCount).map((key) => cache.delete(key)));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  if (request.method !== 'GET') return;
  if (isSupabaseRequest(url)) return;

  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).then(trimRuntimeCache);
          return response;
        });
      }),
    );
    return;
  }

  // Network-first fallback for third-party assets (maps scripts/tiles).
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).then(trimRuntimeCache);
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error())),
  );
});

