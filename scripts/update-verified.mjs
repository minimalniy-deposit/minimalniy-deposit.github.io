// Weekly cron (Mondays): bump site.lastVerified and append to the conditions ledger
// any values in casinos.json that differ from each casino's last recorded entry.
import { readFileSync, writeFileSync } from 'node:fs';
const siteP = new URL('../src/data/site.json', import.meta.url);
const histP = new URL('../src/data/history.json', import.meta.url);
const site = JSON.parse(readFileSync(siteP, 'utf8'));
const hist = JSON.parse(readFileSync(histP, 'utf8'));
const casinos = JSON.parse(readFileSync(new URL('../src/data/casinos.json', import.meta.url), 'utf8'));
const today = new Date().toISOString().slice(0, 10);

let added = 0;
for (const c of casinos) {
  // last known value per tracked metric for this casino
  const last = {};
  for (const e of hist.entries) if (e.casino === c.slug) Object.assign(last, e.metrics);
  const changed = {};
  for (const k of hist.tracked) {
    const v = c[k] ?? null;
    if (v != null && v !== (last[k] ?? null)) changed[k] = v;
  }
  if (Object.keys(changed).length) {
    hist.entries.push({ date: today, source: 'еженедельная сверка', casino: c.slug, metrics: changed });
    added++;
    console.log('changed:', c.slug, changed, 'was:', Object.fromEntries(Object.keys(changed).map((k) => [k, last[k] ?? null])));
  }
}
hist.lastChecked = today;
writeFileSync(histP, JSON.stringify(hist, null, 1) + '\n');
console.log(added ? `${added} change record(s) appended` : 'no condition changes this week');

if (site.lastVerified !== today) { site.lastVerified = today; writeFileSync(siteP, JSON.stringify(site, null, 2) + '\n'); console.log('lastVerified ->', today); }
