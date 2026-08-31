import r from '../data/rates.json';
export const rates = r as { date: string | null; cbrDate: string | null; usd: number | null; eur: number | null; usdt: number | null; btc: number | null; sources: string[] };
export const hasRates = rates.usdt != null && rates.usd != null;
/** Roubles → USDT at market rate, 2 decimals. */
export const toUsdt = (rub: number) => (rates.usdt ? +(rub / rates.usdt).toFixed(2) : null);
export const fmtRub = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }).replace(/\u00a0/g, ' ');
export const rateDate = (ru: boolean) => rates.date ? new Date(rates.date).toLocaleDateString(ru ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long' }) : '';
/** Cashier spread vs market USDT, in %, positive = cashier is worse for the player. */
export const spread = (cashier: number | null) => cashier != null && rates.usdt ? +(((cashier - rates.usdt) / rates.usdt) * 100).toFixed(1) : null;
