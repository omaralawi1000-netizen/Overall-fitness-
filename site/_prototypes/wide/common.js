// Shared kit for the four layouts: springs from /round/motion.js, rolling digits, session data, moment switching.
import { play, SPRINGS } from '../../round/motion.js';
export { play, SPRINGS };

/** Rolling digits. roll(el, '82.5') makes el hold one clipped column per character; calling again rolls only the characters that changed. */
export function roll(el, text, dir = 1) {
  if (!el.classList.contains('roll')) el.classList.add('roll');
  if (!el.querySelector('.c')) el.textContent = '';
  const chars = [...String(text)];
  let cols = [...el.children];
  while (cols.length > chars.length) cols.pop().remove();
  chars.forEach((ch, i) => {
    let col = cols[i];
    if (!col) {
      col = document.createElement('span'); col.className = 'c';
      const d = document.createElement('span'); d.className = 'd'; d.textContent = ch; col.append(d); col.dataset.ch = ch;
      el.append(col); return;
    }
    if (col.dataset.ch === ch) return;
    col.dataset.ch = ch;
    const old = col.querySelector('.d:not(.out)');
    const nw = document.createElement('span'); nw.className = 'd'; nw.textContent = ch;
    if (old) { old.classList.add('out'); }
    col.append(nw);
    const up = dir >= 0;
    if (old) play(old, [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${up ? -105 : 105}%)`, opacity: 0 }], SPRINGS.type, { fill: 'forwards' }).finished.then(() => old.remove(), () => old.remove());
    play(nw, [{ transform: `translateY(${up ? 105 : -105}%)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], SPRINGS.type);
  });
}

export const fmtKg = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
export const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.round(s)) % 60).padStart(2, '0')}`;
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/** One session, the same in all four layouts so only the layout differs. */
export const SESSION = {
  name: 'Push', elapsed: 41 * 60 + 12, minutesLeft: 24,
  exercises: [
    { name: 'Overhead press', sets: [{ kg: 40, r: 8 }, { kg: 42.5, r: 6 }, { kg: 42.5, r: 6 }], done: true, short: '3 × 6–8' },
    { name: 'Bench press', sets: [{ kg: 80, r: 8 }, { kg: 82.5, r: 6 }, { kg: 82.5, r: 6 }, { kg: 85, r: 6 }], cur: 2, last: '82.5 × 5', best: '82.5 × 6' },
    { name: 'Incline dumbbell press', sets: [{ kg: 30, r: 10 }, { kg: 30, r: 10 }, { kg: 30, r: 10 }], short: '3 × 10 · 30 kg' },
    { name: 'Cable fly', sets: [{ kg: 15, r: 12 }, { kg: 15, r: 12 }, { kg: 15, r: 12 }], short: '3 × 12 · 15 kg' },
    { name: 'Lateral raise', sets: [{ kg: 10, r: 15 }, { kg: 10, r: 15 }, { kg: 10, r: 15 }], short: '3 × 15 · 10 kg' },
    { name: 'Triceps pushdown', sets: [{ kg: 27.5, r: 12 }, { kg: 27.5, r: 12 }, { kg: 27.5, r: 12 }], short: '3 × 12 · 27.5 kg' },
  ],
};

/** The host page's chips (Set / Rest / Where / Record) post a moment; so does ?m=. Each layout offers window.aven.go(moment). */
export function ready(api) {
  window.aven = api;
  addEventListener('message', (e) => { if (e.data && e.data.type === 'moment') api.go(e.data.m); });
  const m = new URLSearchParams(location.search).get('m');
  if (m) api.go(m, true);
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
