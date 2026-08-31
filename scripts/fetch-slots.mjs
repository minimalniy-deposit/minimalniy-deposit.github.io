// Daily cron: pull the demo-slot catalog from SlotsReach and write src/data/slots.json.
// Needs repo secrets: SLOTSREACH_API_KEY, SLOTSREACH_API_URL (endpoint from the plugin's settings / support).
// The response mapping below is a best guess and must be adjusted once the real payload is known.
import { readFileSync, writeFileSync } from 'node:fs';

const KEY = process.env.SLOTSREACH_API_KEY;
const URL = process.env.SLOTSREACH_API_URL;
const out = new URL('../src/data/slots.json', import.meta.url);
if (!KEY || !URL) { console.log('SLOTSREACH_API_KEY / SLOTSREACH_API_URL not set — keeping existing slots.json'); process.exit(0); }

const res = await fetch(URL, { headers: { Authorization: `Bearer ${KEY}`, Accept: 'application/json' } });
if (!res.ok) { console.error('API error', res.status, await res.text()); process.exit(1); }
const raw = await res.json();
const list = Array.isArray(raw) ? raw : raw.games ?? raw.data ?? raw.items ?? [];

const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const games = list.map((g) => ({
  slug: g.slug ?? slug(g.name ?? g.title),
  name: g.name ?? g.title,
  provider: g.provider?.name ?? g.provider ?? g.vendor ?? '',
  rtp: g.rtp != null ? Number(g.rtp) : null,
  volatility: g.volatility ?? null,
  maxWin: g.max_win ?? g.maxWin ?? null,
  themes: g.themes ?? [], features: g.features ?? [],
  demoUrl: g.demo_url ?? g.demoUrl ?? g.iframe ?? null,
  image: g.image ?? g.thumbnail ?? g.screenshot ?? null,
})).filter((g) => g.name);

const prev = JSON.parse(readFileSync(out, 'utf8'));
if (JSON.stringify(prev.games) === JSON.stringify(games)) { console.log('no changes'); process.exit(0); }
writeFileSync(out, JSON.stringify({ fetchedAt: new Date().toISOString().slice(0, 10), source: 'slotsreach', games }, null, 2) + '\n');
console.log('slots.json updated:', games.length, 'games');
