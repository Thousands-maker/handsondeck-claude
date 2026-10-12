/* HandsOnDeck service worker.
 *
 * The app makes no network requests of its own — generation, editing and rendering
 * all run in the page. The only thing the network is ever needed for is fetching the
 * app itself. This worker removes that last dependency: after one visit, HandsOnDeck
 * opens and works with no connection at all.
 *
 * Strategy: precache the shell on install, then serve from cache first and refresh
 * the cache in the background when a network happens to be available.
 */

var VERSION = "handsondeck-v2";
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) {
      // addAll fails the whole install if any one request fails, so add individually
      // and let the page still work from the network if a secondary file is missing.
      return Promise.all(
        SHELL.map(function (url) {
          return cache.add(new Request(url, { cache: "reload" })).catch(function () {});
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          return key === VERSION ? null : caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;

  // Only handle same-origin GETs. Everything else is passed straight through.
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var fresh = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(VERSION).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return cached || caches.match("./index.html");
      });

      // Cache first so the app opens instantly and identically offline;
      // the network copy refreshes the cache for next time.
      return cached || fresh;
    })
  );
});
