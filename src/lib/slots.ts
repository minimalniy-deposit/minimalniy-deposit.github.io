import data from '../data/slots.json';
export type Slot = (typeof data)['games'][number];
export const slots: Slot[] = data.games;
export const slotsMeta = { fetchedAt: data.fetchedAt, source: data.source };
export const providers = [...new Set(slots.map((s) => s.provider))].sort();
export const providerSlug = (p: string) => p.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const bySlug = (slug: string) => slots.find((s) => s.slug === slug);
export const similar = (s: Slot, n = 6) => slots.filter((x) => x.slug !== s.slug && x.provider === s.provider).slice(0, n);
