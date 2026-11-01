/* The ordinary control: the conventional tracker pattern (a Hevy-style workout table, a MyFitnessPal-style diary
   with meal sections), built fresh, not copied. It is here for the crop test and the 5-second test, so it is
   deliberately plain: system font, white cards, one blue. No Coach. */
import { SPRINGS, play, pressable } from './motion.js';
import * as C from './core.js';

const { esc, kg, num } = C;
const I = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v9H4z"/></svg>',
  workout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></svg>',
  diary: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  progress: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V11M10 19V6M16 19v-5M22 19H2"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
};

export function plain(stage, { day = 'train', setDay }) {
  const d = C.createDay(day);
  const w = C.createWorkout();
  const T = w.t;
  const app = document.createElement('div');
  app.className = 'app pl';
  stage.append(app);
  let tab = 'home', active = false, restEnd = 0, restTimer = null;

  const ring = () => {
    const e = C.eaten(d), f = Math.min(1, e.kcal / d.target.kcal), r = 52, c = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 128 128" aria-hidden="true"><circle cx="64" cy="64" r="${r}" fill="none" stroke="var(--track)" stroke-width="12"/><circle cx="64" cy="64" r="${r}" fill="none" stroke="var(--blue)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" transform="rotate(-90 64 64)"/></svg>`;
  };
  const homeHTML = () => {
    const e = C.eaten(d), l = C.left(d);
    return `<h1 class="h1">Today</h1>
    <section class="card"><h2 class="h2">Calories</h2><p class="cap">Remaining = Goal − Food + Exercise</p>
      <div class="cal"><div class="ring-w">${ring()}<div class="ring-n"><b class="num">${num(l.kcal)}</b><span>Remaining</span></div></div>
      <ul class="eq"><li><span>Goal</span><b class="num">${num(d.target.kcal)}</b></li><li><span>Food</span><b class="num">${num(e.kcal)}</b></li><li><span>Exercise</span><b class="num">0</b></li></ul></div></section>
    <section class="card"><h2 class="h2">Macros</h2><div class="bar-row"><span>Protein</span><span class="num">${Math.round(e.p)} / ${d.target.p} g</span></div><div class="pbar"><i style="width:${Math.min(100, (e.p / d.target.p) * 100)}%"></i></div></section>
    ${d.kind === 'train' ? `<section class="card"><h2 class="h2">Workout</h2><p class="cap">Push · 5 exercises${w.finished ? ' · completed' : ''}</p>${w.finished ? '' : `<button class="btn blue start">${active ? 'Resume Workout' : 'Start Routine'}</button>`}</section>` : '<section class="card"><h2 class="h2">Workout</h2><p class="cap">No routine scheduled today.</p></section>'}
    ${C.demoSwitch(d.kind)}`;
  };
  const diaryHTML = () => {
    const e = C.eaten(d), l = C.left(d);
    return `<h1 class="h1">Diary</h1>
    <section class="card eqline"><p class="cap">Calories Remaining</p><div class="eqrow"><span><b class="num">${num(d.target.kcal)}</b><small>Goal</small></span><i>−</i><span><b class="num">${num(e.kcal)}</b><small>Food</small></span><i>+</i><span><b class="num">0</b><small>Exercise</small></span><i>=</i><span><b class="num blue-t">${num(l.kcal)}</b><small>Remaining</small></span></div></section>
    ${['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((m) => {
      const key = m === 'Snacks' ? 'Snack' : m;
      const items = d.log.filter((x) => x.meal === key).flatMap((x) => x.items.map((it) => ({ it, x })));
      const k = items.reduce((a, { it }) => a + C.macros(it.f, it.amt).kcal, 0);
      return `<section class="card meal"><div class="mh"><h2 class="h2">${m}</h2><span class="num">${items.length ? num(k) : ''}</span></div>
        ${items.map(({ it }) => `<div class="mi"><span>${esc(it.f.name)}<small class="num">${C.amtLabel(it.f, it.amt)}</small></span><span class="num">${num(C.macros(it.f, it.amt).kcal)}</span></div>`).join('')}
        <button class="addf" data-meal="${key}">ADD FOOD</button></section>`;
    }).join('')}`;
  };
  const exHTML = () => w.exercises.map((e, j) => `<section class="ex" data-ex="${j}"><h2 class="exn">${esc(e.name)}</h2><p class="cap">Rest Timer: ${C.mmss(C.REST)}</p>
    <div class="tbl"><div class="th"><span>SET</span><span>PREVIOUS</span><span>KG</span><span>REPS</span><span>✓</span></div>
    ${e.sets.map((s, i) => `<div class="tr${s.done ? ' done' : ''}" data-set="${i}"><span class="num">${i + 1}</span><span class="num prev">${kg(e.last[0])} × ${e.last[1][i] ?? '–'}</span><input class="num" inputmode="decimal" value="${kg(s.w)}" aria-label="Kilograms, set ${i + 1}" data-f="w"><input class="num" inputmode="numeric" value="${s.r}" aria-label="Reps, set ${i + 1}" data-f="r"><button class="tick" aria-label="Complete set ${i + 1}" aria-pressed="${s.done}">${I.check}</button></div>`).join('')}
    </div><button class="addset" data-add="${j}">+ Add Set</button></section>`).join('');

  app.innerHTML = `
    <section class="panel" data-panel="home"><div class="scroll"><div class="pad" data-home>${homeHTML()}</div></div></section>
    <section class="panel" data-panel="workout" hidden><div class="scroll"><div class="pad"><h1 class="h1">Workout</h1>
      <h2 class="h2 sp">Routines</h2>
      <section class="card"><h2 class="h2">Push</h2><p class="cap">Bench Press, Incline Dumbbell Press, Overhead Press, Cable Fly, Triceps Pushdown</p>${d.kind === 'train' ? '<button class="btn blue start">Start Routine</button>' : ''}</section>
      <section class="card"><h2 class="h2">Pull</h2><p class="cap">Pull-up, Barbell Row, Lat Pulldown, Curl, Face Pull</p></section>
      <section class="card"><h2 class="h2">Legs</h2><p class="cap">Squat, Romanian Deadlift, Leg Press, Lateral Raise</p></section>
    </div></div></section>
    <section class="panel" data-panel="diary" hidden><div class="scroll"><div class="pad" data-diary>${diaryHTML()}</div></div></section>
    <section class="panel" data-panel="progress" hidden><div class="scroll"><div class="pad"><h1 class="h1">Progress</h1>
      <section class="card"><h2 class="h2">Weight</h2>${C.chart(C.WEIGHT_WEEKS, { fmt: (v) => v.toFixed(1) + ' kg' })}</section>
      <section class="card"><h2 class="h2">Bench Press · Est. 1RM</h2>${C.chart(C.BENCH_WEEKS.map(([a, b]) => C.e1rm(a, b)), { fmt: (v) => v.toFixed(1) + ' kg' })}</section>
    </div></div></section>
    <button class="mini" hidden><span><b>Push</b> <span class="num" data-mini-t>0:00</span></span><span class="blue-t">Resume</span></button>
    <nav class="nav">${[['home', 'Home'], ['workout', 'Workout'], ['diary', 'Diary'], ['progress', 'Progress']].map(([k, l], i) => `<button class="nb" data-tab="${k}"${i ? '' : ' aria-current="page"'}>${I[k]}<span>${l}</span></button>`).join('')}</nav>
    <section class="wo" hidden aria-label="Workout">
      <header class="wh"><button class="icon wmin" aria-label="Minimise">${I.down}</button><span class="wt">Log Workout</span><button class="btn blue sm fin">Finish</button></header>
      <div class="stats"><span><small>Duration</small><b class="num" data-dur>0:00</b></span><span><small>Volume</small><b class="num" data-vol>0 kg</b></span><span><small>Sets</small><b class="num" data-sets>0</b></span></div>
      <div class="scroll wscroll"><div class="pad">${exHTML()}</div></div>
      <div class="rest" hidden><div class="rbar"><i></i></div><div class="rrow"><button data-r="-15">−15</button><b class="num" data-rest>0:40</b><button data-r="15">+15</button><button class="skip">Skip</button></div></div>
    </section>`;

  const $ = (s, r = app) => r.querySelector(s);
  const $$ = (s, r = app) => [...r.querySelectorAll(s)];
  const showTab = (t) => {
    tab = t;
    $$('.panel').forEach((p) => { p.hidden = p.dataset.panel !== t; });
    $$('.nb').forEach((b) => (b.dataset.tab === t ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  };
  $$('.nb').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  const redraw = () => { $('[data-home]').innerHTML = homeHTML(); $('[data-diary]').innerHTML = diaryHTML(); };

  app.addEventListener('click', (e) => {
    const dm = e.target.closest('[data-demo]'); if (dm) { setDay(dm.dataset.demo); return; }
    if (e.target.closest('.start')) { openWo(); return; }
    const af = e.target.closest('.addf'); if (af) { openSearch(af.dataset.meal); return; }
  });

  /* ---------- Food: search page, then a serving page, then back to the diary ---------- */
  function openSearch(meal) {
    const s = C.sheet(app, {
      cls: 'pl-sheet', label: 'Add food',
      html: `<h2 class="h2">Add Food to ${meal === 'Snack' ? 'Snacks' : meal}</h2><input class="search" type="search" placeholder="Search for a food" aria-label="Search for a food" autocomplete="off">
        <p class="cap">History</p><ul class="res">${C.FOODS.map((f) => `<li><button data-f="${f.id}"><span>${esc(f.name)}<small class="num">${f.piece ? '1 ' + f.piece : '100 ' + (f.unit || 'g')}, ${f.kcal} cal</small></span><b>+</b></button></li>`).join('')}</ul>`,
    });
    const body = s.body;
    $('.search', body).addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      $$('.res li', body).forEach((li) => { li.hidden = !li.textContent.toLowerCase().includes(q); });
    });
    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-f]');
      if (b) {
        const f = C.food(b.dataset.f); let amt = f.portion;
        const draw = () => {
          const m = C.macros(f, amt);
          body.innerHTML = `<h2 class="h2">${esc(f.name)}</h2><p class="cap">Serving Size</p><div class="servs">${f.chips.map((a) => `<button class="sv${a === amt ? ' on' : ''}" data-a="${a}">${C.amtLabel(f, a)}</button>`).join('')}</div>
            <div class="nut"><span>Calories<b class="num">${num(m.kcal)}</b></span><span>Protein<b class="num">${Math.round(m.p)} g</b></span></div><button class="btn blue addit">Add</button>`;
        };
        draw();
        body.onclick = (ev) => {
          const sv = ev.target.closest('[data-a]'); if (sv) { amt = +sv.dataset.a; draw(); return; }
          if (ev.target.closest('.addit')) { d.log.push({ t: C.now(), meal, items: [{ f, amt }] }); s.close(); redraw(); C.toast(app, `${esc(f.name)} added to ${meal}`); }
        };
      }
    });
  }

  /* ---------- Workout: a table per exercise, tick to complete, rest bar at the bottom ---------- */
  const wo = $('.wo');
  function openWo() {
    if (!w.started) w.started = C.now();
    active = true; wo.hidden = false; $('.mini').hidden = true;
    play(wo, [{ transform: 'translateY(100%)' }, { transform: 'none' }], SPRINGS.set);
    C.keepAwake(true);
  }
  $('.wmin').addEventListener('click', () => { wo.hidden = true; $('.mini').hidden = false; redraw(); });
  $('.mini').addEventListener('click', openWo);
  const stats = () => {
    let vol = 0, n = 0;
    w.exercises.forEach((e) => e.sets.forEach((s) => { if (s.done) { vol += s.w * s.r; n++; } }));
    $('[data-vol]').textContent = `${num(vol)} kg`; $('[data-sets]').textContent = n;
  };
  T.every(1000, () => { if (document.hidden) return; $('[data-dur]').textContent = C.elapsed(w); $('[data-mini-t]').textContent = C.elapsed(w); });
  const restEl = $('.rest');
  let bar = null;
  const startRest = (secs) => {
    restEnd = C.now() + secs; restEl.hidden = false;
    bar?.cancel(); bar = $('.rbar i').animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: secs * 1000, easing: 'linear', fill: 'forwards' });
    T.clear(restTimer);
    restTimer = T.every(250, () => {
      const left = restEnd - C.now();
      $('[data-rest]').textContent = C.mmss(left);
      if (left <= 0) { T.clear(restTimer); restEl.hidden = true; C.buzz([90, 70, 90]); }
    });
  };
  wo.addEventListener('click', (e) => {
    const t = e.target.closest('.tick');
    if (t) {
      const row = t.closest('.tr'), j = +row.closest('.ex').dataset.ex, i = +row.dataset.set, s = w.exercises[j].sets[i];
      s.w = parseFloat($('[data-f="w"]', row).value.replace(',', '.')) || s.w; s.r = parseInt($('[data-f="r"]', row).value, 10) || s.r;
      s.done = !s.done; row.classList.toggle('done', s.done); t.setAttribute('aria-pressed', String(s.done));
      if (s.done) { C.buzz(12); startRest(C.REST); }
      stats(); return;
    }
    const add = e.target.closest('[data-add]');
    if (add) { const ex = w.exercises[+add.dataset.add]; const last = ex.sets[ex.sets.length - 1]; ex.sets.push({ w: last.w, r: last.r, done: false }); const sc = $('.wscroll'), top = sc.scrollTop; $('.wscroll .pad').innerHTML = exHTML(); sc.scrollTop = top; return; }
    const r = e.target.closest('[data-r]'); if (r) { restEnd = Math.max(C.now() + 1, restEnd + +r.dataset.r); startRest(restEnd - C.now()); return; }
    if (e.target.closest('.skip')) { T.clear(restTimer); bar?.cancel(); restEl.hidden = true; return; }
    if (e.target.closest('.fin')) {
      const left = w.exercises.reduce((a, x) => a + x.sets.filter((s) => !s.done).length, 0);
      const s = C.sheet(app, { cls: 'pl-sheet', label: 'Finish workout', html: `<h2 class="h2">Finish workout?</h2><p class="cap">${left ? `${left} sets are not completed and will be discarded.` : 'All sets are completed.'}</p><button class="btn blue save">Save Workout</button><button class="btn grey cancel">Keep Logging</button>` });
      s.body.addEventListener('click', (ev) => {
        if (ev.target.closest('.cancel')) s.close();
        if (ev.target.closest('.save')) { s.close(); active = false; wo.hidden = true; $('.mini').hidden = true; C.keepAwake(false); w.finished = true; redraw(); C.toast(app, 'Workout saved'); }
      });
    }
  });
  pressable($('.fin'));
  return () => { T.stop(); C.keepAwake(false); app.remove(); };
}
