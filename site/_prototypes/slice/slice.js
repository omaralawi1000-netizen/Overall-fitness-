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
  constructor(el, text = '') { this.el = el; this.render(text); }
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
    const h = n.height * 0.62;
    const used = new Set();
    let dx = null;
    chars.forEach((c, j) => {
      const i = j - aNew + aOld, prev = old[i];
      if (prev) used.add(i);
      if (prev && dx === null) dx = o.left + prev.x - c.getBoundingClientRect().left;
      if (prev && prev.t === c.textContent) return;
      if (prev) this.ghost(prev, -dir * h);
      spring(c, [{ transform: `translateY(${dir * h}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.type);
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
const segs = [...document.querySelectorAll('.arc .half')].map((h) => ({ el: h.firstElementChild, right: h.classList.contains('r') }));
const lastEl = $('.last'), bestEl = $('.best'), summary = $('.summary');
const rW = new Roll($('.big.w')), rR = new Roll($('.big.r')), rSet = new Roll($('.set-no')), rCount = new Roll($('.count'), fmtT(REST));

/* ---------- The room ---------- */
function paintRoom() {
  const host = $('.glow');
  const c = paintField([{ x: 0.12, y: 0.06, sx: 0.66, sy: 0.55, c: [255, 96, 38], a: 0.38 }, { x: 0.12, y: 0.06, sx: 0.28, sy: 0.22, c: [255, 140, 90], a: 0.18 }],
    [10, 8, 9], { w: innerWidth, h: innerHeight, over: 1, seed: 5 });
  host.replaceChildren(c);
}
paintRoom();
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(paintRoom, 200); });
$('.reward-glow').append(paintField([{ x: 0.5, y: 0.5, s: 0.2, c: [255, 107, 44], a: 0.42 }], null, { w: 460, h: 460, over: 1, seed: 9 }));

// Dial ticks: 60 marks, every fifth longer. Drawn once.
(() => {
  const svg = $('.ticks'), ns = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2, major = i % 5 === 0, r1 = major ? 93 : 95, r2 = 99;
    const l = document.createElementNS(ns, 'line');
    l.setAttribute('x1', 100 + r1 * Math.sin(a)); l.setAttribute('y1', 100 - r1 * Math.cos(a));
    l.setAttribute('x2', 100 + r2 * Math.sin(a)); l.setAttribute('y2', 100 - r2 * Math.cos(a));
    if (major) l.setAttribute('class', 'major');
    svg.append(l);
  }
})();

// Medal edge: thin discs between the faces, so it has a body when it turns.
(() => { const m = $('.medal'); for (let z = -3; z <= 3; z++) { const e = document.createElement('div'); e.className = 'edge'; e.style.transform = `translateZ(${z}px)`; m.prepend(e); } })();

/* ---------- State ---------- */
const PLAN = [
  { w: 80, r: 8, last: '80 × 8' },
  { w: 82.5, r: 6, last: '82.5 × 5' },
  { w: 82.5, r: 6, last: '82.5 × 6' },
  { w: 85, r: 6, last: '82.5 × 5' },
];
let sets, cur, best, medalShown, medalPending = false, phase, locked, restEnd, restTimer, restAnims = [];

function rowEl(s, i, done) {
  const r = document.createElement('div');
  r.className = 'row ' + (done ? 'done' : 'up');
  r.innerHTML = `<span class="mk">${done ? '<svg viewBox="0 0 32 32"><path d="M8 16.5l5.2 5.2L24 10.5"/></svg>' : ''}</span><span class="rl">Set ${i + 1}</span><span class="rv">${fmtW(s.w)}<i>kg ×</i>${s.r}</span>`;
  return r;
}
function medalSlot(row) { const m = document.createElement('span'); m.className = 'medal-slot'; row.append(m); return m; }

function init() {
  sets = PLAN.map((s) => ({ ...s }));
  cur = 1; best = e1(82.5, 6); medalShown = false; phase = 'ready'; locked = false;
  stopRest();
  doneZone.replaceChildren(rowEl(sets[0], 0, true));
  nextZone.replaceChildren(...sets.slice(2).map((s, k) => rowEl(s, k + 2, false)));
  rW.render(fmtW(sets[1].w)); rR.render(String(sets[1].r)); rSet.render('2');
  lastEl.textContent = 'last time ' + sets[1].last;
  bestEl.textContent = '82.5 kg × 6';
  for (const el of card.children) { el.getAnimations().forEach((a) => a.cancel()); el.style.opacity = ''; el.style.visibility = ''; }
  summary.hidden = true;
  Object.assign($('.restart').style, { opacity: '', visibility: '' });
  readyLook(false);
}

/* ---------- Rest: a ring that fills, cool to orange as time runs out ---------- */
function readyLook(animate = true) {
  phase = 'ready';
  const d = animate ? 260 : 0;
  fadeTo(full, getComputedStyle(full).opacity, 1, d);
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
  rCount.render(fmtT(REST));
  fadeTo(full, 1, 0, 220);
  fadeTo(pearl, 1, 0, 260); spring(pearl, [{ transform: 'scale(1)' }, { transform: 'scale(.9)' }], SPRINGS.type, { fill: 'forwards' });
  fadeTo(cDark, 1, 0, 160);
  fadeTo(restFace, 0, 1, 260, { delay: 80, fill: 'backwards' });
  warm.style.opacity = 1; cool.style.opacity = 1;
  warm.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
  restAnims = segs.map(({ el, right }) => el.animate(right
    ? [{ transform: 'rotate(45deg)' }, { transform: 'rotate(225deg)', offset: 0.5 }, { transform: 'rotate(225deg)' }]
    : [{ transform: 'rotate(45deg)' }, { transform: 'rotate(45deg)', offset: 0.5 }, { transform: 'rotate(225deg)' }],
  { duration: T, easing: 'linear', fill: 'forwards' }));
  // Colour follows the time left: cool for most of the rest, warming to orange near the end.
  restAnims.push(cool.animate([{ opacity: 1 }, { opacity: 0.85, offset: 0.5 }, { opacity: 0 }], { duration: T, easing: 'cubic-bezier(.5,0,.75,.6)', fill: 'forwards' }));
  fadeTo(hint, 1, 0, 140);
  skipBtn.style.visibility = 'visible'; fadeTo(skipBtn, 0, 1, 220, { delay: 120, fill: 'backwards' });
  tick.setAttribute('aria-label', `Resting. Set ${cur + 1} done`);
  clearInterval(restTimer);
  restTimer = setInterval(restTick, 100);
}
function restTick() {
  const left = Math.max(0, Math.ceil((restEnd - performance.now()) / 1000));
  rCount.set(fmtT(left), -1);
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
  restAnims.forEach((a) => a.updatePlaybackRate(left / quick));
  restEnd = performance.now() + quick;
});

/* ---------- Ticking a set ---------- */
let pressAnim;
tick.addEventListener('pointerdown', () => {
  if (phase === 'done') return;
  pressAnim?.cancel();
  pressAnim = spring(tick, [{ transform: 'none' }, { transform: 'scale(1.07)' }], SPRINGS.type, { fill: 'forwards' });
});
const release = () => {
  if (!pressAnim) return;
  const p = pressAnim; pressAnim = null;
  const now = getComputedStyle(tick).transform;
  p.cancel();
  spring(tick, [{ transform: now === 'none' ? 'scale(1.07)' : now }, { transform: 'none' }], SPRINGS.press);
};
tick.addEventListener('pointerup', release);
tick.addEventListener('pointercancel', release);
tick.addEventListener('pointerleave', release);
tick.addEventListener('click', doTick);

function doTick() {
  if (locked || phase === 'done') return;
  locked = true; setTimeout(() => { locked = false; }, 620);
  buzz(12);
  const i = cur, s = sets[i];
  const wasResting = phase === 'rest';
  phase = 'ticking';
  if (wasResting) { stopRest(200); fadeTo(restFace, 1, 0, 120); fadeTo(warm, 1, 0, 160); fadeTo(cool, getComputedStyle(cool).opacity, 0, 160); hideSkip(true); }
  else fadeTo(hint, 1, 0, 140);
  // The tick has a body: an orange pearl swells inside the button and settles into a check.
  pearl.getAnimations().forEach((a) => a.cancel());
  pearl.style.transform = 'none'; pearl.style.opacity = 1;
  spring(pearl, [{ transform: 'scale(.15)', opacity: 0.6 }, { transform: 'none', opacity: 1 }], SPRINGS.type);
  fadeTo(cHot, getComputedStyle(cHot).opacity, 0, 90);
  cDark.style.opacity = 1;
  spring(cDark, [{ transform: 'scale(.55)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.press, { delay: 70, fill: 'backwards' });
  if (!wasResting) fadeTo(full, 1, 1, 0);

  const isRec = e1(s.w, s.r) > best + 1e-6, oldBest = best;
  if (isRec) { best = e1(s.w, s.r); }
  setTimeout(() => {
    const row = conveyor(i, isRec);
    if (isRec) {
      bestEl.textContent = `${fmtW(s.w)} kg × ${s.r}`;
      bestEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      if (!medalShown) { medalShown = true; medalPending = true; setTimeout(() => { medalPending = false; showMedal(row, s, oldBest, best); }, 380); }
      else { const m = medalSlot(row); spring(m, [{ transform: 'scale(0)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.press, { delay: 200, fill: 'backwards' }); }
    }
    if (cur >= sets.length) { phase = 'done'; if (reward.hidden && !(isRec && medalPending)) setTimeout(finish, 200); }
  }, 240);
  setTimeout(() => { if (phase === 'ticking' && cur < sets.length) startRest(); }, 560);
}

/** The done set flies up and becomes a slim row; the next set rises from its row into the card. */
function conveyor(i, isRec) {
  const s = sets[i];
  // Done rows: the new one lands at the bottom, the others make room upward.
  const before = new Map([...doneZone.children].map((r) => [r, r.getBoundingClientRect().top]));
  const row = rowEl(s, i, true);
  doneZone.append(row);
  for (const [r, top] of before) {
    const dy = top - r.getBoundingClientRect().top;
    if (Math.abs(dy) > 0.5) spring(r, [{ transform: `translateY(${dy}px)` }, { transform: 'none' }]);
  }
  spring(row, [{ transform: 'translateY(14px)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.set, { delay: 120, fill: 'backwards' });

  // A copy of the card's numbers shrinks toward the new row and hands over to it.
  const vr = vals.getBoundingClientRect(), cr = card.getBoundingClientRect();
  const g = vals.cloneNode(true);
  g.setAttribute('aria-hidden', 'true');
  Object.assign(g.style, { position: 'absolute', left: vr.left - cr.left + 'px', top: vr.top - cr.top + 'px', width: vr.width + 'px', margin: 0, pointerEvents: 'none' });
  card.append(g);
  const to = centre(row.querySelector('.rv').getBoundingClientRect()), from = centre(vr);
  spring(g, [{ transform: 'none', opacity: 1 }, { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(.3)`, opacity: 0 }], SPRINGS.set, { fill: 'forwards' })
    .finished.then(() => g.remove(), () => g.remove());

  cur = i + 1;
  const n = sets[cur];
  if (!n) { vals.style.opacity = 0; return row; }
  // The next set's row rises into the card; the rows below it move up.
  const up = nextZone.firstElementChild;
  const ur = up.getBoundingClientRect();
  const rest = [...nextZone.children].slice(1), rb = new Map(rest.map((r) => [r, r.getBoundingClientRect().top]));
  const ug = up.cloneNode(true);
  Object.assign(ug.style, { position: 'absolute', left: ur.left + 'px', top: ur.top + 'px', width: ur.width + 'px', pointerEvents: 'none', zIndex: 2 });
  document.body.append(ug);
  up.remove();
  spring(ug, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-30px)', opacity: 0 }], SPRINGS.type, { fill: 'forwards' }).finished.then(() => ug.remove(), () => ug.remove());
  for (const [r, top] of rb) {
    const dy = top - r.getBoundingClientRect().top;
    if (Math.abs(dy) > 0.5) spring(r, [{ transform: `translateY(${dy}px)` }, { transform: 'none' }], SPRINGS.set, { delay: 40, fill: 'backwards' });
  }
  rW.render(fmtW(n.w)); rR.render(String(n.r));
  // A short rise, not the whole way: the full path would cross the dial.
  spring(vals, [{ transform: 'translateY(34px) scale(.86)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.set, { delay: 90, fill: 'backwards' });
  rSet.set(String(cur + 1), 1);
  lastEl.textContent = 'last time ' + n.last;
  lastEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 120, fill: 'backwards' });
  return row;
}

/* ---------- Steppers: only the changed digit rolls ---------- */
document.querySelectorAll('.step').forEach((b) => b.addEventListener('click', () => {
  if (phase === 'done' || cur >= sets.length) return;
  const s = sets[cur], k = b.dataset.k, d = +b.dataset.d;
  const v = k === 'w' ? Math.max(0, Math.min(500, s.w + d)) : Math.max(1, Math.min(50, s.r + d));
  if (v === s[k]) return;
  s[k] = v;
  (k === 'w' ? rW : rR).set(k === 'w' ? fmtW(v) : String(v), Math.sign(d));
  buzz(6);
}));

/* ---------- The exercise is done: the card turns into its summary ---------- */
function finish() {
  phase = 'done';
  stopRest();
  const parts = [...card.children].filter((el) => !el.classList.contains('summary') && el !== summary);
  for (const el of parts) fadeTo(el, getComputedStyle(el).opacity, 0, 200).finished.then(() => { if (phase === 'done') el.style.visibility = 'hidden'; }, () => {});
  const kg = sets.reduce((a, s) => a + s.w * s.r, 0);
  $('.sum-line').textContent = `${sets.length} sets · ${kg.toLocaleString('en')} kg moved`;
  summary.hidden = false;
  fadeTo($('.restart'), 1, 0, 200).finished.then(() => { if (phase === 'done') $('.restart').style.visibility = 'hidden'; }, () => {});
  [...summary.children].forEach((el, k) => spring(el, [{ transform: 'translateY(12px)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.set, { delay: 160 + k * 60, fill: 'backwards' }));
}
function restart() {
  if (!$('.reward').hidden) return;
  const scr = $('.screen');
  scr.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' }).finished.then(() => {
    init();
    scr.getAnimations().forEach((a) => a.cancel());
    scr.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
  });
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
