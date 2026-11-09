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
  { id: 'sleep', name: 'Schlaf', type: 'sleep' },
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
