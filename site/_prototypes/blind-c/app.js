// The workout screen. Made-up data only; nothing is stored anywhere.
import { Sand, easeInOut } from './sand.js';

const q = new URLSearchParams(location.search);
const LANG = q.get('lang') === 'da' ? 'da' : 'en';
const REST = q.has('rest') ? Math.max(4, Number(q.get('rest')) || 4) : 0;
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.lang = LANG;

const TXT = {
  en: {
    ex: { squat: 'Back squat', bench: 'Bench press', incline: 'Incline dumbbell press' },
    setOf: (n, m) => `Set ${n} of ${m}`,
    restBefore: (n, m) => `Rest, then set ${n} of ${m}`,
    restBeforeEx: (name) => `Rest, then ${name.toLowerCase()}`,
    next: (w, r) => `Next ${w} kg × ${r}`,
    last: (w, r) => `Last time ${w} kg × ${r}`,
    hint: 'tap the numbers to change',
    log: (n) => `Log set ${n}`,
    skip: 'Skip rest',
    again: 'Start over',
    kg: 'kg',
    minus: '−15 s', plus: '+15 s',
    weight: 'Weight', repsL: 'Reps', done: 'Done',
    best: 'New best',
    bestSub: (now, was) => `Estimated max ${now} kg, up from ${was}`,
    edit: (w, r) => `${w} kilos, ${r} reps. Tap to change`,
    doneTitle: 'Workout done',
    time: 'Time', volume: 'Volume', sets: 'Sets', bests: 'New bests',
    logged: (n, rest) => `Set ${n} logged. Rest ${rest}.`,
    restOver: (n) => `Rest over. Set ${n}.`,
  },
  da: {
    ex: { squat: 'Squat', bench: 'Bænkpres', incline: 'Skråbænkpres med håndvægte' },
    setOf: (n, m) => `Sæt ${n} af ${m}`,
    restBefore: (n, m) => `Pause, så sæt ${n} af ${m}`,
    restBeforeEx: (name) => `Pause, så ${name.toLowerCase()}`,
    next: (w, r) => `Næste ${w} kg × ${r}`,
    last: (w, r) => `Sidst ${w} kg × ${r}`,
    hint: 'tryk på tallene for at ændre',
    log: (n) => `Log sæt ${n}`,
    skip: 'Spring pausen over',
    again: 'Start forfra',
    kg: 'kg',
    minus: '−15 s', plus: '+15 s',
    weight: 'Vægt', repsL: 'Gentagelser', done: 'Færdig',
    best: 'Ny rekord',
    bestSub: (now, was) => `Anslået max ${now} kg, før ${was}`,
    edit: (w, r) => `${w} kilo, ${r} gentagelser. Tryk for at ændre`,
    doneTitle: 'Træning færdig',
    time: 'Tid', volume: 'Volumen', sets: 'Sæt', bests: 'Nye rekorder',
    logged: (n, rest) => `Sæt ${n} logget. Pause ${rest}.`,
    restOver: (n) => `Pausen er slut. Sæt ${n}.`,
  },
}[LANG];

const nf = new Intl.NumberFormat(LANG === 'da' ? 'da-DK' : 'en-GB', { maximumFractionDigits: 1 });
const fmt = (n) => nf.format(n);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const e1rm = (w, r) => w * (1 + r / 30);

// ---------- made-up workout ----------

const DATA = {
  elapsed: 34 * 60 + 12,
  exercises: [
    { id: 'squat', sky: 'bench', pal: [1, 2, 3], rest: 150, best: [125, 5], last: [[120, 5], [120, 5], [120, 5]],
      sets: [[120, 5], [120, 5], [120, 5]], done: 3 },
    { id: 'bench', sky: 'bench', pal: [4, 5, 6], rest: 120, best: [100, 5], last: [[95, 5], [100, 5], [100, 5], [100, 5]],
      sets: [[95, 5], [100, 5], [100, 5], [102.5, 5]], done: 2 },
    { id: 'incline', sky: 'incline', pal: [7, 8, 9], rest: 90, best: [32, 10], last: [[30, 8], [30, 8], [30, 8]],
      sets: [[32, 8], [32, 8], [32, 8]], done: 0 },
  ],
};

const SKY = {
  bench: { zen: '#04071c', mid: '#141d52', low: '#2c2a62', glow: '#ff8a34', pore: '#2b150e', glowAmt: 0.68 },
  incline: { zen: '#06041b', mid: '#211650', low: '#45285f', glow: '#ff7446', pore: '#2b130f', glowAmt: 0.68 },
  rest: { zen: '#03051a', mid: '#0c1446', low: '#242764', glow: '#c4513c', pore: '#24120c', glowAmt: 0.38 },
  done: { zen: '#020312', mid: '#0a0f35', low: '#1f2158', glow: '#b8473a', pore: '#1f0f0a', glowAmt: 0.32 },
};
const LOOK = {
  sand: { alb: '#f4d3a1', emit: '#ff9a55', spec: 0.25 },
  gold: { alb: '#ffd469', emit: '#ffb03a', spec: 1.15 },
};
const LIGHT = [-0.55, -0.75, 0.7];
const PAL = ['#000000', '#c97a50', '#b5643f', '#d68f62', '#efc68f', '#e0a86e', '#f3d6a8', '#e7a796', '#d98f86', '#efbfa9',
  '#f6c552', '#6e3828', '#5b2c22', '#7e4532', '#4d261f', '#8a523b'];

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const skyRGB = (s) => ({ zen: rgb(s.zen), mid: rgb(s.mid), low: rgb(s.low), glow: rgb(s.glow), pore: rgb(s.pore), glowAmt: s.glowAmt });

// ---------- elements ----------

const $ = (id) => document.getElementById(id);
const el = {
  canvas: $('sand'), exName: $('exName'), sub: $('sub'), clock: $('clock'), figure: $('figure'), capW: $('capW'),
  note: $('note'), restbar: $('restbar'), minus: $('minus'), plus: $('plus'), best: $('best'), bestTitle: $('bestTitle'),
  bestSub: $('bestSub'), labels: $('labels'), summary: $('summary'), sumTitle: $('sumTitle'), sumList: $('sumList'),
  main: $('main'), scrim: $('scrim'), tray: $('tray'), rollW: $('rollW'), rollR: $('rollR'), live: $('live'),
};

el.minus.textContent = TXT.minus;
el.plus.textContent = TXT.plus;
$('lblW').textContent = TXT.weight;
$('lblR').textContent = TXT.repsL;
$('trayDone').textContent = TXT.done;
el.bestTitle.textContent = TXT.best;
el.sumTitle.textContent = TXT.doneTitle;

let sand;
try { sand = new Sand(el.canvas); } catch {
  $('nogl').hidden = false;
  throw new Error('WebGL 2 is not available');
}
for (let i = 0; i < PAL.length; i++) sand.setPalette(i, PAL[i]);

const measureCtx = document.createElement('canvas').getContext('2d');
function uiWidth(text, px, weight = 600) { measureCtx.font = `${weight} ${px}px Archivo`; return measureCtx.measureText(text).width; }
function sandWidth(text, px) { measureCtx.font = `900 ${px}px Archivo`; measureCtx.fontStretch = 'expanded'; const w = measureCtx.measureText(text).width; measureCtx.fontStretch = 'normal'; return w; }

// ---------- geometry ----------

let G;
function geometry() {
  const W = innerWidth, H = innerHeight;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px)';
  document.body.append(probe);
  const safeB = probe.getBoundingClientRect().height;
  probe.remove();
  const k = Math.min(1, W / 384, H / 800);
  const top = H * 0.405;
  return { W, H, k, safeB, by1: top, byC: top + 26 * k, s1max: Math.round(156 * k), figY: top - 50 * k,
    bedrock: safeB + 18 + 66 + 12 };
}

// the biggest size at which the widest weight of this exercise (and its number, with "kg") fits
function figSize(ex) {
  let s = G.s1max;
  const widest = Math.max(...ex.sets.map(([w]) => sandWidth(fmt(w), 100)));
  s = Math.min(s, Math.floor(((G.W - 96) / widest) * 100));
  return Math.max(60, s);
}

function cdSize() { return Math.min(G.s1max, Math.floor(((G.W - 56) / sandWidth('0:00', 100)) * 100)); }

// ---------- state ----------

let plan, st;
const now = () => performance.now() / 1000;

function reset() {
  plan = structuredClone(DATA);
  st = { ex: 1, set: 2, phase: 'work', busy: 0, bests: 0, t0: now(), shownClock: '', restId: 0 };
}

const ex = () => plan.exercises[st.ex];
const cur = () => ex().sets[st.set];
const totalSets = () => plan.exercises.reduce((s, e) => s + e.done, 0);

// ---------- small motion helpers ----------

const EASE = 'cubic-bezier(.23,1,.32,1)';
function swap(node, text) {
  if (node.textContent === text) return;
  if (REDUCE) { node.textContent = text; return; }
  node.getAnimations().forEach((a) => a.cancel());
  const out = node.animate([{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(5px)' }], { duration: 140, easing: 'ease-in', fill: 'forwards' });
  out.onfinish = () => {
    node.textContent = text;
    out.cancel();
    node.animate([{ opacity: 0, filter: 'blur(5px)', transform: 'translateY(4px)' }, { opacity: 1, filter: 'blur(0px)', transform: 'none' }], { duration: 300, easing: EASE });
  };
}

function setMain(text) {
  const lbl = el.main.querySelector('.lbl:not(.old)');
  el.main.setAttribute('aria-label', text);
  if (lbl.textContent === text) return;
  if (!lbl.textContent || REDUCE) { lbl.textContent = text; return; }
  const old = lbl.cloneNode(true);
  old.classList.add('old');
  el.main.append(old);
  lbl.textContent = text;
  old.animate([{ opacity: 1, filter: 'blur(0px)', transform: 'none' }, { opacity: 0, filter: 'blur(6px)', transform: 'translateY(-8px)' }],
    { duration: 220, easing: EASE, fill: 'forwards' }).onfinish = () => old.remove();
  lbl.animate([{ opacity: 0, filter: 'blur(6px)', transform: 'translateY(8px)' }, { opacity: 1, filter: 'blur(0px)', transform: 'none' }],
    { duration: 320, delay: 40, easing: EASE, fill: 'backwards' });
}

function fade(node, on, dy = 6) {
  node.style.transition = 'opacity .3s cubic-bezier(.23,1,.32,1), transform .45s cubic-bezier(.23,1,.32,1)';
  node.style.opacity = on ? '' : '0';
  node.style.transform = on ? '' : `translateY(${dy}px)`;
}

function haptic(p) { try { navigator.vibrate?.(p); } catch { /* not on this device */ } }
function say(text) { el.live.textContent = text; }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- scene ----------

function figureLines(w, r) {
  const s1 = st.fig, s2 = Math.round(s1 * 0.56);
  const by2 = G.by1 + 24 * G.k + s2 * 0.74;
  return [
    { id: 'w', text: fmt(w), size: s1, cx: G.W / 2, by: G.by1 },
    { id: 'r', text: `×${r}`, size: s2, cx: G.W / 2, by: by2 },
  ];
}

function placeFigure(boxes) {
  const w = boxes.w, r = boxes.r;
  el.capW.style.left = `${Math.min(G.W - 34, w.right + 9)}px`;
  el.capW.style.top = `${w.bottom - 21}px`;
  el.figure.style.top = `${w.top - 16}px`;
  el.figure.style.height = `${r.bottom - w.top + 34}px`;
  el.note.style.top = `${r.bottom + 26 * G.k}px`;
  st.figBox = { top: w.top, bottom: r.bottom };
}

function showSet(opts = {}) {
  const [w, r] = cur();
  st.fig = figSize(ex());
  const lines = figureLines(w, r);
  sand.figC = [G.W / 2, G.figY];
  const boxes = sand.setFigure(lines, {
    matchAll: true, spawn: REDUCE ? 'near' : 'air', spawnDelay: opts.delay || 0, spawnOmega: 5.4, omega: 9, surplus: 'dissolve',
  });
  placeFigure(boxes);
  el.capW.textContent = TXT.kg;
  const last = ex().last[st.set];
  // the first set also says once that the numbers can be changed
  const lastText = [last ? TXT.last(fmt(last[0]), last[1]) : '', st.hinted ? '' : TXT.hint].filter(Boolean).join('\n');
  // the words arrive once the sand has nearly settled
  fade(el.note, false, 0); fade(el.capW, false, 0);
  const shown = st.showId = (st.showId || 0) + 1;
  setTimeout(() => {
    if (st.showId !== shown || st.phase !== 'work') return;
    fade(el.capW, true);
    el.note.textContent = lastText;
    fade(el.note, true, 4);
  }, REDUCE ? 0 : 700 + (opts.delay || 0) * 1000);
  swap(el.exName, TXT.ex[ex().id]);
  swap(el.sub, TXT.setOf(st.set + 1, ex().sets.length));
  setMain(TXT.log(st.set + 1));
  el.figure.disabled = false;
  el.figure.setAttribute('aria-label', TXT.edit(fmt(w), r));
}

function pourDone() {
  const W = G.W;
  sand.shapeGround((x) => 4 + 4 * Math.sin(x / 47 + 0.6) + 2.5 * Math.sin(x / 17 + 2));
  const beds = 8, thick = G.bedrock / beds;
  for (let i = 0; i < beds; i++) {
    const t = thick * (0.7 + ((i * 7) % 5) * 0.15);
    sand.pour(11 + (i % 5), Math.round(1.2 * W * t), t, (rr) => rr() * W);
  }
  const lens = (rr) => {
    const u = rr() < 0.85 ? rr() * W : W / 2 + (rr() + rr() + rr() - 1.5) * W * 0.42;
    return Math.max(0, Math.min(W - 0.01, u));
  };
  for (let e = 0; e < plan.exercises.length; e++) {
    const x = plan.exercises[e];
    for (let i = 0; i < x.done; i++) {
      const [w, rp] = x.sets[i];
      const thickL = 13 * G.k;
      sand.pour(x.pal[i % 3], Math.round(1.25 * W * thickL), thickL, lens);
      label(sand.endLayer({ ex: e, set: i, w, r: rp }), 0);
    }
  }
}

const placed = [];
function freeY(y) {
  if (!Number.isFinite(y)) return y;
  for (let k = 0; k < 24 && placed.some((p) => Math.abs(p - y) < 14); k++) y -= 3;
  placed.push(y);
  return y;
}

function label(rec, delay) {
  if (!rec) return;
  const at = sand.layerAt(rec, G.W - 56);
  const mid = freeY(G.H - (at.bottom + at.top) / 2);
  const tag = document.createElement('span');
  tag.className = 'lay hidden';
  tag.dataset.ex = rec.ex;
  tag.textContent = `${fmt(rec.w)} × ${rec.r}`;
  tag.style.top = `${mid}px`;
  if (rec.ex === st.ex) el.labels.append(tag);
  if (rec.set === 0) {
    const atL = sand.layerAt(rec, 60);
    const name = document.createElement('span');
    name.className = 'lay ex hidden';
    name.textContent = TXT.ex[plan.exercises[rec.ex].id];
    name.style.top = `${G.H - (atL.bottom + atL.top) / 2}px`;
    el.labels.append(name);
    setTimeout(() => name.classList.remove('hidden'), delay);
  }
  setTimeout(() => tag.classList.remove('hidden'), delay);
}

function build() {
  G = geometry();
  sand.resize(G.W, G.H, G.H);
  sand.figC = [G.W / 2, G.figY];
  el.labels.textContent = '';
  placed.length = 0;
  sand.u.rot = 0;
  sand.u.light = LIGHT.slice();
  Object.assign(sand.u, { alb: rgb(LOOK.sand.alb), emit: rgb(LOOK.sand.emit), spec: LOOK.sand.spec, heat: 1 });
  sand.sky = null;
  sand.skyTo(skyRGB(SKY[ex().sky]), 0.01);
  pourDone();
  el.restbar.style.top = `${G.byC + 70 * G.k}px`;
  warmGlyphs();
}

// Cut every glyph this workout can need while the phone is idle, so a tap never waits for one: the countdown first,
// then each exercise's weight and reps sizes (all digits, since the tray can change any of them).
let warmQueue = [];
function warmGlyphs() {
  const idle = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 60));
  const start = !warmQueue.length;
  warmQueue = [];
  const digits = [...'0123456789'];
  for (const c of [...digits, ':']) warmQueue.push([c, cdSize()]);
  for (const x of [ex(), ...plan.exercises.filter((e) => e !== ex())]) {
    const s1 = figSize(x), s2 = Math.round(s1 * 0.56);
    for (const c of [...digits, fmt(0.5)[1]]) warmQueue.push([c, s1]);
    for (const c of [...digits, '×']) warmQueue.push([c, s2]);
  }
  const run = (dl) => {
    while (warmQueue.length && dl.timeRemaining() > 3) sand.glyph(...warmQueue.shift());
    if (warmQueue.length) idle(run);
  };
  if (start) idle(run);
}

// "New best" sits in the open sky above the numbers, clear of both the set and the countdown that follows it
function placeBest() {
  const head = document.querySelector('.top').getBoundingClientRect().bottom;
  const numbersTop = Math.min(st.figBox.top, G.byC - cdSize() * 0.74);
  el.best.style.top = `${Math.max(head + 14, numbersTop - 26 * G.k - el.best.offsetHeight)}px`;
}

// ---------- moments ----------

function logSet() {
  st.hinted = true;
  const x = ex(), [w, r] = cur();
  const record = e1rm(w, r) > e1rm(...x.best) + 1e-6;
  const was = e1rm(...x.best);
  x.done = st.set + 1;
  st.volume = (st.volume || 0) + w * r;
  haptic(record ? [24, 50, 24, 50, 60] : 14);
  el.figure.disabled = true;
  closeTray();
  const lastSet = st.set === x.sets.length - 1 && st.ex === plan.exercises.length - 1;
  st.layerMeta = { ex: st.ex, set: st.set, w, r };
  st.pal = record ? 10 : x.pal[st.set % 3];
  if (record) {
    x.best = [w, r];
    st.bests++;
    st.busy = now() + 2.3;
    recordMoment(e1rm(w, r), was).then(() => (lastSet ? finish() : startRest()));
  } else if (lastSet) finish();
  else startRest();
}

async function recordMoment(nowMax, was) {
  el.bestSub.textContent = TXT.bestSub(fmt(Math.round(nowMax * 10) / 10), fmt(Math.round(was * 10) / 10));
  placeBest();
  el.best.classList.add('on');
  fade(el.capW, false); fade(el.note, false);
  const g = LOOK.gold;
  sand.tween('alb', rgb(g.alb), 0.45);
  sand.tween('emit', rgb(g.emit), 0.45);
  sand.tween('spec', g.spec, 0.45);
  if (REDUCE) { await wait(900); return; }
  sand.u.light = [-0.9, -0.5, 0.45];
  sand.tween('light', [0.9, -0.5, 0.45], 2.1, easeInOut);
  sand.tween('rot', Math.PI * 2, 2.1, easeInOut, () => { sand.u.rot = 0; });
  await wait(2150);
}

function startRest() {
  const x = ex();
  const N = sand.figureCount();
  st.restTotal = REST || x.rest;
  st.restEnd = now() + st.restTotal;
  st.cd = cdSize();
  st.cdText = clock(st.restTotal);
  const full = [...st.cdText].reduce((s, c) => s + sand.glyph(c, st.cd).n, 0);
  st.d0 = 0.9;
  sand.beginLayer(st.pal, N * 0.1 + full * st.d0, 13 * G.k);
  st.warm = false;
  st.phase = 'rest';
  const top = st.figBox.top, bottom = st.figBox.bottom;
  sand.setFigure([cdLine(st.cdText, st.d0)], {
    matchAll: true, omega: 7, burst: REDUCE ? 0 : 70, surplus: 'fall', fallOver: 0.5, spread: 70, shed: 0.1,
    stagger: (x0, y) => Math.max(0, Math.min(1, (bottom - y) / (bottom - top))) * 0.22,
  });
  sand.tween('heat', 0.5, 1.4);
  sand.tween('light', LIGHT.slice(), 0.8);
  sand.skyTo(skyRGB(SKY.rest), 1.6);
  fade(el.capW, false);
  const next = nextSet();
  // "Next …" waits until the reps have poured away, so it never sits on top of them
  fade(el.note, false);
  const id = ++st.restId;
  setTimeout(() => {
    if (st.phase !== 'rest' || st.restId !== id) return;
    el.note.style.top = `${G.byC + 30 * G.k}px`;
    el.note.textContent = TXT.next(fmt(next.w), next.r);
    fade(el.note, true);
  }, REDUCE ? 0 : 850);
  swap(el.sub, next.newEx ? TXT.restBeforeEx(TXT.ex[next.ex.id]) : TXT.restBefore(next.n, x.sets.length));
  setMain(TXT.skip);
  setTimeout(() => st.phase === 'rest' && el.restbar.classList.add('on'), 260);
  if (el.best.classList.contains('on')) setTimeout(() => el.best.classList.remove('on'), 5000);
  say(TXT.logged(st.set + 1, clock(st.restTotal)));
  st.busy = Math.max(st.busy, now() + 0.6);
}

function cdLine(text, dens) { return { id: 'cd', text, size: st.cd, cx: G.W / 2, by: G.byC, tabular: true, dens }; }

function nextSet() {
  const x = ex();
  if (st.set + 1 < x.sets.length) { const [w, r] = x.sets[st.set + 1]; return { w, r, n: st.set + 2, newEx: false }; }
  const nx = plan.exercises[st.ex + 1];
  const [w, r] = nx.sets[0];
  return { w, r, n: 1, newEx: true, ex: nx };
}

function restTick() {
  if (st.phase !== 'rest') return;
  const left = st.restEnd - now();
  if (left <= 0) { endRest(false); return; }
  const text = clock(Math.ceil(left));
  if (text !== st.cdText) {
    st.cdText = text;
    const frac = Math.max(0, Math.min(1, left / st.restTotal));
    sand.setFigure([cdLine(text, st.d0 * (0.38 + 0.62 * frac))], { omega: 15, surplus: 'fall', fallOver: 0.95, spread: 38, spawn: 'near' });
  }
  const warmAt = Math.min(10, st.restTotal * 0.25);
  if (!st.warm && left < warmAt) {
    st.warm = true;
    const n = nextSet();
    sand.skyTo(skyRGB(SKY[(n.newEx ? n.ex : ex()).sky]), left);
    sand.tween('heat', 0.95, left);
  }
}

function endRest(skipped) {
  st.phase = 'switch';
  el.restbar.classList.remove('on');
  sand.dropFigure({ over: skipped ? 0.35 : 0.45, spread: 85 });
  label(sand.endLayer(st.layerMeta), 1000);
  el.best.classList.remove('on');
  const n = nextSet();
  if (n.newEx) {
    st.ex++; st.set = 0;
    el.labels.querySelectorAll('[data-ex]').forEach((t) => t.classList.add('hidden'));
  } else st.set++;
  sand.skyTo(skyRGB(SKY[ex().sky]), 1.2);
  const s = LOOK.sand;
  sand.tween('alb', rgb(s.alb), 0.6);
  sand.tween('emit', rgb(s.emit), 0.6);
  sand.tween('spec', s.spec, 0.6);
  sand.tween('heat', 1, 1.2);
  haptic([14, 60, 14]);
  st.phase = 'work';
  // the next set condenses a frame later, so the pour and the vortex don't land in the same frame (same start time)
  requestAnimationFrame(() => st.phase === 'work' && showSet({ delay: 0.29 }));
  say(TXT.restOver(st.set + 1));
  st.busy = now() + 0.7;
}

function finish() {
  st.phase = 'done';
  const N = sand.figureCount();
  sand.beginLayer(st.pal, N, 13 * G.k);
  sand.dropFigure({ over: 0.9, spread: 90 });
  label(sand.endLayer(st.layerMeta), 1300);
  sand.skyTo(skyRGB(SKY.done), 2.4);
  sand.tween('heat', 0.4, 1.5);
  fade(el.capW, false); fade(el.note, false);
  el.best.classList.remove('on');
  swap(el.sub, '');
  swap(el.exName, '');
  const mins = Math.floor((DATA.elapsed + now() - st.t0) / 60);
  const vol = Math.round(plan.exercises.reduce((s, x) => s + x.sets.slice(0, x.done).reduce((a, [w, r]) => a + w * r, 0), 0));
  el.sumList.textContent = '';
  for (const [k, v, unit] of [[TXT.time, mins, 'min'], [TXT.volume, fmt(vol), 'kg'], [TXT.sets, totalSets()], [TXT.bests, st.bests]]) {
    const item = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = String(v);
    if (unit) { const u = document.createElement('small'); u.textContent = unit; dd.append(u); }
    item.append(dt, dd);
    el.sumList.append(item);
  }
  setTimeout(() => el.summary.classList.add('on'), 900);
  setMain(TXT.again);
  st.busy = now() + 1.2;
}

function restart() {
  el.summary.classList.remove('on');
  reset();
  build();
  showSet({ delay: 0.2 });
}

// ---------- the edit tray ----------

function roll(node, text, dir) {
  const old = node.textContent;
  node.textContent = '';
  [...text].forEach((c, i) => {
    const s = document.createElement('span');
    s.textContent = c;
    node.append(s);
    if (old && old[i] !== c && !REDUCE) {
      s.animate([{ transform: `translateY(${dir * 70}%)`, filter: 'blur(3px)', opacity: 0 }, { transform: 'none', filter: 'blur(0px)', opacity: 1 }],
        { duration: 260, easing: EASE });
    }
  });
}

function openTray() {
  if (st.phase !== 'work') return;
  st.hinted = true;
  const [w, r] = cur();
  roll(el.rollW, fmt(w), 0);
  roll(el.rollR, String(r), 0);
  el.tray.classList.add('on');
  el.tray.setAttribute('aria-hidden', 'false');
  el.scrim.classList.add('on');
}

function closeTray() {
  el.tray.classList.remove('on');
  el.tray.setAttribute('aria-hidden', 'true');
  el.scrim.classList.remove('on');
}

function step(k, d) {
  if (st.phase !== 'work') return;
  const set = cur();
  if (k === 'w') set[0] = Math.max(2.5, Math.round((set[0] + d * 2.5) * 10) / 10);
  else set[1] = Math.max(1, Math.min(30, set[1] + d));
  const [w, r] = set;
  roll(k === 'w' ? el.rollW : el.rollR, k === 'w' ? fmt(w) : String(r), d > 0 ? 1 : -1);
  const size = figSize(ex());
  const resize = size !== st.fig;
  st.fig = size;
  placeFigure(sand.setFigure(figureLines(w, r), { omega: 13, surplus: 'dissolve', spawn: 'near', matchAll: resize }));
  el.figure.setAttribute('aria-label', TXT.edit(fmt(w), r));
  haptic(6);
}

// ---------- input ----------

el.main.addEventListener('pointerdown', () => el.main.classList.add('press'));
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.main.addEventListener(ev, () => el.main.classList.remove('press'));
el.main.addEventListener('click', () => {
  if (now() < st.busy) return;
  if (st.phase === 'work') { st.busy = now() + 0.7; logSet(); }
  else if (st.phase === 'rest') endRest(true);
  else if (st.phase === 'done') restart();
});
el.figure.addEventListener('click', openTray);
el.scrim.addEventListener('click', closeTray);
$('trayDone').addEventListener('click', closeTray);
// a step button repeats while held: one step at once, then about eleven a second after 0.4 s
el.tray.querySelectorAll('.step').forEach((b) => {
  let hold = 0, rep = 0;
  const go = () => step(b.dataset.k, Number(b.dataset.d));
  const stop = () => { clearTimeout(hold); clearInterval(rep); };
  b.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    stop(); go();
    hold = setTimeout(() => { rep = setInterval(go, 90); }, 400);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, stop);
  b.addEventListener('click', (e) => { if (e.detail === 0) go(); });   // keyboard and switch access
});
el.minus.addEventListener('click', () => adjustRest(-15));
el.plus.addEventListener('click', () => adjustRest(15));

function adjustRest(d) {
  if (st.phase !== 'rest') return;
  const left = st.restEnd - now();
  const nl = Math.max(1, left + d);
  st.restEnd = now() + nl;
  st.restTotal = Math.max(st.restTotal, nl);
  haptic(6);
}

// ---------- loop ----------

function loop() {
  if (!document.hidden) {
    restTick();
    sand.frame();
    const c = clock(DATA.elapsed + now() - st.t0);
    if (c !== st.shownClock) { st.shownClock = c; el.clock.textContent = c; }
  }
  requestAnimationFrame(loop);
}

let lastW = 0;
addEventListener('resize', () => {
  if (Math.abs(innerWidth - lastW) < 40) return;
  lastW = innerWidth;
  if (st.phase === 'rest') { const n = nextSet(); if (n.newEx) { st.ex++; st.set = 0; } else st.set++; }
  if (st.phase === 'done') { restart(); return; }
  closeTray();
  build();
  st.phase = 'work';
  showSet();
});

(async () => {
  await document.fonts.load('900 expanded 100px Archivo');
  await document.fonts.load('600 19px Archivo');
  reset();
  lastW = innerWidth;
  build();
  requestAnimationFrame(loop);
  setTimeout(() => showSet({ delay: 0 }), 250);
})();
