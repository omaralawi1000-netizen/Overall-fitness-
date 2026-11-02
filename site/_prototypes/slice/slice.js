/* Aven 2 · workout slice (2 Nov 2026). One exercise, built in Omar's motion language:
   one tap ticks a set; the done set becomes a slim row while the next set rises into the lit card; numbers roll
   digit by digit; rest is a ring whose colour follows the time left; a new record flips a medal in, once.
   Everything that moves is transform or opacity on the compositor (Web Animations with springs sampled into
   linear()). The only timers are the once-a-second clocks. No storage: this address is shared with old Aven. */

import { SPRINGS, curve, reduced } from '../../round/motion.js';
import { paintField } from '../../round/bg.js';

const REST = 60; // seconds
const $ = (s, el = document) => el.querySelector(s);
const ms = (s) => s * 1000;
const fmtW = (w) => (w % 1 ? w.toFixed(1) : String(w));
const fmtT = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const e1 = (w, r) => w * (1 + r / 30);
const buzz = (p) => navigator.vibrate?.(p);
const SOFT = { damping: 0.86, response: 0.62 }; // the medal's arrival: one quiet settle

/** Animate with one of the shared springs. Reduced motion: a short plain fade-through instead. */
function spring(el, frames, spec = SPRINGS.set, opts = {}) {
  if (reduced()) return el.animate(frames, { duration: 140, easing: 'ease-out', ...opts });
  const c = curve(spec);
  return el.animate(frames, { duration: c.duration, easing: c.easing, ...opts });
}
const fadeTo = (el, from, to, dur = 200, opts = {}) => {
  el.style.opacity = to;
  return el.animate([{ opacity: from }, { opacity: to }], { duration: reduced() ? 100 : dur, easing: 'cubic-bezier(.2,.8,.2,1)', ...opts });
};
const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/* ---------- Rolling numbers: only the characters that change move ---------- */
class Roll {
  constructor(el, text = '', flat = false) { this.el = el; this.flat = flat; this.render(text); }
  render(text) {
    this.el.textContent = '';
    for (const ch of text) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; this.el.append(s); }
    this.text = text;
  }
  static anchor(t) { const i = t.search(/[.:]/); return i < 0 ? t.length : i; }
  /** dir 1: the value went up (new digits come from below); -1: down. */
  set(text, dir = 1) {
    if (text === this.text) return;
    const el = this.el;
    if (reduced() || !el.isConnected) { this.render(text); return; }
    const o = el.getBoundingClientRect();
    // Read where each character is right now (mid-roll too), so an interrupted roll hands over without a jump.
    const old = [...el.querySelectorAll(':scope > .ch')].map((c) => { const cs = getComputedStyle(c); return { t: c.textContent, x: c.offsetLeft, tf: cs.transform, op: +cs.opacity }; });
    for (const a of el.getAnimations({ subtree: true })) a.cancel();
    el.querySelectorAll(':scope > .gh').forEach((g) => g.remove());
    const aOld = Roll.anchor(this.text), aNew = Roll.anchor(text);
    this.render(text);
    const n = el.getBoundingClientRect(), chars = [...el.children];
    const h = n.height * (this.flat ? 0.4 : 0.62); // the rest clock ticks every second: a short, unstretched roll
    const used = new Set();
    let dx = null;
    chars.forEach((c, j) => {
      const i = j - aNew + aOld, prev = old[i];
      if (prev) used.add(i);
      if (prev && dx === null) dx = o.left + prev.x - c.getBoundingClientRect().left;
      if (prev && prev.t === c.textContent) return;
      if (prev) this.ghost(prev, -dir * h);
      // Push's roll (only this digit moves, stretched as it travels) + Family's landing (a tiny settle in scale).
      spring(c, [{ transform: `translateY(${dir * h}px)${this.flat ? '' : ' scale(.86, 1.12)'}`, opacity: 0 }, { transform: 'none', opacity: 1 }], { damping: 0.78, response: 0.3 });
    });
    old.forEach((p, i) => { if (!used.has(i)) this.ghost(p, -dir * h * 0.5); });
    if (dx === null) dx = o.left - n.left;
    if (Math.abs(dx) > 0.5) spring(el, [{ transform: `translateX(${dx}px)` }, { transform: 'none' }], SPRINGS.type);
  }
  ghost(p, toY) {
    const g = document.createElement('span');
    g.className = 'gh'; g.textContent = p.t; g.style.left = p.x + 'px';
    this.el.append(g);
    spring(g, [{ transform: p.tf || 'none', opacity: p.op ?? 1 }, { transform: `translateY(${toY}px)`, opacity: 0 }], SPRINGS.type).finished.then(() => g.remove(), () => {});
  }
}

/* ---------- Elements ---------- */
const card = $('.card'), vals = $('.vals'), doneZone = $('.done-zone'), nextZone = $('.next-zone');
const tick = $('.tick'), pearl = $('.pearl'), cHot = $('.c-hot'), cDark = $('.c-dark'), restFace = $('.rest-face');
const full = $('.full'), warm = $('.arc.warm'), cool = $('.arc.cool'), hint = $('.hint'), skipBtn = $('.skip');
const ringset = $('.ringset'), ribbons = $('.ribbons'), ribbonsIn = $('.ribbons-in');
const sparks = [...document.querySelectorAll('.sparks i')];
const segs = [...document.querySelectorAll('.arc .half')].map((h) => ({ el: h.firstElementChild, right: h.classList.contains('r') }));
const lastEl = $('.last'), bestEl = $('.best'), summary = $('.summary');
const rW = new Roll($('.big.w')), rR = new Roll($('.big.r')), rSet = new Roll($('.set-no')), rCount = new Roll($('.count'), fmtT(REST), true);

/* ---------- The room ---------- */
/* ---------- The two looks (prototype switch) ---------- */
const LOOKS = {
  a: { room: null, reward: [215, 228, 255], cool: '#4fd1a5', go: '#c6ff3d', theme: '#050607' },
  b: { room: { blobs: [{ x: 0.95, y: 0.02, sx: 0.8, sy: 0.6, c: [176, 198, 255], a: 0.55 }, { x: 0.05, y: 0.95, sx: 0.7, sy: 0.5, c: [255, 255, 255], a: 0.7 }], base: [237, 240, 245] },
       reward: [150, 175, 255], cool: '#5aa9f2', go: '#2d58ff', theme: '#edf0f5' },
};
let ribbonsReady = false;
let look = new URLSearchParams(location.search).get('look') === 'b' ? 'b' : 'a';
function paintRoom() {
  const L = LOOKS[look], host = $('.glow');
  host.replaceChildren(...(L.room ? [paintField(L.room.blobs, L.room.base, { w: innerWidth, h: innerHeight, over: 1, seed: 5 })] : []));
  $('.reward-glow').replaceChildren(paintField([{ x: 0.5, y: 0.5, s: 0.2, c: L.reward, a: 0.4 }], null, { w: 460, h: 460, over: 1, seed: 9 }));
}
function setLook(k) {
  look = k;
  document.documentElement.dataset.look = k;
  document.querySelector('meta[name="theme-color"]').content = LOOKS[k].theme;
  document.querySelectorAll('.look button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.look === k));
  const u = new URL(location.href); u.searchParams.set('look', k); history.replaceState(null, '', u);
  paintRoom();
  if (ribbonsReady) paintRibbons();
}
let wantLook = look;
document.querySelectorAll('.look button').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.look === wantLook) return;
  wantLook = b.dataset.look;
  document.querySelectorAll('.look button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  whenLanded(() => swapScreen(() => { if (wantLook !== look) setLook(wantLook); }));
}));
setLook(look);
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(paintRoom, 200); });
// The rest light (Apple Watch's breathing countdown): three soft ribbons drawn once per look, in the calm colour and
// in the "go" colour. During rest they drift, warm from one colour to the other, and pull together into one line.
const RIBBONS = [{ amp: 0.09, f: 0.9, ph: 0.3, w: 4.2 }, { amp: 0.06, f: 1.35, ph: 2.1, w: 3.2 }, { amp: 0.11, f: 0.7, ph: 4.2, w: 2.6 }];
const RIB_Y = 0.78; // the light sits under the number, never behind it
function paintRibbons() {
  const D = tick.offsetWidth || 140, S = Math.min(window.devicePixelRatio || 1, 2), L = LOOKS[look];
  for (const [k, rib] of document.querySelectorAll('.rib').entries()) {
    for (const cv of rib.querySelectorAll('canvas')) {
      const col = cv.classList.contains('go') ? L.go : L.cool, p = RIBBONS[k];
      cv.width = cv.height = Math.round(D * S); cv.style.width = cv.style.height = D + 'px';
      const ctx = cv.getContext('2d');
      ctx.scale(S, S); ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.shadowColor = col;
      for (const [blur, alpha, wm] of [[14, 0.5, 2.4], [5, 0.95, 1]]) {
        ctx.shadowBlur = blur; ctx.globalAlpha = alpha; ctx.lineWidth = p.w * wm;
        ctx.beginPath();
        for (let x = -4; x <= D + 4; x += 2) {
          const u = x / D, env = Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
          const y = D * RIB_Y + D * p.amp * env * Math.sin(u * Math.PI * 2 * p.f + p.ph);
          x === -4 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }
}
ribbonsReady = true; paintRibbons();

// Medal edge: thin discs between the faces, so it has a body when it turns.
(() => { const m = $('.medal'); for (let z = -3; z <= 3; z++) { const e = document.createElement('div'); e.className = 'edge'; e.style.transform = `translateZ(${z}px)`; m.prepend(e); } })();

/* ---------- State ---------- */
const PLAN = [
  { w: 80, r: 8, last: '80 × 8' },
  { w: 82.5, r: 6, last: '82.5 × 5' },
  { w: 82.5, r: 6, last: '82.5 × 6' },
  { w: 85, r: 6, last: '82.5 × 5' },
];
/** Timers that belong to one run: Start over bumps gen, so nothing from the old run fires into the new one. */
let gen = 0, inFlight = 0, queued = [];
/** Taps made while numbers are still flying wait for them to land, so nothing is dropped and nothing jumps. */
const whenLanded = (fn) => { if (inFlight) queued.push(fn); else fn(); };
const later = (fn, t) => { const g = gen; setTimeout(() => { if (g === gen) fn(); }, t); };
let sets, cur, best, medalShown, medalPending = false, phase, locked, restEnd, restTimer, restAnims = [];

function rowEl(s, i, done) {
  const r = document.createElement('div');
  r.className = 'row ' + (done ? 'done' : 'up');
  r.innerHTML = `<span class="mk">${done ? '<svg viewBox="0 0 32 32"><path d="M8 16.5l5.2 5.2L24 10.5"/></svg>' : ''}</span><span class="rl">Set ${i + 1}</span><span class="rv"><b class="rvw">${fmtW(s.w)}</b><i>kg ×</i><b class="rvr">${s.r}</b></span>`;
  return r;
}
function medalSlot(row) { const m = document.createElement('span'); m.className = 'medal-slot'; row.append(m); return m; }

function init() {
  sets = PLAN.map((s) => ({ ...s }));
  gen++; inFlight = 0; queued = [];
  cur = 1; best = e1(82.5, 6); medalShown = false; phase = 'ready'; locked = false;
  stopRest();
  doneZone.replaceChildren(rowEl(sets[0], 0, true));
  nextZone.replaceChildren(...sets.slice(2).map((s, k) => rowEl(s, k + 2, false)));
  rW.render(fmtW(sets[1].w)); rR.render(String(sets[1].r)); rSet.render('2');
  $('.big.w').style.opacity = ''; $('.big.r').style.opacity = '';
  document.querySelectorAll('.flyer').forEach((f) => f.remove());
  lastEl.textContent = 'last time ' + sets[1].last;
  bestEl.textContent = '82.5 kg × 6';
  for (const el of card.children) { el.getAnimations().forEach((a) => a.cancel()); el.style.opacity = ''; el.style.visibility = ''; }
  summary.hidden = true;
  Object.assign($('.restart').style, { opacity: '', visibility: '' });
  readyLook(false);
}

/* ---------- Rest: a ring that fills, cool to orange as time runs out ---------- */
/** How small the ring is when it hugs the button (ready), as a share of the full rest ring. */
const rim = () => (tick.offsetWidth + 18) / $('.dial').offsetWidth;
function readyLook(animate = true) {
  phase = 'ready';
  const d = animate ? 260 : 0;
  // The ring closes back round the button and turns to "go" (Apple Watch's timer, in reverse).
  const from = getComputedStyle(ringset).transform;
  ringset.getAnimations().forEach((a) => a.cancel());
  ringset.style.transform = `scale(${rim()})`;
  if (animate) spring(ringset, [{ transform: from === 'none' ? 'none' : from }, { transform: `scale(${rim()})` }], SPRINGS.press);
  fadeTo(full, getComputedStyle(full).opacity, 1, d);
  fadeTo(ribbons, getComputedStyle(ribbons).opacity, 0, d);
  fadeTo(warm, getComputedStyle(warm).opacity, 0, d); fadeTo(cool, getComputedStyle(cool).opacity, 0, d);
  fadeTo(restFace, getComputedStyle(restFace).opacity, 0, d * 0.6);
  pearl.getAnimations().forEach((a) => a.cancel()); pearl.style.opacity = 0; pearl.style.transform = 'scale(0)';
  cDark.style.opacity = 0;
  cHot.style.opacity = 1;
  if (animate) spring(cHot, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.press);
  fadeTo(hint, getComputedStyle(hint).opacity, 1, d);
  hideSkip(animate);
  tick.setAttribute('aria-label', `Set ${cur + 1} done`);
}
function hideSkip(animate) {
  if (skipBtn.style.visibility === 'hidden' || !skipBtn.style.visibility) { skipBtn.style.opacity = 0; skipBtn.style.visibility = 'hidden'; return; }
  fadeTo(skipBtn, 1, 0, animate ? 160 : 0).finished.then(() => { if (phase !== 'rest') skipBtn.style.visibility = 'hidden'; }, () => {});
}

function startRest() {
  phase = 'rest';
  const T = ms(REST);
  restEnd = performance.now() + T;
  rCount.render(fmtT(REST)); lastLeft = REST; skipped = false;
  // The button grows into the rest ring (Apple Watch's timer): the ring swells out from the button to its full size
  // and goes from "go" to the calm colour as it does. Then it empties, second by second.
  const grow = curve(SPRINGS.set).duration;
  const rt = getComputedStyle(ringset).transform, fo = getComputedStyle(full).opacity;
  ringset.getAnimations().forEach((a) => a.cancel());
  ringset.style.transform = 'none';
  spring(ringset, [{ transform: rt === 'none' ? `scale(${rim()})` : rt }, { transform: 'none' }], SPRINGS.set);
  fadeTo(full, fo, 0, grow);
  warm.style.opacity = 1; cool.style.opacity = 1;
  warm.animate([{ opacity: 0 }, { opacity: 1 }], { duration: grow });
  fadeTo(pearl, 1, 0, 260); spring(pearl, [{ transform: 'scale(1)' }, { transform: 'scale(.9)' }], SPRINGS.type, { fill: 'forwards' });
  fadeTo(cDark, 1, 0, 160);
  fadeTo(restFace, 0, 1, 280, { delay: 320, fill: 'backwards' }); // after the next set's numbers have passed
  restAnims = segs.map(({ el, right }) => el.animate(right
    ? [{ transform: 'rotate(225deg)' }, { transform: 'rotate(225deg)', offset: 0.5 }, { transform: 'rotate(45deg)' }]
    : [{ transform: 'rotate(225deg)' }, { transform: 'rotate(45deg)', offset: 0.5 }, { transform: 'rotate(45deg)' }],
  { duration: T, easing: 'linear', fill: 'forwards' }));
  // Colour follows the time left: calm for most of the rest, turning to "go" near the end (Apple's effort colour).
  restAnims.push(cool.animate([{ opacity: 1 }, { opacity: 0.85, offset: 0.5 }, { opacity: 0 }], { duration: T, easing: 'cubic-bezier(.3,0,.6,1)', fill: 'forwards' }));
  // The light inside: ribbons drift, warm up, and pull into one bright line as the rest runs out.
  ribbons.style.opacity = 1;
  restAnims.push(ribbons.animate([{ opacity: 0 }, { opacity: 0.8, offset: 0.04 }, { opacity: 0.8, offset: 0.8 }, { opacity: 1 }], { duration: T, fill: 'forwards' }));
  restAnims.push(ribbonsIn.animate([{ transform: 'none' }, { transform: 'scaleY(.04)' }], { duration: T, easing: 'cubic-bezier(.55,0,.8,.45)', fill: 'forwards' }));
  for (const g of document.querySelectorAll('.rib canvas.go')) restAnims.push(g.animate([{ opacity: 0 }, { opacity: 0.2, offset: 0.5 }, { opacity: 1 }], { duration: T, easing: 'cubic-bezier(.5,0,.75,.6)', fill: 'forwards' }));
  if (!reduced()) document.querySelectorAll('.rib').forEach((r, k) => restAnims.push(r.animate(
    [{ transform: 'translateX(-7px) rotate(-6deg)' }, { transform: 'translateX(7px) rotate(5deg)' }],
    { duration: [3100, 4300, 5300][k], iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' })));
  fadeTo(hint, 1, 0, 140);
  skipBtn.style.visibility = 'visible'; fadeTo(skipBtn, 0, 1, 220, { delay: 120, fill: 'backwards' });
  tick.setAttribute('aria-label', `Resting. Set ${cur + 1} done`);
  clearInterval(restTimer);
  restTimer = setInterval(restTick, 100);
}
let lastLeft = 0, skipped = false;
function restTick() {
  const left = Math.max(0, Math.ceil((restEnd - performance.now()) / 1000));
  rCount.set(fmtT(left), -1);
  // The last five seconds are each their own beat (Push's countdown).
  if (left !== lastLeft && left <= 5 && left > 0 && !reduced() && !skipped) {
    spring($('.count'), [{ transform: 'scale(1.16)' }, { transform: 'none' }], SPRINGS.press);
    buzz(6);
  }
  lastLeft = left;
  if (performance.now() >= restEnd) { endRest(); }
}
/** Stops the clock. The ring's animations are kept (held where they are) until it has faded, so it never snaps empty. */
function stopRest(after = 0) {
  clearInterval(restTimer); restTimer = null;
  const list = restAnims; restAnims = [];
  list.forEach((a) => a.pause());
  if (after) setTimeout(() => list.forEach((a) => a.cancel()), after); else list.forEach((a) => a.cancel());
}
function endRest() {
  stopRest(300);
  buzz(30);
  readyLook(true);
}
skipBtn.addEventListener('click', () => {
  if (phase !== 'rest') return;
  const left = restEnd - performance.now(), quick = 360;
  if (left <= quick) return;
  restAnims.forEach((a) => { if (a.effect.getTiming().iterations !== Infinity) a.updatePlaybackRate(left / quick); });
  restEnd = performance.now() + quick; skipped = true;
});

/* ---------- Ticking a set ---------- */
let pressAnim;
tick.addEventListener('pointerdown', () => {
  if (phase === 'done') return;
  pressAnim?.cancel();
  pressAnim = spring(tick, [{ transform: 'none' }, { transform: 'scale(1.12, 1.05)' }], SPRINGS.type, { fill: 'forwards' });
});
const release = () => {
  if (!pressAnim) return;
  const p = pressAnim; pressAnim = null;
  const now = getComputedStyle(tick).transform;
  p.cancel();
  spring(tick, [{ transform: now === 'none' ? 'scale(1.12, 1.05)' : now }, { transform: 'none' }], SPRINGS.press);
};
tick.addEventListener('pointerup', release);
tick.addEventListener('pointercancel', release);
tick.addEventListener('pointerleave', release);
tick.addEventListener('click', () => { if (inFlight && !queued.length) whenLanded(doTick); else if (!inFlight) doTick(); });

function doTick() {
  if (locked || phase === 'done') return;
  locked = true; later(() => { locked = false; }, 620);
  buzz(12);
  const i = cur, s = sets[i];
  const wasResting = phase === 'rest';
  phase = 'ticking';
  if (wasResting) {
    // Read where everything is first, then let go of the rest animations, so nothing pops.
    const op = (el) => getComputedStyle(el).opacity;
    const o = { rb: op(ribbons), rf: op(restFace), w: op(warm), c: op(cool), f: op(full) }, rt = getComputedStyle(ringset).transform;
    stopRest(0);
    fadeTo(ribbons, o.rb, 0, 200); fadeTo(restFace, o.rf, 0, 90); fadeTo(warm, o.w, 0, 240); fadeTo(cool, o.c, 0, 240); fadeTo(full, o.f, 1, 240);
    // The ring closes round the button again before the next rest grows it back out.
    ringset.getAnimations().forEach((a) => a.cancel());
    ringset.style.transform = `scale(${rim()})`;
    spring(ringset, [{ transform: rt === 'none' ? 'none' : rt }, { transform: `scale(${rim()})` }], SPRINGS.press);
    hideSkip(true);
  }
  else fadeTo(hint, 1, 0, 140);
  // The tick has a body: an orange pearl swells inside the button and settles into a check.
  pearl.getAnimations().forEach((a) => a.cancel());
  pearl.style.transform = 'none'; pearl.style.opacity = 1;
  spring(pearl, [{ transform: `scale(${wasResting ? 0.3 : 0.12})`, opacity: 0.7 }, { transform: 'none', opacity: 1 }], SPRINGS.set);
  // Not Boring's sparks: short marks flick outward round the swelling pearl, then they are gone.
  if (!reduced()) sparks.forEach((sp, k) => {
    sp.getAnimations().forEach((a) => a.cancel());
    const a = k * 30 + (k % 2 ? 9 : -6), d = 60 + (k * 37) % 50;
    sp.animate([
      { transform: `rotate(${a}deg) translateY(-${tick.offsetWidth * 0.3}px) scaleY(.3)`, opacity: 0 },
      { transform: `rotate(${a}deg) translateY(-${tick.offsetWidth * 0.5 + 12}px) scaleY(1)`, opacity: 1, offset: 0.45 },
      { transform: `rotate(${a}deg) translateY(-${tick.offsetWidth * 0.5 + 34}px) scaleY(.5)`, opacity: 0 }],
    { duration: 420, delay: d, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' });
  });
  fadeTo(cHot, getComputedStyle(cHot).opacity, 0, 90);
  cDark.style.opacity = 1;
  spring(cDark, [{ transform: 'scale(.55)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.press, { delay: 70, fill: 'backwards' });
  if (!wasResting) fadeTo(full, 1, 1, 0);

  const isRec = e1(s.w, s.r) > best + 1e-6, oldBest = best;
  s.rec = isRec;
  if (isRec) { best = e1(s.w, s.r); }
  later(() => {
    const row = conveyor(i, isRec);
    if (isRec) {
      bestEl.textContent = `${fmtW(s.w)} kg × ${s.r}`;
      bestEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      if (!medalShown) { medalShown = true; medalPending = true; later(() => { medalPending = false; showMedal(row, s, oldBest, best); }, 380); }
      else { const m = medalSlot(row); spring(m, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.press, { delay: 200, fill: 'backwards' }); }
    }
    if (cur >= sets.length) { phase = 'done'; if (reward.hidden && !(isRec && medalPending)) later(finish, 200); }
  }, 240);
  later(() => { if (phase === 'ticking' && cur < sets.length) startRest(); }, 560);
}

/**
 * One number travels: a copy drawn at the big size flies between the card and a row, scaling on the way. X and Y
 * run on slightly different springs, so it moves on a gentle curve. It never fades; when it lands, the real number
 * takes its place on the same frame.
 */
function fly(text, big, small, toSmall, delay = 0, xSpring = { damping: 1, response: 0.34 }, ySpring = SPRINGS.set) {
  if (reduced()) return Promise.resolve();
  const sOp = +getComputedStyle(small.closest('.row')).opacity * (small.closest('.row.up') ? 0.62 : 1);
  const bs = getComputedStyle(big), br = big.getBoundingClientRect(), sr = small.getBoundingClientRect();
  const k = parseFloat(getComputedStyle(small).fontSize) / parseFloat(bs.fontSize);
  const outer = document.createElement('span'), inner = document.createElement('span');
  outer.className = 'flyer'; inner.textContent = text;
  Object.assign(outer.style, { left: br.left + 'px', top: br.top + 'px', width: br.width + 'px', height: br.height + 'px' });
  Object.assign(inner.style, { fontFamily: bs.fontFamily, fontSize: bs.fontSize, fontWeight: bs.fontWeight, fontStyle: bs.fontStyle, letterSpacing: bs.letterSpacing, color: bs.color, lineHeight: br.height + 'px' });
  outer.append(inner); document.body.append(outer);
  const b = centre(br), s = centre(sr), dx = s.x - b.x, dy = s.y - b.y;
  // A waiting row's numbers are dimmer: the flyer brightens (or dims) on the way, by opacity, never by colour.
  const xs = [{ transform: 'none' }, { transform: `translateX(${dx}px)` }], ys = [{ transform: 'none', opacity: 1 }, { transform: `translateY(${dy}px) scale(${k})`, opacity: sOp }];
  if (!toSmall) { xs.reverse(); ys.reverse(); }
  const o = { delay, fill: 'both' };
  spring(outer, xs, xSpring, o);
  inFlight++;
  const g = gen;
  return spring(inner, ys, ySpring, o).finished.then(() => outer.remove(), () => outer.remove()).then(() => {
    if (g !== gen) return;
    if (--inFlight === 0) { const q = queued; queued = []; q.forEach((f) => f()); }
  });
}

/** The done set's numbers fly into a new row above; the next set's numbers fly up out of their row into the card. */
function conveyor(i, isRec) {
  const s = sets[i];
  const bigW = $('.big.w'), bigR = $('.big.r');
  // Done rows: the new one lands at the bottom, the others make room upward.
  const before = new Map([...doneZone.children].map((r) => [r, r.getBoundingClientRect().top]));
  const row = rowEl(s, i, true);
  const rw = row.querySelector('.rvw'), rr = row.querySelector('.rvr');
  rw.style.opacity = 0; rr.style.opacity = 0;
  doneZone.append(row);
  for (const [r, top] of before) {
    const dy = top - r.getBoundingClientRect().top;
    if (Math.abs(dy) > 0.5) spring(r, [{ transform: `translateY(${dy}px)` }, { transform: 'none' }]);
  }
  for (const el of row.querySelectorAll('.mk, .rl, i')) spring(el, [{ opacity: 0 }, { opacity: 1 }], SPRINGS.set, { delay: 160, fill: 'backwards' });
  const land = (el) => () => { el.style.opacity = ''; };
  fly(fmtW(s.w), bigW, rw, true).then(land(rw));
  fly(String(s.r), bigR, rr, true, 30).then(land(rr));
  bigW.style.opacity = 0; bigR.style.opacity = 0;

  cur = i + 1;
  const n = sets[cur];
  if (!n) return row;
  // The next set: its numbers leave their row and grow into the card; the row's other parts fade, the rows below move up.
  const up = nextZone.firstElementChild;
  const ur = up.getBoundingClientRect();
  const rest = [...nextZone.children].slice(1), rb = new Map(rest.map((r) => [r, r.getBoundingClientRect().top]));
  rW.render(fmtW(n.w)); rR.render(String(n.r));
  const uw = up.querySelector('.rvw'), urr = up.querySelector('.rvr');
  // Sideways first, then up: X settles faster than Y, so the numbers swing round the dial instead of through it.
  const IN_X = { damping: 1, response: 0.26 }, IN_Y = { damping: 1, response: 0.46 };
  const pw = fly(fmtW(n.w), bigW, uw, false, 20, IN_X, IN_Y), pr = fly(String(n.r), bigR, urr, false, 50, IN_X, IN_Y);
  // The numbers pass over the steppers on the way in: they step back while it happens.
  const steps = $('.steps');
  if (!reduced()) { fadeTo(steps, getComputedStyle(steps).opacity, 0, 120); Promise.all([pw, pr]).then(() => { if (sets[cur] === n) fadeTo(steps, getComputedStyle(steps).opacity, 1, 220); }); }
  uw.style.opacity = 0; urr.style.opacity = 0;
  Object.assign(up.style, { position: 'fixed', left: ur.left + 'px', top: ur.top + 'px', width: ur.width + 'px', margin: 0, pointerEvents: 'none' });
  document.body.append(up);
  spring(up, [{ opacity: 1 }, { opacity: 0 }], SPRINGS.type, { fill: 'forwards' }).finished.then(() => up.remove(), () => up.remove());
  for (const [r, top] of rb) {
    const dy = top - r.getBoundingClientRect().top;
    if (Math.abs(dy) > 0.5) spring(r, [{ transform: `translateY(${dy}px)` }, { transform: 'none' }], SPRINGS.set, { delay: 140, fill: 'backwards' });
  }
  pw.then(() => { if (sets[cur] === n) bigW.style.opacity = ''; });
  pr.then(() => { if (sets[cur] === n) bigR.style.opacity = ''; });
  rSet.set(String(cur + 1), 1);
  lastEl.textContent = 'last time ' + n.last;
  lastEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: reduced() ? 0 : 560, fill: 'backwards' });
  return row;
}

/* ---------- Steppers: only the changed digit rolls ---------- */
document.querySelectorAll('.step').forEach((b) => b.addEventListener('click', () => whenLanded(() => {
  if (phase === 'done' || cur >= sets.length) return;
  const s = sets[cur], k = b.dataset.k, d = +b.dataset.d;
  const v = k === 'w' ? Math.max(0, Math.min(500, s.w + d)) : Math.max(1, Math.min(50, s.r + d));
  if (v === s[k]) return;
  s[k] = v;
  (k === 'w' ? rW : rR).set(k === 'w' ? fmtW(v) : String(v), Math.sign(d));
  buzz(6);
})));

/* ---------- The exercise is done: the card turns into its summary ---------- */
function finish() {
  phase = 'done';
  stopRest();
  const parts = [...card.children].filter((el) => !el.classList.contains('summary') && el !== summary);
  for (const el of parts) fadeTo(el, getComputedStyle(el).opacity, 0, 200).finished.then(() => { if (phase === 'done') el.style.visibility = 'hidden'; }, () => {});
  const kg = sets.reduce((a, s) => a + s.w * s.r, 0);
  // Calm hero: one big number, the four sets under it, the record marked with its medal.
  $('.sum-kg').textContent = kg.toLocaleString('en');
  $('.sum-sets').replaceChildren(...sets.map((s, k) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>Set ${k + 1}</span><b>${fmtW(s.w)}<i> kg × </i>${s.r}</b>`;
    if (s.rec) li.append(Object.assign(document.createElement('span'), { className: 'medal-slot' }));
    return li;
  }));
  $('.sum-line').textContent = `${sets.length} sets · best ${$('.best').textContent}`;
  summary.hidden = false;
  fadeTo($('.restart'), 1, 0, 200).finished.then(() => { if (phase === 'done') $('.restart').style.visibility = 'hidden'; }, () => {});
  [...summary.children].forEach((el, k) => spring(el, [{ transform: 'translateY(12px)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.set, { delay: 160 + k * 60, fill: 'backwards' }));
}
/** Fade the screen's parts (not .screen itself: an ancestor with opacity would cut the card's frost off from the room). */
let swapping = false;
/** Fades the screen out, makes the change, fades it back. A second tap while it runs joins the same swap. */
function swapScreen(change) {
  if (swapping) return;
  swapping = true;
  const parts = [$('.glow'), ...$('.screen').children];
  Promise.all(parts.map((p) => p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: 'forwards' }).finished)).catch(() => {}).then(() => {
    change();
    swapping = false;
    for (const p of parts) { p.getAnimations().forEach((a) => a.cancel()); p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 }); }
  });
}
function restart() {
  if (!$('.reward').hidden) return;
  swapScreen(init);
}
$('.again').addEventListener('click', restart);
$('.restart').addEventListener('click', restart);

/* ---------- A new record: the medal flips in and catches the light ---------- */
const reward = $('.reward'), mPos = $('.medal-pos'), medal = $('.medal'), sheen = $('.sheen');
const rEst = new Roll($('.est'));
let rewardOpenAt = 0, slotEl = null;
function showMedal(row, s, oldE, newE) {
  slotEl = medalSlot(row); slotEl.style.opacity = 0;
  $('.m-num').textContent = fmtW(s.w);
  $('.m-sub').textContent = `kg × ${s.r}`;
  $('.r-line').textContent = `${fmtW(s.w)} kg × ${s.r} · heaviest ${s.r} reps yet`;
  rEst.render(String(Math.round(oldE)));
  reward.hidden = false; rewardOpenAt = performance.now();
  for (const el of reward.querySelectorAll('*')) el.getAnimations().forEach((a) => a.cancel());
  fadeTo($('.reward-dim'), 0, 1, 320);
  fadeTo($('.reward-glow'), 0, 1, 900, { delay: 300, fill: 'backwards' });
  const sr = centre(slotEl.getBoundingClientRect()), mr = centre(mPos.getBoundingClientRect());
  mPos.style.transform = 'none';
  spring(mPos, [{ transform: `translate(${sr.x - mr.x}px, ${sr.y - mr.y}px) scale(.09)` }, { transform: 'none' }], SOFT);
  medal.style.transform = 'none';
  medal.animate([{ transform: 'rotateY(-720deg)' }, { transform: 'none' }], { duration: reduced() ? 1 : 1350, easing: 'cubic-bezier(.12,.8,.22,1)' });
  sheen.animate([{ transform: 'translateX(-80%)', opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 1, offset: 0.65 }, { transform: 'translateX(80%)', opacity: 0 }],
    { duration: 900, delay: 1000, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'backwards' });
  setTimeout(() => buzz(20), 700);
  [...$('.reward-text').children].forEach((el, k) => {
    el.style.opacity = 1;
    spring(el, [{ transform: 'translateY(12px)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.set, { delay: 750 + k * 70, fill: 'backwards' });
  });
  setTimeout(() => rEst.set(String(Math.round(newE)), 1), 1500);
}
function closeMedal() {
  if (reward.hidden || performance.now() - rewardOpenAt < 900) return;
  rewardOpenAt = Infinity;
  for (const el of $('.reward-text').children) fadeTo(el, 1, 0, 140);
  const sr = centre(slotEl.getBoundingClientRect()), mr = centre(mPos.getBoundingClientRect());
  const here = getComputedStyle(mPos).transform;
  mPos.getAnimations().forEach((x) => x.cancel());
  const a = spring(mPos, [{ transform: here === 'none' ? 'none' : here }, { transform: `translate(${sr.x - mr.x}px, ${sr.y - mr.y}px) scale(.09)` }], SPRINGS.set, { fill: 'forwards' });
  fadeTo($('.reward-glow'), 1, 0, 220);
  fadeTo($('.reward-dim'), 1, 0, 300, { delay: 60, fill: 'backwards' });
  a.finished.then(() => {
    slotEl.style.opacity = 1;
    reward.hidden = true;
    rewardOpenAt = 0;
    if (cur >= sets.length) finish(); // the last set was the record: the card turns into its summary after the medal
  }, () => {});
}
reward.addEventListener('click', closeMedal);

/* ---------- The Coach: one quiet dot that unfolds one line ---------- */
const coachBtn = $('.coach'), tray = $('.coach-tray'), trayBg = $('.coach-bg'), trayText = $('.coach-text');
let trayOpen = false;
function setTray(open) {
  if (open === trayOpen) return;
  trayOpen = open;
  coachBtn.setAttribute('aria-expanded', open);
  // Start from wherever the tray is now, so a quick open-close-open never restarts from zero.
  const bs = getComputedStyle(trayBg), ts = getComputedStyle(trayText);
  const bFrom = { transform: tray.hidden ? 'scale(.05, .2)' : bs.transform, opacity: tray.hidden ? 0 : bs.opacity };
  const tFrom = { transform: tray.hidden ? 'translateY(-6px)' : ts.transform, opacity: tray.hidden ? 0 : ts.opacity };
  trayBg.getAnimations().forEach((a) => a.cancel());
  trayText.getAnimations().forEach((a) => a.cancel());
  if (open) {
    tray.hidden = false;
    trayText.style.opacity = '';
    spring(trayBg, [bFrom, { transform: 'none', opacity: 1 }], SPRINGS.set);
    spring(trayText, [tFrom, { transform: 'none', opacity: 1 }], SPRINGS.set, { delay: tFrom.opacity > 0 ? 0 : 70, fill: 'backwards' });
  } else {
    fadeTo(trayText, tFrom.opacity, 0, 100);
    spring(trayBg, [bFrom, { transform: 'scale(.05, .2)', opacity: 0 }], SPRINGS.type, { fill: 'forwards' })
      .finished.then(() => { if (!trayOpen) tray.hidden = true; }, () => {});
  }
}
coachBtn.addEventListener('click', (e) => { e.stopPropagation(); setTray(!trayOpen); });
document.addEventListener('pointerdown', (e) => { if (trayOpen && !e.target.closest('.coach-tray, .coach')) setTray(false); });

/* ---------- Session clock ---------- */
const clock = $('.clock'), t0 = Date.now() - ms(18 * 60 + 42);
setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); clock.textContent = fmtT(s); }, 1000);

init();
document.fonts?.ready.then(() => document.documentElement.classList.add('ready'));
