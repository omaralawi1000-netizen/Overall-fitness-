// Shared by the hand-written dictation corpus and the generated phrases: does a reading match what a careful person would log?
import { show, type Understood } from '../../src/engine/parse';
import type { Expect } from './dictation.corpus';

export const close = (a: number | undefined, b: number | undefined) => (a === undefined || b === undefined ? a === b : Math.abs(a - b) < 0.011);

/** '' when the reading is what a careful person would log, otherwise why not. */
export function judge(u: Understood, e: Expect): string {
  const said = show(u);
  if ('nolog' in e) return u.kind === 'ignored' || u.kind === 'ask' ? '' : `logged: ${said}`;
  if ('ask' in e) return u.kind === 'ask' ? '' : `should ask: ${said}`;
  if ('set' in e) {
    if (u.kind !== 'command' || u.cmd.kind !== 'set') return `not a set: ${said}`;
    return close(u.cmd.reps, e.set[0]) && close(u.cmd.kg, e.set[1]) ? '' : `wrong set: ${said}`;
  }
  if ('cmd' in e) return u.kind === 'command' && u.cmd.kind === e.cmd ? '' : `not ${e.cmd}: ${said}`;
  if ('rest' in e) return u.kind === 'command' && u.cmd.kind === 'rest' && u.cmd.sec === e.rest ? '' : `not +${e.rest}s: ${said}`;
  if ('water' in e) return u.kind === 'water' && close(u.ml, e.water) ? '' : `not ${e.water} ml: ${said}`;
  if ('bw' in e) return u.kind === 'bodyweight' && close(u.kg, e.bw) ? '' : `not ${e.bw} kg: ${said}`;
  if ('food' in e) {
    if (u.kind !== 'food') return `not food: ${said}`;
    if (u.rows.length !== e.food.length) return `wrong rows: ${said}`;
    if (e.meal && u.meal !== e.meal) return `wrong meal: ${said}`;
    for (const [i, [amount, dim, q]] of e.food.entries()) {
      const r = u.rows[i];
      if (!close(r.amount, amount) || r.dim !== dim || !r.query.includes(q)) return `wrong row ${i + 1}: ${said}`;
    }
    return '';
  }
  if ('workout' in e) {
    if (u.kind !== 'workout' || u.rows.length !== 1) return `not one exercise: ${said}`;
    const [name, sets] = e.workout;
    const r = u.rows[0];
    if (name && !(r.exercise?.name.toLowerCase().includes(name))) return `wrong exercise: ${said}`;
    if (r.row.sets.length !== sets.length) return `wrong sets: ${said}`;
    for (const [i, [reps, kg]] of sets.entries()) if (!close(r.row.sets[i].reps, reps) || !close(r.row.sets[i].kg, kg)) return `wrong set ${i + 1}: ${said}`;
    return '';
  }
  if (u.kind !== 'workout' || u.rows.length !== 1) return `not one run: ${said}`;
  const s = u.rows[0].row.sets[0];
  return close(s?.distanceM === undefined ? undefined : s.distanceM / 1000, e.run[0]) && close(s?.durationSec, e.run[1]) ? '' : `wrong run: ${said}`;
}

