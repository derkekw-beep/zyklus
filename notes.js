// Neuigkeiten (Patchnotes) und Funktionsliste. Neueste Version immer oben.
// Bei jedem Update hier einen Eintrag ergänzen – die App zeigt ihn nach dem Update einmal auf "Heute".

export const NOTES = [
  {
    v: '2.1',
    date: '10.11.2026',
    items: [
      'Schneller tracken: „Wie gestern“ übernimmt deine Einträge vom Vortag, und was du oft einträgst, steht als Favorit ganz oben',
      'Neue Leiste im Tracking: ein Tipp springt direkt zu Gefühle, Schmerzen, Schlaf … – markiert ist, wo schon etwas steht',
      'Statistik → Muster: „Dein Zyklus auf einen Blick“ zeigt, an welchen Zyklustagen was auftritt',
      'Statistik → Jahr: dein Jahresrückblick mit Perioden, Zyklen, Schlaf und den häufigsten Einträgen',
      'Kalender: Einträge durchsuchen – findet Notizen, eigene Tags und Symptome',
      '„Heute“ zeigt die nächsten 7 Tage, dazu ein aufgeräumteres, ruhigeres Aussehen',
      'Unter „Mehr“ → Anzeige schaltest du aus, was du nicht brauchst – zum Beispiel „Was dich erwartet“ oder die Schlaf-Karte',
    ],
  },
  {
    v: '2.0',
    date: '09.11.2026',
    items: [
      'Fünf Farbthemen: Rosé, Lavendel, Salbei, Pfirsich und Ozean – unter „Mehr“ → Persönlich, hell und dunkel',
      'Neue Karte „Was dich erwartet“: was du in früheren Zyklen an genau dieser Stelle oft hattest',
      'Weichere Bewegungen: Das Rad gleitet und rastet sanft ein, Ansichten und Tracking gleiten herein',
      'Ist in iOS „Bewegung reduzieren“ eingeschaltet, bleibt alles ruhig',
    ],
  },
  {
    v: '1.9',
    date: '09.11.2026',
    items: [
      'Rad und Kalender zählen die Zyklustage rund um die erwartete Periode jetzt gleich',
      'Zyklen mit vermutlich vergessener Periode bekommen keine geschätzten Phasen mehr',
      'Kalender-Erinnerungen ersetzen sich beim erneuten Übernehmen, statt doppelt zu erscheinen',
      'Updates kommen zuverlässiger an – und falls die App mal nicht startet, hilft „App neu laden“ (deine Daten bleiben)',
      '„Alle Daten löschen“ entfernt jetzt wirklich alles, auch die Kopie vom Import',
    ],
  },
  {
    v: '1.8',
    date: '09.11.2026',
    items: [
      'Erinnerungen über den iPhone-Kalender: nächste Periode (2 Tage vorher und am Tag), auf Wunsch fruchtbare Tage',
      'Tägliche Erinnerungen für die Pille und fürs Tracken, Uhrzeit frei wählbar',
      'Ohne Server – alles bleibt auf dem iPhone',
    ],
  },
  {
    v: '1.7',
    date: '09.11.2026',
    items: [
      'Genauere Vorhersage: Ø der letzten 8 Zyklen ohne den kürzesten und längsten – einzelne Ausreißer verschieben sie kaum noch',
      'Ehrlichere Spanne „± X Tage“ (+1 Tag Sicherheitszuschlag)',
      'Getestet an 36 echten Zyklen: im Schnitt 2,6 Tage genau, die Spanne trifft in 82 % der Fälle',
    ],
  },
  {
    v: '1.6',
    date: '09.11.2026',
    items: [
      'Kein versehentliches Reinzoomen mehr (zwei Finger oder Doppeltippen)',
      'Unter „Mehr“ → Persönlich lässt sich das Zoomen wieder erlauben',
    ],
  },
  {
    v: '1.5',
    date: '08.11.2026',
    items: [
      'Jahresübersicht im Kalender: auf den Monatsnamen tippen – alle 12 Monate eines Jahres auf einen Blick',
      'Jahr mit ‹ › oder Wischen wechseln, Monat antippen öffnet ihn direkt',
      'Je Jahr eine kurze Zusammenfassung: Perioden, Ø Zykluslänge, Periodentage',
    ],
  },
  {
    v: '1.4',
    date: '08.11.2026',
    items: [
      'Daten aus Clue übernehmen: unter „Mehr“ → Backup die Clue-Datei wählen – deine Einträge hier bleiben erhalten, Clue ergänzt nur',
      'Vorschau vor dem Import und „Import rückgängig“',
      'Neue Kategorie „Pille (Verhütung)“: genommen, vergessen, zu spät, doppelt',
    ],
  },
  {
    v: '1.3',
    date: '08.11.2026',
    items: [
      'Zyklus-Rad auf „Heute“: Ring drehen und jeden Tag ansehen – Zyklustag, Phase, Vorhersage und deine Einträge',
      'Vergangene Zyklen und die nächsten vorhergesagten Zyklen lassen sich durchdrehen, Pfeile für einzelne Tage',
      'Updates kommen jetzt beim nächsten Öffnen an, ohne zweimal starten zu müssen',
      '„Nach Updates suchen“ unter „Mehr“',
    ],
  },
  {
    v: '1.2',
    date: '07.11.2026',
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
    date: '07.11.2026',
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
    date: '07.11.2026',
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
  ['🔮', 'Vorhersage', 'Nächste Periode aus dem Schnitt deiner letzten 8 Zyklen (ohne den kürzesten und längsten), mit typischer Spanne. Zwischenblutungen und vergessene Perioden werden erkannt und nicht mitgezählt.'],
  ['🌱', 'Fruchtbare Tage', 'Eisprung ≈ 14 Tage vor der nächsten Periode, fruchtbar 5 Tage davor bis 1 Tag danach. Nur eine Kalender-Schätzung, kein Verhütungsmittel.'],
  ['📝', 'Tracking', 'Periode, Schmierblutung, Gefühle, Schmerzen, PMS, Schlaf, Schlaftabletten, Sexleben, Energie, Geist, Verdauung, Ausfluss, Haut, Haare, Gewicht, Notiz und eigene Tags. Mit Suche, Wochenleiste und Sprungleiste zu jeder Kategorie.'],
  ['⚡', 'Schnell eintragen', '„Wie gestern“ übernimmt die Einträge vom Vortag in alle noch leeren Kategorien (nie Periode, Schlaf, Gewicht oder Notiz). Darunter stehen deine Favoriten der letzten 90 Tage.'],
  ['😴', 'Schlaf', 'Schlafen gehen / Aufgewacht per Tipp, Schlafziel, Schlafdefizit der Woche, Schlafrhythmus und Schlaf je Zyklusphase.'],
  ['💊', 'Schlaftabletten', 'Wie oft, wann eingenommen, Schlaf mit und ohne Tablette und je Zyklusphase.'],
  ['🎡', 'Zyklus-Rad', 'Auf „Heute“ den Ring drehen: Zyklustag, Phase und Einträge für jeden Tag, auch vergangene und kommende Zyklen.'],
  ['🌤️', 'Was dich erwartet', 'Auf „Heute“: was du in früheren Zyklen an genau dieser Stelle oft hattest, z. B. Krämpfe zu Beginn der Periode. Nur was dort deutlich häufiger vorkommt als sonst, ab 3 Zyklen mit Einträgen.'],
  ['🎨', 'Farbthemen', 'Rosé, Lavendel, Salbei, Pfirsich oder Ozean – jeweils hell und dunkel, passend zur iPhone-Einstellung.'],
  ['📅', 'Kalender', 'Periode, Vorhersage, fruchtbare Tage, Eisprung und alle Einträge auf einen Blick. Vergangene Perioden schnell nachtragen. Unten: Einträge durchsuchen (Notizen, eigene Tags, Symptome).'],
  ['📊', 'Statistik', 'Zyklusverlauf, Durchschnittswerte und Muster – zum Beispiel an welchem Zyklustag Krämpfe meistens auftreten. „Dein Zyklus auf einen Blick“ zeigt das als Farbstreifen über alle Zyklustage.'],
  ['✨', 'Jahresrückblick', 'Unter Statistik → Jahr: getrackte Tage, Perioden, Zykluslängen, Schlaf und was du am häufigsten eingetragen hast.'],
  ['🔔', 'Erinnerungen', 'Termine mit Erinnerung im iPhone-Kalender: nächste Periode, fruchtbare Tage, Pille und Tracken.'],
  ['💾', 'Backup & Import', 'Alle Daten als Datei sichern (z. B. in iCloud Drive) und wiederherstellen. Daten aus Clue übernehmen.'],
  ['🔒', 'Privat', 'Kein Konto, keine Cloud, keine Werbung. Alles bleibt auf diesem iPhone.'],
];
