// Daily sync: SlotsReach partner API → src/data/slots.json + local thumbnails in public/slots/img/.
// Needs repo secret SLOTSREACH_API_KEY. Endpoint: GET https://slotsreach.com/api/partner/games?page=N&per_page=100
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import sharp from 'sharp';

const KEY = process.env.SLOTSREACH_API_KEY;
const BASE = 'https://slotsreach.com/api/partner/games';
const out = new URL('../src/data/slots.json', import.meta.url);
const imgDir = new URL('../public/slots/img/', import.meta.url);
if (!KEY) { console.log('SLOTSREACH_API_KEY not set — keeping existing slots.json'); process.exit(0); }

const H = { Authorization: `Bearer ${KEY}`, Accept: 'application/json', 'User-Agent': 'minimalniy-deposit-sync/1.0' };
const all = [];
let page = 1, last = 1;
do {
  const res = await fetch(`${BASE}?page=${page}&per_page=100`, { headers: H });
  if (!res.ok) { console.error('API error', res.status, page, await res.text()); process.exit(1); }
  const j = await res.json();
  all.push(...(j.data ?? []));
  last = j.meta?.last_page ?? 1;
  page++;
} while (page <= last);
console.log('fetched', all.length, 'games');

const CAP = 300;
const picked = all
  .filter((g) => g.game_type === 'Slots' && g.slug && g.title)
  .sort((a, b) => (b.editorial_rating ?? 0) - (a.editorial_rating ?? 0) || (b.release_date ?? '').localeCompare(a.release_date ?? ''))
  .slice(0, CAP);

// Thumbnails: download once, resize to 480px WebP, serve from our own domain.
mkdirSync(imgDir, { recursive: true });
const keep = new Set();
let downloaded = 0, failed = 0; const errors = {};
async function thumb(g) {
  const file = `${g.slug}.webp`;
  const path = new URL(file, imgDir);
  keep.add(file);
  if (existsSync(path)) return `/slots/img/${file}`;
  if (!g.thumbnail_url) return null;
  try {
    const r = await fetch(g.thumbnail_url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36', Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' } });
    if (!r.ok) throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 80)}`);
    const buf = Buffer.from(await r.arrayBuffer());
    await sharp(buf).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path);
    downloaded++;
    return `/slots/img/${file}`;
  } catch (e) { failed++; const k = String(e.message).slice(0, 60); errors[k] = (errors[k] ?? 0) + 1; return g.thumbnail_url; } // fall back to the remote URL
}
// modest concurrency to stay under the image host's limits
const images = new Map();
for (let i = 0; i < picked.length; i += 6) {
  await Promise.all(picked.slice(i, i + 6).map(async (g) => images.set(g.slug, await thumb(g))));
}
for (const f of readdirSync(imgDir)) if (!keep.has(f)) unlinkSync(new URL(f, imgDir));
console.log('thumbnails: downloaded', downloaded, 'failed', failed, 'kept', keep.size, errors);

const games = picked.map((g) => ({
  slug: g.slug, name: g.title, provider: g.provider, providerSlug: g.provider_slug,
  rtp: g.rtp ?? null, volatility: g.volatility ?? null,
  maxWin: g.max_win != null ? `${Number(g.max_win).toLocaleString('en-US')}x` : null,
  grid: g.grid ?? null, hitFrequency: g.hit_frequency ?? null, releaseDate: g.release_date ?? null,
  rating: g.editorial_rating ?? null, payType: g.pay_type ?? null, isNew: !!g.is_new,
  themes: g.themes ?? [], features: g.features ?? [],
  image: images.get(g.slug) ?? null, screenshot: g.screenshot_url || null,
  sourceUrl: `https://slotsreach.com/games/${g.slug}`,
  demoUrl: g.demo_url ?? g.iframe_url ?? g.embed_url ?? null,
}));

const prev = JSON.parse(readFileSync(out, 'utf8'));
if (JSON.stringify(prev.games) === JSON.stringify(games)) { console.log('no changes'); process.exit(0); }
writeFileSync(out, JSON.stringify({ fetchedAt: new Date().toISOString().slice(0, 10), source: 'slotsreach', total: all.length, thumbs: { downloaded, failed, errors }, games }, null, 2) + '\n');
console.log('slots.json updated:', games.length, 'of', all.length);
