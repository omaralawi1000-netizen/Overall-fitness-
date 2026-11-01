/* Direction A, "Day line": time first, one door for everything.
   Tabs Today · Plan · Progress, plus the Log key (a newly designed orb) for food, water, weight and questions.
   Today is the day drawn as a band. The workout carries the same line: one segment per set. */
import { Channel, SPRINGS, OUT, play, flip, travel, roll, pressable, fold, ghost, fadeGhost } from './motion.js';
import { paintField, grain } from './bg.js';
import * as C from './core.js';

const { esc, kg, num } = C;
const DAY0 = 6 * 3600, DAY1 = 24 * 3600;
const X = (t) => ((Math.min(DAY1, Math.max(DAY0, t)) - DAY0) / (DAY1 - DAY0)) * 100;
const dark = () => matchMedia('(prefers-color-scheme: dark)').matches;

const I = {
  today: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18" stroke-width="2.4"/><circle cx="14" cy="12" r="3.2" fill="currentColor" stroke="none"/></svg>',
  plan: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  progress: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
  edit: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5l3 3-8 8H2.5v-3z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};
const SYM = { gym: '<i class="sym gym" aria-hidden="true"></i>', mat: '<i class="sym mat" aria-hidden="true"></i>', rest: '<i class="sym rst" aria-hidden="true"></i>' };

/** The Log key: a glass sphere painted pixel by pixel with dither, so its shading never bands. */
function paintOrb(size) {
  const S = Math.min(devicePixelRatio || 1, 3), n = Math.round(size * S), c = document.createElement('canvas');
  c.width = c.height = n; c.style.width = c.style.height = size + 'px';
  const ctx = c.getContext('2d'), img = ctx.createImageData(n, n), d = img.data;
  const dk = dark();
  const base = dk ? [30, 31, 38] : [236, 233, 226];
  const hues = [[255, 138, 61], [111, 227, 180], [157, 176, 255]]; // the day's colours: training, food, Coach
  let i = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++, i += 4) {
    const u = (x + 0.5) / n * 2 - 1, v = (y + 0.5) / n * 2 - 1, r2 = u * u + v * v;
    if (r2 > 1) { d[i + 3] = 0; continue; }
    const z = Math.sqrt(1 - r2);
    const lit = Math.max(0, -0.45 * u - 0.6 * v + 0.66 * z); // light from the top left
    const ang = (Math.atan2(v, u) + Math.PI) / (2 * Math.PI) * 3;
    const k = Math.floor(ang) % 3, f = ang - Math.floor(ang), a = hues[k], b = hues[(k + 1) % 3];
    const rim = Math.pow(1 - z, 2.2) * 0.85; // colour lives at the rim, like light inside glass
    let R = base[0], G = base[1], B = base[2];
    const hr = a[0] + (b[0] - a[0]) * f, hg = a[1] + (b[1] - a[1]) * f, hb = a[2] + (b[2] - a[2]) * f;
    R += (hr - R) * rim; G += (hg - G) * rim; B += (hb - B) * rim;
    const L = dk ? 0.78 + 0.5 * lit : 0.86 + 0.24 * lit;
    R *= L; G *= L; B *= L;
    const spec = Math.pow(Math.max(0, -0.5 * u - 0.7 * v + 0.5 * z), 10) * (dk ? 70 : 50); // a soft sheen, not a gloss
    const edge = Math.min(1, (1 - Math.sqrt(r2)) * n * 0.5); // soft anti-aliased edge
    const rn = () => Math.random() + Math.random() - 1;
    d[i] = R + spec + rn(); d[i + 1] = G + spec + rn(); d[i + 2] = B + spec + rn(); d[i + 3] = 255 * edge;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function dayline(stage, { day = 'train', setDay }) {
  const d = C.createDay(day);
  const w = C.createWorkout();
  const app = document.createElement('div');
  app.className = 'app dl';
  app.dataset.day = d.kind;
  stage.append(app);
  const T = w.t; // timers that stop on unmount
  grain(); // still noise under the glass tabs and strip: the banding check found faint steps there
  let tab = 'today', woOpen = false;

  /* ---------- Today ---------- */
  const heroFor = () => {
    if (d.kind === 'train' && d.session && !w.started) {
      const mins = Math.max(0, Math.round((d.session.start - C.now()) / 60));
      return { n: String(mins), u: 'min', mean: `until ${d.session.name} · ${C.hhmm(d.session.start)}` };
    }
    if (d.kind === 'train' && w.started) return { n: String(Math.max(0, w.exercises.reduce((t, e) => t + e.sets.filter((s) => !s.done).length, 0))), u: 'sets', mean: `left in ${d.session.name}` };
    const l = C.left(d);
    return { n: String(Math.round(l.p)), u: 'g', mean: 'protein to go today' };
  };
  const bandHTML = () => {
    const t = C.now();
    const blocks = d.work.map(([a, b]) => `<i class="blk work${b < t ? ' past' : ''}" style="left:${X(a)}%;width:${X(b) - X(a)}%"></i>`).join('');
    const ses = d.session ? `<i class="blk ses" style="left:${X(d.session.start)}%;width:${X(d.session.end) - X(d.session.start)}%"></i><span class="call ses-call" style="left:calc(${X(d.session.end)}% + 8px)">${esc(d.session.name)} ${C.hhmm(d.session.start)}</span>` : '';
    const dots = d.log.map((e) => `<i class="dot${e.fresh ? ' fresh' : ''}" style="left:${X(e.t)}%" title="${esc(e.meal)}"></i>`).join('') + `<i class="dot plan" style="left:${X(d.dinner)}%" title="Dinner, planned"></i>`;
    const hours = [6, 9, 12, 15, 18, 21, 24].map((h) => `<span style="left:${X(h * 3600)}%">${String(h % 24).padStart(2, '0')}</span>`).join('');
    return `<div class="band" role="img" aria-label="Your day: work ${d.work.map(([a, b]) => `${C.hhmm(a)}–${C.hhmm(b)}`).join(' and ')}${d.session ? `, ${d.session.name} at ${C.hhmm(d.session.start)}` : ''}, ${d.log.length} meals logged">
      <div class="lane">${blocks}${ses}<i class="past-veil" style="width:${X(t)}%"></i></div>
      <div class="lane-dots">${dots}</div>
      <p class="legend"><span><i class="lg work"></i>Work</span><span><i class="lg ses"></i>Training</span><span><i class="lg meal"></i>Meals</span></p>
      <i class="now" style="left:${X(t)}%"><b>Now</b></i>
      <div class="hours">${hours}</div>
    </div>`;
  };
  const listHTML = () => {
    const rows = d.log.slice().sort((a, b) => a.t - b.t).map((e) => {
      const m = C.entryMacros(e);
      return { t: e.t, html: `<li class="row food" data-entry="${d.log.indexOf(e)}"><span class="tm num">${C.hhmm(e.t)}</span><span class="what"><b>${esc(e.meal)}</b><small>${esc(C.entryName(e))}</small></span><span class="val num">${num(m.kcal)} kcal</span></li>` };
    });
    if (d.session) rows.push({ t: d.session.start, html: `<li class="row next ses"><span class="tm num">${C.hhmm(d.session.start)}</span><span class="what"><b>${SYM.gym}${esc(d.session.name)}</b><small>${d.session.exercises} exercises · about ${d.session.minutes} min</small></span><span class="val">${w.started ? 'Started' : 'Next'}</span></li>` });
    rows.push({ t: d.dinner, html: `<li class="row next"><span class="tm num">${C.hhmm(d.dinner)}</span><span class="what"><b>Dinner</b><small>Planned</small></span><span class="val"></span></li>` });
    return rows.sort((a, b) => a.t - b.t).map((r) => r.html).join('');
  };
  const coachLine = () => (d.kind === 'train' ? 'Last week bench faded from 8 reps to 6. Hold all four at 8.' : 'Rest day. Protein is today’s job.');
  const smallStats = () => {
    const e = C.eaten(d), l = C.left(d);
    return d.kind === 'train'
      ? `<span><b class="num">${Math.round(l.p)} g</b> protein to go</span><span><b class="num">${num(l.kcal)}</b> kcal left</span>`
      : `<span><b class="num">${num(l.kcal)}</b> kcal left</span><span><b class="num">${num(d.water)}</b> ml water</span>`;
  };

  app.innerHTML = `
  <section class="panel" data-panel="today"><div class="scroll"><div class="pad">
    <header class="top"><span class="date">${esc(d.date)}</span><span class="state ${d.kind}">${d.kind === 'train' ? SYM.gym + 'Training day' : SYM.rest + 'Rest day'}</span></header>
    <div class="band-host">${bandHTML()}</div>
    <div class="hero"><div class="big"><span class="n num" data-hero-n>${heroFor().n}</span><span class="u" data-hero-u>${heroFor().u}</span></div><p class="mean" data-hero-mean>${heroFor().mean}</p></div>
    <p class="coach"><span class="by">Coach</span>${esc(coachLine())}</p>
    <p class="stats" data-stats>${smallStats()}</p>
    <h2 class="sec">Today</h2>
    <ul class="list" data-list>${listHTML()}</ul>
    ${C.demoSwitch(d.kind)}
  </div></div></section>
  <section class="panel" data-panel="plan" hidden><div class="scroll"><div class="pad">
    <h1 class="title">Plan</h1>
    <h2 class="sec">This week</h2>
    <ul class="list week">${[['Monday', 'mat', 'Wrestling', '18:00 · 90 min'], ['Tuesday', 'gym', 'Push', '15:30 · today'], ['Wednesday', 'mat', 'Wrestling', '18:00 · 90 min'], ['Thursday', 'gym', 'Pull', '15:30'], ['Friday', 'rest', 'Rest', ''], ['Saturday', 'gym', 'Legs and shoulders', '10:00'], ['Sunday', 'gym', 'Pull', '11:00']].map(([dd, k, n, tm], i) => `<li class="row${i === d.today ? ' is-today' : ''}"><span class="tm">${dd.slice(0, 3)}</span><span class="what"><b>${SYM[k]}${n}</b><small>${tm}</small></span><span class="val"></span></li>`).join('')}</ul>
    <h2 class="sec">Food targets</h2>
    <p class="plain"><b class="num">2,450</b> kcal and <b class="num">180 g</b> protein a day, while cutting at about 0.4 kg a week.</p>
    <p class="hint">To change the plan, tell the Coach with the Log key: “move pull to Friday”.</p>
  </div></div></section>
  <section class="panel" data-panel="progress" hidden><div class="scroll"><div class="pad">
    <h1 class="title">Progress</h1>
    <h2 class="sec">Bench press · best set, as estimated 1RM</h2>
    <div class="chart-host ember">${C.chart(C.BENCH_WEEKS.map(([a, b]) => C.e1rm(a, b)), { fmt: (v) => v.toFixed(1) + ' kg' })}</div>
    <p class="hint">Estimate from your best set each week (Epley).</p>
    <h2 class="sec">Body weight</h2>
    <div class="chart-host">${C.chart(C.WEIGHT_WEEKS, { fmt: (v) => v.toFixed(1) + ' kg' })}</div>
    <h2 class="sec">Wrestling</h2>
    <p class="plain"><b class="num">${Math.floor(C.MAT_MINUTES.reduce((a, b) => a + b) / 60)} h ${C.MAT_MINUTES.reduce((a, b) => a + b) % 60} min</b> on the mat this month, in ${C.MAT_MINUTES.length} sessions.</p>
  </div></div></section>
  <div class="start-dock"${d.kind === 'train' ? '' : ' hidden'}><button class="start">${SYM.gym}<span>Start ${esc(d.session?.name || '')}</span></button></div>
  <button class="live" hidden aria-label="Back to the workout"><span class="lv-a">${SYM.gym}<b>Push</b> <span class="num" data-lv-time>0:00</span></span><span class="lv-b" data-lv-what></span>${I.up}</button>
  <nav class="bar" aria-label="Tabs">
    <div class="tabs glass"><i class="tab-pill" aria-hidden="true"></i>
      <button class="tab" data-tab="today" aria-current="page">${I.today}<span>Today</span></button>
      <button class="tab" data-tab="plan">${I.plan}<span>Plan</span></button>
      <button class="tab" data-tab="progress">${I.progress}<span>Progress</span></button>
    </div>
    <button class="orb" aria-label="Log food, water, weight, or ask the Coach"><span class="orb-paint"></span><span class="orb-l">Log</span><i class="badge" hidden>1</i></button>
  </nav>
  <section class="wo" aria-label="Workout" hidden>
    <div class="wo-field f-work"></div><div class="wo-field f-rest"></div>
    <header class="wo-top"><button class="icon wo-close" aria-label="Minimise the workout">${I.down}</button><button class="wo-title" aria-label="All exercises"><span class="tt">Bench press</span>${I.down}</button><span class="wo-time num">0:00</span></header>
    <div class="wo-line"><div class="segs"></div><div class="wo-meta"><span class="state-now"><i class="sym gym"></i><b data-meta>Set 1 of 4</b></span><span data-last></span></div></div>
    <ol class="wo-done"></ol>
    <div class="wo-hero">
      <div class="h-work">
        <span class="coachtag" hidden>Coach</span>
        <button class="setval" aria-label="Change weight and reps"><span class="vw num">80</span><span class="vu">kg</span><span class="vx">×</span><span class="vr num">8</span><span class="vu">reps</span><i class="pen">${I.edit}</i></button>
        <p class="delta" data-delta></p>
        <p class="then" data-then></p>
      </div>
      <div class="h-rest" aria-live="polite">
        <p class="rest-k"><i class="sym rst"></i>Rest</p>
        <div class="count num">0:40</div>
        <div class="rest-bar"><i></i></div>
        <p class="rest-next" data-rest-next></p>
        <p class="plates" data-plates></p>
        <div class="rest-adj"><button data-adj="-15">−15 s</button><button data-adj="15">+15 s</button></div>
      </div>
    </div>
    <div class="wo-coach"></div>
    <div class="wo-cta"><button class="cta"><span class="cta-l">Log 80 × 8</span></button></div>
  </section>`;

  const $ = (s, r = app) => r.querySelector(s);
  const $$ = (s, r = app) => [...r.querySelectorAll(s)];
  $('.orb-paint').append(paintOrb(60));

  /* Fields behind the workout: painted once, dithered, then only faded (LESSONS: no banding, no layers added mid-motion). */
  const fw = $('.f-work'), fr = $('.f-rest');
  const paintFields = () => {
    const W = app.clientWidth, H = app.clientHeight, dk = dark();
    fw.replaceChildren(paintField([{ x: 0.5, y: -0.05, sx: 0.7, sy: 0.55, c: dk ? [120, 52, 20] : [255, 200, 160], a: dk ? 0.5 : 0.55 }], dk ? [12, 13, 16] : [243, 241, 236], { w: W, h: H, over: 1 }));
    fr.replaceChildren(paintField([{ x: 0.3, y: 0.15, sx: 0.8, sy: 0.6, c: dk ? [14, 120, 116] : [120, 214, 205], a: 0.85 }, { x: 0.85, y: 0.9, sx: 0.7, sy: 0.6, c: dk ? [20, 70, 110] : [170, 220, 240], a: 0.7 }], dk ? [6, 22, 24] : [214, 240, 236], { w: W, h: H, over: 1, seed: 5 }));
  };
  const restOp = new Channel(fr, 'opacity', (v) => String(v), 0);

  /* ---------- Tabs: instant switch (a 100-times-a-day action), the pill slides on a spring ---------- */
  const pill = $('.tab-pill');
  const pillX = new Channel(pill, 'translate', (v) => `${v}px 0`, 0);
  const placePill = (anim) => {
    const b = $(`.tab[data-tab="${tab}"]`);
    pill.style.width = b.offsetWidth + 'px';
    anim ? pillX.to(b.offsetLeft, SPRINGS.set) : pillX.set(b.offsetLeft);
  };
  const showTab = (t) => {
    if (t === tab) { $(`.panel[data-panel="${t}"] .scroll`).scrollTo({ top: 0, behavior: 'smooth' }); return; }
    tab = t;
    $$('.panel').forEach((p) => { p.hidden = p.dataset.panel !== t; });
    $$('.tab').forEach((b) => (b.dataset.tab === t ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
    placePill(true);
    $('.start-dock').hidden = !(t === 'today' && d.kind === 'train' && !w.started);
  };
  $$('.tab').forEach((b) => { pressable(b, { scale: 0.94 }); b.addEventListener('click', () => showTab(b.dataset.tab)); });
  requestAnimationFrame(() => placePill(false));

  /* ---------- Today updates ---------- */
  const refreshToday = ({ rollHero = true } = {}) => {
    const h = heroFor();
    rollHero ? roll($('[data-hero-n]'), h.n, { dir: 1 }) : ($('[data-hero-n]').textContent = h.n);
    $('[data-hero-u]').textContent = h.u;
    $('[data-hero-mean]').textContent = h.mean;
    $('[data-stats]').innerHTML = smallStats();
    $('.band-host').innerHTML = bandHTML();
  };
  T.every(15000, () => { if (!document.hidden) refreshToday({ rollHero: true }); });

  /* ---------- The Log key and its sheet ---------- */
  const orb = $('.orb');
  pressable(orb, { scale: 0.92 });
  orb.addEventListener('click', () => openLog());
  const histHTML = () => (w.history.length ? w.history.map((pr) => { const h = C.historyLine(pr); return `<li><b class="num">${h.what}</b><span>${esc(C.scopeLine(pr))}</span><small>${esc(h.status)}</small></li>`; }).join('') : '<li class="none">Nothing changed today.</li>');
  function openLog() {
    const chips = C.chipsNow().map((c, i) => { const m = C.macros(c.f, c.amt); return `<button class="chip" data-chip="${i}"><b>${esc(c.f.name)}</b><span class="num">${C.amtLabel(c.f, c.amt)} · ${num(m.kcal)} kcal</span></button>`; }).join('');
    const s = C.sheet(app, {
      cls: 'dl-sheet', label: 'Log or ask',
      html: `<h2 class="sh-t">Log or ask</h2>
        <form class="lg-form"><input class="lg-in" type="text" inputmode="text" enterkeyhint="send" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="200 g skyr og to æg" aria-label="Log food, water or weight, or ask"><button class="lg-go">Log</button></form>
        <p class="hint">Food, water (“water 500”) or weight (“weight 93.2”). Talk with your keyboard’s mic.</p>
        <div class="lg-out" aria-live="polite"></div>
        <h3 class="sh-k">Right now</h3><div class="chips">${chips}<button class="chip water" data-water="500"><b>Water</b><span class="num">500 ml</span></button></div>
        <h3 class="sh-k">Coach changes today</h3><ul class="hist">${histHTML()}</ul>`,
    });
    const out = $('.lg-out', s.body), inp = $('.lg-in', s.body);
    s.body.addEventListener('click', (e) => {
      const ch = e.target.closest('[data-chip]');
      if (ch) { const c = C.chipsNow()[+ch.dataset.chip]; s.close(); logFood([{ f: c.f, amt: c.amt }]); return; }
      const wt = e.target.closest('[data-water]');
      if (wt) { s.close(); logWater(+wt.dataset.water); return; }
      const amt = e.target.closest('[data-amt]');
      if (amt) { // tap an amount in the tray: it steps through that food's usual portions
        const it = tray[+amt.dataset.amt], ch2 = it.f.chips, k = ch2.indexOf(it.amt);
        it.amt = ch2[(k + 1) % ch2.length] ?? ch2[0];
        renderTray(); return;
      }
      const rm = e.target.closest('[data-rm]');
      if (rm) { tray.splice(+rm.dataset.rm, 1); tray.length ? renderTray() : (out.innerHTML = ''); return; }
      if (e.target.closest('.tray-add')) { s.close(); logFood(tray.map((t) => ({ ...t }))); }
    });
    let tray = [];
    const renderTray = () => {
      const tot = tray.reduce((a, it) => { const m = C.macros(it.f, it.amt); return { kcal: a.kcal + m.kcal, p: a.p + m.p }; }, { kcal: 0, p: 0 });
      out.innerHTML = `<ul class="tray">${tray.map((it, i) => { const m = C.macros(it.f, it.amt); return `<li><b>${esc(it.f.name)}</b><button class="amt num" data-amt="${i}" aria-label="Change amount">${C.amtLabel(it.f, it.amt)}</button><span class="num">${num(m.kcal)} kcal · ${Math.round(m.p)} g</span><button class="icon rm" data-rm="${i}" aria-label="Remove ${esc(it.f.name)}">×</button></li>`; }).join('')}</ul>
        <button class="tray-add">Add ${num(tot.kcal)} kcal</button>`;
      play(out.firstElementChild, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], SPRINGS.set);
    };
    $('.lg-form', s.body).addEventListener('submit', (e) => {
      e.preventDefault();
      const r = C.parseLog(inp.value);
      if (!r) return;
      if (r.kind === 'food') { tray = r.items; renderTray(); inp.value = ''; inp.blur(); }
      else if (r.kind === 'water') { s.close(); logWater(r.ml); }
      else if (r.kind === 'weight') { s.close(); C.toast(app, `Weight <b class="num">${kg(r.kg)} kg</b> logged`, { undo: () => {} }); }
      else if (r.kind === 'set') out.innerHTML = `<p class="reply">Sets go in the workout. ${d.kind === 'train' ? 'Tap Start Push.' : 'There’s no session today.'}</p>`;
      else out.innerHTML = `<p class="reply"><span class="by">Coach</span>${esc(C.COACH_PROTO)}</p>`;
    });
  }
  function logFood(items) {
    const entry = C.addFood(d, items);
    const m = C.entryMacros(entry);
    refreshToday();
    const dot = $('.dot.fresh:last-of-type') || $$('.dot.fresh').pop();
    if (dot) play(dot, [{ transform: 'translate(-50%, -50%) scale(0)' }, { transform: 'translate(-50%, -50%) scale(1)' }], SPRINGS.type);
    const list = $('[data-list]');
    flip($$('[data-list] .row'), () => { list.innerHTML = listHTML(); }, SPRINGS.set);
    const row = $(`[data-entry="${d.log.indexOf(entry)}"]`);
    if (row) play(row, [{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], SPRINGS.set, { delay: 60 });
    entry.fresh = false;
    C.buzz(10);
    C.toast(app, `${esc(C.entryName(entry))} · <b class="num">${num(m.kcal)} kcal</b> at ${C.hhmm(entry.t)}`, {
      undo: () => { C.removeEntry(d, entry); refreshToday(); flip($$('[data-list] .row'), () => { list.innerHTML = listHTML(); }, SPRINGS.set); },
    });
  }
  function logWater(ml) {
    d.water += ml; refreshToday({ rollHero: false });
    C.toast(app, `Water <b class="num">${ml} ml</b> · ${num(d.water)} ml today`, { undo: () => { d.water -= ml; refreshToday({ rollHero: false }); } });
  }
  app.addEventListener('click', (e) => { const b = e.target.closest('[data-demo]'); if (b) setDay(b.dataset.demo); });

  /* ---------- The workout ---------- */
  const wo = $('.wo');
  const woY = new Channel(wo, 'translate', (v) => `0 ${v}px`, 0);
  const startBtn = $('.start');
  pressable(startBtn);
  const live = $('.live');
  const openWo = () => {
    if (woOpen) return;
    woOpen = true;
    if (!fw.firstChild) paintFields();
    if (wo.hidden) woY.set(app.clientHeight); // reopened mid-close: carry on from where it is
    wo.hidden = false;
    woY.to(0, SPRINGS.set);
    live.hidden = true; app.style.removeProperty('--toast-bottom');
    C.keepAwake(true);
  };
  const closeWo = () => {
    woOpen = false;
    const a = woY.to(app.clientHeight, SPRINGS.set);
    const done = () => { if (!woOpen) wo.hidden = true; };
    a ? a.finished.then(done, done) : done();
    live.hidden = false; app.style.setProperty('--toast-bottom', '170px');
    play(live, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], SPRINGS.set, { delay: 120 });
    renderLive();
  };
  startBtn.addEventListener('click', () => {
    if (!w.started) { w.started = C.now(); }
    $('.start-dock').hidden = true;
    renderAll(); openWo();
    refreshToday({ rollHero: false });
    flip($$('[data-list] .row'), () => { $('[data-list]').innerHTML = listHTML(); });
  });
  $('.wo-close').addEventListener('click', closeWo);
  live.addEventListener('click', openWo);
  pressable(live, { scale: 0.98 });

  const segs = $('.segs'), doneList = $('.wo-done');
  const hWork = $('.h-work'), hRest = $('.h-rest');
  const workOp = new Channel(hWork, 'opacity', (v) => String(v), 1, { hideAt: 0 });
  const workY = new Channel(hWork, 'translate', (v) => `0 ${v}px`, 0);
  const restLOp = new Channel(hRest, 'opacity', (v) => String(v), 0, { hideAt: 0 });
  const restY = new Channel(hRest, 'translate', (v) => `0 ${v}px`, 16);
  const cta = $('.cta'), ctaL = $('.cta-l');
  pressable(cta, { scale: 0.97 });
  const val = $('.setval');
  pressable(val, { scale: 0.97 });

  const segHTML = () => C.curEx(w).sets.map((s, i) => `<i class="seg${s.done ? ' done' : ''}${i === C.curIdx(w) ? ' cur' : ''}${s.record ? ' best' : ''}"><b></b></i>`).join('');
  const doneHTML = () => C.curEx(w).sets.map((s, i) => (s.done ? `<li class="drow${s.record ? ' best' : ''}"><span class="sr">Set ${i + 1} done:</span><span class="dv num">${kg(s.w)} × ${s.r}</span>${s.coach ? '<span class="ctag" title="Coach change">C</span>' : ''}${s.record ? '<mark class="rec">Best</mark>' : '<i class="ok" aria-hidden="true">✓</i>'}</li>` : '')).join('');
  const lastLine = (ns) => (ns ? `Last time ${kg(ns.lastW)} × ${ns.lastR ?? '–'}` : '');
  const deltaLine = (ns) => {
    if (!ns || ns.lastR == null) return '';
    const dw = ns.w - ns.lastW, dr = ns.r - ns.lastR;
    if (dw > 0) return `<b>+${kg(dw)} kg</b> on last time`;
    if (dw < 0) return `${kg(-dw)} kg lighter than last time`;
    if (dr > 0) return `<b>+${dr} rep${dr > 1 ? 's' : ''}</b> on last time`;
    if (dr === 0) return 'Same as last time';
    return `${-dr} fewer than last time`;
  };
  const thenLine = () => { const n = C.nextUp(w); return n ? (n.same ? `Then set ${n.n} · ${kg(n.w)} × ${n.r}` : `Then ${esc(n.name)} · ${kg(n.w)} × ${n.r}`) : 'Last set of the workout'; };

  const metaLine = (ns) => { $('[data-meta]').textContent = w.phase === 'rest' ? `Set ${ns.n - 1} of ${ns.of} done` : `Set ${ns.n} of ${ns.of}`; };
  function renderWork({ animate = false } = {}) {
    const ns = C.nowSet(w);
    if (!ns) { if (w.phase === 'work') { ctaL.textContent = 'All sets logged'; cta.disabled = true; } return; }
    const set = (el, t) => (animate ? roll(el, t, { dir: parseFloat(t) < parseFloat(el.dataset.text ?? el.textContent) ? -1 : 1 }) : (el.textContent = t, el.dataset.text = t));
    set($('.vw'), kg(ns.w)); set($('.vr'), String(ns.r));
    metaLine(ns);
    $('[data-last]').textContent = lastLine(ns);
    $('[data-delta]').innerHTML = deltaLine(ns);
    $('[data-then]').innerHTML = thenLine();
    const ct = $('.coachtag'); ct.hidden = !ns.coach;
    $('.setval').classList.toggle('long', kg(ns.w).length > 3);
    if (w.phase === 'work') set(ctaL, `Log ${kg(ns.w)} × ${ns.r}`);
  }
  function renderRest() {
    const left = C.restLeft(w);
    $('.count').textContent = C.mmss(left);
    const n = C.nowSet(w);
    const target = n || C.nextUp(w);
    if (target) {
      const tw = target.w;
      const rn = $('[data-rest-next]'), was = rn.querySelector('b')?.textContent;
      rn.innerHTML = `Next · ${target.same === false || !n ? esc(target.name) + ' · ' : `set ${target.n} · `}<b class="num">${kg(tw)} × ${target.r}</b>`;
      const fig = rn.querySelector('b');
      if (was && was !== fig.textContent && w.phase === 'rest') play(fig, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], SPRINGS.type);
      const ex = n ? n.ex : w.exercises.find((e) => e.name === target.name);
      $('[data-plates]').textContent = ex?.barbell ? `Each side of the bar: ${C.plates(tw).join(' + ')} kg` : '';
    } else { $('[data-rest-next]').textContent = 'That was the last set.'; $('[data-plates]').textContent = ''; }
  }
  let barAnim = null;
  function runBar() {
    const bar = $('.rest-bar i');
    barAnim?.cancel();
    if (!w.rest) return;
    const left = C.restLeft(w), f = left / w.rest.len;
    barAnim = bar.animate([{ transform: `scaleX(${f})` }, { transform: 'scaleX(0)' }], { duration: left * 1000, easing: 'linear', fill: 'forwards' });
  }
  function renderLive() {
    $('[data-lv-time]').textContent = C.elapsed(w);
    const ns = C.nowSet(w);
    $('[data-lv-what]').textContent = w.phase === 'rest' ? `Rest ${C.mmss(C.restLeft(w))}` : ns ? `${ns.ex.name.split(' ')[0]} · ${kg(ns.w)} × ${ns.r}` : 'All done';
  }
  function renderAll() {
    $('.tt').textContent = C.curEx(w).name;
    segs.innerHTML = segHTML();
    doneList.innerHTML = doneHTML();
    renderWork();
    renderCoach();
  }
  T.every(1000, () => { if (document.hidden) return; $('.wo-time').textContent = C.elapsed(w); if (!live.hidden) renderLive(); });

  /* Ticking a set: one tap, answered on the next frame. The value flies into the done list, the line fills, rest takes
     the screen. Nothing is added or removed mid-motion: both heroes and both fields always exist. */
  cta.addEventListener('click', () => {
    if (w.phase === 'rest') { C.endRest(w, false); return; }
        C.buzz(12);
    C.logSet(w);
  });
  val.addEventListener('click', () => { if (w.phase === 'work') C.stepper(app, w, { cls: 'dl-sheet', roll }); });
  $$('[data-adj]').forEach((b) => { pressable(b); b.addEventListener('click', () => { C.nudgeRest(w, +b.dataset.adj); renderRest(); runBar(); }); });

  C.on(w, (kind, data) => {
    if (kind === 'logged') {
      const valRect = $('.setval').getBoundingClientRect();
      flip([...doneList.children], () => { doneList.innerHTML = doneHTML(); }, SPRINGS.set);
      const row = [...doneList.querySelectorAll('.drow')].pop() || null;
      if (row) { const v = row.querySelector('.dv'); travel(v, { left: valRect.left + 12, top: valRect.top + 4, width: v.getBoundingClientRect().width * 2.4 }, SPRINGS.type); }
      // Fill the set's segment.
      const i = C.curEx(w).sets.indexOf(data.set);
      segs.innerHTML = segHTML();
      const sg = segs.children[i]?.firstChild;
      if (sg) play(sg, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], SPRINGS.type);
      if (data.set.record) {
        const mk = row?.querySelector('.rec');
        if (mk) play(mk, [{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.press, { delay: 160 });
      }
      // Rest takes the screen.
      const nx = C.nowSet(w); if (nx) metaLine(nx); // the outgoing number keeps its value while it leaves
      renderRest(); runBar();
      workOp.to(0, OUT); workY.to(-18, SPRINGS.set); // the outgoing number leaves fast, so two big numerals never overlap
      if (restLOp.now().x < 0.02) restY.set(16);
      restOp.to(1, SPRINGS.set);
      T.after(80, () => { if (w.phase !== 'rest') return; restLOp.to(1, SPRINGS.set); restY.to(0, SPRINGS.set); });
      roll(ctaL, 'Skip rest');
      wo.dataset.phase = 'rest';
      renderCoach();
    } else if (kind === 'tick') {
      renderRest();
      if (!live.hidden) renderLive();
    } else if (kind === 'rest-end') {
      $('.rest-bar i').style.transform = 'scaleX(0)'; // hold the empty bar, no flash back to full
      barAnim?.cancel(); barAnim = null;
      if (data.moved) {
        play($('.tt'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], SPRINGS.set);
        $('.tt').textContent = C.curEx(w).name;
        segs.innerHTML = segHTML();
        fold([...doneList.children], [], true);
        doneList.innerHTML = '';
      } else segs.innerHTML = segHTML();
      const seen = workOp.now().x > 0.02; // skipped straight away: the old number is still on its way out
      renderWork({ animate: seen });
      if (!seen) workY.set(18);
      restLOp.to(0, OUT); restY.to(16, SPRINGS.set);
      restOp.to(0, SPRINGS.set);
      wo.dataset.phase = 'work';
      T.after(80, () => {
        if (w.phase !== 'work') return;
        workOp.to(1, SPRINGS.set); workY.to(0, SPRINGS.set);
        if (data.natural) play($('.setval'), [{ transform: 'scale(0.96)' }, { transform: 'none' }], SPRINGS.set);
      });
      renderCoach();
      if (!live.hidden) renderLive();
    } else if (kind === 'value') {
      renderWork({ animate: true });
    } else if (kind === 'proposal') {
      renderCoach(data);
      renderWork({ animate: true });
      if (w.phase === 'rest') renderRest();
      $('.badge').hidden = !(w.proposal?.state === 'open');
    }
  });

  /* ---------- The Coach's slot in the workout: draft, accepted, done ---------- */
  const slot = $('.wo-coach');
  let slotState = 'none';
  function renderCoach(ev = {}) {
    const pr = w.proposal;
    let st = 'none';
    if (pr && pr.state === 'open') st = 'open';
    else if (pr && pr.state === 'accepted') st = 'accepted';
    else if (pr && ['completed', 'undone', 'kept'].includes(pr.state)) st = 'note';
    if (st === slotState && st !== 'accepted' && st !== 'note') return;
    const prev = slot.querySelector(':scope > :not(.ghost)');
    const html = st === 'open' ? `<div class="draft" role="group" aria-label="The Coach suggests a change">
        <p class="dr-top"><span class="dr-k">Coach suggests</span><span class="dr-scope">${esc(C.scopeLine(pr))}</span></p>
        <p class="dr-val"><s class="num">${kg(pr.from)}</s>${I.arrow}<span class="new num">${kg(pr.to)}</span><span class="u">kg</span></p>
        <p class="dr-why">${esc(pr.reason)}</p>
        <div class="dr-acts"><div class="slide" tabindex="0" role="button" aria-label="Slide to use ${kg(pr.to)} kg"><div class="slide-fill"></div><span class="slide-label">Slide to use ${kg(pr.to)}</span><div class="slide-knob">${I.arrow}</div></div><button class="keep">Keep ${kg(pr.from)}</button></div>
      </div>`
      : st === 'accepted' ? `<div class="applied"><span class="ap-k">Coach</span><span class="ap-t">${pr.scope.length ? `Set${pr.scope.length > 1 ? 's' : ''} ${pr.scope.map((i) => i + 1).join(' and ')} now <b class="num">${kg(pr.to)} kg</b>` : ''}</span><button class="ap-undo">Undo</button></div>`
      : st === 'note' ? `<p class="cnote"><span class="ap-k">Coach</span>${esc(C.historyLine(pr).what)} · ${esc(C.historyLine(pr).status)}</p>` : '';
    if (st === slotState && prev) { prev.outerHTML = html; wire(); return; }
    slotState = st;
    const next = document.createElement('div');
    next.innerHTML = html;
    const el = next.firstElementChild;
    // The hero is laid out from the top of the screen, so the slot filling or emptying never moves it.
    const gh = prev ? ghost(prev) : null;
    const top0 = slot.getBoundingClientRect().top;
    prev?.remove();
    if (el) slot.append(el);
    if (gh) {
      const dy = slot.getBoundingClientRect().top - top0;
      gh.g.style.top = parseFloat(gh.g.style.top) - dy + 'px';
      slot.append(gh.g); fadeGhost(gh.g);
    }
    if (el) play(el, [{ opacity: 0, transform: 'translateY(10px) scale(0.98)' }, { opacity: 1, transform: 'none' }], SPRINGS.set);
    wire();
  }
  function wire() {
    const sl = $('.slide', slot);
    if (sl && !sl.dataset.wired) {
      sl.dataset.wired = '1';
      C.slider(sl, () => { C.accept(w); }, { guard: () => w.proposal && performance.now() - w.proposal.arrived >= C.GUARD });
    }
    const k = $('.keep', slot); if (k && !k.dataset.wired) { k.dataset.wired = '1'; pressable(k); k.addEventListener('click', () => C.keep(w)); }
    const u = $('.ap-undo', slot); if (u && !u.dataset.wired) { u.dataset.wired = '1'; pressable(u); u.addEventListener('click', () => C.undo(w)); }
  }

  /* All exercises, one tap from the header, with today's Coach changes */
  $('.wo-title').addEventListener('click', () => {
    const s = C.sheet(app, {
      cls: 'dl-sheet', label: 'All exercises',
      html: `<h2 class="sh-t">Push</h2><ul class="exlist">${w.exercises.map((e, j) => { const dn = e.sets.filter((x) => x.done).length; return `<li><button class="ex${j === w.cur ? ' cur' : ''}" data-ex="${j}"${w.phase === 'rest' && j !== w.cur ? ' disabled' : ''}><b>${esc(e.name)}</b><span class="num">${dn} of ${e.sets.length} done</span></button></li>`; }).join('')}</ul>
        ${w.phase === 'rest' ? '<p class="hint">You can switch exercise after the rest.</p>' : ''}
        <h3 class="sh-k">Coach changes today</h3><ul class="hist">${histHTML()}</ul>`,
    });
    s.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ex]'); if (!b || b.disabled) return;
      const j = +b.dataset.ex;
      if (j !== w.cur && w.exercises[j].sets.some((x) => !x.done)) { w.cur = j; renderAll(); }
      s.close();
    });
  });

  /* Respond to theme changes (the orb and fields are painted for the theme). */
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const onTheme = () => { $('.orb-paint').replaceChildren(paintOrb(60)); if (fw.firstChild) paintFields(); };
  mq.addEventListener('change', onTheme);

  renderAll();
  return () => { T.stop(); mq.removeEventListener('change', onTheme); C.keepAwake(false); app.remove(); };
}
