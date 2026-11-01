/* Ink (and Ink rich): Aven as a live document.
   The Coach's words lean (italic), your numbers stand (upright, condensed, heavy). Blue is the Coach's pencil: a
   proposal stays blue until you tap Apply, then the ink dries. Rich = the same grammar on a living field of our own
   colours, with frosted panes and depth. */
import { SPRINGS, EXIT, OUT, Channel, play, fade, flip, fold, ghost, fadeGhost, swap, travel, roll, pressable, timers, reduced } from './motion.js';
import { paintField, fieldLayer, drift } from './bg.js';
import * as S from './state.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fig = (t, cls = '') => `<span class="fig ${cls}">${esc(t)}</span>`;

function richBackground(root, dark) {
  const bg = document.createElement('div');
  bg.className = 'bg';
  // Our own colours only: ink, chalk, a slate made from the Coach's blue, and (by day) a little of the record's marker
  // yellow. The field is kept well below the pencil's saturation, so the pencil stays the bluest thing on screen and
  // "blue = the Coach's proposal" still reads. At night yellow is left out: dimmed yellow turns olive.
  const blue = dark ? [36, 42, 62] : [110, 140, 196], deep = dark ? [12, 13, 19] : [74, 98, 150];
  const wash = dark ? [62, 68, 86] : [150, 178, 222], warm = [255, 222, 70];
  const a = dark
    ? paintField([
      { x: 0.1, y: 0.3, sx: 0.55, sy: 0.42, c: blue, a: 0.95 },
      { x: 0.96, y: 0.76, sx: 0.5, sy: 0.42, c: deep, a: 0.95 },
    ], [9, 10, 13], { seed: 3 })
    : paintField([
      { x: 0.06, y: 0.3, sx: 0.5, sy: 0.38, c: blue, a: 0.6 },
      { x: 0.98, y: 0.78, sx: 0.5, sy: 0.4, c: deep, a: 0.45 },
      { x: 0.9, y: 0.05, sx: 0.42, sy: 0.26, c: warm, a: 0.85 },
    ], [242, 244, 243], { seed: 3 });
  const b = dark
    ? paintField([
      { x: 0.62, y: 0.48, sx: 0.36, sy: 0.26, c: wash, a: 0.42 },
      { x: 0.1, y: 0.96, sx: 0.36, sy: 0.2, c: blue, a: 0.6 },
    ], null, { seed: 5 })
    : paintField([
      { x: 0.6, y: 0.46, sx: 0.42, sy: 0.3, c: wash, a: 0.5 },
      { x: 0.04, y: 0.98, sx: 0.4, sy: 0.22, c: warm, a: 0.6 },
    ], null, { seed: 5 });
  const la = fieldLayer(a), lb = fieldLayer(b, 'field-b');
  bg.append(la, lb);
  root.prepend(bg);
  const W = innerWidth, H = innerHeight;
  const d1 = drift(la, [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${-0.06 * W}px, ${0.04 * H}px) scale(1.08)` }], 26000);
  const d2 = drift(lb, [{ transform: 'translate(0,0) scale(1.04)' }, { transform: `translate(${0.05 * W}px, ${-0.05 * H}px) scale(1)` }], 34000);
  return () => { d1.stop(); d2.stop(); };
}

export function ink(stage, { rich = false } = {}) {
  const s = S.createSession();
  const T = timers();
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const root = document.createElement('div');
  root.className = `variant ink${rich ? ' rich' : ''}`;
  root.innerHTML = `
  <section class="screen today" aria-label="Today">
    <div class="scroll">
      <header class="t-head"><span class="t-date">Sunday 1 November</span>${fig('16:24', 't-clock')}</header>
      <div class="pane coach-pane">
        <p class="coach t-coach">Leave by ${fig('16:50')} for wrestling. Trim the rest to fit?</p>
        <div class="acts trim-acts">
          <button type="button" class="btn-apply" data-act="trim-apply">Apply · ${fig(S.minutesLeft(s, { preview: true }))} min</button>
          <button type="button" class="btn-keep" data-act="trim-keep">Keep full plan</button>
        </div>
        <div class="undo-line trim-undo" hidden><span class="u-text"></span><button type="button" class="undo" data-act="trim-undo">Undo</button></div>
      </div>
      <div class="pane plan-pane">
        <div class="label">Push · in progress</div>
        <div class="plan-sum"><s class="was was-min prop-x">${fig(S.minutesLeft(s))}</s>${fig('', 'mins prop')} min left · done by <s class="was was-by prop-x">${fig(S.doneBy(s))}</s>${fig('', 'doneby prop')}</div>
        <ol class="plan"></ol>
      </div>
      <div class="pane day-pane">
        <div class="row">${fig('96 g', 'col')}<span class="w">protein of 180</span><i class="meter" style="--p:.53"><b></b></i></div>
        <div class="row">${fig('6 h 05', 'col')}<span class="w">sleep last night</span></div>
        <div class="row">${fig('3', 'col')}<span class="w">sessions this week</span></div>
      </div>
    </div>
  </section>
  <section class="screen workout" aria-label="Workout" aria-hidden="true">
    <div class="scroll">
      <header class="w-head"><button type="button" class="back" data-act="close" aria-label="Back to Today">‹ Today</button><span class="w-title">Push · ${fig(S.minutesIn(s), 'w-clock')} min in</span><span class="w-count"></span></header>
      <div class="pane ex-pane">
        <div class="ex-block">
          <h2 class="ex-name"></h2>
          <div class="ex-last"></div>
          <ol class="done-rows"></ol>
        </div>
        <div class="now-rule"><i class="drain"></i></div>
        <div class="now">
          <div class="now-label"></div>
          <div class="figure">
            <button type="button" class="fv fw" data-act="edit" aria-label="Change weight"><s class="was"></s><span class="v"></span><i class="bar"></i></button>
            <span class="unit">kg</span><span class="x">×</span>
            <button type="button" class="fv fr" data-act="edit" aria-label="Change reps"><span class="v"></span><i class="bar"></i></button>
          </div>
          <p class="coach w-coach"></p>
          <div class="acts bump-acts" hidden>
            <button type="button" class="btn-apply" data-act="bump-apply">Apply ${fig('82.5')} kg</button>
            <button type="button" class="btn-keep" data-act="bump-keep">Keep ${fig('80')}</button>
          </div>
          <div class="undo-line bump-undo" hidden><span class="u-text"></span><button type="button" class="undo" data-act="bump-undo">Undo</button></div>
          <div class="undo-line set-undo" hidden><span class="u-text"></span><button type="button" class="undo" data-act="untick">Undo</button></div>
        </div>
        <div class="next-pane"><ol class="up-rows"></ol><div class="next-ex"></div></div>
      </div>
    </div>
  </section>
  <div class="dock"><button type="button" class="slab" data-act="slab"><span class="slab-lt"><span class="slab-l"></span> <span class="fig slab-t"></span></span><span class="slab-rg"><span class="slab-r"></span> <span class="fig slab-rt"></span></span></button></div>
  <div class="scrim" hidden></div>
  <div class="tray" role="dialog" aria-label="Change this set" hidden>
    <div class="grip" aria-hidden="true"></div>
    <div class="tray-row"><span class="lbl">Weight</span><button type="button" class="step" data-d="w-" aria-label="Less weight">−</button><b class="fig tw"></b><span class="tu">kg</span><button type="button" class="step" data-d="w+" aria-label="More weight">+</button></div>
    <div class="tray-row"><span class="lbl">Reps</span><button type="button" class="step" data-d="r-" aria-label="Fewer reps">−</button><b class="fig tr"></b><span class="tu"></span><button type="button" class="step" data-d="r+" aria-label="More reps">+</button></div>
    <button type="button" class="tray-done" data-act="tray-done">Done</button>
  </div>`;
  stage.append(root);
  const $ = (q) => root.querySelector(q);
  const stopBg = rich ? richBackground(root, dark) : () => {};
  const boxes = (...q) => (rich ? q.map((x) => $(x)) : []);

  /* ---------- Today ---------- */
  const plan = $('.plan');
  function renderPlan() {
    plan.innerHTML = s.exercises.map((ex) => {
      const full = ex.planned, prev = S.plannedSets(s, ex, { preview: true });
      const changed = prev !== full && prev > 0;
      const cut = prev === 0;
      const next = ex === S.current(s) ? 'set ' + (ex.done.length + 1) + ' next' : ex.done.length >= full ? 'done' : `${S.fmtKg(ex.w)} × ${ex.r}`;
      return `<li data-ex="${ex.id}" class="${cut ? 'cut' : ''}${ex.done.length >= S.plannedSets(s, ex) ? ' complete' : ''}"${cut && s.trim.state === 'applied' ? ' hidden' : ''}>
        <span class="fig col">${ex.done.length}/${changed ? (s.trim.state === 'applied' ? `<span class="prop">${prev}</span>` : `<s class="was prop-x">${full}</s><span class="prop">${prev}</span>`) : full}</span>
        <span class="nm">${esc(ex.name)}<i class="strike"></i></span><span class="aside">${esc(next)}</span></li>`;
    }).join('');
  }
  renderPlan();
  const trimUI = () => {
    const st = s.trim.state;
    root.dataset.trim = st;
    $('.mins').textContent = S.minutesLeft(s, { preview: true });
    $('.doneby').textContent = S.doneBy(s, { preview: true });
    $('.trim-acts .btn-apply .fig').textContent = S.minutesLeft(s, { preview: true });
  };
  trimUI();
  // The Coach's proposal arrives drawn in blue: strikes draw across the cut rows, 40 ms apart (Type spring).
  function drawStrikes(dir = 1) {
    [...plan.querySelectorAll('li.cut .strike')].forEach((el, i) => {
      play(el, [{ scale: dir > 0 ? '0 1' : '1 1' }, { scale: dir > 0 ? '1 1' : '0 1' }], SPRINGS.type, { delay: i * 40, fill: dir > 0 ? 'backwards' : 'forwards' });
    });
  }
  T.after(420, () => drawStrikes(1));

  function undoAfter(line, text) {
    line.querySelector('.u-text').textContent = text;
    const btn = line.querySelector('.undo');
    btn.disabled = true; // not tappable at once: a double tap on Apply must not undo it (LESSONS 38)
    T.after(400, () => { btn.disabled = false; });
  }

  function trimApply() {
    if (s.trim.state !== 'open') return;
    s.trim.state = 'applied';
    root.dataset.trim = 'applied'; // blue dries to ink (CSS, 320 ms)
    const acts = $('.trim-acts'), line = $('.trim-undo');
    const cutRows = [...plan.querySelectorAll('li.cut')];
    // The ink dries first (blue to ink), then the cut rows fold away and everything below closes up.
    T.after(200, () => {
      const after = [...plan.querySelectorAll('li:not(.cut)'), $('.day-pane')];
      const olds = [$('.plan-sum'), ...[...plan.querySelectorAll('s.was')].map((x) => x.parentElement)].map((x) => ghost(x));
      fold(cutRows.filter((r) => r.isConnected), after, true, SPRINGS.set, boxes('.plan-pane'));
      $('.was-min').hidden = true; $('.was-by').hidden = true;
      plan.querySelectorAll('s.was').forEach((x) => { x.hidden = true; });
      for (const o of olds) { o.host.append(o.g); fadeGhost(o.g, [{ opacity: 1 }, { opacity: 0 }]); play(o.el, [{ opacity: 0 }, { opacity: 1 }], SPRINGS.set, { delay: reduced() ? 0 : 110 }); } // old line gone before the new one shows: never two readable at once
    });
    undoAfter(line, `Trimmed to ${S.minutesLeft(s)} min.`);
    swap(acts, line); // same slot, same height: nothing below moves
    $('.t-coach').innerHTML = `Done by ${fig(S.doneBy(s))}, in time to leave at ${fig('16:50')}.`;
    syncWorkout();
  }
  function trimUndo() {
    if (s.trim.state === 'applied') {
      s.trim.state = 'open';
      root.dataset.trim = 'open';
      renderPlan();
      const cutRows = [...plan.querySelectorAll('li.cut')];
      cutRows.forEach((r) => { r.hidden = true; });
      const after = [...plan.querySelectorAll('li:not(.cut)'), $('.day-pane')];
      fold(cutRows, after, false, SPRINGS.set, boxes('.plan-pane'));
      drawStrikes(1);
      $('.was-min').hidden = false; $('.was-by').hidden = false;
      $('.t-coach').innerHTML = `Leave by ${fig('16:50')} for wrestling. Trim the rest to fit?`;
    } else if (s.trim.state === 'kept') {
      s.trim.state = 'open';
      root.dataset.trim = 'open';
      $('.t-coach').innerHTML = `Leave by ${fig('16:50')} for wrestling. Trim the rest to fit?`;
      renderPlan();
      drawStrikes(1);
    }
    trimUI();
    swap($('.trim-undo'), $('.trim-acts'));
    syncWorkout();
  }
  function trimKeep() {
    if (s.trim.state !== 'open') return;
    drawStrikes(-1);
    s.trim.state = 'kept';
    root.dataset.trim = 'kept';
    const line = $('.trim-undo');
    undoAfter(line, 'Kept the full plan.');
    swap($('.trim-acts'), line); // first, so the fading copy still reads what you tapped
    trimUI();
    const coach = $('.t-coach');
    const late = S.lateBy(s);
    coach.innerHTML = late > 0 ? `Full plan it is. Done by ${fig(S.doneBy(s))}, ${fig(late)} min after you need to leave.` : `Full plan it is. Done by ${fig(S.doneBy(s))}, in time to leave.`;
    play(coach, [{ opacity: 0 }, { opacity: 1 }], SPRINGS.set);
    T.after(260, renderPlan);
  }

  /* ---------- Workout ---------- */
  const doneRows = $('.done-rows'), upRows = $('.up-rows');
  const fw = $('.fw .v'), fr = $('.fr .v'), was = $('.fw .was');
  const after = (v) => (v === fw ? [$('.unit'), $('.x'), $('.fr')] : []); // what sits after a number on its line
  const slabL = $('.slab-l'), slabR = $('.slab-r'), slabT = $('.slab-t'), slabRT = $('.slab-rt');
  let restInfo = null, lastTick = null, tickLock = 0, selfBack = 0;

  const row = (set, i, cls = '') => `<li class="${cls}"><span class="fig col"><span class="cw">${S.fmtKg(set.w)}</span><span class="cx"> × </span><span class="cr">${set.r}</span></span><span class="w">Set ${i + 1}</span>${set.at ? fig(set.at, 'at') : ''}${set.record ? '<i class="marker" aria-hidden="true"></i>' : ''}</li>`;

  function renderExercise() {
    const ex = S.current(s);
    $('.ex-name').textContent = ex.name;
    $('.ex-last').innerHTML = `Last time ${fig(S.setsLine(ex))}`;
    doneRows.innerHTML = ex.done.map((d, i) => row(d, i, 'done' + (d.record ? ' rec' : ''))).join('');
    $('.w-count').textContent = `${s.cur + 1} of ${s.exercises.filter((e) => !S.isCut(s, e)).length}`;
  }
  function renderNow({ waiting = false } = {}) {
    const n = S.nowSet(s);
    const proposing = S.bumpOpen(s) && !waiting;
    root.dataset.bump = proposing ? 'open' : s.bump.state === 'applied' && n.ex.id === 'bench' && n.n === 3 ? 'applied' : 'none';
    $('.now-label').innerHTML = `Set ${fig(n.n)} of ${fig(n.of)}${waiting ? ' · after rest' : ''}`;
    roll(fw, proposing ? '82.5' : S.fmtKg(n.w), { move: after(fw) });
    roll(fr, n.r);
    was.textContent = '80';
    root.classList.toggle('waiting', waiting);
    $('.bump-acts').hidden = !proposing;
    if (!(n.ex.id === 'bench' && n.n === 3 && !waiting)) $('.bump-undo').hidden = true;
    const coach = $('.w-coach');
    if (proposing) coach.innerHTML = `Sets 1 and 2 moved fast. Try ${fig('82.5')}?`;
    else if (!waiting) coach.innerHTML = lastBeat();
    const up = [];
    const ex = n.ex;
    const baseW = ex.id === 'bench' && s.bump.state === 'applied' ? s.bump.to : ex.w;
    for (let i = n.n; i < n.of; i++) up.push(row({ w: baseW, r: ex.r }, i, 'up'));
    upRows.innerHTML = up.join('');
    const nx = S.nextExercise(s);
    $('.next-ex').innerHTML = nx ? `Next: ${esc(nx.name)} ${fig(`${S.fmtKg(nx.w)} × ${nx.r}`)}` : 'Last exercise';
  }
  function lastBeat() {
    const n = S.nowSet(s), lastR = n.ex.last[1][n.n - 1];
    if (lastR == null) return '';
    const words = ['', 'One more', 'Two more', 'Three more', 'Four more'];
    if (lastR < n.r) return `Last time this set was ${fig(lastR)}. ${words[n.r - lastR] || `${n.r - lastR} more`} beats it.`;
    return `Last time this set was ${fig(`${S.fmtKg(n.ex.last[0])} × ${lastR}`)}.`;
  }
  function renderSlab() {
    const n = S.nowSet(s), open = root.dataset.screen === 'workout';
    // In the workout the slab always says Done, even while resting (the rest counts down on its right), so the next
    // set is one tap however early you finish it. Away on Today it says you're resting and takes you back.
    if (restInfo && !open) {
      if (slabL.dataset.text !== 'Resting') roll(slabL, 'Resting');
      slabT.textContent = S.mmss(restInfo.left);
      slabRT.textContent = '';
      roll(slabR, 'Back to workout');
      root.classList.add('resting');
      return;
    }
    slabT.textContent = '';
    root.classList.remove('resting');
    if (restInfo) {
      roll(slabL, 'Done');
      roll(slabR, 'Rest');
      const fresh = !slabRT.textContent;
      slabRT.textContent = S.mmss(restInfo.left);
      if (fresh) play(slabRT, [{ opacity: 0 }, { opacity: 1 }], SPRINGS.type, { delay: reduced() ? 0 : 100 });
      return;
    }
    slabRT.textContent = '';
    if (s.finished) { roll(slabL, 'Finish workout'); roll(slabR, ''); return; }
    roll(slabL, open ? 'Done' : 'Back to workout');
    roll(slabR, `Set ${n.n} of ${n.of}`);
  }
  function syncWorkout() {
    renderExercise();
    renderNow({ waiting: !!restInfo });
    renderSlab();
    $('.mins').textContent = S.minutesLeft(s, { preview: true });
    $('.doneby').textContent = S.doneBy(s, { preview: true });
  }
  renderExercise();
  renderNow();

  // The clock in the header changes once a second (text only, nothing redraws per frame).
  T.every(1000, () => {
    $('.w-clock').textContent = S.minutesIn(s);
    $('.t-clock').textContent = S.hhmm(s.now());
    if (restInfo) {
      restInfo.left = Math.max(0, restInfo.until - Math.round((Date.now() - restInfo.t) / 1000));
      if (restInfo.left <= 0) endRest(); else renderSlab();
    }
  });

  function startRest(info) {
    restInfo = { t: Date.now(), until: s.restSecs, left: s.restSecs, info };
    // The Now rule drains once a second, not every frame: the screen is kept on during rest, frames cost battery.
    const drain = $('.drain');
    drain.getAnimations().forEach((a) => a.cancel());
    drain.style.scale = '0 1';
    if (!reduced()) drain.animate([{ scale: '1 1' }, { scale: '0 1' }], { duration: s.restSecs * 1000, easing: `steps(${s.restSecs}, end)` });
  }
  function endRest(skipped) {
    if (!restInfo) return;
    restInfo = null;
    const drain = $('.drain');
    drain.getAnimations().forEach((a) => a.cancel());
    drain.style.scale = '1 1';
    if (skipped && !reduced()) play(drain, [{ scale: '0 1' }, { scale: '1 1' }], SPRINGS.set);
    // The waiting set darkens to ink: it's now.
    root.classList.remove('waiting');
    renderNow();
    renderSlab();
    if (lastTick) { lastTick.row.querySelector('.row-undo')?.remove(); lastTick.row.classList.remove('just'); lastTick = null; }
    $('.set-undo').hidden = true;
  }

  function doTick() {
    if (Date.now() < tickLock) return;
    tickLock = Date.now() + 1500; // a double tap can't tick the next set too (no real set is that short)
    const from = fw.getBoundingClientRect(), fromR = fr.getBoundingClientRect();
    const others = [$('.now-rule'), $('.now'), $('.next-pane')];
    // What the Now pane said fades where it stands while the next set rises in (its numbers are flying to the row).
    const olds = [...$('.now').children].filter((x) => !x.hidden).map((x) => ghost(x));
    olds.forEach(({ g }) => g.querySelectorAll('.fw .v, .fr .v').forEach((v) => { v.style.visibility = 'hidden'; }));
    let info, newRow;
    // Measure first, change everything in one go, then slide each thing from where it was (FLIP).
    flip(others, () => {
      info = S.tick(s);
      doneRows.insertAdjacentHTML('beforeend', row(info.rec, info.ex.done.length - 1, 'done just' + (info.rec.record ? ' rec-pending' : '')));
      newRow = doneRows.lastElementChild;
      newRow.insertAdjacentHTML('beforeend', `<button type="button" class="undo row-undo" data-act="untick" disabled>Undo</button>`);
      if (info.exDone && !S.advance(s)) s.finished = true;
      if (!s.finished) startRest(info);
      renderNow({ waiting: !s.finished });
      olds.forEach(({ host, g }) => host.append(g));
    }, SPRINGS.set, boxes('.ex-pane', '.now'));
    olds.forEach(({ g }) => fadeGhost(g, [{ opacity: 1 }, { opacity: 0 }]));
    T.after(400, () => { const b = newRow.querySelector('.row-undo'); if (b) b.disabled = false; });
    // 1. The figure shrinks into the list as a row (scaling down only, so it stays sharp).
    travel(newRow.querySelector('.cw'), from, SPRINGS.type);
    travel(newRow.querySelector('.cr'), fromR, SPRINGS.type);
    play(newRow.querySelector('.cx'), [{ opacity: 0 }, { opacity: 1 }], SPRINGS.set, { delay: 120 });
    newRow.querySelectorAll('.w, .at, .row-undo').forEach((x) => play(x, [{ opacity: 0 }, { opacity: 1 }], SPRINGS.set, { delay: 120 }));
    // 2. The next set rises into the Now slot, waiting in graphite; the slab's face becomes the rest. (Its content
    //    rises, not the lens around it, so the glass never blinks.)
    [...$('.now').children].filter((x) => !x.hidden && !x.classList.contains('ghost')).forEach((x) => play(x, [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }], SPRINGS.set, { delay: 40 }));
    let note = '';
    if (info.rec.record) note = `Best bench yet: about ${info.rec.est.toFixed(1)} kg estimated, up from ${info.rec.prevBest.toFixed(1)}.`;
    else if (info.last != null && info.rec.r > info.last) { const d = info.rec.r - info.last; note = `+${d} rep${d > 1 ? 's' : ''} on last time.`; }
    if (info.rec.record) T.after(120, () => {
      const m = newRow.querySelector('.marker');
      newRow.classList.replace('rec-pending', 'rec');
      if (m) play(m, [{ scale: '0 1' }, { scale: '1 1' }], SPRINGS.press);
    });
    const coach = $('.w-coach');
    coach.innerHTML = s.finished ? 'That’s the session. Tap Finish when you’re ready.' : esc(note);
    if (coach.innerHTML) play(coach, [{ opacity: 0 }, { opacity: 1 }], SPRINGS.set, { delay: 200 });
    lastTick = { info, row: newRow };
    if (info.exDone && !s.finished) {
      // A new exercise: the finished one lifts away, the next one rises in.
      const blk = $('.ex-block');
      T.after(900, () => {
        if (info.undone) return;
        const a = blk.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px)' }], { ...EXIT, fill: 'forwards' });
        a.finished.then(() => {
          flip([$('.now-rule'), $('.now'), $('.next-pane')], renderExercise, SPRINGS.set, boxes('.ex-pane'));
          a.cancel();
          play(blk, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], SPRINGS.set);
          // The finished exercise's rows are gone, so its Undo moves to the Now pane for the rest of its 8 s.
          $('.w-coach').innerHTML = ''; // the note was about the finished exercise
          if (lastTick?.info === info) {
            const line = $('.set-undo');
            line.querySelector('.u-text').textContent = `${info.ex.name} done, ${info.ex.done.length} sets.`;
            line.hidden = false;
            play(line, [{ opacity: 0 }, { opacity: 1 }], SPRINGS.set);
          }
        }, () => {});
      });
    }
    renderSlab();
    $('.w-count').textContent = `${s.cur + 1} of ${s.exercises.filter((e) => !S.isCut(s, e)).length}`;
    renderPlan();
    if (navigator.vibrate) try { navigator.vibrate(info.rec.record ? [12, 60, 24] : 12); } catch {}
    // Undo stays on the row for 8 s, then the row settles.
    T.after(8000, () => {
      if (newRow.isConnected) { newRow.querySelector('.row-undo')?.remove(); newRow.classList.remove('just'); }
      if (lastTick?.row === newRow) { lastTick = null; $('.set-undo').hidden = true; }
    });
  }
  function doUntick() {
    if (!lastTick) return;
    const { info, row: r } = lastTick;
    lastTick = null;
    info.undone = true;
    const from = r.isConnected ? r.querySelector('.col').getBoundingClientRect() : null;
    $('.set-undo').hidden = true;
    restInfo = null;
    s.finished = false;
    S.untick(s, info);
    const drain = $('.drain');
    drain.getAnimations().forEach((a) => a.cancel());
    drain.style.scale = '1 1';
    root.classList.remove('waiting');
    if (from) flip([$('.now-rule'), $('.now'), $('.next-pane')], () => { renderExercise(); renderNow(); }, SPRINGS.set, boxes('.ex-pane', '.now'));
    else {
      // The exercise had already moved on: swap the whole content back the way it left, nothing slides through rows.
      renderExercise(); renderNow();
      [$('.ex-block'), $('.now-rule'), ...[...$('.now').children].filter((x) => !x.hidden && !x.classList.contains('figure')), $('.next-pane')]
        .forEach((x) => play(x, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], SPRINGS.set));
    }
    renderSlab();
    renderPlan();
    // The figure travels back up from the row it became.
    const f = $('.figure');
    const to = f.getBoundingClientRect();
    // Text never animates up in size (it looks soft before it snaps sharp), so it travels and fades instead.
    if (from) play(f, [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.type);
    else play(f, [{ transform: 'translateY(-14px)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.type);
  }

  /* Proposal on the set: 82.5 in blue until you take it. */
  // Everything in the figure that can shift sideways when the struck 80 comes or goes.
  const figParts = () => [fw, $('.fw .bar'), $('.unit'), $('.x'), $('.fr')];
  function dropWas() {
    const w = $('.fw .was');
    if (getComputedStyle(w).display === 'none') return;
    const { host, g } = ghost(w, ['display', 'color']);
    host.append(g);
    fadeGhost(g, [{ opacity: 1 }, { opacity: 0 }]);
  }
  function bumpApply() {
    if (!S.bumpOpen(s)) return;
    s.bump.state = 'applied';
    const line = $('.bump-undo');
    undoAfter(line, 'Bench is now 82.5 kg.');
    dropWas();
    flip([...figParts(), $('.next-pane')], () => {
      root.dataset.bump = 'applied'; // the blue dries to ink
      swap($('.bump-acts'), line);
      renderNow();
    }, SPRINGS.set, boxes('.ex-pane', '.now'));
    renderSlab();
  }
  function bumpKeep() {
    if (!S.bumpOpen(s)) return;
    s.bump.state = 'kept';
    const line = $('.bump-undo');
    undoAfter(line, 'Staying at 80.');
    dropWas();
    flip([...figParts(), $('.next-pane')], () => {
      root.dataset.bump = 'none';
      roll(fw, '80', { dir: -1, move: after(fw) });
      swap($('.bump-acts'), line);
      renderNow();
    }, SPRINGS.set, boxes('.ex-pane', '.now'));
  }
  function bumpUndo() {
    if (s.bump.state === 'applied' || s.bump.state === 'kept') {
      if (S.current(s).id !== 'bench' || S.current(s).done.length !== 2) return;
      s.bump.state = 'open';
      flip([...figParts(), $('.next-pane')], () => {
        swap($('.bump-undo'), null);
        renderNow();
      }, SPRINGS.set, boxes('.ex-pane', '.now'));
      play($('.fw .was'), [{ opacity: 0 }, { opacity: 1 }], SPRINGS.set, { delay: 60 });
      play($('.bump-acts'), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], SPRINGS.set, { delay: 40 });
      renderSlab();
    }
  }

  /* ---------- Opening and closing the workout: catchable, keeps its speed ---------- */
  const today = $('.today'), work = $('.workout');
  const H = () => innerHeight;
  const wy = new Channel(work, 'translate', (v) => `0 ${v}px`, H(), { hideAt: H() });
  const tOp = new Channel(today, 'opacity', (v) => String(v), 1, { hideAt: 0 });
  root.dataset.screen = 'today';
  function openWorkout(push = true) {
    root.dataset.screen = 'workout';
    work.setAttribute('aria-hidden', 'false');
    today.setAttribute('aria-hidden', 'true');
    wy.to(0, SPRINGS.lift);
    // Rich panes are see-through, so Today must be gone before the workout's panes pass over it (no doubled text).
    tOp.to(0, rich ? OUT : SPRINGS.set);
    renderSlab();
    if (push) history.pushState({ looks: 'workout' }, '');
  }
  function closeWorkout(fromPop) {
    root.dataset.screen = 'today';
    work.setAttribute('aria-hidden', 'true');
    today.setAttribute('aria-hidden', 'false');
    wy.to(H(), SPRINGS.set);
    if (rich) T.after(170, () => { if (root.dataset.screen === 'today') tOp.to(1, SPRINGS.set); });
    else tOp.to(1, SPRINGS.set);
    renderPlan();
    trimUI();
    renderSlab();
    if (!fromPop && history.state?.looks === 'workout') { selfBack++; history.back(); }
  }
  const onPop = () => {
    if (selfBack) { selfBack--; return; }
    if (trayOpen) closeTray(undefined, true); else if (root.dataset.screen === 'workout') closeWorkout(true);
  };
  addEventListener('popstate', onPop);

  /* ---------- The edit tray: lifts, follows a finger, keeps its speed when let go ---------- */
  const tray = $('.tray'), scrim = $('.scrim');
  let trayOpen = false;
  const tH = () => tray.getBoundingClientRect().height + 40;
  const ty = new Channel(tray, 'translate', (v) => `0 ${v}px`, 600);
  const sOp = new Channel(scrim, 'opacity', (v) => String(v), 0);
  // The slab fades while the tray is up (else it shows through the tray's glass as a grey shape). Only the slab: fading
  // the dock itself would switch off its blur mid-fade.
  const dOp = new Channel($('.slab'), 'opacity', (v) => String(v), 1);
  function trayVals() {
    const n = S.nowSet(s);
    $('.tw').textContent = S.fmtKg(S.bumpOpen(s) ? 82.5 : n.w);
    $('.tr').textContent = n.r;
    $('.tray-done').textContent = `Use for set ${n.n}`;
  }
  function openTray() {
    trayOpen = true; // also while resting: changing the next set is a natural thing to do between sets
    tray.hidden = false; scrim.hidden = false;
    trayVals();
    if (ty.value > tH()) ty.set(tH());
    ty.to(0, SPRINGS.lift);
    sOp.to(1, SPRINGS.set);
    dOp.to(0, SPRINGS.set);
    history.pushState({ looks: 'tray' }, '');
  }
  function closeTray(v, fromPop) {
    if (!trayOpen) return;
    trayOpen = false;
    const hide = () => { if (!trayOpen) { tray.hidden = true; scrim.hidden = true; } };
    const a = ty.to(tH(), SPRINGS.lift, v != null ? { v } : {});
    if (a) a.finished.then(hide, () => {}); else hide(); // reduced motion: no animation, hide at once
    dOp.to(1, SPRINGS.set);
    sOp.to(0, SPRINGS.set);
    if (!fromPop && history.state?.looks === 'tray') { selfBack++; history.back(); }
  }
  tray.addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]');
    if (!b) return;
    const ex = S.current(s), n = S.nowSet(s);
    const base = S.bumpOpen(s) ? s.bump.to : n.w; // the tray showed the Coach's number, so a step starts from it
    if (S.bumpOpen(s)) {
      s.bump.state = 'kept';
      dropWas();
      flip([...figParts(), $('.next-pane')], () => { root.dataset.bump = 'none'; swap($('.bump-acts'), null); $('.w-coach').innerHTML = lastBeat(); }, SPRINGS.set, boxes('.ex-pane', '.now'));
    }
    let w = ex.wOverride ?? base, r = ex.rOverride ?? n.r;
    if (b.dataset.d === 'w-') w = Math.max(0, w - 2.5);
    if (b.dataset.d === 'w+') w += 2.5;
    if (b.dataset.d === 'r-') r = Math.max(1, r - 1);
    if (b.dataset.d === 'r+') r += 1;
    ex.wOverride = w; ex.rOverride = r;
    roll($('.tw'), S.fmtKg(w), { dir: b.dataset.d === 'w-' ? -1 : 1 });
    roll($('.tr'), r, { dir: b.dataset.d === 'r-' ? -1 : 1 });
    roll(fw, S.fmtKg(w), { dir: b.dataset.d === 'w-' ? -1 : 1, move: after(fw) });
    roll(fr, r, { dir: b.dataset.d === 'r-' ? -1 : 1 });
  });
  // Direct tracking: drag the tray down; let go and a spring takes over at the finger's speed.
  let drag = null;
  tray.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    drag = { y0: e.clientY, at: ty.now().x, samples: [[e.timeStamp, e.clientY]] };
    tray.setPointerCapture(e.pointerId);
    ty.set(drag.at);
  });
  tray.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dy = e.clientY - drag.y0;
    const y = drag.at + (dy < 0 ? dy / 4 : dy); // rubber band upward
    ty.set(y);
    drag.samples.push([e.timeStamp, e.clientY]);
    if (drag.samples.length > 5) drag.samples.shift();
  });
  const endDrag = (e) => {
    if (!drag) return;
    const sm = drag.samples, a = sm[0], b = sm[sm.length - 1];
    const v = b[0] > a[0] ? ((b[1] - a[1]) / (b[0] - a[0])) * 1000 : 0;
    const y = ty.value;
    drag = null;
    if (y > tH() * 0.35 || v > 700) closeTray(v);
    else ty.to(0, SPRINGS.lift, { v });
  };
  tray.addEventListener('pointerup', endDrag);
  tray.addEventListener('pointercancel', endDrag);

  /* ---------- Taps ---------- */
  root.querySelectorAll('.slab, .btn-apply, .btn-keep, .tray-done, .step, .back').forEach((b) => pressable(b, { scale: b.classList.contains('slab') ? 0.985 : 0.96 }));
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    if (act === 'slab') {
      if (root.dataset.screen !== 'workout') return openWorkout();
      if (s.finished && !restInfo) { closeWorkout(); return; }
      if (Date.now() < tickLock) return;
      if (restInfo) endRest(false); // finished early: one tap ends the rest and ticks the set
      doTick();
    }
    if (act === 'close') closeWorkout();
    if (act === 'trim-apply') trimApply();
    if (act === 'trim-keep') trimKeep();
    if (act === 'trim-undo') trimUndo();
    if (act === 'bump-apply') bumpApply();
    if (act === 'bump-keep') bumpKeep();
    if (act === 'bump-undo') bumpUndo();
    if (act === 'untick') doUntick();
    if (act === 'edit') openTray();
    if (act === 'tray-done') closeTray();
  });
  scrim.addEventListener('click', () => closeTray());
  renderSlab();

  return () => {
    T.stop();
    stopBg();
    removeEventListener('popstate', onPop);
  };
}
