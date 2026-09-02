// Brand icon fetcher. Runs in GitHub Actions (open network), not in restricted sandboxes.
// For each brand: try apple-touch-icon → <link rel=icon> from homepage → aggregator
// fallback (Google s2, DuckDuckGo). Normalizes to 96×96 webp in public/brands/,
// records the exact source of every file in public/brands/manifest.json.
// Usage: npm i --no-save sharp && node scripts/fetch-brand-icons.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const OUT = 'public/brands';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, asText = false) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow', signal: ctl.signal });
    if (!r.ok) return null;
    return asText ? await r.text() : Buffer.from(await r.arrayBuffer());
  } catch { return null; } finally { clearTimeout(t); }
}

async function meta(buf) {
  try { const m = await sharp(buf).metadata(); return m.width && m.height ? m : null; } catch { return null; }
}

function iconsFromHtml(html, base) {
  const out = [];
  const re = /<link\s[^>]*rel=["']?([^"'>\s]*icon[^"'>\s]*)["']?[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const href = /href=["']?([^"'\s>]+)/i.exec(tag)?.[1];
    if (!href) continue;
    const sizes = /sizes=["']?(\d+)x/i.exec(tag)?.[1];
    try { out.push({ url: new URL(href, base).href, size: sizes ? +sizes : 0 }); } catch {}
  }
  return out.sort((a, b) => b.size - a.size);
}

async function bestForDomain(domain) {
  const base = `https://${domain}/`;
  const tries = [`${base}apple-touch-icon.png`, `${base}apple-touch-icon-precomposed.png`];
  const html = await get(base, true);
  if (html) for (const i of iconsFromHtml(html, base).slice(0, 4)) tries.push(i.url);
  tries.push(`${base}favicon.ico`);
  let best = null;
  for (const url of tries) {
    const buf = await get(url);
    if (!buf || buf.length < 120) continue;
    const m = await meta(buf);
    if (!m) continue;
    const px = Math.min(m.width, m.height);
    if (!best || px > best.px) best = { buf, px, url };
    if (best.px >= 120) break;
    await sleep(150);
  }
  return best;
}

async function fetchBrand(b) {
  for (const d of b.domains) {
    const hit = await bestForDomain(d);
    if (hit && hit.px >= 32) return { ...hit, source: 'site' };
  }
  const d0 = b.domains[0];
  for (const [src, url] of [
    ['google-s2', `https://www.google.com/s2/favicons?domain=${d0}&sz=128`],
    ['duckduckgo', `https://icons.duckduckgo.com/ip3/${d0}.ico`],
  ]) {
    const buf = await get(url);
    const m = buf && (await meta(buf));
    if (m && Math.min(m.width, m.height) >= 24) return { buf, px: Math.min(m.width, m.height), url, source: src };
  }
  return null;
}

const { brands } = JSON.parse(await readFile('src/data/brands.json', 'utf8'));
await mkdir(OUT, { recursive: true });
let manifest = {};
try { manifest = JSON.parse(await readFile(`${OUT}/manifest.json`, 'utf8')); } catch {}
const now = new Date().toISOString().slice(0, 10);
let ok = 0, fb = 0, fail = 0;

for (const b of brands) {
  const hit = await fetchBrand(b);
  if (!hit) { fail++; manifest[b.slug] = { ok: false, checked: now }; console.log(`✗ ${b.slug}`); continue; }
  const img = sharp(hit.buf).resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
  await img.webp({ quality: 82 }).toFile(`${OUT}/${b.slug}.webp`);
  manifest[b.slug] = { ok: true, source: hit.source, src: hit.url, px: hit.px, program: b.program, fetched: now };
  hit.source === 'site' ? ok++ : fb++;
  console.log(`${hit.source === 'site' ? '✓' : '~'} ${b.slug} ← ${hit.url} (${hit.px}px)`);
  await sleep(350);
}
await writeFile(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 1));
console.log(`\nсайт: ${ok}, агрегатор: ${fb}, мимо: ${fail}, всего: ${brands.length}`);
