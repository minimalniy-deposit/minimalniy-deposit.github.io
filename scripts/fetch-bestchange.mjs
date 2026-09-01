// BestChange: best RUB→USDT (TRC20) rate among exchangers that accept small sums.
// Writes rates.json.bestchange + appends to rates-history.jsonl (same line, merged by fetch-rates order).
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const KEY = process.env.BESTCHANGE_API_KEY;
const out = new URL('../src/data/rates.json', import.meta.url);
const MAX_MIN_SUM = Number(process.env.BC_MAX_MIN_SUM || 3000);   // roubles — small-deposit reality
const urls = [KEY ? `https://api.bestchange.ru/info.zip?${KEY}` : null, 'https://api.bestchange.ru/info.zip', 'http://api.bestchange.ru/info.zip'].filter(Boolean);

let zip = null, used = null;
for (const u of urls) {
  try { const r = await fetch(u, { headers: { 'User-Agent': 'minimalniy-deposit-rates/1.0' } }); if (r.ok) { zip = Buffer.from(await r.arrayBuffer()); used = u; break; } else console.log('bestchange', u.replace(KEY ?? '###', '***'), r.status); }
  catch (e) { console.log('bestchange fetch error', e.message); }
}
if (!zip) { console.log('BestChange unavailable — leaving previous value'); process.exit(0); }

const dir = mkdtempSync(join(tmpdir(), 'bc-'));
writeFileSync(join(dir, 'info.zip'), zip);
execSync(`cd ${dir} && unzip -o -q info.zip`);
const dec = new TextDecoder('windows-1251');
const read = (f) => dec.decode(readFileSync(join(dir, f))).split('\n').filter(Boolean).map((l) => l.trim().split(';'));

const cy = Object.fromEntries(read('bm_cy.dat').map((r) => [r[0], r[2] ?? r[1]]));      // id;pos;name
const ex = Object.fromEntries(read('bm_exch.dat').map((r) => [r[0], r[1]]));            // id;name;...
const rates = read('bm_rates.dat');   // observed format: from;to;exch;give;get;reserve;?;?;minsum;maxsum                                                       // from;to;exch;give;get;reserve;reviews;minsum;maxsum;city
const findIds = (re) => Object.entries(cy).filter(([, n]) => re.test(n)).map(([id]) => id);
const fromIds = findIds(/(Сбербанк|Т-Банк|Тинькофф|СБП|Альфа|ВТБ).*RUB|RUB.*(Сбербанк|Т-Банк|Тинькофф|СБП)/i);
const toIds = findIds(/Tether\s*TRC.?20|USDT\s*TRC/i);
console.log('from ids', fromIds.map((i) => cy[i]), '| to ids', toIds.map((i) => cy[i]));

const rows = rates.filter((r) => fromIds.includes(r[0]) && toIds.includes(r[1]))
  .map((r) => ({ from: cy[r[0]], exchanger: ex[r[2]] ?? r[2], give: +r[3], get: +r[4], reviews: 0, minSum: +r[8] || 0, maxSum: +r[9] || 0 }))
  .filter((r) => r.give > 0 && r.get > 0)
  .map((r) => ({ ...r, rubPerUsdt: +(r.give / r.get).toFixed(2) }));
const small = rows.filter((r) => r.minSum <= MAX_MIN_SUM).sort((a, b) => a.rubPerUsdt - b.rubPerUsdt);
const all = [...rows].sort((a, b) => a.rubPerUsdt - b.rubPerUsdt);
if (!small.length && !all.length) { console.log('no RUB→USDT rows found'); process.exit(0); }
const best = small[0] ?? all[0];
const median = (arr) => arr.length ? arr[Math.floor(arr.length / 2)].rubPerUsdt : null;

const j = JSON.parse(readFileSync(out, 'utf8'));
j.bestchange = {
  rubPerUsdt: best.rubPerUsdt, exchanger: best.exchanger, from: best.from, minSum: best.minSum,
  medianSmall: median(small.slice(0, 10)), bestAny: all[0]?.rubPerUsdt ?? null, offersSmall: small.length, offersAll: all.length,
  maxMinSum: MAX_MIN_SUM, checkedAt: new Date().toISOString().slice(0, 16) + 'Z', url: 'https://www.bestchange.ru/',
};
if (!j.sources.includes('BestChange')) j.sources.push('BestChange');
writeFileSync(out, JSON.stringify(j, null, 2) + '\n');
console.log('bestchange ->', j.bestchange);
