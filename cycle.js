// Zyklus-Logik: reine Funktionen ohne DOM, damit sie auch in Node getestet werden können.
// Tage werden als ganze Zahlen gerechnet (Tage seit 1970-01-01, UTC), damit Sommerzeit nichts verschiebt.

export const DAY = 86400000;
export const MIN_CYCLE = 15;   // kürzere Abstände sind fast immer Zwischenblutung oder Fehleintrag
export const MAX_CYCLE = 60;
export const RECENT = 6;       // so viele letzte Zyklen fließen in den Schnitt ein
export const AHEAD = 6;        // so viele Zyklen werden im Kalender vorausgesagt

export function toNum(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
}
export function toIso(n) {
  return new Date(n * DAY).toISOString().slice(0, 10);
}
export function todayNum(now = new Date()) {
  return Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY);
}
export function isValidIso(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && toIso(toNum(s)) === s;
}

// Periodentag = irgendeine Blutungsstärke unter "Periode". Schmierblutung zählt bewusst nicht.
export function isPeriodDay(e) {
  return !!e && !!e.tags && Array.isArray(e.tags.period) && e.tags.period.length > 0;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
export function median(a) {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function stdev(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

export const MAX_GAP = 2;     // so viele vergessene Tage mitten in einer Periode trennen sie nicht

// Schritt 1: zusammenhängende Blutungstage (Lücken bis MAX_GAP Tage) zu Blöcken zusammenfassen.
export function findEpisodes(days, today = Infinity) {
  const nums = [];
  for (const [iso, e] of Object.entries(days || {})) {
    if (!isPeriodDay(e)) continue;
    const n = toNum(iso);
    if (n <= today) nums.push(n);
  }
  nums.sort((a, b) => a - b);
  const out = [];
  for (const n of nums) {
    const last = out[out.length - 1];
    if (last && n - last.end <= MAX_GAP + 1) last.end = n;
    else out.push({ start: n, end: n });
  }
  return out;
}

// Schritt 2: Ein Block startet nur dann einen neuen Zyklus, wenn er mindestens MIN_CYCLE Tage nach dem
// letzten Periodenbeginn liegt. Frühere Blutungen sind Zwischenblutungen: Sie stehen im Kalender,
// verschieben aber weder Zyklusbeginn noch Vorhersage und zählen nicht zur Periodendauer.
export function findPeriods(days, today = Infinity) {
  const out = [];
  for (const ep of findEpisodes(days, today)) {
    const cur = out[out.length - 1];
    if (cur && ep.start - cur.start < MIN_CYCLE) cur.extra.push(ep);
    else out.push({ start: ep.start, end: ep.end, extra: [] });
  }
  return out;
}

export function cycleDayOf(n, periods) {
  let s = null;
  for (const p of periods) {
    if (p.start <= n) s = p.start;
    else break;
  }
  return s === null ? null : n - s + 1;
}

export function analyze(data, today) {
  const st = (data && data.settings) || {};
  const luteal = clamp(Math.round(st.lutealLength) || 14, 10, 16);
  const periods = findPeriods(data && data.days, today);
  const last = periods.length ? periods[periods.length - 1] : null;

  // Zyklen = Abstand von Periodenbeginn zu Periodenbeginn
  const cycles = [];
  for (let i = 0; i + 1 < periods.length; i++) {
    cycles.push({
      start: periods[i].start,
      length: periods[i + 1].start - periods[i].start,
      periodDays: periods[i].end - periods[i].start + 1,
      extraDays: periods[i].extra.reduce((s, e) => s + e.end - e.start + 1, 0),
      used: false,
      note: '',
    });
  }
  const plausible = cycles.filter(c => c.length >= MIN_CYCLE && c.length <= MAX_CYCLE).map(c => c.length);
  const med = plausible.length >= 3 ? median(plausible) : null;
  for (const c of cycles) {
    if (c.length < MIN_CYCLE) c.note = 'sehr kurz – Zwischenblutung?';
    else if (c.length > MAX_CYCLE) c.note = 'sehr lang – fehlt ein Eintrag?';
    else if (med !== null && c.length > med * 1.6) c.note = 'fehlt vermutlich ein Eintrag';
  }
  const used = cycles.filter(c => !c.note).slice(-RECENT);
  for (const c of used) c.used = true;
  const lens = used.map(c => c.length);
  const cycleLen = lens.length ? Math.round(mean(lens)) : clamp(Math.round(st.cycleLength) || 28, 20, 45);
  const spread = lens.length >= 3 ? Math.round(stdev(lens)) : null;

  // Periodendauer: die letzte Periode nur mitzählen, wenn sie sicher vorbei ist
  const ongoing = !!last && last.end >= today - 1;
  const finished = ongoing ? periods.slice(0, -1) : periods;
  const plens = finished.map(p => p.end - p.start + 1).filter(n => n <= 14).slice(-RECENT);
  const periodLen = plens.length ? Math.round(mean(plens)) : clamp(Math.round(st.periodLength) || 5, 2, 10);

  const res = {
    periods, cycles, last, luteal, cycleLen, periodLen, spread,
    shortest: lens.length ? Math.min(...lens) : null,
    longest: lens.length ? Math.max(...lens) : null,
    usedCycles: lens.length,
    usedPeriods: plens.length,
    predicted: new Set(),
    fertile: new Set(),
    ovulation: new Set(),
    hasData: !!last,
  };
  if (!last) return res;

  const nextStart = last.start + cycleLen;
  const overdue = today > nextStart ? today - nextStart : 0;
  const base = Math.max(nextStart, today); // überfällig: ab heute jederzeit möglich

  // Rest einer gerade laufenden Periode
  if (ongoing) {
    for (let d = Math.max(last.end + 1, today); d <= last.start + periodLen - 1; d++) res.predicted.add(d);
  }
  for (let k = 0; k < AHEAD; k++) {
    const s = base + k * cycleLen;
    for (let d = s; d < s + periodLen; d++) res.predicted.add(d);
  }

  // Eisprung ≈ nächste Periode minus Lutealphase, fruchtbar 5 Tage davor bis 1 Tag danach
  const windowFor = cycleStart => {
    const ov = cycleStart + cycleLen - luteal;
    return { start: ov - 5, end: ov + 1, ov };
  };
  const windows = [windowFor(last.start)];
  for (let k = 0; k < AHEAD; k++) windows.push(windowFor(base + k * cycleLen));
  for (const w of windows) {
    for (let d = w.start; d <= w.end; d++) res.fertile.add(d);
    res.ovulation.add(w.ov);
  }

  Object.assign(res, {
    nextStart,
    base,
    overdue,
    ongoing,
    inPeriod: today >= last.start && today <= last.end,
    expectedEnd: Math.max(last.end, last.start + periodLen - 1),
    cycleDay: today - last.start + 1,
    daysUntil: base - today,
    curWindow: windows[0],
    nextWindow: windows.find(w => w.end >= today) || null,
  });
  return res;
}
