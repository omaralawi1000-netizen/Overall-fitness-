/* B2 · The Living Notebook. Rough notes become structured entries in place; the Coach writes in the margin. */
import { enter, flip, foldAway, play, benchChart, makeSky, SPRING, SPRING_LIVELY } from './kit.js';
import { BENCH, benchFacts, PLAN, CUT25, minutes } from './data.js';

const ALIAS = [
  [/bench/i, 'Bench press'], [/incline/i, 'Incline dumbbell'], [/ohp|overhead|shoulder press/i, 'Overhead press'],
  [/fly/i, 'Cable fly'], [/tri|pushdown/i, 'Triceps pushdown'],
];
const LAST = { 'Incline dumbbell': '30 × 10 · 9 · 9', 'Overhead press': '50 × 7 · 6 · 6', 'Cable fly': '17.5 × 12 · 12 · 11', 'Triceps pushdown': '35 × 12 · 11 · 10', 'Bench press': '80 × 8 · 7 · 7 · 6' };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** "incline 30 for 10, 10 and 9" → { name, w, reps[] } */
function parseSets(text) {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:kg)?\s*(?:for|x|×|\*)\s*(\d+)((?:\s*(?:,|and|og|&)\s*\d+)*)/i);
  if (!m) return null;
  const reps = [m[2], ...(m[3].match(/\d+/g) || [])].map(Number);
  const name = (ALIAS.find(([re]) => re.test(text)) || [null, 'Incline dumbbell'])[1];
  return { name, w: +m[1].replace(',', '.'), reps, wStr: m[1], repStr: [m[2], ...(m[3].match(/\d+/g) || [])] };
}

export function notebook(stage, { sky = false } = {}) {
  const root = document.createElement('div');
  root.className = 'variant nb' + (sky ? ' sky-on' : '');
  let skyObj = null;
  if (sky) { skyObj = makeSky(); root.append(skyObj.el); }
  const glass = sky ? ' glass' : '';
  root.insertAdjacentHTML('beforeend', `
    <header class="nb-head">
      <div class="nb-date">Sunday 1 November</div>
      <div class="nb-sub">Push day · swipe right for yesterday</div>
      <div class="nb-dots"><i></i><i class="on"></i></div>
    </header>
    <div class="nb-pages">
      <section class="nb-page nb-yday" aria-label="Saturday">
        <article class="entry${glass}"><h3>Legs and shoulders <span class="when">Sat 17:10</span></h3>
          <div class="sets"><div class="set">100 × 5<small>squat</small></div><div class="set">100 × 5</div><div class="set">95 × 6</div></div>
          <div class="ghost">last: 97.5 × 5 · 5 · 5</div>
          <aside class="margin">Squat up 2.5 kg. That’s three weeks in a row.</aside></article>
        <article class="entry${glass}"><h3>Sleep <span class="when">Sat</span></h3><div class="food-row">6 h 20 <span>watch</span></div></article>
      </section>
      <section class="nb-page nb-today" aria-label="Sunday">
        <article class="entry${glass}"><h3>Skyr and eggs <span class="when">12:40</span></h3>
          <div class="food-row">Skyr 200 g <span>22 g protein</span></div>
          <div class="food-row">Eggs × 2 <span>12 g protein</span></div>
          <aside class="margin">Protein <b>96 of 180 g</b> so far.</aside></article>
        <article class="entry${glass}"><h3>Bench press <span class="when">16:22</span></h3>
          <div class="sets"><div class="set">80 × 8</div><div class="set">80 × 8</div><div class="set">80 × 7</div><div class="set">80 × 7</div></div>
          <div class="ghost">last: 80 × 8 · 7 · 7 · 6</div>
          <aside class="margin">One more rep than last time. Still 80 kg, though.</aside></article>
        <article class="entry upnext${glass}"><h3>Incline dumbbell <span class="when">up next</span></h3>
          <div class="sets">${[1, 2, 3].map((i) => `<button type="button" class="set plan" aria-label="Set ${i}: 30 × 10, tap when done">30 × 10</button>`).join('')}</div>
          <div class="ex-sum">${PLAN.todo.length} exercises left · about ${minutes(PLAN.todo)} min</div></article>
      </section>
    </div>
    <div class="nb-foot">
      <div class="chips">
        <button class="chip" type="button" data-say="incline 30 for 10, 10 and 9">incline 30 for 10, 10 and 9</button>
        <button class="chip" type="button" data-say="why has my bench stalled?">Why has my bench stalled?</button>
        <button class="chip" type="button" data-say="I have 25 minutes left">I have 25 minutes left</button>
      </div>
      <form class="line${sky ? ' glass' : ''}" autocomplete="off"><input name="q" placeholder="Write a note…" enterkeyhint="send" aria-label="Write a note"><button class="send" type="submit" aria-label="Add">↑</button></form>
    </div>`);
  stage.append(root);

  const pages = root.querySelector('.nb-pages'), today = root.querySelector('.nb-today');
  const dots = root.querySelectorAll('.nb-dots i'), sub = root.querySelector('.nb-sub'), dateEl = root.querySelector('.nb-date');
  requestAnimationFrame(() => { pages.scrollLeft = pages.scrollWidth; today.scrollTop = today.scrollHeight; });
  pages.addEventListener('scroll', () => {
    const onToday = pages.scrollLeft > pages.clientWidth / 2;
    dots[0].classList.toggle('on', !onToday); dots[1].classList.toggle('on', onToday);
    dateEl.textContent = onToday ? 'Sunday 1 November' : 'Saturday 31 October';
    sub.textContent = onToday ? 'Push day · swipe right for yesterday' : 'Legs and shoulders · swipe left for today';
  }, { passive: true });

  const toBottom = () => today.scrollTo({ top: today.scrollHeight, behavior: 'smooth' });
  const goToday = () => { if (pages.scrollLeft < pages.clientWidth / 2) pages.scrollTo({ left: pages.scrollWidth, behavior: 'smooth' }); };
  const entries = () => [...today.children];

  function addEntry(html) {
    const el = document.createElement('article');
    el.className = 'entry' + glass;
    el.innerHTML = html;
    today.append(el);
    return el;
  }
  function addRaw(text) {
    const el = addEntry(`<p class="raw">${text.split(/(\s+)/).map((t) => `<span class="tok">${esc(t)}</span>`).join('')}</p>`);
    enter(el, { y: 18 });
    toBottom();
    return el;
  }
  function margin(entry, html) {
    const m = document.createElement('aside');
    m.className = 'margin';
    m.innerHTML = html;
    entry.append(m);
    enter(m, { y: 8, delay: 60 });
    setTimeout(toBottom, 80);
    return m;
  }

  /* Rough note → set rows. The numbers you typed fly into their fields. */
  function transformSets(rawEl, p) {
    const toks = [...rawEl.querySelectorAll('.tok')];
    const entry = document.createElement('div');
    entry.innerHTML = `<h3>${p.name} <span class="when">now</span></h3>
      <div class="sets">${p.reps.map((r) => `<div class="set"><span class="w">${p.w}</span> × <span class="r">${r}</span></div>`).join('')}</div>
      <div class="ghost">last: ${LAST[p.name] || '—'}</div>`;
    const raw = rawEl.querySelector('.raw');
    // Find the typed tokens for the weight and each rep count.
    const numToks = toks.filter((t) => /^\d+(?:[.,]\d+)?,?$/.test(t.textContent.trim()));
    const wTok = numToks[0], repToks = numToks.slice(1);
    const before = wTok ? wTok.getBoundingClientRect() : null;
    const repRects = repToks.map((t) => t.getBoundingClientRect());
    const others = entries().filter((e) => e !== rawEl);
    // Swap the raw line for the structured entry, keeping the entry's place on the page.
    flip(others, () => { raw.replaceWith(...entry.childNodes); });
    const cells = [...rawEl.querySelectorAll('.set')];
    const fly = (fromRect, target, i) => {
      if (!fromRect || !target) return;
      const to = target.getBoundingClientRect();
      const dx = fromRect.left - to.left, dy = fromRect.top - to.top;
      play(target, [{ transform: `translate3d(${dx}px, ${dy}px, 0) scale(1.15)` }, { transform: 'none' }], SPRING_LIVELY, { delay: i * 35 });
    };
    cells.forEach((c, i) => {
      fly(before, c.querySelector('.w'), i);
      fly(repRects[i], c.querySelector('.r'), i);
      play(c, [{ backgroundColor: 'transparent', borderColor: 'transparent' }, {}], SPRING, { delay: 120 + i * 35 });
    });
    enter(rawEl.querySelector('h3'), { y: 6, delay: 80 });
    enter(rawEl.querySelector('.ghost'), { y: 6, delay: 160 });
    // The planned exercise you just logged leaves "up next".
    const up = today.querySelector('.upnext');
    if (up && up.querySelector('h3').firstChild.textContent.trim() === p.name) {
      setTimeout(() => foldAway(up, entries().filter((e) => e !== up)), 500);
    }
    const last = LAST[p.name];
    setTimeout(() => {
      const first = last ? +last.split('×')[1].split('·')[0] : null;
      const note = first != null && p.reps[0] > first ? `${p.reps[0] - first} more rep${p.reps[0] - first > 1 ? 's' : ''} on the first set than last time.`
        : first != null && p.reps[0] === first ? 'Same as last time on the first set.' : 'Logged.';
      margin(rawEl, note);
    }, 420);
  }

  /* "Why has my bench stalled?" → an explorable chart on the page, the Coach's reading in the margin. */
  function coachBench(rawEl) {
    const f = benchFacts();
    setTimeout(() => {
      const e = addEntry(`<h3>Bench press since September</h3>`);
      e.append(benchChart(BENCH, { theme: sky ? 'dark' : 'light' }));
      enter(e, { y: 16 });
      const m = margin(e, `Stuck at <b>${f.weight} kg</b> since your cut started: less food and sleep, same work. Normal on a cut.
        <ul class="facts">
          <li><span>Sessions at ${f.weight} kg</span><b>${f.sessionsSince} · ${f.repsMin}–${f.repsMax} reps</b></li>
          <li><span>Food</span><b>−${f.kcalDrop} kcal/day</b></li>
          <li><span>Sleep</span><b>−${f.sleepDrop} h</b></li>
          <li><span>Sets a session</span><b>${f.sets}, same</b></li>
        </ul>
        Aim for 8, 8, 8 at ${f.weight}, then add weight.
        <div class="btns"><button class="btn" type="button">Add a 5th set on Fridays</button></div>`);
      const btns = m.querySelector('.btns');
      const apply = () => {
        btns.innerHTML = '<div class="undo">Added to Friday’s push <button type="button">Undo</button></div>';
        enter(btns.firstChild, { y: 6, opts: SPRING_LIVELY });
        btns.querySelector('button').addEventListener('click', () => {
          btns.innerHTML = '<button class="btn" type="button">Add a 5th set on Fridays</button>';
          btns.querySelector('button').addEventListener('click', apply);
          enter(btns.firstChild, { y: 6 });
        });
      };
      btns.querySelector('button').addEventListener('click', apply);
      setTimeout(toBottom, 120);
    }, 260);
  }

  /* "I have 25 minutes left" → the Coach crosses out a plan in the margin; Accept makes it real. */
  function coach25(rawEl, mins) {
    const ch = CUT25.changes;
    const total = minutes(PLAN.todo), after = minutes(PLAN.todo, ch);
    const rows = PLAN.todo.map((x) => {
      const c = ch[x.id];
      if (c?.cut) return `<div class="row cut" data-id="${x.id}"><span class="nm strike">${x.name}</span><span class="sx">${x.sets} × ${x.reps}</span></div>`;
      if (c?.sets) return `<div class="row" data-id="${x.id}"><span class="nm">${x.name}</span><span class="sx"><s class="strike old">${x.sets}</s> <span class="new">${c.sets}</span> × ${x.reps}</span></div>`;
      return `<div class="row" data-id="${x.id}"><span class="nm">${x.name}</span><span class="sx">${x.sets} × ${x.reps}</span></div>`;
    }).join('');
    setTimeout(() => {
      const m = margin(rawEl, `Here’s ${mins} minutes. ${CUT25.reason}
        <div class="plan25">${rows}<div class="tot"><b>About ${after} min of sets</b><span>was ${total} · fits ${mins}:00</span></div></div>
        <div class="btns"><button class="btn" type="button" data-a="accept">Accept</button><button class="btn ghost" type="button" data-a="no">Not now</button></div>`);
      // The strike lines draw themselves (transform only).
      m.querySelectorAll('.strike').forEach((s, i) => drawStrike(s, 260 + i * 60));
      const btns = m.querySelector('.btns');
      const plan = m.querySelector('.plan25');
      const g3 = () => today.querySelector('.upnext .set.plan:nth-child(3)');
      const movers = () => [...plan.children, btns, ...today.querySelectorAll('.upnext .set.plan, .upnext .ex-sum'), ...entries().slice(entries().indexOf(rawEl) + 1)];
      const accept = () => {
        const cut = [...plan.querySelectorAll('.row.cut')];
        // Every change of this moment happens inside one FLIP, so nothing jumps.
        foldAway([...cut, g3()].filter(Boolean), movers(), SPRING, () => {
          plan.querySelectorAll('.old').forEach((o) => { o.hidden = true; });
          plan.querySelector('.tot b').textContent = `${after} min of sets`;
          plan.querySelector('.tot span').textContent = `fits ${mins}:00`;
          btns.innerHTML = '<div class="undo">Plan changed <button type="button">Undo</button></div>';
          today.querySelector('.upnext .ex-sum')?.replaceChildren(`${PLAN.todo.length - 1} exercises left · about ${after} min`);
        });
        enter(btns.firstChild, { y: 6, opts: SPRING_LIVELY });
        skyObj?.dusk(true);
        btns.querySelector('button').addEventListener('click', () => {
          const back = [...cut, g3()].filter(Boolean);
          flip(movers(), () => {
            back.forEach((r) => { r.hidden = false; });
            plan.querySelectorAll('.old').forEach((o) => { o.hidden = false; });
            plan.querySelector('.tot b').textContent = `About ${after} min of sets`;
            plan.querySelector('.tot span').textContent = `was ${total} · fits ${mins}:00`;
            btns.innerHTML = '<button class="btn" type="button" data-a="accept">Accept</button><button class="btn ghost" type="button" data-a="no">Not now</button>';
            today.querySelector('.upnext .ex-sum')?.replaceChildren(`${PLAN.todo.length} exercises left · about ${total} min`);
          });
          back.forEach((r) => enter(r, { y: -6 }));
          skyObj?.dusk(false);
          wire();
        });
      };
      const wire = () => {
        btns.querySelector('[data-a=accept]').addEventListener('click', accept);
        btns.querySelector('[data-a=no]').addEventListener('click', () => {
          btns.innerHTML = '<div class="undo">Kept the full plan <button type="button">Show again</button></div>';
          btns.querySelector('button').addEventListener('click', () => {
            btns.innerHTML = '<button class="btn" type="button" data-a="accept">Accept</button><button class="btn ghost" type="button" data-a="no">Not now</button>';
            wire();
          });
        });
      };
      wire();
    }, 280);
  }
  function drawStrike(el, delay) {
    // A real line element, drawn left to right with a compositor transform.
    const line = document.createElement('i');
    line.className = 'strike-line';
    el.append(line);
    play(line, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], SPRING, { delay });
  }

  function submit(text) {
    text = text.trim();
    if (!text) return;
    goToday();
    const rawEl = addRaw(text);
    if (/bench/i.test(text) && /(stall|stuck|stopped|plateau|not moving|går ikke)/i.test(text)) return coachBench(rawEl);
    const t = text.match(/(\d+)\s*(?:min|minutes|minutter)/i);
    if (t) return coach25(rawEl, +t[1]);
    const p = parseSets(text);
    if (p) return setTimeout(() => transformSets(rawEl, p), 380);
    setTimeout(() => margin(rawEl, 'Saved as a note. I’ll remember it.'), 300);
  }
  /* One tap inks a planned set in (TASTE §6). */
  today.addEventListener('click', (e) => {
    const t = e.target.closest('.set.plan');
    if (!t) return;
    t.classList.toggle('on');
    if (t.classList.contains('on')) play(t, [{ transform: 'scale(0.9)' }, { transform: 'none' }], SPRING_LIVELY);
  });
  const form = root.querySelector('form'), input = form.querySelector('input');
  form.addEventListener('submit', (e) => { e.preventDefault(); submit(input.value); input.value = ''; });
  root.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', () => submit(b.dataset.say)));

  return () => { skyObj?.destroy(); root.remove(); };
}
