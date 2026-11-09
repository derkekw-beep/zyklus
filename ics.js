// Kalenderdatei (iCalendar, .ics) für Erinnerungen im iPhone-Kalender – ohne Server, ohne DOM.
// Ganztägige Termine (Periode, fruchtbare Tage) und tägliche Termine zu einer Uhrzeit (Pille, Tracken).

const pad = n => String(n).padStart(2, '0');
// Tageszahl (Tage seit 1970, UTC) -> JJJJMMTT
export function icsDate(n) {
  const d = new Date(n * 86400000);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}
// Tageszahl + Minuten seit Mitternacht -> JJJJMMTTThhmmss (ohne Zeitzone = Ortszeit des iPhones)
export function icsDateTime(n, min) {
  return `${icsDate(n)}T${pad(Math.floor(min / 60))}${pad(min % 60)}00`;
}
// Text für iCalendar maskieren
export const icsText = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// Zeilen über 75 Bytes umbrechen (Pflicht im Format) – nie mitten in einem Zeichen oder Emoji
const enc = new TextEncoder();
function fold(line) {
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let cur = '', bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (parts.length ? 74 : 75)) { parts.push(cur); cur = ''; bytes = 0; }
    cur += ch;
    bytes += b;
  }
  parts.push(cur);
  return parts.map((p, i) => (i ? ' ' : '') + p).join('\r\n');
}

// events: [{ uid, summary, description?, day, endDay? (ganztägig, exklusiv), time? (Minuten), daily?, alarms: [TRIGGER] }]
export function buildIcs(events, stamp = new Date()) {
  const dtstamp = `${stamp.getUTCFullYear()}${pad(stamp.getUTCMonth() + 1)}${pad(stamp.getUTCDate())}T${pad(stamp.getUTCHours())}${pad(stamp.getUTCMinutes())}${pad(stamp.getUTCSeconds())}Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Zyklus//Erinnerungen//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Zyklus'];
  for (const ev of events) {
    lines.push('BEGIN:VEVENT', `UID:${ev.uid}`, `DTSTAMP:${dtstamp}`, `SUMMARY:${icsText(ev.summary)}`);
    if (ev.description) lines.push(`DESCRIPTION:${icsText(ev.description)}`);
    if (ev.time === undefined || ev.time === null) {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(ev.day)}`, `DTEND;VALUE=DATE:${icsDate(ev.endDay || ev.day + 1)}`, 'TRANSP:TRANSPARENT');
    } else {
      lines.push(`DTSTART:${icsDateTime(ev.day, ev.time)}`, `DTEND:${icsDateTime(ev.day, Math.min(1439, ev.time + 5))}`, 'TRANSP:TRANSPARENT');
    }
    if (ev.daily) lines.push('RRULE:FREQ=DAILY');
    for (const trig of ev.alarms || []) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(ev.summary)}`, `TRIGGER:${trig}`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

// Auslöser relativ zum Beginn eines ganztägigen Termins (Mitternacht): "x Tage vorher um hh:mm"
export function triggerDaysBefore(days, min) {
  const total = days * 1440 - min; // Minuten vor Mitternacht des Termintags
  if (total <= 0) return `PT${-total}M`;
  return `-P${Math.floor(total / 1440) ? `${Math.floor(total / 1440)}D` : ''}T${Math.floor((total % 1440) / 60)}H${total % 60}M`.replace('T0H0M', 'T0M');
}

// Welche Termine gehören in die Datei? a = analyze()-Ergebnis, r = Einstellungen, today = Tageszahl.
export function reminderEvents(a, r, today) {
  const events = [];
  const notes = [];
  if (r.period) {
    if (a.hasData && a.nextStart > today) {
      events.push({
        uid: `periode-${icsDate(a.nextStart)}@zyklus`,
        summary: '🩸 Periode erwartet',
        description: 'Vorhersage der Zyklus-App. Ist die Periode da, in der App eintragen.',
        day: a.nextStart,
        alarms: [triggerDaysBefore(2, 9 * 60), triggerDaysBefore(0, 8 * 60)],
      });
    } else notes.push(a.hasData ? 'Die Periode ist schon fällig – nach dem Eintragen gibt es eine neue Erinnerung.' : 'Für die Perioden-Erinnerung zuerst eine Periode eintragen.');
  }
  if (r.fertile && a.hasData && a.nextWindow && a.nextWindow.end >= today) {
    const w = a.nextWindow;
    events.push({
      uid: `fruchtbar-${icsDate(w.start)}@zyklus`,
      summary: '🌱 Fruchtbare Tage (geschätzt)',
      description: 'Kalender-Schätzung der Zyklus-App – kein Verhütungsmittel.',
      day: Math.max(w.start, today),
      endDay: w.end + 1,
      alarms: w.start > today ? [triggerDaysBefore(0, 9 * 60)] : [],
    });
  }
  if (r.pill) {
    events.push({ uid: 'pille-taeglich@zyklus', summary: '💊 Pille nehmen', day: today, time: r.pillTime, daily: true, alarms: ['PT0M'] });
  }
  if (r.track) {
    events.push({ uid: 'tracken-taeglich@zyklus', summary: '📝 Zyklus: Tag tracken', day: today, time: r.trackTime, daily: true, alarms: ['PT0M'] });
  }
  return { events, notes };
}
