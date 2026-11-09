// Offline-Cache für den App-Code. Einträge liegen NICHT hier, sondern im localStorage.
// Strategie: Die App kommt immer komplett aus dem Cache EINER Version – nie halb alt, halb neu.
// Eine neue Version wird beim Installieren vollständig geladen (sonst bleibt die alte aktiv),
// danach lädt sich die App selbst neu. Offline läuft sie aus dem Cache.
// Bei jeder Änderung an der App die Versionsnummer erhöhen (macht tools/deploy.mjs).
const VERSION = 'zyklus-v18';
const FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './cycle.js',
  './tracking.js',
  './sleep.js',
  './notes.js',
  './importer.js',
  './ics.js',
  './insights.js',
  './kalender.html',
  './kalender.js',
  './boot.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-Schlüssel ohne ?…, damit z. B. ./?t=1 und ./ dasselbe sind
const keyOf = url => {
  const u = new URL(url);
  u.search = '';
  u.hash = '';
  return u.href;
};

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(keyOf(req.url));
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const page = (await cache.match(new URL('./index.html', self.location).href)) || (await cache.match(new URL('./', self.location).href));
      if (page) return page;
    }
    try {
      return await fetch(req);
    } catch {
      return Response.error();
    }
  })());
});
