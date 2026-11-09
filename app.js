import * as C from './cycle.js';
import { CATS, CHIP_CATS, CAT, OPT, NOTE_MAX, TAG_MAX, choose, toggle, cleanTags } from './tracking.js';

// ---------------------------------------------------------------------------
// Grundlagen
// ---------------------------------------------------------------------------
const KEY = 'zyklus-daten';
const APP_VERSION = '1.0';
const PREFIX = new Set(['period', 'spot', 'energy', 'discharge', 'skin', 'digest']);
const TITLES = { home: 'Hallo', cal: 'Kalender', stats: 'Statistik', settings: 'Einstellungen' };
const VIEWS = { home: '#view-home', cal: '#view-cal', stats: '#view-stats', settings: '#view-settings' };
const RANGES = { cycleLength: [20, 45, 28], periodLength: [2, 10, 5], lutealLength: [10, 16, 14] };
const FUTURE_MSG = 'Für die Zukunft gibt es nur die Vorhersage';

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
const fmtSleep = m => `${Math.floor(m / 60)} Std.${m % 60 ? ` ${m % 60} Min.` : ''}`;
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
    settings: { name: '', cycleLength: 28, periodLength: 5, lutealLength: 14, showFertile: true, hiddenCats: [], customTags: [] },
    meta: { created: new Date().toISOString(), lastBackup: null },
  };
}
const blankEntry = () => ({ tags: {}, custom: [], sleep: null, weight: null, note: '' });
const hasContent = e => Object.keys(e.tags).length > 0 || e.custom.length > 0 || !!e.sleep || !!e.weight || !!e.note.trim();
const hasExtra = e => Object.keys(e.tags).some(k => k !== 'period') || e.custom.length > 0 || !!e.sleep || !!e.weight || !!e.note.trim();

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
  if (typeof s.name === 'string') d.settings.name = s.name.trim().slice(0, 30);
  if (Array.isArray(s.hiddenCats)) d.settings.hiddenCats = s.hiddenCats.filter(id => CAT[id] && !CAT[id].fixed);
  d.settings.customTags = strList(s.customTags, 30, TAG_MAX);
  if (o.meta && typeof o.meta.created === 'string') d.meta.created = o.meta.created;
  if (o.meta && typeof o.meta.lastBackup === 'string' && Number.isFinite(Date.parse(o.meta.lastBackup))) d.meta.lastBackup = o.meta.lastBackup;
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
const ui = { tab: 'home', y: D(today).getUTCFullYear(), m: D(today).getUTCMonth(), mark: false };

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
function commit() { save(); refresh(); }

// ---------------------------------------------------------------------------
// Ansichten
// ---------------------------------------------------------------------------
function render() {
  for (const [k, sel] of Object.entries(VIEWS)) $(sel).hidden = k !== ui.tab;
  $$('.tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === ui.tab ? 'page' : 'false'));
  $('#title').textContent = ui.tab === 'home' && state.settings.name ? `Hallo ${state.settings.name}` : TITLES[ui.tab];
  ({ home: renderHome, cal: renderCal, stats: renderStats, settings: renderSettings })[ui.tab]();
}

function switchTab(tab) {
  ui.tab = tab;
  render();
  window.scrollTo(0, 0);
}

// --- Heute -----------------------------------------------------------------
function ringSvg() {
  const L = Math.max(A.cycleLen, A.cycleDay);
  const R = 84, circ = 2 * Math.PI * R, s = A.last.start;
  const arc = (from, to, cls) => {
    const f0 = Math.max(0, from) / L, f1 = Math.min(L, to) / L;
    if (f1 <= f0) return '';
    return `<circle class="${cls}" cx="100" cy="100" r="${R}" stroke-dasharray="${((f1 - f0) * circ).toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${(-f0 * circ).toFixed(2)}"/>`;
  };
  const periodEnd = (A.ongoing ? A.expectedEnd : A.last.end) - s + 1;
  let g = `<circle class="ring-bg" cx="100" cy="100" r="${R}"/>`;
  if (state.settings.showFertile) g += arc(A.curWindow.start - s, A.curWindow.end - s + 1, 'ring-fertile');
  g += arc(0, periodEnd, 'ring-period');
  const frac = Math.min(1, (A.cycleDay - 0.5) / L);
  const ang = frac * 2 * Math.PI - Math.PI / 2;
  const mx = 100 + R * Math.cos(ang), my = 100 + R * Math.sin(ang);
  return `<svg class="ring" viewBox="0 0 200 200" aria-hidden="true"><g transform="rotate(-90 100 100)">${g}</g><circle class="ring-marker" cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="10"/></svg>`;
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
  if (e.sleep) chips.push(`<span class="mini-chip tone-indigo"><span class="em" aria-hidden="true">🛌</span>${fmtSleep(e.sleep)} Schlaf</span>`);
  if (e.weight) chips.push(`<span class="mini-chip tone-blue"><span class="em" aria-hidden="true">⚖️</span>${fmtKg(e.weight)}</span>`);
  let html = chips.length ? `<div class="mini-chips">${chips.join('')}</div>` : '';
  if (e.note.trim()) html += `<p class="note-text">${esc(e.note)}</p>`;
  return html;
}

function renderHome() {
  const out = [];
  out.push(`<p class="date-line">${esc(fLong(today))}</p>`);
  if (isIOS && !standalone) {
    out.push(`<div class="card hint-card"><b>So wird es eine richtige App:</b> In Safari auf <b>Teilen</b> <span class="share-ic" aria-hidden="true">⇧</span> tippen (bei neuem iOS erst auf <b>„…“</b>), dann <b>„Zum Home-Bildschirm“</b>. Danach nur noch über das neue Icon öffnen – Einträge hier im Safari-Tab landen nicht in der App.</div>`);
  }
  if (!storageOk) out.push('<div class="card warn-card">Speichern ist gerade nicht möglich (privates Surfen oder Speicher voll). Einträge gehen beim Schließen verloren.</div>');

  if (!A.hasData) {
    out.push(`<div class="card hero welcome">
      <div class="welcome-em" aria-hidden="true">🌸</div>
      <h2>Willkommen${state.settings.name ? `, ${esc(state.settings.name)}` : ''}!</h2>
      <label class="name-field"><span>Wie heißt du? <small>(bleibt nur auf diesem Gerät)</small></span><input id="name-input" type="text" maxlength="30" autocomplete="given-name" placeholder="Vorname" value="${esc(state.settings.name)}"></label>
      <p>Markier die Tage deiner letzten Periode. Danach rechnet die App die nächste Periode${state.settings.showFertile ? ' und die fruchtbaren Tage' : ''} selbst aus – je mehr Zyklen du einträgst, desto genauer.</p>
      <button class="btn primary" data-act="start-mark">Letzte Periode im Kalender markieren</button>
    </div>`);
  } else {
    const st = homeStatus();
    out.push(`<div class="card hero">
      <div class="ring-wrap">${ringSvg()}<div class="ring-center"><span class="rc-small">Zyklustag</span><span class="rc-big">${A.cycleDay}</span><span class="rc-small">von ca. ${A.cycleLen}</span></div></div>
      <h2 class="status">${esc(st.head)}</h2>
      ${st.sub ? `<p class="status-sub">${esc(st.sub)}</p>` : ''}
      ${st.fert ? `<p class="fert-line"><i class="dot-fertile" aria-hidden="true"></i>${esc(st.fert)}</p>` : ''}
    </div>`);
  }

  const e = state.days[C.toIso(today)];
  const isP = C.isPeriodDay(e);
  out.push(`<div class="actions">
    <button class="btn big ${isP ? 'on' : 'primary'}" data-act="toggle-today" aria-pressed="${isP}">${isP ? '✓ Heute Periode' : '🩸 Periode heute'}</button>
    <button class="btn big" data-act="track-today">＋ Tag tracken</button>
  </div>`);
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
    out.push(`<div class="card backup-card"><div><b>Zeit für ein Backup</b><p>Deine Einträge liegen nur auf diesem Gerät. Speicher ab und zu eine Kopie in „Dateien“ oder iCloud.</p></div><button class="btn small primary" data-act="export">Backup speichern</button></div>`);
  }
  out.push('<p class="disclaimer">Vorhersagen sind Schätzungen aus deinen Einträgen – kein Verhütungsmittel und kein Ersatz für ärztlichen Rat.</p>');
  $('#view-home').innerHTML = out.join('');
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

function renderCal() {
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
        <h2>${esc(fMonth(first))}</h2>
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
    </div>`;
}
function shiftMonth(delta) {
  const d = new Date(Date.UTC(ui.y, ui.m + delta, 1));
  ui.y = d.getUTCFullYear();
  ui.m = d.getUTCMonth();
  renderCal();
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
    const ph = C.cyclePhase(n, A.periods, A.cycleLen);
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

function renderStats() {
  const out = [];
  const nDays = Object.keys(state.days).length;
  if (!nDays) {
    $('#view-stats').innerHTML = '<div class="card empty"><div class="welcome-em" aria-hidden="true">📊</div><p>Noch keine Daten. Sobald du Periodentage und Symptome einträgst, siehst du hier deine Zyklen und Muster.</p></div>';
    return;
  }
  if (A.hasData) {
    const tile = (label, value, sub) => `<div class="tile"><span class="t-label">${label}</span><b>${value}</b><span class="t-sub">${sub}</span></div>`;
    out.push(`<div class="tiles">
      ${tile('Ø Zyklus', plural(A.cycleLen, 'Tag', 'Tage'), A.usedCycles ? `aus ${plural(A.usedCycles, 'Zyklus', 'Zyklen')}` : 'Standardwert')}
      ${tile('Ø Periode', plural(A.periodLen, 'Tag', 'Tage'), A.usedPeriods ? `aus ${plural(A.usedPeriods, 'Periode', 'Perioden')}` : 'Standardwert')}
      ${tile('Schwankung', A.spread !== null ? `± ${plural(A.spread, 'Tag', 'Tage')}` : '–', A.spread !== null ? 'von Zyklus zu Zyklus' : 'ab 3 Zyklen')}
      ${tile('Kürzester / längster', A.shortest !== null ? `${A.shortest} / ${A.longest}` : '–', 'Zykluslänge in Tagen')}
    </div>`);

    const rows = [{ start: A.last.start, length: A.cycleDay, periodDays: A.last.end - A.last.start + 1, extraDays: A.last.extra.reduce((s, e) => s + e.end - e.start + 1, 0), current: true }];
    for (const c of [...A.cycles].reverse().slice(0, 24)) rows.push(c);
    const max = Math.max(35, A.cycleLen, ...rows.map(r => r.length));
    out.push(`<div class="card"><h3>Deine Zyklen</h3><ul class="cycles">${rows.map(r => `
      <li class="${r.note ? 'excluded' : ''}">
        <div class="c-top"><span>${r.current ? 'Aktuell · seit' : 'ab'} ${fDMY(r.start)}</span><b>${r.current ? `Tag ${r.length}` : plural(r.length, 'Tag', 'Tage')}</b></div>
        <div class="c-bar"><span class="c-len" style="width:${((r.length / max) * 100).toFixed(1)}%"><span class="c-per" style="width:${Math.min(100, (r.periodDays / r.length) * 100).toFixed(1)}%"></span></span></div>
        <div class="c-sub">Periode ${plural(r.periodDays, 'Tag', 'Tage')}${r.extraDays ? ` · Zwischenblutung ${plural(r.extraDays, 'Tag', 'Tage')}` : ''}${r.note ? ` · nicht mitgezählt: ${esc(r.note)}` : ''}</div>
      </li>`).join('')}</ul></div>`);
  }

  const pats = collectPatterns();
  const cards = [];
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
  if (cards.length) {
    out.push('<h2 class="section-title">Muster</h2><p class="muted small">Wie oft du etwas eingetragen hast und an welchem Zyklustag es meistens auftritt (Tag 1 = erster Periodentag).</p>');
    out.push(cards.join(''));
  }

  const entries = Object.entries(state.days).map(([iso, e]) => ({ n: C.toNum(iso), e })).sort((a, b) => a.n - b.n);
  const sleeps = entries.filter(x => x.e.sleep && x.n > today - 30).map(x => x.e.sleep);
  const weights = entries.filter(x => x.e.weight);
  if (sleeps.length || weights.length) {
    let body = '';
    if (sleeps.length) body += `<div class="row compact"><span class="row-title">🛌 Ø Schlaf (30 Tage)</span><b>${fmtSleep(Math.round(sleeps.reduce((s, x) => s + x, 0) / sleeps.length))}</b></div>`;
    if (weights.length) {
      const lastW = weights[weights.length - 1];
      const ref = weights.find(x => x.n >= lastW.n - 90);
      const diff = ref && ref !== lastW ? Math.round((lastW.e.weight - ref.e.weight) * 10) / 10 : null;
      body += `<div class="row compact"><span class="row-title">⚖️ Gewicht (${fDMY(lastW.n)})</span><b>${fmtKg(lastW.e.weight)}</b></div>`;
      if (diff !== null) body += `<p class="muted small">${diff === 0 ? 'Unverändert' : `${diff > 0 ? '+' : '−'}${fmtKg(Math.abs(diff))}`} seit ${fDMY(ref.n)}</p>`;
    }
    out.push(`<div class="card"><h3>Schlaf & Gewicht</h3>${body}</div>`);
  }
  $('#view-stats').innerHTML = out.join('');
}

// --- Einstellungen -----------------------------------------------------------
function catToggles() {
  const hidden = new Set(state.settings.hiddenCats);
  return CATS.filter(c => !c.fixed).map(c => `
    <label class="row compact"><span class="row-title">${esc(c.name)}</span>
      <span class="switch"><input type="checkbox" data-cat-toggle="${c.id}" ${hidden.has(c.id) ? '' : 'checked'}><span></span></span>
    </label>`).join('');
}

function renderSettings() {
  const s = state.settings;
  const stepper = (key, label, sub) => `
    <div class="row"><div><div class="row-title">${label}</div><div class="row-sub">${sub}</div></div>
      <div class="stepper" data-key="${key}">
        <button data-step="-1" aria-label="${label} verringern">−</button><output>${s[key]}</output><button data-step="1" aria-label="${label} erhöhen">+</button>
      </div>
    </div>`;
  const nDays = Object.keys(state.days).length;
  const lb = state.meta.lastBackup;
  $('#view-settings').innerHTML = `
    <div class="card"><h3>Persönlich</h3>
      <label class="row"><div><div class="row-title">Dein Name</div><div class="row-sub">Für die Begrüßung, bleibt nur auf diesem Gerät.</div></div>
        <input id="name-input" class="name-input" type="text" maxlength="30" autocomplete="given-name" placeholder="Vorname" value="${esc(s.name)}"></label>
    </div>
    <div class="card"><h3>Vorhersage</h3>
      ${stepper('cycleLength', 'Zykluslänge', A.usedCycles ? `Gerade nicht im Einsatz – die App nutzt deinen Schnitt (${A.cycleLen} Tage).` : 'Gilt, bis ein ganzer Zyklus eingetragen ist.')}
      ${stepper('periodLength', 'Periodendauer', A.usedPeriods ? `Gerade nicht im Einsatz – dein Schnitt: ${A.periodLen} Tage.` : 'Gilt, bis eine Periode eingetragen ist.')}
      ${stepper('lutealLength', 'Lutealphase', 'Tage vom Eisprung bis zur Periode, meist 14.')}
      <label class="row"><div><div class="row-title">Fruchtbare Tage anzeigen</div><div class="row-sub">Kalender-Schätzung, kein Verhütungsmittel.</div></div>
        <span class="switch"><input type="checkbox" data-setting="showFertile" ${s.showFertile ? 'checked' : ''}><span></span></span>
      </label>
    </div>
    <div class="card"><h3>Tracking-Kategorien</h3>
      <p class="muted small">Ausgeblendete Kategorien tauchen beim Tracken nicht auf. Gespeicherte Einträge bleiben erhalten.</p>
      ${catToggles()}
      <h4>Meine Tags</h4>
      ${s.customTags.length
        ? `<div class="tag-list">${s.customTags.map(t => `<span class="tag-item">${esc(t)}<button data-del-tag="${esc(t)}" aria-label="Tag ${esc(t)} löschen">✕</button></span>`).join('')}</div>`
        : '<p class="muted small">Noch keine. Eigene Tags legst du beim Tracken unter „Meine Tags“ an.</p>'}
    </div>
    <div class="card"><h3>Backup</h3>
      <p class="muted small">Deine Einträge liegen nur auf diesem Gerät. Wird die App gelöscht oder das Handy gewechselt, sind sie ohne Backup weg. Das Backup ist eine Datei, die du z. B. in „Dateien“ oder iCloud ablegst.</p>
      <div class="btn-row"><button class="btn primary" data-act="export">Backup speichern</button><button class="btn" data-act="import">Backup laden</button></div>
      <p class="row-sub">Letztes Backup: ${lb ? esc(fDMY(C.todayNum(new Date(lb)))) : 'noch keins'}</p>
    </div>
    <div class="card"><h3>Datenschutz</h3>
      <ul class="plain">
        <li>Kein Konto, keine Cloud, keine Werbung, keine Analyse-Tools.</li>
        <li>Einträge verlassen dieses Gerät nie – außer du speicherst selbst ein Backup.</li>
        <li>Aus dem Internet lädt die App nur ihren eigenen Programmcode (für Updates).</li>
      </ul>
    </div>
    <div class="card"><button class="btn danger wide" data-act="wipe">Alle Daten löschen</button></div>
    <p class="foot">Zyklus ${APP_VERSION} · ${plural(nDays, 'Tag', 'Tage')} eingetragen</p>`;
}

function stepSetting(key, delta) {
  const [lo, hi] = RANGES[key];
  state.settings[key] = Math.min(hi, Math.max(lo, state.settings[key] + delta));
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
  $('#tracker').hidden = false;
  document.body.classList.add('tr-open');
  renderTracker();
  $('#tr-scroll').scrollTop = 0;
}
function loadDay(n) {
  tr.n = n;
  tr.draft = entry(n);
  tr.dirty = false;
}
function hideTracker() {
  $('#tracker').hidden = true;
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
  return `<div class="sec-head"><h2>${esc(c.name)}</h2>${c.info ? `<button class="more" data-info="${c.id}" aria-expanded="${open}">Mehr erfahren <span aria-hidden="true">${open ? '⌃' : '›'}</span></button>` : ''}${extra}</div>${open ? `<p class="sec-info">${esc(c.info)}</p>` : ''}`;
}

function sectionHtml(c) {
  const q = tr.q.trim().toLowerCase();
  const nameHit = !q || c.name.toLowerCase().includes(q);
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
    const s = tr.draft.sleep;
    const h = s ? String(Math.floor(s / 60)).padStart(2, '0') : '';
    const m = s ? String(s % 60).padStart(2, '0') : '';
    return `<section class="tr-sec" data-sec="sleep">${secHead(c)}
      <div class="num-box">
        <label><input id="sl-h" class="big-num" type="text" inputmode="numeric" autocomplete="off" placeholder="00" value="${h}" aria-label="Stunden Schlaf"><span>Std.</span></label>
        <label><input id="sl-m" class="big-num" type="text" inputmode="numeric" autocomplete="off" placeholder="00" value="${m}" aria-label="Minuten Schlaf"><span>Min.</span></label>
      </div></section>`;
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

function renderTrBody() {
  const hidden = new Set(state.settings.hiddenCats);
  let html = '';
  for (const c of CATS) if (c.fixed || !hidden.has(c.id)) html += sectionHtml(c);
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
}
function toggleCustomTag(name) {
  const i = tr.draft.custom.indexOf(name);
  if (i >= 0) tr.draft.custom.splice(i, 1);
  else tr.draft.custom.push(name);
  markDirty();
  rerenderSection('custom');
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
  try {
    const obj = JSON.parse(await file.text());
    if (!obj || typeof obj !== 'object' || !obj.days || typeof obj.days !== 'object' || Array.isArray(obj.days)) throw new Error('kein Backup');
    const data = normalize(obj);
    const count = Object.keys(data.days).length;
    if (!confirm(`Backup mit ${plural(count, 'eingetragenem Tag', 'eingetragenen Tagen')} laden? Die aktuellen Einträge auf diesem Gerät werden dabei ersetzt.`)) return;
    state = data;
    save();
    refresh();
    toast('Backup geladen');
  } catch {
    toast('Diese Datei ist kein gültiges Zyklus-Backup');
  }
}
function wipe() {
  if (!confirm('Wirklich alle Einträge und Einstellungen löschen?')) return;
  if (!confirm('Letzte Rückfrage: Das lässt sich ohne Backup nicht rückgängig machen. Löschen?')) return;
  state = freshData();
  ui.mark = false;
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

const ACTIONS = {
  'start-mark'() {
    ui.mark = true;
    ui.y = D(today).getUTCFullYear();
    ui.m = D(today).getUTCMonth();
    switchTab('cal');
    toast('Tippe die Tage deiner letzten Periode an');
  },
  'toggle-today'() {
    const on = togglePeriod(today);
    if (on !== null) toast(on ? 'Heute als Periodentag eingetragen' : 'Periode für heute entfernt');
  },
  'track-today'() { openTracker(today); },
  'cal-prev'() { shiftMonth(-1); },
  'cal-next'() { shiftMonth(1); },
  'cal-today'() { ui.y = D(today).getUTCFullYear(); ui.m = D(today).getUTCMonth(); renderCal(); },
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
  'export'() { exportBackup(); },
  'import'() { $('#import-file').click(); },
  'wipe'() { wipe(); },
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
  if (!tr.draft) return;
  if (t.id === 'note') {
    tr.draft.note = t.value.slice(0, NOTE_MAX);
    $('#note-count').textContent = tr.draft.note.length;
    markDirty();
  } else if (t.id === 'sl-h' || t.id === 'sl-m') {
    // wie eine Digitaluhr: immer die letzten zwei Ziffern, so kann man in ein volles Feld weitertippen
    t.value = t.value.replace(/\D/g, '').slice(-2);
    readSleep();
  } else if (t.id === 'wt') {
    t.value = t.value.replace(/[^\d.,]/g, '');
    readWeight(false);
  }
});

document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.dataset.setting) {
    state.settings[t.dataset.setting] = t.checked;
    commit();
  } else if (t.dataset.catToggle) {
    const id = t.dataset.catToggle;
    const hidden = new Set(state.settings.hiddenCats);
    if (t.checked) hidden.delete(id); else hidden.add(id);
    state.settings.hiddenCats = [...hidden];
    save();
    if (tr.n !== null) renderTrBody();
    if (ui.tab === 'settings' && tr.n === null) renderSettings();
  } else if (t.id === 'name-input') {
    // nicht alles neu zeichnen: sonst geht ein gleichzeitiger Tipp auf einen Knopf verloren
    const name = t.value.trim().slice(0, 30);
    state.settings.name = name;
    save();
    if (ui.tab === 'home') $('#title').textContent = name ? `Hallo ${name}` : TITLES.home;
    const h = $('.welcome h2');
    if (h) h.textContent = `Willkommen${name ? `, ${name}` : ''}!`;
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

document.addEventListener('keydown', ev => {
  if (ev.key === 'Enter' && ev.target.id === 'tag-input') { ev.preventDefault(); addCustomTag(); }
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
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (tr.n !== null && tr.dirty && commitDraft()) {
      $('#tr-save').disabled = true;
      if (askResolve) answerAsk('stay');
    }
  } else {
    checkNewDay();
    if (swReg) swReg.update().catch(() => {});
  }
});
setInterval(checkNewDay, 60000);

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

render();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Nur bei einem echten Update neu laden, nicht bei der ersten Installation und nie mitten im Tracken
    if (!hadController || reloading) return;
    if (tr.n !== null) { toast('Update geladen – wird beim nächsten Öffnen aktiv'); return; }
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register('./sw.js')
    .then(reg => { swReg = reg; return reg.update(); })
    .catch(() => { /* offline-Cache ist nur Komfort */ });
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// nur für automatische Tests
window.__zyklus = { get state() { return state; }, get analysis() { return A; } };
