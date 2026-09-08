/** «Стол» — a drifting field of chips and suits on dark felt. A tap drops a chip and sends a ring
 *  across the table; everything the ring passes lights up, then settles back into the noise.
 *  Canvas 2D + glyph atlas (one drawImage per visible cell). Loaded on idle as a separate chunk when the
 *  block comes near the viewport; the loop runs only while the block is on screen and the tab is visible.
 *  Reduced motion: the field does not drift, but a tap still answers (that is the user's own action). */

export interface TableOpts { mobile: boolean; reduced: boolean; colors: { dim: string; bright: string } }

/* glyph bands by field value: sparse marks → chips → suits */
const GLYPHS = ['·', '×', '+', '○', '□', '◇', '◎', '♠', '♣', '♥', '♦'];
const SUITS = [7, 8, 9, 10];
const LEVELS = 8;
const MONO = 'ui-monospace, "JetBrains Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';
const THR = 0.47;                 // field value below this → empty cell

function hash(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function hexToRgb(h: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
  if (!m) return '240,170,60';
  const n = parseInt(m[1], 16);
  return `${n >> 16},${(n >> 8) & 255},${n & 255}`;
}

interface Wave { x: number; y: number; t0: number; r: number }

export function start(canvas: HTMLCanvasElement, root: HTMLElement, opts: TableOpts): () => void {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};
  const m = opts.mobile;
  const dpr = Math.min(window.devicePixelRatio || 1, m ? 1.5 : 2);
  const cd = Math.round((m ? 14 : 12) * dpr);   // cell, device px
  const cell = cd / dpr;                        // cell, CSS px
  const fps = m ? 12 : 24;
  const dim = hexToRgb(opts.colors.dim), bright = hexToRgb(opts.colors.bright);
  const font = `${Math.round(cd * 0.9)}px ${MONO}`;
  const SPEED = m ? 520 : 680;                  // ring speed, CSS px per second
  const BAND = cell * (m ? 0.5 : 0.6);          // ring half-thickness
  const TAU = 1400;                             // excitation fade, ms
  const THR_LIT = 0.22;                         // threshold while the wave has lit a cell

  /* atlas: glyph × (LEVELS+1) brightness steps; low steps in the dim gold, high steps in the bright one */
  const atlas = document.createElement('canvas');
  atlas.width = cd * GLYPHS.length; atlas.height = cd * (LEVELS + 1);
  const ac = atlas.getContext('2d')!;
  ac.font = font; ac.textAlign = 'center'; ac.textBaseline = 'middle';
  for (let l = 0; l <= LEVELS; l++) {
    const k = l / LEVELS;
    ac.fillStyle = `rgba(${k < 0.6 ? dim : bright},${(0.22 + 0.72 * k).toFixed(3)})`;
    for (let g = 0; g < GLYPHS.length; g++) ac.fillText(GLYPHS[g], g * cd + cd / 2, l * cd + cd / 2);
  }

  let W = 0, H = 0, cols = 0, rows = 0;
  let exc = new Float32Array(0), seedCell = new Uint8Array(0);
  const waves: Wave[] = [];
  let tField = 0;                               // field time, s (frozen under reduced motion)

  function build() {
    W = root.clientWidth; H = root.clientHeight;
    canvas.width = Math.ceil(W * dpr); canvas.height = Math.ceil(H * dpr);
    cols = Math.ceil(W / cell); rows = Math.ceil(H / cell);
    exc = new Float32Array(cols * rows); seedCell = new Uint8Array(cols * rows);
    for (let i = 0; i < seedCell.length; i++) seedCell[i] = Math.floor(hash(i % cols, (i / cols) | 0, 9) * 4);
  }

  /* glyph for a field value above a threshold: marks → chips → rings → suits at the peaks */
  function glyphFor(v: number, thr: number, seed: number): number {
    const k = (v - thr) / (1 - thr);
    return k > 0.62 ? SUITS[seed] : k > 0.5 ? 6 : k > 0.38 ? 5 : k > 0.25 ? 3 + (seed & 1) : k > 0.12 ? 1 + (seed & 1) : 0;
  }

  function field(c: number, r: number): number {
    const t = tField;
    const n1 = noise(c / 9 + t * 0.05, r / 7 + t * 0.03, 1);
    const n2 = noise(c / 4.5 - t * 0.04, r / 4 + t * 0.06, 2);
    const n3 = noise(c / 6 + n1 * 2, r / 6 + t * 0.02, 3);
    return 0.55 * n1 + 0.3 * n2 + 0.15 * n3;
  }

  /* frame loop */
  let last = 0, raf = 0, running = false, visible = false;
  const step = 1000 / fps;

  function frame(now: number) {
    raf = running ? requestAnimationFrame(frame) : 0;
    if (now - last < step) return;
    const dt = last ? Math.min(now - last, 200) : step; last = now;
    if (!opts.reduced) tField += dt / 1000;
    for (const w of waves) w.r = (now - w.t0) / 1000 * SPEED;
    const decay = Math.exp(-dt / TAU);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const maxR = Math.hypot(W, H) + BAND * 2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const x = (c + 0.5) * cell, y = (r + 0.5) * cell;
      let ring = false, chip = 0;
      for (const w of waves) {
        const d = Math.hypot(x - w.x, y - w.y);
        if (Math.abs(d - w.r) < BAND) ring = true;
        else if (d < w.r && d >= w.r - SPEED * dt / 1000 - BAND) exc[i] = 1;   // just passed → lit
        if (d < cell * 1.6) chip = Math.max(chip, 1 - (now - w.t0) / 2600);    // the chip at the origin
      }
      let e = exc[i];
      if (e > 0) { e *= decay; exc[i] = e < 0.02 ? 0 : e; }
      if (ring) { ctx.fillStyle = `rgba(${bright},.95)`; ctx.fillRect(c * cd + 1, r * cd + 1, cd - 2, cd - 2); continue; }
      const v = field(c, r), sd = seedCell[i];
      let a = v > THR ? 0.15 + 0.85 * (v - THR) / (1 - THR) : 0, g = a > 0 ? glyphFor(v, THR, sd) : -1;
      if (chip > 0) { g = 6; a = Math.max(a, 0.4 + 0.6 * chip); }
      else if (e > 0.05 && v > THR_LIT) {
        // the wave lights the field underneath: lower threshold, more glow at the peaks, then it settles back
        const k = (v - THR_LIT) / (1 - THR_LIT), ae = e * (0.35 + 0.6 * k);
        if (ae > a) { a = ae; g = glyphFor(v, THR_LIT, sd); }
      }
      if (g < 0) continue;
      const lv = Math.min(LEVELS, Math.round(Math.min(1, a) * LEVELS));
      ctx.drawImage(atlas, g * cd, lv * cd, cd, cd, c * cd, r * cd, cd, cd);
    }
    for (let k = waves.length - 1; k >= 0; k--) if (waves[k].r > maxR) waves.splice(k, 1);
    if (opts.reduced && !waves.length) pause();       // static field: nothing left to animate
  }

  function play() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
  function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  function sync() { (visible && !document.hidden && (!opts.reduced || waves.length)) ? play() : pause(); }

  /* a tap drops a chip: mouse on press, finger on release without a drag (so page scroll stays free) */
  let px = 0, py = 0, pt = 0, pid = -1;
  function tap(e: PointerEvent) {
    const b = canvas.getBoundingClientRect();
    waves.push({ x: e.clientX - b.left, y: e.clientY - b.top, t0: performance.now(), r: 0 });
    if (waves.length > 4) waves.shift();
    root.classList.add('tapped');
    sync();
  }
  const onDown = (e: PointerEvent) => { if (e.button !== 0) return; px = e.clientX; py = e.clientY; pt = e.timeStamp; pid = e.pointerId; if (e.pointerType === 'mouse') tap(e); };
  const onUp = (e: PointerEvent) => { if (e.pointerId !== pid || e.pointerType === 'mouse') return; pid = -1; if (Math.hypot(e.clientX - px, e.clientY - py) < 12 && e.timeStamp - pt < 500) tap(e); };
  root.addEventListener('pointerdown', onDown, { passive: true });
  root.addEventListener('pointerup', onUp, { passive: true });

  const io = new IntersectionObserver((es) => { visible = es.some((x) => x.isIntersecting); sync(); }, { threshold: 0 });
  io.observe(root);
  document.addEventListener('visibilitychange', sync);
  let rt = 0;
  const onResize = () => { clearTimeout(rt); rt = window.setTimeout(() => { build(); if (!running) { last = 0; frame(performance.now()); } }, 200); };
  window.addEventListener('resize', onResize);

  build();
  canvas.classList.add('is-on');
  last = 0; frame(performance.now());                // first frame right away, even if the loop then sleeps
  sync();
  return () => { pause(); io.disconnect(); document.removeEventListener('visibilitychange', sync); window.removeEventListener('resize', onResize); root.removeEventListener('pointerdown', onDown); root.removeEventListener('pointerup', onUp); };
}
