import { entries } from './history';
import { casinos } from './casinos';

/** Average minimum deposit across the rating on each ledger date (state as of that date). */
export function minDepositIndex(): { date: string; avg: number; n: number }[] {
  const dates = [...new Set(entries.map((e) => e.date))].sort();
  const known: Record<string, number> = {};
  const out: { date: string; avg: number; n: number }[] = [];
  for (const d of dates) {
    for (const e of entries.filter((x) => x.date === d)) if (e.metrics.minDeposit != null) known[e.casino] = e.metrics.minDeposit;
    const vals = Object.values(known);
    if (vals.length) out.push({ date: d, avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), n: vals.length });
  }
  return out;
}

/** Series of a metric for one casino: [date, value] with carried-forward values. */
export function series(slug: string, key: string): [string, number][] {
  const out: [string, number][] = [];
  for (const e of entries.filter((x) => x.casino === slug)) if (e.metrics[key] != null) out.push([e.date, e.metrics[key]]);
  return out;
}

/** Inline SVG line chart (no JS). */
export function svgLine(points: [string, number][], opts: { w?: number; h?: number; unit?: string; invert?: boolean; title?: string } = {}): string {
  const w = opts.w ?? 360, h = opts.h ?? 90, p = 26;
  if (points.length < 2) return '';
  const xs = points.map((_, i) => p + (i * (w - 2 * p)) / (points.length - 1));
  const vals = points.map((v) => v[1]); const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const y = (v: number) => p + ((opts.invert ? v - lo : hi - v) / span) * (h - 2 * p);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${xs[i].toFixed(1)},${y(v[1]).toFixed(1)}`).join(' ');
  const dots = points.map((v, i) => `<circle cx="${xs[i].toFixed(1)}" cy="${y(v[1]).toFixed(1)}" r="3.5" fill="var(--gold)"><title>${v[0]}: ${v[1]}${opts.unit ?? ''}</title></circle>`).join('');
  const labels = points.map((v, i) => `<text x="${xs[i].toFixed(1)}" y="${h - 6}" font-size="10" text-anchor="middle" fill="var(--muted)">${v[0].slice(5).replace('-', '.')}</text>`).join('');
  const values = points.map((v, i) => `<text x="${xs[i].toFixed(1)}" y="${(y(v[1]) - 8).toFixed(1)}" font-size="11" text-anchor="middle" fill="var(--text)">${v[1]}${opts.unit ?? ''}</text>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${opts.title ?? ''}" style="max-width:${w}px;display:block"><path d="${d}" fill="none" stroke="var(--gold)" stroke-width="2"/>${dots}${values}${labels}</svg>`;
}
