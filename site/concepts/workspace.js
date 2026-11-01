/* B3 · The Conversation Workspace. One request line; the answer changes the objects themselves (workout, week, a new bench panel). */
import { enter, flip, foldAway, play, playFromHere, benchChart, makeSky, SPRING, SPRING_LIVELY, SPRING_EXIT } from './kit.js';
import { BENCH, benchFacts, PLAN, CUT25, minutes } from './data.js';

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SCALE = 40; // the time bar shows 0 to 40 minutes
const WEEK = [
  ['Sun', 'Push', true], ['Mon', 'Wrestling'], ['Tue', 'Pull'], ['Wed', 'Legs'], ['Thu', 'Wrestling'], ['Fri', 'Push'], ['Sat', 'Rest'],
];

export function workspace(stage, { sky = false } = {}) {
  const root = document.createElement('div');
  root.className = 'variant ws' + (sky ? ' sky-on' : '');
  let skyObj = null;
  if (sky) { skyObj = makeSky(); root.append(skyObj.el); }
  const g = sky ? ' glass' : '';
  const total = minutes(PLAN.todo);

  const exRow = (x) => `<div class="ex" data-id="${x.id}">
      <div class="ex-top"><span class="ex-name">${x.name}</span><span class="ex-spec"><span class="n">${x.sets}</span> × ${x.reps} · ${x.kg} kg</span></div>
      <div class="ticks">${Array.from({ length: x.sets }, (_, i) => `<button class="tick" type="button" aria-label="Set ${i + 1} done">${i + 1}</button>`).join('')}</div>
    </div>`;

  root.insertAdjacentHTML('beforeend', `
    <nav class="ws-shelf" aria-label="Open things">
      <button class="tab" type="button" data-p="today" style="--c:var(--accent)"><i></i>Today</button>
      <button class="tab on" type="button" data-p="workout" style="--c:var(--workout)"><i></i>Workout</button>
      <button class="tab" type="button" data-p="week" style="--c:var(--week)"><i></i>Week</button>
    </nav>
    <div class="ws-track">
      <section class="panel" data-p="today" aria-label="Today">
        <div class="obj${g}">
          <div class="obj-kind" style="--c:var(--accent)">Today · Sun 1 Nov</div>
          <div class="obj-head"><h2>On track</h2><span class="meta">16:40</span></div>
          <div class="stat"><span>Protein</span><b>96 of 180 g</b></div>
          <div class="stat"><span>Food</span><b>1,180 of 2,450 kcal</b></div>
          <div class="stat"><span>Sleep last night</span><b>6 h 20</b></div>
          <div class="stat"><span>Workout</span><b class="wk-stat">Push · 1 of 5 done</b></div>
        </div>
      </section>
      <section class="panel" data-p="workout" aria-label="Workout">
        <div class="obj wk${g}">
          <div class="obj-kind" style="--c:var(--workout)">Workout · in progress</div>
          <div class="obj-head"><h2>${PLAN.title}</h2><span class="meta">started 16:05</span></div>
          <div class="ex done"><div class="ex-top"><span class="ex-name">${PLAN.done[0].name}</span><span class="ex-spec">${PLAN.done[0].sets}</span></div>
            <div class="ticks">${[1, 2, 3, 4].map((i) => `<button class="tick on" type="button" aria-label="Set ${i} done">${i}</button>`).join('')}</div></div>
          ${PLAN.todo.map(exRow).join('')}
          <div class="timebar">
            <div class="lbl"><span class="lt">About ${total} min of sets left</span><span class="rt"></span></div>
            <div class="track"><div class="bar"><div class="fill" style="transform:translate3d(${(total / SCALE - 1) * 100}%, 0, 0)"></div></div><div class="mark" hidden style="left:${(25 / SCALE) * 100}%"></div></div>
          </div>
          <div class="edit-slot"></div>
        </div>
      </section>
      <section class="panel" data-p="week" aria-label="Week">
        <div class="obj${g}">
          <div class="obj-kind" style="--c:var(--week)">Week · next 7 days</div>
          <div class="obj-head"><h2>Plan</h2><span class="meta">3 push · 2 mat</span></div>
          ${WEEK.map(([d, w, t]) => `<div class="day${t ? ' today' : ''}" data-d="${d}"><b>${d}</b><span>${w}</span></div>`).join('')}
        </div>
      </section>
    </div>
    <div class="ws-foot">
      <div class="ws-say" hidden></div>
      <div class="chips">
        <button class="chip" type="button" data-say="Why has my bench stalled?">Why has my bench stalled?</button>
        <button class="chip" type="button" data-say="I have 25 minutes left">I have 25 minutes left</button>
        <button class="chip" type="button" data-say="Show my week">Show my week</button>
      </div>
      <form class="line glass" autocomplete="off"><input name="q" placeholder="Ask or tell Aven…" enterkeyhint="send" aria-label="Ask or tell Aven"><button class="send" type="submit" aria-label="Send">↑</button></form>
    </div>`);
  stage.append(root);

  const shelf = root.querySelector('.ws-shelf'), track = root.querySelector('.ws-track');
  const say = root.querySelector('.ws-say');
  const panels = () => [...track.querySelectorAll('.panel')];
  const tabs = () => [...shelf.querySelectorAll('.tab')];
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

  /* Paging: native scroll-snap (compositor). Tabs follow the scroll. */
  const setTab = (name) => {
    let on = null;
    tabs().forEach((t) => { t.classList.toggle('on', t.dataset.p === name); if (t.dataset.p === name) on = t; });
    // Keep the active tab in view on the shelf (native smooth scroll).
    if (on && (on.offsetLeft < shelf.scrollLeft || on.offsetLeft + on.offsetWidth > shelf.scrollLeft + shelf.clientWidth)) {
      shelf.scrollTo({ left: on.offsetLeft - 12, behavior: 'smooth' });
    }
  };
  const indexOf = (name) => panels().findIndex((p) => p.dataset.p === name);
  const current = () => panels()[Math.round(track.scrollLeft / track.clientWidth)]?.dataset.p;
  function show(name, smooth = true) {
    const i = indexOf(name);
    if (i < 0) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: smooth ? 'smooth' : 'instant' });
    setTab(name);
  }
  /** Go to a panel, then run fn once it has arrived (or right away if already there). */
  function goThen(name, fn) {
    if (current() === name) return fn();
    show(name);
    let done = false;
    const go = () => { if (done) return; done = true; track.removeEventListener('scrollend', go); fn(); };
    track.addEventListener('scrollend', go, { once: true });
    later(go, 650); // browsers without scrollend
  }
  track.addEventListener('scroll', () => { const c = current(); if (c) setTab(c); }, { passive: true });
  shelf.addEventListener('click', (e) => { const t = e.target.closest('.tab'); if (t) show(t.dataset.p); });
  requestAnimationFrame(() => show('workout', false));

  /* One tap ticks a set. */
  root.addEventListener('click', (e) => {
    const t = e.target.closest('.tick');
    if (!t) return;
    t.classList.toggle('on');
    if (t.classList.contains('on')) play(t, [{ transform: 'scale(0.92)' }, { transform: 'none' }], SPRING_LIVELY);
  });

  /* The Coach's short answer sits above the line; the real answer is the change on the objects. */
  let sayT = null;
  function answer(you, text) {
    clearTimeout(sayT);
    const wasHidden = say.hidden;
    say.hidden = false;
    say.innerHTML = `<q>${esc(you)}</q><p>${text}</p>`;
    say.className = 'ws-say' + g;
    if (wasHidden) enter(say, { y: 10 });
    else { say.style.transform = 'none'; playFromHere(say, 'opacity', '1'); }
    // It steps aside after a few seconds so the objects get the room; the change stays on the objects.
    sayT = later(() => {
      const a = play(say, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(0, 8px, 0)' }], SPRING_EXIT, { fill: 'forwards' });
      a.finished.then(() => { say.hidden = true; a.cancel(); say.style.opacity = ''; }, () => {});
    }, 5000);
  }

  /* ---------- "I have 25 minutes left": the workout shows the edit, then Accept makes it real ---------- */
  const wk = root.querySelector('.wk'), wkStat = root.querySelector('.wk-stat');
  const slot = wk.querySelector('.edit-slot');
  const fill = wk.querySelector('.fill'), mark = wk.querySelector('.mark');
  const lt = wk.querySelector('.lt'), rt = wk.querySelector('.rt');
  let state = 'plan'; // plan → proposed → applied
  const after = minutes(PLAN.todo, CUT25.changes);

  function setFill(min, from) {
    playFromHere(fill, 'transform', `translate3d(${(min / SCALE - 1) * 100}%, 0, 0)`);
  }
  function propose(mins) {
    if (state !== 'plan') return;
    state = 'proposed';
    for (const [id, c] of Object.entries(CUT25.changes)) {
      const ex = wk.querySelector(`.ex[data-id="${id}"]`);
      ex.classList.add('editing');
      if (c.cut) {
        ex.classList.add('will-cut');
        ex.querySelector('.ex-name').insertAdjacentHTML('beforeend', '<span class="badge">cut</span>');
      } else {
        const n = ex.querySelector('.n');
        n.innerHTML = `${n.textContent} <span class="to">→ ${c.sets}</span>`;
      }
      play(ex, [{ transform: 'scale(0.985)' }, { transform: 'none' }], SPRING_LIVELY);
    }
    mark.hidden = false;
    enter(mark, { y: -4 });
    lt.textContent = `${total} → ${after} min of sets`;
    rt.textContent = `fits ${mins} min`;
    setFill(after, total);
    slot.innerHTML = `<div class="edit-note"><b>Coach’s edit</b>${CUT25.reason}
      <div class="btns"><button class="btn" type="button" data-a="accept">Accept</button><button class="btn ghost" type="button" data-a="no">Not now</button></div></div>`;
    enter(slot.firstChild, { y: 10, delay: 80 });
    later(() => slot.firstChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 120);
    slot.querySelector('[data-a=accept]').addEventListener('click', accept);
    slot.querySelector('[data-a=no]').addEventListener('click', reject);
  }
  function clearEdit() {
    wk.querySelectorAll('.ex.editing').forEach((ex) => ex.classList.remove('editing', 'will-cut'));
    wk.querySelectorAll('.badge, .to').forEach((b) => b.remove());
  }
  const movers = () => [...wk.querySelectorAll('.ex, .timebar, .edit-slot')];
  function reject() {
    flip(movers(), () => {
      clearEdit();
      mark.hidden = true;
      lt.textContent = `About ${total} min of sets left`;
      rt.textContent = '';
      slot.innerHTML = '';
    });
    setFill(total, after);
    state = 'plan';
    answer('Not now', 'Kept the full plan. Say “25 minutes” again any time.');
  }
  function accept() {
    state = 'applied';
    const removed = Object.entries(CUT25.changes).flatMap(([id, c]) => {
      const ex = wk.querySelector(`.ex[data-id="${id}"]`);
      return c.cut ? [ex] : [...ex.querySelectorAll('.tick')].slice(c.sets); // whole rows, and the extra set circles
    });
    // Every change of this moment happens inside one FLIP, so nothing jumps.
    foldAway(removed, movers(), SPRING, () => {
      for (const [id, c] of Object.entries(CUT25.changes)) {
        if (c.cut) continue;
        const ex = wk.querySelector(`.ex[data-id="${id}"]`);
        ex.querySelector('.n').textContent = c.sets;
      }
      clearEdit();
      lt.textContent = `About ${after} min of sets left`;
      rt.textContent = 'fits 25 min';
      slot.innerHTML = '<div class="undo">Workout changed <button type="button">Undo</button></div>';
    });
    enter(slot.firstChild, { y: 6, opts: SPRING_LIVELY });
    slot.querySelector('button').addEventListener('click', undo);
    skyObj?.dusk(true);
    answer('Accept', `Done. ${after} minutes of sets, the overhead press kept.`); wkStat.textContent = 'Push · 1 of 4 done';
  }
  function undo() {
    const back = [];
    flip(movers(), () => {
      for (const [id, c] of Object.entries(CUT25.changes)) {
        const ex = wk.querySelector(`.ex[data-id="${id}"]`);
        const x = PLAN.todo.find((t) => t.id === id);
        if (c.cut) { ex.hidden = false; back.push(ex); continue; }
        ex.querySelector('.n').textContent = x.sets;
        ex.querySelectorAll('.tick').forEach((t) => { t.hidden = false; });
      }
      slot.innerHTML = '';
      mark.hidden = true;
      lt.textContent = `About ${total} min of sets left`;
      rt.textContent = '';
    });
    back.forEach((ex) => enter(ex, { y: -6 }));
    setFill(total, after);
    state = 'plan';
    skyObj?.dusk(false);
    wkStat.textContent = 'Push · 1 of 5 done';
    answer('Undo', 'Back to the full workout.');
  }

  /* ---------- "Why has my bench stalled?": a Bench panel opens next to the others ---------- */
  let benchPanel = null, fridayAdded = false;
  function openBench(you) {
    const f = benchFacts();
    const best = Math.max(...BENCH.sessions.map((s) => s.w * (1 + s.r / 30)));
    if (!benchPanel) {
      const tab = document.createElement('button');
      tab.className = 'tab'; tab.type = 'button'; tab.dataset.p = 'bench'; tab.style.setProperty('--c', 'var(--bench)');
      tab.innerHTML = '<i></i>Bench';
      flip(tabs(), () => shelf.append(tab));
      enter(tab, { y: 0, scale: 0.92, opts: SPRING_LIVELY });
      benchPanel = document.createElement('section');
      benchPanel.className = 'panel'; benchPanel.dataset.p = 'bench'; benchPanel.setAttribute('aria-label', 'Bench press');
      benchPanel.innerHTML = `<div class="obj${g}">
          <div class="obj-kind" style="--c:var(--bench)">Bench press · why it stalled</div>
          <div class="obj-head"><h2>Stuck at ${f.weight} kg</h2><span class="meta">since 3 Oct</span></div>
          <div class="chart-slot"></div>
          <ul class="facts">
            <li><span>Sessions at ${f.weight} kg since the cut</span><b>${f.sessionsSince}</b></li>
            <li><span>Reps on the top set</span><b>${f.repsMin}–${f.repsMax}</b></li>
            <li><span>Food since the cut</span><b>−${f.kcalDrop} kcal/day</b></li>
            <li><span>Sleep since the cut</span><b>−${f.sleepDrop} h</b></li>
            <li><span>Sets a session</span><b>${f.sets}${f.setsSame ? ', unchanged' : ''}</b></li>
            <li class="est"><span>Best 1RM</span><b>${best.toFixed(0)} kg</b></li>
          </ul>
          <p class="coach-line">Holding ${f.weight} kg on a cut is normal: less food and sleep, same work. Aim for 8, 8, 8 at ${f.weight} before adding weight, and add one set on Fridays.</p>
          <div class="btns bench-btns"></div>
        </div>`;
      benchPanel.querySelector('.chart-slot').replaceWith(benchChart(BENCH, { theme: sky ? 'dark' : 'light' }));
      track.append(benchPanel);
      renderBenchBtns();
      enter(benchPanel.firstElementChild, { y: 16 });
    }
    show('bench');
    answer(you, `Since your cut started your food and sleep went down and your sets stayed the same. Drag across the chart to read each session.`);
  }
  function renderBenchBtns() {
    const b = benchPanel.querySelector('.bench-btns');
    b.innerHTML = fridayAdded
      ? '<div class="undo">Added to Friday <button type="button" data-a="see">See week</button><button type="button" data-a="undo">Undo</button></div>'
      : '<button class="btn" type="button" data-a="add">Add a 5th set on Fridays</button>';
    enter(b.firstChild, { y: 6, opts: fridayAdded ? SPRING_LIVELY : SPRING });
    b.querySelector('[data-a=add]')?.addEventListener('click', () => { fridayAdded = true; friday(true); renderBenchBtns(); });
    b.querySelector('[data-a=see]')?.addEventListener('click', () => show('week'));
    b.querySelector('[data-a=undo]')?.addEventListener('click', () => { fridayAdded = false; friday(false); renderBenchBtns(); });
  }
  function friday(on) {
    const d = root.querySelector('.day[data-d="Fri"]');
    if (on) {
      d.insertAdjacentHTML('beforeend', '<em>+1 bench set</em>');
      enter(d.lastChild, { y: 0, scale: 0.92, opts: SPRING_LIVELY, delay: 200 });
    } else d.querySelector('em')?.remove();
    answer(on ? 'Add a 5th set on Fridays' : 'Undo', on ? 'Added to Friday’s push: bench is 5 sets that day.' : 'Friday is back to 4 sets.');
  }

  /* ---------- The request line ---------- */
  function submit(text) {
    text = text.trim();
    if (!text) return;
    if (/bench/i.test(text) && /(stall|stuck|stopped|plateau|not moving|why)/i.test(text)) return openBench(text);
    const t = text.match(/(\d+)\s*(?:min|minutes|minutter)/i);
    if (t) {
      const mins = +t[1];
      if (state === 'applied') { goThen('workout', () => {}); return answer(text, 'Your workout already fits 25 minutes. Undo is on the card.'); }
      answer(text, `Here’s the workout in ${mins} minutes. The edit is on the card: accept it or keep the full plan.`);
      return goThen('workout', () => later(() => propose(mins), 60));
    }
    if (/week|plan|uge/i.test(text)) { answer(text, 'Your next 7 days.'); return show('week'); }
    if (/today|food|protein|sleep/i.test(text)) { answer(text, 'Here’s today so far.'); return show('today'); }
    answer(text, 'Saved as a note. I’ll remember it.');
  }
  const form = root.querySelector('form'), input = form.querySelector('input');
  form.addEventListener('submit', (e) => { e.preventDefault(); submit(input.value); input.value = ''; input.blur(); });
  root.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', () => submit(b.dataset.say)));

  return () => { timers.forEach(clearTimeout); skyObj?.destroy(); root.remove(); };
}
