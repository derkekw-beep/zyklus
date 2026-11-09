// Offline-Cache für den App-Code. Einträge liegen NICHT hier, sondern im localStorage.
// Strategie: mit Internet immer die aktuelle Version vom Server holen (und im Cache ablegen),
// ohne Internet (oder wenn der Server länger als 4 Sekunden braucht) die Version aus dem Cache.
// So kommt jedes Update beim nächsten Öffnen an, und offline läuft die App trotzdem.
// Bei jeder Änderung an der App die Versionsnummer erhöhen (macht tools/deploy.mjs).
const VERSION = 'zyklus-v11';
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

async function fromNetwork(req) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    // per URL statt Request: Seitenaufrufe (mode "navigate") lassen sich nicht mit Optionen neu anfragen
    let res = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin', signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Safari nimmt bei Seitenaufrufen keine umgeleiteten Antworten aus dem Service Worker an
    if (res.redirected && req.mode === 'navigate') {
      res = new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
    }
    const copy = res.clone();
    caches.open(VERSION).then(c => c.put(keyOf(req.url), copy)).catch(() => {});
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fromCache(req) {
  const hit = await caches.match(keyOf(req.url), { ignoreSearch: true });
  if (hit) return hit;
  if (req.mode === 'navigate') {
    const page = (await caches.match(new URL('./index.html', self.location).href)) || (await caches.match(new URL('./', self.location).href));
    if (page) return page;
  }
  return Response.error();
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(fromNetwork(req).catch(() => fromCache(req)));
});
