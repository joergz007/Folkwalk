/* Fogwalk – Service Worker.
   Nur nötig, wenn die App über http(s) gehostet wird: er legt die Seite selbst
   in den Cache, damit sie auch ohne Netz startet. Die Kartenkacheln verwaltet
   die App getrennt davon in ihrer eigenen IndexedDB. */
const CACHE = "nebelpfad-v1";
const SHELL = ["./", "./index.html"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // Kacheln/Overpass macht die App selbst

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match("./index.html", { ignoreSearch: true }));
    })
  );
});

/* Tippt man auf eine Meldung, soll das Spiel nach vorne kommen –
   und zwar der schon offene Tab, nicht ein zweiter. */
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list){
        if (c.url.indexOf(self.registration.scope) === 0 && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});
