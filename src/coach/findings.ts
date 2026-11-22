/**
 * Findings: what stands out in the person's data, worked out by code, each with its next step as a number
 * (docs/COACH.md §8 "Cheap models first", lever 1). The app thinks, the model words it: a cheap model that is handed
 * "Barbell Row: same set for 6 sessions, next 72.5 kg × 6" does not have to find it, and cannot get the sum wrong.
 *
 * Rules that hold here, as in facts.ts:
 * - Missing is never zero: a finding that needs a fact the sheet does not have is not made.
 * - A finding is a thing worth raising. Reference facts (which days are free) are not findings: see `planNotes`.
 * - Every finding says when it applies (`when`), so a question about a sore knee does not get the cut's pace dragged in.
 * - No finding proposes a very low intake, or any weight-loss number for someone who says they are under 18.
 * - Plain numbers, no thousands separators: the number audit reads "3060", "3,060" and "3.060" the same.
 */
import type { FactSheet, Fact } from './facts';
import { DAYS, isStuck, type LiftFact } from './training-facts';
import { MINOR } from './route';
import { addDays, diffDays, weekdayOf } from '../engine/time';

export interface Finding {
  id: 'low-food-log' | 'sessions-dropping' | 'stalled-lifts' | 'goal-pace' | 'week-load';
  text: string;
  /** when the finding applies: shown to the model next to the text */
  when: string;
  /** every number in `text`, for the invented-number check */
  numbers: number[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r10 = (n: number) => Math.round(n / 10) * 10;
/** 7,700 kcal per kg of body weight: the same rule of thumb as the maintenance estimate, so a pace and its kcal agree */
const KCAL_PER_KG_WEEK = 7700 / 7;
/** below this the Coach never proposes an intake (the safety rule's floor for an adult who trains) */
const KCAL_FLOOR = 1500;
const LOWER_BODY = /squat|deadlift|leg press|hip thrust|lunge/i;

/** the smallest sensible jump: 5 kg on a heavy squat or deadlift, else 2.5 kg */
export function nextStep(exercise: string, kg: number): number { return LOWER_BODY.test(exercise) && kg >= 100 ? 5 : 2.5; }

/** reps to aim for after the jump, from the same one-rep-max formula the lift status uses (Epley), never above the old reps */
export function nextReps(kg: number, reps: number, step: number): number {
  const e1rm = kg * (1 + reps / 30);
  return Math.max(1, Math.min(reps, Math.floor((e1rm / (kg + step) - 1) * 30)));
}

/** a lift is stuck (training-facts `isStuck`), unless it is going down: that is a different conversation */
const stuck = (l: LiftFact): boolean => l.status !== 'down' && isStuck(l.best.at(-1)!.reps, l.sameInARow);

function stalledLifts(s: FactSheet): Finding | undefined {
  const lifts = s.training.lifts.filter(stuck).sort((a, b) => b.sameInARow - a.sameInARow).slice(0, 3);
  if (!lifts.length) return undefined;
  const numbers: number[] = [];
  const parts = lifts.map((l) => {
    const { kg, reps } = l.best.at(-1)!;
    const step = nextStep(l.exercise, kg);
    const r = nextReps(kg, reps, step);
    numbers.push(kg, reps, l.sameInARow, kg + step, r);
    return `${l.exercise} ${kg} kg × ${reps} for ${l.sameInARow} sessions in a row, next ${kg + step} kg × ${r}`;
  });
  // a current health note may touch one of these lifts: the app cannot tell which, so it says so and the model weighs it
  const hurt = s.memory.some((m) => m.topic === 'health');
  const lead = lifts.length > 1 ? `${lifts.length} lifts have not moved` : 'A lift has not moved';
  return {
    id: 'stalled-lifts',
    text: `${lead}: ${parts.join('; ')}. The next weight is the next step: after a jump the reps drop first, then build back. A stuck lift is not a failure.${hurt ? ' A health note is current in MEMORY: never add weight to a lift it touches.' : ''}`,
    when: 'asked about progress, a stuck lift, quitting, a plan or next session, or in a check-in or notice',
    numbers,
  };
}

function nextPlanned(s: FactSheet): string {
  const p = s.training.plan;
  if (p.today) return `today ${p.today}`;
  if (p.next[0]) return `${p.next[0].day} ${p.next[0].routine}`;
  return p.note ? p.note : 'nothing is planned';
}

function sessionsDropping(s: FactSheet): Finding | undefined {
  const w = s.training.weeks;
  const prior = w.slice(0, 3);
  const mean = prior.reduce((a, b) => a + b, 0) / prior.length;
  const last = w[3];
  // one session a week is not a pattern to fall off from; half of the usual or less is a drop
  if (mean < 1.5 || last > mean * 0.5) return undefined;
  const usual = r1(mean);
  return {
    id: 'sessions-dropping',
    text: `Sessions per week, oldest first: ${w.join(', ')}${last === 0 ? ' (none in the last 7 days)' : ''}; the usual was about ${usual} a week. Next planned: ${nextPlanned(s)}. Name it without guilt and point to that next session.`,
    when: 'asked about motivation, quitting, progress, consistency or a plan, or in a check-in or notice',
    numbers: [...w, usual],
  };
}

const trendOf = (s: FactSheet): Fact | undefined => s.weight.trend;
const factOf = (s: FactSheet, id: string) => s.food28.facts.find((f) => f.id === id);

function goalPace(s: FactSheet): Finding | undefined {
  const trend = trendOf(s), latest = s.weight.latest;
  if (!trend || !latest) return undefined;
  const minor = s.memory.some((m) => MINOR.test(m.text));
  const maint = factOf(s, 'food28.maintenanceKcal');
  for (const g of s.goals) {
    if (g.metric !== 'weight' || g.target === undefined || g.neededKgPerWeek === undefined || !g.by) continue;
    if (g.status !== 'ahead' && g.status !== 'behind') continue;
    // the sheet shows the needed pace to 0.1 kg; the intake is worked out from the exact remaining weight and time
    const needed = (g.target - latest.value) / (Math.max(diffDays(g.by, s.now.day), 1) / 7);
    const shown = g.neededKgPerWeek;
    // a small gap between the pace and the need is noise, not a finding
    if (g.status === 'ahead' && Math.abs(trend.value - needed) < 0.2) continue;
    const numbers: number[] = [trend.value, shown, g.target];
    const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
    let text = `${g.text}: ${g.status}. Weight is moving ${sign(trend.value)} kg a week and the date needs ${sign(shown)} kg a week.`;
    const gaining = g.target > latest.value;
    const toward = gaining ? trend.value > 0 : trend.value < 0;
    if (toward) {
      const weeks = Math.abs(latest.value - g.target) / Math.abs(trend.value);
      const reach = addDays(s.now.day, Math.ceil(weeks * 7));
      const early = Math.round(diffDays(g.by, reach) / 7);
      numbers.push(Math.abs(early));
      // a straight line over a year is a guess, not a date
      if (weeks > 52) text += ' At this pace the target is more than a year away.';
      else text += g.status === 'ahead'
        ? ` At this pace the target is reached about ${reach}, ${early} weeks before ${g.by}.`
        : ` At this pace the target is reached about ${reach}, ${-early} weeks after ${g.by}.`;
    } else text += ' At this pace the target is not reached.';
    // a pace faster than about 0.75 % of body weight a week is never chased, ahead or behind: the date is what moves
    const tooFast = Math.abs(needed) > latest.value * 0.0075;
    if (tooFast) text += ' The pace the date needs is faster than is sensible: the honest option is a later date, not a harder push.';
    else if (maint && !minor) {
      const delta = r10(needed * KCAL_PER_KG_WEEK);
      const kcal = r10(maint.value + needed * KCAL_PER_KG_WEEK);
      if (kcal >= KCAL_FLOOR) {
        numbers.push(kcal, maint.value, Math.abs(delta));
        const how = `About ${kcal} kcal a day (the maintenance estimate ${maint.value} ${delta < 0 ? 'minus' : 'plus'} ${Math.abs(delta)}, an estimate)`;
        // ahead: the current pace is faster than the date needs, so the intake that makes the date moves toward maintenance
        text += g.status === 'ahead'
          ? ` ${how} still makes the date, so there is room to ${gaining ? 'ease off the surplus' : 'eat more'}.`
          : ` ${how} would make the date.`;
      }
    }
    return { id: 'goal-pace', text, when: 'asked about the goal, the pace, eating, energy, tiredness, a cut or competing', numbers };
  }
  return undefined;
}

/** things a hard week is made of: lifting days and sport days (a walk or mobility is not load) */
const EASY = new Set(['walk', 'mobility']);
function plannedWeek(s: FactSheet): { lifting: number; sport: string[] } | undefined {
  const p = s.training.plan;
  if (p.note) return undefined; // a rotation plan has no fixed week
  const sport = Object.entries(p.sportDays).flatMap(([day, types]) => types.filter((t) => !EASY.has(t)).map((t) => `${t} on ${day}`));
  return { lifting: p.next.length, sport };
}

function weekLoad(s: FactSheet): Finding | undefined {
  const w = plannedWeek(s);
  if (!w) return undefined;
  const total = w.lifting + w.sport.length;
  if (total < 6) return undefined;
  return {
    id: 'week-load',
    text: `The planned week is ${w.lifting} lifting sessions plus ${w.sport.length} sport sessions (${w.sport.join(', ')}): ${total} sessions in 7 days. Anything added replaces something; it does not stack on top.`,
    when: 'asked about adding sessions, competing, more training, tiredness, recovery or a plan',
    numbers: [w.lifting, w.sport.length, total],
  };
}

/** the very low food log (PR #100): kept as it was, now one finding among the others, with the one-question line the 12 Nov smoke test lacked */
function lowFoodLog(avg: number | undefined, target: number | undefined): Finding | undefined {
  if (avg === undefined) return undefined;
  return {
    id: 'low-food-log',
    text: `Logged food averages ${avg} kcal a day${target !== undefined ? `, far under the ${target} kcal target` : ', very low for anyone who trains'}. It may only be incomplete logging: say so in the answer itself and ask once, gently, whether that is everything they eat, without quoting the number. That is the only question in the reply. Never an alarm, a lower target or a meal plan.`,
    when: 'always, even when they asked about something else',
    numbers: target !== undefined ? [avg, target] : [avg],
  };
}

/** the findings, most important first (the order is the order of this list) */
export function computeFindings(sheet: FactSheet, o: { lowFoodAvg?: number; kcalTarget?: number }): Finding[] {
  return [
    lowFoodLog(o.lowFoodAvg, o.kcalTarget),
    sessionsDropping(sheet),
    stalledLifts(sheet),
    goalPace(sheet),
    weekLoad(sheet),
  ].filter((f): f is Finding => !!f);
}

export function renderFindings(fs: Finding[]): string[] {
  if (!fs.length) return [];
  return ['FINDINGS (worked out by the app, most important first; each ends in a next step you can say as it is; use the ones that fit the question, never recite them all):', ...fs.map((f) => `- [${f.id}] ${f.text} (applies: ${f.when})`)];
}

// ── the plan as a reference: which days are taken, and which free days sit next to a session ──

export interface DayLoad { onDay: string[]; dayBefore: string[]; dayAfter: string[] }

/**
 * What the plan has on a date. Today and the next 7 days are read as dated (overrides and cleared days already applied
 * in `plan.next` and `plan.today`); a date further out repeats the weekday of the next 7 days. Sport repeats by weekday.
 */
function loadOn(s: FactSheet, day: string): string[] {
  const p = s.training.plan;
  if (p.note) return []; // a rotation plan has no fixed week
  const sport = (Object.entries(p.sportDays).find(([name]) => DAYS.indexOf(name) === weekdayOf(day))?.[1] ?? []).filter((t) => !EASY.has(t));
  const gap = diffDays(day, s.now.day);
  let lifts: string[];
  if (gap === 0) lifts = p.today ? [p.today] : [];
  else if (gap > 0 && gap <= 7) lifts = p.next.filter((n) => n.day.startsWith(day)).map((n) => n.routine);
  else lifts = p.next.filter((n) => weekdayOf(n.day.slice(0, 10)) === weekdayOf(day)).map((n) => n.routine);
  return [...lifts, ...sport];
}

/** a day's plan and its two neighbours', for the plan-clash check: moving a session onto a day that already has one, or next to one */
export function dayLoad(s: FactSheet, day: string): DayLoad {
  return { onDay: loadOn(s, day), dayBefore: loadOn(s, addDays(day, -1)), dayAfter: loadOn(s, addDays(day, 1)) };
}

/** true when a session moved to `day` would share it with another session or sit straight before or after one */
export function clashes(s: FactSheet, day: string): boolean {
  const l = dayLoad(s, day);
  return !!(l.onDay.length || l.dayBefore.length || l.dayAfter.length);
}

/** reference lines for the PLAN block: days with nothing planned and nothing next to them, or the plain fact that there are none */
export function planNotes(s: FactSheet): string[] {
  if (s.training.plan.note || (!s.training.plan.today && !s.training.plan.next.length && !Object.keys(s.training.plan.sportDays).length)) return [];
  const days = Array.from({ length: 7 }, (_, i) => addDays(s.now.day, i));
  const free = days.filter((d) => !clashes(s, d));
  const empty = days.filter((d) => !loadOn(s, d).length);
  const name = (d: string) => `${DAYS[weekdayOf(d)]} ${d}`;
  if (free.length) return [`- days with no session and none next to it: ${free.map(name).join(', ')}`];
  return [`- every day without a session sits next to one (${empty.map(name).join(', ')}): a session moved there makes two days in a row`];
}
