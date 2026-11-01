/* Soft colour fields with no banding of their own: every pixel is computed in full precision and dithered once
   (triangular noise, ±1 step) before it is rounded to 8 bits, so slow gradients never form rings (LESSONS 2).
   Painted once per screen size, then only moved or faded on the compositor. */

function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * blobs: [{ x, y (0..1 of the field), sx, sy (spread as a share of the width), c: [r,g,b], a }]
 * base: [r,g,b], or null for a see-through layer. The field is `over` times the screen so it can drift without showing an edge.
 */
export function paintField(blobs, base, { w = innerWidth, h = innerHeight, over = 1.25, seed = 11 } = {}) {
  const S = Math.min(window.devicePixelRatio || 1, 2);
  const W = w * over, H = h * over;
  const cw = Math.round(W * S), ch = Math.round(H * S);
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  c.style.width = W + 'px'; c.style.height = H + 'px';
  const ctx = c.getContext('2d'), img = ctx.createImageData(cw, ch), d = img.data;
  const bl = blobs.map((b) => {
    const sx = (b.sx ?? b.s) * W, sy = (b.sy ?? b.sx ?? b.s) * W, gx = new Float32Array(cw), gy = new Float32Array(ch);
    for (let x = 0; x < cw; x++) { const X = (x + 0.5) / S - b.x * W; gx[x] = Math.exp(-(X * X) / (2 * sx * sx)); }
    for (let y = 0; y < ch; y++) { const Y = (y + 0.5) / S - b.y * H; gy[y] = Math.exp(-(Y * Y) / (2 * sy * sy)); }
    return { gx, gy, c: b.c, a: b.a };
  });
  const r = rng(seed), row = new Float32Array(bl.length);
  const clear = !base; // no base: a see-through layer that only holds its blobs, to lie over another field
  let i = 0;
  for (let y = 0; y < ch; y++) {
    for (let j = 0; j < bl.length; j++) row[j] = bl[j].gy[y];
    for (let x = 0; x < cw; x++) {
      if (clear) {
        // Premultiplied "over", dithered in premultiplied space (that is what the canvas stores), so faint edges
        // keep their noise and never step.
        let R = 0, G = 0, B = 0, A = 0;
        for (let j = 0; j < bl.length; j++) {
          const o = bl[j], f = o.gx[x] * row[j] * o.a;
          R = o.c[0] * f + R * (1 - f); G = o.c[1] * f + G * (1 - f); B = o.c[2] * f + B * (1 - f); A = f + A * (1 - f);
        }
        const a8 = Math.max(0, Math.min(255, Math.round(A * 255 + r() + r() - 1)));
        const un = (v) => (a8 ? Math.min(255, Math.round((Math.min(a8, Math.max(0, Math.round(v + r() + r() - 1))) * 255) / a8)) : 0);
        d[i] = un(R); d[i + 1] = un(G); d[i + 2] = un(B); d[i + 3] = a8;
        i += 4;
        continue;
      }
      let R = base[0], G = base[1], B = base[2];
      // Each blob is laid over what is below it, like light (normal blend, so colours never go muddy).
      for (let j = 0; j < bl.length; j++) {
        const o = bl[j], f = o.gx[x] * row[j] * o.a;
        R += (o.c[0] - R) * f; G += (o.c[1] - G) * f; B += (o.c[2] - B) * f;
      }
      d[i] = R + r() + r() - 1; d[i + 1] = G + r() + r() - 1; d[i + 2] = B + r() + r() - 1; d[i + 3] = 255;
      i += 4;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** A layer that holds a painted field, centred, ready to drift on the compositor. */
export function fieldLayer(canvas, cls = '') {
  const el = document.createElement('div');
  el.className = 'field ' + cls;
  el.append(canvas);
  return el;
}

/** Slow drift on the compositor; paused while the page is hidden (off-screen animation is paused). */
export function drift(el, frames, ms) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return { stop() {} };
  const a = el.animate(frames, { duration: ms, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
  const vis = () => (document.hidden ? a.pause() : a.play());
  document.addEventListener('visibilitychange', vis);
  return { anim: a, stop() { document.removeEventListener('visibilitychange', vis); a.cancel(); } };
}

/**
 * Grain for frosted glass. Live blur smooths away the field's dither and can leave faint rings, so every blurred
 * surface carries a still, invisible noise: each device pixel is a touch lighter or darker (about ±1–3 levels).
 * One 128 px tile at the screen's own pixel size, made once, never animated.
 */
export function grain(doc = document.documentElement) {
  const n = 128, c = document.createElement('canvas');
  c.width = c.height = n;
  const ctx = c.getContext('2d'), img = ctx.createImageData(n, n), d = img.data, r = rng(7);
  for (let i = 0; i < d.length; i += 4) {
    const v = r() < 0.5 ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 3;
  }
  ctx.putImageData(img, 0, 0);
  doc.style.setProperty('--grain', `url(${c.toDataURL()})`);
  doc.style.setProperty('--grain-size', `${n / (window.devicePixelRatio || 1)}px`);
}
