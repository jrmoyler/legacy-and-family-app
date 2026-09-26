/**
 * The Compassion Hub — service worker.
 *
 * Keeps the app shell and the free reading (the lessons live in src/data.js)
 * available offline once installed. It is network-first, so a normal refresh
 * always picks up a new release; the cache is only the fallback.
 *
 * It never touches /api/ (checkout, restore, signed downloads) and never
 * caches a PDF or EPUB. Paid editions must only ever arrive through a fresh,
 * short-lived signed link.
 */

const CACHE = 'compassion-hub-shell-v1';

const SHELL = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './manifest.webmanifest',
  './src/components.js',
  './src/data.js',
  './src/dom.js',
  './src/icons.js',
  './src/screens.js',
  './src/state.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  '/assets/library/brand/a-cup-of-compassion-logo.jpg?v=official-brand-20260818',
];

/** Requests the worker leaves entirely to the network. */
function bypass(url) {
  return url.origin !== self.location.origin
    || url.pathname.startsWith('/api/')
    || /\.(pdf|epub)$/i.test(url.pathname);
}

/** Same-origin static files worth keeping for offline use. */
function cacheable(url) {
  return /\.(html|css|js|webmanifest|png|jpg|jpeg|svg)$/i.test(url.pathname) || url.pathname === '/';
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (bypass(url)) return;

  const isPage = request.mode === 'navigate';
  if (!isPage && !cacheable(url)) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(isPage ? './index.html' : request, copy));
      }
      return response;
    } catch (error) {
      const cached = await caches.match(isPage ? './index.html' : request);
      if (cached) return cached;
      throw error;
    }
  })());
});
