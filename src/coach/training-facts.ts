/**
 * Training facts for the Coach's fact sheet: the plan for today and the next week, how each lift has moved, sessions per
 * week, and sleep. Code computes every number; the AI only explains them (Answer Bar rule 3).
 */
import type { AnyRecord, CustomExercise, Plan, Routine, Session, Sleep, WorkSet, Slot } from '../engine/model';
import { CATALOG_BY_ID } from '../engine/data/exercises';
import { addDays, dayKeyAt, diffDays, weekdayOf } from '../engine/time';

export interface LiftFact {
  exercise: string;
  /** best working set of each recent session, oldest first (best = highest estimated one-rep max) */
  best: { day: string; kg: number; reps: number }[];
  /** compared over these sessions: up / flat / down by estimated one-rep max (more than 1 % either way) */
  status: 'up' | 'flat' | 'down';
  /** how many sessions in a row ended on exactly the same best set (kg × reps) */
  sameInARow: number;
}
export interface TrainingFacts {
  plan: { today?: string; next: { day: string; routine: string }[]; sportDays: Record<string, string[]>; note?: string };
  lifts: LiftFact[];
  /** finished sessions per 7-day block, oldest first, the last block ending today */
  weeks: number[];
  sleep?: { nights: number; avgHours: number; under6: number; under6Of: number };
}

const live = <T extends AnyRecord>(rs: AnyRecord[], kind: T['kind']) => rs.filter((r): r is T => r.kind === kind && !r.deleted);
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const e1rm = (kg: number, reps: number) => kg * (1 + reps / 30);

/** which routine a day has: cleared → none, an override → its routine, else the weekly plan (rotation plans: unknown) */
function routineOn(plan: Plan, day: string): string | null | undefined {
  if (plan.cleared.includes(day)) return null;
  const o = plan.overrides.find((x) => x.date === day);
  if (o) return o.routineId;
  return plan.mode === 'weekly' ? plan.weekly[weekdayOf(day)] ?? null : undefined;
}

export function trainingFacts(records: AnyRecord[], o: { today: string; dayStart: number; now: number; tz: string }): TrainingFacts {
  const { today, dayStart } = o;
  const dayOf = (r: AnyRecord) => r.day ?? dayKeyAt(r.at, r.tz, dayStart);

  // ── plan ──
  const routines = new Map(live<Routine>(records, 'routine').map((r) => [r.id, r.name]));
  const plan = live<Plan>(records, 'plan')[0];
  const out: TrainingFacts['plan'] = { next: [], sportDays: {} };
  if (plan) {
    if (plan.mode === 'rotation') out.note = `rotation plan: ${plan.rotation.order.map((id) => routines.get(id) ?? id).join(' → ')}, ${plan.rotation.perWeek} a week; next is ${routines.get(plan.rotation.order[plan.rotation.pointer]) ?? 'unknown'}`;
    else {
      const t = routineOn(plan, today);
      if (t) out.today = routines.get(t) ?? t;
      for (let i = 1; i <= 7; i++) {
        const d = addDays(today, i);
        const r = routineOn(plan, d);
        if (r) out.next.push({ day: `${d} (${DAYS[weekdayOf(d)]})`, routine: routines.get(r) ?? r });
      }
    }
    for (const [wd, types] of Object.entries(plan.activities)) if (types.length) out.sportDays[DAYS[Number(wd)]] = types;
  }

  // ── lifts ──
  const sessions = live<Session>(records, 'session').filter((s) => s.state === 'finished');
  const sessionDay = (s: Session) => (s.startedAt !== undefined ? dayKeyAt(s.startedAt, s.tz, dayStart) : dayOf(s));
  const recent = new Map(sessions.filter((s) => { const d = sessionDay(s); return d <= today && diffDays(today, d) < 56; }).map((s) => [s.id, sessionDay(s)]));
  const slots = new Map(live<Slot>(records, 'slot').map((s) => [s.id, s]));
  const custom = new Map(live<CustomExercise>(records, 'exercise').map((e) => [e.id, e.name]));
  // an assisted lift records the help, so less weight is harder: the loaded-lift formula would read progress as a drop.
  // Left out until it has its own comparison (Codex, PR #81)
  const assisted = new Set([...CATALOG_BY_ID.values()].filter((x) => x.logType === 'assisted').map((x) => x.id)
    .concat(live<CustomExercise>(records, 'exercise').filter((e) => e.logType === 'assisted').map((e) => e.id)));
  const perExercise = new Map<string, Map<string, { day: string; kg: number; reps: number }>>();
  for (const set of live<WorkSet>(records, 'set')) {
    const day = recent.get(set.sessionId);
    const kg = set.done?.kg, reps = set.done?.reps;
    if (!day || set.type !== 'working' || set.skipped || !kg || !reps) continue;
    const ex = slots.get(set.slotId)?.exerciseId;
    if (!ex || assisted.has(ex)) continue;
    const bySession = perExercise.get(ex) ?? new Map();
    const cur = bySession.get(set.sessionId);
    if (!cur || e1rm(kg, reps) > e1rm(cur.kg, cur.reps)) bySession.set(set.sessionId, { day, kg, reps });
    perExercise.set(ex, bySession);
  }
  const lifts: LiftFact[] = [];
  for (const [ex, bySession] of perExercise) {
    const best = [...bySession.values()].sort((a, b) => a.day.localeCompare(b.day)).slice(-6);
    if (best.length < 2) continue;
    const first = e1rm(best[0].kg, best[0].reps), last = e1rm(best.at(-1)!.kg, best.at(-1)!.reps);
    const status = last > first * 1.01 ? 'up' : last < first * 0.99 ? 'down' : 'flat';
    let sameInARow = 1;
    for (let i = best.length - 2; i >= 0 && best[i].kg === best.at(-1)!.kg && best[i].reps === best.at(-1)!.reps; i--) sameInARow++;
    lifts.push({ exercise: CATALOG_BY_ID.get(ex)?.name ?? custom.get(ex) ?? ex, best, status, sameInARow });
  }
  lifts.sort((a, b) => b.best.length - a.best.length || a.exercise.localeCompare(b.exercise));

  // ── sessions per week ──
  const weeks = [0, 0, 0, 0];
  for (const d of recent.values()) { const back = Math.floor(diffDays(today, d) / 7); if (back < 4) weeks[3 - back]++; }

  // ── sleep: the last 7 nights that ended before now ──
  const nights = live<Sleep>(records, 'sleep')
    .filter((s) => s.end <= o.now && o.now - s.end < 7 * 864e5)
    .map((s) => (s.minutes ?? (s.end - s.start) / 60000) / 60);
  const sleep = nights.length >= 3
    ? { nights: nights.length, avgHours: Math.round((nights.reduce((a, b) => a + b, 0) / nights.length) * 10) / 10, under6: nights.filter((h) => h < 6).length, under6Of: nights.length }
    : undefined;

  return { plan: out, lifts: lifts.slice(0, 8), weeks, ...(sleep ? { sleep } : {}) };
}

/** the training block of the rendered fact sheet */
export function renderTraining(t: TrainingFacts): string[] {
  const out: string[] = [];
  out.push(`PLAN: today ${t.plan.today ?? (t.plan.note ? 'see rotation' : 'nothing planned')}`);
  if (t.plan.note) out.push(`- ${t.plan.note}`);
  for (const n of t.plan.next) out.push(`- ${n.day}: ${n.routine}`);
  const sport = Object.entries(t.plan.sportDays);
  if (sport.length) out.push(`- sport days: ${sport.map(([d, ts]) => `${d} ${ts.join('+')}`).join(', ')}`);
  out.push(`SESSIONS PER WEEK (last 4 weeks, oldest first): ${t.weeks.join(', ')}`);
  if (t.lifts.length) {
    out.push('LIFTS (best working set per session, oldest first):');
    for (const l of t.lifts) out.push(`- ${l.exercise}: ${l.best.map((b) => `${b.kg}×${b.reps} (${b.day})`).join(', ')}; ${l.status}${l.sameInARow >= 3 ? `; same best set ${l.sameInARow} sessions in a row` : ''}`);
  }
  if (t.sleep) out.push(`SLEEP (last ${t.sleep.nights} nights): average ${t.sleep.avgHours} h; under 6 h on ${t.sleep.under6} of ${t.sleep.under6Of}`);
  return out;
}

/** every number in the training block, for the invented-number check */
export function trainingNumbers(t: TrainingFacts): number[] {
  const out = [...t.weeks];
  for (const l of t.lifts) { out.push(l.sameInARow, l.best.length); for (const b of l.best) out.push(b.kg, b.reps); }
  if (t.sleep) out.push(t.sleep.nights, t.sleep.avgHours, t.sleep.under6, t.sleep.under6Of);
  return out;
}
