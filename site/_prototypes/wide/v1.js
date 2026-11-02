import { play, SPRINGS, roll, fmtKg, mmss, $, ready, SESSION } from './common.js';

const ex = SESSION.exercises[1];
const sets = ex.sets.map((s, i) => ({ ...s, done: i < 2 }));
let cur = 2, m = 'set', left = 90, timer = null, arcAnim = null;
const TOTAL = 90, ITEM = 84;
const KG = Array.from({ length: 41 }, (_, i) => 40 + i * 2.5), REPS = Array.from({ length: 20 }, (_, i) => i + 1);

function drum(el, vals, fmt, start, onChange) {
  el.innerHTML = '<div class="pad"></div>' + vals.map((v) => `<div class="it"><span>${fmt(v)}</span></div>`).join('') + '<div class="pad"></div>';
  const items = [...el.querySelectorAll('.it span')];
  let idx = -1;
  const paint = () => {
    const f = el.scrollTop / ITEM, k = Math.round(f);
    items.forEach((s, i) => { const d = Math.abs(i - f); s.style.opacity = Math.max(.18, 1 - d * .34); s.style.transform = `scale(${Math.max(.7, 1 - d * .1)})`; s.style.color = d < .5 ? 'var(--tx)' : 'var(--dim)'; });
    if (k !== idx && k >= 0 && k < vals.length) { if (idx >= 0) navigator.vibrate?.(5); idx = k; onChange(vals[k]); }
  };
  el.addEventListener('scroll', () => requestAnimationFrame(paint), { passive: true });
  const api = { set(v, smooth) { el.scrollTo({ top: vals.indexOf(v) * ITEM, behavior: smooth ? 'smooth' : 'auto' }); requestAnimationFrame(paint); }, get: () => vals[idx] };
  api.set(start); paint();
  return api;
}
const dKg = drum($('#dKg'), KG, fmtKg, sets[cur].kg, (v) => { sets[cur].kg = v; });
const dReps = drum($('#dReps'), REPS, String, sets[cur].r, (v) => { sets[cur].r = v; });

function pearls() {
  $('#pearls').innerHTML = sets.map((s, i) => `<i class="${s.done ? 'done' : i === cur ? 'now' : ''}"></i>`).join('');
}
function list() {
  $('#wlist').innerHTML = SESSION.exercises.map((e, i) => {
    const st = e.done ? 'done' : i === 1 ? 'now' : '';
    const sub = e.done ? e.short : i === 1 ? `set ${Math.min(cur + 1, 4)} of 4` : e.short;
    return `<li class="${st}"><i></i><b>${e.name}</b><span>${sub}</span></li>`;
  }).join('');
}
function label(t) { roll($('#lab'), t); }

function setMoment(next, instant) {
  const prev = m; m = next; document.body.dataset.m = next;
  if (instant || prev === next) return;
  const app = $('#app');
  if (next === 'rest') {
    play($('#rest'), [{ opacity: 0, transform: 'scale(.78)' }, {}], SPRINGS.lift);
    play($('#drums'), [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.9)' }], SPRINGS.set);
  } else if (next === 'set') {
    play($('#drums'), [{ opacity: 0, transform: 'scale(.9)' }, {}], SPRINGS.lift);
    play($('.last'), [{ opacity: 0 }, {}], SPRINGS.set);
  } else if (next === 'record') {
    play($('#rec .medal'), [{ opacity: 0, transform: 'rotateY(-540deg) scale(.4)' }, {}], SPRINGS.press);
    play($('#rec h2'), [{ opacity: 0, transform: 'translateY(14px)' }, {}], SPRINGS.set, { delay: 180 });
  }
}

function startRest(from = TOTAL) {
  clearInterval(timer); left = from;
  roll($('#clock'), mmss(left));
  const C = 2 * Math.PI * 124, arc = $('#arc');
  arc.style.strokeDasharray = C;
  arcAnim?.cancel();
  arc.style.strokeDashoffset = C;
  arcAnim = arc.animate([{ strokeDashoffset: C * (1 - left / TOTAL) }, { strokeDashoffset: C }], { duration: left * 1000, easing: 'linear', fill: 'forwards' });
  arcAnim.pause(); arcAnim.currentTime = 0; arcAnim.play();
  timer = setInterval(() => { left -= 1; roll($('#clock'), mmss(left), -1); if (left <= 0) nextSet(); }, 1000);
}
function bumpRest(d) {
  left = Math.max(5, Math.min(300, left + d)); roll($('#clock'), mmss(left), d > 0 ? 1 : -1);
  clearInterval(timer); startRestKeep();
}
function startRestKeep() {
  const C = 2 * Math.PI * 124; arcAnim?.cancel();
  arcAnim = $('#arc').animate([{ strokeDashoffset: C * (1 - Math.min(1, left / TOTAL)) }, { strokeDashoffset: C }], { duration: left * 1000, easing: 'linear', fill: 'forwards' });
  timer = setInterval(() => { left -= 1; roll($('#clock'), mmss(left), -1); if (left <= 0) nextSet(); }, 1000);
}

function nextSet() {
  clearInterval(timer); arcAnim?.cancel();
  if (cur >= sets.length) { setMoment('set'); return; }
  setMoment('set'); label('Set done');
  dKg.set(sets[cur].kg, false); dReps.set(sets[cur].r, false);
  pearls(); list();
}
function tick() {
  if (m === 'rest') { nextSet(); return; }
  if (m === 'record') { setMoment('set'); label('Set done'); return; }
  sets[cur].done = true;
  const lastSet = cur === sets.length - 1;
  $('#doneLine').textContent = `Set ${cur + 1} · ${fmtKg(sets[cur].kg)} × ${sets[cur].r}`;
  cur += 1; pearls(); list();
  const p = $('#pearls').children[cur - 1];
  play(p, [{ transform: 'scale(2.4)', opacity: .3 }, {}], SPRINGS.press);
  navigator.vibrate?.(12);
  if (lastSet) { setMoment('record'); label('Keep going'); return; }
  $('#next').innerHTML = `Next · <b>${fmtKg(sets[cur].kg)} kg × ${sets[cur].r}</b>`;
  setMoment('rest'); label(`Start set ${cur + 1}`); startRest();
}

$('#go').onclick = tick;
$('#plus').onclick = () => bumpRest(15); $('#minus').onclick = () => bumpRest(-15);
const openW = (o) => {
  const w = $('#where'), a = $('#app');
  document.body.classList.toggle('open', o);
  play(w, o ? [{ transform: 'translateY(-115%)' }, {}] : [{ transform: 'none' }, {}], SPRINGS.lift);
  play(a, [{ transform: o ? 'none' : 'scale(.965)' }, {}], SPRINGS.lift);
  a.style.transform = o ? 'scale(.965)' : 'none';
};
$('#open').onclick = () => openW(true); $('#close').onclick = () => openW(false); $('#scrim').onclick = () => openW(false);

pearls(); list(); label('Set done');
ready({
  go(k, instant) {
    clearInterval(timer);
    if (k === 'where') { setMoment('set', true); openW(true); return; }
    document.body.classList.remove('open'); $('#app').style.transform = 'none';
    if (k === 'rest') { sets[2].done = true; cur = 3; pearls(); list(); $('#next').innerHTML = `Next · <b>85 kg × 6</b>`; setMoment('rest', instant); label('Start set 4'); startRest(47); }
    else if (k === 'record') { sets.forEach((s) => (s.done = true)); cur = 4; pearls(); list(); setMoment('record', instant); label('Keep going'); }
    else { sets.forEach((s, i) => (s.done = i < 2)); cur = 2; dKg.set(82.5); dReps.set(6); pearls(); list(); setMoment('set', instant); label('Set done'); }
  },
});
