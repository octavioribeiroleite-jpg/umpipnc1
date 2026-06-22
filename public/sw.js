const CACHE_NAME = 'ump-cache-v7';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isApiRequest(url) {
  return url.pathname.includes('/rest/') ||
    url.pathname.includes('/auth/') ||
    url.pathname.includes('/functions/') ||
    url.pathname.includes('/storage/') ||
    url.pathname.includes('/token') ||
    url.hostname.includes('supabase');
}

function isOAuthRoute(url) {
  return url.pathname.startsWith('/~oauth');
}

function isHashedAsset(url) {
  return url.pathname.startsWith('/assets/') &&
    /\.(js|css|woff2?|ttf|otf)(\?|$)/.test(url.pathname);
}

function isImageAsset(url) {
  return /\.(png|jpg|jpeg|svg|gif|ico|webp)(\?|$)/.test(url.pathname);
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (isApiRequest(url)) return;
  if (isOAuthRoute(url)) return;
  if (isNavigationRequest(request)) return;

  if (isHashedAsset(url) || isImageAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
