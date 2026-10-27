// Direction 4, Headline. Axis: personality through type. Each screen is one sentence the Coach would say, set big,
// with the numbers inside it as pills. Under it, only what supports the sentence; one action sits at the thumb.
(() => {
  const { day, workout: wo, memory, icon } = A2;
  const shell = (inner, cta) => `<div class="hl grain"><div class="h-sky"></div><div class="scr">${inner}</div>${cta}</div>`;
  const orbBtn = '<button class="h-orbbtn h-glass" data-press aria-label="Talk to the Coach"><div class="orb"></div></button>';

  const today = () => shell(`
    <div class="h-date">${day.dateLong}</div>
    <h1 class="h-big">Push after work. Bench <span class="h-num tnum">80 × 8</span> is the target, 2.5 kg up on last week.</h1>
    <p class="h-sub">${day.morningSub}</p>
    <div class="h-facts">
      <div><span>Push at 15:30</span><span>6 exercises, 1 hour</span></div>
      <div><span>Food</span><span class="tnum">0 of 2,550 kcal, 0 of 220 g protein</span></div>
      <div><span>Water</span><span class="tnum">0.3 of 3 l</span></div>
      <div><span>Sleep</span><span class="tnum">6 h 41, your usual</span></div>
    </div>`,
    `<div class="h-cta"><button class="h-go" data-press>${icon.play}Start push</button>${orbBtn}</div>`);

  const woInner = () => `
    <div class="h-ex">Bench press, set 3 of 4</div>
    <div class="h-stack"><h1 class="h-big"><span class="h-num tnum">80 kg</span> for <span class="h-nw"><span class="h-num tnum">8</span>.</span> You did 7 at 77.5 last time.</h1></div>
    <div class="h-setline"><i class="done"></i><i class="done"></i><i class="cur"></i><i></i></div>
    <div class="h-edit"><button class="h-glass" data-press><b class="tnum">80</b> kg</button><button class="h-glass" data-press><b class="tnum">8</b> reps</button></div>
    <div class="h-list">
      <div><b>Incline dumbbell press</b><span>3 × 8–10 at 30 kg</span></div>
      <div><b>Cable fly</b><span>3 × 12 at 15 kg</span></div>
      <div><b>Shoulder press</b><span>3 × 8–10 at 50 kg</span></div>
      <div><b>Triceps and raises</b><span>6 sets</span></div>
    </div>`;
  const workout = () => shell(woInner(), `<div class="h-cta"><button class="h-go" data-press data-act="done">${icon.check}Done</button></div>`);

  const record = () => shell(`<div class="h-rec">${woInner()}</div>`, `<div class="h-cta"><button class="h-go" data-press data-act="done">${icon.check}Done</button></div>`);

  const finish = () => shell(`
    <div class="h-date">Push, finished 16:34</div>
    <h1 class="h-big">Best bench yet, and every lift held while you’re cutting.</h1>
    <div class="h-stats"><div class="h-glass"><b class="tnum" data-n="64">0</b><span>minutes</span></div><div class="h-glass"><b class="tnum" data-n="14820">0</b><span>kg moved</span></div><div class="h-glass"><b class="tnum" data-n="22">0</b><span>sets</span></div></div>
    <div class="h-next h-glass"><span>Next push, Friday</span><b>Bench 80 × 9 on the first set, then 82.5</b></div>
    <div class="h-next h-glass"><span>Tonight</span><b>130 g protein still to go</b></div>`,
    `<div class="h-cta"><button class="h-go" data-press>Save</button></div>`);

  const coach = () => shell(`
    <div class="h-q h-glass">why is my row stuck?</div>
    <h1 class="h-big">Row has sat at <span class="h-num tnum">70 × 8</span> for four sessions. On a cut, with every set to failure, recovery is the limit.</h1>
    <p class="h-sub">Next pull: keep 70 and go for 9 on the first set. At 9, 9, 8 it moves to 72.5.</p>
    <p class="h-label">What I know about you. Tap anything to change it.</p>
    <p class="h-mem">You work <button data-press>split shifts</button> and train around <button data-press>15:30</button>. You wrestle <button data-press>Monday and Wednesday</button>. Almost every set goes <button data-press>to failure</button>, so I never tell you to go lighter. You’re cutting to <button data-press>90 kg by 31 January</button>, and the hard part is <button data-press>snacking after 21:00</button>.</p>`,
    `<div class="h-cta"><button class="h-go h-glass" style="background:var(--glass);color:var(--ink2);justify-content:flex-start;padding-left:22px" data-press>Ask the Coach</button>${orbBtn}</div>`);

  const mountRecord = (root) => {
    let alive = true;
    let fired = false;
    const doRecord = async () => {
      if (fired) return false; fired = true;
      const scr = A2.$(root, '.scr');
      A2.buzz([20, 40, 60]);
      const old = A2.$(scr, '.h-rec');
      // fade each piece on its own (never the parent of a glass button, which would stop its blur mid-fade)
      const outs = A2.$$(old, ':scope > :not(.h-edit), .h-edit > button');
      await Promise.all(outs.map((el) => A2.go(el, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px)' }], A2.quick, { fill: 'forwards' }))); if (!alive) return false;
      old.innerHTML = `<div class="h-ex">Bench press, set 3</div><h1 class="h-big">Best bench yet.</h1>
        <div class="h-gold tnum"><span class="num">80 × 8<span class="shine" aria-hidden="true">80 × 8</span></span><small>× 3 sets</small></div>
        <p class="h-sub">Two months ago your top set was 72.5 × 7. Rest 2:30, then set 4 at 77.5.</p>`;
      A2.$$(old, ':scope > :not(.h-gold)').forEach((el, i) => A2.go(el, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], A2.calm, { delay: i * 50, fill: 'backwards' }));
      A2.go(A2.$(old, '.h-gold'), [{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], A2.slow, { delay: 120, fill: 'backwards' });
      // the glint is clipped to the digits themselves, and runs once
      A2.go(A2.$(old, '.shine'), [{ backgroundPosition: '160% 0' }, { backgroundPosition: '-60% 0' }], A2.spring(1, 1.1), { delay: 480, fill: 'backwards' });
      return true;
    };
    let stopRest = null;
    root.addEventListener('click', (e) => { if (e.target.closest('[data-act="done"]')) doRecord().then((ok) => { if (ok && alive) stopRest = restBar(A2.$(root, '.h-cta')); }); });
    return () => { alive = false; stopRest?.(); };
  };
  /** the Done button turns into the rest bar in the same place; the clock counts, the fill drains on the compositor */
  function restBar(cta, next = 'set 4, 77.5 × 8') {
    cta.innerHTML = `<div class="h-rest h-glass" style="position:relative;left:0;right:0;bottom:0;flex:1"><span class="fill"></span><span class="clock tnum">2:30</span><span class="w">Next: ${next}</span><button data-press data-act="skip">Skip</button></div>`;
    const bar = cta.firstElementChild, clock = A2.$(bar, '.clock');
    A2.go(bar, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], A2.calm);
    const drain = A2.$(bar, '.fill').animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 150000, easing: 'linear', fill: 'forwards' });
    let left = 150;
    const t = setInterval(() => { left--; clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; if (left <= 0) clearInterval(t); }, 1000);
    A2.$(bar, '[data-act="skip"]').onclick = () => { clearInterval(t); drain.cancel(); clock.textContent = 'Go'; A2.$(bar, '.w').textContent = next; };
    return () => { clearInterval(t); drain.cancel(); };
  }
  const mountWorkout = (root) => {
    let stopRest = null;
    root.addEventListener('click', (e) => {
      if (!e.target.closest('[data-act="done"]')) return;
      const bars = A2.$$(root, '.h-setline i'); const c = bars.findIndex((b) => b.classList.contains('cur'));
      if (c < 0) return;
      bars[c].className = 'done'; if (bars[c + 1]) bars[c + 1].className = 'cur';
      A2.buzz(18);
      // the new sentence cross-fades over the old one in the same grid cell; the cell keeps its height, so nothing below moves
      const big = A2.$(root, '.h-big'), stack = big.parentElement;
      const nb = big.cloneNode(); nb.innerHTML = '<span class="h-num tnum">77.5 kg</span> for <span class="h-nw"><span class="h-num tnum">8</span>.</span> Last set of bench, then incline.';
      stack.appendChild(nb);
      stack.style.minHeight = stack.offsetHeight + 'px';
      A2.$(root, '.h-ex').textContent = 'Bench press, set 4 of 4, after 2:30 rest';
      A2.$(root, '.h-edit b').textContent = '77.5';
      A2.go(nb, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], A2.calm);
      A2.go(big, [{ opacity: 1 }, { opacity: 0 }], A2.quick, { fill: 'forwards' }).then(() => big.remove());
      stopRest?.(); stopRest = restBar(A2.$(root, '.h-cta'));
    });
    return () => stopRest?.();
  };
  const mountFinish = (root) => {
    A2.$$(root, '[data-n]').forEach((el, i) => setTimeout(() => A2.count(el, +el.dataset.n), 250 + i * 90));
    A2.$$(root, '.h-next').forEach((el, i) => A2.go(el, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], A2.calm, { delay: 700 + i * 90, fill: 'backwards' }));
  };

  A2.direction({
    name: 'Headline', axis: 'Focus: one thing per screen, said in one big sentence',
    screens: [
      { label: 'Today', html: today },
      { label: 'Workout', html: workout, mount: mountWorkout },
      { label: 'Coach', html: coach },
      { label: '★ Record', html: record, mount: mountRecord },
      { label: '★ Finish', html: finish, mount: mountFinish },
    ],
  });
})();
