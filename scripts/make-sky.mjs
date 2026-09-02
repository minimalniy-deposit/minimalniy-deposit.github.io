// Deterministic storm-sky painter, pure-JS fBm (no SVG filter quirks).
// Regenerate: npm i --no-save sharp && node scripts/make-sky.mjs
import sharp from 'sharp';

const W = 1600, H = 900;
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const makeNoise = (seed) => {
  const r = mulberry(seed), g = new Float32Array(512 * 512);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const at = (x, y) => g[((y & 511) << 9) | (x & 511)];
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
};
const fbm = (n, x, y, oct = 5) => { let v = 0, amp = .5, f = 1; for (let o = 0; o < oct; o++) { v += amp * n(x * f, y * f); amp *= .5; f *= 2.02; } return v; };
const n1 = makeNoise(7), n2 = makeNoise(23), n3 = makeNoise(41);
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

function paint(lit) {
  const px = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    const v = y / H;
    for (let x = 0; x < W; x++) {
      const u = x / W, i = (y * W + x) * 3;
      // domain-warped cloud density
      const wx = fbm(n2, u * 3, v * 3, 4), wy = fbm(n3, u * 3 + 9, v * 3 + 9, 4);
      let d = fbm(n1, u * 4.2 + wx * 1.1, v * 3.1 + wy * 1.1, 5);
      d = smooth(.38, .74, d);                                   // contrast: separated cloud masses
      d *= .55 + .45 * smooth(.95, .25, v);                      // denser toward the top
      const under = smooth(.45, .8, fbm(n2, u * 1.7, v * 1.4, 4)); // big dark under-bellies
      // night base
      let R = 10 + 7 * (1 - v), G = 13 + 9 * (1 - v) * .9, B = 19 + 14 * (1 - v);
      R -= 6 * under; G -= 7 * under; B -= 8 * under;
      // colored storm-light fields (blue upper-left, amber lower-right)
      const db = Math.hypot(u - .14, (v - .06) * 1.25), blue = Math.exp(-db * db * 3.2);
      const da = Math.hypot((u - .92) * 1.05, (v - 1.02) * 1.45), amber = Math.exp(-da * da * 3.4);
      const litF = lit ? Math.exp(-(Math.hypot(u - .56, (v - .1) * 1.5) ** 2) * 3.6) : 0;
      const cloudGlow = d * (1 - .55 * under);
      R += cloudGlow * (blue * 44 + amber * 96) + blue * 5 + amber * 9;
      G += cloudGlow * (blue * 66 + amber * 62) + blue * 7 + amber * 6;
      B += cloudGlow * (blue * 118 + amber * 26) + blue * 12 + amber * 3;
      if (lit) { const L = cloudGlow * litF; R += L * 150 + litF * 14; G += L * 175 + litF * 17; B += L * 215 + litF * 24; }
      // low warm haze on the right horizon — soft, cloud-modulated, no shapes
      const hz = Math.exp(-(((1 - v) * 4.5) ** 2)) * (0.35 + .65 * u) * (0.5 + .5 * d);
      R += hz * 34; G += hz * 22; B += hz * 6;
      // vignette + dither grain
      const dv = Math.hypot((u - .5) * 1.15, (v - .47)); const vg = 1 - .38 * smooth(.55, .95, dv);
      const gr = (n3((x + 31) * .9, (y + 17) * .9) - .5) * 5;
      px[i] = clamp(R * vg + gr); px[i + 1] = clamp(G * vg + gr); px[i + 2] = clamp(B * vg + gr);
    }
  }
  return px;
}

for (const [name, lit] of [['sky', 0], ['sky-lit', 1]]) {
  const raw = { raw: { width: W, height: H, channels: 3 } };
  await sharp(paint(lit), raw).webp({ quality: 64 }).toFile(`public/img/${name}.webp`);
  await sharp(paint(lit), raw).resize(760).webp({ quality: 58 }).toFile(`public/img/${name}-m.webp`);
  await sharp(paint(lit), raw).resize(760).png().toFile(`/tmp/${name}-check.png`);
  console.log(name, 'ok');
}
