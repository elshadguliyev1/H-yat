// Offline: app files network-first (so updates arrive), fonts cache-first.
const CACHE = "heyat-v12";
const FILES = ["./", "index.html", "engine.js", "js/core.js", "js/db.js", "js/interp.js", "data/rules.json", "data/events/core_5_17.json", "data/events/core_18_plus.json", "data/events/pack_v1.json", "data/events/arcs_5_18.json", "data/events/paths.json", "data/events/politics.json", "data/events/gender.json", "data/careers.json", "js/career.js", "js/justice.js", "js/sport.js", "js/politics.js", "js/items.js", "js/family.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; }).catch(() => new Response("", { status: 504 }))));
    return;
  }
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === "navigate" ? caches.match("./") : undefined))));
});
