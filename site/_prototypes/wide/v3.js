import { play, SPRINGS, roll, fmtKg, mmss, $, $$, ready, SESSION } from './common.js';

const ex = SESSION.exercises[1];
const sets = ex.sets.map((s, i) => ({ ...s, done: i < 2 }));
let cur = 2, m = 'set', left = 90, timer = null, recIdx = -1;
const TOTAL = 90;

function render() {
  const mk = (e, i) => {
    if (i === 1) {
      const rows = sets.map((s, k) => {
        const cls = s.done ? 'done' : k === cur ? 'now' : 'up';
        const rec = k === recIdx ? ' rec' : '';
        const val = (k === cur) ? `<div class="st"><button data-a="kg-" aria-label="Less weight">−</button><button data-a="kg+" aria-label="More weight">+</button></div>` : '<span></span>';
        const pr = k === recIdx ? '<span class="pr">PR</span>' : '';
        return `<li class="set ${cls}${rec}" data-k="${k}"><span class="n">${k + 1}</span><span class="v">${fmtKg(s.kg)}<small>×</small>${s.r}${pr}</span>${val}<button class="t" data-t="${k}" aria-label="${s.done ? 'Done' : 'Set done'}"></button></li><li class="slot" id="slot${k}"><div></div></li>`;
      }).join('');
      return `<li class="ex now" data-i="1"><div class="dot"><i></i></div><div class="card"><h3>${e.name}<span>kg · last ${e.last}</span></h3><div class="fold main"><div><p class="last">Best 82.5 × 6 · aim for 85 × 6</p><ol class="sets">${rows}</ol></div></div></div></li>`;
    }
    const st = e.done ? 'done' : 'up';
    return `<li class="ex ${st}"><div class="dot"><i></i></div><div class="line">${e.name}<span>${e.done ? 'done · ' : ''}${e.short}</span></div></li>`;
  };
  $('#path').innerHTML = SESSION.exercises.map(mk).join('');
  const done = sets.filter((s) => s.done).length + 3;
  $('#sSets').innerHTML = `${done}<small>/19</small>`;
  $('#seg').innerHTML = Array.from({ length: 19 }, (_, i) => `<i class="${i < done ? 'd' : ''}"></i>`).join('');
  const next = sets[Math.min(cur, 3)];
  const n = Math.min(cur + 1, 4);
  $('#goLab').textContent = m === 'rest' ? `Start set ${n}` : m === 'record' ? 'Keep going' : `Set ${n} done`;
  $('#goVal').textContent = `${fmtKg(next.kg)} × ${next.r}`;
}
function openTray(kIdx, html) {
  const slot = $('#slot' + kIdx); if (!slot) return;
  slot.firstElementChild.innerHTML = html;
  requestAnimationFrame(() => requestAnimationFrame(() => slot.classList.add('open')));
}
function restHtml() {
  const n = sets[cur];
  return `<div class="resttray"><small>Rest</small><span class="nx">Next<br><b>${fmtKg(n.kg)} × ${n.r}</b></span><span class="c num roll" id="rc"></span><div class="bar"><i id="rb"></i></div><div class="btns"><button id="r15">+15 s</button><button id="rskip">Skip</button></div></div>`;
}
function startRest(from = TOTAL) {
  clearInterval(timer); left = from;
  openTray(cur - 1, restHtml());
  roll($('#rc'), mmss(left));
  $('#rb').animate([{ transform: `scaleX(${left / TOTAL})` }, { transform: 'scaleX(0)' }], { duration: left * 1000, easing: 'linear', fill: 'forwards' });
  $('#r15').onclick = () => { left += 15; roll($('#rc'), mmss(left), 1); };
  $('#rskip').onclick = nextSet;
  timer = setInterval(() => { left -= 1; roll($('#rc'), mmss(left), -1); if (left <= 0) nextSet(); }, 1000);
}
function nextSet() { clearInterval(timer); m = 'set'; document.body.dataset.m = m; recIdx = -1; render(); }
function tick() {
  if (m === 'rest') { nextSet(); return; }
  if (m === 'record') { m = 'set'; document.body.dataset.m = 'set'; recIdx = -1; render(); return; }
  const k = cur; sets[k].done = true; cur += 1; navigator.vibrate?.(12);
  if (k === sets.length - 1) { recIdx = k; m = 'record'; document.body.dataset.m = m; render();
    openTray(k, `<div class="rectray"><div class="coin"><b>85</b></div><div><h4>New best</h4><p>Heaviest six you've done. Up from 82.5 × 6 on 26 Oct · est. 1RM 102 kg</p></div></div>`); return; }
  m = 'rest'; document.body.dataset.m = m; render(); startRest();
  play($$('.set')[k].querySelector('.t'), [{ transform: 'scale(.7)' }, {}], SPRINGS.press);
}
function setOverview(o) { document.body.classList.toggle('overview', o); }
$('#path').addEventListener('click', (e) => {
  const t = e.target.closest('[data-t]'); if (t && +t.dataset.t === (m === 'set' ? cur : -1)) { tick(); return; }
  const b = e.target.closest('[data-a]'); if (b) { const s = sets[cur], a = b.dataset.a; s.kg = Math.max(2.5, s.kg + (a === 'kg+' ? 2.5 : -2.5)); render(); }
  if (e.target.closest('.card h3')) setOverview(!document.body.classList.contains('overview'));
});
$('#sum').onclick = () => setOverview(!document.body.classList.contains('overview'));
$('#go').onclick = tick;
render();
ready({
  go(k, instant) {
    clearInterval(timer); recIdx = -1; setOverview(false); $('#scroll').scrollTop = 0;
    if (k === 'where') { sets.forEach((s, i) => (s.done = i < 2)); cur = 2; m = 'set'; document.body.dataset.m = m; render(); setOverview(true); return; }
    if (k === 'rest') { sets.forEach((s, i) => (s.done = i < 3)); cur = 3; m = 'rest'; document.body.dataset.m = m; render(); startRest(47); }
    else if (k === 'record') { sets.forEach((s) => (s.done = true)); cur = 4; recIdx = 3; m = 'record'; document.body.dataset.m = m; render(); openTray(3, `<div class="rectray"><div class="coin"><b>85</b></div><div><h4>New best</h4><p>Heaviest six you've done. Up from 82.5 × 6 on 26 Oct · est. 1RM 102 kg</p></div></div>`); }
    else { sets.forEach((s, i) => (s.done = i < 2)); sets[2].kg = 82.5; cur = 2; m = 'set'; document.body.dataset.m = m; render(); }
  },
});
