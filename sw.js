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

var VERSION = "handsondeck-v6";
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg"
];

/* Supercharged (optional). The page streams each model file into AI_CACHE and, only once
   its SHA-256 matches the published fingerprint, records it in AI_OK. The worker hands a
   model nothing but files recorded in AI_OK, so a model only ever receives checked bytes,
   and it can start with no connection. This covers the Pro model's files on Hugging Face
   as well as files on this site. */
var AI_CACHE = "handsondeck-ai";
var AI_OK = "handsondeck-ai-ok";

function checkedCopy(req) {
  return caches.open(AI_OK).then(function (ok) {
    return ok.match(req.url, { ignoreSearch: true });
  }).then(function (mark) {
    if (!mark) return null;
    return caches.open(AI_CACHE).then(function (c) { return c.match(req.url, { ignoreSearch: true }); });
  });
}

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
          return (key === VERSION || key === AI_CACHE || key === AI_OK || key.indexOf("webllm") === 0)
            ? null : caches.delete(key);
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
  var url = new URL(req.url);
  var hfModel = /(^|\.)huggingface\.co$/.test(url.hostname) && /\/resolve\//.test(url.pathname);

  // Supercharged Pro model files on Hugging Face: checked copy first. Offline and not
  // stored, answer 404 (as Hugging Face would for an optional file) rather than failing.
  if (hfModel) {
    event.respondWith(checkedCopy(req).then(function (hit) {
      return hit || fetch(req).catch(function () { return new Response("", { status: 404 }); });
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Model and engine files on this site: checked copies first, never copied into the app
  // cache (they are hundreds of MB). Manifests go to the network first so a new model is
  // noticed, falling back to the saved copy offline.
  if (/\/(models|vendor)\//.test(url.pathname) || /\/resolve\//.test(url.pathname)) {
    if (/\/models\/[\w-]*manifest\.json$/.test(url.pathname)) {
      event.respondWith(fetch(req).catch(function () {
        return caches.open(AI_CACHE).then(function (c) { return c.match(req, { ignoreSearch: true }); })
          .then(function (hit) { return hit || new Response("", { status: 504 }); });
      }));
      return;
    }
    event.respondWith(checkedCopy(req).then(function (hit) {
      return hit || fetch(req).catch(function () { return new Response("", { status: 404 }); });
    }));
    return;
  }

  // The app page itself: network first, so an update shows on the next load, with the
  // saved copy used when there is no connection (or the network is too slow to wait for).
  if (req.mode === "navigate" || /\/(index\.html)?$/.test(url.pathname)) {
    event.respondWith(new Promise(function (resolve) {
      var settled = false;
      function done(r) { if (!settled && r) { settled = true; resolve(r); } }
      var timer = setTimeout(function () {
        caches.match(req).then(function (c) { return c || caches.match("./index.html"); }).then(done);
      }, 3500);
      fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(VERSION).then(function (cache) { cache.put(req, copy); });
        }
        clearTimeout(timer); done(res);
      }).catch(function () {
        clearTimeout(timer);
        caches.match(req).then(function (c) { return c || caches.match("./index.html"); })
          .then(function (c) { done(c || new Response("Offline", { status: 503 })); });
      });
    }));
    return;
  }

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

      // Everything else: cache first so the app opens instantly and identically offline;
      // the network copy refreshes the cache for next time.
      return cached || fresh;
    })
  );
});
