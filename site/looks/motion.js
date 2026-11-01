/* Aven 2 looks: shared motion.
   Everything that moves runs in the browser (Web Animations with spring curves sampled into linear()), never a
   per-frame script loop (TASTE §4). The one exception is direct tracking: a dragged sheet follows the finger, and on
   release a spring takes over with the finger's speed.
   Interruption keeps position AND speed: a Channel knows its running spring, so a new target starts from where the
   thing is and how fast it is moving (fixes the zero-speed restart in site/concepts/kit.js playFromHere). */

/** One spring table (damping ratio / response in seconds), from the Ink spec. */
export const SPRINGS = {
  set: { damping: 1.0, response: 0.36 }, // arrivals, pages, folds, reversals
  type: { damping: 0.9, response: 0.26 }, // rolling digits, figures moving into rows, strikes
  lift: { damping: 0.8, response: 0.42 }, // sheets and anything let go after a drag
  press: { damping: 0.68, response: 0.55 }, // only records and finishing
};
/** The one exit: things that leave (a ghost copy, a block making way) fade on this, short and fixed, no spring. */
export const EXIT = { duration: 120, easing: 'cubic-bezier(.3, 0, .6, 1)' };
/** OUT: the quick way out for a whole screen being covered by another (gone before the other's glass passes over). */
export const OUT = { damping: 1, response: 0.2 };
/** Light (Heat only): a light goes out fast, the next comes up slowly. Light changes; nothing moves. */
export const LIGHT = { out: OUT, in: { damping: 1, response: 0.8 } };
/** The one colour change (ink drying, waiting set darkening): CSS var --fade holds the same 280 ms curve. */

const RM = matchMedia('(prefers-reduced-motion: reduce)');
export const reduced = () => RM.matches;

/** Position and speed of a 0→1 spring at time t (s), starting with speed v0 (in distances per second). */
function stepper({ damping, response }) {
  const k = (2 * Math.PI / response) ** 2, c = (4 * Math.PI * damping) / response;
  return (s, dt) => { s.v += (-k * (s.x - 1) - c * s.v) * dt; s.x += s.v * dt; };
}
export function springAt(spec, v0, t) {
  const step = stepper(spec), dt = 1 / 480, s = { x: 0, v: v0 };
  for (let u = 0; u < t; u += dt) step(s, dt);
  return s;
}

const cache = new Map();
/** The spring as a CSS linear() easing plus its duration. */
export function curve(spec, v0 = 0) {
  v0 = Math.max(-40, Math.min(40, v0));
  const key = `${spec.damping}|${spec.response}|${v0.toFixed(2)}`;
  if (cache.has(key)) return cache.get(key);
  const step = stepper(spec), dt = 1 / 480, s = { x: 0, v: v0 }, pts = [0];
  let t = 0, next = 1 / 120;
  while (t < 4) {
    step(s, dt); t += dt;
    if (t >= next) { pts.push(s.x); next += 1 / 120; if (Math.abs(s.x - 1) < 0.001 && Math.abs(s.v) < 0.015) break; }
  }
  pts[pts.length - 1] = 1;
  const out = { easing: `linear(${pts.map((p) => +p.toFixed(4)).join(',')})`, duration: Math.round(pts.length * (1000 / 120)) };
  cache.set(key, out);
  return out;
}

/**
 * One animated number on one element (translate, scale, opacity…), driven by springs on the compositor.
 * fmt turns the number into the CSS value. to() hands the current position and speed to the new spring.
 */
export class Channel {
  constructor(el, prop, fmt, initial, { hideAt = null } = {}) {
    Object.assign(this, { el, prop, fmt, value: initial, anim: null, hideAt });
    el.style[prop] = fmt(initial);
    this.vis();
  }
  /** With hideAt, an element resting at that value (faded out, or moved off screen) is also made invisible, so it
   *  costs nothing to draw (no glass blurred under the other screen). */
  vis(done = true) {
    if (this.hideAt == null) return;
    this.el.style.visibility = this.value === this.hideAt && done ? 'hidden' : '';
  }
  /** Where it is and how fast it moves right now (units per second). */
  now() {
    const a = this.anim;
    if (!a || a.playState !== 'running') return { x: this.value, v: 0 };
    const t = (a.currentTime || 0) / 1000;
    const s = springAt(this.spec, this.v0n, t), d = this.value - this.from;
    return { x: this.from + d * s.x, v: d * s.v };
  }
  to(target, spec = SPRINGS.set, { v } = {}) {
    const cur = this.now();
    const vel = v ?? cur.v;
    this.anim?.cancel();
    this.anim = null;
    this.from = cur.x;
    this.value = target;
    this.el.style[this.prop] = this.fmt(target);
    const d = target - cur.x;
    if ((Math.abs(d) < 1e-4 && Math.abs(vel) < 1e-3) || RM.matches) { this.vis(); return null; }
    this.vis(false);
    this.spec = spec;
    this.v0n = Math.abs(d) < 1e-4 ? 0 : vel / d;
    const c = curve(spec, this.v0n);
    this.v0n = Math.max(-40, Math.min(40, this.v0n));
    const a = this.el.animate([{ [this.prop]: this.fmt(cur.x) }, { [this.prop]: this.fmt(target) }], { duration: c.duration, easing: c.easing });
    this.anim = a;
    a.finished.then(() => { if (this.anim === a) { this.anim = null; this.vis(); } }, () => {});
    return a;
  }
  /** Jump with no motion (direct tracking under a finger). */
  set(x) {
    this.anim?.cancel();
    this.anim = null;
    this.value = x;
    this.el.style[this.prop] = this.fmt(x);
    this.vis();
  }
}

/** Play keyframes with a spring. The element's resting style must already be its final state. */
export function play(el, frames, spec = SPRINGS.set, extra = {}) {
  if (RM.matches) {
    const has = frames.some((f) => 'opacity' in f);
    return el.animate(has ? frames.map((f) => ('opacity' in f ? { opacity: f.opacity } : {})) : [{}, {}], { duration: has ? 140 : 0, easing: 'ease-out', fill: 'backwards', ...extra });
  }
  const c = curve(spec);
  return el.animate(frames, { duration: c.duration, easing: c.easing, fill: 'backwards', ...extra });
}

/** A short fixed fade (for colour changes done as a cross-fade of two layers). */
export function fade(el, from, to, ms = 240, extra = {}) {
  el.style.opacity = to;
  return el.animate([{ opacity: from }, { opacity: to }], { duration: RM.matches ? 120 : ms, easing: 'cubic-bezier(.2,.8,.2,1)', ...extra });
}

/**
 * FLIP: measure, change the layout, then slide each element from where it was. Cancels older flips mid-flight.
 * boxes: panes whose glass is drawn by ::before. When a pane's height changes, its glass edge moves on the same
 * spring instead of snapping (only the pseudo-element's own box changes, nothing else re-flows).
 */
export function flip(els, mutate, spec = SPRINGS.set, boxes = []) {
  const list = [...els].filter(Boolean);
  const bx = [...boxes].filter(Boolean);
  const before = new Map(list.map((e) => [e, e.getBoundingClientRect()]));
  const hb = new Map(bx.map((e) => [e, e.getBoundingClientRect().height]));
  for (const e of list) for (const a of e.getAnimations()) if (a.id === 'flip') a.cancel();
  mutate();
  for (const e of bx) {
    const dh = e.getBoundingClientRect().height - hb.get(e);
    if (Math.abs(dh) < 0.5 || RM.matches) continue;
    const c = curve(spec);
    e.animate([{ bottom: `${dh}px` }, { bottom: '0px' }], { duration: c.duration, easing: c.easing, pseudoElement: '::before' });
  }
  const out = [];
  for (const e of list) {
    if (!e.isConnected) continue;
    const a = before.get(e), b = e.getBoundingClientRect();
    const dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
    const an = play(e, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], spec);
    an.id = 'flip';
    out.push(an);
  }
  return out;
}

/** Move an element visually from rect `from` to where it sits now, scaling only down when it shrinks (stays sharp). */
export function travel(el, from, spec = SPRINGS.type, extra = {}) {
  const to = el.getBoundingClientRect();
  if (!from || !to.width) return null;
  const s = from.width / to.width;
  const dx = from.left - to.left, dy = from.top - to.top;
  return play(el, [
    { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${s})` },
    { transformOrigin: '0 0', transform: 'none' },
  ], spec, extra);
}

/**
 * Roll a text from its old value to a new one: old slides up and out, new rises in (Type spring).
 * The box takes the new text's width at once (the old text is laid over it, not beside it), and `move` (things after
 * it on the same line) slide to their new places on the same spring instead of jumping.
 */
export function roll(el, text, { dir = 1, move = [] } = {}) {
  if (el.dataset.text === String(text)) return;
  const old = el.dataset.text ?? el.textContent;
  el.dataset.text = String(text);
  if (RM.matches || old === '') { el.textContent = text; return; }
  let o, n;
  flip(move, () => {
    el.classList.add('roll');
    el.innerHTML = `<span class="roll-old" aria-hidden="true"></span><span class="roll-new"></span>`;
    o = el.firstChild; n = el.lastChild;
    o.textContent = old; n.textContent = text;
  }, SPRINGS.type);
  const h = Math.max(el.getBoundingClientRect().height, 12) * 0.7 * dir;
  play(n, [{ opacity: 0, transform: `translateY(${h}px)` }, { opacity: 1, transform: 'none' }], SPRINGS.type);
  const out = play(o, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${-h}px)` }], SPRINGS.type, { fill: 'forwards' });
  out.finished.then(() => { if (o.isConnected) o.remove(); }, () => {});
}

/**
 * Fold elements out of the flow: each fades where it stands (a ghost copy) while the neighbours close the gap (FLIP).
 * Unfold is the same in reverse: the element comes back, neighbours slide down, it fades in where it lands.
 */
export function fold(els, neighbours, hide, spec = SPRINGS.set, boxes = []) {
  const list = els.filter(Boolean);
  if (hide) {
    const ghosts = list.map((el) => ghost(el));
    flip(neighbours, () => ghosts.forEach(({ el, host, g }) => { el.hidden = true; host.append(g); }), spec, boxes);
    ghosts.forEach(({ g }) => fadeGhost(g));
  } else {
    flip(neighbours, () => list.forEach((el) => { el.hidden = false; }), spec, boxes);
    // They fade in once the neighbours have mostly made room, so nothing slides over them.
    list.forEach((el) => play(el, [{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'none' }], spec, { delay: RM.matches ? 0 : 140 }));
  }
}

/** A copy of el, absolutely placed where el is, inside el's own parent (so it keeps its styling). Not yet added. */
export function ghost(el, keep = []) {
  const host = el.parentElement;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const r = el.getBoundingClientRect(), h = host.getBoundingClientRect(), cs = getComputedStyle(host);
  const g = el.cloneNode(true);
  g.removeAttribute('id');
  g.removeAttribute('data-act');
  g.setAttribute('aria-hidden', 'true');
  g.classList.add('ghost');
  const own = getComputedStyle(el);
  keep.forEach((k) => { g.style.setProperty(k, own.getPropertyValue(k)); }); // freeze looks the state change would alter
  Object.assign(g.style, { position: 'absolute', left: r.left - h.left - parseFloat(cs.borderLeftWidth) + host.scrollLeft + 'px', top: r.top - h.top - parseFloat(cs.borderTopWidth) + host.scrollTop + 'px', width: r.width + 'px', height: r.height + 'px', margin: 0, pointerEvents: 'none', boxSizing: 'border-box' });
  return { el, host, g };
}
export function fadeGhost(g, frames = [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.97)' }]) {
  const a = g.animate(frames, { ...EXIT, fill: 'forwards' });
  a.finished.then(() => g.remove(), () => g.remove());
  return a;
}
/**
 * Swap two things that share one slot (Apply/Keep buttons and the Undo line, two faces of a card): the old one fades
 * where it stands as a copy, the new one rises at once. Never a blank slot, never both readable for long.
 */
export function swap(out, inn, spec = SPRINGS.set) {
  if (out && !out.hidden) {
    const { host, g } = ghost(out);
    host.append(g);
    out.hidden = true;
    fadeGhost(g, [{ opacity: 1 }, { opacity: 0 }]);
  }
  if (inn) {
    inn.hidden = false;
    play(inn, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], spec, { delay: RM.matches ? 0 : 80 });
  }
}

/** Pressed state on the very next frame: no transition in, a spring out. */
export function pressable(el, { scale = 0.97 } = {}) {
  const down = (e) => {
    if (e.button > 0) return;
    el.getAnimations().filter((a) => a.id === 'press').forEach((a) => a.cancel());
    el.classList.add('down');
    el.style.scale = String(scale);
  };
  const up = () => {
    if (!el.classList.contains('down')) return;
    el.classList.remove('down');
    el.style.scale = '';
    const a = play(el, [{ scale: String(scale) }, { scale: '1' }], SPRINGS.type);
    a.id = 'press';
  };
  el.addEventListener('pointerdown', down);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => el.addEventListener(t, up));
}

/** A timer that also stops when the variant unmounts. */
export function timers() {
  const ids = new Set();
  return {
    after(ms, fn) { const id = setTimeout(() => { ids.delete(id); fn(); }, ms); ids.add(id); return id; },
    every(ms, fn) { const id = setInterval(fn, ms); ids.add(id); return id; },
    clear(id) { clearTimeout(id); clearInterval(id); ids.delete(id); },
    stop() { ids.forEach((id) => { clearTimeout(id); clearInterval(id); }); ids.clear(); },
  };
}
