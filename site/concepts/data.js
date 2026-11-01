/* Made-up but realistic data for the prototypes. Every number the Coach says is computed from this log. */
export const BENCH = {
  cutFrom: '2026-10-03',
  sessions: [
    { date: '2026-09-08', w: 75, r: 8, kcal: 2910, sleep: 7.4, sets: 4 },
    { date: '2026-09-11', w: 77.5, r: 7, kcal: 2880, sleep: 7.2, sets: 4 },
    { date: '2026-09-15', w: 77.5, r: 8, kcal: 2950, sleep: 7.5, sets: 4 },
    { date: '2026-09-18', w: 80, r: 6, kcal: 2900, sleep: 7.3, sets: 4 },
    { date: '2026-09-22', w: 80, r: 7, kcal: 2870, sleep: 7.1, sets: 4 },
    { date: '2026-09-26', w: 80, r: 8, kcal: 2930, sleep: 7.4, sets: 4 },
    { date: '2026-09-29', w: 80, r: 8, kcal: 2890, sleep: 7.2, sets: 4 },
    { date: '2026-10-03', w: 80, r: 8, kcal: 2480, sleep: 6.8, sets: 4 },
    { date: '2026-10-06', w: 80, r: 7, kcal: 2450, sleep: 6.4, sets: 4 },
    { date: '2026-10-10', w: 80, r: 7, kcal: 2420, sleep: 6.6, sets: 4 },
    { date: '2026-10-13', w: 80, r: 8, kcal: 2460, sleep: 6.5, sets: 4 },
    { date: '2026-10-17', w: 80, r: 6, kcal: 2380, sleep: 6.1, sets: 4 },
    { date: '2026-10-20', w: 80, r: 7, kcal: 2440, sleep: 6.4, sets: 4 },
    { date: '2026-10-24', w: 80, r: 8, kcal: 2470, sleep: 6.7, sets: 4 },
    { date: '2026-10-27', w: 80, r: 7, kcal: 2430, sleep: 6.3, sets: 4 },
    { date: '2026-11-01', w: 80, r: 8, kcal: 2450, sleep: 6.3, sets: 4 },
  ],
};

const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
/** The facts behind "why has my bench stalled?", worked out by the app, not the AI. */
export function benchFacts() {
  const S = BENCH.sessions;
  const before = S.filter((s) => s.date < BENCH.cutFrom), after = S.filter((s) => s.date >= BENCH.cutFrom);
  const reps = after.map((s) => s.r);
  return {
    sessionsSince: after.length,
    weight: after[0].w,
    repsMin: Math.min(...reps),
    repsMax: Math.max(...reps),
    kcalDrop: Math.round((avg(before.map((s) => s.kcal)) - avg(after.map((s) => s.kcal))) / 10) * 10,
    sleepDrop: +(avg(before.map((s) => s.sleep)) - avg(after.map((s) => s.sleep))).toFixed(1),
    setsSame: before.every((s) => s.sets === after[0].sets) && after.every((s) => s.sets === after[0].sets),
    sets: after[0].sets,
  };
}

/** Today's push workout. Bench is done; the rest is the plan. Minutes are estimates from his rest times. */
export const PLAN = {
  title: 'Push',
  done: [{ name: 'Bench press', sets: '80 × 8 · 8 · 7 · 7', min: 14 }],
  todo: [
    { id: 'incline', name: 'Incline dumbbell', sets: 3, reps: '10', kg: 30, min: 9 },
    { id: 'ohp', name: 'Overhead press', sets: 3, reps: '6–8', kg: 50, min: 9 },
    { id: 'fly', name: 'Cable fly', sets: 3, reps: '12', kg: 17.5, min: 7 },
    { id: 'tri', name: 'Triceps pushdown', sets: 3, reps: '12', kg: 35, min: 7 },
  ],
};
/** The Coach's 25-minute version: what changes and why. The app computes the minutes. */
export const CUT25 = {
  changes: { incline: { sets: 2, min: 6 }, fly: { cut: true }, tri: { sets: 2, min: 5 } },
  reason: 'Kept the overhead press: it’s the lift you’ve moved least this month. Cut the fly, bench already covered your chest.',
};
export const minutes = (todo, changes = {}) => todo.reduce((t, x) => t + (changes[x.id]?.cut ? 0 : (changes[x.id]?.min ?? x.min)), 0);
