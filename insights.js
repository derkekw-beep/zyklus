// „Was dich erwartet“: Was hast du in früheren Zyklen an genau dieser Stelle des Zyklus eingetragen?
// Reine Rechnung ohne DOM, damit sie in Node getestet werden kann. Grundsätze:
//  - Verglichen wird nur mit vollständigen, unauffälligen Zyklen (keine vermutlich vergessene Periode).
//  - Die Stelle im Zyklus wird so bestimmt wie im Körper: in der ersten Zyklushälfte vom Periodenbeginn
//    aus gezählt, in der zweiten rückwärts von der nächsten Periode (die Lutealphase ist recht konstant).
//  - Ein Zyklus zählt nur, wenn rund um diese Stelle überhaupt Beschwerden oder Stimmungen eingetragen
//    sind – sonst hieße „nichts eingetragen“ nicht „nichts gehabt“.
//  - Gezeigt wird nur, was an dieser Stelle deutlich häufiger vorkommt als sonst im Zyklus. Wer jeden
//    Tag „müde“ einträgt, bekommt das nicht als Vorhersage.
import { toIso, MIN_CYCLE, MAX_CYCLE } from './cycle.js';

export const DEFAULTS = {
  days: 3,          // heute und die zwei Tage danach
  tolerance: 1,     // ± 1 Tag in früheren Zyklen (die Vorhersage des laufenden Zyklus ist nie ganz genau)
  maxCycles: 12,    // nur die letzten 12 passenden Zyklen
  minCycles: 3,     // so viele Zyklen mit Einträgen an dieser Stelle braucht es mindestens
  minHits: 3,       // so oft muss es dort vorgekommen sein
  minShare: 0.5,    // in mindestens der Hälfte dieser Zyklen
  minLift: 1.5,     // und dort mindestens 1,5-mal so häufig wie im Schnitt des Zyklus
  max: 4,           // höchstens so viele Einträge auf der Karte
};

// Keine Beschwerde oder Stimmung, die man „erwarten“ könnte: Periode (wird schon vorhergesagt),
// Antibabypille, Sex (außer Libido) und die „alles normal“-Optionen.
const SKIP_CATS = new Set(['period', 'bc']);
const NEUTRAL = new Set(['pain:frei', 'digest:gut', 'discharge:keinen', 'energy:ok', 'skin:ok', 'hair:normal']);
const SEX_KEEP = new Set(['libido_hoch', 'libido_niedrig']);
export function predictable(cat, id) {
  if (SKIP_CATS.has(cat)) return false;
  if (cat === 'sex') return SEX_KEEP.has(id);
  return !NEUTRAL.has(`${cat}:${id}`);
}
function keysOf(e) {
  const out = [];
  if (!e) return out;
  for (const [cat, ids] of Object.entries(e.tags || {})) for (const id of ids) if (predictable(cat, id)) out.push(`${cat}:${id}`);
  for (const t of e.custom || []) out.push(`custom:${t}`);
  return out;
}

// Welche Tage eines früheren Zyklus c entsprechen den nächsten H Tagen ab heute? (ohne Toleranz)
// Tage ab der erwarteten Periode gehören zur Periode, die auf c folgte (c.start + c.length + …) – so bleibt
// das Fenster zusammenhängend, auch wenn es über den Periodenbeginn reicht.
export function matchingDays(c, a, today, H) {
  const out = [];
  const end = c.start + c.length; // Beginn der Periode nach diesem Zyklus
  if (a.due && !a.ongoing) {
    // Periode heute fällig oder überfällig: „wenn sie kommt“ = ihre ersten Tage
    for (let k = 0; k < H; k++) out.push(end + k);
    return out;
  }
  for (let u = today; u < today + H; u++) {
    if (u >= a.nextStart) { out.push(end + (u - a.nextStart)); continue; }       // schon in der nächsten Periode
    const before = a.nextStart - u; // Tage bis zur nächsten Periode
    if (before <= a.luteal) out.push(end - before);                              // zweite Hälfte: rückwärts
    else if (u - a.last.start < c.length) out.push(c.start + (u - a.last.start)); // erste Hälfte: vorwärts
  }
  return out;
}

// data = gespeicherte Daten ({ days }), a = analyze()-Ergebnis, today = Tageszahl
// Ergebnis: { mode: 'next' | 'period', cycles, items: [{ cat, id, k, n, share, lift }] }
export function expectations(data, a, today, opt = {}) {
  const o = { ...DEFAULTS, ...opt };
  const res = { mode: a.hasData && a.due && !a.ongoing ? 'period' : 'next', cycles: 0, items: [] };
  if (!a.hasData) return res;
  const days = (data && data.days) || {};
  const keysAt = n => keysOf(days[toIso(n)]);
  const past = a.cycles.filter(c => !c.note && c.length >= MIN_CYCLE && c.length <= MAX_CYCLE).slice(-o.maxCycles);

  const st = new Map(); // Schlüssel -> { k: Zyklen mit Treffer, inWin: Tage im Fenster, total: Tage insgesamt }
  const get = key => st.get(key) || st.set(key, { k: 0, inWin: 0, total: 0 }).get(key);
  let n = 0, winDays = 0, allDays = 0;
  for (const c of past) {
    const core = matchingDays(c, a, today, o.days);
    if (!core.length) continue;
    const lo = Math.min(...core) - o.tolerance, hi = Math.max(...core) + o.tolerance;
    let active = false; // wurde rund um diese Stelle überhaupt etwas getrackt? (Fenster ± 2 Tage)
    for (let d = lo - 2; d <= hi + 2 && !active; d++) if (keysAt(d).length) active = true;
    if (!active) continue;
    n++;
    // Vergleichsbasis: der ganze Zyklus, plus Fenstertage, die knapp davor liegen
    const from = Math.min(c.start, lo), to = Math.max(c.start + c.length - 1, hi);
    allDays += to - from + 1;
    winDays += hi - lo + 1;
    const hit = new Set();
    for (let d = from; d <= to; d++) {
      const inWin = d >= lo && d <= hi;
      for (const key of keysAt(d)) {
        const s = get(key);
        s.total++;
        if (inWin) { s.inWin++; hit.add(key); }
      }
    }
    for (const key of hit) get(key).k++;
  }
  res.cycles = n;
  if (n < o.minCycles) return res;
  for (const [key, s] of st) {
    if (s.k < o.minHits || s.k / n < o.minShare) continue;
    const lift = (s.inWin / winDays) / (s.total / allDays);
    if (lift < o.minLift) continue;
    const i = key.indexOf(':');
    res.items.push({ cat: key.slice(0, i), id: key.slice(i + 1), k: s.k, n, share: s.k / n, lift });
  }
  res.items.sort((x, y) => y.share - x.share || y.lift - x.lift || y.k - x.k);
  res.items = res.items.slice(0, o.max);
  return res;
}
