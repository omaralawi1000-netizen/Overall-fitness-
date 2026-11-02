import { play, SPRINGS, roll, fmtKg, mmss, $, ready, SESSION } from './common.js';

const ex = SESSION.exercises[1];
const sets = ex.sets.map((s, i) => ({ ...s, done: i < 2 }));
const last = [80, 82.5, 82.5, 82.5];
let cur = 2, m = 'set', left = 90, timer = null, field = 'kg', fresh = true, str = { kg: '82.5', reps: '6' };
const TOTAL = 90;
const hgt = (kg) => 28 + ((kg - 60) / 30) * 76;

function chart() {
  $('#cols').innerHTML = sets.map((s, i) => {
    const k = s.done ? '' : i === cur ? 'cur' : 'up';
    return `<div class="col ${k}"><i class="ghost" style="height:${hgt(last[i])}px"></i><div class="now" style="height:${hgt(s.kg)}px"><b>${fmtKg(s.kg)}</b></div></div>`;
  }).join('');
  $('#hs').textContent = `Push · set ${Math.min(cur + 1, 4)} of 4`;
  $('#ribbon').innerHTML = SESSION.exercises.map((e, i) => `<button class="${e.done ? 'done' : i === 1 ? 'now' : ''}" data-i="${i}">${e.name}</button>`).join('');
  $('#tg').innerHTML = SESSION.exercises.map((e, i) => {
    const n = e.sets.length, d = e.done ? n : i === 1 ? sets.filter((s) => s.done).length : 0;
    return `<div class="tile ${i === 1 ? 'now' : e.done ? '' : 'up'}"><span class="n">${e.done ? 'Done' : i === 1 ? 'Now' : 'Next'}</span><div><b>${e.name}</b><div class="d">${Array.from({ length: n }, (_, k) => `<i class="${k < d ? 'on' : ''}"></i>`).join('')}</div></div></div>`;
  }).join('');
}
function keys() {
  const ks = ['1', '2', '3', 'F', '4', '5', '6', 'P', '7', '8', '9', 'D', '.', '0', 'B', ''];
  $('#keys').innerHTML = ks.map((k) => {
    if (k === 'F') return `<button class="key fn" data-k="F" id="kF">kg ⇄ reps</button>`;
    if (k === 'P') return `<button class="key fn" data-k="P">+2.5</button>`;
    if (k === 'D') return `<button class="key done" data-k="D" aria-label="Set done"><svg viewBox="0 0 32 32"><path d="M8 16.5l5.2 5.2L24 10.5"/></svg></button>`;
    if (k === 'B') return `<button class="key" data-k="B" aria-label="Delete">⌫</button>`;
    return k ? `<button class="key" data-k="${k}">${k}</button>` : '';
  }).join('');
}
function showEntry(dir = 1) {
  roll($('#vKg'), str.kg || '0', dir); roll($('#vReps'), str.reps || '0', dir);
  $('#fKg').classList.toggle('on', field === 'kg'); $('#fReps').classList.toggle('on', field === 'reps');
  const s = sets[cur]; if (s) { s.kg = parseFloat(str.kg) || 0; s.r = parseInt(str.reps) || 0; const c = $('#cols').children[cur]; if (c) { c.querySelector('.now').style.height = hgt(s.kg) + 'px'; c.querySelector('b').textContent = fmtKg(s.kg); } }
}
function press(k) {
  navigator.vibrate?.(6);
  if (k === 'F') { field = field === 'kg' ? 'reps' : 'kg'; fresh = true; showEntry(); return; }
  if (k === 'P') { str.kg = fmtKg((parseFloat(str.kg) || 0) + 2.5); showEntry(1); return; }
  if (k === 'D') { done(); return; }
  if (k === 'B') { str[field] = str[field].slice(0, -1); showEntry(-1); return; }
  if (k === '.' && (field === 'reps' || (!fresh && str.kg.includes('.')))) return;
  if (fresh) { str[field] = k === '.' ? '0.' : k; fresh = false; } else if (str[field].length < 5) str[field] += k;
  showEntry(1);
}
$('#keys').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); });
$('#fKg').onclick = () => { field = 'kg'; fresh = true; showEntry(); }; $('#fReps').onclick = () => { field = 'reps'; fresh = true; showEntry(); };

function load() { str = { kg: fmtKg(sets[cur].kg), reps: String(sets[cur].r) }; field = 'kg'; fresh = true; chart(); showEntry(); }
function startRest(from = TOTAL) {
  clearInterval(timer); left = from; roll($('#clock'), mmss(left));
  $('#nx').textContent = `${fmtKg(sets[cur].kg)} kg × ${sets[cur].r}`; $('#skip').textContent = `Start set ${cur + 1}`;
  const w = $('#water'); w.getAnimations().forEach((a) => a.cancel());
  w.animate([{ transform: `scaleY(${.14 + .86 * left / TOTAL})` }, { transform: 'scaleY(.14)' }], { duration: left * 1000, easing: 'linear', fill: 'forwards' });
  timer = setInterval(() => { left -= 1; roll($('#clock'), mmss(left), -1); if (left <= 0) next(); }, 1000);
}
function next() { clearInterval(timer); go('set'); }
function done() {
  if (m !== 'set') return;
  sets[cur].done = true; const lastSet = cur === sets.length - 1; cur += 1; navigator.vibrate?.(14);
  if (lastSet) { chart(); go('record'); return; }
  load(); go('rest');
}
function go(k, instant) {
  const prev = m; m = k; document.body.dataset.m = k; clearInterval(timer);
  if (k === 'rest') startRest(instant === 47 ? 47 : TOTAL);
  if (k === 'record') countUp();
  if (!instant && prev !== k) {
    if (k === 'rest') play($('#restp'), [{ opacity: 0, transform: 'translateY(40px)' }, {}], SPRINGS.lift);
    if (k === 'set') { play($('.pad'), [{ opacity: 0, transform: 'translateY(30px)' }, {}], SPRINGS.lift); play($('.chart'), [{ opacity: 0 }, {}], SPRINGS.set); play($('.entry'), [{ opacity: 0 }, {}], SPRINGS.set); }
    if (k === 'where') play($('#tiles'), [{ opacity: 0, transform: 'translateY(20px)' }, {}], SPRINGS.lift);
  }
}
function countUp() {
  const el = $('#gv'); el.textContent = ''; roll(el, '00');
  let v = 0; const tgt = 85, t0 = performance.now(), dur = 1100;
  const id = setInterval(() => { const p = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - p, 3); const n = Math.round(tgt * e); if (n !== v) { v = n; roll(el, String(v).padStart(2, '0')); } if (p >= 1) clearInterval(id); }, 40);
}
$('#skip').onclick = next; $('#p15').onclick = () => { left += 15; roll($('#clock'), mmss(left), 1); }; $('#m15').onclick = () => { left = Math.max(5, left - 15); roll($('#clock'), mmss(left), -1); };
$('#keep').onclick = () => go('set'); $('#ribbon').onclick = () => go(m === 'where' ? 'set' : 'where');
chart(); keys(); showEntry();
ready({
  go(k, instant) {
    if (k === 'rest') { sets.forEach((s, i) => (s.done = i < 3)); cur = 3; load(); go('rest', instant ? 47 : 47); }
    else if (k === 'record') { sets.forEach((s) => (s.done = true)); cur = 4; chart(); go('record', instant); }
    else if (k === 'where') { sets.forEach((s, i) => (s.done = i < 2)); cur = 2; load(); go('where', instant); }
    else { sets.forEach((s, i) => (s.done = i < 2)); sets[2].kg = 82.5; sets[2].r = 6; cur = 2; load(); go('set', instant); }
  },
});
