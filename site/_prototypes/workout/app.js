/* Aven 2 workout screen (prototype, made-up data, nothing stored).
   The picture is the equipment for this set; everything else stays quiet, and the details are one tap away. */
import { createStage, platesFor } from './stage.js';
import { SPRINGS, play, flip, pressable, Channel, EXIT } from '../../round/motion.js';
import { LOOK, ALTS, EX, DATES } from './data.js';

const $ = (s) => document.querySelector(s);
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const fmt = (kg) => String(Math.round(kg * 100) / 100);
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen'];
const words = (n) => WORDS[n] ?? String(n);
const e1rm = (kg, reps) => kg * (1 + reps / 30);
const haptic = (p) => { try { navigator.vibrate?.(p); } catch {} };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const fresh = () => JSON.parse(JSON.stringify(EX));
let W = fresh();
const S = { i: 0, phase: 'set', restEnd: 0, restTotal: 0, logged: null, started: Date.now() - (18 * 60 + 42) * 1000, pulled: false, celebrating: 0 };
const cur = () => W[S.i];
const nextSet = (e = cur()) => e.sets.findIndex((s) => !s.done);
const isRecord = (e, s) => (s.kg > e.best.kg && s.reps >= e.best.reps) || (s.kg >= e.best.kg && s.reps > e.best.reps);

/* ---------- elements ---------- */
const el = {
  pic: $('#pic'), clock: $('#clock'), name: $('#name'), label: $('#label'), segs: $('#segs'), figures: $('#figures'),
  kg: $('#kg'), reps: $('#reps'), timer: $('#timer'), time: $('#time'), then: $('#then'), coach: $('#coach'), meta: $('#meta'),
  go: $('#go'), goText: $('#goText'), minus: $('#minus'), plus: $('#plus'), peek: $('#peek'), peekTh: $('#peekTh'),
  peekK: $('#peekK'), peekN: $('#peekN'), sheet: $('#sheet'), body: $('#sheetBody'), scrim: $('#scrim'), grab: $('#grab'),
  toast: $('#toast'), toastText: $('#toastText'), toastUndo: $('#toastUndo'), hero: $('#hero'),
};

/* ---------- numbers that roll: only the digits that change move, the rest stay put ---------- */
const ch = (c) => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; return s; };
function setNum(node, text, { dir = 1, move = [] } = {}) {
  text = String(text);
  const old = node.dataset.v;
  if (old === text) return;
  node.dataset.v = text;
  if (old === undefined || RM.matches) { node.replaceChildren(...[...text].map(ch)); return; }
  node.style.position = 'relative';
  const a = [...old], b = [...text], whole = a.length !== b.length;
  let nodes;
  flip(move, () => { node.querySelectorAll(':scope > .gh').forEach((g) => g.remove()); nodes = b.map(ch); node.replaceChildren(...nodes); }, SPRINGS.type);
  const h = node.getBoundingClientRect().height * 0.55 * dir;
  const changed = whole ? b.map((_, i) => i) : b.map((c, i) => (a[i] !== c ? i : -1)).filter((i) => i >= 0);
  for (const i of changed) play(nodes[i], [{ transform: `translateY(${h}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.type);
  const ghosts = whole ? [[old, 0]] : changed.map((i) => [a[i], nodes[i].offsetLeft]);
  for (const [txt, left] of ghosts) {
    const g = document.createElement('span');
    g.className = 'gh';
    g.textContent = txt;
    g.setAttribute('aria-hidden', 'true');
    g.style.left = left + 'px';
    if (whole) { g.style.left = '50%'; g.style.translate = '-50% 0'; }
    node.append(g);
    play(g, [{ transform: 'none', opacity: 1 }, { opacity: 0, offset: 0.45 }, { transform: `translateY(${-h}px)`, opacity: 0 }], SPRINGS.type, { fill: 'forwards' })
      .finished.then(() => g.remove(), () => g.remove());
  }
}
/* Words that change: the old line lifts away, the new one settles in. */
function setText(node, html, { dir = 1 } = {}) {
  if (node.dataset.h === html) return;
  const first = node.dataset.h === undefined;
  node.dataset.h = html;
  node.innerHTML = html;
  if (first || RM.matches) return;
  play(node, [{ opacity: 0, transform: `translateY(${8 * dir}px)`, filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], SPRINGS.set);
}

/* ---------- the picture ---------- */
let stage = null;
/* Small pictures of each exercise, drawn once from the same 3D scene by thumbs.html. */
const thumb = (e) => `thumbs/${e.id}.webp`;
const shown = { kind: null, kg: null, id: null };
let loading = Promise.resolve();
function picture(e, kg, { fade = false } = {}) {
  if (!stage) return;
  if (shown.id === e.id && shown.kind === e.kind) {
    if (shown.kg === kg) return;
    shown.kg = kg;
    // one load at a time; quick taps on + collapse into the latest weight
    loading = loading.then(() => (shown.kg === kg ? stage.load(kg) : null));
    return;
  }
  Object.assign(shown, { kind: e.kind, kg, id: e.id });
  loading = loading.then(() => stage.show(e.kind, kg, LOOK[e.kind], { fade }));
}
function accent(e) { document.documentElement.style.setProperty('--accent', LOOK[e.kind].accent); }

/* ---------- what the Coach says (always from the numbers on screen) ---------- */
function coachLine(e, i) {
  const s = e.sets[i], prev = e.last.sets[i];
  if (isRecord(e, s)) return `${fmt(s.kg)} for ${words(s.reps)} would be your best ever.`;
  if (prev && prev[0] === s.kg && prev[1] < s.reps) {
    const tie = s.kg === e.best.kg && s.reps === e.best.reps;
    return `Last time this one stopped at ${words(prev[1])}. ${tie ? `${words(s.reps)[0].toUpperCase() + words(s.reps).slice(1)} ties your best.` : `Go for ${words(s.reps)}.`}`;
  }
  if (prev && s.kg > prev[0]) return `${fmt(s.kg - prev[0])} kg more than last week. Same clean reps.`;
  if (prev && prev[0] === s.kg && prev[1] === s.reps) return 'Same as last week. Make it look easier.';
  return `${words(s.reps)[0].toUpperCase() + words(s.reps).slice(1)} clean reps. Slow on the way down.`;
}
function restLine(e) {
  const n = nextSet(e);
  if (n >= 0) return isRecord(e, e.sets[n]) ? 'Breathe. The next one is a record.' : coachLine(e, n);
  const nx = W[S.i + 1];
  return nx ? `That's ${e.name.toLowerCase()} done. ${nx.name} is next.` : 'That was the last set. Finish when you’re ready.';
}
function lastBest(e, i) {
  const prev = e.last.sets[i];
  return [prev ? `Last time ${fmt(prev[0])} × ${prev[1]}` : `Last time ${e.last.date}`, `Best ${fmt(e.best.kg)} × ${e.best.reps}`].join('<span aria-hidden="true">·</span>');
}

/* ---------- the screen ---------- */
function segs(e, { animate = false } = {}) {
  const n = nextSet(e);
  const have = [...el.segs.children];
  if (have.length !== e.sets.length) el.segs.replaceChildren(...e.sets.map(() => Object.assign(document.createElement('i'), { className: 'seg' })));
  [...el.segs.children].forEach((d, k) => {
    const s = e.sets[k];
    d.className = 'seg' + (k === n && S.phase === 'set' ? ' now' : '') + (s.record ? ' best' : '');
    const was = d.style.getPropertyValue('--fill');
    const fill = s.done ? '1' : '0';
    d.style.setProperty('--fill', fill);
    if (animate && was !== fill && !RM.matches) play(d, [{ '--fill': was || '0' }, { '--fill': fill }], SPRINGS.set);
  });
}
CSS.registerProperty?.({ name: '--fill', syntax: '<number>', inherits: true, initialValue: '0' }); // inherits: the ::after reads it

/* "3 × 10 · 30 kg", or "4 sets · 80–85 kg" when the sets differ. */
function plan(e) {
  const kg = e.sets.map((s) => s.kg), lo = Math.min(...kg), hi = Math.max(...kg);
  const reps = e.sets.every((s) => s.reps === e.sets[0].reps) ? `${e.sets.length} × ${e.sets[0].reps}` : `${e.sets.length} sets`;
  return `${reps} · ${lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`} kg`;
}
function peek() {
  const nx = W[S.i + 1];
  if (nx) {
    el.peekK.textContent = `Up next · ${plan(nx)}`;
    el.peekN.textContent = nx.name;
    el.peekTh.style.backgroundImage = `url(${thumb(nx)})`;
  } else {
    el.peekK.textContent = `Last exercise · ${W.length} in all`;
    el.peekN.textContent = 'Whole workout';
    el.peekTh.style.backgroundImage = `url(${thumb(cur())})`;
  }
}

const rowMove = () => [el.kg.closest('.fig'), el.reps.closest('.fig'), el.figures.querySelector('.times')];
/* The big numbers; three-digit weights with two-digit reps step down a size so they never run off the screen. */
function figures(kg, reps, dir = 1) {
  el.figures.classList.toggle('long', fmt(kg).length + String(reps).length >= 6);
  setNum(el.kg, fmt(kg), { dir, move: rowMove() });
  setNum(el.reps, reps, { dir, move: rowMove() });
}
function showSet({ fade = false } = {}) {
  const e = cur(), i = nextSet(e);
  S.phase = 'set';
  accent(e);
  setText(el.name, esc(e.name));
  segs(e, { animate: true });
  if (i < 0) return showDone({ fade });
  const s = e.sets[i];
  setText(el.label, `Set ${i + 1} of ${e.sets.length}`);
  el.label.classList.remove('gold');
  figures(s.kg, s.reps);
  el.kg.classList.remove('gold'); el.reps.classList.remove('gold');
  swapStage(el.figures);
  setText(el.coach, esc(coachLine(e, i)));
  setText(el.meta, lastBest(e, i));
  setGo(`Done`, true);
  rest(false);
  picture(e, s.kg, { fade });
  stage?.focus(0, 600);
  peek();
}
function showDone({ fade = false } = {}) {
  const e = cur(), b = bestSet(e);
  setText(el.label, 'Best today');
  el.label.classList.remove('gold');
  figures(b.kg, b.reps);
  el.kg.classList.remove('gold'); el.reps.classList.remove('gold');
  swapStage(el.figures);
  setText(el.coach, esc(restLine(e)));
  setText(el.meta, `${e.sets.length} sets done · ${e.sets.reduce((a, s) => a + s.kg * s.reps, 0).toLocaleString('en-GB')} kg moved`);
  setGo(W[S.i + 1] ? 'Next exercise' : 'Finish workout', false);
  rest(false);
  picture(e, b.kg, { fade });
  stage?.focus(0, 600);
  peek();
}
const bestSet = (e) => e.sets.filter((s) => s.done).reduce((a, s) => (e1rm(s.kg, s.reps) > e1rm(a.kg, a.reps) ? s : a));
const bestToday = (e) => { const b = bestSet(e); return `${fmt(b.kg)} × ${b.reps}`; };

function setGo(text, check) {
  el.go.querySelector('.check').style.display = check ? '' : 'none';
  setText(el.goText, esc(text));
}
let stageNow = el.figures;
function swapStage(to) {
  if (stageNow === to) return;
  const from = stageNow;
  stageNow = to;
  to.hidden = false;
  if (RM.matches) { from.hidden = true; return; }
  play(to, [{ opacity: 0, transform: 'translateY(18px) scale(0.98)' }, { opacity: 1, transform: 'none' }], SPRINGS.set);
  const out = from.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-14px) scale(0.98)' }], { ...EXIT, duration: 160 });
  out.finished.then(() => { if (stageNow !== from) from.hidden = true; }, () => {});
}

/* ---------- ticking a set ---------- */
async function tick() {
  const e = cur(), i = nextSet(e);
  if (S.phase === 'rest') return endRest();
  if (i < 0) { const nx = W[S.i + 1]; return nx ? goTo(S.i + 1) : sheetFinish(); }
  const s = e.sets[i];
  const rec = isRecord(e, s);
  S.logged = { id: e.id, i, best: { ...e.best } };
  s.done = true;
  if (rec) { s.record = true; e.best = { kg: s.kg, reps: s.reps, date: 'today' }; }
  haptic(rec ? [14, 60, 22] : 14);
  segs(e, { animate: true });
  startRest(e, s, rec);
}

/* During rest: what comes after it, under the timer and on the button. */
function restNext(e) {
  const n = nextSet(e), nx = W[S.i + 1];
  el.then.textContent = n >= 0 ? `then ${fmt(e.sets[n].kg)} kg × ${e.sets[n].reps}` : nx ? `then ${nx.name.toLowerCase()}` : 'then you’re done';
  setGo(n >= 0 ? `Start set ${n + 1}` : nx ? 'Next exercise' : 'Finish workout', false);
}
function startRest(e, s, rec) {
  S.phase = 'rest';
  S.restTotal = e.rest;
  S.restEnd = Date.now() + e.rest * 1000;
  S.pulled = false;
  S.buzzed = false;
  segs(e);
  restNext(e);
  rest(true);
  updateTimer(true);
  setText(el.meta, `Set ${e.sets.indexOf(s) + 1} · ${fmt(s.kg)} × ${s.reps} logged <button class="undo" id="undo">Undo</button>`);
  if (rec) return celebrate(e, s);
  setText(el.label, 'Rest');
  swapStage(el.timer);
  setText(el.coach, esc(restLine(e)));
  stage?.focus(1, 900);
}

/* A new record: the light runs across the plates, the numbers turn gold, the Coach says it plainly. */
function celebrate(e, s) {
  const prev = S.logged.best;
  el.label.classList.add('gold');
  setText(el.label, 'New best');
  el.kg.classList.add('gold'); el.reps.classList.add('gold');
  swapStage(el.figures);
  setText(el.coach, esc(`Your heaviest ${words(s.reps)} ever.`));
  setText(el.meta, `Up from ${fmt(prev.kg)} × ${prev.reps} on ${prev.date} <button class="undo" id="undo">Undo</button>`);
  stage?.sweep();
  const token = ++S.celebrating;
  setTimeout(() => {
    if (S.celebrating !== token || S.phase !== 'rest') return;
    el.kg.classList.remove('gold'); el.reps.classList.remove('gold');
    el.label.classList.remove('gold');
    setText(el.label, 'Rest');
    swapStage(el.timer);
    setText(el.coach, esc(restLine(e)));
    setText(el.meta, `Set ${e.sets.indexOf(s) + 1} · ${fmt(s.kg)} × ${s.reps} logged <button class="undo" id="undo">Undo</button>`);
    stage?.focus(1, 900);
  }, RM.matches ? 1800 : 3000);
}

/* Rest: Done narrows and −15 / +15 come in from the screen edges; after rest Done widens and pushes them out. */
let restToken = 0;
function rest(on) {
  const side = [el.minus, el.plus];
  if ((!el.minus.hidden && !el.minus.classList.contains('leaving')) === on) return;
  const token = ++restToken, w0 = el.go.getBoundingClientRect().width;
  side.forEach((b) => { b.getAnimations().forEach((a) => a.cancel()); b.classList.remove('leaving'); b.hidden = !on; });
  const w1 = el.go.getBoundingClientRect().width;
  if (RM.matches) return;
  play(el.go, [{ flex: '0 0 auto', width: `${w0}px` }, { flex: '0 0 auto', width: `${w1}px` }], SPRINGS.set);
  if (on) { side.forEach((b) => play(b, [{ opacity: 0 }, { opacity: 1 }], SPRINGS.set)); return; }
  side.forEach((b) => {
    b.hidden = false;
    b.classList.add('leaving');
    play(b, [{ opacity: 1 }, { opacity: 0 }], SPRINGS.set, { fill: 'forwards' }).finished.then(() => {
      if (token !== restToken) return;
      b.hidden = true;
      b.classList.remove('leaving');
      b.getAnimations().forEach((a) => a.cancel());
    }, () => {});
  });
}
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
function updateTimer(first = false) {
  if (S.phase !== 'rest') return;
  const left = Math.max(0, Math.ceil((S.restEnd - Date.now()) / 1000));
  setNum(el.time, mmss(left), { dir: first ? 1 : -1 });
  // the last seconds: the lens finds the bar again, so the picture tells you it's time
  if (left <= 8 && !S.pulled) { S.pulled = true; stage?.focus(0, Math.max(400, S.restEnd - Date.now())); }
  if (left > 8 && S.pulled) { S.pulled = false; stage?.focus(1, 600); }
  if (left === 0) {
    if (!S.buzzed) { S.buzzed = true; haptic([20, 80, 20]); }
    if (!sheetOpen) endRest();
  }
}
function endRest() {
  if (S.phase !== 'rest') return;
  S.celebrating++;
  const e = cur();
  if (nextSet(e) < 0) { const nx = W[S.i + 1]; return nx ? goTo(S.i + 1) : sheetFinish(); }
  showSet();
}
function undo() {
  const L = S.logged, e = cur();
  if (!L || L.id !== e.id || S.phase !== 'rest') return;
  const s = e.sets[L.i];
  s.done = false;
  delete s.record;
  e.best = L.best;
  S.logged = null;
  S.celebrating++;
  haptic(8);
  showSet();
}

async function goTo(i) {
  if (i === S.i && S.phase === 'set') return;
  S.i = i;
  S.celebrating++;
  S.phase = 'set';
  closeSheet();
  showSet({ fade: true });
}

/* ---------- sheets: one tap away, dragged down to close ---------- */
const sheetY = new Channel(el.sheet, 'transform', (v) => `translateY(${v}px)`, 0);
let sheetOpen = false, onSheetClose = null;
function openSheet(html, { onClose = null, bind = () => {} } = {}) {
  el.body.innerHTML = html;
  el.body.scrollTop = 0;
  bind(el.body);
  onSheetClose = onClose;
  const h = el.sheet.getBoundingClientRect().height || 600;
  el.sheet.style.visibility = 'visible';
  if (!sheetOpen) sheetY.set(h + 40);
  sheetOpen = true;
  sheetY.to(0, SPRINGS.set);
  el.scrim.classList.add('on');
  document.body.classList.add('sheeted');
  fadeTo(el.scrim, 1);
  stage?.dim(0.22);
}
function closeSheet(v = 0) {
  if (!sheetOpen) return;
  sheetOpen = false;
  const h = el.sheet.getBoundingClientRect().height;
  const a = sheetY.to(h + 40, SPRINGS.lift, { v });
  el.scrim.classList.remove('on');
  document.body.classList.remove('sheeted');
  fadeTo(el.scrim, 0);
  stage?.dim(0);
  const done = () => { if (!sheetOpen) { el.sheet.style.visibility = 'hidden'; el.body.innerHTML = ''; } };
  a ? a.finished.then(done, () => {}) : done();
  const f = onSheetClose; onSheetClose = null; f?.();
}
function fadeTo(node, o) {
  const from = getComputedStyle(node).opacity;
  node.style.opacity = o;
  node.animate([{ opacity: from }, { opacity: o }], { duration: RM.matches ? 100 : 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
el.scrim.addEventListener('click', () => closeSheet());
// drag the sheet down by its handle, or by its body when it's scrolled to the top
{
  let y0 = 0, t0 = 0, last = 0, lastT = 0, dragging = false, from = null;
  const down = (ev) => {
    if (!sheetOpen) return;
    if (ev.currentTarget === el.body && el.body.scrollTop > 0) return;
    if (ev.target.closest('button, textarea')) return;
    dragging = true; from = ev.currentTarget; y0 = last = ev.clientY; t0 = lastT = performance.now();
    from.setPointerCapture(ev.pointerId);
  };
  const move = (ev) => {
    if (!dragging) return;
    const dy = ev.clientY - y0;
    sheetY.set(dy > 0 ? dy : -Math.sqrt(-dy) * 2.2);
    lastT = performance.now(); last = ev.clientY;
    ev.preventDefault();
  };
  const up = (ev) => {
    if (!dragging) return;
    dragging = false;
    const dy = ev.clientY - y0, dt = Math.max(16, performance.now() - lastT), v = (ev.clientY - last) / dt * 1000;
    const h = el.sheet.getBoundingClientRect().height;
    if (dy > h * 0.28 || v > 700) closeSheet(v);
    else sheetY.to(0, SPRINGS.lift, { v });
  };
  for (const t of [el.grab, el.body]) {
    t.addEventListener('pointerdown', down);
    t.addEventListener('pointermove', move);
    t.addEventListener('pointerup', up);
    t.addEventListener('pointercancel', up);
  }
}
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

const tickSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const th = (e) => `<span class="th" style="background-image:url(${thumb(e)})"></span>`;

function sheetWorkout() {
  const done = W.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0), all = W.reduce((a, e) => a + e.sets.length, 0);
  openSheet(`
    <div class="sh-title">Push</div>
    <div class="sh-sub">${clockText()} · ${done} of ${all} sets · ${volume().toLocaleString('en-GB')} kg moved</div>
    <div class="sh-h">Exercises</div>
    <div class="rows">${W.map((e, k) => `
      <button class="row ex-row${k === S.i ? ' cur' : ''}" data-go="${k}">
        ${th(e)}
        <span class="v"><b>${esc(e.name)}</b><span>${plan(e)}</span></span>
        <span class="dots">${e.sets.map((s) => `<i class="${s.done ? 'on' : ''}"></i>`).join('')}</span>
      </button>`).join('')}
    </div>
    <button class="big-btn quiet" data-finish>Finish workout</button>`, {
    bind: (b) => {
      b.querySelectorAll('[data-go]').forEach((r) => r.addEventListener('click', () => { const k = +r.dataset.go; if (k === S.i) closeSheet(); else goTo(k); }));
      b.querySelector('[data-finish]').addEventListener('click', () => sheetFinish());
    },
  });
}

function chart(e) {
  const t = e.trend, w = 320, h = 110, lo = Math.min(...t) - 1, hi = Math.max(...t) + 1;
  const x = (k) => 8 + (k / (t.length - 1)) * (w - 16), y = (v) => 10 + (1 - (v - lo) / (hi - lo)) * (h - 30);
  const pts = t.map((v, k) => `${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Estimated max over 8 weeks, from ${fmt(t[0])} to ${fmt(t.at(-1))} kg">
    <defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    <polygon points="${x(0)},${h - 20} ${pts} ${x(t.length - 1)},${h - 20}" fill="url(#cg)"/>
    <polyline points="${pts}" fill="none" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${x(t.length - 1)}" cy="${y(t.at(-1))}" r="4" fill="var(--ink)"/>
    <text x="8" y="${h - 4}" fill="rgba(245,241,234,.42)" font-size="11">${DATES[0]}</text>
    <text x="${w - 8}" y="${h - 4}" fill="rgba(245,241,234,.42)" font-size="11" text-anchor="end">${DATES.at(-1)}</text>
  </svg>`;
}
function sheetExercise() {
  const e = cur(), n = nextSet(e);
  const gain = e.trend.at(-1) - e.trend[0];
  openSheet(`
    <div class="sh-title">${esc(e.name)}</div>
    <div class="sh-sub">${esc(e.muscles)}</div>
    <div class="sh-h">Today</div>
    <div class="rows">${e.sets.map((s, k) => `
      <div class="row"><span class="i">${k + 1}</span><span class="v">${fmt(s.kg)} <small>kg</small> × ${s.reps}</span>
      ${s.done ? `<span class="s${s.record ? ' gold' : ''}">${s.record ? 'New best' : ''}</span><span class="tick">${tickSvg}</span>` : `<span class="s${k === n ? ' now' : ''}">${k === n ? 'Now' : isRecord(e, s) ? 'Record try' : ''}</span>`}</div>`).join('')}
    </div>
    <div class="sh-h">Last time · ${e.last.date}</div>
    <div class="rows"><div class="row"><span class="v">${e.last.sets.map(([kg, r]) => `${fmt(kg)} × ${r}`).join('<small>·</small> ')}</span></div></div>
    <div class="sh-h">Estimated max · up ${fmt(Math.round(gain * 10) / 10)} kg in 8 weeks</div>
    ${chart(e)}
    <div class="sh-h">Options</div>
    <div class="opts">
      <button class="opt" data-swap><b>Swap exercise</b><span>Machine taken?</span></button>
      <button class="opt" data-rest><b>Rest <span data-restv>${mmss(e.rest)}</span></b><span>Tap to change</span></button>
      <button class="opt" data-add><b>Add a set</b><span>${fmt(e.sets.at(-1).kg)} kg × ${e.sets.at(-1).reps}</span></button>
      <button class="opt" data-note><b>Note</b><span>${e.note ? 'Edit' : 'For next time'}</span></button>
    </div>
    <textarea class="note" data-notebox placeholder="Seat height 4, grip one finger wider…" ${e.note ? '' : 'hidden'}>${esc(e.note)}</textarea>`, {
    bind: (b) => {
      b.querySelector('[data-swap]').addEventListener('click', () => sheetSwap());
      b.querySelector('[data-rest]').addEventListener('click', () => {
        const opts = [60, 75, 90, 120, 150, 180];
        e.rest = opts[(opts.indexOf(e.rest) + 1) % opts.length];
        setText(b.querySelector('[data-restv]'), mmss(e.rest));
      });
      b.querySelector('[data-add]').addEventListener('click', () => {
        e.sets.push({ ...e.sets.at(-1), done: false, record: undefined });
        segs(e, { animate: true });
        if (S.phase === 'set' && nextSet(e) === e.sets.length - 1) showSet();
        else if (S.phase === 'set') setText(el.label, `Set ${nextSet(e) + 1} of ${e.sets.length}`);
        else showSetOrRest();
        sheetExercise();
        toast(`Set ${e.sets.length} added`, () => { e.sets.pop(); segs(e, { animate: true }); showSetOrRest(); });
      });
      const box = b.querySelector('[data-notebox]');
      b.querySelector('[data-note]').addEventListener('click', () => { box.hidden = false; box.focus(); });
      box.addEventListener('input', () => { e.note = box.value; });
    },
  });
}
function showSetOrRest() {
  if (S.phase === 'set') return showSet();
  restNext(cur());
  if (el.label.textContent === 'Rest') setText(el.coach, esc(restLine(cur()))); // not during the new-best moment
}

function sheetSwap() {
  const e = cur(), base = W[S.i].baseId || e.id, alts = ALTS[base] || [];
  const left = e.sets.filter((s) => !s.done).length;
  openSheet(`
    <div class="sh-title">Swap ${esc(e.name.toLowerCase())}</div>
    <div class="sh-sub">${left ? `The ${words(left)} sets left move to the one you pick. Done sets stay.` : 'All sets are done; this changes nothing.'}</div>
    <div class="sh-h">Same muscles</div>
    <div class="rows">${alts.map((a, k) => `
      <button class="row ex-row" data-alt="${k}" ${left ? '' : 'disabled'}>${th(a)}
        <span class="v"><b>${esc(a.name)}</b><span>${left} × ${a.reps} · ${fmt(a.kg)} kg</span></span></button>`).join('')}
    </div>`, {
    bind: (b) => b.querySelectorAll('[data-alt]').forEach((r) => r.addEventListener('click', () => swapTo(alts[+r.dataset.alt]))),
  });
}
function swapTo(a) {
  const e = cur(), left = e.sets.filter((s) => !s.done).length;
  const neu = { ...a, baseId: e.baseId || e.id, note: '',
    sets: Array.from({ length: left }, () => ({ kg: a.kg, reps: a.reps, done: false })),
    last: { date: '12 Oct', sets: Array.from({ length: left }, () => [a.kg, a.reps - 1]) },
    best: { kg: a.kg, reps: a.reps, date: '12 Oct' }, trend: e.trend.map((v) => v * a.kg / e.sets[0].kg) };
  const before = { W: W.slice(), sets: e.sets, i: S.i };
  const done = e.sets.filter((s) => s.done);
  if (done.length) { e.sets = done; W.splice(S.i + 1, 0, neu); goTo(S.i + 1); }
  else { W[S.i] = neu; S.phase = 'set'; closeSheet(); showSet({ fade: true }); }
  toast(`Swapped to ${a.name.toLowerCase()}`, () => { W = before.W; e.sets = before.sets; S.i = before.i; S.phase = 'set'; showSet({ fade: true }); });
}

function sheetCoach() {
  const e = cur(), n = nextSet(e);
  const s = n >= 0 ? e.sets[n] : null;
  const prev = n >= 0 ? e.last.sets[n] : null;
  const gain = e.trend.at(-1) - e.trend[0];
  const why = [
    prev ? `Last time, set ${n + 1} was ${fmt(prev[0])} × ${prev[1]}.` : '',
    `Your best is ${fmt(e.best.kg)} × ${e.best.reps} (${e.best.date}).`,
    gain > 0 ? `Your estimated max is up ${fmt(Math.round(gain * 10) / 10)} kg in 8 weeks.` : 'Your estimated max has been flat for 8 weeks.',
  ].filter(Boolean).join(' ');
  const recTry = s && isRecord(e, s);
  const action = !s ? null : recTry
    ? { label: `Play it safe: set ${n + 1} at ${fmt(e.best.kg)} kg`, run: () => { const k = s.kg; s.kg = e.best.kg; return () => { s.kg = k; }; } }
    : { label: `Add a back-off set at ${fmt(Math.round(s.kg * 0.9 / e.step) * e.step)} kg`, run: () => { e.sets.push({ kg: Math.round(s.kg * 0.9 / e.step) * e.step, reps: s.reps + 2, done: false }); return () => { e.sets.pop(); }; } };
  openSheet(`
    <div class="sh-h" style="margin-top:4px">Coach</div>
    <div class="coach-body">${esc(S.phase === 'rest' ? restLine(e) : s ? coachLine(e, n) : restLine(e))}</div>
    <p class="coach-why">${esc(why)}</p>
    ${action ? `<button class="big-btn" data-act>${esc(action.label)}</button>` : ''}
    <button class="big-btn quiet" data-close>Keep the plan</button>`, {
    bind: (b) => {
      b.querySelector('[data-close]').addEventListener('click', () => closeSheet());
      b.querySelector('[data-act]')?.addEventListener('click', () => {
        const back = action.run();
        closeSheet();
        showSetOrRest(); segs(e, { animate: true });
        toast('Plan changed', () => { back(); showSetOrRest(); segs(e, { animate: true }); });
      });
    },
  });
}

/* The weight tray: big steppers near the thumb; the picture loads the bar as you tap. */
function sheetTray() {
  const e = cur(), n = nextSet(e);
  if (S.phase !== 'set') return;
  if (n < 0) return sheetExercise();
  const s = e.sets[n];
  const note = () => {
    if (e.kind === 'barbell') { const p = platesFor(s.kg).map((x) => fmt(x.kg)); return p.length ? `${p.join(' + ')} kg a side, on a 20 kg bar` : 'Just the bar'; }
    if (e.kind === 'dumbbells') return `Each dumbbell ${fmt(s.kg)} kg`;
    return `Pin in at ${fmt(s.kg)}`;
  };
  openSheet(`
    <div class="sh-title">Set ${n + 1}</div><div class="sh-sub">${esc(e.name)}</div>
    <div style="margin-top:10px">
      <div class="tray-row"><span class="lab">Weight</span><button class="step" data-d="kg:-1" aria-label="Less weight">${minusSvg}</button>
        <span class="val"><span class="num" data-v="kg"></span><small>kg</small></span><button class="step" data-d="kg:1" aria-label="More weight">${plusSvg}</button></div>
      <div class="tray-row"><span class="lab">Reps</span><button class="step" data-d="reps:-1" aria-label="Fewer reps">${minusSvg}</button>
        <span class="val"><span class="num" data-v="reps"></span></span><button class="step" data-d="reps:1" aria-label="More reps">${plusSvg}</button></div>
    </div>
    <p class="plates-note" data-note></p>
    <button class="big-btn" data-close>Done</button>`, {
    bind: (b) => {
      const kgN = b.querySelector('[data-v="kg"]'), rN = b.querySelector('[data-v="reps"]'), noteN = b.querySelector('[data-note]');
      const paint = (dir = 1) => {
        setNum(kgN, fmt(s.kg), { dir }); setNum(rN, s.reps, { dir });
        noteN.textContent = note();
        figures(s.kg, s.reps, dir);
        setText(el.coach, esc(coachLine(e, n)));
        picture(e, s.kg);
      };
      paint();
      b.querySelectorAll('[data-d]').forEach((btn) => {
        pressable(btn, { scale: 0.92 });
        btn.addEventListener('click', () => {
          const [k, d] = btn.dataset.d.split(':');
          if (k === 'kg') s.kg = Math.max(e.kind === 'barbell' ? 20 : e.step, Math.round((s.kg + +d * e.step) * 100) / 100);
          else s.reps = Math.max(1, Math.min(30, s.reps + +d));
          haptic(6);
          paint(+d);
        });
      });
      b.querySelector('[data-close]').addEventListener('click', () => closeSheet());
    },
  });
}
const minusSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 12h12"/></svg>';
const plusSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 12h12M12 6v12"/></svg>';

const volume = () => W.reduce((a, e) => a + e.sets.filter((s) => s.done).reduce((b, s) => b + s.kg * s.reps, 0), 0);
function sheetFinish() {
  const done = W.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0), all = W.reduce((a, e) => a + e.sets.length, 0);
  openSheet(`
    <div class="sh-title">Finish Push?</div>
    <div class="sh-sub">${done === all ? 'Every set is done.' : `${done} of ${all} sets done. The rest won’t be logged.`}</div>
    <button class="big-btn" data-yes>Finish workout</button>
    <button class="big-btn quiet" data-no>Keep going</button>`, {
    bind: (b) => {
      b.querySelector('[data-no]').addEventListener('click', () => closeSheet());
      b.querySelector('[data-yes]').addEventListener('click', () => summary());
    },
  });
}
function summary() {
  S.phase = 'done';
  S.celebrating++;
  stage?.focus(1, 1000);
  const recs = W.flatMap((e) => e.sets.filter((s) => s.record).map((s) => `${e.name} ${fmt(s.kg)} × ${s.reps}`));
  const done = W.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  openSheet(`
    <div class="sh-h" style="margin-top:4px">Workout done</div>
    <div class="sh-title">Push</div>
    <div class="stats">
      <div><b>${Math.round((Date.now() - S.started) / 60000)}</b><span>Minutes</span></div>
      <div><b>${volume().toLocaleString('en-GB')}</b><span>Kg moved</span></div>
      <div><b>${done}</b><span>Sets</span></div>
    </div>
    ${recs.length ? `<div class="sh-h">New best</div><div class="coach-body">${recs.map(esc).join('<br>')}</div>` : ''}
    <div class="sh-h">Exercises</div>
    <div class="rows">${W.map((e) => `<div class="row ex-row">${th(e)}<span class="v"><b>${esc(e.name)}</b><span>${e.sets.some((s) => s.done) ? `${e.sets.filter((s) => s.done).length} of ${e.sets.length} sets · best ${bestToday(e)}` : 'Not done today'}</span></span></div>`).join('')}</div>
    <button class="big-btn" data-again>Start the demo again</button>`, {
    onClose: () => { if (S.phase === 'done') restart(); },
    bind: (b) => b.querySelector('[data-again]').addEventListener('click', () => closeSheet()),
  });
}
function restart() {
  W = fresh();
  Object.assign(S, { i: 0, phase: 'set', logged: null, started: Date.now() - (18 * 60 + 42) * 1000, pulled: false });
  shown.id = null;
  showSet({ fade: true });
}

/* ---------- the undo capsule ---------- */
let toastTimer = 0, toastUndo = null;
function toast(text, onUndo) {
  el.toastText.textContent = text;
  toastUndo = onUndo;
  el.toastUndo.hidden = !onUndo;
  el.toast.style.visibility = 'visible';
  play(el.toast, [{ opacity: 0, transform: 'translateX(-50%) translateY(10px) scale(0.96)' }, { opacity: 1, transform: 'translateX(-50%)' }], SPRINGS.set);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 4200);
}
function hideToast() {
  if (el.toast.style.visibility !== 'visible') return;
  const a = el.toast.animate([{ opacity: 1 }, { opacity: 0 }], { ...EXIT, duration: 180 });
  a.finished.then(() => { el.toast.style.visibility = 'hidden'; }, () => {});
}
el.toastUndo.addEventListener('click', () => { const f = toastUndo; toastUndo = null; hideToast(); f?.(); });

/* ---------- wiring ---------- */
pressable(el.go, { scale: 0.97 });
[el.minus, el.plus, $('#wkBtn'), $('#finishBtn'), el.peek].forEach((b) => pressable(b, { scale: 0.95 }));
el.go.addEventListener('click', tick);
el.minus.addEventListener('click', () => { S.restEnd = Math.max(Date.now(), S.restEnd - 15000); haptic(6); updateTimer(); });
el.plus.addEventListener('click', () => { S.restEnd += 15000; haptic(6); updateTimer(); });
$('#kgBtn').addEventListener('click', sheetTray);
$('#repsBtn').addEventListener('click', sheetTray);
$('#nameBtn').addEventListener('click', sheetExercise);
$('#coachBtn').addEventListener('click', sheetCoach);
$('#wkBtn').addEventListener('click', sheetWorkout);
el.peek.addEventListener('click', sheetWorkout);
$('#finishBtn').addEventListener('click', sheetFinish);
el.meta.addEventListener('click', (ev) => { if (ev.target.closest('#undo')) undo(); });

const clockText = () => `${Math.max(1, Math.floor((Date.now() - S.started) / 60000))} min`;
setInterval(() => { const c = clockText(); if (el.clock.textContent !== c) el.clock.textContent = c; updateTimer(); }, 250);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateTimer(); });
let sizing = 0;
addEventListener('resize', () => { cancelAnimationFrame(sizing); sizing = requestAnimationFrame(() => stage?.resize()); });

/* ---------- start ---------- */
const params = new URLSearchParams(location.search);
showSet();
el.clock.textContent = clockText();

(async () => {
  stage = await createStage(el.pic);
  const e = cur(), n = nextSet(e);
  Object.assign(shown, { kind: e.kind, id: e.id, kg: e.sets[n]?.kg ?? e.sets[0].kg });
  await stage.show(e.kind, shown.kg, LOOK[e.kind]);
  requestAnimationFrame(() => el.pic.classList.add('on'));
  // states for screenshots and the phone: ?s=rest | record | tray | workout | exercise | coach | next
  const s = params.get('s');
  if (s) await demo(s);
  window.ready = true;
})();

async function demo(s) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  if (s === 'rest') { tick(); await wait(1200); }
  if (s === 'record') { tick(); await wait(300); endRest(); await wait(900); tick(); S.celebrating++; await wait(1700); } // holds the moment
  if (s === 'restend') { tick(); S.restEnd = Date.now() + 3000; await wait(1500); }
  if (s === 'tray') { sheetTray(); await wait(700); }
  if (s === 'load') { sheetTray(); await wait(500); document.querySelector('[data-d="kg:1"]').click(); await wait(1200); }
  if (s === 'workout') { sheetWorkout(); await wait(700); }
  if (s === 'exercise') { sheetExercise(); await wait(700); }
  if (s === 'done') { W[0].sets.forEach((x) => { x.done = true; }); goTo(1); await wait(300); goTo(0); await wait(1500); }
  if (s === 'coach') { sheetCoach(); await wait(700); }
  if (s === 'next') { goTo(1); await wait(1500); }
  if (s === 'cable') { goTo(2); await wait(1500); }
  if (s === 'finish') { summary(); await wait(900); }
}
