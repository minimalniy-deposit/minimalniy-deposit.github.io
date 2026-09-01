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
  ],
});
