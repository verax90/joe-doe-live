// Service worker: the studio keeps working without a connection.
// - The app itself (page, scripts, Strudel, Hydra, fonts, icons) is saved when
//   it installs, from the file list the build writes into PRECACHE; a new
//   build brings a new list and the old copy goes.
// - Sounds (samples, soundfonts) are saved the first time they are used and
//   kept across versions. Lists (the sample maps, the tools list) try the
//   network first so they stay fresh, and come from the saved copy offline.
// Written by the build (vite.config.ts) from this template.
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const SHELL = `jdl-shell-${VERSION}`;
const SOUNDS = 'jdl-sounds';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('jdl-shell-') && key !== SHELL).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

const save = async (cacheName, request, response) => {
  if (response.ok || response.type === 'opaque') await (await caches.open(cacheName)).put(request, response.clone());
  return response;
};

const networkFirst = async (request, cacheName) => {
  try {
    return await save(cacheName, request, await fetch(request));
  } catch (error) {
    const saved = await caches.match(request, { ignoreSearch: request.mode === 'navigate' });
    if (saved) return saved;
    throw error;
  }
};

const cacheFirst = async (request, cacheName) => (await caches.match(request)) ?? save(cacheName, request, await fetch(request));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Partial (range) requests are for media being streamed: left alone
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;
  // The page: the latest when online, the saved one offline (any ?lang= or #)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL).catch(() => caches.match('/')));
  } else if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL));
  } else if (url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(request, SOUNDS));
  } else {
    event.respondWith(cacheFirst(request, SOUNDS));
  }
});
