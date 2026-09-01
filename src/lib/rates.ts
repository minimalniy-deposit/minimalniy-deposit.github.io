import r from '../data/rates.json';
export interface BestChange { rubPerUsdt: number; exchanger: string; from: string; minSum: number; medianSmall: number | null; bestAny: number | null; offersSmall: number; offersAll: number; maxMinSum: number; checkedAt: string; url: string }
export const rates = r as { date: string | null; cbrDate: string | null; usd: number | null; eur: number | null; usdt: number | null; btc: number | null; sources: string[]; bestchange?: BestChange | null };
export const bc = rates.bestchange ?? null;
/** Reference rate for a rouble player: BestChange best small-sum offer, else market. */
export const refRate = bc?.rubPerUsdt ?? rates.usdt ?? null;
export const refSource = bc ? 'BestChange' : 'CoinGecko';
export const hasRates = refRate != null && rates.usd != null;
/** Roubles → USDT at market rate, 2 decimals. */
export const toUsdt = (rub: number) => (refRate ? +(rub / refRate).toFixed(2) : null);
export const fmtRub = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }).replace(/\u00a0/g, ' ');
export const rateDate = (ru: boolean) => rates.date ? new Date(rates.date).toLocaleDateString(ru ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long' }) : '';
/** Cashier spread vs market USDT, in %, positive = cashier is worse for the player. */
export const spread = (cashier: number | null) => cashier != null && refRate ? +(((cashier - refRate) / refRate) * 100).toFixed(1) : null;
