/*
 * Service worker — makes Japan Pocket work offline.
 * App files are cached on install (cache-first). Bump VERSION whenever
 * you change any file so phones pick up the new version.
 * Cross-origin requests (exchange-rate and translation APIs) are not cached
 * here; the last exchange rate is kept in localStorage by the Money tool.
 */
var VERSION = 'jp-v1.3.1';

var APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'js/core/store.js',
  'js/core/ui.js',
  'js/core/registry.js',
  'js/core/router.js',
  'js/core/translate.js',
  'js/core/sync.js',
  'js/core/app.js',
  'js/data/phrases.js',
  'js/data/dietary.js',
  'js/data/emergency.js',
  'js/data/cheatsheets.js',
  'js/tools/phrases.js',
  'js/tools/money.js',
  'js/tools/safety.js',
  'js/tools/cheatsheets.js',
  'js/tools/lists.js',
  'js/tools/settings.js',
  'js/tools/sync.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION)
      .then(function (cache) { return cache.addAll(APP_FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let the network handle other sites

  // Page navigations: serve the cached app shell (hash routes are client-side).
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then(function (cached) {
        return cached || fetch(req);
      }).catch(function () { return fetch(req); })
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
