// Cast: one workout screen where every number is liquid metal.
// The page (DOM) owns layout, words and buttons; cast.js draws the metal into the boxes the page leaves for it.
// All data is made up.
import { createCast } from './cast.js';

const q = new URLSearchParams(location.search);
const REST = q.has('rest') ? Math.max(3, Number(q.get('rest')) || 3) : null;   // ?rest=8 shortens every rest (testing)

const PLAN = () => ({
  name: 'Push',
  exercises: [
    { name: 'Bench press', short: 'Bench', rest: 120, step: 2.5, best: [82.5, 7], sets: [[80, 8, 1], [80, 8], [82.5, 8], [82.5, 8]] },
    { name: 'Incline dumbbell press', short: 'Incline', rest: 90, step: 2, best: [30, 10], sets: [[28, 10], [30, 10], [30, 9]] },
    { name: 'Cable fly', short: 'Fly', rest: 75, step: 2.5, best: [20, 12], sets: [[17.5, 12], [17.5, 12], [20, 10]] },
  ].map((e) => ({ ...e, sets: e.sets.map(([w, r, done]) => ({ w, r, done: !!done })) })),
});

const $ = (id) => document.getElementById(id);
const app = $('app'), hero = $('hero'), unit = $('unit'), reps = $('reps'), repsUnit = $('repsUnit');
const setsEl = $('sets'), go = $('go'), tape = $('tape');

const fmtW = (w) => (Number.isInteger(w) ? String(w) : w.toFixed(1).replace(/\.0$/, ''));
const fmtT = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const e1rm = (w, r) => w * (1 + r / 30);
const buzz = (p) => { try { navigator.vibrate?.(p); } catch { /* not allowed yet */ } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

let plan = PLAN();
let ex = 0, cur = 1, phase = 'lift', cast = null, records = 0;
let rest = { end: 0, total: 0, shown: -1, then: 'set' };
let armedAt = 0;   // the button ignores taps until then, so a double tap can't skip a rest or wipe a finished workout
const startedAt = Date.now() - (18 * 60 + 42) * 1000;

const E = () => plan.exercises[ex];
const S = () => E().sets[cur];

// ---------- boxes the canvas draws into ----------
function rect(el) { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }
function heroBox() { const r = rect(hero); return { x: r.x + 30, y: r.y + 6, w: r.w - 60, h: r.h - 12 }; }
function repsBox() { const r = rect(reps); return { x: r.x + 26, y: r.y + 4, w: r.w - 52, h: r.h - 8 }; }

// ---------- words ----------
const EASE = 'cubic-bezier(.23,1,.32,1)';
function swap(el, html) {
  if (el.innerHTML === html) return;
  el.getAnimations().forEach((a) => a.cancel());
  if (calm) { el.innerHTML = html; return; }
  const out = el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: 110, easing: EASE, fill: 'forwards' });
  out.onfinish = () => {
    el.innerHTML = html; out.cancel();
    el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: EASE });
  };
}

// ---------- the numbers ----------
function setHero(text, opts = {}) {
  hero.dataset.text = text;
  $('heroText').textContent = phase === 'rest' ? `${text} rest left` : `${text} kilograms`;
  if (!cast) return;
  const r = rect(hero);
  const lay = cast.setText('hero', text, { box: heroBox(), maxSize: 172, ...opts });
  const capTop = lay.by - cast.atlas.cap * lay.S;
  place(unit, Math.round(lay.left + lay.width - r.x + 2), Math.round(capTop - r.y + 2), opts.instant);
}
function setReps(n, opts = {}) {
  reps.dataset.text = String(n);
  $('repsText').textContent = `${n} reps`;
  if (!cast) return;
  const r = rect(reps);
  const lay = cast.setText('reps', String(n), { box: repsBox(), maxSize: 62, ...opts });
  place(repsUnit, Math.round(lay.left + lay.width - r.x + 7), Math.round(lay.by - r.y - 15), opts.instant);
}
function place(el, x, y, instant) {
  if (instant) { el.style.transition = 'none'; el.style.transform = `translate(${x}px, ${y}px)`; el.offsetWidth; el.style.transition = ''; }
  else el.style.transform = `translate(${x}px, ${y}px)`;
}
function lift(id, to, k, c) { if (cast) cast.lines.get(id).height.set(to, k, c); }

function placeTape(w, step, instant) {
  const x = Math.max(-2350, Math.min(2350, 1200 - (w / step) * 12));
  if (instant) { tape.style.transition = 'none'; tape.style.transform = `translateX(${x}px)`; tape.offsetWidth; tape.style.transition = ''; }
  else tape.style.transform = `translateX(${x}px)`;
}

// ---------- sets ----------
function buildSets() {
  setsEl.innerHTML = E().sets.map((s, i) => `<div class="set"><i class="bead"></i><span>${fmtW(s.w)} × ${s.r}</span></div>`).join('');
  paintSets();
}
function paintSets() {
  [...setsEl.children].forEach((el, i) => {
    const s = E().sets[i];
    el.classList.toggle('done', s.done); el.classList.toggle('now', i === cur && phase !== 'done');
    el.querySelector('span').textContent = `${fmtW(s.w)} × ${s.r}`;
  });
}
function syncBeads() {
  if (!cast) return;
  cast.setBeads([...setsEl.querySelectorAll('.bead')].map((b) => { const r = rect(b); return { x: r.x + r.w / 2, y: r.y + r.h / 2, r: r.w / 2, fill: 0 }; }));
}
function beadTargets(rise = true) {
  if (!cast) return;
  E().sets.forEach((s, i) => {
    const b = cast.beads[i]; if (!b) return;
    b.fill.set(s.done ? 1 : 0);
    if (rise) b.h.set(s.done || i === cur ? 1 : 0.42);
  });
}
function syncPill() { if (!cast) return; const r = rect(go); Object.assign(cast.pill, { x: r.x + r.w / 2, y: r.y + r.h / 2, hw: r.w / 2, hh: r.h / 2 }); }
const centre = (el) => { const r = rect(el); return [r.x + r.w / 2, r.y + r.h / 2]; };

// ---------- moods ----------
function mood(name) {
  if (!cast) return;
  const m = cast.mood;
  if (name === 'lift') { m.horizonTo = [0.10, 0.34, 1.0]; m.key.set(3.2); m.gold.set(0, 60, 14); cast.pill.glow.set(0.6); }
  if (name === 'rest') { m.horizonTo = [1.1, 0.42, 0.12]; m.key.set(2.5); cast.pill.glow.set(0.25); }
  if (name === 'gold') { m.horizonTo = [1.3, 0.82, 0.3]; m.key.set(3.6); m.gold.set(1, 140, 18); }
}

// ---------- screens ----------
function subFor() { return `Set ${cur + 1} of ${E().sets.length}`; }
function upNext() { const n = plan.exercises[ex + 1]; return n ? `Up next · ${n.name}` : 'Last exercise'; }
function paintSegs() { $('segs').innerHTML = plan.exercises.map((_, i) => `<i class="${i < ex ? 'done' : i === ex ? 'on' : ''}"></i>`).join(''); }

function showLift(instant) {
  const s = S();
  setHero(fmtW(s.w), instant ? { instant: true } : {});
  setReps(s.r, instant ? { instant: true } : {});
  placeTape(s.w, E().step, instant);
}

async function logSet() {
  if (phase !== 'lift') return;
  const s = S(), e = E();
  buzz(14);
  if (cast) {
    cast.drop(...centre(go), 2.4, 3.6);
    cast.pill.glow.x = 1.8; cast.pill.glow.set(0.6, 90, 14);
    cast.pill.spill = 0;
  }
  const best = e1rm(...e.best);
  const isRecord = e1rm(s.w, s.r) > best + 0.01;
  s.done = true;
  if (isRecord) { e.best = [s.w, s.r]; records++; }
  if (cast) { const b = cast.beads[cur]; b.fill.set(1, 300, 13); b.h.set(1); setTimeout(() => cast.drop(b.x, b.y, 0.9, 1.6), 70); }
  paintSets();
  const lastSet = cur === e.sets.length - 1;
  const lastEx = ex === plan.exercises.length - 1;
  phase = 'busy';
  if (isRecord) await recordMoment(s);
  else await wait(60);
  if (lastSet && lastEx) return finish();
  startRest(lastSet ? 'exercise' : 'set');
}

async function recordMoment(s) {
  app.classList.add('is-record');
  mood('gold');
  buzz([12, 70, 30]);
  if (cast) {
    cast.sweep(); cast.drop(...centre(hero), 2.6, 5);
    const L = cast.lines.get('hero'); L.pulse.v = calm ? 0 : 6; L.height.set(1, 120, 9); L.height.v = 4.5;   // the number swells, then settles
  }
  swap($('sub'), `${fmtW(s.w)} kg × ${s.r} · your best yet`);
  await wait(1700);
}

function startRest(then) {
  phase = 'rest';
  rest.then = then;
  if (then === 'set') cur++;
  rest.total = REST || E().rest;
  rest.end = Date.now() + rest.total * 1000;
  rest.shown = rest.total;
  armedAt = Date.now() + 700;
  app.classList.remove('is-lift'); app.classList.add('is-rest');
  setHero(fmtT(rest.total), { stagger: 0.04, dur: 0.42 });
  lift('reps', 0, 260, 26);
  if (cast) {
    cast.drop(...centre(reps), 0.7, 2.4);
    cast.mood.heat.set(0.93, 90, 15);
    cast.lines.get('hero').height.set(1, 170, 17);
    setTimeout(() => { if (phase !== 'rest') return; app.classList.remove('is-record'); mood('rest'); }, 1400);
  }
  if (then === 'set') { beadTargets(); paintSets(); }
  const n = then === 'set' ? S() : null;
  swap($('nextset'), n ? `Next · <b>${fmtW(n.w)} kg × ${n.r}</b>` : `Next · <b>${plan.exercises[ex + 1].name}</b>`);
  swap($('sub'), n ? `Rest · then set ${cur + 1} of ${E().sets.length}` : `Rest · ${E().name} done`);
  swap($('goLabel'), 'Skip rest');
}

function tick() {
  $('clock').textContent = fmtT(Math.floor((Date.now() - startedAt) / 1000));
  if (phase !== 'rest') return;
  const left = Math.max(0, Math.ceil((rest.end - Date.now()) / 1000));
  if (cast && cast.mood.heat.to > 0) cast.mood.heat.set(0.93 * Math.pow(Math.max(0, (rest.end - Date.now()) / (rest.total * 1000)), 1.4), 40, 13);
  if (left !== rest.shown) {
    rest.shown = left;
    setHero(fmtT(left), { stagger: 0.03, dur: 0.36 });
    if (left > 0 && left <= 3) buzz(6);
  }
  if (left <= 0) endRest();
}

async function endRest() {
  if (phase !== 'rest') return;
  phase = 'busy';
  buzz([18, 50, 18]);
  if (cast) {
    cast.mood.heat.set(0, 120, 22);
    cast.drop(...centre(hero), 2.0, 5);
  }
  mood('lift');
  swap($('goLabel'), 'Log set');
  if (rest.then === 'exercise') return nextExercise();
  app.classList.remove('is-rest', 'is-record'); app.classList.add('is-lift');
  showLift();
  lift('reps', 1, 170, 15);
  if (cast) setTimeout(() => cast.drop(...centre(reps), 0.8, 2.2), 120);
  swap($('sub'), subFor());
  await wait(400);
  phase = 'lift';
}

async function sinkAll() {
  app.classList.add('is-sunk');
  lift('hero', 0, 140, 16); lift('reps', 0, 140, 16);
  if (cast) cast.beads.forEach((b, i) => setTimeout(() => b.h.set(0, 160, 16), i * 40));
  await wait(460);
}
async function riseAll() {
  if (!cast) { app.classList.remove('is-sunk'); return; }
  const [hx, hy] = centre(hero);
  cast.drop(hx, hy, 2.4, 6);
  setTimeout(() => lift('hero', 1, 150, 13), 90);
  setTimeout(() => { lift('reps', 1, 170, 14); cast.drop(...centre(reps), 0.7, 2.2); }, 230);
  setTimeout(() => app.classList.remove('is-sunk'), 330);
  E().sets.forEach((s, i) => setTimeout(() => {
    const b = cast.beads[i]; if (!b) return;
    b.h.set(s.done || i === cur ? 1 : 0.42); cast.drop(b.x, b.y, 0.5, 1.4);
  }, 330 + i * 70));
}

async function nextExercise() {
  phase = 'busy';
  await sinkAll();
  app.classList.remove('is-rest', 'is-record'); app.classList.add('is-lift');
  ex++; cur = 0;
  swap($('name'), E().name); swap($('sub'), subFor()); swap($('upnext'), upNext()); paintSegs();
  buildSets(); syncBeads(); beadTargets(false);
  if (cast) cast.beads.forEach((b) => b.h.snap(0));
  showLift(true);
  await riseAll();
  await wait(300);
  phase = 'lift';
}

async function finish() {
  phase = 'done';
  armedAt = Date.now() + 900;
  app.classList.remove('is-lift', 'is-rest'); app.classList.add('is-done');
  const vol = plan.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).reduce((b, s) => b + s.w * s.r, 0), 0);
  const sets = plan.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const mins = Math.floor((Date.now() - startedAt) / 60000);
  lift('reps', 0, 120, 14);
  mood('gold');
  if (cast) { cast.sweep(); cast.drop(...centre(hero), 2.6, 7); }
  setHero(Math.round(vol).toLocaleString('en-US'), { stagger: 0.07, dur: 0.8 });
  swap($('name'), `${plan.name} done`);
  swap($('sub'), `${mins} min · ${sets} sets${records ? ` · ${records} new best` : ''}`);
  swap($('upnext'), '');
  swap($('goLabel'), 'Start again');
  paintSegs();
  $('segs').querySelectorAll('i').forEach((i) => (i.className = 'done'));
  buzz([20, 60, 20, 60, 40]);
  // the set beads sink; one gold bead per exercise rises in their place
  app.classList.add('is-sunk');
  if (cast) cast.beads.forEach((b, i) => setTimeout(() => b.h.set(0, 160, 16), i * 40));
  await wait(420);
  setsEl.innerHTML = plan.exercises.map((e) => `<div class="set done"><i class="bead"></i><span>${e.short} · ${e.sets.filter((s) => s.done).length}</span></div>`).join('');
  if (cast) {
    syncBeads();
    cast.beads.forEach((b, i) => { b.h.snap(0); b.fill.snap(1); setTimeout(() => { b.h.set(1, 190, 13); cast.drop(b.x, b.y, 0.6, 1.6); }, 60 + i * 110); });
  }
  setTimeout(() => app.classList.remove('is-sunk'), 160);
}

async function restart() {
  phase = 'busy';
  await sinkAll();
  plan = PLAN(); ex = 0; cur = 1; records = 0;
  app.classList.remove('is-done', 'is-record'); app.classList.add('is-lift');
  mood('lift');
  swap($('name'), E().name); swap($('sub'), subFor()); swap($('upnext'), upNext()); swap($('goLabel'), 'Log set');
  paintSegs(); buildSets(); syncBeads(); beadTargets(false);
  if (cast) cast.beads.forEach((b) => b.h.snap(0));
  showLift(true);
  await riseAll();
  await wait(500);
  phase = 'lift';
}

// ---------- input ----------
function change(kind, dir) {
  if (phase !== 'lift') return;
  const s = S(), e = E();
  if (kind === 'w') { const w = Math.max(0, Math.round((s.w + dir * e.step) * 100) / 100); if (w === s.w) return; s.w = w; setHero(fmtW(w), { stagger: 0.025, dur: 0.3 }); placeTape(w, e.step); }
  else { const r = Math.max(1, Math.min(50, s.r + dir)); if (r === s.r) return; s.r = r; setReps(r, { dur: 0.3 }); }
  buzz(5);
  paintSets();
}
document.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { const v = b.dataset.step; change(v[0], Math.sign(Number(v.slice(1)))); }));
document.querySelectorAll('[data-rest]').forEach((b) => b.addEventListener('click', () => {
  if (phase !== 'rest') return;
  const d = Number(b.dataset.rest);
  const now = Date.now();
  rest.end = Math.max(now + 1000, rest.end + d * 1000);
  rest.total = Math.max(1, rest.total + d);
  buzz(6);
  if (cast) cast.drop(...centre(b), 0.5, 1.8);
  tick();
}));
document.querySelectorAll('.step, .chip').forEach((b) => {
  let f = null;
  b.addEventListener('pointerdown', () => { if (cast) { const [x, y] = centre(b); f = cast.press(x, y, 30); } });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => b.addEventListener(t, () => { if (cast && f) cast.release(f); f = null; }));
});
go.addEventListener('pointerdown', () => { if (!cast) return; cast.pill.press.set(1, 900, 40); cast.pill.glow.set(1.15, 400, 30); });
['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => go.addEventListener(t, () => { if (!cast) return; cast.pill.press.set(0, 260, 13); if (cast.pill.glow.to > 1) cast.pill.glow.set(phase === 'rest' ? 0.25 : 0.6, 120, 20); }));
go.addEventListener('click', () => {
  if (Date.now() < armedAt) return;
  if (phase === 'lift') logSet();
  else if (phase === 'rest') { if (cast) cast.drop(...centre(go), 1.2, 3); endRest(); }
  else if (phase === 'done') restart();
});

// drag the number sideways to change the weight; the tape follows the finger
let drag = null;
hero.addEventListener('pointerdown', (e) => { if (phase !== 'lift') return; drag = { x: e.clientX, steps: 0, id: e.pointerId }; hero.setPointerCapture(e.pointerId); });
hero.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const steps = Math.round((drag.x - e.clientX) / 26);
  while (drag.steps < steps) { drag.steps++; change('w', 1); }
  while (drag.steps > steps) { drag.steps--; change('w', -1); }
});
const endDrag = () => { drag = null; };
hero.addEventListener('pointerup', endDrag); hero.addEventListener('pointercancel', endDrag);

// ---------- start ----------
async function boot() {
  paintSegs(); buildSets();
  $('name').textContent = E().name; $('sub').textContent = subFor(); $('upnext').textContent = upNext();
  try { await Promise.race([document.fonts.load('860 200px Geist'), wait(2500)]); } catch { /* fall back to whatever font loaded */ }
  try { cast = createCast($('gl'), { quality: q.has('q') ? Number(q.get('q')) : undefined, onLost: () => app.classList.add('flat') }); } catch (err) { console.error(err); cast = null; }
  if (!cast) app.classList.add('flat');
  if (cast) {
    cast.addLine('hero', 8); cast.addLine('reps', 3);
    syncBeads(); syncPill(); beadTargets(false);
    cast.start();
  }
  showLift(true);
  if (cast) {
    setTimeout(() => { cast.drop(...centre(hero), 1.8, 7); lift('hero', 1, 90, 13); }, 60);
    setTimeout(() => { lift('reps', 1, 170, 14); cast.drop(...centre(reps), 0.7, 2.2); }, 360);
    E().sets.forEach((s, i) => setTimeout(() => { cast.beads[i].h.set(s.done || i === cur ? 1 : 0.42); cast.drop(cast.beads[i].x, cast.beads[i].y, 0.45, 1.4); }, 480 + i * 75));
    setTimeout(() => { cast.pill.h.set(1, 150, 15); cast.drop(...centre(go), 1, 3); }, 640);
  }
  const stagger = [['.top', 80], ['.title', 160], ['.mid', 380], ['.unit', 450], ['.sets span', 520], ['.go span', 700], ['.upnext', 760]];
  stagger.forEach(([sel, d]) => document.querySelectorAll(sel).forEach((el) => (el.style.transitionDelay = `${d}ms`)));
  requestAnimationFrame(() => requestAnimationFrame(() => app.classList.remove('is-intro')));
  setTimeout(() => document.querySelectorAll('[style*="transition-delay"]').forEach((el) => (el.style.transitionDelay = '')), 2000);
  setInterval(tick, 200); tick();

  let rt = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(rt); rt = requestAnimationFrame(() => { syncBeads(); beadTargets(); syncPill(); if (phase === 'rest') setHero(fmtT(rest.shown), { instant: true }); else if (phase !== 'done') showLift(true); }); });

  if (q.has('fps') && cast) {
    const el = $('fps'); el.hidden = false;
    setInterval(() => { const s = cast.stats(); el.textContent = `${(1000 / s.avgMs).toFixed(0)} fps\nworst ${s.worstMs.toFixed(1)} ms\nx${s.scale}`; }, 500);
  }
  window.__cast = cast;
}
boot();
