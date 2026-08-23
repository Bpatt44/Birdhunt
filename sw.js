/* BirdHunt service worker — v1.3.1
   NETWORK-FIRST for the HTML shell, cache-first for static assets.

   Why: a pure cache-first worker serves a stale index.html even after a new
   version is deployed, and bumping CACHE alone does not help until the worker
   itself updates. Network-first on the shell means a deploy lands as soon as
   the device is online, and the cache is only used as an offline fallback.  */

const CACHE = "birdhunt-v3.18.0";
const SHELL = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", e => {
  self.skipWaiting();                       // take over immediately
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Lets the page force an update without the user deleting the app.
self.addEventListener("message", e => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;   // never touch cross-origin
  if (e.request.method !== "GET") return;

  const isShell = e.request.mode === "navigate" ||
                  url.pathname.endsWith("/") ||
                  url.pathname.endsWith("index.html");

  if (isShell) {
    // NETWORK FIRST — always try for a fresh build, fall back to cache offline.
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then(hit => hit || caches.match("./")))
    );
    return;
  }

  // Art is cached ON FIRST USE, never precached. 262 species of photographs
  // would be a huge first load; this way you only ever store the birds you
  // have actually seen, and they stay available offline afterwards.

  // Everything else: cache first, it never changes without a filename change.
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
