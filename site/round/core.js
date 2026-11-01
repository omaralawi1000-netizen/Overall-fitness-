/* Final design round: what all three shells share. Made-up but realistic data, a clock, the food parser, the
   workout engine with the Coach ladder, sheets and the stepper. Every number on screen is computed from this.
   Nothing is stored on the phone: this address also hosts old Aven. */
import { Channel, SPRINGS, play, fade, timers } from './motion.js';

export const pad = (n) => String(n).padStart(2, '0');
export const hhmm = (s) => `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}`;
export const mmss = (s) => `${Math.floor(Math.max(0, s) / 60)}:${pad(Math.max(0, Math.ceil(s)) % 60)}`;
export const kg = (w) => (Number.isInteger(w) ? String(w) : w.toFixed(1));
export const num = (n) => Math.round(n).toLocaleString('en-GB');
export const e1rm = (w, r) => w * (1 + r / 30);
export const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* ---------- The clock: the page opens at 14:52 and time runs from there. ---------- */
const OPEN = 14 * 3600 + 52 * 60;
const T0 = Date.now();
export const now = () => OPEN + (Date.now() - T0) / 1000;

/* ---------- Food: per 100 g (or per piece where `piece` is set). Danish foods first. ---------- */
export const FOODS = [
  { id: 'skyr', name: 'Skyr', da: ['skyr'], kcal: 63, p: 11, portion: 250, chips: [150, 250, 450] },
  { id: 'havre', name: 'Havregryn', da: ['havregryn', 'havre', 'oats', 'oatmeal'], kcal: 370, p: 13, portion: 60, chips: [40, 60, 90] },
  { id: 'aeg', name: 'Æg', da: ['æg', 'aeg', 'egg', 'eggs'], kcal: 70, p: 6.3, piece: 'egg', portion: 2, chips: [1, 2, 3] },
  { id: 'rug', name: 'Rugbrød', da: ['rugbrød', 'rugbrod', 'rye bread', 'skive', 'skiver'], kcal: 95, p: 2.9, piece: 'slice', portion: 2, chips: [1, 2, 3] },
  { id: 'kylling', name: 'Kyllingebryst', da: ['kylling', 'kyllingebryst', 'chicken'], kcal: 110, p: 23, portion: 150, chips: [100, 150, 200] },
  { id: 'hytteost', name: 'Hytteost', da: ['hytteost', 'cottage cheese'], kcal: 72, p: 13, portion: 200, chips: [100, 200, 250] },
  { id: 'banan', name: 'Banan', da: ['banan', 'banana', 'bananas'], kcal: 105, p: 1.3, piece: 'banana', portion: 1, chips: [1, 2] },
  { id: 'maelk', name: 'Letmælk', da: ['mælk', 'maelk', 'letmælk', 'milk'], kcal: 46, p: 3.5, unit: 'ml', portion: 250, chips: [200, 250, 500] },
];
export const food = (id) => FOODS.find((f) => f.id === id);
/** kcal and protein for an amount (grams/ml, or pieces when the food is counted). */
export function macros(f, amt) {
  const k = f.piece ? amt : amt / 100;
  return { kcal: f.kcal * k, p: f.p * k };
}
export const amtLabel = (f, a) => (f.piece ? `${a} ${f.piece}${a === 1 ? '' : 's'}` : `${a} ${f.unit || 'g'}`);

const WORDNUM = { en: 1, et: 1, one: 1, a: 1, to: 2, two: 2, tre: 3, three: 3, fire: 4, four: 4 };
/**
 * The phone's own parser: "200 g skyr og to æg", "skyr 200g, 2 eggs". Returns items, or null for anything it can't
 * read with confidence (that would go to the AI as an estimate in the real app).
 */
export function parseFood(text) {
  const parts = text.toLowerCase().replace(/\s+/g, ' ').split(/,| og | and |\+| & /).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  const items = [];
  for (const part of parts) {
    const f = FOODS.find((x) => x.da.some((n) => new RegExp(`(^|\\s)${n}(\\s|$)`).test(part)));
    if (!f) return null;
    const m = part.match(/(\d+(?:[.,]\d+)?)\s*(g|gram|ml|stk|skive|skiver)?/) || part.match(new RegExp(`(^|\\s)(${Object.keys(WORDNUM).join('|')})(\\s|$)`));
    let amt = f.portion;
    if (m) amt = m[1] && /\d/.test(m[1]) ? parseFloat(m[1].replace(',', '.')) : WORDNUM[m[2]];
    items.push({ f, amt });
  }
  return items;
}

/* ---------- The two days ---------- */
const at = (h, m = 0) => h * 3600 + m * 60;
function meals() {
  return [
    { t: at(6, 40), meal: 'Breakfast', items: [{ f: food('skyr'), amt: 250 }, { f: food('havre'), amt: 60 }, { f: food('banan'), amt: 1 }] },
    { t: at(11, 10), meal: 'Lunch', items: [{ f: food('rug'), amt: 3 }, { f: food('aeg'), amt: 2 }] },
  ];
}
export function createDay(kind) {
  const d = {
    kind, // 'train' | 'rest'
    date: kind === 'train' ? 'Tuesday 3 November' : 'Friday 6 November',
    short: kind === 'train' ? 'Tue 3 Nov' : 'Fri 6 Nov',
    target: { kcal: 2450, p: 180 },
    work: [[at(7), at(8, 30)], [at(12, 30), at(14, 45)]],
    session: kind === 'train' ? { name: 'Push', start: at(15, 30), end: at(16, 25), exercises: 5, minutes: 55 } : null,
    dinner: at(18, 30),
    log: meals(),
    water: 1250,
    week: [
      { d: 'M', kind: 'mat' }, { d: 'T', kind: 'gym', name: 'Push' }, { d: 'W', kind: 'mat' }, { d: 'T', kind: 'gym', name: 'Pull' },
      { d: 'F', kind: 'rest' }, { d: 'S', kind: 'gym', name: 'Legs' }, { d: 'S', kind: 'gym', name: 'Pull' },
    ],
    today: kind === 'train' ? 1 : 4,
  };
  return d;
}
export function eaten(d) {
  let kcal = 0, p = 0;
  for (const e of d.log) for (const it of e.items) { const m = macros(it.f, it.amt); kcal += m.kcal; p += m.p; }
  return { kcal, p };
}
export const left = (d) => { const e = eaten(d); return { kcal: Math.max(0, d.target.kcal - e.kcal), p: Math.max(0, d.target.p - e.p), over: e.kcal > d.target.kcal }; };
export const mealFor = (t) => (t < at(10, 30) ? 'Breakfast' : t < at(15) ? 'Lunch' : t < at(21) ? 'Dinner' : 'Snack');
export function addFood(d, items, t = now()) {
  const entry = { t, meal: mealFor(t), items, fresh: true };
  d.log.push(entry);
  return entry;
}
export function removeEntry(d, entry) { d.log = d.log.filter((e) => e !== entry); }
export const entryMacros = (e) => e.items.reduce((a, it) => { const m = macros(it.f, it.amt); return { kcal: a.kcal + m.kcal, p: a.p + m.p }; }, { kcal: 0, p: 0 });
export const entryName = (e) => e.items.map((it) => it.f.name).join(', ');

/** Food chips that change with the hour: around 15:00 it's snack and post-workout food. */
export const chipsNow = () => [
  { f: food('skyr'), amt: 250 }, { f: food('hytteost'), amt: 200 }, { f: food('banan'), amt: 1 },
  { f: food('kylling'), amt: 150 }, { f: food('rug'), amt: 2 }, { f: food('aeg'), amt: 2 },
];

/* ---------- The workout engine, with the Coach ladder ---------- */
export const REST = 40; // seconds; shortened from 2:00 so the prototype can be tried quickly
const BAR = 20;
export function plates(w) {
  let side = (w - BAR) / 2;
  const out = [];
  for (const p of [25, 20, 15, 10, 5, 2.5, 1.25]) while (side >= p - 1e-9) { out.push(p); side -= p; }
  return out;
}

export function createWorkout() {
  const ex = (name, w, r, n, last, barbell = false) => ({ name, barbell, sets: Array.from({ length: n }, () => ({ w, r, done: false })), last, best: null });
  const w = {
    started: null,
    exercises: [
      ex('Bench press', 80, 8, 4, [80, [8, 7, 7, 6]], true),
      ex('Incline dumbbell press', 30, 10, 3, [30, [10, 9, 9]]),
      ex('Overhead press', 50, 7, 3, [50, [7, 6, 6]], true),
      ex('Cable fly', 17.5, 12, 3, [17.5, [12, 12, 11]]),
      ex('Triceps pushdown', 35, 12, 3, [35, [12, 11, 10]]),
    ],
    cur: 0,
    phase: 'work', // 'work' | 'rest'
    rest: null, // { end, len }
    proposal: null, // the Coach's draft and what happened to it
    history: [], // every proposal and what became of it
    listeners: new Set(),
    t: timers(),
  };
  w.exercises[0].best = e1rm(80, 8);
  return w;
}
const emit = (w, kind, data) => w.listeners.forEach((fn) => fn(kind, data));
export const on = (w, fn) => { w.listeners.add(fn); return () => w.listeners.delete(fn); };
export const curEx = (w) => w.exercises[w.cur];
export const curIdx = (w) => curEx(w).sets.findIndex((s) => !s.done);
/** The set waiting to be logged, with the Coach's change applied only if it was accepted. */
export function nowSet(w) {
  const ex = curEx(w), i = curIdx(w);
  if (i < 0) return null;
  const s = ex.sets[i];
  const pr = w.proposal;
  const coach = pr && pr.state === 'accepted' && pr.ex === w.cur && pr.scope.includes(i);
  return { ex, i, n: i + 1, of: ex.sets.length, w: coach ? pr.to : s.w, r: s.r, coach, lastR: ex.last[1][i], lastW: ex.last[0] };
}
export function nextUp(w) {
  const ex = curEx(w), i = curIdx(w);
  if (i >= 0 && i + 1 < ex.sets.length) {
    const s = ex.sets[i + 1], pr = w.proposal;
    const coach = pr && pr.state === 'accepted' && pr.ex === w.cur && pr.scope.includes(i + 1);
    return { name: ex.name, n: i + 2, w: coach ? pr.to : s.w, r: s.r, same: true };
  }
  for (let j = w.cur + 1; j < w.exercises.length; j++) {
    const e = w.exercises[j], k = e.sets.findIndex((s) => !s.done);
    if (k >= 0) return { name: e.name, n: k + 1, w: e.sets[k].w, r: e.sets[k].r, same: false };
  }
  return null;
}
export function setValue(w, { dw = 0, dr = 0 }) {
  const ex = curEx(w), i = curIdx(w);
  if (i < 0) return;
  const s = ex.sets[i], pr = w.proposal;
  if (pr && pr.state === 'accepted' && pr.ex === w.cur && pr.scope.includes(i) && dw) {
    // Changing a Coach value by hand makes it yours: that set leaves the Coach's scope.
    s.w = pr.to; pr.scope = pr.scope.filter((x) => x !== i);
  }
  s.w = Math.max(0, s.w + dw); s.r = Math.max(1, s.r + dr);
  emit(w, 'value');
}

/** One tap: log the set exactly as shown, then rest. Never accepts a Coach change. */
export function logSet(w) {
  const ns = nowSet(w);
  if (!ns || w.phase !== 'work') return null;
  if (!w.started) w.started = now();
  const s = ns.ex.sets[ns.i];
  Object.assign(s, { w: ns.w, r: ns.r, done: true, at: now(), coach: ns.coach });
  const est = e1rm(ns.w, ns.r);
  s.record = ns.ex.best != null && est > ns.ex.best + 0.4;
  if (s.record) { s.prevBest = ns.ex.best; ns.ex.best = est; }
  const pr = w.proposal;
  if (pr && pr.ex === w.cur && pr.scope.includes(ns.i)) {
    if (pr.state === 'accepted') { pr.done.push({ w: ns.w, r: ns.r }); pr.scope = pr.scope.filter((x) => x !== ns.i); }
    if (pr.state === 'open') pr.scope = pr.scope.filter((x) => x !== ns.i); // logged at the old value: the draft waits
    if (!pr.scope.length) endScope(w, pr);
  }
  const exDone = curIdx(w) < 0;
  startRest(w);
  emit(w, 'logged', { set: s, ex: ns.ex, exDone });
  // The Coach drafts its change during the rest after bench set 2, when the bar is loaded and hands are free.
  if (w.cur === 0 && ns.i === 1 && !w.proposal) w.t.after(1300, () => propose(w));
  return s;
}
function endScope(w, pr) {
  if (pr.state === 'open') { pr.state = 'expired'; pr.log.push(['Expired', now()]); }
  else if (pr.state === 'accepted') { pr.state = 'completed'; pr.log.push(['Done', now()]); }
  emit(w, 'proposal');
}
function startRest(w) {
  w.phase = 'rest';
  w.rest = { end: now() + REST, len: REST };
  w.t.clear(w.restTimer);
  w.restTimer = w.t.every(200, () => { if (w.phase === 'rest' && now() >= w.rest.end) endRest(w, true); else emit(w, 'tick'); });
}
export function endRest(w, natural = false) {
  if (w.phase !== 'rest') return;
  w.t.clear(w.restTimer);
  w.phase = 'work'; w.rest = null;
  let moved = false;
  if (curIdx(w) < 0) {
    const j = w.exercises.findIndex((e, k) => k > w.cur && e.sets.some((s) => !s.done));
    if (j >= 0) { w.cur = j; moved = true; }
  }
  if (natural) buzz([90, 70, 90]);
  emit(w, 'rest-end', { natural, moved });
}
export function nudgeRest(w, secs) {
  if (w.phase !== 'rest') return;
  w.rest.end = Math.max(now() + 1, w.rest.end + secs);
  w.rest.len = Math.max(w.rest.len, w.rest.end - now());
  emit(w, 'tick');
}
export const restLeft = (w) => (w.rest ? Math.max(0, w.rest.end - now()) : 0);

function propose(w) {
  if (w.cur !== 0) return;
  const ex = curEx(w), rem = ex.sets.map((s, i) => (s.done ? -1 : i)).filter((i) => i >= 0);
  if (!rem.length) return;
  w.proposal = {
    ex: 0, from: ex.sets[rem[0]].w, to: ex.sets[rem[0]].w + 2.5, scope: rem, scope0: rem.slice(),
    reason: 'Sets 1 and 2 moved fast, with reps to spare.', state: 'open', arrived: performance.now(), done: [],
    log: [['Proposed', now()]],
  };
  w.history.unshift(w.proposal);
  emit(w, 'proposal', { arrived: true });
}
/** Accepting is its own deliberate action, and ignores taps for the first 0.5 s so a stray tap can't land on it. */
export const GUARD = 500;
export function accept(w) {
  const pr = w.proposal;
  if (!pr || pr.state !== 'open' || performance.now() - pr.arrived < GUARD) return false;
  pr.state = 'accepted'; pr.log.push(['Accepted', now()]);
  emit(w, 'proposal', { accepted: true });
  return true;
}
export function keep(w) {
  const pr = w.proposal;
  if (!pr || pr.state !== 'open') return;
  pr.state = 'kept'; pr.log.push(['Kept ' + kg(pr.from), now()]);
  emit(w, 'proposal', { kept: true });
}
/** Undo puts back the plan for sets not yet done. A logged set stays: it is real, and changes only by editing it. */
export function undo(w) {
  const pr = w.proposal;
  if (!pr || pr.state !== 'accepted') return;
  pr.state = 'undone'; pr.log.push(['Undone', now()]);
  emit(w, 'proposal', { undone: true });
}
export const scopeLine = (pr, exName = 'Bench') => {
  const s = pr.scope0.map((i) => i + 1);
  return `${exName}, ${s.length > 1 ? `sets ${s[0]}–${s[s.length - 1]}` : `set ${s[0]}`}, today`;
};
export const historyLine = (pr) => {
  const base = `${kg(pr.from)} → ${kg(pr.to)} kg`;
  switch (pr.state) {
    case 'open': return { what: base, status: 'Waiting for you' };
    case 'accepted': return { what: base, status: pr.done.length ? `Accepted · done ${pr.done.map((d) => `${kg(d.w)} × ${d.r}`).join(', ')}` : 'Accepted' };
    case 'completed': return { what: base, status: `Done ${pr.done.map((d) => `${kg(d.w)} × ${d.r}`).join(', ')}` };
    case 'kept': return { what: base, status: `You kept ${kg(pr.from)}` };
    case 'undone': return { what: base, status: pr.done.length ? `Undone after ${pr.done.length} set${pr.done.length > 1 ? 's' : ''}` : 'Undone' };
    case 'expired': return { what: base, status: 'Not used' };
    default: return { what: base, status: '' };
  }
};
export const elapsed = (w) => (w.started ? mmss(now() - w.started) : '0:00');

/* ---------- Phone extras: a buzz is a bonus (Android only), and the screen stays on during a workout. ---------- */
export function buzz(p = 12) { try { navigator.vibrate?.(p); } catch { /* not on iPhone */ } }
let lock = null;
export async function keepAwake(onOff) {
  try {
    if (onOff && !lock && 'wakeLock' in navigator) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); }
    if (!onOff && lock) { await lock.release(); lock = null; }
  } catch { lock = null; }
}

/* ---------- A sheet: rises from the bottom, follows the finger when dragged, lets go with the finger's speed. ---------- */
export function sheet(host, { cls = '', html = '', onClose, label = 'Sheet' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = `sheet-wrap ${cls}`;
  wrap.innerHTML = `<div class="scrim"></div><section class="sheet" role="dialog" aria-label="${esc(label)}"><div class="grab" aria-hidden="true"></div><div class="sheet-body">${html}</div></section>`;
  host.append(wrap);
  const sc = wrap.firstChild, sh = wrap.lastChild;
  const h = () => sh.getBoundingClientRect().height + 40;
  const y = new Channel(sh, 'translate', (v) => `0 ${v}px`, h());
  const op = new Channel(sc, 'opacity', (v) => String(v), 0);
  y.to(0, SPRINGS.lift); op.to(1, SPRINGS.set);
  let closed = false;
  const close = (v) => {
    if (closed) return; closed = true;
    wrap.style.pointerEvents = 'none';
    const a = y.to(h(), SPRINGS.set, v != null ? { v } : {});
    op.to(0, SPRINGS.set);
    const done = () => { wrap.remove(); onClose?.(); };
    a ? a.finished.then(done, done) : done();
  };
  sc.addEventListener('click', () => close());
  // Drag down on the grab area or the sheet's top to dismiss; the spring takes over with the finger's speed.
  let start = null, last = null;
  sh.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, input, .no-drag') && !e.target.closest('.grab')) return;
    if (sh.querySelector('.sheet-body').scrollTop > 0) return;
    start = { y: e.clientY, at: y.now().x }; last = [{ y: e.clientY, t: e.timeStamp }];
    sh.setPointerCapture(e.pointerId);
  });
  sh.addEventListener('pointermove', (e) => {
    if (!start) return;
    const d = e.clientY - start.y;
    const v = start.at + d;
    y.set(v < 0 ? v * 0.15 : v); // resists being pulled up past its place
    last.push({ y: e.clientY, t: e.timeStamp }); if (last.length > 5) last.shift();
  });
  const up = () => {
    if (!start) return;
    const a = last[0], b = last[last.length - 1];
    const v = b.t > a.t ? ((b.y - a.y) / (b.t - a.t)) * 1000 : 0;
    const pos = y.now().x;
    start = null;
    if (pos > 110 || v > 700) close(v); else y.to(0, SPRINGS.lift, { v });
  };
  sh.addEventListener('pointerup', up); sh.addEventListener('pointercancel', up);
  return { el: sh, wrap, close, body: sh.querySelector('.sheet-body') };
}

/** A gym-sized stepper for weight and reps: never the phone keyboard. */
export function stepper(host, w, { cls = '', roll, onDone } = {}) {
  const ns = nowSet(w);
  const s = sheet(host, {
    cls, label: 'Change weight and reps',
    html: `<h2 class="st-title">${esc(ns.ex.name)} · set ${ns.n}</h2>
      <div class="st-row"><button class="st-b" data-d="w-">−2.5</button><div class="st-v"><span class="st-num" data-v="w">${kg(ns.w)}</span><span class="st-u">kg</span></div><button class="st-b" data-d="w+">+2.5</button></div>
      <div class="st-row"><button class="st-b" data-d="r-">−1</button><div class="st-v"><span class="st-num" data-v="r">${ns.r}</span><span class="st-u">reps</span></div><button class="st-b" data-d="r+">+1</button></div>
      <button class="st-done">Done</button>`,
    onClose: onDone,
  });
  s.body.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('st-done')) return s.close();
    const d = b.dataset.d;
    setValue(w, d[0] === 'w' ? { dw: d[1] === '+' ? 2.5 : -2.5 } : { dr: d[1] === '+' ? 1 : -1 });
    const n2 = nowSet(w);
    roll(s.body.querySelector('[data-v="w"]'), kg(n2.w), { dir: d === 'w-' ? -1 : 1 });
    roll(s.body.querySelector('[data-v="r"]'), String(n2.r), { dir: d === 'r-' ? -1 : 1 });
    buzz(8);
  });
  return s;
}

/** A short line at the bottom that says what just happened, with Undo. Replaces the previous one. */
export function toast(host, text, { undo: onUndo, ms = 5000, cls = '' } = {}) {
  host.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = `toast ${cls}`;
  t.setAttribute('role', 'status');
  t.innerHTML = `<span>${text}</span>${onUndo ? '<button class="toast-undo">Undo</button>' : ''}`;
  host.append(t);
  play(t, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], SPRINGS.set);
  const id = setTimeout(() => go(), ms);
  const go = () => { clearTimeout(id); fade(t, 1, 0, 140).finished.then(() => t.remove(), () => t.remove()); };
  t.querySelector('.toast-undo')?.addEventListener('click', () => { onUndo(); go(); });
  return go;
}

/** Slide to accept: a thumb you drag to the end. Tapping doesn't do it; a quick flick past halfway does. */
export function slider(el, onDone, { guard = () => true } = {}) {
  const knob = el.querySelector('.slide-knob'), fill = el.querySelector('.slide-fill');
  const max = () => el.clientWidth - knob.offsetWidth - 8;
  const x = new Channel(knob, 'translate', (v) => `${v}px 0`, 0);
  const f = new Channel(fill, 'scale', (v) => `${v} 1`, 0);
  let st = null, last = [];
  const setX = (v) => { x.set(v); f.set(Math.max(0, v / max())); };
  el.addEventListener('pointerdown', (e) => {
    if (!guard()) return;
    st = { x: e.clientX, at: x.now().x }; last = [{ x: e.clientX, t: e.timeStamp }];
    el.setPointerCapture(e.pointerId); el.classList.add('held');
  });
  el.addEventListener('pointermove', (e) => {
    if (!st) return;
    setX(Math.max(0, Math.min(max(), st.at + e.clientX - st.x)));
    last.push({ x: e.clientX, t: e.timeStamp }); if (last.length > 5) last.shift();
  });
  const up = () => {
    if (!st) return;
    st = null; el.classList.remove('held');
    const a = last[0], b = last[last.length - 1];
    const v = b.t > a.t ? ((b.x - a.x) / (b.t - a.t)) * 1000 : 0;
    const p = x.now().x / max();
    if (p > 0.92 || (p > 0.5 && v > 500)) { x.to(max(), SPRINGS.type, { v }); f.to(1, SPRINGS.type); buzz(14); onDone(); }
    else { x.to(0, SPRINGS.lift, { v }); f.to(0, SPRINGS.lift); }
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  // Keyboard and screen readers: Enter or Space accepts (the slide is for fingers).
  el.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && guard()) { e.preventDefault(); onDone(); } });
  return { reset() { x.set(0); f.set(0); } };
}

/** The honest answer for anything the prototype's Coach can't do (the real one sends it to the AI). */
export const COACH_PROTO = 'In this prototype the Coach only logs food, water and weight. The real Coach answers questions like this from your data.';
export function parseLog(text) {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  let m = t.match(/^(?:vand|water)\s*(\d+)\s*(?:ml)?$|^(\d+)\s*ml\s*(?:vand|water)$/);
  if (m) return { kind: 'water', ml: parseInt(m[1] || m[2], 10) };
  m = t.match(/^(?:vægt|weight|weigh(?:ed)?)\s*(\d+(?:[.,]\d)?)\s*(?:kg)?$/);
  if (m) return { kind: 'weight', kg: parseFloat(m[1].replace(',', '.')) };
  if (/^\d+\s*(at|x|×|på)\s*\d+/.test(t)) return { kind: 'set' };
  const f = parseFood(t);
  if (f) return { kind: 'food', items: f };
  return { kind: 'ask' };
}

/* ---------- History for Progress (made up, computed) ---------- */
export const BENCH_WEEKS = [[75, 8], [75, 9], [77.5, 8], [77.5, 8], [80, 7], [80, 8], [80, 8], [80, 7]];
export const WEIGHT_WEEKS = [94.9, 94.6, 94.5, 94.1, 94.0, 93.8, 93.9, 93.5];
export const MAT_MINUTES = [90, 75, 90, 90, 60];
/** A plain line chart as SVG: the last point is marked and labelled. */
export function chart(vals, { w = 344, h = 120, fmt = (v) => v.toFixed(1), cls = '' } = {}) {
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.15 || 1;
  const X = (i) => 8 + (i * (w - 56)) / (vals.length - 1), Y = (v) => 10 + (1 - (v - lo + pad) / (hi - lo + 2 * pad)) * (h - 30);
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const L = vals.length - 1;
  return `<svg class="chart ${cls}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Last ${vals.length} weeks, now ${fmt(vals[L])}">
    <path d="${d}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${X(L)}" cy="${Y(vals[L])}" r="5" fill="currentColor"/>
    <text x="${X(L) + 10}" y="${Y(vals[L]) + 5}" font-size="14" font-weight="700" fill="currentColor">${fmt(vals[L])}</text>
    <text x="8" y="${h - 2}" font-size="12" fill="currentColor" opacity=".6">8 weeks ago</text>
    <text x="${w - 48}" y="${h - 2}" font-size="12" fill="currentColor" opacity=".6" text-anchor="end">This week</text>
  </svg>`;
}
export const demoSwitch = (kind) => `<div class="demo">Prototype only: this is a ${kind === 'train' ? 'training day' : 'rest day'}.<button data-demo="${kind === 'train' ? 'rest' : 'train'}">Show a ${kind === 'train' ? 'rest day' : 'training day'} instead</button></div>`;
