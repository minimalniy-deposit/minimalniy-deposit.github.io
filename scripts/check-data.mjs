// Lists casinos with missing card fields. Run: node scripts/check-data.mjs
import { readFileSync } from 'node:fs';
const c = JSON.parse(readFileSync(new URL('../src/data/casinos.json', import.meta.url), 'utf8'));
const req = ['minDeposit', 'rating', 'stars', 'ratingCnt', 'bonus', 'bonusEn', 'payments', 'paymentsLabel', 'paymentsLabelEn', 'withdrawMin'];
let bad = 0;
for (const x of c) {
  const missing = req.filter((k) => x[k] == null || (Array.isArray(x[k]) && x[k].length === 0));
  if (missing.length) { bad++; console.log(`#${x.rank} ${x.name}: missing ${missing.join(', ')}`); }
}
console.log(bad ? `${bad} casino(s) incomplete` : 'all casinos complete');
