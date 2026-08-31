// Weekly cron (GitHub Actions) bumps site.lastVerified → rebuild → "Данные проверены" and sitemap lastmod update.
import { readFileSync, writeFileSync } from 'node:fs';
const p = new URL('../src/data/site.json', import.meta.url);
const site = JSON.parse(readFileSync(p, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
if (site.lastVerified === today) { console.log('already verified today'); process.exit(0); }
site.lastVerified = today;
writeFileSync(p, JSON.stringify(site, null, 2) + '\n');
console.log('lastVerified ->', today);
