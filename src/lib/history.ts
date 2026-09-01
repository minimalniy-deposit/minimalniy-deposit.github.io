import data from '../data/history.json';

export interface HistEntry { date: string; source: string; casino: string; metrics: Record<string, number> }
export const lastChecked: string = data.lastChecked;
export const entries: HistEntry[] = data.entries as HistEntry[];

/** Rows for one casino, oldest first. */
export const forCasino = (slug: string) => entries.filter((e) => e.casino === slug);

/** Real changes for one casino: entries where at least one metric differs from the previous known value. */
export function changesFor(slug: string): { date: string; source: string; diffs: { key: string; from: number | null; to: number }[] }[] {
  const known: Record<string, number> = {};
  const out = [];
  for (const e of forCasino(slug)) {
    const diffs = [];
    for (const [k, v] of Object.entries(e.metrics)) {
      if (known[k] !== v) diffs.push({ key: k, from: known[k] ?? null, to: v });
      known[k] = v;
    }
    if (diffs.length) out.push({ date: e.date, source: e.source, diffs });
  }
  return out;
}

export interface Snapshot { date: string; casino: string; url: string; snapshot: string }
export const snapshots: Snapshot[] = ((data as any).snapshots ?? []) as Snapshot[];
export const snapshotsFor = (slug: string) => snapshots.filter((s) => s.casino === slug);

export const observedSince = (slug: string) => forCasino(slug)[0]?.date ?? null;
