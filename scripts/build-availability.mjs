// Récupère les calendriers iCal (Airbnb, Gens de Confiance, Booking…) et
// génère availability.json avec la liste des nuits déjà réservées.
// Les URLs iCal sont fournies via la variable d'environnement ICAL_URLS
// (séparées par des virgules) — configurée en secret GitHub.
import ical from 'node-ical';
import { writeFileSync } from 'node:fs';

const urls = (process.env.ICAL_URLS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!urls.length) {
  console.error('Aucune URL iCal fournie (secret ICAL_URLS vide).');
  process.exit(1);
}

const iso = (d) => new Date(d).toISOString().slice(0, 10);
const addDay = (s) => {
  const d = new Date(s + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

const booked = new Set();

for (const url of urls) {
  try {
    const data = await ical.async.fromURL(url);
    let n = 0;
    for (const key in data) {
      const ev = data[key];
      if (!ev || ev.type !== 'VEVENT' || !ev.start || !ev.end) continue;
      let cur = iso(ev.start);
      const end = iso(ev.end); // DTEND est exclusif (jour de départ = libre)
      let guard = 0;
      while (cur < end && guard++ < 1000) {
        booked.add(cur);
        cur = addDay(cur);
      }
      n++;
    }
    console.log(`OK  ${url}  → ${n} évènements`);
  } catch (e) {
    console.error(`ÉCHEC  ${url}  → ${e.message}`);
  }
}

const out = {
  updated: new Date().toISOString(),
  bookedDates: [...booked].sort(),
};
writeFileSync('availability.json', JSON.stringify(out, null, 2) + '\n');
console.log(`availability.json écrit : ${out.bookedDates.length} nuits réservées.`);
