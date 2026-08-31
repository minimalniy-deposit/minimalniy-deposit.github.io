// Daily sync: SlotsReach partner API → src/data/slots.json (curated subset, see SELECT below).
// Needs repo secret SLOTSREACH_API_KEY. Endpoint: GET https://slotsreach.com/api/partner/games?page=N&per_page=100
import { readFileSync, writeFileSync } from 'node:fs';

const KEY = process.env.SLOTSREACH_API_KEY;
const BASE = 'https://slotsreach.com/api/partner/games';
const out = new URL('../src/data/slots.json', import.meta.url);
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

// SELECT: slots only, sorted by editorial rating then release date, capped — enough for a catalogue, not a 6 000-page dump.
const CAP = 300;
const picked = all
  .filter((g) => g.game_type === 'Slots' && g.slug && g.title)
  .sort((a, b) => (b.editorial_rating ?? 0) - (a.editorial_rating ?? 0) || (b.release_date ?? '').localeCompare(a.release_date ?? ''))
  .slice(0, CAP);

const games = picked.map((g) => ({
  slug: g.slug, name: g.title, provider: g.provider, providerSlug: g.provider_slug,
  rtp: g.rtp ?? null, volatility: g.volatility ?? null,
  maxWin: g.max_win != null ? `${Number(g.max_win).toLocaleString('en-US')}x` : null,
  grid: g.grid ?? null, hitFrequency: g.hit_frequency ?? null, releaseDate: g.release_date ?? null,
  rating: g.editorial_rating ?? null, payType: g.pay_type ?? null, isNew: !!g.is_new,
  themes: g.themes ?? [], features: g.features ?? [],
  image: g.thumbnail_url || null, screenshot: g.screenshot_url || null,
  sourceUrl: `https://slotsreach.com/games/${g.slug}`,
  demoUrl: g.demo_url ?? g.iframe_url ?? g.embed_url ?? null,   // not in the list payload yet
}));

const prev = JSON.parse(readFileSync(out, 'utf8'));
if (JSON.stringify(prev.games) === JSON.stringify(games)) { console.log('no changes'); process.exit(0); }
writeFileSync(out, JSON.stringify({ fetchedAt: new Date().toISOString().slice(0, 10), source: 'slotsreach', total: all.length, games }, null, 2) + '\n');
console.log('slots.json updated:', games.length, 'of', all.length);
