/* Aven 2 · premium still. The scene is painted once per size: a sky, a sun's glow and layered ridges in haze,
   fading into the page, computed in full precision and dithered so the slow gradients never band. */
const $ = (s) => document.querySelector(s);
const root = document.documentElement;

function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const LOOKS = {
  dawn: {
    sky: [[0, '#9fb4d3'], [0.18, '#cfd6e6'], [0.3, '#e8d6d2'], [0.42, '#f6c9ac'], [0.5, '#fbbf98']],
    sun: { x: 0.7, y: 0.38, c: '#fff3e4', r: 0.34, a: 1 },
    ridges: [
      { base: 0.33, amp: 0.07, c: '#b4bfd2', haze: '#ecdcd3', seed: 3 },
      { base: 0.4, amp: 0.075, c: '#97a3bb', haze: '#dfd8dc', seed: 8 },
      { base: 0.48, amp: 0.06, c: '#7a87a1', haze: '#cfd0da', seed: 13 },
      { base: 0.56, amp: 0.05, c: '#5c6884', haze: '#b7bdcb', seed: 21 },
    ],
    page: '#eef0f3', fade: [0.74, 0.97], grain: 2.6,
  },
  dusk: {
    sky: [[0, '#070d1c'], [0.2, '#16264a'], [0.34, '#3d4a73'], [0.42, '#c98877'], [0.47, '#f0b48e']],
    sun: { x: 0.3, y: 0.44, c: '#ffcfa8', r: 0.24, a: 0.75 },
    ridges: [
      { base: 0.37, amp: 0.07, c: '#3a3f5e', haze: '#8b7486', seed: 3 },
      { base: 0.43, amp: 0.075, c: '#262b47', haze: '#5b5370', seed: 8 },
      { base: 0.5, amp: 0.06, c: '#171c33', haze: '#363a58', seed: 13 },
      { base: 0.58, amp: 0.05, c: '#0b1022', haze: '#1d2340', seed: 21 },
    ],
    page: '#070b14', fade: [0.76, 0.98], grain: 3,
  },
};

function ridge(w, seed, amp, base, H) {
  const r = rng(seed), oct = [[1.1, 1], [2.3, 0.5], [4.7, 0.2], [9.5, 0.07], [19, 0.02]].map(([f, a]) => [f, a, r() * 6.28]);
  const out = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    const u = x / w; let v = 0;
    // Smooth swells for the big shapes, sharp creases for the smaller ones, so ridges read as rock, not dunes.
    for (const [f, a, p] of oct) { const ff = f * (1 + seed * 0.013), s = Math.sin(u * 6.28 * ff + p); v += f >= 2.3 && f < 9 ? a * (0.7 * s + 0.3 * (1 - 2 * Math.abs(s))) : a * s; }
    out[x] = (base - amp * v) * H;
  }
  return out;
}

function paintScene() {
  const L = LOOKS[root.dataset.look], cv = $('.scene');
  const S = Math.min(devicePixelRatio || 1, 2), w = Math.round(innerWidth * S), h = Math.round(innerHeight * S);
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
  const sky = L.sky.map(([o, c]) => [o, hex(c)]), page = hex(L.page), sun = hex(L.sun.c);
  const rid = L.ridges.map((q) => ({ y: ridge(w, q.seed, q.amp, q.base, h), c: hex(q.c), hz: hex(q.haze) }));
  const skyAt = (t) => { let i = 0; while (i < sky.length - 2 && t > sky[i + 1][0]) i++; const [o0, c0] = sky[i], [o1, c1] = sky[i + 1]; return mix(c0, c1, Math.min(1, Math.max(0, (t - o0) / (o1 - o0)))); };
  const R = rng(7), sx = L.sun.x * w, sy = L.sun.y * h, sr = L.sun.r * Math.max(w, h);
  let k = 0;
  for (let y = 0; y < h; y++) {
    const ty = y / h, base = skyAt(ty), fade = smooth(L.fade[0], L.fade[1], ty);
    for (let x = 0; x < w; x++) {
      let c = base;
      const dx = x - sx, dy = (y - sy) * 1.5, g = Math.exp(-(dx * dx + dy * dy) / (2 * sr * sr)) * L.sun.a;
      c = mix(c, sun, g);
      for (const q of rid) {
        const top = q.y[x];
        if (y >= top) {
          // Haze at each ridge's top, fading down into its own colour: depth without a hard edge.
          const into = (y - top) / h, hz = Math.exp(-into / 0.035);
          c = mix(q.c, q.hz, hz * 0.85);
          // The sun's light still reaches the far ridges a little.
          c = mix(c, sun, g * 0.25);
          // A thin rim of light on the sun's side of each crest.
          if (y - top < 1.5 * S) c = mix(c, sun, 0.25 * Math.min(1, g * 3 + 0.3));
        }
      }
      c = mix(c, page, fade);
      const n = (R() + R() - 1) * L.grain;
      d[k++] = c[0] + n; d[k++] = c[1] + n; d[k++] = c[2] + n; d[k++] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* The gauge: a 240° arc of fine ticks (Oura's readiness dial). */
const C = 150, RA = 124, A0 = 150, A1 = 390;
const pt = (a, r) => [C + r * Math.cos(a * Math.PI / 180), C + r * Math.sin(a * Math.PI / 180)];
const arcPath = (a0, a1, r) => { const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`; };
(() => {
  const g = $('.ticks'); let s = '';
  for (let i = 0; i <= 60; i++) { const a = A0 + (A1 - A0) * i / 60, long = i % 15 === 0; const [x0, y0] = pt(a, RA + 9), [x1, y1] = pt(a, RA + (long ? 17 : 13)); s += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"${long ? ' style="stroke-width:1.6"' : ''}/>`; }
  g.innerHTML = s;
  $('.track').setAttribute('d', arcPath(A0, A1, RA));
})();
const PROGRESS = { set: 0.56, rest: 0.52, record: 1 };
function setGauge() {
  const p = PROGRESS[root.dataset.state], a = A0 + (A1 - A0) * p;
  $('.arc').setAttribute('d', arcPath(A0, a, RA));
  const [x, y] = pt(a, RA); $('.knob').setAttribute('cx', x); $('.knob').setAttribute('cy', y);
}

function apply() {
  document.querySelectorAll('.picker button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.look ? b.dataset.look === root.dataset.look : b.dataset.state === root.dataset.state));
  setGauge();
  const u = new URL(location.href); u.searchParams.set('look', root.dataset.look); u.searchParams.set('state', root.dataset.state); history.replaceState(null, '', u);
}
const q = new URLSearchParams(location.search);
root.dataset.look = LOOKS[q.get('look')] ? q.get('look') : 'dawn';
root.dataset.state = PROGRESS[q.get('state')] !== undefined ? q.get('state') : 'set';
apply(); paintScene();
document.querySelectorAll('.picker button').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.look) { root.dataset.look = b.dataset.look; paintScene(); } else root.dataset.state = b.dataset.state;
  apply();
}));
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(paintScene, 200); });
