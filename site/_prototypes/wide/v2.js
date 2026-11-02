import { play, SPRINGS, roll, fmtKg, mmss, $, ready, SESSION } from './common.js';

const ex = SESSION.exercises[1];
const sets = ex.sets.map((s, i) => ({ ...s, done: i < 2 }));
let cur = 2, m = 'set', left = 90, timer = null, beamAnim = null;
const TOTAL = 90, BAR = 20;
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const COL = { 25: '#ff6c5b', 20: '#5d8bff', 15: '#ffd761', 10: '#5fd69a', 5: '#f4f6fa', 2.5: '#8993a6', 1.25: '#d5dbe6' };
const cls = (p) => 'p' + String(p).replace('.', '_');
const sideOf = (kg) => { let r = (kg - BAR) / 2, out = []; for (const p of PLATES) while (r + 1e-9 >= p) { out.push(p); r -= p; } return out; };
let side = sideOf(sets[cur].kg), ghost = [];

function renderBar(animIdx = -1) {
  const html = (arr, g) => arr.map((p, i) => `<i class="pl ${cls(p)}${g ? ' ghost' : ''}"></i>`).join('');
  const all = side.map((p) => ({ p })).concat(ghost.map((p) => ({ p, g: 1 })));
  const h = all.map((o) => `<i class="pl ${cls(o.p)}${o.g ? ' ghost' : ''}"></i>`).join('');
  $('#pr').innerHTML = h; $('#pl').innerHTML = h;
  if (animIdx >= 0) for (const el of [$('#pr').children[animIdx], $('#pl').children[animIdx]]) play(el, [{ transform: 'translateY(-46px)', opacity: 0 }, {}], SPRINGS.lift);
  const kg = BAR + 2 * side.reduce((a, b) => a + b, 0);
  sets[cur] && (sets[cur].kg = kg);
  roll($('#total'), fmtKg(kg), kg >= (roll.prev || 0) ? 1 : -1); roll.prev = kg;
}
function renderTray() {
  $('#tray').innerHTML = PLATES.map((p) => `<button data-p="${p}" style="background:radial-gradient(circle at 35% 28%, #fff9, ${COL[p]} 45%, color-mix(in srgb, ${COL[p]} 55%, #000))">${p}</button>`).join('');
  $('#tray').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; const p = +b.dataset.p;
    if (m === 'rest') { ghost = []; side.push(p); side.sort((a, b2) => b2 - a); } else { side.push(p); side.sort((a, b2) => b2 - a); }
    navigator.vibrate?.(8); renderBar(side.indexOf(p)); };
}
$('#undo').onclick = () => { if (side.length) { side.pop(); renderBar(); } };
$('#rm').onclick = () => { sets[cur].r = Math.max(1, sets[cur].r - 1); roll($('#rn'), String(sets[cur].r), -1); };
$('#rp').onclick = () => { sets[cur].r += 1; roll($('#rn'), String(sets[cur].r), 1); };

function chrome() {
  $('#segs').innerHTML = SESSION.exercises.map((e, i) => `<i class="${e.done ? 'done' : i === 1 ? 'now' : ''}"></i>`).join('');
  $('#ds').innerHTML = sets.map((s, i) => `<i class="${s.done ? 'done' : i === cur ? 'now' : ''}"></i>`).join('');
  $('#lbl').textContent = `Set ${Math.min(cur + 1, 4)} of 4 · last time ${ex.last}`;
  $('#wlist').innerHTML = SESSION.exercises.map((e, i) => `<li class="${e.done ? 'done' : i === 1 ? 'now' : ''}"><i></i><b>${e.name}</b><span>${e.done ? e.short : i === 1 ? `set ${Math.min(cur + 1, 4)} of 4` : e.short}</span></li>`).join('');
}
function setMoment(next, instant) {
  const prev = m; m = next; document.body.dataset.m = next;
  if (instant || prev === next) return;
  if (next === 'rest') { play($('#rest'), [{ opacity: 0, transform: 'translateY(16px)' }, {}], SPRINGS.set); play($('#barwrap'), [{ transform: 'none' }, {}], SPRINGS.set); }
  if (next === 'set') { play($('#read'), [{ opacity: 0 }, {}], SPRINGS.set); play($('#reps'), [{ opacity: 0 }, {}], SPRINGS.set); }
  if (next === 'record') { play($('.coin'), [{ opacity: 0, transform: 'scale(.6)' }, {}], SPRINGS.press); play($('#rec h2'), [{ opacity: 0, transform: 'translateY(12px)' }, {}], SPRINGS.set, { delay: 160 }); }
}
function startRest(from = TOTAL) {
  clearInterval(timer); left = from; roll($('#clock'), mmss(left));
  const nx = sets[cur]; $('#nxt').textContent = `${fmtKg(nx.kg)} kg × ${nx.r}`;
  ghost = sideOf(nx.kg).filter((p, i, a) => { const cnt = (x) => (arr) => arr.filter((q) => q === x).length; return false; });
  const want = sideOf(nx.kg), have = [...side]; ghost = []; for (const p of want) { const i = have.indexOf(p); if (i >= 0) have.splice(i, 1); else ghost.push(p); }
  $('#gnote').textContent = ghost.length ? `+${ghost.join(' + ')} each side` : 'same plates';
  renderBar();
  beamAnim?.cancel();
  beamAnim = $('#beam').animate([{ transform: `scaleX(${left / TOTAL})` }, { transform: 'scaleX(0)' }], { duration: left * 1000, easing: 'linear', fill: 'forwards' });
  timer = setInterval(() => { left -= 1; roll($('#clock'), mmss(left), -1); if (left <= 0) next(); }, 1000);
}
function next() {
  clearInterval(timer); beamAnim?.cancel();
  side = sideOf(sets[cur].kg); ghost = []; renderBar(); setMoment('set'); chrome(); $('#rn').textContent = ''; roll($('#rn'), String(sets[cur].r));
}
function tick() {
  if (m === 'rest') { next(); return; }
  if (m === 'record') { setMoment('set'); chrome(); return; }
  sets[cur].done = true; const last = cur === sets.length - 1; cur += 1; chrome(); navigator.vibrate?.(12);
  play($('.tick'), [{ transform: 'scale(.88)' }, {}], SPRINGS.press);
  if (last) { setMoment('record'); return; }
  setMoment('rest'); startRest();
}
$('#go').onclick = tick;
const openW = (o) => { document.body.classList.toggle('open', o); play($('#sheet'), [{ transform: o ? 'translateY(110%)' : 'none' }, {}], SPRINGS.lift); };
$('#segs').onclick = () => openW(true); $('#open').onclick = () => openW(true); $('#scrim').onclick = () => openW(false);
renderTray();
ready({
  go(k, instant) {
    clearInterval(timer); beamAnim?.cancel(); document.body.classList.remove('open');
    if (k === 'where') { chrome(); setMoment('set', true); openW(true); return; }
    if (k === 'rest') { sets[2].done = true; cur = 3; side = sideOf(82.5); chrome(); setMoment('rest', instant); startRest(47); }
    else if (k === 'record') { sets.forEach((s) => (s.done = true)); cur = 4; chrome(); setMoment('record', instant); }
    else { sets.forEach((s, i) => (s.done = i < 2)); cur = 2; sets[2].kg = 82.5; sets[2].r = 6; side = sideOf(82.5); ghost = []; renderBar(); chrome(); setMoment('set', instant); roll($('#rn'), '6'); }
  },
});
chrome(); renderBar(); roll($('#rn'), '6');
