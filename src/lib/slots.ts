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
