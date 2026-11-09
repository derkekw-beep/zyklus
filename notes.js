// Neuigkeiten (Patchnotes) und Funktionsliste. Neueste Version immer oben.
// Bei jedem Update hier einen Eintrag ergänzen – die App zeigt ihn nach dem Update einmal auf "Heute".

export const NOTES = [
  {
    v: '1.4',
    date: '09.11.2026',
    items: [
      'Daten aus Clue übernehmen: unter „Mehr“ → Backup die Clue-Datei wählen – deine Einträge hier bleiben erhalten, Clue ergänzt nur',
      'Vorschau vor dem Import und „Import rückgängig“',
      'Neue Kategorie „Pille (Verhütung)“: genommen, vergessen, zu spät, doppelt',
    ],
  },
  {
    v: '1.3',
    date: '09.11.2026',
    items: [
      'Zyklus-Rad auf „Heute“: Ring drehen und jeden Tag ansehen – Zyklustag, Phase, Vorhersage und deine Einträge',
      'Vergangene Zyklen und die nächsten vorhergesagten Zyklen lassen sich durchdrehen, Pfeile für einzelne Tage',
      'Updates kommen jetzt beim nächsten Öffnen an, ohne zweimal starten zu müssen',
      '„Nach Updates suchen“ unter „Mehr“',
    ],
  },
  {
    v: '1.2',
    date: '09.11.2026',
    items: [
      'Begrüßung passend zur Tageszeit: Guten Morgen, Guten Tag, Guten Abend, Gute Nacht',
      'Schlaf-Tracking: abends „Schlafen gehen“ antippen, morgens „Aufgewacht“ – die Dauer rechnet die App',
      'Beim Tracken: Schlafenszeit und Aufwachzeit statt nur der Dauer, auch über Mitternacht',
      'Schlaftabletten tracken: genommen ja/nein, Uhrzeit und Mittel – das zuletzt genutzte Mittel wird vorgeschlagen',
      'Schlaf-Statistik: Durchschnitt, Schlafziel und Schlafdefizit der Woche, Schlafrhythmus, Verlauf der letzten 14 Nächte',
      'Schlaf und Schlaftabletten je Zyklusphase (Periode, Follikelphase, fruchtbare Tage, Lutealphase)',
      'Funktionsliste und Neuigkeiten unter „Mehr“',
    ],
  },
  {
    v: '1.1',
    date: '09.11.2026',
    items: [
      'Zwischenblutung wird erkannt und verschiebt die Vorhersage nicht mehr',
      'Bis zu zwei vergessene Tage trennen eine Periode nicht',
      'Vergessene Perioden werden schon ab zwei Zyklen erkannt und nicht mitgezählt',
      '„Meist um Zyklustag …“ stimmt jetzt auch für Beschwerden rund um die Periode',
      'Widersprüchliche Einträge sind nicht mehr möglich (z. B. Periode und Schmierblutung am selben Tag)',
      'Beim Schließen mit offenen Änderungen: Speichern, Verwerfen oder Weiter bearbeiten',
      'Offene Änderungen werden gesichert, wenn die App in den Hintergrund geht',
      'Updates werden automatisch übernommen',
    ],
  },
  {
    v: '1.0',
    date: '09.11.2026',
    items: [
      'Erste Version: Zyklus-Ring, Vorhersage der nächsten Periode und der fruchtbaren Tage',
      'Tracking mit Wochenleiste, Suche und vielen Kategorien',
      'Kalender, Statistik mit Mustern, Backup speichern und laden',
      'Läuft offline, alle Daten bleiben auf dem iPhone',
    ],
  },
];

export const APP_VERSION = NOTES[0].v;

export const FEATURES = [
  ['🔮', 'Vorhersage', 'Nächste Periode aus dem Schnitt deiner letzten 6 Zyklen, mit typischer Schwankung. Zwischenblutungen und vergessene Perioden werden erkannt und nicht mitgezählt.'],
  ['🌱', 'Fruchtbare Tage', 'Eisprung ≈ 14 Tage vor der nächsten Periode, fruchtbar 5 Tage davor bis 1 Tag danach. Nur eine Kalender-Schätzung, kein Verhütungsmittel.'],
  ['📝', 'Tracking', 'Periode, Schmierblutung, Gefühle, Schmerzen, PMS, Schlaf, Schlaftabletten, Sexleben, Energie, Geist, Verdauung, Ausfluss, Haut, Haare, Gewicht, Notiz und eigene Tags. Mit Suche und Wochenleiste.'],
  ['😴', 'Schlaf', 'Schlafen gehen / Aufgewacht per Tipp, Schlafziel, Schlafdefizit der Woche, Schlafrhythmus und Schlaf je Zyklusphase.'],
  ['💊', 'Schlaftabletten', 'Wie oft, wann eingenommen, Schlaf mit und ohne Tablette und je Zyklusphase.'],
  ['🎡', 'Zyklus-Rad', 'Auf „Heute“ den Ring drehen: Zyklustag, Phase und Einträge für jeden Tag, auch vergangene und kommende Zyklen.'],
  ['📅', 'Kalender', 'Periode, Vorhersage, fruchtbare Tage, Eisprung und alle Einträge auf einen Blick. Vergangene Perioden schnell nachtragen.'],
  ['📊', 'Statistik', 'Zyklusverlauf, Durchschnittswerte und Muster – zum Beispiel an welchem Zyklustag Krämpfe meistens auftreten.'],
  ['💾', 'Backup & Import', 'Alle Daten als Datei sichern (z. B. in iCloud Drive) und wiederherstellen. Daten aus Clue übernehmen.'],
  ['🔒', 'Privat', 'Kein Konto, keine Cloud, keine Werbung. Alles bleibt auf diesem iPhone.'],
];
