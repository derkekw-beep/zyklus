import * as C from './cycle.js';
import { CATS, CHIP_CATS, CAT, OPT, NOTE_MAX, TAG_MAX, choose, toggle, cleanTags, favorites, copyTags, copyPreview, searchEntries } from './tracking.js';
import * as S from './sleep.js';
import { NOTES, APP_VERSION, FEATURES } from './notes.js';
import { parseClue, looksLikeClue, readImportFile, mergeDays } from './importer.js';
import { buildIcs, reminderEvents } from './ics.js';
import { expectations, heatmap, yearReview } from './insights.js';
import { PUSH_DEFAULTS, PUSH_BOOLS, PUSH_TIMES, buildSchedule, scheduleTimes, pushSupported, pushConfigured, storePlan, subscribe, sendTimes, removeDevice } from './push.js';

// ---------------------------------------------------------------------------
// Grundlagen
// ---------------------------------------------------------------------------
const KEY = 'zyklus-daten';
const PREFIX = new Set(['period', 'spot', 'energy', 'discharge', 'skin', 'digest']);
const TITLES = { home: 'Hallo', cal: 'Kalender', stats: 'Statistik', settings: 'Einstellungen' };
const VIEWS = { home: '#view-home', cal: '#view-cal', stats: '#view-stats', settings: '#view-settings' };
const RANGES = { cycleLength: [20, 45, 28], periodLength: [2, 10, 5], lutealLength: [10, 16, 14], sleepGoal: [300, 660, 480] };
const STEPS = { sleepGoal: 15 };
const PHASES = [['periode', 'Periode', '🩸'], ['follikel', 'Follikelphase', '🌱'], ['eisprung', 'Fruchtbare Tage', '🥚'], ['luteal', 'Lutealphase', '🌙']];
const PILL_MAX = 40;
// Symbol je Kategorie: für die Sprungleiste und die Überschriften im Tracking
const ICON = { period: '🩸', spot: '🟤', feel: '🙂', pain: '⚡', pms: '☁️', sleepq: '🌙', sleep: '🛌', sex: '❤️', bc: '💊', energy: '🔋', note: '📝', custom: '🏷️', mind: '🧠', digest: '🍽️', discharge: '💧', skin: '✨', hair: '💇', weight: '⚖️' };
// Ein- und ausschaltbare Bereiche (unter „Mehr“ → Anzeige): Schlüssel, Titel, Erklärung
const SHOW = [
  ['expect', 'Was dich erwartet', 'Karte auf „Heute“ mit dem, was du an dieser Stelle im Zyklus oft hattest.'],
  ['week', 'Die nächsten 7 Tage', 'Leiste unter dem Zyklus-Rad.'],
  ['sleep', 'Schlaf-Karte', '„Schlafen gehen“ und „Wie hast du geschlafen?“ auf „Heute“.'],
  ['quick', 'Schnell eintragen', '„Wie gestern“ und deine Favoriten oben im Tracking.'],
  ['jump', 'Sprungleiste', 'Reihe mit allen Kategorien oben im Tracking.'],
];
const FAV_DAYS = 90; // Favoriten: was in den letzten 90 Tagen am häufigsten eingetragen wurde
const FUTURE_MSG = 'Für die Zukunft gibt es nur die Vorhersage';
// Farbthemen: id, Name, Akzent + Farbton (für die Auswahl), Hintergrund hell / dunkel (Statusleiste)
const THEMES = [
  ['rose', 'Rosé', '#c8336a', '#fde7ee', '#fbf7f4', '#161114'],
  ['lavendel', 'Lavendel', '#7446c2', '#ece4fc', '#f8f6fc', '#14121b'],
  ['salbei', 'Salbei', '#3d7656', '#e1efdc', '#f5f8f3', '#101511'],
  ['pfirsich', 'Pfirsich', '#b84a24', '#fde3d3', '#fdf7f2', '#17110e'],
  ['ozean', 'Ozean', '#2563ad', '#dde9f9', '#f4f7fb', '#0e1218'],
];
const THEME = Object.fromEntries(THEMES.map(t => [t[0], t]));

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const D = n => new Date(n * C.DAY);
const fmt = o => { const f = new Intl.DateTimeFormat('de-DE', { timeZone: 'UTC', ...o }); return n => f.format(D(n)); };
const fLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const fTitle = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const fWdTitle = fmt({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fShort = fmt({ weekday: 'short', day: 'numeric', month: 'numeric' });
const fDM = fmt({ day: 'numeric', month: 'numeric' });
const fDMY = fmt({ day: '2-digit', month: '2-digit', year: 'numeric' });
const fMonth = fmt({ month: 'long', year: 'numeric' });
const WD1 = ['M', 'D', 'M', 'D', 'F', 'S', 'S'];
const WD2 = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const weekdayIdx = n => (D(n).getUTCDay() + 6) % 7;
const fmtSleep = m => (m < 60 ? `${m} Min.` : `${Math.floor(m / 60)} Std.${m % 60 ? ` ${m % 60} Min.` : ''}`);
const fmtDiff = m => `${m >= 0 ? '+' : '−'}${Math.abs(m) >= 60 ? fmtSleep(Math.abs(m)) : `${Math.abs(m)} Min.`}`;
const nowMin = (d = new Date()) => d.getHours() * 60 + d.getMinutes();
function greeting(d = new Date()) {
  const h = d.getHours();
  if (h >= 5 && h < 11) return 'Guten Morgen';
  if (h >= 11 && h < 18) return 'Guten Tag';
  if (h >= 18 && h < 22) return 'Guten Abend';
  return 'Gute Nacht';
}
const homeTitle = () => `${greeting()}${state.settings.name ? `, ${state.settings.name}` : ''}`;
const fmtKg = w => `${w.toLocaleString('de-DE', { maximumFractionDigits: 1 })} kg`;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

// ---------------------------------------------------------------------------
// Daten: nur localStorage auf diesem Gerät
// ---------------------------------------------------------------------------
function freshData() {
  return {
    app: 'zyklus',
    version: 1,
    days: {},
    settings: { name: '', cycleLength: 28, periodLength: 5, lutealLength: 14, sleepGoal: 480, showFertile: true, hiddenCats: [], customTags: [], pillName: '', zoomLock: true, theme: 'rose', push: { ...PUSH_DEFAULTS }, show: Object.fromEntries(SHOW.map(x => [x[0], true])),
      remind: { period: true, fertile: false, pill: false, pillTime: 21 * 60, track: false, trackTime: 20 * 60 + 30 } },
    meta: { created: new Date().toISOString(), lastBackup: null, seenVersion: null, sleepStart: null, sleepPill: false, sleepPillAt: null, pillSince: C.toIso(C.todayNum()), icsExport: null },
  };
}
// sleep: Minuten, bed/wake: Uhrzeit (Min. seit Mitternacht) der Nacht VOR diesem Tag, pill: Schlaftablette in dieser Nacht
const blankEntry = () => ({ tags: {}, custom: [], sleep: null, bed: null, wake: null, pill: null, weight: null, note: '' });
const hasSleepInfo = e => !!e.sleep || e.bed !== null || e.wake !== null || !!e.pill;
const hasContent = e => Object.keys(e.tags).length > 0 || e.custom.length > 0 || hasSleepInfo(e) || !!e.weight || !!e.note.trim();
const hasExtra = e => Object.keys(e.tags).some(k => k !== 'period') || e.custom.length > 0 || hasSleepInfo(e) || !!e.weight || !!e.note.trim();

function strList(v, maxLen, maxCount) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const x of v) {
    if (typeof x !== 'string') continue;
    const t = x.trim().replace(/\s+/g, ' ').slice(0, maxLen);
    if (t && !out.some(o => o.toLowerCase() === t.toLowerCase())) out.push(t);
    if (out.length >= maxCount) break;
  }
  return out;
}

function cleanEntry(v) {
  if (!v || typeof v !== 'object') return null;
  const e = blankEntry();
  e.tags = cleanTags(v.tags);
  e.custom = strList(v.custom, 30, TAG_MAX);
  const sl = Number(v.sleep);
  if (v.sleep != null && Number.isFinite(sl) && sl > 0 && sl <= 1440) e.sleep = Math.round(sl);
  if (S.isTime(v.bed)) e.bed = v.bed;
  if (S.isTime(v.wake)) e.wake = v.wake;
  // Sind beide Uhrzeiten da, gilt die daraus berechnete Dauer (sonst passen Zeiten und Dauer nicht zusammen)
  if (e.bed !== null && e.wake !== null) {
    const calc = S.durationFromTimes(e.bed, e.wake);
    // Eine gemessene Dauer (Timer) bleibt, solange sie höchstens 1 Std. von den Uhrzeiten abweicht –
    // so stimmt auch die Nacht der Zeitumstellung. Sonst gelten die Uhrzeiten.
    if (calc === null) e.sleep = null;
    else if (!e.sleep || Math.abs(e.sleep - calc) > 60) e.sleep = calc;
  }
  if (v.pill && typeof v.pill === 'object') {
    e.pill = {
      at: S.isTime(v.pill.at) ? v.pill.at : null,
      name: typeof v.pill.name === 'string' ? v.pill.name.trim().slice(0, PILL_MAX) : '',
    };
  }
  const w = Number(v.weight);
  if (v.weight != null && Number.isFinite(w) && w >= 20 && w <= 300) e.weight = Math.round(w * 10) / 10;
  if (typeof v.note === 'string') e.note = v.note.slice(0, NOTE_MAX);
  return hasContent(e) ? e : null;
}

function normalize(o) {
  const d = freshData();
  if (!o || typeof o !== 'object') return d;
  const s = o.settings && typeof o.settings === 'object' ? o.settings : {};
  for (const [k, [lo, hi]] of Object.entries(RANGES)) {
    const n = Math.round(Number(s[k]));
    if (Number.isFinite(n)) d.settings[k] = Math.min(hi, Math.max(lo, n));
  }
  if (typeof s.showFertile === 'boolean') d.settings.showFertile = s.showFertile;
  if (typeof s.zoomLock === 'boolean') d.settings.zoomLock = s.zoomLock;
  if (typeof s.theme === 'string' && THEME[s.theme]) d.settings.theme = s.theme;
  if (s.show && typeof s.show === 'object') for (const [k] of SHOW) if (typeof s.show[k] === 'boolean') d.settings.show[k] = s.show[k];
  if (s.push && typeof s.push === 'object') {
    for (const k of PUSH_BOOLS) if (typeof s.push[k] === 'boolean') d.settings.push[k] = s.push[k];
    for (const k of PUSH_TIMES) if (S.isTime(s.push[k])) d.settings.push[k] = s.push[k];
  }
  if (s.remind && typeof s.remind === 'object') {
    for (const k of ['period', 'fertile', 'pill', 'track']) if (typeof s.remind[k] === 'boolean') d.settings.remind[k] = s.remind[k];
    for (const k of ['pillTime', 'trackTime']) if (S.isTime(s.remind[k])) d.settings.remind[k] = s.remind[k];
  }
  if (typeof s.name === 'string') d.settings.name = s.name.trim().slice(0, 30);
  if (typeof s.pillName === 'string') d.settings.pillName = s.pillName.trim().slice(0, PILL_MAX);
  if (Array.isArray(s.hiddenCats)) d.settings.hiddenCats = s.hiddenCats.filter(id => CAT[id] && !CAT[id].fixed);
  d.settings.customTags = strList(s.customTags, 30, TAG_MAX);
  if (o.meta && typeof o.meta.created === 'string') d.meta.created = o.meta.created;
  if (o.meta && typeof o.meta.lastBackup === 'string' && Number.isFinite(Date.parse(o.meta.lastBackup))) d.meta.lastBackup = o.meta.lastBackup;
  if (o.meta && typeof o.meta.seenVersion === 'string') d.meta.seenVersion = o.meta.seenVersion;
  if (o.meta && o.meta.icsExport && typeof o.meta.icsExport.at === 'string' && Number.isFinite(Date.parse(o.meta.icsExport.at))) {
    d.meta.icsExport = { at: o.meta.icsExport.at, period: C.isValidIso(o.meta.icsExport.period) ? o.meta.icsExport.period : null };
  }
  // Schlaf-Timer und abgehakte Tablette: bis 7 Tage übernehmen, settleSleep() räumt dann sauber auf
  const recent = t => Number.isFinite(t) && Date.now() - t >= 0 && Date.now() - t < 7 * 86400e3;
  if (o.meta && recent(o.meta.sleepStart)) d.meta.sleepStart = o.meta.sleepStart;
  if (o.meta && o.meta.sleepPill === true && recent(o.meta.sleepPillAt)) {
    d.meta.sleepPill = true;
    d.meta.sleepPillAt = o.meta.sleepPillAt;
  }
  // Ab wann Tabletten getrackt werden (ältere Nächte zählen im Vergleich nicht als "ohne Tablette")
  if (o.meta && C.isValidIso(o.meta.pillSince)) d.meta.pillSince = o.meta.pillSince;
  else needsSave = true;
  if (o.days && typeof o.days === 'object') {
    for (const [iso, v] of Object.entries(o.days)) {
      if (!C.isValidIso(iso)) continue;
      const e = cleanEntry(v);
      if (e) d.days[iso] = e;
    }
  }
  return d;
}

let storageOk = true;
let needsSave = false; // Migration hat etwas ergänzt, das gespeichert werden muss
function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { storageOk = false; return freshData(); }
  if (!raw) return freshData();
  try { return normalize(JSON.parse(raw)); } catch {
    // kaputte Daten nicht überschreiben, sondern beiseitelegen
    try { localStorage.setItem(`${KEY}-defekt-${Date.now()}`, raw); } catch { /* egal */ }
    return freshData();
  }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageOk = true;
    schedulePushSync(); // der Plan für Mitteilungen hängt an den Einträgen
  } catch {
    storageOk = false;
    toast('Speichern hat nicht geklappt – Speicher voll oder gesperrt');
  }
  return storageOk;
}
function entry(n) {
  const e = state.days[C.toIso(n)];
  return e ? JSON.parse(JSON.stringify(e)) : blankEntry();
}
function putEntry(n, e) {
  const iso = C.toIso(n);
  const c = cleanEntry(e);
  if (c) state.days[iso] = c;
  else delete state.days[iso];
}

let state = load();
let today = C.todayNum();
let A = C.analyze(state, today);
const ui = { tab: 'home', y: D(today).getUTCFullYear(), m: D(today).getUTCMonth(), mark: false, statsTab: 'cycle', folds: new Set(), wheelDay: null, calView: 'month', searchQ: '', reviewYear: D(today).getUTCFullYear() };

function refresh() {
  today = C.todayNum();
  A = C.analyze(state, today);
  render();
  if (tr.n !== null) {
    $('#tr-title').textContent = tr.n === today ? `Heute: ${fTitle(tr.n)}` : fWdTitle(tr.n);
    renderWeek();
  }
}
// Datumswechsel um Mitternacht bei offener App: sofort nachziehen, damit nichts auf dem Vortag landet
function checkNewDay() {
  if (C.todayNum() !== today) refresh();
}
function commit() { const ok = save(); refresh(); return ok; }

// ---------------------------------------------------------------------------
// Bewegung und Farben
// ---------------------------------------------------------------------------
// Animationen nur, wenn in iOS nicht „Bewegung reduzieren“ eingeschaltet ist
const motionOk = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
// Eine Ansicht kommt herein: Karten gleiten nacheinander ein – nur beim Wechseln, nicht bei jedem Neuzeichnen
function animateEnter(el, cls = 'enter') {
  if (!el || !motionOk()) return;
  el.classList.remove('enter', 'enter-soft');
  void el.offsetWidth; // Animation neu starten
  el.classList.add(cls);
  clearTimeout(el._enterT);
  el._enterT = setTimeout(() => el.classList.remove(cls), 1100);
}
function pop(el) {
  if (!el || !motionOk()) return;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}
let appliedTheme = null;
let themeFadeT = null;
function applyTheme(fade = false) {
  const id = THEME[state.settings.theme] ? state.settings.theme : 'rose';
  if (id === appliedTheme) return;
  const root = document.documentElement;
  if (fade && motionOk()) {
    root.classList.add('theme-fade');
    clearTimeout(themeFadeT);
    themeFadeT = setTimeout(() => root.classList.remove('theme-fade'), 600);
  }
  if (id === 'rose') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', id);
  // Statusleiste/Browserleiste in der Hintergrundfarbe des Themas
  for (const m of $$('meta[name="theme-color"]')) m.setAttribute('content', /dark/.test(m.getAttribute('media') || '') ? THEME[id][5] : THEME[id][4]);
  appliedTheme = id;
}

// ---------------------------------------------------------------------------
// Ansichten
// ---------------------------------------------------------------------------
function render() {
  applyTheme();
  for (const [k, sel] of Object.entries(VIEWS)) $(sel).hidden = k !== ui.tab;
  $$('.tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === ui.tab ? 'page' : 'false'));
  $('#title').textContent = ui.tab === 'home' ? homeTitle() : TITLES[ui.tab];
  ({ home: renderHome, cal: renderCal, stats: renderStats, settings: renderSettings })[ui.tab]();
}

function switchTab(tab) {
  if (tab !== 'home') ui.wheelDay = null; // zurück auf „Heute“ zeigt wieder heute
  const changed = tab !== ui.tab;
  ui.tab = tab;
  render();
  window.scrollTo(0, 0);
  if (changed) animateEnter($(VIEWS[tab]));
}

// --- Heute -----------------------------------------------------------------
// --- Zyklus-Rad: zum Drehen, zeigt jeden Tag mit Zyklustag und Phase ------------------------
// acc: Bruchteil eines Tages, um den der Finger über den gewählten Tag hinaus gedreht hat (−0,5 … 0,5)
// angle: aktuell gezeichneter Winkel der Markierung · key/host: welcher Zyklus gerade gezeichnet ist
const wheel = { dragging: false, lastAng: 0, startAng: 0, acc: 0, moved: 0, el: null, cyc: null, angle: 0, raf: 0, key: '', host: null };
const wheelSel = () => (ui.wheelDay === null ? today : ui.wheelDay);
function wheelBounds() {
  return { min: A.periods[0].start, max: A.futureStart + C.AHEAD * A.cycleLen - 1 };
}
const PHASE_HELP = {
  follikel: 'Zeit nach der Periode – der Körper bereitet den nächsten Eisprung vor.',
  fruchtbar: 'Rund um den Eisprung. Nur eine Kalender-Schätzung, kein Verhütungsmittel.',
  'eisprung-tag': 'Geschätzter Eisprung. Nur eine Kalender-Schätzung, kein Verhütungsmittel.',
  luteal: 'Nach dem Eisprung bis zur nächsten Periode. In den Tagen davor können PMS-Beschwerden auftreten.',
  unklar: 'In diesem Zyklus fehlt vermutlich ein Periodeneintrag – deshalb keine Phasen-Schätzung.',
};

function wheelSvg(cyc, sel) {
  const L = cyc.len, R = 84, circ = 2 * Math.PI * R;
  const arc = (from, to, cls) => {
    const f0 = Math.max(0, from) / L, f1 = Math.min(L, to) / L;
    if (f1 <= f0) return '';
    return `<circle class="${cls}" cx="100" cy="100" r="${R}" stroke-dasharray="${((f1 - f0) * circ).toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${(-f0 * circ).toFixed(2)}"/>`;
  };
  const rel = n => n - cyc.start;
  const pos = (d, r) => {
    const ang = ((d + 0.5) / L) * 2 * Math.PI - Math.PI / 2;
    return [(100 + r * Math.cos(ang)).toFixed(1), (100 + r * Math.sin(ang)).toFixed(1)];
  };
  let g = `<circle class="ring-bg" cx="100" cy="100" r="${R}"/>`;
  if (state.settings.showFertile && cyc.win) g += arc(rel(cyc.win.start), rel(cyc.win.end) + 1, 'ring-fertile');
  const pe = rel(cyc.pEnd) + 1;
  const pf = Math.min(pe, rel(cyc.predFrom));
  g += arc(0, pf, 'ring-period');
  if (pf < pe) g += arc(Math.max(0, pf), pe, 'ring-period pred');
  let marks = '';
  for (let d = 0; d < L; d++) {
    const e = state.days[C.toIso(cyc.start + d)];
    if (e && hasExtra(e)) {
      const [x, y] = pos(d, R - 16);
      marks += `<circle class="ring-dot" cx="${x}" cy="${y}" r="2.6"/>`;
    }
  }
  if (today >= cyc.start && today < cyc.start + L) {
    const [x, y] = pos(rel(today), R);
    marks += `<circle class="ring-today${sel === today ? ' off' : ''}" cx="${x}" cy="${y}" r="5"/>`;
  }
  // Markierung oben (12 Uhr) gezeichnet und per Drehung platziert – so kann sie stufenlos gleiten
  const ang = markerAngle(cyc, rel(sel) + 0.5);
  return `<svg class="ring" viewBox="0 0 200 200" aria-hidden="true"><g transform="rotate(-90 100 100)">${g}</g>${marks}<g class="ring-marker-g" transform="rotate(${ang.toFixed(2)} 100 100)"><circle class="ring-marker" cx="100" cy="${100 - R}" r="10"/></g></svg>`;
}
// Winkel (Grad, im Uhrzeigersinn ab 12 Uhr) für eine Stelle im Zyklus; pos in Tagen ab Zyklusbeginn
const markerAngle = (cyc, pos) => (pos / cyc.len) * 360;
function setMarkerAngle(a) {
  wheel.angle = a;
  const g = wheel.host && wheel.host.querySelector('.ring-marker-g');
  if (g) g.setAttribute('transform', `rotate(${a.toFixed(2)} 100 100)`);
}
// Markierung zum Ziel gleiten lassen (ease-out), ohne Bewegung oder bei „Bewegung reduzieren“ direkt setzen
function moveMarker(target, animate) {
  cancelAnimationFrame(wheel.raf);
  const from = wheel.angle;
  if (!animate || !motionOk() || Math.abs(target - from) < 0.05) { setMarkerAngle(target); return; }
  const t0 = performance.now();
  const dur = Math.min(320, 140 + Math.abs(target - from) * 1.2);
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    setMarkerAngle(from + (target - from) * (1 - Math.pow(1 - p, 3)));
    if (p < 1) wheel.raf = requestAnimationFrame(step);
  };
  wheel.raf = requestAnimationFrame(step);
}
// Beim Drehen: Markierung folgt dem Finger stufenlos
function followFinger() {
  if (!wheel.cyc) return;
  cancelAnimationFrame(wheel.raf);
  setMarkerAngle(markerAngle(wheel.cyc, wheelSel() - wheel.cyc.start + 0.5 + wheel.acc));
}
// Beim Loslassen: weich auf die Mitte des gewählten Tages einrasten
function snapWheel() {
  wheel.acc = 0;
  if (wheel.cyc) moveMarker(markerAngle(wheel.cyc, wheelSel() - wheel.cyc.start + 0.5), true);
}

function wheelInfo(cyc, info, sel, b) {
  const nav = `<div class="wheel-nav">
      <button class="icon-btn" data-act="wheel-prev" aria-label="Einen Tag zurück"${sel <= b.min ? ' disabled' : ''}>‹</button>
      ${sel === today ? '<span class="wheel-hint">↻ Ring drehen für andere Tage</span>' : '<button class="btn small" data-act="wheel-today">Zurück zu heute</button>'}
      <button class="icon-btn" data-act="wheel-next" aria-label="Einen Tag vor"${sel >= b.max ? ' disabled' : ''}>›</button>
    </div>`;
  if (sel === today) {
    const st = homeStatus();
    return `<h2 class="status">${esc(st.head)}</h2>
      ${st.sub ? `<p class="status-sub">${esc(st.sub)}</p>` : ''}
      ${st.fert ? `<p class="fert-line"><i class="dot-fertile" aria-hidden="true"></i>${esc(st.fert)}</p>` : ''}
      ${nav}`;
  }
  const e = state.days[C.toIso(sel)];
  const showF = state.settings.showFertile;
  let head;
  let phase = info.phase;
  if (!showF && (phase === 'fruchtbar' || phase === 'eisprung-tag')) phase = sel < cyc.win.ov ? 'follikel' : 'luteal';
  if (phase === 'periode') head = info.predicted && !C.isPeriodDay(e) ? 'Periode erwartet' : `Periode · Tag ${sel - cyc.pStart + 1}`;
  else if (phase === 'eisprung-tag') head = 'Eisprung (geschätzt)';
  else if (phase === 'fruchtbar') head = 'Fruchtbare Tage (geschätzt)';
  else if (phase === 'luteal') head = 'Lutealphase';
  else if (phase === 'unklar') head = `Zyklustag ${info.day}`;
  else head = 'Follikelphase';
  const date = fLong(sel);
  let sub = `${date.charAt(0).toUpperCase()}${date.slice(1)}${sel > today ? ' · Vorhersage' : ''}`;
  if (cyc.kind !== 'past' && phase !== 'periode' && sel >= today) sub += ` · noch ${plural(info.daysLeft, 'Tag', 'Tage')} bis zur Periode`;
  return `<h2 class="status">${esc(head)}</h2>
    <p class="status-sub">${esc(sub)}</p>
    ${PHASE_HELP[phase] ? `<p class="wheel-help">${PHASE_HELP[phase]}</p>` : ''}
    ${e ? `<div class="wheel-entry">${entrySummary(e)}</div>` : ''}
    ${nav}
    ${sel <= today ? '<button class="link wheel-open" data-act="wheel-open">Diesen Tag ansehen / bearbeiten ›</button>' : ''}`;
}

// animate: Markierung gleitet zum neuen Tag (Pfeile, Antippen). Bleibt der Zyklus derselbe, wird nur
// die Markierung bewegt statt das ganze Rad neu zu zeichnen – flüssiger beim Drehen.
function renderWheel(animate = false) {
  const host = $('#wheel');
  if (!host || !A.hasData) return;
  const b = wheelBounds();
  let sel = Math.min(b.max, Math.max(b.min, wheelSel()));
  let cyc = C.cycleAt(sel, A, today);
  if (!cyc) {
    sel = today;
    cyc = C.cycleAt(today, A, today);
  }
  ui.wheelDay = sel === today ? null : sel;
  const info = C.dayInfoAt(sel, cyc);
  wheel.cyc = cyc;
  const key = [cyc.start, cyc.len, cyc.kind, cyc.pEnd, cyc.predFrom, cyc.win ? cyc.win.ov : '-'].join('|');
  if (wheel.host === host && wheel.key === key && host.querySelector('.ring-marker-g')) {
    const td = host.querySelector('.ring-today');
    if (td) td.classList.toggle('off', sel === today);
    moveMarker(markerAngle(cyc, sel - cyc.start + 0.5), animate);
  } else {
    cancelAnimationFrame(wheel.raf);
    host.innerHTML = `${wheelSvg(cyc, sel)}<div class="ring-center"></div>`;
    wheel.host = host;
    wheel.key = key;
    wheel.angle = markerAngle(cyc, sel - cyc.start + 0.5);
  }
  host.querySelector('.ring-center').innerHTML = `
      <span class="rc-small">${sel === today ? 'Zyklustag' : esc(fShort(sel))}</span>
      <span class="rc-big">${info.day}</span>
      <span class="rc-small">${sel === today ? '' : 'Zyklustag · '}von ${cyc.kind === 'past' ? '' : 'ca. '}${cyc.len}</span>`;
  host.setAttribute('aria-valuetext', `${fLong(sel)}, Zyklustag ${info.day}`);
  host.setAttribute('aria-valuenow', String(sel - today));
  host.setAttribute('aria-valuemin', String(b.min - today));
  host.setAttribute('aria-valuemax', String(b.max - today));
  host.classList.toggle('moved', sel !== today);
  $('#wheel-info').innerHTML = wheelInfo(cyc, info, sel, b);
  for (const d of $$('#view-home .wa-day')) d.classList.toggle('sel', Number(d.dataset.n) === sel);
}
// Die nächsten 7 Tage auf einen Blick; Antippen dreht das Rad auf diesen Tag
function weekAhead() {
  const showF = state.settings.showFertile;
  let h = '';
  for (let i = 0; i < 7; i++) {
    const n = today + i;
    const cls = dayClasses(n, state.days[C.toIso(n)], showF).filter(c => c !== 'future');
    const what = cls.includes('period') ? 'Periode' : cls.includes('pred') ? 'Periode erwartet' : cls.includes('ov') ? 'Eisprung geschätzt' : cls.includes('fertile') ? 'fruchtbar' : '';
    h += `<button class="wa-day ${cls.join(' ')}" data-act="wheel-goto" data-n="${n}" aria-label="${esc(fLong(n))}${what ? `, ${what}` : ''}"><span class="wa-wd">${i === 0 ? 'Heute' : WD2[weekdayIdx(n)]}</span><span class="wa-num">${D(n).getUTCDate()}</span><i class="wa-mark" aria-hidden="true"></i></button>`;
  }
  return `<div class="week-ahead"><p class="wa-title">Die nächsten 7 Tage</p><div class="wa-row">${h}</div></div>`;
}
function setWheelDay(n, animate = false) {
  const b = wheelBounds();
  n = Math.min(b.max, Math.max(b.min, n));
  if (n === wheelSel()) return;
  ui.wheelDay = n === today ? null : n;
  renderWheel(animate);
}

function homeStatus() {
  const a = A;
  const spreadTxt = a.spread ? ` (± ${plural(a.spread, 'Tag', 'Tage')})` : '';
  let head, sub = '';
  if (a.inPeriod) {
    head = `Periode · Tag ${today - a.last.start + 1}`;
    sub = a.expectedEnd > today ? `voraussichtlich bis ${fShort(a.expectedEnd)}` : `nächste etwa ab ${fShort(a.nextStart)}`;
  } else if (a.ongoing && a.predicted.has(today)) {
    head = `Zyklustag ${a.cycleDay}`;
    sub = 'Heute noch Periode? Dann unten eintragen.';
  } else if (a.overdue > 0 && a.overdue <= Math.max(2, a.spread || 0)) {
    // noch im normalen Schwankungsbereich
    head = 'Periode kann jeden Tag kommen';
    sub = `erwartet ab ${fShort(a.nextStart)}${spreadTxt} – schon da? Dann unten eintragen.`;
  } else if (a.overdue > 0) {
    head = `Periode seit ${plural(a.overdue, 'Tag', 'Tagen')} fällig`;
    sub = a.overdue >= 14
      ? `erwartet war ${fShort(a.nextStart)}. Vergessen einzutragen? Dann im Kalender nachtragen.`
      : `erwartet war ${fShort(a.nextStart)} – schon da? Dann unten eintragen.`;
  } else if (a.daysUntil === 0) {
    head = 'Periode heute erwartet';
    sub = 'Schon da? Dann unten eintragen.';
  } else if (a.daysUntil === 1) {
    head = 'Periode morgen erwartet';
    sub = `${fShort(a.base)}${spreadTxt}`;
  } else {
    head = `Nächste Periode in ${a.daysUntil} Tagen`;
    sub = `voraussichtlich ${fShort(a.base)}${spreadTxt}`;
  }
  let fert = '';
  if (state.settings.showFertile && a.nextWindow && !a.inPeriod) {
    const w = a.nextWindow;
    if (today === w.ov) fert = 'Eisprung heute (geschätzt)';
    else if (today >= w.start && today <= w.end) fert = `Fruchtbare Tage · Eisprung ca. ${fDM(w.ov)}`;
    else fert = `Fruchtbare Tage ca. ${fDM(w.start)}–${fDM(w.end)}`;
  }
  return { head, sub, fert };
}

function entrySummary(e) {
  const chips = [];
  for (const c of CHIP_CATS) {
    for (const id of e.tags[c.id] || []) {
      const o = OPT[c.id][id];
      if (!o) continue;
      const label = PREFIX.has(c.id) ? `${c.name}: ${o.label}` : o.label;
      chips.push(`<span class="mini-chip tone-${c.tone}"><span class="em" aria-hidden="true">${o.emoji}</span>${esc(label)}</span>`);
    }
  }
  for (const t of e.custom) chips.push(`<span class="mini-chip tone-violet"><span class="em" aria-hidden="true">🏷️</span>${esc(t)}</span>`);
  if (e.sleep || e.bed !== null || e.wake !== null) {
    const times = e.bed !== null && e.wake !== null ? ` (${S.fmtTime(e.bed)}–${S.fmtTime(e.wake)})` : '';
    chips.push(`<span class="mini-chip tone-indigo"><span class="em" aria-hidden="true">🛌</span>${e.sleep ? `${fmtSleep(e.sleep)} Schlaf` : 'Schlaf'}${times}</span>`);
  }
  if (e.pill) {
    const extra = [e.pill.at !== null ? `${S.fmtTime(e.pill.at)} Uhr` : '', e.pill.name].filter(Boolean).join(' · ');
    chips.push(`<span class="mini-chip tone-indigo"><span class="em" aria-hidden="true">💊</span>Schlaftablette${extra ? ` · ${esc(extra)}` : ''}</span>`);
  }
  if (e.weight) chips.push(`<span class="mini-chip tone-blue"><span class="em" aria-hidden="true">⚖️</span>${fmtKg(e.weight)}</span>`);
  let html = chips.length ? `<div class="mini-chips">${chips.join('')}</div>` : '';
  if (e.note.trim()) html += `<p class="note-text">${esc(e.note)}</p>`;
  return html;
}

// --- Schlaf auf der Startseite ------------------------------------------------
// running: Timer läuft · evening: 19–4 Uhr "Schlafen gehen?" · morning: 4–13 Uhr ohne Schlaf-Eintrag
function sleepMode() {
  if (state.meta.sleepStart) return 'running';
  const h = new Date().getHours();
  if (h >= 19 || h < 4) return 'evening';
  const e = state.days[C.toIso(today)];
  if (h < 13 && !(e && (e.sleep || e.bed !== null || e.wake !== null))) return 'morning';
  return 'none';
}
const sleepElapsed = () => Math.max(0, Math.round((Date.now() - state.meta.sleepStart) / 60000));

function sleepCard() {
  const m = state.meta;
  const mode = sleepMode();
  if (mode === 'running') {
    return `<div class="card sleep-card running">
      <div class="sleep-head"><span class="sleep-em" aria-hidden="true">😴</span>
        <div><b>Schlaf läuft</b><p>seit ${S.fmtTime(nowMin(new Date(m.sleepStart)))} Uhr · <span id="sleep-elapsed">${fmtSleep(sleepElapsed())}</span>${m.sleepPill ? ' · 💊 Tablette' : ''}</p></div>
      </div>
      <div class="btn-row"><button class="btn primary grow" data-act="sleep-stop">☀️ Aufgewacht</button><button class="btn ghost" data-act="sleep-cancel">Abbrechen</button></div>
    </div>`;
  }
  if (mode === 'evening') {
    return `<div class="card sleep-card">
      <div class="sleep-head"><span class="sleep-em" aria-hidden="true">🌙</span>
        <div><b>Schlafen gehen?</b><p>Beim Hinlegen antippen, morgens auf „Aufgewacht“ – die App rechnet die Schlafdauer aus.</p></div>
      </div>
      <label class="pill-check"><input type="checkbox" id="sleep-pill" ${m.sleepPill ? 'checked' : ''}>
        <span>💊 Schlaftablette genommen${state.settings.pillName ? ` <small>${esc(state.settings.pillName)}</small>` : ''}</span></label>
      <button class="btn primary wide" data-act="sleep-start">🌙 Schlafen gehen</button>
    </div>`;
  }
  if (mode === 'morning') {
    return `<div class="card sleep-card">
      <div class="sleep-head"><span class="sleep-em" aria-hidden="true">☀️</span>
        <div><b>Wie hast du geschlafen?</b><p>Trag die letzte Nacht nach: Uhrzeiten, Schlafqualität, Schlaftablette.</p></div>
      </div>
      <button class="btn wide" data-act="track-sleep">😴 Schlaf eintragen</button>
    </div>`;
  }
  return '';
}

function newsCard() {
  const n = NOTES[0];
  return `<div class="card news-card">
    <div class="card-head"><h3><span class="spark" aria-hidden="true">✨</span> Neu in Version ${esc(n.v)}</h3><button class="link" data-act="news-ok">OK</button></div>
    <ul class="plain">${n.items.slice(0, 4).map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    <button class="link" data-act="news-all">Alle Neuigkeiten ansehen ›</button>
  </div>`;
}

// --- Was dich erwartet: aus den eigenen Einträgen früherer Zyklen -------------------------------
function tagInfo(cat, id) {
  if (cat === 'custom') return { label: id, emoji: '🏷️', tone: 'violet' };
  const c = CAT[cat];
  const o = c && OPT[cat] && OPT[cat][id];
  if (!o) return null;
  return { label: PREFIX.has(cat) ? `${c.name}: ${o.label}` : o.label, emoji: o.emoji, tone: c.tone };
}
const PHASE_WHEN = { periode: 'Während der Periode', follikel: 'Nach der Periode', eisprung: 'Rund um den Eisprung', luteal: 'In der zweiten Zyklushälfte' };
function expectSleepLine() {
  const ph = C.phaseOf(today, A);
  if (!ph || (ph === 'eisprung' && !state.settings.showFertile)) return '';
  const nights = sleepNights(); // Eintrag von heute = die vergangene Nacht, also auch abgeschlossen
  const all = nights.filter(x => x.sleep);
  if (all.length < 10) return '';
  const v = S.averageBy(nights, n => C.phaseOf(n, A), 4)[ph];
  if (!v) return '';
  const diff = v.avg - Math.round(all.reduce((s, x) => s + x.sleep, 0) / all.length);
  if (Math.abs(diff) < 20) return '';
  return `😴 ${PHASE_WHEN[ph]} schläfst du im Schnitt ${fmtSleep(Math.abs(diff))} ${diff < 0 ? 'weniger' : 'länger'} als sonst.`;
}
function expectCard() {
  if (!A.hasData) return '';
  const ex = expectations(state, A, today);
  const rows = ex.items.map(it => {
    const t = tagInfo(it.cat, it.id);
    if (!t) return '';
    return `<li><span class="mini-chip tone-${t.tone}"><span class="em" aria-hidden="true">${t.emoji}</span>${esc(t.label)}</span><span class="ex-sub">in ${it.k} von ${it.n} Zyklen</span></li>`;
  }).join('');
  const sleep = expectSleepLine();
  if (!rows && !sleep) return '';
  const when = ex.mode === 'period' ? 'wenn die Periode kommt' : 'nächste 3 Tage';
  return `<div class="card expect-card">
    <div class="card-head"><h3>🌤️ Was dich erwartet</h3><small>${when}</small></div>
    ${rows ? `<p class="muted small">${ex.mode === 'period' ? 'Zu Beginn deiner Periode hattest du oft:' : 'An dieser Stelle im Zyklus hattest du oft:'}</p><ul class="expect">${rows}</ul>` : ''}
    ${sleep ? `<p class="ex-line">${esc(sleep)}</p>` : ''}
    <p class="ex-foot">Aus deinen eigenen Einträgen früherer Zyklen – keine medizinische Vorhersage. <button class="link" data-act="open-patterns">Alle Muster ›</button></p>
  </div>`;
}

let lastSleepMode = null;
function renderHome() {
  const out = [];
  out.push(`<p class="date-line">${esc(fLong(today))}</p>`);
  if (isIOS && !standalone) {
    out.push(`<div class="card hint-card"><b>So wird es eine richtige App:</b> In Safari auf <b>Teilen</b> <span class="share-ic" aria-hidden="true">⇧</span> tippen (bei neuem iOS erst auf <b>„…“</b>), dann <b>„Zum Home-Bildschirm“</b>. Danach nur noch über das neue Icon öffnen – Einträge hier im Safari-Tab landen nicht in der App.</div>`);
  }
  if (!storageOk) out.push('<div class="card warn-card">Speichern ist gerade nicht möglich (privates Surfen oder Speicher voll). Einträge gehen beim Schließen verloren.</div>');

  // Neuigkeiten nach einem Update einmal zeigen (beim allerersten Start nicht)
  if (state.meta.seenVersion !== APP_VERSION) {
    if (!Object.keys(state.days).length) { state.meta.seenVersion = APP_VERSION; save(); }
    else out.push(newsCard());
  }

  if (!A.hasData) {
    out.push(`<div class="card hero welcome">
      <div class="welcome-em" aria-hidden="true">🌸</div>
      <h2>Willkommen${state.settings.name ? `, ${esc(state.settings.name)}` : ''}!</h2>
      <label class="name-field"><span>Wie heißt du? <small>(bleibt nur auf diesem Gerät)</small></span><input id="name-input" type="text" maxlength="30" autocomplete="given-name" placeholder="Vorname" value="${esc(state.settings.name)}"></label>
      <p>Markier die Tage deiner letzten Periode. Danach rechnet die App die nächste Periode${state.settings.showFertile ? ' und die fruchtbaren Tage' : ''} selbst aus – je mehr Zyklen du einträgst, desto genauer.</p>
      <button class="btn primary" data-act="start-mark">Letzte Periode im Kalender markieren</button>
    </div>`);
  } else {
    out.push(`<div class="card hero">
      <div class="ring-wrap" id="wheel" tabindex="0" role="slider" aria-label="Zyklus-Rad – drehen, um andere Tage anzusehen"></div>
      <div id="wheel-info"></div>
      ${state.settings.show.week ? weekAhead() : ''}
    </div>`);
  }

  const e = state.days[C.toIso(today)];
  const isP = C.isPeriodDay(e);
  out.push(`<div class="actions">
    <button class="action ${isP ? 'on' : ''}" data-act="toggle-today" aria-pressed="${isP}"><span class="a-em" aria-hidden="true">🩸</span><span>${isP ? 'Heute Periode ✓' : 'Periode heute'}</span></button>
    <button class="action" data-act="track-today"><span class="a-em" aria-hidden="true">📝</span><span>Tag tracken</span></button>
    <button class="action" data-tab="cal"><span class="a-em" aria-hidden="true">📅</span><span>Kalender</span></button>
  </div>`);

  lastSleepMode = sleepMode();
  if (state.settings.show.sleep || state.meta.sleepStart) out.push(sleepCard()); // ein laufender Timer bleibt immer sichtbar
  if (icsOutdated()) {
    out.push(`<div class="card remind-card"><div><b>🔔 Neue Vorhersage</b><p>Die Kalender-Erinnerung für die nächste Periode (${esc(fShort(A.nextStart))}) ist noch nicht in deinem Kalender.</p></div><button class="btn small primary" data-act="ics-export-next">Übernehmen</button></div>`);
  }
  if (state.settings.show.expect) out.push(expectCard());

  if (e) {
    out.push(`<div class="card"><div class="card-head"><h3>Heute eingetragen</h3><button class="link" data-act="track-today">Bearbeiten</button></div>${entrySummary(e)}</div>`);
  }

  if (A.hasData) {
    out.push(`<button class="card mini-stats" data-tab="stats">
      <span><b>${A.cycleLen}</b>Tage Ø Zyklus</span>
      <span><b>${A.periodLen}</b>Tage Ø Periode</span>
      <span><b>${A.usedCycles}</b>${A.usedCycles === 1 ? 'Zyklus' : 'Zyklen'} erfasst</span>
    </button>`);
    if (!A.usedCycles) out.push(`<p class="note-line">Bis ein ganzer Zyklus eingetragen ist, rechnet die Vorhersage mit ${A.cycleLen} Tagen (änderbar unter „Mehr“).</p>`);
  }

  const nDays = Object.keys(state.days).length;
  const lb = state.meta.lastBackup ? C.todayNum(new Date(state.meta.lastBackup)) : null;
  if (nDays >= 5 && (lb === null || today - lb > 30)) {
    out.push(`<div class="card backup-card"><div><b>💾 Zeit für ein Backup</b><p>Deine Einträge liegen nur auf diesem Gerät. Speicher ab und zu eine Kopie in „Dateien“ oder iCloud.</p></div><button class="btn small primary" data-act="export">Speichern</button></div>`);
  }
  out.push('<p class="disclaimer">Vorhersagen sind Schätzungen aus deinen Einträgen – kein Verhütungsmittel und kein Ersatz für ärztlichen Rat.</p>');
  $('#view-home').innerHTML = out.join('');
  renderWheel();
}

// --- Kalender ----------------------------------------------------------------
function dayClasses(n, e, showF) {
  const c = [];
  const isP = n <= today && C.isPeriodDay(e);
  if (isP) c.push('period');
  else if (A.predicted.has(n)) c.push('pred');
  if (!isP && showF && A.fertile.has(n)) c.push('fertile');
  if (!isP && showF && A.ovulation.has(n)) c.push('ov');
  if (n === today) c.push('today');
  if (n > today) c.push('future');
  return c;
}
function dayLabel(n, cls, e) {
  const parts = [fLong(n)];
  if (cls.includes('today')) parts.push('heute');
  if (cls.includes('period')) parts.push('Periode');
  if (cls.includes('pred')) parts.push('Periode vorhergesagt');
  if (cls.includes('ov')) parts.push('Eisprung geschätzt');
  else if (cls.includes('fertile')) parts.push('fruchtbar');
  if (e && e.tags.spot) parts.push('Schmierblutung');
  if (e && hasExtra(e)) parts.push('weitere Einträge');
  return parts.join(', ');
}

// --- Jahresansicht: 12 Mini-Monate, Jahr wählen, Monat antippen ------------------------------
const fMonthShort = fmt({ month: 'long' });
function yearSummary(y) {
  const inYear = n => D(n).getUTCFullYear() === y;
  const periods = A.periods.filter(p => inYear(p.start)).length;
  const cyc = A.cycles.filter(c => inYear(c.start) && !c.note);
  const avg = cyc.length ? Math.round(cyc.reduce((s, c) => s + c.length, 0) / cyc.length) : null;
  const pdays = Object.keys(state.days).filter(iso => iso.startsWith(`${y}-`) && C.isPeriodDay(state.days[iso])).length;
  const parts = [plural(periods, 'Periode', 'Perioden')];
  if (avg) parts.push(`Ø Zyklus ${avg} Tage`);
  parts.push(plural(pdays, 'Periodentag', 'Periodentage'));
  return parts.join(' · ');
}
function renderYear() {
  const y = ui.y;
  const showF = state.settings.showFertile;
  const curY = D(today).getUTCFullYear(), curM = D(today).getUTCMonth();
  let months = '';
  for (let m = 0; m < 12; m++) {
    const first = Math.round(Date.UTC(y, m, 1) / C.DAY);
    const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    let dots = '';
    for (let i = 0; i < weekdayIdx(first); i++) dots += '<i class="md blank"></i>';
    let pCount = 0;
    for (let d = 0; d < dim; d++) {
      const n = first + d;
      const cls = dayClasses(n, state.days[C.toIso(n)], showF);
      if (cls.includes('period')) pCount++;
      dots += `<i class="md ${cls.join(' ')}"></i>`;
    }
    const isCur = y === curY && m === curM;
    months += `<button class="mini-month${isCur ? ' current' : ''}" data-act="cal-open-month" data-m="${m}" aria-label="${esc(fMonth(first))}${pCount ? `, ${plural(pCount, 'Periodentag', 'Periodentage')}` : ''}">
      <span class="mm-name">${esc(fMonthShort(first))}</span><span class="mm-grid" aria-hidden="true">${dots}</span></button>`;
  }
  $('#view-cal').innerHTML = `
    <div class="card cal-card">
      <div class="cal-head">
        <button class="icon-btn" data-act="cal-prev" aria-label="Vorheriges Jahr">‹</button>
        <h2>${y}</h2>
        <button class="icon-btn" data-act="cal-next" aria-label="Nächstes Jahr">›</button>
      </div>
      <p class="year-sum">${esc(yearSummary(y))}</p>
      <div class="year-grid">${months}</div>
    </div>
    <div class="cal-tools">
      <button class="btn" data-act="cal-month-view">📅 Zur Monatsansicht</button>
      ${y === curY ? '' : '<button class="btn" data-act="cal-today">Heute</button>'}
    </div>
    <p class="hint">Tippe auf einen Monat, um ihn zu öffnen. Wischen oder ‹ › wechselt das Jahr.</p>
    <div class="legend">
      <span><i class="lg period"></i>Periode</span>
      <span><i class="lg pred"></i>Vorhersage</span>
      ${showF ? '<span><i class="lg fertile"></i>Fruchtbar</span>' : ''}
    </div>`;
}

function renderCal() {
  if (ui.calView === 'year') return renderYear();
  const first = Math.round(Date.UTC(ui.y, ui.m, 1) / C.DAY);
  const dim = new Date(Date.UTC(ui.y, ui.m + 1, 0)).getUTCDate();
  const showF = state.settings.showFertile;
  const isCur = ui.y === D(today).getUTCFullYear() && ui.m === D(today).getUTCMonth();
  let cells = '';
  for (let i = 0; i < weekdayIdx(first); i++) cells += '<span class="day blank"></span>';
  for (let d = 0; d < dim; d++) {
    const n = first + d;
    const e = state.days[C.toIso(n)];
    const cls = dayClasses(n, e, showF);
    const marks = (e && e.tags.spot ? '<i class="d-spot"></i>' : '') + (e && hasExtra(e) ? '<i class="d-log"></i>' : '');
    cells += `<button class="day ${cls.join(' ')}" data-day="${n}" aria-label="${esc(dayLabel(n, cls, e))}"><span class="dn">${d + 1}</span>${marks}</button>`;
  }
  $('#view-cal').innerHTML = `
    <div class="card cal-card${ui.mark ? ' marking' : ''}">
      <div class="cal-head">
        <button class="icon-btn" data-act="cal-prev" aria-label="Vorheriger Monat">‹</button>
        <button class="cal-title" data-act="cal-year-view" aria-label="${esc(fMonth(first))} – Jahresübersicht öffnen"><h2>${esc(fMonth(first))} <span class="caret" aria-hidden="true">▾</span></h2></button>
        <button class="icon-btn" data-act="cal-next" aria-label="Nächster Monat">›</button>
      </div>
      <div class="cal-grid wd" aria-hidden="true">${WD2.map(w => `<span>${w}</span>`).join('')}</div>
      <div class="cal-grid days">${cells}</div>
    </div>
    <div class="cal-tools">
      <button class="btn ${ui.mark ? 'primary' : ''}" data-act="mark" aria-pressed="${ui.mark}">${ui.mark ? '✓ Fertig mit Markieren' : '🩸 Periodentage markieren'}</button>
      ${isCur ? '' : '<button class="btn" data-act="cal-today">Heute</button>'}
    </div>
    <p class="hint">${ui.mark
      ? 'Tippe auf Tage, um sie als Periode ein- oder auszutragen. Die Stärke kannst du beim Tracken anpassen.'
      : 'Tippe auf einen Tag, um ihn zu tracken. Mit „Periodentage markieren“ trägst du mehrere Tage schnell ein.'}</p>
    <div class="legend">
      <span><i class="lg period"></i>Periode</span>
      <span><i class="lg pred"></i>Vorhersage</span>
      ${showF ? '<span><i class="lg fertile"></i>Fruchtbar</span><span><i class="lg ov"></i>Eisprung</span>' : ''}
      <span><i class="lg spot"></i>Schmierblutung</span>
      <span><i class="lg log"></i>Weitere Einträge</span>
    </div>
    ${Object.keys(state.days).length ? `<div class="card search-card"><h3>🔎 Einträge durchsuchen</h3>
      <label class="search slim"><input id="entry-search" type="search" placeholder="Notiz, Tag oder Symptom …" value="${esc(ui.searchQ)}" autocomplete="off" enterkeyhint="search" aria-label="Einträge durchsuchen"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/></svg></label>
      <div id="search-results" aria-live="polite">${searchResultsHtml()}</div>
    </div>` : ''}`;
}
function searchResultsHtml() {
  const q = ui.searchQ.trim();
  if (q.length < 2) return '<p class="sr-hint">Sucht in Notizen, eigenen Tags und allem, was du eingetragen hast.</p>';
  const res = searchEntries(state.days, q, 30).filter(r => C.toNum(r.iso) <= today);
  if (!res.length) return `<p class="sr-hint">Nichts gefunden für „${esc(q)}“.</p>`;
  const rows = res.map(r => {
    const n = C.toNum(r.iso);
    const chips = r.tags.slice(0, 4).map(t => {
      const i = tagInfo(t.cat, t.id);
      return i ? `<span class="mini-chip tone-${i.tone}"><span class="em" aria-hidden="true">${i.emoji}</span>${esc(i.label)}</span>` : '';
    }).join('');
    const note = r.note ? `<span class="sr-note">${esc(r.note.pre)}<mark>${esc(r.note.hit)}</mark>${esc(r.note.post)}</span>` : '';
    return `<li><button class="sr-item" data-act="open-day" data-n="${n}"><b>${esc(fWdTitle(n))}</b>${chips ? `<span class="mini-chips">${chips}</span>` : ''}${note}</button></li>`;
  }).join('');
  return `<p class="sr-hint">${plural(res.length, 'Treffer', 'Treffer')}${res.length >= 30 ? ' (die neuesten 30)' : ''} – antippen öffnet den Tag.</p><ul class="sr-list">${rows}</ul>`;
}
function shiftMonth(delta) {
  if (ui.calView === 'year') { ui.y += delta; renderCal(); slideCal(delta); return; } // in der Jahresansicht: ganzes Jahr weiter
  const d = new Date(Date.UTC(ui.y, ui.m + delta, 1));
  ui.y = d.getUTCFullYear();
  ui.m = d.getUTCMonth();
  renderCal();
  slideCal(delta);
}
// Kalender blättert in die Richtung, in die es weitergeht
function slideCal(delta) {
  if (!delta || !motionOk()) return;
  const g = $('#view-cal .cal-grid.days') || $('#view-cal .year-grid');
  if (g) g.classList.add(delta > 0 ? 'slide-next' : 'slide-prev');
}

// --- Statistik ---------------------------------------------------------------
function collectPatterns() {
  const res = {};
  const add = (cat, id, ph) => {
    const m = (res[cat] ||= {});
    const r = (m[id] ||= { n: 0, phases: [] });
    r.n++;
    if (ph !== null) r.phases.push(ph);
  };
  for (const [iso, e] of Object.entries(state.days)) {
    const n = C.toNum(iso);
    if (n > today) continue;
    const ph = C.cyclePhase(n, A.periods, A.cycleLen, A.cycles);
    for (const [cat, ids] of Object.entries(e.tags)) for (const id of ids) add(cat, id, ph);
    for (const t of e.custom) add('custom', t, ph);
  }
  return res;
}

// "meist um Zyklustag 14", "meist ca. 3 Tage vor der Periode" oder "rund um den Periodenbeginn"
function phaseText(phases) {
  const m = C.typicalPhase(phases);
  if (m === null) return '';
  const L = A.cycleLen;
  const pos = m * L; // 0 = Beginn von Zyklustag 1
  if (pos < 1 || pos > L - 1) return 'meist rund um den Periodenbeginn';
  const day = Math.floor(pos) + 1;
  if (day > L - 10) {
    const before = L - day + 1;
    return `meist ca. ${plural(before, 'Tag', 'Tage')} vor der Periode`;
  }
  return `meist um Zyklustag ${day}`;
}

function patternCard(title, rows) {
  if (!rows.length) return '';
  const top = rows[0].n;
  return `<div class="card"><h3>${esc(title)}</h3><ul class="pattern">${rows.map(r => {
    const when = phaseText(r.phases);
    return `
    <li>
      <span class="p-label"><span class="em" aria-hidden="true">${r.emoji}</span>${esc(r.label)}</span>
      <span class="p-bar"><span style="width:${Math.max(6, (r.n / top) * 100).toFixed(0)}%"></span></span>
      <span class="p-num">${r.n}×</span>
      ${when ? `<span class="p-sub">${when}</span>` : ''}
    </li>`;
  }).join('')}</ul></div>`;
}

const tile = (label, value, sub) => `<div class="tile"><span class="t-label">${label}</span><b>${value}</b><span class="t-sub">${sub}</span></div>`;
const emptyCard = (em, text) => `<div class="card empty"><div class="welcome-em" aria-hidden="true">${em}</div><p>${text}</p></div>`;
const statRow = (label, value, sub = '') => `<div class="stat-row"><div><span class="row-title">${label}</span>${sub ? `<span class="row-sub">${sub}</span>` : ''}</div><b>${value}</b></div>`;

function statsCycle() {
  if (!A.hasData) return emptyCard('🩸', 'Noch keine Periode eingetragen. Markier im Kalender die Tage deiner letzten Periode, dann erscheinen hier deine Zyklen.');
  const out = [];
  out.push(`<div class="tiles">
    ${tile('Ø Zyklus', plural(A.cycleLen, 'Tag', 'Tage'), A.usedCycles ? `aus ${plural(A.usedCycles, 'Zyklus', 'Zyklen')}` : 'Standardwert')}
    ${tile('Ø Periode', plural(A.periodLen, 'Tag', 'Tage'), A.usedPeriods ? `aus ${plural(A.usedPeriods, 'Periode', 'Perioden')}` : 'Standardwert')}
    ${tile('Schwankung', A.spread !== null ? `± ${plural(A.spread, 'Tag', 'Tage')}` : '–', A.spread !== null ? 'von Zyklus zu Zyklus' : 'ab 3 Zyklen')}
    ${tile('Kürzester / längster', A.shortest !== null ? `${A.shortest} / ${A.longest}` : '–', 'Zykluslänge in Tagen')}
  </div>`);
  const rows = [{ start: A.last.start, length: A.cycleDay, periodDays: A.last.end - A.last.start + 1, extraDays: A.last.extra.reduce((s, e) => s + e.end - e.start + 1, 0), current: true }];
  for (const c of [...A.cycles].reverse().slice(0, 24)) rows.push(c);
  const max = Math.max(35, A.cycleLen, ...rows.map(r => r.length));
  out.push(`<div class="card"><h3>🔄 Deine Zyklen</h3><ul class="cycles">${rows.map(r => `
    <li class="${r.note ? 'excluded' : ''}">
      <div class="c-top"><span>${r.current ? 'Aktuell · seit' : 'ab'} ${fDMY(r.start)}</span><b>${r.current ? `Tag ${r.length}` : plural(r.length, 'Tag', 'Tage')}</b></div>
      <div class="c-bar"><span class="c-len" style="width:${((r.length / max) * 100).toFixed(1)}%"><span class="c-per" style="width:${Math.min(100, (r.periodDays / r.length) * 100).toFixed(1)}%"></span></span></div>
      <div class="c-sub">Periode ${plural(r.periodDays, 'Tag', 'Tage')}${r.extraDays ? ` · Zwischenblutung ${plural(r.extraDays, 'Tag', 'Tage')}` : ''}${r.note ? ` · nicht mitgezählt: ${esc(r.note)}` : ''}</div>
    </li>`).join('')}</ul></div>`);

  const weights = Object.entries(state.days).filter(([, e]) => e.weight).map(([iso, e]) => ({ n: C.toNum(iso), w: e.weight })).sort((a, b) => a.n - b.n);
  if (weights.length) {
    const lastW = weights[weights.length - 1];
    const ref = weights.find(x => x.n >= lastW.n - 90);
    const diff = ref && ref !== lastW ? Math.round((lastW.w - ref.w) * 10) / 10 : null;
    out.push(`<div class="card"><h3>⚖️ Gewicht</h3>
      ${statRow(`Zuletzt (${fDMY(lastW.n)})`, fmtKg(lastW.w))}
      ${diff !== null ? statRow(`Veränderung seit ${fDMY(ref.n)}`, diff === 0 ? '±0 kg' : `${diff > 0 ? '+' : '−'}${fmtKg(Math.abs(diff))}`) : ''}
    </div>`);
  }
  return out.join('');
}

// Zyklus auf einen Blick: je Beschwerde/Stimmung ein Streifen über die Zyklustage
function heatCard() {
  if (!A.hasData) return '';
  const h = heatmap(state, A, today);
  if (!h.rows.length) return '';
  const L = h.len;
  const ov = Math.max(L - A.luteal, A.periodLen); // wie in der Vorhersage (0 = Zyklustag 1)
  const showF = state.settings.showFertile;
  let band = '', axis = '';
  for (let d = 0; d < L; d++) {
    band += `<i class="${d < A.periodLen ? 'p' : showF && d >= ov - 5 && d <= ov + 1 ? 'f' : ''}"></i>`;
    axis += `<i>${d === 0 || (d + 1) % 7 === 0 ? d + 1 : ''}</i>`;
  }
  const rows = h.rows.map(r => {
    const t = tagInfo(r.cat, r.id);
    if (!t) return '';
    const peak = r.cells.indexOf(r.max) + 1;
    const cells = r.cells.map(c => `<i class="l${c ? Math.max(1, Math.ceil((c / r.max) * 4)) : 0}"></i>`).join('');
    return `<div class="heat-row tone-${t.tone}">
      <div class="heat-label"><span class="em" aria-hidden="true">${t.emoji}</span><b>${esc(t.label)}</b><small>${r.total}× · meist um Tag ${peak}</small></div>
      <div class="heat-strip" role="img" aria-label="${esc(t.label)}: ${r.total}-mal eingetragen, am häufigsten um Zyklustag ${peak}">${cells}</div>
    </div>`;
  }).join('');
  return `<div class="card heat-card" style="--n:${L}"><h3>🗺️ Dein Zyklus auf einen Blick</h3>
    <p class="muted small">Jede Spalte ist ein Zyklustag. Je kräftiger die Farbe, desto öfter hast du das an diesem Tag eingetragen.</p>
    <div class="heat-strip band" aria-hidden="true">${band}</div>
    <div class="heat-strip axis" aria-hidden="true">${axis}</div>
    ${rows}
    <div class="legend small"><span><i class="lg period"></i>Periode</span>${showF ? '<span><i class="lg ov-fill"></i>Fruchtbare Tage (geschätzt)</span>' : ''}</div>
  </div>`;
}

// Jahresrückblick
function reviewYears() {
  const cur = D(today).getUTCFullYear();
  const ys = new Set([cur]);
  for (const iso of Object.keys(state.days)) { const y = Number(iso.slice(0, 4)); if (y <= cur) ys.add(y); }
  return [...ys].sort((a, b) => a - b);
}
function statsYear() {
  const years = reviewYears();
  if (!years.includes(ui.reviewYear)) ui.reviewYear = years[years.length - 1];
  const y = ui.reviewYear, i = years.indexOf(y);
  const r = yearReview(state, A, y, today);
  const nav = `<div class="year-nav">
    <button class="icon-btn" data-act="year-prev" aria-label="Vorheriges Jahr"${i <= 0 ? ' disabled' : ''}>‹</button>
    <h2>${y}</h2>
    <button class="icon-btn" data-act="year-next" aria-label="Nächstes Jahr"${i >= years.length - 1 ? ' disabled' : ''}>›</button>
  </div>`;
  if (!r.tracked) return nav + emptyCard('🗓️', `Für ${y} gibt es keine Einträge.`);
  const maxM = Math.max(1, ...r.months);
  const ML = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const bars = r.months.map((m, k) => `<div class="ym"><span class="ym-bar"><span class="bar" style="height:${m ? Math.max(8, (m / maxM) * 100).toFixed(0) : 0}%"></span></span><i>${ML[k]}</i></div>`).join('');
  const out = [nav];
  out.push(`<div class="card year-hero">
    <p class="yh-small">Dein Jahr ${y}</p>
    <p class="yh-big">${r.tracked}</p>
    <p class="yh-small">${r.tracked === 1 ? 'Tag' : 'Tage'} getrackt${r.streak >= 3 ? ` · längste Serie: ${r.streak} Tage am Stück` : ''}</p>
    <div class="ym-row" role="img" aria-label="Getrackte Tage je Monat">${bars}</div>
  </div>`);
  out.push(`<div class="tiles">
    ${tile('Perioden', r.periods, plural(r.periodDays, 'Periodentag', 'Periodentage'))}
    ${tile('Ø Zyklus', r.avgCycle ? plural(r.avgCycle, 'Tag', 'Tage') : '–', r.cycles ? `kürzester ${r.shortest} · längster ${r.longest}` : 'ab zwei Perioden')}
    ${tile('Ø Schlaf', r.avgSleep ? fmtSleep(r.avgSleep) : '–', r.sleepNights ? `aus ${plural(r.sleepNights, 'Nacht', 'Nächten')}` : 'keine Einträge')}
    ${tile('Notizen', r.notes, r.notes === 1 ? 'Tag mit Notiz' : 'Tage mit Notiz')}
  </div>`);
  const chip = t => { const info = tagInfo(t.cat, t.id); return info ? `<span class="mini-chip tone-${info.tone}"><span class="em" aria-hidden="true">${info.emoji}</span>${esc(info.label)}</span>` : ''; };
  const top = r.top.map(t => { const c = chip(t); return c ? `<li>${c}<span class="ex-sub">${t.n}×</span></li>` : ''; }).join('');
  if (top) out.push(`<div class="card"><h3>🏆 Am häufigsten eingetragen</h3><ul class="expect">${top}</ul></div>`);
  const hi = [];
  if (r.topFeel && chip(r.topFeel)) hi.push(statRow('Häufigstes Gefühl', chip(r.topFeel), `${r.topFeel.n}×`));
  if (r.topPain && chip(r.topPain)) hi.push(statRow('Häufigster Schmerz', chip(r.topPain), `${r.topPain.n}×`));
  if (hi.length) out.push(`<div class="card"><h3>💡 Auffällig in ${y}</h3>${hi.join('')}</div>`);
  return out.join('');
}

function statsPatterns() {
  const pats = collectPatterns();
  const cards = [];
  const heat = heatCard();
  if (heat) cards.push(heat);
  for (const c of CHIP_CATS) {
    const m = pats[c.id];
    if (!m) continue;
    const rows = Object.entries(m).map(([id, r]) => ({ ...r, label: OPT[c.id][id]?.label ?? id, emoji: OPT[c.id][id]?.emoji ?? '•' }))
      .sort((a, b) => b.n - a.n).slice(0, 6);
    cards.push(patternCard(c.name, rows));
  }
  if (pats.custom) {
    cards.push(patternCard('Meine Tags', Object.entries(pats.custom).map(([t, r]) => ({ ...r, label: t, emoji: '🏷️' })).sort((a, b) => b.n - a.n).slice(0, 6)));
  }
  if (!cards.length) return emptyCard('🔍', 'Noch keine Muster. Je mehr du trackst (Gefühle, Schmerzen, Energie …), desto mehr siehst du hier.');
  return '<p class="muted small intro">Wie oft du etwas eingetragen hast und wann im Zyklus es meistens auftritt (Zyklustag 1 = erster Periodentag).</p>' + cards.join('');
}

// Alle Nächte, zu denen etwas eingetragen ist (Dauer, Uhrzeiten, Tablette oder Schlafqualität)
function sleepNights() {
  return Object.entries(state.days).map(([iso, e]) => {
    const q = e.tags.sleepq || [];
    return {
      n: C.toNum(iso), sleep: e.sleep, bed: e.bed, wake: e.wake,
      pill: !!e.pill, pillAt: e.pill ? e.pill.at : null,
      rested: q.includes('erholt') ? true : q.includes('muede') ? false : null,
      has: hasSleepInfo(e) || q.length > 0,
    };
  }).filter(x => x.has && x.n <= today).sort((a, b) => a.n - b.n);
}

function sleepChart(nights, goal) {
  const byN = new Map(nights.map(x => [x.n, x]));
  const days = [];
  for (let n = today - 13; n <= today; n++) days.push(n);
  const max = Math.max(goal + 90, ...days.map(n => (byN.get(n) || {}).sleep || 0));
  const cols = days.map(n => {
    const x = byN.get(n);
    const v = x && x.sleep;
    const cls = !v ? 'none' : v >= goal - 15 ? 'ok' : v >= goal - 90 ? 'mid' : 'low';
    const h = v ? Math.max(3, (v / max) * 100) : 0;
    return `<div class="bar-col" title="${esc(fLong(n))}: ${v ? fmtSleep(v) : 'kein Eintrag'}"><span class="bar ${cls}" style="height:${h.toFixed(1)}%"></span></div>`;
  }).join('');
  const labels = days.map(n => `<span>${(byN.get(n) || {}).pill ? '💊' : ''}<i>${WD1[weekdayIdx(n)]}</i></span>`).join('');
  return `<div class="card"><h3>📈 Letzte 14 Nächte</h3>
    <div class="chart" role="img" aria-label="Schlafdauer der letzten 14 Nächte">
      <div class="plot"><div class="goal-line" style="bottom:${((goal / max) * 100).toFixed(1)}%"><span>Ziel ${fmtSleep(goal)}</span></div>${cols}</div>
      <div class="chart-labels">${labels}</div>
    </div>
    <div class="legend small"><span><i class="lg bar-ok"></i>Ziel erreicht</span><span><i class="lg bar-mid"></i>bis 1,5 Std. darunter</span><span><i class="lg bar-low"></i>deutlich zu wenig</span></div>
  </div>`;
}

function phaseRows(map, fmtVal) {
  return PHASES.filter(([k]) => map[k]).map(([k, name, em]) => statRow(`${em} ${name}`, fmtVal(map[k]), plural(map[k].n, 'Nacht', 'Nächte'))).join('');
}

function pillCard(nights) {
  if (!nights.some(x => x.pill)) {
    return `<div class="card"><h3>💊 Schlaftabletten</h3><p class="muted small">Noch keine eingetragen. Abends beim „Schlafen gehen“ abhaken oder beim Tracken unter „Schlaf“.</p></div>`;
  }
  // Verglichen werden nur Nächte, seit es das Tabletten-Tracking gibt (bzw. ab der ersten eingetragenen Tablette)
  const firstPill = nights.find(x => x.pill).n;
  const since = Math.min(C.toNum(state.meta.pillSince), firstPill);
  nights = nights.filter(x => x.n >= since);
  const p = S.pillStats(nights, today);
  let body = '';
  if (p.nights7) body += statRow('Letzte 7 Tage', plural(p.pills7, 'Nacht', 'Nächte'), `von ${plural(p.nights7, 'eingetragenen Nacht', 'eingetragenen Nächten')}`);
  if (p.nights30) body += statRow('Letzte 30 Tage', plural(p.pills30, 'Nacht', 'Nächte'), `von ${plural(p.nights30, 'eingetragenen Nacht', 'eingetragenen Nächten')}`);
  if (p.pillTime) body += statRow('Ø Einnahme', `${S.fmtTime(p.pillTime.mean)} Uhr`, `± ${p.pillTime.sd} Min.`);
  if (p.gapToBed !== null) body += statRow('Ø bis zum Schlafengehen', `${p.gapToBed} Min.`);
  if (p.avgWith !== null && p.avgWithout !== null) body += statRow('Ø Schlaf mit / ohne Tablette', `${fmtSleep(p.avgWith)} / ${fmtSleep(p.avgWithout)}`);
  if (p.restedWith !== null && p.restedWithout !== null) body += statRow('Erholt aufgewacht mit / ohne', `${p.restedWith} % / ${p.restedWithout} %`);
  if (A.hasData) {
    const share = S.pillShareBy(nights, n => C.phaseOf(n, A));
    const rows = phaseRows(share, v => `${v.share} %`);
    if (rows) body += `<h4>Anteil Nächte mit Tablette je Zyklusphase</h4>${rows}`;
  }
  body += '<p class="muted small">Nur deine eigenen Einträge zum Nachvollziehen – keine medizinische Bewertung.</p>';
  return `<div class="card"><h3>💊 Schlaftabletten</h3>${body}</div>`;
}

function statsSleep() {
  const nights = sleepNights();
  if (!nights.length) return emptyCard('😴', 'Noch keine Schlafdaten. Abends auf „Schlafen gehen“ tippen, morgens auf „Aufgewacht“ – oder beim Tracken unter „Schlaf“ eintragen.');
  const goal = state.settings.sleepGoal;
  const st = S.sleepStats(nights, today, goal);
  const out = [];
  out.push(`<div class="tiles">
    ${tile('Ø letzte 7 Nächte', st.avg7 ? fmtSleep(st.avg7) : '–', st.n7 ? `aus ${plural(st.n7, 'Nacht', 'Nächten')}` : 'keine Einträge')}
    ${tile('Ø letzte 30 Nächte', st.avg30 ? fmtSleep(st.avg30) : '–', st.n30 ? `aus ${plural(st.n30, 'Nacht', 'Nächten')}` : 'keine Einträge')}
    ${tile('Schlafdefizit (7 Tage)', st.debt7 === null ? '–' : st.debt7 === 0 ? 'keins 🎉' : fmtSleep(st.debt7), `bei Ziel ${fmtSleep(goal)}`)}
    ${tile('Ziel erreicht', st.n7 ? `${st.goalMet7} von ${st.n7}` : '–', 'Nächte (7 Tage)')}
  </div>`);
  out.push(sleepChart(nights, goal));
  if (st.bed || st.wake) {
    out.push(`<div class="card"><h3>🕰️ Schlafrhythmus <small>(14 Tage)</small></h3>
      ${st.bed ? statRow('Ø schlafen gegangen', `${S.fmtTime(st.bed.mean)} Uhr`, `± ${st.bed.sd} Min. · ${S.regularity(st.bed.sd)}`) : ''}
      ${st.wake ? statRow('Ø aufgewacht', `${S.fmtTime(st.wake.mean)} Uhr`, `± ${st.wake.sd} Min. · ${S.regularity(st.wake.sd)}`) : ''}
      <p class="muted small">Regelmäßige Schlafenszeiten helfen beim Einschlafen. Ab 3 Nächten mit Uhrzeit.</p>
    </div>`);
  }
  if (A.hasData) {
    const all = nights.filter(x => x.sleep);
    const avgAll = all.length ? Math.round(all.reduce((s, x) => s + x.sleep, 0) / all.length) : 0;
    const rows = phaseRows(S.averageBy(nights, n => C.phaseOf(n, A)), v => `${fmtSleep(v.avg)} <small>${fmtDiff(v.avg - avgAll)}</small>`);
    out.push(`<div class="card"><h3>🔄 Schlaf je Zyklusphase</h3>${rows || '<p class="muted small">Ab 2 Nächten je Phase siehst du hier, ob du z. B. vor der Periode schlechter schläfst.</p>'}
      ${rows ? `<p class="muted small">Vergleich mit deinem Gesamtschnitt (${fmtSleep(avgAll)}).</p>` : ''}</div>`);
  }
  out.push(pillCard(nights));
  return out.join('');
}

function renderStats() {
  if (!Object.keys(state.days).length) {
    $('#view-stats').innerHTML = emptyCard('📊', 'Noch keine Daten. Sobald du Periodentage, Schlaf und Symptome einträgst, siehst du hier deine Zyklen und Muster.');
    return;
  }
  const tabs = [['cycle', '🔄 Zyklus'], ['sleep', '😴 Schlaf'], ['patterns', '🔍 Muster'], ['year', '✨ Jahr']];
  const seg = `<div class="seg-tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-act="stats-tab" data-v="${k}" aria-selected="${ui.statsTab === k}" class="${ui.statsTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const body = ui.statsTab === 'sleep' ? statsSleep() : ui.statsTab === 'patterns' ? statsPatterns() : ui.statsTab === 'year' ? statsYear() : statsCycle();
  $('#view-stats').innerHTML = seg + body;
}

// --- Einstellungen -----------------------------------------------------------
function catToggles() {
  const hidden = new Set(state.settings.hiddenCats);
  return CATS.filter(c => !c.fixed).map(c => `
    <label class="row compact"><span class="row-title">${esc(c.name)}</span>
      <span class="switch"><input type="checkbox" data-cat-toggle="${c.id}" ${hidden.has(c.id) ? '' : 'checked'}><span></span></span>
    </label>`).join('');
}
const fmtSetting = (key, v) => (key === 'sleepGoal' ? fmtSleep(v) : v);

function renderSettings() {
  const s = state.settings;
  const stepper = (key, label, sub) => `
    <div class="row"><div><div class="row-title">${label}</div><div class="row-sub">${sub}</div></div>
      <div class="stepper" data-key="${key}">
        <button data-step="-1" aria-label="${label} verringern">−</button><output>${fmtSetting(key, s[key])}</output><button data-step="1" aria-label="${label} erhöhen">+</button>
      </div>
    </div>`;
  const nDays = Object.keys(state.days).length;
  const lb = state.meta.lastBackup;
  $('#view-settings').innerHTML = `
    <div class="card"><h3>👤 Persönlich</h3>
      <label class="row"><div><div class="row-title">Dein Name</div><div class="row-sub">Für die Begrüßung, bleibt nur auf diesem Gerät.</div></div>
        <input id="name-input" class="name-input" type="text" maxlength="30" autocomplete="given-name" placeholder="Vorname" value="${esc(s.name)}"></label>
      <label class="row"><div><div class="row-title">Zoomen sperren</div><div class="row-sub">Kein versehentliches Reinzoomen mit zwei Fingern oder Doppeltippen.</div></div>
        <span class="switch"><input type="checkbox" data-setting="zoomLock" ${s.zoomLock ? 'checked' : ''}><span></span></span>
      </label>
      <div class="row"><div><div class="row-title">Farbthema</div><div class="row-sub"><span id="theme-name">${esc((THEME[s.theme] || THEME.rose)[1])}</span> · passt sich hell und dunkel an</div></div></div>
      <div class="theme-pick" role="radiogroup" aria-label="Farbthema">
        ${THEMES.map(([id, name, acc, tint]) => `<label class="swatch" style="--sw:${acc};--sw2:${tint}"><input type="radio" name="theme" value="${id}" ${(THEME[s.theme] ? s.theme : 'rose') === id ? 'checked' : ''} aria-label="${esc(name)}"><i aria-hidden="true"></i><span>${esc(name)}</span></label>`).join('')}
      </div>
    </div>
    <details class="card fold" id="fold-show"${ui.folds.has('fold-show') ? ' open' : ''}><summary><h3>🧩 Anzeige <small>was du sehen möchtest</small></h3></summary>
      <p class="muted small">Schalte aus, was du nicht brauchst. Deine Einträge bleiben davon unberührt.</p>
      ${SHOW.map(([k, title, sub]) => `<label class="row"><div><div class="row-title">${title}</div><div class="row-sub">${sub}</div></div>
        <span class="switch"><input type="checkbox" data-show="${k}" ${s.show[k] ? 'checked' : ''}><span></span></span></label>`).join('')}
    </details>
    <div class="card"><h3>🔮 Vorhersage</h3>
      ${stepper('cycleLength', 'Zykluslänge', A.usedCycles ? `Gerade nicht im Einsatz – die App nutzt deinen Schnitt (${A.cycleLen} Tage).` : 'Gilt, bis ein ganzer Zyklus eingetragen ist.')}
      ${stepper('periodLength', 'Periodendauer', A.usedPeriods ? `Gerade nicht im Einsatz – dein Schnitt: ${A.periodLen} Tage.` : 'Gilt, bis eine Periode eingetragen ist.')}
      ${stepper('lutealLength', 'Lutealphase', 'Tage vom Eisprung bis zur Periode, meist 14.')}
      <label class="row"><div><div class="row-title">Fruchtbare Tage anzeigen</div><div class="row-sub">Kalender-Schätzung, kein Verhütungsmittel.</div></div>
        <span class="switch"><input type="checkbox" data-setting="showFertile" ${s.showFertile ? 'checked' : ''}><span></span></span>
      </label>
    </div>
    <div class="card"><h3>😴 Schlaf</h3>
      ${stepper('sleepGoal', 'Schlafziel', 'Pro Nacht – für Schlafdefizit und Diagramm.')}
      <label class="row"><div><div class="row-title">Schlaftablette</div><div class="row-sub">Mittel/Dosis, wird beim Abhaken vorgeschlagen.</div></div>
        <input id="pillname-setting" class="name-input" type="text" maxlength="${PILL_MAX}" placeholder="z. B. Name, mg" value="${esc(s.pillName)}" autocomplete="off"></label>
    </div>
    <details class="card fold" id="fold-cats"${ui.folds.has('fold-cats') ? ' open' : ''}><summary><h3>📝 Tracking-Kategorien</h3></summary>
      <p class="muted small">Ausgeblendete Kategorien tauchen beim Tracken nicht auf. Gespeicherte Einträge bleiben erhalten.</p>
      ${catToggles()}
      <h4>Meine Tags</h4>
      ${s.customTags.length
        ? `<div class="tag-list">${s.customTags.map(t => `<span class="tag-item">${esc(t)}<button data-del-tag="${esc(t)}" aria-label="Tag ${esc(t)} löschen">✕</button></span>`).join('')}</div>`
        : '<p class="muted small">Noch keine. Eigene Tags legst du beim Tracken unter „Meine Tags“ an.</p>'}
    </details>
    ${pushCard()}
    ${remindCard()}
    <div class="card"><h3>💾 Backup</h3>
      <p class="muted small">Deine Einträge liegen nur auf diesem Gerät. Wird die App gelöscht oder das Handy gewechselt, sind sie ohne Backup weg. Das Backup ist eine Datei, die du z. B. in „Dateien“ oder iCloud ablegst.</p>
      <div class="btn-row"><button class="btn primary" data-act="export">Backup speichern</button><button class="btn" data-act="import">Backup laden</button></div>
      <p class="row-sub">Letztes Backup: ${lb ? esc(fDMY(C.todayNum(new Date(lb)))) : 'noch keins'}</p>
      <h4>Aus einer anderen App übernehmen</h4>
      <p class="muted small">Clue: Einstellungen → „Meine Daten herunterladen“, dann hier die Datei <b>measurements.json</b> (oder das ZIP) wählen. Deine Einträge in dieser App bleiben dabei immer erhalten, Clue ergänzt nur.</p>
      <div class="btn-row"><button class="btn" data-act="clue-import">📥 Aus Clue importieren</button>${undoInfo() ? '<button class="btn ghost" data-act="undo-import">Import rückgängig</button>' : ''}</div>
      ${undoInfo() ? `<p class="row-sub">Sicherheitskopie vom ${esc(undoInfo())} – „Rückgängig“ stellt den Stand vor dem Import wieder her.</p>` : ''}
    </div>
    <details class="card fold" id="notes"${ui.folds.has('notes') ? ' open' : ''}><summary><h3>✨ Neuigkeiten <small>Version ${esc(APP_VERSION)}</small></h3></summary>
      ${NOTES.map((n, i) => `<details class="notes"${i === 0 ? ' open' : ''}><summary>Version ${esc(n.v)} <small>${esc(n.date)}</small></summary><ul class="plain">${n.items.map(it => `<li>${esc(it)}</li>`).join('')}</ul></details>`).join('')}
    </details>
    <details class="card fold" id="fold-features"${ui.folds.has('fold-features') ? ' open' : ''}><summary><h3>📋 Funktionen</h3></summary>
      <ul class="features">${FEATURES.map(([em, t, d]) => `<li><span class="em" aria-hidden="true">${em}</span><div><b>${esc(t)}</b><p>${esc(d)}</p></div></li>`).join('')}</ul>
    </details>
    <details class="card fold" id="fold-privacy"${ui.folds.has('fold-privacy') ? ' open' : ''}><summary><h3>🔒 Datenschutz</h3></summary>
      <ul class="plain">
        <li>Kein Konto, keine Cloud, keine Werbung, keine Analyse-Tools.</li>
        <li>Einträge verlassen dieses Gerät nie – außer du speicherst selbst ein Backup.</li>
        <li>Aus dem Internet lädt die App nur ihren eigenen Programmcode (für Updates).</li>
        <li>Nur wenn du „Mitteilungen“ einschaltest: Ein Weck-Dienst bekommt die Push-Adresse dieses Geräts und Uhrzeiten, zu denen er es anstoßen soll – keine Einträge, keine Texte, keinen Namen.</li>
      </ul>
    </details>
    <div class="card"><button class="btn danger wide" data-act="wipe">Alle Daten löschen</button></div>
    <p class="foot">Zyklus ${APP_VERSION} · ${plural(nDays, 'Tag', 'Tage')} eingetragen<br><span class="made">Made with ❤️ by Dogu · Privacy by Design</span><br><button class="link" data-act="check-update">Nach Updates suchen</button></p>`;
}

function stepSetting(key, dir) {
  const [lo, hi] = RANGES[key];
  state.settings[key] = Math.min(hi, Math.max(lo, state.settings[key] + dir * (STEPS[key] || 1)));
  commit();
}

// ---------------------------------------------------------------------------
// Tracking-Bildschirm
// ---------------------------------------------------------------------------
const tr = { n: null, draft: null, dirty: false, q: '', addingTag: false, info: new Set() };

function openTracker(n) {
  if (n > today) return toast(FUTURE_MSG);
  loadDay(n);
  tr.q = '';
  tr.addingTag = false;
  $('#tr-search').value = '';
  $('#tr-custom').hidden = true;
  const trEl = $('#tracker');
  clearTimeout(trCloseT); // falls er gerade noch hinausgleitet
  trEl.classList.remove('closing');
  trEl.hidden = false; // die Einblend-Animation startet von selbst (CSS)
  document.body.classList.add('tr-open');
  renderTracker();
  $('#tr-scroll').scrollTop = 0;
  const title = $('#tr-title');
  if (title) { title.setAttribute('tabindex', '-1'); title.focus({ preventScroll: true }); }
}
function loadDay(n) {
  tr.n = n;
  tr.draft = entry(n);
  tr.dirty = false;
}
let trCloseT = null;
function hideTracker() {
  if (pendingReload && !reloading) { reloading = true; setTimeout(() => location.reload(), 300); }
  const trEl = $('#tracker');
  if (motionOk()) {
    // kurz hinausgleiten lassen; währenddessen nimmt er keine Tipps mehr an (pointer-events: none)
    trEl.classList.add('closing');
    clearTimeout(trCloseT);
    trCloseT = setTimeout(() => { trEl.hidden = true; trEl.classList.remove('closing'); }, 200);
  } else trEl.hidden = true;
  document.body.classList.remove('tr-open');
  tr.n = null;
  tr.draft = null;
  render();
}
let askResolve = null;
function askUnsaved() {
  $('#tr-ask').hidden = false;
  $('#tr-ask [data-ask="save"]').focus();
  return new Promise(resolve => { askResolve = resolve; });
}
function answerAsk(choice) {
  $('#tr-ask').hidden = true;
  const r = askResolve;
  askResolve = null;
  if (r) r(choice);
}
// Vor dem Verlassen eines Tages: nie stillschweigend etwas verwerfen.
async function leaveDay(next) {
  if (tr.dirty) {
    const choice = await askUnsaved();
    if (choice === 'stay') return;
    if (choice === 'save' && !commitDraft()) return; // Speichern fehlgeschlagen: Entwurf behalten
    if (choice === 'save') toast('Gespeichert');
  }
  next();
}
function commitDraft() {
  if (tr.draft.pill && tr.draft.pill.name.trim()) state.settings.pillName = tr.draft.pill.name.trim().slice(0, PILL_MAX);
  putEntry(tr.n, tr.draft);
  const ok = save();
  if (ok) tr.dirty = false;
  A = C.analyze(state, today);
  return ok;
}
function trGoto(n) {
  n = Math.min(today, n);
  if (n === tr.n) return;
  leaveDay(() => { loadDay(n); renderTracker(); });
}
function markDirty() {
  tr.dirty = true;
  $('#tr-save').disabled = false;
  updateJump();
}

// Sprungleiste: alle Kategorien als Reihe zum Wischen; ein Tipp springt hin. Markiert ist, wo schon etwas steht.
function catHas(c, d) {
  if (!c.type) return (d.tags[c.id] || []).length > 0;
  if (c.type === 'sleep') return hasSleepInfo(d);
  if (c.type === 'note') return !!d.note.trim();
  if (c.type === 'custom') return d.custom.length > 0;
  if (c.type === 'weight') return !!d.weight;
  return false;
}
function renderJump() {
  const hidden = new Set(state.settings.hiddenCats);
  $('#tr-jump').hidden = !state.settings.show.jump;
  $('#tr-jump').innerHTML = CATS.filter(c => c.fixed || !hidden.has(c.id))
    .map(c => `<button class="jump${catHas(c, tr.draft) ? ' has' : ''}" data-jump="${c.id}"><span class="em" aria-hidden="true">${ICON[c.id]}</span>${esc(c.name)}</button>`).join('');
}
function updateJump() {
  if (!tr.draft) return;
  for (const b of $$('#tr-jump .jump')) b.classList.toggle('has', catHas(CAT[b.dataset.jump], tr.draft));
}
function jumpTo(id) {
  if (tr.q) { tr.q = ''; $('#tr-search').value = ''; renderTrBody(); }
  const sec = $(`#tr-body [data-sec="${id}"]`);
  if (sec) sec.scrollIntoView({ behavior: motionOk() ? 'smooth' : 'auto', block: 'start' });
}

// Schnell eintragen: „Wie gestern“ und die eigenen Favoriten ganz oben
function quickHtml() {
  if (tr.q.trim() || !state.settings.show.quick) return '';
  const hidden = state.settings.hiddenCats;
  const prev = state.days[C.toIso(tr.n - 1)];
  const pre = prev ? copyPreview(tr.draft, prev, hidden).map(x => tagInfo(x.cat, x.id)).filter(Boolean) : [];
  const favs = favorites(state.days, C.toIso(today - FAV_DAYS), { skip: hidden });
  if (!pre.length && !favs.length) return '';
  const copyBtn = pre.length
    ? `<button class="copy-btn" data-act="copy-prev"><span class="em" aria-hidden="true">↺</span><span class="cb-text"><b>${tr.n === today ? 'Wie gestern' : 'Wie am Vortag'}</b><small>${esc(pre.slice(0, 3).map(t => t.label).join(', '))}${pre.length > 3 ? ` +${pre.length - 3}` : ''}</small></span><span class="cb-go" aria-hidden="true">Übernehmen</span></button>`
    : '';
  const chips = favs.map(f => {
    const t = tagInfo(f.cat, f.id);
    if (!t) return '';
    const on = f.cat === 'custom' ? tr.draft.custom.includes(f.id) : (tr.draft.tags[f.cat] || []).includes(f.id);
    const attr = f.cat === 'custom' ? `data-ctag="${esc(f.id)}"` : `data-chip="${f.cat}:${f.id}"`;
    return `<button class="chip compact tone-${t.tone}${on ? ' on' : ''}" ${attr} aria-pressed="${on}"><span class="em" aria-hidden="true">${t.emoji}</span>${esc(t.label)}</button>`;
  }).join('');
  return `<section class="tr-quick" data-sec="quick"><h2>⚡ Schnell eintragen</h2>${copyBtn}${chips ? `<p class="sec-sub">Trägst du oft ein</p><div class="chips">${chips}</div>` : ''}</section>`;
}
function rerenderQuick() {
  const old = $('#tr-body [data-sec="quick"]');
  const html = quickHtml();
  if (old) { if (html) old.outerHTML = html; else old.remove(); }
  else if (html && !tr.q.trim()) $('#tr-body').insertAdjacentHTML('afterbegin', html);
}

function renderTracker() {
  $('#tr-title').textContent = tr.n === today ? `Heute: ${fTitle(tr.n)}` : fWdTitle(tr.n);
  renderWeek();
  renderTrBody();
  $('#tr-save').disabled = !tr.dirty;
}

// Die Leiste zeigt 7-Tage-Fenster, die an heute ausgerichtet sind: das erste endet heute,
// das davor eine Woche früher usw. So ist gestern immer zu sehen und nichts springt beim Antippen.
function weekStart(n) {
  const k = Math.floor((today - n) / 7);
  return today - 7 * k - 6;
}
function renderWeek() {
  const start = weekStart(tr.n);
  const showF = state.settings.showFertile;
  let days = '';
  let letters = '';
  for (let i = 0; i < 7; i++) {
    const n = start + i;
    letters += `<span>${WD1[weekdayIdx(n)]}</span>`;
    const e = n === tr.n ? tr.draft : state.days[C.toIso(n)];
    const isP = n <= today && C.isPeriodDay(e);
    const cls = ['wk-day'];
    if (n === tr.n) cls.push('sel');
    if (n === today) cls.push('today');
    if (n > today) cls.push('future');
    if (isP) cls.push('period');
    else if (A.predicted.has(n)) cls.push('pred');
    else if (showF && A.fertile.has(n)) cls.push('fertile');
    const logged = e && (n === tr.n ? hasContent(e) : true);
    days += `<button class="${cls.join(' ')}" data-wk="${n}" ${n > today ? 'disabled' : ''} aria-label="${esc(fLong(n))}">${logged ? '<i class="wk-log"></i>' : ''}<span class="wk-bar"></span><span class="wk-num">${D(n).getUTCDate()}</span></button>`;
  }
  $('#tr-week').innerHTML = `
    <div class="wk-row wk-letters" aria-hidden="true"><span></span>${letters}<span></span></div>
    <div class="wk-row">
      <button class="wk-nav" data-act="wk-prev" aria-label="Eine Woche zurück">‹</button>
      ${days}
      <button class="wk-nav" data-act="wk-next" aria-label="Eine Woche vor" ${start + 6 >= today ? 'disabled' : ''}>›</button>
    </div>`;
}

function secHead(c, extra = '') {
  const open = tr.info.has(c.id);
  return `<div class="sec-head"><h2><span class="em" aria-hidden="true">${ICON[c.id] || ''}</span>${esc(c.name)}</h2>${c.info ? `<button class="more" data-info="${c.id}" aria-expanded="${open}">Mehr erfahren <span aria-hidden="true">${open ? '⌃' : '›'}</span></button>` : ''}${extra}</div>${open ? `<p class="sec-info">${esc(c.info)}</p>` : ''}`;
}

function sectionHtml(c) {
  const q = tr.q.trim().toLowerCase();
  const nameHit = !q || c.name.toLowerCase().includes(q) || (c.keywords || '').includes(q);
  if (!c.type) {
    const opts = nameHit ? c.opts : c.opts.filter(o => o[1].toLowerCase().includes(q));
    if (!opts.length) return '';
    const sel = new Set(tr.draft.tags[c.id] || []);
    const chips = opts.map(([id, label, em]) => `<button class="chip${sel.has(id) ? ' on' : ''}${c.id === 'period' ? ` flow-${id}` : ''}" data-chip="${c.id}:${id}" aria-pressed="${sel.has(id)}"><span class="em" aria-hidden="true">${em}</span>${esc(label)}</button>`).join('');
    return `<section class="tr-sec" data-sec="${c.id}">${secHead(c)}<div class="chips tone-${c.tone}">${chips}</div></section>`;
  }
  if (c.type === 'custom') {
    const all = [...state.settings.customTags];
    for (const t of tr.draft.custom) if (!all.includes(t)) all.push(t);
    const tags = nameHit ? all : all.filter(t => t.toLowerCase().includes(q));
    if (!nameHit && !tags.length) return '';
    const sel = new Set(tr.draft.custom);
    const add = tr.addingTag
      ? `<div class="tag-new"><input id="tag-input" type="text" maxlength="30" placeholder="z. B. Pille vergessen, Sport …" enterkeyhint="done" aria-label="Name des neuen Tags"><button class="btn small primary" data-act="tag-add">Hinzufügen</button></div>`
      : '';
    const chips = tags.length
      ? `<div class="chips tone-violet">${tags.map(t => `<button class="chip${sel.has(t) ? ' on' : ''}" data-ctag="${esc(t)}" aria-pressed="${sel.has(t)}"><span class="em" aria-hidden="true">🏷️</span>${esc(t)}</button>`).join('')}</div>`
      : (tr.addingTag ? '' : '<div class="tag-empty">Leg eigene Tags an, z. B. „Pille vergessen“, „Sport“ oder „Alkohol“.</div>');
    return `<section class="tr-sec" data-sec="custom">${secHead(c, '<button class="more add" data-act="tag-new">＋ Neuen Tag erstellen</button>')}${add}${chips}</section>`;
  }
  if (!nameHit) return '';
  if (c.type === 'sleep') {
    const d = tr.draft;
    const auto = d.bed !== null && d.wake !== null;
    const h = d.sleep ? String(Math.floor(d.sleep / 60)).padStart(2, '0') : '';
    const m = d.sleep ? String(d.sleep % 60).padStart(2, '0') : '';
    const ro = auto ? ' readonly tabindex="-1"' : '';
    const pill = d.pill;
    return `<section class="tr-sec" data-sec="sleep">${secHead(c)}
      <p class="sec-sub">Gilt für die Nacht vor diesem Tag.</p>
      <div class="time-row">
        <label class="time-field"><span>🌙 Schlafen gegangen</span><input id="sl-bed" type="time" value="${d.bed !== null ? S.fmtTime(d.bed) : ''}"></label>
        <label class="time-field"><span>☀️ Aufgewacht</span><input id="sl-wake" type="time" value="${d.wake !== null ? S.fmtTime(d.wake) : ''}"></label>
      </div>
      <div class="num-box${auto ? ' auto' : ''}">
        <label><input id="sl-h" class="big-num" type="text" inputmode="numeric" autocomplete="off" placeholder="00" value="${h}" aria-label="Stunden Schlaf"${ro}><span>Std.</span></label>
        <label><input id="sl-m" class="big-num" type="text" inputmode="numeric" autocomplete="off" placeholder="00" value="${m}" aria-label="Minuten Schlaf"${ro}><span>Min.</span></label>
      </div>
      <p class="sec-sub" id="sl-hint">${sleepHint(d)}</p>
      <div class="chips tone-indigo"><button class="chip${pill ? ' on' : ''}" data-act="pill-toggle" aria-pressed="${!!pill}"><span class="em" aria-hidden="true">💊</span>Schlaftablette genommen</button></div>
      ${pill ? `<div class="time-row pill-row">
        <label class="time-field"><span>Eingenommen um</span><input id="pill-at" type="time" value="${pill.at !== null ? S.fmtTime(pill.at) : ''}"></label>
        <label class="time-field grow"><span>Mittel / Dosis</span><input id="pill-name" type="text" maxlength="${PILL_MAX}" placeholder="z. B. Name, mg" value="${esc(pill.name)}" autocomplete="off"></label>
      </div>` : ''}
    </section>`;
  }
  if (c.type === 'weight') {
    const w = tr.draft.weight != null ? String(tr.draft.weight).replace('.', ',') : '';
    return `<section class="tr-sec" data-sec="weight">${secHead(c)}
      <div class="num-box"><label><input id="wt" class="big-num wide" type="text" inputmode="decimal" maxlength="5" placeholder="00,0" value="${w}" aria-label="Gewicht in Kilogramm"><span>kg</span></label></div></section>`;
  }
  if (c.type === 'note') {
    return `<section class="tr-sec" data-sec="note">${secHead(c)}
      <textarea id="note" maxlength="${NOTE_MAX}" rows="4" placeholder="Gibt es noch etwas, das du festhalten möchtest?">${esc(tr.draft.note)}</textarea>
      <div class="counter"><span id="note-count">${tr.draft.note.length}</span>/${NOTE_MAX}</div></section>`;
  }
  return '';
}

function sleepHint(d) {
  if (d.bed !== null && d.wake !== null) {
    return d.sleep ? 'Dauer aus den Uhrzeiten berechnet.' : '⚠️ Die Uhrzeiten ergeben keine sinnvolle Schlafdauer – bitte prüfen.';
  }
  return 'Uhrzeiten eintragen oder die Dauer direkt.';
}
// Uhrzeit geändert: Dauer neu rechnen, ohne den Bereich neu zu zeichnen (sonst schließt sich die Uhr-Auswahl)
function readSleepTimes() {
  const d = tr.draft;
  d.bed = S.parseTime($('#sl-bed').value);
  d.wake = S.parseTime($('#sl-wake').value);
  const auto = d.bed !== null && d.wake !== null;
  if (auto) d.sleep = S.durationFromTimes(d.bed, d.wake);
  for (const id of ['#sl-h', '#sl-m']) {
    const el = $(id);
    el.readOnly = auto;
    el.tabIndex = auto ? -1 : 0;
  }
  $('#sl-h').value = d.sleep ? String(Math.floor(d.sleep / 60)).padStart(2, '0') : '';
  $('#sl-m').value = d.sleep ? String(d.sleep % 60).padStart(2, '0') : '';
  $('#tr-body .num-box').classList.toggle('auto', auto);
  $('#sl-hint').textContent = sleepHint(d);
  markDirty();
}

function renderTrBody() {
  const hidden = new Set(state.settings.hiddenCats);
  let html = quickHtml();
  for (const c of CATS) if (c.fixed || !hidden.has(c.id)) html += sectionHtml(c);
  renderJump();
  if (!html) html = `<p class="empty-search">Nichts gefunden für „${esc(tr.q)}“.</p>`;
  if (hidden.size && !tr.q) html += `<p class="tr-foot">${plural(hidden.size, 'Kategorie ist', 'Kategorien sind')} ausgeblendet – oben rechts über das Regler-Symbol wieder einblenden.</p>`;
  $('#tr-body').innerHTML = html;
}
function rerenderSection(id) {
  const old = $(`#tr-body [data-sec="${id}"]`);
  if (!old) return renderTrBody();
  const html = sectionHtml(CAT[id]);
  if (html) old.outerHTML = html;
  else old.remove();
}

function toggleChip(catId, id) {
  const c = CAT[catId];
  toggle(tr.draft.tags, catId, id);
  markDirty();
  rerenderSection(catId);
  if (c.clears) rerenderSection(c.clears);
  if (catId === 'period' || catId === 'spot') renderWeek();
  rerenderQuick();
  if ((tr.draft.tags[catId] || []).includes(id)) for (const b of $$(`#tr-body [data-chip="${catId}:${id}"]`)) pop(b);
}
function toggleCustomTag(name) {
  const i = tr.draft.custom.indexOf(name);
  if (i >= 0) tr.draft.custom.splice(i, 1);
  else tr.draft.custom.push(name);
  markDirty();
  rerenderSection('custom');
  rerenderQuick();
  if (i < 0) for (const b of $$('#tr-body [data-ctag]')) if (b.dataset.ctag === name) pop(b);
}
function addCustomTag() {
  const inp = $('#tag-input');
  const name = (inp ? inp.value : '').trim().replace(/\s+/g, ' ').slice(0, 30);
  if (!name) { if (inp) inp.focus(); return; }
  const tags = state.settings.customTags;
  const existing = tags.find(t => t.toLowerCase() === name.toLowerCase());
  if (!existing) {
    if (tags.length >= TAG_MAX) return toast(`Maximal ${TAG_MAX} eigene Tags`);
    tags.push(name);
    save();
  }
  const nm = existing || name;
  if (!tr.draft.custom.includes(nm)) { tr.draft.custom.push(nm); markDirty(); }
  tr.addingTag = false;
  rerenderSection('custom');
}
function deleteCustomTag(name) {
  if (!confirm(`Tag „${name}“ löschen? Er wird auch aus allen Tagen entfernt.`)) return;
  state.settings.customTags = state.settings.customTags.filter(t => t !== name);
  for (const [iso, e] of Object.entries(state.days)) {
    if (!e.custom.includes(name)) continue;
    putEntry(C.toNum(iso), { ...e, custom: e.custom.filter(t => t !== name) });
  }
  commit();
  toast('Tag gelöscht');
}

function readSleep() {
  const h = parseInt($('#sl-h').value, 10), m = parseInt($('#sl-m').value, 10);
  const hh = Number.isFinite(h) ? Math.min(24, Math.max(0, h)) : 0;
  const mm = hh >= 24 ? 0 : Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0;
  const tot = Math.min(1440, hh * 60 + mm);
  tr.draft.sleep = tot > 0 ? tot : null;
  markDirty();
}
function readWeight(final) {
  const inp = $('#wt');
  const v = inp.value.trim().replace(',', '.');
  const f = parseFloat(v);
  const ok = Number.isFinite(f) && f >= 20 && f <= 300;
  tr.draft.weight = ok ? Math.round(f * 10) / 10 : null;
  markDirty();
  if (final) {
    if (v && !ok) toast('Gewicht bitte zwischen 20 und 300 kg');
    inp.value = tr.draft.weight != null ? String(tr.draft.weight).replace('.', ',') : '';
  }
}

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------
function markBackup() {
  state.meta.lastBackup = new Date().toISOString();
  save();
  render();
}
async function exportBackup() {
  const json = JSON.stringify({ ...state, exported: new Date().toISOString() }, null, 1);
  const name = `zyklus-backup-${C.toIso(today)}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Zyklus-Backup' });
      markBackup();
      toast('Backup gespeichert');
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  markBackup();
  toast('Backup-Datei erstellt');
}
async function importBackup(file) {
  let data;
  try {
    const obj = JSON.parse(await file.text());
    if (!obj || typeof obj !== 'object' || !obj.days || typeof obj.days !== 'object' || Array.isArray(obj.days)) throw new Error('kein Backup');
    data = normalize(obj);
  } catch {
    toast('Diese Datei ist kein gültiges Zyklus-Backup');
    return;
  }
  const count = Object.keys(data.days).length;
  if (!confirm(`Backup mit ${plural(count, 'eingetragenem Tag', 'eingetragenen Tagen')} laden? Die aktuellen Einträge auf diesem Gerät werden dabei ersetzt.`)) return;
  const before = state;
  state = data;
  if (!commit()) { state = before; refresh(); return; } // Speichern fehlgeschlagen: beim bisherigen Stand bleiben
  dropUndo();
  toast('Backup geladen');
}
// --- Mitteilungen (Push) --------------------------------------------------------------------
// Die App plant lokal, welche Mitteilung wann kommt (push.js), und gibt dem Weck-Dienst nur die Zeitpunkte.
const PUSH_STAND = 'zyklus-push-stand'; // zuletzt übermittelter Stand – spart unnötige Anfragen
let pushTimer = null;
const pushLabel = (cat, id) => { const t = tagInfo(cat, id); return t ? t.label : ''; };
const pushPlan = () => buildSchedule(state, A, today, Date.now(), pushLabel);
function schedulePushSync() {
  if (!state || !state.settings.push.on) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => syncPush().catch(() => { /* beim nächsten Speichern oder Öffnen erneut */ }), 1500);
}
async function syncPush(force = false, extra = null) {
  if (!state.settings.push.on || !pushSupported() || !pushConfigured()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) {
    // z. B. Backup auf einem neuen Gerät geladen: dort muss neu eingeschaltet werden
    state.settings.push.on = false;
    save();
    if (ui.tab === 'settings' && tr.n === null) renderSettings();
    return;
  }
  const items = pushPlan();
  if (extra) { items.push(extra); items.sort((x, y) => x.t - y.t); }
  await storePlan(items);
  const times = scheduleTimes(items);
  const stand = `${sub.endpoint}|${times.join(',')}`;
  let last = null;
  try { last = localStorage.getItem(PUSH_STAND); } catch { /* egal */ }
  if (!force && last === stand) return;
  await sendTimes(sub.endpoint, times);
  try { localStorage.setItem(PUSH_STAND, extra ? '' : stand); } catch { /* egal */ }
}
async function pushCleanup() {
  try {
    clearTimeout(pushTimer);
    try { localStorage.removeItem(PUSH_STAND); } catch { /* egal */ }
    if (!pushSupported()) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      if (pushConfigured()) await removeDevice(sub.endpoint).catch(() => { /* Dienst nicht erreichbar: das Gerät meldet sich gleich selbst ab */ });
      await sub.unsubscribe();
    }
    await storePlan([]);
  } catch { /* egal */ }
}
const redrawSettings = () => { if (tr.n === null && ui.tab === 'settings') renderSettings(); };
async function turnPushOn() {
  try {
    await subscribe(navigator.serviceWorker.ready); // fragt als Erstes die Erlaubnis an (muss im Tipp passieren)
    state.settings.push.on = true;
    await syncPush(true);
    save();
    toast('Mitteilungen sind eingeschaltet');
  } catch (err) {
    state.settings.push.on = false;
    save();
    pushCleanup(); // keine halbe Anmeldung zurücklassen
    toast(err && err.message ? err.message : 'Mitteilungen ließen sich nicht einschalten');
  }
  redrawSettings();
}
async function turnPushOff() {
  state.settings.push.on = false;
  save();
  await pushCleanup();
  toast('Mitteilungen sind aus');
  redrawSettings();
}
async function testPush() {
  try {
    toast('Test wird angemeldet …');
    await syncPush(true, { t: Date.now() + 20000, kind: 'test', title: '🌸 Test geglückt', body: 'So sehen Mitteilungen der Zyklus-App aus.' });
    toast('Test ist unterwegs – kommt in 1–2 Minuten. Du kannst die App jetzt schließen.');
  } catch (err) {
    toast(err && err.message ? err.message : 'Test fehlgeschlagen');
  }
}
const fPushWhen = fmt({ weekday: 'short', day: 'numeric', month: 'numeric' });
function pushCard() {
  if (!pushConfigured()) return '';
  const p = state.settings.push;
  const head = '<h3>📲 Mitteilungen</h3>';
  if (!pushSupported()) {
    return `<div class="card">${head}<p class="muted small">${isIOS && !standalone
      ? 'Mitteilungen gibt es nur in der App vom Home-Bildschirm, nicht im Safari-Tab.'
      : 'Dieser Browser unterstützt keine Mitteilungen.'}</p></div>`;
  }
  const sw = (key, title, sub) => `<label class="row"><div><div class="row-title">${title}</div><div class="row-sub">${sub}</div></div>
      <span class="switch"><input type="checkbox" data-push="${key}" ${p[key] ? 'checked' : ''}><span></span></span></label>`;
  const time = (id, v) => `<label class="row compact"><span class="row-title">um</span><input id="${id}" class="time-input" type="time" value="${S.fmtTime(v)}"></label>`;
  let body = sw('on', 'Mitteilungen einschalten', 'Echte Mitteilungen aufs iPhone – auch wenn die App zu ist.');
  if (p.on) {
    const next = pushPlan()[0];
    const nextDay = next ? C.todayNum(new Date(next.t)) : null;
    body += `
    ${sw('period', 'Periode kommt', '2 Tage vorher um 9 Uhr und am erwarteten Tag um 8 Uhr.')}
    ${sw('late', 'Periode vergessen einzutragen?', 'Einmal, wenn sie 3 Tage überfällig ist.')}
    ${sw('expect', 'Was dich erwartet', 'Morgens um 9 Uhr, wenn laut deinen Einträgen etwas ansteht – z. B. Kopfschmerzen.')}
    ${sw('track', 'Ans Tracken erinnern', 'Täglich – aber nur, wenn du an dem Tag noch nichts eingetragen hast.')}
    ${p.track ? time('push-track-time', p.trackTime) : ''}
    ${sw('sleepTimer', 'Schlaf-Timer läuft noch', 'Wenn er 10 Stunden nach „Schlafen gehen“ nicht beendet ist.')}
    ${sw('bedtime', 'Zeit fürs Bett', 'Täglich zur gewählten Uhrzeit.')}
    ${p.bedtime ? time('push-bed-time', p.bedTime) : ''}
    ${state.settings.showFertile ? sw('fertile', 'Fruchtbare Tage', 'Am ersten geschätzten Tag um 9 Uhr.') : ''}
    ${sw('discreet', 'Diskrete Texte', 'Auf dem Sperrbildschirm steht dann nur „Du hast eine Erinnerung“ statt z. B. „Periode in 2 Tagen“.')}
    <p class="row-sub" id="push-next">${next ? `Nächste Mitteilung: ${esc(nextDay === today ? 'heute' : fPushWhen(nextDay))}, ${S.fmtTime(nowMin(new Date(next.t)))} Uhr · ${esc(p.discreet ? next.title : next.title.replace(/^\S+\s/u, m => (/[\p{L}]/u.test(m) ? m : '')))}` : 'Im Moment ist keine Mitteilung geplant.'}</p>
    <div class="btn-row"><button class="btn" data-act="push-test">Test-Mitteilung senden</button></div>`;
  }
  body += '<p class="row-sub">Dafür meldet sich die App bei einem kleinen Weck-Dienst an. Er erfährt nur, <b>wann</b> er dein iPhone anstoßen soll – nie deine Einträge und nie den Text. Der Text entsteht auf deinem iPhone.</p>';
  return `<div class="card" id="push-card">${head}${body}</div>`;
}

// --- Erinnerungen über den iPhone-Kalender (.ics) ------------------------------------------
function remindCard() {
  const r = state.settings.remind;
  const ex = state.meta.icsExport;
  const sw = (key, title, sub) => `<label class="row"><div><div class="row-title">${title}</div><div class="row-sub">${sub}</div></div>
      <span class="switch"><input type="checkbox" data-remind="${key}" ${r[key] ? 'checked' : ''}><span></span></span></label>`;
  return `<div class="card"><h3>🔔 Erinnerungen im Kalender</h3>
    <p class="muted small">Die App legt Termine mit Erinnerung in deinem iPhone-Kalender an – ohne Server, alles bleibt auf dem iPhone. Tipp: in der Kalender-Abfrage einen eigenen Kalender „Zyklus“ wählen.</p>
    ${sw('period', 'Nächste Periode', '2 Tage vorher und am Tag selbst')}
    ${sw('fertile', 'Fruchtbare Tage', 'Kalender-Schätzung, nicht sinnvoll mit der Pille')}
    ${sw('pill', 'Pille täglich', 'Wiederkehrende Erinnerung')}
    ${r.pill ? `<label class="row compact"><span class="row-title">um</span><input id="remind-pill-time" class="time-input" type="time" value="${S.fmtTime(r.pillTime)}"></label>` : ''}
    ${sw('track', 'Täglich ans Tracken erinnern', 'Wiederkehrende Erinnerung')}
    ${r.track ? `<label class="row compact"><span class="row-title">um</span><input id="remind-track-time" class="time-input" type="time" value="${S.fmtTime(r.trackTime)}"></label>` : ''}
    <div class="btn-row"><button class="btn primary" data-act="ics-export">📅 In den Kalender übernehmen</button></div>
    ${ex ? `<p class="row-sub">Zuletzt übernommen am ${esc(fDMY(C.todayNum(new Date(ex.at))))}${ex.period ? ` · Periode ${esc(fDMY(C.toNum(ex.period)))}` : ''}</p>` : ''}
    <p class="row-sub">Tägliche Erinnerungen musst du nur einmal übernehmen. Die Perioden-Erinnerung nach jeder neuen Periode erneut – die App sagt dir auf „Heute“ Bescheid, der Kalender ersetzt dann den alten Termin. Eine Erinnerung abschalten: den Termin im Kalender löschen.</p>
  </div>`;
}
// Gibt es eine neue Vorhersage, die noch nicht im Kalender ist? (nur, wenn schon einmal übernommen)
function icsOutdated() {
  const ex = state.meta.icsExport;
  if (!ex || !state.settings.remind.period || !A.hasData || !(A.nextStart > today)) return false;
  return ex.period !== C.toIso(A.nextStart);
}
function exportIcs(onlyPrediction = false) {
  const r = state.settings.remind;
  const { events, notes } = reminderEvents(A, r, today, onlyPrediction);
  if (!events.length) { toast(notes[0] || 'Bitte zuerst eine Erinnerung einschalten'); return; }
  const ics = buildIcs(events);
  const a = document.createElement('a');
  a.rel = 'noopener';
  if (standalone) {
    // App vom Home-Bildschirm: iOS öffnet dort keine Kalenderdateien. Deshalb die Kalender-Seite im
    // Safari-Fenster öffnen; die Termine stehen nur hinter dem # (geht nie an einen Server).
    a.href = `kalender.html#${encodeURIComponent(ics)}`;
    a.target = '_blank';
  } else {
    // Normales Safari: Download-Link öffnet direkt den Kalender-Dialog
    const url = URL.createObjectURL(new File([ics], 'zyklus-erinnerungen.ics', { type: 'text/calendar' }));
    a.href = url;
    a.download = 'zyklus-erinnerungen.ics';
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
  state.meta.icsExport = { at: new Date().toISOString(), period: r.period && A.hasData && A.nextStart > today ? C.toIso(A.nextStart) : null };
  save();
  if (notes.length) setTimeout(() => toast(notes[0]), 400);
  render();
}

// --- Import aus Clue ---------------------------------------------------------------------
const UNDO_KEY = `${KEY}-vor-import`;
const UNDO_DAYS = 14; // so lange lässt sich ein Import rückgängig machen, danach wird die Kopie gelöscht
function dropUndo() { try { localStorage.removeItem(UNDO_KEY); } catch { /* egal */ } }
function undoInfo() {
  try {
    const s = JSON.parse(localStorage.getItem(UNDO_KEY));
    const t = s && Date.parse(s.at);
    if (!Number.isFinite(t)) return '';
    if (Date.now() - t > UNDO_DAYS * 86400e3) { dropUndo(); return ''; }
    return fDMY(C.todayNum(new Date(t)));
  } catch { return ''; }
}
async function importClue(file) {
  try {
    const files = await readImportFile(await file.arrayBuffer());
    let json = null;
    for (const f of files) {
      try { const j = JSON.parse(f.text); if (looksLikeClue(j)) { json = j; break; } } catch { /* nächste Datei */ }
    }
    if (!json) throw new Error('Keine Clue-Messungen gefunden – bitte die Datei „measurements.json“ aus dem Clue-Export wählen');
    const { days: raw, unknown } = parseClue(json, today, C.toNum);
    const incoming = {};
    for (const [iso, e] of Object.entries(raw)) {
      if (!C.isValidIso(iso)) continue; // z. B. 31.02. – gibt es nicht, würde sonst auf einen anderen Tag rutschen
      const c = cleanEntry(e);
      if (c) incoming[iso] = c;
    }
    const res = mergeDays(state.days, incoming, 'Clue');
    const periodDays = Object.values(incoming).filter(e => C.isPeriodDay(e)).length;
    const lines = [
      `Clue: ${plural(Object.keys(incoming).length, 'Tag', 'Tage')} mit Einträgen gefunden, davon ${plural(periodDays, 'Periodentag', 'Periodentage')}.`,
      `${res.stats.neu} neu · ${res.stats.ergaenzt} ergänzt · ${res.stats.unveraendert} schon vorhanden.`,
    ];
    if (res.stats.konflikte) lines.push(`${res.stats.konflikte}× widersprechen sich Clue und diese App – dort bleiben deine Einträge von hier.`);
    if (unknown.length) lines.push(`Als eigene Tags übernommen: ${unknown.slice(0, 6).map(([t]) => t).join(', ')}${unknown.length > 6 ? ' …' : ''}`);
    lines.push('', 'Jetzt importieren? Unter „Mehr“ kannst du den Import wieder rückgängig machen.');
    const msg = lines.join('\n');
    if (!confirm(msg)) return;
    try {
      localStorage.setItem(UNDO_KEY, JSON.stringify({ at: new Date().toISOString(), data: state }));
    } catch {
      if (!confirm('Die Sicherheitskopie für „Rückgängig“ ließ sich nicht speichern. Trotzdem importieren?')) return;
    }
    const merged = {};
    for (const [iso, e] of Object.entries(res.days)) {
      const c = cleanEntry(e);
      if (c) merged[iso] = c;
    }
    state.days = merged;
    const tags = state.settings.customTags;
    for (const [t] of unknown) if (tags.length < TAG_MAX && !tags.some(x => x.toLowerCase() === t.toLowerCase())) tags.push(t);
    if (!commit()) return; // Fehlermeldung kam schon
    toast(`Clue-Daten importiert: ${res.stats.neu} neue Tage`);
  } catch (err) {
    toast(err && err.message ? err.message : 'Import fehlgeschlagen');
  }
}
function undoImport() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(UNDO_KEY)); } catch { /* egal */ }
  if (!saved || !saved.data) return toast('Keine Sicherheitskopie gefunden');
  if (!confirm(`Import vom ${fDMY(C.todayNum(new Date(saved.at)))} rückgängig machen? Was du seit dem Import eingetragen hast, geht dabei verloren.`)) return;
  const meta = state.meta; // laufender Schlaf-Timer, Backup-Datum usw. bleiben
  state = normalize(saved.data);
  state.meta = meta;
  if (!commit()) return;
  dropUndo();
  render();
  toast('Import rückgängig gemacht');
}

function wipe() {
  if (!confirm('Wirklich alle Einträge und Einstellungen löschen?')) return;
  if (!confirm('Letzte Rückfrage: Das lässt sich ohne Backup nicht rückgängig machen. Löschen?')) return;
  const hadPush = state.settings.push.on;
  state = freshData();
  if (hadPush) pushCleanup();
  ui.mark = false;
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(KEY) && k !== KEY) keys.push(k); }
    for (const k of keys) localStorage.removeItem(k);
  } catch { /* egal */ }
  commit();
  toast('Alle Daten gelöscht');
}

// ---------------------------------------------------------------------------
// Bedienung
// ---------------------------------------------------------------------------
function togglePeriod(n) {
  if (n > today) { toast(FUTURE_MSG); return null; }
  const e = entry(n);
  const was = C.isPeriodDay(e);
  if (was) delete e.tags.period;
  else choose(e.tags, 'period', 'mittel');
  putEntry(n, e);
  commit();
  return !was;
}

// Zu welcher Nacht gehört ein Zeitpunkt? Eine Nacht gehört zum Tag des Aufwachens: ab 12 Uhr ist das der nächste Tag.
function nightOf(ts) {
  const d = new Date(ts);
  return C.todayNum(d) + (d.getHours() >= 12 ? 1 : 0);
}
// Abgehakte Tablette in den Eintrag ihrer Nacht schreiben (wenn dort noch keine steht) und das Häkchen lösen
function flushPill() {
  const m = state.meta;
  if (!m.sleepPill) return false;
  const at = m.sleepPillAt || Date.now();
  const n = nightOf(at);
  const e = entry(n);
  if (!e.pill) e.pill = { at: nowMin(new Date(at)), name: state.settings.pillName };
  putEntry(n, e);
  m.sleepPill = false;
  m.sleepPillAt = null;
  return true;
}
// Nur den Timer beenden – eine abgehakte Tablette bleibt, bis sie ihrer Nacht zugeordnet ist
function clearSleepTimer() {
  state.meta.sleepStart = null;
}
// Beim Start, regelmäßig und beim Zurückkommen: zu lange Timer beenden, Tabletten vergangener Nächte eintragen
function settleSleep() {
  const m = state.meta;
  let changed = false;
  if (m.sleepStart && Date.now() - m.sleepStart > 20 * 3600e3) {
    m.sleepStart = null;
    changed = true;
    setTimeout(() => toast('Der Schlaf-Timer lief über 20 Stunden und wurde beendet – bitte die Nacht beim Tracken eintragen'), 300);
  }
  if (m.sleepPill && !m.sleepStart) {
    const n = nightOf(m.sleepPillAt || Date.now());
    const now = new Date();
    const t = C.todayNum(now);
    if (t > n || (t === n && now.getHours() >= 4)) changed = flushPill() || changed;
  }
  if (changed) {
    save();
    A = C.analyze(state, today);
  }
  return changed;
}
function stopSleep() {
  const m = state.meta;
  const start = m.sleepStart;
  const end = Date.now();
  const mins = Math.round((end - start) / 60000);
  if (mins < 30) {
    if (!confirm('Das waren weniger als 30 Minuten. Timer beenden? Die Schlafdauer wird nicht gespeichert.')) return;
    clearSleepTimer();
    save();
    renderHome();
    return;
  }
  if (mins > 20 * 60) {
    clearSleepTimer();
    flushPill();
    commit();
    toast('Der Timer lief über 20 Stunden – bitte den Schlaf beim Tracken eintragen');
    return;
  }
  const wakeDay = C.todayNum(new Date(end));
  const e = entry(wakeDay);
  const replace = !(e.sleep || e.bed !== null)
    || confirm(`Für heute ist schon Schlaf eingetragen${e.sleep ? ` (${fmtSleep(e.sleep)})` : ''}. Mit der Timer-Messung ersetzen?`);
  if (replace) {
    e.bed = nowMin(new Date(start));
    e.wake = nowMin(new Date(end));
    e.sleep = mins; // tatsächlich vergangene Zeit – stimmt auch in der Nacht der Zeitumstellung
  }
  if (m.sleepPill && !e.pill) e.pill = { at: nowMin(new Date(m.sleepPillAt || start)), name: state.settings.pillName };
  m.sleepPill = false;
  m.sleepPillAt = null;
  putEntry(wakeDay, e);
  clearSleepTimer();
  commit();
  if (!replace) {
    toast(e.pill ? 'Vorhandener Schlaf bleibt, Tablette ist eingetragen' : 'Vorhandener Schlaf bleibt');
  } else if (mins > 12 * 60) {
    toast('Über 12 Stunden – bitte prüfen, wann du wirklich aufgewacht bist');
    openTracker(wakeDay);
    const sec = $('#tr-body [data-sec="sleep"]');
    if (sec) sec.scrollIntoView({ block: 'start' });
  } else {
    toast(`Guten Morgen! ☀️ ${fmtSleep(mins)} geschlafen`);
  }
}

const ACTIONS = {
  'start-mark'() {
    ui.mark = true;
    ui.calView = 'month';
    ui.y = D(today).getUTCFullYear();
    ui.m = D(today).getUTCMonth();
    switchTab('cal');
    toast('Tippe die Tage deiner letzten Periode an');
  },
  'toggle-today'() {
    const on = togglePeriod(today);
    if (on !== null) toast(on ? 'Heute als Periodentag eingetragen' : 'Periode für heute entfernt');
    if (on) pop($('[data-act="toggle-today"]'));
  },
  'track-today'() { openTracker(today); },
  'cal-prev'() { shiftMonth(-1); },
  'cal-next'() { shiftMonth(1); },
  'cal-today'() {
    const before = ui.calView === 'year' ? ui.y * 12 : ui.y * 12 + ui.m;
    ui.y = D(today).getUTCFullYear();
    ui.m = D(today).getUTCMonth();
    renderCal();
    slideCal((ui.calView === 'year' ? ui.y * 12 : ui.y * 12 + ui.m) - before);
  },
  'cal-year-view'() { ui.calView = 'year'; renderCal(); window.scrollTo(0, 0); animateEnter($('#view-cal'), 'enter-soft'); },
  'cal-month-view'() { ui.calView = 'month'; renderCal(); animateEnter($('#view-cal'), 'enter-soft'); },
  'cal-open-month'(el) { ui.m = Number(el.dataset.m); ui.calView = 'month'; renderCal(); window.scrollTo(0, 0); animateEnter($('#view-cal'), 'enter-soft'); },
  'mark'() { ui.mark = !ui.mark; renderCal(); },
  'tr-close'() { leaveDay(hideTracker); },
  'tr-save'() {
    if (!commitDraft()) return; // Fehlermeldung kam schon, Entwurf bleibt offen
    hideTracker();
    toast('Gespeichert');
  },
  'tr-customize'() { $('#tr-custom-list').innerHTML = catToggles(); $('#tr-custom').hidden = false; },
  'tr-customize-done'() { $('#tr-custom').hidden = true; renderTrBody(); },
  'wk-prev'() { trGoto(tr.n - 7); },
  'wk-next'() { trGoto(tr.n + 7); },
  'tag-new'() {
    tr.addingTag = true;
    rerenderSection('custom');
    const inp = $('#tag-input');
    if (inp) inp.focus();
  },
  'tag-add'() { addCustomTag(); },
  'copy-prev'() {
    const n = copyTags(tr.draft, state.days[C.toIso(tr.n - 1)], state.settings.hiddenCats);
    if (!n) return;
    markDirty();
    renderTrBody();
    toast(`${plural(n, 'Eintrag', 'Einträge')} übernommen – anpassen und speichern`);
  },
  'open-day'(el) { openTracker(Number(el.dataset.n)); },
  'wheel-goto'(el) { setWheelDay(Number(el.dataset.n), true); },
  'year-prev'() { const ys = reviewYears(); const i = ys.indexOf(ui.reviewYear); if (i > 0) { ui.reviewYear = ys[i - 1]; renderStats(); animateEnter($('#view-stats'), 'enter-soft'); } },
  'year-next'() { const ys = reviewYears(); const i = ys.indexOf(ui.reviewYear); if (i >= 0 && i < ys.length - 1) { ui.reviewYear = ys[i + 1]; renderStats(); animateEnter($('#view-stats'), 'enter-soft'); } },
  'pill-toggle'() {
    tr.draft.pill = tr.draft.pill ? null : { at: null, name: state.settings.pillName };
    markDirty();
    rerenderSection('sleep');
  },
  'stats-tab'(el) {
    if (ui.statsTab === el.dataset.v) return;
    ui.statsTab = el.dataset.v;
    renderStats();
    animateEnter($('#view-stats'), 'enter-soft');
  },
  'news-ok'() { state.meta.seenVersion = APP_VERSION; save(); renderHome(); },
  'news-all'() {
    state.meta.seenVersion = APP_VERSION;
    save();
    ui.folds.add('notes');
    switchTab('settings');
    const n = $('#notes');
    if (n) n.scrollIntoView({ block: 'start' });
  },
  'track-sleep'() {
    openTracker(today);
    const sec = $('#tr-body [data-sec="sleep"]');
    if (sec) sec.scrollIntoView({ block: 'start' });
  },
  'sleep-start'() {
    settleSleep();
    state.meta.sleepStart = Date.now();
    if (state.meta.sleepPill && !state.meta.sleepPillAt) state.meta.sleepPillAt = Date.now();
    save();
    renderHome();
    toast('Gute Nacht! 🌙 Morgens auf „Aufgewacht“ tippen.');
  },
  'sleep-cancel'() {
    if (!confirm('Schlaf-Timer abbrechen? Die Schlafdauer wird nicht gespeichert.')) return;
    clearSleepTimer();
    save();
    renderHome();
  },
  'sleep-stop'() { stopSleep(); },
  'wheel-prev'() { setWheelDay(wheelSel() - 1, true); },
  'wheel-next'() { setWheelDay(wheelSel() + 1, true); },
  'wheel-today'() { setWheelDay(today, true); },
  'open-patterns'() { ui.statsTab = 'patterns'; switchTab('stats'); },
  'wheel-open'() { openTracker(wheelSel()); },
  'check-update'() {
    toast('Suche nach Updates …');
    const done = () => setTimeout(() => location.reload(), 600);
    if (swReg) swReg.update().then(done, done);
    else done();
  },
  'export'() { exportBackup(); },
  'import'() { $('#import-file').click(); },
  'wipe'() { wipe(); },
  'clue-import'() { $('#clue-file').click(); },
  'ics-export'() { exportIcs(false); },
  'push-test'() { testPush(); },
  'ics-export-next'() { exportIcs(true); },
  'undo-import'() { undoImport(); },
};

document.addEventListener('click', ev => {
  const el = ev.target.closest('button, [data-act]');
  if (!el || el.disabled) return;
  checkNewDay();
  const d = el.dataset;
  if (d.ask) return answerAsk(d.ask);
  if (d.tab) return switchTab(d.tab);
  if (d.day) {
    const n = Number(d.day);
    if (n > today) return toast(FUTURE_MSG);
    return ui.mark ? togglePeriod(n) : openTracker(n);
  }
  if (d.wk) return trGoto(Number(d.wk));
  if (d.jump) return jumpTo(d.jump);
  if (d.chip) { const [cat, id] = d.chip.split(':'); return toggleChip(cat, id); }
  if (d.ctag !== undefined) return toggleCustomTag(d.ctag);
  if (d.info) {
    if (tr.info.has(d.info)) tr.info.delete(d.info); else tr.info.add(d.info);
    return rerenderSection(d.info);
  }
  if (d.step) return stepSetting(el.closest('.stepper').dataset.key, Number(d.step));
  if (d.delTag !== undefined) return deleteCustomTag(d.delTag);
  if (d.act && ACTIONS[d.act]) ACTIONS[d.act](el);
});

document.addEventListener('input', ev => {
  const t = ev.target;
  if (t.id === 'tr-search') { tr.q = t.value; renderTrBody(); return; }
  if (t.id === 'entry-search') { ui.searchQ = t.value; $('#search-results').innerHTML = searchResultsHtml(); return; }
  if (!tr.draft) return;
  if (t.id === 'note') {
    tr.draft.note = t.value.slice(0, NOTE_MAX);
    $('#note-count').textContent = tr.draft.note.length;
    markDirty();
  } else if (t.id === 'sl-h' || t.id === 'sl-m') {
    // wie eine Digitaluhr: immer die letzten zwei Ziffern, so kann man in ein volles Feld weitertippen
    t.value = t.value.replace(/\D/g, '').slice(-2);
    readSleep();
  } else if (t.id === 'sl-bed' || t.id === 'sl-wake') {
    readSleepTimes();
  } else if (t.id === 'pill-at' && tr.draft.pill) {
    tr.draft.pill.at = S.parseTime(t.value);
    markDirty();
  } else if (t.id === 'pill-name' && tr.draft.pill) {
    tr.draft.pill.name = t.value.slice(0, PILL_MAX);
    markDirty();
  } else if (t.id === 'wt') {
    t.value = t.value.replace(/[^\d.,]/g, '');
    readWeight(false);
  }
});

document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.dataset.setting) {
    state.settings[t.dataset.setting] = t.checked;
    if (t.dataset.setting === 'zoomLock') applyZoomLock();
    commit();
  } else if (t.dataset.push) {
    const k = t.dataset.push;
    if (k === 'on') { if (t.checked) turnPushOn(); else turnPushOff(); } // nicht warten: die Erlaubnis-Abfrage muss im Tipp starten
    else { state.settings.push[k] = t.checked; save(); redrawSettings(); }
  } else if (t.id === 'push-track-time' || t.id === 'push-bed-time') {
    const v = S.parseTime(t.value);
    if (v !== null) { state.settings.push[t.id === 'push-track-time' ? 'trackTime' : 'bedTime'] = v; save(); redrawSettings(); }
  } else if (t.dataset.show) {
    // nicht alles neu zeichnen: der Schalter soll sichtbar umlegen
    state.settings.show[t.dataset.show] = t.checked;
    save();
  } else if (t.name === 'theme' && THEME[t.value]) {
    // nicht alles neu zeichnen: die Farben gleiten über, die Auswahl bleibt, wo sie ist
    state.settings.theme = t.value;
    save();
    applyTheme(true);
    const nm = $('#theme-name');
    if (nm) nm.textContent = THEME[t.value][1];
  } else if (t.dataset.catToggle) {
    const id = t.dataset.catToggle;
    const hidden = new Set(state.settings.hiddenCats);
    if (t.checked) hidden.delete(id); else hidden.add(id);
    state.settings.hiddenCats = [...hidden];
    save();
    if (tr.n !== null) renderTrBody();
  } else if (t.id === 'name-input') {
    // nicht alles neu zeichnen: sonst geht ein gleichzeitiger Tipp auf einen Knopf verloren
    const name = t.value.trim().slice(0, 30);
    state.settings.name = name;
    save();
    if (ui.tab === 'home') $('#title').textContent = homeTitle();
    const h = $('.welcome h2');
    if (h) h.textContent = `Willkommen${name ? `, ${name}` : ''}!`;
  } else if (t.id === 'sleep-pill') {
    state.meta.sleepPill = t.checked;
    state.meta.sleepPillAt = t.checked ? Date.now() : null;
    save();
  } else if (t.id === 'pillname-setting') {
    state.settings.pillName = t.value.trim().slice(0, PILL_MAX);
    save();
  } else if (t.dataset.remind) {
    state.settings.remind[t.dataset.remind] = t.checked;
    save();
    if (tr.n === null && ui.tab === 'settings') renderSettings();
  } else if (t.id === 'remind-pill-time' || t.id === 'remind-track-time') {
    const v = S.parseTime(t.value);
    if (v !== null) { state.settings.remind[t.id === 'remind-pill-time' ? 'pillTime' : 'trackTime'] = v; save(); }
  } else if (t.id === 'clue-file') {
    const f = t.files && t.files[0];
    t.value = '';
    if (f) importClue(f);
  } else if (t.id === 'import-file') {
    const f = t.files && t.files[0];
    t.value = '';
    if (f) importBackup(f);
  } else if ((t.id === 'sl-h' || t.id === 'sl-m') && tr.draft) {
    // nur das verlassene Feld aufhübschen, das andere nicht anfassen
    const max = t.id === 'sl-h' ? 24 : 59;
    if (t.value !== '') t.value = String(Math.min(max, parseInt(t.value, 10) || 0)).padStart(2, '0');
    if (parseInt($('#sl-h').value, 10) >= 24 && $('#sl-m').value) $('#sl-m').value = '00'; // max. 24:00
  } else if (t.id === 'wt' && tr.draft) {
    readWeight(true);
  }
});

// Zahlenfelder beim Antippen komplett markieren, damit Tippen den alten Wert ersetzt
document.addEventListener('focusin', ev => {
  const t = ev.target;
  if (t.classList && t.classList.contains('big-num')) setTimeout(() => { try { t.setSelectionRange(0, t.value.length); } catch { /* egal */ } }, 0);
});

// Zyklus-Rad drehen: Winkeländerung am Ring = Tage (eine Umdrehung = ein Zyklus)
function wheelAngle(ev, el) {
  const r = el.getBoundingClientRect();
  const dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
  return { ang: Math.atan2(dy, dx), dist: Math.hypot(dx, dy) / (r.width / 2) };
}
document.addEventListener('pointerdown', ev => {
  const el = ev.target.closest && ev.target.closest('#wheel');
  if (!el || !wheel.cyc) return;
  const { ang, dist } = wheelAngle(ev, el);
  if (dist < 0.55) return; // Mitte: nicht drehen
  Object.assign(wheel, { dragging: true, lastAng: ang, startAng: ang, acc: 0, moved: 0, el });
  try { el.setPointerCapture(ev.pointerId); } catch { /* egal */ }
  ev.preventDefault();
});
document.addEventListener('pointermove', ev => {
  if (!wheel.dragging) return;
  const { ang } = wheelAngle(ev, wheel.el);
  let d = ang - wheel.lastAng;
  if (d > Math.PI) d -= 2 * Math.PI;
  else if (d < -Math.PI) d += 2 * Math.PI;
  wheel.lastAng = ang;
  wheel.moved += Math.abs(d);
  wheel.acc += (d / (2 * Math.PI)) * wheel.cyc.len;
  // ab einem halben Tag gilt der nächste Tag als gewählt; der Rest bleibt als stufenloser Versatz
  const steps = Math.round(wheel.acc);
  if (steps) {
    const want = wheelSel() + steps;
    wheel.acc -= steps;
    setWheelDay(want);
    if (wheelSel() !== want) wheel.acc = 0; // am Anfang/Ende der Daten: nicht weiterdrehen
  }
  followFinger();
});
document.addEventListener('pointerup', () => {
  if (!wheel.dragging) return;
  wheel.dragging = false;
  if (wheel.moved < 0.08) {
    // kurzer Tipp auf den Ring: zu diesem Tag gleiten
    wheel.acc = 0;
    const frac = ((wheel.startAng + Math.PI / 2) / (2 * Math.PI) + 1) % 1;
    setWheelDay(wheel.cyc.start + Math.min(wheel.cyc.len - 1, Math.floor(frac * wheel.cyc.len)), true);
  } else snapWheel();
});
document.addEventListener('pointercancel', () => {
  if (!wheel.dragging) return;
  wheel.dragging = false;
  snapWheel();
});

// Aufklappen per Antippen: Inhalt gleitet herein (nur dann – nicht beim Neuzeichnen offener Bereiche)
document.addEventListener('click', ev => {
  const sum = ev.target.closest && ev.target.closest('details > summary');
  if (!sum || !motionOk()) return;
  const d = sum.parentElement;
  if (d.open) return; // wird gerade zugeklappt
  d.classList.add('opening');
  clearTimeout(d._openT);
  d._openT = setTimeout(() => d.classList.remove('opening'), 500);
}, true);

// Auf- und Zuklappen unter „Mehr“ merken, damit Neuzeichnen nichts zuklappt
document.addEventListener('toggle', ev => {
  const d = ev.target;
  if (d && d.classList && d.classList.contains('fold') && d.id) {
    if (d.open) ui.folds.add(d.id);
    else ui.folds.delete(d.id);
  }
}, true);

document.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && ev.target.id === 'tag-input') { ev.preventDefault(); addCustomTag(); }
  if (ev.target.id === 'wheel' && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
    ev.preventDefault();
    setWheelDay(wheelSel() + (ev.key === 'ArrowRight' ? 1 : -1), true);
  }
  if (ev.key === 'Escape' && tr.n !== null) {
    if (!$('#tr-ask').hidden) answerAsk('stay');
    else if (!$('#tr-custom').hidden) ACTIONS['tr-customize-done']();
    else ACTIONS['tr-close']();
  }
});

// Wischen: Monat im Kalender, Woche im Tracking
function onSwipe(el, fn) {
  let x = 0, y = 0;
  el.addEventListener('touchstart', e => { const p = e.changedTouches[0]; x = p.clientX; y = p.clientY; }, { passive: true });
  el.addEventListener('touchend', e => {
    const p = e.changedTouches[0];
    const dx = p.clientX - x, dy = p.clientY - y;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 45) fn(dx < 0 ? 1 : -1);
  }, { passive: true });
}
onSwipe($('#view-cal'), dir => shiftMonth(dir));
onSwipe($('#tr-week'), dir => trGoto(tr.n + 7 * dir));

// App geht in den Hintergrund (iOS kann sie dann jederzeit beenden): offene Änderungen sichern,
// auch wenn gerade die Rückfrage offen ist. Beim Zurückkommen: neuer Tag? Update da?
let swReg = null;
let pendingReload = false; // Update kam während des Trackens
let reloading = false;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (tr.n !== null && tr.dirty && commitDraft()) {
      $('#tr-save').disabled = true;
      if (askResolve) answerAsk('stay');
    }
  } else {
    checkNewDay();
    if (pendingReload && tr.n === null && !reloading) { reloading = true; location.reload(); return; }
    if (settleSleep() && tr.n === null) render();
    schedulePushSync();
    if (swReg) swReg.update().catch(() => {});
  }
});
function tick() {
  checkNewDay();
  const settled = settleSleep();
  if (tr.n !== null || ui.tab !== 'home') return;
  if (settled) renderHome();
  $('#title').textContent = homeTitle();
  const el = $('#sleep-elapsed');
  if (el && state.meta.sleepStart) el.textContent = fmtSleep(sleepElapsed());
  const typing = document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
  if (sleepMode() !== lastSleepMode && !typing && !wheel.dragging) renderHome();
}
setInterval(tick, 30000);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// --- Zoom-Sperre: Seitenkopf (viewport), CSS (touch-action) und Safaris eigene Zoom-Gesten ----------
const VIEWPORT_LOCKED = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
const VIEWPORT_FREE = 'width=device-width, initial-scale=1, viewport-fit=cover';
function applyZoomLock() {
  const lock = state.settings.zoomLock !== false;
  document.documentElement.classList.toggle('nozoom', lock);
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) vp.setAttribute('content', lock ? VIEWPORT_LOCKED : VIEWPORT_FREE);
}
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, ev => { if (state.settings.zoomLock !== false) ev.preventDefault(); }, { passive: false });
}
// Doppeltippen zum Zoomen auch auf älteren iOS-Versionen abfangen (zwei Tipps kurz hintereinander)
let lastTouchEnd = 0;
document.addEventListener('touchend', ev => {
  if (state.settings.zoomLock === false) return;
  const now = Date.now();
  if (now - lastTouchEnd < 300 && ev.cancelable && !ev.target.closest('input, textarea, select, button, label, [data-act], #wheel')) ev.preventDefault();
  lastTouchEnd = now;
}, { passive: false });
applyZoomLock();

settleSleep();
if (needsSave && storageOk) save();
render();
animateEnter($(VIEWS[ui.tab])); // Startbild: Karten gleiten herein, der Ring zeichnet sich
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // Welcher Service Worker hat diese Seite ausgeliefert? Neu laden nur, wenn danach ein ANDERER aktiv wird
  // (nicht bei der Erstinstallation) – und nie mitten im Tracken: dann beim Schließen des Trackers.
  let current = navigator.serviceWorker.controller;
  const onActivated = w => {
    if (!w || w === current) return;
    if (!current) { current = w; return; } // Erstinstallation: nichts neu laden
    current = w;
    if (reloading) return;
    if (tr.n !== null) { pendingReload = true; toast('Update geladen – wird nach dem Tracken aktiv'); return; }
    reloading = true;
    location.reload();
  };
  const applyUpdate = () => onActivated(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', applyUpdate);
  navigator.serviceWorker.register('./sw.js')
    .then(reg => {
      swReg = reg;
      // zusätzlich über den Zustand des neuen Service Workers – iOS meldet controllerchange nicht immer zuverlässig
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (nw) nw.addEventListener('statechange', () => { if (nw.state === 'activated') onActivated(nw); });
      });
      syncPush().catch(() => { /* später erneut */ });
      return reg.update();
    })
    .catch(() => { /* offline-Cache ist nur Komfort */ });
}
// Tipp auf eine Mitteilung „Tag tracken?“ öffnet gleich das Tracking
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', ev => {
    if (ev.data && ev.data.zyklus === 'track' && tr.n === null) { checkNewDay(); openTracker(today); }
  });
}
if (new URLSearchParams(location.search).get('m') === 'track') {
  history.replaceState(null, '', location.pathname);
  openTracker(today);
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// nur für automatische Tests
window.__zyklus = {
  get state() { return state; }, get analysis() { return A; }, get wheelDay() { return wheelSel(); },
  get wheelAngle() { return wheel.angle; }, get wheelCycle() { return wheel.cyc && { start: wheel.cyc.start, len: wheel.cyc.len }; },
};
