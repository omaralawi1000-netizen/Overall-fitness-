// Direction 1, Frost. Axis: structure. The calm native app: large titles, a few frosted cards, a three-tab dock and
// the orb. Nothing new to learn; the bet is that perfect execution of the familiar beats novelty.
(() => {
  const { day, workout: wo, memory, chat, icon } = A2;

  const ring = (p, label, val) => {
    const r = 26, c = 2 * Math.PI * r;
    return `<div class="f-ring"><svg viewBox="0 0 64 64"><circle class="bg" cx="32" cy="32" r="${r}"/><circle class="fg" cx="32" cy="32" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/></svg><b class="tnum">${val}</b><i>${label}</i></div>`;
  };
  const dock = (at) => `<nav class="f-dock">
    <div class="f-tabs f-glass">
      <button class="f-tab" data-press ${at === 0 ? 'aria-current="page"' : ''}>${icon.today}Today</button>
      <button class="f-tab" data-press ${at === 1 ? 'aria-current="page"' : ''}>${icon.train}Train</button>
      <button class="f-tab" data-press ${at === 2 ? 'aria-current="page"' : ''}>${icon.food}Food</button>
    </div>
    <button class="f-orbbtn f-glass" data-press aria-label="Talk to the Coach"><div class="orb"></div></button>
  </nav>`;

  const today = () => `<div class="f grain"><div class="f-sky"></div><div class="scr">
    <div class="f-date">${day.dateLong}</div>
    <h1 class="f-title">Good morning, ${day.name}</h1>
    <section class="f-coach f-glass"><div class="orb"></div><p>Push today after work. Bench <span class="f-pill tnum">80 kg × 8</span> is the target, 2.5 kg up on last week.<small>${day.morningSub}</small></p></section>
    <section class="f-train f-glass"><h3>Push</h3><span>${day.plan.at}, 6 exercises, 1 h</span>
      <button class="f-start" data-press>${icon.play}Start</button></section>
    <section class="f-glass" style="margin-top:12px">
      <div class="f-rings" style="margin:0">${ring(0, 'of 2,550 kcal', '0')}${ring(0, 'of 220 g protein', '0 g')}${ring(0.1, 'of 3 l water', '0.3 l')}</div>
      <div class="f-week" style="margin:0;box-shadow:inset 0 1px 0 var(--line)">${day.week.map((w) => `<div class="${w.done ? 'done' : ''} ${w.today ? 'today' : ''}"><b>${w.d}</b><span class="dot"></span>${w.kind === 'Wrestling' ? 'Wrestle' : w.kind}</div>`).join('')}</div>
    </section>
  </div>${dock(0)}</div>`;

  const row = (s, i) => `<div class="f-row ${s.done ? 'done' : ''} ${s.current ? 'cur' : ''}" data-i="${i}">
      <span class="n">${s.kind}</span><span class="p tnum">${s.prev}</span>
      <span class="v tnum">${s.kg}<small>kg</small></span><span class="v tnum">${s.reps}<small>reps</small></span>
      <button class="f-chk" data-press aria-label="Done">${icon.check}</button><span class="gain">${gain(s)}</span></div>`;
  const workoutHtml = (restLeft) => `<div class="f grain"><div class="f-sky"></div><div class="scr">
    <div class="f-wohead"><h1>Push</h1><span class="f-time tnum">${wo.elapsed}</span></div>
    <div class="f-prog"><i></i></div>
    ${wo.exercises.map((e, k) => `<section class="f-ex f-glass"><h3>${e.name}</h3><div class="note">${e.note}</div>
      ${k === 0 ? '<div class="f-hint">80 × 8 twice. One more and it’s your best bench yet.</div>' : ''}
      ${e.sets.map(row).join('')}</section>`).join('')}
  </div>
  <div class="f-rest f-glass ${restLeft == null ? 'parked' : ''}"><div class="tint"></div><div class="fill"></div>
    <span class="clock tnum">${restLeft == null ? '' : fmt(restLeft)}</span>
    <span class="what"><b>Rest</b><span></span></span>
    <span class="btns"><button data-press data-act="add">+30 s</button><button data-press data-act="skip">Skip</button></span></div>
  </div>`;
  /** what beats last time, or nothing: compares the set with the same set last session */
  const gain = (s) => { const [pk, pr] = s.prev.split(' × ').map(Number); if (s.kg > pk) return `+${s.kg - pk} kg`; if (s.kg === pk && s.reps > pr) return `+${s.reps - pr} rep${s.reps - pr > 1 ? 's' : ''}`; return ''; };
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /** the rest bar: fill drains on the compositor (scaleX), the clock text changes once a second */
  function runRest(root, from, total, next) {
    const bar = A2.$(root, '.f-rest'), clock = A2.$(bar, '.clock'), fill = A2.$(bar, '.fill');
    let left = from, timer, drain;
    const startDrain = () => { drain?.cancel(); drain = fill.animate([{ transform: `scaleX(${left / total})` }, { transform: 'scaleX(0)' }], { duration: left * 1000, easing: 'linear', fill: 'forwards' }); };
    const paint = () => {
      if (left <= 3 && left > 0) {
        clock.innerHTML = `<span class="digit">${fmt(left)}</span>`;
        A2.go(A2.$(clock, '.digit'), [{ opacity: 0.5, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], A2.quick);
        A2.buzz(28);
      } else clock.textContent = fmt(left);
    };
    A2.$(bar, '.what').innerHTML = `<b>Rest</b><span>Next: ${next.split(', ').slice(1).join(', ')}</span>`;
    bar.classList.remove('go');
    A2.$(bar, '.btns').innerHTML = '<button data-press data-act="add">+30 s</button><button data-press data-act="skip">Skip</button>';
    paint(); startDrain();
    timer = setInterval(() => {
      left -= 1;
      if (left <= 0) { clearInterval(timer); go(); return; }
      paint();
    }, 1000);
    const go = () => {
      bar.classList.add('go');
      A2.go(A2.$(bar, '.tint'), [{ opacity: 0 }, { opacity: 1 }], A2.calm);
      clock.textContent = 'Go';
      A2.$(bar, '.what').innerHTML = `<b>${next.split(':')[0]}</b><span>${next.split(': ')[1]}</span>`;
      A2.$(bar, '.btns').innerHTML = '<button data-press data-act="close">Done</button>';
      A2.go(clock, [{ transform: 'scale(.86)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], A2.calm);
      A2.buzz([40, 60, 40]);
    };
    bar.onclick = (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'add') { left += 30; total = Math.max(total, left); startDrain(); paint(); }
      if (act === 'skip') { clearInterval(timer); drain?.cancel(); left = 0; go(); }
      if (act === 'close') hideRest(root);
    };
    return () => { clearInterval(timer); drain?.cancel(); };
  }
  // The bar always exists (its blurred layer never appears or vanishes mid-motion, LESSONS 3); it parks below the screen.
  // Showing or hiding while it moves turns it round from where it is.
  const PARK = 'translateY(calc(100% + 24px))';
  const showRest = (root) => {
    const bar = A2.$(root, '.f-rest'); if (!bar.classList.contains('parked')) return;
    bar.classList.remove('parked');
    A2.go(bar, [{ transform: PARK }, { transform: 'none' }], A2.calm);
  };
  const hideRest = (root) => {
    const bar = A2.$(root, '.f-rest'); if (bar.classList.contains('parked')) return;
    bar.classList.add('parked');
    A2.go(bar, [{ transform: 'none' }, { transform: PARK }], A2.quick);
  };

  // ticking the current set: the check fills on the next frame, the gain rises, the rest bar arrives from below
  const mountWorkout = (root) => {
    let stop = null;
    root.addEventListener('click', (e) => {
      const chk = e.target.closest('.f-chk'); if (!chk) return;
      const r = chk.closest('.f-row'); if (r.classList.contains('done')) return;
      r.classList.remove('cur'); r.classList.add('done');
      // the ice fill the set had becomes the quiet done fill: no empty frame in between
      A2.go(chk, [{ backgroundColor: '#bfe0ff' }, { backgroundColor: 'rgba(242, 245, 250, .16)' }], A2.calm, { pseudoElement: '::before' });
      A2.go(A2.$(chk, 'svg'), [{ transform: 'scale(.7)', color: '#06121f' }, { transform: 'none', color: '#f2f5fa' }], A2.calm);
      A2.buzz(18);
      const gainEl = A2.$(r, '.gain');
      if (gainEl.textContent) A2.go(gainEl, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(-4px)' }], A2.calm, { fill: 'forwards' })
        .then((done) => done && A2.wait(350)).then(() => A2.go(gainEl, [{ opacity: 1, transform: 'translateY(-4px)' }, { opacity: 0, transform: 'translateY(-10px)' }], A2.slow));
      const next = r.nextElementSibling;
      if (next?.classList.contains('f-row')) {
        next.classList.add('cur');
        A2.go(next, [{ opacity: 0.4 }, { opacity: 1 }], A2.calm);
      }
      stop?.();
      showRest(root);
      const nx = next?.classList.contains('f-row') ? `${r.closest('.f-ex').querySelector('h3').textContent}, set ${A2.$(next, '.n').textContent}: ${A2.$$(next, '.v')[0].textContent.replace('kg', '')} × ${A2.$$(next, '.v')[1].textContent.replace('reps', '')}` : 'Incline dumbbell press, set 1: 30 × 10';
      stop = runRest(root, wo.rest.total, wo.rest.total, nx);
    });
    return () => stop?.();
  };

  const coach = () => `<div class="f grain"><div class="f-sky"></div><div class="scr">
    <div class="f-coachtop"><div class="orb"></div><h1>Coach</h1><p>Ask anything, or tell me what you ate or lifted.</p></div>
    <div class="f-bub me">${chat[0].t}</div>
    <div class="f-bub coach f-glass"><p>Barbell row has sat at <span class="f-pill tnum">${chat[1].pill}</span> for four sessions. You’re cutting and every set goes to failure, so recovery is the limit, not effort.</p><p>${chat[1].then}</p></div>
    <div class="f-sec">What I know about you<button data-press>Edit</button></div>
    <div class="f-mem f-glass">${memory.map((m) => `<div class="${m.goal ? 'goal' : ''}"><b>${m.t}</b><span>${m.src}</span></div>`).join('')}</div>
  </div>
  <div class="f-ask f-glass"><span>Message the Coach</span><button data-press aria-label="Speak">${icon.mic}</button></div></div>`;

  A2.direction({
    name: 'Frost', axis: 'Structure: the familiar native app, perfected',
    screens: [
      { label: 'Today', html: today },
      { label: 'Workout', html: () => workoutHtml(null), mount: mountWorkout },
      { label: 'Coach', html: coach },
      { label: '★ Tick', html: () => workoutHtml(null), mount: mountWorkout },
      { label: '★ Rest', html: () => workoutHtml(6), mount: (root) => {
        const stopW = mountWorkout(root);
        const stopR = runRest(root, 6, wo.rest.total, wo.rest.next);
        return () => { stopW(); stopR(); };
      } },
    ],
  });
})();
