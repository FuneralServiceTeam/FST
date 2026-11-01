const CACHE_NAME = "cfc-fst-pwa-v11";
const IMG_CACHE = "cfc-fst-img-v4";
const MAX_IMGS = 20;
const APP_SHELL = ["./","./index.html","./admin.html","./css/style.css","./js/shared.js","./js/app.js","./js/admin.js","./js/publish.js","./js/pwa.js","./js/outreach-app.js","./js/outreach-admin.js","./manifest.webmanifest","./assets/fst-icon.svg","./assets/icons/icon-192.png","./assets/icons/icon-512.png"];
const DATA_RE = /\/data\/(events|assignments|finances|ledger|announcements|posters|devotion|settings|songs|people|attendance|believers)\.json$/;
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("cfc-fst-") && k !== CACHE_NAME && k !== IMG_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Audio is never handled here: the browser streams it and the ?v= version in its URL refreshes it.
  if (/\.(mp3|m4a|ogg|wav)$/i.test(url.pathname) || req.headers.has("range")) return;
  if (/\/assets\/posters\/[^/]+\.(jpe?g|png|webp)$/i.test(url.pathname)) {
    event.respondWith(caches.open(IMG_CACHE).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          await cache.put(req, res.clone());
          const keys = await cache.keys();
          if (keys.length > MAX_IMGS) await cache.delete(keys[0]);
        }
        return res;
      } catch (e) { return Response.error(); }
    }));
    return;
  }
  if (DATA_RE.test(url.pathname)) {
    const empty = url.pathname.endsWith("/posters.json") ? '{"posters":[]}' : (url.pathname.endsWith("/devotion.json")||url.pathname.endsWith("/settings.json")) ? "{}" : "[]";
    event.respondWith(fetch(req, {cache: "no-store"}).then(response => {
      if (response && response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(req, copy)); }
      return response;
    }).catch(() => caches.match(req).then(cached => cached || new Response(empty, {headers: {"Content-Type": "application/json"}}))));
    return;
  }
  event.respondWith(fetch(req).then(response => {
    if (response && response.ok && response.type === "basic") { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(req, copy)); }
    return response;
  }).catch(() => caches.match(req).then(cached => cached || (req.mode === "navigate" ? caches.match("./index.html") : undefined))));
});
