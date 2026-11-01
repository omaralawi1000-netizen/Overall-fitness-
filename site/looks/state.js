/* Made-up but realistic data, shared by all three looks. Every number on screen is computed from this, never typed in.
   Nothing is stored on the phone: this address also hosts old Aven. */

export const e1rm = (w, r) => w * (1 + r / 30); // Epley: an estimate, always labelled as one
export const fmtKg = (w) => (Number.isInteger(w) ? String(w) : w.toFixed(1));
const pad = (n) => String(n).padStart(2, '0');

/** A fresh session: Sunday 1 November, 16:24, Push started 16:02, two bench sets done. */
export function createSession() {
  const t0 = Date.now();
  const clock0 = 16 * 3600 + 24 * 60; // the simulated time of day when the page opens
  const s = {
    t0,
    started: 16 * 3600 + 2 * 60,
    exercises: [
      { id: 'bench', name: 'Bench press', w: 80, r: 8, planned: 4, last: [80, [8, 7, 7, 6]], done: [{ w: 80, r: 8, at: '16:05' }, { w: 80, r: 8, at: '16:09' }], perSet: 3.5, best: e1rm(80, 8) },
      { id: 'incline', name: 'Incline dumbbell', w: 30, r: 10, planned: 3, last: [30, [10, 9, 9]], done: [], perSet: 3 },
      { id: 'ohp', name: 'Overhead press', w: 50, r: 7, planned: 3, last: [50, [7, 6, 6]], done: [], perSet: 3 },
      { id: 'fly', name: 'Cable fly', w: 17.5, r: 12, planned: 3, last: [17.5, [12, 12, 11]], done: [], perSet: 2.5 },
      { id: 'tri', name: 'Triceps pushdown', w: 35, r: 12, planned: 3, last: [35, [12, 11, 10]], done: [], perSet: 2.5 },
    ],
    cur: 0,
    /** The Coach's proposal on the workout: sets 1 and 2 moved fast, so 82.5 for set 3. */
    bump: { state: 'open', from: 80, to: 82.5 },
    /** The Coach's proposal on Today: leave by 16:50 for wrestling, so trim the rest. */
    trim: { state: 'open', leaveBy: 16 * 3600 + 50 * 60, changes: { incline: 2, fly: 0, tri: 0 } },
    rest: null,
    restSecs: 90,
  };
  s.now = () => clock0 + Math.floor((Date.now() - t0) / 1000);
  return s;
}

export const hhmm = (secs) => `${pad(Math.floor(secs / 3600) % 24)}:${pad(Math.floor(secs / 60) % 60)}`;
export const mmss = (secs) => `${Math.floor(secs / 60)}:${pad(Math.max(0, secs) % 60)}`;
export const elapsed = (s) => mmss(s.now() - s.started);
export const minutesIn = (s) => Math.floor((s.now() - s.started) / 60);

/** Sets planned for an exercise, with or without the trim applied (or previewed). */
export function plannedSets(s, ex, { preview = false } = {}) {
  const on = s.trim.state === 'applied' || (preview && s.trim.state === 'open');
  if (!on || !(ex.id in s.trim.changes)) return ex.planned;
  return Math.max(ex.done.length, s.trim.changes[ex.id]);
}
export const isCut = (s, ex, opts) => plannedSets(s, ex, opts) === 0;

/** Minutes left, worked out from the sets left and each exercise's usual pace. */
export function minutesLeft(s, opts) {
  return Math.round(s.exercises.reduce((t, ex) => t + Math.max(0, plannedSets(s, ex, opts) - ex.done.length) * ex.perSet, 0));
}
export const doneBy = (s, opts) => hhmm(s.now() + minutesLeft(s, opts) * 60);
/** Minutes past the time he has to leave (0 or less: in time). */
export const lateBy = (s, opts) => Math.round((s.now() + minutesLeft(s, opts) * 60 - s.trim.leaveBy) / 60);

export const current = (s) => s.exercises[s.cur];
/** The set waiting to be ticked: weight with the Coach's bump if applied, else the exercise's own. */
export function nowSet(s) {
  const ex = current(s);
  const w = ex.id === 'bench' && s.bump.state === 'applied' ? s.bump.to : ex.w;
  return { ex, n: ex.done.length + 1, of: plannedSets(s, ex), w: ex.wOverride ?? w, r: ex.rOverride ?? ex.r };
}
export const bumpOpen = (s) => s.bump.state === 'open' && current(s).id === 'bench' && current(s).done.length === 2 && current(s).wOverride == null;

/** Tick the current set. Returns what happened, so each look can show it. */
export function tick(s) {
  const set = nowSet(s), ex = set.ex;
  const rec = { w: set.w, r: set.r, at: hhmm(s.now()) };
  ex.done.push(rec);
  const prevBest = ex.best ?? 0;
  const est = e1rm(set.w, set.r);
  const record = ex.id === 'bench' && est > prevBest + 0.4;
  if (record) ex.best = est;
  rec.record = record;
  rec.prevBest = prevBest;
  rec.est = est;
  if (s.bump.state === 'open') s.bump.state = 'passed'; // ticked without taking the proposal: it's gone, quietly
  delete ex.wOverride; delete ex.rOverride;
  const exDone = ex.done.length >= plannedSets(s, ex);
  return { rec, ex, exDone, last: ex.last[1][ex.done.length - 1] };
}

/** Undo the last tick (only right after it). */
export function untick(s, info) {
  const ex = info.ex;
  ex.done.pop();
  if (info.rec.record) ex.best = info.rec.prevBest;
  if (s.cur !== s.exercises.indexOf(ex)) s.cur = s.exercises.indexOf(ex);
  if (ex.id === 'bench' && s.bump.state === 'passed' && ex.done.length === 2) s.bump.state = 'open';
}

/** Move on to the next exercise that still has sets left. Returns false when the workout is finished. */
export function advance(s) {
  for (let i = s.cur + 1; i < s.exercises.length; i++) {
    const ex = s.exercises[i];
    if (plannedSets(s, ex) > ex.done.length) { s.cur = i; return true; }
  }
  return false;
}
export function nextExercise(s) {
  for (let i = s.cur + 1; i < s.exercises.length; i++) {
    const ex = s.exercises[i];
    if (plannedSets(s, ex) > ex.done.length) return ex;
  }
  return null;
}
export const setsLine = (ex) => `${fmtKg(ex.last[0])} × ${ex.last[1].join(' · ')}`;
