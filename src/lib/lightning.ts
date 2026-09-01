/** Procedural lightning: a jittered main channel with branches. Deterministic per seed so builds are stable. */
function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; }; }

export interface Bolt { main: string; branches: string[]; x0: number; y0: number; w: number; h: number }

export function bolt(seed: number, w = 220, h = 520): Bolt {
  const r = rng(seed);
  const x0 = w * (0.35 + r() * 0.3), y0 = 0;
  const pts: [number, number][] = [[x0, y0]];
  let x = x0, y = y0, drift = (r() - 0.5) * 0.6;
  while (y < h) {
    const step = 12 + r() * 22;           // segment length
    drift += (r() - 0.5) * 0.9; drift = Math.max(-1.2, Math.min(1.2, drift));
    x += drift * step * 0.55 + (r() - 0.5) * 10;
    y += step * (0.8 + r() * 0.4);
    x = Math.max(10, Math.min(w - 10, x));
    pts.push([x, Math.min(y, h)]);
  }
  const path = (p: [number, number][]) => p.map((q, i) => `${i ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
  const branches: string[] = [];
  const nb = 2 + Math.floor(r() * 3);
  for (let b = 0; b < nb; b++) {
    const i = 2 + Math.floor(r() * (pts.length * 0.6));
    let [bx, by] = pts[i]; const dir = r() < 0.5 ? -1 : 1; const bp: [number, number][] = [[bx, by]];
    const len = 3 + Math.floor(r() * 5);
    for (let k = 0; k < len; k++) { bx += dir * (6 + r() * 16); by += 8 + r() * 16; bp.push([Math.max(4, Math.min(w - 4, bx)), by]); }
    branches.push(path(bp));
  }
  return { main: path(pts), branches, x0, y0, w, h };
}
