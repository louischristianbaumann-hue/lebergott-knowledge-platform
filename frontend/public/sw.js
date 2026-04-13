const CACHE_NAME = 'lebergott-v2';
const OFFLINE_URL = '/offline.html';

// Static app shell — always cache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/apple-touch-icon-152.png',
  '/apple-touch-icon-167.png',
  '/apple-touch-icon-180.png',
];

// ── Install: pre-cache app shell ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: evict old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch strategy ────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from the same origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // ── API calls: network-first, fall back to cache if offline ──────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstWithTimeout(request, 8000)
    );
    return;
  }

  // ── Static assets (JS, CSS, fonts, images): cache-first ──────────────
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|ico|webp|jpg|jpeg)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // ── HTML / SPA routes: network-first, fallback to cache, then offline ─
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request)
          .then((cached) => cached || caches.match(OFFLINE_URL))
      )
  );
});

// ── Helper: network-first with timeout, cache fallback ───────────────────
function networkFirstWithTimeout(request, timeoutMs) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      caches.match(request).then((cached) => {
        if (cached) resolve(cached);
        // else let the fetch resolve when it arrives
      });
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timeout);
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        resolve(response);
      })
      .catch(() => {
        clearTimeout(timeout);
        caches.match(request).then((cached) => {
          resolve(cached || new Response(
            JSON.stringify({ error: 'offline', cached: false }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          ));
        });
      });
  });
}
