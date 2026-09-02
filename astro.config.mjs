// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import site from './src/data/site.json' with { type: 'json' };
import slots from './src/data/slots.json' with { type: 'json' };

// lastmod per section: what actually changed, not when the site was last built.
const lastmodFor = (path) => {
  if (path.startsWith('/slots/')) return slots.fetchedAt ?? site.lastVerified;
  if (path === '/') return site.contentUpdated;
  return site.lastVerified;
};
const changefreqFor = (path) => {
  if (path === '/' || path.startsWith('/casino/') || path === '/methods/') return 'weekly';
  if (path.startsWith('/slots/')) return 'monthly';
  return 'monthly';
};
const priorityFor = (path) => {
  if (path === '/') return 1.0;
  if (path.startsWith('/casino/')) return 0.8;
  if (path === '/slots/') return 0.6;
  if (path.startsWith('/slots/')) return 0.4;
  return 0.7;
};

// Post-build sitemap cleanup:
// 1) Strip <xhtml:link> hreflang alternates — Yandex Webmaster flags any non-core
//    element as the «Неизвестный тег» error and ignores it anyway; both Yandex and
//    Google read hreflang from the <link rel="alternate"> tags already present in
//    every page's <head>, so nothing is lost.
// 2) Drop the now-unused namespace declarations.
// 3) Copy sitemap-index.xml to /sitemap.xml so the conventional URL (and any old
//    submission in a webmaster panel) resolves instead of 404ing.
const sitemapCleanup = () => ({
  name: 'sitemap-cleanup',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const { fileURLToPath } = await import('node:url');
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const out = fileURLToPath(dir);
      const file = path.join(out, 'sitemap-0.xml');
      let xml = await fs.readFile(file, 'utf8');
      xml = xml
        .replace(/<xhtml:link\b[^>]*\/>/g, '')
        .replace(/ xmlns:(?:news|xhtml|image|video)="[^"]*"/g, '');
      await fs.writeFile(file, xml);
      // Segment the sitemap so webmaster panels report indexing per section:
      // staged indexing needs per-segment stats (core first, slots in waves).
      const head = xml.slice(0, xml.indexOf('<url>'));
      const urls = xml.match(/<url>.*?<\/url>/gs) ?? [];
      const seg = { 'core-ru': [], 'core-en': [], 'slots-ru': [], 'slots-en': [] };
      for (const u of urls) {
        const en = u.includes('/en/');
        const slot = u.includes('/slots/');
        seg[`${slot ? 'slots' : 'core'}-${en ? 'en' : 'ru'}`].push(u);
      }
      const site = 'https://minimalniy-deposit.github.io';
      const today = new Date().toISOString().slice(0, 10);
      for (const [name, list] of Object.entries(seg)) {
        await fs.writeFile(path.join(out, `sitemap-${name}.xml`), head + list.join('') + '</urlset>');
      }
      const index = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
        Object.keys(seg).map((n) => `<sitemap><loc>${site}/sitemap-${n}.xml</loc><lastmod>${today}</lastmod></sitemap>`).join('') +
        `</sitemapindex>`;
      await fs.writeFile(path.join(out, 'sitemap-index.xml'), index);
      await fs.writeFile(path.join(out, 'sitemap.xml'), index);
      await fs.rm(path.join(out, 'sitemap-0.xml'));
      console.log('[sitemap-cleanup] segments:', Object.entries(seg).map(([k, v]) => `${k}=${v.length}`).join(' '));
    },
  },
});

export default defineConfig({
  site: 'https://minimalniy-deposit.github.io',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    icon({ include: { ph: ['dice-five-duotone', 'coins-duotone', 'lightning-duotone', 'shield-check-duotone', 'qr-code-duotone', 'credit-card-duotone', 'wallet-duotone', 'trophy-duotone', 'chart-line-up-duotone', 'timer-duotone', 'sparkle-duotone', 'bank-duotone'], tabler: ['star', 'clock-bolt', 'shield-check', 'coin', 'bolt', 'qrcode', 'credit-card', 'wallet', 'calculator', 'database', 'history', 'chart-line', 'scale', 'list-check', 'trophy', 'arrow-down-circle', 'building-bank', 'gift', 'percentage', 'dice-5', 'device-mobile', 'external-link', 'check', 'alert-triangle', 'archive'] } }),
    sitemap({
      filter: (page) => !page.includes('/preview/'),
      i18n: { defaultLocale: 'ru', locales: { ru: 'ru', en: 'en' } },
      serialize(item) {
        const u = new URL(item.url);
        const en = u.pathname.startsWith('/en/');
        const path = en ? u.pathname.slice(3) : u.pathname;
        item.lastmod = new Date(lastmodFor(path)).toISOString();
        item.priority = Math.max(0.1, priorityFor(path) - (en ? 0.1 : 0));
        item.changefreq = changefreqFor(path);
        return item;
      },
    }),
    sitemapCleanup(),
  ],
});
