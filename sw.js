// Bump this version whenever the caching logic or the app shell changes.
// v9: fixes "not found" on back-navigation caused by caching Vercel cleanUrls
// redirects (/index.html -> /, /produto.html -> /produto) and replaying them
// to navigation requests, which browsers reject outright.
const CACHE_NAME = 'floricultura-recife-v9';

// Only clean URLs here. Never list *.html: with cleanUrls enabled on Vercel
// those 308-redirect, and a cached redirected response breaks navigations.
const PRECACHE_ASSETS = [
  '/',
  '/produto',
  '/styles.css',
  '/script.js',
  '/images/logo.png',
  '/images/logo.webp',
  '/images/hero_floral_arrangement.webp',
  '/images/about_florist_detail.webp'
];

const isNavigation = (request) =>
  request.mode === 'navigate' || request.destination === 'document';

// A response that came from a redirect can never be handed to a navigation
// request (its redirect mode is "manual"), so it must not enter the cache.
const isCacheable = (response) =>
  response && response.status === 200 && response.type === 'basic' && !response.redirected;

// Install - precache the shell, tolerating individual failures so one missing
// asset cannot abort the whole installation (as cache.addAll would).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_ASSETS.map((url) =>
          fetch(new Request(url, { redirect: 'follow', cache: 'reload' }))
            .then((response) => (isCacheable(response) ? cache.put(url, response) : null))
            .catch(() => null)
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// Activate - drop every previous cache version.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Leave everything we don't own to the browser.
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // Pages: network-first, so redirects and fresh content always win. The cache
  // is only a last resort, and we always resolve to a real Response.
  if (isNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheable(response)) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (
            await cache.match(request, { ignoreSearch: true }) ||
            await cache.match('/') ||
            new Response(
              '<!doctype html><meta charset="utf-8"><title>Sem conexao</title>' +
              '<p style="font:16px system-ui;padding:2rem">Voce esta offline. ' +
              'Verifique sua conexao e tente novamente.</p>',
              { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            )
          );
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate, never resolving to undefined.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });

      const fromNetwork = fetch(request)
        .then((response) => {
          if (isCacheable(response)) {
            cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        })
        .catch(() => cached || Response.error());

      return cached || fromNetwork;
    })
  );
});
