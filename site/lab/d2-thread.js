// Direction 2, Thread. Axis: interaction model. The Coach is the app: each day is one running conversation, and
// the things you'd tap (start, tick, food totals) are cards inside it. One frost bar at the bottom is the input, the
// listening orb and the rest timer, all in the same place.
(() => {
  const { day, workout: wo, memory, icon } = A2;

  // One bar, one orb. The three contents are always there, stacked; only their opacity and a small slide change.
  const bottom = (mode = 'input') => `<div class="t-bottom t-glass" data-layer="${mode}"><div class="tint" style="opacity:${mode === 'input' ? 0 : 1}"></div><div class="fill"></div>
    <div class="t-layer ${mode === 'input' ? 'on' : ''}" data-l="input"><span class="ph">Ask, or say what you ate or lifted</span></div>
    <div class="t-layer" data-l="listen"><span class="heard"></span><span class="t-wave">${'<i></i>'.repeat(5)}</span></div>
    <div class="t-layer ${mode === 'rest' ? 'on' : ''}" data-l="rest"><span class="clock tnum">2:30</span><span class="what"><b>Rest</b><span>Set 4, 77.5 × 8</span></span><button class="t-btn" data-press data-act="skip">Skip</button></div>
    <button class="t-orbbtn" data-press aria-label="Speak"><div class="orb"></div></button>
  </div>`;

  const morning = () => `
    <div class="t-day">${day.dateLong}, ${day.now}</div>
    <p class="t-c">Push today after work. Bench <span class="t-pill tnum">80 kg × 8</span> is the target, 2.5 kg up on last week.</p>
    <p class="t-c small">${day.morningSub}</p>
    <div class="t-card t-glass"><h4>Push at 15:30</h4><div class="sub">Bench, incline press, flys, shoulder press, triceps, raises</div>
      <div class="t-act"><button class="t-btn pri" data-press>${icon.play}Start</button><button class="t-btn" data-press>Move it</button></div></div>
    <div class="t-card t-glass"><h4>Food today</h4>
      <div class="t-totals"><div><b class="tnum">0 <small>of 2,550 kcal</small></b><span class="t-bar"><i style="width:0"></i></span></div>
      <div><b class="tnum">0 <small>of 220 g</small></b><span class="t-bar"><i style="width:0"></i></span></div>
      <div><b class="tnum">0.3 <small>of 3 l</small></b><span class="t-bar"><i style="width:10%"></i></span></div></div></div>`;

  const chip = '<button class="t-memchip t-glass" data-press data-act="memory">What I know</button>';
  // the memory tray is always there, parked above the screen, so opening it never adds a blurred layer mid-motion
  const tray = (open) => `<div class="t-scrim ${open ? '' : 'off'}"></div>
    <div class="t-tray t-glass ${open ? '' : 'parked'}"><button class="t-done" data-press data-act="close">Done</button><h3>What I know about you</h3><p class="sub">Change anything and I’ll use the new version from now on.</p>
      ${memory.map((m) => `<div class="t-mem ${m.goal ? 'goal' : ''}"><p>${m.t}${m.goal ? '' : `<small>${m.src}</small>`}</p><button data-press aria-label="Edit">${icon.edit}</button></div>`).join('')}
    </div>`;
  const shell = (inner, mode, open = false) => `<div class="t grain"><div class="t-sky"></div><div class="scr">${inner}</div>${chip}${bottom(mode)}${tray(open)}</div>`;
  const TRAY_OUT = 'translateY(calc(-100% - var(--lab-top)))';
  function wireTray(root) {
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act, t = A2.$(root, '.t-tray'), sc = A2.$(root, '.t-scrim');
      if (act === 'memory' && t.classList.contains('parked')) { t.classList.remove('parked'); sc.classList.remove('off'); A2.go(t, [{ transform: TRAY_OUT }, { transform: 'none' }], A2.calm); A2.go(sc, [{ opacity: 0 }, { opacity: 1 }], A2.calm); }
      if ((act === 'close' || e.target === sc) && !t.classList.contains('parked')) { t.classList.add('parked'); sc.classList.add('off'); A2.go(t, [{ transform: 'none' }, { transform: TRAY_OUT }], A2.quick); A2.go(sc, [{ opacity: 1 }, { opacity: 0 }], A2.quick); }
    });
  }
  const withTray = (mount) => (root) => { wireTray(root); return mount?.(root); };

  const today = () => shell(`${morning()}
    <div class="t-sugg"><button data-press>200 g skyr and two eggs</button><button data-press>Why is my row stuck?</button><button data-press>Plan my week</button></div>`);

  const setRow = (s) => `<div class="t-set ${s.done ? 'done' : ''} ${s.current ? 'cur' : ''}"><span class="n">${s.kind}</span>
      <span class="w tnum">${s.kg} kg × ${s.reps}<small>last ${s.prev}</small></span><span></span><button class="chk" data-press aria-label="Done">${icon.check}</button></div>`;
  const woCard = () => `<div class="t-card t-glass t-wo"><h4>Bench press <span class="tnum">${wo.elapsed}</span></h4>
      ${wo.exercises[0].sets.map(setRow).join('')}</div>`;
  const workout = () => shell(`
    <div class="t-day">15:37</div>
    <div class="t-rcpt t-glass"><span class="ic">${icon.check}</span><span>Push started<small>6 exercises, warm-up done</small></span></div>
    <p class="t-c">80 × 8 twice. One more and it’s your best bench yet.</p>
    ${woCard()}
    <p class="t-c small">Then incline dumbbell press, 30 kg for 3 sets of 8–10.</p>`);

  const memoryScreen = () => shell(morning(), 'input', true);

  // ── motion helpers ──
  function setLayer(root, name) {
    const bar = A2.$(root, '.t-bottom');
    if (bar.dataset.layer === name) return Promise.resolve();
    bar.dataset.layer = name;
    const tint = A2.$(bar, '.tint'), t = name === 'input' ? 0 : 1;
    A2.go(tint, [{ opacity: 1 - t }, { opacity: t }], A2.calm); tint.style.opacity = t;
    A2.orbState(A2.$(bar, '.orb'), name === 'listen' ? 'listen' : '');
    const all = A2.$$(bar, '.t-layer'), to = A2.$(bar, `[data-l="${name}"]`);
    all.forEach((l) => { if (l !== to && l.classList.contains('on')) { l.classList.remove('on'); A2.go(l, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-14px)' }], A2.quick); } });
    to.classList.add('on');
    return A2.go(to, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], A2.calm);
  }
  function rest(root, secs, next) {
    const bar = A2.$(root, '.t-bottom'), clock = A2.$(bar, '.clock'), fill = A2.$(bar, '.fill');
    if (next) A2.$(bar, '.what span').textContent = next[0].toUpperCase() + next.slice(1);
    let left = secs;
    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    clock.textContent = fmt(left);
    const drain = fill.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: secs * 1000, easing: 'linear', fill: 'forwards' });
    const t = setInterval(() => { left -= 1; clock.textContent = fmt(Math.max(0, left)); if (left <= 0) { clearInterval(t); setLayer(root, 'input'); } }, 1000);
    A2.$(bar, '[data-act="skip"]').onclick = () => { clearInterval(t); drain.cancel(); setLayer(root, 'input'); };
    return () => { clearInterval(t); drain.cancel(); };
  }
  const nextText = (row) => { const n = row.nextElementSibling; return n?.classList.contains('t-set') ? `set ${A2.$(n, '.n').textContent}, ${A2.$(n, '.w').firstChild.textContent.replace(' kg', '').trim()}` : 'incline dumbbell press, 30 × 10'; };
  function tick(row) {
    row.classList.remove('cur'); row.classList.add('done');
    A2.go(A2.$(row, '.chk'), [{ transform: 'scale(.86)' }, { transform: 'scale(1)' }], A2.calm);
    A2.go(A2.$(row, '.chk svg'), [{ transform: 'scale(.5)' }, { transform: 'scale(1)' }], A2.calm);
    const next = row.nextElementSibling;
    if (next?.classList.contains('t-set')) { next.classList.add('cur'); A2.go(next, [{ opacity: .5 }, { opacity: 1 }], A2.calm); }
    A2.buzz(18);
  }
  /** add a block at the end of the thread: it rises a little and fades in, and the thread follows it */
  function add(root, html) {
    const scr = A2.$(root, '.scr');
    scr.insertAdjacentHTML('beforeend', html);
    const el = scr.lastElementChild;
    A2.go(el, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], A2.calm);
    scr.scrollTo({ top: scr.scrollHeight, behavior: A2.reduced ? 'auto' : 'smooth' });
    return el;
  }
  /** words arrive one after another (opacity only), so the answer reads as it lands */
  async function words(el, alive) {
    const ws = A2.$$(el, '.t-word');
    for (const w of ws) { if (!alive()) return; w.style.opacity = 1; A2.go(w, [{ opacity: 0 }, { opacity: 1 }], A2.quick); await A2.wait(42); }
  }
  const wrapWords = (html) => html.replace(/(<span class="t-pill[^>]*>.*?<\/span>)|([^\s<]+)/g, (m, pill, w) => `<span class="t-word">${pill || w}</span>`);

  const mountWorkout = (root) => {
    let stop = null;
    root.addEventListener('click', (e) => {
      const chk = e.target.closest('.t-set .chk'); if (!chk) return;
      const row = chk.closest('.t-set'); if (row.classList.contains('done')) return;
      tick(row); stop?.();
      setLayer(root, 'rest'); stop = rest(root, wo.rest.total, nextText(row));
    });
    return () => stop?.();
  };

  const mountReply = (root) => {
    let alive = true; const on = () => alive;
    (async () => {
      await A2.wait(600); if (!alive) return;
      add(root, '<div class="t-me t-glass">Why is my row stuck?</div>');
      const orb = A2.$(root, '.t-bottom .orb'); A2.orbState(orb, 'think');
      await A2.wait(1100); if (!alive) return;
      A2.orbState(orb, '');
      const p = add(root, `<p class="t-c">${wrapWords('Barbell row has sat at <span class="t-pill tnum">70 kg × 8</span> for four sessions. You’re cutting and every set goes to failure, so recovery is the limit, not effort.')}</p>`);
      p.getAnimations().forEach((a) => a.cancel());
      await words(p, on); if (!alive) return;
      await A2.wait(250);
      const card = add(root, `<div class="t-card t-glass"><h4>Next pull, Thursday</h4><div class="sub">Row: keep 70 kg, aim for 9 on the first set. At 9, 9, 8 it moves to 72.5.</div>
        <div class="t-act"><button class="t-btn pri" data-press data-act="apply">Apply</button><button class="t-btn" data-press>Not now</button></div></div>`);
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-act="apply"]')) {
          // the card becomes its own receipt in place: contents cross-fade, then the frame settles to the new height
          if (card.dataset.applied) return; card.dataset.applied = '1';
          // The glass frame stays and only its visible edge closes up (clip-path), so nothing in the thread moves.
          // Its layout box keeps the old height; the space left under the receipt is breathing room above the bar.
          const h0 = card.offsetHeight;
          card.style.minHeight = h0 + 'px';
          const kids = [...card.children];
          Promise.all(kids.map((k) => A2.go(k, [{ opacity: 1 }, { opacity: 0 }], A2.quick, { fill: 'forwards' }))).then(() => {
            card.innerHTML = `<div class="t-rcpt"><span class="ic">${icon.check}</span><span>Thursday’s row target set<small>70 kg × 9, then 72.5 kg</small></span><button data-press>Undo</button></div>`;
            card.classList.add('closed'); const r = card.firstElementChild, h1 = r.offsetHeight + 12;
            card.style.setProperty('--cut', h0 - h1 + 'px');
            A2.go(card, [{ clipPath: 'inset(0 0 0 0 round 24px)' }, { clipPath: `inset(0 0 ${h0 - h1}px 0 round 24px)` }], A2.calm);
            A2.go(r, [{ opacity: 0 }, { opacity: 1 }], A2.calm);
          });
        }
      });
    })();
    return () => { alive = false; };
  };

  const mountVoice = (root) => {
    let alive = true, stopRest = null;
    const wave = () => A2.$$(root, '.t-wave i').map((b, i) => b.animate([{ transform: 'scaleY(.2)' }, { transform: `scaleY(${[.7, 1, .55, .9, .4][i]})` }, { transform: 'scaleY(.25)' }], { duration: 520 + i * 70, iterations: Infinity, easing: 'ease-in-out' }));
    const run = async () => {
      await A2.wait(700); if (!alive) return;
      const waves = wave(); // the bars answer the voice from the first frame the layer shows
      setLayer(root, 'listen'); await A2.near(A2.calm);
      const heard = A2.$(root, '.heard');
      for (const w of 'bench 80 for 8'.split(' ')) { if (!alive) return; await A2.wait(260); heard.textContent += (heard.textContent ? ' ' : '') + w; }
      await A2.wait(500); if (!alive) return;
      const vr = A2.$(root, '.t-set.cur'); const vNext = nextText(vr); tick(vr);
      add(root, `<div class="t-rcpt t-glass"><span class="ic">${icon.check}</span><span>Bench press, set 3<small>80 kg × 8, logged from your voice</small></span><button data-press>Undo</button></div>`);
      add(root, '<p class="t-c">That’s your best bench yet: 80 × 8, three times.</p>');
      setLayer(root, 'rest');
      stopRest = rest(root, wo.rest.total, vNext);
      await A2.wait(A2.quick.duration); waves.forEach((a) => a.cancel()); // only once the listening layer has faded
    };
    run();
    return () => { alive = false; stopRest?.(); };
  };

  A2.direction({
    name: 'Thread', axis: 'Interaction model: the Coach is the app',
    screens: [
      { label: 'Today', html: today, mount: withTray() },
      { label: 'Workout', html: workout, mount: withTray(mountWorkout) },
      { label: 'Memory', html: memoryScreen, mount: withTray() },
      { label: '★ Reply', html: () => shell(morning()), mount: withTray(mountReply) },
      { label: '★ Voice log', html: workout, mount: withTray(mountVoice) },
    ],
  });
})();
