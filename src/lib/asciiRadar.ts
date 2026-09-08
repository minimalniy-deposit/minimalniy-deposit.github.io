/** ASCII radar background. Loaded on idle as a separate chunk (see components/AsciiRadar.astro).
 *  Canvas 2D with a pre-rendered glyph atlas: one drawImage per lit cell and nothing else per frame.
 *  The sweep lights the cells it passes; each cell then fades on its own clock, blips fade slower.
 *  Budget: desktop 30 fps / dpr ≤ 1.5, mobile 15 fps / dpr 1; paused while the tab is hidden;
 *  reduced-motion or save-data → one static frame, no loop. */

export interface RadarOpts { mobile: boolean; reduced: boolean }

const RAMP = ' .:-=+*#%@';        // intensity 0 → 1
const LEVELS = 8;                 // alpha steps in the atlas
const TINT = '191,224,255';       // the storm's cool bolt colour
const MONO = 'ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace';

export function start(canvas: HTMLCanvasElement, opts: RadarOpts): () => void {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};
  const m = opts.mobile;
  const dpr = Math.min(window.devicePixelRatio || 1, m ? 1 : 1.5);
  const cd = Math.round((m ? 15 : 13) * dpr);   // cell size, device px (integer → crisp glyphs)
  const cell = cd / dpr;                        // cell size, CSS px
  const fps = m ? 15 : 30;
  const maxAlpha = m ? 0.42 : 0.5;
  const period = 9000;                          // ms per revolution
  const tau = 750;                              // ms, trail fade constant
  const font = `${Math.round(cd * 0.86)}px ${MONO}`;

  /* glyph atlas: RAMP.length chars × (LEVELS+1) alphas, drawn once */
  const atlas = document.createElement('canvas');
  atlas.width = cd * RAMP.length; atlas.height = cd * (LEVELS + 1);
  const ac = atlas.getContext('2d')!;
  ac.font = font; ac.textAlign = 'center'; ac.textBaseline = 'middle';
  for (let l = 0; l <= LEVELS; l++) {
    ac.fillStyle = `rgba(${TINT},${(0.1 + (maxAlpha - 0.1) * (l / LEVELS)).toFixed(3)})`;
    for (let c = 1; c < RAMP.length; c++) ac.fillText(RAMP[c], c * cd + cd / 2, l * cd + cd / 2);
  }

  let W = 0, H = 0, cols = 0, cx = 0, cy = 0, R = 0;
  let idx = new Int32Array(0), ang = new Float32Array(0), rad = new Float32Array(0); // cells inside the disc
  let inten = new Float32Array(0), slow = new Uint8Array(0);                          // per-cell state
  let stat: HTMLCanvasElement | null = null;                                          // rings + axes
  let blips: number[] = [];
  let sync = true;                                                                    // re-anchor the sweep

  function build() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.ceil(W * dpr); canvas.height = Math.ceil(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    cols = Math.ceil(W / cell); const rows = Math.ceil(H / cell);
    cx = W / 2; cy = m ? H * 0.42 : H * 0.5;
    R = (m ? 0.5 : 0.42) * Math.min(W, H);
    const ti: number[] = [], ta: number[] = [], tr: number[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = (c + 0.5) * cell - cx, y = (r + 0.5) * cell - cy, d = Math.hypot(x, y);
      if (d <= R) { ti.push(r * cols + c); ta.push(Math.atan2(y, x)); tr.push(d); }
    }
    idx = Int32Array.from(ti); ang = Float32Array.from(ta); rad = Float32Array.from(tr);
    inten = new Float32Array(idx.length); slow = new Uint8Array(idx.length);
    blips = []; for (let i = 0; i < (m ? 4 : 6); i++) spawnBlip();
    sync = true;
    drawStatic();
  }

  function drawStatic() {
    stat = document.createElement('canvas');
    stat.width = canvas.width; stat.height = canvas.height;
    const s = stat.getContext('2d')!;
    s.font = font; s.textAlign = 'center'; s.textBaseline = 'middle';
    const rings = [0.25, 0.5, 0.75, 1].map((k) => k * R);
    for (let i = 0; i < idx.length; i++) {
      const k = idx[i], c = k % cols, r = (k - c) / cols, d = rad[i];
      const px = (c + 0.5) * cell - cx, py = (r + 0.5) * cell - cy;
      let ch = '', a = 0;
      if (Math.abs(px) < cell / 2 && Math.abs(py) < cell / 2) { ch = '+'; a = 0.22; }
      else if (Math.abs(px) < cell / 2) { ch = '|'; a = 0.09; }
      else if (Math.abs(py) < cell / 2) { ch = '-'; a = 0.09; }
      else for (const rr of rings) if (Math.abs(d - rr) < cell * 0.5) { ch = rr === R ? ':' : '.'; a = rr === R ? 0.16 : 0.12; break; }
      if (!ch) continue;
      s.fillStyle = `rgba(${TINT},${a})`; s.fillText(ch, c * cd + cd / 2, r * cd + cd / 2);
    }
  }

  function spawnBlip() {
    if (!idx.length) return;
    let i = Math.floor(Math.random() * idx.length), guard = 0;
    while (rad[i] < R * 0.15 && guard++ < 20) i = Math.floor(Math.random() * idx.length);
    slow[i] = 1; blips.push(i);
  }

  /* frame loop */
  let prevA = 0, last = 0, t0 = 0, raf = 0, running = false, nextBlip = 0;
  const step = 1000 / fps;

  function frame(now: number) {
    raf = running ? requestAnimationFrame(frame) : 0;
    if (now - last < step) return;
    const dt = last ? Math.min(now - last, 250) : step; last = now;
    if (!t0) t0 = now;
    const a = ((now - t0) % period) / period * Math.PI * 2 - Math.PI;   // −π..π, same range as atan2
    if (sync) { prevA = a; sync = false; }
    const wrap = a < prevA;
    const decay = Math.exp(-dt / tau), decaySlow = Math.exp(-dt / (tau * 4));
    for (let i = 0; i < idx.length; i++) {
      const th = ang[i];
      const hit = wrap ? (th > prevA || th <= a) : (th > prevA && th <= a);
      if (hit) inten[i] = 1 - 0.3 * (rad[i] / R);
      else inten[i] *= slow[i] ? decaySlow : decay;
    }
    prevA = a;
    if (now > nextBlip) { nextBlip = now + 5000 + Math.random() * 6000; if (blips.length > 2) slow[blips.shift()!] = 0; spawnBlip(); }
    render();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (stat) ctx.drawImage(stat, 0, 0);
    for (let i = 0; i < idx.length; i++) {
      const v = inten[i];
      if (v < 0.04) continue;
      const k = idx[i], c = k % cols, r = (k - c) / cols;
      const ch = Math.min(RAMP.length - 1, 1 + Math.floor(v * (RAMP.length - 1)));
      const lv = Math.min(LEVELS, Math.round(v * LEVELS));
      ctx.drawImage(atlas, ch * cd, lv * cd, cd, cd, c * cd, r * cd, cd, cd);
    }
  }

  function staticFrame() {
    // reduced motion / save-data: a frozen sweep with a short trail, no loop
    const a = -Math.PI * 0.35;
    for (let i = 0; i < idx.length; i++) { let d = a - ang[i]; if (d < 0) d += Math.PI * 2; inten[i] = d < 0.9 ? (1 - d / 0.9) * (1 - 0.3 * rad[i] / R) : 0; }
    render();
  }

  function play() { if (running || opts.reduced) return; running = true; last = 0; sync = true; raf = requestAnimationFrame(frame); }
  function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function onVis() { document.hidden ? pause() : play(); }
  let rt = 0;
  function onResize() { clearTimeout(rt); rt = window.setTimeout(() => { build(); if (opts.reduced) staticFrame(); }, 250); }

  build();
  canvas.classList.add('is-on');
  if (opts.reduced) staticFrame(); else if (!document.hidden) play();
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('resize', onResize);
  return () => { pause(); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('resize', onResize); };
}
