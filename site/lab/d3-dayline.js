// Direction 3, Timeline. Axis: a new way to see your training. The day is one vertical line of time: what happened
// is filled in above the playhead, what's planned waits below it, and the Coach speaks at "now". Training history is a
// curve you scrub with your thumb under a glass lens.
(() => {
  const { day, workout: wo, memory, icon } = A2;

  const week = () => `<div class="d-week">${day.week.map((w, i) => `<div class="${w.today ? 'on' : ''} ${w.done ? 'done' : ''}"><b>${[26, 27, 28, 29, 30, 31, 1][i]}</b>${w.d === 'T' && w.today ? 'Today' : w.kind === 'Wrestling' ? 'Wrestle' : w.kind}</div>`).join('')}</div>`;
  const item = (h, title, sub, cls = '') => `<div class="d-item ${cls}"><span class="h tnum">${h}</span><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
  const nowCard = (inner, at = day.now) => `<div class="d-now"><span class="h tnum">${at}</span><span class="ph"></span>${inner}</div>`;

  const today = () => `<div class="d grain"><div class="d-sky"></div><div class="scr">
    <div class="d-head"><h1>Today</h1><span>${day.dateShort}</span></div>
    ${week()}
    <div class="d-line"><span class="d-axis"></span><span class="d-past" style="height:90px"></span>
      ${item('05:50', 'Woke up', '6 h 41 of sleep, your usual', 'past')}
      ${nowCard(`<div class="d-nowcard d-glass"><div class="orb"></div><p>Push after work. Bench <span class="d-pill tnum">80 kg × 8</span> is the target, 2.5 kg up on last week.<small>Down 0.4 kg this week, on pace for 90 kg by 31 January.</small></p></div>`)}
      ${item('07:00', 'Work', 'Until 08:30', 'block quiet')}
      ${item('09:00', 'Breakfast', 'Aim for about 45 g protein', 'quiet')}
      ${item('12:30', 'Work', 'Until 14:45', 'block quiet')}
      <div class="d-item"><span class="h tnum">15:30</span><div class="d-train d-glass"><div><b>Push</b><span>6 exercises, about 1 hour</span></div><button class="d-btn pri" data-press>${icon.play}Start</button></div></div>
      ${item('19:00', 'Dinner', '2,550 kcal and 220 g protein for the day', 'quiet')}
      ${item('22:30', 'Bed', 'For 7 hours before tomorrow’s wrestling', 'quiet')}
    </div></div><div class="d-ask d-glass"><span>Ask the Coach</span><div class="orb"></div></div></div>`;

  const sets = (e, k) => `<div class="d-sets">${e.sets.map((s, i) => `<button class="d-s ${s.done ? 'done' : ''} ${s.current ? 'cur' : ''}" data-press data-k="${k}" data-i="${i}" data-kind="${s.kind}"><span class="tnum">${s.kg} × ${s.reps}</span><small>${s.kind === 'W' ? 'warm-up' : s.current ? 'tap when done' : 'set ' + s.kind}</small></button>`).join('')}</div>`;
  const workout = () => `<div class="d grain"><div class="d-sky"></div><div class="scr">
    <div class="d-head"><h1>Push</h1><span class="tnum">${wo.elapsed}</span></div>
    <div class="d-line"><span class="d-axis"></span><span class="d-past" style="height:100%;transform:scaleY(.34)"></span>
      ${item('15:30', 'Started', 'Warm-up done', 'past')}
      <div class="d-ex"><span class="h"></span><h3>Bench press</h3><div class="sub">80 × 8 twice. One more and it’s your best bench yet.</div>${sets(wo.exercises[0], 0)}</div>
      <div class="d-rest" data-state="idle"><span class="seg"></span><span class="tip"></span>
        <div class="txt"><b class="clock tnum">2:30</b><span class="lbl">Rest between sets</span></div><button class="d-btn sm" data-press data-act="skip">Skip</button></div>
      <div class="d-ex todo"><h3>Incline dumbbell press</h3><div class="sub">${wo.exercises[1].note}</div>${sets(wo.exercises[1], 1)}</div>
      <div class="d-ex todo"><h3>Cable fly</h3><div class="sub">${wo.exercises[2].note}</div></div>
      <div class="d-ex todo"><h3>Shoulder press, triceps, raises</h3><div class="sub">About 25 minutes</div></div>
      ${item('16:32', 'Done', 'If you keep this pace', 'quiet')}
    </div></div>
  </div>`;

  const coach = () => `<div class="d grain"><div class="d-sky"></div><div class="scr">
    <div class="d-head"><h1>Coach</h1><span>${day.dateShort}</span></div>
    <div class="d-line"><span class="d-axis"></span><span class="d-past" style="height:40px"></span>
      ${item('20:04', 'You asked', 'Why is my row stuck?', 'past')}
      ${nowCard(`<div class="d-nowcard d-glass"><div class="orb"></div><p>Barbell row has sat at <span class="d-pill tnum">70 kg × 8</span> for four sessions. You’re cutting and every set goes to failure, so recovery is the limit.<small>Next pull: keep 70 and go for 9 on the first set. At 9, 9, 8 it moves to 72.5.</small></p></div>`, '20:05')}
      <div class="d-item"><span class="h tnum">Thu</span><div class="d-train d-glass"><div><b>Pull</b><span>Row target 70 kg × 9</span></div><button class="d-btn pri" data-press data-act="apply">Apply</button></div></div>
    </div>
    <div class="d-sec">What I know about you</div>
    <div class="d-mem d-glass">${memory.map((m) => `<div><b>${m.t}</b><span>${m.src}</span></div>`).join('')}</div>
  </div><div class="d-ask d-glass"><span>Ask the Coach</span><div class="orb"></div></div></div>`;

  // bench press top sets, Aug → today
  const hist = [['4 Aug', 70, 8], ['11 Aug', 70, 8], ['18 Aug', 72.5, 7], ['25 Aug', 72.5, 8], ['1 Sep', 75, 7], ['8 Sep', 75, 8], ['15 Sep', 75, 8], ['22 Sep', 77.5, 6], ['29 Sep', 77.5, 7], ['6 Oct', 77.5, 8], ['20 Oct', 77.5, 8], ['Today', 80, 8]];
  const e1 = (kg, r) => kg * (1 + r / 30);
  const scrub = () => `<div class="d grain"><div class="d-sky"></div><div class="scr">
    <div class="d-head"><h1>Bench press</h1><span>12 weeks</span></div>
    <p class="d-cap">Drag along the line. Your strength, from your top set each session.</p>
    <div class="d-chart"><svg></svg><span class="d-cursor"></span><span class="d-dot"></span><div class="d-lens d-glass"><b class="tnum"></b><span></span></div></div>
    <p class="d-cap" style="margin-top:14px">Up 10 kg on the bar since August, while losing 3.4 kg. That’s what a good cut looks like.</p>
  </div></div>`;

  const mountScrub = (root) => {
    const box = A2.$(root, '.d-chart'), svg = A2.$(box, 'svg'), lens = A2.$(box, '.d-lens'), dot = A2.$(box, '.d-dot'), cur = A2.$(box, '.d-cursor');
    const W = box.clientWidth, H = box.clientHeight, padX = 28, top = 96, bot = H - 34;
    const vals = hist.map(([, kg, r]) => e1(kg, r)), lo = Math.min(...vals) - 2, hi = Math.max(...vals) + 2;
    const pts = vals.map((v, i) => [padX + (i * (W - 2 * padX)) / (vals.length - 1), bot - ((v - lo) / (hi - lo)) * (bot - top)]);
    const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    svg.innerHTML = `<defs><linearGradient id="dg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="rgb(180,168,255)" stop-opacity=".22"/><stop offset="1" stop-color="rgb(180,168,255)" stop-opacity="0"/></linearGradient></defs>
      <path d="${path} L ${pts.at(-1)[0]} ${bot} L ${pts[0][0]} ${bot} Z" fill="url(#dg)"/>
      <path d="${path}" fill="none" stroke="rgba(180,168,255,.9)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="rgba(241,240,250,.5)"/>`).join('')}
      <line x1="${padX}" x2="${W - padX}" y1="${bot}" y2="${bot}" stroke="rgba(255,255,255,.08)"/>
      <text x="${padX}" y="${bot + 22}" fill="rgba(232,230,250,.34)" font-size="12">Aug</text><text x="${W / 2}" y="${bot + 22}" fill="rgba(232,230,250,.34)" font-size="12" text-anchor="middle">Sep</text><text x="${W - padX}" y="${bot + 22}" fill="rgba(232,230,250,.34)" font-size="12" text-anchor="end">Oct</text>`;
    let x = pts.at(-1)[0], anim = null;
    const yAt = (x) => { const f = Math.max(0, Math.min(pts.length - 1, ((x - padX) / (W - 2 * padX)) * (pts.length - 1))); const i = Math.min(pts.length - 2, Math.floor(f)); const t = f - i; return { y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t, i: Math.round(f) }; };
    const paint = (nx) => {
      x = Math.max(padX, Math.min(W - padX, nx));
      const { y, i } = yAt(x);
      dot.style.transform = `translate(${x}px, ${y}px)`;
      cur.style.transform = `translateX(${x}px)`;
      lens.style.transform = `translate(${Math.max(82, Math.min(W - 82, x))}px, 0)`;
      const [d, kg, r] = hist[i];
      A2.$(lens, 'b').textContent = `${kg} × ${r}`; A2.$(lens, 'span').textContent = d;
    };
    paint(x);
    // release: project where the throw would carry the lens (Apple's projection), snap to the session nearest that,
    // and settle there on the calm spring starting at the finger's own speed
    const settle = (v) => {
      const proj = x + (v / 1000) * 0.99 / (1 - 0.99);
      const { i } = yAt(Math.max(padX, Math.min(W - padX, proj))), from = x, to = pts[i][0], t0 = performance.now(), T = A2.calm.duration / 1000;
      const step = (t) => { const s = Math.min(T, (t - t0) / 1000); paint(s >= T ? to : A2.settleAt(from, to, v, s)); if (s < T) anim = requestAnimationFrame(step); };
      cancelAnimationFrame(anim); anim = requestAnimationFrame(step);
    };
    const hist2 = [];
    let grab = null;
    // the lens lifts a little while held: its own `scale` property, so the drag keeps writing `transform` freely
    box.addEventListener('pointerdown', (e) => { cancelAnimationFrame(anim); box.setPointerCapture(e.pointerId); grab = e.clientX - box.getBoundingClientRect().left - x; hist2.length = 0; A2.go(lens, [{ scale: '1' }, { scale: '1.04' }], A2.quick, { fill: 'forwards' }); });
    box.addEventListener('pointermove', (e) => { if (grab == null) return; const nx = e.clientX - box.getBoundingClientRect().left - grab; const before = yAt(x).i; paint(nx); hist2.push([e.timeStamp, x]); if (hist2.length > 5) hist2.shift(); if (yAt(x).i !== before) A2.buzz(6); });
    const end = () => {
      if (grab == null) return; grab = null;
      const recent = hist2.filter((h) => performance.now() - h[0] < 100), a = recent[0], b = recent.at(-1), v = a && b && b[0] > a[0] ? ((b[1] - a[1]) / (b[0] - a[0])) * 1000 : 0;
      A2.go(lens, [{ scale: '1.04' }, { scale: '1' }], A2.calm);
      settle(Math.max(-3000, Math.min(3000, v)));
    };
    box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
    return () => cancelAnimationFrame(anim);
  };

  const mountMorning = (root) => {
    // each child is faded on its own (never a parent of a glass card, which would stop its blur mid-fade)
    const past = A2.$(root, '.d-past'), items = A2.$$(root, '.d-head, .d-week div, .d-item > *, .d-now > :not(.ph)');
    if (A2.reduced) return;
    items.forEach((el, i) => A2.go(el, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], A2.calm, { delay: 60 + i * 38, fill: 'backwards' }));
    // the dots and block bars on the line are pseudo-elements: they arrive with their row
    A2.$$(root, '.d-item').forEach((el) => { const i = items.indexOf(el.firstElementChild); for (const pe of ['::before', '::after']) A2.go(el, [{ opacity: 0 }, { opacity: 1 }], A2.calm, { pseudoElement: pe, delay: 60 + i * 38, fill: 'backwards' }); });
    A2.go(A2.$(root, '.d-axis'), [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], A2.slow, { delay: 80, fill: 'backwards' });
    A2.go(past, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], A2.slow, { delay: 260, fill: 'backwards' });
    const ph = A2.$(root, '.ph');
    A2.go(ph, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], A2.calm, { delay: 520, fill: 'backwards' });
  };

  // Rest is time on the line: a violet segment fills down from the set you just did, with a dot at "now" on its tip.
  // The block is always there (quiet between rests), so nothing appears, vanishes or pushes the list.
  const mountWorkout = (root) => {
    let t = null, anims = [], idle = null;
    const blk = A2.$(root, '.d-rest'), clock = A2.$(blk, '.clock'), lbl = A2.$(blk, '.lbl'), seg = A2.$(blk, '.seg'), tip = A2.$(blk, '.tip');
    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const swap = (el, text) => { el.textContent = text; A2.go(el, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], A2.quick); };
    const toIdle = () => {
      clearInterval(t); clearTimeout(idle); blk.dataset.state = 'idle';
      anims.forEach((a) => a.pause());
      A2.go(seg, [{ opacity: 1 }, { opacity: 0 }], A2.quick, { fill: 'forwards' }); A2.go(tip, [{ opacity: 1 }, { opacity: 0 }], A2.quick, { fill: 'forwards' });
      swap(clock, '2:30'); swap(lbl, 'Rest between sets');
    };
    const go = (next) => { clearInterval(t); blk.dataset.state = 'go'; swap(clock, 'Go'); swap(lbl, next); A2.buzz([40, 60, 40]); idle = setTimeout(toIdle, 2500); };
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="skip"]')) { if (blk.dataset.state === 'rest') toIdle(); return; }
      const b = e.target.closest('.d-s.cur'); if (!b) return;
      b.classList.remove('cur'); b.classList.add('done'); A2.$(b, 'small').textContent = b.dataset.kind === 'W' ? 'warm-up' : 'set ' + b.dataset.kind;
      A2.go(b, [{ transform: 'scale(.94)' }, { transform: 'none' }], A2.calm); A2.buzz(18);
      const nx = b.nextElementSibling;
      if (nx) { nx.classList.add('cur'); A2.$(nx, 'small').textContent = 'tap when done'; A2.go(nx, [{ opacity: .5 }, { opacity: 1 }], A2.calm); }
      const sub = A2.$(b.closest('.d-ex'), '.sub');
      if (b.dataset.kind === '3' && sub) swap(sub, 'Best bench yet: 80 × 8, three times.');
      const next = nx ? `Set ${nx.dataset.kind}, ${A2.$(nx, 'span').textContent}` : 'Incline dumbbell press';
      clearTimeout(idle); clearInterval(t); anims.forEach((a) => a.cancel());
      let left = wo.rest.total; blk.dataset.state = 'rest';
      clock.textContent = fmt(left); swap(lbl, `until ${next[0].toLowerCase() + next.slice(1)}`);
      const ms = left * 1000;
      seg.getAnimations().forEach((a) => a.cancel()); tip.getAnimations().forEach((a) => a.cancel());
      anims = [seg.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: ms, easing: 'linear', fill: 'forwards' }),
        tip.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(120px)' }], { duration: ms, easing: 'linear', fill: 'forwards' })];
      A2.go(tip, [{ opacity: 0 }, { opacity: 1 }], A2.calm);
      t = setInterval(() => { left--; if (left <= 0) go(next); else clock.textContent = fmt(left); }, 1000);
    });
    return () => { clearInterval(t); clearTimeout(idle); };
  };

  A2.direction({
    name: 'Timeline', axis: 'Seeing: your training as time',
    screens: [
      { label: 'Today', html: today },
      { label: 'Workout', html: workout, mount: mountWorkout },
      { label: 'Coach', html: coach },
      { label: '★ Morning', html: today, mount: mountMorning },
      { label: '★ Tick', html: workout, mount: mountWorkout },
      { label: 'History', html: scrub, mount: mountScrub },
    ],
  });
})();
