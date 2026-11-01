/* Heat: the wildcard. The whole screen is lit by one colour temperature that tells you where you are:
   embers on Today, full heat while you work, a cool sea-green while you rest that warms back up as the rest runs out.
   Everything you act on sits on one big pane of frosted glass in that light. The Coach's proposals are hollow
   (outlined) numbers; Apply fills them with light, Undo drains them. */
import { SPRINGS, Channel, play, fade, flip, travel, roll, pressable, timers, reduced } from './motion.js';
import { paintField, fieldLayer } from './bg.js';
import * as S from './state.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const FIELDS = {
  today: [[
    { x: 0.5, y: 1.0, sx: 0.6, sy: 0.3, c: [255, 88, 30], a: 0.8 },
    { x: 0.5, y: 1.06, sx: 0.28, sy: 0.12, c: [255, 186, 92], a: 0.7 },
    { x: 0.02, y: 0.02, sx: 0.5, sy: 0.3, c: [118, 30, 14], a: 0.42 },
  ], [10, 7, 6]],
  work: [[
    { x: 0.5, y: 0.84, sx: 0.66, sy: 0.5, c: [255, 72, 22], a: 0.92 },
    { x: 0.5, y: 0.98, sx: 0.34, sy: 0.2, c: [255, 172, 60], a: 0.85 },
    { x: 0.5, y: 1.05, sx: 0.2, sy: 0.08, c: [255, 236, 200], a: 0.6 },
    { x: 0.12, y: 0.04, sx: 0.46, sy: 0.26, c: [150, 26, 10], a: 0.55 },
  ], [14, 6, 4]],
  rest: [[
    { x: 0.5, y: 0.84, sx: 0.66, sy: 0.5, c: [8, 140, 128], a: 0.86 },
    { x: 0.5, y: 0.98, sx: 0.32, sy: 0.18, c: [110, 236, 206], a: 0.62 },
    { x: 0.88, y: 0.04, sx: 0.46, sy: 0.26, c: [8, 58, 76], a: 0.6 },
  ], [3, 11, 12]],
};

export function heat(stage) {
  const s = S.createSession();
  const T = timers();
  const root = document.createElement('div');
  root.className = 'variant heat';
  root.dataset.screen = 'today';
  root.innerHTML = `
  <div class="hbg" aria-hidden="true"></div>
  <section class="screen h-today" aria-label="Today">
    <div class="scroll">
      <header class="h-top"><span>Sunday 1 Nov</span><span class="num h-clock">16:24</span></header>
      <h1 class="h-say">Leave by <span class="num">16:50</span> for wrestling.</h1>
      <p class="h-ask">Trim the rest of Push to fit?</p>
      <div class="h-acts trim-acts">
        <button type="button" class="pill solid" data-act="trim-apply">Trim to <span class="num tmins">22</span> min</button>
        <button type="button" class="pill ghost" data-act="trim-keep">Keep it all</button>
      </div>
      <div class="h-undo trim-undo" hidden><span class="u-text"></span><button type="button" class="undo" data-act="trim-undo">Undo</button></div>
      <div class="card plan-card">
        <div class="cap"><span>Push · in progress</span><span><span class="num was-min">40</span><span class="num prop mins">22</span> min left</span></div>
        <ol class="h-plan"></ol>
      </div>
      <div class="tiles">
        <div class="card tile"><div class="cap">Protein</div><div class="big"><span class="num">96</span><small>/ 180 g</small></div><i class="gauge"><b style="--p:.53"></b></i></div>
        <div class="card tile"><div class="cap">Sleep</div><div class="big"><span class="num">6:05</span><small>h</small></div><div class="tile-sub">bed 00:40, up 06:45</div></div>
      </div>
    </div>
  </section>
  <section class="screen h-work" aria-label="Workout" aria-hidden="true">
    <div class="scroll">
      <header class="h-top"><button type="button" class="back" data-act="close" aria-label="Back to Today">‹ Today</button><span>Push · <span class="num h-mins"></span> min</span><span class="h-count"></span></header>
      <div class="ex-head"><h2 class="ex-name"></h2><div class="ex-sub"></div></div>
      <ol class="chips" aria-label="Sets done"></ol>
      <div class="slab-wrap">
        <i class="sweep" aria-hidden="true"></i>
        <div class="slab">
          <div class="face work-face">
            <div class="cols"><span>Weight</span><span>Reps</span></div>
            <div class="nums">
              <button type="button" class="nb w" data-act="edit" aria-label="Change weight"><span class="v"></span><span class="hollow-wrap"><span class="hollow"></span><span class="fillwrap"><span class="fill"></span></span></span><small>kg</small></button>
              <button type="button" class="nb r" data-act="edit" aria-label="Change reps"><span class="v"></span></button>
            </div>
            <p class="h-coach"></p>
            <div class="h-acts bump-acts" hidden>
              <button type="button" class="pill solid small" data-act="bump-apply">Apply</button>
              <button type="button" class="pill ghost small" data-act="bump-keep">Keep <span class="num">80</span></button>
            </div>
            <div class="h-undo bump-undo" hidden><span class="u-text"></span><button type="button" class="undo" data-act="bump-undo">Undo</button></div>
          </div>
          <div class="face rest-face" aria-live="polite" hidden>
            <div class="cols"><span>Rest</span><span class="rest-next"></span></div>
            <div class="rest-time num">1:30</div>
            <p class="h-coach rest-note"></p>
            <div class="h-undo"><button type="button" class="undo rest-undo" data-act="untick" hidden>Undo set</button></div>
          </div>
        </div>
      </div>
      <div class="h-next"></div>
    </div>
  </section>
  <div class="h-dock"><button type="button" class="go" data-act="go"><i class="go-fill" aria-hidden="true"></i><span class="go-l"></span><span class="go-r"></span></button></div>
  <div class="scrim" hidden></div>
  <div class="tray" role="dialog" aria-label="Change this set" hidden>
    <div class="grip" aria-hidden="true"></div>
    <div class="tray-row"><span class="lbl">Weight</span><button type="button" class="step" data-d="w-" aria-label="Less weight">−</button><b class="num tw"></b><button type="button" class="step" data-d="w+" aria-label="More weight">+</button></div>
    <div class="tray-row"><span class="lbl">Reps</span><button type="button" class="step" data-d="r-" aria-label="Fewer reps">−</button><b class="num tr"></b><button type="button" class="step" data-d="r+" aria-label="More reps">+</button></div>
    <button type="button" class="pill solid tray-done" data-act="tray-done">Done</button>
  </div>`;
  stage.append(root);
  const $ = (q) => root.querySelector(q);

  /* ---------- The light: three painted fields, cross-faded on the compositor ---------- */
  const hbg = $('.hbg');
  const layers = {};
  for (const k of ['rest', 'work', 'today']) {
    const [blobs, base] = FIELDS[k];
    layers[k] = fieldLayer(paintField(blobs, base, { over: 1.12, seed: k.length * 7 }), 'f-' + k);
    hbg.append(layers[k]);
  }
  const op = {
    today: new Channel(layers.today, 'opacity', String, 1),
    work: new Channel(layers.work, 'opacity', String, 0),
    rest: new Channel(layers.rest, 'opacity', String, 0),
  };
  let lit = 'today';
  // A flare for records: a small painted glow, scaled up (it only shows for a moment), faded on the compositor.
  const flare = fieldLayer(paintField([{ x: 0.5, y: 0.78, sx: 0.5, sy: 0.4, c: [255, 214, 140], a: 0.9 }], [0, 0, 0], { w: innerWidth / 3, h: innerHeight / 3, over: 1.12, seed: 9 }), 'f-flare');
  flare.style.opacity = '0';
  hbg.append(flare);
  let breath = null;
  function light(state, { ms } = {}) {
    // One light at a time. Changing it dims the old one quickly and brings the new one up just after, through the
    // dark ground, so ember and sea-green never mix into mud. Slow springs: light changes, nothing moves.
    if (state === lit) return;
    const old = lit;
    lit = state;
    op[old].to(0, { damping: 1, response: 0.32 });
    if (reduced()) { op[state].to(1); return; }
    op[state].to(1, { damping: 1, response: ms ?? 0.8 });
  }
  function startBreath() {
    if (reduced() || breath) return;
    // A calm breath while you rest: 5 s in, 5 s out, on the compositor. Paused when the page is hidden.
    breath = layers.rest.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }], { duration: 5000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
  }
  function stopBreath() { if (breath) { breath.cancel(); breath = null; } }
  const vis = () => { if (breath) (document.hidden ? breath.pause() : breath.play()); };
  document.addEventListener('visibilitychange', vis);

  /* ---------- Today ---------- */
  const hplan = $('.h-plan');
  function dots(ex) {
    const full = ex.planned, prev = S.plannedSets(s, ex, { preview: true });
    let out = '';
    for (let i = 0; i < full; i++) {
      const cls = i < ex.done.length ? 'd' : i >= prev ? 'x' : '';
      out += `<i class="${cls}"></i>`;
    }
    return out;
  }
  function renderPlan() {
    hplan.innerHTML = s.exercises.map((ex) => {
      const prev = S.plannedSets(s, ex, { preview: true });
      const cut = prev === 0, changed = !cut && prev !== ex.planned;
      const status = cut ? 'skip' : ex === S.current(s) ? `set ${ex.done.length + 1} next` : ex.done.length >= prev ? 'done' : `${prev} sets`;
      return `<li class="${cut ? 'cut' : ''}${changed ? ' changed' : ''}"${cut && s.trim.state === 'applied' ? ' hidden' : ''}><span class="dots">${dots(ex)}</span><span class="nm">${esc(ex.name)}</span><span class="st">${esc(status)}</span></li>`;
    }).join('');
  }
  renderPlan();
  function trimUI() {
    root.dataset.trim = s.trim.state;
    $('.mins').textContent = S.minutesLeft(s, { preview: true });
    $('.was-min').textContent = S.minutesLeft(s);
    $('.tmins').textContent = S.minutesLeft(s, { preview: true });
  }
  trimUI();
  function undoAfter(line, text) {
    line.querySelector('.u-text').textContent = text;
    const b = line.querySelector('.undo');
    b.disabled = true; // not tappable at once (LESSONS 38)
    T.after(400, () => { b.disabled = false; });
  }
  function trimApply() {
    if (s.trim.state !== 'open') return;
    const cut = [...hplan.querySelectorAll('li.cut')];
    const rest = [...hplan.querySelectorAll('li:not(.cut)'), $('.tiles')];
    s.trim.state = 'applied';
    root.dataset.trim = 'applied'; // hollow fills with light (CSS), cut rows fold away
    T.after(180, () => { flip(rest, () => cut.forEach((li) => { li.hidden = true; })); });
    cut.forEach((li) => li.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out', fill: 'forwards' }));
    $('.trim-acts').hidden = true;
    $('.h-say').innerHTML = `Done by <span class="num">${S.doneBy(s)}</span>, in time for wrestling.`;
    $('.h-ask').textContent = `Cable fly and pushdowns are off; incline is two sets.`;
    const line = $('.trim-undo');
    line.hidden = false;
    undoAfter(line, `Trimmed to ${S.minutesLeft(s)} min.`);
    play(line, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }]);
    sync();
  }
  function trimKeep() {
    if (s.trim.state !== 'open') return;
    s.trim.state = 'kept';
    root.dataset.trim = 'kept';
    renderPlan();
    $('.trim-acts').hidden = true;
    $('.h-say').innerHTML = `Full plan. Done by <span class="num">${S.doneBy(s)}</span>.`;
    $('.h-ask').textContent = 'Leave straight after for wrestling.';
    const line = $('.trim-undo');
    line.hidden = false;
    undoAfter(line, 'Kept the full plan.');
    trimUI();
  }
  function trimUndo() {
    const was = s.trim.state;
    if (was !== 'applied' && was !== 'kept') return;
    s.trim.state = 'open';
    const before = [...hplan.querySelectorAll('li:not(.cut)'), $('.tiles')];
    flip(before, () => { renderPlan(); trimUI(); });
    hplan.querySelectorAll('li.cut').forEach((li) => play(li, [{ opacity: 0 }, { opacity: 1 }]));
    $('.h-say').innerHTML = `Leave by <span class="num">16:50</span> for wrestling.`;
    $('.h-ask').textContent = 'Trim the rest of Push to fit?';
    $('.trim-undo').hidden = true;
    const acts = $('.trim-acts');
    acts.hidden = false;
    play(acts, [{ opacity: 0 }, { opacity: 1 }]);
    sync();
  }

  /* ---------- Workout ---------- */
  const chips = $('.chips'), wv = $('.nb.w .v'), rv = $('.nb.r .v');
  const goL = $('.go-l'), goR = $('.go-r');
  let restInfo = null, lastTick = null, lock = 0, selfBack = 0;

  const chip = (d, i, extra = '') => `<li class="chip${d.record ? ' rec' : ''}${extra}" aria-label="Set ${i + 1}: ${S.fmtKg(d.w)} kg × ${d.r}"><span class="num">${S.fmtKg(d.w)}×${d.r}</span></li>`;
  function renderExercise() {
    const ex = S.current(s);
    $('.ex-name').textContent = ex.name;
    $('.ex-sub').innerHTML = `Last time <span class="num">${S.setsLine(ex)}</span>`;
    chips.innerHTML = ex.done.map((d, i) => chip(d, i)).join('');
    $('.h-count').innerHTML = `<span class="num">${s.cur + 1}</span>/<span class="num">${s.exercises.filter((e) => !S.isCut(s, e)).length}</span>`;
  }
  function renderSet() {
    const n = S.nowSet(s);
    const proposing = S.bumpOpen(s);
    root.dataset.bump = proposing ? 'open' : (s.bump.state === 'applied' && n.ex.id === 'bench' && n.n === 3 ? 'applied' : 'none');
    roll(wv, S.fmtKg(proposing ? 82.5 : n.w));
    roll(rv, n.r);
    $('.hollow').textContent = '82.5';
    $('.fill').textContent = '82.5';
    $('.bump-acts').hidden = !proposing;
    if (!(n.ex.id === 'bench' && n.n === 3)) $('.bump-undo').hidden = true;
    const coach = $('.work-face .h-coach');
    if (proposing) coach.innerHTML = `Sets 1 and 2 moved fast. Try <span class="num">82.5</span>?`;
    else if (root.dataset.bump !== 'applied') {
      const lastR = n.ex.last[1][n.n - 1];
      coach.innerHTML = lastR != null ? `Set <span class="num">${n.n}</span> of <span class="num">${n.of}</span> · last time <span class="num">${lastR}</span> reps` : `Set <span class="num">${n.n}</span> of <span class="num">${n.of}</span>`;
    }
    const nx = S.nextExercise(s);
    $('.h-next').innerHTML = nx ? `Then <b>${esc(nx.name)}</b> <span class="num">${S.fmtKg(nx.w)}×${nx.r}</span>` : 'Last exercise';
  }
  function renderGo() {
    const n = S.nowSet(s), open = root.dataset.screen === 'workout';
    root.classList.toggle('resting', !!restInfo);
    if (restInfo) {
      roll(goL, open ? 'Skip rest' : 'Resting');
      roll(goR, open ? '' : S.mmss(restInfo.left));
      return;
    }
    if (s.finished) { roll(goL, 'Finish'); roll(goR, ''); return; }
    roll(goL, open ? 'Done' : 'Back to workout');
    roll(goR, `Set ${n.n}/${n.of}`);
  }
  function sync() { renderExercise(); renderSet(); renderGo(); trimUI(); }
  renderExercise();
  renderSet();
  renderGo();
  $('.h-mins').textContent = S.minutesIn(s);

  const workFace = $('.work-face'), restFace = $('.rest-face');
  function showFace(rest) {
    const show = rest ? restFace : workFace, hide = rest ? workFace : restFace;
    if (!hide.hidden) {
      hide.hidden = true;
    }
    show.hidden = false;
    play(show, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], SPRINGS.set, { delay: rest ? 120 : 0 });
  }

  T.every(1000, () => {
    $('.h-clock').textContent = S.hhmm(s.now());
    $('.h-mins').textContent = S.minutesIn(s);
    if (restInfo) {
      restInfo.left = Math.max(0, restInfo.until - Math.round((Date.now() - restInfo.t) / 1000));
      $('.rest-time').textContent = S.mmss(restInfo.left);
      if (restInfo.left <= 0) endRest(); else if (root.dataset.screen !== 'workout') renderGo();
    }
  });

  function startRest(info) {
    restInfo = { t: Date.now(), until: s.restSecs, left: s.restSecs };
    const n = S.nowSet(s);
    $('.rest-time').textContent = S.mmss(s.restSecs);
    $('.rest-next').innerHTML = s.finished ? '' : `Next <span class="num">${S.fmtKg(n.w)}×${n.r}</span>`;
    const note = $('.rest-note');
    if (info.rec.record) note.innerHTML = `Best bench yet · about <span class="num">${info.rec.est.toFixed(1)}</span> kg est.`;
    else if (info.last != null && info.rec.r > info.last) note.innerHTML = `<span class="num">+${info.rec.r - info.last}</span> rep on last time`;
    else note.textContent = 'Breathe out slowly. Shoulders down.';
    light('rest');
    startBreath();
    showFace(true);
  }
  function endRest(skipped) {
    if (!restInfo) return;
    restInfo = null;
    stopBreath();
    light(root.dataset.screen === 'workout' ? 'work' : 'today', { ms: skipped ? 0.5 : 0.9 });
    if (lastTick) { lastTick = null; }
    $('.rest-undo').hidden = true;
    renderSet();
    showFace(false);
    renderGo();
  }

  function sweepLight() {
    if (reduced()) return;
    // A band of light passes behind the frosted pane: you see it through the glass.
    play($('.sweep'), [{ transform: 'translateX(-120%) skewX(-18deg)', opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: 'translateX(220%) skewX(-18deg)', opacity: 0 }], { damping: 1, response: 0.7 }, { fill: 'none' });
  }

  function doTick() {
    if (Date.now() < lock) return;
    lock = Date.now() + 350;
    const from = $('.nb.w').getBoundingClientRect();
    let info, el;
    flip([$('.slab-wrap'), $('.h-next')], () => {
      info = S.tick(s);
      chips.insertAdjacentHTML('beforeend', chip(info.rec, info.ex.done.length - 1, ' just'));
      el = chips.lastElementChild;
      if (info.exDone && !S.advance(s)) s.finished = true;
    });
    const ub = $('.rest-undo');
    ub.disabled = true;
    ub.hidden = false;
    T.after(400, () => { ub.disabled = false; });
    travel(el.querySelector('.num'), from, SPRINGS.type);
    play(el, [{ opacity: 0.2 }, { opacity: 1 }], SPRINGS.type);
    if (info.rec.record) T.after(160, () => {
      el.classList.add('flare');
      if (!reduced()) flare.animate([{ opacity: 0 }, { opacity: 0.75, offset: 0.25 }, { opacity: 0 }], { duration: 1400, easing: 'cubic-bezier(.2,.7,.3,1)' });
    });
    sweepLight();
    lastTick = { info, chip: el };
    if (!s.finished) startRest(info);
    else { $('.work-face .h-coach').textContent = 'That’s the session.'; }
    renderGo();
    if (info.exDone && !s.finished) {
      T.after(900, () => {
        if (info.undone) return;
        const head = $('.ex-head');
        const a = head.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px)' }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
        a.finished.then(() => { renderExercise(); a.cancel(); play(head, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }]); }, () => {});
      });
    }
    renderPlan();
    if (navigator.vibrate) try { navigator.vibrate(info.rec.record ? [12, 60, 24] : 12); } catch {}
    T.after(8000, () => { el.classList.remove('just'); if (lastTick?.chip === el) { lastTick = null; ub.hidden = true; } });
  }
  function doUntick() {
    if (!lastTick) return;
    const { info, chip: c } = lastTick;
    lastTick = null;
    info.undone = true;
    restInfo = null;
    s.finished = false;
    stopBreath();
    S.untick(s, info);
    const from = c.getBoundingClientRect();
    flip([$('.slab-wrap'), $('.h-next')], () => { renderExercise(); });
    light('work', { ms: 0.5 });
    renderSet();
    showFace(false);
    renderGo();
    renderPlan();
    const to = $('.nb.w').getBoundingClientRect();
    play($('.nums'), [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.type);
  }

  /* The proposal: 82.5 drawn hollow. Apply fills it with light from the left; Undo drains it back. */
  const fillwrap = $('.fillwrap'), fillEl = $('.fill');
  function pour(on) {
    const off = (k) => `translateX(${k * 104}%)`;
    fillwrap.style.transform = on ? 'none' : off(-1);
    fillEl.style.transform = on ? 'none' : off(1);
    if (reduced()) return;
    const spec = { damping: 1, response: 0.5 };
    play(fillwrap, [{ transform: on ? off(-1) : 'none' }, { transform: on ? 'none' : off(-1) }], spec);
    play(fillEl, [{ transform: on ? off(1) : 'none' }, { transform: on ? 'none' : off(1) }], spec);
  }
  pour(false);
  function bumpApply() {
    if (!S.bumpOpen(s)) return;
    s.bump.state = 'applied';
    root.dataset.bump = 'applied';
    pour(true);
    $('.bump-acts').hidden = true;
    $('.work-face .h-coach').innerHTML = 'Filled in. Same 8 reps.';
    const line = $('.bump-undo');
    line.hidden = false;
    undoAfter(line, 'Bench is now 82.5 kg.');
    play(line, [{ opacity: 0 }, { opacity: 1 }]);
    T.after(560, () => { if (root.dataset.bump === 'applied') { wv.dataset.text = ''; roll(wv, '82.5'); root.dataset.bump = 'set'; } });
    renderGo();
  }
  function bumpKeep() {
    if (!S.bumpOpen(s)) return;
    s.bump.state = 'kept';
    root.dataset.bump = 'none';
    $('.bump-acts').hidden = true;
    renderSet();
    $('.work-face .h-coach').innerHTML = 'Staying at <span class="num">80</span>.';
    const line = $('.bump-undo');
    line.hidden = false;
    undoAfter(line, '');
  }
  function bumpUndo() {
    if (!(s.bump.state === 'applied' || s.bump.state === 'kept')) return;
    if (S.current(s).id !== 'bench' || S.current(s).done.length !== 2) return;
    const wasApplied = s.bump.state === 'applied';
    s.bump.state = 'open';
    $('.bump-undo').hidden = true;
    renderSet();
    if (wasApplied) { pour(true); T.after(10, () => pour(false)); }
  }

  /* ---------- Screens: the workout rises over Today as the heat comes up ---------- */
  const today = $('.h-today'), work = $('.h-work');
  const wy = new Channel(work, 'translate', (v) => `0 ${v}px`, innerHeight);
  const tOp = new Channel(today, 'opacity', String, 1);
  function openWorkout() {
    root.dataset.screen = 'workout';
    work.setAttribute('aria-hidden', 'false'); today.setAttribute('aria-hidden', 'true');
    wy.to(0, SPRINGS.lift);
    tOp.to(0, SPRINGS.set);
    if (!restInfo) light('work');
    renderGo();
    history.pushState({ looks: 'workout' }, '');
  }
  function closeWorkout(fromPop) {
    root.dataset.screen = 'today';
    work.setAttribute('aria-hidden', 'true'); today.setAttribute('aria-hidden', 'false');
    wy.to(innerHeight, SPRINGS.set);
    tOp.to(1, SPRINGS.set);
    if (!restInfo) light('today');
    renderPlan(); trimUI(); renderGo();
    if (!fromPop && history.state?.looks === 'workout') { selfBack++; history.back(); }
  }

  /* ---------- The edit tray ---------- */
  const tray = $('.tray'), scrim = $('.scrim');
  let trayOpen = false;
  const tH = () => tray.getBoundingClientRect().height + 40;
  const ty = new Channel(tray, 'translate', (v) => `0 ${v}px`, 600);
  const sOp = new Channel(scrim, 'opacity', String, 0);
  function openTray() {
    if (restInfo) return;
    trayOpen = true;
    tray.hidden = false; scrim.hidden = false;
    const n = S.nowSet(s);
    $('.tw').textContent = S.fmtKg(S.bumpOpen(s) ? 80 : n.w);
    $('.tr').textContent = n.r;
    if (ty.value > tH()) ty.set(tH());
    ty.to(0, SPRINGS.lift);
    sOp.to(1);
    history.pushState({ looks: 'tray' }, '');
  }
  function closeTray(v, fromPop) {
    if (!trayOpen) return;
    trayOpen = false;
    ty.to(tH(), SPRINGS.lift, v != null ? { v } : {})?.finished.then(() => { if (!trayOpen) { tray.hidden = true; scrim.hidden = true; } }, () => {});
    sOp.to(0);
    if (!fromPop && history.state?.looks === 'tray') { selfBack++; history.back(); }
  }
  tray.addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]');
    if (!b) return;
    const ex = S.current(s), n = S.nowSet(s);
    if (S.bumpOpen(s)) { s.bump.state = 'kept'; root.dataset.bump = 'none'; $('.bump-acts').hidden = true; }
    let w = ex.wOverride ?? n.w, r = ex.rOverride ?? n.r;
    if (b.dataset.d === 'w-') w = Math.max(0, w - 2.5);
    if (b.dataset.d === 'w+') w += 2.5;
    if (b.dataset.d === 'r-') r = Math.max(1, r - 1);
    if (b.dataset.d === 'r+') r += 1;
    ex.wOverride = w; ex.rOverride = r;
    const dir = b.dataset.d.endsWith('-') ? -1 : 1;
    roll($('.tw'), S.fmtKg(w), { dir }); roll($('.tr'), r, { dir });
    roll(wv, S.fmtKg(w), { dir }); roll(rv, r, { dir });
    renderGo();
  });
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
    ty.set(drag.at + (dy < 0 ? dy / 4 : dy));
    drag.samples.push([e.timeStamp, e.clientY]);
    if (drag.samples.length > 5) drag.samples.shift();
  });
  const endDrag = () => {
    if (!drag) return;
    const sm = drag.samples, a = sm[0], b = sm[sm.length - 1];
    const v = b[0] > a[0] ? ((b[1] - a[1]) / (b[0] - a[0])) * 1000 : 0;
    drag = null;
    if (ty.value > tH() * 0.35 || v > 700) closeTray(v); else ty.to(0, SPRINGS.lift, { v });
  };
  tray.addEventListener('pointerup', endDrag);
  tray.addEventListener('pointercancel', endDrag);

  const onPop = () => {
    if (selfBack) { selfBack--; return; }
    if (trayOpen) closeTray(undefined, true); else if (root.dataset.screen === 'workout') closeWorkout(true);
  };
  addEventListener('popstate', onPop);

  /* ---------- Taps ---------- */
  root.querySelectorAll('.go, .pill, .step, .back, .nb').forEach((b) => pressable(b, { scale: b.classList.contains('go') ? 0.97 : 0.95 }));
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    if (act === 'go') {
      if (root.dataset.screen !== 'workout') return openWorkout();
      if (restInfo) { if (Date.now() >= lock) endRest(true); return; }
      if (s.finished) return closeWorkout();
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

  return () => {
    T.stop();
    stopBreath();
    document.removeEventListener('visibilitychange', vis);
    removeEventListener('popstate', onPop);
  };
}
