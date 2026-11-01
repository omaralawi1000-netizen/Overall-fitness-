/* Direction B, "Rooms": place first, colour tells the state.
   Tabs Today · Train · Food · Progress, plus an Ask button beside the bar. One huge poster number per screen, and a
   full-screen field whose colour is the state (always named in words too). No orb. Accepting a Coach change is a tap
   on its own button. */
import { Channel, SPRINGS, OUT, play, flip, travel, roll, pressable, ghost, fadeGhost } from './motion.js';
import { paintField, grain } from './bg.js';
import * as C from './core.js';

const { esc, kg, num } = C;
const I = {
  today: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5"/></svg>',
  train: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></svg>',
  food: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M9 8c0-2 2-2 2-4M14 8c0-2 2-2 2-4"/></svg>',
  progress: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V11M10 19V6M16 19v-5M22 19H2"/></svg>',
  ask: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
};
/* The state fields: one colour per state, painted once with dither, only ever faded. */
const FIELDS = {
  train: { base: [22, 10, 7], blobs: [{ x: 0.2, y: 0.05, sx: 0.75, sy: 0.5, c: [196, 70, 22], a: 0.75 }, { x: 0.95, y: 0.35, sx: 0.55, sy: 0.45, c: [150, 32, 30], a: 0.55 }, { x: 0.4, y: 1.0, sx: 0.8, sy: 0.4, c: [60, 18, 12], a: 0.6 }] },
  rest: { base: [5, 18, 20], blobs: [{ x: 0.25, y: 0.1, sx: 0.8, sy: 0.55, c: [12, 140, 128], a: 0.7 }, { x: 0.9, y: 0.6, sx: 0.6, sy: 0.5, c: [18, 80, 140], a: 0.55 }] },
  restday: { base: [9, 11, 24], blobs: [{ x: 0.3, y: 0.0, sx: 0.8, sy: 0.5, c: [62, 84, 190], a: 0.65 }, { x: 0.9, y: 0.75, sx: 0.6, sy: 0.5, c: [110, 70, 170], a: 0.45 }] },
};
const STATE_WORD = { train: 'Training day', restday: 'Rest day', work: 'Training', rest: 'Resting' };

export function rooms(stage, { day = 'train', setDay }) {
  const d = C.createDay(day);
  const w = C.createWorkout();
  const app = document.createElement('div');
  app.className = 'app rm';
  stage.append(app);
  const T = w.t;
  let tab = 'today', woOpen = false;
  const dayField = d.kind === 'train' ? 'train' : 'restday';

  const poster = () => {
    if (d.kind === 'train' && !w.started) return { n: C.hhmm(d.session.start), u: '', mean: `${d.session.name} starts · in ${Math.max(0, Math.round((d.session.start - C.now()) / 60))} min` };
    if (d.kind === 'train') return { n: String(w.exercises.reduce((t, e) => t + e.sets.filter((s) => !s.done).length, 0)), u: 'sets', mean: `left in ${d.session.name}` };
    return { n: String(Math.round(C.left(d).p)), u: 'g', mean: 'protein to go today' };
  };
  const weekHTML = () => d.week.map((x, i) => `<li class="${x.kind}${i === d.today ? ' now' : ''}"><span>${x.d}</span><i aria-hidden="true"></i><small class="sr">${x.kind === 'gym' ? x.name : x.kind === 'mat' ? 'Wrestling' : 'Rest'}</small></li>`).join('');
  const foodLeftHTML = () => { const l = C.left(d); return `<div class="pair"><div><b class="num">${Math.round(l.p)}<small>g</small></b><span>protein left</span></div><div><b class="num">${num(l.kcal)}</b><span>kcal left</span></div></div>`; };
  const mealsHTML = () => ['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((m) => {
    const es = d.log.filter((e) => e.meal === m);
    const k = es.reduce((a, e) => a + C.entryMacros(e).kcal, 0);
    return `<section class="meal"><h3><span>${m}</span><span class="num">${es.length ? num(k) + ' kcal' : ''}</span></h3>${es.length ? `<ul>${es.map((e) => e.items.map((it) => { const mm = C.macros(it.f, it.amt); return `<li><span>${esc(it.f.name)}<small class="num">${C.amtLabel(it.f, it.amt)} · ${C.hhmm(e.t)}</small></span><span class="num">${num(mm.kcal)}</span></li>`; }).join('')).join('')}</ul>` : `<p class="empty">${m === 'Dinner' ? 'Planned for 18:30' : 'Nothing yet'}</p>`}</section>`;
  }).join('');
  const coachToday = d.kind === 'train' ? 'Last week bench faded from 8 reps to 6. Hold all four at 8.' : 'Rest day. Protein is today’s job.';

  app.innerHTML = `
  <div class="field f-day"></div>
  <section class="panel" data-panel="today"><div class="scroll"><div class="pad">
    <header class="top"><span class="date">${esc(d.date)}</span><span class="state"><i class="sym ${dayField}"></i>${STATE_WORD[dayField]}</span></header>
    <div class="poster"><span class="pn num" data-pn>${poster().n}</span><span class="pu" data-pu>${poster().u}</span></div>
    <p class="mean" data-mean>${poster().mean}</p>
    <p class="coach"><span class="by">Coach</span>${esc(coachToday)}</p>
    ${d.kind === 'train' ? `<section class="card next"><p class="k">Next</p><h2>${esc(d.session.name)}</h2><p class="sub">${d.session.exercises} exercises · about ${d.session.minutes} min</p><p class="sub">Bench to beat: <b class="num">80 × 8</b></p><button class="btn start">Start ${esc(d.session.name)}</button></section>` : `<section class="card next"><p class="k">Tomorrow</p><h2>Legs and shoulders</h2><p class="sub">Saturday 10:00 · about 60 min</p></section>`}
    <section class="card food-card"><p class="k">Food today</p><div data-foodleft>${foodLeftHTML()}</div><button class="btn ghost add-food">${I.plus}Add food</button></section>
    <section class="card week-card"><p class="k">This week</p><ul class="week">${weekHTML()}</ul><p class="legend"><span><i class="lg gym"></i>Gym</span><span><i class="lg mat"></i>Mat</span><span><i class="lg rest"></i>Rest</span></p></section>
    ${C.demoSwitch(d.kind)}
  </div></div></section>
  <section class="panel" data-panel="train" hidden><div class="scroll"><div class="pad">
    <h1 class="title">Train</h1>
    <div class="seg" role="tablist"><button role="tab" aria-selected="true" data-seg="gym">Gym</button><button role="tab" aria-selected="false" data-seg="mat">Mat</button></div>
    <div data-segp="gym">
      <section class="card"><p class="k">${d.kind === 'train' ? 'Today' : 'Tuesday'}</p><h2>Push</h2><p class="sub">Bench · Incline dumbbell · Overhead press · Cable fly · Triceps</p>${d.kind === 'train' ? '<button class="btn start">Start Push</button>' : ''}</section>
      <section class="card"><p class="k">Thursday and Sunday</p><h2>Pull</h2><p class="sub">Pull-ups · Row · Pulldown · Curls · Face pulls</p></section>
      <section class="card"><p class="k">Saturday</p><h2>Legs and shoulders</h2><p class="sub">Squat · Romanian deadlift · Leg press · Lateral raise</p></section>
    </div>
    <div data-segp="mat" hidden>
      <section class="card mat"><p class="k">Wrestling · Monday and Wednesday</p><h2>18:00 · 90 min</h2><p class="sub">Warm-up 15 · Drilling 30 · Sparring 5 × 3 min · Live 3 × 3 min</p><p class="sub">Logged as a session: rounds, how hard it was, mat minutes and notes. Never as sets.</p></section>
      <section class="card"><p class="k">This month</p><h2 class="num">${Math.floor(C.MAT_MINUTES.reduce((a, b) => a + b) / 60)} h ${C.MAT_MINUTES.reduce((a, b) => a + b) % 60} min</h2><p class="sub">${C.MAT_MINUTES.length} sessions on the mat</p></section>
    </div>
  </div></div></section>
  <section class="panel" data-panel="food" hidden><div class="scroll"><div class="pad">
    <header class="top"><h1 class="title">Food</h1><span class="state"><i class="sym ${dayField}"></i>${STATE_WORD[dayField]}</span></header>
    <div class="poster small"><span class="pn num" data-fpn>${Math.round(C.left(d).p)}</span><span class="pu">g</span></div>
    <p class="mean">protein left · <b class="num" data-fkcal>${num(C.left(d).kcal)}</b> kcal left</p>
    <div class="meals" data-meals>${mealsHTML()}</div>
  </div></div><div class="food-dock"><button class="btn add-food big">${I.plus}Add food</button></div></section>
  <section class="panel" data-panel="progress" hidden><div class="scroll"><div class="pad">
    <h1 class="title">Progress</h1>
    <section class="card"><p class="k">Bench press · estimated 1RM</p>${C.chart(C.BENCH_WEEKS.map(([a, b]) => C.e1rm(a, b)), { fmt: (v) => v.toFixed(1) + ' kg' })}<p class="sub">From your best set each week (Epley estimate).</p></section>
    <section class="card"><p class="k">Body weight</p>${C.chart(C.WEIGHT_WEEKS, { fmt: (v) => v.toFixed(1) + ' kg' })}</section>
  </div></div></section>
  <button class="live" hidden aria-label="Back to the workout"><span><i class="sym train"></i><b>Push</b> <span class="num" data-lv-time>0:00</span></span><span class="lv-b" data-lv-what></span>${I.up}</button>
  <nav class="bar" aria-label="Rooms">
    <div class="tabs glass"><i class="tab-pill" aria-hidden="true"></i>
      ${[['today', 'Today'], ['train', 'Train'], ['food', 'Food'], ['progress', 'Progress']].map(([k, l], i) => `<button class="tab" data-tab="${k}"${i ? '' : ' aria-current="page"'}>${I[k]}<span>${l}</span></button>`).join('')}
    </div>
    <button class="ask glass" aria-label="Ask the Coach">${I.ask}<span>Ask</span></button>
  </nav>
  <section class="wo" aria-label="Workout" hidden data-phase="work">
    <div class="field f-work"></div><div class="field f-rest"></div>
    <header class="wo-top"><button class="icon wo-close" aria-label="Minimise the workout">${I.down}</button><button class="wo-title" aria-label="All exercises"><span class="tt">Bench press</span>${I.down}</button><span class="wo-time num">0:00</span></header>
    <p class="wo-state"><i class="sym work"></i><b data-state>Training</b><span data-meta>Set 1 of 4</span></p>
    <ul class="wo-done"></ul>
    <div class="wo-hero">
      <div class="h-work">
        <span class="coachtag" hidden>Coach set this</span>
        <button class="setval" aria-label="Change weight and reps"><span class="pw"><span class="vw num">80</span><small>kg</small></span><span class="pr"><span class="vx">×</span><span class="vr num">8</span><small>reps</small></span><i class="pen" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M10.5 2.5l3 3-8 8H2.5v-3z"/></svg></i></button>
        <p class="delta" data-delta></p>
        <p class="then" data-then></p>
      </div>
      <div class="h-rest" aria-live="polite">
        <div class="count num">0:40</div>
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
  grain(); // still noise under the glass: the banding check found rings in B's blurred cards (rule: grain only where rings show)
  const paint = (el, k) => { const f = FIELDS[k]; el.replaceChildren(paintField(f.blobs, f.base, { w: app.clientWidth, h: app.clientHeight, over: 1, seed: k.length * 7 })); };
  paint($('.f-day'), dayField);

  /* ---------- Rooms (tabs): instant switch, the pill slides ---------- */
  const pill = $('.tab-pill');
  const pillX = new Channel(pill, 'translate', (v) => `${v}px 0`, 0);
  const placePill = (anim) => { const b = $(`.tab[data-tab="${tab}"]`); pill.style.width = b.offsetWidth + 'px'; anim ? pillX.to(b.offsetLeft, SPRINGS.set) : pillX.set(b.offsetLeft); };
  const showTab = (t) => {
    if (t === tab) return;
    tab = t;
    $$('.panel').forEach((p) => { p.hidden = p.dataset.panel !== t; });
    $$('.tab').forEach((b) => (b.dataset.tab === t ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
    placePill(true);
  };
  $$('.tab').forEach((b) => { pressable(b, { scale: 0.94 }); b.addEventListener('click', () => showTab(b.dataset.tab)); });
  requestAnimationFrame(() => placePill(false));
  $$('[data-seg]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-seg]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $$('[data-segp]').forEach((p) => { p.hidden = p.dataset.segp !== b.dataset.seg; });
  }));

  const refresh = () => {
    const p = poster();
    roll($('[data-pn]'), p.n); $('[data-pu]').textContent = p.u; $('[data-mean]').textContent = p.mean;
    $('[data-foodleft]').innerHTML = foodLeftHTML();
    roll($('[data-fpn]'), String(Math.round(C.left(d).p)));
    $('[data-fkcal]').textContent = num(C.left(d).kcal);
    $('[data-meals]').innerHTML = mealsHTML();
  };
  T.every(15000, () => { if (!document.hidden && !w.started) { const p = poster(); $('[data-mean]').textContent = p.mean; } });
  app.addEventListener('click', (e) => { const b = e.target.closest('[data-demo]'); if (b) setDay(b.dataset.demo); });

  /* ---------- Food: one Add button, chips by the hour, a portion step that names the kcal ---------- */
  $$('.add-food').forEach((b) => { pressable(b); b.addEventListener('click', () => openAdd()); });
  function openAdd() {
    const chips = C.chipsNow();
    const s = C.sheet(app, {
      cls: 'rm-sheet', label: 'Add food',
      html: `<h2 class="sh-t">Add food</h2>
        <form class="af-form"><input class="af-in" type="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="Search, or “200 g skyr og to æg”" aria-label="Search food"></form>
        <div class="af-body"><h3 class="sh-k">Right now</h3><ul class="af-list">${chips.map((c, i) => `<li><button data-pick="${c.f.id}"><span><b>${esc(c.f.name)}</b><small class="num">${C.amtLabel(c.f, c.amt)} · ${num(C.macros(c.f, c.amt).kcal)} kcal · ${Math.round(C.macros(c.f, c.amt).p)} g protein</small></span><i>${I.plus}</i></button></li>`).join('')}</ul></div>`,
    });
    const body = $('.af-body', s.body), inp = $('.af-in', s.body);
    const pick = (f) => {
      let amt = f.portion;
      const draw = () => {
        const m = C.macros(f, amt);
        body.innerHTML = `<div class="portion"><h3>${esc(f.name)}</h3>
          <div class="pchips">${f.chips.map((a) => `<button class="pc${a === amt ? ' on' : ''}" data-amt="${a}" aria-pressed="${a === amt}">${C.amtLabel(f, a)}</button>`).join('')}</div>
          <p class="pm"><b class="num">${Math.round(m.p)} g</b> protein · leaves <b class="num">${Math.max(0, Math.round(C.left(d).p - m.p))} g</b> to go</p>
          <button class="btn confirm">Add ${num(m.kcal)} kcal</button></div>`;
        play(body.firstElementChild, [{ opacity: 0, transform: 'translateX(14px)' }, { opacity: 1, transform: 'none' }], SPRINGS.set);
      };
      draw();
      body.onclick = (e) => {
        const a = e.target.closest('[data-amt]'); if (a) { amt = +a.dataset.amt; draw(); return; }
        if (e.target.closest('.confirm')) { s.close(); log([{ f, amt }]); }
      };
    };
    s.body.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (b) pick(C.food(b.dataset.pick)); });
    inp.addEventListener('input', () => {
      const q = inp.value.trim().toLowerCase();
      if (!q) return;
      const hits = C.FOODS.filter((f) => f.name.toLowerCase().includes(q) || f.da.some((n) => n.startsWith(q)));
      body.onclick = null;
      body.innerHTML = hits.length ? `<ul class="af-list">${hits.map((f) => `<li><button data-pick="${f.id}"><span><b>${esc(f.name)}</b><small class="num">${f.piece ? '1 ' + f.piece : '100 ' + (f.unit || 'g')} · ${f.kcal} kcal</small></span><i>${I.plus}</i></button></li>`).join('')}</ul>` : '<p class="empty">Press search to read a whole sentence like “200 g skyr og to æg”.</p>';
    });
    $('.af-form', s.body).addEventListener('submit', (e) => {
      e.preventDefault();
      const items = C.parseFood(inp.value);
      if (!items) { body.innerHTML = `<p class="reply"><span class="by">Coach</span>${esc(C.COACH_PROTO)}</p>`; return; }
      const tot = items.reduce((a, it) => a + C.macros(it.f, it.amt).kcal, 0);
      body.onclick = null;
      body.innerHTML = `<ul class="af-list tray">${items.map((it) => `<li><span><b>${esc(it.f.name)}</b><small class="num">${C.amtLabel(it.f, it.amt)} · ${num(C.macros(it.f, it.amt).kcal)} kcal</small></span></li>`).join('')}</ul><button class="btn confirm">Add ${num(tot)} kcal</button>`;
      $('.confirm', body).addEventListener('click', () => { s.close(); log(items); });
      inp.blur();
    });
  }
  function log(items) {
    const entry = C.addFood(d, items);
    const m = C.entryMacros(entry);
    refresh();
    C.buzz(10);
    C.toast(app, `${esc(C.entryName(entry))} · <b class="num">${num(m.kcal)} kcal</b> in ${entry.meal}`, { undo: () => { C.removeEntry(d, entry); refresh(); } });
  }

  /* ---------- Ask: the Coach's door, same place in every room ---------- */
  const askBtn = $('.ask');
  pressable(askBtn, { scale: 0.92 });
  const histHTML = () => (w.history.length ? w.history.map((pr) => { const h = C.historyLine(pr); return `<li><b class="num">${h.what}</b><span>${esc(C.scopeLine(pr))}</span><small>${esc(h.status)}</small></li>`; }).join('') : '<li class="none">Nothing changed today.</li>');
  askBtn.addEventListener('click', () => {
    const s = C.sheet(app, {
      cls: 'rm-sheet', label: 'Ask the Coach',
      html: `<h2 class="sh-t">Ask the Coach</h2><p class="coach small"><span class="by">Coach</span>${esc(coachToday)}</p>
        <form class="af-form ask-form"><input class="af-in" type="text" enterkeyhint="send" autocomplete="off" placeholder="Why is my bench stuck?" aria-label="Ask the Coach"><button class="btn send">Ask</button></form>
        <div class="ask-out" aria-live="polite"></div>
        <h3 class="sh-k">Changes the Coach made today</h3><ul class="hist">${histHTML()}</ul>`,
    });
    $('.ask-form', s.body).addEventListener('submit', (e) => {
      e.preventDefault();
      const v = $('.af-in', s.body).value; const r = C.parseLog(v);
      const out = $('.ask-out', s.body);
      if (r?.kind === 'food') { s.close(); log(r.items); return; }
      if (r?.kind === 'water') { s.close(); d.water += r.ml; C.toast(app, `Water <b class="num">${r.ml} ml</b> logged`, { undo: () => { d.water -= r.ml; } }); return; }
      if (r?.kind === 'weight') { s.close(); C.toast(app, `Weight <b class="num">${kg(r.kg)} kg</b> logged`, { undo: () => {} }); return; }
      if (r) out.innerHTML = `<p class="reply"><span class="by">Coach</span>${esc(C.COACH_PROTO)}</p>`;
    });
  });

  /* ---------- The workout ---------- */
  const wo = $('.wo');
  const woY = new Channel(wo, 'translate', (v) => `0 ${v}px`, 0);
  const live = $('.live');
  const fRest = $('.f-rest');
  const restOp = new Channel(fRest, 'opacity', (v) => String(v), 0);
  const openWo = () => {
    if (woOpen) return; woOpen = true;
    if (!$('.f-work').firstChild) { paint($('.f-work'), 'train'); paint(fRest, 'rest'); }
    if (wo.hidden) woY.set(app.clientHeight); // reopened mid-close: carry on from where it is
    wo.hidden = false; woY.to(0, SPRINGS.set);
    live.hidden = true; app.style.removeProperty('--toast-bottom'); app.classList.remove('has-live');
    C.keepAwake(true);
  };
  const closeWo = () => {
    woOpen = false;
    const a = woY.to(app.clientHeight, SPRINGS.set);
    const done = () => { if (!woOpen) wo.hidden = true; };
    a ? a.finished.then(done, done) : done();
    live.hidden = false; app.style.setProperty('--toast-bottom', '170px'); app.classList.add('has-live');
    play(live, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], SPRINGS.set, { delay: 120 });
    renderLive();
  };
  $$('.start').forEach((b) => { pressable(b); b.addEventListener('click', () => {
    if (!w.started) w.started = C.now();
    $$('.start').forEach((x) => { x.textContent = 'Back to Push'; });
    renderAll(); openWo(); refresh();
  }); });
  $('.wo-close').addEventListener('click', closeWo);
  live.addEventListener('click', openWo);
  pressable(live, { scale: 0.98 });

  const doneList = $('.wo-done'), hWork = $('.h-work'), hRest = $('.h-rest');
  const workOp = new Channel(hWork, 'opacity', (v) => String(v), 1, { hideAt: 0 });
  const workS = new Channel(hWork, 'scale', (v) => String(v), 1);
  const restLOp = new Channel(hRest, 'opacity', (v) => String(v), 0, { hideAt: 0 });
  const restS = new Channel(hRest, 'scale', (v) => String(v), 1.06);
  const cta = $('.cta'), ctaL = $('.cta-l'), val = $('.setval');
  pressable(cta, { scale: 0.97 }); pressable(val, { scale: 0.97 });

  const doneHTML = () => C.curEx(w).sets.map((s, i) => (s.done ? `<li class="${s.record ? 'best' : ''}"><span class="sr">Set ${i + 1}:</span><span class="dv num">${kg(s.w)}×${s.r}</span>${s.record ? '<mark class="rec">Best</mark>' : '<i aria-hidden="true">✓</i>'}</li>` : `<li class="todo${i === C.curIdx(w) ? ' cur' : ''}"><span class="sr">Set ${i + 1} not done</span><span class="num">${i + 1}</span></li>`)).join('');
  const deltaLine = (ns) => {
    if (ns.lastR == null) return '';
    const dw = ns.w - ns.lastW, dr = ns.r - ns.lastR;
    const base = `Last time ${kg(ns.lastW)} × ${ns.lastR}`;
    if (dw > 0) return `${base} · <b>+${kg(dw)} kg</b>`;
    if (dr > 0) return `${base} · <b>+${dr} rep${dr > 1 ? 's' : ''}</b>`;
    return `${base} · same`;
  };
  const thenLine = () => { const n = C.nextUp(w); return n ? (n.same ? `Then set ${n.n} · ${kg(n.w)} × ${n.r}` : `Then ${esc(n.name)} · ${kg(n.w)} × ${n.r}`) : 'Last set of the workout'; };
  const metaLine = (ns) => { $('[data-meta]').textContent = w.phase === 'rest' ? `Set ${ns.n - 1} of ${ns.of} done` : `Set ${ns.n} of ${ns.of}`; };
  function renderWork({ animate = false } = {}) {
    const ns = C.nowSet(w);
    if (!ns) { if (w.phase === 'work') { ctaL.textContent = 'All sets logged'; cta.disabled = true; } return; }
    const set = (el, t) => (animate ? roll(el, t, { dir: parseFloat(t) < parseFloat(el.dataset.text ?? el.textContent) ? -1 : 1 }) : (el.textContent = t, el.dataset.text = t));
    set($('.vw'), kg(ns.w)); set($('.vr'), String(ns.r));
    metaLine(ns);
    $('[data-delta]').innerHTML = deltaLine(ns);
    $('[data-then]').innerHTML = thenLine();
    $('.coachtag').hidden = !ns.coach;
    $('.setval').classList.toggle('long', kg(ns.w).length > 3);
    if (w.phase === 'work') set(ctaL, `Log ${kg(ns.w)} × ${ns.r}`);
  }
  function renderRest() {
    $('.count').textContent = C.mmss(C.restLeft(w));
    const n = C.nowSet(w), t = n || C.nextUp(w);
    if (t) {
      const rn = $('[data-rest-next]'), was = rn.querySelector('b')?.textContent;
      rn.innerHTML = `Next · ${n ? `set ${t.n}` : esc(t.name)} · <b class="num">${kg(t.w)} × ${t.r}</b>`;
      const fig = rn.querySelector('b');
      if (was && was !== fig.textContent && w.phase === 'rest') play(fig, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], SPRINGS.type);
      const ex = n ? n.ex : w.exercises.find((e) => e.name === t.name);
      $('[data-plates]').textContent = ex?.barbell ? `Load each side: ${C.plates(t.w).join(' + ')} kg` : '';
    } else { $('[data-rest-next]').textContent = 'That was the last set.'; $('[data-plates]').textContent = ''; }
  }
  function renderLive() {
    $('[data-lv-time]').textContent = C.elapsed(w);
    const ns = C.nowSet(w);
    $('[data-lv-what]').textContent = w.phase === 'rest' ? `Resting ${C.mmss(C.restLeft(w))}` : ns ? `${kg(ns.w)} × ${ns.r} next` : 'All done';
  }
  function setState(phase) {
    wo.dataset.phase = phase;
    roll($('[data-state]'), STATE_WORD[phase]);
  }
  function renderAll() { $('.tt').textContent = C.curEx(w).name; doneList.innerHTML = doneHTML(); renderWork(); renderCoach(); }
  T.every(1000, () => { if (document.hidden) return; $('.wo-time').textContent = C.elapsed(w); if (!live.hidden) renderLive(); });

  cta.addEventListener('click', () => { if (w.phase === 'rest') { C.endRest(w, false); return; } C.buzz(12); C.logSet(w); });
  val.addEventListener('click', () => { if (w.phase === 'work') C.stepper(app, w, { cls: 'rm-sheet', roll }); });
  $$('[data-adj]').forEach((b) => { pressable(b); b.addEventListener('click', () => { C.nudgeRest(w, +b.dataset.adj); renderRest(); }); });

  C.on(w, (kind, data) => {
    if (kind === 'logged') {
      const from = $('.vw').getBoundingClientRect();
      flip([...doneList.children], () => { doneList.innerHTML = doneHTML(); }, SPRINGS.set);
      const i = C.curEx(w).sets.indexOf(data.set);
      const chip = doneList.children[i]?.querySelector('.dv');
      if (chip) travel(chip, { left: from.left, top: from.top, width: chip.getBoundingClientRect().width * 2.6 }, SPRINGS.type);
      const mk = doneList.children[i]?.querySelector('.rec');
      if (mk) play(mk, [{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.press, { delay: 160 });
      const nx = C.nowSet(w); if (nx) metaLine(nx); // the outgoing number keeps its value while it leaves
      renderRest();
      workOp.to(0, OUT); workS.to(0.94, SPRINGS.set); // the outgoing number leaves fast: no two big numerals overlapping
      if (restLOp.now().x < 0.02) restS.set(0.94);
      restOp.to(1, SPRINGS.set);
      T.after(80, () => { if (w.phase !== 'rest') return; restLOp.to(1, SPRINGS.set); restS.to(1, SPRINGS.set); });
      setState('rest'); roll(ctaL, 'Skip rest');
      renderCoach();
    } else if (kind === 'tick') { renderRest(); if (!live.hidden) renderLive(); }
    else if (kind === 'rest-end') {
      if (data.moved) { play($('.tt'), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], SPRINGS.set); $('.tt').textContent = C.curEx(w).name; }
      flip([...doneList.children], () => { doneList.innerHTML = doneHTML(); }, SPRINGS.set);
      setState('work');
      const seen = workOp.now().x > 0.02; // skipped straight away: the old number is still on its way out
      renderWork({ animate: seen });
      if (!seen) workS.set(1.06);
      restLOp.to(0, OUT); restS.to(0.94, SPRINGS.set);
      restOp.to(0, SPRINGS.set);
      T.after(80, () => { if (w.phase !== 'work') return; workOp.to(1, SPRINGS.set); workS.to(1, SPRINGS.set); });
      renderCoach();
      if (!live.hidden) renderLive();
    } else if (kind === 'value') renderWork({ animate: true });
    else if (kind === 'proposal') { renderCoach(data); renderWork({ animate: true }); if (w.phase === 'rest') renderRest(); }
  });

  /* ---------- Coach slot: proposal (hollow number, two buttons), accepted (solid, Undo), done ---------- */
  const slot = $('.wo-coach');
  let slotState = 'none';
  function renderCoach(ev = {}) {
    const pr = w.proposal;
    let st = 'none';
    if (pr?.state === 'open') st = 'open'; else if (pr?.state === 'accepted') st = 'accepted'; else if (pr && ['completed', 'undone', 'kept'].includes(pr.state)) st = 'note';
    const html = st === 'open' ? `<div class="draft" role="group" aria-label="The Coach suggests a change">
        <p class="dr-top"><span class="dr-k">${I.ask}Coach suggests</span><span class="dr-scope">${esc(C.scopeLine(pr))}</span></p>
        <p class="dr-val"><span class="new num" aria-label="${kg(pr.to)} kilograms">${kg(pr.to)}</span><span class="u">kg</span><s class="num">${kg(pr.from)}</s></p>
        <p class="dr-why">${esc(pr.reason)}</p>
        <div class="dr-acts"><button class="use">Use ${kg(pr.to)} kg</button><button class="keep">Keep ${kg(pr.from)}</button></div></div>`
      : st === 'accepted' ? `<div class="applied"><span class="ap-k">${I.ask}Coach</span><span class="ap-t">${pr.scope.length ? `Set${pr.scope.length > 1 ? 's' : ''} ${pr.scope.map((x) => x + 1).join(' and ')}: <b class="num">${kg(pr.to)} kg</b>` : ''}</span><button class="ap-undo">Undo</button></div>`
      : st === 'note' ? `<p class="cnote"><span class="ap-k">${I.ask}Coach</span>${esc(C.historyLine(pr).what)} · ${esc(C.historyLine(pr).status)}</p>` : '';
    const prev = slot.querySelector(':scope > :not(.ghost)');
    if (st === slotState && prev) { prev.outerHTML = html; wire(); return; }
    const was = slotState; slotState = st;
    const tmp = document.createElement('div'); tmp.innerHTML = html; const el = tmp.firstElementChild;
    // The hero is laid out from the top of the screen, so the slot filling or emptying never moves it.
    const gh = prev ? ghost(prev) : null;
    const top0 = slot.getBoundingClientRect().top;
    prev?.remove();
    if (el) slot.append(el);
    if (gh) { gh.g.style.top = parseFloat(gh.g.style.top) - (slot.getBoundingClientRect().top - top0) + 'px'; slot.append(gh.g); fadeGhost(gh.g); }
    if (el) {
      play(el, [{ opacity: 0, transform: 'translateY(10px) scale(0.98)' }, { opacity: 1, transform: 'none' }], SPRINGS.set);
      // Accepting fills the hollow number: the "ink" pours in on the accepted card's number.
      if (was === 'open' && st === 'accepted') { const b = el.querySelector('b'); if (b) play(b, [{ opacity: 0.2 }, { opacity: 1 }], SPRINGS.type); }
    }
    void ev; wire();
  }
  function wire() {
    const u = $('.use', slot);
    if (u && !u.dataset.wired) { u.dataset.wired = '1'; pressable(u); u.addEventListener('click', () => { if (C.accept(w)) C.buzz(14); }); }
    const k = $('.keep', slot); if (k && !k.dataset.wired) { k.dataset.wired = '1'; pressable(k); k.addEventListener('click', () => C.keep(w)); }
    const un = $('.ap-undo', slot); if (un && !un.dataset.wired) { un.dataset.wired = '1'; pressable(un); un.addEventListener('click', () => C.undo(w)); }
  }

  $('.wo-title').addEventListener('click', () => {
    const s = C.sheet(app, {
      cls: 'rm-sheet', label: 'All exercises',
      html: `<h2 class="sh-t">Push</h2><ul class="exlist">${w.exercises.map((e, j) => `<li><button class="ex${j === w.cur ? ' cur' : ''}" data-ex="${j}"${w.phase === 'rest' && j !== w.cur ? ' disabled' : ''}><b>${esc(e.name)}</b><span class="num">${e.sets.filter((x) => x.done).length} of ${e.sets.length}</span></button></li>`).join('')}</ul>
        ${w.phase === 'rest' ? '<p class="empty">You can switch exercise after the rest.</p>' : ''}
        <h3 class="sh-k">Changes the Coach made today</h3><ul class="hist">${histHTML()}</ul>`,
    });
    s.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ex]'); if (!b || b.disabled) return;
      const j = +b.dataset.ex; if (j !== w.cur && w.exercises[j].sets.some((x) => !x.done)) { w.cur = j; renderAll(); }
      s.close();
    });
  });

  renderAll();
  return () => { T.stop(); C.keepAwake(false); app.remove(); };
}
