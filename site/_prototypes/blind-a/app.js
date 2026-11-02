// Tide: a workout screen where rest is a body of light. Ticking a set floods the screen with hot liquid; it drains
// and cools as you recover, and when it has settled you're ready. Tilt the phone and the surface stays level;
// touch it and it ripples. Every motion runs off one clock so the page can also be filmed frame by frame (?film).

import { workout, e1rm } from './data.js';
import { Tide, Spring, createRenderer, paletteAt } from './liquid.js';

const q = new URLSearchParams(location.search);
const lang = q.get('lang') === 'da' ? 'da' : 'en';
const FILM = q.has('film');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.lang = lang;

const STRINGS = {
  en: {
    set: 'Set {n}', done: 'Done set {n}', last: 'Last time {w} {u} × {r}', kg: 'kg', kgEach: 'kg each', reps: 'reps',
    add: '+15 s', skip: 'Skip rest', nextSet: 'Next: set {n}, {w} {u} × {r}', nextEx: 'Next: {name}',
    record: 'New best: {w} kg × {r}', recordSub: 'Beats {w} kg × {r} from {date}', finished: 'Workout done',
    minutes: 'minutes', sets: 'sets', lifted: 'kg lifted', best1: 'new best', bestN: 'new bests', again: 'Start again',
    lessW: 'Less weight', moreW: 'More weight', lessR: 'One rep fewer', moreR: 'One rep more', elapsed: 'Workout time {t}',
    left: '{t} rest left', change: 'Change', restT: 'Rest {t}',
  },
  da: {
    set: 'Sæt {n}', done: 'Færdig med sæt {n}', last: 'Sidst {w} {u} × {r}', kg: 'kg', kgEach: 'kg hver', reps: 'reps',
    add: '+15 sek', skip: 'Spring over', nextSet: 'Næste: sæt {n}, {w} {u} × {r}', nextEx: 'Næste: {name}',
    record: 'Ny rekord: {w} kg × {r}', recordSub: 'Slår {w} kg × {r} fra {date}', finished: 'Træning færdig',
    minutes: 'minutter', sets: 'sæt', lifted: 'kg løftet', best1: 'ny rekord', bestN: 'nye rekorder', again: 'Start forfra',
    lessW: 'Mindre vægt', moreW: 'Mere vægt', lessR: 'Én rep færre', moreR: 'Én rep mere', elapsed: 'Træningstid {t}',
    left: '{t} pause tilbage', change: 'Ret', restT: 'Pause {t}',
  },
};
const S = STRINGS[lang];
const tr = (key, o = {}) => S[key].replace(/\{(\w+)\}/g, (_, k) => o[k]);
const locale = lang === 'da' ? 'da-DK' : 'en-GB';
const kgFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
const intFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
const kg = (w) => kgFmt.format(w);
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const buzz = (p) => { try { navigator.vibrate?.(p); } catch { /* no vibration motor */ } };
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const easeOut = (p) => 1 - (1 - p) ** 3;

// ---------- clock, tweens, timers (all on one clock so ?film can step it) ----------
let now = 0;
const tweens = new Set();
const tween = (ms, fn, done) => { const tw = { t0: now, ms, fn, done }; tweens.add(tw); fn(0); return tw; };
const timers = [];
const later = (ms, fn) => timers.push({ at: now + ms, fn });

// ---------- state ----------
let data, exI, setI, rest, finished, pendingSwitch, startedAt, editing = 0;
const ex = () => data.exercises[exI];
const cur = () => ex().sets[setI];
const unit = (e = ex()) => (e.each ? S.kgEach : S.kg);

function reset() {
  data = structuredClone(workout);
  exI = 0;
  setI = ex().sets.findIndex((s) => !s.done);
  rest = null;
  finished = false;
  pendingSwitch = false;
  startedAt = now - data.startedMinAgo * 60000;
}

// ---------- liquid ----------
const canvas = $('gl');
const renderer = createRenderer(canvas, { keep: FILM });
if (!renderer) document.documentElement.classList.add('nogl');
const tide = new Tide();
const colorP = new Spring(1, 5, 1); // 0 hot, 1 recovered
const goldS = new Spring(0, 6, 1);
let W = innerWidth, H = innerHeight, scale = Math.min(devicePixelRatio || 1, 4);
const L = { base: 120, max: 560, finish: 300 };

const digitFont = { family: 'Geist, system-ui, sans-serif', weight: 220 };
let digitMetrics = null;
const digits = { alpha: 0, box: { x: 0, y: 0, w: 0, h: 0 }, slots: [], text: '', baseY: 0 };
const digitA = new Spring(0, 9, 1);
const glyphIndex = (ch) => (ch === ':' ? 10 : ch.charCodeAt(0) - 48);

function setDigits(text, animate = true) {
  $('digits').textContent = text;
  if (!digitMetrics) return;
  if (text.length !== digits.slots.length || !animate) {
    let x = 0;
    digits.slots = [...text].map((ch) => {
      const w = ch === ':' ? digitMetrics.colonW * 0.92 : digitMetrics.digitW * 0.93;
      const sl = { x, w, cur: glyphIndex(ch), next: glyphIndex(ch), roll: 0, t0: 0 };
      x += w;
      return sl;
    });
    digits.box.w = x;
    layoutDigits();
  } else {
    [...text].forEach((ch, i) => {
      const sl = digits.slots[i];
      const g = glyphIndex(ch);
      if (sl.roll > 0) { sl.cur = sl.next; sl.roll = 0; }
      if (g !== sl.cur) { sl.next = g; sl.t0 = now; sl.roll = 0.0001; }
    });
  }
  digits.text = text;
}
function layoutDigits() {
  const r = rectOf($('digits'));
  digits.box.x = (W - digits.box.w) / 2;
  digits.baseY = r.y;
  digits.box.h = digitMetrics ? digitMetrics.boxH : r.h;
}

// ---------- layers: every visible block fades and slides on its own spring ----------
const layer = (id, dy, omega = 13) => ({ el: $(id), v: new Spring(0, omega, 1), dy, last: '' });
const layers = {
  top: layer('top', 6), ex: layer('ex', 10), sets: layer('sets', 10), editor: layer('editor', 14),
  rest: layer('rest', 18, 10), restBtns: layer('restBtns', 14), done: layer('done', 16), finish: layer('finish', 22, 8),
};
const press = { done: new Spring(1, 30, 0.55), add: new Spring(1, 30, 0.55), skip: new Spring(1, 30, 0.55) };
const pressShown = { add: '', skip: '' };
function applyPress() {
  for (const id of ['add', 'skip']) {
    const v = press[id].x.toFixed(4);
    if (v !== pressShown[id]) { $(id).style.transform = `scale(${v})`; pressShown[id] = v; }
  }
}

function applyLayers() {
  for (const [key, ly] of Object.entries(layers)) {
    const v = ly.v.x;
    const s = press[key] ? press[key].x : 1;
    const sig = `${v.toFixed(4)}|${s.toFixed(4)}`;
    if (sig === ly.last) continue;
    ly.last = sig;
    ly.el.style.opacity = clamp(v, 0, 1).toFixed(4);
    ly.el.style.transform = `translate3d(0, ${((1 - v) * ly.dy).toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
    ly.el.style.visibility = v < 0.002 ? 'hidden' : 'visible';
    ly.el.style.pointerEvents = v > 0.6 ? '' : 'none';
  }
}

// ---------- layout ----------
function rectOf(el) {
  let x = 0, y = 0;
  for (let e = el; e; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}
let R = {};
function measure() {
  W = innerWidth; H = innerHeight;
  tide.W = W;
  if (renderer) renderer.resize(W, H, scale);
  R = { done: rectOf($('done')), add: rectOf($('add')), skip: rectOf($('skip')), sets: rectOf($('sets')) };
  L.base = baseLevel();
  L.max = H - (R.sets.y + R.sets.h + 14);
  L.finish = H * 0.36;
  if (digitMetrics) layoutDigits();
  placeCursor(true);
}
// The settled pool sits just above Done and rises a little with every set ticked, so it fills as you work.
function baseLevel() {
  const all = data ? data.exercises.flatMap((e) => e.sets) : [];
  const done = all.filter((s) => s.done).length;
  return H - R.done.y + 48 + (all.length ? (90 * done) / all.length : 0);
}
function glassRects() {
  const vis = (r, s, dy, radius, kind, alpha) => ({
    x: r.x + (r.w * (1 - s)) / 2, y: r.y + dy + (r.h * (1 - s)) / 2, w: r.w * s, h: r.h * s, r: radius * s, kind, alpha,
  });
  const rb = layers.restBtns, dn = layers.done;
  const rbDy = (1 - rb.v.x) * rb.dy, dnDy = (1 - dn.v.x) * dn.dy;
  return [
    vis(R.done, press.done.x, dnDy, R.done.h / 2, 2, clamp(dn.v.x, 0, 1)),
    vis(R.add, press.add.x, rbDy, R.add.h / 2, 1, clamp(rb.v.x, 0, 1)),
    vis(R.skip, press.skip.x, rbDy, R.skip.h / 2, 1, clamp(rb.v.x, 0, 1)),
  ];
}

// ---------- the number roller: only the digits that change move ----------
function cell(ch) {
  const c = document.createElement('span');
  c.className = 'c';
  const g = document.createElement('span');
  g.className = 'g';
  g.textContent = ch;
  c.append(g);
  return c;
}
function rollTo(el, text, dir, unitEl) {
  const old = el.dataset.text || '';
  if (old === text) return;
  el.dataset.text = text;
  if (!old || !dir || reduced) { el.replaceChildren(...[...text].map(cell)); return; }
  const k = 0.42 * parseFloat(getComputedStyle(el).fontSize);
  if (old.length === text.length) {
    [...text].forEach((ch, i) => {
      if (ch === old[i]) return;
      const c = el.children[i];
      if (c._tw) { tweens.delete(c._tw); c._tw = null; }
      [...c.children].slice(0, -1).forEach((n) => n.remove());
      const was = c.lastChild;
      was.style.position = '';
      const nu = document.createElement('span');
      nu.className = 'g';
      nu.textContent = ch;
      nu.style.cssText = 'position:absolute;left:0;top:0';
      c.append(nu);
      const delay = (text.length - 1 - i) * 18;
      c._tw = tween(380 + delay, (p) => {
        const e = easeOut(clamp((p * (380 + delay) - delay) / 380, 0, 1));
        was.style.transform = `translateY(${(-dir * e * k).toFixed(2)}px)`;
        was.style.opacity = (1 - e).toFixed(3);
        nu.style.transform = `translateY(${(dir * (1 - e) * k).toFixed(2)}px)`;
        nu.style.opacity = e.toFixed(3);
      }, () => { was.remove(); nu.style.cssText = ''; c._tw = null; });
    });
    return;
  }
  // Different length: the whole number rolls, and the unit glides to its new place.
  const before = unitEl.offsetLeft;
  const ghost = document.createElement('span');
  ghost.style.cssText = 'position:absolute;left:0;top:0;display:inline-flex';
  ghost.append(...el.childNodes);
  el.replaceChildren(...[...text].map(cell), ghost);
  const fresh = [...el.children].slice(0, -1);
  const shift = before - unitEl.offsetLeft;
  tween(400, (p) => {
    const e = easeOut(p);
    ghost.style.transform = `translateY(${(-dir * e * k).toFixed(2)}px)`;
    ghost.style.opacity = (1 - e).toFixed(3);
    for (const c of fresh) { c.style.transform = `translateY(${(dir * (1 - e) * k).toFixed(2)}px)`; c.style.opacity = e.toFixed(3); }
    unitEl.style.transform = `translateX(${(shift * (1 - e)).toFixed(2)}px)`;
  }, () => { ghost.remove(); for (const c of fresh) c.style.cssText = ''; unitEl.style.transform = ''; });
}

// ---------- screen content ----------
function renderEditor(dirW = 0, dirR = 0) {
  const s = cur();
  rollTo($('valW'), kg(s.w), dirW, $('unitW'));
  rollTo($('valR'), String(s.r), dirR, $('unitR'));
  $('unitW').textContent = unit();
  $('unitR').textContent = S.reps;
  $('done').textContent = tr('done', { n: setI + 1 });
  fitNumbers();
}
// 142.5 kg or "26 kg hver" must not push the steppers off screen: step the size down until the row fits.
function fitNumbers() {
  for (const row of document.querySelectorAll('.row')) {
    const roll = row.querySelector('.roll');
    const unitEl = row.querySelector('.unit');
    const avail = row.clientWidth - row.querySelector('.steps').offsetWidth - 12;
    // Only the digits in flow count, not the outgoing copy that is still rolling away.
    const need = () => [...roll.children].reduce((w, c) => w + (c.classList.contains('c') ? c.offsetWidth : 0), 0) + unitEl.offsetWidth + 10;
    let fs = 96;
    roll.style.fontSize = '';
    while (need() > avail && fs > 56) { fs -= 8; roll.style.fontSize = `${fs}px`; }
  }
}
function setVal(s) { return `${kg(s.w)} × ${s.r}`; }
function renderExercise() {
  const e = ex();
  $('exName').textContent = e.name[lang];
  $('exLast').textContent = tr('last', { w: kg(e.last.w), u: S.kg, r: e.last.r });
  const ol = $('sets');
  ol.style.gridTemplateColumns = `repeat(${e.sets.length}, 1fr)`;
  ol.replaceChildren(...e.sets.map((s, i) => {
    const li = document.createElement('li');
    li.className = `set ${s.done ? 'done' : i === setI ? 'now' : 'todo'}${s.record ? ' best' : ''}`;
    li.innerHTML = `<span class="lab">${tr('set', { n: i + 1 })}<svg class="tick" viewBox="0 0 12 12" aria-hidden="true">`
      + `<path d="M2.4 6.5l2.4 2.4 4.8-5.2"/></svg></span><span class="val">${setVal(s)}</span>`;
    return li;
  }));
  const cursor = document.createElement('i');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  ol.append(cursor);
  for (const k of ['W', 'R']) { $(`val${k}`).dataset.text = ''; }
  renderEditor();
  placeCursor(true);
}
const cursorX = new Spring(0, 16, 0.78);
function placeCursor(snap) {
  const li = $('sets').children[setI];
  if (!li || !li.classList.contains('set')) return;
  const x = li.offsetLeft;
  if (snap) cursorX.set(x); else cursorX.t = x;
}
function updateSetRow(i) {
  const li = $('sets').children[i];
  const s = ex().sets[i];
  li.className = `set ${s.done ? 'done' : i === setI ? 'now' : 'todo'}${s.record ? ' best' : ''}`;
  li.querySelector('.val').textContent = setVal(s);
}

function bump(field, n) {
  if (finished || (rest && !editing)) return;
  if (editing) editing = now + 4000;
  const s = cur();
  const before = field === 'w' ? s.w : s.r;
  if (field === 'w') s.w = Math.max(0, Math.round((s.w + n * ex().step) * 100) / 100);
  else s.r = clamp(s.r + n, 1, 50);
  const after = field === 'w' ? s.w : s.r;
  if (after === before) return;
  renderEditor(field === 'w' ? Math.sign(n) : 0, field === 'r' ? Math.sign(n) : 0);
  updateSetRow(setI);
  if (rest && !pendingSwitch) setNote(nextNote(), true);
  buzz(5);
}

// ---------- the signature moments ----------
function isRecord(e, s) {
  const best = Math.max(e1rm(e.best.w, e.best.r), ...e.sets.filter((x) => x.done && x !== s).map((x) => e1rm(x.w, x.r)));
  return e1rm(s.w, s.r) > best + 1e-9;
}

function tickSet() {
  const e = ex();
  const s = cur();
  s.done = true;
  s.record = isRecord(e, s);
  L.base = baseLevel();
  const i = setI;
  updateSetRow(i);
  const path = $('sets').children[i].querySelector('.tick');
  tween(340, (p) => { path.style.strokeDashoffset = (12 * (1 - easeOut(p))).toFixed(2); }, () => { path.style.strokeDashoffset = ''; });
  const lastSet = setI === e.sets.length - 1;
  if (lastSet && exI === data.exercises.length - 1) { finish(s.record); return; }
  if (lastSet) {
    // The rest belongs to what comes next: let the tick land, then the next exercise takes the screen.
    pendingSwitch = true;
    later(900, switchExercise);
  } else {
    setI++;
    updateSetRow(setI);
    placeCursor(false);
  }
  startRest(e.rest, s, e);
}

function switchExercise() {
  if (!pendingSwitch) return;
  pendingSwitch = false;
  exI++;
  setI = 0;
  renderExercise();
  measure();
  layers.ex.v.set(0);
  layers.sets.v.set(0);
  later(40, () => { layers.ex.v.t = 1; });
  later(120, () => { layers.sets.v.t = 1; });
  if (rest) { setNote(nextNote(), true); if (digitMetrics) layoutDigits(); }
}

const nextNote = () => tr('nextSet', { n: setI + 1, w: kg(cur().w), u: S.kg, r: cur().r });
function setNote(text, changeable) {
  const el = $('note');
  el.textContent = text;
  el.disabled = !changeable;
  if (changeable) { const c = document.createElement('span'); c.className = 'chg'; c.textContent = S.change; el.append(' ', c); }
}

// Change the next set during the rest: the countdown steps aside (it moves to the header), the liquid keeps
// draining, and after 4 s without a touch the countdown comes back.
function editDuringRest() {
  if (!rest || pendingSwitch || editing) return;
  editing = now + 4000;
  renderEditor();
  digitA.w = 20;
  digitA.t = 0;
  layers.rest.v.w = 20;
  layers.rest.v.t = 0;
  layers.editor.v.w = 14;
  layers.editor.v.t = 1;
}
function stopEditing() {
  if (!editing) return;
  editing = 0;
  if (!rest) return;
  layers.editor.v.w = 20;
  layers.editor.v.t = 0;
  layers.rest.v.w = 10;
  later(140, () => { if (rest && !editing) { layers.rest.v.t = 1; digitA.w = 9; digitA.t = 1; } });
}

function surge(strength) {
  tide.level.t = L.max;
  tide.level.v += 420 * strength;
  tide.splash(W / 2, 560 * strength, 70);
  tide.splash(W * 0.18, -160 * strength, 40);
  tide.splash(W * 0.82, -160 * strength, 40);
  tide.stir(80 * strength);
}

function startRest(sec, s, e) {
  const wasResting = !!rest;
  editing = 0;
  keepAwake();
  rest = { total: sec, end: now + sec * 1000, shown: -1 };
  colorP.set(0);
  goldS.set(s.record ? 1 : 0);
  surge(s.record ? 1.15 : 1);
  tide.fizz = s.record ? 0 : 0.12;
  tide.fizzTarget = s.record ? 0 : 0.03;
  buzz(s.record ? [14, 50, 14, 50, 36] : 16);
  setDigits(mmss(sec), wasResting);
  $('done').textContent = tr('done', { n: setI + 1 });
  layers.editor.v.w = 28;
  layers.editor.v.t = 0;
  digitA.w = 9;
  layers.rest.v.w = 10;
  later(180, () => { if (rest) { layers.rest.v.t = 1; digitA.t = 1; } });
  later(260, () => { if (rest) layers.restBtns.v.t = 1; });
  const rec = $('rec');
  if (s.record) {
    const prev = e.best;
    rec.innerHTML = `<b>${tr('record', { w: kg(s.w), r: s.r })}</b><span>${tr('recordSub', {
      w: kg(prev.w), r: prev.r, date: dateFmt.format(new Date(prev.date)) })}</span>`;
  } else rec.replaceChildren();
  if (pendingSwitch) setNote(tr('nextEx', { name: data.exercises[exI + 1].name[lang] }), false);
  else setNote(nextNote(), true);
  if (digitMetrics) layoutDigits(); // the lines under the digits changed, and the block is centred
}

// why: 'time' (it ran out), 'skip', or 'done' (the next set was ticked during the rest)
function endRest(why) {
  if (!rest) return;
  switchExercise();
  rest = null;
  const wasEditing = editing;
  editing = 0;
  if (why === 'done') return;
  tide.level.t = L.base;
  colorP.t = 1;
  goldS.t = 0;
  tide.fizzTarget = 0.02;
  digitA.w = 32;
  digitA.t = 0;
  layers.rest.v.w = 24;
  layers.rest.v.t = 0;
  layers.restBtns.v.t = 0;
  if (why === 'time') {
    buzz([18, 70, 18]);
    tide.splash(W / 2, 150, 110);
  } else tide.splash(W / 2, -220, 90);
  renderEditor();
  layers.editor.v.w = 13;
  if (wasEditing) return;
  later(why === 'time' ? 170 : 140, () => { if (!rest && !finished) layers.editor.v.t = 1; });
}

function addTime() {
  if (!rest) return;
  rest.total += 15;
  rest.end += 15000;
  tide.splash(W / 2, 150, 60);
  buzz(8);
}

function finish(record) {
  finished = true;
  const all = data.exercises.flatMap((e) => e.sets.filter((s) => s.done).map((s) => ({ ...s, each: e.each })));
  const vol = all.reduce((a, s) => a + s.w * s.r * (s.each ? 2 : 1), 0);
  const bests = all.filter((s) => s.record).length;
  const totals = [['fMin', Math.round((now - startedAt) / 60000)], ['fSets', all.length], ['fKg', Math.round(vol)], ['fBest', bests]];
  for (const [id] of totals) $(id).textContent = intFmt.format(0);
  $('fBestL').textContent = bests === 1 ? S.best1 : S.bestN;
  // A record makes the finish molten gold; otherwise it floods calm aqua. Never a mix of the two (that goes olive).
  colorP.set(1);
  goldS.set(bests ? 1 : 0);
  goldS.t = goldS.x;
  tide.level.t = H + 60;
  tide.level.v += 700;
  tide.splash(W / 2, 700, 80);
  tide.stir(120);
  tide.fizz = bests ? 0 : 0.1;
  tide.fizzTarget = bests ? 0 : 0.03;
  editing = 0;
  wake?.release().catch(() => {});
  wake = null;
  buzz(record ? [14, 50, 14, 50, 36] : [20, 60, 30]);
  for (const k of ['ex', 'sets', 'editor', 'rest', 'restBtns']) layers[k].v.t = 0;
  digitA.w = 30;
  digitA.t = 0;
  later(1300, () => {
    if (!finished) return;
    tide.level.t = L.finish;
    layers.finish.v.t = 1;
    totals.forEach(([id, n], i) => later(i * 90, () => tween(1100, (p) => { $(id).textContent = intFmt.format(Math.round(n * easeOut(p))); })));
  });
  $('done').textContent = S.again;
}

function startAgain() {
  layers.finish.v.t = 0;
  layers.editor.v.w = 13;
  reset();
  renderExercise();
  measure();
  tide.level.t = L.base;
  colorP.t = 1;
  goldS.t = 0;
  tide.fizzTarget = 0.02;
  tide.splash(W / 2, -200, 100);
  for (const [k, d] of [['ex', 200], ['sets', 280], ['editor', 360]]) later(d, () => { layers[k].v.t = 1; });
}

// ---------- input ----------
const pressable = (id, onClick) => {
  const el = $(id);
  const sp = press[id];
  el.addEventListener('pointerdown', () => { sp.t = 0.955; });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, () => { sp.t = 1; });
  el.addEventListener('click', onClick);
};
pressable('done', () => {
  if (finished) { startAgain(); return; }
  endRest('done');
  tickSet();
});
pressable('add', addTime);
$('note').addEventListener('click', editDuringRest);
pressable('skip', () => endRest('skip'));

for (const b of document.querySelectorAll('.step')) {
  b.addEventListener('click', () => bump(b.dataset.f, Number(b.dataset.d)));
}
// Drag a number up or down to change it, one step per 22 px.
for (const n of document.querySelectorAll('.num')) {
  let drag = null;
  n.addEventListener('pointerdown', (e) => { n.setPointerCapture(e.pointerId); drag = { y: e.clientY, done: 0 }; });
  n.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const steps = Math.trunc((drag.y - e.clientY) / 22);
    if (steps !== drag.done) { bump(n.dataset.f, steps - drag.done); drag.done = steps; }
  });
  const end = () => { drag = null; };
  n.addEventListener('pointerup', end);
  n.addEventListener('pointercancel', end);
}

// Touch the surface and it ripples.
let lastPt = null;
addEventListener('pointerdown', (e) => {
  lastPt = { x: e.clientX, y: e.clientY };
  const sy = tide.surfaceAt(e.clientX, H);
  if (e.clientY > sy - 60) tide.splash(e.clientX, -120, 24);
}, { passive: true });
addEventListener('pointermove', (e) => {
  if (!lastPt) return;
  const sy = tide.surfaceAt(e.clientX, H);
  if (Math.abs(e.clientY - sy) < 70) tide.splash(e.clientX, -(e.clientY - lastPt.y) * 9 - Math.abs(e.clientX - lastPt.x) * 2, 22);
  lastPt = { x: e.clientX, y: e.clientY };
}, { passive: true });
for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, () => { lastPt = null; }, { passive: true });

// Tilt: the surface stays level with the real world; a jolt sloshes it.
const iOS = /iP(hone|ad|od)/.test(navigator.userAgent);
let grav = null;
addEventListener('devicemotion', (e) => {
  const a = e.accelerationIncludingGravity;
  if (!a || a.x == null) return;
  const sgn = iOS ? -1 : 1;
  grav = grav ? { x: grav.x * 0.8 + sgn * a.x * 0.2, y: grav.y * 0.8 + sgn * a.y * 0.2 } : { x: sgn * a.x, y: sgn * a.y };
  const lin = e.acceleration;
  if (lin && lin.x != null && !reduced) tide.slope.v += -sgn * lin.x * 0.02;
});
// iOS asks for motion access, and only from a real activation (a click, not a touch-start).
addEventListener('click', () => {
  if (typeof DeviceMotionEvent !== 'undefined' && DeviceMotionEvent.requestPermission) DeviceMotionEvent.requestPermission().catch(() => {});
}, { once: true, capture: true });
function tiltTarget() {
  if (!grav || reduced || (screen.orientation && screen.orientation.angle !== 0)) return 0;
  const m = Math.hypot(grav.x, grav.y) / 9.81;
  const w = clamp((m - 0.25) / 0.35, 0, 1);
  const ang = clamp(Math.atan2(grav.x, Math.max(grav.y, 0.5)), -0.5, 0.5);
  return -Math.tan(ang) * w * w * (3 - 2 * w);
}

addEventListener('resize', () => { measure(); fitNumbers(); });

// Keep the screen on through a workout, so the rest can end with a buzz instead of a locked phone.
let wake = null;
function keepAwake() {
  if (wake || !navigator.wakeLock || document.visibilityState !== 'visible') return;
  navigator.wakeLock.request('screen').then((w) => { wake = w; w.addEventListener('release', () => { wake = null; }); }).catch(() => {});
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !finished && data && data.exercises.some((e) => e.sets.some((s) => s.done))) keepAwake(); });

// ---------- the frame ----------
const perf = { js: new Float32Array(600), dt: new Float32Array(600), n: 0 };
window.__perf = perf;
let last = 0;
let clockShown = '';
let downgradeAt = 2500;

function frame(ms, draw = true) {
  const t0 = performance.now();
  const dt = clamp((ms - last) / 1000, 0.001, 0.05);
  last = ms;
  now = ms;

  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= now) timers.splice(i, 1)[0].fn();
  for (const tw of tweens) {
    const p = clamp((now - tw.t0) / tw.ms, 0, 1);
    tw.fn(p);
    if (p >= 1) { tweens.delete(tw); tw.done?.(); }
  }

  if (rest) {
    const remain = Math.max(0, rest.end - now) / 1000;
    const frac = remain / rest.total;
    tide.level.t = L.base + (L.max - L.base) * frac;
    colorP.t = 1 - frac;
    const secs = Math.ceil(remain - 1e-6);
    if (secs !== rest.shown) {
      if (rest.shown !== -1) setDigits(mmss(secs));
      if (secs <= 3 && secs > 0 && rest.shown !== -1) tide.splash(W / 2, -60, 36);
      $('digits').setAttribute('aria-label', tr('left', { t: mmss(secs) }));
      rest.shown = secs;
    }
    if (remain <= 0) endRest('time');
  }

  tide.slope.t = tiltTarget();
  tide.idle = reduced ? 0 : 2.2;
  tide.step(dt, reduced);
  colorP.step(dt);
  goldS.step(dt);
  digitA.step(dt);
  cursorX.step(dt);
  for (const ly of Object.values(layers)) ly.v.step(dt);
  for (const sp of Object.values(press)) sp.step(dt);
  for (const sl of digits.slots) {
    if (sl.roll > 0) {
      sl.roll = clamp((now - sl.t0) / 340, 0.0001, 1);
      if (sl.roll >= 1) { sl.cur = sl.next; sl.roll = 0; }
    }
  }
  applyLayers();
  applyPress();
  const cursor = $('sets').querySelector('.cursor');
  if (cursor) cursor.style.transform = `translate3d(${cursorX.x.toFixed(2)}px,0,0)`;

  if (editing && now > editing) stopEditing();
  const el = editing && rest ? tr('restT', { t: mmss(Math.ceil(Math.max(0, rest.end - now) / 1000)) }) : mmss((now - startedAt) / 1000);
  if (el !== clockShown) { $('clock').textContent = el; $('clock').setAttribute('aria-label', editing ? el : tr('elapsed', { t: el })); clockShown = el; }

  const color = paletteAt(colorP.x, goldS.x);
  if (renderer && draw) {
    digits.alpha = digitA.x;
    digits.box.y = digits.baseY + (1 - layers.rest.v.x) * layers.rest.dy;
    renderer.draw({ time: now / 1000, tide, color, rects: glassRects(), digits });
  } else {
    const pool = $('pool');
    pool.style.height = `${Math.max(0, tide.level.x).toFixed(1)}px`;
    pool.style.background = `rgb(${color.surf.map((c) => Math.round(c * 255)).join(',')})`;
  }
  // Set on the one element that uses it: a custom property on :root would restyle the whole page every frame.
  const glow = `rgb(${color.glow.map((c) => Math.round(c * 255)).join(',')})`;
  if (cursor && cursor._glow !== glow) { cursor.style.background = glow; cursor.style.boxShadow = `0 0 10px ${glow}`; cursor._glow = glow; }

  const i = perf.n++ % 600;
  perf.js[i] = performance.now() - t0;
  perf.dt[i] = dt * 1000;
  adapt(dt);
  if (!FILM) requestAnimationFrame(frame);
}

// If frames start arriving late, draw the liquid at a lower resolution (never below 1.5 px per css px). "Late" is
// measured against this phone's own steady frame time, so a screen running at 60 Hz is not mistaken for jank.
const dts = [];
function adapt(dt) {
  if (FILM || q.has('fixed') || now < downgradeAt) return;
  dts.push(dt);
  if (dts.length < 120) return;
  const median = [...dts].sort((a, b) => a - b)[60];
  const late = dts.filter((d) => d > median * 1.7).length / dts.length;
  dts.length = 0;
  if (late > 0.15 && scale > 1.5) {
    scale = Math.max(1.5, scale * 0.82);
    measure();
    downgradeAt = now + 1500;
  }
}

// ---------- start ----------
async function start() {
  const fontsReady = Promise.all([
    document.fonts.load(`${digitFont.weight} 148px Geist`), document.fonts.load('600 34px Geist'), document.fonts.load('250 96px Geist'),
  ]).catch(() => {});
  await Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]);
  reset();
  $('wkName').textContent = data.name[lang];
  $('add').textContent = S.add;
  $('skip').textContent = S.skip;
  $('lessW').setAttribute('aria-label', S.lessW);
  $('moreW').setAttribute('aria-label', S.moreW);
  $('lessR').setAttribute('aria-label', S.lessR);
  $('moreR').setAttribute('aria-label', S.moreR);
  $('finTitle').textContent = S.finished;
  $('fMinL').textContent = S.minutes;
  $('fSetsL').textContent = S.sets;
  $('fKgL').textContent = S.lifted;
  renderExercise();
  const size = Math.min(148, innerWidth * 0.385);
  $('digits').style.fontSize = `${size}px`;
  measure();
  if (renderer) {
    digitMetrics = renderer.buildAtlas(digitFont, size, scale);
    $('digits').style.height = `${digitMetrics.boxH}px`;
    measure();
  }
  setDigits('0:00', false);
  tide.level.set(0);
  tide.level.t = L.base;
  tide.splash(W / 2, 260, 90);
  for (const [k, d] of [['top', 0], ['ex', 80], ['sets', 160], ['editor', 240], ['done', 320]]) later(d, () => { layers[k].v.t = 1; });
  if (FILM) {
    let vt = 0;
    window.__step = (ms, n = 1) => { for (let i = 0; i < n; i++) { vt += ms; frame(vt, i === n - 1); } };
    window.__surfaceY = (x) => tide.surfaceAt(x, H);
    window.__ready = true;
  } else {
    requestAnimationFrame((ms) => { last = ms; now = ms; startedAt = ms - data.startedMinAgo * 60000; frame(ms); });
  }
}
start();
