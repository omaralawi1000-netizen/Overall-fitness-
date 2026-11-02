// Heat workout: a calm surface with the depth one tap away. Each moment is built from one of Omar's hearted clips:
// tick = Not Boring's dot that swells into a pearl and settles into a check; rest = Apple Watch's button that grows
// into the timer ring, calmed like Peace Out (the time fades in once the ring has settled); numbers = Push's
// single-digit roll with motion blur; labels = the multi-state badge's blur swap; details = trays that grow out of
// what you tapped (Family) and the name that grows into its page (card to page); record = Nike's takeover from the
// logged set, Any Distance's medal turning to catch the light, Fitness Wrapped's count-up that locks in.
import { play, SPRINGS, reduced } from '../../round/motion.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmtKg = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.ceil(s)) % 60).padStart(2, '0')}`;
const wait = (ms) => new Promise((r) => setTimeout(r, reduced() ? Math.min(ms, 60) : ms));
const e1rm = (kg, r) => Math.round(kg * (1 + r / 30) * 10) / 10;
const root = document.documentElement;

/* Grain tile, once. */
{
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), img = x.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 10; }
  x.putImageData(img, 0, 0); root.style.setProperty('--grain', `url(${c.toDataURL()})`);
}

/* ---------- The workout ---------- */
const S = (kg, r, prev, done = false) => ({ kg, r, prev, done });
function fresh() {
  return {
    rest: 90, start: Date.now() - (41 * 60 + 12) * 1000, superset: false,
    ex: [
      { name: 'Overhead press', kit: 'Shoulders · Triceps · Barbell', best: { kg: 42.5, r: 6, date: '26 Oct' }, sets: [S(40, 8, '40 × 8', true), S(42.5, 6, '42.5 × 5', true), S(42.5, 6, '42.5 × 5', true)] },
      { name: 'Bench press', kit: 'Chest · Triceps · Barbell', alts: ['Dumbbell bench press', 'Machine chest press', 'Smith bench press'], note: '',
        best: { kg: 82.5, r: 6, date: '12 Oct' }, last: { date: 'Thu 29 Oct', sets: ['80 × 8', '82.5 × 6', '82.5 × 5', '82.5 × 5'] },
        hist: [[80, 6], [80, 7], [80, 8], [82.5, 5], [82.5, 6], [82.5, 5], [82.5, 6]], dates: ['1 Oct', '29 Oct'],
        how: ['Feet flat, shoulder blades pinned back.', 'Lower the bar to mid-chest under control.', 'Press up and slightly back over the shoulders.'],
        sets: [S(80, 8, '80 × 8', true), S(82.5, 6, '82.5 × 6', true), S(82.5, 6, '82.5 × 5'), S(82.5, 6, '82.5 × 5')] },
      { name: 'Incline dumbbell press', kit: 'Upper chest · Dumbbells', alts: ['Incline bench press', 'Incline machine press'], note: '',
        best: { kg: 30, r: 10, date: '22 Oct' }, last: { date: 'Thu 29 Oct', sets: ['30 × 10', '30 × 9', '30 × 9'] },
        hist: [[26, 10], [28, 9], [28, 10], [30, 8], [30, 9], [30, 10], [30, 9]], dates: ['1 Oct', '29 Oct'],
        how: ['Bench at 30 degrees.', 'Elbows about 45 degrees from the body.', 'Touch the dumbbells lightly at the top.'],
        sets: [S(30, 10, '30 × 10'), S(30, 10, '30 × 9'), S(30, 10, '30 × 9')] },
      { name: 'Cable fly', kit: 'Chest · Cable', best: { kg: 15, r: 12, date: '29 Oct' }, sets: [S(15, 12, '15 × 12'), S(15, 12, '15 × 12'), S(15, 12, '15 × 11')] },
      { name: 'Lateral raise', kit: 'Side delts · Dumbbells', best: { kg: 10, r: 15, date: '29 Oct' }, sets: [S(10, 15, '10 × 15'), S(10, 15, '10 × 14'), S(10, 15, '10 × 13')] },
      { name: 'Triceps pushdown', kit: 'Triceps · Cable', best: { kg: 27.5, r: 12, date: '22 Oct' }, sets: [S(27.5, 12, '27.5 × 12'), S(27.5, 12, '27.5 × 12'), S(27.5, 12, '27.5 × 10')] },
    ],
    e: 1, s: 2, used: null,
  };
}
let W = fresh();
const ex = () => W.ex[W.e];
const set = () => ex().sets[W.s];
const beats = (x, b) => x.kg > b.kg || (x.kg === b.kg && x.r > b.r);

/* ---------- Motion pieces ---------- */
/** Only the characters that change roll, with a touch of motion blur (Push). */
function roll(el, text, dir = 1) {
  el.classList.add('roll');
  const fresh = !el.querySelector('.c');
  if (fresh) el.textContent = '';
  const chars = [...String(text)], cols = [...el.children];
  while (cols.length > chars.length) { const c = cols.pop(); c.remove(); }
  chars.forEach((ch, i) => {
    let col = cols[i];
    if (!col) {
      col = document.createElement('span'); col.className = 'c'; col.dataset.ch = ch;
      const d = document.createElement('span'); d.className = 'd'; d.textContent = ch; col.append(d); el.append(col);
      if (!fresh) play(d, [{ transform: 'translateY(60%)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.type);
      return;
    }
    if (col.dataset.ch === ch) return;
    col.dataset.ch = ch;
    col.querySelectorAll('.d.out').forEach((o) => o.remove());
    const old = col.querySelector('.d'), nw = document.createElement('span');
    nw.className = 'd'; nw.textContent = ch; old.classList.add('out'); col.append(nw);
    const k = dir >= 0 ? 1 : -1;
    play(old, [{ transform: 'none', opacity: 1, filter: 'blur(0)' }, { transform: `translateY(${-100 * k}%)`, opacity: 0, filter: 'blur(3px)' }], SPRINGS.type, { fill: 'forwards' }).finished.then(() => old.remove(), () => old.remove());
    play(nw, [{ transform: `translateY(${100 * k}%)`, opacity: 0, filter: 'blur(3px)' }, { transform: 'none', opacity: 1, filter: 'blur(0)' }], SPRINGS.type);
  });
}
/** A label blurs out, the new one blurs in (multi-state badge). */
async function swapText(el, text) {
  if (el.textContent === text) return;
  if (reduced()) { el.textContent = text; return; }
  const out = el.animate([{ opacity: 1, filter: 'blur(0)' }, { opacity: 0, filter: 'blur(4px)' }], { duration: 140, easing: 'ease-in', fill: 'forwards' });
  await out.finished.catch(() => {});
  el.textContent = text;
  out.cancel();
  el.animate([{ opacity: 0, filter: 'blur(4px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
function press(el, scale = 0.96) {
  const up = () => { if (!el.classList.contains('down')) return; el.classList.remove('down'); el.style.scale = ''; play(el, [{ scale: String(scale) }, { scale: '1' }], SPRINGS.type); };
  el.addEventListener('pointerdown', () => { el.classList.add('down'); el.style.scale = String(scale); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => el.addEventListener(t, up));
}

/* ---------- The calm surface ---------- */
function coach() {
  const x = ex(), c = set();
  if (W.used) return { say: `Using <b class="num">${fmtKg(W.used.kg)} kg</b> on this set.`, why: 'Changed by the Coach. Undo puts it back.', undo: true };
  if (x.name === 'Bench press' && W.s === 2 && c.kg < 85) return { say: 'Sets 1 and 2 moved fast. Try <b class="num">85 kg</b> now?', why: `85 × 6 would beat your best (82.5 × 6, ${x.best.date}) by 2.5 kg.`, use: 85 };
  if (beats(c, x.best)) return { say: `<b class="num">${fmtKg(c.kg)} × ${c.r}</b> beats your best. Take the full rest first.`, why: `Your best is ${fmtKg(x.best.kg)} × ${x.best.r}, ${x.best.date}.` };
  if (x.name.startsWith('Incline')) return { say: 'Last time 30 × 9 on sets 2 and 3. Get all 10 today and it goes up next week.', why: 'Two sessions at 30 kg so far.' };
  return { say: 'On plan. Nothing to change.', why: 'The Coach speaks up when something is worth changing.' };
}
function dotsHTML() {
  const x = ex();
  return x.sets.map((p, i) => `<i class="${p.done ? (p.rec ? 'rec' : 'd') : i === W.s ? 'c' : ''} ${!p.done && beats(p, x.best) ? 'goal' : ''}"></i>`).join('');
}
function nextLine() {
  const x = ex();
  if (W.s < x.sets.length - 1) { const n = x.sets[W.s + 1]; return `Then set ${W.s + 2} · <b class="num">${fmtKg(n.kg)} × ${n.r}</b>`; }
  const nx = W.ex[W.e + 1];
  return nx ? `${W.superset ? 'Superset with' : 'Then'} <b>${nx.name}</b>` : 'Last exercise';
}
function paint({ animate = false, dir = 1 } = {}) {
  const x = ex(), c = set();
  if (!animate) { $('.nm').textContent = x.name; $('.kg').textContent = ''; $('.reps').textContent = ''; }
  roll($('.kg'), fmtKg(c.kg), dir); roll($('.reps'), c.r, dir);
  $('.kg').classList.toggle('over', beats(c, x.best));
  $('.dots').innerHTML = dotsHTML();
  const b = `Set ${W.s + 1} of ${x.sets.length}`;
  if (animate) swapText($('.bt'), b); else $('.bt').textContent = b;
  $('.lt').innerHTML = x.last ? `Last time <b class="num">${x.last.sets[W.s] ?? x.last.sets.at(-1)}</b>` : `Best <b class="num">${fmtKg(x.best.kg)} × ${x.best.r}</b>`;
  $('.th').innerHTML = nextLine();
  $('.ds').textContent = `Set ${W.s + 1}`;
  $('.coach').classList.toggle('quiet', !coach().use && !W.used);
}

/* Elapsed time: only the last digits tick. */
// The elapsed clock stops rolling while something covers it (rest, record, a tray): nothing moves behind live blur.
setInterval(() => { if (!root.dataset.phase && !open && !document.hidden) roll($('.clock'), mmss((Date.now() - W.start) / 1000)); }, 1000);
roll($('.clock'), mmss((Date.now() - W.start) / 1000));

/* ---------- Numbers: tap one and its − and + unfold out of it ---------- */
let editT = 0;
function closeEdit() { $$('.field.edit').forEach((f) => f.classList.remove('edit')); $('.slab').classList.remove('editing'); }
$$('.field').forEach((f) => {
  $('.val', f).addEventListener('click', () => {
    if (busy) return;
    const was = f.classList.contains('edit');
    closeEdit();
    if (!was) { f.classList.add('edit'); $('.slab').classList.add('editing'); }
    clearTimeout(editT); editT = setTimeout(closeEdit, 5000);
  });
  $$('.step', f).forEach((b) => {
    press(b, 0.9);
    b.addEventListener('click', () => {
      const c = set(), d = +b.dataset.d;
      if (f.dataset.f === 'kg') c.kg = Math.max(0, c.kg + d * 2.5); else c.r = Math.max(1, c.r + d);
      W.used = null; navigator.vibrate?.(4);
      roll($('.kg'), fmtKg(c.kg), d); roll($('.reps'), c.r, d);
      $('.kg').classList.toggle('over', beats(c, ex().best));
      $('.dots').innerHTML = dotsHTML(); $('.th').innerHTML = nextLine();
      $('.coach').classList.toggle('quiet', !coach().use);
      clearTimeout(editT); editT = setTimeout(closeEdit, 5000);
    });
  });
});
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.field')) closeEdit(); });

/* ---------- Trays: grow out of what you tapped, shrink back into it ---------- */
const tray = $('.tray'), tin = $('.tray-in'), scrim = $('.scrim');
let open = null;
const CHECK = '<svg class="ok" viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg>';
function chartSVG(x) {
  const v = x.hist.map(([kg, r]) => e1rm(kg, r)), lo = Math.min(...v) - 2, hi = Math.max(...v) + 2, W_ = 320, H = 110;
  const pts = v.map((y, i) => [i * (W_ / (v.length - 1)), H - ((y - lo) / (hi - lo)) * H]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) { // a smooth curve through the points (Catmull-Rom as Béziers)
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  const end = pts.at(-1);
  return `<svg viewBox="0 0 ${W_} ${H}" preserveAspectRatio="none"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--g2)" stop-opacity=".35"/><stop offset="1" stop-color="var(--g2)" stop-opacity="0"/></linearGradient></defs>
    <path class="area" d="${d} L${W_},${H} L0,${H}Z"/><path class="line" d="${d}" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:1"/><circle class="dot" cx="${end[0]}" cy="${end[1]}" r="4"/></svg>
    <div class="ax"><span>${x.dates[0]}</span><span>Est. best ${v.at(-1)} kg</span><span>${x.dates[1]}</span></div>`;
}
/** Everything you can change about the exercise sits at the bottom of its own page: one door, not two. */
function tools() {
  const x = ex(), nx = W.ex[W.e + 1];
  return `<p class="cap lbl">Today only</p>
      ${x.alts ? `<button type="button" class="row" data-a="replace" style="width:100%;text-align:left"><span>⇄</span><span>Swap for another exercise</span><span class="p">›</span></button>` : ''}
      ${nx ? `<button type="button" class="row" data-a="superset" style="width:100%;text-align:left"><span>∞</span><span>Superset with ${nx.name}</span><span class="p ss">${W.superset ? CHECK : ''}</span></button>` : ''}
      <p class="cap lbl">Note</p><textarea class="note" placeholder="Seat height, cues, how it felt…">${x.note || ''}</textarea>
      <p class="cap lbl">Rest after a set</p>
      <div class="stepper"><button type="button" data-a="rest-" aria-label="Shorter rest">−</button><span class="num rv">${mmss(W.rest)}</span><button type="button" data-a="rest+" aria-label="Longer rest">+</button></div>`;
}
const VIEWS = {
  coach() {
    const c = coach();
    return `<p class="cap">Coach</p><p class="say">${c.say}</p><p class="why">${c.why}</p>
      ${c.use ? `<div class="acts"><button type="button" class="pillbtn solid" data-a="use">Use ${c.use} kg</button><button type="button" class="pillbtn frost" data-a="close">Not now</button></div>` : ''}
      ${c.undo ? `<div class="acts"><button type="button" class="pillbtn frost" data-a="unuse">Undo</button></div>` : ''}`;
  },
  last() {
    const x = ex();
    if (!x.last) return `<p class="cap">Best</p><h3 class="serif">${x.name}</h3><p class="sub">${fmtKg(x.best.kg)} × ${x.best.r} · ${x.best.date}</p>`;
    return `<p class="cap">Last time</p><h3 class="serif">${x.last.date}</h3>
      <div style="margin-top:10px">${x.last.sets.map((t, i) => `<div class="row"><span class="p">Set ${i + 1}</span><span class="num">${t}</span><span></span></div>`).join('')}</div>
      <p class="why">Best ${fmtKg(x.best.kg)} × ${x.best.r} on ${x.best.date}</p>`;
  },
  sets() {
    const x = ex();
    return `<p class="cap">${x.name}</p>
      <div class="row" style="border:0;color:var(--dim);font-size:12px;min-height:30px"><span>Set</span><span>Last time</span><span>Today</span></div>
      ${x.sets.map((p, i) => `<div class="row ${i === W.s ? 'now' : ''}"><span class="k">${i + 1}</span><span class="p num">${p.prev}</span>
        <span class="num" style="display:flex;align-items:center;gap:8px">${p.done ? CHECK : ''}${fmtKg(p.kg)} × ${p.r}${!p.done && beats(p, x.best) ? '<span class="tag">BEST</span>' : ''}${p.rec ? '<span class="tag">NEW BEST</span>' : ''}</span></div>`).join('')}`;
  },
  workout() {
    const mins = Math.round((Date.now() - W.start) / 60000);
    return `<p class="cap">Push · ${mins} min in · about 24 min left</p>
      <div class="wk" style="margin-top:8px">${W.ex.map((x, i) => {
        const d = x.sets.filter((p) => p.done).length, st = i < W.e ? 'done' : i === W.e ? 'cur' : '';
        return `<div class="row ${st}"><i class="pt"></i><span class="serif">${x.name}${W.superset && i === W.e + 1 ? ' <span class="tag">SUPERSET</span>' : ''}</span><span class="p num">${st === 'done' ? `${x.sets.length} sets` : st === 'cur' ? `${d} of ${x.sets.length}` : `${x.sets.length} × ${x.sets[0].r} · ${fmtKg(x.sets[0].kg)}`}</span></div>`;
      }).join('')}</div>`;
  },
  exercise() {
    const x = ex(), c = set(), est = e1rm(x.best.kg, x.best.r);
    return `<i class="close-hint"></i><h3 class="serif" style="font-size:40px">${x.name}</h3><p class="sub">${x.kit}</p>
      <div class="target"><p class="cap">Today · set ${W.s + 1}</p><div><span class="num t">${fmtKg(c.kg)}</span> <span style="color:var(--soft)">kg ×</span> <span class="num t">${c.r}</span></div>
        <p>${beats(c, x.best) ? `A new best by ${fmtKg(c.kg - x.best.kg) || 0} kg if you make it.` : `${x.sets.filter((p) => p.done).length} of ${x.sets.length} sets done.`}</p></div>
      <div class="stats"><div><small>Last time</small><b>${x.last ? x.last.sets[0] : '–'}</b></div><div><small>Heaviest</small><b>${fmtKg(x.best.kg)} kg</b></div><div><small>Est. 1RM</small><b>${est}</b></div></div>
      ${x.hist ? `<p class="cap lbl">Progress</p><div class="chart">${chartSVG(x)}</div>` : ''}
      ${x.last ? `<p class="cap lbl">Recent</p><div class="row rec"><span class="p">${x.last.date.split(' ').slice(1).join(' ')}</span><span class="num">${x.last.sets.join(' · ')}</span></div>` : ''}
      ${x.how ? `<p class="cap lbl">How to do it</p><ol class="howto">${x.how.map((h) => `<li>${h}</li>`).join('')}</ol>` : ''}
      ${tools()}`;
  },
};
function placeTray(kind, a) {
  tray.classList.toggle('page', kind === 'exercise');
  tray.style.top = tray.style.bottom = '';
  if (kind === 'exercise') return;
  const r = a.getBoundingClientRect();
  if (r.top + r.height / 2 < innerHeight / 2) tray.style.top = `${Math.round(r.bottom + 8)}px`;
  else tray.style.bottom = `${Math.round(innerHeight - r.top + 8)}px`;
}
function grow(a, from = true) {
  const r = a.getBoundingClientRect(), t = tray.getBoundingClientRect();
  const k = `translate(${r.left - t.left}px, ${r.top - t.top}px) scale(${r.width / t.width}, ${r.height / t.height})`;
  return from ? [{ transform: k, opacity: 0.6 }, { transform: 'none', opacity: 1 }] : [{ transform: 'none', opacity: 1 }, { transform: k, opacity: 0 }];
}
function openTray(kind, anchor) {
  if (busy) return;
  closeEdit();
  if (open) { morph(kind); return; }
  open = { kind, anchor };
  tin.innerHTML = VIEWS[kind](); tin.scrollTop = 0;
  tray.hidden = scrim.hidden = false;
  placeTray(kind, anchor);
  play(tray, grow(anchor), SPRINGS.lift);
  tin.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: reduced() ? 0 : 90, fill: 'backwards' });
  scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
  const line = $('.chart .line', tin);
  if (line) line.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 900, delay: 260, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' });
}
/** One tray changes its content and height in place (Family sheet morph). */
function morph(kind) {
  const h0 = tray.getBoundingClientRect().height;
  tin.innerHTML = VIEWS[kind](); open.kind = kind;
  const h1 = tray.getBoundingClientRect().height;
  if (!reduced() && Math.abs(h1 - h0) > 1) play(tray, [{ clipPath: `inset(0 0 ${Math.max(0, h1 - h0)}px 0 round 30px)` }, { clipPath: 'inset(0 0 0 0 round 30px)' }], SPRINGS.set);
  tin.animate([{ opacity: 0, filter: 'blur(4px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 240, easing: 'ease-out' });
}
async function closeTray() {
  if (!open) return;
  const { anchor } = open; open = null;
  const note = $('.note', tin); if (note) ex().note = note.value;
  scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
  tin.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 90, fill: 'forwards' });
  await play(tray, grow(anchor, false), SPRINGS.set, { fill: 'forwards' }).finished.catch(() => {});
  tray.getAnimations().forEach((a) => a.cancel()); scrim.getAnimations().forEach((a) => a.cancel()); tin.getAnimations().forEach((a) => a.cancel());
  tray.hidden = scrim.hidden = true;
}
$$('[data-open]').forEach((b) => { press(b, 0.97); b.addEventListener('click', () => openTray(b.dataset.open, b)); });
scrim.addEventListener('click', closeTray);
tray.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, x = ex();
  if (a === 'close') closeTray();
  if (a === 'use') { W.used = { kg: coach().use, was: set().kg }; set().kg = W.used.kg; roll($('.kg'), fmtKg(set().kg), 1); $('.kg').classList.toggle('over', beats(set(), x.best)); $('.dots').innerHTML = dotsHTML(); morph('coach'); }
  if (a === 'unuse') { set().kg = W.used.was; W.used = null; roll($('.kg'), fmtKg(set().kg), -1); $('.kg').classList.toggle('over', beats(set(), x.best)); $('.dots').innerHTML = dotsHTML(); morph('coach'); }
  if (a === 'replace') { // the choices unfold right under the row you tapped
    const nx = b.nextElementSibling;
    if (nx && nx.classList.contains('alts')) { nx.remove(); return; }
    const d = document.createElement('div'); d.className = 'alts';
    d.innerHTML = x.alts.map((v) => `<button type="button" class="row" data-a="pick" data-v="${v}"><span></span><span class="serif">${v}</span><span class="p">›</span></button>`).join('');
    b.after(d);
    if (!reduced()) play(d, [{ clipPath: 'inset(0 0 100% 0)', opacity: 0 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], SPRINGS.set);
  }
  if (a === 'pick') { x.name = b.dataset.v; x.last = null; x.hist = null; x.how = null; closeTray().then(() => nameTo(x.name)); }
  if (a === 'superset') { W.superset = !W.superset; $('.ss', tin).innerHTML = W.superset ? CHECK : ''; $('.th').innerHTML = nextLine(); }
  if (a === 'rest-' || a === 'rest+') { W.rest = Math.max(30, Math.min(300, W.rest + (a === 'rest+' ? 15 : -15))); roll($('.rv', tin), mmss(W.rest), a === 'rest+' ? 1 : -1); }
});
tray.addEventListener('input', (e) => { if (e.target.classList.contains('note')) ex().note = e.target.value; });

/** The name slides out and the new one slides in (Md Vinyl's next). */
async function nameTo(text) {
  const nm = $('.nm');
  if (!reduced()) await nm.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateX(-40px)', opacity: 0 }], { duration: 180, easing: 'ease-in', fill: 'forwards' }).finished;
  nm.textContent = text;
  nm.getAnimations().forEach((a) => a.cancel());
  play(nm, [{ transform: 'translateX(48px)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.set);
}

/* ---------- Tick: a dot swells into a pearl and settles into a check (Not Boring) ---------- */
let busy = false, undoTo = null;
const pearl = $('.pearl');
{ const t = $('.ticks', pearl); for (let i = 0; i < 10; i++) { const b = document.createElement('b'); b.style.setProperty('--a', `${i * 36 + (i % 2) * 9}deg`); t.append(b); } }
async function pearlIn(gold) {
  pearl.classList.toggle('gold', gold);
  const ball = $('.ball', pearl), path = $('svg path', pearl);
  if (reduced()) { ball.style.transform = 'scale(1)'; path.style.strokeDashoffset = 0; return; }
  $$('.ticks b', pearl).forEach((b, i) => {
    const a = b.style.getPropertyValue('--a');
    b.animate([{ transform: `rotate(${a}) translateY(-10px) scaleY(.4)`, opacity: 0 }, { transform: `rotate(${a}) translateY(-22px)`, opacity: 0.8, offset: 0.4 }, { transform: `rotate(${a}) translateY(-30px) scaleY(.6)`, opacity: 0 }],
      { duration: 520, delay: 60 + (i % 3) * 40, easing: 'cubic-bezier(.2,.7,.3,1)' });
  });
  ball.animate([{ transform: 'scale(0)' }, { transform: 'scale(.16)', offset: 0.12 }, { transform: 'scale(1.1)', offset: 0.72 }, { transform: 'scale(1)' }], { duration: 640, easing: 'cubic-bezier(.3,.6,.3,1)', fill: 'forwards' });
  path.animate([{ strokeDashoffset: 20 }, { strokeDashoffset: 0 }], { duration: 220, delay: 470, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
  navigator.vibrate?.(8);
  await wait(720);
}
function pearlOut() { [$('.ball', pearl), $('svg path', pearl)].forEach((e) => { e.getAnimations().forEach((a) => a.cancel()); e.style.transform = ''; e.style.strokeDashoffset = ''; }); pearl.classList.remove('gold'); }

async function tick() {
  if (busy) return; busy = true; closeEdit();
  const x = ex(), c = set(), rec = beats(c, x.best);
  await pearlIn(rec);
  undoTo = { e: W.e, s: W.s, best: { ...x.best } };
  c.done = true;
  if (rec) { c.rec = true; await recordMoment(c); x.best = { kg: c.kg, r: c.r, date: 'today' }; }
  W.used = null;
  if (W.s < x.sets.length - 1) W.s++; else if (W.e < W.ex.length - 1) { W.e++; W.s = 0; }
  await startRest();
}

/* ---------- Rest: the pill grows into the ring; the time fades in once it settles (Watch + Peace Out) ---------- */
const rest = $('.rest'), ring = $('.ring'), arc = $('.arc'), pill = $('.done');
let iv = 0, endsAt = 0, arcAnim = null, total = 90;
function pillToRing(dir) {
  const p = pill.getBoundingClientRect(), r = $('.ring-wrap').getBoundingClientRect();
  const k = `translate(${p.left + p.width / 2 - (r.left + r.width / 2)}px, ${p.top + p.height / 2 - (r.top + r.height / 2)}px) scale(${p.width / r.width}, ${p.height / r.height})`;
  const f = [{ transform: k, opacity: 0.4 }, { transform: 'none', opacity: 1 }];
  return play(ring, dir > 0 ? f : f.reverse(), dir > 0 ? SPRINGS.lift : SPRINGS.set, { fill: 'forwards' });
}
function runArc() {
  arcAnim?.cancel();
  const left = Math.max(0, endsAt - performance.now());
  arc.style.strokeDashoffset = 804.25;
  // The arc moves in small steps (5 a second, about 2 px each): it looks continuous, but the frost behind it is
  // re-blurred 5 times a second instead of every frame. A smooth arc over two layers of live blur dropped to ~25 fps.
  arcAnim = arc.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 804.25 }], { duration: total * 1000, easing: `steps(${Math.round(total * 5)})` });
  arcAnim.currentTime = total * 1000 - left;
}
function tickClock() {
  const left = (endsAt - performance.now()) / 1000;
  const t = mmss(left), rc = $('.rclock');
  if (rc.textContent !== t) rc.textContent = t;
  if (left <= 0) endRest(true);
}
async function startRest() {
  const n = set(), sameEx = undoTo && undoTo.e === W.e;
  $('.rnext').innerHTML = sameEx ? `Next · set ${W.s + 1} · <b class="num">${fmtKg(n.kg)} × ${n.r}</b>` : `Next · <b>${ex().name}</b> · <span class="num">${fmtKg(n.kg)} × ${n.r}</span>`;
  total = W.rest; endsAt = performance.now() + total * 1000; tickClock();
  rest.hidden = false; root.dataset.phase = 'rest';
  runArc();
  $('.rest-frost').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
  pill.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
  pillToRing(1);
  $('.ring-in').animate([{ opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 420, delay: reduced() ? 0 : 380, fill: 'backwards', easing: 'ease-out' });
  $$('.rnext, .rctl, .undo', rest).forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: reduced() ? 0 : 300 + i * 50, fill: 'backwards', easing: 'cubic-bezier(.2,.8,.2,1)' }));
  iv = setInterval(tickClock, 200);
  busy = false;
}
async function endRest(advance) {
  if (rest.hidden || rest.dataset.closing) return;
  rest.dataset.closing = '1';
  clearInterval(iv); root.dataset.phase = '';
  const prevE = undoTo?.e;
  $('.rest-frost').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
  $$('.rnext, .rctl, .undo, .ring-in', rest).forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }));
  await pillToRing(-1).finished.catch(() => {});
  [ring, $('.rest-frost'), ...$$('.rnext, .rctl, .undo, .ring-in', rest)].forEach((e) => e.getAnimations().forEach((a) => a.cancel()));
  arcAnim?.cancel(); rest.hidden = true; delete rest.dataset.closing;
  pill.getAnimations().forEach((a) => a.cancel());
  pearlOut();
  if (advance) {
    // The ring has gone back into the pill; now the screen moves to the next set: the dot fills, the badge
    // blurs to the new set, only the digits that change roll.
    if (prevE !== W.e) await nameTo(ex().name);
    paint({ animate: true });
    const d = $$('.dots i')[Math.max(0, W.s - 1)];
    if (d && prevE === W.e) play(d, [{ transform: 'scale(1.7)' }, { transform: 'none' }], SPRINGS.press);
  } else paint({ animate: true, dir: -1 });
  undoTo = null;
}
function undoSet() {
  if (!undoTo) return;
  const u = undoTo;
  W.e = u.e; W.s = u.s; const c = set(); c.done = false; c.rec = false; ex().best = u.best;
  endRest(false);
}
$('[data-a=tick]').addEventListener('click', tick); press(pill, 0.97);
$('[data-a=skip]').addEventListener('click', () => endRest(true));
$('[data-a=undo]').addEventListener('click', undoSet);
$('[data-a=less]').addEventListener('click', () => { endsAt -= 15000; total = Math.max(15, total - 15); runArc(); tickClock(); });
$('[data-a=more]').addEventListener('click', () => { endsAt += 15000; total += 15; runArc(); tickClock(); });
$$('.pillbtn', rest).forEach((b) => press(b, 0.95));

/* ---------- Record: the set floods the screen (Nike), the medal turns into the light (Any Distance), the number
   counts and locks in (Fitness Wrapped). One per lift, so it can be big. ---------- */
function recordMoment(c) {
  return new Promise((done) => {
    const rec = $('.record'), slab = $('.slab').getBoundingClientRect();
    const from = `inset(${slab.top}px ${innerWidth - slab.right}px ${innerHeight - slab.bottom}px ${slab.left}px round 34px)`;
    $('.mv').textContent = fmtKg(c.kg);
    $('.rs').innerHTML = `${ex().name} · <b class="num">${fmtKg(c.kg)} kg × ${c.r}</b><br>${fmtKg(c.kg - ex().best.kg) || 0} kg over your best from ${ex().best.date}`;
    rec.hidden = false; root.dataset.phase = 'record';
    const parts = [$('.cap', rec), $('.rh', rec), $('.rs', rec), $('.rgo', rec)];
    if (reduced()) { rec.style.clipPath = ''; } else {
      rec.animate([{ clipPath: from }, { clipPath: 'inset(0 0 0 0 round 0)' }], { duration: 560, easing: 'cubic-bezier(.65,0,.2,1)' });
      play($('.medal'), [{ transform: 'rotateY(84deg) scale(.9)', opacity: 0 }, { transform: 'rotateY(84deg) scale(.9)', opacity: 1, offset: 0.05 }, { transform: 'none', opacity: 1 }], { damping: 0.8, response: 0.9 }, { delay: 380, fill: 'backwards' });
      $('.sheen').animate([{ left: '-60%' }, { left: '130%' }], { duration: 1100, delay: 900, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'backwards' });
      parts.forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 700 + i * 90, fill: 'backwards', easing: 'cubic-bezier(.2,.8,.2,1)' }));
      // Count-up: the digits spin, then lock in, then the number lights up.
      const mv = $('.mv'), target = mv.textContent; let n = 0;
      const spin = setInterval(() => { mv.textContent = target.replace(/\d/g, () => Math.floor(Math.random() * 10)); if (++n > 9) { clearInterval(spin); mv.textContent = target; mv.animate([{ textShadow: '0 0 0 rgb(255 200 100 / 0)' }, { textShadow: '0 0 30px rgb(255 214 140 / .9)' }, { textShadow: '0 0 22px rgb(255 200 100 / .5)' }], { duration: 700 }); } }, 55);
    }
    navigator.vibrate?.([10, 60, 18]);
    $('.rgo').onclick = async () => {
      root.dataset.phase = 'rest';
      parts.concat($('.medal-stage')).forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' }));
      if (!reduced()) await rec.animate([{ clipPath: 'inset(0 0 0 0 round 0)' }, { clipPath: from }], { duration: 420, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }).finished;
      rec.getAnimations().forEach((a) => a.cancel()); [...parts, $('.medal-stage')].forEach((e) => e.getAnimations().forEach((a) => a.cancel()));
      rec.hidden = true; done();
    };
  });
}

/* ---------- Demo controls from the page around it ---------- */
function reset() {
  clearInterval(iv); arcAnim?.cancel(); rest.hidden = true; delete rest.dataset.closing; $('.record').hidden = true;
  if (open) { open = null; tray.hidden = scrim.hidden = true; }
  [pill, ring, $('.rest-frost'), ...$$('.rest *, .record *')].forEach((e) => e.getAnimations().forEach((a) => a.cancel()));
  root.dataset.phase = ''; busy = false; undoTo = null; pearlOut();
  const start = W.start; W = fresh(); W.start = start;
}
function jump(m) {
  reset();
  if (m === 'record') { W.ex[1].sets[2].done = true; W.s = 3; W.ex[1].sets[3].kg = 85; }
  if (m === 'next') { W.ex[1].sets.forEach((p) => { p.done = true; }); W.s = 3; }
  paint();
  if (m === 'rest' || m === 'record' || m === 'next') requestAnimationFrame(() => requestAnimationFrame(tick));
}
addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'moment') jump(d.m);
  if (d.type === 'theme') root.dataset.theme = d.t;
  if (d.type === 'active') root.toggleAttribute('data-idle', !d.on);
});
const q = new URLSearchParams(location.search);
if (q.get('t')) root.dataset.theme = q.get('t');
paint();
if (q.get('m')) jump(q.get('m'));
document.fonts.ready.then(() => paint());
