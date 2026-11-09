// Schlaf-Rechnung: reine Funktionen ohne DOM, damit sie in Node getestet werden können.
// Uhrzeiten sind Minuten seit Mitternacht (0–1439). Eine Nacht gehört zum Tag des Aufwachens.

export const DAY_MIN = 1440;
export const MIN_SLEEP = 15;      // kürzer ist kein sinnvoller Eintrag
export const MAX_SLEEP = 1200;    // 20 Stunden

export function parseTime(s) {
  if (typeof s !== 'string') return null;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  return h <= 23 && mi <= 59 ? h * 60 + mi : null;
}
export function fmtTime(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
export const isTime = v => Number.isInteger(v) && v >= 0 && v < DAY_MIN;

// Dauer zwischen Einschlafen und Aufwachen, auch über Mitternacht. null, wenn unplausibel.
export function durationFromTimes(bed, wake) {
  if (!isTime(bed) || !isTime(wake)) return null;
  const d = (wake - bed + DAY_MIN) % DAY_MIN;
  return d >= MIN_SLEEP && d <= MAX_SLEEP ? d : null;
}

// Kreis-Mittelwert für Uhrzeiten: 23:30 und 00:30 ergeben 00:00 (nicht 12:00).
// sd = Kreis-Standardabweichung in Minuten (wie stark die Uhrzeiten schwanken).
export function circularTime(mins) {
  if (!mins.length) return null;
  let x = 0, y = 0;
  for (const m of mins) {
    const a = (2 * Math.PI * m) / DAY_MIN;
    x += Math.cos(a);
    y += Math.sin(a);
  }
  x /= mins.length;
  y /= mins.length;
  const r = Math.min(1, Math.hypot(x, y));
  let mean = (Math.atan2(y, x) / (2 * Math.PI)) * DAY_MIN;
  if (mean < 0) mean += DAY_MIN;
  const sd = r > 1e-9 ? (Math.sqrt(-2 * Math.log(r)) / (2 * Math.PI)) * DAY_MIN : Infinity;
  return { mean: Math.round(mean) % DAY_MIN, sd: Math.max(0, Math.round(sd)) };
}

export function regularity(sd) {
  if (sd <= 30) return 'sehr regelmäßig';
  if (sd <= 60) return 'regelmäßig';
  if (sd <= 90) return 'etwas unregelmäßig';
  return 'unregelmäßig';
}

// nights: [{ n, sleep, bed, wake }] mit n = Tag des Aufwachens (Tageszahl), sleep in Minuten.
// goal: Schlafziel in Minuten.
export function sleepStats(nights, today, goal = 480) {
  const within = d => nights.filter(x => x.n > today - d && x.n <= today);
  const withSleep = a => a.filter(x => x.sleep);
  const avg = a => (a.length ? Math.round(a.reduce((s, x) => s + x.sleep, 0) / a.length) : null);
  const w7 = withSleep(within(7));
  const w30 = withSleep(within(30));
  // Schlafdefizit der letzten 7 Tage: Summe aus (Ziel − Schlaf) der eingetragenen Nächte.
  // Mehr Schlaf in einer Nacht gleicht weniger in einer anderen aus, unter 0 geht es nicht.
  const debt7 = w7.length ? Math.max(0, w7.reduce((s, x) => s + (goal - x.sleep), 0)) : null;
  const recent = within(14);
  const beds = recent.map(x => x.bed).filter(isTime);
  const wakes = recent.map(x => x.wake).filter(isTime);
  return {
    avg7: avg(w7), n7: w7.length,
    avg30: avg(w30), n30: w30.length,
    debt7,
    goalMet7: w7.filter(x => x.sleep >= goal - 15).length,
    bed: beds.length >= 3 ? circularTime(beds) : null,
    wake: wakes.length >= 3 ? circularTime(wakes) : null,
  };
}

// Schlaftabletten. nights: [{ n, sleep, bed, pill, pillAt, rested }]
//   pill: true/false (nur Nächte, für die etwas eingetragen ist), pillAt: Uhrzeit der Einnahme oder null,
//   rested: true = erholt aufgewacht, false = müde aufgewacht, null = nichts dazu eingetragen.
// Vergleiche erst ab 2 Nächten je Seite, sonst null (zu wenig für eine Aussage).
export function pillStats(nights, today) {
  const within = d => nights.filter(x => x.n > today - d && x.n <= today);
  const avgSleep = a => {
    const s = a.filter(x => x.sleep);
    return s.length >= 2 ? Math.round(s.reduce((t, x) => t + x.sleep, 0) / s.length) : null;
  };
  const restedShare = a => {
    const q = a.filter(x => x.rested === true || x.rested === false);
    return q.length >= 2 ? Math.round((100 * q.filter(x => x.rested).length) / q.length) : null;
  };
  const withP = nights.filter(x => x.pill);
  const without = nights.filter(x => !x.pill);
  const gaps = withP
    .filter(x => isTime(x.pillAt) && isTime(x.bed))
    .map(x => (x.bed - x.pillAt + DAY_MIN) % DAY_MIN)
    .filter(g => g <= 240);
  return {
    pills7: within(7).filter(x => x.pill).length, nights7: within(7).length,
    pills30: within(30).filter(x => x.pill).length, nights30: within(30).length,
    avgWith: avgSleep(withP), avgWithout: avgSleep(without),
    restedWith: restedShare(withP), restedWithout: restedShare(without),
    gapToBed: gaps.length >= 2 ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : null,
    pillTime: withP.filter(x => isTime(x.pillAt)).length >= 3 ? circularTime(withP.map(x => x.pillAt).filter(isTime)) : null,
  };
}

// Anteil der Nächte mit Tablette je Gruppe (z. B. Zyklusphase), ab minCount Nächten je Gruppe.
export function pillShareBy(nights, groupOf, minCount = 3) {
  const acc = {};
  for (const x of nights) {
    const g = groupOf(x.n);
    if (!g) continue;
    const a = (acc[g] ||= { n: 0, p: 0 });
    a.n++;
    if (x.pill) a.p++;
  }
  const out = {};
  for (const [g, a] of Object.entries(acc)) if (a.n >= minCount) out[g] = { share: Math.round((100 * a.p) / a.n), n: a.n };
  return out;
}

// Durchschnitt je Gruppe (z. B. Zyklusphase). groupOf(n) liefert den Gruppennamen oder null.
export function averageBy(nights, groupOf, minCount = 2) {
  const acc = {};
  for (const x of nights) {
    if (!x.sleep) continue;
    const g = groupOf(x.n);
    if (!g) continue;
    (acc[g] ||= []).push(x.sleep);
  }
  const out = {};
  for (const [g, a] of Object.entries(acc)) {
    if (a.length >= minCount) out[g] = { avg: Math.round(a.reduce((s, v) => s + v, 0) / a.length), n: a.length };
  }
  return out;
}
