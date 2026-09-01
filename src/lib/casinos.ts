import data from '../data/casinos.json';

export interface Casino {
  slug: string; name: string; rank: number; top: boolean; gold: boolean;
  minDeposit: number | null; rating: number | null; stars: string | null; ratingCnt: string | null;
  badges: { cls: string; text: string }[]; pills: { cls: string; text: string }[];
  bonus: string | null; url: string; ctaLines: string[]; promo: string | null;
  payments: string[]; paymentsLabel: string | null; paymentsLabelEn: string | null;
  withdrawMin: number | null; license: string; reviews: number | null;
  bonusEn: string | null; badgesEn: string[]; ctaLinesEn: string[]; promoCode: string | null;
  rtp: number | null; licenseFull: string | null; licenseShort: string | null; wager: number | null; cashback: number | null; features: string[]; d8cats: string[]; cashierUsdtRate: number | null; urlBackup?: string | null;
  /** Checked by hand on Mondays; null = not verified yet (pages say so instead of assuming). */
  minBetStarburst: number | null;   // ₽, minimum bet in Starburst at this cashier
  minBetGates: number | null;       // ₽, minimum bet in Gates of Olympus
  bonusMinDeposit: number | null;   // ₽, minimum deposit that activates the welcome bonus
  maxBetWagering: number | null;    // ₽, max bet allowed while wagering
  wagerDays: number | null;         // days to complete wagering
  withdrawMinAmount: number | null; // ₽, minimum withdrawal
}
export const casinos: Casino[] = ([...data] as Casino[]).sort((a, b) => a.rank - b.rank);
export const bySlug = (slug: string) => casinos.find((c) => c.slug === slug);
export const paymentKeys = ['card', 'sbp', 'usdt', 'btc', 'crypto'] as const;
export type PaymentKey = (typeof paymentKeys)[number];

/** Fields still to be filled in casinos.json (rendered nowhere; used by scripts/check-data.mjs). */
export const REQUIRED: (keyof Casino)[] = ['minDeposit', 'rating', 'stars', 'ratingCnt', 'bonus', 'bonusEn', 'payments', 'paymentsLabel', 'paymentsLabelEn', 'withdrawMin'];

export function acceptsMethod(c: Casino, m: PaymentKey): boolean {
  if (m === 'crypto') return c.payments.some((p) => ['crypto', 'usdt', 'btc'].includes(p));
  return c.payments.includes(m);
}

/** Sentences from the verbatim home text that mention a casino by name. */
export function mentionsOf(name: string, blocks: Record<string, string>): { text: string; block: string }[] {
  const short = name.replace(/ Casino$/, '');
  const re = new RegExp(`(?<![\\wа-яё])${short.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\wа-яё])`, 'i');
  const out: { text: string; block: string }[] = [];
  for (const [block, html] of Object.entries(blocks)) {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    for (const s of text.split(/(?<=[.!?])\s+(?=[А-ЯЁA-Z«"(])/)) {
      if (re.test(s) && s.length < 700) out.push({ text: s.trim(), block });
    }
  }
  return out;
}
