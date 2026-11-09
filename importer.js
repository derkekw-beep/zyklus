// Importierte Tage mit vorhandenen zusammenführen – ohne DOM, damit es in Node getestet werden kann.
// Grundsatz: Was schon in der App steht, gewinnt immer. Import füllt nur Lücken und ergänzt.
// Einträge haben die Form { tags, custom, sleep, bed, wake, pill, weight, note } (wie in app.js nach cleanEntry).
import { CAT, choose, NOTE_MAX } from './tracking.js';

const copy = o => JSON.parse(JSON.stringify(o));
const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Eine importierte Option nur übernehmen, wenn sie nichts Vorhandenes verdrängt
function addTag(tags, catId, id) {
  const before = new Set(tags[catId] || []);
  if (before.has(id)) return 'gleich';
  const trial = choose(copy(tags), catId, id);
  const kept = trial[catId] || [];
  const lostOwn = [...before].some(x => !kept.includes(x));
  const c = CAT[catId];
  const lostOther = c && c.clears && tags[c.clears] && !trial[c.clears];
  if (lostOwn || lostOther) return 'konflikt';
  Object.assign(tags, trial);
  return 'neu';
}

export function mergeEntry(own, inc, source = 'Import') {
  const e = copy(own);
  let changed = false;
  let conflicts = 0;
  for (const [cat, ids] of Object.entries(inc.tags || {})) {
    for (const id of ids) {
      const r = addTag(e.tags, cat, id);
      if (r === 'neu') changed = true;
      if (r === 'konflikt') conflicts++;
    }
  }
  for (const t of inc.custom || []) {
    if (!e.custom.some(x => x.toLowerCase() === t.toLowerCase())) { e.custom.push(t); changed = true; }
  }
  // Schlaf als Ganzes: entweder komplett aus der App oder komplett aus dem Import
  const ownSleep = e.sleep || e.bed !== null || e.wake !== null;
  const incSleep = inc.sleep || inc.bed !== null || inc.wake !== null;
  if (incSleep) {
    if (!ownSleep) { e.sleep = inc.sleep; e.bed = inc.bed; e.wake = inc.wake; changed = true; }
    else if (!sameJSON([e.sleep, e.bed, e.wake], [inc.sleep, inc.bed, inc.wake])) conflicts++;
  }
  if (inc.pill && !e.pill) { e.pill = copy(inc.pill); changed = true; }
  if (inc.weight) {
    if (!e.weight) { e.weight = inc.weight; changed = true; }
    else if (e.weight !== inc.weight) conflicts++;
  }
  const n = (inc.note || '').trim();
  if (n && !e.note.includes(n)) {
    const joined = e.note.trim() ? `${e.note.trim()}\n\n[${source}] ${n}` : n;
    // nie über die Höchstlänge: die eigene Notiz bleibt immer ganz, der Import-Teil wird ggf. gekürzt
    e.note = joined.length <= NOTE_MAX ? joined : `${joined.slice(0, NOTE_MAX - 1)}…`;
    changed = true;
  }
  return { entry: e, changed, conflicts };
}

// ---------------------------------------------------------------------------------------------
// Clue-Export (measurements.json): [{ date: "JJJJ-MM-TT", type: "pain", value: {option} | [{option}, …] }]
// Bestätigt aus einem echten Clue-Export: period (light/medium/heavy), pain, birth_control_pill (taken), discharge,
// energy, skin, feelings. Weitere Bezeichnungen sind Clue-Namen nach demselben Schema; was nicht
// zugeordnet werden kann, wird als eigener Tag übernommen – es geht nichts verloren.
// ---------------------------------------------------------------------------------------------
const M = (cat, opts) => ({ cat, opts });
export const CLUE_MAP = {
  period: M('period', { light: 'leicht', medium: 'mittel', heavy: 'stark', very_heavy: 'sehrstark', super_heavy: 'sehrstark' }),
  spotting: M('spot', { red: 'rot', brown: 'braun', red_spotting: 'rot', brown_spotting: 'braun' }),
  feelings: M('feel', {
    mood_swings: 'schwankungen', moody: 'schwankungen', out_of_control: 'kontrollverlust', fine: 'gut', good: 'gut',
    happy: 'froehlich', sad: 'traurig', sensitive: 'sensibel', angry: 'wuetend', confident: 'selbstbewusst',
    excited: 'aufgeregt', irritable: 'reizbar', anxious: 'unruhig', restless: 'unruhig', insecure: 'unsicher',
    grateful: 'dankbar', indifferent: 'gleichmuetig', calm: 'gleichmuetig',
  }),
  emotions: null, // wird unten auf feelings gesetzt
  pain: M('pain', {
    pain_free: 'frei', no_pain: 'frei', none: 'frei', period_cramps: 'kraempfe', cramps: 'kraempfe',
    ovulation: 'mittelschmerz', ovulation_pain: 'mittelschmerz', breast_tenderness: 'brueste', tender_breasts: 'brueste',
    headache: 'kopf', migraine: 'migraene', migraine_with_aura: 'aura', lower_back: 'ruecken', back: 'ruecken',
    leg: 'bein', legs: 'bein', joint: 'gelenke', joints: 'gelenke', vulva: 'vulva', vulvar_pain: 'vulva',
  }),
  pms: M('pms', { pms: 'pms', yes: 'pms', present: 'pms' }),
  sleep_quality: M('sleepq', {
    trouble_falling_asleep: 'einschlafen', difficulty_falling_asleep: 'einschlafen', woke_up_refreshed: 'erholt', refreshed: 'erholt',
    woke_up_tired: 'muede', tired: 'muede', restless_sleep: 'unruhig', restless: 'unruhig', vivid_dreams: 'traeume', night_sweats: 'schwitzen',
  }),
  sex: M('sex', {
    protected: 'geschuetzt', unprotected: 'ungeschuetzt', withdrawal: 'interruptus', no_sex: 'kein', didnt_have_sex: 'kein',
    high_sex_drive: 'libido_hoch', high_libido: 'libido_hoch', low_sex_drive: 'libido_niedrig', low_libido: 'libido_niedrig',
    masturbation: 'solo', sex_toy: 'toy', orgasm: 'orgasmus', no_orgasm: 'kein_orgasmus', fantasies: 'fantasien', painful: 'schmerzhaft', painful_sex: 'schmerzhaft',
  }),
  energy: M('energy', { exhausted: 'leer', tired: 'muede', ok: 'ok', fine: 'ok', energized: 'geladen', energetic: 'geladen', fully_energized: 'sehr', very_energized: 'sehr' }),
  mind: M('mind', { focused: 'konzentriert', distracted: 'abgelenkt', motivated: 'motiviert', unmotivated: 'unmotiviert', creative: 'kreativ', stressed: 'gestresst', forgetful: 'vergesslich' }),
  digestion: M('digest', { great: 'gut', good: 'gut', fine: 'gut', gassy: 'blaehungen', bloated: 'blaehbauch', constipated: 'verstopfung', diarrhea: 'durchfall', nauseated: 'uebelkeit', nausea: 'uebelkeit', cravings: 'heisshunger' }),
  discharge: M('discharge', { none: 'keinen', sticky: 'klebrig', creamy: 'cremig', egg_white: 'fadenziehend', eggwhite: 'fadenziehend', atypical: 'untypisch', unusual: 'untypisch' }),
  skin: M('skin', { ok: 'ok', fine: 'ok', good: 'gut', great: 'gut', acne: 'pickel', pimples: 'pickel', dry: 'trocken', oily: 'fettig', itchy: 'juckend' }),
  hair: M('hair', { normal: 'normal', fine: 'normal', good: 'gut', bad: 'schlecht', oily: 'fettig', oily_scalp: 'fettig', dry: 'trocken', dry_scalp: 'trocken', hair_loss: 'ausfall' }),
  birth_control_pill: M('bc', { taken: 'genommen', missed: 'vergessen', late: 'spaet', taken_late: 'spaet', double: 'doppelt', double_dose: 'doppelt' }),
};
CLUE_MAP.emotions = CLUE_MAP.feelings;
CLUE_MAP.digestion_and_stool = CLUE_MAP.digestion;
CLUE_MAP.sexual_health = CLUE_MAP.sex;
CLUE_MAP.pill = CLUE_MAP.birth_control_pill;

const CLUE_TYPE_DE = {
  period: 'Periode', spotting: 'Schmierblutung', feelings: 'Gefühl', pain: 'Schmerz', pms: 'PMS', sleep_quality: 'Schlaf', sleep: 'Schlaf',
  sex: 'Sex', energy: 'Energie', mind: 'Geist', digestion: 'Verdauung', discharge: 'Ausfluss', skin: 'Haut', hair: 'Haare',
  birth_control_pill: 'Pille', social: 'Sozial', exercise: 'Sport', craving: 'Heißhunger', cravings: 'Heißhunger', tests: 'Test',
  medication: 'Medikament', ailment: 'Beschwerde', collection_method: 'Hygiene', party: 'Party', appointment: 'Termin',
};
const nice = s => String(s).replace(/[_-]+/g, ' ').trim();
const clueTag = (type, opt) => `${CLUE_TYPE_DE[type] || nice(type)}: ${nice(opt)}`.slice(0, 30);

const isIso = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const blank = () => ({ tags: {}, custom: [], sleep: null, bed: null, wake: null, pill: null, weight: null, note: '' });
const firstNumber = v => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v && typeof v === 'object') for (const k of ['value', 'weight', 'kg', 'amount', 'hours', 'duration']) if (typeof v[k] === 'number') return v[k];
  return null;
};

// Liste der Messungen finden – auch wenn sie in einem Objekt steckt
function measurementList(json) {
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object') {
    for (const k of ['measurements', 'data', 'entries', 'tracking']) if (Array.isArray(json[k])) return json[k];
  }
  return null;
}
export function looksLikeClue(json) {
  const list = measurementList(json);
  if (!list || !list.length) return false;
  const sample = list.slice(0, 50);
  const ok = sample.filter(m => m && isIso(m.date) && typeof m.type === 'string').length;
  return ok / sample.length >= 0.8; // einzelne kaputte Einträge sollen nicht die ganze Datei ablehnen
}

export function parseClue(json, today = Infinity, toNum = null) {
  const list = measurementList(json);
  if (!list) throw new Error('Das ist keine Clue-Datei (keine Messungen gefunden)');
  const days = {};
  const unknown = new Map();
  const stats = { messungen: list.length, uebernommen: 0, alsTag: 0, uebersprungen: 0, zukunft: 0, tage: 0 };
  for (const m of list) {
    if (!m || !isIso(m.date) || typeof m.type !== 'string') { stats.uebersprungen++; continue; }
    if (toNum && toNum(m.date) > today) { stats.zukunft++; continue; }
    const e = (days[m.date] ||= blank());
    const type = m.type.toLowerCase();
    const v = m.value;
    // Zahlenwerte
    if (/weight/.test(type)) {
      const w = firstNumber(v);
      if (w) { e.weight = w; stats.uebernommen++; } else stats.uebersprungen++;
      continue;
    }
    if (/sleep/.test(type) && !/quality/.test(type) && firstNumber(v) !== null) {
      const h = firstNumber(v);
      e.sleep = Math.round(h > 24 ? h : h * 60); // Stunden oder schon Minuten
      stats.uebernommen++;
      continue;
    }
    if (/note/.test(type)) {
      const t = typeof v === 'string' ? v : v && typeof v === 'object' ? (v.text || v.note || v.value || '') : '';
      if (t) { e.note = e.note ? `${e.note}\n${t}` : String(t); stats.uebernommen++; } else stats.uebersprungen++;
      continue;
    }
    const opts = Array.isArray(v) ? v.map(x => (x && typeof x === 'object' ? (x.option || x.name) : x)) : v && typeof v === 'object' ? [v.option || v.name] : [v];
    // eigene Tags aus Clue: Namen direkt als eigenen Tag übernehmen
    if (/tag/.test(type)) {
      for (const o of opts) {
        if (typeof o !== 'string' || !o.trim()) { stats.uebersprungen++; continue; }
        const t = o.trim().slice(0, 30);
        if (!e.custom.includes(t)) e.custom.push(t);
        stats.uebernommen++;
      }
      continue;
    }
    const map = CLUE_MAP[type];
    for (const o of opts) {
      if (typeof o !== 'string' || !o) { stats.uebersprungen++; continue; }
      const target = map && map.opts[o.toLowerCase()];
      if (target && CAT[map.cat] && CAT[map.cat].optIds.has(target)) {
        choose(e.tags, map.cat, target);
        stats.uebernommen++;
      } else {
        const tag = clueTag(type, o);
        if (!e.custom.includes(tag)) e.custom.push(tag);
        unknown.set(tag, (unknown.get(tag) || 0) + 1);
        stats.alsTag++;
      }
    }
  }
  stats.tage = Object.keys(days).length;
  return { days, stats, unknown: [...unknown].sort((a, b) => b[1] - a[1]) };
}

// ---------------------------------------------------------------------------------------------
// Datei lesen: JSON direkt, ZIP ohne Bibliothek (nur unverschlüsselt). Liefert [{ name, text }].
// ---------------------------------------------------------------------------------------------
export async function readImportFile(buf) {
  const head = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
  if (!(head[0] === 0x50 && head[1] === 0x4b)) return [{ name: 'datei.json', text: new TextDecoder().decode(buf).replace(/^﻿/, '') }];
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Die ZIP-Datei ist beschädigt');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = [];
  for (let i = 0; i < count; i++) {
    const flags = dv.getUint16(p + 8, true), method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nlen));
    p += 46 + nlen + elen + clen;
    if (!/\.json$/i.test(name)) continue;
    if (flags & 1) throw new Error('Die ZIP-Datei ist passwortgeschützt – bitte erst in der Dateien-App entpacken und die JSON-Datei wählen');
    const ln = dv.getUint16(local + 26, true), le = dv.getUint16(local + 28, true);
    const data = new Uint8Array(buf, local + 30 + ln + le, csize);
    let text;
    if (method === 0) text = new TextDecoder().decode(data);
    else if (method === 8) text = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    else continue;
    out.push({ name, text });
  }
  if (!out.length) throw new Error('In der ZIP-Datei ist keine JSON-Datei');
  return out;
}

// own, incoming: { "JJJJ-MM-TT": Eintrag }. Ergebnis: neue Tage + Zahlen für die Vorschau.
export function mergeDays(own, incoming, source = 'Import') {
  const days = copy(own);
  const stats = { neu: 0, ergaenzt: 0, unveraendert: 0, konflikte: 0, perioden: 0 };
  for (const [iso, inc] of Object.entries(incoming)) {
    if (inc.tags && inc.tags.period) stats.perioden++;
    if (!days[iso]) {
      days[iso] = copy(inc);
      stats.neu++;
      continue;
    }
    const r = mergeEntry(days[iso], inc, source);
    days[iso] = r.entry;
    stats.konflikte += r.conflicts;
    if (r.changed) stats.ergaenzt++;
    else stats.unveraendert++;
  }
  return { days, stats };
}
