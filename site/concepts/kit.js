/* Aven 2 concept prototypes: shared motion, materials and the bench chart.
   Motion rule (TASTE.md §4): everything that moves runs in the browser (WAAPI with spring curves),
   never a per-frame script loop. Nothing here keeps anything on the phone: this address also hosts old Aven. */

/* ---------- Springs, sampled into a CSS linear() curve ---------- */
const cache = new Map();
/** A spring from 0 to 1 as a linear() easing and its duration. response in s, damping ratio, v0 in "distances per second". */
export function spring({ response = 0.42, damping = 1, v0 = 0 } = {}) {
  const key = `${response}|${damping}|${v0.toFixed(2)}`;
  if (cache.has(key)) return cache.get(key);
  const k = (2 * Math.PI / response) ** 2, c = (4 * Math.PI * damping) / response, dt = 1 / 240;
  let x = 0, v = v0, t = 0;
  const pts = [0];
  let next = 1 / 60;
  while (t < 3) {
    v += (-k * (x - 1) - c * v) * dt;
    x += v * dt;
    t += dt;
    if (t >= next) { pts.push(x); next += 1 / 60; if (Math.abs(x - 1) < 0.0015 && Math.abs(v) < 0.02) break; }
  }
  pts[pts.length - 1] = 1;
  const out = { easing: `linear(${pts.map((p) => +p.toFixed(4)).join(',')})`, duration: Math.round(pts.length * (1000 / 60)) };
  cache.set(key, out);
  return out;
}
export const SPRING = { response: 0.42, damping: 1 }; // the default: calm, no overshoot
export const SPRING_LIVELY = { response: 0.38, damping: 0.82 }; // after a flick, or a moment that should feel alive

/* Reduced motion: no travel, only a short fade. */
const RM = matchMedia('(prefers-reduced-motion: reduce)');
export const reduced = () => RM.matches;

/** Animate keyframes on the compositor with a spring. The final state should already be in the element's style. */
export function play(el, frames, opts = SPRING, extra = {}) {
  if (RM.matches) {
    const fade = frames.map((f) => ('opacity' in f ? { opacity: f.opacity } : {}));
    const has = frames.some((f) => 'opacity' in f);
    return el.animate(has ? fade : [{}, {}], { duration: has ? 150 : 0, easing: 'ease-out', fill: extra.fill || 'backwards', delay: extra.delay || 0 });
  }
  const s = spring(opts);
  return el.animate(frames, { duration: s.duration, easing: s.easing, fill: 'backwards', ...extra });
}

/** Animate a property from wherever it is right now (so an interruption never jumps), to its new value. */
export function playFromHere(el, prop, to, opts = SPRING) {
  const now = getComputedStyle(el)[prop];
  el.getAnimations().forEach((a) => a.cancel());
  el.style[prop] = to;
  return play(el, [{ [prop]: now }, { [prop]: to }], opts);
}

/** Fade + rise in. */
export function enter(el, { y = 14, delay = 0, opts = SPRING, scale = 1 } = {}) {
  return play(el, [
    { opacity: 0, transform: `translate3d(0, ${y}px, 0) scale(${scale})` },
    { opacity: 1, transform: 'none' },
  ], opts, { delay });
}

/** When content above the fold shrinks, keep the scroll still: pad the bottom for now, then glide back. */
function holdScroll(scroller, mutate) {
  if (!scroller) return mutate();
  const top = scroller.scrollTop, h0 = scroller.scrollHeight;
  mutate();
  const lost = h0 - scroller.scrollHeight;
  if (lost > 0 && top > 0) {
    const pad = parseFloat(scroller.style.paddingBottom) || 0;
    const base = pad ? pad : parseFloat(getComputedStyle(scroller).paddingBottom);
    scroller.style.paddingBottom = base + lost + 'px';
    scroller.scrollTop = top;
    setTimeout(() => {
      const done = () => { scroller.style.paddingBottom = ''; };
      if (scroller.scrollTop + scroller.clientHeight > scroller.scrollHeight - lost - 1) {
        scroller.addEventListener('scrollend', done, { once: true });
        setTimeout(done, 900);
        scroller.scrollBy({ top: -lost, behavior: RM.matches ? 'instant' : 'smooth' });
      } else done();
    }, 450);
  }
}

/** FLIP: measure, change the layout, then slide every element from where it was to where it is now. */
export function flip(els, mutate, opts = SPRING) {
  const list = [...els].filter(Boolean);
  const before = new Map(list.map((e) => [e, e.getBoundingClientRect()]));
  // Measured mid-flight above, so cancelling now never jumps: the new slide starts from where it was seen.
  for (const e of list) for (const old of e.getAnimations()) if (old.id === 'flip') old.cancel();
  const scroller = list[0]?.closest('.nb-page, .panel');
  holdScroll(scroller, mutate);
  const anims = [];
  for (const e of list) {
    if (!e.isConnected || e.hidden) continue;
    const a = before.get(e), b = e.getBoundingClientRect();
    const dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
    const an = play(e, [{ transform: `translate3d(${dx}px, ${dy}px, 0)` }, { transform: 'none' }], opts);
    an.id = 'flip';
    anims.push(an);
  }
  return anims;
}

/**
 * Fold elements away: each fades and shrinks where it is while the neighbours close the gap (FLIP).
 * mutate() holds every other layout change of the same moment, so it all moves as one (no jump).
 */
export function foldAway(els, neighbours, opts = SPRING, mutate = () => {}) {
  const list = Array.isArray(els) ? els : [els];
  const ghosts = list.map((el) => {
    const host = el.offsetParent || el.parentElement;
    const r = el.getBoundingClientRect(), h = host.getBoundingClientRect();
    const g = el.cloneNode(true);
    Object.assign(g.style, { position: 'absolute', left: r.left - h.left + 'px', top: r.top - h.top + 'px', width: r.width + 'px', margin: 0, pointerEvents: 'none' });
    return { el, host, g };
  });
  flip(neighbours.filter((n) => !list.includes(n)), () => {
    mutate();
    ghosts.forEach(({ el, host, g }) => { el.hidden = true; host.append(g); });
  }, opts);
  return ghosts.map(({ g }) => {
    const a = play(g, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.96)' }], { response: 0.3, damping: 1 }, { fill: 'forwards' });
    a.finished.then(() => g.remove(), () => g.remove());
    return a;
  });
}

/* ---------- Materials ---------- */
const DPR = Math.min(window.devicePixelRatio || 1, 4);
function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Grain for glass (material B). Not used by default: Omar picked plain glass (A). Allowed only if a screen still shows rings. */
export function installGrain() {
  if (document.documentElement.style.getPropertyValue('--noise')) return;
  const n = 128, c = document.createElement('canvas'), x = c.getContext('2d');
  c.width = c.height = n;
  const img = x.createImageData(n, n), r = rng(7);
  for (let i = 0; i < n * n; i++) {
    const v = Math.round(128 + (r() + r() - 1) * 110);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  document.documentElement.style.setProperty('--noise', `url(${c.toDataURL('image/png')})`);
  document.documentElement.style.setProperty('--grain', n / DPR + 'px');
}

/** Atmosphere's sky: soft colour fields computed in full precision and dithered once (no banding of its own). */
export function paintSky(blobs, base, w = innerWidth, h = innerHeight) {
  const S = 2, cw = Math.round(w * S), ch = Math.round(h * S);
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d'), img = ctx.createImageData(cw, ch), d = img.data;
  const bl = blobs.map((b) => {
    const s = b.s * w, q = 2 * s * s, gx = new Float32Array(cw), gy = new Float32Array(ch);
    for (let x = 0; x < cw; x++) { const X = (x + 0.5) / S - b.x * w; gx[x] = Math.exp(-(X * X) / q); }
    for (let y = 0; y < ch; y++) { const Y = (y + 0.5) / S - b.y * h; gy[y] = Math.exp(-(Y * Y) / q); }
    return { gx, gy, r: b.c[0] * b.a, g: b.c[1] * b.a, b: b.c[2] * b.a };
  });
  const r = rng(11), row = new Float32Array(bl.length);
  let i = 0;
  for (let y = 0; y < ch; y++) {
    for (let j = 0; j < bl.length; j++) row[j] = bl[j].gy[y];
    for (let x = 0; x < cw; x++) {
      let R = base[0], G = base[1], B = base[2];
      for (let j = 0; j < bl.length; j++) { const f = bl[j].gx[x] * row[j], o = bl[j]; R += o.r * f; G += o.g * f; B += o.b * f; }
      d[i] = R + r() + r() - 0.5; d[i + 1] = G + r() + r() - 0.5; d[i + 2] = B + r() + r() - 0.5; d[i + 3] = 255;
      i += 4;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** A living sky behind a variant: slow drift on the compositor, a dusk layer that can fade in. */
export function makeSky() {
  const W = innerWidth, H = innerHeight;
  const wrap = document.createElement('div');
  wrap.className = 'sky';
  const day = paintSky([
    { x: 0.15, y: 0.08, s: 0.36, c: [40, 170, 190], a: 0.8 },
    { x: 0.95, y: 0.28, s: 0.4, c: [110, 80, 255], a: 0.85 },
    { x: 0.1, y: 0.7, s: 0.34, c: [60, 110, 255], a: 0.6 },
    { x: 0.85, y: 0.9, s: 0.32, c: [230, 70, 150], a: 0.55 },
  ], [8, 10, 22], W, H);
  const dusk = paintSky([
    { x: 0.2, y: 0.85, s: 0.45, c: [255, 120, 50], a: 0.85 },
    { x: 0.9, y: 0.6, s: 0.38, c: [220, 60, 110], a: 0.75 },
    { x: 0.5, y: 0.15, s: 0.4, c: [70, 40, 140], a: 0.6 },
  ], [14, 8, 20], W, H);
  day.className = 'sky-art';
  dusk.className = 'sky-art sky-dusk';
  wrap.append(day, dusk);
  const drift = [
    { transform: 'translate3d(0, 0, 0) scale(1)' },
    { transform: `translate3d(${-0.05 * W}px, ${0.03 * H}px, 0) scale(1.14)` },
    { transform: `translate3d(${0.03 * W}px, ${-0.02 * H}px, 0) scale(1.08)` },
  ];
  const opts = { duration: 18000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' };
  const anims = RM.matches ? [] : [day.animate(drift, opts), dusk.animate(drift, opts)];
  // Pause the drift when the page is hidden (off-screen animation is paused).
  const vis = () => anims.forEach((a) => (document.hidden ? a.pause() : a.play()));
  document.addEventListener('visibilitychange', vis);
  return {
    el: wrap,
    dusk(on) {
      // From wherever the fade is now, so Undo mid-fade never jumps. A slow spring: the light changes, nothing moves.
      const now = getComputedStyle(dusk).opacity;
      dusk.getAnimations().filter((a) => a.id === 'dusk').forEach((a) => a.cancel());
      dusk.style.opacity = on ? '1' : '0';
      const a = play(dusk, [{ opacity: now }, { opacity: on ? 1 : 0 }], { response: 1.1, damping: 1 });
      a.id = 'dusk';
    },
    destroy() { document.removeEventListener('visibilitychange', vis); anims.forEach((a) => a.cancel()); },
  };
}

/* ---------- The bench chart: an explorable explanation built only from the log ---------- */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const fmtDate = (iso) => { const d = new Date(iso + 'T12:00'); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const e1rm = (w, r) => w * (1 + r / 30); // Epley: an estimate, always labelled as one

/**
 * Build the chart: one trusted component the Coach can choose (A2UI idea: the agent picks components, never writes UI).
 * It is also an explorable explanation (worrydream.com/ExplorableExplanations): the "Try a next top set" steppers are an
 * assumption you can change, and the hollow dot shows where it would land. All maths is Epley, labelled as an estimate.
 * data = { sessions: [{date, w, r, kcal, sleep, sets}], cutFrom }.
 * The line is the estimated 1RM (labelled), dots are real top sets. Drag across to read any session.
 * Overlays (food, sleep) fade in on the compositor.
 */
export function benchChart(data, { theme = 'light' } = {}) {
  const S = data.sessions, n = S.length;
  const W = 320, H = 150, padL = 8, padR = 16, top = 16, bottom = 22;
  const est = S.map((s) => e1rm(s.w, s.r));
  const best = Math.max(...est);
  const lo = Math.floor(Math.min(...est) - 2), hi = Math.max(Math.ceil(best + 2), 106);
  const X = (i) => padL + (i * (W - padL - padR)) / n; // slot n is the "next session" you can try
  const Y = (v) => top + (1 - (v - lo) / (hi - lo)) * (H - top - bottom);
  const cutI = S.findIndex((s) => s.date >= data.cutFrom);
  const line = est.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const series = (key, min, max) => S.map((s, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${(top + (1 - (s[key] - min) / (max - min)) * (H - top - bottom)).toFixed(1)}`).join('');
  const kc = S.map((s) => s.kcal), sl = S.map((s) => s.sleep);
  const foodPath = series('kcal', Math.min(...kc) - 150, Math.max(...kc) + 150);
  const sleepPath = series('sleep', Math.min(...sl) - 0.4, Math.max(...sl) + 0.4);

  const root = document.createElement('figure');
  root.className = `chart chart-${theme}`;
  root.innerHTML = `
    <div class="chart-read" aria-live="polite"><b></b><span></span></div>
    <div class="chart-plot">
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="Bench press, estimated one-rep max per session">
        <rect class="cut-zone" x="${X(cutI) - 6}" y="0" width="${W - X(cutI) + 6}" height="${H - bottom + 4}" rx="8"></rect>
        <path class="ov ov-food" d="${foodPath}"></path>
        <path class="ov ov-sleep" d="${sleepPath}"></path>
        <path class="est" d="${line}"></path>
        ${S.map((s, i) => `<circle class="dot" cx="${X(i)}" cy="${Y(est[i])}" r="3.2"></circle>`).join('')}
      </svg>
      <div class="cut-label" style="left:${(X(cutI) / W) * 100}%">cut starts</div>
      <div class="cursor"><i></i></div>
      <div class="proj" aria-hidden="true"><i></i><span>next?</span></div>
    </div>
    <div class="chart-axis"><span>${fmtDate(S[0].date).slice(4)}</span><span>${fmtDate(S[n - 1].date).slice(4)}</span></div>
    <div class="chart-keys">
      <span class="key legend">Est. 1RM</span>
      <button type="button" class="key" data-k="food">Food</button>
      <button type="button" class="key" data-k="sleep">Sleep</button>
    </div>
    <div class="whatif">
      <div class="wi-title">Try a next top set</div>
      <div class="wi-row">
        <div class="step"><button type="button" data-d="w-" aria-label="Less weight">−</button><b class="wi-w"></b><button type="button" data-d="w+" aria-label="More weight">+</button></div>
        <span class="wi-x">×</span>
        <div class="step"><button type="button" data-d="r-" aria-label="Fewer reps">−</button><b class="wi-r"></b><button type="button" data-d="r+" aria-label="More reps">+</button></div>
      </div>
      <div class="wi-out" aria-live="polite"><b></b><span></span></div>
    </div>`;
  const plot = root.querySelector('.chart-plot'), cursor = root.querySelector('.cursor');
  const readB = root.querySelector('.chart-read b'), readS = root.querySelector('.chart-read span');
  const dots = root.querySelectorAll('.dot');
  let cur = -1;
  const show = (i) => {
    if (i === cur) return;
    cur = i;
    const s = S[i];
    readB.textContent = `${fmtDate(s.date)} · ${s.w} × ${s.r}`;
    readS.textContent = `est. 1RM ${est[i].toFixed(0)} kg · ${s.kcal.toLocaleString('en-GB')} kcal/day · sleep ${s.sleep.toFixed(1)} h`;
    dots.forEach((d, j) => d.classList.toggle('hot', j === i));
    cursor.style.transform = `translate3d(${(X(i) / W) * plot.clientWidth}px, 0, 0)`;
  };
  // Direct tracking: the cursor follows the finger (horizontal drags), vertical drags still scroll.
  const pick = (e) => {
    const r = plot.getBoundingClientRect();
    const fx = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * W;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(X(i) - fx) < Math.abs(X(best) - fx)) best = i;
    show(best);
  };
  plot.addEventListener('pointerdown', (e) => { plot.setPointerCapture(e.pointerId); root.classList.add('scrubbing'); pick(e); });
  plot.addEventListener('pointermove', (e) => { if (plot.hasPointerCapture(e.pointerId)) pick(e); });
  const end = (e) => { if (plot.hasPointerCapture(e.pointerId)) plot.releasePointerCapture(e.pointerId); root.classList.remove('scrubbing'); };
  plot.addEventListener('pointerup', end);
  plot.addEventListener('pointercancel', end);
  root.querySelectorAll('button.key').forEach((b) => b.addEventListener('click', () => {
    b.classList.toggle('on');
    const on = b.classList.contains('on');
    playFromHere(root.querySelector(`.ov-${b.dataset.k}`), 'opacity', on ? '1' : '0');
  }));

  /* The assumption you can change: a next top set. The hollow dot moves there with a spring (transform only). */
  const proj = root.querySelector('.proj'), wiW = root.querySelector('.wi-w'), wiR = root.querySelector('.wi-r');
  const outB = root.querySelector('.wi-out b'), outS = root.querySelector('.wi-out span');
  const last = S[n - 1];
  let tw = last.w, tr = 8, at = null;
  const place = (animate) => {
    const v = e1rm(tw, tr);
    const px = (X(n) / W) * plot.clientWidth, py = Math.min(Math.max(Y(v), top - 6), H - bottom) / H * plot.clientHeight;
    const to = `translate3d(${px}px, ${py}px, 0)`;
    if (animate && at) play(proj, [{ transform: at }, { transform: to }], SPRING);
    proj.style.transform = to;
    at = to;
    wiW.textContent = `${tw} kg`;
    wiR.textContent = tr;
    const d = v - best;
    outB.textContent = `est. 1RM ${v.toFixed(0)} kg`;
    outS.textContent = Math.abs(d) < 0.5 ? 'matches your best so far' : `${Math.abs(d).toFixed(0)} kg ${d > 0 ? 'above' : 'below'} your best so far (${best.toFixed(0)})`;
  };
  root.querySelector('.whatif').addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]');
    if (!b) return;
    const k = b.dataset.d;
    if (k === 'w-') tw = Math.max(70, tw - 2.5);
    if (k === 'w+') tw = Math.min(90, tw + 2.5);
    if (k === 'r-') tr = Math.max(3, tr - 1);
    if (k === 'r+') tr = Math.min(12, tr + 1);
    place(true);
  });
  requestAnimationFrame(() => { show(n - 1); place(false); });
  return root;
}
