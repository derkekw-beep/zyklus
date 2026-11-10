// Offline-Cache für den App-Code. Einträge liegen NICHT hier, sondern im localStorage.
// Strategie: Die App kommt immer komplett aus dem Cache EINER Version – nie halb alt, halb neu.
// Eine neue Version wird beim Installieren vollständig geladen (sonst bleibt die alte aktiv),
// danach lädt sich die App selbst neu. Offline läuft sie aus dem Cache.
// Bei jeder Änderung an der App die Versionsnummer erhöhen (macht tools/deploy.mjs).
const VERSION = 'zyklus-v24';
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
  './push.js',
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

// --- Mitteilungen ---------------------------------------------------------------------------
// Der Anstoß vom Weck-Dienst ist leer. Welcher Text jetzt dran ist, steht im lokalen Plan, den die App
// in der IndexedDB ablegt (app/push.js). Es wird immer etwas angezeigt – das verlangt iOS.
const kvOpen = () => new Promise((resolve, reject) => {
  const r = indexedDB.open('zyklus-push', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});
const kvGet = (db, key) => new Promise((resolve, reject) => {
  const q = db.transaction('kv').objectStore('kv').get(key);
  q.onsuccess = () => resolve(q.result);
  q.onerror = () => reject(q.error);
});
const kvPut = (db, key, value) => new Promise((resolve, reject) => {
  const tx = db.transaction('kv', 'readwrite');
  tx.objectStore('kv').put(value, key);
  tx.oncomplete = resolve;
  tx.onerror = () => reject(tx.error);
});
const STALE = 6 * 3600e3; // älter als 6 Stunden wird nicht mehr gezeigt
const EARLY = 90e3;       // der Anstoß darf bis zu 90 Sekunden vor der Zeit kommen

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let due = [];
    try {
      const db = await kvOpen();
      const now = Date.now();
      const items = (await kvGet(db, 'items')) || [];
      const shown = (await kvGet(db, 'shown')) || 0;
      due = items.filter(i => i && i.t > shown && i.t <= now + EARLY && i.t >= now - STALE);
      await kvPut(db, 'shown', now + EARLY);
      db.close();
    } catch { /* dann eben der neutrale Text */ }
    if (!due.length) due = [{ kind: 'info', title: 'Zyklus', body: 'Du hast eine Erinnerung – tippe zum Öffnen.' }];
    for (const i of due) {
      await self.registration.showNotification(String(i.title || 'Zyklus'), {
        body: String(i.body || ''), tag: `zyklus-${i.kind}`, icon: './icons/icon-192.png', badge: './icons/icon-192.png', data: { kind: i.kind },
      });
    }
  })());
});

self.addEventListener('notificationclick', event => {
  const kind = event.notification.data && event.notification.data.kind;
  event.notification.close();
  event.waitUntil((async () => {
    // Angetippte Mitteilung merken: iOS öffnet die App oft nur, ohne ihr etwas mitzuteilen
    try { const db = await kvOpen(); await kvPut(db, 'open', { kind, at: Date.now() }); db.close(); } catch { /* dann öffnet sich nur die App */ }
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if ('focus' in c) { await c.focus(); c.postMessage({ zyklus: kind }); return; }
    }
    await self.clients.openWindow('./');
  })());
});
