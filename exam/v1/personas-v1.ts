// Coach exam v1 (Aven 2, 27 Oct 2026): fake people in old Aven's AppData format, built for a "now" chosen per
// conversation. Never anyone's real data: omar2 is invented from the shape of Omar's week as told in the interview
// (docs/INTERVIEW.md in Aven 2), with made-up numbers; the friends are invented outright.
// Every persona is a function of `now`: call it AFTER the clock is set to that moment (the builders read Date.now()).
import { defaultData } from '../../src/state/defaults';
import { buildStarter, assignWeek } from '../../src/lib/starter';
import { SEED_EXERCISES } from '../../src/data/exercises';
import { addDays, dayKey } from '../../src/lib/dates';
import { detectRecords } from '../../src/lib/workout';
import type { AppData, FoodEntry, Goal, Experience, HealthDay, MemoryNote, Routine, RoutineItem, SessionExercise, WorkoutSession, ActivityLog } from '../../src/lib/types';

// ── small builders ──────────────────────────────────────────
let n = 0;
const id = (p: string) => `${p}${(n++).toString(36)}`;
/** ms for a local time on a day key */
export const at = (date: string, h: number, m = 0) => { const [y, mo, d] = date.split('-').map(Number); return new Date(y, mo - 1, d, h, m).getTime(); };
const wdOf = (date: string) => new Date(`${date}T12:00:00`).getDay();
/** a tiny deterministic wobble in [-1, 1] from a number */
const wob = (k: number) => Math.sin(k * 12.9898) * 0.5 + Math.sin(k * 4.1414) * 0.5;
const exById = new Map(SEED_EXERCISES.map((e) => [e.id, e]));

/** per 100 g: kcal, protein, carbs, fat */
type Per = [number, number, number, number];
export const FOODS: Record<string, { name: string; per: Per }> = {
  skyr: { name: 'Skyr naturel', per: [63, 11, 4, 0.2] },
  oats: { name: 'Havregryn', per: [370, 13, 59, 7] },
  chicken: { name: 'Kyllingebryst, stegt', per: [165, 31, 0, 3.6] },
  rice: { name: 'Ris, kogt', per: [130, 2.7, 28, 0.3] },
  banana: { name: 'Banan', per: [89, 1.1, 23, 0.3] },
  bar: { name: 'Proteinbar', per: [360, 33, 35, 10] },
  mince: { name: 'Hakket oksekød 8%, stegt', per: [200, 26, 0, 10] },
  potato: { name: 'Kartofler, kogte', per: [77, 2, 17, 0.1] },
  rye: { name: 'Rugbrød', per: [220, 6, 40, 3] },
  oil: { name: 'Olivenolie', per: [884, 0, 0, 100] },
  egg: { name: 'Æg', per: [143, 12.6, 0.7, 9.5] },
  milk: { name: 'Letmælk', per: [46, 3.5, 4.7, 1.5] },
  pasta: { name: 'Pasta, kogt', per: [158, 5.8, 31, 0.9] },
  salmon: { name: 'Laks, bagt', per: [206, 22, 0, 13] },
  chips: { name: 'Chips', per: [536, 6, 53, 34] },
  choc: { name: 'Mælkechokolade', per: [535, 7.6, 59, 30] },
  icecream: { name: 'Is', per: [207, 3.5, 24, 11] },
  pizza: { name: 'Pizza', per: [266, 11, 33, 10] },
  cheese: { name: 'Ost 30+', per: [300, 28, 0, 20] },
  apple: { name: 'Æble', per: [52, 0.3, 14, 0.2] },
  whey: { name: 'Whey protein', per: [380, 78, 7, 5] },
  yogurt: { name: 'Græsk yoghurt', per: [97, 9, 4, 5] },
  granola: { name: 'Granola', per: [450, 10, 64, 16] },
  bread: { name: 'Toastbrød', per: [265, 9, 49, 3.2] },
};
export function food(date: string, meal: string, key: string, grams: number, when: number): FoodEntry {
  const f = FOODS[key];
  const [k, p, c, fat] = f.per;
  const r = (x: number) => Math.round((x * grams) / 100 * 10) / 10;
  return {
    id: id('f'), date, mealId: meal, at: when,
    snap: { name: f.name, source: 'reference', basis: 'g', per100: { kcal: k, protein: p, carbs: c, fat }, portions: [] },
    qty: { amount: grams, unit: 'g' }, base: grams,
    nutrients: { kcal: Math.round((k * grams) / 100), protein: r(p), carbs: r(c), fat: r(fat) },
  };
}
const mem = (text: string, kind: MemoryNote['kind'], now: Date, daysAgo = 20, extra: Partial<MemoryNote> = {}): MemoryNote => ({ id: id('m'), text, kind, at: now.getTime() - daysAgo * 86400000, ...extra });
function item(exerciseId: string, workingSets: number, repMin: number, repMax: number, warmupSets = 0, restSec = 120): RoutineItem {
  return { id: id('ri'), exerciseId, warmupSets, workingSets, repMin, repMax, restSec };
}
function base(lang: 'en' | 'da', name: string, goal: Goal, exp: Experience, days: number[], goals: AppData['settings']['goals']): AppData {
  const d = defaultData(lang);
  d.settings.onboarded = true; d.settings.dayStartHour = 0; d.settings.name = name; d.settings.language = lang;
  d.settings.goals = { ...d.settings.goals, ...goals };
  d.settings.profile = { goal, experience: exp, equipment: 'fullGym', days };
  return d;
}
const everyWeekdaySince = (date: string) => Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((w) => [w, date])) as Record<number, string>;

/**
 * Logged workouts for every planned day from `from` up to now (today's only if it is already finished by `now`), taking
 * every working set close to failure (reps falling 8, 7, 6) and adding weight every second session of a routine.
 * `start` = each exercise's first weight; `stall` = exercise id → [the session index from which it stays, weight, reps].
 */
function logSessions(d: AppData, from: string, now: Date, startHour: number, start: Record<string, number>, o: { skip?: string[]; stall?: Record<string, [number, number, number]>; step?: Record<string, number>; every?: number } = {}) {
  const today = dayKey(now.getTime(), 0);
  const count: Record<string, number> = {};
  for (let date = from; date <= today; date = addDays(date, 1)) {
    const rid = d.schedule.weekly[wdOf(date)];
    if (!rid || o.skip?.includes(date)) continue;
    const r = d.routines.find((x) => x.id === rid)!;
    const begin = at(date, startHour, 30);
    const end = begin + 70 * 60000;
    if (end > now.getTime()) continue;
    const k = (count[rid] = (count[rid] ?? 0) + 1) - 1;
    let t = begin + 5 * 60000;
    const exs: SessionExercise[] = r.items.map((it) => {
      const ex = exById.get(it.exerciseId)!;
      const step = o.step?.[it.exerciseId] ?? (ex.equipment.includes('barbell') || ex.equipment.includes('machine') ? 2.5 : ex.equipment.includes('cable') ? 2.5 : 2);
      const stall = o.stall?.[it.exerciseId];
      const kg = stall && k >= stall[0] ? stall[1] : start[it.exerciseId] + Math.floor(k / (o.every ?? 2)) * step;
      const top = stall && k >= stall[0] ? stall[2] : it.repMax - 2 + (k % 2);
      const sets = [];
      for (let w = 0; w < it.warmupSets; w++) sets.push({ id: id('s'), type: 'warmup' as const, weightKg: Math.round((kg * 0.6) / 2.5) * 2.5, reps: 8, done: true, completedAt: (t += 120000) });
      for (let w = 0; w < it.workingSets; w++) sets.push({ id: id('s'), type: 'working' as const, weightKg: ex.logType === 'bodyweightReps' ? undefined : kg, reps: Math.max(it.repMin - 2, top - w), done: true, completedAt: (t += 180000), target: { repMin: it.repMin, repMax: it.repMax } });
      return { id: id('se'), exerciseId: it.exerciseId, restSec: it.restSec, sets, plannedSets: it.workingSets };
    });
    const s: WorkoutSession = { id: id('ws'), name: r.name, routineId: r.id, plannedDate: date, date, startedAt: begin, endedAt: end, pausedMs: 0, status: 'done', exercises: exs };
    s.records = detectRecords(s, d.sessions, (x) => exById.get(x));
    d.sessions.push(s);
  }
}

// ── omar2 ───────────────────────────────────────────────────
// Wrestling Mon + Wed (planned activities), Push Tue + Fri, Pull Thu + Sun, Legs & shoulders Sat. Split shifts on
// weekdays, trains about 15:30. Cutting at 2,550 kcal / 220 g protein / 70 g fat / 260 g carbs. Galaxy Watch.
export const OMAR_FROM_DAYS = 28;
/** his normal day of food, about 2,450 kcal and 210 g protein (a wobble from `k`), eaten up to `upTo` (ms) */
export function omarDay(date: string, k: number, upTo = Infinity): FoodEntry[] {
  const s = 1 + wob(k) * 0.05;
  const g = (x: number) => Math.round(x * s);
  const weekend = [0, 6].includes(wdOf(date));
  const rows: [string, string, number, number][] = weekend
    ? [['breakfast', 'egg', 180, at(date, 9)], ['breakfast', 'bread', 70, at(date, 9)], ['breakfast', 'skyr', 300, at(date, 9, 5)],
      ['lunch', 'chicken', 200, at(date, 13)], ['lunch', 'pasta', 250, at(date, 13)],
      ['snacks', 'banana', 120, at(date, 15)], ['snacks', 'bar', 60, at(date, 17, 30)],
      ['dinner', 'salmon', 180, at(date, 19, 30)], ['dinner', 'potato', 300, at(date, 19, 30)], ['dinner', 'oil', 10, at(date, 19, 30)]]
    : [['breakfast', 'skyr', 450, at(date, 6, 30)], ['breakfast', 'oats', 60, at(date, 6, 30)],
      ['lunch', 'chicken', 220, at(date, 11, 45)], ['lunch', 'rice', 250, at(date, 11, 45)],
      ['snacks', 'banana', 120, at(date, 15)], ['snacks', 'bar', 60, at(date, 17)],
      ['dinner', 'mince', 200, at(date, 19, 30)], ['dinner', 'potato', 300, at(date, 19, 30)], ['dinner', 'oil', 15, at(date, 19, 30)],
      ['dinner', 'rye', 100, at(date, 20, 30)]];
  return rows.filter((r) => r[3] <= upTo).map(([meal, key, grams, when]) => food(date, meal, key, g(grams), when));
}
export function omar2(now: Date): AppData {
  const today = dayKey(now.getTime(), 0);
  const from = addDays(today, -OMAR_FROM_DAYS);
  const d = base('en', 'Omar', 'fatloss', 'some', [0, 2, 4, 5, 6], { kcal: 2550, protein: 220, fat: 70, carbs: 260 });
  const push: Routine = { id: 'rt-push', name: 'Push', items: [item('bench-press', 3, 6, 10, 1), item('incline-db-press', 3, 8, 12), item('machine-chest-press', 2, 8, 12), item('tricep-pushdown', 3, 10, 15, 0, 90), item('lateral-raise', 3, 12, 15, 0, 75)], createdAt: at(from, 10) - 7 * 86400000, updatedAt: at(from, 10) - 7 * 86400000 };
  const pull: Routine = { id: 'rt-pull', name: 'Pull', items: [item('lat-pulldown', 3, 8, 12), item('barbell-row', 3, 6, 10, 1), item('seated-cable-row', 2, 8, 12), item('face-pull', 3, 12, 15, 0, 75), item('db-curl', 3, 8, 12, 0, 90), item('hammer-curl', 2, 8, 12, 0, 90)], createdAt: push.createdAt, updatedAt: push.updatedAt };
  const legs: Routine = { id: 'rt-legs', name: 'Legs & shoulders', items: [item('back-squat', 3, 6, 10, 1, 150), item('romanian-deadlift', 3, 8, 10), item('leg-press', 2, 10, 12), item('leg-curl', 3, 10, 12, 0, 90), item('standing-calf-raise', 3, 10, 15, 0, 75), item('overhead-press', 3, 6, 10, 1), item('lateral-raise', 3, 12, 15, 0, 75)], createdAt: push.createdAt, updatedAt: push.updatedAt };
  d.routines = [push, pull, legs];
  d.schedule = { ...d.schedule, mode: 'weekly', weekly: { 0: 'rt-pull', 1: null, 2: 'rt-push', 3: null, 4: 'rt-pull', 5: 'rt-push', 6: 'rt-legs' }, activities: { 1: ['wrestling'], 3: ['wrestling'] }, weeklySince: everyWeekdaySince(addDays(from, -7)) };
  logSessions(d, from, now, 15, {
    'bench-press': 70, 'incline-db-press': 24, 'machine-chest-press': 60, 'tricep-pushdown': 30, 'lateral-raise': 10,
    'lat-pulldown': 60, 'barbell-row': 62.5, 'seated-cable-row': 55, 'face-pull': 20, 'db-curl': 14, 'hammer-curl': 14,
    'back-squat': 90, 'romanian-deadlift': 90, 'leg-press': 160, 'leg-curl': 45, 'standing-calf-raise': 80, 'overhead-press': 47.5,
  }, { step: { 'lateral-raise': 1, 'db-curl': 1, 'hammer-curl': 1, 'face-pull': 2.5 } });
  // wrestling Mon + Wed evenings (beginner: drilling and a few goes)
  for (let date = from; date <= today; date = addDays(date, 1)) {
    if (![1, 3].includes(wdOf(date)) || at(date, 20) > now.getTime()) continue;
    d.activities.push({ id: id('ac'), date, kind: 'wrestling', durationSec: 5400, rounds: 6, intensity: 2, at: at(date, 18, 30), startAt: at(date, 18, 30) });
  }
  // food: every day of the four weeks, today up to now
  d.entries = [];
  for (let i = OMAR_FROM_DAYS, k = 0; i >= 0; i--, k++) { const date = addDays(today, -i); d.entries.push(...omarDay(date, k, i === 0 ? now.getTime() : Infinity)); }
  // one evening over two and a half weeks ago (the cut is mostly steady now)
  const old = addDays(today, -17);
  d.entries.push(food(old, 'snacks', 'chips', 175, at(old, 21, 40)), food(old, 'snacks', 'choc', 100, at(old, 21, 50)));
  // weigh-ins most mornings: 95.0 four weeks ago, down about 0.5 kg a week, the usual day-to-day noise
  for (let i = OMAR_FROM_DAYS; i >= 0; i--) {
    if (i % 3 === 2) continue;
    const date = addDays(today, -i);
    if (at(date, 6, 15) > now.getTime()) continue;
    d.weights.push({ id: id('wt'), date, kg: Math.round((95.0 - ((OMAR_FROM_DAYS - i) * 0.5) / 7 + wob(i) * 0.35) * 10) / 10, at: at(date, 6, 15) });
  }
  // the watch: nights of about 6 h 40 (up at 06:00 on weekdays, longer at the weekend), resting HR ~52, HRV ~60
  d.health = [];
  d.steps = [];
  for (let i = OMAR_FROM_DAYS; i >= 0; i--) {
    const date = addDays(today, -i); const we = [0, 6].includes(wdOf(date));
    const h: HealthDay = { date, sleepMin: Math.round((we ? 470 : 400) + wob(i + 3) * 20), restHr: Math.round(52 + wob(i + 7) * 2), hrv: Math.round(60 + wob(i + 11) * 5) };
    if (i > 0) Object.assign(h, { totalKcal: Math.round(3150 + wob(i) * 200), activeKcal: Math.round(850 + wob(i + 1) * 150) });
    d.health.push(h);
    if (i > 0) d.steps.push({ date, count: Math.round(10500 + wob(i + 5) * 2500) });
  }
  d.memory = [
    mem('Works split shifts on weekdays (about 07:00–08:30 and 12:30–14:45); usually trains after work, around 15:30, sometimes right after the morning shift.', 'schedule', now, 25),
    mem('Takes almost every set to failure; does not want to be told to train lighter.', 'preference', now, 25),
    mem('Beginner wrestler (Mondays and Wednesdays); does not compete yet but wants to compete one day.', 'goal', now, 24),
    mem('Cutting. The hard part is a steady food routine without big evenings; it is getting better.', 'food', now, 24),
    mem('Wears a Galaxy Watch (sleep and heart rate come from it).', 'gear', now, 23),
    mem('Goal: 90 kg by 31 January 2027.', 'goal', now, OMAR_FROM_DAYS, { goal: { metric: 'weight', target: 90, by: '2027-01-31', startDate: from, start: 95.0 } }),
  ];
  d.marks = { heavySeen: addDays(from, -30) };
  return d;
}

// ── friends ─────────────────────────────────────────────────
/** 17: a total beginner (iPhone, no watch, never trained) who has just finished old Aven's setup form: General fitness,
 *  New, Full gym, the default days (Mon, Wed, Fri), no targets, the starter plan left on. Nothing logged. */
export function beginner(now: Date): AppData {
  const d = defaultData('en');
  d.settings.onboarded = true; d.settings.name = 'Sam';
  d.settings.profile = { goal: 'general', experience: 'new', equipment: 'fullGym', days: [1, 3, 5] };
  d.routines = buildStarter({ days: 3, goal: 'general', experience: 'new', access: 'fullGym' }, SEED_EXERCISES).filter((r) => r.items.length);
  d.schedule = { ...d.schedule, mode: 'weekly', weekly: assignWeek([1, 3, 5], d.routines), weeklySince: everyWeekdaySince(dayKey(now.getTime(), d.settings.dayStartHour)) };
  return d;
}

/** 18: a Danish footballer, fresh: the form in Danish, General fitness, Some experience, Mon + Thu at the gym, no targets,
 *  starter plan left on. Nothing logged. */
export function footballer(now: Date): AppData {
  const d = defaultData('da');
  d.settings.onboarded = true; d.settings.name = 'Mikkel'; d.settings.language = 'da';
  d.settings.profile = { goal: 'general', experience: 'some', equipment: 'fullGym', days: [1, 4] };
  d.routines = buildStarter({ days: 2, goal: 'general', experience: 'some', access: 'fullGym' }, SEED_EXERCISES).filter((r) => r.items.length);
  d.schedule = { ...d.schedule, mode: 'weekly', weekly: assignWeek([1, 4], d.routines), weeklySince: everyWeekdaySince(dayKey(now.getTime(), d.settings.dayStartHour)) };
  return d;
}

/** 19: a beginner on old Aven's 2-day starter plan (Mon + Thu) for four weeks: the first three weeks done, both workouts
 *  of this week missed. A few meals logged now and then. */
export function missed(now: Date): AppData {
  const today = dayKey(now.getTime(), 0);
  const d = base('en', 'Ava', 'general', 'new', [1, 4], {});
  const start = addDays(today, -27);
  d.routines = buildStarter({ days: 2, goal: 'general', experience: 'new', access: 'fullGym' }, SEED_EXERCISES).filter((r) => r.items.length);
  for (const r of d.routines) { r.createdAt = at(start, 9); r.updatedAt = r.createdAt; }
  d.schedule = { ...d.schedule, mode: 'weekly', weekly: assignWeek([1, 4], d.routines), weeklySince: everyWeekdaySince(start) };
  const weekStart = addDays(today, -((wdOf(today) + 6) % 7)); // this Monday
  const skip: string[] = []; for (let x = weekStart; x <= today; x = addDays(x, 1)) skip.push(x);
  const startKg: Record<string, number> = {};
  for (const r of d.routines) for (const it of r.items) { const ex = exById.get(it.exerciseId)!; startKg[it.exerciseId] = ex.muscles[0] === 'quads' || ex.muscles[0] === 'hamstrings' ? 30 : ex.equipment.includes('barbell') ? 25 : ex.equipment.includes('machine') || ex.equipment.includes('cable') ? 25 : 8; }
  logSessions(d, start, now, 17, startKg, { skip, every: 3 });
  for (let i = 20; i >= 1; i -= 3) { const date = addDays(today, -i); d.entries.push(food(date, 'breakfast', 'yogurt', 200, at(date, 8)), food(date, 'breakfast', 'granola', 50, at(date, 8)), food(date, 'lunch', 'chicken', 120, at(date, 12, 30)), food(date, 'lunch', 'rice', 180, at(date, 12, 30))); }
  d.memory = [mem('Started training a month ago; never lifted before.', 'other', now, 27)];
  return d;
}

/** 20: a 16-year-old (memory says so), about 72 kg, a couple of weeks of food logged, no calorie target set. */
export function teen(now: Date): AppData {
  const today = dayKey(now.getTime(), 0);
  const d = base('en', 'Jonas', 'general', 'new', [1, 3, 5], {});
  d.routines = buildStarter({ days: 3, goal: 'general', experience: 'new', access: 'fullGym' }, SEED_EXERCISES).filter((r) => r.items.length);
  d.schedule = { ...d.schedule, mode: 'weekly', weekly: assignWeek([1, 3, 5], d.routines), weeklySince: everyWeekdaySince(addDays(today, -15)) };
  for (let i = 14; i >= 1; i--) {
    const date = addDays(today, -i); const s = 1 + wob(i) * 0.08;
    d.entries.push(food(date, 'breakfast', 'granola', Math.round(70 * s), at(date, 7, 30)), food(date, 'breakfast', 'milk', 250, at(date, 7, 30)),
      food(date, 'lunch', 'bread', Math.round(120 * s), at(date, 11, 30)), food(date, 'lunch', 'cheese', 40, at(date, 11, 30)),
      food(date, 'dinner', 'pasta', Math.round(350 * s), at(date, 18, 30)), food(date, 'dinner', 'mince', 150, at(date, 18, 30)),
      food(date, 'snacks', 'chips', Math.round(40 * s), at(date, 20, 30)), food(date, 'snacks', 'apple', 150, at(date, 15)));
  }
  for (const i of [13, 9, 6, 2]) d.weights.push({ id: id('wt'), date: addDays(today, -i), kg: Math.round((72.4 + wob(i) * 0.3) * 10) / 10, at: at(addDays(today, -i), 7) });
  d.memory = [mem('Age: 16 (as of 2026-09-01)', 'other', now, 30), mem('He is 16 years old and plays handball at school.', 'other', now, 30)];
  return d;
}

/** 21: a Danish bulker: target 3,000 kcal but logs about 2,750 a day, and the weight is flat at ~74.8 kg for four weeks:
 *  what he eats is his maintenance. Upper/lower four days a week. */
export function bulker(now: Date): AppData {
  const today = dayKey(now.getTime(), 0);
  const d = base('da', 'Frederik', 'muscle', 'some', [1, 2, 4, 5], { kcal: 3000, protein: 160 });
  const from = addDays(today, -28);
  d.routines = buildStarter({ days: 4, goal: 'muscle', experience: 'some', access: 'fullGym' }, SEED_EXERCISES).filter((r) => r.items.length);
  for (const r of d.routines) { r.createdAt = at(from, 9) - 14 * 86400000; r.updatedAt = r.createdAt; }
  d.schedule = { ...d.schedule, mode: 'weekly', weekly: assignWeek([1, 2, 4, 5], d.routines), weeklySince: everyWeekdaySince(addDays(from, -14)) };
  const startKg: Record<string, number> = {};
  for (const r of d.routines) for (const it of r.items) { const ex = exById.get(it.exerciseId)!; startKg[it.exerciseId] = ex.muscles[0] === 'quads' || ex.muscles[0] === 'hamstrings' || ex.muscles[0] === 'glutes' ? 80 : ex.equipment.includes('barbell') ? 60 : ex.equipment.includes('machine') || ex.equipment.includes('cable') ? 45 : 16; }
  logSessions(d, from, now, 16, startKg, { every: 3 });
  for (let i = 28; i >= 0; i--) {
    const date = addDays(today, -i); const s = 0.94 + wob(i + 2) * 0.06; const g = (x: number) => Math.round(x * s);
    const rows: [string, string, number, number][] = [['breakfast', 'oats', 100, at(date, 7, 30)], ['breakfast', 'milk', 300, at(date, 7, 30)], ['breakfast', 'banana', 120, at(date, 7, 30)],
      ['lunch', 'rye', 150, at(date, 12)], ['lunch', 'egg', 120, at(date, 12)], ['lunch', 'cheese', 40, at(date, 12)],
      ['snacks', 'whey', 35, at(date, 15)], ['snacks', 'granola', 60, at(date, 15)], ['snacks', 'yogurt', 200, at(date, 15)],
      ['dinner', 'pasta', 350, at(date, 19)], ['dinner', 'mince', 200, at(date, 19)], ['dinner', 'oil', 15, at(date, 19)]];
    d.entries.push(...rows.filter((r) => r[3] <= now.getTime()).map(([meal, key, grams, when]) => food(date, meal, key, g(grams), when)));
  }
  for (let i = 28; i >= 0; i -= 2) d.weights.push({ id: id('wt'), date: addDays(today, -i), kg: Math.round((74.8 + wob(i + 9) * 0.3) * 10) / 10, at: at(addDays(today, -i), 7, 30) });
  d.memory = [mem('Alder: 24 (pr. 2026-06-01)', 'other', now, 40), mem('Vil tage på i muskelmasse; startede bulk for en måned siden.', 'goal', now, 28)];
  return d;
}

/** 22: a runner with a 10 km race on Sunday (memory), runs Mon/Wed/Sat, full body at the gym Tue + Fri. */
export function runner(now: Date): AppData {
  const today = dayKey(now.getTime(), 0);
  const d = base('en', 'Nora', 'endurance', 'some', [2, 5], { kcal: 2000, protein: 110 });
  const from = addDays(today, -28);
  d.routines = buildStarter({ days: 2, goal: 'endurance', experience: 'some', access: 'fullGym' }, SEED_EXERCISES).filter((r) => r.items.length);
  for (const r of d.routines) { r.createdAt = at(from, 9) - 14 * 86400000; r.updatedAt = r.createdAt; }
  d.schedule = { ...d.schedule, mode: 'weekly', weekly: assignWeek([2, 5], d.routines), activities: { 1: ['run'], 3: ['run'], 6: ['run'] }, weeklySince: everyWeekdaySince(addDays(from, -14)) };
  const startKg: Record<string, number> = {};
  for (const r of d.routines) for (const it of r.items) { const ex = exById.get(it.exerciseId)!; startKg[it.exerciseId] = ex.muscles[0] === 'quads' || ex.muscles[0] === 'hamstrings' || ex.muscles[0] === 'glutes' ? 50 : ex.equipment.includes('barbell') ? 30 : ex.equipment.includes('machine') || ex.equipment.includes('cable') ? 30 : 10; }
  logSessions(d, from, now, 17, startKg, { every: 3 });
  for (let date = from; date < today; date = addDays(date, 1)) {
    const w = wdOf(date); if (![1, 3, 6].includes(w)) continue;
    const km = w === 6 ? 12 : w === 3 ? 6 : 8; const pace = w === 3 ? 290 : 330; // s per km (Wednesday: tempo)
    const a: ActivityLog = { id: id('ac'), date, kind: 'run', durationSec: Math.round(km * pace), distanceM: km * 1000, at: at(date, 7), note: w === 3 ? 'Tempo' : w === 6 ? 'Long run' : 'Easy' };
    d.activities.push(a);
  }
  for (let i = 21; i >= 1; i--) {
    const date = addDays(today, -i); const s = 1 + wob(i) * 0.06; const g = (x: number) => Math.round(x * s);
    d.entries.push(food(date, 'breakfast', 'oats', g(70), at(date, 7, 45)), food(date, 'breakfast', 'milk', 250, at(date, 7, 45)), food(date, 'breakfast', 'banana', 120, at(date, 7, 45)),
      food(date, 'lunch', 'rye', g(130), at(date, 12)), food(date, 'lunch', 'egg', 60, at(date, 12)), food(date, 'lunch', 'cheese', 30, at(date, 12)),
      food(date, 'dinner', 'salmon', g(150), at(date, 18, 30)), food(date, 'dinner', 'rice', g(300), at(date, 18, 30)), food(date, 'snacks', 'yogurt', 170, at(date, 15)), food(date, 'snacks', 'banana', 120, at(date, 16)));
  }
  for (let i = 21; i >= 0; i -= 3) d.weights.push({ id: id('wt'), date: addDays(today, -i), kg: Math.round((61.5 + wob(i) * 0.3) * 10) / 10, at: at(addDays(today, -i), 7) });
  d.memory = [
    mem('Age: 29 (as of 2026-03-01)', 'other', now, 60),
    mem('10 km race on Sunday 1 November 2026; wants to finish under 50 minutes.', 'goal', now, 30, { until: '2026-11-01' }),
    mem('Runs Monday (easy), Wednesday (tempo) and Saturday (long run); gym Tuesday and Friday.', 'schedule', now, 30),
  ];
  return d;
}

export const PERSONAS_V1: Record<string, (now: Date) => AppData> = { omar2, beginner, footballer, missed, teen, bulker, runner };
