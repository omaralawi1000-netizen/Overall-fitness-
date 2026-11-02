/**
 * Workout words: "bench press 80 kilos for 8, 8 and 6", "squat 100 x 5 x 3", "plank 60 seconds then run 5 km in 25 minutes"
 * → an exercise name and its sets. Ported from old Aven's workoutText.ts. The exercise is looked up in the catalog; when
 * two exercises match about equally, the parser offers both instead of choosing.
 */
import { CATALOG, type CatalogExercise } from '../data/exercises';
import { KG_PER_LB, M_PER_MI } from '../units';
import { fold, tokens } from './words';

export interface WorkoutSet { kg?: number; reps?: number; durationSec?: number; distanceM?: number; entered?: { value: number; unit: 'lb' } }
export interface WorkoutRow { raw: string; query: string; sets: WorkoutSet[] }

/** Only the number words that cannot be ordinary words ("to", "en" and "et" are left out: "back to back"). */
const W: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15, twenty: 20, tre: 3, fire: 4, fem: 5, seks: 6, syv: 7, otte: 8, ni: 9, ti: 10 };

function normaliseNumbers(s: string): string {
  return s
    .toLowerCase()
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|tre|fire|fem|seks|syv|otte|ni|ti)\b/g, (m) => String(W[m]))
    .replace(/×/g, ' x ');
}

export function splitExerciseSegments(text: string): string[] {
  return text
    .split(/\s*(?:;|\.\s+|\bthen\b|\bnext\b|\bderefter\b|\bdernaest\b|\bdernæst\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

const UNIT = '(?:kg|kilos?|kilograms?|lbs?|pounds?)';
const MAX_SETS = 12;
const load = (v: number, u?: string): { kg: number; entered?: { value: number; unit: 'lb' } } =>
  u && /^(lb|pound)/.test(u) ? { kg: Math.round(v * KG_PER_LB * 100) / 100, entered: { value: v, unit: 'lb' } } : { kg: v };

/** One spoken segment as an exercise query and sets. Conservative: anything unclear stays unset. */
export function parseWorkoutSegment(seg: string): WorkoutRow | null {
  const s = normaliseNumbers(seg);
  let rest = s;
  const sets: WorkoutSet[] = [];
  // "3 sets of 8 at 80 kg"
  let m = rest.match(new RegExp(`(\\d+)\\s*(?:sets?|saet|sæt)\\s*(?:of|a|af)?\\s*(\\d+)\\s*(?:reps?|gange)?\\s*(?:at|with|@|med|paa|på)\\s*(\\d+(?:\\.\\d+)?)\\s*(${UNIT})?`));
  if (m) {
    for (let i = 0; i < Math.min(Number(m[1]), MAX_SETS); i++) sets.push({ ...load(Number(m[3]), m[4]), reps: Number(m[2]) });
    rest = rest.replace(m[0], ' ');
  }
  // "80 kg x 8 x 3" / "80 for 8, 8 and 6"
  if (!sets.length) {
    m = rest.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNIT})?\\s*(?:x|for|by|gange)\\s*(\\d+)(?:\\s*x\\s*(\\d+))?(?!\\s*(?:min|sec|s\\b))`));
    if (m) {
      const times = m[4] ? Math.min(Number(m[4]), MAX_SETS) : 1;
      for (let i = 0; i < times; i++) sets.push({ ...load(Number(m[1]), m[2]), reps: Number(m[3]) });
      rest = rest.replace(m[0], ' ');
      const more = m.index !== undefined ? s.slice(m.index + m[0].length).match(/^\s*(?:(?:,|&|and|og)\s*\d+\s*)+/) : null;
      if (more) {
        for (const r of more[0].match(/\d+/g) ?? []) sets.push({ ...sets[0], reps: Number(r) });
        rest = rest.replace(more[0], ' ');
      }
    }
  }
  // "8, 8 and 6 reps at 80 kg"
  if (!sets.length) {
    m = rest.match(new RegExp(`((?:\\d+\\s*(?:,|&|and|og)?\\s*)+)\\s*(?:reps?|gange)\\s*(?:at|with|@|med|paa|på)\\s*(\\d+(?:\\.\\d+)?)\\s*(${UNIT})?`));
    if (m) {
      for (const r of m[1].match(/\d+/g) ?? []) sets.push({ ...load(Number(m[2]), m[3]), reps: Number(r) });
      rest = rest.replace(m[0], ' ');
    }
  }
  // time and distance: "plank 60 seconds", "run 5 km in 25 minutes"
  if (!sets.length) {
    const dist = rest.match(/(\d+(?:\.\d+)?)\s*(km|kilometers?|kilometres?|mi|miles?|m\b|meters?|metres?)/);
    const dur = rest.match(/(\d+(?:\.\d+)?)\s*(seconds?|secs?|sek|minutes?|mins?|min|hours?|timer?|h\b)/);
    if (dist || dur) {
      const set: WorkoutSet = {};
      if (dist) {
        const v = Number(dist[1]);
        set.distanceM = /^km|kilo/.test(dist[2]) ? v * 1000 : /^mi/.test(dist[2]) ? v * M_PER_MI : v;
        rest = rest.replace(dist[0], ' ');
      }
      const d2 = rest.match(/(\d+(?:\.\d+)?)\s*(seconds?|secs?|sek|minutes?|mins?|min|hours?|timer?|h\b)/);
      if (d2) {
        const v = Number(d2[1]);
        set.durationSec = /^(sec|sek)/.test(d2[2]) ? v : /^(h|hour|time)/.test(d2[2]) ? v * 3600 : v * 60;
        rest = rest.replace(d2[0], ' ');
      }
      sets.push(set);
    }
  }
  // "10 reps" alone (bodyweight)
  if (!sets.length) {
    m = rest.match(/(\d+)\s*(?:reps?|gange)/);
    if (m) { sets.push({ reps: Number(m[1]) }); rest = rest.replace(m[0], ' '); }
  }
  const query = rest.replace(/\b(at|with|for|of|did|i did|log|add|a|an|the|reps?|sets?|in|i|og|and|på|paa)\b/g, ' ').replace(/[\d.,&@x]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!query || !sets.length) return null; // an exercise with no sets, or sets with no exercise, is not a workout phrase
  return { raw: seg, query, sets };
}

export function parseWorkoutText(text: string): { rows: WorkoutRow[]; unread: string[] } {
  const rows: WorkoutRow[] = [];
  const unread: string[] = [];
  for (const seg of splitExerciseSegments(text)) {
    const r = parseWorkoutSegment(seg);
    if (r) rows.push(r); else unread.push(seg);
  }
  return { rows, unread };
}

// What people call a lift at the gym → its name in the catalog (folded). Scored a little above a plain tie.
const LIFT_ALIASES: Record<string, string> = {
  bench: 'barbell bench press', 'bench press': 'barbell bench press', baenkpres: 'barbell bench press', baenk: 'barbell bench press', 'flat bench': 'barbell bench press',
  rdl: 'romanian deadlift', rdls: 'romanian deadlift', 'romanian deadlifts': 'romanian deadlift', 'rumaensk dodloft': 'romanian deadlift',
  'pull up': 'pull-up', 'pull ups': 'pull-up', pullup: 'pull-up', pullups: 'pull-up', 'pull-ups': 'pull-up', pullop: 'pull-up', pullops: 'pull-up',
  'chin up': 'chin-up', 'chin ups': 'chin-up', chinup: 'chin-up', chinups: 'chin-up', 'chin-ups': 'chin-up',
  squat: 'back squat', squats: 'back squat', 'barbell squat': 'back squat', knaeboj: 'back squat',
  ohp: 'overhead press', 'military press': 'overhead press', 'shoulder press': 'overhead press', skulderpres: 'overhead press',
  row: 'barbell row', rows: 'barbell row', 'bent over row': 'barbell row', 'bent over rows': 'barbell row', roning: 'barbell row',
  curl: 'barbell curl', curls: 'barbell curl', 'bicep curl': 'barbell curl', 'bicep curls': 'barbell curl', 'biceps curl': 'barbell curl', 'biceps curls': 'barbell curl',
  'skull crusher': 'skullcrusher', 'skull crushers': 'skullcrusher', skullcrushers: 'skullcrusher',
  dodloft: 'deadlift', 'dead lift': 'deadlift', deadlifts: 'deadlift',
};
const aliasOf = (q: string) => LIFT_ALIASES[fold(q).replace(/\s+/g, ' ').trim()];
const isBarbell = (e: CatalogExercise) => e.equipment[0] === 'barbell';

export interface ExerciseMatch { exercise: CatalogExercise; score: number }

export function matchExercises(query: string, pool: CatalogExercise[] = CATALOG, limit = 5): ExerciseMatch[] {
  const q = tokens(query);
  if (!q.length) return [];
  const alias = aliasOf(query);
  // "ups" is "up" ("pull-ups" said, "Pull-up" in the catalog)
  const same = (x: string, t: string) => x === t || `${x}s` === t || `${t}s` === x;
  const out: ExerciseMatch[] = [];
  for (const exercise of pool) {
    let best = alias && fold(exercise.name) === fold(alias) ? 0.86 : 0;
    for (const n of [exercise.name, exercise.nameDa ?? '', ...(exercise.aka ?? [])]) {
      if (!n) continue;
      const nt = tokens(n);
      if (fold(n) === fold(query)) best = Math.max(best, 1);
      else if (q.every((t) => nt.some((x) => same(x, t)))) best = Math.max(best, 0.85 - Math.min(0.3, (nt.length - q.length) * 0.05));
      else {
        const hit = q.filter((t) => nt.some((x) => x.startsWith(t) || t.startsWith(x))).length;
        if (hit) best = Math.max(best, (hit / q.length) * 0.55);
      }
    }
    if (best >= 0.3) out.push({ exercise, score: best });
  }
  // a tie goes to the barbell lift (the one people mean by "bench" or "squat"), then the shorter name
  return out.sort((a, b) => b.score - a.score || Number(isBarbell(b.exercise)) - Number(isBarbell(a.exercise)) || a.exercise.name.length - b.exercise.name.length).slice(0, limit);
}

/** Sure enough to use without asking: a good match that clearly beats the next one. */
export const SURE = 0.55;
export const TIE = 0.06;
