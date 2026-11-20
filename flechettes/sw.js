// Keeps the score counter usable offline: the page and its icons are cached (network first so updates arrive).
// The AI voice files in voix/ are big and never change: cache first, in their own cache shared with piper.js.
const CACHE = "flechettes-v6";
const VOIX = "darts-voix-v1";
const FILES = ["./", "./index.html", "./piper.js", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== VOIX).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || e.request.url.includes("api.php")) return;
  if (e.request.url.includes("/voix/")) {
    e.respondWith(caches.open(VOIX).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok && !e.request.url.endsWith(".onnx")) c.put(e.request, r.clone());   // .onnx is stored by piper.js itself
      return r;
    }))));
    return;
  }
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
});
