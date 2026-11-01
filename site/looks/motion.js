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
  constructor(el, prop, fmt, initial) {
    Object.assign(this, { el, prop, fmt, value: initial, anim: null });
    el.style[prop] = fmt(initial);
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
    if (Math.abs(d) < 1e-4 && Math.abs(vel) < 1e-3) return null;
    if (RM.matches) return null;
    this.spec = spec;
    this.v0n = Math.abs(d) < 1e-4 ? 0 : vel / d;
    const c = curve(spec, this.v0n);
    this.v0n = Math.max(-40, Math.min(40, this.v0n));
    const a = this.el.animate([{ [this.prop]: this.fmt(cur.x) }, { [this.prop]: this.fmt(target) }], { duration: c.duration, easing: c.easing });
    this.anim = a;
    a.finished.then(() => { if (this.anim === a) this.anim = null; }, () => {});
    return a;
  }
  /** Jump with no motion (direct tracking under a finger). */
  set(x) {
    this.anim?.cancel();
    this.anim = null;
    this.value = x;
    this.el.style[this.prop] = this.fmt(x);
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

/** FLIP: measure, change the layout, then slide each element from where it was. Cancels older flips mid-flight. */
export function flip(els, mutate, spec = SPRINGS.set) {
  const list = [...els].filter(Boolean);
  const before = new Map(list.map((e) => [e, e.getBoundingClientRect()]));
  for (const e of list) for (const a of e.getAnimations()) if (a.id === 'flip') a.cancel();
  mutate();
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

/** Roll a text from its old value to a new one: old slides up and out, new rises in (Type spring). */
export function roll(el, text, { dir = 1 } = {}) {
  if (el.dataset.text === String(text)) return;
  const old = el.dataset.text ?? el.textContent;
  el.dataset.text = String(text);
  if (RM.matches || old === '') { el.textContent = text; return; }
  el.classList.add('roll');
  el.innerHTML = `<span class="roll-old" aria-hidden="true"></span><span class="roll-new"></span>`;
  const o = el.firstChild, n = el.lastChild;
  o.textContent = old; n.textContent = text;
  const h = Math.max(el.getBoundingClientRect().height, 12) * 0.7 * dir;
  play(n, [{ opacity: 0, transform: `translateY(${h}px)` }, { opacity: 1, transform: 'none' }], SPRINGS.type);
  const out = o.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${-h}px)` }], { duration: 180, easing: 'cubic-bezier(.3,0,.8,.2)', fill: 'forwards' });
  out.finished.then(() => { if (o.isConnected) o.remove(); }, () => {});
}

/**
 * Fold elements out of the flow: each fades where it stands (a ghost copy) while the neighbours close the gap (FLIP).
 * Unfold is the same in reverse: the element comes back, neighbours slide down, it fades in where it lands.
 */
export function fold(els, neighbours, hide, spec = SPRINGS.set) {
  const list = els.filter(Boolean);
  if (hide) {
    const ghosts = list.map((el) => {
      const host = el.offsetParent || el.parentElement, r = el.getBoundingClientRect(), h = host.getBoundingClientRect();
      const g = el.cloneNode(true);
      g.removeAttribute('id');
      g.setAttribute('aria-hidden', 'true');
      Object.assign(g.style, { position: 'absolute', left: r.left - h.left + host.scrollLeft + 'px', top: r.top - h.top + host.scrollTop + 'px', width: r.width + 'px', margin: 0, pointerEvents: 'none' });
      return { el, host, g };
    });
    flip(neighbours, () => ghosts.forEach(({ el, host, g }) => { el.hidden = true; host.append(g); }), spec);
    ghosts.forEach(({ g }) => {
      const a = g.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.97)' }], { duration: RM.matches ? 120 : 220, easing: 'cubic-bezier(.3,0,.6,1)', fill: 'forwards' });
      a.finished.then(() => g.remove(), () => g.remove());
    });
  } else {
    flip(neighbours, () => list.forEach((el) => { el.hidden = false; }), spec);
    list.forEach((el) => play(el, [{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'none' }], spec));
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
