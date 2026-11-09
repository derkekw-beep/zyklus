// Kalender-Seite: liest die Kalenderdatei aus dem Teil nach dem # (der nie an einen Server geht),
// zeigt die Termine an und bietet sie als Datei an – Safari öffnet dann den Kalender-Dialog.
const raw = location.hash.slice(1);
// Termindaten sofort aus Adresse und Verlauf entfernen
if (raw) history.replaceState(null, '', location.pathname);

let ics = '';
try { ics = decodeURIComponent(raw); } catch { ics = ''; }
const valid = ics.startsWith('BEGIN:VCALENDAR') && ics.includes('BEGIN:VEVENT');

const fmtDate = s => `${s.slice(6, 8)}.${s.slice(4, 6)}.${s.slice(0, 4)}`;
const unescape = s => s.replace(/\\n/g, ' ').replace(/\\([,;\\])/g, '$1');

if (!valid) {
  document.getElementById('empty').hidden = false;
} else {
  const unfolded = ics.replace(/\r\n /g, '');
  const items = [];
  for (const block of unfolded.split('BEGIN:VEVENT').slice(1)) {
    const get = k => { const m = block.match(new RegExp(`\\r\\n${k}[^:]*:([^\\r]*)`)); return m ? m[1] : ''; };
    const summary = unescape(get('SUMMARY'));
    const start = get('DTSTART');
    const daily = /RRULE:FREQ=DAILY/.test(block);
    let when = '';
    if (/^\d{8}$/.test(start)) when = fmtDate(start);
    else if (/^\d{8}T\d{6}/.test(start)) when = `${daily ? 'täglich' : fmtDate(start)} um ${start.slice(9, 11)}:${start.slice(11, 13)} Uhr`;
    items.push({ summary, when });
  }
  const list = document.getElementById('list');
  for (const it of items) {
    const li = document.createElement('li');
    li.textContent = it.summary;
    const sm = document.createElement('small');
    sm.textContent = it.when;
    li.appendChild(sm);
    list.appendChild(li);
  }
  document.getElementById('add').href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  document.getElementById('ok').hidden = false;
}
