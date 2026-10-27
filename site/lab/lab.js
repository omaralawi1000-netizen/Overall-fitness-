// Aven 2 lab harness: springs, small helpers, the direction picker (PICKER.md contract) and the screen bar.
// Each direction file calls A2.direction({ name, axis, screens: [{ label, html(), mount?(root) }] }).
// Storage: only the URL (?v=, &s=) and sessionStorage under "a2lab:" (never an "aven…" key).
(() => {
  const A2 = (window.A2 = { dirs: [] });

  // ── Springs (Apple's damping + response) baked into CSS linear() so the browser runs them at 120 Hz ──
  const cache = new Map();
  A2.spring = (zeta = 1, response = 0.4) => {
    const key = zeta + '/' + response;
    if (cache.has(key)) return cache.get(key);
    const w0 = (2 * Math.PI) / response;
    const x = (t) => {
      if (zeta >= 1) return 1 - (1 + w0 * t) * Math.exp(-w0 * t);
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
    };
    let T = 0.05;
    for (let t = 0; t < 4; t += 0.004) { if (Math.abs(1 - x(t)) > 0.001) T = t; }
    T += 0.02;
    const n = 48, pts = [];
    for (let i = 0; i <= n; i++) pts.push(i === n ? '1' : x((T * i) / n).toFixed(4));
    const s = { easing: `linear(${pts.join(', ')})`, duration: Math.round(T * 1000) };
    cache.set(key, s);
    return s;
  };
  // the shared set (DESIGN.md will own these): calm = no overshoot; flick = only after a gesture with velocity
  A2.calm = A2.spring(1, 0.42);
  A2.quick = A2.spring(1, 0.28);
  A2.slow = A2.spring(1, 0.7);
  A2.flick = A2.spring(0.82, 0.38);

  A2.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /**
   * Run a spring on el with WAAPI; resolves when done. Ends on the element's own style unless fill is asked for.
   * Interruptible: if an earlier A2.go is still running (or holding its end) on the same element, it is stopped and the
   * new one starts from where the element is on screen right now, never from the hard-coded first frame.
   * (Velocity is not carried yet: DESIGN.md decides the spring engine that resamples it.)
   */
  A2.go = (el, frames, s = A2.calm, extra = {}) => {
    if (!el || A2.reduced) return Promise.resolve();
    const pe = extra.pseudoElement || null;
    const running = el.getAnimations().filter((a) => a.id === 'a2' && (a.effect.pseudoElement || null) === pe);
    if (running.length) {
      const cs = getComputedStyle(el, pe), f0 = { ...frames[0] };
      for (const k of Object.keys(f0)) if (k !== 'offset' && k !== 'easing') f0[k] = cs[k];
      frames = [f0, ...frames.slice(1)];
      running.forEach((a) => a.cancel());
    }
    const a = el.animate(frames, { duration: s.duration, easing: s.easing, fill: 'none', ...extra });
    a.id = 'a2';
    return a.finished.then(() => true, () => false);
  };
  /** spring value at time t (s) with initial velocity v0 (units/s), critically damped: for script-driven settles */
  A2.settleAt = (x0, target, v0, t, response = 0.42) => {
    const w = (2 * Math.PI) / response, d = x0 - target;
    return target + (d + (v0 + w * d) * t) * Math.exp(-w * t);
  };
  /** the orb's states change only its light's speed, smoothly (playback rate, never a restarted animation) */
  A2.orbState = (orb, state = '') => {
    if (!orb) return;
    orb.dataset.state = state;
    const turn = { listen: 3.75, think: 7.5 }[state] || 1, breathe = { listen: 3, think: 1.6 }[state] || 1;
    orb.getAnimations({ subtree: true }).forEach((a) => a.updatePlaybackRate(a.animationName === 'orb-breathe' ? breathe : turn));
  };
  A2.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  A2.buzz = (p) => { try { navigator.vibrate?.(p); } catch {} };
  A2.$ = (root, sel) => root.querySelector(sel);
  A2.$$ = (root, sel) => [...root.querySelectorAll(sel)];
  /** count a number up along the calm spring's own curve (script-driven text, so kept short: LESSONS 6) */
  A2.count = (el, to, fmt = (v) => Math.round(v).toLocaleString('en-GB')) => {
    if (A2.reduced) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), T = A2.calm.duration / 1000;
    const step = (t) => { const s = Math.min(T, (t - t0) / 1000); el.textContent = fmt(A2.settleAt(0, to, 0, s)); if (s < T) requestAnimationFrame(step); else el.textContent = fmt(to); };
    requestAnimationFrame(step);
  };
  /** press feedback on the very next frame: pointerdown dips, pointerup restores */
  A2.press = (root) => {
    root.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-press]'); if (b) b.setAttribute('data-down', ''); });
    const up = () => A2.$$(root, '[data-down]').forEach((b) => b.removeAttribute('data-down'));
    root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up); root.addEventListener('pointerleave', up);
  };

  A2.direction = (d) => A2.dirs.push(d);

  // ── Harness ──
  A2.start = () => {
    const stage = document.getElementById('stage');
    const picker = document.querySelector('.proto-picker:not(.lab-screens)');
    const bar = document.querySelector('.lab-screens');
    const q = new URLSearchParams(location.search);
    let current = 0, screen = 0, cleanup = null;

    picker.insertAdjacentHTML('beforeend', A2.dirs.map((d) => `<button class="proto-picker-item">${d.name}</button>`).join('') +
      '<span class="proto-picker-divider" aria-hidden="true"></span><button class="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)">↻</button>');
    const highlight = picker.querySelector('.proto-picker-highlight');
    const items = [...picker.querySelectorAll('.proto-picker-item:not(.proto-picker-replay)')];
    const replay = picker.querySelector('.proto-picker-replay');
    const barHi = bar.querySelector('.proto-picker-highlight');

    const place = (hi, el) => { hi.style.width = el.offsetWidth + 'px'; hi.style.transform = `translateX(${el.offsetLeft}px)`; };
    const barItems = () => [...bar.querySelectorAll('.proto-picker-item')];

    function mount() {
      cleanup?.(); cleanup = null;
      stage.innerHTML = '';
      const d = A2.dirs[current], s = d.screens[screen];
      document.documentElement.style.setProperty('--dir-bg', d.bg || '#05060b');
      requestAnimationFrame(() => {
        stage.innerHTML = s.html();
        const root = stage.firstElementChild;
        A2.press(stage);
        cleanup = s.mount?.(root) || null;
        const scroller = stage.querySelector('.scr');
        let last = 0;
        scroller?.addEventListener('scroll', () => {
          const y = scroller.scrollTop;
          if (y > last + 6 && y > 40) document.body.dataset.chrome = 'hidden';
          else if (y < last - 6 || y < 20) delete document.body.dataset.chrome;
          last = y;
        }, { passive: true });
      });
    }
    function renderBar() {
      const d = A2.dirs[current];
      bar.innerHTML = '<span class="proto-picker-highlight" aria-hidden="true"></span>' +
        d.screens.map((s, i) => `<button class="proto-picker-item"${i === screen ? ' data-active aria-current="true"' : ''}>${s.label}</button>`).join('');
      barItems().forEach((el, i) => el.addEventListener('click', () => setScreen(i)));
      requestAnimationFrame(() => place(bar.querySelector('.proto-picker-highlight'), barItems()[screen]));
    }
    function setScreen(i) {
      const n = A2.dirs[current].screens.length;
      if (i < 0 || i >= n) return;
      screen = i;
      barItems().forEach((el, j) => { el.toggleAttribute('data-active', j === i); j === i ? el.setAttribute('aria-current', 'true') : el.removeAttribute('aria-current'); });
      place(bar.querySelector('.proto-picker-highlight'), barItems()[i]);
      const url = new URL(location); url.searchParams.set('s', i + 1); history.replaceState(null, '', url);
      delete document.body.dataset.chrome;
      mount();
    }
    function setActive(i) {
      if (i < 0 || i >= A2.dirs.length) return;
      current = i;
      items.forEach((el, j) => { el.toggleAttribute('data-active', j === i); j === i ? el.setAttribute('aria-current', 'true') : el.removeAttribute('aria-current'); });
      place(highlight, items[i]);
      screen = Math.min(screen, A2.dirs[i].screens.length - 1);
      const url = new URL(location); url.searchParams.set('v', i + 1); url.searchParams.set('s', screen + 1); history.replaceState(null, '', url);
      delete document.body.dataset.chrome;
      renderBar();
      mount();
    }
    items.forEach((el, i) => el.addEventListener('click', () => setActive(i)));
    replay.addEventListener('click', () => mount());
    addEventListener('resize', () => { place(highlight, items[current]); place(bar.querySelector('.proto-picker-highlight'), barItems()[screen]); });
    document.addEventListener('keydown', (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= A2.dirs.length) setActive(num - 1);
      else if (e.key === 'ArrowRight') setActive((current + 1) % A2.dirs.length);
      else if (e.key === 'ArrowLeft') setActive((current - 1 + A2.dirs.length) % A2.dirs.length);
      else if (e.key === 'ArrowDown') setScreen((screen + 1) % A2.dirs[current].screens.length);
      else if (e.key === 'ArrowUp') setScreen((screen - 1 + A2.dirs[current].screens.length) % A2.dirs[current].screens.length);
      else if (e.key === 'r' || e.key === 'R') mount();
    });
    screen = Math.max(0, (parseInt(q.get('s'), 10) || 1) - 1);
    setActive((parseInt(q.get('v'), 10) || 1) - 1);
    requestAnimationFrame(() => requestAnimationFrame(() => { picker.setAttribute('data-ready', ''); bar.setAttribute('data-ready', ''); }));
  };
})();
