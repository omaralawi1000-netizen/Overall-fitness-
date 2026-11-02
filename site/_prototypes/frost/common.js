// Frost round: one session, one rest timer, themes and rolling digits, shared by the six screens so only the idea differs.
import { play, SPRINGS, reduced } from '../../round/motion.js';
export { play, SPRINGS, reduced };

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const fmtKg = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
export const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.ceil(s)) % 60).padStart(2, '0')}`;

/* Grain: one 128 px tile of soft noise, made once, used by the light and inside every pane. */
{
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), img = x.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 10; }
  x.putImageData(img, 0, 0);
  document.documentElement.style.setProperty('--grain', `url(${c.toDataURL()})`);
}

/** Only the characters that changed roll; the rest stay put (`60fps-push-rep-digit-roll`). */
export function roll(el, text, dir = 1) {
  el.classList.add('roll');
  if (!el.querySelector('.c')) el.textContent = '';
  const chars = [...String(text)];
  const cols = [...el.children];
  while (cols.length > chars.length) cols.pop().remove();
  chars.forEach((ch, i) => {
    let col = cols[i];
    if (!col) {
      col = document.createElement('span'); col.className = 'c'; col.dataset.ch = ch;
      const d = document.createElement('span'); d.className = 'd'; d.textContent = ch; col.append(d); el.append(col);
      if (el.dataset.ready) play(d, [{ transform: 'translateY(100%)', opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.type);
      return;
    }
    if (col.dataset.ch === ch) return;
    col.dataset.ch = ch;
    col.querySelectorAll('.d.out').forEach((o) => o.remove());
    const old = col.querySelector('.d');
    const nw = document.createElement('span'); nw.className = 'd'; nw.textContent = ch;
    old.classList.add('out'); col.append(nw);
    const k = dir >= 0 ? 1 : -1;
    play(old, [{ transform: 'none', opacity: 1 }, { transform: `translateY(${-100 * k}%)`, opacity: 0 }], SPRINGS.type, { fill: 'forwards' }).finished.then(() => old.remove(), () => old.remove());
    play(nw, [{ transform: `translateY(${100 * k}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], SPRINGS.type);
  });
  el.dataset.ready = '1';
}

/** Pressed on the very next frame, a spring back out. */
export function press(el, scale = 0.96) {
  const up = () => { if (!el.classList.contains('down')) return; el.classList.remove('down'); el.style.scale = ''; play(el, [{ scale: String(scale) }, { scale: '1' }], SPRINGS.type); };
  el.addEventListener('pointerdown', () => { el.classList.add('down'); el.style.scale = String(scale); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => el.addEventListener(t, up));
}

/* ---------- The session: Bench press, set 3 of 4. Set 4 (85 × 6) beats the record. ---------- */
export const EX = { name: 'Bench press', next: 'Incline dumbbell', nextSet: '30 × 10', last: '82.5 × 5', best: { kg: 82.5, r: 6 } };
export const PLAN = [{ kg: 80, r: 8 }, { kg: 82.5, r: 6 }, { kg: 82.5, r: 6 }, { kg: 85, r: 6 }];
export const REST = 90;
export const isRecord = (s) => s.kg > EX.best.kg || (s.kg === EX.best.kg && s.r > EX.best.r);

/**
 * ui: { render(s) — draw the whole state, no motion; tick(s) — a set was just ticked (s.record says if it was a record);
 *       next(s) — rest ended, the next set is up; undo(s) — the tick was taken back; second(s) — once a second in rest }.
 */
export function session(ui) {
  const s = { cur: 2, phase: 'set', left: REST, record: false, plan: PLAN.map((p) => ({ ...p })) };
  let iv = 0;
  const stop = () => { clearInterval(iv); iv = 0; };
  const startRest = () => {
    stop();
    s.left = REST; s.endsAt = performance.now() + REST * 1000;
    iv = setInterval(() => { s.left = Math.max(0, (s.endsAt - performance.now()) / 1000); ui.second?.(s); if (s.left <= 0) api.next(); }, 250);
  };
  const api = {
    s,
    tick() {
      if (s.phase !== 'set') return;
      s.record = isRecord(s.plan[s.cur]);
      s.phase = 'rest';
      // A record turns the light gold for a moment before the rest light comes in.
      const root = document.documentElement;
      root.dataset.phase = s.record ? 'record' : 'rest';
      if (s.record) setTimeout(() => { if (s.phase === 'rest' && root.dataset.phase === 'record') root.dataset.phase = 'rest'; }, 1500);
      startRest(); ui.tick(s);
    },
    next() {
      if (s.phase !== 'rest') return;
      stop();
      if (s.cur >= s.plan.length - 1) { api.jump('set'); return; } // the demo loops back to set 3
      s.cur++; s.phase = 'set'; s.record = false; document.documentElement.dataset.phase = '';
      ui.next(s);
    },
    undo() {
      if (s.phase !== 'rest') return;
      stop(); s.phase = 'set'; s.record = false; document.documentElement.dataset.phase = '';
      ui.undo(s);
    },
    jump(m) {
      stop();
      s.cur = m === 'record' ? 3 : 2; s.phase = 'set'; s.record = false; document.documentElement.dataset.phase = '';
      ui.render(s);
      if (m === 'rest' || m === 'record') requestAnimationFrame(() => requestAnimationFrame(() => api.tick()));
    },
  };
  ui.render(s);
  addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.type === 'moment') api.jump(d.m);
    if (d.type === 'theme') document.documentElement.dataset.theme = d.t;
    if (d.type === 'active') document.documentElement.toggleAttribute('data-idle', !d.on);
  });
  const q = new URLSearchParams(location.search);
  if (q.get('t')) document.documentElement.dataset.theme = q.get('t');
  if (q.get('m')) api.jump(q.get('m'));
  return api;
}
