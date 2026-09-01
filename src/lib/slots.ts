import data from '../data/slots.json';
export interface Slot {
  slug: string; name: string; provider: string; providerSlug?: string;
  rtp: number | null; volatility: string | null; maxWin: string | null;
  grid?: string | null; hitFrequency?: number | null; releaseDate?: string | null; rating?: number | null; payType?: string | null; isNew?: boolean;
  themes?: string[]; features?: string[]; image: string | null; screenshot?: string | null; sourceUrl?: string; demoUrl: string | null;
}
export const slots: Slot[] = data.games as Slot[];
export const slotsMeta = { fetchedAt: data.fetchedAt, source: data.source };
export const providers = [...new Set(slots.map((s) => s.provider))].sort();
export const providerSlug = (p: string) => p.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const bySlug = (slug: string) => slots.find((s) => s.slug === slug);
export const similar = (s: Slot, n = 6) => slots.filter((x) => x.slug !== s.slug && x.provider === s.provider).slice(0, n);

export const volatilityRu: Record<string, string> = { 'very-low': 'Очень низкая', low: 'Низкая', 'medium-low': 'Ниже средней', medium: 'Средняя', 'medium-high': 'Выше средней', high: 'Высокая', 'very-high': 'Очень высокая' };
export const volatilityEn: Record<string, string> = { 'very-low': 'Very low', low: 'Low', 'medium-low': 'Medium-low', medium: 'Medium', 'medium-high': 'Medium-high', high: 'High', 'very-high': 'Very high' };
export const vol = (v: string | null | undefined, ru: boolean) => v ? ((ru ? volatilityRu : volatilityEn)[v.toLowerCase().replace(/\s+/g, '-')] ?? v) : null;

/** Released within `days` of the catalogue sync date, newest first. */
export function newSlots(days = 14): Slot[] {
  const ref = new Date(slotsMeta.fetchedAt ?? Date.now()).getTime();
  return slots.filter((s) => { if (!s.releaseDate) return false; const d = ref - new Date(s.releaseDate).getTime(); return d >= 0 && d <= days * 864e5; }).sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
}
/** Deterministic weekly pick: best-rated release of the last 60 days, else rotate the top-rated by ISO week. */
export function slotOfTheWeek(): Slot | null {
  const recent = newSlots(60).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (recent.length) return recent[0];
  const top = [...slots].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 12);
  const week = Math.floor(Date.now() / (7 * 864e5));
  return top.length ? top[week % top.length] : null;
}
