// Weekly: ask the Wayback Machine to archive each casino's terms page and record the snapshot URL in the ledger.
// Rate limit: ≤15 saves/min per IP → we send one every 6 s. No key needed.
import { readFileSync, writeFileSync } from 'node:fs';
const cP = new URL('../src/data/casinos.json', import.meta.url), hP = new URL('../src/data/history.json', import.meta.url);
const casinos = JSON.parse(readFileSync(cP, 'utf8')), hist = JSON.parse(readFileSync(hP, 'utf8'));
hist.snapshots ??= [];
const today = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
for (const c of casinos) {
  if (!c.termsUrl) continue;
  if (hist.snapshots.some((s) => s.casino === c.slug && s.date === today)) continue;
  try {
    const r = await fetch(`https://web.archive.org/save/${c.termsUrl}`, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'minimalniy-deposit-ledger/1.0 (weekly terms snapshot)' } });
    const loc = r.headers.get('content-location') || r.headers.get('x-archive-orig-location') || r.url;
    const m = String(loc).match(/\/web\/(\d{14})\//);
    let snap = m ? `https://web.archive.org/web/${m[1]}/${c.termsUrl}` : null;
    if (!snap) { // fall back to availability API (nearest snapshot)
      const a = await (await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(c.termsUrl)}`)).json();
      snap = a?.archived_snapshots?.closest?.url ?? null;
    }
    if (snap) { hist.snapshots.push({ date: today, casino: c.slug, url: c.termsUrl, snapshot: snap }); n++; console.log('snapshot', c.slug, snap); }
    else console.log('no snapshot for', c.slug, r.status);
  } catch (e) { console.log('wayback error', c.slug, e.message); }
  await sleep(6000);
}
writeFileSync(hP, JSON.stringify(hist, null, 1) + '\n');
console.log(n ? `${n} snapshot(s) recorded` : 'no new snapshots');
