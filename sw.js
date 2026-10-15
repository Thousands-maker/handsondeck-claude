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

var VERSION = "handsondeck-v8";
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
/* Large files are stored in pieces (see the page's aiDownload); their AI_OK record reads
   "<sha256>|parts|<count>|<url>", and they are served here joined back into one file. */
var AI_PARTS = "handsondeck-ai-parts";

function partUrl(url, k) { return url + (url.indexOf("?") === -1 ? "?" : "&") + "hodpart=" + k; }

function contentTypeOf(url) {
  if (/\.json(\?|$)/.test(url)) return "application/json";
  if (/\.wasm(\?|$)/.test(url)) return "application/wasm";
  if (/\.m?js(\?|$)/.test(url)) return "text/javascript";
  return "application/octet-stream";
}

function joinedParts(base, n) {
  return caches.open(AI_PARTS).then(function (pc) {
    var ms = [];
    for (var k = 0; k < n; k++) ms.push(pc.match(partUrl(base, k)));
    return Promise.all(ms);
  }).then(function (rs) {
    if (!rs.length || rs.some(function (r) { return !r; })) return null;
    var total = rs.reduce(function (s, r) { return s + (parseInt(r.headers.get("x-bytes"), 10) || 0); }, 0);
    var i = 0, reader = null;
    var body = new ReadableStream({
      pull: function (ctrl) {
        function step() {
          if (!reader) {
            if (i >= rs.length) { ctrl.close(); return; }
            reader = rs[i++].body.getReader();
          }
          return reader.read().then(function (r) {
            if (r.done) { reader = null; return step(); }
            ctrl.enqueue(r.value);
          });
        }
        return step();
      }
    });
    return new Response(body, { headers: { "content-type": contentTypeOf(base), "content-length": String(total) } });
  });
}

function checkedCopy(req) {
  return caches.open(AI_OK).then(function (ok) {
    return ok.match(req.url, { ignoreSearch: true });
  }).then(function (mark) {
    if (!mark) return null;
    return mark.text().then(function (t) {
      var p = t.split("|");
      if (p[1] === "parts") return joinedParts(p.slice(3).join("|") || req.url, parseInt(p[2], 10));
      return caches.open(AI_CACHE).then(function (c) { return c.match(req.url, { ignoreSearch: true }); });
    });
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
          return (key === VERSION || key === AI_CACHE || key === AI_OK || key === AI_PARTS || key.indexOf("webllm") === 0)
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
  if (/\/version\.json$/.test(url.pathname)) return;   // always ask the network which build is live

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
