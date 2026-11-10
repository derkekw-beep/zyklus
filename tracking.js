// Alle Tracking-Kategorien. Die Reihenfolge ist die Reihenfolge im Tracking-Bildschirm.
// opts: [id, Bezeichnung, Emoji]. Die ids werden gespeichert und dürfen sich nicht mehr ändern.
// single: nur eine Auswahl möglich. exclusive: diese Option schließt alle anderen der Kategorie aus.
// groups: Optionen innerhalb einer Gruppe widersprechen sich, es bleibt nur die zuletzt gewählte.
// clears: Wählt man etwas in dieser Kategorie, wird die genannte Kategorie geleert (Periode <-> Schmierblutung).
// tone: Farbfamilie der Chips.

export const CATS = [
  {
    id: 'period', name: 'Periode', tone: 'rose', single: true, fixed: true, clears: 'spot',
    info: 'Trag die Stärke der Blutung ein. Jede Stufe zählt als Periodentag. Der erste Tag einer Periode ist Zyklustag 1 und die Grundlage der Vorhersage. Bis zu zwei vergessene Tage mittendrin trennen die Periode nicht. Blutung weniger als 15 Tage nach Periodenbeginn zählt als Zwischenblutung, nicht als neue Periode.',
    opts: [['leicht', 'Leicht', '🩸'], ['mittel', 'Mittel', '🩸'], ['stark', 'Stark', '🩸'], ['sehrstark', 'Sehr stark', '🩸🩸']],
  },
  {
    id: 'spot', name: 'Schmierblutung', tone: 'rose', single: true, clears: 'period',
    info: 'Schmierblutung zählt nicht als Periodentag und verändert die Vorhersage nicht. Ein Tag ist entweder Periode oder Schmierblutung.',
    opts: [['rot', 'Rot', '🔴'], ['braun', 'Braun', '🟤']],
  },
  {
    id: 'feel', name: 'Gefühle', tone: 'amber',
    opts: [
      ['schwankungen', 'Stimmungsschwankungen', '🎢'], ['kontrollverlust', 'Kontrollverlust', '🌀'],
      ['gut', 'Gut', '🙂'], ['froehlich', 'Fröhlich', '😄'], ['traurig', 'Traurig', '😢'],
      ['sensibel', 'Sensibel', '🥺'], ['wuetend', 'Wütend', '😠'], ['selbstbewusst', 'Selbstbewusst', '😎'],
      ['aufgeregt', 'Aufgeregt', '🤩'], ['reizbar', 'Reizbar', '😤'], ['unruhig', 'Unruhig', '😬'],
      ['unsicher', 'Unsicher', '😟'], ['dankbar', 'Dankbar', '🙏'], ['gleichmuetig', 'Gleichmütig', '😌'],
    ],
  },
  {
    id: 'pain', name: 'Schmerzen', tone: 'blue', exclusive: 'frei',
    info: 'Mittelschmerz ist ein ziehender Schmerz auf einer Seite des Unterbauchs rund um den Eisprung.',
    opts: [
      ['frei', 'Schmerzfrei', '😊'], ['kraempfe', 'Krämpfe', '⚡'], ['mittelschmerz', 'Mittelschmerz', '🥚'],
      ['brueste', 'Sensible Brüste', '💗'], ['kopf', 'Kopfschmerzen', '🤕'], ['migraene', 'Migräne', '😖'],
      ['aura', 'Migräne mit Aura', '💫'], ['ruecken', 'Unterer Rücken', '🔻'], ['bein', 'Bein', '🦵'],
      ['gelenke', 'Gelenke', '🦴'], ['vulva', 'Vulva', '🌸'],
    ],
  },
  {
    id: 'pms', name: 'PMS', tone: 'amber',
    info: 'PMS sind körperliche oder seelische Beschwerden in den Tagen vor der Periode.',
    opts: [['pms', 'PMS', '☁️']],
  },
  {
    id: 'sleepq', name: 'Schlafqualität', tone: 'indigo', groups: [['erholt', 'muede']],
    opts: [
      ['einschlafen', 'Einschlafprobleme', '😳'], ['erholt', 'Erholt aufgewacht', '🌞'], ['muede', 'Müde aufgewacht', '🥱'],
      ['unruhig', 'Unruhiger Schlaf', '🔄'], ['traeume', 'Lebhafte Träume', '💭'], ['schwitzen', 'Nächtliches Schwitzen', '💦'],
    ],
  },
  { id: 'sleep', name: 'Schlaf', type: 'sleep', keywords: 'schlaftablette tablette medikament pille einschlafen aufwachen' },
  {
    id: 'sex', name: 'Sexleben', tone: 'teal',
    groups: [['kein', 'geschuetzt'], ['kein', 'ungeschuetzt'], ['kein', 'interruptus'], ['kein', 'schmerzhaft'], ['orgasmus', 'kein_orgasmus'], ['libido_hoch', 'libido_niedrig']],
    info: 'Die fruchtbaren Tage in dieser App sind nur eine Kalender-Schätzung und kein Verhütungsmittel.',
    opts: [
      ['geschuetzt', 'Geschützt', '☂️'], ['ungeschuetzt', 'Ungeschützt', '⚠️'], ['interruptus', 'Interruptus', '↩️'],
      ['kein', 'Heute kein Sex', '🚫'], ['libido_hoch', 'Starke Libido', '🔥'], ['libido_niedrig', 'Schwache Libido', '🧊'],
      ['solo', 'Selbstbefriedigung', '✋'], ['toy', 'Sexspielzeug', '🪄'], ['orgasmus', 'Orgasmus', '🎆'],
      ['kein_orgasmus', 'Kein Orgasmus', '➖'], ['fantasien', 'Fantasien', '🌈'], ['schmerzhaft', 'Schmerzhafter Sex', '💢'],
    ],
  },
  {
    id: 'bc', name: 'Pille (Verhütung)', tone: 'teal', single: true, keywords: 'antibabypille verhütung pille',
    info: 'Für die Antibabypille. Mit der Pille gibt es meist keinen Eisprung – die angezeigten fruchtbaren Tage sind dann nicht aussagekräftig. Du kannst sie unter „Mehr“ ausblenden.',
    opts: [['genommen', 'Genommen', '✅'], ['vergessen', 'Vergessen', '❌'], ['spaet', 'Zu spät genommen', '⏰'], ['doppelt', 'Doppelt genommen', '✌️']],
  },
  {
    id: 'energy', name: 'Energie', tone: 'amber', single: true,
    opts: [
      ['leer', 'Energielos', '🪫'], ['muede', 'Müde', '😴'], ['ok', 'OK', '👌'],
      ['geladen', 'Energiegeladen', '🔋'], ['sehr', 'Sehr energiegeladen', '🚀'],
    ],
  },
  { id: 'note', name: 'Tägliche Notiz', type: 'note' },
  { id: 'custom', name: 'Meine Tags', type: 'custom' },
  {
    id: 'mind', name: 'Geist', tone: 'amber',
    opts: [
      ['konzentriert', 'Konzentriert', '🎯'], ['abgelenkt', 'Abgelenkt', '🦋'], ['motiviert', 'Motiviert', '💪'],
      ['unmotiviert', 'Unmotiviert', '😶'], ['kreativ', 'Kreativ', '🎨'], ['gestresst', 'Gestresst', '😵‍💫'],
      ['vergesslich', 'Vergesslich', '🫥'],
    ],
  },
  {
    id: 'digest', name: 'Verdauung', tone: 'blue', exclusive: 'gut',
    opts: [
      ['gut', 'Gut', '👍'], ['blaehungen', 'Blähungen', '💨'], ['blaehbauch', 'Blähbauch', '🎈'],
      ['verstopfung', 'Verstopfung', '🧱'], ['durchfall', 'Durchfall', '🌊'], ['uebelkeit', 'Übelkeit', '🤢'],
      ['heisshunger', 'Heißhunger', '🍫'],
    ],
  },
  {
    id: 'discharge', name: 'Ausfluss', tone: 'blue', single: true,
    info: 'Klarer, fadenziehender Ausfluss tritt oft rund um den Eisprung auf. Fällt dir etwas Ungewöhnliches auf (Geruch, Farbe, Juckreiz), frag lieber ärztlich nach.',
    opts: [
      ['keinen', 'Keinen', '🚫'], ['klebrig', 'Klebrig', '🍯'], ['cremig', 'Cremig', '🥛'],
      ['fadenziehend', 'Fadenziehend', '💧'], ['untypisch', 'Untypisch', '❗'],
    ],
  },
  {
    id: 'skin', name: 'Haut', tone: 'blue', groups: [['ok', 'gut']],
    opts: [
      ['ok', 'OK', '🙂'], ['gut', 'Gut', '✨'], ['pickel', 'Pickel', '🫧'],
      ['trocken', 'Trocken', '🌵'], ['fettig', 'Fettig', '🫒'], ['juckend', 'Juckend', '🪶'],
    ],
  },
  {
    id: 'hair', name: 'Haare', tone: 'blue', groups: [['normal', 'gut', 'schlecht']],
    opts: [
      ['normal', 'Normale Haare', '💇'], ['gut', 'Gute Haare', '💁'], ['schlecht', 'Schlechte Haare', '🙈'],
      ['fettig', 'Fettige Kopfhaut', '💧'], ['trocken', 'Trockene Kopfhaut', '🌵'], ['ausfall', 'Haarausfall', '🍂'],
    ],
  },
  { id: 'weight', name: 'Gewicht', type: 'weight' },
];

export const CHIP_CATS = CATS.filter(c => !c.type);
export const CAT = Object.fromEntries(CATS.map(c => [c.id, c]));
export const OPT = {};
for (const c of CHIP_CATS) {
  c.optIds = new Set(c.opts.map(o => o[0]));
  OPT[c.id] = Object.fromEntries(c.opts.map(([id, label, emoji]) => [id, { label, emoji }]));
}

export const NOTE_MAX = 3000;
export const TAG_MAX = 40;

// ---------------------------------------------------------------------------
// Auswahl-Regeln (ohne DOM, damit sie in Node getestet werden können)
// ---------------------------------------------------------------------------

// Option wählen: widersprüchliche Optionen fliegen raus. cross=false lässt "clears" weg (für cleanTags).
export function choose(tags, catId, id, cross = true) {
  const c = CAT[catId];
  if (!c || !c.optIds || !c.optIds.has(id)) return tags;
  const cur = tags[catId] || [];
  let next;
  if (c.single || c.exclusive === id) {
    next = [id];
  } else {
    const clash = new Set(c.exclusive ? [c.exclusive, id] : [id]);
    for (const g of c.groups || []) if (g.includes(id)) for (const x of g) clash.add(x);
    next = [...cur.filter(x => !clash.has(x)), id];
  }
  tags[catId] = next;
  if (cross && c.clears) delete tags[c.clears];
  return tags;
}

// Antippen: ist die Option schon gewählt, wird sie abgewählt, sonst gewählt.
export function toggle(tags, catId, id) {
  const cur = tags[catId] || [];
  if (!cur.includes(id)) return choose(tags, catId, id);
  const next = cur.filter(x => x !== id);
  if (next.length) tags[catId] = next;
  else delete tags[catId];
  return tags;
}

// Gespeicherte oder importierte Tags säubern: unbekannte ids raus, Regeln durchsetzen.
// Bei Periode + Schmierblutung am selben Tag gewinnt die Periode.
export function cleanTags(raw) {
  const tags = {};
  if (!raw || typeof raw !== 'object') return tags;
  for (const c of CHIP_CATS) {
    const ids = Array.isArray(raw[c.id]) ? raw[c.id] : [];
    for (const id of new Set(ids)) if (typeof id === 'string') choose(tags, c.id, id, false);
  }
  if (tags.period) delete tags.spot;
  return tags;
}

// ---------------------------------------------------------------------------
// Schnell eintragen: Favoriten, „Wie gestern“ und Suche (ohne DOM, in Node getestet)
// ---------------------------------------------------------------------------
const splitKey = key => { const i = key.indexOf(':'); return { cat: key.slice(0, i), id: key.slice(i + 1) }; };

// Favoriten: was seit sinceIso ("JJJJ-MM-TT") am häufigsten eingetragen wurde. Periode und Schmierblutung
// gehören nicht dazu (die stehen ohnehin ganz oben). skip: Kategorien, die ausgeblendet sind.
// Ergebnis: [{ cat, id, n }] – cat 'custom' für eigene Tags.
export function favorites(days, sinceIso, opt = {}) {
  const { min = 3, max = 8, skip = [] } = opt;
  const no = new Set(['period', 'spot', ...skip]);
  const count = new Map();
  const bump = key => count.set(key, (count.get(key) || 0) + 1);
  for (const [iso, e] of Object.entries(days || {})) {
    if (iso < sinceIso || !e) continue;
    for (const c of CHIP_CATS) {
      if (no.has(c.id)) continue;
      for (const id of (e.tags && e.tags[c.id]) || []) if (c.optIds.has(id)) bump(`${c.id}:${id}`);
    }
    if (!no.has('custom')) for (const t of e.custom || []) bump(`custom:${t}`);
  }
  return [...count]
    .filter(([, n]) => n >= min)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, max)
    .map(([key, n]) => ({ ...splitKey(key), n }));
}

// „Wie gestern“: Auswahl eines anderen Tages in den Entwurf übernehmen. Was im Entwurf schon steht, bleibt –
// übernommen wird nur in Kategorien, die noch leer sind. Periode, Schmierblutung, Schlaf, Gewicht und Notiz
// werden nie kopiert (die gehören zu genau einem Tag). Ergebnis: Anzahl übernommener Einträge.
export function copyTags(draft, from, skip = []) {
  if (!from) return 0;
  const no = new Set(['period', 'spot', ...skip]);
  let added = 0;
  for (const c of CHIP_CATS) {
    if (no.has(c.id)) continue;
    const src = ((from.tags && from.tags[c.id]) || []).filter(id => c.optIds.has(id));
    if (!src.length || (draft.tags[c.id] || []).length) continue;
    draft.tags[c.id] = [...src];
    added += src.length;
  }
  if (!no.has('custom')) {
    for (const t of from.custom || []) if (!draft.custom.includes(t)) { draft.custom.push(t); added++; }
  }
  return added;
}
// Was würde copyTags übernehmen? (Vorschau am Knopf) -> [{ cat, id }]
export function copyPreview(draft, from, skip = []) {
  const trial = { tags: JSON.parse(JSON.stringify(draft.tags || {})), custom: [...(draft.custom || [])] };
  const keys = t => [...Object.entries(t.tags).flatMap(([c, ids]) => ids.map(id => `${c}:${id}`)), ...t.custom.map(x => `custom:${x}`)];
  const before = new Set(keys(trial));
  copyTags(trial, from, skip);
  return keys(trial).filter(k => !before.has(k)).map(splitKey);
}

// Einträge durchsuchen: Notizen, eigene Tags und die Namen der gewählten Optionen. Neueste zuerst.
// Groß/klein und Umlaute sind egal: „arzt“ findet auch „Ärztin“ (gleich lange Ersetzung, damit der Ausschnitt stimmt).
const fold = s => String(s).toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u');
// Ergebnis: [{ iso, note: { pre, hit, post } | null, tags: [{ cat, id }] }]
export function searchEntries(days, q, max = 40) {
  const needle = fold(String(q || '').trim());
  if (needle.length < 2) return [];
  const out = [];
  for (const iso of Object.keys(days || {}).sort().reverse()) {
    const e = days[iso];
    if (!e) continue;
    const tags = [];
    for (const c of CHIP_CATS) {
      for (const id of (e.tags && e.tags[c.id]) || []) {
        const o = OPT[c.id][id];
        if (o && (fold(o.label).includes(needle) || fold(c.name).includes(needle))) tags.push({ cat: c.id, id });
      }
    }
    for (const t of e.custom || []) if (fold(t).includes(needle)) tags.push({ cat: 'custom', id: t });
    let note = null;
    const text = typeof e.note === 'string' ? e.note.replace(/\s+/g, ' ') : '';
    const i = fold(text).indexOf(needle);
    if (i >= 0) {
      const from = Math.max(0, i - 30), end = i + needle.length, to = Math.min(text.length, end + 70);
      note = { pre: (from ? '…' : '') + text.slice(from, i), hit: text.slice(i, end), post: text.slice(end, to) + (to < text.length ? '…' : '') };
    }
    if (!note && !tags.length) continue;
    out.push({ iso, note, tags });
    if (out.length >= max) break;
  }
  return out;
}
