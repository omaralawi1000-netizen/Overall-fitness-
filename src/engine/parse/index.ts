/**
 * The instant parser: one phrase in (typed or dictated), one reading out. No AI, no network, nothing is saved here.
 * The rule that rules the rest: when it is not sure, it ASKS (with the readings it can see) or IGNORES. It never guesses,
 * and talking to someone else never turns into a logged set, meal, glass of water or weight.
 *
 * Order: water → bodyweight → set commands (only with a workout open) → exercises with sets → food. Water and bodyweight
 * go first because they need their own word; a bare number is always a set, never a weight.
 */
import { parseSetCommand, type SetCommand } from './set';
import { readWater, readBodyweight, type WaterRead, type BodyweightRead } from './body';
import { parseFood, type FoodRow } from './food';
import { parseWorkoutText, matchExercises, SURE, TIE, type WorkoutRow, type ExerciseMatch } from './workout';
import type { CatalogExercise } from '../data/exercises';

export { parseSetCommand, guardSet, fixMisheard, type SetCommand } from './set';
export { parseFood, rowQuantity, splitSegments, placeholderPortion, type FoodRow, type FoodShape, type Quantity } from './food';
export { parseWorkoutText, matchExercises, type WorkoutRow, type WorkoutSet } from './workout';
export { readWater, readBodyweight } from './body';

export type Command = Exclude<SetCommand, { kind: 'ask' }>;

export interface WorkoutReading {
  row: WorkoutRow;
  /** set when one exercise is clearly the one meant */
  exercise?: CatalogExercise;
  /** the closest few, best first (shown when `exercise` is not set) */
  candidates: ExerciseMatch[];
}

export type Understood =
  | { kind: 'command'; cmd: Command }
  | ({ kind: 'water' } & WaterRead)
  | ({ kind: 'bodyweight' } & BodyweightRead)
  | { kind: 'food'; rows: FoodRow[]; meal?: Meal }
  | { kind: 'workout'; rows: WorkoutReading[] }
  /** not sure: the person picks, or says it again. Nothing is logged. */
  | { kind: 'ask'; why: 'bareNo' | 'correction' | 'which' | 'range' | 'partial' | 'exercise'; options?: Understood[]; unread?: string[]; text?: string }
  /** not something to log (talk, or a set with no workout open) */
  | { kind: 'ignored'; reason: 'empty' | 'notLoggable' | 'noWorkoutOpen' };

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
const MEALS: [RegExp, Meal][] = [
  [/\b(?:for |til )(?:breakfast|morgenmad)\s*$/i, 'breakfast'], [/\b(?:for |til )(?:lunch|frokost)\s*$/i, 'lunch'],
  [/\b(?:for |til )(?:dinner|supper|aftensmad)\s*$/i, 'dinner'], [/\b(?:as |som )(?:a |en )?(?:snack|mellemmaaltid|mellemmåltid)\s*$/i, 'snack'],
];
const FOOD_LEAD = /^(?:i (?:just )?(?:ate|had)|jeg (?:har )?(?:lige )?(?:spist|spiste)|ate|spiste|log|add|tilføj|tilfoej)\s+/i;

/** Longest phrase read (the phrase box reads on every keystroke). */
const MAX_LEN = 300;

export interface Context { workoutOpen: boolean }

export function understand(text: string, ctx: Context = { workoutOpen: false }): Understood {
  const t = text.trim();
  if (!t) return { kind: 'ignored', reason: 'empty' };
  if (t.length > MAX_LEN) return { kind: 'ignored', reason: 'notLoggable' }; // a pasted wall of text is not a phrase

  const w = readWater(t);
  if (w) return 'ask' in w ? { kind: 'ask', why: 'range', text: `${w.value} ${w.unit} of water?` } : { kind: 'water', ...w };
  const b = readBodyweight(t);
  if (b) return 'ask' in b ? { kind: 'ask', why: 'range', text: `${b.value} ${b.unit} as a body weight?` } : { kind: 'bodyweight', ...b };

  const c = parseSetCommand(t);
  if (c) {
    if (c.kind === 'ask') return { kind: 'ask', why: c.why, ...(c.options ? { options: c.options.map(asUnderstood) } : {}) };
    if (c.kind === 'undo') return { kind: 'command', cmd: c };
    return ctx.workoutOpen ? { kind: 'command', cmd: c } : { kind: 'ignored', reason: 'noWorkoutOpen' };
  }

  const wo = readWorkout(t);
  if (wo) return wo;

  let meal: Meal | undefined;
  let f = t;
  for (const [re, m] of MEALS) if (re.test(f)) { meal = m; f = f.replace(re, '').trim(); }
  const lead = FOOD_LEAD.test(f);
  f = f.replace(FOOD_LEAD, '');
  const { rows, unread } = parseFood(f);
  // "a dog and a cat": an article is not an amount unless an "I ate" or a meal word says this is food
  if (!rows.length || (rows.some((r) => r.weak) && !lead && !meal)) return { kind: 'ignored', reason: 'notLoggable' };
  // some of it read, some not: show what was read and what wasn't, and log nothing until it is said again
  if (unread.length) return { kind: 'ask', why: 'partial', options: [{ kind: 'food', rows, ...(meal ? { meal } : {}) }], unread };
  return { kind: 'food', rows, ...(meal ? { meal } : {}) };
}

function asUnderstood(c: SetCommand): Understood {
  return c.kind === 'ask' ? { kind: 'ask', why: c.why, ...(c.options ? { options: c.options.map(asUnderstood) } : {}) } : { kind: 'command', cmd: c };
}

function readWorkout(t: string): Understood | null {
  const { rows, unread } = parseWorkoutText(t);
  const read: WorkoutReading[] = [];
  const left = [...unread];
  for (const row of rows) {
    const candidates = matchExercises(row.query, undefined, 3);
    if (!candidates.length) { left.push(row.raw); continue; }
    const [a, b] = candidates;
    const sure = a.score >= SURE && (!b || a.score - b.score > TIE);
    read.push({ row, candidates, ...(sure ? { exercise: a.exercise } : {}) });
  }
  if (!read.length) return null;
  if (left.length) return { kind: 'ask', why: 'partial', options: [{ kind: 'workout', rows: read }], unread: left };
  // an exercise two names could mean: ask which, with each reading offered
  if (read.some((r) => !r.exercise)) return { kind: 'ask', why: 'exercise', options: [{ kind: 'workout', rows: read }] };
  return { kind: 'workout', rows: read };
}

// ── Readable results ────────────────────────────────────────

const num = (x: number) => String(Math.round(x * 100) / 100);
const setText = (s: { kg?: number; reps?: number; entered?: { value: number; unit: string } }) =>
  [s.reps !== undefined ? `${s.reps} reps` : '', s.kg !== undefined ? (s.entered ? `${num(s.entered.value)} ${s.entered.unit} (${num(s.kg)} kg)` : `${num(s.kg)} kg`) : ''].filter(Boolean).join(' at ') || 'a set';
const rowText = (r: FoodRow) => `${num(r.amount)}${r.dim === 'count' ? (r.countWord ? ` ${r.countWord}` : '') : ` ${r.dim}`} ${r.query}`;
const dur = (sec: number) => (sec % 60 === 0 && sec >= 60 ? `${sec / 60} min` : `${num(sec)} s`);

/** The reading as a plain sentence (the debug page shows this; later screens will show their own words). */
export function show(u: Understood): string {
  switch (u.kind) {
    case 'command': {
      const c = u.cmd;
      return c.kind === 'set' ? `Log a set: ${setText(c)}`
        : c.kind === 'same' ? 'Same as the last set'
        : c.kind === 'done' ? 'Set done'
        : c.kind === 'skip' ? 'Skip this set'
        : c.kind === 'rest' ? `Add ${c.sec} s to the rest`
        : 'Undo the last thing';
    }
    case 'water': return `Water: ${num(u.ml)} ml${u.assumed ? ` (${u.assumed})` : ''}`;
    case 'bodyweight': return `Body weight: ${num(u.kg)} kg${u.entered ? ` (said ${num(u.entered.value)} ${u.entered.unit})` : ''}${u.assumedUnit ? ' (no unit said: kilos)' : ''}`;
    case 'food': return `Food${u.meal ? ` for ${u.meal}` : ''}: ${u.rows.map(rowText).join('; ')}`;
    case 'workout': return u.rows.map((r) => `${r.exercise ? r.exercise.name : `? ${r.row.query} (${r.candidates.map((c) => c.exercise.name).join(' or ')})`}: ${r.row.sets.map((s) => workoutSetText(s)).join(', ')}`).join(' | ');
    case 'ask': {
      const head = u.why === 'bareNo' ? 'Not sure: "no" to what? Say "undo" to take the last thing back, or say the set again.'
        : u.why === 'correction' ? 'Not sure what to change.'
        : u.why === 'which' ? 'Not sure which number you changed.'
        : u.why === 'range' ? `Not sure: ${u.text ?? 'that number looks wrong'}`
        : u.why === 'exercise' ? 'Not sure which exercise.'
        : `I read only part of it (not read: ${(u.unread ?? []).join('; ')}).`;
      return u.options?.length ? `${head} ${u.options.map((o) => `Did you mean: ${show(o)}?`).join(' ')}` : head;
    }
    case 'ignored': return u.reason === 'noWorkoutOpen' ? 'Nothing logged: no workout is open.' : u.reason === 'empty' ? 'Nothing said.' : 'Nothing logged: that did not look like a set, meal, water or weight.';
  }
}
function workoutSetText(s: { kg?: number; reps?: number; durationSec?: number; distanceM?: number; entered?: { value: number; unit: string } }): string {
  const bits = [s.distanceM !== undefined ? `${num(s.distanceM / 1000)} km` : '', s.durationSec !== undefined ? dur(s.durationSec) : ''].filter(Boolean);
  return bits.length ? bits.join(' in ') : setText(s);
}
