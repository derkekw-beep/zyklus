// Mitteilungen (Web-Push). Grundsatz: Die Texte entstehen auf dem Gerät und bleiben dort.
// Ein kleiner Weck-Dienst erfährt nur ZEITPUNKTE („um 20:30 anstoßen“). Kommt der Anstoß, sucht der
// Service Worker den passenden Text aus dem lokalen Plan und zeigt ihn an.
import { DAY, toIso } from './cycle.js';
import { expectations } from './insights.js';

// Adresse des Weck-Dienstes und sein öffentlicher Schlüssel (steht so auch in index.html unter connect-src)
export const PUSH_URL = 'https://zyklus-push.zyklus-app-de.workers.dev';
export const VAPID_PUBLIC = 'BHp4S2eDApuakyfobARd6gua_76VYsLTAO_eQLl1p68nlMF6OWEzpXwwawloR-aEEwvGTuq-MdaFMDNF89yzGmU';

export const PUSH_DEFAULTS = {
  on: false,
  period: true,       // 2 Tage vorher und am erwarteten Tag
  late: true,         // einmal, wenn die Periode 3 Tage überfällig und nichts eingetragen ist
  expect: true,       // morgens, wenn laut „Was dich erwartet“ etwas Neues ansteht
  track: false,       // täglich zur gewählten Uhrzeit – nur wenn an dem Tag noch nichts eingetragen ist
  trackTime: 20 * 60 + 30,
  sleepTimer: true,   // wenn der Schlaf-Timer nach 10 Stunden noch läuft
  bedtime: false,     // täglich zur gewählten Uhrzeit
  bedTime: 22 * 60 + 30,
  fertile: false,     // Beginn der geschätzten fruchtbaren Tage
  discreet: false,    // neutrale Texte auf dem Sperrbildschirm
};
export const PUSH_BOOLS = ['on', 'period', 'late', 'expect', 'track', 'sleepTimer', 'bedtime', 'fertile', 'discreet'];
export const PUSH_TIMES = ['trackTime', 'bedTime'];
export const HORIZON = 30;        // so viele Tage im Voraus wird geplant (beim Öffnen der App wird neu geplant)
export const MAX_ITEMS = 100;
// So lange bleibt ein gerade fällig gewordener Eintrag noch im Plan. Sonst ginge er verloren, wenn die App
// ihren Plan genau in dem Augenblick neu schickt, in dem der Anstoß unterwegs ist.
export const GRACE = 10 * 60000;
const SENSITIVE = new Set(['period', 'late', 'expect', 'fertile']);
export const DISCREET = { title: 'Zyklus', body: 'Du hast eine Erinnerung – tippe zum Öffnen.' };

// Tageszahl + Minuten seit Mitternacht -> Zeitpunkt in Ortszeit (ms)
export function localTime(n, min) {
  const d = new Date(n * DAY);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Math.floor(min / 60), min % 60, 0, 0).getTime();
}
const fmtDay = n => new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'numeric' }).format(new Date(n * DAY));

// Der Plan: welche Mitteilung wann. data = gespeicherte Daten, a = analyze()-Ergebnis, today = Tageszahl,
// now = Zeitpunkt (ms), labelOf(cat, id) = Anzeigename einer Option (für „Was dich erwartet“).
// grace = so viele ms darf ein Eintrag schon vorbei sein (0 = nur Zukünftiges).
// Ergebnis: [{ t, kind, title, body }], nach Zeit sortiert.
export function buildSchedule(data, a, today, now, labelOf = (c, id) => id, grace = 0) {
  const st = (data && data.settings) || {};
  const p = { ...PUSH_DEFAULTS, ...(st.push || {}) };
  if (!p.on) return [];
  const days = (data && data.days) || {};
  const meta = (data && data.meta) || {};
  const items = [];
  const add = (t, kind, title, body) => items.push({ t, kind, title, body });

  if (a.hasData) {
    const next = a.nextStart;
    const spread = a.spread ? ` (± ${a.spread} ${a.spread === 1 ? 'Tag' : 'Tage'})` : '';
    if (p.period) {
      add(localTime(next - 2, 9 * 60), 'period', '🩸 Periode in etwa 2 Tagen', `Erwartet ab ${fmtDay(next)}${spread}.`);
      add(localTime(next, 8 * 60), 'period', '🩸 Periode heute erwartet', 'Schon da? Dann kurz in der App eintragen.');
    }
    // Sobald eine neue Periode eingetragen wird, verschiebt sich „next“ und diese Nachfrage entfällt von selbst
    if (p.late) add(localTime(next + 3, 10 * 60), 'late', 'Periode schon eingetragen?', `Sie war für ${fmtDay(next)} erwartet. Falls sie da war: kurz nachtragen.`);
    if (p.fertile && st.showFertile !== false && a.nextWindow && a.nextWindow.start > today) {
      add(localTime(a.nextWindow.start, 9 * 60), 'fertile', '🌱 Fruchtbare Tage beginnen (geschätzt)', 'Kalender-Schätzung – kein Verhütungsmittel.');
    }
    // „Was dich erwartet“: morgens an dem Tag, an dem etwas neu ins Fenster der nächsten 3 Tage rückt
    if (p.expect && !(a.due && !a.ongoing)) {
      const keysAt = d => new Map(expectations(data, a, d).items.map(i => [`${i.cat}:${i.id}`, i]));
      let prev = keysAt(today);
      for (let d = today + 1; d <= today + HORIZON && d < a.nextStart + 3; d++) {
        const cur = keysAt(d);
        const fresh = [...cur].filter(([k]) => !prev.has(k)).map(([, i]) => labelOf(i.cat, i.id)).filter(Boolean);
        if (fresh.length) add(localTime(d, 9 * 60), 'expect', '🌤️ Was dich erwartet', `In den nächsten Tagen hattest du oft: ${fresh.slice(0, 3).join(', ')}.`);
        prev = cur;
      }
    }
  }
  if (p.track) {
    for (let d = today; d <= today + HORIZON; d++) {
      if (d === today && days[toIso(d)]) continue; // heute ist schon etwas eingetragen
      const inPeriod = a.hasData && a.ongoing && d <= a.expectedEnd;
      add(localTime(d, p.trackTime), 'track', '📝 Tag tracken?', inPeriod ? 'Heute noch Periode? Ein Tipp genügt.' : 'Wie war dein Tag? Ein Tipp genügt.');
    }
  }
  if (p.bedtime) {
    for (let d = today; d <= today + HORIZON; d++) {
      if (d === today && meta.sleepStart) continue; // Timer läuft schon
      add(localTime(d, p.bedTime), 'bedtime', '🌙 Zeit fürs Bett', 'Beim Hinlegen „Schlafen gehen“ antippen.');
    }
  }
  if (p.sleepTimer && Number.isFinite(meta.sleepStart) && meta.sleepStart) {
    add(meta.sleepStart + 10 * 3600e3, 'sleep', '☀️ Schon wach?', 'Dein Schlaf-Timer läuft noch – „Aufgewacht“ antippen.');
  }
  const end = now + HORIZON * DAY;
  return items
    .filter(i => i.t > now - grace && i.t <= end)
    .sort((x, y) => x.t - y.t)
    .slice(0, MAX_ITEMS)
    .map(i => (p.discreet && SENSITIVE.has(i.kind) ? { ...i, ...DISCREET } : i));
}
// Was der Weck-Dienst bekommt: nur die Zeitpunkte (Sekunden, auf die Minute gerundet, ohne Doppelte)
export function scheduleTimes(items) {
  return [...new Set(items.map(i => Math.ceil(i.t / 60000) * 60))].sort((x, y) => x - y);
}

// ---------------------------------------------------------------------------------------------
// Ab hier Browser: Anmeldung, lokaler Plan (IndexedDB, damit ihn der Service Worker lesen kann), Abgleich
// ---------------------------------------------------------------------------------------------
export const pushSupported = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && 'PushManager' in window && 'Notification' in window;
export const pushConfigured = () => !!PUSH_URL;

function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('zyklus-push', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function storePlan(items) {
  const db = await idb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(items, 'items');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
// Welche Mitteilung wurde gerade angetippt? Liefert die Art einmal und löscht den Vermerk (höchstens 2 Minuten alt).
export async function takeOpened() {
  const db = await idb();
  const v = await new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    const st = tx.objectStore('kv');
    const q = st.get('open');
    q.onsuccess = () => { if (q.result) st.delete('open'); };
    tx.oncomplete = () => resolve(q.result || null);
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return v && typeof v.kind === 'string' && Date.now() - v.at < 120000 ? v.kind : null;
}
const b64ToBytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

// Erlaubnis einholen (muss direkt aus einem Tipp heraus aufgerufen werden) und beim Push-Dienst des Geräts anmelden
export async function subscribe(regPromise) {
  const perm = await Notification.requestPermission(); // erste Anweisung: läuft noch im Tipp, sonst lehnt iOS ab
  const reg = await regPromise;
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'Mitteilungen sind für diese App gesperrt – in den iPhone-Einstellungen unter „Mitteilungen“ erlauben' : 'Mitteilungen wurden nicht erlaubt');
  return (await reg.pushManager.getSubscription()) || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC) });
}
// text/plain: so braucht der Browser keine Vorab-Anfrage. Es gehen nur Geräte-Adresse und Zeitpunkte hinaus.
async function post(path, body) {
  const res = await fetch(PUSH_URL + path, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(body), credentials: 'omit', cache: 'no-store' });
  if (!res.ok) throw new Error(`Weck-Dienst antwortet nicht (${res.status})`);
}
export const sendTimes = (endpoint, times) => post('/sub', { endpoint, times });
export const removeDevice = endpoint => post('/unsub', { endpoint });
