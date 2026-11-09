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

export const EARLY_TOLERANCE = 7; // eine schwache Blutung so viele Tage vor dem erwarteten Termin ist noch "Periode"
const FLOW_RANK = { leicht: 1, mittel: 2, stark: 3, sehrstark: 4 };
const flowOf = e => Math.max(1, ...e.tags.period.map(f => FLOW_RANK[f] || 1));

// Schritt 1: zusammenhängende Blutungstage (Lücken bis MAX_GAP Tage) zu Blöcken zusammenfassen.
export function findEpisodes(days, today = Infinity) {
  const items = [];
  for (const [iso, e] of Object.entries(days || {})) {
    if (!isPeriodDay(e)) continue;
    const n = toNum(iso);
    if (n <= today) items.push([n, flowOf(e)]);
  }
  items.sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [n, f] of items) {
    const last = out[out.length - 1];
    if (last && n - last.end <= MAX_GAP + 1) {
      last.end = n;
      last.days++;
      last.maxFlow = Math.max(last.maxFlow, f);
    } else {
      out.push({ start: n, end: n, days: 1, maxFlow: f });
    }
  }
  return out;
}

// "schwacher" Block: höchstens 2 eingetragene Tage und nur "Leicht" – kann Periode oder Zwischenblutung sein
const isWeak = ep => ep.days <= 2 && ep.maxFlow <= 1;

// Schritt 2: Welche Blöcke beginnen einen neuen Zyklus? Alle anderen sind Zwischenblutungen: Sie stehen im
// Kalender, verschieben aber weder Zyklusbeginn noch Vorhersage und zählen nicht zur Periodendauer.
//  - Ein Block weniger als MIN_CYCLE Tage nach dem letzten Periodenbeginn ist immer Zwischenblutung.
//  - Ein schwacher Block ist Zwischenblutung, wenn innerhalb von MIN_CYCLE Tagen eine kräftigere Blutung
//    folgt, oder wenn er mehr als EARLY_TOLERANCE Tage vor dem erwarteten Termin liegt. Sobald dort mehr
//    Tage oder eine stärkere Blutung eingetragen werden, zählt er automatisch als Periode.
export function findPeriods(days, today = Infinity, defaultCycle = 28) {
  const eps = findEpisodes(days, today);
  const out = [];
  const lens = [];
  for (let i = 0; i < eps.length; i++) {
    const ep = eps[i];
    const cur = out[out.length - 1];
    let extra = !!cur && ep.start - cur.start < MIN_CYCLE;
    if (!extra && isWeak(ep)) {
      const stronger = eps.slice(i + 1).some(e => e.start - ep.start < MIN_CYCLE && !isWeak(e));
      const typical = lens.length ? median(lens) : defaultCycle;
      const tooEarly = !!cur && ep.start < cur.start + typical - EARLY_TOLERANCE;
      extra = stronger || tooEarly;
    }
    if (extra) {
      if (cur) cur.extra.push(ep);
      continue;
    }
    if (cur) lens.push(ep.start - cur.start);
    out.push({ start: ep.start, end: ep.end, days: ep.days, extra: [] });
  }
  return out;
}

// Lage eines Tages im Zyklus als Anteil 0..1 (0 = Periodenbeginn). null, wenn unbekannt.
export function cyclePhase(n, periods, avgLen) {
  let i = -1;
  for (let k = 0; k < periods.length; k++) {
    if (periods[k].start <= n) i = k;
    else break;
  }
  if (i < 0) return null;
  const len = i + 1 < periods.length ? periods[i + 1].start - periods[i].start : avgLen;
  const d = n - periods[i].start;
  if (d >= len || len > MAX_CYCLE) return null;
  return (d + 0.5) / len;
}

// Zyklusphase eines Tages: 'periode' | 'follikel' | 'eisprung' | 'luteal' | null (unbekannt).
// a = Ergebnis von analyze(). Eisprung = nächste Periode − Lutealphase, "eisprung" = fruchtbares Fenster.
export function phaseOf(n, a) {
  const ps = a.periods;
  let i = -1;
  for (let k = 0; k < ps.length; k++) {
    if (ps[k].start <= n) i = k;
    else break;
  }
  if (i < 0) return null;
  const p = ps[i];
  if (a.cycles[i] && a.cycles[i].note) return null; // Zyklus mit vermutlich fehlendem Eintrag: keine Aussage
  const next = i + 1 < ps.length ? ps[i + 1].start : a.nextStart;
  if (!(n < next)) return null; // überfällig: Phase unklar
  if (n <= p.end) return 'periode';
  const ov = Math.max(next - a.luteal, p.end + 1);
  if (n >= ov - 5 && n <= ov + 1) return 'eisprung';
  return n < ov - 5 ? 'follikel' : 'luteal';
}

// Typischer Zeitpunkt mehrerer Einträge als Kreis-Mittelwert: Tag 27, 28, 1, 2 ergibt "um den
// Periodenbeginn" und nicht "Tag 15". null, wenn zu wenige oder zu verstreut.
export function typicalPhase(fracs) {
  if (fracs.length < 2) return null;
  let x = 0, y = 0;
  for (const f of fracs) {
    x += Math.cos(2 * Math.PI * f);
    y += Math.sin(2 * Math.PI * f);
  }
  if (Math.hypot(x, y) / fracs.length < 0.5) return null;
  const m = Math.atan2(y, x) / (2 * Math.PI);
  return m < 0 ? m + 1 : m;
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
  const defaultCycle = clamp(Math.round(st.cycleLength) || 28, 20, 45);
  const periods = findPeriods(data && data.days, today, defaultCycle);
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
  // Vergessene Periode erkennen: ein Zyklus deutlich (über 60 %) länger als üblich. "Üblich" ist ab 3 Zyklen
  // der Median, bei 2 Zyklen der kürzere, bei einem einzigen die eingestellte Standardlänge.
  const plausible = cycles.filter(c => c.length >= MIN_CYCLE && c.length <= MAX_CYCLE).map(c => c.length);
  const ref = plausible.length >= 3 ? median(plausible)
    : plausible.length === 2 ? Math.min(...plausible)
      : plausible.length === 1 ? defaultCycle : null;
  for (const c of cycles) {
    if (c.length < MIN_CYCLE) c.note = 'sehr kurz – Zwischenblutung?';
    else if (c.length > MAX_CYCLE) c.note = 'sehr lang – fehlt ein Eintrag?';
    else if (ref !== null && c.length > ref * 1.6) c.note = 'fehlt vermutlich ein Eintrag';
  }
  const used = cycles.filter(c => !c.note).slice(-RECENT);
  for (const c of used) c.used = true;
  const lens = used.map(c => c.length);
  const cycleLen = lens.length ? Math.round(mean(lens)) : defaultCycle;
  const spread = lens.length >= 3 ? Math.round(stdev(lens)) : null;

  // Periodendauer: die letzte Periode nur mitzählen, wenn sie sicher vorbei ist (bis zu MAX_GAP
  // vergessene Tage gelten noch als "läuft"). Einzelne eingetragene Tage verfälschen den Schnitt nicht.
  const ongoing = !!last && last.end >= today - (MAX_GAP + 1);
  const finished = ongoing ? periods.slice(0, -1) : periods;
  const plens = finished.map(p => p.end - p.start + 1).filter(n => n >= 2 && n <= 14).slice(-RECENT);
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
    // bei sehr kurzen Zyklen nie in die Periode hinein schätzen
    const ov = Math.max(cycleStart + cycleLen - luteal, cycleStart + periodLen);
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
